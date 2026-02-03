# شرح آلية عمل Mapping في CopyToDocument Action

## نظرة عامة

الـ Mapping في `CopyToDocument` هو عملية تحديد كيفية نقل البيانات من المستند المصدر (Source Document) إلى المستند الهدف (Target Document). يتم ذلك باستخدام **FieldCode** بدلاً من FieldId لضمان الاستقرار عبر إصدارات النماذج المختلفة.

---

## 1. أنواع الـ Mapping

### 1.1 Field Mapping (تعيين الحقول)
**الغرض**: نسخ قيم الحقول من النموذج المصدر إلى النموذج الهدف.

**كيف يعمل**:
- المستخدم يحدد **Source Field Code** (من النموذج الحالي)
- المستخدم يحدد **Target Field Code** (من النموذج الهدف)
- النظام يبحث عن قيمة الحقل المصدر في الـ Submission ويضعها في الحقل الهدف

**مثال**:
```
Source Field Code: TOTAL_AMOUNT
Target Field Code: CONTRACT_VALUE
```
عند التنفيذ: إذا كان `TOTAL_AMOUNT = 5000` في الـ Source، سيتم نسخ `5000` إلى `CONTRACT_VALUE` في الـ Target.

---

### 1.2 Grid Mapping (تعيين الجداول)
**الغرض**: نسخ صفوف الجداول (Grid Rows) من النموذج المصدر إلى النموذج الهدف.

**كيف يعمل**:
- المستخدم يحدد **Source Grid Code** (اسم الجدول في النموذج المصدر)
- المستخدم يحدد **Target Grid Code** (اسم الجدول في النموذج الهدف)
- النظام ينسخ جميع الصفوف من الجدول المصدر إلى الجدول الهدف

**مثال**:
```
Source Grid Code: ORDER_ITEMS
Target Grid Code: CONTRACT_ITEMS
```
عند التنفيذ: جميع صفوف `ORDER_ITEMS` سيتم نسخها إلى `CONTRACT_ITEMS`.

---

### 1.3 Metadata Fields (حقول البيانات الوصفية)
**الغرض**: نسخ معلومات إضافية مثل تاريخ الإنشاء، رقم المستند، إلخ.

**كيف يعمل**:
- المستخدم يحدد قائمة بأسماء حقول الـ Metadata المراد نسخها
- النظام يبحث عن هذه الحقول في الـ Source Submission وينسخها إلى الـ Target Document

**مثال**:
```
Metadata Fields: ["CREATED_BY", "CREATED_DATE", "DOCUMENT_NUMBER"]
```

---

## 2. التدفق الكامل للـ Mapping

### 2.1 مرحلة التكوين (Configuration Phase)

#### في الـ UI (`form-rules-list.component.html`):

1. **اختيار Target Document Type و Target Form**:
   ```html
   <select [formControl]="action.get('copyToDocumentConfig')?.get('targetDocumentTypeId')">
     <option *ngFor="let docType of documentTypes" [value]="docType.id">
       {{ docType.name }}
     </option>
   </select>
   ```

2. **إضافة Field Mappings**:
   ```html
   <div formArrayName="fieldMappings">
     <div *ngFor="let mapping of getFieldMappingsArray(action).controls">
       <select formControlName="sourceFieldCode">
         <!-- Source fields from current form -->
       </select>
       <select formControlName="targetFieldCode">
         <!-- Target fields from target form -->
       </select>
     </div>
   </div>
   ```

3. **إضافة Grid Mappings**:
   ```html
   <input type="text" placeholder="Source Grid Code">
   <input type="text" placeholder="Target Grid Code">
   ```

#### في الـ Component (`form-rules-list.component.ts`):

**عند الحفظ (`saveRule()`)**:
```typescript
// تحويل fieldMappings من Array إلى التنسيق المطلوب
const fieldMappings = (a.copyToDocumentConfig.fieldMappings || []).map((fm: any) => ({
  sourceFieldCode: fm.sourceFieldCode?.trim() || '',
  targetFieldCode: fm.targetFieldCode?.trim() || ''
})).filter((fm: any) => fm.sourceFieldCode && fm.targetFieldCode);

// تحويل gridMapping من Object
const gridMapping = a.copyToDocumentConfig.gridMapping && 
  Object.keys(a.copyToDocumentConfig.gridMapping).length > 0 
  ? a.copyToDocumentConfig.gridMapping 
  : undefined;

// تحويل metadataFields من Array
const metadataFields = (a.copyToDocumentConfig.metadataFields || [])
  .map((mf: string) => mf?.trim())
  .filter((mf: string) => mf);
```

**النتيجة**: يتم حفظ الـ Configuration في قاعدة البيانات كجزء من الـ Rule.

---

### 2.2 مرحلة التنفيذ (Execution Phase)

#### عند حدوث Event (مثل OnFormSubmitted):

1. **CopyToDocumentActionExecutorService** يستدعي:
   ```typescript
   executeCopyToDocumentActionsForEvent(
     eventType: 'OnFormSubmitted',
     submission: FormSubmissionDto,
     formId: number
   )
   ```

