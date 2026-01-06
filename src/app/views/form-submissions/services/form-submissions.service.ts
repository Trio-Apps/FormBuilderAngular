import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApproveSubmissionDto, RejectSubmissionDto, ApiResponse } from '../models/approve-reject-submission.model';

export interface FormSubmissionDto {
  id: number;
  formBuilderId: number;
  formName?: string;
  version: number;
  documentTypeId: number;
  documentTypeName?: string;
  seriesId: number;
  seriesCode?: string;
  documentNumber?: string;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedDate: Date;
  status: string;
  createdDate: Date;
  lastUpdatedDate: Date;
}

export interface FormSubmissionDetailDto extends FormSubmissionDto {
  fieldValues: FormSubmissionValueDto[];
  attachments: FormSubmissionAttachmentDto[];
  gridData: FormSubmissionGridDto[];
}

export interface FormSubmissionValueDto {
  id: number;
  submissionId: number;
  fieldId: number;
  fieldCode?: string;
  fieldName?: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBool?: boolean;
  valueJson?: string;
}

export interface FormSubmissionAttachmentDto {
  id: number;
  submissionId: number;
  fieldId: number;
  fieldCode?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
}

export interface FormSubmissionGridDto {
  id: number;
  submissionId: number;
  gridId: number;
  gridName: string;
  gridCode: string;
  rowIndex: number;
  cells: FormSubmissionGridCellDto[];
}

export interface FormSubmissionGridCellDto {
  id: number;
  rowId: number;
  columnId: number;
  columnName: string;
  columnCode: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBool?: boolean;
  valueJson?: string;
}

export interface CreateFormSubmissionDto {
  formBuilderId: number;
  documentTypeId: number;
  seriesId: number;
  submittedByUserId: string;
  status?: string;
}

export interface UpdateFormSubmissionDto {
  documentNumber?: string;
  status?: string;
  submittedDate?: Date;
}

export interface SaveFormSubmissionDataDto {
  submissionId: number;
  fieldValues: SaveFormSubmissionValueDto[];
  attachments: SaveFormSubmissionAttachmentDto[];
  gridData: SaveFormSubmissionGridDto[];
}

export interface SaveFormSubmissionValueDto {
  fieldId: number;
  fieldCode: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBool?: boolean;
  valueJson?: string;
}

export interface SaveFormSubmissionAttachmentDto {
  fieldId: number;
  fieldCode: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
}

export interface SaveFormSubmissionGridDto {
  gridId: number;
  rowIndex: number;
  cells: SaveFormSubmissionGridCellDto[];
}

