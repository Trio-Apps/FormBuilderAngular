# 🔧 حل مشاكل Form Rules

## المشكلة: خطأ 401 Unauthorized عند تحميل القواعد

### السبب:
الـ API endpoint `/api/FormRules/form/{formId}/active` يتطلب authentication، لكن النموذج العام (public form) لا يحتاج تسجيل دخول.

### الحلول:

#### الحل 1: جعل القواعد تأتي مع النموذج (الأفضل)
في الـ Backend، عند تحميل النموذج من `/api/FormBuilder/code/{formCode}`، يجب إضافة القواعد النشطة مع النموذج:

```csharp
// في Backend Controller
[HttpGet("code/{formCode}")]
public async Task<IActionResult> GetFormByCode(string formCode)
{
    var form = await _formService.GetFormByCodeAsync(formCode);
    if (form == null) return NotFound();
    
    // إضافة القواعد النشطة
    form.FormRules = await _formRulesService.GetActiveRulesByFormIdAsync(form.Id);
    
    return Ok(form);
}
```

#### الحل 2: إضافة endpoint عام للقواعد
إضافة endpoint جديد في الـ Backend لا يتطلب authentication:

```csharp
[AllowAnonymous] // أو [Authorize] مع policy للـ public forms
[HttpGet("public/form/{formId}/active")]
public async Task<IActionResult> GetActiveRulesForPublicForm(int formId)
{
    var rules = await _formRulesService.GetActiveRulesByFormIdAsync(formId);
    return Ok(rules);
}
```

ثم في الـ Frontend، استخدم هذا الـ endpoint:

```typescript
// في form-rules.service.ts
getActiveRulesForPublicForm(formId: number): Observable<FormRule[]> {
  return this.http.get<any>(`${this.baseUrl}/public/form/${formId}/active`).pipe(
    // ... نفس الكود
  );
}
```

#### الحل 3: استخدام القواعد المضمنة في النموذج
إذا كان الـ Backend يدعم إرجاع القواعد مع النموذج، سيتم استخدامها تلقائياً.

---

## التحقق من المشكلة

### 1. افتح Developer Console (F12)
### 2. ابحث عن هذه الرسائل:

**إذا رأيت:**
```
[FormView] Loading rules from API for form: 1
Failed to load resource: the server responded with a status of 401
[FormRulesService] Error fetching active rules for form 1
[FormView] Loaded rules from API: 0
[FormView] No rules to evaluate
```

**المشكلة:** الـ endpoint يتطلب authentication.

**الحل:** استخدم أحد الحلول أعلاه.

---

## التحقق من أن القواعد تعمل

### 1. تحقق من Console Logs:

**يجب أن ترى:**
```
[FormView] Loading rules from API for form: 1
[FormRulesService] Fetching active rules for form 1
[FormRulesService] Converted to X active FormRules
[FormView] Loaded rules from API: X
[FormView] Evaluating X rules
[FormView] Field visibility states: [...]
```

### 2. تحقق من القاعدة:
- القاعدة نشطة (`isActive: true`)
- `fieldCode` صحيح (`CUSTOMER_TYPE`, `COMPANY_NAME`)
- القيمة في الشرط مطابقة تماماً ("Corporate")

### 3. اختبر القاعدة:
1. افتح النموذج
2. اختر "Corporate" في `CUSTOMER_TYPE`
3. يجب أن يظهر `COMPANY_NAME` تلقائياً

---

## نصائح إضافية

1. **استخدم Console Logs:** جميع العمليات مسجلة في Console
2. **تحقق من Network Tab:** شاهد طلبات HTTP في Developer Tools
3. **تحقق من القواعد في Database:** تأكد من وجود القواعد في قاعدة البيانات
4. **تحقق من Authentication:** إذا كان الـ endpoint يتطلب auth، تأكد من وجود token صحيح

---

**ملاحظة:** الحل الأفضل هو جعل القواعد تأتي مع النموذج عند تحميله، لأن النموذج العام لا يحتاج authentication.

