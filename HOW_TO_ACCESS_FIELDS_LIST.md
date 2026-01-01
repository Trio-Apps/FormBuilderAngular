# كيفية الوصول إلى صفحة Fields List

## المسار الكامل
```
/form-builder/fields/{tabId}
```

## خطوات الوصول

### الطريقة 1: من القائمة الجانبية
1. افتح التطبيق
2. اذهب إلى **Form Builder** من القائمة الجانبية
3. اضغط على **Forms**
4. اختر Form من القائمة
5. اختر Tab من القائمة
6. اضغط على **Fields** أو **Manage Fields**

### الطريقة 2: مباشرة عبر الرابط
افتح المتصفح واكتب في الـ URL:
```
http://localhost:4200/form-builder/fields/1
```
(استبدل `1` بـ `tabId` الخاص بك)

### الطريقة 3: من صفحة Tabs
1. اذهب إلى `/form-builder/tabs/{formId}`
2. اضغط على زر **Fields** بجانب أي Tab

## كيف تعرف أنك في الصفحة الصحيحة؟

### ✅ صفحة Fields List (الصفحة الصحيحة)
- العنوان: **"Fields Management"**
- يوجد زر **"New Field"** في الأعلى
- يوجد جدول يعرض جميع الحقول مع أعمدة:
  - #
  - Field Name
  - Code
  - Type
  - Options
  - Flags
  - Status
  - Actions (Edit, Delete)
- يوجد زر **Edit** بجانب كل حقل

### ❌ صفحة Form View (الصفحة الخاطئة)
- العنوان: **"Form View"** أو اسم النموذج
- يوجد نموذج يمكن ملؤه
- يوجد زر **Submit** في الأسفل
- لا يوجد جدول للحقول

## بعد الوصول إلى الصفحة الصحيحة

1. افتح **Developer Console** (اضغط `F12`)
2. اذهب إلى **Console** tab
3. اضغط **Edit** على أي حقل من نوع **Calculated**
4. راقب الـ console logs

## الـ Console Logs المتوقعة

عند فتح حقل Calculated للتعديل، يجب أن ترى:

```
[openEditFieldModal] Field data: {...}
[openEditFieldModal] Calculation properties: {...}
[openEditFieldModal] Form values after patch: {...}
```

إذا لم ترى هذه الـ logs، فأنت لست في الصفحة الصحيحة!

## ملاحظة مهمة

- **Form View** (`/forms/view/:formCode`) = لعرض النموذج للمستخدمين
- **Fields List** (`/form-builder/fields/:tabId`) = لتحرير الحقول

نحتاج logs من **Fields List** وليس **Form View**!


