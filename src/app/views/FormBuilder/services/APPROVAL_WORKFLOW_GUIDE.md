# Approval Workflow Service Guide
# دليل خدمة نظام الموافقة (Workflow & Approval)

## Overview
This guide explains how to use the Approval Workflow system in the Angular application. The system allows you to configure approval workflows for document types and automatically handle form submission status based on workflow configuration.

## Components

### 1. ApprovalWorkflowService
Service for managing approval workflows.

**Location:** `src/app/views/FormBuilder/services/approval-workflow.service.ts`

**Key Methods:**

#### Get All Approval Workflows
```typescript
getAllApprovalWorkflows(): Observable<ApprovalWorkflowDto[]>
```
Returns all approval workflows in the system.

#### Get Approval Workflow by ID
```typescript
getApprovalWorkflowById(id: number): Observable<ApprovalWorkflowDto>
```
Returns a specific approval workflow by its ID.

#### Get Active Approval Workflows
```typescript
getActiveApprovalWorkflows(): Observable<ApprovalWorkflowDto[]>
```
Returns only active approval workflows.

#### Get Approval Workflow by Name
```typescript
getApprovalWorkflowByName(name: string): Observable<ApprovalWorkflowDto | null>
```
Searches for an approval workflow by name.

#### Create Approval Workflow
```typescript
createApprovalWorkflow(dto: CreateApprovalWorkflowDto): Observable<ApprovalWorkflowDto>
```
Creates a new approval workflow.

**Example:**
```typescript
const workflow = await this.approvalWorkflowService.createApprovalWorkflow({
  name: 'Purchase Request Approval',
  documentTypeId: 1,
  isActive: true
}).toPromise();
```

#### Update Approval Workflow
```typescript
updateApprovalWorkflow(id: number, dto: UpdateApprovalWorkflowDto): Observable<void>
```
Updates an existing approval workflow.

#### Toggle Approval Workflow Status
```typescript
toggleApprovalWorkflowStatus(id: number, isActive: boolean): Observable<void>
```
Toggles the active status of an approval workflow.

#### Delete Approval Workflow
```typescript
deleteApprovalWorkflow(id: number): Observable<void>
```
Deletes an approval workflow (will fail if associated with document types).

### 2. DocumentTypesService Updates
The `DocumentTypesService` has been updated to support `approvalWorkflowId` in document types.

**Updated Models:**

#### DocumentType Interface
```typescript
export interface DocumentType {
  // ... existing fields
  approvalWorkflowId?: number | null;
  approvalWorkflowName?: string;
}
```

#### CreateDocumentTypeDto
```typescript
export interface CreateDocumentTypeDto {
  // ... existing fields
  approvalWorkflowId?: number | null; // Optional - null means no workflow (auto-approve)
}
```

#### UpdateDocumentTypeDto
```typescript
export interface UpdateDocumentTypeDto {
  // ... existing fields
  approvalWorkflowId?: number | null; // Optional - null means no workflow (auto-approve)
}
```

**Usage Examples:**

#### Create Document Type WITHOUT Workflow (Auto-Approved)
```typescript
const docType = await this.documentTypesService.createDocumentType({
  name: 'Internal Note',
  code: 'INTERNAL_NOTE',
  formBuilderId: 1,
  menuCaption: 'Internal Notes',
  menuOrder: 1,
  isActive: true
  // approvalWorkflowId is not set, so it will be null (auto-approve)
}).toPromise();
```

#### Create Document Type WITH Workflow
```typescript
const docType = await this.documentTypesService.createDocumentType({
  name: 'Purchase Request',
  code: 'PURCHASE_REQUEST',
  formBuilderId: 1,
  menuCaption: 'Purchase Requests',
  menuOrder: 2,
  isActive: true,
  approvalWorkflowId: 1 // Assign workflow ID
}).toPromise();
```

#### Update Document Type - Add Approval Workflow
```typescript
await this.documentTypesService.updateDocumentType(1, {
  approvalWorkflowId: 1 // Add workflow
}).toPromise();
```

#### Update Document Type - Remove Approval Workflow
```typescript
await this.documentTypesService.updateDocumentType(1, {
  approvalWorkflowId: null // Remove workflow (set to null)
}).toPromise();
```

### 3. FormSubmissionsService Updates
The `submitSubmission` method has been enhanced to handle workflow logic automatically.

**Updated Method:**

#### Submit Form Submission
```typescript
submitSubmission(submissionId: number, submittedByUserId: string): Observable<FormSubmissionDto>
```

**Workflow Logic:**
- If DocumentType has **no ApprovalWorkflow** → Auto-approve (status = "Approved")
- If DocumentType has **Active ApprovalWorkflow** → Submit (status = "Submitted")
- If DocumentType has **Inactive ApprovalWorkflow** → Auto-approve (status = "Approved")

**Example:**
```typescript
try {
  const result = await this.formSubmissionsService.submitSubmission(
    submissionId,
    userId
  ).toPromise();
  
  console.log('Submission status:', result.status);
  // Status will be "Approved" or "Submitted" based on workflow configuration
} catch (error) {
  console.error('Error submitting:', error.message);
}
```

