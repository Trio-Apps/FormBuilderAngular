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
  tabCode: string;
  tabOrder: number;
  isActive: boolean;
  createdByUserId?: string;
  createdDate?: string;
  // Extra client-side/navigation data (قد لا تكون موجودة حرفيًا في الـ DTO في الباك إند)
  fields?: FormFieldDto[];
  fieldsCount?: number;
}

export interface CreateFormTabDto {
  formBuilderId: number;
  tabName: string;
  tabCode: string;
  tabOrder: number;
  isActive: boolean;
  createdByUserId?: string;
}

export interface UpdateFormTabDto {
  tabName: string;
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
  fieldCode: string;
  fieldOrder: number;
  placeholder?: string;
  hintText: string; // Required in C# (non-nullable string)
  isMandatory: boolean | null; // Required in C# but nullable bool
  isEditable: boolean | null; // Required in C# but nullable bool
  isVisible: boolean | null; // Required in C# but nullable bool
  defaultValueJson?: string;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  createdDate: string; // Required in C# (DateTime)
  createdByUserId?: string;
  createdByUserName?: string;
  isActive: boolean; // Required in C#
  // Navigation properties
  tab?: FormTabDto; // JsonIgnore in C#
  fieldType?: FieldTypeDto;
  fieldOptions: FieldOptionDto[]; // Required in C# (List with default)
}

export interface UpdateFormFieldDto {
  tabId: number; // Required
  fieldTypeId: number; // Required
  fieldName: string; // Required, StringLength(200)
  fieldCode: string; // Required, StringLength(100)
  fieldOrder: number; // Required
  placeholder?: string;
  hintText: string; // Required (non-nullable string in C#)
  isMandatory?: boolean | null; // Optional nullable bool
  isEditable?: boolean | null; // Optional nullable bool
  isVisible?: boolean | null; // Optional nullable bool
  defaultValueJson?: string;
  maxLength?: number; // Optional int? in C#
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
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

export interface CreateFieldTypeDto {
  typeName: string;
  description?: string;
  dataType?: string;
  maxLength?: number;
  hasOptions: boolean;
  allowMultiple: boolean;
  isActive: boolean;
}

export interface UpdateFieldTypeDto {
  typeName?: string;
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
  optionOrder?: number;
  isActive?: boolean;
}

export interface CreateFieldOptionDto {
  fieldId: number;
  optionValue: string;
  optionText: string;
  optionOrder?: number;
  isActive?: boolean;
}

export interface UpdateFieldOptionDto {
  optionValue?: string;
  optionText?: string;
  optionOrder?: number;
  isActive?: boolean;
}

export interface CreateFormFieldDto {
  tabId: number; // Required
  fieldTypeId: number; // Required
  fieldName: string; // Required, StringLength(200)
  fieldCode: string; // Required, StringLength(100)
  fieldOrder: number; // Required
  placeholder?: string;
  hintText: string; // Required (non-nullable string in C#)
  isMandatory?: boolean | null; // Optional with default = true in C#
  isEditable?: boolean | null; // Optional with default = true in C#
  isVisible?: boolean | null; // Optional with default = true in C#
  defaultValueJson?: string;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  validationMessage?: string;
  createdByUserId?: string;
}