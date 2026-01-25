import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ApprovalDelegationService } from '../views/FormBuilder/services/approval-delegation.service';
import { StorageService } from './storage.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Redirect root route based on role and active delegations:
 * - Admin → /dashboard
 * - User with active delegations → /approval-inbox
 * - User without delegations → /my-submissions
 * - Not logged in → /pages/login
 */
export const homeGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const delegationService = inject(ApprovalDelegationService);
  const storageService = inject(StorageService);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/pages/login']);
  }

  const role = (authService.role() || 'User').toLowerCase();
  const isAdmin = role === 'administration' || role === 'admin';

  if (isAdmin) {
    return router.createUrlTree(['/dashboard']);
  }

  // Check if user has active delegations
  const userId = storageService.getUserId()?.toString() || null;
  
  if (userId) {
    return delegationService.getActiveDelegationsForUser(userId).pipe(
      map((delegations) => {
        const hasActiveDelegations = delegations && delegations.length > 0;
        return router.createUrlTree([hasActiveDelegations ? '/approval-inbox' : '/my-submissions']);
      }),
      catchError((error) => {
        console.error('[HomeGuard] Error checking delegations:', error);
        // On error, default to my-submissions
        return of(router.createUrlTree(['/my-submissions']));
      })
    );
  }

  // No user ID - default to my-submissions
  return router.createUrlTree(['/my-submissions']);
};


