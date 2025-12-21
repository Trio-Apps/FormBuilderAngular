# شرح المهام المطلوبة لـ Grid Support (Line Items Grid)

## 🎯 **الفكرة الأساسية:**

**Grid** = جدول بيانات داخل الفورم (مثل Excel)
- مثال: في فاتورة، Grid يحتوي على:
  - صف 1: منتج "لابتوب" - الكمية: 2 - السعر: 5000
  - صف 2: منتج "ماوس" - الكمية: 5 - السعر: 100
  - صف 3: منتج "كيبورد" - الكمية: 3 - السعر: 200

**كل صف = سجل فرعي** مرتبط بالفورم الرئيسي

---

## 📋 **المهام المطلوبة (مبسطة):**

### ✅ **Task 1: Backend - Grid Schema Management** (مكتمل ✅)
**المعنى:** APIs لحفظ وإدارة الجداول في قاعدة البيانات

**مثال:**
- API: `POST /FormGrids` → إنشاء جدول جديد
- API: `GET /FormGrids/by-tab/5` → جلب جميع الجداول للتبويب رقم 5
- API: `PUT /FormGrids/1` → تحديث جدول رقم 1

**الحالة:** ✅ موجود في GridService

---

### ✅ **Task 2: Frontend - Grid Management UI** (مكتمل ✅)
**المعنى:** صفحة لإدارة الجداول (إنشاء، تعديل، حذف)

**مثال:**
- صفحة: `/form-builder/grids/5` (5 = Tab ID)
- زر "New Grid" → فتح نافذة لإنشاء جدول جديد
- قائمة بجميع الجداول الموجودة

**الحالة:** ✅ موجود (grids-list component)

---

### ⚠️ **Task 3: Grid Field Type Integration** (يحتاج عمل ⚠️)
**المعنى:** عند إنشاء Field من نوع "Grid"، يجب ربطه بجدول موجود

**المشكلة الحالية:**
- عند إنشاء Field جديد واختيار نوع "Grid"
- لا يوجد مكان لاختيار أي Grid نريد استخدامه
- لا يتم حفظ Grid ID في Field

**المطلوب:**
1. عند اختيار Field Type = "Grid"
2. يظهر dropdown يحتوي على قائمة الجداول المتاحة لهذا Tab
3. المستخدم يختار Grid
4. يتم حفظ Grid ID في `field.defaultValueJson`

**مثال الكود المطلوب:**
```typescript
// في fields-list.component.html
<div *ngIf="isGridFieldType()" class="form-group">
  <label>اختر Grid:</label>
  <select [(ngModel)]="selectedGridId">
    <option *ngFor="let grid of availableGrids" [value]="grid.id">
      {{ grid.gridName }}
    </option>
  </select>
</div>
```

---

### ✅ **Task 4: Grid Renderer in Public Form** (مكتمل ✅)
**المعنى:** عرض Grid في صفحة الفورم العامة (للزوار)

**مثال:**
- المستخدم يفتح الفورم
- يرى Grid (جدول)
- يمكنه إضافة صفوف، تعديل، حذف

**الحالة:** ✅ موجود (GridViewComponent)

---

### ⚠️ **Task 5: Grid Data Submission** (يحتاج عمل ⚠️)
**المعنى:** عند إرسال الفورم، يجب حفظ بيانات Grid

**المشكلة الحالية:**
- المستخدم يملأ Grid ويضغط "Submit"
- بيانات Grid لا تُحفظ في قاعدة البيانات

**المطلوب:**
1. عند إرسال الفورم
2. حفظ بيانات Grid (الصفوف والخلايا)
3. ربطها بـ Submission ID

**مثال الكود المطلوب:**
```typescript
// في form-view.component.ts
submitForm(): void {
  // حفظ بيانات الفورم العادية
  this.saveFormSubmission().then(submissionId => {
    // حفظ بيانات Grid
    this.tabs.forEach(tab => {
      tab.fields?.forEach(field => {
        if (this.getFieldType(field) === 'grid') {
          this.saveGridData(field, submissionId);
        }
      });
    });
  });
}
```

---

### ⚠️ **Task 6: Grid Columns Management** (مطلوب ⚠️)
**المعنى:** صفحة لإدارة أعمدة Grid (Columns)

**مثال:**
- Grid "Invoice Items" يحتوي على أعمدة:
  - Column 1: "Product Name" (نص)
  - Column 2: "Quantity" (رقم)
  - Column 3: "Price" (رقم)
  - Column 4: "Total" (رقم محسوب)

