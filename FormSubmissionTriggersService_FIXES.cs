// ============================================================
// FIXES FOR FormSubmissionTriggersService.cs
// ============================================================
// 
// Apply these changes to fix:
// 1. Duplicate Alert Rules creation
// 2. Recipients without Email validation
// 3. Missing fallback to defaultUserId when no valid recipients
//
// ============================================================

// ============================================================
// FIX 1: EnsureAlertRuleExistsAsync - Prevent Duplicates
// ============================================================
// Replace the entire EnsureAlertRuleExistsAsync method with this:

/// <summary>
/// Ensures an ALERT_RULES entry exists for the given DocumentTypeId and TriggerType.
/// Only creates a new rule if NO rule exists (even inactive ones).
/// Does NOT set TargetUserId automatically - user must configure it manually.
/// </summary>
private async Task EnsureAlertRuleExistsAsync(int documentTypeId, string triggerType, string? defaultUserId = null)
{
    try
    {
        // Check if ANY rule exists (active or inactive) for this DocumentTypeId + TriggerType
        var exists = await _unitOfWork.AppDbContext
            .Set<ALERT_RULES>()
            .AnyAsync(r => r.DocumentTypeId == documentTypeId
                        && r.TriggerType == triggerType
                        && !r.IsDeleted);

        if (exists)
        {
            _logger?.LogInformation(
                "ALERT_RULES entry already exists for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}. Skipping auto-create.",
                documentTypeId, triggerType);
            return;
        }

        // Only create if no rule exists at all
        var newRule = new ALERT_RULES
        {
            DocumentTypeId = documentTypeId,
            RuleName = $"Auto-created: {triggerType} (DocumentType {documentTypeId})",
            TriggerType = triggerType,
            ConditionJson = "{}",
            EmailTemplateId = null,
            NotificationType = "Email",
            TargetRoleId = string.Empty,
            TargetUserId = null,  // ✅ IMPORTANT: Don't set defaultUserId - let user configure manually
            IsActive = false,      // Default to inactive - user must activate manually
            IsDeleted = false,
            CreatedDate = DateTime.UtcNow,
            UpdatedDate = DateTime.UtcNow
        };

        _unitOfWork.AppDbContext.Set<ALERT_RULES>().Add(newRule);
        await _unitOfWork.CompleteAsyn();

        _logger?.LogInformation(
            "Auto-created ALERT_RULES entry for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType} (RuleId: {RuleId}, IsActive: false). User can activate and configure it later.",
            documentTypeId, triggerType, newRule.Id);
    }
    catch (Exception ex)
    {
        _logger?.LogError(ex,
            "Error ensuring ALERT_RULES entry exists for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}. Exception: {ExceptionMessage}. InnerException: {InnerException}. Continuing without creating rule.",
            documentTypeId, triggerType, ex.Message, ex.InnerException?.Message ?? "None");
        // Don't throw - rule creation failure should not block the main workflow
    }
}

// ============================================================
// FIX 2: GetEmailRecipientsAsync - Add Order + Email Validation + Fallback
// ============================================================
// Replace the entire GetEmailRecipientsAsync method with this:

