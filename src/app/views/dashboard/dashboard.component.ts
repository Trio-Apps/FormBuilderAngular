import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = [
    { title: 'Total Forms', value: '12', color: 'primary', icon: 'fas fa-file-alt' },
    { title: 'Total Submissions', value: '156', color: 'success', icon: 'fas fa-inbox' },
    { title: 'Active Users', value: '24', color: 'info', icon: 'fas fa-users' },
    { title: 'Completion Rate', value: '85%', color: 'warning', icon: 'fas fa-chart-line' }
  ];

  userName = '';
  userEmail = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userName = this.authService.userName() || 'User';
    this.userEmail = ''; // Email not stored in current implementation
  }
}