import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.isAuthenticated()) {
    // إذا كان مسجلاً، امنعه من الوصول إلى Login
    // Redirect authenticated users to Forms
    return router.createUrlTree(['/form-builder/forms']);
  }
  
  // إذا لم يكن مسجلاً، اسمح له بالوصول
  return true;
};