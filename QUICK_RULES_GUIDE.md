# 🚀 دليل سريع لإنشاء Rules

## 📋 الحقول المتاحة في النموذج

بناءً على النموذج المعروض:

- **CUSTOMER_TYPE** (Dropdown) - نوع العميل
  - القيم: "Individual", "Corporate"
- **CUSTOMER_NAME** (Textarea) - اسم العميل (إجباري)
- **COMPANY_NAME** (Textarea) - اسم الشركة (اختياري)
- **ORDER_AMOUNT** (Number) - مبلغ الطلب (إجباري)

---

## ⚡ قواعد سريعة جاهزة

### 1️⃣ إظهار/إخفاء اسم الشركة حسب نوع العميل

**السيناريو:** عندما يختار المستخدم "Corporate"، يظهر حقل `COMPANY_NAME`. وعندما يختار "Individual"، يختفي.

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Show/Hide Company Name by Customer Type",
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
  "elseActions": [
    {
      "type": "SetVisible",
      "fieldCode": "COMPANY_NAME",
      "value": false
    }
  ],
  "isActive": true,
  "executionOrder": 1
}
```

---

### 2️⃣ جعل اسم الشركة إجباري للعملاء من نوع "Corporate"

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
  "executionOrder": 2
}
```

---

### 3️⃣ إظهار حقول إضافية للطلبات الكبيرة

**البيانات:**
```json
{
  "formBuilderId": 1,
  "ruleName": "Show Additional Fields for Large Orders",
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
  "executionOrder": 3
}
```

---

## 🎯 كيفية الإضافة السريعة

### الطريقة 1: من خلال الواجهة

1. اذهب إلى صفحة **Fields**
2. اضغط على أيقونة **🛡️** بجانب أي حقل
3. سيتم فتح نافذة إنشاء Rule
4. املأ البيانات واحفظ

### الطريقة 2: من خلال API

استخدم البيانات من ملف `form-rules-example-data.json` أو استخدم السكريبت `import-rules-example.ts`

### الطريقة 3: من خلال صفحة Rules

1. اذهب إلى `/form-builder/rules/{formId}`
2. اضغط على **"New Rule"**
3. املأ البيانات حسب السيناريو المطلوب

---

## 📝 أمثلة سريعة

### مثال 1: IF Customer Type = "Corporate" THEN Show Company Name

```
IF: CUSTOMER_TYPE = "Corporate"
THEN: Show COMPANY_NAME
```

### مثال 2: IF Customer Type = "Individual" THEN Hide Company Name

```
IF: CUSTOMER_TYPE = "Individual"
THEN: Hide COMPANY_NAME
```

### مثال 3: IF Order Amount > 1000 THEN Show Discount Fields

```
IF: ORDER_AMOUNT > 1000
THEN: Show DISCOUNT_CODE, DISCOUNT_AMOUNT
```

---

## 🔧 المشغلات المتاحة

- `Equals` - يساوي
- `NotEquals` - لا يساوي
- `Contains` - يحتوي على
- `GreaterThan` - أكبر من
- `LessThan` - أصغر من
- `IsEmpty` - فارغ
- `IsNotEmpty` - غير فارغ
- `In` - موجود في القائمة
- `NotIn` - غير موجود في القائمة

---

## 🎬 الإجراءات المتاحة

- `SetVisible` - إظهار/إخفاء الحقل
- `SetReadOnly` - جعل الحقل للقراءة فقط
- `SetMandatory` - جعل الحقل إجباري
- `SetDefault` - تعيين قيمة افتراضية
- `ClearValue` - مسح القيمة
- `Compute` - حساب قيمة (يحتاج expression)

---

**ملاحظة:** استبدل `formBuilderId: 1` برقم النموذج الفعلي لديك.

