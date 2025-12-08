// src/app/views/FormBuilder/forms.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormBuilderDto, CreateFormBuilderDto, UpdateFormBuilderDto } from './form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  private apiUrl = 'https://localhost:7276/api/FormBuilder'; // عدّل حسب الـ API

  constructor(private http: HttpClient) {}

  getForms(): Observable<FormBuilderDto[]> {
    return this.http.get<FormBuilderDto[]>(this.apiUrl);
  }

  getFormById(id: number): Observable<FormBuilderDto> {
    return this.http.get<FormBuilderDto>(`${this.apiUrl}/${id}`);
  }

  createForm(dto: CreateFormBuilderDto): Observable<FormBuilderDto> {
    return this.http.post<FormBuilderDto>(this.apiUrl, dto);
  }

  updateForm(id: number, dto: UpdateFormBuilderDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  deleteForm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
