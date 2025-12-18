import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldOptionsService } from '../../FormBuilder/services/field-options.service';
import { FormFieldDto, FieldTypeDto, UpdateFormFieldDto, CreateFormFieldDto, FieldOptionDto, CreateFieldOptionDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ButtonModule,
    RouterLink
  ],
  templateUrl: './fields-list.component.html',
  styleUrls: ['./fields-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FieldsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  tabId!: number;
  formBuilderId!: number;
  tabName: string = '';

  // Data Arrays
  fields: FormFieldDto[] = [];
  fieldTypes: FieldTypeDto[] = [];
  filteredFieldTypes: FieldTypeDto[] = [];
  regexOptions = [
    { label: 'No preset (custom)', value: '', message: '' },
    { label: 'Email', value: '^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$', message: 'Please enter a valid email address' },
    { label: 'Phone (digits, +, -, spaces)', value: '^[0-9+\\-()\\s]{6,}$', message: 'Please enter a valid phone number' },
    { label: 'URL', value: '^(https?:\\/\\/)?([\\w-]+\\.)+[\\w-]{2,}(\\/\\S*)?$', message: 'Please enter a valid URL' },
    { label: 'Digits only', value: '^\\d+$', message: 'Please enter digits only' },
    { label: 'Letters only', value: '^[A-Za-z]+$', message: 'Please enter letters only' },
    { label: 'Alphanumeric', value: '^[A-Za-z0-9]+$', message: 'Please enter alphanumeric characters only' }
  ];

  // Loading States
  loading = {
    fields: false,
    save: false,
    delete: false,
    fieldTypes: false
  };

  // Field Modal
  showFieldModal = false;
  showFieldSettingsModal = false;
  editingField: FormFieldDto | null = null;
  draggingFieldIndex: number | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en'; // Language toggle for input fields

  // Reactive Form
  fieldForm: FormGroup;

  // Field Type Filter
  searchTerm = '';

  // Selected Field for Context Actions
  selectedField: FormFieldDto | null = null;

  // Subscriptions
  private routeSub!: Subscription;
  private parentRouteSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private fieldsService: FieldsService,
    private tabsService: TabsService,
    private fieldOptionsService: FieldOptionsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    // Initialize the form
    this.fieldForm = this.fb.group({
      tabId: ['', Validators.required],
      fieldName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      foreignFieldName: ['', [Validators.maxLength(200)]], // Arabic field name
      fieldCode: ['', [Validators.required, Validators.pattern('^[A-Za-z_][A-Za-z0-9_]*$'), Validators.maxLength(100)]],
      fieldTypeId: ['', Validators.required],
      placeholder: ['', Validators.maxLength(200)],
      foreignPlaceholder: ['', Validators.maxLength(200)], // Arabic placeholder
      hintText: ['', Validators.maxLength(500)],
      foreignHintText: ['', Validators.maxLength(500)], // Arabic hint text
      fieldOrder: [1, [Validators.required, Validators.min(1)]],
      isMandatory: [true],
      isEditable: [true],
      isVisible: [true],
      isActive: [true],
      defaultValue: [''],
      defaultValueJson: [''],
      regexPattern: [''],
      validationMessage: ['', Validators.maxLength(500)],
      foreignValidationMessage: ['', Validators.maxLength(500)], // Arabic validation message
      minValue: [null],
      maxValue: [null],
      fieldOptions: this.fb.array([])
    });

    // Watch fieldTypeId changes to show/hide options section
    this.fieldForm.get('fieldTypeId')?.valueChanges.subscribe(fieldTypeId => {
      this.onFieldTypeChange(fieldTypeId);
    });

    // Watch regexPattern changes to auto-update validation message
    this.fieldForm.get('regexPattern')?.valueChanges.subscribe(pattern => {
      this.onRegexPatternChange(pattern);
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      this.tabId = +params['tabId'];

      if (this.tabId) {
        // Get formBuilderId from tab data first, then load fields
        this.loadTabAndFormId();
        this.loadFieldTypes();
      }
    });

    // Set tabId in form
    this.fieldForm.patchValue({ tabId: this.tabId });
  }

  loadTabAndFormId(): void {
    if (!this.tabId) return;
    
    this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
          this.tabName = tab.tabName || '';
          // Load fields with correct formBuilderId
          this.loadFields();
        } else {
          // Fallback: try parent route
          this.getFormIdFromParentRoute();
        }
      },
      error: () => {
        // If tab not found, try to get formId from parent route or use default
        this.getFormIdFromParentRoute();
      }
    });
  }

  private getFormIdFromParentRoute(): void {
    // Try to get formId from parent route (snapshot first for immediate value)
    let parent = this.route.parent;
    let depth = 0;
    
    while (parent && depth < 3) {
      const snapshot = parent.snapshot;
      if (snapshot && snapshot.params && snapshot.params['formId']) {
        this.formBuilderId = +snapshot.params['formId'];
        this.loadFields();
        return;
      }
      parent = parent.parent;
      depth++;
    }
    
    // If not found in snapshot, try subscription (async)
    parent = this.route.parent;
    depth = 0;
    while (parent && depth < 3) {
      this.parentRouteSub = parent.params.subscribe(parentParams => {
        if (parentParams['formId'] && !this.formBuilderId) {
          this.formBuilderId = +parentParams['formId'];
          this.loadFields();
        }
      });
      parent = parent.parent;
      depth++;
    }
    
    // Default fallback if not found
    if (!this.formBuilderId) {
      this.formBuilderId = 1;
      this.loadFields();
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.parentRouteSub) {
      this.parentRouteSub.unsubscribe();
    }
  }

  loadFields(): void {
    if (!this.tabId) {
      return;
    }
    
    this.loading.fields = true;
    // Use formBuilderId if available, otherwise use 1 as fallback
    const formId = this.formBuilderId || 1;
    this.fieldsService.getFields(formId, this.tabId).subscribe({
      next: (fields: FormFieldDto[]) => {
        // getFields الآن يرجع FormFieldDto[] مباشرة بعد استخراج data من response
        this.fields = this.sortFieldsByOrder(fields || []);
        this.loading.fields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.fields = [];
        this.loading.fields = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to load fields' 
        });
      }
    });
  }

  loadFieldTypes(): void {
    this.loading.fieldTypes = true;
    this.fieldsService.getFieldTypes().subscribe({
      next: (response: any) => {
        // تأكد أن response هي array
        let types: FieldTypeDto[] = [];

        if (Array.isArray(response)) {
          types = response;
        } else if (response && typeof response === 'object') {
          const data = response.data || response.items || response.result || [];
          types = Array.isArray(data) ? data : [];
        }

        this.fieldTypes = types.filter(type => type.isActive);
        this.filteredFieldTypes = [...this.fieldTypes];
        this.loading.fieldTypes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.fieldTypes = [];
        this.filteredFieldTypes = [];
        this.loading.fieldTypes = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load field types' });
      }
    });
  }

  filterFieldTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFieldTypes = [...this.fieldTypes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredFieldTypes = this.fieldTypes.filter(type =>
      type.typeName.toLowerCase().includes(term) ||
      (type.description && type.description.toLowerCase().includes(term))
    );
  }

  openAddFieldModal(): void {
    this.editingField = null;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    this.showFieldModal = true;

    let nextOrder = 1;
    if (this.fields && this.fields.length > 0) {
      const maxOrder = Math.max(...this.fields.map(field => field.fieldOrder || 0));
      nextOrder = maxOrder + 1;
    }

    const defaultFieldTypeId = this.fieldTypes.length > 0 ? this.fieldTypes[0].id : '';

    this.fieldForm.reset({
      tabId: this.tabId,
      fieldTypeId: defaultFieldTypeId,
      fieldName: '',
      foreignFieldName: '',
      fieldCode: '',
      fieldOrder: nextOrder,
      placeholder: '',
      foreignPlaceholder: '',
      hintText: '',
      foreignHintText: '',
      isMandatory: true,
      isEditable: true,
      isVisible: true,
      isActive: true,
      defaultValue: '',
      defaultValueJson: '',
      regexPattern: '',
      validationMessage: '',
      foreignValidationMessage: '',
      minValue: null,
      maxValue: null
    });
    
    // Clear field options
    const optionsArray = this.fieldOptionsFormArray;
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }
  }

  openEditFieldModal(field: FormFieldDto): void {
    this.editingField = field;
    this.currentInputLanguage = 'en'; // Reset to English when opening modal
    this.showFieldModal = true;

    const regexPattern = field.regexPattern || '';
    let validationMessage = field.validationMessage || '';
    
    // Auto-set validation message if pattern matches a preset and message is empty
    if (regexPattern && !validationMessage) {
      const matchingOption = this.regexOptions.find(opt => opt.value === regexPattern);
      if (matchingOption && matchingOption.message) {
        validationMessage = matchingOption.message;
      }
    }

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: field.fieldName || '',
      foreignFieldName: field.foreignFieldName || '',
      fieldCode: field.fieldCode || '',
      fieldOrder: field.fieldOrder || 1,
      placeholder: field.placeholder || '',
      foreignPlaceholder: field.foreignPlaceholder || '',
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      defaultValue: field.defaultValueJson || '',
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: regexPattern,
      validationMessage: validationMessage,
      foreignValidationMessage: field.foreignValidationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null
    }, { emitEvent: false }); // Prevent triggering change listeners during initialization

    // Load field options
    this.loadFieldOptions(field.id);
  }

  closeFieldModal(): void {
    this.showFieldModal = false;
    this.editingField = null;
    this.selectedField = null;
    this.currentInputLanguage = 'en'; // Reset to English when closing modal
    this.fieldForm.reset({
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      fieldOrder: 1,
      isActive: true
    });
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  /**
   * Translate a key based on currentInputLanguage
   */
  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  onRegexPresetChange(value: string): void {
    const selectedOption = this.regexOptions.find(opt => opt.value === value);
    if (selectedOption) {
      this.fieldForm.patchValue({ 
        regexPattern: selectedOption.value,
        validationMessage: selectedOption.message || ''
      }, { emitEvent: false }); // Prevent triggering regexPattern change listener
    } else {
      this.fieldForm.patchValue({ regexPattern: value }, { emitEvent: false });
    }
  }

  onRegexPatternChange(pattern: string): void {
    // Only auto-update if validation message is empty or matches a preset message
    const currentMessage = this.fieldForm.get('validationMessage')?.value || '';
    const matchingOption = this.regexOptions.find(opt => opt.value === pattern);
    
    // If pattern matches a preset and message is empty or matches the preset message, update it
    if (matchingOption && matchingOption.message) {
      if (!currentMessage || currentMessage === matchingOption.message || 
          this.regexOptions.some(opt => opt.message === currentMessage)) {
        this.fieldForm.patchValue({ 
          validationMessage: matchingOption.message 
        }, { emitEvent: false });
      }
    }
  }

  getSelectedRegexPreset(): string {
    const currentPattern = this.fieldForm.get('regexPattern')?.value || '';
    const matchingOption = this.regexOptions.find(opt => opt.value === currentPattern);
    return matchingOption ? matchingOption.value : '';
  }

  saveField(): void {
    if (this.fieldForm.invalid) {
      this.markFormGroupTouched(this.fieldForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const fieldData = this.fieldForm.value;

    if (this.editingField) {
      const updateDto: UpdateFormFieldDto = {
        tabId: this.tabId,
        fieldTypeId: Number(fieldData.fieldTypeId),
        fieldName: fieldData.fieldName,
        foreignFieldName: fieldData.foreignFieldName || undefined,
        fieldCode: fieldData.fieldCode,
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || '',
        foreignPlaceholder: fieldData.foreignPlaceholder || undefined,
        hintText: fieldData.hintText || '',
        foreignHintText: fieldData.foreignHintText || undefined,
        defaultValueJson: fieldData.defaultValueJson || fieldData.defaultValue || '',
        regexPattern: fieldData.regexPattern || '',
        validationMessage: fieldData.validationMessage || undefined,
        foreignValidationMessage: fieldData.foreignValidationMessage || undefined,
        isMandatory: fieldData.isMandatory ?? null,
        isEditable: fieldData.isEditable ?? null,
        isVisible: fieldData.isVisible ?? null,
        minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== '' 
          ? Number(fieldData.minValue) 
          : undefined,
        maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== '' 
          ? Number(fieldData.maxValue) 
          : undefined
      };

      if (!this.editingField) return;
      
      this.fieldsService.updateField(this.editingField.id, updateDto).subscribe({
        next: (updatedField) => {
          // Save field options if field type has options
          const selectedFieldType = this.fieldTypes.find(t => t.id === Number(fieldData.fieldTypeId));
          if (selectedFieldType?.hasOptions) {
            this.saveFieldOptions(this.editingField!.id);
          } else {
            // Delete all options if field type doesn't support options
            this.deleteAllFieldOptions(this.editingField!.id).then(() => {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field updated successfully' });
              this.closeFieldModal();
              this.cdr.detectChanges();
            });
          }
        },
        error: () => {
          this.loading.save = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update field' });
        }
      });
    } else {
      const createDto: CreateFormFieldDto = {
        tabId: this.tabId,
        fieldTypeId: Number(fieldData.fieldTypeId),
        fieldName: fieldData.fieldName,
        foreignFieldName: fieldData.foreignFieldName || undefined,
        fieldCode: fieldData.fieldCode.toUpperCase(),
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || undefined,
        foreignPlaceholder: fieldData.foreignPlaceholder || undefined,
        hintText: fieldData.hintText || '',
        foreignHintText: fieldData.foreignHintText || undefined,
        isMandatory: fieldData.isMandatory ?? true,
        isEditable: fieldData.isEditable ?? true,
        isVisible: fieldData.isVisible ?? true,
        defaultValueJson: fieldData.defaultValue || fieldData.defaultValueJson || undefined,
        regexPattern: fieldData.regexPattern || undefined,
        validationMessage: fieldData.validationMessage || undefined,
        foreignValidationMessage: fieldData.foreignValidationMessage || undefined,
        minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== '' 
          ? Number(fieldData.minValue) 
          : undefined,
        maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== '' 
          ? Number(fieldData.maxValue) 
          : undefined,
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };

      this.fieldsService.createField(createDto).subscribe({
        next: (newField) => {
          // Save field options if field type has options
          const selectedFieldType = this.fieldTypes.find(t => t.id === Number(fieldData.fieldTypeId));
          if (selectedFieldType?.hasOptions && this.fieldOptionsFormArray.length > 0) {
            this.saveFieldOptions(newField.id);
          } else {
            this.loading.save = false;
            this.loadFields();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field created successfully' });
            this.closeFieldModal();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to create field';
          
          // Extract detailed error message
          if (error.error) {
            if (error.error.errors) {
              // Validation errors from ASP.NET Core
              const validationErrors = Object.values(error.error.errors).flat() as string[];
              errorMessage = `Validation errors: ${validationErrors.join(', ')}`;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.title) {
              errorMessage = error.error.title;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          console.error('Field creation error:', error);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage,
            life: 5000
          });
        }
      });
    }
  }

  deleteField(fieldId: number): void {
    const fieldToDelete = this.fields.find(f => f.id === fieldId);
    if (!fieldToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the field "${fieldToDelete.fieldName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.fieldsService.deleteField(fieldId).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field deleted successfully' });

            // Remove field from array
            this.fields = this.fields.filter(f => f.id !== fieldId);
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading.delete = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete field' });
          }
        });
      }
    });
  }

  duplicateField(field: FormFieldDto): void {
    this.editingField = null;
    this.showFieldModal = true;

    let nextOrder = 1;
    if (this.fields && this.fields.length > 0) {
      const maxOrder = Math.max(...this.fields.map(f => f.fieldOrder || 0));
      nextOrder = maxOrder + 1;
    }

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: `${field.fieldName} (Copy)`,
      fieldCode: `${field.fieldCode}_COPY`,
      fieldOrder: nextOrder,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      defaultValue: field.defaultValueJson || '',
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null
    });
  }

  toggleFieldStatus(field: FormFieldDto): void {
    console.log('[toggleFieldStatus] Called for field:', field.id, 'Current status:', field.isActive);
    const newStatus = !field.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the field "${field.fieldName}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('[toggleFieldStatus] User confirmed, updating field status to:', newStatus);
        
        // Try using the dedicated status endpoint first
        this.fieldsService.updateFieldStatus(field.id, newStatus).subscribe({
          next: (updatedField) => {
            console.log('[toggleFieldStatus] Status updated successfully:', updatedField);
            // Update field in array without reloading
            const index = this.fields.findIndex(f => f.id === field.id);
            if (index !== -1) {
              const existingField = this.fields[index];
              this.fields[index] = {
                ...existingField,
                ...(updatedField || {}),
                isActive: newStatus,
                // Preserve fieldOptions - safely handle null updatedField
                fieldOptions: (updatedField?.fieldOptions ?? existingField.fieldOptions) || []
              };
              // Maintain sorted order
              this.fields = this.sortFieldsByOrder([...this.fields]);
            }

            this.messageService.add({ severity: 'success', summary: 'Success', detail: `Field ${action}d successfully` });
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('[toggleFieldStatus] Error using status endpoint, trying full update:', error);
            
            // Fallback: use full update with isActive
            const updateDto: UpdateFormFieldDto = {
              tabId: field.tabId,
              fieldTypeId: field.fieldTypeId,
              fieldName: field.fieldName,
              fieldCode: field.fieldCode,
              fieldOrder: field.fieldOrder,
              placeholder: field.placeholder || '',
              hintText: field.hintText || '',
              isMandatory: field.isMandatory,
              isEditable: field.isEditable,
              isVisible: field.isVisible,
              isActive: newStatus,
              defaultValueJson: field.defaultValueJson || '',
              regexPattern: field.regexPattern || '',
              validationMessage: field.validationMessage || '',
              minValue: field.minValue !== null && field.minValue !== undefined 
                ? field.minValue 
                : undefined,
              maxValue: field.maxValue !== null && field.maxValue !== undefined 
                ? field.maxValue 
                : undefined
            };

            console.log('[toggleFieldStatus] Sending full update DTO:', updateDto);

            this.fieldsService.updateField(field.id, updateDto).subscribe({
              next: (updatedField) => {
                console.log('[toggleFieldStatus] Full update successful:', updatedField);
                // Update field in array without reloading
                const index = this.fields.findIndex(f => f.id === field.id);
                if (index !== -1) {
                  const existingField = this.fields[index];
                  this.fields[index] = {
                    ...existingField,
                    ...(updatedField || {}),
                    isActive: newStatus,
                    // Preserve fieldOptions - safely handle null updatedField
                    fieldOptions: (updatedField?.fieldOptions ?? existingField.fieldOptions) || []
                  };
                  // Maintain sorted order
                  this.fields = this.sortFieldsByOrder([...this.fields]);
                }

                this.messageService.add({ severity: 'success', summary: 'Success', detail: `Field ${action}d successfully` });
                this.cdr.detectChanges();
              },
              error: (error2) => {
                console.error('[toggleFieldStatus] Error updating field:', error2);
                const errorMessage = error2?.error?.message || error2?.error?.errorMessage || error2?.message || `Failed to ${action} field`;
                this.messageService.add({ 
                  severity: 'error', 
                  summary: 'Error', 
                  detail: errorMessage 
                });
              }
            });
          }
        });
      }
    });
  }

  sortFieldsByOrder(fields: FormFieldDto[]): FormFieldDto[] {
    // تأكد أن fields هي array قبل استخدام sort
    if (!Array.isArray(fields)) {
      return [];
    }

    return fields.sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
  }

  getFieldTypeName(fieldTypeId: number | undefined): string {
    if (!fieldTypeId) return 'Unknown';
    const type = this.fieldTypes.find(t => t.id === fieldTypeId);
    return type ? type.typeName : `Type ${fieldTypeId}`;
  }

  getFieldType(fieldTypeId: number | undefined): FieldTypeDto | undefined {
    if (!fieldTypeId) return undefined;
    return this.fieldTypes.find(t => t.id === fieldTypeId);
  }

  getFieldStatusClass(field: FormFieldDto): string {
    if (!field.isActive) return 'status-inactive';
    if (field.isMandatory) return 'status-mandatory';
    return 'status-normal';
  }

  getActiveFieldsCount(): number {
    return this.fields.filter(f => f.isActive).length;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Form Validation Helpers
  isFieldInvalid(fieldName: string): boolean {
    const control = this.fieldForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.fieldForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    if (control.errors['pattern']) return 'Invalid format. Use only letters (uppercase or lowercase), numbers and underscores';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;

    return 'Invalid value';
  }

  // ================= FIELD OPTIONS MANAGEMENT ================

  get fieldOptionsFormArray(): FormArray {
    return this.fieldForm.get('fieldOptions') as FormArray;
  }

  onFieldTypeChange(fieldTypeId: number | string): void {
    const normalizedId = Number(fieldTypeId);
    if (!normalizedId) {
      // If no valid type selected, clear options
      const optionsArray = this.fieldOptionsFormArray;
      while (optionsArray.length !== 0) {
        optionsArray.removeAt(0);
      }
      return;
    }

    const selectedFieldType = this.fieldTypes.find(t => t.id === normalizedId);
    if (!selectedFieldType?.hasOptions) {
      // Clear options if field type doesn't support options
      const optionsArray = this.fieldOptionsFormArray;
      while (optionsArray.length !== 0) {
        optionsArray.removeAt(0);
      }
    }
  }

  getSelectedFieldType(): FieldTypeDto | undefined {
    const rawFieldTypeId = this.fieldForm.get('fieldTypeId')?.value;
    const fieldTypeId = Number(rawFieldTypeId);
    if (!fieldTypeId) return undefined;
    return this.fieldTypes.find(t => t.id === fieldTypeId);
  }

  addFieldOption(): void {
    const optionsArray = this.fieldOptionsFormArray;
    const newOption = this.fb.group({
      id: [null],
      optionValue: ['', Validators.required],
      optionText: ['', Validators.required],
      foreignOptionText: ['', Validators.maxLength(200)], // Arabic option text
      optionOrder: [optionsArray.length + 1],
      isActive: [true]
    });
    optionsArray.push(newOption);
  }

  removeFieldOption(index: number): void {
    const optionsArray = this.fieldOptionsFormArray;
    if (optionsArray.length > index) {
      optionsArray.removeAt(index);
      // Update option orders
      optionsArray.controls.forEach((control, idx) => {
        control.patchValue({ optionOrder: idx + 1 });
      });
    }
  }

  loadFieldOptions(fieldId: number): void {
    const optionsArray = this.fieldOptionsFormArray;
    // Clear existing options
    while (optionsArray.length !== 0) {
      optionsArray.removeAt(0);
    }

    // Load options from API
    this.fieldOptionsService.getFieldOptionsByFieldId(fieldId).subscribe({
      next: (options: FieldOptionDto[]) => {
        options.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));
        options.forEach(option => {
          const optionGroup = this.fb.group({
            id: [option.id],
            optionValue: [option.optionValue, Validators.required],
            optionText: [option.optionText, Validators.required],
            foreignOptionText: [option.foreignOptionText || '', Validators.maxLength(200)],
            optionOrder: [option.optionOrder || optionsArray.length + 1],
            isActive: [option.isActive !== false]
          });
          optionsArray.push(optionGroup);
        });
      },
      error: () => {
        // If field doesn't have options yet, that's okay
        console.log('No options found for field', fieldId);
      }
    });
  }

  saveFieldOptions(fieldId: number): void {
    const optionsArray = this.fieldOptionsFormArray;
    const options = optionsArray.value as FieldOptionDto[];

    if (options.length === 0) {
      this.loading.save = false;
      this.loadFields();
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field saved successfully' });
      this.closeFieldModal();
      this.cdr.detectChanges();
      return;
    }

    // Get existing options to determine which to delete/update/create
    this.fieldOptionsService.getFieldOptionsByFieldId(fieldId).subscribe({
      next: (existingOptions: FieldOptionDto[]) => {
        const existingIds = existingOptions.map(o => o.id).filter(id => id !== undefined) as number[];
        const newOptions = options.filter(o => !o.id);
        const updatedOptions = options.filter(o => o.id && existingIds.includes(o.id!));
        const deletedOptions = existingOptions.filter(o => o.id && !options.some(no => no.id === o.id));

        // Delete removed options
        const deletePromises = deletedOptions.map(opt => 
          opt.id ? this.fieldOptionsService.deleteFieldOption(opt.id).toPromise() : Promise.resolve()
        );

        Promise.all(deletePromises).then(() => {
          // Update existing options
          const updatePromises = updatedOptions.map(opt => 
            opt.id ? this.fieldOptionsService.updateFieldOption(opt.id, {
              optionValue: opt.optionValue,
              optionText: opt.optionText,
              foreignOptionText: opt.foreignOptionText || undefined,
              optionOrder: opt.optionOrder,
              isActive: opt.isActive
            }).toPromise() : Promise.resolve()
          );

          Promise.all(updatePromises).then(() => {
            // Create new options
            if (newOptions.length > 0) {
              const createDtos: CreateFieldOptionDto[] = newOptions.map(opt => ({
                fieldId: fieldId,
                optionValue: opt.optionValue,
                optionText: opt.optionText,
                foreignOptionText: opt.foreignOptionText || undefined,
                optionOrder: opt.optionOrder || 1,
                isActive: opt.isActive !== false
              }));

              this.fieldOptionsService.createBulkFieldOptions(createDtos).subscribe({
                next: () => {
                  this.loading.save = false;
                  this.loadFields();
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
                  this.closeFieldModal();
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.loading.save = false;
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field options' });
                }
              });
            } else {
              this.loading.save = false;
              this.loadFields();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
              this.closeFieldModal();
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: () => {
        // If no existing options, just create new ones
        const createDtos: CreateFieldOptionDto[] = options.map(opt => ({
          fieldId: fieldId,
          optionValue: opt.optionValue,
          optionText: opt.optionText,
          foreignOptionText: opt.foreignOptionText || undefined,
          optionOrder: opt.optionOrder || 1,
          isActive: opt.isActive !== false
        }));

        this.fieldOptionsService.createBulkFieldOptions(createDtos).subscribe({
          next: () => {
            this.loading.save = false;
            this.loadFields();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field and options saved successfully' });
            this.closeFieldModal();
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading.save = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field options' });
          }
        });
      }
    });
  }

  deleteAllFieldOptions(fieldId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fieldOptionsService.getFieldOptionsByFieldId(fieldId).subscribe({
        next: (options: FieldOptionDto[]) => {
          if (options.length === 0) {
            resolve();
            return;
          }

          const deletePromises = options
            .filter(opt => opt.id !== undefined)
            .map(opt => this.fieldOptionsService.deleteFieldOption(opt.id!).toPromise());

          Promise.all(deletePromises).then(() => resolve()).catch(reject);
        },
        error: () => resolve() // If no options exist, that's fine
      });
    });
  }

  // ================= GOOGLE FORMS STYLE METHODS ================

  onFormTitleChange(event: any): void {
    // Handle form title change if needed
    const newTitle = event.target.textContent;
    console.log('Form title changed:', newTitle);
  }

  onFormDescriptionChange(event: any): void {
    // Handle form description change if needed
    const newDescription = event.target.textContent;
    console.log('Form description changed:', newDescription);
  }

  updateFieldName(fieldId: number, event: any): void {
    const newName = event.target.value;
    if (!newName || newName.trim() === '') return;

    const field = this.fields.find(f => f.id === fieldId);
    if (!field || field.fieldName === newName) return;

    const updateDto: UpdateFormFieldDto = {
      tabId: field.tabId,
      fieldTypeId: field.fieldTypeId,
      fieldName: newName,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory,
      isEditable: field.isEditable,
      isVisible: field.isVisible,
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue,
      maxValue: field.maxValue
    };

    this.fieldsService.updateField(fieldId, updateDto).subscribe({
      next: () => {
        field.fieldName = newName;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Field name updated' 
        });
      },
      error: () => {
        event.target.value = field.fieldName; // Revert on error
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to update field name' 
        });
      }
    });
  }

  changeFieldType(fieldId: number, event: any): void {
    const newTypeId = Number(event.target.value);
    const field = this.fields.find(f => f.id === fieldId);
    if (!field || field.fieldTypeId === newTypeId) return;

    const updateDto: UpdateFormFieldDto = {
      tabId: field.tabId,
      fieldTypeId: newTypeId,
      fieldName: field.fieldName,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory,
      isEditable: field.isEditable,
      isVisible: field.isVisible,
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue,
      maxValue: field.maxValue
    };

    this.fieldsService.updateField(fieldId, updateDto).subscribe({
      next: () => {
        field.fieldTypeId = newTypeId;
        // Reload field with options if new type supports options
        this.loadFields();
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Field type updated' 
        });
      },
      error: () => {
        event.target.value = field.fieldTypeId; // Revert on error
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to update field type' 
        });
      }
    });
  }

  updateOptionText(fieldId: number, optionId: number | undefined, event: any): void {
    if (!optionId) return;
    const newText = event.target.value;
    if (!newText || newText.trim() === '') return;

    const field = this.fields.find(f => f.id === fieldId);
    if (!field || !field.fieldOptions) return;

    const option = field.fieldOptions.find(o => o.id === optionId);
    if (!option || option.optionText === newText) return;

    this.fieldOptionsService.updateFieldOption(optionId, {
      optionText: newText,
      optionValue: option.optionValue,
      optionOrder: option.optionOrder,
      isActive: option.isActive
    }).subscribe({
      next: () => {
        option.optionText = newText;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Option updated' 
        });
      },
      error: () => {
        event.target.value = option.optionText; // Revert on error
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to update option' 
        });
      }
    });
  }

  addOptionToField(fieldId: number): void {
    const field = this.fields.find(f => f.id === fieldId);
    if (!field) return;

    const nextOrder = field.fieldOptions && field.fieldOptions.length > 0
      ? Math.max(...field.fieldOptions.map(o => o.optionOrder || 0)) + 1
      : 1;

    const createDto: CreateFieldOptionDto = {
      fieldId: fieldId,
      optionValue: `option_${nextOrder}`,
      optionText: `Option ${nextOrder}`,
      optionOrder: nextOrder,
      isActive: true
    };

    this.fieldOptionsService.createFieldOption(createDto).subscribe({
      next: () => {
        this.loadFields();
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Option added' 
        });
      },
      error: () => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to add option' 
        });
      }
    });
  }

  removeOption(fieldId: number, optionId: number | undefined): void {
    if (!optionId) return;
    
    this.confirmationService.confirm({
      message: 'Are you sure you want to remove this option?',
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fieldOptionsService.deleteFieldOption(optionId).subscribe({
          next: () => {
            this.loadFields();
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Option removed' 
            });
          },
          error: () => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'Failed to remove option' 
            });
          }
        });
      }
    });
  }

  addOtherOption(fieldId: number): void {
    const field = this.fields.find(f => f.id === fieldId);
    if (!field) return;

    const createDto: CreateFieldOptionDto = {
      fieldId: fieldId,
      optionValue: 'other',
      optionText: 'Other',
      optionOrder: (field.fieldOptions?.length || 0) + 1,
      isActive: true
    };

    this.fieldOptionsService.createFieldOption(createDto).subscribe({
      next: () => {
        this.loadFields();
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: '"Other" option added' 
        });
      },
      error: () => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to add "Other" option' 
        });
      }
    });
  }

  hasOtherOption(field: FormFieldDto): boolean {
    return field.fieldOptions?.some(o => o.optionValue?.toLowerCase() === 'other') || false;
  }

  toggleRequired(fieldId: number, event: any): void {
    const isRequired = event.target.checked;
    const field = this.fields.find(f => f.id === fieldId);
    if (!field) return;

    const updateDto: UpdateFormFieldDto = {
      tabId: field.tabId,
      fieldTypeId: field.fieldTypeId,
      fieldName: field.fieldName,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: isRequired,
      isEditable: field.isEditable,
      isVisible: field.isVisible,
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue,
      maxValue: field.maxValue
    };

    this.fieldsService.updateField(fieldId, updateDto).subscribe({
      next: () => {
        field.isMandatory = isRequired;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: isRequired ? 'Field marked as required' : 'Field marked as optional' 
        });
      },
      error: () => {
        event.target.checked = !isRequired; // Revert on error
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to update field' 
        });
      }
    });
  }

  openFieldSettings(field: FormFieldDto): void {
    this.editingField = field;
    this.showFieldSettingsModal = true;

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: field.fieldName || '',
      foreignFieldName: field.foreignFieldName || '',
      fieldCode: field.fieldCode || '',
      fieldOrder: field.fieldOrder || 1,
      placeholder: field.placeholder || '',
      foreignPlaceholder: field.foreignPlaceholder || '',
      hintText: field.hintText || '',
      foreignHintText: field.foreignHintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      defaultValue: field.defaultValueJson || '',
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      foreignValidationMessage: field.foreignValidationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null
    });

    // Load field options
    this.loadFieldOptions(field.id);
  }

  closeFieldSettingsModal(): void {
    this.showFieldSettingsModal = false;
    this.editingField = null;
  }

  saveFieldSettings(): void {
    if (!this.editingField) return;
    
    if (this.fieldForm.invalid) {
      this.markFormGroupTouched(this.fieldForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const fieldData = this.fieldForm.value;

    const updateDto: UpdateFormFieldDto = {
      tabId: this.tabId,
      fieldTypeId: Number(fieldData.fieldTypeId),
      fieldName: fieldData.fieldName,
      foreignFieldName: fieldData.foreignFieldName || undefined,
      fieldCode: fieldData.fieldCode,
      fieldOrder: Number(fieldData.fieldOrder || 1),
      placeholder: fieldData.placeholder || '',
      foreignPlaceholder: fieldData.foreignPlaceholder || undefined,
      hintText: fieldData.hintText || '',
      foreignHintText: fieldData.foreignHintText || undefined,
      isMandatory: fieldData.isMandatory ?? null,
      isEditable: fieldData.isEditable ?? null,
      isVisible: fieldData.isVisible ?? null,
      defaultValueJson: fieldData.defaultValueJson || fieldData.defaultValue || '',
      regexPattern: fieldData.regexPattern || '',
      validationMessage: fieldData.validationMessage || undefined,
      foreignValidationMessage: fieldData.foreignValidationMessage || undefined,
      minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== '' 
        ? Number(fieldData.minValue) 
        : undefined,
      maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== '' 
        ? Number(fieldData.maxValue) 
        : undefined
    };

    if (!this.editingField) return;
    
    this.fieldsService.updateField(this.editingField.id, updateDto).subscribe({
      next: (updatedField) => {
        const selectedFieldType = this.fieldTypes.find(t => t.id === Number(fieldData.fieldTypeId));
        if (selectedFieldType?.hasOptions) {
          this.saveFieldOptions(this.editingField!.id);
        } else {
          this.deleteAllFieldOptions(this.editingField!.id).then(() => {
            this.loading.save = false;
            this.loadFields();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field settings saved successfully' });
            this.closeFieldSettingsModal();
            this.cdr.detectChanges();
          });
        }
      },
      error: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save field settings' });
      }
    });
  }

  startDrag(event: MouseEvent, index: number): void {
    // Drag and drop functionality - can be enhanced with CDK DragDrop
    this.draggingFieldIndex = index;
    // TODO: Implement drag and drop reordering
  }

  importFields(): void {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Info', 
      detail: 'Import fields feature coming soon' 
    });
  }

  addTitleDescription(): void {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Info', 
      detail: 'Add title/description feature coming soon' 
    });
  }

  addImage(): void {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Info', 
      detail: 'Add image feature coming soon' 
    });
  }

  addVideo(): void {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Info', 
      detail: 'Add video feature coming soon' 
    });
  }

  addSection(): void {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Info', 
      detail: 'Add section feature coming soon' 
    });
  }
}