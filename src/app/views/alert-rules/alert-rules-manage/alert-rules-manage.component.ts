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
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormSubmissionsService, FormSubmissionDetailDto } from '../../form-submissions/services/form-submissions.service';
import {
  AlertRulesService,
  AlertRuleDto,
  AlertTriggerType,
  CreateAlertRuleDto
} from '../../FormBuilder/services/alert-rules.service';

type TriggerOption = { label: string; value: AlertTriggerType };

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
    DialogShellComponent
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

  selectedDocumentTypeId: number | null = null;
  selectedTriggerType: AlertTriggerType | null = null;

  rules: AlertRuleDto[] = [];
  filteredRules: AlertRuleDto[] = [];

  loading = {
    init: false,
    rules: false,
    save: false,
    toggle: false
  };

  showCreateModal = false;
  createForm!: FormGroup;

  // Test Trigger (to verify which rules would send email for a submission)
  testForm!: FormGroup;
  testLoading = false;
  testSubmission: FormSubmissionDetailDto | null = null;
  matchingActiveRules: AlertRuleDto[] = [];

  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private docTypesService: DocumentTypesService,
    private alertRulesService: AlertRulesService,
    private formSubmissionsService: FormSubmissionsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.createForm = this.fb.group({
      documentTypeId: [null, Validators.required],
      triggerType: [null, Validators.required],
      ruleName: ['', [Validators.required, Validators.maxLength(200)]],
      targetUserId: [''],
      targetRoleId: [''],
      isActive: [true],
      notificationType: ['Email', Validators.required],
      conditionJson: ['{}', Validators.required]
    });

    this.testForm = this.fb.group({
      submissionId: [null, [Validators.required, Validators.min(1)]],
      triggerType: ['FormSubmitted', Validators.required]
    });

    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadInitialData(): void {
    this.loading.init = true;
    const sub = forkJoin({
      docTypes: this.docTypesService.getActiveDocumentTypes(),
      rules: this.alertRulesService.getAll()
    }).subscribe({
      next: ({ docTypes, rules }) => {
        this.documentTypes = docTypes || [];
        this.rules = rules || [];
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

  openCreateModal(): void {
    this.createForm.reset({
      documentTypeId: this.selectedDocumentTypeId,
      triggerType: this.selectedTriggerType,
      ruleName: '',
      targetUserId: '',
      targetRoleId: '',
      isActive: true,
      notificationType: 'Email',
      conditionJson: '{}'
    });
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveRule(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const v = this.createForm.value;
    const dto: CreateAlertRuleDto = {
      documentTypeId: Number(v.documentTypeId),
      triggerType: v.triggerType,
      ruleName: String(v.ruleName).trim(),
      conditionJson: v.conditionJson ?? '{}',
      emailTemplateId: null,
      notificationType: 'Email',
      targetRoleId: v.targetRoleId ? String(v.targetRoleId).trim() : '',
      targetUserId: v.targetUserId ? String(v.targetUserId).trim() : '',
      isActive: !!v.isActive
    };

    this.loading.save = true;
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

  runTest(): void {
    if (this.testForm.invalid) {
      this.testForm.markAllAsTouched();
      return;
    }

    const submissionId = Number(this.testForm.value.submissionId);
    const triggerType = String(this.testForm.value.triggerType || 'FormSubmitted');

    this.testLoading = true;
    this.testSubmission = null;
    this.matchingActiveRules = [];

    const sub = this.formSubmissionsService.getSubmissionById(submissionId).subscribe({
      next: (submission) => {
        this.testSubmission = submission;
        const documentTypeId = Number((submission as any)?.documentTypeId);

        if (!documentTypeId || isNaN(documentTypeId)) {
          this.testLoading = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Submission does not contain documentTypeId in response.'
          });
          return;
        }

        const sub2 = this.alertRulesService.getActive(documentTypeId, triggerType).subscribe({
          next: (rules) => {
            this.matchingActiveRules = rules || [];
            this.testLoading = false;
          },
          error: () => {
            this.testLoading = false;
          }
        });
        this.subs.push(sub2);
      },
      error: () => {
        this.testLoading = false;
      }
    });
    this.subs.push(sub);
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

  getDocTypeName(documentTypeId: number): string {
    const dt = this.documentTypes.find(d => Number(d.id) === Number(documentTypeId));
    return dt?.name || `#${documentTypeId}`;
  }

  getActiveCount(): number {
    return (this.filteredRules || []).filter(r => r.isActive).length;
  }
}


