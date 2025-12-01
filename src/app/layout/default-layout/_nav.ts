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
    url: '/forms',
    iconComponent: { name: 'cil-puzzle' }
  },
  {
    name: 'Tabs',
    url: '/tabs',
    iconComponent: { name: 'cil-applications' }
  },
  {
    name: 'Fields',
    url: '/fields',
    iconComponent: { name: 'cil-input-power' }
  },
  {
    name: 'Submissions',
    url: '/submissions',
    iconComponent: { name: 'cil-description' }
  },
  {
    title: true,
    name: 'Pages'
  },
  {
    name: 'Login',
    url: '/pages/login',
    iconComponent: { name: 'cil-account-logout' }
  },
  
  {
    name: 'Error 404',
    url: '/pages/404',
    iconComponent: { name: 'cil-warning' }
  },
  {
    name: 'Logout',
    url: '/logout',
    iconComponent: { name: 'cil-lock-locked' }
  }
];