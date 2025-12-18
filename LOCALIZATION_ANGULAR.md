# نظام الترجمة في Angular - Localization System

## ملخص

تم إعداد نظام ترجمة كامل لمشروع Angular Form Builder يدعم اللغة العربية والإنجليزية.

---

## الملفات المُنشأة

### 1. Translation Service
**الموقع**: `src/app/core/services/translation.service.ts`

**الوظائف**:
- إدارة اللغة الحالية (ar/en)
- تحميل ملفات الترجمة من JSON
- ترجمة المفاتيح مع دعم المعاملات
- حفظ اللغة المختارة في localStorage

**الاستخدام**:
```typescript
constructor(private translationService: TranslationService) {}

// تغيير اللغة
this.translationService.setLanguage('ar'); // أو 'en'

// الحصول على اللغة الحالية
const lang = this.translationService.getCurrentLanguage();

// ترجمة مفتاح
const text = this.translationService.translate('forms.title');
const textWithParams = this.translationService.translate('forms.formsFound', { count: 5 });
```

### 2. Translate Pipe
**الموقع**: `src/app/core/pipes/translate.pipe.ts`

**الاستخدام في Templates**:
```html
<h1>{{ 'forms.title' | translate }}</h1>
<p>{{ 'forms.subtitle' | translate }}</p>
<span>{{ 'forms.formsFound' | translate }}</span>
```

### 3. ملفات الترجمة

#### الإنجليزية: `src/assets/i18n/en.json`
#### العربية: `src/assets/i18n/ar.json`

**الهيكل**:
```json
{
  "common": {
    "dashboard": "Dashboard",
    "forms": "Forms",
    ...
  },
  "forms": {
    "title": "Form Builder",
    "subtitle": "Manage all forms in the system",
    ...
  },
  "messages": {
    "formCreated": "Form created successfully",
    ...
  }
}
```

---

## المكونات المترجمة

### ✅ Forms List Component
**الموقع**: `src/app/views/FormBuilder/components/forms-list/`

**التعديلات**:
- إضافة `TranslatePipe` إلى imports
- إضافة `TranslationService` إلى constructor
- ترجمة جميع النصوص في HTML template
- ترجمة الرسائل في TypeScript

---

## كيفية إضافة الترجمة لمكون جديد

### 1. إضافة TranslatePipe إلى imports
```typescript
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  imports: [
    // ... other imports
    TranslatePipe
  ]
})
```

### 2. إضافة TranslationService إلى constructor
```typescript
constructor(
  // ... other services
  public translationService: TranslationService
) {}
```

### 3. استخدام Pipe في Template
```html
<h1>{{ 'forms.title' | translate }}</h1>
<button>{{ 'common.save' | translate }}</button>
```

### 4. استخدام Service في TypeScript
```typescript
const message = this.translationService.translate('messages.formCreated');
this.messageService.add({
  severity: 'success',
  summary: 'Success',
  detail: message
});
```

### 5. إضافة المفاتيح إلى ملفات الترجمة
أضف المفاتيح الجديدة إلى:
- `src/assets/i18n/en.json`
- `src/assets/i18n/ar.json`

---

## المفاتيح المتوفرة

### Common (مشترك)
- `common.dashboard` - لوحة التحكم / Dashboard
- `common.forms` - النماذج / Forms
- `common.tabs` - التبويبات / Tabs
- `common.fields` - الحقول / Fields
- `common.save` - حفظ / Save
- `common.cancel` - إلغاء / Cancel
- `common.delete` - حذف / Delete
- `common.edit` - تعديل / Edit
- `common.loading` - جاري التحميل... / Loading...
- `common.active` - نشط / Active
- `common.inactive` - غير نشط / Inactive
- `common.published` - منشور / Published
- `common.draft` - مسودة / Draft

