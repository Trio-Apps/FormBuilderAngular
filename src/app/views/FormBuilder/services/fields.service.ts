import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  
  // الحصول على الحقول حسب formBuilderId و tabId (مطابق للكود السابق)
  getFields(formBuilderId: number, tabId: number): Observable<FormFieldDto[]> {
    // إذا كان API يحتاج tabId فقط
    return this.http.get<FormFieldDto[]>(`${this.fieldsUrl}/tab/${tabId}`).pipe(
      catchError(() => of([]))
    );
  }

  // بديل إذا كان API يحتاج formBuilderId
  getFieldsByTabId(tabId: number): Observable<FormFieldDto[]> {
    return this.http.get<FormFieldDto[]>(`${this.fieldsUrl}/tab/${tabId}`).pipe(
      catchError(() => of([]))
    );
  }

  getFieldById(fieldId: number): Observable<FormFieldDto> {
    return this.http.get<FormFieldDto>(`${this.fieldsUrl}/${fieldId}`).pipe(
      catchError(() => of(null as any))
    );
  }

  // إنشاء حقل جديد - مطابق للكود السابق
  createField(dto: any): Observable<FormFieldDto> {
    // استخدام any لأن الكود السابق يرسل createDto كـ any
    return this.http.post<FormFieldDto>(this.fieldsUrl, dto);
  }

  // تحديث حقل - مطابق للكود السابق
  updateField(fieldId: number, dto: UpdateFormFieldDto): Observable<FormFieldDto> {
    // تغيير من void إلى FormFieldDto لأن الكود السابق يتوقع رد
    return this.http.put<FormFieldDto>(`${this.fieldsUrl}/${fieldId}`, dto);
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