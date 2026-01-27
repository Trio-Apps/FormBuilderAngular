import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import {
  CreateSmtpConfigDto,
  SmtpConfigDto,
  SmtpConfigsService,
  UpdateSmtpConfigDto
} from '../../FormBuilder/services/smtp-configs.service';

@Component({
  selector: 'app-smtp-configs-manage',
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
    CheckboxModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    TableModule,
    TableShellComponent,
    TableActionsComponent,
    DialogShellComponent
  ],
  templateUrl: './smtp-configs-manage.component.html',
  styleUrls: ['./smtp-configs-manage.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class SmtpConfigsManageComponent implements OnInit, OnDestroy {
  configs: SmtpConfigDto[] = [];
  filteredConfigs: SmtpConfigDto[] = [];

  includeInactive = false;
  loading = {
    list: false,
    save: false,
    toggle: false,
    delete: false
  };

  searchTerm = '';

  showModal = false;
  editing: SmtpConfigDto | null = null;
  form: FormGroup;

  private subs: Subscription[] = [];

  constructor(
    private smtpService: SmtpConfigsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      host: ['', [Validators.required, Validators.maxLength(200)]],
      port: [465, [Validators.required, Validators.min(1), Validators.max(65535)]],
      useSsl: [true],
      userName: ['', [Validators.required, Validators.maxLength(200)]],
      password: [''],
      fromEmail: ['', [Validators.required, Validators.maxLength(200)]],
      fromDisplayName: ['', [Validators.maxLength(200)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  load(): void {
    this.loading.list = true;
    const sub = this.smtpService.getAll(this.includeInactive).subscribe({
      next: (items) => {
        this.configs = items || [];
        this.applyFilters();
        this.loading.list = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.configs = [];
        this.filteredConfigs = [];
        this.loading.list = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load SMTP configs'
        });
      }
    });
    this.subs.push(sub);
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    const base = (this.configs || []).filter(c => !(c as any)?.isDeleted);
    if (!term) {
      this.filteredConfigs = [...base];
      return;
    }
    this.filteredConfigs = base.filter(c =>
      String(c.name || '').toLowerCase().includes(term) ||
      String(c.host || '').toLowerCase().includes(term) ||
      String(c.userName || '').toLowerCase().includes(term) ||
      String(c.fromEmail || '').toLowerCase().includes(term)
    );
  }

  getActiveCount(): number {
    return (this.configs || []).filter(c => !!c.isActive).length;
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({
      name: '',
      host: '',
      port: 465,
      useSsl: true,
      userName: '',
      password: '',
      fromEmail: '',
      fromDisplayName: 'Form Builder System',
      isActive: true
    });
    this.showModal = true;
  }

  openEdit(row: SmtpConfigDto): void {
    this.editing = row;
    this.form.reset({
      name: row.name || '',
      host: row.host || '',
      port: row.port ?? 465,
      useSsl: !!row.useSsl,
      userName: row.userName || '',
      password: '', // never prefill
      fromEmail: row.fromEmail || '',
      fromDisplayName: row.fromDisplayName || '',
      isActive: !!row.isActive
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editing = null;
  }

  private markTouched(): void {
    Object.values(this.form.controls).forEach(c => c.markAsTouched());
  }

  save(): void {
    if (this.form.invalid) {
      this.markTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields'
      });
      return;
    }

    const v = this.form.value;
    const password = String(v.password || '');

    if (!this.editing && password.trim() === '') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Password is required when creating a new SMTP config'
      });
      return;
    }

    this.loading.save = true;

    if (!this.editing) {
      const dto: CreateSmtpConfigDto = {
        name: String(v.name).trim(),
        host: String(v.host).trim(),
        port: Number(v.port),
        useSsl: !!v.useSsl,
        userName: String(v.userName).trim(),
        password: password,
        fromEmail: String(v.fromEmail).trim(),
        fromDisplayName: String(v.fromDisplayName || '').trim(),
        isActive: !!v.isActive
      };

      const sub = this.smtpService.create(dto).subscribe({
        next: () => {
          this.loading.save = false;
          this.closeModal();
          this.load();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMTP config created' });
        },
        error: () => {
          this.loading.save = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create SMTP config' });
        }
      });
      this.subs.push(sub);
      return;
    }

    const updateDto: UpdateSmtpConfigDto = {
      name: String(v.name).trim(),
      host: String(v.host).trim(),
      port: Number(v.port),
      useSsl: !!v.useSsl,
      userName: String(v.userName).trim(),
      fromEmail: String(v.fromEmail).trim(),
      fromDisplayName: String(v.fromDisplayName || '').trim(),
      isActive: !!v.isActive
    };

    if (password.trim() !== '') {
      updateDto.password = password;
    }

    const sub = this.smtpService.update(this.editing.id, updateDto).subscribe({
      next: () => {
        this.loading.save = false;
        this.closeModal();
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMTP config updated' });
      },
      error: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update SMTP config' });
      }
    });
    this.subs.push(sub);
  }

  toggleActive(row: SmtpConfigDto): void {
    if (!row?.id) return;
    this.loading.toggle = true;
    const op$ = row.isActive ? this.smtpService.deactivate(row.id) : this.smtpService.activate(row.id);
    const sub = op$.subscribe({
      next: () => {
        this.loading.toggle = false;
        this.load();
      },
      error: () => {
        this.loading.toggle = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to toggle status' });
      }
    });
    this.subs.push(sub);
  }

  confirmDelete(row: SmtpConfigDto): void {
    if (!row?.id) return;
    this.confirmationService.confirm({
      header: 'Delete SMTP Config',
      message: `Are you sure you want to delete "${row.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.delete(row)
    });
  }

  private delete(row: SmtpConfigDto): void {
    this.loading.delete = true;
    const sub = this.smtpService.delete(row.id).subscribe({
      next: () => {
        this.loading.delete = false;
        // Soft delete on backend → reflect immediately in UI
        (row as any).isDeleted = true;
        row.isActive = false;
        this.configs = (this.configs || []).filter(c => c.id !== row.id);
        this.applyFilters();
        this.load();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMTP config deleted' });
      },
      error: (err) => {
        const detail: string =
          err?.error?.error ||
          err?.error?.message ||
          err?.message ||
          'Failed to delete SMTP config';

        // If backend blocks deletion because it's referenced by templates, fallback to deactivation (soft-hide)
        if (err?.status === 400 && String(detail).toLowerCase().includes('used')) {
          if (!row.isActive) {
            this.includeInactive = false;
            this.loading.delete = false;
            this.load(); // hide inactive items immediately
            this.messageService.add({
              severity: 'warn',
              summary: 'Cannot delete',
              detail: `${detail}. It was hidden (turn on "Include inactive" to show it).`
            });
            return;
          }

          const sub2 = this.smtpService.deactivate(row.id).subscribe({
            next: () => {
              this.loading.delete = false;
              this.load();
              this.messageService.add({
                severity: 'warn',
                summary: 'Cannot delete',
                detail: `${detail}. Config was deactivated instead.`
              });
            },
            error: () => {
              this.loading.delete = false;
              this.messageService.add({ severity: 'error', summary: 'Error', detail });
            }
          });
          this.subs.push(sub2);
          return;
        }

        this.loading.delete = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      }
    });
    this.subs.push(sub);
  }
}


