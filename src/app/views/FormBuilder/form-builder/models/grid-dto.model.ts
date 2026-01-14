// src/app/views/FormBuilder/form-builder/models/grid-dto.model.ts

import { FieldTypeDto } from './form-builder-dto.model';

/**
 * Grid DTOs for Form Grid (Line Items Grid) functionality
 */

// ===== Form Grid (Schema) =====
export interface FormGridDto {
  id: number;
  formBuilderId: number;
  tabId: number; // Grid belongs to a Tab
  gridName: string;
  foreignGridName?: string; // Arabic grid name
  gridCode: string;
  gridOrder: number;
  isActive: boolean;
  isDeleted?: boolean;
  minRows?: number; // Minimum number of rows required
  maxRows?: number; // Maximum number of rows allowed
  validationRules?: string; // JSON string for grid-level validation rules
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
  columns?: FormGridColumnDto[];
}

export interface CreateFormGridDto {
  formBuilderId: number;
  tabId: number; // Grid belongs to a Tab
  gridName: string;
  foreignGridName?: string;
  gridCode: string;
  gridOrder: number;
  isDeleted: boolean;
  minRows?: number; // Minimum number of rows required
  maxRows?: number; // Maximum number of rows allowed
  validationRules?: string; // JSON string for grid-level validation rules
  createdByUserId?: string;
}

export interface UpdateFormGridDto {
  tabId?: number; // Can update tab assignment
  gridName?: string;
  foreignGridName?: string;
  gridCode?: string;
  gridOrder?: number;
  isDeleted?: boolean;
  minRows?: number; // Minimum number of rows required
  maxRows?: number; // Maximum number of rows allowed
  validationRules?: string; // JSON string for grid-level validation rules
}

// ===== Form Grid Column (Column Definition) =====
export interface FormGridColumnDto {
  id: number;
  gridId: number;
  fieldTypeId: number; // Required - links to FieldType
  columnName: string;
  foreignColumnName?: string; // Arabic column name
  columnCode: string;
  columnOrder: number;
  dataType: string; // 'text', 'number', 'date', 'email', 'select', etc.
  isRequired: boolean;
  isActive?: boolean;
  isDeleted: boolean;
  isReadOnly?: boolean; // Column is read-only (cannot be edited)
  isVisible?: boolean; // Column visibility (default: true)
  dataSourceId?: number; // Links to data source for dropdown columns
  defaultValue?: string;
  validationRules?: string; // JSON string for validation rules
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
  // For select/radio/checkbox types
  columnOptions?: GridColumnOptionDto[];
  dataSource?: GridColumnDataSourceDto; // Navigation property
  fieldType?: FieldTypeDto; // Navigation property - FieldType details
}

export interface CreateFormGridColumnDto {
  gridId: number;
  fieldTypeId: number; // Required - links to FieldType
  columnName: string;
  foreignColumnName?: string;
  columnCode: string;
  columnOrder: number;
  dataType: string;
  isRequired: boolean;
  isActive?: boolean;
  isDeleted: boolean;
  isReadOnly?: boolean; // Column is read-only (cannot be edited)
  isVisible?: boolean; // Column visibility (default: true)
  dataSourceId?: number; // Links to data source for dropdown columns
  defaultValue?: string;
  validationRules?: string;
  createdByUserId?: string;
}

export interface UpdateFormGridColumnDto {
  fieldTypeId?: number; // Optional - can update field type
  columnName?: string;
  foreignColumnName?: string;
  columnCode?: string;
  columnOrder?: number;
  dataType?: string;
  isRequired?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  isReadOnly?: boolean; // Column is read-only (cannot be edited)
  isVisible?: boolean; // Column visibility
  dataSourceId?: number; // Links to data source for dropdown columns
  defaultValue?: string;
  validationRules?: string;
}

export interface GridColumnOptionDto {
  id?: number;
  columnId?: number;
  dataSourceId?: number; // Links to data source for static options
  optionValue: string;
  optionText: string;
  foreignOptionText?: string; // Arabic option text
  optionOrder?: number;
  isDefault?: boolean; // Indicates if this is the default option
  isActive?: boolean;
  isDeleted?: boolean;
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
}

// ===== Form Submission Grid Row (Row Data) =====
export interface FormSubmissionGridRowDto {
  id: number;
  submissionId: number;
  gridId: number;
  rowIndex: number;
  isActive?: boolean;
  isDeleted: boolean;
  createdDate?: string;
  updatedDate?: string | null;
  cells?: FormSubmissionGridCellDto[];
}

export interface CreateFormSubmissionGridRowDto {
  submissionId: number;
  gridId: number;
  rowIndex: number;
  isDeleted?: boolean;
}

export interface UpdateFormSubmissionGridRowDto {
  rowIndex?: number;
  isDeleted?: boolean;
}

