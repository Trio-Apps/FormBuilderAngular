// src/app/views/FormBuilder/form-builder/models/form-builder-dto.model.ts

export interface FormBuilderDto {
  id: number;
  formName: string;
  formCode: string;
  description?: string;
  version?: number;
  isPublished?: boolean;
  isActive?: boolean;

  createdByUserId?: string;
  createdDate?: string; // أو Date
  updatedDate?: string | null; // أو Date | null
}

export interface CreateFormBuilderDto {
  formName: string;
  formCode: string;
  description?: string;
}

export interface UpdateFormBuilderDto {
  formName: string;
  formCode: string;
  description?: string;
  isPublished?: boolean;
  isActive?: boolean;
}
