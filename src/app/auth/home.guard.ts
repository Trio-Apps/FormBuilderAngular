import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Redirect root route based on role:
 * - Admin → /dashboard
 * - User  → /document-types
 * - Not logged in → /pages/login
 */
export const homeGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/pages/login']);
  }

  const role = (authService.role() || 'User').toLowerCase();
  const isAdmin = role === 'administration' || role === 'admin';

  return router.createUrlTree([isAdmin ? '/dashboard' : '/document-types']);
};


