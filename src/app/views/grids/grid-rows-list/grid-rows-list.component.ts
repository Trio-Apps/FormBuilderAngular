import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  FormGridDto,
  FormGridColumnDto,
  FormSubmissionGridRowDto,
  FormSubmissionGridCellDto,
  CreateFormSubmissionGridRowDto,
  CreateFormSubmissionGridCellDto,
  UpdateFormSubmissionGridRowDto,
  UpdateFormSubmissionGridCellDto
} from '../../FormBuilder/form-builder/models/grid-dto.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslationService } from '../../../core/services/translation.service';
import { GridRulesUtils, RowValidationResult } from '../../FormBuilder/utils/grid-rules.utils';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

// Interface for form controls
interface CellFormGroup {
  columnId: FormControl<number | null>;
  cellValue: FormControl<string | null>;
}

interface RowFormType {
  rowIndex: FormControl<number | null>;
  isActive: FormControl<boolean | null>;
  cells: FormArray<FormGroup<CellFormGroup>>;
}

@Component({
  selector: 'app-grid-rows-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './grid-rows-list.component.html',
  styleUrls: ['./grid-rows-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class GridRowsListComponent implements OnInit, OnDestroy {
  tabId!: number;
  gridId!: number;
  formBuilderId!: number;
  grid: FormGridDto | null = null;
  columns: FormGridColumnDto[] = [];
  rows: FormSubmissionGridRowDto[] = [];
  loading = false;
  private routeSubscription?: Subscription;
  searchTerm = '';
  selectedSubmissionId: number | null = null;
  submissions: { id: number; displayText: string }[] = []; // List of available submissions
  loadingSubmissions = false;
  private deletedRowIds: Set<number> = new Set(); // Track deleted row IDs to filter them out

  // Row Modal
  showRowModal = false;
  rowForm: FormGroup<RowFormType>;
  editingRow: FormSubmissionGridRowDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en';
  savingRow = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gridService: GridService,
    private tabsService: TabsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService,
    private fb: FormBuilder
  ) {
    this.rowForm = this.fb.group<RowFormType>({
      rowIndex: this.fb.control(0),
      isActive: this.fb.control(true),
      cells: this.fb.array<FormGroup<CellFormGroup>>([])
    });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.params.subscribe(params => {
      const newTabId = +params['tabId'];
      const newGridId = +params['gridId'];
      
      if (newTabId && newGridId) {
        this.tabId = newTabId;
        this.gridId = newGridId;
        // Load deleted row IDs from localStorage when gridId is available
        this.loadDeletedRowIds();
        this.loadTabAndFormId();
        this.loadGrid();
        this.loadColumns();
      }
    });
    
    if (this.routeSubscription) {
      this.subscriptions.push(this.routeSubscription);
    }
  }

  ngOnDestroy(): void {
    // Cleanup all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Load deleted row IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedRowIds(): void {
    try {
      const savedIds = localStorage.getItem(`deletedRowIds_${this.gridId}`);
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedRowIds = new Set(idsArray);
        console.log('[GridRowsList] Loaded deleted row IDs from localStorage:', Array.from(this.deletedRowIds));
      }
    } catch (error) {
      console.error('[GridRowsList] Error loading deleted row IDs from localStorage:', error);
      this.deletedRowIds = new Set();
    }
  }

  /**
   * Save deleted row IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedRowIds(): void {
    try {
      const idsArray = Array.from(this.deletedRowIds);
      localStorage.setItem(`deletedRowIds_${this.gridId}`, JSON.stringify(idsArray));
      console.log('[GridRowsList] Saved deleted row IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[GridRowsList] Error saving deleted row IDs to localStorage:', error);
    }
  }

  loadTabAndFormId(): void {
    if (!this.tabId) return;
    
    const subscription = this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
        }
      },
      error: () => {
        // Silently fail - formBuilderId is optional
      }
    });
    
    this.subscriptions.push(subscription);
  }

  loadGrid(): void {
    if (!this.gridId) return;
    
    this.loading = true;
    const subscription = this.gridService.getGridById(this.gridId).subscribe({
      next: (response) => {
        if (response.data) {
          this.grid = response.data;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Grid not found'
          });
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error, 'Failed to load grid')
        });
      }
    });
    
    this.subscriptions.push(subscription);
  }

  loadColumns(): void {
    if (!this.gridId) {
      console.warn('[GridRowsList] Cannot load columns: gridId is missing');
      return;
    }
    
    const subscription = this.gridService.getActiveColumnsByGrid(this.gridId).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.columns = (response.data || []).sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
          
          if (this.columns.length === 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Columns Found',
              detail: 'This grid has no columns configured. Please add columns to the grid first.',
              life: 5000
            });
          } else {
            console.log(`[GridRowsList] Loaded ${this.columns.length} columns for grid ${this.gridId}`);
          }
        } else {
          this.columns = [];
          this.messageService.add({
            severity: 'warn',
            summary: 'No Columns Found',
            detail: 'This grid has no columns configured. Please add columns to the grid first.',
            life: 5000
          });
        }
        
        // Load available submissions after columns are loaded
        this.loadAvailableSubmissions();
        // After loading columns, try to load rows if we have a submission ID
        if (this.selectedSubmissionId) {
          this.loadRows();
        }
      },
      error: (error) => {
        console.error('[GridRowsList] Error loading columns:', error);
        this.columns = [];
        const errorMessage = this.getErrorMessage(error, 'Failed to load columns');
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error Loading Columns',
          detail: errorMessage,
          life: 5000
        });
      }
    });
    
    this.subscriptions.push(subscription);
  }

  /**
   * Load available submissions that have data for this grid
   */
  loadAvailableSubmissions(): void {
    if (!this.gridId) return;

    this.loadingSubmissions = true;
    // Try to get submissions with grid data
    const subscription = this.gridService.getSubmissionsWithGridData(this.gridId).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          // Sort submissions by ID (descending - newest first)
          const sortedIds = response.data.sort((a, b) => b - a);
          this.submissions = sortedIds.map(id => ({
            id: id,
            displayText: `${this.translateLabel('grids.rows.submission') || 'Submission'} #${id}`
          }));
          this.loadingSubmissions = false;
        } else {
          // If no submissions found via API, extract from existing rows
          this.extractSubmissionsFromRows();
        }
      },
      error: () => {
        // If endpoint doesn't exist, extract from existing rows
        this.extractSubmissionsFromRows();
      }
    });
    
    this.subscriptions.push(subscription);
  }

  /**
   * Extract unique submission IDs from existing rows
   * This is a fallback method if API endpoint is not available
   */
  private extractSubmissionsFromRows(): void {
    // Get unique submission IDs from rows we already have
    const uniqueSubmissionIds = new Set<number>();
    
    // If we have rows loaded, extract submission IDs from them
    if (this.rows && this.rows.length > 0) {
      this.rows.forEach(row => {
        // Try to get submissionId from row if available
        // Note: This depends on the DTO structure
        if ((row as any).submissionId) {
          uniqueSubmissionIds.add((row as any).submissionId);
        }
      });
    }

    if (uniqueSubmissionIds.size > 0) {
      // Sort submissions by ID (descending - newest first)
      const sortedIds = Array.from(uniqueSubmissionIds).sort((a, b) => b - a);
      this.submissions = sortedIds.map(id => ({
        id: id,
        displayText: `${this.translateLabel('grids.rows.submission') || 'Submission'} #${id}`
      }));
    } else {
      // If no submissions found, keep manual input option
      this.submissions = [];
    }
    
    this.loadingSubmissions = false;
  }

  loadRows(): void {
    if (!this.gridId || !this.selectedSubmissionId) {
      this.rows = [];
      this.loading = false;
      return;
    }
    
    this.loading = true;
    const subscription = this.gridService.getRowsBySubmissionAndGrid(this.selectedSubmissionId, this.gridId).subscribe({
      next: (response) => {
        if (response && response.data) {
          const allRows = response.data || [];
          
          // Reload deleted row IDs when gridId or submissionId changes
          this.loadDeletedRowIds();

          // Filter out deleted rows before processing
          const activeRows = allRows.filter(row => !this.deletedRowIds.has(row.id!));

          // Clean up deletedRowIds - remove IDs that are no longer in the API response
          const apiRowIds = new Set(allRows.map(r => r.id));
          const idsToRemove: number[] = [];
          this.deletedRowIds.forEach(deletedId => {
            const rowInApi = allRows.find(r => r.id === deletedId);
            if (!rowInApi) {
              // Row not in API response - it was hard deleted from server, remove from tracking
              idsToRemove.push(deletedId);
            } else if (rowInApi.isActive !== false) {
              // Row is back in API and active again (might have been reactivated)
              idsToRemove.push(deletedId);
              console.log('[GridRowsList] Row was reactivated, removing from deleted tracking:', deletedId);
            }
          });
          if (idsToRemove.length > 0) {
            idsToRemove.forEach(id => this.deletedRowIds.delete(id));
            this.saveDeletedRowIds();
            console.log('[GridRowsList] Cleaned up deleted row IDs:', idsToRemove);
          }

          // Filter out inactive rows (soft deleted) from display
          const visibleRows = activeRows.filter(row => row.isActive !== false);
          
          this.rows = visibleRows.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
          
          // Load cells for each row if not already loaded
          if (this.rows.length > 0 && (!this.rows[0].cells || this.rows[0].cells.length === 0)) {
            this.loadCellsForRows();
          } else {
            this.loading = false;
          }
        } else {
          this.rows = [];
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading rows:', error);
        this.rows = [];
        this.loading = false;
        
        // Only show error if it's not a 404 (no rows found is OK)
        if (error?.status !== 404) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error, 'Failed to load rows')
          });
        }
      }
    });
    
    this.subscriptions.push(subscription);
  }

  loadCellsForRows(): void {
    if (!this.gridId || !this.selectedSubmissionId || this.rows.length === 0) {
      this.loading = false;
      return;
    }

    // Filter rows that have valid IDs
    const rowsWithIds = this.rows.filter(row => row.id && row.id > 0);
    
    if (rowsWithIds.length === 0) {
      this.loading = false;
      return;
    }

    // Use a single API call if available, otherwise use forkJoin
    if ((this.gridService as any).getCellsByRowIds) {
      // Use bulk API if available
      const rowIds = rowsWithIds.map(row => row.id!);
      const subscription = (this.gridService as any).getCellsByRowIds(rowIds).subscribe({
        next: (response: any) => {
          this.processCellsResponse(response);
          this.loading = false;
        },
        error: () => this.loading = false
      });
      
      this.subscriptions.push(subscription);
    } else {
      // Fallback to individual calls
      const cellObservables = rowsWithIds.map(row => 
        this.gridService.getCellsByRow(row.id!).pipe(
          catchError(() => of({ data: [] })) // Handle individual failures gracefully
        )
      );

      const subscription = forkJoin(cellObservables).subscribe({
        next: (responses) => {
          responses.forEach((response: any, index) => {
            if (response && response.data && rowsWithIds[index]) {
              const rowIndex = this.rows.findIndex(r => r.id === rowsWithIds[index].id);
              if (rowIndex >= 0) {
                this.rows[rowIndex].cells = response.data || [];
              }
            }
          });
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading cells for rows:', error);
          this.loading = false;
          // Continue even if cells fail to load - rows are still displayed
        }
      });
      
      this.subscriptions.push(subscription);
    }
  }

  private processCellsResponse(response: any): void {
    // Implement this method if you have a bulk cells API
    // This would process the response and assign cells to rows
    if (response?.data) {
      // Assuming response.data is an array of cells grouped by rowId
      // You'll need to implement the actual logic based on your API response
      Object.keys(response.data).forEach(rowId => {
        const rowIndex = this.rows.findIndex(r => r.id === +rowId);
        if (rowIndex >= 0) {
          this.rows[rowIndex].cells = response.data[rowId];
        }
      });
    }
  }

  getCellValue(row: FormSubmissionGridRowDto, columnId: number): string {
    if (!row.cells || row.cells.length === 0) return '';
    const cell = row.cells.find(c => c.columnId === columnId);
    return cell?.cellValue || '';
  }

  getColumnLabel(column: FormGridColumnDto): string {
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && column.foreignColumnName) {
      return column.foreignColumnName;
    }
    return column.columnName || column.columnCode || '';
  }

  get filteredRows(): FormSubmissionGridRowDto[] {
    if (!this.searchTerm) {
      return this.rows;
    }
    const term = this.searchTerm.toLowerCase();
    return this.rows.filter(row => {
      // Search in cell values
      if (row.cells) {
        return row.cells.some(cell => 
          cell.cellValue?.toLowerCase().includes(term)
        );
      }
      return false;
    });
  }

  onSubmissionChange(): void {
    this.loadRows();
  }

  deleteRow(row: FormSubmissionGridRowDto): void {
    if (!row.id) return;
    
    this.confirmationService.confirm({
      message: this.translationService.translate('grids.rows.confirmDelete') || 'Are you sure you want to delete this row?',
      header: this.translationService.translate('common.confirm') || 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        const subscription = this.gridService.deleteRow(row.id!).subscribe({
          next: () => {
            // Add to deleted rows set to filter it out even after refresh/login
            this.deletedRowIds.add(row.id!);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedRowIds();

            // Remove row from the list immediately
            const rowIndex = this.rows.findIndex(r => r.id === row.id);
            if (rowIndex !== -1) {
              this.rows.splice(rowIndex, 1);
            }

            this.loading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Row deleted successfully',
              life: 5000
            });
          },
          error: (error) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error, 'Failed to delete row')
            });
          }
        });
        
        this.subscriptions.push(subscription);
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['../grids', this.tabId], { relativeTo: this.route });
  }

  navigateToColumns(): void {
    if (this.gridId) {
      this.router.navigate(['columns', this.gridId], { relativeTo: this.route });
    }
  }

  getActiveRowsCount(): number {
    return this.rows.filter(row => row.isActive).length;
  }

  getVisibleColumnsCount(): number {
    return GridRulesUtils.getVisibleColumns(this.columns).length;
  }

  translateLabel(key: string): string {
    return this.translationService.translate(key) || key;
  }

  // ========== CRUD Operations ==========

  get cellsFormArray(): FormArray {
    return this.rowForm.get('cells') as FormArray;
  }

  openAddRowModal(): void {
    if (!this.selectedSubmissionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a submission ID first'
      });
      return;
    }

    if (!this.columns || this.columns.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Columns Configured',
        detail: 'This grid has no columns. Please configure columns for this grid first. You can add columns from the Grid Columns page.',
        life: 6000
      });
      // Navigate to columns page to add columns
      setTimeout(() => {
        this.router.navigate(['columns', this.gridId], { relativeTo: this.route });
      }, 2000);
      return;
    }

    // Check Grid Rules - Max Rows validation
    if (this.grid) {
      const canAddValidation = GridRulesUtils.canAddRow(this.grid, this.rows.length);
      if (!canAddValidation.isValid) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cannot Add Row',
          detail: canAddValidation.message
        });
        return;
      }
    }

    this.editingRow = null;
    this.currentInputLanguage = 'en';
    this.cellsFormArray.clear();

    // Add form controls for each column
    this.columns.forEach(column => {
      if (column.id) {
        const cellControl = this.fb.group<CellFormGroup>({
          columnId: this.fb.control(column.id, Validators.required),
          cellValue: this.fb.control(column.defaultValue || '', column.isRequired ? Validators.required : null)
        });
        this.cellsFormArray.push(cellControl);
      }
    });

    // Calculate next row index - start from 0 if no rows, otherwise max + 1
    const nextRowIndex = this.rows.length > 0 && this.rows.some(r => r.rowIndex !== undefined && r.rowIndex !== null)
      ? Math.max(...this.rows.map(r => r.rowIndex || 0)) + 1
      : 0;

    this.rowForm.patchValue({
      rowIndex: nextRowIndex,
      isActive: true
    });

    this.showRowModal = true;
  }

  openEditRowModal(row: FormSubmissionGridRowDto): void {
    this.editingRow = row;
    this.currentInputLanguage = 'en';
    this.cellsFormArray.clear();

    // Add form controls for each column with existing values
    this.columns.forEach(column => {
      const cellValue = this.getCellValue(row, column.id);
      const cellControl = this.fb.group<CellFormGroup>({
        columnId: this.fb.control(column.id, Validators.required),
        cellValue: this.fb.control(cellValue || column.defaultValue || '', column.isRequired ? Validators.required : null)
      });
      this.cellsFormArray.push(cellControl);
    });

    this.rowForm.patchValue({
      rowIndex: row.rowIndex || 0,
      isActive: row.isActive !== false
    });

    this.showRowModal = true;
  }

  closeRowModal(): void {
    this.showRowModal = false;
    this.editingRow = null;
    this.cellsFormArray.clear();
    this.rowForm.reset({
      rowIndex: 0,
      isActive: true
    });
    this.savingRow = false;
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  saveRow(): void {
    if (this.rowForm.invalid) {
      this.markFormGroupTouched(this.rowForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    if (!this.selectedSubmissionId || !this.gridId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Missing submission ID or grid ID'
      });
      return;
    }

    if (!this.columns || this.columns.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No columns found'
      });
      return;
    }

    this.savingRow = true;
    const formValue = this.rowForm.value;

    // Validate row data against column rules
    const rowData = this.buildRowDataObject(formValue.cells || []);
    const rowValidation = GridRulesUtils.validateRowData(this.columns, rowData);

    if (!rowValidation.isValid) {
      this.savingRow = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Failed',
        detail: rowValidation.errors.map(e => e.message).join(', ')
      });
      return;
    }

    // Show warnings if any
    if (rowValidation.warnings.length > 0) {
      const warningMessages = rowValidation.warnings.map(w => w.message).join(', ');
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Warnings',
        detail: warningMessages
      });
    }

    if (this.editingRow && this.editingRow.id) {
      // Update existing row
      const updateDto: UpdateFormSubmissionGridRowDto = {
        rowIndex: Number(formValue.rowIndex) || 0,
        isActive: formValue.isActive !== false
      };

      const subscription = this.gridService.updateRow(this.editingRow.id, updateDto).subscribe({
        next: (response) => {
          if (response.statusCode === 200 || response.statusCode === 204) {
            // Update cells
            this.updateCells(this.editingRow!.id!, formValue.cells || []);
          } else {
            this.savingRow = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to update row'
            });
          }
        },
        error: (error) => {
          this.savingRow = false;
          console.error('Error updating row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error, 'Failed to update row')
          });
        }
      });
      
      this.subscriptions.push(subscription);
    } else {
      // Create new row
      const createDto: CreateFormSubmissionGridRowDto = {
        submissionId: this.selectedSubmissionId,
        gridId: this.gridId,
        rowIndex: Number(formValue.rowIndex) || 0,
        isActive: formValue.isActive !== false
      };

      const subscription = this.gridService.createRow(createDto).subscribe({
        next: (response) => {
          if (response.statusCode === 200 || response.statusCode === 201) {
            const newRowId = response.data?.id;
            if (newRowId) {
              // Create cells
              this.createCells(newRowId, formValue.cells || []);
            } else {
              this.savingRow = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Row created but ID not returned. Response: ' + JSON.stringify(response)
              });
            }
          } else {
            this.savingRow = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to create row'
            });
          }
        },
        error: (error) => {
          this.savingRow = false;
          console.error('Error creating row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error, 'Failed to create row')
          });
        }
      });
      
      this.subscriptions.push(subscription);
    }
  }

  private createCells(rowId: number, cells: any[]): void {
    if (!cells || cells.length === 0) {
      // No cells to create, just reload rows
      this.savingRow = false;
      this.closeRowModal();
      this.loadRows();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Row created successfully'
      });
      return;
    }

    // Filter out empty cells if needed, or create all cells
    const cellObservables = cells
      .filter((cell: any) => cell && cell.columnId) // Ensure cell has columnId
      .map((cell: any) => {
        const createCellDto: CreateFormSubmissionGridCellDto = {
          rowId: rowId,
          columnId: cell.columnId,
          cellValue: cell.cellValue || ''
        };
        return this.gridService.createCell(createCellDto).pipe(
          catchError(error => {
            console.error('Error creating cell:', error);
            return of({ statusCode: 500, message: 'Failed to create cell' });
          })
        );
      });

    if (cellObservables.length === 0) {
      // No valid cells to create
      this.savingRow = false;
      this.closeRowModal();
      this.loadRows();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Row created successfully (no cells to save)'
      });
      return;
    }

    const subscription = forkJoin(cellObservables).subscribe({
      next: (responses: any[]) => {
        // Check if all cells were created successfully
        const failed = responses.some((r: any) => r.statusCode !== 200 && r.statusCode !== 201);
        if (failed) {
          console.warn('Some cells failed to create:', responses);
        }

        this.savingRow = false;
        this.closeRowModal();
        this.loadRows();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Row created successfully'
        });
      },
      error: (error: any) => {
        console.error('Error creating cells:', error);
        this.savingRow = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Row created but some cells failed to save. Please edit the row to add cells.'
        });
        this.closeRowModal();
        this.loadRows();
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private updateCells(rowId: number, cells: any[]): void {
    if (!cells || cells.length === 0) {
      // No cells to update, just reload rows
      this.savingRow = false;
      this.closeRowModal();
      this.loadRows();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Row updated successfully'
      });
      return;
    }

    // First, get existing cells
    const subscription = this.gridService.getCellsByRow(rowId).subscribe({
      next: (response: any) => {
        const existingCells = response.data || [];

        // Update or create cells
        const cellObservables: any[] = [];

        cells
          .filter((cell: any) => cell && cell.columnId) // Ensure cell has columnId
          .forEach((cell: any) => {
            const existingCell = existingCells.find((ec: any) => ec.columnId === cell.columnId);

            if (existingCell && existingCell.id) {
              // Update existing cell
              cellObservables.push(
                this.gridService.updateCell(existingCell.id, {
                  cellValue: cell.cellValue || ''
                }).pipe(
                  catchError(error => {
                    console.error('Error updating cell:', error);
                    return of({ statusCode: 500, message: 'Failed to update cell' });
                  })
                )
              );
            } else {
              // Create new cell
              const createCellDto: CreateFormSubmissionGridCellDto = {
                rowId: rowId,
                columnId: cell.columnId,
                cellValue: cell.cellValue || ''
              };
              cellObservables.push(this.gridService.createCell(createCellDto).pipe(
                catchError(error => {
                  console.error('Error creating cell:', error);
                  return of({ statusCode: 500, message: 'Failed to create cell' });
                })
              ));
            }
          });

        if (cellObservables.length > 0) {
          const forkJoinSubscription = forkJoin(cellObservables).subscribe({
            next: (responses: any[]) => {
              // Check if all cells were updated/created successfully
              const failed = responses.some((r: any) => r.statusCode !== 200 && r.statusCode !== 201 && r.statusCode !== 204);
              if (failed) {
                console.warn('Some cells failed to update:', responses);
              }

              this.savingRow = false;
              this.closeRowModal();
              this.loadRows();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Row updated successfully'
              });
            },
            error: (error: any) => {
              console.error('Error updating cells:', error);
              this.savingRow = false;
              this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Row updated but some cells failed to save'
              });
              this.closeRowModal();
              this.loadRows();
            }
          });
          
          this.subscriptions.push(forkJoinSubscription);
        } else {
          this.savingRow = false;
          this.closeRowModal();
          this.loadRows();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Row updated successfully'
          });
        }
      },
      error: (error) => {
        console.error('Error loading existing cells:', error);
        // Try to create all cells as new if we can't load existing ones
        const cellObservables = cells
          .filter((cell: any) => cell && cell.columnId)
          .map((cell: any) => {
            const createCellDto: CreateFormSubmissionGridCellDto = {
              rowId: rowId,
              columnId: cell.columnId,
              cellValue: cell.cellValue || ''
            };
            return this.gridService.createCell(createCellDto).pipe(
              catchError(() => of({ statusCode: 500, message: 'Failed to create cell' }))
            );
          });

        if (cellObservables.length > 0) {
          const forkJoinSubscription = forkJoin(cellObservables).subscribe({
            next: () => {
              this.savingRow = false;
              this.closeRowModal();
              this.loadRows();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Row updated successfully'
              });
            },
            error: () => {
              this.savingRow = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update cells'
              });
            }
          });
          
          this.subscriptions.push(forkJoinSubscription);
        } else {
          this.savingRow = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load existing cells'
          });
        }
      }
    });
    
    this.subscriptions.push(subscription);
  }

  getCellFormControl(index: number): FormGroup<CellFormGroup> {
    return this.cellsFormArray.at(index) as FormGroup<CellFormGroup>;
  }

  getColumnForCell(index: number): FormGridColumnDto {
    return this.columns[index];
  }

  private buildRowDataObject(cells: any[]): any {
    const rowData: any = {};
    cells.forEach((cell: any, index: number) => {
      const column = this.columns && this.columns[index];
      if (column && column.columnCode) {
        rowData[column.columnCode] = cell.cellValue;
      }
    });
    return rowData;
  }

  getInputType(column: FormGridColumnDto): string {
    const dataType = (column.dataType || '').toLowerCase();
    if (dataType.includes('email')) return 'email';
    if (dataType.includes('number') || dataType.includes('numeric')) return 'number';
    if (dataType.includes('date')) return 'date';
    return 'text';
  }

  hasColumnOptions(column: FormGridColumnDto): boolean {
    return !!(column.columnOptions && column.columnOptions.length > 0);
  }

  getColumnOptions(column: FormGridColumnDto): any[] {
    return column.columnOptions || [];
  }

  getOptionText(option: any): string {
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && option.foreignOptionText) {
      return option.foreignOptionText;
    }
    return option.optionText || option.optionValue || '';
  }

  getCellErrorMessage(index: number): string {
    const cellControl = this.getCellFormControl(index);
    const column = this.getColumnForCell(index);
    
    const cellValueControl = cellControl.get('cellValue');
    if (cellValueControl?.hasError('required')) {
      return `${this.getColumnLabel(column)} is required`;
    }
    
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        } else if (control instanceof FormArray) {
          control.controls.forEach(ctrl => {
            if (ctrl instanceof FormGroup) {
              this.markFormGroupTouched(ctrl);
            } else {
              ctrl.markAsTouched();
            }
          });
        }
      }
    });
  }

  private getErrorMessage(error: any, defaultMessage: string): string {
    if (error?.error?.message) return error.error.message;
    if (error?.message) return error.message;
    return defaultMessage;
  }
}