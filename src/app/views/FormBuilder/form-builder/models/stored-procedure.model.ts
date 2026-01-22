/**
 * Stored Procedure Models
 * Models for managing Stored Procedures in Form Rules
 */

/**
 * Stored Procedure Interface
 */
export interface StoredProcedure {
  id: number;
  title: string;
  description?: string;
  databaseName: string;
  schemaName: string;
  procedureName?: string;
  procedureCode: string;
  usageType?: string;
  isReadOnly: boolean;
  defaultParameterMapping?: string;
  defaultResultMapping?: string;
  executionOrder?: number;
  isActive: boolean;
  createdDate: Date;
  updatedDate?: Date;
}

/**
 * Create Stored Procedure DTO
 */
export interface CreateStoredProcedureDto {
  title: string;
  description?: string;
  databaseName: string;
  schemaName: string;
  procedureName?: string;
  procedureCode: string;
  usageType?: string;
  isReadOnly?: boolean;
  defaultParameterMapping?: string;
  defaultResultMapping?: string;
  executionOrder?: number;
}

/**
 * Update Stored Procedure DTO
 */
export interface UpdateStoredProcedureDto {
  title?: string;
  description?: string;
  databaseName?: string;
  schemaName?: string;
  procedureName?: string;
  procedureCode?: string;
  usageType?: string;
  isReadOnly?: boolean;
  defaultParameterMapping?: string;
  defaultResultMapping?: string;
  executionOrder?: number;
  isActive?: boolean;
}

/**
 * Parameter Mapping Structure
 */
export interface ParameterMapping {
  [key: string]: string; // Parameter name -> Field code
}

/**
 * Result Mapping Structure
 */
export interface ResultMapping {
  resultColumn: string;
  trueValue: number | string;
  falseValue: number | string;
}

