import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TableShellComponent } from '../../shared/table-shell/table-shell.component';
import { AuditTrailService, AuditTrailDto } from '../FormBuilder/services/audit-trail.service';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableModule, PaginatorModule, TableShellComponent],
  templateUrl: './audit-trail.component.html',
  styleUrls: ['./audit-trail.component.scss'],
  providers: [MessageService]
})
export class AuditTrailComponent implements OnInit {
  logs: AuditTrailDto[] = [];
  loading = false;

  entityTypeFilter = '';
  entityIdFilter: number | null = null;
  actionFilter = '';

  first = 0;
  rows = 20;
  totalRecords = 0;

  constructor(
    private auditTrailService: AuditTrailService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1;
    this.auditTrailService.getLog({
      entityType: this.entityTypeFilter || undefined,
      entityId: this.entityIdFilter || undefined,
      action: this.actionFilter || undefined,
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load audit trail.' });
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
    this.entityTypeFilter = '';
    this.entityIdFilter = null;
    this.actionFilter = '';
    this.first = 0;
    this.load();
  }

  /** Colour family by action prefix for the badge. */
  actionClass(action: string): string {
    const a = (action || '').toLowerCase();
    if (a.startsWith('approval:approved')) return 'act-approved';
    if (a.startsWith('approval:rejected')) return 'act-rejected';
    if (a.startsWith('approval:returned')) return 'act-returned';
    if (a.startsWith('letter')) return 'act-letter';
    if (a.startsWith('clause')) return 'act-clause';
    if (a.startsWith('email')) return 'act-email';
    if (a.startsWith('post')) return 'act-post';
    if (a.startsWith('sign')) return 'act-sign';
    return 'act-default';
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleString();
  }
}
