# 📋 سيناريوهات وأمثلة Form Rules

هذا الملف يحتوي على سيناريوهات عملية وأمثلة بيانات للقواعد بناءً على الحقول الموجودة في النموذج.

## 🎯 الحقول المتاحة

- `CUSTOMER_TYPE` (Dropdown) - نوع العميل
- `CUSTOMER_NAME` (Textarea) - اسم العميل
- `COMPANY_NAME` (Textarea) - اسم الشركة
- `ORDER_AMOUNT` (Number) - مبلغ الطلب
- `TAX_NUMBER` (Checkbox) - الرقم الضريبي
- `DISCOUNT_CODE` (Textarea) - كود الخصم
- `DISCOUNT_AMOUNT` (Checkbox) - مبلغ الخصم
- `PAYMENT_METHOD` (Dropdown) - طريقة الدفع

---

## 📝 السيناريوهات

### السيناريو 1: إظهار حقل الشركة عند اختيار نوع العميل "Corporate"

**الوصف:** عندما يختار المستخدم "Corporate" في حقل `CUSTOMER_TYPE`، يتم إظهار حقل `COMPANY_NAME`.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Show Company Name for Corporate Customers",
  "conditionField": "CUSTOMER_TYPE",
  "conditionOperator": "Equals",
  "conditionValue": "Corporate",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetVisible",
      "fieldCode": "COMPANY_NAME",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 1
}
```

**النتيجة:**
- عندما `CUSTOMER_TYPE = "Corporate"` → `COMPANY_NAME` يظهر
- عندما `CUSTOMER_TYPE ≠ "Corporate"` → `COMPANY_NAME` يختفي

---

### السيناريو 2: جعل الرقم الضريبي إجباري للعملاء من نوع "Corporate"

**الوصف:** عندما يكون نوع العميل "Corporate"، يصبح حقل `TAX_NUMBER` إجبارياً.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Tax Number Required for Corporate",
  "conditionField": "CUSTOMER_TYPE",
  "conditionOperator": "Equals",
  "conditionValue": "Corporate",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetMandatory",
      "fieldCode": "TAX_NUMBER",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 2
}
```

**النتيجة:**
- عندما `CUSTOMER_TYPE = "Corporate"` → `TAX_NUMBER` يصبح إجبارياً
- عندما `CUSTOMER_TYPE ≠ "Corporate"` → `TAX_NUMBER` اختياري

---

### السيناريو 3: إظهار حقول الخصم عند إدخال كود خصم

**الوصف:** عندما يتم إدخال قيمة في `DISCOUNT_CODE`، يتم إظهار حقل `DISCOUNT_AMOUNT`.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Show Discount Amount When Code Entered",
  "conditionField": "DISCOUNT_CODE",
  "conditionOperator": "IsNotEmpty",
  "conditionValue": "",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetVisible",
      "fieldCode": "DISCOUNT_AMOUNT",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 3
}
```

**النتيجة:**
- عندما `DISCOUNT_CODE` غير فارغ → `DISCOUNT_AMOUNT` يظهر
- عندما `DISCOUNT_CODE` فارغ → `DISCOUNT_AMOUNT` يختفي

---

### السيناريو 4: جعل حقل الشركة إجباري للعملاء من نوع "Corporate"

**الوصف:** عندما يكون نوع العميل "Corporate"، يصبح حقل `COMPANY_NAME` إجبارياً.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Company Name Required for Corporate",
  "conditionField": "CUSTOMER_TYPE",
  "conditionOperator": "Equals",
  "conditionValue": "Corporate",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetMandatory",
      "fieldCode": "COMPANY_NAME",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 4
}
```

---

### السيناريو 5: إظهار الرقم الضريبي للعملاء من نوع "Corporate"

