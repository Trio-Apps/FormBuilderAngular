SET NOCOUNT ON;

DECLARE @Now DATETIME = GETDATE();
DECLARE @LegalEntityId INT = 1;

DECLARE @Permissions TABLE (
    Name NVARCHAR(200) PRIMARY KEY,
    ScreenName NVARCHAR(100) NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1
);

INSERT INTO @Permissions (Name, ScreenName, Description, IsActive)
VALUES
    -- ===== Form Builder (forms) =====
    ('FormBuilder_Allow_View',       'FormBuilder',  'View forms', 1),
    ('FormBuilder_Allow_Create',     'FormBuilder',  'Create forms', 1),
    ('FormBuilder_Allow_Edit',       'FormBuilder',  'Edit forms', 1),
    ('FormBuilder_Allow_Delete',     'FormBuilder',  'Delete forms', 1),
    ('FormBuilder_Allow_Manage',     'FormBuilder',  'Manage forms (full control)', 1),
    ('FormBuilder_Allow_ViewAll',    'FormBuilder',  'View all forms', 1),
    ('FormBuilder_Allow_Export',     'FormBuilder',  'Export forms', 1),
    ('FormBuilder_Allow_Import',     'FormBuilder',  'Import forms', 1),

    -- ===== Form Tabs =====
    ('FormTab_Allow_View',           'FormTab',      'View tabs', 1),
    ('FormTab_Allow_Create',         'FormTab',      'Create tabs', 1),
    ('FormTab_Allow_Edit',           'FormTab',      'Edit tabs', 1),
    ('FormTab_Allow_Delete',         'FormTab',      'Delete tabs', 1),
    ('FormTab_Allow_Manage',         'FormTab',      'Manage tabs', 1),
    ('FormTab_Allow_Reorder',        'FormTab',      'Reorder tabs', 1),

    -- ===== Form Fields =====
    ('FormField_Allow_View',         'FormField',    'View fields', 1),
    ('FormField_Allow_Create',       'FormField',    'Create fields', 1),
    ('FormField_Allow_Edit',         'FormField',    'Edit fields', 1),
    ('FormField_Allow_Delete',       'FormField',    'Delete fields', 1),
    ('FormField_Allow_Manage',       'FormField',    'Manage fields', 1),
    ('FormField_Allow_Reorder',      'FormField',    'Reorder fields', 1),
    ('FormField_Allow_Configure',    'FormField',    'Configure fields', 1),
    ('FormField_Allow_Validation',   'FormField',    'Manage field validation', 1),

    -- ===== Documents / Document Types =====
    ('Document_Allow_View',          'Document',     'View documents', 1),
    ('Document_Allow_Create',        'Document',     'Create documents', 1),
    ('Document_Allow_Edit',          'Document',     'Edit documents', 1),
    ('Document_Allow_Delete',        'Document',     'Delete documents', 1),
    ('Document_Allow_Manage',        'Document',     'Manage documents', 1),
    ('Document_Allow_Configure',     'Document',     'Configure documents', 1),
    ('Document_Allow_ViewAll',       'Document',     'View all documents', 1),
    ('Document_Allow_Export',        'Document',     'Export documents', 1),
    ('Document_Allow_Import',        'Document',     'Import documents', 1),

    -- ===== Submissions =====
    ('Submission_Allow_View',        'Submission',   'View submissions', 1),
    ('Submission_Allow_Create',      'Submission',   'Create submissions', 1),
    ('Submission_Allow_Edit',        'Submission',   'Edit submissions', 1),
    ('Submission_Allow_Delete',      'Submission',   'Delete submissions', 1),
    ('Submission_Allow_ViewAll',     'Submission',   'View all submissions', 1),
    ('Submission_Allow_Approve',     'Submission',   'Approve submissions', 1),
    ('Submission_Allow_Reject',     'Submission',   'Reject submissions', 1),

    -- ===== Form Rules =====
    ('FormRule_Allow_View',          'FormRule',     'View form rules', 1),
    ('FormRule_Allow_Create',        'FormRule',     'Create form rules', 1),
    ('FormRule_Allow_Edit',          'FormRule',     'Edit form rules', 1),
    ('FormRule_Allow_Delete',        'FormRule',     'Delete form rules', 1),
    ('FormRule_Allow_Manage',        'FormRule',     'Manage form rules', 1),

    -- ===== Formulas =====
    ('Formula_Allow_View',           'Formula',      'View formulas', 1),
    ('Formula_Allow_Create',         'Formula',      'Create formulas', 1),
    ('Formula_Allow_Edit',           'Formula',      'Edit formulas', 1),
    ('Formula_Allow_Delete',         'Formula',      'Delete formulas', 1),
    ('Formula_Allow_Manage',         'Formula',      'Manage formulas', 1),

    -- ===== Approval Workflow =====
    ('ApprovalWorkflow_Allow_View',   'ApprovalWorkflow', 'View workflows', 1),
    ('ApprovalWorkflow_Allow_Create', 'ApprovalWorkflow', 'Create workflows', 1),
    ('ApprovalWorkflow_Allow_Edit',   'ApprovalWorkflow', 'Edit workflows', 1),
    ('ApprovalWorkflow_Allow_Delete', 'ApprovalWorkflow', 'Delete workflows', 1),
    ('ApprovalWorkflow_Allow_Manage', 'ApprovalWorkflow', 'Manage workflows', 1),

    -- ===== Approval Stages =====
    ('ApprovalStage_Allow_View',     'ApprovalStage', 'View stages', 1),
    ('ApprovalStage_Allow_Create',   'ApprovalStage', 'Create stages', 1),
    ('ApprovalStage_Allow_Edit',     'ApprovalStage', 'Edit stages', 1),
    ('ApprovalStage_Allow_Delete',   'ApprovalStage', 'Delete stages', 1),
    ('ApprovalStage_Allow_Manage',   'ApprovalStage', 'Manage stages', 1),

    -- ===== Approval Inbox =====
    ('ApprovalInbox_Allow_View',     'ApprovalInbox', 'View inbox', 1),
    ('ApprovalInbox_Allow_Approve',  'ApprovalInbox', 'Approve items', 1),
    ('ApprovalInbox_Allow_Reject',   'ApprovalInbox', 'Reject items', 1),

    -- ===== Approval Stage Assignee =====
    ('ApprovalStageAssignee_Allow_View',    'ApprovalStageAssignee', 'View stage assignees', 1),
    ('ApprovalStageAssignee_Allow_Create',  'ApprovalStageAssignee', 'Create stage assignees', 1),
    ('ApprovalStageAssignee_Allow_Edit',    'ApprovalStageAssignee', 'Edit stage assignees', 1),
    ('ApprovalStageAssignee_Allow_Delete',  'ApprovalStageAssignee', 'Delete stage assignees', 1),
    ('ApprovalStageAssignee_Allow_Manage',  'ApprovalStageAssignee', 'Manage stage assignees', 1),

    -- ===== Approval Delegation =====
    ('ApprovalDelegation_Allow_View',   'ApprovalDelegation', 'View delegations', 1),
    ('ApprovalDelegation_Allow_Create', 'ApprovalDelegation', 'Create delegations', 1),
    ('ApprovalDelegation_Allow_Edit',   'ApprovalDelegation', 'Edit delegations', 1),
    ('ApprovalDelegation_Allow_Delete', 'ApprovalDelegation', 'Delete delegations', 1),
    ('ApprovalDelegation_Allow_Manage', 'ApprovalDelegation', 'Manage delegations', 1),

    -- ===== Projects =====
    ('Project_Allow_View',           'Project',      'View projects', 1),
    ('Project_Allow_Create',         'Project',      'Create projects', 1),
    ('Project_Allow_Edit',           'Project',      'Edit projects', 1),
    ('Project_Allow_Delete',         'Project',      'Delete projects', 1),
    ('Project_Allow_Manage',         'Project',      'Manage projects', 1),

    -- ===== Document Series =====
    ('DocumentSeries_Allow_View',     'DocumentSeries', 'View document series', 1),
    ('DocumentSeries_Allow_Create',   'DocumentSeries', 'Create document series', 1),
    ('DocumentSeries_Allow_Edit',     'DocumentSeries', 'Edit document series', 1),
    ('DocumentSeries_Allow_Delete',   'DocumentSeries', 'Delete document series', 1),
    ('DocumentSeries_Allow_Manage',   'DocumentSeries', 'Manage document series', 1),

    -- ===== Dashboard =====
    ('Dashboard_Allow_View',         'Dashboard',    'View dashboard', 1),
    ('Dashboard_Allow_Manage',       'Dashboard',    'Manage dashboard', 1),

    -- ===== Settings =====
    ('Settings_Allow_View',          'Settings',     'View settings', 1),
    ('Settings_Allow_Edit',          'Settings',     'Edit settings', 1),
    ('Settings_Allow_Manage',        'Settings',     'Manage settings', 1),

    -- ===== Table Menus =====
    ('TableMenu_Allow_View',         'TableMenu',    'View table menus', 1),
    ('TableMenu_Allow_Create',       'TableMenu',    'Create table menus', 1),
    ('TableMenu_Allow_Edit',         'TableMenu',    'Edit table menus', 1),
    ('TableMenu_Allow_Delete',       'TableMenu',    'Delete table menus', 1),
    ('TableMenu_Allow_Manage',       'TableMenu',    'Manage table menus', 1),

    -- ===== Table Sub Menus =====
    ('TableSubMenu_Allow_View',      'TableSubMenu', 'View table sub menus', 1),
    ('TableSubMenu_Allow_Create',    'TableSubMenu', 'Create table sub menus', 1),
    ('TableSubMenu_Allow_Edit',      'TableSubMenu', 'Edit table sub menus', 1),
    ('TableSubMenu_Allow_Delete',    'TableSubMenu', 'Delete table sub menus', 1),
    ('TableSubMenu_Allow_Manage',    'TableSubMenu', 'Manage table sub menus', 1),

    -- ===== Grids =====
    ('Grid_Allow_View',              'Grid',         'View grids', 1),
    ('Grid_Allow_Create',            'Grid',         'Create grids', 1),
    ('Grid_Allow_Edit',              'Grid',         'Edit grids', 1),
    ('Grid_Allow_Delete',            'Grid',         'Delete grids', 1),
    ('Grid_Allow_Manage',            'Grid',         'Manage grids', 1),

    -- ===== Grid Columns =====
    ('GridColumn_Allow_View',        'GridColumn',   'View grid columns', 1),
    ('GridColumn_Allow_Create',      'GridColumn',   'Create grid columns', 1),
    ('GridColumn_Allow_Edit',        'GridColumn',   'Edit grid columns', 1),
    ('GridColumn_Allow_Delete',      'GridColumn',   'Delete grid columns', 1),
    ('GridColumn_Allow_Manage',      'GridColumn',   'Manage grid columns', 1),

    -- ===== Alert Rules =====
    ('AlertRule_Allow_View',         'AlertRule',    'View alert rules', 1),
    ('AlertRule_Allow_Create',       'AlertRule',    'Create alert rules', 1),
    ('AlertRule_Allow_Edit',         'AlertRule',    'Edit alert rules', 1),
    ('AlertRule_Allow_Delete',       'AlertRule',    'Delete alert rules', 1),
    ('AlertRule_Allow_Manage',       'AlertRule',    'Manage alert rules', 1),

    -- ===== Email Templates =====
    ('EmailTemplate_Allow_View',     'EmailTemplate','View email templates', 1),
    ('EmailTemplate_Allow_Create',   'EmailTemplate','Create email templates', 1),
    ('EmailTemplate_Allow_Edit',     'EmailTemplate','Edit email templates', 1),
    ('EmailTemplate_Allow_Delete',   'EmailTemplate','Delete email templates', 1),
    ('EmailTemplate_Allow_Manage',   'EmailTemplate','Manage email templates', 1),

    -- ===== SMTP Configs =====
    ('SmtpConfig_Allow_View',        'SmtpConfig',   'View SMTP configs', 1),
    ('SmtpConfig_Allow_Create',      'SmtpConfig',   'Create SMTP configs', 1),
    ('SmtpConfig_Allow_Edit',        'SmtpConfig',   'Edit SMTP configs', 1),
    ('SmtpConfig_Allow_Delete',      'SmtpConfig',   'Delete SMTP configs', 1),
    ('SmtpConfig_Allow_Manage',      'SmtpConfig',   'Manage SMTP configs', 1),

    -- ===== SAP HANA Configs =====
    ('SapHanaConfig_Allow_View',     'SapHanaConfig', 'View SAP HANA configs', 1),
    ('SapHanaConfig_Allow_Create',   'SapHanaConfig', 'Create SAP HANA configs', 1),
    ('SapHanaConfig_Allow_Edit',     'SapHanaConfig', 'Edit SAP HANA configs', 1),
    ('SapHanaConfig_Allow_Delete',   'SapHanaConfig', 'Delete SAP HANA configs', 1),
    ('SapHanaConfig_Allow_Manage',   'SapHanaConfig', 'Manage SAP HANA configs', 1),

    -- ===== User Queries =====
    ('UserQuery_Allow_View',         'UserQuery',     'View user queries', 1),
    ('UserQuery_Allow_Create',       'UserQuery',     'Create user queries', 1),
    ('UserQuery_Allow_Edit',          'UserQuery',     'Edit user queries', 1),
    ('UserQuery_Allow_Delete',        'UserQuery',     'Delete user queries', 1),
    ('UserQuery_Allow_Manage',        'UserQuery',     'Manage user queries', 1),
    ('UserQuery_Allow_Execute',       'UserQuery',     'Execute user queries', 1),

    -- ===== Form Stored Procedures =====
    ('FormStoredProcedure_Allow_View',   'FormStoredProcedure', 'View stored procedures', 1),
    ('FormStoredProcedure_Allow_Create', 'FormStoredProcedure', 'Create stored procedures', 1),
    ('FormStoredProcedure_Allow_Edit',   'FormStoredProcedure', 'Edit stored procedures', 1),
    ('FormStoredProcedure_Allow_Delete', 'FormStoredProcedure', 'Delete stored procedures', 1),
    ('FormStoredProcedure_Allow_Manage', 'FormStoredProcedure', 'Manage stored procedures', 1),
    ('FormStoredProcedure_Allow_Execute', 'FormStoredProcedure', 'Execute stored procedures', 1),

    -- ===== User Group Permissions =====
    ('UserGroupPermission_Allow_View',   'UserGroupPermission', 'View group permissions', 1),
    ('UserGroupPermission_Allow_Create', 'UserGroupPermission', 'Create group permissions', 1),
    ('UserGroupPermission_Allow_Edit',   'UserGroupPermission', 'Edit group permissions', 1),
    ('UserGroupPermission_Allow_Delete', 'UserGroupPermission', 'Delete group permissions', 1),
    ('UserGroupPermission_Allow_Manage', 'UserGroupPermission', 'Manage group permissions', 1),

    -- ===== Field Options =====
    ('FieldOption_Allow_View',      'FieldOption',  'View field options', 1),
    ('FieldOption_Allow_Create',    'FieldOption',  'Create field options', 1),
    ('FieldOption_Allow_Edit',      'FieldOption',  'Edit field options', 1),
    ('FieldOption_Allow_Delete',    'FieldOption',  'Delete field options', 1),
    ('FieldOption_Allow_Manage',    'FieldOption',  'Manage field options', 1),

    -- ===== Field Data Sources =====
    ('FieldDataSource_Allow_View', 'FieldDataSource', 'View field data sources', 1),
    ('FieldDataSource_Allow_Create', 'FieldDataSource', 'Create field data sources', 1),
    ('FieldDataSource_Allow_Edit', 'FieldDataSource', 'Edit field data sources', 1),
    ('FieldDataSource_Allow_Delete', 'FieldDataSource', 'Delete field data sources', 1),
    ('FieldDataSource_Allow_Manage', 'FieldDataSource', 'Manage field data sources', 1),

    -- ===== Form Rule Actions =====
    ('FormRuleAction_Allow_View',   'FormRuleAction', 'View form rule actions', 1),
    ('FormRuleAction_Allow_Create', 'FormRuleAction', 'Create form rule actions', 1),
    ('FormRuleAction_Allow_Edit',   'FormRuleAction', 'Edit form rule actions', 1),
    ('FormRuleAction_Allow_Delete', 'FormRuleAction', 'Delete form rule actions', 1),
    ('FormRuleAction_Allow_Manage', 'FormRuleAction', 'Manage form rule actions', 1),

    -- ===== Formula Variables =====
    ('FormulaVariable_Allow_View',   'FormulaVariable', 'View formula variables', 1),
    ('FormulaVariable_Allow_Create', 'FormulaVariable', 'Create formula variables', 1),
    ('FormulaVariable_Allow_Edit',   'FormulaVariable', 'Edit formula variables', 1),
    ('FormulaVariable_Allow_Delete', 'FormulaVariable', 'Delete formula variables', 1),
    ('FormulaVariable_Allow_Manage', 'FormulaVariable', 'Manage formula variables', 1),

    -- ===== Form Validation Rules =====
    ('FormValidationRule_Allow_View', 'FormValidationRule', 'View form validation rules', 1),
    ('FormValidationRule_Allow_Create', 'FormValidationRule', 'Create form validation rules', 1),
    ('FormValidationRule_Allow_Edit', 'FormValidationRule', 'Edit form validation rules', 1),
    ('FormValidationRule_Allow_Delete', 'FormValidationRule', 'Delete form validation rules', 1),
    ('FormValidationRule_Allow_Manage', 'FormValidationRule', 'Manage form validation rules', 1),

    -- ===== Form Submission Values =====
    ('FormSubmissionValue_Allow_View', 'FormSubmissionValue', 'View submission values', 1),
    ('FormSubmissionValue_Allow_Create', 'FormSubmissionValue', 'Create submission values', 1),
    ('FormSubmissionValue_Allow_Edit', 'FormSubmissionValue', 'Edit submission values', 1),
    ('FormSubmissionValue_Allow_Delete', 'FormSubmissionValue', 'Delete submission values', 1),
    ('FormSubmissionValue_Allow_Manage', 'FormSubmissionValue', 'Manage submission values', 1),

    -- ===== Form Submission Attachments =====
    ('FormSubmissionAttachment_Allow_View', 'FormSubmissionAttachment', 'View submission attachments', 1),
    ('FormSubmissionAttachment_Allow_Create', 'FormSubmissionAttachment', 'Create submission attachments', 1),
    ('FormSubmissionAttachment_Allow_Edit', 'FormSubmissionAttachment', 'Edit submission attachments', 1),
    ('FormSubmissionAttachment_Allow_Delete', 'FormSubmissionAttachment', 'Delete submission attachments', 1),
    ('FormSubmissionAttachment_Allow_Manage', 'FormSubmissionAttachment', 'Manage submission attachments', 1),

    -- ===== Attachment Types =====
    ('AttachmentType_Allow_View',   'AttachmentType', 'View attachment types', 1),
    ('AttachmentType_Allow_Create', 'AttachmentType', 'Create attachment types', 1),
    ('AttachmentType_Allow_Edit',   'AttachmentType', 'Edit attachment types', 1),
    ('AttachmentType_Allow_Delete', 'AttachmentType', 'Delete attachment types', 1),
    ('AttachmentType_Allow_Manage', 'AttachmentType', 'Manage attachment types', 1),

    -- ===== Form Attachment Types =====
    ('FormAttachmentType_Allow_View', 'FormAttachmentType', 'View form attachment types', 1),
    ('FormAttachmentType_Allow_Create', 'FormAttachmentType', 'Create form attachment types', 1),
    ('FormAttachmentType_Allow_Edit', 'FormAttachmentType', 'Edit form attachment types', 1),
    ('FormAttachmentType_Allow_Delete', 'FormAttachmentType', 'Delete form attachment types', 1),
    ('FormAttachmentType_Allow_Manage', 'FormAttachmentType', 'Manage form attachment types', 1),

    -- ===== Form Grids =====
    ('FormGrid_Allow_View',         'FormGrid',      'View form grids', 1),
    ('FormGrid_Allow_Create',       'FormGrid',      'Create form grids', 1),
    ('FormGrid_Allow_Edit',         'FormGrid',      'Edit form grids', 1),
    ('FormGrid_Allow_Delete',       'FormGrid',      'Delete form grids', 1),
    ('FormGrid_Allow_Manage',       'FormGrid',      'Manage form grids', 1),

    -- ===== Form Grid Columns =====
    ('FormGridColumn_Allow_View',   'FormGridColumn', 'View grid columns', 1),
    ('FormGridColumn_Allow_Create', 'FormGridColumn', 'Create grid columns', 1),
    ('FormGridColumn_Allow_Edit',   'FormGridColumn', 'Edit grid columns', 1),
    ('FormGridColumn_Allow_Delete', 'FormGridColumn', 'Delete grid columns', 1),
    ('FormGridColumn_Allow_Manage', 'FormGridColumn', 'Manage grid columns', 1),

    -- ===== Grid Column Data Sources =====
    ('GridColumnDataSource_Allow_View', 'GridColumnDataSource', 'View grid column data sources', 1),
    ('GridColumnDataSource_Allow_Create', 'GridColumnDataSource', 'Create grid column data sources', 1),
    ('GridColumnDataSource_Allow_Edit', 'GridColumnDataSource', 'Edit grid column data sources', 1),
    ('GridColumnDataSource_Allow_Delete', 'GridColumnDataSource', 'Delete grid column data sources', 1),
    ('GridColumnDataSource_Allow_Manage', 'GridColumnDataSource', 'Manage grid column data sources', 1),

    -- ===== Grid Column Options =====
    ('GridColumnOption_Allow_View', 'GridColumnOption', 'View grid column options', 1),
    ('GridColumnOption_Allow_Create', 'GridColumnOption', 'Create grid column options', 1),
    ('GridColumnOption_Allow_Edit', 'GridColumnOption', 'Edit grid column options', 1),
    ('GridColumnOption_Allow_Delete', 'GridColumnOption', 'Delete grid column options', 1),
    ('GridColumnOption_Allow_Manage', 'GridColumnOption', 'Manage grid column options', 1),

    -- ===== Form Submission Grid Rows =====
    ('FormSubmissionGridRow_Allow_View', 'FormSubmissionGridRow', 'View submission grid rows', 1),
    ('FormSubmissionGridRow_Allow_Create', 'FormSubmissionGridRow', 'Create submission grid rows', 1),
    ('FormSubmissionGridRow_Allow_Edit', 'FormSubmissionGridRow', 'Edit submission grid rows', 1),
    ('FormSubmissionGridRow_Allow_Delete', 'FormSubmissionGridRow', 'Delete submission grid rows', 1),
    ('FormSubmissionGridRow_Allow_Manage', 'FormSubmissionGridRow', 'Manage submission grid rows', 1),

    -- ===== Form Submission Grid Cells =====
    ('FormSubmissionGridCell_Allow_View', 'FormSubmissionGridCell', 'View submission grid cells', 1),
    ('FormSubmissionGridCell_Allow_Create', 'FormSubmissionGridCell', 'Create submission grid cells', 1),
    ('FormSubmissionGridCell_Allow_Edit', 'FormSubmissionGridCell', 'Edit submission grid cells', 1),
    ('FormSubmissionGridCell_Allow_Delete', 'FormSubmissionGridCell', 'Delete submission grid cells', 1),
    ('FormSubmissionGridCell_Allow_Manage', 'FormSubmissionGridCell', 'Manage submission grid cells', 1),

    -- ===== Document Approval History =====
    ('DocumentApprovalHistory_Allow_View', 'DocumentApprovalHistory', 'View approval history', 1),
    ('DocumentApprovalHistory_Allow_Create', 'DocumentApprovalHistory', 'Create approval history', 1),
    ('DocumentApprovalHistory_Allow_Edit', 'DocumentApprovalHistory', 'Edit approval history', 1),
    ('DocumentApprovalHistory_Allow_Delete', 'DocumentApprovalHistory', 'Delete approval history', 1),
    ('DocumentApprovalHistory_Allow_Manage', 'DocumentApprovalHistory', 'Manage approval history', 1),

    -- ===== Notifications =====
    ('Notification_Allow_View',      'Notification',  'View notifications', 1),
    ('Notification_Allow_Create',   'Notification',  'Create notifications', 1),
    ('Notification_Allow_Edit',      'Notification',  'Edit notifications', 1),
    ('Notification_Allow_Delete',    'Notification',  'Delete notifications', 1),
    ('Notification_Allow_Manage',   'Notification',  'Manage notifications', 1),

    -- ===== Form Buttons =====
    ('FormButton_Allow_View',       'FormButton',    'View form buttons', 1),
    ('FormButton_Allow_Create',     'FormButton',    'Create form buttons', 1),
    ('FormButton_Allow_Edit',      'FormButton',    'Edit form buttons', 1),
    ('FormButton_Allow_Delete',     'FormButton',    'Delete form buttons', 1),
    ('FormButton_Allow_Manage',     'FormButton',    'Manage form buttons', 1),

    -- ===== Crystal Layouts =====
    ('CrystalLayout_Allow_View',    'CrystalLayout', 'View crystal layouts', 1),
    ('CrystalLayout_Allow_Create',  'CrystalLayout', 'Create crystal layouts', 1),
    ('CrystalLayout_Allow_Edit',    'CrystalLayout', 'Edit crystal layouts', 1),
    ('CrystalLayout_Allow_Delete',  'CrystalLayout', 'Delete crystal layouts', 1),
    ('CrystalLayout_Allow_Manage',  'CrystalLayout', 'Manage crystal layouts', 1),

    -- ===== Outlook Approval Config =====
    ('OutlookApprovalConfig_Allow_View', 'OutlookApprovalConfig', 'View outlook approval configs', 1),
    ('OutlookApprovalConfig_Allow_Create', 'OutlookApprovalConfig', 'Create outlook approval configs', 1),
    ('OutlookApprovalConfig_Allow_Edit', 'OutlookApprovalConfig', 'Edit outlook approval configs', 1),
    ('OutlookApprovalConfig_Allow_Delete', 'OutlookApprovalConfig', 'Delete outlook approval configs', 1),
    ('OutlookApprovalConfig_Allow_Manage', 'OutlookApprovalConfig', 'Manage outlook approval configs', 1),

    -- ===== SAP Object Mappings =====
    ('SapObjectMapping_Allow_View', 'SapObjectMapping', 'View SAP object mappings', 1),
    ('SapObjectMapping_Allow_Create', 'SapObjectMapping', 'Create SAP object mappings', 1),
    ('SapObjectMapping_Allow_Edit', 'SapObjectMapping', 'Edit SAP object mappings', 1),
    ('SapObjectMapping_Allow_Delete', 'SapObjectMapping', 'Delete SAP object mappings', 1),
    ('SapObjectMapping_Allow_Manage', 'SapObjectMapping', 'Manage SAP object mappings', 1),

    -- ===== SAP Field Mappings =====
    ('SapFieldMapping_Allow_View',  'SapFieldMapping', 'View SAP field mappings', 1),
    ('SapFieldMapping_Allow_Create', 'SapFieldMapping', 'Create SAP field mappings', 1),
    ('SapFieldMapping_Allow_Edit',  'SapFieldMapping', 'Edit SAP field mappings', 1),
    ('SapFieldMapping_Allow_Delete', 'SapFieldMapping', 'Delete SAP field mappings', 1),
    ('SapFieldMapping_Allow_Manage', 'SapFieldMapping', 'Manage SAP field mappings', 1),

    -- ===== Table Menu Documents =====
    ('TableMenuDocument_Allow_View', 'TableMenuDocument', 'View table menu documents', 1),
    ('TableMenuDocument_Allow_Create', 'TableMenuDocument', 'Create table menu documents', 1),
    ('TableMenuDocument_Allow_Edit', 'TableMenuDocument', 'Edit table menu documents', 1),
    ('TableMenuDocument_Allow_Delete', 'TableMenuDocument', 'Delete table menu documents', 1),
    ('TableMenuDocument_Allow_Manage', 'TableMenuDocument', 'Manage table menu documents', 1),

    -- ===== Table Menu Permissions =====
    ('TableMenuPermission_Allow_View', 'TableMenuPermission', 'View table menu permissions', 1),
    ('TableMenuPermission_Allow_Create', 'TableMenuPermission', 'Create table menu permissions', 1),
    ('TableMenuPermission_Allow_Edit', 'TableMenuPermission', 'Edit table menu permissions', 1),
    ('TableMenuPermission_Allow_Delete', 'TableMenuPermission', 'Delete table menu permissions', 1),
    ('TableMenuPermission_Allow_Manage', 'TableMenuPermission', 'Manage table menu permissions', 1),

    -- ===== Table Sub Menu Permissions =====
    ('TableSubMenuPermission_Allow_View', 'TableSubMenuPermission', 'View table sub menu permissions', 1),
    ('TableSubMenuPermission_Allow_Create', 'TableSubMenuPermission', 'Create table sub menu permissions', 1),
    ('TableSubMenuPermission_Allow_Edit', 'TableSubMenuPermission', 'Edit table sub menu permissions', 1),
    ('TableSubMenuPermission_Allow_Delete', 'TableSubMenuPermission', 'Delete table sub menu permissions', 1),
    ('TableSubMenuPermission_Allow_Manage', 'TableSubMenuPermission', 'Manage table sub menu permissions', 1),

    -- ===== Table Menu Document Permissions =====
    ('TableMenuDocumentPermission_Allow_View', 'TableMenuDocumentPermission', 'View table menu document permissions', 1),
    ('TableMenuDocumentPermission_Allow_Create', 'TableMenuDocumentPermission', 'Create table menu document permissions', 1),
    ('TableMenuDocumentPermission_Allow_Edit', 'TableMenuDocumentPermission', 'Edit table menu document permissions', 1),
    ('TableMenuDocumentPermission_Allow_Delete', 'TableMenuDocumentPermission', 'Delete table menu document permissions', 1),
    ('TableMenuDocumentPermission_Allow_Manage', 'TableMenuDocumentPermission', 'Manage table menu document permissions', 1),

    -- ===== Blocking Rule Audit Log =====
    ('BlockingRuleAuditLog_Allow_View', 'BlockingRuleAuditLog', 'View blocking rule audit logs', 1),
    ('BlockingRuleAuditLog_Allow_Create', 'BlockingRuleAuditLog', 'Create blocking rule audit logs', 1),
    ('BlockingRuleAuditLog_Allow_Edit', 'BlockingRuleAuditLog', 'Edit blocking rule audit logs', 1),
    ('BlockingRuleAuditLog_Allow_Delete', 'BlockingRuleAuditLog', 'Delete blocking rule audit logs', 1),
    ('BlockingRuleAuditLog_Allow_Manage', 'BlockingRuleAuditLog', 'Manage blocking rule audit logs', 1),

    -- ===== Copy To Document Audit =====
    ('CopyToDocumentAudit_Allow_View', 'CopyToDocumentAudit', 'View copy to document audit logs', 1),
    ('CopyToDocumentAudit_Allow_Create', 'CopyToDocumentAudit', 'Create copy to document audit logs', 1),
    ('CopyToDocumentAudit_Allow_Edit', 'CopyToDocumentAudit', 'Edit copy to document audit logs', 1),
    ('CopyToDocumentAudit_Allow_Delete', 'CopyToDocumentAudit', 'Delete copy to document audit logs', 1),
    ('CopyToDocumentAudit_Allow_Manage', 'CopyToDocumentAudit', 'Manage copy to document audit logs', 1),

    -- ===== Global / Special =====
    ('FULL_ACCESS',                 'System',       'Full system access', 1),
    ('ADMIN_ACCESS',                'System',       'Admin access', 1);

