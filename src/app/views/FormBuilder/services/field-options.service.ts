import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FieldOptionDto,
  CreateFieldOptionDto,
  UpdateFieldOptionDto
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FieldOptionsService {

  private fieldOptionsUrl = `${environment.apiUrl}/FieldOptions`;

  constructor(private http: HttpClient) {}

  // ================= FIELD OPTIONS CRUD ================
  
  // Get all field options
  getAllFieldOptions(): Observable<FieldOptionDto[]> {
    return this.http.get<any>(this.fieldOptionsUrl).pipe(
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

  // Get field options by field ID
  getFieldOptionsByFieldId(fieldId: number): Observable<FieldOptionDto[]> {
    return this.http.get<any>(`${this.fieldOptionsUrl}/field/${fieldId}`).pipe(
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

  // Get active field options by field ID
  getActiveFieldOptionsByFieldId(fieldId: number): Observable<FieldOptionDto[]> {
    return this.http.get<any>(`${this.fieldOptionsUrl}/field/${fieldId}/active`).pipe(
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

  // Get field option by ID
  getFieldOptionById(id: number): Observable<FieldOptionDto> {
    return this.http.get<any>(`${this.fieldOptionsUrl}/${id}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError(() => of(null as any))
    );
  }

  // Create field option
  createFieldOption(dto: CreateFieldOptionDto): Observable<FieldOptionDto> {
    return this.http.post<any>(this.fieldOptionsUrl, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error creating field option:', error);
        throw error;
      })
    );
  }

  // Create bulk field options
  createBulkFieldOptions(dtos: CreateFieldOptionDto[]): Observable<FieldOptionDto[]> {
    return this.http.post<any>(`${this.fieldOptionsUrl}/bulk`, dtos).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error creating bulk field options:', error);
        throw error;
      })
    );
  }

  // Update field option
  updateFieldOption(id: number, dto: UpdateFieldOptionDto): Observable<FieldOptionDto> {
    return this.http.put<any>(`${this.fieldOptionsUrl}/${id}`, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating field option:', error);
        throw error;
      })
    );
  }

  // Delete field option (hard delete)
  deleteFieldOption(id: number): Observable<void> {
    return this.http.delete<void>(`${this.fieldOptionsUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error deleting field option:', error);
        throw error;
      })
    );
  }

  // Soft delete field option
  softDeleteFieldOption(id: number): Observable<void> {
    return this.http.delete<void>(`${this.fieldOptionsUrl}/${id}/soft`).pipe(
      catchError((error) => {
        console.error('Error soft deleting field option:', error);
        throw error;
      })
    );
  }
}
