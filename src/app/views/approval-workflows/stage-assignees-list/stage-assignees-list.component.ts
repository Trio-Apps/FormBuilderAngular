import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
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
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-stage-assignees-list',
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
    CheckboxModule,
    ButtonModule,
    TableModule,
    PaginatorModule,
    MultiSelectModule,
    TableShellComponent
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
  private deletedAssigneeIds: Set<number> = new Set(); // Track deleted assignee IDs to filter them out

  // Minimum Required Assignees
  minimumRequiredAssignees: number | null = null;
  activeAssigneesCount: number = 0;

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
    // Initialize the assignee form - User-based assignment
    // Backend automatically extracts roleId from the selected user
    this.assigneeForm = this.fb.group({
      stageId: [null, [Validators.required]],
      userId: [null, [Validators.required]], // User selection - Backend extracts roleId automatically
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
        // Load deleted assignee IDs from localStorage when stageId is available
        this.loadDeletedAssigneeIds();
        // Only load data if user is authenticated
        if (this.authService.isAuthenticated()) {
          this.loadStage();
          this.loadAssignees();
          this.loadUsers();
          this.loadUserGroups(); // Load user groups for fallback role assignment if needed
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

  /**
   * Load deleted assignee IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedAssigneeIds(): void {
    try {
      const savedIds = localStorage.getItem(`deletedAssigneeIds_${this.stageId}`);
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedAssigneeIds = new Set(idsArray);
        console.log('[StageAssigneesList] Loaded deleted assignee IDs from localStorage:', Array.from(this.deletedAssigneeIds));
      }
    } catch (error) {
      console.error('[StageAssigneesList] Error loading deleted assignee IDs from localStorage:', error);
      this.deletedAssigneeIds = new Set();
    }
  }

  /**
   * Save deleted assignee IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedAssigneeIds(): void {
    try {
      const idsArray = Array.from(this.deletedAssigneeIds);
      localStorage.setItem(`deletedAssigneeIds_${this.stageId}`, JSON.stringify(idsArray));
      console.log('[StageAssigneesList] Saved deleted assignee IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[StageAssigneesList] Error saving deleted assignee IDs to localStorage:', error);
    }
  }

  loadStage(): void {
    this.loading.stage = true;
    this.stageService.getById(this.stageId).subscribe({
      next: (stage: ApprovalStageDto) => {
        this.stage = stage;
        // Get minimumRequiredAssignees from stage
        this.minimumRequiredAssignees = stage.minimumRequiredAssignees !== undefined 
          ? stage.minimumRequiredAssignees 
          : null;
        this.loading.stage = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading stage:', error);
        this.stage = null;
        this.minimumRequiredAssignees = null;
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
    // Reload deleted assignee IDs when stageId changes
    this.loadDeletedAssigneeIds();

    this.assigneesService.getAssigneesByStageId(this.stageId).subscribe({
      next: (assignees: ApprovalStageAssigneeDto[]) => {
        const allAssignees = assignees || [];
        
        // Filter out deleted assignees before processing
        const activeAssignees = allAssignees.filter(assignee => !this.deletedAssigneeIds.has(assignee.id!));

        // Clean up deletedAssigneeIds - remove IDs that are no longer in the API response
        const apiAssigneeIds = new Set(allAssignees.map(a => a.id));
        const idsToRemove: number[] = [];
        this.deletedAssigneeIds.forEach(deletedId => {
          const assigneeInApi = allAssignees.find(a => a.id === deletedId);
          if (!assigneeInApi) {
            // Assignee not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (assigneeInApi.isActive !== false) {
            // Assignee is back in API and active again (might have been reactivated)
            idsToRemove.push(deletedId);
            console.log('[StageAssigneesList] Assignee was reactivated, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedAssigneeIds.delete(id));
          this.saveDeletedAssigneeIds();
          console.log('[StageAssigneesList] Cleaned up deleted assignee IDs:', idsToRemove);
        }

        // Show all assignees (including inactive ones) - don't filter by isActive
        // User can see inactive assignees and reactivate them
        const visibleAssignees = activeAssignees; // Keep all assignees, including inactive ones
        
        this.assignees = visibleAssignees;
        this.filteredAssignees = [...this.assignees];
        this.totalRecords = this.filteredAssignees.length;
        
        // Calculate active assignees count for minimum required validation
        this.activeAssigneesCount = this.assignees.filter(a => a.isActive === true).length;
        
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
    
    // Reset form with default values - User-based assignment
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
    
    // Convert string ID to number for dropdown
    const userId = assignee.userId ? parseInt(assignee.userId, 10) : null;
    
    // Patch form values - User-based assignment
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
    
    // Pre-select current assignees - User-based assignment
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

    // Try to get roleId from userGroups if available (Backend requires RoleId)
    // First, try to find "user" role as default
    let roleId: string | undefined;
    
    if (this.userGroups && this.userGroups.length > 0) {
      const userRole = this.userGroups.find(g => 
        g.name?.toLowerCase() === 'user' || 
        g.name?.toLowerCase() === 'users' ||
        g.foreignName?.toLowerCase() === 'user'
      );
      
      if (userRole) {
        roleId = String(userRole.id);
        console.log('[StageAssigneesList] Found default "user" role:', roleId);
      } else {
        // If "user" role not found, use first active role
        const firstActiveRole = this.userGroups.find(g => g.isActive);
        if (firstActiveRole) {
          roleId = String(firstActiveRole.id);
          console.log('[StageAssigneesList] Using first active role:', roleId);
        }
      }
    } else {
      console.warn('[StageAssigneesList] userGroups not loaded yet, roleId will be null');
    }

    // Create DTO - include roleId if available (Backend requires it)
    const createDto: CreateApprovalStageAssigneeDto = {
      stageId: stageId,
      userId: userId,
      roleId: roleId, // Include roleId if available
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
          this.loadAssignees(); // Reload to update active count
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
          this.loadAssignees(); // Reload to update active count
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
          
          // Check if error is related to RoleId being required
          const errorMessageLower = errorMessage.toLowerCase();
          const isRoleIdRequired = errorMessageLower.includes('roleid') && 
                                   (errorMessageLower.includes('required') || 
                                    errorMessageLower.includes('field is required'));
          
          const isUserRoleError = errorMessageLower.includes('does not have an active role') || 
                                  errorMessageLower.includes('user does not have') ||
                                  errorMessageLower.includes('no active role');
          
          // If RoleId is required or user has no role, try to get roleId from userGroups
          if (isRoleIdRequired || isUserRoleError) {
            console.log('[StageAssigneesList] RoleId is required or user has no role, attempting to find roleId...');
            
            // Try to find the user's role from userGroups
            // First, try to find a role that matches the user (if we have user info)
            let userRole: UserGroupDto | undefined;
            
            // Try to find "user" role as fallback
            userRole = this.userGroups.find(g => 
              g.name?.toLowerCase() === 'user' || 
              g.name?.toLowerCase() === 'users' ||
              g.foreignName?.toLowerCase() === 'user'
            );
            
            // If not found, try to get the first active role
            if (!userRole && this.userGroups.length > 0) {
              userRole = this.userGroups.find(g => g.isActive) || this.userGroups[0];
            }
            
            if (userRole) {
              console.log('[StageAssigneesList] Found role to use:', userRole);
              
              // Retry with roleId
              const retryDto: CreateApprovalStageAssigneeDto = {
                stageId: createDto.stageId,
                userId: createDto.userId,
                roleId: String(userRole.id), // Include roleId
                isActive: createDto.isActive
              };
              
              console.log('[StageAssigneesList] Retrying with roleId:', retryDto);
              
              // Retry the request with roleId
              this.assigneesService.createAssignee(retryDto).subscribe({
                next: () => {
                  this.loading.save = false;
                  this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: `Assignee created successfully${isRoleIdRequired ? ' (roleId included)' : ' (using default role)'}` 
                  });
                  this.closeModal();
                  this.loadAssignees();
                },
                error: (retryError: any) => {
                  this.loading.save = false;
                  console.error('Error retrying with roleId:', retryError);
                  let retryErrorMessage = this.extractErrorMessage(retryError);
                  this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: retryErrorMessage || errorMessage,
                    life: 5000
                  });
                  this.cdr.detectChanges();
                }
              });
              return; // Exit early, retry is in progress
            } else {
              console.warn('[StageAssigneesList] No role found in userGroups. Please ensure roles are loaded.');
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'RoleId is required but no role was found. Please ensure the user has a role assigned.',
                life: 5000
              });
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

    // Extract IDs from arrays - User-based assignment
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

  /**
   * Check if delete/deactivate is allowed based on minimum required assignees
   */
  canDeleteOrDeactivate(assignee: ApprovalStageAssigneeDto): boolean {
    // If assignee is already inactive, deletion is always allowed
    if (!assignee.isActive) {
      return true;
    }
    
    // If no minimum requirement, deletion is allowed
    if (this.minimumRequiredAssignees === null || this.minimumRequiredAssignees === undefined) {
      return true;
    }
    
    // Check if current active count is greater than minimum required
    return this.activeAssigneesCount > this.minimumRequiredAssignees;
  }

  /**
   * Get warning message for minimum required assignees
   */
  getWarningMessage(): string {
    if (this.minimumRequiredAssignees === null || this.minimumRequiredAssignees === undefined) {
      return '';
    }
    
    if (this.activeAssigneesCount <= this.minimumRequiredAssignees) {
      return `Warning: Stage requires at least ${this.minimumRequiredAssignees} active assignee(s). Currently has ${this.activeAssigneesCount} active assignee(s).`;
    }
    
    return '';
  }

  /**
   * Deactivate an assignee
   */
  deactivateAssignee(assignee: ApprovalStageAssigneeDto): void {
    if (!assignee || !assignee.id) return;

    // Check minimum required before deactivating
    if (!this.canDeleteOrDeactivate(assignee)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Deactivate',
        detail: `Cannot deactivate. Stage requires at least ${this.minimumRequiredAssignees} active assignee(s). Currently has ${this.activeAssigneesCount} active assignee(s).`,
        life: 5000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to deactivate this assignee?`,
      header: 'Confirm Deactivation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.save = true;
        const updateDto: UpdateApprovalStageAssigneeDto = {
          stageId: assignee.stageId,
          userId: assignee.userId || '',
          isActive: false
        };

        this.assigneesService.updateAssignee(assignee.id, updateDto).subscribe({
          next: () => {
            this.loading.save = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Assignee deactivated successfully',
              life: 5000
            });
            this.loadAssignees(); // Reload to update count
          },
          error: (error: any) => {
            this.loading.save = false;
            console.error('Error deactivating assignee:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to deactivate assignee';
            
            // Check if it's a validation error from server
            if (error?.error?.statusCode === 400 || error?.status === 400) {
              errorMessage = error?.error?.message || errorMessage;
            }
            
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
    });
  }

  /**
   * Activate an assignee
   */
  activateAssignee(assignee: ApprovalStageAssigneeDto): void {
    if (!assignee || !assignee.id) return;

    this.loading.save = true;
    const updateDto: UpdateApprovalStageAssigneeDto = {
      stageId: assignee.stageId,
      userId: assignee.userId || '',
      isActive: true
    };

    this.assigneesService.updateAssignee(assignee.id, updateDto).subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Assignee activated successfully',
          life: 5000
        });
        this.loadAssignees(); // Reload to update count
      },
      error: (error: any) => {
        this.loading.save = false;
        console.error('Error activating assignee:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to activate assignee';
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

  deleteAssignee(assignee: ApprovalStageAssigneeDto): void {
    if (!assignee || !assignee.id) return;

    // Check minimum required before deleting (only for active assignees)
    if (assignee.isActive && !this.canDeleteOrDeactivate(assignee)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: `Cannot delete. Stage requires at least ${this.minimumRequiredAssignees} active assignee(s). Currently has ${this.activeAssigneesCount} active assignee(s).`,
        life: 5000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this assignee? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.assigneesService.deleteAssignee(assignee.id).subscribe({
          next: () => {
            // Add to deleted assignees set to filter it out even after refresh/login
            this.deletedAssigneeIds.add(assignee.id!);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedAssigneeIds();

            // Remove assignee from the list immediately
            const assigneeIndex = this.assignees.findIndex(a => a.id === assignee.id);
            if (assigneeIndex !== -1) {
              this.assignees.splice(assigneeIndex, 1);
            }
            const filteredIndex = this.filteredAssignees.findIndex(a => a.id === assignee.id);
            if (filteredIndex !== -1) {
              this.filteredAssignees.splice(filteredIndex, 1);
            }
            this.totalRecords = this.filteredAssignees.length;
            
            // Update active count
            this.activeAssigneesCount = this.assignees.filter(a => a.isActive === true).length;

            this.loading.delete = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Assignee deleted successfully',
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting assignee:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete assignee';
            
            // Check if it's a validation error from server (400)
            if (error?.error?.statusCode === 400 || error?.status === 400) {
              errorMessage = error?.error?.message || errorMessage;
            }
            
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

  /**
   * Extract error message from error object
   */
  private extractErrorMessage(error: any): string {
    let errorMessage = 'Failed to process request';
    
    if (error?.error) {
      // Check for validation errors (ASP.NET Core ProblemDetails format)
      if (error.error.errors && typeof error.error.errors === 'object') {
        const errorDetails: string[] = [];
        for (const [field, messages] of Object.entries(error.error.errors)) {
          if (Array.isArray(messages)) {
            messages.forEach((msg: string) => errorDetails.push(`${field}: ${msg}`));
          } else {
            errorDetails.push(`${field}: ${messages}`);
          }
        }
        if (errorDetails.length > 0) {
          return errorDetails.join(', ');
        }
      } else if (error.error.errors && Array.isArray(error.error.errors)) {
        return error.error.errors.join(', ');
      }
      
      // Extract main error message
      if (error.error.detail) {
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
    
    return errorMessage;
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








