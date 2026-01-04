import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalculationService } from '../../services/calculation.service';
import { FieldsService } from '../../services/fields.service';
import { FieldSelectorDialogComponent, FieldSelectorConfig } from '../field-selector-dialog/field-selector-dialog.component';
import { FormFieldDto } from '../../form-builder/models/form-builder-dto.model';

@Component({
  selector: 'app-calculator-example',
  standalone: true,
  imports: [CommonModule, FormsModule, FieldSelectorDialogComponent],
  template: `
    <div class="calculator">
      <h2>حاسبة التعبيرات</h2>
      
      <!-- Input Fields -->
      <div class="input-group">
        <label>N1:</label>
        <input type="number" [(ngModel)]="n1" (input)="calculate()">
      </div>
      
      <div class="input-group">
        <label>N2:</label>
        <input type="number" [(ngModel)]="n2" (input)="calculate()">
      </div>
      
      <div class="input-group">
        <label>N3:</label>
        <input type="number" [(ngModel)]="n3" (input)="calculate()">
      </div>
      
      <!-- Expression Input -->
      <div class="input-group">
        <label>التعبير:</label>
        <input type="text" [(ngModel)]="expression" (input)="calculate()" 
               placeholder="مثال: MAX([N1], [N2], [N3])">
      </div>
      
      <!-- Result -->
      <div class="result" *ngIf="result !== null">
        <h3>النتيجة: {{ result }}</h3>
      </div>
      
      <!-- Error -->
      <div class="error" *ngIf="error">
        <p>خطأ: {{ error }}</p>
      </div>
      
      <!-- Loading -->
      <div class="loading" *ngIf="loading">
        <p>جاري الحساب...</p>
      </div>

      <!-- Field Selector Dialog -->
      <app-field-selector-dialog
        [(visible)]="showFieldSelector"
        [availableFields]="availableFields"
        [config]="fieldSelectorConfig"
        (fieldsSelected)="onFieldsSelected($event)"
        (cancelled)="onFieldSelectorCancelled()">
      </app-field-selector-dialog>

      <!-- Form/Tab Selection -->
      <div class="form-selection" *ngIf="!availableFields.length">
        <div class="input-group">
          <label>Form Builder ID:</label>
          <input type="number" [(ngModel)]="formBuilderId" placeholder="Enter Form Builder ID">
        </div>
        <div class="input-group">
          <label>Tab ID:</label>
          <input type="number" [(ngModel)]="tabId" placeholder="Enter Tab ID">
        </div>
        <button (click)="loadFields()" class="btn btn-primary">Load Available Fields</button>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3>العمليات الحسابية (Arithmetic Operations):</h3>
        <div class="button-group">
          <button (click)="openFieldSelector('add')" class="btn btn-info">➕ ADD (Select Fields)</button>
          <button (click)="openFieldSelector('subtract')" class="btn btn-info">➖ SUBTRACT (Select Fields)</button>
          <button (click)="openFieldSelector('multiply')" class="btn btn-info">✖️ MULTIPLY (Select Fields)</button>
          <button (click)="openFieldSelector('divide')" class="btn btn-info">➗ DIVIDE (Select Fields)</button>
          <button (click)="openFieldSelector('power')" class="btn btn-info">🔢 POWER (Select Fields)</button>
        </div>
        
        <h3>دوال الرياضيات (Math Functions):</h3>
        <div class="button-group">
          <button (click)="openFieldSelector('sqrt')" class="btn btn-success">√ SQRT (Select Field)</button>
          <button (click)="openFieldSelector('abs')" class="btn btn-success">| | ABS (Select Field)</button>
          <button (click)="openFieldSelector('round')" class="btn btn-success">🔢 ROUND (Select Field)</button>
          <button (click)="openFieldSelector('floor')" class="btn btn-success">⬇️ FLOOR (Select Field)</button>
          <button (click)="openFieldSelector('ceil')" class="btn btn-success">⬆️ CEIL (Select Field)</button>
          <button (click)="openFieldSelector('pow')" class="btn btn-success">^ POW (Select Fields)</button>
          <button (click)="openFieldSelector('mod')" class="btn btn-success">% MOD (Select Fields)</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calculator {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
    }
    .input-group {
      margin-bottom: 15px;
    }
    .input-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .input-group input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .result {
      margin-top: 20px;
      padding: 15px;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
    }
    .error {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
    }
    .loading {
      margin-top: 20px;
      padding: 15px;
      text-align: center;
    }
    .quick-actions {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .quick-actions h3 {
      margin-bottom: 15px;
    }
    .quick-actions h3 {
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 16px;
      color: #333;
    }
    .quick-actions h3:first-child {
      margin-top: 0;
    }
    .button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }
    .quick-actions .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.3s;
    }
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    .btn-primary:hover {
      background-color: #0056b3;
    }
    .btn-success {
      background-color: #28a745;
      color: white;
    }
    .btn-success:hover {
      background-color: #218838;
    }
    .btn-info {
      background-color: #17a2b8;
      color: white;
    }
    .btn-info:hover {
      background-color: #138496;
    }
    .btn-warning {
      background-color: #ffc107;
      color: #212529;
    }
    .btn-warning:hover {
      background-color: #e0a800;
    }
    .form-selection {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
    }
    .form-selection button {
      margin-top: 10px;
    }
  `]
})
export class CalculatorExampleComponent implements OnInit {
  n1: number = 1;
  n2: number = 23;
  n3: number = 3;
  expression: string = 'MAX([N1], [N2], [N3])';
  result: number | null = null;
  error: string | null = null;
  loading: boolean = false;

