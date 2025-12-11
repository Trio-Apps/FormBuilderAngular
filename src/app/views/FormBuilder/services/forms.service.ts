import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FormBuilderDto,
  CreateFormBuilderDto,
  UpdateFormBuilderDto
} from '../form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  private baseUrl = 'https://localhost:7276/api/FormBuilder';

  constructor(private http: HttpClient) {}

  getForms(): Observable<FormBuilderDto[]> {
    return this.http.get<FormBuilderDto[]>(this.baseUrl).pipe(
      catchError(error => {
        console.error('Error loading forms:', error);
        return of([]);
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
