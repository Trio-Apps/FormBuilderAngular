import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Formula DTOs ====================

export interface FormulaDto {
  id: number;
  formBuilderId: number;
  formBuilderName?: string;
  name: string;
  code: string;
  expressionText: string;
  resultFieldId?: number;
  resultFieldName?: string;
  resultFieldCode?: string;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string | null;
  variableCount?: number;
  variables?: FormulaVariableDto[];
}

export interface CreateFormulaDto {
  formBuilderId: number;
  name: string;
  code: string;
  expressionText: string;
  resultFieldId?: number;
  isActive?: boolean;
}

export interface UpdateFormulaDto {
  name?: string;
  code?: string;
  expressionText?: string;
  resultFieldId?: number;
  isActive?: boolean;
}

export interface FormulaVariableDto {
  id: number;
  formulaId: number;
  variableName: string;
  sourceFieldId: number;
  fieldCode: string;
  fieldName: string;
}

// ==================== Calculation Request/Response DTOs ====================

export interface CalculateExpressionRequest {
  expressionText: string;
  fieldValues: { [fieldCode: string]: number | string };
}

export interface CalculateExpressionResponse {
  success: boolean;
  data: number | string;
  statusCode: number;
}

export interface ValidateExpressionRequest {
  expressionText: string;
  formBuilderId: number;
}

export interface ValidateExpressionResponse {
  success: boolean;
  data: {
    isValid: boolean;
    validFieldCodes: string[];
    invalidFieldCodes: string[];
    fieldDetails?: FieldDetailDto[];
  };
  statusCode: number;
}

export interface FieldDetailDto {
  fieldId: number;
  fieldCode: string;
  fieldName: string;
  fieldType: string;
  tabName: string;
  formBuilderId: number;
  formBuilderName: string;
  isActive: boolean;
}

export interface PreviewCalculationRequest {
  expressionText: string;
  formBuilderId: number;
  fieldValues: { [fieldCode: string]: number | string };
}

export interface PreviewCalculationResponse {
  success: boolean;
  data: {
    result: number | string;
    expressionText: string;
    processedExpression: string;
  };
  statusCode: number;
}

export interface BatchCalculateRequest {
  [fieldCode: string]: number | string;
}

export interface BatchCalculateResponse {
  success: boolean;
  data: { [formulaId: string]: number | string };
  statusCode: number;
}

export interface FormulaStatistics {
  totalFormulas: number;
  activeFormulas: number;
  inactiveFormulas: number;
  formulasWithResultField: number;
  formulasWithoutResultField: number;
  totalVariables: number;
  averageVariablesPerFormula: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormulasService {
  private baseUrl = `${environment.apiUrl}/Formulas`;

  constructor(private http: HttpClient) {}

  // ==================== Calculate Expression Endpoints ====================

  /**
   * Calculate a simple expression
   * POST /api/Formulas/calculate-expression
   */
  calculateExpression(request: CalculateExpressionRequest): Observable<CalculateExpressionResponse> {
    return this.http.post<CalculateExpressionResponse>(`${this.baseUrl}/calculate-expression`, request).pipe(
      catchError(error => {
        console.error('Error calculating expression:', error);
        return of({
          success: false,
          data: 0,
          statusCode: error?.status || 500
        } as CalculateExpressionResponse);
      })
    );
  }

  /**
   * Calculate expression safely (with error handling)
   * POST /api/Formulas/calculate-safe
   */
  calculateSafe(request: CalculateExpressionRequest): Observable<CalculateExpressionResponse> {
    console.log(`[FormulasService] calculateSafe - Request URL: ${this.baseUrl}/calculate-safe`);
    console.log(`[FormulasService] calculateSafe - Request body:`, JSON.stringify(request, null, 2));
    
    return this.http.post<any>(`${this.baseUrl}/calculate-safe`, request).pipe(
      map(response => {
        console.log(`[FormulasService] calculateSafe - Raw response:`, response);
        console.log(`[FormulasService] calculateSafe - Response type:`, typeof response);
        
        // Handle different response formats
        let result: CalculateExpressionResponse;
        
        if (typeof response === 'number' || typeof response === 'string') {
          // API returns result directly as number or string
          console.log(`[FormulasService] calculateSafe - Response is direct value:`, response);
          result = {
            success: true,
            data: response,
            statusCode: 200
          };
        } else if (response && typeof response === 'object') {
          // API returns object with success/data structure
          if (response.success !== undefined) {
            result = {
              success: response.success,
              data: response.data || response.result || response,
              statusCode: response.statusCode || 200
            };
          } else if (response.data !== undefined) {
            // Response wrapped in data property
            result = {
              success: true,
              data: response.data,
              statusCode: response.statusCode || 200
            };
          } else {
            // Response is the result itself
            result = {
              success: true,
              data: response,
              statusCode: 200
            };
          }
        } else {
          // Unknown format
          result = {
            success: false,
            data: 0,
            statusCode: 500
          };
        }
        
        console.log(`[FormulasService] calculateSafe - Processed response:`, JSON.stringify(result, null, 2));
        return result;
      }),
      catchError(error => {
        console.error('[FormulasService] Error calculating expression safely:', error);
        console.error('[FormulasService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          errorString: typeof error?.error === 'string' ? error.error : JSON.stringify(error?.error),
          message: error?.message,
          url: error?.url,
          requestBody: error?.config?.data ? JSON.parse(error.config.data) : null
        });
        
        // Extract error message from different possible locations
        let errorMessage = 'Calculation failed';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          } else {
            errorMessage = JSON.stringify(error.error);
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        return of({
          success: false,
          data: 0,
          statusCode: error?.status || 500,
          error: errorMessage
        } as CalculateExpressionResponse);
      })
    );
  }

