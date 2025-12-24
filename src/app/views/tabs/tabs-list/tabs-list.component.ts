import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormTabDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-tabs-list',
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
    TranslatePipe
  ],
  templateUrl: './tabs-list.component.html',
  styleUrls: ['./tabs-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TabsListComponent implements OnInit, OnDestroy {
  formId!: number;
  tabs: FormTabDto[] = [];
  loading = false;
  private routeSubscription?: Subscription;
  searchTerm = '';
  
  // Tab Modal updated
  showTabModal = false;
  tabName = '';
  foreignTabName = ''; // Arabic tab name
  tabCode = '';
  tabOrder = 1;
  isActive = true;
  editingTab: FormTabDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
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
      } else if (newFormId && !this.formId) {
        this.formId = newFormId;
        this.loadTabs();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
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
        // Filter tabs to ensure they belong to this form
        this.tabs = Array.isArray(tabs) ? tabs.filter(tab => 
          tab.formBuilderId === this.formId
        ) : [];
        
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
    return this.tabs.filter(t => t.isActive).length;
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
      this.isActive = tab.isActive !== false;
    } else {
      this.editingTab = null;
      this.tabName = '';
      this.foreignTabName = '';
      this.tabCode = '';
      this.tabOrder = this.tabs.length + 1;
      this.isActive = true;
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
    this.isActive = true;
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
        isActive: this.isActive
      };
      
      this.tabsService.updateTab(this.editingTab.id, updateDto).subscribe({
        next: () => {
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
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            }
            
            // Extract validation errors if available (ASP.NET Core ProblemDetails format)
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                // Format: { "TabCode": ["error message"] }
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
          
          // If no message found, use default
          if (!errorMessage) {
            errorMessage = error?.message || 'Failed to update tab';
          }
          
          // Check for duplicate code error and create user-friendly message
          const errorLower = errorMessage.toLowerCase();
          const isDuplicateError = errorLower.includes('duplicate') || 
                                   errorLower.includes('already exists') ||
                                   errorLower.includes('tabcode') ||
                                   errorLower.includes('tab code');
          
          // Check if error details contain duplicate info
          const duplicateInDetails = errorDetails.some(detail => 
            detail.toLowerCase().includes('duplicate') || 
            detail.toLowerCase().includes('already exists')
          );
          
          // If duplicate error, show clear message with tab code
          if (isDuplicateError || duplicateInDetails || error?.status === 400) {
            // Try to extract tab code from error message or use current tabCode
            let tabCodeInError = this.tabCode;
            
            // Try to find tab code in error message
            const codeMatch = errorMessage.match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
            if (codeMatch && codeMatch[1]) {
              tabCodeInError = codeMatch[1];
            }
            
            // Check error details for tab code
            if (errorDetails.length > 0) {
              const codeInDetails = errorDetails[0].match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
              if (codeInDetails && codeInDetails[1]) {
                tabCodeInError = codeInDetails[1];
              }
            }
            
            // Show clear duplicate message
            const duplicateMessage = `Tab Code "${tabCodeInError}" is duplicate.`;
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Error',
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
    } else {
      const createDto = {
        formBuilderId: this.formId,
        tabName: this.tabName,
        foreignTabName: this.foreignTabName || undefined,
        tabCode: this.tabCode,
        tabOrder: this.tabOrder,
        isActive: this.isActive
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
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            }
            
            // Extract validation errors if available (ASP.NET Core ProblemDetails format)
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                // Format: { "TabCode": ["error message"] }
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
          
          // If no message found, use default
          if (!errorMessage) {
            errorMessage = error?.message || 'Failed to create tab';
          }
          
          // Check for duplicate code error and create user-friendly message
          const errorLower = errorMessage.toLowerCase();
          const isDuplicateError = errorLower.includes('duplicate') || 
                                   errorLower.includes('already exists') ||
                                   errorLower.includes('tabcode') ||
                                   errorLower.includes('tab code');
          
          // Check if error details contain duplicate info
          const duplicateInDetails = errorDetails.some(detail => 
            detail.toLowerCase().includes('duplicate') || 
            detail.toLowerCase().includes('already exists')
          );
          
          // If duplicate error, show clear message with tab code
          if (isDuplicateError || duplicateInDetails || error?.status === 400) {
            // Try to extract tab code from error message or use current tabCode
            let tabCodeInError = this.tabCode;
            
            // Try to find tab code in error message
            const codeMatch = errorMessage.match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
            if (codeMatch && codeMatch[1]) {
              tabCodeInError = codeMatch[1];
            }
            
            // Check error details for tab code
            if (errorDetails.length > 0) {
              const codeInDetails = errorDetails[0].match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
              if (codeInDetails && codeInDetails[1]) {
                tabCodeInError = codeInDetails[1];
              }
            }
            
            // Show clear duplicate message
            const duplicateMessage = `Tab Code "${tabCodeInError}" is duplicate.`;
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Error',
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
    const tabToDelete = this.tabs.find(t => t.id === id);
    if (!tabToDelete) return;

    this.confirmationService.confirm({
      message: `Delete "${tabToDelete.tabName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.tabsService.deleteTab(id).subscribe({
          next: () => {
            this.loadTabs();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Tab deleted successfully'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete tab'
            });
          }
        });
      }
    });
  }

}