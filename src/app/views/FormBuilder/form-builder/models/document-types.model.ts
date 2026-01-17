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
  isActive?: boolean;
  approvalWorkflowId?: number | null; // Optional - null means no workflow (auto-approve)
}

// ==================== DOCUMENT SERIES ====================

/**
 * Document Series - Series configuration for document numbering
 * Linked to DocumentTypeId and ProjectId
 * 
 * Updated based on backend API response:
 * - documentTypeName and projectName can be null
 * - isDeleted field is not returned by the backend API
 */
export interface DocumentSeries {
  id?: number;
  documentTypeId: number; // Required - links to DocumentType
  documentTypeName?: string | null; // For display - can be null from backend
  projectId: number; // Required - links to Project
  projectName?: string | null; // For display - can be null from backend
  seriesCode: string; // Prefix (e.g., LC-AND1-2025), max 50 chars
  nextNumber: number; // Next running value
  isDefault: boolean; // Default series selection
  isActive?: boolean; // Active status - boolean from backend
  // Note: isDeleted is not returned by the backend API
}

/**
 * Create Document Series DTO
 * According to API documentation: projectId is required
 */
export interface CreateDocumentSeriesDto {
  documentTypeId: number; // Required
  projectId: number; // Required
  seriesCode: string; // Required - Prefix, max 50 chars
  nextNumber?: number; // Optional - default: 1
  isDefault?: boolean; // Optional - default: false
  isActive?: boolean; // Optional - default: true
  // Note: isDeleted is not used in backend API - series are soft-deleted via separate endpoint
}

/**
 * Update Document Series DTO
 */
export interface UpdateDocumentSeriesDto {
  projectId?: number;
  seriesCode?: string;
  nextNumber?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