  /**
   * Calculate expression with advanced operations
   * POST /api/Formulas/calculate-advanced
   */
  calculateAdvanced(request: CalculateExpressionRequest): Observable<CalculateExpressionResponse> {
    return this.http.post<CalculateExpressionResponse>(`${this.baseUrl}/calculate-advanced`, request).pipe(
      catchError(error => {
        console.error('Error calculating advanced expression:', error);
        return of({
          success: false,
          data: 0,
          statusCode: error?.status || 500
        } as CalculateExpressionResponse);
      })
    );
  }

  /**
   * Calculate formula by ID
   * POST /api/Formulas/{formulaId}/calculate
   */
  calculateFormulaById(formulaId: number, fieldValues: { [fieldCode: string]: number | string }): Observable<CalculateExpressionResponse> {
    return this.http.post<CalculateExpressionResponse>(`${this.baseUrl}/${formulaId}/calculate`, fieldValues).pipe(
      catchError(error => {
        console.error(`Error calculating formula ${formulaId}:`, error);
        return of({
          success: false,
          data: 0,
          statusCode: error?.status || 500
        } as CalculateExpressionResponse);
      })
    );
  }

  /**
   * Batch calculate all formulas for a form builder
   * POST /api/Formulas/form-builder/{formBuilderId}/batch-calculate
   */
  batchCalculate(formBuilderId: number, fieldValues: BatchCalculateRequest): Observable<BatchCalculateResponse> {
    return this.http.post<BatchCalculateResponse>(`${this.baseUrl}/form-builder/${formBuilderId}/batch-calculate`, fieldValues).pipe(
      catchError(error => {
        console.error(`Error batch calculating formulas for form ${formBuilderId}:`, error);
        return of({
          success: false,
          data: {},
          statusCode: error?.status || 500
        } as BatchCalculateResponse);
      })
    );
  }

  /**
   * Preview calculation result
   * POST /api/Formulas/preview-calculation
   */
  previewCalculation(request: PreviewCalculationRequest): Observable<PreviewCalculationResponse> {
    return this.http.post<PreviewCalculationResponse>(`${this.baseUrl}/preview-calculation`, request).pipe(
      catchError(error => {
        console.error('Error previewing calculation:', error);
        return of({
          success: false,
          data: {
            result: 0,
            expressionText: request.expressionText,
            processedExpression: ''
          },
          statusCode: error?.status || 500
        } as PreviewCalculationResponse);
      })
    );
  }

  /**
   * Test formula with sample data
   * GET /api/Formulas/{formulaId}/test-with-samples
   */
  testFormulaWithSamples(formulaId: number): Observable<CalculateExpressionResponse> {
    return this.http.get<CalculateExpressionResponse>(`${this.baseUrl}/${formulaId}/test-with-samples`).pipe(
      catchError(error => {
        console.error(`Error testing formula ${formulaId}:`, error);
        return of({
          success: false,
          data: 0,
          statusCode: error?.status || 500
        } as CalculateExpressionResponse);
      })
    );
  }

