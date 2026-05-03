import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalWorkflowRuntimeService, ApprovalInboxItemDto, PagedApprovalInboxResult, ProcessApprovalActionDto } from '../../FormBuilder/services/approval-workflow-runtime.service';
import { ApprovalStageAssigneesService } from '../../FormBuilder/services/approval-stage-assignees.service';
import { ApprovalStageService, ApprovalStageDto } from '../../FormBuilder/services/approval-stage.service';
import { FormSubmissionsService, FormSubmissionDto, FormSubmissionDetailDto, FormSubmissionValueDto } from '../../form-submissions/services/form-submissions.service';
import { ApprovalDelegationService, ApprovalDelegationDto } from '../../FormBuilder/services/approval-delegation.service';
import { ApproveSubmissionDto, RejectSubmissionDto, ApiResponse } from '../../form-submissions/models/approve-reject-submission.model';
import { StorageService } from '../../../auth/storage.service';
import { AuthService } from '../../../auth/auth.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { FormFieldDto, FormTabDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';

interface SubmissionDetailFieldViewModel {
  id: string;
  fieldId: number;
  label: string;
  value: string;
  fullWidth: boolean;
}

interface SubmissionDetailTabViewModel {
  id: number;
  label: string;
  fields: SubmissionDetailFieldViewModel[];
}

@Component({
  selector: 'app-approval-inbox',
  standalone: true,
  imports: [
    DialogShellComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    PaginatorModule,
    TableShellComponent
  ],
  templateUrl: './approval-inbox.component.html',
  styleUrls: ['./approval-inbox.component.scss'],
  providers: [ConfirmationService]
})
export class ApprovalInboxComponent implements OnInit {
  inboxItems: ApprovalInboxItemDto[] = [];
  filteredItems: ApprovalInboxItemDto[] = [];
  currentUserId: string | null = null;
  currentUsername: string | null = null; // Store username separately in case backend needs it
  showAllSubmissions = false; // Toggle between inbox and all submissions
  pageAccessNotice: string | null = null;
  isAdmin = true;
  
  // ✅ Role-based access control
  
  // Active delegations for current user
  activeDelegations: ApprovalDelegationDto[] = [];

  loading = {
    inbox: false,
    action: false
  };

  showActionModal = false;
  actionForm!: FormGroup;
  selectedItem: ApprovalInboxItemDto | null = null;
  selectedSubmission: FormSubmissionDto | null = null; // For submissions table
  actionType: 'Approved' | 'Rejected' | 'Returned' = 'Approved';
  isSubmissionAction = false; // Flag to distinguish between inbox item and submission
  
  // Amount validation
  currentStage: ApprovalStageDto | null = null;
  submissionDetail: FormSubmissionDetailDto | null = null;
  amountValidationError: string = '';
  isAmountValid: boolean = true;
  showSubmissionDetails = false;
  loadingSubmissionDetails = false;
  postingSelectedSubmission = false;
  submissionDetailsError = '';
  selectedSubmissionDetail: FormSubmissionDetailDto | null = null;
  submissionDetailTabs: SubmissionDetailTabViewModel[] = [];
  selectedSubmissionDetailTabId: number | null = null;

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;
  private lastInboxIdentifier: string | null = null;

  constructor(
    private runtimeService: ApprovalWorkflowRuntimeService,
    private stageAssigneesService: ApprovalStageAssigneesService,
    private approvalStageService: ApprovalStageService,
    private formSubmissionsService: FormSubmissionsService,
    private approvalDelegationService: ApprovalDelegationService,
    private storageService: StorageService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService,
    private tabsService: TabsService,
    private fieldsService: FieldsService
  ) {
    this.actionForm = this.fb.group({
      comments: ['']
    });
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
    }

    // ✅ Check if user is Admin

    // Get current user ID - try multiple sources
    // First try: getUserId from storage
    let userId = this.storageService.getUserId();
    // Second try: get username from storage
    let username = this.storageService.getUsername() || this.authService.userName();
    
