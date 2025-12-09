import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { loginGuard } from './auth/login.guard';

export const routes: Routes = [
  // الصفحة الافتراضية
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // صفحات عامة مثل login/register
  {
    path: 'pages',
    loadChildren: () => import('./views/pages/routes').then(m => m.routes),
    canActivate: [loginGuard]
  },

  // Layout رئيسي مع الحماية
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

      // Form Builder Routes
      {
        path: 'forms',
        loadChildren: () => import('./views/FormBuilder/form-builder/routes')
          .then(m => m.routes)
      },

      // Submissions
      {
        path: 'submissions',
        loadChildren: () => import('./views/submissions/routes')
          .then(m => m.routes)
      }
    ]
  },

  // Logout
  {
    path: 'logout',
    loadComponent: () => import('./views/pages/logout/logout.component')
      .then(m => m.LogoutComponent)
  },

  // أي مسار غير معروف
  {
    path: '**',
    redirectTo: 'pages/login'
  }
];