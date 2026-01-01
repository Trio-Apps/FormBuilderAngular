import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSubmissionsService, CreateFormSubmissionDto, FormSubmissionDto } from '../services/form-submissions.service';
import { FormSubmissionValuesService, BulkFormSubmissionValuesDto, CreateFormSubmissionValueDto, UpdateFormSubmissionValueDto } from '../services/form-submission-values.service';
import { FormSubmissionAttachmentsService, CreateFormSubmissionAttachmentDto, FormSubmissionAttachmentDto } from '../services/form-submission-attachments.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType, DocumentSeries } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { FieldDataSourceService } from '../../FormBuilder/services/field-data-source.service';
import { RuleEvaluationService, FieldState } from '../../FormBuilder/services/rule-evaluation.service';
import { FormRulesService } from '../../FormBuilder/services/form-rules.service';
import { buildContext, getContextFieldCodes, requiresContext } from '../../FormBuilder/utils/field-data-source-helpers';
import { CalculationEngineService } from '../../FormBuilder/services/calculation-engine.service';
import { FormBuilderDto, FormTabDto, FormFieldDto, FieldOptionResponse } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../auth/auth.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FileUploadService } from '../../FormBuilder/services/file-upload.service';

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
    CheckboxModule
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

  // Track which fields depend on context for reloading options
  private contextDependencies: { [fieldId: number]: string[] } = {}; // fieldId -> array of context field codes

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
    public fileUploadService: FileUploadService
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
    
    // If edit mode, load submission data after fields are loaded
    if (this.isEditMode && this.submissionId) {
      // Load submission data will be called after fields are loaded
      setTimeout(() => {
        this.loadSubmissionForEdit();
      }, 100);
    }

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
          
          this.processFields(fields);
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
          this.processFields(fieldsFromService);
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
            
            this.processFields(fieldsFromService);
          },
          error: (error) => {
            console.warn('[FormSubmissionCreate] Could not load form to enrich fields with DataSource:', error);
            // Continue without fieldDataSource enrichment
            this.processFields(fieldsFromService);
          }
        });
      },
      error: (error) => {
        console.error('[FormSubmissionCreate] Error loading fields from service:', error);
        this.loading.fields = false;
      }
    });
  }

  private processFields(fields: FormFieldDto[]): void {
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
        optionsCount: f.fieldOptions?.length || 0
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
        const isOptionsField = ['select', 'radio', 'checkbox'].includes(fieldType);
        
        // Log field DataSource info
        if (field.fieldDataSource) {
          console.log(`[FormSubmissionCreate] ✅ Field ${field.id} (${field.fieldCode || 'no-code'}) has DataSource:`, {
            fieldType: fieldType,
            isOptionsField: isOptionsField,
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
            hasOptions: !!(field.fieldOptions && field.fieldOptions.length > 0),
            optionsCount: field.fieldOptions?.length || 0
          });
        }
        
        // Only load DataSource options for fields that need options
        if (isOptionsField) {
          this.loadFieldOptionsFromDataSource(field);
        }
      }
    });
        
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
              
              const fieldType = this.getFieldType(field);
              let defaultValue: any = field.defaultValueJson || null;
              
              if (fieldType === 'checkbox') {
                defaultValue = [];
              } else if (fieldType === 'boolean') {
                defaultValue = (field.defaultValueJson === 'true' || field.defaultValueJson === 'True') ? true : false;
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
      ).subscribe(() => {
        // Prevent infinite loops
        if (this.isEvaluatingRules) {
          return;
        }
        
        try {
          this.updateFieldValues();
          // Calculate calculated fields (fire and forget - don't await to avoid blocking)
          this.calculateCalculatedFields().catch(error => {
            console.error('[FormSubmissionCreate] Error calculating calculated fields:', error);
          });
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
          // Calculate calculated fields on initial load (OnLoad mode)
          await this.calculateCalculatedFields('OnLoad');
          // Also calculate OnFieldChange fields initially
          await this.calculateCalculatedFields('OnFieldChange');
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
    const typeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    return typeName.includes('file') || typeName.includes('attachment') || typeName.includes('image');
  }

  getFieldType(field: FormFieldDto): string {
    // Prefer explicit FieldType configuration if available
    const ft = field.fieldType;
    const typeName = (field.fieldTypeName || ft?.typeName || '').toLowerCase().trim();
    const dataType = (ft?.dataType || '').toLowerCase().trim();

    // Check for Calculated type first
    if (typeName === 'calculated' || this.calculationEngine.isCalculatedField(field)) {
      return 'calculated';
    }

    // Check for Grid type
    if (typeName === 'grid') {
      return 'grid';
    }

    // Explicit mapping: Textbox => text input
    if (typeName === 'textbox' || typeName.includes('text box')) {
      return 'text';
    }

    // 1) Types with options (select / radio / checkbox)
    if (ft?.hasOptions) {
      // لو النوع اسمه يحتوي "checkbox" أو "check box" خليه مربعات اختيار
      if (typeName.includes('checkbox') || typeName.includes('check box')) {
        return 'checkbox';
      }

      // لو النوع اسمه يحتوي "radio" خليه radio buttons (التحقق أولاً)
      if (typeName.includes('radio')) {
        return 'radio';
      }

      // التحقق من fieldTypeName مباشرة (قد يكون "Radio" بحروف كبيرة)
      const fieldTypeNameLower = (field.fieldTypeName || '').toLowerCase();
      if (fieldTypeNameLower.includes('radio')) {
        return 'radio';
      }

      // إذا كان allowMultiple = false و hasOptions = true وليس select صراحة
      // (Radio buttons تسمح باختيار واحد فقط، بينما Select قد يكون single أو multiple)
      if (ft.allowMultiple === false && !typeName.includes('select') && !fieldTypeNameLower.includes('select')) {
        return 'radio';
      }

      // أي نوع آخر فيه اختيارات (hasOptions = true) يكون Dropdown
      return 'select';
    }

    // 2) Non-options fields based on dataType / name
    const combined = `${typeName} ${dataType}`.toLowerCase();

    // Email first
    if (combined.includes('email')) return 'email';

    // Number
    if (combined.includes('number') || combined.includes('numeric') || dataType === 'int' || dataType === 'decimal') {
      return 'number';
    }

    // Date
    if (combined.includes('date') || dataType === 'date' || dataType === 'datetime') {
      return 'date';
    }

    // File
    if (combined.includes('file') || dataType === 'file') {
      return 'file';
    }

    // Grid / Line Items Grid
    if (combined.includes('grid') || typeName.includes('grid') || typeName.includes('line items') || typeName.includes('lineitems')) {
      return 'grid';
    }

    // Switch / boolean
    if (combined.includes('switch') || combined.includes('toggle') || dataType === 'bool' || dataType === 'boolean') {
      return 'switch';
    }

    // Long text / textarea
    if (combined.includes('textarea') || (combined.includes('text') && (ft?.maxLength || 0) > 255)) {
      return 'textarea';
    }

    // Default to short text input
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
    const hasExternalDataSource = dataSource && 
                                 dataSource.isActive && 
                                 (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable');
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

  isRequired(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
    if (dynamicState?.isRequired !== undefined) {
      return dynamicState.isRequired;
    }
    return field.isMandatory === true;
  }

  isFieldVisible(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode || ''];
    if (dynamicState?.isVisible !== undefined) {
      return dynamicState.isVisible;
    }
    return field.isVisible ?? true;
  }

  onFileSelected(event: any, field: FormFieldDto): void {
    if (!field.id) return;
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      this.fieldFiles[field.id] = files;
      this.cdr.detectChanges();
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
    const fieldKey = `field_${field.id}`;
    const selectedValue = event.target.value;
    const control = this.fieldsForm.get(fieldKey);
    
    console.log(`[FormSubmissionCreate] Select changed for field ${field.id} (${field.fieldCode || 'no-code'})`, {
      selectedValue,
      controlValue: control?.value,
      controlExists: !!control
    });
    
    if (control) {
      // Ensure the control value is updated
      control.setValue(selectedValue, { emitEvent: true });
      // Update fieldValues for rule evaluation
      this.updateFieldValues();
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

    // Only load from API/LookupTable, not Static
    if (dataSource.sourceType === 'Static') {
      console.log(`[FormSubmissionCreate] Field ${field.id} has Static DataSource, using static options`);
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }

    // For Api or LookupTable, load options dynamically
    if (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable') {
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
    
    if (isLoading && !control.disabled) {
      control.disable({ emitEvent: false });
    } else if (!isLoading && control.disabled && !this.isFieldReadOnly(field)) {
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
   * Calculate all calculated fields based on current field values
   * @param recalculateMode - Filter by recalculation mode (null = all modes)
   */
  private async calculateCalculatedFields(recalculateMode: 'OnFieldChange' | 'OnLoad' | 'OnSubmitOnly' | null = 'OnFieldChange'): Promise<void> {
    if (!this.fieldsForm || !this.fields.length) return;

    const calculatedFields = this.fields.filter(f => {
      if (!this.calculationEngine.isCalculatedField(f)) return false;
      if (recalculateMode === null) return true;
      return f.recalculateOn === recalculateMode;
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

      // Calculate each calculated field
      for (const field of calculatedFields) {
        if (!field.id || !field.fieldCode || !field.expressionText) continue;

        try {
          const fieldValuesMap = this.calculationEngine.buildFieldValuesMap(
            currentFieldValues,
            this.fields
          );

          const result = await this.calculationEngine.calculateExpressionSafe(
            field.expressionText,
            fieldValuesMap
          );

          if (result.success) {
            const fieldKey = `field_${field.id}`;
            const control = this.fieldsForm.get(fieldKey);
            if (control) {
              // Update form control value without emitting events to prevent loops
              control.setValue(result.value, { emitEvent: false });
            }
            // Update fieldValues for rule evaluation
            this.fieldValues[field.fieldCode] = result.value;
          }
        } catch (error) {
          console.error(`[FormSubmissionCreate] Error calculating field ${field.fieldCode}:`, error);
        }
      }
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
      next: (submission) => {
        console.log('[FormSubmissionCreate] Loaded submission for edit:', submission);
        // Store current status
        (this as any)._currentSubmissionStatus = submission.status;
        // Update form with current status
        this.submissionForm.patchValue({ status: submission.status });
        
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

    // Load attachments for all file fields
    this.loadAttachmentsForEdit();
  }

  loadAttachmentsForEdit(): void {
    if (!this.submissionId) return;
    
    // Reset deleted attachments when loading new submission
    this.deletedAttachments = [];

    // Wait for fields to be loaded
    if (this.fields.length === 0) {
      setTimeout(() => this.loadAttachmentsForEdit(), 200);
      return;
    }

    // Find all file/image fields
    const fileFields = this.fields.filter(field => this.isFileField(field));
    
    if (fileFields.length === 0) return;

    // Load attachments for each file field
    fileFields.forEach(field => {
      if (!field.id) return;
      
      this.formSubmissionAttachmentsService.getBySubmissionAndField(this.submissionId!, field.id).subscribe({
        next: (attachments) => {
          const attachmentsArray = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);
          console.log(`[FormSubmissionCreate] Loaded ${attachmentsArray.length} attachment(s) for field ${field.id}`);
          this.existingAttachments[field.id] = attachmentsArray;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`[FormSubmissionCreate] Error loading attachments for field ${field.id}:`, error);
          this.existingAttachments[field.id] = [];
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

  saveSubmissionAsDraft(): void {
    // For draft, we only check essential fields (formBuilderId, documentTypeId)
    // Field values can be empty/incomplete for drafts
    if (!this.submissionForm.get('formBuilderId')?.value) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select a form'
      });
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

    // Get default series (fixed value)
    if (this.documentSeries.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No document series available. Please create a series first.'
      });
      return;
    }

    const defaultSeries = this.documentSeries.find(s => s.isDefault) || this.documentSeries[0];
    if (!defaultSeries || !defaultSeries.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No document series available'
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

    const formData = this.submissionForm.getRawValue();
    const createDto: CreateFormSubmissionDto = {
      formBuilderId: this.documentType.formBuilderId, // Fixed value - from documentType
      documentTypeId: this.documentTypeId,
      seriesId: defaultSeries.id, // Fixed value - use default series
      submittedByUserId: userId,
      status: 'Draft' // Set status to Draft
    };

    this.loading.create = true;
    
    // If edit mode, update existing submission status to Draft
    if (this.isEditMode && this.submissionId) {
      // Update status to Draft
      this.submissionForm.patchValue({ status: 'Draft' });
      this.saveSubmissionData(this.submissionId, 'Draft');
      return;
    }
    
    // Create new submission with Draft status
    this.formSubmissionsService.createSubmission(createDto).subscribe({
      next: (submission: FormSubmissionDto) => {
        this.saveSubmissionData(submission.id, 'Draft');
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error creating draft submission:', error);
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

  async saveSubmission(): Promise<void> {
    if (this.submissionForm.invalid) {
      this.markFormGroupTouched(this.submissionForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    if (this.fields.length > 0 && this.fieldsForm.invalid) {
      this.markFormGroupTouched(this.fieldsForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

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
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: `Please upload files for required fields: ${missingRequiredFiles.join(', ')}`
      });
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

    // Get default series (fixed value)
    if (this.documentSeries.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No document series available. Please create a series first.'
      });
      return;
    }

    const defaultSeries = this.documentSeries.find(s => s.isDefault) || this.documentSeries[0];
    if (!defaultSeries || !defaultSeries.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No document series available'
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

    const formData = this.submissionForm.getRawValue();
    const createDto: CreateFormSubmissionDto = {
      formBuilderId: this.documentType.formBuilderId, // Fixed value - from documentType
      documentTypeId: this.documentTypeId,
      seriesId: defaultSeries.id, // Fixed value - use default series
      submittedByUserId: userId,
      status: formData.status || 'Submitted' // Default status is Submitted
    };

    this.loading.create = true;
    
    // If edit mode, update existing submission
    if (this.isEditMode && this.submissionId) {
      const submissionId = this.submissionId; // Store in local variable to avoid null check issues
      // Get current status from loaded submission or form data
      const currentStatus = (this as any)._currentSubmissionStatus || formData.status || 'Draft';
      console.log('[FormSubmissionCreate] Current submission status:', currentStatus);
      
      // Update status to Submitted if it was Draft
      if (currentStatus === 'Draft') {
        // Update status to Submitted
        const updateDto = { status: 'Submitted' };
        this.formSubmissionsService.updateSubmission(submissionId, updateDto).subscribe({
          next: () => {
            console.log('[FormSubmissionCreate] Status updated from Draft to Submitted');
            this.saveSubmissionData(submissionId, 'Submitted');
          },
          error: (error) => {
            console.error('[FormSubmissionCreate] Error updating status:', error);
            const currentLang = this.translationService.getCurrentLanguage();
            this.messageService.add({
              severity: 'warn',
              summary: currentLang === 'ar' ? 'تحذير' : 'Warning',
              detail: currentLang === 'ar' 
                ? 'فشل تحديث الـ status. سيتم المتابعة مع حفظ البيانات.' 
                : 'Failed to update status. Will continue with saving data.'
            });
            // Continue with save even if status update fails
            this.saveSubmissionData(submissionId, 'Submitted');
          }
        });
      } else {
        this.saveSubmissionData(submissionId, currentStatus);
      }
      return;
    }
    
    // Create new submission
    this.formSubmissionsService.createSubmission(createDto).subscribe({
      next: (submission: FormSubmissionDto) => {
        this.saveSubmissionData(submission.id);
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error creating submission:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create submission';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
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
    console.log('[FormSubmissionCreate] Existing values count:', existingValues.length);

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
          valueDto.valueJson = valueDto.valueString ? JSON.stringify(valueDto.valueString) : JSON.stringify(null);
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
          console.log(`[FormSubmissionCreate] 🔄 Updating existing value for field ${field.id}`);
          const updateDto: UpdateFormSubmissionValueDto = {};
          
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
          if (valueDto.valueJson) {
            updateDto.valueJson = valueDto.valueJson;
          }
          
          // Add to update list
          updateObservablesList.push({
            submissionId: submissionId,
            fieldId: field.id,
            dto: updateDto
          });
        } else {
          // Create new value
          console.log(`[FormSubmissionCreate] ✅ Adding new value DTO for field ${field.id}:`, valueDto);
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
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        files.forEach(file => {
          saveObservables.push(
            this.formSubmissionAttachmentsService.uploadFile(file, submissionId, fieldId, field.fieldCode)
          );
        });
      }
    });

    if (saveObservables.length === 0) {
      this.loading.create = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: this.isEditMode ? 'Form submission updated successfully' : 'Form submission created successfully'
      });
      setTimeout(() => this.goBack(), 1000);
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: () => {
        this.loading.create = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: this.isEditMode ? 'Form submission updated successfully' : 'Form submission created successfully'
        });
        setTimeout(() => this.goBack(), 1000);
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
}
