# 📋 دليل إضافة Rules في النظام

## 🎯 الطرق المتاحة لإضافة Rules

### 1️⃣ من خلال Backend API مباشرة

#### إنشاء Rule جديد:

```typescript
import { FormRulesService } from './services/form-rules.service';
import { CreateFormRuleDto } from './models/form-builder-dto.model';

// مثال: إظهار حقل عند اختيار قيمة معينة
const newRule: CreateFormRuleDto = {
  formId: 1, // ID النموذج
  ruleName: "Show City When Country Selected",
  ruleType: "Visibility",
  condition: {
    operator: "And",
    conditions: [
      {
        fieldCode: "Country", // كود الحقل
        operator: "Equals",
        value: "السعودية"
      }
    ]
  },
  actions: [
    {
      fieldCode: "City",
      actionType: "Show"
    }
  ],
  isActive: true,
  priority: 5,
  description: "إظهار حقل المدينة عند اختيار السعودية"
};

// حفظ Rule
this.formRulesService.createRule(newRule).subscribe({
  next: (rule) => {
    console.log('Rule created:', rule);
  },
  error: (error) => {
    console.error('Error creating rule:', error);
  }
});
```

---

### 2️⃣ من خلال الكود مباشرة (للتطوير/الاختبار)

#### إضافة Rules عند تحميل النموذج:

```typescript
// في form-view.component.ts أو forms.service.ts

// بعد تحميل النموذج
this.formsService.getFormByCode('my-form').subscribe(form => {
  // إضافة Rules برمجياً
  if (!form.formRules) {
    form.formRules = [];
  }

  // Rule 1: إظهار حقل عند اختيار قيمة
  form.formRules.push({
    id: undefined,
    formId: form.id,
    ruleName: "Show City Field",
    ruleType: "Visibility",
    condition: {
      operator: "And",
      conditions: [
        {
          fieldCode: "Country",
          operator: "Equals",
          value: "السعودية"
        }
      ]
    },
    actions: [
      {
        fieldCode: "City",
        actionType: "Show"
      }
    ],
    isActive: true,
    priority: 5
  });

  // Rule 2: جعل حقل إجباري
  form.formRules.push({
    id: undefined,
    formId: form.id,
    ruleName: "Make Tax Number Required",
    ruleType: "Mandatory",
    condition: {
      operator: "And",
      conditions: [
        {
          fieldCode: "CustomerType",
          operator: "Equals",
          value: "Corporate"
        }
      ]
    },
    actions: [
      {
        fieldCode: "TaxNumber",
        actionType: "SetRequired"
      }
    ],
    isActive: true,
    priority: 3
  });

  // Rule 3: تعيين قيمة تلقائياً
  form.formRules.push({
    id: undefined,
    formId: form.id,
    ruleName: "Calculate Max Loan",
    ruleType: "Custom",
    condition: {
      operator: "And",
      conditions: [
        {
          fieldCode: "Salary",
          operator: "IsNotEmpty",
          value: null
        }
      ]
    },
    actions: [
      {
        fieldCode: "MaxLoan",
        actionType: "SetValue",
        value: "{{Salary}} * 10" // سيتم حسابها في Backend
      }
    ],
    isActive: true,
    priority: 2
  });
});
```

---

### 3️⃣ من خلال Backend مباشرة (SQL/Database)

إذا كان Backend يدعم إضافة Rules من Database:

```sql
-- مثال: إضافة Rule جديد
INSERT INTO FormRules (FormId, RuleName, RuleType, ConditionJson, ActionsJson, IsActive, Priority)
VALUES (
  1,
  'Show City When Country Selected',
  'Visibility',
  '{"operator":"And","conditions":[{"fieldCode":"Country","operator":"Equals","value":"السعودية"}]}',
  '[{"fieldCode":"City","actionType":"Show"}]',
  1,
  5
);
```

---

## 📝 أمثلة Rules شائعة

### مثال 1: إظهار/إخفاء حقل

```typescript
{
  formId: 1,
  ruleName: "Show Emergency Contact",
  ruleType: "Visibility",
  condition: {
    operator: "And",
    conditions: [
      {
        fieldCode: "HasEmergencyContact",
        operator: "Equals",
        value: true
      }
    ]
  },
  actions: [
    {
      fieldCode: "EmergencyContactName",
      actionType: "Show"
    },
    {
      fieldCode: "EmergencyContactPhone",
      actionType: "Show"
    }
  ],
  isActive: true,
  priority: 5
}
```

### مثال 2: جعل حقل إجباري

```typescript
{
  formId: 1,
  ruleName: "Tax Number Required for Corporate",
  ruleType: "Mandatory",
  condition: {
    operator: "And",
    conditions: [
      {
        fieldCode: "CustomerType",
        operator: "Equals",
        value: "Corporate"
      }
    ]
  },
  actions: [
    {
      fieldCode: "TaxNumber",
      actionType: "SetRequired"
    }
  ],
  isActive: true,
  priority: 5
}
```

