/**
 * Script to import example form rules
 * Run this in the browser console or as a service method
 */

import { FormRulesService } from './src/app/views/FormBuilder/services/form-rules.service';
import { CreateFormRuleDto } from './src/app/views/FormBuilder/form-builder/models/form-builder-dto.model';

/**
 * Example rules based on the form fields:
 * - Customer Type (CUSTOMER_TYPE)
 * - Customer Name (CUSTOMER_NAME)
 * - Company Name (COMPANY_NAME)
 * - Order Amount (ORDER_AMOUNT)
 */

export const exampleRules: CreateFormRuleDto[] = [
  // Rule 1: Show Company Name when Customer Type is "Corporate"
  {
    formBuilderId: 1, // Replace with your actual form ID
    ruleName: "Show Company Name for Corporate Customers",
    conditionField: "CUSTOMER_TYPE",
    conditionOperator: "Equals",
    conditionValue: "Corporate",
    conditionValueType: "constant",
    actions: [
      {
        type: "SetVisible",
        fieldCode: "COMPANY_NAME",
        value: true
      }
    ],
    isActive: true,
    executionOrder: 1
  },
  
  // Rule 2: Hide Company Name when Customer Type is "Individual"
  {
    formBuilderId: 1,
    ruleName: "Hide Company Name for Individual Customers",
    conditionField: "CUSTOMER_TYPE",
    conditionOperator: "Equals",
    conditionValue: "Individual",
    conditionValueType: "constant",
    actions: [
      {
        type: "SetVisible",
        fieldCode: "COMPANY_NAME",
        value: false
      }
    ],
    isActive: true,
    executionOrder: 2
  },
  
  // Rule 3: Make Company Name mandatory for Corporate customers
  {
    formBuilderId: 1,
    ruleName: "Company Name Required for Corporate",
    conditionField: "CUSTOMER_TYPE",
    conditionOperator: "Equals",
    conditionValue: "Corporate",
    conditionValueType: "constant",
    actions: [
      {
        type: "SetMandatory",
        fieldCode: "COMPANY_NAME",
        value: true
      }
    ],
    isActive: true,
    executionOrder: 3
  },
  
  // Rule 4: Show discount fields for large orders (> 1000)
  {
    formBuilderId: 1,
    ruleName: "Show Discount for Large Orders",
    conditionField: "ORDER_AMOUNT",
    conditionOperator: "GreaterThan",
    conditionValue: "1000",
    conditionValueType: "constant",
    actions: [
      {
        type: "SetVisible",
        fieldCode: "DISCOUNT_CODE",
        value: true
      },
      {
        type: "SetVisible",
        fieldCode: "DISCOUNT_AMOUNT",
        value: true
      }
    ],
    isActive: true,
    executionOrder: 4
  }
];

/**
 * Function to import all example rules
 * Usage: importRules(1, formRulesService)
 */
export function importRules(
  formBuilderId: number,
  formRulesService: FormRulesService
): void {
  console.log(`[Import Rules] Starting import for form ${formBuilderId}`);
  
  // Update formBuilderId in all rules
  const rulesToImport = exampleRules.map(rule => ({
    ...rule,
    formBuilderId
  }));
  
  let imported = 0;
  let failed = 0;
  
  rulesToImport.forEach((rule, index) => {
    formRulesService.createRule(rule).subscribe({
      next: (createdRule) => {
        imported++;
        console.log(`[Import Rules] ✓ Rule ${index + 1} created: ${createdRule.ruleName}`);
        
        if (imported + failed === rulesToImport.length) {
          console.log(`[Import Rules] Complete! Imported: ${imported}, Failed: ${failed}`);
        }
      },
      error: (error) => {
        failed++;
        console.error(`[Import Rules] ✗ Rule ${index + 1} failed: ${rule.ruleName}`, error);
        
        if (imported + failed === rulesToImport.length) {
          console.log(`[Import Rules] Complete! Imported: ${imported}, Failed: ${failed}`);
        }
      }
    });
  });
}

/**
 * Function to import rules one by one (sequential)
 */
export function importRulesSequential(
  formBuilderId: number,
  formRulesService: FormRulesService
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Import Rules] Starting sequential import for form ${formBuilderId}`);
    
    const rulesToImport = exampleRules.map(rule => ({
      ...rule,
      formBuilderId
    }));
    
    let currentIndex = 0;
    
    function importNext() {
      if (currentIndex >= rulesToImport.length) {
        console.log(`[Import Rules] All rules imported successfully!`);
        resolve();
        return;
      }
      
      const rule = rulesToImport[currentIndex];
      console.log(`[Import Rules] Importing rule ${currentIndex + 1}/${rulesToImport.length}: ${rule.ruleName}`);
      
      formRulesService.createRule(rule).subscribe({
        next: (createdRule) => {
          console.log(`[Import Rules] ✓ Rule ${currentIndex + 1} created: ${createdRule.ruleName}`);
          currentIndex++;
          // Wait a bit before importing next rule
          setTimeout(importNext, 500);
        },
        error: (error) => {
          console.error(`[Import Rules] ✗ Rule ${currentIndex + 1} failed: ${rule.ruleName}`, error);
          currentIndex++;
          // Continue with next rule even if this one failed
          setTimeout(importNext, 500);
        }
      });
    }
    
    importNext();
  });
}

