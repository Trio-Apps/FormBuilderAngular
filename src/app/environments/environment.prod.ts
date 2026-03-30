// src/environments/environment.prod.ts

const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const browserHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const resolvedApiUrl = `${browserProtocol}//${browserHostname}:5000/api`;

export const environment = {
  production: true,

  apiUrl: resolvedApiUrl,

  appName: 'Form Builder',
  appVersion: '1.0.0',
  appDescription: 'Form Building and Management System',

  apiSettings: {
    timeout: 30000,
    retryAttempts: 3,
    cacheDuration: 300000,
    maxFileSize: 10485760,
  },

  design: {
    primaryColor: '#3B82F6',
    secondaryColor: '#6B7280',
    successColor: '#10B981',
    dangerColor: '#EF4444',
    warningColor: '#F59E0B',
    infoColor: '#3B82F6',
    lightColor: '#F9FAFB',
    darkColor: '#111827',
    borderRadius: '8px',
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    transition: 'all 0.3s ease',
  },

  config: {
    defaultPageSize: 10,
    maxPageSize: 100,
    itemsPerPageOptions: [5, 10, 20, 50, 100],
    enableDebug: false,
    enableAnalytics: false,
    enableLogging: true,
    logLevel: 'info',
    sessionTimeout: 86400000,
  },

  validation: {
    formNameMinLength: 3,
    formNameMaxLength: 200,
    formCodeMinLength: 2,
    formCodeMaxLength: 100,
    formCodePattern: '^[A-Z0-9_]+$',
    formDescriptionMaxLength: 500,
    tabNameMinLength: 2,
    tabNameMaxLength: 100,
    tabCodePattern: '^[a-z0-9_]*$',
    fieldNameMinLength: 2,
    fieldNameMaxLength: 200,
    fieldCodePattern: '^[a-z0-9_]+$',
    placeholderMaxLength: 200,
    hintTextMaxLength: 500,
    defaultValueMaxLength: 1000,
  },

  table: {
    defaultSortField: 'id',
    defaultSortOrder: 'desc',
    rowHeight: 48,
    headerHeight: 56,
    virtualScrollThreshold: 100,
  },

  loading: {
    spinnerSize: 40,
    spinnerColor: '#3B82F6',
    backdropOpacity: 0.5,
    minLoadingTime: 500,
  },

  notifications: {
    successDuration: 3000,
    errorDuration: 5000,
    warningDuration: 4000,
    infoDuration: 3000,
    position: 'top-right',
    maxStack: 5,
  },

  fields: {
    types: [
      { id: 1, name: 'Text', code: 'text', icon: 'pi pi-font' },
      { id: 2, name: 'Number', code: 'number', icon: 'pi pi-hashtag' },
      { id: 3, name: 'Date', code: 'date', icon: 'pi pi-calendar' },
      { id: 4, name: 'Email', code: 'email', icon: 'pi pi-envelope' },
      { id: 5, name: 'Phone', code: 'phone', icon: 'pi pi-phone' },
      { id: 6, name: 'Select', code: 'select', icon: 'pi pi-list' },
      { id: 7, name: 'Checkbox', code: 'checkbox', icon: 'pi pi-check-square' },
      { id: 8, name: 'Radio', code: 'radio', icon: 'pi pi-circle' },
      { id: 9, name: 'Text Area', code: 'textarea', icon: 'pi pi-align-left' },
      { id: 10, name: 'Password', code: 'password', icon: 'pi pi-lock' },
      { id: 11, name: 'File', code: 'file', icon: 'pi pi-file' },
      { id: 12, name: 'Image', code: 'image', icon: 'pi pi-image' },
      { id: 13, name: 'Grid', code: 'grid', icon: 'pi pi-table' },
    ],

    validationRules: [
      { id: 1, name: 'Required', code: 'required' },
      { id: 2, name: 'Email Format', code: 'email' },
      { id: 3, name: 'Min Length', code: 'minLength' },
      { id: 4, name: 'Max Length', code: 'maxLength' },
      { id: 5, name: 'Pattern', code: 'pattern' },
      { id: 6, name: 'Min Value', code: 'min' },
      { id: 7, name: 'Max Value', code: 'max' },
      { id: 8, name: 'Custom', code: 'custom' },
    ],
  },

  security: {
    enableCors: true,
    enableCsrf: true,
    enableHttps: true,
    tokenKey: 'form_builder_token',
    tokenExpiry: 86400,
  },

  storage: {
    localStoragePrefix: 'form_builder_',
    sessionStoragePrefix: 'form_builder_session_',
    cookiePrefix: 'form_builder_',
    cachePrefix: 'form_builder_cache_',
  },

  media: {
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedFileTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    maxImageSize: 5242880,
    maxFileSize: 10485760,
    thumbnailWidth: 150,
    thumbnailHeight: 150,
  },

  reports: {
    defaultFormat: 'pdf',
    supportedFormats: ['pdf', 'excel', 'csv', 'json'],
    maxExportRows: 10000,
    chartColors: [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ],
  },

  features: {
    enableFormTemplates: true,
    enableFormImportExport: true,
    enableFormVersioning: true,
    enableFormDuplication: true,
    enableFormSharing: true,
    enableFormAnalytics: true,
    enableRealTimeUpdates: true,
    enableOfflineMode: false,
    enableMultiLanguage: false,
    enableDarkMode: true,
  },

  email: {
    fromEmail: 'noreply@formbuilder.com',
    fromName: 'Form Builder System',
    supportEmail: 'support@formbuilder.com',
    bccEmails: ['admin@formbuilder.com'],
  },

  links: {
    documentation: 'https://docs.formbuilder.com',
    support: 'https://support.formbuilder.com',
    apiDocs: 'http://localhost:5000/swagger',
    privacyPolicy: 'https://formbuilder.com/privacy',
    termsOfService: 'https://formbuilder.com/terms',
  },

  development: {
    enableMockData: false,
    mockDelay: 0,
    enableApiLogging: false,
    enablePerformanceLogging: false,
    enableErrorTracking: true,
    sentryDsn: '',
  },

  featureFlags: {
    newFormBuilder: true,
    advancedValidation: false,
    aiAssistance: false,
    workflowEngine: false,
    integrationHub: false,
    customTheming: false,
  }
};
