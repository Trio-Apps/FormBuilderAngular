// src/app/views/form-builder/models/form-builder-dto.model.ts

export interface FormBuilderDto {
  id: number;
  formName: string;
  foreignFormName?: string; // Arabic form name
  formCode: string;
  description?: string;
  foreignDescription?: string; // Arabic description
  isPublished?: boolean;
  isActive?: boolean;
  version?: number;
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
  tabs?: FormTabDto[];
  fieldsCount?: number;
  tabsCount?: number;
  formRules?: FormRule[]; // ✅ Form Rules for dynamic behavior
}

export interface CreateFormBuilderDto {
  formName: string;
  foreignFormName?: string; // Arabic form name
  formCode: string;
  description?: string;
  foreignDescription?: string; // Arabic description
  isPublished?: boolean;
  isActive?: boolean;
}

export interface UpdateFormBuilderDto {
  formName?: string;
  foreignFormName?: string; // Arabic form name
  formCode?: string;
  description?: string;
  foreignDescription?: string; // Arabic description
  isPublished?: boolean;
  isActive?: boolean;
}

export interface FormTabDto {
  id: number;
  formBuilderId: number;
  tabName: string;
  foreignTabName?: string; // Arabic tab name
  tabCode: string;
  tabOrder: number;
  isActive: boolean;
  createdByUserId?: string;
  createdDate?: string;
  // Extra client-side/navigation data (قد لا تكون موجودة حرفيًا في الـ DTO في الباك إند)
  fields?: FormFieldDto[];
  fieldsCount?: number;
  // Computed properties from API (for compatibility)
  name_en?: string; // English name (from API)
  name_ar?: string; // Arabic name (from API)
  order?: number; // Display order (from API)
  is_active?: boolean; // Status (from API)
}

export interface CreateFormTabDto {
  formBuilderId: number;
  tabName: string;
  foreignTabName?: string; // Arabic tab name
  tabCode: string;
  tabOrder: number;
  isActive: boolean;
  createdByUserId?: string;
}

export interface UpdateFormTabDto {
  tabName: string;
  foreignTabName?: string; // Arabic tab name
  tabCode: string;
  tabOrder: number;
  isActive: boolean;
}

export interface FormFieldDto {
  id: number;
  tabId: number;
  fieldTypeId: number;
  fieldTypeName?: string;
  fieldName: string;
  foreignFieldName?: string; // Arabic field name
  fieldCode: string;
  fieldOrder: number;
  placeholder?: string;
  foreignPlaceholder?: string; // Arabic placeholder
  hintText: string; // Required in C# (non-nullable string)
  foreignHintText?: string; // Arabic hint text
  isMandatory: boolean | null; // Required in C# but nullable bool
  isEditable: boolean | null; // Required in C# but nullable bool
  isVisible: boolean | null; // Required in C# but nullable bool
  defaultValueJson?: string;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  foreignValidationMessage?: string; // Arabic validation message
  gridId?: number; // Grid ID for Grid field type
  createdDate: string; // Required in C# (DateTime)
  createdByUserId?: string;
  createdByUserName?: string;
  isActive: boolean; // Required in C#
  // Navigation properties
  tab?: FormTabDto; // JsonIgnore in C#
  fieldType?: FieldTypeDto;
  fieldOptions: FieldOptionDto[]; // Required in C# (List with default)
  fieldDataSource?: FieldDataSource; // ✅ Data Source configuration for dynamic options
  // Calculation properties (for Calculated field type)
  expressionText?: string; // Expression text for calculated fields
  calculationMode?: 'Expression' | 'Formula'; // Calculation mode
  recalculateOn?: 'OnFieldChange' | 'OnLoad' | 'OnSubmitOnly'; // When to recalculate
  resultType?: 'Decimal' | 'Integer' | 'Text'; // Result data type
  // Computed properties from API (for compatibility)
  label_en?: string; // English label (from API)
  label_ar?: string; // Arabic label (from API)
  placeholder_en?: string; // English placeholder (from API)
  placeholder_ar?: string; // Arabic placeholder (from API)
  type?: string; // Field type (from API)
  is_required?: boolean; // Required status (from API)
}

