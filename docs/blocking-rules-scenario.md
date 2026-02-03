# سيناريو اختبار قواعد الحظر (Blocking Rules) - دليل عملي

## السيناريو: منع إرسال طلب شراء إذا كان المبلغ الإجمالي أكبر من 50,000

---

## الخطوة 1: إعداد قاعدة الحظر في قاعدة البيانات

### 1.1 إنشاء قاعدة حظر جديدة

**Endpoint:** `POST /api/FormRules`

**Request Body:**
```json
{
  "formBuilderId": 1,
  "ruleName": "منع الإرسال - المبلغ الزائد عن 50,000",
  "ruleType": "Condition",
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "TOTAL_AMOUNT",
  "conditionField": "TOTAL_AMOUNT",
  "conditionOperator": ">",
  "conditionValue": "50000",
  "conditionValueType": "constant",
  "blockMessage": "⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي ({{TOTAL_AMOUNT}}) يتجاوز الحد الأقصى المسموح به وهو 50,000",
  "priority": 1,
  "isActive": true,
  "executionOrder": 1
}
```

**ملاحظات:**
- `formBuilderId`: معرف النموذج (استبدل بـ ID النموذج الفعلي)
- `conditionKey`: اسم الحقل في قاعدة البيانات (يجب أن يطابق `fieldCode` في النموذج)
- `conditionOperator`: `">"` يعني "أكبر من"
- `conditionValue`: `"50000"` - القيمة الحدية
- `blockMessage`: رسالة الخطأ التي ستظهر للمستخدم
- `isActive`: `true` - يجب أن تكون القاعدة نشطة

---

## الخطوة 2: التحقق من وجود الحقل في النموذج

### 2.1 التأكد من وجود حقل `TOTAL_AMOUNT`

**Endpoint:** `GET /api/FormFields/tab/{tabId}`

**التحقق:**
- تأكد أن هناك حقل بـ `fieldCode = "TOTAL_AMOUNT"`
- تأكد أن الحقل من نوع `Number` أو `Calculated`
- تأكد أن الحقل موجود في أحد التبويبات (Tabs) في النموذج

---

## الخطوة 3: اختبار السيناريو

### السيناريو 3.1: محاولة إرسال نموذج بمبلغ أقل من 50,000 ✅

**الخطوات:**
1. افتح النموذج في Angular (`/forms/view/{formCode}`)
2. املأ البيانات:
   - `TOTAL_AMOUNT = 30000`
   - باقي الحقول المطلوبة
3. اضغط **Submit**

**النتيجة المتوقعة:**
- ✅ الإرسال يتم بنجاح
- ✅ رسالة نجاح: "تم إرسال الطلب للمراجعة"
- ✅ الحالة تتغير إلى `Submitted`

**في Console:**
```
[FormSubmissionsService] Submit successful for submission 123
```

---

### السيناريو 3.2: محاولة إرسال نموذج بمبلغ أكبر من 50,000 ❌

**الخطوات:**
1. افتح النموذج في Angular (`/forms/view/{formCode}`)
2. املأ البيانات:
   - `TOTAL_AMOUNT = 60000` (أكبر من 50,000)
   - باقي الحقول المطلوبة
3. اضغط **Submit**

**النتيجة المتوقعة:**
- ❌ الإرسال يتم منعه
- ❌ رسالة خطأ تظهر: **"⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي (60000) يتجاوز الحد الأقصى المسموح به وهو 50,000"**
- ❌ الحالة تبقى `Draft` (لا تتغير)

**في Console:**
```
[FormSubmissionsService] Error submitting form submission 123: Error
[FormSubmissionsService] Submission blocked by rule: {
  ruleId: 1,
  ruleName: "منع الإرسال - المبلغ الزائد عن 50,000",
  message: "⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي (60000) يتجاوز الحد الأقصى المسموح به وهو 50,000"
}
[FormView] Submission blocked by rule: {
  ruleId: 1,
  ruleName: "منع الإرسال - المبلغ الزائد عن 50,000",
  message: "⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي (60000) يتجاوز الحد الأقصى المسموح به وهو 50,000"
}
```

