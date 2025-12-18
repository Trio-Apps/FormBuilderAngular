# تطبيق دعم المحتوى ثنائي اللغة في Angular Frontend
## Multilingual Content Support - Frontend Implementation

---

## 📋 نظرة عامة

تم تطبيق دعم كامل للمحتوى ثنائي اللغة (عربي/إنجليزي) في Angular Frontend ليعمل مع البيانات القادمة من .NET API.

---

## ✅ التعديلات المُنفذة

### 1. تحديث DTOs (`form-builder-dto.model.ts`)

#### FormBuilderDto
```typescript
export interface FormBuilderDto {
  formName: string;
  foreignFormName?: string; // ✅ جديد - Arabic form name
  description?: string;
  foreignDescription?: string; // ✅ جديد - Arabic description
  // ... other fields
}
```

#### FormTabDto
```typescript
export interface FormTabDto {
  tabName: string;
  foreignTabName?: string; // ✅ جديد - Arabic tab name
  // Computed properties from API (for compatibility)
  name_en?: string; // ✅ جديد
  name_ar?: string; // ✅ جديد
  order?: number; // ✅ جديد
  is_active?: boolean; // ✅ جديد
  // ... other fields
}
```

#### FormFieldDto
```typescript
export interface FormFieldDto {
  fieldName: string;
  foreignFieldName?: string; // ✅ جديد - Arabic field name
  placeholder?: string;
  foreignPlaceholder?: string; // ✅ جديد - Arabic placeholder
  hintText: string;
  foreignHintText?: string; // ✅ جديد - Arabic hint text
  validationMessage?: string;
  foreignValidationMessage?: string; // ✅ جديد - Arabic validation message
  // Computed properties from API (for compatibility)
  label_en?: string; // ✅ جديد
  label_ar?: string; // ✅ جديد
  placeholder_en?: string; // ✅ جديد
  placeholder_ar?: string; // ✅ جديد
  type?: string; // ✅ جديد
  is_required?: boolean; // ✅ جديد
  // ... other fields
}
```

#### FieldTypeDto
```typescript
export interface FieldTypeDto {
  typeName: string;
  foreignTypeName?: string; // ✅ جديد - Arabic type name
  // Computed properties from API
  type_name_en?: string; // ✅ جديد
  type_name_ar?: string; // ✅ جديد
  // ... other fields
}
```

#### FieldOptionDto
```typescript
export interface FieldOptionDto {
  optionText: string;
  foreignOptionText?: string; // ✅ جديد - Arabic option text
  // ... other fields
}
```

---

### 2. تحديث FormViewComponent (`form-view.component.ts`)

#### إضافة TranslationService
```typescript
constructor(
  // ... other services
  public translationService: TranslationService // ✅ جديد
) {}
```

#### Helper Methods للترجمة

##### getFormName()
```typescript
getFormName(form: FormBuilderDto | null): string {
  if (!form) return '';
  const lang = this.translationService.getCurrentLanguage();
  
  if (lang === 'ar' && form.foreignFormName) {
    return form.foreignFormName;
  }
  
  return form.formName || '';
}
```

##### getFormDescription()
```typescript
getFormDescription(form: FormBuilderDto | null): string {
  if (!form) return '';
  const lang = this.translationService.getCurrentLanguage();
  
  if (lang === 'ar' && form.foreignDescription) {
    return form.foreignDescription;
  }
  
  return form.description || '';
}
```

##### getTabName()
```typescript
getTabName(tab: FormTabDto): string {
  const lang = this.translationService.getCurrentLanguage();
  
  // Use computed properties if available (from API)
  if (lang === 'ar') {
    if (tab.name_ar) return tab.name_ar;
    if (tab.foreignTabName) return tab.foreignTabName;
  } else {
    if (tab.name_en) return tab.name_en;
  }
  
  return tab.tabName || '';
}
```

##### getFieldLabel()
```typescript
getFieldLabel(field: FormFieldDto): string {
  const lang = this.translationService.getCurrentLanguage();
  
  // Use computed properties if available (from API)
  if (lang === 'ar') {
    if (field.label_ar) return field.label_ar;
    if (field.foreignFieldName) return field.foreignFieldName;
  } else {
    if (field.label_en) return field.label_en;
  }
  
  return field.fieldName || '';
}
```

##### getFieldPlaceholder()
```typescript
getFieldPlaceholder(field: FormFieldDto): string {
  const lang = this.translationService.getCurrentLanguage();
  const defaultPlaceholder = 'Your answer';
  
  // Use computed properties if available (from API)
  if (lang === 'ar') {
    if (field.placeholder_ar) return field.placeholder_ar;
    if (field.foreignPlaceholder) return field.foreignPlaceholder;
  } else {
    if (field.placeholder_en) return field.placeholder_en;
  }
  
  return field.placeholder || defaultPlaceholder;
}
```

##### getOptionText()
```typescript
getOptionText(option: any): string {
  const lang = this.translationService.getCurrentLanguage();
  
  if (lang === 'ar' && option.foreignOptionText) {
    return option.foreignOptionText;
  }
  
  return option.optionText || '';
}
```

---

### 3. تحديث HTML Template (`form-view.component.html`)

#### Form Header
```html
<!-- قبل -->
<h1 class="form-title">{{ form?.formName }}</h1>

<!-- بعد -->
<h1 class="form-title">{{ getFormName(form) }}</h1>
<p class="form-description" *ngIf="getFormDescription(form)">
  {{ getFormDescription(form) }}
</p>
```

