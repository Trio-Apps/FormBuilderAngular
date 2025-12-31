import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  const userRole = authService.role();
  const isAuthenticated = authService.isAuthenticated();
  
  console.log('[adminGuard] Checking access:', {
    isAuthenticated,
    userRole,
    expectedRole: 'Administration'
  });
  
  // Only allow Administration role to access
  if (isAuthenticated && userRole === 'Administration') {
    console.log('[adminGuard] Access granted');
    return true;
  } else {
    console.log('[adminGuard] Access denied, redirecting...');
    // Return UrlTree instead of using router.navigate() to avoid transition conflicts
    if (!isAuthenticated) {
      return router.createUrlTree(['/pages/login']);
    } else {
      return router.createUrlTree(['/dashboard']);
    }
  }
};
