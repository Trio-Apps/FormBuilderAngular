import { TestBed } from '@angular/core/testing';
import { RuleEvaluationService, FieldState } from './rule-evaluation.service';
import { FormRule, Condition, Action } from '../form-builder/models/form-builder-dto.model';

describe('RuleEvaluationService', () => {
  let service: RuleEvaluationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RuleEvaluationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('evaluateFieldCondition', () => {
    const fieldValues: Record<string, any> = {
      'field1': 'test',
      'field2': 100,
      'field3': true,
      'field4': '',
      'field5': null,
      'field6': 'Hello World',
      'field7': 50
    };

    describe('Equals operator', () => {
      it('should return true when string values match', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'Equals',
          value: 'test',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when string values do not match', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'Equals',
          value: 'different',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });

      it('should return true when number values match', () => {
        const condition: Condition = {
          field: 'field2',
          operator: 'Equals',
          value: 100,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return true when boolean values match', () => {
        const condition: Condition = {
          field: 'field3',
          operator: 'Equals',
          value: true,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should handle string to number conversion', () => {
        const condition: Condition = {
          field: 'field2',
          operator: 'Equals',
          value: '100',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });
    });

    describe('NotEquals operator', () => {
      it('should return true when values do not match', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'NotEquals',
          value: 'different',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when values match', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'NotEquals',
          value: 'test',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('Contains operator', () => {
      it('should return true when string contains value (case insensitive)', () => {
        const condition: Condition = {
          field: 'field6',
          operator: 'Contains',
          value: 'hello',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when string does not contain value', () => {
        const condition: Condition = {
          field: 'field6',
          operator: 'Contains',
          value: 'xyz',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('GreaterThan operator', () => {
      it('should return true when field value is greater', () => {
        const condition: Condition = {
          field: 'field2',
          operator: 'GreaterThan',
          value: 50,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when field value is not greater', () => {
        const condition: Condition = {
          field: 'field7',
          operator: 'GreaterThan',
          value: 100,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('LessThan operator', () => {
      it('should return true when field value is less', () => {
        const condition: Condition = {
          field: 'field7',
          operator: 'LessThan',
          value: 100,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when field value is not less', () => {
        const condition: Condition = {
          field: 'field2',
          operator: 'LessThan',
          value: 50,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('IsEmpty operator', () => {
      it('should return true for empty string', () => {
        const condition: Condition = {
          field: 'field4',
          operator: 'IsEmpty',
          value: null,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return true for null value', () => {
        const condition: Condition = {
          field: 'field5',
          operator: 'IsEmpty',
          value: null,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false for non-empty value', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'IsEmpty',
          value: null,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('IsNotEmpty operator', () => {
      it('should return true for non-empty value', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'IsNotEmpty',
          value: null,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false for empty string', () => {
        const condition: Condition = {
          field: 'field4',
          operator: 'IsNotEmpty',
          value: null,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });

      it('should return false for null value', () => {
        const condition: Condition = {
          field: 'field5',
          operator: 'IsNotEmpty',
          value: null,
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('In operator', () => {
      it('should return true when value is in array', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'In',
          value: ['test', 'other'],
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when value is not in array', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'In',
          value: ['other', 'different'],
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });

      it('should handle single value as array', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'In',
          value: 'test',
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });
    });

    describe('NotIn operator', () => {
      it('should return true when value is not in array', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'NotIn',
          value: ['other', 'different'],
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });

      it('should return false when value is in array', () => {
        const condition: Condition = {
          field: 'field1',
          operator: 'NotIn',
          value: ['test', 'other'],
          valueType: 'constant'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });
    });

    describe('Field value type', () => {
      it('should get value from another field when valueType is "field"', () => {
        const condition: Condition = {
          field: 'field7',
          operator: 'Equals',
          value: 'field2', // Reference to another field
          valueType: 'field'
        };
        // field7 = 50, field2 = 100, so they should not be equal
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(false);
      });

      it('should compare field values correctly', () => {
        fieldValues['field8'] = 100;
        const condition: Condition = {
          field: 'field8',
          operator: 'Equals',
          value: 'field2', // Reference to field2 which is 100
          valueType: 'field'
        };
        expect(service.evaluateFieldCondition(condition, fieldValues)).toBe(true);
      });
    });
  });

  describe('evaluateCondition', () => {
    it('should return true for empty condition', () => {
      const condition: Condition = {
        field: '',
        operator: 'Equals',
        value: null,
        valueType: 'constant'
      };
      expect(service.evaluateCondition(condition, {})).toBe(true);
    });

    it('should return true for null condition', () => {
      expect(service.evaluateCondition(null as any, {})).toBe(true);
    });
  });

  describe('evaluateExpression', () => {
    it('should evaluate simple addition', () => {
      const fieldValues: Record<string, any> = {
        'amount': 100,
        'tax': 10
      };
      const result = service.evaluateExpression('amount + tax', fieldValues);
      expect(result).toBe(110);
    });

    it('should evaluate simple multiplication', () => {
      const fieldValues: Record<string, any> = {
        'quantity': 5,
        'price': 20
      };
      const result = service.evaluateExpression('quantity * price', fieldValues);
      expect(result).toBe(100);
    });

    it('should handle missing field values as 0', () => {
      const fieldValues: Record<string, any> = {
        'amount': 100
      };
      const result = service.evaluateExpression('amount + missingField', fieldValues);
      expect(result).toBe(100);
    });

    it('should return 0 for invalid expressions', () => {
      const fieldValues: Record<string, any> = {};
      const result = service.evaluateExpression('invalid expression syntax', fieldValues);
      expect(result).toBe(0);
    });
  });

  describe('applyAction', () => {
    let fieldValues: Record<string, any>;
    let fieldStates: Record<string, FieldState>;

    beforeEach(() => {
      fieldValues = {
        'field1': 'value1',
        'field2': 'value2'
      };
      fieldStates = {
        'field1': {
          isVisible: true,
          isMandatory: false,
          isReadOnly: false
        },
        'field2': {
          isVisible: true,
          isMandatory: false,
          isReadOnly: false
        }
      };
    });

    it('should apply SetVisible action', () => {
      const action: Action = {
        type: 'SetVisible',
        fieldCode: 'field1',
        value: true
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['field1'].isVisible).toBe(true);
    });

    it('should apply SetVisible action with false value', () => {
      const action: Action = {
        type: 'SetVisible',
        fieldCode: 'field1',
        value: false
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['field1'].isVisible).toBe(false);
    });

    it('should apply SetReadOnly action', () => {
      const action: Action = {
        type: 'SetReadOnly',
        fieldCode: 'field1',
        value: true
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['field1'].isReadOnly).toBe(true);
    });

    it('should apply SetMandatory action', () => {
      const action: Action = {
        type: 'SetMandatory',
        fieldCode: 'field1',
        value: true
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['field1'].isMandatory).toBe(true);
    });

    it('should apply SetDefault action when field value is undefined', () => {
      fieldValues['field3'] = undefined;
      const action: Action = {
        type: 'SetDefault',
        fieldCode: 'field3',
        value: 'defaultValue'
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['field3'].value).toBe('defaultValue');
      expect(fieldValues['field3']).toBe('defaultValue');
    });

    it('should not apply SetDefault action when field value exists', () => {
      fieldValues['field3'] = 'existingValue';
      const action: Action = {
        type: 'SetDefault',
        fieldCode: 'field3',
        value: 'defaultValue'
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldValues['field3']).toBe('existingValue');
    });

    it('should apply ClearValue action', () => {
      const action: Action = {
        type: 'ClearValue',
        fieldCode: 'field1'
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['field1'].value).toBeUndefined();
      expect(fieldValues['field1']).toBeUndefined();
    });

    it('should apply Compute action', () => {
      fieldValues['total'] = 0;
      fieldValues['amount'] = 100;
      fieldValues['tax'] = 10;
      const action: Action = {
        type: 'Compute',
        fieldCode: 'total',
        expression: 'amount + tax'
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['total'].value).toBe(110);
      expect(fieldValues['total']).toBe(110);
    });

    it('should initialize field state if not exists', () => {
      const action: Action = {
        type: 'SetVisible',
        fieldCode: 'newField',
        value: true
      };
      service.applyAction(action, fieldValues, fieldStates);
      expect(fieldStates['newField']).toBeDefined();
      expect(fieldStates['newField'].isVisible).toBe(true);
    });
  });

  describe('applyActions', () => {
    it('should apply multiple actions', () => {
      const fieldValues: Record<string, any> = {};
      const fieldStates: Record<string, FieldState> = {};
      const actions: Action[] = [
        {
          type: 'SetVisible',
          fieldCode: 'field1',
          value: true
        },
        {
          type: 'SetMandatory',
          fieldCode: 'field1',
          value: true
        },
        {
          type: 'SetReadOnly',
          fieldCode: 'field2',
          value: true
        }
      ];
      service.applyActions(actions, fieldValues, fieldStates);
      expect(fieldStates['field1'].isVisible).toBe(true);
      expect(fieldStates['field1'].isMandatory).toBe(true);
      expect(fieldStates['field2'].isReadOnly).toBe(true);
    });

    it('should handle empty actions array', () => {
      const fieldValues: Record<string, any> = {};
      const fieldStates: Record<string, FieldState> = {};
      service.applyActions([], fieldValues, fieldStates);
      expect(Object.keys(fieldStates).length).toBe(0);
    });
  });

  describe('executeRule', () => {
    it('should execute rule when condition is met', () => {
      const fieldValues: Record<string, any> = {
        'field1': 'test'
      };
      const fieldStates: Record<string, FieldState> = {};
      const rule: FormRule = {
        id: 1,
        ruleName: 'Test Rule',
        condition: {
          field: 'field1',
          operator: 'Equals',
          value: 'test',
          valueType: 'constant'
        },
        actions: [{
          type: 'SetVisible',
          fieldCode: 'field2',
          value: true
        }],
        isActive: true,
        executionOrder: 1
      };
      service.executeRule(rule, fieldValues, fieldStates);
      expect(fieldStates['field2']).toBeDefined();
      expect(fieldStates['field2'].isVisible).toBe(true);
    });

    it('should not execute rule when condition is not met', () => {
      const fieldValues: Record<string, any> = {
        'field1': 'different'
      };
      const fieldStates: Record<string, FieldState> = {};
      const rule: FormRule = {
        id: 1,
        ruleName: 'Test Rule',
        condition: {
          field: 'field1',
          operator: 'Equals',
          value: 'test',
          valueType: 'constant'
        },
        actions: [{
          type: 'SetVisible',
          fieldCode: 'field2',
          value: true
        }],
        isActive: true,
        executionOrder: 1
      };
      service.executeRule(rule, fieldValues, fieldStates);
      expect(fieldStates['field2']).toBeUndefined();
    });

    it('should not execute inactive rule', () => {
      const fieldValues: Record<string, any> = {
        'field1': 'test'
      };
      const fieldStates: Record<string, FieldState> = {};
      const rule: FormRule = {
        id: 1,
        ruleName: 'Test Rule',
        condition: {
          field: 'field1',
          operator: 'Equals',
          value: 'test',
          valueType: 'constant'
        },
        actions: [{
          type: 'SetVisible',
          fieldCode: 'field2',
          value: true
        }],
        isActive: false,
        executionOrder: 1
      };
      service.executeRule(rule, fieldValues, fieldStates);
      expect(fieldStates['field2']).toBeUndefined();
    });
  });

  describe('evaluateAllRules', () => {
    it('should evaluate rules in execution order', () => {
      const fieldValues: Record<string, any> = {
        'field1': 'test'
      };
      const baseFieldStates: Record<string, FieldState> = {
        'field2': {
          isVisible: false,
          isMandatory: false,
          isReadOnly: false
        }
      };
      const rules: FormRule[] = [
        {
          id: 1,
          ruleName: 'Rule 1',
          condition: {
            field: 'field1',
            operator: 'Equals',
            value: 'test',
            valueType: 'constant'
          },
          actions: [{
            type: 'SetVisible',
            fieldCode: 'field2',
            value: true
          }],
          isActive: true,
          executionOrder: 1
        },
        {
          id: 2,
          ruleName: 'Rule 2',
          condition: {
            field: 'field1',
            operator: 'Equals',
            value: 'test',
            valueType: 'constant'
          },
          actions: [{
            type: 'SetReadOnly',
            fieldCode: 'field2',
            value: true
          }],
          isActive: true,
          executionOrder: 2
        }
      ];
      const result = service.evaluateAllRules(rules, fieldValues, baseFieldStates);
      expect(result['field2'].isVisible).toBe(true);
      expect(result['field2'].isReadOnly).toBe(true);
    });

    it('should filter out inactive rules', () => {
      const fieldValues: Record<string, any> = {
        'field1': 'test'
      };
      const baseFieldStates: Record<string, FieldState> = {};
      const rules: FormRule[] = [
        {
          id: 1,
          ruleName: 'Active Rule',
          condition: {
            field: 'field1',
            operator: 'Equals',
            value: 'test',
            valueType: 'constant'
          },
          actions: [{
            type: 'SetVisible',
            fieldCode: 'field2',
            value: true
          }],
          isActive: true,
          executionOrder: 1
        },
        {
          id: 2,
          ruleName: 'Inactive Rule',
          condition: {
            field: 'field1',
            operator: 'Equals',
            value: 'test',
            valueType: 'constant'
          },
          actions: [{
            type: 'SetVisible',
            fieldCode: 'field3',
            value: true
          }],
          isActive: false,
          executionOrder: 2
        }
      ];
      const result = service.evaluateAllRules(rules, fieldValues, baseFieldStates);
      expect(result['field2']).toBeDefined();
      expect(result['field3']).toBeUndefined();
    });

    it('should sort rules by executionOrder', () => {
      const fieldValues: Record<string, any> = {
        'field1': 'test'
      };
      const baseFieldStates: Record<string, FieldState> = {
        'field2': {
          isVisible: false,
          isMandatory: false,
          isReadOnly: false
        }
      };
      const rules: FormRule[] = [
        {
          id: 2,
          ruleName: 'Rule 2',
          condition: {
            field: 'field1',
            operator: 'Equals',
            value: 'test',
            valueType: 'constant'
          },
          actions: [{
            type: 'SetReadOnly',
            fieldCode: 'field2',
            value: true
          }],
          isActive: true,
          executionOrder: 2
        },
        {
          id: 1,
          ruleName: 'Rule 1',
          condition: {
            field: 'field1',
            operator: 'Equals',
            value: 'test',
            valueType: 'constant'
          },
          actions: [{
            type: 'SetVisible',
            fieldCode: 'field2',
            value: true
          }],
          isActive: true,
          executionOrder: 1
        }
      ];
      const result = service.evaluateAllRules(rules, fieldValues, baseFieldStates);
      // Rule 1 should execute first (executionOrder 1), then Rule 2 (executionOrder 2)
      expect(result['field2'].isVisible).toBe(true);
      expect(result['field2'].isReadOnly).toBe(true);
    });

    it('should preserve base field states', () => {
      const fieldValues: Record<string, any> = {};
      const baseFieldStates: Record<string, FieldState> = {
        'field1': {
          isVisible: true,
          isMandatory: false,
          isReadOnly: false
        }
      };
      const rules: FormRule[] = [];
      const result = service.evaluateAllRules(rules, fieldValues, baseFieldStates);
      expect(result['field1']).toBeDefined();
      expect(result['field1'].isVisible).toBe(true);
    });
  });
});

