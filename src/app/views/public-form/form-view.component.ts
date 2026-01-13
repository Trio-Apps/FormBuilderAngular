import { Component, OnInit, HostListener, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsService } from '../FormBuilder/services/forms.service';
import { TabsService } from '../FormBuilder/services/tabs.service';
import { FieldsService } from '../FormBuilder/services/fields.service';
import { FileUploadService, FormSubmissionAttachmentDto } from '../FormBuilder/services/file-upload.service';
import { FieldDataSourceService } from '../FormBuilder/services/field-data-source.service';
import { FieldOptionsService } from '../FormBuilder/services/field-options.service';
import { RuleEvaluationService, FieldState } from '../FormBuilder/services/rule-evaluation.service';
import { FormRulesService } from '../FormBuilder/services/form-rules.service';
import { FormSubmissionsService, CreateFormSubmissionDto, FormSubmissionDto, FormSubmissionDetailDto, SaveFormSubmissionDataDto, SaveFormSubmissionValueDto, SaveFormSubmissionAttachmentDto, SaveFormSubmissionGridDto } from '../form-submissions/services/form-submissions.service';
import { ApproveSubmissionDto, RejectSubmissionDto, ApiResponse } from '../form-submissions/models/approve-reject-submission.model';
import { FormSubmissionValuesService, CreateFormSubmissionValueDto, BulkFormSubmissionValuesDto } from '../form-submissions/services/form-submission-values.service';
import { DocumentTypesService } from '../FormBuilder/services/document-types.service';
import { DocumentSeries, CreateDocumentSeriesDto } from '../FormBuilder/form-builder/models/document-types.model';
import { StorageService } from '../../auth/storage.service';
import { buildContext, getContextFieldCodes, requiresContext } from '../FormBuilder/utils/field-data-source-helpers';
import { FormBuilderDto, FormTabDto, FormFieldDto, FieldOptionResponse, FormRule, RuleCondition, FieldCondition, RuleAction, FieldTypeDto } from '../FormBuilder/form-builder/models/form-builder-dto.model';
import { TranslationService } from '../../core/services/translation.service';
import { environment } from '../../environments/environment';
import { catchError, of, forkJoin, Observable } from 'rxjs';
import { GridViewComponent } from './components/grid-view.component';
import { CalculatedFieldComponent } from './components/calculated-field.component';
import { CalculationEngineService } from '../FormBuilder/services/calculation-engine.service';
import { GridService } from '../FormBuilder/services/grid.service';
import { FormGridDto } from '../FormBuilder/form-builder/models/grid-dto.model';

@Component({
  selector: 'app-form-view',
  standalone: true,
  imports: [
    CommonModule,
    GridViewComponent,
    CalculatedFieldComponent
  ],
  templateUrl: './form-view.component.html',
  styleUrls: ['./form-view.component.scss']
})
export class FormViewComponent implements OnInit {
  formCode!: string;
  form: FormBuilderDto | null = null;
  tabs: FormTabDto[] = [];
  loading = false;
  notFound = false;
  notFoundReason: string = '';
  activeTabIndex = 0;
  showLanguageDropdown = false;
  isSubmitting = false;
  
  // Submission approval/reject state
  currentSubmission: FormSubmissionDto | null = null;
  isApproving = false;
  isRejecting = false;
  approveRejectComments: string = '';
  showApproveRejectModal = false;

  // File upload state
  uploadingFiles: { [fieldId: number]: boolean } = {};
  uploadProgress: { [fieldId: number]: number } = {}; // Upload progress percentage
  uploadedFiles: { [fieldId: number]: FormSubmissionAttachmentDto[] } = {};
  submissionId: number = 0; // Will be set when form is submitted
  fileUploadErrors: { [fieldId: number]: string } = {}; // File upload error messages
  filePreviewUrls: { [attachmentId: number]: string } = {}; // File preview URLs for images/PDFs
  showPreviewModal: boolean = false;
  previewFile: FormSubmissionAttachmentDto | null = null;
  pendingFiles: { [fieldId: number]: File[] } = {}; // Files selected but not yet uploaded (waiting for submission)

  // Field DataSource state
  fieldDataSourceOptions: { [fieldId: number]: FieldOptionResponse[] } = {}; // Options loaded from DataSource
  loadingFieldOptions: { [fieldId: number]: boolean } = {}; // Loading state for each field
  private _attemptedLoadOptions: { [fieldId: number]: boolean } = {}; // Track if we've attempted to load options for a field
  private _loggedFieldOptions: { [fieldId: number]: boolean } = {}; // Track logged fields to avoid console spam
  private _loggedFieldNoOptions: { [fieldId: number]: boolean } = {}; // Track logged "no options" warnings
  private _fieldTypeCache: { [fieldId: number]: string } = {}; // Cache field types to avoid recalculation
  
  // Field Types cache - loaded from API
  fieldTypes: FieldTypeDto[] = []; // Active field types loaded from API
  fieldTypesMap: { [id: number]: FieldTypeDto } = {}; // Map for quick lookup by ID

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
  fieldValidationErrors: { [fieldCode: string]: string } = {}; // Track validation errors for each field

  // Grid components reference
  @ViewChildren(GridViewComponent) gridViewComponents!: QueryList<GridViewComponent>;

  // Grids for each tab (grids that are not associated with fields)
  tabGrids: { [tabId: number]: FormGridDto[] } = {};

