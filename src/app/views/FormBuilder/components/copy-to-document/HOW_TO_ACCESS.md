# كيفية الوصول إلى Copy To Document Component

## الطرق المتاحة

### 1. من خلال URL مباشرة

افتح المتصفح واكتب:
```
http://localhost:4200/form-builder/copy-to-document
```

أو في Production:
```
https://your-domain.com/form-builder/copy-to-document
```

---

### 2. من خلال Navigation Menu (Sidebar)

1. سجل الدخول إلى النظام
2. من القائمة الجانبية (Sidebar)، ابحث عن **"Form Builder"**
3. انقر على **"Form Builder"** لتوسيع القائمة
4. انقر على **"Copy To Document"**

**الموقع في القائمة:**
```
Form Builder
  ├── Forms
  ├── Stored Procedures
  └── Copy To Document  ← هنا
```

---

### 3. من خلال Router في Code

```typescript
import { Router } from '@angular/router';

constructor(private router: Router) {}

navigateToCopyToDocument() {
  this.router.navigate(['/form-builder/copy-to-document']);
}
```

---

### 4. من خلال Link في Template

```html
<a routerLink="/form-builder/copy-to-document">Copy To Document</a>
```

أو:

```html
<button (click)="router.navigate(['/form-builder/copy-to-document'])">
  Copy To Document
</button>
```

---

## المتطلبات

### Permissions
- يجب أن يكون لديك صلاحية `FormBuilder_Allow_View`
- يجب أن تكون مسجل دخول (Authenticated)
- يجب أن تكون Admin (لأن Form Builder محمي بـ adminGuard)

### Route Configuration
الـ Route موجود في `app.routes.ts`:
```typescript
{
  path: 'copy-to-document',
  loadComponent: () => import('./views/FormBuilder/components/copy-to-document/copy-to-document.component')
    .then(m => m.CopyToDocumentComponent)
}
```

---

## الخطوات السريعة

1. ✅ تأكد من تسجيل الدخول
2. ✅ تأكد من أنك Admin
3. ✅ اذهب إلى `/form-builder/copy-to-document`
4. ✅ أو استخدم القائمة الجانبية

---

## Troubleshooting

### المشكلة: الصفحة لا تظهر
**الحل:** تأكد من:
- أنك مسجل دخول
- أنك Admin
- أن الـ Route موجود في `app.routes.ts`

### المشكلة: القائمة الجانبية لا تظهر
**الحل:** تأكد من:
- أن الـ Navigation Item موجود في `_nav.ts`
- أن لديك الصلاحية المطلوبة

### المشكلة: 404 Error
**الحل:** تأكد من:
- أن الـ Route موجود في `app.routes.ts`
- أن الـ Component موجود في المسار الصحيح
- أن الـ Path صحيح: `/form-builder/copy-to-document`

---

## مثال كامل

### في Component
```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-example',
  template: `
    <button (click)="goToCopyToDocument()">
      Go to Copy To Document
    </button>
  `
})
export class ExampleComponent {
  constructor(private router: Router) {}

  goToCopyToDocument() {
    this.router.navigate(['/form-builder/copy-to-document']);
  }
}
```

---

**آخر تحديث:** 2024-02-03










