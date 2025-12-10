import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { FormsService } from '../forms.service';

import { 
  FormBuilderDto, 
  CreateFormBuilderDto, 
  UpdateFormBuilderDto,
  FormTabDto,
  FormFieldDto,
  UpdateFormTabDto,
  CreateFormTabDto,
  UpdateFormFieldDto,
  CreateFormFieldDto,
  FieldTypeDto
} from '../form-builder/models/form-builder-dto.model';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TableModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService]
})
export class FormBuilderComponent implements OnInit {
  // Forms Data
  allForms: FormBuilderDto[] = [];
  forms: FormBuilderDto[] = [];
  
  // Forms Modals
  showFormModal = false;
  formGroup!: FormGroup;
  editingFormId: number | null = null;
  editingForm: FormBuilderDto | null = null;
  modalTitle: string = 'Add Form';

  // Tabs Modals
  showTabsModal = false;
  showTabModal = false;
  tabForm!: FormGroup;
  editingTab: FormTabDto | null = null;
  selectedForm: FormBuilderDto | null = null;

  // Fields Modals
  showFieldsModal = false;
  showFieldModal = false;
  fieldForm!: FormGroup;
  editingField: FormFieldDto | null = null;
  selectedTab: FormTabDto | null = null;
  
  // Field Types
  fieldTypes: FieldTypeDto[] = [];

  // Search
  searchTerm: string = '';

  // Loading States
  loading = {
    forms: false,
    save: false,
    delete: false,
    tabs: false,
    fields: false,
    fieldTypes: false
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  paginatedForms: FormBuilderDto[] = [];

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private formsService: FormsService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadForms();
    this.loadFieldTypes();
    this.initForms();
  }

  // ============ INITIALIZATION ============