  // Default allowed file types (matching backend validation)
  private readonly DEFAULT_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'doc', 'docx'];

  // Track which fields depend on context for reloading options
  private contextDependencies: { [fieldId: number]: string[] } = {}; // fieldId -> array of context field codes

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private fieldDataSourceService: FieldDataSourceService,
    private fieldOptionsService: FieldOptionsService,
    private ruleEvaluationService: RuleEvaluationService,
    private formRulesService: FormRulesService,
    public fileUploadService: FileUploadService,
    public translationService: TranslationService,
    private formSubmissionsService: FormSubmissionsService,
    private formSubmissionValuesService: FormSubmissionValuesService,
    private documentTypesService: DocumentTypesService,
    private storageService: StorageService,
    private calculationEngine: CalculationEngineService,
    private cdr: ChangeDetectorRef,
    private gridService: GridService
  ) { }

  ngOnInit(): void {
    // Load field types first (they will be used as fallback in getFieldType)
    this.loadFieldTypes();
    
    this.route.paramMap.subscribe(params => {
      const code = params.get('formCode');
      if (code) {
        // Decode and normalize the formCode to handle URL-encoded characters
        // Angular's paramMap.get() should decode automatically, but we'll decode explicitly to be safe
        try {
          // Decode URL-encoded characters
          const decoded = decodeURIComponent(code);
          // Trim whitespace and normalize
          this.formCode = decoded.trim();
        } catch (e) {
          // If decoding fails, use the original code trimmed
          this.formCode = code.trim();
        }
        
        if (!this.formCode) {
          this.notFound = true;
          return;
        }
        
        this.loadForm();
      } else {
        this.notFound = true;
      }
    });

    // Check for submissionId in query params (for draft/edit mode)
    this.route.queryParams.subscribe(params => {
      if (params['submissionId']) {
        this.submissionId = +params['submissionId'];
        // Load submission data to check status and enable approve/reject
        this.loadSubmissionData();
      }
    });
  }

  /**
   * Save all grid data (called from form submission)
   */
  saveAllGridsData(): Observable<any[]> {
    const gridComponents = this.gridViewComponents?.toArray() || [];
    if (gridComponents.length === 0) {
      return of([]);
    }

    const saveObservables = gridComponents
      .filter(grid => grid.hasGridData() && grid.submissionId > 0)
      .map(grid => grid.saveGridData());

    if (saveObservables.length === 0) {
      return of([]);
    }

    return forkJoin(saveObservables);
  }

  /**
   * Validate all grids before submission
   */
  validateAllGrids(): { isValid: boolean; errors: string[] } {
    const gridComponents = this.gridViewComponents?.toArray() || [];
    const errors: string[] = [];

    gridComponents.forEach((grid, index) => {
      if (grid.hasGridData()) {
        // Check if grid is valid
        if (!grid.isGridValid()) {
          const gridName = grid.getGridTitle();
          errors.push(`Grid "${gridName}" has validation errors. Please fill all required fields.`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== Form Loading =====

  private loadForm(): void {
    this.loading = true;
    this.notFound = false;

    console.log('[FormView] Loading form with code:', {
      formCode: this.formCode,
      length: this.formCode?.length,
      encoded: encodeURIComponent(this.formCode)
    });

    // Fetch form data from API by formCode
    this.formsService.getFormByCode(this.formCode).subscribe({
      next: (form) => {
        console.log('[FormView] API Response:', form);

        if (!form) {
          console.warn('[FormView] Form is null or undefined');
          // Check if formCode contains COPY (indicating it's a duplicated form)
          if (this.formCode && this.formCode.toUpperCase().includes('COPY')) {
            this.handleNotFound(`Form "${this.formCode}" not found. The duplicated form may not be published or active. Please check the form settings in the admin panel and ensure it is published and active.`);
          } else {
            this.handleNotFound(`Form "${this.formCode}" not found. Please check if the form code is correct.`);
          }
          return;
        }

        // Check if form is published and active
        if (form.isPublished !== true || form.isActive !== true) {
          console.warn('[FormView] Form is not published or not active', {
            isPublished: form.isPublished,
            isActive: form.isActive,
            formCode: form.formCode
          });
          let reason = `Form "${form.formCode || this.formCode}" is `;
          if (!form.isPublished && !form.isActive) {
            reason += 'not published and not active';
          } else if (!form.isPublished) {
            reason += 'not published';
          } else if (!form.isActive) {
            reason += 'not active';
          }
          reason += '. Please publish and activate the form in the admin panel to make it accessible.';
          this.handleNotFound(reason);
          return;
        }

        // Verify formCode matches
        if (form.formCode && form.formCode.toLowerCase() !== this.formCode.toLowerCase()) {
          console.warn('[FormView] FormCode mismatch', {
            requested: this.formCode,
            received: form.formCode
          });
          // Still show the form if codes are similar (case-insensitive match was used)
        }

        this.form = form;
        
        // Check if rules are included with form (from backend)
        if (form.formRules && form.formRules.length > 0) {
          console.log('[FormView] Form includes rules:', form.formRules.length);
        } else {
          console.log('[FormView] Form does not include rules, will try to load separately');
        }
        
        const apiTabs = form.tabs || [];

        // Initialize submission ID
        // Note: In a real scenario, you should create a submission record first
        // For now, we don't set submissionId until a file is actually uploaded
        // This prevents unnecessary API calls to load non-existent files
        this.submissionId = 0; // Will be set when first file is uploaded or when submission is created

        // TODO: Create a submission record when form is first loaded
        // This ensures files are properly linked to a submission
        // Example: this.createSubmission(form.id).subscribe(submission => { this.submissionId = submission.id; });


        if (apiTabs && apiTabs.length > 0) {
          // API returned Tabs + Fields (or just Tabs)
          // Filter and sort tabs (only active ones)
          this.tabs = apiTabs
            .filter(tab => tab.isActive)
            .sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0))
            .map(tab => ({
              ...tab,
              // Filter and sort fields (only active ones - visibility controlled by rules)
              fields: (tab.fields || [])
                .filter(field => field.isActive)
                .sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0))
                .map(field => {
                  // Normalize calculation properties (handle PascalCase from API)
                  if (!field.expressionText && (field as any).ExpressionText) {
                    field.expressionText = (field as any).ExpressionText;
                  }
                  if (!field.calculationMode && (field as any).CalculationMode) {
                    field.calculationMode = (field as any).CalculationMode;
                  }
                  if (!field.recalculateOn && (field as any).RecalculateOn) {
                    field.recalculateOn = (field as any).RecalculateOn;
                  }
                  if (!field.resultType && (field as any).ResultType) {
                    field.resultType = (field as any).ResultType;
                  }
                  
                  // IMPORTANT: Keep static options even for Api/LookupTable DataSource fields
                  // Static options will be used as fallback if DataSource fails or returns no options
                  const originalOptions = field.fieldOptions || [];
                  
                  // Filter options - include all options if none are active, otherwise filter by isActive
                  const hasActiveOptions = originalOptions.some(opt => opt?.isActive !== false);
                  const filteredOptions = hasActiveOptions
                    ? originalOptions.filter(opt => opt?.isActive !== false)
                    : originalOptions; // If no active options, show all (for debugging)

                  const sortedOptions = filteredOptions.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));

                  // Only warn if no options at all AND field type requires options
                  // Field types that require options: select, radio, checkbox
                  const fieldType = this.getFieldType(field);
                  const ft = this.getFieldTypeFromCache(field) || field.fieldType;
                  const hasOptionsFromFieldType = ft?.hasOptions === true;
                  const requiresOptions = ['select', 'radio', 'checkbox'].includes(fieldType) || hasOptionsFromFieldType;
                  
                  if (sortedOptions.length === 0 && requiresOptions) {
                    const dataSource = field.fieldDataSource;
                    // Check if field has any DataSource (Static, Api, or LookupTable)
                    const hasDataSource = dataSource && dataSource.isActive;
                    const hasExternalDataSource = dataSource && 
                                                 dataSource.isActive && 
                                                 (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable');
                    // Only warn if field has NO DataSource at all (neither static nor external)
                    if (!hasDataSource) {
                      console.warn(`[FormView] WARNING: Field ${field.id} (${field.fieldCode || 'no-code'}) has NO static options and NO DataSource!`);
                    }
                    // If field has DataSource (even Static), options will be loaded from DataSource, so don't warn
                  }

                  return {
                    ...field,
                    fieldOptions: filteredOptions
                  };
                })
            }));

          // Initialize uploaded files arrays for file fields (don't load yet if no submissionId)
          // Also load options from DataSource for fields that need options
          this.tabs.forEach(tab => {
            tab.fields?.forEach(field => {
              if (this.getFieldType(field) === 'file' && field.id) {
                // Initialize empty array
                if (!this.uploadedFiles[field.id]) {
                  this.uploadedFiles[field.id] = [];
                }
              }

              // Initialize fieldValues with default values if not already set
              if (field.id !== undefined && field.id !== null) {
                const defaultValue = this.getDefaultValue(field);
                if (this.fieldValues[field.id] === undefined) {
                  this.fieldValues[field.id] = defaultValue;
                }
                // Also keep fieldCode map for rules
                if (field.fieldCode) {
                  this.fieldValues[field.fieldCode] = this.fieldValues[field.id];
                }
              }

              // Load options from DataSource for fields that need options (select, radio, checkbox)
              const fieldType = this.getFieldType(field);
              const ft = this.getFieldTypeFromCache(field) || field.fieldType;
              const hasOptionsFromFieldType = ft?.hasOptions === true;
              const isOptionsField = ['select', 'radio', 'checkbox'].includes(fieldType) || hasOptionsFromFieldType;
              
              if (isOptionsField && field.id) {
                // Load options from DataSource if field has DataSource configured
                this.loadFieldOptionsFromDataSource(field);
              }
            });
          });

          // Don't load files on initial form load - files will be loaded after first upload
          // or when submissionId is available from a saved submission
          // This prevents unnecessary 404 errors when no files have been uploaded yet

          this.activeTabIndex = 0;
          this.loading = false;
          // Create a draft submission on initial load so file fields can be linked
          // and uploadedFiles can be loaded without causing 404 errors.
          // This is intentionally best-effort and will fail silently if the
          // backend requires authentication or the endpoint is not available.
          this.createSubmissionOnLoad();

          // Field options will be loaded lazily when needed (when getFieldOptions is called)
          // This improves initial load performance by not loading all options at once

          // Load grids for each tab (grids not associated with fields)
          this.loadTabGrids();

          // Initialize form rules after form is loaded
          this.initializeFormRules();

          // Load expressionText for calculated fields if missing
          // Try to load fields from /api/FormFields/tab/{tabId} if expressionText is missing
          this.loadFieldsWithExpressionText().then(() => {
            // Calculate fields on initial load (use setTimeout to ensure all values are initialized)
            setTimeout(() => {
              this.calculateFieldsOnLoad();
            }, 100);
          });

          // Removed verbose logging
        } else if (form.id) {
          // API returned form only or Tabs without Fields
          console.log('[FormView] Loading tabs and fields for form ID:', form.id);
          this.loadTabsAndFields(form.id);
        } else {
          this.tabs = [];
          this.loading = false;
          console.log('[FormView] No tabs found in form');
        }
      },
      error: (error) => {
        console.error('[FormView] Error loading form:', error);
        console.error('[FormView] Error details:', {
          formCode: this.formCode,
          status: error?.status,
          message: error?.message,
          error: error
        });

        let reason = 'Unable to load form';
        if (error?.status === 404) {
          // Check if formCode contains COPY (indicating it's a duplicated form)
          if (this.formCode && this.formCode.toUpperCase().includes('COPY')) {
            reason = `Form "${this.formCode}" not found. The duplicated form may not be published or active. Please check the form settings in the admin panel.`;
          } else {
            reason = `Form "${this.formCode}" not found (404). ` +
                     `Possible causes:\n` +
                     `1. The form code is incorrect\n` +
                     `2. The form is not published or not active\n` +
                     `3. The API endpoint "/api/FormBuilder/code/{formCode}" may not exist in the backend\n\n` +
                     `Please check:\n` +
                     `- Verify the form code in the admin panel\n` +
                     `- Ensure the form is published and active\n` +
                     `- Check if the backend endpoint is implemented`;
          }
        } else if (error?.status === 403) {
          reason = 'Access denied (403). You may not have permission to view this form.';
        } else if (error?.status === 401) {
          reason = 'Unauthorized (401). Please ensure the form is published and accessible.';
        } else if (error?.status === 500) {
          reason = 'Server error (500). Please try again later.';
        } else if (error?.status) {
          reason = `Error ${error.status}: ${error.statusText || error.message || 'Unknown error'}`;
        } else {
          reason = `Unable to load form "${this.formCode}". Please check if the form exists and is published.`;
        }

        this.handleNotFound(reason);
      }
    });
  }

  // Load tabs and fields from services if API doesn't return them
  private loadTabsAndFields(formId: number): void {
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs) => {
        // Filter only active tabs
        const safeTabs = (Array.isArray(tabs) ? tabs : [])
          .filter(tab => tab.isActive);
        if (!safeTabs.length) {
          this.tabs = [];
          this.loading = false;
          return;
        }

        let remaining = safeTabs.length;
        const tabsWithFields: FormTabDto[] = [];

        safeTabs.forEach(tab => {
          if (!tab.id) {
            remaining--;
            if (remaining === 0) {
              this.tabs = tabsWithFields;
              this.loading = false;
            }
            return;
          }

          this.fieldsService.getFieldsByTabId(tab.id).subscribe({
            next: (fields: FormFieldDto[]) => {
              // Filter and sort fields (only active ones - visibility controlled by rules)
              const filteredFields = (Array.isArray(fields) ? fields : [])
                .filter(field => field.isActive)
                .sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0))
                .map(field => ({
                  ...field,
                  // Filter and sort field options (only active ones)
                  fieldOptions: (field.fieldOptions || [])
                    .filter(opt => opt.isActive)
                    .sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0))
                }));

              tabsWithFields.push({
                ...tab,
                fields: filteredFields
              });
              remaining--;
              if (remaining === 0) {
                this.tabs = tabsWithFields.sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
                this.activeTabIndex = 0;
                this.loading = false;
                
                // Load grids for each tab (grids not associated with fields)
                this.loadTabGrids();
                
                // Initialize uploaded files arrays (don't load yet - files will be loaded after first upload)
                this.tabs.forEach(tab => {
                  tab.fields?.forEach(field => {
                    if (this.getFieldType(field) === 'file' && field.id) {
                      if (!this.uploadedFiles[field.id]) {
                        this.uploadedFiles[field.id] = [];
                      }
                    }

                    // Load field options from DataSource if field has options type
                    const fieldType = this.getFieldType(field);
                    if (['select', 'radio', 'checkbox'].includes(fieldType)) {
                      this.loadFieldOptionsFromDataSource(field);
                    }

                    // Initialize fieldValues with default values if not already set
                    if (field.id !== undefined && field.id !== null) {
                      const defaultValue = this.getDefaultValue(field);
                      if (this.fieldValues[field.id] === undefined) {
                        this.fieldValues[field.id] = defaultValue;
                      }
                      // Also keep fieldCode map for rules
                      if (field.fieldCode) {
                        this.fieldValues[field.fieldCode] = this.fieldValues[field.id];
                      }
                    }
                  });
                });
              }
            },
            error: () => {
              tabsWithFields.push({
                ...tab,
                fields: [] // Empty fields array on error
              });
              remaining--;
              if (remaining === 0) {
                this.tabs = tabsWithFields
                  .filter(t => t.isActive)
                  .sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
                this.activeTabIndex = 0;
                this.loading = false;
                
                // Load grids for each tab (grids not associated with fields)
                this.loadTabGrids();
              }
            }
          });
        });
      },
      error: () => {
        this.tabs = [];
        this.loading = false;
      }
    });
  }

  private handleNotFound(reason: string = ''): void {
    this.form = null;
    this.tabs = [];
    this.loading = false;
    this.notFound = true;
    
    // Enhance reason message for duplicated forms
    if (reason && this.formCode && this.formCode.toUpperCase().includes('COPY')) {
      this.notFoundReason = reason + ' This usually means the form duplication failed or the duplicated form was not created properly. Please try duplicating the form again from the admin panel.';
    } else {
      this.notFoundReason = reason;
    }
    
    console.log('[FormView] Form not found. Reason:', this.notFoundReason);
    console.log('[FormView] Form code:', this.formCode);
  }

  // ===== Field DataSource Helpers =====

  /**
   * Load field options from DataSource if available
   * This method checks if a field has an active DataSource and loads options from it
   * Only loads from API/LookupTable, not from Static (Static options are already in field.fieldOptions)
   * Automatically builds context from formValues if not provided
   */
  loadFieldOptionsFromDataSource(field: FormFieldDto, context?: Record<string, any>): void {
    if (!field.id) return;

    // Check if field has options type (select, radio, checkbox)
    // IMPORTANT: Also check fieldType.hasOptions to detect fields that should have options
    // even if field.fieldOptions is not loaded yet
    const fieldType = this.getFieldType(field);
    const ft = this.getFieldTypeFromCache(field);
    const hasOptionsFromFieldType = ft?.hasOptions === true;
    const hasFieldOptions = !!(field.fieldOptions && field.fieldOptions.length > 0);
    const isOptionsType = ['select', 'radio', 'checkbox'].includes(fieldType);
    
    // If fieldType has hasOptions = true, treat it as an options field even if getFieldType() didn't detect it
    // This ensures we load options for fields that should have options
    if (!isOptionsType && !hasOptionsFromFieldType) {
      return;
    }

    // Check if field has a DataSource configuration
    let dataSource = field.fieldDataSource;
    
    // If DataSource is not loaded with field, try to load it from API
    if (!dataSource && field.id) {
      // Try to load field details to get DataSource
      this.fieldsService.getFieldById(field.id).subscribe({
        next: (loadedField) => {
          if (loadedField && loadedField.fieldDataSource) {
            // Update field with loaded DataSource
            field.fieldDataSource = loadedField.fieldDataSource;
            dataSource = loadedField.fieldDataSource;
            // Retry loading options with the loaded DataSource
            this.loadFieldOptionsFromDataSource(field, context);
          } else {
            // No DataSource found - use static options from field.fieldOptions
            this.fieldDataSourceOptions[field.id] = [];
            this.loadingFieldOptions[field.id] = false;
          }
        },
        error: (error) => {
          // Failed to load field - use static options from field.fieldOptions
          console.warn(`[FormView] Failed to load DataSource for field ${field.id}:`, error);
          this.fieldDataSourceOptions[field.id] = [];
          this.loadingFieldOptions[field.id] = false;
        }
      });
      return; // Exit early, will retry after DataSource is loaded
    }
    
    if (!dataSource || !dataSource.isActive) {
      // No DataSource or inactive - use static options from field.fieldOptions
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }

    // Only load from API/LookupTable, not Static
    // Static options are already included in field.fieldOptions from the form schema
    if (dataSource.sourceType === 'Static') {
      // Removed verbose logging
      // console.log(`[FormView] Field ${field.id} has Static DataSource, using field.fieldOptions`);
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }

    // For Api or LookupTable, load options dynamically
    if (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable') {
      // Set loading state
      this.loadingFieldOptions[field.id] = true;

      // Build context if not provided and DataSource requires it
      let finalContext = context;
      if (!finalContext && requiresContext(dataSource)) {
        finalContext = buildContext(dataSource, this.fieldValues);
      }

      // Track context dependencies for this field
      const contextFields = getContextFieldCodes(dataSource);
      if (contextFields.length > 0) {
        this.contextDependencies[field.id] = contextFields;
      }

      // Set timeout for DataSource loading (5 seconds)
      const dataSourceTimeoutId = setTimeout(() => {
        if (this.loadingFieldOptions[field.id]) {
          this.loadingFieldOptions[field.id] = false;
          this.cdr.detectChanges();
        }
      }, 5000);
      
      this.fieldDataSourceService.getFieldOptions(field.id, finalContext).subscribe({
        next: (options: FieldOptionResponse[]) => {
          clearTimeout(dataSourceTimeoutId);
          
          if (options && options.length > 0) {
            this.fieldDataSourceOptions[field.id] = options;
          } else {
            // If no options from DataSource, fallback to static options from database
            this.fieldDataSourceOptions[field.id] = [];
          }
          this.loadingFieldOptions[field.id] = false;
        },
        error: (error) => {
          clearTimeout(dataSourceTimeoutId);
          // Fallback to static options on error
          this.fieldDataSourceOptions[field.id] = [];
          this.loadingFieldOptions[field.id] = false;
        },
        complete: () => {
          // Ensure loading state is cleared when observable completes
          clearTimeout(dataSourceTimeoutId);
          if (this.loadingFieldOptions[field.id]) {
            this.loadingFieldOptions[field.id] = false;
            this.cdr.detectChanges();
          }
        }
      });
    } else {
      // Unknown source type, use static options
      console.warn(`[FormView] Field ${field.id} has unknown DataSource type: ${dataSource.sourceType}, using static options`);
      this.fieldDataSourceOptions[field.id] = [];
    }
  }

  /**
   * Get field options (from DataSource or static fieldOptions)
   */
  getFieldOptions(field: FormFieldDto): any[] {
    if (!field.id) {
      return field.fieldOptions || [];
    }

    // If currently loading, return empty array to prevent multiple calls
    if (this.loadingFieldOptions[field.id]) {
      return [];
    }

    // If options are loaded from DataSource, use them
    if (this.fieldDataSourceOptions[field.id] && this.fieldDataSourceOptions[field.id].length > 0) {
      // Convert FieldOptionResponse to FieldOptionDto format for compatibility
      const dataSource = field.fieldDataSource;
      const textPath = dataSource?.textPath || '';
      const valuePath = dataSource?.valuePath || '';

      return this.fieldDataSourceOptions[field.id]
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
            console.warn(`[FormView] Option at index ${index} has no text or value, using fallback: "${displayText}"`, {
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
        });
    }

    // Otherwise, use static options from field.fieldOptions
    // IMPORTANT: Even if field has Api/LookupTable DataSource, use static options as fallback
    // if DataSource failed or returned no options
    const staticOptions = field.fieldOptions || [];
    
    // Check if field should have options but doesn't - load them lazily
    // Only trigger loading once per field to avoid multiple requests
    if (staticOptions.length === 0 && !this.loadingFieldOptions[field.id] && !this._attemptedLoadOptions[field.id]) {
    const fieldTypeCache = this.getFieldTypeFromCache(field);
      if (fieldTypeCache?.hasOptions === true) {
        this._attemptedLoadOptions[field.id] = true; // Mark as attempted to prevent repeated calls
      // Try to load options from DataSource if available
      if (field.fieldDataSource && field.fieldDataSource.isActive && 
          field.fieldDataSource.sourceType !== 'Static') {
        this.loadFieldOptionsFromDataSource(field);
          return []; // Return empty while loading
      } else {
        // If no DataSource, try to load static options from API endpoint
          if (field.id) {
          this.loadStaticFieldOptions(field);
            return []; // Return empty while loading
          }
        }
      }
    }
    
    // Check if DataSource failed or returned no options
    const dataSource = field.fieldDataSource;
    const hasExternalDataSource = dataSource && 
                                 dataSource.isActive && 
                                 (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable');
    const dataSourceFailed = hasExternalDataSource && 
                            (!this.fieldDataSourceOptions[field.id] || this.fieldDataSourceOptions[field.id].length === 0);

    // If DataSource failed, use static options as fallback (no logging for performance)

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

    // Removed verbose logging

    return processedOptions;
  }

  /**
   * Check if field is loading options from DataSource
   */
  isLoadingFieldOptions(field: FormFieldDto): boolean {
    return field.id ? (this.loadingFieldOptions[field.id] || false) : false;
  }

  /**
   * Load static field options from API endpoint as fallback
   * This is used when field.fieldOptions is empty but field should have options
   * 
   * IMPORTANT: Uses /api/FieldDataSources/field-options which works with all DataSource types
   * (Static, API, LookupTable) unlike /api/FieldOptions/field/{fieldId}/active which only works for Static
   */
  private loadStaticFieldOptions(field: FormFieldDto): void {
    if (!field.id) return;
    
    // Prevent multiple simultaneous requests for the same field
    if (this.loadingFieldOptions[field.id]) {
      return;
    }
    
    this.loadingFieldOptions[field.id] = true;
    
    // Set timeout to prevent infinite loading state (5 seconds - reduced from 10)
    const timeoutId = setTimeout(() => {
      if (this.loadingFieldOptions[field.id]) {
        this.loadingFieldOptions[field.id] = false;
        this.cdr.detectChanges();
      }
    }, 5000);
    
    // Use /api/FieldDataSources/field-options which works with all DataSource types
    this.fieldDataSourceService.getFieldOptions(field.id).subscribe({
      next: (fieldOptionResponses: FieldOptionResponse[]) => {
        clearTimeout(timeoutId);
        // Ensure loading state is cleared
        this.loadingFieldOptions[field.id] = false;
        
        if (fieldOptionResponses && fieldOptionResponses.length > 0) {
          // Convert FieldOptionResponse[] to FieldOptionDto[] format
          // FieldOptionResponse has: {value, text}
          // FieldOptionDto needs: {optionValue, optionText, foreignOptionText, optionOrder, isActive, ...}
          const options = fieldOptionResponses.map((opt, index) => ({
            optionValue: String(opt.value || ''),
            optionText: String(opt.text || ''),
            foreignOptionText: String(opt.text || ''), // Use text as fallback for foreignOptionText
            optionOrder: index + 1,
            isActive: true
          }));
          
          // Update field.fieldOptions with loaded options
          // IMPORTANT: Update in all tabs that contain this field
          this.tabs.forEach(tab => {
            if (tab.fields) {
              const fieldInTab = tab.fields.find(f => f.id === field.id);
              if (fieldInTab) {
                fieldInTab.fieldOptions = options;
              }
            }
          });
          
          // Also update the original field object
          field.fieldOptions = options;
          this.cdr.detectChanges();
        } else {
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        clearTimeout(timeoutId);
        // Ensure loading state is cleared even on error
        this.loadingFieldOptions[field.id] = false;
        // Don't show error to user - field will just have no options
        this.cdr.detectChanges();
      },
      complete: () => {
        // Ensure loading state is cleared when observable completes (even if no next/error called)
        clearTimeout(timeoutId);
        if (this.loadingFieldOptions[field.id]) {
          this.loadingFieldOptions[field.id] = false;
        this.cdr.detectChanges();
        }
      }
    });
  }

  /**
   * Load grids for each tab (grids that are not associated with fields)
   */
  private loadTabGrids(): void {
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
          this.tabGrids[tab.id] = standaloneGrids;
          this.cdr.detectChanges();
        },
        error: (error) => {
          // Silently handle 404 (no grids for this tab) - this is normal
          if (error?.status === 404) {
            this.tabGrids[tab.id] = [];
          } else {
            console.warn(`[FormView] Failed to load grids for tab ${tab.id}:`, error);
            this.tabGrids[tab.id] = [];
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
        console.log(`[FormView] Loaded ${this.fieldTypes.length} active field types from API`);
      },
      error: (error) => {
        console.warn('[FormView] Failed to load field types from API:', error);
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
    // IMPORTANT: Check typeName FIRST to catch checkbox even if hasOptions = false in database
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

    // 3) Calculated - Check BEFORE number/date/text (calculated fields should be detected even without expressionText)
    // A field is calculated if:
    // 1. fieldTypeId is 14 (Calculated type)
    // 2. Type name is 'Calculated'
    // 3. OR has expressionText (for backward compatibility)
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
    // Note: hasOptionsFromFieldType already checked above, reuse it
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

      // إذا كان allowMultiple = false و hasOptions = true وليس select/combobox صراحة
      // (Radio buttons تسمح باختيار واحد فقط، بينما Select قد يكون single أو multiple)
      // Check allowMultiple - use ft?.allowMultiple if available, otherwise default to false (single selection = radio)
      const allowMultiple = ft?.allowMultiple ?? false;
      
      // Default to select if allowMultiple is true, otherwise radio
      if (allowMultiple === true) {
        return 'select';
      }
      
      // If allowMultiple = false and not explicitly select/combobox, default to radio
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

  // ===== Form Rules Evaluation =====

  /**
   * Initialize form rules after form is loaded
   */
  private initializeFormRules(): void {
    if (!this.form || !this.form.id) {
      console.warn('[FormView] Cannot initialize rules: form or form.id is missing');
      return;
    }

    // If rules are already loaded with form, use them
    if (this.form.formRules && this.form.formRules.length > 0) {
      console.log('[FormView] Using rules from form object:', this.form.formRules.length);
      this.resetDynamicFieldStates();
      this.evaluateFormRules();
      return;
    }

    // Otherwise, load rules from API
    console.log('[FormView] Loading rules from API for form:', this.form.id);
    this.formRulesService.getActiveRulesByFormId(this.form.id).subscribe({
      next: (rules) => {
        console.log('[FormView] Loaded rules from API:', rules.length);
        if (!this.form) return;
        
        // Assign rules to form
        this.form.formRules = rules;
        
        // Reset and evaluate
        this.resetDynamicFieldStates();
        this.evaluateFormRules();
        
        // Trigger change detection
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.warn('[FormView] Error loading rules (may require authentication):', error);
        console.warn('[FormView] Status:', error?.status, '- Form will work without rules');
        
        // If 401 Unauthorized, the endpoint may require authentication
        // For public forms, we'll continue without rules
        if (error?.status === 401) {
          console.warn('[FormView] Rules endpoint requires authentication (401). Public forms may not have access to rules.');
          console.warn('[FormView] Form will work without dynamic rules. Consider making rules endpoint public or adding authentication.');
        }
        
        // Continue without rules - form will work without them
        this.resetDynamicFieldStates();
      }
    });
  }

  /**
   * Evaluate all form rules and apply actions
   * Called whenever field values change
   * Uses RuleEvaluationService for evaluation
   */
  evaluateFormRules(): void {
    if (!this.form) {
      console.log('[FormView] Cannot evaluate rules: form is null');
      return;
    }

    if (!this.form.formRules || this.form.formRules.length === 0) {
      console.log('[FormView] No rules to evaluate');
      return;
    }

    console.log('[FormView] Evaluating', this.form.formRules.length, 'rules');
    console.log('[FormView] Current field values:', this.fieldValues);

    // Reset dynamic states to base field states
    this.resetDynamicFieldStates();

    // Build base field states
    const baseFieldStates: Record<string, FieldState> = {};
    const allFieldCodes: string[] = [];
    if (this.tabs) {
      this.tabs.forEach(tab => {
        tab.fields?.forEach(field => {
          if (field.fieldCode) {
            allFieldCodes.push(field.fieldCode);
            baseFieldStates[field.fieldCode] = {
              isVisible: field.isVisible ?? true,
              isMandatory: field.isMandatory ?? false,
              isReadOnly: field.isEditable === false
            };
            // Removed NOTES-specific logging - it's optional
          }
        });
      });
    }
    
    console.log('[FormView] Base field states:', Object.keys(baseFieldStates));
    console.log('[FormView] All field codes in form:', allFieldCodes);
    // Removed NOTES field warning - it's optional and may not exist in all forms

    // Use RuleEvaluationService to evaluate all rules
    const evaluatedStates = this.ruleEvaluationService.evaluateAllRules(
      this.form.formRules,
      this.fieldValues,
      baseFieldStates
    );

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
        // Removed NOTES-specific logging
      } else {
        this.dynamicFieldStates[fieldCode] = {
          isVisible: state.isVisible,
          isRequired: state.isMandatory,
          isReadOnly: state.isReadOnly,
          value: state.value
        };
        // Removed NOTES-specific logging
      }
    });
    
    // Also ensure all fields in tabs have dynamic states initialized (even if not in evaluatedStates)
    if (this.tabs) {
      this.tabs.forEach(tab => {
        tab.fields?.forEach(field => {
          if (field.fieldCode && !this.dynamicFieldStates[field.fieldCode]) {
            // Initialize state for fields that weren't in evaluatedStates
            this.dynamicFieldStates[field.fieldCode] = {
              isVisible: field.isVisible ?? true,
              isRequired: field.isMandatory ?? false,
              isReadOnly: field.isEditable === false
            };
            console.log(`[FormView] Initialized missing state for ${field.fieldCode}:`, this.dynamicFieldStates[field.fieldCode]);
          }
        });
      });
    }

    // Update fieldValues with any computed values from rules
    Object.keys(evaluatedStates).forEach(fieldCode => {
      const state = evaluatedStates[fieldCode];
      if (state.value !== undefined && this.fieldValues[fieldCode] !== state.value) {
        this.fieldValues[fieldCode] = state.value;
        // Also update by field ID if possible
        const field = this.findFieldByCode(fieldCode);
        if (field && field.id) {
          this.fieldValues[String(field.id)] = state.value;
        }
      }
    });

    console.log('[FormView] Form rules evaluated, dynamic states:', this.dynamicFieldStates);
    console.log('[FormView] Field visibility states:', 
      Object.keys(this.dynamicFieldStates).map(code => ({
        code,
        visible: this.dynamicFieldStates[code].isVisible,
        required: this.dynamicFieldStates[code].isRequired,
        readOnly: this.dynamicFieldStates[code].isReadOnly
      }))
    );
    
    // Force change detection to update UI
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  /**
   * Reset dynamic field states to base field configuration
   */
  private resetDynamicFieldStates(): void {
    // Keep existing structure but reset to base values
    if (this.tabs) {
      this.tabs.forEach(tab => {
        tab.fields?.forEach(field => {
          if (field.fieldCode) {
            if (!this.dynamicFieldStates[field.fieldCode]) {
              this.dynamicFieldStates[field.fieldCode] = {};
            }
            // Reset to base values but keep existing structure
            this.dynamicFieldStates[field.fieldCode].isVisible = field.isVisible ?? true;
            this.dynamicFieldStates[field.fieldCode].isRequired = field.isMandatory ?? false;
            this.dynamicFieldStates[field.fieldCode].isReadOnly = field.isEditable === false;
            // Don't reset value here - it will be set by rules if needed
          }
        });
      });
    }
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(condition: RuleCondition): boolean {
    if (!condition || !condition.conditions || condition.conditions.length === 0) {
      return true; // Empty condition is always true
    }

    const results = condition.conditions.map(cond => this.evaluateFieldCondition(cond));

    // Apply operator (And/Or)
    if (condition.operator === 'Or') {
      return results.some(r => r === true);
    } else {
      // Default to And
      return results.every(r => r === true);
    }
  }

  /**
   * Evaluate a single field condition
   */
  private evaluateFieldCondition(condition: FieldCondition): boolean {
    const fieldValue = this.fieldValues[condition.fieldCode];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'Equals':
        return this.compareValues(fieldValue, conditionValue, '===');
      case 'NotEquals':
        return !this.compareValues(fieldValue, conditionValue, '===');
      case 'Contains':
        return String(fieldValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
      case 'GreaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'LessThan':
        return Number(fieldValue) < Number(conditionValue);
      case 'IsEmpty':
        return !fieldValue || String(fieldValue).trim() === '';
      case 'IsNotEmpty':
        return fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '';
      case 'In':
        const inArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return inArray.includes(fieldValue);
      case 'NotIn':
        const notInArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return !notInArray.includes(fieldValue);
      default:
        console.warn(`[FormView] Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Compare two values with type conversion
   */
  private compareValues(value1: any, value2: any, operator: '===' | '=='): boolean {
    // Try type conversion for numbers and booleans
    const v1 = this.convertValue(value1);
    const v2 = this.convertValue(value2);

    // For string comparisons, use case-insensitive and trimmed comparison
    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return v1.trim().toLowerCase() === v2.trim().toLowerCase();
    }

    if (operator === '===') {
      return v1 === v2;
    } else {
      return v1 == v2; // eslint-disable-line eqeqeq
    }
  }

  /**
   * Convert value to appropriate type (number, boolean, or string)
   */
  private convertValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Try boolean
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;

    // Try number
    const num = Number(value);
    if (!isNaN(num) && String(value).trim() === String(num)) {
      return num;
    }

    // Return as string
    return String(value);
  }

  /**
   * Apply rule actions
   */
  private applyActions(actions: RuleAction[]): void {
    if (!actions || actions.length === 0) {
      return;
    }

    for (const action of actions) {
      const state = this.dynamicFieldStates[action.fieldCode];
      if (!state) {
        // Field not found, skip
        continue;
      }

      switch (action.actionType) {
        case 'Show':
          state.isVisible = true;
          break;
        case 'Hide':
          state.isVisible = false;
          break;
        case 'SetRequired':
          state.isRequired = true;
          break;
        case 'SetOptional':
          state.isRequired = false;
          break;
        case 'SetReadOnly':
          state.isReadOnly = true;
          break;
        case 'SetEditable':
          state.isReadOnly = false;
          break;
        case 'SetValue':
          if (action.value !== undefined) {
            state.value = action.value;
            // Update both Code and ID if possible
            this.fieldValues[action.fieldCode] = action.value;
            // We need to find the field ID for this code
            const field = this.findFieldByCode(action.fieldCode);
            if (field && field.id) {
              this.fieldValues[String(field.id)] = action.value;
            }
          }
          break;
        case 'SetDefaultValue':
          if (action.value !== undefined && this.fieldValues[action.fieldCode] === undefined) {
            state.value = action.value;
            this.fieldValues[action.fieldCode] = action.value;
            const field = this.findFieldByCode(action.fieldCode);
            if (field && field.id) {
              this.fieldValues[String(field.id)] = action.value;
            }
          }
          break;
      }
    }
  }

  /**
   * Helper to find a field by its code across all tabs
   */
  private findFieldByCode(code: string): FormFieldDto | undefined {
    if (!this.tabs) return undefined;
    for (const tab of this.tabs) {
      const field = tab.fields?.find(f => 
        f.fieldCode === code || 
        (f.fieldCode && f.fieldCode.toUpperCase() === code.toUpperCase())
      );
      if (field) return field;
    }
    return undefined;
  }

  /**
   * Validate form rules before submission
   * Returns validation result with errors if any
   */
  validateFormRulesBeforeSubmit(): Observable<{ valid: boolean; errors: string[] }> {
    if (!this.form || !this.form.id) {
      return of({ valid: true, errors: [] });
    }

    // Use FormsService to validate rules
    return this.formsService.validateFormRules(this.form.id, this.fieldValues).pipe(
      catchError((error) => {
        console.error('[FormView] Error validating form rules:', error);
        return of({
          valid: false,
          errors: ['Failed to validate form rules. Please try again.']
        });
      })
    );
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[0-9]{7,20}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate password (minimum length)
   */
  private validatePassword(password: string): boolean {
    return password.length >= 6;
  }

  /**
   * Validate field value based on field type
   */
  private validateFieldValue(field: FormFieldDto, value: any): string | null {
    if (value === undefined || value === null || value === '') {
      return null; // Empty values are handled by required validation
    }

    const valueStr = String(value);
    const fieldCodeLower = (field.fieldCode || '').toLowerCase();
    const fieldTypeNameLower = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    const fieldType = this.getFieldType(field);

    // Email validation
    if (fieldType === 'email' || fieldTypeNameLower.includes('email') || fieldCodeLower === 'email') {
      if (!this.validateEmail(valueStr)) {
        return 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (fieldTypeNameLower.includes('phone') || fieldTypeNameLower.includes('mobile') ||
        fieldCodeLower === 'phone' || fieldCodeLower === 'mobile' || fieldCodeLower === 'phone_number') {
      if (!this.validatePhone(valueStr)) {
        return 'Please enter a valid phone number (7-20 digits)';
      }
    }

    // Password validation
    if (fieldTypeNameLower.includes('password') || fieldCodeLower === 'password' || fieldCodeLower === 'pwd') {
      if (!this.validatePassword(valueStr)) {
        return 'Password must be at least 6 characters';
      }
    }

    return null; // No validation error
  }

  /**
   * Validate all form fields and rules before submission
   * This should be called before submitting the form
   */
  async validateFormBeforeSubmit(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Validate required fields and field-specific validations
    if (this.tabs) {
      this.tabs.forEach(tab => {
        tab.fields?.forEach(field => {
          if (!this.isFieldVisible(field)) {
            // Skip hidden fields
            return;
          }

          const value = this.getFieldValue(field);
          const fieldLabel = this.getFieldLabel(field);

          // Validate required fields
          if (this.isRequired(field)) {
            // Special handling for file upload fields
            const fieldType = this.getFieldType(field);
            if (fieldType === 'file') {
              // For file fields, check if files are uploaded or pending
              const hasUploadedFiles = field.id && this.uploadedFiles[field.id] && this.uploadedFiles[field.id].length > 0;
              const hasPendingFiles = field.id && this.pendingFiles[field.id] && this.pendingFiles[field.id].length > 0;
              if (!hasUploadedFiles && !hasPendingFiles) {
                errors.push(`Field "${fieldLabel}" is required`);
              }
            } else {
              // For other field types, use standard validation
              if (value === undefined || value === null || value === '' || 
                  (Array.isArray(value) && value.length === 0)) {
                errors.push(`Field "${fieldLabel}" is required`);
              }
            }
          }

          // Validate field-specific formats (email, phone, password)
          // Only validate if field has a value (required validation is handled above)
          if (value !== undefined && value !== null && value !== '' && 
              !(Array.isArray(value) && value.length === 0)) {
            const validationError = this.validateFieldValue(field, value);
            if (validationError) {
              errors.push(`"${fieldLabel}": ${validationError}`);
            }
          }
        });
      });
    }

    // 2. Validate grids
    const gridValidation = this.validateAllGrids();
    if (!gridValidation.isValid) {
      errors.push(...gridValidation.errors);
    }

    // 3. Validate form rules (if backend validation is available)
    if (errors.length === 0 && this.form && this.form.id) {
      try {
        const ruleValidation = await this.validateFormRulesBeforeSubmit().toPromise();
        if (ruleValidation && !ruleValidation.valid) {
          errors.push(...ruleValidation.errors);
        }
      } catch (error) {
        console.error('[FormView] Error during rule validation:', error);
        // Don't block submission if rule validation fails
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Track field value changes for rule evaluation
   * Also reloads field options if context fields changed
   */
  onFieldValueChange(fieldId: number | string | undefined, value: any, fieldCode?: string): void {
    if (fieldId === undefined || fieldId === null) return;

    // Normalize fieldId to string to avoid numeric key issues
    const idKey = String(fieldId);

    console.log(`[FormView] Value change: ID=${idKey}, Code=${fieldCode} ->`, value);

    // Create a new object to ensure change detection
    const newFieldValues = { ...this.fieldValues };
    newFieldValues[idKey] = value;
    if (fieldCode && fieldCode.trim() !== '') {
      newFieldValues[fieldCode] = value;
    }

    // Update the reference to trigger change detection
    this.fieldValues = newFieldValues;

    // Reload options for fields that depend on this field's value (context)
    this.reloadDependentFieldOptions(fieldCode || idKey);

    // Re-evaluate rules
    this.evaluateFormRules();

    // Recalculate calculated fields if needed (async, don't wait)
    const changedCode = fieldCode || idKey;
    this.calculateFields(changedCode).then(() => {
      // Trigger change detection after calculation completes
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }).catch(error => {
      console.error(`[FormView] Error in calculation for field ${changedCode}:`, error);
    });

    // Mark for check and detect changes immediately
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  /**
   * Reload field options for fields that depend on the changed context field
   */
  private reloadDependentFieldOptions(changedFieldCode: string): void {
    // Find all fields that depend on the changed field
    Object.keys(this.contextDependencies).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const contextFields = this.contextDependencies[fieldId];
      
      // If the changed field is in the context dependencies, reload options
      if (contextFields.includes(changedFieldCode)) {
        const field = this.findFieldById(fieldId);
        if (field) {
          console.log(`[FormView] Reloading options for field ${fieldId} because context field "${changedFieldCode}" changed`);
          this.loadFieldOptionsFromDataSource(field);
        }
      }
    });
  }

  /**
   * Helper to find a field by its ID across all tabs
   */
  private findFieldById(fieldId: number): FormFieldDto | undefined {
    for (const tab of this.tabs) {
      const field = tab.fields?.find(f => f.id === fieldId);
      if (field) return field;
    }
    return undefined;
  }

  /**
   * Handle select change (single or multiple values)
   */
  onSelectChange(field: FormFieldDto, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const fieldId = field.id;
    const fieldCode = field.fieldCode;
    
    if (!fieldId) {
      console.error(`[FormView] Select change: Field ID is missing`);
      return;
    }

    const isMultiple = field.fieldType?.allowMultiple || false;
    let newValue: any;

    if (isMultiple) {
      // Multiple selection: get all selected options
      const selectedOptions = Array.from(selectElement.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== ''); // Filter out empty placeholder
      
      newValue = selectedOptions.length > 0 ? JSON.stringify(selectedOptions) : '';
      console.log(`[FormView] Multiple select change: ID=${fieldId}, selectedValues=`, selectedOptions);
    } else {
      // Single selection: get the selected value
      newValue = selectElement.value || '';
      console.log(`[FormView] Single select change: ID=${fieldId}, value=`, newValue);
    }

    this.onFieldValueChange(fieldId, newValue, fieldCode);
  }

  /**
   * Handle checkbox change (multiple values)
   */
  onCheckboxChange(field: FormFieldDto, optionValue: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const fieldId = field.id;
    const fieldCode = field.fieldCode;
    
    if (!fieldId) {
      console.error(`[FormView] Checkbox change: Field ID is missing`);
      return;
    }

    const idKey = String(fieldId);
    
    // Get current value directly from fieldValues (most up-to-date)
    let currentValue = this.fieldValues[idKey];
    
    // Fallback to fieldCode if idKey doesn't have value
    if (currentValue === undefined && fieldCode) {
      currentValue = this.fieldValues[fieldCode];
    }
    
    // If still undefined, try getFieldValue
    if (currentValue === undefined) {
      currentValue = this.getFieldValue(field);
    }

    console.log(`[FormView] Checkbox change: ID=${fieldId}, option=${optionValue}, checked=${isChecked}, currentValue=`, currentValue);

    try {
      let selectedValues: any[] = [];

      // Robustly extract current selected values as an array
      if (Array.isArray(currentValue)) {
        selectedValues = [...currentValue];
      } else if (currentValue && String(currentValue).trim() !== '') {
        try {
          const parsed = JSON.parse(String(currentValue));
          selectedValues = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          if (String(currentValue).includes(',')) {
            selectedValues = String(currentValue).split(',').map(s => s.trim());
          } else {
            selectedValues = [currentValue];
          }
        }
      }

      // Convert all values to strings for consistent comparison
      selectedValues = selectedValues.map(v => String(v).trim()).filter(v => v !== '');
      const optStr = String(optionValue).trim();

      // Add or remove the option value
      if (isChecked) {
        if (!selectedValues.includes(optStr)) {
          selectedValues.push(optStr);
        }
      } else {
        selectedValues = selectedValues.filter(v => v !== optStr);
      }

      // Update field value
      const newValue = selectedValues.length > 0 ? JSON.stringify(selectedValues) : '';
      console.log(`[FormView] Checkbox new value for field ID ${fieldId}:`, newValue, 'selectedValues:', selectedValues);
      this.onFieldValueChange(fieldId, newValue, fieldCode);
    } catch (error) {
      console.error(`[FormView] Error handling checkbox change for field ${fieldId}:`, error);
    }
  }

  /**
   * Calculate calculated fields based on changed field
   */
  private async calculateFields(changedFieldCode: string): Promise<void> {
    console.log(`[FormView] calculateFields called for ${changedFieldCode}`);
    
    // Get all fields from all tabs
    const allFields: FormFieldDto[] = [];
    this.tabs.forEach(tab => {
      if (tab.fields && tab.fields.length > 0) {
        allFields.push(...tab.fields);
      }
    });

    // Normalize expressionText from PascalCase if needed
    allFields.forEach(field => {
      if (!field.expressionText && (field as any).ExpressionText) {
        field.expressionText = (field as any).ExpressionText;
      }
    });
    
    // Debug: Log all fields to see their types
    console.log(`[FormView] All fields:`, allFields.map(f => {
      const ft = this.getFieldTypeFromCache(f);
      return {
        code: f.fieldCode,
        typeId: f.fieldTypeId,
        typeName: f.fieldTypeName,
        fieldTypeTypeName: f.fieldType?.typeName,
        cachedFieldTypeTypeName: ft?.typeName,
        isCalculated: this.calculationEngine.isCalculatedField(f)
      };
    }));
    
    // Find calculated fields that depend on the changed field
    // Check both calculationEngine.isCalculatedField AND fieldTypesMap for type name
    const calculatedFields = allFields.filter(field => {
      // First check using calculationEngine
      if (this.calculationEngine.isCalculatedField(field)) {
        return (field.recalculateOn === 'OnFieldChange' || !field.recalculateOn);
      }
      
      // Fallback: Check fieldTypesMap for Calculated type name
      const ft = this.getFieldTypeFromCache(field);
      if (ft && ft.typeName && ft.typeName.toLowerCase() === 'calculated') {
        return (field.recalculateOn === 'OnFieldChange' || !field.recalculateOn);
      }
      
      return false;
    });

    console.log(`[FormView] Found ${calculatedFields.length} calculated fields:`, 
      calculatedFields.map(f => `${f.fieldCode} (typeId: ${f.fieldTypeId}, typeName: ${f.fieldTypeName})`));

    if (calculatedFields.length === 0) {
      console.log(`[FormView] No calculated fields found, returning`);
      return; // No calculated fields to update
    }

    // Get dependent calculated fields
    let dependentFields = this.calculationEngine.getDependentCalculatedFields(
      changedFieldCode,
      calculatedFields
    );

    console.log(`[FormView] Found ${dependentFields.length} dependent calculated fields for ${changedFieldCode}:`, 
      dependentFields.map(f => f.fieldCode));

    // Always calculate all calculated fields, not just dependent ones
    // calculateAllFields handles dependencies correctly and will recalculate all fields
    // that need to be updated based on the current fieldValues
    try {
      console.log(`[FormView] Current fieldValues before calculation:`, this.fieldValues);
      
      const results = await this.calculationEngine.calculateAllFields(
        allFields,
        this.fieldValues,
        calculatedFields // Pass the calculatedFields we found (includes fields with fieldTypeId: 20)
      );

      console.log(`[FormView] Calculation results:`, results);

      // Update field values with calculated results
      Object.keys(results).forEach(fieldCode => {
        const result = results[fieldCode];
        // Find the field to get its ID
        const field = allFields.find(f => f.fieldCode === fieldCode);
        if (field && field.id) {
          const idKey = String(field.id);
          const oldValue = this.fieldValues[idKey];
          this.fieldValues[idKey] = result;
          this.fieldValues[fieldCode] = result;
          console.log(`[FormView] Updated field ${fieldCode} (ID: ${idKey}): ${oldValue} -> ${result}`);
        }
      });

      // Trigger change detection
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[FormView] Error calculating fields:', error);
    }
  }

  /**
   * Load fields with expressionText from /api/FormFields/tab/{tabId} if missing
   */
  private async loadFieldsWithExpressionText(): Promise<void> {
    // Check if we have calculated fields without expressionText
    const allFields: FormFieldDto[] = [];
    this.tabs.forEach(tab => {
      if (tab.fields && tab.fields.length > 0) {
        allFields.push(...tab.fields);
      }
    });

    const calculatedFieldsWithoutExpression = allFields.filter(field => 
      this.calculationEngine.isCalculatedField(field) && 
      (!field.expressionText || field.expressionText.trim() === '')
    );

    if (calculatedFieldsWithoutExpression.length === 0) {
      return; // All calculated fields have expressionText
    }

    console.log(`[FormView] Found ${calculatedFieldsWithoutExpression.length} calculated fields without expressionText. Loading from /api/FormFields/tab/{tabId}...`);

    // Load fields from /api/FormFields/tab/{tabId} for each tab
    const loadPromises = this.tabs.map(async (tab) => {
      if (!tab.id || !tab.fields || tab.fields.length === 0) return;
      
      try {
        const fields = await this.fieldsService.getFieldsByTabId(tab.id).toPromise();
        if (fields && fields.length > 0) {
          // Update fields in tabs with expressionText
          fields.forEach(loadedField => {
            const tabField = tab.fields?.find(f => f.id === loadedField.id);
            if (tabField && loadedField.expressionText) {
              tabField.expressionText = loadedField.expressionText;
              tabField.calculationMode = loadedField.calculationMode || tabField.calculationMode;
              tabField.recalculateOn = loadedField.recalculateOn || tabField.recalculateOn;
              tabField.resultType = loadedField.resultType || tabField.resultType;
              console.log(`[FormView] Loaded expressionText for field ${loadedField.fieldCode}: ${loadedField.expressionText}`);
            }
          });
        }
      } catch (error: any) {
        // Handle errors gracefully
        if (error?.status === 401) {
          console.log(`[FormView] Cannot load fields for tab ${tab.id}: API requires authentication (401). Calculated fields will not work without expressionText.`);
        } else {
          console.warn(`[FormView] Failed to load fields for tab ${tab.id}:`, error);
        }
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Load expressionText for calculated fields if missing (DEPRECATED - use loadFieldsWithExpressionText instead)
   */
  private async loadCalculatedFieldsExpressionText(): Promise<void> {
    const allFields: FormFieldDto[] = [];
    this.tabs.forEach(tab => {
      if (tab.fields && tab.fields.length > 0) {
        allFields.push(...tab.fields);
      }
    });

    // Find calculated fields without expressionText
    const calculatedFieldsWithoutExpression = allFields.filter(field => 
      this.calculationEngine.isCalculatedField(field) && 
      (!field.expressionText || field.expressionText.trim() === '')
    );

    if (calculatedFieldsWithoutExpression.length === 0) {
      return; // All calculated fields have expressionText
    }

    console.log(`[FormView] Loading expressionText for ${calculatedFieldsWithoutExpression.length} calculated fields`);

    // Check if user is authenticated (has token)
    const token = this.storageService.getToken();
    if (!token) {
      console.log(`[FormView] No authentication token found. Skipping expressionText load (API requires auth). Will use fallback calculation.`);
      return; // Skip loading if not authenticated - API requires auth
    }

    // Load expressionText for each calculated field
    const loadPromises = calculatedFieldsWithoutExpression.map(async (field) => {
      if (!field.id) return;
      
      try {
        const loadedField = await this.fieldsService.getFieldById(field.id).toPromise();
        if (loadedField && loadedField.expressionText) {
          // Update the field in tabs
          this.tabs.forEach(tab => {
            const tabField = tab.fields?.find(f => f.id === field.id);
            if (tabField) {
              tabField.expressionText = loadedField.expressionText;
              tabField.calculationMode = loadedField.calculationMode || tabField.calculationMode;
              tabField.recalculateOn = loadedField.recalculateOn || tabField.recalculateOn;
              tabField.resultType = loadedField.resultType || tabField.resultType;
              console.log(`[FormView] Loaded expressionText for field ${field.fieldCode}: ${loadedField.expressionText}`);
            }
          });
        }
      } catch (error: any) {
        // Handle 401 (Unauthorized) gracefully - API requires authentication
        if (error?.status === 401) {
          console.log(`[FormView] Cannot load expressionText for field ${field.fieldCode}: API requires authentication (401). Will use fallback calculation.`);
        } else {
          console.warn(`[FormView] Failed to load expressionText for field ${field.fieldCode}:`, error);
        }
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Calculate calculated fields on form load
   */
  private async calculateFieldsOnLoad(): Promise<void> {
    // Get all fields from all tabs
    const allFields: FormFieldDto[] = [];
    this.tabs.forEach(tab => {
      if (tab.fields && tab.fields.length > 0) {
        allFields.push(...tab.fields);
      }
    });

    // Find all calculated fields - Check both calculationEngine.isCalculatedField AND fieldTypesMap for type name
    const calculatedFields = allFields.filter(field => {
      // First check using calculationEngine
      if (this.calculationEngine.isCalculatedField(field)) {
        return true;
      }
      
      // Fallback: Check fieldTypesMap for Calculated type name
      const ft = this.getFieldTypeFromCache(field);
      if (ft && ft.typeName && ft.typeName.toLowerCase() === 'calculated') {
        return true;
      }
      
      return false;
    });

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
      const results = await this.calculationEngine.calculateAllFields(
        allFields,
        this.fieldValues,
        fieldsToCalculate // Pass the calculatedFields we found
      );

      // Update field values with calculated results
      Object.keys(results).forEach(fieldCode => {
        const result = results[fieldCode];
        // Find the field to get its ID
        const field = allFields.find(f => f.fieldCode === fieldCode);
        if (field && field.id) {
          const idKey = String(field.id);
          this.fieldValues[idKey] = result;
          this.fieldValues[fieldCode] = result;
        }
      });

      // Trigger change detection
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[FormView] Error calculating fields on load:', error);
    }
  }

  /**
   * Check if field is required (base + dynamic rules)
   */
  isRequired(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode];
    if (dynamicState && dynamicState.isRequired !== undefined) {
      return dynamicState.isRequired;
    }
    return field.isMandatory === true;
  }

  /**
   * Check if field is visible (base + dynamic rules)
   */
  isFieldVisible(field: FormFieldDto): boolean {
    if (!field.fieldCode) {
      return field.isVisible ?? true;
    }
    
    const dynamicState = this.dynamicFieldStates[field.fieldCode];
    if (dynamicState && dynamicState.isVisible !== undefined) {
      const isVisible = dynamicState.isVisible;
      // Removed NOTES-specific logging
      return isVisible;
    }
    const baseVisible = field.isVisible ?? true;
    // Removed NOTES-specific logging
    return baseVisible;
  }

  /**
   * Check if field is editable (base + dynamic rules)
   */
  isFieldEditable(field: FormFieldDto): boolean {
    // Calculated fields are always read-only
    if (this.calculationEngine.isCalculatedField(field)) {
      return false;
    }

    const dynamicState = this.dynamicFieldStates[field.fieldCode];
    if (dynamicState && dynamicState.isReadOnly !== undefined) {
      return !dynamicState.isReadOnly;
    }
    return field.isEditable !== false;
  }

  getDefaultValue(field: FormFieldDto): string {
    if (!field) return '';

    // Check if field is a file field - these use defaultValueJson for configuration, not for values
    if (this.getFieldType(field) === 'file') {
      return '';
    }

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

    // Fallback: Default value
    return this.getDefaultValue(field);
  }

  getDisplayValue(field: FormFieldDto): string {
    const value = this.getFieldValue(field);
    return value || '';
  }

  getSelectedOptionText(field: FormFieldDto): string {
    const selectedValue = this.getDefaultValue(field);
    const options = this.getFieldOptions(field);
    if (!selectedValue || !options || options.length === 0) {
      return '';
    }

    const selectedOption = options.find(opt =>
      String(opt.optionValue) === String(selectedValue)
    );

    if (!selectedOption) return '';

    // Use multilingual option text
    return this.getOptionText(selectedOption);
  }

  isOptionSelected(field: FormFieldDto, optionValue: any): boolean {
    if (!field || !field.id) return false;
    
    const idKey = String(field.id);
    const optStr = String(optionValue).trim();

    // Get value directly from fieldValues (most up-to-date)
    let selectedValue = this.fieldValues[idKey];
    
    // Fallback to fieldCode if idKey doesn't have value
    if (selectedValue === undefined && field.fieldCode) {
      selectedValue = this.fieldValues[field.fieldCode];
    }
    
    // If still undefined, try getFieldValue
    if (selectedValue === undefined) {
      selectedValue = this.getFieldValue(field);
    }
    
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
      } catch (error) {
        console.error(`[FormView] Error in isOptionSelected (multiple) for field ${field.id}:`, error);
        return false;
      }
    } else {
      // Single selection: direct comparison
      const valStr = String(selectedValue).trim();
      const isSelected = valStr === optStr;
      
      // Debug log (can be removed later)
      if (isSelected) {
        console.log(`[FormView] Radio/Select selected: field ${field.id}, option ${optStr}, value:`, valStr);
      }
      
      return isSelected;
    }
  }

  getSelectedCheckboxValues(field: FormFieldDto): string {
    const value = this.getDefaultValue(field);
    const options = this.getFieldOptions(field);
    if (!value || !options || options.length === 0) {
      return '';
    }

    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const selectedOptions = options
          .filter(opt => parsed.includes(opt.optionValue))
          .map(opt => this.getOptionText(opt));
        return selectedOptions.length > 0 ? selectedOptions.join(', ') : '';
      }
    } catch {
      // If not JSON, treat as single value
      const selectedOption = options.find(opt =>
        String(opt.optionValue) === String(value)
      );
      return selectedOption ? this.getOptionText(selectedOption) : '';
    }

    return '';
  }

  isCheckboxSelected(field: FormFieldDto, optionValue: any): boolean {
    if (!field || !field.id) return false;
    
    const idKey = String(field.id);
    const targetValue = String(optionValue).trim();

    // Get value directly from fieldValues (most up-to-date)
    let value = this.fieldValues[idKey];
    
    // Fallback to fieldCode if idKey doesn't have value
    if (value === undefined && field.fieldCode) {
      value = this.fieldValues[field.fieldCode];
    }
    
    // If still undefined, try getFieldValue
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
        // Looks like a JSON array
        try {
          const parsed = JSON.parse(valueStr);
          selectedArray = Array.isArray(parsed) 
            ? parsed.map(v => String(v).trim()).filter(v => v !== '')
            : [String(parsed).trim()].filter(v => v !== '');
        } catch {
          // Fallback if JSON parse fails
          selectedArray = valueStr ? [valueStr] : [];
        }
      } else if (valueStr.includes(',')) {
        selectedArray = valueStr.split(',').map(s => s.trim()).filter(s => s !== '');
      } else {
        selectedArray = [valueStr];
      }

      const isSelected = selectedArray.includes(targetValue);
      
      // Debug log (can be removed later)
      if (isSelected) {
        console.log(`[FormView] Checkbox selected: field ${field.id}, option ${targetValue}, value:`, valueStr, 'array:', selectedArray);
      }
      
      return isSelected;
    } catch (error) {
      console.error(`[FormView] Error in isCheckboxSelected for field ${field.id}:`, error);
      return false;
    }
  }

  formatDate(dateValue: string): string {
    if (!dateValue) {
      return '';
    }

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return dateValue; // Return as is if invalid date
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateValue;
    }
  }

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

  setActiveTab(index: number): void {
    this.activeTabIndex = index;
  }

  trackByFieldId(index: number, field: FormFieldDto): any {
    return field.id || index;
  }

  trackByOptionValue(index: number, option: any): any {
    return option?.optionValue || option?.value || option?.id || index;
  }

  /**
   * Switch language for the form view
   */
  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
    this.showLanguageDropdown = false;
  }

  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.language-dropdown-wrapper')) {
      this.showLanguageDropdown = false;
    }
  }

  /**
   * Handle file selection (supports single or multiple files)
   */
  async onFileSelected(event: Event, field: FormFieldDto): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !field.id) {
      return;
    }

    const files = Array.from(input.files);
    const fieldType = field.fieldType;
    const allowMultiple = fieldType?.allowMultiple || false;

    // If single file upload, take first file only
    const filesToUpload = allowMultiple ? files : [files[0]];

    // Validate all files
    const invalidFiles: string[] = [];
    for (const file of filesToUpload) {
      // Validate file extension
      if (!this.isFileExtensionAllowed(file, field)) {
        invalidFiles.push(file.name);
        continue;
      }

      // Validate file size
      const maxSize = this.getMaxFileSize(field);
      if (maxSize > 0 && file.size > maxSize) {
        invalidFiles.push(`${file.name} (${this.formatFileSize(file.size)})`);
        continue;
      }
    }

    if (invalidFiles.length > 0) {
      const currentLang = this.translationService.getCurrentLanguage();
      const allowedExts = this.getAllowedExtensions(field);
      const maxSize = this.getMaxFileSize(field);

      let errorMsg = '';
      if (invalidFiles.length === filesToUpload.length) {
        // All files invalid
        if (allowedExts.length > 0) {
          // Match backend error message format
          const allowedTypes = currentLang === 'ar'
            ? 'PDF، الصور (JPG، PNG)، Excel (XLS، XLSX)، Word (DOC، DOCX)'
            : 'PDF, Images (JPG, PNG), Excel (XLS, XLSX), Word (DOC, DOCX)';

          errorMsg = currentLang === 'ar'
            ? `نوع الملف غير مسموح. الأنواع المسموحة: ${allowedTypes}${maxSize > 0 ? `. الحجم الأقصى: ${this.formatFileSize(maxSize)}` : ''}`
            : `File type not allowed. Allowed types: ${allowedTypes}${maxSize > 0 ? `. Max size: ${this.formatFileSize(maxSize)}` : ''}`;
        } else {
          errorMsg = currentLang === 'ar'
            ? `الملفات غير صالحة${maxSize > 0 ? `. الحجم الأقصى: ${this.formatFileSize(maxSize)}` : ''}`
            : `Invalid files${maxSize > 0 ? `. Max size: ${this.formatFileSize(maxSize)}` : ''}`;
        }
      } else {
        errorMsg = currentLang === 'ar'
          ? `بعض الملفات غير صالحة: ${invalidFiles.join(', ')}`
          : `Some files are invalid: ${invalidFiles.join(', ')}`;
      }

      this.fileUploadErrors[field.id] = errorMsg;
      input.value = '';
      return;
    }

    // Clear any previous errors
    this.fileUploadErrors[field.id] = '';

    // Check if submission exists - if yes, upload immediately; if no, save files for later
    if (this.submissionId > 0) {
      // Submission exists - upload files immediately
    if (allowMultiple && filesToUpload.length > 1) {
        await this.uploadMultipleFiles(filesToUpload, field);
    } else {
        await this.uploadFile(filesToUpload[0], field);
      }
    } else {
      // No submission yet - save files locally and upload when form is submitted
      if (!this.pendingFiles[field.id!]) {
        this.pendingFiles[field.id!] = [];
      }
      this.pendingFiles[field.id!].push(...filesToUpload);
      
      // Show files in UI (create temporary attachment objects for preview)
      if (!this.uploadedFiles[field.id!]) {
        this.uploadedFiles[field.id!] = [];
      }
      
      for (const file of filesToUpload) {
        // Create a temporary attachment object for preview (not yet uploaded)
        if (field.id) {
          const tempAttachment: FormSubmissionAttachmentDto = {
            id: Math.floor(Date.now() + Math.random() * 1000000), // Temporary unique ID
            submissionId: 0,
            fieldId: field.id,
            fieldCode: field.fieldCode || '',
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            filePath: '', // Will be set after upload
            uploadedDate: new Date().toISOString()
          };
          this.uploadedFiles[field.id].push(tempAttachment);
          
          // Don't create preview URLs for images in public forms (guest access)
          // Images should not be previewed or displayed
          // if (file.type.startsWith('image/')) {
          //   const reader = new FileReader();
          //   reader.onload = (e: any) => {
          //     if (tempAttachment.id) {
          //       this.filePreviewUrls[tempAttachment.id] = e.target.result;
          //       this.cdr.detectChanges();
          //     }
          //   };
          //   reader.readAsDataURL(file);
          // }
        }
      }
      
      const currentLang = this.translationService.getCurrentLanguage();
      const fileCount = filesToUpload.length;
      console.log(`[FormView] ${fileCount} file(s) saved for later upload. Submission will be created on form submit.`);
    }
  }

  /**
   * Upload file to server
   */
  async uploadFile(file: File, field: FormFieldDto): Promise<void> {
    if (!field.id) {
      console.error('[FormView] Field ID is missing');
      const currentLang = this.translationService.getCurrentLanguage();
      this.fileUploadErrors[field.id!] = currentLang === 'ar'
        ? 'معرف الحقل مفقود'
        : 'Field ID is missing';
      return;
    }

    this.uploadingFiles[field.id] = true;
    this.uploadProgress[field.id] = 0;
    this.fileUploadErrors[field.id] = '';

    // Create submission with Submitted status by default
    let submissionIdToUse = this.submissionId;
    if (submissionIdToUse === 0 && this.form?.id) {
      try {
        const queryParams = this.route.snapshot.queryParams;
        const documentTypeId = queryParams['documentTypeId'] ? +queryParams['documentTypeId'] : 1;
        const projectId = queryParams['projectId'] ? +queryParams['projectId'] : 1;
        const submittedByUserId = queryParams['userId'] || 'public-user';

        // Use createSubmission (same as onSubmit method)
        // Check if user is authenticated (has token) - if yes, use authenticated user ID
        const token = this.storageService.getToken();
        const finalUserId = token ? (this.storageService.getUsername() || submittedByUserId) : submittedByUserId;
        
        let submission: FormSubmissionDto | undefined;
        try {
          const createDto: CreateFormSubmissionDto = {
            formBuilderId: this.form.id,
            documentTypeId: documentTypeId,
            seriesId: 1, // Default series
            submittedByUserId: finalUserId,
            status: 'Submitted'
          };
          
          submission = await new Promise<FormSubmissionDto>((resolve, reject) => {
            this.formSubmissionsService.createSubmission(createDto).subscribe({
              next: (result) => resolve(result),
              error: (err) => reject(err)
            });
          });
        } catch (createError: any) {
          console.error('[FormView] Error creating submission for file upload:', createError);
          this.uploadingFiles[field.id] = false;
          const currentLang = this.translationService.getCurrentLanguage();
          const apiUrl = environment.apiUrl || 'Not configured';
          
          if (createError?.status === 404) {
            this.fileUploadErrors[field.id] = currentLang === 'ar'
              ? `خدمة حفظ النماذج غير متاحة (404).\n\nAPI URL: ${apiUrl}\nEndpoint المطلوب: POST /FormSubmissions\n\nملاحظة: ${token ? 'يوجد token لكن الـ endpoint غير موجود' : 'لا يوجد token - قد يتطلب الـ endpoint authentication'}`
              : `Form submission service is not available (404).\n\nAPI URL: ${apiUrl}\nRequired endpoint: POST /FormSubmissions\n\nNote: ${token ? 'Token exists but endpoint not found' : 'No token - endpoint may require authentication'}`;
          } else if (createError?.status === 401) {
            this.fileUploadErrors[field.id] = currentLang === 'ar'
              ? `غير مصرح لك بإنشاء submission. يرجى تسجيل الدخول أولاً.\n\nError: ${createError?.error?.message || createError?.message || 'Unauthorized'}`
              : `You are not authorized to create submission. Please login first.\n\nError: ${createError?.error?.message || createError?.message || 'Unauthorized'}`;
          } else {
            const errorMsg = createError?.error?.message || createError?.errorMessage || createError?.message || 'Failed to create submission';
            this.fileUploadErrors[field.id] = currentLang === 'ar' 
              ? `فشل إنشاء submission: ${errorMsg}`
              : `Failed to create submission: ${errorMsg}`;
          }
          return;
        }

        if (submission && submission.id) {
          submissionIdToUse = submission.id;
          this.submissionId = submission.id;
        } else {
          this.uploadingFiles[field.id] = false;
          const currentLang = this.translationService.getCurrentLanguage();
          this.fileUploadErrors[field.id] = currentLang === 'ar'
            ? 'فشل إنشاء submission'
            : 'Failed to create submission';
          return;
        }
      } catch (error: any) {
        console.error('[FormView] Error creating submission:', error);
        this.uploadingFiles[field.id] = false;
        const currentLang = this.translationService.getCurrentLanguage();
        const errorMsg = error?.error?.message || error?.message || 'Unknown error';
        this.fileUploadErrors[field.id] = currentLang === 'ar'
          ? `فشل إنشاء submission: ${errorMsg}`
          : `Failed to create submission: ${errorMsg}`;
        return;
      }
    }

    if (submissionIdToUse === 0) {
      this.uploadingFiles[field.id] = false;
      const currentLang = this.translationService.getCurrentLanguage();
      this.fileUploadErrors[field.id] = currentLang === 'ar'
        ? 'معرف النموذج مفقود'
        : 'Form ID is missing';
      return;
    }

    // Simulate progress (since HttpClient doesn't provide upload progress by default)
    // In a real scenario, you might want to use HttpEventType.UploadProgress
    const progressInterval = setInterval(() => {
      if (this.uploadProgress[field.id] < 90) {
        this.uploadProgress[field.id] += 10;
      }
    }, 200);

    this.fileUploadService.uploadFile(
      file,
      submissionIdToUse,
      field.id,
      field.fieldCode || ''
    ).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress[field.id!] = 100;
        setTimeout(() => {
          this.uploadingFiles[field.id!] = false;
          this.uploadProgress[field.id!] = 0;
        }, 500);

        // Update submissionId from response if available
        if (response.data?.submissionId && !this.submissionId) {
          this.submissionId = response.data.submissionId;
        }

        // Add to uploaded files list
        if (!this.uploadedFiles[field.id!]) {
          this.uploadedFiles[field.id!] = [];
        }
        if (response.data) {
          this.uploadedFiles[field.id!].push(response.data);
          // Generate preview URL for images and PDFs
          this.generatePreviewUrl(response.data);
        }

        // Reset file input
        const fileInput = document.getElementById(`file-${field.id}`) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.uploadingFiles[field.id!] = false;
        this.uploadProgress[field.id!] = 0;
        const currentLang = this.translationService.getCurrentLanguage();

        // Extract error message from response if available
        let errorMessage = currentLang === 'ar'
          ? 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
          : 'Failed to upload file. Please try again.';

        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.fileUploadErrors[field.id!] = errorMessage;
        console.error('Error uploading file:', error);
      }
    });
  }

  /**
   * Upload multiple files to server
   */
  async uploadMultipleFiles(files: File[], field: FormFieldDto): Promise<void> {
    if (!field.id) {
      console.error('[FormView] Field ID is missing');
      const currentLang = this.translationService.getCurrentLanguage();
      this.fileUploadErrors[field.id!] = currentLang === 'ar'
        ? 'معرف الحقل مفقود'
        : 'Field ID is missing';
      return;
    }

    this.uploadingFiles[field.id] = true;
    this.uploadProgress[field.id] = 0;
    this.fileUploadErrors[field.id] = '';

    // Create submission with Submitted status by default
    let submissionIdToUse = this.submissionId;
    if (submissionIdToUse === 0 && this.form?.id) {
      try {
        const queryParams = this.route.snapshot.queryParams;
        const documentTypeId = queryParams['documentTypeId'] ? +queryParams['documentTypeId'] : 1;
        const projectId = queryParams['projectId'] ? +queryParams['projectId'] : 1;
        const submittedByUserId = queryParams['userId'] || 'public-user';

        // Use createSubmission (same as onSubmit method)
        // Check if user is authenticated (has token) - if yes, use authenticated user ID
        const token = this.storageService.getToken();
        const finalUserId = token ? (this.storageService.getUsername() || submittedByUserId) : submittedByUserId;
        
        let submission: FormSubmissionDto | undefined;
        try {
          const createDto: CreateFormSubmissionDto = {
            formBuilderId: this.form.id,
            documentTypeId: documentTypeId,
            seriesId: 1, // Default series
            submittedByUserId: finalUserId,
            status: 'Submitted'
          };
          
          submission = await new Promise<FormSubmissionDto>((resolve, reject) => {
            this.formSubmissionsService.createSubmission(createDto).subscribe({
              next: (result) => resolve(result),
              error: (err) => reject(err)
            });
          });
        } catch (createError: any) {
          console.error('[FormView] Error creating submission for file upload:', createError);
          this.uploadingFiles[field.id] = false;
          const currentLang = this.translationService.getCurrentLanguage();
          const apiUrl = environment.apiUrl || 'Not configured';
          
          if (createError?.status === 404) {
            this.fileUploadErrors[field.id] = currentLang === 'ar'
              ? `خدمة حفظ النماذج غير متاحة (404).\n\nAPI URL: ${apiUrl}\nEndpoint المطلوب: POST /FormSubmissions\n\nملاحظة: ${token ? 'يوجد token لكن الـ endpoint غير موجود' : 'لا يوجد token - قد يتطلب الـ endpoint authentication'}`
              : `Form submission service is not available (404).\n\nAPI URL: ${apiUrl}\nRequired endpoint: POST /FormSubmissions\n\nNote: ${token ? 'Token exists but endpoint not found' : 'No token - endpoint may require authentication'}`;
          } else if (createError?.status === 401) {
            this.fileUploadErrors[field.id] = currentLang === 'ar'
              ? `غير مصرح لك بإنشاء submission. يرجى تسجيل الدخول أولاً.\n\nError: ${createError?.error?.message || createError?.message || 'Unauthorized'}`
              : `You are not authorized to create submission. Please login first.\n\nError: ${createError?.error?.message || createError?.message || 'Unauthorized'}`;
          } else {
            const errorMsg = createError?.error?.message || createError?.errorMessage || createError?.message || 'Failed to create submission';
            this.fileUploadErrors[field.id] = currentLang === 'ar' 
              ? `فشل إنشاء submission: ${errorMsg}`
              : `Failed to create submission: ${errorMsg}`;
          }
          return;
        }

        if (submission && submission.id) {
          submissionIdToUse = submission.id;
          this.submissionId = submission.id;
        } else {
          this.uploadingFiles[field.id] = false;
          const currentLang = this.translationService.getCurrentLanguage();
          this.fileUploadErrors[field.id] = currentLang === 'ar'
            ? 'فشل إنشاء submission'
            : 'Failed to create submission';
          return;
        }
      } catch (error: any) {
        console.error('[FormView] Error creating submission:', error);
        this.uploadingFiles[field.id] = false;
        const currentLang = this.translationService.getCurrentLanguage();
        const errorMsg = error?.error?.message || error?.message || 'Unknown error';
        this.fileUploadErrors[field.id] = currentLang === 'ar'
          ? `فشل إنشاء submission: ${errorMsg}`
          : `Failed to create submission: ${errorMsg}`;
        return;
      }
    }

    if (submissionIdToUse === 0) {
      this.uploadingFiles[field.id] = false;
      const currentLang = this.translationService.getCurrentLanguage();
      this.fileUploadErrors[field.id] = currentLang === 'ar'
        ? 'معرف النموذج مفقود'
        : 'Form ID is missing';
      return;
    }

    // Simulate progress for multiple files
    const progressInterval = setInterval(() => {
      if (this.uploadProgress[field.id] < 90) {
        this.uploadProgress[field.id] += 10;
      }
    }, 200);

    this.fileUploadService.uploadMultipleFiles(
      files,
      submissionIdToUse,
      field.id,
      field.fieldCode || ''
    ).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress[field.id!] = 100;
        setTimeout(() => {
          this.uploadingFiles[field.id!] = false;
          this.uploadProgress[field.id!] = 0;
        }, 500);

        // Update submissionId from response if available
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const firstAttachment = response.data[0];
          if (firstAttachment.submissionId && !this.submissionId) {
            this.submissionId = firstAttachment.submissionId;
          }
        }

        // Add to uploaded files list
        if (!this.uploadedFiles[field.id!]) {
          this.uploadedFiles[field.id!] = [];
        }
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach(attachment => {
            this.uploadedFiles[field.id!].push(attachment);
            // Generate preview URL for images and PDFs
            this.generatePreviewUrl(attachment);
          });
        }

        // Reset file input
        const fileInput = document.getElementById(`file-${field.id}`) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.uploadingFiles[field.id!] = false;
        this.uploadProgress[field.id!] = 0;
        const currentLang = this.translationService.getCurrentLanguage();

        // Extract error message from response if available
        let errorMessage = currentLang === 'ar'
          ? 'فشل رفع الملفات. يرجى المحاولة مرة أخرى.'
          : 'Failed to upload files. Please try again.';

        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.fileUploadErrors[field.id!] = errorMessage;
        console.error('Error uploading files:', error);
      }
    });
  }

  /**
   * Remove uploaded file
   */
  removeFile(fieldId: number, attachmentId: number): void {
    this.fileUploadService.deleteAttachment(attachmentId).subscribe({
      next: () => {
        // Remove from uploaded files list
        if (this.uploadedFiles[fieldId]) {
          this.uploadedFiles[fieldId] = this.uploadedFiles[fieldId].filter(
            file => file.id !== attachmentId
          );
        }
      },
      error: (error) => {
        console.error('Error deleting file:', error);
      }
    });
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get allowed file extensions from field's defaultValueJson
   * If no config is found, returns default allowed extensions (matching backend)
   */
  getAllowedExtensions(field: FormFieldDto): string[] {
    if (!field) {
      return this.DEFAULT_ALLOWED_EXTENSIONS;
    }

    if (!field.defaultValueJson || field.defaultValueJson.trim() === '') {
      return this.DEFAULT_ALLOWED_EXTENSIONS; // Use default extensions matching backend
    }

    try {
      const fileConfig = JSON.parse(field.defaultValueJson);

      // Check for allowedExtensions array
      if (fileConfig.allowedExtensions && Array.isArray(fileConfig.allowedExtensions) && fileConfig.allowedExtensions.length > 0) {
        const extensions = fileConfig.allowedExtensions
          .map((ext: string) => String(ext).toLowerCase().trim())
          .filter((ext: string) => ext.length > 0);
        return extensions;
      }

      // Also check for customExtensions (backward compatibility)
      if (fileConfig.customExtensions && Array.isArray(fileConfig.customExtensions) && fileConfig.customExtensions.length > 0) {
        const extensions = fileConfig.customExtensions
          .map((ext: string) => String(ext).toLowerCase().trim())
          .filter((ext: string) => ext.length > 0);
        return extensions;
      }
    } catch (e) {
      // Not a valid JSON, silently use defaults
    }

    return this.DEFAULT_ALLOWED_EXTENSIONS; // Use default extensions if config is invalid
  }

  /**
   * Get accepted file types string for input accept attribute
   */
  getAcceptedFileTypes(field: FormFieldDto): string {
    const allowedExtensions = this.getAllowedExtensions(field);
    if (allowedExtensions.length === 0) {
      return '*'; // Accept all if no restrictions
    }

    // Map extensions to MIME types and file extensions
    const mimeTypeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    };

    const mimeTypes: string[] = [];
    const extensions: string[] = [];

    allowedExtensions.forEach(ext => {
      const mimeType = mimeTypeMap[ext.toLowerCase()];
      if (mimeType) {
        mimeTypes.push(mimeType);
      }
      extensions.push(`.${ext.toLowerCase()}`);
    });

    return [...mimeTypes, ...extensions].join(',');
  }

  /**
   * Check if file extension is allowed
   */
  isFileExtensionAllowed(file: File, field: FormFieldDto): boolean {
    const allowedExtensions = this.getAllowedExtensions(field);

    // Always validate against allowed extensions (default or configured)
    if (allowedExtensions.length === 0) {
      return false; // No extensions allowed
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) {
      return false; // No extension
    }

    const fileExtension = fileName.substring(lastDot + 1).toLowerCase();
    return allowedExtensions.includes(fileExtension);
  }

  /**
   * Get file upload error message for a field
   */
  getFileUploadError(fieldId: number | undefined): string {
    if (!fieldId) return '';
    return this.fileUploadErrors[fieldId] || '';
  }

  /**
   * Get upload progress percentage for a field
   */
  getUploadProgress(fieldId: number | undefined): number {
    if (!fieldId) return 0;
    return this.uploadProgress[fieldId] || 0;
  }

  /**
   * Format allowed extensions for display
   */
  formatAllowedExtensions(extensions: string[]): string {
    if (extensions.length === 0) return '';
    return extensions.map(ext => `.${ext.toUpperCase()}`).join(', ');
  }

  /**
   * Get max file size from field configuration or environment
   */
  getMaxFileSize(field: FormFieldDto): number {
    // Check if maxValue is set in field (could be used for file size in KB)
    if (field.maxValue && field.maxValue > 0) {
      return field.maxValue * 1024; // Convert KB to bytes
    }

    // Use default from environment
    return environment.media?.maxFileSize || 10485760; // 10MB default
  }

  /**
   * Check if file is an image
   */
  isImageFile(attachment: FormSubmissionAttachmentDto): boolean {
    const contentType = attachment.contentType?.toLowerCase() || '';
    const fileName = attachment.fileName?.toLowerCase() || '';
    return contentType.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
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
    // Images are excluded from preview - only PDFs can be previewed
    return this.isPdfFile(attachment);
  }

  /**
   * Generate preview URL for file
   * Note: Images are excluded from preview in public forms (guest access)
   */
  generatePreviewUrl(attachment: FormSubmissionAttachmentDto): void {
    if (!attachment.id || !this.canPreviewFile(attachment)) {
      return;
    }

    // Don't generate preview URLs for images in public forms
    if (this.isImageFile(attachment)) {
      return;
    }

    // Use download URL as preview URL (only for non-image files like PDFs)
    this.filePreviewUrls[attachment.id] = this.fileUploadService.getDownloadUrl(attachment.id);
  }

  /**
   * Get preview URL for attachment
   * Note: Images return null in public forms (guest access) - no preview allowed
   */
  getPreviewUrl(attachment: FormSubmissionAttachmentDto): string | null {
    if (!attachment.id) return null;
    
    // Don't return preview URLs for images in public forms
    if (this.isImageFile(attachment)) {
      return null;
    }
    
    return this.filePreviewUrls[attachment.id] || this.fileUploadService.getDownloadUrl(attachment.id);
  }

  /**
   * Open file preview modal
   */
  openPreview(attachment: FormSubmissionAttachmentDto): void {
    if (this.canPreviewFile(attachment)) {
      this.previewFile = attachment;
      this.showPreviewModal = true;
    }
  }

  /**
   * Close preview modal
   */
  closePreview(): void {
    this.showPreviewModal = false;
    this.previewFile = null;
  }

  /**
   * Get file type icon class
   */
  getFileIcon(attachment: FormSubmissionAttachmentDto): string {
    if (this.isImageFile(attachment)) {
      return 'pi-image';
    } else if (this.isPdfFile(attachment)) {
      return 'pi-file-pdf';
    } else if (attachment.contentType?.includes('word') || /\.(doc|docx)$/i.test(attachment.fileName || '')) {
      return 'pi-file-word';
    } else if (attachment.contentType?.includes('excel') || attachment.contentType?.includes('spreadsheet') || /\.(xls|xlsx)$/i.test(attachment.fileName || '')) {
      return 'pi-file-excel';
    } else {
      return 'pi-file';
    }
  }

  /**
   * Load uploaded files for a field
   * Note: This method requires a valid submissionId to work properly
   * This method should only be called after a file has been uploaded (when submissionId is available)
   * IMPORTANT: This method will NOT make any HTTP request if submissionId is 0 or invalid
   */
  loadFieldFiles(fieldId: number): void {
    if (!fieldId) return;

    // CRITICAL: Only try to load files if we have a valid submissionId
    // If submissionId is 0, null, undefined, or invalid, skip loading completely (no HTTP request)
    // This prevents 404 errors when the form is first loaded
    const hasValidSubmissionId = this.submissionId &&
      this.submissionId !== 0 &&
      this.submissionId !== null &&
      this.submissionId !== undefined &&
      !isNaN(this.submissionId) &&
      Number(this.submissionId) > 0;

    // DEBUG: Uncomment to see why loadFieldFiles is being called
    // console.log('[FormView] loadFieldFiles called', {
    //   fieldId,
    //   submissionId: this.submissionId,
    //   hasValidSubmissionId,
    //   type: typeof this.submissionId
    // });

    if (!hasValidSubmissionId) {
      // Silently skip - this is expected behavior when no files have been uploaded yet
      // Initialize empty array to prevent UI issues
      if (!this.uploadedFiles[fieldId]) {
        this.uploadedFiles[fieldId] = [];
      }
      return; // Exit early - NO HTTP REQUEST will be made
    }

    // Only make HTTP request if we have a valid submissionId
    // Pass submissionId to service to prevent HTTP request if it's 0 or invalid
    // The service will also check submissionId before making HTTP request
    // Use catchError to handle errors gracefully without breaking the UI
    this.fileUploadService.getFieldAttachments(fieldId, this.submissionId).pipe(
      catchError((error) => {
        // Silently handle all errors - don't log to console to avoid cluttering
        // 404 is normal when no files have been uploaded yet for this field
        // Other errors are also handled gracefully
        this.uploadedFiles[fieldId] = [];
        return of({ statusCode: 200, message: 'No files found', data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          this.uploadedFiles[fieldId] = response.data;
          // Generate preview URLs for all loaded files
          response.data.forEach(attachment => {
            this.generatePreviewUrl(attachment);
          });
          // Only log success, not errors
          // console.log('[FormView] Loaded', response.data.length, 'files for field:', fieldId);
        } else {
          // No files found, initialize empty array
          if (!this.uploadedFiles[fieldId]) {
            this.uploadedFiles[fieldId] = [];
          }
        }
      }
    });
  }

  /**
   * Load all uploaded files for file fields in the form
   * Note: This method should only be called after a file has been uploaded (when submissionId is available)
   * It should NOT be called on initial form load to prevent 404 errors
   */
  loadAllFieldFiles(): void {
    if (!this.tabs || this.tabs.length === 0) return;

    // CRITICAL: Only load files if we have a valid submissionId
    // Check for valid submissionId (not 0, null, undefined, or NaN)
    const hasValidSubmissionId = this.submissionId &&
      this.submissionId !== 0 &&
      this.submissionId !== null &&
      this.submissionId !== undefined &&
      !isNaN(this.submissionId);

    if (!hasValidSubmissionId) {
      // Silently skip - this is expected behavior when no files have been uploaded yet
      return;
    }

    this.tabs.forEach(tab => {
      if (tab.fields && tab.fields.length > 0) {
        tab.fields.forEach(field => {
          // Only load files for file type fields
          if (this.getFieldType(field) === 'file' && field.id) {
            // Initialize empty array if not exists
            if (!this.uploadedFiles[field.id]) {
              this.uploadedFiles[field.id] = [];
            }
            // loadFieldFiles will check submissionId again, but we check here too for safety
            this.loadFieldFiles(field.id);
          }
        });
      }
    });
  }

  /**
   * Create a lightweight draft submission on initial form load so file fields
   * can be attached/previewed without requiring the user to submit first.
   * This is a best-effort helper and will not block the UI on failure.
   */
  private createSubmissionOnLoad(): void {
    if (this.submissionId && this.submissionId > 0) return;
    if (!this.form || !this.form.id) return;

    const queryParams = this.route.snapshot.queryParams;
    const documentTypeId = queryParams['documentTypeId'] ? +queryParams['documentTypeId'] : 1;
    const token = this.storageService.getToken();
    const submittedByUserId = token ? (this.storageService.getUsername() || 'public-user') : 'public-user';

    const createDto: CreateFormSubmissionDto = {
      formBuilderId: this.form.id,
      documentTypeId: documentTypeId,
      seriesId: 1,
      submittedByUserId: submittedByUserId,
      status: 'Draft'
    };

    this.formSubmissionsService.createSubmission(createDto).subscribe({
      next: (submission) => {
        if (submission && submission.id) {
          this.submissionId = submission.id;
          // Now it's safe to load any existing files (if any)
          this.loadAllFieldFiles();
          console.log('[FormView] Draft submission created on load:', submission.id);
        }
      },
      error: (err) => {
        // Fail silently - creating a draft on public forms may require auth or backend support
        console.warn('[FormView] Could not create draft submission on load (will continue without it):', err?.message || err);
      }
    });
  }

  // ===== Multilingual Content Helpers =====

  /**
   * Get form name based on current language
   * Priority: Foreign fields > Default fields
   */
  getFormName(form: FormBuilderDto | null): string {
    if (!form) return '';
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar') {
      if (form.foreignFormName && form.foreignFormName.trim()) {
        return form.foreignFormName;
      }
    }

    return form.formName || '';
  }

  /**
   * Get form description based on current language
   */
  getFormDescription(form: FormBuilderDto | null): string {
    if (!form) return '';
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar') {
      if (form.foreignDescription && form.foreignDescription.trim()) {
        return form.foreignDescription;
      }
    }

    return form.description || '';
  }

  /**
   * Get tab name based on current language
   * Priority: Computed properties (name_ar/name_en) > Foreign fields > Default fields
   */
  getTabName(tab: FormTabDto): string {
    if (!tab) return '';
    const lang = this.translationService.getCurrentLanguage();

    // Debug log
    if (lang === 'ar') {
      // Try computed property first (from API)
      if (tab.name_ar && tab.name_ar.trim()) {
        return tab.name_ar;
      }
      // Try foreign field
      if (tab.foreignTabName && tab.foreignTabName.trim()) {
        return tab.foreignTabName;
      }
      // Fallback to English
      return tab.tabName || '';
    } else {
      // English: Try computed property first
      if (tab.name_en && tab.name_en.trim()) {
        return tab.name_en;
      }
      // Fallback to default
      return tab.tabName || '';
    }
  }

  /**
   * Get field label based on current language
   * Priority: Computed properties (label_ar/label_en) > Foreign fields > Default fields
   */
  getFieldLabel(field: FormFieldDto): string {
    if (!field) return '';
    const lang = this.translationService.getCurrentLanguage();

    // Use computed properties if available (from API)
    if (lang === 'ar') {
      // Try computed property first
      if (field.label_ar && field.label_ar.trim()) {
        return field.label_ar;
      }
      // Try foreign field
      if (field.foreignFieldName && field.foreignFieldName.trim()) {
        return field.foreignFieldName;
      }
      // Fallback to English
      return field.fieldName || '';
    } else {
      // English: Try computed property first
      if (field.label_en && field.label_en.trim()) {
        return field.label_en;
      }
      // Fallback to default
      return field.fieldName || '';
    }
  }

  /**
   * Get field placeholder based on current language
   * Priority: Computed properties (placeholder_ar/placeholder_en) > Foreign fields > Default fields
   */
  /**
   * Get label 'for' attribute value for accessibility
   * Returns null for calculated, grid, radio, and checkbox fields (they use aria-labelledby or internal labels)
   */
  getLabelForAttribute(field: FormFieldDto): string | null {
    const fieldType = this.getFieldType(field);
    
    // Calculated and grid fields use aria-labelledby, not 'for' attribute
    if (fieldType === 'calculated' || fieldType === 'grid') {
      return null;
    }
    
    // Radio and checkbox fields have internal labels for each option, not a single input
    // So the outer label shouldn't have 'for' attribute
    if (fieldType === 'radio' || fieldType === 'checkbox') {
      return null;
    }
    
    // File fields use different ID format
    if (fieldType === 'file') {
      return `file-${field.id}`;
    }
    
    // All other fields use standard ID format
    return `field_${field.id}`;
  }

  getFieldPlaceholder(field: FormFieldDto): string {
    if (!field) {
      return this.translationService.getCurrentLanguage() === 'ar' ? 'أدخل إجابتك' : 'Your answer';
    }

    const lang = this.translationService.getCurrentLanguage();
    const defaultPlaceholder = lang === 'ar' ? 'أدخل إجابتك' : 'Your answer';

    // Use computed properties if available (from API)
    if (lang === 'ar') {
      if (field.placeholder_ar && field.placeholder_ar.trim()) return field.placeholder_ar;
      if (field.foreignPlaceholder && field.foreignPlaceholder.trim()) return field.foreignPlaceholder;
    } else {
      if (field.placeholder_en && field.placeholder_en.trim()) return field.placeholder_en;
      if (field.placeholder && field.placeholder.trim()) return field.placeholder;
    }

    return defaultPlaceholder;
  }

  /**
   * Get field hint text based on current language
   */
  getFieldHintText(field: FormFieldDto): string {
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar' && field.foreignHintText) {
      return field.foreignHintText;
    }

    return field.hintText || '';
  }

  /**
   * Get field validation message based on current language
   */
  getFieldValidationMessage(field: FormFieldDto): string {
    // Return validation error if exists (from real-time validation)
    if (field.fieldCode && this.fieldValidationErrors[field.fieldCode]) {
      return this.fieldValidationErrors[field.fieldCode];
    }
    
    // Return field's validation message if exists (from field configuration)
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && field.foreignValidationMessage) {
      return field.foreignValidationMessage;
    }

    return field.validationMessage || '';
  }

  /**
   * Get option text based on current language
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
        } catch (e) {
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
   * Get field type name based on current language
   */
  getFieldTypeName(field: FormFieldDto): string {
    if (!field.fieldType) return '';
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar') {
      if (field.fieldType.type_name_ar) return field.fieldType.type_name_ar;
      if (field.fieldType.foreignTypeName) return field.fieldType.foreignTypeName;
    } else {
      if (field.fieldType.type_name_en) return field.fieldType.type_name_en;
    }

    return field.fieldType.typeName || '';
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    if (!this.form || !this.form.id) {
      const errorMessage = this.translationService.getCurrentLanguage() === 'ar'
        ? 'النموذج غير موجود'
        : 'Form not found';
      alert(errorMessage);
      return;
    }

    // Validate form before submission
    const validation = await this.validateFormBeforeSubmit();
    
    if (!validation.valid) {
      // Show validation errors
      const errorMessage = validation.errors.join('\n');
      alert(errorMessage);
      return;
    }

    this.isSubmitting = true;

    try {
      // Get documentTypeId from query params, or load it from form
      const routeQueryParams = this.route.snapshot.queryParams;
      let documentTypeId: number | null = routeQueryParams['documentTypeId'] ? +routeQueryParams['documentTypeId'] : null;
      
      // If documentTypeId not in query params, try to get it from form
      if (!documentTypeId && this.form && this.form.id) {
        try {
          const documentType = await this.documentTypesService.getDocumentTypeByFormId(this.form.id).toPromise();
          if (documentType && documentType.id) {
            documentTypeId = documentType.id;
          }
        } catch (docTypeError: any) {
          // Silently handle - may require auth
        }
      }
      
      // Final fallback: use default 1 (but this may fail if document type doesn't exist)
      if (!documentTypeId || documentTypeId <= 0) {
        const fallbackId = routeQueryParams['documentTypeId'] ? +routeQueryParams['documentTypeId'] : null;
        if (fallbackId && fallbackId > 0) {
          documentTypeId = fallbackId;
        } else {
          // Don't use default 1 if it's not explicitly provided - it may not exist
          const currentLang = this.translationService.getCurrentLanguage();
          const errorMsg = currentLang === 'ar'
            ? 'خطأ: لا يمكن إرسال النموذج بدون تحديد نوع المستند (documentTypeId). يرجى التأكد من أن النموذج مرتبط بنوع مستند صحيح.'
            : 'Error: Cannot submit form without document type (documentTypeId). Please ensure the form is linked to a valid document type.';
          alert(errorMsg);
          this.isSubmitting = false;
          return;
        }
      }
      
      const seriesId = routeQueryParams['seriesId'] ? +routeQueryParams['seriesId'] : 1; // Default to 1 if not provided
      const projectId = routeQueryParams['projectId'] ? +routeQueryParams['projectId'] : 1; // Default to 1 if not provided
      const submittedByUserId = routeQueryParams['userId'] || 'public-user'; // Default user ID

      let currentSubmissionId = this.submissionId;

      // Step 1: Load document series first (same as FormSubmissionCreateComponent)
      let actualSeriesId: number | null = null;
      if (currentSubmissionId === 0) {
        try {
          // Load document series from API
          const documentSeries = await this.documentTypesService.getDocumentSeriesByDocumentTypeId(documentTypeId).toPromise();
          
          if (documentSeries && documentSeries.length > 0) {
            // Filter series by Project ID first to ensure backend validation passes
            const projectSeries = documentSeries.filter((s: DocumentSeries) => s.projectId === projectId);

            // Use project-specific series if available, otherwise fallback to all info
            const availableSeries = projectSeries.length > 0 ? projectSeries : documentSeries;

            // First priority: Use active series
            const activeSeries = availableSeries.filter((s: DocumentSeries) => s.isActive);
            
            if (activeSeries.length > 0) {
              // Use default series or first available active series
              const defaultSeries = activeSeries.find((s: DocumentSeries) => s.isDefault) || activeSeries[0];
              if (defaultSeries && defaultSeries.id) {
                actualSeriesId = defaultSeries.id;
              }
            } else {
              // Second priority: Use any series (even if inactive) - better than default 1
              // Prefer one from the same project
              const bestMatch = availableSeries.find((s: DocumentSeries) => s.id) || availableSeries[0];
              if (bestMatch && bestMatch.id) {
                actualSeriesId = bestMatch.id;
              }
            }
          } else {
            // API returned empty array - use fallback series ID
            // Backend will validate if the series exists
            actualSeriesId = seriesId && seriesId > 0 ? seriesId : 1;
          }
        } catch (seriesError: any) {
          // If API call failed, try to verify seriesId: 1 exists by calling getDocumentSeriesById
          // This is a workaround if the list endpoint requires auth but the get by ID doesn't
          if (!actualSeriesId || actualSeriesId === 0) {
            const fallbackSeriesId = seriesId && seriesId > 0 ? seriesId : 1;
            
            try {
              // Try to get the series by ID to verify it exists
              const verifiedSeries = await this.documentTypesService.getDocumentSeriesById(fallbackSeriesId).toPromise();
              if (verifiedSeries && verifiedSeries.id) {
                // Verify it matches our documentTypeId and projectId
                if (verifiedSeries.documentTypeId === documentTypeId) {
                  actualSeriesId = verifiedSeries.id;
                } else {
                  actualSeriesId = fallbackSeriesId; // Use it anyway, backend will validate
                }
              } else {
                actualSeriesId = fallbackSeriesId;
              }
            } catch (verifyError: any) {
              // If verification also fails, use the fallback
              actualSeriesId = fallbackSeriesId;
            }
          }
        }
      } else {
        // If submission already exists, use existing seriesId from query params or default to 1
        actualSeriesId = seriesId && seriesId > 0 ? seriesId : 1;
      }
      
      // Ensure we have a valid seriesId (use default 1 if still invalid)
      if (!actualSeriesId || actualSeriesId <= 0) {
        actualSeriesId = 1; // Default series ID
      }
      
      // Validate that we have a seriesId before proceeding
      // Note: We'll let the backend validate if the seriesId actually exists
      // If it doesn't exist, the backend will return a 400 error which we'll handle

      // Step 2: Create submission (same as FormSubmissionCreateComponent)
      let submission: FormSubmissionDto | undefined;
      if (currentSubmissionId === 0) {
        // Check if user is authenticated (has token) - if yes, use authenticated user ID
        const token = this.storageService.getToken();
        const finalUserId = token ? (this.storageService.getUsername() || submittedByUserId) : submittedByUserId;
        
        // Use createSubmission (same as FormSubmissionCreateComponent)
        // Note: This endpoint may require authentication
        let createDto: CreateFormSubmissionDto | null = null;
        try {
          if (!this.form || !this.form.id) {
            throw new Error('Form or form.id is missing');
          }
          
          createDto = {
            formBuilderId: this.form.id,
            documentTypeId: documentTypeId,
            seriesId: actualSeriesId,
            submittedByUserId: finalUserId,
            status: 'Submitted'
          };
          
          console.log('[FormView] Creating submission with full DTO:', createDto);
          console.log('[FormView] Creating submission details:', {
            formBuilderId: createDto.formBuilderId,
            documentTypeId: createDto.documentTypeId,
            seriesId: createDto.seriesId,
            submittedByUserId: createDto.submittedByUserId,
            status: createDto.status,
            projectId: projectId,
            hasToken: !!token
          });
          
          if (!createDto) {
            throw new Error('createDto is null - cannot create submission');
          }
          
          submission = await new Promise<FormSubmissionDto>((resolve, reject) => {
            this.formSubmissionsService.createSubmission(createDto!).subscribe({
              next: (result) => resolve(result),
              error: (err) => reject(err)
            });
          });
          
          if (submission && submission.id) {
            currentSubmissionId = submission.id;
            this.submissionId = submission.id;
            console.log('[FormView] ✅ Submission created successfully:', submission.id);
          } else {
            throw new Error('Failed to create submission - no ID returned');
          }
        } catch (createError: any) {
          console.error('[FormView] Error creating submission:', createError);
          const currentLang = this.translationService.getCurrentLanguage();
          const apiUrl = environment.apiUrl || 'Not configured';
          
          if (createError?.status === 404) {
            const errorMsg = currentLang === 'ar'
              ? `خدمة حفظ النماذج غير متاحة (404).\n\nAPI URL: ${apiUrl}\nEndpoint المطلوب: POST /FormSubmissions\n\nملاحظة: ${token ? 'يوجد token لكن الـ endpoint غير موجود. قد يكون الـ endpoint غير متوفر في الـ backend أو يحتاج إلى تكوين.' : 'لا يوجد token - قد يتطلب الـ endpoint authentication. يرجى تسجيل الدخول أولاً.'}\n\nالحل: تأكد من أن الـ endpoint متوفر في الـ backend أو استخدم طريقة أخرى لحفظ البيانات.`
              : `Form submission service is not available (404).\n\nAPI URL: ${apiUrl}\nRequired endpoint: POST /FormSubmissions\n\nNote: ${token ? 'Token exists but endpoint not found. The endpoint may not be available in the backend or needs configuration.' : 'No token - endpoint may require authentication. Please login first.'}\n\nSolution: Ensure the endpoint is available in the backend or use an alternative method to save data.`;
            alert(errorMsg);
          } else if (createError?.status === 401) {
            const errorMsg = currentLang === 'ar'
              ? `غير مصرح لك بإنشاء submission. يرجى تسجيل الدخول أولاً.\n\nError: ${createError?.error?.message || createError?.message || 'Unauthorized'}\n\nالحل: قم بتسجيل الدخول ثم حاول مرة أخرى.`
              : `You are not authorized to create submission. Please login first.\n\nError: ${createError?.error?.message || createError?.message || 'Unauthorized'}\n\nSolution: Please login and try again.`;
            alert(errorMsg);
          } else if (createError?.status === 400) {
            const errorDetails = createError?.error?.message || createError?.error?.detail || createError?.error?.title || createError?.message || 'Bad Request';
            console.error('[FormView] 400 Error details:', {
              error: createError?.error,
              errorString: JSON.stringify(createError?.error),
              message: createError?.error?.message,
              detail: createError?.error?.detail,
              title: createError?.error?.title,
              status: createError?.status,
              statusText: createError?.statusText,
              url: createError?.url,
              seriesId: actualSeriesId,
              documentTypeId: documentTypeId,
              projectId: projectId,
              createDto: createDto || {
                formBuilderId: this.form?.id || 0,
                documentTypeId: documentTypeId,
                seriesId: actualSeriesId,
                submittedByUserId: finalUserId,
                status: 'Submitted'
              }
            });
            
            // Check if error is related to seriesId not existing
            const errorMessage = errorDetails.toLowerCase();
            const isSeriesError = errorMessage.includes('series') || 
                                 errorMessage.includes('foreign key') ||
                                 errorMessage.includes('entity changes') ||
                                 errorMessage.includes('constraint') ||
                                 errorMessage.includes('document series');
            
            let errorMsg: string;
            if (isSeriesError) {
              // The series might exist in DB but backend validation failed
              // This could be due to:
              // 1. Series exists but doesn't match documentTypeId/projectId combination
              // 2. Series is inactive
              // 3. Backend validation issue
              errorMsg = currentLang === 'ar'
                ? `خطأ في التحقق من سلسلة الوثائق (seriesId: ${actualSeriesId}).\n\nالتفاصيل: ${errorDetails}\n\nملاحظة: السلسلة قد تكون موجودة في قاعدة البيانات ولكن لا تطابق نوع المستند (documentTypeId: ${documentTypeId}) أو المشروع (projectId: ${projectId}).\n\nالحل: تأكد من أن السلسلة موجودة ومطابقة لنوع المستند والمشروع المحددين.`
                : `Error validating document series (seriesId: ${actualSeriesId}).\n\nDetails: ${errorDetails}\n\nNote: The series may exist in the database but doesn't match the document type (documentTypeId: ${documentTypeId}) or project (projectId: ${projectId}).\n\nSolution: Ensure the series exists and matches the specified document type and project.`;
            } else {
              errorMsg = currentLang === 'ar'
                ? `خطأ في البيانات المرسلة (400).\n\nالتفاصيل: ${errorDetails}\n\nالحل: تأكد من أن جميع البيانات المطلوبة صحيحة ومكتملة.`
                : `Bad Request (400).\n\nDetails: ${errorDetails}\n\nSolution: Ensure all required data is correct and complete.`;
            }
            alert(errorMsg);
          } else {
            const errorMsg = createError?.error?.message || createError?.errorMessage || createError?.message || 'Failed to create submission';
            alert(currentLang === 'ar' 
              ? `فشل إنشاء submission: ${errorMsg}\n\nالحل: تحقق من اتصال الإنترنت أو اتصل بالدعم الفني.`
              : `Failed to create submission: ${errorMsg}\n\nSolution: Check your internet connection or contact technical support.`);
          }
          
          this.isSubmitting = false;
          return;
        }
        
        // Final check - if still no submission, fail
        if (!submission || !submission.id) {
          const currentLang = this.translationService.getCurrentLanguage();
          alert(currentLang === 'ar'
            ? 'فشل إنشاء submission - لا يمكن المتابعة'
            : 'Failed to create submission - cannot continue');
          this.isSubmitting = false;
          return;
        }
      }

      // Ensure currentSubmissionId is set correctly
      if (currentSubmissionId === 0 && submission && submission.id) {
        currentSubmissionId = submission.id;
        this.submissionId = submission.id;
        console.log('[FormView] Updated currentSubmissionId from submission:', currentSubmissionId);
      }

      console.log('[FormView] ===== After submission creation =====');
      console.log('[FormView] Final currentSubmissionId:', currentSubmissionId);
      console.log('[FormView] this.submissionId:', this.submissionId);
      console.log('[FormView] submission?.id:', submission?.id);

      // Step 2: Prepare field values (same as FormSubmissionCreateComponent)
      const fieldValues: CreateFormSubmissionValueDto[] = [];
      
      if (this.tabs && this.tabs.length > 0) {
        this.tabs.forEach(tab => {
          if (tab.fields && tab.fields.length > 0) {
            tab.fields.forEach(field => {
              if (!field.id || !field.fieldCode) return;
              
              // Skip hidden fields
              if (!this.isFieldVisible(field)) return;

              const fieldValue = this.getFieldValue(field);
              
              // Check if field has a value
              const hasValue = fieldValue !== null && 
                              fieldValue !== undefined && 
                              fieldValue !== '' &&
                              !(Array.isArray(fieldValue) && fieldValue.length === 0);

              if (hasValue) {
                const valueDto: CreateFormSubmissionValueDto = {
                  submissionId: currentSubmissionId,
                  fieldId: field.id,
                  fieldCode: field.fieldCode
                };

                const fieldType = this.getFieldType(field);
                
                switch (fieldType) {
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
                  case 'switch':
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

                // Ensure valueJson is always set
                if (!valueDto.valueJson) {
                  valueDto.valueJson = valueDto.valueString ? JSON.stringify(valueDto.valueString) : JSON.stringify(null);
                }
                if (valueDto.valueJson && !valueDto.valueString) {
                  try {
                    const parsed = JSON.parse(valueDto.valueJson);
                    valueDto.valueString = typeof parsed === 'string' ? parsed : String(parsed);
                  } catch {
                    valueDto.valueString = valueDto.valueJson;
                  }
                }

                fieldValues.push(valueDto);
              }
            });
          }
        });
      }

      // Step 3: Save all grid data
      await this.saveAllGridsData().toPromise();

      // Step 4: Save field values in bulk (same as FormSubmissionCreateComponent)
      const saveObservables: Observable<any>[] = [];
      
      console.log('[FormView] ===== Preparing to save field values =====');
      console.log('[FormView] Current submission ID:', currentSubmissionId);
      console.log('[FormView] Field values count:', fieldValues.length);
      console.log('[FormView] Field values DTOs:', JSON.stringify(fieldValues, null, 2));
      
      if (fieldValues.length > 0) {
        const bulkDto: BulkFormSubmissionValuesDto = {
          submissionId: currentSubmissionId,
          values: fieldValues
        };
        
        console.log('[FormView] Bulk DTO before sending:', JSON.stringify(bulkDto, null, 2));
        console.log('[FormView] Bulk DTO values count:', bulkDto.values.length);
        
        saveObservables.push(this.formSubmissionValuesService.createBulk(bulkDto));
      } else {
        console.warn('[FormView] ⚠️ No field values to save!');
      }

      // Step 5: Wait for all saves to complete
      if (saveObservables.length > 0) {
        await forkJoin(saveObservables).toPromise();
      }

      // Step 6: Redirect to success page
      const queryParams: any = {
        submissionId: currentSubmissionId
      };
      
      // Add formCode if available
      if (this.form && this.form.formCode) {
        queryParams.formCode = this.form.formCode;
      }
      
      // Add documentTypeId if available
      if (documentTypeId) {
        queryParams.documentTypeId = documentTypeId;
      }
      
      // Navigate to success page
      this.router.navigate(['/forms/submission/success'], { queryParams });
    } catch (error) {
      console.error('[FormView] Error submitting form:', error);
      const errorMessage = this.translationService.getCurrentLanguage() === 'ar'
        ? 'حدث خطأ أثناء إرسال النموذج. يرجى المحاولة مرة أخرى.'
        : 'An error occurred while submitting the form. Please try again.';
      alert(errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    const confirmMessage = this.translationService.getCurrentLanguage() === 'ar'
      ? 'هل أنت متأكد من إلغاء النموذج؟ سيتم فقدان جميع البيانات المدخلة.'
      : 'Are you sure you want to cancel? All entered data will be lost.';
    
    if (confirm(confirmMessage)) {
      // Reset form or navigate away
      window.location.reload();
    }
  }

  /**
   * Load submission data if submissionId is available
   */
  private loadSubmissionData(): void {
    if (!this.submissionId || this.submissionId <= 0) {
      return;
    }

    this.formSubmissionsService.getSubmissionById(this.submissionId).subscribe({
      next: (submission: FormSubmissionDetailDto) => {
        this.currentSubmission = submission;
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Silently handle - submission may not exist or may require auth
      }
    });
  }

  /**
   * Check if submission can be approved/rejected
   */
  canApproveReject(): boolean {
    return this.currentSubmission !== null && 
           this.currentSubmission.status === 'Submitted' &&
           this.submissionId > 0;
  }

  /**
   * Approve submission
   */
  approveSubmission(): void {
    if (!this.currentSubmission || !this.submissionId) {
      return;
    }

    this.isApproving = true;
    
    // Get current user ID
    const currentUserId = this.storageService.getUsername() || 'public-user';
    
    // Note: stageId is required - using 1 as default (adjust based on your workflow)
    const approveDto: ApproveSubmissionDto = {
      submissionId: this.submissionId,
      stageId: 1, // TODO: Get actual stageId from submission or workflow
      actionByUserId: currentUserId,
      comments: this.approveRejectComments || null
    };

    this.formSubmissionsService.approveSubmissionDto(approveDto).subscribe({
      next: (response: ApiResponse<FormSubmissionDto>) => {
        this.isApproving = false;
        this.showApproveRejectModal = false;
        this.approveRejectComments = '';
        
        if (response.statusCode === 200 || response.success) {
          // Reload submission to update status
          this.loadSubmissionData();
          
          const message = this.translationService.getCurrentLanguage() === 'ar'
            ? 'تمت الموافقة على الطلب بنجاح'
            : 'Submission approved successfully';
          alert(message);
        }
      },
      error: (error) => {
        this.isApproving = false;
        const message = this.translationService.getCurrentLanguage() === 'ar'
          ? 'حدث خطأ أثناء الموافقة على الطلب'
          : 'An error occurred while approving the submission';
        alert(message);
      }
    });
  }

  /**
   * Reject submission
   */
  rejectSubmission(): void {
    if (!this.currentSubmission || !this.submissionId) {
      return;
    }

    this.isRejecting = true;
    
    // Get current user ID
    const currentUserId = this.storageService.getUsername() || 'public-user';
    
    // Note: stageId is required - using 1 as default (adjust based on your workflow)
    const rejectDto: RejectSubmissionDto = {
      submissionId: this.submissionId,
      stageId: 1, // TODO: Get actual stageId from submission or workflow
      actionByUserId: currentUserId,
      comments: this.approveRejectComments || null
    };

    this.formSubmissionsService.rejectSubmissionDto(rejectDto).subscribe({
      next: (response: ApiResponse<FormSubmissionDto>) => {
        this.isRejecting = false;
        this.showApproveRejectModal = false;
        this.approveRejectComments = '';
        
        if (response.statusCode === 200 || response.success) {
          // Reload submission to update status
          this.loadSubmissionData();
          
          const message = this.translationService.getCurrentLanguage() === 'ar'
            ? 'تم رفض الطلب بنجاح'
            : 'Submission rejected successfully';
          alert(message);
        }
      },
      error: (error) => {
        this.isRejecting = false;
        const message = this.translationService.getCurrentLanguage() === 'ar'
          ? 'حدث خطأ أثناء رفض الطلب'
          : 'An error occurred while rejecting the submission';
        alert(message);
      }
    });
  }

  /**
   * Close approve/reject modal
   */
  closeApproveRejectModal(): void {
    this.showApproveRejectModal = false;
    this.approveRejectComments = '';
  }
}


