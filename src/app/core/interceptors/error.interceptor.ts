import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/**
 * Global HTTP error interceptor.
 * Duplicate conflicts are shown as warnings. Everything else is shown as errors.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (shouldIgnoreErrorToast(req.urlWithParams, error.status)) {
        return throwError(() => error);
      }

      console.log('[ErrorInterceptor] Error caught:', {
        url: req.url,
        method: req.method,
        status: error.status,
        statusText: error.statusText,
        error: error.error
      });

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
            isDuplicateFromError = errorValues.some((value: string) => isDuplicateError(value));
          }
        }
      }

      const errorMessage = extractErrorMessage(error, req.url, req.method);
      const isDuplicate = isDuplicateFromError || isDuplicateError(errorMessage);

      messageService.add({
        severity: isDuplicate ? 'warn' : 'error',
        summary: isDuplicate ? 'Warning' : 'Error',
        detail: errorMessage,
        life: isDuplicate ? 6000 : 5000
      });

      return throwError(() => error);
    })
  );
};

function shouldIgnoreErrorToast(url: string, status: number): boolean {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
  const normalizedUrl = (url || '').toLowerCase();

  if (normalizedUrl.includes('suppressglobalerrortoast=true')) {
    return true;
  }

  if ((status === 401 || status === 403) && currentPath.includes('/forms/view/')) {
    return true;
  }

  if (currentPath.includes('/forms/view/')
    && (normalizedUrl.includes('/api/gridcolumndatasources/column-options')
      || normalizedUrl.includes('/api/gridcolumndatasources/column/')
      || normalizedUrl.includes('/api/gridcolumnoptions/column/')
      || normalizedUrl.includes('/api/fielddatasources/field-options'))) {
    return true;
  }

  if (status === 404 && currentPath.includes('/forms/view/')) {
    return normalizedUrl.includes('/api/formsubmissions/latest-document-number/form/')
      || normalizedUrl.includes('/api/documentseries/document-type/')
      || normalizedUrl.includes('/api/formbuilderdocumentsettings/form/');
  }

  if ((status === 400 || status === 401 || status === 403) && currentPath.includes('/approval-inbox')) {
    return true;
  }

  if (status === 404 && currentPath.includes('/approval-inbox')) {
    return true;
  }

  if ((status === 401 || status === 403)
    && currentPath.includes('/document-types')
    && (normalizedUrl.includes('/api/documenttypes/active')
      || normalizedUrl.includes('/api/formbuilderdocumentsettings/form/')
      || (normalizedUrl.includes('/api/documenttypes')
        && !normalizedUrl.includes('/api/documenttypes/')))) {
    return true;
  }

  if ((status === 401 || status === 403)
    && currentPath.includes('/form-builder/forms')
    && normalizedUrl.includes('/api/formbuilder')) {
    return true;
  }

  if ((status === 401 || status === 403)
    && currentPath.includes('/fields')
    && (normalizedUrl.includes('/api/formbuilder/')
      || normalizedUrl.includes('/api/documenttypes/active')
      || normalizedUrl.includes('/api/formbuilderdocumentsettings/form/')
      || normalizedUrl.includes('/api/sapintegration/')
      || normalizedUrl.includes('/api/approvalworkflow')
      || normalizedUrl.includes('/api/approvalstage'))) {
    return true;
  }

  if (currentPath.includes('/fields') && normalizedUrl.includes('/api/fielddatasources/preview')) {
    return true;
  }

  if (status !== 404) {
    return false;
  }

  if (currentPath.includes('/forms/submission/success')) {
    return true;
  }

  return normalizedUrl.includes('/api/crystalreports/default-layouts')
    || normalizedUrl.includes('/api/crystalreports/default-layout/')
    || normalizedUrl.includes('/api/sapintegration/settings/')
    || normalizedUrl.includes('/api/approvalworkflowruntime/activate-stage')
    || normalizedUrl.includes('/api/approvalworkflowruntime/request-signature')
    || normalizedUrl.includes('/api/approvalworkflow/name/')
    || normalizedUrl.includes('/api/copytodocument/setups')
    || normalizedUrl.endsWith('/api/approvalworkflow');
}

function extractErrorMessage(error: HttpErrorResponse, url: string, method: string): string {
  if (error.error instanceof Blob) {
    if (url.toLowerCase().includes('/api/crystalreports/layout/')) {
      return 'Unable to download the report. Verify the CrystalBridge configuration and confirm the reporting service is running.';
    }

    return 'An error occurred while downloading the file.';
  }

  if (error.error?.detail) {
    return error.error.detail;
  }

  if (typeof error.error?.message === 'string' && error.error.message.trim()) {
    return error.error.message;
  }

  if (typeof error.error?.message?.value === 'string' && error.error.message.value.trim()) {
    return error.error.message.value;
  }

  if (typeof error.error?.message?.name === 'string' && error.error.message.name.trim()) {
    return error.error.message.name;
  }

  if (error.error?.errorMessage) {
    return error.error.errorMessage;
  }

  if (error.error?.error && typeof error.error.error === 'string') {
    if (error.error.error === 'FormField_FieldCodeExists') {
      return 'Field Code already exists. Please use a different unique code.';
    }

    return error.error.error;
  }

  if (error.error?.errors && typeof error.error.errors === 'object') {
    const errors = Object.values(error.error.errors).flat() as string[];
    if (errors.length > 0) {
      return errors.join(', ');
    }
  }

  if (typeof error.error === 'string' && error.error.trim() !== '') {
    return error.error;
  }

  if (error.error?.title) {
    return error.error.title;
  }

  if (error.status === 0) {
    return 'Cannot reach the server. Check your network connection and confirm the backend is running.';
  }

  const operationName = getOperationName(url, method);

  switch (error.status) {
    case 400:
      return `${operationName}: the submitted data is invalid. Please review all fields and try again.`;
    case 401:
      return 'You are not authorized to access this resource. Please sign in again.';
    case 403: {
      const permissionMessage = error.error?.message || error.error?.detail || error.error?.errorMessage;
      if (permissionMessage && typeof permissionMessage === 'string') {
        const normalized = permissionMessage.toLowerCase();
        if (normalized.includes('permission')
          || normalized.includes('not authorized')
          || normalized.includes('forbidden')
          || normalized.includes('صلاحية')) {
          return permissionMessage;
        }
      }

      return 'You do not have permission to perform this action. Contact your administrator if you believe this is incorrect.';
    }
    case 404:
      return `${operationName}: the requested item was not found.`;
    case 409:
      return `${operationName}: a data conflict was detected. Refresh the page and try again.`;
    case 500:
      return `${operationName}: the server encountered an error. Please try again later.`;
    case 503:
      return 'The service is currently unavailable. Please try again later.';
    default:
      return `${operationName}: an unexpected error occurred (${error.status}). Please try again.`;
  }
}

function getOperationName(url: string, method: string): string {
  const urlLower = (url || '').toLowerCase();
  const methodUpper = (method || '').toUpperCase();

  const endpointNames: Record<string, string> = {
    formbuilder: 'form',
    formrules: 'rule',
    formfields: 'field',
    formtabs: 'tab',
    formgrids: 'grid',
    documenttypes: 'document type',
    documentseries: 'document series',
    projects: 'project',
    fields: 'field',
    tabs: 'tab',
    rules: 'rule'
  };

  let operationType = '';
  if (methodUpper === 'POST') operationType = 'Create';
  else if (methodUpper === 'PUT' || methodUpper === 'PATCH') operationType = 'Update';
  else if (methodUpper === 'DELETE') operationType = 'Delete';
  else if (methodUpper === 'GET') operationType = 'Load';

  for (const [key, value] of Object.entries(endpointNames)) {
    if (urlLower.includes(key)) {
      return operationType ? `${operationType} ${value}` : value;
    }
  }

  return operationType || 'Operation';
}

function isDuplicateError(message: unknown): boolean {
  const normalized = String(message ?? '').toLowerCase();
  if (!normalized) return false;

  const duplicateKeywords = [
    'already in use',
    'already exists',
    'duplicate',
    'fieldcode',
    'field code',
    'tabcode',
    'tab code',
    'formcode',
    'form code',
    'project code',
    'projectcode',
    'مستخدم بالفعل',
    'موجود بالفعل',
    'مكرر'
  ];

  return duplicateKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}
