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
   * DELETE /api/FieldDataSources/{id}
   * 
   * Description: Hard Delete (حذف نهائي)
   * Authorization: Required (Administration)
   * Response: 200 OK (ApiResponse)
   * 
   * @param id Field Data Source ID
   * @returns Observable<void>
   */
  deleteDataSource(id: number): Observable<void> {
    const url = `${this.baseUrl}/${id}`;
    console.log(`[FieldDataSourceService] Hard delete URL: ${url}`);
    return this.http.delete<ApiResponse<void>>(url).pipe(
      map(() => {
        // Success
        console.log(`[FieldDataSourceService] Hard delete successful for ID: ${id}`);
      }),
      catchError((error) => {
        console.error(`[FieldDataSourceService] Error deleting data source ${id}:`, error);
        console.error(`[FieldDataSourceService] Request URL was: ${url}`);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Data Source (Soft Delete)
   * DELETE /api/FieldDataSources/soft-delete/{id}
   * 
   * Description: يحذف Field Data Source باستخدام Soft Delete (IsDeleted = true)
   * Authorization: Required (Administration)
   * Response: 200 OK (ApiResponse)
   * 
   * @param id Field Data Source ID
   * @returns Observable<void>
   */
  softDeleteDataSource(id: number): Observable<void> {
    const url = `${this.baseUrl}/soft-delete/${id}`;
    console.log(`[FieldDataSourceService] Soft delete URL: ${url}`);
    return this.http.delete<ApiResponse<void>>(url).pipe(
      map(() => {
        // Success
        console.log(`[FieldDataSourceService] Soft delete successful for ID: ${id}`);
      }),
      catchError((error) => {
        console.error(`[FieldDataSourceService] Error soft deleting data source ${id}:`, error);
        console.error(`[FieldDataSourceService] Request URL was: ${url}`);
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
  getFieldOptions(
    fieldId: number,
    context?: Record<string, any>,
    options?: { search?: string; skip?: number; take?: number }
  ): Observable<FieldOptionResponse[]> {
    let params = new HttpParams().set('fieldId', fieldId.toString());

    if (context) {
      params = params.set('context', JSON.stringify(context));
    }

    if (options?.search && options.search.trim() !== '') {
      params = params.set('search', options.search.trim());
    }

    if (options?.skip !== undefined && options.skip !== null) {
      params = params.set('skip', options.skip.toString());
    }

    if (options?.take !== undefined && options.take !== null) {
      params = params.set('take', options.take.toString());
    }

    params = params.set('suppressGlobalErrorToast', 'true');

    const url = `${this.baseUrl}/field-options`;
    console.log(`[FieldDataSourceService] Requesting options for field ${fieldId}`, {
      url: url,
      params: params.toString(),
      context: context
    });

    return this.http.get<ApiResponse<FieldOptionResponse[]>>(url, { params }).pipe(
      map((response: ApiResponse<FieldOptionResponse[]>) => {
        console.log(`[FieldDataSourceService] Response for field ${fieldId}:`, {
          response: response,
          hasData: !!response?.data,
          dataLength: response?.data?.length || 0,
          data: response?.data
        });
        
        const options = response.data || [];
        console.log(`[FieldDataSourceService] Extracted ${options.length} options for field ${fieldId}`);
        
        if (options.length > 0) {
          console.log(`[FieldDataSourceService] First option sample:`, JSON.stringify(options[0]));
        }
        
        return options;
      }),
      catchError((error) => {
        console.error(`[FieldDataSourceService] ❌ Error fetching field options for field ${fieldId}:`, {
          error: error,
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          url: error?.url,
          errorDetails: error?.error
        });

        // Log backend error details if available
        if (error?.error) {
          if (error.error.message) {
            console.error(`[FieldDataSourceService] Backend error message:`, error.error.message);
          }
          if (error.error.error) {
            console.error(`[FieldDataSourceService] Backend error details:`, error.error.error);
          }
          if (error.error.errors) {
            console.error(`[FieldDataSourceService] Backend validation errors:`, error.error.errors);
          }
          if (error.error.title) {
            console.error(`[FieldDataSourceService] Backend error title:`, error.error.title);
          }
          if (error.error.detail) {
            console.error(`[FieldDataSourceService] Backend error detail:`, error.error.detail);
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
  getTableColumns(tableName: string, database?: string): Observable<string[]> {
    if (!tableName || !tableName.trim()) {
      return of([]);
    }

    const url = `${this.baseUrl}/lookup-tables/${encodeURIComponent(tableName)}/columns`;

    let params = new HttpParams();
    if (database) {
      params = params.set('database', database);
    }

    return this.http.get<ApiResponse<string[]>>(url, { params }).pipe(
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
  getAvailableLookupTables(database?: string): Observable<string[]> {
    let params = new HttpParams();
    if (database) {
      params = params.set('database', database);
      console.log('[FieldDataSourceService] Requesting lookup tables with database parameter:', database);
    } else {
      console.log('[FieldDataSourceService] Requesting lookup tables without database parameter');
    }

    const url = `${this.baseUrl}/lookup-tables`;
    console.log('[FieldDataSourceService] Request URL:', url);
    console.log('[FieldDataSourceService] Request params:', params.toString());

    return this.http.get<ApiResponse<string[]>>(url, { params }).pipe(
      map((response: any) => {
        console.log('[FieldDataSourceService] Response received:', response);
        // Backend returns ApiResponse<string[]> or potentially ApiResponse<any[]>
        const data = response.data || [];
        console.log('[FieldDataSourceService] Tables received:', data);
        // Handle case where backend returns objects instead of strings
        const mappedData = data.map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // Try common name properties
            return item.name || item.tableName || item.TableName || item.Name || String(item);
          }
          return String(item);
        });
        console.log('[FieldDataSourceService] Mapped tables:', mappedData);
        return mappedData;
      }),
      catchError((error) => {
        console.error('[FieldDataSourceService] Error fetching lookup tables:', error);
        return of([]);
      })
    );
  }
}

