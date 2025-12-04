import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7276/api/account'; // endpoint جديد

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // تسجيل الدخول
  login(credentials: any): Observable<any> {
    const apiCredentials = {
      username: credentials.username, // backend يستخدم username
      password: credentials.password
    };
    
    return this.http.post(`${this.apiUrl}/login`, apiCredentials).pipe(
      tap((response: any) => {
        console.log('API Response:', response);
        if (response.token) { // التحقق من وجود token
          this.setToken(response.token, credentials.username);
        }
      })
    );
  }

  // تسجيل الخروج
  logout(): void {
    this.clearToken();
    this.router.navigate(['/pages/login']);
  }

  // للتحقق إذا المستخدم مسجل الدخول
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // يمنع المستخدم من العودة إلى صفحة login إذا كان مسجل الدخول
  redirectIfAuthenticated(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  // الحصول على الـ token من localStorage
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // تخزين token و username
  private setToken(token: string, username: string): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_name', username);
  }

  // إزالة token و username عند تسجيل الخروج
  private clearToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
  }
}
