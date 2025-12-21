import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormGridDto, CreateFormGridDto, UpdateFormGridDto } from '../../FormBuilder/form-builder/models/grid-dto.model';
import { Subscription } from 'rxjs';
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
  selector: 'app-grids-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
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
  
  // Grid Modal
  showGridModal = false;
  gridName = '';
  foreignGridName = ''; // Arabic grid name
  gridCode = '';
  gridOrder = 1;
  isActive = true;
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
        
        this.grids = Array.isArray(gridsData) ? gridsData.filter(grid => 
          grid.tabId === this.tabId
        ) : [];
        
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
    return this.grids.filter(g => g.isActive).length;
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
      this.isActive = grid.isActive !== false;
    } else {
      this.editingGrid = null;
      this.gridName = '';
      this.foreignGridName = '';
      this.gridCode = '';
      this.gridOrder = this.grids.length + 1;
      this.isActive = true;
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
    this.isActive = true;
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
        isActive: this.isActive
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
        isActive: this.isActive,
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

  navigateToGridRows(gridId: number): void {
    this.router.navigate(['rows', gridId], { relativeTo: this.route });
  }

  deleteGrid(id: number): void {
    const gridToDelete = this.grids.find(g => g.id === id);
    if (!gridToDelete) return;

    this.confirmationService.confirm({
      message: `Delete "${gridToDelete.gridName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.gridService.deleteGrid(id).subscribe({
          next: () => {
            this.loadGrids();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Grid deleted successfully'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete grid'
            });
          }
        });
      }
    });
  }
}

