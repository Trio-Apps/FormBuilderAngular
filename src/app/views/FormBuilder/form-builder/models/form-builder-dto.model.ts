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
  fieldName: string;
  fieldCode: string;
  fieldTypeId?: number;
  fieldType?: string;  // أضف هذا الحقل
  placeholder?: string;
  hintText?: string;
  fieldOrder?: number;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  dataType?: string;
  defaultValue?: string;  // أضف هذا الحقل
  regexPattern?: string;
  validationMessage?: string;
  visibilityRuleJson?: string;
  readOnlyRuleJson?: string;
  defaultValueJson?: string;
  minValue?: number;      // أضف هذا الحقل
  maxValue?: number;      // أضف هذا الحقل
  maxLength?: number;     // أضف هذا الحقل
}

export interface UpdateFormFieldDto {
  fieldName?: string;
  fieldCode?: string;
  fieldTypeId?: number;
  fieldType?: string;
  placeholder?: string;
  hintText?: string;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  dataType?: string;
  defaultValue?: string;
  regexPattern?: string;
  validationMessage?: string;
  minValue?: number;
  maxValue?: number;
  maxLength?: number;
  fieldOrder?: number;
  visibilityRuleJson?: string;
  readOnlyRuleJson?: string;
  defaultValueJson?: string;
}

export interface FieldTypeDto {
  id: number;
  typeName: string;
  description?: string;  // أضف هذا الحقل
  dataType?: string;
  maxLength?: number;
  hasOptions: boolean;
  allowMultiple: boolean;
  isActive: boolean;
}

export interface CreateFormFieldDto {
  tabId: number;
  fieldTypeId: number;
  fieldName: string;
  fieldCode: string;
  fieldOrder?: number;
  placeholder?: string;
  hintText?: string;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  dataType?: string;
  defaultValue?: string;
  regexPattern?: string;
  validationMessage?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  
  // الحقول الاختيارية
  createdByUserId?: string;
  readOnlyRuleJson?: string;
  visibilityRuleJson?: string;
  defaultValueJson?: string;
}