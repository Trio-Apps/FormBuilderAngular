import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
    // Validate required fields
    if (!dto.typeName || dto.typeName.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Type name is required'));
      });
    }

    console.log('[createFieldType] Creating field type with DTO:', dto);
    console.log('[createFieldType] Request URL:', this.fieldTypesUrl);
    console.log('[createFieldType] Request body:', JSON.stringify(dto));

    return this.http.post<any>(this.fieldTypesUrl, dto).pipe(
      map((response: any) => {
        console.log('[createFieldType] Raw response:', response);
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          const unwrapped = response.data || response.result || response;
          console.log('[createFieldType] Unwrapped response:', unwrapped);
          return unwrapped;
        }
        console.log('[createFieldType] Direct response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('[createFieldType] Error creating field type:', error);
        console.error('[createFieldType] Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url,
          dto: dto,
          requestBody: JSON.stringify(dto)
        });
        throw error;
      })
    );
  }

  // Update field type
  updateFieldType(id: number, dto: UpdateFieldTypeDto): Observable<FieldTypeDto> {
    // Ensure ID is a valid number
    const fieldTypeId = Number(id);
    if (isNaN(fieldTypeId) || fieldTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid field type ID: ${id}`));
      });
    }

    return this.http.put<any>(`${this.fieldTypesUrl}/${fieldTypeId}`, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating field type:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url,
          fieldTypeId: fieldTypeId,
          dto: dto
        });
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

  // Toggle field type status - Try dedicated status endpoint first, fallback to full update
  toggleFieldTypeStatus(id: number, isActive: boolean): Observable<FieldTypeDto> {
    // Ensure ID is a valid number
    const fieldTypeId = Number(id);
    if (isNaN(fieldTypeId) || fieldTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid field type ID: ${id}`));
      });
    }

    console.log('[toggleFieldTypeStatus] Toggling field type status:', { fieldTypeId, isActive });

    // Try dedicated status endpoint first (PATCH /api/FieldTypes/{id}/status)
    return this.http.patch<any>(`${this.fieldTypesUrl}/${fieldTypeId}/status`, { isActive }).pipe(
      map((response: any) => {
        console.log('[toggleFieldTypeStatus] Status updated successfully via status endpoint:', response);
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[toggleFieldTypeStatus] Error using status endpoint, trying full update:', error);
        
        // Fallback: use full update with isActive
        // Get the current field type first to include all required fields
        return this.getFieldTypeById(fieldTypeId).pipe(
          switchMap((currentFieldType) => {
            if (!currentFieldType) {
              throw new Error('Field type not found');
            }
            
            // Create update DTO with all current values plus new isActive
            const updateDto: UpdateFieldTypeDto = {
              typeName: currentFieldType.typeName,
              description: currentFieldType.description,
              dataType: currentFieldType.dataType,
              maxLength: currentFieldType.maxLength,
              hasOptions: currentFieldType.hasOptions,
              allowMultiple: currentFieldType.allowMultiple,
              isActive: isActive
            };
            
            console.log('[toggleFieldTypeStatus] Using full update fallback with DTO:', updateDto);
            return this.updateFieldType(fieldTypeId, updateDto);
          }),
          catchError((finalError) => {
            console.error('[toggleFieldTypeStatus] Final error toggling field type status:', finalError);
            console.error('[toggleFieldTypeStatus] Error details:', {
              status: finalError.status,
              statusText: finalError.statusText,
              error: finalError.error,
              message: finalError.message,
              url: finalError.url,
              fieldTypeId: fieldTypeId,
              isActive: isActive
            });
            throw finalError;
          })
        );
      })
    );
  }
}
