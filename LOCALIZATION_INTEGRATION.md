# تكامل الترجمة بين Angular و .NET API

## ملخص

تم ربط نظام الترجمة في Angular مع ملفات Resources في .NET API بحيث يتم إرسال اللغة المختارة في جميع الطلبات إلى API.

---

## الملفات المُنشأة/المُحدثة

### 1. Language Interceptor
**الموقع**: `src/app/core/interceptors/language.interceptor.ts`

**الوظيفة**:
- إضافة `Accept-Language` header في جميع الطلبات إلى API
- تحويل كود اللغة من Angular (`ar`/`en`) إلى كود الثقافة في .NET (`ar-SA`/`en-US`)

**كيف يعمل**:
```typescript
// عندما تكون اللغة في Angular = 'ar'
// يتم إرسال: Accept-Language: ar-SA

// عندما تكون اللغة في Angular = 'en'
// يتم إرسال: Accept-Language: en-US
```

### 2. تحديث app.config.ts
تم إضافة `languageInterceptor` قبل `authInterceptor` في قائمة interceptors:
```typescript
withInterceptors([languageInterceptor, authInterceptor])
```

**الترتيب مهم**: يجب أن يكون `languageInterceptor` أولاً حتى يتم إضافة header قبل إضافة Authorization header.

---

## كيف يعمل التكامل

### 1. في Angular (Frontend)
```typescript
// المستخدم يغير اللغة
this.translationService.setLanguage('ar');

// عند إرسال طلب إلى API
this.http.get('/api/FormBuilder')
// يتم إرسال: Accept-Language: ar-SA
```

### 2. في .NET API (Backend)
```csharp
// .NET API يقرأ Accept-Language header
var culture = Request.GetTypedHeaders().AcceptLanguage.FirstOrDefault()?.Value.Value;
// culture = "ar-SA" أو "en-US"

// استخدام IStringLocalizer مع الثقافة الصحيحة
var message = _localizer["FormBuilder_FormCodeRequired"];
// يتم إرجاع الرسالة المترجمة من Resources/FormBuilderService.ar.resx أو .en.resx
```

---

## تدفق البيانات

```
1. المستخدم يختار اللغة في Angular
   ↓
2. TranslationService.setLanguage('ar')
   ↓
3. اللغة تُحفظ في localStorage
   ↓
4. عند إرسال طلب HTTP إلى API
   ↓
5. languageInterceptor يضيف Accept-Language: ar-SA
   ↓
6. .NET API يقرأ Header ويستخدم Resources/ar.resx
   ↓
7. API يرجع الرسائل المترجمة
   ↓
8. Angular يعرض الرسائل المترجمة
```

---

## أمثلة الاستخدام

### مثال 1: طلب API عادي
```typescript
// في Component
constructor(
  private formsService: FormsService,
  private translationService: TranslationService
) {}

// تغيير اللغة
changeLanguage(lang: 'ar' | 'en'): void {
  this.translationService.setLanguage(lang);
  // جميع الطلبات التالية ستستخدم اللغة الجديدة
}

// إرسال طلب
this.formsService.getForms().subscribe({
  next: (forms) => {
    // API سيرجع الرسائل باللغة المختارة
  },
  error: (error) => {
    // رسالة الخطأ ستكون باللغة المختارة من API
    console.log(error.error.message); // "كود النموذج مطلوب" أو "Form code is required"
  }
});
```

### مثال 2: في Service
```typescript
// forms.service.ts
getForms(): Observable<PagedResult<FormBuilderDto>> {
  // languageInterceptor سيضيف Accept-Language تلقائياً
  return this.http.get<PagedResult<FormBuilderDto>>(`${this.baseUrl}?page=${page}&pageSize=${pageSize}`);
}
```

---

## رموز الثقافة (Culture Codes)

| Angular Language | .NET Culture Code | Description |
|-----------------|-------------------|-------------|
| `ar` | `ar-SA` | العربية - السعودية |
| `en` | `en-US` | English - United States |

**ملاحظة**: يمكن تعديل رموز الثقافة في `language.interceptor.ts` حسب احتياجاتك:
```typescript
const cultureCode = currentLanguage === 'ar' ? 'ar-EG' : 'en-GB';
```

---

## التحقق من عمل النظام

### 1. فتح Developer Tools في المتصفح
- اضغط F12
- اذهب إلى Network tab

### 2. إرسال طلب
- قم بتغيير اللغة في Angular
- أرسل أي طلب إلى API

### 3. التحقق من Headers
- ابحث عن الطلب في Network tab
- افتح Request Headers
- يجب أن ترى: `Accept-Language: ar-SA` أو `Accept-Language: en-US`

---

## ملاحظات مهمة

1. **الترتيب مهم**: `languageInterceptor` يجب أن يكون قبل `authInterceptor`
2. **التحديث التلقائي**: عند تغيير اللغة، جميع الطلبات التالية ستستخدم اللغة الجديدة
3. **التوافق**: يعمل مع جميع Services و Components تلقائياً
4. **لا حاجة لتعديل**: لا حاجة لتعديل أي Service أو Component - النظام يعمل تلقائياً

---

## إعدادات .NET API المطلوبة

تأكد من أن .NET API لديه:

1. **Localization مُفعّل**:
```csharp
builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");
```

2. **Culture Middleware**:
```csharp
var supportedCultures = new[] { "en-US", "ar-SA" };
var localizationOptions = new RequestLocalizationOptions()
    .SetDefaultCulture(supportedCultures[0])
    .AddSupportedCultures(supportedCultures)
    .AddSupportedUICultures(supportedCultures);

app.UseRequestLocalization(localizationOptions);
```

3. **ملفات Resources موجودة**:
- `Resources/FormBuilderService.ar.resx`
- `Resources/FormBuilderService.en.resx`
- `Resources/Shared.ar.resx`
- `Resources/Shared.en.resx`
- ... إلخ

---

## الخلاصة

✅ تم ربط Angular مع .NET API للترجمة  
✅ جميع الطلبات ترسل `Accept-Language` header تلقائياً  
✅ .NET API يستخدم ملفات Resources الصحيحة  
✅ لا حاجة لتعديل أي Service أو Component  

النظام جاهز للعمل! 🎉
