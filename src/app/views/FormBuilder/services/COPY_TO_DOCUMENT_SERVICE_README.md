# CopyToDocument Service - دليل الاستخدام السريع

## نظرة عامة

`CopyToDocumentService` هو Service في Angular للتعامل مع API الخاص بنسخ البيانات من مستند إلى آخر.

## الاستيراد

```typescript
import { CopyToDocumentService } from './services/copy-to-document.service';
import { CopyToDocumentRequestDto } from './models/form-builder-dto.model';
```

## الاستخدام الأساسي

### 1. تنفيذ CopyToDocument

```typescript
constructor(private copyToDocumentService: CopyToDocumentService) {}

executeCopy() {
  const request: CopyToDocumentRequestDto = {
    config: {
      targetDocumentTypeId: 2,
      targetFormId: 1,
      createNewDocument: true,
      fieldMapping: {
        "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
      },
      gridMapping: {},
      copyCalculatedFields: true,
      copyGridRows: true,
      startWorkflow: false,
      linkDocuments: true,
      copyMetadata: false,
      metadataFields: []
    },
    sourceSubmissionId: 1,
    actionId: null,
    ruleId: null
  };

  this.copyToDocumentService.executeCopyToDocument(request).subscribe({
    next: (result) => {
      if (result.success) {
        console.log(`Target Document ID: ${result.targetDocumentId}`);
        console.log(`Target Document Number: ${result.targetDocumentNumber}`);
      } else {
        console.error('Error:', result.errorMessage);
      }
    },
    error: (error) => {
      console.error('API Error:', error);
    }
  });
}
```

### 2. جلب Audit Records

```typescript
// جلب Audit Records مع Pagination
this.copyToDocumentService.getAuditRecords({
  page: 1,
  pageSize: 10,
  success: true
}).subscribe({
  next: (response) => {
    console.log(`Total: ${response.totalCount}`);
    response.items.forEach(audit => {
      console.log(`Audit ID: ${audit.id}`);
    });
  }
});
```

### 3. جلب Audit Records لـ Submission محدد

```typescript
this.copyToDocumentService.getAuditRecordsBySubmission(submissionId)
  .subscribe({
    next: (audits) => {
      console.log(`Found ${audits.length} records`);
    }
  });
```

### 4. جلب Audit Record محدد

```typescript
this.copyToDocumentService.getAuditRecordById(auditId)
  .subscribe({
    next: (audit) => {
      console.log('Audit:', audit);
    }
  });
```

## API Endpoints

### POST `/api/CopyToDocument/execute`
تنفيذ عملية نسخ المستند

### GET `/api/CopyToDocument/audit`
جلب Audit Records مع Pagination و Filters

### GET `/api/CopyToDocument/audit/{id}`
جلب Audit Record محدد

### GET `/api/CopyToDocument/audit/submission/{submissionId}`
جلب Audit Records لـ Submission محدد

### GET `/api/CopyToDocument/audit/target/{targetDocumentId}`
جلب Audit Records لمستند هدف محدد

## DTOs

### CopyToDocumentRequestDto
```typescript
{
  config: {
    targetDocumentTypeId: number;
    targetFormId: number;
    createNewDocument: boolean;
    fieldMapping?: { [key: string]: string };
    gridMapping?: { [key: string]: string };
    copyCalculatedFields?: boolean;
    copyGridRows?: boolean;
    startWorkflow?: boolean;
    linkDocuments?: boolean;
    copyMetadata?: boolean;
    metadataFields?: string[];
  };
  sourceSubmissionId: number;
  actionId?: number | null;
  ruleId?: number | null;
}
```

### CopyToDocumentResultDto
```typescript
{
  success: boolean;
  targetDocumentId?: number;
  targetDocumentNumber?: string;
  errorMessage?: string;
  fieldsCopied?: number;
  gridRowsCopied?: number;
  sourceSubmissionId?: number;
}
```

## Helper Methods

### تحويل FieldMapping من Object إلى Array
```typescript
const array = this.copyToDocumentService.convertFieldMappingToArray({
  "SOURCE": "TARGET"
});
// Result: [{ sourceFieldCode: "SOURCE", targetFieldCode: "TARGET" }]
```

### تحويل FieldMapping من Array إلى Object
```typescript
const object = this.copyToDocumentService.convertFieldMappingToObject([
  { sourceFieldCode: "SOURCE", targetFieldCode: "TARGET" }
]);
// Result: { "SOURCE": "TARGET" }
```

## أمثلة متقدمة

راجع ملف `copy-to-document.example.ts` لمزيد من الأمثلة.

