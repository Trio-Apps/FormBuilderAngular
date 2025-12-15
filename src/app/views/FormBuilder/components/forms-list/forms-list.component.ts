
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormsService } from '../../services/forms.service';
import { TabsService } from '../../services/tabs.service';
import { FieldsService } from '../../services/fields.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilderDto } from '../../form-builder/models/form-builder-dto.model';
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
    PaginatorModule
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
  formCode = '';
  description = '';
  isPublished = false;
  isActive = true;
  editingForm: FormBuilderDto | null = null;

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
    private router: Router
  ) {
    // Bind window focus handler to preserve reference for cleanup
    this.windowFocusHandler = this.onWindowFocus.bind(this);
  }

  ngOnInit(): void {
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

  loadForms(): void {
    this.loading = true;
    // Clear existing data to force refresh
    this.forms = [];
    this.filteredForms = [];
    
    this.formsService.getForms().subscribe({
      next: (forms) => {
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
      this.totalItems = 0;
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

    this.forms = updatedForms;
    this.filteredForms = [...updatedForms];
    this.totalItems = updatedForms.length;
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

    this.totalItems = this.filteredForms.length;
    this.currentPage = 1;
    this.updatePagination();
  }
  get currentItemEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }
  updatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);

    this.paginatedForms = this.filteredForms.slice(startIndex, endIndex);
  }

  onPageChange(event: any): void {
    // Handle both PrimeNG paginator (0-based) and custom pagination (1-based)
    if (event && typeof event.page === 'number') {
      this.currentPage = event.page + 1;
    } else if (typeof event === 'number') {
      this.currentPage = event;
    }
    this.updatePagination();
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
    this.updatePagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  openFormModal(form?: FormBuilderDto): void {
    if (form) {
      this.editingForm = form;
      this.formName = form.formName;
      this.formCode = form.formCode;
      this.description = form.description || '';
      this.isPublished = form.isPublished ?? false;
      this.isActive = form.isActive !== false;
    } else {
      this.editingForm = null;
      this.formName = '';
      this.formCode = '';
      this.description = '';
      this.isPublished = false;
      this.isActive = true;
    }
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingForm = null;
    this.formName = '';
    this.formCode = '';
    this.description = '';
    this.isPublished = false;
    this.isActive = true;
  }

  saveForm(): void {
    if (!this.formName || !this.formCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Form name and code are required'
      });
      return;
    }

    this.loading = true;

    if (this.editingForm) {
      const updateDto = {
        formName: this.formName,
        formCode: this.formCode,
        description: this.description,
        isPublished: this.isPublished,
        isActive: this.isActive
      };

      this.formsService.updateForm(this.editingForm.id, updateDto).subscribe({
        next: () => {
          this.loadForms();
          this.closeFormModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form updated successfully'
          });
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      const createDto = {
        formName: this.formName,
        formCode: this.formCode,
        description: this.description,
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
        error: () => {
          this.loading = false;
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
}

