# دليل التحقق من دعم المحتوى ثنائي اللغة
## Debug Guide for Multilingual Support

---

## 🔍 خطوات التحقق

### 1. التحقق من البيانات القادمة من API

افتح **Browser Console** (F12) وتحقق من:

```javascript
// بعد تحميل النموذج، ابحث عن:
[FormView] Tab 0: {
  tabName: "...",
  foreignTabName: "...",  // يجب أن يكون موجود
  name_en: "...",         // يجب أن يكون موجود
  name_ar: "..."          // يجب أن يكون موجود
}
```

### 2. التحقق من اللغة الحالية

```javascript
// في Browser Console
translationService.getCurrentLanguage()
// يجب أن يرجع: 'ar' أو 'en'
```

### 3. اختبار Helper Methods

```javascript
// في Browser Console
// بعد تحميل النموذج
const component = ng.probe(document.querySelector('app-form-view')).componentInstance;

// اختبار getTabName
component.getTabName(component.tabs[0])
// يجب أن يرجع النص حسب اللغة

// اختبار getFieldLabel
component.getFieldLabel(component.tabs[0].fields[0])
// يجب أن يرجع النص حسب اللغة
```

---

## 🐛 المشاكل الشائعة والحلول

### المشكلة 1: البيانات لا تأتي من API

**التحقق**:
```javascript
// في Browser Console
// تحقق من Network tab
// ابحث عن الطلب: /api/FormBuilder/code/{formCode}
// تحقق من Response
```

**الحل**: تأكد من أن API يرجع الحقول ثنائية اللغة

### المشكلة 2: Helper Methods ترجع قيم فارغة

**التحقق**:
```javascript
// في Browser Console
const component = ng.probe(document.querySelector('app-form-view')).componentInstance;
console.log('Current Language:', component.translationService.getCurrentLanguage());
console.log('Tab:', component.tabs[0]);
console.log('Tab Name AR:', component.tabs[0].name_ar);
console.log('Tab Name EN:', component.tabs[0].name_en);
console.log('Foreign Tab Name:', component.tabs[0].foreignTabName);
```

**الحل**: تأكد من أن البيانات تحتوي على الحقول المطلوبة

### المشكلة 3: تبديل اللغة لا يعمل

**التحقق**:
```javascript
// في Browser Console
translationService.setLanguage('ar');
// تحقق من أن اللغة تغيرت
translationService.getCurrentLanguage(); // يجب أن يرجع 'ar'
```

**الحل**: تأكد من أن TranslationService يعمل بشكل صحيح

---

## 📋 Checklist للتحقق

- [ ] API يرجع `foreignTabName` و `foreignFieldName`
- [ ] API يرجع `name_ar`/`name_en` و `label_ar`/`label_en` (computed properties)
- [ ] TranslationService يعمل بشكل صحيح
- [ ] Helper Methods تستدعى بشكل صحيح
- [ ] البيانات موجودة في Console logs
- [ ] تبديل اللغة يعمل

---

## 🔧 إصلاحات سريعة

### إذا كانت البيانات لا تأتي:
1. تحقق من API response في Network tab
2. تأكد من أن Migration تم تشغيلها
3. تأكد من أن البيانات موجودة في Database

### إذا كانت Helper Methods لا تعمل:
1. تحقق من Console logs
2. تأكد من أن TranslationService موجود
3. تأكد من أن البيانات موجودة

### إذا كان تبديل اللغة لا يعمل:
1. تحقق من Language Switcher في Header
2. تحقق من localStorage: `localStorage.getItem('language')`
3. تأكد من أن TranslationService.setLanguage() يعمل

---

## 📞 معلومات إضافية

إذا استمرت المشكلة، أرسل:
1. Console logs من Browser
2. Network response من API
3. Screenshot للـ UI
