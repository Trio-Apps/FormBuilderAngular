import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { AlertAuditLogService, AlertAuditLogDto } from '../../FormBuilder/services/alert-audit-log.service';

@Component({
  selector: 'app-alert-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableModule, PaginatorModule, TableShellComponent],
  templateUrl: './alert-audit-log.component.html',
  styleUrls: ['./alert-audit-log.component.scss'],
  providers: [MessageService]
})
export class AlertAuditLogComponent implements OnInit {
  logs: AlertAuditLogDto[] = [];
  loading = false;

  submissionFilter: number | null = null;

  first = 0;
  rows = 20;
  totalRecords = 0;

  constructor(
    private alertAuditLogService: AlertAuditLogService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1;
    this.alertAuditLogService.getLog({
      submissionId: this.submissionFilter || undefined,
      page,
      pageSize: this.rows
    }).subscribe({
      next: (res) => {
        this.logs = res.items || [];
        this.totalRecords = res.total || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.logs = [];
        this.totalRecords = 0;
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load alert log.' });
        this.cdr.detectChanges();
      }
    });
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
    this.load();
  }

  applyFilter(): void {
    this.first = 0;
    this.load();
  }

  clearFilter(): void {
    this.submissionFilter = null;
    this.first = 0;
    this.load();
  }

  channelClass(channel: string): string {
    return (channel || '').toLowerCase() === 'email' ? 'chan-email' : 'chan-internal';
  }

  channelIcon(channel: string): string {
    return (channel || '').toLowerCase() === 'email' ? 'pi pi-envelope' : 'pi pi-bell';
  }

  statusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'sent': return 'st-sent';
      case 'queued': return 'st-queued';
      case 'failed': return 'st-failed';
      default: return 'st-skipped';
    }
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleString();
  }
}
