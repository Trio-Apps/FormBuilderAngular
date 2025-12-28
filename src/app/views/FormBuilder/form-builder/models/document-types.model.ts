export interface DocumentType {
  id: number;
  name: string;
  code: string;
  formBuilderId?: number;
  menuCaption: string;
  menuOrder: number;
  parentMenuId?: number;
  isActive: boolean;
  formBuilderName?: string;
  parentMenuName?: string;
}

export interface CreateDocumentTypeDto {
  name: string;
  code: string;
  formBuilderId?: number;
  menuCaption: string;
  menuOrder?: number;
  parentMenuId?: number;
  isActive?: boolean;
}

export interface UpdateDocumentTypeDto {
  name?: string;
  code?: string;
  formBuilderId?: number;
  menuCaption?: string;
  menuOrder?: number;
  parentMenuId?: number;
  isActive?: boolean;
}