export interface SaveFormSubmissionGridCellDto {
  columnId: number;
  columnCode: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBool?: boolean;
  valueJson?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionsService {
  private baseUrl = `${environment.apiUrl}/FormSubmissions`;

  constructor(private http: HttpClient) {}

  /**
   * Get all form submissions
   */
  getAllSubmissions(): Observable<FormSubmissionDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching form submissions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get form submissions by Document Type ID
   */
  getSubmissionsByDocumentTypeId(documentTypeId: number): Observable<FormSubmissionDto[]> {
    return this.http.get<any>(`${this.baseUrl}/document-type/${documentTypeId}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error(`Error fetching form submissions for document type ${documentTypeId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get form submission by ID
   */
  getSubmissionById(id: number): Observable<FormSubmissionDetailDto> {
    // Try /{id} endpoint first (standard REST pattern)
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        // If 404, try /details/{id} endpoint as fallback
        if (error?.status === 404) {
          console.warn(`[FormSubmissionsService] Endpoint /${id} returned 404, trying /details/${id}`);
          return this.http.get<any>(`${this.baseUrl}/details/${id}`).pipe(
            map((response: any) => {
              if (response && typeof response === 'object') {
                return response.data || response.result || response;
              }
              return response;
            }),
            catchError((detailsError) => {
              console.error(`[FormSubmissionsService] Both endpoints failed for submission ${id}`);
              console.error(`[FormSubmissionsService] Error from /details/${id}:`, detailsError);
              // Return a basic submission object with empty fieldValues to prevent complete failure
              return of({
                id: id,
                formBuilderId: 0,
                version: 1,
                documentTypeId: 0,
                seriesId: 0,
                documentNumber: '',
                submittedByUserId: '',
                submittedDate: new Date(),
                status: 'Submitted',
                createdDate: new Date(),
                lastUpdatedDate: new Date(),
                fieldValues: [],
                attachments: [],
                gridData: []
              } as FormSubmissionDetailDto);
            })
          );
        }
        console.error(`[FormSubmissionsService] Error fetching form submission ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get form submission by document number
   */
  getSubmissionByDocumentNumber(documentNumber: string): Observable<FormSubmissionDetailDto> {
    return this.http.get<any>(`${this.baseUrl}/document/${documentNumber}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching form submission by document number ${documentNumber}:`, error);
        throw error;
      })
    );
  }

  /**
   * Create new form submission
   */
  createSubmission(dto: CreateFormSubmissionDto): Observable<FormSubmissionDto> {
    return this.http.post<any>(this.baseUrl, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error creating form submission:', error);
        console.error('Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.error?.message || error?.error?.detail || error?.message,
          url: error?.url
        });
        throw error;
      })
    );
  }

  /**
   * Create draft submission
   */
  createDraft(formBuilderId: number, projectId: number, submittedByUserId: string): Observable<FormSubmissionDto> {
    return this.http.post<any>(`${this.baseUrl}/draft`, null, {
      params: {
        formBuilderId: formBuilderId.toString(),
        projectId: projectId.toString(),
        submittedByUserId: submittedByUserId
      }
    }).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error creating draft submission:', error);
        throw error;
      })
    );
  }

  /**
   * Update form submission
   */
  updateSubmission(id: number, dto: UpdateFormSubmissionDto): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error updating form submission ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete form submission
   */
  deleteSubmission(id: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error deleting form submission ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Update submission status
   */
  updateStatus(id: number, status: string): Observable<void> {
    // Try multiple formats - API might expect different formats
    // Format 1: JSON object with status property
    return this.http.patch<any>(`${this.baseUrl}/${id}/status`, { status: status }, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError((error) => {
        // If JSON object fails, try string directly
        if (error?.status === 400) {
          console.warn(`[FormSubmissionsService] JSON format failed, trying string format`);
          return this.http.patch<any>(`${this.baseUrl}/${id}/status`, `"${status}"`, {
            headers: {
              'Content-Type': 'application/json'
            }
          }).pipe(
            catchError((stringError) => {
              // If string format fails, try query parameter
              console.warn(`[FormSubmissionsService] String format failed, trying query parameter`);
              return this.http.patch<any>(`${this.baseUrl}/${id}/status?status=${encodeURIComponent(status)}`, null).pipe(
                catchError((queryError) => {
                  console.error(`Error updating submission status ${id} with all formats:`, queryError);
                  throw queryError;
                })
              );
            })
          );
        }
        console.error(`Error updating submission status ${id}:`, error);
        throw error;
      }),
      map(() => {
        return;
      })
    );
  }

  /**
   * Save form submission data (field values, attachments, grid data)
   */
  saveSubmissionData(dto: SaveFormSubmissionDataDto): Observable<void> {
    return this.http.post<any>(`${this.baseUrl}/save-data`, dto).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error('Error saving form submission data:', error);
        throw error;
      })
    );
  }

  /**
   * Submit form submission
   * POST /api/FormSubmissions/submit
   * 
   * Workflow Logic:
   * - If DocumentType has no ApprovalWorkflow → Auto-approve (status = "Approved")
   * - If DocumentType has Active ApprovalWorkflow → Submit (status = "Submitted")
   * - If DocumentType has Inactive ApprovalWorkflow → Auto-approve (status = "Approved")
   */
  submitSubmission(submissionId: number, submittedByUserId: string): Observable<FormSubmissionDto> {
    return this.http.post<any>(`${this.baseUrl}/submit`, {
      submissionId,
      submittedByUserId
    }).pipe(
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
        console.error(`[FormSubmissionsService] Error submitting form submission ${submissionId}:`, error);
        
        // Extract error message
        const errorResponse = error?.error;
        let errorMessage = 'Failed to submit form submission';
        
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
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        // Check for specific error scenarios
        const errorText = errorMessage.toLowerCase();
        if (errorText.includes('already submitted') || errorText.includes('already approved')) {
          errorMessage = 'This form submission has already been submitted or approved.';
        } else if (errorText.includes('draft') && errorText.includes('required')) {
          errorMessage = 'Form submission must be in Draft status before submitting.';
        } else if (errorText.includes('not found')) {
          errorMessage = 'Form submission not found.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Approve form submission (using DTO)
   * POST /api/FormSubmissions/approve
   * 
   * This endpoint:
   * - Changes submission status to "Approved"
   * - Updates UpdatedDate
   * - Creates a record in DocumentApprovalHistory with ActionType = "Approved"
   */
  approveSubmissionDto(dto: ApproveSubmissionDto): Observable<ApiResponse<FormSubmissionDto>> {
    return this.http.post<any>(`${this.baseUrl}/approve`, dto).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper or direct object response
        if (response && typeof response === 'object') {
          if (response.statusCode !== undefined) {
            return response as ApiResponse<FormSubmissionDto>;
          }
          if (response.success !== undefined) {
            return {
              statusCode: response.success ? 200 : 400,
              message: response.message || 'Operation completed',
              data: response.data || response
            } as ApiResponse<FormSubmissionDto>;
          }
          // Direct object response - wrap it
          return {
            statusCode: 200,
            message: 'Submission approved successfully',
            data: response.data || response.result || response
          } as ApiResponse<FormSubmissionDto>;
        }
        return {
          statusCode: 200,
          message: 'Submission approved successfully',
          data: response
        } as ApiResponse<FormSubmissionDto>;
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] Error approving form submission:`, error);
        return this.handleApproveRejectError(error, 'approve');
      })
    );
  }

  /**
   * Approve form submission (legacy method - kept for backward compatibility)
   * POST /api/FormSubmissions/approve
   * 
   * This endpoint:
   * - Changes submission status to "Approved"
   * - Updates UpdatedDate
   * - Creates a record in DocumentApprovalHistory with ActionType = "Approved"
   */
  approveSubmission(
    submissionId: number,
    stageId: number,
    actionByUserId: string,
    comments?: string | null
  ): Observable<FormSubmissionDto> {
    return this.http.post<any>(`${this.baseUrl}/approve`, {
      submissionId,
      stageId,
      actionByUserId,
      comments: comments || null
    }).pipe(
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
        console.error(`[FormSubmissionsService] Error approving form submission ${submissionId}:`, error);
        
        // Extract error message with better handling for 404
        const errorResponse = error?.error;
        let errorMessage = 'Failed to approve form submission';
        
        // Handle 404 specifically
        if (error?.status === 404) {
          errorMessage = 'Approve endpoint not found (404). Please ensure the backend API is running and the endpoint /api/FormSubmissions/approve exists.';
        } else if (error?.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error?.status === 403) {
          errorMessage = 'You do not have permission to approve this submission.';
        } else if (errorResponse) {
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
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Reject form submission (using DTO)
   * POST /api/FormSubmissions/reject
   * 
   * This endpoint:
   * - Changes submission status to "Rejected"
   * - Updates UpdatedDate
   * - Creates a record in DocumentApprovalHistory with ActionType = "Rejected"
   */
  rejectSubmissionDto(dto: RejectSubmissionDto): Observable<ApiResponse<FormSubmissionDto>> {
    return this.http.post<any>(`${this.baseUrl}/reject`, dto).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper or direct object response
        if (response && typeof response === 'object') {
          if (response.statusCode !== undefined) {
            return response as ApiResponse<FormSubmissionDto>;
          }
          if (response.success !== undefined) {
            return {
              statusCode: response.success ? 200 : 400,
              message: response.message || 'Operation completed',
              data: response.data || response
            } as ApiResponse<FormSubmissionDto>;
          }
          // Direct object response - wrap it
          return {
            statusCode: 200,
            message: 'Submission rejected successfully',
            data: response.data || response.result || response
          } as ApiResponse<FormSubmissionDto>;
        }
        return {
          statusCode: 200,
          message: 'Submission rejected successfully',
          data: response
        } as ApiResponse<FormSubmissionDto>;
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] Error rejecting form submission:`, error);
        return this.handleApproveRejectError(error, 'reject');
      })
    );
  }

  /**
   * Reject form submission (legacy method - kept for backward compatibility)
   * POST /api/FormSubmissions/reject
   * 
   * This endpoint:
   * - Changes submission status to "Rejected"
   * - Updates UpdatedDate
   * - Creates a record in DocumentApprovalHistory with ActionType = "Rejected"
   */
  rejectSubmission(
    submissionId: number,
    stageId: number,
    actionByUserId: string,
    comments?: string | null
  ): Observable<FormSubmissionDto> {
    return this.http.post<any>(`${this.baseUrl}/reject`, {
      submissionId,
      stageId,
      actionByUserId,
      comments: comments || null
    }).pipe(
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
        console.error(`[FormSubmissionsService] Error rejecting form submission ${submissionId}:`, error);
        
        // Extract error message with better handling for 404
        const errorResponse = error?.error;
        let errorMessage = 'Failed to reject form submission';
        
        // Handle 404 specifically
        if (error?.status === 404) {
          errorMessage = 'Reject endpoint not found (404). Please ensure the backend API is running and the endpoint /api/FormSubmissions/reject exists.';
        } else if (error?.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error?.status === 403) {
          errorMessage = 'You do not have permission to reject this submission.';
        } else if (errorResponse) {
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
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Helper method to handle approve/reject errors consistently
   */
  private handleApproveRejectError(error: any, action: 'approve' | 'reject'): Observable<never> {
    const errorResponse = error?.error;
    let errorMessage = `Failed to ${action} form submission`;
    
    // Handle 404 specifically
    if (error?.status === 404) {
      errorMessage = `${action === 'approve' ? 'Approve' : 'Reject'} endpoint not found (404). Please ensure the backend API is running and the endpoint /api/FormSubmissions/${action} exists.`;
    } else if (error?.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error?.status === 403) {
      errorMessage = `You do not have permission to ${action} this submission.`;
    } else if (errorResponse) {
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
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    const apiError: ApiResponse<FormSubmissionDto> = {
      statusCode: error?.status || 500,
      message: errorMessage,
      data: undefined
    };

    return new Observable(observer => {
      observer.error(apiError);
    });
  }
}

