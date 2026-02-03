import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSubmissionsService, CreateFormSubmissionDto, FormSubmissionDto, FormSubmissionDetailDto, FormSubmissionGridDto, SaveFormSubmissionDataDto, SaveFormSubmissionValueDto, SaveFormSubmissionAttachmentDto, SaveFormSubmissionGridDto } from '../services/form-submissions.service';
// Approve/Reject imports removed - only available in admin dashboard
import { FormSubmissionValuesService, BulkFormSubmissionValuesDto, CreateFormSubmissionValueDto, UpdateFormSubmissionValueDto } from '../services/form-submission-values.service';
import { FormSubmissionAttachmentsService, CreateFormSubmissionAttachmentDto, FormSubmissionAttachmentDto } from '../services/form-submission-attachments.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType, DocumentSeries, CreateDocumentSeriesDto } from '../../FormBuilder/form-builder/models/document-types.model';
import { DocumentSettingsService } from '../../FormBuilder/services/document-settings.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { FieldDataSourceService } from '../../FormBuilder/services/field-data-source.service';
import { RuleEvaluationService, FieldState } from '../../FormBuilder/services/rule-evaluation.service';
import { FormRulesService } from '../../FormBuilder/services/form-rules.service';
import { buildContext, getContextFieldCodes, requiresContext } from '../../FormBuilder/utils/field-data-source-helpers';
import { CalculationEngineService } from '../../FormBuilder/services/calculation-engine.service';
import { FormBuilderDto, FormTabDto, FormFieldDto, FieldOptionResponse, FieldTypeDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../auth/auth.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FileUploadService } from '../../FormBuilder/services/file-upload.service';
import { CalculatedFieldComponent } from '../../public-form/components/calculated-field.component';
import { GridViewComponent } from '../../public-form/components/grid-view.component';
import { DocumentApprovalHistoryService, CreateDocumentApprovalHistoryDto } from '../../FormBuilder/services/document-approval-history.service';
import { ApprovalWorkflowRuntimeService } from '../../FormBuilder/services/approval-workflow-runtime.service';
import { ApprovalWorkflowService } from '../../FormBuilder/services/approval-workflow.service';
import { ApprovalStageService } from '../../FormBuilder/services/approval-stage.service';
import { GridService } from '../../FormBuilder/services/grid.service';
import { FormGridDto } from '../../FormBuilder/form-builder/models/grid-dto.model';

@Component({
  selector: 'app-form-submission-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    CheckboxModule,
    CalculatedFieldComponent,
    GridViewComponent,
    TranslatePipe
  ],
  templateUrl: './form-submission-create.component.html',
  styleUrls: ['./form-submission-create.component.scss'],
  providers: [MessageService]
})
export class FormSubmissionCreateComponent implements OnInit, OnDestroy {
  documentTypeId!: number;
  documentType: DocumentType | null = null;
  submissionId: number | null = null; // For edit mode
  isEditMode = false; // Flag to determine if we're editing

  // Draft → Save → Submit workflow state
  hasDraft = false; // Whether a draft has been created
  isDraftMode = true; // Whether we're in draft mode (before final submit)
  isSubmitting = false; // Whether final submit is in progress
  
  // Submission approval/reject state
  currentSubmission: FormSubmissionDto | null = null;
  currentSubmissionDetail: FormSubmissionDetailDto | null = null; // Store full submission detail with gridData
  // Approve/Reject functionality removed - only available in admin dashboard

  // Forms, Tabs, Fields
  forms: FormBuilderDto[] = [];
  tabs: FormTabDto[] = [];
  fields: FormFieldDto[] = [];
  selectedFormId: number | null = null;
  selectedTabId: number | null = null;
  activeTabIndex = 0;
  currentForm: FormBuilderDto | null = null;

  // Forms
  submissionForm!: FormGroup;
  fieldsForm!: FormGroup;
  fieldFiles: { [fieldId: number]: File[] } = {};
  existingAttachments: { [fieldId: number]: FormSubmissionAttachmentDto[] } = {}; // Store existing attachments for edit mode
  deletedAttachments: number[] = []; // Track deleted attachment IDs to delete from server

  // Field DataSource state
  fieldDataSourceOptions: { [fieldId: number]: FieldOptionResponse[] } = {}; // Options loaded from DataSource
  loadingFieldOptions: { [fieldId: number]: boolean } = {}; // Loading state for each field
  private _cachedMappedOptions: { [fieldId: number]: any[] } = {}; // Cache for mapped DataSource options
  private _cachedStaticOptions: { [fieldId: number]: any[] } = {}; // Cache for static options
  private _loggedFieldOptions: { [fieldId: number]: boolean } = {}; // Track logged fields to avoid console spam

  // Form Rules state - Dynamic field states based on rules
  dynamicFieldStates: {
    [fieldCode: string]: {
      isVisible?: boolean;
      isRequired?: boolean;
      isReadOnly?: boolean;
      value?: any;
    }
  } = {};
  fieldValues: { [fieldCode: string]: any } = {}; // Track field values for rule evaluation
  
  // Track calculation errors for each field
  calculationErrors: { [fieldId: number]: string } = {};

  // Track validation errors for each field (for inline validation display)
  fieldValidationErrors: { [fieldCode: string]: string } = {};
  // Track blocking rule errors for each field
  blockingRuleErrors: { [fieldCode: string]: string } = {};
  // General blocking error message when no specific field is identified
  generalBlockingError: string = '';

  // Track which fields depend on context for reloading options
  private contextDependencies: { [fieldId: number]: string[] } = {}; // fieldId -> array of context field codes

  // Field Types cache - loaded from API
  fieldTypes: FieldTypeDto[] = []; // Active field types loaded from API
  fieldTypesMap: { [id: number]: FieldTypeDto } = {}; // Map for quick lookup by ID
  private _fieldTypeCache: { [fieldId: number]: string } = {}; // Cache field types to avoid recalculation

  // Document Series
  documentSeries: DocumentSeries[] = [];

  // Loading States
  loading = {
    documentType: false,
    create: false,
    series: false,
    forms: false,
    tabs: false,
    fields: false,
    uploading: false
  };

  // Grid components reference
  @ViewChildren(GridViewComponent) gridComponents!: QueryList<GridViewComponent>;

  // Grids for each tab (grids that are not associated with fields)
  tabGrids: { [tabId: number]: FormGridDto[] } = {};

