import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CopyToDocumentService } from '../../services/copy-to-document.service';
import { DocumentTypesService } from '../../services/document-types.service';
import { FormsService } from '../../services/forms.service';
import { FieldsService } from '../../services/fields.service';
import { GridService } from '../../services/grid.service';
import { TabsService } from '../../services/tabs.service';
import {
  CopyToDocumentActionDto,
  CopyToDocumentSetupDto,
  CreateCopyToDocumentSetupRequestDto,
  FormFieldDto,
  UpdateCopyToDocumentSetupRequestDto
} from '../../form-builder/models/form-builder-dto.model';
import { DocumentType } from '../../form-builder/models/document-types.model';
import { FormBuilderDto } from '../../form-builder/models/form-builder-dto.model';
import { FormGridDto } from '../../form-builder/models/grid-dto.model';
import { PermissionService } from '../../../../services/permission.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogShellComponent } from '../../../../shared/dialog-shell/dialog-shell.component';
import { TableShellComponent } from '../../../../shared/table-shell/table-shell.component';

type CopySetupTrigger = 'OnFormSubmitted' | 'OnApprovalCompleted' | 'OnDocumentApproved';

@Component({
  selector: 'app-copy-to-document',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    DialogShellComponent,
    TableShellComponent
  ],
  templateUrl: './copy-to-document.component.html',
  styleUrls: ['./copy-to-document.component.scss']
})
export class CopyToDocumentComponent implements OnInit {
  copyForm!: FormGroup;
  loading = false;
  showConfigDialog = false;
  editingSetupId: number | null = null;
  setupsLoading = false;
  deletingSetupId: number | null = null;
  setupLoadError: string | null = null;
  dialogErrorMessage: string | null = null;
  fieldMappingsCollapsed = false;
  gridMappingsCollapsed = false;
  metadataCollapsed = true;

  documentTypes: DocumentType[] = [];
  sourceForms: FormBuilderDto[] = [];
  targetForms: FormBuilderDto[] = [];
  sourceFields: FormFieldDto[] = [];
  targetFields: FormFieldDto[] = [];
  sourceGrids: FormGridDto[] = [];
  targetGrids: FormGridDto[] = [];
  setups: CopyToDocumentSetupDto[] = [];

  readonly triggerOptions: Array<{ value: CopySetupTrigger; label: string }> = [
    { value: 'OnFormSubmitted', label: 'On Form Submitted' },
    { value: 'OnApprovalCompleted', label: 'On Approval Completed' },
    { value: 'OnDocumentApproved', label: 'On Document Approved' }
  ];

