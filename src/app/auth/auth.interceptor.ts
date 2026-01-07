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
  
  // No token - handle requests without authentication
  const isPublicFormViewRoute = router.url.includes('/forms/view/');
  const isPublicFormEndpoint = req.url.includes('/FormBuilder/code/') || 
                               req.url.includes('/FormBuilder/by-code/') ||
                               req.url.includes('/FormBuilder/public/') ||
                               req.url.includes('/FormRules/form/') ||
                               req.url.includes('/FormFields/tab/') ||
                               req.url.includes('/FormGrids/') ||
                               req.url.includes('/FormTabs/') ||
                               isPublicFormViewRoute;
  
  if (isDebugMode && !req.url.includes('/account/login') && !req.url.includes('/account/register')) {
    console.warn('[AuthInterceptor] Request without token:', {
      url: req.url,
      method: req.method,
      isPublicFormViewRoute: isPublicFormViewRoute,
      isPublicFormEndpoint: isPublicFormEndpoint,
      currentRoute: router.url
    });
  }
  
  // Handle errors for requests without token (especially for public forms)
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 for requests without token
      if (error.status === 401) {
        // Don't redirect for public form endpoints or when on public form view route
        if (isPublicFormEndpoint || isPublicFormViewRoute) {
          if (isDebugMode) {
            console.log('[AuthInterceptor] Public form endpoint - allowing 401 without redirect:', req.url);
          }
          // Just return the error, don't redirect
          return throwError(() => error);
        }
        
        // For other endpoints, redirect to login if not already there
        const isLoginPage = router.url.includes('/pages/login');
        if (!isLoginPage) {
          if (isDebugMode) {
            console.warn('[AuthInterceptor] 401 Unauthorized (no token) - redirecting to login');
          }
          storageService.clear();
          router.navigate(['/pages/login'], {
            queryParams: { returnUrl: router.url }
          });
        }
      }
      
      // Log 404 errors for debugging (especially for public forms)
      if (error.status === 404) {
        if (isDebugMode) {
          const isKnownMissing = [
            '/api/FormSubmissionGridRows/grid/',
            '/api/FormSubmissionGridRows/submission/',
            '/api/FormSubmissionGridRows/complete',
            '/api/FormSubmissionGridRows/bulk',
            '/api/FormSubmissionGridCells/bulk'
          ].some(endpoint => req.url.includes(endpoint));
          
          if (!isKnownMissing) {
            console.error('[AuthInterceptor] ⚠️ 404 Not Found:', {
              url: req.url,
              method: req.method,
              isPublicFormEndpoint: isPublicFormEndpoint,
              isPublicFormViewRoute: isPublicFormViewRoute,
              currentRoute: router.url,
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
          } else if (isPublicFormEndpoint) {
            console.log('[AuthInterceptor] 404 for public form endpoint (may be expected):', req.url);
          }
        }
      }
      
      return throwError(() => error);
    })
  );
};