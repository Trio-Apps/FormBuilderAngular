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
    private router: Router
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
        this.errorMessage = error.error?.message || 'An error occurred';
        this.isLoading = false;
      }
    });
  }

  private redirectBasedOnRole(): void {
    // After login, go to Forms
    this.router.navigate(['/form-builder/forms'], { replaceUrl: true }).catch(err => {
      console.error('Navigation error:', err);
      // Fallback to dashboard-menus if forms route fails for any reason
      this.router.navigate(['/dashboard-menus'], { replaceUrl: true });
    });
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
