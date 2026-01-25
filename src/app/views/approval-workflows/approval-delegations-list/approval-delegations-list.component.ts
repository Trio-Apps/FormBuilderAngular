import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalDelegationService, ApprovalDelegationDto, CreateApprovalDelegationDto, UpdateApprovalDelegationDto, ScopeType } from '../../FormBuilder/services/approval-delegation.service';
import { UsersService, UserDto } from '../../FormBuilder/services/users.service';
import { ApprovalWorkflowService, ApprovalWorkflowDto } from '../../FormBuilder/services/approval-workflow.service';
import { StorageService } from '../../../auth/storage.service';
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
  selector: 'app-approval-delegations-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
    CommonModule,
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
  templateUrl: './approval-delegations-list.component.html',
  styleUrls: ['./approval-delegations-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ApprovalDelegationsListComponent implements OnInit {
  delegations: ApprovalDelegationDto[] = [];
  filteredDelegations: ApprovalDelegationDto[] = [];
  currentUserId: string | null = null;
  private deletedDelegationIds: Set<number> = new Set(); // Track deleted delegation IDs to filter them out
  
  // Users data for dropdowns
  users: UserDto[] = [];
  filteredUsers: UserDto[] = [];
  
  // Workflows data for dropdown
  workflows: ApprovalWorkflowDto[] = [];
  
  // Scope types
  scopeTypes: ScopeType[] = ['Global', 'Workflow', 'Document'];

  loading = {
    delegations: false,
    save: false,
    delete: false,
    users: false,
    workflows: false
  };

  showModal = false;
  delegationForm!: FormGroup;
  editingDelegation: ApprovalDelegationDto | null = null;

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private delegationService: ApprovalDelegationService,
    private usersService: UsersService,
    private workflowService: ApprovalWorkflowService,
    private storageService: StorageService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    this.delegationForm = this.fb.group({
      fromUserId: [null, [Validators.required]],
      toUserId: [null, [Validators.required]],
      scopeType: ['Global', [Validators.required]],
      scopeId: [null],
      startDate: [null, [Validators.required]],
      endDate: [null, [Validators.required]],
      isActive: [true]
    });
    
    // Watch scopeType changes to update scopeId validation
    this.delegationForm.get('scopeType')?.valueChanges.subscribe(scopeType => {
      this.onScopeTypeChange(scopeType);
    });
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
    }

    // Get current user ID (assuming it's stored as string in storage)
    // TODO: Adjust based on your auth implementation
    this.currentUserId = this.storageService.getUserId()?.toString() || null;
    
    // Load deleted delegation IDs from localStorage
    this.loadDeletedDelegationIds();
    
    // Load users and workflows first, then delegations (so we can display names)
    this.loadUsers();
    this.loadWorkflows();
    this.loadDelegations();
  }
  
  loadWorkflows(): void {
    this.loading.workflows = true;
    this.workflowService.getActiveApprovalWorkflows().subscribe({
      next: (workflows: ApprovalWorkflowDto[]) => {
        this.workflows = workflows || [];
        this.loading.workflows = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading workflows:', error);
        this.workflows = [];
        this.loading.workflows = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  onScopeTypeChange(scopeType: ScopeType): void {
    const scopeIdControl = this.delegationForm.get('scopeId');
    
    if (scopeType === 'Global') {
      // Global doesn't need scopeId
      scopeIdControl?.clearValidators();
      scopeIdControl?.setValue(null);
    } else if (scopeType === 'Workflow' || scopeType === 'Document') {
      // Workflow and Document require scopeId
      scopeIdControl?.setValidators([Validators.required]);
    }
    
    scopeIdControl?.updateValueAndValidity();
    this.cdr.detectChanges();
  }
  
  getScopeIdLabel(): string {
    const scopeType = this.delegationForm.get('scopeType')?.value;
    if (scopeType === 'Workflow') {
      return 'Workflow';
    } else if (scopeType === 'Document') {
      return 'Submission ID';
    }
    return 'Scope ID';
  }
  
  isScopeIdRequired(): boolean {
    const scopeType = this.delegationForm.get('scopeType')?.value;
    return scopeType === 'Workflow' || scopeType === 'Document';
  }

  loadUsers(): void {
    this.loading.users = true;
    // Disable user dropdowns while loading
    this.delegationForm.get('fromUserId')?.disable();
    this.delegationForm.get('toUserId')?.disable();
    
    this.usersService.getActiveUsers().subscribe({
      next: (users: UserDto[]) => {
        this.users = users || [];
        this.filteredUsers = [...this.users];
        this.loading.users = false;
        // Enable user dropdowns after loading
        this.delegationForm.get('fromUserId')?.enable();
        this.delegationForm.get('toUserId')?.enable();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.users = [];
        this.filteredUsers = [];
        this.loading.users = false;
        // Enable user dropdowns even on error
        this.delegationForm.get('fromUserId')?.enable();
        this.delegationForm.get('toUserId')?.enable();
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Failed to load users. Please refresh the page.'
        });
        this.cdr.detectChanges();
      }
    });
  }

  compareUsers(user1: UserDto | null, user2: UserDto | null): boolean {
    if (!user1 || !user2) return user1 === user2;
    return user1.id === user2.id;
  }

  getUserDisplayName(user: UserDto): string {
    return user.name || user.username || `User #${user.id}`;
  }

  /**
   * Load deleted delegation IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedDelegationIds(): void {
    try {
      const savedIds = localStorage.getItem('deletedDelegationIds');
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedDelegationIds = new Set(idsArray);
        console.log('[ApprovalDelegationsList] Loaded deleted delegation IDs from localStorage:', Array.from(this.deletedDelegationIds));
      }
    } catch (error) {
      console.error('[ApprovalDelegationsList] Error loading deleted delegation IDs from localStorage:', error);
      this.deletedDelegationIds = new Set();
    }
  }

  /**
   * Save deleted delegation IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedDelegationIds(): void {
    try {
      const idsArray = Array.from(this.deletedDelegationIds);
      localStorage.setItem('deletedDelegationIds', JSON.stringify(idsArray));
      console.log('[ApprovalDelegationsList] Saved deleted delegation IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[ApprovalDelegationsList] Error saving deleted delegation IDs to localStorage:', error);
    }
  }

  getUserNameById(userId: string | null | undefined): string {
    if (!userId) return '-';
    
    // First try to get from delegation data (if available)
    // This will be handled in template
    
    // Then try to find in loaded users list
    const userIdNum = parseInt(userId, 10);
    if (!isNaN(userIdNum)) {
      const user = this.users.find(u => u.id === userIdNum);
      if (user) {
        return this.getUserDisplayName(user);
      }
    }
    
    // Fallback to ID if user not found
    return userId;
  }

  loadDelegations(): void {
    this.loading.delegations = true;
    // Reload deleted delegation IDs when loading delegations
    this.loadDeletedDelegationIds();

    this.delegationService.getAllDelegations().subscribe({
      next: (delegations: ApprovalDelegationDto[]) => {
        const allDelegations = delegations || [];
        
        // Filter out deleted delegations before processing
        const activeDelegations = allDelegations.filter(delegation => !this.deletedDelegationIds.has(delegation.id!));

        // Clean up deletedDelegationIds - remove IDs that are no longer in the API response
        const apiDelegationIds = new Set(allDelegations.map(d => d.id));
        const idsToRemove: number[] = [];
        this.deletedDelegationIds.forEach(deletedId => {
          const delegationInApi = allDelegations.find(d => d.id === deletedId);
          if (!delegationInApi) {
            // Delegation not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (delegationInApi.isActive !== false) {
            // Delegation is back in API and active again (might have been reactivated)
            idsToRemove.push(deletedId);
            console.log('[ApprovalDelegationsList] Delegation was reactivated, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedDelegationIds.delete(id));
          this.saveDeletedDelegationIds();
          console.log('[ApprovalDelegationsList] Cleaned up deleted delegation IDs:', idsToRemove);
        }

        // Show all delegations (including inactive ones) - don't filter by isActive
        // User can see inactive delegations and reactivate them
        const visibleDelegations = activeDelegations; // Keep all delegations, including inactive ones
        
        this.delegations = visibleDelegations;
        this.filteredDelegations = [...this.delegations];
        this.totalRecords = this.filteredDelegations.length;
        this.loading.delegations = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading delegations:', error);
        this.delegations = [];
        this.filteredDelegations = [];
        this.loading.delegations = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load delegations'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterDelegations(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDelegations = [...this.delegations];
      this.totalRecords = this.filteredDelegations.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDelegations = this.delegations.filter(d =>
      d.fromUserName?.toLowerCase().includes(term) ||
      d.toUserName?.toLowerCase().includes(term) ||
      d.fromUserId?.toLowerCase().includes(term) ||
      d.toUserId?.toLowerCase().includes(term) ||
      d.scopeType?.toLowerCase().includes(term) ||
      d.scopeName?.toLowerCase().includes(term) ||
      (d.scopeId !== null && d.scopeId !== undefined && String(d.scopeId).includes(term))
    );
    this.totalRecords = this.filteredDelegations.length;
  }

  onSearchChange(): void {
    this.filterDelegations();
    this.first = 0;
  }

  getPaginatedDelegations(): ApprovalDelegationDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredDelegations.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  openAddModal(): void {
    this.editingDelegation = null;
    this.showModal = true;
    
    // Find current user object from users list
    let currentUser: UserDto | null = null;
    if (this.currentUserId) {
      const currentUserIdNum = parseInt(this.currentUserId, 10);
      currentUser = this.users.find(u => u.id === currentUserIdNum) || null;
    }
    
    // Enable fromUserId control for new delegation
    this.delegationForm.get('fromUserId')?.enable();
    this.delegationForm.get('toUserId')?.enable();
    this.delegationForm.get('isActive')?.enable(); // Enable for new delegation
    
    this.delegationForm.reset({
      fromUserId: currentUser, // Set user object, not just ID
      toUserId: null,
      scopeType: 'Global',
      scopeId: null,
      startDate: null,
      endDate: null,
      isActive: true
    });
    this.onScopeTypeChange('Global');
  }

  openEditModal(delegation: ApprovalDelegationDto): void {
    this.editingDelegation = delegation;
    this.showModal = true;
    
    // Convert dates to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (date: Date | string): string => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    // Find user objects from IDs
    const fromUserIdNum = delegation.fromUserId ? parseInt(delegation.fromUserId, 10) : null;
    const toUserIdNum = delegation.toUserId ? parseInt(delegation.toUserId, 10) : null;
    
    const fromUser = fromUserIdNum ? this.users.find(u => u.id === fromUserIdNum) || null : null;
    const toUser = toUserIdNum ? this.users.find(u => u.id === toUserIdNum) || null : null;
    
    // Disable fromUserId control when editing (should not be changed)
    this.delegationForm.get('fromUserId')?.disable();
    this.delegationForm.get('toUserId')?.enable();
    this.delegationForm.get('isActive')?.enable(); // Enable isActive checkbox for editing
    
    this.delegationForm.patchValue({
      fromUserId: fromUser, // Set user object, not just ID
      toUserId: toUser, // Set user object, not just ID
      scopeType: delegation.scopeType || 'Global',
      scopeId: delegation.scopeId,
      startDate: formatDateForInput(delegation.startDate),
      endDate: formatDateForInput(delegation.endDate),
      isActive: delegation.isActive !== false // Use original value from database
    });
    this.onScopeTypeChange(delegation.scopeType || 'Global');
  }

  saveDelegation(): void {
    if (this.delegationForm.invalid) {
      this.markFormGroupTouched(this.delegationForm);
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please fill all required fields correctly' 
      });
      return;
    }

    this.loading.save = true;
    const formData = this.delegationForm.value;

    // Helper function to extract ID from user object or value
    const extractUserId = (value: any): string | null => {
      if (!value) return null;
      // If it's an object, extract id
      if (typeof value === 'object' && value !== null) {
        const id = value.id || value.Id || value.userId || value.UserId;
        return id ? String(id) : null;
      }
      // If it's already a number or string, convert to string
      return String(value);
    };

    if (this.editingDelegation && this.editingDelegation.id) {
      // Extract userId from user object
      const toUserId = extractUserId(formData.toUserId);
      
      if (!toUserId) {
        this.loading.save = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a user to delegate to'
        });
        return;
      }

      // Get isActive value (use getRawValue if control is disabled)
      const isActiveValue = this.delegationForm.get('isActive')?.disabled 
        ? this.delegationForm.get('isActive')?.getRawValue() 
        : formData.isActive;
      
      const updateDto: UpdateApprovalDelegationDto = {
        toUserId: toUserId,
        scopeType: formData.scopeType,
        scopeId: formData.scopeType === 'Global' ? null : formData.scopeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: isActiveValue !== undefined ? isActiveValue : true
      };

      this.delegationService.updateDelegation(this.editingDelegation.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Delegation updated successfully' 
          });
          this.closeModal();
          this.loadDelegations();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error updating delegation:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update delegation';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Extract userIds from user objects
      const fromUserId = extractUserId(formData.fromUserId);
      const toUserId = extractUserId(formData.toUserId);
      
      if (!fromUserId) {
        this.loading.save = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a user to delegate from'
        });
        return;
      }
      
      if (!toUserId) {
        this.loading.save = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please select a user to delegate to'
        });
        return;
      }

      const createDto: CreateApprovalDelegationDto = {
        fromUserId: fromUserId,
        toUserId: toUserId,
        scopeType: formData.scopeType || 'Global',
        scopeId: formData.scopeType === 'Global' ? null : formData.scopeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive !== undefined ? formData.isActive : true
      };

      console.log('[ApprovalDelegationsList] Creating delegation with DTO:', createDto);

      this.delegationService.createDelegation(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Delegation created successfully' 
          });
          this.closeModal();
          this.loadDelegations();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating delegation:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create delegation';
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

  deleteDelegation(delegation: ApprovalDelegationDto): void {
    if (!delegation || !delegation.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this delegation? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.delegationService.deleteDelegation(delegation.id).subscribe({
          next: () => {
            // Add to deleted delegations set to filter it out even after refresh/login
            this.deletedDelegationIds.add(delegation.id!);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedDelegationIds();

            // Remove delegation from the list immediately
            const delegationIndex = this.delegations.findIndex(d => d.id === delegation.id);
            if (delegationIndex !== -1) {
              this.delegations.splice(delegationIndex, 1);
            }
            const filteredIndex = this.filteredDelegations.findIndex(d => d.id === delegation.id);
            if (filteredIndex !== -1) {
              this.filteredDelegations.splice(filteredIndex, 1);
            }
            this.totalRecords = this.filteredDelegations.length;

            this.loading.delete = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Delegation deleted successfully',
              life: 5000
            });
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting delegation:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete delegation';
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

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  isDelegationActive(delegation: ApprovalDelegationDto): boolean {
    // First check if isActive flag is explicitly false
    if (delegation.isActive === false) {
      return false;
    }
    
    // If isActive is not explicitly set to true, consider it inactive
    if (delegation.isActive !== true) {
      return false;
    }
    
    // Check if current date is within the delegation period
    const now = new Date();
    let start: Date;
    let end: Date;
    
    try {
      start = new Date(delegation.startDate);
      end = new Date(delegation.endDate);
    } catch (error) {
      console.error('Error parsing dates in isDelegationActive:', error);
      return false;
    }
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    // Check if now is between start and end dates (inclusive)
    const isWithinDateRange = now >= start && now <= end;
    
    // Debug logging (can be removed later)
    if (!isWithinDateRange && delegation.isActive === true) {
      console.log('[isDelegationActive] Delegation is marked active but outside date range:', {
        id: delegation.id,
        isActive: delegation.isActive,
        now: now.toISOString(),
        start: start.toISOString(),
        end: end.toISOString(),
        isWithinRange: isWithinDateRange
      });
    }
    
    return isWithinDateRange;
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingDelegation = null;
    // Enable all controls before resetting
    this.delegationForm.get('fromUserId')?.enable();
    this.delegationForm.get('toUserId')?.enable();
    this.delegationForm.get('isActive')?.enable();
    this.delegationForm.reset({
      scopeType: 'Global',
      scopeId: null
    });
    this.onScopeTypeChange('Global');
  }
}








