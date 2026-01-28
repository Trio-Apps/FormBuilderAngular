// ============================================================
// FIXES FOR EmailNotificationService.cs
// ============================================================
// 
// Apply these changes to improve email resolution and logging
//
// ============================================================

// ============================================================
// FIX: GetUserEmailAsync - Improve Username lookup + Logging
// ============================================================
// Replace the entire GetUserEmailAsync method with this:

private async Task<string?> GetUserEmailAsync(string userId)
{
    try
    {
        _logger?.LogInformation("Getting email for userId: {UserId}", userId);

        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger?.LogWarning("GetUserEmailAsync called with null/empty userId");
            return null;
        }

        // Try to find user by Username first (most common case: "anas", "admin")
        var userByUsername = await _identityContext.TblUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username.ToLower() == userId.ToLower().Trim());
        
        if (userByUsername != null)
        {
            _logger?.LogInformation("Found user by Username: {Username}, Id: {Id}, Email: {Email}, IsActive: {IsActive}",
                userByUsername.Username, userByUsername.Id, userByUsername.Email ?? "null", userByUsername.IsActive ?? false);

            // Check if user is active
            if (userByUsername.IsActive == false)
            {
                _logger?.LogWarning("User {UserId} ({Username}) is inactive. Email will not be sent.", userId, userByUsername.Username);
                return null;
            }

            // Prefer Email field, but only use Username if it looks like an email address
            var email = userByUsername.Email;
            if (string.IsNullOrWhiteSpace(email))
            {
                _logger?.LogWarning("User {UserId} ({Username}) has no Email field. Checking if Username is email format: {Username}", 
                    userId, userByUsername.Username, userByUsername.Username);
                
                // Only use username as email if it contains @ symbol
                if (!string.IsNullOrWhiteSpace(userByUsername.Username) && userByUsername.Username.Contains("@"))
                {
                    email = userByUsername.Username;
                    _logger?.LogInformation("Using Username as email for user {UserId}: {Email}", userId, email);
                }
                else
                {
                    _logger?.LogWarning("User {UserId} ({Username}) has no valid email address. Username is not an email format.", 
                        userId, userByUsername.Username);
                    return null;
                }
            }
            else
            {
                email = email.Trim();
                _logger?.LogInformation("Found email for user {UserId} ({Username}): {Email}", userId, userByUsername.Username, email);
            }

            return email;
        }

        // Fallback: Try to find by Id if userId is numeric
        if (int.TryParse(userId, out int userIdInt))
        {
            _logger?.LogInformation("UserId is numeric ({UserIdInt}), searching by Id", userIdInt);
            
            var userById = await _identityContext.TblUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userIdInt);
            
            if (userById == null)
            {
                _logger?.LogWarning("User not found for userId (int): {UserIdInt}", userIdInt);
                return null;
            }

            _logger?.LogInformation("Found user by Id: {Id}, Username: {Username}, Email: {Email}, IsActive: {IsActive}",
                userById.Id, userById.Username, userById.Email ?? "null", userById.IsActive ?? false);

            // Check if user is active
            if (userById.IsActive == false)
            {
                _logger?.LogWarning("User {UserIdInt} ({Username}) is inactive. Email will not be sent.", userIdInt, userById.Username);
                return null;
            }

            var emailById = userById.Email;
            if (string.IsNullOrWhiteSpace(emailById))
            {
                _logger?.LogWarning("User {UserIdInt} ({Username}) has no Email field. Checking if Username is email format: {Username}", 
                    userIdInt, userById.Username, userById.Username);
                
                if (!string.IsNullOrWhiteSpace(userById.Username) && userById.Username.Contains("@"))
                {
                    emailById = userById.Username;
                    _logger?.LogInformation("Using Username as email for user {UserIdInt}: {Email}", userIdInt, emailById);
                }
                else
                {
                    _logger?.LogWarning("User {UserIdInt} ({Username}) has no valid email address.", userIdInt, userById.Username);
                    return null;
                }
            }
            else
            {
                emailById = emailById.Trim();
                _logger?.LogInformation("Found email for user {UserIdInt} ({Username}): {Email}", userIdInt, userById.Username, emailById);
            }

            return emailById;
        }

        _logger?.LogWarning("User not found for userId (string): {UserId}. Tried Username lookup and Id lookup (if numeric).", userId);
        return null;
    }
    catch (Exception ex)
    {
        _logger?.LogError(ex, "Failed to get user email for userId: {UserId}. Error: {ErrorMessage}. StackTrace: {StackTrace}", 
            userId, ex.Message, ex.StackTrace);
        return null;
    }
}

