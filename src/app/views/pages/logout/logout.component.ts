import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: '<div class="text-center mt-5"><p>Logging out...</p></div>'
})
export class LogoutComponent implements OnInit {
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.logout();
  }

  logout() {
    // استخدام AuthService لمسح جميع بيانات المصادقة
    this.authService.logout();
  }
}