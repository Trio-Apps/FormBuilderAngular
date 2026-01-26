import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
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
  TemplatesResponse
} from '../models/email.models';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = `${environment.apiUrl}/EmailTest`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
      // Authorization header يتم إضافته تلقائياً من خلال authInterceptor
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'حدث خطأ غير متوقع';
    
    if (error.error instanceof ErrorEvent) {
      // خطأ من جانب العميل
      errorMessage = `خطأ: ${error.error.message}`;
    } else {
      // خطأ من السيرفر
      errorMessage = `خطأ ${error.status}: ${error.error?.message || error.message}`;
    }
    
    console.error('Email Service Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * 1. إرسال بريد إلكتروني بسيط
   * POST /api/EmailTest/send-simple
   */
  sendSimpleEmail(request: SimpleEmailRequest): Observable<EmailResponse> {
    return this.http.post<EmailResponse>(
      `${this.apiUrl}/send-simple`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 2. اختبار معالجة Template
   * POST /api/EmailTest/test-template
   */
  testTemplate(request: TemplateTestRequest): Observable<TemplateTestResponse> {
    return this.http.post<TemplateTestResponse>(
      `${this.apiUrl}/test-template`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 3. اختبار إرسال تأكيد التقديم
   * POST /api/EmailTest/test-submission-confirmation/{submissionId}
   */
  testSubmissionConfirmation(submissionId: number): Observable<SubmissionConfirmationResponse> {
    return this.http.post<SubmissionConfirmationResponse>(
      `${this.apiUrl}/test-submission-confirmation/${submissionId}`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 4. اختبار إرسال طلب الموافقة
   * POST /api/EmailTest/test-approval-required
   */
  testApprovalRequired(request: ApprovalRequiredRequest): Observable<ApprovalRequiredResponse> {
    return this.http.post<ApprovalRequiredResponse>(
      `${this.apiUrl}/test-approval-required`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 5. اختبار نتيجة الموافقة
   * POST /api/EmailTest/test-approval-result
   */
  testApprovalResult(request: ApprovalResultRequest): Observable<ApprovalResultResponse> {
    return this.http.post<ApprovalResultResponse>(
      `${this.apiUrl}/test-approval-result`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 6. الحصول على القوالب المتاحة
   * GET /api/EmailTest/templates
   */
  getAvailableTemplates(): Observable<TemplatesResponse> {
    return this.http.get<TemplatesResponse>(
      `${this.apiUrl}/templates`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
}

