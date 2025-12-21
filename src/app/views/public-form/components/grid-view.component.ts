import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import {
  FormFieldDto,
  FormTabDto
} from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import {
  FormGridDto,
  FormGridColumnDto,
  FormSubmissionGridRowDto,
  FormSubmissionGridCellDto,
  BulkSaveGridDataDto,
  BulkGridRowDto,
  BulkGridCellDto,
  ApiResponse,
  GridValidationResultDto
} from '../../FormBuilder/form-builder/models/grid-dto.model';
import { TranslationService } from '../../../core/services/translation.service';
import { catchError, of, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

/**
 * Grid View Component
 * Displays and manages a Grid (Line Items Grid) field
 */
@Component({
  selector: 'app-grid-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grid-view.component.html',
  styleUrls: ['./grid-view.component.scss']
})
export class GridViewComponent implements OnInit, OnChanges {
  @Input() field!: FormFieldDto;
  @Input() submissionId: number = 0;
  @Input() formBuilderId: number = 0;

  grid: FormGridDto | null = null;
  columns: FormGridColumnDto[] = [];
  rows: FormSubmissionGridRowDto[] = [];
  gridData: { [rowIndex: number]: { [columnId: number]: string } } = {};

  loading = false;
  saving = false;
  error: string = '';
  validationErrors: { [rowIndex: number]: { [columnId: number]: string } } = {};

  constructor(
    private gridService: GridService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadGrid();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field'] && !changes['field'].firstChange) {
      this.loadGrid();
    }
    if (changes['submissionId'] && !changes['submissionId'].firstChange) {
      this.loadGridData();
    }
  }

  /**
   * Load grid schema (columns) from field configuration
   */
  private loadGrid(): void {
    if (!this.field) {
      return;
    }

    this.loading = true;
    this.error = '';

    // Priority 1: Use field.gridId directly (preferred method)
    if (this.field.gridId) {
      this.gridService.getGridById(this.field.gridId).subscribe({
        next: (response: ApiResponse<FormGridDto>) => {
          if (response.data && response.data.id) {
            this.grid = response.data;
            this.loadColumns();
          } else {
            this.error = 'Grid not found';
            this.loading = false;
          }
        },
        error: () => {
          this.error = 'Error loading grid';
          this.loading = false;
        }
      });
      return;
    }

    // Priority 2: Try to get gridId from defaultValueJson if available
    try {
      if (this.field.defaultValueJson) {
        const config = JSON.parse(this.field.defaultValueJson);
        if (config.gridId) {
          this.gridService.getGridById(config.gridId).subscribe({
            next: (response: ApiResponse<FormGridDto>) => {
              if (response.data && response.data.id) {
                this.grid = response.data;
                this.loadColumns();
              } else {
                this.error = 'Grid not found';
                this.loading = false;
              }
            },
            error: () => {
              this.error = 'Error loading grid';
              this.loading = false;
            }
          });
          return;
        }
      }
    } catch {
      // Invalid JSON, continue to next method
    }

    // Priority 3: Get grid by code from form builder (fallback)
    if (this.formBuilderId > 0 && this.field.fieldCode) {
      this.gridService.getGridByCode(this.field.fieldCode, this.formBuilderId).subscribe({
        next: (response: ApiResponse<FormGridDto>) => {
          if (response.data && response.data.id) {
            this.grid = response.data;
            this.loadColumns();
          } else {
            this.error = 'Grid not found';
            this.loading = false;
          }
        },
        error: () => {
          this.error = 'Error loading grid';
          this.loading = false;
        }
      });
      return;
    }

    // No grid ID found
    this.error = 'Grid ID not configured. Please link a Grid to this field.';
    this.loading = false;
  }

  /**
   * Load grid columns
   */
  private loadColumns(): void {
    if (!this.grid || !this.grid.id) {
      return;
    }

    this.gridService.getActiveColumnsByGrid(this.grid.id).subscribe({
      next: (response: ApiResponse<FormGridColumnDto[]>) => {
        this.columns = response.data || [];
        this.columns.sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
        
        // Load column options from validationRules if available
        this.columns.forEach(column => {
          if (column.dataType === 'select' && column.validationRules) {
            try {
              const rules = JSON.parse(column.validationRules);
              if (rules.columnOptions && Array.isArray(rules.columnOptions)) {
                column.columnOptions = rules.columnOptions;
              }
            } catch {
              // Invalid JSON, ignore
            }
          }
        });
        
        // Initialize grid data structure
        this.initializeGridData();
        
        // Load existing data if submissionId is available
        if (this.submissionId > 0) {
          this.loadGridData();
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.error = 'Error loading columns';
        this.loading = false;
      }
    });
  }

  /**
   * Load grid data (rows and cells)
   */
  private loadGridData(): void {
    if (!this.grid || !this.grid.id || !this.submissionId || this.submissionId <= 0) {
      this.loading = false;
      return;
    }

    this.gridService.getRowsBySubmissionAndGrid(this.submissionId, this.grid.id).subscribe({
      next: (response: ApiResponse<FormSubmissionGridRowDto[]>) => {
        this.rows = response.data || [];
        this.rows.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
        
        // Load cells for each row
        this.loadCells();
      },
      error: () => {
        this.error = 'Error loading grid data';
        this.loading = false;
      }
    });
  }

  /**
   * Load cells for all rows
   */
  private loadCells(): void {
    if (this.rows.length === 0) {
      this.initializeGridData();
      this.loading = false;
      return;
    }

    let loaded = 0;
    const total = this.rows.length;

    this.rows.forEach((row) => {
      if (row.id) {
        this.gridService.getCellsByRow(row.id).subscribe({
          next: (response: ApiResponse<FormSubmissionGridCellDto[]>) => {
            const cells = response.data || [];
            
            // Initialize row data
            if (!this.gridData[row.rowIndex]) {
              this.gridData[row.rowIndex] = {};
            }
            
            // Populate cell values
            cells.forEach((cell: FormSubmissionGridCellDto) => {
              if (cell.columnId) {
                this.gridData[row.rowIndex][cell.columnId] = cell.cellValue || '';
              }
            });
            
            loaded++;
            if (loaded === total) {
              this.loading = false;
            }
          },
          error: () => {
            loaded++;
            if (loaded === total) {
              this.loading = false;
            }
          }
        });
      } else {
        loaded++;
        if (loaded === total) {
          this.loading = false;
        }
      }
    });
  }

  /**
   * Initialize grid data structure
   */
  private initializeGridData(): void {
    if (this.rows.length === 0) {
      // Create one empty row
      this.rows = [{
        id: 0,
        submissionId: this.submissionId,
        gridId: this.grid?.id || 0,
        rowIndex: 0,
        isActive: true,
        cells: []
      }];
    }

    // Initialize data structure for all rows
    this.rows.forEach((row) => {
      if (!this.gridData[row.rowIndex]) {
        this.gridData[row.rowIndex] = {};
      }
      this.columns.forEach((col) => {
        if (!this.gridData[row.rowIndex][col.id]) {
          this.gridData[row.rowIndex][col.id] = col.defaultValue || '';
        }
      });
    });
  }

  /**
   * Get cell value
   */
  getCellValue(rowIndex: number, columnId: number): string {
    return this.gridData[rowIndex]?.[columnId] || '';
  }

  /**
   * Set cell value
   */
  setCellValue(rowIndex: number, columnId: number, value: string): void {
    if (!this.gridData[rowIndex]) {
      this.gridData[rowIndex] = {};
    }
    this.gridData[rowIndex][columnId] = value;
  }

  /**
   * Add new row
   */
  addRow(): void {
    const maxIndex = this.rows.length > 0
      ? Math.max(...this.rows.map(r => r.rowIndex || 0))
      : -1;
    const newIndex = maxIndex + 1;

    const newRow: FormSubmissionGridRowDto = {
      id: 0, // New row, will be assigned by backend
      submissionId: this.submissionId,
      gridId: this.grid?.id || 0,
      rowIndex: newIndex,
      isActive: true,
      cells: []
    };

    this.rows.push(newRow);
    this.gridData[newIndex] = {};

    // Initialize with default values
    this.columns.forEach((col) => {
      this.gridData[newIndex][col.id] = col.defaultValue || '';
    });
  }

  /**
   * Remove row
   */
  removeRow(rowIndex: number): void {
    const index = this.rows.findIndex(r => r.rowIndex === rowIndex);
    if (index >= 0) {
      const row = this.rows[index];
      
      // If row has an ID, delete it from backend
      if (row.id && row.id > 0) {
        this.gridService.deleteRow(row.id).subscribe({
          next: () => {
            this.rows.splice(index, 1);
            delete this.gridData[rowIndex];
            this.reindexRows();
          },
          error: () => {
            this.error = 'Error deleting row';
          }
        });
      } else {
        // Just remove from local array
        this.rows.splice(index, 1);
        delete this.gridData[rowIndex];
        this.reindexRows();
      }
    }
  }

  /**
   * Reindex rows after deletion
   */
  private reindexRows(): void {
    this.rows.forEach((row, index) => {
      const oldIndex = row.rowIndex;
      row.rowIndex = index;
      
      // Update gridData keys
      if (oldIndex !== index && this.gridData[oldIndex]) {
        this.gridData[index] = this.gridData[oldIndex];
        delete this.gridData[oldIndex];
      }
    });
  }

  /**
   * Validate grid data
   */
  validateGridData(): Observable<GridValidationResultDto> {
    if (!this.grid || !this.grid.id || !this.submissionId || this.submissionId <= 0) {
      return of({ isValid: true, errors: [], warnings: [] });
    }

    const bulkData: BulkSaveGridDataDto = {
      submissionId: this.submissionId,
      gridId: this.grid.id,
      rows: this.rows.map((row) => {
        const rowData: BulkGridRowDto = {
          rowIndex: row.rowIndex,
          isActive: row.isActive,
          cells: this.columns.map((col) => {
            const cellData: BulkGridCellDto = {
              columnId: col.id,
              cellValue: this.getCellValue(row.rowIndex, col.id)
            };
            return cellData;
          })
        };
        return rowData;
      })
    };

    return this.gridService.validateGridData(this.submissionId, this.grid.id, bulkData).pipe(
      map((response) => response.data || { isValid: true, errors: [], warnings: [] })
    );
  }

  /**
   * Save grid data (with validation)
   */
  saveGridData(): Observable<ApiResponse<FormSubmissionGridRowDto[]>> {
    if (!this.grid || !this.grid.id || !this.submissionId || this.submissionId <= 0) {
      this.error = 'Cannot save: Missing grid or submission ID';
      return of({ statusCode: 400, message: this.error, data: [] });
    }

    this.saving = true;
    this.error = '';
    this.validationErrors = {};

    // Prepare bulk save data
    const bulkData: BulkSaveGridDataDto = {
      submissionId: this.submissionId,
      gridId: this.grid.id,
      rows: this.rows.map((row) => {
        const rowData: BulkGridRowDto = {
          rowIndex: row.rowIndex,
          isActive: row.isActive,
          cells: this.columns.map((col) => {
            const cellData: BulkGridCellDto = {
              columnId: col.id,
              cellValue: this.getCellValue(row.rowIndex, col.id)
            };
            return cellData;
          })
        };
        return rowData;
      })
    };

    // First validate, then save
    return this.validateGridData().pipe(
      switchMap((validationResult) => {
        if (!validationResult.isValid && validationResult.errors && validationResult.errors.length > 0) {
          // Map validation errors to display format
          this.validationErrors = {};
          validationResult.errors.forEach(error => {
            if (error.rowIndex !== undefined && error.columnId !== undefined) {
              if (!this.validationErrors[error.rowIndex]) {
                this.validationErrors[error.rowIndex] = {};
              }
              this.validationErrors[error.rowIndex][error.columnId] = error.message || 'Validation error';
            }
          });
          this.saving = false;
          this.error = 'Grid validation failed. Please fix the errors.';
          return of({ statusCode: 400, message: this.error, data: [] });
        }

        // If validation passes, save the data
        return this.gridService.bulkSaveGridData(bulkData).pipe(
          map((response: ApiResponse<FormSubmissionGridRowDto[]>) => {
            if (response.data) {
              this.rows = response.data;
              this.saving = false;
              this.validationErrors = {};
            } else {
              this.error = response.message || 'Error saving grid data';
              this.saving = false;
            }
            return response;
          }),
          catchError((error) => {
            this.error = 'Error saving grid data';
            this.saving = false;
            return of({ statusCode: 500, message: this.error, data: [] });
          })
        );
      })
    );
  }

  /**
   * Get grid title (multilingual)
   */
  getGridTitle(): string {
    if (!this.grid) {
      return 'Grid';
    }
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && this.grid.foreignGridName) {
      return this.grid.foreignGridName;
    }
    return this.grid.gridName || 'Grid';
  }

  /**
   * Get column label (multilingual)
   */
  getColumnLabel(column: FormGridColumnDto): string {
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && column.foreignColumnName) {
      return column.foreignColumnName;
    }
    return column.columnName;
  }

  /**
   * Check if column is required
   */
  isColumnRequired(column: FormGridColumnDto): boolean {
    return column.isRequired === true;
  }

  /**
   * Get input type for column
   */
  getInputType(column: FormGridColumnDto): string {
    const dataType = (column.dataType || '').toLowerCase();
    
    if (dataType.includes('email')) return 'email';
    if (dataType.includes('number') || dataType.includes('numeric')) return 'number';
    if (dataType.includes('date')) return 'date';
    
    return 'text';
  }

  /**
   * Check if column has options (select/radio/checkbox)
   */
  hasColumnOptions(column: FormGridColumnDto): boolean {
    return !!(column.columnOptions && column.columnOptions.length > 0);
  }

  /**
   * Get column options
   */
  getColumnOptions(column: FormGridColumnDto): any[] {
    return column.columnOptions || [];
  }

  /**
   * Get option text (multilingual)
   */
  getOptionText(option: any): string {
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && option.foreignOptionText) {
      return option.foreignOptionText;
    }
    return option.optionText || option.optionValue || '';
  }

  /**
   * Check if cell has validation error
   */
  hasError(rowIndex: number, columnId: number): boolean {
    return !!this.validationErrors[rowIndex]?.[columnId];
  }

  /**
   * Get validation error message for cell
   */
  getError(rowIndex: number, columnId: number): string {
    return this.validationErrors[rowIndex]?.[columnId] || '';
  }

  /**
   * Check if grid has data
   */
  hasGridData(): boolean {
    return this.rows.length > 0;
  }

  /**
   * Check if grid is valid (all required fields filled)
   */
  isGridValid(): boolean {
    // Check if all required columns have values
    for (const row of this.rows) {
      for (const col of this.columns) {
        if (col.isRequired) {
          const cellValue = this.getCellValue(row.rowIndex, col.id);
          if (!cellValue || cellValue.trim() === '') {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Get grid data for submission
   */
  getGridDataForSubmission(): { gridId: number; rows: any[] } | null {
    if (!this.grid || !this.grid.id || this.rows.length === 0) {
      return null;
    }
    
    return {
      gridId: this.grid.id,
      rows: this.rows.map((row) => ({
        rowIndex: row.rowIndex,
        isActive: row.isActive,
        cells: this.columns.map((col) => ({
          columnId: col.id,
          cellValue: this.getCellValue(row.rowIndex, col.id)
        }))
      }))
    };
  }
}

