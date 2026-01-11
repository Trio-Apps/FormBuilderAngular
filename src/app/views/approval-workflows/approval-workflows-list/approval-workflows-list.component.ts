import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalWorkflowService, ApprovalWorkflowDto, CreateApprovalWorkflowDto, UpdateApprovalWorkflowDto } from '../../FormBuilder/services/approval-workflow.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-approval-workflows-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ButtonModule,
    TableModule,
    PaginatorModule
  ],
  templateUrl: './approval-workflows-list.component.html',
  styleUrls: ['./approval-workflows-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ApprovalWorkflowsListComponent implements OnInit, OnDestroy {
  // Data Arrays
  approvalWorkflows: ApprovalWorkflowDto[] = [];
  filteredWorkflows: ApprovalWorkflowDto[] = [];
  documentTypes: DocumentType[] = [];
  private deletedWorkflowIds: Set<number> = new Set(); // Track deleted workflow IDs to filter them out

  // Loading States
  loading = {
    workflows: false,
    documentTypes: false,
    save: false,
    delete: false,
    toggle: false
  };

  // Modal
  showModal = false;
  workflowForm!: FormGroup;
  editingWorkflow: ApprovalWorkflowDto | null = null;

  // Search Filter
  searchTerm = '';

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private approvalWorkflowService: ApprovalWorkflowService,
    private documentTypesService: DocumentTypesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the workflow form
    this.workflowForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      documentTypeId: [null, [Validators.required]]
      // Note: isDeleted defaults to false for new workflows (handled by backend)
    });
  }

  ngOnInit(): void {
    // Set language preference
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }

    // Load deleted workflow IDs from localStorage to persist across sessions
    this.loadDeletedWorkflowIds();

    this.loadDocumentTypes();
    this.loadApprovalWorkflows();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load deleted workflow IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedWorkflowIds(): void {
    try {
      const savedIds = localStorage.getItem('deletedWorkflowIds');
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedWorkflowIds = new Set(idsArray);
        console.log('[ApprovalWorkflowsList] Loaded deleted workflow IDs from localStorage:', Array.from(this.deletedWorkflowIds));
      }
    } catch (error) {
      console.error('[ApprovalWorkflowsList] Error loading deleted workflow IDs from localStorage:', error);
      this.deletedWorkflowIds = new Set();
    }
  }

  /**
   * Save deleted workflow IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedWorkflowIds(): void {
    try {
      const idsArray = Array.from(this.deletedWorkflowIds);
      localStorage.setItem('deletedWorkflowIds', JSON.stringify(idsArray));
      console.log('[ApprovalWorkflowsList] Saved deleted workflow IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[ApprovalWorkflowsList] Error saving deleted workflow IDs to localStorage:', error);
    }
  }

  loadApprovalWorkflows(): void {
    this.loading.workflows = true;
    this.approvalWorkflowService.getAllApprovalWorkflows().subscribe({
      next: (workflows: ApprovalWorkflowDto[]) => {
        const allWorkflows = workflows || [];
        
        // Filter out deleted workflows before processing
        const activeWorkflows = allWorkflows.filter(workflow => !this.deletedWorkflowIds.has(workflow.id!));

        // Clean up deletedWorkflowIds - remove IDs that are no longer in the API response
        const apiWorkflowIds = new Set(allWorkflows.map(w => w.id));
        const idsToRemove: number[] = [];
        this.deletedWorkflowIds.forEach(deletedId => {
          const workflowInApi = allWorkflows.find(w => w.id === deletedId);
          if (!workflowInApi) {
            // Workflow not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (workflowInApi.isDeleted === false) {
            // Workflow is back in API and not deleted (might have been restored)
            idsToRemove.push(deletedId);
            console.log('[ApprovalWorkflowsList] Workflow was restored, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedWorkflowIds.delete(id));
          this.saveDeletedWorkflowIds();
          console.log('[ApprovalWorkflowsList] Cleaned up deleted workflow IDs:', idsToRemove);
        }

        // Filter out soft-deleted workflows (isDeleted = true) - show only non-deleted workflows
        const visibleWorkflows = activeWorkflows.filter(workflow => workflow.isDeleted !== true);
        
        this.approvalWorkflows = visibleWorkflows;
        this.filteredWorkflows = [...this.approvalWorkflows];
        this.totalRecords = this.filteredWorkflows.length;
        this.loading.workflows = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading approval workflows:', error);
        this.approvalWorkflows = [];
        this.filteredWorkflows = [];
        this.loading.workflows = false;
        
        let errorMessage = 'Failed to load approval workflows';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.messageService.add({ 
          severity: 'error', 
          summary: `Error (${error?.status || 'Unknown'})`, 
          detail: errorMessage,
          life: 8000
        });
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentTypes(): void {
    this.loading.documentTypes = true;
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentTypes = types || [];
        this.loading.documentTypes = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading document types:', error);
        this.documentTypes = [];
        this.loading.documentTypes = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterWorkflows(): void {
    if (!this.searchTerm.trim()) {
      this.filteredWorkflows = [...this.approvalWorkflows];
      this.totalRecords = this.filteredWorkflows.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredWorkflows = this.approvalWorkflows.filter(workflow =>
      workflow.name?.toLowerCase().includes(term) ||
      workflow.documentTypeName?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredWorkflows.length;
  }

  onSearchChange(): void {
    this.filterWorkflows();
    this.first = 0; // Reset to first page
  }

  getPaginatedWorkflows(): ApprovalWorkflowDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredWorkflows.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  openAddModal(): void {
    this.editingWorkflow = null;
    this.workflowForm.reset({
      name: '',
      documentTypeId: null
    });
    // Ensure documentTypeId is enabled when creating new workflow
    this.workflowForm.get('documentTypeId')?.enable();
    this.showModal = true;
  }

  openEditModal(workflow: ApprovalWorkflowDto): void {
    this.editingWorkflow = workflow;
    this.workflowForm.patchValue({
      name: workflow.name,
      documentTypeId: workflow.documentTypeId
      // Note: isDeleted is not managed via form
    });
    // Note: Document Type can be changed, but be aware that:
    // - Approval Stages are linked to the workflow
    // - Existing submissions may use this workflow with the old document type
    // Keeping it enabled allows flexibility, but use with caution
    // If you want to disable it, uncomment the line below:
    // this.workflowForm.get('documentTypeId')?.disable();
    this.showModal = true;
  }

  saveWorkflow(): void {
    if (this.workflowForm.invalid) {
      this.markFormGroupTouched(this.workflowForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    this.loading.save = true;
    const formData = this.workflowForm.value;

    if (this.editingWorkflow && this.editingWorkflow.id) {
      // Update existing workflow
      // Get the documentTypeId value (even if disabled, we need to include it)
      const documentTypeIdValue = this.workflowForm.get('documentTypeId')?.value ?? this.editingWorkflow.documentTypeId;
      
      const updateDto: UpdateApprovalWorkflowDto = {
        name: formData.name.trim(),
        documentTypeId: documentTypeIdValue
        // Note: isDeleted is not managed via form
      };

      this.approvalWorkflowService.updateApprovalWorkflow(this.editingWorkflow.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Approval workflow updated successfully'
          });
          this.closeModal();
          this.loadApprovalWorkflows();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error updating approval workflow:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update approval workflow';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new workflow
      const createDto: CreateApprovalWorkflowDto = {
        name: formData.name.trim(),
        documentTypeId: formData.documentTypeId
        // Note: isDeleted defaults to false for new workflows (handled by backend)
      };

      this.approvalWorkflowService.createApprovalWorkflow(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Approval workflow created successfully'
          });
          this.closeModal();
          this.loadApprovalWorkflows();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating approval workflow:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create approval workflow';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteWorkflow(workflow: ApprovalWorkflowDto): void {
    if (!workflow || !workflow.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the approval workflow "${workflow.name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.approvalWorkflowService.softDelete(workflow.id!).subscribe({
          next: () => {
            // Add to deleted workflows set to filter it out even after refresh/login
            this.deletedWorkflowIds.add(workflow.id!);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedWorkflowIds();

            // Update workflow in array - mark as deleted
            const workflowIndex = this.approvalWorkflows.findIndex(w => w.id === workflow.id);
            if (workflowIndex !== -1) {
              this.approvalWorkflows[workflowIndex] = {
                ...this.approvalWorkflows[workflowIndex],
                isDeleted: true
              };
              // Remove from visible list (filter out deleted)
              this.approvalWorkflows = this.approvalWorkflows.filter(w => w.id !== workflow.id);
            }
            
            // Update filtered list
            this.filteredWorkflows = this.filteredWorkflows.filter(w => w.id !== workflow.id);
            
            this.totalRecords = this.filteredWorkflows.length;

            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Approval workflow deleted successfully',
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting approval workflow:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete approval workflow';
            
            // Check for specific error scenarios
            const errorText = errorMessage.toLowerCase();
            if (errorText.includes('document type') || errorText.includes('foreign key') || errorText.includes('constraint')) {
              errorMessage = 'Cannot delete this approval workflow because it is associated with document types. Please remove the association first.';
            } else if (errorText.includes('not found')) {
              errorMessage = 'Approval workflow not found.';
            }
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  restoreWorkflow(workflow: ApprovalWorkflowDto): void {
    if (!workflow || !workflow.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to restore the approval workflow "${workflow.name}"?`,
      header: 'Confirm Restoration',
      icon: 'pi pi-undo',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.loading.toggle = true;
        this.approvalWorkflowService.restore(workflow.id!).subscribe({
          next: (restoredWorkflow) => {
            // Remove from deletedWorkflowIds if it was tracked
            if (this.deletedWorkflowIds.has(workflow.id!)) {
              this.deletedWorkflowIds.delete(workflow.id!);
              this.saveDeletedWorkflowIds();
              console.log('[ApprovalWorkflowsList] Removed restored workflow from deletedWorkflowIds:', workflow.id);
            }
            
            // Reload workflows to get the restored workflow
            this.loadApprovalWorkflows();
            
            this.loading.toggle = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Approval workflow restored successfully',
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.toggle = false;
            console.error('[ApprovalWorkflowsList] Error restoring workflow:', error);
            const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to restore approval workflow';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getDocumentTypeName(documentTypeId: number): string {
    const docType = this.documentTypes.find(dt => dt.id === documentTypeId);
    return docType ? docType.name : `Document Type #${documentTypeId}`;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingWorkflow = null;
    this.workflowForm.reset({
      name: '',
      documentTypeId: null
    });
    // Ensure documentTypeId is enabled when closing modal
    this.workflowForm.get('documentTypeId')?.enable();
  }

}

