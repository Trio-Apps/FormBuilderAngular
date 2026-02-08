import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CopyToDocumentService } from './copy-to-document.service';
import { FormRulesService } from './form-rules.service';
import {
  Action,
  CopyToDocumentRequestDto,
  CopyToDocumentResultDto,
  FormRule
} from '../form-builder/models/form-builder-dto.model';
import { MessageService } from 'primeng/api';
import { FormSubmissionsService, FormSubmissionDto } from '../../form-submissions/services/form-submissions.service';

/**
 * Trigger Event Types for CopyToDocument Action
 */
export type TriggerEventType = 
  | 'OnFormSubmitted' 
  | 'OnApprovalCompleted' 
  | 'OnDocumentApproved' 
  | 'OnRuleMatched';

/**
 * CopyToDocument Action Executor Service
 * 
 * This service handles automatic execution of CopyToDocument actions
 * based on system events (triggers) as part of the Built-in Actions Engine.
 * 
 * According to the Technical Specification:
 * - CopyToDocument is executed automatically when configured events occur
 * - It does not require user interaction
 * - It enables document chaining within the system
 */
@Injectable({
  providedIn: 'root'
})
export class CopyToDocumentActionExecutorService {

  constructor(
    private copyToDocumentService: CopyToDocumentService,
    private formRulesService: FormRulesService,
    private formSubmissionsService: FormSubmissionsService,
    private messageService: MessageService
  ) {}