### Forms (النماذج)
- `forms.title` - منشئ النماذج / Form Builder
- `forms.subtitle` - إدارة جميع النماذج في النظام / Manage all forms in the system
- `forms.newForm` - نموذج جديد / New Form
- `forms.createForm` - إنشاء نموذج / Create Form
- `forms.editForm` - تعديل النموذج / Edit Form
- `forms.formsList` - قائمة النماذج / Forms List
- `forms.totalForms` - إجمالي النماذج / Total Forms
- `forms.publishedForms` - النماذج المنشورة / Published Forms
- `forms.activeForms` - النماذج النشطة / Active Forms
- `forms.noFormsFound` - لم يتم العثور على نماذج / No Forms Found
- `forms.loadingForms` - جاري تحميل النماذج... / Loading forms...
- `forms.searchForms` - البحث في النماذج... / Search forms...
- `forms.formsFound` - نموذج (نماذج) موجودة / form(s) found
- `forms.formName` - اسم النموذج / FORM NAME
- `forms.formCode` - كود النموذج / FORM CODE
- `forms.description` - الوصف / DESCRIPTION
- `forms.publishedStatus` - حالة النشر / PUBLISHED STATUS
- `forms.activeStatus` - الحالة النشطة / ACTIVE STATUS
- `forms.enterFormName` - أدخل اسم النموذج / Enter form name
- `forms.enterDescription` - أدخل الوصف / Enter description
- `forms.copyPublicLink` - نسخ الرابط العام / Copy Public Link
- `forms.manageTabs` - إدارة التبويبات / Manage Tabs
- `forms.backToDashboard` - العودة إلى لوحة التحكم / Back to Dashboard

### Tabs (التبويبات)
- `tabs.title` - إدارة التبويبات / Tabs Management
- `tabs.newTab` - تبويب جديد / New Tab
- `tabs.addTab` - إضافة تبويب / Add Tab
- `tabs.editTab` - تعديل التبويب / Edit Tab
- `tabs.tabsList` - قائمة التبويبات / Tabs List
- `tabs.totalTabs` - إجمالي التبويبات / Total Tabs
- `tabs.activeTabs` - التبويبات النشطة / Active Tabs
- `tabs.totalFields` - إجمالي الحقول / Total Fields
- `tabs.tabName` - اسم التبويب / Tab Name
- `tabs.tabCode` - كود التبويب / Tab Code
- `tabs.tabOrder` - ترتيب التبويب / Tab Order

### Fields (الحقول)
- `fields.title` - إدارة الحقول / Fields Management
- `fields.newField` - حقل جديد / New Field
- `fields.addField` - إضافة حقل / Add Field
- `fields.editField` - تعديل الحقل / Edit Field
- `fields.fieldsList` - قائمة الحقول / Fields List
- `fields.fieldName` - اسم الحقل / Field Name
- `fields.fieldCode` - كود الحقل / Field Code
- `fields.fieldOrder` - ترتيب الحقل / Field Order
- `fields.fieldType` - نوع الحقل / Field Type
- `fields.placeholder` - النص التوضيحي / Placeholder
- `fields.hintText` - نص التلميح / Hint Text
- `fields.defaultValue` - القيمة الافتراضية / Default Value
- `fields.isMandatory` - إلزامي / Mandatory
- `fields.isEditable` - قابل للتعديل / Editable
- `fields.isVisible` - مرئي / Visible

### Field Types (أنواع الحقول)
- `fieldTypes.title` - إدارة أنواع الحقول / Field Types Management
- `fieldTypes.newFieldType` - نوع حقل جديد / New Field Type
- `fieldTypes.addFieldType` - إضافة نوع حقل / Add Field Type
- `fieldTypes.editFieldType` - تعديل نوع الحقل / Edit Field Type
- `fieldTypes.fieldTypesList` - قائمة أنواع الحقول / Field Types List
- `fieldTypes.typeName` - اسم النوع / Type Name
- `fieldTypes.dataType` - نوع البيانات / Data Type
- `fieldTypes.description` - الوصف / Description
- `fieldTypes.maxLength` - الحد الأقصى للطول / Max Length
- `fieldTypes.hasOptions` - يحتوي على خيارات / Has Options
- `fieldTypes.allowMultiple` - السماح بالاختيار المتعدد / Allow Multiple Selection

