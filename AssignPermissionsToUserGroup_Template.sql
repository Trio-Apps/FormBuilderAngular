-- ============================================
-- سكريبت قالب لربط الصلاحيات بمجموعة مستخدم
-- ============================================
-- الاستخدام: غيّر القيم في بداية السكريبت ثم شغّله
-- ============================================

SET NOCOUNT ON;

-- ============================================
-- ⚙️ الإعدادات - غيّر هذه القيم حسب الحاجة
-- ============================================
DECLARE @UserGroupId INT = 1;              -- ⚠️ ID مجموعة المستخدم المطلوبة
DECLARE @LegalEntityId INT = 1;            -- ⚠️ ID الكيان القانوني (أو NULL لجميع الكيانات)
DECLARE @CreatedBy INT = 1;                -- ⚠️ ID المستخدم الذي يقوم بالعملية
DECLARE @CreatedDate DATETIME = GETDATE(); -- تاريخ الإنشاء

-- ============================================
-- متغيرات العمل
-- ============================================
DECLARE @InsertedCount INT = 0;
DECLARE @SkippedCount INT = 0;
DECLARE @GroupName NVARCHAR(200);

-- ============================================
-- بدء العملية
-- ============================================
PRINT '========================================';
PRINT 'ASSIGN ALL PERMISSIONS TO USER GROUP';
PRINT '========================================';
PRINT 'User Group ID: ' + CAST(@UserGroupId AS VARCHAR(10));
PRINT 'Legal Entity ID: ' + ISNULL(CAST(@LegalEntityId AS VARCHAR(10)), 'NULL (All)');
PRINT 'Created By: ' + CAST(@CreatedBy AS VARCHAR(10));
PRINT '';

-- التحقق من وجود مجموعة المستخدم
SELECT @GroupName = Name FROM Tbl_UserGroup WHERE Id = @UserGroupId;

IF @GroupName IS NULL
BEGIN
    PRINT '❌ ERROR: User Group with ID ' + CAST(@UserGroupId AS VARCHAR(10)) + ' does not exist!';
    PRINT 'Please check the User Group ID and try again.';
    RETURN;
END

PRINT '✅ User Group found: ' + @GroupName;
PRINT '';

-- إدراج جميع الصلاحيات النشطة
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
  AND (@LegalEntityId IS NULL OR up.IdLegalEntity = @LegalEntityId OR up.IdLegalEntity IS NULL)
  AND NOT EXISTS (
      SELECT 1
      FROM Tbl_UserGroup_Permission ugp
      WHERE ugp.IdUserGroup = @UserGroupId
        AND ugp.UserPermissionName COLLATE SQL_Latin1_General_CP1256_CS_AS
            = up.Name COLLATE SQL_Latin1_General_CP1256_CS_AS
        AND (@LegalEntityId IS NULL OR ugp.IdLegalEntity = @LegalEntityId OR ugp.IdLegalEntity IS NULL)
  );

SET @InsertedCount = @@ROWCOUNT;

-- حساب الصلاحيات المفقودة (الموجودة بالفعل)
SELECT @SkippedCount = COUNT(*)
FROM Tbl_UserPermission up
WHERE up.IsActive = 1
  AND (@LegalEntityId IS NULL OR up.IdLegalEntity = @LegalEntityId OR up.IdLegalEntity IS NULL)
  AND EXISTS (
      SELECT 1
      FROM Tbl_UserGroup_Permission ugp
      WHERE ugp.IdUserGroup = @UserGroupId
        AND ugp.UserPermissionName COLLATE SQL_Latin1_General_CP1256_CS_AS
            = up.Name COLLATE SQL_Latin1_General_CP1256_CS_AS
        AND (@LegalEntityId IS NULL OR ugp.IdLegalEntity = @LegalEntityId OR ugp.IdLegalEntity IS NULL)
  );

-- ============================================
-- النتائج
-- ============================================
PRINT '========================================';
PRINT 'SUMMARY';
PRINT '========================================';
PRINT 'Permissions inserted: ' + CAST(@InsertedCount AS VARCHAR(10));
PRINT 'Permissions skipped (already exist): ' + CAST(@SkippedCount AS VARCHAR(10));
PRINT '';

-- عرض عدد الصلاحيات الإجمالي
DECLARE @TotalPermissions INT;
SELECT @TotalPermissions = COUNT(*)
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @UserGroupId
  AND (@LegalEntityId IS NULL OR IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL);

PRINT 'Total permissions for this group: ' + CAST(@TotalPermissions AS VARCHAR(10));
PRINT '';

-- عرض عينة من الصلاحيات المضافة
PRINT 'Sample of assigned permissions (last 10):';
SELECT TOP 10
    UserPermissionName,
    IdLegalEntity,
    CreatedDate
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @UserGroupId
  AND (@LegalEntityId IS NULL OR IdLegalEntity = @LegalEntityId OR IdLegalEntity IS NULL)
ORDER BY CreatedDate DESC, UserPermissionName;

PRINT '';
PRINT '========================================';
PRINT 'Script completed successfully!';
PRINT '========================================';

