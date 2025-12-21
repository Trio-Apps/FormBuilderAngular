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
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FieldsService {

  private fieldsUrl = `${environment.apiUrl}/FormFields`;
  private fieldTypesUrl = `${environment.apiUrl}/FieldTypes`;

  constructor(private http: HttpClient) {}

  // ================= FIELDS CRUD ================
  
  // الحصول على الحقول حسب formBuilderId و tabId - معالجة response المغلف
  getFields(formBuilderId: number, tabId: number): Observable<FormFieldDto[]> {
    // استخدام المسار الصحيح: /api/FormFields/tab/{tabId}
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
      catchError((error) => {
        console.warn(`Failed to get fields for tab ${tabId}:`, error);
        return of([]);
      })
    );
  }

  // بديل إذا كان API يحتاج formBuilderId - معالجة response المغلف
  getFieldsByTabId(tabId: number): Observable<FormFieldDto[]> {
    // استخدام المسار الصحيح: /api/FormFields/tab/{tabId}
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
      catchError((error) => {
        console.warn(`Failed to get fields for tab ${tabId}:`, error);
        return of([]);
      })
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
        // Log detailed error information
        if (error.error) {
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.error.message || error.error.title || error.message,
            errors: error.error.errors || error.error,
            dto: dto
          });
        }
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
    return this.http.get<any>(this.fieldTypesUrl).pipe(
      map((response: any) => {
        // Handle wrapped response
        let types: any[] = [];
        
        if (Array.isArray(response)) {
          types = response;
        } else if (response && typeof response === 'object') {
          const data = response.data || response.items || response.result || [];
          types = Array.isArray(data) ? data : [];
        }
        
        // Map and normalize field types to ensure typeName is set correctly
        return types.map((type: any) => {
          // Ensure typeName is set from type_name_en if typeName is missing
          if (!type.typeName && type.type_name_en) {
            type.typeName = type.type_name_en;
          }
          // Ensure foreignTypeName is set from type_name_ar if foreignTypeName is missing
          if (!type.foreignTypeName && type.type_name_ar) {
            type.foreignTypeName = type.type_name_ar;
          }
          // Ensure boolean fields have default values
          if (type.hasOptions === undefined) {
            type.hasOptions = false;
          }
          if (type.allowMultiple === undefined) {
            type.allowMultiple = false;
          }
          if (type.isActive === undefined) {
            type.isActive = true;
          }
          return type as FieldTypeDto;
        });
      }),
      catchError((error) => {
        console.error('Error loading field types:', error);
        return of([]);
      })
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