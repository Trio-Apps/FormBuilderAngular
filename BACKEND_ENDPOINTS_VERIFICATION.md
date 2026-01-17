# Backend Endpoints Verification
## التحقق من نقاط نهاية Backend لحل المشكلة

---

## المشكلة الأساسية
**Error:** `No active Document Series found` عند إنشاء draft submission

**السبب:** الـ `seriesId` غير موجود أو الـ Document Series غير active

---

## الـ Endpoints المهمة لحل المشكلة

### 1. GET Document Series by Document Type ID
**هذا هو الـ endpoint الأهم لحل المشكلة**

**Method:** `GET`  
**URL:** `/api/DocumentSeries/document-type/{documentTypeId}`  
**Base URL:** `https://localhost:7276/api/DocumentSeries/document-type/{documentTypeId}`

**Example:**
```
GET /api/DocumentSeries/document-type/7
GET /api/DocumentSeries/document-type/13
```

**Response Structure (من الـ Backend - Verified):**
```json
{
  "statusCode": 200,
  "message": "Document series retrieved successfully",
  "data": [
    {
      "id": 3,
      "documentTypeId": 7,
      "documentTypeName": "doc",
      "projectId": 6,
      "projectName": "Project",
      "seriesCode": "Series",
      "nextNumber": 2,
      "isDefault": true,
      "isActive": true
    },
    {
      "id": 9,
      "documentTypeId": 13,
      "documentTypeName": "form",
      "projectId": 6,
      "projectName": null,
      "seriesCode": "FORM-SERIES",
      "nextNumber": 4,
      "isDefault": true,
      "isActive": true
    }
  ]
}
```

**ملاحظات مهمة:**
- ✅ الـ response structure: `{ statusCode, message, data }`
- ✅ `isActive` و `isDefault` موجودان و boolean
- ⚠️ **لا يوجد `isDeleted` field في الـ response!**
- ⚠️ `documentTypeName` و `projectName` قد يكونان `null`

**الحقول المهمة:**
- `id` → يستخدم كـ `seriesId` في `createDraft`
- `isActive` → يجب أن يكون `true`
- `isDefault` → يُفضل استخدام الـ default series
- `projectId` → يجب أن يطابق `projectId` المطلوب
- `documentTypeId` → يجب أن يطابق `documentTypeId` المطلوب

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "No document series found for document type {id}"
}
```

**Error Response (Empty Array):**
```json
{
  "statusCode": 200,
  "message": "Document series retrieved successfully",
  "data": []
}
```

---

### 2. POST Create Draft Submission
**الـ endpoint الذي يحتاج `seriesId`**

**Method:** `POST`  
**URL:** `/api/FormSubmissions/draft`  
**Base URL:** `https://localhost:7276/api/FormSubmissions/draft`

**Query Parameters:**
- `formBuilderId` (required): number
- `projectId` (required): number
- `submittedByUserId` (required): string
- `seriesId` (optional): number ← **اختياري! الـ backend يختاره تلقائياً إذا لم يتم إرساله**

**Example (مع seriesId):**
```
POST /api/FormSubmissions/draft?formBuilderId=18&projectId=1&submittedByUserId=public-user&seriesId=3
```

**Example (بدون seriesId - Verified):**
```
POST /api/FormSubmissions/draft?formBuilderId=17&projectId=6&submittedByUserId=1
```
**الـ backend يختار `seriesId` تلقائياً بناءً على:**
- `documentTypeId` (من `formBuilderId`)
- `projectId`
- يختار الـ default active series أو أول active series

**Request Body:** `null` (empty)

**Success Response:**
```json
{
  "statusCode": 200,
  "message": "Draft form submission created successfully",
  "data": {
    "id": 314,
    "formBuilderId": 17,
    "formName": "form",
    "version": 1,
    "documentTypeId": 13,
    "documentTypeName": "form",
    "seriesId": 9,
    "seriesCode": "FORM-SERIES",
    "documentNumber": "FORM-SERIES-000001",
    "submittedByUserId": "1",
    "submittedByUserName": null,
    "submittedDate": "2026-01-16T07:24:58.8200616",
    "status": "Draft",
    "createdDate": "2026-01-16T07:24:58.820254",
    "lastUpdatedDate": "2026-01-16T07:24:58.8202547"
  }
}
```