-- إدخال في Tbl_UserPermission بدون تكرار (مع توحيد الـ Collation على Name)
INSERT INTO Tbl_UserPermission
(
    Name,
    Description,
    ForeignDescription,
    ScreenName,
    ForeignScreenName,
    IsActive,
    IdLegalEntity
)
SELECT
    p.Name,
    p.Description,
    NULL AS ForeignDescription,     -- ممكن تملاها بالعربي لو حابب
    p.ScreenName,
    NULL AS ForeignScreenName,      -- اسم الشاشة بالعربي لو محتاج
    p.IsActive,
    @LegalEntityId
FROM @Permissions p
WHERE NOT EXISTS (
    SELECT 1
    FROM Tbl_UserPermission up
    WHERE up.Name COLLATE SQL_Latin1_General_CP1256_CS_AS
          = p.Name COLLATE SQL_Latin1_General_CP1256_CS_AS
      AND up.IdLegalEntity = @LegalEntityId
);

PRINT 'Seeded permissions into Tbl_UserPermission: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows inserted.';

-- ملخص الصلاحيات المضافة
SELECT 
    COUNT(*) AS TotalPermissions,
    COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActivePermissions,
    COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactivePermissions
FROM Tbl_UserPermission
WHERE IdLegalEntity = @LegalEntityId;

PRINT 'Script completed successfully!';

