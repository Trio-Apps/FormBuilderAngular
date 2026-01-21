import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: ``
})
export class HomeRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/pages/login');
      return;
    }

    const role = (this.authService.role() || 'User').toLowerCase();
    const isAdmin = role === 'administration' || role === 'admin';
    this.router.navigateByUrl(isAdmin ? '/dashboard' : '/document-types');
  }
}


