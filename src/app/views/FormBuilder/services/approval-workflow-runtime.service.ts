import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Workflow Runtime DTOs ====================

export type ApprovalActionType = 'Approved' | 'Rejected' | 'Returned' | 'Pending';

export interface ProcessApprovalActionDto {
  submissionId: number;
  stageId: number;
  actionType: ApprovalActionType;
  actionByUserId: string;
  comments?: string | null;
}

export interface RequestStageSignatureDto {
  submissionId: number;
  stageId: number;
  requestedByUserId?: string | null;
}

export interface ApprovalInboxItemDto {
  submissionId: number;
  stageId: number;
  stageName: string;
  stageOrder: number;
  submissionTitle?: string;
  documentNumber?: string;
  documentTypeName?: string;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedDate: string | Date;
  workflowId: number;
  workflowName?: string;
  isDelegated?: boolean;
  delegatedFromUserId?: string | null;
}

export interface ResolvedApproverDto {
  userId: string;
  userName?: string;
  roleId?: string | null;
  roleName?: string | null;
  isDelegated: boolean;
  delegatedFromUserId?: string | null;
}

export interface DelegationCheckResultDto {
  hasActiveDelegation: boolean;
  delegatedToUserId?: string | null;
  delegatedToUserName?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowRuntimeService {
  private baseUrl = `${environment.apiUrl}/ApprovalWorkflowRuntime`;

  constructor(private http: HttpClient) {}

  // ==================== Workflow Runtime Operations ====================

  /**
   * Activate stage for submission
   * POST /api/ApprovalWorkflowRuntime/activate-stage
   * Usually called automatically when submitting, but can be called manually
   * @param submissionId - The submission ID to activate stage for
   */
  activateStage(submissionId: number): Observable<void> {
    const submissionIdNum = Number(submissionId);
    if (isNaN(submissionIdNum) || submissionIdNum <= 0) {
      return throwError(() => new Error(`Invalid submission ID: ${submissionId}`));
    }

    console.log('[ApprovalWorkflowRuntimeService] Activating stage for submission:', submissionIdNum);

    // Backend expects an object body: { submissionId: <id> }
    return this.http.post<any>(`${this.baseUrl}/activate-stage`, { submissionId: submissionIdNum }).pipe(
      map(() => {
        console.log('[ApprovalWorkflowRuntimeService] Stage activated successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowRuntimeService] Error activating stage:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Resolve approvers for stage
   * GET /api/ApprovalWorkflowRuntime/resolve-approvers/stage/{stageId}
   * Returns list of users/roles who can approve at this stage
   */
  resolveApproversForStage(stageId: number): Observable<ResolvedApproverDto[]> {
    const stageIdNum = Number(stageId);
    if (isNaN(stageIdNum) || stageIdNum <= 0) {
      return throwError(() => new Error(`Invalid stage ID: ${stageId}`));
    }

    return this.http.get<any>(`${this.baseUrl}/resolve-approvers/stage/${stageIdNum}`).pipe(
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
        console.error(`Error resolving approvers for stage ${stageId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Check delegation for user
   * GET /api/ApprovalWorkflowRuntime/check-delegation/{userId}
   * Returns active delegation information for a user
   */
  checkDelegationForUser(userId: string): Observable<DelegationCheckResultDto> {
    if (!userId || userId.trim() === '') {
      return throwError(() => new Error('User ID is required'));
    }

    const encodedUserId = encodeURIComponent(userId);
    return this.http.get<any>(`${this.baseUrl}/check-delegation/${encodedUserId}`).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            return response.data || response;
          }
          if (!response.hasActiveDelegation) {
            return response.data || response.result || response;
          }
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error checking delegation for user ${userId}:`, error);
        // Return default result if error occurs
        return of({
          hasActiveDelegation: false,
          delegatedToUserId: null,
          delegatedToUserName: null,
          startDate: null,
          endDate: null
        } as DelegationCheckResultDto);
      })
    );
  }

  /**
   * Process approval action (APPROVE, REJECT, or RETURN)
   * POST /api/ApprovalWorkflowRuntime/process-action
   * This is the main method for processing approval actions
   */
  processApprovalAction(dto: ProcessApprovalActionDto): Observable<void> {
    // Validate required fields
    if (!dto.submissionId || dto.submissionId <= 0) {
      return throwError(() => new Error('Submission ID is required'));
    }

    if (!dto.stageId || dto.stageId <= 0) {
      return throwError(() => new Error('Stage ID is required'));
    }

    if (!dto.actionType || !['Approved', 'Rejected', 'Returned', 'Pending'].includes(dto.actionType)) {
      return throwError(() => new Error('Valid action type is required (Approved, Rejected, Returned, or Pending)'));
    }

    if (!dto.actionByUserId || dto.actionByUserId.trim() === '') {
      return throwError(() => new Error('Action by user ID is required'));
    }

    const processDto: ProcessApprovalActionDto = {
      submissionId: dto.submissionId,
      stageId: dto.stageId,
      actionType: dto.actionType,
      actionByUserId: dto.actionByUserId.trim()
    };

    // comments is optional:
    // - omit it if user didn't provide anything
    // - allow explicit null / '' if caller intentionally passes it
    if (dto.comments !== undefined) {
      processDto.comments = dto.comments;
    }

    console.log('[ApprovalWorkflowRuntimeService] Processing approval action:', processDto);

    return this.http.post<any>(`${this.baseUrl}/process-action`, processDto).pipe(
      map(() => {
        console.log('[ApprovalWorkflowRuntimeService] Approval action processed successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowRuntimeService] Error processing approval action:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Approve document (convenience method)
   * Processes an approval action with type "Approved"
   */
  approveDocument(
    submissionId: number,
    stageId: number,
    actionByUserId: string,
    comments?: string | null
  ): Observable<void> {
    return this.processApprovalAction({
      submissionId,
      stageId,
      actionType: 'Approved',
      actionByUserId,
      comments
    });
  }

  /**
   * Reject document (convenience method)
   * Processes an approval action with type "Rejected"
   */
  rejectDocument(
    submissionId: number,
    stageId: number,
    actionByUserId: string,
    comments?: string | null
  ): Observable<void> {
    return this.processApprovalAction({
      submissionId,
      stageId,
      actionType: 'Rejected',
      actionByUserId,
      comments
    });
  }

  /**
   * Return document (convenience method)
   * Processes an approval action with type "Returned"
   */
  returnDocument(
    submissionId: number,
    stageId: number,
    actionByUserId: string,
    comments?: string | null
  ): Observable<void> {
    return this.processApprovalAction({
      submissionId,
      stageId,
      actionType: 'Returned',
      actionByUserId,
      comments
    });
  }

  /**
   * Request DocuSign envelope for current stage
   * POST /api/ApprovalWorkflowRuntime/request-signature
   */
  requestStageSignature(dto: RequestStageSignatureDto): Observable<void> {
    if (!dto.submissionId || dto.submissionId <= 0) {
      return throwError(() => new Error('Submission ID is required'));
    }

    if (!dto.stageId || dto.stageId <= 0) {
      return throwError(() => new Error('Stage ID is required'));
    }

    const payload: RequestStageSignatureDto = {
      submissionId: dto.submissionId,
      stageId: dto.stageId
    };

    if (dto.requestedByUserId !== undefined) {
      payload.requestedByUserId = dto.requestedByUserId;
    }

    return this.http.post<any>(`${this.baseUrl}/request-signature`, payload).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalWorkflowRuntimeService] Error requesting stage signature:', error);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Get approval inbox for user
   * GET /api/ApprovalWorkflowRuntime/inbox/{userId}
   * Returns list of pending approvals for a user
   */
  getApprovalInboxForUser(userId: string): Observable<ApprovalInboxItemDto[]> {
    if (!userId || userId.trim() === '') {
      return throwError(() => new Error('User ID is required'));
    }

    const encodedUserId = encodeURIComponent(userId);
    const url = `${this.baseUrl}/inbox/${encodedUserId}`;
    
    console.log('[ApprovalWorkflowRuntimeService] Fetching inbox for user:', {
      userId: userId,
      encodedUserId: encodedUserId,
      url: url
    });
    
    return this.http.get<any>(url).pipe(
      map((response: any) => {
        console.log('[ApprovalWorkflowRuntimeService] Raw response from API:', response);
        
        // Handle ServiceResult<T> or direct array response
        let data: any[] = [];
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          if (response.success !== undefined) {
            data = response.data || [];
          } else {
            data = response.data || response.items || response.result || [];
          }
        } else {
          data = Array.isArray(response) ? response : [];
        }
        
        console.log('[ApprovalWorkflowRuntimeService] Parsed inbox items:', {
          count: data.length,
          items: data.map((item: any) => ({
            submissionId: item.submissionId,
            stageId: item.stageId,
            stageName: item.stageName,
            documentNumber: item.documentNumber,
            workflowId: item.workflowId,
            workflowName: item.workflowName
          }))
        });
        
        // Check for items with stageId = 0
        const itemsWithZeroStageId = data.filter((item: any) => item.stageId === 0 || !item.stageId);
        if (itemsWithZeroStageId.length > 0) {
          console.warn('[ApprovalWorkflowRuntimeService] ⚠️ Found items with stageId = 0:', {
            count: itemsWithZeroStageId.length,
            items: itemsWithZeroStageId.map((item: any) => ({
              submissionId: item.submissionId,
              stageId: item.stageId,
              stageName: item.stageName,
              documentNumber: item.documentNumber
            }))
          });
          console.warn('[ApprovalWorkflowRuntimeService] This means backend returned items but user is NOT assigned as Stage Assignee');
          console.warn('[ApprovalWorkflowRuntimeService] Check backend endpoint: GET /api/ApprovalWorkflowRuntime/inbox/{userId}');
          console.warn('[ApprovalWorkflowRuntimeService] Verify:');
          console.warn('  1. Backend checks Stage Assignees correctly');
          console.warn('  2. userId/username matches Stage Assignees');
          console.warn('  3. Stage Assignees are active (IsActive = true)');
        }
        
        return data;
      }),
      catchError((error) => {
        console.error(`[ApprovalWorkflowRuntimeService] Error fetching approval inbox for user ${userId}:`, {
          error: error,
          status: error?.status,
          statusText: error?.statusText,
          errorMessage: error?.error,
          url: url
        });
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
