# 📘 دليل استخدام CalculationService - Complete Guide

## 📋 نظرة عامة

`CalculationService` يوفر واجهة سهلة للاتصال بـ Backend API لحساب التعبيرات الرياضية. يدعم جميع العمليات الحسابية الأساسية والدوال الإحصائية والرياضية المتقدمة.

---

## 🔧 الاستيراد والاستخدام الأساسي

```typescript
import { CalculationService } from './services/calculation.service';

constructor(private calculationService: CalculationService) {}
```

---

## 📊 دوال الإحصاء والجمع (Statistical Functions)

### 1. SUM - جمع القيم
```typescript
// يدعم أي عدد من المعاملات
this.calculationService.sum(10, 20, 30).subscribe(result => {
  console.log(result); // 60
});

this.calculationService.sum(1, 2, 3, 4).subscribe(result => {
  console.log(result); // 10
});
```

### 2. AVG / AVERAGE - متوسط القيم
```typescript
// استخدام AVG
this.calculationService.avg(10, 20, 30).subscribe(result => {
  console.log(result); // 20
});

// استخدام AVERAGE (بديل)
this.calculationService.average(10, 20, 30, 40).subscribe(result => {
  console.log(result); // 25
});
```

### 3. MAX - القيمة العظمى
```typescript
this.calculationService.max(1, 23, 3).subscribe(result => {
  console.log(result); // 23
});

this.calculationService.max(1, 23, 3, 50).subscribe(result => {
  console.log(result); // 50
});

this.calculationService.max(10, 5, 8, 3, 15).subscribe(result => {
  console.log(result); // 15
});
```

### 4. MIN - القيمة الصغرى
```typescript
this.calculationService.min(10, 5, 8, 3, 15).subscribe(result => {
  console.log(result); // 3
});

this.calculationService.min(1, 23, 3).subscribe(result => {
  console.log(result); // 1
});
```

---

## 🔬 دوال الرياضيات المتقدمة (Advanced Math Functions)

### 5. SQRT - الجذر التربيعي
```typescript
this.calculationService.sqrt(16).subscribe(result => {
  console.log(result); // 4
});

this.calculationService.sqrt(25).subscribe(result => {
  console.log(result); // 5
});
```

### 6. ABS - القيمة المطلقة
```typescript
this.calculationService.abs(-10).subscribe(result => {
  console.log(result); // 10
});

this.calculationService.abs(15).subscribe(result => {
  console.log(result); // 15
});
```

### 7. ROUND - التقريب
```typescript
this.calculationService.round(3.7).subscribe(result => {
  console.log(result); // 4
});

this.calculationService.round(3.456, 2).subscribe(result => {
  console.log(result); // 3.46
});

this.calculationService.round(99.999, 2).subscribe(result => {
  console.log(result); // 100
});
```

### 8. FLOOR - التقريب للأسفل
```typescript
this.calculationService.floor(3.7).subscribe(result => {
  console.log(result); // 3
});

this.calculationService.floor(-3.7).subscribe(result => {
  console.log(result); // -4
});
```

### 9. CEIL / CEILING - التقريب للأعلى
```typescript
this.calculationService.ceil(3.2).subscribe(result => {
  console.log(result); // 4
});

this.calculationService.ceiling(3.2).subscribe(result => {
  console.log(result); // 4
});

this.calculationService.ceil(-3.2).subscribe(result => {
  console.log(result); // -3
});
```

### 10. POW - الأس
```typescript
this.calculationService.pow(2, 3).subscribe(result => {
  console.log(result); // 8
});

this.calculationService.pow(5, 2).subscribe(result => {
  console.log(result); // 25
});

this.calculationService.pow(16, 0.5).subscribe(result => {
  console.log(result); // 4 (الجذر التربيعي)
});
```

### 11. MOD - باقي القسمة
```typescript
this.calculationService.mod(10, 3).subscribe(result => {
  console.log(result); // 1
});

this.calculationService.mod(15, 4).subscribe(result => {
  console.log(result); // 3
});
```

---

## 🔢 العمليات الحسابية الأساسية (Basic Arithmetic Operations)

### الجمع (+)
```typescript
this.calculationService.add(10, 20).subscribe(result => {
  console.log(result); // 30
});

// جمع متعدد
this.calculationService.addMultiple(10, 20, 30, 40).subscribe(result => {
  console.log(result); // 100
});
```

### الطرح (-)
```typescript
this.calculationService.subtract(30, 20).subscribe(result => {
  console.log(result); // 10
});
```

