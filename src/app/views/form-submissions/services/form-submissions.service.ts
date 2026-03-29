import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApproveSubmissionDto, RejectSubmissionDto, ApiResponse } from '../models/approve-reject-submission.model';

export interface FormSubmissionDto {
  id: number;
  formBuilderId: number;
  formName?: string;
  version: number;
  documentTypeId: number;
  documentTypeName?: string | null; // Can be null from backend
  seriesId: number;
  seriesCode?: string;
  documentNumber?: string;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedDate: Date;
  status: string;
  stageId?: number | null;
  signatureStageId?: number | null;
  signatureRequired?: boolean;
  signatureStatus?: 'not_required' | 'pending' | 'signed' | string;
  docuSignEnvelopeId?: string | null;
  signedAt?: Date | null;
  sapIntegrationEnabled: boolean;
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
  stageId?: number;
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

export interface SubmitFormDto {
  submissionId: number;
  submittedByUserId: string;
}

export interface SubmitFormResponseDto {
  submitted: boolean;
  signatureRequired: boolean;
  signatureStatus: 'not_required' | 'pending' | 'signed' | string;
  signingUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionsService {
  private baseUrl = `${environment.apiUrl}/FormSubmissions`;

  constructor(private http: HttpClient) {}

  private buildDocuSignHeaders(): HttpHeaders {
    // JWT server-to-server flow is the default.
    // Do not attach browser-stored DocuSign OAuth token automatically to avoid sending stale/invalid tokens.
    return new HttpHeaders();
  }

  private normalizeSubmissionDto(item: any): FormSubmissionDto {
    return {
      ...item,
      id: Number(item?.id ?? item?.Id ?? 0),
      formBuilderId: Number(item?.formBuilderId ?? item?.FormBuilderId ?? 0),
      documentTypeId: Number(item?.documentTypeId ?? item?.DocumentTypeId ?? 0),
      seriesId: Number(item?.seriesId ?? item?.SeriesId ?? 0),
      status: item?.status ?? item?.Status ?? '',
      stageId: item?.stageId ?? item?.StageId ?? null,
      signatureStageId: item?.signatureStageId ?? item?.SignatureStageId ?? null,
      signatureRequired: (item?.signatureRequired ?? item?.SignatureRequired) !== undefined
        ? Boolean(item?.signatureRequired ?? item?.SignatureRequired)
        : undefined,
      signatureStatus: item?.signatureStatus ?? item?.SignatureStatus ?? 'not_required',
      docuSignEnvelopeId: item?.docuSignEnvelopeId ?? item?.DocuSignEnvelopeId ?? null,
      signedAt: item?.signedAt ?? item?.SignedAt ?? null,
      sapIntegrationEnabled: Boolean(item?.sapIntegrationEnabled ?? item?.SapIntegrationEnabled),
      submittedByUserId: item?.submittedByUserId ?? item?.SubmittedByUserId ?? '',
      submittedByUserName: item?.submittedByUserName ?? item?.SubmittedByUserName ?? '',
      documentNumber: item?.documentNumber ?? item?.DocumentNumber ?? '',
      formName: item?.formName ?? item?.FormName ?? '',
      documentTypeName: item?.documentTypeName ?? item?.DocumentTypeName ?? '',
      seriesCode: item?.seriesCode ?? item?.SeriesCode ?? '',
      submittedDate: item?.submittedDate ?? item?.SubmittedDate ?? null,
      createdDate: item?.createdDate ?? item?.CreatedDate ?? null,
      lastUpdatedDate: item?.lastUpdatedDate ?? item?.LastUpdatedDate ?? null,
      version: Number(item?.version ?? item?.Version ?? 1)
    } as FormSubmissionDto;
  }

  /**
   * Get all form submissions
   */
  getAllSubmissions(): Observable<FormSubmissionDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        let items: any[] = [];
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          items = response.data || response.items || response.result || [];
        } else {
          items = Array.isArray(response) ? response : [];
        }
        return (items || []).map((item: any) => this.normalizeSubmissionDto(item));
      }),
      catchError((error) => {
        console.error('Error fetching form submissions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get latest non-draft document number for a specific form
   */
  getLatestDocumentNumberByFormBuilderId(formBuilderId: number): Observable<string | null> {
    return this.http.get<any>(`${this.baseUrl}/latest-document-number/form/${formBuilderId}`).pipe(
      map((response: any) => {
        const payload = response && typeof response === 'object'
          ? (response.data ?? response.result ?? response)
          : response;

        const documentNumber = typeof payload === 'string'
          ? payload.trim()
          : '';

        return documentNumber || null;
      }),
      catchError((error) => {
        console.error(`Error fetching latest document number for form ${formBuilderId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Get form submissions by Document Type ID
   */
  getSubmissionsByDocumentTypeId(documentTypeId: number): Observable<FormSubmissionDto[]> {
    return this.http.get<any>(`${this.baseUrl}/document-type/${documentTypeId}`).pipe(
      // Prevent infinite loading if backend/network hangs
      timeout(15000),
      map((response: any) => {
        let items: any[] = [];
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          items = response.data || response.items || response.result || [];
        } else {
          items = Array.isArray(response) ? response : [];
        }
        return (items || []).map((item: any) => this.normalizeSubmissionDto(item));
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
    console.log(`[FormSubmissionsService] Getting submission by ID: ${id}`);
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        // Log raw response first
        console.log(`[FormSubmissionsService] Raw API response for submission ${id}:`, response);
        console.log(`[FormSubmissionsService] Response type:`, typeof response);
        console.log(`[FormSubmissionsService] Response.data:`, response?.data);
        console.log(`[FormSubmissionsService] Response.data?.fieldValues:`, response?.data?.fieldValues);
        console.log(`[FormSubmissionsService] Response.data?.gridData:`, response?.data?.gridData);
        
        const submission = response && typeof response === 'object'
          ? (response.data || response.result || response)
          : response;
        
        // Log submission after extraction
        console.log(`[FormSubmissionsService] Extracted submission:`, submission);
        console.log(`[FormSubmissionsService] submission.fieldValues:`, submission?.fieldValues);
        console.log(`[FormSubmissionsService] submission.gridData:`, submission?.gridData);
        
        // Log fieldValues and gridData if present
        if (submission) {
          console.log(`[FormSubmissionsService] Submission ${id} data:`, {
            hasFieldValues: !!(submission.fieldValues && submission.fieldValues.length > 0),
            fieldValuesCount: submission.fieldValues?.length || 0,
            hasGridData: !!(submission.gridData && submission.gridData.length > 0),
            gridDataCount: submission.gridData?.length || 0,
            hasAttachments: !!(submission.attachments && submission.attachments.length > 0),
            attachmentsCount: submission.attachments?.length || 0
          });
          
          if (submission.fieldValues && submission.fieldValues.length > 0) {
            console.log(`[FormSubmissionsService] Submission ${id} fieldValues:`, submission.fieldValues.map((fv: any) => ({
              id: fv.id,
              fieldId: fv.fieldId,
              fieldCode: fv.fieldCode,
              valueString: fv.valueString,
              valueNumber: fv.valueNumber
            })));
          }
          
          if (submission.gridData && submission.gridData.length > 0) {
            console.log(`[FormSubmissionsService] Submission ${id} has gridData:`, {
              gridDataCount: submission.gridData.length,
              grids: submission.gridData.map((g: any) => ({
                gridId: g.gridId,
                gridName: g.gridName,
                rowsCount: g.rows?.length || 0,
                cellsCount: g.cells?.length || 0
              }))
            });
          }
        } else {
          console.warn(`[FormSubmissionsService] Submission ${id} has NO data!`, submission);
        }
        
        return submission;
      }),
      catchError((error) => {
        // If 404, try /details/{id} endpoint as fallback
        if (error?.status === 404) {
          console.warn(`[FormSubmissionsService] Endpoint /${id} returned 404, trying /details/${id}`);
          return this.http.get<any>(`${this.baseUrl}/details/${id}`).pipe(
            map((response: any) => {
              const submission = response && typeof response === 'object'
                ? (response.data || response.result || response)
                : response;
              
              // Log gridData if present
              if (submission && submission.gridData) {
                console.log(`[FormSubmissionsService] Submission ${id} from /details has gridData:`, {
                  gridDataCount: submission.gridData.length,
                  grids: submission.gridData.map((g: any) => ({
                    gridId: g.gridId,
                    gridName: g.gridName,
                    rowsCount: g.rows?.length || 0,
                    cellsCount: g.cells?.length || 0
                  }))
                });
              } else {
                console.warn(`[FormSubmissionsService] Submission ${id} from /details has NO gridData!`, submission);
              }
              
              return submission;
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
                sapIntegrationEnabled: false,
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
   * POST /api/FormSubmissions/draft?formBuilderId={id}&projectId={projectId}&submittedByUserId={userId}&seriesId={seriesId}
   *
   * This creates a new draft submission with:
   * - Status = "Draft"
   * - StageId = null
   *
   * @param formBuilderId The form builder ID
   * @param projectId The project ID
   * @param submittedByUserId The user who created the draft
   * @param seriesId The document series ID (optional - backend will auto-select if not provided)
   * 
   * Note: If seriesId is not provided, the backend will automatically select an active series
   * based on documentTypeId and projectId. It's recommended to provide seriesId for better control.
   */
  createDraft(formBuilderId: number, projectId: number, submittedByUserId: string, seriesId?: number): Observable<FormSubmissionDto> {
    const params: any = {
      formBuilderId: formBuilderId.toString(),
      projectId: projectId.toString(),
      submittedByUserId: submittedByUserId
    };
    
    // Add seriesId if provided
    if (seriesId && seriesId > 0) {
      params.seriesId = seriesId.toString();
    }
    
    return this.http.post<any>(`${this.baseUrl}/draft`, {}, { params }).pipe(
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
    // Some backends bind PascalCase DTOs (StageId) while others bind camelCase (stageId).
    // To be resilient, when stageId is present we send BOTH keys.
    const payload: any = { ...dto };
    if (dto && (dto as any).stageId !== undefined) {
      payload.stageId = (dto as any).stageId;
      payload.StageId = (dto as any).stageId;
    }

    console.log('[FormSubmissionsService] updateSubmission called:', { id, dto: payload });
    console.log('[FormSubmissionsService] DTO JSON:', JSON.stringify(payload));
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload).pipe(
      map((response) => {
        console.log('[FormSubmissionsService] ✅ Update response:', response);
        return;
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] ❌ Error updating form submission ${id}:`, error);
        console.error('[FormSubmissionsService] Error details:', JSON.stringify(error, null, 2));
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

  postSubmission(id: number): Observable<FormSubmissionDto> {
    return this.http.post<any>(`${this.baseUrl}/${id}/post`, {}).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          return this.normalizeSubmissionDto(response.data || response.result || response);
        }

        return this.normalizeSubmissionDto(response);
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] Error posting form submission ${id}:`, error);

        const errorResponse = error?.error;
        let errorMessage = 'Failed to post form submission';

        if (error?.status === 404) {
          errorMessage = 'Submission or post endpoint was not found.';
        } else if (error?.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error?.status === 403) {
          errorMessage = 'You do not have permission to post this submission.';
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
   * Save form submission data (field values, attachments, grid data)
   * POST /api/FormSubmissions/save-data
   *
   * Saves the form data without changing the submission status.
   * The submission remains in its current status (usually "Draft").
   */
  saveSubmissionData(dto: SaveFormSubmissionDataDto): Observable<void> {
    return this.http.post<any>(`${this.baseUrl}/save-data`, dto).pipe(
      catchError((error) => {
        // Backward-compatible fallback for environments that still expose /data/save.
        if (error.status === 404) {
          console.warn('[FormSubmissionsService] /save-data not found, trying /data/save');
          return this.http.post<any>(`${this.baseUrl}/data/save`, dto);
        }
        console.error('Error saving form submission data:', error);
        throw error;
      }),
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
   * Backend workflow logic (current):
   * - Always keeps status = "Submitted" when user submits
   * - Approval is handled explicitly via /approve or workflow runtime
   *
   * @param dto SubmitFormDto containing submissionId and submittedByUserId
   */
  submitSubmission(dto: SubmitFormDto): Observable<FormSubmissionDto>;
  /**
   * Submit form submission (legacy method with separate parameters)
   */
  submitSubmission(submissionId: number, submittedByUserId: string): Observable<FormSubmissionDto>;
  submitSubmission(submissionIdOrDto: number | SubmitFormDto, submittedByUserId?: string): Observable<FormSubmissionDto> {
    let requestBody: SubmitFormDto;

    if (typeof submissionIdOrDto === 'object') {
      requestBody = submissionIdOrDto;
    } else {
      requestBody = {
        submissionId: submissionIdOrDto,
        submittedByUserId: submittedByUserId!
      };
    }

    return this.http.post<any>(`${this.baseUrl}/submit`, requestBody).pipe(
      map((response: any) => {
        console.log(`[FormSubmissionsService] Submit response for submission ${requestBody.submissionId}:`, response);

        // Normalize the payload (ServiceResult<T> أو object مباشر)
        let payload = response;
        if (response && typeof response === 'object') {
          if (response.success !== undefined) {
            payload = response.data ?? response;
          } else if (!response.id) {
            payload = response.data || response.result || response;
          }
        }

        // بعض الـ APIs قد ترجع 200 مع body فيه isBlocked بدل 403
        // هنا نحولها إلى Error بـ isBlocked=true حتى يتعامل معها الـ component
        const blockingSource: any = payload && typeof payload === 'object'
          ? (payload.data && typeof payload.data === 'object' ? payload.data : payload)
          : null;

        if (blockingSource?.isBlocked) {
          const errorMessage =
            blockingSource.message ||
            response?.message ||
            'Form submission is blocked by a validation rule.';

          console.warn('[FormSubmissionsService] Submission blocked by rule (200 response with isBlocked=true):', {
            ruleId: blockingSource.ruleId,
            ruleName: blockingSource.ruleName,
            conditionKey: blockingSource.conditionKey,
            message: errorMessage
          });

          const blockingError: any = new Error(errorMessage);
          blockingError.isBlocked = true;
          blockingError.ruleId = blockingSource.ruleId;
          blockingError.ruleName = blockingSource.ruleName;
          blockingError.conditionKey =
            blockingSource.conditionKey || blockingSource.conditionField;
          blockingError.blockMessage = errorMessage;

          // رمي الـ Error علشان يوصَل للـ subscribe في الـ component
          throw blockingError;
        }

        console.log(
          `[FormSubmissionsService] Submit successful (no blocking) for submission ${requestBody.submissionId}`
        );
        return payload;
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] Error submitting form submission ${requestBody.submissionId}:`, error);

        // لو الماب فوق رمى BlockingError، نعيد رميه كما هو
        if (error?.isBlocked) {
          return throwError(() => error);
        }

        // Extract error response/body
        const errorResponse = error?.error;
        let errorMessage = 'Failed to submit form submission';

        // بعض الـ Backends بترجع Blocking Rules كـ 400 أو 403 مع body فيه isBlocked
        // هنا نطبع الـ error بالكامل عشان نعرف الشكل، وبعدين نحاول نطبع الـ payload المهم
        console.warn('[FormSubmissionsService] Raw submit error response:', errorResponse);

        // نحاول نطلع الـ payload اللي فيه isBlocked سواء في data أو مباشرة في الـ body
        const blockingPayload: any =
          (errorResponse && typeof errorResponse === 'object'
            ? (errorResponse.data && typeof errorResponse.data === 'object'
                ? errorResponse.data
                : errorResponse)
            : null);

        if (blockingPayload?.isBlocked) {
          // This is a blocking rule violation (status ممكن يكون 400 أو 403 أو غيره)
          errorMessage =
            blockingPayload.message ||
            errorResponse?.message ||
            'Form submission is blocked by a validation rule.';

          console.warn('[FormSubmissionsService] Submission blocked by rule (error response with isBlocked=true):', {
            status: error?.status,
            ruleId: blockingPayload.ruleId,
            ruleName: blockingPayload.ruleName,
            conditionKey: blockingPayload.conditionKey,
            message: errorMessage
          });

          const blockingError: any = new Error(errorMessage);
          blockingError.isBlocked = true;
          blockingError.ruleId = blockingPayload.ruleId;
          blockingError.ruleName = blockingPayload.ruleName;
          blockingError.conditionKey =
            blockingPayload.conditionKey || blockingPayload.conditionField;
          blockingError.blockMessage = errorMessage;

          return throwError(() => blockingError);
        }

        // لو مش Blocking Rule، نكمّل استخراج رسالة الخطأ العادية
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
        // Removed check for "already submitted" - allow resubmission
        // if (errorText.includes('already submitted') || errorText.includes('already approved')) {
        //   errorMessage = 'This form submission has already been submitted or approved.';
        // } else 
        if (errorText.includes('draft') && errorText.includes('required')) {
          errorMessage = 'Form submission must be in Draft status before submitting.';
        } else if (errorText.includes('not found')) {
          errorMessage = 'Form submission not found.';
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Submit by submission id and return signature flow response.
   * POST /api/submissions/{id}/submit
   */
  submitSubmissionById(submissionId: number): Observable<SubmitFormResponseDto> {
    return this.http.post<any>(`${environment.apiUrl}/submissions/${submissionId}/submit`, {}, {
      headers: this.buildDocuSignHeaders()
    }).pipe(
      map((response: any) => {
        const payload = response?.data || response?.result || response || {};

        return {
          submitted: Boolean(payload.submitted ?? payload.Submitted),
          signatureRequired: Boolean(payload.signatureRequired ?? payload.SignatureRequired),
          signatureStatus: (payload.signatureStatus ?? payload.SignatureStatus ?? 'not_required') as any,
          signingUrl: (payload.signingUrl ?? payload.SigningUrl ?? null) as string | null
        };
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] Error submitting by id ${submissionId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get embedded signing URL for a pending-signature submission.
   * POST /api/submissions/{id}/signing-url
   */
  getSubmissionSigningUrlById(submissionId: number): Observable<SubmitFormResponseDto> {
    return this.http.post<any>(`${environment.apiUrl}/submissions/${submissionId}/signing-url`, {}, {
      headers: this.buildDocuSignHeaders()
    }).pipe(
      map((response: any) => {
        const payload = response?.data || response?.result || response || {};

        return {
          submitted: Boolean(payload.submitted ?? payload.Submitted),
          signatureRequired: Boolean(payload.signatureRequired ?? payload.SignatureRequired),
          signatureStatus: (payload.signatureStatus ?? payload.SignatureStatus ?? 'not_required') as any,
          signingUrl: (payload.signingUrl ?? payload.SigningUrl ?? null) as string | null
        };
      }),
      catchError((error) => {
        console.error(`[FormSubmissionsService] Error getting signing url by id ${submissionId}:`, error);
        return throwError(() => error);
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
