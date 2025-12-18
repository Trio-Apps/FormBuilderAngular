# السلوك المتوقع - Expected Behavior
## دليل شامل للسلوك المتوقع من النظام ثنائي اللغة

---

## 🎯 السلوك المتوقع بشكل عام

### 1. **عند فتح الصفحة (Form View)**

#### ✅ المتوقع:
- **اللغة الافتراضية**: الإنجليزية (`en`) - إذا لم يتم اختيار لغة من قبل
- **اللغة المحفوظة**: إذا تم اختيار لغة سابقاً، يتم تحميلها من `localStorage`
- **عرض المحتوى**: يعرض النصوص حسب اللغة المختارة

#### 📋 مثال:
```
اللغة الحالية: en
→ Form Name: "Employee Registration Form"
→ Tab Name: "Personal Information"
→ Field Label: "Full Name"
→ Placeholder: "Your answer"
```

```
اللغة الحالية: ar
→ Form Name: "نموذج تسجيل الموظفين"
→ Tab Name: "المعلومات الشخصية"
→ Field Label: "الاسم الكامل"
→ Placeholder: "أدخل إجابتك"
```

---

### 2. **عند تبديل اللغة (Language Switcher)**

#### ✅ المتوقع:
- **الموقع**: في Header (أعلى الصفحة) - أيقونة العلم 🇬🇧 أو 🇸🇦
- **عند النقر**: تظهر قائمة منسدلة بـ:
  - 🇬🇧 English
  - 🇸🇦 العربية
- **عند الاختيار**:
  - ✅ يتم حفظ اللغة في `localStorage`
  - ✅ يتم تحديث المحتوى **فوراً** بدون إعادة تحميل الصفحة
  - ✅ يتم إرسال `Accept-Language` header مع الطلبات التالية للـ API

#### 📋 مثال:
```
1. المستخدم يفتح Form View → اللغة: en
2. المستخدم ينقر على 🇬🇧 في Header
3. المستخدم يختار "العربية" 🇸🇦
4. ✅ المحتوى يتغير فوراً إلى العربية
   - Form Name: "نموذج تسجيل الموظفين"
   - Tab Name: "المعلومات الشخصية"
   - Field Label: "الاسم الكامل"
5. ✅ اللغة محفوظة → عند إعادة فتح الصفحة، تبقى العربية
```

---

### 3. **أولوية عرض النصوص (Priority)**

#### ✅ المتوقع:

**للـ Tabs (التبويبات)**:
```
1. name_ar (إذا اللغة = ar) أو name_en (إذا اللغة = en)
2. foreignTabName (إذا اللغة = ar)
3. tabName (الافتراضي - الإنجليزية)
```

**للـ Fields (الحقول)**:
```
1. label_ar (إذا اللغة = ar) أو label_en (إذا اللغة = en)
2. foreignFieldName (إذا اللغة = ar)
3. fieldName (الافتراضي - الإنجليزية)
```

**للـ Placeholders**:
```
1. placeholder_ar (إذا اللغة = ar) أو placeholder_en (إذا اللغة = en)
2. foreignPlaceholder (إذا اللغة = ar)
3. placeholder (الافتراضي)
4. "أدخل إجابتك" (ar) أو "Your answer" (en) - إذا لم يوجد أي شيء
```

**للـ Options (الخيارات)**:
```
1. foreignOptionText (إذا اللغة = ar)
2. optionText (الافتراضي - الإنجليزية)
```

---

### 4. **البيانات القادمة من API**

#### ✅ المتوقع:

