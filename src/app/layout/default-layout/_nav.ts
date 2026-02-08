import { INavData } from '@coreui/angular';

/**
 * ملاحظة:
 * - أي عنصر في الـ sidebar يمكن ربطه بـ permission معين من خلال attributes.permissionCode
 * - DefaultLayoutComponent هي اللي بتفلتر العناصر بناءً على permissionCode + role
 */
export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' },
    attributes: { permissionCode: 'Dashboard_Allow_View' }
  },
  {
    title: true,
    name: 'Form Builder'
  },
  {
    name: 'Form Builder',
    url: '/form-builder',
    iconComponent: { name: 'cil-puzzle' },
    attributes: { permissionCode: 'FormBuilder_Allow_View' },
    children: [
      {
        name: 'Forms',
        url: '/form-builder/forms',
        iconComponent: { name: 'cil-description' },
        attributes: { permissionCode: 'FormBuilder_Allow_View' }
      },
      {
        name: 'Stored Procedures',
        url: '/form-builder/stored-procedures',
        iconComponent: { name: 'cil-code' },
        attributes: { permissionCode: 'StoredProcedure_Allow_View' }
      },
      {
        name: 'Copy To Document',
        url: '/form-builder/copy-to-document',
        iconComponent: { name: 'cil-copy' },
        attributes: { permissionCode: 'FormBuilder_Allow_View' }
      },
      
      // Tabs و Fields تحتاج IDs ديناميكية، فلا يمكن وضع رابط ثابت هنا
    ]
  },
  {
    title: true,
    name: 'Documents Setup'
  },
  {
    name: 'Document Types',
    url: '/document-types',
    iconComponent: { name: 'cil-file' },
    attributes: { permissionCode: 'Document_Allow_View' }, // Changed from DocumentType_Allow_View to Document_Allow_View
    children: [
      {
        name: 'Manage Document Types',
        url: '/document-types',
        iconComponent: { name: 'cil-list' },
        attributes: { permissionCode: 'Document_Allow_View' } // Changed from DocumentType_Allow_View to Document_Allow_View
      }
    ]
  },
  {
    name: 'Alert Rules',
    url: '/alert-rules',
    iconComponent: { name: 'cil-bell' },
    attributes: { roles: ['Administration'], permissionCode: 'AlertRule_Allow_View' } // Admin + permission
  },
  {
    name: 'SMTP Configs',
    url: '/smtp-configs',
    iconComponent: { name: 'cil-envelope-closed' },
    attributes: { roles: ['Administration'], permissionCode: 'SmtpConfig_Allow_View' } // Admin + permission
  },
  {
    name: 'Email Templates',
    url: '/email-templates',
    iconComponent: { name: 'cil-envelope-open' },
    attributes: { roles: ['Administration'], permissionCode: 'EmailTemplate_Allow_View' } // Admin + permission
  },
  {
    name: 'Manage Table Menus',
    url: '/table-menus',
    iconComponent: { name: 'cil-menu' },
    attributes: { roles: ['Administration'], permissionCode: 'TableMenu_Allow_View' } // Admin + permission
  },
  {
    name: 'Approval Workflows',
    url: '/approval-workflows',
    iconComponent: { name: 'cil-sitemap' },
    attributes: { permissionCode: 'ApprovalWorkflow_Allow_View' },
    children: [
      {
        name: 'Manage Workflows',
        url: '/approval-workflows',
        iconComponent: { name: 'cil-list' },
        attributes: { permissionCode: 'ApprovalWorkflow_Allow_View' }
      },
      {
        name: 'Approval Inbox',
        url: '/approval-inbox',
        iconComponent: { name: 'cil-inbox' },
        attributes: { permissionCode: 'ApprovalInbox_Allow_View' },
        badge: {
          color: 'danger',
          text: 'NEW'
        }
      },
      {
        name: 'Delegations',
        url: '/approval-delegations',
        iconComponent: { name: 'cil-user' },
        attributes: { permissionCode: 'ApprovalDelegation_Allow_View' }
      },
      {
        name: 'Approvals History',
        url: '/approvals-history',
        iconComponent: { name: 'cil-clock' },
        attributes: { permissionCode: 'ApprovalWorkflow_Allow_View' }
      }
    ]
  },
  {
    title: true,
    name: 'Testing & Tools'
  },
  {
    title: true,
    name: 'Projects'
  },
  {
    name: 'Projects',
    url: '/projects',
    iconComponent: { name: 'cil-briefcase' },
    attributes: { permissionCode: 'Project_Allow_View' }
  },
  {
    name: 'Logout',
    url: '/logout',
    iconComponent: { name: 'cil-lock-locked' }
  }
];

