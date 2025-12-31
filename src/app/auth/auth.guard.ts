import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Return UrlTree instead of using router.navigate() to avoid transition conflicts
    return router.createUrlTree(['/pages/login']);
  }
};