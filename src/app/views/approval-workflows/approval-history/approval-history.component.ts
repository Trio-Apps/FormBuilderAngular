import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocumentApprovalHistoryService, DocumentApprovalHistoryDto } from '../../FormBuilder/services/document-approval-history.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-approval-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    TableModule,
    PaginatorModule,
    TableShellComponent
  ],
  templateUrl: './approval-history.component.html',
  styleUrls: ['./approval-history.component.scss'],
  providers: [MessageService]
})
export class ApprovalHistoryComponent implements OnInit {
  submissionId!: number;
  history: DocumentApprovalHistoryDto[] = [];
  filteredHistory: DocumentApprovalHistoryDto[] = [];

  loading = {
    history: false
  };

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private route: ActivatedRoute,
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

    this.route.params.subscribe(params => {
      this.submissionId = +params['submissionId'];
      if (this.submissionId) {
        this.loadHistory();
      }
    });
  }

  loadHistory(): void {
    if (!this.submissionId) return;

    this.loading.history = true;
    this.historyService.getHistoryBySubmissionId(this.submissionId).subscribe({
      next: (history: DocumentApprovalHistoryDto[]) => {
        // Sort by action date (newest first)
        this.history = (history || []).sort((a, b) => {
          const dateA = new Date(a.actionDate).getTime();
          const dateB = new Date(b.actionDate).getTime();
          return dateB - dateA;
        });
        this.filteredHistory = [...this.history];
        this.totalRecords = this.filteredHistory.length;
        this.loading.history = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.history = [];
        this.filteredHistory = [];
        this.loading.history = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load approval history'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterHistory(): void {
    if (!this.searchTerm.trim()) {
      this.filteredHistory = [...this.history];
      this.totalRecords = this.filteredHistory.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredHistory = this.history.filter(h =>
      h.actionType?.toLowerCase().includes(term) ||
      h.actionByUserName?.toLowerCase().includes(term) ||
      h.stageName?.toLowerCase().includes(term) ||
      h.comments?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredHistory.length;
  }

  onSearchChange(): void {
    this.filterHistory();
    this.first = 0;
  }

  getPaginatedHistory(): DocumentApprovalHistoryDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredHistory.slice(start, end);
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
      default:
        return 'pi pi-circle';
    }
  }
}

