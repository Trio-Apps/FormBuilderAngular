import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { FormFieldDto, FieldTypeDto, UpdateFormFieldDto, CreateFormFieldDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './fields-list.component.html',
  styleUrls: ['./fields-list.component.scss']
})
export class FieldsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  tabId!: number;
  formBuilderId!: number;
  
  // Data Arrays
  fields: FormFieldDto[] = [];
  fieldTypes: FieldTypeDto[] = [];
  filteredFieldTypes: FieldTypeDto[] = [];
  
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
  
  constructor(
    private route: ActivatedRoute,
    private fieldsService: FieldsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize the form
    this.fieldForm = this.fb.group({
      tabId: ['', Validators.required],
      fieldName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      fieldCode: ['', [Validators.required, Validators.pattern('^[A-Z_][A-Z0-9_]*$'), Validators.maxLength(50)]],
      fieldTypeId: ['', Validators.required],
      placeholder: ['', Validators.maxLength(200)],
      hintText: ['', Validators.maxLength(500)],
      fieldOrder: [1, [Validators.required, Validators.min(1)]],
      isMandatory: [false],
      isEditable: [true],
      isVisible: [true],
      isActive: [true],
      dataType: ['string'],
      defaultValue: [''],
      regexPattern: [''],
      validationMessage: ['', Validators.maxLength(500)],
      minValue: [null],
      maxValue: [null],
      maxLength: [null],
      visibilityRuleJson: ['{}'],
      readOnlyRuleJson: ['{}']
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      this.tabId = +params['tabId'];
      this.formBuilderId = +params['formId'] || 1;
      
      if (this.tabId) {
        this.loadFields();
        this.loadFieldTypes();
      }
    });
    
    // Set tabId in form
    this.fieldForm.patchValue({ tabId: this.tabId });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  loadFields(): void {
    this.loading.fields = true;
    this.fieldsService.getFields(this.formBuilderId, this.tabId).subscribe({
      next: (response: any) => {
        // تأكد أن response هي array
        if (Array.isArray(response)) {
          this.fields = this.sortFieldsByOrder(response);
        } else if (response && typeof response === 'object') {
          // إذا كان response كائن يحتوي على data
          const data = response.data || response.items || response.result || [];
          this.fields = this.sortFieldsByOrder(Array.isArray(data) ? data : []);
        } else {
          this.fields = [];
        }
        this.loading.fields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.fields = [];
        this.loading.fields = false;
        alert('Failed to load fields');
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
      error: (error) => {
        console.error('Error loading field types:', error);
        this.fieldTypes = [];
        this.filteredFieldTypes = [];
        this.loading.fieldTypes = false;
        alert('Failed to load field types');
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
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      isActive: true,
      dataType: 'string',
      defaultValue: '',
      regexPattern: '',
      validationMessage: '',
      minValue: null,
      maxValue: null,
      maxLength: null,
      visibilityRuleJson: '{}',
      readOnlyRuleJson: '{}'
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
      defaultValue: field.defaultValue || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null,
      maxLength: field.maxLength || null,
      visibilityRuleJson: field.visibilityRuleJson || '{}',
      readOnlyRuleJson: field.readOnlyRuleJson || '{}'
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

  saveField(): void {
    if (this.fieldForm.invalid) {
      this.markFormGroupTouched(this.fieldForm);
      alert('Please fill all required fields correctly');
      return;
    }

    this.loading.save = true;
    const fieldData = this.fieldForm.value;

    if (this.editingField) {
      const updateDto: UpdateFormFieldDto = {
        fieldTypeId: fieldData.fieldTypeId,
        fieldName: fieldData.fieldName,
        fieldCode: fieldData.fieldCode,
        fieldOrder: fieldData.fieldOrder,
        placeholder: fieldData.placeholder || '',
        hintText: fieldData.hintText || '',
        isMandatory: fieldData.isMandatory,
        isEditable: fieldData.isEditable,
        isVisible: fieldData.isVisible,
        isActive: fieldData.isActive,
        defaultValue: fieldData.defaultValue || '',
        regexPattern: fieldData.regexPattern || '',
        validationMessage: fieldData.validationMessage || '',
        minValue: fieldData.minValue || null,
        maxValue: fieldData.maxValue || null,
        maxLength: fieldData.maxLength || null,
        visibilityRuleJson: fieldData.visibilityRuleJson || '{}',
        readOnlyRuleJson: fieldData.readOnlyRuleJson || '{}'
      };

      // تنظيف الحقول الفارغة
      Object.keys(updateDto).forEach(key => {
        const typedKey = key as keyof UpdateFormFieldDto;
        const value = updateDto[typedKey];
        
        if (value === null || value === undefined || value === '' || value === '{}') {
          delete updateDto[typedKey];
        }
      });
      
      this.fieldsService.updateField(this.editingField.id, updateDto).subscribe({
        next: (updatedField) => {
          this.loading.save = false;
          alert('Field updated successfully');
          
          // Update the field in the array
          const index = this.fields.findIndex(f => f.id === this.editingField?.id);
          if (index !== -1 && updatedField) {
            this.fields[index] = { ...this.fields[index], ...updatedField };
            this.fields = this.sortFieldsByOrder([...this.fields]);
          }
          
          this.closeFieldModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating field:', error);
          this.loading.save = false;
          alert('Failed to update field');
        }
      });
    } else {
      const createDto: any = {
        tabId: this.tabId,
        fieldTypeId: Number(fieldData.fieldTypeId),
        fieldName: fieldData.fieldName,
        fieldCode: fieldData.fieldCode.toUpperCase(),
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || '',
        hintText: fieldData.hintText || '',
        isMandatory: Boolean(fieldData.isMandatory),
        isEditable: Boolean(fieldData.isEditable),
        isVisible: Boolean(fieldData.isVisible),
        isActive: Boolean(fieldData.isActive),
        dataType: fieldData.dataType || 'string',
        defaultValueJson: fieldData.defaultValue || '',
        regexPattern: fieldData.regexPattern || '',
        validationMessage: fieldData.validationMessage || `Please enter a valid ${fieldData.fieldName}`,
        minValue: fieldData.minValue ? Number(fieldData.minValue) : 0,
        maxValue: fieldData.maxValue ? Number(fieldData.maxValue) : 0,
        maxLength: fieldData.maxLength ? Number(fieldData.maxLength) : null,
        visibilityRuleJson: fieldData.visibilityRuleJson || '{}',
        readOnlyRuleJson: fieldData.readOnlyRuleJson || '{}',
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };
      
      // تنظيف الحقول الفارغة
      Object.keys(createDto).forEach(key => {
        if (createDto[key] === null || createDto[key] === undefined || createDto[key] === '') {
          delete createDto[key];
        }
      });
      
      this.fieldsService.createField(createDto).subscribe({
        next: (newField) => {
          this.loading.save = false;
          alert('Field created successfully');
          
          // Add new field to the array
          this.fields = this.sortFieldsByOrder([...this.fields, newField]);
          
          this.closeFieldModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error creating field:', error);
          this.loading.save = false;
          alert('Failed to create field');
        }
      });
    }
  }

  deleteField(fieldId: number): void {
    const fieldToDelete = this.fields.find(f => f.id === fieldId);
    if (!fieldToDelete) return;
    
    if (confirm(`Are you sure you want to delete the field "${fieldToDelete.fieldName}"?`)) {
      this.loading.delete = true;
      this.fieldsService.deleteField(fieldId).subscribe({
        next: () => {
          this.loading.delete = false;
          alert('Field deleted successfully');
          
          // Remove field from array
          this.fields = this.fields.filter(f => f.id !== fieldId);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error deleting field:', error);
          this.loading.delete = false;
          alert('Failed to delete field');
        }
      });
    }
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
      isMandatory: field.isMandatory || false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      isActive: field.isActive !== false,
      dataType: field.dataType || 'string',
      defaultValue: field.defaultValue || '',
      regexPattern: field.regexPattern || '',
      validationMessage: field.validationMessage || '',
      minValue: field.minValue || null,
      maxValue: field.maxValue || null,
      maxLength: field.maxLength || null,
      visibilityRuleJson: field.visibilityRuleJson || '{}',
      readOnlyRuleJson: field.readOnlyRuleJson || '{}'
    });
  }

  toggleFieldStatus(field: FormFieldDto): void {
    const newStatus = !field.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (confirm(`Are you sure you want to ${action} the field "${field.fieldName}"?`)) {
      this.fieldsService.updateField(field.id, { isActive: newStatus }).subscribe({
        next: () => {
          // Update field in array
          const index = this.fields.findIndex(f => f.id === field.id);
          if (index !== -1) {
            this.fields[index].isActive = newStatus;
            this.fields = [...this.fields];
          }
          
          alert(`Field ${action}d successfully`);
        },
        error: (error) => {
          console.error(`Error ${action}ing field:`, error);
          alert(`Failed to ${action} field`);
        }
      });
    }
  }

  sortFieldsByOrder(fields: FormFieldDto[]): FormFieldDto[] {
    // تأكد أن fields هي array قبل استخدام sort
    if (!Array.isArray(fields)) {
      console.error('sortFieldsByOrder: fields is not an array:', fields);
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