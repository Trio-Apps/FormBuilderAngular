import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DocumentSettingsService } from '../../services/document-settings.service';
import { FormsService } from '../../services/forms.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  DocumentSettings,
  CreateDocumentSettingsDto,
  UpdateDocumentSettingsDto,
  DocumentSeries,
  Project,
  CreateDocumentSeriesDto
} from '../../form-builder/models/document-settings.model';
import { FormBuilderDto } from '../../form-builder/models/form-builder-dto.model';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../../core/services/translation.service';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
// DropdownModule not needed - using native select
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-document-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DividerModule
  ],
  templateUrl: './document-settings.component.html',
  styleUrls: ['./document-settings.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class DocumentSettingsComponent implements OnInit, OnDestroy {
  formBuilderId!: number;
  form: FormBuilderDto | null = null;
  settings: DocumentSettings | null = null;
  loading = false;
  saving = false;
  private routeSubscription?: Subscription;

  // Form
  settingsForm!: FormGroup;
  projects: Project[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentSettingsService: DocumentSettingsService,
    private formsService: FormsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    public translationService: TranslationService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }

    this.routeSubscription = this.route.params.subscribe(params => {
      const newFormBuilderId = +params['id'];
      if (newFormBuilderId && newFormBuilderId !== this.formBuilderId) {
        this.formBuilderId = newFormBuilderId;
        this.loadForm();
        this.loadProjects();
        this.loadSettings();
      } else if (newFormBuilderId && !this.formBuilderId) {
        this.formBuilderId = newFormBuilderId;
        this.loadForm();
        this.loadProjects();
        this.loadSettings();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  initForm(): void {
    this.settingsForm = this.fb.group({
      documentName: ['', [Validators.required, Validators.maxLength(200)]],
      documentCode: ['', [Validators.required, Validators.maxLength(100)]],
      menuCaption: ['', [Validators.maxLength(100)]],
      menuOrder: [0, [Validators.min(0)]],
      parentMenuId: [null],
      isActive: [true],
      documentSeries: this.fb.array([])
    });
  }

  get documentSeriesFormArray(): FormArray {
    return this.settingsForm.get('documentSeries') as FormArray;
  }

  loadForm(): void {
    if (!this.formBuilderId) return;

    this.formsService.getFormById(this.formBuilderId).subscribe({
      next: (form) => {
        this.form = form;
      },
      error: (error) => {
        console.error('[DocumentSettings] Error loading form:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load form'
        });
      }
    });
  }

  loadProjects(): void {
    this.documentSettingsService.getActiveProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
      },
      error: (error) => {
        console.error('[DocumentSettings] Error loading projects:', error);
      }
    });
  }

  loadSettings(): void {
    if (!this.formBuilderId) return;

    this.loading = true;
    this.documentSettingsService.getDocumentSettings(this.formBuilderId).subscribe({
      next: (settings) => {
        this.settings = settings;
        if (settings) {
          this.populateForm(settings);
        } else {
          // No settings found - initialize with defaults
          this.resetForm();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('[DocumentSettings] Error loading settings:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load document settings'
        });
      }
    });
  }

  populateForm(settings: DocumentSettings): void {
    this.settingsForm.patchValue({
      documentName: settings.documentName || '',
      documentCode: settings.documentCode || '',
      menuCaption: settings.menuCaption || '',
      menuOrder: settings.menuOrder || 0,
      parentMenuId: settings.parentMenuId || null,
      isActive: settings.isActive !== false
    });

    // Clear existing series
    while (this.documentSeriesFormArray.length !== 0) {
      this.documentSeriesFormArray.removeAt(0);
    }

    // Add series
    if (settings.documentSeries && settings.documentSeries.length > 0) {
      settings.documentSeries.forEach(series => {
        this.addSeries(series);
      });
    }
  }

  resetForm(): void {
    this.settingsForm.patchValue({
      documentName: '',
      documentCode: '',
      menuCaption: '',
      menuOrder: 0,
      parentMenuId: null,
      isActive: true
    });

    // Clear series
    while (this.documentSeriesFormArray.length !== 0) {
      this.documentSeriesFormArray.removeAt(0);
    }
  }

  addSeries(existingSeries?: DocumentSeries): void {
    const seriesGroup = this.fb.group({
      projectId: [existingSeries?.projectId || null, Validators.required],
      seriesCode: [existingSeries?.seriesCode || '', [Validators.required, Validators.maxLength(50)]],
      nextNumber: [existingSeries?.nextNumber || 1, [Validators.required, Validators.min(1)]],
      isDefault: [existingSeries?.isDefault || false],
      isActive: [existingSeries?.isActive !== false]
    });

    this.documentSeriesFormArray.push(seriesGroup);

    // If this is set as default, unset others in the same project
    if (seriesGroup.get('isDefault')?.value) {
      this.handleDefaultSeriesChange(this.documentSeriesFormArray.length - 1);
    }
  }

  removeSeries(index: number): void {
    this.documentSeriesFormArray.removeAt(index);
  }

  onDefaultSeriesChange(index: number): void {
    this.handleDefaultSeriesChange(index);
  }

  handleDefaultSeriesChange(index: number): void {
    const currentSeries = this.documentSeriesFormArray.at(index);
    const isDefault = currentSeries.get('isDefault')?.value;
    const currentProjectId = currentSeries.get('projectId')?.value;

    if (isDefault && currentProjectId) {
      // Unset default for other series in the same project
      this.documentSeriesFormArray.controls.forEach((control, i) => {
        if (i !== index) {
          const projectId = control.get('projectId')?.value;
          if (projectId === currentProjectId) {
            control.get('isDefault')?.setValue(false);
          }
        }
      });
    }
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched(this.settingsForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields'
      });
      return;
    }

    const formValue = this.settingsForm.value;

    // Validate that each project has at most one default series
    const seriesByProject = new Map<number, number[]>();
    formValue.documentSeries.forEach((series: any, index: number) => {
      if (series.projectId) {
        if (!seriesByProject.has(series.projectId)) {
          seriesByProject.set(series.projectId, []);
        }
        seriesByProject.get(series.projectId)!.push(index);
      }
    });

    let hasMultipleDefaults = false;
    seriesByProject.forEach((indices, projectId) => {
      const defaultCount = indices.filter(i => formValue.documentSeries[i].isDefault).length;
      if (defaultCount > 1) {
        hasMultipleDefaults = true;
      }
    });

    if (hasMultipleDefaults) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Each project can have only one default series'
      });
      return;
    }

    this.saving = true;

    const settingsDto: CreateDocumentSettingsDto = {
      formBuilderId: this.formBuilderId,
      documentName: formValue.documentName.trim(),
      documentCode: formValue.documentCode.trim(),
      menuCaption: formValue.menuCaption?.trim() || undefined,
      menuOrder: formValue.menuOrder || 0,
      parentMenuId: formValue.parentMenuId || null,
      isActive: formValue.isActive !== false,
      documentSeries: formValue.documentSeries.map((series: any) => ({
        projectId: series.projectId,
        seriesCode: series.seriesCode.trim(),
        nextNumber: series.nextNumber || 1,
        isDefault: series.isDefault || false,
        isActive: series.isActive !== false
      }))
    };

    this.documentSettingsService.saveDocumentSettings(settingsDto).subscribe({
      next: (savedSettings) => {
        this.settings = savedSettings;
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Document settings saved successfully'
        });
        // Reload settings to ensure consistency
        setTimeout(() => {
          this.loadSettings();
        }, 500);
      },
      error: (error) => {
        console.error('[DocumentSettings] Error saving settings:', error);
        this.saving = false;
        
        let errorMessage = 'Failed to save document settings';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error?.title) {
          errorMessage = error.error.title;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 7000
        });
      }
    });
  }

  deleteSettings(): void {
    if (!this.settings) return;

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete these document settings?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.documentSettingsService.deleteDocumentSettings(this.formBuilderId).subscribe({
          next: () => {
            this.settings = null;
            this.resetForm();
            this.loading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Document settings deleted successfully'
            });
          },
          error: (error) => {
            console.error('[DocumentSettings] Error deleting settings:', error);
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete document settings'
            });
          }
        });
      }
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? (project.projectName || project.projectCode || `Project ${projectId}`) : `Project ${projectId}`;
  }

  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
    localStorage.setItem('adminLanguagePreference', lang);
  }
}

