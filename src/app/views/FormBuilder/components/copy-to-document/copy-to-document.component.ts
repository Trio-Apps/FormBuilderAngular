import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CopyToDocumentService } from '../../services/copy-to-document.service';
import { DocumentTypesService } from '../../services/document-types.service';
import { FormsService } from '../../services/forms.service';
import { FormSubmissionsService, FormSubmissionDto } from '../../../form-submissions/services/form-submissions.service';
import {
  CopyToDocumentRequestDto,
  CopyToDocumentResultDto,
  CopyToDocumentAuditDto,
  CopyToDocumentAuditQueryParams
} from '../../form-builder/models/form-builder-dto.model';
import { DocumentType } from '../../form-builder/models/document-types.model';
import { FormBuilderDto } from '../../form-builder/models/form-builder-dto.model';
import { MessageService } from 'primeng/api';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-copy-to-document',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    ToastModule,
    CardModule,
    PanelModule,
    TableModule,
    DialogModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './copy-to-document.component.html',
  styleUrls: ['./copy-to-document.component.scss']
})
export class CopyToDocumentComponent implements OnInit {
  copyForm!: FormGroup;
  loading = false;
  result: CopyToDocumentResultDto | null = null;
  
  // Dropdowns data
  documentTypes: DocumentType[] = [];
  targetForms: FormBuilderDto[] = [];
  submissions: FormSubmissionDto[] = [];
  
  // Audit records
  showAuditDialog = false;
  auditRecords: CopyToDocumentAuditDto[] = [];
  auditLoading = false;
  auditParams: CopyToDocumentAuditQueryParams = {
    page: 1,
    pageSize: 10
  };

  constructor(
    private fb: FormBuilder,
    private copyToDocumentService: CopyToDocumentService,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private formSubmissionsService: FormSubmissionsService,
    private messageService: MessageService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadTargetForms();
    this.loadSubmissions();
  }

  initForm(): void {
    this.copyForm = this.fb.group({
      sourceSubmissionId: [null, Validators.required],
      targetDocumentTypeId: [null, Validators.required],
      targetFormId: [null, Validators.required],
      createNewDocument: [true],
      copyCalculatedFields: [true],
      copyGridRows: [true],
      startWorkflow: [false],
      linkDocuments: [true],
      copyMetadata: [false],
      fieldMappings: this.fb.array([]),
      gridMappings: this.fb.array([]),
      metadataFields: this.fb.array([])
    });
  }

  get fieldMappingsArray(): FormArray {
    return this.copyForm.get('fieldMappings') as FormArray;
  }

  get gridMappingsArray(): FormArray {
    return this.copyForm.get('gridMappings') as FormArray;
  }

  get metadataFieldsArray(): FormArray {
    return this.copyForm.get('metadataFields') as FormArray;
  }

