import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentTypesService } from '../../../FormBuilder/services/document-types.service';
import { FormsService } from '../../../FormBuilder/services/forms.service';
import { DocumentSettingsService } from '../../../FormBuilder/services/document-settings.service';
import { DocumentType, CreateDocumentTypeDto, UpdateDocumentTypeDto, DocumentSeries, CreateDocumentSeriesDto, UpdateDocumentSeriesDto } from '../../../FormBuilder/form-builder/models/document-types.model';
import { FormBuilderDto } from '../../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Project } from '../../../FormBuilder/form-builder/models/document-settings.model';
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
import { TranslationService } from '../../../../core/services/translation.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-document-type',
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
    TableModule
  ],
  templateUrl: './document-type.component.html',
  styleUrls: ['./document-type.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class DocumentTypeComponent implements OnInit, OnDestroy {
  // Data Arrays
  documentTypes: DocumentType[] = [];
  filteredDocumentTypes: DocumentType[] = [];
  form: FormBuilderDto | null = null; // Single form for the detailed view (kept for route params)
  documentType: DocumentType | null = null; // Single document type for detailed view
  currentFormId: number | null = null; // Current form ID from route

  // Loading States
  loading = {
    documentTypes: false,
    save: false,
    delete: false
  };
  loadingState = false; // Overall loading state for the page

  // Document Type Modal
  showModal = false;
  documentTypeForm!: FormGroup;
  editingDocumentType: DocumentType | null = null;

  // Document Series Modal
  showSeriesModal = false;
  seriesForm!: FormGroup;
  editingSeries: DocumentSeries | null = null;
  documentSeries: DocumentSeries[] = [];
  loadingSeries = false;
  projects: Project[] = [];
  loadingProjects = false;
  saving = false;

  // Parent Menu Options
  parentMenuOptions: DocumentType[] = [];
  loadingParentOptions = false;

  // Search Filter
  searchTerm = '';

  constructor(
    private route: ActivatedRoute,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private documentSettingsService: DocumentSettingsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the document type form
    this.documentTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      menuCaption: ['', [Validators.required, Validators.maxLength(200)]],
      menuOrder: [0, [Validators.min(0)]],
      parentMenuId: [null],
      isActive: [true]
    });

    // Initialize the series form
    this.seriesForm = this.fb.group({
      projectId: [null, [Validators.required]],
      seriesCode: ['', [Validators.required]],
      nextNumber: [1, [Validators.required, Validators.min(1)]],
      isDefault: [false],
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
      this.currentFormId = formId || null;
      if (formId) {
        this.loadFormAndDocumentType(formId);
      } else {
        this.loadDocumentTypes();
      }
    });
  }

  loadFormAndDocumentType(formId: number): void {
    this.loadingState = true;
    
    // Load form
    this.formsService.getFormById(formId).subscribe({
      next: (form) => {
        this.form = form;
        // Load document type for this form
        this.loadDocumentTypeByFormId(formId);
      },
      error: () => {
        this.form = null;
        this.loadingState = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentTypeByFormId(formId: number): void {
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        // Find document type for this form
        this.documentType = types.find(t => t.formBuilderId === formId) || null;
        this.loadingState = false;
        
        // Load document series if document type exists
        if (this.documentType && this.documentType.id) {
          this.loadDocumentSeries();
        }
        
        // Load projects
        this.loadProjects();
        
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentType = null;
        this.loadingState = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentType(): void {
    if (this.form?.id) {
      this.loadingState = true;
      this.loadDocumentTypeByFormId(this.form.id);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }


  loadDocumentTypes(): void {
    this.loading.documentTypes = true;
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentTypes = types;
        this.filteredDocumentTypes = [...types];
        this.loading.documentTypes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentTypes = [];
        this.filteredDocumentTypes = [];
        this.loading.documentTypes = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load document types' });
        this.cdr.detectChanges();
      }
    });
  }

  filterDocumentTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDocumentTypes = [...this.documentTypes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDocumentTypes = this.documentTypes.filter(type =>
      type.name?.toLowerCase().includes(term) ||
      type.code?.toLowerCase().includes(term) ||
      type.menuCaption?.toLowerCase().includes(term)
    );
  }

  getParentMenuName(parentMenuId?: number): string {
    if (!parentMenuId) return '-';
    const parent = this.documentTypes.find(t => t.id === parentMenuId);
    return parent ? (parent.name || `Document Type #${parentMenuId}`) : `Document Type #${parentMenuId}`;
  }

  getActiveDocumentTypesCount(): number {
    return this.documentTypes.filter(t => t.isActive).length;
  }

  openModal(): void {
    if (this.documentType) {
      this.openEditModal(this.documentType);
    } else {
      this.openAddModal();
    }
  }

  openAddModal(): void {
    this.editingDocumentType = null;
    this.showModal = true;
    
    this.documentTypeForm.reset({
      name: '',
      code: '',
      menuCaption: '',
      menuOrder: 0,
      parentMenuId: null,
      isActive: true
    });
    
    this.loadParentMenuOptions();
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
    const parentMenuIdControl = this.documentTypeForm.get('parentMenuId');
    parentMenuIdControl?.disable();
    
    this.documentTypesService.getActiveDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        // Filter out the current document type to prevent circular reference when editing
        if (this.editingDocumentType && this.editingDocumentType.id) {
          this.parentMenuOptions = types.filter(t => t.id !== this.editingDocumentType!.id);
        } else {
          this.parentMenuOptions = types;
        }
        this.loadingParentOptions = false;
        parentMenuIdControl?.enable();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading parent menu options:', error);
        this.parentMenuOptions = [];
        this.loadingParentOptions = false;
        parentMenuIdControl?.enable();
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
      // Get formBuilderId from route parameter
      if (!this.currentFormId) {
        this.loading.save = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Validation Error', 
          detail: 'Form ID is required. Please access this page from a form context.' 
        });
        return;
      }

      const createDto: CreateDocumentTypeDto = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        formBuilderId: this.currentFormId,
        menuCaption: formData.menuCaption.trim(),
        menuOrder: formData.menuOrder !== null && formData.menuOrder !== undefined ? Number(formData.menuOrder) : 0
      };

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
      formBuilderId: this.currentFormId || this.editingDocumentType.formBuilderId || undefined, // Keep formBuilderId from route or existing value
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

  isSeriesFieldInvalid(fieldName: string): boolean {
    const field = this.seriesForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getSeriesFieldErrorMessage(fieldName: string): string {
    const field = this.seriesForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength']) return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
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

  // Document Series Methods
  loadDocumentSeries(): void {
    if (!this.documentType || !this.documentType.id) {
      this.documentSeries = [];
      return;
    }
    
    this.loadingSeries = true;
    this.documentTypesService.getDocumentSeriesByDocumentTypeId(this.documentType.id).subscribe({
      next: (series: DocumentSeries[]) => {
        this.documentSeries = series || [];
        this.loadingSeries = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading document series:', error);
        this.documentSeries = [];
        this.loadingSeries = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to load document series' 
        });
        this.cdr.detectChanges();
      }
    });
  }

  openSeriesModal(editing: boolean = false, series?: DocumentSeries): void {
    this.editingSeries = editing && series ? series : null;
    this.showSeriesModal = true;
    
    const projectIdControl = this.seriesForm.get('projectId');
    projectIdControl?.disable();
    
    this.loadProjects();
    
    if (editing && series) {
      this.seriesForm.patchValue({
        projectId: series.projectId || null,
        seriesCode: series.seriesCode || '',
        nextNumber: series.nextNumber || 1,
        isDefault: series.isDefault || false,
        isActive: series.isActive !== false
      });
    } else {
      this.seriesForm.reset({
        projectId: null,
        seriesCode: '',
        nextNumber: 1,
        isDefault: false,
        isActive: true
      });
    }
  }

  loadProjects(): void {
    // Always reload projects to ensure we have the latest data
    this.loadingProjects = true;
    const projectIdControl = this.seriesForm.get('projectId');
    projectIdControl?.disable();
    
    this.documentSettingsService.getActiveProjects().subscribe({
      next: (projects: Project[]) => {
        this.projects = projects || [];
        this.loadingProjects = false;
        console.log('[DocumentTypeComponent] Loaded projects:', this.projects.length, this.projects);
        
        // Enable projectId control after loading
        projectIdControl?.enable();
        
        if (this.projects.length === 0) {
          this.messageService.add({ 
            severity: 'warn', 
            summary: 'No Projects', 
            detail: 'No active projects found. Please create a project first before creating a document series.',
            life: 5000
          });
        }
        
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('[DocumentTypeComponent] Error loading projects:', error);
        this.projects = [];
        this.loadingProjects = false;
        projectIdControl?.enable();
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to load projects. Please refresh the page or check your connection.',
          life: 5000
        });
        this.cdr.detectChanges();
      }
    });
  }

  closeSeriesModal(): void {
    this.showSeriesModal = false;
    this.editingSeries = null;
    this.seriesForm.reset();
  }

  saveDocumentSeries(): void {
    if (this.seriesForm.invalid) {
      this.markFormGroupTouched(this.seriesForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    if (!this.documentType || !this.documentType.id) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Document type is required' });
      return;
    }

    this.saving = true;
    const formData = this.seriesForm.value;

    // Check if project is selected (required by API)
    if (!formData.projectId) {
      this.saving = false;
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please select a project. Project selection is required.' 
      });
      return;
    }

    const createDto: CreateDocumentSeriesDto = {
      documentTypeId: this.documentType.id,
      projectId: Number(formData.projectId),
      seriesCode: formData.seriesCode.trim(),
      nextNumber: Number(formData.nextNumber) || 1,
      isDefault: formData.isDefault || false,
      isActive: formData.isActive !== false
    };

    if (this.editingSeries && this.editingSeries.id) {
      // Update existing series
      const updateDto: UpdateDocumentSeriesDto = {
        projectId: formData.projectId ? Number(formData.projectId) : undefined,
        seriesCode: formData.seriesCode.trim(),
        nextNumber: Number(formData.nextNumber) || 1,
        isDefault: formData.isDefault || false,
        isActive: formData.isActive !== false
      };

      this.documentTypesService.updateDocumentSeries(this.editingSeries.id, updateDto).subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document series updated successfully' });
          this.closeSeriesModal();
          this.loadDocumentSeries();
        },
        error: (error: any) => {
          this.saving = false;
          console.error('Error updating document series:', error);
          
          // Extract error message from various possible locations
          let errorMessage = 'Failed to update document series';
          
          // If error is an Error object (thrown by service)
          if (error instanceof Error) {
            errorMessage = error.message;
          } 
          // If error is HttpErrorResponse
          else if (error?.error) {
            // Check for ASP.NET Core ProblemDetails format
            if (error.error.detail) {
              errorMessage = error.error.detail;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.errors && typeof error.error.errors === 'object') {
              // Validation errors format: { "fieldName": ["error1", "error2"] }
              const errors: { [key: string]: string[] } = error.error.errors;
              const errorDetails: string[] = [];
              for (const [field, messages] of Object.entries(errors)) {
                if (Array.isArray(messages)) {
                  messages.forEach(msg => errorDetails.push(msg));
                } else {
                  errorDetails.push(String(messages));
                }
              }
              if (errorDetails.length > 0) {
                errorMessage = errorDetails.join(', ');
              }
            }
          } 
          // Fallback to error.message
          else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error Updating Document Series', 
            detail: errorMessage,
            life: 10000
          });
        }
      });
    } else {
      // Create new series
      this.documentTypesService.createDocumentSeries(createDto).subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document series created successfully' });
          this.closeSeriesModal();
          this.loadDocumentSeries();
        },
        error: (error: any) => {
          this.saving = false;
          console.error('Error creating document series:', error);
          
          // Extract error message from various possible locations
          let errorMessage = 'Failed to create document series';
          
          // If error is an Error object (thrown by service)
          if (error instanceof Error) {
            errorMessage = error.message;
          } 
          // If error is HttpErrorResponse
          else if (error?.error) {
            // Check for ASP.NET Core ProblemDetails format
            if (error.error.detail) {
              errorMessage = error.error.detail;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.errors && typeof error.error.errors === 'object') {
              // Validation errors format: { "fieldName": ["error1", "error2"] }
              const errors: { [key: string]: string[] } = error.error.errors;
              const errorDetails: string[] = [];
              for (const [field, messages] of Object.entries(errors)) {
                if (Array.isArray(messages)) {
                  messages.forEach(msg => errorDetails.push(msg));
                } else {
                  errorDetails.push(String(messages));
                }
              }
              if (errorDetails.length > 0) {
                errorMessage = errorDetails.join(', ');
              }
            }
          } 
          // Fallback to error.message
          else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error Creating Document Series', 
            detail: errorMessage,
            life: 10000
          });
        }
      });
    }
  }

  toggleSeriesStatus(series: DocumentSeries): void {
    if (!series || !series.id) return;
    
    const newStatus = !series.isActive;
    this.documentTypesService.toggleDocumentSeriesStatus(series.id, newStatus).subscribe({
      next: () => {
        series.isActive = newStatus;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: `Series ${newStatus ? 'activated' : 'deactivated'} successfully` 
        });
        this.loadDocumentSeries(); // Reload to get updated data
      },
      error: (error: any) => {
        console.error('Error toggling series status:', error);
        
        // Extract error message from various possible locations
        let errorMessage = 'Failed to toggle series status';
        
        // If error is an Error object (thrown by service)
        if (error instanceof Error) {
          errorMessage = error.message;
        } 
        // If error is HttpErrorResponse
        else if (error?.error) {
          if (error.error.detail) {
            errorMessage = error.error.detail;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.title) {
            errorMessage = error.error.title;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        } 
        // Fallback to error.message
        else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error Toggling Series Status', 
          detail: errorMessage,
          life: 10000
        });
      }
    });
  }

  deleteDocumentSeries(series: DocumentSeries): void {
    if (!series || !series.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the series "${series.seriesCode}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.documentTypesService.deleteDocumentSeries(series.id!).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Document series deleted successfully' 
            });
            this.loadDocumentSeries(); // Reload to refresh the list
          },
          error: (error: any) => {
            console.error('Error deleting document series:', error);
            
            // Extract error message from various possible locations
            let errorMessage = 'Failed to delete document series';
            
            // If error is an Error object (thrown by service)
            if (error instanceof Error) {
              errorMessage = error.message;
            } 
            // If error is HttpErrorResponse
            else if (error?.error) {
              if (error.error.detail) {
                errorMessage = error.error.detail;
              } else if (error.error.message) {
                errorMessage = error.error.message;
              } else if (error.error.title) {
                errorMessage = error.error.title;
              } else if (typeof error.error === 'string') {
                errorMessage = error.error;
              }
            } 
            // Fallback to error.message
            else if (error?.message) {
              errorMessage = error.message;
            }
            
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error Deleting Document Series', 
              detail: errorMessage,
              life: 10000
            });
          }
        });
      }
    });
  }

  get editing(): boolean {
    return !!this.editingDocumentType;
  }
}