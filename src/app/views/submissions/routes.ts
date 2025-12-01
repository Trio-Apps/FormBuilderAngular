import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../submissions/submissions-list/submissions-list.component').then(m => m.SubmissionsListComponent),
    data: { title: 'Submissions' }
 },
//   {
//     path: 'view/:id',
//     loadComponent: () => import('./submission-view.component').then(m => m.SubmissionViewComponent),
//     data: { title: 'View Submission' }
//   }
];