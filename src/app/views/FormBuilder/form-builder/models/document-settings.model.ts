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
  seriesCode: string; // Prefix
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
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
  seriesCode: string;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
}