  loadDocumentTypes(): void {
    this.documentTypesService.getActiveDocumentTypes().subscribe({
      next: (types) => {
        this.documentTypes = types || [];
      },
      error: (error) => {
        console.error('Error loading document types:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load document types'
        });
      }
    });
  }

  loadTargetForms(): void {
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        this.targetForms = (result.items || []).filter((f: FormBuilderDto) => f.isPublished && f.isActive);
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load forms'
        });
      }
    });
  }

  loadSubmissions(): void {
    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (submissions) => {
        // Sort by ID descending (newest first)
        this.submissions = (submissions || []).sort((a, b) => b.id - a.id);
      },
      error: (error) => {
        console.error('Error loading submissions:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load submissions'
        });
      }
    });
  }

  addFieldMapping(): void {
    const fieldMappingGroup = this.fb.group({
      sourceFieldCode: ['', Validators.required],
      targetFieldCode: ['', Validators.required]
    });
    this.fieldMappingsArray.push(fieldMappingGroup);
  }

  removeFieldMapping(index: number): void {
    this.fieldMappingsArray.removeAt(index);
  }

  addGridMapping(): void {
    const gridMappingGroup = this.fb.group({
      sourceGridCode: ['', Validators.required],
      targetGridCode: ['', Validators.required]
    });
    this.gridMappingsArray.push(gridMappingGroup);
  }

  removeGridMapping(index: number): void {
    this.gridMappingsArray.removeAt(index);
  }

  addMetadataField(): void {
    const metadataFieldControl = this.fb.control('', Validators.required);
    this.metadataFieldsArray.push(metadataFieldControl);
  }

  removeMetadataField(index: number): void {
    this.metadataFieldsArray.removeAt(index);
  }

  executeCopy(): void {
    if (this.copyForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields'
      });
      return;
    }

    this.loading = true;
    this.result = null;

    const formValue = this.copyForm.value;

    // Convert field mappings array to object
    const fieldMapping: { [key: string]: string } = {};
    formValue.fieldMappings.forEach((mapping: any) => {
      if (mapping.sourceFieldCode && mapping.targetFieldCode) {
        fieldMapping[mapping.sourceFieldCode] = mapping.targetFieldCode;
      }
    });

    // Convert grid mappings array to object
    const gridMapping: { [key: string]: string } = {};
    formValue.gridMappings.forEach((mapping: any) => {
      if (mapping.sourceGridCode && mapping.targetGridCode) {
        gridMapping[mapping.sourceGridCode] = mapping.targetGridCode;
      }
    });

    const request: CopyToDocumentRequestDto = {
      config: {
        targetDocumentTypeId: formValue.targetDocumentTypeId,
        targetFormId: formValue.targetFormId,
        createNewDocument: formValue.createNewDocument,
        fieldMapping: Object.keys(fieldMapping).length > 0 ? fieldMapping : undefined,
        gridMapping: Object.keys(gridMapping).length > 0 ? gridMapping : undefined,
        copyCalculatedFields: formValue.copyCalculatedFields,
        copyGridRows: formValue.copyGridRows,
        startWorkflow: formValue.startWorkflow,
        linkDocuments: formValue.linkDocuments,
        copyMetadata: formValue.copyMetadata,
        metadataFields: formValue.metadataFields.filter((f: string) => f && f.trim() !== '')
      },
      sourceSubmissionId: formValue.sourceSubmissionId,
      actionId: null,
      ruleId: null
    };

    console.log('[CopyToDocument] Executing with request:', request);

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        this.loading = false;
        this.result = result;

        if (result.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Document copied successfully! Target Document: ${result.targetDocumentNumber}`
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
        console.error('[CopyToDocument] Error:', error);
        
        let errorMessage = 'An error occurred while copying the document.';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    });
  }

  openAuditDialog(): void {
    this.showAuditDialog = true;
    this.loadAuditRecords();
  }

  loadAuditRecords(): void {
    this.auditLoading = true;
    this.copyToDocumentService.getAuditRecords(this.auditParams).subscribe({
      next: (response) => {
        this.auditLoading = false;
        this.auditRecords = response.items || [];
      },
      error: (error) => {
        this.auditLoading = false;
        console.error('Error loading audit records:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load audit records'
        });
      }
    });
  }

  loadAuditBySubmission(): void {
    const submissionId = this.copyForm.get('sourceSubmissionId')?.value;
    if (!submissionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter source submission ID'
      });
      return;
    }

    this.auditLoading = true;
    this.copyToDocumentService.getAuditRecordsBySubmission(submissionId).subscribe({
      next: (audits) => {
        this.auditLoading = false;
        this.auditRecords = audits;
        this.showAuditDialog = true;
      },
      error: (error) => {
        this.auditLoading = false;
        console.error('Error loading audit records:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load audit records'
        });
      }
    });
  }

  resetForm(): void {
    this.copyForm.reset({
      sourceSubmissionId: null,
      createNewDocument: true,
      copyCalculatedFields: true,
      copyGridRows: true,
      startWorkflow: false,
      linkDocuments: true,
      copyMetadata: false
    });
    this.fieldMappingsArray.clear();
    this.gridMappingsArray.clear();
    this.metadataFieldsArray.clear();
    this.result = null;
  }
}

