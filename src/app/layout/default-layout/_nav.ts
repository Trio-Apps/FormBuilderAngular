import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' }
  },
  {
    title: true,
    name: 'Form Builder'
  },
  {
    name: 'Form Builder',
    url: '/form-builder',
    iconComponent: { name: 'cil-puzzle' },
    children: [
      {
        name: 'Forms',
        url: '/form-builder/forms',
        iconComponent: { name: 'cil-description' }
      },
      {
        name: 'Stored Procedures',
        url: '/form-builder/stored-procedures',
        iconComponent: { name: 'cil-code' }
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
    children: [
      {
        name: 'Manage Document Types',
        url: '/document-types',
        iconComponent: { name: 'cil-list' }
      }
    ]
  },
  {
    name: 'Manage Table Menus',
    url: '/table-menus',
    iconComponent: { name: 'cil-menu' },
    attributes: { roles: ['Administration'] } // Admin only
  },
  {
    name: 'Approval Workflows',
    url: '/approval-workflows',
    iconComponent: { name: 'cil-sitemap' },
    children: [
      {
        name: 'Manage Workflows',
        url: '/approval-workflows',
        iconComponent: { name: 'cil-list' }
      },
      {
        name: 'Approval Inbox',
        url: '/approval-inbox',
        iconComponent: { name: 'cil-inbox' },
        badge: {
          color: 'danger',
          text: 'NEW'
        }
      },
      {
        name: 'Delegations',
        url: '/approval-delegations',
        iconComponent: { name: 'cil-user' }
      },
      {
        name: 'Approvals History',
        url: '/approvals-history',
        iconComponent: { name: 'cil-clock' }
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
    iconComponent: { name: 'cil-briefcase' }
  },
  {
    name: 'Logout',
    url: '/logout',
    iconComponent: { name: 'cil-lock-locked' }
  }
];

