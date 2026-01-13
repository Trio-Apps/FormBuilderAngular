import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FormSubmissionAttachmentDto {
  id?: number;
  submissionId: number;
  fieldId: number;
  fieldCode: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  uploadedDate?: string;
  downloadUrl?: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private baseUrl = `${environment.apiUrl}/FormSubmissionAttachments`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a single file
   */
  uploadFile(
    file: File,
    submissionId: number,
    fieldId: number,
    fieldCode: string
  ): Observable<ApiResponse<FormSubmissionAttachmentDto>> {
    const formData = new FormData();
    // Using PascalCase to match backend API exactly (as shown in curl: File, SubmissionId, FieldId, FieldCode)
    formData.append('File', file);
    formData.append('SubmissionId', submissionId.toString());
    formData.append('FieldId', fieldId.toString());
    formData.append('FieldCode', fieldCode);

    return this.http.post<ApiResponse<FormSubmissionAttachmentDto>>(
      `${this.baseUrl}/upload`,
      formData
    );
  }

  /**
   * Upload multiple files
   */
  uploadMultipleFiles(
    files: File[],
    submissionId: number,
    fieldId: number,
    fieldCode: string
  ): Observable<ApiResponse<FormSubmissionAttachmentDto[]>> {
    const formData = new FormData();
    // Using PascalCase to match backend API exactly
    files.forEach(file => {
      formData.append('Files', file);
    });
    formData.append('SubmissionId', submissionId.toString());
    formData.append('FieldId', fieldId.toString());
    formData.append('FieldCode', fieldCode);

    return this.http.post<ApiResponse<FormSubmissionAttachmentDto[]>>(
      `${this.baseUrl}/upload-multiple`,
      formData
    );
  }

  /**
   * Get attachments for a specific field
   * Note: This method requires a valid submissionId to work properly
   * If submissionId is not provided or is 0, it will return an empty array
   * to prevent unnecessary 404 errors
   * 
   * Backend endpoint: GET /api/FormSubmissionAttachments/field/{fieldId}
   * Optional: May require submissionId as query parameter: ?submissionId={submissionId}
   */
  getFieldAttachments(fieldId: number, submissionId?: number): Observable<ApiResponse<FormSubmissionAttachmentDto[]>> {
    // CRITICAL: Always check submissionId FIRST - if it's 0, null, undefined, NaN, or invalid, 
    // return empty array WITHOUT making HTTP request
    // This prevents 404 errors when no files have been uploaded yet
    // 
    // IMPORTANT: This method should NEVER make HTTP request if:
    // - submissionId is 0 (default value when form is first loaded)
    // - submissionId is null or undefined
    // - submissionId is NaN or <= 0
    // 
    // This is expected behavior because:
    // - In Admin: User only configures file field type, no files uploaded
    // - In Form View: User hasn't submitted form yet, no files uploaded
    // - Database table is empty (all NULL) until first file is uploaded
    
    // Early return if submissionId is missing, 0, null, undefined, or invalid
    // This is the PRIMARY protection against 404 errors
    // Check ALL possible invalid values to be absolutely sure
    const isValidSubmissionId = submissionId != null && 
                                 submissionId !== 0 && 
                                 submissionId !== undefined &&
                                 !isNaN(Number(submissionId)) && 
                                 Number(submissionId) > 0;
    
    if (!isValidSubmissionId) {
      // Return empty array without making HTTP request
      // This prevents 404 errors in console
      // This is NORMAL behavior when no files have been uploaded yet
      // NO HTTP REQUEST WILL BE MADE - this is the key protection
      return of({ statusCode: 200, message: 'No files found', data: [] });
    }
    
    // Only make HTTP request if submissionId is valid and > 0
    // Include submissionId as query parameter (Backend may require it)
    // Note: At this point, we know submissionId is valid (> 0)
    return this.http.get<ApiResponse<FormSubmissionAttachmentDto[]>>(
      `${this.baseUrl}/field/${fieldId}?submissionId=${submissionId}`
    );
  }

  /**
   * Delete an attachment
   */
  deleteAttachment(attachmentId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.baseUrl}/${attachmentId}`
    );
  }

  /**
   * Get download URL for a file
   */
  getDownloadUrl(attachmentId: number): string {
    return `${environment.apiUrl}/FormSubmissionAttachments/${attachmentId}/download`;
  }
}
