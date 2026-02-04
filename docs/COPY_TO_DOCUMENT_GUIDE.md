# دليل شامل: CopyToDocument Action

## جدول المحتويات
1. [المفهوم العام](#المفهوم-العام)
2. [المكونات الرئيسية](#المكونات-الرئيسية)
3. [سير العمل (Workflow)](#سير-العمل-workflow)
4. [الوظائف الرئيسية](#الوظائف-الرئيسية)
5. [التكامل مع النظام](#التكامل-مع-النظام)
6. [أمثلة الاستخدام](#أمثلة-الاستخدام)
7. [مرجع API (API Reference)](#مرجع-api-api-reference)
8. [الميزات](#الميزات)
9. [الخلاصة](#الخلاصة)
10. [ملاحظات إضافية](#ملاحظات-إضافية)
11. [المراجع](#المراجع)

---

## 1. المفهوم العام

**CopyToDocument** هو إجراء تلقائي ينسخ بيانات من مستند (Form Submission) إلى مستند آخر بناءً على أحداث محددة (مثل: عند الإرسال، عند الموافقة، إلخ).

### الهدف الرئيسي
- نسخ البيانات تلقائياً من مستند مصدر إلى مستند هدف
- ربط المستندات ببعضها البعض
- بدء سير عمل الموافقة للمستند الهدف تلقائياً
- نسخ الحقول والجداول (Grids) والبيانات الوصفية (Metadata)

---

## 2. المكونات الرئيسية

### أ) DTOs (Data Transfer Objects)

#### 1. CopyToDocumentActionDto - إعدادات الإجراء

```typescript
interface CopyToDocumentActionDto {
  sourceFormId?: number | null;
  sourceSubmissionId?: number | null;
  targetDocumentTypeId: number;       // ID نوع المستند الهدف (مطلوب)
  targetFormId: number;               // ID الـ Form الهدف (مطلوب)
  createNewDocument: boolean;          // إنشاء مستند جديد أم تحديث موجود
  targetDocumentId?: number | null;    // مطلوب عند createNewDocument = false
  fieldMapping?: { [sourceFieldCode: string]: string }; // Mapping بالـ FieldCode
  gridMapping?: { [sourceGridCode: string]: string };   // Mapping بالـ GridCode
  copyCalculatedFields?: boolean;      // نسخ الحقول المحسوبة
  copyGridRows?: boolean;              // نسخ صفوف الـ Grid
  startWorkflow?: boolean;             // بدء الـ Workflow للمستند الهدف
  linkDocuments?: boolean;             // ربط Source و Target عبر ParentDocumentId
  copyMetadata?: boolean;              // نسخ Metadata
  metadataFields?: string[];           // مفاتيح Metadata المطلوب نسخها
}
```

**الحقول:**
- `targetDocumentTypeId`: معرف نوع المستند الهدف (مطلوب)
- `targetFormId`: معرف النموذج الهدف (مطلوب)
- `createNewDocument`: `true` لإنشاء مستند جديد، `false` لتحديث مستند موجود
- `targetDocumentId`: مطلوب عند `createNewDocument = false`
- `fieldMapping`: Object لتعيين الحقول باستخدام `FieldCode`
- `gridMapping`: Object لتعيين الجداول باستخدام `GridCode`
- `copyCalculatedFields`: نسخ الحقول المحسوبة (اختياري)
- `copyGridRows`: نسخ صفوف الجداول (اختياري)
- `startWorkflow`: بدء سير عمل الموافقة تلقائياً (اختياري)
- `linkDocuments`: ربط المستندات عبر `ParentDocumentId` (اختياري)
- `copyMetadata`: نسخ Metadata (اختياري)
- `metadataFields`: مفاتيح الـ Metadata المطلوب نسخها

#### 2. FieldMapping - خريطة الحقول (واجهة المستخدم)

```typescript
interface FieldMapping {
  sourceFieldCode: string;  // كود الحقل في المستند المصدر
  targetFieldCode: string; // كود الحقل في المستند الهدف
}
```
**ملاحظة:** واجهة المستخدم قد تستخدم `fieldMappings` كـ Array، بينما الـ API يعتمد `fieldMapping` بصيغة Object.

#### 3. CopyToDocumentResultDto - نتيجة التنفيذ

```typescript
interface CopyToDocumentResultDto {
  success: boolean;                    // نجاح العملية
  targetDocumentId?: number;          // ID المستند المُنشأ
  targetDocumentNumber?: string;      // رقم المستند
  errorMessage?: string;              // رسالة الخطأ إن وجدت
  fieldsCopied?: number;              // عدد الحقول المنسوخة
  gridRowsCopied?: number;            // عدد صفوف الـ Grid المنسوخة
  actionId?: number | null;           // ID الإجراء (إن وجد)
  sourceSubmissionId?: number;        // ID الـ Submission المصدر
}
```

### ب) Services

#### 1. ICopyToDocumentService & CopyToDocumentService

**الوظيفة:** تنفيذ عملية النسخ

**الخطوات:**
1. تحميل Source Submission
2. التحقق من Target Form و Document Type
3. إنشاء/تحديث Target Document
4. نسخ Field Values
5. نسخ Grid Data
6. نسخ Metadata (اختياري)
7. ربط المستندات (اختياري)
8. بدء Workflow (اختياري)
9. تسجيل Audit Record

#### 2. CopyToDocumentActionExecutorService

**الوظيفة:** تنفيذ إجراءات CopyToDocument من Rules

**آلية العمل:**
- يتم استدعاؤه من Triggers (OnFormSubmitted, OnApprovalCompleted)
- يجلب القواعد النشطة للـ Form
- يبحث عن إجراءات CopyToDocument
- ينفذها تلقائياً

### ج) Entity & Database

#### COPY_TO_DOCUMENT_AUDIT - جدول Audit

```sql
CREATE TABLE COPY_TO_DOCUMENT_AUDIT (
    Id INT PRIMARY KEY IDENTITY(1,1),
    SourceSubmissionId INT NOT NULL,
    TargetDocumentId INT NULL,
    ActionId INT NULL,
    RuleId INT NULL,
    SourceFormId INT NULL,
    TargetFormId INT NULL,
    TargetDocumentTypeId INT NULL,
    Success BIT NOT NULL,
    ErrorMessage NVARCHAR(MAX) NULL,
    FieldsCopied INT NULL,
    GridRowsCopied INT NULL,
    TargetDocumentNumber NVARCHAR(100) NULL,
    ExecutionDate DATETIME2 NOT NULL,
    CreatedDate DATETIME2 NOT NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    IsDeleted BIT NOT NULL DEFAULT 0
);
```

**الحقول:**
- `Id`: Primary Key
- `SourceSubmissionId`: ID الـ Submission المصدر
- `TargetDocumentId`: ID المستند الهدف
- `ActionId`: ID الإجراء الذي أطلق النسخ
- `RuleId`: ID القاعدة
- `SourceFormId`: ID الـ Form المصدر
- `TargetFormId`: ID الـ Form الهدف
- `TargetDocumentTypeId`: ID نوع المستند الهدف
- `Success`: نجاح العملية
- `ErrorMessage`: رسالة الخطأ
- `FieldsCopied`: عدد الحقول المنسوخة
- `GridRowsCopied`: عدد صفوف الـ Grid
- `TargetDocumentNumber`: رقم المستند
- `ExecutionDate`: تاريخ التنفيذ
- `CreatedDate`, `CreatedByUserId`, `IsActive`, `IsDeleted`: حقول BaseEntity

### د) API Controller

#### CopyToDocumentController

**Endpoints:**

1. **POST** `/api/CopyToDocument/execute`
   - تنفيذ يدوي لعملية النسخ
   - Body: `CopyToDocumentRequestDto`

2. **GET** `/api/CopyToDocument/audit`
   - جلب Audit Records (مع pagination و filters)
   - Query Parameters: `page`, `pageSize`, `sourceSubmissionId`, `targetDocumentId`, `success`

3. **GET** `/api/CopyToDocument/audit/{id}`
   - جلب Audit Record محدد

4. **GET** `/api/CopyToDocument/audit/submission/{submissionId}`
   - جلب Audit Records لـ Submission محدد

5. **GET** `/api/CopyToDocument/audit/target/{targetDocumentId}`
   - جلب Audit Records لمستند هدف محدد

---

## 3. سير العمل (Workflow)

### أ) التنفيذ التلقائي (من Rules)

```
1. حدث يحدث (OnFormSubmitted / OnApprovalCompleted)
   ↓
2. FormSubmissionTriggersService يتم استدعاؤه
   ↓
3. CopyToDocumentActionExecutorService.ExecuteCopyToDocumentActionsForEventAsync
   ↓
4. جلب القواعد النشطة للـ Form
   ↓
5. البحث عن إجراءات CopyToDocument
   ↓
6. تنفيذ كل إجراء CopyToDocument
   ↓
7. CopyToDocumentService.ExecuteCopyToDocumentAsync
   ↓
8. إنشاء Target Document ونسخ البيانات
   ↓
9. تسجيل Audit Record
```

### ب) التنفيذ اليدوي (من API)

```
1. POST /api/CopyToDocument/execute
   ↓
2. CopyToDocumentController.ExecuteCopyToDocument
   ↓
3. CopyToDocumentService.ExecuteCopyToDocumentAsync
   ↓
4. إنشاء Target Document ونسخ البيانات
   ↓
5. تسجيل Audit Record
   ↓
6. إرجاع النتيجة
```

---

## 4. الوظائف الرئيسية في CopyToDocumentService

### ExecuteCopyToDocumentAsync

**الخطوات:**
1. تحميل Source Submission
2. تحديد SourceFormId
3. التحقق من Target Form و Document Type
4. إنشاء Target Document (`CreateTargetDocumentAsync`)
5. نسخ Field Values (`CopyFieldValuesAsync`)
6. نسخ Grid Data (`CopyGridDataAsync`)
7. نسخ Metadata (`CopyMetadataAsync`)
8. ربط المستندات (`LinkDocuments`)
9. بدء Workflow (`StartWorkflow`)
10. حفظ التغييرات
11. تسجيل Audit Record (`LogAuditAsync`)

### CreateTargetDocumentAsync

**الخطوات:**
1. الحصول على ProjectId من Source Submission
2. اختيار Document Series للـ Target Document Type
3. توليد Document Number (مع retry logic لتجنب التكرار)
4. إنشاء Target Document جديد

### CopyFieldValuesAsync

**الخطوات:**
1. نسخ Field Values بناءً على FieldMapping
2. استخدام FieldCode للبحث عن الحقول
3. نسخ القيم من Source إلى Target

### CopyGridDataAsync

**الخطوات:**
1. نسخ Grid Rows بناءً على GridMapping
2. نسخ Grid Cells
3. الحفاظ على ترتيب الصفوف

### LogAuditAsync

**الخطوات:**
1. تسجيل تفاصيل التنفيذ في جدول Audit
2. حفظ SourceSubmissionId, TargetDocumentId, Success, ErrorMessage
3. حفظ عدد الحقول والصفوف المنسوخة

---

## 5. التكامل مع النظام

### أ) مع Form Rules

**إضافة CopyToDocument كـ Action Type في Rules:**

```typescript
// في form-rules-list.component.ts
actionTypes: { label: string; value: RuleActionType }[] = [
  { label: 'Set Visible', value: 'SetVisible' },
  { label: 'Set ReadOnly', value: 'SetReadOnly' },
  { label: 'Set Mandatory', value: 'SetMandatory' },
  { label: 'Set Default', value: 'SetDefault' },
  { label: 'Clear Value', value: 'ClearValue' },
  { label: 'Compute', value: 'Compute' },
  { label: 'Copy To Document', value: 'CopyToDocument' } // ✅
];
```

**تخزين الإعدادات:**
- يتم تخزين الإعدادات في `FORM_RULE_ACTIONS.Value` كـ JSON
- يتم تحويل `CopyToDocumentConfig` إلى JSON string

### ب) مع Triggers

**الأحداث المدعومة:**
- `OnFormSubmitted`: عند إرسال Form
- `OnApprovalCompleted`: عند اكتمال الموافقة
- `OnDocumentApproved`: عند الموافقة على المستند
- `OnRuleMatched`: عند تطابق قاعدة

### ج) مع Document Series

**الاستخدام:**
- استخدام Document Series لتوليد Document Numbers
- التحقق من وجود Document Series للـ Target Document Type
- Retry Logic لتجنب duplicate document numbers

### د) Dependency Injection

**في ServiceCollectionExtensions.cs:**

```csharp
services.AddScoped<ICopyToDocumentService, CopyToDocumentService>();
services.AddScoped<CopyToDocumentActionExecutorService>();
```

### هـ) Migration

**تم إنشاء Migration لجدول COPY_TO_DOCUMENT_AUDIT:**
- `20260203115716_copytodocment.cs`
- إنشاء الجدول مع Foreign Keys و Indexes

---

## 6. أمثلة الاستخدام

### مثال 1: نسخ بيانات بسيط

```json
{
  "config": {
    "targetDocumentTypeId": 2,
    "targetFormId": 1,
    "createNewDocument": true,
    "fieldMappings": [
      {
        "sourceFieldCode": "AMOUNT",
        "targetFieldCode": "TOTAL_AMOUNT"
      }
    ]
  },
  "sourceSubmissionId": 1
}
```

### مثال 2: نسخ شامل

```json
{
  "config": {
    "targetDocumentTypeId": 2,
    "targetFormId": 1,
    "createNewDocument": true,
    "fieldMappings": [
      {
        "sourceFieldCode": "CUSTOMER_NAME",
        "targetFieldCode": "PARTY_NAME"
      },
      {
        "sourceFieldCode": "ORDER_DATE",
        "targetFieldCode": "CONTRACT_DATE"
      }
    ],
    "gridMapping": {
      "ITEMS": "CONTRACT_ITEMS"
    },
    "copyCalculatedFields": true,
    "copyGridRows": true,
    "startWorkflow": true,
    "linkDocuments": true
  },
  "sourceSubmissionId": 1
}
```

### مثال 3: استخدام في Form Rule

```typescript
const rule: FormRule = {
  ruleName: "Copy Order to Contract",
  ruleType: "Condition",
  condition: {
    field: "ORDER_STATUS",
    operator: "Equals",
    value: "APPROVED",
    valueType: "constant"
  },
  actions: [
    {
      type: "CopyToDocument",
      fieldCode: "", // Empty for CopyToDocument
      copyToDocumentConfig: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMappings: [
          {
            sourceFieldCode: "CUSTOMER_NAME",
            targetFieldCode: "PARTY_NAME"
          },
          {
            sourceFieldCode: "ORDER_DATE",
            targetFieldCode: "CONTRACT_DATE"
          }
        ],
        copyCalculatedFields: true,
        copyGridRows: true,
        startWorkflow: true,
        linkDocuments: true // Link source/target via ParentDocumentId
      }
    }
  ],
  isActive: true,
  executionOrder: 1
};
```

---

## 7. مرجع API (API Reference)

## Purpose
CopyToDocument is a built-in action that copies data from a source form submission
to a target document. It can create a new target document or update an existing
one, based on configuration.

## API Endpoints

### Execute CopyToDocument
`POST /api/CopyToDocument/execute`

Executes the action manually (same path used by the Actions Engine).

### Audit Records
- `GET /api/CopyToDocument/audit`
- `GET /api/CopyToDocument/audit/{id}`
- `GET /api/CopyToDocument/audit/submission/{submissionId}`
- `GET /api/CopyToDocument/audit/target/{targetDocumentId}`

## Request DTOs

### ExecuteCopyToDocumentRequestDto
```
{
  "config": { ...CopyToDocumentActionDto... },
  "sourceSubmissionId": 115,
  "actionId": null,
  "ruleId": null
}
```

### CopyToDocumentActionDto
```
{
  "sourceFormId": null,
  "sourceSubmissionId": null,
  "targetDocumentTypeId": 1,
  "targetFormId": 1,
  "createNewDocument": true,
  "targetDocumentId": null,
  "fieldMapping": { "TOTAL_AMOUNT": "CONTRACT_VALUE" },
  "gridMapping": { "ITEMS": "CONTRACT_ITEMS" },
  "copyCalculatedFields": true,
  "copyGridRows": true,
  "startWorkflow": false,
  "linkDocuments": true,
  "copyMetadata": false,
  "metadataFields": []
}
```

## Response DTO

### CopyToDocumentResultDto
```
{
  "success": true,
  "targetDocumentId": 116,
  "targetDocumentNumber": "ser-000113",
  "errorMessage": null,
  "fieldsCopied": 1,
  "gridRowsCopied": 1,
  "actionId": null,
  "sourceSubmissionId": 115
}
```

## JSON Examples

### Create New Document (fields + grid)
```
{
  "config": {
    "targetDocumentTypeId": 1,
    "targetFormId": 1,
    "createNewDocument": true,
    "targetDocumentId": null,
    "fieldMapping": { "F": "F" },
    "gridMapping": { "GRID1": "GRID1" },
    "copyCalculatedFields": true,
    "copyGridRows": true,
    "startWorkflow": false,
    "linkDocuments": true,
    "copyMetadata": false,
    "metadataFields": []
  },
  "sourceSubmissionId": 115
}
```

### Update Existing Document
```
{
  "config": {
    "targetDocumentTypeId": 1,
    "targetFormId": 1,
    "createNewDocument": false,
    "targetDocumentId": 116,
    "fieldMapping": { "F": "F" },
    "gridMapping": { "GRID1": "GRID1" },
    "copyCalculatedFields": true,
    "copyGridRows": true,
    "startWorkflow": false,
    "linkDocuments": false,
    "copyMetadata": false,
    "metadataFields": []
  },
  "sourceSubmissionId": 115
}
```

### Start Workflow on Target
```
{
  "config": {
    "targetDocumentTypeId": 1,
    "targetFormId": 1,
    "createNewDocument": false,
    "targetDocumentId": 116,
    "fieldMapping": {},
    "gridMapping": {},
    "copyCalculatedFields": true,
    "copyGridRows": false,
    "startWorkflow": true,
    "linkDocuments": false,
    "copyMetadata": false,
    "metadataFields": []
  },
  "sourceSubmissionId": 115
}
```

### Copy Metadata Only
```
{
  "config": {
    "targetDocumentTypeId": 1,
    "targetFormId": 1,
    "createNewDocument": false,
    "targetDocumentId": 116,
    "fieldMapping": {},
    "gridMapping": {},
    "copyCalculatedFields": true,
    "copyGridRows": false,
    "startWorkflow": false,
    "linkDocuments": false,
    "copyMetadata": true,
    "metadataFields": ["SubmittedDate", "Status"]
  },
  "sourceSubmissionId": 115
}
```

## Field and Grid Mapping

### Field Mapping
- Maps source FieldCode to target FieldCode.
- Uses `FieldCode` (not FieldId) to remain stable across versions.
- Example: `TOTAL_AMOUNT -> CONTRACT_VALUE`.

### Grid Mapping
- Maps source GridCode to target GridCode.
- Rows are copied; cells are mapped by ColumnCode.

## Options Explained

- `createNewDocument`: If true, create a new target submission. If false, update an existing one.
- `targetDocumentId`: Required when `createNewDocument` is false.
- `copyCalculatedFields`: If false, calculated fields are skipped.
- `copyGridRows`: If true, grid rows are copied using GridCode mapping.
- `startWorkflow`: If true, submits the target document after copy.
- `linkDocuments`: Links target to source using ParentDocumentId if it exists.
- `copyMetadata`: Copies selected metadata fields (e.g., SubmittedDate, Status).
- `metadataFields`: List of metadata keys to copy.

## Execution Flow
1) Load source submission.
2) Validate target form and document type.
3) Create or load target document.
4) Copy field values using FieldCode mapping.
5) Copy grid rows using GridCode and ColumnCode mapping.
6) Copy metadata if requested.
7) Save changes and log audit.
8) Start workflow if requested (after transaction commit).

## Error Handling
- All failures return a 500 with a meaningful message in `errorMessage`.
- No partial data is persisted when failures occur mid-execution.
- Audit entries are recorded for both success and failure.

## Notes
- Ensure Document Series is configured for the target document type and project.
- For `startWorkflow` to work, approval workflow must exist for the target.
- Linking requires `ParentDocumentId` column on `FORM_SUBMISSIONS`.

## 8. الميزات

### ✅ الميزات الرئيسية

1. **نسخ Fields و Grids و Metadata**
   - نسخ الحقول العادية
   - نسخ الحقول المحسوبة (اختياري)
   - نسخ صفوف الجداول (Grids)
   - نسخ البيانات الوصفية (Metadata)

2. **Field Mapping و Grid Mapping**
   - تعيين الحقول من المصدر إلى الهدف
   - دعم تعيين الجداول

3. **Audit Logging**
   - تسجيل كل تنفيذ في جدول Audit
   - تتبع SourceSubmissionId, TargetDocumentId
   - حفظ رسائل الأخطاء

4. **Retry Logic**
   - تجنب duplicate document numbers
   - إعادة المحاولة عند فشل توليد رقم المستند

5. **Error Handling**
   - معالجة الأخطاء مع رسائل واضحة
   - تسجيل الأخطاء في Audit Table

6. **Logging**
   - تسجيل تفاصيل التنفيذ للـ debugging
   - تتبع الخطوات في كل عملية

7. **Validation**
   - التحقق من صحة Request Data
   - التحقق من وجود Target Form و Document Type

8. **Pagination**
   - دعم Pagination للـ Audit Records
   - Filters للبحث في Audit Records

---

## 9. الخلاصة

تم تنفيذ نظام CopyToDocument بالكامل مع:

✅ **Services للتنفيذ**
- `ICopyToDocumentService` & `CopyToDocumentService`
- `CopyToDocumentActionExecutorService`

✅ **API Controller**
- تنفيذ يدوي
- استعلامات Audit Records

✅ **Audit Table**
- جدول `COPY_TO_DOCUMENT_AUDIT` للتتبع

✅ **Integration**
- مع Rules و Triggers
- مع Document Series
- مع Workflow

✅ **Error Handling و Logging**
- معالجة الأخطاء
- تسجيل التفاصيل

✅ **Validation و Security**
- التحقق من البيانات
- الأمان

**النظام جاهز للاستخدام.**

---

## 10. ملاحظات إضافية

### أفضل الممارسات

1. **استخدام Field Mapping**
   - استخدم Field Mapping لتحديد الحقول المراد نسخها
   - تأكد من تطابق أنواع البيانات بين الحقول

2. **نسخ الحقول المحسوبة**
   - استخدم `copyCalculatedFields: true` فقط عند الحاجة
   - قد تحتاج إلى إعادة حساب الحقول في المستند الهدف

3. **بدء Workflow**
   - استخدم `startWorkflow: true` لبدء سير عمل الموافقة تلقائياً
   - تأكد من وجود Workflow للمستند الهدف

4. **ربط المستندات**
   - استخدم `linkDocuments` لربط المستندات
   - يساعد في تتبع العلاقات بين المستندات

5. **Audit Logging**
   - راجع Audit Records بانتظام
   - استخدم Filters للبحث في Audit Records

### الأخطاء الشائعة

1. **عدم وجود Target Form**
   - تأكد من وجود Target Form و Document Type
   - تحقق من أن Form نشط ومُنشَر

2. **عدم تطابق أنواع البيانات**
   - تأكد من تطابق أنواع البيانات بين الحقول
   - راجع Field Mapping

3. **فشل توليد Document Number**
   - تحقق من وجود Document Series
   - راجع Retry Logic

4. **فشل بدء Workflow**
   - تحقق من وجود Workflow للمستند الهدف
   - راجع إعدادات Workflow

---

## 11. المراجع

- [Form Rules Documentation](./form-rules.md)
- [Document Types Documentation](./document-types.md)
- [Workflow Documentation](./workflow.md)
- [API Documentation](./api-documentation.md)

---

**آخر تحديث:** 2024-02-03
**الإصدار:** 1.0.0

