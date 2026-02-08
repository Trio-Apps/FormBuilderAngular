# CopyToDocument في FormBuilder - التوثيق الكامل

## 📋 نظرة عامة

**CopyToDocument** هي ميزة داخل Actions Engine تجعل النظام يقوم بـ "نسخ بيانات" تلقائياً من Document/Form Submission إلى Document/Form آخر، بناءً على Configuration (إعدادات) من غير ما تكتب كود لكل حالة.

## 🎯 1) أين تعمل بالظبط؟

داخل **Built-in Actions Engine** كـ Action نوعه:

```
ActionType = CopyToDocument
```

ويتنفذ لما يحصل Event من الأحداث التالية:
- `OnFormSubmitted` - بعد إرسال الفورم
- `OnApprovalCompleted` - بعد اكتمال الموافقة
- `OnDocumentApproved` - بعد موافقة المستند
- `OnRuleMatched` - عند تطابق الشرط

## 📊 2) البيانات التي يتعامل معها FormBuilder

### المفهومين الأساسيين:

1. **Document** (مستند instance) مرتبط بـ:
   - `DocumentType` + `Form`

2. **Form Submission / Values** (قيم الحقول) في جداول:
   - `Values` - قيم الحقول
   - `GridValues` - قيم الجداول
   - `Attachments` - المرفقات

### CopyToDocument يقرأ:

✅ قيم الحقول في الـ **Source Document**  
✅ ويكتب نفس القيم (بعد mapping) في الـ **Target Document**

## ⚙️ 3) الـ Configuration المخزن

### A) تعريف المصدر (Source)

```typescript
sourceDocumentTypeId: number  // نوع المستند المصدر
sourceFormId: number           // الفورم المصدر
```

### B) تعريف الهدف (Target)

```typescript
targetDocumentTypeId: number  // نوع المستند الهدف
targetFormId: number         // الفورم الهدف
```

### C) خيارات التنفيذ (Options)

```typescript
createNewDocument: boolean        // true = إنشاء جديد، false = تعديل موجود
initialStatus: 'Draft' | 'Submitted'  // الحالة الأولية
startWorkflow: boolean            // بدء Workflow للمستند الهدف
copyCalculatedFields: boolean     // نسخ الحقول المحسوبة
copyGridRows: boolean            // نسخ بيانات الجداول
copyAttachments: boolean         // نسخ المرفقات
linkDocuments: boolean           // ربط المستندات (ParentDocumentId = SourceDocumentId)
copyMetadata: boolean           // نسخ Metadata
overrideTargetDefaults: boolean  // تجاوز القيم الافتراضية
```

### D) Field Mapping

```typescript
fieldMappings: [
  { sourceFieldCode: "FIELD1", targetFieldCode: "FIELD2" },
  { sourceFieldCode: "AMOUNT", targetFieldCode: "TOTAL" }
]
```

**مهم جداً:** في FormBuilder نعتمد على `FieldCode` مش `FieldId` عشان الـ Form Versions.

### E) Trigger Event

```typescript
triggerEvent: 'OnFormSubmitted' | 'OnApprovalCompleted' | 'OnDocumentApproved' | 'OnRuleMatched'
```

## 📝 4) سيناريو واضح

### مثال: Purchase Request → Purchase Order

1. **Purchase Request** يتعمله Approval
2. أول ما الـ **Approval يخلص** (`OnApprovalCompleted`)
3. **CopyToDocument** يعمل:
   - ✅ إنشاء **Purchase Order**
   - ✅ ينقل حقول محددة + Grid + Attachments (لو مفعّل)
   - ✅ يحط `ParentDocumentId = SourceDocumentId` (لو `linkDocuments: true`)
   - ✅ يبدأ Workflow بتاع الـ PO (لو `startWorkflow: true`)

## 🔄 5) Execution Flow (بالترتيب)

### لما Event يحصل:

1. ✅ **Actions Engine** يلاقي Action من النوع `CopyToDocument` مرتبط بالـ Event
2. ✅ يقرأ الـ Config
3. ✅ يعمل **Validation**:
   - الفورم/الحقول موجودة
   - المابات سليمة
   - أنواع البيانات متوافقة
