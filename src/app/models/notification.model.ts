// Notification Models for Internal Notifications System
// Note: Angular does NOT create notifications - Backend creates them based on ALERT_RULES.NotificationType

export interface NotificationDto {
  id: number;
  userId: string;
  title: string;
  message: string;
  
  // Type = Severity for display (Info, Success, Warning, Error)
  type: NotificationSeverity;
  
  // ReferenceType = what triggered the notification
  referenceType: NotificationReferenceType;
  referenceId: number | null;
  
  // Read status
  isRead: boolean;
  
  // Dates (backend might return CreatedDate or createdAt)
  createdAt?: string;
  createdDate?: string;
  readAt?: string | null;
  
  // NotificationType from ALERT_RULES (Internal/Both) - optional, API might not return this
  notificationType?: 'Internal' | 'Both' | 'Email';
  
  // IsDeleted flag
  isDeleted?: boolean;
}

// Severity = display style (colors/icons)
export type NotificationSeverity = 'Info' | 'Success' | 'Warning' | 'Error';

// ReferenceType = trigger type from ALERT_RULES
export type NotificationReferenceType = 
  | 'FormSubmission' 
  | 'ApprovalRequired' 
  | 'ApprovalApproved' 
  | 'ApprovalRejected' 
  | 'ApprovalReturned'
  | 'System';

export interface NotificationSummary {
  totalCount: number;
  unreadCount: number;
  notifications: NotificationDto[];
}

export interface MarkNotificationReadDto {
  notificationId: number;
}

export interface MarkAllNotificationsReadDto {
  userId: string;
}

// Helper to get the created date from notification (handles both formats)
export function getNotificationDate(notification: NotificationDto): string {
  return notification.createdAt || notification.createdDate || new Date().toISOString();
}

