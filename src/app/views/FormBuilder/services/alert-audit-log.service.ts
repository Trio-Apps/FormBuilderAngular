import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AlertAuditLogDto {
  id: number;
  triggerType: string;
  submissionId: number;
  documentTypeId: number;
  channel: string;       // Internal | Email
  recipients?: string;
  recipientCount: number;
  status: string;        // Sent | Queued | Failed | Skipped
  errorMessage?: string;
  ruleIds?: string;
  firedAt: string;
}

export interface AlertAuditLogPage {
  total: number;
  page: number;
  pageSize: number;
  items: AlertAuditLogDto[];
}

@Injectable({ providedIn: 'root' })
export class AlertAuditLogService {
  private base = `${environment.apiUrl}/AlertAuditLog`;

  constructor(private http: HttpClient) {}

  getLog(opts: { submissionId?: number; page?: number; pageSize?: number } = {}): Observable<AlertAuditLogPage> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 1))
      .set('pageSize', String(opts.pageSize ?? 50));
    if (opts.submissionId) {
      params = params.set('submissionId', String(opts.submissionId));
    }
    return this.http
      .get<any>(this.base, { params })
      .pipe(map((r) => (r?.data as AlertAuditLogPage) || { total: 0, page: 1, pageSize: 50, items: [] }));
  }
}
