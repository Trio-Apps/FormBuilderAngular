import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { Subscription, forkJoin } from 'rxjs';

import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { PermissionService } from '../../../services/permission.service';
import { HasPermissionDirective } from '../../../directives/has-permission.directive';
import { ChangeDetectorRef } from '@angular/core';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormSubmissionsService, FormSubmissionDetailDto } from '../../form-submissions/services/form-submissions.service';
import {
  AlertRulesService,
  AlertRuleDto,
  AlertTriggerType,
  CreateAlertRuleDto,
  AlertNotificationType
} from '../../FormBuilder/services/alert-rules.service';
import { EmailTemplatesService, EmailTemplateDto } from '../../FormBuilder/services/email-templates.service';
import { UsersService, UserDto } from '../../FormBuilder/services/users.service';

type TriggerOption = { label: string; value: AlertTriggerType };
type NotificationOption = { label: string; value: AlertNotificationType };

@Component({
  selector: 'app-alert-rules-manage',
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
    SelectModule,
    InputTextModule,
    CheckboxModule,
    ButtonModule,
    TableModule,
    TableShellComponent,
    TableActionsComponent,
    DialogShellComponent,
    HasPermissionDirective
  ],
  templateUrl: './alert-rules-manage.component.html',
  styleUrls: ['./alert-rules-manage.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class AlertRulesManageComponent implements OnInit, OnDestroy {
  documentTypes: DocumentType[] = [];
  triggerOptions: TriggerOption[] = [
    { label: 'FormSubmitted', value: 'FormSubmitted' },
    { label: 'ApprovalRequired', value: 'ApprovalRequired' },
    { label: 'ApprovalApproved', value: 'ApprovalApproved' },
    { label: 'ApprovalRejected', value: 'ApprovalRejected' },
    { label: 'ApprovalReturned', value: 'ApprovalReturned' }
  ];
  notificationOptions: NotificationOption[] = [
    { label: 'Email', value: 'Email' },
    { label: 'Internal', value: 'Internal' },
    { label: 'Both', value: 'Both' }
  ];

  selectedDocumentTypeId: number | null = null;
  selectedTriggerType: AlertTriggerType | null = null;

  rules: AlertRuleDto[] = [];
  filteredRules: AlertRuleDto[] = [];
  emailTemplates: EmailTemplateDto[] = [];
  users: UserDto[] = [];

  // Permission flags
  canViewAlertRules = false;
  canCreateAlertRules = false;
  canEditAlertRules = false;
  canDeleteAlertRules = false;
  canManageAlertRules = false;

  loading = {
    init: false,
    rules: false,
    save: false,
    toggle: false,
    delete: false
  };

  showCreateModal = false;
  createForm!: FormGroup;

  private editingRule: AlertRuleDto | null = null;
  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private docTypesService: DocumentTypesService,
    private alertRulesService: AlertRulesService,
    private formSubmissionsService: FormSubmissionsService,
    private emailTemplatesService: EmailTemplatesService,
    private usersService: UsersService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public permissionService: PermissionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Always reload permissions from API to ensure fresh data (clears cache first)
    console.log('[AlertRulesManage] Refreshing permissions from API (clearing cache)...');
    this.permissionService.refreshPermissions().subscribe({
      next: (perms) => {
        console.log('[AlertRulesManage] Permissions loaded from API:', perms);
        this.loadPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[AlertRulesManage] Error loading permissions:', err);
        this.loadPermissions();
      }
    });

    // Subscribe to permission changes
    this.permissionService.permissions$.subscribe(() => {
      this.loadPermissions();
      this.cdr.detectChanges();
    });

    this.createForm = this.fb.group({
      documentTypeId: [null, Validators.required],
      triggerType: [null, Validators.required],
      ruleName: ['', [Validators.required, Validators.maxLength(200)]],
      targetUserId: [''],
      targetRoleId: [''],
      isActive: [true],
      notificationType: ['Email', Validators.required],
      emailTemplateId: [null],
      conditionJson: ['{}', Validators.required]
    });

    this.loadInitialData();
  }

  /**
   * Load user permissions for alert rule operations
   */
  private loadPermissions(): void {
    this.canViewAlertRules = this.permissionService.canViewAlertRules();
    this.canCreateAlertRules = this.permissionService.canCreateAlertRules();
    this.canEditAlertRules = this.permissionService.canEditAlertRules();
    this.canDeleteAlertRules = this.permissionService.canDeleteAlertRules();
    this.canManageAlertRules = this.permissionService.canManageAlertRules();
    console.log('[AlertRulesManage] Permission flags:', {
      canViewAlertRules: this.canViewAlertRules,
      canCreateAlertRules: this.canCreateAlertRules,
      canEditAlertRules: this.canEditAlertRules,
      canDeleteAlertRules: this.canDeleteAlertRules,
      canManageAlertRules: this.canManageAlertRules
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadInitialData(): void {
    this.loading.init = true;
    const sub = forkJoin({
      docTypes: this.docTypesService.getActiveDocumentTypes(),
      rules: this.alertRulesService.getAll(),
      emailTemplates: this.emailTemplatesService.getAll({ includeInactive: true }),
      users: this.usersService.getActiveUsers()
    }).subscribe({
      next: ({ docTypes, rules, emailTemplates, users }) => {
        this.documentTypes = docTypes || [];
        this.rules = rules || [];
        this.emailTemplates = emailTemplates || [];
        this.users = users || [];
        this.applyFilters();
        this.loading.init = false;
      },
      error: () => {
        this.loading.init = false;
      }
    });
    this.subs.push(sub);
  }

  refreshRules(): void {
    this.loading.rules = true;
    const sub = this.alertRulesService.getAll().subscribe({
      next: (rules) => {
        this.rules = rules || [];
        this.applyFilters();
        this.loading.rules = false;
      },
      error: () => {
        this.loading.rules = false;
      }
    });
    this.subs.push(sub);
  }

  applyFilters(): void {
    let items = [...(this.rules || [])];
    if (this.selectedDocumentTypeId) {
      items = items.filter(r => Number(r.documentTypeId) === Number(this.selectedDocumentTypeId));
    }
    if (this.selectedTriggerType) {
      items = items.filter(r => String(r.triggerType) === String(this.selectedTriggerType));
    }
    this.filteredRules = items;
  }

  openCreateModal(rule?: AlertRuleDto): void {
    if (rule) {
      // Editing existing rule
      if (!this.canEditAlertRules && !this.canManageAlertRules) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to edit alert rules.' });
        return;
      }
      // Edit mode
      this.editingRule = rule;
      this.createForm.reset({
        documentTypeId: rule.documentTypeId,
        triggerType: rule.triggerType as AlertTriggerType,
        ruleName: rule.ruleName,
        targetUserId: rule.targetUserId || '',
        targetRoleId: rule.targetRoleId || '',
        isActive: rule.isActive,
        notificationType: (rule.notificationType as AlertNotificationType) || 'Email',
        emailTemplateId: rule.emailTemplateId ?? null,
        conditionJson: rule.conditionJson || '{}'
      });
    } else {
      // Creating new rule
      if (!this.canCreateAlertRules && !this.canManageAlertRules) {
        this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to create alert rules.' });
        return;
      }
      // Create mode
      this.editingRule = null;
      this.createForm.reset({
        documentTypeId: this.selectedDocumentTypeId,
        triggerType: this.selectedTriggerType,
        ruleName: '',
        targetUserId: '',
        targetRoleId: '',
        isActive: true,
        notificationType: 'Email',
        emailTemplateId: null,
        conditionJson: '{}'
      });
    }
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.editingRule = null;
  }

  saveRule(): void {
    if (this.editingRule) {
      // Update existing rule
      if (!this.canEditAlertRules && !this.canManageAlertRules) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to edit alert rules.' });
        return;
      }
    } else {
      // Create new rule
      if (!this.canCreateAlertRules && !this.canManageAlertRules) {
        this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: 'You do not have permission to create alert rules.' });
        return;
      }
    }

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const v = this.createForm.value;
    const emailTemplateId =
      v.emailTemplateId !== null && v.emailTemplateId !== undefined && v.emailTemplateId !== ''
        ? Number(v.emailTemplateId)
        : null;
    this.loading.save = true;

    if (this.editingRule) {
      // Update existing rule
      const updated: AlertRuleDto = {
        ...this.editingRule,
        documentTypeId: Number(v.documentTypeId),
        triggerType: String(v.triggerType),
        ruleName: String(v.ruleName).trim(),
        conditionJson: v.conditionJson ?? '{}',
        emailTemplateId,
        notificationType: v.notificationType as string,
        targetRoleId: v.targetRoleId ? String(v.targetRoleId).trim() : '',
        targetUserId: v.targetUserId ? String(v.targetUserId).trim() : '',
        isActive: !!v.isActive
      };

      const sub = this.alertRulesService.updateRule(updated).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Alert rule updated successfully'
          });
          // Update local list immediately
          this.rules = (this.rules || []).map(r => (r.id === updated.id ? updated : r));
          this.applyFilters();
          this.showCreateModal = false;
          this.loading.save = false;
          this.editingRule = null;
        },
        error: () => {
          this.loading.save = false;
        }
      });
      this.subs.push(sub);
    } else {
      // Create new rule
      const dto: CreateAlertRuleDto = {
        documentTypeId: Number(v.documentTypeId),
        triggerType: v.triggerType,
        ruleName: String(v.ruleName).trim(),
        conditionJson: v.conditionJson ?? '{}',
        emailTemplateId,
        notificationType: v.notificationType as AlertNotificationType,
        targetRoleId: v.targetRoleId ? String(v.targetRoleId).trim() : '',
        targetUserId: v.targetUserId ? String(v.targetUserId).trim() : '',
        isActive: !!v.isActive
      };

      const sub = this.alertRulesService.createRule(dto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Alert rule created successfully'
          });
          this.showCreateModal = false;
          this.loading.save = false;
          this.refreshRules();
        },
        error: () => {
          this.loading.save = false;
        }
      });
      this.subs.push(sub);
    }
  }

  toggleActive(rule: AlertRuleDto): void {
    const nextActive = !rule.isActive;

    this.confirmationService.confirm({
      header: 'Confirm',
      message: nextActive
        ? `Enable rule "${rule.ruleName}"?`
        : `Disable rule "${rule.ruleName}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.toggle = true;
        const updated: AlertRuleDto = { ...rule, isActive: nextActive };

        const sub = this.alertRulesService.updateRule(updated).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: nextActive ? 'Rule enabled' : 'Rule disabled'
            });
            // Update local cache immediately
            this.rules = this.rules.map(r => (r.id === rule.id ? updated : r));
            this.applyFilters();
            this.loading.toggle = false;
          },
          error: () => {
            this.loading.toggle = false;
          }
        });
        this.subs.push(sub);
      }
    });
  }

  deleteRule(rule: AlertRuleDto): void {
    if (!this.canDeleteAlertRules && !this.canManageAlertRules) {
      this.messageService.add({ severity: 'warn', summary: 'Permission Denied', detail: 'You do not have permission to delete alert rules.' });
      return;
    }

    this.confirmationService.confirm({
      header: 'Confirm',
      message: `Delete rule "${rule.ruleName}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        const sub = this.alertRulesService.delete(rule.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Alert rule deleted successfully'
            });
            this.rules = (this.rules || []).filter(r => r.id !== rule.id);
            this.applyFilters();
            this.loading.delete = false;
          },
          error: () => {
            this.loading.delete = false;
          }
        });
        this.subs.push(sub);
      }
    });
  }

  getDocTypeName(documentTypeId: number): string {
    const dt = this.documentTypes.find(d => Number(d.id) === Number(documentTypeId));
    return dt?.name || `#${documentTypeId}`;
  }

  getActiveCount(): number {
    return (this.filteredRules || []).filter(r => r.isActive).length;
  }

  get emailTemplateOptionsForSelectedDocType(): EmailTemplateDto[] {
    const docTypeId = this.createForm?.value?.documentTypeId;
    if (!docTypeId) {
      return this.emailTemplates || [];
    }
    return (this.emailTemplates || []).filter(t => Number(t.documentTypeId) === Number(docTypeId));
  }
}


