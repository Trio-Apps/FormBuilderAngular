import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { loginGuard } from './auth/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'pages',
    loadChildren: () => import('./views/pages/routes').then(m => m.routes),
    canActivate: [loginGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layout/default-layout/default-layout.component')
      .then(m => m.DefaultLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./views/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'forms',
        loadChildren: () => import('./views/FormBuilder/form-builder/routes')
          .then(m => m.routes)
      }
    ]
  },
  {
    path: 'logout',
    loadComponent: () => import('./views/pages/logout/logout.component')
      .then(m => m.LogoutComponent)
  },
  { path: '**', redirectTo: 'pages/login' }
];
