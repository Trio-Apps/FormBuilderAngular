import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttachmentTypesService } from '../../FormBuilder/services/attachment-types.service';
import { AttachmentType, CreateAttachmentTypeDto, UpdateAttachmentTypeDto } from '../../FormBuilder/form-builder/models/attachment-types.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-attachment-types-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    DialogModule
  ],
  templateUrl: './attachment-types-list.component.html',
  styleUrls: ['./attachment-types-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class AttachmentTypesListComponent implements OnInit, OnDestroy {
  // Data Arrays
  attachmentTypes: AttachmentType[] = [];
  filteredAttachmentTypes: AttachmentType[] = [];

  // Loading States
  loading = {
    attachmentTypes: false,
    save: false,
    delete: false
  };

  // Attachment Type Modal
  showAttachmentTypeModal = false;
  editingAttachmentType: AttachmentType | null = null;

  // Reactive Form
  attachmentTypeForm: FormGroup;

  // Search Filter
  searchTerm = '';

  constructor(
    private attachmentTypesService: AttachmentTypesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the form
    this.attachmentTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      maxSizeMB: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadAttachmentTypes();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadAttachmentTypes(): void {
    this.loading.attachmentTypes = true;
    this.attachmentTypesService.getAllAttachmentTypes().subscribe({
      next: (types: AttachmentType[]) => {
        this.attachmentTypes = types;
        this.filteredAttachmentTypes = [...types];
        this.loading.attachmentTypes = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.attachmentTypes = [];
        this.filteredAttachmentTypes = [];
        this.loading.attachmentTypes = false;
        console.error('Error loading attachment types:', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to load attachment types',
          life: 5000
        });
      }
    });
  }

  filterAttachmentTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAttachmentTypes = [...this.attachmentTypes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredAttachmentTypes = this.attachmentTypes.filter(type =>
      type.name.toLowerCase().includes(term) ||
      type.code.toLowerCase().includes(term) ||
      (type.description && type.description.toLowerCase().includes(term))
    );
  }

  getActiveAttachmentTypesCount(): number {
    return this.attachmentTypes.filter(t => t.isActive).length;
  }

  openAddAttachmentTypeModal(): void {
    this.editingAttachmentType = null;
    this.showAttachmentTypeModal = true;

    this.attachmentTypeForm.reset({
      name: '',
      code: '',
      description: '',
      maxSizeMB: 10,
      isActive: true
    });
  }

  openEditAttachmentTypeModal(attachmentType: AttachmentType): void {
    this.editingAttachmentType = attachmentType;
    this.showAttachmentTypeModal = true;

    this.attachmentTypeForm.patchValue({
      name: attachmentType.name || '',
      code: attachmentType.code || '',
      description: attachmentType.description || '',
      maxSizeMB: attachmentType.maxSizeMB || 10,
      isActive: attachmentType.isActive !== false
    });
  }

  closeAttachmentTypeModal(): void {
    this.showAttachmentTypeModal = false;
    this.editingAttachmentType = null;
    this.attachmentTypeForm.reset({
      maxSizeMB: 10,
      isActive: true
    });
  }

  saveAttachmentType(): void {
    if (this.attachmentTypeForm.invalid) {
      this.markFormGroupTouched(this.attachmentTypeForm);
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please fill all required fields correctly' 
      });
      return;
    }

    this.loading.save = true;
    const attachmentTypeData = this.attachmentTypeForm.value;

    if (this.editingAttachmentType) {
      // Update existing attachment type
      const attachmentTypeId = Number(this.editingAttachmentType.id);
      if (isNaN(attachmentTypeId)) {
        this.loading.save = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Invalid attachment type ID' 
        });
        return;
      }

      const updateDto: UpdateAttachmentTypeDto = {
        name: attachmentTypeData.name?.trim(),
        code: attachmentTypeData.code?.trim(),
        description: attachmentTypeData.description?.trim() || undefined,
        maxSizeMB: attachmentTypeData.maxSizeMB ? Number(attachmentTypeData.maxSizeMB) : undefined,
        isActive: attachmentTypeData.isActive !== false
      };

      this.attachmentTypesService.updateAttachmentType(attachmentTypeId, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadAttachmentTypes();
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Attachment type updated successfully' 
          });
          this.closeAttachmentTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          console.error('Error updating attachment type:', error);
          
          let errorMessage = 'Failed to update attachment type';
          if (error?.error) {
            if (error.error.detail) {
              errorMessage = error.error.detail;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errorMessage) {
              errorMessage = error.error.errorMessage;
            } else if (error.error.errors) {
              const validationErrors = Object.values(error.error.errors).flat() as string[];
              errorMessage = `Validation errors: ${validationErrors.join(', ')}`;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          } else if (error?.message) {
            errorMessage = error.message;
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
      // Create new attachment type
      const createDto: CreateAttachmentTypeDto = {
        name: attachmentTypeData.name.trim(),
        code: attachmentTypeData.code.trim(),
        description: attachmentTypeData.description?.trim() || undefined,
        maxSizeMB: attachmentTypeData.maxSizeMB ? Number(attachmentTypeData.maxSizeMB) : 10,
        isActive: attachmentTypeData.isActive !== false
      };

      this.attachmentTypesService.createAttachmentType(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadAttachmentTypes();
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Attachment type created successfully' 
          });
          this.closeAttachmentTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          console.error('Error creating attachment type:', error);
          
          let errorMessage = 'Failed to create attachment type';
          if (error?.error) {
            if (error.error.detail) {
              errorMessage = error.error.detail;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errorMessage) {
              errorMessage = error.error.errorMessage;
            } else if (error.error.errors) {
              const validationErrors = Object.values(error.error.errors).flat() as string[];
              errorMessage = `Validation errors: ${validationErrors.join(', ')}`;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Create Failed', 
            detail: errorMessage,
            life: 7000
          });
        }
      });
    }
  }

  deleteAttachmentType(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this attachment type?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.attachmentTypesService.deleteAttachmentType(id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.loadAttachmentTypes();
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Attachment type deleted successfully' 
            });
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.loading.delete = false;
            console.error('Error deleting attachment type:', error);
            
            let errorMessage = 'Failed to delete attachment type';
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

  toggleAttachmentTypeStatus(attachmentType: AttachmentType): void {
    const newStatus = !attachmentType.isActive;
    this.attachmentTypesService.toggleAttachmentTypeStatus(attachmentType.id, newStatus).subscribe({
      next: () => {
        this.loadAttachmentTypes();
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: `Attachment type ${newStatus ? 'activated' : 'deactivated'} successfully` 
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error toggling attachment type status:', error);
        let errorMessage = 'Failed to toggle attachment type status';
        if (error?.error?.message) {
          errorMessage = error.error.message;
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

  // Helper method to mark all form fields as touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods for form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.attachmentTypeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.attachmentTypeForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return 'This field is required';
      }
      if (field.errors['minlength']) {
        return `Minimum length is ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `Maximum length is ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return `Minimum value is ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `Maximum value is ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  get editing(): boolean {
    return !!this.editingAttachmentType;
  }
}

