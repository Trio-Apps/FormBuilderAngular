# API Endpoints Documentation
## توثيق نقاط نهاية API

---

## 1. Form Submissions Endpoints

### Base URL
```
https://localhost:7276/api/FormSubmissions
```

---

### 1.1 Create Draft Submission
**Method:** `POST`  
**URL:** `/api/FormSubmissions/draft`  
**Query Parameters:**
- `formBuilderId` (required): number
- `projectId` (required): number
- `submittedByUserId` (required): string
- `seriesId` (optional): number

**Example URL:**
```
POST /api/FormSubmissions/draft?formBuilderId=18&projectId=1&submittedByUserId=public-user&seriesId=9
```

**Request Body:** `null` (empty body)

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Draft form submission created successfully",
  "data": {
    "id": 314,
    "formBuilderId": 17,
    "formName": "form",
    "version": 1,
    "documentTypeId": 13,
    "documentTypeName": "form",
    "seriesId": 9,
    "seriesCode": "FORM-SERIES",
    "documentNumber": "FORM-SERIES-000001",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T07:24:58.8200616",
    "status": "Draft",
    "createdDate": "2026-01-16T07:24:58.820254",
    "lastUpdatedDate": "2026-01-16T07:24:58.8202547"
  }
}
```

**Important Notes:**
- The `seriesId` parameter is **required** in the query string. If missing or invalid, the backend returns a 404 error.
- The backend validates that an **active** Document Series exists for the given `documentTypeId` and `projectId`.
- If no active series is found, the error response includes helpful information about configuration endpoints.

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "No active Document Series found for Document Type 'doc' (ID: 7) and Project ID 1. Please configure Document Series using: POST /api/FormBuilderDocumentSettings or POST /api/DocumentSeries. Ensure at least one active series exists for this Document Type and Project.",
  "data": {
    "formBuilderId": 18,
    "formBuilderName": "form",
    "documentTypeId": 7,
    "documentTypeName": "doc",
    "projectId": 1,
    "configurationEndpoint": "/api/FormBuilderDocumentSettings",
    "documentSeriesEndpoint": "/api/DocumentSeries",
    "message": "Active Document Series must be configured for the Document Type and Project before creating draft submissions"
  }
}
```

---