## Complete Workflow Examples

### Example 1: Create Workflow → Create Document Type → Submit Form

```typescript
// Step 1: Create Approval Workflow
const workflow = await this.approvalWorkflowService.createApprovalWorkflow({
  name: 'Lease Contract Approval',
  documentTypeId: 1,
  isActive: true
}).toPromise();

// Step 2: Create Document Type with Workflow
const docType = await this.documentTypesService.createDocumentType({
  name: 'Lease Contract',
  code: 'LEASE_CONTRACT',
  formBuilderId: 1,
  menuCaption: 'Lease Contracts',
  menuOrder: 5,
  isActive: true,
  approvalWorkflowId: workflow.id
}).toPromise();

// Step 3: Create Draft Submission
const submission = await this.formSubmissionsService.createSubmission({
  formBuilderId: 1,
  documentTypeId: docType.id,
  seriesId: 1,
  submittedByUserId: 'user123',
  status: 'Draft'
}).toPromise();

// Step 4: Submit (Will trigger workflow - status becomes "Submitted")
const submitted = await this.formSubmissionsService.submitSubmission(
  submission.id,
  'user123'
).toPromise();

console.log('Final status:', submitted.status); // "Submitted"
```

### Example 2: Document Type WITHOUT Workflow (Auto-Approve)

```typescript
// Step 1: Create Document Type WITHOUT Workflow
const docType = await this.documentTypesService.createDocumentType({
  name: 'Internal Note',
  code: 'INTERNAL_NOTE',
  formBuilderId: 1,
  menuCaption: 'Internal Notes',
  menuOrder: 10,
  isActive: true
  // No approvalWorkflowId - will auto-approve
}).toPromise();

// Step 2: Create Draft Submission
const submission = await this.formSubmissionsService.createSubmission({
  formBuilderId: 1,
  documentTypeId: docType.id,
  seriesId: 1,
  submittedByUserId: 'user123',
  status: 'Draft'
}).toPromise();

// Step 3: Submit (Will auto-approve - status becomes "Approved")
const submitted = await this.formSubmissionsService.submitSubmission(
  submission.id,
  'user123'
).toPromise();

console.log('Final status:', submitted.status); // "Approved"
```

### Example 3: Remove Workflow from Document Type

```typescript
// Remove workflow from document type (will auto-approve future submissions)
await this.documentTypesService.updateDocumentType(1, {
  approvalWorkflowId: null // Remove workflow
}).toPromise();

// Future submissions will auto-approve
```

## API Endpoints Reference

### Approval Workflow Endpoints
- `GET /api/ApprovalWorkflow` - Get all workflows
- `GET /api/ApprovalWorkflow/{id}` - Get workflow by ID
- `GET /api/ApprovalWorkflow/active` - Get active workflows
- `GET /api/ApprovalWorkflow/name/{name}` - Get workflow by name
- `POST /api/ApprovalWorkflow` - Create workflow
- `PUT /api/ApprovalWorkflow/{id}` - Update workflow
- `PATCH /api/ApprovalWorkflow/{id}/toggle?isActive={bool}` - Toggle status
- `DELETE /api/ApprovalWorkflow/{id}` - Delete workflow

### Document Types Endpoints (Updated)
- `POST /api/DocumentTypes` - Create (supports `approvalWorkflowId`)
- `PUT /api/DocumentTypes/{id}` - Update (supports `approvalWorkflowId`)

### Form Submissions Endpoints (Updated)
- `POST /api/FormSubmissions/submit` - Submit (handles workflow logic)

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const workflow = await this.approvalWorkflowService.createApprovalWorkflow({
    name: 'Test Workflow',
    documentTypeId: 1
  }).toPromise();
} catch (error) {
  // Error messages are user-friendly
  console.error('Error:', error.message);
  // Examples:
  // - "Approval workflow name is required"
  // - "Document type ID is required"
  // - "Cannot delete this approval workflow because it is associated with document types"
}
```

## Best Practices

1. **Always check workflow status before submitting:**
   ```typescript
   const docType = await this.documentTypesService.getDocumentTypeById(documentTypeId).toPromise();
   if (docType.approvalWorkflowId) {
     // Has workflow - will be submitted for approval
   } else {
     // No workflow - will auto-approve
   }
   ```

2. **Validate workflow is active before assigning:**
   ```typescript
   const workflow = await this.approvalWorkflowService.getApprovalWorkflowById(workflowId).toPromise();
   if (!workflow.isActive) {
     console.warn('Workflow is inactive - submissions will auto-approve');
   }
   ```

3. **Handle submission status appropriately:**
   ```typescript
   const submitted = await this.formSubmissionsService.submitSubmission(id, userId).toPromise();
   if (submitted.status === 'Approved') {
     // Auto-approved - no approval needed
   } else if (submitted.status === 'Submitted') {
     // Submitted for approval - wait for approval
   }
   ```

## Notes

- Setting `approvalWorkflowId` to `null` removes the workflow association
- Inactive workflows are treated as if they don't exist (auto-approve)
- Workflow must belong to the same `documentTypeId` as the document type
- Deleting a workflow will fail if it's associated with document types

