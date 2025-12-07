import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError, catchError } from 'rxjs';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  role?: string;
  expiresAt?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7276/api/account';

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: LoginResponse) => {
        if (response.success && response.token) {
          this.setSession(response.token, credentials.username, response.role!);
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
    return localStorage.getItem('auth_token');
  }

  userName(): string | null {
    return localStorage.getItem('user_name');
  }

  role(): string | null {
    return localStorage.getItem('user_role');
  }

  private setSession(token: string, username: string, role: string): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_name', username);
    localStorage.setItem('user_role', role);
  }

  private clearSession(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      return (Math.floor(new Date().getTime() / 1000)) >= expiry;
    } catch {
      return true;
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
