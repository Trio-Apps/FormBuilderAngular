import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    // إذا كان مسجلاً، امنعه من الوصول إلى Login
    router.navigate(['/dashboard']);
    return false;
  }
  
  // إذا لم يكن مسجلاً، اسمح له بالوصول
  return true;
};