import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldOptionsService } from '../../FormBuilder/services/field-options.service';
import { GridService } from '../../FormBuilder/services/grid.service';
import { FieldDataSourceService } from '../../FormBuilder/services/field-data-source.service';
import { FormulasService } from '../../FormBuilder/services/formulas.service';
import { FormFieldDto, FieldTypeDto, UpdateFormFieldDto, CreateFormFieldDto, FieldOptionDto, CreateFieldOptionDto, FieldDataSource, CreateFieldDataSourceDto, FieldOptionResponse, PreviewDataSourceRequestDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { FormGridDto } from '../../FormBuilder/form-builder/models/grid-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { DuplicateValidationHelper } from '../../../core/utils/duplicate-validation.helper';
import { environment } from '../../../environments/environment';
import { AttachmentTypesService } from '../../FormBuilder/services/attachment-types.service';
import { CreateAttachmentTypeDto } from '../../FormBuilder/form-builder/models/attachment-types.model';
import { CALCULATION_OPERATIONS, CalculationOperation, getRecommendedCalculationOperation } from '../../FormBuilder/constants/calculation-operations';
import { ValidationService } from '../../angular-validation/services/validation.service';
import { FormSubmissionService } from '../../angular-form-submission/services/form-submission.service';
import { ValidationErrorDisplayComponent } from '../../angular-validation/components/validation-error-display.component';
import { ValidationErrorCollection } from '../../angular-validation/models/validation-error.model';
import { UserQueriesService } from '../../FormBuilder/services/user-queries.service';
import { UserQueryDto, CreateUserQueryDto } from '../../FormBuilder/form-builder/models/user-query-dto.model';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { PermissionService } from '../../../services/permission.service';
import { HasPermissionDirective } from '../../../directives/has-permission.directive';
import {
  SapIntegrationService,
  SapHanaConfigDto,
  SapExecutionMode,
  SapRequestLevel,
  SapServiceLayerEndpointDto,
  SapServiceLayerObjectFieldDto
} from '../../FormBuilder/services/sap-integration.service';
import { FormsService, PagedResult } from '../../FormBuilder/services/forms.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { ApprovalWorkflowService } from '../../FormBuilder/services/approval-workflow.service';
import { ApprovalStageService, ApprovalStageDto } from '../../FormBuilder/services/approval-stage.service';
import { FormBuilderDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ButtonModule,
    RouterLink,
    TableShellComponent,
    HasPermissionDirective,
    TranslatePipe
  ],
  templateUrl: './fields-list.component.html',
  styleUrls: ['./fields-list.component.scss'],
  providers: [ConfirmationService]
})
export class FieldsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  tabId!: number;
  formBuilderId!: number;
  tabName: string = '';

  // Permission flags
  canViewFields = false;
  canCreateFields = false;
  canEditFields = false;
  canDeleteFields = false;
  canManageFields = false;

  // Data Arrays
  fields: FormFieldDto[] = [];
  allFormFields: FormFieldDto[] = []; // All fields from all tabs for expression builder
  private deletedFieldIds: Set<number> = new Set(); // Track deleted field IDs to filter them out
  fieldTypes: FieldTypeDto[] = [];
  filteredFieldTypes: FieldTypeDto[] = [];
  regexOptions = [
    { label: 'No preset (custom)', value: '', message: '' },
    { label: 'Email', value: '^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$', message: 'Please enter a valid email address' },
    { label: 'Phone (digits, +, -, spaces)', value: '^[0-9+\\-()\\s]{6,}$', message: 'Please enter a valid phone number' },
    { label: 'URL', value: '^(https?:\\/\\/)?([\\w-]+\\.)+[\\w-]{2,}(\\/\\S*)?$', message: 'Please enter a valid URL' },
    { label: 'Digits only', value: '^\\d+$', message: 'Please enter digits only' },
    { label: 'Letters only', value: '^[A-Za-z]+$', message: 'Please enter letters only' },
    { label: 'Alphanumeric', value: '^[A-Za-z0-9]+$', message: 'Please enter alphanumeric characters only' }
  ];

  // Loading States
  loading = {
    fields: false,
    save: false,
    delete: false,
    fieldTypes: false
  };

  // Field Modal
  showFieldModal = false;
  showFieldSettingsModal = false;
  editingField: FormFieldDto | null = null;
  draggingFieldIndex: number | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

  // Reactive Form
  fieldForm: FormGroup;

  // Validation System
  validationErrors = new ValidationErrorCollection();

  // Field Type Filter
  searchTerm = '';

  // Selected Field for Context Actions
  selectedField: FormFieldDto | null = null;

  // Grid Selection (for Grid field type)
  availableGrids: FormGridDto[] = [];
  selectedGridId: number | null = null;

  // Calculation Operations (Backend operations - kept for backward compatibility)
  calculationOperations: CalculationOperation[] = CALCULATION_OPERATIONS;
  selectedCalculationOperation: CalculationOperation = getRecommendedCalculationOperation();

  // All Available Math Operations for Expression Builder
  mathOperations = [
    // Basic Arithmetic Operations
    { symbol: '+', name: 'جمع', nameEn: 'Add', description: 'Addition operation', category: 'arithmetic' },
    { symbol: '-', name: 'طرح', nameEn: 'Subtract', description: 'Subtraction operation', category: 'arithmetic' },
    { symbol: '*', name: 'ضرب', nameEn: 'Multiply', description: 'Multiplication operation', category: 'arithmetic' },
    { symbol: '/', name: 'قسمة', nameEn: 'Divide', description: 'Division operation', category: 'arithmetic' },
    { symbol: '%', name: 'باقي القسمة', nameEn: 'Modulo', description: 'Modulo/Remainder operation', category: 'arithmetic' },
    { symbol: '^', name: 'أس', nameEn: 'Power', description: 'Power/Exponentiation operation', category: 'arithmetic' },
    
    // Math Functions
    { symbol: 'MIN', name: 'الحد الأدنى', nameEn: 'Min', description: 'Minimum value function', category: 'function', template: 'MIN(,)' },
    { symbol: 'MAX', name: 'الحد الأقصى', nameEn: 'Max', description: 'Maximum value function', category: 'function', template: 'MAX(,)' },
    { symbol: 'SUM', name: 'المجموع', nameEn: 'Sum', description: 'Sum function', category: 'function', template: 'SUM(,)' },
    { symbol: 'AVG', name: 'المتوسط', nameEn: 'Average', description: 'Average function', category: 'function', template: 'AVG(,)' },
    { symbol: 'ABS', name: 'القيمة المطلقة', nameEn: 'Absolute', description: 'Absolute value function', category: 'function', template: 'ABS()' },
    { symbol: 'ROUND', name: 'تقريب', nameEn: 'Round', description: 'Round function', category: 'function', template: 'ROUND(,)' },
    { symbol: 'CEIL', name: 'تقريب لأعلى', nameEn: 'Ceiling', description: 'Ceiling function', category: 'function', template: 'CEIL()' },
    { symbol: 'FLOOR', name: 'تقريب لأسفل', nameEn: 'Floor', description: 'Floor function', category: 'function', template: 'FLOOR()' },
    { symbol: 'SQRT', name: 'الجذر التربيعي', nameEn: 'Square Root', description: 'Square root function', category: 'function', template: 'SQRT()' },
    { symbol: 'POW', name: 'الأس', nameEn: 'Power', description: 'Power function', category: 'function', template: 'POW(,)' },
    { symbol: 'LOG', name: 'اللوغاريتم', nameEn: 'Logarithm', description: 'Logarithm function', category: 'function', template: 'LOG()' },
    { symbol: 'EXP', name: 'الأس الطبيعي', nameEn: 'Exponential', description: 'Exponential function', category: 'function', template: 'EXP()' }
  ];

  // File Extensions Options
  availableFileExtensions = [
    { value: 'pdf', label: 'PDF', labelAr: 'PDF', mimeType: 'application/pdf' },
    { value: 'doc', label: 'DOC', labelAr: 'DOC', mimeType: 'application/msword' },
    { value: 'docx', label: 'DOCX', labelAr: 'DOCX', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { value: 'xls', label: 'XLS', labelAr: 'XLS', mimeType: 'application/vnd.ms-excel' },
    { value: 'xlsx', label: 'XLSX', labelAr: 'XLSX', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { value: 'jpg', label: 'JPG', labelAr: 'JPG', mimeType: 'image/jpeg' },
    { value: 'jpeg', label: 'JPEG', labelAr: 'JPEG', mimeType: 'image/jpeg' },
    { value: 'png', label: 'PNG', labelAr: 'PNG', mimeType: 'image/png' },
    { value: 'gif', label: 'GIF', labelAr: 'GIF', mimeType: 'image/gif' },
    { value: 'txt', label: 'TXT', labelAr: 'TXT', mimeType: 'text/plain' },
    { value: 'csv', label: 'CSV', labelAr: 'CSV', mimeType: 'text/csv' },
    { value: 'zip', label: 'ZIP', labelAr: 'ZIP', mimeType: 'application/zip' },
    { value: 'rar', label: 'RAR', labelAr: 'RAR', mimeType: 'application/x-rar-compressed' }
  ];
  selectedFileExtensions: string[] = [];
  customFileExtensions: string[] = []; // Custom extensions added by admin
  newCustomExtension: string = ''; // Input for new custom extension
  newCustomExtensionMaxSize: number = 10; // Max size in MB for new custom extension


  // Field DataSource Options
  dataSourceType: 'Static' | 'Api' | 'LookupTable' | 'FormSubmissions' | 'SqlQuery' | 'SapHana' = 'Static';
  dataSourceConfig: Partial<CreateFieldDataSourceDto> = {
    sourceType: 'Static',
    apiUrl: null,
    httpMethod: 'GET',
    requestBodyJson: null,
    valuePath: null,
    textPath: null,
    isDeleted: false
  };
  // LookupTable Configuration (table & database)
  lookupTableConfig: {
    table: string;
    valueColumn: string;
    textColumn: string;
    database: 'FormBuilder' | 'AkhmanageIt';
  } = {
      table: '',
      valueColumn: 'Id',
      textColumn: 'Name',
      database: 'FormBuilder'
    };
  // SQL Query Configuration
  sqlQueryConfig: {
    sqlQuery: string;
    valuePath: string;
    textPath: string;
    database: 'FormBuilder' | 'AkhmanageIt';
  } = {
      sqlQuery: '',
      valuePath: 'Id',
      textPath: 'Name',
      database: 'FormBuilder'
    };
  formSubmissionConfig: {
    formId: number | null;
    formCode: string;
    valueFieldId: number | null;
    textFieldId: number | null;
    valueFieldCode: string;
    textFieldCode: string;
  } = {
      formId: null,
      formCode: '',
      valueFieldId: null,
      textFieldId: null,
      valueFieldCode: '',
      textFieldCode: ''
    };
  formSubmissionDependencyConfig: {
    contextFieldCode: string;
    sourceFieldCode: string;
  } = {
      contextFieldCode: '',
      sourceFieldCode: ''
    };
  availableSourceForms: FormBuilderDto[] = [];
  loadingSourceForms = false;
  availableSourceFormFields: FormFieldDto[] = [];
  loadingSourceFormFields = false;
  private readonly formSubmissionSystemFields: FormFieldDto[] = [
    this.createFormSubmissionSystemField(-1, 'Document Number', 'SYSTEM_DOCUMENT_NUMBER')
  ];
  availableLookupTables: string[] = [];
  availableColumns: string[] = []; // Available columns from selected table
  previewOptions: FieldOptionResponse[] = [];
  selectedPreviewOption: any = null; // Selected option in preview dropdown
  loadingPreview: boolean = false;
  existingDataSource: FieldDataSource | null = null;
  showApiDebugInfo: boolean = false;
  rawApiResponse: any = null;
  apiDebugError: string | null = null;
  availableProperties: string[] = []; // Available properties from API response
  hasSuggestedPaths: boolean = false; // Flag to indicate if suggested paths are available
  private apiPreviewAutoRetryPending = false;

  // Saved SQL Queries
  savedQueries: UserQueryDto[] = [];
  selectedSavedQueryId: number | null = null;
  savingQuery: boolean = false;
  queryNameToSave: string = '';
  showSaveQueryDialog: boolean = false;
  sapIntegrationEnabled: boolean = false;
  sapFieldName: string = '';
  sapRequestLevel: SapRequestLevel = 'Header';
  sapRequestLevelOptions: Array<{ label: string; value: SapRequestLevel }> = [
    { label: 'Header', value: 'Header' },
    { label: 'Line', value: 'Line' }
  ];
  sapConnections: SapHanaConfigDto[] = [];
  selectedDataSourceSapConnectionId: number | null = null;
  selectedSapConnectionId: number | null = null;
  loadingSapConnections: boolean = false;
  sapEndpointOptions: SapServiceLayerEndpointDto[] = [];
  loadingSapEndpointOptions: boolean = false;
  sapEndpointName: string = '';
  sapSelectedEndpointOption: string = '';
  sapCustomEndpointMode: boolean = false;
  sapCustomEndpointName: string = '';
  sapObjectFields: SapServiceLayerObjectFieldDto[] = [];
  loadingSapObjectFields: boolean = false;
  loadingSapReLogin: boolean = false;
  sapMetadataUrl: string = '';
  sapDocumentTypeId: number | null = null;
  sapHttpMethod: 'GET' | 'POST' | 'PUT' = 'POST';
  sapHttpMethodOptions: Array<'GET' | 'POST' | 'PUT'> = ['POST', 'GET', 'PUT'];
  sapExecutionMode: SapExecutionMode = 'OnSubmit';
  sapExecutionModeOptions: Array<{ label: string; value: SapExecutionMode }> = [
    { label: 'Submitted', value: 'OnSubmit' },
    { label: 'Approval', value: 'OnFinalApproval' },
    { label: 'Specific Workflow Stage', value: 'OnSpecificWorkflowStage' }
  ];
  sapWorkflowStages: ApprovalStageDto[] = [];
  loadingSapWorkflowStages: boolean = false;
  sapTriggerStageId: number | null = null;

  // Expose Array, Object, and Math to template
  Array = Array;
  Object = Object;
  Math = Math;

  // Subscriptions
  private routeSub!: Subscription;
  private parentRouteSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private fieldsService: FieldsService,
    private tabsService: TabsService,
    private fieldOptionsService: FieldOptionsService,
    private gridService: GridService,
    private fieldDataSourceService: FieldDataSourceService,
    private formulasService: FormulasService,
    private attachmentTypesService: AttachmentTypesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService,
    private validationService: ValidationService,
    private formSubmissionService: FormSubmissionService,
    private userQueriesService: UserQueriesService,
    public permissionService: PermissionService,
    private sapIntegrationService: SapIntegrationService,
    private formsService: FormsService,
    private documentTypesService: DocumentTypesService,
    private approvalWorkflowService: ApprovalWorkflowService,
    private approvalStageService: ApprovalStageService
  ) {
    // Initialize the form
    this.fieldForm = this.fb.group({
      tabId: ['', Validators.required],
      fieldName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      foreignFieldName: ['', [Validators.maxLength(200)]], // Arabic field name
      fieldCode: ['', [Validators.required, Validators.pattern('^[A-Za-z_][A-Za-z0-9_]*$'), Validators.maxLength(100)]],
      fieldTypeId: ['', Validators.required],
      placeholder: ['', Validators.maxLength(200)],
      foreignPlaceholder: ['', Validators.maxLength(200)], // Arabic placeholder
      hintText: ['', Validators.maxLength(500)],
      foreignHintText: ['', Validators.maxLength(500)], // Arabic hint text
      fieldOrder: [1, [Validators.required, Validators.min(1)]],
      isMandatory: [true],
      isEditable: [true],
      isVisible: [true],
      defaultValue: [''],
      defaultValueJson: [''],
      regexPattern: [''],
      validationMessage: ['', Validators.maxLength(500)],
      foreignValidationMessage: ['', Validators.maxLength(500)], // Arabic validation message
      minValue: [null],
      maxValue: [null],
      fieldOptions: this.fb.array([]),
      // Calculation properties
      expressionText: [''],
      calculationMode: ['Expression'],
      calculationOperation: [getRecommendedCalculationOperation().id], // Default to calculate-safe
      recalculateOn: ['OnFieldChange'],
      resultType: ['Decimal']
    });

    // Watch fieldTypeId changes to show/hide options section
    this.fieldForm.get('fieldTypeId')?.valueChanges.subscribe(fieldTypeId => {
      this.onFieldTypeChange(fieldTypeId);
      // Load file extensions when file type is selected
      if (this.isFileFieldType()) {
        this.loadFileExtensionsFromForm();
      } else {
        this.selectedFileExtensions = [];
      }
      // Handle calculated field type - disable editable and mandatory
      if (this.isCalculatedFieldType(fieldTypeId)) {
        this.fieldForm.patchValue({
          isEditable: false,
          isMandatory: false
        });
      }
      // Load all form fields for expression builder if not loaded (always load, not just for calculated)
      if (this.allFormFields.length === 0) {
        this.loadAllFormFields();
      }
    });

    // Watch fieldName changes to auto-generate fieldCode (only for new fields)
    this.fieldForm.get('fieldName')?.valueChanges.subscribe(fieldName => {
      // Only auto-generate if:
      // 1. We're creating a new field (not editing)
      // 2. fieldCode is empty or was auto-generated (starts with generated code)
      // 3. fieldName is not empty
      if (!this.editingField && fieldName && fieldName.trim()) {
        const currentFieldCode = this.fieldForm.get('fieldCode')?.value || '';
        // Only auto-generate if fieldCode is empty or matches the previous auto-generated pattern
        if (!currentFieldCode || this.isAutoGeneratedFieldCode(currentFieldCode)) {
          const generatedCode = this.generateFieldCodeFromName(fieldName);
          this.fieldForm.patchValue({ fieldCode: generatedCode }, { emitEvent: false });
        }
      }
    });

    // Watch regexPattern changes to auto-update validation message
    this.fieldForm.get('regexPattern')?.valueChanges.subscribe(pattern => {
      this.onRegexPatternChange(pattern);
    });
  }

  ngOnInit(): void {
    // Always reload permissions from API to ensure fresh data (clears cache first)
    console.log('[FieldsList] Refreshing permissions from API (clearing cache)...');
    this.permissionService.refreshPermissions().subscribe({
      next: (perms) => {
        console.log('[FieldsList] Permissions loaded from API:', perms);
        this.loadPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[FieldsList] Error loading permissions:', err);
        this.loadPermissions();
      }
    });

    // Subscribe to permission changes
    this.permissionService.permissions$.subscribe(() => {
      this.loadPermissions();
      this.cdr.detectChanges();
    });

    this.routeSub = this.route.params.subscribe(params => {
      this.tabId = +params['tabId'];

      if (this.tabId) {
        // Load deleted field IDs from localStorage when tabId is available
        this.loadDeletedFieldIds();
        // Get formBuilderId from tab data first, then load fields
        this.loadTabAndFormId();
        this.loadFieldTypes();
      }
    });

    // Set tabId in form
    this.fieldForm.patchValue({ tabId: this.tabId });
  }

  /**
   * Load user permissions for field operations
   */
  private loadPermissions(): void {
    this.canViewFields = this.permissionService.canViewFields();
    this.canCreateFields = this.permissionService.canCreateFields();
    this.canEditFields = this.permissionService.canEditFields();
    this.canDeleteFields = this.permissionService.canDeleteFields();
    this.canManageFields = this.permissionService.canManageFields();
    console.log('[FieldsList] Permission flags:', {
      canViewFields: this.canViewFields,
      canCreateFields: this.canCreateFields,
      canEditFields: this.canEditFields,
      canDeleteFields: this.canDeleteFields,
      canManageFields: this.canManageFields
    });
  }

  canManageFieldRules(): boolean {
    return this.permissionService.canCreateFormRules() || this.permissionService.canManageFormRules();
  }

  private canLoadFieldManagementIntegrations(): boolean {
    return this.permissionService.isAdmin()
      || this.permissionService.canViewApprovalWorkflows()
      || this.permissionService.canViewApprovalStages()
      || this.permissionService.hasPermission('SapConfig_Allow_View')
      || this.permissionService.hasPermission('SapIntegration_Allow_View');
  }

  loadTabAndFormId(): void {
    if (!this.tabId) return;

    this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
          this.tabName = tab.tabName || '';
          if (this.canLoadFieldManagementIntegrations()) {
            this.loadFormDocumentTypeId();
          }
          // Load fields with correct formBuilderId
          this.loadFields();
          // Load all form fields for expression builder
          this.loadAllFormFields();
        } else {
          // Fallback: try parent route
          this.getFormIdFromParentRoute();
        }
      },
      error: () => {
        // If tab not found, try to get formId from parent route or use default
        this.getFormIdFromParentRoute();
      }
    });
  }

  private getFormIdFromParentRoute(): void {
    // Try to get formId from parent route (snapshot first for immediate value)
    let parent = this.route.parent;
    let depth = 0;

    while (parent && depth < 3) {
      const snapshot = parent.snapshot;
      if (snapshot && snapshot.params && snapshot.params['formId']) {
        this.formBuilderId = +snapshot.params['formId'];
        this.loadFields();
        return;
      }
      parent = parent.parent;
      depth++;
    }

    // If not found in snapshot, try subscription (async)
    parent = this.route.parent;
    depth = 0;
    while (parent && depth < 3) {
      this.parentRouteSub = parent.params.subscribe(parentParams => {
        if (parentParams['formId'] && !this.formBuilderId) {
          this.formBuilderId = +parentParams['formId'];
          this.loadFields();
        }
      });
      parent = parent.parent;
      depth++;
    }

    // Default fallback if not found
    if (!this.formBuilderId) {
      this.formBuilderId = 1;
      this.loadFields();
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.parentRouteSub) {
      this.parentRouteSub.unsubscribe();
    }
  }

  /**
   * Load deleted field IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedFieldIds(): void {
    try {
      const savedIds = localStorage.getItem(`deletedFieldIds_${this.tabId}`);
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedFieldIds = new Set(idsArray);
        console.log('[FieldsList] Loaded deleted field IDs from localStorage:', Array.from(this.deletedFieldIds));
      }
    } catch (error) {
      console.error('[FieldsList] Error loading deleted field IDs from localStorage:', error);
      this.deletedFieldIds = new Set();
    }
  }

  /**
   * Save deleted field IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedFieldIds(): void {
    try {
      const idsArray = Array.from(this.deletedFieldIds);
      localStorage.setItem(`deletedFieldIds_${this.tabId}`, JSON.stringify(idsArray));
      console.log('[FieldsList] Saved deleted field IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[FieldsList] Error saving deleted field IDs to localStorage:', error);
    }
  }

  loadFields(): void {
    if (!this.tabId) {
      return;
    }

    this.loading.fields = true;
    // Use formBuilderId if available, otherwise use 1 as fallback
    const formId = this.formBuilderId || 1;
    this.fieldsService.getFields(formId, this.tabId).subscribe({
      next: (fields: FormFieldDto[]) => {
        // getFields الآن يرجع FormFieldDto[] مباشرة بعد استخراج data من response
        console.log('[loadFields] Fields loaded from API:', fields);
        
        // Reload deleted field IDs when tabId changes
        this.loadDeletedFieldIds();

        // Filter out deleted fields before processing
        const activeFields = fields.filter(field => !this.deletedFieldIds.has(field.id!));

        // Clean up deletedFieldIds - remove IDs that are no longer in the API response
        const apiFieldIds = new Set(fields.map(f => f.id));
        const idsToRemove: number[] = [];
        this.deletedFieldIds.forEach(deletedId => {
          const fieldInApi = fields.find(f => f.id === deletedId);
          if (!fieldInApi) {
            // Field not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (fieldInApi.isDeleted === false) {
            // Field is back in API and not deleted (might have been restored)
            idsToRemove.push(deletedId);
            console.log('[FieldsList] Field was restored, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedFieldIds.delete(id));
          this.saveDeletedFieldIds();
          console.log('[FieldsList] Cleaned up deleted field IDs:', idsToRemove);
        }

        // Filter out soft-deleted fields (isDeleted = true) - show only non-deleted fields
        const visibleFields = activeFields.filter(field => field.isDeleted !== true);
        
        // Check for calculated fields and their expressionText
        const calculatedFields = visibleFields.filter(f => 
          f.expressionText || (f as any).ExpressionText || 
          f.fieldTypeName?.toLowerCase() === 'calculated' ||
          f.fieldType?.typeName?.toLowerCase() === 'calculated'
        );
        
        if (calculatedFields.length > 0) {
          console.log('[loadFields] Calculated fields found:', calculatedFields.map(f => ({
            id: f.id,
            fieldCode: f.fieldCode,
            fieldName: f.fieldName,
            expressionText: f.expressionText,
            ExpressionText: (f as any).ExpressionText,
            calculationMode: f.calculationMode,
            recalculateOn: f.recalculateOn,
            resultType: f.resultType
          })));
        } else {
          console.log('[loadFields] No calculated fields found in response');
        }
        
        this.fields = this.sortFieldsByOrder(visibleFields || []);
        this.loading.fields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[loadFields] Error loading fields:', error);
        this.fields = [];
        this.loading.fields = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load fields'
        });
      }
    });
  }

  loadFieldTypes(): void {
    this.loading.fieldTypes = true;
    this.fieldsService.getFieldTypes().subscribe({
      next: (response: any) => {
        // تأكد أن response هي array
        let types: FieldTypeDto[] = [];

        if (Array.isArray(response)) {
          types = response;
        } else if (response && typeof response === 'object') {
          const data = response.data || response.items || response.result || [];
          types = Array.isArray(data) ? data : [];
        }

        this.fieldTypes = types.filter(type => type.isActive);
        this.filteredFieldTypes = [...this.fieldTypes];
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
      (type.description && type.description.toLowerCase().includes(term))
    );
  }


  openAddFieldModal(): void {
    if (!this.canCreateFields && !this.canManageFields) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create fields.' });
      return;
    }

    this.editingField = null;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    this.selectedFileExtensions = []; // Reset file extensions
    this.customFileExtensions = []; // Reset custom extensions
    this.newCustomExtension = ''; // Reset input
    this.newCustomExtensionMaxSize = 10; // Reset max size
    this.selectedGridId = null; // Reset grid selection
    this.availableGrids = []; // Reset grids list
    this.existingDataSource = null; // Clear existing DataSource
    this.dataSourceType = 'Static'; // Set to Static by default for new fields
    this.resetDataSourceConfig(); // Reset DataSource config
    this.resetSapIntegrationSelection();
    this.loadSapConnections();
    this.loadSapDefaults();
    
    // Load all form fields for expression builder (always load, not just for calculated fields)
    if (this.allFormFields.length === 0) {
      this.loadAllFormFields();
    }
    
    this.showFieldModal = true;

    let nextOrder = 1;
    if (this.fields && this.fields.length > 0) {
      const maxOrder = Math.max(...this.fields.map(field => field.fieldOrder || 0));
      nextOrder = maxOrder + 1;
    }

    const defaultFieldTypeId = this.fieldTypes.length > 0 ? this.fieldTypes[0].id : '';

    this.fieldForm.reset({
      tabId: this.tabId,
      fieldTypeId: defaultFieldTypeId,
      fieldName: '',
      foreignFieldName: '',
      fieldCode: '',
      fieldOrder: nextOrder,
      placeholder: '',
      foreignPlaceholder: '',
      hintText: '',
      foreignHintText: '',
      isMandatory: true,
      isEditable: true,
      isVisible: true,
      defaultValue: '',
      defaultValueJson: '',
      regexPattern: '',
      validationMessage: '',
      foreignValidationMessage: '',
      minValue: null,
      maxValue: null
    });

    // Clear field options
    const optionsArray = this.fieldOptionsFormArray;
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }
  }

  openEditFieldModal(field: FormFieldDto): void {
    if (!this.canEditFields && !this.canManageFields) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit fields.' });
      return;
    }

    this.editingField = field;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    
    // Load all form fields for expression builder (always load, not just for calculated fields)
    if (this.allFormFields.length === 0) {
      this.loadAllFormFields();
    }
    
    this.showFieldModal = true;
    this.resetSapIntegrationSelection();
    this.loadSapConnections();
    this.loadSapDefaults();

    // Debug: Log field data to check if expressionText is present
    console.log('[openEditFieldModal] Field data:', {
      id: field.id,
      fieldCode: field.fieldCode,
      fieldTypeId: field.fieldTypeId,
      fieldTypeName: field.fieldTypeName,
      expressionText: field.expressionText,
      calculationMode: field.calculationMode,
      recalculateOn: field.recalculateOn,
      resultType: field.resultType,
      fullField: field
    });

    const regexPattern = field.regexPattern || '';
    let validationMessage = field.validationMessage || '';

    // Auto-set validation message if pattern matches a preset and message is empty
    if (regexPattern && !validationMessage) {
      const matchingOption = this.regexOptions.find(opt => opt.value === regexPattern);
      if (matchingOption && matchingOption.message) {
        validationMessage = matchingOption.message;
      }
    }

    // Set selected grid ID if field has gridId
    if (field.gridId) {
      this.selectedGridId = field.gridId;
    } else {
      this.selectedGridId = null;
    }

    // Prepare calculation properties - check both expressionText and alternative property names
    // Also check for null/undefined explicitly
    const expressionText = field.expressionText ?? (field as any).ExpressionText ?? '';
    const calculationMode = field.calculationMode ?? (field as any).CalculationMode ?? 'Expression';
    const calculationOperation = (field as any).calculationOperation ?? (field as any).CalculationOperation ?? getRecommendedCalculationOperation().id;
    const recalculateOn = field.recalculateOn ?? (field as any).RecalculateOn ?? 'OnFieldChange';
    const resultType = field.resultType ?? (field as any).ResultType ?? 'Decimal';
    
    // Update selected calculation operation
    const operation = this.calculationOperations.find(op => op.id === calculationOperation);
    if (operation) {
      this.selectedCalculationOperation = operation;
    }

    console.log('[openEditFieldModal] Calculation properties:', {
      expressionText,
      calculationMode,
      recalculateOn,
      resultType,
      isCalculated: this.isCalculatedFieldType(field.fieldTypeId),
      fieldTypeId: field.fieldTypeId,
      fieldTypeName: field.fieldTypeName,
      'field.expressionText': field.expressionText,
      'field.ExpressionText': (field as any).ExpressionText
    });

    // Check if field is a file type - file fields use defaultValueJson for configuration, not for default values
    const isFileType = this.isFileFieldTypeByField(field);

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: field.fieldName || '',
      foreignFieldName: field.foreignFieldName || '',
      fieldCode: field.fieldCode || '',
      fieldOrder: field.fieldOrder || 1,
      placeholder: field.placeholder || '',
      foreignPlaceholder: field.foreignPlaceholder || '',
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      // For file fields, don't set defaultValue (it's used for file configuration in defaultValueJson)
      defaultValue: isFileType ? '' : (field.defaultValueJson || ''),
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: regexPattern,
      validationMessage: validationMessage,
      foreignValidationMessage: field.foreignValidationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null,
      // Calculation properties
      expressionText: expressionText,
      calculationMode: calculationMode,
      calculationOperation: calculationOperation,
      recalculateOn: recalculateOn,
      resultType: resultType
    }, { emitEvent: false }); // Prevent triggering change listeners during initialization

    // Force change detection after patching values
    setTimeout(() => {
      const formExpressionText = this.fieldForm.get('expressionText')?.value;
      const formFieldTypeId = this.fieldForm.get('fieldTypeId')?.value;
      const isCalculated = this.isCalculatedFieldType(formFieldTypeId);
      
      console.log('[openEditFieldModal] Form values after patch:', {
        fieldTypeId: formFieldTypeId,
        expressionText: formExpressionText,
        calculationMode: this.fieldForm.get('calculationMode')?.value,
        recalculateOn: this.fieldForm.get('recalculateOn')?.value,
        resultType: this.fieldForm.get('resultType')?.value,
        isCalculated: isCalculated,
        'form.get(expressionText)': this.fieldForm.get('expressionText'),
        'form.get(expressionText).value': formExpressionText
      });

      // If expressionText is empty but field is calculated, log warning
      if (isCalculated && !formExpressionText) {
        console.warn('[openEditFieldModal] WARNING: Calculated field has empty expressionText!', {
          fieldId: field.id,
          fieldCode: field.fieldCode,
          originalExpressionText: field.expressionText,
          originalExpressionTextPascal: (field as any).ExpressionText
        });
      }

      this.cdr.detectChanges();
    }, 100);

    // Load grids if grid type
    if (this.isGridFieldType(field.fieldTypeId)) {
      this.loadAvailableGrids();
    } else {
      this.availableGrids = [];
      this.selectedGridId = null;
    }

    // Set selected grid ID if field has gridId
    if (field.gridId) {
      this.selectedGridId = field.gridId;
    } else {
      this.selectedGridId = null;
    }

    // Load grids if grid type
    if (this.isGridFieldType(field.fieldTypeId)) {
      this.loadAvailableGrids();
    } else {
      this.availableGrids = [];
      this.selectedGridId = null;
    }

    // Load file extensions if file type
    if (this.isFileFieldType()) {
      this.loadFileExtensionsFromForm();
    } else {
      this.selectedFileExtensions = [];
    }

    // Load DataSource if field has options type
    const selectedFieldType = this.getSelectedFieldType();
    if (selectedFieldType?.hasOptions && field.id) {
      // Initialize DataSource config with Static as default while loading
      this.dataSourceType = 'Static';
      this.loadDataSourceForField(field.id, () => {
        // After DataSource is loaded we know where options come from:
        // - Static: load stored options from DB
        // - Api/LookupTable/SqlQuery: load preview options dynamically
        if (this.dataSourceType === 'Static') {
          this.loadFieldOptions(field.id);
        } else if (this.dataSourceType === 'FormSubmissions') {
          // Form submissions preview is triggered only after source fields are loaded
          // and saved value/text field codes are resolved back into the form state.
          this.previewOptions = [];
        } else {
          // Ensure any Static options UI won't show stale values
          // and immediately fetch preview so user sees options again when reopening edit
          this.previewDataSource();
        }
      });
    } else {
      this.resetDataSourceConfig();
      // Load field options if no options type (shouldn't happen, but safe)
      this.loadFieldOptions(field.id);
    }

    // Trigger change detection to ensure UI updates
    this.cdr.detectChanges();
  }

  closeFieldModal(): void {
    this.showFieldModal = false;
    this.editingField = null;
    this.selectedField = null;
    this.currentInputLanguage = 'en'; // Reset to English when closing modal
    this.resetDataSourceConfig(); // Reset DataSource config
    this.resetSapIntegrationSelection();
    this.fieldForm.reset({
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      fieldOrder: 1
      // Note: isDeleted defaults to false for new fields (handled by backend)
    });
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  /**
   * Translate a key based on currentInputLanguage
   */
  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  onRegexPresetChange(value: string): void {
    const selectedOption = this.regexOptions.find(opt => opt.value === value);
    if (selectedOption) {
      this.fieldForm.patchValue({
        regexPattern: selectedOption.value,
        validationMessage: selectedOption.message || ''
      }, { emitEvent: false }); // Prevent triggering regexPattern change listener
    } else {
      this.fieldForm.patchValue({ regexPattern: value }, { emitEvent: false });
    }
  }

  onRegexPatternChange(pattern: string): void {
    // Only auto-update if validation message is empty or matches a preset message
    const currentMessage = this.fieldForm.get('validationMessage')?.value || '';
    const matchingOption = this.regexOptions.find(opt => opt.value === pattern);

    // If pattern matches a preset and message is empty or matches the preset message, update it
    if (matchingOption && matchingOption.message) {
      if (!currentMessage || currentMessage === matchingOption.message ||
        this.regexOptions.some(opt => opt.message === currentMessage)) {
        this.fieldForm.patchValue({
          validationMessage: matchingOption.message
        }, { emitEvent: false });
      }
    }
  }

  getSelectedRegexPreset(): string {
    const currentPattern = this.fieldForm.get('regexPattern')?.value || '';
    const matchingOption = this.regexOptions.find(opt => opt.value === currentPattern);
    return matchingOption ? matchingOption.value : '';
  }

  /**
   * Generate fieldCode from fieldName
   * Converts field name to a valid field code (uppercase, alphanumeric + underscore)
   */
  generateFieldCodeFromName(fieldName: string): string {
    if (!fieldName || !fieldName.trim()) {
      return '';
    }

    // Remove special characters, keep only alphanumeric and spaces
    let code = fieldName.trim()
      .replace(/[^a-zA-Z0-9\s_]/g, '') // Remove special chars except spaces and underscores
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toUpperCase(); // Convert to uppercase

    // Ensure it starts with a letter or underscore
    if (code && /^[0-9]/.test(code)) {
      code = '_' + code;
    }

    // If empty after processing, use a default
    if (!code) {
      code = 'FIELD_' + Date.now().toString().slice(-6);
    }

    return code;
  }

  /**
   * Check if fieldCode was auto-generated (simple heuristic)
   */
  isAutoGeneratedFieldCode(fieldCode: string): boolean {
    if (!fieldCode) return false;
    // If fieldCode matches the pattern of the current fieldName, it's likely auto-generated
    const fieldName = this.fieldForm.get('fieldName')?.value || '';
    if (fieldName) {
      const generatedCode = this.generateFieldCodeFromName(fieldName);
      return fieldCode.toUpperCase() === generatedCode;
    }
    return false;
  }

  /**
   * Check if fieldCode already exists in the current tab
   */
  fieldCodeExists(fieldCode: string, excludeFieldId?: number): boolean {
    if (!fieldCode) return false;
    const normalizedCode = fieldCode.toUpperCase();
    return this.fields.some(field => 
      field.fieldCode && 
      field.fieldCode.toUpperCase() === normalizedCode &&
      (!excludeFieldId || field.id !== excludeFieldId) &&
      !this.deletedFieldIds.has(field.id)
    );
  }

  saveField(): void {
    if (this.editingField) {
      // Update existing field
      if (!this.canEditFields && !this.canManageFields) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to edit fields.' });
        return;
      }
    } else {
      // Create new field
      if (!this.canCreateFields && !this.canManageFields) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to create fields.' });
        return;
      }
    }

    if (this.fieldForm.invalid) {
      this.markFormGroupTouched(this.fieldForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    if (this.sapIntegrationEnabled && !(this.sapFieldName || '').trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'SAP Field Name is required when SAP mapping is enabled.'
      });
      return;
    }

    if (this.sapIntegrationEnabled && !this.selectedSapConnectionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select SAP Connection when SAP mapping is enabled.'
      });
      return;
    }

    if (this.sapIntegrationEnabled && !this.normalizeSapEndpointName(this.sapEndpointName)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter SAP endpoint/object (e.g. ProductionOrders).'
      });
      return;
    }

    if (this.sapIntegrationEnabled && this.sapExecutionMode === 'OnSpecificWorkflowStage' && !this.sapTriggerStageId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select a workflow stage for SAP execution.'
      });
      return;
    }

    // Validate Grid selection for Grid field type
    if (this.isGridFieldType(this.fieldForm.get('fieldTypeId')?.value)) {
      if (!this.selectedGridId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a Grid for Grid field type'
        });
        return;
      }
    }

    // Validate expression text for Calculated field type
    if (this.isCalculatedFieldType(this.fieldForm.get('fieldTypeId')?.value)) {
      const expressionText = this.fieldForm.get('expressionText')?.value;
      if (!expressionText || !expressionText.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Expression text is required for Calculated field type'
        });
        return;
      }
    }

    // Validate fieldCode uniqueness before saving
    const fieldCode = this.fieldForm.get('fieldCode')?.value?.toUpperCase() || '';
    if (fieldCode) {
      const existingFieldId = this.editingField?.id;
      if (this.fieldCodeExists(fieldCode, existingFieldId)) {
        const currentLang = this.translationService.getCurrentLanguage();
        this.messageService.add({
          severity: 'error',
          summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
          detail: currentLang === 'ar' 
            ? `Field Code "${fieldCode}" موجود بالفعل. يرجى استخدام Field Code آخر.`
            : `Field Code "${fieldCode}" already exists. Please use a different Field Code.`,
          life: 8000
        });
        // Focus on fieldCode input
        setTimeout(() => {
          const fieldCodeInput = document.querySelector('input[formControlName="fieldCode"]') as HTMLInputElement;
          if (fieldCodeInput) {
            fieldCodeInput.focus();
            fieldCodeInput.select();
          }
        }, 100);
        return;
      }
    }

    // Save file extensions to form if file type is selected
    if (this.isFileFieldType()) {
      console.log('[saveField] File field type detected, calling saveFileExtensionsToForm()');
      this.saveFileExtensionsToForm();
      console.log('[saveField] defaultValueJson after saveFileExtensionsToForm:', this.fieldForm.get('defaultValueJson')?.value);
    }

    this.loading.save = true;
    const fieldData = this.fieldForm.value;
    console.log('[saveField] Field data before save:', {
      defaultValueJson: fieldData.defaultValueJson,
      defaultValue: fieldData.defaultValue,
      fieldTypeId: fieldData.fieldTypeId
    });

    if (this.editingField) {
      const updateDto: UpdateFormFieldDto = {
        tabId: this.tabId,
        fieldTypeId: Number(fieldData.fieldTypeId),
        fieldName: fieldData.fieldName,
        foreignFieldName: fieldData.foreignFieldName || undefined,
        fieldCode: fieldData.fieldCode,
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || undefined,
        foreignPlaceholder: fieldData.foreignPlaceholder || undefined,
        hintText: fieldData.hintText || '',
        foreignHintText: fieldData.foreignHintText || undefined,
        isMandatory: fieldData.isMandatory ?? null,
        isEditable: fieldData.isEditable ?? null,
        isVisible: fieldData.isVisible ?? null,
        defaultValueJson: fieldData.defaultValueJson || fieldData.defaultValue || undefined,
        regexPattern: fieldData.regexPattern || undefined,
        validationMessage: fieldData.validationMessage || undefined,
        foreignValidationMessage: fieldData.foreignValidationMessage || undefined,
        gridId: this.isGridFieldType(fieldData.fieldTypeId) ? this.selectedGridId || undefined : undefined,
        minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== ''
          ? Number(fieldData.minValue)
          : undefined,
        maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== ''
          ? Number(fieldData.maxValue)
          : undefined,
        // Calculation properties
        expressionText: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.expressionText || undefined) : undefined,
        calculationMode: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.calculationMode || 'Expression') : undefined,
        calculationOperation: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.calculationOperation || getRecommendedCalculationOperation().id) : undefined,
        recalculateOn: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.recalculateOn || 'OnFieldChange') : undefined,
        resultType: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.resultType || 'Decimal') : undefined
      };

      if (!this.editingField) return;

      console.log('[saveField] Update DTO:', updateDto);
      console.log('[saveField] Update DTO defaultValueJson:', updateDto.defaultValueJson);

      this.fieldsService.updateField(this.editingField.id, updateDto).subscribe({
        next: (updatedField) => {
          // Save field options if field type has options
          const selectedFieldType = this.fieldTypes.find(t => t.id === Number(fieldData.fieldTypeId));
          if (selectedFieldType?.hasOptions) {
            // Save DataSource if not Static, otherwise save static options
            if (this.dataSourceType !== 'Static') {
              this.saveDataSource(this.editingField!.id).then(() => {
                this.completeFieldModalSave(this.editingField!.id, 'Field updated successfully');
              }).catch(() => {
                this.loading.save = false;
              });
            } else {
              this.saveFieldOptions(this.editingField!.id, () => {
                this.completeFieldModalSave(this.editingField!.id, 'Field updated successfully');
              });
            }
          } else {
            // Delete all options if field type doesn't support options
            this.deleteAllFieldOptions(this.editingField!.id).then(() => {
              this.completeFieldModalSave(this.editingField!.id, 'Field updated successfully');
            });
          }
        },
        error: (error) => {
          this.loading.save = false;
          
          // Use the new validation system for enhanced error handling
          this.handleFieldSaveError(error);
        }
      });
    } else {
      const createDto: CreateFormFieldDto = {
        tabId: this.tabId,
        fieldTypeId: Number(fieldData.fieldTypeId),
        fieldName: fieldData.fieldName,
        foreignFieldName: fieldData.foreignFieldName || undefined,
        fieldCode: fieldData.fieldCode.toUpperCase(),
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || undefined,
        foreignPlaceholder: fieldData.foreignPlaceholder || undefined,
        hintText: fieldData.hintText || '',
        foreignHintText: fieldData.foreignHintText || undefined,
        isMandatory: fieldData.isMandatory ?? true,
        isEditable: fieldData.isEditable ?? true,
        isVisible: fieldData.isVisible ?? true,
        defaultValueJson: fieldData.defaultValueJson || fieldData.defaultValue || undefined,
        regexPattern: fieldData.regexPattern || undefined,
        validationMessage: fieldData.validationMessage || undefined,
        foreignValidationMessage: fieldData.foreignValidationMessage || undefined,
        gridId: this.isGridFieldType(fieldData.fieldTypeId) ? this.selectedGridId || undefined : undefined,
        minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== ''
          ? Number(fieldData.minValue)
          : undefined,
        maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== ''
          ? Number(fieldData.maxValue)
          : undefined,
        // Calculation properties
        expressionText: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.expressionText || undefined) : undefined,
        calculationMode: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.calculationMode || 'Expression') : undefined,
        calculationOperation: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.calculationOperation || getRecommendedCalculationOperation().id) : undefined,
        recalculateOn: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.recalculateOn || 'OnFieldChange') : undefined,
        resultType: this.isCalculatedFieldType(fieldData.fieldTypeId) ? (fieldData.resultType || 'Decimal') : undefined,
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };

      console.log('[saveField] Create DTO:', createDto);
      console.log('[saveField] Create DTO defaultValueJson:', createDto.defaultValueJson);

      this.fieldsService.createField(createDto).subscribe({
        next: (newField) => {
          // Save field options if field type has options
          const selectedFieldType = this.fieldTypes.find(t => t.id === Number(fieldData.fieldTypeId));
          if (selectedFieldType?.hasOptions) {
            // Save DataSource if not Static, otherwise save static options
            if (this.dataSourceType !== 'Static') {
              this.saveDataSource(newField.id).then(() => {
                this.completeFieldModalSave(newField.id, 'Field created successfully');
              }).catch(() => {
                this.loading.save = false;
              });
            } else if (this.fieldOptionsFormArray.length > 0) {
              this.saveFieldOptions(newField.id, () => {
                this.completeFieldModalSave(newField.id, 'Field created successfully');
              });
            } else {
              this.completeFieldModalSave(newField.id, 'Field created successfully');
            }
          } else {
            this.completeFieldModalSave(newField.id, 'Field created successfully');
          }
        },
        error: (error) => {
          this.loading.save = false;
          
          // Use the new validation system for enhanced error handling
          this.handleFieldSaveError(error);
        }
      });
    }
  }

  deleteField(fieldId: number): void {
    if (!this.canDeleteFields && !this.canManageFields) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to delete fields.' });
      return;
    }

    const fieldToDelete = this.fields.find(f => f.id === fieldId);
    if (!fieldToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the field "${fieldToDelete.fieldName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.fieldsService.softDelete(fieldId).subscribe({
          next: () => {
            // Add to deleted fields set to filter it out even after refresh/login
            this.deletedFieldIds.add(fieldId);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedFieldIds();

            // Update field in array - mark as deleted
            const fieldIndex = this.fields.findIndex(f => f.id === fieldId);
            if (fieldIndex !== -1) {
              this.fields[fieldIndex] = {
                ...this.fields[fieldIndex],
                isDeleted: true
              };
              // Remove from visible list (filter out deleted)
              this.fields = this.fields.filter(f => f.id !== fieldId);
            }

            this.loading.delete = false;
            const currentLang = this.translationService.getCurrentLanguage();
            const successMessage = currentLang === 'ar' 
              ? 'تم حذف الحقل بنجاح' 
              : 'Field deleted successfully';
            this.messageService.add({ 
              severity: 'success', 
              summary: currentLang === 'ar' ? 'نجاح' : 'Success', 
              detail: successMessage,
              life: 5000
            });

            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('[FieldsList] Error deleting field:', error);
            
            const currentLang = this.translationService.getCurrentLanguage();
            let errorMessage = 'Failed to delete field';
            let errorSummary = currentLang === 'ar' ? 'خطأ' : 'Error';

            // Extract error message from response
            if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.error?.errorMessage) {
              errorMessage = error.error.errorMessage;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            // Check for specific SQL constraint errors
            const errorString = JSON.stringify(error).toLowerCase();
            if (errorString.includes('reference constraint') || 
                errorString.includes('fk_formulas_form_fields_resultfieldid') ||
                errorString.includes('resultfieldid')) {
              errorMessage = currentLang === 'ar'
                ? 'لا يمكن حذف هذا الحقل لأنه مرتبط بمعادلة (Formula) تستخدمه كحقل نتيجة. يرجى حذف أو تعديل المعادلة أولاً.'
                : 'Cannot delete this field because it is linked to a Formula that uses it as a result field. Please delete or modify the Formula first.';
              errorSummary = currentLang === 'ar' ? 'حذف غير ممكن' : 'Cannot Delete';
            } else if (error?.status === 400) {
              if (!errorMessage || errorMessage === 'Failed to delete field') {
                errorMessage = currentLang === 'ar'
                  ? 'لا يمكن حذف هذا الحقل. قد يكون مرتبطاً ببيانات أخرى.'
                  : 'Cannot delete this field. It may be linked to other data.';
              }
            } else if (error?.status === 404) {
              errorMessage = currentLang === 'ar'
                ? 'الحقل غير موجود. قد يكون تم حذفه مسبقاً.'
                : 'Field not found. It may have already been deleted.';
            } else if (error?.status === 409) {
              errorMessage = currentLang === 'ar'
                ? 'لا يمكن حذف هذا الحقل لأنه قيد الاستخدام.'
                : 'Cannot delete this field because it is currently in use.';
            } else if (error?.status === 403) {
              errorMessage = currentLang === 'ar'
                ? 'ليس لديك صلاحية لحذف هذا الحقل.'
                : 'You do not have permission to delete this field.';
            } else if (error?.status === 500) {
              if (!errorMessage || errorMessage === 'Failed to delete field') {
                errorMessage = currentLang === 'ar'
                  ? 'حدث خطأ في الخادم أثناء حذف الحقل. يرجى المحاولة مرة أخرى لاحقاً.'
                  : 'Server error occurred while deleting the field. Please try again later.';
              }
            } else if (error?.status === 0) {
              errorMessage = currentLang === 'ar'
                ? 'خطأ في الشبكة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.'
                : 'Network error. Please check your connection and try again.';
            }

            this.messageService.add({ 
              severity: 'error', 
              summary: errorSummary, 
              detail: errorMessage,
              life: 8000
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  duplicateField(field: FormFieldDto): void {
    this.editingField = null;
    this.showFieldModal = true;

    let nextOrder = 1;
    if (this.fields && this.fields.length > 0) {
      const maxOrder = Math.max(...this.fields.map(f => f.fieldOrder || 0));
      nextOrder = maxOrder + 1;
    }

    // Check if field is a file type - file fields use defaultValueJson for configuration, not for default values
    const isFileType = this.isFileFieldTypeByField(field);

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: `${field.fieldName} (Copy)`,
      fieldCode: `${field.fieldCode}_COPY`,
      fieldOrder: nextOrder,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      // For file fields, don't set defaultValue (it's used for file configuration in defaultValueJson)
      defaultValue: isFileType ? '' : (field.defaultValueJson || ''),
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null
    });
  }

  /**
   * Restore soft-deleted field
   */
  restoreField(field: FormFieldDto): void {
    if (!field.id) {
      console.error('[restoreField] Field ID is missing');
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to restore the field "${field.fieldName}"?`,
      header: 'Confirm Restore',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('[restoreField] User confirmed, restoring field:', field.id);
        this.loading.save = true;

        this.fieldsService.restore(field.id).subscribe({
          next: (restoredField) => {
            console.log('[restoreField] Field restored successfully:', restoredField);
            this.loading.save = false;

            // Remove from deleted fields set
            if (this.deletedFieldIds.has(field.id!)) {
              this.deletedFieldIds.delete(field.id!);
              this.saveDeletedFieldIds();
            }

            // Update field in array
            const index = this.fields.findIndex(f => f.id === field.id);
            if (index !== -1) {
              this.fields[index] = {
                ...this.fields[index],
                ...restoredField,
                isDeleted: false
              };
              // Maintain sorted order
              this.fields = this.sortFieldsByOrder([...this.fields]);
            } else {
              // If not found, reload all fields
              this.loadAllFormFields();
            }

            const currentLang = this.translationService.getCurrentLanguage();
            const successMessage = currentLang === 'ar'
              ? 'تم استعادة الحقل بنجاح'
              : 'Field restored successfully';

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: successMessage,
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('[restoreField] Error restoring field:', error);
            this.loading.save = false;

            const currentLang = this.translationService.getCurrentLanguage();
            const errorMessage = currentLang === 'ar'
              ? 'فشل استعادة الحقل'
              : 'Failed to restore field';

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
    });
  }

  toggleFieldStatus(field: FormFieldDto): void {
    console.log('[toggleFieldStatus] Called for field:', field.id, 'Current status:', field.isActive);
    const newStatus = !field.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the field "${field.fieldName}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('[toggleFieldStatus] User confirmed, updating field status to:', newStatus);

        // Use full update with isActive - include ALL fields from original field to ensure all required fields are sent
        // hintText is required in C# backend (non-nullable string), so we must ensure it's always a string
        const hintTextValue = field.hintText !== null && field.hintText !== undefined ? field.hintText : '';
        
        const updateDto: UpdateFormFieldDto = {
          tabId: field.tabId,
          fieldTypeId: field.fieldTypeId,
          fieldName: field.fieldName,
          foreignFieldName: field.foreignFieldName || undefined,
          fieldCode: field.fieldCode,
          fieldOrder: field.fieldOrder !== null && field.fieldOrder !== undefined ? field.fieldOrder : 1,
          placeholder: field.placeholder || undefined,
          foreignPlaceholder: field.foreignPlaceholder || undefined,
          hintText: hintTextValue, // Required field - must be a string
          foreignHintText: field.foreignHintText || undefined,
          isMandatory: field.isMandatory !== null && field.isMandatory !== undefined ? field.isMandatory : null,
          isEditable: field.isEditable !== null && field.isEditable !== undefined ? field.isEditable : null,
          isVisible: field.isVisible !== null && field.isVisible !== undefined ? field.isVisible : null,
          isActive: newStatus,
          defaultValueJson: field.defaultValueJson || undefined,
          regexPattern: field.regexPattern || undefined,
          validationMessage: field.validationMessage || undefined,
          foreignValidationMessage: field.foreignValidationMessage || undefined,
          minValue: field.minValue !== null && field.minValue !== undefined ? field.minValue : undefined,
          maxValue: field.maxValue !== null && field.maxValue !== undefined ? field.maxValue : undefined,
          gridId: field.gridId || undefined,
          // Calculation properties (if field has them)
          expressionText: field.expressionText || undefined,
          calculationMode: field.calculationMode || undefined,
          calculationOperation: field.calculationOperation || undefined,
          recalculateOn: field.recalculateOn || undefined,
          resultType: field.resultType || undefined
        };

        console.log('[toggleFieldStatus] Sending full update DTO:', JSON.stringify(updateDto, null, 2));
        console.log('[toggleFieldStatus] Field details:', {
          id: field.id,
          fieldName: field.fieldName,
          fieldTypeId: field.fieldTypeId,
          tabId: field.tabId,
          hintText: field.hintText,
          hintTextType: typeof field.hintText
        });

        this.loading.save = true;
        this.fieldsService.updateField(field.id, updateDto).subscribe({
          next: (updatedField) => {
            console.log('[toggleFieldStatus] Update successful:', updatedField);
            
            // If reactivating, remove from deleted fields set
            if (newStatus && this.deletedFieldIds.has(field.id!)) {
              this.deletedFieldIds.delete(field.id!);
              this.saveDeletedFieldIds();
            }
            
            // Update field in array without reloading - keep it in list even if inactive
            const index = this.fields.findIndex(f => f.id === field.id);
            if (index !== -1) {
              const existingField = this.fields[index];
              this.fields[index] = {
                ...existingField,
                ...(updatedField || {}),
                isActive: newStatus,
                // Preserve fieldOptions - safely handle null updatedField
                fieldOptions: (updatedField?.fieldOptions ?? existingField.fieldOptions) || []
              };
              // Maintain sorted order
              this.fields = this.sortFieldsByOrder([...this.fields]);
            }
            
            // Don't add to deletedFieldIds when just toggling status - keep it visible but inactive
            // Only add to deletedFieldIds when user explicitly deletes the field

            this.loading.save = false;
            const currentLang = this.translationService.getCurrentLanguage();
            const successMessage = currentLang === 'ar'
              ? `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} الحقل بنجاح`
              : `Field ${action}d successfully`;
            
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: successMessage,
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('[toggleFieldStatus] Error updating field:', error);
            console.error('[toggleFieldStatus] Error details:', {
              status: error?.status,
              statusText: error?.statusText,
              message: error?.message,
              error: error?.error,
              errorMessage: error?.error?.message,
              errorTitle: error?.error?.title,
              errors: error?.error?.errors,
              fieldId: field.id,
              fieldName: field.fieldName,
              updateDto: updateDto
            });
            this.loading.save = false;
            
            const currentLang = this.translationService.getCurrentLanguage();
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.error?.title || error?.message;
            
            // Provide user-friendly error messages
            if (!errorMessage || errorMessage === `Failed to ${action} field`) {
              if (error?.status === 400) {
                // Check if there are validation errors
                if (error?.error?.errors && typeof error.error.errors === 'object') {
                  const validationErrors = Object.values(error.error.errors).flat().join(', ');
                  errorMessage = currentLang === 'ar'
                    ? `خطأ في التحقق من البيانات: ${validationErrors}`
                    : `Validation error: ${validationErrors}`;
                } else {
                  errorMessage = currentLang === 'ar'
                    ? 'لا يمكن تحديث الحقل. يرجى التحقق من البيانات المرسلة. قد تكون بعض الحقول المطلوبة مفقودة أو غير صحيحة.'
                    : 'Cannot update field. Please check the data being sent. Some required fields may be missing or invalid.';
                }
              } else if (error?.status === 404) {
                errorMessage = currentLang === 'ar'
                  ? 'الحقل غير موجود. قد يكون تم حذفه.'
                  : 'Field not found. It may have been deleted.';
              } else if (error?.status === 403) {
                errorMessage = currentLang === 'ar'
                  ? 'ليس لديك صلاحية لتحديث هذا الحقل.'
                  : 'You do not have permission to update this field.';
              } else {
                errorMessage = currentLang === 'ar'
                  ? `فشل في ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} الحقل`
                  : `Failed to ${action} field`;
              }
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
    });
  }

  sortFieldsByOrder(fields: FormFieldDto[]): FormFieldDto[] {
    // تأكد أن fields هي array قبل استخدام sort
    if (!Array.isArray(fields)) {
      return [];
    }

    return fields.sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
  }

  getFieldTypeName(fieldTypeId: number | undefined): string {
    if (!fieldTypeId) return 'Unknown';
    const type = this.fieldTypes.find(t => t.id === fieldTypeId);
    return type ? type.typeName : `Type ${fieldTypeId}`;
  }

  getFieldType(fieldTypeId: number | undefined): FieldTypeDto | undefined {
    if (!fieldTypeId) return undefined;
    return this.fieldTypes.find(t => t.id === fieldTypeId);
  }

  getFieldStatusClass(field: FormFieldDto): string {
    if (field.isDeleted) return 'status-inactive';
    if (field.isMandatory) return 'status-mandatory';
    return 'status-normal';
  }

  getActiveFieldsCount(): number {
    return this.fields.filter(f => !f.isDeleted).length;
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
    const control = this.fieldForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.fieldForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    if (control.errors['pattern']) return 'Invalid format. Use only letters (uppercase or lowercase), numbers and underscores';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;

    return 'Invalid value';
  }

  // ================= FIELD OPTIONS MANAGEMENT ================

  get fieldOptionsFormArray(): FormArray {
    return this.fieldForm.get('fieldOptions') as FormArray;
  }

  onFieldTypeChange(fieldTypeId: number | string): void {
    const normalizedId = Number(fieldTypeId);
    if (!normalizedId) {
      // If no valid type selected, clear options
      const optionsArray = this.fieldOptionsFormArray;
      while (optionsArray.length !== 0) {
        optionsArray.removeAt(0);
      }
      this.selectedGridId = null;
      this.availableGrids = [];
      return;
    }

    const selectedFieldType = this.fieldTypes.find(t => t.id === normalizedId);

    // Check if it's a Grid field type
    if (this.isGridFieldType(normalizedId)) {
      this.loadAvailableGrids();
    } else {
      this.selectedGridId = null;
      this.availableGrids = [];
    }

    // If field type has options and no DataSource is configured yet, set DataSource to Static
    // Also check typeName for checkbox, radio, select to ensure options section appears
    const typeName = (selectedFieldType?.typeName || '').toLowerCase();
    const isOptionsType = selectedFieldType?.hasOptions || 
                          typeName.includes('checkbox') || 
                          typeName.includes('radio') || 
                          typeName.includes('select') ||
                          typeName.includes('combobox') ||
                          typeName.includes('multiselect');
    
    if (isOptionsType) {
      console.log(`[FieldsList] Field type ${selectedFieldType?.typeName} (ID: ${normalizedId}) has options. hasOptions=${selectedFieldType?.hasOptions}, typeName=${typeName}`);
      
      // Only set to Static if no DataSource is loaded yet (for new fields or fields without DataSource)
      if (!this.existingDataSource) {
        this.dataSourceType = 'Static';
        this.onDataSourceTypeChange();
        console.log(`[FieldsList] Set dataSourceType to Static for field type ${selectedFieldType?.typeName}`);
      }
      
      // If options array is empty, add one default option
      if (this.fieldOptionsFormArray.length === 0) {
        this.addFieldOption();
        console.log(`[FieldsList] Added default option for field type ${selectedFieldType?.typeName}`);
      }
      
      // Force change detection to update UI
      this.cdr.detectChanges();
    } else {
      // Clear options if field type doesn't support options
      const optionsArray = this.fieldOptionsFormArray;
      while (optionsArray.length !== 0) {
        optionsArray.removeAt(0);
      }
      console.log(`[FieldsList] Field type ${selectedFieldType?.typeName} (ID: ${normalizedId}) does not support options`);
    }
  }

  /**
   * Check if field type is Grid
   */
  isGridFieldType(fieldTypeId: number | string): boolean {
    const normalizedId = Number(fieldTypeId);
    if (!normalizedId) return false;
    const type = this.fieldTypes.find(t => t.id === normalizedId);
    return type?.typeName?.toLowerCase() === 'grid';
  }

  /**
   * Load available grids for the current tab
   */
  loadAvailableGrids(): void {
    if (!this.tabId) {
      this.availableGrids = [];
      return;
    }

    this.gridService.getGridsByTabId(this.tabId).subscribe({
      next: (response) => {
        this.availableGrids = response.data || [];
        // If editing and field has gridId, set it
        if (this.editingField && this.editingField.gridId) {
          this.selectedGridId = this.editingField.gridId;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.availableGrids = [];
        this.selectedGridId = null;
      }
    });
  }

  getSelectedFieldType(): FieldTypeDto | undefined {
    const rawFieldTypeId = this.fieldForm.get('fieldTypeId')?.value;
    const fieldTypeId = Number(rawFieldTypeId);
    if (!fieldTypeId) return undefined;
    return this.fieldTypes.find(t => t.id === fieldTypeId);
  }

  /**
   * Check if selected field type is an options field type (checkbox, radio, select, etc.)
   * This is a helper method to ensure options section appears even if hasOptions is not set correctly
   */
  isOptionsFieldType(): boolean {
    const selectedType = this.getSelectedFieldType();
    if (!selectedType) return false;
    
    const typeName = (selectedType.typeName || '').toLowerCase();
    return selectedType.hasOptions === true ||
           typeName.includes('checkbox') ||
           typeName.includes('radio') ||
           typeName.includes('select') ||
           typeName.includes('combobox') ||
           typeName.includes('multiselect');
  }

  /**
   * Check if a field object is a file type
   */
  isFileFieldTypeByField(field: FormFieldDto): boolean {
    if (!field) return false;
    
    const typeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase().trim();
    const dataType = (field.fieldType?.dataType || '').toLowerCase().trim();
    
    // Check for file type by name or dataType
    return typeName === 'file' || typeName.includes('file') || 
           typeName.includes('image') || typeName.includes('attachment') ||
           dataType === 'file';
  }

  /**
   * Check if selected field type is File
   */
  isFileFieldType(): boolean {
    // First check if editingField exists and has file type
    if (this.editingField) {
      if (this.isFileFieldTypeByField(this.editingField)) {
        return true;
      }
    }
    
    // Then check selected field type from form
    const selectedType = this.getSelectedFieldType();
    if (!selectedType) return false;
    const typeName = (selectedType.typeName || '').toLowerCase().trim();
    const dataType = (selectedType.dataType || '').toLowerCase().trim();
    // Check for file type by name or dataType
    return typeName === 'file' || typeName.includes('file') || 
           typeName.includes('image') || typeName.includes('attachment') ||
           dataType === 'file';
  }

  /**
   * Check if field type is Calculated
   */
  isCalculatedFieldType(fieldTypeId: number | string | null | undefined): boolean {
    if (!fieldTypeId) return false;
    const normalizedId = Number(fieldTypeId);
    if (!normalizedId) return false;
    const type = this.fieldTypes.find(t => t.id === normalizedId);
    return type?.typeName?.toLowerCase() === 'calculated';
  }

  /**
   * Extract dependent field codes from expression text
   */
  getDependentFields(): string[] {
    const expressionText = this.fieldForm.get('expressionText')?.value || '';
    if (!expressionText) return [];
    
    // Match field codes in square brackets: [FIELD_CODE]
    const fieldCodePattern = /\[([A-Za-z0-9_]+)\]/g;
    const matches = expressionText.matchAll(fieldCodePattern);
    const fieldCodes = Array.from(matches, (match: RegExpMatchArray) => match[1]);
    
    // Remove duplicates
    return [...new Set(fieldCodes)];
  }

  /**
   * Load all fields from all tabs for expression builder
   */
  loadAllFormFields(): void {
    if (!this.formBuilderId) return;

    // Load all tabs for this form
    this.tabsService.getTabs(this.formBuilderId).subscribe({
      next: (tabs) => {
        if (!tabs || tabs.length === 0) {
          this.allFormFields = [];
          return;
        }

        // Load fields for each tab
        const fieldObservables = tabs.map(tab =>
          this.fieldsService.getFields(this.formBuilderId, tab.id).pipe(
            catchError(() => of([]))
          )
        );

        // Wait for all fields to load
        forkJoin(fieldObservables).subscribe({
          next: (results) => {
            this.allFormFields = [];
            results.forEach(fields => {
              if (fields && fields.length > 0) {
                // Exclude calculated fields and the current field being edited
                const editableFields = fields.filter(f => {
                  const isCalculated = this.isCalculatedFieldType(f.fieldTypeId);
                  const isCurrentField = this.editingField && f.id === this.editingField.id;
                  return !isCalculated && !isCurrentField;
                });
                this.allFormFields.push(...editableFields);
              }
            });
            console.log('[FieldsList] Loaded all form fields for expression builder:', this.allFormFields.length);
          },
          error: (error) => {
            console.error('[FieldsList] Error loading all form fields:', error);
            this.allFormFields = [];
          }
        });
      },
      error: (error) => {
        console.error('[FieldsList] Error loading tabs for expression builder:', error);
        this.allFormFields = [];
      }
    });
  }

  /**
   * Add selected field to expression text
   */
  addFieldToExpression(fieldCode: string): void {
    if (!fieldCode) return;

    const currentExpression = this.fieldForm.get('expressionText')?.value || '';
    const fieldReference = `[${fieldCode}]`;
    
    // Add space before if expression is not empty and doesn't end with space
    const separator = currentExpression.trim() && !currentExpression.trim().endsWith(' ') ? ' ' : '';
    const newExpression = currentExpression + separator + fieldReference;
    
    this.fieldForm.patchValue({
      expressionText: newExpression
    });
  }

  /**
   * Add math operation to expression text
   */
  addOperationToExpression(operation: { symbol: string; name: string; nameEn: string; template?: string; category?: string }): void {
    if (!operation) return;

    const currentExpression = this.fieldForm.get('expressionText')?.value || '';
    let operationText = operation.template || operation.symbol;
    
    // Handle constants (PI, E)
    if (operation.category === 'constant') {
      operationText = operation.symbol;
    }
    
    // Add space before if expression is not empty and doesn't end with space or opening bracket
    const lastChar = currentExpression.trim().slice(-1);
    const needsSpace = currentExpression.trim() && 
                      lastChar !== ' ' && 
                      lastChar !== '(' && 
                      lastChar !== '[' &&
                      operation.symbol !== '(' &&
                      operation.symbol !== ')' &&
                      operation.symbol !== '[' &&
                      operation.symbol !== ']' &&
                      !['+', '-', '*', '/', '%', '^', '==', '!=', '>', '<', '>=', '<=', '&&', '||'].includes(operation.symbol);
    const separator = needsSpace ? ' ' : '';
    
    const newExpression = currentExpression + separator + operationText;
    
    this.fieldForm.patchValue({
      expressionText: newExpression
    });
    
    // Focus back to textarea
    setTimeout(() => {
      const textarea = document.querySelector('textarea[formControlName="expressionText"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        // Move cursor to end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  }

  /**
   * Get operations by category
   */
  getOperationsByCategory(category: string): any[] {
    return this.mathOperations.filter(op => op.category === category);
  }

  /**
   * Get all categories
   */
  getOperationCategories(): string[] {
    return [...new Set(this.mathOperations.map(op => op.category).filter(c => c))];
  }

  /**
   * Get available fields for expression builder (excluding calculated and current field)
   */
  getAvailableFieldsForExpression(): FormFieldDto[] {
    const currentFieldCode = this.fieldForm.get('fieldCode')?.value;
    return this.allFormFields.filter(f => {
      // Exclude calculated fields
      const isCalculated = this.isCalculatedFieldType(f.fieldTypeId);
      // Exclude current field being edited
      const isCurrentField = this.editingField && f.id === this.editingField.id;
      // Exclude if same field code (for new fields)
      const isSameCode = f.fieldCode === currentFieldCode;
      return !isCalculated && !isCurrentField && !isSameCode;
    });
  }


  /**
   * Toggle file extension selection
   */
  toggleFileExtension(extension: string): void {
    const index = this.selectedFileExtensions.indexOf(extension);
    if (index > -1) {
      this.selectedFileExtensions.splice(index, 1);
    } else {
      this.selectedFileExtensions.push(extension);
    }
    this.saveFileExtensionsToForm();
  }

  /**
   * Check if extension is selected
   */
  isExtensionSelected(extension: string): boolean {
    return this.selectedFileExtensions.includes(extension);
  }

  /**
   * Save selected extensions to form's defaultValueJson
   */
  saveFileExtensionsToForm(): void {
    // Only save selected extensions from custom extensions
    const selectedCustomExtensions = this.selectedFileExtensions.filter(ext => 
      this.customFileExtensions.includes(ext)
    );
    
    const fileConfig = {
      allowedExtensions: selectedCustomExtensions,
      customExtensions: this.customFileExtensions
    };
    
    const jsonString = JSON.stringify(fileConfig);
    console.log('[saveFileExtensionsToForm] Saving file config:', fileConfig);
    console.log('[saveFileExtensionsToForm] JSON string:', jsonString);
    
    this.fieldForm.patchValue({
      defaultValueJson: jsonString
    });
    
    console.log('[saveFileExtensionsToForm] Form defaultValueJson after patch:', this.fieldForm.get('defaultValueJson')?.value);
  }

  /**
   * Load file extensions from form's defaultValueJson
   */
  loadFileExtensionsFromForm(): void {
    const defaultValueJson = this.fieldForm.get('defaultValueJson')?.value;
    if (defaultValueJson) {
      try {
        const fileConfig = JSON.parse(defaultValueJson);
        if (fileConfig.allowedExtensions && Array.isArray(fileConfig.allowedExtensions)) {
          // All extensions are custom now
          this.customFileExtensions = fileConfig.allowedExtensions.map((ext: string) => 
            String(ext).toLowerCase().trim().replace(/^\./, '')
          ).filter((ext: string) => ext.length > 0);
          // Selected extensions are the same as custom extensions (all are selected by default)
          this.selectedFileExtensions = [...this.customFileExtensions];
        } else if (fileConfig.customExtensions && Array.isArray(fileConfig.customExtensions)) {
          this.customFileExtensions = fileConfig.customExtensions.map((ext: string) => 
            String(ext).toLowerCase().trim().replace(/^\./, '')
          ).filter((ext: string) => ext.length > 0);
          this.selectedFileExtensions = [...this.customFileExtensions];
        }
      } catch (e) {
        // Not a valid JSON, ignore
      }
    } else {
      this.selectedFileExtensions = [];
      this.customFileExtensions = [];
    }
  }

  /**
   * Get extension label based on current language
   */
  getExtensionLabel(extension: { value: string; label: string; labelAr: string }): string {
    return this.currentInputLanguage === 'ar' ? extension.labelAr : extension.label;
  }

  /**
   * Get accepted file types string for input accept attribute
   */
  getAcceptedFileTypes(): string {
    const allExtensions = this.selectedFileExtensions.filter(ext => this.customFileExtensions.includes(ext));
    if (allExtensions.length === 0) {
      return '*'; // Accept all if no restrictions
    }

    const customExts = allExtensions.map(ext => `.${ext.toLowerCase()}`);
    return customExts.join(',');
  }

  /**
   * Add custom file extension
   */
  addCustomExtension(): void {
    console.log('[addCustomExtension] Called with newCustomExtension:', this.newCustomExtension);
    
    if (!this.newCustomExtension || !this.newCustomExtension.trim()) {
      console.log('[addCustomExtension] Empty input, returning');
      return;
    }

    const ext = this.newCustomExtension.trim().toLowerCase().replace(/^\./, ''); // Remove leading dot if exists
    console.log('[addCustomExtension] Processed extension:', ext);
    
    if (!ext) {
      console.log('[addCustomExtension] Extension is empty after processing, returning');
      return;
    }

    // Validate extension (alphanumeric and some special chars)
    if (!/^[a-z0-9]+$/i.test(ext)) {
      console.log('[addCustomExtension] Extension validation failed');
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Extension',
        detail: 'Extension must contain only letters and numbers'
      });
      return;
    }

    // Check if already exists in local list
    if (this.customFileExtensions.includes(ext)) {
      console.log('[addCustomExtension] Extension already exists in local list:', ext);
      this.messageService.add({
        severity: 'warn',
        summary: 'Already Exists',
        detail: 'This extension is already added'
      });
      return;
    }

    // Check if attachment type already exists in database by code
    this.attachmentTypesService.getAttachmentTypeByCode(ext).subscribe({
      next: (existingType) => {
        // Extension already exists in database
        console.log('[addCustomExtension] Attachment type already exists in database:', existingType);
        // Still add to local lists if it exists in database but not in local list
    this.customFileExtensions.push(ext);
        if (!this.selectedFileExtensions.includes(ext)) {
          this.selectedFileExtensions.push(ext);
        }
    this.newCustomExtension = '';
    this.saveFileExtensionsToForm();
        this.cdr.detectChanges();
        this.messageService.add({
          severity: 'info',
          summary: 'Info',
          detail: 'Extension already exists in database, added to list'
        });
      },
      error: (error) => {
        // 404 means it doesn't exist, which is what we want
        if (error.status === 404 || error.message?.includes('not found')) {
          // Create new attachment type in database
          const createDto: CreateAttachmentTypeDto = {
            name: ext.toUpperCase(),
            code: ext.toLowerCase(),
            description: `File extension: .${ext.toUpperCase()}`,
            maxSizeMB: this.newCustomExtensionMaxSize || 10,
            isActive: true
          };

          console.log('[addCustomExtension] Creating attachment type:', createDto);
          
          this.attachmentTypesService.createAttachmentType(createDto).subscribe({
            next: (createdType) => {
              console.log('[addCustomExtension] Attachment type created successfully:', createdType);
              
              // Add extension to custom list
              this.customFileExtensions.push(ext);
              console.log('[addCustomExtension] Added to customFileExtensions. Current list:', this.customFileExtensions);
              
              // Automatically select the newly added extension
              if (!this.selectedFileExtensions.includes(ext)) {
                this.selectedFileExtensions.push(ext);
                console.log('[addCustomExtension] Added to selectedFileExtensions. Current list:', this.selectedFileExtensions);
              }
              
              // Clear input
              this.newCustomExtension = '';
              this.newCustomExtensionMaxSize = 10; // Reset to default
              
              // Save to form
              console.log('[addCustomExtension] Calling saveFileExtensionsToForm()');
              this.saveFileExtensionsToForm();
              
              // Force change detection
              this.cdr.detectChanges();
              
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Extension "${ext.toUpperCase()}" added successfully`
              });
              
              console.log('[addCustomExtension] Completed successfully');
            },
            error: (createError) => {
              console.error('[addCustomExtension] Error creating attachment type:', createError);
              const errorMessage = createError?.error?.message || createError?.message || 'Failed to create attachment type';
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
              });
            }
          });
        } else {
          // Other error occurred
          console.error('[addCustomExtension] Error checking attachment type:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to check if extension exists'
          });
        }
      }
    });
  }

  /**
   * Remove custom file extension
   */
  removeCustomExtension(ext: string): void {
    const index = this.customFileExtensions.indexOf(ext);
    if (index > -1) {
      // Try to delete attachment type from database
      this.attachmentTypesService.getAttachmentTypeByCode(ext).subscribe({
        next: (attachmentType) => {
          // Attachment type exists, delete it
          console.log('[removeCustomExtension] Deleting attachment type:', attachmentType);
          this.attachmentTypesService.deleteAttachmentType(attachmentType.id).subscribe({
            next: () => {
              console.log('[removeCustomExtension] Attachment type deleted successfully');
              this.removeExtensionFromLocalLists(ext);
            },
            error: (deleteError) => {
              console.error('[removeCustomExtension] Error deleting attachment type:', deleteError);
              // Still remove from local lists even if delete fails
              this.removeExtensionFromLocalLists(ext);
              const errorMessage = deleteError?.error?.message || deleteError?.message || 'Failed to delete attachment type from database';
              this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: `Extension removed from list, but ${errorMessage}`
              });
            }
          });
        },
        error: (error) => {
          // 404 means it doesn't exist in database, just remove from local lists
          if (error.status === 404 || error.message?.includes('not found')) {
            console.log('[removeCustomExtension] Attachment type not found in database, removing from local lists only');
            this.removeExtensionFromLocalLists(ext);
          } else {
            console.error('[removeCustomExtension] Error checking attachment type:', error);
            // Still remove from local lists
            this.removeExtensionFromLocalLists(ext);
          }
        }
      });
    }
  }

  /**
   * Helper method to remove extension from local lists
   */
  private removeExtensionFromLocalLists(ext: string): void {
    const index = this.customFileExtensions.indexOf(ext);
    if (index > -1) {
      this.customFileExtensions.splice(index, 1);
      // Also remove from selected if it was selected
      const selectedIndex = this.selectedFileExtensions.indexOf(ext);
      if (selectedIndex > -1) {
        this.selectedFileExtensions.splice(selectedIndex, 1);
      }
      this.saveFileExtensionsToForm();
      this.cdr.detectChanges();
    }
  }

  /**
   * Check if custom extension is selected
   */
  isCustomExtensionSelected(ext: string): boolean {
    return this.customFileExtensions.includes(ext);
  }

  addFieldOption(): void {
    const optionsArray = this.fieldOptionsFormArray;
    const newOption = this.fb.group({
      id: [null],
      optionValue: ['', Validators.required],
      optionText: ['', Validators.required],
      foreignOptionText: ['', Validators.maxLength(200)], // Arabic option text
      optionOrder: [optionsArray.length + 1]
      // Note: isDeleted defaults to false for new options (handled by backend)
    });
    optionsArray.push(newOption);
  }

  removeFieldOption(index: number): void {
    const optionsArray = this.fieldOptionsFormArray;
    if (optionsArray.length > index) {
      optionsArray.removeAt(index);
      // Update option orders
      optionsArray.controls.forEach((control, idx) => {
        control.patchValue({ optionOrder: idx + 1 });
      });
    }
  }

  /**
   * Load field options from database
   * IMPORTANT: Only loads options from database if DataSource is Static.
   * For Api or LookupTable DataSources, options come from external source (API/Database tables)
   * and should NOT be loaded from database. They are loaded dynamically when the form is displayed.
   */
  loadFieldOptions(fieldId: number): void {
    const optionsArray = this.fieldOptionsFormArray;
    // IMPORTANT: Only load options from database if DataSource is Static
    // For Api/LookupTable, options come from external source and should NOT be loaded from database
    if (this.dataSourceType && this.dataSourceType !== 'Static') {
      // Don't load options from database for Api/LookupTable DataSources
      // Options will be loaded from external source (API/Database) when form is displayed
      console.log(`[FieldsList] Skipping loading options from database for field ${fieldId}. DataSource type is ${this.dataSourceType}. Options will be loaded from external source.`);
      return;
    }

    // Clear existing options ONLY for Static (since we're about to repopulate from DB)
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }

    // Load options from API only for Static DataSource
    this.fieldOptionsService.getFieldOptionsByFieldId(fieldId).subscribe({
      next: (options: FieldOptionDto[]) => {
        options.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));
        options.forEach(option => {
          const optionGroup = this.fb.group({
            id: [option.id],
            optionValue: [option.optionValue, Validators.required],
            optionText: [option.optionText, Validators.required],
            foreignOptionText: [option.foreignOptionText || '', Validators.maxLength(200)],
            optionOrder: [option.optionOrder || optionsArray.length + 1]
            // Note: isDeleted is not managed via form
          });
          optionsArray.push(optionGroup);
        });
      },
      error: () => {
        // If field doesn't have options yet, that's okay
        console.log('No options found for field', fieldId);
      }
    });
  }

  /**
   * Save field options to database
   * IMPORTANT: Only saves options for Static DataSource.
   * For Api or LookupTable DataSources, options come from external source (API/Database tables)
   * and should NOT be saved to database. They are loaded dynamically when the form is displayed.
   */
  saveFieldOptions(fieldId: number, onSuccess?: () => void): void {
    // IMPORTANT: Only save options for Static DataSource
    // For Api or LookupTable, options come from external source and should NOT be saved
    if (this.dataSourceType !== 'Static') {
      console.warn(`[FieldsList] ⚠️ Attempted to save options for non-Static DataSource (${this.dataSourceType}). Options will NOT be saved.`);
      this.loading.save = false;
      this.loadFields();
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Options are not saved for Api/LookupTable DataSources. They are loaded from external source.' });
      if (!onSuccess) {
        this.closeFieldModal();
      }
      this.cdr.detectChanges();
      return;
    }

    const optionsArray = this.fieldOptionsFormArray;
    const options = optionsArray.value as FieldOptionDto[];

    if (options.length === 0) {
      if (onSuccess) {
        onSuccess();
      } else {
        this.loading.save = false;
        this.loadFields();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field saved successfully' });
        this.closeFieldModal();
        this.cdr.detectChanges();
      }
      return;
    }

    // Get existing options to determine which to delete/update/create
    this.fieldOptionsService.getFieldOptionsByFieldId(fieldId).subscribe({
      next: (existingOptions: FieldOptionDto[]) => {
        const existingIds = existingOptions.map(o => o.id).filter(id => id !== undefined) as number[];
        const newOptions = options.filter(o => !o.id);
        const updatedOptions = options.filter(o => o.id && existingIds.includes(o.id!));
        const deletedOptions = existingOptions.filter(o => o.id && !options.some(no => no.id === o.id));

        // Delete removed options
        const deletePromises = deletedOptions.map(opt =>
          opt.id ? this.fieldOptionsService.deleteFieldOption(opt.id).toPromise() : Promise.resolve()
        );

        Promise.all(deletePromises).then(() => {
          // Update existing options
          const updatePromises = updatedOptions.map(opt =>
            opt.id ? this.fieldOptionsService.updateFieldOption(opt.id, {
              optionValue: opt.optionValue,
              optionText: opt.optionText,
              foreignOptionText: opt.foreignOptionText || undefined,
              optionOrder: opt.optionOrder,
              isActive: opt.isActive
            }).toPromise() : Promise.resolve()
          );

          Promise.all(updatePromises).then(() => {
            // Create new options
            if (newOptions.length > 0) {
              const createDtos: CreateFieldOptionDto[] = newOptions.map(opt => ({
                fieldId: fieldId,
                optionValue: opt.optionValue,
                optionText: opt.optionText,
                foreignOptionText: opt.foreignOptionText || undefined,
                optionOrder: opt.optionOrder || 1,
                isActive: opt.isActive !== false
              }));

              this.fieldOptionsService.createBulkFieldOptions(createDtos).subscribe({
                next: () => {
                  if (onSuccess) {
                    onSuccess();
                  } else {
                    this.loading.save = false;
                    this.loadFields();
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
                    this.closeFieldModal();
                    this.cdr.detectChanges();
                  }
                },
                error: () => {
                  this.loading.save = false;
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field options' });
                }
              });
            } else {
              if (onSuccess) {
                onSuccess();
              } else {
                this.loading.save = false;
                this.loadFields();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
                this.closeFieldModal();
                this.cdr.detectChanges();
              }
            }
          });
        });
      },
      error: () => {
        // If no existing options, just create new ones
        const createDtos: CreateFieldOptionDto[] = options.map(opt => ({
          fieldId: fieldId,
          optionValue: opt.optionValue,
          optionText: opt.optionText,
          foreignOptionText: opt.foreignOptionText || undefined,
          optionOrder: opt.optionOrder || 1,
          isActive: opt.isActive !== false
        }));

        this.fieldOptionsService.createBulkFieldOptions(createDtos).subscribe({
          next: () => {
            if (onSuccess) {
              onSuccess();
            } else {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
              this.closeFieldModal();
              this.cdr.detectChanges();
            }
          },
          error: () => {
            this.loading.save = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field options' });
          }
        });
      }
    });
  }

  private resetSapIntegrationSelection(): void {
    this.sapIntegrationEnabled = false;
    this.sapFieldName = '';
    this.sapRequestLevel = 'Header';
    this.selectedSapConnectionId = null;
    this.sapEndpointOptions = [];
    this.loadingSapEndpointOptions = false;
    this.sapEndpointName = '';
    this.sapSelectedEndpointOption = '';
    this.sapCustomEndpointMode = false;
    this.sapCustomEndpointName = '';
    this.sapObjectFields = [];
    this.loadingSapObjectFields = false;
    this.loadingSapReLogin = false;
    this.sapMetadataUrl = '';
    this.sapHttpMethod = 'POST';
    this.sapExecutionMode = 'OnSubmit';
    this.sapWorkflowStages = [];
    this.loadingSapWorkflowStages = false;
    this.sapTriggerStageId = null;
  }

  private loadFormDocumentTypeId(): void {
    if (!this.formBuilderId || !this.canLoadFieldManagementIntegrations()) {
      return;
    }

    this.formsService.getFormById(this.formBuilderId).subscribe({
      next: (form) => {
        const resolvedDocumentTypeId = Number(form?.documentTypeId || 0) || null;
        this.sapDocumentTypeId = resolvedDocumentTypeId;
        if (!this.sapDocumentTypeId) {
          this.resolveDocumentTypeIdFallback();
        }

        const formMode = form?.sapExecutionMode;
        if (formMode === 'OnSubmit' || formMode === 'OnFinalApproval' || formMode === 'OnSpecificWorkflowStage') {
          this.sapExecutionMode = formMode;
        }

        if (this.canLoadFieldManagementIntegrations()) {
          this.loadSapWorkflowStages();
        }
      },
      error: () => {
        this.sapDocumentTypeId = null;
        this.sapWorkflowStages = [];
        this.sapTriggerStageId = null;
        this.resolveDocumentTypeIdFallback();
      }
    });
  }

  private resolveDocumentTypeIdFallback(): void {
    if (!this.formBuilderId || !this.canLoadFieldManagementIntegrations()) {
      return;
    }

    this.documentTypesService.getDocumentTypeByFormId(this.formBuilderId).subscribe({
      next: (docType) => {
        const fallbackId = Number(docType?.id || 0) || null;
        if (!fallbackId) {
          return;
        }

        this.sapDocumentTypeId = fallbackId;
        if (this.canLoadFieldManagementIntegrations()) {
          this.loadSapDefaults();
          this.loadSapWorkflowStages();
        }
      },
      error: () => {
        // no-op: keep existing behavior if fallback also fails
      }
    });
  }

  private loadSapConnections(): void {
    if (!this.canLoadFieldManagementIntegrations()) {
      this.sapConnections = [];
      this.loadingSapConnections = false;
      return;
    }

    if (this.sapConnections.length > 0) {
      return;
    }

    this.loadingSapConnections = true;
    this.sapIntegrationService.getSapConfigs(true).subscribe({
      next: (connections) => {
        this.sapConnections = (connections || [])
          .filter(c => c.integrationType !== 'HanaOdbc')
          .sort((a, b) => Number(b.isActive === true) - Number(a.isActive === true));
        this.ensureDataSourceSapConnectionSelected();
        this.loadingSapConnections = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sapConnections = [];
        this.loadingSapConnections = false;
      }
    });
  }

  private loadSapDefaults(): void {
    if (!this.canLoadFieldManagementIntegrations()) {
      return;
    }

    if (!this.sapDocumentTypeId || this.sapDocumentTypeId <= 0) {
      return;
    }

    this.sapIntegrationService.getSettings(this.sapDocumentTypeId).subscribe({
      next: (settings) => {
        if (!settings) {
          return;
        }

        if (!this.selectedSapConnectionId && settings.sapConfigId) {
          this.selectedSapConnectionId = settings.sapConfigId;
        }
        if (this.selectedSapConnectionId) {
          this.loadSapEndpointOptions(this.selectedSapConnectionId);
        }

        if (!this.sapEndpointName && settings.targetEndpoint) {
          this.sapEndpointName = this.normalizeSapEndpointName(settings.targetEndpoint);
        }
        this.loadSapObjectFieldsForCurrentSelection();

        const method = settings.httpMethod as 'GET' | 'POST' | 'PUT' | undefined;
        if (method && this.sapHttpMethodOptions.includes(method)) {
          this.sapHttpMethod = method;
        }

        if (settings.executionMode) {
          const mode = settings.executionMode as SapExecutionMode;
          if (this.sapExecutionModeOptions.some(x => x.value === mode)) {
            this.sapExecutionMode = mode;
          }
        }
        this.sapTriggerStageId = settings.triggerStageId ?? null;
        this.loadSapWorkflowStages();
      },
      error: () => {
        // no saved settings yet
      }
    });
  }

  onSapIntegrationToggle(enabled: boolean): void {
    if (enabled && !this.selectedSapConnectionId && this.sapConnections.length > 0) {
      const active = this.sapConnections.find(c => c.isActive === true);
      this.selectedSapConnectionId = active?.id ?? this.sapConnections[0].id;
    }
    if (enabled) {
      this.onSapConnectionChange();
      this.loadSapWorkflowStages();
    }
  }

  onSapConnectionChange(): void {
    if (!this.selectedSapConnectionId) {
      this.sapEndpointOptions = [];
      this.sapObjectFields = [];
      this.sapSelectedEndpointOption = '';
      this.sapCustomEndpointMode = false;
      this.sapCustomEndpointName = '';
      return;
    }

    this.autoReloginAndReloadSapMetadata();
  }

  onSapEndpointBlur(): void {
    this.sapEndpointName = this.normalizeSapEndpointName(this.sapEndpointName);
    if (this.sapCustomEndpointMode) {
      this.sapCustomEndpointName = this.sapEndpointName;
    }
  }

  onSapEndpointChanged(): void {
    if (!this.selectedSapConnectionId || !this.normalizeSapEndpointName(this.sapEndpointName)) {
      this.sapObjectFields = [];
    }
  }

  onSapEndpointSend(): void {
    if (!this.selectedSapConnectionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select SAP connection first.'
      });
      return;
    }

    this.sapEndpointName = this.normalizeSapEndpointName(this.sapEndpointName);
    if (!this.sapEndpointName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter SAP API URL or object name first.'
      });
      return;
    }

    this.autoReloginAndReloadSapMetadata();
  }

  onSapEndpointOptionChange(): void {
    if (this.sapSelectedEndpointOption === '__custom__') {
      this.sapCustomEndpointMode = true;
      this.sapEndpointName = this.normalizeSapEndpointName(this.sapCustomEndpointName);
      this.onSapEndpointChanged();
      return;
    }

    this.sapCustomEndpointMode = false;
    this.sapCustomEndpointName = '';
    this.sapEndpointName = this.normalizeSapEndpointName(this.sapSelectedEndpointOption);
    this.onSapEndpointChanged();
  }

  onSapCustomEndpointChanged(): void {
    this.sapEndpointName = this.normalizeSapEndpointName(this.sapCustomEndpointName);
    this.onSapEndpointChanged();
  }

  onSapExecutionModeChange(): void {
    if (this.sapExecutionMode === 'OnSpecificWorkflowStage') {
      this.loadSapWorkflowStages();
      return;
    }

    this.sapTriggerStageId = null;
  }

  getSelectedSapConnectionBaseUrl(): string {
    const selected = this.sapConnections.find(c => c.id === this.selectedSapConnectionId);
    return (selected?.baseUrl || '').trim();
  }

  getResolvedSapEndpointUrl(): string {
    const baseUrl = this.getSelectedSapConnectionBaseUrl().replace(/\/+$/, '');
    const endpoint = this.normalizeSapEndpointName(this.sapEndpointName);
    if (!baseUrl || !endpoint) {
      return '';
    }
    return `${baseUrl}/${endpoint}`;
  }

  onSapMetadataSend(): void {
    const metadataUrl = (this.sapMetadataUrl || '').trim();
    if (!metadataUrl) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter metadata URL first.'
      });
      return;
    }

    if (!metadataUrl.startsWith('http://') && !metadataUrl.startsWith('https://')) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Metadata URL must start with http:// or https://.'
      });
      return;
    }

    this.loadingSapObjectFields = true;
    this.fieldDataSourceService.previewDataSource({
      fieldId: this.editingField?.id || 0,
      sapConfigId: this.selectedSapConnectionId ?? undefined,
      sourceType: 'Api',
      apiUrl: metadataUrl,
      httpMethod: 'GET',
      valuePath: 'Name',
      textPath: 'Name'
    }).subscribe({
      next: (options) => {
        const names = Array.from(new Set((options || [])
          .map(x => String(x?.value ?? x?.text ?? '').trim())
          .filter(x => !!x)))
          .sort((a, b) => a.localeCompare(b));

        this.sapObjectFields = names.map(name => ({
          name,
          type: '',
          nullable: true
        }));

        if (this.sapFieldName && !names.includes(this.sapFieldName)) {
          this.sapFieldName = '';
        }

        this.loadingSapObjectFields = false;
        this.messageService.add({
          severity: 'success',
          summary: 'SAP Metadata',
          detail: `Loaded ${this.sapObjectFields.length} properties from metadata.`
        });
      },
      error: (error) => {
        this.sapObjectFields = [];
        this.loadingSapObjectFields = false;
        this.messageService.add({
          severity: 'error',
          summary: 'SAP Metadata',
          detail: this.extractErrorMessage(error) || 'Failed to load properties from metadata URL.'
        });
      }
    });
  }

  onSapReLogin(): void {
    if (!this.selectedSapConnectionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'SAP Integration',
        detail: 'Please select SAP connection first.'
      });
      return;
    }

    this.loadingSapReLogin = true;
    this.sapIntegrationService.reloginConnection(this.selectedSapConnectionId).subscribe({
      next: () => {
        this.loadingSapReLogin = false;
        this.messageService.add({
          severity: 'success',
          summary: 'SAP Integration',
          detail: 'SAP re-login successful.'
        });
        this.loadSapEndpointOptions(this.selectedSapConnectionId!);
        this.loadSapObjectFieldsForCurrentSelection();
      },
      error: (error) => {
        this.loadingSapReLogin = false;
        this.messageService.add({
          severity: 'error',
          summary: 'SAP Integration',
          detail: this.extractErrorMessage(error) || 'SAP re-login failed.'
        });
      }
    });
  }

  private autoReloginAndReloadSapMetadata(): void {
    if (!this.selectedSapConnectionId) {
      this.sapEndpointOptions = [];
      this.sapObjectFields = [];
      return;
    }

    const sapConfigId = this.selectedSapConnectionId;
    this.loadingSapReLogin = true;
    this.sapIntegrationService.reloginConnection(sapConfigId).subscribe({
      next: () => {
        this.loadingSapReLogin = false;
        this.loadSapEndpointOptions(sapConfigId);
        this.loadSapObjectFieldsForCurrentSelection();
      },
      error: () => {
        // Keep UI responsive even if relogin fails; still try to load metadata/endpoints.
        this.loadingSapReLogin = false;
        this.loadSapEndpointOptions(sapConfigId);
        this.loadSapObjectFieldsForCurrentSelection();
      }
    });
  }

  private normalizeSapEndpointName(raw: string | null | undefined): string {
    const value = (raw || '').trim();
    if (!value) {
      return '';
    }

    let cleaned = value;
    const marker = '/b1s/v1/';
    const markerIdx = cleaned.toLowerCase().indexOf(marker);
    if (markerIdx >= 0) {
      cleaned = cleaned.substring(markerIdx + marker.length);
    }

    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      try {
        const url = new URL(cleaned);
        const path = url.pathname || '';
        const pathMarkerIdx = path.toLowerCase().indexOf(marker);
        cleaned = pathMarkerIdx >= 0 ? path.substring(pathMarkerIdx + marker.length) : path;
      } catch {
        // leave as-is
      }
    }

    cleaned = cleaned.split('?')[0].split('#')[0];
    cleaned = cleaned.replace(/^\/+/, '').replace(/\/+$/, '');
    return cleaned;
  }

  private setDefaultSapMetadataUrlFromConnection(): void {
    const base = this.getSelectedSapConnectionBaseUrl().replace(/\/+$/, '');
    if (!base) {
      this.sapMetadataUrl = '';
      return;
    }

    if (!this.sapMetadataUrl || this.sapMetadataUrl.includes('$metadata')) {
      this.sapMetadataUrl = `${base}/$metadata`;
    }
  }

  private loadSapEndpointOptions(sapConfigId: number): void {
    if (!sapConfigId) {
      this.sapEndpointOptions = [];
      return;
    }

    this.loadingSapEndpointOptions = true;
    this.sapIntegrationService.getServiceLayerEndpoints(sapConfigId).subscribe({
      next: (endpoints) => {
        this.sapEndpointOptions = endpoints || [];
        this.syncSapEndpointSelectionState();
        this.loadingSapEndpointOptions = false;
      },
      error: () => {
        this.sapEndpointOptions = [];
        this.syncSapEndpointSelectionState();
        this.loadingSapEndpointOptions = false;
      }
    });
  }

  private syncSapEndpointSelectionState(): void {
    const normalizedCurrent = this.normalizeSapEndpointName(this.sapEndpointName);
    if (!normalizedCurrent) {
      this.sapSelectedEndpointOption = '';
      this.sapCustomEndpointMode = false;
      this.sapCustomEndpointName = '';
      return;
    }

    const matched = this.sapEndpointOptions.find(
      x => this.normalizeSapEndpointName(x?.name) === normalizedCurrent
    );

    if (matched?.name) {
      this.sapSelectedEndpointOption = matched.name;
      this.sapCustomEndpointMode = false;
      this.sapCustomEndpointName = '';
      this.sapEndpointName = this.normalizeSapEndpointName(matched.name);
      return;
    }

    this.sapSelectedEndpointOption = '__custom__';
    this.sapCustomEndpointMode = true;
    this.sapCustomEndpointName = normalizedCurrent;
    this.sapEndpointName = normalizedCurrent;
  }

  private loadSapObjectFieldsForCurrentSelection(): void {
    const sapConfigId = this.selectedSapConnectionId;
    const endpointName = this.normalizeSapEndpointName(this.sapEndpointName);
    if (!sapConfigId || !endpointName) {
      this.sapObjectFields = [];
      return;
    }

    this.loadSapObjectFields(sapConfigId, endpointName);
  }

  private loadSapObjectFields(sapConfigId: number, endpointName: string): void {
    if (!sapConfigId || !endpointName) {
      this.sapObjectFields = [];
      return;
    }

    this.loadingSapObjectFields = true;
    this.sapIntegrationService.getServiceLayerObjectFields(sapConfigId, endpointName).subscribe({
      next: (fields) => {
        this.sapObjectFields = fields || [];
        this.syncSapFieldNameWithOptions();
        this.loadingSapObjectFields = false;
      },
      error: () => {
        this.sapObjectFields = [];
        this.loadingSapObjectFields = false;
      }
    });
  }

  private syncSapFieldNameWithOptions(): void {
    const current = (this.sapFieldName || '').trim();
    if (!current || !this.sapObjectFields?.length) {
      return;
    }

    const match = this.sapObjectFields.find(
      f => (f?.name || '').trim().toLowerCase() === current.toLowerCase()
    );

    if (match?.name && match.name !== this.sapFieldName) {
      this.sapFieldName = match.name;
    }
  }

  isCurrentSapFieldMissingFromOptions(): boolean {
    const current = (this.sapFieldName || '').trim();
    if (!current) {
      return false;
    }

    return !this.sapObjectFields.some(
      f => (f?.name || '').trim().toLowerCase() === current.toLowerCase()
    );
  }

  private normalizeSapRequestLevel(level: string | null | undefined): SapRequestLevel {
    return (level || '').trim().toLowerCase() === 'line' ? 'Line' : 'Header';
  }

  private extractErrorMessage(error: any): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error?.error === 'string') return error.error;
    if (typeof error?.error?.message === 'string') return error.error.message;
    if (typeof error?.message === 'string') return error.message;
    return '';
  }

  private loadSapWorkflowStages(): void {
    if (!this.canLoadFieldManagementIntegrations()) {
      this.sapWorkflowStages = [];
      this.sapTriggerStageId = null;
      this.loadingSapWorkflowStages = false;
      return;
    }

    if (!this.sapDocumentTypeId || this.sapDocumentTypeId <= 0) {
      this.sapWorkflowStages = [];
      this.sapTriggerStageId = null;
      return;
    }

    this.loadingSapWorkflowStages = true;
    this.approvalWorkflowService.getActiveApprovalWorkflowsByDocumentTypeId(this.sapDocumentTypeId).subscribe({
      next: (workflows) => {
        const activeWorkflowIds = (workflows || [])
          .filter(w => w?.id > 0 && w.isActive !== false)
          .map(w => w.id);

        if (!activeWorkflowIds.length) {
          this.sapWorkflowStages = [];
          this.sapTriggerStageId = null;
          this.loadingSapWorkflowStages = false;
          return;
        }

        const stageCalls = activeWorkflowIds.map(workflowId =>
          this.approvalStageService.getAllByWorkflowId(workflowId).pipe(
            catchError(() => of([] as ApprovalStageDto[]))
          )
        );

        forkJoin(stageCalls).subscribe({
          next: (results) => {
            const stageMap = new Map<number, ApprovalStageDto>();
            (results || []).flat().forEach(stage => {
              if (!stage?.id || stage.isDeleted || stage.isActive === false) {
                return;
              }
              stageMap.set(stage.id, stage);
            });

            this.sapWorkflowStages = Array.from(stageMap.values()).sort((a, b) => {
              const orderCompare = (a.stageOrder || 0) - (b.stageOrder || 0);
              if (orderCompare !== 0) {
                return orderCompare;
              }
              return (a.stageName || '').localeCompare(b.stageName || '');
            });

            if (this.sapTriggerStageId && !this.sapWorkflowStages.some(s => s.id === this.sapTriggerStageId)) {
              this.sapTriggerStageId = null;
            }

            this.loadingSapWorkflowStages = false;
          },
          error: () => {
            this.sapWorkflowStages = [];
            this.sapTriggerStageId = null;
            this.loadingSapWorkflowStages = false;
          }
        });
      },
      error: () => {
        this.sapWorkflowStages = [];
        this.sapTriggerStageId = null;
        this.loadingSapWorkflowStages = false;
      }
    });
  }

  private loadSapIntegrationMapping(fieldId?: number): void {
    if (!fieldId || !this.formBuilderId) {
      this.resetSapIntegrationSelection();
      return;
    }

    this.sapIntegrationService.getFieldMappings(this.formBuilderId).subscribe({
      next: (mappings) => {
        const current = (mappings || []).find(m => m.formFieldId === fieldId);
        if (current && current.sapFieldName?.trim()) {
          this.sapIntegrationEnabled = current.isActive !== false;
          this.sapFieldName = current.sapFieldName.trim();
          this.sapRequestLevel = this.normalizeSapRequestLevel(current.requestLevel);
          this.selectedSapConnectionId = current.sapConfigId ?? this.selectedSapConnectionId;
          if (!this.selectedSapConnectionId && this.sapConnections.length > 0) {
            const active = this.sapConnections.find(c => c.isActive === true);
            this.selectedSapConnectionId = active?.id ?? this.sapConnections[0].id;
          }
          if (this.selectedSapConnectionId) {
            this.loadSapEndpointOptions(this.selectedSapConnectionId);
            this.loadSapObjectFieldsForCurrentSelection();
          }
        } else {
          this.resetSapIntegrationSelection();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.resetSapIntegrationSelection();
      }
    });
  }

  private async saveSapIntegrationMapping(fieldId: number): Promise<void> {
    if (!this.formBuilderId || !fieldId || !this.sapIntegrationEnabled) {
      return;
    }

    const sapFieldName = (this.sapFieldName || '').trim();

    return new Promise((resolve) => {
      this.sapIntegrationService.getFieldMappings(this.formBuilderId).subscribe({
        next: (existingMappings) => {
          const preservedMappings = (existingMappings || [])
            .filter(m => m.formFieldId !== fieldId && !!m.sapFieldName?.trim())
            .map(m => ({
              formFieldId: m.formFieldId,
              sapFieldName: m.sapFieldName.trim(),
              requestLevel: this.normalizeSapRequestLevel(m.requestLevel),
              isActive: m.isActive !== false,
              sapConfigId: m.sapConfigId ?? undefined
            }));

          if (this.sapIntegrationEnabled && sapFieldName) {
            preservedMappings.push({
              formFieldId: fieldId,
              sapFieldName,
              requestLevel: this.normalizeSapRequestLevel(this.sapRequestLevel),
              isActive: true,
              sapConfigId: this.selectedSapConnectionId ?? undefined
            });
          }

          this.sapIntegrationService.saveFieldMappings({
            formBuilderId: this.formBuilderId,
            mappings: preservedMappings
          }).subscribe({
            next: () => resolve(),
            error: () => {
              this.messageService.add({
                severity: 'warn',
                summary: 'SAP Integration',
                detail: 'Field saved, but SAP mapping was not updated.'
              });
              resolve();
            }
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'warn',
            summary: 'SAP Integration',
            detail: 'Field saved, but SAP mapping could not be loaded.'
          });
          resolve();
        }
      });
    });
  }

  private completeFieldModalSave(fieldId: number, successMessage: string): void {
    const sapTasks: Array<Promise<void>> = [];

    if (this.sapIntegrationEnabled) {
      sapTasks.push(this.saveSapIntegrationMapping(fieldId));
      sapTasks.push(this.saveSapIntegrationSettings());
    }

    Promise.all(sapTasks).finally(() => {
        this.loading.save = false;
        this.loadFields();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: successMessage });
        this.closeFieldModal();
        this.cdr.detectChanges();
      });
  }

  private async saveSapIntegrationSettings(): Promise<void> {
    if (!this.sapIntegrationEnabled) {
      return;
    }

    const endpoint = this.normalizeSapEndpointName(this.sapEndpointName);
    if (!this.sapDocumentTypeId || !this.selectedSapConnectionId || !endpoint) {
      return;
    }
    const triggerStageId = this.sapExecutionMode === 'OnSpecificWorkflowStage'
      ? this.sapTriggerStageId
      : null;

    return new Promise((resolve) => {
      this.sapIntegrationService.getSettings(this.sapDocumentTypeId!).subscribe({
        next: (existing) => {
          this.sapIntegrationService.upsertSettings({
            documentTypeId: this.sapDocumentTypeId!,
            sapConfigId: this.selectedSapConnectionId!,
            targetEndpoint: endpoint,
            httpMethod: this.sapHttpMethod,
            targetObject: existing?.targetObject || endpoint,
            executionMode: this.sapExecutionMode,
            triggerStageId: triggerStageId,
            blockWorkflowOnError: existing?.blockWorkflowOnError ?? false,
            isActive: existing?.isActive ?? true
          }).subscribe({
            next: () => resolve(),
            error: () => {
              this.messageService.add({
                severity: 'warn',
                summary: 'SAP Integration',
                detail: 'Field saved, but SAP endpoint settings were not updated.'
              });
              resolve();
            }
          });
        },
        error: () => {
          this.sapIntegrationService.upsertSettings({
            documentTypeId: this.sapDocumentTypeId!,
            sapConfigId: this.selectedSapConnectionId!,
            targetEndpoint: endpoint,
            httpMethod: this.sapHttpMethod,
            targetObject: endpoint,
            executionMode: this.sapExecutionMode,
            triggerStageId: triggerStageId,
            blockWorkflowOnError: false,
            isActive: true
          }).subscribe({
            next: () => resolve(),
            error: () => {
              this.messageService.add({
                severity: 'warn',
                summary: 'SAP Integration',
                detail: 'Field saved, but SAP endpoint settings were not updated.'
              });
              resolve();
            }
          });
        }
      });
    });
  }

  deleteAllFieldOptions(fieldId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fieldOptionsService.getFieldOptionsByFieldId(fieldId).subscribe({
        next: (options: FieldOptionDto[]) => {
          if (options.length === 0) {
            resolve();
            return;
          }

          const deletePromises = options
            .filter(opt => opt.id !== undefined)
            .map(opt => this.fieldOptionsService.deleteFieldOption(opt.id!).toPromise());

          Promise.all(deletePromises).then(() => resolve()).catch(reject);
        },
        error: () => resolve() // If no options exist, that's fine
      });
    });
  }

  // ================= GOOGLE FORMS STYLE METHODS ================

  onFormTitleChange(event: any): void {
    // Handle form title change if needed
    const newTitle = event.target.textContent;
    console.log('Form title changed:', newTitle);
  }

  onFormDescriptionChange(event: any): void {
    // Handle form description change if needed
    const newDescription = event.target.textContent;
    console.log('Form description changed:', newDescription);
  }

  updateFieldName(fieldId: number, event: any): void {
    const newName = event.target.value;
    if (!newName || newName.trim() === '') return;

    const field = this.fields.find(f => f.id === fieldId);
    if (!field || field.fieldName === newName) return;

    const updateDto: UpdateFormFieldDto = {
      tabId: field.tabId,
      fieldTypeId: field.fieldTypeId,
      fieldName: newName,
      foreignFieldName: field.foreignFieldName || undefined,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder,
      placeholder: field.placeholder || undefined,
      foreignPlaceholder: field.foreignPlaceholder || undefined,
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || undefined,
      isMandatory: field.isMandatory ?? null,
      isEditable: field.isEditable ?? null,
      isVisible: field.isVisible ?? null,
      isActive: field.isActive !== false, // Preserve isActive
      defaultValueJson: field.defaultValueJson || undefined,
      regexPattern: field.regexPattern || undefined,
      validationMessage: field.validationMessage || undefined,
      foreignValidationMessage: field.foreignValidationMessage || undefined,
      gridId: field.gridId || undefined,
      minValue: field.minValue !== null && field.minValue !== undefined ? field.minValue : undefined,
      maxValue: field.maxValue !== null && field.maxValue !== undefined ? field.maxValue : undefined,
      // Preserve calculation properties
      expressionText: field.expressionText || undefined,
      calculationMode: field.calculationMode || undefined,
      calculationOperation: field.calculationOperation || undefined,
      recalculateOn: field.recalculateOn || undefined,
      resultType: field.resultType || undefined
    };

    this.fieldsService.updateField(fieldId, updateDto).subscribe({
      next: () => {
        field.fieldName = newName;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Field name updated'
        });
      },
      error: () => {
        event.target.value = field.fieldName; // Revert on error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update field name'
        });
      }
    });
  }

  changeFieldType(fieldId: number, event: any): void {
    const newTypeId = Number(event.target.value);
    const field = this.fields.find(f => f.id === fieldId);
    if (!field || field.fieldTypeId === newTypeId) return;

    const updateDto: UpdateFormFieldDto = {
      tabId: field.tabId,
      fieldTypeId: newTypeId,
      fieldName: field.fieldName,
      foreignFieldName: field.foreignFieldName || undefined,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder,
      placeholder: field.placeholder || undefined,
      foreignPlaceholder: field.foreignPlaceholder || undefined,
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || undefined,
      isMandatory: field.isMandatory ?? null,
      isEditable: field.isEditable ?? null,
      isVisible: field.isVisible ?? null,
      isActive: field.isActive !== false, // Preserve isActive
      defaultValueJson: field.defaultValueJson || undefined,
      regexPattern: field.regexPattern || undefined,
      validationMessage: field.validationMessage || undefined,
      foreignValidationMessage: field.foreignValidationMessage || undefined,
      gridId: field.gridId || undefined,
      minValue: field.minValue !== null && field.minValue !== undefined ? field.minValue : undefined,
      maxValue: field.maxValue !== null && field.maxValue !== undefined ? field.maxValue : undefined,
      // Preserve calculation properties
      expressionText: field.expressionText || undefined,
      calculationMode: field.calculationMode || undefined,
      calculationOperation: field.calculationOperation || undefined,
      recalculateOn: field.recalculateOn || undefined,
      resultType: field.resultType || undefined
    };

    this.fieldsService.updateField(fieldId, updateDto).subscribe({
      next: () => {
        field.fieldTypeId = newTypeId;
        // Reload field with options if new type supports options
        this.loadFields();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Field type updated'
        });
      },
      error: () => {
        event.target.value = field.fieldTypeId; // Revert on error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update field type'
        });
      }
    });
  }

  updateOptionText(fieldId: number, optionId: number | undefined, event: any): void {
    if (!optionId) return;
    const newText = event.target.value;
    if (!newText || newText.trim() === '') return;

    const field = this.fields.find(f => f.id === fieldId);
    if (!field || !field.fieldOptions) return;

    const option = field.fieldOptions.find(o => o.id === optionId);
    if (!option || option.optionText === newText) return;

    this.fieldOptionsService.updateFieldOption(optionId, {
      optionText: newText,
      optionValue: option.optionValue,
      optionOrder: option.optionOrder,
      isActive: option.isActive
    }).subscribe({
      next: () => {
        option.optionText = newText;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Option updated'
        });
      },
      error: () => {
        event.target.value = option.optionText; // Revert on error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update option'
        });
      }
    });
  }

  addOptionToField(fieldId: number): void {
    const field = this.fields.find(f => f.id === fieldId);
    if (!field) return;

    const nextOrder = field.fieldOptions && field.fieldOptions.length > 0
      ? Math.max(...field.fieldOptions.map(o => o.optionOrder || 0)) + 1
      : 1;

    const createDto: CreateFieldOptionDto = {
      fieldId: fieldId,
      optionValue: `option_${nextOrder}`,
      optionText: `Option ${nextOrder}`,
      optionOrder: nextOrder,
      isActive: true
    };

    this.fieldOptionsService.createFieldOption(createDto).subscribe({
      next: () => {
        this.loadFields();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Option added'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add option'
        });
      }
    });
  }

  removeOption(fieldId: number, optionId: number | undefined): void {
    if (!optionId) return;

    this.confirmationService.confirm({
      message: 'Are you sure you want to remove this option?',
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fieldOptionsService.deleteFieldOption(optionId).subscribe({
          next: () => {
            this.loadFields();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Option removed'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to remove option'
            });
          }
        });
      }
    });
  }

  addOtherOption(fieldId: number): void {
    const field = this.fields.find(f => f.id === fieldId);
    if (!field) return;

    const createDto: CreateFieldOptionDto = {
      fieldId: fieldId,
      optionValue: 'other',
      optionText: 'Other',
      optionOrder: (field.fieldOptions?.length || 0) + 1,
      isActive: true
    };

    this.fieldOptionsService.createFieldOption(createDto).subscribe({
      next: () => {
        this.loadFields();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: '"Other" option added'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add "Other" option'
        });
      }
    });
  }

  hasOtherOption(field: FormFieldDto): boolean {
    return field.fieldOptions?.some(o => o.optionValue?.toLowerCase() === 'other') || false;
  }

  toggleRequired(fieldId: number, event: any): void {
    const isRequired = event.target.checked;
    const field = this.fields.find(f => f.id === fieldId);
    if (!field) return;

    const updateDto: UpdateFormFieldDto = {
      tabId: field.tabId,
      fieldTypeId: field.fieldTypeId,
      fieldName: field.fieldName,
      foreignFieldName: field.foreignFieldName || undefined,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder,
      placeholder: field.placeholder || undefined,
      foreignPlaceholder: field.foreignPlaceholder || undefined,
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || undefined,
      isMandatory: isRequired,
      isEditable: field.isEditable ?? null,
      isVisible: field.isVisible ?? null,
      isActive: field.isActive !== false, // Preserve isActive
      defaultValueJson: field.defaultValueJson || undefined,
      regexPattern: field.regexPattern || undefined,
      validationMessage: field.validationMessage || undefined,
      foreignValidationMessage: field.foreignValidationMessage || undefined,
      gridId: field.gridId || undefined,
      minValue: field.minValue !== null && field.minValue !== undefined ? field.minValue : undefined,
      maxValue: field.maxValue !== null && field.maxValue !== undefined ? field.maxValue : undefined,
      // Preserve calculation properties
      expressionText: field.expressionText || undefined,
      calculationMode: field.calculationMode || undefined,
      calculationOperation: field.calculationOperation || undefined,
      recalculateOn: field.recalculateOn || undefined,
      resultType: field.resultType || undefined
    };

    this.fieldsService.updateField(fieldId, updateDto).subscribe({
      next: () => {
        field.isMandatory = isRequired;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: isRequired ? 'Field marked as required' : 'Field marked as optional'
        });
      },
      error: () => {
        event.target.checked = !isRequired; // Revert on error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update field'
        });
      }
    });
  }

  openFieldSettings(field: FormFieldDto): void {
    this.editingField = field;
    this.showFieldSettingsModal = true;

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: field.fieldName || '',
      foreignFieldName: field.foreignFieldName || '',
      fieldCode: field.fieldCode || '',
      fieldOrder: field.fieldOrder || 1,
      placeholder: field.placeholder || '',
      foreignPlaceholder: field.foreignPlaceholder || '',
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      defaultValue: field.defaultValueJson || '',
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      foreignValidationMessage: field.foreignValidationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null
    });

    // Load field options
    this.loadFieldOptions(field.id);
  }

  closeFieldSettingsModal(): void {
    this.showFieldSettingsModal = false;
    this.editingField = null;
  }

  saveFieldSettings(): void {
    if (!this.editingField) return;

    if (this.fieldForm.invalid) {
      this.markFormGroupTouched(this.fieldForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const fieldData = this.fieldForm.value;

    const updateDto: UpdateFormFieldDto = {
      tabId: this.tabId,
      fieldTypeId: Number(fieldData.fieldTypeId),
      fieldName: fieldData.fieldName,
      foreignFieldName: fieldData.foreignFieldName || undefined,
      fieldCode: fieldData.fieldCode,
      fieldOrder: Number(fieldData.fieldOrder || 1),
      placeholder: fieldData.placeholder || undefined,
      foreignPlaceholder: fieldData.foreignPlaceholder || undefined,
      hintText: fieldData.hintText || '',
      foreignHintText: fieldData.foreignHintText || undefined,
      isMandatory: fieldData.isMandatory ?? null,
      isEditable: fieldData.isEditable ?? null,
      isVisible: fieldData.isVisible ?? null,
      isActive: this.editingField?.isActive !== false, // Preserve isActive from original field or default to true
      defaultValueJson: fieldData.defaultValueJson || fieldData.defaultValue || undefined,
      regexPattern: fieldData.regexPattern || undefined,
      validationMessage: fieldData.validationMessage || undefined,
      foreignValidationMessage: fieldData.foreignValidationMessage || undefined,
      gridId: this.editingField?.gridId || undefined, // Preserve gridId if exists
      minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== ''
        ? Number(fieldData.minValue)
        : undefined,
      maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== ''
        ? Number(fieldData.maxValue)
        : undefined,
      // Preserve calculation properties from original field if they exist
      expressionText: this.editingField?.expressionText || undefined,
      calculationMode: this.editingField?.calculationMode || undefined,
      calculationOperation: this.editingField?.calculationOperation || undefined,
      recalculateOn: this.editingField?.recalculateOn || undefined,
      resultType: this.editingField?.resultType || undefined
    };

    if (!this.editingField) return;

    this.fieldsService.updateField(this.editingField.id, updateDto).subscribe({
      next: (updatedField) => {
        const selectedFieldType = this.fieldTypes.find(t => t.id === Number(fieldData.fieldTypeId));
        if (selectedFieldType?.hasOptions) {
          // Use currently selected DataSource type from editor state.
          // API update response may not include fieldDataSource, which could incorrectly fallback to "Static".
          if (this.dataSourceType === 'Static') {
          this.saveFieldOptions(this.editingField!.id);
          } else {
            // For Api/LookupTable, ensure no options are saved
            this.deleteAllFieldOptions(this.editingField!.id).then(() => {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field settings saved successfully' });
              this.closeFieldSettingsModal();
              this.cdr.detectChanges();
            });
          }
        } else {
          this.deleteAllFieldOptions(this.editingField!.id).then(() => {
            this.loading.save = false;
            this.loadFields();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field settings saved successfully' });
            this.closeFieldSettingsModal();
            this.cdr.detectChanges();
          });
        }
      },
      error: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field settings' });
      }
    });
  }

  startDrag(event: MouseEvent, index: number): void {
    // Drag and drop functionality - can be enhanced with CDK DragDrop
    this.draggingFieldIndex = index;
    // TODO: Implement drag and drop reordering
  }

  importFields(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Import fields feature coming soon'
    });
  }

  // ==================== Field DataSource Methods ====================

  /**
   * Load DataSource configuration for a field
   * @param fieldId - The field ID to load DataSource for
   * @param callback - Optional callback to execute after DataSource is loaded
   */
  loadDataSourceForField(fieldId: number, callback?: () => void): void {
    this.fieldDataSourceService.getActiveDataSourcesByFieldId(fieldId).subscribe({
      next: (dataSources) => {
        if (dataSources && dataSources.length > 0) {
          // Use the first active DataSource
          const dataSource = dataSources[0];
          this.existingDataSource = dataSource;
          this.dataSourceType = dataSource.sourceType as 'Static' | 'Api' | 'LookupTable' | 'FormSubmissions' | 'SqlQuery' | 'SapHana';
          this.selectedDataSourceSapConnectionId = null;

          // Parse LookupTable configuration
          if (dataSource.sourceType === 'LookupTable' && dataSource.apiUrl) {
            let lookupDatabase: 'FormBuilder' | 'AkhmanageIt' = 'FormBuilder';
            if (dataSource.requestBodyJson) {
              try {
                const requestBodyParsed = JSON.parse(dataSource.requestBodyJson);
                const dbValue = requestBodyParsed?.database;
                if (typeof dbValue === 'string' && dbValue.trim()) {
                  lookupDatabase = dbValue.trim() === 'AKHManageIT' ? 'AkhmanageIt' : dbValue.trim() as 'FormBuilder' | 'AkhmanageIt';
                }
              } catch {
                // Keep default database when payload is not JSON
              }
            }
            try {
              // Try to parse as JSON first (for backwards compatibility with old data)
              const configJson = JSON.parse(dataSource.apiUrl);
              if (configJson.table && configJson.valueColumn && configJson.textColumn) {
                // Old format: JSON object in apiUrl
                this.lookupTableConfig = {
                  table: configJson.table,
                  valueColumn: configJson.valueColumn,
                  textColumn: configJson.textColumn,
                  database: lookupDatabase
                };
                this.dataSourceConfig = {
                  sourceType: dataSource.sourceType,
                  apiUrl: configJson.table, // Use table name only
                  httpMethod: null,
                  requestBodyJson: dataSource.requestBodyJson || null,
                  valuePath: configJson.valueColumn,
                  textPath: configJson.textColumn,
                  isActive: dataSource.isActive
                };
              } else {
                // Invalid JSON, treat as table name
                this.lookupTableConfig = {
                  table: dataSource.apiUrl,
                  valueColumn: dataSource.valuePath || 'Id',
                  textColumn: dataSource.textPath || 'Name',
                  database: lookupDatabase
                };
                this.dataSourceConfig = {
                  sourceType: dataSource.sourceType,
                  apiUrl: dataSource.apiUrl,
                  httpMethod: null,
                  requestBodyJson: dataSource.requestBodyJson || null,
                  valuePath: dataSource.valuePath || 'Id',
                  textPath: dataSource.textPath || 'Name',
                  isActive: dataSource.isActive
                };
              }
            } catch (e) {
              // Not JSON, treat as table name (new format or backwards compatibility)
              this.lookupTableConfig = {
                table: dataSource.apiUrl,
                valueColumn: dataSource.valuePath || 'Id',
                textColumn: dataSource.textPath || 'Name',
                database: lookupDatabase
              };
              this.dataSourceConfig = {
                sourceType: dataSource.sourceType,
                apiUrl: dataSource.apiUrl,
                httpMethod: null,
                requestBodyJson: dataSource.requestBodyJson || null,
                valuePath: dataSource.valuePath || 'Id',
                textPath: dataSource.textPath || 'Name',
                isActive: dataSource.isActive
              };
            }
            this.loadLookupTables();

            // Load columns for the selected table so "Available Columns" section appears
            if (this.lookupTableConfig.table) {
              this.loadTableColumns(this.lookupTableConfig.table);
            }
          } else if (dataSource.sourceType === 'FormSubmissions') {
            let formId: number | null = null;
            let formCode = '';
            let valueFieldCode = dataSource.valuePath || '';
            let textFieldCode = dataSource.textPath || '';
            let contextFieldCode = '';
            let sourceFieldCode = '';

            if ((dataSource as any).configurationJson) {
              try {
                const parsed = JSON.parse((dataSource as any).configurationJson);
                formId = parsed.formId ? Number(parsed.formId) : null;
                formCode = parsed.formCode || '';
                valueFieldCode = parsed.valueFieldCode || valueFieldCode;
                textFieldCode = parsed.textFieldCode || textFieldCode;
                const firstBinding = Array.isArray(parsed.contextBindings) ? parsed.contextBindings[0] : null;
                contextFieldCode = firstBinding?.contextFieldCode || '';
                sourceFieldCode = firstBinding?.sourceFieldCode || '';
              } catch {
                // ignore invalid historical config
              }
            }

            this.formSubmissionConfig = {
              formId,
              formCode,
              valueFieldId: null,
              textFieldId: null,
              valueFieldCode,
              textFieldCode
            };
            this.formSubmissionDependencyConfig = {
              contextFieldCode,
              sourceFieldCode
            };

            this.dataSourceConfig = {
              sourceType: dataSource.sourceType,
              apiUrl: formId ? String(formId) : null,
              httpMethod: null,
              requestBodyJson: formCode || null,
              valuePath: valueFieldCode || null,
              textPath: textFieldCode || null,
              isActive: dataSource.isActive
            };

            this.loadSubmissionSourceForms(() => {
              if (this.formSubmissionConfig.formId) {
                this.loadSubmissionSourceFields(this.formSubmissionConfig.formId!, true, callback);
              } else {
                if (callback) {
                  callback();
                }
                this.cdr.detectChanges();
              }
            });
            return;
          } else if (dataSource.sourceType === 'SqlQuery') {
            // For SqlQuery type, load SQL query and database from requestBodyJson
            let sqlQuery = '';
            let database: 'FormBuilder' | 'AkhmanageIt' = 'FormBuilder';
            
            if (dataSource.requestBodyJson) {
              try {
                // Try to parse as JSON object (new format with database)
                const parsed = JSON.parse(dataSource.requestBodyJson);
                if (parsed.query) {
                  sqlQuery = parsed.query;
                  // Convert old "Auto" values to "FormBuilder"
                  database = (parsed.database === 'Auto' || !parsed.database) ? 'FormBuilder' : parsed.database;
                } else {
                  // Fallback: treat as plain SQL query string (old format)
                  sqlQuery = dataSource.requestBodyJson;
                }
              } catch {
                // If parsing fails, treat as plain SQL query string (old format)
                sqlQuery = dataSource.requestBodyJson;
              }
            }
            
            // Also check ConfigurationJson if it exists (for backwards compatibility)
            if ((dataSource as any).configurationJson) {
              try {
                const configParsed = JSON.parse((dataSource as any).configurationJson);
                if (configParsed.database) {
                  // Convert old "Auto" values to "FormBuilder"
                  const configDb = String(configParsed.database);
                  if (configDb === 'Auto') {
                    database = 'FormBuilder';
                    console.log('[FieldsList] Converted "Auto" from ConfigurationJson to "FormBuilder"');
                  } else {
                    database = configParsed.database as 'FormBuilder' | 'AkhmanageIt';
                  }
                }
              } catch {
                // Ignore parsing errors
              }
            }
            
            // Final safety check: ensure database is never "Auto"
            const finalDb = String(database || 'FormBuilder');
            if (finalDb === 'Auto') {
              database = 'FormBuilder';
              console.log('[FieldsList] Final safety check: Converted "Auto" to "FormBuilder"');
            }
            
            console.log('[FieldsList] Loaded SqlQuery config:', {
              sqlQuery: sqlQuery.substring(0, 50) + '...',
              database: database,
              valuePath: dataSource.valuePath || 'Id',
              textPath: dataSource.textPath || 'Name'
            });
            
            // Auto-migration: If requestBodyJson is still in old JSON format, migrate it automatically
            const isOldJsonFormat = dataSource.requestBodyJson && 
              dataSource.requestBodyJson.trim().startsWith('{') && 
              dataSource.requestBodyJson.includes('"query"');
            
            if (isOldJsonFormat && dataSource.id) {
              console.warn('[FieldsList] ⚠️ Detected old JSON format in DataSource. Auto-migrating to new format...');
              // Auto-update the DataSource to new format (raw SQL) in background
              this.fieldDataSourceService.updateDataSource(dataSource.id, {
                sourceType: dataSource.sourceType,
                apiUrl: dataSource.apiUrl,
                httpMethod: dataSource.httpMethod,
                requestBodyJson: sqlQuery.trim(), // Save as raw SQL, not JSON
                valuePath: dataSource.valuePath || 'Id',
                textPath: dataSource.textPath || 'Name',
                isActive: dataSource.isActive !== false,
                isDeleted: dataSource.isDeleted !== undefined ? dataSource.isDeleted : false
              }).subscribe({
                next: () => {
                  console.log('[FieldsList] ✅ Auto-migration successful: DataSource updated to new format');
                  // Update the existingDataSource reference to reflect the change
                  if (this.existingDataSource) {
                    this.existingDataSource = {
                      ...this.existingDataSource,
                      requestBodyJson: sqlQuery.trim()
                    };
                  }
                },
                error: (error) => {
                  console.error('[FieldsList] ❌ Auto-migration failed:', error);
                  // Continue anyway with the parsed values - user can manually update later
                }
              });
            }
            
            this.sqlQueryConfig = {
              sqlQuery: sqlQuery,
              valuePath: dataSource.valuePath || 'Id',
              textPath: dataSource.textPath || 'Name',
              database: database as 'FormBuilder' | 'AkhmanageIt'
            };
            
            // Force update after a short delay to ensure UI reflects the change
            setTimeout(() => {
              const dbValue = String(this.sqlQueryConfig.database || '');
              if (dbValue === 'Auto' || !this.sqlQueryConfig.database) {
                console.warn('[FieldsList] Database was still "Auto" after initialization, forcing to "FormBuilder"');
                this.sqlQueryConfig.database = 'FormBuilder';
                this.cdr.detectChanges();
              }
            }, 100);
            this.dataSourceConfig = {
              sourceType: dataSource.sourceType,
              apiUrl: null,
              httpMethod: null,
              requestBodyJson: dataSource.requestBodyJson || null,
              valuePath: dataSource.valuePath || 'Id',
              textPath: dataSource.textPath || 'Name',
              isActive: dataSource.isActive
            };
          } else if (dataSource.sourceType === 'SapHana') {
            // For SapHana type, requestBodyJson already contains the SAP HANA SQL query string
            let sqlQuery = dataSource.requestBodyJson || '';

            // Auto-fix: Try to add double quotes to identifiers if missing (for SAP HANA case-sensitivity)
            // Only attempt this if the query doesn't already have quotes around identifiers
            if (sqlQuery && !sqlQuery.includes('"')) {
              console.warn('[FieldsList] ⚠️ SAP HANA query missing double quotes. Attempting auto-fix...');
              sqlQuery = this.autoFixSapHanaQuery(sqlQuery);
              
              // If auto-fix was applied and we have a DataSource ID, offer to save the fixed version
              if (sqlQuery !== dataSource.requestBodyJson && dataSource.id) {
                console.log('[FieldsList] 💡 Auto-fixed SAP HANA query. User should review and save.');
                // Show info message to user
                setTimeout(() => {
                  this.messageService.add({
                    severity: 'info',
                    summary: 'SAP HANA Query Auto-Fixed',
                    detail: 'Double quotes have been added to identifiers. Please review the query and click "Run Query" to test, then save.',
                    life: 8000
                  });
                }, 500);
              }
            }

            console.log('[FieldsList] Loaded SapHana config:', {
              sqlQuery: sqlQuery.substring(0, 80) + '...',
              valuePath: dataSource.valuePath || 'ID',
              textPath: dataSource.textPath || 'NAME'
            });

            if ((dataSource as any).configurationJson) {
              try {
                const parsed = JSON.parse((dataSource as any).configurationJson);
                this.selectedDataSourceSapConnectionId = parsed?.sapConfigId ? Number(parsed.sapConfigId) : null;
              } catch {
                this.selectedDataSourceSapConnectionId = null;
              }
            } else {
              this.selectedDataSourceSapConnectionId = null;
            }

            // Reuse sqlQueryConfig for SapHana queries (database is ignored for SapHana)
            this.sqlQueryConfig = {
              sqlQuery: sqlQuery,
              valuePath: dataSource.valuePath || 'ID',
              textPath: dataSource.textPath || 'NAME',
              database: 'FormBuilder'
            };

            this.dataSourceConfig = {
              sourceType: dataSource.sourceType,
              apiUrl: null,
              httpMethod: null,
              requestBodyJson: sqlQuery, // Use the (possibly fixed) query
              valuePath: this.sqlQueryConfig.valuePath,
              textPath: this.sqlQueryConfig.textPath,
              isActive: dataSource.isActive
            };
          } else {
            let parsedApiConfig: any = null;
            if ((dataSource as any).configurationJson) {
              try {
                parsedApiConfig = JSON.parse((dataSource as any).configurationJson);
              } catch {
                parsedApiConfig = null;
              }
            }

            if (dataSource.sourceType === 'Api') {
              this.selectedDataSourceSapConnectionId = parsedApiConfig?.sapConfigId
                ? Number(parsedApiConfig.sapConfigId)
                : null;
            }

            // For Api and Static types
            this.dataSourceConfig = {
              sourceType: dataSource.sourceType,
              apiUrl: parsedApiConfig?.url || dataSource.apiUrl || null,
              httpMethod: parsedApiConfig?.httpMethod || dataSource.httpMethod || 'GET',
              requestBodyJson: parsedApiConfig?.requestBodyJson || dataSource.requestBodyJson || null,
              valuePath: parsedApiConfig?.valuePath || dataSource.valuePath || null,
              textPath: parsedApiConfig?.textPath || dataSource.textPath || null,
              isActive: dataSource.isActive
            };

            // Load lookup tables if source type is LookupTable (for new selections)
            if (dataSource.sourceType === 'LookupTable') {
              this.loadLookupTables();
            }
          }
        } else {
          // No DataSource found, but field has options - set to Static by default
          this.existingDataSource = null;
          if (this.getSelectedFieldType()?.hasOptions) {
            this.dataSourceType = 'Static';
            this.onDataSourceTypeChange(); // Trigger change to ensure UI updates
            this.resetDataSourceConfig();
          } else {
            this.resetDataSourceConfig();
          }
        }
        
        // Execute callback after DataSource is loaded
        if (callback) {
          callback();
        }
        
        this.cdr.detectChanges();
      },
      error: () => {
        // On error, set to Static if field has options
        this.existingDataSource = null;
        if (this.getSelectedFieldType()?.hasOptions) {
          this.dataSourceType = 'Static';
          this.onDataSourceTypeChange(); // Trigger change to ensure UI updates
          this.resetDataSourceConfig();
        } else {
          this.resetDataSourceConfig();
        }
        
        // Execute callback even on error
        if (callback) {
          callback();
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Reset DataSource configuration to default
   */
  resetDataSourceConfig(): void {
    this.dataSourceType = 'Static';
    this.existingDataSource = null;
    this.selectedDataSourceSapConnectionId = null;
    this.dataSourceConfig = {
      sourceType: 'Static',
      apiUrl: null,
      httpMethod: 'GET',
      requestBodyJson: null,
      valuePath: null,
      textPath: null,
      isActive: true
    };
    this.lookupTableConfig = {
      table: '',
      valueColumn: 'Id',
      textColumn: 'Name',
      database: 'FormBuilder'
    };
    this.sqlQueryConfig = {
      sqlQuery: '',
      valuePath: 'Id',
      textPath: 'Name',
      database: 'FormBuilder'
    };
    this.formSubmissionConfig = {
      formId: null,
      formCode: '',
      valueFieldId: null,
      textFieldId: null,
      valueFieldCode: '',
      textFieldCode: ''
    };
    this.formSubmissionDependencyConfig = {
      contextFieldCode: '',
      sourceFieldCode: ''
    };
    this.previewOptions = [];
    this.selectedPreviewOption = null;
    this.availableSourceFormFields = [];
    this.loadingSourceFormFields = false;
    this.availableLookupTables = [];
    this.availableColumns = [];
    this.availableProperties = []; // Reset available properties
    this.hasSuggestedPaths = false; // Reset suggested paths flag
    this.rawApiResponse = null;
    this.apiDebugError = null;
  }

  /**
   * Handle DataSource type change
   */
  /**
   * Handle calculation operation change
   */
  onCalculationOperationChange(): void {
    const operationId = this.fieldForm.get('calculationOperation')?.value;
    const operation = this.calculationOperations.find(op => op.id === operationId);
    if (operation) {
      this.selectedCalculationOperation = operation;
    }
  }

  onDataSourceTypeChange(): void {
    this.dataSourceConfig.sourceType = this.dataSourceType;

    // Reset fields based on source type
    if (this.dataSourceType === 'Static') {
      // Clear DataSource config for Static
      this.dataSourceConfig.apiUrl = null;
      this.dataSourceConfig.httpMethod = 'GET';
      this.dataSourceConfig.requestBodyJson = null;
      this.dataSourceConfig.valuePath = null;
      this.dataSourceConfig.textPath = null;
      this.previewOptions = [];
      // Ensure at least one option exists in Field Options
      if (this.fieldOptionsFormArray.length === 0) {
        this.addFieldOption();
      }
    } else if (this.dataSourceType === 'LookupTable') {
      // Load lookup tables when LookupTable is selected
      if (!this.lookupTableConfig.database) {
        this.lookupTableConfig.database = 'FormBuilder';
      }
      this.loadLookupTables();
      this.dataSourceConfig.httpMethod = null;
      this.dataSourceConfig.requestBodyJson = null;
      // Set default columns for LookupTable
      if (!this.lookupTableConfig.table) {
        this.lookupTableConfig = {
          table: '',
          valueColumn: 'Id',
          textColumn: 'Name',
          database: this.lookupTableConfig.database || 'FormBuilder'
        };
      }
      this.dataSourceConfig.valuePath = this.lookupTableConfig.valueColumn;
      this.dataSourceConfig.textPath = this.lookupTableConfig.textColumn;
      this.previewOptions = [];
      // Clear static options when using DataSource
      this.clearFieldOptions();
    } else if (this.dataSourceType === 'FormSubmissions') {
      this.dataSourceConfig.httpMethod = null;
      this.dataSourceConfig.apiUrl = null;
      this.dataSourceConfig.requestBodyJson = null;
      this.dataSourceConfig.valuePath = this.formSubmissionConfig.valueFieldCode || null;
      this.dataSourceConfig.textPath = this.formSubmissionConfig.textFieldCode || null;
      this.previewOptions = [];
      this.clearFieldOptions();

      if (!this.formSubmissionConfig.formId) {
        this.formSubmissionConfig = {
          formId: null,
          formCode: '',
          valueFieldId: null,
          textFieldId: null,
          valueFieldCode: '',
          textFieldCode: ''
        };
      }

      this.loadSubmissionSourceForms();
    } else if (this.dataSourceType === 'Api') {
      // Set default HTTP method
      this.dataSourceConfig.httpMethod = 'GET';
      this.dataSourceConfig.requestBodyJson = null;
      // Set default paths for API (id, name)
      this.dataSourceConfig.valuePath = 'id';
      this.dataSourceConfig.textPath = 'name';
      this.previewOptions = [];
      // Clear static options when using DataSource
      this.clearFieldOptions();
      this.loadSapConnections();
      this.ensureDataSourceSapConnectionSelected();
    } else if (this.dataSourceType === 'SqlQuery') {
      // Set default SQL Query config - preserve existing database if set
      if (!this.sqlQueryConfig.sqlQuery) {
        const existingDatabase = this.sqlQueryConfig.database || 'FormBuilder';
        // Ensure database is valid (handle old "Auto" values from database)
        const dbValue = String(existingDatabase);
        const safeDatabase = (dbValue === 'Auto' || !existingDatabase) ? 'FormBuilder' : existingDatabase;
        this.sqlQueryConfig = {
          sqlQuery: '',
          valuePath: 'Id',
          textPath: 'Name',
          database: safeDatabase as 'FormBuilder' | 'AkhmanageIt'
        };
      } else {
        // If SQL query exists, ensure database is valid (handle old "Auto" values)
        const dbValue = String(this.sqlQueryConfig.database || '');
        if (dbValue === 'Auto' || !this.sqlQueryConfig.database) {
          this.sqlQueryConfig.database = 'FormBuilder';
        }
      }
      this.dataSourceConfig.httpMethod = null;
      this.dataSourceConfig.apiUrl = null;
      this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath;
      this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath;
      this.previewOptions = [];
      // Clear static options when using DataSource
      this.clearFieldOptions();
      
      // Load saved queries for the current database (only for SQL Server)
      this.loadSavedQueries();
    } else if (this.dataSourceType === 'SapHana') {
      // SapHana uses the same sqlQueryConfig structure but ignores database (connection comes from backend)
      if (!this.sqlQueryConfig.sqlQuery) {
        this.sqlQueryConfig = {
          sqlQuery: '',
          valuePath: 'ID', // Will be auto-detected from query when user types it
          textPath: 'NAME', // Will be auto-detected from query when user types it
          database: 'FormBuilder'
        };
      } else {
        // If SQL query exists, try to auto-detect columns if paths are defaults
        if ((!this.sqlQueryConfig.valuePath || !this.sqlQueryConfig.valuePath.trim() || 
             this.sqlQueryConfig.valuePath === 'ID') &&
            this.sqlQueryConfig.sqlQuery.trim()) {
          this.autoDetectColumnsFromQuery();
        }
      }
      this.dataSourceConfig.httpMethod = null;
      this.dataSourceConfig.apiUrl = null;
      this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath;
      this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath;
      this.previewOptions = [];
      // Clear static options when using DataSource
      this.clearFieldOptions();
      this.loadSapConnections();
      this.ensureDataSourceSapConnectionSelected();
    }

    this.cdr.detectChanges();
  }

  loadSubmissionSourceForms(callback?: () => void): void {
    this.loadingSourceForms = true;
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        this.availableSourceForms = (result.items || [])
          .filter(form => form.isActive !== false && !form.isDeleted)
          .sort((a, b) => (a.formName || '').localeCompare(b.formName || ''));
        this.loadingSourceForms = false;

        if (this.formSubmissionConfig.formId) {
          const selectedForm = this.availableSourceForms.find(form => form.id === this.formSubmissionConfig.formId);
          if (selectedForm) {
            this.formSubmissionConfig.formCode = selectedForm.formCode || this.formSubmissionConfig.formCode;
          }
        }

        callback?.();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[FieldsList] Error loading source forms:', error);
        this.availableSourceForms = [];
        this.loadingSourceForms = false;
        callback?.();
        this.cdr.detectChanges();
      }
    });
  }

  private ensureDataSourceSapConnectionSelected(): void {
    if (this.selectedDataSourceSapConnectionId || this.sapConnections.length === 0) {
      return;
    }

    const active = this.sapConnections.find(c => c.isActive === true);
    this.selectedDataSourceSapConnectionId = active?.id ?? this.sapConnections[0].id;
  }

  onDataSourceSapConnectionChange(): void {
    if (this.dataSourceType === 'SapHana') {
      this.previewOptions = [];
    }
  }

  onDataSourceSapRelogin(): void {
    if (!this.selectedDataSourceSapConnectionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'SAP Connection',
        detail: 'Please select SAP connection first.'
      });
      return;
    }

    this.loadingSapReLogin = true;
    this.sapIntegrationService.reloginConnection(this.selectedDataSourceSapConnectionId).subscribe({
      next: () => {
        this.loadingSapReLogin = false;
        this.messageService.add({
          severity: 'success',
          summary: 'SAP Connection',
          detail: 'SAP session refreshed successfully.'
        });
      },
      error: (error) => {
        this.loadingSapReLogin = false;
        this.messageService.add({
          severity: 'error',
          summary: 'SAP Connection',
          detail: this.extractErrorMessage(error) || 'Failed to refresh SAP session.'
        });
      }
    });
  }

  private createFormSubmissionSystemField(id: number, fieldName: string, fieldCode: string): FormFieldDto {
    return {
      id,
      tabId: 0,
      fieldTypeId: 0,
      fieldName,
      fieldCode,
      fieldOrder: -Math.abs(id),
      hintText: '',
      isMandatory: false,
      isEditable: false,
      isVisible: true,
      isActive: true,
      createdDate: new Date(0).toISOString(),
      isDeleted: false,
      fieldOptions: []
    };
  }

  private mergeSubmissionSourceFields(fields: FormFieldDto[]): FormFieldDto[] {
    const merged = [...this.formSubmissionSystemFields, ...(fields || [])];
    return merged.sort((a, b) => {
      const orderCompare = (a.fieldOrder || 0) - (b.fieldOrder || 0);
      if (orderCompare !== 0) {
        return orderCompare;
      }

      return (a.fieldName || '').localeCompare(b.fieldName || '');
    });
  }

  onSubmissionSourceFormChange(): void {
    this.previewOptions = [];
    this.availableSourceFormFields = [];
    this.formSubmissionConfig.valueFieldId = null;
    this.formSubmissionConfig.textFieldId = null;
    this.formSubmissionConfig.valueFieldCode = '';
    this.formSubmissionConfig.textFieldCode = '';
    this.formSubmissionDependencyConfig.sourceFieldCode = '';

    const selectedForm = this.availableSourceForms.find(form => form.id === this.formSubmissionConfig.formId);
    this.formSubmissionConfig.formCode = selectedForm?.formCode || '';

    if (this.formSubmissionConfig.formId) {
      this.loadSubmissionSourceFields(this.formSubmissionConfig.formId);
    }
  }

  loadSubmissionSourceFields(formId: number, autoPreview: boolean = true, callback?: () => void): void {
    this.loadingSourceFormFields = true;
    this.fieldsService.getFieldsByFormId(formId).subscribe({
      next: (fields) => {
        const activeFields = (fields || [])
          .filter(field => !field.isDeleted && (field.isActive ?? true));

        this.availableSourceFormFields = this.mergeSubmissionSourceFields(activeFields);

        const valueField = this.availableSourceFormFields.find(field =>
          field.id === this.formSubmissionConfig.valueFieldId ||
          field.fieldCode === this.formSubmissionConfig.valueFieldCode);
        const textField = this.availableSourceFormFields.find(field =>
          field.id === this.formSubmissionConfig.textFieldId ||
          field.fieldCode === this.formSubmissionConfig.textFieldCode);

        this.formSubmissionConfig.valueFieldId = valueField?.id || null;
        this.formSubmissionConfig.textFieldId = textField?.id || null;
        this.formSubmissionConfig.valueFieldCode = valueField?.fieldCode || this.formSubmissionConfig.valueFieldCode;
        this.formSubmissionConfig.textFieldCode = textField?.fieldCode || this.formSubmissionConfig.textFieldCode;
        this.loadingSourceFormFields = false;

        if (autoPreview && this.formSubmissionConfig.valueFieldCode && this.formSubmissionConfig.textFieldCode) {
          setTimeout(() => this.previewDataSource(), 150);
        }

        callback?.();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[FieldsList] Error loading source form fields:', error);
        this.availableSourceFormFields = [];
        this.loadingSourceFormFields = false;
        callback?.();
        this.cdr.detectChanges();
      }
    });
  }

  onSubmissionValueFieldChange(): void {
    const selectedField = this.availableSourceFormFields.find(field => field.id === this.formSubmissionConfig.valueFieldId);
    this.formSubmissionConfig.valueFieldCode = selectedField?.fieldCode || '';
    this.dataSourceConfig.valuePath = this.formSubmissionConfig.valueFieldCode || null;
    this.previewOptions = [];
  }

  onSubmissionTextFieldChange(): void {
    const selectedField = this.availableSourceFormFields.find(field => field.id === this.formSubmissionConfig.textFieldId);
    this.formSubmissionConfig.textFieldCode = selectedField?.fieldCode || '';
    this.dataSourceConfig.textPath = this.formSubmissionConfig.textFieldCode || null;
    this.previewOptions = [];
  }

  onSubmissionDependencyFieldChange(): void {
    this.formSubmissionDependencyConfig.sourceFieldCode = '';
    this.previewOptions = [];
  }

  onSubmissionDependencySourceFieldChange(): void {
    this.previewOptions = [];
  }

  getAvailableFormSubmissionDependencyFields(): FormFieldDto[] {
    const currentFieldCode = (this.fieldForm.get('fieldCode')?.value || '').toString().trim().toUpperCase();

    return this.allFormFields.filter(field => {
      if (!field || field.isDeleted || field.isActive === false) {
        return false;
      }

      if (this.editingField && field.id === this.editingField.id) {
        return false;
      }

      return (field.fieldCode || '').trim().toUpperCase() !== currentFieldCode;
    });
  }

  /**
   * Clear all field options (when switching to DataSource)
   */
  clearFieldOptions(): void {
    const optionsArray = this.fieldOptionsFormArray;
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }
  }

  /**
   * Handle table selection change
   */
  onTableSelected(): void {
    if (this.dataSourceType === 'LookupTable' && this.lookupTableConfig.table) {
      // Update valuePath and textPath to match lookupTableConfig
      this.dataSourceConfig.valuePath = this.lookupTableConfig.valueColumn;
      this.dataSourceConfig.textPath = this.lookupTableConfig.textColumn;
      // Clear preview options
      this.previewOptions = [];
      // Load table columns when table is selected - this will populate availableColumns
      if (this.lookupTableConfig.table && this.lookupTableConfig.table.trim()) {
        this.loadTableColumns(this.lookupTableConfig.table);
      }

      // Auto-preview when table is selected (since Refresh button is removed)
      setTimeout(() => {
        this.previewDataSource();
      }, 200);
    }
  }

  /**
   * Load columns from selected table
   */
  loadTableColumns(tableName: string): void {
    if (!tableName || !tableName.trim()) {
      this.availableColumns = [];
      return;
    }

    console.log(`[FieldsList] Loading columns for table: "${tableName}" from database: "${this.lookupTableConfig.database}"`);

    // First try the dedicated columns endpoint
    const database = this.lookupTableConfig.database || 'FormBuilder';
    this.fieldDataSourceService.getTableColumns(tableName, database).subscribe({
      next: (columns) => {
        if (columns && columns.length > 0) {
          this.availableColumns = columns.sort();
          console.log(`[FieldsList] Successfully loaded ${columns.length} columns for table "${tableName}":`, this.availableColumns);
          /*
          this.messageService.add({
            severity: 'success',
            summary: 'Columns Loaded',
            detail: `Loaded ${columns.length} columns`
          });
          */
          this.cdr.detectChanges();
        } else {
          // Fallback: Try to infer columns from preview data
          this.inferColumnsFromPreview(tableName);
        }
      },
      error: (error) => {
        console.warn(`[FieldsList] Columns endpoint failed for "${tableName}", trying fallback to preview...`);
        // Fallback: Try to infer columns from preview data
        this.inferColumnsFromPreview(tableName);
      }
    });
  }

  /**
   * Infer columns from preview data (Fallback)
   */
  private inferColumnsFromPreview(tableName: string): void {
    // Construct a preview request to get a sample
    const request: PreviewDataSourceRequestDto = {
      fieldId: 0,
      sourceType: 'LookupTable',
      apiUrl: tableName,
      valuePath: 'Id', // Default guess
      textPath: 'Name' // Default guess
    };

    console.log(`[FieldsList] Attempting to infer columns for table "${tableName}" via preview...`);

    this.fieldDataSourceService.previewDataSource(request).subscribe({
      next: (response) => {
        if (response && response.length > 0) {
          // Extract keys from the first item
          const firstItem = response[0];
          const keys = Object.keys(firstItem);

          // If we only have value/text, we can't really "infer" original columns,
          // but we can provide the standard ones as a courtesy.
          if (keys.length <= 2 && keys.includes('value') && keys.includes('text')) {
            this.availableColumns = ['Id', 'Name', 'Code', 'Value', 'Text'].sort();
          } else {
            // Remove common internal/mapped properties if they exist
            this.availableColumns = keys
              .filter(k => k !== 'isActive' && k !== 'isDefault')
              .sort();
          }

          console.log(`[FieldsList] Inferred ${this.availableColumns.length} columns:`, this.availableColumns);
          this.cdr.detectChanges();
        } else {
          // Last resort fallback
          this.availableColumns = ['Id', 'Name', 'Description', 'Code', 'IsActive', 'Value', 'Text'].sort();
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // Ultimate fallback if even preview fails
        this.availableColumns = ['Id', 'Name', 'Code', 'Value', 'Text'].sort();
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Auto-fix SAP HANA query by adding double quotes around identifiers
   * This is a simple heuristic that attempts to wrap column names, table names, and schema names
   */
  private autoFixSapHanaQuery(query: string): string {
    if (!query || !query.trim()) {
      return query;
    }

    try {
      // Simple regex-based approach for common SAP HANA query patterns
      // Pattern 1: SELECT column1, column2 FROM schema.table
      // Pattern 2: SELECT column1 AS alias1, column2 AS alias2 FROM schema.table
      
      let fixedQuery = query.trim();
      
      // Match SELECT ... FROM pattern
      const selectFromMatch = fixedQuery.match(/SELECT\s+(.+?)\s+FROM\s+(.+?)(?:\s+ORDER\s+BY|\s+WHERE|\s+GROUP\s+BY|$)/i);
      
      if (selectFromMatch) {
        const selectPart = selectFromMatch[1].trim();
        const fromPart = selectFromMatch[2].trim();
        const restOfQuery = fixedQuery.substring(selectFromMatch[0].length);
        
        // Fix FROM part: schema.table -> "schema"."table"
        let fixedFromPart = fromPart
          .split('.')
          .map(part => {
            const trimmed = part.trim();
            // If already quoted, keep as is
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              return trimmed;
            }
            // Otherwise, add quotes
            return `"${trimmed}"`;
          })
          .join('.');
        
        // Fix SELECT part: column AS alias -> "column" AS "alias"
        let fixedSelectPart = selectPart
          .split(',')
          .map(col => {
            const trimmed = col.trim();
            // Handle AS alias
            if (trimmed.toUpperCase().includes(' AS ')) {
              const parts = trimmed.split(/\s+AS\s+/i);
              const column = parts[0].trim();
              const alias = parts[1]?.trim() || '';
              
              // Quote column name if not already quoted
              let quotedColumn = column;
              if (!column.startsWith('"') && !column.endsWith('"')) {
                // Remove any table prefix (e.g., "table.column" -> "column")
                const columnName = column.includes('.') ? column.split('.').pop() : column;
                quotedColumn = columnName ? `"${columnName.trim()}"` : column;
              }
              
              // Quote alias if not already quoted
              let quotedAlias = alias;
              if (alias && !alias.startsWith('"') && !alias.endsWith('"')) {
                quotedAlias = `"${alias}"`;
              }
              
              return alias ? `${quotedColumn} AS ${quotedAlias}` : quotedColumn;
            } else {
              // No AS clause, just quote the column name
              if (!trimmed.startsWith('"') && !trimmed.endsWith('"')) {
                const columnName = trimmed.includes('.') ? trimmed.split('.').pop() : trimmed;
                return columnName ? `"${columnName.trim()}"` : trimmed;
              }
              return trimmed;
            }
          })
          .join(', ');
        
        // Reconstruct query
        fixedQuery = `SELECT ${fixedSelectPart} FROM ${fixedFromPart}${restOfQuery}`;
        
        // Fix ORDER BY if present
        if (fixedQuery.toUpperCase().includes('ORDER BY')) {
          fixedQuery = fixedQuery.replace(/ORDER\s+BY\s+([^\s,]+)/gi, (match, column) => {
            const trimmed = column.trim();
            if (!trimmed.startsWith('"') && !trimmed.endsWith('"')) {
              return `ORDER BY "${trimmed}"`;
            }
            return match;
          });
        }
      }
      
      console.log('[FieldsList] Auto-fixed SAP HANA query:', {
        original: query.substring(0, 100) + '...',
        fixed: fixedQuery.substring(0, 100) + '...'
      });
      
      return fixedQuery;
    } catch (error) {
      console.warn('[FieldsList] Failed to auto-fix SAP HANA query:', error);
      // Return original query if auto-fix fails
      return query;
    }
  }

  /**
   * Handle valuePath blur - set default if empty
   */
  onValuePathBlur(): void {
    if (!this.dataSourceConfig.valuePath || !this.dataSourceConfig.valuePath.trim()) {
      this.dataSourceConfig.valuePath = this.dataSourceType === 'LookupTable' ? 'Id' : 'id';
      if (this.dataSourceType === 'LookupTable') {
        this.lookupTableConfig.valueColumn = 'Id';
      }
    } else if (this.dataSourceType === 'LookupTable') {
      // Sync with lookupTableConfig
      this.lookupTableConfig.valueColumn = this.dataSourceConfig.valuePath.trim();
    }
  }

  /**
   * Handle textPath blur - set default if empty
   */
  onTextPathBlur(): void {
    if (!this.dataSourceConfig.textPath || !this.dataSourceConfig.textPath.trim()) {
      this.dataSourceConfig.textPath = this.dataSourceType === 'LookupTable' ? 'Name' : 'name';
      if (this.dataSourceType === 'LookupTable') {
        this.lookupTableConfig.textColumn = 'Name';
      }
    } else if (this.dataSourceType === 'LookupTable') {
      // Sync with lookupTableConfig
      this.lookupTableConfig.textColumn = this.dataSourceConfig.textPath.trim();
    }
  }

  /**
   * Auto-detect columns from SQL query and set valuePath/textPath
   * This is called when user types a query without AS aliases
   */
  private autoDetectColumnsFromQuery(): void {
    if (!this.sqlQueryConfig.sqlQuery || !this.sqlQueryConfig.sqlQuery.trim()) {
      return;
    }

    const sqlQuery = this.sqlQueryConfig.sqlQuery.trim();
    const selectMatch = sqlQuery.match(/SELECT\s+(.+?)\s+FROM\s+/i);
    
    if (selectMatch) {
      const columnString = selectMatch[1].trim();
      // Split by comma and extract column names
      const columns = columnString.split(',').map(col => {
        const trimmed = col.trim();
        // Check if there's an AS alias
        const aliasMatch = trimmed.match(/\s+AS\s+(["\']?)(\w+)\1/i);
        if (aliasMatch) {
          // Use the alias (without quotes)
          return aliasMatch[2].trim();
        }
        // No AS alias, extract column name directly
        let columnName = trimmed;
        // Remove surrounding quotes
        if ((columnName.startsWith('"') && columnName.endsWith('"')) || 
            (columnName.startsWith("'") && columnName.endsWith("'"))) {
          columnName = columnName.slice(1, -1);
        }
        return columnName.trim();
      });
      
      // Remove table aliases (e.g., "schema"."table"."column" -> column)
      const cleanColumns = columns.map(col => {
        const parts = col.split('.');
        let columnName = parts[parts.length - 1].trim();
        // Remove quotes if present
        if ((columnName.startsWith('"') && columnName.endsWith('"')) || 
            (columnName.startsWith("'") && columnName.endsWith("'"))) {
          columnName = columnName.slice(1, -1);
        }
        return columnName.trim();
      }).filter(col => col.length > 0);
      
      console.log('[FieldsList] Auto-detected columns from query:', cleanColumns);
      
      // Set valuePath and textPath from detected columns
      if (cleanColumns.length > 0) {
        // First column as valuePath
        if (!this.sqlQueryConfig.valuePath || 
            this.sqlQueryConfig.valuePath === 'ID' || 
            this.sqlQueryConfig.valuePath === 'Id') {
          this.sqlQueryConfig.valuePath = cleanColumns[0];
          this.dataSourceConfig.valuePath = cleanColumns[0];
        }
        
        // Second column as textPath (if exists)
        if (cleanColumns.length > 1) {
          if (!this.sqlQueryConfig.textPath || 
              this.sqlQueryConfig.textPath === 'NAME' || 
              this.sqlQueryConfig.textPath === 'Name') {
            this.sqlQueryConfig.textPath = cleanColumns[1];
            this.dataSourceConfig.textPath = cleanColumns[1];
          }
        } else if (cleanColumns.length === 1) {
          // If only one column, use it for both
          if (!this.sqlQueryConfig.textPath || 
              this.sqlQueryConfig.textPath === 'NAME' || 
              this.sqlQueryConfig.textPath === 'Name') {
            this.sqlQueryConfig.textPath = cleanColumns[0];
            this.dataSourceConfig.textPath = cleanColumns[0];
          }
        }
      }
    }
  }

  /**
   * Handle SAP HANA query change - auto-detect columns
   */
  onSapHanaQueryChange(query: string): void {
    if (this.dataSourceType === 'SapHana' && query && query.trim()) {
      // Auto-detect columns from query
      this.autoDetectColumnsFromQuery();
    }
  }

  /**
   * Handle SQL Query Value Path blur
   */
  onSqlQueryValuePathBlur(): void {
    if (!this.sqlQueryConfig.valuePath || !this.sqlQueryConfig.valuePath.trim()) {
      this.sqlQueryConfig.valuePath = 'Id';
    }
    this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath.trim();
  }

  /**
   * Handle SQL Query Text Path blur
   */
  onSqlQueryTextPathBlur(): void {
    if (!this.sqlQueryConfig.textPath || !this.sqlQueryConfig.textPath.trim()) {
      this.sqlQueryConfig.textPath = 'Name';
    }
    this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath.trim();
  }

  /**
   * Run SQL Query - Execute query and show results
   */
  runSqlQuery(): void {
    // Validate inputs
    if (!this.sqlQueryConfig.sqlQuery || !this.sqlQueryConfig.sqlQuery.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter SQL Query'
      });
      return;
    }

    // Try to extract column names from SQL query
    const sqlQuery = this.sqlQueryConfig.sqlQuery.trim();
    // Improved regex: match everything between SELECT and FROM (case-insensitive, handles whitespace)
    // Use word boundary to ensure we match the word "FROM" not just the letters F-R-O-M
    const selectMatch = sqlQuery.match(/SELECT\s+(.+?)\s+FROM\s+/i);
    if (selectMatch) {
      const columnString = selectMatch[1].trim();
      // Split by comma and handle potential AS aliases
      const columns = columnString.split(',').map(col => {
        const trimmed = col.trim();
        // Check if there's an AS alias (handle both quoted and unquoted aliases)
        // Match: "column" AS "alias" or column AS alias
        const aliasMatch = trimmed.match(/\s+AS\s+(["\']?)(\w+)\1/i);
        if (aliasMatch) {
          // Use the alias (without quotes)
          return aliasMatch[2].trim();
        }
        // No AS alias, extract column name directly
        // Remove quotes if present (e.g., "ItemCode" -> ItemCode)
        let columnName = trimmed;
        // Remove surrounding quotes
        if ((columnName.startsWith('"') && columnName.endsWith('"')) || 
            (columnName.startsWith("'") && columnName.endsWith("'"))) {
          columnName = columnName.slice(1, -1);
        }
        return columnName.trim();
      });
      
      // Remove table aliases (e.g., "schema"."table"."column" -> column)
      const cleanColumns = columns.map(col => {
        const parts = col.split('.');
        // Take the last part (column name) and remove any whitespace/quotes
        let columnName = parts[parts.length - 1].trim();
        // Remove quotes if present
        if ((columnName.startsWith('"') && columnName.endsWith('"')) || 
            (columnName.startsWith("'") && columnName.endsWith("'"))) {
          columnName = columnName.slice(1, -1);
        }
        return columnName.trim();
      }).filter(col => col.length > 0); // Remove empty strings
      
      console.log('[FieldsList] Extracted columns from SQL:', cleanColumns);
      
      // Set valuePath and textPath from query if not already set
      if (cleanColumns.length > 0 && (!this.sqlQueryConfig.valuePath || !this.sqlQueryConfig.valuePath.trim())) {
        // Try to find id-like column (case-insensitive)
        const idColumn = cleanColumns.find(col => 
          /^id$/i.test(col) || col.toLowerCase().includes('id')
        ) || cleanColumns[0];
        this.sqlQueryConfig.valuePath = idColumn;
        console.log('[FieldsList] Auto-set valuePath to:', idColumn);
      }
      
      // Update textPath: auto-set if empty, or if current value doesn't match any extracted column
      const currentTextPath = this.sqlQueryConfig.textPath?.trim();
      const textPathExists = currentTextPath && cleanColumns.some(col => 
        col.toLowerCase() === currentTextPath.toLowerCase()
      );
      
      if (cleanColumns.length > 1 && (!currentTextPath || !textPathExists)) {
        // Try to find name-like column (case-insensitive) - prioritize exact matches
        // Also check for email, description, and other common text fields
        const nameColumn = cleanColumns.find(col => {
          const lowerCol = col.toLowerCase();
          return /^name$/i.test(col) || 
            /^typename$/i.test(col) ||
            /^text$/i.test(col) ||
            /^email$/i.test(col) ||
            /^description$/i.test(col) ||
            lowerCol.includes('name') || 
            lowerCol.includes('text') ||
            lowerCol.includes('label') ||
            lowerCol.includes('title') ||
            lowerCol.includes('email') ||
            lowerCol.includes('desc');
        }) || cleanColumns[1] || cleanColumns[0];
        this.sqlQueryConfig.textPath = nameColumn;
        console.log('[FieldsList] Auto-set textPath to:', nameColumn, textPathExists ? '(corrected from non-existent column)' : '(initial set)');
      } else if (cleanColumns.length === 1 && (!currentTextPath || !textPathExists)) {
        // If only one column, use it for both
        this.sqlQueryConfig.textPath = cleanColumns[0];
        console.log('[FieldsList] Auto-set textPath to (single column):', cleanColumns[0]);
      }
    } else {
      // Fallback to defaults if can't parse
      if (!this.sqlQueryConfig.valuePath || !this.sqlQueryConfig.valuePath.trim()) {
        this.sqlQueryConfig.valuePath = 'Id';
      }
      if (!this.sqlQueryConfig.textPath || !this.sqlQueryConfig.textPath.trim()) {
        this.sqlQueryConfig.textPath = 'Name';
      }
      console.log('[FieldsList] Could not parse SQL, using defaults:', {
        valuePath: this.sqlQueryConfig.valuePath,
        textPath: this.sqlQueryConfig.textPath
      });
    }

    // Update dataSourceConfig with current values
    this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath.trim();
    this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath.trim();

    console.log('[FieldsList] runSqlQuery - Extracted paths:', {
      valuePath: this.sqlQueryConfig.valuePath,
      textPath: this.sqlQueryConfig.textPath,
      sqlQuery: this.sqlQueryConfig.sqlQuery
    });

    // Execute query using previewDataSource
    this.previewDataSource();
  }

  /**
   * Preview SQL Query - Same as Run Query but with preview context
   */
  previewSqlQuery(): void {
    // Same functionality as runSqlQuery
    this.runSqlQuery();
  }

  /**
   * Load saved SQL queries for the current database
   */
  loadSavedQueries(): void {
    if (!this.sqlQueryConfig.database) {
      this.savedQueries = [];
      return;
    }

    this.userQueriesService.getUserQueriesByDatabase(this.sqlQueryConfig.database).subscribe({
      next: (queries) => {
        // Ensure queries is an array
        if (!Array.isArray(queries)) {
          console.warn('[FieldsList] Response is not an array:', queries);
          this.savedQueries = [];
          return;
        }
        
        // Filter only active queries
        this.savedQueries = queries.filter(q => q && q.isActive);
        console.log('[FieldsList] Loaded saved queries:', this.savedQueries.length);
        
        if (this.savedQueries.length > 0) {
          console.log('[FieldsList] Saved queries details:', this.savedQueries.map(q => ({
            id: q.id,
            queryName: q.queryName,
            databaseName: q.databaseName,
            query: q.query ? q.query.substring(0, 50) + '...' : 'N/A'
          })));
        }
      },
      error: (error) => {
        console.error('[FieldsList] Error loading saved queries:', error);
        this.savedQueries = [];
      }
    });
  }

  /**
   * Load selected saved query into SQL input
   */
  onSavedQuerySelect(): void {
    // Convert to number if it's a string (from HTML select)
    const queryId = this.selectedSavedQueryId ? Number(this.selectedSavedQueryId) : null;
    
    if (!queryId) {
      // If no query selected, clear the textarea
      this.sqlQueryConfig.sqlQuery = '';
      this.selectedSavedQueryId = null;
      return;
    }

    console.log('[FieldsList] Looking for query with ID:', queryId);
    console.log('[FieldsList] Available queries:', this.savedQueries.map(q => ({ id: q.id, name: q.queryName })));

    // Find query by ID (compare as numbers)
    const selectedQuery = this.savedQueries.find(q => Number(q.id) === queryId);
    
    if (selectedQuery) {
      console.log('[FieldsList] Loading saved query:', {
        id: selectedQuery.id,
        queryName: selectedQuery.queryName,
        query: selectedQuery.query,
        database: selectedQuery.databaseName
      });
      
      // Set the SQL query in textarea
      this.sqlQueryConfig.sqlQuery = selectedQuery.query || '';
      
      // Set the database
      this.sqlQueryConfig.database = selectedQuery.databaseName as 'FormBuilder' | 'AkhmanageIt';
      
      // Force change detection to update the textarea
      this.cdr.detectChanges();
      
      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Query Loaded',
        detail: `Query "${selectedQuery.queryName}" loaded successfully`,
        life: 3000
      });
      
      // Note: We don't auto-run the query - user can click "Run Query" button manually
      // If you want to auto-run, uncomment the line below:
      // this.runSqlQuery();
    } else {
      console.warn('[FieldsList] Selected query not found:', {
        requestedId: queryId,
        requestedIdType: typeof queryId,
        availableIds: this.savedQueries.map(q => ({ id: q.id, idType: typeof q.id, name: q.queryName })),
        savedQueriesCount: this.savedQueries.length
      });
      
      // Reset selection if query not found
      this.selectedSavedQueryId = null;
      this.cdr.detectChanges();
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Query Not Found',
        detail: 'Selected query could not be loaded. Please select again.',
        life: 3000
      });
    }
  }

  /**
   * Open dialog to save current query
   */
  openSaveQueryDialog(): void {
    if (!this.sqlQueryConfig.sqlQuery || !this.sqlQueryConfig.sqlQuery.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter SQL Query before saving'
      });
      return;
    }

    this.queryNameToSave = '';
    this.showSaveQueryDialog = true;
  }

  /**
   * Save current SQL query
   */
  saveCurrentQuery(): void {
    if (!this.queryNameToSave || !this.queryNameToSave.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter a query name'
      });
      return;
    }

    if (!this.sqlQueryConfig.sqlQuery || !this.sqlQueryConfig.sqlQuery.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please enter SQL Query before saving'
      });
      return;
    }

    if (!this.sqlQueryConfig.database) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select a database'
      });
      return;
    }

    this.savingQuery = true;

    const createDto: CreateUserQueryDto = {
      queryName: this.queryNameToSave.trim(),
      databaseName: this.sqlQueryConfig.database,
      query: this.sqlQueryConfig.sqlQuery.trim()
    };

    this.userQueriesService.createUserQuery(createDto).subscribe({
      next: (savedQuery) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Query Saved',
          detail: `Query "${savedQuery.queryName}" saved successfully`
        });
        
        // Reload saved queries
        this.loadSavedQueries();
        
        // Close dialog
        this.showSaveQueryDialog = false;
        this.queryNameToSave = '';
        this.savingQuery = false;
      },
      error: (error) => {
        console.error('[FieldsList] Error saving query:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to save query'
        });
        this.savingQuery = false;
      }
    });
  }

  /**
   * Cancel saving query
   */
  cancelSaveQuery(): void {
    this.showSaveQueryDialog = false;
    this.queryNameToSave = '';
  }

  /**
   * Extract available properties from raw API response
   */
  extractAvailableProperties(): void {
    this.availableProperties = [];
    this.hasSuggestedPaths = false; // Reset suggested paths flag

    if (!this.rawApiResponse) return;

    try {
      let dataArray: any[] = [];

      // Check if it's a direct array
      if (Array.isArray(this.rawApiResponse)) {
        dataArray = this.rawApiResponse;
      }
      // Check if it's wrapped in data
      else if (this.rawApiResponse.data && Array.isArray(this.rawApiResponse.data)) {
        dataArray = this.rawApiResponse.data;
      }
      // Check if it's wrapped in results
      else if (this.rawApiResponse.results && Array.isArray(this.rawApiResponse.results)) {
        dataArray = this.rawApiResponse.results;
      }
      // Check if it's wrapped in items
      else if (this.rawApiResponse.items && Array.isArray(this.rawApiResponse.items)) {
        dataArray = this.rawApiResponse.items;
      }
      // Fallback: Check for ANY property that is an array of objects (to handle cases like { users: [...] })
      else if (typeof this.rawApiResponse === 'object' && this.rawApiResponse !== null) {
        const responseKeys = Object.keys(this.rawApiResponse);
        for (const key of responseKeys) {
          const value = this.rawApiResponse[key];
          if (Array.isArray(value) && value.length > 0) {
            const firstElement = value[0];
            // If the first element is an object, this is likely our data array
            if (typeof firstElement === 'object' && firstElement !== null) {
              dataArray = value;
              console.log(`[FieldsList] Found array data in property: "${key}"`);
              break;
            }
          }
        }
      }

      if (dataArray.length > 0) {
        const firstItem = dataArray[0];
        const keys = Object.keys(firstItem);
        this.availableProperties = keys.sort();
        console.log('[FieldsList] Available properties:', this.availableProperties);
      }
    } catch (e) {
      console.error('[FieldsList] Error extracting available properties:', e);
      this.availableProperties = [];
    }
  }

  /**
   * Extract available columns from raw API response
   */
  extractColumnsFromRawResponse(): void {
    if (!this.rawApiResponse) return;

    try {
      let dataArray: any[] = [];

      // Check if it's a direct array
      if (Array.isArray(this.rawApiResponse)) {
        dataArray = this.rawApiResponse;
      }
      // Check if it's wrapped in data
      else if (this.rawApiResponse.data && Array.isArray(this.rawApiResponse.data)) {
        dataArray = this.rawApiResponse.data;
      }
      // Check if it's wrapped in results
      else if (this.rawApiResponse.results && Array.isArray(this.rawApiResponse.results)) {
        dataArray = this.rawApiResponse.results;
      }
      // Check if it's wrapped in items
      else if (this.rawApiResponse.items && Array.isArray(this.rawApiResponse.items)) {
        dataArray = this.rawApiResponse.items;
      }

      if (dataArray.length > 0) {
        const firstItem = dataArray[0];

        // For FieldOptionResponse objects, we need to check if there's raw data
        // If the item has a structure like { value: ..., text: ... }, we might need to look deeper
        // But for LookupTable, the backend should return raw table rows
        const columns = Object.keys(firstItem);

        // Filter out internal properties that shouldn't be shown as columns
        const filteredColumns = columns.filter(col => {
          const colLower = col.toLowerCase();
          // Keep common column names, exclude internal properties
          return !colLower.includes('option') &&
            !colLower.includes('foreign') &&
            col !== 'isActive' &&
            col !== 'isDefault' &&
            col !== 'optionOrder';
        });

        // Replace availableColumns instead of filtering (to avoid duplicates)
        this.availableColumns = filteredColumns.length > 0 ? filteredColumns.sort() : columns.sort();
      }
    } catch (e) {
      console.error('[FieldsList] Error extracting columns:', e);
    }
  }

  /**
   * Test API directly to see raw response structure
   */
  testApiResponse(): void {
    // For LookupTable, use previewDataSource instead of direct API call
    if (this.dataSourceType === 'LookupTable') {
      if (!this.lookupTableConfig.table || !this.lookupTableConfig.table.trim()) {
        // this.messageService.add({
        //   severity: 'warn',
        //   summary: 'Validation',
        //   detail: 'Please select a table first'
        // });
        return;
      }
      // For LookupTable, call previewDataSource to get raw data
      this.previewDataSource();
      return;
    }

    if (!this.dataSourceConfig.apiUrl || !this.dataSourceConfig.apiUrl.trim()) {
      // this.messageService.add({
      //   severity: 'warn',
      //   summary: 'Validation',
      //   detail: 'Please enter API URL first'
      // });
      return;
    }

    const apiTarget = this.resolveApiRequestTarget(this.dataSourceConfig.apiUrl.trim());
    if (!apiTarget) {
      return;
    }

    const url = apiTarget.fullUrl;

    if (apiTarget.usesSapConnection) {
      return;
    }

    this.loadingPreview = true;
    this.rawApiResponse = null;
    this.apiDebugError = null;
    this.hasSuggestedPaths = false; // Reset suggested paths flag
    // this.showApiDebugInfo = true;

    const method = (this.dataSourceConfig.httpMethod || 'GET').toUpperCase();
    let body: any = null;

    try {
      if (this.dataSourceConfig.requestBodyJson) {
        body = JSON.parse(this.dataSourceConfig.requestBodyJson);
      }
    } catch (e) {
      this.loadingPreview = false;
      this.apiDebugError = 'Invalid JSON in request body';
      // this.messageService.add({
      //   severity: 'error',
      //   summary: 'Invalid JSON',
      //   detail: 'The request body JSON is invalid. Please check the format.',
      //   life: 5000
      // });
      this.cdr.detectChanges();
      return;
    }

    console.log('[FieldsList] Testing API directly:', { url, method, body });

    // Use fetch API for direct testing (available in modern browsers)
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (method === 'POST' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    fetch(url, fetchOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        this.rawApiResponse = data;
        this.apiDebugError = null;
        this.loadingPreview = false;
        console.log('[FieldsList] Raw API Response:', data);

        // Extract available properties
        this.extractAvailableProperties();

        // Extract columns if LookupTable type
        if (this.dataSourceType === 'LookupTable') {
          this.extractColumnsFromRawResponse();
        }

        // this.messageService.add({
        //   severity: 'success',
        //   summary: 'API Test Success',
        //   detail: 'API response received. Check available properties below.',
        //   life: 5000
        // });
        this.cdr.detectChanges();
      })
      .catch(error => {
        this.loadingPreview = false;
        let errorMsg = error.message || 'Failed to fetch API response';

        // Detect network/DNS errors and provide helpful messages
        const errorMsgLower = errorMsg.toLowerCase();
        if (errorMsgLower.includes('no such host') ||
          errorMsgLower.includes('host is known') ||
          errorMsgLower.includes('failed to resolve') ||
          errorMsgLower.includes('dns') ||
          errorMsgLower.includes('network') ||
          errorMsgLower.includes('connection') ||
          errorMsgLower.includes('timeout') ||
          errorMsgLower.includes('refused') ||
          errorMsgLower.includes('fetch')) {
          errorMsg = `Network error: ${errorMsg}\n\n` +
            `Possible causes:\n` +
            `• DNS resolution failure\n` +
            `• Network connectivity issue\n` +
            `• Firewall or proxy blocking\n` +
            `• API server might be down\n\n` +
            `Please verify the API URL is correct and accessible.`;
        }

        this.apiDebugError = errorMsg;
        console.error('[FieldsList] API Test Error:', error);
        // this.messageService.add({
        //   severity: 'error',
        //   summary: 'API Test Failed',
        //   detail: errorMsg,
        //   life: 8000
        // });
        this.cdr.detectChanges();
      });
  }

  /**
   * Toggle API debug info visibility
   */
  toggleApiDebugInfo(): void {
    this.showApiDebugInfo = !this.showApiDebugInfo;
    if (!this.showApiDebugInfo) {
      this.rawApiResponse = null;
      this.apiDebugError = null;
      // Keep availableProperties visible even when debug panel is closed
    }
  }

  /**
   * Get suggested paths from raw API response
   */
  getSuggestedPaths(): { valuePath: string; textPath: string } | null {
    if (!this.rawApiResponse) return null;

    try {
      // Try to detect the structure
      let dataArray: any[] = [];

      // Check if it's a direct array
      if (Array.isArray(this.rawApiResponse)) {
        dataArray = this.rawApiResponse;
      }
      // Check if it's wrapped in data
      else if (this.rawApiResponse.data && Array.isArray(this.rawApiResponse.data)) {
        dataArray = this.rawApiResponse.data;
      }
      // Check if it's wrapped in results
      else if (this.rawApiResponse.results && Array.isArray(this.rawApiResponse.results)) {
        dataArray = this.rawApiResponse.results;
      }
      // Check if it's wrapped in items
      else if (this.rawApiResponse.items && Array.isArray(this.rawApiResponse.items)) {
        dataArray = this.rawApiResponse.items;
      }

      if (dataArray.length > 0) {
        const firstItem = dataArray[0];
        const keys = Object.keys(firstItem);

        // Find potential value path (usually id, Id, value, Value, etc.)
        const valueKey = keys.find(k =>
          k.toLowerCase() === 'id' ||
          k.toLowerCase() === 'value' ||
          k.toLowerCase() === 'key' ||
          k === 'Id' ||
          k === 'ID'
        ) || keys[0];

        // Find potential text path with improved logic
        // Priority order: name > firstname/lastname > username > email > text > label > title > other text-like fields
        let textKey = keys.find(k =>
          k.toLowerCase() === 'name' ||
          k === 'Name'
        );

        // If no 'name', try firstname or lastname (prefer firstname)
        if (!textKey) {
          textKey = keys.find(k =>
            k.toLowerCase() === 'firstname' ||
            k.toLowerCase() === 'first_name' ||
            k.toLowerCase() === 'firstName' ||
            k === 'Firstname' ||
            k === 'FirstName'
          );
        }

        // If still no match, try lastname
        if (!textKey) {
          textKey = keys.find(k =>
            k.toLowerCase() === 'lastname' ||
            k.toLowerCase() === 'last_name' ||
            k.toLowerCase() === 'lastName' ||
            k === 'Lastname' ||
            k === 'LastName'
          );
        }

        // Try other common text fields
        if (!textKey) {
          textKey = keys.find(k =>
            k.toLowerCase() === 'username' ||
            k.toLowerCase() === 'user_name' ||
            k.toLowerCase() === 'email' ||
            k.toLowerCase() === 'text' ||
            k.toLowerCase() === 'label' ||
            k.toLowerCase() === 'title' ||
            k.toLowerCase() === 'description' ||
            k.toLowerCase() === 'desc' ||
            k === 'Text' ||
            k === 'Label' ||
            k === 'Title'
          );
        }

        // Fallback: use first non-id, non-value, non-key field, or second key if available
        if (!textKey) {
          const nonValueKeys = keys.filter(k => {
            const kLower = k.toLowerCase();
            return kLower !== 'id' && kLower !== 'value' && kLower !== 'key' &&
              kLower !== 'uuid' && kLower !== 'createdat' && kLower !== 'updatedat';
          });
          textKey = nonValueKeys.length > 0 ? nonValueKeys[0] : (keys.length > 1 ? keys[1] : keys[0]);
        }

        return {
          valuePath: valueKey,
          textPath: textKey
        };
      }
    } catch (e) {
      console.error('[FieldsList] Error analyzing API response:', e);
    }

    return null;
  }

  /**
   * Apply suggested paths
   */
  applySuggestedPaths(): void {
    const suggested = this.getSuggestedPaths();
    if (suggested) {
      this.dataSourceConfig.valuePath = suggested.valuePath;
      this.dataSourceConfig.textPath = suggested.textPath;
      this.hasSuggestedPaths = false; // Reset flag after applying
      this.messageService.add({
        severity: 'success',
        summary: 'Paths Applied',
        detail: `Applied paths: valuePath="${suggested.valuePath}", textPath="${suggested.textPath}"`
      });
      this.cdr.detectChanges();
    }
  }

  /**
   * Apply property as Value Path or Text Path when clicked
   */
  applyPropertyAsPath(property: string): void {
    const propLower = property.toLowerCase();

    // Check if it's likely a value path (id, value, key, etc.)
    if (propLower.includes('id') || propLower === 'value' || propLower === 'key') {
      this.dataSourceConfig.valuePath = property;
      this.messageService.add({
        severity: 'info',
        summary: 'Value Path Set',
        detail: `Value Path set to: "${property}"`,
        life: 3000
      });
    } else {
      // Otherwise, set as text path (name, text, label, title, etc.)
      this.dataSourceConfig.textPath = property;
      this.messageService.add({
        severity: 'info',
        summary: 'Text Path Set',
        detail: `Text Path set to: "${property}"`,
        life: 3000
      });
    }
    this.cdr.detectChanges();
  }

  /**
   * Apply column as Value Path or Text Path when clicked (for LookupTable)
   */
  applyColumnAsPath(column: string): void {
    const colLower = column.toLowerCase();

    // Check if it's likely a value path (id, value, key, etc.)
    if (colLower.includes('id') || colLower === 'value' || colLower === 'key') {
      this.lookupTableConfig.valueColumn = column;
      this.dataSourceConfig.valuePath = column;
      this.messageService.add({
        severity: 'info',
        summary: 'Value Path Set',
        detail: `Value Path set to: "${column}"`,
        life: 3000
      });
    } else {
      // Otherwise, set as text path (name, text, label, title, etc.)
      this.lookupTableConfig.textColumn = column;
      this.dataSourceConfig.textPath = column;
      this.messageService.add({
        severity: 'info',
        summary: 'Text Path Set',
        detail: `Text Path set to: "${column}"`,
        life: 3000
      });
    }
    this.cdr.detectChanges();
  }

  /**
   * Handle database change for LookupTable - reload tables and reset selection
   */
  /**
   * Handle SQL Query Database change - prevent "Auto" value
   */
  onSqlDatabaseChange(value: any): void {
    const dbValue = String(value || '');
    if (dbValue === 'Auto' || !value) {
      console.warn('[FieldsList] Prevented setting database to "Auto", using "FormBuilder" instead');
      this.sqlQueryConfig.database = 'FormBuilder';
      this.cdr.detectChanges();
      // Load saved queries for FormBuilder
      this.loadSavedQueries();
    } else {
      this.sqlQueryConfig.database = value as 'FormBuilder' | 'AkhmanageIt';
      // Load saved queries for the selected database
      this.loadSavedQueries();
    }
  }

  onLookupDatabaseChange(): void {
    if (this.dataSourceType !== 'LookupTable') {
      return;
    }

    // Reset table and columns when database changes
    this.lookupTableConfig.table = '';
    this.availableLookupTables = [];
    this.availableColumns = [];
    this.dataSourceConfig.apiUrl = null;
    this.dataSourceConfig.valuePath = null;
    this.dataSourceConfig.textPath = null;
    this.previewOptions = [];

    // Load tables for the selected database
    this.loadLookupTables();
    this.cdr.detectChanges();
  }

  /**
   * Load available lookup tables
   */
  loadLookupTables(): void {
    if (this.dataSourceType !== 'LookupTable') {
      return;
    }

    const database = this.lookupTableConfig.database || 'FormBuilder';
    console.log('[FieldsList] Loading lookup tables for database:', database);
    console.log('[FieldsList] lookupTableConfig.database:', this.lookupTableConfig.database);
    this.fieldDataSourceService.getAvailableLookupTables(database).subscribe({
      next: (tables) => {
        console.log('[FieldsList] Tables received from backend:', tables);
        console.log('[FieldsList] Selected database was:', database);
        // Backend returns string[], simply assign it
        this.availableLookupTables = tables || [];

        if (this.availableLookupTables.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No Tables',
            detail: 'No lookup tables available. Please contact administrator.'
          });
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.availableLookupTables = [];
        console.error('[FieldsList] Error loading lookup tables:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load lookup tables'
        });
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Preview DataSource options
   */
  previewDataSource(): void {
    // If it's an API, we also want to fetch the raw response to populate "Available Properties"
    if (this.dataSourceType === 'Api') {
      this.testApiResponse();
    }
    // For new fields, use a temporary fieldId (0) - backend should handle this
    const fieldId = this.editingField?.id || 0;

    if (this.dataSourceType === 'Static') {
      return;
    }

    // Validate required fields
    let resolvedApiTarget: { baseUrl: string; apiPath: string | null; fullUrl: string; usesSapConnection: boolean } | null = null;
    if (this.dataSourceType === 'Api') {
      if (!this.dataSourceConfig.apiUrl || !this.dataSourceConfig.apiUrl.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please enter API URL'
        });
        return;
      }

      resolvedApiTarget = this.resolveApiRequestTarget(this.dataSourceConfig.apiUrl.trim());
      if (!resolvedApiTarget) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'For SAP B1, enter an endpoint like BusinessPartners and select SAP connection. For a normal API, enter a full URL.'
        });
        return;
      }
    } else if (this.dataSourceType === 'LookupTable') {
      if (!this.lookupTableConfig.table || !this.lookupTableConfig.table.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a Table'
        });
        return;
      }
      // Update valuePath and textPath from lookupTableConfig
      this.dataSourceConfig.valuePath = this.lookupTableConfig.valueColumn;
      this.dataSourceConfig.textPath = this.lookupTableConfig.textColumn;
    } else if (this.dataSourceType === 'FormSubmissions') {
      if (!this.formSubmissionConfig.formId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a source form'
        });
        return;
      }
      const hasValueField = !!(this.formSubmissionConfig.valueFieldId || this.formSubmissionConfig.valueFieldCode);
      const hasTextField = !!(this.formSubmissionConfig.textFieldId || this.formSubmissionConfig.textFieldCode);
      if (!hasValueField || !hasTextField) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select both value and text fields'
        });
        return;
      }

      if (this.formSubmissionConfig.valueFieldId) {
        this.onSubmissionValueFieldChange();
      } else {
        this.dataSourceConfig.valuePath = this.formSubmissionConfig.valueFieldCode || null;
      }

      if (this.formSubmissionConfig.textFieldId) {
        this.onSubmissionTextFieldChange();
      } else {
        this.dataSourceConfig.textPath = this.formSubmissionConfig.textFieldCode || null;
      }
    } else if (this.dataSourceType === 'SqlQuery') {
      if (!this.sqlQueryConfig.sqlQuery || !this.sqlQueryConfig.sqlQuery.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please enter SQL Query'
        });
        return;
      }
      // For SQL queries, let the backend infer a single selected column when value/text are empty.
      this.dataSourceConfig.valuePath = (this.sqlQueryConfig.valuePath || '').trim();
      this.dataSourceConfig.textPath = (this.sqlQueryConfig.textPath || '').trim();
    }

    // Ensure valuePath and textPath are set with defaults if empty
    // Only set defaults if availableProperties is empty (no API tested yet)
    if (this.dataSourceType !== 'SqlQuery' && this.availableProperties.length === 0) {
      const defaultValuePath = this.dataSourceType === 'LookupTable' ? 'Id' : 'id';
      const defaultTextPath = this.dataSourceType === 'LookupTable' ? 'Name' : 'name';

      // Update the config with defaults if paths are empty/null/undefined
      if (!this.dataSourceConfig.valuePath || !this.dataSourceConfig.valuePath.trim()) {
        this.dataSourceConfig.valuePath = defaultValuePath;
        if (this.dataSourceType === 'LookupTable') {
          this.lookupTableConfig.valueColumn = defaultValuePath;
        }
      }
      if (!this.dataSourceConfig.textPath || !this.dataSourceConfig.textPath.trim()) {
        this.dataSourceConfig.textPath = defaultTextPath;
        if (this.dataSourceType === 'LookupTable') {
          this.lookupTableConfig.textColumn = defaultTextPath;
        }
      }
    } else {
      // If availableProperties exists, auto-select first id-like property for valuePath
      if (!this.dataSourceConfig.valuePath || !this.dataSourceConfig.valuePath.trim()) {
        const idProp = this.availableProperties.find(p =>
          p.toLowerCase().includes('id') || p.toLowerCase() === 'value' || p.toLowerCase() === 'key'
        ) || this.availableProperties[0];
        this.dataSourceConfig.valuePath = idProp;
      }
      // Auto-select first name-like property for textPath
      if (!this.dataSourceConfig.textPath || !this.dataSourceConfig.textPath.trim()) {
        const nameProp = this.availableProperties.find(p =>
          p.toLowerCase().includes('name') || p.toLowerCase().includes('text') ||
          p.toLowerCase().includes('label') || p.toLowerCase().includes('title')
        ) || (this.availableProperties.length > 1 ? this.availableProperties[1] : this.availableProperties[0]);
        this.dataSourceConfig.textPath = nameProp;
      }
    }

    this.loadingPreview = true;
    this.previewOptions = [];

    // Use the paths from config (now guaranteed to be set)
    // For LookupTable, use lookupTableConfig columns; for SqlQuery/SapHana, use sqlQueryConfig paths; for others, use dataSourceConfig paths
    let valuePath: string;
    let textPath: string;
    
    if (this.dataSourceType === 'LookupTable') {
      valuePath = (this.lookupTableConfig.valueColumn || this.dataSourceConfig.valuePath || 'Id').trim();
      textPath = (this.lookupTableConfig.textColumn || this.dataSourceConfig.textPath || 'Name').trim();
      // Sync with dataSourceConfig for consistency
      this.dataSourceConfig.valuePath = valuePath;
      this.dataSourceConfig.textPath = textPath;
    } else if (this.dataSourceType === 'SqlQuery' || this.dataSourceType === 'SapHana') {
      if (this.dataSourceType === 'SqlQuery') {
        valuePath = (this.sqlQueryConfig.valuePath || this.dataSourceConfig.valuePath || '').trim();
        textPath = (this.sqlQueryConfig.textPath || this.dataSourceConfig.textPath || '').trim();
      } else {
        // For SapHana, use sqlQueryConfig paths, fallback to dataSourceConfig, then defaults
        valuePath = (this.sqlQueryConfig.valuePath || this.dataSourceConfig.valuePath || 'ID').trim();
        textPath = (this.sqlQueryConfig.textPath || this.dataSourceConfig.textPath || 'NAME').trim();
      }
      // Sync with both configs for consistency
      this.sqlQueryConfig.valuePath = valuePath;
      this.sqlQueryConfig.textPath = textPath;
      this.dataSourceConfig.valuePath = valuePath;
      this.dataSourceConfig.textPath = textPath;
    } else {
      valuePath = (this.dataSourceConfig.valuePath || 'id').trim();
      textPath = (this.dataSourceConfig.textPath || 'name').trim();
    }

    // For LookupTable, use table name directly for preview (backend expects table name, not JSON)
    // For Api, use the URL
    // For SqlQuery/SapHana, use undefined for apiUrl and SQL query in requestBodyJson
    const apiUrlForPreview = this.dataSourceType === 'LookupTable'
      ? this.lookupTableConfig.table
      : (this.dataSourceType === 'FormSubmissions'
        ? (this.formSubmissionConfig.formId ? String(this.formSubmissionConfig.formId) : undefined)
        : ((this.dataSourceType === 'SqlQuery' || this.dataSourceType === 'SapHana') ? undefined : (this.dataSourceConfig.apiUrl || undefined)));

    // For SqlQuery, use SQL query and database in requestBodyJson as JSON object
    // For LookupTable, include database in requestBodyJson as JSON object
    let requestBodyJsonForPreview: string | undefined;
    let configurationJsonForPreview: string | undefined;
    if (this.dataSourceType === 'SqlQuery') {
      // Backend expects RequestBodyJson to be the SQL query string directly (not a JSON object)
      // Based on the API test: RequestBodyJson should be "SELECT Id, email FROM Tbl_User WHERE IsActive = '1'"
      requestBodyJsonForPreview = this.sqlQueryConfig.sqlQuery.trim();
      
      // Also prepare ConfigurationJson for database specification
      if (this.sqlQueryConfig.database) {
        // Ensure database name matches backend expectations
        let dbName = this.sqlQueryConfig.database.trim();
        // Normalize database name (FormBuilder or AkhmanageIt)
        if (dbName === 'AKHManageIT' || dbName === 'AKHManageIT Database') {
          dbName = 'AkhmanageIt';
        } else if (dbName === 'FormBuilder Database') {
          dbName = 'FormBuilder';
        }
        const sqlQueryPayload: any = {
          sqlQuery: this.sqlQueryConfig.sqlQuery,
          valueColumn: valuePath,
          textColumn: textPath,
          database: dbName
        };
        configurationJsonForPreview = JSON.stringify(sqlQueryPayload);
        console.log('[FieldsList] Database normalized:', dbName, 'from:', this.sqlQueryConfig.database);
        console.log('[FieldsList] ConfigurationJson (with database):', configurationJsonForPreview);
      }
      console.log('[FieldsList] SqlQuery RequestBodyJson (SQL string):', requestBodyJsonForPreview);
    } else if (this.dataSourceType === 'SapHana') {
      // For SapHana, backend expects the SQL query string directly in RequestBodyJson
      requestBodyJsonForPreview = this.sqlQueryConfig.sqlQuery ? this.sqlQueryConfig.sqlQuery.trim() : '';
      configurationJsonForPreview = JSON.stringify({
        sqlQuery: requestBodyJsonForPreview,
        valueColumn: valuePath,
        textColumn: textPath,
        sapConfigId: this.selectedDataSourceSapConnectionId ?? undefined
      });
      console.log('[FieldsList] SapHana RequestBodyJson (SQL string):', requestBodyJsonForPreview);
    } else if (this.dataSourceType === 'LookupTable') {
      // For LookupTable, include database in requestBodyJson
      const lookupTablePayload: any = {};
      if (this.lookupTableConfig.database && this.lookupTableConfig.database.trim()) {
        // Ensure database name matches backend expectations (AkhmanageIt, not AKHManageIT)
        const dbName = this.lookupTableConfig.database.trim();
        lookupTablePayload.database = dbName === 'AKHManageIT' ? 'AkhmanageIt' : dbName;
      }
      requestBodyJsonForPreview = Object.keys(lookupTablePayload).length > 0 
        ? JSON.stringify(lookupTablePayload) 
        : undefined;
      console.log('[FieldsList] LookupTable payload:', lookupTablePayload);
      console.log('[FieldsList] RequestBodyJson for LookupTable:', requestBodyJsonForPreview);
    } else if (this.dataSourceType === 'FormSubmissions') {
      configurationJsonForPreview = JSON.stringify({
        formId: this.formSubmissionConfig.formId,
        formCode: this.formSubmissionConfig.formCode,
        valueFieldCode: this.formSubmissionConfig.valueFieldCode,
        textFieldCode: this.formSubmissionConfig.textFieldCode
      });
    } else {
      requestBodyJsonForPreview = this.dataSourceConfig.requestBodyJson || undefined;
      if (this.dataSourceType === 'Api') {
        configurationJsonForPreview = JSON.stringify({
          url: resolvedApiTarget?.baseUrl || this.dataSourceConfig.apiUrl || undefined,
          apiPath: resolvedApiTarget?.apiPath || undefined,
          httpMethod: this.dataSourceConfig.httpMethod || 'GET',
          requestBodyJson: requestBodyJsonForPreview,
          valuePath,
          textPath,
          sapConfigId: this.selectedDataSourceSapConnectionId ?? undefined
        });
      }
    }

    // Prepare request payload
    // Note: fieldId is optional for preview (use 0 if not editing an existing field)
    const requestPayload: any = {
      SourceType: this.dataSourceType, // Keep canonical source type names
      ValuePath: valuePath, // Backend expects PascalCase
      TextPath: textPath    // Backend expects PascalCase
    };
    
    // Only include fieldId if it's a valid field ID (not 0 or undefined)
    // For preview, fieldId can be 0 or omitted
    if (fieldId && fieldId > 0) {
      requestPayload.fieldId = fieldId; // Keep camelCase for fieldId (backend may accept both)
    }
    
    // For SqlQuery, RequestBodyJson should be the SQL query string directly
    // Based on API test: RequestBodyJson = "select id, TypeName from FIELD_TYPES"
    if (this.dataSourceType === 'SqlQuery') {
      requestPayload.RequestBodyJson = requestBodyJsonForPreview; // SQL query string (PascalCase)
      // Include ConfigurationJson only if database is specified (for database selection)
      if (configurationJsonForPreview) {
        requestPayload.ConfigurationJson = configurationJsonForPreview; // PascalCase
      }
    } else if (this.dataSourceType === 'FormSubmissions') {
      requestPayload.ApiUrl = apiUrlForPreview;
      requestPayload.ConfigurationJson = configurationJsonForPreview;
    } else if (this.dataSourceType === 'SapHana') {
      // For SapHana, RequestBodyJson is the SAP HANA SQL query string, SourceType is already "SapHana"
      requestPayload.RequestBodyJson = requestBodyJsonForPreview;
      requestPayload.ConfigurationJson = configurationJsonForPreview;
      requestPayload.SapConfigId = this.selectedDataSourceSapConnectionId ?? undefined;
    } else {
      // For other types, include apiUrl and httpMethod if needed
      if (apiUrlForPreview) {
        requestPayload.ApiUrl = this.dataSourceType === 'Api'
          ? (resolvedApiTarget?.baseUrl || apiUrlForPreview)
          : apiUrlForPreview; // PascalCase
      }
      if (this.dataSourceConfig.httpMethod && this.dataSourceConfig.httpMethod !== 'GET') {
        requestPayload.HttpMethod = this.dataSourceConfig.httpMethod; // PascalCase
      }
      if (requestBodyJsonForPreview) {
        requestPayload.RequestBodyJson = requestBodyJsonForPreview; // PascalCase
      }
      if (this.dataSourceType === 'Api') {
        requestPayload.ConfigurationJson = configurationJsonForPreview;
        requestPayload.SapConfigId = this.selectedDataSourceSapConnectionId ?? undefined;
      }
    }

    console.log('[FieldsList] ========== PREVIEW REQUEST START ==========');
    console.log('[FieldsList] Full request payload:', JSON.stringify(requestPayload, null, 2));
    console.log('[FieldsList] Sending API request to preview DataSource:', requestPayload);
    if (this.dataSourceType === 'SqlQuery') {
      console.log('[FieldsList] SQL Query:', this.sqlQueryConfig.sqlQuery);
      console.log('[FieldsList] Database:', this.sqlQueryConfig.database || 'FormBuilder');
      console.log('[FieldsList] Value Path:', valuePath);
      console.log('[FieldsList] Text Path:', textPath);
      console.log('[FieldsList] ConfigurationJson:', configurationJsonForPreview || 'Not set');
      console.log('[FieldsList] RequestBodyJson (SQL string):', requestBodyJsonForPreview);
      console.log('[FieldsList] RequestBodyJson type:', typeof requestBodyJsonForPreview);
      console.log('[FieldsList] SourceType:', requestPayload.sourceType);
      console.log('[FieldsList] Full request object keys:', Object.keys(requestPayload));
    } else if (this.dataSourceType === 'SapHana') {
      console.log('[FieldsList] SAP HANA Query:', this.sqlQueryConfig.sqlQuery);
      console.log('[FieldsList] Value Path:', valuePath);
      console.log('[FieldsList] Text Path:', textPath);
      console.log('[FieldsList] RequestBodyJson (SAP HANA SQL string):', requestBodyJsonForPreview);
      console.log('[FieldsList] SourceType:', requestPayload.SourceType || requestPayload.sourceType);
      console.log('[FieldsList] ⚠️ Remember: SAP HANA requires double quotes around identifiers!');
    } else if (this.dataSourceType === 'LookupTable') {
      console.log('[FieldsList] Table:', this.lookupTableConfig.table);
      console.log('[FieldsList] Database:', this.lookupTableConfig.database);
      console.log('[FieldsList] Value Column:', this.lookupTableConfig.valueColumn);
      console.log('[FieldsList] Text Column:', this.lookupTableConfig.textColumn);
      console.log('[FieldsList] Request Body JSON:', requestBodyJsonForPreview);
    } else {
      console.log('[FieldsList] API URL:', this.dataSourceConfig.apiUrl);
      console.log('[FieldsList] HTTP Method:', this.dataSourceConfig.httpMethod || 'GET');
      console.log('[FieldsList] Request Body:', this.dataSourceConfig.requestBodyJson);
    }
    console.log('[FieldsList] Value Path:', valuePath);
    console.log('[FieldsList] Text Path:', textPath);
    console.log('[FieldsList] Source Type:', this.dataSourceType);
    console.log('[FieldsList] ========== PREVIEW REQUEST END ==========');

    this.fieldDataSourceService.previewDataSource(requestPayload).subscribe({
      next: (options) => {
        this.apiPreviewAutoRetryPending = false;
        console.log('[FieldsList] ========== PREVIEW RESPONSE START ==========');
        console.log('[FieldsList] Raw options received:', options);
        console.log('[FieldsList] Options type:', typeof options);
        console.log('[FieldsList] Is array?', Array.isArray(options));
        console.log('[FieldsList] Number of options:', options?.length || 0);
        console.log('[FieldsList] Full response structure:', JSON.stringify(options, null, 2));
        
        // Check if options is wrapped in a data property
        if (options && typeof options === 'object' && !Array.isArray(options) && (options as any).data) {
          console.log('[FieldsList] Options wrapped in data property, extracting...');
          options = (options as any).data;
        }
        
        console.log('[FieldsList] Options after extraction:', options);
        console.log('[FieldsList] Options length after extraction:', options?.length || 0);
        console.log('[FieldsList] ========== PREVIEW RESPONSE END ==========');
        
        // Show success message with options count for SqlQuery, SapHana and LookupTable
        if ((this.dataSourceType === 'SqlQuery' || this.dataSourceType === 'SapHana' || this.dataSourceType === 'LookupTable' || this.dataSourceType === 'FormSubmissions') && options && options.length > 0) {
          // Count options with valid text (for SAP HANA, some might have empty text)
          const validOptionsCount = options.filter((opt: any) => {
            const text = String(opt.text || '').trim();
            return text.length > 0 || (this.dataSourceType === 'SapHana' && opt.value);
          }).length;
          
          const emptyTextCount = options.length - validOptionsCount;
          
          let detailMessage = `${validOptionsCount} ${validOptionsCount === 1 ? 'option' : 'options'} found`;
          if (emptyTextCount > 0 && this.dataSourceType === 'SapHana') {
            detailMessage += ` (${emptyTextCount} ${emptyTextCount === 1 ? 'option' : 'options'} with empty text will use value as display text)`;
          }
          detailMessage += ' and will be available in the public form';
          
          this.messageService.add({
            severity: 'success',
            summary: (this.dataSourceType === 'SqlQuery' || this.dataSourceType === 'SapHana')
              ? 'Query Executed Successfully'
              : (this.dataSourceType === 'FormSubmissions' ? 'Form Data Loaded Successfully' : 'Table Data Loaded Successfully'),
            detail: detailMessage,
            life: 5000
          });
        }

        // Check if response is empty
        if (!options || options.length === 0) {
          console.warn('[FieldsList] ⚠️ Empty response received. Possible reasons:');
          console.warn('1. The API endpoint returned no data');
          console.warn('2. The fieldId does not exist or has no options');
          console.warn('3. The API URL might be incorrect');
          console.warn('4. The backend preview endpoint might need the actual API to be called first');
          console.warn('5. The table might not exist in the selected database');
          console.warn('6. The valuePath or textPath might be incorrect');
          console.warn('[FieldsList] Request payload was:', requestPayload);
        } else {
          console.log('[FieldsList] ✅ Response contains', options.length, 'options');
        }

        // Process options to ensure text is a string (not JSON object)
        const processedOptions = (options || []).map((opt: FieldOptionResponse) => {
          let textValue = opt.text;

          // Helper function to extract value from object using path
          const extractValueByPath = (obj: any, path: string): any => {
            if (!path || !obj) return null;
            const keys = path.split('.');
            let value = obj;
            for (const key of keys) {
              if (value && typeof value === 'object' && key in value) {
                value = value[key];
              } else {
                return null;
              }
            }
            return value;
          };

          // If text is an object, try to extract using the configured textPath
          if (typeof textValue === 'object' && textValue !== null) {
            // Try using the configured textPath first
            if (textPath) {
              const extracted = extractValueByPath(textValue, textPath);
              if (extracted !== null && extracted !== undefined) {
                textValue = extracted;
              }
            }

            // Fallback to common field names if textPath extraction didn't work
            if (typeof textValue === 'object' && textValue !== null) {
              textValue = (textValue as any).name ||
                (textValue as any).first ||
                (textValue as any).text ||
                (textValue as any).title ||
                (textValue as any).label ||
                null;
            }

            // Last resort: if still an object, use JSON string
            if (typeof textValue === 'object' && textValue !== null) {
              textValue = JSON.stringify(textValue);
            }
          }

          // If text is a JSON string, try to parse and extract using textPath
          if (typeof textValue === 'string' && textValue.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(textValue);
              // Try using the configured textPath
              if (textPath) {
                const extracted = extractValueByPath(parsed, textPath);
                if (extracted !== null && extracted !== undefined) {
                  textValue = extracted;
                } else {
                  // Fallback to common field names
                  textValue = parsed.name || parsed.first || parsed.text || parsed.title || parsed.label || textValue;
                }
              } else {
                // No textPath configured, try common field names
                textValue = parsed.name || parsed.first || parsed.text || parsed.title || parsed.label || textValue;
              }
            } catch (e) {
              // If parsing fails, keep the original string
            }
          }

          // Convert to string if still not a string
          if (typeof textValue !== 'string' && textValue !== null && textValue !== undefined) {
            textValue = String(textValue);
          }

          // Clean up text value: handle NULL, empty strings, and weird escaped quotes
          if (textValue === null || textValue === undefined) {
            textValue = '';
          } else if (typeof textValue === 'string') {
            // Trim whitespace
            textValue = textValue.trim();
            
            // Handle weird escaped quote patterns from SAP HANA (e.g., "\" ." or "' '")
            // These are likely NULL values that got escaped incorrectly
            if (textValue === '\\" .' || textValue === '\' \'' || textValue === '\\" :' || 
                textValue === '\" .' || textValue === '\" :' || 
                textValue.match(/^["']\s*["']$/) || textValue.match(/^\\["']\s*[.:]$/)) {
              textValue = '';
            }
            
            // If text is empty or just whitespace/escaped characters, use value as fallback
            if (!textValue || textValue.length === 0) {
              // For SAP HANA, if text is empty, use value as display text
              if (this.dataSourceType === 'SapHana' && opt.value) {
                textValue = String(opt.value);
              } else {
                textValue = '';
              }
            }
          }

          return {
            ...opt,
            text: textValue || ''
          };
        });

        // Filter out options with empty text (unless it's intentional)
        // For SAP HANA, we might want to keep options even if text is empty (use value as text)
        let optionsToFilter = processedOptions;
        if (this.dataSourceType !== 'SapHana') {
          // For non-SAP HANA sources, filter out empty text options
          optionsToFilter = processedOptions.filter((opt: FieldOptionResponse) => {
            const text = String(opt.text || '').trim();
            return text.length > 0;
          });
        }

        // Filter out "Select All" options (in both English and Arabic)
        const filteredOptions = optionsToFilter.filter((opt: FieldOptionResponse) => {
          const text = String(opt.text || '').toLowerCase().trim();
          const value = String(opt.value || '').toLowerCase().trim();

          // Filter out common "Select All" variations
          const selectAllPatterns = [
            'select all',
            'اختيار بال',
            'اختيار الكل',
            'selectall',
            'select_all',
            'all',
            'الكل'
          ];

          return !selectAllPatterns.some(pattern =>
            text === pattern ||
            value === pattern ||
            text.includes(pattern) ||
            value.includes(pattern)
          );
        });

        console.log('[FieldsList] Processed options:', processedOptions);
        console.log('[FieldsList] Filtered options:', filteredOptions);
        console.log('[FieldsList] Setting previewOptions to:', filteredOptions);
        
        this.previewOptions = filteredOptions;
        this.loadingPreview = false;
        
        console.log('[FieldsList] previewOptions after assignment:', this.previewOptions);
        console.log('[FieldsList] previewOptions.length:', this.previewOptions.length);
        this.cdr.detectChanges(); // Force change detection

        // For LookupTable, if columns are not already loaded, try to load from endpoint
        if (this.dataSourceType === 'LookupTable') {
          // If columns are already loaded from endpoint, don't override
          if (this.availableColumns.length === 0) {
            // Try to load columns from endpoint first
            if (this.lookupTableConfig.table && this.lookupTableConfig.table.trim()) {
              this.loadTableColumns(this.lookupTableConfig.table);
            }

            // Also try to extract from preview data as fallback
            if (options && options.length > 0) {
              const firstOption = options[0] as any;
              if (firstOption && typeof firstOption === 'object') {
                const allKeys = Object.keys(firstOption);
                // Filter out standard FieldOptionResponse properties
                const extraKeys = allKeys.filter(key =>
                  key !== 'value' &&
                  key !== 'text' &&
                  key !== 'isActive' &&
                  key !== 'isDefault' &&
                  key !== 'optionOrder'
                );

                // If there are extra keys, use them as columns (fallback)
                if (extraKeys.length > 0 && this.availableColumns.length === 0) {
                  // Use the full object structure as raw response
                  this.rawApiResponse = options;
                  this.extractColumnsFromRawResponse();
                }
              }
            }
          }
        }

        if (this.previewOptions.length === 0) {
          console.warn('[FieldsList] ⚠️ No options found after processing. Original options count:', options?.length || 0);
          console.warn('[FieldsList] Processed options count:', processedOptions?.length || 0);
          console.warn('[FieldsList] Filtered options count:', filteredOptions?.length || 0);
          
          // Show warning message
          if (this.dataSourceType === 'SqlQuery') {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Results',
              detail: 'SQL query executed but returned no options. Please check your query and column names (case-insensitive).',
              life: 5000
            });
          } else if (this.dataSourceType === 'SapHana') {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Results',
              detail: 'SAP HANA query executed but returned no options. Please check your query and ensure column names are wrapped in double quotes (").',
              life: 5000
            });
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Preview',
              detail: 'No options found. Please check your DataSource configuration.'
            });
          }
        } else {
          // this.messageService.add({
          //   severity: 'success',
          //   summary: 'Preview',
          //   detail: `Found ${this.previewOptions.length} options`
          // });
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.apiPreviewAutoRetryPending = false;
        this.loadingPreview = false;
        this.previewOptions = []; // Clear options on error
        console.error('[FieldsList] Error previewing DataSource:', error);
        console.error('[FieldsList] Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url
        });

        let errorMessage = 'Failed to preview DataSource';
        let errorDetail = '';

        if (error.error) {
          // Handle different error formats
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
            errorDetail = error.error.detail || error.error.error || '';
            
            // Check for SQL-related errors
            if (error.error.message.includes('Invalid object name') || error.error.message.includes('SQL query failed')) {
              // Extract table name from error if possible
              const tableMatch = error.error.message.match(/Invalid object name '([^']+)'/);
              if (tableMatch) {
                const tableName = tableMatch[1];
                errorDetail = `Table '${tableName}' not found. `;
                if (this.dataSourceType === 'SqlQuery') {
                  errorDetail += `\n\nPossible solutions:\n`;
                  errorDetail += `1. Verify table name is correct (case-insensitive)\n`;
                  errorDetail += `2. Check if table exists in the selected database\n`;
                  errorDetail += `3. Verify the table exists in the selected database\n`;
                  errorDetail += `4. Verify column names in SELECT statement (case-insensitive)\n`;
                  errorDetail += `\nCurrent SQL Query: ${this.sqlQueryConfig.sqlQuery}\n`;
                  errorDetail += `Selected Database: ${this.sqlQueryConfig.database || 'FormBuilder'}`;
                }
              } else {
                errorDetail = 'SQL query failed. Please check:\n1. Table name is correct\n2. Column names are correct (case-insensitive)\n3. Database selection is correct';
                if (this.dataSourceType === 'SqlQuery') {
                  errorDetail += `\n\nCurrent SQL Query: ${this.sqlQueryConfig.sqlQuery}`;
                  errorDetail += `\nSelected Database: ${this.sqlQueryConfig.database || 'Auto'}`;
                }
              }
            }

            if (this.dataSourceType === 'SqlQuery' && error.error.message.includes('Returned columns:')) {
              const returnedColumns = error.error.message.split('Returned columns:')[1]?.trim() || '';
              errorMessage = 'The query ran, but the selected columns do not match the result.';
              errorDetail = returnedColumns
                ? `Returned columns: ${returnedColumns}`
                : 'Check the columns returned by your query.';
            }
            
            // Check for SAP HANA specific errors
            if (error.error.message.includes('SAP HANA') || error.error.message.includes('invalid column name') || error.error.message.includes('HDBODBC')) {
              errorMessage = 'SAP HANA Query Error';
              errorDetail = error.error.message || 'SAP HANA query execution failed.';
              
              // Check for column name errors
              if (error.error.message.includes('invalid column name')) {
                const columnMatch = error.error.message.match(/invalid column name:\s*([A-Z_]+)/i);
                if (columnMatch) {
                  const columnName = columnMatch[1];
                  errorDetail = `Invalid column name: "${columnName}".\n\n`;
                  errorDetail += `⚠️ IMPORTANT: In SAP HANA, column names are case-sensitive!\n\n`;
                  errorDetail += `Solution: Wrap all column names, table names, and schema names in double quotes (").\n\n`;
                  errorDetail += `❌ Wrong:\n`;
                  errorDetail += `SELECT AbsEntry AS Id, PeriodName AS Name FROM DOKHON_LIVE14.AACP\n\n`;
                  errorDetail += `✅ Correct:\n`;
                  errorDetail += `SELECT "AbsEntry" AS "ID", "PeriodName" AS "NAME" FROM "DOKHON_LIVE14"."AACP"\n\n`;
                  errorDetail += `Current Query:\n${this.sqlQueryConfig.sqlQuery || 'N/A'}`;
                } else {
                  errorDetail = `SAP HANA query error: ${error.error.message}\n\n`;
                  errorDetail += `⚠️ Make sure to wrap all identifiers (columns, tables, schemas) in double quotes (").\n\n`;
                  errorDetail += `Example:\n`;
                  errorDetail += `SELECT "AbsEntry" AS "ID", "PeriodName" AS "NAME" FROM "DOKHON_LIVE14"."AACP"`;
                }
              }
            }
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Check for network/DNS errors first (can occur with any status or no status)
        const isNetworkError = errorMessage.toLowerCase().includes('no such host') ||
          errorMessage.toLowerCase().includes('host is known') ||
          errorMessage.toLowerCase().includes('failed to resolve') ||
          errorMessage.toLowerCase().includes('dns') ||
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('timeout') ||
          errorMessage.toLowerCase().includes('refused') ||
          error.status === 0;

        if (isNetworkError) {
          errorMessage = errorMessage || 'Network error. Unable to connect to the API.';
          errorDetail = `Network connectivity issue detected.\n\n` +
            `Possible causes:\n` +
            `• DNS resolution failure - the hostname cannot be resolved\n` +
            `• Network connectivity problem - check your internet connection\n` +
            `• Firewall or proxy blocking the request\n` +
            `• The API server might be down or unreachable\n\n` +
            `Current API URL: "${this.dataSourceConfig.apiUrl}"\n\n` +
            `Troubleshooting steps:\n` +
            `1. Verify the API URL is correct and accessible\n` +
            `2. Check your internet connection\n` +
            `3. Try accessing the URL directly in your browser\n` +
            `4. If behind a corporate firewall, check proxy settings\n` +
            `5. For localhost APIs, ensure the server is running`;
        }
        // Specific error messages based on status
        else if (error.status === 404) {
          errorMessage = 'API endpoint not found. Please check the URL.';
        } else if (error.status === 500) {
          errorMessage = errorMessage || 'Server error. Please check backend logs.';
          if (errorMessage.includes('Invalid API response format') || errorMessage.includes('response format')) {
            errorDetail = `The API response structure doesn't match the expected format based on the paths you provided.\n\n` +
              `Current Paths:\n` +
              `• Value Path: "${valuePath}"\n` +
              `• Text Path: "${textPath}"\n\n` +
              `The API should return data in one of these formats:\n` +
              `• Direct Array: [{"${valuePath}": 1, "${textPath}": "Item 1"}, ...]\n` +
              `• Wrapped Object: {"data": [{"${valuePath}": 1, "${textPath}": "Item 1"}, ...]}\n` +
              `• Results Object: {"results": [{"${valuePath}": 1, "${textPath}": "Item 1"}, ...]}\n\n` +
              `Please verify:\n` +
              `1. The property names in your API response match the paths\n` +
              `2. Update valuePath/textPath if your API uses different property names\n` +
              `3. For nested properties, use dot notation (e.g., "user.id", "data.items[].name")`;
          } else if (errorMessage.includes('invalid request URI') || errorMessage.includes('absolute URI') || errorMessage.includes('BaseAddress')) {
            errorDetail = `The API URL must be an absolute URL.\n\n` +
              `Current URL: "${this.dataSourceConfig.apiUrl}"\n\n` +
              `Please ensure your API URL:\n` +
              `• Starts with http:// or https://\n` +
              `• Is a complete URL, not a relative path\n` +
              `• Examples:\n` +
              `  ✓ https://api.example.com/users\n` +
              `  ✓ http://localhost:5000/api/items\n` +
              `  ✗ /api/users (relative path - not allowed)\n` +
              `  ✗ api/users (relative path - not allowed)`;
          }
        } else if (error.status === 400) {
          if (errorMessage.includes('invalid request URI') || errorMessage.includes('absolute URI') || errorMessage.includes('BaseAddress')) {
            errorDetail = `The API URL must be an absolute URL.\n\n` +
              `Current URL: "${this.dataSourceConfig.apiUrl}"\n\n` +
              `Please ensure your API URL:\n` +
              `• Starts with http:// or https://\n` +
              `• Is a complete URL, not a relative path\n` +
              `• Examples:\n` +
              `  ✓ https://api.example.com/users\n` +
              `  ✓ http://localhost:5000/api/items\n` +
              `  ✗ /api/users (relative path - not allowed)\n` +
              `  ✗ api/users (relative path - not allowed)`;
          }
          errorMessage = errorMessage || 'Bad request. Please check your API configuration.';
          if (errorMessage.includes('Invalid API response format') || errorMessage.includes('response format')) {
            errorDetail = `The API response structure doesn't match the expected format based on the paths you provided.\n\n` +
              `Current Paths:\n` +
              `• Value Path: "${valuePath}"\n` +
              `• Text Path: "${textPath}"\n\n` +
              `Expected API Response Formats:\n` +
              `• Direct Array: [{"${valuePath}": 1, "${textPath}": "Item 1"}, ...]\n` +
              `• Wrapped: {"data": [{"${valuePath}": 1, "${textPath}": "Item 1"}, ...]}\n` +
              `• Results: {"results": [{"${valuePath}": 1, "${textPath}": "Item 1"}, ...]}\n\n` +
              `Tips:\n` +
              `• Update the paths to match your actual API response structure\n` +
              `• For nested properties, use dot notation like "user.profile.name"\n` +
              `• For arrays, use bracket notation like "results[].id"`;
          } else if (errorMessage.includes('valuePath') || errorMessage.includes('textPath')) {
            errorDetail = `Path Configuration Error.\n\n` +
              `Current Paths:\n` +
              `• Value Path: "${valuePath}"\n` +
              `• Text Path: "${textPath}"\n\n` +
              `Please ensure these paths match the property names in your API response.`;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Check if error message contains "No options extracted" - this indicates path mismatch
        // Skip this check if it's already a network error (don't override network error details)
        const isNoOptionsError = !isNetworkError && (
          errorMessage.toLowerCase().includes('no options extracted') ||
          errorMessage.toLowerCase().includes('no options found')
        );

        const propsFromError = !isNetworkError
          ? this.extractAvailablePropertiesFromErrorMessage(errorMessage)
          : [];

        if (propsFromError.length > 0) {
          this.availableProperties = propsFromError;
        }

        if (isNoOptionsError) {
          const inferredPaths = this.inferPathsFromProperties(propsFromError);
          if (this.dataSourceType === 'Api' &&
              inferredPaths &&
              (this.dataSourceConfig.valuePath !== inferredPaths.valuePath || this.dataSourceConfig.textPath !== inferredPaths.textPath)) {
            this.dataSourceConfig.valuePath = inferredPaths.valuePath;
            this.dataSourceConfig.textPath = inferredPaths.textPath;

            if (!this.apiPreviewAutoRetryPending) {
              this.apiPreviewAutoRetryPending = true;
              this.messageService.add({
                severity: 'info',
                summary: 'Paths Auto-Selected',
                detail: `Using "${inferredPaths.valuePath}" as value and "${inferredPaths.textPath}" as text.`
              });
              setTimeout(() => this.previewDataSource(), 150);
              this.cdr.detectChanges();
              return;
            }
          }

          // Ensure we have available properties - try to extract from raw response if not already done
          // if (this.availableProperties.length === 0 && this.rawApiResponse) {
          //   this.extractAvailableProperties();
          // }

          // Try to get suggested paths from the raw API response
          // const suggested = this.getSuggestedPaths();
          // if (suggested && (suggested.valuePath !== valuePath || suggested.textPath !== textPath)) {
          //   const availablePropsText = this.availableProperties.length > 0
          //     ? this.availableProperties.join(', ')
          //     : 'Click "Test API" to see available properties';

          //   errorDetail = `No options extracted from API response. Please verify that valuePath '${valuePath}' and textPath '${textPath}' are correct.\n\n` +
          //     `Available properties in the first item: ${availablePropsText}.\n\n` +
          //     `Suggested paths based on API response:\n` +
          //     `• Value Path: "${suggested.valuePath}"\n` +
          //     `• Text Path: "${suggested.textPath}"\n\n` +
          //     `Click "Apply Suggested Paths" button to automatically update the configuration.\n\n` +
          //     `For nested properties, use dot notation (e.g., 'name.first' instead of 'first_name').`;

          //   // Store suggested paths for potential auto-apply
          //   this.hasSuggestedPaths = true;
          // } else if (this.availableProperties.length > 0) {
          //   errorDetail = `No options extracted from API response. Please verify that valuePath '${valuePath}' and textPath '${textPath}' are correct.\n\n` +
          //     `Available properties in the first item: ${this.availableProperties.join(', ')}.\n\n` +
          //     `Please select appropriate paths from the available properties above.\n\n` +
          //     `For nested properties, use dot notation (e.g., 'name.first' instead of 'first_name').`;
          // } else {
          //   // If we don't have raw response or properties, suggest testing the API first
          //   errorDetail = `No options extracted from API response. Please verify that valuePath '${valuePath}' and textPath '${textPath}' are correct.\n\n` +
          //     `Please click "Test API" first to see the available properties in the API response, then update the paths accordingly.\n\n` +
          //     `For nested properties, use dot notation (e.g., 'name.first' instead of 'first_name').`;
          // }
        }

        // Check if error message contains path-related keywords
        if (!errorDetail && (errorMessage.toLowerCase().includes('path') ||
          errorMessage.toLowerCase().includes('format') ||
          errorMessage.toLowerCase().includes('structure'))) {
          errorDetail = `Current Configuration:\n` +
            `• Value Path: "${valuePath}"\n` +
            `• Text Path: "${textPath}"\n\n` +
            `Please verify these paths match your API response structure.`;
        }

        // Show error message with details
        // this.messageService.add({
        //   severity: 'error',
        //   summary: 'Preview Error',
        //   detail: errorMessage,
        //   life: 8000 // Show for 8 seconds
        // });

        // If there's additional detail, show it in a separate message
        if (errorDetail) {
          setTimeout(() => {
            // this.messageService.add({
            //   severity: 'info',
            //   summary: 'Help',
            //   detail: errorDetail,
            //   life: 10000 // Show for 10 seconds
            // });
          }, 500);
        }

        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Save DataSource configuration
   * IMPORTANT: When DataSource is Api or LookupTable, we should NOT save options to database.
   * Options are only saved for Static DataSource.
   */
  saveDataSource(fieldId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.dataSourceType === 'Static') {
        // If Static, delete existing DataSource and use static options
        const existingId = this.existingDataSource?.id;
        if (existingId) {
          // Try soft delete first (more reliable), fallback to hard delete
          this.fieldDataSourceService.softDeleteDataSource(existingId).subscribe({
            next: () => {
              console.log('[FieldsList] DataSource soft deleted successfully');
              resolve();
            },
            error: (error) => {
              // If soft delete fails, try hard delete
              console.warn('[FieldsList] Soft delete failed, trying hard delete:', error);
              this.fieldDataSourceService.deleteDataSource(existingId).subscribe({
                next: () => {
                  console.log('[FieldsList] DataSource hard deleted successfully');
                  resolve();
                },
                error: (deleteError) => {
                  // Even if delete fails, continue (DataSource might already be deleted or not exist)
                  console.warn('[FieldsList] Both soft and hard delete failed, continuing anyway:', deleteError);
                  resolve(); // Continue anyway - the DataSource might not exist or already deleted
                }
              });
            }
          });
        } else {
          resolve();
        }
        return;
      }

      // For Api or LookupTable: Delete all existing options first (if switching from Static)
      // Options should NOT be saved for Api/LookupTable DataSources
      this.deleteAllFieldOptions(fieldId).then(() => {
      // For LookupTable, use table name only in apiUrl
      let apiUrlValue: string | null = null;
      let valuePathValue: string | null = null;
      let textPathValue: string | null = null;

      if (this.dataSourceType === 'LookupTable') {
        // Backend expects only the table name in apiUrl, not JSON object
        apiUrlValue = this.lookupTableConfig.table || null;
        valuePathValue = this.lookupTableConfig.valueColumn || null;
        textPathValue = this.lookupTableConfig.textColumn || null;
      } else if (this.dataSourceType === 'FormSubmissions') {
        apiUrlValue = this.formSubmissionConfig.formId ? String(this.formSubmissionConfig.formId) : null;
        valuePathValue = this.formSubmissionConfig.valueFieldCode || null;
        textPathValue = this.formSubmissionConfig.textFieldCode || null;
      } else if (this.dataSourceType === 'SqlQuery' || this.dataSourceType === 'SapHana') {
        // For SqlQuery and SapHana, store SQL query in requestBodyJson
        apiUrlValue = null;
        valuePathValue = this.sqlQueryConfig.valuePath || null;
        textPathValue = this.sqlQueryConfig.textPath || null;
      } else {
        // For Api type, use the URL directly
        apiUrlValue = this.dataSourceConfig.apiUrl || null;
        valuePathValue = this.dataSourceConfig.valuePath || null;
        textPathValue = this.dataSourceConfig.textPath || null;
      }

      // For SqlQuery/SapHana, store the raw SQL query in requestBodyJson
      let requestBodyJsonValue: string | null = null;
      let configurationJsonValue: string | null = null;
      if (this.dataSourceType === 'SqlQuery' || this.dataSourceType === 'SapHana') {
        // Backend currently executes requestBodyJson directly as SQL,
        // so we must save the plain SQL string without JSON wrapping.
        requestBodyJsonValue = (this.sqlQueryConfig.sqlQuery || '').trim();
        if (this.dataSourceType === 'SqlQuery' && this.sqlQueryConfig.database) {
          configurationJsonValue = JSON.stringify({
            sqlQuery: requestBodyJsonValue,
            valueColumn: valuePathValue || 'Id',
            textColumn: textPathValue || 'Name',
            database: this.sqlQueryConfig.database
          });
        } else if (this.dataSourceType === 'SapHana') {
          configurationJsonValue = JSON.stringify({
            sqlQuery: requestBodyJsonValue,
            valueColumn: valuePathValue || 'ID',
            textColumn: textPathValue || 'NAME',
            sapConfigId: this.selectedDataSourceSapConnectionId ?? undefined
          });
        }
        console.log('[FieldsList] Saving raw SqlQuery (no JSON wrapper) for execution:', {
          length: requestBodyJsonValue.length
        });
      } else if (this.dataSourceType === 'LookupTable') {
        const selectedDatabase = this.lookupTableConfig.database || 'FormBuilder';
        const normalizedDatabase = selectedDatabase.toLowerCase() === 'akhmanageit'
          ? 'AkhmanageIt'
          : selectedDatabase;
        requestBodyJsonValue = JSON.stringify({
          database: normalizedDatabase
        });
      } else if (this.dataSourceType === 'FormSubmissions') {
        requestBodyJsonValue = this.formSubmissionConfig.formCode || null;
        const contextBindings = this.formSubmissionDependencyConfig.contextFieldCode && this.formSubmissionDependencyConfig.sourceFieldCode
          ? [{
              contextFieldCode: this.formSubmissionDependencyConfig.contextFieldCode,
              sourceFieldCode: this.formSubmissionDependencyConfig.sourceFieldCode
            }]
          : [];
        configurationJsonValue = JSON.stringify({
          formId: this.formSubmissionConfig.formId,
          formCode: this.formSubmissionConfig.formCode,
          valueFieldId: this.formSubmissionConfig.valueFieldId,
          textFieldId: this.formSubmissionConfig.textFieldId,
          valueFieldCode: this.formSubmissionConfig.valueFieldCode,
          textFieldCode: this.formSubmissionConfig.textFieldCode,
          contextBindings
        });
      } else {
        requestBodyJsonValue = this.dataSourceConfig.requestBodyJson || null;
        if (this.dataSourceType === 'Api') {
          const resolvedApiTarget = this.resolveApiRequestTarget(this.dataSourceConfig.apiUrl || '');
          configurationJsonValue = JSON.stringify({
            url: resolvedApiTarget?.baseUrl || this.dataSourceConfig.apiUrl || undefined,
            apiPath: resolvedApiTarget?.apiPath || undefined,
            httpMethod: this.dataSourceConfig.httpMethod || 'GET',
            requestBodyJson: requestBodyJsonValue || undefined,
            valuePath: valuePathValue || undefined,
            textPath: textPathValue || undefined,
            sapConfigId: this.selectedDataSourceSapConnectionId ?? undefined
          });
        }
      }

      const dataSourceDto: CreateFieldDataSourceDto = {
        fieldId: fieldId,
        sourceType: this.dataSourceType,
        apiUrl: apiUrlValue,
        httpMethod: this.dataSourceConfig.httpMethod || null,
        requestBodyJson: requestBodyJsonValue,
        valuePath: valuePathValue,
        textPath: textPathValue,
        configurationJson: configurationJsonValue,
        isActive: this.dataSourceConfig.isActive !== false
      };

      this.fieldDataSourceService.getActiveDataSourcesByFieldId(fieldId).subscribe({
        next: (activeDataSources) => {
          const activeDataSource = activeDataSources && activeDataSources.length > 0
            ? activeDataSources[0]
            : null;

          if (activeDataSource?.id) {
            this.fieldDataSourceService.updateDataSource(activeDataSource.id, {
              sourceType: dataSourceDto.sourceType,
              apiUrl: dataSourceDto.apiUrl,
              httpMethod: dataSourceDto.httpMethod,
              requestBodyJson: dataSourceDto.requestBodyJson,
              valuePath: dataSourceDto.valuePath,
              textPath: dataSourceDto.textPath,
              configurationJson: dataSourceDto.configurationJson,
              isActive: dataSourceDto.isActive!,
              isDeleted: activeDataSource.isDeleted !== undefined ? activeDataSource.isDeleted : false
            }).subscribe({
              next: (updatedDataSource) => {
                this.existingDataSource = updatedDataSource;
                resolve();
              },
              error: (error) => {
                console.error('[FieldsList] Error updating active DataSource:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to update DataSource'
                });
                reject();
              }
            });
          } else {
            this.fieldDataSourceService.createDataSource(dataSourceDto).subscribe({
              next: (createdDataSource) => {
                this.existingDataSource = createdDataSource;
                resolve();
              },
              error: (error) => {
                console.error('[FieldsList] Error creating DataSource:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to create DataSource'
                });
                reject();
              }
            });
          }
        },
        error: (error) => {
          console.error('[FieldsList] Error loading active DataSource before save:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load current DataSource state'
          });
          reject();
        }
      });
      }).catch(() => {
        // Even if delete fails, continue with DataSource save
        reject();
      });
    });
  }

  addTitleDescription(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Add title/description feature coming soon'
    });
  }

  addImage(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Add image feature coming soon'
    });
  }

  addVideo(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Add video feature coming soon'
    });
  }

  addSection(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Add section feature coming soon'
    });
  }

  /**
   * Handle field save errors using the validation system
   */
  private handleFieldSaveError(error: any): void {
    // Extract validation errors using the validation service
    this.validationErrors = this.validationService.extractValidationErrors(error);

    // Set errors on form controls for field-specific errors
    this.validationErrors.getAllErrors().forEach(validationError => {
      this.validationService.setFieldErrors(this.fieldForm, validationError.field, [validationError]);
    });

    // Handle duplicate validation using the existing helper
    const fieldData = this.fieldForm.value;
    DuplicateValidationHelper.handleDuplicateError(
      error,
      this.messageService,
      this.translationService,
      {
        entityType: 'Field Code',
        fieldName: 'Field Code',
        fallbackValue: fieldData.fieldCode,
        fieldNameVariations: ['fieldcode', 'field code', 'fieldcode', 'fieldname', 'field name']
      }
    );

    // Show general validation errors if any (duplicate errors are already handled above)
    const generalErrors = this.validationErrors.getFieldErrors('general');
    if (generalErrors.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: this.translationService.getCurrentLanguage() === 'ar' ? 'خطأ' : 'Error',
        detail: this.validationService.getAllErrorMessages(this.validationErrors),
        life: 8000
      });
    }
  }

  /**
   * Get API URL placeholder based on HTTP method
   */
  getApiUrlPlaceholder(): string {
    if (this.dataSourceConfig.httpMethod === 'POST') {
      return `${environment.apiUrl}/FieldDataSources/field-options`;
    }
    return `${environment.apiUrl}/FieldDataSources/field-options?fieldId=123`;
  }

  private extractAvailablePropertiesFromErrorMessage(message: string): string[] {
    const match = message.match(/available properties[^:]*:\s*([^.]+(?:\.[^.]+)?(?:,\s*[^.]+(?:\.[^.]+)?)*)/i);
    if (!match || !match[1]) {
      return [];
    }

    return match[1]
      .split(',')
      .map(p => p.trim().replace(/[.\s]+$/g, ''))
      .filter(p => !!p);
  }

  private inferPathsFromProperties(properties: string[]): { valuePath: string; textPath: string } | null {
    if (!properties.length) {
      return null;
    }

    const valuePath = properties.find(p => {
      const x = p.toLowerCase();
      return x === 'id' || x === 'value' || x === 'key' || x.endsWith('id') || x.endsWith('code');
    }) || properties[0];

    const textPath = properties.find(p => {
      const x = p.toLowerCase();
      return x === 'name' || x.endsWith('name') || x === 'text' || x === 'label' || x === 'title' || x.endsWith('desc');
    }) || properties.find(p => p !== valuePath) || properties[0];

    return { valuePath, textPath };
  }

  private resolveApiRequestTarget(rawValue: string): { baseUrl: string; apiPath: string | null; fullUrl: string; usesSapConnection: boolean } | null {
    const input = (rawValue || '').trim();
    if (!input) {
      return null;
    }

    if (input.startsWith('http://') || input.startsWith('https://')) {
      return {
        baseUrl: input,
        apiPath: null,
        fullUrl: input,
        usesSapConnection: false
      };
    }

    const selectedConnection = this.sapConnections.find(c => c.id === this.selectedDataSourceSapConnectionId);
    const baseUrl = (selectedConnection?.baseUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) {
      return null;
    }

    const normalizedPath = input.replace(/^\/+/, '');
    return {
      baseUrl,
      apiPath: normalizedPath,
      fullUrl: `${baseUrl}/${normalizedPath}`,
      usesSapConnection: true
    };
  }

  /**
   * Get project API base URL
   */
  getProjectApiUrl(): string {
    return environment.apiUrl;
  }
}
