# Grid Support - Frontend Implementation Tasks

## ✅ Backend Status: 100% Complete

جميع APIs والـ Backend جاهز ومكتمل. نحتاج فقط تنفيذ Frontend.

---

## 🎯 المهام المطلوبة في Frontend

### ⚠️ **Task 1: Grid Field Type Integration في Fields List** (عالي الأولوية)
**الوصف:** عند إنشاء Field من نوع Grid، يجب اختيار Grid وربطه

**المطلوب:**
1. في `fields-list.component.ts`:
   - إضافة method `isGridFieldType()` للتحقق من نوع Grid
   - إضافة property `availableGrids: FormGridDto[]`
   - إضافة method `loadAvailableGrids()` لتحميل الجداول المتاحة للـ Tab الحالي
   - عند تغيير Field Type إلى Grid، تحميل الجداول تلقائياً

2. في `fields-list.component.html`:
   - إضافة dropdown لاختيار Grid (يظهر فقط عند اختيار Grid type)
   - عرض قائمة الجداول المتاحة
   - حفظ GridId في form

3. في `saveField()`:
   - عند إنشاء/تحديث Field من نوع Grid
   - التحقق من وجود GridId
   - حفظ GridId في `CreateFormFieldDto` أو `UpdateFormFieldDto`

**الكود المطلوب:**
```typescript
// في fields-list.component.ts
availableGrids: FormGridDto[] = [];
selectedGridId: number | null = null;

isGridFieldType(fieldTypeId?: number | string): boolean {
  if (!fieldTypeId) return false;
  const type = this.fieldTypes.find(t => t.id === Number(fieldTypeId));
  return type?.typeName?.toLowerCase() === 'grid';
}

loadAvailableGrids(): void {
  if (!this.tabId) return;
  
  this.gridService.getGridsByTabId(this.tabId).subscribe({
    next: (response) => {
      this.availableGrids = response.data || [];
    },
    error: () => {
      this.availableGrids = [];
    }
  });
}

onFieldTypeChange(fieldTypeId: number | string): void {
  // ... existing code ...
  
  if (this.isGridFieldType(fieldTypeId)) {
    this.loadAvailableGrids();
  } else {
    this.selectedGridId = null;
    this.availableGrids = [];
  }
}
```

```html
<!-- في fields-list.component.html -->
<div class="form-group" *ngIf="isGridFieldType(fieldForm.get('fieldTypeId')?.value)">
  <label class="form-label">اختر Grid <span class="text-danger">*</span></label>
  <select 
    class="form-control" 
    [(ngModel)]="selectedGridId"
    [ngModelOptions]="{standalone: true}"
    required>
    <option value="">-- اختر Grid --</option>
    <option *ngFor="let grid of availableGrids" [value]="grid.id">
      {{ grid.gridName }}
    </option>
  </select>
</div>
```

---

### ⚠️ **Task 2: Grid Columns Management UI** (عالي الأولوية)
**الوصف:** صفحة لإدارة أعمدة Grid

**المطلوب:**
1. إنشاء component جديد:
   - `src/app/views/grids/grid-columns-list/grid-columns-list.component.ts`
   - `src/app/views/grids/grid-columns-list/grid-columns-list.component.html`
   - `src/app/views/grids/grid-columns-list/grid-columns-list.component.scss`

2. إضافة Route:
   ```typescript
   // في app.routes.ts
   {
     path: 'grids/:tabId/columns/:gridId',
     loadComponent: () => import('./views/grids/grid-columns-list/grid-columns-list.component')
       .then(m => m.GridColumnsListComponent)
   }
   ```

3. Features المطلوبة:
   - عرض قائمة الأعمدة
   - إضافة عمود جديد
   - تعديل عمود
   - حذف عمود
   - تحديد نوع البيانات (text, number, date, email, select, etc.)
   - تحديد إذا كان العمود إجباري
   - ترتيب الأعمدة (drag & drop أو up/down buttons)
   - Column options (للأنواع select/radio)

4. إضافة زر في `grids-list.component.html`:
   ```html
   <button class="action-btn action-duplicate" 
           (click)="navigateToGridColumns(grid.id)" 
           [title]="'Manage Columns'">
     <i class="pi pi-list"></i>
   </button>
   ```

**الملفات المطلوبة:**
- استخدام `GridService.getColumnsByGrid()` للحصول على الأعمدة
- استخدام `GridService.createColumn()`, `updateColumn()`, `deleteColumn()`

---

### ⚠️ **Task 3: Grid Data Submission Integration** (متوسط الأولوية)
**الوصف:** ربط حفظ بيانات Grid مع Form Submission

**المطلوب:**
1. في `form-view.component.ts`:
   - إضافة method `saveGridDataForField()`
   - عند إرسال الفورم، حفظ بيانات Grid لكل Grid field
   - استخدام `GridService.bulkSaveGridData()`

2. في `grid-view.component.ts`:
   - التأكد من أن `saveGridData()` يعمل بشكل صحيح
   - ربط `submissionId` مع Grid data

**الكود المطلوب:**
```typescript
// في form-view.component.ts
saveGridDataForField(field: FormFieldDto): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!field.gridId || !this.submissionId) {
      resolve();
      return;
    }

    const gridViewComponent = this.gridViewComponents[field.id];
    if (!gridViewComponent) {
      resolve();
      return;
    }

    gridViewComponent.saveGridData().subscribe({
      next: () => resolve(),
      error: (err) => reject(err)
    });
  });
}

async submitForm(): Promise<void> {
  // ... existing form submission code ...
  
  // Save grid data
  const gridSavePromises: Promise<void>[] = [];
  this.tabs.forEach(tab => {
    tab.fields?.forEach(field => {
      if (this.getFieldType(field) === 'grid' && field.gridId) {
        gridSavePromises.push(this.saveGridDataForField(field));
      }
    });
  });

  try {
    await Promise.all(gridSavePromises);
    // Continue with form submission
  } catch (error) {
    // Handle error
  }
}
```

