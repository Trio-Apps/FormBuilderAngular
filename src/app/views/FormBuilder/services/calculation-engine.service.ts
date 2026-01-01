import { Injectable } from '@angular/core';
import { FormulasService, CalculateExpressionRequest } from './formulas.service';
import { FormFieldDto } from '../form-builder/models/form-builder-dto.model';

export interface FieldValueMap {
  [fieldCode: string]: number | string | null | undefined;
}

export interface CalculationResult {
  success: boolean;
  value: number | string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalculationEngineService {

  constructor(private formulasService: FormulasService) {}

  /**
   * Extract field codes from expression text
   */
  extractFieldCodes(expressionText: string): string[] {
    if (!expressionText) return [];
    
    // Match field codes in square brackets: [FIELD_CODE]
    const fieldCodePattern = /\[([A-Za-z0-9_]+)\]/g;
    const matches = expressionText.matchAll(fieldCodePattern);
    const fieldCodes = Array.from(matches, (match: RegExpMatchArray) => match[1]);
    
    // Remove duplicates
    return [...new Set(fieldCodes)];
  }

  /**
   * Build field values map from form values and field definitions
   */
  buildFieldValuesMap(
    fieldValues: { [fieldCode: string]: any },
    fields: FormFieldDto[]
  ): FieldValueMap {
    const result: FieldValueMap = {};
    
    // Add values from fieldValues (form control values)
    Object.keys(fieldValues).forEach(key => {
      const value = fieldValues[key];
      if (value !== null && value !== undefined && value !== '') {
        // Try to find field by code or ID
        const field = fields.find(f => f.fieldCode === key || String(f.id) === key);
        if (field) {
          result[field.fieldCode] = this.convertValue(value, field);
        } else {
          // Use key as field code if field not found
          result[key] = this.convertValue(value);
        }
      }
    });
    
    return result;
  }

  /**
   * Convert form value to number or string based on field type
   */
  private convertValue(value: any, field?: FormFieldDto): number | string {
    if (value === null || value === undefined || value === '') {
      return 0; // Default to 0 for calculations
    }
    
    // If field is provided, check its type
    if (field) {
      const fieldType = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
      const dataType = (field.fieldType?.dataType || '').toLowerCase();
      
      // Number types
      if (fieldType.includes('number') || fieldType.includes('numeric') || 
          dataType === 'int' || dataType === 'decimal' || dataType === 'number') {
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      }
    }
    
    // Try to convert to number
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }
    
    // Return as string
    return String(value);
  }

  /**
   * Calculate expression value
   */
  async calculateExpression(
    expressionText: string,
    fieldValues: FieldValueMap
  ): Promise<CalculationResult> {
    if (!expressionText || !expressionText.trim()) {
      return {
        success: false,
        value: 0,
        error: 'Expression text is required'
      };
    }

    try {
      const request: CalculateExpressionRequest = {
        expressionText: expressionText.trim(),
        fieldValues: this.prepareFieldValues(fieldValues)
      };

      const response = await this.formulasService.calculateExpression(request).toPromise();
      
      if (response && response.success) {
        return {
          success: true,
          value: response.data
        };
      } else {
        return {
          success: false,
          value: 0,
          error: 'Calculation failed'
        };
      }
    } catch (error: any) {
      console.error('Error calculating expression:', error);
      return {
        success: false,
        value: 0,
        error: error?.message || 'Error calculating expression'
      };
    }
  }

  /**
   * Calculate expression safely (with error handling)
   */
  async calculateExpressionSafe(
    expressionText: string,
    fieldValues: FieldValueMap
  ): Promise<CalculationResult> {
    if (!expressionText || !expressionText.trim()) {
      return {
        success: false,
        value: 0,
        error: 'Expression text is required'
      };
    }

    try {
      const request: CalculateExpressionRequest = {
        expressionText: expressionText.trim(),
        fieldValues: this.prepareFieldValues(fieldValues)
      };

      const response = await this.formulasService.calculateSafe(request).toPromise();
      
      if (response && response.success) {
        return {
          success: true,
          value: response.data
        };
      } else {
        return {
          success: false,
          value: 0,
          error: 'Calculation failed'
        };
      }
    } catch (error: any) {
      console.error('Error calculating expression safely:', error);
      return {
        success: false,
        value: 0,
        error: error?.message || 'Error calculating expression'
      };
    }
  }

  /**
   * Prepare field values for API request (convert null/undefined to 0)
   */
  private prepareFieldValues(fieldValues: FieldValueMap): { [fieldCode: string]: number | string } {
    const result: { [fieldCode: string]: number | string } = {};
    
    Object.keys(fieldValues).forEach(fieldCode => {
      const value = fieldValues[fieldCode];
      if (value === null || value === undefined || value === '') {
        result[fieldCode] = 0;
      } else {
        result[fieldCode] = value;
      }
    });
    
    return result;
  }

  /**
   * Calculate all calculated fields for a form
   */
  async calculateAllFields(
    fields: FormFieldDto[],
    fieldValues: { [fieldCode: string]: any }
  ): Promise<{ [fieldCode: string]: number | string }> {
    const results: { [fieldCode: string]: number | string } = {};
    const calculatedFields = fields.filter(f => 
      f.expressionText && 
      (f.fieldTypeName?.toLowerCase() === 'calculated' || 
       f.fieldType?.typeName?.toLowerCase() === 'calculated')
    );

    const fieldValuesMap = this.buildFieldValuesMap(fieldValues, fields);

    // Calculate each field sequentially to handle dependencies
    for (const field of calculatedFields) {
      if (!field.fieldCode || !field.expressionText) continue;

      try {
        const result = await this.calculateExpressionSafe(field.expressionText, fieldValuesMap);
        if (result.success) {
          results[field.fieldCode] = result.value;
          // Update fieldValuesMap with calculated value for dependent calculations
          fieldValuesMap[field.fieldCode] = result.value;
        }
      } catch (error) {
        console.error(`Error calculating field ${field.fieldCode}:`, error);
        results[field.fieldCode] = 0;
      }
    }

    return results;
  }

  /**
   * Check if a field is a calculated field
   */
  isCalculatedField(field: FormFieldDto): boolean {
    return !!(field.expressionText && 
      (field.fieldTypeName?.toLowerCase() === 'calculated' || 
       field.fieldType?.typeName?.toLowerCase() === 'calculated'));
  }

  /**
   * Get calculated fields that depend on a specific field code
   */
  getDependentCalculatedFields(
    fieldCode: string,
    calculatedFields: FormFieldDto[]
  ): FormFieldDto[] {
    return calculatedFields.filter(field => {
      if (!field.expressionText) return false;
      const dependentCodes = this.extractFieldCodes(field.expressionText);
      return dependentCodes.includes(fieldCode);
    });
  }
}

