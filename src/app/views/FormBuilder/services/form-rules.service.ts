import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormRule,
  CreateFormRuleDto,
  UpdateFormRuleDto,
  ApiResponse
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
    return this.http.get<ApiResponse<FormRule[]>>(this.baseUrl).pipe(
      map((response: ApiResponse<FormRule[]>) => {
        return response.data || [];
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
    return this.http.get<ApiResponse<FormRule>>(`${this.baseUrl}/${id}`).pipe(
      map((response: ApiResponse<FormRule>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching rule ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - جلب جميع Rules لنموذج معين
   */
  getRulesByFormId(formId: number): Observable<FormRule[]> {
    return this.http.get<ApiResponse<FormRule[]>>(`${this.baseUrl}/form/${formId}`).pipe(
      map((response: ApiResponse<FormRule[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching rules for form ${formId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Rules النشطة فقط لنموذج معين
   */
  getActiveRulesByFormId(formId: number): Observable<FormRule[]> {
    return this.http.get<ApiResponse<FormRule[]>>(`${this.baseUrl}/form/${formId}/active`).pipe(
      map((response: ApiResponse<FormRule[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error fetching active rules for form ${formId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * POST - إنشاء Rule جديد
   */
  createRule(rule: CreateFormRuleDto): Observable<FormRule> {
    return this.http.post<ApiResponse<FormRule>>(this.baseUrl, rule).pipe(
      map((response: ApiResponse<FormRule>) => {
        if (!response.data) {
          throw new Error('Failed to create rule: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('[FormRulesService] Error creating rule:', error);
        throw error;
      })
    );
  }

  /**
   * PUT - تحديث Rule موجود
   */
  updateRule(id: number, rule: UpdateFormRuleDto): Observable<FormRule> {
    return this.http.put<ApiResponse<FormRule>>(`${this.baseUrl}/${id}`, rule).pipe(
      map((response: ApiResponse<FormRule>) => {
        if (!response.data) {
          throw new Error('Failed to update rule: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`[FormRulesService] Error updating rule ${id}:`, error);
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
  toggleRuleActive(id: number, isActive: boolean): Observable<FormRule> {
    return this.updateRule(id, { isActive });
  }
}

