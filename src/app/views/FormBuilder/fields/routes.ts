import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../tabs/tabs-list/tabs-list.component').then(m => m.TabsListComponent),
    data: { title: 'Fields' }
  },
  {
    path: 'create',
    loadComponent: () => import('../../tabs/tab-create/tab-create.component').then(m => m.TabCreateComponent),
    data: { title: 'Create Field' }
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('../../tabs/tab-edit/tab-edit.component').then(m => m.TabEditComponent),
    data: { title: 'Edit Field' }
  }
];