#### Tabs Navigation
```html
<!-- قبل -->
{{ tab.tabName }}

<!-- بعد -->
{{ getTabName(tab) }}
```

#### Field Labels
```html
<!-- قبل -->
{{ field.fieldName }}

<!-- بعد -->
{{ getFieldLabel(field) }}
```

#### Field Placeholders
```html
<!-- قبل -->
[placeholder]="field.placeholder || 'Your answer'"

<!-- بعد -->
[placeholder]="getFieldPlaceholder(field)"
```

#### Option Text (Select, Radio, Checkbox)
```html
<!-- قبل -->
{{ opt.optionText }}

<!-- بعد -->
{{ getOptionText(opt) }}
```

---

## 🔄 تدفق البيانات

```
1. API يرجع البيانات مع الحقول ثنائية اللغة
   ↓
2. FormViewComponent يستقبل البيانات
   ↓
3. المستخدم يختار اللغة (AR/EN)
   ↓
4. Helper Methods تختار النص المناسب:
   - getTabName() → name_ar أو name_en
   - getFieldLabel() → label_ar أو label_en
   - getFieldPlaceholder() → placeholder_ar أو placeholder_en
   - getOptionText() → foreignOptionText أو optionText
   ↓
5. Template يعرض النص حسب اللغة المختارة
   ↓
6. تبديل اللغة لا يحتاج إعادة تحميل البيانات
```

---

## 📊 أولوية اختيار النص

### للـ Tabs:
1. **name_ar** / **name_en** (computed properties من API) - الأولوية الأولى
2. **foreignTabName** / **tabName** (الحقول الأصلية) - الأولوية الثانية

### للـ Fields:
1. **label_ar** / **label_en** (computed properties من API) - الأولوية الأولى
2. **foreignFieldName** / **fieldName** (الحقول الأصلية) - الأولوية الثانية

### للـ Placeholders:
1. **placeholder_ar** / **placeholder_en** (computed properties من API) - الأولوية الأولى
2. **foreignPlaceholder** / **placeholder** (الحقول الأصلية) - الأولوية الثانية

### للـ Options:
1. **foreignOptionText** (عربي) - الأولوية الأولى
2. **optionText** (إنجليزي) - الأولوية الثانية

---

## 🎯 كيفية الاستخدام

### 1. تبديل اللغة
```typescript
// في أي component
this.translationService.setLanguage('ar'); // أو 'en'
// جميع النصوص تتحدث تلقائياً بدون إعادة تحميل البيانات
```

### 2. في Template
```html
<!-- Form Name -->
<h1>{{ getFormName(form) }}</h1>

<!-- Tab Name -->
{{ getTabName(tab) }}

<!-- Field Label -->
{{ getFieldLabel(field) }}

<!-- Field Placeholder -->
[placeholder]="getFieldPlaceholder(field)"

<!-- Option Text -->
{{ getOptionText(option) }}
```

---

## ✅ الميزات

1. **دعم كامل للغة العربية والإنجليزية**
2. **لا حاجة لإعادة تحميل البيانات** عند تبديل اللغة
3. **أولوية ذكية** - يستخدم computed properties أولاً ثم الحقول الأصلية
4. **Fallback آمن** - إذا لم يوجد نص عربي، يستخدم الإنجليزي
5. **متوافق مع API** - يعمل مع كلا النمطين (Foreign* و computed properties)

---

## 📝 ملاحظات مهمة

1. **Computed Properties من API**:
   - API يرجع `name_ar`/`name_en` و `label_ar`/`label_en` تلقائياً
   - هذه الحقول لها الأولوية في الاختيار

2. **Foreign Fields**:
   - إذا لم توجد computed properties، يتم استخدام `foreignTabName` و `foreignFieldName`

3. **Default Language**:
   - إذا لم يوجد نص باللغة المختارة، يتم استخدام النص الإنجليزي كـ fallback

4. **Language Switching**:
   - تبديل اللغة فوري ولا يحتاج إعادة تحميل الصفحة
   - البيانات تُحمل مرة واحدة فقط

---

## 🧪 اختبار النظام

### 1. اختبار تبديل اللغة
```typescript
// في Browser Console
// تغيير اللغة
translationService.setLanguage('ar');
// يجب أن تتحدث جميع النصوص فوراً
```

### 2. اختبار البيانات من API
```typescript
// تحقق من أن API يرجع الحقول ثنائية اللغة
console.log(form.tabs[0].name_ar); // يجب أن يكون موجود
console.log(form.tabs[0].fields[0].label_ar); // يجب أن يكون موجود
```

---

## ✅ Checklist

- [x] تحديث DTOs لتشمل الحقول ثنائية اللغة
- [x] إضافة TranslationService إلى FormViewComponent
- [x] إضافة Helper Methods لاختيار النص حسب اللغة
- [x] تحديث HTML Template لاستخدام Helper Methods
- [x] دعم Form Name و Description
- [x] دعم Tab Names
- [x] دعم Field Labels
- [x] دعم Field Placeholders
- [x] دعم Option Text (Select, Radio, Checkbox)
- [x] دعم Field Type Names
- [x] Fallback للنصوص المفقودة

---

## 🎉 الخلاصة

تم تطبيق دعم كامل للمحتوى ثنائي اللغة في Angular Frontend:

✅ **جميع النصوص** تدعم العربية والإنجليزية  
✅ **تبديل اللغة** فوري بدون إعادة تحميل  
✅ **متوافق مع API** - يعمل مع كلا النمطين  
✅ **Fallback آمن** - يستخدم النص الإنجليزي إذا لم يوجد عربي  

النظام جاهز للاستخدام! 🌍
