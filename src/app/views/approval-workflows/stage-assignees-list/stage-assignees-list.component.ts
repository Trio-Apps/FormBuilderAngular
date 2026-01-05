import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalStageAssigneesService, ApprovalStageAssigneeDto, CreateApprovalStageAssigneeDto, UpdateApprovalStageAssigneeDto, BulkUpdateAssigneesDto } from '../../FormBuilder/services/approval-stage-assignees.service';
import { ApprovalStageService, ApprovalStageDto } from '../../FormBuilder/services/approval-stage.service';
import { UsersService, UserDto, UserGroupDto } from '../../FormBuilder/services/users.service';
import { AuthService } from '../../../auth/auth.service';
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
import { MultiSelectModule } from 'primeng/multiselect';
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
    PaginatorModule,
    MultiSelectModule
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

  // Users and Roles data
  users: UserDto[] = [];
  userGroups: UserGroupDto[] = [];
  filteredUsers: UserDto[] = [];
  filteredUserGroups: UserGroupDto[] = [];

  // For bulk update
  selectedRoleIds: number[] = [];
  selectedUserIds: number[] = [];

  // Loading States
  loading = {
    stage: false,
    assignees: false,
    save: false,
    delete: false,
    bulkUpdate: false,
    users: false,
    userGroups: false
  };

  // Modal
  showModal = false;
  showBulkUpdateModal = false;
  assigneeForm!: FormGroup;
  bulkUpdateForm!: FormGroup;
  editingAssignee: ApprovalStageAssigneeDto | null = null;

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
    private usersService: UsersService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the assignee form - Role only (takes roleId from selected user's role)
    this.assigneeForm = this.fb.group({
      stageId: [null, [Validators.required]],
      userId: [null, [Validators.required]], // User dropdown, but we'll extract roleId from it
      isActive: [true]
    });

    // Initialize bulk update form
    this.bulkUpdateForm = this.fb.group({
      userIds: [[]]
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
        // Only load data if user is authenticated
        if (this.authService.isAuthenticated()) {
          this.loadStage();
          this.loadAssignees();
          this.loadUsers();
          this.loadUserGroups(); // Load user groups to find "user" role as fallback
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Authentication Required',
            detail: 'Please log in to view this page'
          });
        }
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

  loadUsers(): void {
    // Check authentication before loading
    if (!this.authService.isAuthenticated()) {
      console.warn('User not authenticated, skipping users load');
      return;
    }

    this.loading.users = true;
    // Disable userId control while loading
    this.assigneeForm.get('userId')?.disable();
    
    this.usersService.getActiveUsers().subscribe({
      next: (users: UserDto[]) => {
        this.users = users || [];
        this.filteredUsers = [...this.users];
        this.loading.users = false;
        // Enable userId control after loading
        this.assigneeForm.get('userId')?.enable();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.users = [];
        this.filteredUsers = [];
        this.loading.users = false;
        // Enable userId control even on error
        this.assigneeForm.get('userId')?.enable();
        
        // Only show error if it's not a 401 (authentication error)
        if (error?.status !== 401) {
          console.warn('Failed to load users. You may need to check API endpoint or permissions.');
        }
      }
    });
  }

  loadUserGroups(): void {
    // Check authentication before loading
    if (!this.authService.isAuthenticated()) {
      console.warn('User not authenticated, skipping user groups load');
      return;
    }

    this.loading.userGroups = true;
    
    this.usersService.getActiveUserGroups().subscribe({
      next: (groups: UserGroupDto[]) => {
        this.userGroups = groups || [];
        this.filteredUserGroups = [...this.userGroups];
        this.loading.userGroups = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user groups:', error);
        this.userGroups = [];
        this.filteredUserGroups = [];
        this.loading.userGroups = false;
        
        // Only show error if it's not a 401 (authentication error)
        if (error?.status !== 401) {
          console.warn('Failed to load user groups. You may need to check API endpoint or permissions.');
        }
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
    
    // Reset form with default values - User only
    this.assigneeForm.reset({
      stageId: this.stageId,
      userId: null,
      isActive: true
    }, { emitEvent: false });
    
    // Enable userId control if not loading
    const userIdControl = this.assigneeForm.get('userId');
    if (!this.loading.users) {
      userIdControl?.enable({ emitEvent: false });
    }
    userIdControl?.updateValueAndValidity({ emitEvent: false });
  }

  openEditModal(assignee: ApprovalStageAssigneeDto): void {
    this.editingAssignee = assignee;
    this.showModal = true;
    
    // Convert string ID to number for dropdown - User only
    const userId = assignee.userId ? parseInt(assignee.userId, 10) : null;
    
    // Patch form values - User only
    this.assigneeForm.patchValue({
      stageId: assignee.stageId,
      userId: userId,
      isActive: assignee.isActive !== false
    }, { emitEvent: false });
    
    // Enable userId control if not loading
    const userIdControl = this.assigneeForm.get('userId');
    if (!this.loading.users) {
      userIdControl?.enable({ emitEvent: false });
    }
    userIdControl?.updateValueAndValidity({ emitEvent: false });
  }

  openBulkUpdateModal(): void {
    if (!this.stageId) {
      return;
    }
    
    this.showBulkUpdateModal = true;
    
    // Pre-select current assignees - User only
    const currentUsers: UserDto[] = [];
    
    this.assignees.forEach(assignee => {
      if (assignee.userId) {
        const userId = parseInt(assignee.userId, 10);
        if (!isNaN(userId)) {
          const user = this.users.find(u => u.id === userId);
          if (user && !currentUsers.find(u => u.id === user.id)) {
            currentUsers.push(user);
          }
        }
      }
    });
    
    this.bulkUpdateForm.reset({
      userIds: currentUsers
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
    
    // Get userId from form control - Backend will extract roleId automatically
    const userIdControlValue = this.assigneeForm.get('userId')?.value;
    
    console.log('[StageAssigneesList] Form values:', {
      userIdControlValue: userIdControlValue,
      userIdType: typeof userIdControlValue
    });

    // Helper function to extract ID from object or value
    const extractId = (value: any): string | null => {
      if (value === null || value === undefined || value === '') return null;
      // If it's an object, extract id or Id property
      if (typeof value === 'object' && value !== null) {
        const id = value.id || value.Id || value.userId || value.UserId;
        return id ? String(id) : null;
      }
      // If it's already a number or string, convert to string
      return String(value);
    };

    // Extract userId from selected user
    const userId = extractId(userIdControlValue);
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      this.loading.save = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select a user'
      });
      return;
    }

    // Get stageId and isActive from form
    const stageId = this.assigneeForm.get('stageId')?.value;
    const isActive = this.assigneeForm.get('isActive')?.value !== undefined 
      ? this.assigneeForm.get('isActive')?.value 
      : true;

    // Create DTO - only userId is required, Backend extracts roleId automatically
    const createDto: CreateApprovalStageAssigneeDto = {
      stageId: stageId,
      userId: userId,  // Only userId - Backend extracts roleId automatically
      isActive: isActive
    };

    console.log('[StageAssigneesList] Creating assignee with DTO:', createDto);
    console.log('[StageAssigneesList] Final extracted values:', {
      userIdControlValue: userIdControlValue,
      extractedUserId: userId,
      stageId: stageId,
      isActive: isActive
    });

    if (this.editingAssignee && this.editingAssignee.id) {
      // Update existing assignee - only userId is required
      const updateDto: UpdateApprovalStageAssigneeDto = {
        stageId: stageId,
        userId: userId,  // Only userId - Backend extracts roleId automatically
        isActive: isActive
      };

      console.log('[StageAssigneesList] Updating assignee with DTO:', updateDto);

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
          // Extract error message
          let errorMessage = 'Failed to create assignee';
          let errorDetails: string[] = [];
          
          if (error?.error) {
            // Check for validation errors (ASP.NET Core ProblemDetails format)
            if (error.error.errors && typeof error.error.errors === 'object') {
              const errors: { [key: string]: string[] } = error.error.errors;
              for (const [field, messages] of Object.entries(errors)) {
                if (Array.isArray(messages)) {
                  messages.forEach(msg => errorDetails.push(`${field}: ${msg}`));
                } else {
                  errorDetails.push(`${field}: ${messages}`);
                }
              }
            } else if (error.error.errors && Array.isArray(error.error.errors)) {
              errorDetails = error.error.errors;
            }
            
            // Extract main error message
            if (errorDetails.length > 0) {
              errorMessage = errorDetails.join(', ');
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errorMessage) {
              errorMessage = error.error.errorMessage;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // Check if error is "User does not have an active role"
          const errorMessageLower = errorMessage.toLowerCase();
          if (errorMessageLower.includes('does not have an active role') || 
              errorMessageLower.includes('user does not have') ||
              errorMessageLower.includes('no active role')) {
            
            // Find "user" role in userGroups as fallback
            const userRole = this.userGroups.find(g => 
              g.name?.toLowerCase() === 'user' || 
              g.name?.toLowerCase() === 'users' ||
              g.foreignName?.toLowerCase() === 'user'
            );
            
            if (userRole) {
              console.log('[StageAssigneesList] User has no role, using "user" role as fallback:', userRole);
              
              // Retry with roleId = user role ID
              // Note: We need to send both userId and roleId in this case
              const retryDto: any = {
                stageId: createDto.stageId,
                userId: createDto.userId,
                roleId: String(userRole.id), // Use "user" role ID
                isActive: createDto.isActive
              };
              
              console.log('[StageAssigneesList] Retrying with roleId:', retryDto);
              
              // Retry the request with roleId
              this.assigneesService.createAssignee(retryDto as any).subscribe({
                next: () => {
                  this.loading.save = false;
                  this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: 'Assignee created successfully (using default "user" role)' 
                  });
                  this.closeModal();
                  this.loadAssignees();
                },
                error: (retryError: any) => {
                  this.loading.save = false;
                  console.error('Error retrying with roleId:', retryError);
                  this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: errorMessage,
                    life: 5000
                  });
                  this.cdr.detectChanges();
                }
              });
              return; // Exit early, retry is in progress
            } else {
              console.warn('[StageAssigneesList] User has no role and "user" role not found in userGroups');
            }
          }
          
          this.loading.save = false;
          console.error('Error creating assignee:', error);
          console.error('Error details:', {
            status: error?.status,
            statusText: error?.statusText,
            error: error?.error,
            requestBody: createDto
          });
          
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage,
            life: 5000
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
    const userIds = formData.userIds || [];

    if (userIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select at least one user'
      });
      return;
    }

    this.loading.bulkUpdate = true;

    // Helper function to extract ID from object or value
    const extractId = (value: any): string | null => {
      if (!value) return null;
      // If it's an object, extract id or Id property
      if (typeof value === 'object') {
        const id = value.id || value.Id || value.userId || value.UserId;
        return id ? String(id) : null;
      }
      // If it's already a number or string, convert to string
      return String(value);
    };

    // Extract IDs from arrays - User only
    const userIdsString: string[] = userIds
      .map((item: any) => extractId(item))
      .filter((id: string | null): id is string => id !== null && id !== 'undefined' && id !== 'null');

    // Validate that we have at least one valid ID
    if (userIdsString.length === 0) {
      this.loading.bulkUpdate = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select at least one valid user'
      });
      return;
    }

    const bulkDto: BulkUpdateAssigneesDto = {
      stageId: this.stageId,
      roleIds: undefined, // Always undefined - User only
      userIds: userIdsString.length > 0 ? userIdsString : undefined
    };

    console.log('[StageAssigneesList] Bulk update DTO:', bulkDto);

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
    // Use roleName and userName from response (filled by Backend)
    if (assignee.userName) {
      return assignee.userName;
    }
    if (assignee.roleName) {
      return assignee.roleName;
    }
    // Fallback: try to find from loaded arrays
    if (assignee.userId) {
      const userIdNum = parseInt(assignee.userId, 10);
      const user = this.users.find(u => u.id === userIdNum);
      return user ? (user.name || user.username) : `User ID: ${assignee.userId}`;
    }
    if (assignee.roleId) {
      const roleIdNum = parseInt(assignee.roleId, 10);
      const role = this.userGroups.find(g => g.id === roleIdNum);
      return role ? role.name : `Role ID: ${assignee.roleId}`;
    }
    return 'Unknown';
  }

  getUserDisplayName(user: UserDto): string {
    return user.name || user.username || `User #${user.id}`;
  }

  getUserGroupDisplayName(group: UserGroupDto): string {
    return group.name || `Role #${group.id}`;
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

