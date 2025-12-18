import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

export type Language = 'ar' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguage$ = new BehaviorSubject<Language>('en');
  private translations: any = {};
  private translationsCache: { [key: string]: any } = {}; // Cache translations for both languages
  private translationsLoaded = false;

  constructor() {
    // Get language from:
    // 1. localStorage (saved preference)
    // 2. Browser language
    // 3. Default to 'en'
    const savedLanguage = localStorage.getItem('language') as Language;
    const browserLanguage = this.detectBrowserLanguage();
    const defaultLanguage = savedLanguage || browserLanguage || 'en';
    this.setLanguage(defaultLanguage);
    
    // Preload translations for the other language to ensure smooth switching
    const otherLanguage: Language = defaultLanguage === 'en' ? 'ar' : 'en';
    this.loadTranslationsForLanguage(otherLanguage);
  }

  /**
   * Detect browser language
   */
  private detectBrowserLanguage(): Language {
    if (typeof navigator === 'undefined') {
      return 'en';
    }
    
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang && (browserLang.startsWith('ar') || browserLang.startsWith('ar-'))) {
      return 'ar';
    }
    
    return 'en';
  }

  /**
   * Set the current language and load translations
   * This will also update the Accept-Language header for API requests
   */
  setLanguage(lang: Language): void {
    this.currentLanguage$.next(lang);
    localStorage.setItem('language', lang);
    this.loadTranslations(lang);
    
    // Note: The languageInterceptor will automatically use this language
    // for all subsequent API requests via Accept-Language header
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage$.value;
  }

  /**
   * Get language observable
   */
  getLanguage$(): Observable<Language> {
    return this.currentLanguage$.asObservable();
  }

  /**
   * Load translations from JSON file
   * Uses fetch instead of HttpClient to avoid circular dependency
   * (Translation files are static assets, no need for interceptors)
   */
  private loadTranslations(lang: Language): void {
    // Check cache first
    if (this.translationsCache[lang]) {
      this.translations = this.translationsCache[lang];
      this.translationsLoaded = true;
      return;
    }

    fetch(`/assets/i18n/${lang}.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(translations => {
        this.translationsCache[lang] = translations; // Cache translations
        this.translations = translations;
        this.translationsLoaded = true;
      })
      .catch(error => {
        console.error(`Failed to load translations for ${lang}:`, error);
        // Fallback to empty object
        this.translationsCache[lang] = {};
        this.translations = {};
        this.translationsLoaded = true;
      });
  }

  /**
   * Load translations for a specific language (for caching)
   */
  private async loadTranslationsForLanguage(lang: Language): Promise<any> {
    // Check cache first
    if (this.translationsCache[lang]) {
      return this.translationsCache[lang];
    }

    try {
      const response = await fetch(`/assets/i18n/${lang}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const translations = await response.json();
      this.translationsCache[lang] = translations; // Cache translations
      return translations;
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      this.translationsCache[lang] = {}; // Cache empty object
      return {};
    }
  }

  /**
   * Translate a key
   * @param key Translation key (e.g., 'forms.title')
   * @param params Optional parameters for interpolation
   */
  translate(key: string, params?: { [key: string]: any }): string {
    return this.translateForLanguage(key, this.currentLanguage$.value, params);
  }

  /**
   * Translate a key for a specific language
   * @param key Translation key (e.g., 'forms.title')
   * @param lang Language to translate to
   * @param params Optional parameters for interpolation
   */
  translateForLanguage(key: string, lang: Language, params?: { [key: string]: any }): string {
    // Use cached translations if available
    let translations = this.translationsCache[lang];
    
    // If no cached translations for this language, use current translations if language matches
    if (!translations || Object.keys(translations).length === 0) {
      if (lang === this.currentLanguage$.value && this.translationsLoaded) {
        translations = this.translations;
      } else {
        // Try to load translations synchronously (will use cache if already loaded)
        // For now, return key and load asynchronously for future use
        if (!this.translationsCache[lang]) {
          this.loadTranslationsForLanguage(lang);
        }
        // Fallback to current translations or return key
        translations = this.translations || {};
      }
    }

    if (!translations || Object.keys(translations).length === 0) {
      return key; // Return key if translations not available
    }

    const keys = key.split('.');
    let value: any = translations;

    // Navigate through nested keys
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    // If value is a string, apply parameters if provided
    if (typeof value === 'string' && params) {
      return this.interpolate(value, params);
    }

    return typeof value === 'string' ? value : key;
  }

  /**
   * Interpolate parameters in translation string
   */
  private interpolate(template: string, params: { [key: string]: any }): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Check if translations are loaded
   */
  isReady(): boolean {
    return this.translationsLoaded;
  }
}
