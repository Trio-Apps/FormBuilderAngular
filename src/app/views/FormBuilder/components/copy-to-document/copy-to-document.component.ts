import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CopyToDocumentService } from '../../services/copy-to-document.service';
import { DocumentTypesService } from '../../services/document-types.service';
import { FormsService } from '../../services/forms.service';
import { FormSubmissionsService, FormSubmissionDto } from '../../../form-submissions/services/form-submissions.service';
import { FieldsService } from '../../services/fields.service';
import { GridService } from '../../services/grid.service';
import { TabsService } from '../../services/tabs.service';
import {
  CopyToDocumentRequestDto,
  CopyToDocumentResultDto,
  CopyToDocumentAuditDto,
  CopyToDocumentAuditQueryParams,
  FormFieldDto
} from '../../form-builder/models/form-builder-dto.model';
import { DocumentType } from '../../form-builder/models/document-types.model';
import { FormBuilderDto } from '../../form-builder/models/form-builder-dto.model';
import { FormGridDto } from '../../form-builder/models/grid-dto.model';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../../services/permission.service';

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
export class CopyToDocumentComponent implements OnInit, AfterViewInit {
  copyForm!: FormGroup;
  loading = false;
  result: CopyToDocumentResultDto | null = null;
  
  // Dropdowns data
  documentTypes: DocumentType[] = [];
  targetForms: FormBuilderDto[] = [];
  submissions: FormSubmissionDto[] = [];
  
  // Fields and Grids data
  sourceFields: FormFieldDto[] = [];
  targetFields: FormFieldDto[] = [];
  sourceGrids: FormGridDto[] = [];
  targetGrids: FormGridDto[] = [];
  
  // Audit records
  showAuditDialog = false;
  showAuditPanel = true; // Show audit records panel on main page
  auditRecords: CopyToDocumentAuditDto[] = [];
  auditTotalRecords = 0;
  auditLoading = false;
  auditInitialized = false; // Flag to prevent multiple initial loads
  auditParams: CopyToDocumentAuditQueryParams = {
    page: 1,
    pageSize: 50
  };