  private routeSubscription?: Subscription;
  private fieldsFormValueChangesSubscription?: Subscription;
  private isEvaluatingRules = false; // Flag to prevent infinite loops

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formSubmissionsService: FormSubmissionsService,
    private formSubmissionValuesService: FormSubmissionValuesService,
    private formSubmissionAttachmentsService: FormSubmissionAttachmentsService,
    private documentTypesService: DocumentTypesService,
    private documentSettingsService: DocumentSettingsService,
    private projectsService: ProjectsService,
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private fieldDataSourceService: FieldDataSourceService,
    private ruleEvaluationService: RuleEvaluationService,
    private formRulesService: FormRulesService,
    private calculationEngine: CalculationEngineService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    public translationService: TranslationService,
    private authService: AuthService,
    public fileUploadService: FileUploadService,
    private documentApprovalHistoryService: DocumentApprovalHistoryService,
    private approvalWorkflowRuntimeService: ApprovalWorkflowRuntimeService,
    private approvalStageService: ApprovalStageService,
    private approvalWorkflowService: ApprovalWorkflowService,
    private gridService: GridService
  ) {
    // Submission form
    this.submissionForm = this.fb.group({
      formBuilderId: [null], // Will be set from documentType
      tabId: [null, [Validators.required]],
      status: ['Submitted'] // Default status is Submitted
    });

    // Fields form
    this.fieldsForm = this.fb.group({});
  }

  ngOnInit(): void {
    // Load field types first (they will be used as fallback in getFieldType)
    this.loadFieldTypes();
    
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }

    // Get documentTypeId and submissionId from route
    this.routeSubscription = this.route.params.subscribe(params => {
      this.documentTypeId = +params['documentTypeId'];
      this.submissionId = params['submissionId'] ? +params['submissionId'] : null;
      this.isEditMode = !!this.submissionId;
      
      if (this.documentTypeId && !isNaN(this.documentTypeId)) {
        this.loadDocumentType();
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
    if (this.fieldsFormValueChangesSubscription) {
      this.fieldsFormValueChangesSubscription.unsubscribe();
    }
  }

  loadDocumentType(): void {
    this.loading.documentType = true;
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentType = types.find(t => t.id === this.documentTypeId) || null;
        
        // Log approval workflow configuration (Task 2)
        if (this.documentType) {
          console.log(`[FormSubmissionCreate] Document Type loaded:`, {
            id: this.documentType.id,
            name: this.documentType.name,
            approvalWorkflowId: this.documentType.approvalWorkflowId,
            approvalWorkflowName: this.documentType.approvalWorkflowName,
            hasWorkflow: !!this.documentType.approvalWorkflowId
          });
        }
        
        this.loadDocumentSeries();
        // Set formBuilderId from documentType
        if (this.documentType?.formBuilderId) {
          this.submissionForm.patchValue({ formBuilderId: this.documentType.formBuilderId });
          this.loadForms();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Document type does not have a form associated with it'
          });
          this.loading.documentType = false;
          this.cdr.detectChanges();
        }
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

  loadDocumentSeries(): void {
    if (!this.documentTypeId) return;
    
    this.loading.series = true;
    this.documentTypesService.getDocumentSeriesByDocumentTypeId(this.documentTypeId).subscribe({
      next: (series: DocumentSeries[]) => {
        // First priority: Use active series
        // Backend returns isActive as boolean (verified)
        const activeSeries = series.filter(s => s.isActive === true);
        if (activeSeries.length > 0) {
          this.documentSeries = activeSeries;
        } else {
          // Second priority: Use any series (even if inactive) - better than no series
          if (series.length > 0) {
            this.documentSeries = series;
            console.warn('[FormSubmissionCreate] No active series found, using first available series (may be inactive)');
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: 'No active document series found. Using inactive series if available.'
            });
          } else {
            this.documentSeries = [];
          }
        }
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

  /**
   * Create a default document series automatically
   * Loads projectId dynamically from query params or API
   */
  private async createDefaultSeries(): Promise<DocumentSeries | null> {
    if (!this.documentTypeId) {
      return null;
    }

    try {
      // Get projectId from query params first, then load from API
      const routeQueryParams = this.route.snapshot.queryParams;
      let projectId: number | null = routeQueryParams['projectId'] ? +routeQueryParams['projectId'] : null;
      
      // If no projectId in query params, load from API
      if (!projectId) {
        try {
          const projects = await this.projectsService.getActiveProjects().toPromise();
          if (projects && projects.length > 0 && projects[0]?.id) {
            projectId = projects[0].id;
            console.log('[FormSubmissionCreate] No projectId in query params, using first active project:', projectId);
          }
        } catch (error) {
          console.warn('[FormSubmissionCreate] Could not load projects from API:', error);
        }
      }
      
      // If still no projectId, cannot create series
      if (!projectId) {
        console.warn('[FormSubmissionCreate] No projectId available (not in query params and API failed), cannot create default series');
        return null;
      }

      // Generate a series code based on document type
      const seriesCode = `SERIES-${this.documentTypeId}-${Date.now().toString().slice(-6)}`;
      
      const createSeriesDto: CreateDocumentSeriesDto = {
        documentTypeId: this.documentTypeId,
        projectId: projectId,
        seriesCode: seriesCode,
        nextNumber: 1,
        isDefault: true,
        isActive: true
      };
      
      console.log('[FormSubmissionCreate] Creating default document series:', createSeriesDto);
      
      const newSeries = await new Promise<DocumentSeries>((resolve, reject) => {
        this.documentTypesService.createDocumentSeries(createSeriesDto).subscribe({
          next: (result) => resolve(result),
          error: (err) => reject(err)
        });
      });
      
      if (newSeries && newSeries.id) {
        console.log('[FormSubmissionCreate] ✅ Default document series created successfully:', newSeries.id);
        // Add to documentSeries array
        this.documentSeries = [newSeries];
        return newSeries;
      } else {
        throw new Error('Failed to create document series - no ID returned');
      }
    } catch (error: any) {
      console.error('[FormSubmissionCreate] Failed to create default document series:', error);
      return null;
    }
  }

  loadForms(): void {
    if (!this.documentType?.formBuilderId) {
      return;
    }

    this.loading.forms = true;
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        this.forms = (result.items || []).filter(f => f.isPublished && f.isActive);
        // Auto-select form from documentType
        const formId = this.documentType!.formBuilderId!;
        const formExists = this.forms.some(f => f.id === formId);
        if (formExists) {
          this.currentForm = this.forms.find(f => f.id === formId) || null;
          if (this.currentForm) {
            this.loadFormRules(this.currentForm.id!);
          }
          this.onFormSelected(formId);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Form associated with this document type is not available'
          });
        }
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

  onFormSelected(formId: number | null): void {
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
    
    // If in edit mode, load submission data after form is selected
    // This will load field values, and attachments will be loaded after fields are loaded in processFields
    if (this.isEditMode && this.submissionId) {
      this.loadSubmissionForEdit();
    }
    // Don't create draft automatically - user will create submission directly when submitting
  }

  loadTabs(formId: number): void {
    if (!formId || isNaN(formId) || formId <= 0) {
      this.tabs = [];
      return;
    }

    this.loading.tabs = true;
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs: FormTabDto[]) => {
        this.tabs = tabs.filter(t => t.isActive).sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
        // Load grids for tabs
        this.loadTabGrids();
        // Auto-select first tab
        if (this.tabs.length > 0) {
          this.activeTabIndex = 0;
          this.onTabSelected(this.tabs[0].id || null);
        }
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

  /**
   * Load grids for each tab (grids that are not associated with fields)
   */
  loadTabGrids(): void {
    if (!this.tabs || this.tabs.length === 0) {
      return;
    }

    // Get all gridIds that are already associated with fields
    const fieldGridIds = new Set<number>();
    this.tabs.forEach(tab => {
      tab.fields?.forEach(field => {
        if (field.gridId && field.gridId > 0) {
          fieldGridIds.add(field.gridId);
        }
      });
    });

    // Load grids for each tab
    this.tabs.forEach(tab => {
      if (!tab.id) return;

      // Try to load grids - use getGridsByTabId first, then filter for active ones
      this.gridService.getGridsByTabId(tab.id).subscribe({
        next: (response) => {
          const allGrids = response.data || [];
          // Filter for active grids only
          const activeGrids = allGrids.filter(grid => grid.isActive);
          // Filter out grids that are already associated with fields
          const standaloneGrids = activeGrids.filter(grid => !fieldGridIds.has(grid.id));
          // Sort by gridOrder
          standaloneGrids.sort((a, b) => (a.gridOrder || 0) - (b.gridOrder || 0));
          this.tabGrids[tab.id!] = standaloneGrids;
          this.cdr.detectChanges();
        },
        error: (error) => {
          // Silently handle 404 (no grids for this tab) - this is normal
          if (error?.status === 404) {
            this.tabGrids[tab.id!] = [];
          } else {
            console.warn(`[FormSubmissionCreate] Failed to load grids for tab ${tab.id}:`, error);
            this.tabGrids[tab.id!] = [];
          }
        }
      });
    });
  }

  /**
   * Get grids for a specific tab
   */
  getTabGrids(tabId: number): FormGridDto[] {
    return this.tabGrids[tabId] || [];
  }

  /**
   * Create draft submission if needed (for new submissions)
   */
  async createDraftIfNeeded(): Promise<void> {
    // Only create draft if we have form data and no existing submission
    if (!this.selectedFormId || this.hasDraft || this.isEditMode) {
      return;
    }

    // Get current user ID (you might need to adjust this based on your auth service)
    const currentUserId = this.authService.userName();
    if (!currentUserId) {
      console.warn('[FormSubmissionCreate] No current user found, cannot create draft');
      return;
    }

    // Get project ID from query params first, then load from API (like public-form)
    const routeQueryParams = this.route.snapshot.queryParams;
    let projectId: number | null = routeQueryParams['projectId'] ? +routeQueryParams['projectId'] : null;

    // Validate and load active projectId if the provided one is inactive/soft-deleted (like public-form)
    const loadActiveProjectId = async (projId: number | null): Promise<number | null> => {
      if (!projId) {
        // No projectId in query params, load from API
        try {
          const projects = await this.projectsService.getActiveProjects().toPromise();
          if (projects && projects.length > 0 && projects[0]?.id) {
            console.log('[FormSubmissionCreate] No projectId in query params, using first active project:', projects[0].id);
            return projects[0].id;
          }
        } catch (error) {
          console.warn('[FormSubmissionCreate] Error loading active projects:', error);
        }
        return null;
      }

      try {
        const project = await this.projectsService.getProjectById(projId).toPromise();
        if (project && project.isActive && !project.isDeleted) {
          console.log('[FormSubmissionCreate] ProjectId from query params is active:', projId);
          return projId;
        } else {
          console.warn('[FormSubmissionCreate] ProjectId from query params is inactive or deleted, loading active one');
          try {
            const activeProjects = await this.projectsService.getActiveProjects().toPromise();
            if (activeProjects && activeProjects.length > 0 && activeProjects[0]?.id) {
              console.log('[FormSubmissionCreate] Using active projectId:', activeProjects[0].id);
              return activeProjects[0].id;
            }
          } catch (error) {
            console.warn('[FormSubmissionCreate] Error loading active projects:', error);
          }
        }
      } catch (error) {
        console.warn('[FormSubmissionCreate] Error checking projectId, trying to load active:', error);
        try {
          const activeProjects = await this.projectsService.getActiveProjects().toPromise();
          if (activeProjects && activeProjects.length > 0 && activeProjects[0]?.id) {
            return activeProjects[0].id;
          }
        } catch (e) {
          console.error('[FormSubmissionCreate] Error loading active projects:', e);
        }
      }
      // Fallback to original if we can't find an active one
      return projId;
    };

    // Load active projectId
    const resolvedProjectId = await loadActiveProjectId(projectId);
    if (!resolvedProjectId) {
      console.warn('[FormSubmissionCreate] No projectId available (not in query params and API failed), cannot create draft');
      return;
    }
    projectId = resolvedProjectId;

    // Get seriesId from query params first, then fallback to documentSeries
    let seriesId: number | undefined;
    const querySeriesId = routeQueryParams['seriesId'] ? +routeQueryParams['seriesId'] : null;
    
    if (querySeriesId && querySeriesId > 0) {
      // Verify seriesId from query params - if 404, ignore error and continue without seriesId
      try {
        const verifiedSeries = await this.documentTypesService.getDocumentSeriesById(querySeriesId).pipe(
          catchError(error => {
            // Check for 404: either from HttpErrorResponse (error.status) or from service (error.message)
            if (error.status === 404 || error.message === 'Document series not found') {
              // Ignore 404 error and continue without seriesId - series will be auto-selected
              console.warn(`[FormSubmissionCreate] Series ID ${querySeriesId} not found (404), will auto-select series`);
              return of(null); // Return null to indicate series not found
            }
            // Re-throw other errors
            throw error;
          })
        ).toPromise();
        
        if (verifiedSeries && verifiedSeries.id) {
          // Check if series belongs to the correct documentTypeId
          if (verifiedSeries.documentTypeId !== this.documentTypeId) {
            console.warn('[FormSubmissionCreate] SeriesId from query params does not belong to documentTypeId:', {
              seriesId: querySeriesId,
              seriesDocumentTypeId: verifiedSeries.documentTypeId,
              requiredDocumentTypeId: this.documentTypeId
            });
            // Don't use this series - it belongs to a different document type
            // Will continue without seriesId for auto-selection
            seriesId = undefined;
          } else {
            // Series is valid - use its projectId and seriesId
            seriesId = verifiedSeries.id;
            // Use projectId from verifiedSeries to ensure consistency (if series has projectId)
            if (verifiedSeries.projectId) {
              projectId = verifiedSeries.projectId;
              console.log('[FormSubmissionCreate] Using projectId from verifiedSeries:', projectId);
            }
            console.log('[FormSubmissionCreate] Using seriesId from query params:', seriesId, {
              projectId: projectId,
              documentTypeId: verifiedSeries.documentTypeId,
              isActive: verifiedSeries.isActive
            });
          }
        } else {
          // Series not found (404) - will continue without seriesId for auto-selection
          console.warn('[FormSubmissionCreate] SeriesId from query params not found, will auto-select series');
        }
      } catch (error: any) {
        // Handle any other errors (non-404)
        console.warn('[FormSubmissionCreate] Failed to verify seriesId from query params:', querySeriesId, error);
        // Continue without seriesId - will auto-select
      }
    }
    
    // If no seriesId from query params, get from documentSeries (use default or first active series)
    if (!seriesId) {
      if (this.documentSeries && this.documentSeries.length > 0) {
        const defaultSeries = this.documentSeries.find(s => s.isDefault) || this.documentSeries[0];
        if (defaultSeries && defaultSeries.id) {
          seriesId = defaultSeries.id;
        }
      }
    }

    // If still no seriesId, allow backend to auto-select (seriesId is optional)
    // Don't show error - backend will auto-select series when seriesId is not provided

    // Ensure projectId is not null (TypeScript check)
    if (!projectId) {
      console.warn('[FormSubmissionCreate] projectId is null, cannot create draft');
      return;
    }

    // Create a const with correct type for TypeScript
    const finalProjectId: number = projectId;

    console.log('[FormSubmissionCreate] Creating draft submission:', {
      formBuilderId: this.selectedFormId,
      projectId: finalProjectId,
      seriesId,
      submittedByUserId: currentUserId
    });

    this.loading.create = true;
    this.formSubmissionsService.createDraft(this.selectedFormId, finalProjectId, currentUserId, seriesId).subscribe({
      next: (draftSubmission) => {
        console.log('[FormSubmissionCreate] Draft created successfully:', draftSubmission);
        this.submissionId = draftSubmission.id!;
        this.hasDraft = true;
        this.isDraftMode = true;
        this.currentSubmission = draftSubmission;

        // Update submissionId in all grid components after draft is created
        this.updateGridComponentsSubmissionId();

        this.messageService.add({
          severity: 'success',
          summary: 'Draft Created',
          detail: 'Draft submission has been created successfully',
          life: 3000
        });

        this.loading.create = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[FormSubmissionCreate] Error creating draft:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create draft submission'
        });
        this.loading.create = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTabSelected(tabId: number | null): void {
    if (!tabId || isNaN(tabId) || tabId <= 0) {
      this.selectedTabId = null;
      this.fields = [];
      this.fieldFiles = {};
      this.fieldsForm = this.fb.group({});
      // Clear caches when clearing tab
      this._cachedMappedOptions = {};
      this._cachedStaticOptions = {};
      this._loggedFieldOptions = {};
      this.loading.fields = false;
      return;
    }

    this.selectedTabId = tabId;
    this.submissionForm.patchValue({ tabId: tabId });
    // Clear caches when switching tabs
    this._cachedMappedOptions = {};
    this._cachedStaticOptions = {};
    this._loggedFieldOptions = {};
    this.loadFields(tabId);
  }

  setActiveTab(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.activeTabIndex = index;
      const tab = this.tabs[index];
      this.onTabSelected(tab.id || null);
      this.cdr.detectChanges();
    }
  }

  getTabName(tab: FormTabDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && tab.foreignTabName) {
      return tab.foreignTabName;
    }
    return tab.tabName || '';
  }

  getFormName(formId: number): string {
    const form = this.forms.find(f => f.id === formId);
    if (!form) return '';
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && form.foreignFormName) {
      return form.foreignFormName;
    }
    return form.formName || '';
  }

  loadFields(tabId: number): void {
    if (!this.selectedFormId || !tabId) {
      this.loading.fields = false;
      return;
    }
    
    // If edit mode, load submission data will be called after fields are loaded in processFields
    // This ensures fields are available before loading attachments

    console.log('[FormSubmissionCreate] Loading form with fields (including fieldDataSource) for form:', this.selectedFormId, 'tab:', tabId);
    this.loading.fields = true;
    
    // First, get formCode from currentForm or load form to get formCode
    const formCode = this.currentForm?.formCode;
    
    if (formCode) {
      // Use getFormByCode (like FormViewComponent) to get complete form with tabs, fields, and fieldDataSource
      console.log('[FormSubmissionCreate] Loading form by code:', formCode);
      this.formsService.getFormByCode(formCode).subscribe({
        next: (form: FormBuilderDto | null) => {
          if (!form) {
            console.error('[FormSubmissionCreate] Form not found by code:', formCode);
            this.loadFieldsFallback(tabId);
            return;
          }
          
          console.log('[FormSubmissionCreate] Form loaded by code:', form?.id);
          console.log('[FormSubmissionCreate] Form tabs count:', form.tabs?.length || 0);
          console.log('[FormSubmissionCreate] Form tab IDs:', form.tabs?.map(t => t.id) || []);
          
          // Find the selected tab in the form
          const selectedTab = form.tabs?.find(tab => tab.id === tabId);
          
          if (!selectedTab) {
            console.warn('[FormSubmissionCreate] Tab not found in form loaded by code, using fallback');
            this.loadFieldsFallback(tabId);
            return;
          }
          
          // Extract fields from the tab (these should include fieldDataSource)
          const fields = selectedTab.fields || [];
          
          if (fields.length === 0) {
            console.warn('[FormSubmissionCreate] Tab from form has no fields, using fallback');
            this.loadFieldsFallback(tabId);
            return;
          }
          
          console.log('[FormSubmissionCreate] Fields loaded from form (by code):', fields.length);
          
          // Log fieldDataSource info
          const fieldsWithDataSource = fields.filter(f => f.fieldDataSource && f.fieldDataSource.isActive);
          console.log(`[FormSubmissionCreate] Tab ${tabId} has ${fields.length} fields, ${fieldsWithDataSource.length} with DataSource`);
          fieldsWithDataSource.forEach(f => {
            console.log(`[FormSubmissionCreate] - Field ${f.id} (${f.fieldCode || 'no-code'}):`, {
              sourceType: f.fieldDataSource?.sourceType,
              apiUrl: f.fieldDataSource?.apiUrl
            });
          });
          
          this.processFields(fields).catch(error => {
            console.error('[FormSubmissionCreate] Error processing fields:', error);
            this.loading.fields = false;
          });
        },
        error: (error) => {
          console.error('[FormSubmissionCreate] Error loading form by code:', error);
          this.loadFieldsFallback(tabId);
        }
      });
    } else {
      // Fallback: load form by ID, then load fields separately
      console.warn('[FormSubmissionCreate] No formCode available, using fallback method');
      this.loadFieldsFallback(tabId);
    }
  }

  /**
   * Fallback method to load fields when form doesn't contain tabs/fields
   * Loads fields from fieldsService and tries to enrich with fieldDataSource from form
   */
  private loadFieldsFallback(tabId: number): void {
    if (!this.selectedFormId) {
      console.error('[FormSubmissionCreate] Cannot load fields: selectedFormId is null');
      this.loading.fields = false;
      return;
    }

    console.log('[FormSubmissionCreate] Loading fields using fallback method');
    
    // Load fields from fieldsService
    const formId = this.selectedFormId; // Store in local variable for TypeScript
    this.fieldsService.getFields(formId, tabId).subscribe({
      next: (fieldsFromService: FormFieldDto[]) => {
        console.log('[FormSubmissionCreate] Fields loaded from fieldsService:', fieldsFromService.length);
        
        // Try to enrich fields with fieldDataSource from form
        // First, try to load form by ID to get fieldDataSource
        if (!formId) {
          this.processFields(fieldsFromService).catch(error => {
            console.error('[FormSubmissionCreate] Error processing fields:', error);
            this.loading.fields = false;
          });
          return;
        }
        this.formsService.getFormById(formId).subscribe({
          next: (form: FormBuilderDto) => {
            // Try to match fields and copy fieldDataSource
            if (form.tabs) {
              form.tabs.forEach(tab => {
                if (tab.fields) {
                  tab.fields.forEach(formField => {
                    const matchingField = fieldsFromService.find(f => f.id === formField.id);
                    if (matchingField && formField.fieldDataSource) {
                      console.log(`[FormSubmissionCreate] Enriching field ${matchingField.id} with fieldDataSource from form`);
                      matchingField.fieldDataSource = formField.fieldDataSource;
                    }
                  });
                }
              });
            }
            
            this.processFields(fieldsFromService).catch(error => {
              console.error('[FormSubmissionCreate] Error processing fields:', error);
              this.loading.fields = false;
            });
          },
          error: (error) => {
            console.warn('[FormSubmissionCreate] Could not load form to enrich fields with DataSource:', error);
            // Continue without fieldDataSource enrichment
            this.processFields(fieldsFromService).catch(error => {
              console.error('[FormSubmissionCreate] Error processing fields:', error);
              this.loading.fields = false;
            });
          }
        });
      },
      error: (error) => {
        console.error('[FormSubmissionCreate] Error loading fields from service:', error);
        this.loading.fields = false;
      }
    });
  }

  private async processFields(fields: FormFieldDto[]): Promise<void> {
    console.log('[FormSubmissionCreate] Processing fields:', fields?.length || 0);
    
    // Log detailed info about ALL fields with DataSource
    if (fields && fields.length > 0) {
      console.log('[FormSubmissionCreate] All fields details:', fields.map(f => ({
        id: f.id,
        fieldCode: f.fieldCode,
        fieldName: f.fieldName,
        fieldType: f.fieldTypeName || f.fieldType?.typeName,
        hasDataSource: !!f.fieldDataSource,
        dataSourceType: f.fieldDataSource?.sourceType,
        dataSourceActive: f.fieldDataSource?.isActive,
        dataSourceApiUrl: f.fieldDataSource?.apiUrl,
        hasOptions: !!(f.fieldOptions && f.fieldOptions.length > 0),
        optionsCount: f.fieldOptions?.length || 0,
        isCalculated: this.calculationEngine.isCalculatedField(f),
        hasExpressionText: !!f.expressionText
      })));
      
      // Log fields with DataSource separately
      const fieldsWithDataSource = fields.filter(f => f.fieldDataSource && f.fieldDataSource.isActive);
      console.log('[FormSubmissionCreate] Fields WITH active DataSource:', fieldsWithDataSource.length);
      fieldsWithDataSource.forEach(f => {
        console.log(`[FormSubmissionCreate] - Field ${f.id} (${f.fieldCode || 'no-code'}):`, {
          sourceType: f.fieldDataSource?.sourceType,
          apiUrl: f.fieldDataSource?.apiUrl,
          valuePath: f.fieldDataSource?.valuePath,
          textPath: f.fieldDataSource?.textPath
        });
      });
    }
    
    this.fields = fields.filter(f => f.isActive).sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
    console.log('[FormSubmissionCreate] Active fields after filtering:', this.fields.length);
    
    // Load expressionText for calculated fields that don't have it
    const calculatedFieldsWithoutExpression = this.fields.filter(f => 
      this.calculationEngine.isCalculatedField(f) && !f.expressionText
    );
    
    if (calculatedFieldsWithoutExpression.length > 0) {
      console.log(`[FormSubmissionCreate] Found ${calculatedFieldsWithoutExpression.length} calculated fields without expressionText. Loading...`);
      
      // Load expressionText for each calculated field
      for (const field of calculatedFieldsWithoutExpression) {
        if (!field.id) continue;
        
        try {
          const fieldDetails = await this.fieldsService.getFieldById(field.id).toPromise();
          if (fieldDetails && fieldDetails.expressionText) {
            field.expressionText = fieldDetails.expressionText;
            console.log(`[FormSubmissionCreate] ✅ Loaded expressionText for field ${field.fieldCode} (ID: ${field.id}): ${field.expressionText}`);
          } else {
            console.warn(`[FormSubmissionCreate] ⚠️ Field ${field.fieldCode} (ID: ${field.id}) has no expressionText in API response`);
          }
        } catch (error) {
          console.error(`[FormSubmissionCreate] ❌ Error loading expressionText for field ${field.fieldCode} (ID: ${field.id}):`, error);
        }
      }
    }
    
    // Count fields with DataSource
    const fieldsWithDataSource = this.fields.filter(f => f.fieldDataSource && f.fieldDataSource.isActive);
    console.log('[FormSubmissionCreate] Fields with active DataSource:', fieldsWithDataSource.length);
    
    // Initialize dynamic field states for loaded fields
    this.fields.forEach(field => {
      if (field.fieldCode) {
        if (!this.dynamicFieldStates[field.fieldCode]) {
          this.dynamicFieldStates[field.fieldCode] = {};
        }
        this.dynamicFieldStates[field.fieldCode].isVisible = field.isVisible ?? true;
        this.dynamicFieldStates[field.fieldCode].isRequired = field.isMandatory ?? false;
        this.dynamicFieldStates[field.fieldCode].isReadOnly = field.isEditable === false;
      }
    });
    
    // Load options from DataSource for fields that need it
    this.fields.forEach(field => {
      if (field.id) {
        const fieldType = this.getFieldType(field);
        // Check if field type requires options (select, radio, checkbox)
        // Also check if fieldType has hasOptions = true (even if getFieldType didn't detect it as options field)
        const ft = this.getFieldTypeFromCache(field) || field.fieldType;
        const hasOptionsFromFieldType = ft?.hasOptions === true;
        const isOptionsField = ['select', 'radio', 'checkbox'].includes(fieldType) || hasOptionsFromFieldType;
        
        // Log field DataSource info
        if (field.fieldDataSource) {
          console.log(`[FormSubmissionCreate] ✅ Field ${field.id} (${field.fieldCode || 'no-code'}) has DataSource:`, {
            fieldType: fieldType,
            isOptionsField: isOptionsField,
            hasOptionsFromFieldType: hasOptionsFromFieldType,
            sourceType: field.fieldDataSource.sourceType,
            isActive: field.fieldDataSource.isActive,
            apiUrl: field.fieldDataSource.apiUrl,
            valuePath: field.fieldDataSource.valuePath,
            textPath: field.fieldDataSource.textPath,
            httpMethod: field.fieldDataSource.httpMethod
          });
        } else {
          console.log(`[FormSubmissionCreate] ❌ Field ${field.id} (${field.fieldCode || 'no-code'}) has NO DataSource`, {
            fieldType: fieldType,
            isOptionsField: isOptionsField,
            hasOptionsFromFieldType: hasOptionsFromFieldType,
            hasOptions: !!(field.fieldOptions && field.fieldOptions.length > 0),
            optionsCount: field.fieldOptions?.length || 0
          });
        }
        
        // Only load DataSource options for fields that need options
        // Also check if field has static options (field.fieldOptions) - these should be displayed even without DataSource
        if (isOptionsField || (field.fieldOptions && field.fieldOptions.length > 0)) {
          this.loadFieldOptionsFromDataSource(field);
        }
      }
    });
        
        // Mark fields loading as complete
    this.loading.fields = false;
    
    // Build dynamic form for fields
        const formControls: { [key: string]: any } = {};
        this.fields.forEach(field => {
          if (field.id) {
            const fieldKey = `field_${field.id}`;
            if (!this.isFileField(field)) {
              const validators: any[] = [];
          const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
          const isRequired = dynamicState?.isRequired ?? field.isMandatory ?? false;
          
          if (isRequired) {
                validators.push(Validators.required);
              }

              // Additional validators based on field type & code (password, phone, email, etc.)
              const fieldCodeLower = (field.fieldCode || '').toLowerCase();
              const fieldTypeForValidation = this.getFieldType(field);
              const fieldTypeNameLower = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();

              // Email validation
              if (
                fieldTypeForValidation === 'email' ||
                fieldTypeNameLower.includes('email') ||
                fieldCodeLower === 'email'
              ) {
                validators.push(Validators.email);
              }

              // Phone validation – allow digits with optional + and 7–20 chars
              if (
                fieldTypeNameLower.includes('phone') ||
                fieldTypeNameLower.includes('mobile') ||
                fieldCodeLower === 'phone' ||
                fieldCodeLower === 'mobile' ||
                fieldCodeLower === 'phone_number'
              ) {
                validators.push(Validators.pattern(/^\+?[0-9]{7,20}$/));
              }

              // Password validation – minimum length 6
              if (
                fieldTypeNameLower.includes('password') ||
                fieldCodeLower === 'password' ||
                fieldCodeLower === 'pwd'
              ) {
                validators.push(Validators.minLength(6));
              }

              const fieldType = this.getFieldType(field);
              let defaultValue: any = null;
              
              // Get default value based on field type
              if (fieldType === 'checkbox') {
                defaultValue = [];
              } else if (fieldType === 'boolean' || fieldType === 'switch') {
                defaultValue = (field.defaultValueJson === 'true' || field.defaultValueJson === 'True') ? true : false;
              } else if (fieldType === 'select') {
                if (field.fieldType?.allowMultiple) {
                  // Multiple select should be an array
                  defaultValue = [];
                } else {
                  // Single select - use empty string instead of null for better compatibility
                  const defaultVal = this.getDefaultValue(field);
                  defaultValue = defaultVal !== '' ? defaultVal : '';
                }
              } else {
                // For other types, try to get default value
                const defaultVal = this.getDefaultValue(field);
                defaultValue = defaultVal !== '' ? defaultVal : null;
              }
              
              formControls[fieldKey] = [defaultValue, validators];
            }
          }
        });
        this.fieldsForm = this.fb.group(formControls);
        
    try {
      // Unsubscribe from previous subscription if exists
      if (this.fieldsFormValueChangesSubscription) {
        this.fieldsFormValueChangesSubscription.unsubscribe();
      }
      
      // Subscribe to form value changes to track field values for rule evaluation
      // Use debounceTime to prevent infinite loops and improve performance
      this.fieldsFormValueChangesSubscription = this.fieldsForm.valueChanges.pipe(
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged() // Only emit if value actually changed
      ).subscribe((formValues) => {
        // Prevent infinite loops
        if (this.isEvaluatingRules) {
          return;
        }
        
        try {
          // Update field values first
          this.updateFieldValues();
          
          // Find which field changed by comparing old and new values
          const changedFieldCode = this.findChangedFieldCode(formValues);
          
          if (changedFieldCode) {
            console.log(`[FormSubmissionCreate] Field value changed: ${changedFieldCode}`);
            // Calculate dependent calculated fields (like FormViewComponent)
            this.calculateFields(changedFieldCode).catch(error => {
              console.error('[FormSubmissionCreate] Error calculating fields:', error);
            });
          }
          
          // Use setTimeout to defer rule evaluation and avoid infinite loops
          setTimeout(() => {
            if (!this.isEvaluatingRules) {
              this.evaluateFormRules();
            }
          }, 0);
        } catch (error) {
          console.error('[FormSubmissionCreate] Error in form value changes subscription:', error);
        }
      });
      
      // Initial rule evaluation (wrap in try-catch to prevent blocking)
      // Use setTimeout to defer initial evaluation and avoid infinite loops
      setTimeout(async () => {
        try {
          this.updateFieldValues();
          // Calculate calculated fields on initial load (like FormViewComponent)
          await this.calculateFieldsOnLoad();
          if (!this.isEvaluatingRules) {
            this.evaluateFormRules();
          }
        } catch (error) {
          console.error('[FormSubmissionCreate] Error in initial rule evaluation:', error);
          // Continue even if rule evaluation fails
        }
      }, 0);
    } catch (error) {
      console.error('[FormSubmissionCreate] Error initializing form and rules:', error);
      // Continue even if initialization fails
    }
    
    console.log('[FormSubmissionCreate] Fields loading completed. Fields count:', this.fields.length);
    
    // If in edit mode, load attachments after fields are loaded
    if (this.isEditMode && this.submissionId && this.fields.length > 0) {
      // Load attachments for file fields
      this.loadAttachmentsForEdit();
      
      // Also populate form with field values if they were loaded earlier
      const pendingFieldValues = (this as any)._pendingFieldValues;
      if (pendingFieldValues && pendingFieldValues.length > 0) {
        this.populateFormWithFieldValues(pendingFieldValues);
      }
      
      // Load grid data if submission was loaded earlier
      if (this.currentSubmissionDetail && this.currentSubmissionDetail.gridData && this.currentSubmissionDetail.gridData.length > 0) {
        setTimeout(() => {
          this.loadGridDataIntoComponents(this.currentSubmissionDetail!);
        }, 500); // Wait for grid components to be initialized
      }
    }
    
    // Always set loading to false, even if there were errors
    this.loading.fields = false;
    // Use setTimeout to defer change detection and avoid infinite loops
    setTimeout(() => {
      this.cdr.markForCheck();
    }, 0);
  }

  /**
   * Check if field is loading options from DataSource
   */
  isLoadingFieldOptions(field: FormFieldDto): boolean {
    return field.id ? (this.loadingFieldOptions[field.id] || false) : false;
  }

  isFileField(field: FormFieldDto): boolean {
    // Check getFieldType result first (most reliable)
    const detectedType = this.getFieldType(field);
    if (detectedType === 'file') {
      return true;
    }
    
    // Check fieldTypeName
    const fieldTypeName = (field.fieldTypeName || '').toLowerCase();
    // Check fieldType.typeName
    const fieldTypeTypeName = (field.fieldType?.typeName || '').toLowerCase();
    // Check fieldCode and fieldName for common file field patterns
    const fieldCode = (field.fieldCode || '').toLowerCase();
    const fieldName = (field.fieldName || '').toLowerCase();
    
    const isFile = fieldTypeName.includes('file') || 
                   fieldTypeName.includes('attachment') || 
                   fieldTypeName.includes('image') ||
                   fieldTypeTypeName.includes('file') || 
                   fieldTypeTypeName.includes('attachment') || 
                   fieldTypeTypeName.includes('image') ||
                   fieldCode.includes('file') ||
                   fieldCode.includes('image') ||
                   fieldCode === 'img' ||
                   fieldName.includes('file') ||
                   fieldName.includes('image');
    
    return isFile;
  }

  // ===== Field Type Helpers =====

  /**
   * Load active field types from API
   * This will be used as fallback when field.fieldType is missing
   */
  private loadFieldTypes(): void {
    this.fieldsService.getActiveFieldTypes().subscribe({
      next: (types: FieldTypeDto[]) => {
        this.fieldTypes = types.filter(type => type.isActive && type.id && type.typeName);
        // Create a map for quick lookup by ID
        this.fieldTypesMap = {};
        this.fieldTypes.forEach(type => {
          if (type.id) {
            this.fieldTypesMap[type.id] = type;
          }
        });
        console.log(`[FormSubmissionCreate] Loaded ${this.fieldTypes.length} active field types from API`);
      },
      error: (error) => {
        console.warn('[FormSubmissionCreate] Failed to load field types from API:', error);
        this.fieldTypes = [];
        this.fieldTypesMap = {};
      }
    });
  }

  /**
   * Get field type from field.fieldType or fallback to loaded fieldTypes by fieldTypeId
   */
  private getFieldTypeFromCache(field: FormFieldDto): FieldTypeDto | null {
    // First, try to use field.fieldType if available
    if (field.fieldType && field.fieldType.id) {
      return field.fieldType;
    }
    
    // If fieldTypeId is available, try to find it in loaded fieldTypes
    if (field.fieldTypeId && this.fieldTypesMap[field.fieldTypeId]) {
      return this.fieldTypesMap[field.fieldTypeId];
    }
    
    return null;
  }

  getFieldType(field: FormFieldDto): string {
    // Try to get FieldType from field.fieldType or from loaded fieldTypes cache
    let ft = this.getFieldTypeFromCache(field);
    
    // If still not found, use field.fieldType directly (may be null)
    if (!ft) {
      ft = field.fieldType || null;
    }
    
    const typeName = (field.fieldTypeName || ft?.typeName || '').toLowerCase().trim();
    const dataType = (ft?.dataType || '').toLowerCase().trim();
    
    // Declare fieldCodeLower and fieldNameLower once at the beginning
    const fieldCodeLower = (field.fieldCode || '').toLowerCase();
    const fieldNameLower = (field.fieldName || '').toLowerCase();
    
    // Removed verbose logging for performance

    // PRIORITY ORDER: Check specific types BEFORE checking options/grid
    const combined = `${typeName} ${dataType}`.toLowerCase();

    // Additional heuristic: if defaultValueJson contains file configuration
    // (allowedExtensions / customExtensions), prefer treating it as a file field.
    try {
      if (field.defaultValueJson && field.defaultValueJson.trim()) {
        const parsedCfg = JSON.parse(field.defaultValueJson);
        if (parsedCfg && (parsedCfg.allowedExtensions || parsedCfg.customExtensions)) {
          return 'file';
        }
      }
    } catch {
      // ignore parse errors and continue
    }
    
    // 0) Check if fieldType explicitly indicates options type (BEFORE email/file checks)
    // This ensures RadioButton, MultiSelect, ComboBox, CheckBox are detected correctly even if hasOptions = false
    // IMPORTANT: Check typeName FIRST to catch checkbox even if hasOptions = false in database
    const ftTypeNameLower = (ft?.typeName || '').toLowerCase();
    const isExplicitOptionsType = ftTypeNameLower.includes('radio') || 
                                   ftTypeNameLower.includes('select') || 
                                   ftTypeNameLower.includes('combobox') ||
                                   ftTypeNameLower.includes('multiselect') ||
                                   ftTypeNameLower.includes('checkbox') ||
                                   typeName.includes('checkbox') ||
                                   fieldCodeLower.includes('checkbox') ||
                                   fieldNameLower.includes('checkbox');
    
    // If fieldType has hasOptions = true OR typeName indicates options type, check options FIRST
    const hasOptionsFromFieldType = ft?.hasOptions === true;
    if (hasOptionsFromFieldType || isExplicitOptionsType) {
      // Skip to options detection (will be handled below)
    } else {
      // 1) Email - Check BEFORE options (email should not be treated as radio/select)
      if (combined.includes('email') || typeName.includes('email') || 
          fieldCodeLower.includes('email') || fieldNameLower.includes('email')) {
        return 'email';
      }

      // 2) File / Image / Attachment - Check BEFORE calculated (file should not be treated as calculated)
      // BUT: Only if it's NOT an options type (RadioButton, Select, etc.)
      const isFileByTypeName = typeName === 'file' || typeName.includes('file') || 
          combined.includes('file') || combined.includes('image') || combined.includes('attachment') || 
          dataType === 'file';
      const isFileByCode = fieldCodeLower === 'image' || fieldCodeLower.includes('image') || 
          fieldCodeLower.includes('file') || fieldCodeLower.includes('attachment');
      const isFileByName = fieldNameLower.includes('image') || fieldNameLower.includes('file') || 
          fieldNameLower.includes('attachment');
      
      if (isFileByTypeName || isFileByCode || isFileByName) {
        return 'file';
      }
    }

    // 2.5) Password - Check BEFORE calculated (password fields should NOT be treated as calculated)
    // Password fields are treated as text fields, but isPasswordField() is used in template to render type="password"
    if (typeName.includes('password') || 
        fieldCodeLower === 'password' || 
        fieldCodeLower === 'pwd' ||
        fieldCodeLower.includes('password') ||
        fieldNameLower === 'password' ||
        fieldNameLower.includes('password')) {
      return 'text'; // Return 'text' so template can use isPasswordField() to render type="password"
    }

    // 3) Calculated - Check BEFORE number/date/text (calculated fields should be detected even without expressionText)
    // A field is calculated if:
    // 1. fieldTypeId is 14 (Calculated type)
    // 2. Type name is 'Calculated'
    // 3. OR has expressionText (for backward compatibility)
    // BUT: Skip if it's a password field (checked above)
    if (typeName === 'calculated' || this.calculationEngine.isCalculatedField(field)) {
      return 'calculated';
    }

    // 4) Grid - Only if gridId exists OR typeName is explicitly 'grid' (don't treat MultiSelect as grid)
    // Priority 1: If field has gridId, it's definitely a Grid
    if (field.gridId && field.gridId > 0) {
      return 'grid';
    }

    // Priority 2: By type name (explicit 'grid' type, not MultiSelect)
    if (typeName === 'grid' || typeName === 'line items' || typeName === 'lineitems') {
      return 'grid';
    }

    // Priority 3: By field code (if fieldCode is exactly 'grid')
    if (fieldCodeLower === 'grid') {
      return 'grid';
    }

    // 5) Types with options (select / radio / checkbox) - Check AFTER email/file/grid
    // PRIORITY: If fieldType has hasOptions = true, treat it as a field with options
    // This ensures that even if field.fieldOptions is not loaded yet, we still detect it correctly
    const hasOptionsFromField = field.fieldOptions && field.fieldOptions.length > 0;
    
    // IMPORTANT: If fieldType.hasOptions = true OR isExplicitOptionsType, we MUST treat it as a field with options
    // even if field.fieldOptions is empty (options might be loaded from DataSource later)
    const hasOptions = hasOptionsFromFieldType || isExplicitOptionsType || hasOptionsFromField;
    
    // If field has options (from fieldType.hasOptions OR field.fieldOptions), treat it as select/radio/checkbox
    if (hasOptions) {
      // Get fieldTypeName in lowercase for better matching
      const fieldTypeNameLower = (field.fieldTypeName || '').toLowerCase();
      const ftTypeNameLower = (ft?.typeName || '').toLowerCase();

      // لو النوع اسمه يحتوي "checkbox" أو "check box" خليه مربعات اختيار
      if (typeName.includes('checkbox') || typeName.includes('check box') || 
          fieldTypeNameLower.includes('checkbox') || ftTypeNameLower.includes('checkbox') ||
          fieldCodeLower.includes('checkbox') || fieldNameLower.includes('checkbox')) {
        return 'checkbox';
      }

      // Check for ComboBox / Dropdown FIRST (before radio) - ComboBox is a select type, not radio
      const isComboBox = typeName.includes('combobox') || 
                         fieldTypeNameLower.includes('combobox') || 
                         ftTypeNameLower.includes('combobox') ||
                         fieldCodeLower.includes('combobox') || 
                         fieldNameLower.includes('combobox');
      
      if (isComboBox) {
        return 'select';
      }

      // Check for MultiSelect / Select - BEFORE radio
      const isSelectType = typeName.includes('select') || 
                          fieldTypeNameLower.includes('select') || 
                          ftTypeNameLower.includes('select') ||
                          fieldTypeNameLower.includes('multiselect') ||
                          ftTypeNameLower.includes('multiselect') ||
                          fieldCodeLower.includes('select') || 
                          fieldNameLower.includes('select');
      
      if (isSelectType) {
        return 'select';
      }

      // لو النوع اسمه يحتوي "radio" خليه radio buttons (التحقق بعد ComboBox/Select)
      // Check multiple sources: typeName, fieldTypeName, ft.typeName
      if (typeName.includes('radio') || 
          fieldTypeNameLower.includes('radio') || 
          ftTypeNameLower.includes('radio') ||
          fieldCodeLower.includes('radio') || 
          fieldNameLower.includes('radio')) {
        return 'radio';
      }

      // Check if FieldType is explicitly "Select" or "Dropdown" - these should be dropdown, not radio
      // IMPORTANT: Check ft?.typeName to see if the FieldType itself is "Select" or "Dropdown"
      const ftTypeName = (ft?.typeName || '').toLowerCase();
      const isSelectFieldType = ftTypeName === 'select' || ftTypeName === 'dropdown' || ftTypeName.includes('select') || ftTypeName.includes('dropdown');
      
      // إذا كان allowMultiple = false و hasOptions = true وليس select/combobox صراحة
      // (Radio buttons تسمح باختيار واحد فقط، بينما Select قد يكون single أو multiple)
      // Check allowMultiple - use ft?.allowMultiple if available, otherwise default to false (single selection = radio)
      const allowMultiple = ft?.allowMultiple ?? false;
      
      // Default to select if allowMultiple is true, otherwise check FieldType name
      if (allowMultiple === true) {
        return 'select';
      }
      
      // If FieldType is explicitly "Select" or "Dropdown", use dropdown (select) instead of radio
      if (isSelectFieldType) {
        return 'select';
      }
      
      // If allowMultiple = false and not explicitly select/combobox/dropdown, default to radio
      // BUT: Only if we're sure it's not a dropdown (ComboBox/Select should be detected above)
      return 'radio';

    }

    // 6) Non-options fields based on dataType / name (Email already checked above)

    // Number
    if (combined.includes('number') || combined.includes('numeric') || dataType === 'int' || dataType === 'decimal' ||
        typeName.includes('number') || fieldCodeLower.includes('number') || fieldNameLower.includes('number')) {
      return 'number';
    }

    // Date - Check typeName, dataType, fieldCode, and fieldName
    const isDateByType = combined.includes('date') || dataType === 'date' || dataType === 'datetime' ||
        typeName === 'date' || typeName.includes('date');
    const isDateByCode = fieldCodeLower === 'date' || fieldCodeLower.includes('date');
    const isDateByName = fieldNameLower === 'date' || fieldNameLower.includes('date');
    
    if (isDateByType || isDateByCode || isDateByName) {
      return 'date';
    }

    // Explicit mapping: Textbox => text input
    if (typeName === 'textbox' || typeName.includes('text box')) {
      return 'text';
    }

    // Switch / boolean
    if (combined.includes('switch') || combined.includes('toggle') || dataType === 'bool' || dataType === 'boolean' ||
        typeName.includes('switch') || typeName.includes('toggle') || typeName.includes('boolean') ||
        fieldCodeLower.includes('switch') || fieldNameLower.includes('switch')) {
      return 'switch';
    }

    // Long text / textarea
    if (combined.includes('textarea') || (combined.includes('text') && (ft?.maxLength || 0) > 255)) {
      return 'textarea';
    }

    // Default to short text input
    // Note: No console.log for default text fields to reduce console noise
    return 'text';
  }

  getFieldOptions(field: FormFieldDto): any[] {
    if (!field.id) {
      return field.fieldOptions || [];
    }

    // If options are still loading from DataSource, return empty array (will be updated when loading completes)
    if (this.loadingFieldOptions[field.id]) {
      return [];
    }

    // If options are loaded from DataSource, use them
    if (this.fieldDataSourceOptions[field.id] && this.fieldDataSourceOptions[field.id].length > 0) {
      // Convert FieldOptionResponse to FieldOptionDto format for compatibility
      const dataSource = field.fieldDataSource;
      const textPath = dataSource?.textPath || '';
      const valuePath = dataSource?.valuePath || '';

      // Check cache first to avoid recreating array on every call
      if (this._cachedMappedOptions[field.id]) {
        return this._cachedMappedOptions[field.id];
      }

      if (!this._loggedFieldOptions[field.id]) {
        console.log(`[FormSubmissionCreate] Mapping ${this.fieldDataSourceOptions[field.id].length} options for field ${field.id}`);
        console.log(`[FormSubmissionCreate] - Config: textPath="${textPath}", valuePath="${valuePath}"`);
        if (this.fieldDataSourceOptions[field.id].length > 0) {
          console.log(`[FormSubmissionCreate] - First option sample:`, JSON.stringify(this.fieldDataSourceOptions[field.id][0]));
        }
        this._loggedFieldOptions[field.id] = true;
      }

      const mappedOptions = this.fieldDataSourceOptions[field.id]
        .filter(opt => opt !== null && opt !== undefined) // Filter out null/undefined options
        .map((opt, index) => {
          // Try to extract text and value from the option
          // Use 'any' to handle dynamic properties that might exist in the response
          const optAny = opt as any;
          let text = '';
          let value = '';

          // Check if this is a FieldOptionDto (static options from database) or FieldOptionResponse (from DataSource)
          // FieldOptionDto has: optionText, optionValue
          // FieldOptionResponse has: text, value (or custom paths)
          const isStaticOption = 'optionText' in optAny || 'optionValue' in optAny;
          
          if (isStaticOption) {
            // This is a static option from database (FieldOptionDto format)
            // Use optionText and optionValue directly
            if (optAny.optionText !== undefined && optAny.optionText !== null) {
              text = String(optAny.optionText).trim();
            }
            if (optAny.optionValue !== undefined && optAny.optionValue !== null) {
              value = String(optAny.optionValue);
            }
            // Also check foreignOptionText for multilingual support
            if (!text && optAny.foreignOptionText) {
              text = String(optAny.foreignOptionText).trim();
            }
          } else {
            // This is a DataSource option (FieldOptionResponse format)
            // Try to use the configured textPath from DataSource (case-insensitive)
            if (textPath) {
              const textPathLower = textPath.toLowerCase().trim();
              const keys = Object.keys(optAny || {});
              const matchingKey = keys.find(k => k.toLowerCase().trim() === textPathLower);
              if (matchingKey && optAny[matchingKey] !== undefined && optAny[matchingKey] !== null) {
                const val = optAny[matchingKey];
                if (typeof val === 'object') {
                  text = JSON.stringify(val);
                } else {
                  text = String(val).trim();
                }
              }
            }

            // Try to use the configured valuePath from DataSource (case-insensitive)
            if (valuePath) {
              const valuePathLower = valuePath.toLowerCase().trim();
              const keys = Object.keys(optAny || {});
              const matchingKey = keys.find(k => k.toLowerCase().trim() === valuePathLower);
              if (matchingKey && optAny[matchingKey] !== undefined && optAny[matchingKey] !== null) {
                const val = optAny[matchingKey];
                if (typeof val === 'object') {
                  value = JSON.stringify(val);
                } else {
                  value = String(val);
                }
              }
            }

            // Fallback: Check for text property (case-insensitive) - only if textPath didn't work
            if (!text) {
              if (opt.text !== undefined && opt.text !== null) {
                text = String(opt.text).trim();
              } else if (optAny.Text !== undefined && optAny.Text !== null) {
                text = String(optAny.Text).trim();
              } else if (optAny.label !== undefined && optAny.label !== null) {
                text = String(optAny.label).trim();
              } else if (optAny.name !== undefined && optAny.name !== null) {
                text = String(optAny.name).trim();
              }
            }

            // Fallback: Check for value property (case-insensitive) - only if valuePath didn't work
            if (!value) {
              if (opt.value !== undefined && opt.value !== null) {
                value = String(opt.value);
              } else if (optAny.Value !== undefined && optAny.Value !== null) {
                value = String(optAny.Value);
              } else if (optAny.id !== undefined && optAny.id !== null) {
                value = String(optAny.id);
              } else if (optAny.Id !== undefined && optAny.Id !== null) {
                value = String(optAny.Id);
              }
            }

            // If still no value, try to use the first property that looks like an ID
            if (!value && optAny) {
              const keys = Object.keys(optAny);
              const idKey = keys.find(k => {
                const kLower = k.toLowerCase();
                return kLower === 'id' ||
                  kLower === 'value' ||
                  kLower === 'key' ||
                  kLower === 'optionvalue';
              });
              if (idKey && optAny[idKey] !== undefined && optAny[idKey] !== null) {
                value = String(optAny[idKey]);
              }
            }

            // If still no text, try to use the first string property that's not value/id
            if (!text && optAny) {
              const keys = Object.keys(optAny);
              const textKey = keys.find(k => {
                const kLower = k.toLowerCase();
                return kLower !== 'id' &&
                  kLower !== 'value' &&
                  kLower !== 'key' &&
                  kLower !== 'optionvalue' &&
                  typeof optAny[k] === 'string' &&
                  String(optAny[k]).trim() !== '';
              });
              if (textKey) {
                text = String(optAny[textKey]).trim();
              }
            }

            // Priority: text > value > index-based fallback
            let displayText = text;
            if (!displayText && value) {
              displayText = value;
            } else if (!displayText && !value) {
              // Last resort: use index (but this shouldn't happen if backend is working correctly)
              displayText = `Option ${index + 1}`;
              console.warn(`[FormSubmissionCreate] Option at index ${index} has no text or value, using fallback: "${displayText}"`, {
                option: opt,
                availableKeys: Object.keys(opt || {}),
                optionString: JSON.stringify(opt)
              });
            }

            return {
              optionValue: value || String(index),
              optionText: displayText,
              foreignOptionText: displayText, // DataSource doesn't provide separate Arabic text
              isActive: true
            };
          }

          // For static options, return as-is
          return {
            optionValue: value || String(index),
            optionText: text || String(index),
            foreignOptionText: optAny.foreignOptionText || text || String(index),
            isActive: true
          };
        });
      
      // Cache the mapped options to avoid recreating array on every call
      this._cachedMappedOptions[field.id] = mappedOptions;
      return mappedOptions;
    }

    // Otherwise, use static options from field.fieldOptions
    // IMPORTANT: Even if field has Api/LookupTable DataSource, use static options as fallback
    // if DataSource failed or returned no options
    const staticOptions = field.fieldOptions || [];
    
    // Check if DataSource failed or returned no options
    const dataSource = field.fieldDataSource;
    const isSqlQuery = dataSource?.sourceType === 'SqlQuery' || dataSource?.sourceType === 'DataSourceSqlQuery';
    const hasExternalDataSource = dataSource && 
                                 dataSource.isActive && 
                                 (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable' || isSqlQuery);
    const dataSourceFailed = hasExternalDataSource && 
                            (!this.fieldDataSourceOptions[field.id] || this.fieldDataSourceOptions[field.id].length === 0);

    // If DataSource failed, use static options as fallback
    if (dataSourceFailed && staticOptions.length > 0) {
      console.log(`[FormSubmissionCreate] Using static options as fallback for field ${field.id} (${field.fieldCode || 'no-code'}) - DataSource returned no options`);
    }

    // Only warn if no options at all (no static and no DataSource)
    if (staticOptions.length === 0 && !this._loggedFieldOptions[field.id]) {
      if (field.fieldDataSource && field.fieldDataSource.isActive) {
        // DataSource is active but no options loaded - this is expected if DataSource failed
        // Only log if we're sure there's a problem
        const dataSourceOptions = this.fieldDataSourceOptions[field.id];
        const hasDataSourceOptions = dataSourceOptions && dataSourceOptions.length > 0;
        
        console.warn(`[FormSubmissionCreate] ⚠️ Field ${field.id} (${field.fieldCode || 'no-code'}) has no options.`, {
          hasDataSource: !!field.fieldDataSource,
          dataSourceType: field.fieldDataSource?.sourceType,
          dataSourceActive: field.fieldDataSource?.isActive,
          hasDataSourceOptions: hasDataSourceOptions,
          dataSourceOptionsCount: dataSourceOptions?.length || 0,
          hasStaticOptions: staticOptions.length > 0,
          staticOptionsCount: staticOptions.length,
          isLoading: this.loadingFieldOptions[field.id] || false
        });
        
        // If DataSource is active but no options loaded, check if it's still loading
        if (!hasDataSourceOptions && this.loadingFieldOptions[field.id]) {
          console.log(`[FormSubmissionCreate] Field ${field.id} options are still loading...`);
        }
      }
      this._loggedFieldOptions[field.id] = true;
    }

    // Check cache first to avoid recreating array on every call
    if (this._cachedStaticOptions[field.id]) {
      return this._cachedStaticOptions[field.id];
    }

    // Ensure static options also have proper text
    const processedOptions = staticOptions
      .filter(opt => opt !== null && opt !== undefined)
      .map((opt, index) => {
        // Create a copy to avoid mutating the original
        const option = { ...opt };

        // Ensure optionText is never undefined
        if (!option.optionText || String(option.optionText).trim() === '') {
          if (option.optionValue && String(option.optionValue).trim() !== '') {
            option.optionText = String(option.optionValue);
          } else if (option.foreignOptionText && String(option.foreignOptionText).trim() !== '') {
            option.optionText = String(option.foreignOptionText);
          } else {
            option.optionText = `Option ${index + 1}`;
          }
        }

        // Ensure optionValue is never undefined
        if (!option.optionValue || String(option.optionValue).trim() === '') {
          option.optionValue = String(index);
        }

        return option;
      });

    // Cache the processed options to avoid recreating array on every call
    this._cachedStaticOptions[field.id] = processedOptions;
    return processedOptions;
  }

  getFieldPlaceholder(field: FormFieldDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && field.foreignPlaceholder) {
      return field.foreignPlaceholder;
    }
    return field.placeholder || '';
  }

  getFieldHintText(field: FormFieldDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && field.foreignHintText) {
      return field.foreignHintText;
    }
    return field.hintText || '';
  }

  getFieldDisplayName(field: FormFieldDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && field.foreignFieldName) {
      return field.foreignFieldName;
    }
    return field.fieldName || '';
  }

  /**
   * Get the 'for' attribute value for the label element
   * Returns null if the field doesn't need a 'for' attribute (radio, checkbox, boolean)
   * or if field.id is not available, or if no input will be rendered
   * Uses the same ID format as getFieldId/getFileFieldId to ensure matching
   */
  getFieldLabelFor(field: FormFieldDto): string | null {
    // Return null if field.id is not available
    if (!field.id || field.id === null || field.id === undefined) {
      return null;
    }
    
    // Don't set 'for' for radio, checkbox, or boolean fields (they have separate labels)
    const fieldType = this.getFieldType(field);
    if (fieldType === 'radio' || fieldType === 'checkbox' || fieldType === 'boolean') {
      return null;
    }
    
    // Check if an input will actually be rendered for this field
    // This ensures the label's 'for' attribute matches an actual input element
    const willRenderInput = this.willRenderInputForField(field);
    if (!willRenderInput) {
      return null;
    }
    
    // Use the same helper functions to ensure ID consistency
    if (this.isFileField(field)) {
      const fileId = this.getFileFieldId(field);
      return fileId || null;
    }
    
    const fieldId = this.getFieldId(field);
    return fieldId || null;
  }

  /**
   * Check if an input element will be rendered for this field
   * This helps ensure label 'for' attributes only reference existing inputs
   * Matches the exact conditions from the HTML template
   */
  private willRenderInputForField(field: FormFieldDto): boolean {
    if (!field.id) {
      return false;
    }
    
    const fieldType = this.getFieldType(field);
    const isFile = this.isFileField(field);
    
    // Match exact conditions from HTML template
    // Text Input: getFieldType(field) === 'text' && !isFileField(field)
    if (fieldType === 'text' && !isFile) {
      return true;
    }
    
    // Number Input: getFieldType(field) === 'number'
    if (fieldType === 'number') {
      return true;
    }
    
    // Calculated Field: getFieldType(field) === 'calculated'
    // Will render either p-inputNumber (if Decimal/Integer) or input (if Text)
    // Must check resultType to ensure an input will actually be rendered
    if (fieldType === 'calculated') {
      const resultType = field.resultType;
      // Only return true if resultType matches one of the conditions in the template
      return resultType === 'Decimal' || resultType === 'Integer' || resultType === 'Text';
    }
    
    // Date Input: getFieldType(field) === 'date'
    if (fieldType === 'date') {
      return true;
    }
    
    // Textarea: getFieldType(field) === 'textarea'
    if (fieldType === 'textarea') {
      return true;
    }
    
    // Select: getFieldType(field) === 'select'
    if (fieldType === 'select') {
      return true;
    }
    
    // File Upload: isFileField(field)
    if (isFile) {
      return true;
    }
    
    // Email, switch, and other text-like types
    if (fieldType === 'email' || fieldType === 'switch') {
      return true;
    }
    
    return false;
  }

  /**
   * Get the field ID for form controls
   * Returns a safe ID string or undefined if field.id is not available
   */
  getFieldId(field: FormFieldDto): string | undefined {
    if (!field.id || field.id === null || field.id === undefined) {
      return undefined;
    }
    return `field_${field.id}`;
  }

  /**
   * Get the file field ID
   * Returns a safe ID string or undefined if field.id is not available
   */
  getFileFieldId(field: FormFieldDto): string | undefined {
    if (!field.id || field.id === null || field.id === undefined) {
      return undefined;
    }
    return `file-${field.id}`;
  }

  isRequired(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
    if (dynamicState?.isRequired !== undefined) {
      return dynamicState.isRequired;
    }
    return field.isMandatory === true;
  }

  isFieldEditable(field: FormFieldDto): boolean {
    // Calculated fields are always read-only
    if (this.calculationEngine.isCalculatedField(field)) {
      return false;
    }

    const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
    if (dynamicState && dynamicState.isReadOnly !== undefined) {
      return !dynamicState.isReadOnly;
    }
    return field.isEditable !== false;
  }

  isFieldVisible(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
    if (dynamicState?.isVisible !== undefined) {
      return dynamicState.isVisible;
    }
    return field.isVisible ?? true;
  }

  /**
   * Check if field is password type
   */
  isPasswordField(field: FormFieldDto): boolean {
    const fieldCodeLower = (field.fieldCode || '').toLowerCase();
    const fieldNameLower = (field.fieldName || '').toLowerCase();
    const fieldTypeNameLower = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    return fieldTypeNameLower.includes('password') || 
           fieldCodeLower === 'password' || 
           fieldCodeLower === 'pwd' ||
           fieldCodeLower.includes('password') ||
           fieldNameLower === 'password' ||
           fieldNameLower.includes('password');
  }

  /**
   * Check if field has validation error (for adding .has-error class)
   */
  hasFieldError(field: FormFieldDto): boolean {
    const fieldCode = field.fieldCode || `field_${field.id}`;
    // Priority: blocking rule errors > validation errors > form control errors
    if (this.blockingRuleErrors[fieldCode]) {
      return true;
    }
    // Check custom validation errors
    if (this.fieldValidationErrors[fieldCode]) {
      return true;
    }
    // Also check form control errors
    const fieldId = this.getFieldId(field);
    if (!fieldId) return false;
    const control = this.fieldsForm.get(fieldId);
    return !!(control?.touched && control?.errors);
  }

  /**
   * Get field error message
   */
  getFieldError(field: FormFieldDto): string {
    const fieldCode = field.fieldCode || `field_${field.id}`;
    // Priority: blocking rule errors > validation errors > form control errors
    if (this.blockingRuleErrors[fieldCode]) {
      return this.blockingRuleErrors[fieldCode];
    }
    // Return custom validation error if exists
    if (this.fieldValidationErrors[fieldCode]) {
      return this.fieldValidationErrors[fieldCode];
    }
    // Otherwise return form control error
    const fieldId = this.getFieldId(field);
    if (!fieldId) return '';
    const control = this.fieldsForm.get(fieldId);
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translationService.getCurrentLanguage() === 'ar' 
          ? 'هذا الحقل مطلوب' 
          : 'This field is required';
      }
    }
    return '';
  }

  /**
   * Check if field has blocking rule error
   */
  hasBlockingRuleError(field: FormFieldDto): boolean {
    const fieldCode = field.fieldCode || `field_${field.id}`;
    return !!this.blockingRuleErrors[fieldCode];
  }

  /**
   * Get blocking rule error message
   */
  getBlockingRuleError(field: FormFieldDto): string {
    const fieldCode = field.fieldCode || `field_${field.id}`;
    return this.blockingRuleErrors[fieldCode] || '';
  }

  /**
   * Clear field error on input change
   */
  clearFieldError(field: FormFieldDto): void {
    const fieldCode = field.fieldCode || `field_${field.id}`;
    if (this.fieldValidationErrors[fieldCode]) {
      delete this.fieldValidationErrors[fieldCode];
    }
    if (this.blockingRuleErrors[fieldCode]) {
      delete this.blockingRuleErrors[fieldCode];
    }
    // Also clear general blocking error when user starts editing
    if (this.generalBlockingError) {
      this.generalBlockingError = '';
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (7-20 digits)
   */
  validatePhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^\+?[0-9]{7,20}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Validate password (at least 6 characters)
   */
  validatePassword(password: string): boolean {
    return password.length >= 6;
  }

  /**
   * Validate field value based on field type
   */
  validateFieldValue(field: FormFieldDto, value: any): string | null {
    if (value === undefined || value === null || value === '') {
      return null; // Empty values should be caught by required validation
    }

    const valueStr = String(value).trim();
    const fieldType = this.getFieldType(field);
    const fieldTypeNameLower = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    const fieldCodeLower = (field.fieldCode || '').toLowerCase();

    // Email validation
    if (fieldType === 'email' || fieldTypeNameLower.includes('email') || fieldCodeLower === 'email') {
      if (!this.validateEmail(valueStr)) {
        return this.translationService.getCurrentLanguage() === 'ar' 
          ? 'يرجى إدخال بريد إلكتروني صالح' 
          : 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (fieldTypeNameLower.includes('phone') || fieldTypeNameLower.includes('mobile') ||
        fieldCodeLower === 'phone' || fieldCodeLower === 'mobile' || fieldCodeLower === 'phone_number') {
      if (!this.validatePhone(valueStr)) {
        return this.translationService.getCurrentLanguage() === 'ar' 
          ? 'يرجى إدخال رقم هاتف صالح (7-20 رقم)' 
          : 'Please enter a valid phone number (7-20 digits)';
      }
    }

    // Password validation
    if (fieldTypeNameLower.includes('password') || fieldCodeLower === 'password' || fieldCodeLower === 'pwd') {
      if (!this.validatePassword(valueStr)) {
        return this.translationService.getCurrentLanguage() === 'ar' 
          ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
          : 'Password must be at least 6 characters';
      }
    }

    return null; // No validation error
  }

  /**
   * Validate all fields before submission
   */
  validateAllFields(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Clear previous validation errors
    this.fieldValidationErrors = {};

    // Validate each field
    this.fields.forEach(field => {
      if (!this.isFieldVisible(field)) {
        return; // Skip hidden fields
      }

      const fieldCode = field.fieldCode || `field_${field.id}`;
      const fieldId = this.getFieldId(field);
      const value = fieldId ? this.fieldsForm.get(fieldId)?.value : null;

      // Validate required fields
      if (this.isRequired(field)) {
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          const errorMsg = this.translationService.getCurrentLanguage() === 'ar' 
            ? 'هذا الحقل مطلوب' 
            : 'This field is required';
          this.fieldValidationErrors[fieldCode] = errorMsg;
          errors.push(`${field.fieldName || fieldCode}: ${errorMsg}`);
        }
      }

      // Validate field-specific formats (email, phone, password)
      if (value !== undefined && value !== null && value !== '' && 
          !(Array.isArray(value) && value.length === 0)) {
        const validationError = this.validateFieldValue(field, value);
        if (validationError) {
          this.fieldValidationErrors[fieldCode] = validationError;
          errors.push(`${field.fieldName || fieldCode}: ${validationError}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate all grids before submission
   */
  validateAllGrids(): { isValid: boolean; errors: string[] } {
    const gridComponentsArray = this.gridComponents?.toArray() || [];
    const errors: string[] = [];

    gridComponentsArray.forEach((grid) => {
      const gridName = grid.getGridTitle();
      const hasData = grid.hasGridData();
      const rowCount = grid.rows?.length || 0;

      // Check if grid requires minimum rows
      if (grid.requiresMinRows()) {
        const minRows = grid.getMinRows();
        if (rowCount < minRows) {
          errors.push(`Grid "${gridName}" requires at least ${minRows} row(s). Currently has ${rowCount} row(s).`);
          return;
        }
      }

      // Check if grid has required columns
      if (grid.hasRequiredColumns()) {
        if (!hasData || rowCount === 0) {
          // Grid has required columns but no data
          errors.push(`Grid "${gridName}" has required columns. Please add data.`);
          return;
        }
        // Check if data is valid (all required fields filled)
        if (!grid.isGridValid()) {
          errors.push(`Grid "${gridName}" has validation errors. Please fill all required fields.`);
          return;
        }
      } else if (hasData) {
        // Grid has data but no required columns - still validate if data exists
        if (!grid.isGridValid()) {
          errors.push(`Grid "${gridName}" has validation errors. Please fill all required fields.`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  onFileSelected(event: any, field: FormFieldDto): void {
    if (!field.id) {
      console.warn('[FormSubmissionCreate] onFileSelected - Field ID is missing');
      return;
    }
    const files = Array.from(event.target.files) as File[];
    console.log(`[FormSubmissionCreate] 📁 onFileSelected - Field ${field.id} (${field.fieldCode || field.fieldName}), files selected:`, files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    if (files.length > 0) {
      this.fieldFiles[field.id] = files;
      console.log(`[FormSubmissionCreate] ✅ Files stored in fieldFiles[${field.id}]:`, this.fieldFiles[field.id].map(f => f.name));
      this.cdr.detectChanges();
    } else {
      console.warn('[FormSubmissionCreate] ⚠️ onFileSelected - No files selected');
    }
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

  getFieldFiles(fieldId: number): File[] {
    return this.fieldFiles[fieldId] || [];
  }

  /**
   * Track by function for options to prevent unnecessary re-renders
   */
  trackByOptionValue(index: number, option: any): any {
    return option?.optionValue || option?.value || option?.id || index;
  }

  /**
   * Handle select dropdown change
   */
  onSelectChange(field: FormFieldDto, event: any): void {
    // Note: This method is no longer needed with reactive forms
    // Reactive forms handle value changes automatically through formControlName
    // But we keep it for backward compatibility and to trigger calculations
    const fieldKey = `field_${field.id}`;
    const control = this.fieldsForm.get(fieldKey);
    
    if (control) {
      // Get the current value from the control (reactive forms already updated it)
      const selectedValue = control.value;
      
      console.log(`[FormSubmissionCreate] Select changed for field ${field.id} (${field.fieldCode || 'no-code'})`, {
        selectedValue,
        controlValue: control?.value,
        controlExists: !!control
      });
      
      // Update fieldValues for rule evaluation
      this.updateFieldValues();
      // Calculate dependent calculated fields (like FormViewComponent)
      if (field.fieldCode) {
        this.calculateFields(field.fieldCode).catch(error => {
          console.error('[FormSubmissionCreate] Error calculating fields:', error);
        });
      }
    }
  }

  /**
   * Handle radio button change
   */
  onRadioChange(field: FormFieldDto, optionValue: string, event: any): void {
    const fieldKey = `field_${field.id}`;
    const control = this.fieldsForm.get(fieldKey);
    
    console.log(`[FormSubmissionCreate] Radio changed for field ${field.id} (${field.fieldCode || 'no-code'})`, {
      optionValue,
      controlValue: control?.value,
      controlExists: !!control,
      eventChecked: event.target.checked
    });
    
    if (control && event.target.checked) {
      // Ensure the control value is updated
      control.setValue(optionValue, { emitEvent: true });
      // Update fieldValues for rule evaluation
      this.updateFieldValues();
      // Calculate dependent calculated fields (like FormViewComponent)
      if (field.fieldCode) {
        this.calculateFields(field.fieldCode).catch(error => {
          console.error('[FormSubmissionCreate] Error calculating fields:', error);
        });
      }
    }
  }

  onCheckboxChange(field: FormFieldDto, optionValue: string, event: any): void {
    if (!field.id) return;
    const fieldKey = `field_${field.id}`;
    const control = this.fieldsForm.get(fieldKey);
    if (!control) return;
    
    const currentValue = control.value || [];
    let newValue: any[] = Array.isArray(currentValue) ? [...currentValue] : [];
    
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
    
    // Update field values and evaluate rules
    this.updateFieldValues();
    // Calculate dependent calculated fields (like FormViewComponent)
    if (field.fieldCode) {
      this.calculateFields(field.fieldCode).catch(error => {
        console.error('[FormSubmissionCreate] Error calculating fields:', error);
      });
    }
    // Use setTimeout to defer rule evaluation and avoid infinite loops
    setTimeout(() => {
      if (!this.isEvaluatingRules) {
        this.evaluateFormRules();
      }
    }, 0);
  }

  getAllowedExtensions(field: FormFieldDto): string[] {
    // Extract from field configuration or return default
    return ['.png', '.jpg', '.jpeg', '.pdf'];
  }

  getMaxFileSize(field: FormFieldDto): number {
    // Extract from field configuration or return default (10 MB)
    return 10 * 1024 * 1024;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatAllowedExtensions(extensions: string[]): string {
    return extensions.map(ext => ext.toUpperCase()).join(', ');
  }

  getAcceptedFileTypes(field: FormFieldDto): string {
    const extensions = this.getAllowedExtensions(field);
    return extensions.join(',');
  }

  // ===== Field DataSource Helpers =====

  /**
   * Load field options from DataSource if available
   */
  loadFieldOptionsFromDataSource(field: FormFieldDto, context?: Record<string, any>): void {
    if (!field.id) {
      console.log(`[FormSubmissionCreate] Skipping DataSource load: field has no ID`);
      return;
    }

    // Check if field has options type (select, radio, checkbox)
    const fieldType = this.getFieldType(field);
    console.log(`[FormSubmissionCreate] Checking DataSource for field ${field.id} (${field.fieldCode || 'no-code'}), type: ${fieldType}`);
    
    if (!['select', 'radio', 'checkbox'].includes(fieldType)) {
      console.log(`[FormSubmissionCreate] Field ${field.id} is not an options field, skipping DataSource`);
      return;
    }

    // Check if field has a DataSource configuration
    const dataSource = field.fieldDataSource;
    if (!dataSource) {
      console.log(`[FormSubmissionCreate] Field ${field.id} has no DataSource configuration`);
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }
    
    if (!dataSource.isActive) {
      console.log(`[FormSubmissionCreate] Field ${field.id} DataSource is not active`);
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }

    console.log(`[FormSubmissionCreate] Field ${field.id} has DataSource:`, {
      sourceType: dataSource.sourceType,
      isActive: dataSource.isActive,
      apiUrl: dataSource.apiUrl,
      valuePath: dataSource.valuePath,
      textPath: dataSource.textPath
    });

    // For Static DataSource, use static options from field.fieldOptions
    if (dataSource.sourceType === 'Static') {
      console.log(`[FormSubmissionCreate] Field ${field.id} has Static DataSource, using static options from field.fieldOptions`);
      // Static options are already in field.fieldOptions, so we don't need to load them
      // Just mark as loaded (empty array means use static options)
      this.fieldDataSourceOptions[field.id] = [];
      this.loadingFieldOptions[field.id] = false;
      return;
    }

    // For Api, LookupTable, or SqlQuery, load options dynamically
    // Note: Backend stores SqlQuery as "DataSourceSqlQuery", so check for both
    const isSqlQuery = dataSource.sourceType === 'SqlQuery' || dataSource.sourceType === 'DataSourceSqlQuery';
    if (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable' || isSqlQuery) {
      console.log(`[FormSubmissionCreate] Loading options for field ${field.id} from ${dataSource.sourceType} DataSource`);
      this.loadingFieldOptions[field.id] = true;
      
      // Disable control while loading
      this.updateFieldDisabledState(field);

      // Build context if not provided and DataSource requires it
      let finalContext = context;
      if (!finalContext && requiresContext(dataSource)) {
        finalContext = buildContext(dataSource, this.fieldValues);
        console.log(`[FormSubmissionCreate] Built context for field ${field.id}:`, finalContext);
      }

      // Track context dependencies for this field
      const contextFields = getContextFieldCodes(dataSource);
      if (contextFields.length > 0) {
        this.contextDependencies[field.id] = contextFields;
        console.log(`[FormSubmissionCreate] Field ${field.id} depends on context fields:`, contextFields);
      }

      this.fieldDataSourceService.getFieldOptions(field.id, finalContext).subscribe({
        next: (options: FieldOptionResponse[]) => {
          console.log(`[FormSubmissionCreate] Received options for field ${field.id}:`, {
            optionsCount: options?.length || 0,
            options: options,
            isArray: Array.isArray(options)
          });
          
          if (options && options.length > 0) {
            this.fieldDataSourceOptions[field.id] = options;
            // Clear cache when DataSource options are updated
            delete this._cachedMappedOptions[field.id];
            delete this._cachedStaticOptions[field.id];
            delete this._loggedFieldOptions[field.id];
            console.log(`[FormSubmissionCreate] ✅ Loaded ${options.length} options for field ${field.id} from ${dataSource.sourceType}`);
          } else {
            this.fieldDataSourceOptions[field.id] = [];
            // Clear cache when DataSource returns empty
            delete this._cachedMappedOptions[field.id];
            delete this._cachedStaticOptions[field.id];
            delete this._loggedFieldOptions[field.id];
            console.warn(`[FormSubmissionCreate] ⚠️ DataSource returned no options for field ${field.id}, will use static options`);
          }
          this.loadingFieldOptions[field.id] = false;
          
          // Update control disabled state
          this.updateFieldDisabledState(field);
          
          // Don't call markForCheck or detectChanges - Angular will detect changes automatically
          // Calling markForCheck here causes infinite loops
        },
        error: (error) => {
          console.error(`[FormSubmissionCreate] ❌ Error loading options from ${dataSource.sourceType} DataSource for field ${field.id}:`, {
            error: error,
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            url: error?.url,
            errorDetails: error?.error
          });
          this.fieldDataSourceOptions[field.id] = [];
          // Clear cache on error
          delete this._cachedMappedOptions[field.id];
          delete this._cachedStaticOptions[field.id];
          delete this._loggedFieldOptions[field.id];
          this.loadingFieldOptions[field.id] = false;
          
          // Update control disabled state
          this.updateFieldDisabledState(field);
          
          // Don't call markForCheck or detectChanges - Angular will detect changes automatically
          // Calling markForCheck here causes infinite loops
        }
      });
    } else {
      console.warn(`[FormSubmissionCreate] Unknown DataSource type: ${dataSource.sourceType} for field ${field.id}`);
      this.fieldDataSourceOptions[field.id] = [];
    }
  }

  /**
   * Update field control disabled state based on loading status
   */
  private updateFieldDisabledState(field: FormFieldDto): void {
    if (!field.id || !this.fieldsForm) {
      return;
    }
    
    const fieldKey = `field_${field.id}`;
    const control = this.fieldsForm.get(fieldKey);
    if (!control) {
      return;
    }
    
    const isLoading = this.loadingFieldOptions[field.id] || false;
    const isEditable = this.isFieldEditable(field);
    const shouldBeDisabled = isLoading || !isEditable;
    
    if (shouldBeDisabled && !control.disabled) {
      control.disable({ emitEvent: false });
    } else if (!shouldBeDisabled && control.disabled && !this.isFieldReadOnly(field)) {
      control.enable({ emitEvent: false });
    }
  }

  /**
   * Check if field is read-only
   */
  private isFieldReadOnly(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
    if (dynamicState?.isReadOnly !== undefined) {
      return dynamicState.isReadOnly;
    }
    return field.isEditable === false;
  }

  // ===== Form Rules Helpers =====

  /**
   * Load form rules
   */
  loadFormRules(formId: number): void {
    if (!formId) return;

    this.formRulesService.getRulesByFormId(formId).subscribe({
      next: (rules) => {
        if (this.currentForm) {
          this.currentForm.formRules = rules;
          // Use setTimeout to defer rule evaluation and avoid infinite loops
          setTimeout(() => {
            if (!this.isEvaluatingRules) {
              this.evaluateFormRules();
            }
          }, 0);
        }
      },
      error: (error) => {
        console.warn('Error loading form rules:', error);
        // Continue without rules
        if (this.currentForm) {
          this.currentForm.formRules = [];
        }
        this.resetDynamicFieldStates();
      }
    });
  }

  /**
   * Update field values from form for rule evaluation
   */
  updateFieldValues(): void {
    if (!this.fieldsForm) {
      return;
    }
    
    this.fields.forEach(field => {
      if (field.id && field.fieldCode) {
        const fieldKey = `field_${field.id}`;
        const control = this.fieldsForm.get(fieldKey);
        if (control) {
          this.fieldValues[field.fieldCode] = control.value;
          this.fieldValues[String(field.id)] = control.value;
        }
      }
    });
  }

  /**
   * Get field value (like FormViewComponent)
   */
  getFieldValue(field: FormFieldDto): any {
    if (!field) return '';
    
    // Priority 1: Field ID (unique, normalized to string)
    const idKey = field.id !== undefined && field.id !== null ? String(field.id) : null;
    if (idKey && this.fieldValues[idKey] !== undefined) {
      return this.fieldValues[idKey];
    }
    
    // Priority 2: Field Code
    if (field.fieldCode && this.fieldValues[field.fieldCode] !== undefined) {
      return this.fieldValues[field.fieldCode];
    }
    
    // Priority 3: Form control value
    if (field.id && this.fieldsForm) {
      const fieldKey = `field_${field.id}`;
      const control = this.fieldsForm.get(fieldKey);
      if (control && control.value !== null && control.value !== undefined && control.value !== '') {
        return control.value;
      }
    }
    
    // Fallback: Default value
    return this.getDefaultValue(field);
  }

  /**
   * Get default value for field
   */
  getDefaultValue(field: FormFieldDto): any {
    // Check if defaultValueJson exists and is not empty
    if (!field.defaultValueJson || field.defaultValueJson.trim() === '') {
      return '';
    }
    
    try {
      // Try to parse JSON if it's a JSON string
      const parsed = JSON.parse(field.defaultValueJson);
      
      // Handle different types
      if (parsed === null || parsed === undefined) {
        return '';
      }
      
      // If it's an array, join it or return first element
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.map(String).join(', ') : '';
      }
      
      // If it's an object (but not null), stringify it
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed);
      }
      
      // Otherwise, return as string
      return String(parsed).trim();
    } catch {
      // If not valid JSON, return as is (but trim it)
      return field.defaultValueJson.trim();
    }
  }

  /**
   * Find which field code changed by comparing form values
   */
  private findChangedFieldCode(newFormValues: any): string | null {
    // Store previous values if not exists
    if (!(this as any)._previousFormValues) {
      (this as any)._previousFormValues = {};
    }
    
    const previousValues = (this as any)._previousFormValues;
    let changedFieldCode: string | null = null;
    
    // Compare values to find what changed
    Object.keys(newFormValues).forEach(key => {
      if (key.startsWith('field_')) {
        const fieldId = key.replace('field_', '');
        const field = this.fields.find(f => String(f.id) === fieldId);
        
        if (field && field.fieldCode) {
          const newValue = newFormValues[key];
          const oldValue = previousValues[key];
          
          // Check if value actually changed
          if (newValue !== oldValue) {
            // Skip calculated fields (they shouldn't trigger recalculation)
            if (!this.calculationEngine.isCalculatedField(field)) {
              changedFieldCode = field.fieldCode;
            }
          }
        }
      }
    });
    
    // Update previous values
    (this as any)._previousFormValues = { ...newFormValues };
    
    return changedFieldCode;
  }

  /**
   * Evaluate all form rules and apply actions
   */
  evaluateFormRules(): void {
    // Prevent infinite loops
    if (this.isEvaluatingRules) {
      return;
    }
    
    try {
      this.isEvaluatingRules = true;
      
      if (!this.currentForm) {
        return;
      }
      
      // If formRules is not loaded yet, initialize it as empty array
      if (!this.currentForm.formRules) {
        this.currentForm.formRules = [];
      }
      
      if (this.currentForm.formRules.length === 0) {
        return;
      }

      // Reset dynamic states to base field states
      try {
        this.resetDynamicFieldStates();
      } catch (error) {
        console.error('[FormSubmissionCreate] Error resetting dynamic field states:', error);
        // Continue even if reset fails
      }

      // Build base field states
      const baseFieldStates: Record<string, FieldState> = {};
      this.fields.forEach(field => {
        if (field.fieldCode) {
          baseFieldStates[field.fieldCode] = {
            isVisible: field.isVisible ?? true,
            isMandatory: field.isMandatory ?? false,
            isReadOnly: field.isEditable === false
          };
        }
      });

      // Use RuleEvaluationService to evaluate all rules
      let evaluatedStates: Record<string, FieldState>;
      try {
        evaluatedStates = this.ruleEvaluationService.evaluateAllRules(
          this.currentForm.formRules,
          this.fieldValues,
          baseFieldStates
        );
      } catch (error) {
        console.error('[FormSubmissionCreate] Error evaluating rules:', error);
        // Return early if rule evaluation fails
        return;
      }

      // Update dynamicFieldStates with evaluated states
      Object.keys(evaluatedStates).forEach(fieldCode => {
        const state = evaluatedStates[fieldCode];
        if (this.dynamicFieldStates[fieldCode]) {
          this.dynamicFieldStates[fieldCode].isVisible = state.isVisible;
          this.dynamicFieldStates[fieldCode].isRequired = state.isMandatory;
          this.dynamicFieldStates[fieldCode].isReadOnly = state.isReadOnly;
          if (state.value !== undefined) {
            this.dynamicFieldStates[fieldCode].value = state.value;
          }
        } else {
          this.dynamicFieldStates[fieldCode] = {
            isVisible: state.isVisible,
            isRequired: state.isMandatory,
            isReadOnly: state.isReadOnly,
            value: state.value
          };
        }
      });
      
      // Update disabled state for all fields after rule evaluation
      this.fields.forEach(field => {
        if (field.id) {
          this.updateFieldDisabledState(field);
        }
      });

      // Also ensure all fields have dynamic states initialized
      this.fields.forEach(field => {
        if (field.fieldCode && !this.dynamicFieldStates[field.fieldCode]) {
          this.dynamicFieldStates[field.fieldCode] = {
            isVisible: field.isVisible ?? true,
            isRequired: field.isMandatory ?? false,
            isReadOnly: field.isEditable === false
          };
        }
      });

      // Update form validators based on dynamic states
      try {
        this.updateFormValidators();
      } catch (error) {
        console.error('[FormSubmissionCreate] Error updating form validators:', error);
      }

      // Reload options for fields that depend on context
      try {
        this.reloadContextDependentOptions();
      } catch (error) {
        console.error('[FormSubmissionCreate] Error reloading context dependent options:', error);
      }

      // Don't call detectChanges or markForCheck here - it causes infinite loops
      // Change detection will happen automatically when form values change
    } catch (error) {
      console.error('[FormSubmissionCreate] Unexpected error in evaluateFormRules:', error);
      // Don't throw, just log the error
    } finally {
      this.isEvaluatingRules = false;
    }
  }

  /**
   * Reset dynamic field states to base field configuration
   */
  private resetDynamicFieldStates(): void {
    this.fields.forEach(field => {
      if (field.fieldCode) {
        if (!this.dynamicFieldStates[field.fieldCode]) {
          this.dynamicFieldStates[field.fieldCode] = {};
        }
        this.dynamicFieldStates[field.fieldCode].isVisible = field.isVisible ?? true;
        this.dynamicFieldStates[field.fieldCode].isRequired = field.isMandatory ?? false;
        this.dynamicFieldStates[field.fieldCode].isReadOnly = field.isEditable === false;
      }
    });
  }

  /**
   * Update form validators based on dynamic field states
   */
  private updateFormValidators(): void {
    if (!this.fieldsForm) {
      return;
    }
    
    this.fields.forEach(field => {
      if (field.id && field.fieldCode) {
        const fieldKey = `field_${field.id}`;
        const control = this.fieldsForm.get(fieldKey);
        if (control) {
          const dynamicState = this.dynamicFieldStates[field.fieldCode];
          const isRequired = dynamicState?.isRequired ?? field.isMandatory ?? false;

          // Check if validators need to change
          const hasRequiredValidator = control.hasError('required') || control.validator === Validators.required;
          
          if (isRequired && !hasRequiredValidator) {
            control.setValidators([Validators.required]);
            control.updateValueAndValidity({ emitEvent: false }); // Don't emit events to prevent loops
          } else if (!isRequired && hasRequiredValidator) {
            control.clearValidators();
            control.updateValueAndValidity({ emitEvent: false }); // Don't emit events to prevent loops
          }
        }
      }
    });
  }

  /**
   * Reload options for fields that depend on context fields
   */
  private reloadContextDependentOptions(): void {
    Object.keys(this.contextDependencies).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const contextFields = this.contextDependencies[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && contextFields.length > 0) {
        // Check if any context field value changed
        const contextChanged = contextFields.some(contextFieldCode => {
          const currentValue = this.fieldValues[contextFieldCode];
          return currentValue !== null && currentValue !== undefined && currentValue !== '';
        });

        if (contextChanged) {
          this.loadFieldOptionsFromDataSource(field);
        }
      }
    });
  }

  /**
   * Calculate calculated fields based on changed field (like FormViewComponent)
   */
  private async calculateFields(changedFieldCode: string): Promise<void> {
    console.log(`[FormSubmissionCreate] calculateFields called for: ${changedFieldCode}`);
    
    // Get all fields
    const allFields = this.fields;

    console.log(`[FormSubmissionCreate] Total fields: ${allFields.length}`);
    
    // Normalize expressionText from PascalCase if needed
    allFields.forEach(field => {
      if (!field.expressionText && (field as any).ExpressionText) {
        field.expressionText = (field as any).ExpressionText;
        console.log(`[FormSubmissionCreate] Normalized ExpressionText to expressionText for field ${field.fieldCode}: ${field.expressionText}`);
      }
    });

    // Find calculated fields that depend on the changed field
    const calculatedFields = allFields.filter(field => 
      this.calculationEngine.isCalculatedField(field) &&
      (field.recalculateOn === 'OnFieldChange' || !field.recalculateOn || field.recalculateOn === null) // Default to OnFieldChange
    );

    console.log(`[FormSubmissionCreate] Found ${calculatedFields.length} calculated fields with OnFieldChange:`, 
      calculatedFields.map(f => ({ code: f.fieldCode, recalculateOn: f.recalculateOn })));

    if (calculatedFields.length === 0) {
      console.log('[FormSubmissionCreate] No calculated fields found, returning');
      return; // No calculated fields to update
    }

    // Get dependent calculated fields
    let dependentFields = this.calculationEngine.getDependentCalculatedFields(
      changedFieldCode,
      calculatedFields
    );

    console.log(`[FormSubmissionCreate] Found ${dependentFields.length} dependent calculated fields for ${changedFieldCode}:`, 
      dependentFields.map(f => f.fieldCode));

    // If no dependent fields found but we have calculated fields, 
    // check if any calculated field has expressionText that might reference the changed field
    if (dependentFields.length === 0 && calculatedFields.length > 0) {
      // Fallback: if expressionText is missing, calculate all calculated fields
      // This handles the case where expressionText wasn't loaded yet
      const fieldsWithExpression = calculatedFields.filter(f => f.expressionText && f.expressionText.trim() !== '');
      if (fieldsWithExpression.length === 0) {
        console.log(`[FormSubmissionCreate] No expressionText found for calculated fields, calculating all calculated fields as fallback`);
        dependentFields = calculatedFields; // Calculate all calculated fields
      }
    }

    if (dependentFields.length === 0) {
      console.log(`[FormSubmissionCreate] No fields depend on ${changedFieldCode}, returning`);
      return; // No fields depend on the changed field
    }

    // Recalculate dependent fields (like FormViewComponent - use calculateAllFields but filter results)
    try {
      console.log(`[FormSubmissionCreate] Current fieldValues before calculation:`, this.fieldValues);
      
      // Use calculateAllFields like FormViewComponent - it handles all calculated fields and dependencies
      // But we'll filter results to only update dependent fields
      const results = await this.calculationEngine.calculateAllFields(
        allFields,
        this.fieldValues
      );
      
      // Filter results to only include dependent fields (and fields that depend on them)
      const dependentFieldCodes = new Set(dependentFields.map(f => f.fieldCode).filter(code => !!code));
      
      // Also include fields that depend on calculated fields (cascade)
      const fieldsToUpdate = new Set<string>(dependentFieldCodes);
      let hasNewDependencies = true;
      while (hasNewDependencies) {
        hasNewDependencies = false;
        calculatedFields.forEach(field => {
          if (!field.fieldCode || fieldsToUpdate.has(field.fieldCode)) return;
          if (field.expressionText) {
            const dependentCodes = this.calculationEngine.extractFieldCodes(field.expressionText);
            const dependsOnCalculatedField = dependentCodes.some(code => fieldsToUpdate.has(code));
            if (dependsOnCalculatedField) {
              fieldsToUpdate.add(field.fieldCode);
              hasNewDependencies = true;
            }
          }
        });
      }
      
      // Filter results to only include fields we need to update
      const filteredResults: { [fieldCode: string]: number | string } = {};
      Object.keys(results).forEach(fieldCode => {
        if (fieldsToUpdate.has(fieldCode)) {
          filteredResults[fieldCode] = results[fieldCode];
        }
      });

      console.log(`[FormSubmissionCreate] Calculation results (filtered):`, filteredResults);

      // Update field values with calculated results (like FormViewComponent)
      Object.keys(filteredResults).forEach(fieldCode => {
        const calculatedValue = filteredResults[fieldCode];
        // Find the field to get its ID
        const field = allFields.find(f => f.fieldCode === fieldCode);
        if (field && field.id) {
          const idKey = String(field.id);
          const fieldKey = `field_${field.id}`;
          const control = this.fieldsForm.get(fieldKey);
          
          if (control) {
            const oldValue = this.fieldValues[idKey];
            // Update form control value without emitting events to prevent loops
            // Use patchValue instead of setValue for p-inputNumber compatibility
            control.patchValue(calculatedValue, { emitEvent: false });
            // Also update valueAndValidity to ensure UI updates
            control.updateValueAndValidity({ emitEvent: false });
            this.fieldValues[idKey] = calculatedValue;
            this.fieldValues[fieldCode] = calculatedValue;
            
            // Clear any previous error for this field
            if (field.id) {
              delete this.calculationErrors[field.id];
            }
            
            console.log(`[FormSubmissionCreate] Updated field ${fieldCode} (ID: ${idKey}): ${oldValue} -> ${calculatedValue}`);
          } else {
            console.warn(`[FormSubmissionCreate] ⚠️ Form control not found for field ${fieldCode} (key: ${fieldKey})`);
          }
        }
      });
      
      // Handle calculation errors - check if any calculated fields failed
      // calculateAllFields only returns successful results, so check which fields didn't get results
      const calculatedFieldCodes = calculatedFields.map(f => f.fieldCode).filter(code => !!code);
      calculatedFieldCodes.forEach(fieldCode => {
        if (!results[fieldCode] && fieldCode) {
          const field = allFields.find(f => f.fieldCode === fieldCode);
          if (field && field.id && field.expressionText) {
            // Field calculation failed - try to calculate individually to get error message
            const fieldValuesMap = this.calculationEngine.buildFieldValuesMap(this.fieldValues, allFields);
            this.calculationEngine.calculateExpressionSafe(field.expressionText, fieldValuesMap).then(result => {
              if (!result.success && field.id) {
                this.calculationErrors[field.id] = result.error || 'Unknown calculation error';
                
                // Show user-friendly error message for syntax errors
                const currentLang = this.translationService.getCurrentLanguage();
                const errorMessage = result.error || 'Unknown calculation error';
                
                if (errorMessage.includes('Incomplete expression') || 
                    errorMessage.includes('Invalid expression') || 
                    errorMessage.includes('Syntax error') ||
                    errorMessage.includes('mismatched')) {
                  this.messageService.add({
                    severity: 'error',
                    summary: currentLang === 'ar' ? 'خطأ في التعبير' : 'Expression Error',
                    detail: currentLang === 'ar' 
                      ? `حقل "${field.fieldName || field.fieldCode}": ${errorMessage}. يرجى تصحيح التعبير في إعدادات الحقل.`
                      : `Field "${field.fieldName || field.fieldCode}": ${errorMessage}. Please fix the expression in field settings.`,
                    life: 10000
                  });
                }
              }
            }).catch(error => {
              console.error(`[FormSubmissionCreate] Error calculating field ${fieldCode}:`, error);
            });
          }
        }
      });

      // Trigger change detection
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[FormSubmissionCreate] Error calculating fields:', error);
    }
  }

  /**
   * Calculate calculated fields on form load (like FormViewComponent)
   */
  private async calculateFieldsOnLoad(): Promise<void> {
    // Get all fields
    const allFields = this.fields;

    // Find all calculated fields
    const calculatedFields = allFields.filter(field => 
      this.calculationEngine.isCalculatedField(field)
    );

    if (calculatedFields.length === 0) {
      return; // No calculated fields to update
    }

    // Check if there are any values to calculate with
    const hasValues = Object.keys(this.fieldValues).some(key => {
      const value = this.fieldValues[key];
      return value !== null && value !== undefined && value !== '';
    });
    
    // Calculate all calculated fields on load if:
    // 1. recalculateOn is 'OnLoad' or not specified (default)
    // 2. OR there are values in the form (user may have entered data or default values exist)
    const fieldsToCalculate = calculatedFields.filter(field => {
      const recalculateOn = field.recalculateOn || 'OnLoad'; // Default to OnLoad
      return recalculateOn === 'OnLoad' || hasValues;
    });

    if (fieldsToCalculate.length === 0) {
      return; // No fields to calculate
    }

    // Recalculate all calculated fields that should be calculated on load
    try {
      console.log('[FormSubmissionCreate] Calculating fields on load. Fields:', fieldsToCalculate.map(f => f.fieldCode), 'Values:', this.fieldValues);
      
      const results = await this.calculationEngine.calculateAllFields(
        allFields,
        this.fieldValues
      );

      console.log('[FormSubmissionCreate] Calculation results:', results);

      // Update field values with calculated results
      Object.keys(results).forEach(fieldCode => {
        const result = results[fieldCode];
        // Find the field to get its ID
        const field = allFields.find(f => f.fieldCode === fieldCode);
        if (field && field.id) {
          const idKey = String(field.id);
          const fieldKey = `field_${field.id}`;
          const control = this.fieldsForm.get(fieldKey);
          
          if (control) {
            // Update form control value without emitting events to prevent loops
            // Use patchValue instead of setValue for p-inputNumber compatibility
            control.patchValue(result, { emitEvent: false });
            // Also update valueAndValidity to ensure UI updates
            control.updateValueAndValidity({ emitEvent: false });
            this.fieldValues[idKey] = result;
            this.fieldValues[fieldCode] = result;
            
            // Clear any previous error for this field
            if (field.id) {
              delete this.calculationErrors[field.id];
            }
            
            console.log(`[FormSubmissionCreate] Updated field ${fieldCode} (ID: ${idKey}) with calculated value:`, result);
          } else {
            console.warn(`[FormSubmissionCreate] ⚠️ Form control not found for field ${fieldCode} (key: ${fieldKey})`);
          }
        }
      });
      
      // Note: calculateAllFields handles errors internally and only returns successful results
      // Failed calculations are logged but don't appear in results
      // To show errors for failed fields, we need to check which fields didn't get results
      const calculatedFieldCodes = fieldsToCalculate.map(f => f.fieldCode).filter(code => !!code);
      calculatedFieldCodes.forEach(fieldCode => {
        if (!results[fieldCode] && fieldCode) {
          const field = allFields.find(f => f.fieldCode === fieldCode);
          if (field && field.id && field.expressionText) {
            // Field calculation failed - try to calculate individually to get error message
            const fieldValuesMap = this.calculationEngine.buildFieldValuesMap(this.fieldValues, allFields);
            this.calculationEngine.calculateExpressionSafe(field.expressionText, fieldValuesMap).then(result => {
              if (!result.success && field.id) {
                this.calculationErrors[field.id] = result.error || 'Unknown calculation error';
                
                // Show user-friendly error message for syntax errors
                const currentLang = this.translationService.getCurrentLanguage();
                const errorMessage = result.error || 'Unknown calculation error';
                
                if (errorMessage.includes('Incomplete expression') || 
                    errorMessage.includes('Invalid expression') || 
                    errorMessage.includes('Syntax error') ||
                    errorMessage.includes('mismatched')) {
                  this.messageService.add({
                    severity: 'error',
                    summary: currentLang === 'ar' ? 'خطأ في التعبير' : 'Expression Error',
                    detail: currentLang === 'ar' 
                      ? `حقل "${field.fieldName || field.fieldCode}": ${errorMessage}. يرجى تصحيح التعبير في إعدادات الحقل.`
                      : `Field "${field.fieldName || field.fieldCode}": ${errorMessage}. Please fix the expression in field settings.`,
                    life: 10000
                  });
                }
              }
            }).catch(error => {
              console.error(`[FormSubmissionCreate] Error calculating field ${fieldCode}:`, error);
            });
          }
        }
      });
      
      // Force change detection to update UI (especially for p-inputNumber)
      setTimeout(() => {
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }, 0);
    } catch (error) {
      console.error('[FormSubmissionCreate] Error calculating fields on load:', error);
    }
  }

  /**
   * Calculate all calculated fields based on current field values
   * @param recalculateMode - Filter by recalculation mode (null = all modes)
   * @deprecated Use calculateFields() or calculateFieldsOnLoad() instead (like FormViewComponent)
   */
  private async calculateCalculatedFields(recalculateMode: 'OnFieldChange' | 'OnLoad' | 'OnSubmitOnly' | null = 'OnFieldChange'): Promise<void> {
    if (!this.fieldsForm || !this.fields.length) return;

    const calculatedFields = this.fields.filter(f => {
      if (!this.calculationEngine.isCalculatedField(f)) return false;
      if (recalculateMode === null) return true;
      // If recalculateMode is 'OnFieldChange', include fields with OnFieldChange or no recalculateOn (default to OnFieldChange)
      if (recalculateMode === 'OnFieldChange') {
        return f.recalculateOn === 'OnFieldChange' || !f.recalculateOn || f.recalculateOn === null;
      }
      // For other modes, match exactly
      return f.recalculateOn === recalculateMode;
    });

    console.log(`[FormSubmissionCreate] Found ${calculatedFields.length} calculated fields for mode: ${recalculateMode}`);
    calculatedFields.forEach(f => {
      console.log(`[FormSubmissionCreate] - Calculated field: ${f.fieldCode} (ID: ${f.id}), expressionText: ${f.expressionText ? 'EXISTS' : 'MISSING'}, recalculateOn: ${f.recalculateOn}`);
    });

    if (calculatedFields.length === 0) return;

    try {
      // Get current field values
      const currentFieldValues: { [fieldCode: string]: any } = {};
      this.fields.forEach(field => {
        if (field.id && field.fieldCode) {
          const fieldKey = `field_${field.id}`;
          const control = this.fieldsForm.get(fieldKey);
          if (control) {
            currentFieldValues[field.fieldCode] = control.value;
          }
        }
      });

      console.log(`[FormSubmissionCreate] Current field values for calculation:`, currentFieldValues);

      // Calculate each calculated field
      for (const field of calculatedFields) {
        if (!field.id || !field.fieldCode) {
          console.warn(`[FormSubmissionCreate] Skipping calculated field - missing id or fieldCode:`, field);
          continue;
        }

        if (!field.expressionText) {
          console.warn(`[FormSubmissionCreate] Calculated field ${field.fieldCode} (ID: ${field.id}) has no expressionText. Attempting to load...`);
          // Try to load the field details to get expressionText
          try {
            const fieldDetails = await this.fieldsService.getFieldById(field.id).toPromise();
            if (fieldDetails && fieldDetails.expressionText) {
              field.expressionText = fieldDetails.expressionText;
              console.log(`[FormSubmissionCreate] ✅ Loaded expressionText for field ${field.fieldCode}: ${field.expressionText}`);
            } else {
              console.error(`[FormSubmissionCreate] ❌ Could not load expressionText for field ${field.fieldCode} (ID: ${field.id})`);
              continue;
            }
          } catch (loadError) {
            console.error(`[FormSubmissionCreate] ❌ Error loading field details for ${field.fieldCode}:`, loadError);
            continue;
          }
        }

        try {
          const fieldValuesMap = this.calculationEngine.buildFieldValuesMap(
            currentFieldValues,
            this.fields
          );

          console.log(`[FormSubmissionCreate] Calculating field ${field.fieldCode} with expression: ${field.expressionText}`);
          console.log(`[FormSubmissionCreate] Field values map:`, fieldValuesMap);

          const result = await this.calculationEngine.calculateExpressionSafe(
            field.expressionText,
            fieldValuesMap
          );

          console.log(`[FormSubmissionCreate] Calculation result for ${field.fieldCode}:`, result);

          if (result.success) {
            // Clear any previous error for this field
            if (field.id) {
              delete this.calculationErrors[field.id];
            }
            
            const fieldKey = `field_${field.id}`;
            const control = this.fieldsForm.get(fieldKey);
            if (control) {
              // Update form control value without emitting events to prevent loops
              control.setValue(result.value, { emitEvent: false });
              console.log(`[FormSubmissionCreate] ✅ Updated calculated field ${field.fieldCode} (ID: ${field.id}) with value:`, result.value);
            } else {
              console.warn(`[FormSubmissionCreate] ⚠️ Form control not found for field ${field.fieldCode} (key: ${fieldKey})`);
            }
            // Update fieldValues for rule evaluation
            this.fieldValues[field.fieldCode] = result.value;
            this.fieldValues[String(field.id)] = result.value;
          } else {
            console.error(`[FormSubmissionCreate] ❌ Calculation failed for ${field.fieldCode}:`, result.error);
            
            // Store error for visual display
            if (field.id) {
              this.calculationErrors[field.id] = result.error || 'Unknown calculation error';
            }
            
            // Show user-friendly error message for calculation failures
            const currentLang = this.translationService.getCurrentLanguage();
            const errorMessage = result.error || 'Unknown calculation error';
            
            // Only show toast for syntax errors or critical errors (not for missing field values)
            if (errorMessage.includes('Incomplete expression') || 
                errorMessage.includes('Invalid expression') || 
                errorMessage.includes('Syntax error') ||
                errorMessage.includes('mismatched')) {
              this.messageService.add({
                severity: 'error',
                summary: currentLang === 'ar' ? 'خطأ في التعبير' : 'Expression Error',
                detail: currentLang === 'ar' 
                  ? `حقل "${field.fieldName || field.fieldCode}": ${errorMessage}. يرجى تصحيح التعبير في إعدادات الحقل.`
                  : `Field "${field.fieldName || field.fieldCode}": ${errorMessage}. Please fix the expression in field settings.`,
                life: 10000 // Show for 10 seconds
              });
            }
            
            // Don't update field value if calculation failed - keep previous value or empty
            // This prevents clearing the field when API returns error
          }
        } catch (error: any) {
          console.error(`[FormSubmissionCreate] ❌ Error calculating field ${field.fieldCode}:`, error);
          // Log detailed error information
          if (error?.status === 500) {
            console.error(`[FormSubmissionCreate] Server error (500) for field ${field.fieldCode}. This may indicate an issue with the expression or field values.`);
            console.error(`[FormSubmissionCreate] Expression: ${field.expressionText}`);
            console.error(`[FormSubmissionCreate] Current field values:`, currentFieldValues);
          }
          // Don't throw - continue with other fields
        }
      }
      
      // Trigger change detection after all calculations are done
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[FormSubmissionCreate] Error calculating calculated fields:', error);
    }
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

  private getFormErrors(formGroup: FormGroup): any {
    const errors: any = {};
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
      if (control instanceof FormGroup) {
        const nestedErrors = this.getFormErrors(control);
        if (Object.keys(nestedErrors).length > 0) {
          errors[key] = nestedErrors;
        }
      }
    });
    return errors;
  }

  goBack(): void {
    this.router.navigate(['/document-types', this.documentTypeId, 'submissions']);
  }

  /**
   * Load submission data for edit mode
   */
  loadSubmissionForEdit(): void {
    if (!this.submissionId) return;
    
    const submissionId = this.submissionId; // Store in local variable to avoid null check issues
    
    // Load submission to get current status
    this.formSubmissionsService.getSubmissionById(submissionId).subscribe({
      next: (submission: FormSubmissionDetailDto) => {
        console.log('[FormSubmissionCreate] Loaded submission for edit:', submission);
        
        // Log gridData if present
        if (submission && submission.gridData) {
          console.log('[FormSubmissionCreate] Submission has gridData:', {
            gridDataCount: submission.gridData.length,
            grids: submission.gridData.map((g: any) => ({
              gridId: g.gridId,
              gridName: g.gridName,
              rowIndex: g.rowIndex,
              cellsCount: g.cells?.length || 0
            }))
          });
        } else {
          console.warn('[FormSubmissionCreate] Submission has NO gridData!', submission);
        }
        // Store current submission for approve/reject
        this.currentSubmission = submission;
        this.currentSubmissionDetail = submission; // Store full detail with gridData
        // Store current status
        (this as any)._currentSubmissionStatus = submission.status;
        // Update form with current status
        this.submissionForm.patchValue({ status: submission.status });
        
        // If submission status is Draft, mark as draft (case-insensitive check)
        if (submission.status?.toLowerCase() === 'draft') {
          this.hasDraft = true;
          this.isDraftMode = true;
          console.log('[FormSubmissionCreate] Edit Mode: Submission is Draft, hasDraft set to true');
        } else {
          // For any other status in edit mode, we still need hasDraft=true to enable Submit
          this.hasDraft = true;
          this.isDraftMode = false;
          console.log('[FormSubmissionCreate] Edit Mode: Submission is', submission.status, ', hasDraft set to true, isDraftMode set to false');
        }
        
        // Update grid components submissionId first
        this.updateGridComponentsSubmissionId();
        
        // Load grid data into components if available
        if (submission.gridData && submission.gridData.length > 0) {
          setTimeout(() => {
            this.loadGridDataIntoComponents(submission);
          }, 300); // Wait for grid components to be initialized
        }
        
        // Load field values
        this.formSubmissionValuesService.getBySubmissionId(submissionId).subscribe({
          next: (fieldValues) => {
            console.log('[FormSubmissionCreate] Loaded field values for edit:', fieldValues);
            // Store field values to populate form after fields are loaded
            (this as any)._pendingFieldValues = fieldValues;
            
            // If fields are already loaded, populate form
            if (this.fields.length > 0) {
              this.populateFormWithFieldValues(fieldValues);
            }
          },
          error: (error) => {
            console.error('[FormSubmissionCreate] Error loading field values:', error);
            const currentLang = this.translationService.getCurrentLanguage();
            this.messageService.add({
              severity: 'warn',
              summary: currentLang === 'ar' ? 'تحذير' : 'Warning',
              detail: currentLang === 'ar' 
                ? 'فشل تحميل قيم الحقول. قد تكون بعض البيانات غير متاحة.' 
                : 'Failed to load field values. Some data may not be available.'
            });
          }
        });
      },
      error: (error) => {
        console.error('[FormSubmissionCreate] Error loading submission:', error);
        const currentLang = this.translationService.getCurrentLanguage();
        
        // Check if it's a 404 error (submission not found)
        if (error?.status === 404) {
          this.messageService.add({
            severity: 'error',
            summary: currentLang === 'ar' ? 'خطأ' : 'Error',
            detail: currentLang === 'ar' 
              ? 'لم يتم العثور على الـ submission. قد يكون تم حذفه.' 
              : 'Submission not found. It may have been deleted.'
          });
          // Redirect back after showing error
          setTimeout(() => this.goBack(), 2000);
          return;
        }
        
        // For other errors, try to continue with field values
        this.messageService.add({
          severity: 'warn',
          summary: currentLang === 'ar' ? 'تحذير' : 'Warning',
          detail: currentLang === 'ar' 
            ? 'فشل تحميل بيانات الـ submission. سيتم المحاولة بدون معلومات الـ status.' 
            : 'Failed to load submission data. Will continue without status information.'
        });
        
        // Default to Draft if we can't load the status
        (this as any)._currentSubmissionStatus = 'Draft';
        
        // Continue loading field values even if submission load fails
        this.formSubmissionValuesService.getBySubmissionId(submissionId).subscribe({
          next: (fieldValues) => {
            console.log('[FormSubmissionCreate] Loaded field values for edit:', fieldValues);
            (this as any)._pendingFieldValues = fieldValues;
            if (this.fields.length > 0) {
              this.populateFormWithFieldValues(fieldValues);
            }
          },
          error: (error) => {
            console.error('[FormSubmissionCreate] Error loading field values:', error);
            this.messageService.add({
              severity: 'error',
              summary: currentLang === 'ar' ? 'خطأ' : 'Error',
              detail: currentLang === 'ar' 
                ? 'فشل تحميل بيانات الـ submission. يرجى المحاولة مرة أخرى.' 
                : 'Failed to load submission data. Please try again.'
            });
          }
        });
      }
    });

    // Note: Attachments will be loaded from processFields after fields are loaded
    // This ensures fields are available before loading attachments
  }

  loadAttachmentsForEdit(): void {
    if (!this.submissionId) {
      console.warn('[FormSubmissionCreate] loadAttachmentsForEdit: No submissionId');
      return;
    }
    
    console.log(`[FormSubmissionCreate] loadAttachmentsForEdit called for submissionId: ${this.submissionId}`);
    
    // Reset deleted attachments when loading new submission
    this.deletedAttachments = [];

    // Wait for fields to be loaded
    if (this.fields.length === 0) {
      console.log('[FormSubmissionCreate] Fields not loaded yet, retrying in 200ms...');
      setTimeout(() => this.loadAttachmentsForEdit(), 200);
      return;
    }

    console.log(`[FormSubmissionCreate] Checking ${this.fields.length} fields for file/image fields...`);

    // Find all file/image fields
    const fileFields = this.fields.filter(field => {
      const isFile = this.isFileField(field);
      if (isFile) {
        console.log(`[FormSubmissionCreate] Found file field: ${field.id} (${field.fieldCode || field.fieldName || 'no-name'})`);
      }
      return isFile;
    });
    
    console.log(`[FormSubmissionCreate] Found ${fileFields.length} file field(s)`);
    
    if (fileFields.length === 0) {
      // This is normal - not all forms have file fields
      console.log('[FormSubmissionCreate] No file fields found in this form. All fields:', this.fields.map(f => ({
        id: f.id,
        fieldCode: f.fieldCode,
        fieldName: f.fieldName,
        fieldTypeName: f.fieldTypeName,
        fieldType: f.fieldType?.typeName
      })));
      return;
    }

    // Load attachments for each file field
    fileFields.forEach(field => {
      if (!field.id) {
        console.warn('[FormSubmissionCreate] File field has no ID:', field);
        return;
      }
      
      console.log(`[FormSubmissionCreate] Loading attachments for field ${field.id} (${field.fieldCode || field.fieldName || 'no-name'})...`);
      
      this.formSubmissionAttachmentsService.getBySubmissionAndField(this.submissionId!, field.id).subscribe({
        next: (attachments) => {
          const attachmentsArray = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);
          console.log(`[FormSubmissionCreate] ✅ Loaded ${attachmentsArray.length} attachment(s) for field ${field.id} (${field.fieldCode || field.fieldName || 'no-name'})`);
          if (attachmentsArray.length > 0) {
            console.log(`[FormSubmissionCreate] First attachment:`, attachmentsArray[0]);
          }
          this.existingAttachments[field.id] = attachmentsArray;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`[FormSubmissionCreate] ❌ Error loading attachments for field ${field.id} (${field.fieldCode || field.fieldName || 'no-name'}):`, error);
          this.existingAttachments[field.id] = [];
          this.cdr.detectChanges();
        }
      });
    });
  }

  getExistingAttachments(fieldId: number): FormSubmissionAttachmentDto[] {
    return this.existingAttachments[fieldId] || [];
  }

  getAttachmentImageUrl(attachment: FormSubmissionAttachmentDto): string {
    if (!attachment.id) return '';
    // Use FileUploadService to get download URL (same as form-submissions-list)
    return this.fileUploadService.getDownloadUrl(attachment.id);
  }

  getAttachmentDownloadUrl(attachmentId: number): string {
    // Use FileUploadService to get download URL (same as form-submissions-list)
    return this.fileUploadService.getDownloadUrl(attachmentId);
  }

  isImageAttachment(attachment: FormSubmissionAttachmentDto): boolean {
    const contentType = (attachment.contentType || '').toLowerCase();
    return contentType.startsWith('image/');
  }

  removeExistingAttachment(fieldId: number, attachmentId: number): void {
    if (!this.existingAttachments[fieldId]) return;
    
    // Track deleted attachment for server deletion
    if (attachmentId && !this.deletedAttachments.includes(attachmentId)) {
      this.deletedAttachments.push(attachmentId);
      console.log(`[FormSubmissionCreate] Marked attachment ${attachmentId} for deletion`);
    }
    
    // Remove from local display
    this.existingAttachments[fieldId] = this.existingAttachments[fieldId].filter(att => att.id !== attachmentId);
    this.cdr.detectChanges();
  }

  /**
   * Populate form with existing field values
   */
  populateFormWithFieldValues(fieldValues: any[]): void {
    if (!fieldValues || fieldValues.length === 0) return;
    
    const formValues: any = {};
    
    fieldValues.forEach(fv => {
      const field = this.fields.find(f => f.id === fv.fieldId);
      if (!field || !field.fieldCode) return;
      
      let value: any = null;
      
      // Determine value based on field type
      if (fv.valueString !== null && fv.valueString !== undefined && fv.valueString !== '') {
        value = fv.valueString;
      } else if (fv.valueNumber !== null && fv.valueNumber !== undefined) {
        value = fv.valueNumber;
      } else if (fv.valueDate) {
        const dateValue = new Date(fv.valueDate);
        // Format for datetime-local input
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        const hours = String(dateValue.getHours()).padStart(2, '0');
        const minutes = String(dateValue.getMinutes()).padStart(2, '0');
        value = `${year}-${month}-${day}T${hours}:${minutes}`;
      } else if (fv.valueBool !== null && fv.valueBool !== undefined) {
        value = fv.valueBool;
      } else if (fv.valueJson) {
        try {
          const parsed = JSON.parse(fv.valueJson);
          value = typeof parsed === 'string' ? parsed : fv.valueJson;
        } catch {
          value = fv.valueJson;
        }
      }
      
      if (value !== null && value !== undefined) {
        const fieldKey = `field_${field.id}`;
        formValues[fieldKey] = value;
      }
    });
    
    // Patch form values
    this.fieldsForm.patchValue(formValues);
    this.cdr.detectChanges();
  }

  /**
   * Save as draft - saves data to existing draft or creates draft first
   */
  async saveSubmissionAsDraft(): Promise<void> {
    console.log('[FormSubmissionCreate] saveSubmissionAsDraft called');

    // For drafts, we don't validate required fields - allow partial data
    // Reset touched state to hide validation errors when saving as draft
    Object.keys(this.fieldsForm.controls).forEach(key => {
      const control = this.fieldsForm.get(key);
      if (control) {
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
    this.cdr.detectChanges();

    // If no draft exists yet, create one first
    if (!this.hasDraft) {
      console.log('[FormSubmissionCreate] No draft exists, creating draft first...');
      this.createDraftIfNeeded();

      // Wait a bit for draft creation, then save data
      setTimeout(() => {
        if (this.submissionId) {
          this.saveSubmissionData(this.submissionId, 'Draft');
        }
      }, 1000);
      return;
    }

    // Draft exists, just save the data
    if (this.submissionId) {
      console.log('[FormSubmissionCreate] Draft exists, saving data...');
      this.saveSubmissionData(this.submissionId, 'Draft');
    } else {
      console.error('[FormSubmissionCreate] No submissionId available for draft save');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No draft submission available'
      });
    }
  }

  /**
   * Determine submission status based on approval workflow configuration
   * NOTE (Requested behavior):
   * In "Create New Submission", always start with status = "Submitted".
   * Drafts are handled separately via saveSubmissionAsDraft() / createDraftIfNeeded().
   */
  private determineSubmissionStatus(): 'Submitted' {
    // Always start as "Submitted" for Create New Submission.
    // Backend/workflow can still process approvals based on configured workflow/stages.
    return 'Submitted';
  }

  /**
   * Final submit - uses the submit endpoint to change status and trigger workflow
   */
  async saveSubmission(): Promise<void> {
    console.log('[FormSubmissionCreate] saveSubmission() called');
    console.log('[FormSubmissionCreate] Form states:', {
      submissionFormValid: this.submissionForm.valid,
      submissionFormInvalid: this.submissionForm.invalid,
      fieldsFormValid: this.fieldsForm.valid,
      fieldsFormInvalid: this.fieldsForm.invalid,
      selectedTabId: this.selectedTabId,
      isSubmitting: this.isSubmitting,
      loadingCreate: this.loading.create
    });
    
    // Set submitting flag
    this.isSubmitting = true;
    this.cdr.detectChanges();
    
    // Validate all fields (email, phone, password, required, etc.)
    const fieldValidation = this.validateAllFields();
    if (!fieldValidation.isValid) {
      console.log('[FormSubmissionCreate] Field validation failed:', fieldValidation.errors);
      this.isSubmitting = false;
      this.markFormGroupTouched(this.fieldsForm);
      this.cdr.detectChanges();
      // Scroll to first error
      setTimeout(() => {
        const firstError = document.querySelector('.field-error-message');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    if (this.submissionForm.invalid) {
      console.log('[FormSubmissionCreate] submissionForm is invalid');
      console.log('[FormSubmissionCreate] submissionForm errors:', this.getFormErrors(this.submissionForm));
      this.markFormGroupTouched(this.submissionForm);
      this.cdr.detectChanges();
      this.isSubmitting = false;
      // Scroll to first error
      setTimeout(() => {
        const firstError = document.querySelector('.field-error-message');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Note: We don't check fieldsForm.invalid here because validateAllFields() above
    // already validates all visible and required fields. fieldsForm.invalid might be true
    // for hidden fields or fields that are not actually required (due to dynamic rules),
    // but validateAllFields() handles this correctly by checking visibility and requirements.
    
    console.log('[FormSubmissionCreate] All validations passed, proceeding with submission...');

    // Calculate calculated fields that need to be recalculated on submit
    await this.calculateCalculatedFields('OnSubmitOnly');

    // Check for required image/file fields
    const missingRequiredFiles: string[] = [];
    this.fields.forEach(field => {
      if (this.isFileField(field) && this.isRequired(field)) {
        const newFiles = this.fieldFiles[field.id!] || [];
        const existingFiles = this.getExistingAttachments(field.id!) || [];
        const totalFiles = newFiles.length + existingFiles.length;
        
        console.log(`[FormSubmissionCreate] Checking required file field ${field.id} (${field.fieldName || field.fieldCode}):`, {
          newFiles: newFiles.length,
          existingFiles: existingFiles.length,
          totalFiles: totalFiles,
          isEditMode: this.isEditMode
        });
        
        if (totalFiles === 0) {
          missingRequiredFiles.push(field.fieldName || field.fieldCode || `Field ${field.id}`);
        }
      }
    });

    if (missingRequiredFiles.length > 0) {
      console.log('[FormSubmissionCreate] Missing required files:', missingRequiredFiles);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: `Please upload files for required fields: ${missingRequiredFiles.join(', ')}`
      });
      this.isSubmitting = false;
      this.cdr.detectChanges();
      return;
    }

    // Validate grids
    const gridValidation = this.validateAllGrids();
    if (!gridValidation.isValid) {
      console.log('[FormSubmissionCreate] Grid validation failed:', gridValidation.errors);
      gridValidation.errors.forEach(error => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Grid Validation Error',
          detail: error
        });
      });
      // Scroll to first grid with error
      setTimeout(() => {
        const gridError = document.querySelector('.grid-container');
        if (gridError) {
          gridError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      this.isSubmitting = false;
      this.cdr.detectChanges();
      return;
    }

    // Get formBuilderId from documentType (fixed value)
    if (!this.documentType?.formBuilderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Document type does not have a form associated with it'
      });
      return;
    }

    // Get default series (fixed value) - create one automatically if not available
    if (this.documentSeries.length === 0) {
      console.log('[FormSubmissionCreate] No document series available, attempting to create default series...');
      const defaultSeries = await this.createDefaultSeries();
      
      if (!defaultSeries || !defaultSeries.id) {
        const currentLang = this.translationService.getCurrentLanguage();
        const errorMessage = currentLang === 'ar' 
          ? 'لا يوجد سلسلة وثائق متاحة. يرجى إنشاء سلسلة وثائق أولاً من إعدادات أنواع الوثائق.'
          : 'No document series available. Please create a document series first from Document Types settings.';
        
        this.messageService.add({
          severity: 'error',
          summary: currentLang === 'ar' ? 'خطأ' : 'Error',
          detail: errorMessage
        });
        return;
      }
    }

    const defaultSeries = this.documentSeries.find(s => s.isDefault) || this.documentSeries[0];
    if (!defaultSeries || !defaultSeries.id) {
      const currentLang = this.translationService.getCurrentLanguage();
      const errorMessage = currentLang === 'ar' 
        ? 'لا يوجد سلسلة وثائق صالحة متاحة.'
        : 'No valid document series available.';
      
      this.messageService.add({
        severity: 'error',
        summary: currentLang === 'ar' ? 'خطأ' : 'Error',
        detail: errorMessage
      });
      return;
    }

    const currentUserId = this.authService.userName();
    if (!currentUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not found. Please login again.'
      });
      return;
    }

    // ===== NEW: Evaluate Blocking Rules before final submit (PreSubmit phase) =====
    try {
      const formBuilderId = this.documentType.formBuilderId;

      console.log('[FormSubmissionCreate] Evaluating blocking rules before submit...', {
        formBuilderId,
        evaluationPhase: 'PreSubmit'
      });

      const blockingResult: any = await this.formRulesService
        .evaluateBlockingRules({
          formBuilderId,
          evaluationPhase: 'PreSubmit',
          fieldValues: this.fieldValues
        })
        .toPromise();

      const blockingSource: any =
        blockingResult && typeof blockingResult === 'object'
          ? (blockingResult.data && typeof blockingResult.data === 'object'
              ? blockingResult.data
              : blockingResult)
          : null;

      if (blockingSource?.isBlocked) {
        const currentLang = this.translationService.getCurrentLanguage();
        const errorMsg =
          blockingSource.blockMessage ||
          blockingSource.message ||
          (currentLang === 'ar'
            ? 'تم منع إرسال النموذج بسبب قاعدة التحقق'
            : 'Form submission is blocked by a validation rule');

        console.warn('[FormSubmissionCreate] Pre-submit blocking rule detected:', {
          ruleId: blockingSource.ruleId,
          ruleName: blockingSource.ruleName,
          conditionKey: blockingSource.conditionKey,
          message: errorMsg
        });

        const blockMessage = blockingSource.blockMessage || errorMsg;

        // Priority 1: Use conditionKey from backend if available
        if (blockingSource.conditionKey) {
          const fieldCode = blockingSource.conditionKey;
          this.blockingRuleErrors[fieldCode] = blockMessage;
          console.log(
            `[FormSubmissionCreate] Setting blocking error for field (from conditionKey, pre-submit): ${fieldCode}`,
            blockMessage
          );
        }
        // Priority 2: Try to use rule data from currentForm if available
        else if (blockingSource.ruleId && this.currentForm?.formRules) {
          const rule = this.currentForm.formRules.find(r => r.id === blockingSource.ruleId);
          if (rule && (rule as any).condition && (rule as any).condition.field) {
            const fieldCode = (rule as any).condition.field;
            this.blockingRuleErrors[fieldCode] = blockMessage;
            console.log(
              `[FormSubmissionCreate] Setting blocking error for field (from rule, pre-submit): ${fieldCode}`,
              blockMessage
            );
          }
        }
        // Priority 3: Fallback - try to infer field code from message
        else {
          const commonFieldCodes = ['F', 'TOTAL_AMOUNT', 'AMOUNT', 'PHONE_NUMBER'];
          for (const fieldCode of commonFieldCodes) {
            if (
              blockMessage.toLowerCase().includes(fieldCode.toLowerCase()) ||
              blockMessage.toLowerCase().includes('amount') ||
              blockMessage.toLowerCase().includes('مبلغ')
            ) {
              this.blockingRuleErrors[fieldCode] = blockMessage;
              console.log(
                `[FormSubmissionCreate] Setting blocking error for field (from message, pre-submit): ${fieldCode}`,
                blockMessage
              );
              break;
            }
          }
        }

        // If we still don't know which field, show a general blocking error
        if (Object.keys(this.blockingRuleErrors).length === 0) {
          this.generalBlockingError = blockMessage;
        }

        // Scroll to first error field
        setTimeout(() => {
          const firstErrorField = document.querySelector(
            '.blocking-rule-error, .field-error-message, .general-blocking-error'
          );
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        this.isSubmitting = false;
        this.loading.create = false;
        this.cdr.detectChanges();
        return;
      }
    } catch (blockingError) {
      console.error('[FormSubmissionCreate] Error evaluating blocking rules before submit:', blockingError);
      // لا نمنع الإرسال في حال فشل التحقق نفسه، فقط نسجل الخطأ ونستمر في المسار العادي
    }

    // Determine final status based on approval workflow configuration (Task 2)
    // NOTE: We always create the submission initially as 'Draft' to avoid marking it as Submitted
    // if blocking rules prevent the final submit. After a successful submit, status is updated to 'Submitted'.
    const submissionStatus = this.determineSubmissionStatus();

    const formData = this.submissionForm.getRawValue();
    const createDto: CreateFormSubmissionDto = {
      formBuilderId: this.documentType.formBuilderId, // Fixed value - from documentType
      documentTypeId: this.documentTypeId,
      seriesId: defaultSeries.id, // Fixed value - use default series
      submittedByUserId: currentUserId,
      // IMPORTANT: Always create as Draft first (like public form)
      // Blocking rules are evaluated on submit; if they block, submission stays Draft.
      status: 'Draft'
    };

    // In Edit Mode, if submission status is not Draft, just update the data without submitting
    if (this.isEditMode && this.currentSubmission && this.currentSubmission.status !== 'Draft') {
      console.log('[FormSubmissionCreate] Edit Mode: Submission status is', this.currentSubmission.status, '- updating data only');
      this.isSubmitting = true;
      
      // Just save the data without submitting
      this.saveSubmissionData(this.submissionId!, this.currentSubmission.status);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Submission updated successfully'
      });
      
      this.isSubmitting = false;
      this.loading.create = false;
      this.cdr.detectChanges();
      return;
    }

    // If no submission exists, create it first, then save data, then submit
    if (!this.submissionId) {
      this.isSubmitting = true;
      this.loading.create = true;
      console.log('[FormSubmissionCreate] Creating new submission directly (with final submit)...');

      try {
        const newSubmission = await new Promise<FormSubmissionDto>((resolve, reject) => {
          this.formSubmissionsService.createSubmission(createDto).subscribe({
            next: (created) => resolve(created),
            error: (err) => reject(err)
          });
        });

        console.log('[FormSubmissionCreate] Submission created successfully:', newSubmission);
        this.submissionId = newSubmission.id!;
        this.currentSubmission = newSubmission;
        this.hasDraft = true;
        this.isDraftMode = false;

        // Update grid components submissionId
        this.updateGridComponentsSubmissionId();

        // Save all data (field values, attachments, grid data) using saveSubmissionData endpoint
        await this.saveSubmissionDataDirectlyAsync(this.submissionId, submissionStatus);
        console.log('[FormSubmissionCreate] ✅ Data saved successfully after create, proceeding with final submit...');

        // Now perform the same final submit logic as for existing submissions
        const submitUserIdAfterCreate = this.authService.userName();
        if (!submitUserIdAfterCreate) {
          this.isSubmitting = false;
          this.loading.create = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'User not found. Please login again.'
          });
          return;
        }

        const submitPayloadAfterCreate = {
          submissionId: this.submissionId!,
          submittedByUserId: submitUserIdAfterCreate
        };
        console.log('[FormSubmissionCreate] Performing final submit after create with payload:', submitPayloadAfterCreate);

        this.formSubmissionsService.submitSubmission(submitPayloadAfterCreate).subscribe({
          next: (submittedSubmission) => {
            console.log('[FormSubmissionCreate] ✅ Submission (after create) completed successfully:', submittedSubmission);
            console.log('[FormSubmissionCreate] Backend status after submit:', submittedSubmission.status);

            this.isDraftMode = false;
            this.currentSubmission = submittedSubmission;

            // Ensure status is Submitted (same behavior as existing path)
            if (submittedSubmission.status !== 'Submitted') {
              console.log('[FormSubmissionCreate] Status is not Submitted, updating to Submitted in background (after create)...');
              this.formSubmissionsService.updateSubmission(submittedSubmission.id, { status: 'Submitted' }).subscribe({
                next: () => {
                  console.log('[FormSubmissionCreate] ✅ Status updated to Submitted in background (after create)');
                  submittedSubmission.status = 'Submitted';
                  if (this.currentSubmission) {
                    this.currentSubmission.status = 'Submitted';
                  }
                },
                error: (updateError) => {
                  console.warn('[FormSubmissionCreate] Failed to update status to Submitted in background (after create):', updateError);
                }
              });
            } else {
              submittedSubmission.status = 'Submitted';
              if (this.currentSubmission) {
                this.currentSubmission.status = 'Submitted';
              }
            }

            const currentLang = this.translationService.getCurrentLanguage();
            const statusMessage = currentLang === 'ar'
              ? 'تم إرسال الطلب للمراجعة'
              : 'Request submitted for review';

            this.messageService.add({
              severity: 'success',
              summary: currentLang === 'ar' ? 'تم بنجاح' : 'Success',
              detail: statusMessage,
              life: 5000
            });

            this.isSubmitting = false;
            this.loading.create = false;

            // Navigate to submissions list page
            this.router.navigate(['/document-types', this.documentTypeId, 'submissions']);
            this.cdr.detectChanges();
          },
          error: (error) => {
            // Reuse the same blocking rule handling / error behavior as existing path
            // Handle Blocking Rules (403 Forbidden) - don't proceed if blocked
            if (error?.isBlocked) {
              const currentLang = this.translationService.getCurrentLanguage();
              const errorMsg = error.blockMessage || error.message ||
                (currentLang === 'ar' ? 'تم منع إرسال النموذج بسبب قاعدة التحقق' : 'Form submission is blocked by a validation rule');

              console.warn('[FormSubmissionCreate] Submission (after create) blocked by rule:', {
                ruleId: error.ruleId,
                ruleName: error.ruleName,
                message: errorMsg
              });

              const blockMessage = error.blockMessage || errorMsg;

              // Priority 1: Use ConditionKey from error response (most reliable)
              if (error.conditionKey) {
                const fieldCode = error.conditionKey;
                this.blockingRuleErrors[fieldCode] = blockMessage;
                console.log(`[FormSubmissionCreate] Setting blocking error for field (from conditionKey, after create): ${fieldCode}`, blockMessage);
              }
              // Priority 2: Try to get field code from rule data if available
              else if (error.ruleId && this.currentForm?.formRules) {
                const rule = this.currentForm.formRules.find(r => r.id === error.ruleId);
                if (rule && rule.condition && rule.condition.field) {
                  const fieldCode = rule.condition.field;
                  this.blockingRuleErrors[fieldCode] = blockMessage;
                  console.log(`[FormSubmissionCreate] Setting blocking error for field (from rule, after create): ${fieldCode}`, blockMessage);
                }
              }
              // Priority 3: Try to extract field code from error message (fallback)
              else {
                const commonFieldCodes = ['F', 'TOTAL_AMOUNT', 'AMOUNT', 'PHONE_NUMBER'];
                for (const fieldCode of commonFieldCodes) {
                  if (blockMessage.toLowerCase().includes(fieldCode.toLowerCase()) ||
                      blockMessage.toLowerCase().includes('amount') ||
                      blockMessage.toLowerCase().includes('مبلغ')) {
                    this.blockingRuleErrors[fieldCode] = blockMessage;
                    console.log(`[FormSubmissionCreate] Setting blocking error for field (from message, after create): ${fieldCode}`, blockMessage);
                    break;
                  }
                }
              }

              if (Object.keys(this.blockingRuleErrors).length === 0) {
                this.generalBlockingError = blockMessage;
              }

              // NEW: إذا كانت هذه المحاولة أول إنشاء (Draft) وتم حظر الإرسال، احذف الـ submission من الـ DB
              // حتى لا يظهر أي صف جديد للقيم المخالفة للقاعدة
              if (this.submissionId) {
                const blockedSubmissionId = this.submissionId;
                console.log('[FormSubmissionCreate] Blocking rule after create - deleting draft submission:', blockedSubmissionId);
                this.formSubmissionsService.deleteSubmission(blockedSubmissionId).subscribe({
                  next: () => {
                    console.log('[FormSubmissionCreate] ✅ Draft submission deleted due to blocking rule:', blockedSubmissionId);
                  },
                  error: (deleteErr) => {
                    console.warn('[FormSubmissionCreate] Failed to delete blocked draft submission:', deleteErr);
                  }
                });
                // امسح الهوية من الواجهة حتى لا يتم استخدام هذا الـ submission مرة أخرى
                this.submissionId = undefined as any;
                this.currentSubmission = null;
              }

              setTimeout(() => {
                const firstErrorField = document.querySelector('.blocking-rule-error, .field-error-message, .general-blocking-error');
                if (firstErrorField) {
                  firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);

              this.isSubmitting = false;
              this.loading.create = false;
              this.cdr.detectChanges();
              return;
            }

            // Non-blocking error (after create)
            this.isSubmitting = false;
            this.loading.create = false;

            console.error('[FormSubmissionCreate] Error during final submit (after create):', error);

            const currentLang = this.translationService.getCurrentLanguage();
            const errorMessage = error?.message ||
              (currentLang === 'ar' ? 'فشل في إرسال الطلب' : 'Failed to submit request');

            this.messageService.add({
              severity: 'error',
              summary: currentLang === 'ar' ? 'خطأ' : 'Error',
              detail: errorMessage
            });

            this.cdr.detectChanges();
          }
        });
      } catch (createError: any) {
        this.isSubmitting = false;
        this.loading.create = false;
        console.error('[FormSubmissionCreate] Error creating submission (with final submit):', createError);

        const currentLang = this.translationService.getCurrentLanguage();
        const errorMessage = createError?.error?.message || createError?.message ||
          (currentLang === 'ar' ? 'فشل في إنشاء الطلب' : 'Failed to create submission');

        this.messageService.add({
          severity: 'error',
          summary: currentLang === 'ar' ? 'خطأ' : 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
      return;
    }

    // Submission exists - update it and submit
    // Backend expects username (e.g. \"anas\") for submittedByUserId to resolve emails/recipients correctly.
    const submitUserId = this.authService.userName();
    console.log('[FormSubmissionCreate] DEBUG submitUserId (username used for submittedByUserId):', submitUserId);
    if (!submitUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not found. Please login again.'
      });
      return;
    }

    // Update submission data before submitting
    console.log('[FormSubmissionCreate] Updating submission data before final submit...');
    this.isSubmitting = true;
    this.loading.create = true;
    
    try {
      // Save data first - use await to ensure data is saved before submit
      // This is critical for blocking rules to evaluate the data correctly
      await this.saveSubmissionDataDirectlyAsync(this.submissionId, submissionStatus);
      console.log('[FormSubmissionCreate] ✅ Data saved successfully, proceeding with submit...');
      
      // Then submit the submission
      const submitPayload = {
        submissionId: this.submissionId!,
        submittedByUserId: submitUserId
      };
      console.log('[FormSubmissionCreate] Performing final submit with payload:', submitPayload);
      
      this.formSubmissionsService.submitSubmission(submitPayload).subscribe({
      next: (submittedSubmission) => {
        console.log('[FormSubmissionCreate] ✅ Submission completed successfully:', submittedSubmission);
        console.log('[FormSubmissionCreate] Backend status after submit:', submittedSubmission.status);

        this.isDraftMode = false;
        this.currentSubmission = submittedSubmission;

        // Always update status to "Submitted" regardless of backend response
        // This ensures consistency - user wants status to always be "Submitted" after submission
        // Do this in background to avoid blocking navigation
        if (submittedSubmission.status !== 'Submitted') {
          console.log('[FormSubmissionCreate] Status is not Submitted, updating to Submitted in background...');
          this.formSubmissionsService.updateSubmission(submittedSubmission.id, { status: 'Submitted' }).subscribe({
            next: () => {
              console.log('[FormSubmissionCreate] ✅ Status updated to Submitted in background');
              submittedSubmission.status = 'Submitted';
              if (this.currentSubmission) {
                this.currentSubmission.status = 'Submitted';
              }
            },
            error: (updateError) => {
              console.warn('[FormSubmissionCreate] Failed to update status to Submitted in background:', updateError);
            }
          });
        } else {
          // If status is already Submitted, update local reference
          submittedSubmission.status = 'Submitted';
          if (this.currentSubmission) {
            this.currentSubmission.status = 'Submitted';
          }
        }

        const currentLang = this.translationService.getCurrentLanguage();
        const statusMessage = currentLang === 'ar' ? 'تم إرسال الطلب للمراجعة' : 'Request submitted for review';

        this.messageService.add({
          severity: 'success',
          summary: currentLang === 'ar' ? 'تم بنجاح' : 'Success',
          detail: statusMessage,
          life: 5000
        });

        // Note: Status is already updated to "Submitted" above, so we don't need to handle "Approved" case separately
        // The code above ensures status is always "Submitted" after submission

        this.isSubmitting = false;
        this.loading.create = false;

        // Navigate to submissions list page immediately
        this.router.navigate(['/document-types', this.documentTypeId, 'submissions']);

        // Activate workflow stage in background (don't wait for it)
        if (submittedSubmission.status === 'Submitted') {
          this.approvalWorkflowRuntimeService.activateStage(submittedSubmission.id).subscribe({
            next: () => {
              console.log('[FormSubmissionCreate] ✅ activate-stage succeeded in background');
            },
            error: (activateError) => {
              console.warn('[FormSubmissionCreate] Failed to activate workflow stage in background:', activateError);
              const msg = (activateError?.message || '').toString();
              if (msg.toLowerCase().includes('stage requires minimum')) {
                const currentLang = this.translationService.getCurrentLanguage();
                this.messageService.add({
                  severity: 'error',
                  summary: currentLang === 'ar' ? 'تنبيه' : 'Warning',
                  detail: currentLang === 'ar'
                    ? `${msg} - لازم تعمل Assign للـ Stage Assignees علشان الطلب يتقبل.`
                    : `${msg} - Please assign enough active Stage Assignees so the request can proceed.`,
                  life: 7000
                });
              }
            }
          });
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        // Handle Blocking Rules (403 Forbidden) - don't proceed if blocked
        if (error?.isBlocked) {
          const currentLang = this.translationService.getCurrentLanguage();
          const errorMsg = error.blockMessage || error.message || 
            (currentLang === 'ar' ? 'تم منع إرسال النموذج بسبب قاعدة التحقق' : 'Form submission is blocked by a validation rule');
          
          console.warn('[FormSubmissionCreate] Submission blocked by rule:', {
            ruleId: error.ruleId,
            ruleName: error.ruleName,
            message: errorMsg
          });
          
          // Extract field code from error response to show error under specific field
          const blockMessage = error.blockMessage || errorMsg;
          
          // Priority 1: Use ConditionKey from error response (most reliable)
          if (error.conditionKey) {
            const fieldCode = error.conditionKey;
            this.blockingRuleErrors[fieldCode] = blockMessage;
            console.log(`[FormSubmissionCreate] Setting blocking error for field (from conditionKey): ${fieldCode}`, blockMessage);
          }
          // Priority 2: Try to get field code from rule data if available
          else if (error.ruleId && this.currentForm?.formRules) {
            const rule = this.currentForm.formRules.find(r => r.id === error.ruleId);
            if (rule && rule.condition && rule.condition.field) {
              const fieldCode = rule.condition.field;
              this.blockingRuleErrors[fieldCode] = blockMessage;
              console.log(`[FormSubmissionCreate] Setting blocking error for field (from rule): ${fieldCode}`, blockMessage);
            }
          }
          // Priority 3: Try to extract field code from error message (fallback)
          else {
            // Try common field codes from the form
            const commonFieldCodes = ['F', 'TOTAL_AMOUNT', 'AMOUNT', 'PHONE_NUMBER'];
            for (const fieldCode of commonFieldCodes) {
              if (blockMessage.toLowerCase().includes(fieldCode.toLowerCase()) || 
                  blockMessage.toLowerCase().includes('amount') || 
                  blockMessage.toLowerCase().includes('مبلغ')) {
                this.blockingRuleErrors[fieldCode] = blockMessage;
                console.log(`[FormSubmissionCreate] Setting blocking error for field (from message): ${fieldCode}`, blockMessage);
                break;
              }
            }
          }
          
          // If no field code found, set a general error message
          if (Object.keys(this.blockingRuleErrors).length === 0) {
            this.generalBlockingError = blockMessage;
          }
          
          // Scroll to first error field
          setTimeout(() => {
            const firstErrorField = document.querySelector('.blocking-rule-error, .field-error-message, .general-blocking-error');
            if (firstErrorField) {
              firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          
          // Don't show Toast for blocking rules - error is shown in span
          this.isSubmitting = false;
          this.loading.create = false;
          this.cdr.detectChanges();
          return;
        }
        
        // If backend says it's already submitted, don't stop the flow; just activate stage directly.
        const backendMsg: string = (error?.error?.message || error?.message || '').toString();
        console.error('[FormSubmissionCreate] ❌ Error during final submit. Payload:', submitPayload, 'Error:', error);
        const isAlreadySubmitted = backendMsg.toLowerCase().includes('already submitted');

        if (isAlreadySubmitted && this.submissionId) {
          console.warn('[FormSubmissionCreate] Submit returned "already submitted". Activating stage anyway...', backendMsg);
          this.approvalWorkflowRuntimeService.activateStage(this.submissionId).subscribe({
            next: () => {
              console.log('[FormSubmissionCreate] ✅ Stage activated successfully after already submitted');
              // Re-fetch submission to update UI (stageId should be set by backend)
              this.formSubmissionsService.getSubmissionById(this.submissionId!).subscribe({
                next: (refetched: any) => {
                  this.currentSubmission = refetched;
                  this.isSubmitting = false;
                  this.loading.create = false;
                  this.cdr.detectChanges();
                  this.router.navigate(['/document-types', this.documentTypeId, 'submissions']);
                },
                error: () => {
                  this.isSubmitting = false;
                  this.loading.create = false;
                  this.cdr.detectChanges();
                  this.router.navigate(['/document-types', this.documentTypeId, 'submissions']);
                }
              });
            },
            error: (activateErr) => {
              console.error('[FormSubmissionCreate] ❌ Failed to activate stage after already submitted:', activateErr);
              const msg = (activateErr?.message || '').toString();
              if (msg.toLowerCase().includes('stage requires minimum')) {
                const currentLang = this.translationService.getCurrentLanguage();
                this.messageService.add({
                  severity: 'error',
                  summary: currentLang === 'ar' ? 'تنبيه' : 'Warning',
                  detail: currentLang === 'ar'
                    ? `${msg} - لازم تعمل Assign للـ Stage Assignees علشان الطلب يتقبل.`
                    : `${msg} - Please assign enough active Stage Assignees so the request can proceed.`,
                  life: 7000
                });
              }
              this.isSubmitting = false;
              this.loading.create = false;
              this.cdr.detectChanges();
            }
          });
          return;
        }

        this.isSubmitting = false;
        this.loading.create = false;

        console.error('[FormSubmissionCreate] Error during final submit:', error);

        const currentLang = this.translationService.getCurrentLanguage();
        const errorMessage = error?.message ||
          (currentLang === 'ar' ? 'فشل في إرسال الطلب' : 'Failed to submit request');

        this.messageService.add({
          severity: 'error',
          summary: currentLang === 'ar' ? 'خطأ' : 'Error',
          detail: errorMessage
        });

        this.cdr.detectChanges();
      }
      });
    } catch (saveError: any) {
      // Handle error saving data before submit
      console.error('[FormSubmissionCreate] ❌ Failed to save data before submit:', saveError);
      this.isSubmitting = false;
      this.loading.create = false;
      
      const currentLang = this.translationService.getCurrentLanguage();
      const errorMessage = saveError?.message ||
        (currentLang === 'ar' ? 'فشل في حفظ البيانات قبل الإرسال' : 'Failed to save data before submission');
      
      this.messageService.add({
        severity: 'error',
        summary: currentLang === 'ar' ? 'خطأ' : 'Error',
        detail: errorMessage
      });
      
      this.cdr.detectChanges();
    }
  }

  /**
   * Handle submission workflow (set stageId and activate stage)
   */
  private handleSubmissionWorkflow(submission: FormSubmissionDto): void {
    if (submission.status === 'Submitted' || submission.status === 'Approved') {
      console.log('[FormSubmissionCreate] Handling workflow for submission:', submission.id);
      const docTypeId = submission.documentTypeId || this.documentTypeId;
      
      if (docTypeId) {
        const loadDocumentTypeAndSetStageId = () => {
          let approvalWorkflowId: number | null | undefined = null;
          
          if (this.documentType?.approvalWorkflowId && this.documentType.approvalWorkflowId > 0) {
            approvalWorkflowId = this.documentType.approvalWorkflowId;
            console.log('[FormSubmissionCreate] Using approvalWorkflowId from loaded documentType:', approvalWorkflowId);
            this.setSubmissionStageId(submission.id, approvalWorkflowId);
          } else {
            // Load document type to get approvalWorkflowId
            const loadDocumentType = (): Observable<any> => {
              if (this.documentType?.formBuilderId) {
                return this.documentTypesService.getDocumentTypeByFormBuilderId(this.documentType.formBuilderId).pipe(
                  catchError(() => {
                    return this.documentTypesService.getActiveDocumentTypeById(docTypeId);
                  })
                );
              } else {
                return this.documentTypesService.getActiveDocumentTypeById(docTypeId);
              }
            };

            loadDocumentType().subscribe({
              next: (documentType) => {
                if (!documentType) {
                  console.warn('[FormSubmissionCreate] Document type not found. docTypeId:', docTypeId);
                  return;
                }
                
                if (documentType?.approvalWorkflowId && documentType.approvalWorkflowId > 0) {
                  this.documentType = documentType;
                  this.setSubmissionStageId(submission.id, documentType.approvalWorkflowId);
                } else {
                  console.warn('[FormSubmissionCreate] No approval workflow ID found in document type.');
                }
              },
              error: (docTypeError) => {
                console.error('[FormSubmissionCreate] Failed to load document type:', docTypeError);
              }
            });
          }
        };
        
        loadDocumentTypeAndSetStageId();
      }
    }
  }

  /**
   * Set submission stageId and activate workflow stage
   */
  private setSubmissionStageId(submissionId: number, approvalWorkflowId: number): void {
    if (!approvalWorkflowId) {
      return;
    }

    // Get the first stage from workflow and update submission with stageId
    // NOTE: Backend may create default stage asynchronously; retry briefly if no stages are returned yet.
    this.tryUpdateSubmissionStageIdWithRetry(submissionId, approvalWorkflowId);
    
    // Also try to activate the workflow stage
    this.approvalWorkflowRuntimeService.activateStage(submissionId).subscribe({
      next: () => {
        console.log('[FormSubmissionCreate] Workflow stage activated successfully');
      },
      error: (activateError) => {
        console.warn('[FormSubmissionCreate] Failed to activate workflow stage:', activateError);
      }
    });
  }

  private tryUpdateSubmissionStageIdWithRetry(
    submissionId: number,
    approvalWorkflowId: number,
    attempt: number = 1,
    maxAttempts: number = 5,
    delayMs: number = 500
  ): void {
    this.approvalStageService.getAllByWorkflowId(approvalWorkflowId).subscribe({
      next: (stages) => {
        const validStages = (stages || []).filter(s => !s.isDeleted);
        if (validStages.length === 0) {
          if (attempt < maxAttempts) {
            console.warn(`[FormSubmissionCreate] No stages found for workflow ${approvalWorkflowId} (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`);
            setTimeout(() => this.tryUpdateSubmissionStageIdWithRetry(submissionId, approvalWorkflowId, attempt + 1, maxAttempts, delayMs), delayMs);
          } else {
            console.warn(`[FormSubmissionCreate] No stages found for workflow ${approvalWorkflowId} after ${maxAttempts} attempts. stageId will remain null.`);
          }
          return;
        }

        const firstStage = validStages.sort((a, b) => a.stageOrder - b.stageOrder)[0];
        if (!firstStage?.id) {
          console.warn('[FormSubmissionCreate] No valid first stage found (missing id).');
          return;
        }

        console.log('[FormSubmissionCreate] Found first stage:', firstStage.id, 'updating submission stageId...');
        this.formSubmissionsService.updateSubmission(submissionId, { stageId: firstStage.id }).subscribe({
          next: () => {
            console.log('[FormSubmissionCreate] ✅ Submission stageId updated successfully to:', firstStage.id);
          },
          error: (updateError) => {
            console.error('[FormSubmissionCreate] ❌ Failed to update submission stageId:', updateError);
            console.error('[FormSubmissionCreate] Update error details:', JSON.stringify(updateError, null, 2));
          }
        });
      },
      error: (stagesError) => {
        console.error('[FormSubmissionCreate] Failed to get workflow stages:', stagesError);
        if (attempt < maxAttempts) {
          setTimeout(() => this.tryUpdateSubmissionStageIdWithRetry(submissionId, approvalWorkflowId, attempt + 1, maxAttempts, delayMs), delayMs);
        }
      }
    });
  }

  /**
   * Create workflow automatically and assign it to document type
   */
  private createAndAssignWorkflow(docTypeId: number, documentType: DocumentType, callback: (workflowId: number) => void): void {
    if (!documentType || !documentType.id) {
      console.error('[FormSubmissionCreate] Cannot create workflow - documentType is invalid');
      return;
    }

    const workflowName = `Default Workflow for ${documentType.name || 'Document Type'} (${documentType.id})`;
    console.log('[FormSubmissionCreate] Checking if workflow exists:', workflowName);
    
    // First, check if workflow with this name already exists
    this.approvalWorkflowService.getApprovalWorkflowByName(workflowName).subscribe({
      next: (existingWorkflow) => {
        if (existingWorkflow && existingWorkflow.id) {
          console.log('[FormSubmissionCreate] ✅ Found existing workflow:', existingWorkflow.id, 'using it...');
          // Use existing workflow
          this.assignWorkflowToDocumentType(docTypeId, existingWorkflow.id, callback);
        } else {
          // Workflow doesn't exist, create new one
          console.log('[FormSubmissionCreate] Workflow not found, creating new workflow:', workflowName, 'for documentTypeId:', docTypeId);
          this.approvalWorkflowService.createApprovalWorkflow({
            name: workflowName,
            documentTypeId: docTypeId
          }).subscribe({
            next: (createdWorkflow) => {
              console.log('[FormSubmissionCreate] ✅ Workflow created successfully:', createdWorkflow.id);
              // Backend creates default stage automatically, just assign workflow
              this.assignWorkflowToDocumentType(docTypeId, createdWorkflow.id, callback);
            },
            error: (createError) => {
              console.error('[FormSubmissionCreate] Failed to create workflow:', createError);
              const errorMessage = createError?.message || '';
              
              // If error is "Workflow name already exists", try to find it again
              if (errorMessage.includes('already exists') || errorMessage.includes('Workflow name already exists')) {
                console.log('[FormSubmissionCreate] Workflow name already exists, searching for existing workflow...');
                this.approvalWorkflowService.getApprovalWorkflowByName(workflowName).subscribe({
                  next: (foundWorkflow) => {
                    if (foundWorkflow && foundWorkflow.id) {
                      console.log('[FormSubmissionCreate] ✅ Found existing workflow after error:', foundWorkflow.id);
                      this.assignWorkflowToDocumentType(docTypeId, foundWorkflow.id, callback);
                    } else {
                      console.error('[FormSubmissionCreate] Could not find existing workflow even though name exists');
                    }
                  },
                  error: (searchError) => {
                    console.error('[FormSubmissionCreate] Failed to search for existing workflow:', searchError);
                  }
                });
              } else {
                console.error('[FormSubmissionCreate] Error details:', {
                  status: createError?.status,
                  statusText: createError?.statusText,
                  message: createError?.message,
                  error: createError?.error
                });
              }
            }
          });
        }
      },
      error: (searchError) => {
        console.error('[FormSubmissionCreate] Failed to search for existing workflow:', searchError);
        // If search fails, try to create anyway
        console.log('[FormSubmissionCreate] Attempting to create workflow anyway...');
        this.approvalWorkflowService.createApprovalWorkflow({
          name: workflowName,
          documentTypeId: docTypeId
        }).subscribe({
          next: (createdWorkflow) => {
            console.log('[FormSubmissionCreate] ✅ Workflow created successfully:', createdWorkflow.id);
            // Backend creates default stage automatically, just assign workflow
            this.assignWorkflowToDocumentType(docTypeId, createdWorkflow.id, callback);
          },
          error: (createError) => {
            console.error('[FormSubmissionCreate] Failed to create workflow:', createError);
          }
        });
      }
    });
  }

  private assignWorkflowToDocumentType(docTypeId: number, workflowId: number, callback: (workflowId: number) => void): void {
    // Assign workflow to document type - need to include all required fields
    // First, reload document type to get all fields, then update with workflow ID
    // Use getActiveDocumentTypeById or getDocumentTypeByFormBuilderId to get active document type
    const loadDocumentType = (): Observable<any> => {
      if (this.documentType?.formBuilderId) {
        return this.documentTypesService.getDocumentTypeByFormBuilderId(this.documentType.formBuilderId).pipe(
          catchError(() => {
            return this.documentTypesService.getActiveDocumentTypeById(docTypeId);
          })
        );
      } else {
        return this.documentTypesService.getActiveDocumentTypeById(docTypeId);
      }
    };

    loadDocumentType().subscribe({
      next: (fullDocumentType) => {
        if (!fullDocumentType) {
          console.warn('[FormSubmissionCreate] Document type not found or is deleted. Cannot assign workflow. docTypeId:', docTypeId);
          // Still call callback with the workflow
          callback(workflowId);
          return;
        }

        // Update with all existing fields + new workflow ID
        const updateDto: any = {
          name: fullDocumentType.name,
          code: fullDocumentType.code,
          menuCaption: fullDocumentType.menuCaption || fullDocumentType.name,
          approvalWorkflowId: workflowId
        };
        
        // Include optional fields if they exist
        if (fullDocumentType.formBuilderId) updateDto.formBuilderId = fullDocumentType.formBuilderId;
        if (fullDocumentType.menuOrder !== undefined) updateDto.menuOrder = fullDocumentType.menuOrder;
        if (fullDocumentType.parentMenuId !== undefined) updateDto.parentMenuId = fullDocumentType.parentMenuId;
        if (fullDocumentType.isActive !== undefined) updateDto.isActive = fullDocumentType.isActive;
        
        this.documentTypesService.updateDocumentType(fullDocumentType.id, updateDto).subscribe({
          next: () => {
            console.log('[FormSubmissionCreate] ✅ Workflow assigned to document type successfully');
            if (this.documentType) {
              this.documentType = { ...this.documentType, approvalWorkflowId: workflowId }; // Update cached documentType
            }
            callback(workflowId);
          },
          error: (assignError) => {
            console.error('[FormSubmissionCreate] Failed to assign workflow to document type:', assignError);
            // Still call callback with the workflow
            callback(workflowId);
          }
        });
      },
      error: (loadError) => {
        console.error('[FormSubmissionCreate] Failed to load document type for update:', loadError);
        // Still call callback with the workflow
        callback(workflowId);
      }
    });
  }

  /**
   * Save submission data directly as Promise (for use in submitSubmission to ensure data is saved before submit)
   * Uses saveSubmissionData from FormSubmissionsService to ensure blocking rules can evaluate the data
   */
  private async saveSubmissionDataDirectlyAsync(submissionId: number, status: string): Promise<void> {
    // Use saveSubmissionData from FormSubmissionsService (same as form-view) to ensure blocking rules work
    // This method matches the logic from form-view.component.ts to ensure consistency
    const fieldValues: SaveFormSubmissionValueDto[] = [];
    const attachments: SaveFormSubmissionAttachmentDto[] = [];

    console.log('[FormSubmissionCreate] ===== Starting saveSubmissionDataDirectlyAsync =====');
    console.log('[FormSubmissionCreate] Submission ID:', submissionId);
    console.log('[FormSubmissionCreate] Status:', status);

    // Process field values (convert to SaveFormSubmissionValueDto format)
    // IMPORTANT: Collect ALL fields with values (matching form-view.component.ts logic)
    this.fields.forEach(field => {
      if (!field.id) return;
      const fieldKey = `field_${field.id}`;
      const control = this.fieldsForm.get(fieldKey);
      const fieldValue = control?.value;
      const fieldType = this.getFieldType(field);
      const hasValue = fieldValue !== null && 
                      fieldValue !== undefined && 
                      fieldValue !== '' &&
                      !(Array.isArray(fieldValue) && fieldValue.length === 0);

      // Only process fields that have values (empty fields are not needed for blocking rules)
      if (hasValue) {
        const valueDto: SaveFormSubmissionValueDto = {
          fieldId: field.id,
          fieldCode: field.fieldCode
        };

        switch (fieldType) {
          case 'calculated':
            if (field.resultType === 'Decimal' || field.resultType === 'Integer') {
              const calcNumValue = Number(fieldValue);
              valueDto.valueNumber = calcNumValue;
              valueDto.valueString = String(calcNumValue);
            } else {
              valueDto.valueString = String(fieldValue);
            }
            break;
          case 'number':
            // CRITICAL: For number fields, ensure both valueNumber and valueString are set
            // This is essential for blocking rules that evaluate numeric conditions
            const numValue = Number(fieldValue);
            if (!isNaN(numValue) && isFinite(numValue)) {
              valueDto.valueNumber = numValue;
              valueDto.valueString = String(numValue);
            } else {
              // Invalid number - store as string
              valueDto.valueString = String(fieldValue);
            }
            break;
          case 'date':
            const dateValue = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
            if (!isNaN(dateValue.getTime())) {
              valueDto.valueDate = dateValue;
              valueDto.valueString = dateValue.toISOString();
            } else {
              console.warn(`[FormSubmissionCreate] Invalid date value for field "${field.fieldName}": ${fieldValue}`);
              valueDto.valueString = String(fieldValue);
            }
            break;
          case 'boolean':
          case 'switch':
            valueDto.valueBool = Boolean(fieldValue);
            valueDto.valueString = String(fieldValue);
            break;
          case 'checkbox':
            if (Array.isArray(fieldValue)) {
              valueDto.valueString = fieldValue.join(', ');
            } else {
              valueDto.valueString = String(fieldValue);
            }
            break;
          case 'select':
          case 'radio':
            const optionValue = String(fieldValue);
            valueDto.valueString = optionValue;
            const numOptionValue = Number(optionValue);
            if (!isNaN(numOptionValue) && isFinite(numOptionValue) && optionValue.trim() !== '') {
              valueDto.valueNumber = numOptionValue;
            }
            break;
          default:
            if (Array.isArray(fieldValue)) {
              valueDto.valueString = fieldValue.join(', ');
            } else {
              valueDto.valueString = String(fieldValue);
            }
            break;
        }

        fieldValues.push(valueDto);
      }
    });

    // Process file fields (attachments)
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        files.forEach(file => {
          attachments.push({
            fieldId: fieldId,
            fieldCode: field.fieldCode,
            fileName: file.name,
            filePath: '', // This will be filled by backend
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream'
          });
        });
      }
    });

    // Note: Grid data is saved separately via saveAllGridsData() before calling this method
    // Grid data is not needed for blocking rules evaluation (rules typically evaluate field values)
    // So we leave gridData as empty array here (matching form-view.component.ts behavior)

    // Use saveSubmissionData from FormSubmissionsService (same endpoint as form-view)
    const saveDataDto: SaveFormSubmissionDataDto = {
      submissionId: submissionId,
      fieldValues: fieldValues,
      attachments: attachments,
      gridData: [] // Grid data saved separately via saveAllGridsData
    };

    console.log('[FormSubmissionCreate] Saving data using saveSubmissionData endpoint:', {
      submissionId: saveDataDto.submissionId,
      fieldValuesCount: saveDataDto.fieldValues.length,
      attachmentsCount: saveDataDto.attachments.length,
      gridDataCount: 0 // Grid data saved separately
    });

    // Log field values for debugging blocking rules
    if (fieldValues.length > 0) {
      console.log('[FormSubmissionCreate] Field values being saved:', fieldValues.map(fv => ({
        fieldId: fv.fieldId,
        fieldCode: fv.fieldCode,
        valueNumber: fv.valueNumber,
        valueString: fv.valueString
      })));
    }

    return new Promise<void>((resolve, reject) => {
      this.formSubmissionsService.saveSubmissionData(saveDataDto).subscribe({
        next: () => {
          console.log('[FormSubmissionCreate] ✅ Data saved successfully using saveSubmissionData endpoint');
          // Add a small delay to ensure backend has processed the data before rule evaluation
          setTimeout(() => {
            resolve();
          }, 300);
        },
        error: (err) => {
          console.error('[FormSubmissionCreate] ❌ Error saving data using saveSubmissionData endpoint:', err);
          // Reject to prevent submission if data save fails (blocking rules need the data)
          reject(err);
        }
      });
    });
  }

  /**
   * Save submission data directly with callback (for use in saveSubmission)
   */
  private saveSubmissionDataDirectly(submissionId: number, status: string, callback: () => void): void {
    const fieldValues: CreateFormSubmissionValueDto[] = [];
    const attachments: CreateFormSubmissionAttachmentDto[] = [];
    const updateObservablesList: any[] = [];

    console.log('[FormSubmissionCreate] ===== Starting saveSubmissionDataDirectly =====');
    console.log('[FormSubmissionCreate] Submission ID:', submissionId);
    console.log('[FormSubmissionCreate] Status:', status);

    // Process field values (same logic as saveSubmissionData)
    this.fields.forEach(field => {
      if (!field.id) return;
      const fieldKey = `field_${field.id}`;
      const control = this.fieldsForm.get(fieldKey);
      const fieldValue = control?.value;
      const fieldType = this.getFieldType(field);
      const isDraft = status === 'Draft';
      const hasValue = fieldValue !== null && 
                      fieldValue !== undefined && 
                      fieldValue !== '' &&
                      !(Array.isArray(fieldValue) && fieldValue.length === 0);

      if (hasValue || isDraft) {
        const valueDto: CreateFormSubmissionValueDto = {
          submissionId: submissionId,
          fieldId: field.id,
          fieldCode: field.fieldCode
        };

        if (isDraft && !hasValue) {
          valueDto.valueString = '';
          valueDto.valueJson = JSON.stringify('');
        } else {
          switch (fieldType) {
            case 'calculated':
              if (field.resultType === 'Decimal' || field.resultType === 'Integer') {
                const calcNumValue = Number(fieldValue);
                valueDto.valueNumber = calcNumValue;
                valueDto.valueJson = JSON.stringify(calcNumValue);
                valueDto.valueString = String(calcNumValue);
              } else {
                const calcTextValue = String(fieldValue);
                valueDto.valueString = calcTextValue;
                valueDto.valueJson = JSON.stringify(calcTextValue);
              }
              break;
            case 'number':
              const numValue = Number(fieldValue);
              valueDto.valueNumber = numValue;
              valueDto.valueJson = JSON.stringify(numValue);
              valueDto.valueString = String(numValue);
              break;
            case 'date':
              const dateValue = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
              valueDto.valueDate = dateValue;
              valueDto.valueJson = JSON.stringify(dateValue.toISOString());
              valueDto.valueString = dateValue.toISOString();
              break;
            case 'boolean':
              const boolValue = Boolean(fieldValue);
              valueDto.valueBool = boolValue;
              valueDto.valueJson = JSON.stringify(boolValue);
              valueDto.valueString = String(boolValue);
              break;
            case 'checkbox':
              if (Array.isArray(fieldValue)) {
                valueDto.valueJson = JSON.stringify(fieldValue);
                valueDto.valueString = fieldValue.join(', ');
              } else {
                valueDto.valueString = String(fieldValue);
                valueDto.valueJson = JSON.stringify(fieldValue);
              }
              break;
            case 'select':
            case 'radio':
              const optionValue = String(fieldValue);
              valueDto.valueString = optionValue;
              const numOptionValue = Number(optionValue);
              if (!isNaN(numOptionValue) && isFinite(numOptionValue) && optionValue.trim() !== '') {
                valueDto.valueNumber = numOptionValue;
                valueDto.valueJson = JSON.stringify(numOptionValue);
              } else {
                valueDto.valueJson = JSON.stringify(optionValue);
              }
              break;
            default:
              if (Array.isArray(fieldValue)) {
                valueDto.valueJson = JSON.stringify(fieldValue);
                valueDto.valueString = fieldValue.join(', ');
              } else {
                const stringValue = String(fieldValue);
                valueDto.valueString = stringValue;
                valueDto.valueJson = JSON.stringify(stringValue);
              }
              break;
          }
        }

        if (!valueDto.valueJson) {
          if (valueDto.valueNumber !== null && valueDto.valueNumber !== undefined) {
            valueDto.valueJson = JSON.stringify(valueDto.valueNumber);
          } else if (valueDto.valueDate) {
            valueDto.valueJson = JSON.stringify(valueDto.valueDate.toISOString());
          } else if (valueDto.valueBool !== null && valueDto.valueBool !== undefined) {
            valueDto.valueJson = JSON.stringify(valueDto.valueBool);
          } else if (valueDto.valueString !== null && valueDto.valueString !== undefined) {
            valueDto.valueJson = JSON.stringify(valueDto.valueString);
          } else {
            valueDto.valueJson = JSON.stringify(null);
          }
        }

        fieldValues.push(valueDto);
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
            filePath: '',
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream'
          });
        });
      }
    });

    // Save field values and upload files
    const saveObservables: any[] = [];

    if (fieldValues.length > 0) {
      const bulkDto: BulkFormSubmissionValuesDto = {
        submissionId: submissionId,
        values: fieldValues
      };
      saveObservables.push(this.formSubmissionValuesService.createBulk(bulkDto));
    }

    // Upload new files
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        const fieldCode = field.fieldCode || field.fieldName || `FIELD_${field.id}`;
        files.forEach((file) => {
          saveObservables.push(
            this.formSubmissionAttachmentsService.uploadFile(file, submissionId, fieldId, fieldCode)
          );
        });
      }
    });

    // Update grid components submissionId before saving
    this.updateGridComponentsSubmissionId();
    
    // Helper function to save grid data with proper delay
    const saveGridsWithDelay = async () => {
      // Additional delay to ensure grid components are fully updated
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        await this.saveAllGridsData(false);
        callback();
      } catch (error) {
        console.error('[FormSubmissionCreate] Error saving grid data:', error);
        callback(); // Still call callback to continue
      }
    };
    
    if (saveObservables.length === 0) {
      // Save grid data even if no other observables
      saveGridsWithDelay();
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: () => {
        // Save grid data after other data is saved
        saveGridsWithDelay();
      },
      error: (error: any) => {
        console.error('Error saving submission data:', error);
        callback(); // Still call callback to continue
      }
    });
  }

  saveSubmissionData(submissionId: number, status?: string): void {
    const fieldValues: CreateFormSubmissionValueDto[] = [];
    const attachments: CreateFormSubmissionAttachmentDto[] = [];

    console.log('[FormSubmissionCreate] ===== Starting saveSubmissionData =====');
    console.log('[FormSubmissionCreate] Submission ID:', submissionId);
    console.log('[FormSubmissionCreate] Is Edit Mode:', this.isEditMode);
    console.log('[FormSubmissionCreate] Fields count:', this.fields.length);
    console.log('[FormSubmissionCreate] Form values:', this.fieldsForm.getRawValue());

    // If edit mode, load existing field values first
    if (this.isEditMode) {
      this.formSubmissionValuesService.getBySubmissionId(submissionId).subscribe({
        next: (existingValues) => {
          console.log('[FormSubmissionCreate] Existing field values:', existingValues);
          this.saveSubmissionDataWithExisting(submissionId, existingValues, status);
        },
        error: (error) => {
          console.error('[FormSubmissionCreate] Error loading existing values:', error);
          // Continue with create mode if loading fails
          this.saveSubmissionDataWithExisting(submissionId, [], status);
        }
      });
      return;
    }

    // Create mode - proceed normally
    this.saveSubmissionDataWithExisting(submissionId, [], status);
  }

  saveSubmissionDataWithExisting(submissionId: number, existingValues: any[], status?: string): void {
    const isDraft = status === 'Draft';
    const fieldValues: CreateFormSubmissionValueDto[] = [];
    const attachments: CreateFormSubmissionAttachmentDto[] = [];
    const updateObservablesList: any[] = [];

    console.log('[FormSubmissionCreate] ===== Processing fields with existing values =====');
    console.log('[FormSubmissionCreate] Submission ID:', submissionId);
    console.log('[FormSubmissionCreate] Existing values count:', existingValues.length);
    console.log('[FormSubmissionCreate] fieldFiles status:', {
      fieldFilesKeys: Object.keys(this.fieldFiles),
      fieldFilesCount: Object.keys(this.fieldFiles).length,
      fieldFiles: Object.keys(this.fieldFiles).reduce((acc: any, key) => {
        acc[key] = this.fieldFiles[Number(key)]?.map(f => ({ name: f.name, size: f.size, type: f.type }));
        return acc;
      }, {})
    });

    // Process field values
    this.fields.forEach(field => {
      if (!field.id) return;
      const fieldKey = `field_${field.id}`;
      const control = this.fieldsForm.get(fieldKey);
      const fieldValue = control?.value;
      const fieldType = this.getFieldType(field);

      // Debug logging for all fields
      console.log(`[FormSubmissionCreate] Processing field ${field.id} (${field.fieldCode || 'no-code'})`, {
        fieldKey,
        fieldType,
        controlValue: fieldValue,
        controlExists: !!control,
        controlValid: control?.valid,
        controlErrors: control?.errors,
        controlTouched: control?.touched,
        controlDirty: control?.dirty,
        optionsCount: ['select', 'radio', 'checkbox'].includes(fieldType) ? this.getFieldOptions(field).length : 0
      });

      // Check if field has a value (including 0, false, empty arrays)
      // For drafts, we save all fields even if empty (to preserve form structure)
      const hasValue = fieldValue !== null && 
                      fieldValue !== undefined && 
                      fieldValue !== '' &&
                      !(Array.isArray(fieldValue) && fieldValue.length === 0);
      
      console.log(`[FormSubmissionCreate] Field ${field.id} hasValue: ${hasValue}, isDraft: ${isDraft}`, {
        fieldValue,
        isNull: fieldValue === null,
        isUndefined: fieldValue === undefined,
        isEmptyString: fieldValue === '',
        isArray: Array.isArray(fieldValue),
        arrayLength: Array.isArray(fieldValue) ? fieldValue.length : 'N/A'
      });

      // For drafts, save all fields (even empty ones) to preserve form structure
      // For regular submissions, only save fields with values
      if (hasValue || isDraft) {
        const valueDto: CreateFormSubmissionValueDto = {
          submissionId: submissionId,
          fieldId: field.id,
          fieldCode: field.fieldCode
        };

        const fieldType = this.getFieldType(field);
        console.log(`[FormSubmissionCreate] Saving field ${field.id} (${field.fieldCode || 'no-code'}), type: ${fieldType}, value:`, fieldValue, 'isDraft:', isDraft, 'hasValue:', hasValue);
        
        // If draft and no value, save empty values
        if (isDraft && !hasValue) {
          valueDto.valueString = '';
          valueDto.valueJson = JSON.stringify('');
          console.log(`[FormSubmissionCreate] Saving empty field ${field.id} for draft`);
        } else {
          // Normal save logic for fields with values
          switch (fieldType) {
          case 'calculated':
            // Calculated fields are saved like number or text based on resultType
            if (field.resultType === 'Decimal' || field.resultType === 'Integer') {
              const calcNumValue = Number(fieldValue);
              valueDto.valueNumber = calcNumValue;
              valueDto.valueJson = JSON.stringify(calcNumValue);
              valueDto.valueString = String(calcNumValue);
            } else {
              // Text result type
              const calcTextValue = String(fieldValue);
              valueDto.valueString = calcTextValue;
              valueDto.valueJson = JSON.stringify(calcTextValue);
            }
            break;
          case 'number':
            const numValue = Number(fieldValue);
            valueDto.valueNumber = numValue;
            valueDto.valueJson = JSON.stringify(numValue);
            valueDto.valueString = String(numValue);
            break;
          case 'date':
            const dateValue = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
            valueDto.valueDate = dateValue;
            valueDto.valueJson = JSON.stringify(dateValue.toISOString());
            valueDto.valueString = dateValue.toISOString();
            break;
          case 'boolean':
            const boolValue = Boolean(fieldValue);
            valueDto.valueBool = boolValue;
            valueDto.valueJson = JSON.stringify(boolValue);
            valueDto.valueString = String(boolValue);
            break;
          case 'checkbox':
            if (Array.isArray(fieldValue)) {
              valueDto.valueJson = JSON.stringify(fieldValue);
              valueDto.valueString = fieldValue.join(', ');
            } else {
              valueDto.valueString = String(fieldValue);
              valueDto.valueJson = JSON.stringify(fieldValue);
            }
            break;
          case 'select':
          case 'radio':
            // For select/radio, save the option value
            // The valueJson should be the raw value (not double-stringified)
            const optionValue = String(fieldValue);
            valueDto.valueString = optionValue;
            // valueJson should be the JSON representation of the value
            // If it's a number, save as number; otherwise save as string
            const numOptionValue = Number(optionValue);
            if (!isNaN(numOptionValue) && isFinite(numOptionValue) && optionValue.trim() !== '') {
              // It's a valid number - save as number in JSON
              valueDto.valueNumber = numOptionValue;
              valueDto.valueJson = JSON.stringify(numOptionValue); // "15" not "\"15\""
            } else {
              // It's a string - save as string in JSON
              valueDto.valueJson = JSON.stringify(optionValue); // "\"Individual\"" is correct for strings
            }
            console.log(`[FormSubmissionCreate] Saved select/radio option value: ${optionValue}`, {
              valueString: valueDto.valueString,
              valueJson: valueDto.valueJson,
              valueNumber: valueDto.valueNumber
            });
            break;
          default:
            if (Array.isArray(fieldValue)) {
              valueDto.valueJson = JSON.stringify(fieldValue);
              valueDto.valueString = fieldValue.join(', ');
            } else {
              const stringValue = String(fieldValue);
              valueDto.valueString = stringValue;
              valueDto.valueJson = JSON.stringify(stringValue);
            }
            break;
          }
        }

        // Safety check: Ensure valueJson is always set (API requirement)
        if (!valueDto.valueJson) {
          // Try to generate valueJson from existing values
          if (valueDto.valueNumber !== null && valueDto.valueNumber !== undefined) {
            valueDto.valueJson = JSON.stringify(valueDto.valueNumber);
          } else if (valueDto.valueDate) {
            valueDto.valueJson = JSON.stringify(valueDto.valueDate.toISOString());
          } else if (valueDto.valueBool !== null && valueDto.valueBool !== undefined) {
            valueDto.valueJson = JSON.stringify(valueDto.valueBool);
          } else if (valueDto.valueString !== null && valueDto.valueString !== undefined) {
            valueDto.valueJson = JSON.stringify(valueDto.valueString);
          } else {
            valueDto.valueJson = JSON.stringify(null);
          }
        }
        // Ensure valueString is set if valueJson exists but valueString doesn't
        if (valueDto.valueJson && !valueDto.valueString) {
          try {
            const parsed = JSON.parse(valueDto.valueJson);
            valueDto.valueString = typeof parsed === 'string' ? parsed : String(parsed);
          } catch {
            valueDto.valueString = valueDto.valueJson;
          }
        }

        // Check if field value already exists (edit mode)
        const existingValue = existingValues.find((ev: any) => ev.fieldId === field.id);
        
        if (existingValue) {
          // Update existing value
          console.log(`[FormSubmissionCreate] 🔄 Updating existing value for field ${field.id} (${field.fieldCode || 'no-code'})`, {
            existingValue: existingValue,
            newValue: valueDto,
            fieldType: fieldType
          });
          
          const updateDto: UpdateFormSubmissionValueDto = {
            // Always include valueJson (required by API)
            valueJson: valueDto.valueJson
          };
          
          // Set appropriate value based on type
          if (valueDto.valueString !== null && valueDto.valueString !== undefined) {
            updateDto.valueString = valueDto.valueString;
          }
          
          if (valueDto.valueNumber !== null && valueDto.valueNumber !== undefined) {
            updateDto.valueNumber = valueDto.valueNumber;
          }
          
          if (valueDto.valueDate) {
            updateDto.valueDate = valueDto.valueDate;
          }
          
          if (valueDto.valueBool !== null && valueDto.valueBool !== undefined) {
            updateDto.valueBool = valueDto.valueBool;
          }
          
          console.log(`[FormSubmissionCreate] Update DTO for field ${field.id}:`, updateDto);
          
          // Add to update list
          updateObservablesList.push({
            submissionId: submissionId,
            fieldId: field.id,
            dto: updateDto
          });
        } else {
          // Create new value
          console.log(`[FormSubmissionCreate] ✅ Adding new value DTO for field ${field.id} (${field.fieldCode || 'no-code'}):`, valueDto);
          fieldValues.push(valueDto);
        }
      } else {
        console.log(`[FormSubmissionCreate] ⚠️ Skipping field ${field.id} - no value`);
      }
    });

    console.log('[FormSubmissionCreate] Total field values to save:', fieldValues.length);
    console.log('[FormSubmissionCreate] Field values DTOs:', JSON.stringify(fieldValues, null, 2));

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
            filePath: '',
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream'
          });
        });
      }
    });

    // Save field values and upload files
    const saveObservables: any[] = [];

    // Add update observables first (if edit mode)
    updateObservablesList.forEach((update: any) => {
      saveObservables.push(
        this.formSubmissionValuesService.updateByField(update.submissionId, update.fieldId, update.dto)
      );
    });

    // Add create bulk if there are new values
    if (fieldValues.length > 0) {
      const bulkDto: BulkFormSubmissionValuesDto = {
        submissionId: submissionId,
        values: fieldValues
      };
      saveObservables.push(this.formSubmissionValuesService.createBulk(bulkDto));
    }

    // Delete removed attachments from server
    this.deletedAttachments.forEach(attachmentId => {
      console.log(`[FormSubmissionCreate] Deleting attachment ${attachmentId} from server`);
      saveObservables.push(
        this.formSubmissionAttachmentsService.delete(attachmentId).pipe(
          catchError(error => {
            console.error(`[FormSubmissionCreate] Error deleting attachment ${attachmentId}:`, error);
            // Continue even if deletion fails
            return of(null);
          })
        )
      );
    });

    // Upload new files
    console.log('[FormSubmissionCreate] ===== Starting file upload process =====');
    console.log('[FormSubmissionCreate] fieldFiles keys:', Object.keys(this.fieldFiles));
    console.log('[FormSubmissionCreate] fieldFiles:', this.fieldFiles);
    console.log('[FormSubmissionCreate] existingAttachments:', this.existingAttachments);
    console.log('[FormSubmissionCreate] deletedAttachments:', this.deletedAttachments);
    
    // Note: Deletion of attachments is handled below in the existing code (line 3586-3597)
    // We don't need to duplicate it here
    
    // Then, upload only NEW files (files in fieldFiles are new files to upload)
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);
      const existingFiles = this.getExistingAttachments(fieldId);

      console.log(`[FormSubmissionCreate] Processing files for field ${fieldId}:`, {
        fieldId,
        newFilesCount: files?.length || 0,
        existingFilesCount: existingFiles.length,
        newFiles: files?.map(f => ({ name: f.name, size: f.size, type: f.type })) || [],
        existingFiles: existingFiles.map(f => ({ id: f.id, fileName: f.fileName })),
        fieldFound: !!field,
        fieldCode: field?.fieldCode,
        fieldName: field?.fieldName
      });

      if (field && files && files.length > 0) {
        const fieldCode = field.fieldCode || field.fieldName || `FIELD_${field.id}`;
        console.log(`[FormSubmissionCreate] ✅ Uploading ${files.length} NEW file(s) for field ${fieldId} (${fieldCode})`);
        files.forEach((file, index) => {
          // Check if file with same name already exists (to avoid duplicate upload)
          const existingFileWithSameName = existingFiles.find(existing => 
            existing.fileName.toLowerCase() === file.name.toLowerCase()
          );
          
          if (existingFileWithSameName) {
            console.warn(`[FormSubmissionCreate] ⚠️ Skipping file "${file.name}" - file with same name already exists (ID: ${existingFileWithSameName.id})`);
            return; // Skip this file - it already exists
          }
          
          console.log(`[FormSubmissionCreate] 📤 Adding upload observable for NEW file ${index + 1}/${files.length}:`, {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            submissionId,
            fieldId,
            fieldCode
          });
          saveObservables.push(
            this.formSubmissionAttachmentsService.uploadFile(file, submissionId, fieldId, fieldCode)
          );
        });
      } else {
        console.log(`[FormSubmissionCreate] ℹ️ Field ${fieldId} - no new files to upload`, {
          fieldFound: !!field,
          newFilesCount: files?.length || 0,
          existingFilesCount: existingFiles.length
        });
      }
    });
    
    console.log('[FormSubmissionCreate] Total upload observables added:', saveObservables.length);

    if (saveObservables.length === 0) {
      // Save grid data even if no other observables
      this.saveAllGridsData().then(() => {
        this.loading.create = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: this.isEditMode ? 'Form submission updated successfully' : 'Form submission created successfully'
        });
        setTimeout(() => this.goBack(), 1000);
      }).catch((error) => {
        console.error('[FormSubmissionCreate] Error saving grid data:', error);
        this.loading.create = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Form saved but some grid data may not have been saved'
        });
        setTimeout(() => this.goBack(), 1000);
      });
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: () => {
        // Save grid data after other data is saved
        this.saveAllGridsData().then(() => {
          this.loading.create = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: this.isEditMode ? 'Form submission updated successfully' : 'Form submission created successfully'
          });
          setTimeout(() => this.goBack(), 1000);
        }).catch((error) => {
          console.error('[FormSubmissionCreate] Error saving grid data:', error);
          this.loading.create = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Form saved but some grid data may not have been saved'
          });
          setTimeout(() => this.goBack(), 1000);
        });
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error saving submission data:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to save submission data';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  // Approve/Reject functionality removed - only available in admin dashboard

  /**
   * Get option text (like FormViewComponent)
   * Supports both FieldOptionDto and FieldOptionResponse
   * Handles JSON strings in text field
   */
  getOptionText(option: any): string {
    if (!option) return '';

    // Helper function to parse JSON string and extract readable text
    const parseJsonText = (text: string): string => {
      if (!text || typeof text !== 'string') return text;

      const trimmed = text.trim();
      // Check if it's a JSON string (starts with { or [)
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed);

          // If it's an object, try to extract readable text
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            // Try common name patterns: first + last, name, title + first + last, etc.
            if (parsed.first && parsed.last) {
              const parts: string[] = [];
              if (parsed.title) parts.push(String(parsed.title));
              if (parsed.first) parts.push(String(parsed.first));
              if (parsed.last) parts.push(String(parsed.last));
              return parts.join(' ');
            }

            // Try name property
            if (parsed.name) {
              return String(parsed.name);
            }

            // Try text or label properties
            if (parsed.text) {
              return String(parsed.text);
            }
            if (parsed.label) {
              return String(parsed.label);
            }

            // Try title property
            if (parsed.title) {
              return String(parsed.title);
            }

            // Try to find first string property
            const keys = Object.keys(parsed);
            for (const key of keys) {
              const value = parsed[key];
              if (typeof value === 'string' && value.trim() !== '') {
                return value.trim();
              }
            }

            // If nothing found, return stringified version (but formatted)
            return JSON.stringify(parsed);
          }

          // If it's an array, return first element or stringified
          if (Array.isArray(parsed) && parsed.length > 0) {
            return String(parsed[0]);
          }

          return trimmed;
        } catch {
          // If parsing fails, return original text
          return trimmed;
        }
      }

      return trimmed;
    };

    // Handle FieldOptionResponse (from DataSource) - check for text property first
    if ('text' in option) {
      let text = option.text !== undefined && option.text !== null ? String(option.text).trim() : '';

      // Parse JSON strings if present
      if (text) {
        text = parseJsonText(text);
      }

      // If text is empty, try to use value as fallback
      if (!text && 'value' in option && option.value !== undefined && option.value !== null) {
        const valueText = String(option.value).trim();
        return parseJsonText(valueText);
      }

      return text || '';
    }

    // Handle FieldOptionDto (static options)
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && option.foreignOptionText && String(option.foreignOptionText).trim()) {
      return parseJsonText(String(option.foreignOptionText).trim());
    }

    let optionText = option.optionText !== undefined && option.optionText !== null
      ? String(option.optionText).trim()
      : '';

    // Parse JSON strings if present
    if (optionText) {
      optionText = parseJsonText(optionText);
    }

    // If optionText is empty, try to use optionValue as fallback
    if (!optionText && option.optionValue !== undefined && option.optionValue !== null) {
      const valueText = String(option.optionValue).trim();
      return parseJsonText(valueText);
    }

    // Final fallback - return empty string instead of undefined
    return optionText || '';
  }

  /**
   * Check if option is selected (like FormViewComponent)
   */
  isOptionSelected(field: FormFieldDto, optionValue: any): boolean {
    if (!field || !field.id) return false;
    
    const idKey = String(field.id);
    const optStr = String(optionValue).trim();

    // Get value from form control
    if (field.id && this.fieldsForm) {
      const fieldKey = `field_${field.id}`;
      const control = this.fieldsForm.get(fieldKey);
      if (control) {
        const selectedValue = control.value;
        if (selectedValue === undefined || selectedValue === null || selectedValue === '') {
          return false;
        }

        // Check if field supports multiple selection
        const isMultiple = field.fieldType?.allowMultiple || false;
        
        if (isMultiple) {
          // Multiple selection: check if option is in the array
          try {
            let selectedArray: string[] = [];
            const valueStr = String(selectedValue).trim();
            
            if (Array.isArray(selectedValue)) {
              selectedArray = selectedValue.map(v => String(v).trim()).filter(v => v !== '');
            } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
              // JSON array
              try {
                const parsed = JSON.parse(valueStr);
                selectedArray = Array.isArray(parsed) 
                  ? parsed.map(v => String(v).trim()).filter(v => v !== '')
                  : [String(parsed).trim()].filter(v => v !== '');
              } catch {
                selectedArray = valueStr ? [valueStr] : [];
              }
            } else if (valueStr.includes(',')) {
              selectedArray = valueStr.split(',').map(s => s.trim()).filter(s => s !== '');
            } else {
              selectedArray = [valueStr];
            }
            
            return selectedArray.includes(optStr);
          } catch {
            return false;
          }
        } else {
          // Single selection: direct comparison
          const valStr = String(selectedValue).trim();
          return valStr === optStr;
        }
      }
    }

    // Fallback to fieldValues
    let selectedValue = this.fieldValues[idKey];
    if (selectedValue === undefined && field.fieldCode) {
      selectedValue = this.fieldValues[field.fieldCode];
    }
    if (selectedValue === undefined) {
      selectedValue = this.getFieldValue(field);
    }
    
    if (selectedValue === undefined || selectedValue === null || selectedValue === '') {
      return false;
    }

    const isMultiple = field.fieldType?.allowMultiple || false;
    if (isMultiple) {
      try {
        let selectedArray: string[] = [];
        const valueStr = String(selectedValue).trim();
        
        if (Array.isArray(selectedValue)) {
          selectedArray = selectedValue.map(v => String(v).trim()).filter(v => v !== '');
        } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
          try {
            const parsed = JSON.parse(valueStr);
            selectedArray = Array.isArray(parsed) 
              ? parsed.map(v => String(v).trim()).filter(v => v !== '')
              : [String(parsed).trim()].filter(v => v !== '');
          } catch {
            selectedArray = valueStr ? [valueStr] : [];
          }
        } else if (valueStr.includes(',')) {
          selectedArray = valueStr.split(',').map(s => s.trim()).filter(s => s !== '');
        } else {
          selectedArray = [valueStr];
        }
        
        return selectedArray.includes(optStr);
      } catch {
        return false;
      }
    } else {
      const valStr = String(selectedValue).trim();
      return valStr === optStr;
    }
  }

  /**
   * Check if checkbox option is selected (like FormViewComponent)
   */
  isCheckboxSelected(field: FormFieldDto, optionValue: any): boolean {
    if (!field || !field.id) return false;
    
    const idKey = String(field.id);
    const targetValue = String(optionValue).trim();

    // Get value from form control
    if (field.id && this.fieldsForm) {
      const fieldKey = `field_${field.id}`;
      const control = this.fieldsForm.get(fieldKey);
      if (control) {
        const value = control.value;
        if (value === undefined || value === null || value === '') {
          return false;
        }

        const valueStr = String(value).trim();
        if (valueStr === '') {
          return false;
        }

        try {
          let selectedArray: string[] = [];

          if (Array.isArray(value)) {
            selectedArray = value.map(v => String(v).trim()).filter(v => v !== '');
          } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
            try {
              const parsed = JSON.parse(valueStr);
              selectedArray = Array.isArray(parsed) 
                ? parsed.map(v => String(v).trim()).filter(v => v !== '')
                : [String(parsed).trim()].filter(v => v !== '');
            } catch {
              selectedArray = valueStr ? [valueStr] : [];
            }
          } else if (valueStr.includes(',')) {
            selectedArray = valueStr.split(',').map(s => s.trim()).filter(s => s !== '');
          } else {
            selectedArray = [valueStr];
          }

          return selectedArray.includes(targetValue);
        } catch {
          return false;
        }
      }
    }

    // Fallback to fieldValues
    let value = this.fieldValues[idKey];
    if (value === undefined && field.fieldCode) {
      value = this.fieldValues[field.fieldCode];
    }
    if (value === undefined) {
      value = this.getFieldValue(field);
    }

    if (value === undefined || value === null || value === '') {
      return false;
    }

    const valueStr = String(value).trim();
    if (valueStr === '') {
      return false;
    }

    try {
      let selectedArray: string[] = [];

      if (Array.isArray(value)) {
        selectedArray = value.map(v => String(v).trim()).filter(v => v !== '');
      } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        try {
          const parsed = JSON.parse(valueStr);
          selectedArray = Array.isArray(parsed) 
            ? parsed.map(v => String(v).trim()).filter(v => v !== '')
            : [String(parsed).trim()].filter(v => v !== '');
        } catch {
          selectedArray = valueStr ? [valueStr] : [];
        }
      } else if (valueStr.includes(',')) {
        selectedArray = valueStr.split(',').map(s => s.trim()).filter(s => s !== '');
      } else {
        selectedArray = [valueStr];
      }

      return selectedArray.includes(targetValue);
    } catch {
      return false;
    }
  }

  /**
   * Check if switch is on (like FormViewComponent)
   */
  isSwitchOn(field: FormFieldDto): boolean {
    const value = this.getFieldValue(field);
    if (!value) {
      return false;
    }

    // Check for common truthy values
    if (typeof value === 'boolean') return value;
    const lowerValue = String(value).toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'on' || lowerValue === 'yes';
  }

  /**
   * Handle field value change (for switch and other fields that don't use formControlName)
   */
  onFieldValueChange(fieldId: number | undefined, value: any, fieldCode?: string): void {
    if (!fieldId) return;

    const fieldKey = `field_${fieldId}`;
    
    // Update form control value
    if (this.fieldsForm && this.fieldsForm.get(fieldKey)) {
      this.fieldsForm.get(fieldKey)?.setValue(value, { emitEvent: true });
    }

    // Update fieldValues for rule evaluation
    if (fieldId !== undefined && fieldId !== null) {
      this.fieldValues[String(fieldId)] = value;
    }
    if (fieldCode) {
      this.fieldValues[fieldCode] = value;
    }

    // Trigger change detection
    this.cdr.detectChanges();
  }

  // ==================== Grid Methods ====================

  /**
   * Get all grid fields from the current form
   */
  getGridFields(): FormFieldDto[] {
    return this.fields.filter(field => this.getFieldType(field) === 'grid');
  }

  /**
   * Check if the form has any grid fields
   */
  hasGridFields(): boolean {
    return this.getGridFields().length > 0;
  }

  /**
   * Save all grid data from grid components
   * Called after form submission is created/updated
   */
  /**
   * Load grid data from submission into grid components
   */
  private loadGridDataIntoComponents(submission: FormSubmissionDetailDto): void {
    if (!submission || !submission.gridData || submission.gridData.length === 0) {
      console.log('[FormSubmissionCreate] No gridData to load in submission');
      return;
    }

    console.log('[FormSubmissionCreate] Loading gridData into components:', {
      gridDataCount: submission.gridData.length,
      grids: submission.gridData.map(g => ({
        gridId: g.gridId,
        gridName: g.gridName,
        rowIndex: g.rowIndex,
        cellsCount: g.cells?.length || 0,
        cells: g.cells?.map(c => ({
          columnId: c.columnId,
          valueString: c.valueString,
          valueNumber: c.valueNumber,
          hasValue: !!(c.valueString || (c.valueNumber !== null && c.valueNumber !== undefined))
        })) || []
      }))
    });

    // Use retry mechanism to ensure grid components are fully initialized
    this.attemptLoadGridData(submission, 0);
  }

  /**
   * Attempt to load grid data with retries
   */
  private attemptLoadGridData(submission: FormSubmissionDetailDto, attempt: number): void {
    const maxAttempts = 15; // Increased retries
    const delay = 300; // 300ms between attempts

    setTimeout(() => {
      const gridComponentsArray = this.gridComponents?.toArray() || [];
      console.log(`[FormSubmissionCreate] Attempt ${attempt + 1}: Grid components available:`, gridComponentsArray.length);

      // Check if components are ready (have grid loaded and columns loaded)
      const readyComponents = gridComponentsArray.filter(gc => {
        const hasGrid = gc.grid?.id;
        const hasColumns = gc.columns && gc.columns.length > 0;
        const isReady = hasGrid && hasColumns;
        if (!isReady) {
          console.log(`[FormSubmissionCreate] Grid component not ready:`, {
            gridId: gc.grid?.id,
            hasGrid: !!hasGrid,
            columnsCount: gc.columns?.length || 0
          });
        }
        return isReady;
      });

      if (readyComponents.length > 0) {
        console.log('[FormSubmissionCreate] Found', readyComponents.length, 'ready grid components');
        this.loadGridDataIntoComponentsInternal(submission, readyComponents);
      } else if (attempt < maxAttempts) {
        // Retry if components not ready yet
        console.log(`[FormSubmissionCreate] Grid components not ready yet, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxAttempts})`);
        this.attemptLoadGridData(submission, attempt + 1);
      } else {
        console.warn('[FormSubmissionCreate] Failed to load grid data after', maxAttempts, 'attempts');
      }
    }, delay);
  }

  /**
   * Internal method to load grid data into grid components
   */
  private loadGridDataIntoComponentsInternal(
    submission: FormSubmissionDetailDto,
    gridComponents: GridViewComponent[]
  ): void {
    // Group gridData by gridId
    const gridDataByGridId = new Map<number, FormSubmissionGridDto[]>();
    submission.gridData!.forEach(gridRow => {
      const gridId = gridRow.gridId;
      if (!gridDataByGridId.has(gridId)) {
        gridDataByGridId.set(gridId, []);
      }
      gridDataByGridId.get(gridId)!.push(gridRow);
    });

    console.log('[FormSubmissionCreate] Grid data grouped by gridId:', {
      gridIds: Array.from(gridDataByGridId.keys()),
      counts: Array.from(gridDataByGridId.entries()).map(([id, rows]) => ({ gridId: id, rowsCount: rows.length }))
    });

    // Load data into each matching grid component
    let loadedCount = 0;
    gridComponents.forEach(gridComponent => {
      // Check if component has grid loaded
      if (!gridComponent.grid || !gridComponent.grid.id) {
        console.warn('[FormSubmissionCreate] Grid component not ready yet (no grid.id)');
        return;
      }

      const gridId = gridComponent.grid.id;
      const gridDataForThisGrid = gridDataByGridId.get(gridId);

      if (gridDataForThisGrid && gridDataForThisGrid.length > 0) {
        console.log('[FormSubmissionCreate] Loading grid data into component:', {
          gridId: gridId,
          gridName: gridComponent.grid.gridName,
          rowsCount: gridDataForThisGrid.length,
          submissionId: this.submissionId,
          columnsCount: gridComponent.columns?.length || 0,
          gridDataSample: gridDataForThisGrid[0]
        });

        // Ensure submissionId is set in grid component
        if (this.submissionId && this.submissionId > 0) {
          gridComponent.submissionId = this.submissionId;
        }

        try {
            // Call loadGridDataFromSubmission method on grid component
          if (typeof (gridComponent as any).loadGridDataFromSubmission === 'function') {
            console.log('[FormSubmissionCreate] Calling loadGridDataFromSubmission with data:', {
              gridId: gridId,
              rowsCount: gridDataForThisGrid.length,
              firstRow: gridDataForThisGrid[0],
              firstRowCells: gridDataForThisGrid[0]?.cells?.map(c => ({
                columnId: c.columnId,
                valueString: c.valueString,
                valueNumber: c.valueNumber,
                hasValue: !!(c.valueString || (c.valueNumber !== null && c.valueNumber !== undefined))
              })) || []
            });
            
            (gridComponent as any).loadGridDataFromSubmission(gridDataForThisGrid);
            
            // Wait a bit then trigger change detection in grid component multiple times
            setTimeout(() => {
              if ((gridComponent as any).cdr) {
                (gridComponent as any).cdr.detectChanges();
                // Trigger again after a short delay to ensure UI updates
                setTimeout(() => {
                  (gridComponent as any).cdr.detectChanges();
                  console.log('[FormSubmissionCreate] Change detection triggered for grid:', gridComponent.grid?.gridName);
                }, 200);
              }
            }, 100);
            
            loadedCount++;
            console.log('[FormSubmissionCreate] ✅ Loaded grid data into component:', gridComponent.grid?.gridName);
          } else {
            console.warn('[FormSubmissionCreate] Grid component does not have loadGridDataFromSubmission method');
          }
        } catch (error) {
          console.error('[FormSubmissionCreate] Error loading grid data into component:', error);
          console.error('[FormSubmissionCreate] Error details:', error);
        }
      } else {
        console.log('[FormSubmissionCreate] No gridData found for grid:', {
          gridId: gridId,
          gridName: gridComponent.grid.gridName
        });
      }
    });

    console.log('[FormSubmissionCreate] ✅ Loaded grid data into', loadedCount, 'component(s)');
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  /**
   * Update submissionId in all grid components and their rows
   */
  private updateGridComponentsSubmissionId(): void {
    if (!this.submissionId || this.submissionId <= 0) {
      return;
    }

    if (!this.gridComponents || this.gridComponents.length === 0) {
      return;
    }

    const gridComponentsArray = this.gridComponents.toArray();
    const submissionIdValue = this.submissionId;

    console.log('[FormSubmissionCreate] ===== updateGridComponentsSubmissionId called =====');
    console.log('[FormSubmissionCreate] Updating submissionId to:', submissionIdValue);
    console.log('[FormSubmissionCreate] Grid components count:', gridComponentsArray.length);

    for (const gridComponent of gridComponentsArray) {
      console.log(`[FormSubmissionCreate] Updating grid component: ${gridComponent.grid?.gridName}`, {
        currentSubmissionId: gridComponent.submissionId,
        targetSubmissionId: submissionIdValue,
        rowsCount: gridComponent.rows?.length || 0
      });
      
      // Update submissionId in grid component
      if (gridComponent.submissionId !== submissionIdValue) {
        console.log(`[FormSubmissionCreate] Updating submissionId in grid ${gridComponent.grid?.gridName} from ${gridComponent.submissionId} to ${submissionIdValue}`);
      }
      gridComponent.submissionId = submissionIdValue;
      
      // Update submissionId in all rows
      if (gridComponent.rows && gridComponent.rows.length > 0) {
        console.log(`[FormSubmissionCreate] Updating submissionId in ${gridComponent.rows.length} rows`);
        gridComponent.rows.forEach((row, index) => {
          const oldSubmissionId = row.submissionId;
          row.submissionId = submissionIdValue;
          console.log(`[FormSubmissionCreate] Row ${index} (rowIndex: ${row.rowIndex}): submissionId updated from ${oldSubmissionId} to ${row.submissionId}`);
        });
      }
    }

    // Trigger change detection to ensure grid components are updated
    this.cdr.detectChanges();
  }

  async saveAllGridsData(updateSubmissionId: boolean = true): Promise<void> {
    console.log('[FormSubmissionCreate] ===== saveAllGridsData called =====');
    console.log('[FormSubmissionCreate] submissionId:', this.submissionId);
    
    if (!this.submissionId || this.submissionId <= 0) {
      console.warn('[FormSubmissionCreate] No submissionId available for saving grid data');
      return;
    }

    if (!this.gridComponents || this.gridComponents.length === 0) {
      console.log('[FormSubmissionCreate] No grid components to save');
      return;
    }

    const gridComponentsArray = this.gridComponents.toArray();
    console.log('[FormSubmissionCreate] Grid components count:', gridComponentsArray.length);

    // First, update submissionId in all grid components and their rows
    // This ensures all grid components have the correct submissionId before saving
    if (updateSubmissionId) {
      this.updateGridComponentsSubmissionId();
      // Small delay to ensure grid components process the updated submissionId
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify submissionId is set correctly in all grid components before saving
    const submissionIdValue = this.submissionId!; // We already checked it's not null above
    for (const gridComponent of gridComponentsArray) {
      if (gridComponent.submissionId !== submissionIdValue) {
        console.warn(`[FormSubmissionCreate] ⚠️ Grid ${gridComponent.grid?.gridName} submissionId mismatch: ${gridComponent.submissionId} vs ${submissionIdValue}, updating...`);
        gridComponent.submissionId = submissionIdValue;
        // Update submissionId in rows as well
        if (gridComponent.rows && gridComponent.rows.length > 0) {
          gridComponent.rows.forEach(row => {
            row.submissionId = submissionIdValue;
          });
        }
      }
    }

    // Now save all grids with data
    for (const gridComponent of gridComponentsArray) {
      const hasData = gridComponent.hasGridData();
      const rowsCount = gridComponent.rows?.length || 0;
      
      console.log(`[FormSubmissionCreate] Checking grid ${gridComponent.grid?.gridName} for save:`, {
        gridId: gridComponent.grid?.id,
        submissionId: gridComponent.submissionId,
        expectedSubmissionId: this.submissionId,
        rowsCount: rowsCount,
        hasGridData: hasData,
        rows: gridComponent.rows?.map(r => ({ 
          rowIndex: r.rowIndex, 
          submissionId: r.submissionId, 
          isActive: r.isActive 
        })) || []
      });
      
      // Double-check submissionId before saving
      if (!gridComponent.submissionId || gridComponent.submissionId <= 0) {
        console.error(`[FormSubmissionCreate] ❌ Grid ${gridComponent.grid?.gridName} has invalid submissionId: ${gridComponent.submissionId}`);
        // Try to fix it one more time
        if (this.submissionId && this.submissionId > 0) {
          gridComponent.submissionId = this.submissionId;
          if (gridComponent.rows && gridComponent.rows.length > 0) {
            gridComponent.rows.forEach(row => {
              row.submissionId = this.submissionId!;
            });
          }
        } else {
          continue;
        }
      }
      
      if (hasData) {
        console.log('[FormSubmissionCreate] ✅ Saving grid data for grid:', gridComponent.grid?.gridName);
        try {
          const response = await gridComponent.saveGridData().toPromise();
          console.log('[FormSubmissionCreate] ✅ Grid data saved successfully:', {
            statusCode: response?.statusCode,
            message: response?.message,
            rowsSaved: response?.data?.length || 0,
            expectedRows: rowsCount
          });
          
          // Verify all rows were saved
          if (response?.data && response.data.length < rowsCount) {
            console.warn(`[FormSubmissionCreate] ⚠️ WARNING: Expected ${rowsCount} rows but only ${response.data.length} were saved!`);
          }
        } catch (error) {
          console.error('[FormSubmissionCreate] ❌ Error saving grid data:', error);
          console.error('[FormSubmissionCreate] Error details:', JSON.stringify(error, null, 2));
          throw error; // Re-throw to handle in calling code
        }
      } else {
        console.log(`[FormSubmissionCreate] ⚠️ Skipping grid (no data): ${gridComponent.grid?.gridName}, rowsCount: ${rowsCount}`);
      }
    }
  }

  /**
   * Check if field is a grid field
   */
  isGridField(field: FormFieldDto): boolean {
    return this.getFieldType(field) === 'grid';
  }
}
