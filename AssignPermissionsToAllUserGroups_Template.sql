-- ============================================
-- سكريبت قالب لربط الصلاحيات بجميع مجموعات المستخدمين
-- ============================================
-- الاستخدام: غيّر القيم في بداية السكريبت ثم شغّله
-- ============================================

SET NOCOUNT ON;

-- ============================================
-- ⚙️ الإعدادات - غيّر هذه القيم حسب الحاجة
-- ============================================
DECLARE @LegalEntityId INT = 1;            -- ⚠️ ID الكيان القانوني (أو NULL لجميع الكيانات)
DECLARE @CreatedBy INT = 1;                 -- ⚠️ ID المستخدم الذي يقوم بالعملية
DECLARE @CreatedDate DATETIME = GETDATE();  -- تاريخ الإنشاء

-- ============================================
-- متغيرات العمل
-- ============================================
DECLARE @TotalInserted INT = 0;
DECLARE @TotalSkipped INT = 0;
DECLARE @GroupsProcessed INT = 0;
DECLARE @UserGroupId INT;
DECLARE @GroupName NVARCHAR(200);
DECLARE @InsertedCount INT;
DECLARE @SkippedCount INT;

-- ============================================
-- بدء العملية
-- ============================================
PRINT '========================================';
PRINT 'ASSIGN ALL PERMISSIONS TO ALL USER GROUPS';
PRINT '========================================';
PRINT 'Legal Entity ID: ' + ISNULL(CAST(@LegalEntityId AS VARCHAR(10)), 'NULL (All)');
PRINT 'Created By: ' + CAST(@CreatedBy AS VARCHAR(10));
PRINT '';

-- التحقق من وجود مجموعات المستخدمين
DECLARE @GroupCount INT;
SELECT @GroupCount = COUNT(*) FROM Tbl_UserGroup;

IF @GroupCount = 0
BEGIN
    PRINT '❌ ERROR: No User Groups found in Tbl_UserGroup!';
    PRINT 'Please create User Groups first.';
    RETURN;
END

PRINT '✅ Found ' + CAST(@GroupCount AS VARCHAR(10)) + ' User Group(s)';
PRINT '';

-- معالجة كل مجموعة مستخدم
DECLARE group_cursor CURSOR FOR
SELECT Id, Name
FROM Tbl_UserGroup
ORDER BY Id;

OPEN group_cursor;
FETCH NEXT FROM group_cursor INTO @UserGroupId, @GroupName;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT 'Processing User Group: [' + CAST(@UserGroupId AS VARCHAR(10)) + '] ' + @GroupName;
    
    -- إدراج جميع الصلاحيات النشطة لهذه المجموعة
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
    SET @TotalInserted = @TotalInserted + @InsertedCount;
    
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
    
    SET @TotalSkipped = @TotalSkipped + @SkippedCount;
    SET @GroupsProcessed = @GroupsProcessed + 1;
    
    PRINT '  → Inserted: ' + CAST(@InsertedCount AS VARCHAR(10)) + 
          ', Skipped: ' + CAST(@SkippedCount AS VARCHAR(10));
    PRINT '';
    
    FETCH NEXT FROM group_cursor INTO @UserGroupId, @GroupName;
END

CLOSE group_cursor;
DEALLOCATE group_cursor;

-- ============================================
-- النتائج
-- ============================================
PRINT '========================================';
PRINT 'FINAL SUMMARY';
PRINT '========================================';
PRINT 'User Groups processed: ' + CAST(@GroupsProcessed AS VARCHAR(10));
PRINT 'Total permissions inserted: ' + CAST(@TotalInserted AS VARCHAR(10));
PRINT 'Total permissions skipped: ' + CAST(@TotalSkipped AS VARCHAR(10));
PRINT '';

-- عرض ملخص لكل مجموعة
PRINT 'Permissions per User Group:';
SELECT 
    ug.Id AS UserGroupId,
    ug.Name AS UserGroupName,
    COUNT(ugp.UserPermissionName) AS PermissionCount
FROM Tbl_UserGroup ug
LEFT JOIN Tbl_UserGroup_Permission ugp 
    ON ug.Id = ugp.IdUserGroup
    AND (@LegalEntityId IS NULL OR ugp.IdLegalEntity = @LegalEntityId OR ugp.IdLegalEntity IS NULL)
GROUP BY ug.Id, ug.Name
ORDER BY ug.Id;

PRINT '';
PRINT '========================================';
PRINT 'Script completed successfully!';
PRINT '========================================';

