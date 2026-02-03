# Copy To Document Component

## نظرة عامة

Component كامل مع UI لاستخدام CopyToDocument Service. يتضمن:
- ✅ Form كامل مع جميع الحقول
- ✅ Buttons للتنفيذ والعمليات
- ✅ Field Mappings (ديناميكي)
- ✅ Grid Mappings (ديناميكي)
- ✅ Metadata Fields (ديناميكي)
- ✅ Audit Records Dialog
- ✅ Result Display

## الاستخدام

### 1. إضافة الـ Component في Route

```typescript
import { CopyToDocumentComponent } from './components/copy-to-document/copy-to-document.component';

const routes: Routes = [
  {
    path: 'copy-to-document',
    component: CopyToDocumentComponent
  }
];
```

### 2. استخدام في Template

```html
<app-copy-to-document></app-copy-to-document>
```

## الميزات

### ✅ Form Fields
- Source Submission ID (مطلوب)
- Target Document Type (مطلوب)
- Target Form (مطلوب)
- Options (Checkboxes):
  - Create New Document
  - Copy Calculated Fields
  - Copy Grid Rows
  - Start Workflow
  - Link Documents
  - Copy Metadata

### ✅ Dynamic Mappings
- **Field Mappings**: إضافة/حذف field mappings ديناميكياً
- **Grid Mappings**: إضافة/حذف grid mappings ديناميكياً
- **Metadata Fields**: إضافة/حذف metadata fields ديناميكياً

### ✅ Buttons
1. **Execute Copy** - تنفيذ عملية النسخ
2. **View Audit Records** - عرض جميع Audit Records
3. **Load Audit by Submission** - جلب Audit Records لـ Submission محدد
4. **Reset** - إعادة تعيين الـ Form

### ✅ Result Display
- عرض النتيجة بعد التنفيذ
- Success/Error Messages
- عرض Target Document ID و Number
- عرض عدد الحقول والصفوف المنسوخة

### ✅ Audit Records Dialog
- جدول Audit Records مع Pagination
- عرض جميع التفاصيل
- Filtering و Search

## الملفات

- `copy-to-document.component.ts` - Component Logic
- `copy-to-document.component.html` - Template
- `copy-to-document.component.scss` - Styles

## Dependencies

- `CopyToDocumentService`
- `DocumentTypesService`
- `FormsService`
- `MessageService` (PrimeNG)

## PrimeNG Modules المستخدمة

- ButtonModule
- InputTextModule
- CheckboxModule
- ToastModule
- CardModule
- PanelModule
- TableModule
- DialogModule
- TooltipModule

## مثال الاستخدام

```typescript
// في app.routes.ts
{
  path: 'copy-to-document',
  component: CopyToDocumentComponent
}

// في Template
<app-copy-to-document></app-copy-to-document>
```

## Screenshots

### Form View
- Form كامل مع جميع الحقول
- Dynamic Mappings Sections
- Action Buttons

### Result View
- Success/Error Messages
- Result Details

### Audit Dialog
- Audit Records Table
- Pagination
- Filtering

---

**آخر تحديث:** 2024-02-03

