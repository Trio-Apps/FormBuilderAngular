import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, FieldOptionResponse } from '../form-builder/models/form-builder-dto.model';

export interface MasterDataSet {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sourceType: string;
  configurationJson?: string | null;
  valueField?: string | null;
  textField?: string | null;
  isCacheEnabled: boolean;
  cacheDurationMinutes?: number | null;
  isActive: boolean;
  itemsCount: number;
}

export interface SaveMasterDataSet {
  code: string;
  name: string;
  description?: string | null;
  sourceType: string;
  configurationJson?: string | null;
  valueField?: string | null;
  textField?: string | null;
  isCacheEnabled: boolean;
  cacheDurationMinutes?: number | null;
  isActive: boolean;
}

export interface MasterDataItem {
  id: number;
  masterDataSetId: number;
  value: string;
  text: string;
  foreignText?: string | null;
  parentValue?: string | null;
  sortOrder: number;
  extraJson?: string | null;
  isActive: boolean;
}

export interface SaveMasterDataItem {
  value: string;
  text: string;
  foreignText?: string | null;
  parentValue?: string | null;
  sortOrder: number;
  extraJson?: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly baseUrl = `${environment.apiUrl}/MasterData`;

  constructor(private http: HttpClient) {}

  getSets(includeInactive = true): Observable<MasterDataSet[]> {
    const params = new HttpParams().set('includeInactive', String(includeInactive));
    return this.http.get<ApiResponse<MasterDataSet[]>>(`${this.baseUrl}/sets`, { params }).pipe(
      map(response => response.data || []),
      catchError(error => {
        // Surface load failures so the UI can show an error instead of a misleading empty list.
        console.error('[MasterDataService] Error loading sets', error);
        return throwError(() => error);
      })
    );
  }

  getActiveSets(): Observable<MasterDataSet[]> {
    return this.http.get<ApiResponse<MasterDataSet[]>>(`${this.baseUrl}/sets/active`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('[MasterDataService] Error loading active sets', error);
        return of([]);
      })
    );
  }

  createSet(payload: SaveMasterDataSet): Observable<number> {
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/sets`, payload).pipe(
      map(response => Number(response.data || 0))
    );
  }

  updateSet(id: number, payload: SaveMasterDataSet): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/sets/${id}`, payload).pipe(map(() => undefined));
  }

  deleteSet(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/sets/${id}`).pipe(map(() => undefined));
  }

  getItems(setId: number, includeInactive = true): Observable<MasterDataItem[]> {
    const params = new HttpParams().set('includeInactive', String(includeInactive));
    return this.http.get<ApiResponse<MasterDataItem[]>>(`${this.baseUrl}/sets/${setId}/items`, { params }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('[MasterDataService] Error loading items', error);
        return throwError(() => error);
      })
    );
  }

  createItem(setId: number, payload: SaveMasterDataItem): Observable<number> {
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/sets/${setId}/items`, payload).pipe(
      map(response => Number(response.data || 0))
    );
  }

  updateItem(itemId: number, payload: SaveMasterDataItem): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/items/${itemId}`, payload).pipe(map(() => undefined));
  }

  deleteItem(itemId: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/items/${itemId}`).pipe(map(() => undefined));
  }

  getOptions(setId: number, search?: string): Observable<FieldOptionResponse[]> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<FieldOptionResponse[]>>(`${this.baseUrl}/sets/${setId}/options`, { params }).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }
}
