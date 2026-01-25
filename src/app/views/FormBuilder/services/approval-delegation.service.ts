import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Delegation DTOs ====================

export type ScopeType = 'Global' | 'Workflow' | 'Document';

export interface ApprovalDelegationDto {
  id: number;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  scopeType: ScopeType;
  scopeId?: number | null;
  scopeName?: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  createdDate?: string | Date;
  updatedDate?: string | Date | null;
}

export interface CreateApprovalDelegationDto {
  fromUserId: string;
  toUserId: string;
  scopeType: ScopeType;
  scopeId?: number | null;
  startDate: string | Date;
  endDate: string | Date;
  isActive?: boolean;
}

export interface UpdateApprovalDelegationDto {
  toUserId?: string;
  scopeType?: ScopeType;
  scopeId?: number | null;
  startDate?: string | Date;
  endDate?: string | Date;
  isActive?: boolean;
}

export interface ResolveDelegationRequest {
  originalApproverId: string;
  workflowId?: number | null;
  submissionId?: number | null;
}

export interface ResolveDelegationResponse {
  originalApproverId: string;
  delegatedUserId: string | null;
  hasDelegation: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalDelegationService {
  private baseUrl = `${environment.apiUrl}/ApprovalDelegation`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD Operations ====================

  /**
   * Get all delegations
   * GET /api/ApprovalDelegation
   * Optional query parameter: fromUserId
   */
  getAllDelegations(fromUserId?: string): Observable<ApprovalDelegationDto[]> {
    let params = new HttpParams();
    if (fromUserId) {
      params = params.set('fromUserId', fromUserId);
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(
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
        console.error('Error fetching delegations:', error);
        return of([]);
      })
    );
  }

  /**
   * Get delegations by from user ID
   * GET /api/ApprovalDelegation?fromUserId={fromUserId}
   */
  getDelegationsByFromUserId(fromUserId: string): Observable<ApprovalDelegationDto[]> {
    if (!fromUserId || fromUserId.trim() === '') {
      return throwError(() => new Error('From user ID is required'));
    }

    return this.getAllDelegations(fromUserId);
  }

