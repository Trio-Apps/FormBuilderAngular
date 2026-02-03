/**
 * مثال على استخدام CopyToDocumentService
 * 
 * هذا الملف يوضح كيفية استخدام CopyToDocumentService
 * لتنفيذ عملية نسخ البيانات من مستند إلى آخر
 */

import { CopyToDocumentService } from './copy-to-document.service';
import { CopyToDocumentRequestDto } from '../form-builder/models/form-builder-dto.model';

/**
 * مثال 1: تنفيذ CopyToDocument بسيط
 */
export function example1_SimpleCopyToDocument(service: CopyToDocumentService) {
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

  service.executeCopyToDocument(request).subscribe({
    next: (result) => {
      console.log('CopyToDocument executed successfully:', result);
      if (result.success) {
        console.log(`Target Document ID: ${result.targetDocumentId}`);
        console.log(`Target Document Number: ${result.targetDocumentNumber}`);
        console.log(`Fields Copied: ${result.fieldsCopied}`);
        console.log(`Grid Rows Copied: ${result.gridRowsCopied}`);
      } else {
        console.error('CopyToDocument failed:', result.errorMessage);
      }
    },
    error: (error) => {
      console.error('Error executing CopyToDocument:', error);
    }
  });
}

/**
 * مثال 2: تنفيذ CopyToDocument مع Field Mappings متعددة
 */
export function example2_MultipleFieldMappings(service: CopyToDocumentService) {
  const request: CopyToDocumentRequestDto = {
    config: {
      targetDocumentTypeId: 2,
      targetFormId: 1,
      createNewDocument: true,
      fieldMapping: {
        "CUSTOMER_NAME": "PARTY_NAME",
        "ORDER_DATE": "CONTRACT_DATE",
        "AMOUNT": "TOTAL_AMOUNT"
      },
      gridMapping: {
        "ITEMS": "CONTRACT_ITEMS"
      },
      copyCalculatedFields: true,
      copyGridRows: true,
      startWorkflow: true,
      linkDocuments: true,
      copyMetadata: true,
      metadataFields: ["CREATED_BY", "CREATED_DATE"]
    },
    sourceSubmissionId: 1,
    actionId: null,
    ruleId: null
  };

  service.executeCopyToDocument(request).subscribe({
    next: (result) => {
      if (result.success) {
        console.log('Document copied successfully!');
        console.log(`Target Document: ${result.targetDocumentNumber}`);
      }
    },
    error: (error) => {
      console.error('Error:', error);
    }
  });
}

/**
 * مثال 3: جلب Audit Records
 */
export function example3_GetAuditRecords(service: CopyToDocumentService) {
  // جلب جميع Audit Records مع Pagination
  service.getAuditRecords({
    page: 1,
    pageSize: 10,
    success: true
  }).subscribe({
    next: (response) => {
      console.log(`Total Records: ${response.totalCount}`);
      console.log(`Page: ${response.page} of ${response.totalPages}`);
      response.items.forEach(audit => {
        console.log(`Audit ID: ${audit.id}, Success: ${audit.success}`);
      });
    },
    error: (error) => {
      console.error('Error fetching audit records:', error);
    }
  });
}

/**
 * مثال 4: جلب Audit Records لـ Submission محدد
 */
export function example4_GetAuditBySubmission(service: CopyToDocumentService, submissionId: number) {
  service.getAuditRecordsBySubmission(submissionId).subscribe({
    next: (audits) => {
      console.log(`Found ${audits.length} audit records for submission ${submissionId}`);
      audits.forEach(audit => {
        console.log(`Audit ID: ${audit.id}, Target Document: ${audit.targetDocumentNumber}`);
      });
    },
    error: (error) => {
      console.error('Error:', error);
    }
  });
}

/**
 * مثال 5: جلب Audit Record محدد
 */
export function example5_GetAuditById(service: CopyToDocumentService, auditId: number) {
  service.getAuditRecordById(auditId).subscribe({
    next: (audit) => {
      console.log('Audit Record:', audit);
      console.log(`Source Submission: ${audit.sourceSubmissionId}`);
      console.log(`Target Document: ${audit.targetDocumentId}`);
      console.log(`Success: ${audit.success}`);
      if (audit.errorMessage) {
        console.log(`Error: ${audit.errorMessage}`);
      }
    },
    error: (error) => {
      console.error('Error:', error);
    }
  });
}

/**
 * مثال 6: استخدام في Component
 */
/*
import { Component, OnInit } from '@angular/core';
import { CopyToDocumentService } from './services/copy-to-document.service';
import { CopyToDocumentRequestDto } from './models/form-builder-dto.model';

@Component({
  selector: 'app-copy-to-document',
  template: `
    <button (click)="executeCopy()">Copy Document</button>
    <div *ngIf="result">
      <p>Success: {{ result.success }}</p>
      <p *ngIf="result.success">Target Document: {{ result.targetDocumentNumber }}</p>
      <p *ngIf="!result.success">Error: {{ result.errorMessage }}</p>
    </div>
  `
})
export class CopyToDocumentComponent implements OnInit {
  result: any = null;

  constructor(private copyToDocumentService: CopyToDocumentService) {}

  executeCopy() {
    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: 2,
        targetFormId: 1,
        createNewDocument: true,
        fieldMapping: {
          "SOURCE_FIELD": "TARGET_FIELD"
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
        this.result = result;
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });
  }
}
*/

