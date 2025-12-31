import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const dashboardGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  const userRole = authService.role();
  
  // Only allow Administration role to access Dashboard
  if (authService.isAuthenticated() && userRole === 'Administration') {
    return true;
  } else {
    // Return UrlTree instead of using router.navigate() to avoid transition conflicts
    return router.createUrlTree(['/document-types']);
  }
};

