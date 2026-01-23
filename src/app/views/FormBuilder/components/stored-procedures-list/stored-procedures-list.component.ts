import { Component, OnInit } from '@angular/core';
import { TableActionsComponent } from '../../../../shared/table-actions/table-actions.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoredProceduresService } from '../../services/stored-procedures.service';
import { StoredProcedure } from '../../form-builder/models/stored-procedure.model';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { StoredProcedureFormComponent } from '../stored-procedure-form/stored-procedure-form.component';
import { TableShellComponent } from '../../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-stored-procedures-list',
  standalone: true,
  imports: [
    TableActionsComponent,
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
    StoredProcedureFormComponent,
    TableShellComponent
  ],
  templateUrl: './stored-procedures-list.component.html',
  styleUrls: ['./stored-procedures-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class StoredProceduresListComponent implements OnInit {
  storedProcedures: StoredProcedure[] = [];
  filteredProcedures: StoredProcedure[] = [];
  loading = false;
  searchTerm = '';
  
  // Filters
  selectedDatabase = '';
  selectedUsageType = '';
  
  // Available options
  databases: string[] = ['FormBuilder', 'AKHManageIT'];
  usageTypes: string[] = ['Rule', 'Options'];
  
  // Modal
  showModal = false;
  editingSp: StoredProcedure | null = null;

  constructor(
    private spService: StoredProceduresService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadStoredProcedures();
  }

  loadStoredProcedures(): void {
    this.loading = true;
    
    let request = this.spService.getAll();
    
    // Apply filters if selected
    if (this.selectedDatabase) {
      request = this.spService.getByDatabase(this.selectedDatabase);
    } else if (this.selectedUsageType) {
      request = this.spService.getByUsageType(this.selectedUsageType);
    }

    request.subscribe({
      next: (data) => {
        this.storedProcedures = data;
        this.updateFilteredProcedures();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stored procedures:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load stored procedures'
        });
      }
    });
  }

  updateFilteredProcedures(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProcedures = [...this.storedProcedures];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredProcedures = this.storedProcedures.filter(sp =>
        sp.title?.toLowerCase().includes(term) ||
        sp.procedureName?.toLowerCase().includes(term) ||
        sp.databaseName?.toLowerCase().includes(term) ||
        sp.usageType?.toLowerCase().includes(term)
      );
    }
  }

  onSearch(): void {
    this.updateFilteredProcedures();
  }

  onDatabaseChange(): void {
    this.loadStoredProcedures();
  }

  onUsageTypeChange(): void {
    this.loadStoredProcedures();
  }

  clearFilters(): void {
    this.selectedDatabase = '';
    this.selectedUsageType = '';
    this.searchTerm = '';
    this.loadStoredProcedures();
  }

  openModal(sp?: StoredProcedure): void {
    this.editingSp = sp || null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingSp = null;
  }

  onModalClose(): void {
    this.closeModal();
    this.loadStoredProcedures();
  }

  deleteSp(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this stored procedure?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.spService.softDelete(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Stored procedure deleted successfully'
            });
            this.loadStoredProcedures();
          },
          error: (error) => {
            console.error('Error deleting stored procedure:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete stored procedure'
            });
          }
        });
      }
    });
  }

  editSp(id: number): void {
    this.spService.getById(id).subscribe({
      next: (sp) => {
        if (sp) {
          this.openModal(sp);
        }
      },
      error: (error) => {
        console.error('Error loading stored procedure:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load stored procedure'
        });
      }
    });
  }

  getActiveProceduresCount(): number {
    return this.storedProcedures.filter(sp => sp.isActive).length;
  }

  getRuleProceduresCount(): number {
    return this.storedProcedures.filter(sp => sp.usageType === 'Rule').length;
  }
}



