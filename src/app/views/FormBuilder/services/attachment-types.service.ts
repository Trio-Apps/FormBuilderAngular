import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AttachmentType,
  CreateAttachmentTypeDto,
  UpdateAttachmentTypeDto
} from '../form-builder/models/attachment-types.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttachmentTypesService {
  private baseUrl = `${environment.apiUrl}/AttachmentTypes`;

  constructor(private http: HttpClient) {}

  /**
   * Get all attachment types
   * GET /api/AttachmentTypes
   */
  getAllAttachmentTypes(): Observable<AttachmentType[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            // ServiceResult format
            return response.data || [];
          }
          // ApiResponse format (fallback)
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching attachment types:', error);
        return of([]);
      })
    );
  }

  /**
   * Get active attachment types only
   * GET /api/AttachmentTypes/active
   */
  getActiveAttachmentTypes(): Observable<AttachmentType[]> {
    return this.http.get<any>(`${this.baseUrl}/active`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            // ServiceResult format
            return response.data || [];
          }
          // ApiResponse format (fallback)
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching active attachment types:', error);
        return of([]);
      })
    );
  }

  /**
   * Get attachment type by ID
   * GET /api/AttachmentTypes/{id}
   */
  getAttachmentTypeById(id: number): Observable<AttachmentType> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            // ServiceResult format
            return response.data || response;
          }
          // Direct response or ApiResponse format
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching attachment type with ID ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Attachment type not found');
        }
        throw error;
      })
    );
  }

  /**
   * Get attachment type by code
   * GET /api/AttachmentTypes/code/{code}
   */
  getAttachmentTypeByCode(code: string): Observable<AttachmentType> {
    return this.http.get<any>(`${this.baseUrl}/code/${encodeURIComponent(code)}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            // ServiceResult format
            return response.data || response;
          }
          // Direct response or ApiResponse format
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching attachment type with code ${code}:`, error);
        if (error.status === 404) {
          throw new Error('Attachment type not found');
        }
        throw error;
      })
    );
  }

  /**
   * Create attachment type
   * POST /api/AttachmentTypes
   */
  createAttachmentType(dto: CreateAttachmentTypeDto): Observable<AttachmentType> {
    // Validate required fields
    if (!dto.name || dto.name.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Attachment type name is required'));
      });
    }

    if (!dto.code || dto.code.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Attachment type code is required'));
      });
    }

    // Set defaults
    const createDto: CreateAttachmentTypeDto = {
      name: dto.name.trim(),
      code: dto.code.trim(),
      description: dto.description?.trim() || undefined,
      maxSizeMB: dto.maxSizeMB ?? 10,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    };

    console.log('[AttachmentTypesService] Creating attachment type with DTO:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          const unwrapped = response.data || response.result || response;
          return unwrapped;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[AttachmentTypesService] Error creating attachment type:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.error?.title || error?.message || `Failed to create attachment type (Status: ${error.status})`;
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update attachment type
   * PUT /api/AttachmentTypes/{id}
   */
  updateAttachmentType(id: number, dto: UpdateAttachmentTypeDto): Observable<AttachmentType> {
    const attachmentTypeId = Number(id);
    if (isNaN(attachmentTypeId) || attachmentTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid attachment type ID: ${id}`));
      });
    }

    // Clean DTO - only include provided fields
    const cleanDto: any = {};
    if (dto.name !== undefined) cleanDto.name = dto.name.trim();
    if (dto.code !== undefined) cleanDto.code = dto.code.trim();
    if (dto.description !== undefined) cleanDto.description = dto.description?.trim() || undefined;
    if (dto.maxSizeMB !== undefined) cleanDto.maxSizeMB = dto.maxSizeMB;
    if (dto.isActive !== undefined) cleanDto.isActive = dto.isActive;

    console.log('[AttachmentTypesService] Updating attachment type:', { id: attachmentTypeId, dto: cleanDto });

    return this.http.put<any>(`${this.baseUrl}/${attachmentTypeId}`, cleanDto, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          const unwrapped = response.data || response.result || response;
          return unwrapped;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[AttachmentTypesService] Error updating attachment type:', error);
        
        // Extract detailed error message
        let errorMessage = 'Failed to update attachment type';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errorMessage) {
            errorMessage = error.error.errorMessage;
          } else if (error.error?.errors) {
            // Handle validation errors
            const errors = error.error.errors;
            if (Array.isArray(errors)) {
              errorMessage = errors.join(', ');
            } else if (typeof errors === 'object') {
              const errorArray: string[] = [];
              for (const key in errors) {
                if (errors.hasOwnProperty(key)) {
                  const propErrors = errors[key];
                  if (Array.isArray(propErrors)) {
                    errorArray.push(`${key}: ${propErrors.join(', ')}`);
                  } else {
                    errorArray.push(`${key}: ${propErrors}`);
                  }
                }
              }
              errorMessage = errorArray.length > 0 ? errorArray.join('; ') : 'Validation error';
            }
          } else if (error.error?.title) {
            errorMessage = error.error.title;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Delete attachment type
   * DELETE /api/AttachmentTypes/{id}
   */
  deleteAttachmentType(id: number): Observable<void> {
    const attachmentTypeId = Number(id);
    if (isNaN(attachmentTypeId) || attachmentTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid attachment type ID: ${id}`));
      });
    }

    return this.http.delete<void>(`${this.baseUrl}/${attachmentTypeId}`).pipe(
      catchError((error) => {
        console.error('[AttachmentTypesService] Error deleting attachment type:', error);

        if (error.status === 404) {
          throw new Error('Attachment type not found');
        }

        // Extract error message from backend response
        const errorResponse = error?.error;
        let errorMessage = 'Failed to delete attachment type';

        if (errorResponse) {
          if (typeof errorResponse === 'string') {
            errorMessage = errorResponse;
          } else if (errorResponse.message) {
            errorMessage = errorResponse.message;
          } else if (errorResponse.errorMessage) {
            errorMessage = errorResponse.errorMessage;
          } else if (errorResponse.title) {
            errorMessage = errorResponse.title;
          } else if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
            errorMessage = errorResponse.errors.join(', ');
          }
        }

        // Check for specific error types
        const errorText = errorMessage.toLowerCase();
        
        // Foreign key constraint
        if (errorText.includes('foreign key') || 
            errorText.includes('constraint') || 
            errorText.includes('reference') ||
            errorText.includes('form_attachment_types')) {
          errorMessage = 'Cannot delete this attachment type because it is used by forms. Please remove it from all forms first.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Toggle attachment type active status
   * PATCH /api/AttachmentTypes/{id}/toggle-active
   */
  toggleAttachmentTypeStatus(id: number, isActive: boolean): Observable<AttachmentType> {
    const attachmentTypeId = Number(id);
    if (isNaN(attachmentTypeId) || attachmentTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid attachment type ID: ${id}`));
      });
    }

    console.log('[AttachmentTypesService] Toggling attachment type status:', { id: attachmentTypeId, isActive });

    return this.http.patch<any>(`${this.baseUrl}/${attachmentTypeId}/toggle-active`, { isActive }).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          const unwrapped = response.data || response.result || response;
          return unwrapped;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[AttachmentTypesService] Error toggling attachment type status:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to toggle attachment type status';
        throw new Error(errorMessage);
      })
    );
  }
}

