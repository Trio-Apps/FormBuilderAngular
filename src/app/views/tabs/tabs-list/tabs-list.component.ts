import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormTabDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Subscription } from 'rxjs';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-tabs-list',
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
  templateUrl: './tabs-list.component.html',
  styleUrls: ['./tabs-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TabsListComponent implements OnInit, OnDestroy {
  formId!: number;
  tabs: FormTabDto[] = [];
  loading = false;
  private routeSubscription?: Subscription;
  
  // Tab Modal
  showTabModal = false;
  tabName = '';
  tabCode = '';
  tabOrder = 1;
  isActive = true;
  editingTab: FormTabDto | null = null;

  constructor(
    private route: ActivatedRoute,
    private tabsService: TabsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.params.subscribe(params => {
      const newFormId = +params['formId'];
      if (newFormId && newFormId !== this.formId) {
        this.formId = newFormId;
        this.loadTabs();
      } else if (newFormId && !this.formId) {
        this.formId = newFormId;
        this.loadTabs();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadTabs(): void {
    if (!this.formId || isNaN(this.formId)) {
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid form ID'
      });
      return;
    }

    this.loading = true;
    this.tabsService.getTabs(this.formId).subscribe({
      next: (tabs) => {
        // Filter tabs to ensure they belong to this form
        this.tabs = Array.isArray(tabs) ? tabs.filter(tab => 
          tab.formBuilderId === this.formId
        ) : [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tabs'
        });
      }
    });
  }

  openTabModal(tab?: FormTabDto): void {
    if (tab) {
      this.editingTab = tab;
      this.tabName = tab.tabName;
      this.tabCode = tab.tabCode || '';
      this.tabOrder = tab.tabOrder || 1;
      this.isActive = tab.isActive !== false;
    } else {
      this.editingTab = null;
      this.tabName = '';
      this.tabCode = '';
      this.tabOrder = this.tabs.length + 1;
      this.isActive = true;
    }
    this.showTabModal = true;
  }

  closeTabModal(): void {
    this.showTabModal = false;
    this.editingTab = null;
    this.tabName = '';
    this.tabCode = '';
    this.tabOrder = 1;
    this.isActive = true;
  }

  saveTab(): void {
    if (!this.tabName || !this.tabCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Tab name and code are required'
      });
      return;
    }

    if (!this.formId || isNaN(this.formId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Invalid form ID. Please go back and try again.'
      });
      return;
    }

    this.loading = true;
    
    if (this.editingTab) {
      const updateDto = {
        tabName: this.tabName,
        tabCode: this.tabCode,
        tabOrder: this.tabOrder,
        isActive: this.isActive
      };
      
      this.tabsService.updateTab(this.editingTab.id, updateDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadTabs();
          this.closeTabModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tab updated successfully'
          });
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update tab';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    } else {
      const createDto = {
        formBuilderId: this.formId,
        tabName: this.tabName,
        tabCode: this.tabCode,
        tabOrder: this.tabOrder,
        isActive: this.isActive
      };
      
      this.tabsService.createTab(createDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadTabs();
          this.closeTabModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tab created successfully'
          });
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.error?.title || error?.message || 'Failed to create tab';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    }
  }

  deleteTab(id: number): void {
    const tabToDelete = this.tabs.find(t => t.id === id);
    if (!tabToDelete) return;

    this.confirmationService.confirm({
      message: `Delete "${tabToDelete.tabName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.tabsService.deleteTab(id).subscribe({
          next: () => {
            this.loadTabs();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Tab deleted successfully'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete tab'
            });
          }
        });
      }
    });
  }

}