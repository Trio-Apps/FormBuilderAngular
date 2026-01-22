# دليل سريع: إضافة Stored Procedure للـ Field Types

## الخطوات السريعة:

### 1. افتح التطبيق
- اذهب إلى: **Form Builder → Stored Procedures**
- اضغط: **Add Stored Procedure**

### 2. املأ البيانات الأساسية:

**للحصول على جميع Field Types:**
```
Title: Get Field Types
Database: FormBuilder
Schema: dbo
Procedure Name: GetFieldTypes
Usage Type: Options
```

**Procedure Code:** (انسخ من GetFieldTypes-CopyPaste.txt)

---

**للحصول على Field Types مع Options فقط:**
```
Title: Get Field Types With Options
Database: FormBuilder
Schema: dbo
Procedure Name: GetFieldTypesWithOptions
Usage Type: Options
```

**Procedure Code:** (انسخ من GetFieldTypesWithOptions-CopyPaste.txt)

---

**للتحقق من Field Type (Rule):**
```
Title: Validate Field Type
Database: FormBuilder
Schema: dbo
Procedure Name: ValidateFieldType
Usage Type: Rule
```

**Procedure Code:** (انسخ من ValidateFieldType-CopyPaste.txt)

**Parameter Mapping:**
```json
{
  "@FieldTypeId": "fieldTypeId",
  "@FieldTypeName": "fieldTypeName"
}
```

**Result Mapping:**
```json
{
  "resultColumn": "IsValid",
  "trueValue": 1,
  "falseValue": 0
}
```

---

## ملاحظة مهمة:
⚠️ **يجب تنفيذ الـ SQL في قاعدة البيانات أولاً** قبل استخدام SP في التطبيق!

### كيفية تنفيذ SQL:
1. افتح **SQL Server Management Studio**
2. اتصل بقاعدة البيانات **FormBuilder**
3. انسخ الكود من الملف `.txt`
4. نفذ الكود (F5)
5. ثم أضف SP في التطبيق

---

## بعد إضافة SP في التطبيق:

### للاستخدام في Form Field:
1. اذهب إلى **Form Builder → Forms → [Form] → Fields**
2. أنشئ أو عدّل Field
3. في **Data Source Type**: اختر **Stored Procedure**
4. اختر SP: **GetFieldTypes**
5. حدد:
   - **Value Column**: `Id`
   - **Text Column**: `TypeName`

### للاستخدام في Form Rule:
1. اذهب إلى **Form Builder → Forms → [Form] → Rules**
2. أنشئ Rule جديد
3. **Rule Type**: اختر **StoredProcedure**
4. اختر SP: **ValidateFieldType**
5. املأ Parameter Mapping و Result Mapping

