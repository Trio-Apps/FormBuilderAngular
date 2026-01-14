import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ValidationService } from '../../angular-validation/services/validation.service';
import { ValidationErrorCollection, ValidationResponse } from '../../angular-validation/models/validation-error.model';

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionService {
  constructor(
    private http: HttpClient,
    private validationService: ValidationService
  ) {}

  /**
   * Submit form data with validation handling
   */
  submitForm<T>(
    url: string,
    formData: any,
    options?: {
      headers?: any;
      showValidationErrors?: boolean;
    }
  ): Observable<ValidationResponse<T>> {
    const showErrors = options?.showValidationErrors !== false;
    return this.http.post<T>(url, formData, { headers: options?.headers }).pipe(
      map(response => {
        // Assume success if no errors in response
        return this.validationService.createSuccessResponse(response);
      }),
      catchError((error: HttpErrorResponse) => {
        const validationErrors = this.validationService.extractValidationErrors(error);

        if (showErrors && !validationErrors.isEmpty()) {
          // Errors will be handled by the component
          console.warn('Form validation errors:', validationErrors.getAllErrors());
        }

        return of(this.validationService.createErrorResponse<T>(
          validationErrors.getAllErrors(),
          'Form submission failed'
        ));
      })
    );
  }

  /**
   * Submit form with file upload
   */
  submitFormWithFiles<T>(
    url: string,
    formData: FormData,
    options?: {
      showValidationErrors?: boolean;
    }
  ): Observable<ValidationResponse<T>> {
    return this.http.post<T>(url, formData).pipe(
      map(response => this.validationService.createSuccessResponse(response)),
      catchError((error: HttpErrorResponse) => {
        const validationErrors = this.validationService.extractValidationErrors(error);

        if (options?.showValidationErrors !== false && !validationErrors.isEmpty()) {
          console.warn('Form validation errors:', validationErrors.getAllErrors());
        }

        return of(this.validationService.createErrorResponse<T>(
          validationErrors.getAllErrors(),
          'Form submission with files failed'
        ));
      })
    );
  }

  /**
   * Update existing resource with validation
   */
  updateForm<T>(
    url: string,
    formData: any,
    options?: {
      headers?: any;
      showValidationErrors?: boolean;
    }
  ): Observable<ValidationResponse<T>> {
    return this.http.put<T>(url, formData, { headers: options?.headers }).pipe(
      map(response => this.validationService.createSuccessResponse(response)),
      catchError((error: HttpErrorResponse) => {
        const validationErrors = this.validationService.extractValidationErrors(error);

        if (options?.showValidationErrors !== false && !validationErrors.isEmpty()) {
          console.warn('Form update validation errors:', validationErrors.getAllErrors());
        }

        return of(this.validationService.createErrorResponse<T>(
          validationErrors.getAllErrors(),
          'Form update failed'
        ));
      })
    );
  }

  /**
   * Validate form data without submitting
   */
  validateForm(
    url: string,
    formData: any
  ): Observable<ValidationErrorCollection> {
    return this.http.post(url, formData).pipe(
      map(() => new ValidationErrorCollection()), // No errors if successful
      catchError((error: HttpErrorResponse) => {
        const validationErrors = this.validationService.extractValidationErrors(error);
        return of(validationErrors);
      })
    );
  }

  /**
   * Handle form submission result
   */
  handleSubmissionResult<T>(
    result: ValidationResponse<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onValidationError?: (errors: ValidationErrorCollection) => void;
      onError?: (message: string) => void;
    }
  ): void {
    if (result.success && result.data && options?.onSuccess) {
      options.onSuccess(result.data);
    } else if (result.errors && result.errors.length > 0 && options?.onValidationError) {
      const errorCollection = new ValidationErrorCollection(result.errors);
      options.onValidationError(errorCollection);
    } else if (!result.success && options?.onError) {
      options.onError(result.message || 'An error occurred');
    }
  }

  /**
   * Check if form has validation errors
   */
  hasValidationErrors(result: ValidationResponse<any>): boolean {
    return result.success === false && !!result.errors && result.errors.length > 0;
  }

  /**
   * Get validation errors from response
   */
  getValidationErrors(result: ValidationResponse<any>): ValidationErrorCollection {
    if (result.errors) {
      return new ValidationErrorCollection(result.errors);
    }
    return new ValidationErrorCollection();
  }

  /**
   * Create form data for file uploads
   */
  createFormData(data: any, fileFields?: string[]): FormData {
    const formData = new FormData();

    Object.keys(data).forEach(key => {
      const value = data[key];

      if (fileFields?.includes(key)) {
        // Handle file fields
        if (value instanceof FileList) {
          Array.from(value).forEach((file: File) => {
            formData.append(key, file);
          });
        } else if (value instanceof File) {
          formData.append(key, value);
        }
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            formData.append(`${key}[${index}]`, JSON.stringify(item));
          } else {
            formData.append(`${key}[${index}]`, item);
          }
        });
      } else if (value !== null && value !== undefined) {
        // Handle primitive values
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return formData;
  }
}
