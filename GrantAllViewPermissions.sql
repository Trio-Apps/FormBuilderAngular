-- ============================================
-- Grant ALL *View permissions to one User Group
-- ============================================
DECLARE @IdUserGroup INT = 1;  -- Change this to your User Group ID
DECLARE @IdCreatedBy INT = 1;  -- Change this to the user ID creating these permissions

-- Helper
DECLARE @Now DATETIME = GETDATE();

-- Form Builder / Forms
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormBuilder_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormBuilder_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: FormBuilder_Allow_View';
END;

-- Tabs
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormTab_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormTab_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: FormTab_Allow_View';
END;

-- Fields
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormField_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormField_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: FormField_Allow_View';
END;

-- Stored Procedures
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'StoredProcedure_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'StoredProcedure_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: StoredProcedure_Allow_View';
END;

-- Form Rules
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'FormRule_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'FormRule_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: FormRule_Allow_View';
END;

-- Document Types
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'DocumentType_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'DocumentType_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: DocumentType_Allow_View';
END;

-- Projects
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Project_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Project_Allow_View';
END;

-- Approval Workflows
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalWorkflow_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: ApprovalWorkflow_Allow_View';
END;

-- Approval Stages
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStage_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStage_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: ApprovalStage_Allow_View';
END;

-- Approval Stage Assignees
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStageAssignee_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStageAssignee_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: ApprovalStageAssignee_Allow_View';
END;

-- Approval Delegations
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalDelegation_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalDelegation_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: ApprovalDelegation_Allow_View';
END;

-- Approval Inbox
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalInbox_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalInbox_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: ApprovalInbox_Allow_View';
END;

-- Alert Rules
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'AlertRule_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'AlertRule_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: AlertRule_Allow_View';
END;

-- Email Templates
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'EmailTemplate_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'EmailTemplate_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: EmailTemplate_Allow_View';
END;

-- SMTP Configs
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'SmtpConfig_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'SmtpConfig_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: SmtpConfig_Allow_View';
END;

-- Table Menus
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableMenu_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableMenu_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: TableMenu_Allow_View';
END;

-- Table Sub Menus
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'TableSubMenu_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'TableSubMenu_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: TableSubMenu_Allow_View';
END;

-- Dashboard
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Dashboard_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Dashboard_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Dashboard_Allow_View';
END;

-- Formula
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Formula_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Formula_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Formula_Allow_View';
END;

-- Settings
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Settings_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Settings_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Settings_Allow_View';
END;

-- Submission (Form Submissions)
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Submission_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Submission_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Submission_Allow_View';
END;

-- Tables (Database Tables / Lookup Tables)
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Table_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Table_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Table_Allow_View';
END;

-- Grids
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Grid_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Grid_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: Grid_Allow_View';
END;

-- Grid Columns
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'GridColumn_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'GridColumn_Allow_View', @IdCreatedBy, @Now);
    PRINT 'Added: GridColumn_Allow_View';
END;

-- ============================================
-- Verification
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'Verification: All View Permissions';
PRINT '============================================';
SELECT 
    UserPermissionName,
    IdUserGroup,
    IdCreatedBy,
    CreatedDate
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName LIKE '%_Allow_View'
ORDER BY UserPermissionName;

PRINT '';
PRINT 'Script completed successfully!';

