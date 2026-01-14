export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export class ValidationErrorCollection {
  private errors: Map<string, ValidationError[]> = new Map();

  constructor(errors?: ValidationError[]) {
    if (errors) {
      this.addErrors(errors);
    }
  }

  addError(error: ValidationError): void {
    const fieldErrors = this.errors.get(error.field) || [];
    fieldErrors.push(error);
    this.errors.set(error.field, fieldErrors);
  }

  addErrors(errors: ValidationError[]): void {
    errors.forEach(error => this.addError(error));
  }

  getFieldErrors(fieldName: string): ValidationError[] {
    return this.errors.get(fieldName) || [];
  }

  hasFieldError(fieldName: string): boolean {
    return this.getFieldErrors(fieldName).length > 0;
  }

  getFieldErrorMessage(fieldName: string): string {
    const errors = this.getFieldErrors(fieldName);
    return errors.length > 0 ? errors[0].message : '';
  }

  getAllErrors(): ValidationError[] {
    const allErrors: ValidationError[] = [];
    this.errors.forEach(fieldErrors => {
      allErrors.push(...fieldErrors);
    });
    return allErrors;
  }

  getErrorFields(): string[] {
    return Array.from(this.errors.keys());
  }

  clearFieldErrors(fieldName: string): void {
    this.errors.delete(fieldName);
  }

  clearAllErrors(): void {
    this.errors.clear();
  }

  isEmpty(): boolean {
    return this.errors.size === 0;
  }

  getTotalErrorCount(): number {
    let count = 0;
    this.errors.forEach(fieldErrors => {
      count += fieldErrors.length;
    });
    return count;
  }
}

export interface ValidationResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  message?: string;
}
