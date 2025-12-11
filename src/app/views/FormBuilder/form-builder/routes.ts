import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'form-builder',
    loadComponent: () => import('../form-builder/form-builder.component')
      .then(m => m.FormBuilderComponent),
    children: [
      {
        path: '',
        redirectTo: 'forms',
        pathMatch: 'full'
      },
      {
        path: 'forms',
        loadComponent: () => import('../components/forms-list/forms-list.component')
          .then(m => m.FormsListComponent)
      },
      {
        path: 'tabs/:formId',
        loadComponent: () => import('../../tabs/tabs-list/tabs-list.component')
          .then(m => m.TabsListComponent)
      },
      {
        path: 'fields/:tabId',
        loadComponent: () => import('../../fields/fields-list/fields-list.component')
          .then(m => m.FieldsListComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'form-builder' }
];
