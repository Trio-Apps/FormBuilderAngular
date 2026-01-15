/**
 * Project DTOs for API communication
 */

export interface ProjectDto {
  id: number;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedByUserId?: string;
}

export interface CreateProjectDto {
  name: string;
  code: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateProjectDto {
  name?: string;
  code?: string;
  description?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

