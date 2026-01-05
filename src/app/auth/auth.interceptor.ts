import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { catchError, throwError, tap } from 'rxjs';
import { environment } from '../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageService = inject(StorageService);
  const router = inject(Router);
  const token = storageService.getToken();
  
  // Debug logging (only in development)
  const isDebugMode = environment.config?.enableDebug;
  
  if (isDebugMode) {
    console.log('[AuthInterceptor] Request URL:', req.url);
    console.log('[AuthInterceptor] Token exists:', !!token);
    if (token) {
      console.log('[AuthInterceptor] Token preview:', token.substring(0, 20) + '...');
    }
  }
  
  // Add token to request if available
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    
    if (isDebugMode) {
      console.log('[AuthInterceptor] Added Authorization header to request');
    }
    
    return next(cloned).pipe(
      tap((response) => {
        if (isDebugMode) {
          console.log('[AuthInterceptor] Response received:', {
            url: req.url,
            status: response instanceof HttpErrorResponse ? response.status : 'OK'
          });
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Enhanced error logging
        if (isDebugMode) {
          console.error('[AuthInterceptor] Request failed:', {
            url: req.url,
            method: req.method,
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            errorDetails: error.error?.errors || 'No validation errors in response'
          });
        }
        
        // Handle 401 Unauthorized - token expired or invalid
        if (error.status === 401) {
          // Don't redirect if already on login page or if it's a login request
          const isLoginRequest = req.url.includes('/account/login');
          const isLoginPage = router.url.includes('/pages/login');
          
          if (!isLoginRequest && !isLoginPage) {
            if (isDebugMode) {
              console.warn('[AuthInterceptor] 401 Unauthorized - clearing token and redirecting to login');
            }
            // Clear invalid token and redirect to login
            storageService.clear();
            router.navigate(['/pages/login']);
          }
        }
        
        // Log 404 errors for debugging
        if (error.status === 404 && isDebugMode) {
          console.error('[AuthInterceptor] ⚠️ 404 Not Found:', {
            url: req.url,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'N/A',
            note: '404 instead of 401 suggests:',
            possibleCauses: [
              'API server may not be running',
              'Route/Controller may not be registered',
              'Controller may not be discovered',
              'Check Swagger UI to verify endpoints exist'
            ]
          });
          
          // Additional diagnostic info
          console.error('[AuthInterceptor] Diagnostic Info:', {
            apiBaseUrl: req.url.split('/api')[0] + '/api',
            endpoint: req.url.split('/api')[1],
            method: req.method,
            headers: {
              authorization: req.headers.get('Authorization') ? 'Present' : 'Missing',
              contentType: req.headers.get('Content-Type') || 'Not set'
            }
          });
        }
        
        return throwError(() => error);
      })
    );
  }
  
  // No token - log warning for protected endpoints
  if (isDebugMode && !req.url.includes('/account/login') && !req.url.includes('/account/register')) {
    console.warn('[AuthInterceptor] Request without token:', req.url);
  }
  
  return next(req);
};