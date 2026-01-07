import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../../auth/storage.service';

// ==================== User DTOs ====================

export interface UserDto {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  idUserType?: number | null;
}

export interface UserGroupDto {
  id: number;
  name: string;
  foreignName?: string | null;
  description?: string | null;
  isActive: boolean;
  idLegalEntity?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  // Try different possible endpoint names
  private baseUrl = `${environment.apiUrl}/Users`;
  private userGroupsUrl = `${environment.apiUrl}/UserGroups`;

  // Alternative endpoint names (fallback)
  private alternativeUsersUrl = `${environment.apiUrl}/Account/Users`;
  private alternativeUserGroupsUrl = `${environment.apiUrl}/Account/UserGroups`;

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {
    // Log API configuration on service initialization
    if (environment.config?.enableDebug) {
      console.log('[UsersService] Initialized with API URL:', environment.apiUrl);
      console.log('[UsersService] Base URLs:', {
        users: this.baseUrl,
        userGroups: this.userGroupsUrl,
        alternativeUsers: this.alternativeUsersUrl,
        alternativeUserGroups: this.alternativeUserGroupsUrl
      });

      // Test API connectivity
      this.checkApiHealth();
    }
  }

  /**
   * Check if API server is accessible
   * This helps diagnose 404 errors
   */
  private checkApiHealth(): void {
    // Try to access Swagger UI or a known endpoint
    const swaggerUrl = environment.links?.apiDocs || 'https://localhost:7276/swagger';
    const healthCheckUrl = `${environment.apiUrl.replace('/api', '')}/swagger/v1/swagger.json`;

    console.log('[UsersService] Checking API health...');
    console.log('[UsersService] Swagger URL:', swaggerUrl);
    console.log('[UsersService] Health check URL:', healthCheckUrl);

    // Try to fetch Swagger JSON (doesn't require auth)
    fetch(healthCheckUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        console.log('[UsersService] ✅ API server appears to be running');
      })
      .catch(() => {
        console.warn('[UsersService] ⚠️ Could not reach API server. Please verify:');
        console.warn('  1. API server is running on', environment.apiUrl.replace('/api', ''));
        console.warn('  2. Swagger UI is accessible at', swaggerUrl);
        console.warn('  3. CORS is properly configured');
      });
  }

  // ==================== Users Operations ====================

  /**
   * Get all users
   * GET /api/Users
   */
  getAllUsers(): Observable<UserDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            return response.data || [];
          }
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of([]);
      })
    );
  }

  /**
   * Get active users only
   * Tries multiple endpoints: /api/Users/active, /api/Account/Users/active, /api/Users
   */
  getActiveUsers(): Observable<UserDto[]> {
    const token = this.storageService.getToken();
    const url = `${this.baseUrl}/active`;

    // Debug logging
    if (environment.config?.enableDebug) {
      console.log('[UsersService] getActiveUsers - URL:', url);
      console.log('[UsersService] getActiveUsers - Token exists:', !!token);
      console.log('[UsersService] getActiveUsers - Token preview:', token ? `${token.substring(0, 20)}...` : 'N/A');
    }

    // Try primary endpoint first
    return this.http.get<any>(url).pipe(
      tap((response) => {
        if (environment.config?.enableDebug) {
          console.log('[UsersService] getActiveUsers - Success:', response);
        }
      }),
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            return response.data || [];
          }
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error: HttpErrorResponse) => {
        // Enhanced error logging
        console.error('[UsersService] getActiveUsers - Error Details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error,
          hasToken: !!token,
          fullUrl: url,
          apiBaseUrl: environment.apiUrl
        });

        // Special handling for 404 - likely API server not running or routes not registered
        if (error.status === 404) {
          console.error('[UsersService] ⚠️ 404 Error - Possible causes:');
          console.error('  1. API server may not be running on', environment.apiUrl);
          console.error('  2. Controllers may not be registered/discovered');
          console.error('  3. Route may not exist:', url);
          console.error('  4. Check Swagger UI at:', environment.links?.apiDocs || 'https://localhost:7276/swagger');
        }

        // If 404 or 401, try alternative endpoint
        if (error?.status === 404 || error?.status === 401) {
          console.warn(`[UsersService] Primary endpoint failed (${error.status}), trying alternative...`);
          return this.http.get<any>(`${this.alternativeUsersUrl}/active`).pipe(
            tap((response) => {
              if (environment.config?.enableDebug) {
                console.log('[UsersService] Alternative endpoint - Success:', response);
              }
            }),
            map((response: any) => {
              if (response && typeof response === 'object' && !Array.isArray(response)) {
                if (response.success !== undefined) {
                  return response.data || [];
                }
                return response.data || response.items || response.result || [];
              }
              return Array.isArray(response) ? response : [];
            }),
            catchError((altError: HttpErrorResponse) => {
              console.error('[UsersService] Alternative endpoint - Error Details:', {
                status: altError.status,
                statusText: altError.statusText,
                url: altError.url,
                message: altError.message
              });

              // If still fails, try getting all users and filter client-side
              console.warn('[UsersService] Alternative endpoint failed, trying getAllUsers...');
              return this.getAllUsers().pipe(
                map((users: UserDto[]) => {
                  return users.filter(u => u.isActive !== false);
                }),
                catchError((finalError: HttpErrorResponse) => {
                  console.error('[UsersService] All endpoints failed:', {
                    status: finalError.status,
                    statusText: finalError.statusText,
                    url: finalError.url
                  });
                  return of([]);
                })
              );
            })
          );
        }
        console.error('[UsersService] Error fetching active users:', error);
        return of([]);
      })
    );
  }

  /**
   * Get user by ID
   * GET /api/Users/{id}
   */
  getUserById(id: number): Observable<UserDto | null> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            return response.data || response;
          }
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching user ${id}:`, error);
        return of(null);
      })
    );
  }

  // ==================== User Groups (Roles) Operations ====================

  /**
   * Get all user groups (roles)
   * GET /api/UserGroups
   */
  getAllUserGroups(): Observable<UserGroupDto[]> {
    return this.http.get<any>(this.userGroupsUrl).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            return response.data || [];
          }
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching user groups:', error);
        return of([]);
      })
    );
  }

  /**
   * Get active user groups only
   * Tries multiple endpoints: /api/UserGroups/active, /api/Account/UserGroups/active, /api/UserGroups
   */
  getActiveUserGroups(): Observable<UserGroupDto[]> {
    const token = this.storageService.getToken();
    const url = `${this.userGroupsUrl}/active`;
    const rolesUrl = `${environment.apiUrl}/Roles/active`;

    // Debug logging
    if (environment.config?.enableDebug) {
      console.log('[UsersService] getActiveUserGroups - URL:', url);
      console.log('[UsersService] getActiveUserGroups - Token exists:', !!token);
      console.log('[UsersService] getActiveUserGroups - Token preview:', token ? `${token.substring(0, 20)}...` : 'N/A');
    }

    // Try primary endpoint first
    return this.http.get<any>(url).pipe(
      tap((response) => {
        if (environment.config?.enableDebug) {
          console.log('[UsersService] getActiveUserGroups - Success:', response);
        }
      }),
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            return response.data || [];
          }
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error: HttpErrorResponse) => {
        // Enhanced error logging
        console.error('[UsersService] getActiveUserGroups - Error Details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error,
          hasToken: !!token,
          fullUrl: url,
          apiBaseUrl: environment.apiUrl
        });

        // Special handling for 404 - likely API server not running or routes not registered
        if (error.status === 404) {
          console.error('[UsersService] ⚠️ 404 Error - Possible causes:');
          console.error('  1. API server may not be running on', environment.apiUrl);
          console.error('  2. Controllers may not be registered/discovered');
          console.error('  3. Route may not exist:', url);
          console.error('  4. Check Swagger UI at:', environment.links?.apiDocs || 'https://localhost:7276/swagger');
        }

        // If 404 or 401, try alternative endpoint
        if (error?.status === 404 || error?.status === 401) {
          console.warn(`[UsersService] Primary endpoint failed (${error.status}), trying alternative...`);
          return this.http.get<any>(`${this.alternativeUserGroupsUrl}/active`).pipe(
            tap((response) => {
              if (environment.config?.enableDebug) {
                console.log('[UsersService] Alternative endpoint - Success:', response);
              }
            }),
            map((response: any) => {
              if (response && typeof response === 'object' && !Array.isArray(response)) {
                if (response.success !== undefined) {
                  return response.data || [];
                }
                return response.data || response.items || response.result || [];
              }
              return Array.isArray(response) ? response : [];
            }),
            catchError((altError: HttpErrorResponse) => {
              console.error('[UsersService] Alternative endpoint - Error Details:', {
                status: altError.status,
                statusText: altError.statusText,
                url: altError.url,
                message: altError.message
              });

              // If still fails, try getting all groups and filter client-side
              // If still fails, try Roles endpoint
              console.warn('[UsersService] Alternative endpoint failed, trying Roles endpoint...');
              return this.http.get<any>(`${environment.apiUrl}/Roles/active`).pipe(
                map((response: any) => {
                  if (response && typeof response === 'object' && !Array.isArray(response)) {
                    if (response.success !== undefined) return response.data || [];
                    return response.data || response.items || response.result || [];
                  }
                  return Array.isArray(response) ? response : [];
                }),
                catchError(() => {
                  console.warn('[UsersService] Roles endpoint failed, trying getAllUserGroups...');
                  return this.getAllUserGroups();
                })
              ).pipe(
                map((groups: UserGroupDto[]) => {
                  return groups.filter(g => g.isActive !== false);
                }),
                catchError((finalError: HttpErrorResponse) => {
                  console.error('[UsersService] All endpoints failed:', {
                    status: finalError.status,
                    statusText: finalError.statusText,
                    url: finalError.url
                  });
                  return of([]);
                })
              );
            })
          );
        }
        console.error('[UsersService] Error fetching active user groups:', error);
        return of([]);
      })
    );
  }

  /**
   * Get user group by ID
   * GET /api/UserGroups/{id}
   */
  getUserGroupById(id: number): Observable<UserGroupDto | null> {
    return this.http.get<any>(`${this.userGroupsUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            return response.data || response;
          }
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching user group ${id}:`, error);
        return of(null);
      })
    );
  }
}

