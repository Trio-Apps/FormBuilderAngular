import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { loginGuard } from './auth/login.guard';

export const routes: Routes = [
  // ===== المسارات العامة =====
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  
  // ===== صفحة عرض الفورم العامة (بدون تسجيل دخول) =====
  {
    path: 'forms/view/:formCode',
    loadComponent: () => import('./views/public-form/form-view.component')
      .then(m => m.FormViewComponent)
  },
  
  // ===== الصفحات العامة (Login, Register, etc.) =====
  {
    path: 'pages',
    loadChildren: () => import('./views/pages/routes').then(m => m.routes),
    canActivate: [loginGuard] // يمنع المستخدمين المسجلين
  },
  
  // ===== المسارات المحمية (للمستخدمين المسجلين) =====
  {
    path: '',
    loadComponent: () =>
      import('./layout/default-layout/default-layout.component')
        .then(m => m.DefaultLayoutComponent),
    canActivate: [authGuard], // يمنع المستخدمين غير المسجلين
    children: [
      // ===== Dashboard =====
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/routes').then(m => m.routes)
      },

      // ===== Projects =====
      {
        path: 'projects',
        loadComponent: () => import('./views/projects/components/projects-list/projects-list.component')
          .then(m => m.ProjectsListComponent)
      },

      // ===== Form Builder System =====
      {
        path: 'form-builder',
        loadComponent: () => import('./views/FormBuilder/form-builder/form-builder.component')
          .then(m => m.FormBuilderComponent),
        children: [
          // Default route للـ form-builder
          { 
            path: '', 
            redirectTo: 'forms', 
            pathMatch: 'full' 
          },
          
          // قائمة الفورمات
          { 
            path: 'forms', 
            loadComponent: () => import('./views/FormBuilder/components/forms-list/forms-list.component')
              .then(m => m.FormsListComponent) 
          },
          
          // تبويبات فورم معين (مثال: form-builder/tabs/5)
          { 
            path: 'tabs/:formId', 
            loadComponent: () => import('./views/tabs/tabs-list/tabs-list.component')
              .then(m => m.TabsListComponent) 
          },
          
          // إدارة Rules لنموذج معين (مثال: form-builder/rules/5)
          { 
            path: 'rules/:formId', 
            loadComponent: () => import('./views/FormBuilder/components/form-rules-list/form-rules-list.component')
              .then(m => m.FormRulesListComponent) 
          },
          
          // إدارة Document Type لنموذج معين (مثال: form-builder/document-type/5)
          { 
            path: 'document-type/:formId', 
            loadComponent: () => import('./views/FormBuilder/components/document-type/document-type.component')
              .then(m => m.DocumentTypeComponent) 
          },
          
          // حقول تبويب معين (مثال: form-builder/fields/10)
          { 
            path: 'fields/:tabId', 
            loadComponent: () => import('./views/fields/fields-list/fields-list.component')
              .then(m => m.FieldsListComponent) 
          },
          
          // إدارة الجداول (Grids) لتبويب معين (مثال: form-builder/grids/10)
          { 
            path: 'grids/:tabId', 
            loadComponent: () => import('./views/grids/grids-list/grids-list.component')
              .then(m => m.GridsListComponent) 
          },
          
          // إدارة أعمدة Grid (مثال: form-builder/grids/10/columns/5)
          { 
            path: 'grids/:tabId/columns/:gridId', 
            loadComponent: () => import('./views/grids/grid-columns-list/grid-columns-list.component')
              .then(m => m.GridColumnsListComponent) 
          },
          
          // إدارة Grid Rows (مثال: form-builder/grids/10/rows/5)
          { 
            path: 'grids/:tabId/rows/:gridId', 
            loadComponent: () => import('./views/grids/grid-rows-list/grid-rows-list.component')
              .then(m => m.GridRowsListComponent) 
          },
          
          // إدارة أنواع الحقول (Field Types)
          { 
            path: 'field-types', 
            loadComponent: () => import('./views/field-types/field-types-list/field-types-list.component')
              .then(m => m.FieldTypesListComponent) 
          },
          
          // إدارة أنواع المستندات (Document Types) - مرتبطة بفورم معين
          { 
            path: 'document-types/:formId', 
            loadComponent: () => import('./views/document-types/document-types-list/document-types-list.component')
              .then(m => m.DocumentTypesListComponent) 
          },
          
          // NOTE: Field options are now managed directly inside the Fields screen
          // If you need a separate management screen again, you can add routes here.
        ]
      }
    ]
  },
  
  // ===== تسجيل الخروج =====
  { 
    path: 'logout', 
    loadComponent: () => import('./views/pages/logout/logout.component')
      .then(m => m.LogoutComponent) 
  },
  
  // ===== صفحة 404 =====
  { 
    path: '**', 
    redirectTo: 'pages/login' 
  }
];