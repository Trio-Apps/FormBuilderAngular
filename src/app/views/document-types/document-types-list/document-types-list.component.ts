import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { ApprovalWorkflowService, ApprovalWorkflowDto } from '../../FormBuilder/services/approval-workflow.service';
import {
  DocumentType,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  DocumentSeries,
  CreateDocumentSeriesDto,
  UpdateDocumentSeriesDto,
  DocumentSeriesResetPolicy,
  DocumentSeriesGenerateOn
} from '../../FormBuilder/form-builder/models/document-types.model';
import { ProjectDto } from '../../projects/models/project-dto.model';
import { FormBuilderDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
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
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../auth/auth.service';
import { PermissionService } from '../../../services/permission.service';
import { HasPermissionDirective } from '../../../directives/has-permission.directive';

@Component({
  selector: 'app-document-types-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
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
    TableShellComponent,
    HasPermissionDirective
  ],
  templateUrl: './document-types-list.component.html',
  styleUrls: ['./document-types-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class DocumentTypesListComponent implements OnInit, OnDestroy {
  /** Role-based UI: Admin can manage document types; User can only create submissions */
  isAdmin = false;
  
  // Permission flags
  canViewDocuments = false;
  canCreateDocuments = false;
  canEditDocuments = false;
  canDeleteDocuments = false;
  canManageDocuments = false;

  // Data Arrays
  documentTypes: DocumentType[] = [];
  filteredDocumentTypes: DocumentType[] = [];
  forms: FormBuilderDto[] = []; // All forms for selection
  currentForm: FormBuilderDto | null = null;
  private deletedDocumentTypeIds: Set<number> = new Set(); // Track deleted document type IDs to filter them out
  
  // Document Series Management
  documentSeries: DocumentSeries[] = [];
  allSeries: DocumentSeries[] = [];
  projects: ProjectDto[] = [];
  showSeriesModal = false;
  showSeriesFormModal = false;
  seriesForm!: FormGroup;
  editingSeries: DocumentSeries | null = null;
  currentDocumentTypeForSeries: DocumentType | null = null;
  readonly supportedSeriesPlaceholders = ['{PROJECT}', '{YYYY}', '{MM}', '{DD}', '{SEQ}'];
  readonly resetPolicyOptions: DocumentSeriesResetPolicy[] = ['None', 'Yearly', 'Monthly', 'Daily'];
  readonly generateOnOptions: DocumentSeriesGenerateOn[] = ['Submit', 'Approval'];

  // Approval Workflow Management
  approvalWorkflows: ApprovalWorkflowDto[] = [];
  showApprovalWorkflowModal = false;
  currentDocumentTypeForWorkflow: DocumentType | null = null;
  selectedWorkflowId: number | null = null;

  // Loading States
  loading = {
    documentTypes: false,
    save: false,
    delete: false,
    forms: false,
    series: false,
    projects: false,
    workflows: false,
    updateWorkflow: false,
    allSeries: false
  };

  // Document Type Modal
  showModal = false;
  documentTypeForm!: FormGroup;
  editingDocumentType: DocumentType | null = null;

  // Parent Menu Options
  parentMenuOptions: DocumentType[] = [];
  loadingParentOptions = false;

  // Search Filter
  searchTerm = '';

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  // Subscription for permissions
  private permissionsSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private projectsService: ProjectsService,
    private approvalWorkflowService: ApprovalWorkflowService,
    private authService: AuthService,
    public permissionService: PermissionService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    console.log('[DocumentTypesList] ========== CONSTRUCTOR CALLED ==========');
    console.log('[DocumentTypesList] Component instance created');
    // Initialize the form
    this.documentTypeForm = this.fb.group({
      formBuilderId: [null, [Validators.required]], // Form selection is required
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      menuCaption: ['', [Validators.required, Validators.maxLength(200)]],
      menuOrder: [0, [Validators.min(0)]],
      parentMenuId: [null],
      defaultSeriesId: [null],
      isActive: [true]
    });
    
    // Initialize series form
    this.seriesForm = this.fb.group({
      documentTypeId: [null, [Validators.required]],
      projectId: [null, [Validators.required]],
      seriesName: ['', [Validators.required, Validators.maxLength(100)]],
      template: ['', [Validators.required, Validators.maxLength(150)]],
      seriesCode: ['', [Validators.maxLength(50)]],
      sequenceStart: [1, [Validators.required, Validators.min(1)]],
      sequencePadding: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      resetPolicy: ['Yearly' as DocumentSeriesResetPolicy, [Validators.required]],
      generateOn: ['Submit' as DocumentSeriesGenerateOn, [Validators.required]],
      nextNumber: [1, [Validators.required, Validators.min(1)]],
      isDefault: [false],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    console.log('[DocumentTypesList] ========== ngOnInit STARTED ==========');
    const role = this.authService.role() || 'User';
    this.isAdmin = ['administration', 'admin'].includes(role.toLowerCase());
    console.log('[DocumentTypesList] Initializing, role:', role, 'isAdmin:', this.isAdmin);
    console.log('[DocumentTypesList] PermissionService available:', !!this.permissionService);

    // Load permissions first - ensure they are loaded before loading data
    this.loadPermissions();
    
    // Also ensure permissions are loaded from API if not already loaded
    if (!this.permissionService.loaded()) {
      console.log('[DocumentTypesList] Permissions not loaded yet, loading from API...');
      this.permissionService.loadUserPermissions().subscribe({
        next: (permissions) => {
          console.log('[DocumentTypesList] Permissions loaded from API:', permissions?.length || 0, 'permissions');
          this.loadPermissions();
          this.loadDataAfterPermissions();
        },
        error: (error) => {
          console.error('[DocumentTypesList] Error loading permissions:', error);
          // Still try to load data even if permissions fail
          this.loadDataAfterPermissions();
        }
      });
    } else {
      console.log('[DocumentTypesList] Permissions already loaded');
      this.loadDataAfterPermissions();
    }

    // Subscribe to permission changes
    this.permissionsSubscription = this.permissionService.permissions$.subscribe(() => {
      console.log('[DocumentTypesList] Permissions changed, reloading...');
      this.loadPermissions();
      this.cdr.detectChanges();
    });

    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }
    
    // Load deleted document type IDs from localStorage to persist across sessions
    this.loadDeletedDocumentTypeIds();
  }

  /**
   * Load data after permissions are ready
   */
  private loadDataAfterPermissions(): void {
    console.log('[DocumentTypesList] ========== loadDataAfterPermissions STARTED ==========');
    console.log('[DocumentTypesList] Loading data after permissions check...');
    console.log('[DocumentTypesList] Current permissions:', {
      canViewDocuments: this.canViewDocuments,
      canManageDocuments: this.canManageDocuments,
      permissionServiceCanView: this.permissionService.canViewDocuments(),
      permissionServiceCanManage: this.permissionService.canManageDocuments()
    });
    
    // Load all forms, document types, and projects
    console.log('[DocumentTypesList] Calling loadForms()...');
    this.loadForms();
    
    console.log('[DocumentTypesList] Calling loadDocumentTypes()...');
    this.loadDocumentTypes();

    console.log('[DocumentTypesList] Calling loadAllSeries()...');
    this.loadAllSeries();
    
    // Projects / workflows are admin-only features (series/workflow management)
    if (this.isAdmin) {
      console.log('[DocumentTypesList] Admin user, loading projects...');
      this.loadProjects();
    }
    
    console.log('[DocumentTypesList] ========== loadDataAfterPermissions COMPLETED ==========');
  }

  /**
   * Load user permissions for document operations
   */
  private loadPermissions(): void {
    console.log('[DocumentTypesList] loadPermissions called');
    console.log('[DocumentTypesList] PermissionService state:', {
      loaded: this.permissionService.loaded(),
      permissionsCount: this.permissionService.permissions().length,
      allPermissions: this.permissionService.permissions()
    });
    
    this.canViewDocuments = this.permissionService.canViewDocuments();
    this.canCreateDocuments = this.permissionService.canCreateDocuments();
    this.canEditDocuments = this.permissionService.canEditDocuments();
    this.canDeleteDocuments = this.permissionService.canDeleteDocuments();
    this.canManageDocuments = this.permissionService.canManageDocuments();
    
    // Check specific permission
    const hasDocumentView = this.permissionService.hasPermission('Document_Allow_View');
    const hasDocumentManage = this.permissionService.hasPermission('Document_Allow_Manage');
    const hasDocumentViewAll = this.permissionService.hasPermission('Document_Allow_ViewAll');
    
    // Debug log
    console.log('[DocumentTypesList] Permissions loaded:', {
      canViewDocuments: this.canViewDocuments,
      canCreateDocuments: this.canCreateDocuments,
      canEditDocuments: this.canEditDocuments,
      canDeleteDocuments: this.canDeleteDocuments,
      canManageDocuments: this.canManageDocuments,
      hasDocumentView: hasDocumentView,
      hasDocumentManage: hasDocumentManage,
      hasDocumentViewAll: hasDocumentViewAll,
      allDocumentPermissions: this.permissionService.permissions().filter(p => p.startsWith('Document_'))
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from permissions
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  /**
   * Load deleted document type IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedDocumentTypeIds(): void {
    try {
      const savedIds = localStorage.getItem('deletedDocumentTypeIds');
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedDocumentTypeIds = new Set(idsArray);
        console.log('[DocumentTypesList] Loaded deleted document type IDs from localStorage:', Array.from(this.deletedDocumentTypeIds));
      }
    } catch (error) {
      console.error('[DocumentTypesList] Error loading deleted document type IDs from localStorage:', error);
      this.deletedDocumentTypeIds = new Set();
    }
  }

  /**
   * Save deleted document type IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedDocumentTypeIds(): void {
    try {
      const idsArray = Array.from(this.deletedDocumentTypeIds);
      localStorage.setItem('deletedDocumentTypeIds', JSON.stringify(idsArray));
      console.log('[DocumentTypesList] Saved deleted document type IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[DocumentTypesList] Error saving deleted document type IDs to localStorage:', error);
    }
  }

  loadForms(): void {
    this.loading.forms = true;
    // Disable formBuilderId while loading
    this.documentTypeForm.get('formBuilderId')?.disable();
    
    // Get all forms with large page size
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        // Load only published and active forms
        this.forms = (result.items || []).filter((f: FormBuilderDto) => f.isPublished && f.isActive);
        this.loading.forms = false;
        // Enable formBuilderId after loading
        this.documentTypeForm.get('formBuilderId')?.enable();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading forms:', error);
        this.forms = [];
        this.loading.forms = false;
        // Enable formBuilderId even on error
        this.documentTypeForm.get('formBuilderId')?.enable();
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentTypes(): void {
    console.log('[DocumentTypesList] ========== loadDocumentTypes STARTED ==========');
    console.log('[DocumentTypesList] Permission check:', {
      canViewDocuments: this.canViewDocuments,
      canManageDocuments: this.canManageDocuments,
      permissionServiceCanView: this.permissionService.canViewDocuments(),
      permissionServiceCanManage: this.permissionService.canManageDocuments()
    });
    
    // Check permissions - but don't block loading
    // API will handle permission checks on backend
    const hasPermission = this.canViewDocuments || this.canManageDocuments || 
                         this.permissionService.canViewDocuments() || 
                         this.permissionService.canManageDocuments();
    
    console.log('[DocumentTypesList] Permission check result:', {
      hasPermission: hasPermission,
      canViewDocuments: this.canViewDocuments,
      canManageDocuments: this.canManageDocuments,
      serviceCanView: this.permissionService.canViewDocuments(),
      serviceCanManage: this.permissionService.canManageDocuments(),
      allDocumentPermissions: this.permissionService.permissions().filter(p => p.toLowerCase().includes('document'))
    });
    
    if (!hasPermission) {
      console.warn('[DocumentTypesList] ⚠️ User does not have Document_Allow_View permission');
      console.warn('[DocumentTypesList] Available permissions:', this.permissionService.permissions());
      console.warn('[DocumentTypesList] Document-related permissions:', 
        this.permissionService.permissions().filter(p => p.toLowerCase().includes('document')));
      console.warn('[DocumentTypesList] ⚠️ Proceeding to load anyway - API will handle permission check');
      
      // Show warning but don't block - let API decide
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Warning',
        detail: 'You may not have permission to view document types. If you see no data, please contact administrator to grant Document_Allow_View permission.',
        life: 5000
      });
    } else {
      console.log('[DocumentTypesList] ✅ User has permission, proceeding to load document types...');
    }

    // Load all document types (not filtered by form)
    this.loading.documentTypes = true;
    console.log('[DocumentTypesList] Loading document types...');
    
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        console.log('[DocumentTypesList] Document types loaded from API:', types?.length || 0, 'types');
        const allTypes = types || [];
        
        if (allTypes.length === 0) {
          console.warn('[DocumentTypesList] No document types returned from API');
          // Try fallback: getActiveDocumentTypes
          this.documentTypesService.getActiveDocumentTypes().subscribe({
            next: (activeTypes) => {
              console.log('[DocumentTypesList] Fallback: Loaded active document types:', activeTypes?.length || 0);
              this.processDocumentTypes(activeTypes || []);
            },
            error: (fallbackError) => {
              console.error('[DocumentTypesList] Fallback error:', fallbackError);
              this.handleLoadError(fallbackError);
            }
          });
          return;
        }
        
        this.processDocumentTypes(allTypes);
      },
      error: (error: any) => {
        console.error('[DocumentTypesList] Error loading document types:', error);
        this.handleLoadError(error);
      }
    });
  }

  /**
   * Process document types after loading from API
   */
  private processDocumentTypes(allTypes: DocumentType[]): void {
    console.log('[DocumentTypesList] Processing document types:', {
      totalFromAPI: allTypes.length,
      deletedTracking: this.deletedDocumentTypeIds.size,
      deletedIds: Array.from(this.deletedDocumentTypeIds)
    });
    
    // Filter out deleted document types before processing
    const activeTypes = allTypes.filter(type => {
      const isDeleted = this.deletedDocumentTypeIds.has(type.id!);
      if (isDeleted) {
        console.log('[DocumentTypesList] Filtering out deleted document type:', type.id, type.name);
      }
      return !isDeleted;
    });

    // Clean up deletedDocumentTypeIds - remove IDs that are no longer in the API response
    const apiTypeIds = new Set(allTypes.map(t => t.id));
    const idsToRemove: number[] = [];
    this.deletedDocumentTypeIds.forEach(deletedId => {
      const typeInApi = allTypes.find(t => t.id === deletedId);
      if (!typeInApi) {
        // Document type not in API response - it was hard deleted from server, remove from tracking
        idsToRemove.push(deletedId);
      } else if (typeInApi.isActive !== false) {
        // Document type is back in API and active again (might have been reactivated)
        idsToRemove.push(deletedId);
        console.log('[DocumentTypesList] Document type was reactivated, removing from deleted tracking:', deletedId);
      }
    });
    if (idsToRemove.length > 0) {
      idsToRemove.forEach(id => this.deletedDocumentTypeIds.delete(id));
      this.saveDeletedDocumentTypeIds();
      console.log('[DocumentTypesList] Cleaned up deleted document type IDs:', idsToRemove);
    }

    // Show all document types (including inactive ones) - don't filter by isActive
    // User can see inactive types and reactivate them
    const visibleTypes = activeTypes; // Keep all types, including inactive ones
    
    this.documentTypes = visibleTypes;
    this.filteredDocumentTypes = [...this.documentTypes];
    this.totalRecords = this.filteredDocumentTypes.length;
    this.loading.documentTypes = false;
    
    console.log('[DocumentTypesList] Processed document types:', {
      totalFromAPI: allTypes.length,
      afterFiltering: activeTypes.length,
      visible: visibleTypes.length,
      documentTypesArray: this.documentTypes.length,
      filteredDocumentTypesArray: this.filteredDocumentTypes.length,
      totalRecords: this.totalRecords,
      deleted: this.deletedDocumentTypeIds.size
    });
    
    // Log first few document types for debugging
    if (this.documentTypes.length > 0) {
      console.log('[DocumentTypesList] First 3 document types:', this.documentTypes.slice(0, 3).map(t => ({
        id: t.id,
        name: t.name,
        code: t.code,
        isActive: t.isActive
      })));
    } else {
      console.warn('[DocumentTypesList] No document types to display after processing!');
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Handle errors when loading document types
   */
  private handleLoadError(error: any): void {
    this.documentTypes = [];
    this.filteredDocumentTypes = [];
    this.loading.documentTypes = false;
    
    let errorMessage = 'Failed to load document types';
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    if (error?.status === 400) {
      errorMessage = 'Bad request. Please check the API endpoint configuration.';
    } else if (error?.status === 401 || error?.status === 403) {
      errorMessage = 'Access denied. Please check your permissions (Document_Allow_View).';
    } else if (error?.status === 404) {
      errorMessage = 'Document types endpoint not found.';
    } else if (error?.status === 0) {
      errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
    }
    
    console.error('[DocumentTypesList] Load error details:', {
      status: error?.status,
      statusText: error?.statusText,
      message: errorMessage,
      error: error?.error
    });
    
    this.messageService.add({ 
      severity: 'error', 
      summary: `Error (${error?.status || 'Unknown'})`, 
      detail: errorMessage,
      life: 8000
    });
    this.cdr.detectChanges();
  }

  filterDocumentTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentTypes = [...this.documentTypes];
      this.totalRecords = this.filteredDocumentTypes.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDocumentTypes = this.documentTypes.filter(type =>
      type.name?.toLowerCase().includes(term) ||
      type.code?.toLowerCase().includes(term) ||
      type.menuCaption?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredDocumentTypes.length;
  }

  getFormName(formBuilderId?: number): string {
    if (!formBuilderId) return '-';
    const form = this.forms.find(f => f.id === formBuilderId);
    if (!form) return `Form #${formBuilderId}`;
    return `${form.formName} (${form.formCode})`;
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  getPaginatedDocumentTypes(): DocumentType[] {
    return this.filteredDocumentTypes.slice(this.first, this.first + this.rows);
  }

  getParentMenuName(parentMenuId?: number): string {
    if (!parentMenuId) return '-';
    const parent = this.documentTypes.find(t => t.id === parentMenuId);
    return parent ? (parent.name || `Document Type #${parentMenuId}`) : `Document Type #${parentMenuId}`;
  }

  getActiveDocumentTypesCount(): number {
    return this.documentTypes.filter(t => t.isActive).length;
  }

  openAddModal(): void {
    // Permission check
    if (!this.canCreateDocuments && !this.canManageDocuments) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'You do not have permission to create document types.'
      });
      return;
    }

    this.editingDocumentType = null;
    this.showModal = true;
    this.loadParentMenuOptions();
    
    this.documentTypeForm.reset({
      name: '',
      code: '',
      formBuilderId: null,
      menuCaption: '',
      menuOrder: 0,
      parentMenuId: null,
      defaultSeriesId: null,
      isActive: true
    });
    
    // Enable form controls
    this.documentTypeForm.get('formBuilderId')?.enable();
    this.documentTypeForm.get('parentMenuId')?.enable();
  }

  openEditModal(documentType: DocumentType): void {
    // Permission check
    if (!this.canEditDocuments && !this.canManageDocuments) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'You do not have permission to edit document types.'
      });
      return;
    }

    this.editingDocumentType = documentType;
    this.showModal = true;
    this.loadParentMenuOptions();
    
    this.documentTypeForm.patchValue({
      formBuilderId: documentType.formBuilderId || null,
      name: documentType.name || '',
      code: documentType.code || '',
      menuCaption: documentType.menuCaption || '',
      menuOrder: documentType.menuOrder || 0,
      parentMenuId: documentType.parentMenuId || null,
      defaultSeriesId: documentType.defaultSeriesId ?? null,
      isActive: documentType.isActive !== false
    });
    
    // Enable form controls
    this.documentTypeForm.get('formBuilderId')?.enable();
    this.documentTypeForm.get('parentMenuId')?.enable();
  }

  loadParentMenuOptions(): void {
    this.loadingParentOptions = true;
    // Disable parentMenuId while loading
    this.documentTypeForm.get('parentMenuId')?.disable();
    
    this.documentTypesService.getActiveDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        // Filter out the current document type to prevent circular reference when editing
        if (this.editingDocumentType && this.editingDocumentType.id) {
          this.parentMenuOptions = types.filter(t => t.id !== this.editingDocumentType!.id);
        } else {
          this.parentMenuOptions = types;
        }
        this.loadingParentOptions = false;
        // Enable parentMenuId after loading
        this.documentTypeForm.get('parentMenuId')?.enable();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading parent menu options:', error);
        this.parentMenuOptions = [];
        this.loadingParentOptions = false;
        // Enable parentMenuId even on error
        this.documentTypeForm.get('parentMenuId')?.enable();
        this.cdr.detectChanges();
      }
    });
  }

  getParentMenuDisplayName(docType: DocumentType): string {
    if (!docType) return '';
    const name = docType.name || '';
    const caption = docType.menuCaption || '';
    if (caption && caption !== name) {
      return `${name} (${caption})`;
    }
    return name;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingDocumentType = null;
    this.documentTypeForm.reset();
    // Ensure controls are enabled when closing
    this.documentTypeForm.get('formBuilderId')?.enable();
    this.documentTypeForm.get('parentMenuId')?.enable();
  }

  saveDocumentType(): void {
    // Permission check
    if (this.editingDocumentType) {
      // Editing - check edit permission
      if (!this.canEditDocuments && !this.canManageDocuments) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Permission Denied',
          detail: 'You do not have permission to edit document types.'
        });
        return;
      }
    } else {
      // Creating - check create permission
      if (!this.canCreateDocuments && !this.canManageDocuments) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Permission Denied',
          detail: 'You do not have permission to create document types.'
        });
        return;
      }
    }

    if (this.documentTypeForm.invalid) {
      this.markFormGroupTouched(this.documentTypeForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const formData = this.documentTypeForm.value;

    if (!formData.name || !formData.name.trim()) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Document name is required' });
      return;
    }

    if (!formData.code || !formData.code.trim()) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Document code is required' });
      return;
    }

    if (!formData.menuCaption || !formData.menuCaption.trim()) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Menu caption is required' });
      return;
    }

    if (!formData.formBuilderId) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Form selection is required' });
      return;
    }

    if (this.editingDocumentType && this.editingDocumentType.id) {
      // Handle select value: ngValue returns actual null or number
      const parentMenuIdValue = formData.parentMenuId;
      const newParentMenuId = (parentMenuIdValue !== null && parentMenuIdValue !== undefined)
        ? Number(parentMenuIdValue) 
        : undefined;
      
      const currentParentMenuId = this.editingDocumentType.parentMenuId || undefined;
      
      // Check if parentMenuId is being changed and if this document type has children
      if (newParentMenuId !== currentParentMenuId) {
        // Check if this document type has children that would be affected
        this.documentTypesService.hasChildDocumentTypes(this.editingDocumentType.id).subscribe({
          next: (hasChildren: boolean) => {
            if (hasChildren) {
              this.loading.save = false;
              this.messageService.add({
                severity: 'warn',
                summary: 'Cannot Update Parent Menu',
                detail: 'This document type is used as a parent menu for other document types. You cannot change its parent menu relationship.',
                life: 8000
              });
              return;
            }
            
            // Proceed with update
            this.performUpdate(formData, newParentMenuId);
          },
          error: (error: any) => {
            console.error('Error checking for child document types:', error);
            // If check fails, proceed with update but handle errors
            this.performUpdate(formData, newParentMenuId);
          }
        });
      } else {
        // No change to parentMenuId, proceed with update
        this.performUpdate(formData, newParentMenuId);
      }
    } else {
      // Creating new document type
      if (!formData.formBuilderId) {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Form selection is required' });
        return;
      }

      const createDto: CreateDocumentTypeDto = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        formBuilderId: Number(formData.formBuilderId),
        menuCaption: formData.menuCaption.trim(),
        menuOrder: formData.menuOrder !== null && formData.menuOrder !== undefined ? Number(formData.menuOrder) : 0,
        defaultSeriesId: formData.defaultSeriesId ? Number(formData.defaultSeriesId) : null
      };
      
      console.log('[DocumentTypesList] Creating document type with DTO:', createDto);

      // Only add parentMenuId if it has a valid value
      const parentMenuIdValue = formData.parentMenuId;
      if (parentMenuIdValue !== null && parentMenuIdValue !== undefined) {
        const parentId = Number(parentMenuIdValue);
        if (!isNaN(parentId) && parentId > 0) {
          createDto.parentMenuId = parentId;
        }
      }

      // Set isActive (default to true if not specified)
      createDto.isActive = formData.isActive !== false;

      this.documentTypesService.createDocumentType(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type created successfully' });
          this.closeModal();
          this.loadDocumentTypes();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating document type:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create document type';
          
          if (error?.error?.detail) {
            errorMessage = error.error.detail;
          } else if (error?.error?.errors) {
            const errors = error.error.errors;
            if (typeof errors === 'object') {
              const errorArray: string[] = [];
              for (const key in errors) {
                if (errors.hasOwnProperty(key)) {
                  const propErrors = errors[key];
                  if (Array.isArray(propErrors)) {
                    errorArray.push(`${key}: ${propErrors.join(', ')}`);
                  } else {
                    errorArray.push(`${key}: ${propErrors}`);
                  }
                }
              }
              errorMessage = errorArray.length > 0 ? errorArray.join('; ') : 'Validation error';
            }
          }
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage,
            life: 8000
          });
        }
      });
    }
  }

  private performUpdate(formData: any, parentMenuId?: number): void {
    if (!this.editingDocumentType) return;

    // Handle parentMenuId: if undefined (no parent selected), set to null explicitly to remove parent relationship
    const updateParentMenuId = parentMenuId !== undefined ? parentMenuId : null;

    const updateDto: UpdateDocumentTypeDto = {
      name: formData.name?.trim() || undefined,
      code: formData.code?.trim() || undefined,
      formBuilderId: formData.formBuilderId ? Number(formData.formBuilderId) : undefined,
      menuCaption: formData.menuCaption?.trim() || undefined,
      menuOrder: formData.menuOrder !== null && formData.menuOrder !== undefined ? Number(formData.menuOrder) : undefined,
      parentMenuId: updateParentMenuId,
      defaultSeriesId: formData.defaultSeriesId ? Number(formData.defaultSeriesId) : null,
      isActive: formData.isActive !== false
    };

    this.documentTypesService.updateDocumentType(this.editingDocumentType.id, updateDto).subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type updated successfully' });
        this.closeModal();
        this.loadDocumentTypes();
      },
      error: (error: any) => {
        this.loading.save = false;
        console.error('Error updating document type:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update document type';
        
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('foreign key') || errorText.includes('constraint') || errorText.includes('parentmenuid')) {
          errorMessage = 'Cannot update this document type because it is used as a parent menu for other document types.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 8000
        });
      }
    });
  }

  deleteDocumentType(documentType: DocumentType): void {
    if (!documentType || !documentType.id) return;

    // Permission check
    if (!this.canDeleteDocuments && !this.canManageDocuments) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'You do not have permission to delete document types.'
      });
      return;
    }

    this.loading.delete = true;
    this.documentTypesService.hasChildDocumentTypes(documentType.id).subscribe({
      next: (hasChildren: boolean) => {
        this.loading.delete = false;
        
        if (hasChildren) {
          // Get child document types to show count
          this.documentTypesService.getDocumentTypesByParentMenuId(documentType.id).subscribe({
            next: (children: DocumentType[]) => {
              const childrenCount = children.length;
              
              this.confirmationService.confirm({
                message: `This document type is used as a parent menu for ${childrenCount} other document type(s). The parent relationship will be automatically removed from all child document types before deletion. Do you want to proceed?`,
                header: 'Delete Document Type with Children',
                icon: 'pi pi-exclamation-triangle',
                acceptButtonStyleClass: 'p-button-danger',
                rejectButtonStyleClass: 'p-button-secondary',
                accept: () => {
                  this.performDeletion(documentType.id!);
                }
              });
            },
            error: () => {
              this.confirmAndDelete(documentType);
            }
          });
          return;
        }

        // No children, proceed with normal deletion
        this.confirmAndDelete(documentType);
      },
      error: () => {
        this.loading.delete = false;
        this.confirmAndDelete(documentType);
      }
    });
  }

  private confirmAndDelete(documentType: DocumentType): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the document type "${documentType.name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.performDeletion(documentType.id!);
      }
    });
  }

  private performDeletion(id: number): void {
    this.loading.delete = true;
    this.documentTypesService.deleteDocumentType(id).subscribe({
      next: () => {
        // Add to deleted document types set to filter it out even after refresh/login
        this.deletedDocumentTypeIds.add(id);
        // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
        this.saveDeletedDocumentTypeIds();

        // Remove document type from the list immediately
        const typeIndex = this.documentTypes.findIndex(t => t.id === id);
        if (typeIndex !== -1) {
          this.documentTypes.splice(typeIndex, 1);
        }
        
        // Update filtered list
        const filteredIndex = this.filteredDocumentTypes.findIndex(t => t.id === id);
        if (filteredIndex !== -1) {
          this.filteredDocumentTypes.splice(filteredIndex, 1);
        }
        
        this.totalRecords = this.filteredDocumentTypes.length;

        this.loading.delete = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Document type deleted successfully',
          life: 5000
        });
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.loading.delete = false;
        console.error('Error deleting document type:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete document type';
        
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('foreign key') || errorText.includes('constraint')) {
          errorMessage = 'Cannot delete this document type. It may have associated records.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 10000
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.documentTypeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.documentTypeForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength']) return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ==================== DOCUMENT SERIES MANAGEMENT ====================

  loadProjects(): void {
    if (this.loading.projects) {
      return; // Already loading
    }
    
    this.loading.projects = true;
    this.projectsService.getProjects(1, 1000).subscribe({
      next: (result) => {
        this.projects = (result.items || []).filter((p: ProjectDto) => p.isActive !== false);
        this.loading.projects = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.projects = [];
        this.loading.projects = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Failed to load projects. Please refresh the page.'
        });
        this.cdr.detectChanges();
      }
    });
  }

  openManageSeriesModal(documentType: DocumentType): void {
    if (!documentType || !documentType.id) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Warning', 
        detail: 'Please save the document type first before managing series' 
      });
      return;
    }
    
    // Ensure projects are loaded before opening modal
    if (this.projects.length === 0 && !this.loading.projects) {
      this.loadProjects();
    }
    
    this.currentDocumentTypeForSeries = documentType;
    this.loadDocumentSeries(documentType.id);
    this.showSeriesModal = true;
  }

  loadDocumentSeries(documentTypeId: number): void {
    this.loading.series = true;
    this.documentTypesService.getDocumentSeriesByDocumentTypeId(documentTypeId).subscribe({
      next: (series: DocumentSeries[]) => {
        this.documentSeries = series || [];
        this.loading.series = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading document series:', error);
        this.documentSeries = [];
        this.loading.series = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to load document series' 
        });
        this.cdr.detectChanges();
      }
    });
  }

  openAddSeriesModal(): void {
    if (!this.currentDocumentTypeForSeries || !this.currentDocumentTypeForSeries.id) {
      return;
    }
    
    // Ensure projects are loaded
    if (this.projects.length === 0 && !this.loading.projects) {
      this.loadProjects();
    }
    
    this.editingSeries = null;
    this.showSeriesFormModal = true;
    this.seriesForm.reset({
      documentTypeId: this.currentDocumentTypeForSeries.id,
      projectId: null,
      seriesName: '',
      template: '',
      seriesCode: '',
      sequenceStart: 1,
      sequencePadding: 3,
      resetPolicy: 'Yearly',
      generateOn: 'Submit',
      nextNumber: 1,
      isDefault: false,
      isActive: true
    });
    
    // Enable projectId control
    this.seriesForm.get('projectId')?.enable();
  }

  openEditSeriesModal(series: DocumentSeries): void {
    this.editingSeries = series;
    this.showSeriesFormModal = true;
    this.seriesForm.patchValue({
      documentTypeId: series.documentTypeId,
      projectId: series.projectId,
      seriesName: series.seriesName || series.seriesCode,
      template: series.template || `${series.seriesCode}-{SEQ}`,
      seriesCode: series.seriesCode,
      sequenceStart: series.sequenceStart || series.nextNumber || 1,
      sequencePadding: series.sequencePadding || 3,
      resetPolicy: series.resetPolicy || 'Yearly',
      generateOn: series.generateOn || 'Submit',
      nextNumber: series.nextNumber || 1,
      isDefault: series.isDefault || false,
      isActive: series.isActive !== false
    });
  }

  saveSeries(): void {
    if (this.seriesForm.invalid) {
      this.markFormGroupTouched(this.seriesForm);
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please fill all required fields correctly' 
      });
      return;
    }

    this.loading.series = true;
    const formData = this.seriesForm.value;
    const template = String(formData.template || '').trim();
    const unsupportedPlaceholders = this.getUnsupportedTemplatePlaceholders(template);

    if (unsupportedPlaceholders.length > 0) {
      this.loading.series = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: `Unsupported placeholders: ${unsupportedPlaceholders.join(', ')}`
      });
      return;
    }

    if (!template.includes('{SEQ}')) {
      this.loading.series = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Template must include {SEQ} placeholder.'
      });
      return;
    }

    const sequenceStart = Number(formData.sequenceStart || 1);
    const sequencePadding = Number(formData.sequencePadding || 3);
    const nextNumber = Number(formData.nextNumber || sequenceStart || 1);
    const seriesCode = this.generateSeriesCodeForCompatibility(template, formData.seriesName);

    if (this.editingSeries && this.editingSeries.id) {
      // Update existing series
      const updateDto: UpdateDocumentSeriesDto = {
        projectId: formData.projectId,
        seriesName: String(formData.seriesName || '').trim(),
        template,
        seriesCode,
        sequenceStart,
        sequencePadding,
        resetPolicy: formData.resetPolicy,
        generateOn: formData.generateOn,
        nextNumber,
        isDefault: formData.isDefault,
        isActive: formData.isActive
      };

      this.documentTypesService.updateDocumentSeries(this.editingSeries.id, updateDto).subscribe({
        next: () => {
          this.loading.series = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Document series updated successfully' 
          });
          this.closeSeriesFormModal();
          if (this.currentDocumentTypeForSeries?.id) {
            this.loadDocumentSeries(this.currentDocumentTypeForSeries.id);
          }
        },
        error: (error: any) => {
          this.loading.series = false;
          console.error('Error updating document series:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update document series';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new series
      const createDto: CreateDocumentSeriesDto = {
        documentTypeId: formData.documentTypeId,
        projectId: formData.projectId,
        seriesName: String(formData.seriesName || '').trim(),
        template,
        seriesCode,
        sequenceStart,
        sequencePadding,
        resetPolicy: formData.resetPolicy,
        generateOn: formData.generateOn,
        nextNumber,
        isDefault: formData.isDefault || false,
        isActive: formData.isActive !== false
      };

      this.documentTypesService.createDocumentSeries(createDto).subscribe({
        next: () => {
          this.loading.series = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Document series created successfully' 
          });
          this.closeSeriesFormModal();
          if (this.currentDocumentTypeForSeries?.id) {
            this.loadDocumentSeries(this.currentDocumentTypeForSeries.id);
          }
        },
        error: (error: any) => {
          this.loading.series = false;
          console.error('Error creating document series:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create document series';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteDocumentSeries(series: DocumentSeries): void {
    if (!series || !series.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the document series "${series.seriesCode}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.series = true;
        this.documentTypesService.deleteDocumentSeries(series.id!).subscribe({
          next: () => {
            this.loading.series = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Document series deleted successfully' 
            });
            if (this.currentDocumentTypeForSeries?.id) {
              this.loadDocumentSeries(this.currentDocumentTypeForSeries.id);
            }
          },
          error: (error: any) => {
            this.loading.series = false;
            console.error('Error deleting document series:', error);
            
            // Extract error message from various response formats
            let errorMessage = 'Failed to delete document series';
            const errorResponse = error?.error;
            
            if (errorResponse) {
              if (typeof errorResponse === 'string') {
                errorMessage = errorResponse;
              } else if (errorResponse.message) {
                errorMessage = errorResponse.message;
              } else if (errorResponse.errorMessage) {
                errorMessage = errorResponse.errorMessage;
              } else if (errorResponse.title) {
                errorMessage = errorResponse.title;
              } else if (errorResponse.detail) {
                errorMessage = errorResponse.detail;
              } else if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
                errorMessage = errorResponse.errors.join(', ');
              } else if (errorResponse.errors && typeof errorResponse.errors === 'object') {
                errorMessage = Object.values(errorResponse.errors).flat().join(', ');
              }
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: errorMessage 
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  toggleSeriesStatus(series: DocumentSeries): void {
    if (!series || !series.id) return;

    const newStatus = !series.isActive;
    this.loading.series = true;
    this.documentTypesService.toggleDocumentSeriesStatus(series.id, newStatus).subscribe({
      next: () => {
        this.loading.series = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: `Document series ${newStatus ? 'activated' : 'deactivated'} successfully` 
        });
        if (this.currentDocumentTypeForSeries?.id) {
          this.loadDocumentSeries(this.currentDocumentTypeForSeries.id);
        }
      },
      error: (error: any) => {
        this.loading.series = false;
        console.error('Error toggling document series status:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to toggle document series status';
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: errorMessage 
        });
        this.cdr.detectChanges();
      }
    });
  }

  setSeriesAsDefault(series: DocumentSeries): void {
    if (!series || !series.id) return;

    this.loading.series = true;
    this.documentTypesService.setDocumentSeriesAsDefault(series.id).subscribe({
      next: () => {
        this.loading.series = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Document series set as default successfully' 
        });
        if (this.currentDocumentTypeForSeries?.id) {
          this.loadDocumentSeries(this.currentDocumentTypeForSeries.id);
        }
      },
      error: (error: any) => {
        this.loading.series = false;
        console.error('Error setting document series as default:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to set document series as default';
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: errorMessage 
        });
        this.cdr.detectChanges();
      }
    });
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
  }

  loadAllSeries(): void {
    this.loading.allSeries = true;
    this.documentTypesService.getAllDocumentSeries().subscribe({
      next: (series: DocumentSeries[]) => {
        // Include all series in the dropdown (active and inactive)
        this.allSeries = (series || []);
        this.loading.allSeries = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading all document series:', error);
        this.allSeries = [];
        this.loading.allSeries = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSeriesDisplayName(series: DocumentSeries): string {
    const title = series.seriesName || series.seriesCode;
    const template = series.template || series.seriesCode;
    const status = series.isActive === false ? ' - Inactive' : '';
    return `${title} (${template})${status}`;
  }

  getDefaultSeriesName(seriesId?: number | null): string {
    if (!seriesId) return '-';
    const series = this.allSeries.find(s => s.id === seriesId);
    return series ? (series.seriesName || series.seriesCode) : `Series #${seriesId}`;
  }

  getSeriesTemplate(series: DocumentSeries): string {
    return series.template || `${series.seriesCode}-{SEQ}`;
  }

  getSeriesPreview(series?: DocumentSeries): string {
    const now = new Date();
    const year = `${now.getFullYear()}`;
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    const targetTemplate = series
      ? this.getSeriesTemplate(series)
      : String(this.seriesForm.get('template')?.value || '');

    const projectId = Number(series?.projectId || this.seriesForm.get('projectId')?.value);
    const project = this.projects.find(p => p.id === projectId);
    const projectCode = (project?.code || project?.name || 'PROJECT').toUpperCase();

    const padding = Number(series?.sequencePadding || this.seriesForm.get('sequencePadding')?.value || 3);
    const seq = Number(series?.nextNumber || this.seriesForm.get('nextNumber')?.value || 1);
    const sequenceValue = `${seq}`.padStart(Math.max(1, padding), '0');

    return targetTemplate
      .split('{PROJECT}').join(projectCode)
      .split('{YYYY}').join(year)
      .split('{MM}').join(month)
      .split('{DD}').join(day)
      .split('{SEQ}').join(sequenceValue);
  }

  getSeriesCurrentSequence(series: DocumentSeries): number {
    return series.nextNumber || series.sequenceStart || 1;
  }

  private getUnsupportedTemplatePlaceholders(template: string): string[] {
    const matches = template.match(/\{[A-Z]+\}/g) || [];
    return [...new Set(matches)].filter(token => !this.supportedSeriesPlaceholders.includes(token));
  }

  private generateSeriesCodeForCompatibility(template: string, seriesName: string): string {
    const staticPart = template
      .replace(/\{[A-Z]+\}/g, '')
      .replace(/[^A-Za-z0-9\-_\/]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/_{2,}/g, '_')
      .replace(/\/{2,}/g, '/')
      .replace(/^[-_/]+|[-_/]+$/g, '');

    if (staticPart) {
      return staticPart.slice(0, 50);
    }

    return String(seriesName || 'SERIES')
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '')
      .slice(0, 50);
  }

  /**
   * Get project name safely from DocumentSeries (handles null projectName)
   * @param series DocumentSeries object
   * @returns Safe display name
   */
  getSeriesProjectName(series: DocumentSeries | null | undefined): string {
    if (!series) return 'N/A';
    // Backend may return null for projectName, so use helper method
    if (series.projectName) {
      return series.projectName;
    }
    // Fallback to project lookup
    return this.getProjectName(series.projectId);
  }

  /**
   * Get document type name safely from DocumentSeries (handles null documentTypeName)
   * @param series DocumentSeries object
   * @returns Safe display name
   */
  getSeriesDocumentTypeName(series: DocumentSeries | null | undefined): string {
    if (!series) return 'N/A';
    // Backend may return null for documentTypeName
    return series.documentTypeName ?? 'N/A';
  }

  closeSeriesModal(): void {
    this.showSeriesModal = false;
    this.showSeriesFormModal = false;
    this.editingSeries = null;
    this.currentDocumentTypeForSeries = null;
    this.seriesForm.reset();
    // Ensure projectId control is enabled when closing
    this.seriesForm.get('projectId')?.enable();
  }

  closeSeriesFormModal(): void {
    this.showSeriesFormModal = false;
    this.editingSeries = null;
    this.seriesForm.reset();
    // Ensure projectId control is enabled when closing
    this.seriesForm.get('projectId')?.enable();
  }

  // ==================== APPROVAL WORKFLOW MANAGEMENT ====================

  openManageApprovalWorkflowModal(documentType: DocumentType): void {
    if (!documentType || !documentType.id) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Warning', 
        detail: 'Please save the document type first before managing approval workflow' 
      });
      return;
    }
    
    console.log('[DocumentTypesList] Opening Approval Workflow Modal for:', documentType.name);
    this.currentDocumentTypeForWorkflow = documentType;
    this.selectedWorkflowId = documentType.approvalWorkflowId || null;
    this.loadApprovalWorkflows();
    this.showApprovalWorkflowModal = true;
    this.cdr.detectChanges();
    console.log('[DocumentTypesList] Modal should be visible:', this.showApprovalWorkflowModal);
  }

  loadApprovalWorkflows(): void {
    if (!this.currentDocumentTypeForWorkflow || !this.currentDocumentTypeForWorkflow.id) {
      return;
    }

    this.loading.workflows = true;
    const currentDocTypeId = this.currentDocumentTypeForWorkflow.id;
    
    // Load only workflows that are associated with this document type
    this.approvalWorkflowService.getActiveApprovalWorkflowsByDocumentTypeId(currentDocTypeId).subscribe({
      next: (workflows: ApprovalWorkflowDto[]) => {
        this.approvalWorkflows = workflows || [];
        this.loading.workflows = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading approval workflows:', error);
        // Fallback: load all active workflows and filter manually
        this.approvalWorkflowService.getActiveApprovalWorkflows().subscribe({
          next: (allWorkflows: ApprovalWorkflowDto[]) => {
            // Filter to show only workflows for this document type
            this.approvalWorkflows = (allWorkflows || []).filter(w => 
              w.documentTypeId === currentDocTypeId
            );
            this.loading.workflows = false;
            this.cdr.detectChanges();
          },
          error: (fallbackError) => {
            console.error('Error loading approval workflows (fallback):', fallbackError);
            this.approvalWorkflows = [];
            this.loading.workflows = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to load approval workflows'
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  assignWorkflowToDocumentType(): void {
    if (!this.currentDocumentTypeForWorkflow || !this.currentDocumentTypeForWorkflow.id) {
      return;
    }

    // Validate that if a workflow is selected, it exists and is associated with the correct document type
    if (this.selectedWorkflowId !== null && this.selectedWorkflowId !== undefined) {
      const selectedWorkflow = this.approvalWorkflows.find(w => w.id === this.selectedWorkflowId);
      if (!selectedWorkflow) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Selected approval workflow not found. Please refresh and try again.'
        });
        return;
      }

      // Check if the workflow is associated with a different document type
      if (selectedWorkflow.documentTypeId && selectedWorkflow.documentTypeId !== this.currentDocumentTypeForWorkflow.id) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `This approval workflow is already associated with another document type. Please select a different workflow or create a new one for this document type.`
        });
        return;
      }
    }

    // Prepare the update DTO
    // If selectedWorkflowId is null or undefined, explicitly set it to null to remove the workflow
    const updateDto: UpdateDocumentTypeDto = {
      approvalWorkflowId: this.selectedWorkflowId === null || this.selectedWorkflowId === undefined ? null : this.selectedWorkflowId
    };

    console.log('[DocumentTypesList] Assigning workflow to document type:', {
      documentTypeId: this.currentDocumentTypeForWorkflow.id,
      documentTypeName: this.currentDocumentTypeForWorkflow.name,
      selectedWorkflowId: this.selectedWorkflowId,
      updateDto: updateDto
    });

    this.loading.updateWorkflow = true;
    this.documentTypesService.updateDocumentType(this.currentDocumentTypeForWorkflow.id, updateDto).subscribe({
      next: () => {
        this.loading.updateWorkflow = false;
        const workflowName = this.selectedWorkflowId 
          ? this.approvalWorkflows.find(w => w.id === this.selectedWorkflowId)?.name || 'Unknown'
          : 'None (Auto-approve)';
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Approval workflow updated successfully: ${workflowName}`
        });
        
        // Refresh document types list
        this.loadDocumentTypes();
        this.closeApprovalWorkflowModal();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading.updateWorkflow = false;
        console.error('Error updating approval workflow:', error);
        console.error('Error details:', {
          status: error?.status,
          error: error?.error,
          message: error?.message
        });
        
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update approval workflow';
        
        // Check for specific error scenarios
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('foreign key') || errorText.includes('constraint') || errorText.includes('fk_approval_workflows')) {
          if (errorText.includes('documenttypeid') || errorText.includes('document_type')) {
            errorMessage = 'The selected approval workflow is not valid for this document type. Please ensure the workflow exists and is not associated with another document type.';
          } else {
            errorMessage = 'Cannot update approval workflow. The selected workflow may not exist or may be associated with another document type.';
          }
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 8000
        });
        this.cdr.detectChanges();
      }
    });
  }

  removeWorkflowFromDocumentType(): void {
    if (!this.currentDocumentTypeForWorkflow || !this.currentDocumentTypeForWorkflow.id) {
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to remove the approval workflow from "${this.currentDocumentTypeForWorkflow.name}"? Submissions will be auto-approved.`,
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.selectedWorkflowId = null;
        this.assignWorkflowToDocumentType();
      }
    });
  }

  closeApprovalWorkflowModal(): void {
    this.showApprovalWorkflowModal = false;
    this.currentDocumentTypeForWorkflow = null;
    this.selectedWorkflowId = null;
    this.approvalWorkflows = [];
  }
}


