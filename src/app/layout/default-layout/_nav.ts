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
    iconComponent: { name: 'cil-puzzle' },
    children: [
      {
        name: 'Forms',
        url: '/form-builder/forms',
        iconComponent: { name: 'cil-description' }
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
    iconComponent: { name: 'cil-file' }
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
  
;