export interface UpdateFormFieldDto {
  tabId: number; // Required
  fieldTypeId: number; // Required
  fieldName: string; // Required, StringLength(200)
  foreignFieldName?: string; // Arabic field name
  fieldCode: string; // Required, StringLength(100)
  fieldOrder: number; // Required
  placeholder?: string;
  foreignPlaceholder?: string; // Arabic placeholder
  hintText: string; // Required (non-nullable string in C#)
  foreignHintText?: string; // Arabic hint text
  isMandatory?: boolean | null; // Optional nullable bool
  isEditable?: boolean | null; // Optional nullable bool
  isVisible?: boolean | null; // Optional nullable bool
  isActive?: boolean; // Optional bool for activating/deactivating field
  defaultValueJson?: string;
  maxLength?: number; // Optional int? in C#
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  foreignValidationMessage?: string; // Arabic validation message
  gridId?: number; // Grid ID for Grid field type
  // Calculation properties (for Calculated field type)
  expressionText?: string; // Expression text for calculated fields
  calculationMode?: 'Expression' | 'Formula'; // Calculation mode
  recalculateOn?: 'OnFieldChange' | 'OnLoad' | 'OnSubmitOnly'; // When to recalculate
  resultType?: 'Decimal' | 'Integer' | 'Text'; // Result data type
}

export interface FieldTypeDto {
  id: number;
  typeName: string;
  foreignTypeName?: string; // Arabic type name
  description?: string;
  dataType?: string;
  maxLength?: number;
  hasOptions: boolean;
  allowMultiple: boolean;
  isActive: boolean;
  // Computed properties from API (for compatibility)
  type_name_en?: string; // English type name (from API)
  type_name_ar?: string; // Arabic type name (from API)
}

export interface CreateFieldTypeDto {
  typeName: string;
  foreignTypeName?: string; // Arabic type name
  description?: string;
  dataType?: string;
  maxLength?: number;
  hasOptions: boolean;
  allowMultiple: boolean;
  isActive: boolean;
}

export interface UpdateFieldTypeDto {
  typeName?: string;
  foreignTypeName?: string; // Arabic type name
  description?: string;
  dataType?: string;
  maxLength?: number;
  hasOptions?: boolean;
  allowMultiple?: boolean;
  isActive?: boolean;
}

export interface FieldOptionDto {
  id?: number;
  fieldId?: number;
  optionValue: string;
  optionText: string;
  foreignOptionText?: string; // Arabic option text
  optionOrder?: number;
  isActive?: boolean;
}

export interface CreateFieldOptionDto {
  fieldId: number;
  optionValue: string;
  optionText: string;
  foreignOptionText?: string; // Arabic option text
  optionOrder?: number;
  isActive?: boolean;
}

export interface UpdateFieldOptionDto {
  optionValue?: string;
  optionText?: string;
  foreignOptionText?: string; // Arabic option text
  optionOrder?: number;
  isActive?: boolean;
}

export interface CreateFormFieldDto {
  tabId: number; // Required
  fieldTypeId: number; // Required
  fieldName: string; // Required, StringLength(200)
  foreignFieldName?: string; // Arabic field name
  fieldCode: string; // Required, StringLength(100)
  fieldOrder: number; // Required
  placeholder?: string;
  foreignPlaceholder?: string; // Arabic placeholder
  hintText: string; // Required (non-nullable string in C#)
  foreignHintText?: string; // Arabic hint text
  isMandatory?: boolean | null; // Optional with default = true in C#
  isEditable?: boolean | null; // Optional with default = true in C#
  isVisible?: boolean | null; // Optional with default = true in C#
  defaultValueJson?: string;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  foreignValidationMessage?: string; // Arabic validation message
  gridId?: number; // Grid ID for Grid field type
  // Calculation properties (for Calculated field type)
  expressionText?: string; // Expression text for calculated fields
  calculationMode?: 'Expression' | 'Formula'; // Calculation mode
  recalculateOn?: 'OnFieldChange' | 'OnLoad' | 'OnSubmitOnly'; // When to recalculate
  resultType?: 'Decimal' | 'Integer' | 'Text'; // Result data type
  createdByUserId?: string;
}

