import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSubmissionsService, FormSubmissionDto, FormSubmissionDetailDto, CreateFormSubmissionDto, UpdateFormSubmissionDto } from '../services/form-submissions.service';
import { FormSubmissionValuesService, FormSubmissionValueDto, CreateFormSubmissionValueDto, UpdateFormSubmissionValueDto, BulkFormSubmissionValuesDto } from '../services/form-submission-values.service';
import { FormSubmissionAttachmentsService, CreateFormSubmissionAttachmentDto } from '../services/form-submission-attachments.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType, DocumentSeries } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { FormBuilderDto, FormTabDto, FormFieldDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
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
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  tabs: FormTabDto[] = [];
  fields: FormFieldDto[] = [];
  selectedFormId: number | null = null;
  selectedTabId: number | null = null;
  showAddSubmissionModal = false;
  addSubmissionForm!: FormGroup;
  fieldsForm!: FormGroup; // Dynamic form for fields
  fieldFiles: { [fieldId: number]: File[] } = {}; // Store files for file fields

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
    series: false,
    tabs: false,
    fields: false,
    uploading: false
  };

  // Modals
  showSubmissionModal = false;
  showFieldValueModal = false;
  submissionForm!: FormGroup;
  fieldValueForm!: FormGroup;
  editingFieldValue: FormSubmissionValueDto | null = null;
  editSubmissionValuesForm!: FormGroup; // Form for editing all submission values
  submissionFields: FormFieldDto[] = []; // Fields for the selected submission

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
    private formSubmissionAttachmentsService: FormSubmissionAttachmentsService,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
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
      status: ['Submitted', [Validators.required]] // Default status is Submitted
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
      tabId: [null, [Validators.required]],
      seriesId: [null, [Validators.required]],
      status: ['Submitted', [Validators.required]] // Default status is Submitted
    });

    // Initialize form for editing submission values
    this.editSubmissionValuesForm = this.fb.group({});

    // Subscribe to tabId changes to update selectedTabId
    this.addSubmissionForm.get('tabId')?.valueChanges.subscribe(tabId => {
      // Convert to number if it's a string
      const numericTabId = tabId ? (typeof tabId === 'string' ? parseInt(tabId, 10) : Number(tabId)) : null;
      
      // Validate and update
      if (numericTabId && !isNaN(numericTabId) && numericTabId > 0 && numericTabId !== this.selectedTabId) {
        console.log('[valueChanges] Updating selectedTabId from form control:', numericTabId);
        this.selectedTabId = numericTabId;
        // Load fields if not already loading
        if (!this.loading.fields) {
          this.loadFields(numericTabId);
        }
      } else if ((!numericTabId || isNaN(numericTabId) || numericTabId <= 0) && this.selectedTabId !== null) {
        console.log('[valueChanges] Clearing selectedTabId');
        this.selectedTabId = null;
        this.fields = [];
        this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});
        this.loading.fields = false;
      }
    });

    this.fieldsForm = this.fb.group({});
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
    this.updateFormControlDisabledStates();
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        this.forms = (result.items || []).filter(f => f.isPublished && f.isActive);
        console.log(`[loadForms] Loaded ${this.forms.length} active/published forms`);
        this.loading.forms = false;
        this.updateFormControlDisabledStates();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.forms = [];
        this.loading.forms = false;
        this.updateFormControlDisabledStates();
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load forms. Please refresh and try again.',
          life: 5000
        });
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentSeries(): void {
    if (!this.documentTypeId) return;
    
    this.loading.series = true;
    this.updateFormControlDisabledStates();
    this.documentTypesService.getDocumentSeriesByDocumentTypeId(this.documentTypeId).subscribe({
      next: (series: DocumentSeries[]) => {
        this.documentSeries = series.filter(s => s.isActive);
        this.loading.series = false;
        this.updateFormControlDisabledStates();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading document series:', error);
        this.documentSeries = [];
        this.loading.series = false;
        this.updateFormControlDisabledStates();
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
    // Navigate to edit page instead of opening modal
    this.router.navigate(['/document-types', submission.documentTypeId, 'submissions', submission.id, 'edit']);
  }

  openEditModalOld(submission: FormSubmissionDto): void {
    this.submissionForm.patchValue({
      documentNumber: submission.documentNumber || '',
      status: submission.status || 'Submitted' // Default status is Submitted
    });
    
    // Load field values directly using FormSubmissionValuesService
    this.loading.fieldValues = true;
    
    // Create submission detail object from the submission we have
    const submissionDetail: FormSubmissionDetailDto = {
      ...submission,
      fieldValues: [],
      attachments: [],
      gridData: []
    };
    this.selectedSubmission = submissionDetail;
    
    // Load field values by submission ID
    this.formSubmissionValuesService.getBySubmissionId(submission.id).subscribe({
      next: (fieldValues: FormSubmissionValueDto[]) => {
        console.log('[FormSubmissionsList] Loaded field values:', fieldValues);
        submissionDetail.fieldValues = fieldValues || [];
        this.selectedSubmission = submissionDetail;
        
        // Load form fields to display field names
        if (submission.formBuilderId) {
          this.loadFormFieldsForEdit(submission.formBuilderId, submissionDetail);
        } else {
          console.warn('[FormSubmissionsList] No formBuilderId found in submission');
          this.loading.fieldValues = false;
    this.showSubmissionModal = true;
        }
      },
      error: (error) => {
        console.error('Error loading field values:', error);
        // Continue anyway - show modal with empty field values
        submissionDetail.fieldValues = [];
        this.selectedSubmission = submissionDetail;
        
        if (submission.formBuilderId) {
          this.loadFormFieldsForEdit(submission.formBuilderId, submissionDetail);
        } else {
          this.loading.fieldValues = false;
          this.showSubmissionModal = true;
        }
      }
    });
  }

  loadFormFieldsForEdit(formBuilderId: number, submissionDetail: FormSubmissionDetailDto): void {
    this.formsService.getFormById(formBuilderId).subscribe({
      next: (form: FormBuilderDto) => {
        // Load tabs using getTabs method
        this.tabsService.getTabs(formBuilderId).subscribe({
          next: (tabs: FormTabDto[]) => {
            // Load all fields from all tabs
            const fieldObservables = tabs.map(tab => 
              this.fieldsService.getFieldsByTabId(tab.id).pipe(
                catchError(() => of([]))
              )
            );
            
            if (fieldObservables.length === 0) {
              this.loading.fieldValues = false;
              this.showSubmissionModal = true;
              return;
            }
            
            forkJoin(fieldObservables).subscribe({
              next: (fieldsArrays: FormFieldDto[][]) => {
                this.submissionFields = fieldsArrays.flat();
                
                // Build dynamic form for field values
                this.buildEditSubmissionValuesForm(submissionDetail);
                
                this.loading.fieldValues = false;
                this.showSubmissionModal = true;
                this.cdr.detectChanges();
              },
              error: (error: any) => {
                console.error('Error loading fields:', error);
                this.loading.fieldValues = false;
                this.showSubmissionModal = true;
              }
            });
          },
          error: (error: any) => {
            console.error('Error loading tabs:', error);
            this.loading.fieldValues = false;
            this.showSubmissionModal = true;
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading form:', error);
        this.loading.fieldValues = false;
        this.showSubmissionModal = true;
      }
    });
  }

  buildEditSubmissionValuesForm(submissionDetail: FormSubmissionDetailDto): void {
    // Clear existing form controls
    Object.keys(this.editSubmissionValuesForm.controls).forEach(key => {
      this.editSubmissionValuesForm.removeControl(key);
    });

    // Create form controls for each field value
    if (!submissionDetail.fieldValues || submissionDetail.fieldValues.length === 0) {
      console.warn('[FormSubmissionsList] No field values found in submission detail');
      console.log('[FormSubmissionsList] Submission detail:', submissionDetail);
      return;
    }

    console.log('[FormSubmissionsList] Building form for', submissionDetail.fieldValues.length, 'field values');
    console.log('[FormSubmissionsList] Available fields:', this.submissionFields.length);
    console.log('[FormSubmissionsList] Field values:', submissionDetail.fieldValues);
    
    let controlsAdded = 0;
    submissionDetail.fieldValues.forEach(fieldValue => {
      // Try to find field, but don't skip if not found - we can still edit the value
      const field = this.submissionFields.find(f => f.id === fieldValue.fieldId);
      
      if (!field) {
        console.warn(`[FormSubmissionsList] Field ${fieldValue.fieldId} not found in submissionFields, but will still create control`);
      }
      
      let formValue: any = null;
      
      // Determine the value based on field type
      if (fieldValue.valueString !== null && fieldValue.valueString !== undefined && fieldValue.valueString !== '') {
        formValue = fieldValue.valueString;
      } else if (fieldValue.valueNumber !== null && fieldValue.valueNumber !== undefined) {
        formValue = fieldValue.valueNumber;
      } else if (fieldValue.valueDate) {
        const dateValue = new Date(fieldValue.valueDate);
        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        const hours = String(dateValue.getHours()).padStart(2, '0');
        const minutes = String(dateValue.getMinutes()).padStart(2, '0');
        formValue = `${year}-${month}-${day}T${hours}:${minutes}`;
      } else if (fieldValue.valueBool !== null && fieldValue.valueBool !== undefined) {
        formValue = fieldValue.valueBool;
      } else if (fieldValue.valueJson) {
        try {
          const parsed = JSON.parse(fieldValue.valueJson);
          formValue = typeof parsed === 'string' ? parsed : fieldValue.valueJson;
        } catch {
          formValue = fieldValue.valueJson;
        }
      }

      // Create form control with field ID as key
      const controlName = `field_${fieldValue.fieldId}`;
      this.editSubmissionValuesForm.addControl(controlName, this.fb.control(formValue));
      controlsAdded++;
      
      console.log(`[FormSubmissionsList] Added control for field ${fieldValue.fieldId} (${fieldValue.fieldCode || 'unknown'}) with value:`, formValue);
    });
    
    console.log('[FormSubmissionsList] Form built with', Object.keys(this.editSubmissionValuesForm.controls).length, 'controls');
    console.log('[FormSubmissionsList] Controls added:', controlsAdded, 'out of', submissionDetail.fieldValues.length, 'field values');
  }

  closeSubmissionModal(): void {
    this.showSubmissionModal = false;
    this.selectedSubmission = null;
    this.submissionFields = [];
    this.editSubmissionValuesForm = this.fb.group({}); // Reset form
    this.submissionForm.reset({
      documentNumber: '',
      status: 'Submitted' // Default status is Submitted
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

    // Update submission basic info
    this.formSubmissionsService.updateSubmission(this.selectedSubmission.id, updateDto).subscribe({
      next: () => {
        // Now update field values
        this.updateSubmissionFieldValues();
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

  updateSubmissionFieldValues(): void {
    if (!this.selectedSubmission || !this.selectedSubmission.fieldValues) {
        this.loading.save = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Form submission updated successfully'
      });
      this.closeSubmissionModal();
      this.loadSubmissions();
      return;
    }

    const formValues = this.editSubmissionValuesForm.value;
    const updateObservables: any[] = [];

    // Update each field value
    this.selectedSubmission.fieldValues.forEach(fieldValue => {
      const controlName = `field_${fieldValue.fieldId}`;
      const newValue = formValues[controlName];
      
      if (newValue === undefined || newValue === null) return;

      const field = this.submissionFields.find(f => f.id === fieldValue.fieldId);
      if (!field) return;

      // Determine value type and create update DTO
      const updateDto: UpdateFormSubmissionValueDto = {};
      
      if (field.fieldTypeId === 1) { // Text/String
        updateDto.valueString = String(newValue);
      } else if (field.fieldTypeId === 2) { // Number
        updateDto.valueNumber = Number(newValue);
      } else if (field.fieldTypeId === 3) { // Date
        updateDto.valueDate = newValue instanceof Date ? newValue : new Date(newValue);
      } else if (field.fieldTypeId === 4) { // Boolean
        updateDto.valueBool = Boolean(newValue);
      } else if (field.fieldTypeId === 5) { // JSON/Array
        updateDto.valueJson = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
      } else {
        // Default to string
        updateDto.valueString = String(newValue);
      }

      updateObservables.push(
        this.formSubmissionValuesService.updateByField(
          this.selectedSubmission!.id,
          fieldValue.fieldId,
          updateDto
        ).pipe(
          catchError((error) => {
            console.error(`Error updating field ${fieldValue.fieldId}:`, error);
            return of(null); // Continue with other updates
          })
        )
      );
    });

    if (updateObservables.length === 0) {
      this.loading.save = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Form submission updated successfully'
      });
      this.closeSubmissionModal();
      this.loadSubmissions();
      return;
    }

    // Execute all updates
    forkJoin(updateObservables).subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Form submission and values updated successfully'
        });
        this.closeSubmissionModal();
        this.loadSubmissions();
      },
      error: (error) => {
        this.loading.save = false;
        console.error('Error updating field values:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Some field values may not have been updated'
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
    const fieldIdControl = this.fieldValueForm.get('fieldId');
    const fieldCodeControl = this.fieldValueForm.get('fieldCode');
    
    if (fieldValue) {
      // Edit mode - disable fieldId and fieldCode
      this.editingFieldValue = fieldValue;
      if (fieldIdControl) {
        fieldIdControl.disable();
      }
      if (fieldCodeControl) {
        fieldCodeControl.disable();
      }
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
      // Add mode - enable fieldId and fieldCode
      this.editingFieldValue = null;
      if (fieldIdControl) {
        fieldIdControl.enable();
      }
      if (fieldCodeControl) {
        fieldCodeControl.enable();
      }
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
    
    // Re-enable controls before reset
    const fieldIdControl = this.fieldValueForm.get('fieldId');
    const fieldCodeControl = this.fieldValueForm.get('fieldCode');
    if (fieldIdControl) {
      fieldIdControl.enable();
    }
    if (fieldCodeControl) {
      fieldCodeControl.enable();
    }
    
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
    // Use getRawValue() to get values from disabled controls as well
    const formData = this.fieldValueForm.getRawValue();

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

  /**
   * Get field name by field ID
   */
  getFieldName(fieldId: number): string {
    const field = this.submissionFields.find(f => f.id === fieldId);
    return field?.fieldName || '';
  }

  /**
   * Get field type by field ID (for edit modal)
   * Returns simple types: text, number, date, boolean, json, textarea
   */
  getFieldTypeById(fieldId: number): string {
    const field = this.submissionFields.find(f => f.id === fieldId);
    if (!field || !field.fieldTypeId) return 'text';
    
    // Map field type IDs to simple input types
    // Adjust these IDs based on your actual field type IDs
    const typeMap: { [key: number]: string } = {
      1: 'text',      // Text/String
      2: 'number',    // Number
      3: 'date',      // Date
      4: 'boolean',   // Boolean
      5: 'json',      // JSON/Array
      6: 'textarea'   // Textarea
    };
    
    // Try direct mapping first
    if (typeMap[field.fieldTypeId]) {
      return typeMap[field.fieldTypeId];
    }
    
    // Fallback: use field type name to determine input type
    const fieldTypeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    
    if (fieldTypeName.includes('number') || fieldTypeName.includes('numeric')) {
      return 'number';
    }
    if (fieldTypeName.includes('date') || fieldTypeName.includes('time')) {
      return 'date';
    }
    if (fieldTypeName.includes('boolean') || fieldTypeName.includes('checkbox') || fieldTypeName.includes('switch')) {
      return 'boolean';
    }
    if (fieldTypeName.includes('textarea') || fieldTypeName.includes('text area')) {
      return 'textarea';
    }
    if (fieldTypeName.includes('json') || fieldTypeName.includes('array')) {
      return 'json';
    }
    
    // Default to text
    return 'text';
  }

  /**
   * Check if field is required
   */
  isFieldRequired(fieldId: number): boolean {
    const field = this.submissionFields.find(f => f.id === fieldId);
    return field?.is_required || false;
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

    // Reset form and data
    this.selectedFormId = null;
    this.selectedTabId = null;
    this.tabs = [];
    this.fields = [];
    this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});

    // Set default formBuilderId if available and handle disabled state
    const formBuilderIdControl = this.addSubmissionForm.get('formBuilderId');
    if (this.documentType?.formBuilderId) {
      // Check if the formBuilderId exists in the forms list
      const formExists = this.forms.some(f => f.id === this.documentType!.formBuilderId);
      if (formExists) {
        // Disable formBuilderId if it's already set in documentType and exists in forms
        if (formBuilderIdControl) {
          formBuilderIdControl.disable();
        }
      this.addSubmissionForm.patchValue({
        formBuilderId: this.documentType.formBuilderId,
          tabId: null,
        status: 'Submitted' // Default status is Submitted
      });
      this.onFormSelected(this.documentType.formBuilderId);
    } else {
        // Form doesn't exist in active/published forms, allow user to select
        console.warn(`[openAddSubmissionModal] FormBuilderId ${this.documentType.formBuilderId} from documentType not found in active forms list`);
        if (formBuilderIdControl) {
          formBuilderIdControl.enable();
        }
      this.addSubmissionForm.reset({
        formBuilderId: null,
          tabId: null,
          seriesId: null,
          status: 'Submitted' // Default status is Submitted
        });
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'The form associated with this document type is not available. Please select a form manually.',
          life: 5000
        });
      }
    } else {
      // Enable formBuilderId if it's not set
      if (formBuilderIdControl) {
        formBuilderIdControl.enable();
      }
      this.addSubmissionForm.reset({
        formBuilderId: null,
        tabId: null,
        seriesId: null,
        status: 'Submitted' // Default status is Submitted
      });
    }

    // Handle loading states
    this.updateFormControlDisabledStates();

    this.showAddSubmissionModal = true;
  }

  updateFormControlDisabledStates(): void {
    const formBuilderIdControl = this.addSubmissionForm.get('formBuilderId');
    const seriesIdControl = this.addSubmissionForm.get('seriesId');

    // Update formBuilderId disabled state
    if (formBuilderIdControl) {
      if (this.loading.forms || !!this.documentType?.formBuilderId) {
        formBuilderIdControl.disable();
      } else {
        formBuilderIdControl.enable();
      }
    }

    // Update seriesId disabled state
    if (seriesIdControl) {
      if (this.loading.series) {
        seriesIdControl.disable();
      } else {
        seriesIdControl.enable();
      }
    }
  }

  closeAddSubmissionModal(): void {
    this.showAddSubmissionModal = false;
    this.selectedFormId = null;
    this.selectedTabId = null;
    this.tabs = [];
    this.fields = [];
    this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});
    
    // Reset form and re-enable controls
    const formBuilderIdControl = this.addSubmissionForm.get('formBuilderId');
    if (formBuilderIdControl && this.documentType?.formBuilderId) {
      formBuilderIdControl.disable();
    } else if (formBuilderIdControl) {
      formBuilderIdControl.enable();
    }
    
    this.addSubmissionForm.reset({
      formBuilderId: this.documentType?.formBuilderId || null,
      tabId: null,
      seriesId: null,
      status: 'Submitted' // Default status is Submitted
    });
    
    this.updateFormControlDisabledStates();
  }

  onFormSelected(formId: number | null): void {
    // Validate formId
    if (!formId || isNaN(formId) || formId <= 0) {
      this.selectedFormId = null;
      this.selectedTabId = null;
      this.tabs = [];
      this.fields = [];
      this.fieldFiles = {};
      this.fieldsForm = this.fb.group({});
      return;
    }
    this.selectedFormId = formId;
    this.selectedTabId = null;
    this.fields = [];
    this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});
    this.loadTabs(formId);
  }


  onTabSelected(tabId: number | null): void {
    console.log('[onTabSelected] Called with tabId:', tabId, 'Type:', typeof tabId);
    
    // Validate tabId - early return for null/undefined
    if (tabId === null || tabId === undefined) {
      console.log('[onTabSelected] tabId is null/undefined, clearing fields');
      this.selectedTabId = null;
    this.fields = [];
    this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});
      this.loading.fields = false;
      return;
    }

    // Convert to number if it's a string
    const numericTabId = typeof tabId === 'string' ? parseInt(tabId, 10) : Number(tabId);
    
    // Validate numericTabId
    if (isNaN(numericTabId) || numericTabId <= 0) {
      console.warn('[onTabSelected] Invalid tabId after conversion:', numericTabId, 'from:', tabId);
      this.selectedTabId = null;
      this.fields = [];
      this.fieldFiles = {};
      this.fieldsForm = this.fb.group({});
      this.loading.fields = false;
      return;
    }

    console.log('[onTabSelected] Valid tabId, loading fields for tab:', numericTabId);
    this.selectedTabId = numericTabId;
    this.fields = [];
    this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});
    this.loadFields(numericTabId);
  }

  loadTabs(formId: number): void {
    // Validate formId
    if (!formId || isNaN(formId) || formId <= 0) {
      console.warn('Cannot load tabs: Invalid formId', formId);
      this.loading.tabs = false;
      this.tabs = [];
      return;
    }

    this.loading.tabs = true;
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs: FormTabDto[]) => {
        this.tabs = tabs.filter(t => t.isActive);
        this.loading.tabs = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading tabs:', error);
        this.tabs = [];
        this.loading.tabs = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadFields(tabId: number): void {
    // Validate inputs
    if (!this.selectedFormId || isNaN(this.selectedFormId) || this.selectedFormId <= 0) {
      console.warn('Cannot load fields: Invalid formId', this.selectedFormId);
      this.loading.fields = false;
      return;
    }

    if (!tabId || isNaN(tabId) || tabId <= 0) {
      console.warn('Cannot load fields: Invalid tabId', tabId);
      this.loading.fields = false;
      return;
    }
    
    this.loading.fields = true;
    this.fieldsService.getFields(this.selectedFormId, tabId).subscribe({
      next: (fields: FormFieldDto[]) => {
        this.fields = fields.filter(f => f.isActive).sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
        
        // Build dynamic form for fields
        const formControls: { [key: string]: any } = {};
        this.fields.forEach(field => {
          if (field.id) {
            const fieldKey = `field_${field.id}`;
            if (this.isFileField(field)) {
              // File fields don't need form control, handled separately
              formControls[fieldKey] = [null];
            } else {
              // Add appropriate validators based on field requirements
              const validators: any[] = [];
              if (field.isMandatory) {
                validators.push(Validators.required);
              }
              
              // Initialize checkbox fields as arrays
              const fieldType = this.getFieldType(field);
              let defaultValue: any = field.defaultValueJson || null;
              
              if (fieldType === 'checkbox') {
                // For checkbox, initialize as empty array
                defaultValue = [];
              } else if (fieldType === 'boolean') {
                const defaultStr = field.defaultValueJson;
                defaultValue = (defaultStr === 'true' || defaultStr === 'True') ? true : false;
              }
              
              formControls[fieldKey] = [defaultValue, validators];
            }
          }
        });
        this.fieldsForm = this.fb.group(formControls);
        
        this.loading.fields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Failed to get fields for tab ${tabId}:`, error);
        this.fields = [];
        this.loading.fields = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: `Failed to load fields for the selected tab. Please try again.`,
          life: 5000
        });
        this.cdr.detectChanges();
      }
    });
  }

  isFileField(field: FormFieldDto): boolean {
    // Check both fieldTypeName (from field) and fieldType.typeName (from navigation property)
    const typeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    return typeName.includes('file') || typeName.includes('attachment') || typeName.includes('image');
  }

  onFileSelected(event: any, field: FormFieldDto): void {
    if (!field.id) return;
    
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      this.fieldFiles[field.id] = files;
      this.cdr.detectChanges();
    }
  }

  onCheckboxChange(field: FormFieldDto, optionValue: string, event: any): void {
    if (!field.id) return;
    
    const fieldKey = `field_${field.id}`;
    const control = this.fieldsForm.get(fieldKey);
    
    if (!control) return;
    
    const currentValue = control.value || [];
    const isArray = Array.isArray(currentValue);
    let newValue: any[];
    
    if (!isArray) {
      newValue = currentValue ? [currentValue] : [];
    } else {
      newValue = [...currentValue];
    }
    
    if (event.target.checked) {
      if (!newValue.includes(optionValue)) {
        newValue.push(optionValue);
      }
    } else {
      const index = newValue.indexOf(optionValue);
      if (index > -1) {
        newValue.splice(index, 1);
      }
    }
    
    control.setValue(newValue);
    control.markAsTouched();
  }

  removeFile(fieldId: number, index: number): void {
    if (this.fieldFiles[fieldId]) {
      this.fieldFiles[fieldId].splice(index, 1);
      if (this.fieldFiles[fieldId].length === 0) {
        delete this.fieldFiles[fieldId];
      }
      this.cdr.detectChanges();
    }
  }

  createSubmission(): void {
    if (this.addSubmissionForm.invalid || !this.documentType) {
      this.markFormGroupTouched(this.addSubmissionForm);
      return;
    }

    // Validate fields form if fields are loaded
    if (this.fields.length > 0 && this.fieldsForm.invalid) {
      this.markFormGroupTouched(this.fieldsForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields'
      });
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
    // Use getRawValue() to get values from disabled controls as well
    const formData = this.addSubmissionForm.getRawValue();
    console.log('[createSubmission] Form data:', formData);
    console.log('[createSubmission] Forms list:', this.forms.map(f => ({ id: f.id, name: f.formName })));
    
    // Validate formBuilderId - convert to number if it's a string
    let formBuilderId: number;
    if (typeof formData.formBuilderId === 'string') {
      formBuilderId = parseInt(formData.formBuilderId, 10);
    } else {
      formBuilderId = Number(formData.formBuilderId);
    }
    
    console.log('[createSubmission] formBuilderId:', formBuilderId, 'Type:', typeof formBuilderId, 'Original:', formData.formBuilderId);
    
    if (!formBuilderId || isNaN(formBuilderId) || formBuilderId <= 0) {
      this.loading.create = false;
      console.warn('[createSubmission] Invalid formBuilderId:', formBuilderId, 'from:', formData.formBuilderId);
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a valid form'
      });
      return;
    }

    // Note: We don't check if formBuilderId exists in forms array because:
    // 1. The form might exist in DB but not be loaded (e.g., not published/active)
    // 2. The backend will validate the formBuilderId exists in the database
    // 3. If the form doesn't exist, the backend will return a proper error message

    // Validate seriesId - convert to number if it's a string
    let seriesId: number;
    if (typeof formData.seriesId === 'string') {
      seriesId = parseInt(formData.seriesId, 10);
    } else {
      seriesId = Number(formData.seriesId);
    }
    
    console.log('[createSubmission] seriesId:', seriesId, 'Type:', typeof seriesId, 'Original:', formData.seriesId);
    
    if (!seriesId || isNaN(seriesId) || seriesId <= 0) {
      this.loading.create = false;
      console.warn('[createSubmission] Invalid seriesId:', seriesId, 'from:', formData.seriesId);
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a valid document series'
      });
      return;
    }

    // Note: We don't check if seriesId exists in documentSeries array because:
    // 1. The series might exist in DB but not be loaded (e.g., not active)
    // 2. The backend will validate the seriesId exists in the database
    // 3. If the series doesn't exist, the backend will return a proper error message
    
    const createDto: CreateFormSubmissionDto = {
      formBuilderId: formBuilderId,
      documentTypeId: this.documentTypeId,
      seriesId: seriesId,
      submittedByUserId: userId,
      status: formData.status || 'Submitted' // Default status is Submitted
    };

    console.log('[createSubmission] Creating submission with:', createDto);

    // Step 1: Create submission
    this.formSubmissionsService.createSubmission(createDto).subscribe({
      next: (submission: FormSubmissionDto) => {
        // Step 2: Save field values and attachments
        this.saveSubmissionData(submission.id);
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error creating form submission:', error);
        
        let errorMessage = 'Failed to create form submission';
        
        // Check for specific error types
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error?.errorMessage) {
          errorMessage = error.error.errorMessage;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        // Check for Foreign Key constraint errors
        if (errorMessage.includes('FOREIGN KEY') || errorMessage.includes('FK_FORM_SUBMISSIONS_FORM_BUILDER')) {
          errorMessage = 'The selected form does not exist in the database. Please select a valid form.';
        } else if (errorMessage.includes('FK_FORM_SUBMISSIONS_DOCUMENT_SERIES')) {
          errorMessage = 'The selected document series does not exist. Please select a valid series.';
        } else if (errorMessage.includes('FK_FORM_SUBMISSIONS_DOCUMENT_TYPES')) {
          errorMessage = 'The document type is invalid. Please refresh and try again.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 8000
        });
        this.cdr.detectChanges();
      }
    });
  }

  saveSubmissionData(submissionId: number): void {
    const fieldValues: CreateFormSubmissionValueDto[] = [];
    const attachments: CreateFormSubmissionAttachmentDto[] = [];

    console.log('[saveSubmissionData] Processing fields:', this.fields.length);

    // Process regular fields
    this.fields.forEach(field => {
      if (!field.id || this.isFileField(field)) return;

      const fieldKey = `field_${field.id}`;
      const fieldValue = this.fieldsForm.get(fieldKey)?.value;

      console.log(`[saveSubmissionData] Field "${field.fieldName}" (${field.fieldCode}):`, {
        fieldId: field.id,
        fieldCode: field.fieldCode,
        value: fieldValue,
        valueType: typeof fieldValue,
        isArray: Array.isArray(fieldValue)
      });

      // Check if field has a value (including empty arrays for checkboxes)
      const hasValue = fieldValue !== null && 
                      fieldValue !== undefined && 
                      fieldValue !== '' &&
                      !(Array.isArray(fieldValue) && fieldValue.length === 0);

      if (hasValue) {
        // Ensure fieldCode is not empty
        if (!field.fieldCode || field.fieldCode.trim() === '') {
          console.warn(`[saveSubmissionData] Field "${field.fieldName}" (ID: ${field.id}) has no fieldCode, using fieldName as fallback`);
        }
        
        // Initialize all required fields (backend requires all value fields to be present)
        // Use empty string for string/JSON fields and null for number/date/bool
        const valueDto: any = {
          submissionId: submissionId,
          fieldId: field.id,
          fieldCode: field.fieldCode || field.fieldName || `FIELD_${field.id}`,
          // Initialize all value fields - backend requires them to be present
          // Use empty string for string/JSON (required fields), null for optional ones
          valueString: "",
          valueNumber: null,
          valueDate: null,
          valueBool: null,
          valueJson: ""
        };

        // Determine value type based on field type
        const fieldType = this.getFieldType(field);
        console.log(`[saveSubmissionData] Field "${field.fieldName}" type: ${fieldType}`);
        
        switch (fieldType) {
          case 'number':
            valueDto.valueNumber = Number(fieldValue);
            // Keep string/JSON as empty string (required), others as null
            valueDto.valueString = "";
            valueDto.valueJson = "";
            break;
          case 'date':
            // Convert to Date object - backend should handle serialization
            if (fieldValue instanceof Date) {
              valueDto.valueDate = fieldValue;
            } else if (typeof fieldValue === 'string') {
              const dateValue = new Date(fieldValue);
              if (!isNaN(dateValue.getTime())) {
                valueDto.valueDate = dateValue;
              } else {
                console.warn(`[saveSubmissionData] Invalid date value for field "${field.fieldName}": ${fieldValue}`);
                valueDto.valueString = String(fieldValue); // Fallback to string
              }
            } else {
              const dateValue = new Date(fieldValue);
              if (!isNaN(dateValue.getTime())) {
                valueDto.valueDate = dateValue;
              } else {
                console.warn(`[saveSubmissionData] Invalid date value for field "${field.fieldName}": ${fieldValue}`);
                valueDto.valueString = String(fieldValue); // Fallback to string
              }
            }
            // Keep string/JSON as empty string (required), others as null
            if (!valueDto.valueString) {
              valueDto.valueString = "";
            }
            valueDto.valueJson = "";
            break;
          case 'boolean':
          case 'switch':
            valueDto.valueBool = Boolean(fieldValue);
            // Keep string/JSON as empty string (required), others as null
            valueDto.valueString = "";
            valueDto.valueJson = "";
            break;
          case 'checkbox':
            // For checkbox, store as JSON array if multiple values
            if (Array.isArray(fieldValue)) {
              valueDto.valueJson = JSON.stringify(fieldValue);
              valueDto.valueString = "";
            } else {
              valueDto.valueString = String(fieldValue);
              valueDto.valueJson = "";
            }
            break;
          default:
            // For select, radio, and other string fields
            if (Array.isArray(fieldValue)) {
              valueDto.valueJson = JSON.stringify(fieldValue);
              valueDto.valueString = "";
            } else {
            valueDto.valueString = String(fieldValue);
              valueDto.valueJson = "";
            }
            break;
        }

        console.log(`[saveSubmissionData] Created valueDto for "${field.fieldName}":`, valueDto);
        fieldValues.push(valueDto);
      } else {
        console.log(`[saveSubmissionData] Skipping field "${field.fieldName}" - no value`);
      }
    });

    // Process file fields
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        files.forEach(file => {
          attachments.push({
            submissionId: submissionId,
            fieldId: fieldId,
            fieldCode: field.fieldCode,
            fileName: file.name,
            filePath: '', // Will be set by backend
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream'
          });
        });
      }
    });

    // Save field values
    const saveObservables: any[] = [];

    if (fieldValues.length > 0) {
      const bulkDto: BulkFormSubmissionValuesDto = {
        submissionId: submissionId,
        values: fieldValues
      };
      console.log('[saveSubmissionData] Sending bulk DTO:', JSON.stringify(bulkDto, null, 2));
      saveObservables.push(this.formSubmissionValuesService.createBulk(bulkDto));
    } else {
      console.log('[saveSubmissionData] No field values to save');
    }

    // Upload files
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        const fieldCode = field.fieldCode || field.fieldName || `FIELD_${field.id}`;
        console.log(`[saveSubmissionData] Uploading ${files.length} file(s) for field "${field.fieldName}" (${fieldCode})`);
        
        files.forEach((file, index) => {
          console.log(`[saveSubmissionData] Uploading file ${index + 1}/${files.length}:`, {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            fieldId,
            fieldCode
          });
          
          saveObservables.push(
            this.formSubmissionAttachmentsService.uploadFile(file, submissionId, fieldId, fieldCode)
          );
        });
      }
    });

    // Wait for all saves to complete
    if (saveObservables.length === 0) {
      this.loading.create = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Form submission created successfully'
      });
      this.closeAddSubmissionModal();
      this.loadSubmissions();
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: () => {
        this.loading.create = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Form submission created successfully with all field values and attachments'
        });
        this.closeAddSubmissionModal();
        this.loadSubmissions();
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error saving submission data:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        
        // Extract error message from various possible formats
        let errorMessage = 'Failed to save field values or attachments';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.errorMessage) {
            errorMessage = error.error.errorMessage;
          } else if (error.error.title) {
            errorMessage = error.error.title;
            if (error.error.errors) {
              const errors = Object.entries(error.error.errors)
                .map(([key, val]: [string, any]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                .join('; ');
              if (errors) {
                errorMessage += ' - ' + errors;
              }
            }
          } else if (Array.isArray(error.error)) {
            errorMessage = error.error.join(', ');
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 10000
        });
        this.cdr.detectChanges();
      }
    });
  }

  getFieldType(field: FormFieldDto): string {
    // Use fieldTypeName directly since fieldType object might not be loaded
    const fieldTypeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase().trim();
    const ft = field.fieldType;
    const hasOptions = ft?.hasOptions ?? (field.fieldOptions && field.fieldOptions.length > 0);
    const allowMultiple = ft?.allowMultiple ?? false;
    const dataType = (ft?.dataType || '').toLowerCase().trim();

    // Check for Grid type first
    if (fieldTypeName === 'grid') {
      return 'grid';
    }

    // Explicit mapping: Textbox => text input
    if (fieldTypeName === 'textbox' || fieldTypeName.includes('text box')) {
    return 'string';
    }

    // 1) Types with options (select / radio / checkbox)
    // Check if field has options (either from fieldType.hasOptions or from fieldOptions array)
    if (hasOptions || (field.fieldOptions && field.fieldOptions.length > 0)) {
      // Check for checkbox first
      if (fieldTypeName.includes('checkbox') || fieldTypeName.includes('check box')) {
        return 'checkbox';
      }

      // Check for radio
      if (fieldTypeName.includes('radio')) {
        return 'radio';
      }

      // If allowMultiple = true and has options, it's checkbox
      if (allowMultiple === true) {
        return 'checkbox';
      }

      // If allowMultiple = false and has options and not explicitly select, it's radio
      if (allowMultiple === false && !fieldTypeName.includes('select') && !fieldTypeName.includes('dropdown')) {
        return 'radio';
      }

      // Any other type with options is Dropdown/Select
      return 'select';
    }

    // 2) Non-options fields based on dataType / name
    const combined = `${fieldTypeName} ${dataType}`.toLowerCase();

    // Email first
    if (combined.includes('email')) return 'string';

    // Number
    if (combined.includes('number') || combined.includes('numeric') || dataType === 'number' || dataType === 'int' || dataType === 'decimal') {
      return 'number';
    }

    // Date
    if (combined.includes('date') || dataType === 'date' || dataType === 'datetime') {
      return 'date';
    }

    // Boolean/Switch
    if (combined.includes('boolean') || combined.includes('switch') || combined.includes('toggle') || dataType === 'boolean' || dataType === 'bool') {
      return 'boolean';
    }

    // File/Attachment
    if (combined.includes('file') || combined.includes('attachment')) {
      return 'file';
    }

    // Textarea
    if (combined.includes('textarea') || combined.includes('text area') || combined.includes('multiline')) {
      return 'textarea';
    }

    // Default to string
    return 'string';
  }

  getFieldOptions(field: FormFieldDto): any[] {
    if (!field.fieldOptions || !Array.isArray(field.fieldOptions)) {
      return [];
    }
    return field.fieldOptions.filter(opt => opt.isActive !== false);
  }

  getFieldPlaceholder(field: FormFieldDto): string {
    return field.placeholder || 'Your answer';
  }

  getFieldHintText(field: FormFieldDto): string {
    return field.hintText || '';
  }

  getAllowedExtensions(field: FormFieldDto): string[] {
    // Check if field has attachment type configuration
    // For now, return empty array - can be extended based on backend data
    // You may need to load attachment types from field.fieldType or a separate service
    return [];
  }

  getMaxFileSize(field: FormFieldDto): number {
    // Default 10 MB - can be extended based on backend configuration
    return 10;
  }

  formatFileSize(sizeInMB: number): string {
    return `${sizeInMB} MB`;
  }

  formatAllowedExtensions(extensions: string[]): string {
    return extensions.map(ext => `.${ext.toUpperCase()}`).join(', ');
  }

  getAcceptedFileTypes(field: FormFieldDto): string {
    const extensions = this.getAllowedExtensions(field);
    if (extensions.length === 0) return '*';
    return extensions.map(ext => `.${ext.toLowerCase()}`).join(',');
  }

  getFormName(formBuilderId: number): string {
    const form = this.forms.find(f => f.id === formBuilderId);
    return form?.formName || `Form #${formBuilderId}`;
  }

  getSeriesName(seriesId: number): string {
    const series = this.documentSeries.find(s => s.id === seriesId);
    return series ? `${series.seriesCode} (Project #${series.projectId})` : `Series #${seriesId}`;
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

  getFieldDisplayName(field: FormFieldDto): string {
    return field.fieldName || field.fieldCode || `Field #${field.id}`;
  }

  getFieldFiles(fieldId: number): File[] {
    return this.fieldFiles[fieldId] || [];
  }

  isRequired(field: FormFieldDto): boolean {
    return field.isMandatory === true;
  }
}

