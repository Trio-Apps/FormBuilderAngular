import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { StorageService } from '../auth/storage.service';

// ==================== Permission DTOs ====================
// Based on actual DB structure: Tbl_UserGroup_Permission

/**
 * Represents a permission from Tbl_UserGroup_Permission
 * The permission is stored as a string in UserPermissionName column
 */
export interface UserGroupPermissionDto {
  idUserGroup: number;
  idLegalEntity?: number;
  idCreatedBy?: number;
  createdDate?: string;
  userPermissionName: string; // The actual permission string (e.g., "Dashboard_Allow_View")
}

/**
 * Represents a user group from Tbl_UserGroup
 */
export interface UserGroupDto {
  id: number;
  name: string;
  foreignName?: string;
  description?: string;
  idLegalEntity?: number;
  isActive: boolean;
}

/**
 * Represents user-group link from Tbl_UserGroup_User
 */
export interface UserGroupUserDto {
  idUserGroup: number;
  idUser: number;
  idLegalEntity?: number;
}


@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  // API Endpoints - Based on Tbl_UserGroup_Permission table
  private baseUrl = `${environment.apiUrl}/Permissions`;
  private userGroupPermissionsUrl = `${environment.apiUrl}/UserGroupPermissions`;
  
  // Signals for reactive permission state
  private _permissions = signal<string[]>([]);
  private _loading = signal<boolean>(false);
  private _loaded = signal<boolean>(false);
  
  // Public readonly signals
  readonly permissions = this._permissions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  
  // BehaviorSubject for non-signal consumers
  private permissionsSubject = new BehaviorSubject<string[]>([]);
  public permissions$ = this.permissionsSubject.asObservable();
  
  // Cache key for localStorage
  private readonly CACHE_KEY = 'user_permissions';
  private readonly CACHE_EXPIRY_KEY = 'user_permissions_expiry';
  private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  
  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {
    // Don't load from cache automatically - let components call refreshPermissions() explicitly
    // This ensures we always get fresh permissions from the API
    // this.loadCachedPermissions();
  }
  
  // ==================== Permission Loading ====================
  
  /**
   * Load permissions for the current user from Tbl_UserGroup_Permission
   * Uses the user's UserGroup (role) to fetch permissions
   * 
   * Flow:
   * 1. Get user's role/userGroupId from JWT token or storage
   * 2. Call API: GET /api/UserGroupPermissions/by-group/{userGroupId}
   * 3. API reads from Tbl_UserGroup_Permission WHERE IdUserGroup = userGroupId
   * 4. Returns list of permission codes
   */
  loadUserPermissions(): Observable<string[]> {
    const userId = this.storageService.getUserId();
    const username = this.storageService.getUsername();
    const userRole = this.storageService.getRole();
    
    console.log('[PermissionService] Loading permissions for user:', { userId, username, userRole });
    
    if (!userId && !username && !userRole) {
      console.warn('[PermissionService] No user info found');
      return of([]);
    }
    
    this._loading.set(true);
    
    // Try to extract userGroupId from JWT token
    const token = this.storageService.getToken();
    let userGroupId: number | null = null;
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Try different possible claims for userGroupId
        userGroupId = payload.userGroupId || payload.idUserType || payload.groupId || payload.roleId || null;
        console.log('[PermissionService] Extracted userGroupId from token:', userGroupId);
      } catch (e) {
        console.warn('[PermissionService] Could not extract userGroupId from token');
      }
    }
    
    // Priority: userGroupId > userId > userRole (name)
    let endpoint: string;
    
    if (userGroupId) {
      // Best case: We have the userGroupId directly
      endpoint = `${this.userGroupPermissionsUrl}/by-group/${userGroupId}`;
    } else if (userId) {
      // Get permissions by userId (backend will lookup user's group)
      endpoint = `${this.userGroupPermissionsUrl}/by-user/${userId}`;
    } else if (userRole) {
      // Get permissions by role name (backend will lookup group by name)
      endpoint = `${this.userGroupPermissionsUrl}/by-role/${encodeURIComponent(userRole)}`;
    } else {
      console.warn('[PermissionService] No identifier available to fetch permissions');
      this._loading.set(false);
      return of([]);
    }
    
    console.log('[PermissionService] Fetching permissions from:', endpoint);
    
    return this.http.get<any>(endpoint).pipe(
      map((response: any) => {
        // Handle different response formats from Tbl_UserGroup_Permission
        let permissions: string[] = [];
        
        if (Array.isArray(response)) {
          // Direct array - extract UserPermissionName field (actual DB column name)
          permissions = response.map((p: any) => {
            if (typeof p === 'string') return p;
            // Priority: UserPermissionName (actual DB column) > userPermission > permissionCode
            return p.userPermissionName || p.UserPermissionName || 
                   p.userPermission || p.UserPermission || 
                   p.permissionCode || p.permissionName || 
                   p.code || p.name;
          }).filter(Boolean);
        } else if (response?.data) {
          // Wrapped response { data: [...] }
          permissions = (response.data as any[]).map((p: any) => {
            if (typeof p === 'string') return p;
            return p.userPermissionName || p.UserPermissionName || 
                   p.userPermission || p.UserPermission || 
                   p.permissionCode || p.permissionName || 
                   p.code || p.name;
          }).filter(Boolean);
        } else if (response?.permissions) {
          // permissions array format
          permissions = response.permissions.map((p: any) => 
            p.userPermissionName || p.UserPermissionName || 
            p.userPermission || p.UserPermission || p.permissionCode || p.permissionName
          ).filter(Boolean);
        }
        
        console.log('[PermissionService] Parsed permissions:', permissions);
        return permissions;
      }),
      tap((permissions: string[]) => {
        this.setPermissions(permissions);
        this.cachePermissions(permissions);
        console.log('[PermissionService] ✅ Loaded permissions from API:', permissions.length, 'permissions');
        // Check for specific permissions
        const hasProjectCreate = permissions.includes('Project_Allow_Create');
        const hasProjectManage = permissions.includes('Project_Allow_Manage');
        const hasWorkflowCreate = permissions.includes('ApprovalWorkflow_Allow_Create');
        const hasWorkflowManage = permissions.includes('ApprovalWorkflow_Allow_Manage');
        console.log('[PermissionService] Project_Allow_Create:', hasProjectCreate);
        console.log('[PermissionService] Project_Allow_Manage:', hasProjectManage);
        console.log('[PermissionService] ApprovalWorkflow_Allow_Create:', hasWorkflowCreate);
        console.log('[PermissionService] ApprovalWorkflow_Allow_Manage:', hasWorkflowManage);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[PermissionService] Error loading permissions:', error);
        this._loading.set(false);
        
        // Try alternative endpoint
        return this.loadPermissionsByUserGroup();
      })
    );
  }
  
  /**
   * Alternative: Load permissions by user group name
   * Reads from Tbl_UserGroup_Permission via group name lookup
   */
  private loadPermissionsByUserGroup(): Observable<string[]> {
    const userRole = this.storageService.getRole();
    
    if (!userRole) {
      console.warn('[PermissionService] No user role found');
      this._loading.set(false);
      return of([]);
    }
    
    console.log('[PermissionService] Trying alternative endpoint with role:', userRole);
    
    return this.http.get<any>(`${this.userGroupPermissionsUrl}/by-role/${encodeURIComponent(userRole)}`).pipe(
      map((response: any) => {
        let permissions: string[] = [];
        
        if (Array.isArray(response)) {
          // Extract UserPermissionName from Tbl_UserGroup_Permission
          permissions = response.map((p: any) => {
            if (typeof p === 'string') return p;
            return p.userPermissionName || p.UserPermissionName || 
                   p.userPermission || p.UserPermission || 
                   p.permissionCode || p.permissionName || p.code || p.name;
          }).filter(Boolean);
        } else if (response?.data) {
          permissions = (response.data as any[]).map((p: any) => {
            if (typeof p === 'string') return p;
            return p.userPermissionName || p.UserPermissionName || 
                   p.userPermission || p.UserPermission || 
                   p.permissionCode || p.permissionName || p.code || p.name;
          }).filter(Boolean);
        }
        
        return permissions;
      }),
      tap((permissions: string[]) => {
        this.setPermissions(permissions);
        this.cachePermissions(permissions);
        console.log('[PermissionService] ✅ Loaded permissions by group:', permissions);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[PermissionService] Error loading permissions by group:', error);
        this._loading.set(false);
        
        // No fallback - permissions must come from database
        // Admin users must have explicit permissions assigned in Tbl_UserGroup_Permission
        console.warn('[PermissionService] Could not load permissions from API. User will have no permissions.');
        return of([]);
      })
    );
  }
  
  // ==================== Permission Checking ====================
  
  /**
   * Check if user has a specific permission
   * @param permission Permission code to check
   * NOTE: No admin bypass - all users must have explicit permissions from DB
   */
  hasPermission(permission: string): boolean {
    const permissions = this._permissions();
    
    // Check if user has the specific permission from Tbl_UserGroup_Permission
    // No bypass for admin - they must have explicit permissions in the database
    return permissions.includes(permission);
  }
  
  /**
   * Check if user has ANY of the specified permissions
   * @param permissions Array of permission codes
   * NOTE: No admin bypass - all users must have explicit permissions from DB
   */
  hasAnyPermission(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    
    const userPermissions = this._permissions();
    
    // Check if user has any of the specified permissions from Tbl_UserGroup_Permission
    return permissions.some(p => userPermissions.includes(p));
  }
  
  /**
   * Check if user has ALL of the specified permissions
   * @param permissions Array of permission codes
   * NOTE: No admin bypass - all users must have explicit permissions from DB
   */
  hasAllPermissions(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    
    const userPermissions = this._permissions();
    
    // Check if user has all of the specified permissions from Tbl_UserGroup_Permission
    return permissions.every(p => userPermissions.includes(p));
  }
  
  /**
   * Check if user is admin (has ADMIN_ACCESS or FULL_ACCESS)
   */
  isAdmin(): boolean {
    const permissions = this._permissions();
    const role = this.storageService.getRole()?.toLowerCase();
    
    return role === 'admin' || 
           role === 'administration' ||
           permissions.includes('FULL_ACCESS') || 
           permissions.includes('ADMIN_ACCESS');
  }
  
  // ==================== Permission State Management ====================
  
  /**
   * Set permissions directly (used when receiving from login response)
   */
  setPermissions(permissions: string[]): void {
    this._permissions.set(permissions);
    this._loading.set(false);
    this._loaded.set(true);
    this.permissionsSubject.next(permissions);
  }
  
  /**
   * Clear all permissions (on logout)
   */
  clearPermissions(): void {
    this._permissions.set([]);
    this._loaded.set(false);
    this.permissionsSubject.next([]);
    this.clearCache();
  }
  
  /**
   * Refresh permissions from server
   */
  refreshPermissions(): Observable<string[]> {
    this.clearCache();
    return this.loadUserPermissions();
  }
  
  // ==================== Caching ====================
  
  private cachePermissions(permissions: string[]): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(permissions));
      localStorage.setItem(this.CACHE_EXPIRY_KEY, (Date.now() + this.CACHE_DURATION_MS).toString());
    } catch (e) {
      console.warn('[PermissionService] Failed to cache permissions:', e);
    }
  }
  
  private loadCachedPermissions(): void {
    try {
      const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);
      const cached = localStorage.getItem(this.CACHE_KEY);
      
      if (expiry && cached && Date.now() < parseInt(expiry, 10)) {
        const permissions = JSON.parse(cached) as string[];
        if (Array.isArray(permissions) && permissions.length > 0) {
          this.setPermissions(permissions);
          console.log('[PermissionService] Loaded cached permissions:', permissions);
        }
      }
    } catch (e) {
      console.warn('[PermissionService] Failed to load cached permissions:', e);
    }
  }
  
  private clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_EXPIRY_KEY);
    } catch (e) {
      console.warn('[PermissionService] Failed to clear cache:', e);
    }
  }
  
  // ==================== Admin API Methods ====================
  
  /**
   * Get all available permissions from Tbl_UserGroup_Permission (for admin management)
   * Returns unique permission strings
   */
  getAllPermissions(): Observable<string[]> {
    return this.http.get<any>(`${this.userGroupPermissionsUrl}/all`).pipe(
      map((response: any) => {
        let permissions: string[] = [];
        const data = Array.isArray(response) ? response : (response?.data || response?.items || []);
        
        // Extract unique UserPermissionName values
        permissions = data.map((p: any) => 
          typeof p === 'string' ? p : (p.userPermissionName || p.UserPermissionName || p.userPermission || p.UserPermission)
        ).filter(Boolean);
        
        // Return unique values
        return [...new Set(permissions)];
      }),
      catchError((error) => {
        console.error('[PermissionService] Error fetching all permissions:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Get permissions for a specific user group from Tbl_UserGroup_Permission
   * Returns array of permission strings
   */
  getPermissionsByUserGroup(userGroupId: number): Observable<string[]> {
    return this.http.get<any>(`${this.userGroupPermissionsUrl}/by-group/${userGroupId}`).pipe(
      map((response: any) => {
        const data = Array.isArray(response) ? response : (response?.data || response?.items || []);
        return data.map((p: any) => 
          typeof p === 'string' ? p : (p.userPermissionName || p.UserPermissionName || p.userPermission || p.UserPermission)
        ).filter(Boolean);
      }),
      catchError((error) => {
        console.error('[PermissionService] Error fetching group permissions:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Assign permission to user group
   * Inserts into Tbl_UserGroup_Permission
   * @param userGroupId The IdUserGroup
   * @param permission The permission string (e.g., "Dashboard_Allow_View")
   */
  assignPermissionToGroup(userGroupId: number, permission: string): Observable<boolean> {
    return this.http.post<any>(`${this.userGroupPermissionsUrl}`, {
      idUserGroup: userGroupId,
      userPermissionName: permission
    }).pipe(
      map(() => true),
      catchError((error) => {
        console.error('[PermissionService] Error assigning permission:', error);
        return of(false);
      })
    );
  }
  
  /**
   * Remove permission from user group
   * Deletes from Tbl_UserGroup_Permission
   * @param userGroupId The IdUserGroup  
   * @param permission The permission string to remove
   */
  removePermissionFromGroup(userGroupId: number, permission: string): Observable<boolean> {
    return this.http.delete<any>(
      `${this.userGroupPermissionsUrl}/${userGroupId}/${encodeURIComponent(permission)}`
    ).pipe(
      map(() => true),
      catchError((error) => {
        console.error('[PermissionService] Error removing permission:', error);
        return of(false);
      })
    );
  }

  /**
   * Sync permissions for a user group (bulk replace)
   * PUT /api/UserGroupPermissions/by-group/{userGroupId}/sync
   *
   * Note: Backend contract may accept either:
   * - Array of permission strings: ["Dashboard_Allow_View", ...]
   * - Object wrapper: { permissions: [...] }
   *
   * We send the object wrapper to match common backend contracts.
   */
  syncPermissionsForGroup(userGroupId: number, permissions: string[]): Observable<boolean> {
    const normalized = [...new Set((permissions || []).map(p => (p || '').trim()).filter(Boolean))];
    return this.http.put<any>(
      `${this.userGroupPermissionsUrl}/by-group/${userGroupId}/sync`,
      { permissions: normalized }
    ).pipe(
      map(() => true),
      catchError((error) => {
        console.error('[PermissionService] Error syncing group permissions:', error);
        return of(false);
      })
    );
  }
  
  // ==================== Document Permission Helpers ====================
  // Convenience methods for checking Document-specific permissions
  // These use the permission codes from Tbl_UserGroup_Permission.UserPermissionName
  
  /**
   * Check if user can view documents
   * Permission: Document_Allow_View
   */
  canViewDocuments(): boolean {
    return this.hasPermission('Document_Allow_View');
  }
  
  /**
   * Check if user can create documents
   * Permission: Document_Allow_Create
   */
  canCreateDocuments(): boolean {
    return this.hasPermission('Document_Allow_Create');
  }
  
  /**
   * Check if user can edit documents
   * Permission: Document_Allow_Edit
   */
  canEditDocuments(): boolean {
    return this.hasPermission('Document_Allow_Edit');
  }
  
  /**
   * Check if user can delete documents
   * Permission: Document_Allow_Delete
   */
  canDeleteDocuments(): boolean {
    return this.hasPermission('Document_Allow_Delete');
  }
  
  /**
   * Check if user can manage documents (full control)
   * Permission: Document_Allow_Manage
   */
  canManageDocuments(): boolean {
    return this.hasPermission('Document_Allow_Manage');
  }
  
  /**
   * Check if user can configure document settings
   * Permission: Document_Allow_Configure
   */
  canConfigureDocuments(): boolean {
    return this.hasPermission('Document_Allow_Configure');
  }
  
  /**
   * Check if user can view all documents (including deleted)
   * Permission: Document_Allow_ViewAll
   */
  canViewAllDocuments(): boolean {
    return this.hasPermission('Document_Allow_ViewAll');
  }
  
  /**
   * Check if user can export documents
   * Permission: Document_Allow_Export
   */
  canExportDocuments(): boolean {
    return this.hasPermission('Document_Allow_Export');
  }
  
  /**
   * Check if user can import documents
   * Permission: Document_Allow_Import
   */
  canImportDocuments(): boolean {
    return this.hasPermission('Document_Allow_Import');
  }
  
  // ==================== Computed Permission Getters ====================
  // For use in templates with reactive updates
  
  /**
   * Get all permissions as Observable (for async pipe)
   */
  getPermissions(): Observable<string[]> {
    return this.permissions$;
  }
  
  /**
   * Get all permissions synchronously
   */
  getPermissionsSync(): string[] {
    return this._permissions();
  }

  // ==================== Project Permission Helpers ====================
  
  /**
   * Check if user can view projects
   * Permission: Project_Allow_View
   */
  canViewProjects(): boolean {
    return this.hasPermission('Project_Allow_View');
  }

  /**
   * Check if user can create projects
   * Permission: Project_Allow_Create
   */
  canCreateProjects(): boolean {
    return this.hasPermission('Project_Allow_Create');
  }

  /**
   * Check if user can edit projects
   * Permission: Project_Allow_Edit
   */
  canEditProjects(): boolean {
    return this.hasPermission('Project_Allow_Edit');
  }

  /**
   * Check if user can delete projects
   * Permission: Project_Allow_Delete
   */
  canDeleteProjects(): boolean {
    return this.hasPermission('Project_Allow_Delete');
  }

  /**
   * Check if user can manage projects (full control)
   * Permission: Project_Allow_Manage
   */
  canManageProjects(): boolean {
    return this.hasPermission('Project_Allow_Manage');
  }

  // ==================== Approval Workflow Permission Helpers ====================
  
  /**
   * Check if user can view approval workflows
   * Permission: ApprovalWorkflow_Allow_View
   */
  canViewApprovalWorkflows(): boolean {
    return this.hasPermission('ApprovalWorkflow_Allow_View');
  }

  /**
   * Check if user can create approval workflows
   * Permission: ApprovalWorkflow_Allow_Create
   */
  canCreateApprovalWorkflows(): boolean {
    return this.hasPermission('ApprovalWorkflow_Allow_Create');
  }

  /**
   * Check if user can edit approval workflows
   * Permission: ApprovalWorkflow_Allow_Edit
   */
  canEditApprovalWorkflows(): boolean {
    return this.hasPermission('ApprovalWorkflow_Allow_Edit');
  }

  /**
   * Check if user can delete approval workflows
   * Permission: ApprovalWorkflow_Allow_Delete
   */
  canDeleteApprovalWorkflows(): boolean {
    return this.hasPermission('ApprovalWorkflow_Allow_Delete');
  }

  /**
   * Check if user can manage approval workflows (full control)
   * Permission: ApprovalWorkflow_Allow_Manage
   */
  canManageApprovalWorkflows(): boolean {
    return this.hasPermission('ApprovalWorkflow_Allow_Manage');
  }

  // ==================== Approval Stage Permission Helpers ====================
  
  /**
   * Check if user can view approval stages
   * Permission: ApprovalStage_Allow_View
   */
  canViewApprovalStages(): boolean {
    return this.hasPermission('ApprovalStage_Allow_View');
  }

  /**
   * Check if user can create approval stages
   * Permission: ApprovalStage_Allow_Create
   */
  canCreateApprovalStages(): boolean {
    return this.hasPermission('ApprovalStage_Allow_Create');
  }

  /**
   * Check if user can edit approval stages
   * Permission: ApprovalStage_Allow_Edit
   */
  canEditApprovalStages(): boolean {
    return this.hasPermission('ApprovalStage_Allow_Edit');
  }

  /**
   * Check if user can delete approval stages
   * Permission: ApprovalStage_Allow_Delete
   */
  canDeleteApprovalStages(): boolean {
    return this.hasPermission('ApprovalStage_Allow_Delete');
  }

  // ==================== Approval Inbox Permission Helpers ====================
  
  /**
   * Check if user can view approval inbox
   * Permission: ApprovalInbox_Allow_View
   */
  canViewApprovalInbox(): boolean {
    return this.hasPermission('ApprovalInbox_Allow_View');
  }

  /**
   * Check if user can approve submissions
   * Permission: ApprovalInbox_Allow_Approve
   */
  canApproveSubmissions(): boolean {
    return this.hasPermission('ApprovalInbox_Allow_Approve');
  }

  /**
   * Check if user can reject submissions
   * Permission: ApprovalInbox_Allow_Reject
   */
  canRejectSubmissions(): boolean {
    return this.hasPermission('ApprovalInbox_Allow_Reject');
  }

  /**
   * Check if user can view Approvals History (global)
   * Permission: ApprovalWorkflow_Allow_View
   */
  canViewApprovalsHistory(): boolean {
    return this.hasPermission('ApprovalWorkflow_Allow_View');
  }

  // ==================== Stage Assignee Permission Helpers ====================
  
  /**
   * Check if user can view stage assignees
   * Permission: ApprovalStageAssignee_Allow_View
   */
  canViewStageAssignees(): boolean {
    return this.hasPermission('ApprovalStageAssignee_Allow_View');
  }

  /**
   * Check if user can create stage assignees
   * Permission: ApprovalStageAssignee_Allow_Create
   */
  canCreateStageAssignees(): boolean {
    return this.hasPermission('ApprovalStageAssignee_Allow_Create');
  }

  /**
   * Check if user can edit stage assignees
   * Permission: ApprovalStageAssignee_Allow_Edit
   */
  canEditStageAssignees(): boolean {
    return this.hasPermission('ApprovalStageAssignee_Allow_Edit');
  }

  /**
   * Check if user can delete stage assignees
   * Permission: ApprovalStageAssignee_Allow_Delete
   */
  canDeleteStageAssignees(): boolean {
    return this.hasPermission('ApprovalStageAssignee_Allow_Delete');
  }

  // ==================== Approval Delegation Permission Helpers ====================
  
  /**
   * Check if user can view approval delegations
   * Permission: ApprovalDelegation_Allow_View
   */
  canViewApprovalDelegations(): boolean {
    return this.hasPermission('ApprovalDelegation_Allow_View');
  }

  /**
   * Check if user can create approval delegations
   * Permission: ApprovalDelegation_Allow_Create
   */
  canCreateApprovalDelegations(): boolean {
    return this.hasPermission('ApprovalDelegation_Allow_Create');
  }

  /**
   * Check if user can edit approval delegations
   * Permission: ApprovalDelegation_Allow_Edit
   */
  canEditApprovalDelegations(): boolean {
    return this.hasPermission('ApprovalDelegation_Allow_Edit');
  }

  /**
   * Check if user can delete approval delegations
   * Permission: ApprovalDelegation_Allow_Delete
   */
  canDeleteApprovalDelegations(): boolean {
    return this.hasPermission('ApprovalDelegation_Allow_Delete');
  }

  // ==================== Form Tab Permission Helpers ====================
  
  /**
   * Check if user can view tabs
   * Permission: FormTab_Allow_View
   */
  canViewTabs(): boolean {
    return this.hasPermission('FormTab_Allow_View');
  }

  /**
   * Check if user can create tabs
   * Permission: FormTab_Allow_Create
   */
  canCreateTabs(): boolean {
    return this.hasPermission('FormTab_Allow_Create');
  }

  /**
   * Check if user can edit tabs
   * Permission: FormTab_Allow_Edit
   */
  canEditTabs(): boolean {
    return this.hasPermission('FormTab_Allow_Edit');
  }

  /**
   * Check if user can delete tabs
   * Permission: FormTab_Allow_Delete
   */
  canDeleteTabs(): boolean {
    return this.hasPermission('FormTab_Allow_Delete');
  }

  /**
   * Check if user can manage tabs (full control)
   * Permission: FormTab_Allow_Manage
   */
  canManageTabs(): boolean {
    return this.hasPermission('FormTab_Allow_Manage');
  }

  // ==================== Form Field Permission Helpers ====================
  
  /**
   * Check if user can view fields
   * Permission: FormField_Allow_View
   */
  canViewFields(): boolean {
    return this.hasPermission('FormField_Allow_View');
  }

  /**
   * Check if user can create fields
   * Permission: FormField_Allow_Create
   */
  canCreateFields(): boolean {
    return this.hasPermission('FormField_Allow_Create');
  }

  /**
   * Check if user can edit fields
   * Permission: FormField_Allow_Edit
   */
  canEditFields(): boolean {
    return this.hasPermission('FormField_Allow_Edit');
  }

  /**
   * Check if user can delete fields
   * Permission: FormField_Allow_Delete
   */
  canDeleteFields(): boolean {
    return this.hasPermission('FormField_Allow_Delete');
  }

  /**
   * Check if user can manage fields (full control)
   * Permission: FormField_Allow_Manage
   */
  canManageFields(): boolean {
    return this.hasPermission('FormField_Allow_Manage');
  }

  // ==================== Stored Procedure Permission Helpers ====================
  
  /**
   * Check if user can view stored procedures
   * Permission: StoredProcedure_Allow_View
   */
  canViewStoredProcedures(): boolean {
    return this.hasPermission('StoredProcedure_Allow_View');
  }

  /**
   * Check if user can create stored procedures
   * Permission: StoredProcedure_Allow_Create
   */
  canCreateStoredProcedures(): boolean {
    return this.hasPermission('StoredProcedure_Allow_Create');
  }

  /**
   * Check if user can edit stored procedures
   * Permission: StoredProcedure_Allow_Edit
   */
  canEditStoredProcedures(): boolean {
    return this.hasPermission('StoredProcedure_Allow_Edit');
  }

  /**
   * Check if user can delete stored procedures
   * Permission: StoredProcedure_Allow_Delete
   */
  canDeleteStoredProcedures(): boolean {
    return this.hasPermission('StoredProcedure_Allow_Delete');
  }

  /**
   * Check if user can manage stored procedures (full control)
   * Permission: StoredProcedure_Allow_Manage
   */
  canManageStoredProcedures(): boolean {
    return this.hasPermission('StoredProcedure_Allow_Manage');
  }

  // ==================== Form Rule Permission Helpers ====================
  
  /**
   * Check if user can view form rules
   * Permission: FormRule_Allow_View
   */
  canViewFormRules(): boolean {
    return this.hasPermission('FormRule_Allow_View');
  }

  /**
   * Check if user can create form rules
   * Permission: FormRule_Allow_Create
   */
  canCreateFormRules(): boolean {
    return this.hasPermission('FormRule_Allow_Create');
  }

  /**
   * Check if user can edit form rules
   * Permission: FormRule_Allow_Edit
   */
  canEditFormRules(): boolean {
    return this.hasPermission('FormRule_Allow_Edit');
  }

  /**
   * Check if user can delete form rules
   * Permission: FormRule_Allow_Delete
   */
  canDeleteFormRules(): boolean {
    return this.hasPermission('FormRule_Allow_Delete');
  }

  /**
   * Check if user can manage form rules (full control)
   * Permission: FormRule_Allow_Manage
   */
  canManageFormRules(): boolean {
    return this.hasPermission('FormRule_Allow_Manage');
  }

  // ==================== Alert Rule Permission Helpers ====================
  
  /**
   * Check if user can view alert rules
   * Permission: AlertRule_Allow_View
   */
  canViewAlertRules(): boolean {
    return this.hasPermission('AlertRule_Allow_View');
  }

  /**
   * Check if user can create alert rules
   * Permission: AlertRule_Allow_Create
   */
  canCreateAlertRules(): boolean {
    return this.hasPermission('AlertRule_Allow_Create');
  }

  /**
   * Check if user can edit alert rules
   * Permission: AlertRule_Allow_Edit
   */
  canEditAlertRules(): boolean {
    return this.hasPermission('AlertRule_Allow_Edit');
  }

  /**
   * Check if user can delete alert rules
   * Permission: AlertRule_Allow_Delete
   */
  canDeleteAlertRules(): boolean {
    return this.hasPermission('AlertRule_Allow_Delete');
  }

  /**
   * Check if user can manage alert rules (full control)
   * Permission: AlertRule_Allow_Manage
   */
  canManageAlertRules(): boolean {
    return this.hasPermission('AlertRule_Allow_Manage');
  }

  // ==================== Email Template Permission Helpers ====================
  
  /**
   * Check if user can view email templates
   * Permission: EmailTemplate_Allow_View
   */
  canViewEmailTemplates(): boolean {
    return this.hasPermission('EmailTemplate_Allow_View');
  }

  /**
   * Check if user can create email templates
   * Permission: EmailTemplate_Allow_Create
   */
  canCreateEmailTemplates(): boolean {
    return this.hasPermission('EmailTemplate_Allow_Create');
  }

  /**
   * Check if user can edit email templates
   * Permission: EmailTemplate_Allow_Edit
   */
  canEditEmailTemplates(): boolean {
    return this.hasPermission('EmailTemplate_Allow_Edit');
  }

  /**
   * Check if user can delete email templates
   * Permission: EmailTemplate_Allow_Delete
   */
  canDeleteEmailTemplates(): boolean {
    return this.hasPermission('EmailTemplate_Allow_Delete');
  }

  /**
   * Check if user can manage email templates (full control)
   * Permission: EmailTemplate_Allow_Manage
   */
  canManageEmailTemplates(): boolean {
    return this.hasPermission('EmailTemplate_Allow_Manage');
  }

  // ==================== SMTP Config Permission Helpers ====================
  
  /**
   * Check if user can view SMTP configs
   * Permission: SmtpConfig_Allow_View
   */
  canViewSmtpConfigs(): boolean {
    return this.hasPermission('SmtpConfig_Allow_View');
  }

  /**
   * Check if user can create SMTP configs
   * Permission: SmtpConfig_Allow_Create
   */
  canCreateSmtpConfigs(): boolean {
    return this.hasPermission('SmtpConfig_Allow_Create');
  }

  /**
   * Check if user can edit SMTP configs
   * Permission: SmtpConfig_Allow_Edit
   */
  canEditSmtpConfigs(): boolean {
    return this.hasPermission('SmtpConfig_Allow_Edit');
  }

  /**
   * Check if user can delete SMTP configs
   * Permission: SmtpConfig_Allow_Delete
   */
  canDeleteSmtpConfigs(): boolean {
    return this.hasPermission('SmtpConfig_Allow_Delete');
  }

  /**
   * Check if user can manage SMTP configs (full control)
   * Permission: SmtpConfig_Allow_Manage
   */
  canManageSmtpConfigs(): boolean {
    return this.hasPermission('SmtpConfig_Allow_Manage');
  }

  // ==================== Table Menu Permission Helpers ====================
  
  /**
   * Check if user can view table menus
   * Permission: TableMenu_Allow_View
   */
  canViewTableMenus(): boolean {
    return this.hasPermission('TableMenu_Allow_View');
  }

  /**
   * Check if user can create table menus
   * Permission: TableMenu_Allow_Create
   */
  canCreateTableMenus(): boolean {
    return this.hasPermission('TableMenu_Allow_Create');
  }

  /**
   * Check if user can edit table menus
   * Permission: TableMenu_Allow_Edit
   */
  canEditTableMenus(): boolean {
    return this.hasPermission('TableMenu_Allow_Edit');
  }

  /**
   * Check if user can delete table menus
   * Permission: TableMenu_Allow_Delete
   */
  canDeleteTableMenus(): boolean {
    return this.hasPermission('TableMenu_Allow_Delete');
  }

  /**
   * Check if user can manage table menus (full control)
   * Permission: TableMenu_Allow_Manage
   */
  canManageTableMenus(): boolean {
    return this.hasPermission('TableMenu_Allow_Manage');
  }

  // ==================== Table Sub Menu Permission Helpers ====================
  
  /**
   * Check if user can view table sub menus
   * Permission: TableSubMenu_Allow_View
   */
  canViewTableSubMenus(): boolean {
    return this.hasPermission('TableSubMenu_Allow_View');
  }

  /**
   * Check if user can create table sub menus
   * Permission: TableSubMenu_Allow_Create
   */
  canCreateTableSubMenus(): boolean {
    return this.hasPermission('TableSubMenu_Allow_Create');
  }

  /**
   * Check if user can edit table sub menus
   * Permission: TableSubMenu_Allow_Edit
   */
  canEditTableSubMenus(): boolean {
    return this.hasPermission('TableSubMenu_Allow_Edit');
  }

  /**
   * Check if user can delete table sub menus
   * Permission: TableSubMenu_Allow_Delete
   */
  canDeleteTableSubMenus(): boolean {
    return this.hasPermission('TableSubMenu_Allow_Delete');
  }

  /**
   * Check if user can manage table sub menus (full control)
   * Permission: TableSubMenu_Allow_Manage
   */
  canManageTableSubMenus(): boolean {
    return this.hasPermission('TableSubMenu_Allow_Manage');
  }

  // ==================== Grid Permission Helpers ====================
  
  /**
   * Check if user can view grids
   * Permission: Grid_Allow_View
   */
  canViewGrids(): boolean {
    return this.hasPermission('Grid_Allow_View');
  }

  /**
   * Check if user can create grids
   * Permission: Grid_Allow_Create
   */
  canCreateGrids(): boolean {
    return this.hasPermission('Grid_Allow_Create');
  }

  /**
   * Check if user can edit grids
   * Permission: Grid_Allow_Edit
   */
  canEditGrids(): boolean {
    return this.hasPermission('Grid_Allow_Edit');
  }

  /**
   * Check if user can delete grids
   * Permission: Grid_Allow_Delete
   */
  canDeleteGrids(): boolean {
    return this.hasPermission('Grid_Allow_Delete');
  }

  /**
   * Check if user can manage grids (full control)
   * Permission: Grid_Allow_Manage
   */
  canManageGrids(): boolean {
    return this.hasPermission('Grid_Allow_Manage');
  }

  // ==================== Grid Column Permission Helpers ====================
  
  /**
   * Check if user can view grid columns
   * Permission: GridColumn_Allow_View
   */
  canViewGridColumns(): boolean {
    return this.hasPermission('GridColumn_Allow_View');
  }

  /**
   * Check if user can create grid columns
   * Permission: GridColumn_Allow_Create
   */
  canCreateGridColumns(): boolean {
    return this.hasPermission('GridColumn_Allow_Create');
  }

  /**
   * Check if user can edit grid columns
   * Permission: GridColumn_Allow_Edit
   */
  canEditGridColumns(): boolean {
    return this.hasPermission('GridColumn_Allow_Edit');
  }

  /**
   * Check if user can delete grid columns
   * Permission: GridColumn_Allow_Delete
   */
  canDeleteGridColumns(): boolean {
    return this.hasPermission('GridColumn_Allow_Delete');
  }

  /**
   * Check if user can manage grid columns (full control)
   * Permission: GridColumn_Allow_Manage
   */
  canManageGridColumns(): boolean {
    return this.hasPermission('GridColumn_Allow_Manage');
  }
}

