import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Stage Assignee DTOs ====================

export interface ApprovalStageAssigneeDto {
  id: number;
  stageId: number;
  roleId?: string | null;
  userId?: string | null;
  isActive: boolean;
  roleName?: string;
  userName?: string;
}

export interface CreateApprovalStageAssigneeDto {
  stageId: number;
  roleId?: string | null;
  userId?: string | null;
  isActive?: boolean;
}

export interface UpdateApprovalStageAssigneeDto {
  stageId?: number;
  roleId?: string | null;
  userId?: string | null;
  isActive?: boolean;
}

export interface BulkUpdateAssigneesDto {
  stageId: number;
  roleIds?: string[];
  userIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalStageAssigneesService {
  private baseUrl = `${environment.apiUrl}/ApprovalStageAssignees`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD Operations ====================

  /**
   * Get assignees by stage ID
   * GET /api/ApprovalStageAssignees/stage/{stageId}
   */
  getAssigneesByStageId(stageId: number): Observable<ApprovalStageAssigneeDto[]> {
    const stageIdNum = Number(stageId);
    if (isNaN(stageIdNum) || stageIdNum <= 0) {
      return throwError(() => new Error(`Invalid stage ID: ${stageId}`));
    }

    return this.http.get<any>(`${this.baseUrl}/stage/${stageIdNum}`).pipe(
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
        console.error(`Error fetching assignees for stage ${stageId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get assignee by ID
   * GET /api/ApprovalStageAssignees/{id}
   */
  getAssigneeById(id: number): Observable<ApprovalStageAssigneeDto> {
    const assigneeId = Number(id);
    if (isNaN(assigneeId) || assigneeId <= 0) {
      return throwError(() => new Error(`Invalid assignee ID: ${id}`));
    }

    return this.http.get<any>(`${this.baseUrl}/${assigneeId}`).pipe(
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
        console.error(`Error fetching assignee ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Assignee not found');
        }
        throw error;
      })
    );
  }

  /**
   * Create assignee (Role-based or User-based)
   * POST /api/ApprovalStageAssignees
   */
  createAssignee(dto: CreateApprovalStageAssigneeDto): Observable<ApprovalStageAssigneeDto> {
    // Validate required fields
    if (!dto.stageId || dto.stageId <= 0) {
      return throwError(() => new Error('Stage ID is required'));
    }

    // Validate that either roleId or userId is provided
    if (!dto.roleId && !dto.userId) {
      return throwError(() => new Error('Either roleId or userId must be provided'));
    }

    // Validate that both are not provided
    if (dto.roleId && dto.userId) {
      return throwError(() => new Error('Cannot provide both roleId and userId. Please provide only one.'));
    }

    const createDto: CreateApprovalStageAssigneeDto = {
      stageId: dto.stageId,
      roleId: dto.roleId || null,
      userId: dto.userId || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    };

    console.log('[ApprovalStageAssigneesService] Creating assignee:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ApprovalStageAssigneesService] Error creating assignee:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update assignee
   * PUT /api/ApprovalStageAssignees/{id}
   */
  updateAssignee(id: number, dto: UpdateApprovalStageAssigneeDto): Observable<void> {
    const assigneeId = Number(id);
    if (isNaN(assigneeId) || assigneeId <= 0) {
      return throwError(() => new Error(`Invalid assignee ID: ${id}`));
    }

    // Validate that either roleId or userId is provided if updating
    if (dto.roleId && dto.userId) {
      return throwError(() => new Error('Cannot provide both roleId and userId. Please provide only one.'));
    }

    console.log('[ApprovalStageAssigneesService] Updating assignee:', { id: assigneeId, dto });

    return this.http.put<any>(`${this.baseUrl}/${assigneeId}`, dto).pipe(
      map(() => {
        console.log('[ApprovalStageAssigneesService] Assignee updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageAssigneesService] Error updating assignee:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Bulk update assignees (Replace all assignees for a stage)
   * POST /api/ApprovalStageAssignees/bulk-update
   */
  bulkUpdateAssignees(dto: BulkUpdateAssigneesDto): Observable<void> {
    if (!dto.stageId || dto.stageId <= 0) {
      return throwError(() => new Error('Stage ID is required'));
    }

    console.log('[ApprovalStageAssigneesService] Bulk updating assignees:', dto);

    return this.http.post<any>(`${this.baseUrl}/bulk-update`, dto).pipe(
      map(() => {
        console.log('[ApprovalStageAssigneesService] Assignees bulk updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageAssigneesService] Error bulk updating assignees:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Delete assignee
   * DELETE /api/ApprovalStageAssignees/{id}
   */
  deleteAssignee(id: number): Observable<void> {
    const assigneeId = Number(id);
    if (isNaN(assigneeId) || assigneeId <= 0) {
      return throwError(() => new Error(`Invalid assignee ID: ${id}`));
    }

    return this.http.delete<any>(`${this.baseUrl}/${assigneeId}`).pipe(
      map(() => {
        console.log('[ApprovalStageAssigneesService] Assignee deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageAssigneesService] Error deleting assignee:', error);
        
        if (error.status === 404) {
          throw new Error('Assignee not found');
        }

        const errorMessage = this.extractErrorMessage(error);
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

