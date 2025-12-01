import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7276/api/Auth';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: any): Observable<any> {
    const apiCredentials = {
      email: credentials.email,
      password: credentials.password
    };
    
    return this.http.post(`${this.apiUrl}/Login`, apiCredentials).pipe(
      tap((response: any) => {
        console.log('API Response:', response);
        if (response.success) {
          this.setTokens(response.user);
        }
      })
    );
  }

  logout(): void {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      this.http.post(`${this.apiUrl}/Logout`, { userId }).subscribe();
    }
    
    this.clearTokens();
    this.router.navigate(['/pages/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // دالة للتحقق إذا كان مسجلاً ويمنعه من العودة إلى Login
  redirectIfAuthenticated(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(user: any): void {
    localStorage.setItem('auth_token', user.token);
    localStorage.setItem('refresh_token', user.refreshToken);
    localStorage.setItem('user_email', user.email);
    localStorage.setItem('user_name', user.displayName || user.email);
    localStorage.setItem('user_id', user.userId || '');
  }

  private clearTokens(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
  }
}