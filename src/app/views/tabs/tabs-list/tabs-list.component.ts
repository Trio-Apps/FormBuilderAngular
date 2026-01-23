import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormTabDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { DocumentType, CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../../FormBuilder/form-builder/models/document-types.model';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { DuplicateValidationHelper } from '../../../core/utils/duplicate-validation.helper';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-tabs-list',
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
    InputNumberModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    CheckboxModule,
    TranslatePipe,
    TableShellComponent
  ],
  templateUrl: './tabs-list.component.html',
  styleUrls: ['./tabs-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TabsListComponent implements OnInit, OnDestroy {
  formId!: number;
  tabs: FormTabDto[] = [];
  deletedTabs: FormTabDto[] = [];
  loading = false;
  loadingDeleted = false;
  private routeSubscription?: Subscription;
  searchTerm = '';
  showDeletedTabs = false; // Toggle to show/hide deleted tabs
  
  // Tab Modal updated
  showTabModal = false;
  tabName = '';
  foreignTabName = ''; // Arabic tab name
  tabCode = '';
  tabOrder = 1;
  editingTab: FormTabDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

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

    this.routeSubscription = this.route.params.subscribe(params => {
      const newFormId = +params['formId'];
      if (newFormId && newFormId !== this.formId) {
        this.formId = newFormId;
        this.loadTabs();
        this.loadDeletedTabs();
      } else if (newFormId && !this.formId) {
        this.formId = newFormId;
        this.loadTabs();
        this.loadDeletedTabs();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  /**
   * Load deleted tabs from API
   */
  loadDeletedTabs(): void {
    if (!this.formId || isNaN(this.formId)) {
      return;
    }

    this.loadingDeleted = true;
    this.tabsService.getAllDeletedAsync(1, 100).subscribe({
      next: (result) => {
        // Filter deleted tabs to ensure they belong to this form
        this.deletedTabs = Array.isArray(result.items)
          ? result.items.filter((tab: any) => tab.formBuilderId === this.formId)
          : [];
        console.log('[TabsList] Loaded deleted tabs:', this.deletedTabs.length);
        this.loadingDeleted = false;
      },
      error: (error) => {
        console.error('[TabsList] Error loading deleted tabs:', error);
        this.deletedTabs = [];
        this.loadingDeleted = false;
      }
    });
  }

  loadFieldsCountForTab(tabId: number, tab: FormTabDto): void {
    this.fieldsService.getFieldsByTabId(tabId).subscribe({
      next: (fields) => {
        tab.fieldsCount = Array.isArray(fields) ? fields.length : 0;
      },
      error: () => {
        tab.fieldsCount = 0;
      }
    });
  }

  loadTabs(): void {
    if (!this.formId || isNaN(this.formId)) {
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid form ID'
      });
      return;
    }

    this.loading = true;
    this.tabsService.getTabs(this.formId).subscribe({
      next: (tabs) => {
        // Filter tabs to ensure they belong to this form and are not deleted
        this.tabs = Array.isArray(tabs)
          ? tabs.filter(tab => tab.formBuilderId === this.formId && tab.isDeleted !== true)
          : [];

        console.log('[TabsList] Loaded active tabs:', this.tabs.length);

        // Load fields count for each tab
        this.tabs.forEach(tab => {
          if (tab.id) {
            this.loadFieldsCountForTab(tab.id, tab);
          }
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tabs'
        });
      }
    });
  }

  get filteredTabs(): FormTabDto[] {
    if (!this.searchTerm.trim()) {
      return this.tabs;
    }
    const term = this.searchTerm.toLowerCase();
    return this.tabs.filter(tab =>
      tab.tabName.toLowerCase().includes(term) ||
      (tab.tabCode && tab.tabCode.toLowerCase().includes(term))
    );
  }

  getActiveTabsCount(): number {
    return this.tabs.length;
  }

  getDeletedTabsCount(): number {
    return this.deletedTabs.length;
  }

  getAllTabsCount(): number {
    return this.tabs.length + this.deletedTabs.length;
  }

  getTotalFieldsCount(): number {
    return this.tabs.reduce((sum, t) => sum + (t.fieldsCount || 0), 0);
  }

  openTabModal(tab?: FormTabDto): void {
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    if (tab) {
      this.editingTab = tab;
      this.tabName = tab.tabName;
      this.foreignTabName = tab.foreignTabName || '';
      this.tabCode = tab.tabCode || '';
      this.tabOrder = tab.tabOrder || 1;
    } else {
      this.editingTab = null;
      this.tabName = '';
      this.foreignTabName = '';
      this.tabCode = '';
      this.tabOrder = this.tabs.length + 1;
    }
    this.showTabModal = true;
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
    localStorage.setItem('adminLanguagePreference', lang);
  }

  /**
   * Translate a key based on currentInputLanguage
   */
  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  closeTabModal(): void {
    this.showTabModal = false;
    this.editingTab = null;
    this.tabName = '';
    this.foreignTabName = '';
    this.tabCode = '';
    this.tabOrder = 1;
  }

  saveTab(): void {
    if (!this.tabName || !this.tabCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Tab name and code are required'
      });
      return;
    }

    if (!this.formId || isNaN(this.formId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Invalid form ID. Please go back and try again.'
      });
      return;
    }

    this.loading = true;
    
    if (this.editingTab) {
      const updateDto = {
        tabName: this.tabName,
        foreignTabName: this.foreignTabName || undefined,
        tabCode: this.tabCode,
        tabOrder: this.tabOrder,
        isDeleted: false // Note: isDeleted is not managed via form - it's handled via delete/restore actions
      };
      
      this.tabsService.updateTab(this.editingTab.id, updateDto).subscribe({
        next: () => {
          // Note: isDeleted is managed via delete/restore actions, not via form
          
          this.loading = false;
          this.loadTabs();
          this.closeTabModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tab updated successfully'
          });
        },
        error: (error) => {
          console.error('[TabsList] Tab update error:', error);
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
                               errorLower.includes('tabcode') ||
                               errorLower.includes('tab code') ||
                               errorLower.includes('مكرر') ||
                               errorLower.includes('موجود') ||
                               errorLower.includes('unique') ||
                               errorLower.includes('constraint');
            
            if (isDuplicate) {
              // Show duplicate error message
              const duplicateValue = this.tabCode || 'N/A';
              const message = currentLang === 'ar' 
                ? `كود التبويب "${duplicateValue}" متكرر. يرجى استخدام كود آخر.`
                : `Tab Code "${duplicateValue}" already exists. Please use a different code.`;
              
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
            const message = errorMessage || (currentLang === 'ar' ? 'حدث خطأ أثناء تحديث التبويب' : 'An error occurred while updating the tab');
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
      const createDto = {
        formBuilderId: this.formId,
        tabName: this.tabName,
        foreignTabName: this.foreignTabName || undefined,
        tabCode: this.tabCode,
        tabOrder: this.tabOrder,
        isDeleted: false // Note: isDeleted defaults to false for new tabs (handled by backend)
      };
      
      this.tabsService.createTab(createDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadTabs();
          this.closeTabModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tab created successfully'
          });
        },
        error: (error) => {
          console.error('[TabsList] Tab creation error:', error);
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
                               errorLower.includes('tabcode') ||
                               errorLower.includes('tab code') ||
                               errorLower.includes('مكرر') ||
                               errorLower.includes('موجود') ||
                               errorLower.includes('unique') ||
                               errorLower.includes('constraint');
            
            if (isDuplicate) {
              // Show duplicate error message
              const duplicateValue = this.tabCode || 'N/A';
              const message = currentLang === 'ar' 
                ? `كود التبويب "${duplicateValue}" متكرر. يرجى استخدام كود آخر.`
                : `Tab Code "${duplicateValue}" already exists. Please use a different code.`;
              
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
            const message = errorMessage || (currentLang === 'ar' ? 'حدث خطأ أثناء إنشاء التبويب' : 'An error occurred while creating the tab');
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

  navigateToFields(tabId: number): void {
    this.router.navigate(['../../fields', tabId], { relativeTo: this.route });
  }

  navigateToGrids(tabId?: number): void {
    const targetTabId = tabId || this.tabs[0]?.id;
    if (targetTabId) {
      this.router.navigate(['../../grids', targetTabId], { relativeTo: this.route });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a tab first'
      });
    }
  }

  deleteTab(id: number): void {
    console.log('[TabsList] deleteTab called for id:', id);
    const tabToDelete = this.tabs.find(t => t.id === id);
    if (!tabToDelete) {
      console.warn('[TabsList] Tab not found for deletion:', id);
      return;
    }

    console.log('[TabsList] Tab to delete:', tabToDelete);

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${tabToDelete.tabName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        console.log('[TabsList] User confirmed deletion for tab:', id);
        this.loading = true;
        this.tabsService.softDelete(id).subscribe({
          next: () => {
            console.log('[TabsList] Soft delete API response received');

            // Remove from active tabs list
            this.tabs = this.tabs.filter(t => t.id !== id);

            // Reload deleted tabs to show the newly deleted tab
            this.loadDeletedTabs();

            this.loading = false;

            // Force change detection to update UI immediately
            this.cdr.detectChanges();

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Tab deleted successfully',
              life: 5000
            });
          },
          error: (error: any) => {
            this.loading = false;
            console.error('[TabsList] Error deleting tab:', error);

            let errorMessage = 'Failed to delete tab';
            if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }

  /**
   * Restore a soft-deleted tab
   */
  restoreTab(id: number): void {
    const tabToRestore = this.deletedTabs.find(t => t.id === id);
    if (!tabToRestore) {
      console.warn('[TabsList] Tab not found for restoration:', id);
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to restore "${tabToRestore.tabName}"?`,
      header: 'Confirm Restore',
      icon: 'pi pi-refresh',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        console.log('[TabsList] User confirmed restoration for tab:', id);
        this.loading = true;
        this.tabsService.restore(id).subscribe({
          next: (restoredTab) => {
            console.log('[TabsList] Tab restored successfully:', restoredTab);

            // Remove from deleted tabs list
            this.deletedTabs = this.deletedTabs.filter(t => t.id !== id);

            // Add to active tabs list
            this.tabs.push(restoredTab);

            // Load fields count for the restored tab
            this.loadFieldsCountForTab(restoredTab.id!, restoredTab);

            this.loading = false;

            // Force change detection to update UI immediately
            this.cdr.detectChanges();

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Tab restored successfully',
              life: 5000
            });
          },
          error: (error: any) => {
            this.loading = false;
            console.error('[TabsList] Error restoring tab:', error);

            let errorMessage = 'Failed to restore tab';
            if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }

  /**
   * Toggle showing/hiding deleted tabs
   */
  toggleDeletedTabs(): void {
    this.showDeletedTabs = !this.showDeletedTabs;
    if (this.showDeletedTabs && this.deletedTabs.length === 0) {
      this.loadDeletedTabs();
    }
  }

}







