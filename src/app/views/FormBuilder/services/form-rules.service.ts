import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, switchMap, filter, retry, delay } from 'rxjs/operators';
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
   * ✅ Updated: Handles both ApiResponse wrapper and direct FormRuleDto response
   */
  getRuleById(id: number): Observable<FormRule | null> {
    console.log(`[FormRulesService] Fetching rule ${id}`);
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        console.log(`[FormRulesService] Raw response for rule ${id}:`, response);
        
        let dto: FormRuleDto | null = null;
        
        // Case 1: ApiResponse wrapper with data property
        if (response && typeof response === 'object' && 'data' in response) {
          dto = response.data as FormRuleDto;
        }
        // Case 2: Direct FormRuleDto (has id and ruleName)
        else if (response && typeof response === 'object' && 'id' in response && 'ruleName' in response) {
          dto = response as FormRuleDto;
        }
        
        if (!dto) {
          console.warn(`[FormRulesService] Could not extract FormRuleDto from response for rule ${id}`);
          return null;
        }
        
        try {
          return convertFormRuleDtoToFormRule(dto);
        } catch (error) {
          console.error(`[FormRulesService] Error converting DTO to FormRule for rule ${id}:`, error);
          return null;
        }
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching rule ${id}:`, error);
        console.error(`[FormRulesService] Error details:`, {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message
        });
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
        
        // ✅ Check if isDeleted field exists in DTOs
        const dtosWithIsDeleted = dtos.filter(dto => 'isDeleted' in dto || dto.isDeleted !== undefined);
        const dtosWithoutIsDeleted = dtos.filter(dto => !('isDeleted' in dto) && dto.isDeleted === undefined);
        
        if (dtosWithoutIsDeleted.length > 0) {
          console.warn(`[FormRulesService] ⚠️ ${dtosWithoutIsDeleted.length} DTO(s) missing 'isDeleted' field - Backend may not be sending it`);
          console.warn(`[FormRulesService] DTOs without isDeleted:`, dtosWithoutIsDeleted.map(d => ({ id: d.id, ruleName: d.ruleName })));
        }
        
        if (dtosWithIsDeleted.length > 0) {
          console.log(`[FormRulesService] DTOs with isDeleted field:`, dtosWithIsDeleted.map(d => ({ 
            id: d.id, 
            ruleName: d.ruleName, 
            isDeleted: d.isDeleted 
          })));
        }
        
        const rules = dtos
          .map(dto => {
            try {
              const rule = convertFormRuleDtoToFormRule(dto);
              // Log isDeleted status for debugging
              if (dto.isDeleted !== undefined) {
                console.log(`[FormRulesService] Rule ${dto.id} (${dto.ruleName}): isDeleted = ${dto.isDeleted}`);
              }
              return rule;
            } catch (error) {
              console.error(`[FormRulesService] Error converting DTO to FormRule:`, dto, error);
              return null;
            }
          })
          .filter((rule): rule is FormRule => rule !== null)
          // ✅ Filter out soft-deleted rules (Frontend filter as backup - Backend should also filter)
          .filter(rule => {
            const isDeleted = rule.isDeleted === true;
            if (isDeleted) {
              console.log(`[FormRulesService] Filtering out deleted rule: ${rule.id} (${rule.ruleName})`);
            }
            return !isDeleted;
          });
        
        const deletedCount = dtos.filter(dto => dto.isDeleted === true).length;
        if (deletedCount > 0) {
          console.log(`[FormRulesService] ✅ Filtered out ${deletedCount} soft-deleted rule(s) in Frontend`);
        } else {
          console.log(`[FormRulesService] No soft-deleted rules found (all ${dtos.length} rules are active or isDeleted field missing)`);
        }
        
        console.log(`[FormRulesService] Converted to ${rules.length} FormRules (after filtering deleted):`, rules);
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
   * POST - Evaluate blocking rules before submit/open
   * يستخدمها الـ Forms (سواء Public أو داخل النظام) للتحقق من قواعد الـ Blocking قبل التنفيذ الفعلي.
   *
   * Expected backend endpoint: POST /api/FormRules/evaluate-blocking
   * Payload example:
   * {
   *   formBuilderId: 123,
   *   evaluationPhase: 'PreSubmit',
   *   fieldValues: { FIELD_CODE: value, '123': valueById, ... }
   * }
   *
   * The backend should return something like:
   * - 200 OK with body: { isBlocked: false } أو { isBlocked: true, blockMessage, ruleId, conditionKey, ... }
   * - or 400/403 with body (or data) containing isBlocked=true
   *
   * This method يحاول توحيد الـ response قدر الإمكان:
   * - يرجع Observable<{ isBlocked: boolean; blockMessage?: string; message?: string; ruleId?: number; conditionKey?: string; [key: string]: any }>
   * - لو حصل خطأ network/غيره بدون isBlocked، يُرمى كما هو ليتعامل معه الـ component
   */
  evaluateBlockingRules(payload: {
    formBuilderId: number;
    evaluationPhase: 'OnFieldChange' | 'PreSubmit' | 'PreOpen';
    fieldValues: { [key: string]: any };
  }): Observable<{
    isBlocked?: boolean;
    blockMessage?: string;
    message?: string;
    ruleId?: number;
    ruleName?: string;
    conditionKey?: string;
    [key: string]: any;
  }> {
    return this.http.post<any>(`${this.baseUrl}/evaluate-blocking`, payload).pipe(
      map((response: any) => {
        // Normalize common ServiceResult<ApiResponse<T>> shapes
        let result = response;
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            result = response.data ?? response;
          } else if (!response.isBlocked && (response.data || response.result)) {
            result = response.data || response.result || response;
          }
        }
        return result;
      }),
      catchError((error) => {
        console.error('[FormRulesService] Error evaluating blocking rules:', error);

        const errorResponse = error?.error;
        const blockingPayload: any =
          errorResponse && typeof errorResponse === 'object'
            ? (errorResponse.data && typeof errorResponse.data === 'object'
                ? errorResponse.data
                : errorResponse)
            : null;

        if (blockingPayload?.isBlocked) {
          // Treat as a blocking rule violation and return a normalized object
          const errorMessage =
            blockingPayload.blockMessage ||
            blockingPayload.message ||
            errorResponse?.message ||
            'Form submission is blocked by a validation rule.';

          console.warn('[FormRulesService] Blocking rules evaluation returned isBlocked=true:', {
            status: error?.status,
            ruleId: blockingPayload.ruleId,
            ruleName: blockingPayload.ruleName,
            conditionKey: blockingPayload.conditionKey,
            message: errorMessage
          });

          return of({
            ...blockingPayload,
            isBlocked: true,
            blockMessage: errorMessage
          });
        }

        return throwError(() => error);
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
   * ✅ Fixed: Better error handling for 409 Conflict (Entity Framework tracking conflicts)
   * ✅ Fixed: TypeScript error - properly handles null from getRuleById
   */
  updateRule(id: number, rule: UpdateFormRuleDto): Observable<FormRule> {
    console.log(`[FormRulesService] Updating rule ${id} with DTO:`, JSON.stringify(rule, null, 2));
    
    // Ensure actions and elseActions don't contain 'id' property (to avoid EF tracking conflicts)
    // This is a safety measure - convertFormRuleToDto should already remove IDs, but we do it here too
    const cleanedRule: UpdateFormRuleDto = {
      ...rule,
      actions: rule.actions?.map(action => {
        // Remove 'id' property if it exists (Action interface doesn't have 'id', but backend might send it)
        const { id: actionId, ...actionWithoutId } = action as any;
        // Also ensure we don't include any other unexpected properties
        const cleanAction: any = {
          type: actionWithoutId.type,
          fieldCode: actionWithoutId.fieldCode
        };
        if (actionWithoutId.value !== null && actionWithoutId.value !== undefined) {
          cleanAction.value = actionWithoutId.value;
        }
        if (actionWithoutId.expression !== null && actionWithoutId.expression !== undefined && actionWithoutId.expression !== '') {
          cleanAction.expression = actionWithoutId.expression;
        }
        return cleanAction;
      }),
      elseActions: rule.elseActions?.map(action => {
        // Remove 'id' property if it exists
        const { id: actionId, ...actionWithoutId } = action as any;
        // Also ensure we don't include any other unexpected properties
        const cleanAction: any = {
          type: actionWithoutId.type,
          fieldCode: actionWithoutId.fieldCode
        };
        if (actionWithoutId.value !== null && actionWithoutId.value !== undefined) {
          cleanAction.value = actionWithoutId.value;
        }
        if (actionWithoutId.expression !== null && actionWithoutId.expression !== undefined && actionWithoutId.expression !== '') {
          cleanAction.expression = actionWithoutId.expression;
        }
        return cleanAction;
      })
    };
    
    console.log(`[FormRulesService] Cleaned rule DTO (without IDs):`, JSON.stringify(cleanedRule, null, 2));
    
    return this.http.put<ApiResponse<FormRuleDto> | FormRuleDto>(`${this.baseUrl}/${id}`, cleanedRule, {
      observe: 'response'
    }).pipe(
      switchMap((httpResponse: HttpResponse<ApiResponse<FormRuleDto> | FormRuleDto>) => {
        const response = httpResponse.body;
        const status = httpResponse.status;
        
        console.log(`[FormRulesService] Update rule ${id} response status:`, status);
        console.log(`[FormRulesService] Update rule ${id} response body:`, response);
        
        // Helper function to fetch rule and ensure it's not null
        // Add a small delay to allow backend to process the update
        const fetchRuleOrError = (delayMs: number = 100): Observable<FormRule> => {
          return timer(delayMs).pipe(
            switchMap(() => this.getRuleById(id)),
            switchMap((rule) => {
              if (!rule) {
                console.warn(`[FormRulesService] Failed to fetch rule ${id} after update, retrying...`);
                // Retry once after a longer delay
                return timer(500).pipe(
                  switchMap(() => this.getRuleById(id)),
                  switchMap((retryRule) => {
                    if (!retryRule) {
                      return throwError(() => new Error('Failed to fetch updated rule. The update may have succeeded, but the rule could not be retrieved. Please refresh the page.'));
                    }
                    return of(retryRule);
                  })
                );
              }
              return of(rule);
            })
          );
        };
        
        // Handle 204 No Content (success but no body)
        if (status === 204 || (status === 200 && !response)) {
          console.log(`[FormRulesService] Update succeeded with ${status}, no body returned - fetching updated rule`);
          return fetchRuleOrError(200); // Wait 200ms before fetching
        }
        
        // Handle null or undefined response (should not happen with 200, but handle it)
        if (!response) {
          console.warn(`[FormRulesService] Update returned null/undefined response, fetching updated rule`);
          return fetchRuleOrError();
        }
        
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          const apiResponse = response as ApiResponse<FormRuleDto>;
          if (!apiResponse.data) {
            console.error(`[FormRulesService] No data in ApiResponse for rule ${id}:`, apiResponse);
            return fetchRuleOrError();
          }
          return of(convertFormRuleDtoToFormRule(apiResponse.data));
        }
        
        // Handle direct FormRuleDto response
        if (response && typeof response === 'object' && 'id' in response && 'ruleName' in response) {
          const dto = response as FormRuleDto;
          return of(convertFormRuleDtoToFormRule(dto));
        }
        
        // Fallback: try to fetch the updated rule
        console.warn(`[FormRulesService] Unexpected response format for rule ${id}, fetching updated rule:`, response);
        return fetchRuleOrError();
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error updating rule ${id}:`, error);
        console.error(`[FormRulesService] Error details:`, {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message,
          url: error?.url
        });
        
        // Handle 409 Conflict (Entity Framework tracking conflict)
        if (error?.status === 409) {
          const errorMessage = error?.error?.message || error?.error?.title || 
            'Entity tracking conflict. The rule may have been modified by another user. Please refresh and try again.';
          return throwError(() => new Error(errorMessage));
        }
        
        // Handle other HTTP errors
        if (error?.error?.message) {
          return throwError(() => new Error(error.error.message));
        }
        if (error?.error?.title) {
          return throwError(() => new Error(error.error.title));
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * DELETE - حذف Rule (Soft Delete)
   * DELETE /api/FormRules/{id}
   * 
   * API Behavior:
   * - Soft Delete: Uses soft delete (IsDeleted = true, DeletedDate = DateTime.UtcNow)
   * - Response: 204 No Content
   * - The rule will not appear in any normal queries
   * 
   * @param id Rule ID
   * @returns Observable<void>
   */
  deleteRule(id: number): Observable<void> {
    const url = `${this.baseUrl}/${id}`;
    console.log(`[FormRulesService] deleteRule - Calling DELETE ${url} (Soft Delete)`);
    console.log(`[FormRulesService] deleteRule - Expected behavior: IsDeleted = true, DeletedDate = DateTime.UtcNow`);
    
    return this.http.delete<ApiResponse<void>>(url).pipe(
      map((response) => {
        console.log(`[FormRulesService] deleteRule - Success response:`, response);
        console.log(`[FormRulesService] deleteRule - Rule ${id} should be soft deleted (IsDeleted = true)`);
        // Success - rule is soft deleted
      }),
      catchError((error) => {
        console.error(`[FormRulesService] deleteRule - Error deleting rule ${id}:`, error);
        console.error(`[FormRulesService] deleteRule - Error details:`, {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url
        });
        throw error;
      })
    );
  }

  /**
   * POST - استعادة Rule محذوف (Restore Soft Deleted Rule)
   * POST /api/FormRules/{id}/restore
   * 
   * API Behavior:
   * - Restores a soft-deleted rule (IsDeleted = false, DeletedDate = null)
   * - Response: 204 No Content
   * - The rule will appear in normal queries again
   * 
   * @param id Rule ID
   * @returns Observable<void>
   */
  restoreRule(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/restore`, {}).pipe(
      map(() => {
        // Success - rule is restored
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error restoring rule ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Rule (Soft Delete) - Legacy method
   * @deprecated Use deleteRule() instead - it now performs soft delete
   */
  softDeleteRule(id: number): Observable<void> {
    return this.deleteRule(id);
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

