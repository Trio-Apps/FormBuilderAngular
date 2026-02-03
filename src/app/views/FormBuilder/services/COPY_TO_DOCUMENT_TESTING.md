# دليل اختبار CopyToDocument Service

## نظرة عامة

تم إنشاء ملف Test كامل للـ `CopyToDocumentService` باستخدام Jasmine و Angular Testing Utilities.

---

## الملفات

- **Test File:** `copy-to-document.service.spec.ts`
- **Service:** `copy-to-document.service.ts`

---

## كيفية تشغيل الـ Tests

### 1. تشغيل جميع الـ Tests

```bash
ng test
```

### 2. تشغيل Test محدد

```bash
ng test --include='**/copy-to-document.service.spec.ts'
```

### 3. تشغيل Test مع Watch Mode

```bash
ng test --watch
```

### 4. تشغيل Test مع Coverage

```bash
ng test --code-coverage
```

---

## الـ Tests المُنفذة

### ✅ 1. executeCopyToDocument

- ✅ تنفيذ CopyToDocument بنجاح
- ✅ معالجة الاستجابة بدون wrapper
- ✅ معالجة الأخطاء
- ✅ معالجة التنفيذ الفاشل

### ✅ 2. getAuditRecords

- ✅ جلب Audit Records مع Pagination
- ✅ جلب Audit Records بدون params
- ✅ معالجة جميع Query Parameters

### ✅ 3. getAuditRecordById

- ✅ جلب Audit Record بالـ ID
- ✅ معالجة الخطأ عند عدم وجود السجل

### ✅ 4. getAuditRecordsBySubmission

- ✅ جلب Audit Records لـ Submission محدد
- ✅ إرجاع مصفوفة فارغة عند عدم وجود سجلات

### ✅ 5. getAuditRecordsByTargetDocument

- ✅ جلب Audit Records لمستند هدف محدد

### ✅ 6. Helper Methods

- ✅ `convertFieldMappingToArray` - تحويل Object إلى Array
- ✅ `convertFieldMappingToObject` - تحويل Array إلى Object

### ✅ 7. Integration Tests

- ✅ تنفيذ Copy ثم جلب Audit Records

---

## أمثلة على الـ Tests

### مثال 1: Test تنفيذ CopyToDocument

```typescript
it('should execute CopyToDocument successfully', () => {
  const request: CopyToDocumentRequestDto = {
    config: {
      targetDocumentTypeId: 2,
      targetFormId: 1,
      createNewDocument: true,
      fieldMapping: {
        "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
      },
      gridMapping: {},
      copyCalculatedFields: true,
      copyGridRows: true,
      startWorkflow: false,
      linkDocuments: true,
      copyMetadata: false,
      metadataFields: []
    },
    sourceSubmissionId: 1,
    actionId: null,
    ruleId: null
  };

  const mockResponse: ApiResponse<CopyToDocumentResultDto> = {
    success: true,
    data: {
      success: true,
      targetDocumentId: 100,
      targetDocumentNumber: "DOC-2024-001",
      fieldsCopied: 5,
      gridRowsCopied: 3,
      sourceSubmissionId: 1
    }
  };

  service.executeCopyToDocument(request).subscribe(result => {
    expect(result.success).toBe(true);
    expect(result.targetDocumentId).toBe(100);
    expect(result.targetDocumentNumber).toBe("DOC-2024-001");
  });

  const req = httpMock.expectOne(`${baseUrl}/execute`);
  expect(req.request.method).toBe('POST');
  req.flush(mockResponse);
});
```

### مثال 2: Test معالجة الأخطاء

```typescript
it('should handle error response', () => {
  const request: CopyToDocumentRequestDto = { /* ... */ };

  const mockErrorResponse = {
    status: 400,
    statusText: 'Bad Request',
    error: {
      message: 'Invalid request data'
    }
  };

  service.executeCopyToDocument(request).subscribe({
    next: () => fail('should have failed with 400 error'),
    error: (error) => {
      expect(error.status).toBe(400);
      expect(error.error.message).toBe('Invalid request data');
    }
  });

  const req = httpMock.expectOne(`${baseUrl}/execute`);
  req.flush(mockErrorResponse, { status: 400, statusText: 'Bad Request' });
});
```

### مثال 3: Test Helper Methods

```typescript
it('should convert field mapping object to array', () => {
  const fieldMapping = {
    "SOURCE_FIELD_1": "TARGET_FIELD_1",
    "SOURCE_FIELD_2": "TARGET_FIELD_2"
  };

  const result = service.convertFieldMappingToArray(fieldMapping);

  expect(result.length).toBe(2);
  expect(result[0]).toEqual({
    sourceFieldCode: "SOURCE_FIELD_1",
    targetFieldCode: "TARGET_FIELD_1"
  });
});
```

