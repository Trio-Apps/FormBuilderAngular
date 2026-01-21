import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  UserQueryDto,
  CreateUserQueryDto,
  UpdateUserQueryDto,
  ApiResponse
} from '../form-builder/models/user-query-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserQueriesService {
  private baseUrl = `${environment.apiUrl}/UserQueries`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/UserQueries - Get all queries for current user
   */
  getUserQueries(): Observable<UserQueryDto[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((response: any) => {
        console.log('[UserQueriesService] Raw response:', response);
        
        // Handle different response formats
        // Case 1: Response is already an array
        if (Array.isArray(response)) {
          console.log('[UserQueriesService] Response is array');
          return response as UserQueryDto[];
        }
        
        // Case 2: Response wrapped in data property
        if (response && typeof response === 'object' && Array.isArray(response.data)) {
          console.log('[UserQueriesService] Response wrapped in data property');
          return response.data as UserQueryDto[];
        }
        
        // Case 3: Response wrapped in result property
        if (response && typeof response === 'object' && Array.isArray(response.result)) {
          console.log('[UserQueriesService] Response wrapped in result property');
          return response.result as UserQueryDto[];
        }
        
        // Case 4: Response is an object but not an array - return empty array
        console.warn('[UserQueriesService] Unexpected response format, returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('[UserQueriesService] Error fetching user queries:', error);
        return of([]);
      })
    );
  }

  /**
   * GET /api/UserQueries/database/{databaseName} - Get queries by database name
   */
  getUserQueriesByDatabase(databaseName: string): Observable<UserQueryDto[]> {
    const url = `${this.baseUrl}/database/${encodeURIComponent(databaseName)}`;
    return this.http.get<any>(url).pipe(
      map((response: any) => {
        console.log('[UserQueriesService] Raw response:', response);
        
        // Handle different response formats
        // Case 1: Response is already an array
        if (Array.isArray(response)) {
          console.log('[UserQueriesService] Response is array');
          return response as UserQueryDto[];
        }
        
        // Case 2: Response wrapped in data property
        if (response && typeof response === 'object' && Array.isArray(response.data)) {
          console.log('[UserQueriesService] Response wrapped in data property');
          return response.data as UserQueryDto[];
        }
        
        // Case 3: Response wrapped in result property
        if (response && typeof response === 'object' && Array.isArray(response.result)) {
          console.log('[UserQueriesService] Response wrapped in result property');
          return response.result as UserQueryDto[];
        }
        
        // Case 4: Response is an object but not an array - return empty array
        console.warn('[UserQueriesService] Unexpected response format, returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('[UserQueriesService] Error fetching queries by database:', error);
        return of([]);
      })
    );
  }

  /**
   * GET /api/UserQueries/{id} - Get specific query by ID
   */
  getUserQueryById(id: number): Observable<UserQueryDto | null> {
    return this.http.get<UserQueryDto>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('[UserQueriesService] Error fetching query by ID:', error);
        return of(null);
      })
    );
  }

  /**
   * POST /api/UserQueries - Create new query
   */
  createUserQuery(dto: CreateUserQueryDto): Observable<UserQueryDto> {
    return this.http.post<UserQueryDto>(this.baseUrl, dto).pipe(
      catchError((error) => {
        console.error('[UserQueriesService] Error creating query:', error);
        throw error;
      })
    );
  }

  /**
   * PUT /api/UserQueries/{id} - Update query
   */
  updateUserQuery(id: number, dto: UpdateUserQueryDto): Observable<UserQueryDto> {
    return this.http.put<UserQueryDto>(`${this.baseUrl}/${id}`, dto).pipe(
      catchError((error) => {
        console.error('[UserQueriesService] Error updating query:', error);
        throw error;
      })
    );
  }

  /**
   * DELETE /api/UserQueries/{id} - Hard delete query
   */
  deleteUserQuery(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('[UserQueriesService] Error deleting query:', error);
        throw error;
      })
    );
  }

  /**
   * DELETE /api/UserQueries/{id}/soft-delete - Soft delete query
   */
  softDeleteUserQuery(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/soft-delete`).pipe(
      catchError((error) => {
        console.error('[UserQueriesService] Error soft deleting query:', error);
        throw error;
      })
    );
  }
}