### Field Options (خيارات الحقول)
- `fieldOptions.title` - إدارة خيارات الحقول / Field Options Management
- `fieldOptions.addNewOption` - إضافة خيار جديد / Add New Option
- `fieldOptions.editFieldOption` - تعديل خيار الحقل / Edit Field Option
- `fieldOptions.fieldOptionsList` - قائمة خيارات الحقول / Field Options List
- `fieldOptions.order` - الترتيب / Order
- `fieldOptions.optionValue` - قيمة الخيار / Option Value
- `fieldOptions.optionText` - نص الخيار / Option Text
- `fieldOptions.fieldId` - معرف الحقل / Field ID

### Messages (الرسائل)
- `messages.formCreated` - تم إنشاء النموذج بنجاح / Form created successfully
- `messages.formUpdated` - تم تحديث النموذج بنجاح / Form updated successfully
- `messages.formDeleted` - تم حذف النموذج بنجاح / Form deleted successfully
- `messages.tabCreated` - تم إنشاء التبويب بنجاح / Tab created successfully
- `messages.tabUpdated` - تم تحديث التبويب بنجاح / Tab updated successfully
- `messages.tabDeleted` - تم حذف التبويب بنجاح / Tab deleted successfully
- `messages.fieldCreated` - تم إنشاء الحقل بنجاح / Field created successfully
- `messages.fieldUpdated` - تم تحديث الحقل بنجاح / Field updated successfully
- `messages.fieldDeleted` - تم حذف الحقل بنجاح / Field deleted successfully
- `messages.errorOccurred` - حدث خطأ / An error occurred
- `messages.validationFailed` - يرجى ملء جميع الحقول المطلوبة بشكل صحيح / Please fill all required fields correctly
- `messages.confirmDelete` - هل أنت متأكد من حذف هذا العنصر؟ / Are you sure you want to delete this item?
- `messages.linkCopied` - تم نسخ الرابط إلى الحافظة / Link copied to clipboard

---

## كيفية تغيير اللغة

### برمجياً (في Component)
```typescript
constructor(private translationService: TranslationService) {}

changeLanguage(lang: 'ar' | 'en'): void {
  this.translationService.setLanguage(lang);
}
```

### في Template (زر تغيير اللغة)
```html
<button (click)="translationService.setLanguage('ar')">العربية</button>
<button (click)="translationService.setLanguage('en')">English</button>
```

---

## ملاحظات مهمة

1. **اللغة الافتراضية**: الإنجليزية (en)
2. **حفظ اللغة**: يتم حفظ اللغة المختارة في `localStorage` تحت مفتاح `language`
3. **تحميل الترجمة**: يتم تحميل ملفات الترجمة تلقائياً عند تغيير اللغة
4. **Fallback**: إذا لم يتم العثور على مفتاح الترجمة، يتم إرجاع المفتاح نفسه

---

## الخطوات التالية

1. ✅ إعداد نظام الترجمة
2. ✅ ترجمة Forms List Component
3. ⏳ ترجمة باقي Components:
   - Tabs List Component
   - Fields List Component
   - Field Types List Component
   - Field Options List Component
   - Login Component
   - Dashboard Component

---

## الخلاصة

تم إعداد نظام ترجمة كامل لمشروع Angular Form Builder يدعم:
- ✅ اللغة العربية والإنجليزية
- ✅ خدمة ترجمة قوية مع دعم المعاملات
- ✅ Pipe للترجمة في Templates
- ✅ حفظ اللغة المختارة
- ✅ ترجمة Forms List Component بالكامل

جميع النصوص في Form Builder الآن قابلة للترجمة! 🌍
