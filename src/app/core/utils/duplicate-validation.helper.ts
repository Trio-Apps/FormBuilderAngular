import { MessageService } from 'primeng/api';
import { TranslationService } from '../services/translation.service';

/**
 * Duplicate Validation Helper
 * نظام موحد لإدارة رسائل التحذير عند اكتشاف تكرار في أي جدول
 * Unified system for managing duplicate validation warnings
 */
export class DuplicateValidationHelper {
  
  /**
   * Extract error message and details from HTTP error response
   * استخراج رسالة الخطأ والتفاصيل من استجابة HTTP
   */
  static extractErrorInfo(error: any): { message: string; details: string[] } {
    let errorMessage = '';
    let errorDetails: string[] = [];

    if (error?.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.title) {
        errorMessage = error.error.title;
      } else if (error.error.detail) {
        errorMessage = error.error.detail;
      }

      // Extract validation errors if available (ASP.NET Core ProblemDetails format)
      if (error.error.errors) {
        if (typeof error.error.errors === 'object') {
          // Format: { "FieldCode": ["error message"] }
          const errors: { [key: string]: string[] } = error.error.errors;
          for (const [field, messages] of Object.entries(errors)) {
            if (Array.isArray(messages)) {
              messages.forEach(msg => errorDetails.push(msg));
            } else {
              errorDetails.push(String(messages));
            }
          }
        } else if (Array.isArray(error.error.errors)) {
          errorDetails = error.error.errors;
        }
      }
    }

    // If no message found, use default
    if (!errorMessage) {
      errorMessage = error?.message || 'An error occurred';
    }

