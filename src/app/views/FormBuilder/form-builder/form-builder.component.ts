// form-builder.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsService } from '../forms.service';
import { FormBuilderDto, CreateFormBuilderDto, UpdateFormBuilderDto } from './models/form-builder-dto.model';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { FormModule } from '@coreui/angular';

@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule
  ],
  providers: [MessageService, ConfirmationService]
})
export class FormBuilderComponent implements OnInit {
  // البيانات الأصلية
  allForms: FormBuilderDto[] = [];
  // البيانات المعروضة بعد البحث
  forms: FormBuilderDto[] = [];
  
  showModal = false;
  formGroup!: FormGroup;
  editingFormId: number | null = null;

  // البحث
  searchTerm: string = '';

  // حالة التحميل
  loading = {
    forms: false,
    save: false,
    delete: false
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  paginatedForms: FormBuilderDto[] = [];

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private formsService: FormsService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadForms();
    this.initForm();
  }

  initForm(): void {
    this.formGroup = this.fb.group({
      formName: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(200)
      ]],
      formCode: ['', [
        Validators.required, 
        Validators.minLength(2), 
        Validators.maxLength(100), 
        Validators.pattern('^[A-Z0-9_]+$')
      ]],
      description: ['', [Validators.maxLength(500)]],
      isPublished: [false],
      isActive: [true]
    });

    // تنقية Form Code تلقائياً
    this.formGroup.get('formCode')?.valueChanges.subscribe(value => {
      if (value) {
        const cleanedValue = value.replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
        if (cleanedValue !== value) {
          this.formGroup.get('formCode')?.setValue(cleanedValue, { emitEvent: false });
        }
      }
    });
  }

  loadForms(): void {
    this.loading.forms = true;
    
    this.formsService.getForms().subscribe({
      next: (data) => {
        this.allForms = data;
        this.forms = [...data]; // نسخة للبحث
        this.currentPage = 1;
        this.updatePagination();
        this.loading.forms = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Loaded ${data.length} forms successfully`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.loading.forms = false;
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load forms. Please try again.',
          life: 5000
        });
      }
    });
  }

onSearch(): void {
  console.log('Searching for:', this.searchTerm);
  
  if (!this.searchTerm || this.searchTerm.trim() === '') {
    this.forms = [...this.allForms];
  } else {
    const searchTerm = this.searchTerm.toLowerCase().trim();
    
    this.forms = this.allForms.filter(form => {
      const formNameMatch = form.formName?.toLowerCase().includes(searchTerm) || false;
      const formCodeMatch = form.formCode?.toLowerCase().includes(searchTerm) || false;
      const descriptionMatch = form.description?.toLowerCase().includes(searchTerm) || false;
      
      return formNameMatch || formCodeMatch || descriptionMatch;
    });
  }
  
  if (this.sortColumn) {
    this.sortForms();
  }
  
  this.currentPage = 1;
  this.updatePagination();
}

// **الدالة الجديدة للتعامل مع Enter - تم التحديث**
handleEnterKey(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault(); // لمنع سلوك النموذج الافتراضي
    this.onSearch();
  }
}


  // البحث عند الضغط على Enter
  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  // مسح البحث
  clearSearch(): void {
    this.searchTerm = '';
    this.forms = [...this.allForms];
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination
  updatePagination(): void {
    console.log('Updating pagination. Total forms:', this.forms.length);
    
    this.totalPages = Math.ceil(this.forms.length / this.itemsPerPage);
    console.log('Total pages:', this.totalPages);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    this.paginatedForms = this.forms.slice(startIndex, endIndex);
    console.log('Paginated forms:', this.paginatedForms.length);
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

  getPageNumbers(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    // تعديل startPage إذا endPage قريب من النهاية
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Sorting
  sortBy(column: string): void {
    console.log('Sorting by:', column);
    
    if (this.sortColumn === column) {
      // إذا ناقش على نفس العمود، غير الاتجاه
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // إذا عمود جديد، ابدأ تصاعدياً
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.sortForms();
  }

  sortForms(): void {
    if (!this.sortColumn) return;

    console.log('Applying sort:', this.sortColumn, this.sortDirection);

    this.forms.sort((a, b) => {
      let valueA = (a as any)[this.sortColumn];
      let valueB = (b as any)[this.sortColumn];

      // Handle undefined/null values
      if (valueA === undefined || valueA === null) valueA = '';
      if (valueB === undefined || valueB === null) valueB = '';

      // Convert to string for comparison
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      if (strA < strB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (strA > strB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  openModal(form?: FormBuilderDto): void {
    if (form) {
      this.editingFormId = form.id;
      
      this.formGroup.patchValue({
        formName: form.formName,
        formCode: form.formCode,
        description: form.description || '',
        isPublished: form.isPublished,
        isActive: form.isActive
      });
    } else {
      this.editingFormId = null;
      this.formGroup.reset({
        isPublished: false,
        isActive: true
      });
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingFormId = null;
    this.formGroup.reset();
  }

  saveForm(): void {
    if (this.formGroup.invalid) {
      this.markFormGroupTouched(this.formGroup);
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly',
        life: 5000
      });
      return;
    }

    this.loading.save = true;
    const formData = this.formGroup.value;

    if (this.editingFormId) {
      const updateDto: UpdateFormBuilderDto = { ...formData };

      this.formsService.updateForm(this.editingFormId, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form updated successfully',
            life: 5000
          });
          this.loadForms();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating form:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update form. Please try again.',
            life: 5000
          });
        }
      });
    } else {
      const createDto: CreateFormBuilderDto = { ...formData };

      this.formsService.createForm(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form created successfully',
            life: 5000
          });
          this.loadForms();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error creating form:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create form. Please try again.',
            life: 5000
          });
        }
      });
    }
  }

  deleteForm(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this form?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        
        this.formsService.deleteForm(id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Form deleted successfully',
              life: 5000
            });
            this.loadForms();
          },
          error: (error) => {
            console.error('Error deleting form:', error);
            this.loading.delete = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete form. Please try again.',
              life: 5000
            });
          }
        });
      },
      reject: () => {}
    });
  }

  // دوال مساعدة للتحقق من الصحة
  isFieldInvalid(fieldName: string): boolean {
    const field = this.formGroup.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.formGroup.get(fieldName);
    
    if (!field || !field.errors || !field.touched) return '';
    
    if (field.errors['required']) {
      return 'This field is required';
    }
    
    if (field.errors['minlength']) {
      const requiredLength = field.errors['minlength'].requiredLength;
      return `Minimum length is ${requiredLength} characters`;
    }
    
    if (field.errors['maxlength']) {
      const requiredLength = field.errors['maxlength'].requiredLength;
      return `Maximum length is ${requiredLength} characters`;
    }
    
    if (field.errors['pattern']) {
      return 'Only uppercase letters, numbers and underscores are allowed';
    }
    
    return 'Invalid value';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get modalTitle(): string {
    return this.editingFormId ? 'Edit Form' : 'Add New Form';
  }

  cleanFormCode(): void {
    const formCodeControl = this.formGroup.get('formCode');
    if (formCodeControl) {
      let value = formCodeControl.value || '';
      value = value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
      formCodeControl.setValue(value, { emitEvent: false });
    }
  }
}