// ==================== Field Data Source Interfaces ====================

export interface FieldDataSource {
  id?: number;
  fieldId: number;
  sourceType: string; // 'Static' | 'Api' | 'LookupTable' | 'Custom'
  apiUrl?: string | null;
  httpMethod?: string | null; // 'GET' | 'POST'
  requestBodyJson?: string | null;
  valuePath?: string | null;
  textPath?: string | null;
  isActive: boolean;
}

export interface CreateFieldDataSourceDto {
  fieldId: number; // Required
  sourceType: string; // Required: 'Static' | 'Api' | 'LookupTable' | 'Custom'
  apiUrl?: string | null; // Optional, max 500 chars
  httpMethod?: string | null; // Optional, max 10 chars ('GET' | 'POST')
  requestBodyJson?: string | null; // Optional
  valuePath?: string | null; // Optional, max 200 chars
  textPath?: string | null; // Optional, max 200 chars
  isActive?: boolean; // Default: true
}

export interface UpdateFieldDataSourceDto {
  sourceType: string; // Required
  apiUrl?: string | null;
  httpMethod?: string | null;
  requestBodyJson?: string | null;
  valuePath?: string | null;
  textPath?: string | null;
  isActive: boolean; // Required
}

export interface FieldOptionResponse {
  value: string | number;
  text: string;
}

export interface GetFieldOptionsRequestDto {
  fieldId: number;
  context?: Record<string, any> | null;
  requestBodyJson?: string | null; // For API sources only
}

