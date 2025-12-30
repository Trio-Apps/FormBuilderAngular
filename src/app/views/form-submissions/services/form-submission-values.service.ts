import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

export interface CreateFormSubmissionValueDto {
  submissionId: number;
  fieldId: number;
  fieldCode: string;
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBool?: boolean;
  valueJson?: string;
}

export interface UpdateFormSubmissionValueDto {
  valueString?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBool?: boolean;
  valueJson?: string;
}

export interface BulkFormSubmissionValuesDto {
  submissionId: number;
  values: CreateFormSubmissionValueDto[];
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionValuesService {
  private baseUrl = `${environment.apiUrl}/FormSubmissionValues`;

  constructor(private http: HttpClient) {}

  /**
   * Get all form submission values
   */
  getAll(): Observable<FormSubmissionValueDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('Error fetching form submission values:', error);
        return of([]);
      })
    );
  }

  /**
   * Get form submission value by ID
   */
  getById(id: number): Observable<FormSubmissionValueDto> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching form submission value ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get form submission values by submission ID
   */
  getBySubmissionId(submissionId: number): Observable<FormSubmissionValueDto[]> {
    return this.http.get<any>(`${this.baseUrl}/submission/${submissionId}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error(`Error fetching form submission values for submission ${submissionId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get form submission values by field ID
   */
  getByFieldId(fieldId: number): Observable<FormSubmissionValueDto[]> {
    return this.http.get<any>(`${this.baseUrl}/field/${fieldId}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error(`Error fetching form submission values for field ${fieldId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get form submission value by submission ID and field ID
   */
  getBySubmissionAndField(submissionId: number, fieldId: number): Observable<FormSubmissionValueDto> {
    return this.http.get<any>(`${this.baseUrl}/submission/${submissionId}/field/${fieldId}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error fetching form submission value for submission ${submissionId} and field ${fieldId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Create new form submission value
   */
  create(dto: CreateFormSubmissionValueDto): Observable<FormSubmissionValueDto> {
    return this.http.post<any>(this.baseUrl, dto).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error creating form submission value:', error);
        throw error;
      })
    );
  }

  /**
   * Create bulk form submission values
   */
  createBulk(dto: BulkFormSubmissionValuesDto): Observable<FormSubmissionValueDto[]> {
    console.log('[FormSubmissionValuesService] createBulk - Sending DTO:', JSON.stringify(dto, null, 2));
    console.log('[FormSubmissionValuesService] createBulk - Values count:', dto.values?.length || 0);
    
    return this.http.post<any>(`${this.baseUrl}/bulk`, dto).pipe(
      map((response: any) => {
        console.log('[FormSubmissionValuesService] createBulk - Response:', response);
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response.data || response.items || response.result || [];
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error('[FormSubmissionValuesService] Error creating bulk form submission values:', error);
        console.error('[FormSubmissionValuesService] Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        if (error.error) {
          console.error('[FormSubmissionValuesService] Error response body:', JSON.stringify(error.error, null, 2));
        }
        throw error;
      })
    );
  }

  /**
   * Update form submission value
   */
  update(id: number, dto: UpdateFormSubmissionValueDto): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, dto).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error updating form submission value ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Update form submission value by submission ID and field ID
   */
  updateByField(submissionId: number, fieldId: number, dto: UpdateFormSubmissionValueDto): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/submission/${submissionId}/field/${fieldId}`, dto).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error updating form submission value for submission ${submissionId} and field ${fieldId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete form submission value
   */
  delete(id: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error deleting form submission value ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete all form submission values by submission ID
   */
  deleteBySubmissionId(submissionId: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/submission/${submissionId}`).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error(`Error deleting form submission values for submission ${submissionId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Check if form submission value exists
   */
  exists(id: number): Observable<boolean> {
    return this.http.get<any>(`${this.baseUrl}/${id}/exists`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object') {
          return response.data || response.result || false;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`Error checking existence of form submission value ${id}:`, error);
        return of(false);
      })
    );
  }
}

