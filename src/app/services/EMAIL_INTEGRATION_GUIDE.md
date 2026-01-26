# 📧 Angular Integration Guide - Email Endpoints

دليل شامل لاستخدام Email Endpoints من Angular

---

## 📋 المحتويات

1. [إعداد Angular Service](#1-إعداد-angular-service)
2. [TypeScript Interfaces](#2-typescript-interfaces)
3. [استخدام الـ Service](#3-استخدام-الـ-service)
4. [أمثلة في Components](#4-أمثلة-في-components)
5. [Error Handling](#5-error-handling)
6. [Environment Configuration](#6-environment-configuration)

---

## 1. إعداد Angular Service ✅

تم إنشاء `EmailService` في `src/app/services/email.service.ts` وهو جاهز للاستخدام.

الـ Service متوفر تلقائياً في جميع Components لأننا استخدمنا `providedIn: 'root'`.

### الملفات المُنشأة:
- ✅ `src/app/services/email.service.ts` - Email Service
- ✅ `src/app/models/email.models.ts` - TypeScript Interfaces

---

## 2. TypeScript Interfaces ✅

تم إنشاء جميع الـ Interfaces في `src/app/models/email.models.ts`:

### Request Models:
- `SimpleEmailRequest` - إرسال بريد بسيط
- `TemplateTestRequest` - اختبار Template
- `ApprovalRequiredRequest` - طلب الموافقة
- `ApprovalResultRequest` - نتيجة الموافقة

### Response Models:
- `EmailResponse` - استجابة عامة
- `TemplateTestResponse` - استجابة اختبار Template
- `SubmissionConfirmationResponse` - استجابة تأكيد التقديم
- `ApprovalRequiredResponse` - استجابة طلب الموافقة
- `ApprovalResultResponse` - استجابة نتيجة الموافقة
- `TemplatesResponse` - قائمة القوالب المتاحة

---

## 3. استخدام الـ Service

### Import في Component:

```typescript
import { EmailService } from '../../services/email.service';
import { SimpleEmailRequest, EmailResponse } from '../../models/email.models';
```

### Inject في Constructor:

```typescript
constructor(private emailService: EmailService) { }
```

---

## 4. أمثلة في Components

### مثال 1: إرسال بريد إلكتروني بسيط

```typescript
import { Component } from '@angular/core';
import { EmailService } from '../../services/email.service';
import { SimpleEmailRequest, EmailResponse } from '../../models/email.models';

@Component({
  selector: 'app-email-test',
  template: `
    <div class="email-test-container">
      <h2>اختبار إرسال البريد الإلكتروني</h2>
      
      <form (ngSubmit)="sendEmail()" #emailForm="ngForm">
        <div class="form-group">
          <label>إلى:</label>
          <input 
            type="email" 
            [(ngModel)]="emailRequest.to" 
            name="to"
            required
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label>الموضوع:</label>
          <input 
            type="text" 
            [(ngModel)]="emailRequest.subject" 
            name="subject"
            required
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label>المحتوى:</label>
          <textarea 
            [(ngModel)]="emailRequest.body" 
            name="body"
            required
            rows="5"
            class="form-control"
          ></textarea>
        </div>

        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="emailRequest.isHtml" 
              name="isHtml"
            />
            HTML Format
          </label>
        </div>

        <button 
          type="submit" 
          [disabled]="!emailForm.valid || isLoading"
          class="btn btn-primary"
        >
          {{ isLoading ? 'جاري الإرسال...' : 'إرسال' }}
        </button>
      </form>

      <div *ngIf="response" class="alert alert-success mt-3">
        <strong>نجح!</strong> {{ response.message }}
      </div>

      <div *ngIf="error" class="alert alert-danger mt-3">
        <strong>خطأ!</strong> {{ error }}
      </div>
    </div>
  `
})
export class EmailTestComponent {
  emailRequest: SimpleEmailRequest = {
    to: '',
    subject: '',
    body: '',
    isHtml: true
  };

  response: EmailResponse | null = null;
  error: string | null = null;
  isLoading = false;

  constructor(private emailService: EmailService) { }

  sendEmail() {
    this.isLoading = true;
    this.error = null;
    this.response = null;

    this.emailService.sendSimpleEmail(this.emailRequest).subscribe({
      next: (response) => {
        this.response = response;
        this.isLoading = false;
        console.log('Email sent successfully:', response);
      },
      error: (error) => {
        this.error = error.message;
        this.isLoading = false;
        console.error('Error sending email:', error);
      }
    });
  }
}
```

### مثال 2: اختبار Template

```typescript
import { Component, OnInit } from '@angular/core';
import { EmailService } from '../../services/email.service';
import { TemplateTestRequest, TemplateTestResponse, EmailTemplate } from '../../models/email.models';

@Component({
  selector: 'app-template-test',
  template: `
    <div class="template-test-container">
      <h2>اختبار Email Templates</h2>

      <!-- اختيار Template -->
      <div class="form-group">
        <label>اختر Template:</label>
        <select 
          [(ngModel)]="selectedTemplate" 
          (change)="onTemplateChange()"
          class="form-control"
        >
          <option [value]="null">-- اختر Template --</option>
          <option *ngFor="let template of templates" [value]="template.name">
            {{ template.name }} - {{ template.description }}
          </option>
        </select>
      </div>

      <!-- نموذج البيانات -->
      <div *ngIf="selectedTemplate" class="mt-3">
        <h3>بيانات Template</h3>
        
        <div class="form-group">
          <label>Document Number:</label>
          <input 
            type="text" 
            [(ngModel)]="templateData.DocumentNumber" 
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label>Submission ID:</label>
          <input 
            type="text" 
            [(ngModel)]="templateData.SubmissionId" 
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label>Submitted By:</label>
          <input 
            type="text" 
            [(ngModel)]="templateData.SubmittedBy" 
            class="form-control"
          />
        </div>

        <button 
          (click)="testTemplate()" 
          [disabled]="isLoading"
          class="btn btn-primary"
        >
          {{ isLoading ? 'جاري المعالجة...' : 'اختبار Template' }}
        </button>
      </div>

      <!-- النتيجة -->
      <div *ngIf="templateResponse" class="mt-4">
        <h3>النتيجة:</h3>
        <div class="card">
          <div class="card-header">
            <strong>Subject:</strong> {{ templateResponse.subject }}
          </div>
          <div class="card-body">
            <pre>{{ templateResponse.body }}</pre>
          </div>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger mt-3">
        {{ error }}
      </div>
    </div>
  `
})
export class TemplateTestComponent implements OnInit {
  templates: EmailTemplate[] = [];
  selectedTemplate: string | null = null;
  templateData: any = {
    DocumentNumber: 'ser-000001',
    SubmissionId: '1',
    DocumentType: 'doc',
    SubmittedBy: 'anas',
    SystemUrl: 'http://localhost:5203'
  };

  templateResponse: TemplateTestResponse | null = null;
  error: string | null = null;
  isLoading = false;

  constructor(private emailService: EmailService) { }

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.emailService.getAvailableTemplates().subscribe({
      next: (response) => {
        this.templates = response.templates;
      },
      error: (error) => {
        this.error = error.message;
      }
    });
  }

  onTemplateChange() {
    this.templateResponse = null;
    this.error = null;
  }

  testTemplate() {
    if (!this.selectedTemplate) return;

    this.isLoading = true;
    this.error = null;
    this.templateResponse = null;

    const request: TemplateTestRequest = {
      templateName: this.selectedTemplate as any,
      data: this.templateData
    };

    this.emailService.testTemplate(request).subscribe({
      next: (response) => {
        this.templateResponse = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.isLoading = false;
      }
    });
  }
}
```

### مثال 3: إرسال تأكيد التقديم

```typescript
import { Component } from '@angular/core';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-submission',
  template: `
    <div>
      <button 
        (click)="sendConfirmationEmail()" 
        [disabled]="isLoading"
        class="btn btn-success"
      >
        {{ isLoading ? 'جاري الإرسال...' : 'إرسال تأكيد التقديم' }}
      </button>

      <div *ngIf="successMessage" class="alert alert-success mt-2">
        {{ successMessage }}
      </div>

      <div *ngIf="errorMessage" class="alert alert-danger mt-2">
        {{ errorMessage }}
      </div>
    </div>
  `
})
export class SubmissionComponent {
  submissionId = 5; // من البيانات الفعلية
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private emailService: EmailService) { }

  sendConfirmationEmail() {
    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.emailService.testSubmissionConfirmation(this.submissionId).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }
}
```

### مثال 4: إرسال طلب الموافقة

```typescript
import { Component } from '@angular/core';
import { EmailService } from '../../services/email.service';
import { ApprovalRequiredRequest } from '../../models/email.models';

@Component({
  selector: 'app-approval',
  template: `
    <div class="approval-container">
      <h3>إرسال طلب الموافقة</h3>

      <div class="form-group">
        <label>Submission ID:</label>
        <input 
          type="number" 
          [(ngModel)]="request.submissionId" 
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>Stage ID:</label>
        <input 
          type="number" 
          [(ngModel)]="request.stageId" 
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>Approver User IDs (مفصولة بفواصل):</label>
        <input 
          type="text" 
          [(ngModel)]="approverIdsInput" 
          (blur)="updateApproverIds()"
          placeholder="1027, anas"
          class="form-control"
        />
      </div>

      <button 
        (click)="sendApprovalRequest()" 
        [disabled]="isLoading"
        class="btn btn-primary"
      >
        إرسال طلب الموافقة
      </button>

      <div *ngIf="response" class="alert alert-info mt-3">
        تم إرسال {{ response.approverCount }} طلب موافقة
      </div>
    </div>
  `
})
export class ApprovalComponent {
  request: ApprovalRequiredRequest = {
    submissionId: 5,
    stageId: 1,
    approverUserIds: []
  };

  approverIdsInput = '1027, anas';
  response: any = null;
  isLoading = false;

  constructor(private emailService: EmailService) {
    this.updateApproverIds();
  }

  updateApproverIds() {
    this.request.approverUserIds = this.approverIdsInput
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
  }

  sendApprovalRequest() {
    this.isLoading = true;
    this.response = null;

    this.emailService.testApprovalRequired(this.request).subscribe({
      next: (response) => {
        this.response = response;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.isLoading = false;
      }
    });
  }
}
```

---

## 5. Error Handling ✅

الـ Error Handling موجود بالفعل في `EmailService` ويستخدم `errorInterceptor` الموجود في `src/app/core/interceptors/error.interceptor.ts`.

الـ Service يقوم بـ:
- معالجة أخطاء HTTP
- إرجاع رسائل خطأ واضحة
- تسجيل الأخطاء في Console

---

## 6. Environment Configuration ✅

تم إعداد Environment في `src/app/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5203/api', // ✅ موجود بالفعل
  // ...
};
```

الـ Service يستخدم `environment.apiUrl` تلقائياً.

---

## 7. استخدام Reactive Forms (أفضل ممارسة)

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-email-form',
  template: `
    <form [formGroup]="emailForm" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label>إلى:</label>
        <input 
          formControlName="to"
          type="email"
          class="form-control"
          [class.is-invalid]="emailForm.get('to')?.invalid && emailForm.get('to')?.touched"
        />
        <div 
          *ngIf="emailForm.get('to')?.invalid && emailForm.get('to')?.touched"
          class="invalid-feedback"
        >
          بريد إلكتروني صحيح مطلوب
        </div>
      </div>

      <div class="form-group">
        <label>الموضوع:</label>
        <input 
          formControlName="subject"
          type="text"
          class="form-control"
          [class.is-invalid]="emailForm.get('subject')?.invalid && emailForm.get('subject')?.touched"
        />
      </div>

      <div class="form-group">
        <label>المحتوى:</label>
        <textarea 
          formControlName="body"
          rows="5"
          class="form-control"
        ></textarea>
      </div>

      <button 
        type="submit" 
        [disabled]="emailForm.invalid || isLoading"
        class="btn btn-primary"
      >
        إرسال
      </button>
    </form>
  `
})
export class EmailFormComponent implements OnInit {
  emailForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private emailService: EmailService
  ) { }

  ngOnInit() {
    this.emailForm = this.fb.group({
      to: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required]],
      body: ['', [Validators.required]],
      isHtml: [true]
    });
  }

  onSubmit() {
    if (this.emailForm.valid) {
      this.isLoading = true;
      
      this.emailService.sendSimpleEmail(this.emailForm.value).subscribe({
        next: (response) => {
          console.log('Success:', response);
          this.isLoading = false;
          // إعادة تعيين النموذج
          this.emailForm.reset({ isHtml: true });
        },
        error: (error) => {
          console.error('Error:', error);
          this.isLoading = false;
        }
      });
    }
  }
}
```

---

## 8. نصائح إضافية

### استخدام Async Pipe (أفضل ممارسة)

```typescript
// في Component
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

templates$ = this.emailService.getAvailableTemplates().pipe(
  map(response => response.templates),
  catchError(error => {
    console.error('Error loading templates:', error);
    return of([]);
  })
);

// في Template
<div *ngFor="let template of templates$ | async">
  {{ template.name }}
</div>
```

### Loading State Management

```typescript
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';

// استخدام BehaviorSubject لإدارة حالة التحميل
private loadingSubject = new BehaviorSubject<boolean>(false);
public loading$ = this.loadingSubject.asObservable();

sendEmail(request: SimpleEmailRequest): Observable<EmailResponse> {
  this.loadingSubject.next(true);
  
  return this.emailService.sendSimpleEmail(request).pipe(
    finalize(() => this.loadingSubject.next(false))
  );
}
```

---

## 9. Checklist للتكامل ✅

- [x] إضافة `HttpClientModule` إلى `app.config.ts` ✅ (موجود بالفعل)
- [x] إنشاء `EmailService` ✅
- [x] إنشاء Models/Interfaces ✅
- [x] إعداد Environment Configuration ✅
- [x] إضافة Error Handling ✅
- [ ] اختبار جميع الـ Endpoints
- [ ] إضافة Loading States في Components
- [ ] إضافة User Feedback (Toasts/Notifications)

---

## 10. أمثلة سريعة (Quick Examples)

### إرسال بريد بسيط
```typescript
this.emailService.sendSimpleEmail({
  to: 'test@example.com',
  subject: 'Test',
  body: 'Test email',
  isHtml: true
}).subscribe(response => console.log(response));
```

### الحصول على Templates
```typescript
this.emailService.getAvailableTemplates().subscribe(
  response => console.log(response.templates)
);
```

### اختبار Template
```typescript
this.emailService.testTemplate({
  templateName: 'SubmissionConfirmation',
  data: {
    DocumentNumber: 'ser-000001',
    SubmissionId: '1'
  }
}).subscribe(response => console.log(response));
```

### إرسال تأكيد التقديم
```typescript
this.emailService.testSubmissionConfirmation(5).subscribe(
  response => console.log(response)
);
```

### إرسال طلب الموافقة
```typescript
this.emailService.testApprovalRequired({
  submissionId: 5,
  stageId: 1,
  approverUserIds: ['1027', 'anas']
}).subscribe(response => console.log(response));
```

### إرسال نتيجة الموافقة
```typescript
this.emailService.testApprovalResult({
  submissionId: 5,
  actionType: 'Approved',
  approverUserId: '1027',
  comments: 'موافق'
}).subscribe(response => console.log(response));
```

---

## 📚 موارد إضافية

- [Angular HttpClient Documentation](https://angular.io/guide/http)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [Angular Forms](https://angular.io/guide/forms)

---

## ✅ ملاحظات مهمة

1. **Authorization**: الـ Authorization header يتم إضافته تلقائياً من خلال `authInterceptor` الموجود في `src/app/auth/auth.interceptor.ts`

2. **Error Handling**: جميع الأخطاء يتم معالجتها تلقائياً من خلال `errorInterceptor` الموجود في `src/app/core/interceptors/error.interceptor.ts`

3. **CORS**: تأكد من أن CORS مُفعّل في الـ Backend للسماح للـ Angular app بالاتصال بالـ API

4. **API URL**: الـ API URL موجود في `environment.apiUrl` وهو `http://localhost:5203/api`

---

**جاهز للاستخدام! 🚀**

