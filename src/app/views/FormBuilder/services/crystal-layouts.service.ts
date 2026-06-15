import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CrystalLayoutDto {
  id: number;
  documentTypeId: number;
  documentTypeName?: string | null;
  layoutName: string;
  layoutPath: string;
  projectId?: number | null;
  projectName?: string | null;
  userId?: string | null;
  isDefault: boolean;
  isActive: boolean;
  scope?: string; // User / Project / Global (server-derived)
}

@Injectable({ providedIn: 'root' })
export class CrystalLayoutsService {
  private base = `${environment.apiUrl}/CrystalLayouts`;

  constructor(private http: HttpClient) {}

  list(documentTypeId?: number | null, projectId?: number | null): Observable<CrystalLayoutDto[]> {
    let params = new HttpParams();
    if (documentTypeId) params = params.set('documentTypeId', String(documentTypeId));
    if (projectId) params = params.set('projectId', String(projectId));
    return this.http.get<any>(this.base, { params }).pipe(map(r => (r?.data as CrystalLayoutDto[]) || []));
  }

  create(dto: Partial<CrystalLayoutDto>): Observable<CrystalLayoutDto> {
    return this.http.post<any>(this.base, dto).pipe(map(r => r?.data as CrystalLayoutDto));
  }

  update(id: number, dto: Partial<CrystalLayoutDto>): Observable<CrystalLayoutDto> {
    return this.http.put<any>(`${this.base}/${id}`, dto).pipe(map(r => r?.data as CrystalLayoutDto));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }

  resolve(documentTypeId: number, projectId?: number | null, userId?: string | null): Observable<CrystalLayoutDto> {
    let params = new HttpParams().set('documentTypeId', String(documentTypeId));
    if (projectId) params = params.set('projectId', String(projectId));
    if (userId) params = params.set('userId', userId);
    return this.http.get<any>(`${this.base}/resolve`, { params }).pipe(map(r => r?.data as CrystalLayoutDto));
  }
}
