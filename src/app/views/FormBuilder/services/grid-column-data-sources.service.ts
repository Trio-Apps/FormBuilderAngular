import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  GridColumnDataSourceDto,
  CreateGridColumnDataSourceDto,
  UpdateGridColumnDataSourceDto,
  DropdownOptionDto,
  ApiResponse
} from '../form-builder/models/grid-dto.model';

@Injectable({
  providedIn: 'root'
})
export class GridColumnDataSourcesService {
  private baseUrl = `${environment.apiUrl}/GridColumnDataSources`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD Operations (No Auth Required) ====================

  /**
   * GET - جلب جميع Grid Column Data Sources
   * Authorization: Not Required (Authorization commented out)
   */
  getAllDataSources(): Observable<GridColumnDataSourceDto[]> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto[]>>(this.baseUrl).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching all grid column data sources:', error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Grid Column Data Source بالـ ID
   * Authorization: Not Required
   */
  getDataSourceById(id: number): Observable<GridColumnDataSourceDto | null> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/${id}`).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`Error fetching grid column data source ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - جلب جميع Grid Column Data Sources لعمود معين
   * Authorization: Not Required
   */
  getDataSourcesByColumnId(columnId: number): Observable<GridColumnDataSourceDto[]> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto[]>>(`${this.baseUrl}/column/${columnId}`).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching grid column data sources for column ${columnId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Grid Column Data Sources النشطة فقط لعمود معين
   * Authorization: Not Required
   */
  getActiveDataSourcesByColumnId(columnId: number): Observable<GridColumnDataSourceDto[]> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto[]>>(`${this.baseUrl}/column/${columnId}/active`).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching active grid column data sources for column ${columnId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Data Source حسب Column ID و Source Type
   * Authorization: Not Required
   */
  getDataSourceByColumnIdAndType(columnId: number, sourceType: string): Observable<GridColumnDataSourceDto | null> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/column/${columnId}/type/${sourceType}`).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`Error fetching data source for column ${columnId} with type ${sourceType}:`, error);
        return of(null);
      })
    );
  }

  /**
   * POST - إنشاء Grid Column Data Source جديد
   * Authorization: Not Required
   */
  createDataSource(dataSource: CreateGridColumnDataSourceDto): Observable<GridColumnDataSourceDto> {
    // Validation: Ensure columnId > 0
    if (!dataSource.columnId || dataSource.columnId <= 0) {
      throw new Error('ColumnId must be greater than 0');
    }
    
    return this.http.post<ApiResponse<GridColumnDataSourceDto>>(this.baseUrl, dataSource).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto>) => {
        if (!response.data) {
          throw new Error('Failed to create grid column data source: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error creating grid column data source:', error);
        throw error;
      })
    );
  }

  /**
   * PUT - تحديث Grid Column Data Source موجود
   * Authorization: Not Required
   */
  updateDataSource(id: number, dataSource: UpdateGridColumnDataSourceDto): Observable<GridColumnDataSourceDto> {
    return this.http.put<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/${id}`, dataSource).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto>) => {
        if (!response.data) {
          throw new Error('Failed to update grid column data source: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error updating grid column data source ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Grid Column Data Source
   * Authorization: Not Required
   */
  deleteDataSource(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`Error deleting grid column data source ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * PATCH - تبديل حالة النشاط
   * Authorization: Not Required
   */
  toggleActiveStatus(id: number, isActive: boolean): Observable<GridColumnDataSourceDto> {
    const params = new HttpParams().set('isActive', isActive.toString());
    return this.http.patch<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/${id}/toggle-active`, {}, { params }).pipe(
      map((response: ApiResponse<GridColumnDataSourceDto>) => {
        if (!response.data) {
          throw new Error('Failed to toggle active status: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error toggling active status for grid column data source ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * GET - التحقق من وجود Grid Column Data Source
   * Authorization: Not Required
   */
  checkExists(id: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/${id}/exists`).pipe(
      map((response: ApiResponse<boolean>) => {
        return response.data || false;
      }),
      catchError((error) => {
        console.error(`Error checking existence of grid column data source ${id}:`, error);
        return of(false);
      })
    );
  }

  /**
   * GET - التحقق من وجود Data Sources لعمود معين
   * Authorization: Not Required
   */
  columnHasDataSources(columnId: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/column/${columnId}/has-sources`).pipe(
      map((response: ApiResponse<boolean>) => {
        return response.data || false;
      }),
      catchError((error) => {
        console.error(`Error checking if column ${columnId} has data sources:`, error);
        return of(false);
      })
    );
  }

  /**
   * GET - عدد Data Sources لعمود معين
   * Authorization: Not Required
   */
  getDataSourcesCountForColumn(columnId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/column/${columnId}/count`).pipe(
      map((response: ApiResponse<number>) => {
        return response.data || 0;
      }),
      catchError((error) => {
        console.error(`Error fetching data sources count for column ${columnId}:`, error);
        return of(0);
      })
    );
  }

  /**
   * GET - جلب Column Options (from Data Source)
   * Uses /column-options endpoint with query parameter
   * Returns DropdownOptionDto[] for Grid Columns (not FieldOptionResponse)
   * Authorization: Not Required
   */
  getColumnOptions(columnId: number, context?: Record<string, any>, requestBodyJson?: string): Observable<DropdownOptionDto[]> {
    let params = new HttpParams().set('columnId', columnId.toString());
    
    if (context) {
      params = params.set('context', JSON.stringify(context));
    }
    
    if (requestBodyJson) {
      params = params.set('requestBodyJson', requestBodyJson);
    }
    
    return this.http.get<ApiResponse<DropdownOptionDto[]>>(`${this.baseUrl}/column-options`, { params }).pipe(
      map((response: ApiResponse<DropdownOptionDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching column options for column ${columnId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * POST - جلب Column Options (from Data Source) with body
   * Uses /column-options endpoint with POST method (for API sources with request body)
   * Returns DropdownOptionDto[] for Grid Columns (not FieldOptionResponse)
   * Authorization: Not Required
   */
  getColumnOptionsPost(columnId: number, context?: Record<string, any>, requestBodyJson?: string): Observable<DropdownOptionDto[]> {
    return this.http.post<ApiResponse<DropdownOptionDto[]>>(`${this.baseUrl}/column-options`, {
      columnId,
      context,
      requestBodyJson
    }).pipe(
      map((response: ApiResponse<DropdownOptionDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching column options (POST) for column ${columnId}:`, error);
        return of([]);
      })
    );
  }
}
