import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldOptionsService } from '../../FormBuilder/services/field-options.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { FieldOptionDto, CreateFieldOptionDto, UpdateFieldOptionDto, FormFieldDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-field-options-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './field-options-list.component.html',
  styleUrls: ['./field-options-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class FieldOptionsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  fieldId?: number;

  // Data Arrays
  fieldOptions: FieldOptionDto[] = [];
  filteredFieldOptions: FieldOptionDto[] = [];
  fields: FormFieldDto[] = [];

  // Loading States
  loading = {
    fieldOptions: false,
    save: false,
    delete: false,
    fields: false
  };

  // Field Option Modal
  showFieldOptionModal = false;
  editingFieldOption: FieldOptionDto | null = null;

  // Reactive Form
  fieldOptionForm: FormGroup;

  // Search Filter
  searchTerm = '';
  selectedFieldId?: number;

  constructor(
    private route: ActivatedRoute,
    private fieldOptionsService: FieldOptionsService,
    private fieldsService: FieldsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Initialize the form
    this.fieldOptionForm = this.fb.group({
      fieldId: ['', Validators.required],
      optionValue: ['', [Validators.required, Validators.maxLength(100)]],
      optionText: ['', [Validators.required, Validators.maxLength(200)]],
      optionOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    // Get fieldId from route if available
    this.route.params.subscribe(params => {
      if (params['fieldId']) {
        this.fieldId = +params['fieldId'];
        this.selectedFieldId = this.fieldId;
        this.fieldOptionForm.patchValue({ fieldId: this.fieldId });
        this.loadFieldOptions();
      }
    });

    this.loadFields();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadFields(): void {
    this.loading.fields = true;
    // Note: You might need to adjust this based on your API structure
    // For now, we'll load fields from a specific form/tab if needed
    this.loading.fields = false;
  }

  loadFieldOptions(): void {
    if (!this.selectedFieldId) {
      this.fieldOptions = [];
      this.filteredFieldOptions = [];
      return;
    }

    this.loading.fieldOptions = true;
    this.fieldOptionsService.getFieldOptionsByFieldId(this.selectedFieldId).subscribe({
      next: (options: FieldOptionDto[]) => {
        this.fieldOptions = options.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));
        this.filteredFieldOptions = [...this.fieldOptions];
        this.loading.fieldOptions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.fieldOptions = [];
        this.filteredFieldOptions = [];
        this.loading.fieldOptions = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load field options' });
      }
    });
  }

  onFieldChange(): void {
    if (this.selectedFieldId) {
      this.fieldOptionForm.patchValue({ fieldId: this.selectedFieldId });
      this.loadFieldOptions();
    }
  }

  filterFieldOptions(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFieldOptions = [...this.fieldOptions];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredFieldOptions = this.fieldOptions.filter(option =>
      option.optionValue.toLowerCase().includes(term) ||
      option.optionText.toLowerCase().includes(term)
    );
  }

  openAddFieldOptionModal(): void {
    if (!this.selectedFieldId) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a field first' });
      return;
    }

    this.editingFieldOption = null;
    this.showFieldOptionModal = true;

    const nextOrder = this.fieldOptions.length > 0 
      ? Math.max(...this.fieldOptions.map(o => o.optionOrder || 0)) + 1 
      : 1;

    this.fieldOptionForm.reset({
      fieldId: this.selectedFieldId,
      optionValue: '',
      optionText: '',
      optionOrder: nextOrder,
      isActive: true
    });
  }

  openEditFieldOptionModal(fieldOption: FieldOptionDto): void {
    this.editingFieldOption = fieldOption;
    this.showFieldOptionModal = true;

    this.fieldOptionForm.patchValue({
      fieldId: fieldOption.fieldId || this.selectedFieldId,
      optionValue: fieldOption.optionValue || '',
      optionText: fieldOption.optionText || '',
      optionOrder: fieldOption.optionOrder || 1,
      isActive: fieldOption.isActive !== false
    });
  }

  closeFieldOptionModal(): void {
    this.showFieldOptionModal = false;
    this.editingFieldOption = null;
    this.fieldOptionForm.reset({
      isActive: true
    });
  }

  saveFieldOption(): void {
    if (this.fieldOptionForm.invalid) {
      this.markFormGroupTouched(this.fieldOptionForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const fieldOptionData = this.fieldOptionForm.value;

    if (this.editingFieldOption && this.editingFieldOption.id) {
      const updateDto: UpdateFieldOptionDto = {
        optionValue: fieldOptionData.optionValue,
        optionText: fieldOptionData.optionText,
        optionOrder: Number(fieldOptionData.optionOrder),
        isActive: fieldOptionData.isActive !== false
      };

      this.fieldOptionsService.updateFieldOption(this.editingFieldOption.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadFieldOptions();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field option updated successfully' });
          this.closeFieldOptionModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to update field option';
          if (error.error?.message) errorMessage = error.error.message;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    } else {
      const createDto: CreateFieldOptionDto = {
        fieldId: Number(fieldOptionData.fieldId),
        optionValue: fieldOptionData.optionValue,
        optionText: fieldOptionData.optionText,
        optionOrder: Number(fieldOptionData.optionOrder),
        isActive: fieldOptionData.isActive !== false
      };

      this.fieldOptionsService.createFieldOption(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadFieldOptions();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field option created successfully' });
          this.closeFieldOptionModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to create field option';
          if (error.error?.message) errorMessage = error.error.message;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    }
  }

  deleteFieldOption(optionId: number): void {
    const optionToDelete = this.fieldOptions.find(o => o.id === optionId);
    if (!optionToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the option "${optionToDelete.optionText}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.fieldOptionsService.deleteFieldOption(optionId).subscribe({
          next: () => {
            this.loading.delete = false;
            this.loadFieldOptions();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Field option deleted successfully' });
          },
          error: () => {
            this.loading.delete = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete field option' });
          }
        });
      }
    });
  }

  toggleFieldOptionStatus(fieldOption: FieldOptionDto): void {
    if (!fieldOption.id) return;

    const newStatus = !fieldOption.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the option "${fieldOption.optionText}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fieldOptionsService.updateFieldOption(fieldOption.id!, { isActive: newStatus }).subscribe({
          next: () => {
            this.loadFieldOptions();
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: `Field option ${action}d successfully` 
            });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to ${action} field option` });
          }
        });
      }
    });
  }

  getFieldOptionStatusClass(fieldOption: FieldOptionDto): string {
    if (!fieldOption.isActive) return 'status-inactive';
    return 'status-active';
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
    const control = this.fieldOptionForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.fieldOptionForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
    return 'Invalid value';
  }
}