4. ✅ ينشئ Target Document أو يجيب Document موجود
5. ✅ يطبّق الـ Mapping:
   - Simple fields
   - (Optional) Calculated fields
   - (Optional) Grid rows/totals
   - (Optional) Attachments
6. ✅ يحفظ Target
7. ✅ (Optional) يبدأ Workflow
8. ✅ يسجل **Audit Log** (Source/Target/ActionId/Time)

**⚠️ لو أي خطوة فشلت = Rollback كامل**

## ✅ 6) المهام المكتملة في التطبيق

### ✅ DB/Config

- ✅ `CopyToDocumentConfig` في `form-builder-dto.model.ts`
- ✅ `FormRule` يحتوي على `actions[]` مع `copyToDocumentConfig`
- ✅ Configuration مخزن في DB عبر FormRules API

### ✅ Resolver

- ✅ `CopyToDocumentActionExecutorService.executeCopyToDocumentActionsForEvent()`
- ✅ يجيب config بناءً على event + source document
- ✅ يفلتر Actions بناءً على `triggerEvent`

### ✅ Executor Service

- ✅ `CopyToDocumentActionExecutorService` - ينفذ النسخ فعلياً
- ✅ `CopyToDocumentService.executeCopyToDocument()` - API call
- ✅ يعمل mapping و save

### ✅ Validators

- ✅ FieldCode exists check (في Backend)
- ✅ Type compatibility (في Backend)
- ✅ Required fields validation (`sourceDocumentTypeId`, `sourceFormId`, `targetDocumentTypeId`, `targetFormId`)

### ✅ Audit Logger

- ✅ `CopyToDocumentService.getAuditRecords()` - جلب Audit Records
- ✅ `getAuditRecordsBySubmissionId()` - Audit لـ Submission محدد
- ✅ `getAuditRecordsByTargetDocument()` - Audit لمستند هدف محدد

### ✅ UI

- ✅ شاشة في Form Rules (`form-rules-list.component`) لتكوين الـ mappings
- ✅ Field Mappings UI
- ✅ Grid Mappings UI
- ✅ Options checkboxes
- ✅ Trigger Event selection

## 📁 الملفات الرئيسية

### Services

- `copy-to-document-action-executor.service.ts` - Executor Service
- `copy-to-document.service.ts` - API Service
- `form-submission-triggers.service.ts` - Trigger Events Handler

### Models

- `form-builder-dto.model.ts` - `CopyToDocumentConfig`, `CopyToDocumentRequestDto`

### Components

- `form-rules-list.component.ts/html` - UI لتكوين CopyToDocument Actions

## 🚀 الاستخدام

### 1. إعداد Rule مع CopyToDocument Action

```typescript
// في Form Rules UI
{
  ruleName: "Create PO on Approval",
  actions: [{
    type: "CopyToDocument",
    copyToDocumentConfig: {
      sourceDocumentTypeId: 1,  // Purchase Request
      sourceFormId: 1,
      targetDocumentTypeId: 2,  // Purchase Order
      targetFormId: 2,
      triggerEvent: "OnApprovalCompleted",
      createNewDocument: true,
      fieldMappings: [
        { sourceFieldCode: "request_number", targetFieldCode: "po_number" },
        { sourceFieldCode: "request_amount", targetFieldCode: "po_amount" }
      ],
      copyGridRows: true,
      copyAttachments: true,
      linkDocuments: true,
      startWorkflow: true
    }
  }]
}
```

### 2. التنفيذ التلقائي

```typescript
// عند اكتمال Approval
this.formSubmissionTriggersService.handleOnApprovalCompleted(
  submissionId,
  formBuilderId
).subscribe();
```

## 📊 Audit & Monitoring

```typescript
// جلب Audit Records
this.copyToDocumentService.getAuditRecords({
  page: 1,
  pageSize: 10,
  sourceSubmissionId: submissionId
}).subscribe();
```

## ✅ الخلاصة

جميع المتطلبات المذكورة **مكتملة** في التطبيق:

✅ Configuration في DB  
✅ Resolver Service  
✅ Executor Service  
✅ Validators  
✅ Audit Logger  
✅ UI للتكوين  

التطبيق جاهز للاستخدام! 🎉

