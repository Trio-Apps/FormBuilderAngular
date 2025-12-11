
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormsService } from '../../services/forms.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilderDto } from '../../form-builder/models/form-builder-dto.model';

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
export class FormsListComponent implements OnInit {
  forms: FormBuilderDto[] = [];
  filteredForms: FormBuilderDto[] = [];
  searchTerm = '';
  loading = false;
  
  // Form Modal
  showFormModal = false;
  formName = '';
  formCode = '';
  description = '';
  editingForm: FormBuilderDto | null = null;

  // Pagination
  paginatedForms: FormBuilderDto[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private formsService: FormsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.loading = true;
    this.formsService.getForms().subscribe({
      next: (forms) => {
        this.forms = forms;
        this.filteredForms = [...forms];
        this.totalItems = forms.length;
        this.updatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load forms'
        });
      }
    });
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
    this.currentPage = event.page + 1; // PrimeNG paginator يبدأ من 0
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
    } else {
      this.editingForm = null;
      this.formName = '';
      this.formCode = '';
      this.description = '';
    }
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingForm = null;
    this.formName = '';
    this.formCode = '';
    this.description = '';
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
        description: this.description
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
        description: this.description
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

  getTabsCount(form: FormBuilderDto): number {
    return form.tabs?.length || 0;
  }

  getFieldsCount(form: FormBuilderDto): number {
    let total = 0;
    form.tabs?.forEach(tab => {
      total += tab.fields?.length || 0;
    });
    return total;
  }
}

