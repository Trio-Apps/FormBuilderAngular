# Grid Support (Line Items Grid) - Implementation Tasks

## نظرة عامة
Grid هو نوع من أنواع الحقول (FieldType = Grid) يمثل مجموعة قابلة للتكرار من الحقول داخل الفورم. كل صف يعامل كسجل فرعي مرتبط بالفورم الرئيسي.

## المهام المطلوبة (Tasks)

### ✅ **Task 1: Backend - Grid Schema Management** (مكتمل جزئياً)
**الوصف:** إدارة تعريفات الجداول (Grid Schema) والأعمدة (Columns)

**المهام الفرعية:**
- ✅ Create Grid CRUD APIs (FormGrids controller)
- ✅ Create Grid Columns CRUD APIs (FormGridColumns controller)
- ✅ Store grid schema (columns, data types, validation rules)
- ✅ Support required/optional columns
- ✅ Grid-column relationship management

**الحالة:** ✅ موجود في GridService و Grid DTOs

---

### ✅ **Task 2: Frontend - Grid Management UI** (مكتمل)
**الوصف:** واجهة إدارة الجداول في Form Builder

**المهام الفرعية:**
- ✅ Create grids-list component
- ✅ Add route: `form-builder/grids/:formId`
- ✅ Add "Manage Grids" button in tabs-list
- ✅ Grid CRUD operations (Create, Read, Update, Delete)
- ✅ Grid columns management (can be added later)

**الحالة:** ✅ تم إنجازه

---

### ⚠️ **Task 3: Frontend - Grid Field Type Integration** (يحتاج تحسين)
**الوصف:** دمج Grid كـ Field Type في Fields Management

**المهام الفرعية:**
- ✅ Grid field type exists in environment.ts
- ⚠️ When creating a field with Grid type, link it to a Grid
- ⚠️ Store gridId in field.defaultValueJson when Grid type is selected
- ⚠️ Show grid selection dropdown when Grid type is selected
- ⚠️ Validate grid selection (must select a grid)

**الحالة:** ⚠️ يحتاج تحسين في fields-list component

**الكود المطلوب:**
```typescript
// في fields-list.component.ts
onFieldTypeChange(fieldTypeId: number | string): void {
  // ... existing code ...
  
  // إذا كان النوع Grid، نحتاج لتحميل الجداول المتاحة
  if (this.isGridFieldType(fieldTypeId)) {
    this.loadAvailableGrids();
  }
}

isGridFieldType(fieldTypeId: number | string): boolean {
  const type = this.fieldTypes.find(t => t.id === Number(fieldTypeId));
  return type?.typeName?.toLowerCase() === 'grid';
}
```

---

### ✅ **Task 4: Frontend - Grid Renderer in Public Form** (مكتمل)
**الوصف:** عرض Grid في Public Form View

**المهام الفرعية:**
- ✅ GridViewComponent exists
- ✅ Grid rendering in form-view.component.html
- ✅ Grid data loading
- ✅ Add/Remove row controls
- ✅ Inline validation per column

**الحالة:** ✅ موجود

---

### ⚠️ **Task 5: Frontend - Grid Data Submission** (يحتاج تحسين)
**الوصف:** حفظ بيانات Grid عند إرسال الفورم

**المهام الفرعية:**
- ✅ GridService.bulkSaveGridData exists
- ⚠️ Integrate grid data saving in form submission
- ⚠️ Handle grid data in form submission payload
- ⚠️ Save grid rows and cells when form is submitted
- ⚠️ Support draft saving for grid data

**الحالة:** ⚠️ يحتاج ربط مع form submission

**الكود المطلوب:**
```typescript
// في form-view.component.ts
submitForm(): void {
  // ... existing form submission code ...
  
  // Save grid data for each grid field
  this.tabs.forEach(tab => {
    tab.fields?.forEach(field => {
      if (this.getFieldType(field) === 'grid') {
        this.saveGridDataForField(field);
      }
    });
  });
}
```

---

