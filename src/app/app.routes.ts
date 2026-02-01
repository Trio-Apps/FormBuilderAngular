import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { loginGuard } from './auth/login.guard';
import { dashboardGuard } from './auth/dashboard.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  // ===== المسارات العامة =====
  { 
    path: '', 
    loadComponent: () => import('./views/pages/home-redirect/home-redirect.component')
      .then(m => m.HomeRedirectComponent),
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
  
  // ===== صفحة رفض الوصول (Access Denied) =====
  {
    path: 'access-denied',
    loadComponent: () => import('./views/pages/access-denied/access-denied.component')
      .then(m => m.AccessDeniedComponent)
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

      // ===== Dashboard Menus View (User) =====
      {
        path: 'dashboard-menus',
        loadComponent: () => import('./views/table-menus/dashboard-menus-view/dashboard-menus-view.component')
          .then(m => m.DashboardMenusViewComponent),
        canActivate: [authGuard] // All authenticated users can access
      },

      // ===== Table Menus Management (Admin) =====
      {
        path: 'table-menus',
        loadComponent: () => import('./views/table-menus/table-menus-list/table-menus-list.component')
          .then(m => m.TableMenusListComponent),
        canActivate: [authGuard, adminGuard] // Admin only
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

      // ===== Alert Rules ===== (Admin only)
      {
        path: 'alert-rules',
        loadComponent: () => import('./views/alert-rules/alert-rules-manage/alert-rules-manage.component')
          .then(m => m.AlertRulesManageComponent),
        canActivate: [authGuard, adminGuard]
      },

      // ===== SMTP Configs ===== (Admin only)
      {
        path: 'smtp-configs',
        loadComponent: () => import('./views/smtp-configs/smtp-configs-manage/smtp-configs-manage.component')
          .then(m => m.SmtpConfigsManageComponent),
        canActivate: [authGuard, adminGuard]
      },

      // ===== Email Templates ===== (Admin only)
      {
        path: 'email-templates',
        loadComponent: () => import('./views/email-templates/email-templates-manage/email-templates-manage.component')
          .then(m => m.EmailTemplatesManageComponent),
        canActivate: [authGuard, adminGuard]
      },

      // ===== Approval Workflows ===== (Available for all authenticated users)
      {
        path: 'approval-workflows',
        loadComponent: () => import('./views/approval-workflows/approval-workflows-list/approval-workflows-list.component')
          .then(m => m.ApprovalWorkflowsListComponent),
        canActivate: [authGuard] // All authenticated users can access
      },

      // ===== Approval Stages ===== (Available for all authenticated users)
      {
        path: 'approval-workflows/:workflowId/stages',
        loadComponent: () => import('./views/approval-workflows/approval-stages-list/approval-stages-list.component')
          .then(m => m.ApprovalStagesListComponent),
        canActivate: [authGuard] // All authenticated users can access
      },

      // ===== Stage Assignees =====
      {
        path: 'approval-workflows/:workflowId/stages/:stageId/assignees',
        loadComponent: () => import('./views/approval-workflows/stage-assignees-list/stage-assignees-list.component')
          .then(m => m.StageAssigneesListComponent),
        canActivate: [authGuard]
      },

   

      // ===== Approval Delegations =====
      {
        path: 'approval-delegations',
        loadComponent: () => import('./views/approval-workflows/approval-delegations-list/approval-delegations-list.component')
          .then(m => m.ApprovalDelegationsListComponent),
        canActivate: [authGuard]
      },

      // ===== My Submissions ===== (User views their own submissions)
      {
        path: 'my-submissions',
        loadComponent: () => import('./views/my-submissions/my-submissions.component')
          .then(m => m.MySubmissionsComponent),
        canActivate: [authGuard]  // ✅ أي مستخدم مسجل يستطيع رؤية طلباته
      },

      // ===== Approval Inbox / My Submissions =====
      {
        path: 'approval-inbox',
        loadComponent: () => import('./views/approval-workflows/approval-inbox/approval-inbox.component')
          .then(m => m.ApprovalInboxComponent),
        canActivate: [authGuard]  // ✅ Admin يوافق/يرفض، User يشاهد طلباته فقط
      },

      // ===== Approvals History ===== (Admin only)
      {
        path: 'approvals-history',
        loadComponent: () => import('./views/approval-workflows/approvals-history-list/approvals-history-list.component')
          .then(m => m.ApprovalsHistoryListComponent),
        canActivate: [authGuard, adminGuard]
      },

      // ===== Approval History =====
      {
        path: 'form-submissions/:submissionId/approval-history',
        loadComponent: () => import('./views/approval-workflows/approval-history/approval-history.component')
          .then(m => m.ApprovalHistoryComponent),
        canActivate: [authGuard]
      },

      // ===== Form Submissions by Document Type =====
      {
        path: 'document-types/:documentTypeId/submissions',
        loadComponent: () => import('./views/form-submissions/form-submissions-list/form-submissions-list.component')
          .then(m => m.FormSubmissionsListComponent)
          .catch(err => {
            console.error('Error loading FormSubmissionsListComponent:', err);
            throw err;
          })
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

      // ===== Form Builder System ===== (Admin only)
      {
        path: 'form-builder',
        loadComponent: () => import('./views/FormBuilder/form-builder/form-builder.component')
          .then(m => m.FormBuilderComponent),
        canActivate: [authGuard, adminGuard], // Admin only - protect all form-builder routes
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
          
          // إدارة Stored Procedures (مثال: form-builder/stored-procedures)
          { 
            path: 'stored-procedures', 
            loadComponent: () => import('./views/FormBuilder/components/stored-procedures-list/stored-procedures-list.component')
              .then(m => m.StoredProceduresListComponent) 
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