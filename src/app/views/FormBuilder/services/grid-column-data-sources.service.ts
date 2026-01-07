import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  GridColumnDataSourceDto,
  CreateGridColumnDataSourceDto,
  UpdateGridColumnDataSourceDto,
  GridColumnOptionDto,
  CreateGridColumnOptionDto,
  UpdateGridColumnOptionDto,
  DropdownOptionDto,
  ApiResponse
} from '../form-builder/models/grid-dto.model';

@Injectable({
  providedIn: 'root'
})
export class GridColumnDataSourcesService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ===== Grid Column Data Sources =====

  /**
   * Get all data sources
   */
  getDataSources(): Observable<ApiResponse<GridColumnDataSourceDto[]>> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto[]>>(`${this.baseUrl}/GridColumnDataSources`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading data sources', data: [] }))
    );
  }

  /**
   * Get data source by ID
   */
  getDataSourceById(id: number): Observable<ApiResponse<GridColumnDataSourceDto>> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/GridColumnDataSources/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading data source', data: {} as GridColumnDataSourceDto }))
    );
  }

  /**
   * Get data sources by column ID
   */
  getDataSourcesByColumn(columnId: number): Observable<ApiResponse<GridColumnDataSourceDto[]>> {
    return this.http.get<ApiResponse<GridColumnDataSourceDto[]>>(`${this.baseUrl}/GridColumnDataSources/by-column/${columnId}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading data sources', data: [] }))
    );
  }

  /**
   * Create new data source
   */
  createDataSource(dataSource: CreateGridColumnDataSourceDto): Observable<ApiResponse<GridColumnDataSourceDto>> {
    return this.http.post<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/GridColumnDataSources`, dataSource).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating data source', data: {} as GridColumnDataSourceDto }))
    );
  }

  /**
   * Update data source
   */
  updateDataSource(id: number, dataSource: UpdateGridColumnDataSourceDto): Observable<ApiResponse<GridColumnDataSourceDto>> {
    return this.http.put<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/GridColumnDataSources/${id}`, dataSource).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating data source', data: {} as GridColumnDataSourceDto }))
    );
  }

  /**
   * Delete data source
   */
  deleteDataSource(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/GridColumnDataSources/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting data source', data: false }))
    );
  }

  /**
   * Toggle data source active status
   */
  toggleDataSourceActive(id: number): Observable<ApiResponse<GridColumnDataSourceDto>> {
    return this.http.patch<ApiResponse<GridColumnDataSourceDto>>(`${this.baseUrl}/GridColumnDataSources/${id}/toggle-active`, {}).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error toggling data source status', data: {} as GridColumnDataSourceDto }))
    );
  }

  // ===== Grid Column Options (Static Options) =====

  /**
   * Get all options
   */
  getOptions(): Observable<ApiResponse<GridColumnOptionDto[]>> {
    return this.http.get<ApiResponse<GridColumnOptionDto[]>>(`${this.baseUrl}/GridColumnOptions`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading options', data: [] }))
    );
  }

  /**
   * Get option by ID
   */
  getOptionById(id: number): Observable<ApiResponse<GridColumnOptionDto>> {
    return this.http.get<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/GridColumnOptions/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading option', data: {} as GridColumnOptionDto }))
    );
  }

  /**
   * Get options by column ID
   */
  getOptionsByColumn(columnId: number): Observable<ApiResponse<GridColumnOptionDto[]>> {
    return this.http.get<ApiResponse<GridColumnOptionDto[]>>(`${this.baseUrl}/GridColumnOptions/by-column/${columnId}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading options', data: [] }))
    );
  }

  /**
   * Get options by data source ID
   */
  getOptionsByDataSource(dataSourceId: number): Observable<ApiResponse<GridColumnOptionDto[]>> {
    return this.http.get<ApiResponse<GridColumnOptionDto[]>>(`${this.baseUrl}/GridColumnOptions/by-data-source/${dataSourceId}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading options', data: [] }))
    );
  }

  /**
   * Create new option
   */
  createOption(option: CreateGridColumnOptionDto): Observable<ApiResponse<GridColumnOptionDto>> {
    return this.http.post<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/GridColumnOptions`, option).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating option', data: {} as GridColumnOptionDto }))
    );
  }

  /**
   * Update option
   */
  updateOption(id: number, option: UpdateGridColumnOptionDto): Observable<ApiResponse<GridColumnOptionDto>> {
    return this.http.put<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/GridColumnOptions/${id}`, option).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating option', data: {} as GridColumnOptionDto }))
    );
  }

  /**
   * Delete option
   */
  deleteOption(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/GridColumnOptions/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting option', data: false }))
    );
  }

  /**
   * Toggle option active status
   */
  toggleOptionActive(id: number): Observable<ApiResponse<GridColumnOptionDto>> {
    return this.http.patch<ApiResponse<GridColumnOptionDto>>(`${this.baseUrl}/GridColumnOptions/${id}/toggle-active`, {}).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error toggling option status', data: {} as GridColumnOptionDto }))
    );
  }

  // ===== Dropdown Options Loading =====

  /**
   * Load dropdown options for a column based on its data source
   * This method handles all three types: Static, LookupTable, API
   */
  loadDropdownOptions(columnId: number): Observable<ApiResponse<DropdownOptionDto[]>> {
    return this.http.get<ApiResponse<DropdownOptionDto[]>>(`${this.baseUrl}/GridColumnDataSources/options/${columnId}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading dropdown options', data: [] }))
    );
  }

  /**
   * Test API data source connection
   */
  testApiConnection(dataSourceId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/GridColumnDataSources/${dataSourceId}/test-connection`, {}).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error testing API connection', data: null }))
    );
  }

  /**
   * Preview data source options (for testing before saving)
   */
  previewDataSource(dataSource: CreateGridColumnDataSourceDto): Observable<ApiResponse<DropdownOptionDto[]>> {
    return this.http.post<ApiResponse<DropdownOptionDto[]>>(`${this.baseUrl}/GridColumnDataSources/preview`, dataSource).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error previewing data source', data: [] }))
    );
  }
}
