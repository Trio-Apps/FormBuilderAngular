import { FormGridDto, FormGridColumnDto } from '../form-builder/models/grid-dto.model';

/**
 * Grid Rules Utilities
 * Helper functions for Grid validation and rules processing
 */

export class GridRulesUtils {

  /**
   * Validate grid minimum rows rule
   */
  static validateMinRows(grid: FormGridDto, currentRows: number): ValidationResult {
    if (grid.minRows && currentRows < grid.minRows) {
      return {
        isValid: false,
        message: `Grid requires at least ${grid.minRows} rows. Currently has ${currentRows}.`,
        rule: 'minRows'
      };
    }
    return { isValid: true, rule: 'minRows' };
  }

  /**
   * Validate grid maximum rows rule
   */
  static validateMaxRows(grid: FormGridDto, currentRows: number): ValidationResult {
    if (grid.maxRows && currentRows > grid.maxRows) {
      return {
        isValid: false,
        message: `Grid allows maximum ${grid.maxRows} rows. Currently has ${currentRows}.`,
        rule: 'maxRows'
      };
    }
    return { isValid: true, rule: 'maxRows' };
  }

  /**
   * Check if adding a new row is allowed
   */
  static canAddRow(grid: FormGridDto, currentRows: number): ValidationResult {
    if (grid.maxRows && currentRows >= grid.maxRows) {
      return {
        isValid: false,
        message: `Cannot add more rows. Grid allows maximum ${grid.maxRows} rows.`,
        rule: 'maxRows'
      };
    }
    return { isValid: true, rule: 'maxRows' };
  }

  /**
   * Check if column is visible based on rules
   */
  static isColumnVisible(column: FormGridColumnDto): boolean {
    // Basic visibility check - can be extended with complex rules
    return column.isVisible !== false;
  }

  /**
   * Check if column is read-only
   */
  static isColumnReadOnly(column: FormGridColumnDto): boolean {
    return column.isReadOnly === true;
  }

  /**
   * Get visible columns only
   */
  static getVisibleColumns(columns: FormGridColumnDto[]): FormGridColumnDto[] {
    return columns.filter(column => this.isColumnVisible(column));
  }

  /**
   * Get required columns
   */
  static getRequiredColumns(columns: FormGridColumnDto[]): FormGridColumnDto[] {
    return columns.filter(column => column.isRequired);
  }

  /**
   * Get read-only columns
   */
  static getReadOnlyColumns(columns: FormGridColumnDto[]): FormGridColumnDto[] {
    return columns.filter(column => this.isColumnReadOnly(column));
  }

  /**
   * Validate row data against column rules
   */
  static validateRowData(columns: FormGridColumnDto[], rowData: any): RowValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const requiredColumns = this.getRequiredColumns(columns);

    // Check required fields
    requiredColumns.forEach(column => {
      const value = rowData[column.columnCode];
      if (this.isEmptyValue(value)) {
        errors.push({
          field: column.columnCode,
          message: `${column.columnName} is required`,
          columnId: column.id
        });
      }
    });

    // Check data types
    columns.forEach(column => {
      const value = rowData[column.columnCode];
      if (!this.isEmptyValue(value)) {
        const typeValidation = this.validateDataType(value, column.dataType, column);
        if (!typeValidation.isValid) {
          if (typeValidation.isWarning) {
            warnings.push({
              field: column.columnCode,
              message: typeValidation.message || 'Data type warning',
              columnId: column.id
            });
          } else {
            errors.push({
              field: column.columnCode,
              message: typeValidation.message || 'Invalid data type',
              columnId: column.id
            });
          }
        }
      }
    });

