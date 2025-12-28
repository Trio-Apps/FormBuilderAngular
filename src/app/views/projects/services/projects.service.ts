import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ProjectDto,
  CreateProjectDto,
  UpdateProjectDto,
  PagedResult,
  ApiResponse
} from '../models/project-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private baseUrl = `${environment.apiUrl}/Projects`;

  constructor(private http: HttpClient) {}

  /**
   * GET - Get all projects with pagination
   */
  getProjects(page: number = 1, pageSize: number = 20): Observable<PagedResult<ProjectDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PagedResult<ProjectDto>>>(this.baseUrl, { params }).pipe(
      map((response: any) => {
        // Handle wrapped response
        if (response && response.data) {
          return response.data;
        }
        // Handle direct response
        if (response && response.items) {
          return response;
        }
        // Handle ApiResponse wrapper
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ProjectsService] Error getting projects:', error);
        return of({
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
          hasPrevious: false,
          hasNext: false
        } as PagedResult<ProjectDto>);
      })
    );
  }

  /**
   * GET - Get project by ID
   */
  getProjectById(id: number): Observable<ProjectDto | null> {
    return this.http.get<ApiResponse<ProjectDto>>(`${this.baseUrl}/${id}`).pipe(
      map((response: any) => {
        if (response && response.data) {
          return response.data;
        }
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`[ProjectsService] Error getting project ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - Get project by code
   */
  getProjectByCode(code: string): Observable<ProjectDto | null> {
    return this.http.get<ApiResponse<ProjectDto>>(`${this.baseUrl}/code/${code}`).pipe(
      map((response: any) => {
        if (response && response.data) {
          return response.data;
        }
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError((error) => {
        console.error(`[ProjectsService] Error getting project by code ${code}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - Get active projects only
   */
  getActiveProjects(): Observable<ProjectDto[]> {
    return this.http.get<ApiResponse<ProjectDto[]>>(`${this.baseUrl}/active`).pipe(
      map((response: any) => {
        if (response && response.data) {
          return response.data;
        }
        if (response && response.success && response.data) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      catchError((error) => {
        console.error('[ProjectsService] Error getting active projects:', error);
        return of([]);
      })
    );
  }

  /**
   * POST - Create new project
   */
  createProject(dto: CreateProjectDto): Observable<ProjectDto | null> {
    return this.http.post<ApiResponse<ProjectDto>>(this.baseUrl, dto).pipe(
      map((response: any) => {
        if (response && response.data) {
          return response.data;
        }
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ProjectsService] Error creating project:', error);
        throw error;
      })
    );
  }

  /**
   * PUT - Update project
   */
  updateProject(id: number, dto: UpdateProjectDto): Observable<boolean> {
    return this.http.put(`${this.baseUrl}/${id}`, dto).pipe(
      map(() => true),
      catchError((error) => {
        console.error(`[ProjectsService] Error updating project ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - Delete project
   */
  deleteProject(id: number): Observable<boolean> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error(`[ProjectsService] Error deleting project ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * GET - Check if project exists
   */
  projectExists(id: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/${id}/exists`).pipe(
      map((response: any) => {
        if (response && response.data !== undefined) {
          return response.data;
        }
        if (response && response.success && response.data !== undefined) {
          return response.data;
        }
        return response === true;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * GET - Check if project code exists
   */
  codeExists(code: string, excludeId?: number): Observable<boolean> {
    let url = `${this.baseUrl}/code/${code}/exists`;
    if (excludeId) {
      url += `?excludeId=${excludeId}`;
    }
    return this.http.get<ApiResponse<boolean>>(url).pipe(
      map((response: any) => {
        if (response && response.data !== undefined) {
          return response.data;
        }
        if (response && response.success && response.data !== undefined) {
          return response.data;
        }
        return response === true;
      }),
      catchError(() => of(false))
    );
  }
}

