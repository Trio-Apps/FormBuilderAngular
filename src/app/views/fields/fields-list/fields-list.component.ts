import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FormFieldDto, FieldTypeDto, UpdateFormFieldDto, CreateFormFieldDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule
  ],
  templateUrl: './fields-list.component.html',
  styleUrls: ['./fields-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FieldsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  tabId!: number;
  formBuilderId!: number;

  // Data Arrays
  fields: FormFieldDto[] = [];
  fieldTypes: FieldTypeDto[] = [];
  filteredFieldTypes: FieldTypeDto[] = [];
  regexOptions = [
    { label: 'No preset (custom)', value: '' },
    { label: 'Email', value: '^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$' },
    { label: 'Phone (digits, +, -, spaces)', value: '^[0-9+\\-()\\s]{6,}$' },
    { label: 'URL', value: '^(https?:\\/\\/)?([\\w-]+\\.)+[\\w-]{2,}(\\/\\S*)?$' },
    { label: 'Digits only', value: '^\\d+$' },
    { label: 'Letters only', value: '^[A-Za-z]+$' },
    { label: 'Alphanumeric', value: '^[A-Za-z0-9]+$' }
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
  editingField: FormFieldDto | null = null;

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
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Initialize the form
    this.fieldForm = this.fb.group({
      tabId: ['', Validators.required],
      fieldName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      fieldCode: ['', [Validators.required, Validators.pattern('^[A-Za-z_][A-Za-z0-9_]*$'), Validators.maxLength(100)]],
      fieldTypeId: ['', Validators.required],
      placeholder: ['', Validators.maxLength(200)],
      hintText: ['', Validators.maxLength(500)],
      fieldOrder: [1, [Validators.required, Validators.min(1)]],
      isMandatory: [true],
      isEditable: [true],
      isVisible: [true],
      isActive: [true],
      dataType: ['string'],
      defaultValue: [''],
      defaultValueJson: [''],
      regexPattern: [''],
      validationMessage: ['', Validators.maxLength(500)],
      minValue: [null],
      maxValue: [null],
      maxLength: [null],
      visibilityRuleJson: [''],
      readOnlyRuleJson: ['']
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
      fieldCode: '',
      fieldOrder: nextOrder,
      placeholder: '',
      hintText: '',
      isMandatory: true,
      isEditable: true,
      isVisible: true,
      isActive: true,
      dataType: 'string',
      defaultValue: '',
      defaultValueJson: '',
      regexPattern: '',
      validationMessage: '',
      minValue: null,
      maxValue: null,
      maxLength: null,
      visibilityRuleJson: '',
      readOnlyRuleJson: ''
    });
  }

  openEditFieldModal(field: FormFieldDto): void {
    this.editingField = field;
    this.showFieldModal = true;

    this.fieldForm.patchValue({
      tabId: this.tabId,
      fieldTypeId: field.fieldTypeId || '',
      fieldName: field.fieldName || '',
      fieldCode: field.fieldCode || '',
      fieldOrder: field.fieldOrder || 1,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      dataType: field.dataType || 'string',
      defaultValue: field.defaultValueJson || '',
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null,
      maxLength: field.maxLength || null,
      visibilityRuleJson: field.visibilityRuleJson || '',
      readOnlyRuleJson: field.readOnlyRuleJson || ''
    });
  }

  closeFieldModal(): void {
    this.showFieldModal = false;
    this.editingField = null;
    this.selectedField = null;
    this.fieldForm.reset({
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      fieldOrder: 1,
      isActive: true,
      dataType: 'string'
    });
  }

  onRegexPresetChange(value: string): void {
    this.fieldForm.patchValue({ regexPattern: value });
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
        fieldCode: fieldData.fieldCode,
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || '',
        hintText: fieldData.hintText || '',
        isMandatory: Boolean(fieldData.isMandatory),
        isEditable: Boolean(fieldData.isEditable),
        isVisible: Boolean(fieldData.isVisible),
        isActive: Boolean(fieldData.isActive ?? true),
        defaultValueJson: fieldData.defaultValueJson || fieldData.defaultValue || '',
        dataType: fieldData.dataType || 'string',
        regexPattern: fieldData.regexPattern || '',
        validationMessage: fieldData.validationMessage || '',
        minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== '' 
          ? Number(fieldData.minValue) 
          : 0,
        maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== '' 
          ? Number(fieldData.maxValue) 
          : 0,
        maxLength: fieldData.maxLength ? Number(fieldData.maxLength) : undefined,
        visibilityRuleJson: fieldData.visibilityRuleJson || '',
        readOnlyRuleJson: fieldData.readOnlyRuleJson || ''
      };

      this.fieldsService.updateField(this.editingField.id, updateDto).subscribe({
        next: (updatedField) => {
          this.loading.save = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field updated successfully' });

          // Update the field in the array
          const index = this.fields.findIndex(f => f.id === this.editingField?.id);
          if (index !== -1 && updatedField) {
            this.fields[index] = { ...this.fields[index], ...updatedField };
            this.fields = this.sortFieldsByOrder([...this.fields]);
          }

          this.closeFieldModal();
          this.cdr.detectChanges();
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
        fieldCode: fieldData.fieldCode.toUpperCase(),
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || '',
        hintText: fieldData.hintText || '',
        isMandatory: Boolean(fieldData.isMandatory ?? true),
        isEditable: Boolean(fieldData.isEditable ?? true),
        isVisible: Boolean(fieldData.isVisible ?? true),
        defaultValueJson: fieldData.defaultValue || fieldData.defaultValueJson || '',
        dataType: fieldData.dataType || 'string',
        regexPattern: fieldData.regexPattern || '',
        validationMessage: fieldData.validationMessage || `Please enter a valid ${fieldData.fieldName}`,
        minValue: fieldData.minValue !== null && fieldData.minValue !== undefined && fieldData.minValue !== '' 
          ? Number(fieldData.minValue) 
          : 0,
        maxValue: fieldData.maxValue !== null && fieldData.maxValue !== undefined && fieldData.maxValue !== '' 
          ? Number(fieldData.maxValue) 
          : 0,
        maxLength: fieldData.maxLength ? Number(fieldData.maxLength) : undefined,
        visibilityRuleJson: fieldData.visibilityRuleJson || '',
        readOnlyRuleJson: fieldData.readOnlyRuleJson || '',
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };

      this.fieldsService.createField(createDto).subscribe({
        next: (newField) => {
          this.loading.save = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field created successfully' });

          // Add new field to the array
          this.fields = this.sortFieldsByOrder([...this.fields, newField]);

          this.closeFieldModal();
          this.cdr.detectChanges();
        },
          error: () => {
            this.loading.save = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create field' });
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
      dataType: field.dataType || 'string',
      defaultValue: field.defaultValueJson || '',
      defaultValueJson: field.defaultValueJson || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null,
      maxLength: field.maxLength || null,
      visibilityRuleJson: field.visibilityRuleJson || '',
      readOnlyRuleJson: field.readOnlyRuleJson || ''
    });
  }

  toggleFieldStatus(field: FormFieldDto): void {
    const newStatus = !field.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the field "${field.fieldName}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
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
          dataType: field.dataType || 'string',
          regexPattern: field.regexPattern || '',
          validationMessage: field.validationMessage || '',
          minValue: field.minValue !== null && field.minValue !== undefined 
            ? field.minValue 
            : 0,
          maxValue: field.maxValue !== null && field.maxValue !== undefined 
            ? field.maxValue 
            : 0,
          maxLength: field.maxLength,
          visibilityRuleJson: field.visibilityRuleJson || '',
          readOnlyRuleJson: field.readOnlyRuleJson || ''
        };

        this.fieldsService.updateField(field.id, updateDto).subscribe({
          next: (updatedField) => {
            // Update field in array
            const index = this.fields.findIndex(f => f.id === field.id);
            if (index !== -1) {
              this.fields[index] = { ...this.fields[index], ...updatedField, isActive: newStatus };
              this.fields = [...this.fields];
            }

            this.messageService.add({ severity: 'success', summary: 'Success', detail: `Field ${action}d successfully` });
          },
          error: (error) => {
            console.error('Error updating field status:', error);
            const errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || `Failed to ${action} field`;
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

  getFieldStatusClass(field: FormFieldDto): string {
    if (!field.isActive) return 'status-inactive';
    if (field.isMandatory) return 'status-mandatory';
    return 'status-normal';
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
    if (control.errors['pattern']) return 'Invalid format. Use only uppercase letters, numbers and underscores';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;

    return 'Invalid value';
  }
}