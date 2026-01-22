# بيانات اختبار جاهزة - Quick Copy

## 1. بيانات اختبار للجدول FIELD_TYPES

### في SQL Server Management Studio:
```sql
-- نفذ هذا الكود أولاً لإدراج بيانات الاختبار
-- انظر ملف: TestData-FieldTypes.sql
```

---

## 2. أمثلة جاهزة للنسخ في التطبيق

### مثال 1: Get Field Types (Options)

**في Form:**
```
Title: Get Field Types
Database: FormBuilder
Schema: dbo
Procedure Name: GetFieldTypes
Usage Type: Options
```

**Procedure Code:**
```sql
CREATE OR ALTER PROCEDURE [dbo].[GetFieldTypes]
    @IsActive BIT = 1,
    @HasOptions BIT = NULL,
    @DataType NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        TypeName,
        DataType,
        MaxLength,
        HasOptions,
        AllowMultiple,
        IsActive,
        CreatedDate,
        UpdatedDate
    FROM 
        [dbo].[FIELD_TYPES]
    WHERE 
        IsDeleted = 0
        AND (@IsActive IS NULL OR IsActive = @IsActive)
        AND (@HasOptions IS NULL OR HasOptions = @HasOptions)
        AND (@DataType IS NULL OR DataType = @DataType)
    ORDER BY 
        TypeName ASC;
END
```

**Parameter Mapping:** (اتركه فارغ أو `{}`)

---

### مثال 2: Validate Field Type (Rule)

**في Form:**
```
Title: Validate Field Type
Database: FormBuilder
Schema: dbo
Procedure Name: ValidateFieldType
Usage Type: Rule
```

**Procedure Code:**
```sql
CREATE OR ALTER PROCEDURE [dbo].[ValidateFieldType]
    @FieldTypeId INT,
    @FieldTypeName NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsValid BIT = 0;
    DECLARE @ResultMessage NVARCHAR(200) = '';

    IF EXISTS (
        SELECT 1 
        FROM [dbo].[FIELD_TYPES]
        WHERE Id = @FieldTypeId
            AND IsDeleted = 0
            AND IsActive = 1
            AND (@FieldTypeName IS NULL OR TypeName = @FieldTypeName)
    )
    BEGIN
        SET @IsValid = 1;
        SET @ResultMessage = 'Field type is valid';
    END
    ELSE
    BEGIN
        SET @IsValid = 0;
        SET @ResultMessage = 'Field type not found or inactive';
    END

    SELECT 
        @IsValid AS IsValid,
        @ResultMessage AS ResultMessage;
END
```

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

## 3. اختبار SP في SQL Server

### اختبار GetFieldTypes:
```sql
-- جميع الأنواع النشطة
EXEC [dbo].[GetFieldTypes] @IsActive = 1

-- الأنواع مع Options فقط
EXEC [dbo].[GetFieldTypes] @IsActive = 1, @HasOptions = 1

-- الأنواع من نوع string فقط
EXEC [dbo].[GetFieldTypes] @IsActive = 1, @DataType = 'string'
```

### اختبار ValidateFieldType:
```sql
-- التحقق من ID 1
EXEC [dbo].[ValidateFieldType] @FieldTypeId = 1

-- التحقق من ID و Name
EXEC [dbo].[ValidateFieldType] @FieldTypeId = 1, @FieldTypeName = 'Text'
```

---

## 4. استخدام SP في Form Field

### في Form Field:
1. **Data Source Type**: Stored Procedure
2. **Stored Procedure**: GetFieldTypes
3. **Value Column**: `Id`
4. **Text Column**: `TypeName`
5. **Parameter Mapping**: (اتركه فارغ)

---

## 5. استخدام SP في Form Rule

### في Form Rule:
1. **Rule Type**: StoredProcedure
2. **Stored Procedure**: ValidateFieldType
3. **Parameter Mapping**:
   ```json
   {
     "@FieldTypeId": "fieldTypeId",
     "@FieldTypeName": "fieldTypeName"
   }
   ```
4. **Result Mapping**:
   ```json
   {
     "resultColumn": "IsValid",
     "trueValue": 1,
     "falseValue": 0
   }
   ```

---

## ملاحظات:
- ✅ نفذ `TestData-FieldTypes.sql` أولاً في SQL Server
- ✅ ثم أنشئ SP في قاعدة البيانات
- ✅ ثم أضف SP في التطبيق Angular
- ✅ اختبر SP في SQL Server قبل الاستخدام

