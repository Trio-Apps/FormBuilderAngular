import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../../services/email.service';
import {
  SimpleEmailRequest,
  TemplateTestRequest,
  ApprovalRequiredRequest,
  ApprovalResultRequest,
  EmailResponse,
  TemplateTestResponse,
  SubmissionConfirmationResponse,
  ApprovalRequiredResponse,
  ApprovalResultResponse,
  EmailTemplate
} from '../../models/email.models';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-email-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    InputNumberModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  templateUrl: './email-test.component.html',
  styleUrls: ['./email-test.component.scss'],
  providers: [MessageService]
})
export class EmailTestComponent implements OnInit {
  activeTab: 'simple' | 'template' | 'confirmation' | 'approval-required' | 'approval-result' = 'simple';

  // Simple Email
  simpleEmailRequest: SimpleEmailRequest = {
    to: '',
    subject: '',
    body: '',
    isHtml: true
  };
  simpleEmailResponse: EmailResponse | null = null;
  simpleEmailLoading = false;

  // Template Test
  templates: EmailTemplate[] = [];
  selectedTemplate: string | null = null;
  templateData: any = {
    DocumentNumber: 'ser-000001',
    SubmissionId: '1',
    DocumentType: 'Test Document',
    SubmittedBy: 'anas',
    ApprovalStage: 'Stage 1',
    SystemUrl: 'http://localhost:5203'
  };
  templateResponse: TemplateTestResponse | null = null;
  templateLoading = false;

  // Submission Confirmation
  submissionId = 5;
  submissionConfirmationResponse: SubmissionConfirmationResponse | null = null;
  submissionConfirmationLoading = false;

  // Approval Required
  approvalRequiredRequest: ApprovalRequiredRequest = {
    submissionId: 5,
    stageId: 1,
    approverUserIds: []
  };
  approverIdsInput = '1027, anas';
  approvalRequiredResponse: ApprovalRequiredResponse | null = null;
  approvalRequiredLoading = false;

  // Approval Result
  approvalResultRequest: ApprovalResultRequest = {
    submissionId: 5,
    actionType: 'Approved',
    approverUserId: '1027',
    comments: 'موافق'
  };
  approvalResultResponse: ApprovalResultResponse | null = null;
  approvalResultLoading = false;

  actionTypes = [
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Returned', value: 'Returned' }
  ];

  constructor(
    private emailService: EmailService,
    private messageService: MessageService
  ) {
    this.updateApproverIds();
  }

  ngOnInit() {
    this.loadTemplates();
  }

  // ==================== Load Templates ====================
  loadTemplates() {
    this.emailService.getAvailableTemplates().subscribe({
      next: (response) => {
        this.templates = response.templates;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم تحميل القوالب بنجاح'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.message || 'فشل تحميل القوالب'
        });
      }
    });
  }

  // ==================== Simple Email ====================
  sendSimpleEmail() {
    this.simpleEmailLoading = true;
    this.simpleEmailResponse = null;

    this.emailService.sendSimpleEmail(this.simpleEmailRequest).subscribe({
      next: (response) => {
        this.simpleEmailResponse = response;
        this.simpleEmailLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: response.message || 'تم إرسال البريد بنجاح'
        });
      },
      error: (error) => {
        this.simpleEmailLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.message || 'فشل إرسال البريد'
        });
      }
    });
  }

  // ==================== Template Test ====================
  onTemplateChange() {
    this.templateResponse = null;
  }

  testTemplate() {
    if (!this.selectedTemplate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى اختيار Template'
      });
      return;
    }

    this.templateLoading = true;
    this.templateResponse = null;

    const request: TemplateTestRequest = {
      templateName: this.selectedTemplate as any,
      data: this.templateData
    };

    this.emailService.testTemplate(request).subscribe({
      next: (response) => {
        this.templateResponse = response;
        this.templateLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: response.message || 'تم معالجة Template بنجاح'
        });
      },
      error: (error) => {
        this.templateLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.message || 'فشل معالجة Template'
        });
      }
    });
  }

  // ==================== Submission Confirmation ====================
  sendSubmissionConfirmation() {
    this.submissionConfirmationLoading = true;
    this.submissionConfirmationResponse = null;

    this.emailService.testSubmissionConfirmation(this.submissionId).subscribe({
      next: (response) => {
        this.submissionConfirmationResponse = response;
        this.submissionConfirmationLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: response.message || 'تم إرسال تأكيد التقديم بنجاح'
        });
      },
      error: (error) => {
        this.submissionConfirmationLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.message || 'فشل إرسال تأكيد التقديم'
        });
      }
    });
  }

  // ==================== Approval Required ====================
  updateApproverIds() {
    this.approvalRequiredRequest.approverUserIds = this.approverIdsInput
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
  }

  sendApprovalRequired() {
    this.updateApproverIds();

    if (this.approvalRequiredRequest.approverUserIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى إدخال Approver User IDs'
      });
      return;
    }

    this.approvalRequiredLoading = true;
    this.approvalRequiredResponse = null;

    this.emailService.testApprovalRequired(this.approvalRequiredRequest).subscribe({
      next: (response) => {
        this.approvalRequiredResponse = response;
        this.approvalRequiredLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: `تم إرسال ${response.approverCount} طلب موافقة`
        });
      },
      error: (error) => {
        this.approvalRequiredLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.message || 'فشل إرسال طلب الموافقة'
        });
      }
    });
  }

  // ==================== Approval Result ====================
  sendApprovalResult() {
    this.approvalResultLoading = true;
    this.approvalResultResponse = null;

    this.emailService.testApprovalResult(this.approvalResultRequest).subscribe({
      next: (response) => {
        this.approvalResultResponse = response;
        this.approvalResultLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: response.message || 'تم إرسال نتيجة الموافقة بنجاح'
        });
      },
      error: (error) => {
        this.approvalResultLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.message || 'فشل إرسال نتيجة الموافقة'
        });
      }
    });
  }
}

