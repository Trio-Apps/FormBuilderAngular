import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TranslationService } from '../../../core/services/translation.service';
import { DuplicateValidationHelper } from '../../../core/utils/duplicate-validation.helper';
import { environment } from '../../../environments/environment';
import { AttachmentTypesService } from '../../FormBuilder/services/attachment-types.service';
import { CreateAttachmentTypeDto } from '../../FormBuilder/form-builder/models/attachment-types.model';
import { CALCULATION_OPERATIONS, CalculationOperation, getRecommendedCalculationOperation } from '../../FormBuilder/constants/calculation-operations';
import { ValidationService } from '../../angular-validation/services/validation.service';
import { FormSubmissionService } from '../../angular-form-submission/services/form-submission.service';
import { ValidationErrorDisplayComponent } from '../../angular-validation/components/validation-error-display.component';
import { ValidationErrorCollection } from '../../angular-validation/models/validation-error.model';

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ButtonModule,
    RouterLink,
  ],
  templateUrl: './fields-list.component.html',
  styleUrls: ['./fields-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FieldsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  tabId!: number;
  formBuilderId!: number;
  tabName: string = '';

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
  dataSourceType: 'Static' | 'Api' | 'LookupTable' | 'SqlQuery' = 'Static';
  dataSourceConfig: Partial<CreateFieldDataSourceDto> = {
    sourceType: 'Static',
    apiUrl: null,
    httpMethod: 'GET',
    requestBodyJson: null,
    valuePath: null,
    textPath: null,
    isDeleted: false
  };
  // LookupTable JSON Configuration (stored separately, then serialized to JSON in apiUrl)
  lookupTableConfig: {
    table: string;
    valueColumn: string;
    textColumn: string;
  } = {
      table: '',
      valueColumn: 'Id',
      textColumn: 'Name'
    };
  // SQL Query Configuration
  sqlQueryConfig: {
    sqlQuery: string;
    valuePath: string;
    textPath: string;
  } = {
      sqlQuery: '',
      valuePath: 'Id',
      textPath: 'Name'
    };
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
    private formSubmissionService: FormSubmissionService
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

  loadTabAndFormId(): void {
    if (!this.tabId) return;

    this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
          this.tabName = tab.tabName || '';
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
    this.editingField = field;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    
    // Load all form fields for expression builder (always load, not just for calculated fields)
    if (this.allFormFields.length === 0) {
      this.loadAllFormFields();
    }
    
    this.showFieldModal = true;

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
        // Load field options AFTER DataSource is loaded
        // This ensures we know the DataSource type before loading options
        this.loadFieldOptions(field.id);
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
    if (this.fieldForm.invalid) {
      this.markFormGroupTouched(this.fieldForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
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
                this.loading.save = false;
                this.loadFields();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field updated successfully' });
                this.closeFieldModal();
                this.cdr.detectChanges();
              }).catch(() => {
                this.loading.save = false;
              });
            } else {
              this.saveFieldOptions(this.editingField!.id);
            }
          } else {
            // Delete all options if field type doesn't support options
            this.deleteAllFieldOptions(this.editingField!.id).then(() => {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field updated successfully' });
              this.closeFieldModal();
              this.cdr.detectChanges();
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
                this.loading.save = false;
                this.loadFields();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field created successfully' });
                this.closeFieldModal();
                this.cdr.detectChanges();
              }).catch(() => {
                this.loading.save = false;
              });
            } else if (this.fieldOptionsFormArray.length > 0) {
              this.saveFieldOptions(newField.id);
            } else {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field created successfully' });
              this.closeFieldModal();
              this.cdr.detectChanges();
            }
          } else {
            this.loading.save = false;
            this.loadFields();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field created successfully' });
            this.closeFieldModal();
            this.cdr.detectChanges();
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
    // Clear existing options
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }

    // IMPORTANT: Only load options from database if DataSource is Static
    // For Api/LookupTable, options come from external source and should NOT be loaded from database
    if (this.dataSourceType && this.dataSourceType !== 'Static') {
      // Don't load options from database for Api/LookupTable DataSources
      // Options will be loaded from external source (API/Database) when form is displayed
      console.log(`[FieldsList] Skipping loading options from database for field ${fieldId}. DataSource type is ${this.dataSourceType}. Options will be loaded from external source.`);
      return;
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
  saveFieldOptions(fieldId: number): void {
    // IMPORTANT: Only save options for Static DataSource
    // For Api or LookupTable, options come from external source and should NOT be saved
    if (this.dataSourceType !== 'Static') {
      console.warn(`[FieldsList] ⚠️ Attempted to save options for non-Static DataSource (${this.dataSourceType}). Options will NOT be saved.`);
      this.loading.save = false;
      this.loadFields();
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Options are not saved for Api/LookupTable DataSources. They are loaded from external source.' });
      this.closeFieldModal();
      this.cdr.detectChanges();
      return;
    }

    const optionsArray = this.fieldOptionsFormArray;
    const options = optionsArray.value as FieldOptionDto[];

    if (options.length === 0) {
      this.loading.save = false;
      this.loadFields();
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field saved successfully' });
      this.closeFieldModal();
      this.cdr.detectChanges();
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
                  this.loading.save = false;
                  this.loadFields();
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
                  this.closeFieldModal();
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.loading.save = false;
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field options' });
                }
              });
            } else {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
              this.closeFieldModal();
              this.cdr.detectChanges();
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
            this.loading.save = false;
            this.loadFields();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
            this.closeFieldModal();
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading.save = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field options' });
          }
        });
      }
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
          // Check if field has DataSource - only save options if DataSource is Static or doesn't exist
          const fieldDataSource = updatedField.fieldDataSource;
          const dataSourceType = fieldDataSource?.sourceType || 'Static';
          
          // IMPORTANT: Only save options for Static DataSource
          // For Api or LookupTable, options come from external source and should NOT be saved
          if (dataSourceType === 'Static') {
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
          this.dataSourceType = dataSource.sourceType as 'Static' | 'Api' | 'LookupTable' | 'SqlQuery';

          // Parse LookupTable configuration
          if (dataSource.sourceType === 'LookupTable' && dataSource.apiUrl) {
            try {
              // Try to parse as JSON first (for backwards compatibility with old data)
              const configJson = JSON.parse(dataSource.apiUrl);
              if (configJson.table && configJson.valueColumn && configJson.textColumn) {
                // Old format: JSON object in apiUrl
                this.lookupTableConfig = {
                  table: configJson.table,
                  valueColumn: configJson.valueColumn,
                  textColumn: configJson.textColumn
                };
                this.dataSourceConfig = {
                  sourceType: dataSource.sourceType,
                  apiUrl: configJson.table, // Use table name only
                  httpMethod: null,
                  requestBodyJson: null,
                  valuePath: configJson.valueColumn,
                  textPath: configJson.textColumn,
                  isActive: dataSource.isActive
                };
              } else {
                // Invalid JSON, treat as table name
                this.lookupTableConfig = {
                  table: dataSource.apiUrl,
                  valueColumn: dataSource.valuePath || 'Id',
                  textColumn: dataSource.textPath || 'Name'
                };
                this.dataSourceConfig = {
                  sourceType: dataSource.sourceType,
                  apiUrl: dataSource.apiUrl,
                  httpMethod: null,
                  requestBodyJson: null,
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
                textColumn: dataSource.textPath || 'Name'
              };
              this.dataSourceConfig = {
                sourceType: dataSource.sourceType,
                apiUrl: dataSource.apiUrl,
                httpMethod: null,
                requestBodyJson: null,
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
          } else if (dataSource.sourceType === 'SqlQuery') {
            // For SqlQuery type, load SQL query from requestBodyJson
            this.sqlQueryConfig = {
              sqlQuery: dataSource.requestBodyJson || '',
              valuePath: dataSource.valuePath || 'Id',
              textPath: dataSource.textPath || 'Name'
            };
            this.dataSourceConfig = {
              sourceType: dataSource.sourceType,
              apiUrl: null,
              httpMethod: null,
              requestBodyJson: dataSource.requestBodyJson || null,
              valuePath: dataSource.valuePath || 'Id',
              textPath: dataSource.textPath || 'Name',
              isActive: dataSource.isActive
            };
          } else {
            // For Api and Static types
            this.dataSourceConfig = {
              sourceType: dataSource.sourceType,
              apiUrl: dataSource.apiUrl || null,
              httpMethod: dataSource.httpMethod || 'GET',
              requestBodyJson: dataSource.requestBodyJson || null,
              valuePath: dataSource.valuePath || null,
              textPath: dataSource.textPath || null,
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
      textColumn: 'Name'
    };
    this.sqlQueryConfig = {
      sqlQuery: '',
      valuePath: 'Id',
      textPath: 'Name'
    };
    this.previewOptions = [];
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
      this.loadLookupTables();
      this.dataSourceConfig.httpMethod = null;
      this.dataSourceConfig.requestBodyJson = null;
      // Set default columns for LookupTable
      if (!this.lookupTableConfig.table) {
        this.lookupTableConfig = {
          table: '',
          valueColumn: 'Id',
          textColumn: 'Name'
        };
      }
      this.dataSourceConfig.valuePath = this.lookupTableConfig.valueColumn;
      this.dataSourceConfig.textPath = this.lookupTableConfig.textColumn;
      this.previewOptions = [];
      // Clear static options when using DataSource
      this.clearFieldOptions();
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
    } else if (this.dataSourceType === 'SqlQuery') {
      // Set default SQL Query config
      if (!this.sqlQueryConfig.sqlQuery) {
        this.sqlQueryConfig = {
          sqlQuery: '',
          valuePath: 'Id',
          textPath: 'Name'
        };
      }
      this.dataSourceConfig.httpMethod = null;
      this.dataSourceConfig.apiUrl = null;
      this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath;
      this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath;
      this.previewOptions = [];
      // Clear static options when using DataSource
      this.clearFieldOptions();
    }

    this.cdr.detectChanges();
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

    console.log(`[FieldsList] Loading columns for table: "${tableName}"`);

    // First try the dedicated columns endpoint
    this.fieldDataSourceService.getTableColumns(tableName).subscribe({
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

    // Set default valuePath and textPath if not set
    if (!this.sqlQueryConfig.valuePath || !this.sqlQueryConfig.valuePath.trim()) {
      this.sqlQueryConfig.valuePath = 'Id';
    }
    if (!this.sqlQueryConfig.textPath || !this.sqlQueryConfig.textPath.trim()) {
      this.sqlQueryConfig.textPath = 'Name';
    }

    // Update dataSourceConfig with current values
    this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath.trim();
    this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath.trim();

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

    const url = this.dataSourceConfig.apiUrl.trim();

    // Validate URL format for API type (must be absolute)
    if (this.dataSourceType === 'Api') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // this.messageService.add({
        //   severity: 'error',
        //   summary: 'Invalid URL',
        //   detail: 'API URL must be an absolute URL starting with http:// or https://. Example: https://api.example.com/endpoint',
        //   life: 8000
        // });
        return;
      }
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
   * Load available lookup tables
   */
  loadLookupTables(): void {
    if (this.dataSourceType !== 'LookupTable') {
      return;
    }

    this.fieldDataSourceService.getAvailableLookupTables().subscribe({
      next: (tables) => {
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
    if (this.dataSourceType === 'Api') {
      if (!this.dataSourceConfig.apiUrl || !this.dataSourceConfig.apiUrl.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please enter API URL'
        });
        return;
      }

      // Validate that API URL is absolute (must start with http:// or https://)
      const apiUrl = this.dataSourceConfig.apiUrl.trim();
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        // this.messageService.add({
        //   severity: 'error',
        //   summary: 'Invalid URL',
        //   detail: 'API URL must be an absolute URL starting with http:// or https://. Example: https://api.example.com/endpoint',
        //   life: 8000
        // });
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
    } else if (this.dataSourceType === 'SqlQuery') {
      if (!this.sqlQueryConfig.sqlQuery || !this.sqlQueryConfig.sqlQuery.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please enter SQL Query'
        });
        return;
      }
      // Set default valuePath and textPath if not set
      if (!this.sqlQueryConfig.valuePath || !this.sqlQueryConfig.valuePath.trim()) {
        this.sqlQueryConfig.valuePath = 'Id';
      }
      if (!this.sqlQueryConfig.textPath || !this.sqlQueryConfig.textPath.trim()) {
        this.sqlQueryConfig.textPath = 'Name';
      }
      // Update valuePath and textPath from sqlQueryConfig
      this.dataSourceConfig.valuePath = this.sqlQueryConfig.valuePath;
      this.dataSourceConfig.textPath = this.sqlQueryConfig.textPath;
    }

    // Ensure valuePath and textPath are set with defaults if empty
    // Only set defaults if availableProperties is empty (no API tested yet)
    if (this.availableProperties.length === 0) {
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
    const valuePath = this.dataSourceConfig.valuePath.trim();
    const textPath = this.dataSourceConfig.textPath.trim();

    // For LookupTable, use table name directly for preview (backend expects table name, not JSON)
    // For Api, use the URL
    // For SqlQuery, use undefined for apiUrl and SQL query in requestBodyJson
    const apiUrlForPreview = this.dataSourceType === 'LookupTable'
      ? this.lookupTableConfig.table
      : (this.dataSourceType === 'SqlQuery' ? undefined : (this.dataSourceConfig.apiUrl || undefined));

    // For SqlQuery, use SQL query in requestBodyJson
    const requestBodyJsonForPreview = this.dataSourceType === 'SqlQuery'
      ? this.sqlQueryConfig.sqlQuery
      : (this.dataSourceConfig.requestBodyJson || undefined);

    // Prepare request payload
    const requestPayload = {
      fieldId: fieldId,
      sourceType: this.dataSourceType,
      apiUrl: apiUrlForPreview,
      httpMethod: this.dataSourceConfig.httpMethod || 'GET',
      requestBodyJson: requestBodyJsonForPreview,
      valuePath: valuePath,
      textPath: textPath
    };

    console.log('[FieldsList] Sending API request to preview DataSource:', requestPayload);
    if (this.dataSourceType === 'LookupTable') {
      console.log('[FieldsList] Table:', this.lookupTableConfig.table);
      console.log('[FieldsList] Value Column:', this.lookupTableConfig.valueColumn);
      console.log('[FieldsList] Text Column:', this.lookupTableConfig.textColumn);
    } else {
      console.log('[FieldsList] API URL:', this.dataSourceConfig.apiUrl);
      console.log('[FieldsList] HTTP Method:', this.dataSourceConfig.httpMethod || 'GET');
      console.log('[FieldsList] Request Body:', this.dataSourceConfig.requestBodyJson);
    }
    console.log('[FieldsList] Value Path:', valuePath);
    console.log('[FieldsList] Text Path:', textPath);
    console.log('[FieldsList] Source Type:', this.dataSourceType);

    this.fieldDataSourceService.previewDataSource(requestPayload).subscribe({
      next: (options) => {
        console.log('[FieldsList] API Response received:', options);
        console.log('[FieldsList] Number of options:', options?.length || 0);
        console.log('[FieldsList] Full response structure:', JSON.stringify(options, null, 2));
        
        // Show success message with options count for SqlQuery
        if (this.dataSourceType === 'SqlQuery' && options && options.length > 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Query Executed Successfully',
            detail: `${options.length} ${options.length === 1 ? 'option' : 'options'} found and will be available in the public form`,
            life: 5000
          });
        }

        // Check if response is empty
        if (!options || options.length === 0) {
          console.warn('[FieldsList] Empty response received. Possible reasons:');
          console.warn('1. The API endpoint returned no data');
          console.warn('2. The fieldId does not exist or has no options');
          console.warn('3. The API URL might be incorrect');
          console.warn('4. The backend preview endpoint might need the actual API to be called first');
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

          return {
            ...opt,
            text: textValue || ''
          };
        });

        // Filter out "Select All" options (in both English and Arabic)
        const filteredOptions = processedOptions.filter((opt: FieldOptionResponse) => {
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

        this.previewOptions = filteredOptions;
        this.loadingPreview = false;

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
          this.messageService.add({
            severity: 'warn',
            summary: 'Preview',
            detail: 'No options found. Please check your DataSource configuration.'
          });
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
        this.loadingPreview = false;
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
              `1. The property names in your API response match the paths (case-sensitive)\n` +
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
              `• Property names are case-sensitive (e.g., "Id" vs "id", "Name" vs "name")\n` +
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

        // Try to extract available properties from error message if mentioned (only if not a network error)
        if (!isNetworkError) {
          const availablePropsMatch = errorMessage.match(/available properties[^:]*:\s*([^.]+)/i);
          if (availablePropsMatch && availablePropsMatch[1]) {
            const propsFromError = availablePropsMatch[1].split(',').map(p => p.trim()).filter(p => p.length > 0);
            if (propsFromError.length > 0 && this.availableProperties.length === 0) {
              // this.availableProperties = propsFromError;
              // Extract properties from raw response if available
              if (this.rawApiResponse) {
                // this.extractAvailableProperties();
              }
            }
          }
        }

        if (isNoOptionsError) {
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
        if (this.existingDataSource?.id) {
          this.fieldDataSourceService.deleteDataSource(this.existingDataSource.id).subscribe({
            next: () => {
              resolve();
            },
            error: () => {
              reject();
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
      } else if (this.dataSourceType === 'SqlQuery') {
        // For SqlQuery, store SQL query in requestBodyJson
        apiUrlValue = null;
        valuePathValue = this.sqlQueryConfig.valuePath || null;
        textPathValue = this.sqlQueryConfig.textPath || null;
      } else {
        // For Api type, use the URL directly
        apiUrlValue = this.dataSourceConfig.apiUrl || null;
        valuePathValue = this.dataSourceConfig.valuePath || null;
        textPathValue = this.dataSourceConfig.textPath || null;
      }

      // For SqlQuery, store SQL query in requestBodyJson
      const requestBodyJsonValue = this.dataSourceType === 'SqlQuery' 
        ? this.sqlQueryConfig.sqlQuery || null
        : this.dataSourceConfig.requestBodyJson || null;

      const dataSourceDto: CreateFieldDataSourceDto = {
        fieldId: fieldId,
        sourceType: this.dataSourceType,
        apiUrl: apiUrlValue,
        httpMethod: this.dataSourceConfig.httpMethod || null,
        requestBodyJson: requestBodyJsonValue,
        valuePath: valuePathValue,
        textPath: textPathValue,
        isActive: this.dataSourceConfig.isActive !== false
      };

      if (this.existingDataSource?.id) {
        // Check if sourceType is changing - if so, delete old and create new
        if (this.existingDataSource.sourceType !== this.dataSourceType) {
          console.log('[FieldsList] SourceType changing from', this.existingDataSource.sourceType, 'to', this.dataSourceType, '- deleting old and creating new');
          // Delete old DataSource first
          this.fieldDataSourceService.deleteDataSource(this.existingDataSource.id).subscribe({
            next: () => {
              console.log('[FieldsList] Old DataSource deleted, creating new one');
              // Then create new DataSource
              this.fieldDataSourceService.createDataSource(dataSourceDto).subscribe({
                next: (createdDataSource) => {
                  this.existingDataSource = createdDataSource;
                  resolve();
                },
                error: (error) => {
                  console.error('[FieldsList] Error creating new DataSource:', error);
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to create new DataSource'
                  });
                  reject();
                }
              });
            },
            error: (error) => {
              console.error('[FieldsList] Error deleting old DataSource:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete old DataSource'
              });
              reject();
            }
          });
        } else {
          // Update existing DataSource (same sourceType)
          this.fieldDataSourceService.updateDataSource(this.existingDataSource.id, {
            sourceType: dataSourceDto.sourceType,
            apiUrl: dataSourceDto.apiUrl,
            httpMethod: dataSourceDto.httpMethod,
            requestBodyJson: dataSourceDto.requestBodyJson,
            valuePath: dataSourceDto.valuePath,
            textPath: dataSourceDto.textPath,
            isActive: dataSourceDto.isActive!,
            isDeleted: this.existingDataSource.isDeleted !== undefined ? this.existingDataSource.isDeleted : false
          }).subscribe({
            next: () => {
              resolve();
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update DataSource'
              });
              reject();
            }
          });
        }
      } else {
        // Create new DataSource
        this.fieldDataSourceService.createDataSource(dataSourceDto).subscribe({
          next: () => {
            resolve();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create DataSource'
            });
            reject();
          }
        });
      }
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

  /**
   * Get project API base URL
   */
  getProjectApiUrl(): string {
    return environment.apiUrl;
  }
}