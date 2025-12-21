import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageService = inject(StorageService);
  const router = inject(Router);
  const token = storageService.getToken();
  
  // Add token to request if available
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized - token expired or invalid
        if (error.status === 401) {
          // Don't redirect if already on login page or if it's a login request
          const isLoginRequest = req.url.includes('/account/login');
          const isLoginPage = router.url.includes('/pages/login');
          
          if (!isLoginRequest && !isLoginPage) {
            // Clear invalid token and redirect to login
            storageService.clear();
            router.navigate(['/pages/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};