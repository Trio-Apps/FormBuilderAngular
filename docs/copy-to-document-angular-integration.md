# CopyToDocument - Angular Integration Guide

## نظرة عامة
هذا الدليل يشرح كيفية استخدام CopyToDocument API من Angular Frontend بعد التعديلات الجديدة.

## التعديلات الجديدة

### 1. الحقول المطلوبة الجديدة
- `sourceDocumentTypeId` - **مطلوب** (جديد)
- `sourceFormId` - **مطلوب** (كان اختياري)
- `initialStatus` - جديد (Draft / Submitted)

### 2. التحسينات
- التحقق من توافق المستندات
- التحقق من توافق أنواع البيانات
- دعم InitialStatus

---

## 1. TypeScript Interfaces

### CopyToDocumentActionDto Interface

```typescript
export interface CopyToDocumentActionDto {
  // الحقول المطلوبة الجديدة
  sourceDocumentTypeId: number;  // مطلوب - جديد
  sourceFormId: number;          // مطلوب - كان اختياري
  
  // الحقول الموجودة
  sourceSubmissionId?: number;
  targetDocumentTypeId: number;
  targetFormId: number;
  createNewDocument: boolean;
  targetDocumentId?: number;
  
  // الحقل الجديد
  initialStatus?: 'Draft' | 'Submitted';  // جديد - القيمة الافتراضية: 'Draft'
  
  // Field Mapping
  fieldMapping: { [sourceFieldCode: string]: string };  // SourceFieldCode -> TargetFieldCode
  gridMapping?: { [sourceGridCode: string]: string };
  
  // Options
  copyCalculatedFields: boolean;
  copyGridRows: boolean;
  startWorkflow: boolean;
  linkDocuments: boolean;
  copyAttachments: boolean;
  copyMetadata: boolean;
  overrideTargetDefaults: boolean;
  metadataFields?: string[];
}
```

### CopyToDocumentResultDto Interface

```typescript
export interface CopyToDocumentResultDto {
  success: boolean;
  targetDocumentId?: number;
  targetDocumentNumber?: string;
  errorMessage?: string;
  fieldsCopied: number;
  gridRowsCopied: number;
  actionId?: number;
  sourceSubmissionId: number;
}
```

### Request DTOs

```typescript
// للاستخدام بـ IDs
export interface ExecuteCopyToDocumentRequestDto {
  config: CopyToDocumentActionDto;
  sourceSubmissionId: number;
  actionId?: number;
  ruleId?: number;
}

// للاستخدام بـ Codes
export interface CopyToDocumentActionByCodesDto {
  sourceDocumentTypeCode: string;  // جديد - مطلوب
  sourceFormCode: string;           // جديد - مطلوب
  targetDocumentTypeCode: string;
  targetFormCode: string;
  createNewDocument: boolean;
  targetDocumentId?: number;
  initialStatus?: 'Draft' | 'Submitted';  // جديد
  fieldMapping?: { [key: string]: string };
  gridMapping?: { [key: string]: string };
  copyCalculatedFields: boolean;
  copyGridRows: boolean;
  startWorkflow: boolean;
  linkDocuments: boolean;
  copyAttachments: boolean;
  copyMetadata: boolean;
  overrideTargetDefaults: boolean;
  metadataFields?: string[];
}

export interface ExecuteCopyToDocumentByCodesRequestDto {
  config: CopyToDocumentActionByCodesDto;
  sourceSubmissionId: number;
  actionId?: number;
  ruleId?: number;
}
```

---

## 2. Angular Service

### copy-to-document.service.ts