**Error Response (404 - No Active Series):**
```json
{
  "statusCode": 404,
  "message": "No active Document Series found for Document Type 'doc' (ID: 7) and Project ID 1. Please configure Document Series using: POST /api/FormBuilderDocumentSettings or POST /api/DocumentSeries. Ensure at least one active series exists for this Document Type and Project.",
  "data": {
    "formBuilderId": 18,
    "formBuilderName": "form",
    "documentTypeId": 7,
    "documentTypeName": "doc",
    "projectId": 1,
    "configurationEndpoint": "/api/FormBuilderDocumentSettings",
    "documentSeriesEndpoint": "/api/DocumentSeries",
    "message": "Active Document Series must be configured for the Document Type and Project before creating draft submissions"
  }
}
```

**ملاحظة مهمة (Verified):**
✅ **الـ `seriesId` اختياري!** إذا لم يتم إرساله، الـ backend:
1. يبحث عن active Document Series للـ `documentTypeId` و `projectId`
2. يختار الـ default series أو أول active series
3. ينشئ الـ draft تلقائياً

**مثال من الـ Backend:**
```
POST /api/FormSubmissions/draft?formBuilderId=17&projectId=6&submittedByUserId=1
```
**Response (Success):**
```json
{
  "statusCode": 200,
  "message": "Draft form submission created successfully",
  "data": {
    "id": 317,
    "seriesId": 9,  ← تم اختياره تلقائياً!
    "seriesCode": "FORM-SERIES",
    ...
  }
}
```

**Error Response (404 - No Active Series):**
إذا لم يوجد active series للـ `documentTypeId` و `projectId`، الـ backend سيرجع 404.

---

### 3. GET All Document Series (Optional)
**للتأكد من وجود series**

**Method:** `GET`  
**URL:** `/api/DocumentSeries`

**Response (Verified):**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "id": 3,
      "documentTypeId": 7,
      "documentTypeName": null,
      "projectId": 6,
      "projectName": null,
      "seriesCode": "Series",
      "nextNumber": 2,
      "isDefault": true,
      "isActive": true
    },
    {
      "id": 9,
      "documentTypeId": 13,
      "documentTypeName": null,
      "projectId": 6,
      "projectName": null,
      "seriesCode": "FORM-SERIES",
      "nextNumber": 4,
      "isDefault": true,
      "isActive": true
    }
  ]
}
```

**ملاحظات:**
- ✅ Response structure: `{ statusCode, message, data }`
- ⚠️ `documentTypeName` و `projectName` قد يكونان `null`
- ⚠️ **لا يوجد `isDeleted` field**

---

## الخطوات المطلوبة في الكود

### Step 1: Load Document Series
```typescript
// 1. استدعاء الـ endpoint
const documentSeries = await this.documentTypesService
  .getDocumentSeriesByDocumentTypeId(documentTypeId)
  .toPromise();

// 2. التحقق من وجود series
if (!documentSeries || documentSeries.length === 0) {
  // Error: No series found
  return;
}

// 3. Filter by project
const projectSeries = documentSeries.filter(
  (s: DocumentSeries) => s.projectId === projectId
);

// 4. Filter active series
const activeSeries = projectSeries.filter((s: DocumentSeries) => {
  const isActiveValue: any = s.isActive;
  let isActive = false;
  if (isActiveValue === true) {
    isActive = true;
  } else if (typeof isActiveValue === 'number' && isActiveValue === 1) {
    isActive = true;
  } else if (typeof isActiveValue === 'string' && 
             (isActiveValue.toLowerCase() === 'true' || isActiveValue === '1')) {
    isActive = true;
  } else if (isActiveValue === undefined || isActiveValue === null) {
    isActive = s.isDeleted !== true;
  }
  return isActive;
});

// 5. Select default or first active
if (activeSeries.length === 0) {
  // Error: No active series
  return;
}

const defaultSeries = activeSeries.find((s: DocumentSeries) => s.isDefault) 
                     || activeSeries[0];
