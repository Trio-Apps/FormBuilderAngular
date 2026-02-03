import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CopyToDocumentActionExecutorService } from './copy-to-document-action-executor.service';
import { FormSubmissionsService, FormSubmissionDto } from '../../form-submissions/services/form-submissions.service';

/**
 * Form Submission Triggers Service
 * 
 * This service handles automatic execution of CopyToDocument actions
 * when form submission events occur (OnFormSubmitted, OnApprovalCompleted, etc.)
 * 
 * According to the Technical Specification:
 * - CopyToDocument actions are executed automatically by the system
 * - They are triggered by events: OnFormSubmitted, OnApprovalCompleted, OnDocumentApproved, OnRuleMatched
 * - The backend should handle this, but this service provides frontend integration
 */
@Injectable({
  providedIn: 'root'
})
export class FormSubmissionTriggersService {

  constructor(
    private copyToDocumentActionExecutor: CopyToDocumentActionExecutorService,
    private formSubmissionsService: FormSubmissionsService
  ) {}

  /**
   * Handle OnFormSubmitted event
   * Called after a form is successfully submitted
   * 
   * @param submissionId The submitted submission ID
   * @param formBuilderId The form builder ID
   * @returns Observable that completes when actions are executed (or skipped)
   */
  handleOnFormSubmitted(
    submissionId: number,
    formBuilderId: number
  ): Observable<any> {
    console.log(`[FormSubmissionTriggersService] OnFormSubmitted event for submission ${submissionId}, form ${formBuilderId}`);
    
    // Execute CopyToDocument actions for OnFormSubmitted event
    return this.copyToDocumentActionExecutor.executeOnFormSubmitted(
      submissionId,
      formBuilderId
    ).pipe(
      tap((results) => {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`[FormSubmissionTriggersService] OnFormSubmitted: ${successCount} successful, ${failCount} failed CopyToDocument actions`);
      }),
      catchError((error) => {
        console.error(`[FormSubmissionTriggersService] Error executing CopyToDocument actions for OnFormSubmitted:`, error);
        // Don't block the submission flow if CopyToDocument fails
        return of([]);
      })
    );
  }

  /**
   * Handle OnApprovalCompleted event
   * Called after approval workflow is completed
   * 
   * @param submissionId The approved submission ID
   * @param formBuilderId The form builder ID
   * @returns Observable that completes when actions are executed (or skipped)
   */
  handleOnApprovalCompleted(
    submissionId: number,
    formBuilderId: number
  ): Observable<any> {
    console.log(`[FormSubmissionTriggersService] OnApprovalCompleted event for submission ${submissionId}, form ${formBuilderId}`);
    
    // Execute CopyToDocument actions for OnApprovalCompleted event
    return this.copyToDocumentActionExecutor.executeOnApprovalCompleted(
      submissionId,
      formBuilderId
    ).pipe(
      tap((results) => {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`[FormSubmissionTriggersService] OnApprovalCompleted: ${successCount} successful, ${failCount} failed CopyToDocument actions`);
      }),
      catchError((error) => {
        console.error(`[FormSubmissionTriggersService] Error executing CopyToDocument actions for OnApprovalCompleted:`, error);
        // Don't block the approval flow if CopyToDocument fails
        return of([]);
      })
    );
  }

  /**
   * Handle OnDocumentApproved event
   * Called when a document is approved (single stage approval)
   * 
   * @param submissionId The approved submission ID
   * @param formBuilderId The form builder ID
   * @returns Observable that completes when actions are executed (or skipped)
   */
  handleOnDocumentApproved(
    submissionId: number,
    formBuilderId: number
  ): Observable<any> {
    console.log(`[FormSubmissionTriggersService] OnDocumentApproved event for submission ${submissionId}, form ${formBuilderId}`);
    
    // Execute CopyToDocument actions for OnDocumentApproved event
    return this.copyToDocumentActionExecutor.executeOnDocumentApproved(
      submissionId,
      formBuilderId
    ).pipe(
      tap((results) => {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`[FormSubmissionTriggersService] OnDocumentApproved: ${successCount} successful, ${failCount} failed CopyToDocument actions`);
      }),
      catchError((error) => {
        console.error(`[FormSubmissionTriggersService] Error executing CopyToDocument actions for OnDocumentApproved:`, error);
        // Don't block the approval flow if CopyToDocument fails
        return of([]);
      })
    );
  }

  /**
   * Handle OnRuleMatched event
   * Called when a rule condition is matched
   * 
   * @param submissionId The submission ID
   * @param formBuilderId The form builder ID
   * @param ruleId The matched rule ID
   * @returns Observable that completes when actions are executed (or skipped)
   */
  handleOnRuleMatched(
    submissionId: number,
    formBuilderId: number,
    ruleId: number
  ): Observable<any> {
    console.log(`[FormSubmissionTriggersService] OnRuleMatched event for submission ${submissionId}, form ${formBuilderId}, rule ${ruleId}`);
    
    // Execute CopyToDocument actions for OnRuleMatched event
    return this.copyToDocumentActionExecutor.executeOnRuleMatched(
      submissionId,
      formBuilderId,
      ruleId
    ).pipe(
      tap((results) => {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`[FormSubmissionTriggersService] OnRuleMatched: ${successCount} successful, ${failCount} failed CopyToDocument actions`);
      }),
      catchError((error) => {
        console.error(`[FormSubmissionTriggersService] Error executing CopyToDocument actions for OnRuleMatched:`, error);
        // Don't block the rule evaluation flow if CopyToDocument fails
        return of([]);
      })
    );
  }

  /**
   * Helper: Get form builder ID from submission
   * Used to automatically determine formBuilderId from submission
   */
  private getFormBuilderIdFromSubmission(submission: FormSubmissionDto): number {
    return submission.formBuilderId;
  }

  /**
   * Helper: Handle OnFormSubmitted with submission object
   * Automatically extracts formBuilderId from submission
   */
  handleOnFormSubmittedWithSubmission(submission: FormSubmissionDto): Observable<any> {
    return this.handleOnFormSubmitted(
      submission.id,
      this.getFormBuilderIdFromSubmission(submission)
    );
  }

  /**
   * Helper: Handle OnApprovalCompleted with submission object
   * Automatically extracts formBuilderId from submission
   */
  handleOnApprovalCompletedWithSubmission(submission: FormSubmissionDto): Observable<any> {
    return this.handleOnApprovalCompleted(
      submission.id,
      this.getFormBuilderIdFromSubmission(submission)
    );
  }

  /**
   * Helper: Handle OnDocumentApproved with submission object
   * Automatically extracts formBuilderId from submission
   */
  handleOnDocumentApprovedWithSubmission(submission: FormSubmissionDto): Observable<any> {
    return this.handleOnDocumentApproved(
      submission.id,
      this.getFormBuilderIdFromSubmission(submission)
    );
  }
}

