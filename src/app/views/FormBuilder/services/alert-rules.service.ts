import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Alert Rules DTOs ====================

export type AlertNotificationType = 'Email';

export type AlertTriggerType =
  | 'FormSubmitted'
  | 'ApprovalRequired'
  | 'ApprovalApproved'
  | 'ApprovalRejected'
  | 'ApprovalReturned';

export interface CreateAlertRuleDto {
  documentTypeId: number;
  ruleName: string;
  triggerType: AlertTriggerType | string;
  conditionJson: string;
  emailTemplateId?: number | null;
  notificationType: AlertNotificationType | string;
  targetRoleId?: string | null;
  targetUserId?: string | null;
  isActive: boolean;
}

export interface AlertRuleDto {
  id: number;
  documentTypeId: number;
  ruleName: string;
  triggerType: string;
  conditionJson: string;
  emailTemplateId?: number | null;
  notificationType: string;
  targetRoleId?: string | null;
  targetUserId?: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AlertRulesService {
  private baseUrl = `${environment.apiUrl}/AlertRules`;

  constructor(private http: HttpClient) {}

  /**
   * Create Alert Rule
   * POST /api/AlertRules
   *
   * Note: Endpoint is Authorized → requires Bearer token (handled by authInterceptor)
   */
  createRule(dto: CreateAlertRuleDto): Observable<AlertRuleDto> {
    if (!dto) return throwError(() => new Error('Alert rule payload is required'));
    if (!dto.documentTypeId || dto.documentTypeId <= 0) {
      return throwError(() => new Error('documentTypeId is required'));
    }
    if (!dto.ruleName || dto.ruleName.trim() === '') {
      return throwError(() => new Error('ruleName is required'));
    }
    if (!dto.triggerType || String(dto.triggerType).trim() === '') {
      return throwError(() => new Error('triggerType is required'));
    }
    if (!dto.notificationType || String(dto.notificationType).trim() === '') {
      return throwError(() => new Error('notificationType is required'));
    }
    if (dto.conditionJson === undefined || dto.conditionJson === null) {
      return throwError(() => new Error('conditionJson is required (use "{}" if no conditions)'));
    }

    const payload: CreateAlertRuleDto = {
      ...dto,
      ruleName: dto.ruleName.trim(),
      conditionJson: dto.conditionJson?.trim?.() ?? dto.conditionJson
    };

    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) return response.data || response;
          if (!response.id) return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[AlertRulesService] Error creating alert rule:', error);
        throw error;
      })
    );
  }

  /**
   * Get active rules for document type + trigger
   * GET /api/AlertRules/active?documentTypeId=1&triggerType=FormSubmitted
   *
   * Note: Endpoint is Authorized → requires Bearer token (handled by authInterceptor)
   */
  getActive(documentTypeId: number, triggerType: string): Observable<AlertRuleDto[]> {
    const docTypeIdNum = Number(documentTypeId);
    if (isNaN(docTypeIdNum) || docTypeIdNum <= 0) {
      return throwError(() => new Error(`Invalid documentTypeId: ${documentTypeId}`));
    }
    if (!triggerType || triggerType.trim() === '') {
      return throwError(() => new Error('triggerType is required'));
    }

    const params = new HttpParams()
      .set('documentTypeId', docTypeIdNum.toString())
      .set('triggerType', triggerType);

    return this.http.get<any>(`${this.baseUrl}/active`, { params }).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) return response.data || [];
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('[AlertRulesService] Error fetching active alert rules:', error);
        // Return empty instead of failing UI hard
        return of([]);
      })
    );
  }

  /**
   * Get all alert rules (active + inactive)
   * GET /api/AlertRules
   *
   * Note: Endpoint is Authorized → requires Bearer token (handled by authInterceptor)
   */
  getAll(): Observable<AlertRuleDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) return response.data || [];
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('[AlertRulesService] Error fetching alert rules:', error);
        // Return empty instead of failing UI hard
        return of([]);
      })
    );
  }

  /**
   * Update alert rule (used mainly to toggle isActive)
   * PUT /api/AlertRules/{id}
   *
   * Backend may require full DTO. We send the full rule object we have.
   */
  updateRule(rule: AlertRuleDto): Observable<AlertRuleDto> {
    if (!rule || !rule.id) return throwError(() => new Error('Rule with valid id is required'));

    return this.http.put<any>(`${this.baseUrl}/${rule.id}`, rule).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          if (response.success !== undefined) return response.data || response;
          if (!response.id) return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[AlertRulesService] Error updating alert rule:', error);
        throw error;
      })
    );
  }
}