  /**
   * Get delegation by ID
   * GET /api/ApprovalDelegation/{id}
   */
  getDelegationById(id: number): Observable<ApprovalDelegationDto> {
    const delegationId = Number(id);
    if (isNaN(delegationId) || delegationId <= 0) {
      return throwError(() => new Error(`Invalid delegation ID: ${id}`));
    }

    return this.http.get<any>(`${this.baseUrl}/${delegationId}`).pipe(
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
        console.error(`Error fetching delegation ${id}:`, error);
        if (error.status === 404) {
          throw new Error('Delegation not found');
        }
        throw error;
      })
    );
  }

  /**
   * Get active delegations for user
   * GET /api/ApprovalDelegation/active/{userId}
   */
  getActiveDelegationsForUser(userId: string): Observable<ApprovalDelegationDto[]> {
    if (!userId || userId.trim() === '') {
      return throwError(() => new Error('User ID is required'));
    }

    const encodedUserId = encodeURIComponent(userId);
    const url = `${this.baseUrl}/active/${encodedUserId}`;
    console.log(`[ApprovalDelegationService] Fetching active delegations for user ${userId}`);
    console.log(`[ApprovalDelegationService] URL: ${url}`);
    
    return this.http.get<any>(url).pipe(
      map((response: any) => {
        console.log(`[ApprovalDelegationService] Raw response for user ${userId}:`, response);
        console.log(`[ApprovalDelegationService] Response type:`, typeof response);
        console.log(`[ApprovalDelegationService] Is array:`, Array.isArray(response));
        
        let delegations: ApprovalDelegationDto[] = [];
        
        // Handle ServiceResult<T> or direct array response
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            delegations = response.data || [];
            console.log(`[ApprovalDelegationService] ServiceResult format - delegations:`, delegations);
          } else {
            delegations = response.data || response.items || response.result || [];
            console.log(`[ApprovalDelegationService] ApiResponse format - delegations:`, delegations);
          }
        } else if (Array.isArray(response)) {
          delegations = response;
          console.log(`[ApprovalDelegationService] Direct array format - delegations:`, delegations);
        } else {
          delegations = [];
          console.log(`[ApprovalDelegationService] Unknown format - returning empty array`);
        }
        
        console.log(`[ApprovalDelegationService] Final delegations count for user ${userId}:`, delegations.length);
        if (delegations.length > 0) {
          console.log(`[ApprovalDelegationService] Delegations details:`, delegations.map(d => ({
            id: d.id,
            fromUserId: d.fromUserId,
            toUserId: d.toUserId,
            scopeType: d.scopeType,
            scopeId: d.scopeId,
            isActive: d.isActive,
            startDate: d.startDate,
            endDate: d.endDate
          })));
        }
        
        return delegations;
      }),
      catchError((error) => {
        console.error(`[ApprovalDelegationService] Error fetching active delegations for user ${userId}:`, error);
        console.error(`[ApprovalDelegationService] Error details:`, {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        return of([]);
      })
    );
  }

  /**
   * Create delegation
   * POST /api/ApprovalDelegation
   */
  createDelegation(dto: CreateApprovalDelegationDto): Observable<ApprovalDelegationDto> {
    // Validate required fields
    if (!dto.fromUserId || dto.fromUserId.trim() === '') {
      return throwError(() => new Error('From user ID is required'));
    }

    if (!dto.toUserId || dto.toUserId.trim() === '') {
      return throwError(() => new Error('To user ID is required'));
    }

    if (!dto.scopeType) {
      return throwError(() => new Error('Scope type is required'));
    }

    // Validate scopeType
    const validScopeTypes: ScopeType[] = ['Global', 'Workflow', 'Document'];
    if (!validScopeTypes.includes(dto.scopeType)) {
      return throwError(() => new Error('ScopeType must be "Global", "Workflow", or "Document"'));
    }

    // Validate scopeId based on scopeType
    if (dto.scopeType === 'Workflow' && !dto.scopeId) {
      return throwError(() => new Error('ScopeId is required for Workflow scope type'));
    }

    if (dto.scopeType === 'Document' && !dto.scopeId) {
      return throwError(() => new Error('ScopeId is required for Document scope type'));
    }

    if (dto.scopeType === 'Global' && dto.scopeId !== null && dto.scopeId !== undefined) {
      return throwError(() => new Error('ScopeId must be null for Global scope type'));
    }

    if (!dto.startDate) {
      return throwError(() => new Error('Start date is required'));
    }

    if (!dto.endDate) {
      return throwError(() => new Error('End date is required'));
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(startDate.getTime())) {
      return throwError(() => new Error('Invalid start date'));
    }

    if (isNaN(endDate.getTime())) {
      return throwError(() => new Error('Invalid end date'));
    }

    if (startDate >= endDate) {
      return throwError(() => new Error('End date must be after start date'));
    }

    // Validate that fromUserId and toUserId are different
    if (dto.fromUserId === dto.toUserId) {
      return throwError(() => new Error('From user and to user cannot be the same'));
    }

    const createDto: CreateApprovalDelegationDto = {
      fromUserId: dto.fromUserId.trim(),
      toUserId: dto.toUserId.trim(),
      scopeType: dto.scopeType,
      scopeId: dto.scopeType === 'Global' ? null : dto.scopeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    };

    console.log('[ApprovalDelegationService] Creating delegation:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper or direct object response
        if (response && typeof response === 'object') {
          if (response.statusCode !== undefined && response.data) {
            return response.data;
          }
          if (!response.id && (response.data || response.result)) {
            return response.data || response.result;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ApprovalDelegationService] Error creating delegation:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Update delegation
   * PUT /api/ApprovalDelegation/{id}
   */
  updateDelegation(id: number, dto: UpdateApprovalDelegationDto): Observable<void> {
    const delegationId = Number(id);
    if (isNaN(delegationId) || delegationId <= 0) {
      return throwError(() => new Error(`Invalid delegation ID: ${id}`));
    }

    // Validate dates if provided
    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return throwError(() => new Error('Invalid date format'));
      }

      if (startDate >= endDate) {
        return throwError(() => new Error('End date must be after start date'));
      }
    }

    console.log('[ApprovalDelegationService] Updating delegation:', { id: delegationId, dto });

    return this.http.put<any>(`${this.baseUrl}/${delegationId}`, dto).pipe(
      map(() => {
        console.log('[ApprovalDelegationService] Delegation updated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalDelegationService] Error updating delegation:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Delete delegation
   * DELETE /api/ApprovalDelegation/{id}
   */
  deleteDelegation(id: number, deletedByUserId?: string): Observable<void> {
    const delegationId = Number(id);
    if (isNaN(delegationId) || delegationId <= 0) {
      return throwError(() => new Error(`Invalid delegation ID: ${id}`));
    }

    console.log('[ApprovalDelegationService] Deleting delegation:', { id: delegationId, deletedByUserId });

    const params: any = {};
    if (deletedByUserId) {
      params.deletedByUserId = deletedByUserId;
    }

    return this.http.delete<any>(`${this.baseUrl}/${delegationId}`, { params }).pipe(
      map(() => {
        console.log('[ApprovalDelegationService] Delegation deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalDelegationService] Error deleting delegation:', error);
        
        if (error.status === 404) {
          throw new Error('Delegation not found');
        }

        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Resolve delegated approver
   * POST /api/ApprovalDelegation/resolve
   * Returns the delegated user ID if a delegation exists, otherwise returns null
   * Priority: Document → Workflow → Global
   */
  resolveDelegatedApprover(request: ResolveDelegationRequest): Observable<ResolveDelegationResponse> {
    if (!request.originalApproverId || request.originalApproverId.trim() === '') {
      return throwError(() => new Error('OriginalApproverId is required'));
    }

    console.log('[ApprovalDelegationService] Resolving delegated approver:', request);

    return this.http.post<any>(`${this.baseUrl}/resolve`, request).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper or direct object response
        if (response && typeof response === 'object') {
          if (response.statusCode !== undefined && response.data) {
            return response.data;
          }
          if (response.originalApproverId !== undefined) {
            return response;
          }
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ApprovalDelegationService] Error resolving delegated approver:', error);
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

