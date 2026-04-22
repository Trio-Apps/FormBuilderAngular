import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError, catchError, map, finalize, shareReplay } from 'rxjs';
import { StorageService } from './storage.service';
import { environment } from '../environments/environment';
import { PermissionService } from '../services/permission.service';

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  role?: string;
  userId?: string | number; // User ID from backend
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
  errorMessage?: string;
  permissions?: string[]; // Optional: permissions from login response
}

export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/account`;
  private permissionService = inject(PermissionService);
  private refreshRequest$: Observable<string> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private storageService: StorageService
  ) {}

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      username: credentials.username,
      password: credentials.password
    }).pipe(
      tap((response: LoginResponse) => {
        if (response.success && response.token) {
          // Extract userId from response or from JWT token
          let userId: number | undefined = undefined;
          
          // Try to get userId from response
          if (response.userId) {
            userId = typeof response.userId === 'string' ? parseInt(response.userId, 10) : response.userId;
          } else {
            // Try to extract userId from JWT token
            try {
              const payload = JSON.parse(atob(response.token.split('.')[1]));
              if (payload.userId || payload.sub || payload.nameid) {
                const tokenUserId = payload.userId || payload.sub || payload.nameid;
                userId = typeof tokenUserId === 'string' ? parseInt(tokenUserId, 10) : tokenUserId;
              }
            } catch (e) {
              console.warn('[AuthService] Could not extract userId from token');
            }
          }
          
          const parsedExpiry = response.expiresAt ? Date.parse(response.expiresAt) : NaN;
          const expiresAtMs = Number.isNaN(parsedExpiry)
            ? Date.now() + environment.security.tokenExpiry * 1000
            : parsedExpiry;

          this.setSession(
            response.token,
            response.refreshToken,
            credentials.username,
            response.role || 'User',
            userId,
            expiresAtMs,
            this.parseExpiryMs(response.refreshTokenExpiresAt)
          );
          
          // Load user permissions after successful login
          // If permissions are included in the response, use them directly
          if (response.permissions && response.permissions.length > 0) {
            this.permissionService.setPermissions(response.permissions);
            console.log('[AuthService] ✅ Permissions set from login response:', response.permissions);
          } else {
            // Otherwise, refresh them from the API (clears cache first)
            this.permissionService.refreshPermissions().subscribe({
              next: (permissions) => {
                console.log('[AuthService] ✅ Permissions loaded after login:', permissions);
              },
              error: (err) => {
                console.warn('[AuthService] ⚠️ Failed to load permissions:', err);
              }
            });
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    // Clear permissions first
    this.permissionService.clearPermissions();
    this.clearSession();
    this.router.navigate(['/pages/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const isExpired = token ? this.isTokenExpired(token) : true;
    const hasRefreshToken = this.storageService.hasRefreshToken();
    const result = (!!token && !isExpired) || hasRefreshToken;
    
    console.log('[AuthService] isAuthenticated check:', {
      hasToken: !!token,
      isExpired,
      hasRefreshToken,
      result,
      tokenPreview: token ? token.substring(0, 20) + '...' : null
    });
    
    return result;
  }

  getToken(): string | null {
    return this.storageService.getToken();
  }

  getRefreshToken(): string | null {
    return this.storageService.getRefreshToken();
  }

  userName(): string | null {
    return this.storageService.getUsername();
  }

  role(): string | null {
    return this.storageService.getRole();
  }

  refreshAccessToken(): Observable<string> {
    const currentRefreshToken = this.storageService.getRefreshToken();
    if (!currentRefreshToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh-token`, {
        refreshToken: currentRefreshToken
      }).pipe(
        map((response) => {
          if (!response.success || !response.token) {
            throw new Error(response.errorMessage || 'Failed to refresh session.');
          }

          const accessTokenExpiryMs = this.parseExpiryMs(response.expiresAt);
          const refreshTokenExpiryMs = this.parseExpiryMs(response.refreshTokenExpiresAt);

          this.setSession(
            response.token,
            response.refreshToken || currentRefreshToken,
            this.userName() || '',
            this.role() || 'User',
            this.storageService.getUserId() || undefined,
            accessTokenExpiryMs,
            refreshTokenExpiryMs
          );

          return response.token;
        }),
        catchError((error) => {
          this.permissionService.clearPermissions();
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay(1)
      );
    }

    return this.refreshRequest$;
  }

  private setSession(
    token: string,
    refreshToken: string | undefined,
    username: string,
    role: string,
    userId?: number,
    expiresAtMs?: number,
    refreshTokenExpiresAtMs?: number
  ): void {
    this.storageService.setToken(token, expiresAtMs);
    if (refreshToken) {
      this.storageService.setRefreshToken(refreshToken, refreshTokenExpiresAtMs);
    }
    this.storageService.setUserInfo(username, role, userId);
    
    console.log('[AuthService] Session set:', {
      username: username,
      role: role,
      userId: userId,
      hasToken: !!token
    });
  }

  private clearSession(): void {
    this.storageService.clear();
  }

  private parseExpiryMs(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsedExpiry = Date.parse(value);
    return Number.isNaN(parsedExpiry) ? undefined : parsedExpiry;
  }

  private isTokenExpired(token: string): boolean {
    const storedExpiry = this.storageService.getTokenExpiryMs();
    if (storedExpiry) {
      const isExpired = Date.now() >= storedExpiry;
      console.log('[AuthService] Token expiry check (stored):', {
        storedExpiry,
        currentTime: Date.now(),
        isExpired,
        timeUntilExpiry: storedExpiry - Date.now()
      });
      return isExpired;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      const currentTime = Math.floor(new Date().getTime() / 1000);
      const isExpired = currentTime >= expiry;
      console.log('[AuthService] Token expiry check (JWT):', {
        expiry,
        currentTime,
        isExpired,
        timeUntilExpiry: expiry - currentTime
      });
      return isExpired;
    } catch (error) {
      console.warn('[AuthService] Error parsing token expiry:', error);
      return false;
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'حدث خطأ غير متوقع.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `خطأ في الشبكة: ${error.error.message}`;
    } else if (typeof error.error === 'string' && error.error.trim()) {
      errorMessage = error.error;
    } else if (error.error && typeof error.error.message === 'string' && error.error.message.trim()) {
      errorMessage = error.error.message;
    } else if (error.error && error.error.message && typeof error.error.message.value === 'string' && error.error.message.value.trim()) {
      errorMessage = error.error.message.value;
    } else if (error.error && error.error.message && typeof error.error.message.name === 'string' && error.error.message.name.trim()) {
      errorMessage = error.error.message.name;
    } else if (error.error && error.error.errorMessage) {
      errorMessage = error.error.errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}
