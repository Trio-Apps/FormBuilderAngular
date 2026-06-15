import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Alert Rules DTOs ====================

export type AlertNotificationType = 'Email' | 'Internal' | 'Both';

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
  emailTemplateId: number | null;
  notificationType: AlertNotificationType;
  targetRoleId?: string | null;
  targetUserId?: string | null;
  isActive: boolean;
  scheduleIntervalMinutes?: number | null;
  sqlCondition?: string | null;
}

export interface AlertRuleDto {
  id: number;
  documentTypeId: number;
  ruleName: string;
  triggerType: string;
  conditionJson: string;
  emailTemplateId?: number | null;
  emailTemplateName?: string | null;
  notificationType: string;
  targetRoleId?: string | null;
  targetUserId?: string | null;
  isActive: boolean;
  scheduleIntervalMinutes?: number | null;
  lastRunAt?: string | null;
  sqlCondition?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AlertRulesService {
  private baseUrl = `${environment.apiUrl}/AlertRules`;

  constructor(private http: HttpClient) {}

  private unwrapOne<T>(response: any): T {
    if (response && typeof response === 'object') {
      if (response.success !== undefined) return (response.data || response) as T;
      if (!response.id) return (response.data || response.result || response) as T;
    }
    return response as T;
  }

  private unwrapMany<T>(response: any): T[] {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      if (response.success !== undefined) return (response.data || []) as T[];
      return (response.data || response.items || response.result || []) as T[];
    }
    return Array.isArray(response) ? (response as T[]) : [];
  }

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
      conditionJson: dto.conditionJson?.trim?.() ?? dto.conditionJson,
      emailTemplateId: dto.emailTemplateId ?? null,
      notificationType: dto.notificationType
    };

    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((response: any) => this.unwrapOne<AlertRuleDto>(response)),
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
      map((response: any) => this.unwrapMany<AlertRuleDto>(response)),
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
      map((response: any) => this.unwrapMany<AlertRuleDto>(response)),
      catchError((error) => {
        console.error('[AlertRulesService] Error fetching alert rules:', error);
        // Return empty instead of failing UI hard
        return of([]);
      })
    );
  }

  /**
   * Get alert rule by ID
   * GET /api/AlertRules/{id}
   */
  getById(id: number): Observable<AlertRuleDto> {
    const ruleId = Number(id);
    if (isNaN(ruleId) || ruleId <= 0) {
      return throwError(() => new Error(`Invalid alert rule id: ${id}`));
    }

    return this.http.get<any>(`${this.baseUrl}/${ruleId}`).pipe(
      map((response: any) => this.unwrapOne<AlertRuleDto>(response)),
      catchError((error) => {
        console.error(`[AlertRulesService] Error fetching alert rule ${ruleId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get alert rules by document type
   * GET /api/AlertRules/document-type/{documentTypeId}
   */
  getByDocumentType(documentTypeId: number): Observable<AlertRuleDto[]> {
    const docTypeIdNum = Number(documentTypeId);
    if (isNaN(docTypeIdNum) || docTypeIdNum <= 0) {
      return throwError(() => new Error(`Invalid documentTypeId: ${documentTypeId}`));
    }

    return this.http.get<any>(`${this.baseUrl}/document-type/${docTypeIdNum}`).pipe(
      map((response: any) => this.unwrapMany<AlertRuleDto>(response)),
      catchError((error) => {
        console.error(`[AlertRulesService] Error fetching alert rules by document type ${docTypeIdNum}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get alert rules by trigger type
   * GET /api/AlertRules/trigger-type/{triggerType}
   */
  getByTriggerType(triggerType: string): Observable<AlertRuleDto[]> {
    if (!triggerType || triggerType.trim() === '') {
      return throwError(() => new Error('triggerType is required'));
    }

    const encoded = encodeURIComponent(triggerType.trim());
    return this.http.get<any>(`${this.baseUrl}/trigger-type/${encoded}`).pipe(
      map((response: any) => this.unwrapMany<AlertRuleDto>(response)),
      catchError((error) => {
        console.error(`[AlertRulesService] Error fetching alert rules by trigger type ${triggerType}:`, error);
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
      map((response: any) => this.unwrapOne<AlertRuleDto>(response)),
      catchError((error) => {
        console.error('[AlertRulesService] Error updating alert rule:', error);
        throw error;
      })
    );
  }

  /**
   * Activate alert rule
   * PATCH /api/AlertRules/{id}/activate
   */
  activate(id: number): Observable<AlertRuleDto> {
    const ruleId = Number(id);
    if (isNaN(ruleId) || ruleId <= 0) {
      return throwError(() => new Error(`Invalid alert rule id: ${id}`));
    }

    return this.http.patch<any>(`${this.baseUrl}/${ruleId}/activate`, {}).pipe(
      map((response: any) => this.unwrapOne<AlertRuleDto>(response)),
      catchError((error) => {
        console.error(`[AlertRulesService] Error activating alert rule ${ruleId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Deactivate alert rule
   * PATCH /api/AlertRules/{id}/deactivate
   */
  deactivate(id: number): Observable<AlertRuleDto> {
    const ruleId = Number(id);
    if (isNaN(ruleId) || ruleId <= 0) {
      return throwError(() => new Error(`Invalid alert rule id: ${id}`));
    }

    return this.http.patch<any>(`${this.baseUrl}/${ruleId}/deactivate`, {}).pipe(
      map((response: any) => this.unwrapOne<AlertRuleDto>(response)),
      catchError((error) => {
        console.error(`[AlertRulesService] Error deactivating alert rule ${ruleId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Soft delete alert rule
   * DELETE /api/AlertRules/{id}
   */
  delete(id: number): Observable<void> {
    const ruleId = Number(id);
    if (isNaN(ruleId) || ruleId <= 0) {
      return throwError(() => new Error(`Invalid alert rule id: ${id}`));
    }

    return this.http.delete<void>(`${this.baseUrl}/${ruleId}`).pipe(
      catchError((error) => {
        console.error(`[AlertRulesService] Error deleting alert rule ${ruleId}:`, error);
        throw error;
      })
    );
  }
}


