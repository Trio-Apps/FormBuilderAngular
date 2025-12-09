import { Routes } from '@angular/router';
import { FormBuilderComponent } from './form-builder.component';

export const routes: Routes = [
  {
    path: '',
    component: FormBuilderComponent,
    children: [
      // Forms
      {
        path: '',
        loadComponent: () => import('../form-builder/form-builder.component')
          .then(m => m.FormBuilderComponent),
        data: { title: 'Forms List' }
      },

      // Tabs
      {
        path: 'tabs',
        loadComponent: () => import('../../tabs/tabs-list/tabs-list.component')
          .then(m => m.TabsListComponent),
        data: { title: 'Tabs List' }
      },
      {
        path: 'tabs/create',
        loadComponent: () => import('../../tabs/tab-create/tab-create.component')
          .then(m => m.TabCreateComponent),
        data: { title: 'Create Tab' }
      },
      {
        path: 'tabs/edit/:id',
        loadComponent: () => import('../../tabs/tab-edit/tab-edit.component')
          .then(m => m.TabEditComponent),
        data: { title: 'Edit Tab' }
      },

      // Fields
      {
        path: 'fields',
        loadComponent: () => import('../../fields/fields-list/fields-list.component')
          .then(m => m.FieldsListComponent),
        data: { title: 'Fields List' }
      },
      {
        path: 'fields/create',
        loadComponent: () => import('../../fields/field-create/field-create.component')
          .then(m => m.FieldCreateComponent),
        data: { title: 'Create Field' }
      },
      {
        path: 'fields/edit/:id',
        loadComponent: () => import('../../fields/field-edit/field-edit.component')
          .then(m => m.FieldEditComponent),
        data: { title: 'Edit Field' }
      },

      // Submissions
      {
        path: 'submissions',
        loadComponent: () => import('../../submissions/submissions-list/submissions-list.component')
          .then(m => m.SubmissionsListComponent),
        data: { title: 'Submissions' }
      }
    ]
  }
];
