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
  ) {}

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
   * GET - جلب قائمة الجداول المتاحة للـ LookupTable
   * Authorization: Required (Administration)
   */
  getAvailableLookupTables(): Observable<string[]> {
    return this.http.get<any>(`${this.baseUrl}/lookup-tables`).pipe(
      map((response: any) => {
        console.log('[FieldDataSourceService] Raw lookup tables response:', response);
        
        // Handle different response formats
        let tables: any[] = [];
        
        // If response is wrapped in ApiResponse
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          tables = Array.isArray(data) ? data : [];
        } else if (Array.isArray(response)) {
          tables = response;
        }
        
        console.log('[FieldDataSourceService] Extracted tables array:', tables);
        
        // Extract table names from objects if needed
        const tableNames = tables.map((table: any, index: number) => {
          // If it's already a string, return it
          if (typeof table === 'string') {
            return table;
          }
          
          // If it's an object, try to extract the name property
          if (typeof table === 'object' && table !== null) {
            // Get all keys for case-insensitive search
            const keys = Object.keys(table);
            
            // Try case-insensitive key matching first
            const nameKey = keys.find(k => {
              const lowerKey = k.toLowerCase();
              return lowerKey === 'name' || 
                     lowerKey === 'tablename' || 
                     lowerKey === 'table_name' ||
                     lowerKey === 'value' ||
                     lowerKey === 'text' ||
                     lowerKey === 'label' ||
                     lowerKey === 'title';
            });
            
            if (nameKey && table[nameKey]) {
              const name = String(table[nameKey]);
              console.log(`[FieldDataSourceService] Extracted table name from key "${nameKey}":`, name);
              return name;
            }
            
            // Try common property names (case-sensitive)
            const name = table.name || table.tableName || table.TableName || table.Name || 
                        table.value || table.Value || table.text || table.Text ||
                        table.label || table.Label || table.title || table.Title;
            
            if (name) {
              console.log(`[FieldDataSourceService] Extracted table name:`, name);
              return String(name);
            }
            
            // If no name found, log the object structure for debugging
            console.warn(`[FieldDataSourceService] Table at index ${index} has no recognizable name property:`, table);
            console.warn(`[FieldDataSourceService] Available keys:`, keys);
            
            // Last resort: try to use the first string value found
            for (const key of keys) {
              const value = table[key];
              if (typeof value === 'string' && value.trim() !== '') {
                console.log(`[FieldDataSourceService] Using first string value from key "${key}":`, value);
                return value;
              }
            }
            
            // If still nothing, return a placeholder with available keys
            return `[Unknown Table: ${keys.join(', ')}]`;
          }
          
          // Fallback to string conversion
          return String(table);
        }).filter((name: string) => name && name.trim() !== ''); // Remove empty strings
        
        console.log('[FieldDataSourceService] Final table names:', tableNames);
        return tableNames;
      }),
      catchError((error) => {
        console.error('[FieldDataSourceService] Error fetching lookup tables:', error);
        return of([]);
      })
    );
  }
}

