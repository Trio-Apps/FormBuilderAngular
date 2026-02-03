# ✅ CopyToDocument Service - التنفيذ الكامل

## 📋 ملخص التنفيذ

تم تنفيذ نظام CopyToDocument بالكامل في Angular مع دعم كامل لجميع الـ API endpoints.

---

## 📁 الملفات المُنشأة

### 1. Service
- ✅ `copy-to-document.service.ts` - Service الرئيسي للتعامل مع API

### 2. DTOs (في `form-builder-dto.model.ts`)
- ✅ `CopyToDocumentRequestDto` - Request DTO
- ✅ `CopyToDocumentResultDto` - Response DTO
- ✅ `CopyToDocumentAuditDto` - Audit Record DTO
- ✅ `CopyToDocumentAuditQueryParams` - Query Parameters
- ✅ `CopyToDocumentAuditResponse` - Paginated Response
- ✅ `CopyToDocumentConfig` - تم تحديثه لدعم جميع الحقول الجديدة

### 3. ملفات التوثيق والأمثلة
- ✅ `copy-to-document.example.ts` - أمثلة أساسية
- ✅ `copy-to-document-usage-example.ts` - أمثلة متقدمة مع الـ Request المحدد
- ✅ `COPY_TO_DOCUMENT_SERVICE_README.md` - دليل سريع
- ✅ `COPY_TO_DOCUMENT_COMPLETE.md` - هذا الملف

---

## 🚀 الاستخدام السريع

### 1. استيراد الـ Service

```typescript
import { CopyToDocumentService } from './services/copy-to-document.service';
import { CopyToDocumentRequestDto } from './models/form-builder-dto.model';
```

### 2. استخدام في Component

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
        console.log(`Target Document: ${result.targetDocumentNumber}`);
      }
    }
  });
}
```

---

## 📡 API Endpoints المدعومة

### 1. POST `/api/CopyToDocument/execute`
تنفيذ عملية نسخ المستند

**Method:** `executeCopyToDocument(request: CopyToDocumentRequestDto)`

### 2. GET `/api/CopyToDocument/audit`
جلب Audit Records مع Pagination و Filters

**Method:** `getAuditRecords(params?: CopyToDocumentAuditQueryParams)`

### 3. GET `/api/CopyToDocument/audit/{id}`
جلب Audit Record محدد

**Method:** `getAuditRecordById(id: number)`

### 4. GET `/api/CopyToDocument/audit/submission/{submissionId}`
جلب Audit Records لـ Submission محدد

**Method:** `getAuditRecordsBySubmission(submissionId: number)`

### 5. GET `/api/CopyToDocument/audit/target/{targetDocumentId}`
جلب Audit Records لمستند هدف محدد

**Method:** `getAuditRecordsByTargetDocument(targetDocumentId: number)`

---

## 🔧 الحقول المدعومة

### CopyToDocumentRequestDto.config

| الحقل | النوع | الوصف |
|------|------|-------|
| `targetDocumentTypeId` | `number` | ID نوع المستند الهدف (مطلوب) |
| `targetFormId` | `number` | ID الـ Form الهدف (مطلوب) |
| `createNewDocument` | `boolean` | إنشاء مستند جديد أم تحديث موجود |
| `fieldMapping` | `{ [key: string]: string }` | خريطة الحقول (Object format) |
| `fieldMappings` | `FieldMapping[]` | خريطة الحقول (Array format) |
| `gridMapping` | `{ [key: string]: string }` | خريطة الجداول |
| `copyCalculatedFields` | `boolean` | نسخ الحقول المحسوبة |
| `copyGridRows` | `boolean` | نسخ صفوف الـ Grid |
| `startWorkflow` | `boolean` | بدء الـ Workflow |
| `linkDocuments` | `boolean` | ربط المستندات |
| `copyMetadata` | `boolean` | نسخ البيانات الوصفية |
| `metadataFields` | `string[]` | قائمة الحقول الوصفية للنسخ |

---

## 📝 مثال كامل مع الـ Request المحدد

```typescript
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
      console.log(`✅ Success! Target Document: ${result.targetDocumentNumber}`);
      console.log(`   Fields Copied: ${result.fieldsCopied}`);
      console.log(`   Grid Rows Copied: ${result.gridRowsCopied}`);
    } else {
      console.error(`❌ Failed: ${result.errorMessage}`);
    }
  },
  error: (error) => {
    console.error('❌ API Error:', error);
  }
});
```

---

## 🔄 Helper Methods

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

---

## ✅ الميزات

- ✅ دعم كامل لجميع الـ API endpoints
- ✅ Type-safe DTOs
- ✅ Error Handling شامل
- ✅ Helper Methods للتحويل
- ✅ دعم Pagination للـ Audit Records
- ✅ دعم Filters للبحث
- ✅ أمثلة شاملة للاستخدام
- ✅ توثيق كامل

---

## 📚 الملفات المرجعية

1. **Service:** `src/app/views/FormBuilder/services/copy-to-document.service.ts`
2. **DTOs:** `src/app/views/FormBuilder/form-builder/models/form-builder-dto.model.ts`
3. **أمثلة:** `src/app/views/FormBuilder/services/copy-to-document-usage-example.ts`
4. **دليل:** `src/app/views/FormBuilder/services/COPY_TO_DOCUMENT_SERVICE_README.md`

---

## 🎯 الخطوات التالية

1. ✅ Service جاهز للاستخدام
2. ✅ DTOs محدثة ومتوافقة
3. ✅ أمثلة شاملة متوفرة
4. ✅ توثيق كامل متوفر

**النظام جاهز للاستخدام! 🚀**

---

**آخر تحديث:** 2024-02-03

