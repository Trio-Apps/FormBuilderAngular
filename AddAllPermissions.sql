-- ============================================
-- SQL Script to Add All Permissions
-- ============================================
-- This script adds all permissions for Projects, Approval Workflows, Stages, Assignees, Delegations, and Inbox
-- 
-- Usage:
-- 1. Set @IdUserGroup to the desired User Group ID
-- 2. Set @IdCreatedBy to the user ID creating these permissions
-- 3. Execute the script
-- ============================================

DECLARE @IdUserGroup INT = 1; -- Change this to your User Group ID
DECLARE @IdCreatedBy INT = 1; -- Change this to the user ID creating these permissions

-- ============================================
-- PROJECT PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Project_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: Project_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Project_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: Project_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Project_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: Project_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Project_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: Project_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Project_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added: Project_Allow_Manage';
END

-- ============================================
-- APPROVAL WORKFLOW PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalWorkflow_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalWorkflow_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalWorkflow_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalWorkflow_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalWorkflow_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalWorkflow_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalWorkflow_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalWorkflow_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalWorkflow_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalWorkflow_Allow_Manage';
END

-- ============================================
-- APPROVAL STAGE PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStage_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStage_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStage_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStage_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStage_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStage_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStage_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStage_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStage_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStage_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStage_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStage_Allow_Delete';
END

-- ============================================
-- STAGE ASSIGNEE PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStageAssignee_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStageAssignee_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStageAssignee_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStageAssignee_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStageAssignee_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStageAssignee_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStageAssignee_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStageAssignee_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStageAssignee_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalStageAssignee_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalStageAssignee_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalStageAssignee_Allow_Delete';
END

-- ============================================
-- APPROVAL DELEGATION PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalDelegation_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalDelegation_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalDelegation_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalDelegation_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalDelegation_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalDelegation_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalDelegation_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalDelegation_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalDelegation_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalDelegation_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalDelegation_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalDelegation_Allow_Delete';
END

-- ============================================
-- APPROVAL INBOX PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalInbox_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalInbox_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalInbox_Allow_View';
END

-- ============================================
-- GRID PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Grid_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Grid_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: Grid_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Grid_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Grid_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: Grid_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Grid_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Grid_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: Grid_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Grid_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Grid_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: Grid_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Grid_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'Grid_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added: Grid_Allow_Manage';
END

-- ============================================
-- GRID COLUMN PERMISSIONS
-- ============================================
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'GridColumn_Allow_View')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'GridColumn_Allow_View', @IdCreatedBy, GETDATE());
    PRINT 'Added: GridColumn_Allow_View';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'GridColumn_Allow_Create')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'GridColumn_Allow_Create', @IdCreatedBy, GETDATE());
    PRINT 'Added: GridColumn_Allow_Create';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'GridColumn_Allow_Edit')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'GridColumn_Allow_Edit', @IdCreatedBy, GETDATE());
    PRINT 'Added: GridColumn_Allow_Edit';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'GridColumn_Allow_Delete')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'GridColumn_Allow_Delete', @IdCreatedBy, GETDATE());
    PRINT 'Added: GridColumn_Allow_Delete';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'GridColumn_Allow_Manage')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'GridColumn_Allow_Manage', @IdCreatedBy, GETDATE());
    PRINT 'Added: GridColumn_Allow_Manage';
END
IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalInbox_Allow_Approve')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalInbox_Allow_Approve', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalInbox_Allow_Approve';
END

IF NOT EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalInbox_Allow_Reject')
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (IdUserGroup, UserPermissionName, IdCreatedBy, CreatedDate)
    VALUES (@IdUserGroup, 'ApprovalInbox_Allow_Reject', @IdCreatedBy, GETDATE());
    PRINT 'Added: ApprovalInbox_Allow_Reject';
END

-- ============================================
-- VERIFICATION
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'Verification: All Permissions for User Group ' + CAST(@IdUserGroup AS VARCHAR(10));
PRINT '============================================';
SELECT 
    UserPermissionName,
    IdCreatedBy,
    CreatedDate
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName IN (
        'Project_Allow_View', 'Project_Allow_Create', 'Project_Allow_Edit', 'Project_Allow_Delete', 'Project_Allow_Manage',
        'ApprovalWorkflow_Allow_View', 'ApprovalWorkflow_Allow_Create', 'ApprovalWorkflow_Allow_Edit', 'ApprovalWorkflow_Allow_Delete', 'ApprovalWorkflow_Allow_Manage',
        'ApprovalStage_Allow_View', 'ApprovalStage_Allow_Create', 'ApprovalStage_Allow_Edit', 'ApprovalStage_Allow_Delete',
        'ApprovalStageAssignee_Allow_View', 'ApprovalStageAssignee_Allow_Create', 'ApprovalStageAssignee_Allow_Edit', 'ApprovalStageAssignee_Allow_Delete',
        'ApprovalDelegation_Allow_View', 'ApprovalDelegation_Allow_Create', 'ApprovalDelegation_Allow_Edit', 'ApprovalDelegation_Allow_Delete',
        'ApprovalInbox_Allow_View', 'ApprovalInbox_Allow_Approve', 'ApprovalInbox_Allow_Reject',
        'Grid_Allow_View', 'Grid_Allow_Create', 'Grid_Allow_Edit', 'Grid_Allow_Delete', 'Grid_Allow_Manage',
        'GridColumn_Allow_View', 'GridColumn_Allow_Create', 'GridColumn_Allow_Edit', 'GridColumn_Allow_Delete', 'GridColumn_Allow_Manage'
    )
ORDER BY UserPermissionName;

PRINT '';
PRINT 'Script completed successfully!';

