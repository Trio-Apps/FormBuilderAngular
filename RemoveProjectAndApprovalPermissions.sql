-- ============================================
-- SQL Script to Remove Project and Approval Workflow Permissions
-- ============================================
-- This script removes all Project and Approval Workflow related permissions
-- 
-- Usage:
-- 1. Set @IdUserGroup to the desired User Group ID
-- 2. Execute the script
-- ============================================

DECLARE @IdUserGroup INT = 1; -- Change this to your User Group ID

-- ============================================
-- REMOVE PROJECT PERMISSIONS
-- ============================================
IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_View')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_View';
    PRINT 'Removed: Project_Allow_View';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Create')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Create';
    PRINT 'Removed: Project_Allow_Create';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Edit')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Edit';
    PRINT 'Removed: Project_Allow_Edit';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Delete')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Delete';
    PRINT 'Removed: Project_Allow_Delete';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Manage')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'Project_Allow_Manage';
    PRINT 'Removed: Project_Allow_Manage';
END

-- ============================================
-- REMOVE APPROVAL WORKFLOW PERMISSIONS
-- ============================================
IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_View')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_View';
    PRINT 'Removed: ApprovalWorkflow_Allow_View';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Create')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Create';
    PRINT 'Removed: ApprovalWorkflow_Allow_Create';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Edit')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Edit';
    PRINT 'Removed: ApprovalWorkflow_Allow_Edit';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Delete')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Delete';
    PRINT 'Removed: ApprovalWorkflow_Allow_Delete';
END

IF EXISTS (SELECT 1 FROM Tbl_UserGroup_Permission WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Manage')
BEGIN
    DELETE FROM Tbl_UserGroup_Permission 
    WHERE IdUserGroup = @IdUserGroup AND UserPermissionName = 'ApprovalWorkflow_Allow_Manage';
    PRINT 'Removed: ApprovalWorkflow_Allow_Manage';
END

-- ============================================
-- VERIFICATION
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'Verification: Remaining Permissions for User Group ' + CAST(@IdUserGroup AS VARCHAR(10));
PRINT '============================================';
SELECT 
    UserPermissionName,
    IdCreatedBy,
    CreatedDate
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName IN (
        'Project_Allow_View', 'Project_Allow_Create', 'Project_Allow_Edit', 'Project_Allow_Delete', 'Project_Allow_Manage',
        'ApprovalWorkflow_Allow_View', 'ApprovalWorkflow_Allow_Create', 'ApprovalWorkflow_Allow_Edit', 'ApprovalWorkflow_Allow_Delete', 'ApprovalWorkflow_Allow_Manage'
    )
ORDER BY UserPermissionName;

PRINT '';
PRINT 'If no rows are returned, all Project and Approval Workflow permissions have been removed successfully!';
PRINT 'Script completed successfully!';

