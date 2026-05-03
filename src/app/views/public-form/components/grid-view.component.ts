import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GridService } from '../../FormBuilder/services/grid.service';
import { GridColumnDataSourcesService } from '../../FormBuilder/services/grid-column-data-sources.service';
import { GridColumnOptionsService } from '../../FormBuilder/services/grid-column-options.service';
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
import { FormSubmissionGridDto, FormSubmissionGridCellDto as SubmissionGridCellDto } from '../../form-submissions/services/form-submissions.service';
import { FormSubmissionAttachmentsService, FormSubmissionAttachmentDto } from '../../form-submissions/services/form-submission-attachments.service';

interface GridFileCellValue {
  attachmentId?: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  downloadUrl?: string;
  lastModified?: number;
}

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
  pendingGridFiles: { [cellKey: string]: File } = {};
  gridPreviewOpen = false;
  gridPreviewName = '';
  gridPreviewUrl: SafeResourceUrl | null = null;
  gridPreviewType: 'image' | 'pdf' | null = null;
  private gridObjectUrls: string[] = [];
  fieldTypes: FieldTypeDto[] = []; // Field types for determining input type

  loading = false;
  saving = false;
  error: string = '';
  validationErrors: { [rowIndex: number]: { [columnId: number]: string } } = {};
  loadingColumnOptions: { [columnId: number]: boolean } = {}; // Loading state for each column
  columnOptionsErrors: { [columnId: number]: string } = {}; // Error messages for each column

  constructor(
    private gridService: GridService,
    private dataSourcesService: GridColumnDataSourcesService,
    private gridColumnOptionsService: GridColumnOptionsService,
    private fieldsService: FieldsService,
    private formSubmissionAttachmentsService: FormSubmissionAttachmentsService,
    public translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Load field types first, then load grid
    this.loadFieldTypes(() => {
    this.loadGrid();
    });
  }

  /**
   * Click handler wrapper to execute saveGridData() and ensure the observable is subscribed.
   */
  onSaveGridClick(): void {
    this.saveGridData().subscribe({
      next: (response) => {
        // Response handling is performed inside saveGridData; nothing else needed here.
      },
      error: (err) => {
        // saveGridData has internal catchError, but guard against unexpected errors
        console.error('[GridView] Unexpected error while saving grid:', err);
        this.saving = false;
        this.error = 'Error saving grid data';
      }
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
    // Reload grid data when submissionId changes to a valid value
    if (changes['submissionId']) {
      const newSubmissionId = changes['submissionId'].currentValue;
      const oldSubmissionId = changes['submissionId'].previousValue;
      console.log('[GridView] ngOnChanges - submissionId changed:', { old: oldSubmissionId, new: newSubmissionId, hasGrid: !!this.grid });
      
      // Load data if submissionId becomes valid (> 0) and different from before
      // But only if we don't have existing rows (preserve user-added rows)
      if (newSubmissionId > 0 && newSubmissionId !== oldSubmissionId) {
        if (this.grid) {
          // Only reload if we don't have rows yet, or if submissionId was 0 before (first time)
          if (this.rows.length === 0 || oldSubmissionId === 0 || oldSubmissionId === null) {
            console.log('[GridView] submissionId changed from', oldSubmissionId, 'to', newSubmissionId, '- reloading grid data');
            this.loadGridData();
          } else {
            console.log('[GridView] submissionId changed but preserving existing', this.rows.length, 'rows (not reloading to avoid data loss)');
            // Update submissionId in existing rows (important: update rows added before submissionId was available)
            this.rows.forEach(row => {
              if (row.submissionId !== newSubmissionId) {
                console.log(`[GridView] Updating row ${row.rowIndex} submissionId from ${row.submissionId} to ${newSubmissionId}`);
                row.submissionId = newSubmissionId;
              }
            });
          }
        } else {
          // Grid not loaded yet, but if submissionId changed from 0 to > 0, update existing rows
          if (this.rows.length > 0 && (oldSubmissionId === 0 || oldSubmissionId === null || oldSubmissionId === undefined)) {
            console.log('[GridView] Grid not loaded yet, but updating existing rows with new submissionId:', newSubmissionId);
            this.rows.forEach(row => {
              row.submissionId = newSubmissionId;
            });
          }
          // Store flag to load data after grid initializes
          console.log('[GridView] submissionId set but grid not loaded yet - will load after grid init');
          (this as any)._pendingDataLoad = true;
        }
      }
    }
  }

  /**
   * Public method to reload grid data (can be called from parent component)
   */
  reloadGridData(): void {
    console.log('[GridView] reloadGridData called, grid:', this.grid?.gridName, 'submissionId:', this.submissionId);
    if (this.grid && this.submissionId > 0) {
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

    // Try to load active columns first
    this.gridService.getActiveColumnsByGrid(this.grid.id).subscribe({
      next: (response: ApiResponse<FormGridColumnDto[]>) => {
        this.columns = response.data || [];
        this.columns.sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
        
        console.log('[GridView] Loaded active columns:', this.columns.length);
        console.log('[GridView] Columns data:', this.columns);
        
        // If no active columns found, try loading all columns (including inactive)
        if (this.columns.length === 0) {
          console.warn('[GridView] No active columns found, trying to load all columns...');
          if (!this.grid?.id) {
            this.error = 'No columns found. Please ensure the grid has columns configured.';
            this.loading = false;
            return;
          }
          this.gridService.getColumnsByGrid(this.grid.id).subscribe({
            next: (allColumnsResponse: ApiResponse<FormGridColumnDto[]>) => {
              const allColumns = allColumnsResponse.data || [];
              console.log('[GridView] Loaded all columns (including inactive):', allColumns.length);
              
              if (allColumns.length === 0) {
                this.error = 'No columns found. Please ensure the grid has columns configured. You can add columns in the Grid Columns management page.';
                this.loading = false;
                return;
              } else {
                // Filter to show only active columns, but log warning
                this.columns = allColumns.filter(col => col.isActive !== false);
                this.columns.sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
                
                if (this.columns.length === 0) {
                  console.warn('[GridView] Grid has columns but all are inactive');
                  this.error = `Grid has ${allColumns.length} column(s) but all are inactive. Please activate at least one column in the Grid Columns management page.`;
                  this.loading = false;
                  return;
                } else {
                  console.warn(`[GridView] Found ${allColumns.length} total columns, ${this.columns.length} are active`);
                }
              }
              
              // Continue with processing columns
              this.processColumns();
            },
            error: (error: any) => {
              console.error('[GridView] Error loading all columns:', error);
              this.error = 'No columns found. Please ensure the grid has columns configured.';
              this.loading = false;
            }
          });
          return;
        }
        
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
        
        // Continue with processing columns
        this.processColumns();
      },
      error: (error: any) => {
        console.error('[GridView] Error loading active columns:', error);
        // Try fallback to get all columns
        if (!this.grid?.id) {
          this.error = 'Error loading columns. Please try again later.';
          this.loading = false;
          return;
        }
        this.gridService.getColumnsByGrid(this.grid.id).subscribe({
          next: (allColumnsResponse: ApiResponse<FormGridColumnDto[]>) => {
            const allColumns = allColumnsResponse.data || [];
            if (allColumns.length === 0) {
              this.error = 'No columns found. Please ensure the grid has columns configured.';
            } else {
              this.columns = allColumns.filter(col => col.isActive !== false);
              this.columns.sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
              if (this.columns.length > 0) {
                this.processColumns();
              } else {
                this.error = `Grid has ${allColumns.length} column(s) but all are inactive. Please activate at least one column.`;
                this.loading = false;
              }
            }
          },
          error: (fallbackError: any) => {
            console.error('[GridView] Error loading columns (fallback):', fallbackError);
            this.error = 'Error loading columns. Please try again later.';
            this.loading = false;
          }
        });
      }
    });
  }

  /**
   * Process loaded columns (link fieldTypes, load options, etc.)
   */
  private processColumns(): void {
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
    
    // Load existing data if submissionId is available OR if there was a pending load
    if (this.submissionId > 0 || (this as any)._pendingDataLoad) {
      console.log('[GridView] initializeData - loading grid data, submissionId:', this.submissionId, 'pendingLoad:', (this as any)._pendingDataLoad);
      (this as any)._pendingDataLoad = false;
      this.loadGridData();
    } else {
      console.log('[GridView] initializeData - no submissionId, skipping data load');
      this.loading = false;
    }
  }

  /**
   * Load column options from validationRules, columnOptions (from API), or Data Sources
   */
  private loadColumnOptions(): void {
    console.log('[GridView] loadColumnOptions called, columns:', this.columns.map(c => ({
      id: c.id,
      name: c.columnName,
      dataType: c.dataType,
      fieldTypeId: c.fieldTypeId,
      hasOptions: c.fieldType?.hasOptions,
      dataSourceId: c.dataSourceId,
      hasColumnOptions: !!(c.columnOptions && c.columnOptions.length > 0),
      hasValidationRules: !!c.validationRules,
      fieldType: c.fieldType
    })));

    // Filter columns that have options (either from fieldType.hasOptions, dataType === 'select', has dataSourceId, or already has columnOptions)
    const columnsWithOptions = this.columns.filter(col => {
      const hasOptionsFromFieldType = col.fieldType?.hasOptions === true;
      const hasSelectDataType = ['select', 'radio', 'checkbox'].includes(this.getInputType(col));
      const hasDataSourceId = !!(col.dataSourceId);
      const alreadyHasOptions = !!(col.columnOptions && col.columnOptions.length > 0);
      
      const hasOptions = hasOptionsFromFieldType || hasSelectDataType || hasDataSourceId || alreadyHasOptions;
      
      console.log('[GridView] Column filter check:', {
        id: col.id,
        name: col.columnName,
        dataType: col.dataType,
        fieldTypeHasOptions: col.fieldType?.hasOptions,
        dataSourceId: col.dataSourceId,
        hasOptionsFromFieldType,
        hasSelectDataType,
        hasDataSourceId,
        alreadyHasOptions,
        matches: hasOptions,
        fullColumn: col
      });
      return hasOptions;
    });

    console.log('[GridView] Columns with options (filtered):', columnsWithOptions.length, columnsWithOptions.map(c => ({
      id: c.id,
      name: c.columnName
    })));

    // Try to load options for ALL columns (even if they don't match the filter)
    // This is because the API endpoint /column/{columnId}/options may have options even if dataSourceId is not in the column object
    const allColumnsToCheck = this.columns.filter(col => col.id && (!col.columnOptions || col.columnOptions.length === 0));
    
    console.log('[GridView] Attempting to load options for all columns:', allColumnsToCheck.length, allColumnsToCheck.map(c => ({
      id: c.id,
      name: c.columnName
    })));

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

    // Priority 3: Load options from DataSource API endpoint (which handles both static and dynamic options)
    // This endpoint (/column/{columnId}/options) doesn't require authentication and can return options from:
    // - Static options stored in GRID_COLUMN_OPTIONS table
    // - DataSource options (API, LookupTable, etc.)
    const columnsNeedingOptions = allColumnsToCheck.filter(col => {
      // Load options for columns that need them (hasOptions fieldType or select dataType)
      const hasOptionsFromFieldType = col.fieldType?.hasOptions === true;
      const hasSelectDataType = ['select', 'radio', 'checkbox'].includes(this.getInputType(col));
      return hasOptionsFromFieldType || hasSelectDataType;
    });

    if (columnsNeedingOptions.length > 0) {
      // Set loading state for all columns
      columnsNeedingOptions.forEach(col => {
        if (col.id) {
          this.loadingColumnOptions[col.id] = true;
          this.columnOptionsErrors[col.id] = '';
        }
      });

      const optionsObservables = columnsNeedingOptions.map(col => {
        if (!col.id) {
          return of({ columnId: col.id, options: [], source: 'none', error: null });
        }
        
        // Check if column has a DataSource configured
        // First try col.dataSource (if loaded from API), otherwise load from dataSourceId
        let dataSource = col.dataSource;
        
        // Log column info for debugging
        console.log(`[GridView] Processing column ${col.id} (${col.columnName}):`, {
          columnId: col.id,
          columnName: col.columnName,
          dataSourceId: col.dataSourceId,
          hasDataSource: !!col.dataSource,
          dataSourceType: col.dataSource?.sourceType,
          fieldTypeHasOptions: col.fieldType?.hasOptions,
          dataType: col.dataType
        });
        
        // If dataSource is not loaded but dataSourceId exists, try to load it
        if (!dataSource && col.dataSourceId) {
          // Try to find DataSource from available dataSources or load it
          // For now, we'll use dataSourceId to call the endpoint directly
          // The endpoint /column-options will handle loading the DataSource internally
          console.log(`[GridView] Column ${col.id} has dataSourceId ${col.dataSourceId} but dataSource not loaded, will use endpoint directly`);
        }
        
        const needsPost = dataSource?.sourceType === 'API' && 
                         dataSource?.httpMethod?.toUpperCase() === 'POST' && 
                         dataSource?.requestBodyJson;
        
        // Priority 1: Try DataSource endpoint /column-options (public endpoint for Grid Columns)
        // Use POST if DataSource is API with POST method and request body
        console.log(`[GridView] Trying DataSource endpoint /column-options for column ${col.id}...`, {
          columnId: col.id,
          columnName: col.columnName,
          dataSourceId: col.dataSourceId,
          sourceType: dataSource?.sourceType,
          httpMethod: dataSource?.httpMethod,
          needsPost: needsPost,
          hasDataSource: !!dataSource
        });
        
        const dataSourceRequest = needsPost 
          ? this.dataSourcesService.getColumnOptionsPost(
              col.id,
              undefined,
              dataSource.requestBodyJson
            )
          : this.dataSourcesService.getColumnOptions(col.id);
        
        return dataSourceRequest.pipe(
          map((options: DropdownOptionDto[]) => {
            if (options && options.length > 0) {
              console.log(`[GridView] ✅ DataSource endpoint returned options for column ${col.id}:`, {
                columnId: col.id,
                columnName: col.columnName,
                sourceType: dataSource?.sourceType,
                httpMethod: dataSource?.httpMethod,
                optionsCount: options.length,
                options: options
              });
              return { columnId: col.id, options: options, source: 'DataSource', error: null };
            } else {
              console.log(`[GridView] DataSource endpoint returned no options for column ${col.id}`);
              return { columnId: col.id, options: [], source: 'DataSource', error: null };
            }
          }),
          catchError((dsError) => {
            console.warn(`[GridView] DataSource endpoint failed or returned empty for column ${col.id}, trying GridColumnOptionsService:`, {
              columnId: col.id,
              error: dsError,
              status: dsError?.status
            });
            // Priority 2: Try GridColumnOptionsService.getOptionsByColumnId() (all options, not just active)
            return this.gridColumnOptionsService.getOptionsByColumnId(col.id).pipe(
              map(options => {
                if (options && options.length > 0) {
                  // Filter only active options
                  const activeOptions = options.filter(opt => opt.isActive !== false);
                  if (activeOptions.length > 0) {
                    console.log(`[GridView] ✅ GridColumnOptionsService.getOptionsByColumnId() returned options for column ${col.id}:`, {
                      columnId: col.id,
                      optionsCount: activeOptions.length,
                      totalOptions: options.length,
                      options: activeOptions
                    });
                    // Convert GridColumnOptionDto[] to DropdownOptionDto[]
                    return {
                      columnId: col.id,
                      options: activeOptions.map(opt => ({
                        value: opt.optionValue,
                        text: opt.optionText,
                        foreignText: opt.foreignOptionText,
                        order: opt.optionOrder || 0
                      } as DropdownOptionDto)),
                      source: 'GridColumnOptions',
                      error: null
                    };
                  } else {
                    throw new Error('No active options found');
                  }
                } else {
                  throw new Error('Empty result from GridColumnOptionsService.getOptionsByColumnId');
                }
              }),
              catchError((gcoError) => {
                console.warn(`[GridView] GridColumnOptionsService.getOptionsByColumnId() failed for column ${col.id}, trying getActiveOptionsByColumnId:`, {
                  columnId: col.id,
                  dataSourceError: dsError,
                  gridColumnOptionsError: gcoError
                });
                // Priority 3: Last resort - try getActiveOptionsByColumnId (may require auth)
                return this.gridColumnOptionsService.getActiveOptionsByColumnId(col.id).pipe(
                  map(options => {
                    if (options && options.length > 0) {
                      console.log(`[GridView] ✅ GridColumnOptionsService.getActiveOptionsByColumnId() returned options for column ${col.id}:`, {
                        columnId: col.id,
                        optionsCount: options.length,
                        options: options
                      });
                      // Convert GridColumnOptionDto[] to DropdownOptionDto[]
                      return {
                        columnId: col.id,
                        options: options.map(opt => ({
                          value: opt.optionValue,
                          text: opt.optionText,
                          foreignText: opt.foreignOptionText,
                          order: opt.optionOrder || 0
                        } as DropdownOptionDto)),
                        source: 'GridColumnOptionsActive',
                        error: null
                      };
                    } else {
                      throw new Error('Empty result from GridColumnOptionsService.getActiveOptionsByColumnId');
                    }
                  }),
                  catchError((gcoActiveError) => {
                    const errorMessage = `All endpoints failed: ${dsError?.message || 'DataSource failed'}, ${gcoError?.message || 'GridColumnOptions failed'}, ${gcoActiveError?.message || 'GridColumnOptionsActive failed'}`;
                    console.warn(`[GridView] All endpoints failed for column ${col.id}:`, {
                      columnId: col.id,
                      dataSourceError: dsError,
                      gridColumnOptionsError: gcoError,
                      gridColumnOptionsActiveError: gcoActiveError
                    });
                    return of({ 
                      columnId: col.id, 
                      options: [], 
                      source: 'failed',
                      error: errorMessage
                    });
                  })
                );
              })
            );
          })
        );
      });

      forkJoin(optionsObservables).subscribe({
        next: (results) => {
          console.log('[GridView] Options results from all endpoints:', results);
          let optionsLoaded = false;
          results.forEach(result => {
            const column = this.columns.find(c => c.id === result.columnId);
            
            // Clear loading state
            if (result.columnId) {
              this.loadingColumnOptions[result.columnId] = false;
            }
            
            console.log(`[GridView] Processing result for column ${result.columnId}:`, {
              columnId: result.columnId,
              columnFound: !!column,
              optionsCount: result.options?.length || 0,
              source: result.source,
              options: result.options,
              error: result.error
            });
            
            if (result.error && result.columnId) {
              this.columnOptionsErrors[result.columnId] = result.error;
            } else if (result.columnId) {
              this.columnOptionsErrors[result.columnId] = '';
            }
            
            if (column && result.options && result.options.length > 0) {
              // Convert DropdownOptionDto[] to GridColumnOptionDto format for internal use
              column.columnOptions = result.options.map((opt: DropdownOptionDto) => ({
                id: 0,
                columnId: column.id,
                optionValue: opt.value,
                optionText: opt.text,
                foreignOptionText: opt.foreignText || '',
                optionOrder: opt.order || 0,
                isDefault: false,
                isActive: opt.isDeleted !== true
              }));
              optionsLoaded = true;
              console.log(`[GridView] ✅ Successfully loaded options for column ${column.id} (${column.columnName}) from ${result.source}. Options count: ${column.columnOptions.length}`);
            } else if (column) {
              console.warn(`[GridView] ⚠️ No options found for column ${column.id} (${column.columnName}) from ${result.source || 'unknown source'}`);
            }
          });
          
          if (optionsLoaded) {
            console.log('[GridView] ✅ Options loaded successfully, triggering change detection');
            this.cdr.detectChanges();
          } else {
            console.warn('[GridView] ⚠️ No options were loaded for any column');
          }
        },
        error: (error) => {
          console.error('[GridView] Error loading column options from all sources:', error);
          // Clear loading states on error
          columnsNeedingOptions.forEach(col => {
            if (col.id) {
              this.loadingColumnOptions[col.id] = false;
              this.columnOptionsErrors[col.id] = error?.message || 'Failed to load options';
            }
          });
          this.cdr.detectChanges();
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
   * Load grid data from submission response (with cells already nested)
   * This method is called when submission data is loaded with gridData already populated
   */
  loadGridDataFromSubmission(gridData: FormSubmissionGridDto[]): void {
    console.log('[GridView] loadGridDataFromSubmission called:', {
      gridId: this.grid?.id,
      gridName: this.grid?.gridName,
      submissionId: this.submissionId,
      gridDataCount: gridData?.length || 0,
      columnsCount: this.columns?.length || 0,
      visibleColumnsCount: this.visibleColumns?.length || 0
    });

    if (!this.grid || !this.grid.id) {
      console.warn('[GridView] Cannot load grid data: grid not loaded yet');
      return;
    }

    // Wait for columns to be loaded if not ready yet
    if (!this.columns || this.columns.length === 0) {
      console.warn('[GridView] Columns not loaded yet, waiting...');
      setTimeout(() => {
        if (this.columns && this.columns.length > 0) {
          this.loadGridDataFromSubmission(gridData);
        } else {
          console.error('[GridView] Columns still not loaded after wait, initializing empty grid');
          this.initializeGridData();
        }
      }, 500);
      return;
    }

    if (!gridData || gridData.length === 0) {
      console.log('[GridView] No grid data provided, initializing empty grid');
      this.initializeGridData();
      return;
    }

    // Filter rows for this grid
    const gridRows = gridData.filter(g => g.gridId === this.grid?.id);
    console.log('[GridView] Found', gridRows.length, 'rows for grid', this.grid.id);

    if (gridRows.length === 0) {
      console.log('[GridView] No rows found for this grid, initializing empty grid');
      this.initializeGridData();
      return;
    }

    // Convert FormSubmissionGridDto[] to FormSubmissionGridRowDto[]
    // Note: cells from submission response use SubmissionGridCellDto format (with valueString, valueNumber, etc.)
    // but FormSubmissionGridRowDto expects FormSubmissionGridCellDto format (with cellValue)
    this.rows = gridRows.map(gridRow => {
      // Convert cells from submission format to grid component format
      const convertedCells: FormSubmissionGridCellDto[] = (gridRow.cells || []).map((submissionCell: SubmissionGridCellDto) => {
        // Extract value from submission cell format (valueString, valueNumber, etc.)
        const column = this.columns.find(col => col.id === submissionCell.columnId);
        const rawCellValue = column && this.getInputType(column) === 'file' && submissionCell.valueJson
          ? submissionCell.valueJson
          : submissionCell.valueString 
          || (submissionCell.valueNumber !== null && submissionCell.valueNumber !== undefined ? submissionCell.valueNumber.toString() : '')
          || (submissionCell.valueBool !== null && submissionCell.valueBool !== undefined ? submissionCell.valueBool.toString() : '')
          || (submissionCell.valueDate ? submissionCell.valueDate : '')
          || (submissionCell.valueJson ? (() => {
              try {
                const parsed = JSON.parse(submissionCell.valueJson);
                return typeof parsed === 'string' ? parsed : submissionCell.valueJson;
              } catch {
                return submissionCell.valueJson;
              }
            })() : '')
          || '';
        const cellValue = this.normalizeLoadedCellValue(column, rawCellValue);

        // Convert to FormSubmissionGridCellDto format (with cellValue)
        return {
          id: submissionCell.id,
          rowId: submissionCell.rowId,
          columnId: submissionCell.columnId,
          cellValue: cellValue
        } as FormSubmissionGridCellDto;
      });

      return {
        id: gridRow.id,
        submissionId: gridRow.submissionId,
        gridId: gridRow.gridId,
        rowIndex: gridRow.rowIndex,
        isActive: true, // Assume active if not specified
        isDeleted: false,
        cells: convertedCells
      } as FormSubmissionGridRowDto;
    });

    // Sort by rowIndex
    this.rows.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));

    // Initialize gridData structure and populate cell values
    this.gridData = {};
    
    console.log('[GridView] Available columns:', this.columns.map(c => ({ id: c.id, name: c.columnName, code: c.columnCode })));
    console.log('[GridView] Visible columns:', this.visibleColumns.map(c => ({ id: c.id, name: c.columnName, code: c.columnCode })));
    
    this.rows.forEach((row) => {
      if (!this.gridData[row.rowIndex]) {
        this.gridData[row.rowIndex] = {};
      }

      // Populate cell values from nested cells
      if (row.cells && row.cells.length > 0) {
        console.log(`[GridView] Processing row ${row.rowIndex} with ${row.cells.length} cells`);
        row.cells.forEach((cell: FormSubmissionGridCellDto) => {
          if (cell.columnId) {
            const cellValue = cell.cellValue || '';
            
            // Verify column exists
            const columnExists = this.columns.some(c => c.id === cell.columnId);
            if (!columnExists) {
              console.warn(`[GridView] Column ${cell.columnId} not found in columns list!`, {
                cellColumnId: cell.columnId,
                availableColumnIds: this.columns.map(c => c.id)
              });
            }
            
            this.gridData[row.rowIndex][cell.columnId] = cellValue;
            console.log('[GridView] Loaded cell value:', {
              rowIndex: row.rowIndex,
              columnId: cell.columnId,
              value: cellValue,
              cellValueType: typeof cellValue,
              cellValueLength: cellValue ? cellValue.length : 0,
              columnExists: columnExists,
              cell: cell,
              gridDataAfter: this.gridData[row.rowIndex][cell.columnId],
              gridDataRowKeys: Object.keys(this.gridData[row.rowIndex])
            });
          } else {
            console.warn('[GridView] Cell has no columnId:', cell);
          }
        });
      } else {
        console.warn(`[GridView] Row ${row.rowIndex} has no cells!`, {
          row: row,
          rowCells: row.cells
        });
      }
    });
    
    // Verify gridData structure
    console.log('[GridView] Final gridData structure:', {
      gridDataKeys: Object.keys(this.gridData),
      gridDataRows: Object.keys(this.gridData).map(key => ({
        rowIndex: key,
        columns: Object.keys(this.gridData[Number(key)] || {}),
        values: Object.entries(this.gridData[Number(key)] || {}).map(([colId, val]) => ({
          columnId: colId,
          value: val
        }))
      }))
    });

    console.log('[GridView] ✅ Loaded grid data from submission:', {
      rowsCount: this.rows.length,
      gridData: this.gridData,
      gridDataKeys: Object.keys(this.gridData),
      sampleRowData: this.rows.length > 0 ? {
        rowIndex: this.rows[0].rowIndex,
        cellsCount: this.rows[0].cells?.length || 0,
        gridDataForRow: this.gridData[this.rows[0].rowIndex]
      } : null
    });
    
    // Trigger change detection multiple times to ensure UI updates
    // Use setTimeout to ensure change detection happens after data is fully loaded
    setTimeout(() => {
      this.cdr.detectChanges();
      // Force another change detection after a short delay to ensure all bindings update
      setTimeout(() => {
        this.cdr.detectChanges();
        console.log('[GridView] Change detection triggered after data load');
      }, 100);
    }, 0);
    
    this.loading = false;
  }

  /**
   * Load grid data (rows and cells)
   */
  private loadGridData(): void {
    console.log('[GridView] loadGridData called:', {
      gridId: this.grid?.id,
      gridName: this.grid?.gridName,
      submissionId: this.submissionId
    });
    
    if (!this.grid || !this.grid.id || !this.submissionId || this.submissionId <= 0) {
      console.log('[GridView] loadGridData - skipping (missing grid or submissionId)');
      this.loading = false;
      return;
    }

    // Don't reload if we already have rows (prevents losing unsaved rows when submissionId changes)
    if (this.rows.length > 0) {
      console.log('[GridView] loadGridData - skipping reload (already have', this.rows.length, 'rows, preserving unsaved data)');
      console.log('[GridView] Current rows:', this.rows.map(r => ({ id: r.id, rowIndex: r.rowIndex, isActive: r.isActive })));
      this.loading = false;
      return;
    }

    console.log('[GridView] Loading rows for submission', this.submissionId, 'grid', this.grid.id);
    this.loading = true;
    this.gridService.getRowsBySubmissionAndGrid(this.submissionId, this.grid.id).subscribe({
      next: (response: ApiResponse<FormSubmissionGridRowDto[]>) => {
        const loadedRows = response.data || [];
        console.log('[GridView] ✅ Loaded', loadedRows.length, 'rows from backend for grid', this.grid?.gridName);
        console.log('[GridView] Loaded rows data:', loadedRows.map(r => ({ id: r.id, rowIndex: r.rowIndex, isActive: r.isActive })));
        
        // Only set rows if we don't have any (preserve user-added rows)
        if (this.rows.length === 0) {
          this.rows = loadedRows;
        } else {
          console.log('[GridView] Preserving existing', this.rows.length, 'rows, not overwriting with backend data');
        }
        
        this.rows.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
        
        // Load cells for each row
        if (this.rows.length > 0) {
          this.loadCells();
        } else {
          console.log('[GridView] No rows found, initializing empty grid');
          this.initializeGridData();
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('[GridView] ❌ Error loading grid rows:', error);
        this.error = 'Error loading grid data';
        this.loading = false;
      }
    });
  }

  /**
   * Load cells for all rows
   */
  private loadCells(): void {
    console.log('[GridView] loadCells called, rows count:', this.rows.length);
    
    if (this.rows.length === 0) {
      console.log('[GridView] No rows to load cells for');
      this.initializeGridData();
      this.loading = false;
      return;
    }

    let loaded = 0;
    const total = this.rows.length;

    this.rows.forEach((row) => {
      console.log('[GridView] Loading cells for row:', { id: row.id, rowIndex: row.rowIndex });
      if (row.id && row.id > 0) {
        this.gridService.getCellsByRow(row.id).subscribe({
          next: (response: ApiResponse<FormSubmissionGridCellDto[]>) => {
            const cells = response.data || [];
            console.log('[GridView] ✅ Loaded', cells.length, 'cells for row', row.id);
            
            // Initialize row data
            if (!this.gridData[row.rowIndex]) {
              this.gridData[row.rowIndex] = {};
            }
            
            // Populate cell values
            cells.forEach((cell: FormSubmissionGridCellDto) => {
              if (cell.columnId) {
                // Handle different value formats from backend
                // Backend may send cellValue, valueString, valueNumber, etc.
                const column = this.columns.find(col => col.id === cell.columnId);
                const rawCellValue = column && this.getInputType(column) === 'file' && (cell as any).valueJson
                  ? (cell as any).valueJson
                  : (cell as any).cellValue 
                  || (cell as any).valueString 
                  || (cell as any).valueNumber?.toString()
                  || (cell as any).valueBool?.toString()
                  || (cell as any).valueDate
                  || (cell as any).valueJson
                  || '';
                const cellValue = this.normalizeLoadedCellValue(column, rawCellValue);
                
                this.gridData[row.rowIndex][cell.columnId] = cellValue;
                console.log('[GridView] Cell value:', { 
                  rowIndex: row.rowIndex, 
                  columnId: cell.columnId, 
                  value: cellValue,
                  rawCell: cell
                });
              }
            });
            
            loaded++;
            if (loaded === total) {
              console.log('[GridView] All cells loaded, gridData:', this.gridData);
              this.loading = false;
            }
          },
          error: (error) => {
            console.error('[GridView] ❌ Error loading cells for row', row.id, error);
            loaded++;
            if (loaded === total) {
              this.loading = false;
            }
          }
        });
      } else {
        console.log('[GridView] Row has no ID, skipping cell load:', row);
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
          this.gridData[row.rowIndex][col.id] = this.getColumnDefaultValue(col);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.gridObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.gridObjectUrls = [];
  }

  private getColumnDefaultValue(column: FormGridColumnDto): string {
    const configuredDefault = column.defaultValue;
    const inputType = this.getInputType(column);
    if (configuredDefault !== undefined && configuredDefault !== null) {
      const normalizedDefault = String(configuredDefault).trim();
      if (normalizedDefault && normalizedDefault.toLowerCase() !== 'null') {
        const token = normalizedDefault.toLowerCase();
        if (token === '__today__' || token === 'today') {
          return this.getTodayDateInputValue();
        }
        if (token === '__now__' || token === 'now') {
          return inputType === 'date' ? this.getTodayDateInputValue() : this.getCurrentDateTimeInputValue();
        }
        return normalizedDefault;
      }
    }

    return '';
  }

  private getTodayDateInputValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentDateTimeInputValue(): string {
    const now = new Date();
    const date = this.getTodayDateInputValue();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${date}T${hours}:${minutes}`;
  }

  /**
   * Get cell value
   */
  getCellValue(rowIndex: number, columnId: number): string {
    const value = this.gridData[rowIndex]?.[columnId] || '';
    // Debug logging (can be removed later)
    if (value && value !== '') {
      console.log(`[GridView] getCellValue: rowIndex=${rowIndex}, columnId=${columnId}, value=${value}`);
    }
    return value;
  }

  private normalizeLoadedCellValue(column: FormGridColumnDto | undefined, value: any): string {
    if (value === null || value === undefined) return '';
    const raw = String(value);
    if (!column) return raw;

    const inputType = this.getInputType(column);
    if (inputType === 'date') {
      return this.formatDateInputValue(raw);
    }

    if (inputType === 'datetime-local') {
      return this.formatDateTimeInputValue(raw);
    }

    if (inputType === 'time') {
      return this.formatTimeInputValue(raw);
    }

    if (inputType === 'boolean') {
      return this.isTruthyValue(raw) ? 'true' : 'false';
    }

    if (inputType === 'file') {
      return this.normalizeGridFileCellValue(raw);
    }

    return raw;
  }

  private normalizeGridFileCellValue(value: string): string {
    const metadata = this.parseGridFileCellValue(value);
    return metadata ? JSON.stringify(metadata) : value;
  }

  private parseGridFileCellValue(value: string | undefined | null): GridFileCellValue | null {
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && typeof parsed.fileName === 'string') {
        return {
          attachmentId: parsed.attachmentId ? Number(parsed.attachmentId) : undefined,
          fileName: parsed.fileName,
          fileSize: Number(parsed.fileSize || 0),
          contentType: parsed.contentType || 'application/octet-stream',
          downloadUrl: parsed.downloadUrl || (parsed.attachmentId ? this.getAttachmentDownloadUrl(Number(parsed.attachmentId)) : undefined),
          lastModified: parsed.lastModified ? Number(parsed.lastModified) : undefined
        };
      }
    } catch {
      // Plain file names from older saved grid cells are still valid display values.
    }

    const trimmed = String(value).trim();
    return trimmed ? {
      fileName: trimmed,
      fileSize: 0,
      contentType: 'application/octet-stream'
    } : null;
  }

  getGridFileName(rowIndex: number, columnId: number): string {
    const metadata = this.parseGridFileCellValue(this.getCellValue(rowIndex, columnId));
    return metadata?.fileName || '';
  }

  getGridFileDownloadUrl(rowIndex: number, columnId: number): string | null {
    const metadata = this.parseGridFileCellValue(this.getCellValue(rowIndex, columnId));
    if (!metadata?.attachmentId) return null;
    return metadata.downloadUrl || this.getAttachmentDownloadUrl(metadata.attachmentId);
  }

  canPreviewGridFile(rowIndex: number, columnId: number): boolean {
    const file = this.pendingGridFiles[this.getCellKey(rowIndex, columnId)];
    if (file) {
      return this.isPreviewableGridFile(file.type, file.name);
    }

    const metadata = this.parseGridFileCellValue(this.getCellValue(rowIndex, columnId));
    return !!metadata && this.isPreviewableGridFile(metadata.contentType, metadata.fileName) && (!!metadata.attachmentId || !!metadata.downloadUrl);
  }

  openGridFilePreview(rowIndex: number, columnId: number): void {
    const cellKey = this.getCellKey(rowIndex, columnId);
    const pendingFile = this.pendingGridFiles[cellKey];

    if (pendingFile && this.isPreviewableGridFile(pendingFile.type, pendingFile.name)) {
      const objectUrl = URL.createObjectURL(pendingFile);
      this.gridObjectUrls.push(objectUrl);
      this.gridPreviewName = pendingFile.name;
      this.gridPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
      this.gridPreviewType = this.getGridPreviewType(pendingFile.type, pendingFile.name);
      this.gridPreviewOpen = true;
      return;
    }

    const metadata = this.parseGridFileCellValue(this.getCellValue(rowIndex, columnId));
    const downloadUrl = this.getGridFileDownloadUrl(rowIndex, columnId);
    if (!metadata || !downloadUrl || !this.isPreviewableGridFile(metadata.contentType, metadata.fileName)) return;

    this.gridPreviewName = metadata.fileName;
    this.gridPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(downloadUrl);
    this.gridPreviewType = this.getGridPreviewType(metadata.contentType, metadata.fileName);
    this.gridPreviewOpen = true;
  }

  closeGridFilePreview(): void {
    this.gridPreviewOpen = false;
    this.gridPreviewName = '';
    this.gridPreviewUrl = null;
    this.gridPreviewType = null;
  }

  private isPreviewableGridFile(contentType?: string, fileName?: string): boolean {
    const type = (contentType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    return type.startsWith('image/') || type === 'application/pdf' || /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(name);
  }

  private getGridPreviewType(contentType?: string, fileName?: string): 'image' | 'pdf' {
    const type = (contentType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    return type === 'application/pdf' || name.endsWith('.pdf') ? 'pdf' : 'image';
  }

  private getAttachmentDownloadUrl(attachmentId: number): string {
    return this.formSubmissionAttachmentsService.getDownloadUrl(attachmentId);
  }

  private getCellKey(rowIndex: number, columnId: number): string {
    return `${rowIndex}_${columnId}`;
  }

  private toDateOrNull(value: any): Date | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDateInputValue(value: any): string {
    const parsed = this.toDateOrNull(value);
    if (!parsed) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateTimeInputValue(value: any): string {
    const parsed = this.toDateOrNull(value);
    if (!parsed) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private formatTimeInputValue(value: any): string {
    if (value === null || value === undefined || value === '') return '';

    const raw = String(value).trim();
    const timeMatch = raw.match(/(?:T|\s)?(\d{2}):(\d{2})(?::\d{2})?/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }

    const parsed = this.toDateOrNull(value);
    if (!parsed) return '';
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
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

  setFileCellValue(rowIndex: number, columnId: number, file: File | null | undefined): void {
    if (!file) {
      this.clearFileCellValue(rowIndex, columnId);
      return;
    }

    const fileValue: GridFileCellValue = {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
      lastModified: file.lastModified
    };

    this.pendingGridFiles[this.getCellKey(rowIndex, columnId)] = file;
    this.setCellValue(rowIndex, columnId, JSON.stringify(fileValue));
  }

  clearFileCellValue(rowIndex: number, columnId: number): void {
    const column = this.columns.find(c => c.id === columnId);
    if (column && this.isColumnReadOnly(column)) {
      return;
    }

    delete this.pendingGridFiles[this.getCellKey(rowIndex, columnId)];
    this.setCellValue(rowIndex, columnId, '');
    if (this.validationErrors[rowIndex]) {
      delete this.validationErrors[rowIndex][columnId];
    }
    this.cdr.detectChanges();
  }

  private uploadPendingGridFiles(): Observable<void> {
    const pendingEntries = Object.entries(this.pendingGridFiles);
    if (pendingEntries.length === 0 || !this.grid?.id || !this.submissionId || this.submissionId <= 0) {
      return of(void 0);
    }

    const uploads = pendingEntries.map(([cellKey, file]) => {
      const [rowIndexText, columnIdText] = cellKey.split('_');
      const rowIndex = Number(rowIndexText);
      const columnId = Number(columnIdText);

      return this.formSubmissionAttachmentsService
        .uploadGridFile(file, this.submissionId, this.grid!.id!, columnId, rowIndex)
        .pipe(
          map((attachment: FormSubmissionAttachmentDto) => {
            const fileValue: GridFileCellValue = {
              attachmentId: attachment.id,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              contentType: attachment.contentType,
              downloadUrl: this.getAttachmentDownloadUrl(attachment.id)
            };
            this.setCellValue(rowIndex, columnId, JSON.stringify(fileValue));
            delete this.pendingGridFiles[cellKey];
          })
        );
    });

    return forkJoin(uploads).pipe(map(() => void 0));
  }

  /**
   * Add new row
   */
  addRow(): void {
    console.log('[GridView] ===== addRow() called =====');
    console.log('[GridView] Current state:', {
      isReadOnly: this.isReadOnly,
      grid: this.grid?.gridName,
      gridId: this.grid?.id,
      submissionId: this.submissionId,
      currentRowsCount: this.rows.length,
      maxRows: this.grid?.maxRows
    });

    // Check if grid is read-only
    if (this.isReadOnly) {
      console.warn('[GridView] Cannot add row: Grid is read-only');
      this.error = 'Grid is read-only. Cannot add rows.';
      return;
    }

    // Allow adding rows even if submissionId is 0 or not set yet
    // submissionId will be updated later when draft is created/saved
    // This matches the behavior in public form where rows can be added before submissionId is available

    // Check maximum rows constraint
    if (this.grid?.maxRows && this.rows.length >= this.grid.maxRows) {
      console.warn('[GridView] Cannot add row: Maximum rows reached', this.grid.maxRows);
      this.error = `Maximum ${this.grid.maxRows} rows allowed. Cannot add more rows.`;
      return;
    }

    // Check if grid is loaded
    if (!this.grid || !this.grid.id) {
      console.warn('[GridView] Cannot add row: Grid not loaded yet');
      this.error = 'Grid is not loaded yet. Please wait...';
      return;
    }

    const maxIndex = this.rows.length > 0
      ? Math.max(...this.rows.map(r => r.rowIndex || 0))
      : -1;
    const newIndex = maxIndex + 1;

    const newRow: FormSubmissionGridRowDto = {
      id: 0, // New row, will be assigned by backend
      submissionId: this.submissionId || 0, // Use current submissionId or 0 if not set yet (will be updated later)
      gridId: this.grid?.id || 0,
      rowIndex: newIndex,
      isActive: true,
      isDeleted: false,
      cells: []
    };

    console.log('[GridView] Creating new row:', {
      rowIndex: newIndex,
      submissionId: newRow.submissionId,
      gridId: newRow.gridId,
      note: newRow.submissionId === 0 ? 'submissionId will be updated when draft is saved' : 'submissionId is available'
    });

    this.rows.push(newRow);
    this.gridData[newIndex] = {};

    // Initialize with default values
    this.columns.forEach((col) => {
      this.gridData[newIndex][col.id] = this.getColumnDefaultValue(col);
    });

    // Clear error if successful
    this.error = '';
    
    console.log('[GridView] ✅ Row added successfully. Total rows:', this.rows.length);
    console.log('[GridView] Rows array:', this.rows.map(r => ({ rowIndex: r.rowIndex, submissionId: r.submissionId })));
    
    // Trigger change detection
    this.cdr.detectChanges();
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

        const cellValue = this.getCellValue(row.rowIndex, col.id);
        if (col.isVisible !== false && cellValue && cellValue.trim() !== '') {
          const typeError = this.validateCellValueType(col, cellValue);
          if (typeError) {
            errors.push({
              field: col.columnCode,
              message: typeError,
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
            const value = this.getCellValue(row.rowIndex, col.id);
            const cellData: BulkGridCellDto = this.buildCellData(col, value);
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

  private validateCellValueType(column: FormGridColumnDto, value: string): string | null {
    const inputType = this.getInputType(column);
    const label = this.getColumnLabel(column);

    switch (inputType) {
      case 'number':
        return this.parseNumberValue(value) === undefined ? `${label} must be a valid number` : null;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : `${label} must be a valid email`;
      case 'date':
        return /^\d{4}-\d{2}-\d{2}$/.test(value) && !!this.toDateOrNull(value) ? null : `${label} must be a valid date`;
      case 'datetime-local':
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !!this.toDateOrNull(value) ? null : `${label} must be a valid date and time`;
      case 'time':
        return /^\d{2}:\d{2}$/.test(value) ? null : `${label} must be a valid time`;
      case 'tel':
        return /^[0-9+\-()\s]{6,}$/.test(value) ? null : `${label} must be a valid phone number`;
      case 'url':
        return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/.test(value) ? null : `${label} must be a valid URL`;
      case 'boolean':
        return ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase()) ? null : `${label} must be true or false`;
      default:
        return null;
    }
  }

  /**
   * Save grid data (with validation)
   */
  saveGridData(): Observable<ApiResponse<FormSubmissionGridRowDto[]>> {
    console.log('[GridView] ===== saveGridData called =====');
    console.log('[GridView] Grid:', this.grid?.gridName, 'ID:', this.grid?.id);
    console.log('[GridView] SubmissionId:', this.submissionId);
    console.log('[GridView] Rows count:', this.rows?.length);
    console.log('[GridView] Columns count:', this.columns?.length);
    
    if (!this.grid || !this.grid.id || !this.submissionId || this.submissionId <= 0) {
      this.error = 'Cannot save: Missing grid or submission ID';
      console.error('[GridView] ❌ Cannot save:', this.error, {
        grid: this.grid,
        gridId: this.grid?.id,
        submissionId: this.submissionId
      });
      return of({ statusCode: 400, message: this.error, data: [] });
    }

    this.saving = true;
    this.error = '';
    this.validationErrors = {};

    // Prepare bulk save data
    // Filter out rows that are marked as deleted or inactive (if needed)
    // But for now, save all rows to allow resubmission
    const rowsToSave = this.rows.filter(row => row.isActive !== false);
    console.log('[GridView] Total rows:', this.rows.length, 'Active rows to save:', rowsToSave.length);
    console.log('[GridView] Rows details:', this.rows.map(r => ({ 
      rowIndex: r.rowIndex, 
      isActive: r.isActive, 
      id: r.id 
    })));
    
    const bulkData: BulkSaveGridDataDto = {
      submissionId: this.submissionId,
      gridId: this.grid.id,
      rows: rowsToSave.map((row) => {
        const rowData: BulkGridRowDto = {
          rowIndex: row.rowIndex,
          isActive: row.isActive !== false, // Ensure isActive is true
          cells: this.columns.map((col) => {
            const value = this.getCellValue(row.rowIndex, col.id);
            const cellData: BulkGridCellDto = this.buildCellData(col, value);
            return cellData;
          })
        };
        console.log(`[GridView] Prepared row ${row.rowIndex} with ${rowData.cells.length} cells`);
        return rowData;
      })
    };
    
    console.log('[GridView] Bulk data to save - Rows count:', bulkData.rows.length);
    console.log('[GridView] Bulk data to save:', JSON.stringify(bulkData, null, 2));

    // First validate, then save
    console.log('[GridView] Starting validation before save...');
    console.log('[GridView] About to validate', bulkData.rows.length, 'rows');
    return this.uploadPendingGridFiles().pipe(
      switchMap(() => this.validateGridData()),
      switchMap((validationResult) => {
        console.log('[GridView] Validation result:', {
          isValid: validationResult.isValid,
          errorsCount: validationResult.errors?.length || 0,
          warningsCount: validationResult.warnings?.length || 0
        });
        
        if (validationResult.errors && validationResult.errors.length > 0) {
          console.log('[GridView] Validation errors:', validationResult.errors);
          // Log which rows have errors
          const rowsWithErrors = [...new Set(validationResult.errors.map(e => e.rowIndex).filter(idx => idx !== undefined))];
          console.log('[GridView] Rows with validation errors:', rowsWithErrors);
          console.log('[GridView] Total rows to save:', bulkData.rows.length);
          console.log('[GridView] Rows that will be saved (if validation passes):', bulkData.rows.map(r => r.rowIndex));
        }
        
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
          console.error('[GridView] ❌ Validation failed, NOT saving data');
          return of({ statusCode: 400, message: this.error, data: [] });
        }
        
        console.log('[GridView] ✅ Validation passed, proceeding to save', bulkData.rows.length, 'rows');

        // If validation passes, save the data
        console.log('[GridView] Calling bulkSaveGridData with', bulkData.rows.length, 'rows');
        return this.gridService.bulkSaveGridData(bulkData).pipe(
          map((response: ApiResponse<FormSubmissionGridRowDto[]>) => {
            console.log('[GridView] ✅ Save response received');
            console.log('[GridView] Response statusCode:', response.statusCode);
            console.log('[GridView] Response message:', response.message);
            console.log('[GridView] Response data (saved rows) count:', response.data?.length || 0);
            
            if (response.data) {
              console.log('[GridView] Saved rows details:', response.data.map(r => ({
                id: r.id,
                rowIndex: r.rowIndex,
                isActive: r.isActive,
                submissionId: r.submissionId,
                gridId: r.gridId
              })));
              
              // Check if all rows were saved
              if (response.data.length < bulkData.rows.length) {
                console.warn(`[GridView] ⚠️ WARNING: Sent ${bulkData.rows.length} rows but only ${response.data.length} were saved!`);
                console.warn('[GridView] Sent row indices:', bulkData.rows.map(r => r.rowIndex));
                console.warn('[GridView] Saved row indices:', response.data.map(r => r.rowIndex));
              }
              
              this.rows = response.data;
              this.saving = false;
              this.validationErrors = {};
            } else {
              console.error('[GridView] ❌ No data in response!');
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
    const normalizedType = this.getNormalizedColumnInputType(column);
    if (normalizedType) {
      return normalizedType;
    }

    // 1) Check dataType for primary type
    const dataType = (column.dataType || '').toLowerCase();
    
    // Explicit select data type → dropdown
    if (dataType === 'select') return 'select';

    // 2) Fallbacks for special types based on dataType
    
    // Email type
    if (dataType.includes('email')) return 'email';
    
    // Password type
    if (dataType.includes('password') || dataType.includes('pass')) return 'password';
    
    // Number types: num, number, numeric, int, integer, float, decimal, double
    if (dataType.includes('num') || dataType.includes('int') || dataType.includes('float') || 
        dataType.includes('decimal') || dataType.includes('double')) {
      return 'number';
    }
    
    // DateTime type
    if (dataType.includes('datetime')) return 'datetime-local';

    // Date types
    if (dataType.includes('date')) return 'date';
    
    // Time type
    if (dataType.includes('time') && !dataType.includes('datetime')) return 'time';
    
    // URL type
    if (dataType.includes('url') || dataType.includes('link')) return 'url';
    
    // Phone/Tel type
    if (dataType.includes('phone') || dataType.includes('tel') || dataType.includes('mobile')) return 'tel';
    
    // Color type
    if (dataType.includes('color')) return 'color';

    // 3) If column.fieldType is an options type (e.g. Combobox/MultiSelect configured as options column)
    // treat it as select even if dataType is generic
    if (column.fieldType?.hasOptions === true) {
      return 'select';
    }
    
    return 'text';
  }

  private getNormalizedColumnInputType(column: FormGridColumnDto): string {
    const dataType = [
      column.dataType,
      (column as any).data_type,
      (column as any).columnDataType,
      (column as any).column_data_type
    ].filter(Boolean).join(' ').toLowerCase().trim();
    const typeName = [
      column.fieldType?.typeName,
      (column as any).fieldTypeName,
      (column as any).type,
      (column as any).typeName,
      (column as any).field_type_name
    ].filter(Boolean).join(' ').toLowerCase().trim();
    const fieldTypeDataType = [
      column.fieldType?.dataType,
      (column.fieldType as any)?.data_type,
      (column as any).fieldTypeDataType,
      (column as any).field_type_data_type
    ].filter(Boolean).join(' ').toLowerCase().trim();
    const combined = `${typeName} ${fieldTypeDataType} ${dataType}`;
    const dateLikeColumnName = /\b(deadline|due date|expiry|expiration|valid until|start date|end date)\b/i
      .test(`${column.columnName || ''} ${column.columnCode || ''}`.replace(/[_-]+/g, ' '));

    if (combined.includes('textarea') || combined.includes('text area')) return 'textarea';
    if (column.fieldTypeId === 7) return 'date';
    if (column.fieldTypeId === 8) return 'datetime-local';
    if ((typeName === 'date' || typeName === 'datepicker' || typeName === 'date picker' ||
        (typeName.includes('date') && !typeName.includes('datetime') && !typeName.includes('date time')))) return 'date';
    if (typeName.includes('datetime') || typeName.includes('date time') ||
        (!typeName && (dataType.includes('datetime') || fieldTypeDataType.includes('datetime')))) return 'datetime-local';
    if (typeName === 'time' || fieldTypeDataType === 'timespan' || (combined.includes('time') && !combined.includes('datetime'))) return 'time';
    if (dateLikeColumnName) return 'date';
    if (combined.includes('date')) return 'date';
    if (combined.includes('integer') || combined.includes('int') || combined.includes('number') ||
        combined.includes('num') || combined.includes('float') || combined.includes('decimal') || combined.includes('double')) return 'number';
    if (combined.includes('email')) return 'email';
    if (combined.includes('password') || combined.includes('pass')) return 'password';
    if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile')) return 'tel';
    if (combined.includes('url') || combined.includes('link')) return 'url';
    if (combined.includes('boolean') || combined.includes('bool') || combined.includes('switch') || combined.includes('toggle')) return 'boolean';
    if (combined.includes('checkbox') || combined.includes('multi')) return 'checkbox';
    if (combined.includes('radio')) return 'radio';
    if (combined.includes('dropdown') || combined.includes('select') || combined.includes('combo') || column.fieldType?.hasOptions === true) return 'select';
    if (combined.includes('file') || combined.includes('attachment') || combined.includes('image')) return 'file';
    if (combined.includes('calculated')) return 'calculated';
    if (combined.includes('color')) return 'color';

    return '';
  }

  isTruthyValue(value: string | undefined | null): boolean {
    const normalized = String(value ?? '').toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }

  isCheckboxOptionSelected(rowIndex: number, columnId: number, optionValue: string): boolean {
    return this.getCellValue(rowIndex, columnId)
      .split(',')
      .map(value => value.trim())
      .filter(value => value !== '')
      .includes(optionValue);
  }

  toggleCheckboxOption(rowIndex: number, columnId: number, optionValue: string, checked: boolean): void {
    const values = this.getCellValue(rowIndex, columnId)
      .split(',')
      .map(value => value.trim())
      .filter(value => value !== '');
    const nextValues = checked
      ? Array.from(new Set([...values, optionValue]))
      : values.filter(value => value !== optionValue);

    this.setCellValue(rowIndex, columnId, nextValues.join(','));
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
   * Check if column options are loading
   */
  isLoadingColumnOptions(column: FormGridColumnDto): boolean {
    return column.id ? (this.loadingColumnOptions[column.id] || false) : false;
  }

  /**
   * Get error message for column options
   */
  getColumnOptionsError(column: FormGridColumnDto): string {
    return column.id ? (this.columnOptionsErrors[column.id] || '') : '';
  }

  /**
   * Check if column has options error
   */
  hasColumnOptionsError(column: FormGridColumnDto): boolean {
    return !!this.getColumnOptionsError(column);
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
    const hasData = this.rows.length > 0;
    console.log('[GridView] hasGridData called:', hasData, 'rows count:', this.rows.length);
    return hasData;
  }

  /**
   * Build cell data with correct value fields based on column type
   */
  private buildCellData(col: FormGridColumnDto, value: string): BulkGridCellDto {
    const dataType = (col.dataType || '').toLowerCase();
    const inputType = this.getInputType(col);
    const fileValue = inputType === 'file' ? this.parseGridFileCellValue(value) : null;
    const cellData: BulkGridCellDto = {
      columnId: col.id,
      columnCode: col.columnCode || `col_${col.id}`,
      cellValue: fileValue ? fileValue.fileName : value,
      valueString: fileValue ? fileValue.fileName : (value || '')
    };

    // Set numeric value if applicable (num, number, numeric, int, float, decimal, double)
    if (inputType === 'number' || dataType.includes('num') || dataType.includes('int') || dataType.includes('float') || 
        dataType.includes('decimal') || dataType.includes('double')) {
      const numValue = this.parseNumberValue(value);
      if (numValue !== undefined) {
        cellData.valueNumber = numValue;
      }
    }

    // Set boolean value if applicable
    if (inputType === 'boolean' || (inputType === 'checkbox' && !value.includes(','))) {
      cellData.valueBool = this.isTruthyValue(value);
    }

    // Set date value if applicable
    if (inputType === 'date' || inputType === 'datetime-local') {
      if (value) {
        cellData.valueDate = value;
      }
    }

    // Set JSON value
    if (fileValue) {
      cellData.valueJson = JSON.stringify(fileValue);
    } else if (value) {
      try {
        cellData.valueJson = JSON.stringify(value);
      } catch {
        cellData.valueJson = value;
      }
    }

    return cellData;
  }

  /**
   * Parse a string value to number, returns undefined if not valid
   */
  private parseNumberValue(value: string): number | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
    return undefined;
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

        const cellValue = this.getCellValue(row.rowIndex, col.id);
        if (cellValue && cellValue.trim() !== '' && this.validateCellValueType(col, cellValue)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if grid has required columns
   */
  hasRequiredColumns(): boolean {
    return this.columns.some(col => col.isRequired === true);
  }

  /**
   * Check if grid requires minimum rows
   */
  requiresMinRows(): boolean {
    return !!(this.grid?.minRows && this.grid.minRows > 0);
  }

  /**
   * Get minimum rows required
   */
  getMinRows(): number {
    return this.grid?.minRows || 0;
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

