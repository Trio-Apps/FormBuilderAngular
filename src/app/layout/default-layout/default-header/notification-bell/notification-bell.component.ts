import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  DropdownComponent,
  DropdownToggleDirective,
  DropdownMenuDirective,
  DropdownItemDirective,
  DropdownHeaderDirective,
  DropdownDividerDirective,
  BadgeComponent
} from '@coreui/angular';

import { NotificationService } from '../../../../services/notification.service';
import { AuthService } from '../../../../auth/auth.service';
import { StorageService } from '../../../../auth/storage.service';
import { NotificationDto, parseNotificationDate } from '../../../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    DropdownComponent,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownItemDirective,
    DropdownHeaderDirective,
    DropdownDividerDirective,
    BadgeComponent
  ],
  template: `
    <c-dropdown [popperOptions]="{ placement: 'bottom-end' }" variant="nav-item">
      <button 
        [caret]="false" 
        cDropdownToggle 
        class="notification-bell-btn position-relative"
        aria-label="Notifications"
        (click)="onDropdownOpen()"
      >
        <svg 
          class="notification-icon" 
          [class.has-unread]="hasUnread()"
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        @if (unreadCount() > 0) {
          <span class="notification-badge">
            {{ unreadCount() > 99 ? '99+' : unreadCount() }}
          </span>
        }
      </button>

      <div cDropdownMenu class="notification-dropdown">
        <div cDropdownHeader class="notification-header">
          <span class="header-title">Notifications</span>
          @if (unreadCount() > 0) {
            <button class="mark-all-read-btn" (click)="markAllAsRead($event)">
              Mark all read
            </button>
          }
        </div>

        <div class="notification-list">
          @if (loading()) {
            <div class="notification-loading">
              <div class="spinner"></div>
              <span>Loading...</span>
            </div>
          } @else if (notifications().length === 0) {
            <div class="notification-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>No notifications</span>
            </div>
          } @else {
            @for (notification of notifications(); track notification.id) {
              <div 
                class="notification-item"
                [class.unread]="!notification.isRead"
                (click)="handleNotificationClick(notification)"
              >
                <div class="notification-icon-wrapper" [ngClass]="getTypeClass(notification.type)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    @switch (notification.type) {
                      @case ('Success') {
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      }
                      @case ('Warning') {
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      }
                      @case ('Error') {
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      }
                      @default {
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      }
                    }
                  </svg>
                </div>
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-message">{{ notification.message }}</div>
                  <div class="notification-time">{{ formatTime(notification) }}</div>
                </div>
                @if (!notification.isRead) {
                  <div class="unread-indicator"></div>
                }
              </div>
            }
          }
        </div>

        @if (notifications().length > 0) {
          <div class="notification-footer">
            <button class="view-all-btn" (click)="viewAllNotifications()">
              View all notifications
            </button>
          </div>
        }
      </div>
    </c-dropdown>
  `,
  styles: [`
    .notification-bell-btn {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
      color: var(--cui-body-color, #4f5d73);
    }

    .notification-bell-btn:hover {
      background: var(--cui-tertiary-bg, #f0f4f8);
    }

    .notification-icon {
      transition: all 0.3s ease;
    }

    .notification-icon.has-unread {
      animation: bellShake 0.5s ease-in-out;
    }

    @keyframes bellShake {
      0%, 100% { transform: rotate(0); }
      25% { transform: rotate(10deg); }
      50% { transform: rotate(-10deg); }
      75% { transform: rotate(5deg); }
    }

    .notification-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      font-size: 10px;
      font-weight: 600;
      line-height: 18px;
      text-align: center;
      color: white;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 9px;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
    }

    .notification-dropdown {
      width: 360px;
      max-width: 90vw;
      padding: 0 !important;
      border: none;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom: none;
    }

    .header-title {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .mark-all-read-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mark-all-read-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .notification-list {
      max-height: 380px;
      overflow-y: auto;
      background: var(--cui-body-bg, #fff);
    }

    .notification-list::-webkit-scrollbar {
      width: 6px;
    }

    .notification-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .notification-list::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    .notification-loading,
    .notification-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #9ca3af;
      gap: 12px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border-bottom: 1px solid var(--cui-border-color, #e5e7eb);
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-item:hover {
      background: var(--cui-tertiary-bg, #f9fafb);
    }

    .notification-item.unread {
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
    }

    .notification-icon-wrapper {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-icon-wrapper.type-info {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    .notification-icon-wrapper.type-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .notification-icon-wrapper.type-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }

    .notification-icon-wrapper.type-error {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--cui-body-color, #1f2937);
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .notification-message {
      font-size: 13px;
      color: var(--cui-secondary-color, #6b7280);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notification-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 6px;
    }

    .unread-indicator {
      position: absolute;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    .notification-footer {
      padding: 12px 20px;
      background: var(--cui-tertiary-bg, #f9fafb);
      border-top: 1px solid var(--cui-border-color, #e5e7eb);
    }

    .view-all-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-all-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  // Expose service signals
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  loading = this.notificationService.loading;
  hasUnread = this.notificationService.hasUnread;

  ngOnInit(): void {
    const userId = this.getCurrentUserId();
    if (userId) {
      console.log('[NotificationBell] Starting notification polling for user:', userId);
      this.notificationService.startPolling(userId);
    } else {
      console.warn('[NotificationBell] No userId found, notifications will not load');
    }
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
  }

  /**
   * Get current user ID from auth service
   */
  private getCurrentUserId(): string {
    const overrideUser = this.getNotificationOverrideUser();
    if (overrideUser) {
      console.warn('[NotificationBell] Using override user for notifications:', overrideUser);
      return overrideUser;
    }

    const userName = this.authService.userName();
    if (userName) {
      if (/^\d+$/.test(userName)) {
        const storedUserId = this.storageService.getUserId();
        console.warn('[NotificationBell] Username is numeric. If backend expects a username, check login data.', {
          userName,
          storedUserId
        });
      }
      return userName;
    }

    const userId = this.storageService.getUserId();
    if (userId) {
      console.warn('[NotificationBell] Username missing; falling back to numeric userId for notifications.', userId);
      return userId.toString();
    }

    return '';
  }

  private getNotificationOverrideUser(): string {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('notifyUser') || '';
    } catch {
      return '';
    }
  }

  /**
   * Refresh notifications when dropdown is opened
   */
  onDropdownOpen(): void {
    const userId = this.getCurrentUserId();
    if (userId) {
      this.notificationService.refresh(userId);
    }
  }

  getTypeClass(type: string): string {
    const typeMap: Record<string, string> = {
      'Info': 'type-info',
      'Success': 'type-success',
      'Warning': 'type-warning',
      'Error': 'type-error'
    };
    return typeMap[type] || 'type-info';
  }

  formatTime(notification: NotificationDto): string {
    const date = parseNotificationDate(notification);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  handleNotificationClick(notification: NotificationDto): void {
    console.log('[NotificationBell] Clicked notification:', notification);
    
    // Mark as read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Navigate based on referenceType and referenceId
    // As per documentation: referenceType='ApprovalRequired' → open /submissions/{referenceId}
    if (notification.referenceId) {
      switch (notification.referenceType) {
        case 'ApprovalRequired':
          // Navigate to submission approval page
          this.router.navigate(['/submissions', notification.referenceId]);
          break;
        case 'FormSubmission':
          // Navigate to submission details
          this.router.navigate(['/form-submissions', notification.referenceId]);
          break;
        case 'ApprovalApproved':
        case 'ApprovalRejected':
        case 'ApprovalReturned':
          // Navigate to submission details
          this.router.navigate(['/submissions', notification.referenceId]);
          break;
        default:
          // No navigation for system notifications
          console.log('[NotificationBell] No navigation for referenceType:', notification.referenceType);
          break;
      }
    }
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    const userId = this.authService.userName();
    if (userId) {
      this.notificationService.markAllAsRead(userId).subscribe();
    }
  }

  viewAllNotifications(): void {
    this.router.navigate(['/notifications']);
  }
}
