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