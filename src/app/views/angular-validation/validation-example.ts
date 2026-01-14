// مثال بسيط لاستخدام نظام Validation
// Simple example of using the Validation system

import { FormSubmissionFormComponent } from '../angular-form-submission/components/form-submission-form.component';
import { ValidationService } from './services/validation.service';
import { FormSubmissionService } from '../angular-form-submission/services/form-submission.service';

// في Component الخاص بك - In your component
export class ExampleComponent {
  constructor(
    private validationService: ValidationService,
    private formSubmissionService: FormSubmissionService
  ) {}

  // تعريف الحقول - Define fields
  fields = [
    {
      name: 'email',
      label: 'البريد الإلكتروني',
      type: 'email' as const,
      required: true,
      placeholder: 'أدخل بريدك الإلكتروني'
    },
    {
      name: 'password',
      label: 'كلمة المرور',
      type: 'password' as const,
      required: true,
      validation: {
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
      }
    },
    {
      name: 'phone',
      label: 'رقم الهاتف',
      type: 'tel' as const,
      required: false,
      placeholder: '+966 50 000 0000'
    }
  ];

  // في القالب - In template
  /*
  <app-form-submission-form
    [fields]="fields"
    submitUrl="/api/submit"
    submitButtonText="إرسال"
    (formSubmit)="onFormSubmit($event)"
    (formError)="onFormError($event)">
  </app-form-submission-form>
  */

  onFormSubmit(data: any) {
    console.log('Form submitted successfully:', data);
  }

  onFormError(errors: any) {
    console.log('Form validation errors:', errors);
    // الأخطاء ستظهر تلقائياً تحت كل حقل - Errors will show automatically under each field
  }

  // أو يمكنك استخدام الخدمات مباشرة - Or use services directly
  submitFormDirectly() {
    const formData = {
      email: 'user@example.com',
      password: 'Password123'
    };

    this.formSubmissionService.submitForm('/api/login', formData)
      .subscribe(result => {
        if (result.success) {
          console.log('Success:', result.data);
        } else {
          console.log('Errors:', result.errors);
        }
      });
  }
}

// استخدام ValidationService مباشرة - Using ValidationService directly
export class ValidationExample {
  constructor(private validationService: ValidationService) {}

  handleApiError(error: any) {
    const validationErrors = this.validationService.extractValidationErrors(error);

    if (validationErrors.hasFieldError('email')) {
      const emailErrors = validationErrors.getFieldErrors('email');
      console.log('Email errors:', emailErrors);
    }

    if (validationErrors.hasFieldError('password')) {
      console.log('Password error:', validationErrors.getFieldErrorMessage('password'));
    }
  }

  createCustomValidationError() {
    const customError = this.validationService.createErrorResponse([
      { field: 'general', message: 'حدث خطأ غير متوقع', code: 'UNEXPECTED_ERROR' }
    ], 'فشل في حفظ البيانات');

    return customError;
  }
}
