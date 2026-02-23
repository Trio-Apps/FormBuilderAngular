import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/**
 * Error Interceptor
 * Handles HTTP errors globally and displays appropriate messages
 * - Duplicate errors (already in use, already exists) → Warning
 * - Other errors → Error
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (shouldIgnoreErrorToast(req.url, error.status)) {
        return throwError(() => error);
      }

      // Log error for debugging - expand error.error object
      console.log('[ErrorInterceptor] Error caught:', {
        url: req.url,
        method: req.method,
        status: error.status,
        statusText: error.statusText,
        error: error.error
      });
      console.log('[ErrorInterceptor] Full error.error object:', JSON.stringify(error.error, null, 2));

      // Check for duplicate error in error.error first (before extracting message)
      let isDuplicateFromError = false;
      if (error.error) {
        if (typeof error.error === 'string') {
          isDuplicateFromError = isDuplicateError(error.error);
        } else {
          if (error.error.detail) isDuplicateFromError = isDuplicateError(error.error.detail);
          if (!isDuplicateFromError && error.error.message) isDuplicateFromError = isDuplicateError(error.error.message);
          if (!isDuplicateFromError && error.error.errorMessage) isDuplicateFromError = isDuplicateError(error.error.errorMessage);
          if (!isDuplicateFromError && error.error.error && typeof error.error.error === 'string') {
            isDuplicateFromError = isDuplicateError(error.error.error);
          }
          if (!isDuplicateFromError && error.error.title) isDuplicateFromError = isDuplicateError(error.error.title);
          if (!isDuplicateFromError && error.error.errors && typeof error.error.errors === 'object') {
            const errorValues = Object.values(error.error.errors).flat() as string[];
            isDuplicateFromError = errorValues.some((e: string) => isDuplicateError(e));
          }
        }
      }

      // Extract error message from different response formats
      const errorMessage = extractErrorMessage(error, req.url, req.method);
      
      // Determine if this is a duplicate error (check both original error and extracted message)
      const isDuplicateFromMessage = isDuplicateError(errorMessage);
      const isDuplicate = isDuplicateFromError || isDuplicateFromMessage;
      
      // Determine severity based on error type
      const severity = isDuplicate ? 'warn' : 'error';
      const summary = isDuplicate ? 'تحذير' : 'خطأ';
      const life = isDuplicate ? 6000 : 5000;

      console.log('[ErrorInterceptor] Showing message:', {
        severity,
        summary,
        detail: errorMessage,
        isDuplicate
      });

      // Show message to user
      messageService.add({
        severity,
        summary,
        detail: errorMessage,
        life
      });

      // Log duplicate warnings for debugging
      if (isDuplicate) {
        console.warn('⚠️ [ErrorInterceptor] DUPLICATE DETECTION', {
          url: req.url,
          method: req.method,
          message: errorMessage
        });
      }

      // Re-throw error so components can still handle it if needed
      return throwError(() => error);
    })
  );
};

/**
 * Suppress global toast for expected 404 checks in Crystal layout probing.
 */
function shouldIgnoreErrorToast(url: string, status: number): boolean {
  if (status !== 404) {
    return false;
  }

  const normalizedUrl = (url || '').toLowerCase();
  return normalizedUrl.includes('/api/crystalreports/default-layouts')
    || normalizedUrl.includes('/api/crystalreports/default-layout/');
}

/**
 * Extract error message from different response formats
 */
