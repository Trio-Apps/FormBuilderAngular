/**
 * Calculation Operations Constants
 * قائمة العمليات الحسابية المتاحة في النظام
 */

export interface CalculationOperation {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  endpoint: string;
  method: 'calculateExpression' | 'calculateSafe' | 'calculateAdvanced' | 'calculateFormulaById' | 'previewCalculation';
  recommended: boolean;
  icon?: string;
}

/**
 * Available calculation operations
 */
export const CALCULATION_OPERATIONS: CalculationOperation[] = [
  {
    id: 'calculate-expression',
    name: 'Calculate Expression',
    nameAr: 'حساب تعبير مباشر',
    description: 'Calculate expression directly (most commonly used)',
    descriptionAr: 'حساب تعبير مباشر (الأكثر استخداماً)',
    endpoint: '/api/Formulas/calculate-expression',
    method: 'calculateExpression',
    recommended: false,
    icon: 'pi pi-calculator'
  },
  {
    id: 'calculate-safe',
    name: 'Calculate Safe',
    nameAr: 'حساب آمن',
    description: 'Safe calculation with error handling (Recommended)',
    descriptionAr: 'حساب آمن مع معالجة الأخطاء (مُوصى به)',
    endpoint: '/api/Formulas/calculate-safe',
    method: 'calculateSafe',
    recommended: true,
    icon: 'pi pi-shield'
  },
  {
    id: 'calculate-advanced',
    name: 'Calculate Advanced',
    nameAr: 'حساب متقدم',
    description: 'Advanced calculation with all operations support',
    descriptionAr: 'حساب متقدم مع دعم جميع العمليات',
    endpoint: '/api/Formulas/calculate-advanced',
    method: 'calculateAdvanced',
    recommended: false,
    icon: 'pi pi-cog'
  },
  {
    id: 'preview-calculation',
    name: 'Preview Calculation',
    nameAr: 'معاينة الحساب',
    description: 'Preview calculation result for testing',
    descriptionAr: 'معاينة نتيجة الحساب للاختبار',
    endpoint: '/api/Formulas/preview-calculation',
    method: 'previewCalculation',
    recommended: false,
    icon: 'pi pi-eye'
  }
];

/**
 * Get calculation operation by ID
 */
export function getCalculationOperationById(id: string): CalculationOperation | undefined {
  return CALCULATION_OPERATIONS.find(op => op.id === id);
}

/**
 * Get recommended calculation operation
 */
export function getRecommendedCalculationOperation(): CalculationOperation {
  return CALCULATION_OPERATIONS.find(op => op.recommended) || CALCULATION_OPERATIONS[1]; // Default to calculate-safe
}

/**
 * Get calculation operation by method name
 */
export function getCalculationOperationByMethod(method: string): CalculationOperation | undefined {
  return CALCULATION_OPERATIONS.find(op => op.method === method);
}

