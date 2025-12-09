import { Component, OnInit } from '@angular/core';
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

// Import CoreUI modules
import { 
  FormModule,
  GridModule,
  CardModule,
  BadgeModule
} from '@coreui/angular';

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
    // CoreUI modules
    FormModule,
    GridModule,
    CardModule,
    BadgeModule,
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
  
  // Field Types - Using proper typing
  fieldTypes: { label: string; value: number }[] = [
    { label: 'Text', value: 1 },
    { label: 'Number', value: 2 },
    { label: 'Date', value: 3 },
    { label: 'Email', value: 4 },
    { label: 'Phone', value: 5 },
    { label: 'Select', value: 6 },
    { label: 'Checkbox', value: 7 },
    { label: 'Radio', value: 8 },
    { label: 'Text Area', value: 9 },
    { label: 'Password', value: 10 },
    { label: 'File', value: 11 }
  ];

  // For dropdown binding
  selectedFieldType: number = 1;

  // Search
  searchTerm: string = '';

  // Loading States
  loading = {
    forms: false,
    save: false,
    delete: false,
    tabs: false,
    fields: false
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
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadForms();
    this.initForms();
  }

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
      isActive: [true] // ADDED
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
      isActive: [true] // ADDED
    });

    // Field Form
    this.fieldForm = this.fb.group({
      tabId: [null, [Validators.required]],
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
      fieldTypeId: [1, [Validators.required]],
      isActive: [true] // ADDED
    });

    // Auto-clean form code
    this.formGroup.get('formCode')?.valueChanges.subscribe(value => {
      if (value) {
        const cleanedValue = value.replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
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
  }

  // ============ HELPER METHODS ============

  getFieldTypeLabel(fieldTypeId: number | undefined | null): string {
    if (fieldTypeId === undefined || fieldTypeId === null) {
      return 'Unknown Type';
    }
    
    const fieldType = this.fieldTypes.find(ft => ft.value === fieldTypeId);
    return fieldType ? fieldType.label : `Type ${fieldTypeId}`;
  }

  getFormTabs(): FormTabDto[] {
    return this.selectedForm?.tabs || [];
  }

  getTabFields(): FormFieldDto[] {
    return this.selectedTab?.fields || [];
  }

  // Getter for field type control
  get fieldTypeIdControl(): FormControl {
    return this.fieldForm.get('fieldTypeId') as FormControl;
  }

  // ============ FORM CRUD ============

  loadForms(): void {
    this.loading.forms = true;
    
    this.formsService.getForms().subscribe({
      next: (data) => {
        this.allForms = data;
        this.forms = [...data];
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
          this.allForms.unshift(newForm);
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

  deleteForm(id: number): void {
    const formToDelete = this.forms.find(f => f.id === id);
    
    if (!formToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the form "${formToDelete.formName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
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
      }
    });
  }

  // ============ TABS CRUD ============

manageTabs(form: FormBuilderDto): void {
    this.selectedForm = form;
    this.loading.tabs = true;
    
    // استدعاء خدمة التبويبات مع معالجة الخطأ
    this.formsService.getTabs(form.id).subscribe({
      next: (tabs) => {
        // تأكد من أن tabs دائماً مصفوفة (حتى لو كانت فارغة)
        this.selectedForm!.tabs = tabs || [];
        this.showTabsModal = true;
        this.loading.tabs = false;
      },
      error: (error) => {
        console.error('Error loading tabs:', error);
        // حتى لو حدث خطأ، عيّن مصفوفة فارغة
        this.selectedForm!.tabs = [];
        this.showTabsModal = true;
        this.loading.tabs = false;
        
        // عرض رسالة تحذير فقط (لا تمنع المستخدم من إضافة تبويبات)
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Could not load existing tabs, but you can still add new ones',
          life: 3000
        });
      }
    });
  }

  openAddTabModal(): void {
    if (!this.selectedForm) return;
    
    this.editingTab = null;
    
    // حساب ترتيب التبويب الجديد
    let nextOrder = 1;
    if (this.selectedForm.tabs && this.selectedForm.tabs.length > 0) {
      // البحث عن أعلى ترتيب موجود
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
          this.manageTabs(this.selectedForm!);
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
          this.selectedForm!.tabs.push(newTab);
          this.closeTabModal();
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

  deleteTab(tabId: number): void {
    if (!this.selectedForm) return;
    
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this tab?',
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
            this.manageTabs(this.selectedForm!);
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
    this.selectedTab = tab;
    this.loading.fields = true;
    
    this.formsService.getFields(tab.formBuilderId, tab.id).subscribe({
      next: (fields) => {
        this.selectedTab!.fields = fields;
        this.showFieldsModal = true;
        this.loading.fields = false;
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.loading.fields = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load fields',
          life: 3000
        });
      }
    });
  }

  openAddFieldModal(): void {
    if (!this.selectedTab) return;
    
    this.editingField = null;
    this.selectedFieldType = 1;
    
    this.fieldForm.reset({
      tabId: this.selectedTab.id,
      fieldName: '',
      fieldCode: '',
      placeholder: '',
      hintText: '',
      isMandatory: false,
      isEditable: true,
      isVisible: true,
      defaultValue: '',
      fieldOrder: this.selectedTab?.fields?.length ? this.selectedTab.fields.length + 1 : 1,
      fieldTypeId: 1,
      isActive: true
    });
    this.showFieldModal = true;
  }

  openEditFieldModal(field: FormFieldDto): void {
    this.editingField = field;
    this.selectedFieldType = field.fieldTypeId || 1;
    
    this.fieldForm.patchValue({
      tabId: field.tabId,
      fieldName: field.fieldName,
      fieldCode: field.fieldCode,
      placeholder: field.placeholder || '',
      hintText: field.hintText || '',
      isMandatory: field.isMandatory || false,
      isEditable: field.isEditable !== false,
      isVisible: field.isVisible !== false,
      defaultValue: field.defaultValue || '',
      fieldOrder: field.fieldOrder || 1,
      fieldTypeId: field.fieldTypeId || 1,
      isActive: field.isActive !== false
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
      fieldTypeId: 1,
      isActive: true
    });
  }

  saveField(): void {
    if (this.fieldForm.invalid || !this.selectedTab) {
      this.markFormGroupTouched(this.fieldForm);
      return;
    }

    this.loading.save = true;
    const fieldData = this.fieldForm.value;

    if (this.editingField) {
      const updateDto: UpdateFormFieldDto = { 
        fieldName: fieldData.fieldName,
        fieldCode: fieldData.fieldCode,
        placeholder: fieldData.placeholder,
        hintText: fieldData.hintText,
        isMandatory: fieldData.isMandatory,
        isEditable: fieldData.isEditable,
        isVisible: fieldData.isVisible,
        defaultValue: fieldData.defaultValue,
        fieldTypeId: fieldData.fieldTypeId,
        fieldOrder: fieldData.fieldOrder,
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
          this.manageTabFields(this.selectedTab!);
          this.closeFieldModal();
        },
        error: (error) => {
          console.error('Error updating field:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update field',
            life: 3000
          });
        }
      });
    } else {
      const createDto: CreateFormFieldDto = {
        tabId: this.selectedTab.id,
        fieldName: fieldData.fieldName,
        fieldCode: fieldData.fieldCode,
        placeholder: fieldData.placeholder,
        hintText: fieldData.hintText,
        isMandatory: fieldData.isMandatory,
        isEditable: fieldData.isEditable,
        isVisible: fieldData.isVisible,
        defaultValueJson: fieldData.defaultValue,
        fieldTypeId: fieldData.fieldTypeId,
        fieldOrder: fieldData.fieldOrder,
        isActive: fieldData.isActive
      };
      
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
          this.selectedTab!.fields.push(newField);
          this.closeFieldModal();
        },
        error: (error) => {
          console.error('Error creating field:', error);
          this.loading.save = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create field',
            life: 3000
          });
        }
      });
    }
  }

  deleteField(fieldId: number): void {
    if (!this.selectedTab) return;
    
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this field?',
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
            this.manageTabFields(this.selectedTab!);
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

  // Handle field type change
  onFieldTypeChange(event: any): void {
    const value = Number(event.target.value);
    this.fieldForm.controls['fieldTypeId'].setValue(value);
  }

  // ============ OTHER HELPER METHODS ============

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

  getFieldError(fieldName: string): string {
    const field = this.formGroup.get(fieldName);
    
    if (!field || !field.errors || !field.touched) return '';
    
    if (field.errors['required']) {
      return 'This field is required';
    }
    
    if (field.errors['minlength']) {
      const requiredLength = field.errors['minlength'].requiredLength;
      return `Minimum length is ${requiredLength} characters`;
    }
    
    if (field.errors['maxlength']) {
      const requiredLength = field.errors['maxlength'].requiredLength;
      return `Maximum length is ${requiredLength} characters`;
    }
    
    if (field.errors['pattern']) {
      return 'Only uppercase letters, numbers and underscores are allowed';
    }
    
    return 'Invalid value';
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

  handleEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSearch();
    }
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