  // ==================== Validate Expression Endpoints ====================

  /**
   * Validate expression syntax and field codes
   * POST /api/Formulas/validate-expression
   */
  validateExpression(request: ValidateExpressionRequest): Observable<ValidateExpressionResponse> {
    return this.http.post<ValidateExpressionResponse>(`${this.baseUrl}/validate-expression`, request).pipe(
      catchError(error => {
        console.error('Error validating expression:', error);
        return of({
          success: false,
          data: {
            isValid: false,
            validFieldCodes: [],
            invalidFieldCodes: [],
            fieldDetails: []
          },
          statusCode: error?.status || 500
        } as ValidateExpressionResponse);
      })
    );
  }

  /**
   * Validate expression with detailed field information
   * POST /api/Formulas/validate-expression-with-details
   */
  validateExpressionWithDetails(request: ValidateExpressionRequest): Observable<ValidateExpressionResponse> {
    return this.http.post<ValidateExpressionResponse>(`${this.baseUrl}/validate-expression-with-details`, request).pipe(
      catchError(error => {
        console.error('Error validating expression with details:', error);
        return of({
          success: false,
          data: {
            isValid: false,
            validFieldCodes: [],
            invalidFieldCodes: [],
            fieldDetails: []
          },
          statusCode: error?.status || 500
        } as ValidateExpressionResponse);
      })
    );
  }

  // ==================== Formula CRUD Endpoints ====================

  /**
   * Create a new formula
   * POST /api/Formulas
   */
  createFormula(dto: CreateFormulaDto): Observable<FormulaDto> {
    return this.http.post<any>(`${this.baseUrl}`, dto).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response.data) {
          return response.data;
        }
        return response;
      }),
      catchError(error => {
        console.error('Error creating formula:', error);
        throw error;
      })
    );
  }

  /**
   * Get formula by ID
   * GET /api/Formulas/{id}
   */
  getFormulaById(id: number): Observable<FormulaDto> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response.data) {
          return response.data;
        }
        return response;
      }),
      catchError(error => {
        console.error(`Error getting formula ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get formulas by form builder ID
   * GET /api/Formulas/form-builder/{formBuilderId}
   */
  getFormulasByFormBuilder(formBuilderId: number): Observable<FormulaDto[]> {
    return this.http.get<any>(`${this.baseUrl}/form-builder/${formBuilderId}`).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (Array.isArray(response)) {
          return response;
        }
        if (response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error getting formulas for form ${formBuilderId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Update formula
   * PUT /api/Formulas/{id}
   */
  updateFormula(id: number, dto: UpdateFormulaDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, dto).pipe(
      catchError(error => {
        console.error(`Error updating formula ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete formula
   * DELETE /api/Formulas/{id}
   */
  deleteFormula(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Error deleting formula ${id}:`, error);
        throw error;
      })
    );
  }

  // ==================== Utility Endpoints ====================

  /**
   * Get referenced field codes for a formula
   * GET /api/Formulas/{id}/referenced-field-codes
   */
  getReferencedFieldCodes(formulaId: number): Observable<string[]> {
    return this.http.get<any>(`${this.baseUrl}/${formulaId}/referenced-field-codes`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        if (response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error getting referenced field codes for formula ${formulaId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get field codes for a form builder
   * GET /api/Formulas/form-builder/{formBuilderId}/field-codes
   */
  getFieldCodesForForm(formBuilderId: number): Observable<string[]> {
    return this.http.get<any>(`${this.baseUrl}/form-builder/${formBuilderId}/field-codes`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        if (response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error getting field codes for form ${formBuilderId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get formula statistics for a form builder
   * GET /api/Formulas/form-builder/{formBuilderId}/statistics
   */
  getFormulaStatistics(formBuilderId: number): Observable<FormulaStatistics> {
    return this.http.get<any>(`${this.baseUrl}/form-builder/${formBuilderId}/statistics`).pipe(
      map((response: any) => {
        if (response.data) {
          return response.data;
        }
        return response;
      }),
      catchError(error => {
        console.error(`Error getting formula statistics for form ${formBuilderId}:`, error);
        return of({
          totalFormulas: 0,
          activeFormulas: 0,
          inactiveFormulas: 0,
          formulasWithResultField: 0,
          formulasWithoutResultField: 0,
          totalVariables: 0,
          averageVariablesPerFormula: 0
        } as FormulaStatistics);
      })
    );
  }
}

