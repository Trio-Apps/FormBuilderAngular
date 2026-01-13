import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  GridColumnOptionDto,
  CreateGridColumnOptionDto,
  UpdateGridColumnOptionDto,
  ApiResponse
} from '../form-builder/models/grid-dto.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GridColumnOptionsService {
  private baseUrl = `${environment.apiUrl}/GridColumnOptions`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // ==================== CRUD Operations (Admin) ====================

  /**
   * GET - جلب جميع Grid Column Options
   * Authorization: Required (Administration)
   */
  getAllOptions(): Observable<GridColumnOptionDto[]> {
    return this.http.get<ApiResponse<GridColumnOptionDto[]>>(this.baseUrl).pipe(
      map((response: ApiResponse<GridColumnOptionDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error fetching all grid column options:', error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Grid Column Option بالـ ID
   * Authorization: Required (Administration)
   */
  getOptionById(id: number): Observable<GridColumnOptionDto | null> {
    return this.http.get<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/${id}`).pipe(
      map((response: ApiResponse<GridColumnOptionDto>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`Error fetching grid column option ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - جلب جميع Grid Column Options لعمود معين
   * Authorization: Required (Administration)
   */
  getOptionsByColumnId(columnId: number): Observable<GridColumnOptionDto[]> {
    return this.http.get<ApiResponse<GridColumnOptionDto[]>>(`${this.baseUrl}/column/${columnId}`).pipe(
      map((response: ApiResponse<GridColumnOptionDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching grid column options for column ${columnId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * GET - جلب Grid Column Options النشطة فقط لعمود معين
   * Authorization: Required (Administration)
   */
  getActiveOptionsByColumnId(columnId: number): Observable<GridColumnOptionDto[]> {
    return this.http.get<ApiResponse<GridColumnOptionDto[]>>(`${this.baseUrl}/column/${columnId}/active`).pipe(
      map((response: ApiResponse<GridColumnOptionDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error(`Error fetching active grid column options for column ${columnId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * POST - إنشاء Grid Column Option جديد
   * Authorization: Required (Administration)
   */
  createOption(option: CreateGridColumnOptionDto): Observable<GridColumnOptionDto> {
    return this.http.post<ApiResponse<GridColumnOptionDto>>(this.baseUrl, option).pipe(
      map((response: ApiResponse<GridColumnOptionDto>) => {
        if (!response.data) {
          throw new Error('Failed to create grid column option: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error creating grid column option:', error);
        throw error;
      })
    );
  }

  /**
   * POST - إنشاء عدة Grid Column Options دفعة واحدة
   * Authorization: Required (Administration)
   */
  createOptionsBulk(options: CreateGridColumnOptionDto[]): Observable<GridColumnOptionDto[]> {
    return this.http.post<ApiResponse<GridColumnOptionDto[]>>(`${this.baseUrl}/bulk`, options).pipe(
      map((response: ApiResponse<GridColumnOptionDto[]>) => {
        return response.data || [];
      }),
      catchError((error) => {
        console.error('Error creating grid column options in bulk:', error);
        throw error;
      })
    );
  }

  /**
   * PUT - تحديث Grid Column Option موجود
   * Authorization: Required (Administration)
   */
  updateOption(id: number, option: UpdateGridColumnOptionDto): Observable<GridColumnOptionDto> {
    return this.http.put<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/${id}`, option).pipe(
      map((response: ApiResponse<GridColumnOptionDto>) => {
        if (!response.data) {
          throw new Error('Failed to update grid column option: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error updating grid column option ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Grid Column Option (Hard Delete)
   * Authorization: Required (Administration)
   */
  deleteOption(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`Error deleting grid column option ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * DELETE - حذف Grid Column Option (Soft Delete)
   * Authorization: Required (Administration)
   */
  softDeleteOption(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}/soft`).pipe(
      map(() => {
        // Success
      }),
      catchError((error) => {
        console.error(`Error soft deleting grid column option ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * PATCH - تبديل حالة النشاط
   * Authorization: Required (Administration)
   */
  toggleActiveStatus(id: number, isActive: boolean): Observable<GridColumnOptionDto> {
    const params = new HttpParams().set('isActive', isActive.toString());
    return this.http.patch<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/${id}/toggle-active`, {}, { params }).pipe(
      map((response: ApiResponse<GridColumnOptionDto>) => {
        if (!response.data) {
          throw new Error('Failed to toggle active status: No data returned');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error toggling active status for grid column option ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * GET - التحقق من وجود Grid Column Option
   * Authorization: Required (Administration)
   */
  checkExists(id: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/${id}/exists`).pipe(
      map((response: ApiResponse<boolean>) => {
        return response.data || false;
      }),
      catchError((error) => {
        console.error(`Error checking existence of grid column option ${id}:`, error);
        return of(false);
      })
    );
  }

  /**
   * GET - جلب Option الافتراضي لعمود معين
   * Authorization: Required (Administration)
   */
  getDefaultOptionForColumn(columnId: number): Observable<GridColumnOptionDto | null> {
    return this.http.get<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/column/${columnId}/default`).pipe(
      map((response: ApiResponse<GridColumnOptionDto>) => {
        return response.data || null;
      }),
      catchError((error) => {
        console.error(`Error fetching default option for column ${columnId}:`, error);
        return of(null);
      })
    );
  }

  /**
   * GET - عدد Options لعمود معين
   * Authorization: Required (Administration)
   */
  getOptionsCountForColumn(columnId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/column/${columnId}/count`).pipe(
      map((response: ApiResponse<number>) => {
        return response.data || 0;
      }),
      catchError((error) => {
        console.error(`Error fetching options count for column ${columnId}:`, error);
        return of(0);
      })
    );
  }

  /**
   * GET - التحقق من وجود Options لعمود معين
   * Authorization: Required (Administration)
   */
  columnHasOptions(columnId: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/column/${columnId}/has-options`).pipe(
      map((response: ApiResponse<boolean>) => {
        return response.data || false;
      }),
      catchError((error) => {
        console.error(`Error checking if column ${columnId} has options:`, error);
        return of(false);
      })
    );
  }
}

