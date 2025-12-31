import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormBuilderDto,
  CreateFormBuilderDto,
  UpdateFormBuilderDto,
  FormRule
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  private baseUrl = `${environment.apiUrl}/FormBuilder`;

  constructor(private http: HttpClient) {}

  getForms(page: number = 1, pageSize: number = 20): Observable<PagedResult<FormBuilderDto>> {
    return this.http
      .get<PagedResult<FormBuilderDto>>(`${this.baseUrl}?page=${page}&pageSize=${pageSize}`)
      .pipe(
        catchError(() => {
          return of({
            items: [],
            totalCount: 0,
            page,
            pageSize,
            totalPages: 0,
            hasPrevious: false,
            hasNext: false
          });
        })
      );
  }

  getFormById(id: number): Observable<FormBuilderDto> {
    return this.http.get<FormBuilderDto>(`${this.baseUrl}/${id}`);
  }

  // Get form by formCode (public code)
  // Primary endpoint: /api/FormBuilder/code/{formCode}
  getFormByCode(formCode: string): Observable<FormBuilderDto | null> {
    if (!formCode) {
      console.warn('[FormsService] Empty formCode provided');
      return of(null);
    }

    // Normalize formCode: trim whitespace and handle case
    const normalizedCode = formCode.trim();
    const encodedCode = encodeURIComponent(normalizedCode);
    
    console.log('[FormsService] Fetching form by code:', {
      original: formCode,
      normalized: normalizedCode,
      encoded: encodedCode,
      url: `${this.baseUrl}/code/${encodedCode}`
    });
    
    // Primary endpoint that works: /api/FormBuilder/code/{formCode}
    return this.http.get<FormBuilderDto>(`${this.baseUrl}/code/${encodedCode}`).pipe(
      map(response => {
        console.log('[FormsService] Primary endpoint response:', response);
        
        if (!response) {
          console.warn('[FormsService] Response is null or undefined');
          return null;
        }
        
        // Check if response has any data
        if (Object.keys(response).length === 0) {
          console.warn('[FormsService] Response is empty object');
          return null;
        }
        
        // Verify formCode matches (case-insensitive)
        if (response.formCode && response.formCode.toLowerCase() !== normalizedCode.toLowerCase()) {
          console.warn('[FormsService] FormCode mismatch in response', {
            requested: normalizedCode,
            received: response.formCode
          });
          // Still return the form as it might be a case-insensitive match
        }
        
        return response;
      }),
      catchError((error) => {
        console.error('[FormsService] Primary endpoint failed', {
          formCode: normalizedCode,
          encodedCode: encodedCode,
          url: `${this.baseUrl}/code/${encodedCode}`,
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error
        });
        
        // Try alternative endpoints only if primary fails
        return this.tryAlternativeEndpoints(encodedCode, normalizedCode);
      })
    );
  }

  // Try alternative endpoints if primary fails
  private tryAlternativeEndpoints(encodedCode: string, formCode: string): Observable<FormBuilderDto | null> {
    console.log('[FormsService] Trying alternative endpoints for:', formCode);
    
    // Alternative 1: /api/FormBuilder/by-code/{formCode}
    return this.http.get<FormBuilderDto>(`${this.baseUrl}/by-code/${encodedCode}`).pipe(
      map(response => {
        console.log('[FormsService] Alternative endpoint 1 (/by-code) response:', response);
        return response && Object.keys(response).length > 0 ? response : null;
      }),
      catchError((error) => {
        console.warn('[FormsService] Alternative endpoint 1 failed:', error?.status);
        
        // Alternative 2: /api/FormBuilder/public/code/{formCode}
        return this.http.get<FormBuilderDto>(`${this.baseUrl}/public/code/${encodedCode}`).pipe(
          map(response => {
            console.log('[FormsService] Alternative endpoint 2 (/public/code) response:', response);
            return response && Object.keys(response).length > 0 ? response : null;
          }),
          catchError((error) => {
            console.warn('[FormsService] Alternative endpoint 2 failed:', error?.status);
            
            // Alternative 3: Search in forms list
            console.log('[FormsService] Trying to search in forms list');
            return this.searchFormByCode(formCode);
          })
        );
      })
    );
  }

  // Alternative method to search for form using formCode from forms list
  private searchFormByCode(formCode: string): Observable<FormBuilderDto | null> {
    console.log('[FormsService] Searching in forms list for:', formCode);
    
    // Get all forms (or a large number) and search for the requested form
    return this.getForms(1, 1000).pipe(
      map((result: PagedResult<FormBuilderDto>) => {
        console.log('[FormsService] Forms list search result:', {
          totalCount: result.totalCount,
          itemsCount: result.items.length,
          searchingFor: formCode
        });
        
        // Search for form using formCode (case-insensitive)
        const foundForm = result.items.find(
          form => form.formCode?.toLowerCase() === formCode.toLowerCase()
        );
        
        if (foundForm) {
          console.log('[FormsService] Form found in list:', foundForm.formCode);
        } else {
          console.warn('[FormsService] Form not found in list. Available codes:', 
            result.items.map(f => f.formCode).join(', '));
        }
        
        return foundForm || null;
      }),
      catchError((error) => {
        console.error('[FormsService] Forms list search failed:', error);
        // If search fails, return null
        return of(null);
      })
    );
  }

  createForm(dto: CreateFormBuilderDto): Observable<FormBuilderDto> {
    return this.http.post<FormBuilderDto>(this.baseUrl, dto);
  }

  updateForm(id: number, dto: UpdateFormBuilderDto): Observable<void> {
    // Log the exact request body being sent
    const requestBody = JSON.stringify(dto);
    console.log('[FormsService] Updating form - Request Details:', {
      id: id,
      url: `${this.baseUrl}/${id}`,
      method: 'PUT',
      dto: dto,
      requestBody: requestBody,
      formCode: dto.formCode,
      hasFormCode: 'formCode' in dto,
      formCodeType: typeof dto.formCode,
      formCodeValue: dto.formCode,
      allKeys: Object.keys(dto)
    });
    
    return this.http.put<void>(`${this.baseUrl}/${id}`, dto).pipe(
      map(() => {
        console.log('[FormsService] Update form - Success response received');
        return;
      }),
      catchError((error) => {
        console.error('[FormsService] Update form - Error Details:', {
          id: id,
          url: `${this.baseUrl}/${id}`,
          error: error,
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          errorBody: error?.error,
          dto: dto,
          requestBody: requestBody
        });
        throw error;
      })
    );
  }

  deleteForm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ==================== Form Rules API Methods ====================

  /**
   * Get active rules for a form
   * GET /api/FormRules/form/{formId}/active
   */
  getActiveRulesByFormId(formId: number): Observable<FormRule[]> {
    return this.http.get<any>(`${environment.apiUrl}/FormRules/form/${formId}/active`).pipe(
      map((response: any) => {
        // Handle different response formats
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error(`[FormsService] Error fetching active rules for form ${formId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Validate form rules before submission
   * POST /api/FormRules/validate
   */
  validateFormRules(
    formId: number,
    fieldValues: Record<string, any>
  ): Observable<{ valid: boolean; errors: string[] }> {
    return this.http.post<any>(`${environment.apiUrl}/FormRules/validate`, {
      formBuilderId: formId, // API expects formBuilderId, not formId
      fieldValues
    }).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          return {
            valid: response.valid || false,
            errors: response.errors || []
          };
        }
        return { valid: false, errors: ['Invalid response format'] };
      }),
      catchError((error) => {
        console.error('[FormsService] Error validating form rules:', error);
        const errorMessage = error?.error?.message || error?.message || 'Validation failed';
        const errors = error?.error?.errors || [errorMessage];
        return of({
          valid: false,
          errors: Array.isArray(errors) ? errors : [errors]
        });
      })
    );
  }
}
