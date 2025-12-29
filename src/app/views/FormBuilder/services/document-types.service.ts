import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  DocumentType,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  DocumentSeries,
  CreateDocumentSeriesDto,
  UpdateDocumentSeriesDto
} from '../form-builder/models/document-types.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentTypesService {
  private baseUrl = `${environment.apiUrl}/DocumentTypes`;
  private documentSeriesUrl = `${environment.apiUrl}/DocumentSeries`;

  constructor(private http: HttpClient) {}

  // ================= DOCUMENT TYPES CRUD ================
  
  /**
   * Get all document types
   * GET /api/DocumentTypes
   * Response: ServiceResult<IEnumerable<DocumentTypeDto>>
   */
  getAllDocumentTypes(): Observable<DocumentType[]> {
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
        console.error('Error fetching document types:', error);
        // Re-throw the error so the component can handle it
        throw error;
      })
    );
  }

  /**
   * Get active document types only
   * GET /api/DocumentTypes/active
   * Response: ServiceResult<IEnumerable<DocumentTypeDto>>
   */
  getActiveDocumentTypes(): Observable<DocumentType[]> {
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
        console.error('Error fetching active document types:', error);
        return of([]);
      })
    );
  }

  /**
   * Get document type by FormBuilderId
   * Uses getAllDocumentTypes and filters by formBuilderId
   */
  getDocumentTypeByFormId(formBuilderId: number): Observable<DocumentType | null> {
    return this.getAllDocumentTypes().pipe(
      map((types: DocumentType[]) => {
        const docType = types.find(t => t.formBuilderId === formBuilderId);
        return docType || null;
      }),
      catchError((error) => {
        console.error(`Error fetching document type for FormBuilderId ${formBuilderId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Get document types by parent menu ID
   * GET /api/DocumentTypes/parent-menu/{parentMenuId}
   * GET /api/DocumentTypes/parent-menu/null for root items
   * Response: ServiceResult<IEnumerable<DocumentTypeDto>>
   */
  getDocumentTypesByParentMenuId(parentMenuId: number | null): Observable<DocumentType[]> {
    const url = parentMenuId === null 
      ? `${this.baseUrl}/parent-menu/null`
      : `${this.baseUrl}/parent-menu/${parentMenuId}`;
    
    return this.http.get<any>(url).pipe(
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
        console.error(`Error fetching document types by parent menu ID ${parentMenuId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get document type by ID
   * GET /api/DocumentTypes/{id}
   * Response: ServiceResult<DocumentTypeDto>
   */
  getDocumentTypeById(id: number): Observable<DocumentType> {
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
        console.error(`Error fetching document type with ID ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Document type not found');
        }
        throw error;
      })
    );
  }

  /**
   * Create document type
   * POST /api/DocumentTypes
   */
  createDocumentType(dto: CreateDocumentTypeDto): Observable<DocumentType> {
    // Validate required fields
    if (!dto.name || dto.name.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Document type name is required'));
      });
    }

    if (!dto.code || dto.code.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Document type code is required'));
      });
    }

    if (!dto.menuCaption || dto.menuCaption.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Menu caption is required'));
      });
    }

    console.log('[DocumentTypesService] Creating document type with DTO:', dto);
    console.log('[DocumentTypesService] DTO JSON:', JSON.stringify(dto, null, 2));
    console.log('[DocumentTypesService] Request URL:', this.baseUrl);

    return this.http.post<any>(this.baseUrl, dto).pipe(
      map((response: any) => {
        console.log('[DocumentTypesService] Raw response:', response);
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          const unwrapped = response.data || response.result || response;
          console.log('[DocumentTypesService] Unwrapped response:', unwrapped);
          return unwrapped;
        }
        console.log('[DocumentTypesService] Direct response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error creating document type:', error);
        console.error('[DocumentTypesService] Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.error?.title || error?.message || `Failed to create document type (Status: ${error.status})`;
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update document type
   * PUT /api/DocumentTypes/{id}
   */
  updateDocumentType(id: number, dto: UpdateDocumentTypeDto): Observable<void> {
    // Ensure ID is a valid number
    const documentTypeId = Number(id);
    if (isNaN(documentTypeId) || documentTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid document type ID: ${id}`));
      });
    }

    // Ensure null values are properly serialized (JSON.stringify will convert null to "null")
    const cleanDto: any = { ...dto };
    
    // Explicitly handle parentMenuId - ensure it's sent correctly
    if (dto.parentMenuId === null) {
      cleanDto.parentMenuId = null;
    } else if (dto.parentMenuId === 0) {
      cleanDto.parentMenuId = 0; // Some backends use 0 instead of null
    } else if (dto.parentMenuId === undefined) {
      // Don't include undefined fields
      delete cleanDto.parentMenuId;
    }

    console.log('[DocumentTypesService] Updating document type:', { id: documentTypeId, dto: cleanDto });
    console.log('[DocumentTypesService] DTO JSON:', JSON.stringify(cleanDto, null, 2));
    console.log('[DocumentTypesService] parentMenuId value:', cleanDto.parentMenuId, 'type:', typeof cleanDto.parentMenuId);

    return this.http.put<any>(`${this.baseUrl}/${documentTypeId}`, cleanDto, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(() => {
        console.log('[DocumentTypesService] Document type updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error updating document type:', error);
        console.error('[DocumentTypesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url,
          fullError: JSON.stringify(error, null, 2)
        });
        
        // Extract detailed error message from various possible formats
        let errorMessage = 'Failed to update document type';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errorMessage) {
            errorMessage = error.error.errorMessage;
          } else if (error.error?.errors) {
            // Handle validation errors (array or object) - ProblemDetails format
            const errors = error.error.errors;
            if (Array.isArray(errors)) {
              errorMessage = errors.join(', ');
            } else if (typeof errors === 'object') {
              // Handle object with property names as keys
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
          } else {
            // Try to stringify the entire error object for debugging
            try {
              const errorStr = JSON.stringify(error.error, null, 2);
              console.error('[DocumentTypesService] Full error object:', errorStr);
              if (errorStr && errorStr.length < 500) {
                errorMessage = `Backend error: ${errorStr}`;
              }
            } catch (e) {
              // Ignore JSON stringify errors
            }
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        console.error('[DocumentTypesService] Extracted error message:', errorMessage);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Check if document type has children (used as parent menu)
   * Returns true if there are document types that have this ID as parentMenuId
   */
  hasChildDocumentTypes(id: number): Observable<boolean> {
    return this.getDocumentTypesByParentMenuId(id).pipe(
      map((children: DocumentType[]) => {
        return children.length > 0;
      }),
      catchError((error) => {
        console.error(`Error checking for child document types for ID ${id}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Delete document type (hard delete)
   * DELETE /api/DocumentTypes/{id}
   * Note: Will fail if there are child document types referencing this as parent
   */
  deleteDocumentType(id: number): Observable<void> {
    const documentTypeId = Number(id);
    if (isNaN(documentTypeId) || documentTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid document type ID: ${id}`));
      });
    }

    return this.http.delete<void>(`${this.baseUrl}/${documentTypeId}`).pipe(
      catchError((error) => {
        console.error('[DocumentTypesService] Error deleting document type:', error);
        console.error('[DocumentTypesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url
        });

        if (error.status === 404) {
          throw new Error('Document type not found');
        }

        // Extract error message from backend response
        const errorResponse = error?.error;
        let errorMessage = 'Failed to delete document type';

        // Try to extract message from various response formats
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
        
        // Foreign key constraint - children exist
        if (errorText.includes('foreign key') || 
            errorText.includes('constraint') || 
            errorText.includes('parentmenuid') || 
            errorText.includes('same table reference') ||
            errorText.includes('children') ||
            errorText.includes('child document type')) {
          errorMessage = 'Cannot delete this document type because it is used as a parent menu for other document types. Please remove or reassign the child document types first.';
        }
        
        // Submissions exist
        if (errorText.includes('submission') || errorText.includes('form submission')) {
          errorMessage = 'Cannot delete this document type because it has associated form submissions. Please delete the submissions first.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Toggle document type active status
   * Uses update method to toggle isActive
   */
  toggleDocumentTypeStatus(id: number, isActive: boolean): Observable<void> {
    return this.updateDocumentType(id, { isActive });
  }

  // ================= DOCUMENT SERIES CRUD ================

  /**
   * Get all document series
   * GET /api/DocumentSeries
   * Response: ApiResponse
   */
  getAllDocumentSeries(): Observable<DocumentSeries[]> {
    return this.http.get<any>(this.documentSeriesUrl).pipe(
      map((response: any) => {
        // Handle ApiResponse format
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          // ApiResponse format: { statusCode, message, data }
          if (response.statusCode !== undefined) {
            return response.data || [];
          }
          // ServiceResult format (fallback)
          if (response.success !== undefined) {
            return response.data || [];
          }
          // Other formats
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching all document series:', error);
        if (error.status === 404) {
          return of([]);
        }
        return of([]);
      })
    );
  }

  /**
   * Get all document series for a document type
   * GET /api/DocumentSeries/document-type/{documentTypeId}
   * Response: ApiResponse
   */
  getDocumentSeriesByDocumentTypeId(documentTypeId: number): Observable<DocumentSeries[]> {
    return this.http.get<any>(`${this.documentSeriesUrl}/document-type/${documentTypeId}`).pipe(
      map((response: any) => {
        // Handle ApiResponse format
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          // ApiResponse format: { statusCode, message, data }
          if (response.statusCode !== undefined) {
            return response.data || [];
          }
          // ServiceResult format (fallback)
          if (response.success !== undefined) {
            return response.data || [];
          }
          // Other formats
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error(`Error fetching document series for document type ${documentTypeId}:`, error);
        if (error.status === 404) {
          return of([]); // Return empty array if no series found
        }
        return of([]);
      })
    );
  }

  /**
   * Get document series by ID
   * GET /api/DocumentSeries/{id}
   * Response: ApiResponse
   */
  getDocumentSeriesById(id: number): Observable<DocumentSeries> {
    return this.http.get<any>(`${this.documentSeriesUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle ApiResponse format
        if (response && typeof response === 'object') {
          // ApiResponse format: { statusCode, message, data }
          if (response.statusCode !== undefined) {
            return response.data || response;
          }
          // ServiceResult format (fallback)
          if (response.success !== undefined) {
            return response.data || response;
          }
          // Direct response
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching document series with ID ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Document series not found');
        }
        throw error;
      })
    );
  }

  /**
   * Create document series
   * POST /api/DocumentSeries
   * Response: ApiResponse
   */
  createDocumentSeries(dto: CreateDocumentSeriesDto): Observable<DocumentSeries> {
    // Validate required fields
    if (!dto.documentTypeId || dto.documentTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error('Document type ID is required'));
      });
    }

    if (!dto.projectId || dto.projectId <= 0) {
      return new Observable(observer => {
        observer.error(new Error('Project ID is required'));
      });
    }

    if (!dto.seriesCode || dto.seriesCode.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Series code is required'));
      });
    }

    // Set defaults according to API documentation
    const createDto: CreateDocumentSeriesDto = {
      documentTypeId: dto.documentTypeId,
      projectId: dto.projectId,
      seriesCode: dto.seriesCode.trim(),
      nextNumber: dto.nextNumber !== undefined && dto.nextNumber !== null ? dto.nextNumber : 1,
      isDefault: dto.isDefault !== undefined ? dto.isDefault : false,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    };

    console.log('[DocumentTypesService] Creating document series with DTO:', createDto);

    return this.http.post<any>(this.documentSeriesUrl, createDto).pipe(
      map((response: any) => {
        // Handle ApiResponse format
        if (response && typeof response === 'object') {
          // ApiResponse format: { statusCode, message, data }
          if (response.statusCode !== undefined) {
            return response.data || response;
          }
          // ServiceResult format (fallback)
          if (response.success !== undefined) {
            return response.data || response;
          }
          // Direct response
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error creating document series:', error);
        console.error('[DocumentTypesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url
        });

        // Extract error message from backend response
        const errorResponse = error?.error;
        let errorMessage = `Failed to create document series (Status: ${error.status})`;

        // Try to extract message from various response formats (ASP.NET Core ProblemDetails format)
        if (errorResponse) {
          // Check for detail first (most specific message in ProblemDetails)
          if (errorResponse.detail) {
            errorMessage = errorResponse.detail;
          } 
          // Check for message
          else if (errorResponse.message) {
            errorMessage = errorResponse.message;
          } 
          // Check for errorMessage
          else if (errorResponse.errorMessage) {
            errorMessage = errorResponse.errorMessage;
          } 
          // Check for title
          else if (errorResponse.title) {
            errorMessage = errorResponse.title;
          } 
          // Check for string response
          else if (typeof errorResponse === 'string') {
            errorMessage = errorResponse;
          } 
          // Check for validation errors array
          else if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
            errorMessage = errorResponse.errors.join(', ');
          }
          // Check for validation errors object (ASP.NET Core format: { "fieldName": ["error1", "error2"] })
          else if (errorResponse.errors && typeof errorResponse.errors === 'object') {
            const errors: { [key: string]: string[] } = errorResponse.errors;
            const errorDetails: string[] = [];
            for (const [field, messages] of Object.entries(errors)) {
              if (Array.isArray(messages)) {
                messages.forEach(msg => errorDetails.push(msg));
              } else {
                errorDetails.push(String(messages));
              }
            }
            if (errorDetails.length > 0) {
              errorMessage = errorDetails.join(', ');
            }
          }
        }

        // Check for specific error types and provide user-friendly messages
        const errorText = errorMessage.toLowerCase();
        
        // Duplicate code
        if (errorText.includes('duplicate') || errorText.includes('already exists') || 
            (errorText.includes('code') && (errorText.includes('exists') || errorText.includes('duplicate')))) {
          errorMessage = 'A document series with this code already exists for this document type and project. Please use a different code.';
        }
        
        // Invalid project
        if (errorText.includes('project') && (errorText.includes('not found') || errorText.includes('invalid'))) {
          errorMessage = 'The selected project is invalid or not found. Please select a valid project.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update document series
   * PUT /api/DocumentSeries/{id}
   * Response: ApiResponse
   */
  updateDocumentSeries(id: number, dto: UpdateDocumentSeriesDto): Observable<void> {
    const seriesId = Number(id);
    if (isNaN(seriesId) || seriesId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid document series ID: ${id}`));
      });
    }

    console.log('[DocumentTypesService] Updating document series:', { id: seriesId, dto });

    return this.http.put<any>(`${this.documentSeriesUrl}/${seriesId}`, dto).pipe(
      map(() => {
        console.log('[DocumentTypesService] Document series updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error updating document series:', error);
        console.error('[DocumentTypesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url
        });

        // Extract error message from backend response
        const errorResponse = error?.error;
        let errorMessage = 'Failed to update document series';

        // Try to extract message from various response formats
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
        
        // Duplicate code
        if (errorText.includes('duplicate') || errorText.includes('already exists') || errorText.includes('code')) {
          errorMessage = 'A document series with this code already exists for this document type and project. Please use a different code.';
        }
        
        // Invalid project
        if (errorText.includes('project') && (errorText.includes('not found') || errorText.includes('invalid'))) {
          errorMessage = 'The selected project is invalid or not found. Please select a valid project.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Delete document series
   * DELETE /api/DocumentSeries/{id}
   * Response: ApiResponse
   */
  deleteDocumentSeries(id: number): Observable<void> {
    const seriesId = Number(id);
    if (isNaN(seriesId) || seriesId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid document series ID: ${id}`));
      });
    }

    return this.http.delete<any>(`${this.documentSeriesUrl}/${seriesId}`).pipe(
      map(() => {
        console.log('[DocumentTypesService] Document series deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error deleting document series:', error);
        console.error('[DocumentTypesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url
        });

        if (error.status === 404) {
          throw new Error('Document series not found');
        }

        // Extract error message from backend response
        const errorResponse = error?.error;
        let errorMessage = 'Failed to delete document series';

        // Try to extract message from various response formats
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
        
        // Submissions exist
        if (errorText.includes('submission') || errorText.includes('form submission')) {
          errorMessage = 'Cannot delete this document series because it has associated form submissions. Please delete the submissions first.';
        }
        
        // Foreign key constraint
        if (errorText.includes('foreign key') || errorText.includes('constraint')) {
          errorMessage = 'Cannot delete this document series because it is referenced by other records. Please remove the references first.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Toggle document series active status
   * PATCH /api/DocumentSeries/{id}/toggle-active
   * Request Body: boolean (true/false)
   * Response: ApiResponse
   */
  toggleDocumentSeriesStatus(id: number, isActive: boolean): Observable<void> {
    const seriesId = Number(id);
    if (isNaN(seriesId) || seriesId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid document series ID: ${id}`));
      });
    }

    console.log('[DocumentTypesService] Toggling document series status:', { id: seriesId, isActive });

    return this.http.patch<any>(`${this.documentSeriesUrl}/${seriesId}/toggle-active`, isActive).pipe(
      map(() => {
        console.log('[DocumentTypesService] Document series status toggled successfully');
        return;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error toggling document series status:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to toggle document series status';
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Set document series as default
   * PATCH /api/DocumentSeries/{id}/set-default
   * Response: ApiResponse
   */
  setDocumentSeriesAsDefault(id: number): Observable<void> {
    const seriesId = Number(id);
    if (isNaN(seriesId) || seriesId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid document series ID: ${id}`));
      });
    }

    console.log('[DocumentTypesService] Setting document series as default:', seriesId);

    return this.http.patch<any>(`${this.documentSeriesUrl}/${seriesId}/set-default`, null).pipe(
      map(() => {
        console.log('[DocumentTypesService] Document series set as default successfully');
        return;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error setting document series as default:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to set document series as default';
        throw new Error(errorMessage);
      })
    );
  }
}

