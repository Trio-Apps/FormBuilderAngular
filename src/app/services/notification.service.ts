import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject, interval, Subscription } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { 
  NotificationDto, 
  NotificationSummary 
} from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private baseUrl = `${environment.apiUrl}/Notifications`;
  private destroy$ = new Subject<void>();
  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Polling interval (30 seconds as per documentation)
  private readonly POLL_INTERVAL = 30000;
  private pollingActive = false;
  private pollingSub?: Subscription;
  private currentUserId: string = '';

  // Signals for reactive state management
  private _notifications = signal<NotificationDto[]>([]);
  private _unreadCount = signal<number>(0);
  private _loading = signal<boolean>(false);

  // Public computed signals
  readonly notifications = computed(() => this._notifications());
  readonly unreadCount = computed(() => this._unreadCount());
  readonly loading = computed(() => this._loading());
  readonly hasUnread = computed(() => this._unreadCount() > 0);

  constructor(private http: HttpClient) {}

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Start polling for new notifications
   * As per documentation: poll every 10-30 seconds for unread count
   */
  startPolling(userId: string): void {
    if (this.pollingActive || !userId) return;
    
    this.pollingActive = true;
    this.currentUserId = userId;
    
    console.log('[NotificationService] Starting polling for user:', userId);
    
    // Initial fetch - get full notifications list
    this.fetchNotifications(userId);
    
    // Poll every 30 seconds - just get unread count (lighter)
    this.pollingSub = interval(this.POLL_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.pollingActive && this.currentUserId) {
          // Just fetch unread count for efficiency
          this.fetchUnreadCount(this.currentUserId);
        }
      });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.pollingActive = false;
    this.currentUserId = '';
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
    console.log('[NotificationService] Polling stopped');
  }

  /**
   * Fetch notifications for a user
   * GET /Notifications?userId={userId}&limit=20
   */
  fetchNotifications(userId: string, limit: number = 20): void {
    if (!userId) return;
    
    this._loading.set(true);
    
    const params = new HttpParams()
      .set('userId', userId)
      .set('limit', limit.toString());

    console.log('[NotificationService] Fetching notifications for user:', userId);

    this.http.get<any>(`${this.baseUrl}`, { params, headers: this.noCacheHeaders })
      .pipe(
        map(response => this.unwrapNotificationsResponse(response)),
        catchError(error => {
          console.error('[NotificationService] Error fetching notifications:', error);
          return of({ totalCount: 0, unreadCount: 0, notifications: [] });
        })
      )
      .subscribe(summary => {
        console.log('[NotificationService] Received:', summary.notifications.length, 'notifications,', summary.unreadCount, 'unread');
        this._notifications.set(summary.notifications || []);
        this._unreadCount.set(summary.unreadCount || 0);
        this._loading.set(false);
      });
  }

  /**
   * Fetch only unread count (lighter API call for polling)
   * GET /Notifications/unread-count?userId={userId}
   */
  private fetchUnreadCount(userId: string): void {
    if (!userId) return;

    const params = new HttpParams().set('userId', userId);

    this.http.get<any>(`${this.baseUrl}/unread-count`, { params, headers: this.noCacheHeaders })
      .pipe(
        map(response => {
          if (typeof response === 'number') return response;
          if (response?.data !== undefined) return response.data;
          if (response?.count !== undefined) return response.count;
          if (response?.unreadCount !== undefined) return response.unreadCount;
          return 0;
        }),
        catchError(error => {
          console.error('[NotificationService] Error fetching unread count:', error);
          return of(this._unreadCount()); // Keep current count on error
        })
      )
      .subscribe(count => {
        const oldCount = this._unreadCount();
        this._unreadCount.set(count);
        
        // If count increased, fetch full notifications to get new ones
        if (count > oldCount) {
          console.log('[NotificationService] New notifications detected! Fetching full list...');
          this.fetchNotifications(userId);
        }
      });
  }

  /**
   * Get notifications (Observable version)
   */
  getNotifications(userId: string, limit: number = 20): Observable<NotificationSummary> {
    if (!userId) {
      return of({ totalCount: 0, unreadCount: 0, notifications: [] });
    }

    const params = new HttpParams()
      .set('userId', userId)
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.baseUrl}`, { params, headers: this.noCacheHeaders }).pipe(
      map(response => this.unwrapResponse<NotificationSummary>(response)),
      catchError(error => {
        console.error('[NotificationService] Error fetching notifications:', error);
        return of({ totalCount: 0, unreadCount: 0, notifications: [] });
      })
    );
  }

  /**
   * Get unread count only
   */
  getUnreadCount(userId: string): Observable<number> {
    if (!userId) return of(0);

    const params = new HttpParams().set('userId', userId);

    return this.http.get<any>(`${this.baseUrl}/unread-count`, { params, headers: this.noCacheHeaders }).pipe(
      map(response => {
        if (typeof response === 'number') return response;
        if (response?.data !== undefined) return response.data;
        if (response?.count !== undefined) return response.count;
        return 0;
      }),
      tap(count => this._unreadCount.set(count)),
      catchError(error => {
        console.error('[NotificationService] Error fetching unread count:', error);
        return of(0);
      })
    );
  }

  /**
   * Mark single notification as read
   */
  markAsRead(notificationId: number): Observable<boolean> {
    return this.http.patch<any>(`${this.baseUrl}/${notificationId}/read`, {}).pipe(
      map(() => {
        // Update local state
        const updated = this._notifications().map(n => 
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        );
        this._notifications.set(updated);
        this._unreadCount.update(count => Math.max(0, count - 1));
        return true;
      }),
      catchError(error => {
        console.error('[NotificationService] Error marking notification as read:', error);
        return of(false);
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): Observable<boolean> {
    if (!userId) return of(false);

    return this.http.patch<any>(`${this.baseUrl}/read-all`, { userId }).pipe(
      map(() => {
        // Update local state
        const updated = this._notifications().map(n => ({ 
          ...n, 
          isRead: true, 
          readAt: new Date().toISOString() 
        }));
        this._notifications.set(updated);
        this._unreadCount.set(0);
        return true;
      }),
      catchError(error => {
        console.error('[NotificationService] Error marking all as read:', error);
        return of(false);
      })
    );
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: number): Observable<boolean> {
    return this.http.delete<any>(`${this.baseUrl}/${notificationId}`).pipe(
      map(() => {
        const notification = this._notifications().find(n => n.id === notificationId);
        const updated = this._notifications().filter(n => n.id !== notificationId);
        this._notifications.set(updated);
        
        // Update unread count if deleted notification was unread
        if (notification && !notification.isRead) {
          this._unreadCount.update(count => Math.max(0, count - 1));
        }
        return true;
      }),
      catchError(error => {
        console.error('[NotificationService] Error deleting notification:', error);
        return of(false);
      })
    );
  }

  /**
   * Clear all notifications for user
   */
  clearAll(userId: string): Observable<boolean> {
    if (!userId) return of(false);

    return this.http.delete<any>(`${this.baseUrl}/clear-all`, { 
      body: { userId } 
    }).pipe(
      map(() => {
        this._notifications.set([]);
        this._unreadCount.set(0);
        return true;
      }),
      catchError(error => {
        console.error('[NotificationService] Error clearing notifications:', error);
        return of(false);
      })
    );
  }

  /**
   * Manually refresh notifications
   */
  refresh(userId: string): void {
    this.fetchNotifications(userId);
  }

  /**
   * Add notification locally (for real-time updates via SignalR)
   */
  addNotification(notification: NotificationDto): void {
    this._notifications.update(notifications => [notification, ...notifications]);
    if (!notification.isRead) {
      this._unreadCount.update(count => count + 1);
    }
  }

  /**
   * Helper to unwrap API response
   */
  private unwrapResponse<T>(response: any): T {
    if (response && typeof response === 'object') {
      if (response.success !== undefined) return (response.data || response) as T;
      if (response.data !== undefined) return response.data as T;
      if (response.result !== undefined) return response.result as T;
    }
    return response as T;
  }

  /**
   * Helper to unwrap notifications response and normalize data
   * Handles different response formats from backend
   */
  private unwrapNotificationsResponse(response: any): NotificationSummary {
    let notifications: NotificationDto[] = [];
    let unreadCount = 0;
    let totalCount = 0;

    // Unwrap the response
    const data = this.unwrapResponse<any>(response);

    // Handle different response formats
    if (Array.isArray(data)) {
      // Direct array of notifications
      notifications = data;
      unreadCount = notifications.filter(n => !n.isRead).length;
      totalCount = notifications.length;
    } else if (data && typeof data === 'object') {
      // Object with notifications array
      notifications = data.notifications || data.items || data.data || [];
      unreadCount = data.unreadCount ?? notifications.filter((n: NotificationDto) => !n.isRead).length;
      totalCount = data.totalCount ?? data.total ?? notifications.length;
    }

    // Normalize notification objects (handle different field names)
    notifications = notifications.map(n => this.normalizeNotification(n));

    // Filter out deleted notifications; show all types returned by API
    notifications = notifications.filter(n => !n.isDeleted);

    return { notifications, unreadCount, totalCount };
  }

  /**
   * Normalize notification object to handle different field naming conventions
   */
  private normalizeNotification(n: any): NotificationDto {
    return {
      id: n.id || n.Id,
      userId: n.userId || n.UserId,
      title: n.title || n.Title || 'Notification',
      message: n.message || n.Message || '',
      type: n.type || n.Type || 'Info',
      referenceType: n.referenceType || n.ReferenceType || 'System',
      referenceId: n.referenceId ?? n.ReferenceId ?? null,
      isRead: n.isRead ?? n.IsRead ?? false,
      createdAt: n.createdAt || n.CreatedAt || n.createdDate || n.CreatedDate,
      createdDate: n.createdDate || n.CreatedDate || n.createdAt || n.CreatedAt,
      readAt: n.readAt || n.ReadAt || null,
      notificationType: n.notificationType || n.NotificationType,
      isDeleted: n.isDeleted ?? n.IsDeleted ?? false
    };
  }
}