export interface PreviewDataSourceRequestDto {
  fieldId: number;
  sourceType: string; // 'Api' | 'LookupTable' | 'Custom'
  apiUrl?: string;
  httpMethod?: string;
  requestBodyJson?: string;
  valuePath?: string;
  textPath?: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

// ==================== Form Rules Interfaces ====================

/**
 * Condition - Simplified condition structure
 */
export interface Condition {
  field: string;
  operator: string;
  value: any;
  valueType: 'constant' | 'field';
}

/**
 * Action - Rule action structure
 * ActionType values: 'SetVisible' | 'SetReadOnly' | 'SetMandatory' | 'SetDefault' | 'ClearValue' | 'Compute'
 */
export interface Action {
  type: string; // SetVisible, SetReadOnly, SetMandatory, SetDefault, ClearValue, Compute
  fieldCode: string;
  value?: any; // For SetVisible, SetReadOnly, SetMandatory, SetDefault
  expression?: string; // For Compute action
}

/**
 * Form Rule Data - Frontend rule structure
 */
export interface FormRuleData {
  condition: Condition;
  actions?: Action[];
  elseActions?: Action[];
}

/**
 * Frontend Form Rule (for UI)
 */
export interface FormRule {
  id?: number;
  ruleName: string;
  condition: Condition;
  actions: Action[];
  elseActions?: Action[];
  isActive: boolean;
  executionOrder: number;
}

/**
 * Create Form Rule DTO - Backend API structure
 * ✅ Updated: Actions and ElseActions are now Arrays directly (not JSON strings)
 */
export interface CreateFormRuleDto {
  formBuilderId: number;
  ruleName: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  conditionValueType?: string;
  actions?: Action[]; // ✅ Array directly (not JSON string)
  elseActions?: Action[]; // ✅ Array directly (not JSON string)
  isActive?: boolean;
  executionOrder?: number;
}

/**
 * Update Form Rule DTO - Backend API structure
 * ✅ Updated: Actions and ElseActions are now Arrays directly (not JSON strings)
 */
export interface UpdateFormRuleDto {
  formBuilderId: number;
  ruleName?: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  conditionValueType?: string;
  actions?: Action[]; // ✅ Array directly (not JSON string)
  elseActions?: Action[]; // ✅ Array directly (not JSON string)
  isActive?: boolean;
  executionOrder?: number;
}

/**
 * Form Rule DTO - Backend response structure
 * ✅ Updated: Actions and ElseActions are now Arrays directly (not JSON strings)
 */
export interface FormRuleDto {
  id: number;
  formBuilderId: number;
  ruleName: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  conditionValueType?: string;
  actions?: Action[]; // ✅ Array directly (not JSON string)
  elseActions?: Action[]; // ✅ Array directly (not JSON string)
  isActive: boolean;
  executionOrder?: number;
  formName?: string;
  formCode?: string;
}

// ==================== Legacy Types (for backward compatibility) ====================
// These are kept for backward compatibility but should be migrated to use new interfaces

/**
 * @deprecated Use Condition instead
 */
export type FormRuleType = 'Visibility' | 'Mandatory' | 'ReadOnly' | 'Custom';

/**
 * @deprecated Use Condition instead
 */
export interface RuleCondition {
  operator: ConditionOperator;
  conditions: FieldCondition[];
}

/**
 * @deprecated Use Condition instead
 */
export type ConditionOperator = 'And' | 'Or';

/**
 * @deprecated Use Condition instead
 */
export interface FieldCondition {
  fieldCode: string;
  operator: FieldOperator;
  value?: any;
  valueType?: 'string' | 'number' | 'boolean' | 'date';
}

/**
 * @deprecated Use Action instead
 */
export type FieldOperator = 'Equals' | 'NotEquals' | 'Contains' | 'GreaterThan' | 'LessThan' | 'IsEmpty' | 'IsNotEmpty' | 'In' | 'NotIn';

/**
 * @deprecated Use Action instead
 */
export interface RuleAction {
  fieldCode: string;
  actionType: ActionType;
  value?: any;
}

/**
 * @deprecated Use Action.type instead
 */
export type ActionType = 'Show' | 'Hide' | 'SetRequired' | 'SetOptional' | 'SetReadOnly' | 'SetEditable' | 'SetValue' | 'SetDefaultValue';

// ==================== Form Rules Helper Types ====================

/**
 * Action Types for FORM_RULE_ACTIONS
 */
export type RuleActionType = 'SetVisible' | 'SetReadOnly' | 'SetMandatory' | 'SetDefault' | 'ClearValue' | 'Compute';

// ==================== Form Rules Helper Functions ====================

/**
 * Convert FormRule (Frontend) to CreateFormRuleDto (Backend)
 * Updated: Now sends Actions and ElseActions as Arrays directly (not JSON strings)
 */
export function convertFormRuleToDto(formRule: FormRule, formBuilderId: number): CreateFormRuleDto {
  // Clean condition - remove empty values
  const cleanCondition: Condition = {
    field: formRule.condition.field || '',
    operator: formRule.condition.operator || '',
    value: formRule.condition.value !== null && formRule.condition.value !== undefined 
      ? formRule.condition.value 
      : '',
    valueType: formRule.condition.valueType || 'constant'
  };

  // Clean actions - remove undefined/null values and any 'id' property
  // ✅ Fixed: Allow boolean false and 0 values (they are valid)
  // ✅ Fixed: Remove 'id' property to avoid Entity Framework tracking conflicts
  const cleanActions: Action[] = (formRule.actions || []).map(action => {
    // Create a clean action object without 'id' property
    const cleanAction: Action = {
      type: action.type || '',
      fieldCode: action.fieldCode || ''
    };
    // Include value if it's not null/undefined (allow false, 0, empty string)
    if (action.value !== null && action.value !== undefined) {
      cleanAction.value = action.value;
    }
    // Include expression if it's not null/undefined/empty
    if (action.expression !== null && action.expression !== undefined && action.expression !== '') {
      cleanAction.expression = action.expression;
    }
    // Ensure 'id' is not included (Action interface doesn't have 'id', but we explicitly exclude it)
    return cleanAction;
  });

  // Clean elseActions - remove undefined/null values and any 'id' property
  // ✅ Fixed: Allow boolean false and 0 values (they are valid)
  // ✅ Fixed: Remove 'id' property to avoid Entity Framework tracking conflicts
  const cleanElseActions: Action[] = (formRule.elseActions || []).map(action => {
    // Create a clean action object without 'id' property
    const cleanAction: Action = {
      type: action.type || '',
      fieldCode: action.fieldCode || ''
    };
    // Include value if it's not null/undefined (allow false, 0, empty string)
    if (action.value !== null && action.value !== undefined) {
      cleanAction.value = action.value;
    }
    // Include expression if it's not null/undefined/empty
    if (action.expression !== null && action.expression !== undefined && action.expression !== '') {
      cleanAction.expression = action.expression;
    }
    // Ensure 'id' is not included (Action interface doesn't have 'id', but we explicitly exclude it)
    return cleanAction;
  });

  // Convert condition value to string (handle null/undefined/empty)
  let conditionValueStr: string | undefined = undefined;
  if (cleanCondition.value !== null && cleanCondition.value !== undefined && cleanCondition.value !== '') {
    conditionValueStr = cleanCondition.value.toString();
  }

  // Validate required fields before creating DTO
  if (!cleanCondition.field || !cleanCondition.operator) {
    throw new Error('Condition field and operator are required');
  }

  if (cleanActions.length === 0) {
    throw new Error('At least one action is required');
  }

  // Return DTO with Arrays directly (no JSON serialization needed)
  return {
    formBuilderId: formBuilderId,
    ruleName: formRule.ruleName,
    conditionField: cleanCondition.field,
    conditionOperator: cleanCondition.operator,
    conditionValue: conditionValueStr,
    conditionValueType: cleanCondition.valueType,
    actions: cleanActions.length > 0 ? cleanActions : undefined,      // ✅ Array directly
    elseActions: cleanElseActions.length > 0 ? cleanElseActions : undefined,  // ✅ Array directly
    isActive: formRule.isActive !== undefined ? formRule.isActive : true,
    executionOrder: formRule.executionOrder || 1
  };
}

/**
 * Convert FormRuleDto (Backend) to FormRule (Frontend)
 * ✅ Updated: Now reads Actions and ElseActions as Arrays directly (not JSON strings)
 */
export function convertFormRuleDtoToFormRule(dto: FormRuleDto): FormRule {
  // Build condition from DTO fields
  let condition: Condition = {
    field: dto.conditionField || '',
    operator: dto.conditionOperator || '',
    value: dto.conditionValue || '',
    valueType: (dto.conditionValueType as 'constant' | 'field') || 'constant'
  };

  // ✅ Use Actions and ElseActions Arrays directly from DTO
  let actions: Action[] = dto.actions || [];
  let elseActions: Action[] = dto.elseActions || [];

  // Fallback: Try to parse from JSON strings if Arrays are not available (for backward compatibility)
  if (actions.length === 0 && (dto as any).actionsJson) {
    try {
      const parsedActions: any[] = JSON.parse((dto as any).actionsJson);
      actions = parsedActions.map((a: any) => ({
        type: a.type || a.actionType || '',
        fieldCode: a.fieldCode || '',
        value: a.value,
        expression: a.expression
      }));
    } catch (e) {
      console.warn('[convertFormRuleDtoToFormRule] Failed to parse actionsJson', e);
    }
  }

  if (elseActions.length === 0 && (dto as any).elseActionsJson) {
    try {
      const parsedElseActions: any[] = JSON.parse((dto as any).elseActionsJson);
      elseActions = parsedElseActions.map((a: any) => ({
        type: a.type || a.actionType || '',
        fieldCode: a.fieldCode || '',
        value: a.value,
        expression: a.expression
      }));
    } catch (e) {
      console.warn('[convertFormRuleDtoToFormRule] Failed to parse elseActionsJson', e);
    }
  }

  // Fallback: Try to parse ruleJson if available (for backward compatibility)
  if (actions.length === 0 && (dto as any).ruleJson) {
    try {
      const ruleData: FormRuleData = JSON.parse((dto as any).ruleJson);
      if (ruleData.condition) {
        condition = ruleData.condition;
      }
      if (ruleData.actions) {
        actions = ruleData.actions;
      }
      if (ruleData.elseActions) {
        elseActions = ruleData.elseActions;
      }
    } catch (e) {
      console.warn('[convertFormRuleDtoToFormRule] Failed to parse ruleJson', e);
    }
  }

  return {
    id: dto.id,
    ruleName: dto.ruleName,
    condition: condition,
    actions: actions,
    elseActions: elseActions.length > 0 ? elseActions : undefined,
    isActive: dto.isActive,
    executionOrder: dto.executionOrder || 1
  };
}