### الضرب (*)
```typescript
this.calculationService.multiply(5, 10).subscribe(result => {
  console.log(result); // 50
});
```

### القسمة (/)
```typescript
this.calculationService.divide(100, 4).subscribe(result => {
  console.log(result); // 25
});
```

### باقي القسمة (%)
```typescript
this.calculationService.remainder(10, 3).subscribe(result => {
  console.log(result); // 1
});
```

### الأس (Power)
```typescript
this.calculationService.power(5, 2).subscribe(result => {
  console.log(result); // 25
});
```

---

## 🎯 دوال التعبيرات المعقدة (Complex Expressions)

### حساب تعبير معقد
```typescript
// ROUND(SUM([A], [B], [C]) / 3, 2)
this.calculationService.calculateComplex(
  'ROUND(SUM([A], [B], [C]) / 3, 2)',
  { A: 10, B: 20, C: 30 }
).subscribe(result => {
  console.log(result); // 20
});
```

### الفرق بين MAX و MIN
```typescript
// MAX([A], [B], [C]) - MIN([A], [B], [C])
this.calculationService.maxMinDifference(10, 5, 15).subscribe(result => {
  console.log(result); // 10 (MAX=15, MIN=5)
});
```

### المتوسط بعد إزالة القيمتين الصغرى والعظمى
```typescript
// يُزيل 3 و 15، يحسب متوسط 5, 8, 10
this.calculationService.avgWithoutExtremes(10, 5, 8, 3, 15).subscribe(result => {
  console.log(result); // 7.67
});
```

### حساب النسبة المئوية
```typescript
this.calculationService.percentage(25, 100).subscribe(result => {
  console.log(result); // 25 (25% من 100)
});
```

### السعر بعد الخصم
```typescript
this.calculationService.priceAfterDiscount(100, 20).subscribe(result => {
  console.log(result); // 80 (سعر 100 بعد خصم 20%)
});
```

### السعر بعد إضافة الضريبة
```typescript
this.calculationService.priceAfterTax(100, 15).subscribe(result => {
  console.log(result); // 115 (سعر 100 بعد إضافة ضريبة 15%)
});
```

### حساب المساحة
```typescript
// SQRT([LENGTH] * [WIDTH])
this.calculationService.area(4, 9).subscribe(result => {
  console.log(result); // 6 (SQRT(36) = 6)
});
```

---

## 🔧 استخدام calculateSafe مباشرة

يمكنك استخدام `calculateSafe` مباشرة لحساب أي تعبير:

```typescript
// مثال: MAX([N1], [N2], [N3])
this.calculationService.calculateSafe({
  expressionText: 'MAX([N1], [N2], [N3])',
  fieldValues: { N1: 1, N2: 23, N3: 3 }
}).subscribe(result => {
  console.log(result); // 23
});

// مثال: SUM([A], [B], [C])
this.calculationService.calculateSafe({
  expressionText: 'SUM([A], [B], [C])',
  fieldValues: { A: 10, B: 20, C: 30 }
}).subscribe(result => {
  console.log(result); // 60
});

// مثال: ROUND([VALUE], 2)
this.calculationService.calculateSafe({
  expressionText: 'ROUND([VALUE], 2)',
  fieldValues: { VALUE: 3.456 }
}).subscribe(result => {
  console.log(result); // 3.46
});

// مثال: تعبير معقد
this.calculationService.calculateSafe({
  expressionText: 'ROUND((SUM([A], [B], [C]) - MIN([A], [B], [C])) / MAX([A], [B], [C]), 2)',
  fieldValues: { A: 10, B: 5, C: 15 }
}).subscribe(result => {
  console.log(result); // 0.67
});
```

---

## 📝 أمثلة عملية (Practical Examples)

### حساب المجموع الكلي
```typescript
this.calculationService.sum(100, 200, 300, 400).subscribe(total => {
  console.log('المجموع الكلي:', total); // 1000
});
```

### حساب المتوسط
```typescript
this.calculationService.avg(85, 90, 95, 88, 92).subscribe(average => {
  console.log('المتوسط:', average); // 90
});
```

### إيجاد أعلى وأقل قيمة
```typescript
forkJoin({
  max: this.calculationService.max(10, 25, 5, 30, 15),
  min: this.calculationService.min(10, 25, 5, 30, 15)
}).subscribe(({ max, min }) => {
  console.log('أعلى قيمة:', max); // 30
  console.log('أقل قيمة:', min); // 5
});
```

