SET NOCOUNT ON;

-- ============================================
-- سكريبت لربط جميع الصلاحيات بمجموعة المستخدم
-- ============================================
-- هذا السكريبت يأخذ جميع الصلاحيات من Tbl_UserPermission
-- ويربطها بمجموعة المستخدم في Tbl_UserGroup_Permission
-- ============================================

DECLARE @UserGroupId INT = 1; -- ⚠️ غيّر هذا إلى ID مجموعة المستخدم المطلوبة
DECLARE @LegalEntityId INT = 1; -- ⚠️ غيّر هذا حسب الحاجة
DECLARE @CreatedBy INT = 1; -- ID المستخدم الذي يقوم بالعملية
DECLARE @CreatedDate DATETIME = GETDATE();

DECLARE @InsertedCount INT = 0;
DECLARE @SkippedCount INT = 0;

PRINT '========================================';
PRINT 'ASSIGN ALL PERMISSIONS TO USER GROUP';
PRINT '========================================';
PRINT 'User Group ID: ' + CAST(@UserGroupId AS VARCHAR(10));
PRINT 'Legal Entity ID: ' + CAST(@LegalEntityId AS VARCHAR(10));
PRINT 'Created By: ' + CAST(@CreatedBy AS VARCHAR(10));
PRINT '';

-- التحقق من وجود مجموعة المستخدم
DECLARE @GroupName NVARCHAR(200);
SELECT @GroupName = Name FROM Tbl_UserGroup WHERE Id = @UserGroupId;

IF @GroupName IS NULL
BEGIN
    PRINT '❌ ERROR: User Group with ID ' + CAST(@UserGroupId AS VARCHAR(10)) + ' does not exist!';
    PRINT 'Please check the User Group ID and try again.';
    RETURN;
END

PRINT '✅ User Group found: ' + @GroupName;
PRINT '';

-- إدراج جميع الصلاحيات النشطة من Tbl_UserPermission إلى Tbl_UserGroup_Permission
PRINT 'Inserting permissions into Tbl_UserGroup_Permission...';
PRINT '';

INSERT INTO Tbl_UserGroup_Permission
(
    IdUserGroup,
    IdLegalEntity,
    IdCreatedBy,
    CreatedDate,
    UserPermissionName
)
SELECT
    @UserGroupId AS IdUserGroup,
    @LegalEntityId AS IdLegalEntity,
    @CreatedBy AS IdCreatedBy,
    @CreatedDate AS CreatedDate,
    up.Name AS UserPermissionName
FROM Tbl_UserPermission up
WHERE up.IsActive = 1
  AND (up.IdLegalEntity = @LegalEntityId OR up.IdLegalEntity IS NULL)
  AND NOT EXISTS (
      -- تجنب التكرار: لا تضيف صلاحية موجودة بالفعل لهذه المجموعة
      SELECT 1
      FROM Tbl_UserGroup_Permission ugp
      WHERE ugp.IdUserGroup = @UserGroupId
        AND ugp.UserPermissionName COLLATE SQL_Latin1_General_CP1256_CS_AS
            = up.Name COLLATE SQL_Latin1_General_CP1256_CS_AS
        AND (ugp.IdLegalEntity = @LegalEntityId OR ugp.IdLegalEntity IS NULL)
  );

SET @InsertedCount = @@ROWCOUNT;

-- حساب الصلاحيات المفقودة (التي لم يتم إضافتها بسبب التكرار)
SELECT @SkippedCount = COUNT(*)
FROM Tbl_UserPermission up
WHERE up.IsActive = 1
  AND (up.IdLegalEntity = @LegalEntityId OR up.IdLegalEntity IS NULL)
  AND EXISTS (
      SELECT 1
      FROM Tbl_UserGroup_Permission ugp
      WHERE ugp.IdUserGroup = @UserGroupId
        AND ugp.UserPermissionName COLLATE SQL_Latin1_General_CP1256_CS_AS
            = up.Name COLLATE SQL_Latin1_General_CP1256_CS_AS
        AND (ugp.IdLegalEntity = @LegalEntityId OR ugp.IdLegalEntity IS NULL)
  );

-- ============================================
-- SUMMARY
-- ============================================
PRINT '========================================';
PRINT 'SUMMARY';
PRINT '========================================';
PRINT 'Permissions inserted: ' + CAST(@InsertedCount AS VARCHAR(10));
PRINT 'Permissions skipped (already exist): ' + CAST(@SkippedCount AS VARCHAR(10));
PRINT '';

-- عرض عدد الصلاحيات المرتبطة الآن بهذه المجموعة
DECLARE @TotalPermissions INT;
SELECT @TotalPermissions = COUNT(*)
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @UserGroupId
  AND (IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL);

PRINT 'Total permissions for this group: ' + CAST(@TotalPermissions AS VARCHAR(10));
PRINT '';

-- عرض عينة من الصلاحيات المضافة
PRINT 'Sample of assigned permissions:';
SELECT TOP 10
    UserPermissionName,
    IdLegalEntity,
    CreatedDate
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @UserGroupId
  AND (IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL)
ORDER BY CreatedDate DESC, UserPermissionName;

PRINT '';
PRINT '========================================';
PRINT 'Script completed successfully!';
PRINT '========================================';
PRINT '';
PRINT '⚠️ IMPORTANT: After running this script,';
PRINT '   1. Log out from Angular application';
PRINT '   2. Log in again to refresh permissions';
PRINT '   3. Or clear browser cache/localStorage';
PRINT '';

