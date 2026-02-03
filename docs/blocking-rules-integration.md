# دليل تكامل قواعد الحظر (Blocking Rules) - Angular Frontend

## نظرة عامة

هذا الدليل يوضح كيفية عمل نظام قواعد الحظر (Blocking Rules) في Angular Frontend وكيفية التعامل مع استجابات الـ Backend عند تطابق قاعدة حظر.

---

## كيف يعمل النظام

### 1. تدفق العمل

```
المستخدم يضغط Submit في Angular
    ↓
Angular يستدعي POST /api/FormSubmissions/submit
    ↓
Backend (C#) يقيم قواعد الحظر (PreSubmit)
    ↓
هل تطابقت أي قاعدة؟
    ├─ نعم → إرجاع 403 Forbidden مع رسالة الخطأ
    └─ لا → متابعة عملية الإرسال بنجاح (200 OK)
    ↓
Angular يتعامل مع الاستجابة
    ├─ 403 → عرض رسالة Blocking Rule للمستخدم
    └─ 200 → متابعة التدفق العادي
```

### 2. استجابة الـ Backend عند الحظر

عند تطابق قاعدة حظر، الـ Backend يعيد:

```json
{
  "statusCode": 403,
  "message": "المبلغ الإجمالي يتجاوز الحد المسموح به وهو 10,000",
  "data": {
    "isBlocked": true,
    "message": "المبلغ الإجمالي يتجاوز الحد المسموح به وهو 10,000",
    "ruleId": 1,
    "ruleName": "منع الإرسال - المبلغ الزائد"
  }
}
```

---

## التطبيق في Angular

### 1. FormSubmissionsService

**الموقع:** `src/app/views/form-submissions/services/form-submissions.service.ts`

**الوظيفة:** `submitSubmission()`

**الكود:**

```typescript
submitSubmission(submissionIdOrDto: number | SubmitFormDto, submittedByUserId?: string): Observable<FormSubmissionDto> {
  // ... إعداد الطلب ...
  
  return this.http.post<any>(`${this.baseUrl}/submit`, requestBody).pipe(
    map((response: any) => {
      // ... معالجة النجاح ...
    }),
    catchError((error) => {
      // Handle Blocking Rules (403 Forbidden)
      if (error?.status === 403 && errorResponse?.data?.isBlocked) {
        const blockingData = errorResponse.data;
        errorMessage = blockingData.message || errorResponse.message || 'Form submission is blocked by a validation rule.';
        
        // Create a custom error with blocking information
        const blockingError: any = new Error(errorMessage);
        blockingError.isBlocked = true;
        blockingError.ruleId = blockingData.ruleId;
        blockingError.ruleName = blockingData.ruleName;
        blockingError.blockMessage = errorMessage;
        throw blockingError;
      }
      
      // ... معالجة الأخطاء الأخرى ...
    })
  );
}
```

**الميزات:**
- ✅ يتحقق من `error.status === 403` و `error.error.data.isBlocked`
- ✅ يستخرج رسالة الخطأ من `blockingData.message`
- ✅ ينشئ خطأ مخصص يحتوي على معلومات القاعدة (`ruleId`, `ruleName`, `blockMessage`)
- ✅ يرمي الخطأ المخصص للـ Component لمعالجته

---

### 2. FormViewComponent (Public Form)

**الموقع:** `src/app/views/public-form/form-view.component.ts`

**الوظيفة:** `onSubmit()`

**الكود:**

```typescript
async onSubmit(): Promise<void> {
  try {
    // ... إعداد البيانات ...
    
    const submittedSubmission = await this.formSubmissionsService.submitSubmission(submitPayload).toPromise();
    
    // ... معالجة النجاح ...
  } catch (submitError: any) {
    // Handle Blocking Rules (403 Forbidden)
    if (submitError?.isBlocked) {
      const errorMsg = submitError.blockMessage || submitError.message || 
        (currentLang === 'ar' ? 'تم منع إرسال النموذج بسبب قاعدة التحقق' : 'Form submission is blocked by a validation rule');
      
      this.messageService.add({
        severity: 'error',
        summary: currentLang === 'ar' ? 'خطأ' : 'Error',
        detail: errorMsg,
        life: 10000 // Show blocking errors longer
      });
      return;
    }
    
    // ... معالجة الأخطاء الأخرى ...
  }
}
```

**الميزات:**
- ✅ يتحقق من `submitError.isBlocked`
- ✅ يعرض رسالة الخطأ للمستخدم باستخدام `MessageService`
- ✅ يعرض الرسالة لمدة أطول (10 ثوانٍ) لضمان رؤية المستخدم لها
- ✅ يدعم اللغة العربية والإنجليزية

---

### 3. FormSubmissionCreateComponent (Admin Form)

**الموقع:** `src/app/views/form-submissions/form-submission-create/form-submission-create.component.ts`

**الوظيفة:** `submitSubmission()` (في subscribe)

**الكود:**

```typescript
this.formSubmissionsService.submitSubmission(submitPayload).subscribe({
  next: (submittedSubmission) => {
    // ... معالجة النجاح ...
  },
  error: (error) => {
    // Handle Blocking Rules (403 Forbidden) - don't proceed if blocked
    if (error?.isBlocked) {
      const currentLang = this.translationService.getCurrentLanguage();
      const errorMsg = error.blockMessage || error.message || 
        (currentLang === 'ar' ? 'تم منع إرسال النموذج بسبب قاعدة التحقق' : 'Form submission is blocked by a validation rule');
      
      this.messageService.add({
        severity: 'error',
        summary: currentLang === 'ar' ? 'خطأ' : 'Error',
        detail: errorMsg,
        life: 10000 // Show blocking errors longer
      });
      this.isSubmitting = false;
      this.loading.create = false;
      return;
    }
    
    // ... معالجة الأخطاء الأخرى ...
  }
});
```