    return { message: errorMessage, details: errorDetails };
  }

  /**
   * Check if error is a duplicate validation error
   * التحقق من أن الخطأ هو خطأ تكرار
   */
  static isDuplicateError(errorMessage: string, errorDetails: string[], fieldName?: string): boolean {
    const errorLower = errorMessage.toLowerCase();
    const fieldLower = fieldName?.toLowerCase() || '';

    // Check main error message
    const isDuplicateInMessage = errorLower.includes('duplicate') ||
                                 errorLower.includes('already exists') ||
                                 errorLower.includes('already in use') ||
                                 errorLower.includes('مكرر') ||
                                 errorLower.includes('موجود');

    // Check if field name is mentioned in error
    const isFieldMentioned = fieldName ? 
      (errorLower.includes(fieldLower) || errorLower.includes(fieldName.toLowerCase())) : 
      false;

    // Check error details
    const isDuplicateInDetails = errorDetails.some(detail =>
      detail.toLowerCase().includes('duplicate') ||
      detail.toLowerCase().includes('already exists') ||
      detail.toLowerCase().includes('already in use') ||
      detail.toLowerCase().includes('مكرر') ||
      detail.toLowerCase().includes('موجود')
    );

    return isDuplicateInMessage || isDuplicateInDetails || isFieldMentioned;
  }

  /**
   * Extract duplicate value from error message
   * استخراج القيمة المكررة من رسالة الخطأ
   */
  static extractDuplicateValue(errorMessage: string, errorDetails: string[], fallbackValue?: string): string {
    // Try to find value in error message (look for quoted strings or codes)
    const codeMatch = errorMessage.match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1];
    }

    // Check error details for value
    if (errorDetails.length > 0) {
      const codeInDetails = errorDetails[0].match(/['"]?([a-zA-Z0-9_]+)['"]?/i);
      if (codeInDetails && codeInDetails[1]) {
        return codeInDetails[1];
      }
    }

    // Return fallback value if provided
    return fallbackValue || '';
  }

  /**
   * Format duplicate error message for display
   * تنسيق رسالة خطأ التكرار للعرض
   */
  static formatDuplicateMessage(
    entityType: string,
    fieldName: string,
    duplicateValue: string,
    translationService?: TranslationService
  ): string {
    const currentLang = translationService?.getCurrentLanguage() || 'en';
    
    if (currentLang === 'ar') {
      return `${entityType} "${duplicateValue}" متكرر. يرجى استخدام ${fieldName} آخر.`;
    } else {
      return `${entityType} "${duplicateValue}" is duplicate. Please use a different ${fieldName}.`;
    }
  }

  /**
   * Handle duplicate validation error and show appropriate message
   * معالجة خطأ التحقق من التكرار وعرض رسالة مناسبة
   */
  static handleDuplicateError(
    error: any,
    messageService: MessageService,
    translationService: TranslationService,
    config: {
      entityType: string;        // e.g., 'Form Code', 'Tab Code', 'Field Code', 'Rule Name'
      fieldName: string;          // e.g., 'Form Code', 'Tab Code', 'Field Code', 'Rule Name'
      fallbackValue?: string;     // Fallback value if cannot be extracted from error
      fieldNameVariations?: string[]; // Additional field name variations to check (e.g., ['formcode', 'form code'])
    }
  ): void {
    const { message, details } = this.extractErrorInfo(error);
    
    // Check if it's a duplicate error
    const fieldVariations = config.fieldNameVariations || [
      config.fieldName.toLowerCase(),
      config.fieldName.replace(/\s+/g, '').toLowerCase()
    ];
    
    const isDuplicate = this.isDuplicateError(message, details, config.fieldName) ||
                       fieldVariations.some(variation => 
                         message.toLowerCase().includes(variation) ||
                         details.some(d => d.toLowerCase().includes(variation))
                       );

    if (isDuplicate) {
      // Extract duplicate value
      const duplicateValue = this.extractDuplicateValue(message, details, config.fallbackValue);
      
      // Format message
      const duplicateMessage = this.formatDuplicateMessage(
        config.entityType,
        config.fieldName,
        duplicateValue,
        translationService
      );

      // Show warning message
      const currentLang = translationService.getCurrentLanguage();
      messageService.add({
        severity: 'warn',
        summary: currentLang === 'ar' ? 'تحذير' : 'Warning',
        detail: duplicateMessage,
        life: 10000
      });
    } else {
      // Show generic error
      const currentLang = translationService.getCurrentLanguage();
      if (details.length > 0) {
        messageService.add({
          severity: 'error',
          summary: currentLang === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
          detail: details[0] + (details.length > 1 ? ` (+${details.length - 1} ${currentLang === 'ar' ? 'أكثر' : 'more'})` : ''),
          life: 10000
        });
      } else {
        messageService.add({
          severity: 'error',
          summary: currentLang === 'ar' ? 'خطأ' : 'Error',
          detail: message,
          life: 7000
        });
      }
    }
  }

  /**
   * Log duplicate detection to console (for debugging)
   * تسجيل اكتشاف التكرار في Console (للتشخيص)
   */
  static logDuplicateDetection(
    entityType: string,
    fieldName: string,
    duplicateValue: string,
    entityId?: number,
    additionalInfo?: string
  ): void {
    const info = additionalInfo ? ` (${additionalInfo})` : '';
    const idInfo = entityId ? ` (ID: ${entityId})` : '';
    console.warn(
      `[DUPLICATE DETECTION] 🔍 Duplicate ${fieldName} detected: '${duplicateValue}' for ${entityType}${idInfo}${info}`
    );
  }

  /**
   * Log duplicate warning to console (for debugging)
   * تسجيل تحذير التكرار في Console (للتشخيص)
   */
  static logDuplicateWarning(
    entityType: string,
    fieldName: string,
    duplicateValue: string,
    additionalInfo?: string
  ): void {
    const info = additionalInfo ? ` (${additionalInfo})` : '';
    console.warn(
      `[DUPLICATE WARNING] ⚠️ Duplicate ${fieldName} detected: '${duplicateValue}' for ${entityType}${info}`
    );
  }
}

