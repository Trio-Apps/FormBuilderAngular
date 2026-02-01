import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { AuthService } from './auth.service';

/**
 * Permission Guard - Protects routes based on user permissions
 * 
 * Usage in routes:
 * 
 * 1. Single permission:
 * {
 *   path: 'forms/create',
 *   component: FormCreateComponent,
 *   canActivate: [permissionGuard],
 *   data: { permissions: ['CREATE_FORM'] }
 * }
 * 
 * 2. Multiple permissions (ANY - default):
 * {
 *   path: 'reports',
 *   component: ReportsComponent,
 *   canActivate: [permissionGuard],
 *   data: { permissions: ['VIEW_REPORTS', 'EXPORT_REPORTS'] }
 * }
 * 
 * 3. Multiple permissions (ALL required):
 * {
 *   path: 'admin/users',
 *   component: UserManagementComponent,
 *   canActivate: [permissionGuard],
 *   data: { permissions: ['VIEW_USERS', 'MANAGE_ROLES'], permissionMode: 'all' }
 * }
 * 
 * 4. Custom redirect on denied:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [permissionGuard],
 *   data: { permissions: ['VIEW_DASHBOARD'], deniedRedirect: '/access-denied' }
 * }
 */
export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  
  // First check if user is authenticated
  if (!authService.isAuthenticated()) {
    console.log('[PermissionGuard] ❌ Not authenticated - redirecting to login');
    return router.createUrlTree(['/pages/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
  
  // Get required permissions from route data
  const requiredPermissions: string[] = route.data['permissions'] || [];
  const permissionMode: 'any' | 'all' = route.data['permissionMode'] || 'any';
  const deniedRedirect: string = route.data['deniedRedirect'] || '/access-denied';
  
  // If no permissions required, allow access
  if (requiredPermissions.length === 0) {
    console.log('[PermissionGuard] ✅ No permissions required - access granted');
    return true;
  }
  
  // Check permissions
  let hasAccess: boolean;
  
  if (permissionMode === 'all') {
    hasAccess = permissionService.hasAllPermissions(requiredPermissions);
  } else {
    hasAccess = permissionService.hasAnyPermission(requiredPermissions);
  }
  
  if (hasAccess) {
    console.log('[PermissionGuard] ✅ Access granted for:', state.url);
    console.log('[PermissionGuard] Required permissions:', requiredPermissions);
    return true;
  }
  
  console.log('[PermissionGuard] ❌ Access denied for:', state.url);
  console.log('[PermissionGuard] Required permissions:', requiredPermissions);
  console.log('[PermissionGuard] User permissions:', permissionService.permissions());
  console.log('[PermissionGuard] Redirecting to:', deniedRedirect);
  
  return router.createUrlTree([deniedRedirect]);
};

/**
 * Admin Guard - Only allows admin users
 * Convenience guard that checks for ADMIN_ACCESS permission
 */
export const adminPermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/pages/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
  
  if (permissionService.isAdmin()) {
    console.log('[AdminPermissionGuard] ✅ Admin access granted');
    return true;
  }
  
  console.log('[AdminPermissionGuard] ❌ Admin access denied');
  return router.createUrlTree(['/access-denied']);
};

/**
 * Feature Permission Guard Factory
 * Creates a guard for a specific feature/module
 * 
 * Usage:
 * const formsGuard = createFeatureGuard(['CREATE_FORM', 'EDIT_FORM', 'VIEW_FORM']);
 * 
 * {
 *   path: 'forms',
 *   canActivate: [formsGuard],
 *   children: [...]
 * }
 */
export function createFeatureGuard(
  requiredPermissions: string[], 
  mode: 'any' | 'all' = 'any'
): CanActivateFn {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const permissionService = inject(PermissionService);
    
    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/pages/login'], {
        queryParams: { returnUrl: state.url }
      });
    }
    
    let hasAccess: boolean;
    
    if (mode === 'all') {
      hasAccess = permissionService.hasAllPermissions(requiredPermissions);
    } else {
      hasAccess = permissionService.hasAnyPermission(requiredPermissions);
    }
    
    if (hasAccess) {
      return true;
    }
    
    console.log(`[FeatureGuard] ❌ Access denied. Required: ${requiredPermissions.join(', ')}`);
    return router.createUrlTree(['/access-denied']);
  };
}

/**
 * Pre-built guards for common features
 */
export const formBuilderGuard = createFeatureGuard([
  'CREATE_FORM',
  'EDIT_FORM',
  'VIEW_FORM'
]);

export const submissionsGuard = createFeatureGuard([
  'VIEW_SUBMISSION',
  'CREATE_SUBMISSION'
]);

export const approvalsGuard = createFeatureGuard([
  'VIEW_APPROVAL_INBOX',
  'APPROVE_SUBMISSION'
]);

export const reportsGuard = createFeatureGuard([
  'VIEW_REPORTS'
]);

export const userManagementGuard = createFeatureGuard([
  'VIEW_USERS',
  'MANAGE_ROLES'
]);

export const settingsGuard = createFeatureGuard([
  'VIEW_SETTINGS',
  'EDIT_SETTINGS'
]);

// ==================== Document Guards ====================

/**
 * Guard for viewing documents
 * Requires: Document_Allow_View
 */
export const documentViewGuard = createFeatureGuard([
  'Document_Allow_View'
]);

/**
 * Guard for creating documents
 * Requires: Document_Allow_Create
 */
export const documentCreateGuard = createFeatureGuard([
  'Document_Allow_Create'
]);

/**
 * Guard for editing documents
 * Requires: Document_Allow_Edit
 */
export const documentEditGuard = createFeatureGuard([
  'Document_Allow_Edit'
]);

/**
 * Guard for managing documents (full control)
 * Requires: Document_Allow_Manage
 */
export const documentManageGuard = createFeatureGuard([
  'Document_Allow_Manage'
]);

/**
 * Guard for document list (view or manage)
 * Requires: Document_Allow_View OR Document_Allow_Manage
 */
export const documentsGuard = createFeatureGuard([
  'Document_Allow_View',
  'Document_Allow_Manage'
]);

