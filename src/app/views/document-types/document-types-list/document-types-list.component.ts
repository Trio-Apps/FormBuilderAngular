import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { DocumentType, CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormBuilderDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { TranslationService } from '../../../core/services/translation.service';

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
    TableModule
  ],
  templateUrl: './document-types-list.component.html',
  styleUrls: ['./document-types-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class DocumentTypesListComponent implements OnInit, OnDestroy {
  // Data Arrays
  documentTypes: DocumentType[] = [];
  filteredDocumentTypes: DocumentType[] = [];
  forms: FormBuilderDto[] = [];

  // Loading States
  loading = {
    documentTypes: false,
    forms: false,
    save: false,
    delete: false
  };

  // Document Type Modal
  showDocumentTypeModal = false;
  editingDocumentType: DocumentType | null = null;

  // Reactive Form
  documentTypeForm: FormGroup;

  // Search Filter
  searchTerm = '';

  constructor(
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the form
    this.documentTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      formBuilderId: [null],
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

    this.loadDocumentTypes();
    this.loadForms();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
    localStorage.setItem('adminLanguagePreference', lang);
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
      }
    });
  }

  loadForms(): void {
    this.loading.forms = true;
    this.formsService.getForms(1, 1000).subscribe({
      next: (paged) => {
        this.forms = paged.items || [];
        this.loading.forms = false;
      },
      error: () => {
        this.forms = [];
        this.loading.forms = false;
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
      type.name.toLowerCase().includes(term) ||
      type.code.toLowerCase().includes(term) ||
      (type.menuCaption && type.menuCaption.toLowerCase().includes(term)) ||
      (type.formBuilderName && type.formBuilderName.toLowerCase().includes(term))
    );
  }

  getActiveDocumentTypesCount(): number {
    return this.documentTypes.filter(t => t.isActive).length;
  }

  getDocumentTypesByFormCount(): number {
    return this.documentTypes.filter(t => t.formBuilderId).length;
  }

  openAddDocumentTypeModal(): void {
    this.editingDocumentType = null;
    this.showDocumentTypeModal = true;

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

  openEditDocumentTypeModal(documentType: DocumentType): void {
    this.editingDocumentType = documentType;
    this.showDocumentTypeModal = true;

    this.documentTypeForm.patchValue({
      name: documentType.name || '',
      code: documentType.code || '',
      formBuilderId: documentType.formBuilderId || null,
      menuCaption: documentType.menuCaption || '',
      menuOrder: documentType.menuOrder || 0,
      parentMenuId: documentType.parentMenuId || null,
      isActive: documentType.isActive !== false
    });
  }

  closeDocumentTypeModal(): void {
    this.showDocumentTypeModal = false;
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
    const documentTypeData = this.documentTypeForm.value;

    if (this.editingDocumentType) {
      // Update existing document type
      const documentTypeId = Number(this.editingDocumentType.id);
      if (isNaN(documentTypeId)) {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid document type ID' });
        return;
      }

      const updateDto: UpdateDocumentTypeDto = {
        name: documentTypeData.name?.trim() || undefined,
        code: documentTypeData.code?.trim() || undefined,
        formBuilderId: documentTypeData.formBuilderId || undefined,
        menuCaption: documentTypeData.menuCaption?.trim() || undefined,
        menuOrder: documentTypeData.menuOrder || undefined,
        parentMenuId: documentTypeData.parentMenuId || undefined,
        isActive: documentTypeData.isActive !== false
      };

      this.documentTypesService.updateDocumentType(documentTypeId, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadDocumentTypes();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type updated successfully' });
          this.closeDocumentTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          console.error('Error updating document type:', error);
          const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update document type';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    } else {
      // Create new document type
      const createDto: CreateDocumentTypeDto = {
        name: documentTypeData.name.trim(),
        code: documentTypeData.code.trim(),
        formBuilderId: documentTypeData.formBuilderId || undefined,
        menuCaption: documentTypeData.menuCaption.trim(),
        menuOrder: documentTypeData.menuOrder || 0,
        parentMenuId: documentTypeData.parentMenuId || undefined,
        isActive: documentTypeData.isActive !== false
      };

      this.documentTypesService.createDocumentType(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadDocumentTypes();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type created successfully' });
          this.closeDocumentTypeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          console.error('Error creating document type:', error);
          const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create document type';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    }
  }

  deleteDocumentType(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this document type?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.documentTypesService.deleteDocumentType(id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.loadDocumentTypes();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document type deleted successfully' });
          },
          error: (error) => {
            this.loading.delete = false;
            console.error('Error deleting document type:', error);
            const errorMessage = error?.error?.message || error?.message || 'Failed to delete document type';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
          }
        });
      }
    });
  }

  toggleDocumentTypeStatus(documentType: DocumentType): void {
    const newStatus = !documentType.isActive;
    this.documentTypesService.toggleDocumentTypeStatus(documentType.id, newStatus).subscribe({
      next: () => {
        this.loadDocumentTypes();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Document type ${newStatus ? 'activated' : 'deactivated'} successfully`
        });
      },
      error: (error) => {
        console.error('Error toggling document type status:', error);
        const errorMessage = error?.error?.message || error?.message || 'Failed to update document type status';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
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

  getFormName(formBuilderId?: number): string {
    if (!formBuilderId) return '-';
    const form = this.forms.find(f => f.id === formBuilderId);
    return form?.formName || '-';
  }
}

