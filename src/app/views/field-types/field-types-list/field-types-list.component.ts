import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldTypesService } from '../../FormBuilder/services/field-types.service';
import { FieldTypeDto, CreateFieldTypeDto, UpdateFieldTypeDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-field-types-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './field-types-list.component.html',
  styleUrls: ['./field-types-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FieldTypesListComponent implements OnInit, OnDestroy {
  // Data Arrays
  fieldTypes: FieldTypeDto[] = [];
  filteredFieldTypes: FieldTypeDto[] = [];

  // Loading States
  loading = {
    fieldTypes: false,
    save: false,
    delete: false
  };

  // Field Type Modal
  showFieldTypeModal = false;
  editingFieldType: FieldTypeDto | null = null;

  // Reactive Form
  fieldTypeForm: FormGroup;

  // Search Filter
  searchTerm = '';

  // Predefined base field type names to choose from
  baseTypeOptions = [
    { label: 'Textbox', value: 'Textbox' },
    { label: 'Textarea', value: 'Textarea' },
    { label: 'Number', value: 'Number' },
    { label: 'Email', value: 'Email' },
    { label: 'Date', value: 'Date' },
    { label: 'File', value: 'File' },
    { label: 'Checkbox', value: 'Checkbox' },
    { label: 'Dropdown', value: 'Dropdown' },
    { label: 'Radio', value: 'Radio' },
    { label: 'Switch', value: 'Switch' }
  ];

  // Predefined data types to choose from
  dataTypeOptions = [
    { label: 'String', value: 'string' },
    { label: 'Number (int)', value: 'int' },
    { label: 'Number (decimal)', value: 'decimal' },
    { label: 'Boolean', value: 'bool' },
    { label: 'Date', value: 'date' },
    { label: 'DateTime', value: 'datetime' },
    { label: 'Email', value: 'email' },
    { label: 'File', value: 'file' }
  ];

  constructor(
    private fieldTypesService: FieldTypesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Initialize the form
    this.fieldTypeForm = this.fb.group({
      typeName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      dataType: ['', Validators.maxLength(50)],
      maxLength: [null],
      hasOptions: [false],
      allowMultiple: [false],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadFieldTypes();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadFieldTypes(): void {
    this.loading.fieldTypes = true;
    this.fieldTypesService.getAllFieldTypes().subscribe({
      next: (types: FieldTypeDto[]) => {
        this.fieldTypes = types;
        this.filteredFieldTypes = [...types];
        this.loading.fieldTypes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.fieldTypes = [];
        this.filteredFieldTypes = [];
        this.loading.fieldTypes = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load field types' });
      }
    });
  }

  filterFieldTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFieldTypes = [...this.fieldTypes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredFieldTypes = this.fieldTypes.filter(type =>
      type.typeName.toLowerCase().includes(term) ||
      (type.description && type.description.toLowerCase().includes(term)) ||
      (type.dataType && type.dataType.toLowerCase().includes(term))
    );
  }

  getActiveFieldTypesCount(): number {
    return this.fieldTypes.filter(t => t.isActive).length;
  }

  getTypesWithOptionsCount(): number {
    return this.fieldTypes.filter(t => t.hasOptions).length;
  }

  openAddFieldTypeModal(): void {
    this.editingFieldType = null;
    this.showFieldTypeModal = true;

    this.fieldTypeForm.reset({
      typeName: '',
      description: '',
      dataType: '',
      maxLength: null,
      hasOptions: false,
      allowMultiple: false,
      isActive: true
    });
  }

  openEditFieldTypeModal(fieldType: FieldTypeDto): void {
    this.editingFieldType = fieldType;
    this.showFieldTypeModal = true;

    this.fieldTypeForm.patchValue({
      typeName: fieldType.typeName || '',
      description: fieldType.description || '',
      dataType: fieldType.dataType || '',
      maxLength: fieldType.maxLength || null,
      hasOptions: fieldType.hasOptions || false,
      allowMultiple: fieldType.allowMultiple || false,
      isActive: fieldType.isActive !== false
    });
  }

  closeFieldTypeModal(): void {
    this.showFieldTypeModal = false;
    this.editingFieldType = null;
    this.fieldTypeForm.reset({
      hasOptions: false,
      allowMultiple: false,
      isActive: true
    });
  }

  saveFieldType(): void {
    if (this.fieldTypeForm.invalid) {
      this.markFormGroupTouched(this.fieldTypeForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const fieldTypeData = this.fieldTypeForm.value;

    if (this.editingFieldType) {
      const updateDto: UpdateFieldTypeDto = {
        typeName: fieldTypeData.typeName,
        description: fieldTypeData.description || undefined,
        dataType: fieldTypeData.dataType || undefined,
        maxLength: fieldTypeData.maxLength ? Number(fieldTypeData.maxLength) : undefined,
        hasOptions: fieldTypeData.hasOptions || false,
        allowMultiple: fieldTypeData.allowMultiple || false,
        isActive: fieldTypeData.isActive !== false
      };

      this.fieldTypesService.updateFieldType(this.editingFieldType.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadFieldTypes();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field type updated successfully' });
          this.closeFieldTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to update field type';
          if (error.error?.message) errorMessage = error.error.message;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    } else {
      const createDto: CreateFieldTypeDto = {
        typeName: fieldTypeData.typeName,
        description: fieldTypeData.description || undefined,
        dataType: fieldTypeData.dataType || undefined,
        maxLength: fieldTypeData.maxLength ? Number(fieldTypeData.maxLength) : undefined,
        hasOptions: fieldTypeData.hasOptions || false,
        allowMultiple: fieldTypeData.allowMultiple || false,
        isActive: fieldTypeData.isActive !== false
      };

      this.fieldTypesService.createFieldType(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadFieldTypes();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field type created successfully' });
          this.closeFieldTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to create field type';
          if (error.error?.message) errorMessage = error.error.message;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    }
  }

  deleteFieldType(fieldTypeId: number): void {
    const fieldTypeToDelete = this.fieldTypes.find(t => t.id === fieldTypeId);
    if (!fieldTypeToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the field type "${fieldTypeToDelete.typeName}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.fieldTypesService.deleteFieldType(fieldTypeId).subscribe({
          next: () => {
            this.loading.delete = false;
            this.loadFieldTypes();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field type deleted successfully' });
          },
          error: (error) => {
            this.loading.delete = false;
            console.error('Error deleting field type:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message,
              url: error.url
            });
            
            let errorMessage = 'Failed to delete field type';
            
            // Extract detailed error message from response (ASP.NET Core ProblemDetails format)
            if (error.error) {
              // Check for ASP.NET Core ProblemDetails format
              if (error.error.detail) {
                errorMessage = error.error.detail;
              } else if (error.error.errors) {
                // Validation errors from ASP.NET Core
                const validationErrors = Object.values(error.error.errors).flat() as string[];
                errorMessage = `Validation errors: ${validationErrors.join(', ')}`;
              } else if (error.error.message) {
                errorMessage = error.error.message;
              } else if (error.error.title) {
                errorMessage = error.error.title;
              } else if (typeof error.error === 'string') {
                errorMessage = error.error;
              } else if (error.error.errorMessage) {
                errorMessage = error.error.errorMessage;
              } else if (error.error.error) {
                errorMessage = error.error.error;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            // Check for common HTTP status codes and provide context-specific messages
            if (error.status === 400) {
              // 400 Bad Request - usually means business logic violation
              if (!errorMessage || errorMessage === 'Failed to delete field type') {
                errorMessage = 'Cannot delete this field type. It may be in use by existing fields. Please deactivate it instead or remove all fields using this type first.';
              }
            } else if (error.status === 404) {
              errorMessage = 'Field type not found. It may have already been deleted.';
            } else if (error.status === 409) {
              errorMessage = 'Cannot delete field type. It is currently being used by one or more fields.';
            } else if (error.status === 403) {
              errorMessage = 'You do not have permission to delete this field type.';
            } else if (error.status === 500) {
              errorMessage = errorMessage || 'Server error occurred while deleting the field type. Please try again later.';
            } else if (error.status === 0) {
              errorMessage = 'Network error. Please check your connection and try again.';
            }
            
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Delete Failed', 
              detail: errorMessage,
              life: 7000
            });
          }
        });
      }
    });
  }

  toggleFieldTypeStatus(fieldType: FieldTypeDto): void {
    const newStatus = !fieldType.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the field type "${fieldType.typeName}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fieldTypesService.toggleFieldTypeStatus(fieldType.id, newStatus).subscribe({
          next: () => {
            this.loadFieldTypes();
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: `Field type ${action}d successfully` 
            });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to ${action} field type` });
          }
        });
      }
    });
  }

  getFieldTypeStatusClass(fieldType: FieldTypeDto): string {
    if (!fieldType.isActive) return 'status-inactive';
    return 'status-active';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Form Validation Helpers
  isFieldInvalid(fieldName: string): boolean {
    const control = this.fieldTypeForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.fieldTypeForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    return 'Invalid value';
  }
}
