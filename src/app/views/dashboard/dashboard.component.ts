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
    { title: 'Total Forms', value: '12', icon: 'pi pi-file' },
    { title: 'Total Submissions', value: '156', icon: 'pi pi-inbox' },
    { title: 'Active Users', value: '24', icon: 'pi pi-users' },
    { title: 'Completion Rate', value: '85%', icon: 'pi pi-chart-line' }
  ];

  userName = '';
  userEmail = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userName = this.authService.userName() || 'User';
    this.userEmail = ''; // Email not stored in current implementation
  }
}