2. **جلب الـ Rules**:
   ```typescript
   this.formRulesService.getRulesByFormId(formId).pipe(
     map(rules => rules.filter(rule => 
       rule.isActive && 
       rule.evaluationPhase === eventType
     ))
   )
   ```

3. **استخراج CopyToDocument Actions**:
   ```typescript
   rule.actions.forEach(action => {
     if (action.type === 'CopyToDocument' && action.copyToDocumentConfig) {
       actionsToExecute.push({ action, rule });
     }
   });
   ```

4. **تحويل الـ Configuration**:
   ```typescript
   // تحويل fieldMappings من Array إلى Object (إذا لزم الأمر)
   let fieldMapping: { [key: string]: string } | undefined;
   if (config.fieldMappings && config.fieldMappings.length > 0) {
     fieldMapping = {};
     config.fieldMappings.forEach(mapping => {
       if (mapping.sourceFieldCode && mapping.targetFieldCode) {
         fieldMapping![mapping.sourceFieldCode] = mapping.targetFieldCode;
       }
     });
   }
   ```

5. **إرسال Request إلى API**:
   ```typescript
   const request: CopyToDocumentRequestDto = {
     config: {
       targetDocumentTypeId: config.targetDocumentTypeId,
       targetFormId: config.targetFormId,
       createNewDocument: config.createNewDocument,
       fieldMapping: fieldMapping,  // Object format: { "SOURCE": "TARGET" }
       gridMapping: config.gridMapping,  // Object format: { "SOURCE_GRID": "TARGET_GRID" }
       copyCalculatedFields: config.copyCalculatedFields,
       copyGridRows: config.copyGridRows,
       startWorkflow: config.startWorkflow,
       linkDocuments: config.linkDocuments,
       copyMetadata: config.copyMetadata,
       metadataFields: config.metadataFields  // Array: ["FIELD1", "FIELD2"]
     },
     sourceSubmissionId: submission.id,
     actionId: action.id,
     ruleId: rule.id
   };
   
   this.copyToDocumentService.executeCopyToDocument(request)
   ```

---

### 2.3 في الـ Backend (API)

**ملاحظة**: الـ Backend API هو المسؤول عن التنفيذ الفعلي للـ Mapping.

**التدفق المتوقع في الـ Backend**:

1. **استقبال Request**:
   ```json
   {
     "sourceSubmissionId": 123,
     "config": {
       "targetDocumentTypeId": 2,
       "targetFormId": 5,
       "createNewDocument": true,
       "fieldMapping": {
         "TOTAL_AMOUNT": "CONTRACT_VALUE",
         "CUSTOMER_NAME": "PARTY_NAME"
       },
       "gridMapping": {
         "ORDER_ITEMS": "CONTRACT_ITEMS"
       },
       "copyCalculatedFields": true,
       "copyGridRows": true,
       "metadataFields": ["CREATED_BY", "CREATED_DATE"]
     }
   }
   ```

2. **جلب Source Submission**:
   - البحث عن الـ Submission بالـ ID
   - استخراج قيم الحقول والجداول

3. **إنشاء/تحديث Target Document**:
   - إنشاء مستند جديد (إذا `createNewDocument = true`)
   - أو البحث عن مستند موجود وتحديثه

4. **تنفيذ Field Mapping**:
   ```csharp
   foreach (var mapping in config.fieldMapping)
   {
       // البحث عن قيمة الحقل المصدر
       var sourceValue = GetFieldValue(sourceSubmission, mapping.Key);
       
       // وضع القيمة في الحقل الهدف
       SetFieldValue(targetDocument, mapping.Value, sourceValue);
   }
   ```

5. **تنفيذ Grid Mapping**:
   ```csharp
   foreach (var gridMapping in config.gridMapping)
   {
       // جلب صفوف الجدول المصدر
       var sourceRows = GetGridRows(sourceSubmission, gridMapping.Key);
       
       // نسخ الصفوف إلى الجدول الهدف
       CopyGridRows(targetDocument, gridMapping.Value, sourceRows);
   }
   ```

6. **نسخ Metadata**:
   ```csharp
   if (config.copyMetadata && config.metadataFields != null)
   {
       foreach (var metadataField in config.metadataFields)
       {
           var metadataValue = GetMetadataValue(sourceSubmission, metadataField);
           SetMetadataValue(targetDocument, metadataField, metadataValue);
       }
   }
   ```

7. **نسخ Calculated Fields** (إذا كان `copyCalculatedFields = true`):
   - نسخ جميع الحقول المحسوبة من Source إلى Target

8. **بدء Workflow** (إذا كان `startWorkflow = true`):
   - بدء Workflow للمستند الهدف

9. **ربط المستندات** (إذا كان `linkDocuments = true`):
   - ربط Source Document بـ Target Document كـ Parent-Child

10. **تسجيل Audit**:
    - حفظ سجل في جدول Audit يتضمن:
      - SourceSubmissionId
      - TargetDocumentId
      - ActionId
      - RuleId
      - Success/Failure
      - Error Message (إن وجد)
      - عدد الحقول والصفوف المنسوخة

---

## 3. مثال عملي كامل

