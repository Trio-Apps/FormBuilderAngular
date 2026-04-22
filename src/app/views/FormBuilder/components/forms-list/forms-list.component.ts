import { DialogShellComponent } from '../../../../shared/dialog-shell/dialog-shell.component';
import { TableActionsComponent } from '../../../../shared/table-actions/table-actions.component';

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormsService } from '../../services/forms.service';
import { TabsService } from '../../services/tabs.service';
import { FieldsService } from '../../services/fields.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilderDto, UpdateFormBuilderDto, CreateFormBuilderDto } from '../../form-builder/models/form-builder-dto.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map, filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { MultiSelectModule } from 'primeng/multiselect';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';
import { DuplicateValidationHelper } from '../../../../core/utils/duplicate-validation.helper';
import { TableShellComponent } from '../../../../shared/table-shell/table-shell.component';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';
import { PermissionService } from '../../../../services/permission.service';
import { UsersService, UserDto } from '../../services/users.service';
import { StorageService } from '../../../../auth/storage.service';

@Component({
  selector: 'app-forms-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    PaginatorModule,
    MultiSelectModule,
    TranslatePipe,
    TableShellComponent,
    HasPermissionDirective
  ],
  templateUrl: './forms-list.component.html',
  styleUrls: ['./forms-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FormsListComponent implements OnInit, OnDestroy {
  forms: FormBuilderDto[] = [];
  filteredForms: FormBuilderDto[] = [];
  searchTerm = '';
  loading = false;
  private routerSubscription?: Subscription;
  private windowFocusHandler: () => void;
  private deletedFormIds: Set<number> = new Set(); // Track deleted form IDs to filter them out

  // Form Modal
  showFormModal = false;
  formName = '';
  foreignFormName = ''; // Arabic form name
  formCode = '';
  description = '';
  foreignDescription = ''; // Arabic description
  isPublished = false;
  isSapEnabled = false;
  sapExecutionMode: 'OnSubmit' | 'OnFinalApproval' | 'OnSpecificWorkflowStage' = 'OnSubmit';
  isActive = true;
  editingForm: FormBuilderDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields
  availableSubmissionViewerUsers: UserDto[] = [];
  selectedSubmissionViewerUserIds: number[] = [];
  selectedFormEditorUserIds: number[] = [];

  // Pagination
  paginatedForms: FormBuilderDto[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService,
    public permissionService: PermissionService,
    private usersService: UsersService,
    private storageService: StorageService
  ) {
    // Bind window focus handler to preserve reference for cleanup
    this.windowFocusHandler = this.onWindowFocus.bind(this);
  }

  ngOnInit(): void {
    // Always reload permissions from API to ensure fresh data (clears cache first)
    console.log('[FormsList] Refreshing permissions from API (clearing cache)...');
    this.permissionService.refreshPermissions().subscribe({
      next: (perms) => {
        console.log('[FormsList] 🔐 Permissions loaded from API:', perms);
        console.log('[FormsList] 🔐 Permissions count:', perms.length);
        console.log('[FormsList] 🔐 Has FormBuilder_Allow_Create:', this.permissionService.hasPermission('FormBuilder_Allow_Create'));
        console.log('[FormsList] 🔐 Has FormBuilder_Allow_Edit:', this.permissionService.hasPermission('FormBuilder_Allow_Edit'));
        console.log('[FormsList] 🔐 Has FormBuilder_Allow_Delete:', this.permissionService.hasPermission('FormBuilder_Allow_Delete'));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[FormsList] 🔐 Error loading permissions:', err);
      }
    });
    
    // Force English language for admin panel by default
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      // Use saved admin preference
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      // Default to English for admin panel
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }
    
    this.loadForms();
    
    // Listen to router navigation events to refresh data when returning to this page
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged((prev: NavigationEnd, curr: NavigationEnd) => {
          return prev.urlAfterRedirects === curr.urlAfterRedirects;
        })
      )
      .subscribe((event: NavigationEnd) => {
        // Check if we're navigating to the forms list page
        const url = event.urlAfterRedirects || event.url || '';
        const isFormsPage = url && (
          url.includes('/form-builder/forms') || 
          url === '/form-builder' || 
          url.endsWith('/form-builder') ||
          url === '/#/form-builder/forms' ||
          url === '/form-builder/'
        );
        
        if (isFormsPage) {
          // Force reload after navigation
          setTimeout(() => {
            this.loadForms();
          }, 500);
        }
      });
    
    // Also refresh when window gains focus (user returns to tab)
    window.addEventListener('focus', this.windowFocusHandler);
  }

  onWindowFocus(): void {
    // Refresh data when window gains focus (user returns to browser tab)
    if (this.router.url && this.router.url.includes('/form-builder/forms')) {
      this.loadForms();
    }
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    // Remove window focus event listener using saved reference
    window.removeEventListener('focus', this.windowFocusHandler);
  }

  /**
   * Load deleted form IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedFormIds(): void {
    if (!this.permissionService.isAdmin()) {
      this.deletedFormIds = new Set();
      return;
    }

    try {
      const savedIds = localStorage.getItem(this.getDeletedFormIdsStorageKey());
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedFormIds = new Set(idsArray);
        console.log('[FormsList] Loaded deleted form IDs from localStorage:', Array.from(this.deletedFormIds));
      }
    } catch (error) {
      console.error('[FormsList] Error loading deleted form IDs from localStorage:', error);
      this.deletedFormIds = new Set();
    }
  }

  /**
   * Save deleted form IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedFormIds(): void {
    if (!this.permissionService.isAdmin()) {
      return;
    }

    try {
      const idsArray = Array.from(this.deletedFormIds);
      localStorage.setItem(this.getDeletedFormIdsStorageKey(), JSON.stringify(idsArray));
      console.log('[FormsList] Saved deleted form IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[FormsList] Error saving deleted form IDs to localStorage:', error);
    }
  }

  private getDeletedFormIdsStorageKey(): string {
    const userId = this.storageService.getUserId();
    const username = this.storageService.getUsername();
    return `deletedFormIds:${userId ?? username ?? 'anonymous'}`;
  }

  loadForms(page: number = this.currentPage): void {
    this.loading = true;
    this.forms = [];
    this.filteredForms = [];
    
    // Removed console.log to reduce console noise in production
    // console.log('[FormsList] Loading forms, page:', page);
    
    this.formsService.getForms(page, this.itemsPerPage).subscribe({
      next: (paged) => {
        const forms = paged.items || [];
        // Removed console.log to reduce console noise in production
        // console.log('[FormsList] Forms loaded from API:', forms.map(f => ({ id: f.id, formName: f.formName, formCode: f.formCode })));
        
        const processedForms = forms;
        
        console.log('[FormsList] After filtering - Total forms:', processedForms.length, 
          'Deleted forms hidden:', forms.length - processedForms.length);

        // Clean up deletedFormIds - remove IDs that are no longer in the API response (hard deleted)
        const apiFormIds = new Set(forms.map(f => f.id));
        const idsToRemove: number[] = [];
        this.deletedFormIds.forEach(deletedId => {
          const formInApi = forms.find(f => f.id === deletedId);
          if (!formInApi) {
            // Form not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          }
          // Keep form in deletedFormIds if it exists in API, so it shows as inactive
          // User can edit it to reactivate it, which will remove it from deletedFormIds
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedFormIds.delete(id));
          this.saveDeletedFormIds(); // Update localStorage
          console.log('[FormsList] Cleaned up hard-deleted form IDs:', idsToRemove);
        }
        
        // Show only non-deleted forms (deleted forms are filtered out)
        const visibleForms = processedForms;
        console.log('[FormsList] Visible forms count:', visibleForms.length, 'Deleted forms hidden:', forms.length - visibleForms.length);

        // Count only visible (non-deleted) forms
        this.totalItems = visibleForms.length;
        this.totalPages = paged.totalPages || Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
        this.itemsPerPage = paged.pageSize || this.itemsPerPage;
        this.currentPage = paged.page || page;

        // Load tabs and fields count for each form (all forms including inactive ones)
        this.loadFormsWithCounts(visibleForms);
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load forms'
        });
      }
    });
  }

  loadFormsWithCounts(forms: FormBuilderDto[]): void {
    // Note: forms parameter is already filtered to exclude deleted forms (activeForms)
    // No need to filter again here
    
    if (forms.length === 0) {
      this.filteredForms = [];
      // totalItems already set from API response if available
      if (this.totalItems === 0) {
        this.totalItems = 0;
      }
      this.updatePagination();
      this.loading = false;
      return;
    }

    // Create observables to load tabs for each form (only for active forms, not deleted ones)
    const tabsObservables = forms.map(form => {
      // تحقق من أن form.id موجود وصحيح
      if (!form.id || isNaN(form.id)) {
        return of({ formId: form.id || 0, tabs: [] });
      }
      
      return this.tabsService.getTabs(form.id).pipe(
        catchError(() => of([])),
        map(tabs => ({ formId: form.id, tabs: Array.isArray(tabs) ? tabs : [] }))
      );
    });

    // Load all tabs in parallel
    forkJoin(tabsObservables).subscribe({
      next: (tabsResults) => {
        // Create a map of formId -> tabs (filter to ensure tabs belong to correct form)
        const tabsMap = new Map<number, any[]>();
        tabsResults.forEach(result => {
          // Filter tabs to ensure they belong to this form
          const filteredTabs = Array.isArray(result.tabs) 
            ? result.tabs.filter((tab: any) => 
                tab && (tab.formBuilderId === result.formId || tab.formId === result.formId)
              )
            : [];
          tabsMap.set(result.formId, filteredTabs);
        });

        // Load fields for all tabs - use filtered tabs from tabsMap
        const allTabs: Array<{formId: number, tabId: number}> = [];
        tabsMap.forEach((tabs, formId) => {
          tabs.forEach((tab: any) => {
            if (tab && tab.id) {
              allTabs.push({ formId: formId, tabId: tab.id });
            }
          });
        });

        // No need to load fields, just update forms with tabs count
        // Note: forms parameter is already filtered to exclude deleted forms
        this.updateFormsWithCounts(forms, tabsMap);
      },
      error: () => {
        // Continue with forms even if tabs loading fails - set counts to 0
        // Note: forms parameter is already filtered to exclude deleted forms
        const formsWithZeroCounts = forms.map(form => ({
          ...form,
          tabs: [],
          tabsCount: 0
        }));
        this.forms = formsWithZeroCounts;
        this.filteredForms = [...formsWithZeroCounts];
        this.totalItems = formsWithZeroCounts.length;
        this.updatePagination();
        this.loading = false;
      }
    });
  }

  updateFormsWithCounts(
    forms: FormBuilderDto[], 
    tabsMap: Map<number, any[]>
  ): void {
    const updatedForms = forms
      .filter(form => !this.deletedFormIds.has(form.id!)) // Filter out deleted forms first
      .map(form => {
        const tabs = tabsMap.get(form.id) || [];
        
        // Calculate tabs count
        const tabsCount = form.tabsCount !== undefined && form.tabsCount !== null 
          ? form.tabsCount 
          : tabs.length;

        return {
          ...form,
          tabs,
          tabsCount
        };
      });

    // Removed console.log to reduce console noise in production
    // console.log('[FormsList] Updated forms with counts:', updatedForms.map(f => ({ id: f.id, formName: f.formName, formCode: f.formCode })));

    this.forms = updatedForms;
    this.filteredForms = [...updatedForms];
    
    // Update pagination which also updates paginatedForms
    this.updatePagination();
    
    // Log to verify deleted forms are filtered out
    console.log('[FormsList] After updateFormsWithCounts - visible forms:', updatedForms.length);
    
    // totalItems already set from API response
    if (!this.totalItems) {
      this.totalItems = updatedForms.length;
    }
    
    this.loading = false;
  }

  filterForms(): void {
    if (!this.searchTerm.trim()) {
      this.filteredForms = [...this.forms];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredForms = this.forms.filter(form =>
        form.formName.toLowerCase().includes(term) ||
        form.formCode.toLowerCase().includes(term) ||
        (form.description && form.description.toLowerCase().includes(term))
      );
    }

    // عند البحث، نعرض النتائج الحالية فقط دون استدعاء API جديد
    this.totalItems = this.filteredForms.length;
    this.currentPage = 1;
    this.updatePagination();
  }

  getTotalFormsCount(): number {
    return this.totalItems || this.forms.length;
  }

  getPublishedFormsCount(): number {
    return this.forms.filter(f => f.isPublished).length;
  }

  getActiveFormsCount(): number {
    return this.forms.filter(f => f.isActive !== false).length;
  }
  get currentItemEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }
  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
    // عند استخدام paging من السيرفر، لا نقوم بالتقطيع محلياً
    this.paginatedForms = [...this.filteredForms];
  }

  onPageChange(event: any): void {
    // PrimeNG paginator (0-based) or numeric input (1-based)
    if (event && typeof event.page === 'number') {
      this.currentPage = event.page + 1;
    } else if (typeof event === 'number') {
      this.currentPage = event;
    }
    // استدعاء البيانات من الـ API للصفحة المطلوبة
    this.loadForms(this.currentPage);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadForms(this.currentPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadForms(this.currentPage);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadForms(this.currentPage);
    }
  }

  openFormModal(form?: FormBuilderDto): void {
    this.ensureViewerUsersLoaded();

    // Permission check: Create for new, Edit for existing
    if (form) {
      if (!this.canEditForm(form)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Permission Denied',
          detail: 'You do not have permission to edit forms.'
        });
        return;
      }
      this.loading = true;
      this.formsService.getFormById(form.id).subscribe({
        next: (fullForm) => {
          this.populateFormModal(fullForm);
          this.currentInputLanguage = 'en';
          this.showFormModal = true;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load form details.'
          });
        }
      });
      return;
    } else {
      if (!this.permissionService.hasPermission('FormBuilder_Allow_Create')) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Permission Denied',
          detail: 'You do not have permission to create forms.'
        });
        return;
      }
      this.editingForm = null;
      this.formName = '';
      this.foreignFormName = '';
      this.formCode = '';
      this.description = '';
      this.foreignDescription = '';
      this.isPublished = true; // Default to true for new forms
      this.isSapEnabled = false;
      this.sapExecutionMode = 'OnSubmit';
      this.isActive = true;
      this.selectedSubmissionViewerUserIds = [];
      this.selectedFormEditorUserIds = [];
    }
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    this.showFormModal = true;
  }

  private populateFormModal(form: FormBuilderDto): void {
    this.editingForm = form;
    this.formName = form.formName;
    this.foreignFormName = form.foreignFormName || '';
    this.formCode = form.formCode;
    this.description = form.description || '';
    this.foreignDescription = form.foreignDescription || '';
    this.isPublished = form.isPublished ?? false;
    this.isSapEnabled = form.isSapEnabled ?? false;
    if (form.sapExecutionMode === 'OnFinalApproval' || form.sapExecutionMode === 'OnSpecificWorkflowStage') {
      this.sapExecutionMode = form.sapExecutionMode;
    } else {
      this.sapExecutionMode = 'OnSubmit';
    }
    this.isActive = form.isActive !== false;
    this.selectedSubmissionViewerUserIds = [...(form.submissionViewerUserIds || [])];
    this.selectedFormEditorUserIds = [...(form.formEditorUserIds || [])];
  }

  private loadSubmissionViewerUsers(): void {
    this.usersService.getActiveUsers().subscribe({
      next: (users) => {
        this.availableSubmissionViewerUsers = users || [];
      },
      error: () => {
        this.availableSubmissionViewerUsers = [];
      }
    });
  }

  get submissionViewerOptions(): Array<{ label: string; value: number }> {
    return this.availableSubmissionViewerUsers.map((user) => ({
      value: user.id,
      label: user.email ? `${user.name} (${user.email})` : user.name
    }));
  }

  getSubmissionViewersSummary(): string {
    if (!this.selectedSubmissionViewerUserIds.length) {
      return 'Select users who can see this form\'s submissions';
    }

    if (this.selectedSubmissionViewerUserIds.length === 1) {
      const selectedUser = this.submissionViewerOptions.find(
        (option) => option.value === this.selectedSubmissionViewerUserIds[0]
      );
      return selectedUser?.label ?? '1 user selected';
    }

    return `${this.selectedSubmissionViewerUserIds.length} users selected`;
  }

  get formEditorOptions(): Array<{ label: string; value: number }> {
    return this.availableSubmissionViewerUsers.map((user) => ({
      value: user.id,
      label: user.email ? `${user.name} (${user.email})` : user.name
    }));
  }

  getFormEditorsSummary(): string {
    if (!this.selectedFormEditorUserIds.length) {
      return 'Select users who can edit this form';
    }

    if (this.selectedFormEditorUserIds.length === 1) {
      const selectedUser = this.formEditorOptions.find(
        (option) => option.value === this.selectedFormEditorUserIds[0]
      );
      return selectedUser?.label ?? '1 user selected';
    }

    return `${this.selectedFormEditorUserIds.length} users selected`;
  }

  canEditForm(form: FormBuilderDto): boolean {
    if (this.permissionService.hasPermission('FormBuilder_Allow_Edit') || this.permissionService.isAdmin()) {
      return true;
    }

    const currentUserId = this.storageService.getUserId();
    return currentUserId != null && (form.formEditorUserIds || []).includes(currentUserId);
  }

  canManageTabs(form: FormBuilderDto): boolean {
    return this.canEditForm(form);
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingForm = null;
    this.formName = '';
    this.foreignFormName = '';
    this.formCode = '';
    this.description = '';
    this.foreignDescription = '';
    this.isPublished = false;
    this.isSapEnabled = false;
    this.sapExecutionMode = 'OnSubmit';
    this.isActive = true;
    this.selectedSubmissionViewerUserIds = [];
    this.selectedFormEditorUserIds = [];
    this.currentInputLanguage = 'en'; // Reset to English when closing modal
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  /**
   * Translate a key based on currentInputLanguage
   */
  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  /**
   * Switch language for the admin panel
   */
  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
    // Save admin language preference separately
    localStorage.setItem('adminLanguagePreference', lang);
  }

  saveForm(): void {
    // Trim values before validation
    const trimmedFormName = this.formName?.trim() || '';
    const trimmedFormCode = this.formCode?.trim() || '';
    const trimmedDescription = this.description?.trim() || '';

    // In edit mode, description is not required
    if (this.editingForm) {
      if (!trimmedFormName || !trimmedFormCode) {
        this.messageService.add({
          severity: 'warn',
          summary: this.translationService.translate('common.validation'),
          detail: this.translationService.translate('messages.validationFailed')
        });
        return;
      }
    } else {
      // In create mode, formName and formCode are required
      if (!trimmedFormName || !trimmedFormCode) {
        this.messageService.add({
          severity: 'warn',
          summary: this.translationService.translate('common.validation'),
          detail: this.translationService.translate('messages.validationFailed')
        });
        return;
      }
    }

    this.ensureViewerUsersLoaded();

    this.loading = true;

    if (this.editingForm) {
      // Ensure formCode is always included, even if empty
      const trimmedForeignFormName = this.foreignFormName?.trim() || '';
      const trimmedForeignDescription = this.foreignDescription?.trim() || '';
      
      const updateDto: UpdateFormBuilderDto = {
        formName: trimmedFormName,
        foreignFormName: trimmedForeignFormName || undefined,
        formCode: trimmedFormCode, // Explicitly include formCode
        description: trimmedDescription || undefined,
        foreignDescription: trimmedForeignDescription || undefined,
        isPublished: this.isPublished,
        isSapEnabled: this.isSapEnabled,
        sapExecutionMode: this.isSapEnabled ? this.sapExecutionMode : undefined,
        isActive: this.isActive,
        submissionViewerUserIds: [...this.selectedSubmissionViewerUserIds],
        formEditorUserIds: [...this.selectedFormEditorUserIds]
      };

      // Log the exact structure being sent
      console.log('[FormsList] Updating form - Full Details:', {
        id: this.editingForm.id,
        updateDto: updateDto,
        updateDtoStringified: JSON.stringify(updateDto),
        oldFormCode: this.editingForm.formCode,
        newFormCode: trimmedFormCode,
        formCodeInDto: updateDto.formCode,
        hasFormCode: 'formCode' in updateDto,
        formCodeValue: updateDto.formCode
      });

      this.formsService.updateForm(this.editingForm.id, updateDto).subscribe({
        next: () => {
          console.log('[FormsList] Form update successful, reloading forms...');
          
          // If form was reactivated (isActive changed to true), remove from deletedFormIds
          if (updateDto.isActive === true && this.deletedFormIds.has(this.editingForm!.id)) {
            this.deletedFormIds.delete(this.editingForm!.id);
            this.saveDeletedFormIds();
            console.log('[FormsList] Removed form from deletedFormIds after reactivation:', this.editingForm!.id);
          }
          
          // Update local data immediately (optimistic update)
          const formId = this.editingForm!.id;
          const formIndex = this.forms.findIndex(f => f.id === formId);
          
          if (formIndex !== -1) {
            const oldForm = { ...this.forms[formIndex] };
            // Create new object to ensure change detection
            this.forms[formIndex] = {
              ...this.forms[formIndex],
              formName: trimmedFormName,
              foreignFormName: trimmedForeignFormName || undefined,
              formCode: trimmedFormCode,
              description: trimmedDescription || undefined,
              foreignDescription: trimmedForeignDescription || undefined,
              isPublished: this.isPublished,
              isSapEnabled: this.isSapEnabled,
              sapExecutionMode: this.isSapEnabled ? this.sapExecutionMode : undefined,
              isActive: this.isActive
            };
            console.log('[FormsList] Local form updated:', {
              id: this.forms[formIndex].id,
              oldFormCode: oldForm.formCode,
              newFormCode: this.forms[formIndex].formCode
            });
            
            // Update filtered forms as well
            const filteredIndex = this.filteredForms.findIndex(f => f.id === formId);
            if (filteredIndex !== -1) {
              this.filteredForms[filteredIndex] = {
                ...this.filteredForms[filteredIndex],
                formName: trimmedFormName,
                foreignFormName: trimmedForeignFormName || undefined,
                formCode: trimmedFormCode,
                description: trimmedDescription || undefined,
                foreignDescription: trimmedForeignDescription || undefined,
                isPublished: this.isPublished,
                isSapEnabled: this.isSapEnabled,
                sapExecutionMode: this.isSapEnabled ? this.sapExecutionMode : undefined,
                isActive: this.isActive
              };
              console.log('[FormsList] Filtered form updated:', {
                id: this.filteredForms[filteredIndex].id,
                newFormCode: this.filteredForms[filteredIndex].formCode
              });
            }
            
            // Update paginatedForms directly
            const paginatedIndex = this.paginatedForms.findIndex(f => f.id === formId);
            if (paginatedIndex !== -1) {
              this.paginatedForms[paginatedIndex] = {
                ...this.paginatedForms[paginatedIndex],
                formName: trimmedFormName,
                foreignFormName: trimmedForeignFormName || undefined,
                formCode: trimmedFormCode,
                description: trimmedDescription || undefined,
                foreignDescription: trimmedForeignDescription || undefined,
                isPublished: this.isPublished,
                isSapEnabled: this.isSapEnabled,
                sapExecutionMode: this.isSapEnabled ? this.sapExecutionMode : undefined,
                isActive: this.isActive
              };
              console.log('[FormsList] Paginated form updated:', {
                id: this.paginatedForms[paginatedIndex].id,
                newFormCode: this.paginatedForms[paginatedIndex].formCode
              });
            }
            
            // Re-apply search filter if active
            if (this.searchTerm.trim()) {
              this.filterForms();
            } else {
              this.updatePagination();
            }
            
            // Force change detection immediately
            this.cdr.detectChanges();
            
            console.log('[FormsList] After optimistic update, paginatedForms:', 
              this.paginatedForms.map(f => ({ id: f.id, formCode: f.formCode })));
          }
          
          this.loading = false;
          this.closeFormModal();
          
          // Reload from API after a short delay to ensure consistency
          // This allows the UI to update immediately with optimistic update
          setTimeout(() => {
            console.log('[FormsList] Reloading forms from API after optimistic update...');
            this.loadForms(this.currentPage);
          }, 300);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form updated successfully'
          });
        },
        error: (error) => {
          console.error('[FormsList] Form update error:', error);
          this.loading = false;
          
          // Extract error information
          let errorMessage = '';
          let errorDetails: string[] = [];
          
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            }
            
            // Extract validation errors if available (ASP.NET Core ProblemDetails format)
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                const errors: { [key: string]: string[] } = error.error.errors;
                for (const [field, messages] of Object.entries(errors)) {
                  if (Array.isArray(messages)) {
                    messages.forEach(msg => errorDetails.push(msg));
                  } else {
                    errorDetails.push(String(messages));
                  }
                }
              } else if (Array.isArray(error.error.errors)) {
                errorDetails = error.error.errors;
              }
            }
          }
          
          const currentLang = this.translationService.getCurrentLanguage();
          
          // For 400 Bad Request, treat as validation error
          if (error.status === 400) {
            // Check if it's a duplicate error
            const errorLower = (errorMessage + ' ' + errorDetails.join(' ')).toLowerCase();
            const isDuplicate = errorLower.includes('duplicate') ||
                               errorLower.includes('already exists') ||
                               errorLower.includes('already in use') ||
                               errorLower.includes('formcode') ||
                               errorLower.includes('form code') ||
                               errorLower.includes('مكرر') ||
                               errorLower.includes('موجود') ||
                               errorLower.includes('unique') ||
                               errorLower.includes('constraint');
            
            if (isDuplicate) {
              // Show duplicate error message
              const duplicateValue = this.formCode || 'N/A';
              const message = currentLang === 'ar' 
                ? `كود النموذج "${duplicateValue}" متكرر. يرجى استخدام كود آخر.`
                : `Form Code "${duplicateValue}" already exists. Please use a different code.`;
              
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: message,
                life: 10000
              });
            } else if (errorDetails.length > 0) {
              // Show validation errors from backend
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: errorDetails[0] + (errorDetails.length > 1 ? ` (+${errorDetails.length - 1} ${currentLang === 'ar' ? 'أكثر' : 'more'})` : ''),
                life: 10000
              });
            } else if (errorMessage) {
              // Show error message from backend
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: errorMessage,
                life: 10000
              });
            } else {
              // Show generic validation error message
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: currentLang === 'ar' ? 'حدث خطأ في التحقق من البيانات. يرجى التحقق من القيم المدخلة.' : 'Validation error occurred. Please check the entered values.',
                life: 7000
              });
            }
          } else {
            // For other errors, show generic error message
            const message = errorMessage || (currentLang === 'ar' ? 'حدث خطأ أثناء تحديث النموذج' : 'An error occurred while updating the form');
            this.messageService.add({
              severity: 'error',
              summary: currentLang === 'ar' ? 'خطأ' : 'Error',
              detail: message,
              life: 7000
            });
          }
        }
      });
    } else {
      const trimmedForeignFormName = this.foreignFormName?.trim() || '';
      const trimmedForeignDescription = this.foreignDescription?.trim() || '';
      
      const createDto: CreateFormBuilderDto = {
        formName: trimmedFormName,
        foreignFormName: trimmedForeignFormName || undefined,
        formCode: trimmedFormCode,
        description: trimmedDescription || undefined,
        foreignDescription: trimmedForeignDescription || undefined,
        isPublished: this.isPublished,
        isSapEnabled: this.isSapEnabled,
        sapExecutionMode: this.isSapEnabled ? this.sapExecutionMode : undefined,
        isActive: this.isActive,
        submissionViewerUserIds: [...this.selectedSubmissionViewerUserIds],
        formEditorUserIds: [...this.selectedFormEditorUserIds]
      };

      this.formsService.createForm(createDto).subscribe({
        next: () => {
          this.loadForms();
          this.closeFormModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form created successfully'
          });
        },
        error: (error) => {
          console.error('[FormsList] Form creation error:', error);
          this.loading = false;
          
          // Extract error information
          let errorMessage = '';
          let errorDetails: string[] = [];
          
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            }
            
            // Extract validation errors if available (ASP.NET Core ProblemDetails format)
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                const errors: { [key: string]: string[] } = error.error.errors;
                for (const [field, messages] of Object.entries(errors)) {
                  if (Array.isArray(messages)) {
                    messages.forEach(msg => errorDetails.push(msg));
                  } else {
                    errorDetails.push(String(messages));
                  }
                }
              } else if (Array.isArray(error.error.errors)) {
                errorDetails = error.error.errors;
              }
            }
          }
          
          const currentLang = this.translationService.getCurrentLanguage();
          
          // For 400 Bad Request, treat as validation error
          if (error.status === 400) {
            // Check if it's a duplicate error
            const errorLower = (errorMessage + ' ' + errorDetails.join(' ')).toLowerCase();
            const isDuplicate = errorLower.includes('duplicate') ||
                               errorLower.includes('already exists') ||
                               errorLower.includes('already in use') ||
                               errorLower.includes('formcode') ||
                               errorLower.includes('form code') ||
                               errorLower.includes('مكرر') ||
                               errorLower.includes('موجود') ||
                               errorLower.includes('unique') ||
                               errorLower.includes('constraint');
            
            if (isDuplicate) {
              // Show duplicate error message
              const duplicateValue = this.formCode || 'N/A';
              const message = currentLang === 'ar' 
                ? `كود النموذج "${duplicateValue}" متكرر. يرجى استخدام كود آخر.`
                : `Form Code "${duplicateValue}" already exists. Please use a different code.`;
              
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: message,
                life: 10000
              });
            } else if (errorDetails.length > 0) {
              // Show validation errors from backend
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: errorDetails[0] + (errorDetails.length > 1 ? ` (+${errorDetails.length - 1} ${currentLang === 'ar' ? 'أكثر' : 'more'})` : ''),
                life: 10000
              });
            } else if (errorMessage) {
              // Show error message from backend
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: errorMessage,
                life: 10000
              });
            } else {
              // Show generic validation error message
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
                detail: currentLang === 'ar' ? 'حدث خطأ في التحقق من البيانات. يرجى التحقق من القيم المدخلة.' : 'Validation error occurred. Please check the entered values.',
                life: 7000
              });
            }
          } else {
            // For other errors, show generic error message
            const message = errorMessage || (currentLang === 'ar' ? 'حدث خطأ أثناء إنشاء النموذج' : 'An error occurred while creating the form');
            this.messageService.add({
              severity: 'error',
              summary: currentLang === 'ar' ? 'خطأ' : 'Error',
              detail: message,
              life: 7000
            });
          }
        }
      });
    }
  }

  deleteForm(id: number): void {
    // Permission check
    if (!this.permissionService.hasPermission('FormBuilder_Allow_Delete')) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'You do not have permission to delete forms.'
      });
      return;
    }
    
    console.log('[FormsList] deleteForm called for id:', id);
    const formToDelete = this.forms.find(f => f.id === id);
    if (!formToDelete) {
      console.warn('[FormsList] Form not found for deletion:', id);
      return;
    }

    console.log('[FormsList] Form to delete:', formToDelete);

    // Determine warning message based on form status
    const isInactive = formToDelete.isActive === false;
    const warningMessage = isInactive
      ? 'This form is inactive. It will be permanently deleted.'
      : 'This form may have submissions. If it has submissions, it will be deactivated instead of deleted.';

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${formToDelete.formName}"? ${warningMessage}`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        console.log('[FormsList] User confirmed deletion for form:', id);
        this.loading = true;
        this.formsService.deleteForm(id).subscribe({
          next: () => {
            console.log('[FormsList] Delete API response received (204 No Content)');
            
            // Add to deleted forms set to hide it completely
            this.deletedFormIds.add(id);
            console.log('[FormsList] Added form to deletedFormIds:', id);
            
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedFormIds();
            console.log('[FormsList] Saved deletedFormIds to localStorage');

            // Remove form from local arrays immediately (hide it completely)
            const formIndex = this.forms.findIndex(f => f.id === id);
            if (formIndex !== -1) {
              console.log('[FormsList] Removing form from forms array at index:', formIndex);
              this.forms.splice(formIndex, 1);
            } else {
              console.warn('[FormsList] Form not found in forms array:', id);
            }
            
            const filteredIndex = this.filteredForms.findIndex(f => f.id === id);
            if (filteredIndex !== -1) {
              console.log('[FormsList] Removing form from filteredForms array at index:', filteredIndex);
              this.filteredForms.splice(filteredIndex, 1);
            } else {
              console.warn('[FormsList] Form not found in filteredForms array:', id);
            }
            
            // Also remove from paginatedForms if it exists
            const paginatedIndex = this.paginatedForms.findIndex(f => f.id === id);
            if (paginatedIndex !== -1) {
              console.log('[FormsList] Removing form from paginatedForms array at index:', paginatedIndex);
              this.paginatedForms.splice(paginatedIndex, 1);
            }
            
            // Update total count
            this.totalItems = Math.max(0, this.totalItems - 1);

            // DeleteForm uses soft delete (204 No Content response)
            const successMessage = 'Form deleted successfully';
            
            // Log for debugging
            console.log('[FormsList] Delete response (soft delete):', {
              successMessage
            });
            
            // Update pagination to reflect changes in paginatedForms
            this.updatePagination();
            
            // Force change detection to update UI immediately
            this.cdr.detectChanges();
            
            this.loading = false;
            
            console.log('[FormsList] After deletion - remaining forms:', this.forms.length);
            console.log('[FormsList] After deletion - paginatedForms count:', this.paginatedForms.length);
            
            // Show success message
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: successMessage,
              life: 5000
            });
            
            // Note: We track deleted form IDs in deletedFormIds set (stored in localStorage)
            // - For soft delete: Form is deactivated (isActive = false) but still in DB
            //   We track it so it won't appear in the list even if API returns it
            // - For hard delete: Form is permanently deleted from DB
            //   We track it until API confirms it's gone, then we clean it up
            // The deletedFormIds persists across page refreshes, logout/login, and browser sessions
          },
          error: (error: any) => {
            console.error('[FormsList] Error deleting form:', error);
            console.error('[FormsList] Error details:', {
              status: error?.status,
              statusText: error?.statusText,
              error: error?.error,
              errorString: JSON.stringify(error?.error, null, 2),
              message: error?.message,
              url: error?.url
            });
            
            // Log the actual error response body if available
            if (error?.error) {
              console.error('[FormsList] Error response body:', error.error);
              if (typeof error.error === 'object') {
                console.error('[FormsList] Error response keys:', Object.keys(error.error));
                console.error('[FormsList] Full error object:', JSON.stringify(error.error, null, 2));
              }
            }
            
            let errorMessage = 'Failed to delete form';
            
            // Extract error message from various response formats
            if (error?.error) {
              if (typeof error.error === 'string') {
                errorMessage = error.error;
              } else if (error.error.message) {
                errorMessage = error.error.message;
              } else if (error.error.errorMessage) {
                errorMessage = error.error.errorMessage;
              } else if (error.error.title) {
                errorMessage = error.error.title;
              } else if (error.error.errors && Array.isArray(error.error.errors)) {
                errorMessage = error.error.errors.join(', ');
              }
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            // Check for specific error codes from API
            if (error?.error?.error === 'FormBuilder_CannotDeleteHasSubmissions') {
              errorMessage = 'Cannot delete this form because it has form submissions. Please delete all submissions first, then try again.';
            } else if (error?.error?.error && typeof error.error.error === 'string') {
              // Handle other specific error codes
              const errorCode = error.error.error;
              if (errorCode.includes('CannotDelete') || errorCode.includes('HasSubmissions')) {
                errorMessage = 'Cannot delete this form because it has associated data (submissions, tabs, fields, grids, etc.). Please delete the associated data first.';
              } else {
                errorMessage = errorCode;
              }
            }
            
            // Check for specific error types in message
            const errorText = errorMessage.toLowerCase();
            if (errorText.includes('foreign key') || errorText.includes('constraint') || errorText.includes('reference')) {
              errorMessage = 'Cannot delete this form because it has associated data (submissions, tabs, fields, grids, etc.). Please delete the associated data first.';
            } else if (error?.status === 400) {
              if (errorMessage === 'Failed to delete form') {
                errorMessage = 'Bad request (400). The form may have associated data that prevents deletion. Please check the console for more details.';
              }
            } else if (error?.status === 404) {
              errorMessage = 'Form not found (404). The form may have already been deleted.';
            } else if (error?.status === 403) {
              errorMessage = 'Permission denied (403). You do not have permission to delete this form.';
            } else if (error?.status === 500) {
              errorMessage = 'Server error (500). Please try again later or contact support.';
            } else if (error?.status === 0 || error?.statusText === 'Unknown Error') {
              errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
            }
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage,
              life: 10000 // Show for 10 seconds
            });
          }
        });
      }
    });
  }

  /**
   * Reactivate soft-deleted form
   * @param id Form ID
   */
  reactivateForm(id: number): void {
    const formToReactivate = this.forms.find(f => f.id === id);
    if (!formToReactivate) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to reactivate "${formToReactivate.formName}"?`,
      header: 'Confirm Reactivate',
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.loading = true;
        this.formsService.reactivateForm(id).subscribe({
          next: (response) => {
            // Remove form from deletedFormIds if it was tracked as deleted
            // This allows it to appear in the list again after reactivation
            if (this.deletedFormIds.has(id)) {
              this.deletedFormIds.delete(id);
              this.saveDeletedFormIds(); // Update localStorage
              console.log('[FormsList] Removed reactivated form from deletedFormIds:', id);
            }
            
            this.loading = false;
            this.loadForms();
            
            const successMessage = response?.message || 'Form reactivated successfully';
            
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: successMessage,
              life: 5000
            });
          },
          error: (error: any) => {
            this.loading = false;
            console.error('[FormsList] Error reactivating form:', error);
            console.error('[FormsList] Error details:', {
              status: error?.status,
              statusText: error?.statusText,
              error: error?.error,
              errorString: JSON.stringify(error?.error, null, 2),
              message: error?.message,
              url: error?.url
            });
            
            let errorMessage = 'Failed to reactivate form';
            
            // Extract error message from various response formats
            if (error?.error) {
              const errorResponse = error.error;
              
              // Check for specific error codes
              if (typeof errorResponse === 'string') {
                errorMessage = errorResponse;
              } else if (errorResponse.error) {
                // Check for specific error codes like "FormBuilder_CannotReactivate"
                const errorCode = errorResponse.error;
                if (errorCode.includes('CannotReactivate') || errorCode.includes('CannotActivate')) {
                  errorMessage = 'Cannot reactivate this form. Please check the form status.';
                } else {
                  errorMessage = errorCode;
                }
              } else if (errorResponse.message) {
                errorMessage = errorResponse.message;
              } else if (errorResponse.errorMessage) {
                errorMessage = errorResponse.errorMessage;
              } else if (errorResponse.title) {
                errorMessage = errorResponse.title;
              }
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage,
              life: 5000
            });
          }
        });
      }
    });
  }

  getTabsCount(form: any): number {
    // Priority: tabsCount from API > calculated from tabs array > 0
    if (form.tabsCount !== undefined && form.tabsCount !== null) {
      return form.tabsCount;
    }
    if (form.TabsCount !== undefined && form.TabsCount !== null) {
      return form.TabsCount; // Handle PascalCase
    }
    if (form.tabs && Array.isArray(form.tabs)) {
      return form.tabs.length;
    }
    return 0;
  }

  getPublishedClass(isPublished: boolean | undefined): string {
    return isPublished ? 'status-published' : 'status-draft';
  }

  getActiveClass(isActive: boolean | undefined): string {
    return isActive !== false ? 'status-active' : 'status-inactive';
  }

  openPublicForm(form: FormBuilderDto): void {
    if (!form?.formCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Open form',
        detail: 'Form code is missing.'
      });
      return;
    }
    this.router.navigate(['/form-preview', form.formCode]);
  }

  private ensureViewerUsersLoaded(): void {
    if (this.availableSubmissionViewerUsers.length > 0) {
      return;
    }

    const canManageEditors =
      this.permissionService.isAdmin() ||
      this.permissionService.hasPermission('FormBuilder_Allow_Create') ||
      this.permissionService.hasPermission('FormBuilder_Allow_Edit') ||
      this.permissionService.hasPermission('FormBuilder_Allow_Manage');

    if (!canManageEditors) {
      this.availableSubmissionViewerUsers = [];
      return;
    }

    this.loadSubmissionViewerUsers();
  }

  duplicateForm(form: FormBuilderDto): void {
    // Permission check (duplicate requires create permission)
    if (!this.permissionService.hasPermission('FormBuilder_Allow_Create')) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'You do not have permission to duplicate forms.'
      });
      return;
    }
    
    if (!form?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'Form ID is missing.'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Duplicate "${form.formName}"? This will create a copy with all tabs and fields.`,
      header: 'Confirm Duplicate',
      icon: 'pi pi-copy',
      accept: () => {
        this.loading = true;
        console.log('[FormsList] Duplicating form:', {
          formId: form.id,
          formName: form.formName,
          formCode: form.formCode
        });
        
        this.formsService.duplicateForm(form.id).subscribe({
          next: (duplicatedForm) => {
            console.log('[FormsList] Form duplicated successfully:', {
              id: duplicatedForm.id,
              formName: duplicatedForm.formName,
              formCode: duplicatedForm.formCode,
              isPublished: duplicatedForm.isPublished,
              isActive: duplicatedForm.isActive
            });
            
            this.loading = false;
            this.loadForms(this.currentPage);
            
            // Check if duplicated form is published and active
            const isPublished = duplicatedForm.isPublished === true;
            const isActive = duplicatedForm.isActive === true;
            
            if (isPublished && isActive) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Form "${duplicatedForm.formName}" duplicated successfully. Form code: ${duplicatedForm.formCode}. You can now copy the public link.`
              });
            } else {
              // Show warning if form is not published or not active
              let warningMessage = `Form "${duplicatedForm.formName}" duplicated successfully, but `;
              if (!isPublished && !isActive) {
                warningMessage += 'it is not published and not active.';
              } else if (!isPublished) {
                warningMessage += 'it is not published.';
              } else if (!isActive) {
                warningMessage += 'it is not active.';
              }
              warningMessage += ` Please publish and activate the form in the admin panel to make it accessible via the public link. Form code: ${duplicatedForm.formCode}`;
              
              this.messageService.add({
                severity: 'warn',
                summary: 'Form Duplicated',
                detail: warningMessage,
                life: 10000
              });
            }
          },
          error: (error) => {
            this.loading = false;
            console.error('[FormsList] Error duplicating form:', {
              formId: form.id,
              error: error,
              status: error?.status,
              message: error?.message,
              errorBody: error?.error
            });
            
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to duplicate form';
            
            // Provide more specific error messages
            if (error?.status === 404) {
              errorMessage = 'Original form not found. Please refresh the page and try again.';
            } else if (error?.status === 500) {
              errorMessage = 'Server error occurred while duplicating the form. Please try again later.';
            } else if (error?.status === 400) {
              errorMessage = errorMessage || 'Invalid request. Please check the form data and try again.';
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
    });
  }
}




