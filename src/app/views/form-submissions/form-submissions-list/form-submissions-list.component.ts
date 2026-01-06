import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSubmissionsService, FormSubmissionDto, FormSubmissionDetailDto, CreateFormSubmissionDto, UpdateFormSubmissionDto } from '../services/form-submissions.service';
import { ApproveSubmissionDto, RejectSubmissionDto, ApiResponse } from '../models/approve-reject-submission.model';
import { FormSubmissionValuesService, FormSubmissionValueDto, CreateFormSubmissionValueDto, UpdateFormSubmissionValueDto, BulkFormSubmissionValuesDto } from '../services/form-submission-values.service';
import { FormSubmissionAttachmentsService, CreateFormSubmissionAttachmentDto, FormSubmissionAttachmentDto } from '../services/form-submission-attachments.service';
import { FileUploadService } from '../../FormBuilder/services/file-upload.service';
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
import { CalculatedFieldComponent } from '../../public-form/components/calculated-field.component';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../auth/auth.service';
import { StorageService } from '../../../auth/storage.service';
import { ApprovalWorkflowRuntimeService, ApprovalInboxItemDto } from '../../FormBuilder/services/approval-workflow-runtime.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
    CheckboxModule,
    CalculatedFieldComponent
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
  fieldAttachments: { [fieldId: number]: FormSubmissionAttachmentDto[] } = {}; // Store attachments for each field

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
    attachments: false,
    saveFieldValue: false,
    deleteFieldValue: false,
    create: false,
    forms: false,
    series: false,
    tabs: false,
    fields: false,
    uploading: false,
    approveReject: false
  };

  // Modals
  showSubmissionModal = false;
  showFieldValueModal = false;
  showPreviewModal = false;
  previewFile: FormSubmissionAttachmentDto | null = null;
  previewImageError: boolean = false;
  isViewMode = false; // true for view-only, false for edit mode
  submissionForm!: FormGroup;
  fieldValueForm!: FormGroup;
  editingFieldValue: FormSubmissionValueDto | null = null;
  editSubmissionValuesForm!: FormGroup; // Form for editing all submission values
  submissionFields: FormFieldDto[] = []; // Fields for the selected submission

  // Approve/Reject Modal
  showApproveRejectModal = false;
  approveRejectForm!: FormGroup;
  selectedSubmissionForAction: FormSubmissionDto | null = null;
  actionType: 'approve' | 'reject' | null = null;
  currentStageId: number | null = null;
  loadingApproveReject = false;

  // Search & Filter
  searchTerm = '';
  statusFilter: string | null = null;
  showOnlyMySubmissions: boolean = true; // Filter to show only current user's submissions (enabled by default)
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
    private authService: AuthService,
    public fileUploadService: FileUploadService,
    private storageService: StorageService,
    private approvalWorkflowRuntimeService: ApprovalWorkflowRuntimeService
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

    // Initialize approve/reject form
    this.approveRejectForm = this.fb.group({
      comments: ['']
    });

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

    // Filter by current user if "Show Only My Submissions" is enabled
    if (this.showOnlyMySubmissions) {
      const currentUserId = this.authService.userName();
      if (currentUserId) {
        filtered = filtered.filter(sub => 
          sub.submittedByUserId === currentUserId || 
          sub.submittedByUserName === currentUserId
        );
      }
    }

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

  onMySubmissionsFilterChange(): void {
    this.first = 0; // Reset to first page
    this.filterSubmissions();
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

  /**
   * View submission details (read-only)
   */
  viewSubmissionDetails(submission: FormSubmissionDto): void {
    // Load submission details
    this.loading.fieldValues = true;
    this.loading.attachments = false; // Reset attachments loading state
    this.isViewMode = true; // Set to view mode to show submission information
    
    // Clear previous attachments to avoid showing wrong attachments
    this.fieldAttachments = {};
    
    // Initialize submission form with basic info
    this.submissionForm.patchValue({
      documentNumber: submission.documentNumber || '',
      status: submission.status || 'Submitted'
    });
    
    // Store original submission ID before creating detail object
    const originalSubmissionId = submission.id;
    console.log('[FormSubmissionsList] Viewing submission:', {
      id: originalSubmissionId,
      documentNumber: submission.documentNumber,
      formBuilderId: submission.formBuilderId,
      submissionObject: submission
    });
    
    // Create submission detail object from the submission we have
    const submissionDetail: FormSubmissionDetailDto = {
      ...submission,
      id: originalSubmissionId, // Ensure ID is preserved
      fieldValues: [],
      attachments: [],
      gridData: []
    };
    this.selectedSubmission = submissionDetail;
    
    // Load field values by submission ID
    this.formSubmissionValuesService.getBySubmissionId(originalSubmissionId).subscribe({
      next: (fieldValues: FormSubmissionValueDto[]) => {
        console.log('[FormSubmissionsList] Loaded field values for view:', fieldValues);
        submissionDetail.fieldValues = fieldValues || [];
        submissionDetail.id = originalSubmissionId; // Ensure ID is preserved
        this.selectedSubmission = submissionDetail;
        
        // Load form fields to display field names
        if (submission.formBuilderId) {
          this.loadFormFieldsForView(submission.formBuilderId, submissionDetail, originalSubmissionId);
        } else {
          console.warn('[FormSubmissionsList] No formBuilderId found in submission');
          // Build form even without fields (will show field codes)
          this.buildEditSubmissionValuesForm(submissionDetail);
          this.loadAttachmentsForFields(originalSubmissionId, []);
          this.loading.fieldValues = false;
          this.showSubmissionModal = true;
        }
      },
      error: (error) => {
        console.error('Error loading field values:', error);
        // Continue anyway - show modal with empty field values
        submissionDetail.fieldValues = [];
        submissionDetail.id = originalSubmissionId; // Ensure ID is preserved
        this.selectedSubmission = submissionDetail;
        
        if (submission.formBuilderId) {
          this.loadFormFieldsForView(submission.formBuilderId, submissionDetail, originalSubmissionId);
        } else {
          // Build form even without fields
          this.buildEditSubmissionValuesForm(submissionDetail);
          this.loadAttachmentsForFields(originalSubmissionId, []);
          this.loading.fieldValues = false;
          this.showSubmissionModal = true;
        }
      }
    });
  }

  /**
   * Load form fields for viewing (read-only)
   */
  loadFormFieldsForView(formBuilderId: number, submissionDetail: FormSubmissionDetailDto, submissionId?: number): void {
    // Use provided submissionId or fallback to submissionDetail.id
    const actualSubmissionId = submissionId || submissionDetail.id;
    console.log('[FormSubmissionsList] loadFormFieldsForView - submissionId:', actualSubmissionId, 'submissionDetail.id:', submissionDetail.id);
    this.formsService.getFormById(formBuilderId).subscribe({
      next: (form: FormBuilderDto) => {
        if (form && form.id) {
          // Load tabs using getTabs method
          this.tabsService.getTabs(formBuilderId).subscribe({
            next: (tabs: FormTabDto[]) => {
              // Load all fields from all tabs explicitly (same as loadFormFieldsForEdit)
              const fieldObservables = tabs.map(tab => 
                this.fieldsService.getFieldsByTabId(tab.id).pipe(
                  catchError(() => of([]))
                )
              );
              
              if (fieldObservables.length === 0) {
                this.submissionFields = [];
                this.selectedSubmission = submissionDetail;
                this.buildEditSubmissionValuesForm(submissionDetail);
                this.loadAttachmentsForFields(actualSubmissionId, []);
                this.loading.fieldValues = false;
                this.showSubmissionModal = true;
                this.cdr.detectChanges();
                return;
              }
              
              forkJoin(fieldObservables).subscribe({
                next: (fieldsArrays: FormFieldDto[][]) => {
                  const allFields = fieldsArrays.flat();
                  this.submissionFields = allFields;
                  this.selectedSubmission = submissionDetail;
                  
                  console.log('[FormSubmissionsList] Loaded fields:', allFields.length, 'fields');
                  console.log('[FormSubmissionsList] Submission detail:', submissionDetail);
                  console.log('[FormSubmissionsList] Field values:', submissionDetail.fieldValues);
                  console.log('[FormSubmissionsList] Using submissionId for attachments:', actualSubmissionId);
                  
                  // Build form with field values for display
                  this.buildEditSubmissionValuesForm(submissionDetail);
                  
                  // Load attachments for file fields using actual submission ID
                  this.loadAttachmentsForFields(actualSubmissionId, allFields);
                  
                  this.loading.fieldValues = false;
                  this.showSubmissionModal = true;
                  this.cdr.detectChanges();
                },
                error: (error: any) => {
                  console.error('Error loading fields:', error);
                  this.submissionFields = [];
                  this.selectedSubmission = submissionDetail;
                  this.buildEditSubmissionValuesForm(submissionDetail);
                  this.loadAttachmentsForFields(actualSubmissionId, []);
                  this.loading.fieldValues = false;
                  this.showSubmissionModal = true;
                  this.cdr.detectChanges();
                }
              });
            },
            error: (error: any) => {
              console.error('Error loading tabs:', error);
              this.submissionFields = [];
              this.selectedSubmission = submissionDetail;
              this.buildEditSubmissionValuesForm(submissionDetail);
              this.loadAttachmentsForFields(actualSubmissionId, []);
              this.loading.fieldValues = false;
              this.showSubmissionModal = true;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.submissionFields = [];
          this.selectedSubmission = submissionDetail;
          this.buildEditSubmissionValuesForm(submissionDetail);
          this.loadAttachmentsForFields(actualSubmissionId, []);
          this.loading.fieldValues = false;
          this.showSubmissionModal = true;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Error loading form:', error);
        this.submissionFields = [];
        this.selectedSubmission = submissionDetail;
        this.buildEditSubmissionValuesForm(submissionDetail);
        this.loadAttachmentsForFields(actualSubmissionId, []);
        this.loading.fieldValues = false;
        this.showSubmissionModal = true;
        this.cdr.detectChanges();
      }
    });
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
    
    // Add file/image fields that have attachments but no fieldValue
    const fileFieldsWithoutValues: FormSubmissionValueDto[] = [];
    this.submissionFields.forEach(field => {
      if (this.isFileField(field.id!)) {
        // Check if this field has attachments
        const attachments = this.fieldAttachments[field.id!] || [];
        if (attachments.length > 0) {
          // Check if fieldValue already exists
          const existingValue = submissionDetail.fieldValues.find(fv => fv.fieldId === field.id);
          if (!existingValue) {
            // Create a placeholder fieldValue for display purposes
            fileFieldsWithoutValues.push({
              id: 0,
              submissionId: submissionDetail.id!,
              fieldId: field.id!,
              fieldCode: field.fieldCode || '',
              valueString: '',
              valueJson: '',
              valueNumber: undefined,
              valueDate: undefined,
              valueBool: undefined
            } as FormSubmissionValueDto);
            console.log(`[FormSubmissionsList] Added file field ${field.id} (${field.fieldCode || 'unknown'}) without fieldValue but with ${attachments.length} attachment(s)`);
          }
        }
      }
    });
    
    // Combine fieldValues with file fields that have attachments
    const allFieldValues = [...submissionDetail.fieldValues, ...fileFieldsWithoutValues];
    submissionDetail.fieldValues = allFieldValues;
    
    let controlsAdded = 0;
    submissionDetail.fieldValues.forEach(fieldValue => {
      // Skip file/image fields - they don't need form controls, only attachments
      if (this.isFileField(fieldValue.fieldId)) {
        console.log(`[FormSubmissionsList] Skipping form control for file/image field ${fieldValue.fieldId} (${fieldValue.fieldCode || 'unknown'})`);
        return;
      }
      
      // Try to find field, but don't skip if not found - we can still edit the value
      const field = this.submissionFields.find(f => f.id === fieldValue.fieldId);
      
      if (!field) {
        console.warn(`[FormSubmissionsList] Field ${fieldValue.fieldId} not found in submissionFields, but will still create control`);
      }
      
      let formValue: any = null;
      
      // Determine value based on actual data present (prioritize by data type, not field type)
      // This ensures correct display even if fieldTypeId is incorrect
      if (fieldValue.valueNumber !== null && fieldValue.valueNumber !== undefined) {
        // If valueNumber exists, treat as number field
        formValue = fieldValue.valueNumber;
      } else if (fieldValue.valueDate) {
        // If valueDate exists, treat as date field
        const dateValue = new Date(fieldValue.valueDate);
        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        const hours = String(dateValue.getHours()).padStart(2, '0');
        const minutes = String(dateValue.getMinutes()).padStart(2, '0');
        formValue = `${year}-${month}-${day}T${hours}:${minutes}`;
      } else if (fieldValue.valueBool !== null && fieldValue.valueBool !== undefined) {
        // If valueBool exists, treat as boolean field
        formValue = fieldValue.valueBool;
      } else if (fieldValue.valueJson) {
        // If valueJson exists, try to parse it
        try {
          const parsed = JSON.parse(fieldValue.valueJson);
          // If parsed value is a string, use it directly; otherwise stringify
          formValue = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch {
          formValue = fieldValue.valueJson;
        }
      } else if (fieldValue.valueString !== null && fieldValue.valueString !== undefined && fieldValue.valueString !== '') {
        // If valueString exists, use it
        formValue = fieldValue.valueString;
      }

      // Create form control with field ID as key
      const controlName = `field_${fieldValue.fieldId}`;
      // In view mode, disable the control; in edit mode, enable it
      // Important: Use {value, disabled} syntax to ensure value is set correctly
      const control = this.fb.control({ value: formValue, disabled: this.isViewMode });
      this.editSubmissionValuesForm.addControl(controlName, control);
      controlsAdded++;
      
      console.log(`[FormSubmissionsList] Added control for field ${fieldValue.fieldId} (${fieldValue.fieldCode || 'unknown'}) with value:`, formValue, 'type:', typeof formValue, 'disabled:', this.isViewMode);
      console.log(`[FormSubmissionsList] Control value after creation:`, control.value);
    });
    
    console.log('[FormSubmissionsList] Form built with', Object.keys(this.editSubmissionValuesForm.controls).length, 'controls');
    console.log('[FormSubmissionsList] Controls added:', controlsAdded, 'out of', submissionDetail.fieldValues.length, 'field values');
    
    // Log all control values for debugging
    Object.keys(this.editSubmissionValuesForm.controls).forEach(key => {
      const control = this.editSubmissionValuesForm.get(key);
      console.log(`[FormSubmissionsList] Control ${key}: value=`, control?.value, 'disabled=', control?.disabled, 'rawValue=', control?.getRawValue?.());
    });
    
    // Ensure forms are disabled in view mode
    if (this.isViewMode) {
      // Don't disable the entire form - controls are already disabled individually
      // this.editSubmissionValuesForm.disable();
      this.submissionForm.disable();
    }
  }

  /**
   * Load attachments for file/image fields
   */
  loadAttachmentsForFields(submissionId: number, fields: FormFieldDto[]): void {
    console.log('[FormSubmissionsList] loadAttachmentsForFields called with submissionId:', submissionId, 'selectedSubmission.id:', this.selectedSubmission?.id);
    this.loading.attachments = true;
    // First, check fieldValues for fields with valueJson containing allowedExtensions
    // This works even if fields array is empty
    const fileFieldIds: number[] = [];
    
    if (this.selectedSubmission?.fieldValues) {
      console.log('[FormSubmissionsList] Checking fieldValues for file fields:', this.selectedSubmission.fieldValues.length, 'values');
      this.selectedSubmission.fieldValues.forEach(fieldValue => {
        console.log(`[FormSubmissionsList] Checking fieldValue: fieldId=${fieldValue.fieldId}, fieldCode=${fieldValue.fieldCode}, valueJson=${fieldValue.valueJson}`);
        if (fieldValue.valueJson && fieldValue.valueJson.includes('allowedExtensions')) {
          // This is a file field based on valueJson
          console.log(`[FormSubmissionsList] ✅ Found file field: ${fieldValue.fieldId} (${fieldValue.fieldCode})`);
          if (!fileFieldIds.includes(fieldValue.fieldId)) {
            fileFieldIds.push(fieldValue.fieldId);
          }
        }
      });
    }
    
    // Find all file/image fields from fields array
    const fileFields = fields.filter(field => {
      const fieldType = this.getFieldType(field);
      const fieldCode = (field.fieldCode || '').toLowerCase();
      const fieldName = (field.fieldName || '').toLowerCase();
      
      // Check by field type
      if (fieldType === 'file' || fieldType === 'image') {
        if (!fileFieldIds.includes(field.id!)) {
          fileFieldIds.push(field.id!);
        }
        return true;
      }
      
      // Check by field code/name
      if (fieldCode.includes('image') || fieldCode.includes('file') || fieldCode.includes('attachment')) {
        if (!fileFieldIds.includes(field.id!)) {
          fileFieldIds.push(field.id!);
        }
        return true;
      }
      if (fieldName.includes('image') || fieldName.includes('file') || fieldName.includes('attachment')) {
        if (!fileFieldIds.includes(field.id!)) {
          fileFieldIds.push(field.id!);
        }
        return true;
      }
      
      return false;
    });
    
    if (fileFieldIds.length === 0) {
      console.log('[FormSubmissionsList] No file/image fields found');
      this.loading.attachments = false;
      return;
    }
    
    console.log('[FormSubmissionsList] Loading attachments for file fields:', fileFieldIds);
    
    // First, try to load all attachments for the submission at once (more efficient)
    console.log(`[FormSubmissionsList] Attempting to load all attachments for submissionId=${submissionId}`);
    this.formSubmissionAttachmentsService.getBySubmissionId(submissionId).subscribe({
      next: (allAttachments) => {
        // Handle different response formats
        let allAttachmentsArray: FormSubmissionAttachmentDto[] = [];
        
        if (Array.isArray(allAttachments)) {
          allAttachmentsArray = allAttachments;
        } else if (allAttachments && typeof allAttachments === 'object') {
          // Check if response has a data property
          if ((allAttachments as any).data && Array.isArray((allAttachments as any).data)) {
            allAttachmentsArray = (allAttachments as any).data;
          } else if ((allAttachments as any).attachments && Array.isArray((allAttachments as any).attachments)) {
            allAttachmentsArray = (allAttachments as any).attachments;
          } else {
            // Try to convert object to array
            allAttachmentsArray = [allAttachments as any];
          }
        }
        
        console.log(`[FormSubmissionsList] ✅ Loaded ${allAttachmentsArray.length} total attachment(s) for submissionId=${submissionId}`);
        console.log(`[FormSubmissionsList] Raw response:`, allAttachments);
        console.log(`[FormSubmissionsList] Processed attachments array:`, allAttachmentsArray);
        
        // Group attachments by fieldId
        const attachmentsByField: { [fieldId: number]: FormSubmissionAttachmentDto[] } = {};
        allAttachmentsArray.forEach(att => {
          if (att && att.fieldId) {
            if (!attachmentsByField[att.fieldId]) {
              attachmentsByField[att.fieldId] = [];
            }
            attachmentsByField[att.fieldId].push(att);
          }
        });
        
        console.log(`[FormSubmissionsList] Attachments grouped by fieldId:`, Object.keys(attachmentsByField).map(fid => `${fid}: ${attachmentsByField[+fid].length}`).join(', '));
        
        // Update fieldAttachments for each file field
        fileFieldIds.forEach(fieldId => {
          const fieldAttachments = attachmentsByField[fieldId] || [];
          console.log(`[FormSubmissionsList] Field ${fieldId} has ${fieldAttachments.length} attachment(s) from bulk load`);
          
          if (fieldAttachments.length > 0) {
            fieldAttachments.forEach((att, index) => {
              const imageUrl = this.getImageUrl(att);
              console.log(`[FormSubmissionsList] 📎 Attachment ${index + 1} for field ${fieldId}:`, {
                id: att.id,
                submissionId: att.submissionId,
                fieldId: att.fieldId,
                fileName: att.fileName,
                filePath: att.filePath,
                fileSize: att.fileSize,
                contentType: att.contentType,
                downloadUrl: att.downloadUrl,
                imageUrl: imageUrl,
                isImage: this.isImageAttachment(att)
              });
            });
          }
          
          this.fieldAttachments[fieldId] = fieldAttachments;
          console.log(`[FormSubmissionsList] Updated fieldAttachments[${fieldId}] with ${fieldAttachments.length} attachment(s) from bulk load`);
        });
        
        // Also check for attachments that might not be in fileFieldIds but exist in the response
        Object.keys(attachmentsByField).forEach(fieldIdStr => {
          const fieldId = +fieldIdStr;
          if (!fileFieldIds.includes(fieldId) && attachmentsByField[fieldId].length > 0) {
            console.log(`[FormSubmissionsList] ⚠️ Found attachments for field ${fieldId} that wasn't in fileFieldIds list`);
            this.fieldAttachments[fieldId] = attachmentsByField[fieldId];
          }
        });
        
        // Add file/image fields that have attachments but no fieldValue
        this.addFileFieldsWithAttachments();
        
        this.loading.attachments = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.log(`[FormSubmissionsList] Bulk load failed, falling back to individual field requests. Error:`, error);
        
        // Fallback: Load attachments for each file field ID individually
        fileFieldIds.forEach(fieldId => {
          console.log(`[FormSubmissionsList] Requesting attachments for submissionId=${submissionId}, fieldId=${fieldId}`);
          console.log(`[FormSubmissionsList] About to call API: getBySubmissionAndField(${submissionId}, ${fieldId})`);
          this.formSubmissionAttachmentsService.getBySubmissionAndField(submissionId, fieldId).subscribe({
            next: (attachments) => {
              // Handle different response formats
              let attachmentsArray: FormSubmissionAttachmentDto[] = [];
              
              if (Array.isArray(attachments)) {
                attachmentsArray = attachments;
              } else if (attachments && typeof attachments === 'object') {
                if ((attachments as any).data && Array.isArray((attachments as any).data)) {
                  attachmentsArray = (attachments as any).data;
                } else if ((attachments as any).attachments && Array.isArray((attachments as any).attachments)) {
                  attachmentsArray = (attachments as any).attachments;
                } else {
                  attachmentsArray = [attachments as any];
                }
              }
              
              console.log(`[FormSubmissionsList] ✅ Loaded ${attachmentsArray.length} attachment(s) for field ${fieldId}, submissionId=${submissionId}`);
              console.log(`[FormSubmissionsList] Raw response:`, attachments);
              console.log(`[FormSubmissionsList] Processed attachments array:`, attachmentsArray);
              
              if (attachmentsArray.length > 0) {
                attachmentsArray.forEach((att, index) => {
                  const imageUrl = this.getImageUrl(att);
                  console.log(`[FormSubmissionsList] 📎 Attachment ${index + 1} details:`, {
                    id: att.id,
                    submissionId: att.submissionId,
                    fieldId: att.fieldId,
                    fileName: att.fileName,
                    filePath: att.filePath,
                    fileSize: att.fileSize,
                    contentType: att.contentType,
                    downloadUrl: att.downloadUrl,
                    imageUrl: imageUrl,
                    isImage: this.isImageAttachment(att)
                  });
                });
                // Log first file name for easy reference
                console.log(`[FormSubmissionsList] First file name: ${attachmentsArray[0].fileName}`);
              } else {
                // This is normal - field exists but no files uploaded yet
                console.log(`[FormSubmissionsList] No attachments found for field ${fieldId}, submissionId=${submissionId} (this is normal if no files were uploaded)`);
                console.log(`[FormSubmissionsList] Check if submission ${submissionId} has attachments in database for field ${fieldId}`);
              }
              
              this.fieldAttachments[fieldId] = attachmentsArray;
              console.log(`[FormSubmissionsList] Updated fieldAttachments[${fieldId}] with ${attachmentsArray.length} attachment(s)`);
              
              // Check if all requests are done
              const allRequestsDone = fileFieldIds.every(fid => this.fieldAttachments.hasOwnProperty(fid));
              if (allRequestsDone) {
                this.loading.attachments = false;
              }
              
              this.cdr.detectChanges();
            },
            error: (error) => {
              // Only log as error if it's not a 404 (not found is normal)
              if (error?.status === 404) {
                console.log(`[FormSubmissionsList] No attachments found for field ${fieldId}, submissionId=${submissionId} (404 - this is normal)`);
                console.log(`[FormSubmissionsList] API URL called: /FormSubmissionAttachments/submission/${submissionId}/field/${fieldId}`);
              } else {
                console.error(`[FormSubmissionsList] ❌ Error loading attachments for field ${fieldId}, submissionId=${submissionId}:`, error);
                console.error(`[FormSubmissionsList] Error details:`, {
                  status: error?.status,
                  statusText: error?.statusText,
                  message: error?.message,
                  url: error?.url
                });
              }
              this.fieldAttachments[fieldId] = [];
              
              // Check if all requests are done
              const allRequestsDone = fileFieldIds.every(fid => this.fieldAttachments.hasOwnProperty(fid));
              if (allRequestsDone) {
                this.loading.attachments = false;
              }
              
              this.cdr.detectChanges();
            }
          });
        });
      }
    });
  }

  /**
   * Get attachments for a specific field
   */
  getFieldAttachments(fieldId: number): FormSubmissionAttachmentDto[] {
    const attachments = this.fieldAttachments[fieldId] || [];
    if (attachments.length > 0) {
      console.log(`[FormSubmissionsList] getFieldAttachments(${fieldId}):`, attachments.length, 'attachments found');
      attachments.forEach(att => {
        console.log(`[FormSubmissionsList] Attachment in getFieldAttachments:`, {
          id: att.id,
          fieldId: att.fieldId,
          fileName: att.fileName,
          filePath: att.filePath,
          imageUrl: this.getImageUrl(att)
        });
      });
    } else {
      console.log(`[FormSubmissionsList] getFieldAttachments(${fieldId}): No attachments found`);
      console.log(`[FormSubmissionsList] fieldAttachments object:`, this.fieldAttachments);
    }
    return attachments;
  }

  /**
   * Check if field is a file/image field (by fieldId)
   */
  isFileField(fieldId: number): boolean {
    const field = this.submissionFields.find(f => f.id === fieldId);
    if (!field) {
      // If field not found in submissionFields, check by fieldCode from fieldValue
      const fieldValue = this.selectedSubmission?.fieldValues?.find(fv => fv.fieldId === fieldId);
      if (fieldValue) {
        const fieldCode = (fieldValue.fieldCode || '').toLowerCase();
        // Check if fieldCode contains image/file keywords
        if (fieldCode.includes('image') || fieldCode.includes('file') || fieldCode.includes('attachment')) {
          return true;
        }
        // Check if valueJson contains allowedExtensions (indicates file field config)
        if (fieldValue.valueJson && fieldValue.valueJson.includes('allowedExtensions')) {
          return true;
        }
      }
      return false;
    }
    const fieldType = this.getFieldType(field);
    const fieldCode = (field.fieldCode || '').toLowerCase();
    const fieldName = (field.fieldName || '').toLowerCase();
    
    // Check by field type
    if (fieldType === 'file' || fieldType === 'image') {
      return true;
    }
    
    // Check by field code/name
    if (fieldCode.includes('image') || fieldCode.includes('file') || fieldCode.includes('attachment')) {
      return true;
    }
    if (fieldName.includes('image') || fieldName.includes('file') || fieldName.includes('attachment')) {
      return true;
    }
    
    // Check if field has valueJson with allowedExtensions (file field configuration)
    const fieldValue = this.selectedSubmission?.fieldValues?.find(fv => fv.fieldId === fieldId);
    if (fieldValue?.valueJson && fieldValue.valueJson.includes('allowedExtensions')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if attachment is an image
   */
  isImageAttachment(attachment: FormSubmissionAttachmentDto): boolean {
    if (!attachment.contentType) return false;
    return attachment.contentType.startsWith('image/') || 
           /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.fileName);
  }

  /**
   * Check if file is a PDF
   */
  isPdfFile(attachment: FormSubmissionAttachmentDto): boolean {
    const contentType = attachment.contentType?.toLowerCase() || '';
    const fileName = attachment.fileName?.toLowerCase() || '';
    return contentType === 'application/pdf' || fileName.endsWith('.pdf');
  }

  /**
   * Check if file can be previewed
   */
  canPreviewFile(attachment: FormSubmissionAttachmentDto): boolean {
    return this.isImageAttachment(attachment) || this.isPdfFile(attachment);
  }

  /**
   * Get file type icon class (same as FormViewComponent)
   */
  getFileIcon(attachment: FormSubmissionAttachmentDto): string {
    if (this.isImageAttachment(attachment)) {
      return 'pi pi-image';
    } else if (this.isPdfFile(attachment)) {
      return 'pi pi-file-pdf';
    } else if (attachment.contentType?.includes('word') || /\.(doc|docx)$/i.test(attachment.fileName || '')) {
      return 'pi pi-file-word';
    } else if (attachment.contentType?.includes('excel') || attachment.contentType?.includes('spreadsheet') || /\.(xls|xlsx)$/i.test(attachment.fileName || '')) {
      return 'pi pi-file-excel';
    } else {
      return 'pi pi-file';
    }
  }

  /**
   * Get download URL for attachment
   */
  getAttachmentDownloadUrl(attachmentId: number): string {
    return `${environment.apiUrl}/FormSubmissionAttachments/${attachmentId}/download`;
  }

  /**
   * Get image URL from filePath stored in database
   */
  getImageUrl(attachment: FormSubmissionAttachmentDto): string {
    // Use FileUploadService to get download URL (same as FormViewComponent)
    if (attachment.id) {
      const downloadUrl = this.fileUploadService.getDownloadUrl(attachment.id);
      console.log(`[FormSubmissionsList] getImageUrl for attachment ${attachment.id}:`, {
        fileName: attachment.fileName,
        downloadUrl: downloadUrl,
        filePath: attachment.filePath,
        attachmentDownloadUrl: attachment.downloadUrl
      });
      return downloadUrl;
    }
    
    // Fallback: If downloadUrl is provided, use it
    if (attachment.downloadUrl) {
      console.log(`[FormSubmissionsList] getImageUrl: Using attachment.downloadUrl:`, attachment.downloadUrl);
      return attachment.downloadUrl;
    }
    
    // Fallback: If filePath is a full URL, use it directly
    if (attachment.filePath && (attachment.filePath.startsWith('http://') || attachment.filePath.startsWith('https://'))) {
      console.log(`[FormSubmissionsList] getImageUrl: Using full URL filePath:`, attachment.filePath);
      return attachment.filePath;
    }
    
    // Fallback: Construct URL from filePath
    if (attachment.filePath) {
      let cleanPath = attachment.filePath.startsWith('/') ? attachment.filePath.substring(1) : attachment.filePath;
      if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('wwwroot/') && !cleanPath.startsWith('www/')) {
        if (cleanPath.startsWith('submissions/')) {
          const url = `${environment.apiUrl}/${cleanPath}`;
          console.log(`[FormSubmissionsList] getImageUrl: Constructed URL from submissions path:`, url);
          return url;
        } else {
          cleanPath = `uploads/${cleanPath}`;
        }
      }
      const url = `${environment.apiUrl}/${cleanPath}`;
      console.log(`[FormSubmissionsList] getImageUrl: Constructed URL from filePath:`, url);
      return url;
    }
    
    // Final fallback - return empty string to avoid 404
    console.warn(`[FormSubmissionsList] getImageUrl: No valid URL found for attachment:`, attachment);
    return '';
  }

  /**
   * Get preview URL for attachment (alias for getImageUrl)
   */
  getPreviewUrl(attachment: FormSubmissionAttachmentDto): string | null {
    if (!attachment.id) return null;
    return this.getImageUrl(attachment);
  }

  /**
   * Open preview for attachment (opens modal like FormViewComponent)
   */
  openPreview(attachment: FormSubmissionAttachmentDto): void {
    if (this.canPreviewFile(attachment)) {
      this.previewFile = attachment;
      this.previewImageError = false; // Reset error state
      this.showPreviewModal = true;
    }
  }

  /**
   * Close preview modal
   */
  closePreview(): void {
    this.showPreviewModal = false;
    this.previewFile = null;
    this.previewImageError = false;
  }

  /**
   * Handle image error in preview modal
   */
  handlePreviewImageError(event: any, attachment: FormSubmissionAttachmentDto): void {
    console.error(`[FormSubmissionsList] Error loading preview image for attachment ${attachment.id}:`, {
      fileName: attachment.fileName,
      downloadUrl: this.fileUploadService.getDownloadUrl(attachment.id!),
      imageUrl: this.getImageUrl(attachment)
    });
    this.previewImageError = true;
    // Try fallback URL once
    if (event.target.src !== attachment.downloadUrl && attachment.downloadUrl) {
      event.target.src = attachment.downloadUrl;
      this.previewImageError = false;
    }
  }

  /**
   * Check if attachment is an image (alias for isImageAttachment to match FormViewComponent)
   */
  isImageFile(attachment: FormSubmissionAttachmentDto): boolean {
    return this.isImageAttachment(attachment);
  }

  /**
   * Open image preview in new window
   */
  openImagePreview(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Handle image loading error
   */
  handleImageError(event: any, attachment: FormSubmissionAttachmentDto): void {
    console.error(`[FormSubmissionsList] Error loading image for attachment ${attachment.id}:`, {
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      downloadUrl: attachment.downloadUrl,
      imageUrl: this.getImageUrl(attachment)
    });
    // Hide the image and show icon instead
    const thumbnail = event.target.closest('.file-preview-thumbnail');
    if (thumbnail) {
      thumbnail.style.display = 'none';
    }
    // Try fallback to download URL once
    if (event.target.src !== this.getAttachmentDownloadUrl(attachment.id)) {
      event.target.src = this.getAttachmentDownloadUrl(attachment.id);
    } else {
      // If fallback also failed, hide the image element
      event.target.style.display = 'none';
    }
  }

  enableEditMode(): void {
    this.isViewMode = false;
    // Enable the form controls
    this.submissionForm.enable();
    this.editSubmissionValuesForm.enable();
    this.cdr.detectChanges();
  }

  closeSubmissionModal(): void {
    this.showSubmissionModal = false;
    this.isViewMode = false; // Reset view mode
    this.selectedSubmission = null;
    this.submissionFields = [];
    this.fieldAttachments = {}; // Clear attachments
    this.editSubmissionValuesForm = this.fb.group({}); // Reset form
    this.submissionForm.reset({
      documentNumber: '',
      status: 'Submitted' // Default status is Submitted
    });
  }

  saveSubmission(): void {
    // Prevent saving in view mode
    if (this.isViewMode) {
      console.warn('[FormSubmissionsList] Cannot save in view mode');
      return;
    }
    
    if (this.submissionForm.invalid || !this.selectedSubmission) {
      return;
    }

    // Validate required file fields
    const missingFiles = this.validateRequiredFileFields();
    if (missingFiles.length > 0) {
      const fieldNames = missingFiles.map(f => this.getFieldDisplayName(f)).join(', ');
      const errorMessage = this.translationService.getCurrentLanguage() === 'ar' 
        ? `يرجى رفع الملفات للحقول المطلوبة: ${fieldNames}`
        : `Please upload files for required fields: ${fieldNames}`;
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: errorMessage
      });
      return;
    }

    this.loading.save = true;
    const formData = this.submissionForm.value;
    const updateDto: UpdateFormSubmissionDto = {
      documentNumber: formData.documentNumber || undefined,
      status: 'Submitted' // Always set status to Submitted after edit and save
    };

    // Update submission basic info
    this.formSubmissionsService.updateSubmission(this.selectedSubmission.id, updateDto).subscribe({
      next: () => {
        // Update the form status to Submitted
        this.submissionForm.patchValue({ status: 'Submitted' });
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

  /**
   * Validate required file fields have attachments
   */
  validateRequiredFileFields(): FormFieldDto[] {
    const missingFields: FormFieldDto[] = [];
    
    if (!this.selectedSubmission || !this.submissionFields.length) {
      console.log('[FormSubmissionsList] validateRequiredFileFields: No submission or fields');
      return missingFields;
    }

    console.log('[FormSubmissionsList] validateRequiredFileFields: Checking', this.submissionFields.length, 'fields');
    console.log('[FormSubmissionsList] validateRequiredFileFields: fieldAttachments keys:', Object.keys(this.fieldAttachments));

    // Check all fields in submissionFields
    this.submissionFields.forEach(field => {
      // Check if field is required and is a file/image field
      if (this.isRequired(field) && this.isFileFieldByObject(field)) {
        const attachments = this.getFieldAttachments(field.id!);
        console.log(`[FormSubmissionsList] validateRequiredFileFields: Field ${field.id} (${field.fieldName || field.fieldCode}) - Required: ${this.isRequired(field)}, IsFile: ${this.isFileFieldByObject(field)}, Attachments: ${attachments.length}`);
        
        // Check if there are no attachments for this field
        // Also check if attachments exist but have no valid IDs (might be loading)
        const hasValidAttachments = attachments && attachments.length > 0 && attachments.some(att => att.id);
        
        if (!hasValidAttachments) {
          console.log(`[FormSubmissionsList] validateRequiredFileFields: ❌ Missing attachments for required field ${field.id} (${field.fieldName || field.fieldCode})`);
          missingFields.push(field);
        } else {
          console.log(`[FormSubmissionsList] validateRequiredFileFields: ✅ Field ${field.id} has ${attachments.length} valid attachment(s)`);
        }
      }
    });

    console.log('[FormSubmissionsList] validateRequiredFileFields: Missing fields:', missingFields.length);
    return missingFields;
  }

  saveSubmissionAsDraft(): void {
    // Prevent saving in view mode
    if (this.isViewMode) {
      console.warn('[FormSubmissionsList] Cannot save in view mode');
      return;
    }
    
    if (!this.selectedSubmission) {
      return;
    }

    this.loading.save = true;
    const formData = this.submissionForm.value;
    const updateDto: UpdateFormSubmissionDto = {
      documentNumber: formData.documentNumber || undefined,
      status: 'Draft' // Set status to Draft
    };

    // Update submission basic info with Draft status
    this.formSubmissionsService.updateSubmission(this.selectedSubmission.id, updateDto).subscribe({
      next: () => {
        // Update the form status to Draft
        this.submissionForm.patchValue({ status: 'Draft' });
        // Now update field values
        this.updateSubmissionFieldValues('Draft');
      },
      error: (error: any) => {
        this.loading.save = false;
        console.error('Error saving submission as draft:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to save submission as draft';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  updateSubmissionFieldValues(status?: string): void {
    if (!this.selectedSubmission || !this.selectedSubmission.fieldValues) {
        this.loading.save = false;
        const successMessage = status === 'Draft' 
          ? 'Form submission saved as draft successfully'
          : 'Form submission updated successfully';
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: successMessage
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
      const successMessage = status === 'Draft' 
        ? 'Form submission saved as draft successfully'
        : 'Form submission updated successfully';
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: successMessage
      });
      this.closeSubmissionModal();
      this.loadSubmissions();
      return;
    }

    // Execute all updates
    forkJoin(updateObservables).subscribe({
      next: () => {
        this.loading.save = false;
        const successMessage = status === 'Draft' 
          ? 'Form submission saved as draft successfully'
          : 'Form submission and values updated successfully';
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: successMessage
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
   * Add file/image fields that have attachments but no fieldValue
   */
  addFileFieldsWithAttachments(): void {
    if (!this.selectedSubmission) return;
    
    const fileFieldsWithoutValues: FormSubmissionValueDto[] = [];
    this.submissionFields.forEach(field => {
      if (this.isFileField(field.id!)) {
        // Check if this field has attachments
        const attachments = this.fieldAttachments[field.id!] || [];
        if (attachments.length > 0) {
          // Check if fieldValue already exists
          const existingValue = this.selectedSubmission!.fieldValues.find(fv => fv.fieldId === field.id);
          if (!existingValue) {
            // Create a placeholder fieldValue for display purposes
            fileFieldsWithoutValues.push({
              id: 0,
              submissionId: this.selectedSubmission!.id!,
              fieldId: field.id!,
              fieldCode: field.fieldCode || '',
              valueString: '',
              valueJson: '',
              valueNumber: undefined,
              valueDate: undefined,
              valueBool: undefined
            } as FormSubmissionValueDto);
            console.log(`[FormSubmissionsList] Added file field ${field.id} (${field.fieldCode || 'unknown'}) without fieldValue but with ${attachments.length} attachment(s)`);
          }
        }
      }
    });
    
    // Combine fieldValues with file fields that have attachments
    if (fileFieldsWithoutValues.length > 0) {
      this.selectedSubmission.fieldValues = [...this.selectedSubmission.fieldValues, ...fileFieldsWithoutValues];
      console.log(`[FormSubmissionsList] Added ${fileFieldsWithoutValues.length} file field(s) with attachments to fieldValues`);
      this.cdr.detectChanges();
    }
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
   * Also checks actual data in fieldValue to determine correct type
   */
  getFieldTypeById(fieldId: number, fieldValue?: FormSubmissionValueDto): string {
    // Fallback to field definition first to check for calculated type
    const field = this.submissionFields.find(f => f.id === fieldId);
    if (field) {
      const fieldTypeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase().trim();
      // Check for Calculated type
      if (fieldTypeName === 'calculated' || fieldTypeName.includes('calculated') || fieldTypeName.includes('formula')) {
        return 'calculated';
      }
    }
    
    // First, check actual data in fieldValue to determine type (most reliable)
    if (fieldValue) {
      if (fieldValue.valueNumber !== null && fieldValue.valueNumber !== undefined) {
        return 'number';
      }
      if (fieldValue.valueDate) {
        return 'date';
      }
      if (fieldValue.valueBool !== null && fieldValue.valueBool !== undefined) {
        return 'boolean';
      }
      if (fieldValue.valueJson) {
        return 'json';
      }
    }
    
    // Fallback to field definition
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
            if (this.isFileFieldByObject(field)) {
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

  isFileFieldByObject(field: FormFieldDto): boolean {
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
      if (!field.id || this.isFileFieldByObject(field)) return;

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

    // Check for Calculated type first
    if (fieldTypeName === 'calculated' || fieldTypeName.includes('calculated') || fieldTypeName.includes('formula')) {
      return 'calculated';
    }

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

  /**
   * Get field object from submissionFields by fieldId
   */
  getSubmissionField(fieldId: number): FormFieldDto | undefined {
    return this.submissionFields.find(f => f.id === fieldId);
  }

  /**
   * Get field value for calculated field display
   */
  getFieldValue(fieldValue: FormSubmissionValueDto): any {
    if (fieldValue.valueNumber !== null && fieldValue.valueNumber !== undefined) {
      return fieldValue.valueNumber;
    }
    if (fieldValue.valueString !== null && fieldValue.valueString !== undefined && fieldValue.valueString !== '') {
      return fieldValue.valueString;
    }
    if (fieldValue.valueDate) {
      return fieldValue.valueDate;
    }
    if (fieldValue.valueBool !== null && fieldValue.valueBool !== undefined) {
      return fieldValue.valueBool;
    }
    if (fieldValue.valueJson) {
      return fieldValue.valueJson;
    }
    return null;
  }

  getFieldPlaceholder(field: FormFieldDto | undefined): string {
    return field?.placeholder || 'Your answer';
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

  formatFileSize(sizeInBytes: number | null | undefined): string {
    if (!sizeInBytes || sizeInBytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
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

  /**
   * Check if a form control is disabled
   */
  isControlDisabled(controlName: string): boolean {
    const control = this.editSubmissionValuesForm.get(controlName);
    return control ? control.disabled : false;
  }

  /**
   * Get file name from field value or attachments
   */
  getFileNameFromValue(fieldValue: FormSubmissionValueDto): string | null {
    console.log(`[FormSubmissionsList] getFileNameFromValue for field ${fieldValue.fieldId}:`, {
      fieldId: fieldValue.fieldId,
      fieldCode: fieldValue.fieldCode,
      valueString: fieldValue.valueString,
      valueJson: fieldValue.valueJson,
      valueNumber: fieldValue.valueNumber,
      valueDate: fieldValue.valueDate,
      valueBool: fieldValue.valueBool
    });
    
    // First, check if attachments are loaded in fieldAttachments - use first attachment's file name
    const attachments = this.getFieldAttachments(fieldValue.fieldId);
    console.log(`[FormSubmissionsList] getFileNameFromValue - attachments for field ${fieldValue.fieldId}:`, {
      attachmentsCount: attachments.length,
      firstFileName: attachments.length > 0 ? attachments[0]?.fileName : null,
      fieldAttachments: this.fieldAttachments[fieldValue.fieldId]
    });
    
    if (attachments.length > 0 && attachments[0].fileName) {
      console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ Returning file name from attachments: ${attachments[0].fileName}`);
      return attachments[0].fileName;
    }
    
    // Also check selectedSubmission.attachments if available
    if (this.selectedSubmission?.attachments && this.selectedSubmission.attachments.length > 0) {
      const fieldAttachment = this.selectedSubmission.attachments.find(att => att.fieldId === fieldValue.fieldId);
      if (fieldAttachment && fieldAttachment.fileName) {
        console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ Returning file name from selectedSubmission.attachments: ${fieldAttachment.fileName}`);
        return fieldAttachment.fileName;
      }
    }
    
    // Try to extract file name from valueString
    if (fieldValue.valueString && fieldValue.valueString.trim() !== '') {
      console.log(`[FormSubmissionsList] getFileNameFromValue - Checking valueString: "${fieldValue.valueString}"`);
      // Skip if it's JSON configuration (like allowedExtensions)
      if (fieldValue.valueString.includes('allowedExtensions') || fieldValue.valueString.includes('customExtensions')) {
        console.log(`[FormSubmissionsList] getFileNameFromValue - valueString is JSON configuration, skipping`);
      } else {
        // Check if valueString contains file path or name
        const fileName = fieldValue.valueString.split('/').pop() || fieldValue.valueString.split('\\').pop();
        if (fileName && fileName !== fieldValue.valueString) {
          console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ Extracted file name from valueString path: ${fileName}`);
          return fileName;
        }
        // If valueString looks like a file name (has extension), return it
        if (/\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(fieldValue.valueString)) {
          console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ valueString looks like file name: ${fieldValue.valueString}`);
          return fieldValue.valueString;
        }
        // If valueString doesn't look like JSON config, it might be a file name
        if (!fieldValue.valueString.startsWith('{') && !fieldValue.valueString.startsWith('[')) {
          console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ valueString is not JSON, using as file name: ${fieldValue.valueString}`);
          return fieldValue.valueString;
        }
      }
    }
    
    // Try to extract from valueJson
    if (fieldValue.valueJson) {
      console.log(`[FormSubmissionsList] getFileNameFromValue - Checking valueJson: "${fieldValue.valueJson}"`);
      try {
        let parsed = JSON.parse(fieldValue.valueJson);
        console.log(`[FormSubmissionsList] getFileNameFromValue - Parsed valueJson:`, parsed);
        
        // Handle double-encoded JSON strings
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
            console.log(`[FormSubmissionsList] getFileNameFromValue - Double-parsed valueJson:`, parsed);
          } catch {
            // Not nested JSON
            console.log(`[FormSubmissionsList] getFileNameFromValue - valueJson is string, not nested JSON`);
          }
        }
        
        if (typeof parsed === 'object' && parsed !== null) {
          // Check for fileName property first
          if (parsed.fileName && typeof parsed.fileName === 'string') {
            console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ Found fileName in parsed JSON: ${parsed.fileName}`);
            return parsed.fileName;
          }
          // Check for filePath property
          if (parsed.filePath && typeof parsed.filePath === 'string') {
            const fileName = parsed.filePath.split('/').pop() || parsed.filePath.split('\\').pop();
            console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ Extracted file name from filePath: ${fileName}`);
            return fileName || parsed.filePath;
          }
          // Check for name property
          if (parsed.name && typeof parsed.name === 'string') {
            console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ Found name in parsed JSON: ${parsed.name}`);
            return parsed.name;
          }
          // Check all keys in the parsed object
          console.log(`[FormSubmissionsList] getFileNameFromValue - Parsed object keys:`, Object.keys(parsed));
          console.log(`[FormSubmissionsList] getFileNameFromValue - Parsed object values:`, Object.values(parsed));
        }
      } catch (error) {
        console.log(`[FormSubmissionsList] getFileNameFromValue - Error parsing valueJson:`, error);
        // Not valid JSON, might be a file name string
        if (fieldValue.valueJson && /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(fieldValue.valueJson)) {
          console.log(`[FormSubmissionsList] getFileNameFromValue - ✅ valueJson looks like file name: ${fieldValue.valueJson}`);
          return fieldValue.valueJson;
        }
      }
    }
    
    console.log(`[FormSubmissionsList] getFileNameFromValue - ❌ No file name found for field ${fieldValue.fieldId}`);
    return null;
  }

  /**
   * Open approve/reject modal
   */
  openApproveRejectModal(submission: FormSubmissionDto, actionType: 'approve' | 'reject'): void {
    this.selectedSubmissionForAction = submission;
    this.actionType = actionType;
    this.approveRejectForm.reset({ comments: '' });
    this.currentStageId = null;
    
    // Try to get current stage from approval inbox
    const currentUserId = this.storageService.getUserId()?.toString() || this.authService.userName();
    if (currentUserId && submission.status === 'Submitted') {
      this.loadingApproveReject = true;
      this.approvalWorkflowRuntimeService.getApprovalInboxForUser(currentUserId).subscribe({
        next: (inboxItems: ApprovalInboxItemDto[]) => {
          const inboxItem = inboxItems.find(item => item.submissionId === submission.id);
          if (inboxItem) {
            this.currentStageId = inboxItem.stageId;
          }
          this.loadingApproveReject = false;
          this.showApproveRejectModal = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading approval inbox:', error);
          this.loadingApproveReject = false;
          // Still show modal, user can enter stageId manually if needed
          this.showApproveRejectModal = true;
          this.cdr.detectChanges();
        }
      });
    } else {
      // If not submitted or no user ID, show modal anyway
      this.showApproveRejectModal = true;
      this.cdr.detectChanges();
    }
  }

  /**
   * Process approve/reject action
   */
  processApproveRejectAction(): void {
    if (!this.selectedSubmissionForAction || !this.actionType) {
      return;
    }

    // Check if user is authenticated
    const token = this.storageService.getToken();
    if (!token) {
      this.messageService.add({
        severity: 'error',
        summary: 'Authentication Required',
        detail: 'Please log in to approve or reject submissions.',
        life: 5000
      });
      return;
    }

    const formData = this.approveRejectForm.value;
    const currentUserId = this.storageService.getUserId()?.toString() || this.authService.userName();
    
    if (!currentUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User ID not found. Please log in again.',
        life: 5000
      });
      return;
    }

    // If stageId is not found from inbox, we need to get it from the workflow
    // For now, we'll require it to be set. In a real scenario, you might want to
    // load it from the submission's workflow or allow manual entry
    if (!this.currentStageId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Stage ID not found. Please ensure the submission is in a workflow stage.'
      });
      return;
    }

    this.loadingApproveReject = true;

    if (this.actionType === 'approve') {
      // Use DTO-based method
      const approveDto: ApproveSubmissionDto = {
        submissionId: this.selectedSubmissionForAction.id,
        stageId: this.currentStageId,
        actionByUserId: currentUserId,
        comments: formData.comments || null
      };

      this.formSubmissionsService.approveSubmissionDto(approveDto).subscribe({
        next: (response: ApiResponse<FormSubmissionDto>) => {
          this.loadingApproveReject = false;
          
          if (response.statusCode === 200 || response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: response.message || 'Form submission approved successfully'
            });
            this.closeApproveRejectModal();
            this.loadSubmissions(); // Reload submissions to update status
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: response.message || 'Approval completed with warnings'
            });
          }
        },
        error: (error) => {
          this.loadingApproveReject = false;
          console.error('Error approving submission:', error);
          
          // Extract detailed error message
          let errorMessage = 'Failed to approve form submission';
          
          if (error?.message) {
            errorMessage = error.message;
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.status === 404) {
            errorMessage = 'Approve endpoint not found. Please ensure the backend API is running and contains the /api/FormSubmissions/approve endpoint.';
          } else if (error?.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else if (error?.status === 0) {
            errorMessage = 'Cannot connect to the server. Please ensure the backend API is running on https://localhost:7276';
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.cdr.detectChanges();
        }
      });
    } else if (this.actionType === 'reject') {
      // Use DTO-based method
      const rejectDto: RejectSubmissionDto = {
        submissionId: this.selectedSubmissionForAction.id,
        stageId: this.currentStageId,
        actionByUserId: currentUserId,
        comments: formData.comments || null
      };

      this.formSubmissionsService.rejectSubmissionDto(rejectDto).subscribe({
        next: (response: ApiResponse<FormSubmissionDto>) => {
          this.loadingApproveReject = false;
          
          if (response.statusCode === 200 || response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: response.message || 'Form submission rejected successfully'
            });
            this.closeApproveRejectModal();
            this.loadSubmissions(); // Reload submissions to update status
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: response.message || 'Rejection completed with warnings'
            });
          }
        },
        error: (error) => {
          this.loadingApproveReject = false;
          console.error('Error rejecting submission:', error);
          
          // Extract detailed error message
          let errorMessage = 'Failed to reject form submission';
          
          if (error?.message) {
            errorMessage = error.message;
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.status === 404) {
            errorMessage = 'Reject endpoint not found. Please ensure the backend API is running and contains the /api/FormSubmissions/reject endpoint.';
          } else if (error?.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else if (error?.status === 0) {
            errorMessage = 'Cannot connect to the server. Please ensure the backend API is running on https://localhost:7276';
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Close approve/reject modal
   */
  closeApproveRejectModal(): void {
    this.showApproveRejectModal = false;
    this.selectedSubmissionForAction = null;
    this.actionType = null;
    this.currentStageId = null;
    this.approveRejectForm.reset({ comments: '' });
  }

  /**
   * Check if submission can be approved/rejected
   */
  canApproveReject(submission: FormSubmissionDto): boolean {
    // Only allow approve/reject for Submitted status
    return submission.status === 'Submitted';
  }
}

