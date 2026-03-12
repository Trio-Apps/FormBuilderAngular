import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import {
  DocumentSeries,
  CreateDocumentSeriesDto,
  UpdateDocumentSeriesDto,
  DocumentSeriesResetPolicy,
  DocumentSeriesGenerateOn
} from '../../FormBuilder/form-builder/models/document-types.model';
import { ProjectDto } from '../../projects/models/project-dto.model';
import { ProjectsService } from '../../projects/services/projects.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-document-series-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogShellComponent,
    TableShellComponent
  ],
  templateUrl: './document-series-list.component.html',
  styleUrls: ['./document-series-list.component.scss'],
  providers: [ConfirmationService]
})
export class DocumentSeriesListComponent implements OnInit {
  loading = false;
  saving = false;
  loadingLookups = false;
  series: DocumentSeries[] = [];
  projects: ProjectDto[] = [];
  seriesForm!: FormGroup;
  showFormDialog = false;
  showSeriesGuide = false;
  editingSeries: DocumentSeries | null = null;
  readonly supportedSeriesPlaceholders = ['{PROJECT}', '{YYYY}', '{YY}', '{MM}', '{DD}', '{SEQ}'];
  readonly resetPolicyOptions: DocumentSeriesResetPolicy[] = ['None', 'Yearly', 'Monthly', 'Daily'];
  readonly generateOnOptions: DocumentSeriesGenerateOn[] = ['Submit', 'Approval'];
  readonly templatePresets = [
    {
      label: 'Project yearly',
      value: 'PR-{PROJECT}-{YYYY}-{SEQ}',
      description: 'Good for project-based yearly numbering.'
    },
    {
      label: 'Project short year',
      value: 'PR-{PROJECT}-{YY}-{SEQ}',
      description: 'Uses 2-digit year like 26.'
    },
    {
      label: 'Slash format',
      value: 'INV/{PROJECT}/{YYYY}/{SEQ}',
      description: 'Readable invoice-style format with slash separator.'
    },
    {
      label: 'Monthly compact',
      value: 'CNT-{YYYY}{MM}-{SEQ}',
      description: 'Groups numbers by year and month.'
    },
    {
      label: 'Daily request',
      value: 'REQ-{YYYY}{MM}{DD}-{SEQ}',
      description: 'Best when documents are created many times per day.'
    },
    {
      label: 'Project monthly',
      value: 'DOC-{PROJECT}-{YYYY}{MM}-{SEQ}',
      description: 'Project-based with monthly grouping.'
    }
  ];
  readonly customTemplateValue = '__CUSTOM__';

  constructor(
    private documentTypesService: DocumentTypesService,
    private projectsService: ProjectsService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.seriesForm = this.fb.group({
      projectId: [null, [Validators.required]],
      seriesName: ['', [Validators.required, Validators.maxLength(100)]],
      templatePreset: [this.templatePresets[0].value, [Validators.required]],
      template: ['', [Validators.required, Validators.maxLength(150)]],
      sequenceStart: [1, [Validators.required, Validators.min(1)]],
      sequencePadding: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      resetPolicy: ['Yearly' as DocumentSeriesResetPolicy, [Validators.required]],
      generateOn: ['Submit' as DocumentSeriesGenerateOn, [Validators.required]],
      nextNumber: [1, [Validators.required, Validators.min(1)]],
      isDefault: [false],
      isActive: [true]
    });

    this.seriesForm.get('templatePreset')?.valueChanges.subscribe(value => {
      this.onTemplatePresetChange(value);
    });
  }

  ngOnInit(): void {
    this.loadLookupsAndSeries();
  }

  loadLookupsAndSeries(): void {
    this.loadingLookups = true;
    this.projectsService.getActiveProjects().pipe(
      catchError(() => of([] as ProjectDto[]))
    ).subscribe({
      next: (projects) => {
        this.projects = projects || [];
        this.loadingLookups = false;
      },
      error: () => {
        this.loadingLookups = false;
      }
    });
    this.loadSeries();
  }

  loadSeries(): void {
    this.loading = true;
    this.documentTypesService.getAllDocumentSeries().subscribe({
      next: (data: DocumentSeries[]) => {
        this.series = data || [];
        this.loading = false;
      },
      error: () => {
        this.series = [];
        this.loading = false;
      }
    });
  }

  openCreateDialog(): void {
    this.editingSeries = null;
    this.showFormDialog = true;
    this.showSeriesGuide = false;
    this.seriesForm.reset({
      projectId: null,
      seriesName: '',
      templatePreset: this.templatePresets[0].value,
      template: this.templatePresets[0].value,
      sequenceStart: 1,
      sequencePadding: 3,
      resetPolicy: 'Yearly',
      generateOn: 'Submit',
      nextNumber: 1,
      isDefault: false,
      isActive: true
    });
  }

