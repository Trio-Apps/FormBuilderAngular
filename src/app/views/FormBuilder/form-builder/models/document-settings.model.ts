export type DocumentSeriesResetPolicy = 'None' | 'Yearly' | 'Monthly' | 'Daily';
export type DocumentSeriesGenerateOn = 'Submit' | 'Approval';

// Document Settings Models

/**
 * Document Settings - Main model
 */
export interface DocumentSettings {
  id?: number;
  formBuilderId: number;
  
  // Document Type Section
  documentName: string;
  documentCode: string;
  menuCaption?: string;
  menuOrder?: number;
  parentMenuId?: number | null;
  isActive: boolean;
  
  // Document Series
  documentSeries?: DocumentSeries[];
  
  // Metadata
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string;
}

/**
 * Document Series - Series configuration for document numbering
 */
export interface DocumentSeries {
  id?: number;
  documentSettingsId?: number;
  projectId: number;
  seriesName?: string;
  template?: string;
  seriesCode: string; // Prefix
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
  lastGeneratedAt?: string;
  lastGeneratedNumber?: string;
}

/**
 * Project - Active project for series selection
 */
export interface Project {
  id: number;
  projectName: string;
  projectCode?: string;
  isActive: boolean;
}

/**
 * Create Document Settings DTO
 */
export interface CreateDocumentSettingsDto {
  formBuilderId: number;
  documentName: string;
  documentCode: string;
  menuCaption?: string;
  menuOrder?: number;
  parentMenuId?: number | null;
  isActive: boolean;
  documentSeries?: CreateDocumentSeriesDto[];
}

/**
 * Update Document Settings DTO
 */
export interface UpdateDocumentSettingsDto {
  documentName?: string;
  documentCode?: string;
  menuCaption?: string;
  menuOrder?: number;
  parentMenuId?: number | null;
  isActive?: boolean;
  documentSeries?: CreateDocumentSeriesDto[];
}

/**
 * Create Document Series DTO
 */
export interface CreateDocumentSeriesDto {
  projectId: number;
  seriesName?: string;
  template?: string;
  seriesCode: string;
  sequenceStart?: number;
  sequencePadding?: number;
  resetPolicy?: DocumentSeriesResetPolicy;
  generateOn?: DocumentSeriesGenerateOn;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
}
