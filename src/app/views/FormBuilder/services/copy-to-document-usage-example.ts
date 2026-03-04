/**
 * مثال كامل على استخدام CopyToDocumentService
 * 
 * هذا الملف يوضح كيفية استخدام CopyToDocumentService
 * مع الـ Request المحدد من المستخدم
 */

import { CopyToDocumentService } from './copy-to-document.service';
import { CopyToDocumentRequestDto } from '../form-builder/models/form-builder-dto.model';

/**
 * مثال: تنفيذ CopyToDocument مع الـ Request المحدد
 * 
 * Request:
 * POST http://localhost:5000/api/CopyToDocument/execute
 * {
 *   "config": {
 *     "targetDocumentTypeId": 2,
 *     "targetFormId": 1,
 *     "createNewDocument": true,
 *     "fieldMapping": {
 *       "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
 *     },
 *     "gridMapping": {},
 *     "copyCalculatedFields": true,
 *     "copyGridRows": true,
 *     "startWorkflow": false,
 *     "linkDocuments": true,
 *     "copyMetadata": false,
 *     "metadataFields": []
 *   },
 *   "sourceSubmissionId": 1,
 *   "actionId": null,
 *   "ruleId": null
 * }
 */
export class CopyToDocumentUsageExample {
  constructor(private copyToDocumentService: CopyToDocumentService) {}

  /**
   * مثال 1: تنفيذ CopyToDocument مع الـ Request المحدد
   */
  executeExample1(): void {
    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMapping: {
          "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
        },
        gridMapping: {},
        copyCalculatedFields: true,
        copyGridRows: true,
        startWorkflow: false,
        linkDocuments: true,
        copyMetadata: false,
        metadataFields: []
      },
      sourceSubmissionId: 1,
      actionId: null,
      ruleId: null
    };

    console.log('[CopyToDocument] Executing CopyToDocument with request:', request);

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        console.log('[CopyToDocument] Execution completed:', result);
        
        if (result.success) {
          console.log('✅ CopyToDocument executed successfully!');
          console.log(`   Target Document ID: ${result.targetDocumentId}`);
          console.log(`   Target Document Number: ${result.targetDocumentNumber}`);
          console.log(`   Fields Copied: ${result.fieldsCopied || 0}`);
          console.log(`   Grid Rows Copied: ${result.gridRowsCopied || 0}`);
        } else {
          console.error('❌ CopyToDocument failed!');
          console.error(`   Error Message: ${result.errorMessage}`);
        }
      },
      error: (error) => {
        console.error('[CopyToDocument] API Error:', error);
        console.error('   Status:', error?.status);
        console.error('   Message:', error?.message);
        console.error('   Error Details:', error?.error);
      }
    });
  }

  /**
   * مثال 2: تنفيذ CopyToDocument مع Field Mappings متعددة
   */
  executeExample2(): void {
    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMapping: {
          "CUSTOMER_NAME": "PARTY_NAME",
          "ORDER_DATE": "CONTRACT_DATE",
          "AMOUNT": "TOTAL_AMOUNT",
          "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
        },
        gridMapping: {
          "ITEMS": "CONTRACT_ITEMS"
        },
        copyCalculatedFields: true,
        copyGridRows: true,
        startWorkflow: false,
        linkDocuments: true,
        copyMetadata: true,
        metadataFields: ["CREATED_BY", "CREATED_DATE", "MODIFIED_BY"]
      },
      sourceSubmissionId: 1,
      actionId: null,
      ruleId: null
    };

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        if (result.success) {
          console.log('✅ Document copied successfully!');
          console.log(`   Target Document: ${result.targetDocumentNumber}`);
        }
      },
      error: (error) => {
        console.error('❌ Error:', error);
      }
    });
  }

  /**
   * مثال 3: جلب Audit Records بعد التنفيذ
   */
  getAuditRecordsAfterExecution(submissionId: number): void {
    // أولاً: تنفيذ CopyToDocument
    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMapping: {
          "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
        },
        gridMapping: {},
        copyCalculatedFields: true,
        copyGridRows: true,
        startWorkflow: false,
        linkDocuments: true,
        copyMetadata: false,
        metadataFields: []
      },
      sourceSubmissionId: submissionId,
      actionId: null,
      ruleId: null
    };

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        if (result.success) {
          console.log('✅ CopyToDocument executed successfully!');
          
          // ثانياً: جلب Audit Records للـ Submission
          this.copyToDocumentService.getAuditRecordsBySubmission(submissionId).subscribe({
            next: (audits) => {
              console.log(`📋 Found ${audits.length} audit records for submission ${submissionId}`);
              audits.forEach(audit => {
                console.log(`   Audit ID: ${audit.id}`);
                console.log(`   Success: ${audit.success}`);
                console.log(`   Target Document: ${audit.targetDocumentNumber}`);
                console.log(`   Execution Date: ${audit.executionDate}`);
              });
            },
            error: (error) => {
              console.error('❌ Error fetching audit records:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error executing CopyToDocument:', error);
      }
    });
  }

  /**
   * مثال 4: استخدام في Component مع Error Handling كامل
   */
  executeWithFullErrorHandling(): void {
    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMapping: {
          "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
        },
        gridMapping: {},
        copyCalculatedFields: true,
        copyGridRows: true,
        startWorkflow: false,
        linkDocuments: true,
        copyMetadata: false,
        metadataFields: []
      },
      sourceSubmissionId: 1,
      actionId: null,
      ruleId: null
    };

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        // Handle success
        if (result.success) {
          // Show success message
          console.log('Success!', {
            targetDocumentId: result.targetDocumentId,
            targetDocumentNumber: result.targetDocumentNumber,
            fieldsCopied: result.fieldsCopied,
            gridRowsCopied: result.gridRowsCopied
          });
          
          // Optionally: Navigate to target document
          // this.router.navigate(['/documents', result.targetDocumentId]);
        } else {
          // Handle failure
          console.error('CopyToDocument failed:', result.errorMessage);
          // Show error message to user
        }
      },
      error: (error) => {
        // Handle API errors
        let errorMessage = 'An error occurred while copying the document.';
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        console.error('API Error:', {
          status: error?.status,
          statusText: error?.statusText,
          message: errorMessage,
          error: error?.error
        });
        
        // Show error message to user
        // this.messageService.add({
        //   severity: 'error',
        //   summary: 'Error',
        //   detail: errorMessage
        // });
      }
    });
  }
}

