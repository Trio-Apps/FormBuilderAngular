
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
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-forms-list',
  standalone: true,
  imports: [
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
    TranslatePipe
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

  // Form Modal
  showFormModal = false;
  formName = '';
  foreignFormName = ''; // Arabic form name
  formCode = '';
  description = '';
  foreignDescription = ''; // Arabic description
  isPublished = false;
  isActive = true;
  editingForm: FormBuilderDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

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
    public translationService: TranslationService
  ) {
    // Bind window focus handler to preserve reference for cleanup
    this.windowFocusHandler = this.onWindowFocus.bind(this);
  }

  ngOnInit(): void {
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
        this.totalItems = paged.totalCount || forms.length;
        this.totalPages = paged.totalPages || Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
        this.itemsPerPage = paged.pageSize || this.itemsPerPage;
        this.currentPage = paged.page || page;

        // Load tabs and fields count for each form
        this.loadFormsWithCounts(forms);
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

    // Create observables to load tabs for each form
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
        this.updateFormsWithCounts(forms, tabsMap);
      },
      error: () => {
        // Continue with forms even if tabs loading fails - set counts to 0
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
    const updatedForms = forms.map(form => {
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
    // totalItems already set from API response
    if (!this.totalItems) {
      this.totalItems = updatedForms.length;
    }
    this.updatePagination();
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
    if (form) {
      this.editingForm = form;
      this.formName = form.formName;
      this.foreignFormName = form.foreignFormName || '';
      this.formCode = form.formCode;
      this.description = form.description || '';
      this.foreignDescription = form.foreignDescription || '';
      this.isPublished = form.isPublished ?? false;
      this.isActive = form.isActive !== false;
    } else {
      this.editingForm = null;
      this.formName = '';
      this.foreignFormName = '';
      this.formCode = '';
      this.description = '';
      this.foreignDescription = '';
      this.isPublished = true; // Default to true for new forms
      this.isActive = true;
    }
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    this.showFormModal = true;
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
    this.isActive = true;
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
        isActive: this.isActive
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
          
          // Extract error message from backend response
          let errorMessage = '';
          let errorDetails: string[] = [];
          
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
            
            // Extract validation errors if available
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                errorDetails = Object.values(error.error.errors).flat() as string[];
              } else if (Array.isArray(error.error.errors)) {
                errorDetails = error.error.errors;
              }
            }
          }
          
          // If no message found, use default
          if (!errorMessage) {
            errorMessage = error?.message || 'Failed to update form';
          }
          
          // Check for duplicate code or required field errors
          const errorLower = errorMessage.toLowerCase();
          const isDuplicateError = errorLower.includes('duplicate') || 
                                   errorLower.includes('already exists') ||
                                   errorLower.includes('formcode') ||
                                   errorLower.includes('form code');
          
          // Check if description is required error (should not happen in edit mode)
          const isDescriptionRequired = errorLower.includes('description') && 
                                       (errorLower.includes('required') || errorLower.includes('mandatory'));
          
          // Check if error details contain duplicate info
          const duplicateInDetails = errorDetails.some(detail => 
            detail.toLowerCase().includes('duplicate') || 
            detail.toLowerCase().includes('already exists')
          );
          
          // If duplicate error, show clear message with form code
          if (isDuplicateError || duplicateInDetails) {
            let formCodeInError = this.formCode;
            
            // Try to find form code in error message
            const codeMatch = errorMessage.match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
            if (codeMatch && codeMatch[1]) {
              formCodeInError = codeMatch[1];
            }
            
            // Check error details for form code
            if (errorDetails.length > 0) {
              const codeInDetails = errorDetails[0].match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
              if (codeInDetails && codeInDetails[1]) {
                formCodeInError = codeInDetails[1];
              }
            }
            
            const duplicateMessage = `Form Code "${formCodeInError}" متكرر. يرجى استخدام كود آخر.`;
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ في التحقق',
              detail: duplicateMessage,
              life: 10000
            });
          } else if (isDescriptionRequired && this.editingForm) {
            // Description should not be required in edit mode - show friendly message
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ في التحقق',
              detail: 'Description غير مطلوب في وضع التعديل. يرجى المحاولة مرة أخرى.',
              life: 10000
            });
          } else if (errorDetails.length > 0) {
            // Show validation errors
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ في التحقق',
              detail: errorDetails[0] + (errorDetails.length > 1 ? ` (+${errorDetails.length - 1} أكثر)` : ''),
              life: 10000
            });
          } else {
            // Show generic error
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: errorMessage,
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
        isActive: this.isActive
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
          this.loading = false;
          
          // Extract error message from backend response
          let errorMessage = '';
          let errorDetails: string[] = [];
          
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
            
            // Extract validation errors if available
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                errorDetails = Object.values(error.error.errors).flat() as string[];
              } else if (Array.isArray(error.error.errors)) {
                errorDetails = error.error.errors;
              }
            }
          }
          
          // If no message found, use default
          if (!errorMessage) {
            errorMessage = error?.message || 'Failed to create form';
          }
          
          // Check for duplicate code or required field errors
          const errorLower = errorMessage.toLowerCase();
          const isDuplicateError = errorLower.includes('duplicate') || 
                                   errorLower.includes('already exists') ||
                                   errorLower.includes('formcode') ||
                                   errorLower.includes('form code');
          
          // Check if error details contain duplicate info
          const duplicateInDetails = errorDetails.some(detail => 
            detail.toLowerCase().includes('duplicate') || 
            detail.toLowerCase().includes('already exists')
          );
          
          // If duplicate error, show clear message with form code
          if (isDuplicateError || duplicateInDetails) {
            let formCodeInError = this.formCode;
            
            // Try to find form code in error message
            const codeMatch = errorMessage.match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
            if (codeMatch && codeMatch[1]) {
              formCodeInError = codeMatch[1];
            }
            
            // Check error details for form code
            if (errorDetails.length > 0) {
              const codeInDetails = errorDetails[0].match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
              if (codeInDetails && codeInDetails[1]) {
                formCodeInError = codeInDetails[1];
              }
            }
            
            const duplicateMessage = `Form Code "${formCodeInError}" متكرر. يرجى استخدام كود آخر.`;
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ في التحقق',
              detail: duplicateMessage,
              life: 10000
            });
          } else if (errorDetails.length > 0) {
            // Show validation errors
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ في التحقق',
              detail: errorDetails[0] + (errorDetails.length > 1 ? ` (+${errorDetails.length - 1} أكثر)` : ''),
              life: 10000
            });
          } else {
            // Show generic error
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: errorMessage,
              life: 7000
            });
          }
        }
      });
    }
  }

  deleteForm(id: number): void {
    const formToDelete = this.forms.find(f => f.id === id);
    if (!formToDelete) return;

    this.confirmationService.confirm({
      message: `Delete "${formToDelete.formName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.formsService.deleteForm(id).subscribe({
          next: () => {
            this.loadForms();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Form deleted successfully'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete form'
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

  copyPublicLink(form: FormBuilderDto): void {
    if (!form?.formCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Copy link',
        detail: 'Form code is missing.'
      });
      return;
    }

    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/forms/view/${encodeURIComponent(form.formCode)}`;

    navigator.clipboard.writeText(publicUrl).then(
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Link copied',
          detail: 'Public form link copied to clipboard.'
        });
      },
      () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Copy failed',
          detail: 'Unable to copy link. Please try again.'
        });
      }
    );
  }

  duplicateForm(form: FormBuilderDto): void {
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

