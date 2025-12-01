import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: '<div class="text-center mt-5"><p>Logging out...</p></div>'
})
export class LogoutComponent implements OnInit {
  
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.logout();
  }

  logout() {
    // مسح جميع بيانات المصادقة
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    
    // تأخير قليل ثم التوجيه إلى Login
    setTimeout(() => {
      this.router.navigate(['/pages/login']);
    }, 1000);
  }
}