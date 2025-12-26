import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormRule,
  FormRuleDto,
  CreateFormRuleDto,
  UpdateFormRuleDto,
  ApiResponse,
  convertFormRuleDtoToFormRule,
  convertFormRuleToDto
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormRulesService {
  private baseUrl = `${environment.apiUrl}/FormRules`;

  constructor(private http: HttpClient) {}

  /**
   * GET - جلب جميع Rules
   */
  getAllRules(): Observable<FormRule[]> {
    return this.http.get<ApiResponse<FormRuleDto[]>>(this.baseUrl).pipe(
      map((response: ApiResponse<FormRuleDto[]>) => {
        const dtos = response.data || [];
        return dtos.map(dto => convertFormRuleDtoToFormRule(dto));
      }),
      catchError((error) => {
        console.error('[FormRulesService] Error fetching all rules:', error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Rule بالـ ID
   */
  getRuleById(id: number): Observable<FormRule | null> {
    return this.http.get<ApiResponse<FormRuleDto>>(`${this.baseUrl}/${id}`).pipe(
      map((response: ApiResponse<FormRuleDto>) => {
        if (!response.data) return null;
        return convertFormRuleDtoToFormRule(response.data);
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching rule ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - جلب جميع Rules لنموذج معين (using formBuilderId)
   * ✅ Updated: Handles both ApiResponse wrapper and direct FormRuleDto[] response
   */
  getRulesByFormId(formBuilderId: number): Observable<FormRule[]> {
    console.log(`[FormRulesService] Fetching rules for form ${formBuilderId}`);
    return this.http.get<any>(`${this.baseUrl}/form/${formBuilderId}`).pipe(
      map((response: any) => {
        console.log(`[FormRulesService] Raw response for form ${formBuilderId}:`, response);
        console.log(`[FormRulesService] Response type:`, typeof response);
        console.log(`[FormRulesService] Is array:`, Array.isArray(response));
        
        let dtos: FormRuleDto[] = [];
        
        // Case 1: ApiResponse wrapper with data property
        if (response && typeof response === 'object' && 'data' in response) {
          console.log(`[FormRulesService] Found ApiResponse wrapper with data`);
          dtos = Array.isArray(response.data) ? response.data : [];
        }
        // Case 2: Direct array of FormRuleDto
        else if (Array.isArray(response)) {
          console.log(`[FormRulesService] Found direct array of FormRuleDto`);
          dtos = response;
        }
        // Case 3: Single object (shouldn't happen but handle it)
        else if (response && typeof response === 'object' && 'id' in response) {
          console.log(`[FormRulesService] Found single FormRuleDto, converting to array`);
          dtos = [response as FormRuleDto];
        }
        
        console.log(`[FormRulesService] Extracted ${dtos.length} DTOs:`, dtos);
        const rules = dtos.map(dto => {
          try {
            return convertFormRuleDtoToFormRule(dto);
          } catch (error) {
            console.error(`[FormRulesService] Error converting DTO to FormRule:`, dto, error);
            return null;
          }
        }).filter((rule): rule is FormRule => rule !== null);
        
        console.log(`[FormRulesService] Converted to ${rules.length} FormRules:`, rules);
        return rules;
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching rules for form ${formBuilderId}:`, error);
        console.error(`[FormRulesService] Error details:`, {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message
        });
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Rules النشطة فقط لنموذج معين (using formBuilderId)
   * ✅ Updated: Handles both ApiResponse wrapper and direct FormRuleDto[] response
   */
  getActiveRulesByFormId(formBuilderId: number): Observable<FormRule[]> {
    console.log(`[FormRulesService] Fetching active rules for form ${formBuilderId}`);
    return this.http.get<any>(`${this.baseUrl}/form/${formBuilderId}/active`).pipe(
      map((response: any) => {
        console.log(`[FormRulesService] Raw active rules response for form ${formBuilderId}:`, response);
        
        let dtos: FormRuleDto[] = [];
        
        // Case 1: ApiResponse wrapper with data property
        if (response && typeof response === 'object' && 'data' in response) {
          dtos = Array.isArray(response.data) ? response.data : [];
        }
        // Case 2: Direct array of FormRuleDto
        else if (Array.isArray(response)) {
          dtos = response;
        }
        // Case 3: Single object
        else if (response && typeof response === 'object' && 'id' in response) {
          dtos = [response as FormRuleDto];
        }
        
        const rules = dtos.map(dto => {
          try {
            return convertFormRuleDtoToFormRule(dto);
          } catch (error) {
            console.error(`[FormRulesService] Error converting DTO to FormRule:`, dto, error);
            return null;
          }
        }).filter((rule): rule is FormRule => rule !== null);
        
        console.log(`[FormRulesService] Converted to ${rules.length} active FormRules`);
        return rules;
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching active rules for form ${formBuilderId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * POST - إنشاء Rule جديد
   * ✅ Updated: Handles both ApiResponse wrapper and direct FormRuleDto response
   */
  createRule(rule: CreateFormRuleDto): Observable<FormRule> {
    console.log('[FormRulesService] Creating rule with DTO:', JSON.stringify(rule, null, 2));
    return this.http.post<any>(this.baseUrl, rule).pipe(
      map((response: any) => {
        console.log('[FormRulesService] Raw response:', response);
        console.log('[FormRulesService] Response type:', typeof response);
        console.log('[FormRulesService] Response keys:', response ? Object.keys(response) : 'null');
        
        let dto: FormRuleDto | null = null;
        
        // Case 1: ApiResponse wrapper with data property
        if (response && typeof response === 'object' && 'data' in response && response.data) {
          console.log('[FormRulesService] Found ApiResponse wrapper with data');
          dto = response.data as FormRuleDto;
        }
        // Case 2: Direct FormRuleDto (has id and ruleName)
        else if (response && typeof response === 'object' && 'id' in response && 'ruleName' in response) {
          console.log('[FormRulesService] Found direct FormRuleDto');
          dto = response as FormRuleDto;
        }
        // Case 3: Response is the DTO itself (check for formBuilderId as well)
        else if (response && typeof response === 'object' && 'formBuilderId' in response && 'ruleName' in response) {
          console.log('[FormRulesService] Found DTO-like object');
          dto = response as FormRuleDto;
        }
        
        if (!dto) {
          console.error('[FormRulesService] Could not extract FormRuleDto from response:', response);
          throw new Error('Failed to create rule: No data returned or invalid response format');
        }
        
        console.log('[FormRulesService] Extracted DTO:', dto);
        const formRule = convertFormRuleDtoToFormRule(dto);
        console.log('[FormRulesService] Converted to FormRule:', formRule);
        return formRule;
      }),
      catchError((error) => {
        console.error('[FormRulesService] Error creating rule:', error);
        console.error('[FormRulesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url
        });
        
        // If error has response body, log it
        if (error?.error) {
          console.error('[FormRulesService] Error response body:', JSON.stringify(error.error, null, 2));
        }
        
        throw error;
      })
    );
  }

  /**
   * PUT - تحديث Rule موجود
   * ✅ Updated: Handles both ApiResponse wrapper and direct FormRuleDto response
   */
  updateRule(id: number, rule: UpdateFormRuleDto): Observable<FormRule> {
    console.log(`[FormRulesService] Updating rule ${id} with DTO:`, rule);
    return this.http.put<ApiResponse<FormRuleDto> | FormRuleDto>(`${this.baseUrl}/${id}`, rule).pipe(
      map((response: ApiResponse<FormRuleDto> | FormRuleDto) => {
        console.log(`[FormRulesService] Update rule ${id} response:`, response);
        
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          const apiResponse = response as ApiResponse<FormRuleDto>;
          if (!apiResponse.data) {
            console.error(`[FormRulesService] No data in ApiResponse for rule ${id}:`, apiResponse);
            throw new Error('Failed to update rule: No data returned');
          }
          return convertFormRuleDtoToFormRule(apiResponse.data);
        }
        
        // Handle direct FormRuleDto response
        if (response && typeof response === 'object' && 'id' in response && 'ruleName' in response) {
          const dto = response as FormRuleDto;
          return convertFormRuleDtoToFormRule(dto);
        }
        
        // Fallback: try to use response as FormRuleDto directly
        console.error(`[FormRulesService] Unexpected response format for rule ${id}:`, response);
        throw new Error('Failed to update rule: Invalid response format');
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error updating rule ${id}:`, error);
        console.error(`[FormRulesService] Error details:`, {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message
        });
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Rule (Hard Delete)
   */
  deleteRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error deleting rule ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Rule (Soft Delete)
   */
  softDeleteRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/soft-delete/${id}`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error soft deleting rule ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * POST - تفعيل/تعطيل Rule
   */
  toggleRuleActive(id: number, isActive: boolean, formBuilderId: number): Observable<FormRule> {
    return this.updateRule(id, { formBuilderId, isActive } as UpdateFormRuleDto);
  }

  /**
   * Convert FormRule to CreateFormRuleDto
   */
  convertToDto(rule: FormRule, formBuilderId: number): CreateFormRuleDto {
    return convertFormRuleToDto(rule, formBuilderId);
  }
}

