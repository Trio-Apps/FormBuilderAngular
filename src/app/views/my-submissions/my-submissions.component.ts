import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormSubmissionsService, FormSubmissionDto } from '../form-submissions/services/form-submissions.service';
import { StorageService } from '../../auth/storage.service';
import { AuthService } from '../../auth/auth.service';
import { DocuSignOAuthService } from '../../auth/docusign-oauth.service';
import { TranslationService } from '../../core/services/translation.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-my-submissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    PaginatorModule
  ],
  templateUrl: './my-submissions.component.html',
  styleUrls: ['./my-submissions.component.scss'],
  providers: [MessageService]
})
export class MySubmissionsComponent implements OnInit {
  private readonly pendingSubmissionStorageKey = 'docusign_pending_submission_id';

  submissions: FormSubmissionDto[] = [];
  filteredSubmissions: FormSubmissionDto[] = [];
  currentUserId: string | null = null;
  currentUsername: string | null = null;

  loading = false;
  searchTerm = '';
  loadingSignatureSubmissionId: number | null = null;

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private formSubmissionsService: FormSubmissionsService,
    private storageService: StorageService,
    private authService: AuthService,
    private docusignOAuthService: DocuSignOAuthService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Get current user info
    this.currentUsername = this.storageService.getUsername() || this.authService.userName();
    const userId = this.storageService.getUserId();
    this.currentUserId = userId?.toString() || this.currentUsername || null;

    console.log('[MySubmissions] Current user:', {
      username: this.currentUsername,
      userId: this.currentUserId
    });

    if (this.currentUserId || this.currentUsername) {
      this.loadMySubmissions();
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'User ID not found. Please log in again.'
      });
    }
  }

  loadMySubmissions(): void {
    this.loading = true;

    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (allSubmissions: FormSubmissionDto[]) => {
        // Filter to show only submissions by current user
        this.submissions = (allSubmissions || []).filter(sub => {
          const submittedBy = sub.submittedByUserId?.trim().toLowerCase();
          const currentUser = this.currentUsername?.trim().toLowerCase();
          const currentId = this.currentUserId?.trim().toLowerCase();

          return submittedBy === currentUser ||
                 submittedBy === currentId ||
                 submittedBy === `${currentUser} ` || // Handle trailing space
                 submittedBy === `${currentId} `;
        });

        this.filteredSubmissions = [...this.submissions];
        this.totalRecords = this.filteredSubmissions.length;
        this.loading = false;

        console.log('[MySubmissions] Loaded submissions:', {
          total: allSubmissions?.length,
          filtered: this.submissions.length,
          username: this.currentUsername
        });

        this.tryResumePendingSignNow();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[MySubmissions] Error loading submissions:', error);
        this.submissions = [];
        this.filteredSubmissions = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load your submissions'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterSubmissions(): void {
    if (!this.searchTerm.trim()) {
      this.filteredSubmissions = [...this.submissions];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredSubmissions = this.submissions.filter(sub =>
        sub.documentNumber?.toLowerCase().includes(term) ||
        sub.formName?.toLowerCase().includes(term) ||
        sub.documentTypeName?.toLowerCase().includes(term) ||
        sub.status?.toLowerCase().includes(term)
      );
    }
    this.totalRecords = this.filteredSubmissions.length;
    this.first = 0;
  }

  onSearchChange(): void {
    this.filterSubmissions();
  }

  getPaginatedSubmissions(): FormSubmissionDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredSubmissions.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  refreshData(): void {
    this.loadMySubmissions();
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date || date === '0001-01-01T00:00:00') return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'draft': return 'status-draft';
      case 'submitted': return 'status-submitted';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return 'status-default';
    }
  }

  canShowSignNow(submission: FormSubmissionDto): boolean {
    const normalizedStatus = (submission?.status || '').trim().toLowerCase();
    const normalizedSignatureStatus = (submission?.signatureStatus || '').trim().toLowerCase();

    // Show action for submitted requests or explicit pending-signature state.
    return normalizedStatus === 'submitted' || normalizedSignatureStatus === 'pending';
  }

  openSignNow(submission: FormSubmissionDto): void {
    if (!submission?.id) {
      return;
    }

    const docuSignAccessToken = localStorage.getItem('docusign_access_token');
    if (!docuSignAccessToken || !docuSignAccessToken.trim()) {
      this.messageService.add({
        severity: 'info',
        summary: 'DocuSign',
        detail: this.translationService.getCurrentLanguage() === 'ar'
          ? 'جاري تحويلك إلى DocuSign لإتمام تسجيل الدخول ثم المتابعة.'
          : 'Redirecting to DocuSign to authenticate and continue signing.'
      });

      localStorage.setItem(this.pendingSubmissionStorageKey, submission.id.toString());
      this.docusignOAuthService.startLogin('signature', '/my-submissions', submission.id);
      return;
    }

    this.loadingSignatureSubmissionId = submission.id;
    this.formSubmissionsService.getSubmissionSigningUrlById(submission.id).subscribe({
      next: (response) => {
        this.loadingSignatureSubmissionId = null;
        const signingUrl = response?.signingUrl || null;
        if (signingUrl) {
          window.open(signingUrl, '_blank', 'noopener,noreferrer');
          return;
        }

        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Signing URL is not available for this submission.'
        });
      },
      error: (error) => {
        this.loadingSignatureSubmissionId = null;
        const errorMessage = error?.error?.message || error?.message || 'Failed to open signing page.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  private tryResumePendingSignNow(): void {
    const pendingSubmissionIdText = localStorage.getItem(this.pendingSubmissionStorageKey);
    if (!pendingSubmissionIdText) {
      return;
    }

    const token = localStorage.getItem('docusign_access_token');
    if (!token || !token.trim()) {
      return;
    }

    const pendingSubmissionId = Number(pendingSubmissionIdText);
    if (!pendingSubmissionId || pendingSubmissionId <= 0) {
      localStorage.removeItem(this.pendingSubmissionStorageKey);
      return;
    }

    const pendingSubmission = this.submissions.find(x => x.id === pendingSubmissionId);
    localStorage.removeItem(this.pendingSubmissionStorageKey);

    if (!pendingSubmission) {
      return;
    }

    setTimeout(() => this.openSignNow(pendingSubmission), 100);
  }
}
