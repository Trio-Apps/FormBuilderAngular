import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalStageService, ApprovalStageDto, CreateApprovalStageDto, UpdateApprovalStageDto, FormField } from '../../FormBuilder/services/approval-stage.service';
import { ApprovalWorkflowService, ApprovalWorkflowDto } from '../../FormBuilder/services/approval-workflow.service';
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
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-approval-stages-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
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
    PaginatorModule,
    TableShellComponent
  ],
  templateUrl: './approval-stages-list.component.html',
  styleUrls: ['./approval-stages-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ApprovalStagesListComponent implements OnInit, OnDestroy {
  // Route params
  workflowId!: number;
  workflow: ApprovalWorkflowDto | null = null;
  documentType: DocumentType | null = null;

  // Data Arrays
  approvalStages: ApprovalStageDto[] = [];
  filteredStages: ApprovalStageDto[] = [];
  formFields: FormField[] = [];
  private deletedStageIds: Set<number> = new Set(); // Track deleted stage IDs to filter them out

  // Loading States
  loading = {
    workflow: false,
    stages: false,
    save: false,
    delete: false,
    toggle: false,
    formFields: false
  };

  // Modal
  showModal = false;
  stageForm!: FormGroup;
  editingStage: ApprovalStageDto | null = null;

  // Search Filter
  searchTerm = '';

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private route: ActivatedRoute,
    private approvalStageService: ApprovalStageService,
    private approvalWorkflowService: ApprovalWorkflowService,
    private documentTypesService: DocumentTypesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the stage form
    this.stageForm = this.fb.group({
      workflowId: [null, [Validators.required]],
      stageName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      stageOrder: [1, [Validators.required, Validators.min(1)]],
      minAmount: [null],
      maxAmount: [null],
      isFinalStage: [false],
      isActive: [true],
      minimumRequiredAssignees: [null, Validators.min(0)],
      amountFieldCode: [null]
      // Note: isDeleted is not managed via form - it's handled via delete/restore actions
    });

    // Watch for minAmount/maxAmount changes to load form fields
    this.stageForm.get('minAmount')?.valueChanges.subscribe(() => {
      const minAmount = this.stageForm.get('minAmount')?.value;
      const maxAmount = this.stageForm.get('maxAmount')?.value;
      if ((minAmount !== null && minAmount !== undefined && minAmount !== '') || 
          (maxAmount !== null && maxAmount !== undefined && maxAmount !== '')) {
        this.loadFormFields();
      }
    });

    this.stageForm.get('maxAmount')?.valueChanges.subscribe(() => {
      const minAmount = this.stageForm.get('minAmount')?.value;
      const maxAmount = this.stageForm.get('maxAmount')?.value;
      if ((minAmount !== null && minAmount !== undefined && minAmount !== '') || 
          (maxAmount !== null && maxAmount !== undefined && maxAmount !== '')) {
        this.loadFormFields();
      }
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

    // Get workflowId from route
    this.route.params.subscribe(params => {
      this.workflowId = +params['workflowId'];
      if (this.workflowId) {
        // Load deleted stage IDs from localStorage when workflowId is available
        this.loadDeletedStageIds();
        this.loadWorkflow();
        this.loadApprovalStages();
        this.loadFormFields();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load form fields for the workflow
   */
  loadFormFields(): void {
    if (!this.workflowId) {
      console.warn('[ApprovalStagesList] Cannot load form fields: workflowId is not set');
      return;
    }

    // Don't reload if already loading or if fields are already loaded
    if (this.loading.formFields) {
      return;
    }

    this.loading.formFields = true;
    console.log('[ApprovalStagesList] Loading form fields for workflow:', this.workflowId);
    
    this.approvalStageService.getFormFieldsByWorkflowId(this.workflowId).subscribe({
      next: (response) => {
        console.log('[ApprovalStagesList] Form fields response:', response);
        if (response && response.statusCode === 200 && response.data && Array.isArray(response.data)) {
          this.formFields = response.data;
          console.log('[ApprovalStagesList] Loaded form fields:', this.formFields.length);
        } else {
          console.warn('[ApprovalStagesList] Invalid response format or no data:', response);
          this.formFields = [];
        }
        this.loading.formFields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[ApprovalStagesList] Error loading form fields:', error);
        this.formFields = [];
        this.loading.formFields = false;
        // Don't show error message to user, just log it
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Load deleted stage IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedStageIds(): void {
    try {
      const savedIds = localStorage.getItem(`deletedStageIds_${this.workflowId}`);
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedStageIds = new Set(idsArray);
        console.log('[ApprovalStagesList] Loaded deleted stage IDs from localStorage:', Array.from(this.deletedStageIds));
      }
    } catch (error) {
      console.error('[ApprovalStagesList] Error loading deleted stage IDs from localStorage:', error);
      this.deletedStageIds = new Set();
    }
  }

  /**
   * Save deleted stage IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedStageIds(): void {
    try {
      const idsArray = Array.from(this.deletedStageIds);
      localStorage.setItem(`deletedStageIds_${this.workflowId}`, JSON.stringify(idsArray));
      console.log('[ApprovalStagesList] Saved deleted stage IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[ApprovalStagesList] Error saving deleted stage IDs to localStorage:', error);
    }
  }

  loadWorkflow(): void {
    this.loading.workflow = true;
    this.approvalWorkflowService.getApprovalWorkflowById(this.workflowId).subscribe({
      next: (workflow: ApprovalWorkflowDto) => {
        this.workflow = workflow;
        // Load document type name if not provided in workflow response
        if (workflow.documentTypeId && !workflow.documentTypeName) {
          this.loadDocumentType(workflow.documentTypeId);
        }
        this.loading.workflow = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading workflow:', error);
        this.workflow = null;
        this.loading.workflow = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load workflow information'
        });
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentType(documentTypeId: number): void {
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentType = types.find(t => t.id === documentTypeId) || null;
        // Update workflow object with document type name if found
        if (this.workflow && this.documentType) {
          this.workflow.documentTypeName = this.documentType.name;
        }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading document type:', error);
        // Don't show error message, just log it
      }
    });
  }

  getDocumentTypeName(): string {
    if (this.workflow?.documentTypeName) {
      return this.workflow.documentTypeName;
    }
    if (this.documentType?.name) {
      return this.documentType.name;
    }
    return 'N/A';
  }

  loadApprovalStages(): void {
    if (!this.workflowId) {
      return;
    }

    this.loading.stages = true;
    this.approvalStageService.getAllByWorkflowId(this.workflowId).subscribe({
      next: (stages: ApprovalStageDto[]) => {
        const allStages = stages || [];
        
        // Reload deleted stage IDs when workflowId changes
        this.loadDeletedStageIds();

        // Filter out deleted stages before processing
        const activeStages = allStages.filter(stage => !this.deletedStageIds.has(stage.id!));

        // Clean up deletedStageIds - remove IDs that are no longer in the API response
        const apiStageIds = new Set(allStages.map(s => s.id));
        const idsToRemove: number[] = [];
        this.deletedStageIds.forEach(deletedId => {
          const stageInApi = allStages.find(s => s.id === deletedId);
          if (!stageInApi) {
            // Stage not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (stageInApi.isDeleted === false) {
            // Stage is back in API and not deleted (might have been restored)
            idsToRemove.push(deletedId);
            console.log('[ApprovalStagesList] Stage was restored, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedStageIds.delete(id));
          this.saveDeletedStageIds();
          console.log('[ApprovalStagesList] Cleaned up deleted stage IDs:', idsToRemove);
        }

        // Filter out soft-deleted stages (isDeleted = true) - show only non-deleted stages
        const visibleStages = activeStages.filter(stage => stage.isDeleted !== true);
        
        // Sort by stageOrder
        this.approvalStages = visibleStages.sort((a, b) => a.stageOrder - b.stageOrder);
        this.filteredStages = [...this.approvalStages];
        this.totalRecords = this.filteredStages.length;
        this.loading.stages = false;
        // Update final stage control state if modal is open
        if (this.showModal) {
          this.updateFinalStageControlState();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading approval stages:', error);
        this.approvalStages = [];
        this.filteredStages = [];
        this.loading.stages = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load approval stages'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterStages(): void {
    if (!this.searchTerm.trim()) {
      this.filteredStages = [...this.approvalStages];
      this.totalRecords = this.filteredStages.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredStages = this.approvalStages.filter(stage =>
      stage.stageName?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredStages.length;
  }

  onSearchChange(): void {
    this.filterStages();
    this.first = 0; // Reset to first page
  }

  getPaginatedStages(): ApprovalStageDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredStages.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  openAddModal(): void {
    if (!this.workflowId) {
      return;
    }
    
    this.editingStage = null;
    this.showModal = true;
    
    // Get the next stage order
    const maxOrder = this.approvalStages.length > 0 
      ? Math.max(...this.approvalStages.map(s => s.stageOrder)) 
      : 0;
    
    this.stageForm.reset({
      workflowId: this.workflowId,
      stageName: '',
      stageOrder: maxOrder + 1,
      minAmount: null,
      maxAmount: null,
      isFinalStage: false,
      isActive: true,
      minimumRequiredAssignees: null,
      amountFieldCode: null
      // Note: isDeleted defaults to false for new stages (handled by backend)
    });
    // Enable workflowId field when creating new stage
    this.stageForm.get('workflowId')?.enable();
    // Enable/disable isFinalStage based on existing final stage
    this.updateFinalStageControlState();
    // Load form fields when opening modal (in case user sets amount range)
    this.loadFormFields();
  }

  openEditModal(stage: ApprovalStageDto): void {
    this.editingStage = stage;
    this.showModal = true;
    this.stageForm.patchValue({
      workflowId: stage.workflowId,
      stageName: stage.stageName,
      stageOrder: stage.stageOrder,
      minAmount: stage.minAmount,
      maxAmount: stage.maxAmount,
      isFinalStage: stage.isFinalStage,
      isActive: stage.isActive !== undefined ? stage.isActive : true,
      minimumRequiredAssignees: stage.minimumRequiredAssignees,
      amountFieldCode: stage.amountFieldCode
      // Note: isDeleted is not managed via form
    });
    // Disable workflowId field when editing (cannot change after creation)
    this.stageForm.get('workflowId')?.disable();
    // Enable/disable isFinalStage based on existing final stage
    this.updateFinalStageControlState();
    // Load form fields when opening modal (needed if stage has amount range)
    if (stage.minAmount || stage.maxAmount) {
      this.loadFormFields();
    }
  }

  /**
   * Update the disabled state of isFinalStage control
   * Disable if another stage is already final (unless editing that stage)
   */
  private updateFinalStageControlState(): void {
    const isFinalStageControl = this.stageForm.get('isFinalStage');
    if (!isFinalStageControl) return;

    const hasOtherFinalStage = this.hasFinalStage() && 
      (!this.editingStage || this.editingStage.isFinalStage !== true);

    if (hasOtherFinalStage) {
      isFinalStageControl.disable();
    } else {
      isFinalStageControl.enable();
    }
  }

  saveStage(): void {
    if (this.stageForm.invalid) {
      this.markFormGroupTouched(this.stageForm);
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please fill all required fields correctly' 
      });
      return;
    }

    this.loading.save = true;
    const formData = this.stageForm.value;

    // Require amountFieldCode when min/max amount is set
    const hasMinAmount = formData.minAmount !== null && formData.minAmount !== undefined && formData.minAmount !== '';
    const hasMaxAmount = formData.maxAmount !== null && formData.maxAmount !== undefined && formData.maxAmount !== '';
    const hasAmountRange = hasMinAmount || hasMaxAmount;
    const hasAmountFieldCode = formData.amountFieldCode !== null && formData.amountFieldCode !== undefined && formData.amountFieldCode !== '';

    if (hasAmountRange && !hasAmountFieldCode) {
      this.loading.save = false;
      this.stageForm.get('amountFieldCode')?.setErrors({ required: true });
      this.stageForm.get('amountFieldCode')?.markAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Amount Field is required when Min/Max Amount is set'
      });
      return;
    }

    // Validate amount range
    if (hasMinAmount && hasMaxAmount) {
      const min = Number(formData.minAmount);
      const max = Number(formData.maxAmount);
      if (!isNaN(min) && !isNaN(max) && min >= max) {
        this.loading.save = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Minimum amount must be less than maximum amount'
        });
        return;
      }
    }

    // Handle Final Stage: Only one stage can be final stage
    // If setting this stage as final, unmark other final stages first
    if (formData.isFinalStage === true) {
      const existingFinalStage = this.approvalStages.find(stage => 
        stage.isFinalStage === true && 
        (!this.editingStage || stage.id !== this.editingStage.id)
      );
      
      if (existingFinalStage) {
        // Unmark the existing final stage first
        // Include workflowId to avoid backend validation errors
        const unmarkDto: UpdateApprovalStageDto = {
          workflowId: existingFinalStage.workflowId,
          isFinalStage: false
        };
        
        this.approvalStageService.update(existingFinalStage.id, unmarkDto).subscribe({
          next: () => {
            console.log(`[ApprovalStagesList] Unmarked final stage from: ${existingFinalStage.stageName}`);
            // Continue with saving the new final stage
            this.performSave(formData);
          },
          error: (error) => {
            this.loading.save = false;
            console.error('Error unmarking existing final stage:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to unmark existing final stage. Please try again.'
            });
            this.cdr.detectChanges();
          }
        });
        return; // Exit early, performSave will be called after unmarking
      }
    }

    // If no existing final stage conflict, proceed with save
    this.performSave(formData);
  }

  private performSave(formData: any): void {
    if (this.editingStage && this.editingStage.id) {
      // Update existing stage
      // Get the workflowId value (even if disabled, we need to include it)
      const workflowIdValue = this.stageForm.get('workflowId')?.value ?? this.editingStage.workflowId ?? this.workflowId;
      
      const updateDto: UpdateApprovalStageDto = {
        workflowId: workflowIdValue, // Include workflowId to avoid backend validation errors
        stageName: formData.stageName?.trim(),
        stageOrder: formData.stageOrder,
        minAmount: (formData.minAmount !== null && formData.minAmount !== undefined && formData.minAmount !== '') 
          ? Number(formData.minAmount) 
          : null,
        maxAmount: (formData.maxAmount !== null && formData.maxAmount !== undefined && formData.maxAmount !== '') 
          ? Number(formData.maxAmount) 
          : null,
        isFinalStage: formData.isFinalStage !== undefined ? formData.isFinalStage : false,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        minimumRequiredAssignees: (formData.minimumRequiredAssignees !== null && formData.minimumRequiredAssignees !== undefined && formData.minimumRequiredAssignees !== '') 
          ? Number(formData.minimumRequiredAssignees) 
          : null,
        amountFieldCode: formData.amountFieldCode || null
        // Note: isDeleted is not updated via form - it's managed via delete/restore actions
      };

      this.approvalStageService.update(this.editingStage.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Approval stage updated successfully' 
          });
          this.closeModal();
          this.loadApprovalStages();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error updating approval stage:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update approval stage';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new stage
      const createDto: CreateApprovalStageDto = {
        workflowId: formData.workflowId || this.workflowId,
        stageName: formData.stageName.trim(),
        stageOrder: formData.stageOrder,
        minAmount: (formData.minAmount !== null && formData.minAmount !== undefined && formData.minAmount !== '') 
          ? Number(formData.minAmount) 
          : null,
        maxAmount: (formData.maxAmount !== null && formData.maxAmount !== undefined && formData.maxAmount !== '') 
          ? Number(formData.maxAmount) 
          : null,
        isFinalStage: formData.isFinalStage || false,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        minimumRequiredAssignees: (formData.minimumRequiredAssignees !== null && formData.minimumRequiredAssignees !== undefined && formData.minimumRequiredAssignees !== '') 
          ? Number(formData.minimumRequiredAssignees) 
          : null,
        amountFieldCode: formData.amountFieldCode || null
        // Note: isDeleted defaults to false for new stages (handled by backend)
      };

      this.approvalStageService.create(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Approval stage created successfully' 
          });
          this.closeModal();
          this.loadApprovalStages();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating approval stage:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create approval stage';
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

  deleteStage(stage: ApprovalStageDto): void {
    if (!stage || !stage.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the approval stage "${stage.stageName}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.approvalStageService.softDelete(stage.id).subscribe({
          next: () => {
            // Add to deleted stages set to filter it out even after refresh/login
            this.deletedStageIds.add(stage.id!);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedStageIds();

            // Update stage in array - mark as deleted
            const stageIndex = this.approvalStages.findIndex(s => s.id === stage.id);
            if (stageIndex !== -1) {
              this.approvalStages[stageIndex] = {
                ...this.approvalStages[stageIndex],
                isDeleted: true
              };
              // Remove from visible list (filter out deleted)
              this.approvalStages = this.approvalStages.filter(s => s.isDeleted !== true);
            }
            
            // Update filtered list
            const filteredIndex = this.filteredStages.findIndex(s => s.id === stage.id);
            if (filteredIndex !== -1) {
              this.filteredStages = this.filteredStages.filter(s => s.id !== stage.id);
            }
            
            this.totalRecords = this.filteredStages.length;

            this.loading.delete = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Approval stage deleted successfully',
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting approval stage:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete approval stage';
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

  restoreStage(stage: ApprovalStageDto): void {
    if (!stage || !stage.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to restore the approval stage "${stage.stageName}"?`,
      header: 'Confirm Restore',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.toggle = true;
        this.approvalStageService.restore(stage.id).subscribe({
          next: (restoredStage) => {
            this.loading.toggle = false;
            
            // Remove from deletedStageIds if it was tracked
            if (this.deletedStageIds.has(stage.id)) {
              this.deletedStageIds.delete(stage.id);
              this.saveDeletedStageIds();
              console.log('[ApprovalStagesList] Removed restored stage from deletedStageIds:', stage.id);
            }
            
            // Reload stages to get the restored stage
            this.loadApprovalStages();
            
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Approval stage restored successfully' 
            });
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.toggle = false;
            console.error('Error restoring approval stage:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to restore approval stage';
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

  formatAmount(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  hasFinalStage(): boolean {
    return this.approvalStages.some(stage => stage.isFinalStage === true);
  }

  getFinalStageName(): string {
    const finalStage = this.approvalStages.find(stage => stage.isFinalStage === true);
    return finalStage ? finalStage.stageName : '';
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Check if amount range fields have values (not null/undefined/empty)
   * Returns true if either minAmount or maxAmount has a value
   * Note: p-inputNumber may return 0 or null, so we check for both
   */
  hasAmountRange(): boolean {
    const minAmount = this.stageForm.get('minAmount')?.value;
    const maxAmount = this.stageForm.get('maxAmount')?.value;
    
    // Check if values are not null, undefined, or empty string
    // p-inputNumber returns null when empty, or a number (including 0) when filled
    // We want to show the dropdown if user has interacted with the fields (even if value is 0)
    const hasMinAmount = minAmount !== null && minAmount !== undefined && minAmount !== '';
    const hasMaxAmount = maxAmount !== null && maxAmount !== undefined && maxAmount !== '';
    
    // Also check if the form control has been touched (user interacted with it)
    const minAmountTouched = this.stageForm.get('minAmount')?.touched || false;
    const maxAmountTouched = this.stageForm.get('maxAmount')?.touched || false;
    
    // Show dropdown if:
    // 1. Either field has a value (including 0), OR
    // 2. Either field has been touched (user interacted with it)
    return (hasMinAmount || hasMaxAmount) || (minAmountTouched || maxAmountTouched);
  }

  closeModal(): void {
    this.showModal = false;
    this.editingStage = null;
    this.stageForm.reset();
    // Ensure workflowId is enabled when closing modal
    this.stageForm.get('workflowId')?.enable();
    // Ensure isFinalStage is enabled when closing modal
    this.stageForm.get('isFinalStage')?.enable();
    // isDeleted is not managed via form - it's handled via delete/restore actions
  }
}








