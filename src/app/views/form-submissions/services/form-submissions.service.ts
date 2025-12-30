import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
    return this.http.get<any>(`${this.baseUrl}/details/${id}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching form submission ${id}:`, error);
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
    return this.http.patch<any>(`${this.baseUrl}/${id}/status`, status).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error updating submission status ${id}:`, error);
        throw error;
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
   */
  submitSubmission(submissionId: number, submittedByUserId: string): Observable<void> {
    return this.http.post<any>(`${this.baseUrl}/submit`, {
      submissionId,
      submittedByUserId
    }).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error submitting form submission ${submissionId}:`, error);
        throw error;
      })
    );
  }
}

