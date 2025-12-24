import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormRulesService } from '../../services/form-rules.service';
import { FormsService } from '../../services/forms.service';
import { FieldsService } from '../../services/fields.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  FormRule,
  CreateFormRuleDto,
  UpdateFormRuleDto,
  FormBuilderDto,
  FormFieldDto,
  RuleCondition,
  FieldCondition,
  RuleAction,
  ConditionOperator,
  FieldOperator,
  ActionType,
  FormRuleType
} from '../../form-builder/models/form-builder-dto.model';
import { Subscription } from 'rxjs';
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
  formId!: number;
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
  ruleTypes: { label: string; value: FormRuleType }[] = [
    { label: 'Visibility', value: 'Visibility' },
    { label: 'Mandatory', value: 'Mandatory' },
    { label: 'ReadOnly', value: 'ReadOnly' },
    { label: 'Custom', value: 'Custom' }
  ];

  conditionOperators: { label: string; value: ConditionOperator }[] = [
    { label: 'And', value: 'And' },
    { label: 'Or', value: 'Or' }
  ];

  fieldOperators: { label: string; value: FieldOperator }[] = [
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

  actionTypes: { label: string; value: ActionType }[] = [
    { label: 'Show', value: 'Show' },
    { label: 'Hide', value: 'Hide' },
    { label: 'Set Required', value: 'SetRequired' },
    { label: 'Set Optional', value: 'SetOptional' },
    { label: 'Set ReadOnly', value: 'SetReadOnly' },
    { label: 'Set Editable', value: 'SetEditable' },
    { label: 'Set Value', value: 'SetValue' },
    { label: 'Set Default Value', value: 'SetDefaultValue' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formRulesService: FormRulesService,
    private formsService: FormsService,
    private fieldsService: FieldsService,
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
      ruleType: ['Visibility', Validators.required],
      description: [''],
      isActive: [true],
      priority: [5, [Validators.required, Validators.min(0)]],
      condition: this.fb.group({
        operator: ['And', Validators.required],
        conditions: this.fb.array([])
      }),
      actions: this.fb.array([])
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
    // Load all fields from all tabs
    this.formsService.getFormById(this.formId).subscribe({
      next: (form) => {
        this.formFields = [];
        if (form.tabs) {
          form.tabs.forEach(tab => {
            if (tab.fields) {
              this.formFields.push(...tab.fields);
            }
          });
        }
      }
    });
  }

  loadRules(): void {
    if (!this.formId || isNaN(this.formId)) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.formRulesService.getRulesByFormId(this.formId).subscribe({
      next: (rules) => {
        this.rules = Array.isArray(rules) ? rules : [];
        this.filteredRules = [...this.rules];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load rules'
        });
      }
    });
  }

  get filteredRulesList(): FormRule[] {
    if (!this.searchTerm.trim()) {
      return this.rules;
    }
    const term = this.searchTerm.toLowerCase();
    return this.rules.filter(rule =>
      rule.ruleName?.toLowerCase().includes(term) ||
      rule.description?.toLowerCase().includes(term) ||
      rule.ruleType?.toLowerCase().includes(term)
    );
  }

  openRuleModal(rule?: FormRule): void {
    this.editingRule = rule || null;
    this.initRuleForm();

    if (rule) {
      // Edit mode
      this.ruleForm.patchValue({
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        description: rule.description || '',
        isActive: rule.isActive,
        priority: rule.priority || 5
      });

      // Load conditions
      if (rule.condition?.conditions) {
        const conditionGroup = this.ruleForm.get('condition') as FormGroup;
        const conditionsArray = conditionGroup.get('conditions') as FormArray;
        conditionsArray.clear();
        rule.condition.conditions.forEach(cond => {
          conditionsArray.push(this.createConditionFormGroup(cond));
        });
        conditionGroup.get('operator')?.setValue(rule.condition.operator || 'And');
      }

      // Load actions
      if (rule.actions) {
        const actionsArray = this.ruleForm.get('actions') as FormArray;
        actionsArray.clear();
        rule.actions.forEach(action => {
          actionsArray.push(this.createActionFormGroup(action));
        });
      }
    } else {
      // Add mode - add one default condition and action
      this.addCondition();
      this.addAction();
    }

    this.showRuleModal = true;
  }

  closeRuleModal(): void {
    this.showRuleModal = false;
    this.editingRule = null;
    this.initRuleForm();
  }

  // Conditions Management
  get conditionsArray(): FormArray {
    const conditionGroup = this.ruleForm.get('condition') as FormGroup;
    return conditionGroup.get('conditions') as FormArray;
  }

  addCondition(): void {
    this.conditionsArray.push(this.createConditionFormGroup());
  }

  removeCondition(index: number): void {
    this.conditionsArray.removeAt(index);
  }

  createConditionFormGroup(condition?: FieldCondition): FormGroup {
    return this.fb.group({
      fieldCode: [condition?.fieldCode || '', Validators.required],
      operator: [condition?.operator || 'Equals', Validators.required],
      value: [condition?.value || ''],
      valueType: [condition?.valueType || 'string']
    });
  }

  // Actions Management
  get actionsArray(): FormArray {
    return this.ruleForm.get('actions') as FormArray;
  }

  addAction(): void {
    this.actionsArray.push(this.createActionFormGroup());
  }

  removeAction(index: number): void {
    this.actionsArray.removeAt(index);
  }

  createActionFormGroup(action?: RuleAction): FormGroup {
    return this.fb.group({
      fieldCode: [action?.fieldCode || '', Validators.required],
      actionType: [action?.actionType || 'Show', Validators.required],
      value: [action?.value || '']
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
    const ruleData: CreateFormRuleDto | UpdateFormRuleDto = {
      ruleName: formValue.ruleName,
      ruleType: formValue.ruleType,
      description: formValue.description || undefined,
      isActive: formValue.isActive,
      priority: formValue.priority || 5,
      condition: {
        operator: formValue.condition.operator,
        conditions: formValue.condition.conditions.map((c: any) => ({
          fieldCode: c.fieldCode,
          operator: c.operator,
          value: c.value || undefined,
          valueType: c.valueType || 'string'
        }))
      },
      actions: formValue.actions.map((a: any) => ({
        fieldCode: a.fieldCode,
        actionType: a.actionType,
        value: a.value || undefined
      }))
    };

    if (this.editingRule?.id) {
      // Update
      this.formRulesService.updateRule(this.editingRule.id, ruleData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Rule updated successfully'
          });
          this.closeRuleModal();
          this.loadRules();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update rule'
          });
        }
      });
    } else {
      // Create
      (ruleData as CreateFormRuleDto).formId = this.formId;
      this.formRulesService.createRule(ruleData as CreateFormRuleDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Rule created successfully'
          });
          this.closeRuleModal();
          this.loadRules();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create rule'
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

  requiresValueInput(operator: FieldOperator): boolean {
    return !['IsEmpty', 'IsNotEmpty'].includes(operator);
  }

  requiresActionValueInput(actionType: ActionType): boolean {
    return ['SetValue', 'SetDefaultValue'].includes(actionType);
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

