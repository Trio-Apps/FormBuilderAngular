import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FormBuilderDto,
  CreateFormBuilderDto,
  UpdateFormBuilderDto,
  FormTabDto,
  CreateFormTabDto,
  UpdateFormTabDto,
  FormFieldDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  FieldTypeDto
} from './form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  private baseUrl = 'https://localhost:7276/api';
  private formBuilderUrl = `${this.baseUrl}/FormBuilder`;
  private formTabsUrl = `${this.baseUrl}/FormTabs`;
  private formFieldsUrl = `${this.baseUrl}/FormFields`;
    private fieldTypesUrl = `${this.baseUrl}/FieldTypes`;


  constructor(private http: HttpClient) {}

  // ==================== FORMS ====================
  getForms(): Observable<FormBuilderDto[]> {
    return this.http.get<FormBuilderDto[]>(this.formBuilderUrl).pipe(
      catchError(error => {
        console.error('Error loading forms:', error);
        return of([]);
      })
    );
  }

  getFormById(id: number): Observable<FormBuilderDto> {
    return this.http.get<FormBuilderDto>(`${this.formBuilderUrl}/${id}`);
  }

  createForm(dto: CreateFormBuilderDto): Observable<FormBuilderDto> {
    return this.http.post<FormBuilderDto>(this.formBuilderUrl, dto);
  }

  updateForm(id: number, dto: UpdateFormBuilderDto): Observable<void> {
    return this.http.put<void>(`${this.formBuilderUrl}/${id}`, dto);
  }

  deleteForm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.formBuilderUrl}/${id}`);
  }

  // ==================== TABS ====================
  getTabs(formId: number): Observable<FormTabDto[]> {
    // جرب عدة endpoints
    return this.http.get<FormTabDto[]>(`${this.formTabsUrl}/form/${formId}`).pipe(
      catchError(error => {
        console.log('Trying alternative endpoint...');
        // جرب endpoint آخر
        return this.http.get<FormTabDto[]>(`${this.formTabsUrl}?formId=${formId}`).pipe(
          catchError(error2 => {
            console.log('All endpoints failed, returning empty array');
            return of([]); // ارجع مصفوفة فارغة
          })
        );
      })
    );
  }

  getTabById(formId: number, tabId: number): Observable<FormTabDto> {
    return this.http.get<FormTabDto>(`${this.formTabsUrl}/${tabId}`);
  }

  createTab(dto: CreateFormTabDto): Observable<FormTabDto> {
    return this.http.post<FormTabDto>(this.formTabsUrl, dto);
  }

  updateTab(formId: number, tabId: number, dto: UpdateFormTabDto): Observable<void> {
    return this.http.put<void>(`${this.formTabsUrl}/${tabId}`, dto);
  }

  deleteTab(formId: number, tabId: number): Observable<void> {
    return this.http.delete<void>(`${this.formTabsUrl}/${tabId}`);
  }

  // ==================== FIELDS ====================
  getFields(formId: number, tabId: number): Observable<FormFieldDto[]> {
    return this.http.get<FormFieldDto[]>(`${this.formFieldsUrl}/tab/${tabId}`).pipe(
      catchError(error => {
        console.log('Error loading fields, returning empty array');
        return of([]);
      })
    );
  }

  getFieldById(formId: number, tabId: number, fieldId: number): Observable<FormFieldDto> {
    return this.http.get<FormFieldDto>(`${this.formFieldsUrl}/${fieldId}`);
  }

  createField(dto: CreateFormFieldDto): Observable<FormFieldDto> {
    return this.http.post<FormFieldDto>(this.formFieldsUrl, dto);
  }

  updateField(tabId: number, fieldId: number, dto: UpdateFormFieldDto): Observable<void> {
    return this.http.put<void>(`${this.formFieldsUrl}/${fieldId}`, dto);
  }

  deleteField(tabId: number, fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.formFieldsUrl}/${fieldId}`);
  }

  // ==================== FIELD TYPES ====================
    // جلب نوع حقل محدد
  getFieldTypeById(id: number): Observable<FieldTypeDto> {
    return this.http.get<FieldTypeDto>(`${this.fieldTypesUrl}/${id}`);
  }
    getFieldTypes(): Observable<FieldTypeDto[]> {
    return this.http.get<FieldTypeDto[]>(this.fieldTypesUrl).pipe(
      catchError(error => {
        console.error('Error loading field types from API:', error);
        return of([]); // ارجع مصفوفة فارغة إذا حدث خطأ
      })
    );
  }

}