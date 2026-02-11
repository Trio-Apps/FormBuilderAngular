export interface DocumentType {
  id: number;
  name: string;
  code: string;
  formBuilderId?: number;
  menuCaption: string;
  menuOrder: number;
  parentMenuId?: number;
  isActive?: boolean;
  isDeleted: boolean;
  formBuilderName?: string;
  parentMenuName?: string;
  defaultSeriesId?: number | null;
  defaultSeriesName?: string | null;
  approvalWorkflowId?: number | null;
  approvalWorkflowName?: string;
}

export interface CreateDocumentTypeDto {
  name: string;
  code: string;
  formBuilderId: number; // Required - must be provided from route
  menuCaption: string;
  menuOrder?: number;
  parentMenuId?: number;
  defaultSeriesId?: number | null;
  isActive?: boolean;
  isDeleted?: boolean;
  approvalWorkflowId?: number | null; // Optional - null means no workflow (auto-approve)
}

export interface UpdateDocumentTypeDto {
  name?: string;
  code?: string;
  formBuilderId?: number;
  menuCaption?: string;
  menuOrder?: number;
  parentMenuId?: number | null; // Allow null to explicitly remove parent relationship
  defaultSeriesId?: number | null;
  isActive?: boolean;
  approvalWorkflowId?: number | null; // Optional - null means no workflow (auto-approve)
}

// ==================== DOCUMENT SERIES ====================

export type DocumentSeriesResetPolicy = 'None' | 'Yearly' | 'Monthly' | 'Daily';
export type DocumentSeriesGenerateOn = 'Submit' | 'Approval';

/**
 * Document Series - Series configuration for document numbering
 * Linked to ProjectId
 * 
 * Updated based on backend API response:
 * - documentTypeName and projectName can be null
 * - isDeleted field is not returned by the backend API
 */
export interface DocumentSeries {
  id?: number;
  documentTypeId?: number; // Included in many API payloads and used by consumers
  documentTypeName?: string | null; // For display - can be null from backend
  projectId: number; // Required - links to Project
  projectName?: string | null; // For display - can be null from backend
  seriesName?: string;
  template?: string;
  seriesCode: string; // Prefix (e.g., LC-AND1-2025), max 50 chars
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber: number; // Next running value
  isDefault: boolean; // Default series selection
  isActive?: boolean; // Active status - boolean from backend
  lastGeneratedAt?: string;
  lastGeneratedNumber?: string;
  // Note: isDeleted is not returned by the backend API
}

/**
 * Create Document Series DTO
 * According to API documentation: projectId is required
 */
export interface CreateDocumentSeriesDto {
  documentTypeId?: number; // Optional: some flows send it explicitly
  projectId: number; // Required
  seriesName?: string;
  template?: string;
  seriesCode: string; // Required - Prefix, max 50 chars
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber?: number; // Optional - default: 1
  isDefault?: boolean; // Optional - default: false
  isActive?: boolean; // Optional - default: true
  // Note: isDeleted is not used in backend API - series are soft-deleted via separate endpoint
}

/**
 * Update Document Series DTO
 */
export interface UpdateDocumentSeriesDto {
  documentTypeId?: number;
  projectId?: number;
  seriesName?: string;
  template?: string;
  seriesCode?: string;
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber?: number;
  isDefault?: boolean;
  isActive?: boolean;
}
