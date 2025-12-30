import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  const userRole = authService.role();
  
  if (authService.isAuthenticated() && userRole === 'Administration') {
    return true;
  } else {
    // Redirect to dashboard if not admin
    router.navigate(['/dashboard']);
    return false;
  }
};

