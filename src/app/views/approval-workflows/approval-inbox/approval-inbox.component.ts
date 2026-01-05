import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalWorkflowRuntimeService, ApprovalInboxItemDto, ProcessApprovalActionDto } from '../../FormBuilder/services/approval-workflow-runtime.service';
import { StorageService } from '../../../auth/storage.service';
import { MessageService, ConfirmationService } from 'primeng/api';
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
  currentUserId: string | null = null;

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
    private storageService: StorageService,
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

    // Get current user ID
    this.currentUserId = this.storageService.getUserId()?.toString() || null;
    
    if (this.currentUserId) {
      this.loadInbox();
    } else {
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
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load approval inbox'
        });
        this.cdr.detectChanges();
      }
    });
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
    if (!this.selectedItem || !this.currentUserId) return;

    this.loading.action = true;
    const formData = this.actionForm.value;

    const actionDto: ProcessApprovalActionDto = {
      submissionId: this.selectedItem.submissionId,
      stageId: this.selectedItem.stageId,
      actionType: this.actionType,
      actionByUserId: this.currentUserId,
      comments: formData.comments || null
    };

    this.runtimeService.processApprovalAction(actionDto).subscribe({
      next: () => {
        this.loading.action = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Document ${this.actionType.toLowerCase()} successfully`
        });
        this.closeActionModal();
        this.loadInbox();
      },
      error: (error: any) => {
        this.loading.action = false;
        console.error('Error processing action:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to process action';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
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

