import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SubmissionEmailDto {
  id: number;
  submissionId: number;
  toRecipients: string;
  ccRecipients?: string;
  subject: string;
  body: string;
  emailTemplateId?: number;
  smtpConfigId?: number;
  attachmentInfo?: string;
  status: string; // "Sent" | "Failed"
  errorMessage?: string;
  sentByUserId?: string;
  sentAt: string;
}

export interface SendSubmissionEmailDto {
  to: string;
  cc?: string;
  emailTemplateId?: number;
  subject?: string;
  body?: string;
  smtpConfigId?: number;
  attachmentInfo?: string;
}

@Injectable({ providedIn: 'root' })
export class SubmissionEmailsService {
  private base = `${environment.apiUrl}/FormSubmissions`;

  constructor(private http: HttpClient) {}

  getForSubmission(submissionId: number): Observable<SubmissionEmailDto[]> {
    return this.http
      .get<any>(`${this.base}/${submissionId}/emails`)
      .pipe(map((r) => (r?.data as SubmissionEmailDto[]) || []));
  }

  /** Sends an email for a submission. Returns the logged record; throws on HTTP error (incl. 502 send failure). */
  send(submissionId: number, dto: SendSubmissionEmailDto): Observable<SubmissionEmailDto> {
    return this.http
      .post<any>(`${this.base}/${submissionId}/emails`, dto)
      .pipe(map((r) => r?.data as SubmissionEmailDto));
  }
}