  // Field selector
  showFieldSelector: boolean = false;
  availableFields: FormFieldDto[] = [];
  fieldSelectorConfig: FieldSelectorConfig | null = null;
  currentOperation: string = '';
  formBuilderId: number = 0;
  tabId: number = 0;

  constructor(
    private calculationService: CalculationService,
    private fieldsService: FieldsService
  ) {
    this.calculate();
  }

  ngOnInit() {
    // يمكن تحميل الحقول تلقائياً إذا كان لديك formBuilderId و tabId
  }

  loadFields() {
    if (!this.formBuilderId || !this.tabId) {
      this.error = 'Please enter Form Builder ID and Tab ID';
      return;
    }

    this.loading = true;
    this.error = null;
    this.fieldsService.getFields(this.formBuilderId, this.tabId).subscribe({
      next: (fields) => {
        // Filter only active fields and add displayName
        this.availableFields = fields
          .filter(f => f.isActive && f.fieldCode)
          .map(f => ({
            ...f,
            displayName: `[${f.fieldCode}] ${f.fieldName || f.fieldCode}`
          }))
          .sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0));
        
        this.loading = false;
        if (this.availableFields.length === 0) {
          this.error = 'No active fields found. Please check Form Builder ID and Tab ID.';
        } else {
          this.error = null;
        }
      },
      error: (err) => {
        this.error = 'Failed to load fields: ' + (err.error?.message || err.message || 'Unknown error');
        this.loading = false;
        this.availableFields = [];
      }
    });
  }

  openFieldSelector(operation: string) {
    this.currentOperation = operation;
    
    const configs: { [key: string]: FieldSelectorConfig } = {
      // Arithmetic Operations
      'add': { operationType: 'arithmetic', operationName: 'ADD - Select Fields', minFields: 2, allowMultiple: true },
      'subtract': { operationType: 'arithmetic', operationName: 'SUBTRACT - Select 2 Fields', minFields: 2, maxFields: 2, allowMultiple: true },
      'multiply': { operationType: 'arithmetic', operationName: 'MULTIPLY - Select 2 Fields', minFields: 2, maxFields: 2, allowMultiple: true },
      'divide': { operationType: 'arithmetic', operationName: 'DIVIDE - Select 2 Fields', minFields: 2, maxFields: 2, allowMultiple: true },
      'power': { operationType: 'arithmetic', operationName: 'POWER - Select 2 Fields (Base, Exponent)', minFields: 2, maxFields: 2, allowMultiple: true },
      
      // Math Functions
      'sqrt': { operationType: 'math', operationName: 'SQRT - Select 1 Field', minFields: 1, maxFields: 1, allowMultiple: false },
      'abs': { operationType: 'math', operationName: 'ABS - Select 1 Field', minFields: 1, maxFields: 1, allowMultiple: false },
      'round': { operationType: 'math', operationName: 'ROUND - Select 1 Field', minFields: 1, maxFields: 1, allowMultiple: false },
      'floor': { operationType: 'math', operationName: 'FLOOR - Select 1 Field', minFields: 1, maxFields: 1, allowMultiple: false },
      'ceil': { operationType: 'math', operationName: 'CEIL - Select 1 Field', minFields: 1, maxFields: 1, allowMultiple: false },
      'pow': { operationType: 'math', operationName: 'POW - Select 2 Fields (Base, Exponent)', minFields: 2, maxFields: 2, allowMultiple: true },
      'mod': { operationType: 'math', operationName: 'MOD - Select 2 Fields (Number, Divisor)', minFields: 2, maxFields: 2, allowMultiple: true }
    };

    this.fieldSelectorConfig = configs[operation] || null;
    
    if (this.availableFields.length === 0) {
      this.error = 'Please load available fields first (enter Form Builder ID and Tab ID)';
      return;
    }

    this.showFieldSelector = true;
  }

  onFieldsSelected(selectedFieldCodes: string[]) {
    this.showFieldSelector = false;
    
    if (!selectedFieldCodes || selectedFieldCodes.length === 0) {
      this.error = 'No fields selected';
      return;
    }

    this.error = null;
    const fieldCodes = selectedFieldCodes.map(code => `[${code}]`);
    let expression = '';

    switch (this.currentOperation) {
      case 'add':
        expression = fieldCodes.join(' + ');
        break;
      case 'subtract':
        expression = fieldCodes.length === 2 ? `${fieldCodes[0]} - ${fieldCodes[1]}` : fieldCodes.join(' - ');
        break;
      case 'multiply':
        expression = fieldCodes.length === 2 ? `${fieldCodes[0]} * ${fieldCodes[1]}` : fieldCodes.join(' * ');
        break;
      case 'divide':
        expression = fieldCodes.length === 2 ? `${fieldCodes[0]} / ${fieldCodes[1]}` : fieldCodes.join(' / ');
        break;
      case 'power':
        expression = fieldCodes.length === 2 ? `${fieldCodes[0]} ^ ${fieldCodes[1]}` : fieldCodes.join(' ^ ');
        break;
      case 'sqrt':
        expression = `SQRT(${fieldCodes[0]})`;
        break;
      case 'abs':
        expression = `ABS(${fieldCodes[0]})`;
        break;
      case 'round':
        expression = `ROUND(${fieldCodes[0]}, 2)`;
        break;
      case 'floor':
        expression = `FLOOR(${fieldCodes[0]})`;
        break;
      case 'ceil':
        expression = `CEIL(${fieldCodes[0]})`;
        break;
      case 'pow':
        expression = fieldCodes.length === 2 ? `POW(${fieldCodes[0]}, ${fieldCodes[1]})` : `POW(${fieldCodes[0]}, 2)`;
        break;
      case 'mod':
        expression = fieldCodes.length === 2 ? `MOD(${fieldCodes[0]}, ${fieldCodes[1]})` : `MOD(${fieldCodes[0]}, 2)`;
        break;
      default:
        expression = fieldCodes.join(', ');
    }

    this.expression = expression;
    this.calculate();
  }

  onFieldSelectorCancelled() {
    this.showFieldSelector = false;
    this.fieldSelectorConfig = null;
    this.currentOperation = '';
  }

  calculate(): void {
    if (!this.expression.trim()) {
      this.result = null;
      return;
    }

    this.loading = true;
    this.error = null;

    const request = {
      expressionText: this.expression,
      fieldValues: {
        N1: this.n1,
        N2: this.n2,
        N3: this.n3
      }
    };

    this.calculationService.calculateSafe(request).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'حدث خطأ أثناء الحساب';
        this.loading = false;
        console.error('Calculation error:', err);
      }
    });
  }

  // Quick test methods
  testSqrt(): void {
    this.calculationService.sqrt(16).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'SQRT([VALUE])';
        console.log('SQRT Result:', result); // 4
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testAbs(): void {
    this.calculationService.abs(-10).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'ABS([VALUE])';
        console.log('ABS Result:', result); // 10
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testRound(): void {
    this.calculationService.round(3.456, 2).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'ROUND([VALUE], 2)';
        console.log('ROUND Result:', result); // 3.46
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testPow(): void {
    this.calculationService.pow(2, 3).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'POW([BASE], [EXPONENT])';
        console.log('POW Result:', result); // 8
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testFloor(): void {
    this.calculationService.floor(3.7).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'FLOOR([VALUE])';
        console.log('FLOOR Result:', result); // 3
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testCeil(): void {
    this.calculationService.ceil(3.2).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'CEIL([VALUE])';
        console.log('CEIL Result:', result); // 4
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testMod(): void {
    this.calculationService.mod(10, 3).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = 'MOD([NUMBER], [DIVISOR])';
        console.log('MOD Result:', result); // 1
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testAdd(): void {
    this.calculationService.add(10, 20).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = '[A] + [B]';
        console.log('ADD Result:', result); // 30
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testSubtract(): void {
    this.calculationService.subtract(30, 20).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = '[A] - [B]';
        console.log('SUBTRACT Result:', result); // 10
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testMultiply(): void {
    this.calculationService.multiply(5, 10).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = '[A] * [B]';
        console.log('MULTIPLY Result:', result); // 50
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testDivide(): void {
    this.calculationService.divide(100, 4).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = '[A] / [B]';
        console.log('DIVIDE Result:', result); // 25
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }

  testPower(): void {
    this.calculationService.power(5, 2).subscribe({
      next: (result) => {
        this.result = result;
        this.expression = '[BASE] ^ [EXPONENT]';
        console.log('POWER Result:', result); // 25
      },
      error: (err) => {
        this.error = err.message;
        console.error('Error:', err);
      }
    });
  }
}