**الوصف:** إظهار حقل `TAX_NUMBER` فقط للعملاء من نوع "Corporate".

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Show Tax Number for Corporate",
  "conditionField": "CUSTOMER_TYPE",
  "conditionOperator": "Equals",
  "conditionValue": "Corporate",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetVisible",
      "fieldCode": "TAX_NUMBER",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 5
}
```

---

### السيناريو 6: إخفاء حقول الخصم عند عدم وجود كود خصم

**الوصف:** عندما يكون `DISCOUNT_CODE` فارغاً، يتم إخفاء `DISCOUNT_AMOUNT`.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Hide Discount Amount When No Code",
  "conditionField": "DISCOUNT_CODE",
  "conditionOperator": "IsEmpty",
  "conditionValue": "",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetVisible",
      "fieldCode": "DISCOUNT_AMOUNT",
      "value": false
    }
  ],
  "isActive": true,
  "executionOrder": 6
}
```

---

### السيناريو 7: جعل مبلغ الخصم للقراءة فقط (محسوب تلقائياً)

**الوصف:** جعل حقل `DISCOUNT_AMOUNT` للقراءة فقط لأنه محسوب تلقائياً.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Discount Amount Read Only",
  "conditionField": "DISCOUNT_AMOUNT",
  "conditionOperator": "IsNotEmpty",
  "conditionValue": "",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetReadOnly",
      "fieldCode": "DISCOUNT_AMOUNT",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 7
}
```

---

### السيناريو 8: إظهار حقول الخصم عند مبلغ طلب كبير

**الوصف:** عندما يكون `ORDER_AMOUNT` أكبر من 1000، يتم إظهار حقول الخصم.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Show Discount Fields for Large Orders",
  "conditionField": "ORDER_AMOUNT",
  "conditionOperator": "GreaterThan",
  "conditionValue": "1000",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetVisible",
      "fieldCode": "DISCOUNT_CODE",
      "value": true
    },
    {
      "type": "SetVisible",
      "fieldCode": "DISCOUNT_AMOUNT",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 8
}
```

---

### السيناريو 9: تعيين قيمة افتراضية لطريقة الدفع

**الوصف:** تعيين قيمة افتراضية "Cash" لطريقة الدفع عند فتح النموذج.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Set Default Payment Method",
  "conditionField": "PAYMENT_METHOD",
  "conditionOperator": "IsEmpty",
  "conditionValue": "",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetDefault",
      "fieldCode": "PAYMENT_METHOD",
      "value": "Cash"
    }
  ],
  "isActive": true,
  "executionOrder": 9
}
```

---

### السيناريو 10: حساب مبلغ الخصم تلقائياً

**الوصف:** حساب `DISCOUNT_AMOUNT` بناءً على `ORDER_AMOUNT` (مثال: 10% من المبلغ).

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Calculate Discount Amount",
  "conditionField": "ORDER_AMOUNT",
  "conditionOperator": "IsNotEmpty",
  "conditionValue": "",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "Compute",
      "fieldCode": "DISCOUNT_AMOUNT",
      "expression": "ORDER_AMOUNT * 0.1"
    }
  ],
  "isActive": true,
  "executionOrder": 10
}
```

---

### السيناريو 11: قواعد متعددة مع ELSE Actions

**الوصف:** إذا كان نوع العميل "Corporate"، أظهر `COMPANY_NAME` و `TAX_NUMBER`. وإلا، أخفيهما.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Corporate Fields with Else Actions",
  "conditionField": "CUSTOMER_TYPE",
  "conditionOperator": "Equals",
  "conditionValue": "Corporate",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetVisible",
      "fieldCode": "COMPANY_NAME",
      "value": true
    },
    {
      "type": "SetVisible",
      "fieldCode": "TAX_NUMBER",
      "value": true
    }
  ],
  "elseActions": [
    {
      "type": "SetVisible",
      "fieldCode": "COMPANY_NAME",
      "value": false
    },
    {
      "type": "SetVisible",
      "fieldCode": "TAX_NUMBER",
      "value": false
    }
  ],
  "isActive": true,
  "executionOrder": 11
}
```

---

### السيناريو 12: جعل الحقول للقراءة فقط بعد اختيار طريقة الدفع

**الوصف:** بعد اختيار طريقة الدفع، جعل بعض الحقول للقراءة فقط.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Lock Fields After Payment Method Selected",
  "conditionField": "PAYMENT_METHOD",
  "conditionOperator": "IsNotEmpty",
  "conditionValue": "",
  "conditionValueType": "constant",
  "actions": [
    {
      "type": "SetReadOnly",
      "fieldCode": "ORDER_AMOUNT",
      "value": true
    },
    {
      "type": "SetReadOnly",
      "fieldCode": "DISCOUNT_CODE",
      "value": true
    }
  ],
  "isActive": true,
  "executionOrder": 12
}
```