  constructor(
    private fb: FormBuilder,
    private copyToDocumentService: CopyToDocumentService,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private formSubmissionsService: FormSubmissionsService,
    private fieldsService: FieldsService,
    private gridService: GridService,
    private tabsService: TabsService,
    private messageService: MessageService,
    private permissionService: PermissionService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Check permissions before loading data
    const canViewDocuments = this.permissionService.canViewDocuments();
    console.log('[CopyToDocument] User can view documents:', canViewDocuments);
    
    if (canViewDocuments) {
      this.loadDocumentTypes();
    } else {
      console.warn('[CopyToDocument] User does not have Document_Allow_View permission');
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Required',
        detail: 'You do not have permission to view document types. Please contact administrator.'
      });
    }
    
    this.loadTargetForms();
    this.loadSubmissions();
  }

  ngAfterViewInit(): void {
    // Load audit records after view is initialized
    if (this.showAuditPanel && !this.auditInitialized) {
      // Small delay to ensure table is fully rendered
      setTimeout(() => {
        this.loadAuditRecords();
      }, 100);
    }
  }

  initForm(): void {
    this.copyForm = this.fb.group({
      sourceSubmissionId: [null, Validators.required],
      sourceDocumentTypeId: [null], // Will be set from submission
      sourceFormId: [null], // Will be set from submission
      targetDocumentTypeId: [null, Validators.required],
      targetFormId: [null, Validators.required],
      createNewDocument: [true],
      targetDocumentId: [null],
      initialStatus: ['Draft'], // Default: 'Draft'
      triggerEvent: ['OnRuleMatched'], // Default: 'OnRuleMatched'
      copyCalculatedFields: [true],
      copyGridRows: [false], // Default: false as per API example
      startWorkflow: [true], // Default: true as per API example
      linkDocuments: [true],
      copyAttachments: [false], // New field
      copyMetadata: [false],
      overrideTargetDefaults: [false], // New field
      fieldMappings: this.fb.array([]),
      gridMappings: this.fb.array([]),
      metadataFields: this.fb.array([])
    });

    // Add conditional validation for targetDocumentId
    this.copyForm.get('createNewDocument')?.valueChanges.subscribe(createNew => {
      const targetDocumentIdControl = this.copyForm.get('targetDocumentId');
      if (!createNew) {
        targetDocumentIdControl?.setValidators([Validators.required]);
      } else {
        targetDocumentIdControl?.clearValidators();
        targetDocumentIdControl?.setValue(null);
      }
      targetDocumentIdControl?.updateValueAndValidity();
    });

    // Load source fields and grids when sourceSubmissionId changes
    this.copyForm.get('sourceSubmissionId')?.valueChanges.subscribe(submissionId => {
      console.log('[CopyToDocument] Source submission ID changed:', submissionId);
      if (submissionId) {
        // Set sourceDocumentTypeId and sourceFormId from submission
        const sourceSubmission = this.submissions.find(s => s.id === submissionId);
        if (sourceSubmission) {
          if (sourceSubmission.documentTypeId) {
            this.copyForm.patchValue({
              sourceDocumentTypeId: sourceSubmission.documentTypeId
            });
          }
          if (sourceSubmission.formBuilderId) {
            this.copyForm.patchValue({
              sourceFormId: sourceSubmission.formBuilderId
            });
          }
        }
        this.loadSourceFieldsAndGrids(submissionId);
      } else {
        this.sourceFields = [];
        this.sourceGrids = [];
        this.copyForm.patchValue({
          sourceDocumentTypeId: null,
          sourceFormId: null
        });
      }
    });

    // Load target fields and grids when targetFormId changes
    this.copyForm.get('targetFormId')?.valueChanges.subscribe(formId => {
      console.log('[CopyToDocument] Target form ID changed:', formId);
      if (formId) {
        this.loadTargetFieldsAndGrids(formId);
      } else {
        this.targetFields = [];
        this.targetGrids = [];
      }
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
    console.log('[CopyToDocument] Loading document types...');
    this.documentTypesService.getActiveDocumentTypes().subscribe({
      next: (types) => {
        console.log('[CopyToDocument] Document types loaded:', types?.length || 0, 'types');
        this.documentTypes = types || [];
        
        if (this.documentTypes.length === 0) {
          console.warn('[CopyToDocument] No document types found. Trying fallback...');
          // Fallback: try getAllDocumentTypes
          this.documentTypesService.getAllDocumentTypes().subscribe({
            next: (allTypes) => {
              console.log('[CopyToDocument] Fallback: Loaded all document types:', allTypes?.length || 0);
              // Filter active and non-deleted types
              this.documentTypes = (allTypes || []).filter((t: DocumentType) => 
                t.isActive && !t.isDeleted
              );
              console.log('[CopyToDocument] After filtering:', this.documentTypes.length, 'active types');
              
              if (this.documentTypes.length === 0) {
                this.messageService.add({
                  severity: 'warn',
                  summary: 'Warning',
                  detail: 'No active document types found. Please contact administrator.'
                });
              }
            },
            error: (fallbackError) => {
              console.error('[CopyToDocument] Fallback error:', fallbackError);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load document types. Please check your permissions or contact administrator.'
              });
            }
          });
        }
      },
      error: (error) => {
        console.error('[CopyToDocument] Error loading document types:', error);
        console.error('[CopyToDocument] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        
        // Try fallback
        this.documentTypesService.getAllDocumentTypes().subscribe({
          next: (allTypes) => {
            console.log('[CopyToDocument] Fallback: Loaded all document types:', allTypes?.length || 0);
            this.documentTypes = (allTypes || []).filter((t: DocumentType) => 
              t.isActive && !t.isDeleted
            );
            
            if (this.documentTypes.length === 0) {
              this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No active document types found. Please contact administrator.'
              });
            }
          },
          error: (fallbackError) => {
            console.error('[CopyToDocument] Fallback error:', fallbackError);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to load document types. Please check your permissions (Document_Allow_View) or contact administrator.'
            });
          }
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
        console.log('[CopyToDocument] Loaded submissions:', this.submissions.length);
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

  onSourceSubmissionChange(event: any): void {
    const submissionId = event.target.value ? parseInt(event.target.value, 10) : null;
    console.log('[CopyToDocument] onSourceSubmissionChange called with ID:', submissionId);
    if (submissionId) {
      // Also update the form control value to ensure consistency
      this.copyForm.patchValue({ sourceSubmissionId: submissionId }, { emitEvent: false });
      this.loadSourceFieldsAndGrids(submissionId);
    } else {
      this.sourceFields = [];
      this.sourceGrids = [];
    }
  }

  loadSourceFieldsAndGrids(submissionId: number | string): void {
    // Convert to number if string
    const id = typeof submissionId === 'string' ? parseInt(submissionId, 10) : submissionId;
    console.log('[CopyToDocument] Loading source fields and grids for submission:', id);
    
    // Get submission to find form ID
    const submission = this.submissions.find(s => s.id === id);
    console.log('[CopyToDocument] Found submission:', submission);
    
    if (!submission) {
      console.warn('[CopyToDocument] Submission not found in local array, trying to load from API');
      // Try to load submission from API if not found locally
      this.formSubmissionsService.getSubmissionById(id).subscribe({
        next: (sub) => {
          if (sub && sub.formBuilderId) {
            console.log('[CopyToDocument] Loaded submission from API, formBuilderId:', sub.formBuilderId);
            this.loadFieldsForForm(sub.formBuilderId, 'source');
            this.loadGridsForForm(sub.formBuilderId, 'source');
          } else {
            console.error('[CopyToDocument] Submission has no formBuilderId');
            this.sourceFields = [];
            this.sourceGrids = [];
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: 'Source submission does not have a form ID'
            });
          }
        },
        error: (error) => {
          console.error('[CopyToDocument] Error loading submission:', error);
          this.sourceFields = [];
          this.sourceGrids = [];
        }
      });
      return;
    }

    if (!submission.formBuilderId) {
      console.error('[CopyToDocument] Submission has no formBuilderId');
      this.sourceFields = [];
      this.sourceGrids = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Source submission does not have a form ID'
      });
      return;
    }

    const formId = submission.formBuilderId;
    console.log('[CopyToDocument] Loading fields and grids for form ID:', formId);
    this.loadFieldsForForm(formId, 'source');
    this.loadGridsForForm(formId, 'source');
  }

  loadTargetFieldsAndGrids(formId: number): void {
    this.loadFieldsForForm(formId, 'target');
    this.loadGridsForForm(formId, 'target');
  }

  loadFieldsForForm(formId: number, type: 'source' | 'target'): void {
    console.log(`[CopyToDocument] Loading fields for ${type} form ID:`, formId);
    
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs) => {
        console.log(`[CopyToDocument] Found ${tabs?.length || 0} tabs for ${type} form`);
        
        if (tabs && tabs.length > 0) {
          const fieldObservables = tabs.map(tab =>
            this.fieldsService.getFields(formId, tab.id).pipe(
              map(fields => {
                console.log(`[CopyToDocument] Loaded ${fields?.length || 0} fields from tab ${tab.id}`);
                return { tabId: tab.id, fields };
              }),
              catchError((error) => {
                console.error(`[CopyToDocument] Error loading fields from tab ${tab.id}:`, error);
                return of({ tabId: tab.id, fields: [] });
              })
            )
          );

          forkJoin(fieldObservables).subscribe({
            next: (results) => {
              const allFields: FormFieldDto[] = [];
              results.forEach(result => {
                if (result.fields && result.fields.length > 0) {
                  allFields.push(...result.fields);
                }
              });
              
              console.log(`[CopyToDocument] Total ${type} fields loaded:`, allFields.length);
              
              if (type === 'source') {
                this.sourceFields = allFields;
              } else {
                this.targetFields = allFields;
              }
            },
            error: (error) => {
              console.error(`[CopyToDocument] Error loading ${type} form fields:`, error);
              if (type === 'source') {
                this.sourceFields = [];
              } else {
                this.targetFields = [];
              }
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Failed to load ${type} form fields`
              });
            }
          });
        } else {
          console.warn(`[CopyToDocument] No tabs found for ${type} form`);
          if (type === 'source') {
            this.sourceFields = [];
          } else {
            this.targetFields = [];
          }
        }
      },
      error: (error) => {
        console.error(`[CopyToDocument] Error loading ${type} form tabs:`, error);
        if (type === 'source') {
          this.sourceFields = [];
        } else {
          this.targetFields = [];
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to load ${type} form tabs`
        });
      }
    });
  }

  loadGridsForForm(formId: number, type: 'source' | 'target'): void {
    this.gridService.getActiveGridsByFormBuilder(formId).subscribe({
      next: (response) => {
        const grids = response.data || [];
        if (type === 'source') {
          this.sourceGrids = grids;
        } else {
          this.targetGrids = grids;
        }
      },
      error: (error) => {
        console.error(`Error loading ${type} form grids:`, error);
        if (type === 'source') {
          this.sourceGrids = [];
        } else {
          this.targetGrids = [];
        }
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

    // Get source submission to extract sourceDocumentTypeId and sourceFormId
    const sourceSubmission = this.submissions.find(s => s.id === formValue.sourceSubmissionId);
    if (!sourceSubmission) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Source submission not found'
      });
      this.loading = false;
      return;
    }

    // Validate required source fields
    if (!sourceSubmission.formBuilderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Source submission is missing form information'
      });
      this.loading = false;
      return;
    }

    // Get documentTypeId - if not in submission, load it from form
    let sourceDocumentTypeId = sourceSubmission.documentTypeId;
    if (!sourceDocumentTypeId && sourceSubmission.formBuilderId) {
      // Try to load documentTypeId from form
      this.documentTypesService.getDocumentTypeByFormId(sourceSubmission.formBuilderId).subscribe({
        next: (documentType) => {
          if (documentType && documentType.id) {
            sourceDocumentTypeId = documentType.id;
            this.executeCopyWithDocumentType(sourceDocumentTypeId, sourceSubmission, formValue);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Could not determine document type for source form'
            });
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('[CopyToDocument] Error loading document type:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load document type for source form'
          });
          this.loading = false;
        }
      });
      return; // Exit early, will continue in callback
    }

    // If documentTypeId is available, proceed directly
    this.executeCopyWithDocumentType(sourceDocumentTypeId, sourceSubmission, formValue);
  }

  private executeCopyWithDocumentType(
    sourceDocumentTypeId: number,
    sourceSubmission: FormSubmissionDto,
    formValue: any
  ): void {
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
        // الحقول المطلوبة الجديدة - استخدام القيم من form أو fallback
        sourceDocumentTypeId: formValue.sourceDocumentTypeId || sourceDocumentTypeId,
        sourceFormId: formValue.sourceFormId || sourceSubmission.formBuilderId,
        
        targetDocumentTypeId: formValue.targetDocumentTypeId,
        targetFormId: formValue.targetFormId,
        createNewDocument: formValue.createNewDocument,
        ...(formValue.createNewDocument ? {} : { targetDocumentId: formValue.targetDocumentId }),
        
        // الحقل الجديد
        initialStatus: formValue.initialStatus || 'Draft',
        triggerEvent: formValue.triggerEvent || 'OnRuleMatched',
        
        fieldMapping: Object.keys(fieldMapping).length > 0 ? fieldMapping : {},
        gridMapping: Object.keys(gridMapping).length > 0 ? gridMapping : {},
        copyCalculatedFields: formValue.copyCalculatedFields,
        copyGridRows: formValue.copyGridRows,
        startWorkflow: formValue.startWorkflow,
        linkDocuments: formValue.linkDocuments,
        copyAttachments: formValue.copyAttachments || false,
        copyMetadata: formValue.copyMetadata,
        overrideTargetDefaults: formValue.overrideTargetDefaults || false,
        metadataFields: formValue.metadataFields && formValue.metadataFields.length > 0 
          ? formValue.metadataFields.filter((f: string) => f && f.trim() !== '') 
          : []
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
    // Only load if not already loaded or if data is stale
    if (!this.auditInitialized || this.auditRecords.length === 0) {
      this.loadAuditRecords();
    }
  }

  loadAuditRecords(): void {
    // Prevent multiple simultaneous requests
    if (this.auditLoading) {
      console.log('[CopyToDocument] Audit records already loading, skipping...');
      return;
    }

    this.auditLoading = true;
    console.log('[CopyToDocument] Loading audit records with params:', this.auditParams);
    this.copyToDocumentService.getAuditRecords(this.auditParams).subscribe({
      next: (response) => {
        this.auditLoading = false;
        this.auditInitialized = true;
        console.log('[CopyToDocument] Audit records response:', response);
        this.auditRecords = response.items || [];
        this.auditTotalRecords = response.totalCount || 0;
        console.log('[CopyToDocument] Loaded audit records:', this.auditRecords.length, 'Total:', this.auditTotalRecords);
        
        if (this.auditRecords.length === 0) {
          console.log('[CopyToDocument] No audit records found. Response:', response);
        }
      },
      error: (error) => {
        this.auditLoading = false;
        console.error('[CopyToDocument] Error loading audit records:', error);
        // Only show error message if it's not a 401 (unauthorized) - that's handled by auth interceptor
        if (error.status !== 401 && error.status !== 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load audit records'
          });
        }
      }
    });
  }

  onAuditPageChange(event: any): void {
    // Calculate page number from PrimeNG event
    const newPage = Math.floor(event.first / event.rows) + 1;
    const newPageSize = event.rows;
    
    // Only reload if page or pageSize actually changed
    if (this.auditParams.page !== newPage || this.auditParams.pageSize !== newPageSize) {
      this.auditParams.page = newPage;
      this.auditParams.pageSize = newPageSize;
      this.loadAuditRecords();
    }
  }

  closeAuditPanel(): void {
    this.showAuditPanel = false;
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
      targetDocumentId: null,
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

