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

    // Watch for typeName changes to show/hide options section
    this.fieldTypeForm.get('typeName')?.valueChanges.subscribe(typeName => {
      this.onTypeNameChange(typeName);
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

    const typeName = fieldType.typeName || '';
    const optionsSupportedTypes = ['Dropdown', 'Radio', 'Checkbox'];
    const supportsOptions = optionsSupportedTypes.includes(typeName);

    this.fieldTypeForm.patchValue({
      typeName: typeName,
      description: fieldType.description || '',
      dataType: fieldType.dataType || '',
      maxLength: fieldType.maxLength || null,
      // Only set options if the type supports them, otherwise reset to false
      hasOptions: supportsOptions ? (fieldType.hasOptions || false) : false,
      allowMultiple: supportsOptions ? (fieldType.allowMultiple || false) : false,
      isActive: fieldType.isActive !== false
    }, { emitEvent: false }); // Don't emit event to avoid triggering onTypeNameChange
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
      // Ensure ID is a number
      const fieldTypeId = Number(this.editingFieldType.id);
      if (isNaN(fieldTypeId)) {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid field type ID' });
        return;
      }

      // Ensure typeName is provided (API might require it even though DTO shows optional)
      if (!fieldTypeData.typeName || fieldTypeData.typeName.trim() === '') {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Validation', detail: 'Type name is required' });
        return;
      }

      const updateDto: UpdateFieldTypeDto = {
        typeName: fieldTypeData.typeName.trim(),
        description: fieldTypeData.description?.trim() || undefined,
        dataType: fieldTypeData.dataType?.trim() || undefined,
        maxLength: fieldTypeData.maxLength ? Number(fieldTypeData.maxLength) : undefined,
        hasOptions: fieldTypeData.hasOptions || false,
        allowMultiple: fieldTypeData.allowMultiple || false,
        isActive: fieldTypeData.isActive !== false
      };

      this.fieldTypesService.updateFieldType(fieldTypeId, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadFieldTypes();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field type updated successfully' });
          this.closeFieldTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          console.error('Error updating field type:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message,
            url: error.url,
            fieldTypeId: fieldTypeId,
            updateDto: updateDto
          });
          
          let errorMessage = 'Failed to update field type';
          
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
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          // Check for common HTTP status codes and provide context-specific messages
          if (error.status === 400) {
            // 400 Bad Request - usually means validation or business logic violation
            if (!errorMessage || errorMessage === 'Failed to update field type') {
              errorMessage = 'Invalid data provided. Please check all fields and try again.';
            }
          } else if (error.status === 404) {
            errorMessage = 'Field type not found. It may have been deleted.';
          } else if (error.status === 409) {
            errorMessage = 'Cannot update field type. There may be a conflict with existing data.';
          } else if (error.status === 500) {
            errorMessage = errorMessage || 'Server error occurred. Please try again later.';
          } else if (error.status === 0) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Update Failed', 
            detail: errorMessage,
            life: 7000
          });
        }
      });
    } else {
      // Validate typeName is provided
      if (!fieldTypeData.typeName || fieldTypeData.typeName.trim() === '') {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Validation', detail: 'Type name is required' });
        return;
      }

      // Build DTO, ensuring all required fields are present and properly formatted
      const createDto: CreateFieldTypeDto = {
        typeName: fieldTypeData.typeName.trim(),
        hasOptions: Boolean(fieldTypeData.hasOptions),
        allowMultiple: Boolean(fieldTypeData.allowMultiple),
        isActive: fieldTypeData.isActive !== false && fieldTypeData.isActive !== null
      };

      // Add optional fields only if they have values
      if (fieldTypeData.description && fieldTypeData.description.trim()) {
        createDto.description = fieldTypeData.description.trim();
      }

      if (fieldTypeData.dataType && fieldTypeData.dataType.trim()) {
        createDto.dataType = fieldTypeData.dataType.trim();
      }

      if (fieldTypeData.maxLength !== null && fieldTypeData.maxLength !== undefined && fieldTypeData.maxLength !== '') {
        const maxLengthNum = Number(fieldTypeData.maxLength);
        if (!isNaN(maxLengthNum) && maxLengthNum > 0) {
          createDto.maxLength = maxLengthNum;
        }
      }

      console.log('[saveFieldType] Creating field type with DTO:', createDto);
      console.log('[saveFieldType] DTO JSON:', JSON.stringify(createDto, null, 2));

      this.fieldTypesService.createFieldType(createDto).subscribe({
        next: (createdFieldType) => {
          console.log('[saveFieldType] Field type created successfully:', createdFieldType);
          this.loading.save = false;
          this.loadFieldTypes();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field type created successfully' });
          this.closeFieldTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          console.error('[saveFieldType] Error creating field type:', error);
          console.error('[saveFieldType] Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message,
            url: error.url,
            createDto: createDto
          });

          let errorMessage = 'Failed to create field type';
          let errorDetails: string[] = [];
          
          // Extract detailed error message from response (ASP.NET Core ProblemDetails format)
          if (error.error) {
            console.log('[saveFieldType] Full error.error object:', JSON.stringify(error.error, null, 2));
            
            // Check for ASP.NET Core ProblemDetails format with validation errors
            if (error.error.errors && typeof error.error.errors === 'object') {
              // Validation errors from ASP.NET Core - format: { "fieldName": ["error1", "error2"] }
              const errors: { [key: string]: string[] } = error.error.errors;
              errorDetails = [];
              
              for (const [field, messages] of Object.entries(errors)) {
                if (Array.isArray(messages)) {
                  messages.forEach(msg => {
                    errorDetails.push(`${field}: ${msg}`);
                  });
                } else {
                  errorDetails.push(`${field}: ${messages}`);
                }
              }
              
              if (errorDetails.length > 0) {
                errorMessage = `Validation errors:\n${errorDetails.join('\n')}`;
              }
            } else if (error.error.detail) {
              // ProblemDetails detail field
              errorMessage = error.error.detail;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.error) {
              errorMessage = error.error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }

          // Provide context-specific messages based on status code
          if (error.status === 400) {
            // 400 Bad Request - usually means validation or business logic violation
            if (errorMessage === 'Failed to create field type' && errorDetails.length === 0) {
              // Only show generic message if we couldn't extract specific errors
              errorMessage = 'Invalid data provided. Please check all fields and try again.\n\nCheck the console for more details.';
            }
          } else if (error.status === 409) {
            errorMessage = errorMessage || 'A field type with this name already exists.';
          } else if (error.status === 500) {
            errorMessage = errorMessage || 'Server error occurred. Please try again later.';
          } else if (error.status === 0) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }

          // For validation errors, show a more detailed message
          if (errorDetails.length > 0) {
            // Show first error in toast, and log all errors to console
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Validation Failed', 
              detail: errorDetails[0] + (errorDetails.length > 1 ? ` (+${errorDetails.length - 1} more - check console)` : ''),
              life: 10000
            });
            
            // Log all validation errors to console for debugging
            console.error('[saveFieldType] All validation errors:');
            errorDetails.forEach((err, index) => {
              console.error(`  ${index + 1}. ${err}`);
            });
          } else {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Create Failed', 
              detail: errorMessage,
              life: 7000
            });
          }
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
    console.log('[toggleFieldTypeStatus] Called with fieldType:', fieldType);
    
    // Validate field type and ID
    if (!fieldType || !fieldType.id) {
      console.error('[toggleFieldTypeStatus] Invalid field type data:', fieldType);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Invalid field type data' 
      });
      return;
    }

    const newStatus = !fieldType.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    console.log('[toggleFieldTypeStatus] Current status:', fieldType.isActive, 'New status:', newStatus);

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the field type "${fieldType.typeName}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Ensure ID is a number
        const fieldTypeId = Number(fieldType.id);
        if (isNaN(fieldTypeId) || fieldTypeId <= 0) {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'Invalid field type ID' 
          });
          return;
        }

        // Optimistically update UI
        const originalStatus = fieldType.isActive;
        fieldType.isActive = newStatus;
        this.cdr.detectChanges();

        this.fieldTypesService.toggleFieldTypeStatus(fieldTypeId, newStatus).subscribe({
          next: (updatedFieldType) => {
            // Update the field type in the array
            const index = this.fieldTypes.findIndex(ft => ft.id === fieldTypeId);
            if (index !== -1) {
              if (updatedFieldType) {
                this.fieldTypes[index] = { ...this.fieldTypes[index], ...updatedFieldType };
              } else {
                this.fieldTypes[index].isActive = newStatus;
              }
              this.filteredFieldTypes = [...this.fieldTypes];
            }
            
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: `Field type ${action}d successfully` 
            });
            this.cdr.detectChanges();
          },
          error: (error) => {
            // Revert optimistic update on error
            fieldType.isActive = originalStatus;
            this.cdr.detectChanges();

            console.error('Error toggling field type status:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message,
              url: error.url,
              fieldTypeId: fieldTypeId
            });

            let errorMessage = `Failed to ${action} field type`;
            
            // Extract detailed error message
            if (error.error) {
              if (error.error.detail) {
                errorMessage = error.error.detail;
              } else if (error.error.message) {
                errorMessage = error.error.message;
              } else if (error.error.title) {
                errorMessage = error.error.title;
              } else if (typeof error.error === 'string') {
                errorMessage = error.error;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }

            // Provide context-specific messages based on status code
            if (error.status === 400) {
              errorMessage = errorMessage || 'Invalid request. Please check the field type data.';
            } else if (error.status === 404) {
              errorMessage = 'Field type not found. It may have been deleted.';
            } else if (error.status === 500) {
              errorMessage = errorMessage || 'Server error occurred. Please try again later.';
            } else if (error.status === 0) {
              errorMessage = 'Network error. Please check your connection and try again.';
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

  // Check if the selected field type supports options
  supportsOptions(): boolean {
    const typeName = this.fieldTypeForm.get('typeName')?.value;
    if (!typeName) return false;
    
    // Field types that support options: Dropdown, Radio, Checkbox
    const optionsSupportedTypes = ['Dropdown', 'Radio', 'Checkbox'];
    return optionsSupportedTypes.includes(typeName);
  }

  // Handle type name change - reset options if type doesn't support them
  onTypeNameChange(typeName: string | null): void {
    if (!typeName) {
      // Reset options when no type is selected
      this.fieldTypeForm.patchValue({
        hasOptions: false,
        allowMultiple: false
      }, { emitEvent: false });
      return;
    }

    const optionsSupportedTypes = ['Dropdown', 'Radio', 'Checkbox'];
    if (!optionsSupportedTypes.includes(typeName)) {
      // Reset options for types that don't support them
      this.fieldTypeForm.patchValue({
        hasOptions: false,
        allowMultiple: false
      }, { emitEvent: false });
    }
  }
}