### 1.2 Get All Submissions
**Method:** `GET`  
**URL:** `/api/FormSubmissions`

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "All form submissions retrieved successfully",
  "data": [
    {
      "id": 315,
      "formBuilderId": 17,
      "formName": "form",
      "version": 2,
      "documentTypeId": 7,
      "documentTypeName": "doc",
      "seriesId": 3,
      "seriesCode": "Series",
      "documentNumber": "Series-000001",
      "submittedByUserId": "1",
      "submittedByUserName": null,
      "submittedDate": "2026-01-16T08:03:30.5254347",
      "status": "submmited",
      "createdDate": "2026-01-16T08:03:30.5254352",
      "lastUpdatedDate": "2026-01-16T08:03:30.5255191"
    },
    {
      "id": 314,
      "formBuilderId": 17,
      "formName": "form",
      "version": 1,
      "documentTypeId": 13,
      "documentTypeName": "form",
      "seriesId": 9,
      "seriesCode": "FORM-SERIES",
      "documentNumber": "FORM-SERIES-000001",
      "submittedByUserId": "1",
      "submittedByUserName": null,
      "submittedDate": "2026-01-16T07:24:58.8200616",
      "status": "Draft",
      "createdDate": "2026-01-16T07:24:58.820254",
      "lastUpdatedDate": "2026-01-16T07:24:58.8202547"
    }
  ]
}
```

**Note:** Status values observed: `"Draft"`, `"submmited"` (typo in backend), `"Submitted"`. Backend may return different status spellings.

---

### 1.3 Get Submission by ID
**Method:** `GET`  
**URL:** `/api/FormSubmissions/{id}`

**Example URL:**
```
GET /api/FormSubmissions/315
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission retrieved successfully",
  "data": {
    "id": 315,
    "formBuilderId": 17,
    "formName": "form",
    "version": 2,
    "documentTypeId": 7,
    "documentTypeName": "doc",
    "seriesId": 3,
    "seriesCode": "Series",
    "documentNumber": "Series-000001",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T08:03:30.5254347",
    "status": "submmited",
    "createdDate": "2026-01-16T08:03:30.5254352",
    "lastUpdatedDate": "2026-01-16T08:03:30.5255191"
  }
}
```

---

### 1.3.1 Get Submission Details by ID
**Method:** `GET`  
**URL:** `/api/FormSubmissions/details/{id}`

**Example URL:**
```
GET /api/FormSubmissions/details/315
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission with details retrieved successfully",
  "data": {
    "fieldValues": [],
    "attachments": [],
    "gridData": [],
    "id": 315,
    "formBuilderId": 17,
    "formName": "form",
    "version": 2,
    "documentTypeId": 7,
    "documentTypeName": "doc",
    "seriesId": 3,
    "seriesCode": "Series",
    "documentNumber": "Series-000001",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T08:03:30.5254347",
    "status": "submmited",
    "createdDate": "2026-01-16T08:03:30.5254352",
    "lastUpdatedDate": "2026-01-16T08:03:30.5255191"
  }
}
```

**Note:** This endpoint includes `fieldValues`, `attachments`, and `gridData` arrays in the response.

---

### 1.4 Get Submissions by Document Type ID
**Method:** `GET`  
**URL:** `/api/FormSubmissions/document-type/{documentTypeId}`

**Example URL:**
```
GET /api/FormSubmissions/document-type/13
```

**Response JSON:** Same as Get All Submissions

---

### 1.5 Get Submission by Document Number
**Method:** `GET`  
**URL:** `/api/FormSubmissions/document/{documentNumber}`

**Example URL:**
```
GET /api/FormSubmissions/document/Series-000001
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission retrieved successfully",
  "data": {
    "id": 315,
    "formBuilderId": 17,
    "formName": "form",
    "version": 2,
    "documentTypeId": 7,
    "documentTypeName": "doc",
    "seriesId": 3,
    "seriesCode": "Series",
    "documentNumber": "Series-000001",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T07:24:58.8200616",
    "status": "Submitted",
    "createdDate": "2026-01-16T08:03:30.5254352",
    "lastUpdatedDate": "2026-01-16T08:14:53.0388464"
  }
}
```

---

### 1.6 Create Submission
**Method:** `POST`  
**URL:** `/api/FormSubmissions`

**Request JSON:**
```json
{
  "formBuilderId": 17,
  "documentTypeId": 13,
  "seriesId": 9,
  "submittedByUserId": "1",
  "status": "Submitted"
}
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission created successfully",
  "data": {
    "id": 316,
    "formBuilderId": 17,
    "formName": "form",
    "version": 3,
    "documentTypeId": 13,
    "documentTypeName": "form",
    "seriesId": 9,
    "seriesCode": "FORM-SERIES",
    "documentNumber": "FORM-SERIES-000002",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T08:11:28.6712026",
    "status": "Submitted",
    "createdDate": "2026-01-16T08:11:28.6712027",
    "lastUpdatedDate": "2026-01-16T08:11:28.6712029"
  }
}
```

**Note:** The `version` number increments automatically with each new submission for the same form.

---

### 1.7 Update Submission
**Method:** `PUT`  
**URL:** `/api/FormSubmissions/{id}`

**Request JSON:**
```json
{
  "documentNumber": "Series-000001",
  "status": "Submitted",
  "submittedDate": "2026-01-16T07:24:58.8200616",
  "stageId": 1
}
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission updated successfully",
  "data": {
    "id": 315,
    "formBuilderId": 17,
    "formName": "form",
    "version": 2,
    "documentTypeId": 7,
    "documentTypeName": "doc",
    "seriesId": 3,
    "seriesCode": "Series",
    "documentNumber": "Series-000001",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T07:24:58.8200616",
    "status": "Submitted",
    "createdDate": "2026-01-16T08:03:30.5254352",
    "lastUpdatedDate": "2026-01-16T08:14:53.0388464"
  }
}
```

---

### 1.8 Delete Submission
**Method:** `DELETE`  
**URL:** `/api/FormSubmissions/{id}`

**Example URL:**
```
DELETE /api/FormSubmissions/314
```

**Response:** Empty (void)

---

### 1.9 Update Submission Status
**Method:** `PATCH`  
**URL:** `/api/FormSubmissions/{id}/status`

**Request JSON:**
```json
{
  "status": "Submitted"
}
```

**Alternative Formats:**
- Query Parameter: `PATCH /api/FormSubmissions/{id}/status?status=Submitted`
- String Body: `"Submitted"`

**Response:** Empty (void)

---

### 1.10 Save Submission Data
**Method:** `POST`  
**URL:** `/api/FormSubmissions/save-data`

**Request JSON:**
```json
{
  "submissionId": 314,
  "fieldValues": [
    {
      "fieldId": 1,
      "fieldCode": "field_code",
      "valueString": "text value",
      "valueNumber": 123,
      "valueDate": "2026-01-16T00:00:00",
      "valueBool": true,
      "valueJson": "{\"key\":\"value\"}"
    }
  ],
  "attachments": [
    {
      "fieldId": 2,
      "fieldCode": "file_field",
      "fileName": "document.pdf",
      "filePath": "/uploads/document.pdf",
      "fileSize": 1024,
      "contentType": "application/pdf"
    }
  ],
  "gridData": [
    {
      "gridId": 1,
      "rowIndex": 0,
      "cells": [
        {
          "columnId": 1,
          "columnCode": "col_code",
          "valueString": "cell value",
          "valueNumber": 456,
          "valueDate": "2026-01-16T00:00:00",
          "valueBool": false,
          "valueJson": null
        }
      ]
    }
  ]
}
```

**Response:** Empty (void)

---

### 1.11 Submit Submission
**Method:** `POST`  
**URL:** `/api/FormSubmissions/submit`

**Request JSON:**
```json
{
  "submissionId": 314,
  "submittedByUserId": "1"
}
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission submitted successfully",
  "data": {
    "id": 314,
    "status": "Submitted",
    ...
  }
}
```

**Note:** Status will be "Submitted" or "Approved" based on approval workflow configuration.

---

### 1.12 Approve Submission
**Method:** `POST`  
**URL:** `/api/FormSubmissions/approve`

**Request JSON:**
```json
{
  "submissionId": 314,
  "stageId": 1,
  "actionByUserId": "admin-user",
  "comments": "Approved with comments"
}
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission approved successfully",
  "data": {
    "id": 314,
    "status": "Approved",
    ...
  }
}
```

---

### 1.13 Reject Submission
**Method:** `POST`  
**URL:** `/api/FormSubmissions/reject`

**Request JSON:**
```json
{
  "submissionId": 314,
  "stageId": 1,
  "actionByUserId": "admin-user",
  "comments": "Rejected: missing information"
}
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Form submission rejected successfully",
  "data": {
    "id": 314,
    "status": "Rejected",
    ...
  }
}
```

---

## 2. Document Series Endpoints

### Base URL
```
https://localhost:7276/api/DocumentSeries
```

---

### 2.1 Get All Document Series
**Method:** `GET`  
**URL:** `/api/DocumentSeries`

**Response JSON:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 9,
      "documentTypeId": 13,
      "documentTypeName": "form",
      "projectId": 1,
      "projectName": "Project 1",
      "seriesCode": "FORM-SERIES",
      "nextNumber": 1,
      "isDefault": true,
      "isActive": true,
      "isDeleted": false
    }
  ]
}
```

