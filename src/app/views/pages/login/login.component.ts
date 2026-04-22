import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// CoreUI Components
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  ContainerComponent,
  FormCheckComponent,
  FormCheckInputDirective,
  FormCheckLabelDirective,
  FormControlDirective,
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';

import { AuthService } from '../../../auth/auth.service';
import { ApprovalDelegationService } from '../../FormBuilder/services/approval-delegation.service';
import { StorageService } from '../../../auth/storage.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ContainerComponent, 
    RowComponent, 
    ColComponent,
    CardComponent, 
    CardBodyComponent, 
    FormDirective, 
    InputGroupComponent, 
    InputGroupTextDirective, 
    IconDirective, 
    FormControlDirective, 
    ButtonDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  credentials = {
    username: '',
    password: '',
    rememberMe: false
  };
  
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private delegationService: ApprovalDelegationService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.redirectBasedOnRole();
    }
  }

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Please enter both username and password';
      this.isLoading = false;
      return;
    }

    this.authService.login(this.credentials).subscribe({
      next: (response: any) => {
        if (response && response.token) {
          this.successMessage = 'Login successful! Redirecting...';
          // Wait a bit for the session to be set, then redirect based on role
          setTimeout(() => {
            this.redirectBasedOnRole();
          }, 500); // Reduced timeout for faster redirect
        } else {
          this.errorMessage = response.errorMessage || 'Login failed';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || error?.message || 'An error occurred';
        this.isLoading = false;
      }
    });
  }

  private redirectBasedOnRole(): void {
    // Redirect based on user role and active delegations
    const role = (this.authService.role() || 'User').toLowerCase();
    const isAdmin = role === 'administration' || role === 'admin';
    
    if (isAdmin) {
      // Admin goes to dashboard
      this.router.navigate(['/dashboard'], { replaceUrl: true }).catch(err => {
        console.error('Navigation error:', err);
        // Fallback to form-builder if dashboard route fails
        this.router.navigate(['/form-builder/forms'], { replaceUrl: true });
      });
    } else {
      // Check if user has active delegations
      const userId = this.storageService.getUserId()?.toString() || null;
      
      if (userId) {
        // Check for active delegations
        this.delegationService.getActiveDelegationsForUser(userId).subscribe({
          next: (delegations) => {
            const hasActiveDelegations = delegations && delegations.length > 0;
            
            if (hasActiveDelegations) {
              // User has active delegations - redirect to approval inbox
              console.log('[Login] User has active delegations, redirecting to approval inbox');
              this.router.navigate(['/approval-inbox'], { replaceUrl: true }).catch(err => {
                console.error('Navigation error:', err);
                // Fallback to my-submissions if approval-inbox route fails
                this.router.navigate(['/my-submissions'], { replaceUrl: true });
              });
            } else {
              // No active delegations - redirect to my-submissions
              console.log('[Login] User has no active delegations, redirecting to my-submissions');
              this.router.navigate(['/my-submissions'], { replaceUrl: true }).catch(err => {
                console.error('Navigation error:', err);
                // Fallback to dashboard-menus if my-submissions route fails
                this.router.navigate(['/dashboard-menus'], { replaceUrl: true });
              });
            }
          },
          error: (error) => {
            console.error('[Login] Error checking delegations:', error);
            // On error, default to my-submissions
            this.router.navigate(['/my-submissions'], { replaceUrl: true }).catch(err => {
              console.error('Navigation error:', err);
              this.router.navigate(['/dashboard-menus'], { replaceUrl: true });
            });
          }
        });
      } else {
        // No user ID - default to my-submissions
        this.router.navigate(['/my-submissions'], { replaceUrl: true }).catch(err => {
          console.error('Navigation error:', err);
          this.router.navigate(['/dashboard-menus'], { replaceUrl: true });
        });
      }
    }
  }

  clearForm() {
    this.credentials = {
      username: '',
      password: '',
      rememberMe: false
    };
    this.errorMessage = '';
    this.successMessage = '';
  }
}