الـ Service موجود في: `src/app/views/FormBuilder/services/copy-to-document.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  CopyToDocumentActionDto, 
  CopyToDocumentResultDto,
  ExecuteCopyToDocumentRequestDto,
  ExecuteCopyToDocumentByCodesRequestDto
} from '../models/copy-to-document.models';

@Injectable({
  providedIn: 'root'
})
export class CopyToDocumentService {
  private apiUrl = '/api/CopyToDocument';

  constructor(private http: HttpClient) { }

  /**
   * تنفيذ CopyToDocument باستخدام IDs
   */
  executeCopyToDocument(request: ExecuteCopyToDocumentRequestDto): Observable<CopyToDocumentResultDto> {
    return this.http.post<CopyToDocumentResultDto>(`${this.apiUrl}/execute`, request);
  }

  /**
   * تنفيذ CopyToDocument باستخدام Codes
   */
  executeCopyToDocumentByCodes(request: ExecuteCopyToDocumentByCodesRequestDto): Observable<CopyToDocumentResultDto> {
    return this.http.post<CopyToDocumentResultDto>(`${this.apiUrl}/execute-by-codes`, request);
  }

  /**
   * الحصول على سجلات Audit
   */
  getAuditRecords(params?: {
    sourceSubmissionId?: number;
    targetDocumentId?: number;
    ruleId?: number;
    success?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<any> {
    return this.http.get(`${this.apiUrl}/audit`, { params: params as any });
  }

  /**
   * الحصول على سجل Audit محدد
   */
  getAuditRecordById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/audit/${id}`);
  }

  /**
   * الحصول على سجلات Audit لمستند مصدر محدد
   */
  getAuditRecordsBySubmissionId(submissionId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/audit/submission/${submissionId}`);
  }

  /**
   * الحصول على سجلات Audit لمستند هدف محدد
   */
  getAuditRecordsByTargetDocumentId(targetDocumentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/audit/target/${targetDocumentId}`);
  }
}
```

---

## 3. أمثلة الاستخدام

### مثال 1: استخدام IDs (الطريقة الموصى بها)

```typescript
import { Component } from '@angular/core';
import { CopyToDocumentService } from './services/copy-to-document.service';
import { CopyToDocumentActionDto, ExecuteCopyToDocumentRequestDto } from './models/copy-to-document.models';

@Component({
  selector: 'app-copy-document',
  templateUrl: './copy-document.component.html'
})
export class CopyDocumentComponent {
  constructor(private copyToDocumentService: CopyToDocumentService) {}

