/**
 * Approve/Reject Submission Models
 * نماذج الموافقة والرفض على Submissions
 */

/**
 * Request DTO for approving a submission
 */
export interface ApproveSubmissionDto {
  submissionId: number;
  stageId: number;
  actionByUserId: string;
  comments?: string | null;
}

/**
 * Request DTO for rejecting a submission
 */
export interface RejectSubmissionDto {
  submissionId: number;
  stageId: number;
  actionByUserId: string;
  comments?: string | null;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  statusCode?: number;
  message?: string;
  data?: T;
  success?: boolean;
  result?: T;
  items?: T[];
}