**في Network Tab (DevTools):**
```
POST /api/FormSubmissions/submit
Status: 403 Forbidden
Response:
{
  "statusCode": 403,
  "message": "⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي (60000) يتجاوز الحد الأقصى المسموح به وهو 50,000",
  "data": {
    "isBlocked": true,
    "message": "⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي (60000) يتجاوز الحد الأقصى المسموح به وهو 50,000",
    "ruleId": 1,
    "ruleName": "منع الإرسال - المبلغ الزائد عن 50,000"
  }
}
```

---

## الخطوة 4: اختبار مباشر عبر API (اختياري)

### 4.1 اختبار تقييم القاعدة مباشرة

**Endpoint:** `POST /api/FormRules/evaluate-blocking?debug=true`

**Request Body:**
```json
{
  "formBuilderId": 1,
  "evaluationPhase": "PreSubmit",
  "submissionId": 123,
  "fieldValues": {
    "TOTAL_AMOUNT": 60000
  }
}
```

**Response (مع debug):**
```json
{
  "isBlocked": true,
  "blockMessage": "⚠️ لا يمكن إرسال الطلب: المبلغ الإجمالي (60000) يتجاوز الحد الأقصى المسموح به وهو 50,000",
  "matchedRuleId": 1,
  "matchedRuleName": "منع الإرسال - المبلغ الزائد عن 50,000",
  "debugInfo": {
    "totalActiveRules": 1,
    "rulesEvaluated": 1,
    "rules": [
      {
        "ruleId": 1,
        "ruleName": "منع الإرسال - المبلغ الزائد عن 50,000",
        "evaluationPhase": "PreSubmit",
        "conditionSource": "Submission",
        "conditionField": "TOTAL_AMOUNT",
        "conditionOperator": ">",
        "conditionValue": "50000",
        "conditionMet": true,
        "evaluationResult": "Condition met: TOTAL_AMOUNT (60000) > 50000"
      }
    ]
  }
}
```

---

## سيناريوهات إضافية

### السيناريو 4: منع الإرسال إذا كان الحقل فارغ

**القاعدة:**
```json
{
  "formBuilderId": 1,
  "ruleName": "إلزامية رقم الهاتف",
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "PHONE_NUMBER",
  "conditionOperator": "isEmpty",
  "conditionValue": null,
  "blockMessage": "❌ رقم الهاتف مطلوب لإتمام عملية الإرسال",
  "isActive": true
}
```

**الاختبار:**
1. املأ النموذج بدون إدخال `PHONE_NUMBER`
2. اضغط Submit
3. **النتيجة:** رسالة خطأ: "❌ رقم الهاتف مطلوب لإتمام عملية الإرسال"

---

### السيناريو 5: منع الإرسال إذا كان المبلغ أقل من حد معين

**القاعدة:**
```json
{
  "formBuilderId": 1,
  "ruleName": "منع المبالغ الصغيرة",
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "TOTAL_AMOUNT",
  "conditionOperator": "<",
  "conditionValue": "1000",
  "blockMessage": "⚠️ المبلغ الإجمالي يجب أن يكون على الأقل 1,000",
  "isActive": true
}
```

**الاختبار:**
1. املأ النموذج بـ `TOTAL_AMOUNT = 500`
2. اضغط Submit
3. **النتيجة:** رسالة خطأ: "⚠️ المبلغ الإجمالي يجب أن يكون على الأقل 1,000"

---

### السيناريو 6: قواعد متعددة مع أولويات

**القاعدة 1 (أولوية عالية):**
```json
{
  "ruleName": "التحقق من الفترة المحاسبية",
  "priority": 10,
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Database",
  "ruleType": "StoredProcedure",
  "storedProcedureId": 5,
  "blockMessage": "❌ الفترة المحاسبية مغلقة - لا يمكن إرسال الطلب",
  "isActive": true
}
```

**القاعدة 2 (أولوية متوسطة):**
```json
{
  "ruleName": "منع المبالغ الكبيرة",
  "priority": 5,
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "TOTAL_AMOUNT",
  "conditionOperator": ">",
  "conditionValue": "100000",
  "blockMessage": "⚠️ المبلغ الإجمالي يتجاوز الحد الأقصى (100,000)",
  "isActive": true
}
```

**القاعدة 3 (أولوية منخفضة):**
```json
{
  "ruleName": "إلزامية الحقول",
  "priority": 1,
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "CUSTOMER_NAME",
  "conditionOperator": "isEmpty",
  "conditionValue": null,
  "blockMessage": "❌ اسم العميل مطلوب",
  "isActive": true
}
```

