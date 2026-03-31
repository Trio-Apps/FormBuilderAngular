import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { PermissionService } from '../../../services/permission.service';
import { FieldDataSourceService } from '../../FormBuilder/services/field-data-source.service';
import { UsersService, UserGroupDto } from '../../FormBuilder/services/users.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import {
  FORM_BUILDER_PERMISSION_ACTIONS,
  FORM_BUILDER_PERMISSION_ENTITIES,
  isFormBuilderPermission,
  parsePermissionCode
} from '../form-builder-permissions.registry';

type PermissionRow = { permission: string };

@Component({
  selector: 'app-user-group-permissions-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableShellComponent,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ButtonModule,
    MultiSelectModule,
    InputTextModule,
    SelectModule,
    TableModule
  ],
  templateUrl: './user-group-permissions-manage.component.html',
  styleUrls: ['./user-group-permissions-manage.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class UserGroupPermissionsManageComponent implements OnInit, OnDestroy {
  userGroups: UserGroupDto[] = [];
  selectedGroupId: number | null = null;

  // All known permission codes (unique)
  allPermissions: string[] = [];
  entityOptions: string[] = [];
  actionOptions: string[] = [];
  private availablePermissionsByEntity: Record<string, string[]> = {};

  // Permission builder
  selectedEntity: string | null = null;
  selectedActions: string[] = ['View'];
  generatedPreview: string[] = [];
  // Selected new permissions to add
  selectedToAdd: string[] = [];

  // Add dialog (wizard-style)
  showAddDialog = false;
  addDialogGroupId: number | null = null;
  addDialogSelectedActions: string[] = ['View'];
  addDialogSelectedEntity: string | null = null;
  addDialogGeneratedPreview: string[] = [];
  addDialogSelectedPermissions: string[] = [];

  // Current group permissions
  rawGroupPermissions: string[] = [];
  groupPermissions: string[] = [];
  filteredGroupPermissions: PermissionRow[] = [];
  paginatedGroupPermissions: PermissionRow[] = [];

  loading = {
    groups: false,
    permissions: false,
    save: false
  };

  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // Edit dialog
  showEditDialog = false;
  editingOldPermission: string | null = null;
  editingNewPermission = '';

  private subs = new Subscription();

  constructor(
    private usersService: UsersService,
    public permissionService: PermissionService,
    private fieldDataSourceService: FieldDataSourceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load local data for managing group permissions only,
    // without forcing a global permissions refresh.
    this.loadInitialData();
  }

  refreshPage(): void {
    this.loadInitialData();
    if (this.selectedGroupId) {
      this.loadGroupPermissions(this.selectedGroupId);
    }
  }

  openAddDialog(): void {
    // default group to currently selected group (if any)
    const groupId = this.coerceGroupId(this.selectedGroupId);
    this.addDialogGroupId = groupId;

    // default entity to builder selection or first option
    this.addDialogSelectedEntity = this.selectedEntity || (this.entityOptions.length > 0 ? this.entityOptions[0] : null);
    this.addDialogSelectedActions = [...(this.selectedActions?.length ? this.selectedActions : ['View'])];
    this.addDialogSelectedPermissions = [];

    this.updateAddDialogPreview();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
  }

  onAddDialogBuilderChange(): void {
    this.normalizeAddDialogSelectedActions();
    this.updateAddDialogPreview();
  }

  toggleAddDialogAction(action: string, checked: boolean): void {
    const current = new Set(this.addDialogSelectedActions || []);
    if (checked) {
      current.add(action);
    } else {
      current.delete(action);
    }
    this.addDialogSelectedActions = [...current];
    this.updateAddDialogPreview();
  }

  getAvailableActionsForEntity(entity: string | null | undefined): string[] {
    const normalizedEntity = (entity || '').trim();
    if (!normalizedEntity) {
      return [];
    }

    const permissions = this.availablePermissionsByEntity[normalizedEntity] || [];
    return permissions
      .map(permission => parsePermissionCode(permission))
      .filter((value): value is { entity: string; action: string } => value !== null)
      .map(value => value.action)
      .filter((action, index, array) => array.indexOf(action) === index)
      .sort((a, b) => a.localeCompare(b));
  }

  private normalizeAddDialogSelectedActions(): void {
    const availableActions = new Set(this.getAvailableActionsForEntity(this.addDialogSelectedEntity));
    this.addDialogSelectedActions = (this.addDialogSelectedActions || []).filter(action => availableActions.has(action));
  }

  toggleAddDialogPermission(permission: string, checked: boolean): void {
    const current = new Set(this.addDialogSelectedPermissions || []);
    if (checked) {
      current.add(permission);
    } else {
      current.delete(permission);
    }
    this.addDialogSelectedPermissions = [...current].sort((a, b) => a.localeCompare(b));
  }

  selectAllAddDialogPermissions(): void {
    this.addDialogSelectedPermissions = [...this.allPermissions].sort((a, b) => a.localeCompare(b));
  }

  clearAllAddDialogPermissions(): void {
    this.addDialogSelectedPermissions = [];
  }

  private updateAddDialogPreview(): void {
    const entity = (this.addDialogSelectedEntity || '').trim();
    const acts = (this.addDialogSelectedActions || []).map(a => (a || '').trim()).filter(Boolean);
    if (!entity || acts.length === 0) {
      this.addDialogGeneratedPreview = [];
      return;
    }
    const allowedPermissions = new Set(this.availablePermissionsByEntity[entity] || []);
    this.addDialogGeneratedPreview = acts
      .map(a => `${entity}_Allow_${a}`)
      .filter(permission => allowedPermissions.has(permission))
      .sort((a, b) => a.localeCompare(b));
  }

  addDialogAddGeneratedToSelection(): void {
    if (!this.addDialogGeneratedPreview || this.addDialogGeneratedPreview.length === 0) return;
    const merged = new Set<string>([...(this.addDialogSelectedPermissions || []), ...this.addDialogGeneratedPreview]);
    this.addDialogSelectedPermissions = [...merged].sort((a, b) => a.localeCompare(b));
  }

  confirmAddDialog(): void {
    const groupId = this.coerceGroupId(this.addDialogGroupId);
    if (!groupId) {
      this.messageService.add({ severity: 'warn', summary: 'Select Group', detail: 'Please select a user group.' });
      return;
    }

    const toAdd = (this.addDialogSelectedPermissions || []).map(p => p.trim()).filter(Boolean);
    if (toAdd.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Select Permissions', detail: 'Please select permission(s) to add.' });
      return;
    }

    // If we're adding to the currently-viewed group, we can avoid a reload by using current state
    if (this.coerceGroupId(this.selectedGroupId) === groupId) {
      this.selectedToAdd = [...new Set([...(this.selectedToAdd || []), ...toAdd])].sort((a, b) => a.localeCompare(b));
      this.addSelected(); // will sync using selectedToAdd
      this.showAddDialog = false;
      return;
    }

    // Otherwise, do a one-shot sync: load current perms for target group, merge, then sync.
    this.loading.save = true;
    const sub = this.permissionService.getPermissionsByUserGroup(groupId).subscribe({
      next: (existing) => {
        const existingPerms = [...new Set((existing || []).filter(Boolean))];
        const nextPerms = [...new Set([...existingPerms, ...toAdd])].sort((a, b) => a.localeCompare(b));
        const sub2 = this.permissionService.syncPermissionsForGroup(groupId, nextPerms).subscribe({
          next: (ok) => {
            this.loading.save = false;
            if (ok) {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Permissions added successfully.' });
              // if user later selects that group, it will load fresh
              if (this.coerceGroupId(this.selectedGroupId) === groupId) {
                this.loadGroupPermissions(groupId);
              }
              this.showAddDialog = false;
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sync permissions.' });
            }
          },
          error: (err) => {
            console.error('[UserGroupPermissions] Sync add (dialog) error:', err);
            this.loading.save = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sync permissions.' });
          }
        });
        this.subs.add(sub2);
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Load perms (dialog) error:', err);
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load current permissions for this group.' });
      }
    });
    this.subs.add(sub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadInitialData(): void {
    this.loadUserGroups();
    this.loadAllPermissions();
    this.loadFormBuilderTables();
  }

  private loadFormBuilderTables(): void {
    // Use FieldDataSourcesController: GET /api/FieldDataSources/lookup-tables?database=FormBuilder
    const sub = this.fieldDataSourceService.getAvailableLookupTables('FormBuilder').subscribe({
      next: (tables) => {
        if (tables && tables.length > 0) {
          const current = new Set(this.entityOptions || []);
          tables.forEach(t => {
            if (t) {
              current.add(t);
            }
          });
          this.entityOptions = [...current].sort((a, b) => a.localeCompare(b));
          this.updatePreview();
          this.updateAddDialogPreview();
        }
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Error loading FormBuilder tables:', err);
      }
    });
    this.subs.add(sub);
  }

  loadUserGroups(): void {
    this.loading.groups = true;
    const sub = this.usersService.getActiveUserGroups().subscribe({
      next: (groups) => {
        this.userGroups = (groups || []).filter(g => g.isActive !== false);
        if (!this.selectedGroupId && this.userGroups.length > 0) {
          this.selectedGroupId = this.userGroups[0].id;
          this.loadGroupPermissions(this.userGroups[0].id);
        }
        this.loading.groups = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[UserGroupPermissions] Error loading user groups:', error);
        this.userGroups = [];
        this.loading.groups = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.add(sub);
  }

  loadAllPermissions(): void {
    this.loading.permissions = true;
    const sub = this.permissionService.getAllPermissions().subscribe({
      next: (permissions) => {
        this.buildCatalogFromExistingPermissions();
        const allowedPermissions = [...new Set((permissions || []).filter(isFormBuilderPermission))]
          .sort((a, b) => a.localeCompare(b));

        this.allPermissions = allowedPermissions;
        this.availablePermissionsByEntity = allowedPermissions.reduce<Record<string, string[]>>((acc, permission) => {
          const parsed = parsePermissionCode(permission);
          if (!parsed) {
            return acc;
          }

          if (!acc[parsed.entity]) {
            acc[parsed.entity] = [];
          }

          acc[parsed.entity].push(permission);
          return acc;
        }, {});

        const activeEntities = new Set(
          allowedPermissions
            .map(permission => parsePermissionCode(permission))
            .filter((value): value is { entity: string; action: string } => value !== null)
            .map(value => value.entity)
        );

        this.entityOptions = this.entityOptions.filter(entity => activeEntities.has(entity));
        if (!this.entityOptions.length) {
          this.entityOptions = [...FORM_BUILDER_PERMISSION_ENTITIES];
        }

        if (!this.selectedEntity || !this.entityOptions.includes(this.selectedEntity)) {
          this.selectedEntity = this.entityOptions[0] ?? null;
        }

        if (!this.addDialogSelectedEntity || !this.entityOptions.includes(this.addDialogSelectedEntity)) {
          this.addDialogSelectedEntity = this.selectedEntity;
        }

        this.normalizeAddDialogSelectedActions();
        this.updateAddDialogPreview();

        this.loading.permissions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Error loading available permissions:', err);
        this.buildCatalogFromExistingPermissions();
        this.allPermissions = [];
        this.availablePermissionsByEntity = {};
        this.loading.permissions = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.add(sub);
  }

  private buildCatalogFromExistingPermissions(): void {
    const entities = new Set<string>();
    const actions = new Set<string>();

    for (const p of this.rawGroupPermissions) {
      const parsed = parsePermissionCode(p);
      if (parsed && isFormBuilderPermission(p)) {
        entities.add(parsed.entity);
        actions.add(parsed.action);
      }
    }

    FORM_BUILDER_PERMISSION_ENTITIES.forEach(e => entities.add(e));
    this.entityOptions = [...entities].sort((a, b) => a.localeCompare(b));
    this.actionOptions = [...new Set([...FORM_BUILDER_PERMISSION_ACTIONS, ...actions])].sort((a, b) => a.localeCompare(b));

    if (!this.selectedEntity && this.entityOptions.length > 0) {
      this.selectedEntity = this.entityOptions[0];
    }
    this.updatePreview();
  }

  onBuilderChange(): void {
    this.updatePreview();
  }

  private updatePreview(): void {
    const entity = (this.selectedEntity || '').trim();
    const acts = (this.selectedActions || []).map(a => (a || '').trim()).filter(Boolean);
    if (!entity || acts.length === 0) {
      this.generatedPreview = [];
      return;
    }
    this.generatedPreview = acts.map(a => `${entity}_Allow_${a}`).sort((a, b) => a.localeCompare(b));
  }

  addGeneratedToSelection(): void {
    if (!this.generatedPreview || this.generatedPreview.length === 0) return;
    const merged = new Set<string>([...(this.selectedToAdd || []), ...this.generatedPreview]);
    this.selectedToAdd = [...merged].sort((a, b) => a.localeCompare(b));
  }

  onGroupChange(groupIdInput?: unknown): void {
    this.selectedToAdd = [];
    this.searchTerm = '';
    const groupId = this.coerceGroupId(groupIdInput ?? this.selectedGroupId);
    this.selectedGroupId = groupId;
    if (!groupId) {
      this.rawGroupPermissions = [];
      this.groupPermissions = [];
      this.filteredGroupPermissions = [];
      return;
    }
    this.loadGroupPermissions(groupId);
  }

  private loadGroupPermissions(groupId: number): void {
    const sub = this.permissionService.getPermissionsByUserGroup(groupId).subscribe({
      next: (perms) => {
        this.rawGroupPermissions = [...new Set((perms || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        this.groupPermissions = this.rawGroupPermissions.filter(isFormBuilderPermission);
        this.buildCatalogFromExistingPermissions();
        this.loadAllPermissions();
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Error loading group permissions:', err);
        this.rawGroupPermissions = [];
        this.groupPermissions = [];
        this.filteredGroupPermissions = [];
        this.cdr.detectChanges();
      }
    });
    this.subs.add(sub);
  }

  applyFilter(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    const rows = this.groupPermissions.map(p => ({ permission: p }));
    this.filteredGroupPermissions = !term
      ? rows
      : rows.filter(r => r.permission.toLowerCase().includes(term));
    this.currentPage = 1;
    this.updatePaginatedPermissions();
  }

  updatePaginatedPermissions(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredGroupPermissions.length / this.itemsPerPage));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedGroupPermissions = this.filteredGroupPermissions.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedPermissions();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    return pages;
  }

  canManage(): boolean {
    // Keep it simple: admin users should have explicit permissions too, but we still allow the UI for admins.
    return this.permissionService.isAdmin();
  }

  addSelected(): void {
    const groupId = this.coerceGroupId(this.selectedGroupId);
    if (!groupId) {
      this.messageService.add({ severity: 'warn', summary: 'Select Group', detail: 'Please select a user group first.' });
      return;
    }
    const toAdd = (this.selectedToAdd || []).map(p => p.trim()).filter(Boolean);
    if (toAdd.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Select Permissions', detail: 'Please select permission(s) to add.' });
      return;
    }

    const missing = toAdd.filter(p => !this.groupPermissions.includes(p));
    if (missing.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'No Changes', detail: 'All selected permissions already exist for this group.' });
      return;
    }

    this.loading.save = true;

    const otherSystemPermissions = this.rawGroupPermissions.filter(p => !isFormBuilderPermission(p));
    const nextPermissions = [...new Set([...otherSystemPermissions, ...this.groupPermissions, ...missing])].sort((a, b) => a.localeCompare(b));
    const sub = this.permissionService.syncPermissionsForGroup(groupId, nextPermissions).subscribe({
      next: (ok) => {
        if (!ok) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sync permissions.' });
        }
        this.afterSaveBatch(ok ? 0 : 1, 'added');
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Sync add error:', err);
        this.afterSaveBatch(1, 'added');
      }
    });
    this.subs.add(sub);
  }

  confirmRemove(permission: string): void {
    if (!this.selectedGroupId) return;
    this.confirmationService.confirm({
      header: 'Remove Permission',
      message: `Remove "${permission}" from this group?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.removePermission(permission)
    });
  }

  private removePermission(permission: string): void {
    const groupId = this.coerceGroupId(this.selectedGroupId);
    if (!groupId) return;
    this.loading.save = true;
    const otherSystemPermissions = this.rawGroupPermissions.filter(p => !isFormBuilderPermission(p));
    const nextPermissions = [...otherSystemPermissions, ...this.groupPermissions.filter(p => p !== permission)]
      .sort((a, b) => a.localeCompare(b));
    const sub = this.permissionService.syncPermissionsForGroup(groupId, nextPermissions).subscribe({
      next: (ok) => {
        if (!ok) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sync permissions.' });
        }
        this.afterSaveBatch(ok ? 0 : 1, 'removed');
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Sync remove error:', err);
        this.afterSaveBatch(1, 'removed');
      }
    });
    this.subs.add(sub);
  }

  openEdit(permission: string): void {
    this.editingOldPermission = permission;
    this.editingNewPermission = permission;
    this.showEditDialog = true;
  }

  saveEdit(): void {
    const groupId = this.coerceGroupId(this.selectedGroupId);
    if (!groupId || !this.editingOldPermission) return;
    const oldPerm = this.editingOldPermission;
    const newPerm = (this.editingNewPermission || '').trim();

    if (!newPerm) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Permission cannot be empty.' });
      return;
    }
    if (newPerm === oldPerm) {
      this.showEditDialog = false;
      return;
    }

    this.loading.save = true;

    const otherSystemPermissions = this.rawGroupPermissions.filter(p => !isFormBuilderPermission(p));
    const nextPermissions = [...new Set([
      ...otherSystemPermissions,
      ...this.groupPermissions.filter(p => p !== oldPerm),
      newPerm
    ])].sort((a, b) => a.localeCompare(b));

    const sub = this.permissionService.syncPermissionsForGroup(groupId, nextPermissions).subscribe({
      next: (ok) => {
        if (!ok) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update permission.' });
        }
        this.showEditDialog = false;
        this.afterSaveBatch(ok ? 0 : 1, 'added');
      },
      error: (err) => {
        console.error('[UserGroupPermissions] Sync edit error:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update permission.' });
        this.showEditDialog = false;
        this.loading.save = false;
      }
    });
    this.subs.add(sub);
  }

  private coerceGroupId(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  closeEdit(): void {
    this.showEditDialog = false;
    this.editingOldPermission = null;
    this.editingNewPermission = '';
  }

  private afterSaveBatch(failed: number, action: 'added' | 'removed'): void {
    this.loading.save = false;
    if (failed > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Partial Success',
        detail: `Some permissions could not be ${action}. Failed: ${failed}`
      });
    } else {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: `Permissions ${action} successfully.` });
    }
    this.selectedToAdd = [];
    this.reloadSelectedGroup();
  }

  private reloadSelectedGroup(): void {
    if (!this.selectedGroupId) return;
    this.loadGroupPermissions(this.selectedGroupId);
  }
}

