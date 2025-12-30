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
    // Redirect to login if not authenticated, or to dashboard if not admin
    if (!isAuthenticated) {
      router.navigate(['/pages/login']);
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  }
};
