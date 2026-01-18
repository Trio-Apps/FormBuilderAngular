import { Injectable } from '@angular/core';
import { FormulasService, CalculateExpressionRequest } from './formulas.service';
import { FormFieldDto } from '../form-builder/models/form-builder-dto.model';
import { getCalculationOperationById, getRecommendedCalculationOperation } from '../constants/calculation-operations';

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
   * Validate expression syntax for common errors
   * Returns null if valid, or an error message if invalid
   */
  validateExpressionSyntax(expressionText: string): string | null {
    if (!expressionText || !expressionText.trim()) {
      return 'Expression is empty';
    }

    const trimmed = expressionText.trim();

    // Check for incomplete operators at the end
    const incompleteOperators = /[+\-*/^%]$/;
    if (incompleteOperators.test(trimmed)) {
      return `Incomplete expression: operator '${trimmed.slice(-1)}' requires a second operand. Example: Use '[FIELD1] ^ [FIELD2]' or 'POW([FIELD1], [FIELD2])' instead of '[FIELD1]^'`;
    }

    // Check for incomplete operators at the beginning (except for unary minus)
    const invalidStartOperators = /^[+*/^%]/;
    if (invalidStartOperators.test(trimmed)) {
      return `Invalid expression: cannot start with operator '${trimmed[0]}'`;
    }

    // Check for consecutive operators (except for valid cases like -- or **)
    const consecutiveOperators = /[+\-*/^%]\s*[+*/^%]/;
    if (consecutiveOperators.test(trimmed)) {
      return 'Invalid expression: consecutive operators detected';
    }

    // Check for incomplete function calls (opening parenthesis without closing)
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return 'Invalid expression: mismatched parentheses';
    }

    // Check for incomplete field references (opening bracket without closing)
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return 'Invalid expression: mismatched square brackets in field references';
    }

    return null; // Expression is valid
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
      
      // Skip null, undefined, or empty string values
      if (value === null || value === undefined || value === '') {
        return;
      }
      
      // Try to find field by code or ID
      const field = fields.find(f => f.fieldCode === key || String(f.id) === key);
      const convertedValue = field ? this.convertValue(value, field) : this.convertValue(value);
      
      // Only add non-null, non-undefined values
      if (convertedValue !== null && convertedValue !== undefined) {
        if (field && field.fieldCode) {
          result[field.fieldCode] = convertedValue;
        } else {
          // Use key as field code if field not found
          result[key] = convertedValue;
        }
      }
    });
    
    return result;
  }

  /**
   * Convert form value to number or string based on field type
   */
  private convertValue(value: any, field?: FormFieldDto): number | string | null {
    if (value === null || value === undefined || value === '') {
      return null; // Return null instead of 0 to allow filtering
    }
    
    // If field is provided, check its type
    if (field) {
      const fieldType = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
      const dataType = (field.fieldType?.dataType || '').toLowerCase();
      
      // Number types
      if (fieldType.includes('number') || fieldType.includes('numeric') || 
          dataType === 'int' || dataType === 'decimal' || dataType === 'number') {
        const numValue = Number(value);
        return isNaN(numValue) || !isFinite(numValue) ? null : numValue;
      }
    }
    
    // Try to convert to number
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }
    
    // Return as string (trim whitespace)
    const stringValue = String(value).trim();
    return stringValue === '' ? null : stringValue;
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
      // Clean expression: remove extra spaces around commas
      const cleanedExpression = this.cleanExpression(expressionText.trim());
      const request: CalculateExpressionRequest = {
        expressionText: cleanedExpression,
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
   * Calculate expression using specified operation
   */
  async calculateExpressionWithOperation(
    expressionText: string,
    fieldValues: FieldValueMap,
    operationId?: string
  ): Promise<CalculationResult> {
    if (!expressionText || !expressionText.trim()) {
      return {
        success: false,
        value: 0,
        error: 'Expression text is required'
      };
    }

    // Get operation or use default
    const operation = operationId 
      ? getCalculationOperationById(operationId) 
      : getRecommendedCalculationOperation();

    if (!operation) {
      return {
        success: false,
        value: 0,
        error: `Invalid calculation operation: ${operationId}`
      };
    }

    try {
      const preparedValues = this.prepareFieldValues(fieldValues);
      // Clean expression: remove extra spaces around commas
      const cleanedExpression = this.cleanExpression(expressionText.trim());
      const request: CalculateExpressionRequest = {
        expressionText: cleanedExpression,
        fieldValues: preparedValues
      };

      console.log(`[CalculationEngine] calculateExpressionWithOperation - Operation: ${operation.id}`);
      console.log(`[CalculationEngine] calculateExpressionWithOperation - Expression: "${cleanedExpression}"`);

      let response: any;

      // Call appropriate method based on operation
      switch (operation.method) {
        case 'calculateExpression':
          response = await this.formulasService.calculateExpression(request).toPromise();
          break;
        case 'calculateSafe':
          response = await this.formulasService.calculateSafe(request).toPromise();
          break;
        case 'calculateAdvanced':
          response = await this.formulasService.calculateAdvanced(request).toPromise();
          break;
        case 'previewCalculation':
          // For preview, we need formBuilderId, but we'll use calculateSafe as fallback
          response = await this.formulasService.calculateSafe(request).toPromise();
          break;
        default:
          response = await this.formulasService.calculateSafe(request).toPromise();
      }

      if (response && response.success) {
        return {
          success: true,
          value: response.data
        };
      } else {
        const errorMessage = (response as any)?.error || (response as any)?.message || (response as any)?.data?.error || 'Calculation failed';
        return {
          success: false,
          value: 0,
          error: errorMessage
        };
      }
    } catch (error: any) {
      console.error(`[CalculationEngine] Error calculating expression with operation ${operation.id}:`, error);
      return {
        success: false,
        value: 0,
        error: error?.error?.message || error?.error || error?.message || 'Error calculating expression'
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

    // Validate expression syntax before sending to API
    const syntaxError = this.validateExpressionSyntax(expressionText);
    if (syntaxError) {
      console.error(`[CalculationEngine] Expression syntax validation failed: ${syntaxError}`);
      return {
        success: false,
        value: 0,
        error: syntaxError
      };
    }

    try {
      const preparedValues = this.prepareFieldValues(fieldValues);
      
      // Extract field codes from expression
      const requiredFieldCodes = this.extractFieldCodes(expressionText);
      console.log(`[CalculationEngine] Required field codes in expression:`, requiredFieldCodes);
      console.log(`[CalculationEngine] Available field values:`, Object.keys(preparedValues));
      
      // Check if all required field codes are available
      const missingFieldCodes = requiredFieldCodes.filter(code => !(code in preparedValues));
      if (missingFieldCodes.length > 0) {
        console.warn(`[CalculationEngine] Missing field codes in fieldValues:`, missingFieldCodes);
        // Set missing fields to 0 for calculation
        missingFieldCodes.forEach(code => {
          preparedValues[code] = 0;
          console.log(`[CalculationEngine] Setting missing field ${code} to 0`);
        });
      }
      
      // Validate that we have at least some field values
      if (Object.keys(preparedValues).length === 0) {
        console.warn(`[CalculationEngine] No field values available for calculation`);
        return {
          success: false,
          value: 0,
          error: 'No field values available for calculation'
        };
      }
      
      // Clean expression: remove extra spaces around commas
      const cleanedExpression = this.cleanExpression(expressionText.trim());
      const request: CalculateExpressionRequest = {
        expressionText: cleanedExpression,
        fieldValues: preparedValues
      };

      console.log(`[CalculationEngine] calculateExpressionSafe - Expression: "${cleanedExpression}"`);
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
   * Clean expression text: remove extra spaces around commas and operators
   */
  private cleanExpression(expression: string): string {
    if (!expression) return expression;
    
    // Remove spaces after commas: ", " -> ","
    let cleaned = expression.replace(/,\s+/g, ',');
    
    // Remove spaces before commas: " ," -> ","
    cleaned = cleaned.replace(/\s+,/g, ',');
    
    // Remove spaces around operators but keep spaces around field codes
    // This is more complex, so we'll be conservative and only clean commas
    
    return cleaned;
  }

  /**
   * Prepare field values for API request (convert null/undefined to 0)
   * For calculated fields, only numeric values are allowed - non-numeric values are converted to 0
   */
  private prepareFieldValues(fieldValues: FieldValueMap): { [fieldCode: string]: number | string } {
    const result: { [fieldCode: string]: number | string } = {};
    
    Object.keys(fieldValues).forEach(fieldCode => {
      const value = fieldValues[fieldCode];
      const raw: any = value; // treat as any for runtime type checks (avoids TS narrowing issues)
      
      // Skip null, undefined, or empty string
      if (value === null || value === undefined || value === '') {
        // Don't include empty values - API might not handle them well
        return;
      }
      
      // Convert to number if possible
      if (typeof raw === 'number') {
        result[fieldCode] = isNaN(raw) || !isFinite(raw) ? 0 : raw;
      } else if (typeof raw === 'string') {
        // If the string looks like JSON (object/array), skip it entirely
        const trimmedValue = raw.trim();
        if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
            (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
          try {
            const parsed = JSON.parse(trimmedValue);
            // Likely a configuration object (e.g. file defaultValueJson) — skip from calculations
            console.log(`[CalculationEngine] Skipping JSON-like non-numeric value for field ${fieldCode}`);
            return;
          } catch {
            // If parse fails, fall through to numeric test
          }
        }

        // Try to convert string to number if it's a valid number
        const numValue = Number(trimmedValue);
        if (!isNaN(numValue) && isFinite(numValue) && trimmedValue !== '') {
          result[fieldCode] = numValue;
        } else {
          // Non-numeric string — skip instead of converting to 0 to reduce noisy warnings.
          // Missing fields will be set to 0 later when required by the expression.
          console.log(`[CalculationEngine] Non-numeric string for field ${fieldCode} — skipping for calculation`);
          return;
        }
      } else if (typeof raw === 'boolean') {
        // Convert boolean to number (true = 1, false = 0)
        result[fieldCode] = raw ? 1 : 0;
      } else if (typeof raw === 'object') {
        // If it's an object (e.g. parsed defaultValueJson for file config), try to detect file-config-like shape
        try {
          if (raw && (raw.allowedExtensions || raw.customExtensions)) {
            console.log(`[CalculationEngine] Skipping object value (likely file config) for field ${fieldCode}`);
            return; // skip inclusion
          }
        } catch {
          // ignore
        }

        // Try to coerce object to number, otherwise skip
        const numValue = Number(raw);
        if (!isNaN(numValue) && isFinite(numValue)) {
          result[fieldCode] = numValue;
        } else {
          console.log(`[CalculationEngine] Non-numeric object for field ${fieldCode} — skipping for calculation`);
          return;
        }
      } else {
        // For other types, try to convert to number, otherwise skip
        const numValue = Number(raw);
        if (!isNaN(numValue) && isFinite(numValue)) {
          result[fieldCode] = numValue;
        } else {
          console.log(`[CalculationEngine] Unknown non-numeric value for field ${fieldCode} — skipping for calculation`);
          return;
        }
      }
    });
    
    return result;
  }

  /**
   * Calculate all calculated fields for a form
   */
  async calculateAllFields(
    fields: FormFieldDto[],
    fieldValues: { [fieldCode: string]: any },
    calculatedFieldsToCalculate?: FormFieldDto[]
  ): Promise<{ [fieldCode: string]: number | string }> {
    const results: { [fieldCode: string]: number | string } = {};
    
    // Normalize expressionText from PascalCase if needed
    fields.forEach(field => {
      if (!field.expressionText && (field as any).ExpressionText) {
        field.expressionText = (field as any).ExpressionText;
      }
    });
    
    // Use provided calculatedFields if available, otherwise filter from fields
    const calculatedFields = calculatedFieldsToCalculate || fields.filter(f => 
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
      
      // Check if expressionText is missing, empty, or the string "null"
      const expressionText = field.expressionText?.trim() || '';
      if (!expressionText || expressionText === 'null' || expressionText === 'undefined') {
        console.warn(`[CalculationEngine] Field ${field.fieldCode} has no expressionText (value: "${field.expressionText}"), skipping calculation`);
        continue;
      }

      try {
        console.log(`[CalculationEngine] Calculating field ${field.fieldCode} with expression: ${expressionText}`);
        // Use calculationOperation if available, otherwise use default
        const operationId = field.calculationOperation;
        const result = operationId 
          ? await this.calculateExpressionWithOperation(expressionText, fieldValuesMap, operationId)
          : await this.calculateExpressionSafe(expressionText, fieldValuesMap);
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
    // First check if it's a password field - password fields should NEVER be treated as calculated
    const fieldCodeLower = (field.fieldCode || '').toLowerCase();
    const fieldNameLower = (field.fieldName || '').toLowerCase();
    const fieldTypeNameLower = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    const isPassword = fieldTypeNameLower.includes('password') || 
                       fieldCodeLower === 'password' || 
                       fieldCodeLower === 'pwd' ||
                       fieldCodeLower.includes('password') ||
                       fieldNameLower === 'password' ||
                       fieldNameLower.includes('password');
    
    if (isPassword) {
      return false; // Password fields are never calculated
    }

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
    
    // Debug logging for fields that might be calculated
    if (field.fieldCode && (field.fieldCode.toLowerCase().includes('sum') || field.fieldCode.toLowerCase().includes('calc'))) {
      console.log(`[CalculationEngine] Checking if field ${field.fieldCode} is calculated:`, {
        fieldTypeId: field.fieldTypeId,
        fieldTypeName: field.fieldTypeName,
        fieldTypeTypeName: field.fieldType?.typeName,
        isCalculatedById,
        typeNameMatch,
        typeMatch,
        hasExpression,
        isCalculated
      });
    }
    
    // Only log if it's a calculated field and expressionText is missing (for debugging)
    if (isCalculated && !hasExpression) {
      console.warn(`[CalculationEngine] Calculated field ${field.fieldCode} (ID: ${field.id}) has no expressionText`);
    }
    
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

