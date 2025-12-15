import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FormBuilderDto,
  CreateFormBuilderDto,
  UpdateFormBuilderDto
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  private baseUrl = `${environment.apiUrl}/FormBuilder`;

  constructor(private http: HttpClient) {}

  getForms(page: number = 1, pageSize: number = 20): Observable<PagedResult<FormBuilderDto>> {
    return this.http
      .get<PagedResult<FormBuilderDto>>(`${this.baseUrl}?page=${page}&pageSize=${pageSize}`)
      .pipe(
        catchError(() => {
          return of({
            items: [],
            totalCount: 0,
            page,
            pageSize,
            totalPages: 0,
            hasPrevious: false,
            hasNext: false
          });
        })
      );
  }

  getFormById(id: number): Observable<FormBuilderDto> {
    return this.http.get<FormBuilderDto>(`${this.baseUrl}/${id}`);
  }

  createForm(dto: CreateFormBuilderDto): Observable<FormBuilderDto> {
    return this.http.post<FormBuilderDto>(this.baseUrl, dto);
  }

  updateForm(id: number, dto: UpdateFormBuilderDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, dto);
  }

  deleteForm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