---

### 2.2 Get Document Series by Document Type ID
**Method:** `GET`  
**URL:** `/api/DocumentSeries/document-type/{documentTypeId}`

**Example URL:**
```
GET /api/DocumentSeries/document-type/13
```

**Response JSON:** Same as Get All Document Series

---

### 2.3 Get Document Series by ID
**Method:** `GET`  
**URL:** `/api/DocumentSeries/{id}`

**Example URL:**
```
GET /api/DocumentSeries/9
```

**Response JSON:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 9,
    "documentTypeId": 13,
    "documentTypeName": "form",
    "projectId": 1,
    "projectName": "Project 1",
    "seriesCode": "FORM-SERIES",
    "nextNumber": 1,
    "isDefault": true,
    "isActive": true,
    "isDeleted": false
  }
}
```

---

### 2.4 Create Document Series
**Method:** `POST`  
**URL:** `/api/DocumentSeries`

**Request JSON:**
```json
{
  "documentTypeId": 13,
  "projectId": 1,
  "seriesCode": "FORM-SERIES",
  "nextNumber": 1,
  "isDefault": false,
  "isActive": true,
  "isDeleted": false
}
```

**Response JSON:** Same as Get Document Series by ID

---

### 2.5 Update Document Series
**Method:** `PUT`  
**URL:** `/api/DocumentSeries/{id}`

**Request JSON:**
```json
{
  "projectId": 1,
  "seriesCode": "FORM-SERIES-UPDATED",
  "nextNumber": 2,
  "isDefault": true,
  "isActive": true
}
```

**Response:** Empty (void)

---

### 2.6 Delete Document Series
**Method:** `DELETE`  
**URL:** `/api/DocumentSeries/{id}`

**Response:** Empty (void)

---

### 2.7 Soft Delete Document Series
**Method:** `DELETE` or `PUT`  
**URL:** `/api/DocumentSeries/{id}/soft-delete`

**Response:** Empty (void)

---

### 2.8 Restore Document Series
**Method:** `PUT` or `PATCH`  
**URL:** `/api/DocumentSeries/{id}/restore`

**Response JSON:** Same as Get Document Series by ID

---

### 2.9 Set Document Series as Default
**Method:** `PATCH`  
**URL:** `/api/DocumentSeries/{id}/set-default`

**Response:** Empty (void)

---

### 2.10 Toggle Document Series Status
**Method:** `PATCH` or `PUT`  
**URL:** `/api/DocumentSeries/{id}/toggle-active`

**Request JSON:**
```json
{
  "isActive": true
}
```

**Response JSON:** Same as Get Document Series by ID

---

## 3. FormBuilder Document Settings Endpoints

### Base URL
```
https://localhost:7276/api/FormBuilderDocumentSettings
```

**Note:** This endpoint is mentioned in error messages but may not be fully implemented in the frontend.

---

## 4. Response Formats

### Success Response (Standard)
```json
{
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Success Response (Alternative)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "statusCode": 404,
  "message": "Error message here",
  "data": {
    "additionalInfo": "..."
  }
}
```

### Validation Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field is required",
      "code": "required"
    }
  ]
}
```

