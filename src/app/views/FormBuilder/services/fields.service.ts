import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormFieldDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  FieldTypeDto
} from '../form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FieldsService {

  private fieldsUrl = 'https://localhost:7276/api/FormFields';
  private fieldTypesUrl = 'https://localhost:7276/api/FieldTypes';

  constructor(private http: HttpClient) {}

  // ================= FIELDS CRUD ================
  
  // الحصول على الحقول حسب formBuilderId و tabId - معالجة response المغلف
  getFields(formBuilderId: number, tabId: number): Observable<FormFieldDto[]> {
    return this.http.get<any>(`${this.fieldsUrl}/tab/${tabId}`).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        // إذا كان response مباشرة array
        return Array.isArray(response) ? response : [];
      }),
      catchError(() => of([]))
    );
  }

  // بديل إذا كان API يحتاج formBuilderId - معالجة response المغلف
  getFieldsByTabId(tabId: number): Observable<FormFieldDto[]> {
    return this.http.get<any>(`${this.fieldsUrl}/tab/${tabId}`).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        // إذا كان response مباشرة array
        return Array.isArray(response) ? response : [];
      }),
      catchError(() => of([]))
    );
  }

  getFieldById(fieldId: number): Observable<FormFieldDto> {
    return this.http.get<any>(`${this.fieldsUrl}/${fieldId}`).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormFieldDto
        return response;
      }),
      catchError(() => of(null as any))
    );
  }

  // إنشاء حقل جديد - معالجة response المغلف
  createField(dto: CreateFormFieldDto): Observable<FormFieldDto> {
    return this.http.post<any>(this.fieldsUrl, dto).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormFieldDto
        return response;
      }),
      catchError((error) => {
        console.error('Error creating field:', error);
        throw error;
      })
    );
  }

  // تحديث حقل - معالجة response المغلف
  updateField(fieldId: number, dto: UpdateFormFieldDto): Observable<FormFieldDto> {
    return this.http.put<any>(`${this.fieldsUrl}/${fieldId}`, dto).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormFieldDto
        return response;
      }),
      catchError((error) => {
        console.error('Error updating field:', error);
        throw error;
      })
    );
  }

  // تحديث حالة الحقل (isActive) فقط - معالجة response المغلف
  updateFieldStatus(fieldId: number, isActive: boolean): Observable<FormFieldDto> {
    return this.http.patch<any>(`${this.fieldsUrl}/${fieldId}/status`, { isActive }).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormFieldDto
        return response;
      }),
      catchError((error) => {
        console.error('Error updating field status:', error);
        throw error;
      })
    );
  }

  // حذف حقل - تحديث ليطابق الكود السابق
  deleteField(fieldId: number): Observable<void> {
    // الكود السابق يحتاج tabId لكن API تحتاج fieldId فقط
    return this.http.delete<void>(`${this.fieldsUrl}/${fieldId}`);
  }

  // بديل إذا كان API يحتاج tabId و fieldId
  deleteFieldWithTab(tabId: number, fieldId: number): Observable<void> {
    // إذا كان API يحتاج tabId
    return this.http.delete<void>(`${this.fieldsUrl}/${fieldId}?tabId=${tabId}`);
  }

  // ================= FIELD TYPES ================
  
  getFieldTypes(): Observable<FieldTypeDto[]> {
    return this.http.get<FieldTypeDto[]>(this.fieldTypesUrl).pipe(
      catchError(() => of([]))
    );
  }

  getFieldTypeById(id: number): Observable<FieldTypeDto> {
    return this.http.get<FieldTypeDto>(`${this.fieldTypesUrl}/${id}`);
  }

  // ================= HELPER METHODS ================
  
  // تصحيح الدوال حسب API الخاص بك
  private handleError<T>(operation = 'operation', result?: T) {
    return (): Observable<T> => {
      return of(result as T);
    };
  }
}