    // Check column-specific validation rules
    columns.forEach(column => {
      if (column.validationRules) {
        const ruleValidation = this.validateColumnRules(column, rowData[column.columnCode]);
        if (!ruleValidation.isValid) {
          errors.push({
            field: column.columnCode,
            message: ruleValidation.message || 'Validation rule failed',
            columnId: column.id
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data type
   */
  static validateDataType(value: any, dataType: string, column?: FormGridColumnDto): DataTypeValidationResult {
    if (!dataType) return { isValid: true };

    switch (dataType.toLowerCase()) {
      case 'number':
      case 'numeric':
        if (isNaN(Number(value))) {
          return {
            isValid: false,
            message: `${column?.columnName || 'Field'} must be a valid number`
          };
        }
        return { isValid: true };

      case 'date':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          return {
            isValid: false,
            message: `${column?.columnName || 'Field'} must be a valid date`
          };
        }
        return { isValid: true };

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 1 && value !== 0) {
          return {
            isValid: false,
            message: `${column?.columnName || 'Field'} must be true or false`
          };
        }
        return { isValid: true };

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            isValid: false,
            message: `${column?.columnName || 'Field'} must be a valid email address`
          };
        }
        return { isValid: true };

      case 'select':
      case 'dropdown':
        // For select fields, value should exist in options (if options are available)
        // This would need to be checked against actual options
        return { isValid: true };

      default:
        // text and other types are always valid
        return { isValid: true };
    }
  }

  /**
   * Validate column-specific rules (from validationRules JSON)
   */
  static validateColumnRules(column: FormGridColumnDto, value: any): ValidationResult {
    if (!column.validationRules) {
      return { isValid: true };
    }

    try {
      const rules = JSON.parse(column.validationRules);

      // Check maxLength
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        return {
          isValid: false,
          message: `${column.columnName} cannot exceed ${rules.maxLength} characters`
        };
      }

      // Check minLength
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        return {
          isValid: false,
          message: `${column.columnName} must be at least ${rules.minLength} characters`
        };
      }

      // Check min value (for numbers)
      if (rules.min !== undefined && !isNaN(Number(value)) && Number(value) < rules.min) {
        return {
          isValid: false,
          message: `${column.columnName} must be at least ${rules.min}`
        };
      }

      // Check max value (for numbers)
      if (rules.max !== undefined && !isNaN(Number(value)) && Number(value) > rules.max) {
        return {
          isValid: false,
          message: `${column.columnName} cannot exceed ${rules.max}`
        };
      }

      // Check pattern (regex)
      if (rules.pattern && typeof value === 'string') {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          return {
            isValid: false,
            message: rules.patternMessage || `${column.columnName} format is invalid`
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      console.warn(`Invalid validation rules for column ${column.columnName}:`, error);
      return { isValid: true }; // Don't fail validation due to malformed rules
    }
  }

  /**
   * Apply default values to row data
   */
  static applyDefaultValues(columns: FormGridColumnDto[], rowData: any): any {
    const result = { ...rowData };

    columns.forEach(column => {
      if (column.defaultValue && this.isEmptyValue(result[column.columnCode])) {
        // Handle different types of default values
        if (typeof column.defaultValue === 'string') {
          // Check if it's a special default value
          switch (column.defaultValue.toLowerCase()) {
            case 'current_user':
              result[column.columnCode] = 'system'; // TODO: Get from auth service
              break;
            case 'current_date':
              result[column.columnCode] = new Date().toISOString().split('T')[0];
              break;
            case 'current_datetime':
              result[column.columnCode] = new Date().toISOString();
              break;
            default:
              result[column.columnCode] = column.defaultValue;
          }
        } else {
          result[column.columnCode] = column.defaultValue;
        }
      }
    });

    return result;
  }

  /**
   * Check if value is empty
   */
  private static isEmptyValue(value: any): boolean {
    return value === null || value === undefined || value === '';
  }

  /**
   * Get grid summary statistics
   */
  static getGridSummary(grid: FormGridDto, rows: any[], columns: FormGridColumnDto[]) {
    const visibleColumns = this.getVisibleColumns(columns);
    const requiredColumns = this.getRequiredColumns(columns);

    return {
      totalRows: rows.length,
      activeRows: rows.filter(row => row.isActive !== false).length,
      visibleColumns: visibleColumns.length,
      requiredColumns: requiredColumns.length,
      totalColumns: columns.length,
      readOnlyColumns: this.getReadOnlyColumns(columns).length
    };
  }
}

// ===== Type Definitions =====

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  rule?: string;
}

export interface DataTypeValidationResult extends ValidationResult {
  isWarning?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  columnId?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  columnId?: number;
}

export interface RowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
