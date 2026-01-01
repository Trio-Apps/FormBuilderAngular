# Debug: ExpressionText Not Showing in Edit Modal

## المشكلة
المعادلة (`expressionText`) لا تظهر عند فتح حقل Calculated للتعديل في صفحة Fields List.

## خطوات التشخيص

### 1. الوصول إلى صفحة Fields List
- **المسار**: `/form-builder/{formId}/tabs/{tabId}/fields`
- أو من القائمة الجانبية: Form Builder → Forms → اختر Form → اختر Tab → Fields

### 2. فتح Developer Console
- اضغط `F12` لفتح Developer Tools
- اذهب إلى **Console** tab

### 3. فتح حقل Calculated للتعديل
- اضغط **Edit** على أي حقل من نوع Calculated
- راقب الـ console logs

### 4. الـ Console Logs المتوقعة

#### عند تحميل الصفحة:
```
[loadFields] Fields loaded from API: [...]
[loadFields] Calculated fields found: [...]
```

#### عند فتح حقل للتعديل:
```
[openEditFieldModal] Field data: {...}
[openEditFieldModal] Calculation properties: {...}
[openEditFieldModal] Form values after patch: {...}
```

### 5. تحقق من Network Tab

1. افتح **Network** tab في Developer Tools
2. افتح حقل Calculated للتعديل
3. ابحث عن request إلى:
   - `/api/FormFields/tab/{tabId}` (عند تحميل الصفحة)
   - `/api/FormFields/{fieldId}` (عند فتح الحقل للتعديل)
4. افتح الـ **Response** وتحقق من وجود:
   - `expressionText` (camelCase)
   - `ExpressionText` (PascalCase)

## السيناريوهات المحتملة

### السيناريو 1: البيانات موجودة في API لكن لا تظهر في Form
**الأعراض:**
- `expressionText` موجودة في `[loadFields] Calculated fields found:`
- لكنها فارغة في `[openEditFieldModal] Form values after patch:`

**الحل:**
- المشكلة في تحديث الـ form
- الكود الحالي يجب أن يعالج هذا تلقائياً

### السيناريو 2: البيانات غير موجودة في API
**الأعراض:**
- `expressionText` غير موجودة في `[loadFields] Calculated fields found:`
- أو `[loadFields] No calculated fields found in response`

**الحل:**
- المشكلة في الـ **Backend API**
- يجب التأكد من أن الـ API يُرجع `expressionText` في الـ response
- تحقق من أن الأعمدة موجودة في قاعدة البيانات:
  - `ExpressionText`
  - `CalculationMode`
  - `RecalculateOn`
  - `ResultType`

### السيناريو 3: البيانات موجودة لكن بأسماء مختلفة
**الأعراض:**
- البيانات موجودة لكن بأسماء PascalCase (`ExpressionText`) بدلاً من camelCase (`expressionText`)

**الحل:**
- الكود الحالي يعالج هذا تلقائياً
- لكن إذا استمرت المشكلة، تحقق من الـ service

## التحقق من قاعدة البيانات

تأكد من أن الأعمدة التالية موجودة في جدول `FORM_FIELDS`:

```sql
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FORM_FIELDS'
    AND COLUMN_NAME IN ('ExpressionText', 'CalculationMode', 'RecalculateOn', 'ResultType')
ORDER BY COLUMN_NAME;
```

إذا لم تكن موجودة، نفذ السكريبت:
```sql
-- انظر ملف ADD_CALCULATION_COLUMNS.sql
```

## التحقق من الـ Backend API

تأكد من أن الـ Controller يُرجع هذه الخصائص:

```csharp
// في FormFieldsController
[HttpGet("tab/{tabId}")]
public async Task<IActionResult> GetFieldsByTabId(int tabId)
{
    var fields = await _formFieldsService.GetFieldsByTabIdAsync(tabId);
    // تأكد من أن fields تحتوي على ExpressionText
    return Ok(fields);
}
```

## الخطوات التالية

1. افتح صفحة **Fields List** (ليس Form View)
2. افتح Developer Console (F12)
3. افتح حقل Calculated للتعديل
4. أرسل الـ console logs الكاملة
5. أرسل أيضاً الـ Network response من `/api/FormFields/tab/{tabId}`

## ملاحظات

- `form-view.component.ts` هو لعرض النموذج للمستخدمين، وليس لتحرير الحقول
- نحتاج logs من `fields-list.component.ts` عند فتح حقل للتعديل
- تأكد من أنك في صفحة **Fields List** وليس **Form View**


