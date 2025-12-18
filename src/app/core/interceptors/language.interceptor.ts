import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

/**
 * Language Interceptor
 * Adds Accept-Language header to all HTTP requests
 * This allows .NET API to use the correct Resource files (ar.resx / en.resx)
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const translationService = inject(TranslationService);
  
  // Get current language from TranslationService
  const currentLanguage = translationService.getCurrentLanguage();
  
  // Map Angular language codes to .NET culture codes
  // 'ar' -> 'ar-SA' (Arabic - Saudi Arabia)
  // 'en' -> 'en-US' (English - United States)
  const cultureCode = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
  
  // Clone the request and add Accept-Language header
  const cloned = req.clone({
    setHeaders: {
      'Accept-Language': cultureCode
    }
  });
  
  return next(cloned);
};