---

### ⚠️ **Task 4: Grid Validation في Frontend** (متوسط الأولوية)
**الوصف:** التحقق من صحة بيانات Grid قبل الإرسال

**المطلوب:**
1. في `grid-view.component.ts`:
   - إضافة method `validateGridData()`
   - استخدام `GridService.validateGridData()`
   - عرض الأخطاء تحت كل خلية

2. في `grid-view.component.html`:
   - إضافة `div` لعرض الأخطاء تحت كل input
   - إضافة class `has-error` عند وجود خطأ

**الكود المطلوب:**
```typescript
// في grid-view.component.ts
validationErrors: { [rowIndex: number]: { [columnId: number]: string } } = {};

validateGridData(): Observable<GridValidationResultDto> {
  if (!this.grid || !this.grid.id || !this.submissionId) {
    return of({ isValid: true, errors: [], warnings: [] });
  }

  const bulkData: BulkSaveGridDataDto = {
    submissionId: this.submissionId,
    gridId: this.grid.id,
    rows: this.rows.map((row) => ({
      rowIndex: row.rowIndex,
      isActive: row.isActive,
      cells: this.columns.map((col) => ({
        columnId: col.id,
        cellValue: this.getCellValue(row.rowIndex, col.id)
      }))
    }))
  };

  return this.gridService.validateGridData(this.submissionId, this.grid.id, bulkData);
}

hasError(rowIndex: number, columnId: number): boolean {
  return !!this.validationErrors[rowIndex]?.[columnId];
}

getError(rowIndex: number, columnId: number): string {
  return this.validationErrors[rowIndex]?.[columnId] || '';
}
```

```html
<!-- في grid-view.component.html -->
<td *ngFor="let column of columns" class="col-data" [class.has-error]="hasError(row.rowIndex, column.id)">
  <input
    type="text"
    class="grid-input"
    [value]="getCellValue(row.rowIndex, column.id)"
    (input)="setCellValue(row.rowIndex, column.id, $any($event.target).value)"
  />
  <div class="error-message" *ngIf="hasError(row.rowIndex, column.id)">
    {{ getError(row.rowIndex, column.id) }}
  </div>
</td>
```

---

### ⚠️ **Task 5: Grid Field Configuration في Field Settings** (منخفض الأولوية)
**الوصف:** عرض معلومات Grid في Field Settings Modal

**المطلوب:**
1. في `fields-list.component.ts`:
   - عند فتح Field Settings لـ Grid field
   - عرض معلومات Grid (اسم، عدد الأعمدة)
   - إمكانية تغيير Grid

2. في `fields-list.component.html`:
   - إضافة section لعرض Grid info
   - زر للانتقال إلى Grid Columns Management

---

### ⚠️ **Task 6: Grid Loading في Form View** (منخفض الأولوية)
**الوصف:** تحميل بيانات Grid عند فتح الفورم

**المطلوب:**
1. في `form-view.component.ts`:
   - عند تحميل الفورم، تحميل بيانات Grid إذا كان submissionId موجود
   - استخدام `GridService.getCompleteGridData()`

2. في `grid-view.component.ts`:
   - تحسين `loadGridData()` لاستخدام complete endpoint
   - تحميل الصفوف والخلايا معاً

---

## 📋 ملخص الأولويات

### 🔴 **عالي الأولوية (يجب إنجازه الآن):**
1. **Task 1:** Grid Field Type Integration - ربط Grid مع Field
2. **Task 2:** Grid Columns Management - إدارة أعمدة Grid

### 🟡 **متوسط الأولوية (يجب إنجازه قريباً):**
3. **Task 3:** Grid Data Submission - حفظ بيانات Grid
4. **Task 4:** Grid Validation - التحقق من البيانات

### 🟢 **منخفض الأولوية (يمكن تأجيله):**
5. **Task 5:** Grid Field Configuration
6. **Task 6:** Grid Loading Optimization

---

## 🚀 الخطوات التالية

### الخطوة 1: Grid Field Type Integration
1. فتح `fields-list.component.ts`
2. إضافة `availableGrids` و `selectedGridId`
3. إضافة `loadAvailableGrids()` و `isGridFieldType()`
4. تعديل `onFieldTypeChange()` و `saveField()`
5. إضافة dropdown في HTML

### الخطوة 2: Grid Columns Management
1. إنشاء `grid-columns-list` component
2. إضافة route
3. إضافة زر في grids-list
4. تنفيذ CRUD operations

### الخطوة 3: Grid Data Submission
1. تعديل `form-view.component.ts`
2. إضافة `saveGridDataForField()`
3. ربط مع form submission

---

## 📝 ملاحظات

1. **Backend جاهز:** جميع APIs موجودة ويمكن استخدامها مباشرة
2. **GridId في Field:** Backend يدعم `GridId` في Field entity
3. **Validation:** Backend يوفر validation endpoint جاهز
4. **Bulk Operations:** Backend يدعم bulk save للـ Grid data

---

## ✅ Checklist

- [ ] Task 1: Grid Field Type Integration
- [ ] Task 2: Grid Columns Management UI
- [ ] Task 3: Grid Data Submission Integration
- [ ] Task 4: Grid Validation في Frontend
- [ ] Task 5: Grid Field Configuration
- [ ] Task 6: Grid Loading Optimization

