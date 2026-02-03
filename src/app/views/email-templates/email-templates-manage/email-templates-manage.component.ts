import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';

import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { PermissionService } from '../../../services/permission.service';
import { HasPermissionDirective } from '../../../directives/has-permission.directive';

import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { SmtpConfigDto, SmtpConfigsService } from '../../FormBuilder/services/smtp-configs.service';
import {
  CreateEmailTemplateDto,
  EmailTemplateCode,
  EmailTemplateDto,
  EmailTemplatesService,
  UpdateEmailTemplateDto
} from '../../FormBuilder/services/email-templates.service';

type TemplateCodeOption = { label: string; value: EmailTemplateCode };

@Component({
  selector: 'app-email-templates-manage',
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
    ButtonModule,
    TableModule,
    SelectModule,
    TableShellComponent,
    TableActionsComponent,
    DialogShellComponent,
    HasPermissionDirective
  ],
  templateUrl: './email-templates-manage.component.html',
  styleUrls: ['./email-templates-manage.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class EmailTemplatesManageComponent implements OnInit, OnDestroy {
  documentTypes: DocumentType[] = [];
  smtpConfigs: SmtpConfigDto[] = [];

  templates: EmailTemplateDto[] = [];
  filteredTemplates: EmailTemplateDto[] = [];

  // Permission flags
  canViewEmailTemplates = false;
  canCreateEmailTemplates = false;
  canEditEmailTemplates = false;
  canDeleteEmailTemplates = false;
  canManageEmailTemplates = false;

  templateCodeOptions: TemplateCodeOption[] = [
    { label: 'SubmissionConfirmation', value: 'SubmissionConfirmation' },
    { label: 'ApprovalRequired', value: 'ApprovalRequired' },
    { label: 'ApprovalResult', value: 'ApprovalResult' }
  ];

  selectedDocumentTypeId: number | null = null;
  selectedTemplateCode: EmailTemplateCode | null = null;
  includeInactive = false;
  searchTerm = '';

  loading = {
    init: false,
    list: false,
    save: false,
    toggle: false,
    delete: false
  };

  showModal = false;
  editing: EmailTemplateDto | null = null;
  form: FormGroup;

  private subs: Subscription[] = [];

  constructor(
    private docTypesService: DocumentTypesService,
    private smtpService: SmtpConfigsService,
    private templatesService: EmailTemplatesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public permissionService: PermissionService
  ) {
    this.form = this.fb.group({
      documentTypeId: [null, Validators.required],
      templateName: ['', [Validators.required, Validators.maxLength(200)]],
      templateCode: [null, Validators.required],
      subjectTemplate: ['', [Validators.required, Validators.maxLength(500)]],
      bodyTemplateHtml: ['', [Validators.required]],
      smtpConfigId: [null, Validators.required],
      isDefault: [false],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    // Always reload permissions from API to ensure fresh data (clears cache first)
    console.log('[EmailTemplatesManage] Refreshing permissions from API (clearing cache)...');
    this.permissionService.refreshPermissions().subscribe({
      next: (perms) => {
        console.log('[EmailTemplatesManage] Permissions loaded from API:', perms);
        this.loadPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[EmailTemplatesManage] Error loading permissions:', err);
        this.loadPermissions();
      }
    });

    // Subscribe to permission changes
    this.permissionService.permissions$.subscribe(() => {
      this.loadPermissions();
      this.cdr.detectChanges();
    });

    this.loadInitialData();
  }

  /**
   * Load user permissions for email template operations
   */
  private loadPermissions(): void {
    this.canViewEmailTemplates = this.permissionService.canViewEmailTemplates();
    this.canCreateEmailTemplates = this.permissionService.canCreateEmailTemplates();
    this.canEditEmailTemplates = this.permissionService.canEditEmailTemplates();
    this.canDeleteEmailTemplates = this.permissionService.canDeleteEmailTemplates();
    this.canManageEmailTemplates = this.permissionService.canManageEmailTemplates();
    console.log('[EmailTemplatesManage] Permission flags:', {
      canViewEmailTemplates: this.canViewEmailTemplates,
      canCreateEmailTemplates: this.canCreateEmailTemplates,
      canEditEmailTemplates: this.canEditEmailTemplates,
      canDeleteEmailTemplates: this.canDeleteEmailTemplates,
      canManageEmailTemplates: this.canManageEmailTemplates
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadInitialData(): void {
    this.loading.init = true;
    const sub = forkJoin({
      docTypes: this.docTypesService.getAllDocumentTypes(),
      smtp: this.smtpService.getAll(true)
    }).subscribe({
      next: ({ docTypes, smtp }) => {
        this.documentTypes = docTypes || [];
        this.smtpConfigs = smtp || [];
        this.loading.init = false;
        this.loadTemplates();
      },
      error: () => {
        this.loading.init = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load lookup data' });
      }
    });
    this.subs.push(sub);
  }

  loadTemplates(): void {
    this.loading.list = true;
    const sub = this.templatesService
      .getAll({ documentTypeId: this.selectedDocumentTypeId ?? undefined, includeInactive: this.includeInactive })
      .subscribe({
        next: (items) => {
          this.templates = items || [];
          this.applyFilters();
          this.loading.list = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.templates = [];
          this.filteredTemplates = [];
          this.loading.list = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load email templates' });
        }
      });
    this.subs.push(sub);
  }

  applyFilters(): void {
    let items = [...(this.templates || [])].filter(t => !(t as any)?.isDeleted);

    if (this.selectedTemplateCode) {
      items = items.filter(t => String(t.templateCode) === String(this.selectedTemplateCode));
    }

    const term = (this.searchTerm || '').trim().toLowerCase();
    if (term) {
      items = items.filter(t =>
        String(t.templateName || '').toLowerCase().includes(term) ||
        String(t.subjectTemplate || '').toLowerCase().includes(term)
      );
    }

    this.filteredTemplates = items;
  }

  getDocTypeName(documentTypeId: number): string {
    const dt = (this.documentTypes || []).find(d => Number(d.id) === Number(documentTypeId));
    return dt?.name || `#${documentTypeId}`;
  }

  getSmtpName(smtpConfigId: number): string {
    const sc = (this.smtpConfigs || []).find(s => Number(s.id) === Number(smtpConfigId));
    return sc?.name || `#${smtpConfigId}`;
  }

  getActiveCount(): number {
    return (this.templates || []).filter(t => !!t.isActive).length;
  }

  openCreate(template?: EmailTemplateDto): void {
    if (template) {
      // Editing existing template
      if (!this.canEditEmailTemplates && !this.canManageEmailTemplates) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit email templates.' });
        return;
      }
      this.editing = template;
    } else {
      // Creating new template
      if (!this.canCreateEmailTemplates && !this.canManageEmailTemplates) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create email templates.' });
        return;
      }
      this.editing = null;
    }
    this.form.reset({
      documentTypeId: this.selectedDocumentTypeId,
      templateName: '',
      templateCode: this.selectedTemplateCode,
      subjectTemplate: '',
      bodyTemplateHtml: '',
      smtpConfigId: null,
      isDefault: false,
      isActive: true
    });
    this.showModal = true;
  }

  openEdit(row: EmailTemplateDto): void {
    if (!this.canEditEmailTemplates && !this.canManageEmailTemplates) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit email templates.' });
      return;
    }

    this.editing = row;
    this.form.reset({
      documentTypeId: row.documentTypeId,
      templateName: row.templateName || '',
      templateCode: row.templateCode as any,
      subjectTemplate: row.subjectTemplate || '',
      bodyTemplateHtml: row.bodyTemplateHtml || '',
      smtpConfigId: row.smtpConfigId,
      isDefault: !!row.isDefault,
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
    if (this.editing) {
      // Update existing template
      if (!this.canEditEmailTemplates && !this.canManageEmailTemplates) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to edit email templates.' });
        return;
      }
    } else {
      // Create new template
      if (!this.canCreateEmailTemplates && !this.canManageEmailTemplates) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to create email templates.' });
        return;
      }
    }

    if (this.form.invalid) {
      this.markTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields' });
      return;
    }

    const v = this.form.value;
    this.loading.save = true;

    if (!this.editing) {
      const dto: CreateEmailTemplateDto = {
        documentTypeId: Number(v.documentTypeId),
        templateName: String(v.templateName).trim(),
        templateCode: String(v.templateCode),
        subjectTemplate: String(v.subjectTemplate),
        bodyTemplateHtml: String(v.bodyTemplateHtml),
        smtpConfigId: Number(v.smtpConfigId),
        isDefault: !!v.isDefault,
        isActive: !!v.isActive
      };

      const sub = this.templatesService.create(dto).subscribe({
        next: () => {
          this.loading.save = false;
          this.closeModal();
          this.loadTemplates();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email template created' });
        },
        error: () => {
          this.loading.save = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create email template' });
        }
      });
      this.subs.push(sub);
      return;
    }

    const dto: UpdateEmailTemplateDto = {
      documentTypeId: Number(v.documentTypeId),
      templateName: String(v.templateName).trim(),
      templateCode: String(v.templateCode),
      subjectTemplate: String(v.subjectTemplate),
      bodyTemplateHtml: String(v.bodyTemplateHtml),
      smtpConfigId: Number(v.smtpConfigId),
      isDefault: !!v.isDefault,
      isActive: !!v.isActive
    };

    const sub = this.templatesService.update(this.editing.id, dto).subscribe({
      next: () => {
        this.loading.save = false;
        this.closeModal();
        this.loadTemplates();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email template updated' });
      },
      error: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update email template' });
      }
    });
    this.subs.push(sub);
  }

  toggleActive(row: EmailTemplateDto): void {
    if (!row?.id) return;
    this.loading.toggle = true;
    const op$ = row.isActive ? this.templatesService.deactivate(row.id) : this.templatesService.activate(row.id);
    const sub = op$.subscribe({
      next: () => {
        this.loading.toggle = false;
        this.loadTemplates();
      },
      error: () => {
        this.loading.toggle = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to toggle status' });
      }
    });
    this.subs.push(sub);
  }

  confirmDelete(row: EmailTemplateDto): void {
    if (!row?.id) return;
    
    if (!this.canDeleteEmailTemplates && !this.canManageEmailTemplates) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to delete email templates.' });
      return;
    }

    this.confirmationService.confirm({
      header: 'Delete Email Template',
      message: `Are you sure you want to delete "${row.templateName}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.delete(row)
    });
  }

  private delete(row: EmailTemplateDto): void {
    this.loading.delete = true;
    const sub = this.templatesService.delete(row.id).subscribe({
      next: () => {
        this.loading.delete = false;
        // Soft delete on backend → reflect immediately in UI
        (row as any).isDeleted = true;
        row.isActive = false;
        this.templates = (this.templates || []).filter(t => t.id !== row.id);
        this.applyFilters();
        this.loadTemplates();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email template deleted' });
      },
      error: (err) => {
        const detail: string =
          err?.error?.error ||
          err?.error?.message ||
          err?.message ||
          'Failed to delete email template';

        // If backend blocks deletion because it's referenced by alert rules, fallback to deactivation (soft-hide)
        if (err?.status === 400 && String(detail).toLowerCase().includes('used')) {
          if (!row.isActive) {
            this.includeInactive = false;
            this.loading.delete = false;
            this.loadTemplates(); // hide inactive items immediately
            this.messageService.add({
              severity: 'warn',
              summary: 'Cannot delete',
              detail: `${detail}. It was hidden (turn on "Include inactive" to show it).`
            });
            return;
          }

          const sub2 = this.templatesService.deactivate(row.id).subscribe({
            next: () => {
              this.loading.delete = false;
              this.loadTemplates();
              this.messageService.add({
                severity: 'warn',
                summary: 'Cannot delete',
                detail: `${detail}. Template was deactivated instead.`
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