const seriesId = defaultSeries?.id;
```

### Step 2: Create Draft with seriesId
```typescript
// 6. Create draft with seriesId
this.formSubmissionsService.createDraft(
  formBuilderId,
  projectId,
  submittedByUserId,
  seriesId  // ← Must be provided!
).subscribe({
  next: (submission) => {
    // Success
  },
  error: (err) => {
    // Handle error
  }
});
```

---

## التحقق من الـ Backend Response

### ✅ Response Structure صحيح:
```json
{
  "statusCode": 200,
  "message": "...",
  "data": [...]
}
```

### ✅ الكود يتعامل مع:
- `response.statusCode` → `response.data`
- `response.success` → `response.data`
- Direct array → `response`
- Empty array → `[]`

---

## المشاكل المحتملة

### 1. الـ Backend لا يرجع `statusCode` و `message`
**الحل:** الكود يدعم multiple formats

### 2. الـ `isActive` field مختلف
**الحل:** الكود يتحقق من multiple formats:
- `true` (boolean) ← **هذا هو المستخدم في الـ backend (Verified)**
- `1` (number)
- `"true"` أو `"1"` (string)
- `undefined` أو `null` → يعتبر active إذا `isDeleted !== true`

**ملاحظة:** من الـ screenshots، الـ backend يستخدم `boolean` (`true`/`false`)

### 3. لا يوجد active series
**الحل:** 
- Show error message to user
- Suggest creating Document Series
- Don't proceed with draft creation

### 4. `seriesId` missing في createDraft
**الحل (Updated):** 
- ✅ **الـ `seriesId` اختياري!** الـ backend يختاره تلقائياً
- ⚠️ لكن يُفضل إرساله لتجنب اختيار خاطئ
- Always load Document Series first
- Always extract `seriesId` before calling `createDraft` (best practice)
- يمكن استدعاء `createDraft` بدون `seriesId` - الـ backend سيتعامل معه

---

## Testing Checklist

- [ ] Test `GET /api/DocumentSeries/document-type/{id}` with valid documentTypeId
- [ ] Test `GET /api/DocumentSeries/document-type/{id}` with invalid documentTypeId (should return empty array)
- [ ] Verify response structure: `{ statusCode, message, data }`
- [ ] Verify `isActive` field format (boolean, number, string)
- [ ] Test filtering by `projectId`
- [ ] Test filtering by `isActive`
- [ ] Test selecting default series
- [ ] Test `POST /api/FormSubmissions/draft` with valid `seriesId`
- [ ] Test `POST /api/FormSubmissions/draft` without `seriesId` (should return 404)
- [ ] Test `POST /api/FormSubmissions/draft` with inactive `seriesId` (should return 404)

---

## الـ Endpoints المستخدمة في الكود

### في `form-view.component.ts`:
```typescript
// Line 3001, 3198, 3757, 4230
this.documentTypesService.getDocumentSeriesByDocumentTypeId(documentTypeId)
```

### في `document-types.service.ts`:
```typescript
// Line 537-563
getDocumentSeriesByDocumentTypeId(documentTypeId: number): Observable<DocumentSeries[]>
// Uses: GET /api/DocumentSeries/document-type/{documentTypeId}
```

### في `form-submissions.service.ts`:
```typescript
// createDraft method
// Uses: POST /api/FormSubmissions/draft?formBuilderId={id}&projectId={id}&submittedByUserId={user}&seriesId={id}
```

---

## ملاحظات مهمة (Updated)

1. **الـ `seriesId` اختياري:** ✅ الـ backend يختاره تلقائياً إذا لم يتم إرساله
   - لكن يُفضل إرساله لتجنب اختيار خاطئ
2. **الـ Document Series يجب أن يكون active:** `isActive === true`
3. **الـ Project ID يجب أن يطابق:** `series.projectId === projectId`
4. **الـ Document Type ID يجب أن يطابق:** `series.documentTypeId === documentTypeId`
5. **يُفضل استخدام Default Series:** `isDefault === true`
6. **لا يوجد `isDeleted` field في الـ response:** ⚠️ الكود يجب أن يتعامل مع هذا
7. **`documentTypeName` و `projectName` قد يكونان `null`:** ⚠️ يجب التحقق من null

---

## مثال كامل للـ Flow

```typescript
// 1. Get documentTypeId and projectId
const documentTypeId = 7;
const projectId = 1;

// 2. Load Document Series
const series = await this.documentTypesService
  .getDocumentSeriesByDocumentTypeId(documentTypeId)
  .toPromise();

// 3. Filter and select
const activeSeries = series
  .filter(s => s.projectId === projectId)
  .filter(s => s.isActive === true);
  
const selectedSeries = activeSeries.find(s => s.isDefault) || activeSeries[0];
const seriesId = selectedSeries.id;

// 4. Create Draft
const draft = await this.formSubmissionsService
  .createDraft(formBuilderId, projectId, userId, seriesId)
  .toPromise();
```

---

## إذا كان الـ Backend مختلف

إذا كان الـ backend response structure مختلف، يجب تحديث:

1. **`document-types.service.ts`** - Method `getDocumentSeriesByDocumentTypeId`
2. **`form-view.component.ts`** - Logic for filtering and selecting series
3. **Error handling** - للتعامل مع different error formats

