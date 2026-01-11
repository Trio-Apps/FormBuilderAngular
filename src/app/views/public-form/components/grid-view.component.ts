import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import { GridColumnDataSourcesService } from '../../FormBuilder/services/grid-column-data-sources.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import {
  FormFieldDto,
  FormTabDto,
  FieldTypeDto
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
  GridValidationResultDto,
  ValidationErrorDto,
  DropdownOptionDto
} from '../../FormBuilder/form-builder/models/grid-dto.model';
import { TranslationService } from '../../../core/services/translation.service';
import { catchError, of, Observable, forkJoin } from 'rxjs';
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
  @Input() field?: FormFieldDto; // Optional - can be used with gridId instead
  @Input() gridId?: number; // Alternative to field - allows displaying grid directly without field
  @Input() gridTitle?: string; // Title for grid when displayed without field
  @Input() submissionId: number = 0;
  @Input() formBuilderId: number = 0;
  @Input() isReadOnly: boolean = false; // If true, grid is read-only (e.g., after submission approval)

  grid: FormGridDto | null = null;
  columns: FormGridColumnDto[] = [];
  visibleColumns: FormGridColumnDto[] = []; // Filtered columns based on visibility
  rows: FormSubmissionGridRowDto[] = [];
  gridData: { [rowIndex: number]: { [columnId: number]: string } } = {};
  fieldTypes: FieldTypeDto[] = []; // Field types for determining input type

  loading = false;
  saving = false;
  error: string = '';
  validationErrors: { [rowIndex: number]: { [columnId: number]: string } } = {};

  constructor(
    private gridService: GridService,
    private dataSourcesService: GridColumnDataSourcesService,
    private fieldsService: FieldsService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Load field types first, then load grid
    this.loadFieldTypes(() => {
    this.loadGrid();
    });
  }

  /**
   * Load field types to determine input types for columns
   */
  private loadFieldTypes(callback?: () => void): void {
    this.fieldsService.getFieldTypes().subscribe({
      next: (types: FieldTypeDto[]) => {
        this.fieldTypes = types.filter(type => type.isActive && type.id && type.typeName);
        console.log('[GridView] Loaded field types:', this.fieldTypes.length);
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.warn('[GridView] Error loading field types:', error);
        this.fieldTypes = [];
        // Still load grid even if field types fail
        if (callback) {
          callback();
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['field'] && !changes['field'].firstChange) || 
        (changes['gridId'] && !changes['gridId'].firstChange)) {
      // Reload field types if needed, then load grid
      if (this.fieldTypes.length === 0) {
        this.loadFieldTypes(() => {
          this.loadGrid();
        });
      } else {
      this.loadGrid();
      }
    }
    if (changes['submissionId'] && !changes['submissionId'].firstChange) {
      this.loadGridData();
    }
  }

  /**
   * Load grid schema (columns) from field configuration or gridId
   */
  private loadGrid(): void {
    // Determine gridId to use
    let targetGridId: number | undefined;
    
    if (this.gridId && this.gridId > 0) {
      // Use gridId input directly (for standalone grids)
      targetGridId = this.gridId;
    } else if (this.field?.gridId && this.field.gridId > 0) {
      // Use gridId from field
      targetGridId = this.field.gridId;
    }

    if (!targetGridId) {
      // If no gridId available, try other methods only if field is provided
      if (!this.field) {
        console.error('[GridView] Neither field nor gridId is provided');
        return;
      }
    }

    console.log('[GridView] Loading grid:', {
      fieldId: this.field?.id,
      fieldCode: this.field?.fieldCode,
      fieldName: this.field?.fieldName,
      gridId: targetGridId || this.gridId,
      formBuilderId: this.formBuilderId,
      submissionId: this.submissionId
    });

    this.loading = true;
    this.error = '';

    // Priority 1: Use gridId directly (from input or field)
    if (targetGridId && targetGridId > 0) {
      console.log('[GridView] ✅ Loading grid by ID:', targetGridId);
      this.gridService.getGridById(targetGridId).subscribe({
        next: (response: ApiResponse<FormGridDto>) => {
          console.log('[GridView] Grid loaded:', response);
          if (response.data && response.data.id) {
            this.grid = response.data;
            console.log('[GridView] Grid data:', this.grid);
            this.loadColumns();
          } else {
            console.warn('[GridView] Grid not found in response:', response);
            this.error = 'Grid not found. Please check if the Grid exists in the database.';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('[GridView] Error loading grid:', error);
          this.error = 'Error loading grid: ' + (error?.message || 'Unknown error');
          this.loading = false;
        }
      });
      return;
    }

    // If we reach here, we need field to continue
    if (!this.field) {
      console.error('[GridView] Field is required when gridId is not provided');
      this.error = 'Grid configuration is missing';
      this.loading = false;
      return;
    }

    // Warning: Field is detected as Grid but has no gridId
    console.warn('[GridView] ⚠️ Grid field detected but no gridId found:', {
      fieldId: this.field.id,
      fieldCode: this.field.fieldCode,
      fieldName: this.field.fieldName,
      gridId: this.field.gridId
    });

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
    if (this.formBuilderId > 0 && this.field?.fieldCode) {
      console.log('[GridView] Trying to load grid by code:', {
        gridCode: this.field.fieldCode,
        formBuilderId: this.formBuilderId
      });
      
      this.gridService.getGridByCode(this.field.fieldCode, this.formBuilderId).subscribe({
        next: (response: ApiResponse<FormGridDto>) => {
          if (response.data && response.data.id) {
            console.log('[GridView] ✅ Grid loaded by code:', response.data);
            this.grid = response.data;
            this.loadColumns();
          } else {
            console.warn('[GridView] Grid not found by code, trying fallback method');
            this.tryLoadGridFromFormBuilderList();
          }
        },
        error: (error) => {
          console.error('[GridView] Error loading grid by code:', error);
          if (error?.status === 404) {
            console.warn('[GridView] Grid endpoint returned 404, trying fallback method');
            this.tryLoadGridFromFormBuilderList();
          } else {
            this.error = `Error loading grid: ${error?.message || 'Unknown error'}. The grid with code '${this.field?.fieldCode}' may not exist for this form.`;
            this.loading = false;
          }
        }
      });
      return;
    }

    // No grid ID found
    if (this.field) {
      console.error('[GridView] ❌ No grid ID found for field:', {
        fieldId: this.field.id,
        fieldCode: this.field.fieldCode,
        fieldName: this.field.fieldName,
        gridId: this.field.gridId,
        defaultValueJson: this.field.defaultValueJson,
        formBuilderId: this.formBuilderId,
        fieldTypeName: this.field.fieldTypeName,
        fieldTypeId: this.field.fieldTypeId
      });
      
      // Show helpful error message
      this.error = `Grid field "${this.field.fieldName || this.field.fieldCode}" is not linked to a Grid. ` +
                   `Please go to the admin panel and select a Grid for this field. ` +
                   `(Field ID: ${this.field.id}, Field Code: ${this.field.fieldCode})`;
    } else {
      this.error = 'Grid ID is required but not provided.';
    }
    this.loading = false;
  }

  /**
   * Fallback: Try to load grid from form builder's grid list
   * This is used when getGridByCode fails (e.g., endpoint doesn't exist or grid not found)
   */
  private tryLoadGridFromFormBuilderList(): void {
    if (!this.formBuilderId || this.formBuilderId <= 0) {
      this.error = 'Cannot load grid: Form Builder ID is missing.';
      this.loading = false;
      return;
    }

    if (!this.field) {
      this.error = 'Cannot load grid: Field is required for fallback method.';
      this.loading = false;
      return;
    }

    console.log('[GridView] Trying fallback: Loading all grids for form builder:', this.formBuilderId);
    
    this.gridService.getActiveGridsByFormBuilder(this.formBuilderId).subscribe({
      next: (response: ApiResponse<FormGridDto[]>) => {
        const grids = response.data || [];
        console.log('[GridView] Found grids for form builder:', grids.length, grids.map(g => ({
          id: g.id,
          gridCode: g.gridCode,
          name: g.gridName
        })));

        // Try to find grid by code
        let foundGrid: FormGridDto | null = null;
        if (this.field?.fieldCode) {
          foundGrid = grids.find(g => 
            g.gridCode?.toLowerCase() === this.field?.fieldCode?.toLowerCase()
          ) || null;
        }

        // If not found by code, try to find by field name
        if (!foundGrid && this.field?.fieldName) {
          foundGrid = grids.find(g => 
            g.gridName?.toLowerCase().includes(this.field?.fieldName?.toLowerCase() || '') ||
            this.field?.fieldName?.toLowerCase().includes(g.gridName?.toLowerCase() || '')
          ) || null;
        }

        // If still not found and there's only one grid, use it
        if (!foundGrid && grids.length === 1) {
          console.log('[GridView] Only one grid found, using it as fallback');
          foundGrid = grids[0];
        }

        if (foundGrid && foundGrid.id) {
          console.log('[GridView] ✅ Grid found in form builder list:', foundGrid);
          this.grid = foundGrid;
          this.loadColumns();
        } else {
          console.warn('[GridView] ❌ Grid not found in form builder list. Available grids:', grids.map(g => g.gridCode || g.gridName));
          this.error = `Grid not found for field "${this.field?.fieldName || this.field?.fieldCode}". ` +
                       `Available grids: ${grids.length > 0 ? grids.map(g => g.gridCode || g.gridName).join(', ') : 'None'}. ` +
                       `Please ensure the field is linked to a Grid in the admin panel.`;
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('[GridView] Error loading grids from form builder:', error);
        this.error = `Error loading grids: ${error?.message || 'Unknown error'}. ` +
                     `The grid with code '${this.field?.fieldCode}' may not exist for this form. ` +
                     `Please check the backend endpoint /api/FormGrids/active-by-form-builder/${this.formBuilderId} or ensure the field has a valid gridId.`;
        this.loading = false;
      }
    });
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
        
        console.log('[GridView] Loaded columns:', this.columns.length);
        console.log('[GridView] Columns data:', this.columns);
        
        // Log columnOptions if present
        this.columns.forEach(col => {
          if (col.columnOptions && col.columnOptions.length > 0) {
            console.log('[GridView] Column has options from API:', {
              columnId: col.id,
              columnName: col.columnName,
              optionsCount: col.columnOptions.length,
              options: col.columnOptions
            });
          }
        });
        
        if (this.columns.length === 0) {
          this.error = 'No columns found. Please ensure the grid has columns configured.';
          this.loading = false;
          return;
        }
        
        // Link fieldTypes to columns if not already present
        this.columns.forEach(column => {
          // If fieldType is not already loaded from API, find it from fieldTypes array
          if (!column.fieldType && column.fieldTypeId && this.fieldTypes.length > 0) {
            const fieldType = this.fieldTypes.find(ft => ft.id === column.fieldTypeId);
            if (fieldType) {
              column.fieldType = fieldType;
            }
          }
          
          // Ensure isActive is true if not set (since we're using getActiveColumnsByGrid)
          if (column.isActive === undefined || column.isActive === null) {
            column.isActive = true;
          }
          
          // Set default visibility to true if not set
          if (column.isVisible === undefined || column.isVisible === null) {
            column.isVisible = true;
          }
          
          if (column.isReadOnly === undefined) {
            column.isReadOnly = false;
          }
        });
        
        // Load column options from Data Sources or validationRules
        this.loadColumnOptions();
        
        // Filter visible columns
        this.updateVisibleColumns();
        
        // Check if we have visible columns
        if (this.visibleColumns.length === 0) {
          console.warn('[GridView] No visible columns found after filtering');
          this.error = 'No visible columns found. Please check column visibility settings.';
          this.loading = false;
          return;
        }
        
        // Initialize grid data structure
        this.initializeGridData();
        
        // Load existing data if submissionId is available
        if (this.submissionId > 0) {
          this.loadGridData();
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('[GridView] Error loading columns:', error);
        this.error = 'Error loading columns. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Load column options from validationRules, columnOptions (from API), or Data Sources
   */
  private loadColumnOptions(): void {
    // Filter columns that have options (either from fieldType.hasOptions or dataType === 'select')
    const columnsWithOptions = this.columns.filter(col => {
      return col.fieldType?.hasOptions === true || col.dataType === 'select';
    });

    if (columnsWithOptions.length === 0) {
      return;
    }

    console.log('[GridView] Loading options for columns with hasOptions:', columnsWithOptions.map(c => ({
      id: c.id,
      name: c.columnName,
      fieldTypeId: c.fieldTypeId,
      hasOptions: c.fieldType?.hasOptions,
      dataSourceId: c.dataSourceId,
      hasColumnOptions: !!(c.columnOptions && c.columnOptions.length > 0),
      hasValidationRules: !!c.validationRules
    })));

    // Priority 1: Use columnOptions if already loaded from API
    columnsWithOptions.forEach(column => {
      if (column.columnOptions && column.columnOptions.length > 0) {
        console.log('[GridView] Column already has options loaded from API:', {
          columnId: column.id,
          columnName: column.columnName,
          optionsCount: column.columnOptions.length
        });
      }
    });

    // Priority 2: Load options from validationRules (where options are stored as JSON)
    columnsWithOptions
      .filter(col => (!col.columnOptions || col.columnOptions.length === 0) && col.validationRules)
      .forEach(column => {
        try {
          const rules = JSON.parse(column.validationRules!);
          if (rules.columnOptions && Array.isArray(rules.columnOptions) && rules.columnOptions.length > 0) {
            column.columnOptions = rules.columnOptions;
            console.log('[GridView] ✅ Loaded options from validationRules for column:', {
              columnId: column.id,
              columnName: column.columnName,
              optionsCount: column.columnOptions?.length || 0,
              options: column.columnOptions
            });
          }
        } catch (error) {
          console.warn('[GridView] Failed to parse validationRules for column:', {
            columnId: column.id,
            columnName: column.columnName,
            validationRules: column.validationRules,
            error: error
          });
        }
      });

    // Priority 3: Load options from DataSource API (only for columns with dataSourceId and no options yet)
    const columnsNeedingDataSourceOptions = columnsWithOptions.filter(col => 
      col.dataSourceId && (!col.columnOptions || col.columnOptions.length === 0)
    );

    if (columnsNeedingDataSourceOptions.length > 0) {
      const dataSourceObservables = columnsNeedingDataSourceOptions.map(col => {
        return this.gridService.loadColumnOptions(col.id!).pipe(
          map(response => ({ columnId: col.id, options: response.data || [] })),
          catchError((error) => {
            console.warn('[GridView] Failed to load options from DataSource for column:', {
              columnId: col.id,
              columnName: col.columnName,
              error: error
            });
            return of({ columnId: col.id, options: [] });
          })
        );
      });

      forkJoin(dataSourceObservables).subscribe({
        next: (results) => {
          results.forEach(result => {
            const column = this.columns.find(c => c.id === result.columnId);
            if (column && result.options.length > 0) {
              // Convert to GridColumnOptionDto format
              column.columnOptions = result.options.map((opt: any) => ({
                id: opt.id || 0,
                columnId: column.id,
                optionValue: opt.optionValue || opt.value,
                optionText: opt.optionText || opt.text,
                foreignOptionText: opt.foreignOptionText || opt.foreignText,
                optionOrder: opt.optionOrder || opt.order || 0,
                isActive: opt.isActive !== false
              }));
              console.log('[GridView] ✅ Loaded options from DataSource for column:', {
                columnId: column.id,
                columnName: column.columnName,
                optionsCount: column.columnOptions.length
              });
            }
          });
        },
        error: (error) => {
          console.error('[GridView] Error loading column options from DataSource:', error);
        }
      });
    }
  }

  /**
   * Update visible columns based on column visibility settings
   */
  private updateVisibleColumns(): void {
    // Filter columns that are visible and active
    this.visibleColumns = this.columns.filter(col => {
      const isVisible = col.isVisible !== false;
      const isActive = col.isActive !== false;
      return isVisible && isActive;
    });
    
    console.log('[GridView] Total columns:', this.columns.length);
    console.log('[GridView] Visible columns:', this.visibleColumns.length);
    console.log('[GridView] Columns:', this.columns.map(c => ({ 
      id: c.id, 
      name: c.columnName, 
      code: c.columnCode, 
      isVisible: c.isVisible, 
      isActive: c.isActive 
    })));
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
        isDeleted: false,
        cells: []
      }];
    }

    // Initialize data structure for all rows using visible columns
    this.rows.forEach((row) => {
      if (!this.gridData[row.rowIndex]) {
        this.gridData[row.rowIndex] = {};
      }
      // Use visibleColumns instead of all columns to ensure we only initialize visible ones
      this.visibleColumns.forEach((col) => {
        if (col.id && !this.gridData[row.rowIndex][col.id]) {
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
    // Check if grid is read-only
    if (this.isReadOnly) {
      return;
    }

    // Check if column is read-only
    const column = this.columns.find(c => c.id === columnId);
    if (column && this.isColumnReadOnly(column)) {
      return;
    }

    if (!this.gridData[rowIndex]) {
      this.gridData[rowIndex] = {};
    }
    this.gridData[rowIndex][columnId] = value;
  }

  /**
   * Add new row
   */
  addRow(): void {
    // Check if grid is read-only
    if (this.isReadOnly) {
      this.error = 'Grid is read-only. Cannot add rows.';
      return;
    }

    // Check maximum rows constraint
    if (this.grid?.maxRows && this.rows.length >= this.grid.maxRows) {
      this.error = `Maximum ${this.grid.maxRows} rows allowed. Cannot add more rows.`;
      return;
    }

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
      isDeleted: false,
      cells: []
    };

    this.rows.push(newRow);
    this.gridData[newIndex] = {};

    // Initialize with default values
    this.columns.forEach((col) => {
      this.gridData[newIndex][col.id] = col.defaultValue || '';
    });

    // Clear error if successful
    this.error = '';
  }

  /**
   * Remove row
   */
  removeRow(rowIndex: number): void {
    // Check if grid is read-only
    if (this.isReadOnly) {
      this.error = 'Grid is read-only. Cannot delete rows.';
      return;
    }

    // Check minimum rows constraint
    if (this.grid?.minRows && this.rows.length <= this.grid.minRows) {
      this.error = `Minimum ${this.grid.minRows} rows required. Cannot delete row.`;
      return;
    }

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
            this.error = ''; // Clear error if successful
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
        this.error = ''; // Clear error if successful
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

    const errors: ValidationErrorDto[] = [];

    // Validate minimum rows
    if (this.grid.minRows && this.rows.length < this.grid.minRows) {
      errors.push({
        field: 'grid',
        message: `Minimum ${this.grid.minRows} rows required. Currently have ${this.rows.length} rows.`,
        rowIndex: undefined,
        columnId: undefined
      });
    }

    // Validate maximum rows
    if (this.grid.maxRows && this.rows.length > this.grid.maxRows) {
      errors.push({
        field: 'grid',
        message: `Maximum ${this.grid.maxRows} rows allowed. Currently have ${this.rows.length} rows.`,
        rowIndex: undefined,
        columnId: undefined
      });
    }

    // Validate required columns
    this.rows.forEach((row) => {
      this.columns.forEach((col) => {
        if (col.isRequired && col.isVisible !== false) {
          const cellValue = this.getCellValue(row.rowIndex, col.id);
          if (!cellValue || cellValue.trim() === '') {
            errors.push({
              field: col.columnCode,
              message: `${col.columnName} is required`,
              rowIndex: row.rowIndex,
              columnId: col.id
            });
          }
        }
      });
    });

    // If there are local validation errors, return them
    if (errors.length > 0) {
      return of({ isValid: false, errors, warnings: [] });
    }

    // Otherwise, call backend validation
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
    // Use gridTitle input if provided (for standalone grids)
    if (this.gridTitle) {
      return this.gridTitle;
    }
    
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
   * Check if column is read-only
   */
  isColumnReadOnly(column: FormGridColumnDto): boolean {
    // Grid-level read-only takes precedence
    if (this.isReadOnly) {
      return true;
    }
    // Column-level read-only
    return column.isReadOnly === true;
  }

  /**
   * Check if column is visible
   */
  isColumnVisible(column: FormGridColumnDto): boolean {
    return column.isVisible !== false;
  }

  /**
   * Get input type for column
   */
  getInputType(column: FormGridColumnDto): string {
    // First, check if column has fieldType with hasOptions (Radio, Select, Checkbox)
    if (column.fieldType?.hasOptions === true) {
      return 'select';
    }
    
    // Check if column has options directly (from columnOptions)
    if (column.columnOptions && column.columnOptions.length > 0) {
      return 'select';
    }
    
    // Check dataType for other input types
    const dataType = (column.dataType || '').toLowerCase();
    
    if (dataType.includes('email')) return 'email';
    if (dataType.includes('number') || dataType.includes('numeric')) return 'number';
    if (dataType.includes('date')) return 'date';
    if (dataType === 'select') return 'select';
    
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
   * Get add row button tooltip
   */
  getAddRowTooltip(): string {
    if (this.isReadOnly) {
      return this.translationService.translate('grids.readOnlyGrid') || 'Grid is read-only';
    }
    if (this.grid?.maxRows && this.rows.length >= this.grid.maxRows) {
      return this.translationService.translate('grids.maxRowsReached') || `Maximum ${this.grid.maxRows} rows reached`;
    }
    return this.translationService.translate('grids.addRow') || 'Add new row';
  }

  /**
   * Get remove row button tooltip
   */
  getRemoveRowTooltip(rowIndex: number): string {
    if (this.isReadOnly) {
      return this.translationService.translate('grids.readOnlyGrid') || 'Grid is read-only';
    }
    if (this.grid?.minRows && this.rows.length <= this.grid.minRows) {
      return this.translationService.translate('grids.minRowsRequired') || `Minimum ${this.grid.minRows} rows required`;
    }
    return this.translationService.translate('grids.removeRow') || 'Remove row';
  }

  /**
   * Check if can add row
   */
  canAddRow(): boolean {
    if (this.isReadOnly) return false;
    if (this.grid?.maxRows && this.rows.length >= this.grid.maxRows) return false;
    return true;
  }

  /**
   * Check if can remove row
   */
  canRemoveRow(): boolean {
    if (this.isReadOnly) return false;
    if (this.grid?.minRows && this.rows.length <= this.grid.minRows) return false;
    return true;
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

