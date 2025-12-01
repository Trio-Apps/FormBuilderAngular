import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./form-builder.component').then(m => m.FormBuilderComponent),
    data: { title: 'Form Builder' }
  }
];