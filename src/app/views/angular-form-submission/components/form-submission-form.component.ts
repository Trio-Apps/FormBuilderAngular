import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ValidationService } from '../../angular-validation/services/validation.service';
import { FormSubmissionService, FormSubmissionDto } from '../services/form-submission.service';
import { ValidationErrorCollection, ValidationResponse } from '../../angular-validation/models/validation-error.model';
import { ValidationErrorDisplayComponent } from '../../angular-validation/components/validation-error-display.component';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    customValidators?: ValidatorFn[];
  };
}

@Component({
  selector: 'app-form-submission-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ValidationErrorDisplayComponent
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-submission-form">
      <!-- Status Display -->
      <div *ngIf="submissionStatus" class="status-display">
        <label class="status-label">Status:</label>
        <span [ngClass]="getStatusClass()">{{ submissionStatus }}</span>
      </div>

      <div class="form-field" *ngFor="let field of fields">
        <label [for]="field.name" class="form-label">
          {{ field.label }}
          <span *ngIf="field.required" class="required">*</span>
        </label>

        <!-- Text, Email, Password, Number, Tel, URL inputs -->
        <input
          *ngIf="field.type !== 'textarea' && field.type !== 'select' && field.type !== 'checkbox' && field.type !== 'file'"
          [id]="field.name"
          [type]="field.type"
          [formControlName]="field.name"
          [placeholder]="field.placeholder || ''"
          class="form-control"
          [class.is-invalid]="isFieldInvalid(field.name)"
        />

        <!-- Textarea -->
        <textarea
          *ngIf="field.type === 'textarea'"
          [id]="field.name"
          [formControlName]="field.name"
          [placeholder]="field.placeholder || ''"
          class="form-control"
          [class.is-invalid]="isFieldInvalid(field.name)"
          rows="3"
        ></textarea>

        <!-- Select -->
        <select
          *ngIf="field.type === 'select'"
          [id]="field.name"
          [formControlName]="field.name"
          class="form-control"
          [class.is-invalid]="isFieldInvalid(field.name)"
        >
          <option value="">{{ field.placeholder || 'Select an option' }}</option>
          <option *ngFor="let option of field.options" [value]="option.value">
            {{ option.label }}
          </option>
        </select>

        <!-- Checkbox -->
        <div *ngIf="field.type === 'checkbox'" class="form-check">
          <input
            [id]="field.name"
            type="checkbox"
            [formControlName]="field.name"
            class="form-check-input"
            [class.is-invalid]="isFieldInvalid(field.name)"
          />
          <label [for]="field.name" class="form-check-label">
            {{ field.label }}
          </label>
        </div>

        <!-- File input -->
        <input
          *ngIf="field.type === 'file'"
          [id]="field.name"
          type="file"
          [formControlName]="field.name"
          class="form-control"
          [class.is-invalid]="isFieldInvalid(field.name)"
          (change)="onFileChange($event, field.name)"
        />

        <!-- Validation Errors -->
        <app-validation-error-display
          [errors]="getFieldErrors(field.name)"
          [fieldName]="field.name"
        ></app-validation-error-display>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="isSubmitting || form.invalid"
        >
          <span *ngIf="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
          {{ submitButtonText }}
        </button>

        <button
          *ngIf="showCancelButton"
          type="button"
          class="btn btn-secondary ms-2"
          (click)="onCancel()"
          [disabled]="isSubmitting"
        >
          {{ cancelButtonText }}
        </button>
      </div>

      <!-- General Form Errors -->
      <div *ngIf="generalErrors.length > 0" class="alert alert-danger mt-3">
        <ul class="mb-0">
          <li *ngFor="let error of generalErrors">{{ error }}</li>
        </ul>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage || saveMessage" class="alert alert-success mt-3">
        {{ saveMessage || successMessage }}
      </div>
    </form>
  `,
  styles: [`
    .form-submission-form {
      max-width: 100%;
    }

    .form-field {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .required {
      color: #dc3545;
    }

    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 0.375rem;
      font-size: 1rem;
      line-height: 1.5;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }

    .form-control:focus {
      outline: 0;
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .form-control.is-invalid {
      border-color: #dc3545;
    }

    .form-control.is-invalid:focus {
      border-color: #dc3545;
      box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
    }

    textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }

    select.form-control {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem;
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-check-input {
      width: auto;
      margin: 0;
    }

    .form-check-label {
      margin: 0;
      font-weight: normal;
    }

    .form-actions {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      border: 1px solid transparent;
      border-radius: 0.375rem;
      font-size: 1rem;
      font-weight: 400;
      line-height: 1.5;
      text-align: center;
      text-decoration: none;
      vertical-align: middle;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      gap: 0.5rem;
    }

    .btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-primary {
      color: #fff;
      background-color: #007bff;
      border-color: #007bff;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #0056b3;
      border-color: #004085;
    }

    .btn-secondary {
      color: #6c757d;
      background-color: transparent;
      border-color: #6c757d;
    }

    .btn-secondary:hover:not(:disabled) {
      color: #fff;
      background-color: #6c757d;
    }

    .alert {
      padding: 0.75rem 1rem;
      border: 1px solid transparent;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
    }

    .alert-danger {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }

    .alert-success {
      color: #155724;
      background-color: #d4edda;
      border-color: #c3e6cb;
    }

    .status-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
      background-color: #f8f9fa;
      border-radius: 0.375rem;
    }

    .status-label {
      font-weight: 500;
      color: #495057;
      margin: 0;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.375rem;
      text-transform: capitalize;
    }

    .status-draft {
      background-color: #6c757d;
      color: #fff;
    }

    .status-submitted {
      background-color: #007bff;
      color: #fff;
    }

    .status-approved {
      background-color: #28a745;
      color: #fff;
    }

    .status-rejected {
      background-color: #dc3545;
      color: #fff;
    }

    .status-default {
      background-color: #6c757d;
      color: #fff;
    }

    .spinner-border {
      width: 1rem;
      height: 1rem;
      border: 0.25em solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spinner-border 0.75s linear infinite;
    }

    @keyframes spinner-border {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class FormSubmissionFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() fields: FormField[] = [];
  @Input() submitUrl: string = '';
  @Input() submitButtonText: string = 'Submit';
  @Input() cancelButtonText: string = 'Cancel';
  @Input() showCancelButton: boolean = false;
  @Input() initialValues: any = {};
  @Input() submissionId?: number;
  @Input() currentStatus: string = 'Draft';
  @Input() saveUrl?: string;

  @Output() formSubmit = new EventEmitter<any>();
  @Output() formSuccess = new EventEmitter<any>();
  @Output() formError = new EventEmitter<ValidationErrorCollection>();
  @Output() formCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<FormSubmissionDto>();
  @Output() onStatusChange = new EventEmitter<string>();

  form: FormGroup;
  isSubmitting = false;
  validationErrors = new ValidationErrorCollection();
  generalErrors: string[] = [];
  successMessage = '';
  saveMessage = '';
  submissionStatus: string = 'Draft';
  private successMessageTimeout?: any;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private validationService: ValidationService,
    private formSubmissionService: FormSubmissionService
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.submissionStatus = this.currentStatus || 'Draft';
    this.buildForm();
    this.setupFormValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStatus'] && !changes['currentStatus'].firstChange) {
      this.submissionStatus = changes['currentStatus'].currentValue || 'Draft';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.successMessageTimeout) {
      clearTimeout(this.successMessageTimeout);
    }
  }

  private buildForm(): void {
    const formControls: any = {};

    this.fields.forEach(field => {
      const validators = this.buildValidators(field);
      const initialValue = this.getInitialValue(field.name);

      formControls[field.name] = [initialValue, validators];
    });

    this.form = this.fb.group(formControls);
  }

  private buildValidators(field: FormField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) {
      validators.push(Validators.required);
    }

    if (field.validation) {
      if (field.validation.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }

      if (field.validation.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }

      if (field.validation.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }

      if (field.validation.min !== undefined) {
        validators.push(Validators.min(field.validation.min));
      }

      if (field.validation.max !== undefined) {
        validators.push(Validators.max(field.validation.max));
      }

      // Add custom validators
      if (field.validation.customValidators) {
        validators.push(...field.validation.customValidators);
      }
    }

    // Add type-specific validators
    switch (field.type) {
      case 'email':
        validators.push(Validators.email);
        break;
      case 'url':
        validators.push(Validators.pattern(/^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-./?%&=]*)?$/));
        break;
      case 'tel':
        validators.push(Validators.pattern(/^[\+]?[0-9\-\(\)\s]{6,}$/));
        break;
    }

    return validators;
  }

  private getInitialValue(fieldName: string): any {
    return this.initialValues[fieldName] || '';
  }

  private setupFormValidation(): void {
    // Clear server errors when user starts typing
    this.fields.forEach(field => {
      const control = this.form.get(field.name);
      if (control) {
        this.subscriptions.push(
          control.valueChanges.subscribe(() => {
            this.validationService.clearFieldErrors(this.form, field.name);
            this.clearFieldValidationErrors(field.name);
          })
        );
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.markFormGroupTouched();
      return;
    }

    // Use save() if saveUrl is provided, otherwise use submitForm
    if (this.saveUrl && this.submissionId) {
      this.save();
    } else {
      this.isSubmitting = true;
      this.clearMessages();

      const formValue = this.form.value;

      this.formSubmissionService.submitForm(this.submitUrl, formValue)
        .subscribe(result => {
          this.isSubmitting = false;
          this.handleSubmissionResult(result);
        });
    }
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting || !this.saveUrl || !this.submissionId) {
      if (this.form.invalid) {
        this.markFormGroupTouched();
      }
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const formValue = this.form.value;

    this.formSubmissionService.saveFormSubmissionData(this.saveUrl, formValue)
      .subscribe(result => {
        this.isSubmitting = false;
        this.handleSaveResult(result);
      });
  }

  private handleSaveResult(result: { success: boolean; message: string; data: FormSubmissionDto }): void {
    if (result.success && result.data) {
      // Update status from response
      const newStatus = result.data.status || this.submissionStatus;
      const statusChanged = newStatus !== this.submissionStatus;

      if (statusChanged) {
        this.submissionStatus = newStatus;
        this.onStatusChange.emit(newStatus);
      }

      // Show success message
      this.saveMessage = result.message || 'Form saved successfully!';
      this.successMessage = this.saveMessage;

      // Hide message after 5 seconds
      if (this.successMessageTimeout) {
        clearTimeout(this.successMessageTimeout);
      }
      this.successMessageTimeout = setTimeout(() => {
        this.saveMessage = '';
        this.successMessage = '';
      }, 5000);

      // Emit events
      this.onSave.emit(result.data);
      this.formSuccess.emit(result.data);
    } else {
      // Handle error
      this.generalErrors = [result.message || 'Failed to save form submission'];
      this.formError.emit(this.validationErrors);
    }
  }

  private handleSubmissionResult(result: ValidationResponse<any>): void {
    if (result.success && result.data) {
      this.successMessage = result.message || 'Form submitted successfully!';
      this.formSuccess.emit(result.data);
      this.formSubmit.emit(result.data);
    } else if (result.errors && result.errors.length > 0) {
      this.validationErrors = new ValidationErrorCollection(result.errors);

      // Set errors on form controls
      result.errors.forEach(error => {
        this.validationService.setFieldErrors(this.form, error.field, [error]);
      });

      this.formError.emit(this.validationErrors);

      // Show general errors if any
      const generalErrors = this.validationErrors.getFieldErrors('general');
      this.generalErrors = generalErrors.map(e => e.message);
    }
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  onFileChange(event: any, fieldName: string): void {
    const file = event.target.files[0];
    if (file) {
      this.form.patchValue({ [fieldName]: file });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldErrors(fieldName: string): any[] {
    const serverErrors = this.validationErrors.getFieldErrors(fieldName);
    const clientErrors = this.getClientValidationErrors(fieldName);

    return [...serverErrors, ...clientErrors];
  }

  private getClientValidationErrors(fieldName: string): any[] {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !(control.dirty || control.touched)) {
      return [];
    }

    const errors: any[] = [];
    const field = this.fields.find(f => f.name === fieldName);

    Object.keys(control.errors).forEach(errorKey => {
      let message = '';

      switch (errorKey) {
        case 'required':
          message = `${field?.label || fieldName} is required`;
          break;
        case 'email':
          message = 'Please enter a valid email address';
          break;
        case 'minlength':
          message = `${field?.label || fieldName} must be at least ${control.errors![errorKey].requiredLength} characters`;
          break;
        case 'maxlength':
          message = `${field?.label || fieldName} must not exceed ${control.errors![errorKey].requiredLength} characters`;
          break;
        case 'pattern':
          message = this.getPatternErrorMessage(field);
          break;
        case 'min':
          message = `${field?.label || fieldName} must be at least ${control.errors![errorKey].min}`;
          break;
        case 'max':
          message = `${field?.label || fieldName} must not exceed ${control.errors![errorKey].max}`;
          break;
        default:
          message = control.errors![errorKey].message || `${field?.label || fieldName} is invalid`;
      }

      errors.push({ field: fieldName, message, code: errorKey });
    });

    return errors;
  }

  private getPatternErrorMessage(field: FormField | undefined): string {
    if (!field) return 'Invalid format';

    switch (field.type) {
      case 'url':
        return 'Please enter a valid URL';
      case 'tel':
        return 'Please enter a valid phone number';
      default:
        return 'Please enter a valid format';
    }
  }

  private clearFieldValidationErrors(fieldName: string): void {
    this.validationErrors.clearFieldErrors(fieldName);
  }

  private clearMessages(): void {
    this.generalErrors = [];
    this.successMessage = '';
    this.validationErrors.clearAllErrors();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  resetForm(): void {
    this.form.reset();
    this.clearMessages();
    this.validationErrors.clearAllErrors();
  }

  setFormValue(values: any): void {
    this.form.patchValue(values);
  }

  getFormValue(): any {
    return this.form.value;
  }

  isFormValid(): boolean {
    return this.form.valid;
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(): string {
    const status = this.submissionStatus.toLowerCase();
    switch (status) {
      case 'draft':
        return 'status-badge status-draft';
      case 'submitted':
        return 'status-badge status-submitted';
      case 'approved':
        return 'status-badge status-approved';
      case 'rejected':
        return 'status-badge status-rejected';
      default:
        return 'status-badge status-default';
    }
  }
}
