import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CopyToDocumentService } from '../../services/copy-to-document.service';
import { DocumentTypesService } from '../../services/document-types.service';
import { FormsService } from '../../services/forms.service';
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
  sourceForms: FormBuilderDto[] = [];
  targetForms: FormBuilderDto[] = [];
  
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
    private fieldsService: FieldsService,
    private gridService: GridService,
    private tabsService: TabsService,
    private messageService: MessageService,
    private permissionService: PermissionService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Ensure permissions are loaded before gating data loads
    this.permissionService.refreshPermissions().subscribe({
      next: () => {
        this.loadInitialData();
      },
      error: (error) => {
        console.error('[CopyToDocument] Failed to refresh permissions, continuing with existing permissions', error);
        this.loadInitialData();
      }
    });
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
      sourceDocumentTypeId: [null, Validators.required],
      sourceFormId: [null, Validators.required],
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

    // Load source forms when source document type changes
    this.copyForm.get('sourceDocumentTypeId')?.valueChanges.subscribe(docTypeId => {
      console.log('[CopyToDocument] Source document type changed:', docTypeId);
      this.copyForm.patchValue({ sourceFormId: null }, { emitEvent: false });
      this.sourceFields = [];
      this.sourceGrids = [];
      if (docTypeId) {
        this.loadSourceForms(docTypeId);
      } else {
        this.sourceForms = [];
      }
    });

    // Load source fields and grids when sourceFormId changes
    this.copyForm.get('sourceFormId')?.valueChanges.subscribe(formId => {
      console.log('[CopyToDocument] Source form ID changed:', formId);
      if (formId) {
        this.loadFieldsForForm(formId, 'source');
        this.loadGridsForForm(formId, 'source');
      } else {
        this.sourceFields = [];
        this.sourceGrids = [];
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

    // Filter target forms when target document type changes
    this.copyForm.get('targetDocumentTypeId')?.valueChanges.subscribe(docTypeId => {
      console.log('[CopyToDocument] Target document type changed:', docTypeId);
      this.copyForm.patchValue({ targetFormId: null }, { emitEvent: false });
      this.targetFields = [];
      this.targetGrids = [];
      if (docTypeId) {
        this.loadTargetForms(docTypeId);
      } else {
        this.loadTargetForms();
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
        const normalized = this.normalizeDocumentTypes(types || []);
        console.log('[CopyToDocument] Document types loaded:', normalized.length, 'types');
        const activeTypes = normalized.filter((t: DocumentType) => 
          this.toBoolean(t.isActive, true) && !this.toBoolean(t.isDeleted, false)
        );
        this.documentTypes = activeTypes.length > 0 ? activeTypes : normalized;
        
        if (this.documentTypes.length === 0) {
          console.warn('[CopyToDocument] No document types found. Trying fallback...');
          // Fallback: try getAllDocumentTypes
          this.documentTypesService.getAllDocumentTypes().subscribe({
            next: (allTypes) => {
              const normalizedAll = this.normalizeDocumentTypes(allTypes || []);
              console.log('[CopyToDocument] Fallback: Loaded all document types:', normalizedAll.length);
              const activeAll = normalizedAll.filter((t: DocumentType) => 
                this.toBoolean(t.isActive, true) && !this.toBoolean(t.isDeleted, false)
              );
              this.documentTypes = activeAll.length > 0 ? activeAll : normalizedAll;
              console.log('[CopyToDocument] After filtering:', this.documentTypes.length, 'document types');
              
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
            const normalizedAll = this.normalizeDocumentTypes(allTypes || []);
            console.log('[CopyToDocument] Fallback: Loaded all document types:', normalizedAll.length);
            const activeAll = normalizedAll.filter((t: DocumentType) => 
              this.toBoolean(t.isActive, true) && !this.toBoolean(t.isDeleted, false)
            );
            this.documentTypes = activeAll.length > 0 ? activeAll : normalizedAll;
            
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

  loadSourceForms(documentTypeId?: number): void {
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        const allForms = this.normalizeFormsResult(result);
        let forms = allForms.filter((f: FormBuilderDto) => 
          this.toBoolean(f.isPublished, true) && this.toBoolean(f.isActive, true)
        );

        if (forms.length === 0 && allForms.length > 0) {
          console.warn('[CopyToDocument] No published/active source forms found. Using all forms.');
          forms = allForms;
        }

        if (documentTypeId) {
          const hasDocType = forms.some((f: FormBuilderDto) => f.documentTypeId !== undefined && f.documentTypeId !== null);
          if (hasDocType) {
            const docTypeIdNum = Number(documentTypeId);
            forms = forms.filter((f: FormBuilderDto) => Number(f.documentTypeId) === docTypeIdNum);
          } else {
            console.warn('[CopyToDocument] Forms are missing documentTypeId. Skipping document type filter.');
          }
        }

        this.sourceForms = forms;
      },
      error: (error) => {
        console.error('Error loading source forms:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load source forms'
        });
      }
    });
  }

  loadTargetForms(documentTypeId?: number): void {
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        const allForms = this.normalizeFormsResult(result);
        let forms = allForms.filter((f: FormBuilderDto) => 
          this.toBoolean(f.isPublished, true) && this.toBoolean(f.isActive, true)
        );

        if (forms.length === 0 && allForms.length > 0) {
          console.warn('[CopyToDocument] No published/active target forms found. Using all forms.');
          forms = allForms;
        }

        if (documentTypeId) {
          const hasDocType = forms.some((f: FormBuilderDto) => f.documentTypeId !== undefined && f.documentTypeId !== null);
          if (hasDocType) {
            const docTypeIdNum = Number(documentTypeId);
            forms = forms.filter((f: FormBuilderDto) => Number(f.documentTypeId) === docTypeIdNum);
          } else {
            console.warn('[CopyToDocument] Forms are missing documentTypeId. Skipping document type filter.');
          }
        }

        this.targetForms = forms;
      },
      error: (error) => {
        console.error('Error loading target forms:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load target forms'
        });
      }
    });
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

    if (!formValue.sourceDocumentTypeId || !formValue.sourceFormId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Source document type and source form are required'
      });
      this.loading = false;
      return;
    }

    this.executeCopyWithDocumentType(formValue.sourceDocumentTypeId, formValue);
  }

  private executeCopyWithDocumentType(
    sourceDocumentTypeId: number,
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
        sourceFormId: formValue.sourceFormId,
        
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

  resetForm(): void {
    this.copyForm.reset({
      sourceDocumentTypeId: null,
      sourceFormId: null,
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

  private loadInitialData(): void {
    // Check permissions before loading data
    const canViewDocuments = this.permissionService.canViewDocuments() || this.permissionService.canManageDocuments();
    const canViewForms = this.permissionService.canViewForms() || this.permissionService.canViewAllForms() || this.permissionService.canManageForms();

    console.log('[CopyToDocument] Permissions:', { canViewDocuments, canViewForms });

    if (canViewDocuments) {
      this.loadDocumentTypes();
    } else {
      console.warn('[CopyToDocument] User does not have Document_Allow_View permission');
      this.documentTypes = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Required',
        detail: 'You do not have permission to view document types. Please contact administrator.'
      });
    }

    if (canViewForms) {
      this.loadSourceForms();
      this.loadTargetForms();
    } else {
      console.warn('[CopyToDocument] User does not have FormBuilder_Allow_View permission');
      this.sourceForms = [];
      this.targetForms = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Required',
        detail: 'You do not have permission to view forms. Please contact administrator.'
      });
    }
  }

  private normalizeFormsResult(result: any): FormBuilderDto[] {
    const items = this.extractList(result);
    return items.map((raw: any) => this.normalizeForm(raw));
  }

  private normalizeForm(raw: any): FormBuilderDto {
    return {
      ...raw,
      id: raw?.id ?? raw?.Id,
      formName: raw?.formName ?? raw?.FormName ?? raw?.name ?? raw?.Name ?? '',
      foreignFormName: raw?.foreignFormName ?? raw?.ForeignFormName,
      formCode: raw?.formCode ?? raw?.FormCode ?? raw?.code ?? raw?.Code ?? '',
      documentTypeId: raw?.documentTypeId ?? raw?.DocumentTypeId ?? raw?.documentTypeID ?? raw?.DocumentTypeID,
      description: raw?.description ?? raw?.Description,
      foreignDescription: raw?.foreignDescription ?? raw?.ForeignDescription,
      isPublished: raw?.isPublished ?? raw?.IsPublished,
      isActive: raw?.isActive ?? raw?.IsActive,
      isDeleted: raw?.isDeleted ?? raw?.IsDeleted,
      version: raw?.version ?? raw?.Version
    } as FormBuilderDto;
  }

  private normalizeDocumentTypes(types: any[]): DocumentType[] {
    return (types || []).map((raw: any) => ({
      ...raw,
      id: raw?.id ?? raw?.Id,
      name: raw?.name ?? raw?.Name ?? raw?.documentTypeName ?? raw?.DocumentTypeName ?? raw?.menuCaption ?? raw?.MenuCaption ?? '',
      code: raw?.code ?? raw?.Code ?? '',
      formBuilderId: raw?.formBuilderId ?? raw?.FormBuilderId,
      menuCaption: raw?.menuCaption ?? raw?.MenuCaption ?? '',
      menuOrder: raw?.menuOrder ?? raw?.MenuOrder ?? 0,
      parentMenuId: raw?.parentMenuId ?? raw?.ParentMenuId ?? null,
      isActive: raw?.isActive ?? raw?.IsActive,
      isDeleted: raw?.isDeleted ?? raw?.IsDeleted
    } as DocumentType));
  }

  private extractList(result: any): any[] {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.items)) return result.items;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.result)) return result.result;
    if (Array.isArray(result.results)) return result.results;
    if (result.data && Array.isArray(result.data.items)) return result.data.items;
    if (result.data && Array.isArray(result.data.data)) return result.data.data;
    return [];
  }

  private toBoolean(value: any, defaultValue: boolean): boolean {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return Boolean(value);
  }
}