### مثال 3: شروط معقدة (AND/OR)

```typescript
{
  formId: 1,
  ruleName: "Show Visa Info",
  ruleType: "Visibility",
  condition: {
    operator: "Or", // OR بين الشروط
    conditions: [
      {
        fieldCode: "Country",
        operator: "Equals",
        value: "السعودية"
      },
      {
        fieldCode: "Country",
        operator: "Equals",
        value: "الإمارات"
      }
    ]
  },
  actions: [
    {
      fieldCode: "VisaNumber",
      actionType: "Show"
    }
  ],
  isActive: true,
  priority: 5
}
```

### مثال 4: شروط متعددة (AND)

```typescript
{
  formId: 1,
  ruleName: "Show High Value Loan Fields",
  ruleType: "Visibility",
  condition: {
    operator: "And", // AND بين الشروط
    conditions: [
      {
        fieldCode: "LoanType",
        operator: "Equals",
        value: "عقاري"
      },
      {
        fieldCode: "PropertyValue",
        operator: "GreaterThan",
        value: 1000000
      }
    ]
  },
  actions: [
    {
      fieldCode: "AdditionalDocuments",
      actionType: "Show"
    }
  ],
  isActive: true,
  priority: 5
}
```

### مثال 5: تعيين قيمة تلقائياً

```typescript
{
  formId: 1,
  ruleName: "Set Default Currency",
  ruleType: "Custom",
  condition: {
    operator: "And",
    conditions: [
      {
        fieldCode: "Country",
        operator: "Equals",
        value: "السعودية"
      }
    ]
  },
  actions: [
    {
      fieldCode: "Currency",
      actionType: "SetValue",
      value: "SAR"
    }
  ],
  isActive: true,
  priority: 5
}
```

---

## 🔧 استخدام FormRulesService

### 1. استيراد Service:

```typescript
import { FormRulesService } from '../services/form-rules.service';

constructor(private formRulesService: FormRulesService) {}
```

### 2. إنشاء Rule:

```typescript
const newRule: CreateFormRuleDto = {
  formId: 1,
  ruleName: "My Rule",
  ruleType: "Visibility",
  condition: {
    operator: "And",
    conditions: [
      {
        fieldCode: "Field1",
        operator: "Equals",
        value: "Value1"
      }
    ]
  },
  actions: [
    {
      fieldCode: "Field2",
      actionType: "Show"
    }
  ],
  isActive: true,
  priority: 5
};

this.formRulesService.createRule(newRule).subscribe({
  next: (rule) => console.log('Created:', rule),
  error: (error) => console.error('Error:', error)
});
```

### 3. جلب Rules:

```typescript
// جلب جميع Rules لنموذج
this.formRulesService.getRulesByFormId(formId).subscribe(rules => {
  console.log('Rules:', rules);
});

// جلب Rules النشطة فقط
this.formRulesService.getActiveRulesByFormId(formId).subscribe(rules => {
  console.log('Active Rules:', rules);
});
```

### 4. تحديث Rule:

```typescript
this.formRulesService.updateRule(ruleId, {
  isActive: false,
  priority: 10
}).subscribe(rule => {
  console.log('Updated:', rule);
});
```

### 5. حذف Rule:

```typescript
this.formRulesService.deleteRule(ruleId).subscribe(() => {
  console.log('Rule deleted');
});
```

---

## 📋 Checklist قبل إضافة Rule

- [ ] تأكد من وجود `formId` صحيح
- [ ] تأكد من `fieldCode` موجود في النموذج
- [ ] تحقق من `operator` صحيح (Equals, Contains, etc.)
- [ ] تحقق من `actionType` صحيح (Show, Hide, SetRequired, etc.)
- [ ] حدد `priority` مناسب (أعلى = أولوية أعلى)
- [ ] تأكد من `isActive: true` لتفعيل Rule

---

## ⚠️ ملاحظات مهمة

1. **Field Codes**: استخدم `fieldCode` وليس `fieldId` في Rules
2. **Priority**: Rules ذات الأولوية الأعلى تُنفذ أولاً
3. **Active Rules**: فقط Rules مع `isActive: true` تُنفذ
4. **Conditions**: يمكن استخدام `And` أو `Or` بين الشروط
5. **Actions**: يمكن إضافة عدة Actions في Rule واحد

---

## 🎯 الخطوات التالية

1. **إنشاء واجهة UI** لإدارة Rules (اختياري)
2. **اختبار Rules** في FormViewer
3. **مراقبة Logs** للتأكد من تنفيذ Rules
4. **تحديث Rules** حسب الحاجة

---

**تم إنشاء هذا الدليل بواسطة Auto - Cursor AI**

