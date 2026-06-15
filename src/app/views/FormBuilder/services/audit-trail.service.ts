import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuditTrailDto {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  description?: string | null;
  documentTypeId?: number | null;
  performedByUserId?: string | null;
  performedAt: string;
  details?: string | null;
}

export interface AuditTrailPage {
  total: number;
  page: number;
  pageSize: number;
  items: AuditTrailDto[];
}

@Injectable({ providedIn: 'root' })
export class AuditTrailService {
  private base = `${environment.apiUrl}/AuditTrail`;

  constructor(private http: HttpClient) {}

  getLog(opts: { entityType?: string; entityId?: number; action?: string; page?: number; pageSize?: number } = {}): Observable<AuditTrailPage> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 1))
      .set('pageSize', String(opts.pageSize ?? 50));
    if (opts.entityType) params = params.set('entityType', opts.entityType);
    if (opts.entityId) params = params.set('entityId', String(opts.entityId));
    if (opts.action) params = params.set('action', opts.action);
    return this.http
      .get<any>(this.base, { params })
      .pipe(map((r) => (r?.data as AuditTrailPage) || { total: 0, page: 1, pageSize: 50, items: [] }));
  }
}