  openEditDialog(item: DocumentSeries): void {
    const currentTemplate = this.getSeriesTemplate(item);
    const matchedPreset = this.templatePresets.some(preset => preset.value === currentTemplate)
      ? currentTemplate
      : this.customTemplateValue;

    this.editingSeries = item;
    this.showFormDialog = true;
    this.showSeriesGuide = false;
    this.seriesForm.patchValue({
      projectId: item.projectId,
      seriesName: item.seriesName || item.seriesCode,
      templatePreset: matchedPreset,
      template: currentTemplate,
      sequenceStart: item.sequenceStart || item.nextNumber || 1,
      sequencePadding: item.sequencePadding || 3,
      resetPolicy: item.resetPolicy || 'Yearly',
      generateOn: item.generateOn || 'Submit',
      nextNumber: item.nextNumber || 1,
      isDefault: item.isDefault || false,
      isActive: item.isActive !== false
    });
  }

  closeDialog(): void {
    this.showFormDialog = false;
    this.editingSeries = null;
    this.showSeriesGuide = false;
    this.seriesForm.reset();
  }

  onTemplatePresetChange(value: string | null): void {
    if (!value || value === this.customTemplateValue) return;
    this.seriesForm.patchValue({ template: value });
  }

  insertPlaceholder(token: string): void {
    const templateControl = this.seriesForm.get('template');
    const currentValue = String(templateControl?.value || '');
    const nextValue = currentValue.includes(token)
      ? currentValue
      : `${currentValue}${currentValue ? '-' : ''}${token}`;

    templateControl?.setValue(nextValue);
    templateControl?.markAsTouched();
    templateControl?.updateValueAndValidity();
  }

  getSelectedPresetDescription(): string {
    const selectedPreset = String(this.seriesForm.get('templatePreset')?.value || '');
    if (selectedPreset === this.customTemplateValue) {
      return 'Build your own template using the supported placeholders below.';
    }

    return this.templatePresets.find(preset => preset.value === selectedPreset)?.description
      || 'Choose a preset or switch to custom for a fully manual template.';
  }

  getSequenceDigitsPreview(): string {
    const padding = Number(this.seriesForm.get('sequencePadding')?.value || 3);
    const safePadding = Math.max(1, padding);
    return `${safePadding} digit${safePadding === 1 ? '' : 's'} -> ${`${1}`.padStart(safePadding, '0')}`;
  }

  getLastIssuedSequence(): number {
    const nextNumber = Number(this.seriesForm.get('nextNumber')?.value || 1);
    const sequenceStart = Number(this.seriesForm.get('sequenceStart')?.value || 1);
    return Math.max(sequenceStart - 1, nextNumber - 1, 0);
  }

  getYearControlSummary(): string {
    const template = String(this.seriesForm.get('template')?.value || '');
    const resetPolicy = String(this.seriesForm.get('resetPolicy')?.value || 'None');

    if (template.includes('{YYYY}')) {
      return `Uses 4-digit year and resets ${resetPolicy.toLowerCase()}.`;
    }

    if (template.includes('{YY}')) {
      return `Uses 2-digit year and resets ${resetPolicy.toLowerCase()}.`;
    }

    return `No year token in template. Reset is still ${resetPolicy.toLowerCase()}.`;
  }

  getGenerateOnSummary(): string {
    const generateOn = String(this.seriesForm.get('generateOn')?.value || 'Submit');
    return generateOn === 'Approval'
      ? 'Number is reserved only after the document reaches approval generation.'
      : 'Number is generated as soon as the submit action is completed.';
  }

  getTemplateStructureSummary(): string {
    const template = String(this.seriesForm.get('template')?.value || '');
    if (!template) {
      return 'Template supports free prefix and suffix text around the placeholders.';
    }

    const startsWithToken = template.startsWith('{');
    const endsWithToken = template.endsWith('}');

    if (!startsWithToken && !endsWithToken) {
      return 'This template currently uses both custom prefix and custom suffix text.';
    }

    if (!startsWithToken) {
      return 'This template currently uses a custom prefix before the numbering tokens.';
    }

    if (!endsWithToken) {
      return 'This template currently uses a custom suffix after the numbering tokens.';
    }

    return 'This template is token-based only. Add text before or after tokens for prefix/suffix.';
  }