**الـ API يجب أن يرجع**:
```json
{
  "formName": "Employee Registration Form",
  "foreignFormName": "نموذج تسجيل الموظفين",
  "description": "Please fill out this form",
  "foreignDescription": "يرجى ملء هذا النموذج",
  "tabs": [
    {
      "id": 1,
      "tabName": "Personal Information",
      "foreignTabName": "المعلومات الشخصية",
      "name_en": "Personal Information",
      "name_ar": "المعلومات الشخصية",
      "fields": [
        {
          "id": 1,
          "fieldName": "Full Name",
          "foreignFieldName": "الاسم الكامل",
          "label_en": "Full Name",
          "label_ar": "الاسم الكامل",
          "placeholder": "Enter your name",
          "foreignPlaceholder": "أدخل اسمك",
          "placeholder_en": "Enter your name",
          "placeholder_ar": "أدخل اسمك",
          "fieldOptions": [
            {
              "optionText": "Option 1",
              "foreignOptionText": "الخيار 1"
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 5. **Console Logs للتحقق**

#### ✅ المتوقع في Browser Console:

```javascript
[FormView] Form data: {
  formName: "Employee Registration Form",
  foreignFormName: "نموذج تسجيل الموظفين",
  description: "Please fill out this form",
  foreignDescription: "يرجى ملء هذا النموذج"
}
[FormView] Current Language: en
[FormView] Tabs found: 2
[FormView] Form loaded successfully with 2 tabs
[FormView] Tab 0 Multilingual Data: {
  id: 1,
  tabName: "Personal Information",
  foreignTabName: "المعلومات الشخصية",
  name_en: "Personal Information",
  name_ar: "المعلومات الشخصية",
  currentLanguage: "en",
  displayedName: "Personal Information",  // ✅ يعرض name_en
  fieldsCount: 3,
  fields: [
    {
      id: 1,
      fieldName: "Full Name",
      foreignFieldName: "الاسم الكامل",
      label_en: "Full Name",
      label_ar: "الاسم الكامل",
      displayedLabel: "Full Name",  // ✅ يعرض label_en
      placeholder: "Enter your name",
      foreignPlaceholder: "أدخل اسمك",
      placeholder_en: "Enter your name",
      placeholder_ar: "أدخل اسمك",
      displayedPlaceholder: "Enter your name"  // ✅ يعرض placeholder_en
    }
  ]
}
```

**عند تبديل اللغة إلى العربية**:
```javascript
[FormView] Tab 0 Multilingual Data: {
  currentLanguage: "ar",  // ✅ تغيرت اللغة
  displayedName: "المعلومات الشخصية",  // ✅ يعرض name_ar
  fields: [
    {
      displayedLabel: "الاسم الكامل",  // ✅ يعرض label_ar
      displayedPlaceholder: "أدخل اسمك"  // ✅ يعرض placeholder_ar
    }
  ]
}
```

---

### 6. **Network Requests (طلبات API)**

#### ✅ المتوقع:

**عند تحميل Form**:
```
GET /api/FormBuilder/code/{formCode}
Headers:
  Accept-Language: en-US  (إذا اللغة = en)
  أو
  Accept-Language: ar-SA  (إذا اللغة = ar)
```

**عند تبديل اللغة**:
- ✅ الطلبات التالية للـ API ترسل `Accept-Language` header الجديد
- ✅ لا يتم إعادة تحميل البيانات تلقائياً (يتم تحديث العرض فقط)

---

### 7. **الحالات الخاصة (Edge Cases)**

#### ✅ المتوقع:

**إذا لم توجد ترجمة عربية**:
```
اللغة: ar
→ يعرض النص الإنجليزي (fallback)
```

**إذا كانت البيانات فارغة**:
```
→ يعرض string فارغ ""
```

**إذا كانت اللغة غير معروفة**:
```
→ يعرض النص الإنجليزي (fallback)
```

---

## 🔍 كيفية التحقق من أن كل شيء يعمل

### خطوة 1: افتح Browser Console (F12)

### خطوة 2: افتح Form View

### خطوة 3: تحقق من Logs:
- ✅ `[FormView] Current Language: en` أو `ar`
- ✅ `[FormView] Tab 0 Multilingual Data` - يجب أن يحتوي على البيانات
- ✅ `displayedName`, `displayedLabel`, `displayedPlaceholder` - يجب أن تعرض النص الصحيح

### خطوة 4: جرب تبديل اللغة:
- ✅ انقر على العلم في Header
- ✅ اختر لغة مختلفة
- ✅ تحقق من أن المحتوى تغير فوراً
- ✅ تحقق من Console logs - `currentLanguage` يجب أن يتغير

### خطوة 5: تحقق من Network Tab:
- ✅ افتح Network tab في Browser DevTools
- ✅ ابحث عن طلب `/api/FormBuilder/code/...`
- ✅ تحقق من Request Headers - يجب أن يحتوي على `Accept-Language: ar-SA` أو `en-US`

---

## ❌ ما هو غير متوقع (Not Expected)

### ❌ لا يجب أن يحدث:
- ❌ إعادة تحميل الصفحة عند تبديل اللغة
- ❌ فقدان البيانات عند تبديل اللغة
- ❌ عرض نصوص فارغة إذا كانت البيانات موجودة
- ❌ عدم تحديث المحتوى عند تبديل اللغة
- ❌ عدم إرسال `Accept-Language` header مع الطلبات

---

## 📞 إذا كان هناك مشكلة

### أرسل:
1. **Console Logs** - من Browser Console
2. **Network Response** - من Network tab (API response)
3. **Screenshot** - للـ UI
4. **الخطوات** - ماذا فعلت بالضبط

---

## ✅ الخلاصة

**المتوقع**:
- ✅ تبديل اللغة يعمل بدون إعادة تحميل
- ✅ المحتوى يتغير فوراً حسب اللغة
- ✅ البيانات تأتي من API مع الحقول ثنائية اللغة
- ✅ أولوية عرض النصوص تعمل بشكل صحيح
- ✅ Console logs تساعد في التحقق من البيانات

**إذا كان كل شيء يعمل كما هو متوقع**:
- ✅ النظام جاهز للاستخدام! 🎉
