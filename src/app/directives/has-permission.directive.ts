import { 
  Directive, 
  Input, 
  TemplateRef, 
  ViewContainerRef, 
  OnInit, 
  OnDestroy,
  effect 
} from '@angular/core';
import { PermissionService } from '../services/permission.service';

/**
 * Structural directive to show/hide elements based on user permissions
 * 
 * Usage examples:
 * 
 * 1. Single permission:
 *    <button *appHasPermission="'CREATE_FORM'">Create Form</button>
 * 
 * 2. Multiple permissions (ANY - default):
 *    <div *appHasPermission="['VIEW_REPORTS', 'EXPORT_REPORTS']">Reports Section</div>
 * 
 * 3. Multiple permissions (ALL required):
 *    <div *appHasPermission="['EDIT_USER', 'MANAGE_ROLES']; mode: 'all'">User Management</div>
 * 
 * 4. Show if user does NOT have permission:
 *    <div *appHasPermission="'ADMIN_ACCESS'; not: true">Non-admin content</div>
 * 
 * 5. With else template:
 *    <div *appHasPermission="'VIEW_DASHBOARD'; else noAccess">Dashboard</div>
 *    <ng-template #noAccess>You don't have access</ng-template>
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permissions: string[] = [];
  private mode: 'any' | 'all' = 'any';
  private negate: boolean = false;
  private elseTemplateRef: TemplateRef<any> | null = null;
  private hasView = false;
  private hasElseView = false;
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {
    // React to permission changes using effect
    effect(() => {
      const _ = this.permissionService.permissions();
      this.updateView();
    });
  }
  
  /**
   * Main input - permission code(s) to check
   */
  @Input()
  set appHasPermission(value: string | string[]) {
    if (typeof value === 'string') {
      this.permissions = [value];
    } else if (Array.isArray(value)) {
      this.permissions = value;
    } else {
      this.permissions = [];
    }
    this.updateView();
  }
  
  /**
   * Mode: 'any' (default) or 'all'
   * - 'any': User needs at least ONE of the permissions
   * - 'all': User needs ALL of the permissions
   */
  @Input()
  set appHasPermissionMode(value: 'any' | 'all') {
    this.mode = value || 'any';
    this.updateView();
  }
  
  /**
   * Negate the check (show if user does NOT have permission)
   */
  @Input()
  set appHasPermissionNot(value: boolean) {
    this.negate = value === true;
    this.updateView();
  }
  
  /**
   * Else template to show when permission check fails
   */
  @Input()
  set appHasPermissionElse(templateRef: TemplateRef<any> | null) {
    this.elseTemplateRef = templateRef;
    this.updateView();
  }
  
  ngOnInit(): void {
    this.updateView();
  }
  
  ngOnDestroy(): void {
    this.viewContainer.clear();
  }
  
  private updateView(): void {
    let hasAccess: boolean;
    
    if (this.permissions.length === 0) {
      // No permissions specified = allow access
      hasAccess = true;
    } else if (this.mode === 'all') {
      hasAccess = this.permissionService.hasAllPermissions(this.permissions);
    } else {
      hasAccess = this.permissionService.hasAnyPermission(this.permissions);
    }
    
    // Apply negation if needed
    if (this.negate) {
      hasAccess = !hasAccess;
    }
    
    if (hasAccess) {
      // Show the main template
      if (!this.hasView) {
        this.viewContainer.clear();
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
        this.hasElseView = false;
      }
    } else {
      // Show else template or clear
      if (!this.hasElseView) {
        this.viewContainer.clear();
        this.hasView = false;
        
        if (this.elseTemplateRef) {
          this.viewContainer.createEmbeddedView(this.elseTemplateRef);
          this.hasElseView = true;
        }
      }
    }
  }
}

/**
 * Attribute directive to disable elements based on permissions
 * 
 * Usage:
 *   <button [appDisableIfNoPermission]="'DELETE_FORM'">Delete</button>
 */
@Directive({
  selector: '[appDisableIfNoPermission]',
  standalone: true
})
export class DisableIfNoPermissionDirective implements OnInit, OnDestroy {
  private permissions: string[] = [];
  private mode: 'any' | 'all' = 'any';
  
  constructor(
    private permissionService: PermissionService
  ) {
    effect(() => {
      const _ = this.permissionService.permissions();
      this.updateDisabledState();
    });
  }
  
  @Input()
  set appDisableIfNoPermission(value: string | string[]) {
    if (typeof value === 'string') {
      this.permissions = [value];
    } else if (Array.isArray(value)) {
      this.permissions = value;
    } else {
      this.permissions = [];
    }
  }
  
  @Input()
  set appDisableIfNoPermissionMode(value: 'any' | 'all') {
    this.mode = value || 'any';
  }
  
  ngOnInit(): void {
    this.updateDisabledState();
  }
  
  ngOnDestroy(): void {}
  
  private updateDisabledState(): void {
    // This is handled by the host binding - we just need to trigger change detection
  }
  
  get isDisabled(): boolean {
    if (this.permissions.length === 0) return false;
    
    if (this.mode === 'all') {
      return !this.permissionService.hasAllPermissions(this.permissions);
    }
    return !this.permissionService.hasAnyPermission(this.permissions);
  }
}

/**
 * Pipe to check permissions in templates
 * 
 * Usage:
 *   <button *ngIf="'DELETE_FORM' | hasPermission">Delete</button>
 *   <button [disabled]="!('EDIT_FORM' | hasPermission)">Edit</button>
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hasPermission',
  standalone: true,
  pure: false // Impure to react to permission changes
})
export class HasPermissionPipe implements PipeTransform {
  constructor(private permissionService: PermissionService) {}
  
  transform(permission: string | string[], mode: 'any' | 'all' = 'any'): boolean {
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    if (mode === 'all') {
      return this.permissionService.hasAllPermissions(permissions);
    }
    return this.permissionService.hasAnyPermission(permissions);
  }
}

