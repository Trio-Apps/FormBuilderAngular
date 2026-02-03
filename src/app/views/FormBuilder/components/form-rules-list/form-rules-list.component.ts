import { Component, OnInit, OnDestroy } from '@angular/core';
import { TableActionsComponent } from '../../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormRulesService } from '../../services/form-rules.service';
import { FormsService } from '../../services/forms.service';
import { FieldsService } from '../../services/fields.service';
import { TabsService } from '../../services/tabs.service';
import { StoredProceduresService } from '../../services/stored-procedures.service';
import { StoredProcedure, ParameterMapping, ResultMapping } from '../../form-builder/models/stored-procedure.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  FormRule,
  CreateFormRuleDto,
  UpdateFormRuleDto,
  FormBuilderDto,
  FormFieldDto,
  Condition,
  Action,
  RuleActionType,
  convertFormRuleToDto
} from '../../form-builder/models/form-builder-dto.model';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslationService } from '../../../../core/services/translation.service';
import { DuplicateValidationHelper } from '../../../../core/utils/duplicate-validation.helper';
import { TableShellComponent } from '../../../../shared/table-shell/table-shell.component';
import { PermissionService } from '../../../../services/permission.service';
import { HasPermissionDirective } from '../../../../directives/has-permission.directive';
import { ChangeDetectorRef } from '@angular/core';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-form-rules-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    TableShellComponent,
    HasPermissionDirective
  ],
  templateUrl: './form-rules-list.component.html',
  styleUrls: ['./form-rules-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FormRulesListComponent implements OnInit, OnDestroy {
  formId!: number; // formBuilderId
  form: FormBuilderDto | null = null;
  rules: FormRule[] = [];
  filteredRules: FormRule[] = [];
  loading = false;
  searchTerm = '';
  private routeSubscription?: Subscription;

  // Permission flags
  canViewFormRules = false;
  canCreateFormRules = false;
  canEditFormRules = false;
  canDeleteFormRules = false;
  canManageFormRules = false;

  // Rule Modal
  showRuleModal = false;
  ruleForm!: FormGroup;
  editingRule: FormRule | null = null;
  formFields: FormFieldDto[] = [];
  
  // Stored Procedures
  storedProcedures: StoredProcedure[] = [];
  selectedSp: StoredProcedure | null = null;
  ruleType: 'Condition' | 'StoredProcedure' = 'Condition';
  parameterMapping: ParameterMapping = {};
  resultMapping: ResultMapping = {
    resultColumn: 'IsValid',
    trueValue: 1,
    falseValue: 0
  };

  // Available options
  conditionOperators: { label: string; value: string }[] = [
    { label: 'Equals', value: 'Equals' },
    { label: 'Not Equals', value: 'NotEquals' },
    { label: 'Contains', value: 'Contains' },
    { label: 'Greater Than', value: 'GreaterThan' },
    { label: 'Less Than', value: 'LessThan' },
    { label: 'Is Empty', value: 'IsEmpty' },
    { label: 'Is Not Empty', value: 'IsNotEmpty' },
    { label: 'In', value: 'In' },
    { label: 'Not In', value: 'NotIn' }
  ];

  actionTypes: { label: string; value: RuleActionType }[] = [
    { label: 'Set Visible', value: 'SetVisible' },
    { label: 'Set ReadOnly', value: 'SetReadOnly' },
    { label: 'Set Mandatory', value: 'SetMandatory' },
    { label: 'Set Default', value: 'SetDefault' },
    { label: 'Clear Value', value: 'ClearValue' },
    { label: 'Compute', value: 'Compute' }
  ];

  valueTypes: { label: string; value: 'constant' | 'field' }[] = [
    { label: 'Constant', value: 'constant' },
    { label: 'Field', value: 'field' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formRulesService: FormRulesService,
    private formsService: FormsService,
    private fieldsService: FieldsService,
    private tabsService: TabsService,
    private storedProceduresService: StoredProceduresService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    public translationService: TranslationService,
    public permissionService: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.initRuleForm();
  }

  ngOnInit(): void {
    // Always reload permissions from API to ensure fresh data (clears cache first)
    console.log('[FormRulesList] Refreshing permissions from API (clearing cache)...');
    this.permissionService.refreshPermissions().subscribe({
      next: (perms) => {
        console.log('[FormRulesList] Permissions loaded from API:', perms);
        this.loadPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[FormRulesList] Error loading permissions:', err);
        this.loadPermissions();
      }
    });

    // Subscribe to permission changes
    this.permissionService.permissions$.subscribe(() => {
      this.loadPermissions();
      this.cdr.detectChanges();
    });

    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }

    this.routeSubscription = this.route.params.subscribe(params => {
      const newFormId = +params['formId'];
      if (newFormId && newFormId !== this.formId) {
        this.formId = newFormId;
        this.loadForm();
        this.loadRules();
        this.loadFormFields();
        this.loadStoredProcedures();
      } else if (newFormId && !this.formId) {
        this.formId = newFormId;
        this.loadForm();
        this.loadRules();
        this.loadFormFields();
        this.loadStoredProcedures();
      }
    });

    // Check for query parameters (e.g., fieldCode from fields list)
    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['fieldCode']) {
        // Wait for fields to load, then open modal with pre-selected field
        setTimeout(() => {
          if (this.formFields.length > 0) {
            this.openRuleModalWithField(queryParams['fieldCode']);
          } else {
            // If fields not loaded yet, wait a bit more
            setTimeout(() => {
              if (this.formFields.length > 0) {
                this.openRuleModalWithField(queryParams['fieldCode']);
              }
            }, 500);
          }
        }, 300);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  initRuleForm(): void {
    this.ruleForm = this.fb.group({
      ruleName: ['', Validators.required],
      ruleType: ['Condition', Validators.required],
      storedProcedureId: [null],
      isActive: [true],
      executionOrder: [1, [Validators.required, Validators.min(0)]],
      evaluationPhase: ['OnFieldChange'], // Default: OnFieldChange (for regular rules), can be changed to PreSubmit for blocking rules
      blockMessage: [''], // Block message for blocking rules (PreSubmit)
      condition: this.fb.group({
        field: [''],
        operator: ['Equals', Validators.required],
        value: [''],
        valueType: ['constant', Validators.required]
      }),
      actions: this.fb.array([]),
      elseActions: this.fb.array([])
    });

    // Watch rule type changes
    this.ruleForm.get('ruleType')?.valueChanges.subscribe(type => {
      this.ruleType = type;
      if (type === 'StoredProcedure') {
        this.ruleForm.get('storedProcedureId')?.setValidators(Validators.required);
        this.ruleForm.get('condition')?.get('field')?.clearValidators();
      } else {
        this.ruleForm.get('storedProcedureId')?.clearValidators();
        this.ruleForm.get('condition')?.get('field')?.setValidators(Validators.required);
      }
      this.ruleForm.get('storedProcedureId')?.updateValueAndValidity();
      this.ruleForm.get('condition')?.get('field')?.updateValueAndValidity();
    });

    // Watch stored procedure selection
    this.ruleForm.get('storedProcedureId')?.valueChanges.subscribe(spId => {
      if (spId) {
        this.onStoredProcedureSelected(spId);
      }
    });

    // Watch evaluation phase changes - remove default action if switching to blocking rule
    this.ruleForm.get('evaluationPhase')?.valueChanges.subscribe(phase => {
      const actionsArray = this.ruleForm.get('actions') as FormArray;
      if ((phase === 'PreSubmit' || phase === 'PreOpen') && actionsArray.length > 0) {
        // Clear actions for blocking rules (they don't need actions)
        actionsArray.clear();
      } else if (phase === 'OnFieldChange' && actionsArray.length === 0) {
        // Add default action for regular rules if none exists
        this.addAction();
      }
    });
  }

  /**
   * Load user permissions for form rule operations
   */
  private loadPermissions(): void {
    this.canViewFormRules = this.permissionService.canViewFormRules();
    this.canCreateFormRules = this.permissionService.canCreateFormRules();
    this.canEditFormRules = this.permissionService.canEditFormRules();
    this.canDeleteFormRules = this.permissionService.canDeleteFormRules();
    this.canManageFormRules = this.permissionService.canManageFormRules();
    console.log('[FormRulesList] Permission flags:', {
      canViewFormRules: this.canViewFormRules,
      canCreateFormRules: this.canCreateFormRules,
      canEditFormRules: this.canEditFormRules,
      canDeleteFormRules: this.canDeleteFormRules,
      canManageFormRules: this.canManageFormRules
    });
  }

  loadForm(): void {
    if (!this.formId) return;
    this.formsService.getFormById(this.formId).subscribe({
      next: (form) => {
        this.form = form;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load form'
        });
      }
    });
  }

  loadStoredProcedures(): void {
    this.storedProceduresService.getByUsageType('Rule').subscribe({
      next: (data) => {
        this.storedProcedures = data;
      },
      error: (error) => {
        console.error('[FormRulesList] Error loading stored procedures:', error);
      }
    });
  }

  onStoredProcedureSelected(spId: number): void {
    const sp = this.storedProcedures.find(s => s.id === spId);
    if (sp) {
      this.selectedSp = sp;
      
      // Load default mappings if available
      if (sp.defaultParameterMapping) {
        try {
          this.parameterMapping = JSON.parse(sp.defaultParameterMapping);
        } catch (e) {
          console.error('[FormRulesList] Error parsing default parameter mapping:', e);
          this.parameterMapping = {};
        }
      } else {
        this.parameterMapping = {};
      }

      if (sp.defaultResultMapping) {
        try {
          this.resultMapping = JSON.parse(sp.defaultResultMapping);
        } catch (e) {
          console.error('[FormRulesList] Error parsing default result mapping:', e);
          this.resultMapping = {
            resultColumn: 'IsValid',
            trueValue: 1,
            falseValue: 0
          };
        }
      } else {
        this.resultMapping = {
          resultColumn: 'IsValid',
          trueValue: 1,
          falseValue: 0
        };
      }
    }
  }

  addParameterMapping(): void {
    this.parameterMapping['@NewParam'] = '';
  }

  removeParameterMapping(key: string): void {
    delete this.parameterMapping[key];
  }

  getParameterKeys(): string[] {
    return Object.keys(this.parameterMapping);
  }

  loadFormFields(): void {
    if (!this.formId) return;
    this.formFields = [];
    
    // First, load tabs for this form
    this.tabsService.getTabs(this.formId).subscribe({
      next: (tabs) => {
        if (tabs && tabs.length > 0) {
          // Load fields for each tab
          const fieldObservables = tabs.map(tab => 
            this.fieldsService.getFields(this.formId, tab.id).pipe(
              map(fields => ({ tabId: tab.id, fields }))
            )
          );
          
          // Wait for all fields to load
          forkJoin(fieldObservables).subscribe({
            next: (results) => {
              this.formFields = [];
              results.forEach(result => {
                if (result.fields && result.fields.length > 0) {
                  this.formFields.push(...result.fields);
                }
              });
              console.log('[FormRulesList] Loaded fields:', this.formFields.length, 'from', tabs.length, 'tabs');
            },
            error: (error) => {
              console.error('[FormRulesList] Error loading fields from tabs:', error);
            }
          });
        } else {
          console.warn('[FormRulesList] No tabs found for form:', this.formId);
          // Try fallback: get form with tabs included
          this.formsService.getFormById(this.formId).subscribe({
            next: (form) => {
              if (form.tabs) {
                form.tabs.forEach(tab => {
                  if (tab.fields && tab.fields.length > 0) {
                    this.formFields.push(...tab.fields);
                  }
                });
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('[FormRulesList] Error loading tabs:', error);
        // Fallback: try to get fields from form.tabs if available
        this.formsService.getFormById(this.formId).subscribe({
          next: (form) => {
            if (form.tabs) {
              form.tabs.forEach(tab => {
                if (tab.fields && tab.fields.length > 0) {
                  this.formFields.push(...tab.fields);
                }
              });
            }
          }
        });
      }
    });
  }

  loadRules(): void {
    if (!this.formId || isNaN(this.formId)) {
      console.warn('[FormRulesList] Invalid formId:', this.formId);
      this.loading = false;
      return;
    }

    console.log('[FormRulesList] Loading rules for formId:', this.formId);
    this.loading = true;
    this.formRulesService.getRulesByFormId(this.formId).subscribe({
      next: (rules) => {
        console.log('[FormRulesList] Received rules:', rules);
        console.log('[FormRulesList] Rules count:', rules?.length || 0);
        this.rules = Array.isArray(rules) ? rules : [];
        console.log('[FormRulesList] Set rules array:', this.rules);
        console.log('[FormRulesList] Rules array length:', this.rules.length);
        this.updateFilteredRules();
        console.log('[FormRulesList] Filtered rules:', this.filteredRules);
        console.log('[FormRulesList] Filtered rules length:', this.filteredRules.length);
        this.loading = false;
      },
      error: (error) => {
        console.error('[FormRulesList] Error loading rules:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load rules'
        });
      }
    });
  }

  updateFilteredRules(): void {
    if (!this.searchTerm.trim()) {
      this.filteredRules = [...this.rules];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredRules = this.rules.filter(rule =>
        rule.ruleName?.toLowerCase().includes(term) ||
        rule.condition?.field?.toLowerCase().includes(term)
      );
    }
  }

  openRuleModal(rule?: FormRule): void {
    if (rule) {
      // Editing existing rule
      if (!this.canEditFormRules && !this.canManageFormRules) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit form rules.' });
        return;
      }
    } else {
      // Creating new rule
      if (!this.canCreateFormRules && !this.canManageFormRules) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create form rules.' });
        return;
      }
    }

    // Ensure fields are loaded before opening modal
    if (this.formFields.length === 0) {
      this.loadFormFields();
    }
    
    this.editingRule = rule || null;
    this.selectedSp = null;
    this.parameterMapping = {};
    this.resultMapping = {
      resultColumn: 'IsValid',
      trueValue: 1,
      falseValue: 0
    };
    this.initRuleForm();

    if (rule) {
      // Edit mode
      this.ruleType = rule.ruleType || 'Condition';
      this.ruleForm.patchValue({
        ruleName: rule.ruleName,
        ruleType: rule.ruleType || 'Condition',
        storedProcedureId: rule.storedProcedureId || null,
        isActive: rule.isActive,
        executionOrder: rule.executionOrder || 1,
        evaluationPhase: rule.evaluationPhase || 'OnFieldChange', // ✅ Evaluation phase
        blockMessage: rule.blockMessage || '' // ✅ Block message
      });

      // Load stored procedure data if it's a StoredProcedure type
      if (rule.ruleType === 'StoredProcedure' && rule.storedProcedureId) {
        this.onStoredProcedureSelected(rule.storedProcedureId);
        if (rule.parameterMapping) {
          try {
            this.parameterMapping = JSON.parse(rule.parameterMapping);
          } catch (e) {
            console.error('[FormRulesList] Error parsing parameter mapping:', e);
          }
        }
        if (rule.resultMapping) {
          try {
            this.resultMapping = JSON.parse(rule.resultMapping);
          } catch (e) {
            console.error('[FormRulesList] Error parsing result mapping:', e);
          }
        }
      }

      // Load condition
      if (rule.condition) {
        const conditionGroup = this.ruleForm.get('condition') as FormGroup;
        conditionGroup.patchValue({
          field: rule.condition.field || '',
          operator: rule.condition.operator || 'Equals',
          value: rule.condition.value || '',
          valueType: rule.condition.valueType || 'constant'
        });
      }

      // Load actions
      if (rule.actions) {
        const actionsArray = this.ruleForm.get('actions') as FormArray;
        actionsArray.clear();
        rule.actions.forEach(action => {
          actionsArray.push(this.createActionFormGroup(action));
        });
      }

      // Load else actions
      if (rule.elseActions) {
        const elseActionsArray = this.ruleForm.get('elseActions') as FormArray;
        elseActionsArray.clear();
        rule.elseActions.forEach(action => {
          elseActionsArray.push(this.createActionFormGroup(action));
        });
      }
    } else {
      // Add mode - add one default action only for regular rules (OnFieldChange)
      // Blocking rules (PreSubmit/PreOpen) don't need default actions
      const evaluationPhase = this.ruleForm.get('evaluationPhase')?.value || 'OnFieldChange';
      if (evaluationPhase === 'OnFieldChange') {
        this.addAction();
      }
    }

    this.showRuleModal = true;
  }

  openRuleModalWithField(fieldCode: string): void {
    if (!this.canCreateFormRules && !this.canManageFormRules) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create form rules.' });
      return;
    }

    // Ensure fields are loaded before opening modal
    if (this.formFields.length === 0) {
      this.loadFormFields();
      // Wait for fields to load
      setTimeout(() => {
        this.openRuleModalWithField(fieldCode);
      }, 500);
      return;
    }

    // Check if field exists
    const field = this.formFields.find(f => f.fieldCode === fieldCode);
    if (!field) {
      console.warn(`[FormRulesList] Field with code ${fieldCode} not found`);
      // Still open modal, but without pre-selection
      this.openRuleModal();
      return;
    }

    // Open modal in create mode
    this.editingRule = null;
    this.initRuleForm();

    // Pre-select the field in condition
    const conditionGroup = this.ruleForm.get('condition') as FormGroup;
    conditionGroup.patchValue({
      field: fieldCode,
      operator: 'Equals',
      value: '',
      valueType: 'constant'
    });

    // Pre-select the field in first action as target
    this.addAction();
    const actionsArray = this.ruleForm.get('actions') as FormArray;
    if (actionsArray.length > 0) {
      const firstAction = actionsArray.at(0) as FormGroup;
      firstAction.patchValue({
        type: 'SetVisible',
        fieldCode: fieldCode,
        value: true
      });
    }

    // Set a default rule name
    this.ruleForm.patchValue({
      ruleName: `Rule for ${field.fieldName || fieldCode}`,
      executionOrder: 1,
      isActive: true
    });

    this.showRuleModal = true;

    // Clear query parameter from URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  closeRuleModal(): void {
    this.showRuleModal = false;
    this.editingRule = null;
    this.initRuleForm();
  }

  // Condition Management (single condition now)
  get conditionGroup(): FormGroup {
    return this.ruleForm.get('condition') as FormGroup;
  }

  // Actions Management
  get actionsArray(): FormArray {
    return this.ruleForm.get('actions') as FormArray;
  }

  get elseActionsArray(): FormArray {
    return this.ruleForm.get('elseActions') as FormArray;
  }

  addAction(): void {
    this.actionsArray.push(this.createActionFormGroup());
  }

  addElseAction(): void {
    this.elseActionsArray.push(this.createActionFormGroup());
  }

  removeAction(index: number): void {
    this.actionsArray.removeAt(index);
  }

  removeElseAction(index: number): void {
    this.elseActionsArray.removeAt(index);
  }

  createActionFormGroup(action?: Action): FormGroup {
    return this.fb.group({
      type: [action?.type || 'SetVisible', Validators.required],
      fieldCode: [action?.fieldCode || '', Validators.required],
      value: [action?.value || ''],
      expression: [action?.expression || '']
    });
  }

  saveRule(): void {
    if (this.ruleForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields'
      });
      return;
    }

    const formValue = this.ruleForm.value;
    const ruleType = formValue.ruleType || 'Condition';

    // Validate based on rule type
    if (ruleType === 'Condition') {
      // Validate that condition field is selected
      if (!formValue.condition.field || !formValue.condition.operator) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select condition field and operator'
        });
        return;
      }
    } else if (ruleType === 'StoredProcedure') {
      // Validate that stored procedure is selected
      if (!formValue.storedProcedureId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a stored procedure'
        });
        return;
      }
    }

    // Validate evaluation phase and block message
    const evaluationPhase = formValue.evaluationPhase || 'OnFieldChange';
    
    // For blocking rules (PreSubmit/PreOpen), blockMessage is required, but actions are optional
    if (evaluationPhase === 'PreSubmit' || evaluationPhase === 'PreOpen') {
      if (!formValue.blockMessage || formValue.blockMessage.trim() === '') {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Block Message is required for PreSubmit/PreOpen rules'
        });
        return;
      }
      // Blocking rules don't require actions - they just block submission
      // So we skip the actions validation for blocking rules
    } else {
      // For regular rules (OnFieldChange), at least one action is required
      if (!formValue.actions || formValue.actions.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please add at least one action'
        });
        return;
      }
    }

    // Build FormRule object - clean empty values
    const formRule: FormRule = {
      id: this.editingRule?.id,
      ruleName: formValue.ruleName.trim(),
      ruleType: ruleType,
      condition: ruleType === 'Condition' ? {
        field: formValue.condition.field.trim(),
        operator: formValue.condition.operator,
        value: formValue.condition.value && formValue.condition.value.toString().trim() !== ''
          ? formValue.condition.value.toString().trim()
          : '',
        valueType: formValue.condition.valueType || 'constant'
      } : undefined,
      storedProcedureId: ruleType === 'StoredProcedure' ? formValue.storedProcedureId : undefined,
      parameterMapping: ruleType === 'StoredProcedure' ? JSON.stringify(this.parameterMapping) : undefined,
      resultMapping: ruleType === 'StoredProcedure' ? JSON.stringify(this.resultMapping) : undefined,
      actions: formValue.actions
        .filter((a: any) => a.fieldCode && a.type) // Filter out incomplete actions
        .map((a: any) => {
          const action: Action = {
            type: a.type,
            fieldCode: a.fieldCode.trim()
          };
          if (a.value && a.value.toString().trim() !== '') {
            action.value = a.value.toString().trim();
          }
          if (a.expression && a.expression.toString().trim() !== '') {
            action.expression = a.expression.toString().trim();
          }
          return action;
        }),
      elseActions: formValue.elseActions && formValue.elseActions.length > 0
        ? formValue.elseActions
            .filter((a: any) => a.fieldCode && a.type)
            .map((a: any) => {
              const action: Action = {
                type: a.type,
                fieldCode: a.fieldCode.trim()
              };
              if (a.value && a.value.toString().trim() !== '') {
                action.value = a.value.toString().trim();
              }
              if (a.expression && a.expression.toString().trim() !== '') {
                action.expression = a.expression.toString().trim();
              }
              return action;
            })
        : undefined,
      isActive: formValue.isActive !== undefined ? formValue.isActive : true,
      executionOrder: formValue.executionOrder || 1,
      evaluationPhase: formValue.evaluationPhase || 'OnFieldChange', // ✅ Default to OnFieldChange
      blockMessage: formValue.blockMessage && formValue.blockMessage.trim() !== '' 
        ? formValue.blockMessage.trim() 
        : undefined // ✅ Block message for blocking rules
    };

    // Validate actions after cleaning - only for regular rules (OnFieldChange)
    // Blocking rules (PreSubmit/PreOpen) don't require actions
    if (formRule.evaluationPhase !== 'PreSubmit' && formRule.evaluationPhase !== 'PreOpen' && formRule.actions.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please add at least one valid action'
      });
      return;
    }

    // Convert to DTO
    let ruleDto: CreateFormRuleDto;
    try {
      ruleDto = convertFormRuleToDto(formRule, this.formId);
      
      // Validate actions before sending - only for regular rules (OnFieldChange)
      // Blocking rules (PreSubmit/PreOpen) don't require actions
      const evaluationPhase = formValue.evaluationPhase || 'OnFieldChange';
      if (evaluationPhase === 'OnFieldChange' && (!ruleDto.actions || ruleDto.actions.length === 0)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'At least one action is required for OnFieldChange rules',
          life: 7000
        });
        return;
      }
      
      // Log for debugging
      console.log('[FormRulesList] Saving rule:', {
        formRule,
        ruleDto,
        actionsCount: ruleDto.actions?.length || 0,
        elseActionsCount: ruleDto.elseActions?.length || 0
      });
    } catch (error: any) {
      console.error('[FormRulesList] Error converting rule to DTO:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: error?.message || 'Failed to prepare rule data',
        life: 7000
      });
      return;
    }

    if (this.editingRule?.id) {
      // Update - convert CreateFormRuleDto to UpdateFormRuleDto
      const updateDto: UpdateFormRuleDto = {
        formBuilderId: ruleDto.formBuilderId,
        ruleName: ruleDto.ruleName,
        ruleType: ruleDto.ruleType,
        conditionField: ruleDto.conditionField,
        conditionOperator: ruleDto.conditionOperator,
        conditionValue: ruleDto.conditionValue,
        conditionValueType: ruleDto.conditionValueType,
        storedProcedureId: ruleDto.storedProcedureId,
        parameterMapping: ruleDto.parameterMapping,
        resultMapping: ruleDto.resultMapping,
        actions: ruleDto.actions,
        elseActions: ruleDto.elseActions,
        isActive: ruleDto.isActive,
        executionOrder: ruleDto.executionOrder,
        evaluationPhase: ruleDto.evaluationPhase, // ✅ Evaluation phase
        blockMessage: ruleDto.blockMessage // ✅ Block message
      };
      
      this.formRulesService.updateRule(this.editingRule.id, updateDto).subscribe({
        next: (updatedRule) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Rule updated successfully'
          });
          this.closeRuleModal();
          this.loadRules();
        },
        error: (error) => {
          console.error('[FormRulesList] Error updating rule:', error);
          
          let errorMessage = 'Failed to update rule';
          let errorDetails: string[] = [];
          
          // Extract error message from various error formats
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
            
            // Extract validation errors if available
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                errorDetails = Object.values(error.error.errors).flat() as string[];
              } else if (Array.isArray(error.error.errors)) {
                errorDetails = error.error.errors;
              }
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // Use DuplicateValidationHelper for unified error handling
          DuplicateValidationHelper.handleDuplicateError(
            error,
            this.messageService,
            this.translationService,
            {
              entityType: 'Rule Name',
              fieldName: 'Rule Name',
              fallbackValue: updateDto.ruleName || this.editingRule?.ruleName,
              fieldNameVariations: ['rulename', 'rule name', 'rulename']
            }
          );
        }
      });
    } else {
      // Create
      this.formRulesService.createRule(ruleDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Rule created successfully'
          });
          this.closeRuleModal();
          this.loadRules();
        },
        error: (error) => {
          console.error('[FormRulesList] Error creating rule:', error);
          console.error('[FormRulesList] Rule DTO sent:', JSON.stringify(ruleDto, null, 2));
          console.error('[FormRulesList] Actions:', ruleDto.actions);
          console.error('[FormRulesList] ElseActions:', ruleDto.elseActions);
          console.error('[FormRulesList] Full error object:', {
            status: error?.status,
            statusText: error?.statusText,
            error: error?.error,
            message: error?.message,
            url: error?.url
          });
          
          let errorMessage = 'Failed to create rule';
          let errorDetails: string[] = [];
          
          // Try to extract error message from different possible locations
          if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
            
            // Extract validation errors if available
            if (error.error.errors) {
              if (typeof error.error.errors === 'object') {
                errorDetails = Object.values(error.error.errors).flat() as string[];
              } else if (Array.isArray(error.error.errors)) {
                errorDetails = error.error.errors;
              }
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // Use DuplicateValidationHelper for unified error handling
          const isDuplicate = DuplicateValidationHelper.isDuplicateError(
            errorMessage,
            errorDetails,
            'Rule Name'
          );
          
          if (isDuplicate) {
            DuplicateValidationHelper.handleDuplicateError(
              error,
              this.messageService,
              this.translationService,
              {
                entityType: 'Rule Name',
                fieldName: 'Rule Name',
                fallbackValue: ruleDto.ruleName || formRule.ruleName,
                fieldNameVariations: ['rulename', 'rule name', 'rulename']
              }
            );
          } else {
            // Check for specific error patterns for other errors
            if (errorMessage.toLowerCase().includes('no data returned')) {
              errorMessage = 'Server did not return the created rule. The rule may have been created but failed to retrieve it.';
            } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('validation')) {
              errorMessage = 'Invalid rule data format. Please check all fields are filled correctly.';
            } else if (error?.status === 400) {
              errorMessage = 'Bad request. Please check all required fields are filled correctly.';
            } else if (error?.status === 500) {
              errorMessage = 'Server error. Please try again or contact support.';
            }
            
            // Show error for other types of errors
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage,
              life: 7000
            });
          }
        }
      });
    }
  }


  getFieldName(fieldCode: string): string {
    const field = this.formFields.find(f => f.fieldCode === fieldCode);
    return field ? (field.fieldName || fieldCode) : fieldCode;
  }

  getFieldLabel(fieldCode: string): string {
    const field = this.formFields.find(f => f.fieldCode === fieldCode);
    return field ? (field.fieldName || fieldCode) : fieldCode;
  }

  requiresValueInput(operator: string): boolean {
    return !['IsEmpty', 'IsNotEmpty'].includes(operator);
  }

  requiresActionValueInput(actionType: RuleActionType): boolean {
    return ['SetDefault', 'Compute'].includes(actionType);
  }

  requiresActionExpression(actionType: RuleActionType): boolean {
    return actionType === 'Compute';
  }

  getActiveRulesCount(): number {
    return this.rules.filter(r => r.isActive).length;
  }

  deleteRule(ruleId: number | undefined): void {
    if (!this.canDeleteFormRules && !this.canManageFormRules) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to delete form rules.' });
      return;
    }

    if (!ruleId) {
      console.warn('[FormRulesList] deleteRule called with invalid ruleId:', ruleId);
      return;
    }

    console.log(`[FormRulesList] ===== DELETE RULE REQUEST =====`);
    console.log(`[FormRulesList] Rule ID to delete: ${ruleId}`);
    console.log(`[FormRulesList] Current rules before delete:`, this.rules.map(r => ({ id: r.id, name: r.ruleName })));

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this rule?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log(`[FormRulesList] User confirmed deletion for rule ${ruleId}`);
        console.log(`[FormRulesList] Calling formRulesService.deleteRule(${ruleId})`);
        
        this.formRulesService.deleteRule(ruleId).subscribe({
          next: (response) => {
            console.log(`[FormRulesList] ===== DELETE RULE SUCCESS =====`);
            console.log(`[FormRulesList] Rule ${ruleId} deleted successfully (Soft Delete)`);
            console.log(`[FormRulesList] Response:`, response);
            console.log(`[FormRulesList] Reloading rules list...`);
            
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Rule deleted successfully'
            });
            
            // Reload rules to reflect the deletion (soft-deleted rules won't appear)
            // Note: Backend should filter out rules where IsDeleted = true
            this.loadRules();
          },
          error: (error) => {
            console.error(`[FormRulesList] ===== DELETE RULE ERROR =====`);
            console.error(`[FormRulesList] Error deleting rule ${ruleId}:`, error);
            console.error(`[FormRulesList] Error details:`, {
              status: error?.status,
              statusText: error?.statusText,
              error: error?.error,
              message: error?.message,
              url: error?.url
            });
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete rule'
            });
          }
        });
      },
      reject: () => {
        console.log(`[FormRulesList] User cancelled deletion for rule ${ruleId}`);
      }
    });
  }
}








