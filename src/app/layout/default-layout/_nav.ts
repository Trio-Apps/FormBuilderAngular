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
        url: '/forms',
        iconComponent: { name: 'cil-description' }
      },
      {
        name: 'Tabs',
        url: '/forms/tabs',
        iconComponent: { name: 'cil-applications' }
      },
      {
        name: 'Fields',
        url: '/forms/fields',
        iconComponent: { name: 'cil-input-power' }
      },
      {
        name: 'Submissions',
        url: '/forms/submissions',
        iconComponent: { name: 'cil-description' }
      }
    ]
  },
  {
    name: 'Logout',
    url: '/logout',
    iconComponent: { name: 'cil-lock-locked' }
  }
];
