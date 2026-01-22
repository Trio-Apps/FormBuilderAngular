# Stored Procedure Examples for Field Types

هذا المجلد يحتوي على أمثلة لـ Stored Procedures للتعامل مع جدول FIELD_TYPES.

## Stored Procedures المتوفرة:

### 1. GetFieldTypes
**الوصف**: الحصول على جميع أنواع الحقول النشطة  
**Usage Type**: Options  
**المعاملات**:
- `@IsActive BIT = 1` - للحصول على الأنواع النشطة فقط
- `@HasOptions BIT = NULL` - للفلترة حسب وجود options
- `@DataType NVARCHAR(50) = NULL` - للفلترة حسب نوع البيانات

**مثال الاستخدام**:
```sql
EXEC [dbo].[GetFieldTypes] @IsActive = 1, @HasOptions = 1
```

---

### 2. GetFieldTypesWithOptions
**الوصف**: الحصول على أنواع الحقول التي تدعم options فقط (Dropdown, Radio, Checkbox)  
**Usage Type**: Options  
**المعاملات**: لا يوجد

**مثال الاستخدام**:
```sql
EXEC [dbo].[GetFieldTypesWithOptions]
```

---

### 3. ValidateFieldType
**الوصف**: التحقق من صحة نوع الحقل  
**Usage Type**: Rule  
**المعاملات**:
- `@FieldTypeId INT` - معرف نوع الحقل
- `@FieldTypeName NVARCHAR(100) = NULL` - اسم نوع الحقل (اختياري)

**Returns**:
- `IsValid BIT` - 1 إذا كان صحيح، 0 إذا كان غير صحيح
- `ResultMessage NVARCHAR(200)` - رسالة النتيجة

**مثال الاستخدام**:
```sql
EXEC [dbo].[ValidateFieldType] @FieldTypeId = 1, @FieldTypeName = 'Text'
```

---

### 4. GetFieldTypeById
**الوصف**: الحصول على نوع حقل محدد بالمعرف  
**Usage Type**: Options  
**المعاملات**:
- `@FieldTypeId INT` - معرف نوع الحقل

**مثال الاستخدام**:
```sql
EXEC [dbo].[GetFieldTypeById] @FieldTypeId = 1
```

---

## كيفية الاستخدام في Form Builder:

### للاستخدام كـ Options:
1. اذهب إلى **Form Builder → Stored Procedures**
2. اضغط **Add Stored Procedure**
3. املأ البيانات:
   - **Title**: Get Field Types
   - **Database**: FormBuilder
   - **Schema**: dbo
   - **Procedure Name**: GetFieldTypes
   - **Procedure Code**: انسخ الكود من الملف
   - **Usage Type**: Options
4. احفظ

### للاستخدام كـ Rule:
1. نفس الخطوات السابقة
2. **Usage Type**: Rule
3. في **Default Parameter Mapping**:
   ```json
   {
     "@FieldTypeId": "fieldTypeId",
     "@FieldTypeName": "fieldTypeName"
   }
   ```
4. في **Default Result Mapping**:
   ```json
   {
     "resultColumn": "IsValid",
     "trueValue": 1,
     "falseValue": 0
   }
   ```

---

## ملاحظات:
- تأكد من أن جدول `FIELD_TYPES` موجود في قاعدة البيانات
- تأكد من الصلاحيات على قاعدة البيانات
- اختبر الـ Stored Procedure في SQL Server Management Studio قبل الاستخدام

