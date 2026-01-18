import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Stage Assignee DTOs ====================

export interface ApprovalStageAssigneeDto {
  id: number;
  stageId: number;
  stageName?: string;  // Filled by Backend
  roleId?: string | null;
  roleName?: string;   // Filled by Backend
  userId?: string | null;
  userName?: string;   // Filled by Backend
  isActive: boolean;
}

export interface CreateApprovalStageAssigneeDto {
  stageId: number;
  userId: string;  // Required - Backend extracts roleId automatically
  roleId?: string; // Optional - Used as fallback if user has no role
  isActive?: boolean;
}

export interface UpdateApprovalStageAssigneeDto {
  stageId?: number;
  userId?: string;  // Backend extracts roleId automatically
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

  constructor(private http: HttpClient) { }

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
   * Create assignee (User-based assignment)
   * POST /api/ApprovalStageAssignees
   * Backend automatically extracts roleId from the provided userId
   */
  createAssignee(dto: CreateApprovalStageAssigneeDto): Observable<ApprovalStageAssigneeDto> {
    // Validate required fields
    if (!dto.stageId || dto.stageId <= 0) {
      return throwError(() => new Error('Stage ID is required'));
    }

    // Validate that userId is provided (required)
    if (!dto.userId) {
      return throwError(() => new Error('UserId is required'));
    }

    // Build DTO - userId is required, roleId is optional (used as fallback if user has no role)
    // Backend automatically extracts roleId from userId if not provided
    const createDto: any = {
      stageId: dto.stageId,
      userId: dto.userId,
      roleId: dto.roleId || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    };

    // Log intent
    if (!dto.roleId) {
      console.log('[ApprovalStageAssigneesService] roleId not provided, backend will extract it from userId');
    }

    console.log('[ApprovalStageAssigneesService] Creating assignee:', createDto);
    console.log('[ApprovalStageAssigneesService] DTO details:', {
      stageId: createDto.stageId,
      userId: createDto.userId,
      roleId: createDto.roleId,
      isActive: createDto.isActive
    });

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
        console.error('[ApprovalStageAssigneesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url,
          requestBody: createDto
        });
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

    // Validate that userId is provided if updating
    if (dto.userId === undefined || dto.userId === null) {
      return throwError(() => new Error('UserId is required for update'));
    }

    // Build update DTO - only userId is required, Backend extracts roleId automatically
    const updateDto: any = {
      userId: dto.userId,
      isActive: dto.isActive !== undefined ? dto.isActive : undefined
    };

    if (dto.stageId !== undefined) {
      updateDto.stageId = dto.stageId;
    }

    console.log('[ApprovalStageAssigneesService] Updating assignee:', { id: assigneeId, dto: updateDto });

    return this.http.put<any>(`${this.baseUrl}/${assigneeId}`, updateDto).pipe(
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

    // Ensure arrays are properly formatted as string arrays
    const payload: any = {
      stageId: dto.stageId
    };

    // Only include roleIds if array exists and has items
    if (dto.roleIds && Array.isArray(dto.roleIds) && dto.roleIds.length > 0) {
      payload.roleIds = dto.roleIds.map(id => String(id)).filter(id => id && id !== 'undefined' && id !== 'null');
    }

    // Only include userIds if array exists and has items
    if (dto.userIds && Array.isArray(dto.userIds) && dto.userIds.length > 0) {
      payload.userIds = dto.userIds.map(id => String(id)).filter(id => id && id !== 'undefined' && id !== 'null');
    }

    // Validate that at least one array has items
    if ((!payload.roleIds || payload.roleIds.length === 0) &&
      (!payload.userIds || payload.userIds.length === 0)) {
      return throwError(() => new Error('At least one roleId or userId must be provided'));
    }

    console.log('[ApprovalStageAssigneesService] Bulk updating assignees with payload:', payload);

    return this.http.post<any>(`${this.baseUrl}/bulk-update`, payload).pipe(
      map(() => {
        console.log('[ApprovalStageAssigneesService] Assignees bulk updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageAssigneesService] Error bulk updating assignees:', error);
        console.error('[ApprovalStageAssigneesService] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          url: error?.url,
          requestBody: payload
        });
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Soft delete assignee
   * Uses DELETE /api/ApprovalStageAssignees/{id} (this endpoint performs soft delete)
   */
  deleteAssignee(id: number, deletedByUserId?: string): Observable<void> {
    const assigneeId = Number(id);
    if (isNaN(assigneeId) || assigneeId <= 0) {
      return throwError(() => new Error(`Invalid assignee ID: ${id}`));
    }

    console.log('[ApprovalStageAssigneesService] Soft deleting assignee:', { id: assigneeId, deletedByUserId });

    const params: any = {};
    if (deletedByUserId) {
      params.deletedByUserId = deletedByUserId;
    }

    // Use DELETE /api/ApprovalStageAssignees/{id} - this endpoint performs soft delete
    return this.http.delete<any>(`${this.baseUrl}/${assigneeId}`, { params }).pipe(
      map(() => {
        console.log('[ApprovalStageAssigneesService] Assignee soft deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalStageAssigneesService] Error soft deleting assignee:', error);

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
      // Check for validation errors first (ASP.NET Core ProblemDetails format)
      if (errorResponse.errors && typeof errorResponse.errors === 'object') {
        const errorDetails: string[] = [];
        for (const [field, messages] of Object.entries(errorResponse.errors)) {
          if (Array.isArray(messages)) {
            messages.forEach(msg => errorDetails.push(`${field}: ${msg}`));
          } else {
            errorDetails.push(`${field}: ${messages}`);
          }
        }
        if (errorDetails.length > 0) {
          return errorDetails.join(', ');
        }
      } else if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
        return errorResponse.errors.join(', ');
      }

      // Check for detail (most specific message in ProblemDetails)
      if (errorResponse.detail) {
        errorMessage = errorResponse.detail;
      } else if (typeof errorResponse === 'string') {
        errorMessage = errorResponse;
      } else if (errorResponse.message) {
        errorMessage = errorResponse.message;
      } else if (errorResponse.errorMessage) {
        errorMessage = errorResponse.errorMessage;
      } else if (errorResponse.title) {
        errorMessage = errorResponse.title;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return errorMessage;
  }
}

