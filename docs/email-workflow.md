# Angular + Email Workflow Documentation (Submit / Approve / Reject)

## الفكرة الأساسية (مهمة)
- **Angular مش بيبعت Email بنفسه**.
- Angular بيعمل **HTTP Requests** للـAPI.
- الـAPI هو اللي:
  - يحدد **هل لازم يبعت Email ولا لأ** (بناءً على `ALERT_RULES`)
  - يختار **Template** من `EMAIL_TEMPLATES`
  - يختار **SMTP Config** من `SMTP_CONFIGS`
  - يبعت الإيميل عبر SMTP

---

## 1) Email بيروح لمين ومتى؟

### A) بعد الـSubmit
- Endpoint المستخدم: `POST /api/FormSubmissions/submit`
- الـAPI ينفّذ Trigger اسمه: **FormSubmitted**
- الإيميل اللي بيتبعت غالبًا: **SubmissionConfirmation**
- الـRecipients بيتحددوا من:
  - `ALERT_RULES` على:
    - `TriggerType = 'FormSubmitted'`
    - `DocumentTypeId = (submission.DocumentTypeId)`
    - `NotificationType in ('Email','Both')`
    - `IsActive = 1`, `IsDeleted = 0`
  - لو الـRule فيها `TargetUserId` → هيتبعت لهم
  - لو فيها `TargetRoleId` → بيتحلّ لـUsers (Roles → Users)
  - ولو مفيش Recipients محددين، النظام بيستخدم **SubmittedByUserId** كـ fallback (حسب التعديلات اللي عندك)
- لو `submittedByUserId = "public-user"` → **مفيش أي Email بيتبعت** (لكل التريجرز) حتى لو في Rules

### B) بعد الـApprove
- Endpoint المستخدم: `POST /api/FormSubmissions/approve`
- الـAPI ينفّذ Trigger اسمه: **ApprovalApproved**
- الإيميل اللي بيتبعت: **ApprovalResult** (TemplateCode) مع `ActionType=Approved`
- الـRecipients بيتحددوا من `ALERT_RULES` على:
  - `TriggerType = 'ApprovalApproved'`

### C) بعد الـReject
- Endpoint المستخدم: `POST /api/FormSubmissions/reject`
- الـAPI ينفّذ Trigger اسمه: **ApprovalRejected**
- الإيميل اللي بيتبعت: **ApprovalResult** (TemplateCode) مع `ActionType=Rejected`
- الـRecipients بيتحددوا من `ALERT_RULES` على:
  - `TriggerType = 'ApprovalRejected'`

---

## 2) قواعد اختيار Template و SMTP

### 2.1 اختيار الـTemplate (من `EMAIL_TEMPLATES`)
الـAPI بيختار الـTemplate بهذا الترتيب:
- **(1) Template محدد على Alert Rule** (`ALERT_RULES.EmailTemplateId`) لو موجود وActive
- **(2) Template Default لنفس DocumentType + TemplateCode**
- **(3) أي Template Default بنفس TemplateCode**
- **(4) Fallback من `appsettings.json` (Email:Templates)** (وغالبًا يكون فاضي عندكم)

### TemplateCode المستخدم
- بعد Submit: `SubmissionConfirmation`
- بعد Approve/Reject: `ApprovalResult`

> لازم تتأكد إن جدول `EMAIL_TEMPLATES` فيه Templates Active لهذه الأكواد.

### 2.2 اختيار SMTP (من `SMTP_CONFIGS`)
الـAPI بيختار SMTP بهذا الترتيب:
- لو الـTemplate فيه `SmtpConfigId` → يستخدمه (بشرط `IsActive=1` و`IsDeleted=0`)
- وإلا يستخدم أحدث SMTP Active من DB
- وإلا fallback من `appsettings.json` (قسم `Smtp`)

---

## 3) ماذا يجب أن يكون موجود في DB؟

### 3.1 SMTP_CONFIGS
لازم يكون عندك SMTP active:

```sql
SELECT * FROM SMTP_CONFIGS WHERE IsActive = 1 AND IsDeleted = 0;
```

### 3.2 EMAIL_TEMPLATES
لازم Templates Active:

```sql
SELECT * FROM EMAIL_TEMPLATES
WHERE TemplateCode IN ('SubmissionConfirmation','ApprovalResult')
  AND IsActive = 1 AND IsDeleted = 0;
```

### 3.3 ALERT_RULES
لازم Rules Active للـTriggers:

```sql
SELECT * FROM ALERT_RULES
WHERE DocumentTypeId = 1
  AND TriggerType IN ('FormSubmitted','ApprovalApproved','ApprovalRejected')
  AND IsActive = 1 AND IsDeleted = 0;
```

