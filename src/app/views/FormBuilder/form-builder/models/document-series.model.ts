// Document Series Models

/**
 * Document Series - Series configuration for document numbering
 * Updated based on backend API response:
 * - documentTypeName and projectName can be null
 * - isDeleted field is not returned by the backend API
 */
export interface DocumentSeries {
  id: number;
  documentTypeId: number;
  documentTypeName: string | null; // Can be null from backend
  projectId: number;
  projectName: string | null; // Can be null from backend
  seriesCode: string;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean; // Boolean from backend
  // Note: isDeleted is not returned by the backend API
}

export interface CreateDocumentSeries {
  documentTypeId: number;
  projectId: number;
  seriesCode: string;
  nextNumber?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateDocumentSeries {
  documentTypeId?: number;
  projectId?: number;
  seriesCode?: string;
  nextNumber?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface DocumentSeriesNumber {
  seriesId: number;
  seriesCode: string;
  nextNumber: number;
  fullNumber: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

