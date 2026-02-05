# سكريبتات إدارة الصلاحيات

## 📋 نظرة عامة

هذه السكريبتات تستخدم لربط الصلاحيات (`Tbl_UserPermission`) بمجموعات المستخدمين (`Tbl_UserGroup_Permission`) حتى تظهر في تطبيق Angular.

## 📁 الملفات المتاحة

### 1. `AddAllPermissions.sql`
- **الوظيفة**: إضافة جميع الصلاحيات إلى `Tbl_UserPermission`
- **الاستخدام**: تشغيله مرة واحدة عند إضافة صلاحيات جديدة
- **ملاحظة**: هذا لا يربط الصلاحيات بمجموعات المستخدمين

### 2. `DeleteAllPermissions.sql`
- **الوظيفة**: حذف جميع الصلاحيات من `Tbl_UserPermission` و `Tbl_UserGroup_Permission`
- **الاستخدام**: عند إعادة تعيين الصلاحيات من الصفر

### 3. `ResetAllPermissions.sql`
- **الوظيفة**: حذف ثم إضافة جميع الصلاحيات (حذف + إضافة)
- **الاستخدام**: لإعادة تعيين كامل للصلاحيات

### 4. `AssignPermissionsToUserGroup_Template.sql`
- **الوظيفة**: ربط جميع الصلاحيات بمجموعة مستخدم واحدة
- **الاستخدام**: 
  1. افتح الملف
  2. غيّر القيم في قسم "⚙️ الإعدادات"
  3. شغّل السكريبت

### 5. `AssignPermissionsToAllUserGroups_Template.sql`
- **الوظيفة**: ربط جميع الصلاحيات بجميع مجموعات المستخدمين
- **الاستخدام**: 
  1. افتح الملف
  2. غيّر القيم في قسم "⚙️ الإعدادات" (اختياري)
  3. شغّل السكريبت

## 🔧 كيفية الاستخدام

### السيناريو 1: إضافة صلاحيات جديدة لمجموعة واحدة

```sql
-- استخدم AssignPermissionsToUserGroup_Template.sql
-- غيّر @UserGroupId = 1 إلى ID المجموعة المطلوبة
-- شغّل السكريبت
```

### السيناريو 2: إضافة صلاحيات لجميع المجموعات

```sql
-- استخدم AssignPermissionsToAllUserGroups_Template.sql
-- شغّل السكريبت مباشرة (أو غيّر @LegalEntityId إذا لزم الأمر)
```

### السيناريو 3: إعادة تعيين كامل

```sql
-- 1. شغّل DeleteAllPermissions.sql (حذف كل شيء)
-- 2. شغّل AddAllPermissions.sql (إضافة الصلاحيات)
-- 3. شغّل AssignPermissionsToAllUserGroups_Template.sql (ربطها بالمجموعات)
```

## ⚙️ المعاملات القابلة للتعديل

### في `AssignPermissionsToUserGroup_Template.sql`:
- `@UserGroupId`: ID مجموعة المستخدم المطلوبة
- `@LegalEntityId`: ID الكيان القانوني (أو NULL لجميع الكيانات)
- `@CreatedBy`: ID المستخدم الذي يقوم بالعملية

### في `AssignPermissionsToAllUserGroups_Template.sql`:
- `@LegalEntityId`: ID الكيان القانوني (أو NULL لجميع الكيانات)
- `@CreatedBy`: ID المستخدم الذي يقوم بالعملية

## 📊 الجداول المستخدمة

1. **Tbl_UserPermission**: جدول الصلاحيات المتاحة (القاموس)
2. **Tbl_UserGroup**: جدول مجموعات المستخدمين
3. **Tbl_UserGroup_Permission**: جدول ربط الصلاحيات بمجموعات المستخدمين (ما يقرأه Angular)

## ⚠️ ملاحظات مهمة

1. بعد تشغيل أي سكريبت ربط:
   - سجّل الخروج من Angular
   - سجّل الدخول مرة أخرى
   - أو امسح localStorage يدوياً

2. السكريبتات تتجنب التكرار تلقائياً (لا تضيف صلاحية موجودة)

3. جميع السكريبتات تعرض تقارير مفصلة بعد التنفيذ

## 🔍 التحقق من النتائج

بعد تشغيل السكريبت، يمكنك التحقق من النتائج:

```sql
-- عرض عدد الصلاحيات لكل مجموعة
SELECT 
    ug.Id AS UserGroupId,
    ug.Name AS UserGroupName,
    COUNT(ugp.UserPermissionName) AS PermissionCount
FROM Tbl_UserGroup ug
LEFT JOIN Tbl_UserGroup_Permission ugp ON ug.Id = ugp.IdUserGroup
GROUP BY ug.Id, ug.Name
ORDER BY ug.Id;
```

## 📝 مثال على الاستخدام

```sql
-- مثال: ربط الصلاحيات بمجموعة "Administration" (ID = 1)
-- في AssignPermissionsToUserGroup_Template.sql:
DECLARE @UserGroupId INT = 1;        -- Administration
DECLARE @LegalEntityId INT = 1;      -- Legal Entity 1
DECLARE @CreatedBy INT = 1;          -- Admin user
-- ثم شغّل السكريبت
```

## 🆘 استكشاف الأخطاء

### المشكلة: الصلاحيات لا تظهر في Angular
**الحل**: 
1. تأكد من ربط الصلاحيات في `Tbl_UserGroup_Permission`
2. سجّل الخروج والدخول مرة أخرى
3. امسح localStorage: `localStorage.clear()`

### المشكلة: خطأ "Variable already declared"
**الحل**: شغّل كل سكريبت على حدة، أو أضف `GO` بين السكريبتات

### المشكلة: خطأ "Subqueries not allowed"
**الحل**: استخدم المتغيرات بدلاً من subqueries في PRINT statements