**المطلوب:**
- صفحة: `/form-builder/grids/5/columns/1` (5 = Tab ID, 1 = Grid ID)
- إضافة/تعديل/حذف أعمدة
- تحديد نوع البيانات لكل عمود (نص، رقم، تاريخ، إلخ)
- تحديد إذا كان العمود إجباري أم لا

**الملفات المطلوبة:**
- `grid-columns-list.component.ts`
- `grid-columns-list.component.html`
- `grid-columns-list.component.scss`

---

### ⚠️ **Task 7: Grid Field Configuration** (مطلوب ⚠️)
**المعنى:** تكوين Field من نوع Grid عند إنشائه

**المطلوب:**
1. عند إنشاء Field جديد
2. اختيار نوع "Grid"
3. اختيار Grid من القائمة
4. التحقق من أن Grid موجود وينتمي لنفس Tab
5. حفظ Grid ID

**هذا مرتبط بـ Task 3**

---

### ✅ **Task 8: Backend - Grid Data Persistence** (مكتمل ✅)
**المعنى:** APIs لحفظ بيانات Grid في قاعدة البيانات

**مثال:**
- API: `POST /FormSubmissionGridRows` → حفظ صف جديد
- API: `POST /FormSubmissionGridCells` → حفظ خلية
- API: `POST /FormSubmissionGridRows/bulk` → حفظ عدة صفوف مرة واحدة

**الحالة:** ✅ موجود في GridService

---

### ⚠️ **Task 9: Grid Validation** (يحتاج تحسين ⚠️)
**المعنى:** التحقق من صحة البيانات في Grid

**مثال:**
- عمود "Quantity" مطلوب → إذا كان فارغ، يظهر خطأ
- عمود "Price" يجب أن يكون رقم → إذا كان نص، يظهر خطأ
- منع إرسال الفورم إذا كان Grid غير صحيح

**المطلوب:**
- التحقق من Required columns
- التحقق من نوع البيانات
- عرض الأخطاء تحت كل خلية

---

### ⚠️ **Task 10: UX Enhancements** (اختياري ⚠️)
**المعنى:** تحسينات إضافية (ليست ضرورية الآن)

**مثال:**
- سحب وإفلات لإعادة ترتيب الصفوف
- نسخ صف
- تصدير Grid إلى Excel
- ترقيم الصفوف تلقائياً

**الحالة:** ⚠️ اختياري - يمكن إضافته لاحقاً

---

## 🎯 **ملخص بسيط:**

### ✅ **ما تم إنجازه:**
1. APIs للجداول موجودة ✅
2. صفحة إدارة الجداول موجودة ✅
3. عرض Grid في الفورم موجود ✅

### ⚠️ **ما يحتاج عمل (عالي الأولوية):**

**1. ربط Grid مع Field:**
- عند إنشاء Field من نوع Grid
- يجب اختيار Grid من قائمة
- حفظ Grid ID

**2. إدارة أعمدة Grid:**
- صفحة لإضافة/تعديل/حذف أعمدة
- تحديد نوع كل عمود

**3. حفظ بيانات Grid:**
- عند إرسال الفورم
- حفظ بيانات Grid في قاعدة البيانات

**4. التحقق من البيانات:**
- التحقق من Required columns
- عرض الأخطاء

---

## 📝 **مثال عملي:**

**سيناريو: فاتورة**

1. **إنشاء Grid:**
   - اسم: "Invoice Items"
   - Code: "INVOICE_ITEMS"

2. **إضافة أعمدة:**
   - "Product Name" (نص، إجباري)
   - "Quantity" (رقم، إجباري)
   - "Price" (رقم، إجباري)
   - "Total" (رقم محسوب = Quantity × Price)

3. **إنشاء Field:**
   - نوع: Grid
   - اختيار Grid: "Invoice Items"
   - حفظ

4. **في الفورم:**
   - المستخدم يرى Grid
   - يضيف صفوف (منتجات)
   - يملأ البيانات
   - يرسل الفورم

5. **الحفظ:**
   - بيانات الفورم تُحفظ
   - بيانات Grid (الصفوف) تُحفظ
   - كل صف مرتبط بـ Submission

---

## ❓ **أسئلة شائعة:**

**س: Grid مختلف عن Table العادي؟**
ج: نعم، Grid هو جزء من الفورم وبياناته مربوطة بـ Submission. Table عادي فقط للعرض.

**س: كم صف يمكن إضافته؟**
ج: غير محدود (Unlimited rows)

**س: هل يمكن حذف Grid بعد إنشائه؟**
ج: نعم، لكن يجب التأكد من عدم وجود Fields تستخدمه

**س: هل Grid يعمل في Draft (مسودة)؟**
ج: يجب أن يعمل - يمكن حفظ Grid كمسودة قبل الإرسال النهائي


