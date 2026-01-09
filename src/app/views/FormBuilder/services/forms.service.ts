import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormBuilderDto,
  CreateFormBuilderDto,
  UpdateFormBuilderDto,
  FormRule,
  ApiResponse
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
        
        // If 404, the form doesn't exist - try alternatives but don't spam logs
        if (error?.status === 404) {
          console.warn('[FormsService] Form not found (404) - trying alternative endpoints');
        }
        
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
    console.warn('[FormsService] ⚠️ All direct endpoints failed. Trying to search in forms list as last resort.');
    console.warn('[FormsService] This may indicate that the backend endpoint "/api/FormBuilder/code/{formCode}" is not implemented.');
    
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
          
          // Check if form is published and active
          if (foundForm.isPublished !== true || foundForm.isActive !== true) {
            console.warn('[FormsService] Form found but not published or active:', {
              formCode: foundForm.formCode,
              isPublished: foundForm.isPublished,
              isActive: foundForm.isActive
            });
            // Still return the form, but the caller should check isPublished/isActive
          }
        } else {
          console.error('[FormsService] ❌ Form not found in list after trying all endpoints');
          console.error('[FormsService] Tried endpoints:', [
            `${this.baseUrl}/code/${encodeURIComponent(formCode)}`,
            `${this.baseUrl}/by-code/${encodeURIComponent(formCode)}`,
            `${this.baseUrl}/public/code/${encodeURIComponent(formCode)}`,
            'Forms list search'
          ]);
          console.warn('[FormsService] Available form codes:', 
            result.items.map(f => f.formCode).join(', '));
        }
        
        return foundForm || null;
      }),
      catchError((error) => {
        console.error('[FormsService] Forms list search failed:', error);
        
        // If search fails due to 401 (unauthorized), log a helpful message
        if (error?.status === 401) {
          console.warn('[FormsService] Unauthorized access to forms list. Form may exist but requires authentication.');
        }
        
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

  /**
   * Delete form (applies Soft Delete or Hard Delete automatically)
   * DELETE /api/FormBuilder/{id}
   * 
   * API Behavior:
   * - Soft Delete: If form has submissions, it will be deactivated (isActive = false)
   * - Hard Delete: If form has no submissions, it will be permanently deleted
   * 
   * The API response message will indicate which type of delete was performed:
   * - "Form has been deactivated successfully" = Soft Delete
   * - "Form deleted successfully" = Hard Delete
   * 
   * @param id Form ID
   * @returns Observable with ApiResponse containing success message
   */
  deleteForm(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => {
        // If API returns void/empty, create a default success response
        if (!response) {
          return {
            statusCode: 200,
            message: 'Form deleted successfully',
            data: true
          } as ApiResponse<boolean>;
        }
        return response as ApiResponse<boolean>;
      }),
      catchError((error) => {
        console.error(`[FormsService] Error deleting form ${id}:`, error);
        console.error('[FormsService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url
        });
        throw error;
      })
    );
  }

  /**
   * Toggle active status (for reactivating soft-deleted forms)
   * PATCH /api/FormBuilder/{id}/toggle-active
   * @param id Form ID
   * @param isActive Active status (true to reactivate, false to deactivate)
   * @returns Observable with updated form
   */
  /**
   * Toggle active status (for reactivating soft-deleted forms)
   * PATCH /api/FormBuilder/{id}/toggle-active
   * 
   * Tries multiple formats based on API variations:
   * 1. Object in body: { isActive: true }
   * 2. Boolean in body: true
   * 3. Query parameter: ?isActive=true
   * 4. Empty body: {}
   * 
   * @param id Form ID
   * @param isActive Active status (true to reactivate, false to deactivate)
   * @returns Observable with updated form
   */
  toggleActive(id: number, isActive: boolean): Observable<ApiResponse<FormBuilderDto>> {
    // Try Format 1: Object in body (most common)
    return this.http.patch<ApiResponse<FormBuilderDto>>(
      `${this.baseUrl}/${id}/toggle-active`,
      { isActive }
    ).pipe(
      catchError((error) => {
        // If object format fails with 400/415, try boolean format
        if (error?.status === 400 || error?.status === 415) {
          console.log(`[FormsService] Object format failed (${error?.status}), trying boolean format for form ${id}`);
          
          // Try Format 2: Boolean directly in body
          return this.http.patch<ApiResponse<FormBuilderDto>>(
            `${this.baseUrl}/${id}/toggle-active`,
            isActive
          ).pipe(
            catchError((error2) => {
              // If boolean format fails, try query parameter
              if (error2?.status === 400 || error2?.status === 415) {
                console.log(`[FormsService] Boolean format failed (${error2?.status}), trying query parameter for form ${id}`);
                
                // Try Format 3: Query parameter with null body
                return this.http.patch<ApiResponse<FormBuilderDto>>(
                  `${this.baseUrl}/${id}/toggle-active`,
                  null,
                  {
                    params: { isActive: isActive.toString() }
                  }
                ).pipe(
                  catchError((error3) => {
                    // If query parameter fails, try empty body
                    if (error3?.status === 400 || error3?.status === 415) {
                      console.log(`[FormsService] Query parameter format failed (${error3?.status}), trying empty body for form ${id}`);
                      
                      // Try Format 4: Empty body (some APIs use this)
                      return this.http.patch<ApiResponse<FormBuilderDto>>(
                        `${this.baseUrl}/${id}/toggle-active`,
                        {}
                      ).pipe(
                        catchError((error4) => {
                          // If all formats fail, try using updateForm as fallback
                          console.log(`[FormsService] All toggle-active formats failed, trying updateForm endpoint for form ${id}`);
                          
                          const updateDto: UpdateFormBuilderDto = { isActive };
                          return this.updateForm(id, updateDto).pipe(
                            map(() => {
                              // Return a mock ApiResponse since updateForm returns void
                              return {
                                statusCode: 200,
                                message: `Form ${isActive ? 'activated' : 'deactivated'} successfully`,
                                data: { id, isActive } as FormBuilderDto
                              } as ApiResponse<FormBuilderDto>;
                            }),
                            catchError((updateError) => {
                              console.error(`[FormsService] All methods failed for form ${id}`);
                              console.error('[FormsService] Final error details:', {
                                status: updateError?.status,
                                statusText: updateError?.statusText,
                                error: updateError?.error,
                                message: updateError?.message,
                                url: updateError?.url
                              });
                              throw updateError;
                            })
                          );
                        })
                      );
                    }
                    console.error(`[FormsService] Error toggling active status for form ${id}:`, error3);
                    throw error3;
                  })
                );
              }
              console.error(`[FormsService] Error toggling active status for form ${id}:`, error2);
              throw error2;
            })
          );
        }
        console.error(`[FormsService] Error toggling active status for form ${id}:`, error);
        console.error('[FormsService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url
        });
        throw error;
      })
    );
  }

  /**
   * Reactivate soft-deleted form
   * @param id Form ID
   * @returns Observable with reactivated form
   */
  reactivateForm(id: number): Observable<ApiResponse<FormBuilderDto>> {
    return this.toggleActive(id, true);
  }

  /**
   * Deactivate form (soft delete)
   * @param id Form ID
   * @returns Observable with deactivated form
   */
  deactivateForm(id: number): Observable<ApiResponse<FormBuilderDto>> {
    return this.toggleActive(id, false);
  }

  /**
   * Duplicate form - creates a copy of the form with all tabs and fields
   * POST /api/FormBuilder/{id}/duplicate
   */
  duplicateForm(id: number): Observable<FormBuilderDto> {
    return this.http.post<FormBuilderDto>(`${this.baseUrl}/${id}/duplicate`, {}).pipe(
      catchError((error) => {
        console.error(`[FormsService] Error duplicating form ${id}:`, error);
        throw error;
      })
    );
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