### السيناريو:
بعد الموافقة على نموذج "طلب شراء" (Purchase Request)، يتم إنشاء مستند "عقد" (Contract) تلقائياً.

### التكوين:

**Rule Configuration**:
- **Rule Name**: "Create Contract After Approval"
- **Evaluation Phase**: "OnApprovalCompleted"
- **Condition**: (إذا لزم الأمر)
- **Action**: CopyToDocument

**CopyToDocument Configuration**:
```typescript
{
  targetDocumentTypeId: 2,  // Contract Document Type
  targetFormId: 5,          // Contract Form
  createNewDocument: true,
  fieldMappings: [
    { sourceFieldCode: "TOTAL_AMOUNT", targetFieldCode: "CONTRACT_VALUE" },
    { sourceFieldCode: "SUPPLIER_NAME", targetFieldCode: "PARTY_NAME" },
    { sourceFieldCode: "REQUEST_DATE", targetFieldCode: "CONTRACT_DATE" }
  ],
  gridMapping: {
    "REQUEST_ITEMS": "CONTRACT_ITEMS"
  },
  copyCalculatedFields: true,
  copyGridRows: true,
  startWorkflow: true,
  linkDocuments: true,
  copyMetadata: true,
  metadataFields: ["CREATED_BY", "APPROVED_BY"]
}
```

### التنفيذ:

1. **حدث**: المستخدم يوافق على "طلب شراء" (Submission ID: 100)

2. **Trigger**: `FormSubmissionTriggersService.onApprovalCompleted()` يتم استدعاؤه

3. **Executor**: `CopyToDocumentActionExecutorService` يجد الـ Rule ويستخرج الـ Action

4. **API Call**: يتم إرسال Request إلى `/api/CopyToDocument/execute`

5. **Backend Processing**:
   - جلب Submission ID 100
   - استخراج القيم:
     - `TOTAL_AMOUNT = 50000`
     - `SUPPLIER_NAME = "ABC Company"`
     - `REQUEST_DATE = "2024-01-15"`
   - إنشاء مستند Contract جديد
   - نسخ القيم:
     - `CONTRACT_VALUE = 50000`
     - `PARTY_NAME = "ABC Company"`
     - `CONTRACT_DATE = "2024-01-15"`
   - نسخ صفوف الجدول من `REQUEST_ITEMS` إلى `CONTRACT_ITEMS`
   - بدء Workflow للعقد
   - ربط "طلب الشراء" بالعقد كـ Parent

6. **النتيجة**:
   ```typescript
   {
     success: true,
     targetDocumentId: 201,
     targetDocumentNumber: "CONTRACT-2024-001",
     fieldsCopied: 3,
     gridRowsCopied: 5
   }
   ```

---

## 4. نقاط مهمة

### 4.1 استخدام FieldCode بدلاً من FieldId
- **السبب**: FieldId قد يتغير عند تحديث النموذج
- **FieldCode**: ثابت ولا يتغير، مما يضمن استمرارية الـ Mapping

### 4.2 دعم تنسيقين للـ Field Mapping
- **Array Format**: `[{ sourceFieldCode, targetFieldCode }]` - للـ UI والتخزين
- **Object Format**: `{ "SOURCE": "TARGET" }` - للـ API (أسهل في المعالجة)

### 4.3 Error Handling
- إذا فشل الـ Mapping لحقل معين، يتم تسجيل الخطأ والمتابعة مع الحقول الأخرى
- يتم تسجيل جميع الأخطاء في Audit Log

### 4.4 Validation
- التحقق من وجود Source Field Code في النموذج المصدر
- التحقق من وجود Target Field Code في النموذج الهدف
- التحقق من توافق أنواع البيانات (Data Types)

---

## 5. الملفات ذات الصلة

### Frontend:
- `form-rules-list.component.ts` - تكوين الـ Mapping في الـ UI
- `form-rules-list.component.html` - واجهة المستخدم للـ Mapping
- `copy-to-document-action-executor.service.ts` - تنفيذ الـ Action
- `copy-to-document.service.ts` - التواصل مع الـ API
- `form-builder-dto.model.ts` - تعريف الـ Interfaces

### Backend (متوقع):
- `CopyToDocumentController.cs` - API Endpoint
- `CopyToDocumentService.cs` - منطق التنفيذ
- `CopyToDocumentRepository.cs` - الوصول إلى قاعدة البيانات
- `CopyToDocumentAudit` - جدول Audit

---

## 6. الخلاصة

الـ Mapping في `CopyToDocument` يعمل على ثلاث مستويات:

1. **التكوين**: المستخدم يحدد الـ Mappings في واجهة Form Rules
2. **التحويل**: النظام يحول الـ Mappings من تنسيق Array إلى Object
3. **التنفيذ**: الـ Backend ينفذ الـ Mapping الفعلي بنسخ البيانات من Source إلى Target

النظام يدعم:
- ✅ Field Mapping (حقول بسيطة)
- ✅ Grid Mapping (جداول)
- ✅ Calculated Fields (حقول محسوبة)
- ✅ Metadata Fields (بيانات وصفية)
- ✅ Workflow Integration
- ✅ Document Linking
- ✅ Audit Logging

