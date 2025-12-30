import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSubmissionsService, CreateFormSubmissionDto, FormSubmissionDto } from '../services/form-submissions.service';
import { FormSubmissionValuesService, BulkFormSubmissionValuesDto, CreateFormSubmissionValueDto } from '../services/form-submission-values.service';
import { FormSubmissionAttachmentsService, CreateFormSubmissionAttachmentDto } from '../services/form-submission-attachments.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType, DocumentSeries } from '../../FormBuilder/form-builder/models/document-types.model';
import { FormsService } from '../../FormBuilder/services/forms.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { FormBuilderDto, FormTabDto, FormFieldDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../auth/auth.service';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-form-submission-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    CheckboxModule
  ],
  templateUrl: './form-submission-create.component.html',
  styleUrls: ['./form-submission-create.component.scss'],
  providers: [MessageService]
})
export class FormSubmissionCreateComponent implements OnInit, OnDestroy {
  documentTypeId!: number;
  documentType: DocumentType | null = null;

  // Forms, Tabs, Fields
  forms: FormBuilderDto[] = [];
  tabs: FormTabDto[] = [];
  fields: FormFieldDto[] = [];
  selectedFormId: number | null = null;
  selectedTabId: number | null = null;
  activeTabIndex = 0;

  // Forms
  submissionForm!: FormGroup;
  fieldsForm!: FormGroup;
  fieldFiles: { [fieldId: number]: File[] } = {};

  // Document Series
  documentSeries: DocumentSeries[] = [];

