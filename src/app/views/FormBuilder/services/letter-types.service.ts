import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LetterTypeDto {
  id: number;
  documentTypeId: number;
  name: string;
  code?: string | null;
  escalationOrder: number;
  deadlineDays: number;
  requiresSignature: boolean;
  emailTemplateId?: number | null;
  layoutId?: number | null;
  isActive: boolean;
}

export interface PublicHolidayDto {
  id: number;
  holidayDate: string;
  name: string;
  projectId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class LetterTypesService {
  private base = `${environment.apiUrl}/LetterTypes`;
  private holidaysBase = `${environment.apiUrl}/PublicHolidays`;

  constructor(private http: HttpClient) {}

  list(documentTypeId?: number): Observable<LetterTypeDto[]> {
    let params = new HttpParams();
    if (documentTypeId) params = params.set('documentTypeId', String(documentTypeId));
    return this.http.get<any>(this.base, { params }).pipe(map(r => (r?.data as LetterTypeDto[]) || []));
  }

  create(dto: Partial<LetterTypeDto>): Observable<LetterTypeDto> {
    return this.http.post<any>(this.base, dto).pipe(map(r => r?.data as LetterTypeDto));
  }

  update(id: number, dto: Partial<LetterTypeDto>): Observable<LetterTypeDto> {
    return this.http.put<any>(`${this.base}/${id}`, dto).pipe(map(r => r?.data as LetterTypeDto));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }

  deadlinePreview(days: number, start?: string): Observable<any> {
    let params = new HttpParams().set('days', String(days));
    if (start) params = params.set('start', start);
    return this.http.get<any>(`${this.base}/deadline-preview`, { params }).pipe(map(r => r?.data));
  }

  // ---- Holidays ----
  listHolidays(): Observable<PublicHolidayDto[]> {
    return this.http.get<any>(this.holidaysBase).pipe(map(r => (r?.data as PublicHolidayDto[]) || []));
  }

  createHoliday(dto: { holidayDate: string; name: string; projectId?: number | null }): Observable<any> {
    return this.http.post<any>(this.holidaysBase, dto).pipe(map(r => r?.data));
  }

  deleteHoliday(id: number): Observable<any> {
    return this.http.delete<any>(`${this.holidaysBase}/${id}`);
  }
}
