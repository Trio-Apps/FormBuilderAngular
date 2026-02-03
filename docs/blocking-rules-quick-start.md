# دليل سريع: قواعد الحظر (Blocking Rules) - ابدأ هنا 🚀

## نظرة عامة سريعة

نظام قواعد الحظر يمنع إرسال النماذج إذا كانت القيم المدخلة لا تتوافق مع القواعد المحددة.

---

## خطوات سريعة (5 دقائق)

### 1️⃣ إنشاء قاعدة حظر

**استخدم SQL Query:**
```sql
-- افتح ملف AddBlockingRule.sql
-- غير @FormBuilderId و @IdCreatedBy
-- شغّل الـ Query
```

**أو استخدم API:**
```http
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
  "blockMessage": "⚠️ المبلغ الإجمالي يتجاوز الحد الأقصى (50,000)",
  "isActive": true
}
```

---

### 2️⃣ اختبار القاعدة

1. افتح النموذج في Angular: `http://localhost:4200/forms/view/{formCode}`
2. املأ البيانات:
   - `TOTAL_AMOUNT = 60000` (أكبر من 50,000)
   - باقي الحقول المطلوبة
3. اضغط **Submit**

**النتيجة المتوقعة:**
- ❌ رسالة خطأ تظهر: "⚠️ المبلغ الإجمالي يتجاوز الحد الأقصى (50,000)"
- ❌ الإرسال يتم منعه
- ✅ الحالة تبقى `Draft`

---

## أمثلة سريعة

### مثال 1: منع المبالغ الكبيرة
```json
{
  "conditionKey": "TOTAL_AMOUNT",
  "conditionOperator": ">",
  "conditionValue": "50000",
  "blockMessage": "المبلغ يتجاوز الحد الأقصى"
}
```

### مثال 2: إلزامية حقل
```json
{
  "conditionKey": "PHONE_NUMBER",
  "conditionOperator": "isEmpty",
  "conditionValue": null,
  "blockMessage": "رقم الهاتف مطلوب"
}
```

### مثال 3: منع المبالغ الصغيرة
```json
{
  "conditionKey": "TOTAL_AMOUNT",
  "conditionOperator": "<",
  "conditionValue": "1000",
  "blockMessage": "المبلغ يجب أن يكون على الأقل 1,000"
}
```

---

## عوامل المقارنة المدعومة

| العامل | الوصف | مثال |
|-------|------|------|
| `>` | أكبر من | `TOTAL_AMOUNT > 50000` |
| `<` | أصغر من | `AMOUNT < 1000` |
| `>=` | أكبر من أو يساوي | `QUANTITY >= 50` |
| `<=` | أصغر من أو يساوي | `DISCOUNT <= 20` |
| `==` | يساوي | `STATUS == "Active"` |
| `!=` | لا يساوي | `COUNTRY != "US"` |
| `isEmpty` | فارغ | `NOTES isEmpty` |
| `isNotEmpty` | غير فارغ | `EMAIL isNotEmpty` |

---

## ملفات مهمة

- 📄 **سيناريو كامل:** `docs/blocking-rules-scenario.md`
- 📄 **تكامل Angular:** `docs/blocking-rules-integration.md`
- 📄 **SQL Query:** `AddBlockingRule.sql`

---

## استكشاف الأخطاء السريع

### ❌ القاعدة لا تعمل؟
1. تأكد أن `isActive = true`
2. تأكد أن `evaluationPhase = "PreSubmit"`
3. تأكد أن `conditionKey` يطابق `fieldCode` في النموذج

### ❌ رسالة الخطأ لا تظهر؟
1. افتح Console في المتصفح (F12)
2. ابحث عن `[FormSubmissionsService] Submission blocked by rule`
3. تأكد أن `error.isBlocked = true`

### ❌ الإرسال يتم رغم وجود القاعدة؟
1. تأكد أن القاعدة نشطة (`isActive = true`)
2. تأكد أن الشرط صحيح (`conditionOperator`, `conditionValue`)
3. استخدم `?debug=true` في API لرؤية تفاصيل التقييم

---

## الخلاصة

✅ **النظام يعمل تلقائياً** - لا حاجة لكود إضافي  
✅ **التحقق في Backend** - آمن ولا يمكن تجاوزه  
✅ **الرسائل واضحة** - تأتي من القاعدة وتعرض للمستخدم  

🎉 **ابدأ الآن!** افتح `AddBlockingRule.sql` واتبع الخطوات.