> عدّل `DocumentTypeId` حسب الـSubmission عندك.

---

## 4) الـAPI URLs + JSON Bodies (اللي Angular هيستعملهم)

### Base URL (Development)
- `http://localhost:5203/api`

> خليه في Angular `environment.apiUrl`.

---

### 4.1 Submit Submission
**POST** `/FormSubmissions/submit`

**JSON**
```json
{
  "submissionId": 39,
  "submittedByUserId": "anas"
}
```

**ملاحظات**
- `submissionId`: رقم الـdraft/submission
- `submittedByUserId`: نفس اللي موجود في `Tbl_User.Username` أو الـId حسب نظامكم (عندكم غالبًا username شغال)

---

### 4.2 Approve Submission
**POST** `/FormSubmissions/approve`

**JSON**
```json
{
  "submissionId": 39,
  "stageId": 1,
  "actionByUserId": "anas",
  "comments": "Approved by admin anas"
}
```

---

### 4.3 Reject Submission
**POST** `/FormSubmissions/reject`

**JSON**
```json
{
  "submissionId": 39,
  "stageId": 1,
  "actionByUserId": "anas",
  "comments": "Rejected by admin anas"
}
```

---

### 4.4 Get Submission (عشان تجيب StageId + Status)
**GET** `/FormSubmissions/{id}`

Example:
- `GET http://localhost:5203/api/FormSubmissions/39`

Angular يستخدمها قبل approve/reject عشان يعرف `stageId` و`status`.

---

### 4.5 (اختياري) Test SMTP سريع
**POST** `/EmailTest/send-simple`

```json
{
  "to": "you@domain.com",
  "subject": "SMTP Test",
  "body": "Hello",
  "isHtml": true
}
```

---

## 5) Angular: ازاي تنفذ ده (Conceptual Implementation)

### 5.1 environment
في `environment.ts`:
- `apiUrl: 'http://localhost:5203/api'`

### 5.2 Angular Service (HttpClient)
اعمل Service فيه methods:
- `submit(submissionId, submittedByUserId)`
- `approve(submissionId, stageId, actionByUserId, comments?)`
- `reject(submissionId, stageId, actionByUserId, comments?)`
- `getById(submissionId)`

### 5.3 UI Flow في Angular
1) User يفتح صفحة Submission
2) Angular يعمل `GET /FormSubmissions/{id}` ويعرض:
   - `status`
   - `stageId`
   - `documentNumber`
3) لو `status == 'Draft'` → اعرض زر Submit:
   - ينادي `POST /submit`
4) لو `status == 'Submitted'` → اعرض Approve/Reject:
   - Approve: `POST /approve`
   - Reject: `POST /reject` (عادة comments required)
5) بعد كل عملية:
   - اعمل refresh: `GET /FormSubmissions/{id}`
   - اعرض message للمستخدم

---

## 6) مهم: Authentication / Token
- بعض endpoints عندك عليها `[Authorize]` وبعضها `[AllowAnonymous]`.
- لو API بتطلب JWT:
  - Angular لازم يبعت Header:
    - `Authorization: Bearer <token>`
- الـLogin عندك: `POST /api/Account/login`

> لو تحب، ابعتلي شكل Response بتاع login عندكم وأنا أطلع لك Angular AuthInterceptor جاهز.

---

## 7) Debug سريع لو الإيميل ماوصلش
1) اتأكد من `Tbl_User.Email` للمستلمين (الـRecipients)
2) اتأكد من `ALERT_RULES.TriggerType` صح:
   - Submit: `FormSubmitted`
   - Approve: `ApprovalApproved`
   - Reject: `ApprovalRejected`
3) اتأكد من `EMAIL_TEMPLATES.TemplateCode`:
   - `SubmissionConfirmation`
   - `ApprovalResult`
4) اتأكد من `SMTP_CONFIGS` Active
5) راقب Logs في الـAPI (لأننا زودنا logging في خدمات الإيميل)

---

## 8) ملخص سريع (Cheat Sheet)
- **Submit** → `POST /FormSubmissions/submit` → Trigger `FormSubmitted` → Template `SubmissionConfirmation`
- **Approve** → `POST /FormSubmissions/approve` → Trigger `ApprovalApproved` → Template `ApprovalResult`
- **Reject** → `POST /FormSubmissions/reject` → Trigger `ApprovalRejected` → Template `ApprovalResult`
- **Recipients**: من `ALERT_RULES` + fallback لـSubmittedByUserId
- **SMTP**: من `EMAIL_TEMPLATES.SmtpConfigId` أو `SMTP_CONFIGS` active
