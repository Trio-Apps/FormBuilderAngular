import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  DocumentSettings,
  CreateDocumentSettingsDto,
  UpdateDocumentSettingsDto,
  Project
} from '../form-builder/models/document-settings.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentSettingsService {
  private baseUrl = `${environment.apiUrl}/FormBuilderDocumentSettings`;
  private projectsUrl = `${environment.apiUrl}/Projects`;

  constructor(private http: HttpClient) {}

  /**
   * Get Document Settings for a form
   * GET /api/FormBuilderDocumentSettings/form/{formBuilderId}
   */
  getDocumentSettings(formBuilderId: number): Observable<DocumentSettings | null> {
    return this.http.get<DocumentSettings>(`${this.baseUrl}/form/${formBuilderId}`).pipe(
      catchError((error) => {
        // If 404, return null (no settings found)
        if (error.status === 404) {
          return of(null);
        }
        console.error('[DocumentSettingsService] Error fetching document settings:', error);
        return of(null);
      })
    );
  }

  /**
   * Save Document Settings (Create or Update)
   * POST /api/FormBuilderDocumentSettings
   */
  saveDocumentSettings(settings: CreateDocumentSettingsDto | UpdateDocumentSettingsDto): Observable<DocumentSettings> {
    return this.http.post<DocumentSettings>(this.baseUrl, settings).pipe(
      catchError((error) => {
        console.error('[DocumentSettingsService] Error saving document settings:', error);
        throw error;
      })
    );
  }

  /**
   * Delete Document Settings
   * DELETE /api/FormBuilderDocumentSettings/form/{formBuilderId}
   */
  deleteDocumentSettings(formBuilderId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/form/${formBuilderId}`).pipe(
      catchError((error) => {
        console.error('[DocumentSettingsService] Error deleting document settings:', error);
        throw error;
      })
    );
  }

  /**
   * Get Active Projects
   * GET /api/Projects/active
   */
  getActiveProjects(): Observable<Project[]> {
    return this.http.get<any>(`${this.projectsUrl}/active`).pipe(
      map((response: any) => {
        // Handle different response formats
        let projects: any[] = [];
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          projects = response.data || response.items || response.result || [];
        } else if (Array.isArray(response)) {
          projects = response;
        }
        
        // Map API response (name) to Project interface (projectName)
        return projects.map((project: any) => ({
          id: project.id,
          projectName: project.projectName || project.name || `Project #${project.id}`,
          projectCode: project.projectCode || project.code,
          isActive: project.isActive !== false
        } as Project));
      }),
      catchError((error) => {
        console.error('[DocumentSettingsService] Error fetching active projects:', error);
        return of([]);
      })
    );
  }
}

