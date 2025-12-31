import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { loginGuard } from './auth/login.guard';
import { dashboardGuard } from './auth/dashboard.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  // ===== المسارات العامة =====
  { 
    path: '', 
    redirectTo: 'document-types', 
    pathMatch: 'full' 
  },
  
  // ===== صفحة عرض الفورم العامة (بدون تسجيل دخول) =====
  {
    path: 'forms/view/:formCode',
    loadComponent: () => import('./views/public-form/form-view.component')
      .then(m => m.FormViewComponent)
  },
  
  // ===== صفحة نجاح إرسال النموذج =====
  {
    path: 'forms/submission/success',
    loadComponent: () => import('./views/public-form/form-submission-success/form-submission-success.component')
      .then(m => m.FormSubmissionSuccessComponent)
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
      // ===== Dashboard ===== (Admin only)
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/routes').then(m => m.routes),
        canActivate: [dashboardGuard] // Only Administration role can access
      },

      // ===== Projects =====
      {
        path: 'projects',
        loadComponent: () => import('./views/projects/components/projects-list/projects-list.component')
          .then(m => m.ProjectsListComponent)
      },

      // ===== Document Types ===== (Available for all authenticated users)
      {
        path: 'document-types',
        loadComponent: () => import('./views/document-types/document-types-list/document-types-list.component')
          .then(m => m.DocumentTypesListComponent),
        canActivate: [authGuard] // All authenticated users can access
      },

      // ===== Form Submissions by Document Type =====
      {
        path: 'document-types/:documentTypeId/submissions',
        loadComponent: () => import('./views/form-submissions/form-submissions-list/form-submissions-list.component')
          .then(m => m.FormSubmissionsListComponent)
      },

      // ===== Create New Form Submission =====
      {
        path: 'document-types/:documentTypeId/submissions/new',
        loadComponent: () => import('./views/form-submissions/form-submission-create/form-submission-create.component')
          .then(m => m.FormSubmissionCreateComponent)
      },

      // ===== Edit Form Submission =====
      {
        path: 'document-types/:documentTypeId/submissions/:submissionId/edit',
        loadComponent: () => import('./views/form-submissions/form-submission-create/form-submission-create.component')
          .then(m => m.FormSubmissionCreateComponent)
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
          
          // إدارة أنواع المرفقات (Attachment Types)
          { 
            path: 'attachment-types', 
            loadComponent: () => import('./views/attachment-types/attachment-types-list/attachment-types-list.component')
              .then(m => m.AttachmentTypesListComponent) 
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