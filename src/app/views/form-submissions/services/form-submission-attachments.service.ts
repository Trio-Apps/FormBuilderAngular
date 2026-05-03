import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FormSubmissionAttachmentDto {
  id: number;
  submissionId: number;
  submissionDocumentNumber?: string;
  fieldId?: number | null;
  fieldCode?: string;
  fieldName?: string;
  gridId?: number | null;
  gridColumnId?: number | null;
  gridRowIndex?: number | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  uploadedDate: Date;
  fileSizeFormatted?: string;
  downloadUrl?: string;
}

export interface CreateFormSubmissionAttachmentDto {
  submissionId: number;
  fieldId?: number | null;
  fieldCode?: string | null;
  gridId?: number | null;
  gridColumnId?: number | null;
  gridRowIndex?: number | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
}

export interface UpdateFormSubmissionAttachmentDto {
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  contentType?: string;
}

export interface BulkAttachmentsDto {
  submissionId: number;
  attachments: CreateFormSubmissionAttachmentDto[];
}

export interface AttachmentStatsDto {
  submissionId: number;
  totalAttachments: number;
  totalSize: number;
  totalSizeFormatted: string;
  attachmentsByType: { [key: string]: number };
}

export interface AttachmentUploadResultDto {
  attachmentId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  uploadedDate: Date;
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionAttachmentsService {
  private baseUrl = `${environment.apiUrl}/FormSubmissionAttachments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormSubmissionAttachmentDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<FormSubmissionAttachmentDto> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  getBySubmissionId(submissionId: number): Observable<FormSubmissionAttachmentDto[]> {
    const url = `${this.baseUrl}/submission/${submissionId}`;
    console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Calling API: ${url}`);
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response for submissionId=${submissionId}:`, response);
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response type:`, typeof response);
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response is array:`, Array.isArray(response));
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response keys:`, response ? Object.keys(response) : 'null/undefined');
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response.data:`, response?.data);
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response.data is array:`, Array.isArray(response?.data));
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response.data length:`, Array.isArray(response?.data) ? response.data.length : 'N/A');
        
        // Try multiple possible response structures
        let attachments: any = null;
        
        if (Array.isArray(response)) {
          attachments = response;
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response is direct array with ${attachments.length} items`);
        } else if (response?.data) {
          attachments = response.data;
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Using response.data, type:`, Array.isArray(attachments) ? 'Array' : typeof attachments);
        } else if (response?.items) {
          attachments = response.items;
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Using response.items`);
        } else if (response?.attachments) {
          attachments = response.attachments;
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Using response.attachments`);
        } else if (response && typeof response === 'object') {
          attachments = response;
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Response is single object`);
        } else {
          attachments = [];
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - No attachments found in response`);
        }
        
        // Ensure we return an array
        const result = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - Final result:`, result.length, 'attachment(s)');
        if (result.length > 0) {
          console.log(`[FormSubmissionAttachmentsService] getBySubmissionId - First attachment:`, result[0]);
        }
        return result;
      }),
      catchError(this.handleError)
    );
  }

  getByFieldId(fieldId: number): Observable<FormSubmissionAttachmentDto[]> {
    return this.http.get<any>(`${this.baseUrl}/field/${fieldId}`).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  getBySubmissionAndField(submissionId: number, fieldId: number): Observable<FormSubmissionAttachmentDto[]> {
    const url = `${this.baseUrl}/submission/${submissionId}/field/${fieldId}`;
    console.log(`[FormSubmissionAttachmentsService] getBySubmissionAndField - Calling API: ${url}`);
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log(`[FormSubmissionAttachmentsService] getBySubmissionAndField - Response for submissionId=${submissionId}, fieldId=${fieldId}:`, response);
        console.log(`[FormSubmissionAttachmentsService] Response type:`, typeof response);
        console.log(`[FormSubmissionAttachmentsService] Response is array:`, Array.isArray(response));
        console.log(`[FormSubmissionAttachmentsService] Response keys:`, response ? Object.keys(response) : 'null/undefined');
        console.log(`[FormSubmissionAttachmentsService] Response.data:`, response?.data);
        console.log(`[FormSubmissionAttachmentsService] Response.data is array:`, Array.isArray(response?.data));
        console.log(`[FormSubmissionAttachmentsService] Response.data length:`, Array.isArray(response?.data) ? response.data.length : 'N/A');
        
        // Try multiple possible response structures
        let attachments: any = null;
        
        if (Array.isArray(response)) {
          // Response is directly an array
          attachments = response;
          console.log(`[FormSubmissionAttachmentsService] Response is direct array with ${attachments.length} items`);
        } else if (response?.data) {
          // Response has data property
          attachments = response.data;
          console.log(`[FormSubmissionAttachmentsService] Using response.data, type:`, Array.isArray(attachments) ? 'Array' : typeof attachments);
        } else if (response?.items) {
          // Response has items property
          attachments = response.items;
          console.log(`[FormSubmissionAttachmentsService] Using response.items`);
        } else if (response?.attachments) {
          // Response has attachments property
          attachments = response.attachments;
          console.log(`[FormSubmissionAttachmentsService] Using response.attachments`);
        } else if (response && typeof response === 'object') {
          // Response is a single object
          attachments = response;
          console.log(`[FormSubmissionAttachmentsService] Response is single object`);
        } else {
          attachments = [];
          console.log(`[FormSubmissionAttachmentsService] No attachments found in response`);
        }
        
        // Ensure we return an array
        const result = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);
        console.log(`[FormSubmissionAttachmentsService] Final result:`, result.length, 'attachment(s)');
        if (result.length > 0) {
          console.log(`[FormSubmissionAttachmentsService] First attachment:`, result[0]);
        }
        return result;
      }),
      catchError(this.handleError)
    );
  }

  getAttachmentStats(submissionId: number): Observable<AttachmentStatsDto> {
    return this.http.get<any>(`${this.baseUrl}/submission/${submissionId}/stats`).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  exists(id: number): Observable<boolean> {
    return this.http.get<any>(`${this.baseUrl}/${id}/exists`).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/download`, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  getDownloadUrl(id: number): string {
    return `${this.baseUrl}/${id}/download`;
  }

  create(dto: CreateFormSubmissionAttachmentDto): Observable<FormSubmissionAttachmentDto> {
    return this.http.post<any>(this.baseUrl, dto).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  createBulk(bulkDto: BulkAttachmentsDto): Observable<FormSubmissionAttachmentDto[]> {
    return this.http.post<any>(`${this.baseUrl}/bulk`, bulkDto).pipe(
      map(response => response.data || response),
      catchError(this.handleError)
    );
  }

  uploadFile(file: File, submissionId: number, fieldId: number, fieldCode: string): Observable<FormSubmissionAttachmentDto> {
    const formData = new FormData();
    // Backend expects properties matching UploadAttachmentRequest DTO
    // Using PascalCase to match backend API exactly (as shown in curl: File, SubmissionId, FieldId, FieldCode)
    formData.append('File', file);
    formData.append('SubmissionId', submissionId.toString());
    formData.append('FieldId', fieldId.toString());
    formData.append('FieldCode', fieldCode);

    // Log FormData contents for debugging
    console.log('[FormSubmissionAttachmentsService] uploadFile - FormData contents:');
    console.log('  - File:', file.name, `(${file.size} bytes, ${file.type})`);
    console.log('  - SubmissionId:', submissionId);
    console.log('  - FieldId:', fieldId);
    console.log('  - FieldCode:', fieldCode);
    console.log('[FormSubmissionAttachmentsService] uploadFile - Uploading to:', `${this.baseUrl}/upload`);

    return this.http.post<any>(`${this.baseUrl}/upload`, formData).pipe(
      map(response => {
        console.log('[FormSubmissionAttachmentsService] uploadFile - Full Response:', JSON.stringify(response, null, 2));
        console.log('[FormSubmissionAttachmentsService] uploadFile - Response statusCode:', response?.statusCode);
        console.log('[FormSubmissionAttachmentsService] uploadFile - Response message:', response?.message);
        console.log('[FormSubmissionAttachmentsService] uploadFile - Response data:', response?.data);
        
        // Ensure we return the data object, not the wrapper
        const attachmentData = response?.data || response;
        if (attachmentData?.id) {
          console.log('[FormSubmissionAttachmentsService] uploadFile - ✅ Attachment saved successfully with ID:', attachmentData.id);
        } else {
          console.warn('[FormSubmissionAttachmentsService] uploadFile - ⚠️ Response missing attachment ID:', attachmentData);
        }
        return attachmentData;
      }),
      catchError((error) => {
        console.error('[FormSubmissionAttachmentsService] uploadFile - Error:', error);
        console.error('[FormSubmissionAttachmentsService] uploadFile - Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        if (error.error) {
          console.error('[FormSubmissionAttachmentsService] uploadFile - Error response body:', JSON.stringify(error.error, null, 2));
        }
        return this.handleError(error);
      })
    );
  }

  uploadGridFile(file: File, submissionId: number, gridId: number, gridColumnId: number, gridRowIndex: number): Observable<FormSubmissionAttachmentDto> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('SubmissionId', submissionId.toString());
    formData.append('GridId', gridId.toString());
    formData.append('GridColumnId', gridColumnId.toString());
    formData.append('GridRowIndex', gridRowIndex.toString());

    return this.http.post<any>(`${this.baseUrl}/upload-grid`, formData).pipe(
      map(response => response?.data || response),
      catchError(this.handleError)
    );
  }

  uploadMultipleFiles(files: File[], submissionId: number, fieldId: number, fieldCode: string): Observable<AttachmentUploadResultDto[]> {
    const formData = new FormData();
    // Backend expects properties matching UploadMultipleAttachmentsRequest DTO
    // Using PascalCase to match backend API exactly
    files.forEach(file => {
      formData.append('Files', file);
    });
    formData.append('SubmissionId', submissionId.toString());
    formData.append('FieldId', fieldId.toString());
    formData.append('FieldCode', fieldCode);

    console.log('[FormSubmissionAttachmentsService] uploadMultipleFiles - Uploading files:', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
      submissionId,
      fieldId,
      fieldCode
    });

    return this.http.post<any>(`${this.baseUrl}/upload-multiple`, formData).pipe(
      map(response => {
        console.log('[FormSubmissionAttachmentsService] uploadMultipleFiles - Response:', response);
        return response.data || response;
      }),
      catchError((error) => {
        console.error('[FormSubmissionAttachmentsService] uploadMultipleFiles - Error:', error);
        console.error('[FormSubmissionAttachmentsService] uploadMultipleFiles - Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        if (error.error) {
          console.error('[FormSubmissionAttachmentsService] uploadMultipleFiles - Error response body:', JSON.stringify(error.error, null, 2));
        }
        return this.handleError(error);
      })
    );
  }

  update(id: number, dto: UpdateFormSubmissionAttachmentDto): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  deleteBySubmissionId(submissionId: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/submission/${submissionId}`).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  deleteBySubmissionAndField(submissionId: number, fieldId: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/submission/${submissionId}/field/${fieldId}`).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    let errorMessage = 'An unknown error occurred!';
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}