    // Third try: Extract userId from JWT token if not found
    if (!userId) {
      const token = this.storageService.getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Try different possible claims for userId
          const tokenUserId = payload.userId || payload.sub || payload.nameid || payload.unique_name;
          if (tokenUserId) {
            userId = typeof tokenUserId === 'string' && !isNaN(parseInt(tokenUserId, 10)) 
              ? parseInt(tokenUserId, 10) 
              : null;
            console.log('[ApprovalInbox] Extracted userId from JWT token:', userId);
          }
        } catch (e) {
          console.warn('[ApprovalInbox] Could not extract userId from token:', e);
        }
      }
    }
    
    // Store both separately
    this.currentUsername = username || null;
    
    // IMPORTANT: Backend may use userId OR username for Stage Assignees
    // Priority: userId (number) > username (string)
    // We'll try userId first, then username if userId doesn't work
    this.currentUserId = userId?.toString() || username || null;
    
    console.log('========================================');
    console.log('[ApprovalInbox] 🔍 User Identification');
    console.log('========================================');
    console.log('userId from storage:', userId);
    console.log('username from storage:', username);
    console.log('currentUserId (will try first):', this.currentUserId);
    console.log('currentUsername (fallback):', this.currentUsername);
    console.log('hasToken:', this.storageService.hasToken());
    console.log('Note: Will try userId first, then username if needed');
    console.log('========================================');
    
    if (this.currentUserId) {
      // Load inbox - this will show only items where user is assigned as Stage Assignee
      this.loadInbox();
    } else {
      console.error('[ApprovalInbox] No user ID or username found');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'User ID not found. Please log in again.'
      });
    }
  }

  loadInbox(): void {
    if (!this.currentUserId) return;

    // Log all possible user identifiers for debugging
    const userId = this.storageService.getUserId();
    const username = this.storageService.getUsername();
    const role = this.storageService.getRole();
    
    console.log('[ApprovalInbox] Loading inbox with user info:', {
      currentUserId: this.currentUserId,
      userIdFromStorage: userId,
      usernameFromStorage: username,
      roleFromStorage: role,
      authServiceUserName: this.authService.userName(),
      apiUrl: `${this.runtimeService['baseUrl']}/inbox/${encodeURIComponent(this.currentUserId)}`
    });

    this.loading.inbox = true;
    
    // First, check for active delegations
    console.log('[ApprovalInbox] Checking active delegations for user:', this.currentUserId);
    this.approvalDelegationService.getActiveDelegationsForUser(this.currentUserId).subscribe({
      next: (delegations: ApprovalDelegationDto[]) => {
        console.log('[ApprovalInbox] Active delegations response received');
        console.log('[ApprovalInbox] Delegations type:', typeof delegations);
        console.log('[ApprovalInbox] Delegations is array:', Array.isArray(delegations));
        console.log('[ApprovalInbox] Delegations length:', delegations?.length || 0);
        console.log('[ApprovalInbox] Full delegations object:', delegations);
        
        if (delegations && delegations.length > 0) {
          console.log('[ApprovalInbox] ✅ User has active delegations - loading inbox with delegations');
          console.log('[ApprovalInbox] Delegations details:', delegations.map(d => ({
            id: d.id,
            fromUserId: d.fromUserId,
            toUserId: d.toUserId,
            scopeType: d.scopeType,
            scopeId: d.scopeId,
            isActive: d.isActive,
            startDate: d.startDate,
            endDate: d.endDate
          })));
          // User has active delegations - load inbox for both current user and delegated users
          this.loadInboxWithDelegations(delegations);
        } else {
          console.log('[ApprovalInbox] ⚠️ No active delegations found for user:', this.currentUserId);
          console.log('[ApprovalInbox] This could mean:');
          console.log('[ApprovalInbox]   1. No delegation exists for this user');
          console.log('[ApprovalInbox]   2. Delegation exists but isActive = false');
          console.log('[ApprovalInbox]   3. Delegation exists but current date is outside startDate/endDate range');
          console.log('[ApprovalInbox]   4. Delegation exists but toUserId does not match current user');
          // No delegations - clear active delegations and load inbox for current user only
          this.activeDelegations = [];
          this.loadInboxWithUserId(this.currentUserId);
        }
      },
      error: (error) => {
        console.error('[ApprovalInbox] ❌ Error checking delegations:', error);
        console.error('[ApprovalInbox] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        // Fallback to loading inbox for current user only
        this.activeDelegations = [];
        this.loadInboxWithUserId(this.currentUserId);
      }
    });
  }
  
  /**
   * Load inbox with delegations - includes inbox items for delegated users
   */
  private loadInboxWithDelegations(delegations: ApprovalDelegationDto[]): void {
    this.lastInboxIdentifier = null;
    const now = new Date();
    const activeDelegations = delegations.filter(d => {
      if (d.isActive === false) return false;
      const startDate = new Date(d.startDate);
      const endDate = new Date(d.endDate);
      return now >= startDate && now <= endDate;
    });
    
    console.log('[ApprovalInbox] Active delegations (within date range):', activeDelegations.length);
    
    // Get unique fromUserIds from active delegations
    const fromUserIds = [...new Set(activeDelegations.map(d => d.fromUserId).filter(id => id))];
    console.log('[ApprovalInbox] Delegated from user IDs:', fromUserIds);
    
    // Load inbox for current user
    const currentUserInbox$ = this.runtimeService.getApprovalInboxForUser(this.currentUserId!);
    
    // Load inbox for each delegated user
    const delegatedInboxes$ = fromUserIds.map(fromUserId => 
      this.runtimeService.getApprovalInboxForUser(fromUserId).pipe(
        catchError(error => {
          console.error(`[ApprovalInbox] Error loading inbox for delegated user ${fromUserId}:`, error);
          return of([]);
        })
      )
    );
    
    // Combine all inbox requests
    const allInboxRequests$ = [currentUserInbox$, ...delegatedInboxes$];
    
    forkJoin(allInboxRequests$).subscribe({
      next: (results: ApprovalInboxItemDto[][]) => {
        // Merge all inbox items
        const allItems: ApprovalInboxItemDto[] = [];
        results.forEach((items, index) => {
          if (index === 0) {
            // Current user's inbox
            console.log(`[ApprovalInbox] Current user inbox items:`, items.length);
          } else {
            // Delegated user's inbox
            console.log(`[ApprovalInbox] Delegated user (${fromUserIds[index - 1]}) inbox items:`, items.length);
          }
          allItems.push(...items);
        });
        
        // Filter and process items
        const assignedItems = allItems.filter(item => {
          const stageId = item.stageId;
          return stageId !== null && stageId !== undefined && stageId > 0;
        });
        
        // Remove duplicates based on submissionId and stageId
        const uniqueItems = assignedItems.filter((item, index, self) =>
          index === self.findIndex(t => t.submissionId === item.submissionId && t.stageId === item.stageId)
        );
        
        console.log(`[ApprovalInbox] Total unique inbox items (including delegations):`, uniqueItems.length);
        
        this.inboxItems = this.sortInboxItemsByNewest(uniqueItems);
        this.filteredItems = [...this.inboxItems];
        this.totalRecords = this.filteredItems.length;
        this.loading.inbox = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[ApprovalInbox] Error loading inbox with delegations:', error);
        // Fallback to loading inbox for current user only
        this.loadInboxWithUserId(this.currentUserId);
      }
    });
  }

  /**
   * Load inbox with specific userId/username
   */
  private loadInboxWithUserId(userIdentifier: string | null, isRetry: boolean = false): void {
    if (!userIdentifier) {
      this.loading.inbox = false;
      return;
    }

    this.lastInboxIdentifier = userIdentifier;

    const page = Math.floor(this.first / this.rows) + 1;
    this.runtimeService.getApprovalInboxForUserPaged(userIdentifier, page, this.rows, this.searchTerm).subscribe({
      next: (result: PagedApprovalInboxResult) => {
        const assignedItems = this.sortInboxItemsByNewest(result.items || []);

        this.inboxItems = assignedItems;
        this.filteredItems = [...assignedItems];

        if (!isRetry) {
          this.activeDelegations = [];
        }

        this.totalRecords = result.totalCount || 0;
        this.loading.inbox = false;

        if (this.totalRecords > 0 && this.first >= this.totalRecords) {
          this.first = 0;
          this.loadInboxWithUserId(userIdentifier, isRetry);
          return;
        }

        if (assignedItems.length === 0 && this.totalRecords === 0 && !isRetry) {
          if (userIdentifier === this.currentUserId && this.currentUsername && this.currentUsername !== this.currentUserId) {
            this.loadInboxWithUserId(this.currentUsername, true);
            return;
          }

          if (userIdentifier === this.currentUsername) {
            const userId = this.storageService.getUserId();
            if (userId && userId.toString() !== this.currentUsername) {
              this.loadInboxWithUserId(userId.toString(), true);
              return;
            }
          }
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading inbox:', error);
        this.inboxItems = [];
        this.filteredItems = [];
        this.loading.inbox = false;

        let errorMessage = 'Failed to load approval inbox.';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.errorMessage) {
            errorMessage = error.error.errorMessage;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage + ' Please verify that you are assigned as Stage Assignee for at least one stage.',
          life: 8000
        });
        this.cdr.detectChanges();
      }
    });
    return;

    console.log('========================================');
    console.log('[ApprovalInbox] 📥 Loading Inbox');
    console.log('========================================');
    console.log('User Identifier:', userIdentifier);
    console.log('Is Retry:', isRetry);
    console.log('API URL:', `${this.runtimeService['baseUrl']}/inbox/${encodeURIComponent(userIdentifier || '')}`);
    console.log('========================================');
    
    this.runtimeService.getApprovalInboxForUser(userIdentifier || '').subscribe({
      next: (items: ApprovalInboxItemDto[]) => {
        // IMPORTANT: Filter out items with stageId = 0 (NOT ASSIGNED TO YOU)
        // Only show items where user is actually assigned as Stage Assignee
        const allItems = items || [];
        
        // Strict filtering: Only items with stageId > 0 are assigned to this user
        // Items with stageId = 0, null, undefined, or negative are NOT assigned
        const assignedItems = allItems.filter(item => {
          const stageId = item.stageId;
          return stageId !== null && stageId !== undefined && stageId > 0;
        });
        
        const unassignedItems = allItems.filter(item => {
          const stageId = item.stageId;
          return stageId === null || stageId === undefined || stageId === 0 || stageId < 0;
        });
        
        // CRITICAL: Only show assigned items - this ensures only the selected user in Stage Assignees can approve/reject
        // If user is not in Stage Assignees, inboxItems will be empty (no items shown)
        // IMPORTANT: Backend should only return items with stageId > 0 if user is in Stage Assignees
        // If Backend returns items with stageId > 0 but user is NOT in Stage Assignees, this is a Backend issue
        this.inboxItems = this.sortInboxItemsByNewest(assignedItems);
        this.filteredItems = [...this.inboxItems];
        
        // Clear active delegations if loading inbox without delegations
        if (!isRetry) {
          this.activeDelegations = [];
        }
        this.totalRecords = this.filteredItems.length;
        this.loading.inbox = false;
        
        // Additional verification: Log warning if items are shown but user might not be in Stage Assignees
        if (assignedItems.length > 0) {
          console.log('[ApprovalInbox] ⚠️ IMPORTANT: Verifying user assignment...');
          console.log('[ApprovalInbox] Items shown:', assignedItems.length);
          console.log('[ApprovalInbox] User identifier:', userIdentifier);
          console.log('[ApprovalInbox] Please verify in Backend that this user is in Stage Assignees');
        }
        
        console.log('========================================');
        console.log('[ApprovalInbox] ✅ Response Received');
        console.log('========================================');
        console.log('User Identifier:', userIdentifier);
        console.log('Is Retry:', isRetry);
        console.log('Total Items from Backend:', allItems.length);
        console.log('Assigned Items (stageId > 0):', assignedItems.length);
        console.log('Unassigned Items (stageId = 0):', unassignedItems.length);
        console.log('Items Shown (filtered):', this.inboxItems.length);
        console.log('Assigned Items Details:', assignedItems.map(item => ({
          submissionId: item.submissionId,
          stageId: item.stageId,
          stageName: item.stageName,
          documentNumber: item.documentNumber,
          workflowId: item.workflowId,
          workflowName: item.workflowName
        })));
        if (unassignedItems.length > 0) {
          console.log('Unassigned Items (hidden):', unassignedItems.map(item => ({
            submissionId: item.submissionId,
            stageId: item.stageId,
            stageName: item.stageName,
            documentNumber: item.documentNumber
          })));
        }
        console.log('========================================');
        
        // If no assigned items found, try alternative user identifier
        if (assignedItems.length === 0 && unassignedItems.length > 0) {
          console.warn('========================================');
          console.warn('[ApprovalInbox] ⚠️ NO ASSIGNED ITEMS FOUND');
          console.warn('========================================');
          console.warn('All items have stageId = 0 (not assigned to you)');
          console.warn('This means backend does NOT recognize user as Stage Assignee');
          console.warn('User identifier used:', userIdentifier);
          console.warn('Unassigned items (hidden):', unassignedItems.length);
          console.warn('========================================');
          
          // Try alternative identifier if this is first attempt
          if (!isRetry) {
            // If we used userId, try with username
            if (userIdentifier === this.currentUserId && this.currentUsername && this.currentUsername !== this.currentUserId) {
              console.log('[ApprovalInbox] Retrying with username instead of userId...');
              console.log('[ApprovalInbox] userId tried:', this.currentUserId, 'username will try:', this.currentUsername);
              this.loadInboxWithUserId(this.currentUsername, true);
              return; // Don't update UI yet, wait for retry
            }
            // If we used username, try with userId
            else if (userIdentifier === this.currentUsername) {
              const userId = this.storageService.getUserId();
              if (userId && userId.toString() !== this.currentUsername) {
                console.log('[ApprovalInbox] Retrying with userId instead of username...');
                console.log('[ApprovalInbox] username tried:', this.currentUsername, 'userId will try:', userId.toString());
                this.loadInboxWithUserId(userId.toString(), true);
                return; // Don't update UI yet, wait for retry
              }
            }
          }
          
          // If both attempts failed or no alternative identifier, show message
          console.warn('========================================');
          console.warn('User is NOT assigned as Stage Assignee');
          console.warn('Checked identifiers:', {
            userId: this.storageService.getUserId(),
            username: this.currentUsername,
            tried: userIdentifier
          });
          console.warn('========================================');
          console.warn('Please verify:');
          console.warn('1. User is assigned in Stage Assignees');
          console.warn('2. userId/username in Stage Assignees matches logged-in user');
          console.warn('3. Stage Assignees are active (IsActive = true)');
          console.warn('4. There are submissions with Status = "Submitted" in the assigned stages');
          console.warn('========================================');
          
          // Show warning message - user is not assigned as Stage Assignee
          this.messageService.add({
            severity: 'warn',
            summary: 'لا توجد موافقات مخصصة لك',
            detail: `You are not assigned as Stage Assignee for any stage. User ID tried: ${userIdentifier}. Please verify Stage Assignees configuration.`,
            life: 12000
          });
        } else if (assignedItems.length > 0) {
          console.log('[ApprovalInbox] ✅ Successfully loaded', assignedItems.length, 'assigned items');
          if (isRetry) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Found ${assignedItems.length} items using ${userIdentifier}`,
              life: 5000
            });
          }
        } else if (allItems.length === 0) {
          console.log('[ApprovalInbox] ⚠️ Backend returned empty inbox array');
          console.log('[ApprovalInbox] This could mean:');
          console.log('  1. User is not assigned as Stage Assignee in any stage');
          console.log('  2. No submissions exist with Status = "Submitted"');
          console.log('  3. userId/username mismatch between login and Stage Assignees');
          console.log('  4. Stage Assignees exist but IsActive = false');
          console.log('[ApprovalInbox] User identifier used:', userIdentifier);
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading inbox:', error);
        this.inboxItems = [];
        this.filteredItems = [];
        this.loading.inbox = false;
        
        let errorMessage = 'Failed to load approval inbox.';
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.errorMessage) {
            errorMessage = error.error.errorMessage;
          }
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage + ' Please verify that you are assigned as Stage Assignee for at least one stage.',
          life: 8000
        });
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Refresh inbox (only items where user is assigned as Stage Assignee)
   */
  refreshData(): void {
    this.loadInbox();
  }

  filterItems(): void {
    // CRITICAL: Always filter to show only assigned items (stageId > 0)
    const assignedItems = this.sortInboxItemsByNewest(this.inboxItems.filter(item => item.stageId > 0));
    
    if (!this.searchTerm.trim()) {
      this.filteredItems = assignedItems;
      this.totalRecords = this.filteredItems.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredItems = assignedItems.filter(item =>
      item.documentNumber?.toLowerCase().includes(term) ||
      item.documentTypeName?.toLowerCase().includes(term) ||
      item.stageName?.toLowerCase().includes(term) ||
      item.submittedByUserName?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredItems.length;
  }

  onSearchChange(): void {
    this.first = 0;

    if (this.lastInboxIdentifier && this.activeDelegations.length === 0) {
      this.loadInboxWithUserId(this.lastInboxIdentifier);
      return;
    }

    this.filterItems();
  }

  getPaginatedItems(): ApprovalInboxItemDto[] {
    if (this.lastInboxIdentifier && this.activeDelegations.length === 0) {
      return this.filteredItems;
    }

    const start = this.first;
    const end = start + this.rows;
    return this.filteredItems.slice(start, end);
  }

  private sortInboxItemsByNewest(items: ApprovalInboxItemDto[]): ApprovalInboxItemDto[] {
    return [...items].sort((a, b) => {
      const dateDiff = this.getComparableDateValue(b.submittedDate) - this.getComparableDateValue(a.submittedDate);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return (b.submissionId || 0) - (a.submissionId || 0);
    });
  }

  private sortSubmissionsByNewest(items: FormSubmissionDto[]): FormSubmissionDto[] {
    return [...items].sort((a, b) => {
      const dateDiff = this.getComparableDateValue(
        b.lastUpdatedDate || b.submittedDate || b.createdDate
      ) - this.getComparableDateValue(
        a.lastUpdatedDate || a.submittedDate || a.createdDate
      );

      if (dateDiff !== 0) {
        return dateDiff;
      }

      return (b.id || 0) - (a.id || 0);
    });
  }

  private getComparableDateValue(value: Date | string | null | undefined): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;

    if (this.lastInboxIdentifier && this.activeDelegations.length === 0) {
      this.loadInboxWithUserId(this.lastInboxIdentifier);
    }
  }

  /**
   * Check if user can approve/reject this item
   * User can approve if:
   * 1. User is admin, OR
   * 2. Item is in inboxItems (user is assigned as Stage Assignee with stageId > 0), OR
   * 3. User has active delegation and item is from delegated user
   */
  canApproveReject(item: ApprovalInboxItemDto | null): boolean {
    return !!item;
    /*
    if (!item) return false;
    
    // Admin can always approve
    if (this.isAdmin) {
      return true;
    }
    
    // Verify item has valid stageId (stageId > 0 means assigned)
    const hasValidStageId = item.stageId !== null && item.stageId !== undefined && item.stageId > 0;
    
    if (!hasValidStageId) {
      return false;
    }
    
    // Verify item exists in inboxItems (defensive check - items in table should be in inboxItems)
    // Use flexible comparison to handle type mismatches
    const isInInbox = this.inboxItems.some(inboxItem => {
      const submissionMatch = 
        inboxItem.submissionId === item.submissionId ||
        Number(inboxItem.submissionId) === Number(item.submissionId) ||
        String(inboxItem.submissionId) === String(item.submissionId);
      
      const stageMatch = 
        inboxItem.stageId === item.stageId ||
        Number(inboxItem.stageId) === Number(item.stageId);
      
      return submissionMatch && stageMatch;
    });
    
    // If item is in inbox, user can approve (either directly assigned or via delegation)
    if (isInInbox) {
      return true;
    }
    
    // Check if user has active delegation that covers this item
    if (this.activeDelegations && this.activeDelegations.length > 0) {
      const now = new Date();
      const hasActiveDelegation = this.activeDelegations.some(delegation => {
        // Check if delegation is active and within date range
        if (delegation.isActive === false) return false;
        const startDate = new Date(delegation.startDate);
        const endDate = new Date(delegation.endDate);
        if (now < startDate || now > endDate) return false;
        
        // Check scope type
        if (delegation.scopeType === 'Global') {
          // Global delegation - can approve all items
          return true;
        } else if (delegation.scopeType === 'Workflow') {
          // Workflow-specific delegation - check if item's workflow matches
          // Note: We need workflowId from item to check this
          // For now, if item is in inbox from delegated user, allow it
          return true;
        } else if (delegation.scopeType === 'Document') {
          // Document-specific delegation - check if item's submissionId matches
          const delegationScopeId = delegation.scopeId ? Number(delegation.scopeId) : null;
          const itemSubmissionId = item.submissionId ? Number(item.submissionId) : null;
          return delegationScopeId !== null && itemSubmissionId !== null && delegationScopeId === itemSubmissionId;
        }
        
        return false;
      });
      
      if (hasActiveDelegation) {
        console.log('[ApprovalInbox] ✅ Permission granted via delegation:', {
          submissionId: item.submissionId,
          stageId: item.stageId
        });
        return true;
      }
    }
    
    return false;
    */
  }

  /**
   * Check if user can approve/reject this submission
   * For submissions table, check if there's a corresponding inbox item or active delegation
   */
  canApproveRejectSubmission(submission: FormSubmissionDto | null): boolean {
    return !!submission;
    /*
    if (!submission) return false;

    // Admin can always approve
    if (this.isAdmin) {
      return true;
    }

    // Non-admin users can approve ONLY if submission exists in inboxItems.
    // Delegation handling is already resolved while loading inboxItems.
    const hasInboxItem = this.inboxItems.some(item => {
      const itemSubId = Number(item.submissionId);
      const subId = Number(submission.id);
      return itemSubId === subId || String(item.submissionId) === String(submission.id);
    });

    return hasInboxItem;
    */
  }

  private setPageAccessNotice(message: string): void {
    this.pageAccessNotice = message;
    this.cdr.detectChanges();
  }

  private clearPageAccessNotice(): void {
    if (!this.pageAccessNotice) {
      return;
    }

    this.pageAccessNotice = null;
    this.cdr.detectChanges();
  }

  private handlePermissionDenied(message: string): void {
    this.loading.action = false;
    return;
    this.closeActionModal();
    this.setPageAccessNotice(message);
  }

  openActionModal(item: ApprovalInboxItemDto, actionType: 'Approved' | 'Rejected' | 'Returned'): void {
    this.selectedItem = item;
    this.selectedSubmission = null;
    this.isSubmissionAction = false;
    this.actionType = actionType;
    this.showActionModal = true;
    this.actionForm.reset({ comments: '' });
    
    // Reset amount validation
    this.currentStage = null;
    this.submissionDetail = null;
    this.amountValidationError = '';
    this.isAmountValid = true;
    
    // Load stage and submission details for amount validation
    if (item.stageId > 0) {
      this.loadStageAndSubmissionForValidation(item.stageId, item.submissionId);
    }
  }

  /**
   * Open action modal for submission (from all submissions table)
   */
  openActionModalForSubmission(submission: FormSubmissionDto, actionType: 'Approved' | 'Rejected' | 'Returned'): void {
    this.selectedSubmission = submission;
    this.selectedItem = null;
    this.isSubmissionAction = true;
    this.actionType = actionType;
    this.showActionModal = true;
    this.actionForm.reset({ comments: '' });
  }

  processAction(): void {
    if (this.loading.action) {
      return;
    }

    console.log('[ApprovalInbox] processAction called');
    console.log('[ApprovalInbox] selectedItem:', this.selectedItem);
    console.log('[ApprovalInbox] selectedSubmission:', this.selectedSubmission);
    console.log('[ApprovalInbox] isSubmissionAction:', this.isSubmissionAction);
    console.log('[ApprovalInbox] currentUserId:', this.currentUserId);
    console.log('[ApprovalInbox] actionType:', this.actionType);
    console.log('[ApprovalInbox] form valid:', this.actionForm.valid);
    console.log('[ApprovalInbox] form value:', this.actionForm.value);

    // Check if this is a submission action (from all submissions table)
    if (this.isSubmissionAction && this.selectedSubmission) {
      this.processSubmissionAction();
      return;
    }

    if (!this.selectedItem) {
      console.error('[ApprovalInbox] No selected item');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No item selected'
      });
      return;
    }

    // CRITICAL: Check if user is assigned to this stage (only items from inbox can be approved)
    // If stageId is 0 or item is not in inbox, user is not assigned
    // This is a security check to prevent unauthorized approvals
    if (false) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: User tried to approve item with stageId = 0');
      console.error('[ApprovalInbox] This should not happen - item should be filtered out');
      this.handlePermissionDenied('ليس لديك صلاحية تنفيذ هذا الإجراء على هذا المستند.');
      return;
    }
    
    // Double-check: Verify item is in inboxItems (assigned items)
    const isInInbox = this.inboxItems.find(item => 
      item.submissionId === this.selectedItem!.submissionId && 
      item.stageId === this.selectedItem!.stageId &&
      item.stageId > 0
    );
    
    if (false && !isInInbox) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: Item not found in inbox items');
      console.error('[ApprovalInbox] Item:', this.selectedItem);
      console.error('[ApprovalInbox] Inbox items:', this.inboxItems.map(i => ({ submissionId: i.submissionId, stageId: i.stageId })));
      this.handlePermissionDenied('ليس لديك صلاحية تنفيذ هذا الإجراء على هذا المستند.');
      return;
    }

    // Try to get user ID again if not set
    if (!this.currentUserId) {
      const userId = this.storageService.getUserId();
      const username = this.storageService.getUsername() || this.authService.userName();
      this.currentUserId = userId?.toString() || username || null;
      
      console.log('[ApprovalInbox] Retrying to get user ID:', {
        userId: userId,
        username: username,
        currentUserId: this.currentUserId
      });
    }

    if (!this.currentUserId) {
      console.error('[ApprovalInbox] No current user ID or username found');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User ID not found. Please log in again.'
      });
      return;
    }

    this.loading.action = true;
    const formData = this.actionForm.value;
    console.log('[ApprovalInbox] Form data:', formData);

    // If stageId is 0, try to get it from inbox first
    let stageId = this.selectedItem.stageId;
    console.log('[ApprovalInbox] Current stageId:', stageId);

    if (stageId === 0 || !stageId) {
      console.log('[ApprovalInbox] StageId is 0, trying to get from inbox or use direct endpoints');
      // Try to get stageId from the actual inbox
        this.runtimeService.getApprovalInboxForUser(this.currentUserId || '').subscribe({
        next: (inboxItems: ApprovalInboxItemDto[]) => {
          console.log('[ApprovalInbox] Inbox items received:', inboxItems);
          const inboxItem = inboxItems.find(item => item.submissionId === this.selectedItem!.submissionId);
          if (inboxItem && inboxItem.stageId > 0) {
            stageId = inboxItem.stageId;
            console.log('[ApprovalInbox] Found stageId from inbox:', stageId);
            this.executeAction(stageId, formData);
          } else {
            console.warn('[ApprovalInbox] StageId not found in inbox, trying to activate stage or use direct endpoints');
            // Try to activate stage first, then use direct endpoints if needed
            this.tryActivateStageAndProcess(formData);
          }
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error getting inbox items:', error);
          // Try to activate stage or use direct endpoints
          this.tryActivateStageAndProcess(formData);
        }
      });
    } else {
      console.log('[ApprovalInbox] Using existing stageId:', stageId);
      this.executeAction(stageId, formData);
    }
  }

  /**
   * Try to activate stage and then process action
   */
  private tryActivateStageAndProcess(formData: any): void {
    if (!this.selectedItem) {
      this.loading.action = false;
      return;
    }

    // Check submission status first - if it's Pending, we can't activate stage
    // activate-stage requires status = "Submitted", but we changed it to "Pending"
    // So we'll use direct endpoints for Pending status
    console.log('[ApprovalInbox] Checking submission status before activating stage');
    this.formSubmissionsService.getSubmissionById(this.selectedItem.submissionId).subscribe({
      next: (submission) => {
        const status = submission.status;
        console.log('[ApprovalInbox] Submission status:', status);
        
        // If status is Pending, use direct endpoints (can't activate stage for Pending)
        if (status === 'Pending') {
          console.log('[ApprovalInbox] Submission is Pending, using direct approve/reject endpoints (activate-stage requires Submitted status)');
          this.processActionDirectly(formData);
          return;
        }
        
        // If status is Submitted, try to activate stage
        if (status === 'Submitted') {
          console.log('[ApprovalInbox] Submission is Submitted, trying to activate stage');
          this.runtimeService.activateStage(this.selectedItem!.submissionId).subscribe({
            next: () => {
              console.log('[ApprovalInbox] Stage activated, retrying to get stageId');
              // Retry getting stageId from inbox
              if (!this.currentUserId) {
                this.processActionDirectly(formData);
                return;
              }
    this.runtimeService.getApprovalInboxForUser(this.currentUserId || '').subscribe({
                next: (inboxItems: ApprovalInboxItemDto[]) => {
                  const inboxItem = inboxItems.find(item => item.submissionId === this.selectedItem!.submissionId);
                  if (inboxItem && inboxItem.stageId > 0) {
                    console.log('[ApprovalInbox] Found stageId after activation:', inboxItem.stageId);
                    this.processActionWithStageId(inboxItem.stageId, formData);
                  } else {
                    console.log('[ApprovalInbox] StageId still not found, using direct approve/reject endpoints');
                    this.processActionDirectly(formData);
                  }
                },
                error: () => {
                  console.log('[ApprovalInbox] Error getting inbox after activation, using direct endpoints');
                  this.processActionDirectly(formData);
                }
              });
            },
            error: (error) => {
              console.error('[ApprovalInbox] Error activating stage:', error);
              // Use direct approve/reject endpoints as fallback
              console.log('[ApprovalInbox] Using direct approve/reject endpoints');
              this.processActionDirectly(formData);
            }
          });
        } else {
          // For other statuses (Approved, Rejected), use direct endpoints
          console.log('[ApprovalInbox] Submission status is', status, ', using direct endpoints');
          this.processActionDirectly(formData);
        }
      },
      error: (error) => {
        console.error('[ApprovalInbox] Error getting submission:', error);
        // Use direct endpoints as fallback
        console.log('[ApprovalInbox] Using direct approve/reject endpoints as fallback');
        this.processActionDirectly(formData);
      }
    });
  }

  /**
   * Execute the approval/reject action
   */
  private executeAction(stageId: number, formData: any): void {
    console.log('[ApprovalInbox] executeAction called with stageId:', stageId);
    
    if (!this.selectedItem || !this.currentUserId) {
      console.error('[ApprovalInbox] Missing selectedItem or currentUserId');
      this.loading.action = false;
      return;
    }

    // If stageId is 0 or invalid, try to activate stage first or use approve/reject endpoints directly
    if (stageId === 0 || !stageId) {
      console.log('[ApprovalInbox] StageId is invalid, trying to activate stage or use direct approve/reject');
      
      // Try to activate stage first
      this.runtimeService.activateStage(this.selectedItem.submissionId).subscribe({
        next: () => {
          console.log('[ApprovalInbox] Stage activated successfully, retrying to get stageId');
          // Retry getting stageId from inbox after activation
          if (!this.currentUserId) {
            this.processActionDirectly(formData);
            return;
          }
    this.runtimeService.getApprovalInboxForUser(this.currentUserId || '').subscribe({
            next: (inboxItems: ApprovalInboxItemDto[]) => {
              const inboxItem = inboxItems.find(item => item.submissionId === this.selectedItem!.submissionId);
              if (inboxItem && inboxItem.stageId > 0) {
                console.log('[ApprovalInbox] Found stageId after activation:', inboxItem.stageId);
                this.processActionWithStageId(inboxItem.stageId, formData);
              } else {
                console.log('[ApprovalInbox] StageId still not found, using direct approve/reject endpoints');
                this.processActionDirectly(formData);
              }
            },
            error: () => {
              console.log('[ApprovalInbox] Error getting inbox after activation, using direct endpoints');
              this.processActionDirectly(formData);
            }
          });
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error activating stage:', error);
          // If activation fails, try direct approve/reject endpoints
          console.log('[ApprovalInbox] Using direct approve/reject endpoints');
          this.processActionDirectly(formData);
        }
      });
    } else {
      // Use process-action with valid stageId
      this.processActionWithStageId(stageId, formData);
    }
  }

  /**
   * Process action using process-action endpoint with stageId
   * 
   * IMPORTANT: Backend should verify delegations automatically when processing the action.
   * The backend should:
   * 1. Check if actionByUserId has active delegations
   * 2. If delegation exists, verify that the action is allowed (scope type, date range, etc.)
   * 3. If delegation is valid, process the action on behalf of the original approver (fromUserId)
   */
  private processActionWithStageId(stageId: number, formData: any): void {
    if (!this.selectedItem || !this.currentUserId) {
      this.loading.action = false;
      return;
    }

    const rawComments = formData?.comments;
    const normalizedComments =
      typeof rawComments === 'string' ? rawComments.trim() : rawComments;

    // Check if user has active delegation for this action
    const hasDelegation = this.activeDelegations && this.activeDelegations.length > 0;
    if (hasDelegation) {
      console.log('[ApprovalInbox] ⚠️ User has active delegations. Backend should verify delegation when processing action.');
      console.log('[ApprovalInbox] Active delegations:', this.activeDelegations);
    }

    const actionDto: ProcessApprovalActionDto = {
      submissionId: this.selectedItem.submissionId,
      stageId: stageId,
      actionType: this.actionType,
      actionByUserId: this.currentUserId, // This is the delegated user (toUserId)
      // NOTE: Backend should resolve the original approver (fromUserId) from delegations
      ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
        ? { comments: normalizedComments }
        : {})
    };

    console.log('[ApprovalInbox] Processing action with stageId:', actionDto);
    console.log('[ApprovalInbox] ⚠️ Backend should check delegations for actionByUserId:', this.currentUserId);

    // Let the backend own the workflow status transition.
    // It knows whether the current vote only increments counters
    // or actually reaches the required approval/rejection threshold.
    this.processApprovalAction(actionDto, '');
  }

  /**
   * Process action directly using approve/reject endpoints (when stageId is not available)
   * 
   * IMPORTANT: Backend should verify delegations automatically when processing the action.
   * The backend should:
   * 1. Check if actionByUserId has active delegations
   * 2. If delegation exists, verify that the action is allowed (scope type, date range, etc.)
   * 3. If delegation is valid, process the action on behalf of the original approver (fromUserId)
   */
  private processActionDirectly(formData: any): void {
    if (!this.selectedItem || !this.currentUserId) {
      this.loading.action = false;
      return;
    }

    console.log('[ApprovalInbox] Processing action directly without stageId');
    
    // Check if user has active delegation for this action
    const hasDelegation = this.activeDelegations && this.activeDelegations.length > 0;
    if (hasDelegation) {
      console.log('[ApprovalInbox] ⚠️ User has active delegations. Backend should verify delegation when processing action.');
      console.log('[ApprovalInbox] Active delegations:', this.activeDelegations);
    }

    // Determine the new status based on action type
    let newStatus = '';
    if (this.actionType === 'Approved') {
      newStatus = 'Approved';
    } else if (this.actionType === 'Rejected') {
      newStatus = 'Rejected';
    } else if (this.actionType === 'Returned') {
      newStatus = 'Pending';
    }

    // Use approve/reject endpoints directly (they handle stageId internally)
    const rawComments = formData?.comments;
    const normalizedComments =
      typeof rawComments === 'string' ? rawComments.trim() : rawComments;

    if (this.actionType === 'Approved') {
      // Use approveSubmissionDto with default stageId = 1
      const approveDto = {
        submissionId: this.selectedItem.submissionId,
        stageId: 1, // Default stageId
        actionByUserId: this.currentUserId, // This is the delegated user (toUserId)
        // NOTE: Backend should resolve the original approver (fromUserId) from delegations
        ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
          ? { comments: normalizedComments }
          : {})
      };
      
      console.log('[ApprovalInbox] ⚠️ Backend should check delegations for actionByUserId:', this.currentUserId);
      console.log('[ApprovalInbox] Approve DTO:', approveDto);
      
      this.formSubmissionsService.approveSubmissionDto(approveDto).subscribe({
        next: (response) => {
          console.log('[ApprovalInbox] Approval successful:', response);
          this.loading.action = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: response.message || 'Document approved successfully',
            life: 3000
          });
          this.removeProcessedItemFromLists(this.selectedItem!.submissionId);
          this.closeActionModal();
          this.loadInbox();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error approving:', error);
          let errorMessage = error?.message || error?.error?.message || 'Failed to approve document';
          if (false && (error?.status === 400 || error?.status === 403)) {
            this.handlePermissionDenied(errorMessage);
            return;
          }
          this.loading.action = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.cdr.detectChanges();
        }
      });
    } else if (this.actionType === 'Rejected') {
      // Use rejectSubmissionDto with default stageId = 1
      const rejectDto = {
        submissionId: this.selectedItem.submissionId,
        stageId: 1, // Default stageId
        actionByUserId: this.currentUserId, // This is the delegated user (toUserId)
        // NOTE: Backend should resolve the original approver (fromUserId) from delegations
        ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
          ? { comments: normalizedComments }
          : {})
      };
      
      console.log('[ApprovalInbox] ⚠️ Backend should check delegations for actionByUserId:', this.currentUserId);
      console.log('[ApprovalInbox] Reject DTO:', rejectDto);
      
      this.formSubmissionsService.rejectSubmissionDto(rejectDto).subscribe({
        next: (response) => {
          console.log('[ApprovalInbox] Rejection successful:', response);
          this.loading.action = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: response.message || 'Document rejected successfully',
            life: 3000
          });
          this.removeProcessedItemFromLists(this.selectedItem!.submissionId);
          this.closeActionModal();
          this.loadInbox();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error rejecting:', error);
          let errorMessage = error?.message || error?.error?.message || 'Failed to reject document';
          if (false && (error?.status === 400 || error?.status === 403)) {
            this.handlePermissionDenied(errorMessage);
            return;
          }
          this.loading.action = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // For Returned, use process-action with default stageId
      const actionDto: ProcessApprovalActionDto = {
        submissionId: this.selectedItem.submissionId,
        stageId: 1,
        actionType: this.actionType,
        actionByUserId: this.currentUserId,
        ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
          ? { comments: normalizedComments }
          : {})
      };
      this.processApprovalAction(actionDto, newStatus);
    }
  }

  /**
   * Process the approval action after status update
   * 
   * IMPORTANT: Backend should verify delegations automatically when processing the action.
   * The backend should:
   * 1. Check if actionByUserId has active delegations
   * 2. If delegation exists, verify that the action is allowed (scope type, date range, etc.)
   * 3. If delegation is valid, process the action on behalf of the original approver (fromUserId)
   */
  private processApprovalAction(actionDto: ProcessApprovalActionDto, newStatus: string): void {
    console.log('[ApprovalInbox] processApprovalAction called with:', actionDto);
    console.log('[ApprovalInbox] ⚠️ Backend should check delegations for actionByUserId:', actionDto.actionByUserId);
    
    // Check if user has active delegation for this action
    const hasDelegation = this.activeDelegations && this.activeDelegations.length > 0;
    if (hasDelegation) {
      console.log('[ApprovalInbox] ⚠️ User has active delegations. Backend should verify delegation when processing action.');
      console.log('[ApprovalInbox] Active delegations:', this.activeDelegations);
    }
    
    this.runtimeService.processApprovalAction(actionDto).subscribe({
      next: (response) => {
        console.log('[ApprovalInbox] Approval action successful:', response);
        this.loading.action = false;
        const currentItem = this.selectedItem;
        const signatureRequested = !!response?.signatureRequested;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: signatureRequested
            ? `Document ${this.actionType.toLowerCase()} successfully. Signature is now pending.`
            : `Document ${this.actionType.toLowerCase()} successfully${newStatus ? ` (Status: ${newStatus})` : ''}`,
          life: 3000
        });
        this.handleInboxItemAfterAction(currentItem, response, newStatus);
        this.closeActionModal();
        this.loadInbox();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.loading.action = false;
        console.error('[ApprovalInbox] Error processing action:', error);
        console.error('[ApprovalInbox] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          error: error?.error,
          message: error?.message
        });
        
        // Extract error message from backend response
        let errorMessage = 'Failed to process action';
        
        // Check for 400 (Bad Request) - usually validation/permission errors from backend
        if (error?.status === 400) {
          errorMessage = error?.error?.message || 
                        error?.error?.errorMessage || 
                        error?.error?.detail ||
                        'You are not assigned to approve this document. Only Stage Assignees can approve documents.';
        } else if (error?.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error?.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.errorMessage) {
            errorMessage = error.error.errorMessage;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        // Special-case: minimum assignees validation from backend
        // Example: "Stage requires minimum ..."
        const lowered = (errorMessage || '').toString().toLowerCase();
        if (error?.status === 400 && lowered.includes('stage requires minimum')) {
          errorMessage = `${errorMessage}. Please assign enough active stage assignees then try again.`;
        }

        if (error?.status === 400 || error?.status === 403) {
          this.handlePermissionDenied(errorMessage);
          return;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: error?.status === 400 ? 'Access Denied' : 'Error',
          detail: errorMessage,
          life: 5000
        });
        this.cdr.detectChanges();
      }
    });
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1) {
      return '-';
    }
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
  
  /**
   * Load stage and submission details for amount validation
   */
  private loadStageAndSubmissionForValidation(stageId: number, submissionId: number): void {
    forkJoin({
      stage: this.approvalStageService.getById(stageId).pipe(
        catchError(() => of(null))
      ),
      submission: this.formSubmissionsService.getSubmissionById(submissionId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ stage, submission }) => {
        this.currentStage = stage;
        this.submissionDetail = submission as FormSubmissionDetailDto | null;
        this.validateAmount();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[ApprovalInbox] Error loading stage/submission for validation:', error);
        this.isAmountValid = true; // Default to valid if we can't check
        this.amountValidationError = '';
      }
    });
  }
  
  /**
   * Validate amount field against stage min/max requirements
   */
  private validateAmount(): void {
    this.isAmountValid = true;
    this.amountValidationError = '';
    
    // Only validate for Approve action
    if (this.actionType !== 'Approved') {
      return;
    }
    
    if (!this.currentStage || !this.submissionDetail) {
      return;
    }
    
    const minAmount = this.currentStage.minAmount;
    const maxAmount = this.currentStage.maxAmount;
    const amountFieldCode = this.currentStage.amountFieldCode;
    
    // If no amount restrictions, validation passes
    if ((minAmount === null || minAmount === undefined) && 
        (maxAmount === null || maxAmount === undefined)) {
      return;
    }
    
    // If no amount field code specified, can't validate
    if (!amountFieldCode) {
      return;
    }
    
    // Find amount field value in submission
    const amountFieldValue = this.submissionDetail.fieldValues?.find(
      fv => fv.fieldCode === amountFieldCode
    );
    
    if (!amountFieldValue) {
      this.isAmountValid = false;
      this.amountValidationError = `Amount field (${amountFieldCode}) not found in submission`;
      return;
    }
    
    // Get numeric value
    let amount: number | null = null;
    if (amountFieldValue.valueNumber !== null && amountFieldValue.valueNumber !== undefined) {
      amount = amountFieldValue.valueNumber;
    } else if (amountFieldValue.valueString) {
      const parsed = parseFloat(amountFieldValue.valueString);
      if (!isNaN(parsed)) {
        amount = parsed;
      }
    }
    
    if (amount === null) {
      this.isAmountValid = false;
      this.amountValidationError = `Amount field (${amountFieldCode}) has no valid numeric value`;
      return;
    }
    
    // Validate against min/max
    const hasMin = minAmount !== null && minAmount !== undefined;
    const hasMax = maxAmount !== null && maxAmount !== undefined;
    const lang = this.translationService.getCurrentLanguage();
    
    // Check both conditions if both exist
    if (hasMin && hasMax) {
      if (amount < minAmount || amount > maxAmount) {
        this.isAmountValid = false;
        if (lang === 'ar') {
          this.amountValidationError = `حقل المبلغ يجب أن يكون أكبر من أو يساوي ${minAmount} وأقل من أو يساوي ${maxAmount}`;
        } else {
          this.amountValidationError = `Amount field must be greater than or equal to ${minAmount} and less than or equal to ${maxAmount}`;
        }
        return;
      }
    } else if (hasMin && amount < minAmount) {
      this.isAmountValid = false;
      if (lang === 'ar') {
        this.amountValidationError = `حقل المبلغ يجب أن يكون أكبر من أو يساوي ${minAmount}`;
      } else {
        this.amountValidationError = `Amount field must be greater than or equal to ${minAmount}`;
      }
      return;
    } else if (hasMax && amount > maxAmount) {
      this.isAmountValid = false;
      if (lang === 'ar') {
        this.amountValidationError = `حقل المبلغ يجب أن يكون أقل من أو يساوي ${maxAmount}`;
      } else {
        this.amountValidationError = `Amount field must be less than or equal to ${maxAmount}`;
      }
      return;
    }
    
    // Validation passed
    this.isAmountValid = true;
    this.amountValidationError = '';
  }
  
  /**
   * Check if approve button should be disabled
   */
  isApproveDisabled(): boolean {
    if (this.actionType !== 'Approved') {
      return false;
    }

    return this.loading.action || !this.isAmountValid;
  }

  /**
   * Process action for submission (from all submissions table)
   */
  private processSubmissionAction(): void {
    if (!this.selectedSubmission || !this.currentUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No submission selected or user ID not found'
      });
      return;
    }

    // CRITICAL: Check if user can approve this submission
    // User can only approve if there's a corresponding inbox item (user is assigned as Stage Assignee)
    if (false && !this.canApproveRejectSubmission(this.selectedSubmission)) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: User tried to approve submission without being assigned');
      this.handlePermissionDenied('ليس لديك صلاحية تنفيذ هذا الإجراء على هذا المستند.');
      return;
    }

    // Find the corresponding inbox item to get the correct stageId
    const inboxItem = this.inboxItems.find(item => item.submissionId === this.selectedSubmission!.id);
    const stageId = inboxItem?.stageId || 1; // Use inbox item's stageId, or default to 1 if not found

    // For admin users, allow approval even without inbox item (they have global permissions)
    // For non-admin users, require inbox item to ensure they're assigned as Stage Assignee
    if (false && !this.isAdmin) {
      if (!inboxItem || stageId === 0 || stageId < 0) {
        console.error('[ApprovalInbox] ⚠️ SECURITY: No valid inbox item found for submission');
        this.handlePermissionDenied('ليس لديك صلاحية تنفيذ هذا الإجراء على هذا المستند.');
        return;
      }
    } else {
      // Admin users: validate stageId is positive, but allow even without inbox item
      if (stageId <= 0) {
        console.error('[ApprovalInbox] ⚠️ SECURITY: Invalid stageId for admin approval');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid stage ID. Cannot process approval.',
          life: 5000
        });
        return;
      }
      // Log admin override for audit purposes
      if (!inboxItem) {
        console.log('[ApprovalInbox] ⚠️ Admin approval without inbox item - using default stageId:', stageId);
      }
    }

    this.loading.action = true;
    const formData = this.actionForm.value;

    // Use approve/reject endpoints with stageId from inbox item
    if (this.actionType === 'Approved') {
      const approveDto: ApproveSubmissionDto = {
        submissionId: this.selectedSubmission.id,
        stageId: stageId, // Use stageId from inbox item
        actionByUserId: this.currentUserId,
        comments: formData.comments || null
      };

      this.formSubmissionsService.approveSubmissionDto(approveDto).subscribe({
        next: (response: ApiResponse<FormSubmissionDto>) => {
          console.log('[ApprovalInbox] Submission approval successful:', response);
          this.loading.action = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: response.message || 'Document approved successfully',
            life: 3000
          });
          if (this.selectedSubmission) {
            this.removeProcessedItemFromLists(this.selectedSubmission.id);
          }
          this.closeActionModal();
          this.loadInbox();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error approving submission:', error);
          
          // Extract error message from backend response
          let errorMessage = 'Failed to approve document';
          
          // Check for 400 (Bad Request) - usually validation/permission errors from backend
          if (error?.status === 400) {
            errorMessage = error?.error?.message || 
                          error?.error?.errorMessage || 
                          error?.error?.detail ||
                          'You are not assigned to approve this document. Only Stage Assignees can approve documents.';
          } else if (error?.status === 403) {
            errorMessage = 'You do not have permission to approve this document.';
          } else if (error?.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errorMessage) {
              errorMessage = error.error.errorMessage;
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }

          if (false && (error?.status === 400 || error?.status === 403)) {
            this.handlePermissionDenied(errorMessage);
            return;
          }

          this.loading.action = false;
          
          this.messageService.add({
            severity: 'error',
            summary: error?.status === 400 ? 'Access Denied' : 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.cdr.detectChanges();
        }
      });
    } else if (this.actionType === 'Rejected') {
      const rejectDto: RejectSubmissionDto = {
        submissionId: this.selectedSubmission.id,
        stageId: stageId, // Use stageId from inbox item
        actionByUserId: this.currentUserId,
        comments: formData.comments || null
      };

      this.formSubmissionsService.rejectSubmissionDto(rejectDto).subscribe({
        next: (response: ApiResponse<FormSubmissionDto>) => {
          console.log('[ApprovalInbox] Submission rejection successful:', response);
          this.loading.action = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: response.message || 'Document rejected successfully',
            life: 3000
          });
          if (this.selectedSubmission) {
            this.removeProcessedItemFromLists(this.selectedSubmission.id);
          }
          this.closeActionModal();
          this.loadInbox();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error rejecting submission:', error);
          
          // Extract error message from backend response
          let errorMessage = 'Failed to reject document';
          
          // Check for 400 (Bad Request) - usually validation/permission errors from backend
          if (error?.status === 400) {
            errorMessage = error?.error?.message || 
                          error?.error?.errorMessage || 
                          error?.error?.detail ||
                          'You are not assigned to reject this document. Only Stage Assignees can reject documents.';
          } else if (error?.status === 403) {
            errorMessage = 'You do not have permission to reject this document.';
          } else if (error?.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else if (error?.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errorMessage) {
              errorMessage = error.error.errorMessage;
            } else if (error.error.detail) {
              errorMessage = error.error.detail;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }

          if (false && (error?.status === 400 || error?.status === 403)) {
            this.handlePermissionDenied(errorMessage);
            return;
          }

          this.loading.action = false;
          
          this.messageService.add({
            severity: 'error',
            summary: error?.status === 400 ? 'Access Denied' : 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      // Returned is not supported for direct submissions, show message
      this.loading.action = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Return action is not supported for submissions. Please use Approve or Reject.',
        life: 5000
      });
    }
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.selectedItem = null;
    this.selectedSubmission = null;
    this.isSubmissionAction = false;
    this.currentStage = null;
    this.submissionDetail = null;
    this.amountValidationError = '';
    this.isAmountValid = true;
    this.actionForm.reset();
  }

  openSubmissionDetails(submissionId: number): void {
    if (!submissionId) {
      return;
    }

    this.showSubmissionDetails = true;
    this.loadingSubmissionDetails = true;
    this.submissionDetailsError = '';
    this.selectedSubmissionDetail = null;
    this.submissionDetailTabs = [];
    this.selectedSubmissionDetailTabId = null;

    this.formSubmissionsService.getSubmissionById(submissionId)
      .pipe(
        catchError((error) => {
          console.error('[ApprovalInbox] Error loading submission details:', error);
          this.submissionDetailsError = 'Unable to load the document details right now.';
          return of(null);
        })
      )
      .subscribe((detail) => {
        this.selectedSubmissionDetail = detail;
        const formBuilderId = Number(detail?.formBuilderId || 0);
        if (detail && formBuilderId > 0) {
          this.loadSubmissionDetailLayout(formBuilderId, detail);
          return;
        }

        if (detail) {
          this.buildSubmissionDetailLayout(detail, [], []);
        }

        this.loadingSubmissionDetails = false;
        this.cdr.detectChanges();
      });
  }

  closeSubmissionDetails(): void {
    this.showSubmissionDetails = false;
    this.loadingSubmissionDetails = false;
    this.submissionDetailsError = '';
    this.selectedSubmissionDetail = null;
    this.submissionDetailTabs = [];
    this.selectedSubmissionDetailTabId = null;
  }

  getVisibleFieldValues(): FormSubmissionValueDto[] {
    return (this.selectedSubmissionDetail?.fieldValues || []).filter((fieldValue) => {
      const hasString = !!fieldValue.valueString?.trim();
      const hasNumber = fieldValue.valueNumber !== undefined && fieldValue.valueNumber !== null;
      const hasDate = !!fieldValue.valueDate;
      const hasBool = fieldValue.valueBool !== undefined && fieldValue.valueBool !== null;
      const hasJson = !!fieldValue.valueJson?.trim();
      return hasString || hasNumber || hasDate || hasBool || hasJson;
    });
  }

  getFieldDisplayValue(fieldValue: FormSubmissionValueDto): string {
    if (fieldValue.valueString?.trim()) {
      return fieldValue.valueString;
    }

    if (fieldValue.valueNumber !== undefined && fieldValue.valueNumber !== null) {
      return fieldValue.valueNumber.toString();
    }

    if (fieldValue.valueDate) {
      return this.formatDate(fieldValue.valueDate);
    }

    if (fieldValue.valueBool !== undefined && fieldValue.valueBool !== null) {
      return fieldValue.valueBool ? 'Yes' : 'No';
    }

    if (fieldValue.valueJson?.trim()) {
      return fieldValue.valueJson;
    }

    return '-';
  }

  getSubmissionDetailsDisplayNumber(detail: FormSubmissionDetailDto | null): string {
    const finalNumber = (detail?.documentNumber || '').trim();
    if (finalNumber) {
      return finalNumber;
    }

    const pendingPreview = (detail?.pendingDocumentNumberPreview || '').trim();
    if (pendingPreview) {
      return pendingPreview;
    }

    return 'Pending Number';
  }

  getInboxDisplayNumber(item: ApprovalInboxItemDto | null | undefined): string {
    const finalNumber = (item?.documentNumber || '').trim();
    if (finalNumber) {
      return finalNumber;
    }

    const pendingPreview = ((item as any)?.pendingDocumentNumberPreview || '').trim();
    if (pendingPreview) {
      return pendingPreview;
    }

    return 'Pending Number';
  }

  canPostSubmissionListItem(submission: FormSubmissionDto | null | undefined): boolean {
    return false;
  }

  canPostApprovalInboxItem(item: ApprovalInboxItemDto | null | undefined): boolean {
    return false;
  }

  canPostSubmissionDetail(detail: FormSubmissionDetailDto | null): boolean {
    return false;
  }

  postSelectedSubmission(): void {
    const submissionId = Number(this.selectedSubmissionDetail?.id || 0);
    if (!submissionId || this.postingSelectedSubmission || !this.canPostSubmissionDetail(this.selectedSubmissionDetail)) {
      return;
    }

    this.postingSelectedSubmission = true;

    this.formSubmissionsService.postSubmission(submissionId).subscribe({
      next: (response) => {
        const detail = this.selectedSubmissionDetail;
        if (detail) {
          detail.status = response?.status || 'Posted';
          detail.documentNumber = response?.documentNumber || detail.documentNumber;
          detail.pendingDocumentNumberPreview = response?.pendingDocumentNumberPreview || detail.pendingDocumentNumberPreview;
        }

        this.postingSelectedSubmission = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Document posted successfully.',
          life: 4000
        });

        window.location.reload();
      },
      error: (error) => {
        const detail = error?.message || error?.error?.message || error?.error?.detail || 'Failed to post the approved submission.';
        this.postingSelectedSubmission = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
          life: 5000
        });
      }
    });
  }

  postSubmissionListItem(submissionId: number): void {
    const normalizedSubmissionId = Number(submissionId || 0);
    if (!normalizedSubmissionId || this.postingSelectedSubmission) {
      return;
    }

    this.postingSelectedSubmission = true;
    this.formSubmissionsService.postSubmission(normalizedSubmissionId).subscribe({
      next: () => {
        window.location.reload();
      },
      error: (error) => {
        const detail = error?.message || error?.error?.message || error?.error?.detail || 'Failed to post the approved submission.';
        this.postingSelectedSubmission = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
          life: 5000
        });
      }
    });
  }

  getActiveSubmissionDetailTab(): SubmissionDetailTabViewModel | null {
    if (!this.submissionDetailTabs.length) {
      return null;
    }

    const activeTab = this.submissionDetailTabs.find((tab) => tab.id === this.selectedSubmissionDetailTabId);
    return activeTab || this.submissionDetailTabs[0] || null;
  }

  selectSubmissionDetailTab(tabId: number): void {
    this.selectedSubmissionDetailTabId = tabId;
  }

  trackBySubmissionDetailTab(_: number, tab: SubmissionDetailTabViewModel): number {
    return tab.id;
  }

  trackBySubmissionDetailField(_: number, field: SubmissionDetailFieldViewModel): string {
    return field.id;
  }

  private loadSubmissionDetailLayout(formBuilderId: number, detail: FormSubmissionDetailDto): void {
    this.tabsService.getTabs(formBuilderId).subscribe({
      next: (tabs) => {
        const activeTabs = (tabs || [])
          .filter((tab) => tab && tab.id > 0 && tab.isDeleted !== true && tab.isActive !== false)
          .sort((a, b) => Number(a.tabOrder || 0) - Number(b.tabOrder || 0));

        if (!activeTabs.length) {
          this.buildSubmissionDetailLayout(detail, [], []);
          this.loadingSubmissionDetails = false;
          this.cdr.detectChanges();
          return;
        }

        forkJoin(activeTabs.map((tab) => this.fieldsService.getFieldsByTabId(tab.id))).subscribe({
          next: (fieldsByTab) => {
            const allFields = (fieldsByTab || []).flatMap((fields) =>
              (fields || [])
                .filter((field) => field && field.isDeleted !== true && field.isActive !== false)
                .sort((a, b) => Number(a.fieldOrder || 0) - Number(b.fieldOrder || 0))
            );
            this.buildSubmissionDetailLayout(detail, activeTabs, allFields);
            this.loadingSubmissionDetails = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.buildSubmissionDetailLayout(detail, activeTabs, []);
            this.loadingSubmissionDetails = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.buildSubmissionDetailLayout(detail, [], []);
        this.loadingSubmissionDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildSubmissionDetailLayout(
    detail: FormSubmissionDetailDto,
    tabs: FormTabDto[],
    fields: FormFieldDto[]
  ): void {
    const visibleValues = this.getVisibleFieldValues();
    const valueByFieldId = new Map<number, FormSubmissionValueDto>();
    const valueByFieldCode = new Map<string, FormSubmissionValueDto>();

    for (const fieldValue of visibleValues) {
      if (fieldValue.fieldId) {
        valueByFieldId.set(Number(fieldValue.fieldId), fieldValue);
      }

      const fieldCode = (fieldValue.fieldCode || '').trim().toLowerCase();
      if (fieldCode) {
        valueByFieldCode.set(fieldCode, fieldValue);
      }
    }

    const usedFieldValueIds = new Set<number>();
    const detailTabs: SubmissionDetailTabViewModel[] = [];

    for (const tab of tabs) {
      const tabFields = (fields || [])
        .filter((field) => Number(field.tabId || 0) === Number(tab.id || 0))
        .sort((a, b) => Number(a.fieldOrder || 0) - Number(b.fieldOrder || 0));

      const fieldCards: SubmissionDetailFieldViewModel[] = [];

      for (const field of tabFields) {
        const fieldValue = valueByFieldId.get(Number(field.id || 0))
          || valueByFieldCode.get((field.fieldCode || '').trim().toLowerCase());

        if (!fieldValue) {
          continue;
        }

        const displayValue = this.getFieldDisplayValue(fieldValue);
        if (!displayValue || displayValue === '-') {
          continue;
        }

        usedFieldValueIds.add(Number(fieldValue.id || 0));
        fieldCards.push({
          id: `field-${field.id}-${fieldValue.id}`,
          fieldId: Number(field.id || 0),
          label: field.fieldName || fieldValue.fieldName || fieldValue.fieldCode || `Field #${fieldValue.fieldId}`,
          value: displayValue,
          fullWidth: this.isSubmissionDetailFieldWide(field, displayValue)
        });
      }

      if (!fieldCards.length) {
        continue;
      }

      detailTabs.push({
        id: Number(tab.id || 0),
        label: tab.tabName || `Tab ${tab.id}`,
        fields: fieldCards
      });
    }

    const unmatchedFields = visibleValues
      .filter((fieldValue) => !usedFieldValueIds.has(Number(fieldValue.id || 0)))
      .map((fieldValue) => {
        const displayValue = this.getFieldDisplayValue(fieldValue);
        return {
          id: `unmatched-${fieldValue.id}`,
          fieldId: Number(fieldValue.fieldId || 0),
          label: fieldValue.fieldName || fieldValue.fieldCode || `Field #${fieldValue.fieldId}`,
          value: displayValue,
          fullWidth: displayValue.length > 120 || displayValue.includes('\n')
        } as SubmissionDetailFieldViewModel;
      })
      .filter((field) => !!field.value && field.value !== '-');

    if (unmatchedFields.length) {
      detailTabs.push({
        id: -1,
        label: 'Other Fields',
        fields: unmatchedFields
      });
    }

    if (!detailTabs.length && visibleValues.length) {
      detailTabs.push({
        id: 0,
        label: 'Details',
        fields: visibleValues
          .map((fieldValue) => {
            const displayValue = this.getFieldDisplayValue(fieldValue);
            return {
              id: `fallback-${fieldValue.id}`,
              fieldId: Number(fieldValue.fieldId || 0),
              label: fieldValue.fieldName || fieldValue.fieldCode || `Field #${fieldValue.fieldId}`,
              value: displayValue,
              fullWidth: displayValue.length > 120 || displayValue.includes('\n')
            };
          })
          .filter((field) => !!field.value && field.value !== '-')
      });
    }

    this.submissionDetailTabs = detailTabs;
    this.selectedSubmissionDetailTabId = detailTabs[0]?.id ?? null;
  }

  private isSubmissionDetailFieldWide(field: FormFieldDto, value: string): boolean {
    const fieldTypeName = (field.fieldTypeName || field.type || '').toLowerCase();
    if (
      fieldTypeName.includes('textarea')
      || fieldTypeName.includes('text area')
      || fieldTypeName.includes('file')
      || fieldTypeName.includes('grid')
      || fieldTypeName.includes('table')
      || fieldTypeName.includes('radio')
      || fieldTypeName.includes('checkbox')
      || fieldTypeName.includes('editor')
      || fieldTypeName.includes('html')
      || fieldTypeName.includes('rich')
    ) {
      return true;
    }

    return value.length > 120 || value.includes('\n');
  }

  getActionVerb(actionType: 'Approved' | 'Rejected' | 'Returned'): string {
    switch (actionType) {
      case 'Approved':
        return 'Approve';
      case 'Rejected':
        return 'Reject';
      case 'Returned':
        return 'Return';
      default:
        return actionType;
    }
  }

  getActionDialogTitle(): string {
    return `${this.getActionVerb(this.actionType)} Document`;
  }

  isPendingSignatureItem(item: ApprovalInboxItemDto | null | undefined): boolean {
    if (!item) {
      return false;
    }

    return !!item.signatureRequired &&
      (item.signatureStatus || '').toLowerCase() === 'pending';
  }

  canShowDecisionActions(item: ApprovalInboxItemDto | null | undefined): boolean {
    if (!item) {
      return false;
    }

    return item.canApprove !== false && !this.isPendingSignatureItem(item);
  }

  canShowSignAction(item: ApprovalInboxItemDto | null | undefined): boolean {
    return this.isPendingSignatureItem(item);
  }

  openSigningForItem(item: ApprovalInboxItemDto): void {
    if (!item?.submissionId) {
      return;
    }

    this.formSubmissionsService.getSubmissionSigningUrlById(item.submissionId).subscribe({
      next: (response) => {
        const signingUrl = response?.signingUrl;
        if (!signingUrl) {
          this.messageService.add({
            severity: 'warn',
            summary: 'DocuSign',
            detail: 'Signing link is not available yet for this document.',
            life: 4000
          });
          return;
        }

        item.signatureRequired = true;
        item.signatureStatus = response.signatureStatus || 'pending';
        item.canApprove = false;

        window.open(signingUrl, '_blank', 'noopener,noreferrer');
        this.cdr.detectChanges();
      },
      error: (error) => {
        const detail = error?.error?.message || error?.message || 'Failed to open the signing page.';
        this.messageService.add({
          severity: 'error',
          summary: 'DocuSign',
          detail,
          life: 5000
        });
      }
    });
  }

  private handleInboxItemAfterAction(item: ApprovalInboxItemDto | null, response: any, newStatus: string): void {
    if (!item) {
      return;
    }

    const signatureRequested = !!response?.signatureRequested;
    if (!signatureRequested) {
      this.removeProcessedItemFromLists(item.submissionId);
      return;
    }

    item.status = response?.status || newStatus || 'Approved';
    item.signatureRequired = true;
    item.signatureStatus = 'pending';
    item.canApprove = false;

    const index = this.inboxItems.findIndex(existing => existing.submissionId === item.submissionId);
    if (index >= 0) {
      this.inboxItems[index] = { ...this.inboxItems[index], ...item };
    }

    const filteredIndex = this.filteredItems.findIndex(existing => existing.submissionId === item.submissionId);
    if (filteredIndex >= 0) {
      this.filteredItems[filteredIndex] = { ...this.filteredItems[filteredIndex], ...item };
    }
  }

  private removeProcessedItemFromLists(submissionId: number): void {
    this.inboxItems = this.inboxItems.filter(item => item.submissionId !== submissionId);
    this.filteredItems = this.filteredItems.filter(item => item.submissionId !== submissionId);
    this.totalRecords = this.inboxItems.length;
  }
}









