SET NOCOUNT ON;

DECLARE @LegalEntityId INT = 1; -- يمكنك تغيير هذا حسب الحاجة
DECLARE @DeletedPermissions INT = 0;
DECLARE @DeletedGroupPermissions INT = 0;

-- ⚠️ تحذير: هذا السكريبت سيمسح جميع البيانات من جداول الصلاحيات
PRINT '========================================';
PRINT 'WARNING: This script will DELETE ALL data from permission tables!';
PRINT '========================================';
PRINT '';

-- 1. حذف جميع ربط الصلاحيات بمجموعات المستخدمين (يجب حذفها أولاً بسبب Foreign Key)
PRINT 'Step 1: Deleting all User Group Permissions...';
DELETE FROM Tbl_UserGroup_Permission
WHERE IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL;

SET @DeletedGroupPermissions = @@ROWCOUNT;
PRINT 'Deleted ' + CAST(@DeletedGroupPermissions AS VARCHAR(10)) + ' rows from Tbl_UserGroup_Permission';
PRINT '';

-- 2. حذف جميع الصلاحيات
PRINT 'Step 2: Deleting all Permissions...';
DELETE FROM Tbl_UserPermission
WHERE IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL;

SET @DeletedPermissions = @@ROWCOUNT;
PRINT 'Deleted ' + CAST(@DeletedPermissions AS VARCHAR(10)) + ' rows from Tbl_UserPermission';
PRINT '';

-- ملخص الحذف
PRINT '========================================';
PRINT 'DELETION SUMMARY:';
PRINT '========================================';
PRINT 'User Group Permissions deleted: ' + CAST(@DeletedGroupPermissions AS VARCHAR(10));
PRINT 'Permissions deleted: ' + CAST(@DeletedPermissions AS VARCHAR(10));
PRINT 'Total rows deleted: ' + CAST((@DeletedGroupPermissions + @DeletedPermissions) AS VARCHAR(10));
PRINT '';

-- التحقق من عدد الصفوف المتبقية
PRINT '========================================';
PRINT 'REMAINING DATA CHECK:';
PRINT '========================================';

SELECT 
    'Tbl_UserPermission' AS TableName,
    COUNT(*) AS RemainingRows,
    COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveRows,
    COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveRows
FROM Tbl_UserPermission
WHERE IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL

UNION ALL

SELECT 
    'Tbl_UserGroup_Permission' AS TableName,
    COUNT(*) AS RemainingRows,
    NULL AS ActiveRows,
    NULL AS InactiveRows
FROM Tbl_UserGroup_Permission
WHERE IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL;

PRINT '';
PRINT '========================================';
PRINT 'Script completed successfully!';
PRINT '========================================';

-- ============================================
-- إذا كنت تريد حذف جميع البيانات بغض النظر عن Legal Entity،
-- قم بإلغاء التعليق من الأسطر التالية:
-- ============================================
/*
-- حذف جميع ربط الصلاحيات
DELETE FROM Tbl_UserGroup_Permission;
PRINT 'Deleted ALL rows from Tbl_UserGroup_Permission: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- حذف جميع الصلاحيات
DELETE FROM Tbl_UserPermission;
PRINT 'Deleted ALL rows from Tbl_UserPermission: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
*/

