import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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
   * Update grid
   */
  updateGrid(id: number, grid: UpdateFormGridDto): Observable<ApiResponse<FormGridDto>> {
    return this.http.put<ApiResponse<FormGridDto>>(`${this.baseUrl}/FormGrids/${id}`, grid).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error updating grid', data: {} as FormGridDto }))
    );
  }

  /**
   * Delete grid
   */
  deleteGrid(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormGrids/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting grid', data: false }))
    );
  }

  /**
   * Toggle grid active status
   */
  toggleGridActive(id: number): Observable<ApiResponse<FormGridDto>> {
    return this.http.patch<ApiResponse<FormGridDto>>(`${this.baseUrl}/FormGrids/${id}/toggle-active`, {}).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error toggling grid status', data: {} as FormGridDto }))
    );
  }

  // ===== Form Grid Columns =====

  /**
   * Get columns by grid ID
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
   * Delete column
   */
  deleteColumn(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/FormGridColumns/${id}`).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error deleting column', data: false }))
    );
  }

  // ===== Form Submission Grid Rows =====

  /**
   * Get submission IDs that have rows for this grid
   * This helps users select which submission to view/edit
   */
  getSubmissionsWithGridData(gridId: number): Observable<ApiResponse<number[]>> {
    // Try to get unique submission IDs that have rows for this grid
    // This endpoint might need to be created in backend, or we can use a workaround
    return this.http.get<ApiResponse<number[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/grid/${gridId}/submissions`
    ).pipe(
      catchError(() => {
        // If endpoint doesn't exist, return empty array
        console.warn('Endpoint for getting submissions with grid data not available');
        return of({ statusCode: 200, message: 'No submissions found', data: [] });
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
    return this.http.post<ApiResponse<FormSubmissionGridRowDto[]>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${data.submissionId}/grid/${data.gridId}/bulk`,
      data
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error saving grid data', data: [] }))
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
    return this.http.post<ApiResponse<FormSubmissionGridCellDto>>(
      `${this.baseUrl}/FormSubmissionGridCells`,
      cell
    ).pipe(
      catchError(() => of({ statusCode: 500, message: 'Error creating cell', data: {} as FormSubmissionGridCellDto }))
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
    return this.http.post<ApiResponse<GridValidationResultDto>>(
      `${this.baseUrl}/FormSubmissionGridRows/submission/${submissionId}/grid/${gridId}/validate`,
      data
    ).pipe(
      catchError(() => of({
        statusCode: 500,
        message: 'Error validating grid data',
        data: { isValid: false, errors: [], warnings: [] }
      }))
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
}

