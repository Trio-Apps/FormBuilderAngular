-- ============================================
-- Add Remaining Permissions
-- ============================================
-- This script adds permissions for Form Rules, Alert Rules, Email Templates, SMTP Configs, Table Menus, and Table Sub Menus
-- to the Tbl_UserGroup_Permission table
--
-- Usage:
-- 1. Update @IdUserGroup and @IdCreatedBy as needed
-- 2. Execute the script
-- ============================================

DECLARE @IdUserGroup INT = 1; -- Update this to your user group ID
DECLARE @IdCreatedBy INT = 1; -- Update this to the user ID creating the permissions

-- ============================================
-- Form Rule Permissions
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormRule_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormRule_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: FormRule_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormRule_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormRule_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: FormRule_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormRule_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormRule_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: FormRule_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormRule_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormRule_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: FormRule_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormRule_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormRule_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: FormRule_Allow_Manage';
END

-- ============================================
-- Alert Rule Permissions
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'AlertRule_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'AlertRule_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: AlertRule_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'AlertRule_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'AlertRule_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: AlertRule_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'AlertRule_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'AlertRule_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: AlertRule_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'AlertRule_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'AlertRule_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: AlertRule_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'AlertRule_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'AlertRule_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: AlertRule_Allow_Manage';
END

-- ============================================
-- Email Template Permissions
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'EmailTemplate_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'EmailTemplate_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: EmailTemplate_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'EmailTemplate_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'EmailTemplate_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: EmailTemplate_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'EmailTemplate_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'EmailTemplate_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: EmailTemplate_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'EmailTemplate_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'EmailTemplate_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: EmailTemplate_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'EmailTemplate_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'EmailTemplate_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: EmailTemplate_Allow_Manage';
END

-- ============================================
-- SMTP Config Permissions
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'SmtpConfig_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'SmtpConfig_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: SmtpConfig_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'SmtpConfig_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'SmtpConfig_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: SmtpConfig_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'SmtpConfig_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'SmtpConfig_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: SmtpConfig_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'SmtpConfig_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'SmtpConfig_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: SmtpConfig_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'SmtpConfig_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'SmtpConfig_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: SmtpConfig_Allow_Manage';
END

-- ============================================
-- Table Menu Permissions
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableMenu_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableMenu_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableMenu_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableMenu_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableMenu_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableMenu_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableMenu_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableMenu_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableMenu_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableMenu_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableMenu_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableMenu_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableMenu_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableMenu_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableMenu_Allow_Manage';
END

-- ============================================
-- Table Sub Menu Permissions
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableSubMenu_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableSubMenu_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableSubMenu_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableSubMenu_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableSubMenu_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableSubMenu_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableSubMenu_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableSubMenu_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableSubMenu_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableSubMenu_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableSubMenu_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableSubMenu_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableSubMenu_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableSubMenu_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added permission: TableSubMenu_Allow_Manage';
END

-- ============================================
-- Verification
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'Verification: All Remaining Permissions';
PRINT '============================================';
SELECT 
    UserPermissionName,
    IdUserGroup,
    IdCreatedBy,
    CreatedDate
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
    AND (
        UserPermissionName LIKE 'FormRule_Allow_%' OR
        UserPermissionName LIKE 'AlertRule_Allow_%' OR
        UserPermissionName LIKE 'EmailTemplate_Allow_%' OR
        UserPermissionName LIKE 'SmtpConfig_Allow_%' OR
        UserPermissionName LIKE 'TableMenu_Allow_%' OR
        UserPermissionName LIKE 'TableSubMenu_Allow_%'
    )
ORDER BY UserPermissionName;

PRINT '';
PRINT 'Script completed successfully!';