  copyDocument() {
    // إعداد التكوين
    const config: CopyToDocumentActionDto = {
      // الحقول المطلوبة الجديدة
      sourceDocumentTypeId: 1,      // مطلوب - جديد
      sourceFormId: 10,              // مطلوب
      
      targetDocumentTypeId: 2,
      targetFormId: 20,
      createNewDocument: true,
      
      // الحقل الجديد
      initialStatus: 'Draft',         // جديد - Draft أو Submitted
      
      // Field Mapping
      fieldMapping: {
        'TOTAL_AMOUNT': 'CONTRACT_VALUE',
        'REQUEST_DATE': 'ORDER_DATE'
      },
      gridMapping: {
        'ITEMS': 'CONTRACT_ITEMS'
      },
      
      // Options
      copyCalculatedFields: true,
      copyGridRows: true,
      startWorkflow: false,
      linkDocuments: true,
      copyAttachments: false,
      copyMetadata: false,
      overrideTargetDefaults: false,
      metadataFields: []
    };

    const request: ExecuteCopyToDocumentRequestDto = {
      config: config,
      sourceSubmissionId: 115
    };

    this.copyToDocumentService.executeCopyToDocument(request).subscribe({
      next: (result) => {
        if (result.success) {
          console.log('تم النسخ بنجاح!');
          console.log('Target Document ID:', result.targetDocumentId);
          console.log('Target Document Number:', result.targetDocumentNumber);
          console.log('Fields Copied:', result.fieldsCopied);
          console.log('Grid Rows Copied:', result.gridRowsCopied);
        } else {
          console.error('فشل النسخ:', result.errorMessage);
        }
      },
      error: (error) => {
        console.error('خطأ في الطلب:', error);
      }
    });
  }
}
```

### مثال 2: استخدام Codes

```typescript
copyDocumentByCodes() {
  const request: ExecuteCopyToDocumentByCodesRequestDto = {
    config: {
      // الحقول المطلوبة الجديدة
      sourceDocumentTypeCode: 'PURCHASE_REQUEST',  // جديد - مطلوب
      sourceFormCode: 'PR_FORM',                    // جديد - مطلوب
      
      targetDocumentTypeCode: 'PURCHASE_ORDER',
      targetFormCode: 'PO_FORM',
      createNewDocument: true,
      
      // الحقل الجديد
      initialStatus: 'Submitted',  // جديد
      
      fieldMapping: {
        'TOTAL_AMOUNT': 'CONTRACT_VALUE',
        'REQUEST_DATE': 'ORDER_DATE'
      },
      copyCalculatedFields: true,
      copyGridRows: true,
      startWorkflow: true,
      linkDocuments: true,
      copyAttachments: false,
      copyMetadata: false,
      overrideTargetDefaults: false
    },
    sourceSubmissionId: 115
  };

  this.copyToDocumentService.executeCopyToDocumentByCodes(request).subscribe({
    next: (result) => {
      if (result.success) {
        console.log('تم النسخ بنجاح!');
      } else {
        console.error('فشل النسخ:', result.errorMessage);
      }
    }
  });
}
```

### مثال 3: إنشاء مستند جديد بحالة Submitted

```typescript
createSubmittedDocument() {
  const config: CopyToDocumentActionDto = {
    sourceDocumentTypeId: 1,
    sourceFormId: 10,
    targetDocumentTypeId: 2,
    targetFormId: 20,
    createNewDocument: true,
    initialStatus: 'Submitted',  // إنشاء المستند بحالة Submitted مباشرة
    fieldMapping: {
      'AMOUNT': 'TOTAL_AMOUNT'
    },
    copyCalculatedFields: true,
    copyGridRows: true,
    startWorkflow: false,  // لا حاجة لبدء workflow لأن الحالة Submitted
    linkDocuments: true,
    copyAttachments: false,
    copyMetadata: false,
    overrideTargetDefaults: false
  };

  const request: ExecuteCopyToDocumentRequestDto = {
    config: config,
    sourceSubmissionId: 115
  };

  this.copyToDocumentService.executeCopyToDocument(request).subscribe({
    next: (result) => {
      console.log('تم إنشاء المستند بحالة Submitted:', result);
    }
  });
}
```

### مثال 4: عرض سجلات Audit

```typescript
viewAuditRecords() {
  // الحصول على جميع السجلات
  this.copyToDocumentService.getAuditRecords({
    page: 1,
    pageSize: 50
  }).subscribe({
    next: (response) => {
      console.log('Audit Records:', response.data);
      console.log('Total Count:', response.totalCount);
    }
  });

  // الحصول على سجلات لمستند محدد
  this.copyToDocumentService.getAuditRecordsBySubmissionId(115).subscribe({
    next: (records) => {
      console.log('Audit Records for Submission 115:', records);
    }
  });
}
```

---

## 4. Form Component Example

### copy-document-form.component.ts

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CopyToDocumentService } from '../services/copy-to-document.service';

@Component({
  selector: 'app-copy-document-form',
  templateUrl: './copy-document-form.component.html'
})
export class CopyDocumentFormComponent implements OnInit {
  copyForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private copyToDocumentService: CopyToDocumentService
  ) {}

  ngOnInit() {
    this.copyForm = this.fb.group({
      // الحقول المطلوبة الجديدة
      sourceDocumentTypeId: [null, Validators.required],
      sourceFormId: [null, Validators.required],
      
      targetDocumentTypeId: [null, Validators.required],
      targetFormId: [null, Validators.required],
      sourceSubmissionId: [null, Validators.required],
      
      createNewDocument: [true],
      targetDocumentId: [null],
      
      // الحقل الجديد
      initialStatus: ['Draft', Validators.required],
      
      // Field Mapping
      fieldMapping: this.fb.group({}),
      
      // Options
      copyCalculatedFields: [true],
      copyGridRows: [true],
      startWorkflow: [false],
      linkDocuments: [true],
      copyAttachments: [false],
      copyMetadata: [false],
      overrideTargetDefaults: [false]
    });
  }

  onSubmit() {
    if (this.copyForm.valid) {
      this.loading = true;
      const formValue = this.copyForm.value;

      const request = {
        config: {
          sourceDocumentTypeId: formValue.sourceDocumentTypeId,
          sourceFormId: formValue.sourceFormId,
          targetDocumentTypeId: formValue.targetDocumentTypeId,
          targetFormId: formValue.targetFormId,
          createNewDocument: formValue.createNewDocument,
          targetDocumentId: formValue.targetDocumentId,
          initialStatus: formValue.initialStatus,
          fieldMapping: formValue.fieldMapping,
          copyCalculatedFields: formValue.copyCalculatedFields,
          copyGridRows: formValue.copyGridRows,
          startWorkflow: formValue.startWorkflow,
          linkDocuments: formValue.linkDocuments,
          copyAttachments: formValue.copyAttachments,
          copyMetadata: formValue.copyMetadata,
          overrideTargetDefaults: formValue.overrideTargetDefaults
        },
        sourceSubmissionId: formValue.sourceSubmissionId
      };

      this.copyToDocumentService.executeCopyToDocument(request).subscribe({
        next: (result) => {
          this.loading = false;
          if (result.success) {
            alert(`تم النسخ بنجاح! Document ID: ${result.targetDocumentId}`);
          } else {
            alert(`فشل النسخ: ${result.errorMessage}`);
          }
        },
        error: (error) => {
          this.loading = false;
          alert(`خطأ: ${error.error?.message || error.message}`);
        }
      });
    }
  }
}
```

### copy-document-form.component.html

