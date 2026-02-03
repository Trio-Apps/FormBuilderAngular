import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableMenusService, TableMenuDto, CreateTableMenuDto, UpdateTableMenuDto, TableSubMenuDto, CreateTableSubMenuDto, UpdateTableSubMenuDto, TableMenuDocumentDto, CreateTableMenuDocumentDto, UpdateTableMenuDocumentDto } from '../../../services/table-menus.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { UsersService, UserGroupDto } from '../../FormBuilder/services/users.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { MultiSelectModule } from 'primeng/multiselect';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { Subscription } from 'rxjs';
import { PermissionService } from '../../../services/permission.service';
import { HasPermissionDirective } from '../../../directives/has-permission.directive';

@Component({
  selector: 'app-table-menus-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    TableModule,
    PaginatorModule,
    MultiSelectModule,
    TranslatePipe,
    TableShellComponent,
    HasPermissionDirective
  ],
  templateUrl: './table-menus-list.component.html',
  styleUrls: ['./table-menus-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TableMenusListComponent implements OnInit, OnDestroy {
  // Data Arrays
  menus: TableMenuDto[] = [];
  filteredMenus: TableMenuDto[] = [];
  subMenus: TableSubMenuDto[] = [];
  menuDocuments: TableMenuDocumentDto[] = [];
  documentTypes: DocumentType[] = [];

  // Permission flags - Menu
  canViewTableMenus = false;
  canCreateTableMenus = false;
  canEditTableMenus = false;
  canDeleteTableMenus = false;
  canManageTableMenus = false;

  // Permission flags - Sub Menu
  canViewTableSubMenus = false;
  canCreateTableSubMenus = false;
  canEditTableSubMenus = false;
  canDeleteTableSubMenus = false;
  canManageTableSubMenus = false;

  // Loading States
  loading = {
    menus: false,
    subMenus: false,
    documents: false,
    save: false,
    delete: false
  };

  // Menu Modal
  showMenuModal = false;
  menuForm!: FormGroup;
  editingMenu: TableMenuDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

  // Sub Menu Modal
  showSubMenuModal = false;
  subMenuForm!: FormGroup;
  editingSubMenu: TableSubMenuDto | null = null;
  currentMenuForSubMenu: TableMenuDto | null = null;

  // Menu Document Modal
  showMenuDocumentModal = false;
  menuDocumentForm!: FormGroup;
  editingMenuDocument: TableMenuDocumentDto | null = null;
  currentMenuForDocument: TableMenuDto | null = null;
  currentSubMenuForDocument: TableSubMenuDto | null = null;

  // Search Filter
  searchTerm = '';

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  // Available permissions loaded from UserGroups table in database
  availablePermissions: string[] = [];

  private subscriptions = new Subscription();

  constructor(
    private tableMenusService: TableMenusService,
    private documentTypesService: DocumentTypesService,
    private usersService: UsersService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService,
    public permissionService: PermissionService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    // Always reload permissions from API to ensure fresh data (clears cache first)
    console.log('[TableMenusList] Refreshing permissions from API (clearing cache)...');
    this.permissionService.refreshPermissions().subscribe({
      next: (perms) => {
        console.log('[TableMenusList] Permissions loaded from API:', perms);
        this.loadPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[TableMenusList] Error loading permissions:', err);
        this.loadPermissions();
      }
    });

    // Subscribe to permission changes
    this.permissionService.permissions$.subscribe(() => {
      this.loadPermissions();
      this.cdr.detectChanges();
    });

    this.loadUserGroups(); // Load permissions from UserGroups table first
    this.loadMenus();
    this.loadDocumentTypes();
    
    // Watch for menuId changes in menuDocumentForm to reload sub menus
    this.menuDocumentForm.get('menuId')?.valueChanges.subscribe(menuId => {
      if (this.showMenuDocumentModal) {
        if (menuId) {
          // Clear subMenuId when menu changes (sub menu might belong to different menu)
          this.menuDocumentForm.patchValue({ subMenuId: null }, { emitEvent: false });
          // Load sub menus for the selected menu (replace existing)
          this.loadSubMenusForDocumentModal(menuId, true);
        } else {
          // If no menu selected, load all sub menus
          this.loadAllSubMenusForDocumentModal();
        }
      }
    });
  }

  /**
   * Load user permissions for table menu operations
   */
  private loadPermissions(): void {
    this.canViewTableMenus = this.permissionService.canViewTableMenus();
    this.canCreateTableMenus = this.permissionService.canCreateTableMenus();
    this.canEditTableMenus = this.permissionService.canEditTableMenus();
    this.canDeleteTableMenus = this.permissionService.canDeleteTableMenus();
    this.canManageTableMenus = this.permissionService.canManageTableMenus();
    
    this.canViewTableSubMenus = this.permissionService.canViewTableSubMenus();
    this.canCreateTableSubMenus = this.permissionService.canCreateTableSubMenus();
    this.canEditTableSubMenus = this.permissionService.canEditTableSubMenus();
    this.canDeleteTableSubMenus = this.permissionService.canDeleteTableSubMenus();
    this.canManageTableSubMenus = this.permissionService.canManageTableSubMenus();
    
    console.log('[TableMenusList] Permission flags:', {
      canViewTableMenus: this.canViewTableMenus,
      canCreateTableMenus: this.canCreateTableMenus,
      canEditTableMenus: this.canEditTableMenus,
      canDeleteTableMenus: this.canDeleteTableMenus,
      canManageTableMenus: this.canManageTableMenus,
      canViewTableSubMenus: this.canViewTableSubMenus,
      canCreateTableSubMenus: this.canCreateTableSubMenus,
      canEditTableSubMenus: this.canEditTableSubMenus,
      canDeleteTableSubMenus: this.canDeleteTableSubMenus,
      canManageTableSubMenus: this.canManageTableSubMenus
    });
  }

  /**
   * Load available permissions from UserGroups table in database
   */
  loadUserGroups(): void {
    this.usersService.getActiveUserGroups().subscribe({
      next: (groups: UserGroupDto[]) => {
        // Extract permission names from UserGroups (use name or foreignName)
        this.availablePermissions = groups
          .filter(g => g.isActive) // Only active groups
          .map(g => g.name) // Use name field from UserGroups table
          .filter((name): name is string => !!name); // Remove any null/undefined values
        
        console.log('[TableMenusList] Loaded permissions from UserGroups:', this.availablePermissions);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user groups for permissions:', error);
        // Fallback to empty array if loading fails
        this.availablePermissions = [];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForms(): void {
    // Menu Form
    this.menuForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      foreignName: ['', [Validators.maxLength(200)]],
      menuCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern('^[A-Z0-9_]+$')]],
      icon: ['', [Validators.maxLength(100)]],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      permissions: [[]]
    });

    // Sub Menu Form
    this.subMenuForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      foreignName: ['', [Validators.maxLength(200)]],
      menuId: [null, [Validators.required]],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      permissions: [[]]
    });

    // Menu Document Form
    this.menuDocumentForm = this.fb.group({
      documentTypeId: [null, [Validators.required]],
      menuId: [null],
      subMenuId: [null],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      permissions: [[]]
    });
  }

  // ==================== Load Data ====================

  loadMenus(): void {
    this.loading.menus = true;
    const sub = this.tableMenusService.getAllMenus().subscribe({
      next: (menus) => {
        this.menus = menus;
        this.filteredMenus = [...this.menus];
        this.totalRecords = this.filteredMenus.length;
        this.loading.menus = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load menus'
        });
        this.loading.menus = false;
      }
    });
    this.subscriptions.add(sub);
  }

  loadDocumentTypes(): void {
    const sub = this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (documentTypes) => {
        this.documentTypes = documentTypes.filter(dt => dt.isActive && !dt.isDeleted);
      },
      error: (error) => {
        console.error('Error loading document types:', error);
      }
    });
    this.subscriptions.add(sub);
  }

  loadSubMenus(menuId: number): void {
    // If already showing sub menus for this menu, toggle it off
    if (this.currentMenuForSubMenu?.id === menuId) {
      this.closeSubMenusSection();
      return;
    }
    
    this.loading.subMenus = true;
    // Find and set the current menu
    this.currentMenuForSubMenu = this.menus.find(m => m.id === menuId) || null;
    
    const sub = this.tableMenusService.getSubMenusByMenuId(menuId).subscribe({
      next: (subMenus: TableSubMenuDto[]) => {
        this.subMenus = subMenus || [];
        this.loading.subMenus = false;
        
        // Clear menu documents when loading sub menus
        this.menuDocuments = [];
        this.currentMenuForDocument = null;
        this.currentSubMenuForDocument = null;
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load sub menus'
        });
        this.loading.subMenus = false;
        this.subMenus = [];
        this.currentMenuForSubMenu = null;
      }
    });
    this.subscriptions.add(sub);
  }

  closeSubMenusSection(): void {
    this.subMenus = [];
    this.currentMenuForSubMenu = null;
    // Only clear documents if they were loaded from sub menus
    // Don't clear if documents are loaded directly from a menu
    if (this.currentSubMenuForDocument) {
      this.menuDocuments = [];
      this.currentMenuForDocument = null;
      this.currentSubMenuForDocument = null;
    }
  }

  loadMenuDocuments(menuId?: number, subMenuId?: number): void {
    // If already showing documents for the same menu/submenu, toggle it off
    if (subMenuId && this.currentSubMenuForDocument?.id === subMenuId) {
      this.closeMenuDocumentsSection();
      return;
    }
    if (menuId && !subMenuId && this.currentMenuForDocument?.id === menuId && !this.currentSubMenuForDocument) {
      this.closeMenuDocumentsSection();
      return;
    }
    
    this.loading.documents = true;
    
    // Set current menu/submenu references
    if (subMenuId && this.currentMenuForSubMenu) {
      this.currentSubMenuForDocument = this.subMenus.find(sm => sm.id === subMenuId) || null;
      this.currentMenuForDocument = this.currentMenuForSubMenu;
    } else if (menuId) {
      this.currentMenuForDocument = this.menus.find(m => m.id === menuId) || null;
      this.currentSubMenuForDocument = null;
    }
    
    let request: any;
    
    if (subMenuId) {
      request = this.tableMenusService.getMenuDocumentsBySubMenuId(subMenuId);
    } else if (menuId) {
      request = this.tableMenusService.getMenuDocumentsByMenuId(menuId);
    } else {
      request = this.tableMenusService.getAllMenuDocuments();
    }

    const sub = request.subscribe({
      next: (documents: TableMenuDocumentDto[]) => {
        this.menuDocuments = documents || [];
        this.loading.documents = false;
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load menu documents'
        });
        this.loading.documents = false;
        this.menuDocuments = [];
        this.currentMenuForDocument = null;
        this.currentSubMenuForDocument = null;
      }
    });
    this.subscriptions.add(sub);
  }

  closeMenuDocumentsSection(): void {
    this.menuDocuments = [];
    this.currentMenuForDocument = null;
    this.currentSubMenuForDocument = null;
  }

  // ==================== Menu CRUD ====================

  openMenuModal(menu?: TableMenuDto): void {
    if (menu) {
      // Editing existing menu
      if (!this.canEditTableMenus && !this.canManageTableMenus) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit table menus.' });
        return;
      }
    } else {
      // Creating new menu
      if (!this.canCreateTableMenus && !this.canManageTableMenus) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create table menus.' });
        return;
      }
    }

    this.editingMenu = menu || null;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    
    // Enable/disable menuCode based on editing state
    if (menu) {
      // Editing: disable menuCode (cannot be changed after creation)
      this.menuForm.get('menuCode')?.disable();
      this.menuForm.patchValue({
        name: menu.name,
        foreignName: menu.foreignName || '',
        menuCode: menu.menuCode,
        icon: menu.icon || '',
        displayOrder: menu.displayOrder,
        isActive: menu.isActive,
        permissions: menu.permissions || []
      });
    } else {
      // Creating: enable menuCode
      this.menuForm.get('menuCode')?.enable();
      this.menuForm.reset({
        name: '',
        foreignName: '',
        menuCode: '',
        icon: '',
        displayOrder: 1,
        isActive: true,
        permissions: []
      });
    }
    this.showMenuModal = true;
  }

  closeMenuModal(): void {
    this.showMenuModal = false;
    this.editingMenu = null;
    this.currentInputLanguage = 'en'; // Reset to English when closing modal
    // Enable all controls before reset
    this.menuForm.get('menuCode')?.enable();
    this.menuForm.reset();
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  saveMenu(): void {
    if (this.editingMenu) {
      // Update existing menu
      if (!this.canEditTableMenus && !this.canManageTableMenus) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to edit table menus.' });
        return;
      }
    } else {
      // Create new menu
      if (!this.canCreateTableMenus && !this.canManageTableMenus) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to create table menus.' });
        return;
      }
    }

    if (this.menuForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    this.loading.save = true;
    // Use getRawValue() to get values from disabled controls
    const formValue = this.menuForm.getRawValue();
    
    if (this.editingMenu) {
      // Update
      const updateDto: UpdateTableMenuDto = {
        name: formValue.name,
        foreignName: formValue.foreignName || undefined,
        icon: formValue.icon || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.updateMenu(this.editingMenu.id, updateDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Menu updated successfully'
          });
          this.closeMenuModal();
          this.loadMenus();
          this.loading.save = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to update menu'
          });
          this.loading.save = false;
        }
      });
      this.subscriptions.add(sub);
    } else {
      // Create
      const createDto: CreateTableMenuDto = {
        name: formValue.name,
        foreignName: formValue.foreignName || undefined,
        menuCode: formValue.menuCode.toUpperCase(),
        icon: formValue.icon || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.createMenu(createDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Menu created successfully'
          });
          this.closeMenuModal();
          this.loadMenus();
          this.loading.save = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to create menu'
          });
          this.loading.save = false;
        }
      });
      this.subscriptions.add(sub);
    }
  }

  deleteMenu(menu: TableMenuDto): void {
    if (!this.canDeleteTableMenus && !this.canManageTableMenus) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to delete table menus.' });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${menu.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        const sub = this.tableMenusService.softDeleteMenu(menu.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Menu deleted successfully'
            });
            this.loadMenus();
            this.loading.delete = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.message || 'Failed to delete menu'
            });
            this.loading.delete = false;
          }
        });
        this.subscriptions.add(sub);
      }
    });
  }

  // ==================== Sub Menu CRUD ====================

  openSubMenuModal(menu: TableMenuDto, subMenu?: TableSubMenuDto): void {
    if (subMenu) {
      // Editing existing sub menu
      if (!this.canEditTableSubMenus && !this.canManageTableSubMenus) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit table sub menus.' });
        return;
      }
    } else {
      // Creating new sub menu
      if (!this.canCreateTableSubMenus && !this.canManageTableSubMenus) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create table sub menus.' });
        return;
      }
    }

    this.currentMenuForSubMenu = menu;
    this.editingSubMenu = subMenu || null;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    
    // Disable menuId when menu is pre-selected (from context)
    if (menu) {
      this.subMenuForm.get('menuId')?.disable();
    } else {
      this.subMenuForm.get('menuId')?.enable();
    }
    
    if (subMenu) {
      this.subMenuForm.patchValue({
        name: subMenu.name,
        foreignName: subMenu.foreignName || '',
        menuId: subMenu.menuId,
        displayOrder: subMenu.displayOrder,
        isActive: subMenu.isActive,
        permissions: subMenu.permissions || []
      });
    } else {
      this.subMenuForm.reset({
        name: '',
        foreignName: '',
        menuId: menu.id,
        displayOrder: 1,
        isActive: true,
        permissions: []
      });
    }
    this.showSubMenuModal = true;
  }

  closeSubMenuModal(): void {
    this.showSubMenuModal = false;
    this.editingSubMenu = null;
    this.currentMenuForSubMenu = null;
    this.currentInputLanguage = 'en'; // Reset to English when closing modal
    // Enable all controls before reset
    this.subMenuForm.get('menuId')?.enable();
    this.subMenuForm.reset();
  }

  saveSubMenu(): void {
    if (this.editingSubMenu) {
      // Update existing sub menu
      if (!this.canEditTableSubMenus && !this.canManageTableSubMenus) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to edit table sub menus.' });
        return;
      }
    } else {
      // Create new sub menu
      if (!this.canCreateTableSubMenus && !this.canManageTableSubMenus) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to create table sub menus.' });
        return;
      }
    }

    if (this.subMenuForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    this.loading.save = true;
    // Use getRawValue() to get values from disabled controls
    const formValue = this.subMenuForm.getRawValue();
    
    if (this.editingSubMenu) {
      // Update
      const updateDto: UpdateTableSubMenuDto = {
        name: formValue.name,
        foreignName: formValue.foreignName || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.updateSubMenu(this.editingSubMenu.id, updateDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sub menu updated successfully'
          });
          this.closeSubMenuModal();
          if (this.currentMenuForSubMenu) {
            this.loadSubMenus(this.currentMenuForSubMenu.id);
          }
          this.loading.save = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to update sub menu'
          });
          this.loading.save = false;
        }
      });
      this.subscriptions.add(sub);
    } else {
      // Create
      const createDto: CreateTableSubMenuDto = {
        name: formValue.name,
        foreignName: formValue.foreignName || undefined,
        menuId: formValue.menuId,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.createSubMenu(createDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sub menu created successfully'
          });
          this.closeSubMenuModal();
          if (this.currentMenuForSubMenu) {
            this.loadSubMenus(this.currentMenuForSubMenu.id);
          }
          this.loading.save = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to create sub menu'
          });
          this.loading.save = false;
        }
      });
      this.subscriptions.add(sub);
    }
  }

  deleteSubMenu(subMenu: TableSubMenuDto): void {
    if (!this.canDeleteTableSubMenus && !this.canManageTableSubMenus) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to delete table sub menus.' });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${subMenu.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        const sub = this.tableMenusService.softDeleteSubMenu(subMenu.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Sub menu deleted successfully'
            });
            if (this.currentMenuForSubMenu) {
              this.loadSubMenus(this.currentMenuForSubMenu.id);
            }
            this.loading.delete = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.message || 'Failed to delete sub menu'
            });
            this.loading.delete = false;
          }
        });
        this.subscriptions.add(sub);
      }
    });
  }

  // ==================== Menu Document CRUD ====================

  openMenuDocumentModal(menu?: TableMenuDto, subMenu?: TableSubMenuDto, document?: TableMenuDocumentDto): void {
    this.currentMenuForDocument = menu || null;
    this.currentSubMenuForDocument = subMenu || null;
    this.editingMenuDocument = document || null;
    
    // Enable/disable controls based on context
    if (document) {
      // Editing: disable documentTypeId (cannot be changed)
      this.menuDocumentForm.get('documentTypeId')?.disable();
    } else {
      // Creating: enable documentTypeId
      this.menuDocumentForm.get('documentTypeId')?.enable();
    }
    
    if (menu || document) {
      // Menu is pre-selected or editing: disable menuId
      this.menuDocumentForm.get('menuId')?.disable();
    } else {
      this.menuDocumentForm.get('menuId')?.enable();
    }
    
    if (subMenu || (document && document.subMenuId)) {
      // Sub menu is pre-selected or editing: disable subMenuId
      this.menuDocumentForm.get('subMenuId')?.disable();
    } else {
      this.menuDocumentForm.get('subMenuId')?.enable();
    }
    
    // If editing a document, load sub menus for the menu that contains it (if menuId exists)
    // This allows the user to change the subMenuId when editing
    if (document && document.menuId) {
      this.loadSubMenusForDocumentModal(document.menuId);
    } else if (menu) {
      // If creating a new document with a menu selected, load its sub menus
      this.loadSubMenusForDocumentModal(menu.id);
    } else {
      // If no menu context, load all sub menus from all menus
      this.loadAllSubMenusForDocumentModal();
    }
    
    if (document) {
      this.menuDocumentForm.patchValue({
        documentTypeId: document.documentTypeId,
        menuId: document.menuId || null,
        subMenuId: document.subMenuId || null,
        displayOrder: document.displayOrder,
        isActive: document.isActive,
        permissions: document.permissions || []
      });
    } else {
      this.menuDocumentForm.reset({
        documentTypeId: null,
        menuId: menu?.id || null,
        subMenuId: subMenu?.id || null,
        displayOrder: 1,
        isActive: true,
        permissions: []
      });
    }
    this.showMenuDocumentModal = true;
  }

  /**
   * Load sub menus for a specific menu (for document modal)
   * This doesn't set currentMenuForSubMenu to avoid interfering with the UI
   * @param menuId The menu ID to load sub menus for
   * @param replaceExisting If true, replace existing sub menus; if false, merge them
   */
  private loadSubMenusForDocumentModal(menuId: number, replaceExisting: boolean = false): void {
    const sub = this.tableMenusService.getSubMenusByMenuId(menuId).subscribe({
      next: (subMenus: TableSubMenuDto[]) => {
        if (replaceExisting) {
          // Replace existing sub menus with new ones
          this.subMenus = subMenus || [];
        } else {
          // Merge with existing sub menus to show all available options
          const existingSubMenuIds = this.subMenus.map(sm => sm.id);
          const newSubMenus = (subMenus || []).filter(sm => !existingSubMenuIds.includes(sm.id));
          this.subMenus = [...this.subMenus, ...newSubMenus];
        }
      },
      error: (error: any) => {
        console.error('Error loading sub menus for document modal:', error);
        // Don't show error to user, just log it
      }
    });
    this.subscriptions.add(sub);
  }

  /**
   * Load all sub menus from all menus (for document modal when no menu context)
   */
  private loadAllSubMenusForDocumentModal(): void {
    this.subMenus = [];
    const loadPromises = this.menus.map(menu => {
      return new Promise<void>((resolve) => {
        this.tableMenusService.getSubMenusByMenuId(menu.id).subscribe({
          next: (subMenus: TableSubMenuDto[]) => {
            const existingSubMenuIds = this.subMenus.map(sm => sm.id);
            const newSubMenus = (subMenus || []).filter(sm => !existingSubMenuIds.includes(sm.id));
            this.subMenus = [...this.subMenus, ...newSubMenus];
            resolve();
          },
          error: () => {
            resolve(); // Continue even if one fails
          }
        });
      });
    });
    Promise.all(loadPromises);
  }

  closeMenuDocumentModal(): void {
    this.showMenuDocumentModal = false;
    this.editingMenuDocument = null;
    this.currentMenuForDocument = null;
    this.currentSubMenuForDocument = null;
    // Enable all controls before reset
    this.menuDocumentForm.get('documentTypeId')?.enable();
    this.menuDocumentForm.get('menuId')?.enable();
    this.menuDocumentForm.get('subMenuId')?.enable();
    this.menuDocumentForm.reset();
    // Don't clear subMenus here - they might be needed for the sub menus section
    // Only clear if we're not viewing sub menus
    if (!this.currentMenuForSubMenu) {
      // Keep subMenus loaded for potential future use
    }
  }

  saveMenuDocument(): void {
    if (this.menuDocumentForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    // Use getRawValue() to get values from disabled controls
    const formValue = this.menuDocumentForm.getRawValue();
    
    // Validate that either menuId or subMenuId is provided
    if (!formValue.menuId && !formValue.subMenuId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select either a Menu or Sub Menu'
      });
      return;
    }

    this.loading.save = true;
    
    if (this.editingMenuDocument) {
      // Update
      const updateDto: UpdateTableMenuDocumentDto = {
        menuId: formValue.menuId || undefined,
        subMenuId: formValue.subMenuId || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.updateMenuDocument(this.editingMenuDocument.id, updateDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Menu document updated successfully'
          });
          this.closeMenuDocumentModal();
          if (formValue.subMenuId) {
            this.loadMenuDocuments(undefined, formValue.subMenuId);
          } else if (formValue.menuId) {
            this.loadMenuDocuments(formValue.menuId);
          }
          this.loading.save = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to update menu document'
          });
          this.loading.save = false;
        }
      });
      this.subscriptions.add(sub);
    } else {
      // Create
      const createDto: CreateTableMenuDocumentDto = {
        documentTypeId: formValue.documentTypeId,
        menuId: formValue.menuId || undefined,
        subMenuId: formValue.subMenuId || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.createMenuDocument(createDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Menu document created successfully'
          });
          this.closeMenuDocumentModal();
          if (formValue.subMenuId) {
            this.loadMenuDocuments(undefined, formValue.subMenuId);
          } else if (formValue.menuId) {
            this.loadMenuDocuments(formValue.menuId);
          }
          this.loading.save = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to create menu document'
          });
          this.loading.save = false;
        }
      });
      this.subscriptions.add(sub);
    }
  }

  deleteMenuDocument(document: TableMenuDocumentDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove this document from the menu?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        const sub = this.tableMenusService.softDeleteMenuDocument(document.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Menu document deleted successfully'
            });
            if (document.subMenuId) {
              this.loadMenuDocuments(undefined, document.subMenuId);
            } else if (document.menuId) {
              this.loadMenuDocuments(document.menuId);
            }
            this.loading.delete = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.message || 'Failed to delete menu document'
            });
            this.loading.delete = false;
          }
        });
        this.subscriptions.add(sub);
      }
    });
  }

  // ==================== Helpers ====================

  getDocumentTypeName(documentTypeId: number): string {
    const docType = this.documentTypes.find(dt => dt.id === documentTypeId);
    return docType ? (docType.menuCaption || docType.name) : `Document ${documentTypeId}`;
  }

  filterMenus(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMenus = [...this.menus];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredMenus = this.menus.filter(menu =>
        menu.name.toLowerCase().includes(term) ||
        (menu.foreignName && menu.foreignName.toLowerCase().includes(term)) ||
        menu.menuCode.toLowerCase().includes(term)
      );
    }
    this.totalRecords = this.filteredMenus.length;
    this.first = 0;
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  // ==================== Stats Helpers ====================

  getActiveMenusCount(): number {
    return this.menus.filter(m => m.isActive).length;
  }

  getTotalSubMenusCount(): number {
    return this.subMenus.length;
  }

  getTotalDocumentsCount(): number {
    return this.menuDocuments.length;
  }

  // ==================== Permissions Helpers ====================

  getPermissionsTooltip(permissions: string[]): string {
    return permissions.join(', ');
  }

  // ==================== Language ====================

  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
  }
}








