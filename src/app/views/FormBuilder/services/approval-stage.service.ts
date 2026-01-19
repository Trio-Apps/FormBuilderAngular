import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Stage DTOs ====================

export interface FormField {
  id: number;
  fieldCode: string;
  fieldName: string;
  dataType: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ApprovalStageDto {
  id: number;
  workflowId: number;
  stageName: string;
  stageOrder: number;
  minAmount?: number | null;
  maxAmount?: number | null;
  isFinalStage: boolean;
  isActive?: boolean;
  isDeleted: boolean;
  minimumRequiredAssignees?: number | null;
  amountFieldCode?: string | null;
  workflowName?: string;
}

export interface CreateApprovalStageDto {
  workflowId: number;
  stageName: string;
  stageOrder: number;
  minAmount?: number | null;
  maxAmount?: number | null;
  isFinalStage: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  minimumRequiredAssignees?: number | null;
  amountFieldCode?: string | null;
}

export interface UpdateApprovalStageDto {
  workflowId?: number;
  stageName?: string;
  stageOrder?: number;
  minAmount?: number | null;
  maxAmount?: number | null;
  isFinalStage?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  minimumRequiredAssignees?: number | null;
  amountFieldCode?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalStageService {
  private baseUrl = `${environment.apiUrl}/ApprovalStage`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD Operations ====================

  /**
   * Get form fields by workflow ID
   * GET /api/ApprovalStage/workflow/{workflowId}/form-fields
   */
  getFormFieldsByWorkflowId(workflowId: number): Observable<ApiResponse<FormField[]>> {
    const workflowIdNum = Number(workflowId);
    if (isNaN(workflowIdNum) || workflowIdNum <= 0) {
      return throwError(() => new Error(`Invalid workflow ID: ${workflowId}`));
    }

    return this.http.get<ApiResponse<FormField[]>>(
      `${this.baseUrl}/workflow/${workflowIdNum}/form-fields`
    ).pipe(
      catchError((error) => {
        console.error(`Error fetching form fields for workflow ${workflowId}:`, error);
        const errorMessage = this.extractErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Get all approval stages for a workflow
   * GET /api/ApprovalStage/workflow/{workflowId}
   */
  getAllByWorkflowId(workflowId: number): Observable<ApprovalStageDto[]> {
    const workflowIdNum = Number(workflowId);
    if (isNaN(workflowIdNum) || workflowIdNum <= 0) {
      return throwError(() => new Error(`Invalid workflow ID: ${workflowId}`));
    }

    return this.http.get<any>(`${this.baseUrl}/workflow/${workflowIdNum}`).pipe(
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
        console.error(`Error fetching approval stages for workflow ${workflowId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get approval stage by ID
   * GET /api/ApprovalStage/{id}
   */
  getById(id: number): Observable<ApprovalStageDto> {
    const stageId = Number(id);
    if (isNaN(stageId) || stageId <= 0) {
      return throwError(() => new Error(`Invalid approval stage ID: ${id}`));
    }

    return this.http.get<any>(`${this.baseUrl}/${stageId}`).pipe(
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
        console.error(`Error fetching approval stage ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Approval stage not found');
        }
        throw error;
      })
    );
  }

  /**
   * Create approval stage
   * POST /api/ApprovalStage
   */
  create(dto: CreateApprovalStageDto): Observable<ApprovalStageDto> {
    // Validate required fields
    if (!dto.stageName || dto.stageName.trim() === '') {
      return throwError(() => new Error('Stage name is required'));
    }

    if (!dto.workflowId || dto.workflowId <= 0) {
      return throwError(() => new Error('Workflow ID is required'));
    }

    const createDto: CreateApprovalStageDto = {
      workflowId: dto.workflowId,
      stageName: dto.stageName.trim(),
      stageOrder: dto.stageOrder,
      minAmount: dto.minAmount !== undefined ? dto.minAmount : null,
      maxAmount: dto.maxAmount !== undefined ? dto.maxAmount : null,
      isFinalStage: dto.isFinalStage !== undefined ? dto.isFinalStage : false,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      isDeleted: dto.isDeleted !== undefined ? dto.isDeleted : false,
      minimumRequiredAssignees: dto.minimumRequiredAssignees !== undefined ? dto.minimumRequiredAssignees : null,
      amountFieldCode: dto.amountFieldCode || null
    };

    console.log('[ApprovalStageService] Creating approval stage:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ApprovalStageService] Error creating approval stage:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update approval stage
   * PUT /api/ApprovalStage/{id}
   */
  update(id: number, dto: UpdateApprovalStageDto): Observable<void> {
    const stageId = Number(id);
    if (isNaN(stageId) || stageId <= 0) {
      return throwError(() => new Error(`Invalid approval stage ID: ${id}`));
    }

    // Ensure workflowId is included if not provided
    if (!dto.workflowId && dto.workflowId !== 0) {
      console.warn('[ApprovalStageService] workflowId not provided in update DTO, this may cause backend errors');
    }

    console.log('[ApprovalStageService] Updating approval stage:', { id: stageId, dto });

    return this.http.put<any>(`${this.baseUrl}/${stageId}`, dto).pipe(
      map((response: any) => {
        console.log('[ApprovalStageService] Approval stage updated successfully');
        // Handle ServiceResult<T> response if needed
        if (response && typeof response === 'object' && response.success !== undefined) {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update approval stage');
          }
        }
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageService] Error updating approval stage:', error);
        console.error('[ApprovalStageService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url
        });
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Soft delete approval stage
   * Uses DELETE /api/ApprovalStage/{id} (this endpoint performs soft delete)
   */
  softDelete(id: number, deletedByUserId?: string): Observable<void> {
    const stageId = Number(id);
    if (isNaN(stageId) || stageId <= 0) {
      return throwError(() => new Error(`Invalid approval stage ID: ${id}`));
    }

    console.log('[ApprovalStageService] Soft deleting approval stage:', { id: stageId, deletedByUserId });

    const params: any = {};
    if (deletedByUserId) {
      params.deletedByUserId = deletedByUserId;
    }

    // Use DELETE /api/ApprovalStage/{id} - this endpoint performs soft delete
    return this.http.delete<any>(`${this.baseUrl}/${stageId}`, { params }).pipe(
      map(() => {
        console.log('[ApprovalStageService] Approval stage soft deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageService] Error soft deleting approval stage:', error);
        const errorMessage = this.extractErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Restore soft-deleted approval stage
   * PUT /api/ApprovalStage/{id}/restore or PATCH /api/ApprovalStage/{id}/restore
   */
  restore(id: number): Observable<ApprovalStageDto> {
    const stageId = Number(id);
    if (isNaN(stageId) || stageId <= 0) {
      return throwError(() => new Error(`Invalid approval stage ID: ${id}`));
    }

    console.log('[ApprovalStageService] Restoring approval stage:', { id: stageId });

    return this.http.put<any>(`${this.baseUrl}/${stageId}/restore`, {}).pipe(
      map((response: any) => {
        console.log('[ApprovalStageService] Approval stage restored successfully');
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        // Try PATCH method if PUT fails
        if (error?.status === 404 || error?.status === 405) {
          return this.http.patch<any>(`${this.baseUrl}/${stageId}/restore`, {}).pipe(
            map((response: any) => {
              console.log('[ApprovalStageService] Approval stage restored successfully (via PATCH)');
              if (response && typeof response === 'object' && !response.id) {
                return response.data || response.result || response;
              }
              return response;
            }),
            catchError((patchError) => {
              console.error('[ApprovalStageService] Error restoring approval stage:', patchError);
              const errorMessage = this.extractErrorMessage(patchError);
              return throwError(() => new Error(errorMessage));
            })
          );
        }
        console.error('[ApprovalStageService] Error restoring approval stage:', error);
        const errorMessage = this.extractErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Delete approval stage
   * DELETE /api/ApprovalStage/{id}
   */
  delete(id: number): Observable<void> {
    const stageId = Number(id);
    if (isNaN(stageId) || stageId <= 0) {
      return throwError(() => new Error(`Invalid approval stage ID: ${id}`));
    }

    return this.http.delete<any>(`${this.baseUrl}/${stageId}`).pipe(
      map(() => {
        console.log('[ApprovalStageService] Approval stage deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageService] Error deleting approval stage:', error);
        
        if (error.status === 404) {
          throw new Error('Approval stage not found');
        }

        const errorMessage = this.extractErrorMessage(error);
        
        // Check for specific error types
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('workflow') || errorText.includes('foreign key') || errorText.includes('constraint')) {
          throw new Error('Cannot delete this approval stage because it is associated with a workflow.');
        }

        throw new Error(errorMessage);
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

