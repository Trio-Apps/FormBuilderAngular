# شرح FORM_RULES (قواعد النموذج الديناميكية)

هذا المستند يشرح **FORM_RULES** بطريقة بسيطة وواضحة للمطورين، مع أمثلة عملية.

---

## 📋 المحتويات
1. [الصورة الكبيرة - ما هي FORM_RULES؟](#1-الصورة-الكبيرة)
2. [كيف تعمل القواعد؟](#2-كيف-تعمل-القواعد)
3. [مكونات القاعدة](#3-مكونات-القاعدة)
4. [أنواع القواعد](#4-أنواع-القواعد)
5. [أمثلة عملية](#5-أمثلة-عملية)
6. [التنفيذ في الكود](#6-التنفيذ-في-الكود)

---

## 1. الصورة الكبيرة

### ما هي FORM_RULES؟

**FORM_RULES** هي نظام يسمح للنموذج بتغيير سلوكه **ديناميكياً** بناءً على قيم الحقول.

بدون القواعد:
- الحقول ثابتة (مرئية دائماً أو مخفية دائماً)
- الحقول إما إجبارية دائماً أو اختيارية دائماً
- لا يمكن تغيير السلوك حسب إدخال المستخدم

مع القواعد:
- يمكن إظهار/إخفاء الحقول حسب القيم
- يمكن جعل الحقول إجبارية/اختيارية ديناميكياً
- يمكن جعل الحقول للقراءة فقط حسب الحالة
- يمكن تعيين قيم تلقائياً

---

## 2. كيف تعمل القواعد؟

### المبدأ الأساسي: IF → THEN

كل قاعدة تتكون من:
- **IF (شرط)**: متى يتم تفعيل القاعدة؟
- **THEN (إجراء)**: ماذا يحدث عند تفعيلها؟

```
IF: HasCompany = true
THEN: Show CompanyName field
```

---

## 3. مكونات القاعدة

### 3.1. RuleCondition (الشرط)

الشرط يحدد **متى** يتم تفعيل القاعدة.

```typescript
RuleCondition {
  operator: 'And' | 'Or',  // ربط الشروط
  conditions: FieldCondition[]  // قائمة الشروط
}
```

#### FieldCondition (شرط حقل واحد)

```typescript
FieldCondition {
  fieldCode: string,        // كود الحقل المراد فحصه
  operator: FieldOperator,  // نوع المقارنة
  value?: any,              // القيمة للمقارنة
  valueType?: string        // نوع القيمة
}
```

#### FieldOperator (أنواع المقارنات)

| Operator | الوصف | مثال |
|----------|-------|------|
| `Equals` | يساوي | `CustomerType = "Corporate"` |
| `NotEquals` | لا يساوي | `Status != "Draft"` |
| `Contains` | يحتوي على | `Name contains "ABC"` |
| `GreaterThan` | أكبر من | `Amount > 1000` |
| `LessThan` | أصغر من | `Age < 18` |
| `IsEmpty` | فارغ | `Email is empty` |
| `IsNotEmpty` | غير فارغ | `Phone is not empty` |
| `In` | موجود في القائمة | `Country in ["US", "UK"]` |
| `NotIn` | غير موجود في القائمة | `Status not in ["Deleted"]` |

---

### 3.2. RuleAction (الإجراء)

الإجراء يحدد **ماذا** يحدث عند تفعيل القاعدة.

```typescript
RuleAction {
  fieldCode: string,    // الحقل المستهدف
  actionType: ActionType,  // نوع الإجراء
  value?: any           // قيمة اختيارية (لـ SetValue)
}
```

#### ActionType (أنواع الإجراءات)

| Action | الوصف | مثال |
|--------|-------|------|
| `Show` | إظهار الحقل | إظهار `CompanyName` |
| `Hide` | إخفاء الحقل | إخفاء `TaxNumber` |
| `SetRequired` | جعل الحقل إجباري | `TaxNumber` إجباري |
| `SetOptional` | جعل الحقل اختياري | `Notes` اختياري |
| `SetReadOnly` | جعل الحقل للقراءة فقط | `Status` للقراءة فقط |
| `SetEditable` | جعل الحقل قابل للتعديل | `Amount` قابل للتعديل |
| `SetValue` | تعيين قيمة | `Country = "US"` |
| `SetDefaultValue` | تعيين قيمة افتراضية | `Currency = "USD"` |

---

## 4. أنواع القواعد

### 4.1. Visibility Rules (قواعد الإظهار/الإخفاء)

تتحكم في **رؤية** الحقول.

**مثال:**
```
IF: HasCompany = true
THEN: Show CompanyName
```

**الكود:**
```typescript
{
  ruleType: 'Visibility',
  condition: {
    operator: 'And',
    conditions: [{
      fieldCode: 'HasCompany',
      operator: 'Equals',
      value: true
    }]
  },
  actions: [{
    fieldCode: 'CompanyName',
    actionType: 'Show'
  }]
}
```

---

### 4.2. Mandatory Rules (قواعد الإجبارية)

تتحكم في **إجبارية** الحقول.

**مثال:**
```
IF: CustomerType = "Corporate"
THEN: Make TaxNumber required
```

**الكود:**
```typescript
{
  ruleType: 'Mandatory',
  condition: {
    operator: 'And',
    conditions: [{
      fieldCode: 'CustomerType',
      operator: 'Equals',
      value: 'Corporate'
    }]
  },
  actions: [{
    fieldCode: 'TaxNumber',
    actionType: 'SetRequired'
  }]
}
```

---

### 4.3. ReadOnly Rules (قواعد القراءة فقط)

تتحكم في **قابلية التعديل** للحقول.

**مثال:**
```
IF: Status = "Submitted"
THEN: Set all fields to ReadOnly
```

**الكود:**
```typescript
{
  ruleType: 'ReadOnly',
  condition: {
    operator: 'And',
    conditions: [{
      fieldCode: 'Status',
      operator: 'Equals',
      value: 'Submitted'
    }]
  },
  actions: [
    { fieldCode: 'CustomerName', actionType: 'SetReadOnly' },
    { fieldCode: 'Amount', actionType: 'SetReadOnly' },
    { fieldCode: 'Notes', actionType: 'SetReadOnly' }
  ]
}
```

---

### 4.4. Custom Rules (قواعد مخصصة)

يمكن دمج عدة إجراءات في قاعدة واحدة.

**مثال:**
```
IF: Country = "US"
THEN: 
  - Show State field
  - Hide Province field
  - Set Currency = "USD"
```

---

## 5. أمثلة عملية

### مثال 1: إظهار/إخفاء حقل بسيط

**السيناريو:** عند اختيار "لدي شركة"، يظهر حقل اسم الشركة.

```typescript
{
  ruleName: "Show Company Name",
  ruleType: "Visibility",
  condition: {
    operator: "And",
    conditions: [{
      fieldCode: "HasCompany",
      operator: "Equals",
      value: true
    }]
  },
  actions: [{
    fieldCode: "CompanyName",
    actionType: "Show"
  }],
  isActive: true,
  priority: 1
}
```

**النتيجة:**
- عندما `HasCompany = true` → `CompanyName` يظهر
- عندما `HasCompany = false` → `CompanyName` يختفي

---

### مثال 2: شروط متعددة (AND)

**السيناريو:** إظهار حقل فقط إذا كان المستخدم "Corporate" **و** المبلغ أكبر من 1000.

```typescript
{
  ruleName: "Show Tax for Corporate Large Orders",
  ruleType: "Visibility",
  condition: {
    operator: "And",  // يجب أن يكون كلا الشرطين صحيحين
    conditions: [
      {
        fieldCode: "CustomerType",
        operator: "Equals",
        value: "Corporate"
      },
      {
        fieldCode: "Amount",
        operator: "GreaterThan",
        value: 1000
      }
    ]
  },
  actions: [{
    fieldCode: "TaxNumber",
    actionType: "Show"
  }]
}
```

---

### مثال 3: شروط متعددة (OR)

**السيناريو:** إظهار حقل إذا كان البلد "US" **أو** "UK".

```typescript
{
  ruleName: "Show State for US or UK",
  ruleType: "Visibility",
  condition: {
    operator: "Or",  // يكفي أن يكون أحد الشرطين صحيحاً
    conditions: [
      {
        fieldCode: "Country",
        operator: "Equals",
        value: "US"
      },
      {
        fieldCode: "Country",
        operator: "Equals",
        value: "UK"
      }
    ]
  },
  actions: [{
    fieldCode: "State",
    actionType: "Show"
  }]
}
```

---

### مثال 4: جعل الحقل إجباري ديناميكياً

**السيناريو:** عند اختيار "Corporate"، يصبح حقل TaxNumber إجبارياً.

```typescript
{
  ruleName: "Tax Number Required for Corporate",
  ruleType: "Mandatory",
  condition: {
    operator: "And",
    conditions: [{
      fieldCode: "CustomerType",
      operator: "Equals",
      value: "Corporate"
    }]
  },
  actions: [{
    fieldCode: "TaxNumber",
    actionType: "SetRequired"
  }]
}
```

---

### مثال 5: تعيين قيمة تلقائياً

**السيناريو:** عند اختيار البلد، يتم تعيين العملة تلقائياً.

```typescript
{
  ruleName: "Auto Set Currency",
  ruleType: "Custom",
  condition: {
    operator: "And",
    conditions: [{
      fieldCode: "Country",
      operator: "Equals",
      value: "US"
    }]
  },
  actions: [{
    fieldCode: "Currency",
    actionType: "SetValue",
    value: "USD"
  }]
}
```

---

### مثال 6: قواعد متعددة مع Priority

**السيناريو:** 
- قاعدة 1 (Priority: 10): إذا Status = "Submitted" → كل الحقول ReadOnly
- قاعدة 2 (Priority: 5): إذا CustomerType = "Corporate" → TaxNumber إجباري

```typescript
// القاعدة 1 - أولوية أعلى
{
  ruleName: "Lock Form on Submit",
  ruleType: "ReadOnly",
  priority: 10,  // أولوية عالية
  condition: {
    operator: "And",
    conditions: [{
      fieldCode: "Status",
      operator: "Equals",
      value: "Submitted"
    }]
  },
  actions: [
    { fieldCode: "CustomerName", actionType: "SetReadOnly" },
    { fieldCode: "Amount", actionType: "SetReadOnly" },
    { fieldCode: "TaxNumber", actionType: "SetReadOnly" }
  ]
}

// القاعدة 2 - أولوية أقل
{
  ruleName: "Tax Required for Corporate",
  ruleType: "Mandatory",
  priority: 5,  // أولوية أقل
  condition: {
    operator: "And",
    conditions: [{
      fieldCode: "CustomerType",
      operator: "Equals",
      value: "Corporate"
    }]
  },
  actions: [{
    fieldCode: "TaxNumber",
    actionType: "SetRequired"
  }]
}
```

**النتيجة:**
- إذا `Status = "Submitted"` → كل الحقول ReadOnly (حتى لو CustomerType = "Corporate")
- إذا `Status != "Submitted"` و `CustomerType = "Corporate"` → TaxNumber إجباري

---

## 6. التنفيذ في الكود

### 6.1. هيكل البيانات (Interfaces)

```typescript
// في form-builder-dto.model.ts

export interface FormRule {
  id?: number;
  formId: number;
  ruleName: string;
  ruleType: FormRuleType;  // 'Visibility' | 'Mandatory' | 'ReadOnly' | 'Custom'
  condition: RuleCondition;
  actions: RuleAction[];
  isActive: boolean;
  priority?: number;  // أولوية التنفيذ
  description?: string;
}

export interface RuleCondition {
  operator: ConditionOperator;  // 'And' | 'Or'
  conditions: FieldCondition[];
}

export interface FieldCondition {
  fieldCode: string;
  operator: FieldOperator;
  value?: any;
  valueType?: 'string' | 'number' | 'boolean' | 'date';
}

export interface RuleAction {
  fieldCode: string;
  actionType: ActionType;
  value?: any;
}
```

---

### 6.2. تقييم القواعد (Rule Evaluation)

**في form-view.component.ts:**

```typescript
// يتم استدعاء هذه الدالة عند تغيير أي قيمة حقل
evaluateFormRules(): void {
  if (!this.form?.formRules?.length) return;

  // 1. ترتيب القواعد حسب الأولوية
  const sortedRules = [...this.form.formRules]
    .filter(rule => rule.isActive)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // 2. إعادة تعيين الحالات الديناميكية
  this.resetDynamicFieldStates();

  // 3. تقييم كل قاعدة
  for (const rule of sortedRules) {
    if (this.evaluateCondition(rule.condition)) {
      this.applyActions(rule.actions);
    }
  }
}
```

---

### 6.3. تقييم الشرط (Condition Evaluation)

```typescript
private evaluateCondition(condition: RuleCondition): boolean {
  if (!condition?.conditions?.length) return true;

  // تقييم كل شرط
  const results = condition.conditions.map(
    cond => this.evaluateFieldCondition(cond)
  );

  // تطبيق المشغل (And/Or)
  if (condition.operator === 'Or') {
    return results.some(r => r === true);
  } else {
    return results.every(r => r === true);
  }
}

private evaluateFieldCondition(condition: FieldCondition): boolean {
  const fieldValue = this.fieldValues[condition.fieldCode];
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'Equals':
      return this.compareValues(fieldValue, conditionValue, '===');
    case 'NotEquals':
      return !this.compareValues(fieldValue, conditionValue, '===');
    case 'Contains':
      return String(fieldValue || '').toLowerCase()
        .includes(String(conditionValue || '').toLowerCase());
    case 'GreaterThan':
      return Number(fieldValue) > Number(conditionValue);
    case 'LessThan':
      return Number(fieldValue) < Number(conditionValue);
    case 'IsEmpty':
      return !fieldValue || String(fieldValue).trim() === '';
    case 'IsNotEmpty':
      return fieldValue !== undefined && 
             fieldValue !== null && 
             String(fieldValue).trim() !== '';
    // ... باقي المشغلات
  }
}
```

---

### 6.4. تطبيق الإجراءات (Apply Actions)

```typescript
private applyActions(actions: RuleAction[]): void {
  for (const action of actions) {
    const state = this.dynamicFieldStates[action.fieldCode];
    if (!state) continue;

    switch (action.actionType) {
      case 'Show':
        state.isVisible = true;
        break;
      case 'Hide':
        state.isVisible = false;
        break;
      case 'SetRequired':
        state.isRequired = true;
        break;
      case 'SetOptional':
        state.isRequired = false;
        break;
      case 'SetReadOnly':
        state.isReadOnly = true;
        break;
      case 'SetEditable':
        state.isReadOnly = false;
        break;
      case 'SetValue':
        if (action.value !== undefined) {
          state.value = action.value;
          this.fieldValues[action.fieldCode] = action.value;
        }
        break;
    }
  }
}
```

---

### 6.5. تتبع تغييرات القيم

```typescript
// يتم استدعاء هذه الدالة عند تغيير قيمة أي حقل
onFieldValueChange(fieldId: number | string, value: any, fieldCode?: string): void {
  // تحديث القيم
  this.fieldValues[String(fieldId)] = value;
  if (fieldCode) {
    this.fieldValues[fieldCode] = value;
  }

  // إعادة تقييم القواعد
  this.evaluateFormRules();
}
```

---

## 7. سير العمل الكامل (Workflow)

```
1. المستخدم يفتح النموذج
   ↓
2. يتم تحميل النموذج مع القواعد (formRules)
   ↓
3. يتم تهيئة الحالات الديناميكية (dynamicFieldStates)
   ↓
4. يتم تقييم القواعد الأولية
   ↓
5. المستخدم يغير قيمة حقل
   ↓
6. onFieldValueChange() يتم استدعاؤها
   ↓
7. evaluateFormRules() يتم استدعاؤها
   ↓
8. يتم تقييم كل قاعدة حسب الأولوية
   ↓
9. يتم تطبيق الإجراءات على الحقول المستهدفة
   ↓
10. الواجهة تتحدث تلقائياً (Show/Hide/Required/ReadOnly)
```

---

## 8. نصائح مهمة

### ✅ أفضل الممارسات

1. **استخدم Priority بحكمة**
   - القواعد ذات الأولوية العالية تُنفذ أولاً
   - مثال: قفل النموذج (Priority: 10) قبل قواعد الإجبارية (Priority: 5)

2. **استخدم FieldCode بدلاً من FieldId**
   - FieldCode أكثر استقراراً
   - لا يتغير عند تحديث الحقل

3. **اختبر القواعد المتعددة**
   - تأكد من أن القواعد لا تتعارض مع بعضها
   - استخدم Priority لحل التعارضات

4. **استخدم isActive**
   - يمكن تعطيل قاعدة مؤقتاً دون حذفها

### ⚠️ تحذيرات

1. **حلقات لا نهائية**
   - تجنب القواعد التي تغير قيم الحقول التي تعتمد عليها
   - مثال: إذا `A = 1` → `B = 2`، وإذا `B = 2` → `A = 1`

2. **الأداء**
   - القواعد تُقيّم عند كل تغيير في القيمة
   - تجنب القواعد المعقدة جداً (شروط كثيرة جداً)

3. **التحقق من الوجود**
   - تأكد من وجود الحقل قبل تطبيق الإجراء
   - استخدم `findFieldByCode()` للتحقق

---

## 9. الخلاصة

**FORM_RULES** تسمح بإنشاء نماذج **ديناميكية** و **ذكية**:

✅ إظهار/إخفاء الحقول حسب القيم
✅ جعل الحقول إجبارية/اختيارية ديناميكياً
✅ جعل الحقول للقراءة فقط حسب الحالة
✅ تعيين قيم تلقائياً
✅ دعم شروط معقدة (AND/OR)
✅ دعم الأولويات للقواعد المتعددة

**النتيجة:** نماذج مرنة وقابلة للتخصيص بدون الحاجة لتعديل الكود!

---

## 10. روابط مفيدة

- ملف النماذج: `src/app/views/FormBuilder/form-builder/models/form-builder-dto.model.ts`
- ملف التنفيذ: `src/app/views/public-form/form-view.component.ts`
- دالة التقييم: `evaluateFormRules()`
- دالة التطبيق: `applyActions()`

---

**تم إنشاء هذا المستند بواسطة Auto - Cursor AI**



