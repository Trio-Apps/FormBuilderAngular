import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
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
import { Subscription, forkJoin } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

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

  // Row Modal
  showRowModal = false;
  rowForm: FormGroup;
  editingRow: FormSubmissionGridRowDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en';

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
    this.rowForm = this.fb.group({
      rowIndex: [0],
      isActive: [true],
      cells: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.params.subscribe(params => {
      const newTabId = +params['tabId'];
      const newGridId = +params['gridId'];
      
      if (newTabId && newGridId) {
        this.tabId = newTabId;
        this.gridId = newGridId;
        this.loadTabAndFormId();
        this.loadGrid();
        this.loadColumns();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadTabAndFormId(): void {
    if (!this.tabId) return;
    
    this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
        }
      },
      error: () => {
        // Silently fail - formBuilderId is optional
      }
    });
  }

  loadGrid(): void {
    if (!this.gridId) return;
    
    this.loading = true;
    this.gridService.getGridById(this.gridId).subscribe({
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
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load grid'
        });
      }
    });
  }

  loadColumns(): void {
    if (!this.gridId) return;
    
    this.gridService.getActiveColumnsByGrid(this.gridId).subscribe({
      next: (response) => {
        if (response.data) {
          this.columns = (response.data || []).sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0));
        }
        // Load available submissions after columns are loaded
        this.loadAvailableSubmissions();
        // After loading columns, try to load rows if we have a submission ID
        if (this.selectedSubmissionId) {
          this.loadRows();
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load columns'
        });
      }
    });
  }

  /**
   * Load available submissions that have data for this grid
   */
  loadAvailableSubmissions(): void {
    if (!this.gridId) return;

    this.loadingSubmissions = true;
    // Try to get submissions with grid data
    this.gridService.getSubmissionsWithGridData(this.gridId).subscribe({
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
    this.gridService.getRowsBySubmissionAndGrid(this.selectedSubmissionId, this.gridId).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.rows = (response.data || []).sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
          
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
            detail: error?.error?.message || 'Failed to load rows'
          });
        }
      }
    });
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

    // Load cells for all rows with valid IDs
    const cellObservables = rowsWithIds.map(row => 
      this.gridService.getCellsByRow(row.id!)
    );

    forkJoin(cellObservables).subscribe({
      next: (responses) => {
        responses.forEach((response, index) => {
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
        this.gridService.deleteRow(row.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Row deleted successfully'
            });
            this.loadRows();
          },
          error: () => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete row'
            });
          }
        });
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['../grids', this.tabId], { relativeTo: this.route });
  }

  getActiveRowsCount(): number {
    return this.rows.filter(row => row.isActive).length;
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
        summary: 'Warning',
        detail: 'No columns found. Please ensure the grid has columns configured.'
      });
      return;
    }

    this.editingRow = null;
    this.currentInputLanguage = 'en';
    this.cellsFormArray.clear();

    // Add form controls for each column
    this.columns.forEach(column => {
      if (column.id) {
        const cellControl = this.fb.group({
          columnId: [column.id],
          cellValue: [column.defaultValue || '', column.isRequired ? Validators.required : null]
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
      const cellControl = this.fb.group({
        columnId: [column.id],
        cellValue: [cellValue || column.defaultValue || '', column.isRequired ? Validators.required : null]
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
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  saveRow(): void {
    if (this.rowForm.invalid) {
      this.rowForm.markAllAsTouched();
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

    this.loading = true;
    const formValue = this.rowForm.value;

    if (this.editingRow && this.editingRow.id) {
      // Update existing row
      const updateDto: UpdateFormSubmissionGridRowDto = {
        rowIndex: Number(formValue.rowIndex) || 0,
        isActive: formValue.isActive !== false
      };

      this.gridService.updateRow(this.editingRow.id, updateDto).subscribe({
        next: (response) => {
          if (response.statusCode === 200 || response.statusCode === 204) {
            // Update cells
            this.updateCells(this.editingRow!.id!, formValue.cells);
          } else {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to update row'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error updating row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || error?.message || 'Failed to update row'
          });
        }
      });
    } else {
      // Create new row
      const createDto: CreateFormSubmissionGridRowDto = {
        submissionId: this.selectedSubmissionId,
        gridId: this.gridId,
        rowIndex: Number(formValue.rowIndex) || 0,
        isActive: formValue.isActive !== false
      };

      this.gridService.createRow(createDto).subscribe({
        next: (response) => {
          if (response.statusCode === 200 || response.statusCode === 201) {
            const newRowId = response.data?.id;
            if (newRowId) {
              // Create cells
              this.createCells(newRowId, formValue.cells);
            } else {
              this.loading = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Row created but ID not returned. Response: ' + JSON.stringify(response)
              });
            }
          } else {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to create row'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || error?.message || 'Failed to create row'
          });
        }
      });
    }
  }

  private createCells(rowId: number, cells: any[]): void {
    if (!cells || cells.length === 0) {
      // No cells to create, just reload rows
      this.loading = false;
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
      .filter(cell => cell && cell.columnId) // Ensure cell has columnId
      .map(cell => {
        const createCellDto: CreateFormSubmissionGridCellDto = {
          rowId: rowId,
          columnId: cell.columnId,
          cellValue: cell.cellValue || ''
        };
        return this.gridService.createCell(createCellDto);
      });

    if (cellObservables.length === 0) {
      // No valid cells to create
      this.loading = false;
      this.closeRowModal();
      this.loadRows();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Row created successfully (no cells to save)'
      });
      return;
    }

    forkJoin(cellObservables).subscribe({
      next: (responses) => {
        // Check if all cells were created successfully
        const failed = responses.some(r => r.statusCode !== 200 && r.statusCode !== 201);
        if (failed) {
          console.warn('Some cells failed to create:', responses);
        }
        
        this.loading = false;
        this.closeRowModal();
        this.loadRows();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Row created successfully'
        });
      },
      error: (error) => {
        console.error('Error creating cells:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Row created but some cells failed to save. Please edit the row to add cells.'
        });
        this.loadRows();
      }
    });
  }

  private updateCells(rowId: number, cells: any[]): void {
    if (!cells || cells.length === 0) {
      // No cells to update, just reload rows
      this.loading = false;
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
    this.gridService.getCellsByRow(rowId).subscribe({
      next: (response) => {
        const existingCells = response.data || [];
        
        // Update or create cells
        const cellObservables: any[] = [];
        
        cells
          .filter(cell => cell && cell.columnId) // Ensure cell has columnId
          .forEach(cell => {
            const existingCell = existingCells.find(ec => ec.columnId === cell.columnId);
            
            if (existingCell && existingCell.id) {
              // Update existing cell
              cellObservables.push(
                this.gridService.updateCell(existingCell.id, {
                  cellValue: cell.cellValue || ''
                })
              );
            } else {
              // Create new cell
              const createCellDto: CreateFormSubmissionGridCellDto = {
                rowId: rowId,
                columnId: cell.columnId,
                cellValue: cell.cellValue || ''
              };
              cellObservables.push(this.gridService.createCell(createCellDto));
            }
          });

        if (cellObservables.length > 0) {
          forkJoin(cellObservables).subscribe({
            next: (responses) => {
              // Check if all cells were updated/created successfully
              const failed = responses.some(r => r.statusCode !== 200 && r.statusCode !== 201 && r.statusCode !== 204);
              if (failed) {
                console.warn('Some cells failed to update:', responses);
              }
              
              this.loading = false;
              this.closeRowModal();
              this.loadRows();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Row updated successfully'
              });
            },
            error: (error) => {
              console.error('Error updating cells:', error);
              this.loading = false;
              this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Row updated but some cells failed to save'
              });
              this.loadRows();
            }
          });
        } else {
          this.loading = false;
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
          .filter(cell => cell && cell.columnId)
          .map(cell => {
            const createCellDto: CreateFormSubmissionGridCellDto = {
              rowId: rowId,
              columnId: cell.columnId,
              cellValue: cell.cellValue || ''
            };
            return this.gridService.createCell(createCellDto);
          });

        if (cellObservables.length > 0) {
          forkJoin(cellObservables).subscribe({
            next: () => {
              this.loading = false;
              this.closeRowModal();
              this.loadRows();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Row updated successfully'
              });
            },
            error: () => {
              this.loading = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update cells'
              });
            }
          });
        } else {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load existing cells'
          });
        }
      }
    });
  }

  getCellFormControl(index: number): FormGroup {
    return this.cellsFormArray.at(index) as FormGroup;
  }

  getColumnForCell(index: number): FormGridColumnDto {
    return this.columns[index];
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
}

