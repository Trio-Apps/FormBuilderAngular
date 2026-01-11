export interface AttachmentType {
  id: number;
  name: string;
  code: string;
  description?: string;
  maxSizeMB: number;
  isActive?: boolean;
  isDeleted: boolean;
}

export interface CreateAttachmentTypeDto {
  name: string;
  code: string;
  description?: string;
  maxSizeMB?: number;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface UpdateAttachmentTypeDto {
  name?: string;
  code?: string;
  description?: string;
  maxSizeMB?: number;
  isActive?: boolean;
  isDeleted?: boolean;
}

// ToggleActiveDto removed - use softDelete/restore instead