  saveSeries(): void {
    if (this.seriesForm.invalid) {
      this.seriesForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields.'
      });
      return;
    }

    const formData = this.seriesForm.value;
    const templateControl = this.seriesForm.get('template');
    const template = String(formData.template || '').trim();
    const unsupportedPlaceholders = this.getUnsupportedTemplatePlaceholders(template);

    templateControl?.setErrors(null);
    templateControl?.markAsTouched();

    if (unsupportedPlaceholders.length > 0) {
      templateControl?.setErrors({
        ...(templateControl.errors || {}),
        unsupportedPlaceholders: unsupportedPlaceholders
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: `Template contains unsupported placeholders: ${unsupportedPlaceholders.join(', ')}. Supported placeholders are ${this.supportedSeriesPlaceholders.join(', ')}.`
      });
      return;
    }

    if (!template.includes('{SEQ}')) {
      templateControl?.setErrors({
        ...(templateControl.errors || {}),
        missingSeq: true
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Template must include {SEQ} so the running sequence number can be generated.'
      });
      return;
    }

    this.saving = true;
    const sequenceStart = Number(formData.sequenceStart || 1);
    const sequencePadding = Number(formData.sequencePadding || 3);
    const nextNumber = Number(formData.nextNumber || sequenceStart || 1);
    const seriesCode = this.generateSeriesCodeForCompatibility(template, formData.seriesName);

    if (this.editingSeries?.id) {
      const updateDto: UpdateDocumentSeriesDto = {
        projectId: Number(formData.projectId),
        seriesName: String(formData.seriesName || '').trim(),
        template,
        seriesCode,
        sequenceStart,
        sequencePadding,
        resetPolicy: formData.resetPolicy,
        generateOn: formData.generateOn,
        nextNumber,
        isDefault: !!formData.isDefault,
        isActive: formData.isActive !== false
      };

      this.documentTypesService.updateDocumentSeries(this.editingSeries.id, updateDto).subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Series updated successfully.' });
          this.closeDialog();
          this.loadSeries();
        },
        error: (error: any) => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.message || 'Failed to update series.'
          });
        }
      });
      return;
    }

    const createDto: CreateDocumentSeriesDto = {
      projectId: Number(formData.projectId),
      seriesName: String(formData.seriesName || '').trim(),
      template,
      seriesCode,
      sequenceStart,
      sequencePadding,
      resetPolicy: formData.resetPolicy,
      generateOn: formData.generateOn,
      nextNumber,
      isDefault: !!formData.isDefault,
      isActive: formData.isActive !== false
    };

    this.documentTypesService.createDocumentSeries(createDto).subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Series created successfully.' });
        this.closeDialog();
        this.loadSeries();
      },
      error: (error: any) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.message || 'Failed to create series.'
        });
      }
    });
  }

  deleteSeries(item: DocumentSeries): void {
    if (!item.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.seriesName || item.seriesCode}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.documentTypesService.deleteDocumentSeries(item.id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Series deleted successfully.' });
            this.loadSeries();
          },
          error: (error: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error?.message || 'Failed to delete series.'
            });
          }
        });
      }
    });
  }

  toggleStatus(item: DocumentSeries): void {
    if (!item.id) return;
    const next = !(item.isActive === true);
    this.documentTypesService.toggleDocumentSeriesStatus(item.id, next).subscribe({
      next: (updatedSeries) => {
        item.isActive = updatedSeries?.isActive ?? next;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Series ${next ? 'activated' : 'deactivated'}.` });
        this.loadSeries();
      },
      error: () => {
        // Global error interceptor already shows the failure toast.
      }
    });
  }

  setDefault(item: DocumentSeries): void {
    if (!item.id) return;
    this.documentTypesService.setDocumentSeriesAsDefault(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Series set as default.' });
        this.loadSeries();
      },
      error: (error: any) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to set default.' });
      }
    });
  }

  getSeriesTemplate(item: DocumentSeries): string {
    return item.template || `${item.seriesCode}-{SEQ}`;
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : `#${projectId}`;
  }

  getSeriesPreview(item?: DocumentSeries): string {
    const now = new Date();
    const year = `${now.getFullYear()}`;
    const shortYear = year.slice(-2);
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');

    const targetTemplate = item
      ? this.getSeriesTemplate(item)
      : String(this.seriesForm.get('template')?.value || '');

    const projectId = Number(item?.projectId || this.seriesForm.get('projectId')?.value);
    const project = this.projects.find(p => p.id === projectId);
    const projectCode = (project?.code || project?.name || 'PROJECT').toUpperCase();

    const padding = Number(item?.sequencePadding || this.seriesForm.get('sequencePadding')?.value || 3);
    const seq = Number(item?.nextNumber || this.seriesForm.get('nextNumber')?.value || 1);
    const sequenceValue = `${seq}`.padStart(Math.max(1, padding), '0');

    return targetTemplate
      .split('{PROJECT}').join(projectCode)
      .split('{YYYY}').join(year)
      .split('{YY}').join(shortYear)
      .split('{MM}').join(month)
      .split('{DD}').join(day)
      .split('{SEQ}').join(sequenceValue);
  }

  private getUnsupportedTemplatePlaceholders(template: string): string[] {
    const matches = template.match(/\{[A-Z]+\}/g) || [];
    return [...new Set(matches)].filter(token => !this.supportedSeriesPlaceholders.includes(token));
  }

  private generateSeriesCodeForCompatibility(template: string, seriesName: string): string {
    const staticPart = template
      .replace(/\{[A-Z]+\}/g, '')
      .replace(/[^A-Za-z0-9\-_\/]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/_{2,}/g, '_')
      .replace(/\/{2,}/g, '/')
      .replace(/^[-_/]+|[-_/]+$/g, '');

    if (staticPart) {
      return staticPart.slice(0, 50);
    }

    return String(seriesName || 'SERIES').toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 50);
  }
}