**الميزات:**
- ✅ يتحقق من `error.isBlocked`
- ✅ يعرض رسالة الخطأ للمستخدم
- ✅ يوقف عملية الإرسال (`isSubmitting = false`)
- ✅ يدعم اللغة العربية والإنجليزية

---

## هيكل الخطأ المخصص

عند تطابق قاعدة حظر، الـ Service ينشئ خطأ مخصص بهذا الهيكل:

```typescript
interface BlockingError extends Error {
  isBlocked: true;
  ruleId?: number;
  ruleName?: string;
  blockMessage: string;
}
```

**الخصائص:**
- `isBlocked`: `true` - يشير إلى أن هذا خطأ من Blocking Rule
- `ruleId`: معرف القاعدة التي تطابقت (اختياري)
- `ruleName`: اسم القاعدة التي تطابقت (اختياري)
- `blockMessage`: رسالة الخطأ التي يجب عرضها للمستخدم

---

## أمثلة على الاستخدام

### مثال 1: منع الإرسال بسبب مبلغ كبير

**القاعدة في Backend:**
```json
{
  "ruleName": "منع المبالغ الكبيرة",
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "TOTAL_AMOUNT",
  "conditionOperator": ">",
  "conditionValue": "50000",
  "blockMessage": "المبلغ الإجمالي يتجاوز الحد الأقصى المسموح به (50,000)"
}
```

**النتيجة في Angular:**
- المستخدم يضغط Submit
- الـ Backend يكتشف أن `TOTAL_AMOUNT = 60000 > 50000`
- الـ Backend يعيد `403 Forbidden` مع الرسالة
- Angular يعرض رسالة الخطأ: **"المبلغ الإجمالي يتجاوز الحد الأقصى المسموح به (50,000)"**
- الإرسال يتم منعه ❌

---

### مثال 2: منع الإرسال بسبب حقل فارغ

**القاعدة في Backend:**
```json
{
  "ruleName": "إلزامية رقم الهاتف",
  "evaluationPhase": "PreSubmit",
  "conditionSource": "Submission",
  "conditionKey": "PHONE_NUMBER",
  "conditionOperator": "isEmpty",
  "conditionValue": null,
  "blockMessage": "رقم الهاتف مطلوب"
}
```

**النتيجة في Angular:**
- المستخدم يضغط Submit بدون إدخال رقم الهاتف
- الـ Backend يكتشف أن `PHONE_NUMBER` فارغ
- الـ Backend يعيد `403 Forbidden` مع الرسالة
- Angular يعرض رسالة الخطأ: **"رقم الهاتف مطلوب"**
- الإرسال يتم منعه ❌

---

## ملاحظات مهمة

### 1. لا حاجة لكود إضافي في Frontend

✅ **النظام يعمل تلقائياً** - لا حاجة لإضافة كود إضافي في Angular Components  
✅ **التحقق يتم في Backend** - جميع قواعد الحظر يتم تقييمها في الـ Backend قبل الإرسال  
✅ **Angular يتعامل مع الاستجابة** - الكود الحالي يتعامل تلقائياً مع استجابة 403 ويعرض الرسالة

### 2. رسائل الخطأ

- ✅ الرسائل تأتي من الـ Backend (`blockMessage` في القاعدة)
- ✅ يمكن تخصيص الرسائل لكل قاعدة بشكل منفصل
- ✅ الرسائل تدعم اللغة العربية والإنجليزية

### 3. الأداء

- ✅ التقييم يتم في الـ Backend (لا يؤثر على أداء Angular)
- ✅ التقييم سريع حتى مع وجود قواعد متعددة
- ✅ لا حاجة لطلبات إضافية من Angular

### 4. الأمان

- ✅ التحقق يتم في الـ Backend (لا يمكن تجاوزه من Frontend)
- ✅ القيم يتم جمعها من قاعدة البيانات (لا يمكن التلاعب بها)
- ✅ القواعد النشطة فقط يتم تقييمها (`isActive = true`)

---

## استكشاف الأخطاء (Troubleshooting)

### المشكلة: رسالة الخطأ لا تظهر

**التحقق:**
1. تأكد أن الـ Backend يعيد `403` مع `data.isBlocked = true`
2. تأكد أن `error.error.data.isBlocked` موجود في الـ Service
3. افتح Console في المتصفح وابحث عن `[FormSubmissionsService] Submission blocked by rule`

### المشكلة: رسالة الخطأ غير واضحة

**الحل:**
- تأكد من تعبئة `blockMessage` في القاعدة بشكل واضح ومفيد
- الرسالة يجب أن تكون باللغة المناسبة (عربي/إنجليزي)

### المشكلة: الإرسال يتم رغم وجود قاعدة حظر

**التحقق:**
1. تأكد أن `isActive = true` في القاعدة
2. تأكد أن `evaluationPhase = "PreSubmit"`
3. تأكد أن الشرط (`condition`) صحيح
4. استخدم `?debug=true` في الـ Backend لرؤية تفاصيل التقييم

---

## الخلاصة

نظام قواعد الحظر يعمل تلقائياً في Angular:

✅ **لا حاجة لكود إضافي** - الكود الحالي يتعامل مع Blocking Rules تلقائياً  
✅ **الرسائل واضحة** - رسائل الخطأ تأتي من الـ Backend وتعرض للمستخدم  
✅ **الأمان مضمون** - التحقق يتم في الـ Backend ولا يمكن تجاوزه  
✅ **الأداء جيد** - التقييم سريع ولا يؤثر على أداء Angular  

🎉 **النظام جاهز للاستخدام!**

