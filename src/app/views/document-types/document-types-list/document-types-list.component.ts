import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { DocumentType, CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormBuilderDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslationService } from '../../../core/services/translation.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-document-types-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    TableModule,
    PaginatorModule
  ],
  templateUrl: './document-types-list.component.html',
  styleUrls: ['./document-types-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class DocumentTypesListComponent implements OnInit, OnDestroy {
  // Data Arrays
  documentTypes: DocumentType[] = [];
  filteredDocumentTypes: DocumentType[] = [];
  formBuilderId!: number; // Form ID from route parameter
  currentForm: FormBuilderDto | null = null;

  // Loading States
  loading = {
    documentTypes: false,
    save: false,
    delete: false,
    forms: false
  };

  // Document Type Modal
  showModal = false;
  documentTypeForm!: FormGroup;
  editingDocumentType: DocumentType | null = null;

  // Parent Menu Options
  parentMenuOptions: DocumentType[] = [];
  loadingParentOptions = false;

  // Search Filter
  searchTerm = '';

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private route: ActivatedRoute,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the form (formBuilderId will be set from route parameter)
    this.documentTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      menuCaption: ['', [Validators.required, Validators.maxLength(200)]],
      menuOrder: [0, [Validators.min(0)]],
      parentMenuId: [null],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }
    
    // Get formId from route parameter
    this.route.params.subscribe(params => {
      const formId = +params['formId'];
      if (formId) {
        this.formBuilderId = formId;
        this.loadForm();
        this.loadDocumentTypes();
      } else {
        // If no formId in route, show error or load all
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Form ID is required' 
        });
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadForm(): void {
    if (!this.formBuilderId) return;
    
    this.loading.forms = true;
    this.formsService.getFormById(this.formBuilderId).subscribe({
      next: (form) => {
        this.currentForm = form;
        this.loading.forms = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentForm = null;
        this.loading.forms = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentTypes(): void {
    if (!this.formBuilderId) return;
    
    this.loading.documentTypes = true;
    // Load document types filtered by formBuilderId
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        // Filter document types by formBuilderId
        this.documentTypes = types.filter(t => t.formBuilderId === this.formBuilderId);
        this.filteredDocumentTypes = [...this.documentTypes];
        this.totalRecords = this.filteredDocumentTypes.length;
        this.loading.documentTypes = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading document types:', error);
        this.documentTypes = [];
        this.filteredDocumentTypes = [];
        this.loading.documentTypes = false;
        
        let errorMessage = 'Failed to load document types';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        if (error?.status === 400) {
          errorMessage = 'Bad request. Please check the API endpoint configuration.';
        } else if (error?.status === 404) {
          errorMessage = 'Document types endpoint not found.';
        } else if (error?.status === 0) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
        }
        
        this.messageService.add({ 
          severity: 'error', 
          summary: `Error (${error?.status || 'Unknown'})`, 
          detail: errorMessage,
          life: 8000
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterDocumentTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentTypes = [...this.documentTypes];
      this.totalRecords = this.filteredDocumentTypes.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDocumentTypes = this.documentTypes.filter(type =>
      type.name?.toLowerCase().includes(term) ||
      type.code?.toLowerCase().includes(term) ||
      type.menuCaption?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredDocumentTypes.length;
  }

  getFormName(): string {
    return this.currentForm ? (this.currentForm.formName || this.currentForm.formCode || `Form #${this.formBuilderId}`) : (this.formBuilderId ? `Form #${this.formBuilderId}` : '-');
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  getPaginatedDocumentTypes(): DocumentType[] {
    return this.filteredDocumentTypes.slice(this.first, this.first + this.rows);
  }

  getParentMenuName(parentMenuId?: number): string {
    if (!parentMenuId) return '-';
    const parent = this.documentTypes.find(t => t.id === parentMenuId);
    return parent ? (parent.name || `Document Type #${parentMenuId}`) : `Document Type #${parentMenuId}`;
  }

  getActiveDocumentTypesCount(): number {
    return this.documentTypes.filter(t => t.isActive).length;
  }

  openAddModal(): void {
    this.editingDocumentType = null;
    this.showModal = true;
    this.loadParentMenuOptions();
    
    this.documentTypeForm.reset({
      name: '',
      code: '',
      formBuilderId: null,
      menuCaption: '',
      menuOrder: 0,
      parentMenuId: null,
      isActive: true
    });
  }

  openEditModal(documentType: DocumentType): void {
    this.editingDocumentType = documentType;
    this.showModal = true;
    this.loadParentMenuOptions();
    
    this.documentTypeForm.patchValue({
      name: documentType.name || '',
      code: documentType.code || '',
      menuCaption: documentType.menuCaption || '',
      menuOrder: documentType.menuOrder || 0,
      parentMenuId: documentType.parentMenuId || null,
      isActive: documentType.isActive !== false
    });
  }

  loadParentMenuOptions(): void {
    this.loadingParentOptions = true;
    this.documentTypesService.getActiveDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        // Filter out the current document type to prevent circular reference when editing
        if (this.editingDocumentType && this.editingDocumentType.id) {
          this.parentMenuOptions = types.filter(t => t.id !== this.editingDocumentType!.id);
        } else {
          this.parentMenuOptions = types;
        }
        this.loadingParentOptions = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading parent menu options:', error);
        this.parentMenuOptions = [];
        this.loadingParentOptions = false;
        this.cdr.detectChanges();
      }
    });
  }

  getParentMenuDisplayName(docType: DocumentType): string {
    if (!docType) return '';
    const name = docType.name || '';
    const caption = docType.menuCaption || '';
    if (caption && caption !== name) {
      return `${name} (${caption})`;
    }
    return name;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingDocumentType = null;
    this.documentTypeForm.reset();
  }

  saveDocumentType(): void {
    if (this.documentTypeForm.invalid) {
      this.markFormGroupTouched(this.documentTypeForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const formData = this.documentTypeForm.value;

    if (!formData.name || !formData.name.trim()) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Document name is required' });
      return;
    }

    if (!formData.code || !formData.code.trim()) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Document code is required' });
      return;
    }

    if (!formData.menuCaption || !formData.menuCaption.trim()) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Menu caption is required' });
      return;
    }

    if (!this.formBuilderId) {
      this.loading.save = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Form ID is required' });
      return;
    }

    if (this.editingDocumentType && this.editingDocumentType.id) {
      // Handle select value: ngValue returns actual null or number
      const parentMenuIdValue = formData.parentMenuId;
      const newParentMenuId = (parentMenuIdValue !== null && parentMenuIdValue !== undefined)
        ? Number(parentMenuIdValue) 
        : undefined;
      
      const currentParentMenuId = this.editingDocumentType.parentMenuId || undefined;
      
      // Check if parentMenuId is being changed and if this document type has children
      if (newParentMenuId !== currentParentMenuId) {
        // Check if this document type has children that would be affected
        this.documentTypesService.hasChildDocumentTypes(this.editingDocumentType.id).subscribe({
          next: (hasChildren: boolean) => {
            if (hasChildren) {
              this.loading.save = false;
              this.messageService.add({
                severity: 'warn',
                summary: 'Cannot Update Parent Menu',
                detail: 'This document type is used as a parent menu for other document types. You cannot change its parent menu relationship.',
                life: 8000
              });
              return;
            }
            
            // Proceed with update
            this.performUpdate(formData, newParentMenuId);
          },
          error: (error: any) => {
            console.error('Error checking for child document types:', error);
            // If check fails, proceed with update but handle errors
            this.performUpdate(formData, newParentMenuId);
          }
        });
      } else {
        // No change to parentMenuId, proceed with update
        this.performUpdate(formData, newParentMenuId);
      }
    } else {
      // Creating new document type
      if (!this.formBuilderId) {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Form ID is required' });
        return;
      }

      const createDto: CreateDocumentTypeDto = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        formBuilderId: this.formBuilderId,
        menuCaption: formData.menuCaption.trim(),
        menuOrder: formData.menuOrder !== null && formData.menuOrder !== undefined ? Number(formData.menuOrder) : 0
      };
      
      console.log('[DocumentTypesList] Creating document type with DTO:', createDto);

      // Only add parentMenuId if it has a valid value
      const parentMenuIdValue = formData.parentMenuId;
      if (parentMenuIdValue !== null && parentMenuIdValue !== undefined) {
        const parentId = Number(parentMenuIdValue);
        if (!isNaN(parentId) && parentId > 0) {
          createDto.parentMenuId = parentId;
        }
      }

      // Set isActive (default to true if not specified)
      createDto.isActive = formData.isActive !== false;

      this.documentTypesService.createDocumentType(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type created successfully' });
          this.closeModal();
          this.loadDocumentTypes();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating document type:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create document type';
          
          if (error?.error?.detail) {
            errorMessage = error.error.detail;
          } else if (error?.error?.errors) {
            const errors = error.error.errors;
            if (typeof errors === 'object') {
              const errorArray: string[] = [];
              for (const key in errors) {
                if (errors.hasOwnProperty(key)) {
                  const propErrors = errors[key];
                  if (Array.isArray(propErrors)) {
                    errorArray.push(`${key}: ${propErrors.join(', ')}`);
                  } else {
                    errorArray.push(`${key}: ${propErrors}`);
                  }
                }
              }
              errorMessage = errorArray.length > 0 ? errorArray.join('; ') : 'Validation error';
            }
          }
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage,
            life: 8000
          });
        }
      });
    }
  }

  private performUpdate(formData: any, parentMenuId?: number): void {
    if (!this.editingDocumentType) return;

    // Handle parentMenuId: if undefined (no parent selected), set to null explicitly to remove parent relationship
    const updateParentMenuId = parentMenuId !== undefined ? parentMenuId : null;

    const updateDto: UpdateDocumentTypeDto = {
      name: formData.name?.trim() || undefined,
      code: formData.code?.trim() || undefined,
      formBuilderId: formData.formBuilderId ? Number(formData.formBuilderId) : undefined,
      menuCaption: formData.menuCaption?.trim() || undefined,
      menuOrder: formData.menuOrder !== null && formData.menuOrder !== undefined ? Number(formData.menuOrder) : undefined,
      parentMenuId: updateParentMenuId,
      isActive: formData.isActive !== false
    };

    this.documentTypesService.updateDocumentType(this.editingDocumentType.id, updateDto).subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type updated successfully' });
        this.closeModal();
        this.loadDocumentTypes();
      },
      error: (error: any) => {
        this.loading.save = false;
        console.error('Error updating document type:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update document type';
        
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('foreign key') || errorText.includes('constraint') || errorText.includes('parentmenuid')) {
          errorMessage = 'Cannot update this document type because it is used as a parent menu for other document types.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 8000
        });
      }
    });
  }

  deleteDocumentType(documentType: DocumentType): void {
    if (!documentType || !documentType.id) return;

    this.loading.delete = true;
    this.documentTypesService.hasChildDocumentTypes(documentType.id).subscribe({
      next: (hasChildren: boolean) => {
        this.loading.delete = false;
        
        if (hasChildren) {
          // Get child document types to show count
          this.documentTypesService.getDocumentTypesByParentMenuId(documentType.id).subscribe({
            next: (children: DocumentType[]) => {
              const childrenCount = children.length;
              
              this.confirmationService.confirm({
                message: `This document type is used as a parent menu for ${childrenCount} other document type(s). The parent relationship will be automatically removed from all child document types before deletion. Do you want to proceed?`,
                header: 'Delete Document Type with Children',
                icon: 'pi pi-exclamation-triangle',
                acceptButtonStyleClass: 'p-button-danger',
                rejectButtonStyleClass: 'p-button-secondary',
                accept: () => {
                  this.performDeletion(documentType.id!);
                }
              });
            },
            error: () => {
              this.confirmAndDelete(documentType);
            }
          });
          return;
        }

        // No children, proceed with normal deletion
        this.confirmAndDelete(documentType);
      },
      error: () => {
        this.loading.delete = false;
        this.confirmAndDelete(documentType);
      }
    });
  }

  private confirmAndDelete(documentType: DocumentType): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the document type "${documentType.name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.performDeletion(documentType.id!);
      }
    });
  }

  private performDeletion(id: number): void {
    this.loading.delete = true;
    this.documentTypesService.deleteDocumentType(id).subscribe({
      next: () => {
        this.loading.delete = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Document type deleted successfully' 
        });
        this.loadDocumentTypes();
      },
      error: (error: any) => {
        this.loading.delete = false;
        console.error('Error deleting document type:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete document type';
        
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('foreign key') || errorText.includes('constraint')) {
          errorMessage = 'Cannot delete this document type. It may have associated records.';
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.documentTypeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.documentTypeForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength']) return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}