---

## 📊 جدول ملخص السيناريوهات

| # | السيناريو | الحقل الشرطي | المشغل | الحقل المستهدف | الإجراء |
|---|-----------|-------------|--------|----------------|---------|
| 1 | إظهار اسم الشركة | CUSTOMER_TYPE | Equals | COMPANY_NAME | SetVisible |
| 2 | الرقم الضريبي إجباري | CUSTOMER_TYPE | Equals | TAX_NUMBER | SetMandatory |
| 3 | إظهار مبلغ الخصم | DISCOUNT_CODE | IsNotEmpty | DISCOUNT_AMOUNT | SetVisible |
| 4 | اسم الشركة إجباري | CUSTOMER_TYPE | Equals | COMPANY_NAME | SetMandatory |
| 5 | إظهار الرقم الضريبي | CUSTOMER_TYPE | Equals | TAX_NUMBER | SetVisible |
| 6 | إخفاء مبلغ الخصم | DISCOUNT_CODE | IsEmpty | DISCOUNT_AMOUNT | SetVisible (false) |
| 7 | مبلغ الخصم للقراءة فقط | DISCOUNT_AMOUNT | IsNotEmpty | DISCOUNT_AMOUNT | SetReadOnly |
| 8 | إظهار الخصم للطلبات الكبيرة | ORDER_AMOUNT | GreaterThan | DISCOUNT_CODE, DISCOUNT_AMOUNT | SetVisible |
| 9 | قيمة افتراضية للدفع | PAYMENT_METHOD | IsEmpty | PAYMENT_METHOD | SetDefault |
| 10 | حساب مبلغ الخصم | ORDER_AMOUNT | IsNotEmpty | DISCOUNT_AMOUNT | Compute |
| 11 | حقول Corporate مع ELSE | CUSTOMER_TYPE | Equals | COMPANY_NAME, TAX_NUMBER | SetVisible + ElseActions |
| 12 | قفل الحقول بعد الدفع | PAYMENT_METHOD | IsNotEmpty | ORDER_AMOUNT, DISCOUNT_CODE | SetReadOnly |

---

## 🔧 كيفية استخدام هذه البيانات

### 1. من خلال API مباشرة:

```typescript
import { FormRulesService } from './services/form-rules.service';
import { CreateFormRuleDto } from './models/form-builder-dto.model';

const ruleData: CreateFormRuleDto = {
  formBuilderId: 1,
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
};

this.formRulesService.createRule(ruleData).subscribe({
  next: (rule) => console.log('Rule created:', rule),
  error: (error) => console.error('Error:', error)
});
```

### 2. من خلال الواجهة:

1. اذهب إلى صفحة Rules: `/form-builder/rules/{formId}`
2. اضغط على "New Rule"
3. املأ البيانات حسب السيناريو المطلوب
4. احفظ القاعدة

### 3. من خلال Fields List:

1. اذهب إلى صفحة Fields
2. اضغط على أيقونة الدرع (🛡️) بجانب الحقل
3. سيتم فتح نافذة إنشاء Rule مع الحقل محدد مسبقاً
4. اكمل باقي البيانات واحفظ

---

## 📝 ملاحظات مهمة

1. **ترتيب التنفيذ (Execution Order):** القواعد ذات الرقم الأقل تُنفذ أولاً
2. **الحالة النشطة (isActive):** فقط القواعد النشطة تُنفذ
3. **ELSE Actions:** اختيارية، تُنفذ عندما يكون الشرط غير محقق
4. **Compute Action:** يستخدم تعبيرات رياضية بسيطة (مثل: `ORDER_AMOUNT * 0.1`)

---

**تم إنشاء هذا الملف بواسطة Auto - Cursor AI**

