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

/**
 * Parse notification date safely and consistently.
 * If backend sends an ISO timestamp without timezone (e.g. 2026-02-24T08:49:39),
 * treat it as UTC to avoid client local-time misinterpretation.
 */
export function parseNotificationDate(notification: NotificationDto): Date {
  const raw = getNotificationDate(notification);
  if (!raw) {
    return new Date();
  }

  const value = raw.trim();
  if (!value) {
    return new Date();
  }

  // Date-only format should remain local date parsing behavior.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  // Has explicit timezone if ends with Z or contains +HH:mm / -HH:mm
  const hasTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(value);

  const normalized = !isDateOnly && !hasTimezone ? `${value}Z` : value;
  const parsed = new Date(normalized);

  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}
