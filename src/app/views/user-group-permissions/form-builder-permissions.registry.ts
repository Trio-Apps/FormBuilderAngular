export const FORM_BUILDER_PERMISSION_ENTITIES = [
  'Dashboard',
  'FormBuilder',
  'FormTab',
  'FormField',
  'StoredProcedure',
  'FormRule',
  'Document',
  'DocumentType',
  'DocumentSeries',
  'Submission',
  'Formula',
  'UserQuery',
  'FormStoredProcedure',
  'FieldOption',
  'FieldDataSource',
  'FormGrid',
  'FormGridColumn',
  'Grid',
  'GridColumn',
  'TableMenu',
  'TableSubMenu',
  'ApprovalWorkflow',
  'ApprovalStage',
  'ApprovalInbox',
  'ApprovalStageAssignee',
  'ApprovalDelegation',
  'Project',
  'AlertRule',
  'EmailTemplate',
  'SmtpConfig',
  'SapHanaConfig',
  'AttachmentType',
  'Notification',
  'FormButton',
  'UserGroupPermission',
  'User',
  'UserGroup',
  'Users',
  'Groups',
  'Permissions',
] as const;

export const FORM_BUILDER_PERMISSION_ACTIONS = [
  'View',
  'Create',
  'Edit',
  'Delete',
  'Manage',
  'Configure',
  'ViewAll',
  'Export',
  'Import',
  'Approve',
  'Reject',
  'Reorder',
  'Validation',
  'Execute',
] as const;

const formBuilderEntitySet = new Set<string>(FORM_BUILDER_PERMISSION_ENTITIES);
const formBuilderActionSet = new Set<string>(FORM_BUILDER_PERMISSION_ACTIONS);

export function parsePermissionCode(permission: string): { entity: string; action: string } | null {
  const value = (permission || '').trim();
  const marker = '_Allow_';
  const index = value.indexOf(marker);
  if (index <= 0) {
    return null;
  }

  return {
    entity: value.slice(0, index),
    action: value.slice(index + marker.length)
  };
}

export function isFormBuilderPermission(permission: string): boolean {
  const parsed = parsePermissionCode(permission);
  if (!parsed) {
    return false;
  }

  return formBuilderEntitySet.has(parsed.entity) && formBuilderActionSet.has(parsed.action);
}