```html
<form [formGroup]="copyForm" (ngSubmit)="onSubmit()">
  <!-- الحقول المطلوبة الجديدة -->
  <div class="form-group">
    <label>Source Document Type ID *</label>
    <input type="number" formControlName="sourceDocumentTypeId" class="form-control">
    <div *ngIf="copyForm.get('sourceDocumentTypeId')?.hasError('required')" class="error">
      هذا الحقل مطلوب
    </div>
  </div>

  <div class="form-group">
    <label>Source Form ID *</label>
    <input type="number" formControlName="sourceFormId" class="form-control">
    <div *ngIf="copyForm.get('sourceFormId')?.hasError('required')" class="error">
      هذا الحقل مطلوب
    </div>
  </div>

  <div class="form-group">
    <label>Target Document Type ID *</label>
    <input type="number" formControlName="targetDocumentTypeId" class="form-control">
  </div>

  <div class="form-group">
    <label>Target Form ID *</label>
    <input type="number" formControlName="targetFormId" class="form-control">
  </div>

  <div class="form-group">
    <label>Source Submission ID *</label>
    <input type="number" formControlName="sourceSubmissionId" class="form-control">
  </div>

  <!-- الحقل الجديد -->
  <div class="form-group">
    <label>Initial Status *</label>
    <select formControlName="initialStatus" class="form-control">
      <option value="Draft">Draft</option>
      <option value="Submitted">Submitted</option>
    </select>
  </div>

  <div class="form-group">
    <label>
      <input type="checkbox" formControlName="createNewDocument">
      Create New Document
    </label>
  </div>

  <div class="form-group">
    <label>
      <input type="checkbox" formControlName="copyCalculatedFields">
      Copy Calculated Fields
    </label>
  </div>

  <div class="form-group">
    <label>
      <input type="checkbox" formControlName="copyGridRows">
      Copy Grid Rows
    </label>
  </div>

  <div class="form-group">
    <label>
      <input type="checkbox" formControlName="startWorkflow">
      Start Workflow
    </label>
  </div>

  <button type="submit" [disabled]="!copyForm.valid || loading" class="btn btn-primary">
    {{ loading ? 'جاري التنفيذ...' : 'تنفيذ النسخ' }}
  </button>
</form>
```

---

## 5. ملاحظات مهمة

### التغييرات المطلوبة في الكود الموجود

1. **إضافة الحقول المطلوبة الجديدة:**
   ```typescript
   // قبل التعديل
   const config = {
     targetDocumentTypeId: 1,
     targetFormId: 1,
     // ...
   };

   // بعد التعديل
   const config = {
     sourceDocumentTypeId: 1,  // مطلوب - جديد
     sourceFormId: 10,          // مطلوب
     targetDocumentTypeId: 1,
     targetFormId: 1,
     initialStatus: 'Draft',    // جديد
     // ...
   };
   ```

2. **التحقق من صحة البيانات:**
   - التأكد من وجود `sourceDocumentTypeId` و `sourceFormId`
   - التأكد من أن `initialStatus` هو 'Draft' أو 'Submitted'

3. **معالجة الأخطاء:**
   - التحقق من رسائل الخطأ الجديدة المتعلقة بالتوافق
   - التحقق من رسائل الخطأ المتعلقة بأنواع البيانات

---

## 6. Migration Checklist

- [ ] تحديث جميع استدعاءات API لإضافة `sourceDocumentTypeId` و `sourceFormId`
- [ ] تحديث Forms لإضافة الحقول الجديدة
- [ ] تحديث Validation Rules
- [ ] تحديث TypeScript Interfaces
- [ ] اختبار جميع السيناريوهات
- [ ] تحديث Documentation

---

## 7. Error Handling

```typescript
this.copyToDocumentService.executeCopyToDocument(request).subscribe({
  next: (result) => {
    if (result.success) {
      // Success
    } else {
      // Handle error from result.errorMessage
      console.error('Validation Error:', result.errorMessage);
    }
  },
  error: (error) => {
    // Handle HTTP errors
    if (error.status === 400) {
      // Validation errors
      console.error('Validation Errors:', error.error?.errors);
    } else if (error.status === 404) {
      // Not found
      console.error('Resource not found');
    } else {
      // Other errors
      console.error('Server Error:', error.error?.message);
    }
  }
});
```

---

## 8. Best Practices

1. **استخدام IDs بدلاً من Codes** للاستقرار
2. **التحقق من صحة البيانات** قبل الإرسال
3. **معالجة الأخطاء** بشكل صحيح
4. **استخدام Loading States** لتحسين UX
5. **تسجيل Audit Records** للمتابعة

---

## الخلاصة

التعديلات الجديدة تتطلب:
- إضافة `sourceDocumentTypeId` و `sourceFormId` (مطلوب)
- إضافة `initialStatus` (اختياري، القيمة الافتراضية: 'Draft')
- تحديث جميع استدعاءات API
- تحديث Forms والـ Validation

جميع التعديلات متوافقة مع المواصفات الجديدة وتوفر تحسينات في التحقق والموثوقية.

