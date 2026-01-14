import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationError } from '../models/validation-error.model';

@Component({
  selector: 'app-validation-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="validation-errors" *ngIf="errors && errors.length > 0">
      <div class="error-message" *ngFor="let error of errors">
        <i class="pi pi-exclamation-triangle error-icon"></i>
        <span>{{ error.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .validation-errors {
      margin-top: 0.25rem;
    }

    .error-message {
      display: flex;
      align-items: center;
      color: #dc3545;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin-bottom: 0.25rem;
    }

    .error-message:last-child {
      margin-bottom: 0;
    }

    .error-icon {
      margin-right: 0.5rem;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    /* RTL support */
    [dir="rtl"] .error-icon {
      margin-right: 0;
      margin-left: 0.5rem;
    }
  `]
})
export class ValidationErrorDisplayComponent implements OnChanges {
  @Input() errors: ValidationError[] = [];
  @Input() fieldName?: string;
  @Input() showMultipleErrors: boolean = true;
  @Input() maxErrors: number = 3;

  displayedErrors: ValidationError[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['errors']) {
      this.updateDisplayedErrors();
    }
  }

  private updateDisplayedErrors(): void {
    if (!this.errors || this.errors.length === 0) {
      this.displayedErrors = [];
      return;
    }

    if (this.showMultipleErrors) {
      this.displayedErrors = this.errors.slice(0, this.maxErrors);
    } else {
      this.displayedErrors = this.errors.length > 0 ? [this.errors[0]] : [];
    }
  }

  /**
   * Get CSS classes for styling
   */
  getErrorClasses(): string {
    const baseClasses = ['validation-errors'];
    if (this.errors && this.errors.length > 0) {
      baseClasses.push('has-errors');
    }
    return baseClasses.join(' ');
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors && this.errors.length > 0;
  }

  /**
   * Get the first error message
   */
  getFirstErrorMessage(): string {
    return this.hasErrors() ? this.errors[0].message : '';
  }

  /**
   * Get all error messages as a single string
   */
  getAllErrorMessages(separator: string = ' '): string {
    if (!this.hasErrors()) return '';
    return this.errors.map(error => error.message).join(separator);
  }
}
