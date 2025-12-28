import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  DocumentType,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto
} from '../form-builder/models/document-types.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentTypesService {
  private baseUrl = `${environment.apiUrl}/DocumentTypes`;

  constructor(private http: HttpClient) {}

  // ================= DOCUMENT TYPES CRUD ================
  
  /**
   * Get all document types
   * GET /api/DocumentTypes
   */
  getAllDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        // Handle wrapped response (ApiResponse or ServiceResult)
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching document types:', error);
        return of([]);
      })
    );
  }

  /**
   * Get active document types only
   * GET /api/DocumentTypes/active
   */
  getActiveDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<any>(`${this.baseUrl}/active`).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
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
   * Get document type by ID
   * GET /api/DocumentTypes/{id}
   */
  getDocumentTypeById(id: number): Observable<DocumentType> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
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
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create document type';
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

    console.log('[DocumentTypesService] Updating document type:', { id: documentTypeId, dto });

    return this.http.put<any>(`${this.baseUrl}/${documentTypeId}`, dto).pipe(
      map(() => {
        console.log('[DocumentTypesService] Document type updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[DocumentTypesService] Error updating document type:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update document type';
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Delete document type (hard delete)
   * DELETE /api/DocumentTypes/{id}
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
        if (error.status === 404) {
          throw new Error('Document type not found');
        }
        const errorMessage = error?.error?.message || error?.message || 'Failed to delete document type';
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
}