### ⚠️ **Task 6: Frontend - Grid Columns Management** (مطلوب)
**الوصف:** إدارة أعمدة Grid (Grid Columns)

**المهام الفرعية:**
- ⚠️ Create grid-columns-list component
- ⚠️ Add route: `form-builder/grids/:formId/columns/:gridId`
- ⚠️ Column CRUD operations
- ⚠️ Column data type selection
- ⚠️ Column validation rules
- ⚠️ Column options (for select/radio types)
- ⚠️ Column ordering (drag & drop)

**الحالة:** ⚠️ غير موجود - يحتاج إنشاء

**الملفات المطلوبة:**
- `src/app/views/grids/grid-columns-list/grid-columns-list.component.ts`
- `src/app/views/grids/grid-columns-list/grid-columns-list.component.html`
- `src/app/views/grids/grid-columns-list/grid-columns-list.component.scss`

---

### ⚠️ **Task 7: Frontend - Grid Field Configuration** (مطلوب)
**الوصف:** تكوين Grid Field عند إنشائه

**المهام الفرعية:**
- ⚠️ Show grid selection when Grid type is selected
- ⚠️ Store gridId in field.defaultValueJson
- ⚠️ Validate that grid exists and belongs to same form
- ⚠️ Show grid preview in field settings

**الحالة:** ⚠️ غير موجود - يحتاج إضافة في fields-list component

---

### ✅ **Task 8: Backend - Grid Data Persistence** (مكتمل)
**الوصف:** حفظ بيانات Grid لكل submission

**المهام الفرعية:**
- ✅ FormSubmissionGridRows APIs
- ✅ FormSubmissionGridCells APIs
- ✅ Bulk save grid data
- ✅ Retrieve grid data by submission

**الحالة:** ✅ موجود في GridService

---

### ⚠️ **Task 9: Frontend - Grid Validation** (يحتاج تحسين)
**الوصف:** التحقق من صحة بيانات Grid

**المهام الفرعية:**
- ⚠️ Required column validation
- ⚠️ Data type validation (number, email, date, etc.)
- ⚠️ Custom validation rules
- ⚠️ Show validation errors inline
- ⚠️ Prevent form submission if grid validation fails

**الحالة:** ⚠️ يحتاج تحسين في GridViewComponent

---

### ⚠️ **Task 10: Frontend - Grid UX Enhancements** (اختياري)
**الوصف:** تحسينات تجربة المستخدم

**المهام الفرعية:**
- ⚠️ Drag & drop row reordering
- ⚠️ Copy/duplicate row
- ⚠️ Bulk row operations
- ⚠️ Grid data export (CSV, Excel)
- ⚠️ Grid data import
- ⚠️ Row numbering
- ⚠️ Column sorting
- ⚠️ Column filtering

**الحالة:** ⚠️ اختياري - يمكن إضافته لاحقاً

---

## ملخص الأولويات

### 🔴 **عالي الأولوية (يجب إنجازه الآن):**
1. **Task 3:** Grid Field Type Integration في fields-list
2. **Task 6:** Grid Columns Management UI
3. **Task 7:** Grid Field Configuration

### 🟡 **متوسط الأولوية (يجب إنجازه قريباً):**
4. **Task 5:** Grid Data Submission Integration
5. **Task 9:** Grid Validation

### 🟢 **منخفض الأولوية (يمكن تأجيله):**
6. **Task 10:** UX Enhancements

---

## الخطوات التالية

1. **إضافة Grid Selection في Fields List:**
   - عند اختيار Grid type، عرض قائمة الجداول المتاحة
   - حفظ gridId في defaultValueJson

2. **إنشاء Grid Columns Management:**
   - إنشاء grid-columns-list component
   - إضافة route و navigation

3. **ربط Grid Data مع Form Submission:**
   - حفظ بيانات Grid عند إرسال الفورم
   - دعم draft saving

4. **تحسين Validation:**
   - إضافة validation للـ required columns
   - عرض errors inline


