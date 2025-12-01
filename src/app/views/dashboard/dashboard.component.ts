import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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

  ngOnInit(): void {
    this.userName = localStorage.getItem('user_name') || 'User';
    this.userEmail = localStorage.getItem('user_email') || '';
  }
}