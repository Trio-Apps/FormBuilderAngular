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
    expectedRoles: ['Administration', 'Admin', 'admin', 'ADMIN']
  });
  
  // Allow multiple admin role names (case-insensitive)
  const adminRoles = ['administration', 'admin'];
  const isAdmin = userRole && adminRoles.includes(userRole.toLowerCase());
  
  if (isAuthenticated && isAdmin) {
    console.log('[adminGuard] ✅ Access granted - User is Admin');
    return true;
  } else {
    console.log('[adminGuard] ❌ Access denied:', {
      reason: !isAuthenticated ? 'Not authenticated' : 'Not an admin',
      currentRole: userRole
    });
    // Return UrlTree instead of using router.navigate() to avoid transition conflicts
    if (!isAuthenticated) {
      return router.createUrlTree(['/pages/login']);
    } else {
      return router.createUrlTree(['/dashboard']);
    }
  }
};
