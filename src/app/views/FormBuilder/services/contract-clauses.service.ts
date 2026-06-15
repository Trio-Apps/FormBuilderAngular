import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ContractClauseDto {
  id: number;
  clauseCode: string;
  title: string;
  body: string;
  projectId?: number | null;
  documentTypeId?: number | null;
  sortOrder: number;
  version: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContractClausesService {
  private base = `${environment.apiUrl}/ContractClauses`;

  constructor(private http: HttpClient) {}

  list(documentTypeId?: number): Observable<ContractClauseDto[]> {
    let params = new HttpParams();
    if (documentTypeId) params = params.set('documentTypeId', String(documentTypeId));
    return this.http.get<any>(this.base, { params }).pipe(map(r => (r?.data as ContractClauseDto[]) || []));
  }

  create(dto: Partial<ContractClauseDto>): Observable<ContractClauseDto> {
    return this.http.post<any>(this.base, dto).pipe(map(r => r?.data as ContractClauseDto));
  }

  update(id: number, dto: Partial<ContractClauseDto>): Observable<ContractClauseDto> {
    return this.http.put<any>(`${this.base}/${id}`, dto).pipe(map(r => r?.data as ContractClauseDto));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }

  /** "Update all": propagate this clause's latest version to every attached document. */
  propagate(id: number): Observable<{ updated: number }> {
    return this.http.post<any>(`${this.base}/${id}/propagate`, {}).pipe(map(r => (r?.data as { updated: number }) || { updated: 0 }));
  }
}
