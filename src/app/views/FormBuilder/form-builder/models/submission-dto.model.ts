// src/app/views/FormBuilder/form-builder/models/submission-dto.model.ts

export interface FormSubmissionDto {
  id: number;
  formBuilderId: number;
  formName?: string;
  formCode?: string;
  submittedBy?: string;
  submittedDate?: string;
  status?: string;
  isActive?: boolean;
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
  // Additional fields that might come from backend
  totalFields?: number;
  completedFields?: number;
  attachmentsCount?: number;
}

export interface CreateFormSubmissionDto {
  formBuilderId: number;
  submittedBy?: string;
  status?: string;
  isActive?: boolean;
  createdByUserId?: string;
}

export interface UpdateFormSubmissionDto {
  submittedBy?: string;
  status?: string;
  isActive?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

