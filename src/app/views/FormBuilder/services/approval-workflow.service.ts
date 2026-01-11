import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Workflow DTOs ====================

export interface ApprovalWorkflowDto {
  id: number;
  name: string;
  documentTypeId: number;
  documentTypeName?: string;
  isActive?: boolean;
  isDeleted: boolean;
  createdDate?: string;
  updatedDate?: string | null;
}

export interface CreateApprovalWorkflowDto {
  name: string;
  documentTypeId: number;
  isDeleted?: boolean;
}

export interface UpdateApprovalWorkflowDto {
  name?: string;
  documentTypeId?: number; // Include to maintain relationship, even if not changed
  isDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowService {
  private baseUrl = `${environment.apiUrl}/ApprovalWorkflow`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD Operations ====================

  /**
   * Get all approval workflows
   * GET /api/ApprovalWorkflow
   */
  getAllApprovalWorkflows(): Observable<ApprovalWorkflowDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            return response.data || [];
          }
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching approval workflows:', error);
        return of([]);
      })
    );
  }

  /**
   * Get approval workflow by ID
   * GET /api/ApprovalWorkflow/{id}
   */
  getApprovalWorkflowById(id: number): Observable<ApprovalWorkflowDto> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            return response.data || response;
          }
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching approval workflow ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Approval workflow not found');
        }
        throw error;
      })
    );
  }

  /**
   * Get active approval workflows only
   * GET /api/ApprovalWorkflow/active
   */
  getActiveApprovalWorkflows(): Observable<ApprovalWorkflowDto[]> {
    return this.http.get<any>(`${this.baseUrl}/active`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            return response.data || [];
          }
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching active approval workflows:', error);
        return of([]);
      })
    );
  }

  /**
   * Get approval workflow by name
   * GET /api/ApprovalWorkflow/name/{name}
   */
  getApprovalWorkflowByName(name: string): Observable<ApprovalWorkflowDto | null> {
    const encodedName = encodeURIComponent(name);
    return this.http.get<any>(`${this.baseUrl}/name/${encodedName}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            return response.data || response;
          }
          if (!response.id) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching approval workflow by name ${name}:`, error);
        if (error.status === 404) {
          return of(null);
        }
        throw error;
      })
    );
  }

  /**
   * Create approval workflow
   * POST /api/ApprovalWorkflow
   */
  createApprovalWorkflow(dto: CreateApprovalWorkflowDto): Observable<ApprovalWorkflowDto> {
    // Validate required fields
    if (!dto.name || dto.name.trim() === '') {
      return throwError(() => new Error('Approval workflow name is required'));
    }

    if (!dto.documentTypeId || dto.documentTypeId <= 0) {
      return throwError(() => new Error('Document type ID is required'));
    }

    const createDto: CreateApprovalWorkflowDto = {
      name: dto.name.trim(),
      documentTypeId: dto.documentTypeId,
      isDeleted: dto.isDeleted !== undefined ? dto.isDeleted : false
    };

    console.log('[ApprovalWorkflowService] Creating approval workflow:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowService] Error creating approval workflow:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update approval workflow
   * PUT /api/ApprovalWorkflow/{id}
   */
  updateApprovalWorkflow(id: number, dto: UpdateApprovalWorkflowDto): Observable<void> {
    const workflowId = Number(id);
    if (isNaN(workflowId) || workflowId <= 0) {
      return throwError(() => new Error(`Invalid approval workflow ID: ${id}`));
    }

    console.log('[ApprovalWorkflowService] Updating approval workflow:', { id: workflowId, dto });

    return this.http.put<any>(`${this.baseUrl}/${workflowId}`, dto).pipe(
      map(() => {
        console.log('[ApprovalWorkflowService] Approval workflow updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowService] Error updating approval workflow:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Soft delete approval workflow
   * Uses PUT /api/ApprovalWorkflow/{id} with isDeleted: true
   */
  softDelete(id: number, deletedByUserId?: string): Observable<void> {
    const workflowId = Number(id);
    if (isNaN(workflowId) || workflowId <= 0) {
      return throwError(() => new Error(`Invalid approval workflow ID: ${id}`));
    }

    console.log('[ApprovalWorkflowService] Soft deleting approval workflow:', { id: workflowId, deletedByUserId });

    // First get the workflow to get documentTypeId (required for update)
    return this.getApprovalWorkflowById(workflowId).pipe(
      mergeMap((workflow: ApprovalWorkflowDto) => {
        // Use update method with isDeleted: true and documentTypeId for soft delete
        const updateDto: UpdateApprovalWorkflowDto = {
          documentTypeId: workflow.documentTypeId, // Required by API
          isDeleted: true
        };
        return this.updateApprovalWorkflow(workflowId, updateDto);
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowService] Error soft deleting approval workflow:', error);
        const errorMessage = this.extractErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Restore soft-deleted approval workflow
   * PUT /api/ApprovalWorkflow/{id}/restore or PATCH /api/ApprovalWorkflow/{id}/restore
   */
  restore(id: number): Observable<ApprovalWorkflowDto> {
    const workflowId = Number(id);
    if (isNaN(workflowId) || workflowId <= 0) {
      return throwError(() => new Error(`Invalid approval workflow ID: ${id}`));
    }

    console.log('[ApprovalWorkflowService] Restoring approval workflow:', { id: workflowId });

    return this.http.put<any>(`${this.baseUrl}/${workflowId}/restore`, {}).pipe(
      map((response: any) => {
        console.log('[ApprovalWorkflowService] Approval workflow restored successfully');
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        // Try PATCH method if PUT fails
        if (error?.status === 404 || error?.status === 405) {
          return this.http.patch<any>(`${this.baseUrl}/${workflowId}/restore`, {}).pipe(
            map((response: any) => {
              console.log('[ApprovalWorkflowService] Approval workflow restored successfully (via PATCH)');
              if (response && typeof response === 'object' && !response.id) {
                return response.data || response.result || response;
              }
              return response;
            }),
            catchError((patchError) => {
              console.error('[ApprovalWorkflowService] Error restoring approval workflow:', patchError);
              const errorMessage = this.extractErrorMessage(patchError);
              return throwError(() => new Error(errorMessage));
            })
          );
        }
        console.error('[ApprovalWorkflowService] Error restoring approval workflow:', error);
        const errorMessage = this.extractErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Delete approval workflow
   * DELETE /api/ApprovalWorkflow/{id}
   */
  deleteApprovalWorkflow(id: number): Observable<void> {
    const workflowId = Number(id);
    if (isNaN(workflowId) || workflowId <= 0) {
      return throwError(() => new Error(`Invalid approval workflow ID: ${id}`));
    }

    return this.http.delete<any>(`${this.baseUrl}/${workflowId}`).pipe(
      map(() => {
        console.log('[ApprovalWorkflowService] Approval workflow deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowService] Error deleting approval workflow:', error);
        
        if (error.status === 404) {
          throw new Error('Approval workflow not found');
        }

        const errorMessage = this.extractErrorMessage(error);
        
        // Check for specific error types
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('document type') || errorText.includes('foreign key') || errorText.includes('constraint')) {
          throw new Error('Cannot delete this approval workflow because it is associated with document types. Please remove the association first.');
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Get approval workflows by document type ID
   * Helper method - filters workflows by documentTypeId
   */
  getApprovalWorkflowsByDocumentTypeId(documentTypeId: number): Observable<ApprovalWorkflowDto[]> {
    return this.getAllApprovalWorkflows().pipe(
      map((workflows: ApprovalWorkflowDto[]) => {
        return workflows.filter(w => w.documentTypeId === documentTypeId);
      }),
      catchError((error) => {
        console.error(`Error fetching approval workflows for document type ${documentTypeId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get active approval workflows by document type ID
   * Helper method - filters active workflows by documentTypeId
   */
  getActiveApprovalWorkflowsByDocumentTypeId(documentTypeId: number): Observable<ApprovalWorkflowDto[]> {
    return this.getActiveApprovalWorkflows().pipe(
      map((workflows: ApprovalWorkflowDto[]) => {
        return workflows.filter(w => w.documentTypeId === documentTypeId);
      }),
      catchError((error) => {
        console.error(`Error fetching active approval workflows for document type ${documentTypeId}:`, error);
        return of([]);
      })
    );
  }

  // ==================== Helper Methods ====================

  /**
   * Extract error message from HTTP error response
   */
  private extractErrorMessage(error: any): string {
    const errorResponse = error?.error;
    let errorMessage = 'Failed to process request';

    if (errorResponse) {
      if (typeof errorResponse === 'string') {
        errorMessage = errorResponse;
      } else if (errorResponse.message) {
        errorMessage = errorResponse.message;
      } else if (errorResponse.errorMessage) {
        errorMessage = errorResponse.errorMessage;
      } else if (errorResponse.title) {
        errorMessage = errorResponse.title;
      } else if (errorResponse.detail) {
        errorMessage = errorResponse.detail;
      } else if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
        errorMessage = errorResponse.errors.join(', ');
      } else if (errorResponse.errors && typeof errorResponse.errors === 'object') {
        const errorDetails: string[] = [];
        for (const [field, messages] of Object.entries(errorResponse.errors)) {
          if (Array.isArray(messages)) {
            messages.forEach(msg => errorDetails.push(`${field}: ${msg}`));
          } else {
            errorDetails.push(`${field}: ${messages}`);
          }
        }
        if (errorDetails.length > 0) {
          errorMessage = errorDetails.join(', ');
        }
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return errorMessage;
  }
}

