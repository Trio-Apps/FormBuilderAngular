-- ============================================================
-- حذف صلاحيات Document من مجموعة المستخدمين (UserGroup)
-- ============================================================
-- هذا الاستعلام يحذف صلاحيات Document من مجموعة المستخدمين المحددة
-- ============================================================

-- ============================================================
-- إعداد المتغيرات
-- ============================================================
DECLARE @IdUserGroup INT = 1;              -- رقم مجموعة المستخدمين (Admin = 1)

-- ============================================================
-- التحقق من الصلاحيات الموجودة قبل الحذف
-- ============================================================
PRINT '========================================';
PRINT 'الصلاحيات الموجودة قبل الحذف:';
PRINT '========================================';

SELECT 
    IdUserGroup,
    UserPermissionName,
    CreatedDate,
    IdCreatedBy
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
AND UserPermissionName LIKE 'Document_Allow_%'
ORDER BY UserPermissionName;

-- ============================================================
-- حذف صلاحيات Document
-- ============================================================

-- حذف صلاحية عرض المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_View'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_View';
    
    PRINT 'تم حذف صلاحية Document_Allow_View';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_View غير موجودة';
END

-- حذف صلاحية إنشاء المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Create'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Create';
    
    PRINT 'تم حذف صلاحية Document_Allow_Create';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Create غير موجودة';
END

-- حذف صلاحية تعديل المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Edit'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Edit';
    
    PRINT 'تم حذف صلاحية Document_Allow_Edit';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Edit غير موجودة';
END

-- حذف صلاحية حذف المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Delete'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Delete';
    
    PRINT 'تم حذف صلاحية Document_Allow_Delete';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Delete غير موجودة';
END

-- حذف صلاحية إدارة المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Manage'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Manage';
    
    PRINT 'تم حذف صلاحية Document_Allow_Manage';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Manage غير موجودة';
END

-- حذف صلاحية تكوين المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Configure'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Configure';
    
    PRINT 'تم حذف صلاحية Document_Allow_Configure';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Configure غير موجودة';
END

-- حذف صلاحية عرض جميع المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_ViewAll'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_ViewAll';
    
    PRINT 'تم حذف صلاحية Document_Allow_ViewAll';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_ViewAll غير موجودة';
END

-- حذف صلاحية تصدير المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Export'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Export';
    
    PRINT 'تم حذف صلاحية Document_Allow_Export';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Export غير موجودة';
END

-- حذف صلاحية استيراد المستندات
IF EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Import'
)
BEGIN
    DELETE FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'Document_Allow_Import';
    
    PRINT 'تم حذف صلاحية Document_Allow_Import';
END
ELSE
BEGIN
    PRINT 'الصلاحية Document_Allow_Import غير موجودة';
END

-- ============================================================
-- حذف جميع صلاحيات Document دفعة واحدة (بديل)
-- ============================================================
-- يمكنك استخدام هذا الاستعلام لحذف جميع صلاحيات Document دفعة واحدة:
/*
DELETE FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
AND UserPermissionName LIKE 'Document_Allow_%';
*/

-- ============================================================
-- التحقق من الصلاحيات بعد الحذف
-- ============================================================
PRINT '========================================';
PRINT 'الصلاحيات المتبقية بعد الحذف:';
PRINT '========================================';

SELECT 
    IdUserGroup,
    UserPermissionName,
    CreatedDate,
    IdCreatedBy
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
AND UserPermissionName LIKE 'Document_Allow_%'
ORDER BY UserPermissionName;

-- إذا لم تظهر أي نتائج، يعني تم حذف جميع صلاحيات Document بنجاح

-- ============================================================
-- ملاحظات:
-- ============================================================
-- 1. بعد حذف الصلاحيات، الزر "New Document Type" سيظهر
--    لكن عند الضغط عليه ستظهر رسالة "Permission Denied"
--
-- 2. لإعادة إضافة الصلاحيات، استخدم ملف AddFormPermission.sql
--
-- 3. يمكنك تغيير @IdUserGroup لحذف الصلاحيات من مجموعات أخرى
--
-- 4. الاستعلام يتحقق من وجود الصلاحية قبل الحذف لتجنب الأخطاء
-- ============================================================

