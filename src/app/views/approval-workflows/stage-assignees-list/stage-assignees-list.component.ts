import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalStageAssigneesService, ApprovalStageAssigneeDto, CreateApprovalStageAssigneeDto, UpdateApprovalStageAssigneeDto, BulkUpdateAssigneesDto } from '../../FormBuilder/services/approval-stage-assignees.service';
import { ApprovalStageService, ApprovalStageDto } from '../../FormBuilder/services/approval-stage.service';
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
  selector: 'app-stage-assignees-list',
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
  templateUrl: './stage-assignees-list.component.html',
  styleUrls: ['./stage-assignees-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class StageAssigneesListComponent implements OnInit, OnDestroy {
  // Route params
  stageId!: number;
  stage: ApprovalStageDto | null = null;

  // Data Arrays
  assignees: ApprovalStageAssigneeDto[] = [];
  filteredAssignees: ApprovalStageAssigneeDto[] = [];

  // For bulk update
  availableRoleIds: string[] = []; // TODO: Load from roles service
  availableUserIds: string[] = []; // TODO: Load from users service
  selectedRoleIds: string[] = [];
  selectedUserIds: string[] = [];

  // Loading States
  loading = {
    stage: false,
    assignees: false,
    save: false,
    delete: false,
    bulkUpdate: false
  };

  // Modal
  showModal = false;
  showBulkUpdateModal = false;
  assigneeForm!: FormGroup;
  bulkUpdateForm!: FormGroup;
  editingAssignee: ApprovalStageAssigneeDto | null = null;
  assigneeType: 'role' | 'user' = 'role';

  // Search Filter
  searchTerm = '';

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private route: ActivatedRoute,
    private assigneesService: ApprovalStageAssigneesService,
    private stageService: ApprovalStageService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the assignee form
    this.assigneeForm = this.fb.group({
      stageId: [null, [Validators.required]],
      assigneeType: ['role', [Validators.required]],
      roleId: [null],
      userId: [null],
      isActive: [true]
    });

    // Initialize bulk update form
    this.bulkUpdateForm = this.fb.group({
      roleIds: [[]],
      userIds: [[]]
    });

    // Update form validators based on assignee type
    this.assigneeForm.get('assigneeType')?.valueChanges.subscribe(type => {
      this.assigneeType = type;
      const roleIdControl = this.assigneeForm.get('roleId');
      const userIdControl = this.assigneeForm.get('userId');
      
      if (type === 'role') {
        roleIdControl?.setValidators([Validators.required]);
        userIdControl?.clearValidators();
        userIdControl?.setValue(null);
      } else {
        userIdControl?.setValidators([Validators.required]);
        roleIdControl?.clearValidators();
        roleIdControl?.setValue(null);
      }
      
      roleIdControl?.updateValueAndValidity();
      userIdControl?.updateValueAndValidity();
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

    // Get stageId from route
    this.route.params.subscribe(params => {
      this.stageId = +params['stageId'];
      if (this.stageId) {
        this.loadStage();
        this.loadAssignees();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadStage(): void {
    this.loading.stage = true;
    this.stageService.getById(this.stageId).subscribe({
      next: (stage: ApprovalStageDto) => {
        this.stage = stage;
        this.loading.stage = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading stage:', error);
        this.stage = null;
        this.loading.stage = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load stage information'
        });
        this.cdr.detectChanges();
      }
    });
  }

  loadAssignees(): void {
    if (!this.stageId) {
      return;
    }

    this.loading.assignees = true;
    this.assigneesService.getAssigneesByStageId(this.stageId).subscribe({
      next: (assignees: ApprovalStageAssigneeDto[]) => {
        this.assignees = assignees || [];
        this.filteredAssignees = [...this.assignees];
        this.totalRecords = this.filteredAssignees.length;
        this.loading.assignees = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading assignees:', error);
        this.assignees = [];
        this.filteredAssignees = [];
        this.loading.assignees = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load assignees'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterAssignees(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAssignees = [...this.assignees];
      this.totalRecords = this.filteredAssignees.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredAssignees = this.assignees.filter(assignee =>
      assignee.roleName?.toLowerCase().includes(term) ||
      assignee.userName?.toLowerCase().includes(term) ||
      assignee.roleId?.toLowerCase().includes(term) ||
      assignee.userId?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredAssignees.length;
  }

  onSearchChange(): void {
    this.filterAssignees();
    this.first = 0;
  }

  getPaginatedAssignees(): ApprovalStageAssigneeDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredAssignees.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  openAddModal(): void {
    if (!this.stageId) {
      return;
    }
    
    this.editingAssignee = null;
    this.showModal = true;
    this.assigneeType = 'role';
    
    this.assigneeForm.reset({
      stageId: this.stageId,
      assigneeType: 'role',
      roleId: null,
      userId: null,
      isActive: true
    });
  }

  openEditModal(assignee: ApprovalStageAssigneeDto): void {
    this.editingAssignee = assignee;
    this.showModal = true;
    
    const assigneeType = assignee.roleId ? 'role' : 'user';
    this.assigneeType = assigneeType;
    
    this.assigneeForm.patchValue({
      stageId: assignee.stageId,
      assigneeType: assigneeType,
      roleId: assignee.roleId || null,
      userId: assignee.userId || null,
      isActive: assignee.isActive !== false
    });
  }

  openBulkUpdateModal(): void {
    if (!this.stageId) {
      return;
    }
    
    this.showBulkUpdateModal = true;
    this.selectedRoleIds = [];
    this.selectedUserIds = [];
    
    this.bulkUpdateForm.reset({
      roleIds: [],
      userIds: []
    });
  }

  saveAssignee(): void {
    if (this.assigneeForm.invalid) {
      this.markFormGroupTouched(this.assigneeForm);
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please fill all required fields correctly' 
      });
      return;
    }

    this.loading.save = true;
    const formData = this.assigneeForm.value;

    const createDto: CreateApprovalStageAssigneeDto = {
      stageId: formData.stageId,
      roleId: formData.assigneeType === 'role' ? formData.roleId : null,
      userId: formData.assigneeType === 'user' ? formData.userId : null,
      isActive: formData.isActive !== undefined ? formData.isActive : true
    };

    if (this.editingAssignee && this.editingAssignee.id) {
      // Update existing assignee
      const updateDto: UpdateApprovalStageAssigneeDto = {
        stageId: formData.stageId,
        roleId: formData.assigneeType === 'role' ? formData.roleId : null,
        userId: formData.assigneeType === 'user' ? formData.userId : null,
        isActive: formData.isActive !== undefined ? formData.isActive : true
      };

      this.assigneesService.updateAssignee(this.editingAssignee.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Assignee updated successfully' 
          });
          this.closeModal();
          this.loadAssignees();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error updating assignee:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update assignee';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new assignee
      this.assigneesService.createAssignee(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Assignee created successfully' 
          });
          this.closeModal();
          this.loadAssignees();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating assignee:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create assignee';
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

  saveBulkUpdate(): void {
    if (!this.stageId) {
      return;
    }

    const formData = this.bulkUpdateForm.value;
    const roleIds = formData.roleIds || [];
    const userIds = formData.userIds || [];

    if (roleIds.length === 0 && userIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select at least one role or user'
      });
      return;
    }

    this.loading.bulkUpdate = true;

    const bulkDto: BulkUpdateAssigneesDto = {
      stageId: this.stageId,
      roleIds: roleIds.length > 0 ? roleIds : undefined,
      userIds: userIds.length > 0 ? userIds : undefined
    };

    this.assigneesService.bulkUpdateAssignees(bulkDto).subscribe({
      next: () => {
        this.loading.bulkUpdate = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Assignees updated successfully'
        });
        this.closeBulkUpdateModal();
        this.loadAssignees();
      },
      error: (error: any) => {
        this.loading.bulkUpdate = false;
        console.error('Error bulk updating assignees:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update assignees';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  deleteAssignee(assignee: ApprovalStageAssigneeDto): void {
    if (!assignee || !assignee.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this assignee? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.assigneesService.deleteAssignee(assignee.id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Assignee deleted successfully' 
            });
            this.loadAssignees();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting assignee:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete assignee';
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

  getAssigneeDisplayName(assignee: ApprovalStageAssigneeDto): string {
    if (assignee.roleName) {
      return `Role: ${assignee.roleName}`;
    }
    if (assignee.userName) {
      return `User: ${assignee.userName}`;
    }
    if (assignee.roleId) {
      return `Role ID: ${assignee.roleId}`;
    }
    if (assignee.userId) {
      return `User ID: ${assignee.userId}`;
    }
    return 'Unknown';
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingAssignee = null;
    this.assigneeForm.reset();
  }

  closeBulkUpdateModal(): void {
    this.showBulkUpdateModal = false;
    this.bulkUpdateForm.reset();
    this.selectedRoleIds = [];
    this.selectedUserIds = [];
  }
}

