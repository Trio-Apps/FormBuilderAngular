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
  fieldOrder?: number;
  placeholder?: string;
  hintText?: string;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  defaultValue?: string;
  fieldTypeId?: number;
  fieldType?: string;
  isActive?: boolean;
}



export interface UpdateFormFieldDto {
  fieldName?: string;
  fieldCode?: string;
  placeholder?: string;
  hintText?: string;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  defaultValue?: string;
  fieldTypeId?: number;
  fieldType?: string;
  fieldOrder?: number;
  isActive?: boolean;
}
export interface FieldTypeDto {
  id: number;
  typeName: string;
  dataType?: string;
  maxLength?: number;
  hasOptions: boolean;
  allowMultiple: boolean;
  isActive: boolean;
}

// أضف fieldTypeId في CreateFormFieldDto إذا كان ناقص
// تحقق من واجهة CreateFormFieldDto
export interface CreateFormFieldDto {
  tabId: number;
  fieldTypeId: number;
  fieldName: string;
  fieldCode: string;
  placeholder?: string;
  hintText?: string;
  isMandatory?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
  defaultValueJson?: string;
  fieldOrder?: number;
  isActive?: boolean;
  dataType: string;
  regexPattern: string;
  createdByUserId: number;
  readOnlyRuleJson: string;
  validationMessage: string;
  visibilityRuleJson: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
}