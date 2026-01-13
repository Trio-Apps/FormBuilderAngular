// Document Series Models

export interface DocumentSeries {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  projectId: number;
  projectName: string;
  seriesCode: string;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
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