// ===== Form Submission Grid Cell (Cell Data) =====
export interface FormSubmissionGridCellDto {
  id: number;
  rowId: number;
  columnId: number;
  cellValue: string;
  createdDate?: string;
  updatedDate?: string | null;
  // Navigation properties
  column?: FormGridColumnDto;
}

export interface CreateFormSubmissionGridCellDto {
  rowId: number;
  columnId: number;
  cellValue: string;
}

export interface UpdateFormSubmissionGridCellDto {
  cellValue?: string;
}

// ===== Bulk Operations DTOs =====
export interface BulkSaveGridDataDto {
  submissionId: number;
  gridId: number;
  rows: BulkGridRowDto[];
}

export interface BulkGridRowDto {
  rowIndex: number;
  cells: BulkGridCellDto[];
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface BulkGridCellDto {
  columnId: number;
  columnCode: string;
  cellValue?: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: string;
  valueBool?: boolean;
  valueJson?: string;
}

// ===== Complete Grid Data (with nested cells) =====
export interface CompleteGridDataDto {
  grid: FormGridDto;
  rows: FormSubmissionGridRowDto[];
  totalRows: number;
  activeRows: number;
}

// ===== Grid Statistics =====
export interface GridStatsDto {
  gridId: number;
  gridName: string;
  totalRows: number;
  activeRows: number;
  totalCells: number;
  rowsBySubmission?: { [submissionId: number]: number };
}

// ===== Grid Summary =====
export interface GridSummaryDto {
  gridId: number;
  gridName: string;
  rowCount: number;
  columnSummaries: ColumnSummaryDto[];
}

export interface ColumnSummaryDto {
  columnId: number;
  columnName: string;
  filledCells: number;
  emptyCells: number;
}

// ===== Validation =====
export interface GridValidationResultDto {
  isValid: boolean;
  errors: ValidationErrorDto[];
  warnings: ValidationWarningDto[];
}

export interface ValidationErrorDto {
  field: string;
  message: string;
  rowIndex?: number;
  columnId?: number;
}

export interface ValidationWarningDto {
  field: string;
  message: string;
  rowIndex?: number;
  columnId?: number;
}

// ===== Grid Column Data Sources (for Dropdown columns) =====
export interface GridColumnDataSourceDto {
  id: number;
  columnId: number;
  columnName?: string; // Navigation property - Column name
  columnCode?: string; // Navigation property - Column code
  gridName?: string; // Navigation property - Grid name
  formBuilderName?: string; // Navigation property - Form Builder name
  sourceType: 'Static' | 'LookupTable' | 'API'; // Type of data source
  apiUrl?: string; // For API sources
  apiPath?: string; // JSON path to extract data
  httpMethod?: string; // HTTP method for API calls (GET, POST, PUT, DELETE, PATCH)
  requestBodyJson?: string; // Request body for API calls
  valuePath?: string; // JSON path for option values
  textPath?: string; // JSON path for option text
  arrayPropertyNames?: string[]; // Array of property names to navigate through nested JSON structures
  configurationJson?: string; // Additional configuration (for LookupTable sources)
  isActive?: boolean;
  isDeleted: boolean;
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
}

export interface CreateGridColumnDataSourceDto {
  columnId: number;
  sourceType: 'Static' | 'LookupTable' | 'API';
  apiUrl?: string;
  apiPath?: string;
  httpMethod?: string; // GET, POST, PUT, DELETE, PATCH
  requestBodyJson?: string;
  valuePath?: string;
  textPath?: string;
  arrayPropertyNames?: string[]; // Array of property names to navigate through nested JSON structures
  configurationJson?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdByUserId?: string;
}

export interface UpdateGridColumnDataSourceDto {
  sourceType?: 'Static' | 'LookupTable' | 'API';
  apiUrl?: string;
  apiPath?: string;
  httpMethod?: string; // GET, POST, PUT, DELETE, PATCH
  requestBodyJson?: string;
  valuePath?: string;
  textPath?: string;
  arrayPropertyNames?: string[]; // Array of property names to navigate through nested JSON structures
  configurationJson?: string;
  isActive?: boolean;
}

// ===== Grid Column Options (Static dropdown options) =====
export interface CreateGridColumnOptionDto {
  columnId?: number;
  dataSourceId?: number;
  optionValue: string;
  optionText: string;
  foreignOptionText?: string;
  optionOrder?: number;
  isDefault?: boolean; // Indicates if this is the default option
  isActive?: boolean;
  isDeleted?: boolean;
  createdByUserId?: string;
}

export interface UpdateGridColumnOptionDto {
  optionValue?: string;
  optionText?: string;
  foreignOptionText?: string;
  optionOrder?: number;
  isDefault?: boolean; // Indicates if this is the default option
  isActive?: boolean;
}

// ===== Dropdown Options Response =====
export interface DropdownOptionDto {
  value: string;
  text: string;
  foreignText?: string; // Arabic text
  order?: number;
  isDeleted?: boolean;
}

// ===== API Response Wrapper =====
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