**الترتيب:**
1. أولاً: التحقق من الفترة المحاسبية (Priority: 10)
2. ثانياً: التحقق من المبلغ (Priority: 5)
3. ثالثاً: التحقق من الحقول الإلزامية (Priority: 1)

**الاختبار:**
- إذا كانت الفترة المحاسبية مغلقة → يتم منع الإرسال فوراً (لا يتم تقييم القواعد الأخرى)
- إذا كانت الفترة المحاسبية مفتوحة ولكن المبلغ > 100,000 → يتم منع الإرسال
- إذا كانت الفترة المحاسبية مفتوحة والمبلغ < 100,000 ولكن `CUSTOMER_NAME` فارغ → يتم منع الإرسال

---

## خطوات الاختبار الكاملة

### 1. إعداد البيئة

```bash
# تأكد أن الـ Backend يعمل
# تأكد أن Angular يعمل
# تأكد أن قاعدة البيانات متصلة
```

### 2. إنشاء قاعدة الحظر

```bash
# استخدم Postman أو Swagger
POST http://localhost:5203/api/FormRules
Content-Type: application/json

{
  "formBuilderId": 1,
  "ruleName": "منع الإرسال - المبلغ الزائد عن 50,000",
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "TOTAL_AMOUNT",
  "conditionOperator": ">",
  "conditionValue": "50000",
  "blockMessage": "⚠️ المبلغ الإجمالي يتجاوز الحد الأقصى المسموح به (50,000)",
  "isActive": true
}
```

### 3. اختبار من Angular

1. افتح المتصفح: `http://localhost:4200/forms/view/{formCode}`
2. افتح DevTools (F12) → Console و Network
3. املأ النموذج:
   - `TOTAL_AMOUNT = 60000`
   - باقي الحقول المطلوبة
4. اضغط Submit
5. راقب:
   - **Console:** رسائل `[FormSubmissionsService] Submission blocked by rule`
   - **Network:** Request `POST /api/FormSubmissions/submit` → Status: `403`
   - **UI:** رسالة خطأ تظهر للمستخدم

### 4. التحقق من النتيجة

✅ **نجح الاختبار إذا:**
- رسالة الخطأ تظهر بشكل واضح
- الإرسال يتم منعه
- الحالة تبقى `Draft`
- Console يعرض معلومات القاعدة

❌ **فشل الاختبار إذا:**
- الإرسال يتم رغم وجود القاعدة
- رسالة الخطأ لا تظهر
- Console لا يعرض معلومات القاعدة

---

## استكشاف الأخطاء

### المشكلة: القاعدة لا تعمل

**التحقق:**
1. ✅ تأكد أن `isActive = true`
2. ✅ تأكد أن `evaluationPhase = "PreSubmit"`
3. ✅ تأكد أن `conditionKey` يطابق `fieldCode` في النموذج
4. ✅ تأكد أن القيمة محفوظة في قاعدة البيانات قبل الإرسال
5. ✅ استخدم `?debug=true` لرؤية تفاصيل التقييم

### المشكلة: رسالة الخطأ لا تظهر

**التحقق:**
1. ✅ افتح Console في المتصفح
2. ✅ ابحث عن `[FormSubmissionsService] Submission blocked by rule`
3. ✅ تأكد أن `error.isBlocked = true` في الكود
4. ✅ تأكد أن `MessageService` يعمل بشكل صحيح

### المشكلة: الإرسال يتم رغم وجود القاعدة

**التحقق:**
1. ✅ تأكد أن القاعدة نشطة (`isActive = true`)
2. ✅ تأكد أن الشرط صحيح (`conditionOperator`, `conditionValue`)
3. ✅ تأكد أن `conditionKey` يطابق اسم الحقل في البيانات
4. ✅ استخدم `?debug=true` لرؤية تفاصيل التقييم

---

## الخلاصة

هذا السيناريو يوضح كيفية:
1. ✅ إنشاء قاعدة حظر في قاعدة البيانات
2. ✅ اختبار القاعدة من Angular
3. ✅ التحقق من النتيجة المتوقعة
4. ✅ استكشاف الأخطاء

🎉 **النظام جاهز للاستخدام!**

