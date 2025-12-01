import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { loginGuard } from './auth/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'pages',
    loadChildren: () => import('./views/pages/routes').then(m => m.routes)
  },
  {
    path: '',
    loadComponent: () => import('./layout/default-layout/default-layout.component').then(m => m.DefaultLayoutComponent),
    canActivate: [authGuard], // حماية جميع المسارات الفرعية
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [authGuard] // حماية إضافية
      },
      {
        path: 'forms',
        loadChildren: () => import('../app/views/FormBuilder/form-builder/routes').then(m => m.routes),
        canActivate: [authGuard]
      },
      {
        path: 'tabs',
        loadChildren: () => import('./views/tabs/routes').then(m => m.routes),
        canActivate: [authGuard]
      },
      {
        path: 'fields',
        loadChildren: () => import('../app/views/FormBuilder/fields/routes').then(m => m.routes),
        canActivate: [authGuard]
      },
      {
        path: 'submissions',
        loadChildren: () => import('./views/submissions/routes').then(m => m.routes),
        canActivate: [authGuard]
      }
    ]
  },
  {
    path: 'logout',
    loadComponent: () => import('./views/pages/logout/logout.component').then(m => m.LogoutComponent)
  },
  {
    path: '**',
    redirectTo: 'pages/login'
  }
];