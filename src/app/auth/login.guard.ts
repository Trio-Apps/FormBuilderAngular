import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.isAuthenticated()) {
    // إذا كان مسجلاً، امنعه من الوصول إلى Login
    // Return UrlTree instead of using router.navigate() to avoid transition conflicts
    return router.createUrlTree(['/form-builder']);
  }
  
  // إذا لم يكن مسجلاً، اسمح له بالوصول
  return true;
};