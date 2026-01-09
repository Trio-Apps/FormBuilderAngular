/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Suppress DOM Mutation Event deprecation warnings from third-party libraries (PrimeNG, CoreUI)
// These warnings come from libraries and will be fixed in future library updates
// This is a known issue with PrimeNG/CoreUI and doesn't affect functionality
// 
// NOTE: Some deprecation warnings may still appear because they come directly from the browser engine
// (not from console.warn/error), which happens before JavaScript execution. These cannot be suppressed
// from JavaScript, but they do NOT affect application functionality.
// See DEPRECATION_WARNING.md for more details.
(function suppressDeprecationWarnings() {
  if (typeof window === 'undefined' || !window.console) {
    return;
  }

  // Store original console methods
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalLog = console.log.bind(console);
  
  // Helper function to check if message is a deprecation warning
  const isDeprecationWarning = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('domnodeinsertedintodocument') ||
           lowerMessage.includes('domnoderemovedfromdocument') ||
           lowerMessage.includes('domnodeinserted') ||
           lowerMessage.includes('domnoderemoved') ||
           (lowerMessage.includes('dom mutation event') && lowerMessage.includes('deprecated')) ||
           (lowerMessage.includes('listener added for a synchronous') && lowerMessage.includes('dom mutation event')) ||
           (lowerMessage.includes('[deprecation]') && lowerMessage.includes('dom mutation')) ||
           (lowerMessage.includes('deprecation') && lowerMessage.includes('dom mutation'));
  };
  
  // Helper function to convert arguments to string message
  const argsToString = (args: any[]): string => {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  };
  
  // Override console.warn to filter deprecation warnings
  console.warn = function(...args: any[]) {
    const message = argsToString(args);
    if (isDeprecationWarning(message)) {
      // Suppress these specific deprecation warnings from third-party libraries
      return;
    }
    // Pass through all other warnings
    originalWarn(...args);
  };
  
  // Override console.error to filter deprecation warnings
  console.error = function(...args: any[]) {
    const message = argsToString(args);
    if (isDeprecationWarning(message)) {
      // Suppress these specific deprecation warnings
      return;
    }
    // Pass through all other errors
    originalError(...args);
  };
  
  // Also filter console.log in case some browsers log deprecations there
  console.log = function(...args: any[]) {
    const message = argsToString(args);
    if (isDeprecationWarning(message)) {
      // Suppress these specific deprecation warnings
      return;
    }
    // Pass through all other logs
    originalLog(...args);
  };
})();

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

