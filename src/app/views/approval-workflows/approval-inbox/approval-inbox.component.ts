import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalWorkflowRuntimeService, ApprovalInboxItemDto, ProcessApprovalActionDto } from '../../FormBuilder/services/approval-workflow-runtime.service';
import { FormSubmissionsService, FormSubmissionDto } from '../../form-submissions/services/form-submissions.service';
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

@Component({
  selector: 'app-approval-inbox',
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
    ButtonModule,
    TableModule,
    PaginatorModule
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
  showAllSubmissions = false; // Toggle between inbox and all submissions

  loading = {
    inbox: false,
    action: false
  };

  showActionModal = false;
  actionForm!: FormGroup;
  selectedItem: ApprovalInboxItemDto | null = null;
  actionType: 'Approved' | 'Rejected' | 'Returned' = 'Approved';

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private runtimeService: ApprovalWorkflowRuntimeService,
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

    // Get current user ID - try multiple sources
    // First try: getUserId from storage
    const userId = this.storageService.getUserId();
    // Second try: get username from storage
    const username = this.storageService.getUsername() || this.authService.userName();
    
    // Use userId if available, otherwise use username
    this.currentUserId = userId?.toString() || username || null;
    
    console.log('[ApprovalInbox] User identification:', {
      userId: userId,
      username: username,
      currentUserId: this.currentUserId,
      hasToken: this.storageService.hasToken()
    });
    
    if (this.currentUserId) {
      this.loadInbox();
      this.loadAllSubmissions(); // Also load all submitted submissions
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

    this.loading.inbox = true;
    this.runtimeService.getApprovalInboxForUser(this.currentUserId).subscribe({
      next: (items: ApprovalInboxItemDto[]) => {
        this.inboxItems = items || [];
        this.filteredItems = [...this.inboxItems];
        this.totalRecords = this.filteredItems.length;
        this.loading.inbox = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading inbox:', error);
        this.inboxItems = [];
        this.filteredItems = [];
        this.loading.inbox = false;
        // Don't show error if we have all submissions as fallback
        if (this.allSubmissions.length === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load approval inbox'
          });
        }
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Load all submissions with Submitted status
   * تحميل جميع الـ Submissions بحالة Submitted
   */
  loadAllSubmissions(): void {
    this.loading.inbox = true;
    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        // Filter only Submitted status submissions
        this.allSubmissions = (submissions || []).filter(sub => sub.status === 'Submitted' || sub.status === 'Pending');
        
        // Update status to "Pending" for submissions that are "Submitted"
        const submissionsToUpdate = this.allSubmissions.filter(sub => sub.status === 'Submitted');
        
        if (submissionsToUpdate.length > 0) {
          // Update each submission status to "Pending" using updateSubmission instead
          const updateObservables = submissionsToUpdate.map(sub => 
            this.formSubmissionsService.updateSubmission(sub.id, { status: 'Pending' }).pipe(
              catchError((error) => {
                console.error(`Error updating submission ${sub.id} status to Pending:`, error);
                return of(null); // Continue even if update fails
              })
            )
          );
          
          // Wait for all updates to complete
          forkJoin(updateObservables).subscribe({
            next: () => {
              console.log(`Updated ${submissionsToUpdate.length} submissions to Pending status`);
              this.processSubmissionsForDisplay();
            },
            error: (error) => {
              console.error('Error updating submissions status:', error);
              this.processSubmissionsForDisplay();
            }
          });
        } else {
          this.processSubmissionsForDisplay();
        }
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
   * Process submissions for display in inbox
   */
  private processSubmissionsForDisplay(): void {
    // Reload submissions to get updated status
    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        // Filter Pending and Submitted status submissions
        this.allSubmissions = (submissions || []).filter(sub => 
          sub.status === 'Submitted' || sub.status === 'Pending'
        );
        
        // Convert FormSubmissionDto to ApprovalInboxItemDto format for display
        if (this.allSubmissions.length > 0 && this.inboxItems.length === 0) {
          // If inbox is empty but we have submissions, show them
          this.inboxItems = this.allSubmissions.map((sub, index) => ({
            submissionId: sub.id,
            stageId: 0, // Will be set when user tries to approve/reject
            stageName: 'Pending Approval',
            stageOrder: index + 1,
            documentNumber: sub.documentNumber || `SUB-${sub.id}`,
            documentTypeName: sub.documentTypeName || 'Unknown',
            submittedByUserId: sub.submittedByUserId || '',
            submittedByUserName: sub.submittedByUserName || sub.submittedByUserId || 'Unknown',
            submittedDate: sub.submittedDate,
            workflowId: 0,
            workflowName: 'Default Workflow'
          }));
          this.filteredItems = [...this.inboxItems];
          this.totalRecords = this.filteredItems.length;
        }
        
        this.loading.inbox = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error reloading submissions:', error);
        this.loading.inbox = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Refresh both inbox and all submissions
   */
  refreshData(): void {
    this.loadInbox();
    this.loadAllSubmissions();
  }

  /**
   * Toggle between inbox items and all submissions
   */
  toggleView(): void {
    this.showAllSubmissions = !this.showAllSubmissions;
    if (this.showAllSubmissions) {
      // Show all submitted/pending submissions
      if (this.allSubmissions.length > 0) {
        this.inboxItems = this.allSubmissions.map((sub, index) => ({
          submissionId: sub.id,
          stageId: 0,
          stageName: 'Pending Approval',
          stageOrder: index + 1,
          documentNumber: sub.documentNumber || `SUB-${sub.id}`,
          documentTypeName: sub.documentTypeName || 'Unknown',
          submittedByUserId: sub.submittedByUserId || '',
          submittedByUserName: sub.submittedByUserName || sub.submittedByUserId || 'Unknown',
          submittedDate: sub.submittedDate,
          workflowId: 0,
          workflowName: 'Default Workflow'
        }));
      } else {
        // Reload submissions if not already loaded
        this.loadAllSubmissions();
      }
    } else {
      // Reload inbox items
      this.loadInbox();
    }
    this.filteredItems = [...this.inboxItems];
    this.totalRecords = this.filteredItems.length;
    this.first = 0;
  }

  filterItems(): void {
    if (!this.searchTerm.trim()) {
      this.filteredItems = [...this.inboxItems];
      this.totalRecords = this.filteredItems.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredItems = this.inboxItems.filter(item =>
      item.documentNumber?.toLowerCase().includes(term) ||
      item.documentTypeName?.toLowerCase().includes(term) ||
      item.stageName?.toLowerCase().includes(term) ||
      item.submittedByUserName?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredItems.length;
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

  openActionModal(item: ApprovalInboxItemDto, actionType: 'Approved' | 'Rejected' | 'Returned'): void {
    this.selectedItem = item;
    this.actionType = actionType;
    this.showActionModal = true;
    this.actionForm.reset({ comments: '' });
  }

  processAction(): void {
    console.log('[ApprovalInbox] processAction called');
    console.log('[ApprovalInbox] selectedItem:', this.selectedItem);
    console.log('[ApprovalInbox] currentUserId:', this.currentUserId);
    console.log('[ApprovalInbox] actionType:', this.actionType);
    console.log('[ApprovalInbox] form valid:', this.actionForm.valid);
    console.log('[ApprovalInbox] form value:', this.actionForm.value);

    if (!this.selectedItem) {
      console.error('[ApprovalInbox] No selected item');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No item selected'
      });
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

    const actionDto: ProcessApprovalActionDto = {
      submissionId: this.selectedItem.submissionId,
      stageId: stageId,
      actionType: this.actionType,
      actionByUserId: this.currentUserId,
      comments: formData.comments || null
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
    if (this.actionType === 'Approved') {
      // Use approveSubmissionDto with default stageId = 1
      const approveDto = {
        submissionId: this.selectedItem.submissionId,
        stageId: 1, // Default stageId
        actionByUserId: this.currentUserId,
        comments: formData.comments || null
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
        comments: formData.comments || null
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
        comments: formData.comments || null
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
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to process action';
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

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.selectedItem = null;
    this.actionForm.reset();
  }
}

