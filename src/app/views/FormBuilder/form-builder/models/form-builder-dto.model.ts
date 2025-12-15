// src/app/views/form-builder/models/form-builder-dto.model.ts

export interface FormBuilderDto {
  id: number;
  formName: string;
  formCode: string;
  description?: string;
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
  formCode: string;
  description?: string;
  isPublished?: boolean;
  isActive?: boolean;
}

export interface UpdateFormBuilderDto {
  formName?: string;
  formCode?: string;
  description?: string;
  isPublished?: boolean;
  isActive?: boolean;
}

export interface FormTabDto {
  id: number;
  formBuilderId: number;
  tabName: string;
  tabCode?: string;
  tabOrder?: number;
  fields?: FormFieldDto[];
  fieldsCount?: number;
  isActive?: boolean;
}

export interface CreateFormTabDto {
  formBuilderId: number;
  tabName: string;
  tabCode?: string;
  tabOrder?: number;
  isActive?: boolean;
}

export interface UpdateFormTabDto {
  tabName?: string;
  tabCode?: string;
  tabOrder?: number;
  isActive?: boolean;
}

export interface FormFieldDto {
  id: number;
  tabId: number;
  fieldTypeId: number;
  fieldTypeName?: string;
  fieldName: string;
  fieldCode: string;
  fieldOrder: number;
  placeholder?: string;
  hintText?: string;
  isMandatory: boolean;
  isEditable: boolean;
  isVisible: boolean;
  isActive: boolean;
  defaultValueJson?: string;
  dataType?: string;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  visibilityRuleJson?: string;
  readOnlyRuleJson?: string;
  createdDate?: string;
  createdByUserId?: string;
  createdByUserName?: string;
  // Navigation properties
  tab?: FormTabDto;
  fieldType?: FieldTypeDto;
  fieldOptions?: FieldOptionDto[];
}

export interface UpdateFormFieldDto {
  tabId: number;
  fieldTypeId: number;
  fieldName: string;
  fieldCode: string;
  fieldOrder: number;
  placeholder?: string;
  hintText?: string;
  isMandatory: boolean;
  isEditable: boolean;
  isVisible: boolean;
  isActive?: boolean;
  defaultValueJson?: string;
  dataType?: string;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  visibilityRuleJson?: string;
  readOnlyRuleJson?: string;
}

export interface FieldTypeDto {
  id: number;
  typeName: string;
  description?: string;
  dataType?: string;
  maxLength?: number;
  hasOptions: boolean;
  allowMultiple: boolean;
  isActive: boolean;
}

export interface FieldOptionDto {
  id?: number;
  fieldId?: number;
  optionValue: string;
  optionText: string;
  optionOrder?: number;
  isActive?: boolean;
}

export interface CreateFormFieldDto {
  tabId: number;
  fieldTypeId: number;
  fieldName: string;
  fieldCode: string;
  fieldOrder: number;
  placeholder?: string;
  hintText?: string;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  defaultValueJson?: string;
  dataType?: string;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  visibilityRuleJson?: string;
  readOnlyRuleJson?: string;
  createdByUserId?: string;
}