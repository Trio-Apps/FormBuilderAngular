import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../auth/auth.service';
import { StorageService } from '../../../auth/storage.service';
import {
  FormSubmissionsService,
  FormSubmissionDetailDto
} from '../services/form-submissions.service';
import { ApproveSubmissionDto, RejectSubmissionDto } from '../models/approve-reject-submission.model';

@Component({
  selector: 'app-submission-approval',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, ToastModule],
  templateUrl: './submission-approval.component.html',
  styleUrls: ['./submission-approval.component.scss'],
  providers: [MessageService]
})
export class SubmissionApprovalComponent implements OnInit {
  @Input() submissionId!: number;
  @Input() stageId?: number | null;

  submission: FormSubmissionDetailDto | null = null;
  approvalForm: FormGroup;
  rejectForm: FormGroup;

  isLoading = false;

  constructor(
    private formSubmissionsService: FormSubmissionsService,
    private authService: AuthService,
    private storageService: StorageService,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.approvalForm = this.fb.group({
      comments: ['', [Validators.maxLength(500)]]
    });

    this.rejectForm = this.fb.group({
      comments: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadSubmission();
  }

  private getCurrentUserId(): string {
    // Backend/email logic commonly uses username (e.g. "anas") as the identifier.
    // Prefer username, fallback to numeric id string if needed.
    return this.authService.userName() || this.storageService.getUserId()?.toString() || 'anas';
  }

  loadSubmission(): void {
    if (!this.submissionId) return;

    this.isLoading = true;
    this.formSubmissionsService.getSubmissionById(this.submissionId).subscribe({
      next: (submission) => {
        this.submission = submission;
        if (!this.stageId && (submission as any)?.stageId) {
          this.stageId = (submission as any).stageId;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error?.message || error?.error?.message || 'Failed to load submission';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
      }
    });
  }

  onSubmit(): void {
    if (!this.submissionId) return;

    const currentUserId = this.getCurrentUserId();
    this.isLoading = true;

    this.formSubmissionsService.submitSubmission(this.submissionId, currentUserId).subscribe({
      next: (submission) => {
        this.submission = submission as any;
        this.stageId = (submission as any)?.stageId ?? this.stageId;
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Submitted successfully', life: 3000 });
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error?.message || error?.error?.message || 'Failed to submit';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
      }
    });
  }

  onApprove(): void {
    if (this.approvalForm.invalid) return;
    if (!this.submissionId || !this.stageId) return;

    const dto: ApproveSubmissionDto = {
      submissionId: this.submissionId,
      stageId: Number(this.stageId),
      actionByUserId: this.getCurrentUserId(),
      comments: this.approvalForm.value.comments || null
    };

    this.isLoading = true;
    this.formSubmissionsService.approveSubmissionDto(dto).subscribe({
      next: (response) => {
        this.isLoading = false;
        if ((response as any)?.statusCode === 200 || (response as any)?.success) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: response.message || 'Approved', life: 3000 });
          this.approvalForm.reset();
          this.loadSubmission();
          return;
        }
        this.messageService.add({ severity: 'warn', summary: 'Warning', detail: response.message || 'Approval completed with warnings', life: 5000 });
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error?.message || error?.error?.message || 'Failed to approve';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
      }
    });
  }

  onReject(): void {
    if (this.rejectForm.invalid) return;
    if (!this.submissionId || !this.stageId) return;

    const dto: RejectSubmissionDto = {
      submissionId: this.submissionId,
      stageId: Number(this.stageId),
      actionByUserId: this.getCurrentUserId(),
      comments: this.rejectForm.value.comments
    };

    this.isLoading = true;
    this.formSubmissionsService.rejectSubmissionDto(dto).subscribe({
      next: (response) => {
        this.isLoading = false;
        if ((response as any)?.statusCode === 200 || (response as any)?.success) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: response.message || 'Rejected', life: 3000 });
          this.rejectForm.reset();
          this.loadSubmission();
          return;
        }
        this.messageService.add({ severity: 'warn', summary: 'Warning', detail: response.message || 'Rejection completed with warnings', life: 5000 });
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error?.message || error?.error?.message || 'Failed to reject';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
      }
    });
  }

  canSubmit(): boolean {
    return (this.submission as any)?.status === 'Draft';
  }

  canApprove(): boolean {
    return (this.submission as any)?.status === 'Submitted' && !!this.stageId;
  }

  canReject(): boolean {
    return (this.submission as any)?.status === 'Submitted' && !!this.stageId;
  }
}