// ============================================================
// OPTIONAL: Batch Email Resolution (Performance Improvement)
// ============================================================
// If you want to optimize GetUserEmailAsync for multiple users,
// add this helper method and use it in SendSubmissionConfirmationToRecipientsAsync:

private async Task<Dictionary<string, string>> GetUserEmailsBatchAsync(IEnumerable<string> userIds)
{
    var result = new Dictionary<string, string>();
    
    try
    {
        var userIdList = userIds?.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct().ToList() ?? new List<string>();
        if (!userIdList.Any())
        {
            _logger?.LogWarning("GetUserEmailsBatchAsync called with empty userIds list");
            return result;
        }

        _logger?.LogInformation("Batch resolving emails for {Count} user IDs: {UserIds}", userIdList.Count, string.Join(", ", userIdList));

        // Try Username lookup first (most common)
        var usersByUsername = await _identityContext.TblUsers
            .AsNoTracking()
            .Where(u => userIdList.Select(id => id.ToLower().Trim()).Contains(u.Username.ToLower()) && (u.IsActive == null || u.IsActive == true))
            .ToListAsync();

        foreach (var user in usersByUsername)
        {
            var matchingUserId = userIdList.FirstOrDefault(id => id.ToLower().Trim() == user.Username.ToLower());
            if (matchingUserId != null)
            {
                var email = user.Email?.Trim();
                if (string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(user.Username) && user.Username.Contains("@"))
                {
                    email = user.Username;
                }
                
                if (!string.IsNullOrWhiteSpace(email))
                {
                    result[matchingUserId] = email;
                    _logger?.LogInformation("Batch: Found email {Email} for userId {UserId} (Username: {Username})", email, matchingUserId, user.Username);
                }
            }
        }

        // Try Id lookup for remaining numeric userIds
        var numericUserIds = userIdList
            .Where(id => int.TryParse(id, out _))
            .Select(id => int.Parse(id))
            .Where(id => !result.ContainsKey(id.ToString()))
            .ToList();

        if (numericUserIds.Any())
        {
            var usersById = await _identityContext.TblUsers
                .AsNoTracking()
                .Where(u => numericUserIds.Contains(u.Id) && (u.IsActive == null || u.IsActive == true))
                .ToListAsync();

            foreach (var user in usersById)
            {
                var email = user.Email?.Trim();
                if (string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(user.Username) && user.Username.Contains("@"))
                {
                    email = user.Username;
                }
                
                if (!string.IsNullOrWhiteSpace(email))
                {
                    result[user.Id.ToString()] = email;
                    _logger?.LogInformation("Batch: Found email {Email} for userId {UserId} (Id: {Id})", email, user.Id.ToString(), user.Id);
                }
            }
        }

        var notFound = userIdList.Where(id => !result.ContainsKey(id)).ToList();
        if (notFound.Any())
        {
            _logger?.LogWarning("Batch: Could not resolve emails for {Count} user IDs: {UserIds}", notFound.Count, string.Join(", ", notFound));
        }

        _logger?.LogInformation("Batch email resolution completed: {FoundCount}/{TotalCount} emails resolved", result.Count, userIdList.Count);
        return result;
    }
    catch (Exception ex)
    {
        _logger?.LogError(ex, "Failed to batch resolve user emails. Error: {ErrorMessage}", ex.Message);
        return result;
    }
}

// ============================================================
// OPTIONAL: Update SendSubmissionConfirmationToRecipientsAsync
// ============================================================
// Replace the email resolution loop with batch lookup:
// 
// OLD CODE:
// var recipientEmails = new List<string>();
// foreach (var userId in recipientUserIds ?? Enumerable.Empty<string>())
// {
//     var email = await GetUserEmailAsync(userId);
//     if (!string.IsNullOrWhiteSpace(email))
//     {
//         recipientEmails.Add(email);
//     }
// }
//
// NEW CODE:
// var emailMap = await GetUserEmailsBatchAsync(recipientUserIds);
// var recipientEmails = emailMap.Values.Distinct().ToList();
//
// ============================================================

