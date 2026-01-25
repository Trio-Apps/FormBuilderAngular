import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { ApprovalDelegationService } from '../../FormBuilder/services/approval-delegation.service';
import { StorageService } from '../../../auth/storage.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: ``
})
export class HomeRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly delegationService = inject(ApprovalDelegationService);
  private readonly storageService = inject(StorageService);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/pages/login');
      return;
    }

    const role = (this.authService.role() || 'User').toLowerCase();
    const isAdmin = role === 'administration' || role === 'admin';
    
    if (isAdmin) {
      this.router.navigateByUrl('/dashboard');
    } else {
      // Check if user has active delegations
      const userId = this.storageService.getUserId()?.toString() || null;
      
      if (userId) {
        this.delegationService.getActiveDelegationsForUser(userId).subscribe({
          next: (delegations) => {
            const hasActiveDelegations = delegations && delegations.length > 0;
            this.router.navigateByUrl(hasActiveDelegations ? '/approval-inbox' : '/my-submissions');
          },
          error: (error) => {
            console.error('[HomeRedirect] Error checking delegations:', error);
            // On error, default to my-submissions
            this.router.navigateByUrl('/my-submissions');
          }
        });
      } else {
        // No user ID - default to my-submissions
        this.router.navigateByUrl('/my-submissions');
      }
    }
  }
}


