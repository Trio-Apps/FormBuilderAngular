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
      const preparedValues = this.prepareFieldValues(fieldValues);
      const request: CalculateExpressionRequest = {
        expressionText: expressionText.trim(),
        fieldValues: preparedValues
      };

      console.log(`[CalculationEngine] calculateExpressionSafe - Expression: "${expressionText.trim()}"`);
      console.log(`[CalculationEngine] calculateExpressionSafe - Field values:`, JSON.stringify(preparedValues, null, 2));
      console.log(`[CalculationEngine] calculateExpressionSafe - Request:`, JSON.stringify(request, null, 2));

      const response = await this.formulasService.calculateSafe(request).toPromise();
      
      console.log(`[CalculationEngine] calculateExpressionSafe - Response:`, JSON.stringify(response, null, 2));
      console.log(`[CalculationEngine] calculateExpressionSafe - Response type:`, typeof response);
      console.log(`[CalculationEngine] calculateExpressionSafe - Response success:`, response?.success);
      console.log(`[CalculationEngine] calculateExpressionSafe - Response data:`, response?.data);
      console.log(`[CalculationEngine] calculateExpressionSafe - Response statusCode:`, response?.statusCode);

      if (response && response.success) {
        console.log(`[CalculationEngine] Calculation successful! Result:`, response.data);
        return {
          success: true,
          value: response.data
        };
      } else {
        const errorMessage = (response as any)?.error || (response as any)?.message || (response as any)?.data?.error || 'Calculation failed';
        console.error(`[CalculationEngine] Calculation failed!`, {
          expressionText: expressionText.trim(),
          fieldValues: JSON.stringify(preparedValues, null, 2),
          response: JSON.stringify(response, null, 2),
          responseObject: response,
          statusCode: response?.statusCode,
          errorMessage: errorMessage
        });
        return {
          success: false,
          value: 0,
          error: errorMessage
        };
      }
    } catch (error: any) {
      console.error('[CalculationEngine] Error calculating expression safely:', error);
      console.error('[CalculationEngine] Error details:', {
        expressionText: expressionText.trim(),
        fieldValues: fieldValues,
        error: error,
        status: error?.status,
        errorMessage: error?.error || error?.message
      });
      return {
        success: false,
        value: 0,
        error: error?.error?.message || error?.error || error?.message || 'Error calculating expression'
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
    
    // Normalize expressionText from PascalCase if needed
    fields.forEach(field => {
      if (!field.expressionText && (field as any).ExpressionText) {
        field.expressionText = (field as any).ExpressionText;
      }
    });
    
    const calculatedFields = fields.filter(f => 
      this.isCalculatedField(f)
    );

    console.log(`[CalculationEngine] calculateAllFields: Found ${calculatedFields.length} calculated fields`);
    calculatedFields.forEach(f => {
      console.log(`[CalculationEngine] Field ${f.fieldCode}: expressionText="${f.expressionText}"`);
    });

    if (calculatedFields.length === 0) {
      return results;
    }

    const fieldValuesMap = this.buildFieldValuesMap(fieldValues, fields);
    console.log(`[CalculationEngine] Field values map:`, fieldValuesMap);

    // Calculate each field sequentially to handle dependencies
    for (const field of calculatedFields) {
      if (!field.fieldCode) continue;
      
      if (!field.expressionText || field.expressionText.trim() === '') {
        console.warn(`[CalculationEngine] Field ${field.fieldCode} has no expressionText, skipping calculation`);
        continue;
      }

      try {
        console.log(`[CalculationEngine] Calculating field ${field.fieldCode} with expression: ${field.expressionText}`);
        const result = await this.calculateExpressionSafe(field.expressionText, fieldValuesMap);
        if (result.success) {
          results[field.fieldCode] = result.value;
          // Update fieldValuesMap with calculated value for dependent calculations
          fieldValuesMap[field.fieldCode] = result.value;
          console.log(`[CalculationEngine] Field ${field.fieldCode} calculated successfully: ${result.value}`);
        } else {
          console.error(`[CalculationEngine] Field ${field.fieldCode} calculation failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`[CalculationEngine] Error calculating field ${field.fieldCode}:`, error);
        results[field.fieldCode] = 0;
      }
    }

    return results;
  }

  /**
   * Check if a field is a calculated field
   */
  isCalculatedField(field: FormFieldDto): boolean {
    // Check fieldTypeId first (should be 14 for Calculated based on static array)
    const isCalculatedById = field.fieldTypeId === 14;
    
    const typeNameMatch = field.fieldTypeName?.toLowerCase() === 'calculated';
    const typeMatch = field.fieldType?.typeName?.toLowerCase() === 'calculated';
    const hasExpression = !!(field.expressionText && field.expressionText.trim() !== '');
    
    // A field is calculated if:
    // 1. fieldTypeId is 14 (Calculated type from static array)
    // 2. Type name is 'Calculated' (even if expressionText is not loaded yet from API)
    // 3. OR has expressionText (for backward compatibility)
    const isCalculated = isCalculatedById || (typeNameMatch || typeMatch) || hasExpression;
    
    // Debug logging for all fields to help diagnose
    console.log(`[CalculationEngine] Checking field ${field.fieldCode}:`, {
      fieldTypeId: field.fieldTypeId,
      isCalculatedById,
      hasExpression,
      expressionText: field.expressionText,
      fieldTypeName: field.fieldTypeName,
      fieldTypeTypeName: field.fieldType?.typeName,
      typeNameMatch,
      typeMatch,
      isCalculated
    });
    
    return isCalculated;
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