  initForms(): void {
    // Main Form
    this.formGroup = this.fb.group({
      formName: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(200)
      ]],
      formCode: ['', [
        Validators.required, 
        Validators.minLength(2), 
        Validators.maxLength(100), 
        Validators.pattern('^[A-Z0-9_]+$')
      ]],
      description: ['', [Validators.maxLength(500)]],
      isPublished: [false],
      isActive: [true]
    });

    // Tab Form
    this.tabForm = this.fb.group({
      formBuilderId: [null, [Validators.required]],
      tabName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      tabCode: ['', [
        Validators.maxLength(50),
        Validators.pattern('^[a-z0-9_]*$')
      ]],
      tabOrder: [1, [Validators.min(1)]],
      isActive: [true]
    });

    // Field Form
    this.fieldForm = this.fb.group({
      tabId: [null, [Validators.required]],
      fieldTypeId: ['', [Validators.required]],
      fieldName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200)
      ]],
      fieldCode: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern('^[a-z0-9_]+$')
      ]],
      placeholder: ['', [Validators.maxLength(200)]],
      hintText: ['', [Validators.maxLength(500)]],
      isMandatory: [false],
      isEditable: [true],
      isVisible: [true],
      defaultValue: ['', [Validators.maxLength(500)]],
      fieldOrder: [1, [Validators.min(1)]],
      isActive: [true],
      dataType: ['string'],
      regexPattern: [''],
      validationMessage: [''],
      minValue: [null],
      maxValue: [null],
      maxLength: [null],
      createdByUserId: ['f776321b-3476-494d-aaef-18439f35a1b4'],
      readOnlyRuleJson: ['{}'],
      visibilityRuleJson: ['{}']
    });

    // Auto-clean form code
    this.formGroup.get('formCode')?.valueChanges.subscribe(value => {
      if (value) {
        const cleanedValue = value.replace(/[^A-Z0-9_]/g, '').toUpperCase();
        if (cleanedValue !== value) {
          this.formGroup.get('formCode')?.setValue(cleanedValue, { emitEvent: false });
        }
      }
    });

    // Auto-clean tab code
    this.tabForm.get('tabCode')?.valueChanges.subscribe(value => {
      if (value) {
        const cleanedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (cleanedValue !== value) {
          this.tabForm.get('tabCode')?.setValue(cleanedValue, { emitEvent: false });
        }
      }
    });

    // Auto-clean field code
    this.fieldForm.get('fieldCode')?.valueChanges.subscribe(value => {
      if (value) {
        const cleanedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (cleanedValue !== value) {
          this.fieldForm.get('fieldCode')?.setValue(cleanedValue, { emitEvent: false });
        }
      }
    });

    // Update validation message when field name changes
    this.fieldForm.get('fieldName')?.valueChanges.subscribe((fieldName) => {
      if (fieldName) {
        this.fieldForm.patchValue({
          validationMessage: `Please enter a valid ${fieldName}`
        }, { emitEvent: false });
      }
    });
  }

  // ============ HELPER METHODS ============

  convertDecimalToInt(value: number | undefined | null): number {
    if (value === undefined || value === null) {
      return 0;
    }
    
    if (value < 1 && value > 0) {
      return Math.round(value * 1000);
    }
    
    return Math.round(value);
  }
  
  getFormTabsCount(form: FormBuilderDto): number {
    if (form.tabsCount !== undefined) {
      return this.convertDecimalToInt(form.tabsCount);
    }
    if (form.tabs && Array.isArray(form.tabs)) {
      return form.tabs.length;
    }
    return 0;
  }
  
  getFormFieldsCount(form: FormBuilderDto): number {
    if (form.fieldsCount !== undefined) {
      return this.convertDecimalToInt(form.fieldsCount);
    }
    let totalFields = 0;
    if (form.tabs && Array.isArray(form.tabs)) {
      form.tabs.forEach(tab => {
        if (tab.fields && Array.isArray(tab.fields)) {
          totalFields += tab.fields.length;
        }
      });
    }
    return totalFields;
  }

  getFieldTypeLabel(fieldTypeId: number | undefined | null): string {
    if (fieldTypeId === undefined || fieldTypeId === null) {
      return 'Unknown Type';
    }
    const fieldType = this.fieldTypes.find(ft => ft.id === fieldTypeId);
    return fieldType ? fieldType.typeName : `Type ${fieldTypeId}`;
  }

  getTotalTabs(): number {
    return this.allForms.reduce((total, form) => total + this.getFormTabsCount(form), 0);
  }

  getTotalFields(): number {
    return this.allForms.reduce((total, form) => total + this.getFormFieldsCount(form), 0);
  }

  formatDate(date: any): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

  // ============ FORM CRUD ============

  loadForms(): void {
    this.loading.forms = true;
    
    this.formsService.getForms().subscribe({
      next: (data) => {
        this.allForms = data.map(form => ({
          ...form,
          tabsCount: this.convertDecimalToInt(form.tabsCount),
          fieldsCount: this.convertDecimalToInt(form.fieldsCount)
        }));
        
        this.forms = [...this.allForms];
        this.currentPage = 1;
        this.updatePagination();
        this.loading.forms = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Loaded ${data.length} forms successfully`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        this.loading.forms = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load forms. Please try again.',
          life: 5000
        });
      }
    });
  }

  loadFieldTypes(): void {
    this.loading.fieldTypes = true;
    this.formsService.getFieldTypes().subscribe({
      next: (data) => {
        this.fieldTypes = data.filter(type => type.isActive);
        this.loading.fieldTypes = false;
      },
      error: (error) => {
        console.error('Error loading field types:', error);
        this.loading.fieldTypes = false;
      }
    });
  }

  openFormModal(form?: FormBuilderDto): void {
    if (form) {
      this.editingFormId = form.id;
      this.editingForm = form;
      this.modalTitle = 'Edit Form';
      this.formGroup.patchValue({
        formName: form.formName,
        formCode: form.formCode,
        description: form.description || '',
        isPublished: form.isPublished || false,
        isActive: form.isActive !== false
      });
    } else {
      this.editingFormId = null;
      this.editingForm = null;
      this.modalTitle = 'Add Form';
      this.formGroup.reset({
        isPublished: false,
        isActive: true
      });
    }
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingFormId = null;
    this.editingForm = null;
    this.formGroup.reset({
      isPublished: false,
      isActive: true
    });
  }

  saveForm(): void {
    if (this.formGroup.invalid) {
      this.markFormGroupTouched(this.formGroup);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly',
        life: 5000
      });
      return;
    }

    this.loading.save = true;
    const formData = this.formGroup.value;

    if (this.editingFormId) {
      const updateDto: UpdateFormBuilderDto = { ...formData };
      this.formsService.updateForm(this.editingFormId, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form updated successfully',
            life: 5000
          });
          this.loadForms();
          this.closeFormModal();
        },
        error: (error) => {
          console.error('Error updating form:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update form. Please try again.',
            life: 5000
          });
        }
      });
    } else {
      const createDto: CreateFormBuilderDto = { 
        formName: formData.formName,
        formCode: formData.formCode,
        description: formData.description
      };

      this.formsService.createForm(createDto).subscribe({
        next: (newForm) => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Form created successfully',
            life: 5000
          });
          
          const processedForm = {
            ...newForm,
            tabsCount: this.convertDecimalToInt(newForm.tabsCount),
            fieldsCount: this.convertDecimalToInt(newForm.fieldsCount)
          };
          
          this.allForms.unshift(processedForm);
          this.forms = [...this.allForms];
          this.currentPage = 1;
          this.updatePagination();
          this.closeFormModal();
        },
        error: (error) => {
          console.error('Error creating form:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create form. Please try again.',
            life: 5000
          });
        }
      });
    }
  }

  cleanFormCode(): void {
    const formCodeControl = this.formGroup.get('formCode');
    if (formCodeControl) {
      let value = formCodeControl.value || '';
      value = value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
      formCodeControl.setValue(value, { emitEvent: false });
    }
  }

  cleanTabCode(): void {
    const tabCodeControl = this.tabForm.get('tabCode');
    if (tabCodeControl) {
      let value = tabCodeControl.value || '';
      value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      tabCodeControl.setValue(value, { emitEvent: false });
    }
  }

  cleanFieldCode(): void {
    const fieldCodeControl = this.fieldForm.get('fieldCode');
    if (fieldCodeControl) {
      let value = fieldCodeControl.value || '';
      value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      fieldCodeControl.setValue(value, { emitEvent: false });
    }
  }

deleteForm(id: number): void {
    const formToDelete = this.forms.find(f => f.id === id);
    if (!formToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the form "${formToDelete.formName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-outlined',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      defaultFocus: 'reject',
      accept: () => {
        this.loading.delete = true;
        this.formsService.deleteForm(id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Form deleted successfully',
              life: 3000
            });
            this.loadForms();
          },
          error: (error) => {
            console.error('Error deleting form:', error);
            this.loading.delete = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete form. Please try again.',
              life: 5000
            });
          }
        });
      },
      reject: () => {
        // Optional: handle cancel action
      }
    });
  }
  // ============ TABS CRUD ============

  manageTabs(form: FormBuilderDto): void {
    this.selectedForm = { ...form };
    this.loading.tabs = true;
    
    this.formsService.getTabs(form.id).subscribe({
      next: (tabs) => {
        this.selectedForm = { 
          ...form, 
          tabs: tabs || [] 
        };
        this.showTabsModal = true;
        this.loading.tabs = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading tabs:', error);
        this.selectedForm = { 
          ...form, 
          tabs: [] 
        };
        this.showTabsModal = true;
        this.loading.tabs = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddTabModal(): void {
    if (!this.selectedForm) return;
    
    this.editingTab = null;
    let nextOrder = 1;
    
    if (this.selectedForm.tabs && this.selectedForm.tabs.length > 0) {
      const maxOrder = Math.max(...this.selectedForm.tabs.map(tab => tab.tabOrder || 0));
      nextOrder = maxOrder + 1;
    }
    
    this.tabForm.reset({
      formBuilderId: this.selectedForm.id,
      tabName: '',
      tabCode: '',
      tabOrder: nextOrder,
      isActive: true
    });
    this.showTabModal = true;
  }

  openEditTabModal(tab: FormTabDto): void {
    this.editingTab = tab;
    this.tabForm.patchValue({
      formBuilderId: tab.formBuilderId,
      tabName: tab.tabName,
      tabCode: tab.tabCode || '',
      tabOrder: tab.tabOrder || 1,
      isActive: tab.isActive !== false
    });
    this.showTabModal = true;
  }

  closeTabModal(): void {
    this.showTabModal = false;
    this.editingTab = null;
    this.tabForm.reset({
      isActive: true
    });
  }

  saveTab(): void {
    if (this.tabForm.invalid || !this.selectedForm) {
      this.markFormGroupTouched(this.tabForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly',
        life: 5000
      });
      return;
    }

    this.loading.save = true;
    const tabData = this.tabForm.value;

    if (this.editingTab) {
      const updateDto: UpdateFormTabDto = { 
        tabName: tabData.tabName,
        tabCode: tabData.tabCode,
        tabOrder: tabData.tabOrder,
        isActive: tabData.isActive
      };
      
      this.formsService.updateTab(this.selectedForm.id, this.editingTab.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tab updated successfully',
            life: 3000
          });
          this.refreshTabs();
          this.closeTabModal();
        },
        error: (error) => {
          console.error('Error updating tab:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update tab',
            life: 3000
          });
        }
      });
    } else {
      const createDto: CreateFormTabDto = {
        formBuilderId: this.selectedForm.id,
        tabName: tabData.tabName,
        tabCode: tabData.tabCode,
        tabOrder: tabData.tabOrder,
        isActive: tabData.isActive
      };
      
      this.formsService.createTab(createDto).subscribe({
        next: (newTab) => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tab created successfully',
            life: 3000
          });
          
          if (!this.selectedForm!.tabs) {
            this.selectedForm!.tabs = [];
          }
          
          this.selectedForm = {
            ...this.selectedForm!,
            tabs: [...this.selectedForm!.tabs, newTab]
          };
          
          this.updateFormCountersAfterTabChange();
          this.closeTabModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error creating tab:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create tab',
            life: 3000
          });
        }
      });
    }
  }

  updateFormCountersAfterTabChange(): void {
    if (!this.selectedForm) return;
    
    const formIndex = this.forms.findIndex(f => f.id === this.selectedForm?.id);
    if (formIndex !== -1) {
      this.forms[formIndex].tabsCount = this.selectedForm.tabs?.length || 0;
      
      let totalFields = 0;
      if (this.selectedForm.tabs) {
        this.selectedForm.tabs.forEach(tab => {
          if (tab.fields) {
            totalFields += tab.fields.length;
          }
        });
      }
      this.forms[formIndex].fieldsCount = totalFields;
      
      this.updatePagination();
      this.cdr.detectChanges();
    }
  }

  refreshTabs(): void {
    if (!this.selectedForm) return;
    
    this.loading.tabs = true;
    this.formsService.getTabs(this.selectedForm.id).subscribe({
      next: (tabs) => {
        this.selectedForm = {
          ...this.selectedForm!,
          tabs: tabs || []
        };
        this.loading.tabs = false;
        this.cdr.detectChanges();
        this.updateFormCountersAfterTabChange();
      },
      error: (error) => {
        console.error('Error refreshing tabs:', error);
        this.loading.tabs = false;
      }
    });
  }

  deleteTab(tabId: number): void {
    if (!this.selectedForm) return;
    
    const tabToDelete = this.selectedForm.tabs?.find(t => t.id === tabId);
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the tab "${tabToDelete?.tabName || 'this tab'}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.formsService.deleteTab(this.selectedForm!.id, tabId).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Tab deleted successfully',
              life: 3000
            });
            this.refreshTabs();
          },
          error: (error) => {
            console.error('Error deleting tab:', error);
            this.loading.delete = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete tab',
              life: 3000
            });
          }
        });
      }
    });
  }

  closeTabsModal(): void {
    this.showTabsModal = false;
    this.selectedForm = null;
  }

  // ============ FIELDS CRUD ============

  manageTabFields(tab: FormTabDto): void {
    this.selectedTab = { ...tab };
    this.loading.fields = true;
    
    this.formsService.getFields(tab.formBuilderId, tab.id).subscribe({
      next: (fields) => {
        this.selectedTab = { 
          ...tab, 
          fields: fields || [] 
        };
        this.showFieldsModal = true;
        this.loading.fields = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.selectedTab = { 
          ...tab, 
          fields: [] 
        };
        this.showFieldsModal = true;
        this.loading.fields = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddFieldModal(): void {
    if (!this.selectedTab) return;
    
    this.editingField = null;
    let nextOrder = 1;
    
    if (this.selectedTab.fields && this.selectedTab.fields.length > 0) {
      const maxOrder = Math.max(...this.selectedTab.fields.map(field => field.fieldOrder || 0));
      nextOrder = maxOrder + 1;
    }
    
    const defaultFieldTypeId = this.fieldTypes.length > 0 ? this.fieldTypes[0].id : '';
    
    this.fieldForm.reset({
      tabId: this.selectedTab.id,
      fieldTypeId: defaultFieldTypeId,
      fieldName: '',
      fieldCode: '',
      fieldOrder: nextOrder,
      placeholder: '',
      hintText: '',
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      defaultValue: '',
      isActive: true,
      dataType: 'string',
      regexPattern: '',
      validationMessage: '',
      minValue: null,
      maxValue: null,
      maxLength: null,
      readOnlyRuleJson: '{}',
      visibilityRuleJson: '{}'
    });
    this.showFieldModal = true;
  }

  openEditFieldModal(field: FormFieldDto): void {
    this.editingField = field;
    
    const fieldAny = field as any;
    
    this.fieldForm.patchValue({
      tabId: field.tabId,
      fieldTypeId: field.fieldTypeId,
      fieldName: field.fieldName,
      fieldCode: field.fieldCode,
      fieldOrder: field.fieldOrder || 1,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory !== false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      defaultValue: field.defaultValue || '',
      isActive: field.isActive !== false,
      dataType: fieldAny.dataType || 'string',
      regexPattern: fieldAny.regexPattern || '',
      validationMessage: fieldAny.validationMessage || '',
      minValue: fieldAny.minValue || null,
      maxValue: fieldAny.maxValue || null,
      maxLength: fieldAny.maxLength || null,
      readOnlyRuleJson: fieldAny.readOnlyRuleJson || '{}',
      visibilityRuleJson: fieldAny.visibilityRuleJson || '{}'
    });
    this.showFieldModal = true;
  }

  closeFieldModal(): void {
    this.showFieldModal = false;
    this.editingField = null;
    this.fieldForm.reset({
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      fieldOrder: 1,
      isActive: true,
      dataType: 'string',
      regexPattern: '',
      validationMessage: '',
      readOnlyRuleJson: '{}',
      visibilityRuleJson: '{}'
    });
  }

  saveField(): void {
    if (this.fieldForm.invalid || !this.selectedTab) {
      this.markFormGroupTouched(this.fieldForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly',
        life: 5000
      });
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
        placeholder: fieldData.placeholder,
        hintText: fieldData.hintText,
        isMandatory: fieldData.isMandatory,
        isEditable: fieldData.isEditable,
        isVisible: fieldData.isVisible,
        defaultValue: fieldData.defaultValue,
        isActive: fieldData.isActive
      };
      
      this.formsService.updateField(this.selectedTab.id, this.editingField.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Field updated successfully',
            life: 3000
          });
          this.refreshFields();
          this.closeFieldModal();
        },
        error: (error) => {
          console.error('Error updating field:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update field',
            life: 5000
          });
        }
      });
    } else {
      const createDto: any = {
        tabId: this.selectedTab.id,
        fieldTypeId: Number(fieldData.fieldTypeId),
        fieldName: fieldData.fieldName,
        fieldCode: fieldData.fieldCode.toUpperCase(),
        fieldOrder: Number(fieldData.fieldOrder || 1),
        placeholder: fieldData.placeholder || '',
        hintText: fieldData.hintText || '',
        isMandatory: Boolean(fieldData.isMandatory),
        isEditable: Boolean(fieldData.isEditable),
        isVisible: Boolean(fieldData.isVisible),
        defaultValueJson: fieldData.defaultValue || '',
        isActive: Boolean(fieldData.isActive),
        dataType: fieldData.dataType || 'string',
        regexPattern: fieldData.regexPattern || '',
        validationMessage: fieldData.validationMessage || `Please enter a valid ${fieldData.fieldName}`,
        minValue: fieldData.minValue ? Number(fieldData.minValue) : 0,
        maxValue: fieldData.maxValue ? Number(fieldData.maxValue) : 0,
        maxLength: fieldData.maxLength ? Number(fieldData.maxLength) : null,
        visibilityRuleJson: fieldData.visibilityRuleJson || '{}',
        readOnlyRuleJson: fieldData.readOnlyRuleJson || '{}',
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };
      
      Object.keys(createDto).forEach(key => {
        if (createDto[key] === null || createDto[key] === undefined || createDto[key] === '') {
          delete createDto[key];
        }
      });
      
      this.formsService.createField(createDto).subscribe({
        next: (newField) => {
          this.loading.save = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Field created successfully',
            life: 3000
          });
          
          if (!this.selectedTab!.fields) {
            this.selectedTab!.fields = [];
          }
          
          this.selectedTab = {
            ...this.selectedTab!,
            fields: [...this.selectedTab!.fields, newField]
          };
          
          this.updateFormCountersAfterFieldChange();
          this.closeFieldModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error creating field:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create field',
            life: 5000
          });
        }
      });
    }
  }

  updateFormCountersAfterFieldChange(): void {
    if (!this.selectedForm || !this.selectedTab) return;
    
    const formIndex = this.forms.findIndex(f => f.id === this.selectedForm?.id);
    if (formIndex !== -1 && this.selectedForm) {
      this.forms[formIndex].fieldsCount = this.getFormFieldsCount(this.selectedForm);
      this.updatePagination();
      this.cdr.detectChanges();
    }
  }

  refreshFields(): void {
    if (!this.selectedTab) return;
    
    this.loading.fields = true;
    this.formsService.getFields(this.selectedTab.formBuilderId, this.selectedTab.id)
      .subscribe({
        next: (fields) => {
          this.selectedTab = {
            ...this.selectedTab!,
            fields: fields || []
          };
          this.loading.fields = false;
          this.cdr.detectChanges();
          this.updateFormCountersAfterFieldChange();
        },
        error: (error) => {
          console.error('Error refreshing fields:', error);
          this.loading.fields = false;
        }
      });
  }

  deleteField(fieldId: number): void {
    if (!this.selectedTab) return;
    
    const fieldToDelete = this.selectedTab.fields?.find(f => f.id === fieldId);
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the field "${fieldToDelete?.fieldName || 'this field'}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.formsService.deleteField(this.selectedTab!.id, fieldId).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Field deleted successfully',
              life: 3000
            });
            this.refreshFields();
          },
          error: (error) => {
            console.error('Error deleting field:', error);
            this.loading.delete = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete field',
              life: 3000
            });
          }
        });
      }
    });
  }

  closeFieldsModal(): void {
    this.showFieldsModal = false;
    this.selectedTab = null;
  }

  // ============ VALIDATION HELPERS ============

  isFieldInvalid(fieldName: string): boolean {
    const field = this.formGroup.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  isTabFieldInvalid(fieldName: string): boolean {
    const field = this.tabForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  isFieldFieldInvalid(fieldName: string): boolean {
    const field = this.fieldForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ============ PAGINATION & SEARCH ============

  onSearch(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.forms = [...this.allForms];
    } else {
      const searchTerm = this.searchTerm.toLowerCase().trim();
      this.forms = this.allForms.filter(form => {
        const formNameMatch = form.formName?.toLowerCase().includes(searchTerm) || false;
        const formCodeMatch = form.formCode?.toLowerCase().includes(searchTerm) || false;
        const descriptionMatch = form.description?.toLowerCase().includes(searchTerm) || false;
        return formNameMatch || formCodeMatch || descriptionMatch;
      });
    }
    
    if (this.sortColumn) {
      this.sortForms();
    }
    
    this.currentPage = 1;
    this.updatePagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.forms = [...this.allForms];
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.forms.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedForms = this.forms.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortForms();
  }
getEndIndex(): number {
  const end = this.currentPage * this.itemsPerPage;
  return end > this.forms.length ? this.forms.length : end;
}
getFormDate(form: FormBuilderDto): string {
  // Check what date properties your form has
  // Adjust based on your actual FormBuilderDto properties
  
  // If you don't have a date property, return empty string
  if (!form) return '';
  
  // Try common date field names
  const dateValue = (form as any).modifiedOn || 
                    (form as any).updatedAt || 
                    (form as any).modifiedDate || 
                    (form as any).lastUpdated ||
                    (form as any).createdOn ||
                    (form as any).createdAt;
  
  return this.formatDate(dateValue);
}


  sortForms(): void {
    if (!this.sortColumn) return;

    this.forms.sort((a, b) => {
      let valueA = (a as any)[this.sortColumn];
      let valueB = (b as any)[this.sortColumn];

      if (valueA === undefined || valueA === null) valueA = '';
      if (valueB === undefined || valueB === null) valueB = '';

      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      if (strA < strB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (strA > strB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    

    this.currentPage = 1;
    this.updatePagination();
  }
}