  // Loading States
  loading = {
    documentType: false,
    create: false,
    series: false,
    forms: false,
    tabs: false,
    fields: false,
    uploading: false
  };

  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formSubmissionsService: FormSubmissionsService,
    private formSubmissionValuesService: FormSubmissionValuesService,
    private formSubmissionAttachmentsService: FormSubmissionAttachmentsService,
    private documentTypesService: DocumentTypesService,
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    public translationService: TranslationService,
    private authService: AuthService
  ) {
    // Submission form
    this.submissionForm = this.fb.group({
      formBuilderId: [null], // Will be set from documentType
      tabId: [null, [Validators.required]],
      status: ['Draft']
    });

    // Fields form
    this.fieldsForm = this.fb.group({});
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }

    // Get documentTypeId from route
    this.routeSubscription = this.route.params.subscribe(params => {
      this.documentTypeId = +params['documentTypeId'];
      if (this.documentTypeId && !isNaN(this.documentTypeId)) {
        this.loadDocumentType();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid Document Type ID'
        });
        this.router.navigate(['/document-types']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadDocumentType(): void {
    this.loading.documentType = true;
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentType = types.find(t => t.id === this.documentTypeId) || null;
        this.loadDocumentSeries();
        // Set formBuilderId from documentType
        if (this.documentType?.formBuilderId) {
          this.submissionForm.patchValue({ formBuilderId: this.documentType.formBuilderId });
          this.loadForms();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Document type does not have a form associated with it'
          });
          this.loading.documentType = false;
          this.cdr.detectChanges();
        }
        this.loading.documentType = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading document type:', error);
        this.loading.documentType = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDocumentSeries(): void {
    if (!this.documentTypeId) return;
    
    this.loading.series = true;
    this.documentTypesService.getDocumentSeriesByDocumentTypeId(this.documentTypeId).subscribe({
      next: (series: DocumentSeries[]) => {
        this.documentSeries = series.filter(s => s.isActive);
        this.loading.series = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading document series:', error);
        this.documentSeries = [];
        this.loading.series = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadForms(): void {
    if (!this.documentType?.formBuilderId) {
      return;
    }

    this.loading.forms = true;
    this.formsService.getForms(1, 1000).subscribe({
      next: (result) => {
        this.forms = (result.items || []).filter(f => f.isPublished && f.isActive);
        // Auto-select form from documentType
        const formId = this.documentType!.formBuilderId!;
        const formExists = this.forms.some(f => f.id === formId);
        if (formExists) {
          this.onFormSelected(formId);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Form associated with this document type is not available'
          });
        }
        this.loading.forms = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.forms = [];
        this.loading.forms = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFormSelected(formId: number | null): void {
    if (!formId || isNaN(formId) || formId <= 0) {
      this.selectedFormId = null;
      this.selectedTabId = null;
      this.tabs = [];
      this.fields = [];
      this.fieldFiles = {};
      this.fieldsForm = this.fb.group({});
      return;
    }
    this.selectedFormId = formId;
    this.selectedTabId = null;
    this.fields = [];
    this.fieldFiles = {};
    this.fieldsForm = this.fb.group({});
    this.loadTabs(formId);
  }

  loadTabs(formId: number): void {
    if (!formId || isNaN(formId) || formId <= 0) {
      this.tabs = [];
      return;
    }

    this.loading.tabs = true;
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs: FormTabDto[]) => {
        this.tabs = tabs.filter(t => t.isActive).sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
        // Auto-select first tab
        if (this.tabs.length > 0) {
          this.activeTabIndex = 0;
          this.onTabSelected(this.tabs[0].id || null);
        }
        this.loading.tabs = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading tabs:', error);
        this.tabs = [];
        this.loading.tabs = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTabSelected(tabId: number | null): void {
    if (!tabId || isNaN(tabId) || tabId <= 0) {
      this.selectedTabId = null;
      this.fields = [];
      this.fieldFiles = {};
      this.fieldsForm = this.fb.group({});
      this.loading.fields = false;
      return;
    }

    this.selectedTabId = tabId;
    this.submissionForm.patchValue({ tabId: tabId });
    this.loadFields(tabId);
  }

  setActiveTab(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.activeTabIndex = index;
      const tab = this.tabs[index];
      this.onTabSelected(tab.id || null);
      this.cdr.detectChanges();
    }
  }

  getTabName(tab: FormTabDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && tab.foreignTabName) {
      return tab.foreignTabName;
    }
    return tab.tabName || '';
  }

  getFormName(formId: number): string {
    const form = this.forms.find(f => f.id === formId);
    if (!form) return '';
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && form.foreignFormName) {
      return form.foreignFormName;
    }
    return form.formName || '';
  }

  loadFields(tabId: number): void {
    if (!this.selectedFormId || !tabId) {
      this.loading.fields = false;
      return;
    }

    this.loading.fields = true;
    this.fieldsService.getFields(this.selectedFormId, tabId).subscribe({
      next: (fields: FormFieldDto[]) => {
        this.fields = fields.filter(f => f.isActive).sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
        
        // Build dynamic form for fields
        const formControls: { [key: string]: any } = {};
        this.fields.forEach(field => {
          if (field.id) {
            const fieldKey = `field_${field.id}`;
            if (!this.isFileField(field)) {
              const validators: any[] = [];
              if (field.isMandatory) {
                validators.push(Validators.required);
              }
              
              const fieldType = this.getFieldType(field);
              let defaultValue: any = field.defaultValueJson || null;
              
              if (fieldType === 'checkbox') {
                defaultValue = [];
              } else if (fieldType === 'boolean') {
                defaultValue = (field.defaultValueJson === 'true' || field.defaultValueJson === 'True') ? true : false;
              }
              
              formControls[fieldKey] = [defaultValue, validators];
            }
          }
        });
        this.fieldsForm = this.fb.group(formControls);
        
        this.loading.fields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.fields = [];
        this.loading.fields = false;
        this.cdr.detectChanges();
      }
    });
  }

  isFileField(field: FormFieldDto): boolean {
    const typeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase();
    return typeName.includes('file') || typeName.includes('attachment') || typeName.includes('image');
  }

  getFieldType(field: FormFieldDto): string {
    const fieldTypeName = (field.fieldTypeName || field.fieldType?.typeName || '').toLowerCase().trim();
    const ft = field.fieldType;
    const hasOptions = ft?.hasOptions ?? (field.fieldOptions && field.fieldOptions.length > 0);
    const allowMultiple = ft?.allowMultiple ?? false;

    if (fieldTypeName === 'grid') return 'grid';
    if (fieldTypeName === 'textbox' || fieldTypeName.includes('text box')) return 'string';
    if (fieldTypeName === 'textarea') return 'textarea';
    if (fieldTypeName === 'number') return 'number';
    if (fieldTypeName === 'date') return 'date';
    if (fieldTypeName === 'email') return 'email';
    if (fieldTypeName === 'boolean' || fieldTypeName === 'switch') return 'boolean';
    if (this.isFileField(field)) return 'file';

    if (hasOptions || (field.fieldOptions && field.fieldOptions.length > 0)) {
      if (fieldTypeName.includes('checkbox') || allowMultiple === true) return 'checkbox';
      if (fieldTypeName.includes('radio')) return 'radio';
      return 'select';
    }

    return 'string';
  }

  getFieldOptions(field: FormFieldDto): any[] {
    if (!field.fieldOptions || field.fieldOptions.length === 0) return [];
    return field.fieldOptions.filter(opt => opt.isActive !== false);
  }

  getFieldPlaceholder(field: FormFieldDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && field.foreignPlaceholder) {
      return field.foreignPlaceholder;
    }
    return field.placeholder || '';
  }

  getFieldHintText(field: FormFieldDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && field.foreignHintText) {
      return field.foreignHintText;
    }
    return field.hintText || '';
  }

  getFieldDisplayName(field: FormFieldDto): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && field.foreignFieldName) {
      return field.foreignFieldName;
    }
    return field.fieldName || '';
  }

  isRequired(field: FormFieldDto): boolean {
    return field.isMandatory === true;
  }

  onFileSelected(event: any, field: FormFieldDto): void {
    if (!field.id) return;
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      this.fieldFiles[field.id] = files;
      this.cdr.detectChanges();
    }
  }

  removeFile(fieldId: number, index: number): void {
    if (this.fieldFiles[fieldId]) {
      this.fieldFiles[fieldId].splice(index, 1);
      if (this.fieldFiles[fieldId].length === 0) {
        delete this.fieldFiles[fieldId];
      }
      this.cdr.detectChanges();
    }
  }

  getFieldFiles(fieldId: number): File[] {
    return this.fieldFiles[fieldId] || [];
  }

  onCheckboxChange(field: FormFieldDto, optionValue: string, event: any): void {
    if (!field.id) return;
    const fieldKey = `field_${field.id}`;
    const control = this.fieldsForm.get(fieldKey);
    if (!control) return;
    
    const currentValue = control.value || [];
    let newValue: any[] = Array.isArray(currentValue) ? [...currentValue] : [];
    
    if (event.target.checked) {
      if (!newValue.includes(optionValue)) {
        newValue.push(optionValue);
      }
    } else {
      const index = newValue.indexOf(optionValue);
      if (index > -1) {
        newValue.splice(index, 1);
      }
    }
    
    control.setValue(newValue);
    control.markAsTouched();
  }

  getAllowedExtensions(field: FormFieldDto): string[] {
    // Extract from field configuration or return default
    return ['.png', '.jpg', '.jpeg', '.pdf'];
  }

  getMaxFileSize(field: FormFieldDto): number {
    // Extract from field configuration or return default (10 MB)
    return 10 * 1024 * 1024;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatAllowedExtensions(extensions: string[]): string {
    return extensions.map(ext => ext.toUpperCase()).join(', ');
  }

  getAcceptedFileTypes(field: FormFieldDto): string {
    const extensions = this.getAllowedExtensions(field);
    return extensions.join(',');
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/document-types', this.documentTypeId, 'submissions']);
  }

  saveSubmission(): void {
    if (this.submissionForm.invalid) {
      this.markFormGroupTouched(this.submissionForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    if (this.fields.length > 0 && this.fieldsForm.invalid) {
      this.markFormGroupTouched(this.fieldsForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    // Get formBuilderId from documentType (fixed value)
    if (!this.documentType?.formBuilderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Document type does not have a form associated with it'
      });
      return;
    }

    // Get default series (fixed value)
    if (this.documentSeries.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No document series available. Please create a series first.'
      });
      return;
    }

    const defaultSeries = this.documentSeries.find(s => s.isDefault) || this.documentSeries[0];
    if (!defaultSeries || !defaultSeries.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No document series available'
      });
      return;
    }

    const userId = this.authService.userName();
    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not found. Please login again.'
      });
      return;
    }

    const formData = this.submissionForm.getRawValue();
    const createDto: CreateFormSubmissionDto = {
      formBuilderId: this.documentType.formBuilderId, // Fixed value - from documentType
      documentTypeId: this.documentTypeId,
      seriesId: defaultSeries.id, // Fixed value - use default series
      submittedByUserId: userId,
      status: formData.status || 'Draft'
    };

    this.loading.create = true;
    this.formSubmissionsService.createSubmission(createDto).subscribe({
      next: (submission: FormSubmissionDto) => {
        this.saveSubmissionData(submission.id);
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error creating submission:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create submission';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  saveSubmissionData(submissionId: number): void {
    const fieldValues: CreateFormSubmissionValueDto[] = [];
    const attachments: CreateFormSubmissionAttachmentDto[] = [];

    // Process field values
    this.fields.forEach(field => {
      if (!field.id) return;
      const fieldKey = `field_${field.id}`;
      const fieldValue = this.fieldsForm.get(fieldKey)?.value;

      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        const valueDto: CreateFormSubmissionValueDto = {
          submissionId: submissionId,
          fieldId: field.id,
          fieldCode: field.fieldCode
        };

        const fieldType = this.getFieldType(field);
        switch (fieldType) {
          case 'number':
            valueDto.valueNumber = Number(fieldValue);
            break;
          case 'date':
            valueDto.valueDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
            break;
          case 'boolean':
            valueDto.valueBool = Boolean(fieldValue);
            break;
          case 'checkbox':
            if (Array.isArray(fieldValue)) {
              valueDto.valueJson = JSON.stringify(fieldValue);
            } else {
              valueDto.valueString = String(fieldValue);
            }
            break;
          default:
            if (Array.isArray(fieldValue)) {
              valueDto.valueJson = JSON.stringify(fieldValue);
            } else {
              valueDto.valueString = String(fieldValue);
            }
            break;
        }

        fieldValues.push(valueDto);
      }
    });

    // Process file fields
    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        files.forEach(file => {
          attachments.push({
            submissionId: submissionId,
            fieldId: fieldId,
            fieldCode: field.fieldCode,
            fileName: file.name,
            filePath: '',
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream'
          });
        });
      }
    });

    // Save field values and upload files
    const saveObservables: any[] = [];

    if (fieldValues.length > 0) {
      const bulkDto: BulkFormSubmissionValuesDto = {
        submissionId: submissionId,
        values: fieldValues
      };
      saveObservables.push(this.formSubmissionValuesService.createBulk(bulkDto));
    }

    Object.keys(this.fieldFiles).forEach(fieldIdStr => {
      const fieldId = Number(fieldIdStr);
      const files = this.fieldFiles[fieldId];
      const field = this.fields.find(f => f.id === fieldId);

      if (field && files && files.length > 0) {
        files.forEach(file => {
          saveObservables.push(
            this.formSubmissionAttachmentsService.uploadFile(file, submissionId, fieldId, field.fieldCode)
          );
        });
      }
    });

    if (saveObservables.length === 0) {
      this.loading.create = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Form submission created successfully'
      });
      setTimeout(() => this.goBack(), 1000);
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: () => {
        this.loading.create = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Form submission created successfully'
        });
        setTimeout(() => this.goBack(), 1000);
      },
      error: (error: any) => {
        this.loading.create = false;
        console.error('Error saving submission data:', error);
        let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to save submission data';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }
}
