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
    const fieldValue = fieldValues[condition.field];
    
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

    const conditionMet = this.evaluateCondition(rule.condition, fieldValues);

    if (conditionMet && rule.actions) {
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
    if (!fieldStates[action.fieldCode]) {
      // Initialize field state if not exists
      fieldStates[action.fieldCode] = {
        isVisible: true,
        isMandatory: false,
        isReadOnly: false
      };
    }

    const state = fieldStates[action.fieldCode];

    switch (action.type) {
      case 'SetVisible':
        state.isVisible = action.value !== undefined ? action.value : true;
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

    // Sort rules by executionOrder (lower order first)
    const sortedRules = [...rules]
      .filter(rule => rule.isActive)
      .sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0));

    // Execute each rule
    for (const rule of sortedRules) {
      this.executeRule(rule, fieldValues, fieldStates);
    }

    return fieldStates;
  }
}

