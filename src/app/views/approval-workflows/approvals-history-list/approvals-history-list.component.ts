import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentApprovalHistoryService, DocumentApprovalHistoryDto } from '../../FormBuilder/services/document-approval-history.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-approvals-history-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    TableModule,
    PaginatorModule,
    TooltipModule
  ],
  templateUrl: './approvals-history-list.component.html',
  styleUrls: ['./approvals-history-list.component.scss'],
  providers: [MessageService]
})
export class ApprovalsHistoryListComponent implements OnInit {
  historyItems: DocumentApprovalHistoryDto[] = [];
  filteredItems: DocumentApprovalHistoryDto[] = [];

  loading = {
    history: false
  };

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  // Filter options
  selectedActionType: string = 'Submitted';
  actionTypes = [
    { label: 'All Actions', value: 'all' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  constructor(
    private historyService: DocumentApprovalHistoryService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
    }

    this.loadApprovalHistory();
  }

  loadApprovalHistory(): void {
    this.loading.history = true;
    this.historyService.getAllApprovalHistory().subscribe({
      next: (items: DocumentApprovalHistoryDto[]) => {
        // Debug: Log items to check submissionStatus
        console.log('[ApprovalsHistory] Loaded items:', items);
        console.log('[ApprovalsHistory] Items with submissionStatus:', items?.map(item => ({
          id: item.id,
          documentNumber: item.documentNumber,
          submissionStatus: item.submissionStatus,
          actionType: item.actionType
        })));
        
        // Sort by action date (newest first)
        this.historyItems = (items || []).sort((a, b) => {
          const dateA = new Date(a.actionDate).getTime();
          const dateB = new Date(b.actionDate).getTime();
          return dateB - dateA;
        });
        this.applyFilters();
        this.loading.history = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading approval history:', error);
        this.historyItems = [];
        this.filteredItems = [];
        this.loading.history = false;
        
        let errorMessage = 'Failed to load approval history';
        if (error.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view approval history. Please contact your administrator.';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.historyItems];

    // Filter by action type or submission status
    if (this.selectedActionType !== 'all') {
      if (this.selectedActionType === 'Submitted') {
        // Filter by submission status (case-insensitive)
        filtered = filtered.filter(item => {
          const status = item.submissionStatus?.toString().trim();
          const isSubmitted = status && status.toLowerCase() === 'submitted';
          
          // Debug log for items that don't match
          if (!isSubmitted && item.submissionStatus) {
            console.log('[ApprovalsHistory] Item not matching Submitted filter:', {
              id: item.id,
              documentNumber: item.documentNumber,
              submissionStatus: item.submissionStatus,
              statusLower: status?.toLowerCase()
            });
          }
          
          return isSubmitted;
        });
        console.log('[ApprovalsHistory] Filtering by Submitted status. Total items:', this.historyItems.length, 'Filtered:', filtered.length);
        if (filtered.length > 0) {
          console.log('[ApprovalsHistory] Filtered items:', filtered.map(item => ({
            id: item.id,
            documentNumber: item.documentNumber,
            submissionStatus: item.submissionStatus
          })));
        } else {
          console.log('[ApprovalsHistory] No items found with Submitted status. All items:', 
            this.historyItems.map(item => ({
              id: item.id,
              documentNumber: item.documentNumber,
              submissionStatus: item.submissionStatus,
              actionType: item.actionType
            }))
          );
        }
      } else {
        // Filter by action type
        filtered = filtered.filter(item => item.actionType === this.selectedActionType);
      }
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.documentNumber?.toLowerCase().includes(term) ||
        item.formName?.toLowerCase().includes(term) ||
        item.documentTypeName?.toLowerCase().includes(term) ||
        item.actionByUserName?.toLowerCase().includes(term) ||
        item.stageName?.toLowerCase().includes(term) ||
        item.comments?.toLowerCase().includes(term)
      );
    }

    this.filteredItems = filtered;
    this.totalRecords = this.filteredItems.length;
    this.first = 0; // Reset to first page when filtering
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onActionTypeChange(): void {
    this.applyFilters();
  }

  refreshData(): void {
    this.loadApprovalHistory();
  }

  getPaginatedItems(): DocumentApprovalHistoryDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredItems.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  getActionTypeBadgeClass(actionType: string): string {
    switch (actionType) {
      case 'Approved':
        return 'badge badge-success';
      case 'Rejected':
        return 'badge badge-danger';
      case 'Returned':
        return 'badge badge-warning';
      case 'Pending':
        return 'badge badge-info';
      default:
        return 'badge badge-secondary';
    }
  }

  getActionTypeIcon(actionType: string): string {
    switch (actionType) {
      case 'Approved':
        return 'pi pi-check';
      case 'Rejected':
        return 'pi pi-times';
      case 'Returned':
        return 'pi pi-reply';
      case 'Pending':
        return 'pi pi-clock';
      default:
        return 'pi pi-circle';
    }
  }

  getStatusBadgeClass(status: string | null | undefined): string {
    if (!status) return 'badge badge-secondary';
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'approved':
        return 'badge badge-success';
      case 'rejected':
        return 'badge badge-danger';
      case 'submitted':
        return 'badge badge-info';
      case 'draft':
        return 'badge badge-secondary';
      default:
        return 'badge badge-secondary';
    }
  }
}

