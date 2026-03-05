import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  CopyToDocumentRequestDto,
  CopyToDocumentResultDto,
  CopyToDocumentAuditDto,
  CopyToDocumentAuditQueryParams,
  CopyToDocumentAuditResponse,
  CopyToDocumentSetupDto,
  CreateCopyToDocumentSetupRequestDto,
  UpdateCopyToDocumentSetupRequestDto,
  ExecuteCopyToDocumentRequestDto,
  ExecuteCopyToDocumentByCodesRequestDto,
  ExecuteManualCopyToDocumentRequestDto,
  ExecuteManualCopyToDocumentResponseDto,
  ApiResponse
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CopyToDocumentService {
  private baseUrl = `${environment.apiUrl}/CopyToDocument`;

  constructor(private http: HttpClient) {}

  /**
   * تنفيذ CopyToDocument
   * POST /api/CopyToDocument/execute
   * ✅ Updated: Supports new API structure with sourceDocumentTypeId, sourceFormId, initialStatus
   */
  executeCopyToDocument(request: CopyToDocumentRequestDto | ExecuteCopyToDocumentRequestDto): Observable<CopyToDocumentResultDto> {
    console.log('[CopyToDocumentService] Executing CopyToDocument:', request);
    
    return this.http.post<ApiResponse<CopyToDocumentResultDto>>(
      `${this.baseUrl}/execute`,
      request
    ).pipe(
      map((response: ApiResponse<CopyToDocumentResultDto>) => {
        if (response.data) {
          return response.data;
        }
        // Fallback: إذا كانت الاستجابة مباشرة بدون wrapper
        return response as any as CopyToDocumentResultDto;
      }),
      catchError((error) => {
        console.error('[CopyToDocumentService] Error executing CopyToDocument:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * تنفيذ CopyToDocument باستخدام Codes
   * POST /api/CopyToDocument/execute-by-codes
   * ✅ New: Added for Codes-based API
   */
  executeCopyToDocumentByCodes(request: ExecuteCopyToDocumentByCodesRequestDto): Observable<CopyToDocumentResultDto> {
    console.log('[CopyToDocumentService] Executing CopyToDocument by Codes:', request);
    
    return this.http.post<ApiResponse<CopyToDocumentResultDto>>(
      `${this.baseUrl}/execute-by-codes`,
      request
    ).pipe(
      map((response: ApiResponse<CopyToDocumentResultDto>) => {
        if (response.data) {
          return response.data;
        }
        // Fallback: إذا كانت الاستجابة مباشرة بدون wrapper
        return response as any as CopyToDocumentResultDto;
      }),
      catchError((error) => {
        console.error('[CopyToDocumentService] Error executing CopyToDocument by Codes:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * جلب Audit Records مع Pagination و Filters
   * GET /api/CopyToDocument/audit
   */
  getAuditRecords(params?: CopyToDocumentAuditQueryParams): Observable<CopyToDocumentAuditResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.pageSize !== undefined) {
        httpParams = httpParams.set('pageSize', params.pageSize.toString());
      }
      if (params.targetDocumentId !== undefined) {
        httpParams = httpParams.set('targetDocumentId', params.targetDocumentId.toString());
      }
      if (params.success !== undefined) {
        httpParams = httpParams.set('success', params.success.toString());
      }
      if (params.startDate) {
        httpParams = httpParams.set('startDate', params.startDate);
      }
      if (params.endDate) {
        httpParams = httpParams.set('endDate', params.endDate);
      }
    }

    return this.http.get<ApiResponse<CopyToDocumentAuditResponse>>(
      `${this.baseUrl}/audit`,
      { params: httpParams }
    ).pipe(
      map((response: ApiResponse<CopyToDocumentAuditResponse>) => {
        if (response.data) {
          // Handle nested data structure: response.data.data contains the actual response
          const auditResponse = response.data as any;
          if (auditResponse.data && Array.isArray(auditResponse.data)) {
            // API returns { data: { data: [...], totalCount, ... } }
            return {
              items: auditResponse.data,
              totalCount: auditResponse.totalCount || 0,
              page: auditResponse.page || 1,
              pageSize: auditResponse.pageSize || 50,
              totalPages: auditResponse.totalPages || 1
            } as CopyToDocumentAuditResponse;
          }
          // Fallback: if structure is { items: [...], totalCount, ... }
          return auditResponse as CopyToDocumentAuditResponse;
        }
        // Fallback: إذا كانت الاستجابة مباشرة
        return response as any as CopyToDocumentAuditResponse;
      }),
      catchError((error) => {
        console.error('[CopyToDocumentService] Error fetching audit records:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * جلب Audit Record محدد بالـ ID
   * GET /api/CopyToDocument/audit/{id}
   */
  getAuditRecordById(id: number): Observable<CopyToDocumentAuditDto> {
    return this.http.get<ApiResponse<CopyToDocumentAuditDto>>(
      `${this.baseUrl}/audit/${id}`
    ).pipe(
      map((response: ApiResponse<CopyToDocumentAuditDto>) => {
        if (response.data) {
          return response.data;
        }
        return response as any as CopyToDocumentAuditDto;
      }),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error fetching audit record ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * جلب Audit Records لـ Submission محدد
   * GET /api/CopyToDocument/audit/submission/{submissionId}
   */
  getAuditRecordsBySubmission(submissionId: number): Observable<CopyToDocumentAuditDto[]> {
    return this.http.get<ApiResponse<CopyToDocumentAuditDto[]>>(
      `${this.baseUrl}/audit/submission/${submissionId}`
    ).pipe(
      map((response: ApiResponse<CopyToDocumentAuditDto[]>) => {
        if (response.data) {
          return response.data;
        }
        return response as any as CopyToDocumentAuditDto[];
      }),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error fetching audit records for submission ${submissionId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * جلب Audit Records لمستند هدف محدد
   * GET /api/CopyToDocument/audit/target/{targetDocumentId}
   */
  getAuditRecordsByTargetDocument(targetDocumentId: number): Observable<CopyToDocumentAuditDto[]> {
    return this.http.get<ApiResponse<CopyToDocumentAuditDto[]>>(
      `${this.baseUrl}/audit/target/${targetDocumentId}`
    ).pipe(
      map((response: ApiResponse<CopyToDocumentAuditDto[]>) => {
        if (response.data) {
          return response.data;
        }
        return response as any as CopyToDocumentAuditDto[];
      }),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error fetching audit records for target document ${targetDocumentId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * الحصول على سجلات Audit لمستند مصدر محدد
   * GET /api/CopyToDocument/audit/submission/{submissionId}
   * ✅ Alias method for better naming consistency
   */
  getAuditRecordsBySubmissionId(submissionId: number): Observable<CopyToDocumentAuditDto[]> {
    return this.getAuditRecordsBySubmission(submissionId);
  }

  /**
   * الحصول على سجلات Audit لمستند هدف محدد
   * GET /api/CopyToDocument/audit/target/{targetDocumentId}
   * ✅ Alias method for better naming consistency
   */
  getAuditRecordsByTargetDocumentId(targetDocumentId: number): Observable<CopyToDocumentAuditDto[]> {
    return this.getAuditRecordsByTargetDocument(targetDocumentId);
  }

  /**
   * Helper Method: تحويل FieldMapping من Object إلى Array
   */
  convertFieldMappingToArray(fieldMapping: { [key: string]: string }): Array<{ sourceFieldCode: string; targetFieldCode: string }> {
    return Object.keys(fieldMapping).map(sourceFieldCode => ({
      sourceFieldCode,
      targetFieldCode: fieldMapping[sourceFieldCode]
    }));
  }

  /**
   * Helper Method: تحويل FieldMapping من Array إلى Object
   */
  convertFieldMappingToObject(fieldMappings: Array<{ sourceFieldCode: string; targetFieldCode: string }>): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    fieldMappings.forEach(mapping => {
      result[mapping.sourceFieldCode] = mapping.targetFieldCode;
    });
    return result;
  }

  getSetups(): Observable<CopyToDocumentSetupDto[]> {
    return this.http.get<ApiResponse<CopyToDocumentSetupDto[]>>(
      `${this.baseUrl}/setups`
    ).pipe(
      map((response: ApiResponse<CopyToDocumentSetupDto[]>) => response.data ?? (response as any as CopyToDocumentSetupDto[])),
      catchError((error) => {
        console.error('[CopyToDocumentService] Error fetching setups:', error);
        return throwError(() => error);
      })
    );
  }

  getSetupById(id: number): Observable<CopyToDocumentSetupDto> {
    return this.http.get<ApiResponse<CopyToDocumentSetupDto>>(
      `${this.baseUrl}/setups/${id}`
    ).pipe(
      map((response: ApiResponse<CopyToDocumentSetupDto>) => response.data ?? (response as any as CopyToDocumentSetupDto)),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error fetching setup ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  createSetup(request: CreateCopyToDocumentSetupRequestDto): Observable<CopyToDocumentSetupDto> {
    return this.http.post<ApiResponse<CopyToDocumentSetupDto>>(
      `${this.baseUrl}/setups`,
      request
    ).pipe(
      map((response: ApiResponse<CopyToDocumentSetupDto>) => response.data ?? (response as any as CopyToDocumentSetupDto)),
      catchError((error) => {
        console.error('[CopyToDocumentService] Error creating setup:', error);
        return throwError(() => error);
      })
    );
  }

  updateSetup(id: number, request: UpdateCopyToDocumentSetupRequestDto): Observable<CopyToDocumentSetupDto> {
    return this.http.put<ApiResponse<CopyToDocumentSetupDto>>(
      `${this.baseUrl}/setups/${id}`,
      request
    ).pipe(
      map((response: ApiResponse<CopyToDocumentSetupDto>) => response.data ?? (response as any as CopyToDocumentSetupDto)),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error updating setup ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteSetup(id: number): Observable<void> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/setups/${id}`
    ).pipe(
      map(() => void 0),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error deleting setup ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  executeManualSetupsForSubmission(
    submissionId: number,
    request?: ExecuteManualCopyToDocumentRequestDto
  ): Observable<ExecuteManualCopyToDocumentResponseDto> {
    return this.http.post<ApiResponse<ExecuteManualCopyToDocumentResponseDto>>(
      `${this.baseUrl}/submissions/${submissionId}/execute-manual`,
      request ?? {}
    ).pipe(
      map((response: ApiResponse<ExecuteManualCopyToDocumentResponseDto>) =>
        response.data ?? (response as any as ExecuteManualCopyToDocumentResponseDto)
      ),
      catchError((error) => {
        console.error(`[CopyToDocumentService] Error executing manual setups for submission ${submissionId}:`, error);
        return throwError(() => error);
      })
    );
  }
}
