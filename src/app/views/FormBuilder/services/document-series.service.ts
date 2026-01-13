import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DocumentSeries,
  CreateDocumentSeries,
  UpdateDocumentSeries,
  DocumentSeriesNumber,
  ApiResponse
} from '../form-builder/models/document-series.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentSeriesService {
  private readonly baseUrl = `${environment.apiUrl}/DocumentSeries`;

  constructor(private http: HttpClient) {}

  /**
   * Get all document series
   */
  getAll(): Observable<DocumentSeries[]> {
    return this.http.get<ApiResponse<DocumentSeries[]>>(this.baseUrl).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get document series by ID
   */
  getById(id: number): Observable<DocumentSeries> {
    return this.http.get<ApiResponse<DocumentSeries>>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Get document series by series code
   */
  getBySeriesCode(seriesCode: string): Observable<DocumentSeries> {
    return this.http.get<ApiResponse<DocumentSeries>>(`${this.baseUrl}/code/${seriesCode}`).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Get document series by document type ID
   */
  getByDocumentTypeId(documentTypeId: number): Observable<DocumentSeries[]> {
    return this.http.get<ApiResponse<DocumentSeries[]>>(`${this.baseUrl}/document-type/${documentTypeId}`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get document series by project ID
   */
  getByProjectId(projectId: number): Observable<DocumentSeries[]> {
    return this.http.get<ApiResponse<DocumentSeries[]>>(`${this.baseUrl}/project/${projectId}`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get all active document series
   */
  getActive(): Observable<DocumentSeries[]> {
    return this.http.get<ApiResponse<DocumentSeries[]>>(`${this.baseUrl}/active`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get default series for document type and project
   */
  getDefaultSeries(documentTypeId: number, projectId: number): Observable<DocumentSeries> {
    const params = new HttpParams()
      .set('documentTypeId', documentTypeId.toString())
      .set('projectId', projectId.toString());
    
    return this.http.get<ApiResponse<DocumentSeries>>(`${this.baseUrl}/default`, { params }).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Get all active document series by document type and project
   * Returns all active series matching the document type and project combination
   */
  getByDocumentTypeAndProject(documentTypeId: number, projectId: number): Observable<DocumentSeries[]> {
    const params = new HttpParams()
      .set('documentTypeId', documentTypeId.toString())
      .set('projectId', projectId.toString());
    
    return this.http.get<ApiResponse<DocumentSeries[]>>(`${this.baseUrl}/document-type-project`, { params }).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Select series for submission automatically
   * Backend logic:
   * - If only one series exists, it's selected automatically
   * - If multiple series exist, matches by project and selects the default one
   * This method is used when creating form submissions to automatically select the appropriate series
   */
  selectSeriesForSubmission(documentTypeId: number, projectId: number): Observable<DocumentSeries> {
    const params = new HttpParams()
      .set('documentTypeId', documentTypeId.toString())
      .set('projectId', projectId.toString());
    
    return this.http.get<ApiResponse<DocumentSeries>>(`${this.baseUrl}/select-for-submission`, { params }).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Create new document series
   */
  create(createDto: CreateDocumentSeries): Observable<DocumentSeries> {
    return this.http.post<ApiResponse<DocumentSeries>>(this.baseUrl, createDto).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Update document series
   */
  update(id: number, updateDto: UpdateDocumentSeries): Observable<DocumentSeries> {
    return this.http.put<ApiResponse<DocumentSeries>>(`${this.baseUrl}/${id}`, updateDto).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Delete document series
   */
  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => void 0)
    );
  }

  /**
   * Toggle active status
   */
  toggleActive(id: number, isActive: boolean): Observable<DocumentSeries> {
    return this.http.patch<ApiResponse<DocumentSeries>>(`${this.baseUrl}/${id}/toggle-active`, isActive).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Set as default series
   */
  setAsDefault(id: number): Observable<DocumentSeries> {
    return this.http.patch<ApiResponse<DocumentSeries>>(`${this.baseUrl}/${id}/set-default`, {}).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Get next number for series
   */
  getNextNumber(id: number): Observable<DocumentSeriesNumber> {
    return this.http.get<ApiResponse<DocumentSeriesNumber>>(`${this.baseUrl}/${id}/next-number`).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Check if document series exists
   */
  exists(id: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/${id}/exists`).pipe(
      map(response => response.data || false)
    );
  }
}