  /**
   * Execute CopyToDocument actions for a specific event
   * 
   * This is the main entry point for automatic CopyToDocument execution.
   * Called by trigger services when events occur (OnFormSubmitted, OnApprovalCompleted, etc.)
   * 
   * @param eventType The type of event that triggered the execution
   * @param submissionId The source submission ID
   * @param formBuilderId The form builder ID (to load rules)
   * @param ruleId Optional: specific rule ID if triggered by OnRuleMatched
   * @param actionId Optional: specific action ID if triggered by a specific action
   * @returns Observable of execution results
   */
  executeCopyToDocumentActionsForEvent(
    eventType: TriggerEventType,
    submissionId: number,
    formBuilderId: number,
    ruleId?: number | null,
    actionId?: number | null
  ): Observable<CopyToDocumentResultDto[]> {
    console.log(`[CopyToDocumentActionExecutor] Executing CopyToDocument actions for event: ${eventType}, submissionId: ${submissionId}, formBuilderId: ${formBuilderId}`);

    // Step 1: Load active rules for the form
    return this.formRulesService.getActiveRulesByFormId(formBuilderId).pipe(
      switchMap((activeRules: FormRule[]) => {
        // Rules are already filtered to active ones
        console.log(`[CopyToDocumentActionExecutor] Found ${activeRules.length} active rules`);

        // Step 3: Find CopyToDocument actions
        const copyToDocumentActions: Array<{ rule: FormRule; action: Action; actionIndex: number }> = [];
        
        activeRules.forEach(rule => {
          // If ruleId is specified, only process that rule
          if (ruleId !== null && ruleId !== undefined && rule.id !== ruleId) {
            return;
          }

          if (rule.actions && rule.actions.length > 0) {
            rule.actions.forEach((action, index) => {
              if (action.type === 'CopyToDocument' && action.copyToDocumentConfig) {
                // Filter by triggerEvent if specified in config
                const actionTriggerEvent = action.copyToDocumentConfig.triggerEvent || 'OnRuleMatched';
                if (actionTriggerEvent === eventType || eventType === 'OnRuleMatched') {
                  copyToDocumentActions.push({ rule, action, actionIndex: index });
                } else {
                  console.log(`[CopyToDocumentActionExecutor] Skipping action - triggerEvent mismatch. Action: ${actionTriggerEvent}, Event: ${eventType}`);
                }
              }
            });
          }

          // Also check elseActions
          if (rule.elseActions && rule.elseActions.length > 0) {
            rule.elseActions.forEach((action, index) => {
              if (action.type === 'CopyToDocument' && action.copyToDocumentConfig) {
                // Filter by triggerEvent if specified in config
                const actionTriggerEvent = action.copyToDocumentConfig.triggerEvent || 'OnRuleMatched';
                if (actionTriggerEvent === eventType || eventType === 'OnRuleMatched') {
                  copyToDocumentActions.push({ rule, action, actionIndex: index });
                } else {
                  console.log(`[CopyToDocumentActionExecutor] Skipping elseAction - triggerEvent mismatch. Action: ${actionTriggerEvent}, Event: ${eventType}`);
                }
              }
            });
          }
        });

        console.log(`[CopyToDocumentActionExecutor] Found ${copyToDocumentActions.length} CopyToDocument actions to execute`);

        if (copyToDocumentActions.length === 0) {
          console.log(`[CopyToDocumentActionExecutor] No CopyToDocument actions found for event ${eventType}`);
          return of([]);
        }

        // Step 4: Execute each CopyToDocument action
        const executionObservables = copyToDocumentActions.map(({ rule, action }) => {
          return this.executeCopyToDocumentAction(
            action,
            submissionId,
            rule.id || null,
            actionId || null
          ).pipe(
            catchError((error) => {
              console.error(`[CopyToDocumentActionExecutor] Error executing CopyToDocument action from rule ${rule.id}:`, error);
              // Return a failed result instead of throwing
              return of({
                success: false,
                errorMessage: error?.error?.message || error?.message || 'Failed to execute CopyToDocument action',
                sourceSubmissionId: submissionId
              } as CopyToDocumentResultDto);
            })
          );
        });

        // Execute all actions in parallel
        return forkJoin(executionObservables);
      }),
      catchError((error) => {
        console.error(`[CopyToDocumentActionExecutor] Error loading rules or executing actions:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Execute a single CopyToDocument action
   * 
   * @param action The CopyToDocument action to execute
   * @param sourceSubmissionId The source submission ID
   * @param ruleId The rule ID that contains this action
   * @param actionId Optional action ID
   * @returns Observable of execution result
   */
  private executeCopyToDocumentAction(
    action: Action,
    sourceSubmissionId: number,
    ruleId: number | null,
    actionId: number | null
  ): Observable<CopyToDocumentResultDto> {
    if (!action.copyToDocumentConfig) {
      console.error('[CopyToDocumentActionExecutor] CopyToDocument action missing copyToDocumentConfig');
      return throwError(() => new Error('CopyToDocument action missing configuration'));
    }

    const config = action.copyToDocumentConfig;

    // Validate required fields
    if (!config.targetDocumentTypeId || !config.targetFormId) {
      console.error('[CopyToDocumentActionExecutor] CopyToDocument action missing required configuration');
      return throwError(() => new Error('CopyToDocument action missing required configuration (targetDocumentTypeId or targetFormId)'));
    }

    // Get source submission to extract sourceDocumentTypeId and sourceFormId if not provided
    return this.formSubmissionsService.getSubmissionById(sourceSubmissionId).pipe(
      switchMap((submission: FormSubmissionDto) => {
        // Extract sourceDocumentTypeId and sourceFormId from submission or config
        const sourceDocumentTypeId = config.sourceDocumentTypeId || submission.documentTypeId || null;
        const sourceFormId = config.sourceFormId || submission.formBuilderId || null;

        if (!sourceDocumentTypeId || !sourceFormId) {
          console.error('[CopyToDocumentActionExecutor] Missing sourceDocumentTypeId or sourceFormId');
          return throwError(() => new Error('Missing sourceDocumentTypeId or sourceFormId. Please ensure the submission has documentTypeId and formBuilderId.'));
        }

        // Convert fieldMappings array to object format if needed
        let fieldMapping: { [key: string]: string } | undefined;
        if (config.fieldMappings && config.fieldMappings.length > 0) {
          fieldMapping = {};
          config.fieldMappings.forEach(mapping => {
            if (mapping.sourceFieldCode && mapping.targetFieldCode) {
              fieldMapping![mapping.sourceFieldCode] = mapping.targetFieldCode;
            }
          });
        } else if (config.fieldMapping) {
          fieldMapping = config.fieldMapping;
        }

        // Prepare the request with all required fields
        const request: CopyToDocumentRequestDto = {
          config: {
            // Required fields - new
            sourceDocumentTypeId: sourceDocumentTypeId,
            sourceFormId: sourceFormId,
            
            // Target configuration
            targetDocumentTypeId: config.targetDocumentTypeId,
            targetFormId: config.targetFormId,
            createNewDocument: config.createNewDocument !== undefined ? config.createNewDocument : true,
            targetDocumentId: !config.createNewDocument ? config.targetDocumentId : null,
            
            // Initial status - new
            initialStatus: config.initialStatus || 'Draft',
            
            // Field and grid mappings
            fieldMapping: fieldMapping,
            gridMapping: config.gridMapping,
            
            // Copy options
            copyCalculatedFields: config.copyCalculatedFields !== undefined ? config.copyCalculatedFields : false,
            copyGridRows: config.copyGridRows !== undefined ? config.copyGridRows : false,
            copyAttachments: config.copyAttachments !== undefined ? config.copyAttachments : false,
            copyMetadata: config.copyMetadata !== undefined ? config.copyMetadata : false,
            metadataFields: config.metadataFields,
            
            // Workflow and linking options
            startWorkflow: config.startWorkflow !== undefined ? config.startWorkflow : false,
            linkDocuments: config.linkDocuments !== undefined ? config.linkDocuments : false,
            
            // Override target defaults
            overrideTargetDefaults: config.overrideTargetDefaults !== undefined ? config.overrideTargetDefaults : false
          },
          sourceSubmissionId: sourceSubmissionId,
          actionId: actionId,
          ruleId: ruleId
        };

        console.log(`[CopyToDocumentActionExecutor] Executing CopyToDocument action:`, {
          sourceSubmissionId,
          sourceDocumentTypeId,
          sourceFormId,
          targetDocumentTypeId: config.targetDocumentTypeId,
          targetFormId: config.targetFormId,
          createNewDocument: request.config.createNewDocument,
          startWorkflow: request.config.startWorkflow,
          linkDocuments: request.config.linkDocuments,
          copyAttachments: request.config.copyAttachments,
          copyGridRows: request.config.copyGridRows
        });

        // Execute the CopyToDocument action
        return this.copyToDocumentService.executeCopyToDocument(request).pipe(
          map((result: CopyToDocumentResultDto) => {
            if (result.success) {
              console.log(`[CopyToDocumentActionExecutor] ✅ CopyToDocument action executed successfully. Target Document: ${result.targetDocumentNumber} (ID: ${result.targetDocumentId})`);
              if (request.config.linkDocuments) {
                console.log(`[CopyToDocumentActionExecutor] Documents linked: Source (${sourceSubmissionId}) -> Target (${result.targetDocumentId})`);
              }
              if (request.config.startWorkflow) {
                console.log(`[CopyToDocumentActionExecutor] Workflow started for target document: ${result.targetDocumentId}`);
              }
            } else {
              console.warn(`[CopyToDocumentActionExecutor] ⚠️ CopyToDocument action completed with errors: ${result.errorMessage}`);
            }
            return result;
          }),
          catchError((error) => {
            console.error(`[CopyToDocumentActionExecutor] ❌ Error executing CopyToDocument action:`, error);
            return throwError(() => error);
          })
        );
      }),
      catchError((error) => {
        console.error(`[CopyToDocumentActionExecutor] ❌ Error loading source submission ${sourceSubmissionId}:`, error);
        return throwError(() => new Error(`Failed to load source submission: ${error?.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Execute CopyToDocument actions for OnFormSubmitted event
   * Called automatically after a form is submitted
   */
  executeOnFormSubmitted(
    submissionId: number,
    formBuilderId: number
  ): Observable<CopyToDocumentResultDto[]> {
    console.log(`[CopyToDocumentActionExecutor] OnFormSubmitted event triggered for submission ${submissionId}`);
    return this.executeCopyToDocumentActionsForEvent(
      'OnFormSubmitted',
      submissionId,
      formBuilderId
    );
  }

  /**
   * Execute CopyToDocument actions for OnApprovalCompleted event
   * Called automatically after approval workflow is completed
   */
  executeOnApprovalCompleted(
    submissionId: number,
    formBuilderId: number
  ): Observable<CopyToDocumentResultDto[]> {
    console.log(`[CopyToDocumentActionExecutor] OnApprovalCompleted event triggered for submission ${submissionId}`);
    return this.executeCopyToDocumentActionsForEvent(
      'OnApprovalCompleted',
      submissionId,
      formBuilderId
    );
  }

  /**
   * Execute CopyToDocument actions for OnDocumentApproved event
   * Called automatically when a document is approved
   */
  executeOnDocumentApproved(
    submissionId: number,
    formBuilderId: number
  ): Observable<CopyToDocumentResultDto[]> {
    console.log(`[CopyToDocumentActionExecutor] OnDocumentApproved event triggered for submission ${submissionId}`);
    return this.executeCopyToDocumentActionsForEvent(
      'OnDocumentApproved',
      submissionId,
      formBuilderId
    );
  }

  /**
   * Execute CopyToDocument actions for OnRuleMatched event
   * Called automatically when a rule condition is matched
   */
  executeOnRuleMatched(
    submissionId: number,
    formBuilderId: number,
    ruleId: number
  ): Observable<CopyToDocumentResultDto[]> {
    console.log(`[CopyToDocumentActionExecutor] OnRuleMatched event triggered for submission ${submissionId}, rule ${ruleId}`);
    return this.executeCopyToDocumentActionsForEvent(
      'OnRuleMatched',
      submissionId,
      formBuilderId,
      ruleId
    );
  }
}

