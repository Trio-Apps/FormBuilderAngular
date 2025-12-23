import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FieldDataSource,
  CreateFieldDataSourceDto,
  UpdateFieldDataSourceDto,
  FieldOptionResponse,
  GetFieldOptionsRequestDto,
  PreviewDataSourceRequestDto,
  ApiResponse
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class FieldDataSourceService {
  private baseUrl = `${environment.apiUrl}/FieldDataSources`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // ==================== CRUD Operations (Admin) ====================

  /**
   * GET - جلب جميع Data Sources
   * Authorization: Required (Administration)
   */
  getAllDataSources(): Observable<FieldDataSource[]> {
    return this.http.get<ApiResponse<FieldDataSource[]>>(this.baseUrl).pipe(
      map((response: ApiResponse<FieldDataSource[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching all data sources:', error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Data Source بالـ ID
   * Authorization: Required (Administration)
   */
  getDataSourceById(id: number): Observable<FieldDataSource | null> {
    return this.http.get<ApiResponse<FieldDataSource>>(`${this.baseUrl}/${id}`).pipe(
      map((response: ApiResponse<FieldDataSource>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`Error fetching data source ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - جلب جميع Data Sources لحقل معين
   * Authorization: Required (Administration)
   */
  getDataSourcesByFieldId(fieldId: number): Observable<FieldDataSource[]> {
    return this.http.get<ApiResponse<FieldDataSource[]>>(`${this.baseUrl}/field/${fieldId}`).pipe(
      map((response: ApiResponse<FieldDataSource[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching data sources for field ${fieldId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Data Sources النشطة فقط لحقل معين
   * Authorization: Required (Administration)
   */
  getActiveDataSourcesByFieldId(fieldId: number): Observable<FieldDataSource[]> {
    return this.http.get<ApiResponse<FieldDataSource[]>>(`${this.baseUrl}/field/${fieldId}/active`).pipe(
      map((response: ApiResponse<FieldDataSource[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching active data sources for field ${fieldId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Data Source حسب Field ID و Source Type
   * Authorization: Required (Administration)
   */
  getDataSourceByFieldIdAndType(fieldId: number, sourceType: string): Observable<FieldDataSource | null> {
    return this.http.get<ApiResponse<FieldDataSource>>(`${this.baseUrl}/field/${fieldId}/type/${sourceType}`).pipe(
      map((response: ApiResponse<FieldDataSource>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`Error fetching data source for field ${fieldId} with type ${sourceType}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - عدد Data Sources لحقل معين
   * Authorization: Required (Administration)
   */
  getDataSourcesCountByFieldId(fieldId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/field/${fieldId}/count`).pipe(
      map((response: ApiResponse<number>) => {
        return response.data || 0;
      }),
      catchError((error) => {
        console.error(`Error fetching data sources count for field ${fieldId}:`, error);
        return of(0);
      })
    );
  }

  /**
   * POST - إنشاء Data Source جديد
   * Authorization: Required (Administration)
   */
  createDataSource(dataSource: CreateFieldDataSourceDto): Observable<FieldDataSource> {
    return this.http.post<ApiResponse<FieldDataSource>>(this.baseUrl, dataSource).pipe(
      map((response: ApiResponse<FieldDataSource>) => {
        if (!response.data) {
          throw new Error('Failed to create data source: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error creating data source:', error);
        throw error;
      })
    );
  }

  /**
   * POST - إنشاء عدة Data Sources دفعة واحدة
   * Authorization: Required (Administration)
   */
  createDataSourcesBulk(dataSources: CreateFieldDataSourceDto[]): Observable<FieldDataSource[]> {
    return this.http.post<ApiResponse<FieldDataSource[]>>(`${this.baseUrl}/bulk`, dataSources).pipe(
      map((response: ApiResponse<FieldDataSource[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error creating data sources in bulk:', error);
        throw error;
      })
    );
  }

  /**
   * PUT - تحديث Data Source موجود
   * Authorization: Required (Administration)
   */
  updateDataSource(id: number, dataSource: UpdateFieldDataSourceDto): Observable<FieldDataSource> {
    return this.http.put<ApiResponse<FieldDataSource>>(`${this.baseUrl}/${id}`, dataSource).pipe(
      map((response: ApiResponse<FieldDataSource>) => {
        if (!response.data) {
          throw new Error('Failed to update data source: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error updating data source ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Data Source (Hard Delete)
   * Authorization: Required (Administration)
   */
  deleteDataSource(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`Error deleting data source ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Data Source (Soft Delete)
   * Authorization: Required (Administration)
   */
  softDeleteDataSource(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/soft-delete/${id}`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`Error soft deleting data source ${id}:`, error);
        throw error;
      })
    );
  }

  // ==================== Public Endpoints (No Authorization) ====================

  /**
   * GET - جلب Field Options (Public)
   * Authorization: Not Required (AllowAnonymous)
   * @param fieldId - ID الحقل
   * @param context - JSON object للفلترة (مثل: {LegalEntityId: 1})
   */
  getFieldOptions(fieldId: number, context?: Record<string, any>): Observable<FieldOptionResponse[]> {
    let params = new HttpParams().set('fieldId', fieldId.toString());

    if (context) {
      params = params.set('context', JSON.stringify(context));
    }

    return this.http.get<ApiResponse<FieldOptionResponse[]>>(`${this.baseUrl}/field-options`, { params }).pipe(
      map((response: ApiResponse<FieldOptionResponse[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`[FieldDataSourceService] Error fetching field options for field ${fieldId}:`, error);

        // Log backend error details if available
        if (error?.error) {
          if (error.error.message) {
            console.error(`[FieldDataSourceService] Backend error message:`, error.error.message);
          }
          if (error.error.error) {
            console.error(`[FieldDataSourceService] Backend error details:`, error.error.error);
          }
        }

        return of([]);
      })
    );
  }

  /**
   * POST - جلب Field Options مع Body (Public)
   * Authorization: Not Required (AllowAnonymous)
   */
  getFieldOptionsPost(request: GetFieldOptionsRequestDto): Observable<FieldOptionResponse[]> {
    return this.http.post<ApiResponse<FieldOptionResponse[]>>(`${this.baseUrl}/field-options`, request).pipe(
      map((response: ApiResponse<FieldOptionResponse[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching field options for field ${request.fieldId}:`, error);
        return of([]);
      })
    );
  }

  // ==================== Admin Endpoints ====================

  /**
   * POST - Preview Data Source (للاختبار قبل الحفظ)
   * Authorization: Required (Administration)
   */
  previewDataSource(request: PreviewDataSourceRequestDto): Observable<FieldOptionResponse[]> {
    return this.http.post<ApiResponse<FieldOptionResponse[]>>(`${this.baseUrl}/preview`, request).pipe(
      map((response: ApiResponse<FieldOptionResponse[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error previewing data source:', error);
        throw error;
      })
    );
  }

  /**
   * GET - جلب أعمدة جدول معين (للـ LookupTable)
   * Authorization: Required (Administration)
   * Endpoint: GET /api/FieldDataSources/lookup-tables/{tableName}/columns
   */
  /**
   * GET - جلب أعمدة جدول معين (للـ LookupTable)
   * Authorization: Required (Administration)
   * Endpoint: GET /api/FieldDataSources/lookup-tables/{tableName}/columns
   */
  getTableColumns(tableName: string): Observable<string[]> {
    if (!tableName || !tableName.trim()) {
      return of([]);
    }

    const url = `${this.baseUrl}/lookup-tables/${encodeURIComponent(tableName)}/columns`;

    return this.http.get<ApiResponse<string[]>>(url).pipe(
      map((response: any) => {
        // Backend returns ApiResponse<string[]> or potentially objects
        const data = response.data || [];
        return data.map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // Try common name properties for columns
            return item.name || item.columnName || item.ColumnName || item.Name || String(item);
          }
          return String(item);
        });
      }),
      catchError((error) => {
        console.error(`[FieldDataSourceService] Error fetching columns for table "${tableName}":`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب قائمة الجداول المتاحة للـ LookupTable
   * Authorization: Required (Administration)
   */
  getAvailableLookupTables(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/lookup-tables`).pipe(
      map((response: any) => {
        // Backend returns ApiResponse<string[]> or potentially ApiResponse<any[]>
        const data = response.data || [];
        // Handle case where backend returns objects instead of strings
        return data.map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // Try common name properties
            return item.name || item.tableName || item.TableName || item.Name || String(item);
          }
          return String(item);
        });
      }),
      catchError((error) => {
        console.error('[FieldDataSourceService] Error fetching lookup tables:', error);
        return of([]);
      })
    );
  }
}