  constructor(
    private fb: FormBuilder,
    private copyToDocumentService: CopyToDocumentService,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private fieldsService: FieldsService,
    private gridService: GridService,
    private tabsService: TabsService,
    private permissionService: PermissionService
  ) {
    this.initForm();
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

  get activeSetupsCount(): number {
    return this.setups.filter((setup) => this.toBoolean(setup.isActive, true)).length;
  }

  get inactiveSetupsCount(): number {
    return Math.max(this.setups.length - this.activeSetupsCount, 0);
  }

  ngOnInit(): void {
    this.permissionService.refreshPermissions().subscribe({
      next: () => {
        this.loadInitialData();
        this.loadSetups();
      },
      error: () => {
        this.loadInitialData();
        this.loadSetups();
      }
    });
  }

  initForm(): void {
    this.copyForm = this.fb.group({
      setupName: ['', [Validators.required, Validators.maxLength(200)]],
      executionOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      sourceDocumentTypeId: [null, Validators.required],
      sourceFormId: [null, Validators.required],
      targetDocumentTypeId: [null, Validators.required],
      targetFormId: [null, Validators.required],
      createNewDocument: [true],
      targetDocumentId: [null],
      initialStatus: ['Draft'],
      triggerEvent: ['OnFormSubmitted'],
      executeAutomatically: [true],
      copyCalculatedFields: [true],
      copyGridRows: [false],
      startWorkflow: [false],
      linkDocuments: [true],
      copyAttachments: [false],
      copyMetadata: [false],
      overrideTargetDefaults: [false],
      fieldMappings: this.fb.array([]),
      gridMappings: this.fb.array([]),
      metadataFields: this.fb.array([])
    });

    this.copyForm.get('createNewDocument')?.valueChanges.subscribe((value) => {
      this.syncTargetDocumentIdValidation(this.toBoolean(value, true));
    });

    this.copyForm.get('sourceDocumentTypeId')?.valueChanges.subscribe((value) => {
      this.copyForm.patchValue({ sourceFormId: null }, { emitEvent: false });
      this.sourceFields = [];
      this.sourceGrids = [];
      value ? this.loadSourceForms(Number(value)) : this.loadSourceForms();
    });

    this.copyForm.get('targetDocumentTypeId')?.valueChanges.subscribe((value) => {
      this.copyForm.patchValue({ targetFormId: null }, { emitEvent: false });
      this.targetFields = [];
      this.targetGrids = [];
      value ? this.loadTargetForms(Number(value)) : this.loadTargetForms();
    });

    this.copyForm.get('sourceFormId')?.valueChanges.subscribe((value) => {
      if (!value) {
        this.sourceFields = [];
        this.sourceGrids = [];
        return;
      }

      this.loadFieldsForForm(Number(value), 'source');
      this.loadGridsForForm(Number(value), 'source');
    });

    this.copyForm.get('targetFormId')?.valueChanges.subscribe((value) => {
      if (!value) {
        this.targetFields = [];
        this.targetGrids = [];
        return;
      }

      this.loadFieldsForForm(Number(value), 'target');
      this.loadGridsForForm(Number(value), 'target');
    });
  }

  loadDocumentTypes(): void {
    this.documentTypesService.getActiveDocumentTypes().subscribe({
      next: (types) => {
        const normalized = this.normalizeDocumentTypes(types || []);
        const active = normalized.filter((item) => this.toBoolean(item.isActive, true) && !this.toBoolean(item.isDeleted, false));
        this.documentTypes = active.length > 0 ? active : normalized;
        if (this.documentTypes.length === 0) {
          this.loadAllDocumentTypes();
        }
      },
      error: () => this.loadAllDocumentTypes()
    });
  }

  loadSourceForms(documentTypeId?: number): void {
    this.loadForms(documentTypeId, (items) => (this.sourceForms = items));
  }

  loadTargetForms(documentTypeId?: number): void {
    this.loadForms(documentTypeId, (items) => (this.targetForms = items));
  }

  loadFieldsForForm(formId: number, type: 'source' | 'target'): void {
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs) => {
        if (!tabs?.length) {
          this.assignFields(type, []);
          return;
        }

        const requests = tabs.map((tab) =>
          this.fieldsService.getFields(formId, tab.id).pipe(
            map((fields) => fields || []),
            catchError(() => of([]))
          )
        );

        forkJoin(requests).subscribe({
          next: (results) => this.assignFields(type, results.reduce<FormFieldDto[]>((all, item) => [...all, ...item], [])),
          error: () => this.assignFields(type, [])
        });
      },
      error: () => this.assignFields(type, [])
    });
  }

  loadGridsForForm(formId: number, type: 'source' | 'target'): void {
    this.gridService.getActiveGridsByFormBuilder(formId).subscribe({
      next: (response) => {
        const grids = response?.data || [];
        if (type === 'source') this.sourceGrids = grids;
        else this.targetGrids = grids;
      },
      error: () => {
        if (type === 'source') this.sourceGrids = [];
        else this.targetGrids = [];
      }
    });
  }

  loadSetups(): void {
    if (this.setupsLoading) return;
    this.setupsLoading = true;
    this.setupLoadError = null;

    this.copyToDocumentService.getSetups().subscribe({
      next: (items) => {
        this.setupsLoading = false;
        this.setups = (items || []).map((item) => this.normalizeSetup(item));
      },
      error: (error) => {
        this.setupsLoading = false;
        this.setups = [];
        // Missing setups endpoint or no saved items should not alarm the user on an empty screen.
        if (error?.status === 404) {
          this.setupLoadError = null;
          return;
        }

        this.setupLoadError = this.extractErrorMessage(error, 'Failed to load saved setups.');
      }
    });
  }

  openCreateSetupDialog(): void {
    this.editingSetupId = null;
    this.dialogErrorMessage = null;
    this.resetFormState();
    this.showConfigDialog = true;
  }

  openEditSetupDialog(setup: CopyToDocumentSetupDto): void {
    const item = this.normalizeSetup(setup);
    const config = item.config;

    this.editingSetupId = item.id;
    this.dialogErrorMessage = null;
    this.resetFormState();
    this.copyForm.patchValue(
      {
        setupName: item.setupName,
        executionOrder: item.executionOrder || 1,
        isActive: this.toBoolean(item.isActive, true),
        sourceDocumentTypeId: config.sourceDocumentTypeId || null,
        sourceFormId: config.sourceFormId || null,
        targetDocumentTypeId: config.targetDocumentTypeId || null,
        targetFormId: config.targetFormId || null,
        createNewDocument: this.toBoolean(config.createNewDocument, true),
        targetDocumentId: config.targetDocumentId ?? null,
        initialStatus: config.initialStatus || 'Draft',
        triggerEvent: config.triggerEvent || 'OnFormSubmitted',
        executeAutomatically: this.toBoolean((config as any).executeAutomatically ?? (config as any).ExecuteAutomatically, true),
        copyCalculatedFields: this.toBoolean(config.copyCalculatedFields, true),
        copyGridRows: this.toBoolean(config.copyGridRows, false),
        startWorkflow: this.toBoolean(config.startWorkflow, false),
        linkDocuments: this.toBoolean(config.linkDocuments, true),
        copyAttachments: this.toBoolean(config.copyAttachments, false),
        copyMetadata: this.toBoolean(config.copyMetadata, false),
        overrideTargetDefaults: this.toBoolean(config.overrideTargetDefaults, false)
      },
      { emitEvent: false }
    );

    this.syncTargetDocumentIdValidation(this.toBoolean(config.createNewDocument, true));
    this.applyFieldMappings(config.fieldMapping);
    this.applyGridMappings(config.gridMapping);
    this.applyMetadataFields(config.metadataFields);
    if (config.sourceDocumentTypeId) this.loadSourceForms(config.sourceDocumentTypeId);
    if (config.targetDocumentTypeId) this.loadTargetForms(config.targetDocumentTypeId);
    if (config.sourceFormId) {
      this.loadFieldsForForm(config.sourceFormId, 'source');
      this.loadGridsForForm(config.sourceFormId, 'source');
    }
    if (config.targetFormId) {
      this.loadFieldsForForm(config.targetFormId, 'target');
      this.loadGridsForForm(config.targetFormId, 'target');
    }

    this.showConfigDialog = true;
  }

  closeConfigDialog(): void {
    this.showConfigDialog = false;
    this.editingSetupId = null;
    this.dialogErrorMessage = null;
    this.resetFormState();
  }

  saveSetup(): void {
    if (this.copyForm.invalid) {
      this.copyForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.dialogErrorMessage = null;

    const request = this.buildSetupRequest();
    const operation = this.editingSetupId
      ? this.copyToDocumentService.updateSetup(this.editingSetupId, request as UpdateCopyToDocumentSetupRequestDto)
      : this.copyToDocumentService.createSetup(request);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.closeConfigDialog();
        this.loadSetups();
      },
      error: (error) => {
        this.loading = false;
        this.dialogErrorMessage = this.extractErrorMessage(error, 'Failed to save the setup.');
      }
    });
  }

  deleteSetup(setup: CopyToDocumentSetupDto): void {
    if (!window.confirm(`Delete setup "${setup.setupName}"?`)) return;
    this.deletingSetupId = setup.id;

    this.copyToDocumentService.deleteSetup(setup.id).subscribe({
      next: () => {
        this.deletingSetupId = null;
        this.setups = this.setups.filter((item) => item.id !== setup.id);
      },
      error: (error) => {
        this.deletingSetupId = null;
        this.setupLoadError = this.extractErrorMessage(error, 'Failed to delete the setup.');
      }
    });
  }

  addFieldMapping(sourceFieldCode: string | null = null, targetFieldCode: string | null = null): void {
    this.fieldMappingsArray.push(
      this.fb.group({
        sourceFieldCode: [sourceFieldCode, Validators.required],
        targetFieldCode: [targetFieldCode, Validators.required]
      })
    );
  }

  removeFieldMapping(index: number): void {
    this.fieldMappingsArray.removeAt(index);
  }

  addGridMapping(sourceGridCode: string | null = null, targetGridCode: string | null = null): void {
    this.gridMappingsArray.push(
      this.fb.group({
        sourceGridCode: [sourceGridCode, Validators.required],
        targetGridCode: [targetGridCode, Validators.required]
      })
    );
  }

  removeGridMapping(index: number): void {
    this.gridMappingsArray.removeAt(index);
  }

  addMetadataField(value = ''): void {
    this.metadataFieldsArray.push(this.fb.control(value, Validators.required));
  }

  removeMetadataField(index: number): void {
    this.metadataFieldsArray.removeAt(index);
  }

  getTriggerLabel(value?: string | null): string {
    return this.triggerOptions.find((item) => item.value === value)?.label || 'On Form Submitted';
  }

  getExecutionLabel(value: any): string {
    return this.toBoolean(value, true) ? 'Automatic' : 'Manual';
  }

  getMappingSummary(setup: CopyToDocumentSetupDto): string {
    const fieldCount = Object.keys(setup.config?.fieldMapping || {}).length;
    const gridCount = Object.keys(setup.config?.gridMapping || {}).length;
    const metadataCount = (setup.config?.metadataFields || []).length;
    const parts = [`${fieldCount} fields`, `${gridCount} grids`];
    if (metadataCount > 0) parts.push(`${metadataCount} metadata`);
    return parts.join(' / ');
  }

  private loadInitialData(): void {
    const canViewDocuments = this.permissionService.canViewDocuments() || this.permissionService.canManageDocuments();
    const canViewForms =
      this.permissionService.canViewForms() || this.permissionService.canViewAllForms() || this.permissionService.canManageForms();

    if (canViewDocuments) this.loadDocumentTypes();
    else this.documentTypes = [];

    if (canViewForms) {
      this.loadSourceForms();
      this.loadTargetForms();
    } else {
      this.sourceForms = [];
      this.targetForms = [];
    }
  }

  private loadAllDocumentTypes(): void {
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types) => {
        const normalized = this.normalizeDocumentTypes(types || []);
        const active = normalized.filter((item) => this.toBoolean(item.isActive, true) && !this.toBoolean(item.isDeleted, false));
        this.documentTypes = active.length > 0 ? active : normalized;
      },
      error: () => {
        this.documentTypes = [];
      }
    });
  }

  private loadForms(documentTypeId: number | undefined, assign: (items: FormBuilderDto[]) => void): void {
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        const allForms = this.normalizeFormsResult(result);
        let items = allForms.filter((item) => this.toBoolean(item.isPublished, true) && this.toBoolean(item.isActive, true));
        if (items.length === 0) items = allForms;
        if (documentTypeId && items.some((item) => item.documentTypeId !== undefined && item.documentTypeId !== null)) {
          items = items.filter((item) => Number(item.documentTypeId) === Number(documentTypeId));
        }
        assign(items);
      },
      error: () => assign([])
    });
  }

  private assignFields(type: 'source' | 'target', fields: FormFieldDto[]): void {
    if (type === 'source') this.sourceFields = fields;
    else this.targetFields = fields;
  }

  private resetFormState(): void {
    this.copyForm.reset(
      {
        setupName: '',
        executionOrder: 1,
        isActive: true,
        sourceDocumentTypeId: null,
        sourceFormId: null,
        targetDocumentTypeId: null,
        targetFormId: null,
        createNewDocument: true,
        targetDocumentId: null,
        initialStatus: 'Draft',
        triggerEvent: 'OnFormSubmitted',
        executeAutomatically: true,
        copyCalculatedFields: true,
        copyGridRows: false,
        startWorkflow: false,
        linkDocuments: true,
        copyAttachments: false,
        copyMetadata: false,
        overrideTargetDefaults: false
      },
      { emitEvent: false }
    );
    this.fieldMappingsArray.clear();
    this.gridMappingsArray.clear();
    this.metadataFieldsArray.clear();
    this.sourceFields = [];
    this.targetFields = [];
    this.sourceGrids = [];
    this.targetGrids = [];
    this.fieldMappingsCollapsed = false;
    this.gridMappingsCollapsed = false;
    this.metadataCollapsed = true;
    this.loadSourceForms();
    this.loadTargetForms();
    this.syncTargetDocumentIdValidation(true);
  }

  toggleOption(controlName: string): void {
    const control = this.copyForm.get(controlName);
    if (!control) return;
    control.setValue(!this.toBoolean(control.value, false));
    control.markAsDirty();
    control.markAsTouched();
  }

  toggleSection(section: 'field' | 'grid' | 'metadata'): void {
    if (section === 'field') {
      this.fieldMappingsCollapsed = !this.fieldMappingsCollapsed;
      return;
    }

    if (section === 'grid') {
      this.gridMappingsCollapsed = !this.gridMappingsCollapsed;
      return;
    }

    this.metadataCollapsed = !this.metadataCollapsed;
  }

  private syncTargetDocumentIdValidation(createNew: boolean): void {
    const control = this.copyForm.get('targetDocumentId');
    if (!control) return;
    if (createNew) {
      control.clearValidators();
      if (control.value !== null && control.value !== undefined) {
        control.setValue(null, { emitEvent: false });
      }
    } else {
      control.setValidators([Validators.required]);
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private applyFieldMappings(mapping?: { [key: string]: string }): void {
    this.fieldMappingsArray.clear();
    Object.entries(mapping || {}).forEach(([source, target]) => this.addFieldMapping(source, target));
  }

  private applyGridMappings(mapping?: { [key: string]: string }): void {
    this.gridMappingsArray.clear();
    Object.entries(mapping || {}).forEach(([source, target]) => this.addGridMapping(source, target));
  }

  private applyMetadataFields(items?: string[]): void {
    this.metadataFieldsArray.clear();
    (items || []).forEach((item) => this.addMetadataField(item));
  }

  private buildSetupRequest(): CreateCopyToDocumentSetupRequestDto {
    const value = this.copyForm.getRawValue();
    const config: CopyToDocumentActionDto = {
      sourceDocumentTypeId: Number(value.sourceDocumentTypeId),
      sourceFormId: Number(value.sourceFormId),
      targetDocumentTypeId: Number(value.targetDocumentTypeId),
      targetFormId: Number(value.targetFormId),
      createNewDocument: this.toBoolean(value.createNewDocument, true),
      initialStatus: value.initialStatus || 'Draft',
      triggerEvent: (value.triggerEvent || 'OnFormSubmitted') as CopySetupTrigger,
      executeAutomatically: this.toBoolean(value.executeAutomatically, true),
      fieldMapping: this.toMap(value.fieldMappings, 'sourceFieldCode', 'targetFieldCode'),
      gridMapping: this.toMap(value.gridMappings, 'sourceGridCode', 'targetGridCode'),
      copyCalculatedFields: this.toBoolean(value.copyCalculatedFields, true),
      copyGridRows: this.toBoolean(value.copyGridRows, false),
      startWorkflow: this.toBoolean(value.startWorkflow, false),
      linkDocuments: this.toBoolean(value.linkDocuments, true),
      copyAttachments: this.toBoolean(value.copyAttachments, false),
      copyMetadata: this.toBoolean(value.copyMetadata, false),
      overrideTargetDefaults: this.toBoolean(value.overrideTargetDefaults, false),
      metadataFields: (value.metadataFields || []).map((item: string) => (item || '').trim()).filter((item: string) => item)
    };

    if (!config.createNewDocument) {
      config.targetDocumentId = this.toNullableNumber(value.targetDocumentId) ?? undefined;
    }

    return {
      setupName: (value.setupName || '').trim(),
      isActive: this.toBoolean(value.isActive, true),
      executionOrder: Math.max(Number(value.executionOrder) || 1, 1),
      config
    };
  }

  private toMap(items: Array<Record<string, string>>, sourceKey: string, targetKey: string): { [key: string]: string } {
    return (items || []).reduce((result: { [key: string]: string }, item) => {
      const source = (item?.[sourceKey] || '').toString().trim();
      const target = (item?.[targetKey] || '').toString().trim();
      if (source && target) result[source] = target;
      return result;
    }, {});
  }

  private normalizeSetup(raw: any): CopyToDocumentSetupDto {
    const configRaw = raw?.config ?? raw?.Config ?? {};
    const normalizedTrigger = this.normalizeTriggerValue(configRaw?.triggerEvent ?? configRaw?.TriggerEvent);
    return {
      id: Number(raw?.id ?? raw?.Id ?? 0),
      ruleId: Number(raw?.ruleId ?? raw?.RuleId ?? 0),
      setupName: raw?.setupName ?? raw?.SetupName ?? '',
      sourceDocumentTypeName: raw?.sourceDocumentTypeName ?? raw?.SourceDocumentTypeName ?? '',
      sourceFormName: raw?.sourceFormName ?? raw?.SourceFormName ?? '',
      targetDocumentTypeName: raw?.targetDocumentTypeName ?? raw?.TargetDocumentTypeName ?? '',
      targetFormName: raw?.targetFormName ?? raw?.TargetFormName ?? '',
      config: {
        sourceDocumentTypeId: Number(configRaw?.sourceDocumentTypeId ?? configRaw?.SourceDocumentTypeId ?? 0),
        sourceFormId: Number(configRaw?.sourceFormId ?? configRaw?.SourceFormId ?? 0),
        targetDocumentTypeId: Number(configRaw?.targetDocumentTypeId ?? configRaw?.TargetDocumentTypeId ?? 0),
        targetFormId: Number(configRaw?.targetFormId ?? configRaw?.TargetFormId ?? 0),
        createNewDocument: this.toBoolean(configRaw?.createNewDocument ?? configRaw?.CreateNewDocument, true),
        targetDocumentId: this.toNullableNumber(configRaw?.targetDocumentId ?? configRaw?.TargetDocumentId) ?? undefined,
        initialStatus: 'Draft',
        triggerEvent: normalizedTrigger,
        executeAutomatically: this.toBoolean(configRaw?.executeAutomatically ?? configRaw?.ExecuteAutomatically, true),
        fieldMapping: this.normalizeMap(configRaw?.fieldMapping ?? configRaw?.FieldMapping),
        gridMapping: this.normalizeMap(configRaw?.gridMapping ?? configRaw?.GridMapping),
        copyCalculatedFields: this.toBoolean(configRaw?.copyCalculatedFields ?? configRaw?.CopyCalculatedFields, true),
        copyGridRows: this.toBoolean(configRaw?.copyGridRows ?? configRaw?.CopyGridRows, false),
        startWorkflow: this.toBoolean(configRaw?.startWorkflow ?? configRaw?.StartWorkflow, false),
        linkDocuments: this.toBoolean(configRaw?.linkDocuments ?? configRaw?.LinkDocuments, true),
        copyAttachments: this.toBoolean(configRaw?.copyAttachments ?? configRaw?.CopyAttachments, false),
        copyMetadata: this.toBoolean(configRaw?.copyMetadata ?? configRaw?.CopyMetadata, false),
        overrideTargetDefaults: this.toBoolean(configRaw?.overrideTargetDefaults ?? configRaw?.OverrideTargetDefaults, false),
        metadataFields: Array.isArray(configRaw?.metadataFields ?? configRaw?.MetadataFields)
          ? (configRaw?.metadataFields ?? configRaw?.MetadataFields).map((item: any) => String(item)).filter((item: string) => item.trim())
          : []
      },
      isActive: this.toBoolean(raw?.isActive ?? raw?.IsActive, true),
      executionOrder: Number(raw?.executionOrder ?? raw?.ExecutionOrder ?? 1),
      createdDate: raw?.createdDate ?? raw?.CreatedDate ?? '',
      updatedDate: raw?.updatedDate ?? raw?.UpdatedDate ?? null
    };
  }

  private normalizeMap(value: any): { [key: string]: string } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.entries(value).reduce((result: { [key: string]: string }, [key, item]) => {
      result[key] = String(item ?? '');
      return result;
    }, {});
  }

  private normalizeTriggerValue(value: any): CopySetupTrigger {
    const normalized = (value || '').toString().trim();
    if (normalized === 'OnApprovalCompleted' || normalized === 'OnDocumentApproved') {
      return normalized;
    }
    return 'OnFormSubmitted';
  }

  private normalizeFormsResult(result: any): FormBuilderDto[] {
    const items = this.extractList(result);
    return items.map((raw: any) => ({
      ...raw,
      id: raw?.id ?? raw?.Id,
      formName: raw?.formName ?? raw?.FormName ?? raw?.name ?? raw?.Name ?? '',
      documentTypeId: raw?.documentTypeId ?? raw?.DocumentTypeId ?? raw?.documentTypeID ?? raw?.DocumentTypeID,
      isPublished: raw?.isPublished ?? raw?.IsPublished,
      isActive: raw?.isActive ?? raw?.IsActive
    })) as FormBuilderDto[];
  }

  private normalizeDocumentTypes(types: any[]): DocumentType[] {
    return (types || []).map((raw: any) => ({
      ...raw,
      id: raw?.id ?? raw?.Id,
      name: raw?.name ?? raw?.Name ?? raw?.documentTypeName ?? raw?.DocumentTypeName ?? raw?.menuCaption ?? raw?.MenuCaption ?? '',
      isActive: raw?.isActive ?? raw?.IsActive,
      isDeleted: raw?.isDeleted ?? raw?.IsDeleted
    })) as DocumentType[];
  }

  private extractList(result: any): any[] {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.items)) return result.items;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.items)) return result.data.items;
    if (result.data && Array.isArray(result.data.data)) return result.data.data;
    return [];
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (error?.status === 0) {
      return 'Unable to reach the API. Make sure the backend is running and accessible on port 5000.';
    }

    if (error?.status === 401) {
      return 'Your session is not authorized to load Copy To Document setups right now. Log in again if this continues.';
    }

    if (error?.status === 404) {
      return 'Copy To Document setup management is not available in the current API response.';
    }

    const errors = error?.error?.data?.errors;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors).find((value) => Array.isArray(value) && value.length > 0) as string[] | undefined;
      if (first?.length) return first[0];
    }
    return error?.error?.message || error?.message || fallback;
  }

  private toNullableNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
