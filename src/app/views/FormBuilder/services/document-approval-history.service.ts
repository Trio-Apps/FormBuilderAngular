import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Document Approval History DTOs ====================

export type ApprovalActionType = 'Approved' | 'Rejected' | 'Returned' | 'Pending';

export interface DocumentApprovalHistoryDto {
  id: number;
  submissionId: number;
  stageId: number;
  actionType: ApprovalActionType;
  actionByUserId: string;
  actionDate: string | Date;
  comments?: string | null;
  actionByUserName?: string;
  stageName?: string;
  isDelegated?: boolean;
  delegatedFromUserId?: string | null;
  delegatedFromUserName?: string | null;
}

export interface CreateDocumentApprovalHistoryDto {
  submissionId: number;
  stageId: number;
  actionType: ApprovalActionType;
  actionByUserId: string;
  comments?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentApprovalHistoryService {
  private baseUrl = `${environment.apiUrl}/DocumentApprovalHistory`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD Operations ====================

  /**
   * Get history by submission ID
   * GET /api/DocumentApprovalHistory/submission/{submissionId}
   */
  getHistoryBySubmissionId(submissionId: number): Observable<DocumentApprovalHistoryDto[]> {
    const submissionIdNum = Number(submissionId);
    if (isNaN(submissionIdNum) || submissionIdNum <= 0) {
      return throwError(() => new Error(`Invalid submission ID: ${submissionId}`));
    }

    return this.http.get<any>(`${this.baseUrl}/submission/${submissionIdNum}`).pipe(
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
        console.error(`Error fetching approval history for submission ${submissionId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get history by stage ID
   * GET /api/DocumentApprovalHistory/stage/{stageId}
   */
  getHistoryByStageId(stageId: number): Observable<DocumentApprovalHistoryDto[]> {
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
        console.error(`Error fetching approval history for stage ${stageId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get history by user ID
   * GET /api/DocumentApprovalHistory/user/{userId}
   */
  getHistoryByUserId(userId: string): Observable<DocumentApprovalHistoryDto[]> {
    if (!userId || userId.trim() === '') {
      return throwError(() => new Error('User ID is required'));
    }

    const encodedUserId = encodeURIComponent(userId);
    return this.http.get<any>(`${this.baseUrl}/user/${encodedUserId}`).pipe(
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
        console.error(`Error fetching approval history for user ${userId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Create history record
   * POST /api/DocumentApprovalHistory
   * Note: Usually done automatically by the workflow runtime, but can be created manually
   */
  createHistoryRecord(dto: CreateDocumentApprovalHistoryDto): Observable<DocumentApprovalHistoryDto> {
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

    const createDto: CreateDocumentApprovalHistoryDto = {
      submissionId: dto.submissionId,
      stageId: dto.stageId,
      actionType: dto.actionType,
      actionByUserId: dto.actionByUserId.trim(),
      comments: dto.comments || null
    };

    console.log('[DocumentApprovalHistoryService] Creating history record:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[DocumentApprovalHistoryService] Error creating history record:', error);
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

