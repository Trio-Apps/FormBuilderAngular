import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  FormGridDto,
  CreateFormGridDto,
  UpdateFormGridDto,
  FormGridColumnDto,
  CreateFormGridColumnDto,
  UpdateFormGridColumnDto,
  FormSubmissionGridRowDto,
  CreateFormSubmissionGridRowDto,
  UpdateFormSubmissionGridRowDto,
  FormSubmissionGridCellDto,
  CreateFormSubmissionGridCellDto,
  UpdateFormSubmissionGridCellDto,
  BulkSaveGridDataDto,
  CompleteGridDataDto,
  GridStatsDto,
  GridSummaryDto,
  GridValidationResultDto,
  DropdownOptionDto,
  ApiResponse
} from '../form-builder/models/grid-dto.model';

@Injectable({
  providedIn: 'root'
})
export class GridService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ===== Form Grids (Schema Management) =====

  /**
   * Get all grids
   */
  getGrids(): Observable<ApiResponse<FormGridDto[]>> {
    return this.http.get<ApiResponse<FormGridDto[]>>(`${this.baseUrl}/FormGrids`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grids', data: [] }))
    );
  }

  /**
   * Get grid by ID
   */
  getGridById(id: number): Observable<ApiResponse<FormGridDto>> {
    return this.http.get<ApiResponse<FormGridDto>>(`${this.baseUrl}/FormGrids/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grid', data: {} as FormGridDto }))
    );
  }

  /**
   * Get grids by form builder ID
   */
  getGridsByFormBuilder(formBuilderId: number): Observable<ApiResponse<FormGridDto[]>> {
    return this.http.get<ApiResponse<FormGridDto[]>>(
      `${this.baseUrl}/FormGrids/by-form-builder/${formBuilderId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grids', data: [] }))
    );
  }

  /**
   * Get active grids by form builder ID
   */
  getActiveGridsByFormBuilder(formBuilderId: number): Observable<ApiResponse<FormGridDto[]>> {
    return this.http.get<ApiResponse<FormGridDto[]>>(
      `${this.baseUrl}/FormGrids/active-by-form-builder/${formBuilderId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grids', data: [] }))
    );
  }

  /**
   * Get grids by tab ID
   */
  getGridsByTabId(tabId: number): Observable<ApiResponse<FormGridDto[]>> {
    return this.http.get<ApiResponse<FormGridDto[]>>(
      `${this.baseUrl}/FormGrids/by-tab/${tabId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grids', data: [] }))
    );
  }

  /**
   * Get active grids by tab ID
   */
  getActiveGridsByTabId(tabId: number): Observable<ApiResponse<FormGridDto[]>> {
    return this.http.get<ApiResponse<FormGridDto[]>>(
      `${this.baseUrl}/FormGrids/active-by-tab/${tabId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grids', data: [] }))
    );
  }

  /**
   * Get grid by code and form builder ID
   */
  getGridByCode(gridCode: string, formBuilderId: number): Observable<ApiResponse<FormGridDto>> {
    return this.http.get<ApiResponse<FormGridDto>>(
      `${this.baseUrl}/FormGrids/by-code/${gridCode}/${formBuilderId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading grid', data: {} as FormGridDto }))
    );
  }

  /**
   * Create new grid
   */
  createGrid(grid: CreateFormGridDto): Observable<ApiResponse<FormGridDto>> {
    return this.http.post<ApiResponse<FormGridDto>>(`${this.baseUrl}/FormGrids`, grid).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating grid', data: {} as FormGridDto }))
    );
  }

  /**
   * Validate grid rules before saving data
   * Note: This endpoint may not exist yet in backend
   */
  validateGridRules(gridId: number, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/FormGrids/${gridId}/validate-rules`, data).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error validating grid rules', data: null }))
    );
  }

  /**
   * Update grid
   */
  updateGrid(id: number, grid: UpdateFormGridDto): Observable<ApiResponse<FormGridDto>> {
    return this.http.put<ApiResponse<FormGridDto>>(`${this.baseUrl}/FormGrids/${id}`, grid).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating grid', data: {} as FormGridDto }))
    );
  }

  /**
   * Delete grid (uses soft delete automatically)
   */
  deleteGrid(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormGrids/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting grid', data: false }))
    );
  }

  /**
   * Soft delete grid
   * DELETE /api/FormGrids/{id} - DeleteAsync uses soft delete automatically
   * Note: deleteGrid already uses soft delete, so we use it directly
   */
  softDelete(id: number, deletedByUserId?: string): Observable<void> {
    const gridId = Number(id);
    if (isNaN(gridId) || gridId <= 0) {
      return throwError(() => new Error(`Invalid grid ID: ${id}`));
    }

    console.log('[GridService] Soft deleting grid:', { id: gridId, deletedByUserId });

    const params: any = {};
    if (deletedByUserId) {
      params.deletedByUserId = deletedByUserId;
    }

    return this.deleteGrid(gridId).pipe(
      map(() => {
        console.log('[GridService] Grid soft deleted successfully');
        return;
      }),
      catchError((error) => {
        console.error('[GridService] Error soft deleting grid:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to soft delete grid';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Restore soft-deleted grid
   * POST /api/FormGrids/{id}/restore
   */
  restore(id: number): Observable<FormGridDto> {
    const gridId = Number(id);
    if (isNaN(gridId) || gridId <= 0) {
      return throwError(() => new Error(`Invalid grid ID: ${id}`));
    }

    console.log('[GridService] Restoring grid:', { id: gridId });

    return this.http.post<any>(`${this.baseUrl}/FormGrids/${gridId}/restore`, {}).pipe(
      map((response: any) => {
        console.log('[GridService] Grid restored successfully');
        if (response && typeof response === 'object') {
          // Handle ApiResponse format
          if (response.data) {
            return response.data;
          }
          // Handle direct response
          if (response.id) {
            return response;
          }
          return response.data || response.result || response;
        }
        return response;
      }),
      catchError((error) => {
        console.error('[GridService] Error restoring grid:', error);
        const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to restore grid';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // ===== Form Grid Columns =====

  /**
   * Get columns by grid ID
   * Backend automatically excludes soft-deleted columns (IsDeleted = true)
   */
  getColumnsByGrid(gridId: number): Observable<ApiResponse<FormGridColumnDto[]>> {
    return this.http.get<ApiResponse<FormGridColumnDto[]>>(
      `${this.baseUrl}/FormGridColumns/by-grid/${gridId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading columns', data: [] }))
    );
  }

  /**
   * Get active columns by grid ID
   * Backend automatically excludes soft-deleted columns (IsDeleted = true)
   * Returns only columns where IsActive = true and IsDeleted = false
   */
  getActiveColumnsByGrid(gridId: number): Observable<ApiResponse<FormGridColumnDto[]>> {
    return this.http.get<ApiResponse<FormGridColumnDto[]>>(
      `${this.baseUrl}/FormGridColumns/active-by-grid/${gridId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading columns', data: [] }))
    );
  }

  /**
   * Create column
   */
  createColumn(column: CreateFormGridColumnDto): Observable<ApiResponse<FormGridColumnDto>> {
    return this.http.post<ApiResponse<FormGridColumnDto>>(`${this.baseUrl}/FormGridColumns`, column).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating column', data: {} as FormGridColumnDto }))
    );
  }

  /**
   * Update column
   */
  updateColumn(id: number, column: UpdateFormGridColumnDto): Observable<ApiResponse<FormGridColumnDto>> {
    return this.http.put<ApiResponse<FormGridColumnDto>>(`${this.baseUrl}/FormGridColumns/${id}`, column).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating column', data: {} as FormGridColumnDto }))
    );
  }

  /**
   * Delete column (Soft Delete)
   * Sets IsDeleted = true and DeletedDate = DateTime.UtcNow
   * The column will be excluded from all queries automatically
   */
  deleteColumn(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormGridColumns/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting column', data: false }))
    );
  }

  /**
   * Soft Delete column (explicit)
   * Alternative endpoint for soft delete: DELETE /api/FormGridColumns/{id}/soft
   * Sets IsDeleted = true and DeletedDate = DateTime.UtcNow
   */
  softDeleteColumn(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormGridColumns/${id}/soft`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error soft deleting column', data: false }))
    );
  }

  // ===== Form Submission Grid Rows =====

  /**
   * Get submission IDs that have rows for this grid
   * This helps users select which submission to view/edit
   * Note: This endpoint may not be implemented in the backend yet
   */
  getSubmissionsWithGridData(gridId: number): Observable<ApiResponse<number[]>> {
    // Try to get unique submission IDs that have rows for this grid
    // This endpoint might need to be created in backend, or we can use a workaround
    return this.http.get<ApiResponse<number[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/grid/${gridId}/submissions`
    ).pipe(
      catchError((error) => {
        // Handle expected 404 for missing endpoint gracefully
        if (error?.status === 404) {
          console.info(`Grid service: Submissions endpoint not yet implemented for grid ${gridId}. Using fallback.`);
          return of({ statusCode: 200, message: 'Submissions endpoint not available, using fallback', data: [] });
        } else {
          console.warn(`Grid service: Error loading submissions for grid ${gridId}:`, error?.message || error);
          return of({ statusCode: 500, message: 'Error loading submissions', data: [] });
        }
      })
    );
  }

  /**
   * Get rows by submission and grid
   */
  getRowsBySubmissionAndGrid(
    submissionId: number,
    gridId: number
  ): Observable<ApiResponse<FormSubmissionGridRowDto[]>> {
    // Early return if submissionId is invalid
    if (!submissionId || submissionId <= 0) {
      return of({ statusCode: 200, message: 'No rows found', data: [] });
    }

    return this.http.get<ApiResponse<FormSubmissionGridRowDto[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading rows', data: [] }))
    );
  }

  /**
   * Get active rows by submission and grid
   */
  getActiveRowsBySubmissionAndGrid(
    submissionId: number,
    gridId: number
  ): Observable<ApiResponse<FormSubmissionGridRowDto[]>> {
    // Early return if submissionId is invalid
    if (!submissionId || submissionId <= 0) {
      return of({ statusCode: 200, message: 'No rows found', data: [] });
    }

    return this.http.get<ApiResponse<FormSubmissionGridRowDto[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}/active`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading rows', data: [] }))
    );
  }

  /**
   * Get complete grid data (rows with cells)
   * Note: This endpoint may not exist yet in backend, but we'll prepare for it
   */
  getCompleteGridData(
    submissionId: number,
    gridId: number
  ): Observable<ApiResponse<CompleteGridDataDto>> {
    // Early return if submissionId is invalid
    if (!submissionId || submissionId <= 0) {
      return of({
        statusCode: 200,
        message: 'No grid data found',
        data: { grid: {} as FormGridDto, rows: [], totalRows: 0, activeRows: 0 }
      });
    }

    // Try the complete endpoint first, fallback to separate calls
    return this.http.get<ApiResponse<CompleteGridDataDto>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}/complete`
    ).pipe(
      catchError(() => {
        // Fallback: Load grid and rows separately, then combine
        return this.getRowsBySubmissionAndGrid(submissionId, gridId).pipe(
          catchError(() => of({ statusCode: 200, message: 'No rows found', data: [] })),
          // Map to CompleteGridDataDto structure
          map((response: ApiResponse<FormSubmissionGridRowDto[]>) => {
            const rows = response.data || [];
            return {
              statusCode: response.statusCode,
              message: response.message,
              data: {
                grid: {} as FormGridDto,
                rows: rows,
                totalRows: rows.length,
                activeRows: rows.filter(r => r.isActive !== false).length
              }
            } as ApiResponse<CompleteGridDataDto>;
          })
        );
      })
    );
  }

  /**
   * Create single row
   */
  createRow(row: CreateFormSubmissionGridRowDto): Observable<ApiResponse<FormSubmissionGridRowDto>> {
    return this.http.post<ApiResponse<FormSubmissionGridRowDto>>(
      `${this.baseUrl}/FormSubmissionGridRows`,
      row
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating row', data: {} as FormSubmissionGridRowDto }))
    );
  }

  /**
   * Create multiple rows
   */
  createMultipleRows(rows: CreateFormSubmissionGridRowDto[]): Observable<ApiResponse<FormSubmissionGridRowDto[]>> {
    return this.http.post<ApiResponse<FormSubmissionGridRowDto[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/multiple`,
      rows
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating rows', data: [] }))
    );
  }

  /**
   * Update row
   */
  updateRow(id: number, row: UpdateFormSubmissionGridRowDto): Observable<ApiResponse<FormSubmissionGridRowDto>> {
    return this.http.put<ApiResponse<FormSubmissionGridRowDto>>(
      `${this.baseUrl}/FormSubmissionGridRows/${id}`,
      row
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating row', data: {} as FormSubmissionGridRowDto }))
    );
  }

  /**
   * Delete row
   */
  deleteRow(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormSubmissionGridRows/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting row', data: false }))
    );
  }

  /**
   * Delete all rows for a grid
   */
  deleteAllRowsByGrid(submissionId: number, gridId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting rows', data: false }))
    );
  }

  /**
   * Bulk save grid data (rows + cells)
   * Note: This endpoint may not exist yet in backend
   */
  bulkSaveGridData(data: BulkSaveGridDataDto): Observable<ApiResponse<FormSubmissionGridRowDto[]>> {
    console.log('[GridService] bulkSaveGridData called');
    console.log('[GridService] Sending rows only:', JSON.stringify(data.rows, null, 2));
    return this.http.post<ApiResponse<FormSubmissionGridRowDto[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${data.submissionId}/grid/${data.gridId}/bulk`,
      data.rows  // Send only the rows array, not the entire object
    ).pipe(
      map((response) => {
        console.log('[GridService] ✅ bulkSaveGridData response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('[GridService] ❌ bulkSaveGridData error:', error);
        return of({ statusCode: 500, message: 'Error saving grid data', data: [] });
      })
    );
  }

  // ===== Form Submission Grid Cells =====

  /**
   * Get cells by row ID
   */
  getCellsByRow(rowId: number): Observable<ApiResponse<FormSubmissionGridCellDto[]>> {
    return this.http.get<ApiResponse<FormSubmissionGridCellDto[]>>(
      `${this.baseUrl}/FormSubmissionGridCells/row/${rowId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading cells', data: [] }))
    );
  }

  /**
   * Get cell by row and column
   */
  getCellByRowAndColumn(
    rowId: number,
    columnId: number
  ): Observable<ApiResponse<FormSubmissionGridCellDto>> {
    return this.http.get<ApiResponse<FormSubmissionGridCellDto>>(
      `${this.baseUrl}/FormSubmissionGridCells/row/${rowId}/column/${columnId}`
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error loading cell', data: {} as FormSubmissionGridCellDto }))
    );
  }

  /**
   * Create cell
   */
  createCell(cell: CreateFormSubmissionGridCellDto): Observable<ApiResponse<FormSubmissionGridCellDto>> {
    console.log('[GridService] createCell called with:', cell);
    console.log('[GridService] createCell JSON:', JSON.stringify(cell));
    return this.http.post<ApiResponse<FormSubmissionGridCellDto>>(
      `${this.baseUrl}/FormSubmissionGridCells`,
      cell
    ).pipe(
      map((response) => {
        console.log('[GridService] ✅ createCell response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('[GridService] ❌ createCell error:', error);
        return of({ statusCode: 500, message: 'Error creating cell', data: {} as FormSubmissionGridCellDto });
      })
    );
  }

  /**
   * Update cell
   */
  updateCell(id: number, cell: UpdateFormSubmissionGridCellDto): Observable<ApiResponse<FormSubmissionGridCellDto>> {
    return this.http.put<ApiResponse<FormSubmissionGridCellDto>>(
      `${this.baseUrl}/FormSubmissionGridCells/${id}`,
      cell
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating cell', data: {} as FormSubmissionGridCellDto }))
    );
  }

  /**
   * Delete cell
   */
  deleteCell(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormSubmissionGridCells/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting cell', data: false }))
    );
  }

  /**
   * Bulk save cells for a row
   * Note: This endpoint may not exist yet in backend
   */
  bulkSaveCells(rowId: number, cells: CreateFormSubmissionGridCellDto[]): Observable<ApiResponse<FormSubmissionGridCellDto[]>> {
    return this.http.post<ApiResponse<FormSubmissionGridCellDto[]>>(
      `${this.baseUrl}/FormSubmissionGridCells/row/${rowId}/bulk`,
      cells
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error saving cells', data: [] }))
    );
  }

  // ===== Validation =====

  /**
   * Validate grid data
   * Note: This endpoint may not exist yet in backend
   */
  validateGridData(
    submissionId: number,
    gridId: number,
    data: BulkSaveGridDataDto
  ): Observable<ApiResponse<GridValidationResultDto>> {
    console.log('[GridService] validateGridData called');
    console.log('[GridService] Validating rows:', JSON.stringify(data.rows, null, 2));
    return this.http.post<ApiResponse<GridValidationResultDto>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}/validate`,
      data.rows  // Send only the rows array, not the entire object
    ).pipe(
      map((response) => {
        console.log('[GridService] ✅ validateGridData response:', response);
        return response;
      }),
      catchError((error) => {
        console.error('[GridService] ❌ validateGridData error:', error);
        return of({
          statusCode: 500,
          message: 'Error validating grid data',
          data: { isValid: false, errors: [], warnings: [] }
        });
      })
    );
  }

  // ===== Statistics =====

  /**
   * Get grid statistics
   * Note: This endpoint may not exist yet in backend
   */
  getGridStats(submissionId: number, gridId: number): Observable<ApiResponse<GridStatsDto>> {
    return this.http.get<ApiResponse<GridStatsDto>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}/stats`
    ).pipe(
      catchError(() => of({
        statusCode: 500,
        message: 'Error loading stats',
        data: { gridId, gridName: '', totalRows: 0, activeRows: 0, totalCells: 0 }
      }))
    );
  }

  // ===== Grid Column Dropdown Options =====

  /**
   * Load dropdown options for a grid column
   * Supports Static, LookupTable, and API data sources
   */
  loadColumnOptions(columnId: number): Observable<ApiResponse<DropdownOptionDto[]>> {
    return this.http.get<ApiResponse<DropdownOptionDto[]>>(
      `${this.baseUrl}/GridColumnDataSources/options/${columnId}`
    ).pipe(
      catchError(() => of({
        statusCode: 500,
        message: 'Error loading dropdown options',
        data: []
      }))
    );
  }

  /**
   * Load dropdown options for multiple columns at once
   * Useful for optimizing grid loading
   */
  loadMultipleColumnOptions(columnIds: number[]): Observable<ApiResponse<{ [columnId: number]: DropdownOptionDto[] }>> {
    return this.http.post<ApiResponse<{ [columnId: number]: DropdownOptionDto[] }>>(
      `${this.baseUrl}/GridColumnDataSources/options/batch`,
      { columnIds }
    ).pipe(
      catchError(() => of({
        statusCode: 500,
        message: 'Error loading dropdown options',
        data: {}
      }))
    );
  }

  // ===== Grid Rules Validation (Client-side helpers) =====

  /**
   * Validate minimum rows rule
   */
  validateMinRows(grid: FormGridDto, currentRows: number): { isValid: boolean; message?: string } {
    if (grid.minRows && currentRows < grid.minRows) {
      return {
        isValid: false,
        message: `Grid requires at least ${grid.minRows} rows. Currently has ${currentRows}.`
      };
    }
    return { isValid: true };
  }

  /**
   * Validate maximum rows rule
   */
  validateMaxRows(grid: FormGridDto, currentRows: number): { isValid: boolean; message?: string } {
    if (grid.maxRows && currentRows > grid.maxRows) {
      return {
        isValid: false,
        message: `Grid allows maximum ${grid.maxRows} rows. Currently has ${currentRows}.`
      };
    }
    return { isValid: true };
  }

  /**
   * Validate column visibility rules
   */
  isColumnVisible(column: FormGridColumnDto): boolean {
    // Basic visibility check - can be extended with complex rules
    return column.isVisible !== false;
  }

  /**
   * Check if column is read-only
   */
  isColumnReadOnly(column: FormGridColumnDto): boolean {
    return column.isReadOnly === true;
  }

  /**
   * Get visible columns only
   */
  getVisibleColumns(columns: FormGridColumnDto[]): FormGridColumnDto[] {
    return columns.filter(column => this.isColumnVisible(column));
  }

  /**
   * Get required columns
   */
  getRequiredColumns(columns: FormGridColumnDto[]): FormGridColumnDto[] {
    return columns.filter(column => column.isRequired);
  }

  /**
   * Validate row data against column rules
   */
  validateRowData(columns: FormGridColumnDto[], rowData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredColumns = this.getRequiredColumns(columns);

    // Check required fields
    requiredColumns.forEach(column => {
      const value = rowData[column.columnCode];
      if (value === null || value === undefined || value === '') {
        errors.push(`${column.columnName} is required`);
      }
    });

    // Check data types (basic validation)
    columns.forEach(column => {
      const value = rowData[column.columnCode];
      if (value !== null && value !== undefined && value !== '') {
        if (!this.validateDataType(value, column.dataType)) {
          errors.push(`${column.columnName} has invalid data type`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Basic data type validation
   */
  private validateDataType(value: any, dataType: string): boolean {
    switch (dataType?.toLowerCase()) {
      case 'number':
        return !isNaN(Number(value));
      case 'date':
        return !isNaN(Date.parse(value));
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true; // text and select types are always valid
    }
  }
}

