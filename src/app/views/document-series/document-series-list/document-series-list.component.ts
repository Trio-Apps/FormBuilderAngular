import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
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
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './document-series-list.component.html',
  styleUrls: ['./document-series-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class DocumentSeriesListComponent implements OnInit {
  loading = false;
  saving = false;
  loadingLookups = false;
  series: DocumentSeries[] = [];
  projects: ProjectDto[] = [];
  seriesForm!: FormGroup;
  showFormDialog = false;
  editingSeries: DocumentSeries | null = null;
  readonly supportedSeriesPlaceholders = ['{PROJECT}', '{YYYY}', '{MM}', '{DD}', '{SEQ}'];
  readonly resetPolicyOptions: DocumentSeriesResetPolicy[] = ['None', 'Yearly', 'Monthly', 'Daily'];
  readonly generateOnOptions: DocumentSeriesGenerateOn[] = ['Submit', 'Approval'];
  readonly templatePresets = [
    'PR-{PROJECT}-{YYYY}-{SEQ}',
    'INV-{PROJECT}-{YYYY}-{SEQ}',
    'INV/{PROJECT}/{YYYY}/{SEQ}',
    'CNT-{YYYY}{MM}-{SEQ}',
    'REQ-{YYYY}{MM}{DD}-{SEQ}',
    'DOC-{PROJECT}-{YYYY}{MM}-{SEQ}'
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
      templatePreset: [this.templatePresets[0], [Validators.required]],
      template: ['', [Validators.required, Validators.maxLength(150)]],
      sequenceStart: [1, [Validators.required, Validators.min(1)]],
      sequencePadding: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      resetPolicy: ['Yearly' as DocumentSeriesResetPolicy, [Validators.required]],
      generateOn: ['Submit' as DocumentSeriesGenerateOn, [Validators.required]],
      nextNumber: [1, [Validators.required, Validators.min(1)]],
      isDefault: [false],
      isActive: [true]
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
    this.seriesForm.reset({
      projectId: null,
      seriesName: '',
      templatePreset: this.templatePresets[0],
      template: this.templatePresets[0],
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
    const matchedPreset = this.templatePresets.includes(currentTemplate)
      ? currentTemplate
      : this.customTemplateValue;

    this.editingSeries = item;
    this.showFormDialog = true;
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
    this.seriesForm.reset();
  }

  onTemplatePresetChange(value: string | null): void {
    if (!value || value === this.customTemplateValue) return;
    this.seriesForm.patchValue({ template: value });
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
    const template = String(formData.template || '').trim();
    const unsupportedPlaceholders = this.getUnsupportedTemplatePlaceholders(template);

    if (unsupportedPlaceholders.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: `Unsupported placeholders: ${unsupportedPlaceholders.join(', ')}`
      });
      return;
    }

    if (!template.includes('{SEQ}')) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Template must include {SEQ}.'
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
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Series ${next ? 'activated' : 'deactivated'}.` });
        this.loadSeries();
      },
      error: (error: any) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to change status.' });
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
      .split('{MM}').join(month)
      .split('{DD}').join(day)
      .split('{SEQ}').join(sequenceValue);
  }

  private getUnsupportedTemplatePlaceholders(template: string): string[] {
    const matches = template.match(/\{[A-Z]+\}/g) || [];
    return [...new Set(matches)].filter(token => !this.supportedSeriesPlaceholders.includes(token));
  }

  private generateSeriesCodeForCompatibility(template: string, seriesName: string): string {
    const staticPart = template.replace(/\{[A-Z]+\}/g, '').replace(/[^A-Za-z0-9\-_\/]/g, '');
    if (staticPart) {
      return staticPart.slice(0, 50);
    }
    return String(seriesName || 'SERIES').toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 50);
  }
}