/**
 * مثال على استخدام في Component
 */
/*
import { Component } from '@angular/core';
import { CopyToDocumentService } from './services/copy-to-document.service';
import { CopyToDocumentRequestDto } from './models/form-builder-dto.model';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-copy-document',
  template: `
    <button (click)="executeCopy()" [disabled]="loading">
      {{ loading ? 'Copying...' : 'Copy Document' }}
    </button>
    
    <div *ngIf="result">
      <p *ngIf="result.success" class="success">
        ✅ Document copied successfully!
        <br>Target Document: {{ result.targetDocumentNumber }}
      </p>
      <p *ngIf="!result.success" class="error">
        ❌ Error: {{ result.errorMessage }}
      </p>
    </div>
  `
})
export class CopyDocumentComponent {
  loading = false;
  result: any = null;

  constructor(
    private copyToDocumentService: CopyToDocumentService,
    private messageService: MessageService
  ) {}

  executeCopy() {
    this.loading = true;
    this.result = null;

    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMapping: {
          "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
        },
        gridMapping: {},
        copyCalculatedFields: true,
        copyGridRows: true,
        startWorkflow: false,
        linkDocuments: true,
        copyMetadata: false,
        metadataFields: []
      },
      sourceSubmissionId: 1,
      actionId: null,
      ruleId: null
    };

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        this.loading = false;
        this.result = result;
        
        if (result.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Document copied successfully! Target: ${result.targetDocumentNumber}`
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: result.errorMessage || 'Failed to copy document'
          });
        }
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'An error occurred while copying the document'
        });
      }
    });
  }
}
*/

