import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ==================== Approval Delegation DTOs ====================

export interface ApprovalDelegationDto {
  id: number;
  fromUserId: string;
  toUserId: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  fromUserName?: string;
  toUserName?: string;
  createdDate?: string | Date;
  updatedDate?: string | Date | null;
}

export interface CreateApprovalDelegationDto {
  fromUserId: string;
  toUserId: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive?: boolean;
}

export interface UpdateApprovalDelegationDto {
  toUserId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  isActive?: boolean;
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
    return this.http.get<any>(`${this.baseUrl}/active/${encodedUserId}`).pipe(
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
        console.error(`Error fetching active delegations for user ${userId}:`, error);
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
      startDate: dto.startDate,
      endDate: dto.endDate,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    };

    console.log('[ApprovalDelegationService] Creating delegation:', createDto);

    return this.http.post<any>(this.baseUrl, createDto).pipe(
      map((response: any) => {
        // Handle ServiceResult<T> or direct object response
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
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
   * Soft delete delegation
   * Uses DELETE /api/ApprovalDelegation/{id} (this endpoint performs soft delete)
   */
  deleteDelegation(id: number, deletedByUserId?: string): Observable<void> {
    const delegationId = Number(id);
    if (isNaN(delegationId) || delegationId <= 0) {
      return throwError(() => new Error(`Invalid delegation ID: ${id}`));
    }

    console.log('[ApprovalDelegationService] Soft deleting delegation:', { id: delegationId, deletedByUserId });

    const params: any = {};
    if (deletedByUserId) {
      params.deletedByUserId = deletedByUserId;
    }

    // Use DELETE /api/ApprovalDelegation/{id} - this endpoint performs soft delete
    return this.http.delete<any>(`${this.baseUrl}/${delegationId}`, { params }).pipe(
      map(() => {
        console.log('[ApprovalDelegationService] Delegation soft deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[ApprovalDelegationService] Error soft deleting delegation:', error);
        
        if (error.status === 404) {
          throw new Error('Delegation not found');
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