### حساب السعر النهائي بعد الخصم والضريبة
```typescript
const originalPrice = 100;
const discount = 20;
const tax = 15;

this.calculationService.priceAfterDiscount(originalPrice, discount).subscribe(priceAfterDiscount => {
  this.calculationService.priceAfterTax(priceAfterDiscount, tax).subscribe(finalPrice => {
    console.log('السعر النهائي:', finalPrice); // 92
  });
});
```

---

## ⚠️ معالجة الأخطاء (Error Handling)

```typescript
this.calculationService.divide(100, 0).subscribe({
  next: (result) => {
    console.log('النتيجة:', result);
  },
  error: (error) => {
    console.error('خطأ:', error.message); // "Division by zero is not allowed"
  }
});

this.calculationService.calculateSafe({
  expressionText: 'INVALID_FUNCTION([A])',
  fieldValues: { A: 10 }
}).subscribe({
  next: (result) => {
    console.log('النتيجة:', result);
  },
  error: (error) => {
    console.error('خطأ:', error.message); // رسالة الخطأ من API
  }
});
```

---

## 📋 ملخص سريع (Quick Reference)

| الدالة | الوصف | مثال |
|--------|-------|------|
| `sum(...values)` | جمع القيم | `sum(10, 20, 30)` → 60 |
| `avg(...values)` | متوسط القيم | `avg(10, 20, 30)` → 20 |
| `average(...values)` | متوسط القيم (بديل) | `average(10, 20, 30)` → 20 |
| `max(...values)` | القيمة العظمى | `max(1, 23, 3)` → 23 |
| `min(...values)` | القيمة الصغرى | `min(10, 5, 8)` → 5 |
| `sqrt(value)` | الجذر التربيعي | `sqrt(16)` → 4 |
| `abs(value)` | القيمة المطلقة | `abs(-10)` → 10 |
| `round(value, decimals?)` | التقريب | `round(3.456, 2)` → 3.46 |
| `floor(value)` | التقريب للأسفل | `floor(3.7)` → 3 |
| `ceil(value)` | التقريب للأعلى | `ceil(3.2)` → 4 |
| `ceiling(value)` | التقريب للأعلى (بديل) | `ceiling(3.2)` → 4 |
| `pow(base, exponent)` | الأس | `pow(2, 3)` → 8 |
| `mod(number, divisor)` | باقي القسمة | `mod(10, 3)` → 1 |
| `add(a, b)` | الجمع | `add(10, 20)` → 30 |
| `addMultiple(...values)` | جمع متعدد | `addMultiple(10, 20, 30)` → 60 |
| `subtract(a, b)` | الطرح | `subtract(30, 20)` → 10 |
| `multiply(a, b)` | الضرب | `multiply(5, 10)` → 50 |
| `divide(a, b)` | القسمة | `divide(100, 4)` → 25 |
| `remainder(number, divisor)` | باقي القسمة | `remainder(10, 3)` → 1 |
| `power(base, exponent)` | الأس | `power(5, 2)` → 25 |
| `calculateComplex(expr, values)` | تعبير معقد | - |
| `maxMinDifference(...values)` | الفرق بين MAX و MIN | - |
| `avgWithoutExtremes(...values)` | المتوسط بدون القيمتين الصغرى والعظمى | - |
| `percentage(part, total)` | النسبة المئوية | `percentage(25, 100)` → 25 |
| `priceAfterDiscount(price, discount)` | السعر بعد الخصم | `priceAfterDiscount(100, 20)` → 80 |
| `priceAfterTax(price, tax)` | السعر بعد الضريبة | `priceAfterTax(100, 15)` → 115 |
| `area(length, width)` | حساب المساحة | `area(4, 9)` → 6 |

---

## ✅ ملاحظات مهمة (Important Notes)

1. ✅ **جميع الدوال تدعم أي عدد من المعاملات** (2، 3، 4، 5، ...)
2. ✅ **MAX و MIN و SUM و AVG تدعم أي عدد من المعاملات**
3. ✅ **القيم المفقودة تصبح 0 تلقائياً**
4. ✅ **يمكن استخدام الأقواس لتحديد أولوية العمليات**
5. ✅ **يمكن دمج عدة دوال في تعبير واحد**
6. ✅ **جميع الدوال تدعم القيم السالبة**
7. ✅ **يمكن استخدام `^` أو `**` للأس**
8. ✅ **يمكن استخدام `%` أو `MOD()` لباقي القسمة**
9. ✅ **جميع الدوال ترجع `Observable<number>`**
10. ✅ **يجب التعامل مع الأخطاء باستخدام `error` callback**

---

## 🚀 جاهز للاستخدام!

جميع هذه الدوال متاحة وجاهزة للاستخدام في `CalculationService`! 🎉

