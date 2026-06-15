import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  StoredProcedure, 
  CreateStoredProcedureDto, 
  UpdateStoredProcedureDto 
} from '../form-builder/models/stored-procedure.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class StoredProceduresService {
  private apiUrl = `${environment.apiUrl}/FormStoredProcedures`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get HTTP headers with authentication token
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Get all active stored procedures
   * GET /api/FormStoredProcedures
   */
  getAll(): Observable<StoredProcedure[]> {
    return this.http.get<ApiResponse<StoredProcedure[]> | StoredProcedure[]>(
      this.apiUrl, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data || [];
        }
        // Handle direct array
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      catchError((error) => {
        console.error('[StoredProceduresService] Error fetching all stored procedures:', error);
        return of([]);
      })
    );
  }

  /**
   * Get stored procedure by ID
   * GET /api/FormStoredProcedures/{id}
   */
  getById(id: number): Observable<StoredProcedure | null> {
    return this.http.get<ApiResponse<StoredProcedure> | StoredProcedure>(
      `${this.apiUrl}/${id}`, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data || null;
        }
        // Handle direct object
        if (response && typeof response === 'object' && 'id' in response) {
          return response as StoredProcedure;
        }
        return null;
      }),
      catchError((error) => {
        console.error(`[StoredProceduresService] Error fetching stored procedure ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Get stored procedures by database name
   * GET /api/FormStoredProcedures/database/{databaseName}
   */
  getByDatabase(databaseName: string): Observable<StoredProcedure[]> {
    return this.http.get<ApiResponse<StoredProcedure[]> | StoredProcedure[]>(
      `${this.apiUrl}/database/${encodeURIComponent(databaseName)}`, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data || [];
        }
        // Handle direct array
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      catchError((error) => {
        console.error(`[StoredProceduresService] Error fetching stored procedures for database ${databaseName}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get stored procedures by usage type
   * GET /api/FormStoredProcedures/usage-type/{usageType}
   */
  getByUsageType(usageType: string): Observable<StoredProcedure[]> {
    return this.http.get<ApiResponse<StoredProcedure[]> | StoredProcedure[]>(
      `${this.apiUrl}/usage-type/${encodeURIComponent(usageType)}`, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data || [];
        }
        // Handle direct array
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      catchError((error) => {
        console.error(`[StoredProceduresService] Error fetching stored procedures for usage type ${usageType}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Create new stored procedure
   * POST /api/FormStoredProcedures
   */
  create(dto: CreateStoredProcedureDto): Observable<StoredProcedure> {
    return this.http.post<ApiResponse<StoredProcedure> | StoredProcedure>(
      this.apiUrl, 
      dto, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data;
        }
        // Handle direct object
        if (response && typeof response === 'object' && 'id' in response) {
          return response as StoredProcedure;
        }
        throw new Error('Invalid response format');
      }),
      catchError((error) => {
        console.error('[StoredProceduresService] Error creating stored procedure:', error);
        throw error;
      })
    );
  }

  /**
   * Update stored procedure
   * PUT /api/FormStoredProcedures/{id}
   */
  update(id: number, dto: UpdateStoredProcedureDto): Observable<StoredProcedure> {
    return this.http.put<ApiResponse<StoredProcedure> | StoredProcedure>(
      `${this.apiUrl}/${id}`, 
      dto, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data;
        }
        // Handle direct object
        if (response && typeof response === 'object' && 'id' in response) {
          return response as StoredProcedure;
        }
        throw new Error('Invalid response format');
      }),
      catchError((error) => {
        console.error(`[StoredProceduresService] Error updating stored procedure ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete stored procedure (hard delete)
   * DELETE /api/FormStoredProcedures/{id}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error) => {
        console.error(`[StoredProceduresService] Error deleting stored procedure ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Soft delete stored procedure
   * DELETE /api/FormStoredProcedures/{id}/soft-delete
   */
  softDelete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}/soft-delete`, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error) => {
        console.error(`[StoredProceduresService] Error soft deleting stored procedure ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Validate stored procedure
   * GET /api/FormStoredProcedures/{id}/validate
   */
  validate(id: number): Observable<StoredProcedure> {
    return this.http.get<ApiResponse<StoredProcedure> | StoredProcedure>(
      `${this.apiUrl}/${id}/validate`, 
      { headers: this.getHeaders() }
    ).pipe(
      map((response: any) => {
        // Handle ApiResponse wrapper
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data;
        }
        // Handle direct object
        if (response && typeof response === 'object' && 'id' in response) {
          return response as StoredProcedure;
        }
        throw new Error('Invalid response format');
      }),
      catchError((error) => {
        console.error(`[StoredProceduresService] Error validating stored procedure ${id}:`, error);
        throw error;
      })
    );
  }

  /** Test-run a whitelisted stored procedure by id. Returns the execution result/debug payload. */
  execute(id: number, parameters: { [k: string]: any } = {}, resultMapping?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/execute`, { parameters, resultMapping }).pipe(
      map((response: any) => (response && 'data' in response ? response.data : response))
    );
  }
}

