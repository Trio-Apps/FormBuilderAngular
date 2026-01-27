import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== SMTP Configs DTOs ====================

export interface SmtpConfigDto {
  id: number;
  name: string;
  host: string;
  port: number;
  useSsl: boolean;
  userName: string;
  hasPassword: boolean;
  fromEmail: string;
  fromDisplayName: string;
  isActive: boolean;
  /**
   * Optional: backend may include soft-delete marker.
   */
  isDeleted?: boolean;
}

export interface CreateSmtpConfigDto {
  name: string;
  host: string;
  port: number;
  useSsl: boolean;
  userName: string;
  password: string;
  fromEmail: string;
  fromDisplayName: string;
  isActive: boolean;
}

export interface UpdateSmtpConfigDto {
  name?: string;
  host?: string;
  port?: number;
  useSsl?: boolean;
  userName?: string;
  /**
   * Optional on update. If omitted/empty, backend keeps existing password.
   */
  password?: string;
  fromEmail?: string;
  fromDisplayName?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SmtpConfigsService {
  private baseUrl = `${environment.apiUrl}/SmtpConfigs`;

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
   * Get all SMTP configs (active + inactive)
   * GET /api/SmtpConfigs?includeInactive=true
   */
  getAll(includeInactive = true): Observable<SmtpConfigDto[]> {
    const params = new HttpParams().set('includeInactive', String(!!includeInactive));

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((response: any) => this.unwrapMany<SmtpConfigDto>(response)),
      catchError((error) => {
        console.error('[SmtpConfigsService] Error fetching smtp configs:', error);
        return of([]);
      })
    );
  }

  /**
   * Get SMTP config by ID
   * GET /api/SmtpConfigs/{id}
   */
  getById(id: number): Observable<SmtpConfigDto> {
    const configId = Number(id);
    if (isNaN(configId) || configId <= 0) {
      return throwError(() => new Error(`Invalid smtp config id: ${id}`));
    }

    return this.http.get<any>(`${this.baseUrl}/${configId}`).pipe(
      map((response: any) => this.unwrapOne<SmtpConfigDto>(response)),
      catchError((error) => {
        console.error(`[SmtpConfigsService] Error fetching smtp config ${configId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Create SMTP config
   * POST /api/SmtpConfigs
   */
  create(dto: CreateSmtpConfigDto): Observable<SmtpConfigDto> {
    if (!dto) return throwError(() => new Error('SMTP config payload is required'));
    if (!dto.name || dto.name.trim() === '') return throwError(() => new Error('name is required'));
    if (!dto.host || dto.host.trim() === '') return throwError(() => new Error('host is required'));
    if (!dto.port || dto.port <= 0) return throwError(() => new Error('port is required'));
    if (!dto.userName || dto.userName.trim() === '') return throwError(() => new Error('userName is required'));
    if (!dto.password || dto.password.trim() === '') return throwError(() => new Error('password is required'));
    if (!dto.fromEmail || dto.fromEmail.trim() === '') return throwError(() => new Error('fromEmail is required'));

    const payload: CreateSmtpConfigDto = {
      ...dto,
      name: dto.name.trim(),
      host: dto.host.trim(),
      userName: dto.userName.trim(),
      password: dto.password,
      fromEmail: dto.fromEmail.trim(),
      fromDisplayName: dto.fromDisplayName?.trim?.() ?? dto.fromDisplayName
    };

    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((response: any) => this.unwrapOne<SmtpConfigDto>(response)),
      catchError((error) => {
        console.error('[SmtpConfigsService] Error creating smtp config:', error);
        throw error;
      })
    );
  }

  /**
   * Update SMTP config
   * PUT /api/SmtpConfigs/{id}
   */
  update(id: number, dto: UpdateSmtpConfigDto): Observable<SmtpConfigDto> {
    const configId = Number(id);
    if (isNaN(configId) || configId <= 0) {
      return throwError(() => new Error(`Invalid smtp config id: ${id}`));
    }
    if (!dto) return throwError(() => new Error('SMTP config update payload is required'));

    const payload: UpdateSmtpConfigDto = {
      ...dto,
      name: dto.name?.trim?.() ?? dto.name,
      host: dto.host?.trim?.() ?? dto.host,
      userName: dto.userName?.trim?.() ?? dto.userName,
      fromEmail: dto.fromEmail?.trim?.() ?? dto.fromEmail,
      fromDisplayName: dto.fromDisplayName?.trim?.() ?? dto.fromDisplayName
    };

    return this.http.put<any>(`${this.baseUrl}/${configId}`, payload).pipe(
      map((response: any) => this.unwrapOne<SmtpConfigDto>(response)),
      catchError((error) => {
        console.error(`[SmtpConfigsService] Error updating smtp config ${configId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Activate SMTP config
   * PATCH /api/SmtpConfigs/{id}/activate
   */
  activate(id: number): Observable<SmtpConfigDto> {
    const configId = Number(id);
    if (isNaN(configId) || configId <= 0) {
      return throwError(() => new Error(`Invalid smtp config id: ${id}`));
    }

    return this.http.patch<any>(`${this.baseUrl}/${configId}/activate`, {}).pipe(
      map((response: any) => this.unwrapOne<SmtpConfigDto>(response)),
      catchError((error) => {
        console.error(`[SmtpConfigsService] Error activating smtp config ${configId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Deactivate SMTP config
   * PATCH /api/SmtpConfigs/{id}/deactivate
   */
  deactivate(id: number): Observable<SmtpConfigDto> {
    const configId = Number(id);
    if (isNaN(configId) || configId <= 0) {
      return throwError(() => new Error(`Invalid smtp config id: ${id}`));
    }

    return this.http.patch<any>(`${this.baseUrl}/${configId}/deactivate`, {}).pipe(
      map((response: any) => this.unwrapOne<SmtpConfigDto>(response)),
      catchError((error) => {
        console.error(`[SmtpConfigsService] Error deactivating smtp config ${configId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Soft delete SMTP config
   * DELETE /api/SmtpConfigs/{id}
   *
   * Note: Backend prevents deletion if used by EmailTemplates.
   */
  delete(id: number): Observable<void> {
    const configId = Number(id);
    if (isNaN(configId) || configId <= 0) {
      return throwError(() => new Error(`Invalid smtp config id: ${id}`));
    }

    return this.http.delete<void>(`${this.baseUrl}/${configId}`).pipe(
      catchError((error) => {
        console.error(`[SmtpConfigsService] Error deleting smtp config ${configId}:`, error);
        throw error;
      })
    );
  }
}


