// src/app/views/FormBuilder/form-builder/models/grid-dto.model.ts

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
  isActive: boolean;
  createdByUserId?: string;
}

export interface UpdateFormGridDto {
  tabId?: number; // Can update tab assignment
  gridName?: string;
  foreignGridName?: string;
  gridCode?: string;
  gridOrder?: number;
  isActive?: boolean;
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
  isActive: boolean;
  defaultValue?: string;
  validationRules?: string; // JSON string for validation rules
  createdByUserId?: string;
  createdDate?: string;
  updatedDate?: string | null;
  // For select/radio/checkbox types
  columnOptions?: GridColumnOptionDto[];
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
  isActive: boolean;
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
  defaultValue?: string;
  validationRules?: string;
}

export interface GridColumnOptionDto {
  id?: number;
  columnId?: number;
  optionValue: string;
  optionText: string;
  foreignOptionText?: string;
  optionOrder?: number;
  isActive?: boolean;
}

// ===== Form Submission Grid Row (Row Data) =====
export interface FormSubmissionGridRowDto {
  id: number;
  submissionId: number;
  gridId: number;
  rowIndex: number;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string | null;
  cells?: FormSubmissionGridCellDto[];
}

export interface CreateFormSubmissionGridRowDto {
  submissionId: number;
  gridId: number;
  rowIndex: number;
  isActive?: boolean;
}

export interface UpdateFormSubmissionGridRowDto {
  rowIndex?: number;
  isActive?: boolean;
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
}

export interface BulkGridCellDto {
  columnId: number;
  cellValue: string;
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

// ===== API Response Wrapper =====
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

