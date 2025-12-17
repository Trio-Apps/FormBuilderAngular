import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FieldTypeDto,
  CreateFieldTypeDto,
  UpdateFieldTypeDto
} from '../form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FieldTypesService {

  private fieldTypesUrl = 'https://localhost:7276/api/FieldTypes';

  constructor(private http: HttpClient) {}

  // ================= FIELD TYPES CRUD ================
  
  // Get all field types
  getAllFieldTypes(): Observable<FieldTypeDto[]> {
    return this.http.get<any>(this.fieldTypesUrl).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError(() => of([]))
    );
  }

  // Get active field types only
  getActiveFieldTypes(): Observable<FieldTypeDto[]> {
    return this.getAllFieldTypes().pipe(
      map(types => types.filter(type => type.isActive))
    );
  }

  // Get field type by ID
  getFieldTypeById(id: number): Observable<FieldTypeDto> {
    return this.http.get<any>(`${this.fieldTypesUrl}/${id}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError(() => of(null as any))
    );
  }

  // Create field type
  createFieldType(dto: CreateFieldTypeDto): Observable<FieldTypeDto> {
    return this.http.post<any>(this.fieldTypesUrl, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error creating field type:', error);
        throw error;
      })
    );
  }

  // Update field type
  updateFieldType(id: number, dto: UpdateFieldTypeDto): Observable<FieldTypeDto> {
    return this.http.put<any>(`${this.fieldTypesUrl}/${id}`, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating field type:', error);
        throw error;
      })
    );
  }

  // Delete field type (hard delete)
  deleteFieldType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.fieldTypesUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error deleting field type:', error);
        throw error;
      })
    );
  }

  // Soft delete field type (update isActive to false)
  softDeleteFieldType(id: number): Observable<FieldTypeDto> {
    return this.updateFieldType(id, { isActive: false });
  }

  // Toggle field type status
  toggleFieldTypeStatus(id: number, isActive: boolean): Observable<FieldTypeDto> {
    return this.updateFieldType(id, { isActive });
  }
}
