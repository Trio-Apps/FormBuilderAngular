export interface AttachmentType {
  id: number;
  name: string;
  code: string;
  description?: string;
  maxSizeMB: number;
  isActive: boolean;
}

export interface CreateAttachmentTypeDto {
  name: string;
  code: string;
  description?: string;
  maxSizeMB?: number;
  isActive?: boolean;
}

export interface UpdateAttachmentTypeDto {
  name?: string;
  code?: string;
  description?: string;
  maxSizeMB?: number;
  isActive?: boolean;
}

export interface ToggleActiveDto {
  isActive: boolean;
}