---

## 5. Common Data Types

### FormSubmissionDto
```json
{
  "id": 314,
  "formBuilderId": 17,
  "formName": "form",
  "version": 1,
  "documentTypeId": 13,
  "documentTypeName": "form",
  "seriesId": 9,
  "seriesCode": "FORM-SERIES",
  "documentNumber": "FORM-SERIES-000001",
  "submittedByUserId": "1",
  "submittedByUserName": null,
  "submittedDate": "2026-01-16T07:24:58.8200616",
  "status": "Draft",
  "createdDate": "2026-01-16T07:24:58.820254",
  "lastUpdatedDate": "2026-01-16T07:24:58.8202547"
}
```

### DocumentSeries
```json
{
  "id": 9,
  "documentTypeId": 13,
  "documentTypeName": "form",
  "projectId": 1,
  "projectName": "Project 1",
  "seriesCode": "FORM-SERIES",
  "nextNumber": 1,
  "isDefault": true,
  "isActive": true,
  "isDeleted": false
}
```

---

## Notes

### General Notes
- جميع الـ endpoints تستخدم JSON format
- الـ status codes الشائعة: 200 (Success), 400 (Bad Request), 404 (Not Found), 500 (Server Error)
- الـ Query Parameters يجب أن تكون URL-encoded
- الـ Request Body يجب أن يكون JSON format مع Content-Type: application/json

### Status Values
- Observed status values from backend:
  - `"Draft"` - Initial draft state
  - `"Submitted"` - Successfully submitted
  - `"submmited"` - **Note:** This appears to be a typo in the backend (should be "Submitted")
  - `"Approved"` - Approved by reviewer
  - `"Rejected"` - Rejected by reviewer

**Important:** The frontend should handle both `"Submitted"` and `"submmited"` as valid submitted statuses due to the backend typo.

### Response Structure
All successful responses follow this pattern:
```json
{
  "statusCode": 200,
  "message": "Descriptive success message",
  "data": { ... }
}
```

### Database Tables (from screenshots)
- `FORM_FIELDS` - Contains form field definitions
- `DOCUMENT_SERIES` - Contains document series configuration (critical for `seriesId`)
- `DOCUMENT_TYPES` - Contains document type definitions

### Common Issues
1. **404 Error on Draft Creation:** Usually caused by missing or inactive `seriesId`. Ensure:
   - `seriesId` is provided in query parameters
   - Document Series exists and is active (`isActive = true`)
   - Document Series matches the `documentTypeId` and `projectId`

2. **Status Inconsistency:** Backend may return `"submmited"` instead of `"Submitted"`. Frontend should normalize this.

