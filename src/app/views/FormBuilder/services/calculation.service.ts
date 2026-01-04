import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CalculateExpressionRequest {
  expressionText: string;
  fieldValues: { [key: string]: any };
}

export interface CalculateExpressionResponse {
  success: boolean;
  data: number | string;
  message?: string;
  statusCode?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalculationService {
  private apiUrl = `${environment.apiUrl}/Formulas`;

  constructor(private http: HttpClient) {}

  /**
   * حساب تعبير مباشر (الأكثر استخداماً)
   * POST /api/Formulas/calculate-safe
   * 
   * @param request - التعبير والقيم
   * @returns Observable<number> - النتيجة المحسوبة
   */
  calculateSafe(request: CalculateExpressionRequest): Observable<number> {
    return this.http.post<number | CalculateExpressionResponse>(
      `${this.apiUrl}/calculate-safe`,
      request,
      { observe: 'body' }
    ).pipe(
      map(response => {
        // Handle both direct number response and ServiceResult wrapper
        if (typeof response === 'number') {
          return response;
        }
        if (response && response.success && typeof response.data === 'number') {
          return response.data;
        }
        if (response && response.success && typeof response.data === 'string') {
          // Try to parse string as number
          const parsed = parseFloat(response.data);
          if (!isNaN(parsed)) {
            return parsed;
          }
        }
        throw new Error(response?.message || 'Calculation failed');
      }),
      catchError(error => {
        console.error('Calculation error:', error);
        return throwError(() => new Error(
          error.error?.message || 
          error.message || 
          'حدث خطأ أثناء الحساب'
        ));
      })
    );
  }

  /**
   * حساب تعبير مع معالجة أخطاء أفضل
   * POST /api/Formulas/calculate-expression
   * 
   * @param request - التعبير والقيم
   * @returns Observable<CalculateExpressionResponse> - Response كامل
   */
  calculateExpression(request: CalculateExpressionRequest): Observable<CalculateExpressionResponse> {
    return this.http.post<CalculateExpressionResponse>(
      `${this.apiUrl}/calculate-expression`,
      request
    ).pipe(
      catchError(error => {
        console.error('Calculation expression error:', error);
        return throwError(() => new Error(
          error.error?.message || 
          error.message || 
          'حدث خطأ أثناء الحساب'
        ));
      })
    );
  }

  /**
   * حساب باستخدام Formula ID
   * POST /api/Formulas/{formulaId}/calculate
   * 
   * @param formulaId - معرف الصيغة
   * @param fieldValues - قيم الحقول
   * @returns Observable<CalculateExpressionResponse>
   */
  calculateByFormulaId(
    formulaId: number, 
    fieldValues: { [key: string]: any }
  ): Observable<CalculateExpressionResponse> {
    return this.http.post<CalculateExpressionResponse>(
      `${this.apiUrl}/${formulaId}/calculate`,
      fieldValues
    ).pipe(
      catchError(error => {
        console.error('Calculate by formula ID error:', error);
        return throwError(() => new Error(
          error.error?.message || 
          error.message || 
          'حدث خطأ أثناء الحساب'
        ));
      })
    );
  }

  /**
   * حساب متعدد (Batch)
   * POST /api/Formulas/batch-calculate
   * 
   * @param requests - مصفوفة من الطلبات
   * @returns Observable<CalculateExpressionResponse[]>
   */
  batchCalculate(requests: CalculateExpressionRequest[]): Observable<CalculateExpressionResponse[]> {
    return this.http.post<CalculateExpressionResponse[]>(
      `${this.apiUrl}/batch-calculate`,
      requests
    ).pipe(
      catchError(error => {
        console.error('Batch calculate error:', error);
        return throwError(() => new Error(
          error.error?.message || 
          error.message || 
          'حدث خطأ أثناء الحساب المتعدد'
        ));
      })
    );
  }

  /**
   * Helper: حساب MAX (القيمة العظمى)
   * يدعم أي عدد من المعاملات (2، 3، 4، 5، ...)
   * مثال: max(1, 23, 3) → 23
   * مثال: max(1, 23, 3, 50) → 50
   */
  max(...values: number[]): Observable<number> {
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    return this.calculateSafe({
      expressionText: `MAX(${fieldCodes.join(', ')})`,
      fieldValues
    });
  }

  /**
   * Helper: حساب MIN (القيمة الصغرى)
   * يدعم أي عدد من المعاملات (2، 3، 4، 5، ...)
   * مثال: min(10, 5, 8, 3, 15) → 3
   * مثال: min(1, 23, 3) → 1
   */
  min(...values: number[]): Observable<number> {
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    return this.calculateSafe({
      expressionText: `MIN(${fieldCodes.join(', ')})`,
      fieldValues
    });
  }

  /**
   * Helper: حساب SUM (جمع القيم)
   * يدعم أي عدد من المعاملات (2، 3، 4، 5، ...)
   * مثال: sum(10, 20, 30) → 60
   * مثال: sum(1, 2, 3, 4) → 10
   */
  sum(...values: number[]): Observable<number> {
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    return this.calculateSafe({
      expressionText: `SUM(${fieldCodes.join(', ')})`,
      fieldValues
    });
  }

  /**
   * Helper: حساب AVG (متوسط القيم)
   * يدعم أي عدد من المعاملات (2، 3، 4، 5، ...)
   * مثال: avg(10, 20, 30) → 20
   */
  avg(...values: number[]): Observable<number> {
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    return this.calculateSafe({
      expressionText: `AVG(${fieldCodes.join(', ')})`,
      fieldValues
    });
  }

  /**
   * Helper: حساب AVERAGE (بديل لـ AVG)
   * يدعم أي عدد من المعاملات (2، 3، 4، 5، ...)
   * مثال: average(10, 20, 30) → 20
   */
  average(...values: number[]): Observable<number> {
    return this.avg(...values);
  }

  /**
   * Helper: حساب SQRT (الجذر التربيعي)
   * مثال: sqrt(16) → 4
   * مثال: sqrt(25) → 5
   */
  sqrt(value: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'SQRT([VALUE])',
      fieldValues: { VALUE: value }
    });
  }

  /**
   * Helper: حساب ABS (القيمة المطلقة)
   * مثال: abs(-10) → 10
   * مثال: abs(15) → 15
   */
  abs(value: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'ABS([VALUE])',
      fieldValues: { VALUE: value }
    });
  }

  /**
   * Helper: حساب ROUND (التقريب)
   * مثال: round(3.7) → 4
   * مثال: round(3.456, 2) → 3.46
   * مثال: round(99.999, 2) → 100
   */
  round(value: number, decimals: number = 0): Observable<number> {
    return this.calculateSafe({
      expressionText: `ROUND([VALUE], ${decimals})`,
      fieldValues: { VALUE: value }
    });
  }

  /**
   * Helper: حساب FLOOR (التقريب للأسفل)
   * مثال: floor(3.7) → 3
   * مثال: floor(-3.7) → -4
   */
  floor(value: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'FLOOR([VALUE])',
      fieldValues: { VALUE: value }
    });
  }

  /**
   * Helper: حساب CEIL (التقريب للأعلى)
   * مثال: ceil(3.2) → 4
   * مثال: ceil(-3.2) → -3
   */
  ceil(value: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'CEIL([VALUE])',
      fieldValues: { VALUE: value }
    });
  }

  /**
   * Helper: حساب CEILING (بديل لـ CEIL)
   * مثال: ceiling(3.2) → 4
   */
  ceiling(value: number): Observable<number> {
    return this.ceil(value);
  }

  /**
   * Helper: حساب POW (الأس)
   * مثال: pow(2, 3) → 8
   * مثال: pow(5, 2) → 25
   * مثال: pow(16, 0.5) → 4 (الجذر التربيعي)
   */
  pow(base: number, exponent: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'POW([BASE], [EXPONENT])',
      fieldValues: { BASE: base, EXPONENT: exponent }
    });
  }

  /**
   * Helper: حساب MOD (باقي القسمة)
   * مثال: mod(10, 3) → 1
   * بديل: يمكن استخدام % مباشرة في التعبير
   */
  mod(number: number, divisor: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'MOD([NUMBER], [DIVISOR])',
      fieldValues: { NUMBER: number, DIVISOR: divisor }
    });
  }

  // ==================== العمليات الحسابية الأساسية ====================

  /**
   * Helper: الجمع (+)
   * مثال: add(10, 20) → 30
   * يمكن استخدام: [A] + [B] مباشرة في التعبير
   */
  add(a: number, b: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[A] + [B]',
      fieldValues: { A: a, B: b }
    });
  }

  /**
   * Helper: الجمع المتعدد
   * مثال: addMultiple(10, 20, 30, 40) → 100
   */
  addMultiple(...values: number[]): Observable<number> {
    if (values.length === 0) return throwError(() => new Error('At least one value is required'));
    if (values.length === 1) return new Observable(observer => observer.next(values[0]));
    
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    return this.calculateSafe({
      expressionText: fieldCodes.join(' + '),
      fieldValues
    });
  }

  /**
   * Helper: الطرح (-)
   * مثال: subtract(30, 20) → 10
   * يمكن استخدام: [A] - [B] مباشرة في التعبير
   */
  subtract(a: number, b: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[A] - [B]',
      fieldValues: { A: a, B: b }
    });
  }

  /**
   * Helper: الضرب (*)
   * مثال: multiply(5, 10) → 50
   * يمكن استخدام: [A] * [B] مباشرة في التعبير
   */
  multiply(a: number, b: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[A] * [B]',
      fieldValues: { A: a, B: b }
    });
  }

  /**
   * Helper: القسمة (/)
   * مثال: divide(100, 4) → 25
   * يمكن استخدام: [A] / [B] مباشرة في التعبير
   */
  divide(a: number, b: number): Observable<number> {
    if (b === 0) {
      return throwError(() => new Error('Division by zero is not allowed'));
    }
    return this.calculateSafe({
      expressionText: '[A] / [B]',
      fieldValues: { A: a, B: b }
    });
  }

  /**
   * Helper: باقي القسمة (%)
   * مثال: remainder(10, 3) → 1
   * يمكن استخدام: [A] % [B] أو MOD([A], [B]) مباشرة في التعبير
   */
  remainder(number: number, divisor: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[NUMBER] % [DIVISOR]',
      fieldValues: { NUMBER: number, DIVISOR: divisor }
    });
  }

  /**
   * Helper: الأس (Power) باستخدام ^
   * مثال: power(5, 2) → 25
   * يمكن استخدام: [BASE] ^ [EXPONENT] أو POW([BASE], [EXPONENT]) مباشرة في التعبير
   */
  power(base: number, exponent: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[BASE] ^ [EXPONENT]',
      fieldValues: { BASE: base, EXPONENT: exponent }
    });
  }

  // ==================== دوال التعبيرات المعقدة ====================

  /**
   * Helper: حساب تعبير معقد يجمع بين عدة دوال
   * مثال: round(sum(10, 20, 30) / 3, 2) → 20
   */
  calculateComplex(expression: string, fieldValues: { [key: string]: number }): Observable<number> {
    return this.calculateSafe({
      expressionText: expression,
      fieldValues
    });
  }

  /**
   * Helper: حساب الفرق بين MAX و MIN
   * مثال: maxMinDifference(10, 5, 15) → 10 (MAX=15, MIN=5, Difference=10)
   */
  maxMinDifference(...values: number[]): Observable<number> {
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    return this.calculateSafe({
      expressionText: `MAX(${fieldCodes.join(', ')}) - MIN(${fieldCodes.join(', ')})`,
      fieldValues
    });
  }

  /**
   * Helper: حساب المتوسط بعد إزالة القيمة الصغرى والعظمى
   * مثال: avgWithoutExtremes(10, 5, 8, 3, 15) → 9 (يُزيل 3 و 15، يحسب متوسط 5, 8, 10)
   */
  avgWithoutExtremes(...values: number[]): Observable<number> {
    if (values.length < 3) {
      return throwError(() => new Error('At least 3 values are required'));
    }
    
    const fieldValues: { [key: string]: number } = {};
    const fieldCodes: string[] = [];
    
    values.forEach((value, index) => {
      const code = `N${index + 1}`;
      fieldCodes.push(`[${code}]`);
      fieldValues[code] = value;
    });

    // (SUM - MAX - MIN) / (COUNT - 2)
    return this.calculateSafe({
      expressionText: `(SUM(${fieldCodes.join(', ')}) - MAX(${fieldCodes.join(', ')}) - MIN(${fieldCodes.join(', ')})) / (${values.length} - 2)`,
      fieldValues
    });
  }

  /**
   * Helper: حساب النسبة المئوية
   * مثال: percentage(25, 100) → 25 (25% من 100)
   */
  percentage(part: number, total: number): Observable<number> {
    if (total === 0) {
      return throwError(() => new Error('Total cannot be zero'));
    }
    return this.calculateSafe({
      expressionText: '([PART] / [TOTAL]) * 100',
      fieldValues: { PART: part, TOTAL: total }
    });
  }

  /**
   * Helper: حساب السعر بعد الخصم
   * مثال: priceAfterDiscount(100, 20) → 80 (سعر 100 بعد خصم 20%)
   */
  priceAfterDiscount(price: number, discountPercent: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[PRICE] - ([PRICE] * [DISCOUNT] / 100)',
      fieldValues: { PRICE: price, DISCOUNT: discountPercent }
    });
  }

  /**
   * Helper: حساب السعر بعد إضافة الضريبة
   * مثال: priceAfterTax(100, 15) → 115 (سعر 100 بعد إضافة ضريبة 15%)
   */
  priceAfterTax(price: number, taxPercent: number): Observable<number> {
    return this.calculateSafe({
      expressionText: '[PRICE] + ([PRICE] * [TAX] / 100)',
      fieldValues: { PRICE: price, TAX: taxPercent }
    });
  }

  /**
   * Helper: حساب المساحة (الجذر التربيعي للضرب)
   * مثال: area(4, 9) → 6 (SQRT(4 * 9) = SQRT(36) = 6)
   */
  area(length: number, width: number): Observable<number> {
    return this.calculateSafe({
      expressionText: 'SQRT([LENGTH] * [WIDTH])',
      fieldValues: { LENGTH: length, WIDTH: width }
    });
  }
}

