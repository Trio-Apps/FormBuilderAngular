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
   * DELETE - Delete project (uses Soft Delete automatically)
   * DELETE /api/Projects/{id}
   * 
   * Description: يحذف Project باستخدام Soft Delete (IsDeleted = true)
   * API Behavior: DeleteAsync uses soft delete automatically
   * Response: 204 No Content
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
   * Soft delete project
   * DELETE /api/Projects/{id} - DeleteAsync uses soft delete automatically
   * 
   * @param id Project ID
   * @returns Observable<boolean>
   */
  softDelete(id: number): Observable<boolean> {
    return this.deleteProject(id);
  }

  /**
   * Get all deleted projects with pagination
   * GET /api/Projects/deleted?page=1&pageSize=20
   *
   * Description: جلب جميع Projects المحذوفة مع pagination
   * Response: PagedResult<ProjectDto>
   */
  getDeletedProjects(page: number = 1, pageSize: number = 100): Observable<PagedResult<ProjectDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.baseUrl}/deleted`, { params }).pipe(
      map((response: any) => {
        // Handle paged response
        if (response && typeof response === 'object') {
          const data = response.data || response.items || response.result || [];
          return {
            items: Array.isArray(data) ? data : [],
            totalCount: response.totalCount || response.total || data.length || 0,
            page: response.pageNumber || response.page || page,
            pageSize: response.pageSize || pageSize,
            totalPages: response.totalPages || Math.ceil((response.totalCount || data.length || 0) / pageSize),
            hasPrevious: page > 1,
            hasNext: page < (response.totalPages || 1)
          };
        }
        return {
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
          hasPrevious: false,
          hasNext: false
        };
      }),
      catchError((error) => {
        console.error('[ProjectsService] Error getting deleted projects:', error);
        return of({
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
          hasPrevious: false,
          hasNext: false
        });
      })
    );
  }

  /**
   * Restore soft-deleted project
   * POST /api/Projects/{id}/restore
   *
   * Description: يستعيد Project محذوف (IsDeleted = false)
   * Response: 200 OK (ProjectDto)
   */
  restore(id: number): Observable<ProjectDto> {
    const projectId = Number(id);
    if (isNaN(projectId) || projectId <= 0) {
      throw new Error(`Invalid project ID: ${id}`);
    }

    console.log('[ProjectsService] Restoring project:', { id: projectId });

    return this.http.post<any>(`${this.baseUrl}/${projectId}/restore`, {}).pipe(
      map((response: any) => {
        console.log('[ProjectsService] Project restored successfully');
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[ProjectsService] Error restoring project:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to restore project';
        throw new Error(errorMessage);
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