/// <summary>
/// Checks ALERT_RULES table to determine if email should be sent and returns list of recipient user IDs.
/// If no active rule exists, defaults to defaultUserId (e.g., SubmittedByUserId) to ensure email is sent.
/// Uses TargetUserId and TargetRoleId from ALERT_RULES to determine recipients.
/// Validates that recipients have valid Email addresses before returning them.
/// </summary>
private async Task<List<string>> GetEmailRecipientsAsync(int documentTypeId, string triggerType, string? defaultUserId = null)
{
    try
    {
        var isPublicUser = !string.IsNullOrWhiteSpace(defaultUserId) &&
                           string.Equals(defaultUserId, "public-user", StringComparison.OrdinalIgnoreCase);

        // If the submission is made by public-user, do not send any email
        // (skip all triggers to avoid sending to alert-rule recipients)
        if (isPublicUser)
        {
            _logger?.LogInformation("Public user submission detected (user: {DefaultUserId}). Skipping email for trigger {TriggerType}.",
                defaultUserId, triggerType);
            return new List<string>();
        }

        _logger?.LogInformation("Checking ALERT_RULES for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}, DefaultUserId {DefaultUserId}",
            documentTypeId, triggerType, defaultUserId ?? "null");

        // ✅ FIX: Add ORDER BY to ensure consistent rule selection (newest first)
        var alertRules = await _unitOfWork.AppDbContext
            .Set<ALERT_RULES>()
            .Where(ar =>
                ar.DocumentTypeId == documentTypeId &&
                ar.TriggerType == triggerType &&
                (ar.NotificationType == "Email" || ar.NotificationType == "Both") &&
                ar.IsActive &&
                !ar.IsDeleted)
            .OrderByDescending(ar => ar.Id)  // ✅ Use newest rule first (or CreatedDate DESC if preferred)
            .ToListAsync();

        _logger?.LogInformation("Found {Count} active ALERT_RULE(s) for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}",
            alertRules.Count, documentTypeId, triggerType);

        var recipients = new HashSet<string>();

        // If no active rule exists, use defaultUserId (e.g., SubmittedByUserId) to ensure email is sent
        if (!alertRules.Any())
        {
            if (!string.IsNullOrWhiteSpace(defaultUserId) && !isPublicUser)
            {
                recipients.Add(defaultUserId);
                _logger?.LogInformation("No active ALERT_RULE found for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}. Using default user {DefaultUserId}.",
                    documentTypeId, triggerType, defaultUserId);
            }
            else
            {
                _logger?.LogWarning("No active ALERT_RULE found and no defaultUserId provided for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}. Email will not be sent.",
                    documentTypeId, triggerType);
            }
            return recipients.ToList();
        }

        // Process each active alert rule (ordered by newest first)
        foreach (var rule in alertRules)
        {
            _logger?.LogInformation("Processing ALERT_RULE {RuleId}: TargetUserId={TargetUserId}, TargetRoleId={TargetRoleId}",
                rule.Id, rule.TargetUserId ?? "null", rule.TargetRoleId ?? "null");

            // Priority 1: TargetUserId - specific user
            if (!string.IsNullOrWhiteSpace(rule.TargetUserId))
            {
                var userIds = rule.TargetUserId.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(u => u.Trim())
                    .Where(u => !string.IsNullOrWhiteSpace(u))
                    .ToList();
                
                foreach (var userId in userIds)
                {
                    recipients.Add(userId);
                }
                
                _logger?.LogInformation("Added {Count} users from TargetUserId in rule {RuleId}: {UserIds}", 
                    userIds.Count, rule.Id, string.Join(", ", userIds));
            }

            // Priority 2: TargetRoleId - users in role
            if (!string.IsNullOrWhiteSpace(rule.TargetRoleId))
            {
                var roleIds = rule.TargetRoleId.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(r => r.Trim())
                    .Where(r => !string.IsNullOrWhiteSpace(r))
                    .ToList();

                if (roleIds.Any())
                {
                    // Resolve users from roles using the workflow runtime service
                    var workflowRuntimeService = GetWorkflowRuntimeService();
                    if (workflowRuntimeService != null)
                    {
                        var usersFromRoles = await workflowRuntimeService.ResolveUsersFromRolesAsync(roleIds);
                        foreach (var userId in usersFromRoles)
                        {
                            if (!string.IsNullOrWhiteSpace(userId))
                            {
                                recipients.Add(userId);
                            }
                        }
                        
                        _logger?.LogInformation("Added {Count} users from TargetRoleId in rule {RuleId}: {RoleIds}", 
                            usersFromRoles.Count, rule.Id, string.Join(", ", roleIds));
                    }
                    else
                    {
                        _logger?.LogWarning("Failed to resolve IApprovalWorkflowRuntimeService for role resolution in rule {RuleId}", rule.Id);
                    }
                }
            }

            // Priority 3: If neither TargetUserId nor TargetRoleId is specified, use default user (e.g., SubmittedByUserId)
            if (string.IsNullOrWhiteSpace(rule.TargetUserId) && string.IsNullOrWhiteSpace(rule.TargetRoleId))
            {
                if (!string.IsNullOrWhiteSpace(defaultUserId) && !isPublicUser)
                {
                    recipients.Add(defaultUserId);
                    _logger?.LogInformation("Rule {RuleId} has no TargetUserId or TargetRoleId. Using default user {DefaultUserId}.", 
                        rule.Id, defaultUserId);
                }
                else
                {
                    _logger?.LogWarning("Rule {RuleId} has no TargetUserId, TargetRoleId, or defaultUserId. No recipients added.", rule.Id);
                }
            }
        }

        // ✅ FIX: Validate recipients have Email addresses before returning
        if (recipients.Any())
        {
            var recipientUsernames = recipients.ToList();
            
            // ✅ IMPORTANT: Filter recipients to only those with valid Email addresses
            // Note: Adjust DbSet name if your Tbl_User table has a different DbSet name (e.g., Users, TBL_USER, etc.)
            var validRecipients = await _unitOfWork.AppDbContext
                .Set<Tbl_User>()  // ⚠️ CHANGE THIS if your DbSet name is different (e.g., Users, TBL_USER)
                .Where(u => recipientUsernames.Contains(u.Username) 
                         && u.IsActive 
                         && !string.IsNullOrWhiteSpace(u.Email) 
                         && u.Email.Trim() != "")
                .Select(u => u.Username)
                .ToListAsync();

            _logger?.LogInformation("Validated recipients: {TotalCount} total, {ValidCount} with Email addresses. Valid recipients: {ValidRecipients}",
                recipientUsernames.Count, validRecipients.Count, string.Join(", ", validRecipients));

            // ✅ FIX: Fallback to defaultUserId if no valid recipients found
            if (!validRecipients.Any())
            {
                if (!string.IsNullOrWhiteSpace(defaultUserId) && !isPublicUser)
                {
                    // Double-check defaultUserId has Email before adding
                    var defaultUserHasEmail = await _unitOfWork.AppDbContext
                        .Set<Tbl_User>()  // ⚠️ CHANGE THIS if your DbSet name is different
                        .AnyAsync(u => u.Username == defaultUserId 
                                    && u.IsActive 
                                    && !string.IsNullOrWhiteSpace(u.Email) 
                                    && u.Email.Trim() != "");
                    
                    if (defaultUserHasEmail)
                    {
                        validRecipients.Add(defaultUserId);
                        _logger?.LogInformation("No valid recipients from ALERT_RULES. Using fallback defaultUserId {DefaultUserId} (has Email).", defaultUserId);
                    }
                    else
                    {
                        _logger?.LogWarning("No valid recipients from ALERT_RULES and defaultUserId {DefaultUserId} has no Email. Email will not be sent.",
                            defaultUserId);
                    }
                }
                else
                {
                    _logger?.LogWarning("No valid recipients from ALERT_RULES and no defaultUserId provided. Email will not be sent.");
                }
            }

            return validRecipients;
        }
        else
        {
            _logger?.LogWarning("ALERT_RULES found but no recipients resolved for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}. " +
                "Checking if defaultUserId should be used: {DefaultUserId}",
                documentTypeId, triggerType, defaultUserId ?? "null");
            
            // Fallback: if no recipients found from rules but defaultUserId exists, use it
            if (!string.IsNullOrWhiteSpace(defaultUserId) && !isPublicUser)
            {
                // Validate defaultUserId has Email
                var defaultUserHasEmail = await _unitOfWork.AppDbContext
                    .Set<Tbl_User>()  // ⚠️ CHANGE THIS if your DbSet name is different
                    .AnyAsync(u => u.Username == defaultUserId 
                                && u.IsActive 
                                && !string.IsNullOrWhiteSpace(u.Email) 
                                && u.Email.Trim() != "");
                
                if (defaultUserHasEmail)
                {
                    _logger?.LogInformation("Using fallback defaultUserId {DefaultUserId} as no recipients were resolved from ALERT_RULES (has Email).", defaultUserId);
                    return new List<string> { defaultUserId };
                }
                else
                {
                    _logger?.LogWarning("Fallback defaultUserId {DefaultUserId} has no Email. Email will not be sent.", defaultUserId);
                }
            }
            
            return new List<string>();
        }
    }
    catch (Exception ex)
    {
        _logger?.LogError(ex, "Error checking ALERT_RULES for DocumentTypeId {DocumentTypeId}, TriggerType {TriggerType}. " +
            "Attempting to use defaultUserId: {DefaultUserId}",
            documentTypeId, triggerType, defaultUserId ?? "null");
        
        // On error, try to use defaultUserId if available and has Email
        if (!string.IsNullOrWhiteSpace(defaultUserId) && !isPublicUser)
        {
            try
            {
                var defaultUserHasEmail = await _unitOfWork.AppDbContext
                    .Set<Tbl_User>()  // ⚠️ CHANGE THIS if your DbSet name is different
                    .AnyAsync(u => u.Username == defaultUserId 
                                && u.IsActive 
                                && !string.IsNullOrWhiteSpace(u.Email) 
                                && u.Email.Trim() != "");
                
                if (defaultUserHasEmail)
                {
                    _logger?.LogInformation("Using defaultUserId {DefaultUserId} due to error in ALERT_RULES check (has Email).", defaultUserId);
                    return new List<string> { defaultUserId };
                }
            }
            catch
            {
                // Ignore validation errors in error handler
            }
        }
        
        // If no defaultUserId or validation failed, return empty list
        return new List<string>();
    }
}

// ============================================================
// IMPORTANT NOTES:
// ============================================================
// 1. Replace `Tbl_User` with your actual DbSet name if different:
//    - Common names: Users, TBL_USER, AspNetUsers, etc.
//    - Check your FormBuilderDbContext.cs file for the exact name
//
// 2. If you prefer to use CreatedDate instead of Id for ordering:
//    Change: .OrderByDescending(ar => ar.Id)
//    To:     .OrderByDescending(ar => ar.CreatedDate)
//
// 3. After applying these fixes:
//    - Test Submit with anas (should send email to anas if anas has Email)
//    - Test Approve/Reject (should send email to SubmittedByUserId if no TargetUserId in rule)
//    - Check logs for "Validated recipients" messages to see filtering in action
//
// ============================================================

