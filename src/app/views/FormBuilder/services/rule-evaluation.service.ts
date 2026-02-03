import { Injectable } from '@angular/core';
import {
  FormRule,
  Condition,
  Action
} from '../form-builder/models/form-builder-dto.model';

/**
 * Field State interface for rule-based field management
 */
export interface FieldState {
  isVisible: boolean;
  isMandatory: boolean;
  isReadOnly: boolean;
  value?: any;
}

/**
 * Rule Evaluation Service
 * Handles evaluation of form rules and application of actions
 */
@Injectable({
  providedIn: 'root'
})
export class RuleEvaluationService {

  /**
   * Evaluate a rule condition (single condition)
   */
  evaluateCondition(condition: Condition, fieldValues: Record<string, any>): boolean {
    if (!condition || !condition.field) {
      return true; // Empty condition is always true
    }

    return this.evaluateFieldCondition(condition, fieldValues);
  }

  /**
   * Evaluate a single field condition
   */
  evaluateFieldCondition(condition: Condition, fieldValues: Record<string, any>): boolean {
    // Try exact match first, then case-insensitive match
    let fieldValue = fieldValues[condition.field];
    if (fieldValue === undefined && condition.field) {
      // Try case-insensitive match
      const fieldKey = Object.keys(fieldValues).find(key => 
        key.toUpperCase() === condition.field.toUpperCase()
      );
      if (fieldKey) {
        fieldValue = fieldValues[fieldKey];
        console.log(`[RuleEvaluationService] Found field value using case-insensitive match: ${fieldKey} = ${fieldValue}`);
      }
    }
    
    // Get compare value - if valueType is 'field', get value from fieldValues
    let conditionValue = condition.value;
    if (condition.valueType === 'field' && condition.value) {
      conditionValue = fieldValues[condition.value];
    }

    switch (condition.operator) {
      case 'Equals':
        return this.compareValues(fieldValue, conditionValue, '===');
      case 'NotEquals':
        return !this.compareValues(fieldValue, conditionValue, '===');
      case 'Contains':
        return String(fieldValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
      case 'GreaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'LessThan':
        return Number(fieldValue) < Number(conditionValue);
      case 'IsEmpty':
        return !fieldValue || String(fieldValue).trim() === '';
      case 'IsNotEmpty':
        return fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '';
      case 'In':
        const inArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return inArray.includes(fieldValue);
      case 'NotIn':
        const notInArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return !notInArray.includes(fieldValue);
      default:
        console.warn(`[RuleEvaluationService] Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Compare two values with type conversion
   */
  private compareValues(value1: any, value2: any, operator: '===' | '=='): boolean {
    // Try type conversion for numbers and booleans
    const v1 = this.convertValue(value1);
    const v2 = this.convertValue(value2);

    // For string comparisons, use case-insensitive and trimmed comparison
    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return v1.trim().toLowerCase() === v2.trim().toLowerCase();
    }

    if (operator === '===') {
      return v1 === v2;
    } else {
      return v1 == v2; // eslint-disable-line eqeqeq
    }
  }

  /**
   * Convert value to appropriate type (number, boolean, or string)
   */
  private convertValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Try boolean
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;

    // Try number
    const num = Number(value);
    if (!isNaN(num) && String(value).trim() === String(num)) {
      return num;
    }

    // Return as string
    return String(value);
  }

  /**
   * Evaluate expression (for Compute action)
   * Simple expression evaluation - replace field codes with values
   */
  evaluateExpression(expression: string, fieldValues: Record<string, any>): number {
    try {
      // Replace field codes with values
      let expr = expression;
      const scope: Record<string, number> = {};
      
      Object.keys(fieldValues).forEach(fieldCode => {
        const value = fieldValues[fieldCode];
        const numValue = Number(value) || 0;
        scope[fieldCode] = numValue;
        // Also replace in expression string for simple cases
        expr = expr.replace(new RegExp(`\\b${fieldCode}\\b`, 'g'), String(numValue));
      });

      // Simple evaluation using Function (for basic math operations)
      // For complex expressions, consider using math.js library
      const result = Function(`"use strict"; return (${expr})`)();
      return typeof result === 'number' ? result : 0;
    } catch (err) {
      console.error('[RuleEvaluationService] Error evaluating expression:', err, {
        expression,
        fieldValues
      });
      return 0;
    }
  }

  /**
   * Execute a single rule
   */
  executeRule(
    rule: FormRule,
    fieldValues: Record<string, any>,
    fieldStates: Record<string, FieldState>
  ): void {
    if (!rule.isActive) {
      return;
    }

    // Handle StoredProcedure type rules
    if (rule.ruleType === 'StoredProcedure') {
      console.log(`[RuleEvaluationService] Rule "${rule.ruleName}" is StoredProcedure type`);
      
      // For StoredProcedure rules, if they have actions, execute them directly
      // (In a full implementation, you would call the stored procedure first and check result mapping)
      // For now, if there's no storedProcedureId or if we want to execute actions directly, do so
      if (rule.actions && rule.actions.length > 0) {
        console.log(`[RuleEvaluationService] Executing ${rule.actions.length} actions for StoredProcedure rule "${rule.ruleName}"`);
        console.log(`[RuleEvaluationService] Actions:`, rule.actions);
        console.log(`[RuleEvaluationService] Field states before applying actions:`, Object.keys(fieldStates));
        this.applyActions(rule.actions, fieldValues, fieldStates);
        console.log(`[RuleEvaluationService] Field states after applying actions:`, Object.keys(fieldStates).map(key => ({
          fieldCode: key,
          isVisible: fieldStates[key].isVisible
        })));
      } else {
        console.log(`[RuleEvaluationService] StoredProcedure rule "${rule.ruleName}" has no actions to execute`);
      }
      return;
    }

    // If rule has no condition (or empty condition), treat it as always true and execute actions
    if (!rule.condition || !rule.condition.field || 
        (typeof rule.condition.field === 'string' && rule.condition.field.trim() === '')) {
      console.log(`[RuleEvaluationService] Rule "${rule.ruleName}" has no condition, treating as always true and executing actions`);
      if (rule.actions && rule.actions.length > 0) {
        console.log(`[RuleEvaluationService] Applying ${rule.actions.length} actions for rule "${rule.ruleName}" (no condition)`);
        console.log(`[RuleEvaluationService] Actions:`, rule.actions);
        console.log(`[RuleEvaluationService] Field states before applying actions:`, Object.keys(fieldStates));
        this.applyActions(rule.actions, fieldValues, fieldStates);
        console.log(`[RuleEvaluationService] Field states after applying actions:`, Object.keys(fieldStates).map(key => ({
          fieldCode: key,
          isVisible: fieldStates[key].isVisible
        })));
      } else {
        console.warn(`[RuleEvaluationService] Rule "${rule.ruleName}" has no actions to apply`);
      }
      return;
    }

    // At this point, TypeScript knows rule.condition is defined and has a valid field
    const condition = rule.condition;
    const conditionMet = this.evaluateCondition(condition, fieldValues);
    
    console.log(`[RuleEvaluationService] Rule "${rule.ruleName}": condition field="${condition.field}", value="${condition.value}", conditionMet=${conditionMet}`);
    console.log(`[RuleEvaluationService] Field value for "${condition.field}":`, fieldValues[condition.field]);

    if (conditionMet && rule.actions) {
      console.log(`[RuleEvaluationService] Applying ${rule.actions.length} actions for rule "${rule.ruleName}"`);
      this.applyActions(rule.actions, fieldValues, fieldStates);
    }
  }

  /**
   * Apply rule actions
   */
  applyActions(
    actions: Action[],
    fieldValues: Record<string, any>,
    fieldStates: Record<string, FieldState>
  ): void {
    if (!actions || actions.length === 0) {
      return;
    }

    for (const action of actions) {
      this.applyAction(action, fieldValues, fieldStates);
    }
  }

  /**
   * Apply a single action
   */
  applyAction(
    action: Action,
    fieldValues: Record<string, any>,
    fieldStates: Record<string, FieldState>
  ): void {
    console.log(`[RuleEvaluationService] Applying action: type="${action.type}", fieldCode="${action.fieldCode}", value=${action.value}`);
    
    // Skip CopyToDocument actions - they are executed automatically by the system when events occur
    // They don't affect UI field states
    if (action.type === 'CopyToDocument') {
      console.log(`[RuleEvaluationService] Skipping CopyToDocument action - will be executed automatically by system when event occurs`);
      return;
    }

    if (!fieldStates[action.fieldCode]) {
      // Initialize field state if not exists
      fieldStates[action.fieldCode] = {
        isVisible: true,
        isMandatory: false,
        isReadOnly: false
      };
      console.log(`[RuleEvaluationService] Initialized field state for "${action.fieldCode}" with default values`);
    }

    const state = fieldStates[action.fieldCode];
    const previousVisibility = state.isVisible;

    switch (action.type) {
      case 'SetVisible':
        // For SetVisible, convert value to boolean properly
        // Handle string values like "true", "false", "1", "0", etc.
        let newVisibility: boolean;
        if (action.value === false || action.value === 'false' || action.value === 0 || action.value === '0') {
          newVisibility = false;
        } else if (action.value === true || action.value === 'true' || action.value === 1 || action.value === '1') {
          newVisibility = true;
        } else if (action.value === null || action.value === undefined || action.value === '') {
          // If value is null, undefined, or empty string, default to true for SetVisible
          // (SetVisible without a value means "show")
          newVisibility = true;
        } else {
          // For any other value, default to true for SetVisible
          newVisibility = true;
        }
        console.log(`[RuleEvaluationService] Setting visibility for "${action.fieldCode}" from ${previousVisibility} to ${newVisibility} (action.value was: ${action.value}, type: ${typeof action.value})`);
        state.isVisible = newVisibility;
        console.log(`[RuleEvaluationService] Field "${action.fieldCode}" visibility updated: ${state.isVisible}`);
        break;
      case 'SetReadOnly':
        state.isReadOnly = action.value !== undefined ? action.value : true;
        break;
      case 'SetMandatory':
        state.isMandatory = action.value !== undefined ? action.value : true;
        break;
      case 'SetDefault':
        if (action.value !== undefined && fieldValues[action.fieldCode] === undefined) {
          state.value = action.value;
          fieldValues[action.fieldCode] = action.value;
        }
        break;
      case 'ClearValue':
        state.value = undefined;
        fieldValues[action.fieldCode] = undefined;
        break;
      case 'Compute':
        if (action.expression) {
          try {
            // Evaluate expression - simple implementation
            // TODO: Implement proper expression evaluation
            const computedValue = this.evaluateExpression(action.expression, fieldValues);
            state.value = computedValue;
            fieldValues[action.fieldCode] = computedValue;
          } catch (e) {
            console.warn(`[RuleEvaluationService] Failed to compute expression: ${action.expression}`, e);
          }
        }
        break;
      default:
        console.warn(`[RuleEvaluationService] Unknown action type: ${action.type}`);
    }
  }

  /**
   * Evaluate all rules and return field states
   */
  evaluateAllRules(
    rules: FormRule[],
    fieldValues: Record<string, any>,
    baseFieldStates: Record<string, FieldState>
  ): Record<string, FieldState> {
    // Create a copy of base states
    const fieldStates: Record<string, FieldState> = {};
    Object.keys(baseFieldStates).forEach(key => {
      fieldStates[key] = { ...baseFieldStates[key] };
    });

    console.log('[RuleEvaluationService] Starting rule evaluation with', rules.length, 'rules');
    console.log('[RuleEvaluationService] Base field states:', Object.keys(fieldStates));
    console.log('[RuleEvaluationService] Field values:', fieldValues);

    // Sort rules by executionOrder (lower order first)
    const sortedRules = [...rules]
      .filter(rule => {
        const isActive = rule.isActive;
        console.log(`[RuleEvaluationService] Rule "${rule.ruleName}": isActive=${isActive}, ruleType=${rule.ruleType}, actionsCount=${rule.actions?.length || 0}`);
        return isActive;
      })
      .sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0));

    console.log(`[RuleEvaluationService] Filtered ${sortedRules.length} active rules from ${rules.length} total rules`);

    // Execute each rule
    for (const rule of sortedRules) {
      console.log(`[RuleEvaluationService] ===== Executing rule: "${rule.ruleName}" (order: ${rule.executionOrder}, type: ${rule.ruleType}) =====`);
      console.log(`[RuleEvaluationService] Rule details:`, {
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        isActive: rule.isActive,
        executionOrder: rule.executionOrder,
        hasCondition: !!rule.condition,
        conditionField: rule.condition?.field,
        actionsCount: rule.actions?.length || 0,
        actions: rule.actions
      });
      this.executeRule(rule, fieldValues, fieldStates);
      console.log(`[RuleEvaluationService] After rule "${rule.ruleName}", field states:`, Object.keys(fieldStates).map(key => ({
        fieldCode: key,
        isVisible: fieldStates[key].isVisible
      })));
    }

    console.log('[RuleEvaluationService] Final field states:', Object.keys(fieldStates).map(key => ({
      fieldCode: key,
      isVisible: fieldStates[key].isVisible,
      isMandatory: fieldStates[key].isMandatory,
      isReadOnly: fieldStates[key].isReadOnly
    })));

    return fieldStates;
  }
}

