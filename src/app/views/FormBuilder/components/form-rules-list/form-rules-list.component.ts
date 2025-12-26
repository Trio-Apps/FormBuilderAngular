import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormRulesService } from '../../services/form-rules.service';
import { FormsService } from '../../services/forms.service';
import { FieldsService } from '../../services/fields.service';
import { TabsService } from '../../services/tabs.service';
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
    TooltipModule
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

  // Rule Modal
  showRuleModal = false;
  ruleForm!: FormGroup;
  editingRule: FormRule | null = null;
  formFields: FormFieldDto[] = [];

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
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    public translationService: TranslationService
  ) {
    this.initRuleForm();
  }

  ngOnInit(): void {
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
      } else if (newFormId && !this.formId) {
        this.formId = newFormId;
        this.loadForm();
        this.loadRules();
        this.loadFormFields();
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
      isActive: [true],
      executionOrder: [1, [Validators.required, Validators.min(0)]],
      condition: this.fb.group({
        field: ['', Validators.required],
        operator: ['Equals', Validators.required],
        value: [''],
        valueType: ['constant', Validators.required]
      }),
      actions: this.fb.array([]),
      elseActions: this.fb.array([])
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
    // Ensure fields are loaded before opening modal
    if (this.formFields.length === 0) {
      this.loadFormFields();
    }
    
    this.editingRule = rule || null;
    this.initRuleForm();

    if (rule) {
      // Edit mode
      this.ruleForm.patchValue({
        ruleName: rule.ruleName,
        isActive: rule.isActive,
        executionOrder: rule.executionOrder || 1
      });

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
      // Add mode - add one default action
      this.addAction();
    }

    this.showRuleModal = true;
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

    // Validate that condition field is selected
    if (!formValue.condition.field || !formValue.condition.operator) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select condition field and operator'
      });
      return;
    }

    // Validate that at least one action exists
    if (!formValue.actions || formValue.actions.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please add at least one action'
      });
      return;
    }

    // Build FormRule object - clean empty values
    const formRule: FormRule = {
      id: this.editingRule?.id,
      ruleName: formValue.ruleName.trim(),
      condition: {
        field: formValue.condition.field.trim(),
        operator: formValue.condition.operator,
        value: formValue.condition.value && formValue.condition.value.toString().trim() !== ''
          ? formValue.condition.value.toString().trim()
          : '',
        valueType: formValue.condition.valueType || 'constant'
      },
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
      executionOrder: formValue.executionOrder || 1
    };

    // Validate actions after cleaning
    if (formRule.actions.length === 0) {
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
      
      // Validate actions before sending
      if (!ruleDto.actions || ruleDto.actions.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'At least one action is required',
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
      // Update
      this.formRulesService.updateRule(this.editingRule.id, ruleDto).subscribe({
        next: () => {
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
          if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.error?.title) {
            errorMessage = error.error.title;
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 7000
          });
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
          
          // Try to extract error message from different possible locations
          if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.error?.title) {
            errorMessage = error.error.title;
          } else if (error?.error?.errors && typeof error.error.errors === 'object') {
            // Handle validation errors object
            const errors = Object.values(error.error.errors).flat();
            errorMessage = errors.length > 0 ? errors.join(', ') : 'Validation failed';
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (typeof error?.error === 'string') {
            errorMessage = error.error;
          }
          
          // Check for specific error patterns
          if (errorMessage.toLowerCase().includes('no data returned')) {
            errorMessage = 'Server did not return the created rule. The rule may have been created but failed to retrieve it.';
          } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('validation')) {
            errorMessage = 'Invalid rule data format. Please check all fields are filled correctly.';
          } else if (error?.status === 400) {
            errorMessage = 'Bad request. Please check all required fields are filled correctly.';
          } else if (error?.status === 500) {
            errorMessage = 'Server error. Please try again or contact support.';
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 7000
          });
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
    if (!ruleId) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this rule?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.formRulesService.deleteRule(ruleId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Rule deleted successfully'
            });
            this.loadRules();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete rule'
            });
          }
        });
      }
    });
  }
}

