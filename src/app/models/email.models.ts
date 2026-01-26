// ==================== Email Request Models ====================

export interface SimpleEmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
}

export interface TemplateTestRequest {
  templateName: 'SubmissionConfirmation' | 'ApprovalRequired' | 'ApprovalResult';
  data: {
    DocumentNumber?: string;
    SubmissionId?: string;
    DocumentType?: string;
    SubmittedBy?: string;
    ApprovalStage?: string;
    SystemUrl?: string;
    [key: string]: any; // للسماح بخصائص إضافية
  };
}

export interface ApprovalRequiredRequest {
  submissionId: number;
  stageId: number;
  approverUserIds: string[];
}

export interface ApprovalResultRequest {
  submissionId: number;
  actionType: 'Approved' | 'Rejected' | 'Returned';
  approverUserId: string;
  comments?: string;
}

// ==================== Email Response Models ====================

export interface EmailResponse {
  statusCode: number;
  message: string;
  to?: string;
}

export interface TemplateTestResponse {
  statusCode: number;
  message: string;
  templateName: string;
  subject: string;
  body: string;
}

export interface SubmissionConfirmationResponse {
  statusCode: number;
  message: string;
  submissionId: number;
}

export interface ApprovalRequiredResponse {
  statusCode: number;
  message: string;
  submissionId: number;
  stageId: number;
  approverCount: number;
}

export interface ApprovalResultResponse {
  statusCode: number;
  message: string;
  submissionId: number;
  actionType: string;
  approverUserId: string;
}

export interface EmailTemplate {
  name: string;
  description: string;
}

export interface TemplatesResponse {
  statusCode: number;
  message: string;
  templates: EmailTemplate[];
}

