import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormFieldDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  FieldTypeDto
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';
import { FieldTypesService } from './field-types.service';

@Injectable({
  providedIn: 'root'
})
export class FieldsService {

  private fieldsUrl = `${environment.apiUrl}/FormFields`;

  constructor(
    private http: HttpClient,
    private fieldTypesService: FieldTypesService
  ) {}

  // ================= FIELDS CRUD ================
  
  // الحصول على الحقول حسب formBuilderId و tabId - معالجة response المغلف
  getFields(formBuilderId: number, tabId: number): Observable<FormFieldDto[]> {
    // استخدام المسار الصحيح: /api/FormFields/tab/{tabId}
    return this.http.get<any>(`${this.fieldsUrl}/tab/${tabId}`).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        let fields: any[] = [];
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          fields = Array.isArray(data) ? data : [];
        } else if (Array.isArray(response)) {
          fields = response;
        }

        // Normalize field properties - handle both camelCase and PascalCase property names
        return fields.map((field: any) => {
          // Normalize calculation properties
          if (!field.expressionText && field.ExpressionText) {
            field.expressionText = field.ExpressionText;
          }
          if (!field.calculationMode && field.CalculationMode) {
            field.calculationMode = field.CalculationMode;
          }
          if (!field.recalculateOn && field.RecalculateOn) {
            field.recalculateOn = field.RecalculateOn;
          }
          if (!field.resultType && field.ResultType) {
            field.resultType = field.ResultType;
          }
          return field as FormFieldDto;
        });
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
        let fields: any[] = [];
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          fields = Array.isArray(data) ? data : [];
        } else if (Array.isArray(response)) {
          fields = response;
        }

        // Normalize field properties - handle both camelCase and PascalCase property names
        return fields.map((field: any) => {
          // Normalize calculation properties
          if (!field.expressionText && field.ExpressionText) {
            field.expressionText = field.ExpressionText;
          }
          if (!field.calculationMode && field.CalculationMode) {
            field.calculationMode = field.CalculationMode;
          }
          if (!field.recalculateOn && field.RecalculateOn) {
            field.recalculateOn = field.RecalculateOn;
          }
          if (!field.resultType && field.ResultType) {
            field.resultType = field.ResultType;
          }
          return field as FormFieldDto;
        });
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
        let field: any = null;
        if (response && typeof response === 'object' && !response.id) {
          field = response.data || response.result || response;
        } else {
          field = response;
        }

        // Normalize calculation properties - handle both camelCase and PascalCase property names
        if (field) {
          if (!field.expressionText && field.ExpressionText) {
            field.expressionText = field.ExpressionText;
          }
          if (!field.calculationMode && field.CalculationMode) {
            field.calculationMode = field.CalculationMode;
          }
          if (!field.recalculateOn && field.RecalculateOn) {
            field.recalculateOn = field.RecalculateOn;
          }
          if (!field.resultType && field.ResultType) {
            field.resultType = field.ResultType;
          }
        }

        return field as FormFieldDto;
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

  /**
   * Delete field (Hard Delete)
   * DELETE /api/FormFields/{id}
   * 
   * Description: Hard Delete (حذف نهائي)
   * Response: 204 No Content
   * 
   * @param fieldId Field ID
   * @returns Observable<void>
   */
  deleteField(fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.fieldsUrl}/${fieldId}`);
  }

  /**
   * Delete field with tab ID (alternative endpoint if needed)
   * DELETE /api/FormFields/{id}?tabId={tabId}
   * 
   * @param tabId Tab ID
   * @param fieldId Field ID
   * @returns Observable<void>
   */
  deleteFieldWithTab(tabId: number, fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.fieldsUrl}/${fieldId}?tabId=${tabId}`);
  }

  /**
   * Soft delete field
   * DELETE /api/FormFields/{id}/soft
   * 
   * Description: يحذف Field باستخدام Soft Delete (IsDeleted = true)
   * Response: 204 No Content
   * 
   * @param id Field ID
   * @param deletedByUserId Optional user ID who deleted the field
   * @returns Observable<void>
   */
  softDelete(id: number, deletedByUserId?: string): Observable<void> {
    const fieldId = Number(id);
    if (isNaN(fieldId) || fieldId <= 0) {
      return throwError(() => new Error(`Invalid field ID: ${id}`));
    }

    console.log('[FieldsService] Soft deleting field:', { id: fieldId, deletedByUserId });

    const params: any = {};
    if (deletedByUserId) {
      params.deletedByUserId = deletedByUserId;
    }

    return this.http.delete<any>(`${this.fieldsUrl}/${fieldId}/soft`, { params }).pipe(
      map(() => {
        console.log('[FieldsService] Field soft deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[FieldsService] Error soft deleting field:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to soft delete field';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Restore soft-deleted field
   * POST /api/FormFields/{id}/restore
   * 
   * Description: يستعيد Field محذوف (IsDeleted = false)
   * Response: 200 OK (FormFieldDto)
   * 
   * @param id Field ID
   * @returns Observable<FormFieldDto>
   */
  restore(id: number): Observable<FormFieldDto> {
    const fieldId = Number(id);
    if (isNaN(fieldId) || fieldId <= 0) {
      return throwError(() => new Error(`Invalid field ID: ${id}`));
    }

    console.log('[FieldsService] Restoring field:', { id: fieldId });

    return this.http.post<any>(`${this.fieldsUrl}/${fieldId}/restore`, {}).pipe(
      map((response: any) => {
        console.log('[FieldsService] Field restored successfully');
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[FieldsService] Error restoring field:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to restore field';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // ================= FIELD TYPES ================
  
  getFieldTypes(): Observable<FieldTypeDto[]> {
    // Use FieldTypesService to get static field types
    return this.fieldTypesService.getAllFieldTypes();
  }

  getFieldTypeById(id: number): Observable<FieldTypeDto | null> {
    // Use FieldTypesService to get static field type by ID
    return this.fieldTypesService.getFieldTypeById(id);
  }

  // ================= HELPER METHODS ================
  
  // تصحيح الدوال حسب API الخاص بك
  private handleError<T>(operation = 'operation', result?: T) {
    return (): Observable<T> => {
      return of(result as T);
    };
  }
}