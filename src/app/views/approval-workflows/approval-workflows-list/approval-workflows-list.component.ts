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
    // Initialize the form
    this.workflowForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      documentTypeId: [null, [Validators.required]],
      isActive: [true]
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

    this.loadDocumentTypes();
    this.loadApprovalWorkflows();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadApprovalWorkflows(): void {
    this.loading.workflows = true;
    this.approvalWorkflowService.getAllApprovalWorkflows().subscribe({
      next: (workflows: ApprovalWorkflowDto[]) => {
        this.approvalWorkflows = workflows || [];
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
      documentTypeId: null,
      isActive: true
    });
    this.showModal = true;
  }

  openEditModal(workflow: ApprovalWorkflowDto): void {
    this.editingWorkflow = workflow;
    this.workflowForm.patchValue({
      name: workflow.name,
      documentTypeId: workflow.documentTypeId,
      isActive: workflow.isActive !== false
    });
    // Disable documentTypeId field when editing (cannot change after creation)
    this.workflowForm.get('documentTypeId')?.disable();
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
        documentTypeId: documentTypeIdValue, // Include documentTypeId to avoid backend validation errors
        isActive: formData.isActive !== false
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
        documentTypeId: formData.documentTypeId,
        isActive: formData.isActive !== false
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
        this.approvalWorkflowService.deleteApprovalWorkflow(workflow.id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Approval workflow deleted successfully'
            });
            this.loadApprovalWorkflows();
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

  toggleWorkflowStatus(workflow: ApprovalWorkflowDto): void {
    if (!workflow || !workflow.id) return;

    const newStatus = !workflow.isActive;
    this.loading.toggle = true;
    this.approvalWorkflowService.toggleApprovalWorkflowStatus(workflow.id, newStatus).subscribe({
      next: () => {
        this.loading.toggle = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Approval workflow ${newStatus ? 'activated' : 'deactivated'} successfully`
        });
        this.loadApprovalWorkflows();
      },
      error: (error: any) => {
        this.loading.toggle = false;
        console.error('Error toggling approval workflow status:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to toggle approval workflow status';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
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
      documentTypeId: null,
      isActive: true
    });
    // Ensure documentTypeId is enabled when closing modal
    this.workflowForm.get('documentTypeId')?.enable();
  }
}

