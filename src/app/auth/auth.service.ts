import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError, catchError } from 'rxjs';
import { StorageService } from './storage.service';
import { environment } from '../environments/environment';

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  role?: string;
  userId?: string | number; // User ID from backend
  expiresAt?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/account`;

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
            credentials.username,
            response.role || 'User',
            userId,
            expiresAtMs
          );
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/pages/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    return this.storageService.getToken();
  }

  userName(): string | null {
    return this.storageService.getUsername();
  }

  role(): string | null {
    return this.storageService.getRole();
  }

  private setSession(token: string, username: string, role: string, userId?: number, expiresAtMs?: number): void {
    this.storageService.setToken(token, expiresAtMs);
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

  private isTokenExpired(token: string): boolean {
    const storedExpiry = this.storageService.getTokenExpiryMs();
    if (storedExpiry) {
      return Date.now() >= storedExpiry;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      const currentTime = Math.floor(new Date().getTime() / 1000);
      return currentTime >= expiry;
    } catch {
      return false;
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'حدث خطأ غير متوقع.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `خطأ في الشبكة: ${error.error.message}`;
    } else if (error.error && error.error.errorMessage) {
      errorMessage = error.error.errorMessage;
    }
    return throwError(() => new Error(errorMessage));
  }
}
