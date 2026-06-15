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
    // No `url` on collapsible groups: it makes CoreUI's samePath() prefix-match sub-routes
    // and force the group open, which conflicts with our route-driven accordion. The group
    // is a pure toggle; its children carry the real urls.
    iconComponent: { name: 'cil-puzzle' },
    attributes: { permissionCode: 'FormBuilder_Allow_View' },
    children: [
      {
        name: 'Forms',
        url: '/form-builder/forms',
        iconComponent: { name: 'cil-spreadsheet' },
        attributes: { permissionCode: 'FormBuilder_Allow_View' }
      },
      {
        name: 'Stored Procedures',
        url: '/form-builder/stored-procedures',
        iconComponent: { name: 'cil-code' },
        attributes: { permissionCode: 'FormStoredProcedure_Allow_View' }
      },
      {
        name: 'Copy To Document',
        url: '/form-builder/copy-to-document',
        iconComponent: { name: 'cil-share-boxed' },
        attributes: { roles: ['Administration'], permissionCode: 'FormRule_Allow_View' }
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
    iconComponent: { name: 'cil-notes' },
    attributes: { permissionCode: 'Document_Allow_View' }, // Changed from DocumentType_Allow_View to Document_Allow_View
    children: [
      {
        name: 'Manage Document Types',
        url: '/document-types',
        iconComponent: { name: 'cil-list' },
        attributes: { permissionCode: 'Document_Allow_View' } // Changed from DocumentType_Allow_View to Document_Allow_View
      },
      {
        name: 'Document Series',
        url: '/document-series',
        iconComponent: { name: 'cil-list-numbered' },
        attributes: { permissionCode: 'DocumentSeries_Allow_View' }
      }
    ]
  },
  {
    name: 'Submissions',
    url: '/submissions',
    iconComponent: { name: 'cil-description' },
    attributes: { permissionCode: 'Submission_Allow_View' }
  },
  {
    name: 'Approval Workflows',
    iconComponent: { name: 'cil-task' },
    attributes: { permissionCode: 'ApprovalWorkflow_Allow_View' },
    children: [
      {
        name: 'Manage Workflows',
        url: '/approval-workflows',
        iconComponent: { name: 'cil-settings' },
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
        iconComponent: { name: 'cil-share-all' },
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
    name: 'Administration'
  },
  {
    name: 'Alerts & Email',
    iconComponent: { name: 'cil-bell' },
    attributes: { roles: ['Administration'] },
    children: [
      {
        name: 'Alert Rules',
        url: '/alert-rules',
        iconComponent: { name: 'cil-bell' },
        attributes: { roles: ['Administration'], permissionCode: 'AlertRule_Allow_View' }
      },
      {
        name: 'Alert Log',
        url: '/alert-log',
        iconComponent: { name: 'cil-list' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Email Templates',
        url: '/email-templates',
        iconComponent: { name: 'cil-envelope-open' },
        attributes: { roles: ['Administration'], permissionCode: 'EmailTemplate_Allow_View' }
      },
      {
        name: 'SMTP Configs',
        url: '/smtp-configs',
        iconComponent: { name: 'cil-envelope-closed' },
        attributes: { roles: ['Administration'], permissionCode: 'SmtpConfig_Allow_View' }
      }
    ]
  },
  {
    name: 'Letters & Layouts',
    iconComponent: { name: 'cil-envelope-letter' },
    attributes: { roles: ['Administration'] },
    children: [
      {
        name: 'Letter Types',
        url: '/letter-types',
        iconComponent: { name: 'cil-envelope-letter' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Contract Clauses',
        url: '/contract-clauses',
        iconComponent: { name: 'cil-book' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Report Layouts',
        url: '/layouts',
        iconComponent: { name: 'cil-layers' },
        attributes: { roles: ['Administration'] }
      }
    ]
  },
  {
    name: 'Security',
    iconComponent: { name: 'cil-lock-locked' },
    attributes: { roles: ['Administration'] },
    children: [
      {
        name: 'Users',
        url: '/users',
        iconComponent: { name: 'cil-user-follow' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Groups',
        url: '/groups',
        iconComponent: { name: 'cil-people' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Permissions',
        url: '/permissions',
        iconComponent: { name: 'cil-lock-locked' },
        attributes: { roles: ['Administration'], permissionCode: 'UserGroupPermission_Allow_View' }
      }
    ]
  },
  {
    name: 'System & Data',
    iconComponent: { name: 'cil-settings' },
    attributes: { roles: ['Administration'] },
    children: [
      {
        name: 'SAP Integration',
        url: '/sap-integration',
        iconComponent: { name: 'cil-applications-settings' },
        attributes: { roles: ['Administration'], permissionCode: 'SapHanaConfig_Allow_View' }
      },
      {
        name: 'DocuSign Settings',
        url: '/docusign-settings',
        iconComponent: { name: 'cil-pencil' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Master Data',
        url: '/master-data',
        iconComponent: { name: 'cil-spreadsheet' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Audit Trail',
        url: '/audit-trail',
        iconComponent: { name: 'cil-clock' },
        attributes: { roles: ['Administration'] }
      },
      {
        name: 'Manage Table Menus',
        url: '/table-menus',
        iconComponent: { name: 'cil-grid' },
        attributes: { roles: ['Administration'], permissionCode: 'TableMenu_Allow_View' }
      }
    ]
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
    iconComponent: { name: 'cil-account-logout' }
  }
];