---

## بنية الـ Test File

```typescript
describe('CopyToDocumentService', () => {
  let service: CopyToDocumentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // Setup TestBed
  });

  afterEach(() => {
    // Verify no pending requests
  });

  describe('executeCopyToDocument', () => {
    // Tests for executeCopyToDocument
  });

  describe('getAuditRecords', () => {
    // Tests for getAuditRecords
  });

  // ... more test suites
});
```

---

## Mock Data Examples

### Mock Request

```typescript
const request: CopyToDocumentRequestDto = {
  config: {
    targetDocumentTypeId: 2,
    targetFormId: 1,
    createNewDocument: true,
    fieldMapping: {
      "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
    },
    gridMapping: {},
    copyCalculatedFields: true,
    copyGridRows: true,
    startWorkflow: false,
    linkDocuments: true,
    copyMetadata: false,
    metadataFields: []
  },
  sourceSubmissionId: 1,
  actionId: null,
  ruleId: null
};
```

### Mock Response

```typescript
const mockResponse: ApiResponse<CopyToDocumentResultDto> = {
  success: true,
  data: {
    success: true,
    targetDocumentId: 100,
    targetDocumentNumber: "DOC-2024-001",
    fieldsCopied: 5,
    gridRowsCopied: 3,
    sourceSubmissionId: 1
  }
};
```

### Mock Audit Record

```typescript
const mockAudit: CopyToDocumentAuditDto = {
  id: 1,
  sourceSubmissionId: 1,
  targetDocumentId: 100,
  success: true,
  fieldsCopied: 5,
  gridRowsCopied: 3,
  targetDocumentNumber: "DOC-2024-001",
  executionDate: "2024-02-03T10:00:00",
  createdDate: "2024-02-03T10:00:00",
  isActive: true,
  isDeleted: false
};
```

---

## Coverage Goals

الهدف هو الحصول على **100% Coverage** للـ Service:

- ✅ جميع الـ Methods
- ✅ جميع الـ Error Cases
- ✅ جميع الـ Helper Methods
- ✅ Integration Scenarios

---

## تشغيل الـ Tests في CI/CD

### GitHub Actions Example

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: ng test --watch=false --browsers=ChromeHeadless
```

---

## Troubleshooting

### المشكلة: Tests تفشل بسبب CORS

**الحل:** تأكد من استخدام `HttpClientTestingModule` بدلاً من `HttpClientModule`

### المشكلة: Tests تفشل بسبب Mock Data

**الحل:** تأكد من تطابق بنية Mock Data مع الـ API Response الفعلية

### المشكلة: Tests تفشل بسبب Async Operations

**الحل:** استخدم `fakeAsync` و `tick()` أو `waitForAsync()` و `fixture.whenStable()`

---

## Best Practices

1. ✅ استخدم `HttpTestingController` لـ Mock HTTP Requests
2. ✅ تحقق من جميع الـ HTTP Methods والـ URLs
3. ✅ اختبر جميع الـ Error Cases
4. ✅ استخدم `afterEach` للتحقق من عدم وجود pending requests
5. ✅ استخدم Mock Data واقعية
6. ✅ اكتب Tests واضحة ومفهومة

---

## النتيجة المتوقعة

عند تشغيل الـ Tests، يجب أن تحصل على:

```
✅ CopyToDocumentService should be created
✅ executeCopyToDocument should execute CopyToDocument successfully
✅ executeCopyToDocument should handle API response without wrapper
✅ executeCopyToDocument should handle error response
✅ executeCopyToDocument should handle failed execution
✅ getAuditRecords should fetch audit records with pagination
✅ getAuditRecords should fetch audit records without params
✅ getAuditRecords should handle all query parameters
✅ getAuditRecordById should fetch audit record by id
✅ getAuditRecordById should handle error when audit record not found
✅ getAuditRecordsBySubmission should fetch audit records by submission id
✅ getAuditRecordsBySubmission should return empty array when no audit records found
✅ getAuditRecordsByTargetDocument should fetch audit records by target document id
✅ convertFieldMappingToArray should convert field mapping object to array
✅ convertFieldMappingToArray should return empty array for empty object
✅ convertFieldMappingToObject should convert field mapping array to object
✅ convertFieldMappingToObject should return empty object for empty array
✅ Integration Tests should execute copy and then fetch audit records

Total: 18 tests, 18 passed
```

---

**آخر تحديث:** 2024-02-03

