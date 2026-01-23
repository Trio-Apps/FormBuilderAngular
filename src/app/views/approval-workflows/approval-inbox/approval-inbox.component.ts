import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalWorkflowRuntimeService, ApprovalInboxItemDto, ProcessApprovalActionDto } from '../../FormBuilder/services/approval-workflow-runtime.service';
import { ApprovalStageAssigneesService } from '../../FormBuilder/services/approval-stage-assignees.service';
import { ApprovalStageService, ApprovalStageDto } from '../../FormBuilder/services/approval-stage.service';
import { FormSubmissionsService, FormSubmissionDto, FormSubmissionDetailDto } from '../../form-submissions/services/form-submissions.service';
import { ApproveSubmissionDto, RejectSubmissionDto, ApiResponse } from '../../form-submissions/models/approve-reject-submission.model';
import { StorageService } from '../../../auth/storage.service';
import { AuthService } from '../../../auth/auth.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-approval-inbox',
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
    ButtonModule,
    TableModule,
    PaginatorModule,
    TableShellComponent
  ],
  templateUrl: './approval-inbox.component.html',
  styleUrls: ['./approval-inbox.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ApprovalInboxComponent implements OnInit {
  inboxItems: ApprovalInboxItemDto[] = [];
  filteredItems: ApprovalInboxItemDto[] = [];
  allSubmissions: FormSubmissionDto[] = []; // All submissions with Submitted status
  currentUserId: string | null = null;
  currentUsername: string | null = null; // Store username separately in case backend needs it
  showAllSubmissions = false; // Toggle between inbox and all submissions
  
  // ✅ Role-based access control
  isAdmin = false; // Only admins can Approve/Reject

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

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private runtimeService: ApprovalWorkflowRuntimeService,
    private stageAssigneesService: ApprovalStageAssigneesService,
    private approvalStageService: ApprovalStageService,
    private formSubmissionsService: FormSubmissionsService,
    private storageService: StorageService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
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
    const userRole = this.storageService.getRole() || this.authService.role();
    const adminRoles = ['administration', 'admin'];
    this.isAdmin = userRole ? adminRoles.includes(userRole.toLowerCase()) : false;
    console.log('[ApprovalInbox] 🔐 User Role:', userRole, '| Is Admin:', this.isAdmin);

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
      // Also load all submissions with Submitted status to show when inbox is empty
      this.loadAllSubmittedSubmissions();
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
    
    // Try with userId first
    this.loadInboxWithUserId(this.currentUserId);
  }

  /**
   * Load inbox with specific userId/username
   */
  private loadInboxWithUserId(userIdentifier: string | null, isRetry: boolean = false): void {
    if (!userIdentifier) {
      this.loading.inbox = false;
      return;
    }

    console.log('========================================');
    console.log('[ApprovalInbox] 📥 Loading Inbox');
    console.log('========================================');
    console.log('User Identifier:', userIdentifier);
    console.log('Is Retry:', isRetry);
    console.log('API URL:', `${this.runtimeService['baseUrl']}/inbox/${encodeURIComponent(userIdentifier)}`);
    console.log('========================================');
    
    this.runtimeService.getApprovalInboxForUser(userIdentifier).subscribe({
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
        this.inboxItems = assignedItems;
        this.filteredItems = [...this.inboxItems];
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
   * Load all submissions with Submitted status (for display when inbox is empty)
   * تحميل جميع الـ Submissions بحالة Submitted (للعرض عندما لا توجد pending approvals)
   * ✅ Non-admin users only see their own submissions
   */
  loadAllSubmittedSubmissions(): void {
    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        // Filter only Submitted status submissions
        let filtered = (submissions || []).filter(sub => 
          sub.status === 'Submitted'
        );
        
        // ✅ Non-admin users can only see their own submissions
        if (!this.isAdmin) {
          filtered = filtered.filter(sub => {
            const submittedBy = sub.submittedByUserId?.trim().toLowerCase();
            const currentUser = this.currentUsername?.trim().toLowerCase();
            const currentId = this.currentUserId?.trim().toLowerCase();
            return submittedBy === currentUser || submittedBy === currentId;
          });
          console.log('[ApprovalInbox] 👤 User view - showing only own submissions:', filtered.length);
        }
        
        this.allSubmissions = filtered;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading all submitted submissions:', error);
        this.allSubmissions = [];
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Load all submissions with Submitted status (for "Show All Submissions" toggle)
   * تحميل جميع الـ Submissions بحالة Submitted (للعرض فقط، لا للموافقة)
   * Note: This is only for viewing, not for approval. Only inbox items can be approved.
   * ✅ Non-admin users only see their own submissions
   */
  loadAllSubmissions(): void {
    // Only load if user wants to see all submissions (not for approval)
    if (!this.showAllSubmissions) {
      return;
    }
    
    this.loading.inbox = true;
    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        // Filter only Submitted status submissions (for viewing only)
        let filtered = (submissions || []).filter(sub => 
          sub.status === 'Submitted' || sub.status === 'Pending'
        );
        
        // ✅ Non-admin users can only see their own submissions
        if (!this.isAdmin) {
          filtered = filtered.filter(sub => {
            const submittedBy = sub.submittedByUserId?.trim().toLowerCase();
            const currentUser = this.currentUsername?.trim().toLowerCase();
            const currentId = this.currentUserId?.trim().toLowerCase();
            return submittedBy === currentUser || submittedBy === currentId;
          });
        }
        
        this.allSubmissions = filtered;
        this.loading.inbox = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading all submissions:', error);
        this.allSubmissions = [];
        this.loading.inbox = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Refresh inbox (only items where user is assigned as Stage Assignee)
   */
  refreshData(): void {
    this.loadInbox();
    // Always load submitted submissions to show when inbox is empty
    this.loadAllSubmittedSubmissions();
    // Only load all submissions if user is viewing "Show All Submissions"
    if (this.showAllSubmissions) {
      this.loadAllSubmissions();
    }
  }

  /**
   * Toggle between inbox items and all submissions
   * IMPORTANT: Only inbox items (where user is Stage Assignee) can be approved
   * When showing all submissions, we still only show assigned items (stageId > 0)
   */
  toggleView(): void {
    this.showAllSubmissions = !this.showAllSubmissions;
    if (this.showAllSubmissions) {
      // Load all submissions for reference, but still only show assigned items
      this.loadAllSubmissions();
      // Keep showing only inbox items (assigned items with stageId > 0)
      // Don't convert all submissions because user can only approve assigned items
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'You can only approve items assigned to you in Stage Assignees.',
        life: 5000
      });
    } else {
      // Reload inbox items (only items where user is Stage Assignee)
      this.loadInbox();
    }
    // CRITICAL: Always filter to show only assigned items (stageId > 0)
    this.filteredItems = this.inboxItems.filter(item => item.stageId > 0);
    this.totalRecords = this.filteredItems.length;
    this.first = 0;
  }

  filterItems(): void {
    // CRITICAL: Always filter to show only assigned items (stageId > 0)
    const assignedItems = this.inboxItems.filter(item => item.stageId > 0);
    
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

  /**
   * Get filtered submitted submissions based on search term
   */
  getFilteredSubmittedSubmissions(): FormSubmissionDto[] {
    if (!this.searchTerm.trim()) {
      return this.allSubmissions;
    }

    const term = this.searchTerm.toLowerCase();
    return this.allSubmissions.filter(sub =>
      sub.documentNumber?.toLowerCase().includes(term) ||
      sub.documentTypeName?.toLowerCase().includes(term) ||
      sub.submittedByUserName?.toLowerCase().includes(term) ||
      sub.formName?.toLowerCase().includes(term)
    );
  }

  /**
   * Get paginated submitted submissions
   */
  getPaginatedSubmittedSubmissions(): FormSubmissionDto[] {
    const filtered = this.getFilteredSubmittedSubmissions();
    const start = this.first;
    const end = start + this.rows;
    return filtered.slice(start, end);
  }

  /**
   * Get total records for submitted submissions
   */
  getSubmittedSubmissionsTotalRecords(): number {
    return this.getFilteredSubmittedSubmissions().length;
  }

  onSearchChange(): void {
    this.filterItems();
    this.first = 0;
  }

  getPaginatedItems(): ApprovalInboxItemDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredItems.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  /**
   * Check if user can approve/reject this item
   * User can approve if:
   * 1. User is admin, OR
   * 2. Item is in inboxItems (user is assigned as Stage Assignee with stageId > 0)
   */
  canApproveReject(item: ApprovalInboxItemDto | null): boolean {
    if (!item) return false;
    
    // Admin can always approve
    if (this.isAdmin) {
      return true;
    }
    
    // For non-admin users: Check if they are assigned as Stage Assignee
    // Items in inboxItems array have stageId > 0, meaning user IS assigned
    // If item has stageId > 0, it means backend recognized user as Stage Assignee
    
    // Verify item has valid stageId (stageId > 0 means assigned)
    const hasValidStageId = item.stageId !== null && item.stageId !== undefined && item.stageId > 0;
    
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
    
    // Non-admin users can approve if:
    // 1. Item has valid stageId > 0 (assigned as Stage Assignee), AND
    // 2. Item is in inboxItems (exists in user's inbox)
    // Note: If item is shown in inbox table, it should be in inboxItems, but we verify for safety
    const canApprove = hasValidStageId && isInInbox;
    
    // Enhanced debug logging
    if (!canApprove) {
      console.warn('[ApprovalInbox] ⚠️ Permission check failed for non-admin user:', {
        itemSubmissionId: item.submissionId,
        itemStageId: item.stageId,
        hasValidStageId: hasValidStageId,
        isInInbox: isInInbox,
        isAdmin: this.isAdmin,
        inboxItemsCount: this.inboxItems.length,
        currentUserId: this.currentUserId,
        inboxItemDetails: this.inboxItems.map(i => ({ 
          submissionId: i.submissionId, 
          stageId: i.stageId,
          submissionIdType: typeof i.submissionId,
          stageIdType: typeof i.stageId
        }))
      });
      
      // Also log the item types for debugging
      console.log('[ApprovalInbox] Item details:', {
        submissionId: item.submissionId,
        submissionIdType: typeof item.submissionId,
        stageId: item.stageId,
        stageIdType: typeof item.stageId
      });
    } else {
      console.log('[ApprovalInbox] ✅ Permission granted:', {
        submissionId: item.submissionId,
        stageId: item.stageId,
        isAdmin: this.isAdmin
      });
    }
    
    return canApprove;
  }

  /**
   * Check if user can approve/reject this submission
   * For submissions table, check if there's a corresponding inbox item
   */
  canApproveRejectSubmission(submission: FormSubmissionDto | null): boolean {
    if (!submission) return false;
    
    // Admin can always approve
    if (this.isAdmin) {
      return true;
    }
    
    // Non-admin users can only approve if there's a corresponding inbox item
    // This means user is assigned as Stage Assignee for this submission's stage
    // Match by submissionId (as a number or string comparison)
    const hasInboxItem = this.inboxItems.some(item => {
      // Compare both as numbers and strings to handle type mismatches
      const itemSubId = Number(item.submissionId);
      const subId = Number(submission.id);
      return itemSubId === subId || String(item.submissionId) === String(submission.id);
    });
    
    // Debug logging
    if (!hasInboxItem && this.inboxItems.length > 0) {
      console.log('[ApprovalInbox] Submission not found in inboxItems:', {
        submissionId: submission.id,
        submissionStatus: submission.status,
        inboxItemsCount: this.inboxItems.length,
        inboxSubmissionIds: this.inboxItems.map(i => i.submissionId)
      });
    }
    
    return hasInboxItem;
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
    if (this.selectedItem.stageId === 0 || !this.selectedItem.stageId || this.selectedItem.stageId < 0) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: User tried to approve item with stageId = 0');
      console.error('[ApprovalInbox] This should not happen - item should be filtered out');
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'You are not assigned to approve this document. Only Stage Assignees can approve documents.',
        life: 5000
      });
      this.loading.action = false;
      return;
    }
    
    // Double-check: Verify item is in inboxItems (assigned items)
    const isInInbox = this.inboxItems.find(item => 
      item.submissionId === this.selectedItem!.submissionId && 
      item.stageId === this.selectedItem!.stageId &&
      item.stageId > 0
    );
    
    if (!isInInbox) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: Item not found in inbox items');
      console.error('[ApprovalInbox] Item:', this.selectedItem);
      console.error('[ApprovalInbox] Inbox items:', this.inboxItems.map(i => ({ submissionId: i.submissionId, stageId: i.stageId })));
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'You are not assigned to approve this document. Only Stage Assignees can approve documents.',
        life: 5000
      });
      this.loading.action = false;
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
      this.runtimeService.getApprovalInboxForUser(this.currentUserId).subscribe({
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
              this.runtimeService.getApprovalInboxForUser(this.currentUserId).subscribe({
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
          this.runtimeService.getApprovalInboxForUser(this.currentUserId).subscribe({
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
   */
  private processActionWithStageId(stageId: number, formData: any): void {
    if (!this.selectedItem || !this.currentUserId) {
      this.loading.action = false;
      return;
    }

    const rawComments = formData?.comments;
    const normalizedComments =
      typeof rawComments === 'string' ? rawComments.trim() : rawComments;

    const actionDto: ProcessApprovalActionDto = {
      submissionId: this.selectedItem.submissionId,
      stageId: stageId,
      actionType: this.actionType,
      actionByUserId: this.currentUserId,
      ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
        ? { comments: normalizedComments }
        : {})
    };

    console.log('[ApprovalInbox] Processing action with stageId:', actionDto);

    // Determine the new status based on action type
    let newStatus = '';
    if (this.actionType === 'Approved') {
      newStatus = 'Approved';
    } else if (this.actionType === 'Rejected') {
      newStatus = 'Rejected';
    } else if (this.actionType === 'Returned') {
      newStatus = 'Submitted';
    }

    // Update status first, then process approval action
    if (newStatus) {
      this.formSubmissionsService.updateSubmission(this.selectedItem.submissionId, { status: newStatus }).subscribe({
        next: () => {
          console.log(`[ApprovalInbox] Status updated to ${newStatus}`);
          this.processApprovalAction(actionDto, newStatus);
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error updating status:', error);
          // Continue with approval action
          this.processApprovalAction(actionDto, newStatus);
        }
      });
    } else {
      this.processApprovalAction(actionDto, '');
    }
  }

  /**
   * Process action directly using approve/reject endpoints (when stageId is not available)
   */
  private processActionDirectly(formData: any): void {
    if (!this.selectedItem || !this.currentUserId) {
      this.loading.action = false;
      return;
    }

    console.log('[ApprovalInbox] Processing action directly without stageId');

    // Determine the new status based on action type
    let newStatus = '';
    if (this.actionType === 'Approved') {
      newStatus = 'Approved';
    } else if (this.actionType === 'Rejected') {
      newStatus = 'Rejected';
    } else if (this.actionType === 'Returned') {
      newStatus = 'Submitted';
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
        actionByUserId: this.currentUserId,
        ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
          ? { comments: normalizedComments }
          : {})
      };
      
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
          this.closeActionModal();
          this.loadInbox();
          this.loadAllSubmittedSubmissions();
          this.loadAllSubmissions();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error approving:', error);
          this.loading.action = false;
          let errorMessage = error?.message || error?.error?.message || 'Failed to approve document';
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
        actionByUserId: this.currentUserId,
        ...(normalizedComments !== null && normalizedComments !== undefined && normalizedComments !== ''
          ? { comments: normalizedComments }
          : {})
      };
      
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
          this.closeActionModal();
          this.loadInbox();
          this.loadAllSubmittedSubmissions();
          this.loadAllSubmissions();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error rejecting:', error);
          this.loading.action = false;
          let errorMessage = error?.message || error?.error?.message || 'Failed to reject document';
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
   */
  private processApprovalAction(actionDto: ProcessApprovalActionDto, newStatus: string): void {
    console.log('[ApprovalInbox] processApprovalAction called with:', actionDto);
    
    this.runtimeService.processApprovalAction(actionDto).subscribe({
      next: (response) => {
        console.log('[ApprovalInbox] Approval action successful:', response);
        this.loading.action = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Document ${this.actionType.toLowerCase()} successfully${newStatus ? ` (Status: ${newStatus})` : ''}`,
          life: 3000
        });
        this.closeActionModal();
        this.loadInbox();
        this.loadAllSubmittedSubmissions(); // Reload all submitted submissions
        this.loadAllSubmissions(); // Reload all submissions
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
    if (!this.canApproveRejectSubmission(this.selectedSubmission)) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: User tried to approve submission without being assigned');
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'You are not assigned to approve this document. Only Stage Assignees can approve documents.',
        life: 5000
      });
      return;
    }

    // Find the corresponding inbox item to get the correct stageId
    const inboxItem = this.inboxItems.find(item => item.submissionId === this.selectedSubmission!.id);
    const stageId = inboxItem?.stageId || 1; // Use inbox item's stageId, or default to 1 if not found

    if (!inboxItem || stageId === 0 || stageId < 0) {
      console.error('[ApprovalInbox] ⚠️ SECURITY: No valid inbox item found for submission');
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'You are not assigned to approve this document. Only Stage Assignees can approve documents.',
        life: 5000
      });
      return;
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
          this.closeActionModal();
          this.loadInbox();
          this.loadAllSubmittedSubmissions();
          this.loadAllSubmissions();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error approving submission:', error);
          this.loading.action = false;
          
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
          this.closeActionModal();
          this.loadInbox();
          this.loadAllSubmittedSubmissions();
          this.loadAllSubmissions();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('[ApprovalInbox] Error rejecting submission:', error);
          this.loading.action = false;
          
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
}








