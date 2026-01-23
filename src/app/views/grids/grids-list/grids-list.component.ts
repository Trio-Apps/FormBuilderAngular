import { Component, OnInit, OnDestroy } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormGridDto, CreateFormGridDto, UpdateFormGridDto } from '../../FormBuilder/form-builder/models/grid-dto.model';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-grids-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    TableShellComponent
  ],
  templateUrl: './grids-list.component.html',
  styleUrls: ['./grids-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class GridsListComponent implements OnInit, OnDestroy {
  tabId!: number;
  formBuilderId!: number;
  tabName: string = '';
  grids: FormGridDto[] = [];
  loading = false;
  private routeSubscription?: Subscription;
  searchTerm = '';
  private deletedGridIds: Set<number> = new Set(); // Track deleted grid IDs to filter them out
  
  // Grid Modal
  showGridModal = false;
  gridName = '';
  foreignGridName = ''; // Arabic grid name
  gridCode = '';
  gridOrder = 1;
  minRows?: number;
  maxRows?: number;
  editingGrid: FormGridDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gridService: GridService,
    private tabsService: TabsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.params.subscribe(params => {
      const newTabId = +params['tabId'];
      if (newTabId && newTabId !== this.tabId) {
        this.tabId = newTabId;
        this.loadTabAndFormId();
      } else if (newTabId && !this.tabId) {
        this.tabId = newTabId;
        this.loadTabAndFormId();
      }
    });
  }

  loadTabAndFormId(): void {
    if (!this.tabId) return;
    
    // Load deleted grid IDs from localStorage when tabId is available
    this.loadDeletedGridIds();
    
    this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
          this.tabName = tab.tabName || '';
          this.loadGrids();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Tab not found'
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tab information'
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  /**
   * Load deleted grid IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedGridIds(): void {
    try {
      const savedIds = localStorage.getItem(`deletedGridIds_${this.tabId}`);
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedGridIds = new Set(idsArray);
        console.log('[GridsList] Loaded deleted grid IDs from localStorage:', Array.from(this.deletedGridIds));
      }
    } catch (error) {
      console.error('[GridsList] Error loading deleted grid IDs from localStorage:', error);
      this.deletedGridIds = new Set();
    }
  }

  /**
   * Save deleted grid IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedGridIds(): void {
    try {
      const idsArray = Array.from(this.deletedGridIds);
      localStorage.setItem(`deletedGridIds_${this.tabId}`, JSON.stringify(idsArray));
      console.log('[GridsList] Saved deleted grid IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[GridsList] Error saving deleted grid IDs to localStorage:', error);
    }
  }

  loadGrids(): void {
    if (!this.tabId || isNaN(this.tabId)) {
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid tab ID'
      });
      return;
    }

    this.loading = true;
    this.gridService.getGridsByTabId(this.tabId).subscribe({
      next: (response) => {
        // Handle response structure
        let gridsData: FormGridDto[] = [];
        if (Array.isArray(response)) {
          gridsData = response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          gridsData = response.data || [];
        }
        
        let allGrids = Array.isArray(gridsData) ? gridsData.filter(grid => 
          grid.tabId === this.tabId
        ) : [];

        // Reload deleted grid IDs when tabId changes
        this.loadDeletedGridIds();

        // Filter out deleted grids before processing
        const activeGrids = allGrids.filter(grid => !this.deletedGridIds.has(grid.id!));

        // Clean up deletedGridIds - remove IDs that are no longer in the API response
        const apiGridIds = new Set(allGrids.map(g => g.id));
        const idsToRemove: number[] = [];
        this.deletedGridIds.forEach(deletedId => {
          const gridInApi = allGrids.find(g => g.id === deletedId);
          if (!gridInApi) {
            // Grid not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (gridInApi.isDeleted === false) {
            // Grid is back in API and not deleted (might have been restored)
            idsToRemove.push(deletedId);
            console.log('[GridsList] Grid was restored, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedGridIds.delete(id));
          this.saveDeletedGridIds();
          console.log('[GridsList] Cleaned up deleted grid IDs:', idsToRemove);
        }

        // Filter out soft-deleted grids (isDeleted = true) - show only non-deleted grids
        const visibleGrids = activeGrids.filter(grid => grid.isDeleted !== true);
        
        this.grids = visibleGrids;
        
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load grids'
        });
      }
    });
  }

  get filteredGrids(): FormGridDto[] {
    if (!this.searchTerm.trim()) {
      return this.grids;
    }
    const term = this.searchTerm.toLowerCase();
    return this.grids.filter(grid =>
      grid.gridName.toLowerCase().includes(term) ||
      (grid.gridCode && grid.gridCode.toLowerCase().includes(term))
    );
  }

  getActiveGridsCount(): number {
    return this.grids.filter(g => !g.isDeleted).length;
  }

  getTotalColumnsCount(): number {
    return this.grids.reduce((sum, g) => sum + (g.columns?.length || 0), 0);
  }

  openGridModal(grid?: FormGridDto): void {
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    if (grid) {
      this.editingGrid = grid;
      this.gridName = grid.gridName;
      this.foreignGridName = grid.foreignGridName || '';
      this.gridCode = grid.gridCode || '';
      this.gridOrder = grid.gridOrder || 1;
      this.minRows = grid.minRows;
      this.maxRows = grid.maxRows;
    } else {
      this.editingGrid = null;
      this.gridName = '';
      this.foreignGridName = '';
      this.gridCode = '';
      this.gridOrder = this.grids.length + 1;
      this.minRows = undefined;
      this.maxRows = undefined;
    }
    this.showGridModal = true;
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  /**
   * Translate a key based on currentInputLanguage
   */
  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  closeGridModal(): void {
    this.showGridModal = false;
    this.editingGrid = null;
    this.gridName = '';
    this.foreignGridName = '';
    this.gridCode = '';
    this.gridOrder = 1;
    this.minRows = undefined;
    this.maxRows = undefined;
  }

  saveGrid(): void {
    if (!this.gridName || !this.gridCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Grid name and code are required'
      });
      return;
    }

    if (!this.tabId || isNaN(this.tabId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Invalid tab ID. Please go back and try again.'
      });
      return;
    }

    if (!this.formBuilderId || isNaN(this.formBuilderId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Invalid form builder ID. Please go back and try again.'
      });
      return;
    }

    this.loading = true;
    
    if (this.editingGrid) {
      const updateDto: UpdateFormGridDto = {
        gridName: this.gridName,
        foreignGridName: this.foreignGridName || undefined,
        gridCode: this.gridCode,
        gridOrder: this.gridOrder,
        isDeleted: false, // Note: isDeleted defaults to false for updated grids (handled by backend)
        minRows: this.minRows,
        maxRows: this.maxRows
      };
      
      this.gridService.updateGrid(this.editingGrid.id, updateDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadGrids();
          this.closeGridModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Grid updated successfully'
          });
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update grid';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    } else {
      const createDto: CreateFormGridDto = {
        formBuilderId: this.formBuilderId,
        tabId: this.tabId,
        gridName: this.gridName,
        foreignGridName: this.foreignGridName || undefined,
        gridCode: this.gridCode.toUpperCase(),
        gridOrder: this.gridOrder,
        isDeleted: false, // Note: isDeleted defaults to false for new grids (handled by backend)
        minRows: this.minRows,
        maxRows: this.maxRows,
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };
      
      this.gridService.createGrid(createDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadGrids();
          this.closeGridModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Grid created successfully'
          });
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.error?.title || error?.message || 'Failed to create grid';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    }
  }

  navigateToGridColumns(gridId: number): void {
    this.router.navigate(['columns', gridId], { relativeTo: this.route });
  }

  deleteGrid(id: number): void {
    const gridToDelete = this.grids.find(g => g.id === id);
    if (!gridToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${gridToDelete.gridName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.loading = true;
        this.gridService.softDelete(id).subscribe({
          next: () => {
            // Add to deleted grids set to filter it out even after refresh/login
            this.deletedGridIds.add(id);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedGridIds();

            // Update grid in array - mark as deleted
            const gridIndex = this.grids.findIndex(g => g.id === id);
            if (gridIndex !== -1) {
              this.grids[gridIndex] = {
                ...this.grids[gridIndex],
                isDeleted: true
              };
              // Remove from visible list (filter out deleted)
              this.grids = this.grids.filter(g => g.id !== id);
            }

            this.loading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Grid deleted successfully',
              life: 5000
            });
          },
          error: (error: any) => {
            this.loading = false;
            console.error('[GridsList] Error deleting grid:', error);
            
            let errorMessage = 'Failed to delete grid';
            if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }

  restoreGrid(grid: FormGridDto): void {
    if (!grid || !grid.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to restore the grid "${grid.gridName}"?`,
      header: 'Confirm Restoration',
      icon: 'pi pi-undo',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.loading = true;
        this.gridService.restore(grid.id!).subscribe({
          next: (restoredGrid) => {
            // Remove from deletedGridIds if it was tracked
            if (this.deletedGridIds.has(grid.id!)) {
              this.deletedGridIds.delete(grid.id!);
              this.saveDeletedGridIds();
              console.log('[GridsList] Removed restored grid from deletedGridIds:', grid.id);
            }
            
            // Reload grids to get the restored grid
            this.loadGrids();
            
            this.loading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Grid restored successfully',
              life: 5000
            });
          },
          error: (error: any) => {
            this.loading = false;
            console.error('[GridsList] Error restoring grid:', error);
            const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to restore grid';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }
}








