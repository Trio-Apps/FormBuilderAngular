export type DocumentSeriesResetPolicy = 'None' | 'Yearly' | 'Monthly' | 'Daily';
export type DocumentSeriesGenerateOn = 'Submit' | 'Approval';

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
  seriesName?: string;
  template?: string;
  seriesCode: string;
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean; // Boolean from backend
  lastGeneratedAt?: string;
  lastGeneratedNumber?: string;
  // Note: isDeleted is not returned by the backend API
}

export interface CreateDocumentSeries {
  documentTypeId: number;
  projectId: number;
  seriesName?: string;
  template?: string;
  seriesCode: string;
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateDocumentSeries {
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
