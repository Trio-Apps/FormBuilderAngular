import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  const isAuthenticated = authService.isAuthenticated();
  const token = authService.getToken();
  const username = authService.userName();
  const role = authService.role();
  
  console.log('[authGuard] Checking authentication:', {
    isAuthenticated,
    hasToken: !!token,
    username,
    role,
    currentUrl: router.url
  });
  
  if (isAuthenticated) {
    console.log('[authGuard] ✅ Access granted');
    return true;
  } else {
    console.log('[authGuard] ❌ Access denied - redirecting to login');
    // Return UrlTree instead of using router.navigate() to avoid transition conflicts
    return router.createUrlTree(['/pages/login']);
  }
};