function extractErrorMessage(error: HttpErrorResponse, url: string, method: string): string {
  // Blob error payload (common with file download endpoints)
  if (error.error instanceof Blob) {
    if (url.toLowerCase().includes('/api/crystalreports/layout/')) {
      return 'تعذر تنزيل التقرير. تحقق من إعداد CrystalBridge وأن خدمة التقرير تعمل.';
    }
    return 'حدث خطأ أثناء تنزيل الملف.';
  }

  // Format 1: ProblemDetails (ASP.NET Core) - Most common format
  if (error.error?.detail) {
    return error.error.detail;
  }

  // Format 2: ApiResponse
  if (error.error?.message) {
    return error.error.message;
  }

  // Format 3: ServiceResult
  if (error.error?.errorMessage) {
    return error.error.errorMessage;
  }

  // Format 4: error.error.error (some APIs use this format)
  if (error.error?.error && typeof error.error.error === 'string') {
    const errorCode = error.error.error;
    // Translate common error codes to user-friendly messages
    if (errorCode === 'FormField_FieldCodeExists') {
      return 'كود الحقل (Field Code) موجود بالفعل. يرجى استخدام كود فريد آخر.';
    }
    return errorCode;
  }

  // Format 5: Validation errors object
  if (error.error?.errors && typeof error.error.errors === 'object') {
    const errors = Object.values(error.error.errors).flat() as string[];
    if (errors.length > 0) {
      return errors.join(', ');
    }
  }

  // Format 6: String error
  if (typeof error.error === 'string' && error.error.trim() !== '') {
    return error.error;
  }

  // Format 7: ProblemDetails title (fallback)
  if (error.error?.title) {
    return error.error.title;
  }

  // Format 7: Network/CORS error
  if (error.status === 0) {
    return 'لا يمكن الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت والتأكد من أن الخادم يعمل.';
  }

  // Format 8: Get user-friendly message based on status code and endpoint
  // Always use custom message instead of Angular's technical "Http failure response" message
  const operationName = getOperationName(url, method);
  
  // Status code based messages
  switch (error.status) {
    case 400:
      return `${operationName}: البيانات المرسلة غير صحيحة. يرجى التحقق من جميع الحقول.`;
    case 401:
      return 'غير مصرح لك بالوصول. يرجى تسجيل الدخول مرة أخرى.';
    case 403:
      // Enhanced 403 Forbidden message - check if there's a specific permission message
      const permissionMessage = error.error?.message || error.error?.detail || error.error?.errorMessage;
      if (permissionMessage && typeof permissionMessage === 'string') {
        // Check if the message contains permission-related keywords
        if (permissionMessage.toLowerCase().includes('permission') || 
            permissionMessage.toLowerCase().includes('صلاحية') ||
            permissionMessage.toLowerCase().includes('not authorized') ||
            permissionMessage.toLowerCase().includes('forbidden')) {
          return permissionMessage;
        }
      }
      return 'ليس لديك صلاحية للقيام بهذه العملية. يرجى التواصل مع المسؤول للحصول على الصلاحيات المطلوبة.';
    case 404:
      return `${operationName}: العنصر المطلوب غير موجود.`;
    case 409:
      return `${operationName}: تعارض في البيانات. يرجى تحديث الصفحة والمحاولة مرة أخرى.`;
    case 500:
      return `${operationName}: حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.`;
    case 503:
      return 'الخدمة غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.';
    default:
      // Never use Angular's technical "Http failure response" message
      return `${operationName}: حدث خطأ (${error.status}). يرجى المحاولة مرة أخرى.`;
  }
}

/**
 * Get user-friendly operation name from URL and method
 */
function getOperationName(url: string, method: string): string {
  const urlLower = url.toLowerCase();
  const methodUpper = method.toUpperCase();

  // Extract endpoint name from URL
  const endpointMatch = url.match(/\/([^\/]+)(?:\/(\d+))?$/);
  const endpoint = endpointMatch ? endpointMatch[1] : '';

  // Map common endpoints to Arabic names
  const endpointNames: { [key: string]: string } = {
    'formbuilder': 'النموذج',
    'formrules': 'القاعدة',
    'formfields': 'الحقل',
    'formtabs': 'التبويب',
    'formgrids': 'الشبكة',
    'documenttypes': 'نوع الوثيقة',
    'documentseries': 'سلسلة الوثائق',
    'projects': 'المشروع',
    'fields': 'الحقل',
    'tabs': 'التبويب',
    'rules': 'القاعدة'
  };

  let operationType = '';
  if (methodUpper === 'POST') {
    operationType = 'إنشاء';
  } else if (methodUpper === 'PUT' || methodUpper === 'PATCH') {
    operationType = 'تحديث';
  } else if (methodUpper === 'DELETE') {
    operationType = 'حذف';
  } else if (methodUpper === 'GET') {
    operationType = 'جلب';
  }

  // Find endpoint name
  for (const [key, value] of Object.entries(endpointNames)) {
    if (urlLower.includes(key)) {
      return operationType ? `${operationType} ${value}` : value;
    }
  }

  // Fallback
  return operationType || 'العملية';
}

/**
 * Check if error message indicates a duplicate value
 */
function isDuplicateError(message: string): boolean {
  if (!message) return false;

  const duplicateKeywords = [
    'already in use',
    'already exists',
    'مستخدم بالفعل',
    'موجود بالفعل',
    'duplicate',
    'مكرر',
    'rulename',
    'rule name',
    'fieldcode',
    'field code',
    'tabcode',
    'tab code',
    'formcode',
    'form code',
    'project code',
    'projectcode'
  ];

  const messageLower = message.toLowerCase();
  return duplicateKeywords.some(keyword => 
    messageLower.includes(keyword.toLowerCase())
  );
}
