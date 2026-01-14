import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ValidationError, ValidationErrorCollection, ValidationResponse } from '../models/validation-error.model';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  /**
   * Extract validation errors from various response formats
   */
  extractValidationErrors(response: any): ValidationErrorCollection {
    const errors = new ValidationErrorCollection();

    if (!response) {
      return errors;
    }

    // Handle HttpErrorResponse
    if (response instanceof HttpErrorResponse) {
      return this.extractFromHttpErrorResponse(response);
    }

    // Handle ValidationResponse format
    if (this.isValidationResponse(response)) {
      if (response.errors) {
        errors.addErrors(response.errors);
      }
      return errors;
    }

    // Handle Laravel-style validation errors
    if (response.errors && typeof response.errors === 'object') {
      return this.extractLaravelValidationErrors(response.errors);
    }

    // Handle generic error objects
    if (response.error && response.error.errors) {
      return this.extractValidationErrors(response.error);
    }

    // Handle array of errors
    if (Array.isArray(response)) {
      errors.addErrors(response.filter(this.isValidationError));
      return errors;
    }

    return errors;
  }

  /**
   * Extract errors from HttpErrorResponse
   */
  private extractFromHttpErrorResponse(response: HttpErrorResponse): ValidationErrorCollection {
    const errors = new ValidationErrorCollection();

    if (response.error) {
      // Try to extract from error body
      const extractedErrors = this.extractValidationErrors(response.error);
      if (!extractedErrors.isEmpty()) {
        return extractedErrors;
      }
    }

    // Fallback: create generic error
    if (response.status === 422) {
      errors.addError({
        field: 'general',
        message: 'Validation failed. Please check your input.',
        code: 'VALIDATION_FAILED'
      });
    } else {
      errors.addError({
        field: 'general',
        message: response.message || 'An error occurred.',
        code: 'HTTP_ERROR'
      });
    }

    return errors;
  }

  /**
   * Extract Laravel-style validation errors
   */
  private extractLaravelValidationErrors(laravelErrors: any): ValidationErrorCollection {
    const errors = new ValidationErrorCollection();

    Object.keys(laravelErrors).forEach(field => {
      const fieldErrors = laravelErrors[field];
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach(message => {
          errors.addError({
            field: this.normalizeFieldName(field),
            message: message,
            code: 'LARAVEL_VALIDATION'
          });
        });
      } else if (typeof fieldErrors === 'string') {
        errors.addError({
          field: this.normalizeFieldName(field),
          message: fieldErrors,
          code: 'LARAVEL_VALIDATION'
        });
      }
    });

    return errors;
  }

  /**
   * Get field-specific errors
   */
  getFieldErrors(errorCollection: ValidationErrorCollection, fieldName: string): ValidationError[] {
    return errorCollection.getFieldErrors(fieldName);
  }

  /**
   * Check if a field has errors
   */
  hasFieldError(errorCollection: ValidationErrorCollection, fieldName: string): boolean {
    return errorCollection.hasFieldError(fieldName);
  }

  /**
   * Get the first error message for a field
   */
  getFieldErrorMessage(errorCollection: ValidationErrorCollection, fieldName: string): string {
    return errorCollection.getFieldErrorMessage(fieldName);
  }

  /**
   * Get all errors as a formatted string
   */
  getAllErrorMessages(errorCollection: ValidationErrorCollection, separator: string = '\n'): string {
    const allErrors = errorCollection.getAllErrors();
    return allErrors.map(error => error.message).join(separator);
  }

  /**
   * Create a ValidationResponse
   */
  createValidationResponse<T>(
    success: boolean,
    data?: T,
    errors?: ValidationError[],
    message?: string
  ): ValidationResponse<T> {
    return {
      success,
      data,
      errors,
      message
    };
  }

  /**
   * Create success response
   */
  createSuccessResponse<T>(data?: T, message?: string): ValidationResponse<T> {
    return this.createValidationResponse(true, data, undefined, message);
  }

  /**
   * Create error response
   */
  createErrorResponse<T>(errors: ValidationError[], message?: string): ValidationResponse<T> {
    return this.createValidationResponse<T>(false, undefined, errors, message);
  }

  /**
   * Normalize field names (convert array notation to dot notation)
   */
  private normalizeFieldName(fieldName: string): string {
    // Convert array notation like 'items[0].name' to 'items.0.name'
    return fieldName.replace(/\[/g, '.').replace(/\]/g, '');
  }

  /**
   * Check if object is a ValidationError
   */
  private isValidationError(obj: any): obj is ValidationError {
    return obj &&
           typeof obj === 'object' &&
           typeof obj.field === 'string' &&
           typeof obj.message === 'string';
  }

  /**
   * Check if object is a ValidationResponse
   */
  private isValidationResponse(obj: any): obj is ValidationResponse {
    return obj &&
           typeof obj === 'object' &&
           typeof obj.success === 'boolean' &&
           (obj.data === undefined || obj.errors === undefined || Array.isArray(obj.errors));
  }

  /**
   * Clear field errors from a form (useful for reactive forms)
   */
  clearFieldErrors(form: any, fieldName: string): void {
    if (form && form.get && form.get(fieldName)) {
      const control = form.get(fieldName);
      control.setErrors(null);
      control.markAsUntouched();
    }
  }

  /**
   * Set field errors on a form control
   */
  setFieldErrors(form: any, fieldName: string, errors: ValidationError[]): void {
    if (form && form.get && form.get(fieldName) && errors.length > 0) {
      const control = form.get(fieldName);
      const errorObject: { [key: string]: any } = {};
      errors.forEach(error => {
        errorObject[error.code || 'serverError'] = error.message;
      });
      control.setErrors(errorObject);
      control.markAsTouched();
    }
  }
}
