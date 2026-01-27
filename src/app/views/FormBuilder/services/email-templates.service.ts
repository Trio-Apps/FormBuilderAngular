import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Email Templates DTOs ====================

export type EmailTemplateCode = 'SubmissionConfirmation' | 'ApprovalRequired' | 'ApprovalResult';

export interface EmailTemplateDto {
  id: number;
  documentTypeId: number;
  templateName: string;
  templateCode: EmailTemplateCode | string;
  subjectTemplate: string;
  bodyTemplateHtml: string;
  smtpConfigId: number;
  isDefault: boolean;
  isActive: boolean;
  /**
   * Optional: backend may include soft-delete marker.
   */
  isDeleted?: boolean;
}

export interface CreateEmailTemplateDto {
  documentTypeId: number;
  templateName: string;
  templateCode: EmailTemplateCode | string;
  subjectTemplate: string;
  bodyTemplateHtml: string;
  smtpConfigId: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateEmailTemplateDto {
  documentTypeId?: number;
  templateName?: string;
  templateCode?: EmailTemplateCode | string;
  subjectTemplate?: string;
  bodyTemplateHtml?: string;
  smtpConfigId?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmailTemplatesService {
  private baseUrl = `${environment.apiUrl}/EmailTemplates`;

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
   * Get templates (filter by documentTypeId optional)
   * GET /api/EmailTemplates?documentTypeId=1&includeInactive=true
   */
  getAll(params?: { documentTypeId?: number; includeInactive?: boolean }): Observable<EmailTemplateDto[]> {
    let httpParams = new HttpParams();
    const includeInactive = params?.includeInactive ?? true;
    httpParams = httpParams.set('includeInactive', String(!!includeInactive));

    if (params?.documentTypeId !== undefined && params?.documentTypeId !== null) {
      const docTypeIdNum = Number(params.documentTypeId);
      if (!isNaN(docTypeIdNum) && docTypeIdNum > 0) {
        httpParams = httpParams.set('documentTypeId', docTypeIdNum.toString());
      }
    }

    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      map((response: any) => this.unwrapMany<EmailTemplateDto>(response)),
      catchError((error) => {
        console.error('[EmailTemplatesService] Error fetching email templates:', error);
        return of([]);
      })
    );
  }

  /**
   * Get template by ID
   * GET /api/EmailTemplates/{id}
   */
  getById(id: number): Observable<EmailTemplateDto> {
    const templateId = Number(id);
    if (isNaN(templateId) || templateId <= 0) {
      return throwError(() => new Error(`Invalid email template id: ${id}`));
    }

    return this.http.get<any>(`${this.baseUrl}/${templateId}`).pipe(
      map((response: any) => this.unwrapOne<EmailTemplateDto>(response)),
      catchError((error) => {
        console.error(`[EmailTemplatesService] Error fetching email template ${templateId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Create template
   * POST /api/EmailTemplates
   */
  create(dto: CreateEmailTemplateDto): Observable<EmailTemplateDto> {
    if (!dto) return throwError(() => new Error('Email template payload is required'));
    if (!dto.documentTypeId || dto.documentTypeId <= 0) {
      return throwError(() => new Error('documentTypeId is required'));
    }
    if (!dto.templateName || dto.templateName.trim() === '') {
      return throwError(() => new Error('templateName is required'));
    }
    if (!dto.templateCode || String(dto.templateCode).trim() === '') {
      return throwError(() => new Error('templateCode is required'));
    }
    if (!dto.subjectTemplate || dto.subjectTemplate.trim() === '') {
      return throwError(() => new Error('subjectTemplate is required'));
    }
    if (!dto.bodyTemplateHtml || dto.bodyTemplateHtml.trim() === '') {
      return throwError(() => new Error('bodyTemplateHtml is required'));
    }
    if (!dto.smtpConfigId || dto.smtpConfigId <= 0) {
      return throwError(() => new Error('smtpConfigId is required'));
    }

    const payload: CreateEmailTemplateDto = {
      ...dto,
      templateName: dto.templateName.trim(),
      templateCode: String(dto.templateCode).trim(),
      subjectTemplate: dto.subjectTemplate,
      bodyTemplateHtml: dto.bodyTemplateHtml
    };

    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((response: any) => this.unwrapOne<EmailTemplateDto>(response)),
      catchError((error) => {
        console.error('[EmailTemplatesService] Error creating email template:', error);
        throw error;
      })
    );
  }

  /**
   * Update template
   * PUT /api/EmailTemplates/{id}
   */
  update(id: number, dto: UpdateEmailTemplateDto): Observable<EmailTemplateDto> {
    const templateId = Number(id);
    if (isNaN(templateId) || templateId <= 0) {
      return throwError(() => new Error(`Invalid email template id: ${id}`));
    }
    if (!dto) return throwError(() => new Error('Email template update payload is required'));

    const payload: UpdateEmailTemplateDto = {
      ...dto,
      templateName: dto.templateName?.trim?.() ?? dto.templateName,
      templateCode: dto.templateCode !== undefined ? String(dto.templateCode).trim() : dto.templateCode
    };

    return this.http.put<any>(`${this.baseUrl}/${templateId}`, payload).pipe(
      map((response: any) => this.unwrapOne<EmailTemplateDto>(response)),
      catchError((error) => {
        console.error(`[EmailTemplatesService] Error updating email template ${templateId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Activate template
   * PATCH /api/EmailTemplates/{id}/activate
   */
  activate(id: number): Observable<EmailTemplateDto> {
    const templateId = Number(id);
    if (isNaN(templateId) || templateId <= 0) {
      return throwError(() => new Error(`Invalid email template id: ${id}`));
    }

    return this.http.patch<any>(`${this.baseUrl}/${templateId}/activate`, {}).pipe(
      map((response: any) => this.unwrapOne<EmailTemplateDto>(response)),
      catchError((error) => {
        console.error(`[EmailTemplatesService] Error activating email template ${templateId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Deactivate template
   * PATCH /api/EmailTemplates/{id}/deactivate
   */
  deactivate(id: number): Observable<EmailTemplateDto> {
    const templateId = Number(id);
    if (isNaN(templateId) || templateId <= 0) {
      return throwError(() => new Error(`Invalid email template id: ${id}`));
    }

    return this.http.patch<any>(`${this.baseUrl}/${templateId}/deactivate`, {}).pipe(
      map((response: any) => this.unwrapOne<EmailTemplateDto>(response)),
      catchError((error) => {
        console.error(`[EmailTemplatesService] Error deactivating email template ${templateId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Soft delete template
   * DELETE /api/EmailTemplates/{id}
   *
   * Note: Backend prevents deletion if used by AlertRules.
   */
  delete(id: number): Observable<void> {
    const templateId = Number(id);
    if (isNaN(templateId) || templateId <= 0) {
      return throwError(() => new Error(`Invalid email template id: ${id}`));
    }

    return this.http.delete<void>(`${this.baseUrl}/${templateId}`).pipe(
      catchError((error) => {
        console.error(`[EmailTemplatesService] Error deleting email template ${templateId}:`, error);
        throw error;
      })
    );
  }
}


