import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormRulesService } from './form-rules.service';
import { FormRule, FormRuleDto, CreateFormRuleDto, UpdateFormRuleDto, Action, Condition } from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

describe('FormRulesService', () => {
  let service: FormRulesService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/FormRules`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormRulesService]
    });
    service = TestBed.inject(FormRulesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllRules', () => {
    it('should fetch all rules', () => {
      const mockRules: FormRuleDto[] = [
        {
          id: 1,
          formBuilderId: 1,
          ruleName: 'Test Rule 1',
          conditionField: 'field1',
          conditionOperator: 'Equals',
          conditionValue: 'test',
          conditionValueType: 'constant',
          actions: [],
          isActive: true,
          executionOrder: 1
        }
      ];

      service.getAllRules().subscribe(rules => {
        expect(rules.length).toBe(1);
        expect(rules[0].ruleName).toBe('Test Rule 1');
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockRules });
    });

    it('should return empty array on error', () => {
      service.getAllRules().subscribe(rules => {
        expect(rules).toEqual([]);
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getRuleById', () => {
    it('should fetch rule by id', () => {
      const mockRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'Test Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: true,
        executionOrder: 1
      };

      service.getRuleById(1).subscribe(rule => {
        expect(rule).toBeTruthy();
        expect(rule?.ruleName).toBe('Test Rule');
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRule);
    });

    it('should handle ApiResponse wrapper', () => {
      const mockRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'Test Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: true,
        executionOrder: 1
      };

      service.getRuleById(1).subscribe(rule => {
        expect(rule).toBeTruthy();
        expect(rule?.ruleName).toBe('Test Rule');
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush({ data: mockRule });
    });

    it('should return null on error', () => {
      service.getRuleById(1).subscribe(rule => {
        expect(rule).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getRulesByFormId', () => {
    it('should fetch rules for a form', () => {
      const mockRules: FormRuleDto[] = [
        {
          id: 1,
          formBuilderId: 1,
          ruleName: 'Rule 1',
          conditionField: 'field1',
          conditionOperator: 'Equals',
          conditionValue: 'test',
          conditionValueType: 'constant',
          actions: [],
          isActive: true,
          executionOrder: 1
        },
        {
          id: 2,
          formBuilderId: 1,
          ruleName: 'Rule 2',
          conditionField: 'field2',
          conditionOperator: 'Equals',
          conditionValue: 'test2',
          conditionValueType: 'constant',
          actions: [],
          isActive: true,
          executionOrder: 2
        }
      ];

      service.getRulesByFormId(1).subscribe(rules => {
        expect(rules.length).toBe(2);
        expect(rules[0].ruleName).toBe('Rule 1');
        expect(rules[1].ruleName).toBe('Rule 2');
      });

      const req = httpMock.expectOne(`${baseUrl}/form/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRules);
    });

    it('should handle ApiResponse wrapper', () => {
      const mockRules: FormRuleDto[] = [
        {
          id: 1,
          formBuilderId: 1,
          ruleName: 'Rule 1',
          conditionField: 'field1',
          conditionOperator: 'Equals',
          conditionValue: 'test',
          conditionValueType: 'constant',
          actions: [],
          isActive: true,
          executionOrder: 1
        }
      ];

      service.getRulesByFormId(1).subscribe(rules => {
        expect(rules.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/form/1`);
      req.flush({ data: mockRules });
    });

    it('should return empty array on error', () => {
      service.getRulesByFormId(1).subscribe(rules => {
        expect(rules).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/form/1`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getActiveRulesByFormId', () => {
    it('should fetch only active rules for a form', () => {
      const mockRules: FormRuleDto[] = [
        {
          id: 1,
          formBuilderId: 1,
          ruleName: 'Active Rule',
          conditionField: 'field1',
          conditionOperator: 'Equals',
          conditionValue: 'test',
          conditionValueType: 'constant',
          actions: [],
          isActive: true,
          executionOrder: 1
        }
      ];

      service.getActiveRulesByFormId(1).subscribe(rules => {
        expect(rules.length).toBe(1);
        expect(rules[0].isActive).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/form/1/active`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRules);
    });
  });

  describe('createRule', () => {
    it('should create a new rule', () => {
      const newRule: CreateFormRuleDto = {
        formBuilderId: 1,
        ruleName: 'New Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [{
          type: 'SetVisible',
          fieldCode: 'field2',
          value: true
        }],
        isActive: true,
        executionOrder: 1
      };

      const createdRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'New Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [{
          type: 'SetVisible',
          fieldCode: 'field2',
          value: true
        }],
        isActive: true,
        executionOrder: 1
      };

      service.createRule(newRule).subscribe(rule => {
        expect(rule).toBeTruthy();
        expect(rule.ruleName).toBe('New Rule');
        expect(rule.actions?.length).toBe(1);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newRule);
      req.flush(createdRule);
    });

    it('should handle ApiResponse wrapper', () => {
      const newRule: CreateFormRuleDto = {
        formBuilderId: 1,
        ruleName: 'New Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: true,
        executionOrder: 1
      };

      const createdRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'New Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: true,
        executionOrder: 1
      };

      service.createRule(newRule).subscribe(rule => {
        expect(rule).toBeTruthy();
        expect(rule.ruleName).toBe('New Rule');
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ data: createdRule });
    });

    it('should throw error on creation failure', () => {
      const newRule: CreateFormRuleDto = {
        formBuilderId: 1,
        ruleName: 'New Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: true,
        executionOrder: 1
      };

      service.createRule(newRule).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ message: 'Validation error' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', () => {
      const updateDto: UpdateFormRuleDto = {
        formBuilderId: 1,
        ruleName: 'Updated Rule',
        isActive: false
      };

      const updatedRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'Updated Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: false,
        executionOrder: 1
      };

      service.updateRule(1, updateDto).subscribe(rule => {
        expect(rule).toBeTruthy();
        expect(rule.ruleName).toBe('Updated Rule');
        expect(rule.isActive).toBe(false);
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.formBuilderId).toBe(1);
      expect(req.request.body.ruleName).toBe('Updated Rule');
      req.flush(updatedRule);
    });

    it('should handle 204 No Content response', (done) => {
      const updateDto: UpdateFormRuleDto = {
        formBuilderId: 1,
        ruleName: 'Updated Rule'
      };

      const updatedRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'Updated Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: true,
        executionOrder: 1
      };

      service.updateRule(1, updateDto).subscribe(rule => {
        expect(rule).toBeTruthy();
        expect(rule.ruleName).toBe('Updated Rule');
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush(null, { status: 204, statusText: 'No Content' });

      // Simulate the fetch after update
      const fetchReq = httpMock.expectOne(`${baseUrl}/1`);
      fetchReq.flush(updatedRule);
    });

    it('should handle 409 Conflict error', (done) => {
      const updateDto: UpdateFormRuleDto = {
        formBuilderId: 1,
        ruleName: 'Updated Rule'
      };

      service.updateRule(1, updateDto).subscribe({
        next: () => {
          fail('should have failed');
          done();
        },
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.message).toContain('conflict');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush({ message: 'Entity tracking conflict' }, { 
        status: 409, 
        statusText: 'Conflict'
      });
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', () => {
      service.deleteRule(1).subscribe(() => {
        // Success
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });

    it('should throw error on deletion failure', () => {
      service.deleteRule(1).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('softDeleteRule', () => {
    it('should soft delete a rule', () => {
      service.softDeleteRule(1).subscribe(() => {
        // Success
      });

      const req = httpMock.expectOne(`${baseUrl}/soft-delete/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('toggleRuleActive', () => {
    it('should toggle rule active status', () => {
      const updatedRule: FormRuleDto = {
        id: 1,
        formBuilderId: 1,
        ruleName: 'Test Rule',
        conditionField: 'field1',
        conditionOperator: 'Equals',
        conditionValue: 'test',
        conditionValueType: 'constant',
        actions: [],
        isActive: false,
        executionOrder: 1
      };

      service.toggleRuleActive(1, false, 1).subscribe(rule => {
        expect(rule.isActive).toBe(false);
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.isActive).toBe(false);
      req.flush(updatedRule);
    });
  });

  describe('convertToDto', () => {
    it('should convert FormRule to CreateFormRuleDto', () => {
      const formRule: FormRule = {
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

      const dto = service.convertToDto(formRule, 1);
      expect(dto.formBuilderId).toBe(1);
      expect(dto.ruleName).toBe('Test Rule');
      expect(dto.conditionField).toBe('field1');
      expect(dto.conditionOperator).toBe('Equals');
      expect(dto.conditionValue).toBe('test');
      expect(dto.actions?.length).toBe(1);
    });
  });
});

