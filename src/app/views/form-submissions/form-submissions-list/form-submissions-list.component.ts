import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSubmissionsService, FormSubmissionDto, FormSubmissionDetailDto, CreateFormSubmissionDto, UpdateFormSubmissionDto } from '../services/form-submissions.service';
import { FormSubmissionValuesService, FormSubmissionValueDto, CreateFormSubmissionValueDto, UpdateFormSubmissionValueDto, BulkFormSubmissionValuesDto } from '../services/form-submission-values.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType, DocumentSeries } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { FormBuilderDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-form-submissions-list',
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
    ButtonModule,
    TableModule,
    PaginatorModule,
    CheckboxModule
  ],
  templateUrl: './form-submissions-list.component.html',
  styleUrls: ['./form-submissions-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FormSubmissionsListComponent implements OnInit, OnDestroy {
  documentTypeId!: number;
  documentType: DocumentType | null = null;
  submissions: FormSubmissionDto[] = [];
  filteredSubmissions: FormSubmissionDto[] = [];
  selectedSubmission: FormSubmissionDetailDto | null = null;

  // For creating new submission
  forms: FormBuilderDto[] = [];
  documentSeries: DocumentSeries[] = [];
  showAddSubmissionModal = false;
  addSubmissionForm!: FormGroup;

  // Loading States
  loading = {
    documentType: false,
    submissions: false,
    save: false,
    delete: false,
    fieldValues: false,
    saveFieldValue: false,
    deleteFieldValue: false,
    create: false,
    forms: false,
    series: false
  };

  // Modals
  showSubmissionModal = false;
  showFieldValueModal = false;
  submissionForm!: FormGroup;
  fieldValueForm!: FormGroup;
  editingFieldValue: FormSubmissionValueDto | null = null;

  // Search & Filter
  searchTerm = '';
  statusFilter: string | null = null;
  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Draft', value: 'Draft' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Pending Approval', value: 'Pending Approval' }
  ];

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formSubmissionsService: FormSubmissionsService,
    private formSubmissionValuesService: FormSubmissionValuesService,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService,
    private authService: AuthService
  ) {
    // Initialize forms
    this.submissionForm = this.fb.group({
      documentNumber: [''],
      status: ['Draft', [Validators.required]]
    });

    this.fieldValueForm = this.fb.group({
      fieldId: [null, [Validators.required]],
      fieldCode: ['', [Validators.required]],
      valueString: [''],
      valueNumber: [null],
      valueDate: [null],
      valueBool: [false],
      valueJson: ['']
    });

    this.addSubmissionForm = this.fb.group({
      formBuilderId: [null, [Validators.required]],
      seriesId: [null, [Validators.required]],
      status: ['Draft', [Validators.required]]
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

    // Get documentTypeId from route
    this.routeSubscription = this.route.params.subscribe(params => {
      this.documentTypeId = +params['documentTypeId'];
      if (this.documentTypeId && !isNaN(this.documentTypeId)) {
        this.loadDocumentType();
        this.loadSubmissions();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid Document Type ID'
        });
        this.router.navigate(['/document-types']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadDocumentType(): void {
    this.loading.documentType = true;
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentType = types.find(t => t.id === this.documentTypeId) || null;
        // Always load forms and series
        this.loadForms();
        this.loadDocumentSeries();
        this.loading.documentType = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading document type:', error);
        this.loading.documentType = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadForms(): void {
    this.loading.forms = true;
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        this.forms = (result.items || []).filter(f => f.isPublished && f.isActive);
        this.loading.forms = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.forms = [];
        this.loading.forms = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentSeries(): void {
    if (!this.documentTypeId) return;
    
    this.loading.series = true;
    this.documentTypesService.getDocumentSeriesByDocumentTypeId(this.documentTypeId).subscribe({
      next: (series: DocumentSeries[]) => {
        this.documentSeries = series.filter(s => s.isActive);
        this.loading.series = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading document series:', error);
        this.documentSeries = [];
        this.loading.series = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSubmissions(): void {
    this.loading.submissions = true;
    this.formSubmissionsService.getSubmissionsByDocumentTypeId(this.documentTypeId).subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        this.submissions = submissions || [];
        this.filterSubmissions();
        this.loading.submissions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading form submissions:', error);
        this.submissions = [];
        this.filteredSubmissions = [];
        this.loading.submissions = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load form submissions'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterSubmissions(): void {
    let filtered = [...this.submissions];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.documentNumber?.toLowerCase().includes(term) ||
        sub.formName?.toLowerCase().includes(term) ||
        sub.documentTypeName?.toLowerCase().includes(term) ||
        sub.submittedByUserName?.toLowerCase().includes(term) ||
        sub.status?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.statusFilter) {
      filtered = filtered.filter(sub => sub.status === this.statusFilter);
    }

    this.filteredSubmissions = filtered;
    this.totalRecords = filtered.length;
  }

  onSearchChange(): void {
    this.first = 0; // Reset to first page
    this.filterSubmissions();
  }

  onStatusFilterChange(): void {
    this.first = 0; // Reset to first page
    this.filterSubmissions();
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  getPaginatedSubmissions(): FormSubmissionDto[] {
    return this.filteredSubmissions.slice(this.first, this.first + this.rows);
  }

  openEditModal(submission: FormSubmissionDto): void {
    this.submissionForm.patchValue({
      documentNumber: submission.documentNumber || '',
      status: submission.status || 'Draft'
    });
    this.selectedSubmission = submission as any;
    this.showSubmissionModal = true;
  }

  closeSubmissionModal(): void {
    this.showSubmissionModal = false;
    this.selectedSubmission = null;
    this.submissionForm.reset({
      documentNumber: '',
      status: 'Draft'
    });
  }

  saveSubmission(): void {
    if (this.submissionForm.invalid || !this.selectedSubmission) {
      return;
    }

    this.loading.save = true;
    const formData = this.submissionForm.value;
    const updateDto: UpdateFormSubmissionDto = {
      documentNumber: formData.documentNumber || undefined,
      status: formData.status
    };

    this.formSubmissionsService.updateSubmission(this.selectedSubmission.id, updateDto).subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Form submission updated successfully'
        });
        this.closeSubmissionModal();
        this.loadSubmissions();
      },
      error: (error: any) => {
        this.loading.save = false;
        console.error('Error updating form submission:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update form submission';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  deleteSubmission(submission: FormSubmissionDto): void {
    if (!submission || !submission.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the form submission "${submission.documentNumber || '#' + submission.id}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.formSubmissionsService.deleteSubmission(submission.id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Form submission deleted successfully'
            });
            this.loadSubmissions();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting form submission:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete form submission';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  updateStatus(submission: FormSubmissionDto, newStatus: string): void {
    if (!submission || !submission.id) return;

    this.loading.submissions = true;
    this.formSubmissionsService.updateStatus(submission.id, newStatus).subscribe({
      next: () => {
        this.loading.submissions = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Status updated to ${newStatus}`
        });
        this.loadSubmissions();
      },
      error: (error: any) => {
        this.loading.submissions = false;
        console.error('Error updating status:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update status';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'badge-secondary';
      case 'submitted':
        return 'badge-info';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'pending approval':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  // ================================
  // FIELD VALUES CRUD OPERATIONS
  // ================================

  /**
   * Open modal to add/edit field value
   */
  openFieldValueModal(fieldValue?: FormSubmissionValueDto): void {
    if (fieldValue) {
      // Edit mode
      this.editingFieldValue = fieldValue;
      this.fieldValueForm.patchValue({
        fieldId: fieldValue.fieldId,
        fieldCode: fieldValue.fieldCode || '',
        valueString: fieldValue.valueString || '',
        valueNumber: fieldValue.valueNumber || null,
        valueDate: fieldValue.valueDate ? new Date(fieldValue.valueDate) : null,
        valueBool: fieldValue.valueBool || false,
        valueJson: fieldValue.valueJson || ''
      });
    } else {
      // Add mode
      this.editingFieldValue = null;
      this.fieldValueForm.reset({
        fieldId: null,
        fieldCode: '',
        valueString: '',
        valueNumber: null,
        valueDate: null,
        valueBool: false,
        valueJson: ''
      });
    }
    this.showFieldValueModal = true;
  }

  /**
   * Close field value modal
   */
  closeFieldValueModal(): void {
    this.showFieldValueModal = false;
    this.editingFieldValue = null;
    this.fieldValueForm.reset({
      fieldId: null,
      fieldCode: '',
      valueString: '',
      valueNumber: null,
      valueDate: null,
      valueBool: false,
      valueJson: ''
    });
  }

  /**
   * Save field value (create or update)
   */
  saveFieldValue(): void {
    if (this.fieldValueForm.invalid || !this.selectedSubmission) {
      return;
    }

    this.loading.saveFieldValue = true;
    const formData = this.fieldValueForm.value;

    if (this.editingFieldValue) {
      // Update existing field value
      const updateDto: UpdateFormSubmissionValueDto = {
        valueString: formData.valueString || undefined,
        valueNumber: formData.valueNumber || undefined,
        valueDate: formData.valueDate || undefined,
        valueBool: formData.valueBool !== null && formData.valueBool !== undefined ? formData.valueBool : undefined,
        valueJson: formData.valueJson || undefined
      };

      this.formSubmissionValuesService.updateByField(
        this.selectedSubmission.id,
        this.editingFieldValue.fieldId,
        updateDto
      ).subscribe({
        next: () => {
          this.loading.saveFieldValue = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Field value updated successfully'
          });
          this.closeFieldValueModal();
          this.refreshSubmissionDetails();
        },
        error: (error: any) => {
          this.loading.saveFieldValue = false;
          console.error('Error updating field value:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update field value';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new field value
      const createDto: CreateFormSubmissionValueDto = {
        submissionId: this.selectedSubmission.id,
        fieldId: formData.fieldId,
        fieldCode: formData.fieldCode,
        valueString: formData.valueString || undefined,
        valueNumber: formData.valueNumber || undefined,
        valueDate: formData.valueDate || undefined,
        valueBool: formData.valueBool !== null && formData.valueBool !== undefined ? formData.valueBool : undefined,
        valueJson: formData.valueJson || undefined
      };

      this.formSubmissionValuesService.create(createDto).subscribe({
        next: () => {
          this.loading.saveFieldValue = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Field value created successfully'
          });
          this.closeFieldValueModal();
          this.refreshSubmissionDetails();
        },
        error: (error: any) => {
          this.loading.saveFieldValue = false;
          console.error('Error creating field value:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create field value';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Delete field value
   */
  deleteFieldValue(fieldValue: FormSubmissionValueDto): void {
    if (!fieldValue || !fieldValue.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the field value for "${fieldValue.fieldCode || 'Field #' + fieldValue.fieldId}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.deleteFieldValue = true;
        this.formSubmissionValuesService.delete(fieldValue.id).subscribe({
          next: () => {
            this.loading.deleteFieldValue = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Field value deleted successfully'
            });
            this.refreshSubmissionDetails();
          },
          error: (error: any) => {
            this.loading.deleteFieldValue = false;
            console.error('Error deleting field value:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete field value';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  /**
   * Refresh submission details after field value operations
   */
  refreshSubmissionDetails(): void {
    if (!this.selectedSubmission) return;

    this.loading.fieldValues = true;
    this.formSubmissionsService.getSubmissionById(this.selectedSubmission.id).subscribe({
      next: (detail: FormSubmissionDetailDto) => {
        this.selectedSubmission = detail;
        this.loading.fieldValues = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error refreshing submission details:', error);
        this.loading.fieldValues = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Get field value display text
   */
  getFieldValueDisplay(value: FormSubmissionValueDto): string {
    if (value.valueString) return value.valueString;
    if (value.valueNumber !== null && value.valueNumber !== undefined) return value.valueNumber.toString();
    if (value.valueDate) return this.formatDate(value.valueDate);
    if (value.valueBool !== null && value.valueBool !== undefined) return value.valueBool ? 'Yes' : 'No';
    if (value.valueJson) return value.valueJson;
    return '-';
  }

  // ================================
  // CREATE NEW SUBMISSION
  // ================================

  openAddSubmissionModal(): void {
    if (!this.documentType) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Document type not loaded'
      });
      return;
    }

    // Ensure forms and series are loaded
    if (this.forms.length === 0 && !this.loading.forms) {
      this.loadForms();
    }
    if (this.documentSeries.length === 0 && !this.loading.series) {
      this.loadDocumentSeries();
    }

    // Set default formBuilderId if available
    if (this.documentType.formBuilderId) {
      this.addSubmissionForm.patchValue({
        formBuilderId: this.documentType.formBuilderId,
        status: 'Draft'
      });
    } else {
      this.addSubmissionForm.reset({
        formBuilderId: null,
        seriesId: null,
        status: 'Draft'
      });
    }

    this.showAddSubmissionModal = true;
  }

  closeAddSubmissionModal(): void {
    this.showAddSubmissionModal = false;
    this.addSubmissionForm.reset({
      formBuilderId: this.documentType?.formBuilderId || null,
      seriesId: null,
      status: 'Draft'
    });
  }

  createSubmission(): void {
    if (this.addSubmissionForm.invalid || !this.documentType) {
      return;
    }

    const userId = this.authService.userName();
    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not found. Please login again.'
      });
      return;
    }

    this.loading.create = true;
    const formData = this.addSubmissionForm.value;
    
    const createDto: CreateFormSubmissionDto = {
      formBuilderId: formData.formBuilderId,
      documentTypeId: this.documentTypeId,
      seriesId: formData.seriesId,
      submittedByUserId: userId,
      status: formData.status || 'Draft'
    };

    this.formSubmissionsService.createSubmission(createDto).subscribe({
      next: (submission: FormSubmissionDto) => {
        this.loading.create = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Form submission created successfully'
        });
        this.closeAddSubmissionModal();
        this.loadSubmissions();
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error creating form submission:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create form submission';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  getFormName(formBuilderId: number): string {
    const form = this.forms.find(f => f.id === formBuilderId);
    return form?.formName || `Form #${formBuilderId}`;
  }

  getSeriesName(seriesId: number): string {
    const series = this.documentSeries.find(s => s.id === seriesId);
    return series ? `${series.seriesCode} (Project #${series.projectId})` : `Series #${seriesId}`;
  }
}

