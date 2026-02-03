# CopyToDocument Action Implementation - Technical Specification

## Overview

This document describes the implementation of the CopyToDocument Action according to the Technical Specification. The CopyToDocument action is a built-in system action that automatically copies data from one form submission or document into another document.

## Architecture

### Components

1. **CopyToDocumentActionExecutorService** (`copy-to-document-action-executor.service.ts`)
   - Main service that executes CopyToDocument actions
   - Handles automatic execution based on trigger events
   - Integrates with FormRulesService to load rules
   - Uses CopyToDocumentService to execute the actual copy operation

2. **FormSubmissionTriggersService** (`form-submission-triggers.service.ts`)
   - Handles trigger events (OnFormSubmitted, OnApprovalCompleted, etc.)
   - Provides integration points for form submission and approval flows
   - Wraps CopyToDocumentActionExecutorService for easier integration

3. **RuleEvaluationService** (updated)
   - Skips CopyToDocument actions during UI rule evaluation
   - CopyToDocument actions don't affect field states in the UI

## Trigger Events

The CopyToDocument action is executed automatically when these events occur:

- **OnFormSubmitted**: After a form is successfully submitted
- **OnApprovalCompleted**: After approval workflow is completed
- **OnDocumentApproved**: When a document is approved (single stage)
- **OnRuleMatched**: When a rule condition is matched

## Integration Points

### 1. Form Submission Flow

After successful form submission, trigger OnFormSubmitted:

```typescript
import { FormSubmissionTriggersService } from './services/form-submission-triggers.service';

// After successful submit
this.formSubmissionsService.submitSubmission({ submissionId, submittedByUserId }).subscribe({
  next: (submission) => {
    // Trigger CopyToDocument actions
    this.formSubmissionTriggersService.handleOnFormSubmittedWithSubmission(submission).subscribe({
      next: (results) => {
        console.log('CopyToDocument actions executed:', results);
      }
    });
  }
});
```

### 2. Approval Flow

After successful approval, trigger OnApprovalCompleted or OnDocumentApproved:

```typescript
// After successful approval
this.formSubmissionsService.approveSubmissionDto(dto).subscribe({
  next: (response) => {
    const submission = response.data;
    // Trigger CopyToDocument actions
    this.formSubmissionTriggersService.handleOnApprovalCompletedWithSubmission(submission).subscribe();
  }
});
```

### 3. Rule Matching

When a rule condition is matched, trigger OnRuleMatched:

```typescript
// When rule is matched
this.formSubmissionTriggersService.handleOnRuleMatched(submissionId, formBuilderId, ruleId).subscribe();
```

## Configuration

CopyToDocument actions are configured in Form Rules:

1. Create a Form Rule
2. Set the Action Type to "Copy To Document"
3. Configure the CopyToDocument settings:
   - Target Document Type ID
   - Target Form ID
   - Create New Document flag
   - Field Mappings
   - Grid Mappings
   - Options (Copy Calculated Fields, Copy Grid Rows, Start Workflow, Link Documents, Copy Metadata)

## Execution Flow

1. Event occurs (OnFormSubmitted, OnApprovalCompleted, etc.)
2. FormSubmissionTriggersService is called
3. CopyToDocumentActionExecutorService loads active rules for the form
4. Finds all CopyToDocument actions in the rules
5. Executes each CopyToDocument action
6. CopyToDocumentService.ExecuteCopyToDocument is called
7. Target document is created/updated
8. Field values are mapped and copied
9. Target workflow is optionally started
10. Action result is logged in Audit

## Error Handling

- CopyToDocument action failures do not block the main flow (submission/approval)
- Errors are logged to console
- Failed actions return error results but don't throw exceptions
- Audit records are created for both successful and failed executions

## Audit & Traceability

Each execution is logged with:
- SourceSubmissionId
- TargetDocumentId
- ActionId
- RuleId
- Execution timestamp
- Success/Failure status
- Error messages (if failed)
- Fields copied count
- Grid rows copied count

## Backend Integration

**Note**: According to the Technical Specification, the backend should handle CopyToDocument action execution automatically. This frontend implementation provides:

1. **Fallback execution**: If backend doesn't handle it, frontend can trigger it
2. **Immediate execution**: For better user experience, actions can execute immediately
3. **Development/testing**: Easier to test and debug CopyToDocument actions

The backend should ideally:
- Execute CopyToDocument actions automatically when events occur
- Handle all trigger events (OnFormSubmitted, OnApprovalCompleted, etc.)
- Log audit records
- Handle errors gracefully

## Usage Example

### Scenario: After approval of a Request Form, create a Contract Document

1. **Configure Rule**:
   - Rule Name: "Create Contract on Approval"
   - Trigger: OnApprovalCompleted (or configure in backend)
   - Action Type: CopyToDocument
   - Target Document Type: Contract
   - Target Form: Contract Form
   - Field Mappings: Map Request fields to Contract fields

2. **Execution**:
   - User approves Request Form
   - OnApprovalCompleted event is triggered
   - CopyToDocumentActionExecutorService finds the rule
   - Executes CopyToDocument action
   - Creates new Contract document
   - Copies mapped fields
   - Starts Contract workflow (if configured)
   - Logs audit record

## Files

- `copy-to-document-action-executor.service.ts` - Main executor service
- `form-submission-triggers.service.ts` - Trigger event handler
- `rule-evaluation.service.ts` - Updated to skip CopyToDocument in UI
- `copy-to-document.service.ts` - API service (already exists)
- `form-rules.service.ts` - Rules service (already exists)

## Testing

To test CopyToDocument actions:

1. Create a form rule with CopyToDocument action
2. Configure field mappings
3. Submit a form (or approve it)
4. Check audit records to verify execution
5. Verify target document was created/updated

## Notes

- CopyToDocument actions are executed asynchronously
- Multiple CopyToDocument actions can be executed in parallel
- Actions don't block the main submission/approval flow
- All actions are logged for audit purposes

