# Backend Requirements - Database Tables (LookupTable) Data Source

## 📋 Overview
هذا الملف يوضح جميع الـ endpoints و JSON structures المطلوبة في الـ backend للـ Database Tables (LookupTable) Data Source.

---

## 🔌 Required Endpoints

### 1. GET - Get Available Lookup Tables
**Endpoint:** `GET /api/FieldDataSources/lookup-tables`

**Description:** جلب قائمة جميع الجداول المتاحة للاستخدام كـ LookupTable

**Authorization:** Required (Administration)

**Response Formats (أي من هذه الصيغ مقبولة):**

```json
// Format 1: ApiResponse wrapper
{
  "success": true,
  "data": ["TblBanks", "TblAssets", "TblAttachmentsTypes", "TblApprovalTemplates"],
  "message": null
}

// Format 2: Direct array
["TblBanks", "TblAssets", "TblAttachmentsTypes", "TblApprovalTemplates"]

// Format 3: Object array with name property
{
  "data": [
    { "name": "TblBanks" },
    { "name": "TblAssets" },
    { "name": "TblAttachmentsTypes" }
  ]
}
```

**Expected Response:** Array of table names (strings)

---

### 2. GET - Get Table Columns ⚠️ NEW ENDPOINT NEEDED
**Endpoint:** `GET /api/FieldDataSources/lookup-tables/{tableName}/columns`

**Description:** جلب أعمدة جدول معين (للـ LookupTable)

**Authorization:** Required (Administration)

**Parameters:**
- `tableName` (path parameter): اسم الجدول (مثل: `TblBanks`)

**Example Request:**
```
GET /api/FieldDataSources/lookup-tables/TblBanks/columns
```

**Response Formats (أي من هذه الصيغ مقبولة):**

```json
// Format 1: ApiResponse wrapper
{
  "success": true,
  "data": ["Id", "Name", "Code", "Description", "IsActive"],
  "message": null
}

// Format 2: Direct array
["Id", "Name", "Code", "Description", "IsActive"]

// Format 3: Object array
{
  "data": [
    { "name": "Id" },
    { "name": "Name" },
    { "name": "Code" }
  ]
}

// Format 4: Columns property
{
  "columns": ["Id", "Name", "Code", "Description"]
}
```

**Expected Response:** Array of column names (strings)

**Error Handling:**
- `404 Not Found`: إذا كان الجدول غير موجود
- `500 Internal Server Error`: في حالة خطأ في قاعدة البيانات

**Note:** إذا لم يكن هذا الـ endpoint موجوداً، سيحاول الـ frontend استخراج الأعمدة من preview data كـ fallback.

---

### 3. POST - Preview Data Source
**Endpoint:** `POST /api/FieldDataSources/preview`

**Description:** معاينة البيانات من Data Source قبل الحفظ (للاختبار)

**Authorization:** Required (Administration)

**Request Body:**

```json
{
  "fieldId": 0,  // 0 for new fields, actual ID for existing fields
  "sourceType": "LookupTable",  // "Api" | "LookupTable" | "Custom"
  "apiUrl": "TblBanks",  // For LookupTable: table name only (NOT JSON object)
  "httpMethod": "GET",  // Optional, defaults to "GET"
  "requestBodyJson": null,  // Optional, for API sources only
  "valuePath": "Id",  // Column name for value (e.g., "Id", "Code")
  "textPath": "Name"  // Column name for text (e.g., "Name", "Description")
}
```

**Important Notes for LookupTable:**
- `apiUrl` يجب أن يكون **اسم الجدول فقط** (string)، مثل: `"TblBanks"`
- **لا ترسل JSON object** في `apiUrl` للـ LookupTable
- `valuePath` و `textPath` هما أسماء الأعمدة في الجدول

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "value": "1",
      "text": "Bank Name 1"
    },
    {
      "value": "2",
      "text": "Bank Name 2"
    }
  ],
  "message": null
}
```

**Backend Implementation Notes:**
1. للـ LookupTable:
   - استخدم `apiUrl` كاسم الجدول
   - استخدم `valuePath` كاسم عمود القيمة (مثل: `Id`)
   - استخدم `textPath` كاسم عمود النص (مثل: `Name`)
   - قم ببناء SQL query مثل: `SELECT {valuePath} as Value, {textPath} as Text FROM {apiUrl}`
   - مثال: `SELECT Id as Value, Name as Text FROM TblBanks`

2. يجب أن ترجع البيانات الخام من الجدول (قبل المعالجة) إذا أمكن، حتى يتمكن الـ frontend من استخراج الأعمدة

---

### 4. POST - Create Field Data Source
**Endpoint:** `POST /api/FieldDataSources`

**Description:** إنشاء Data Source جديد

**Authorization:** Required (Administration)

**Request Body:**

```json
{
  "fieldId": 123,
  "sourceType": "LookupTable",
  "apiUrl": "TblBanks",  // For LookupTable: table name only (string)
  "httpMethod": "GET",  // Optional
  "requestBodyJson": null,  // Optional, for API sources only
  "valuePath": "Id",  // Column name for value
  "textPath": "Name",  // Column name for text
  "isActive": true
}
```

**Important:** 
- `apiUrl` للـ LookupTable يجب أن يكون **string فقط** (اسم الجدول)
- **لا ترسل JSON object** في `apiUrl`

---

### 5. PUT - Update Field Data Source
**Endpoint:** `PUT /api/FieldDataSources/{id}`

**Description:** تحديث Data Source موجود

**Authorization:** Required (Administration)

**Request Body:** نفس `CreateFieldDataSourceDto`

---

## 📊 JSON Structures

### PreviewDataSourceRequestDto
```typescript
{
  fieldId: number;              // 0 for new fields
  sourceType: string;           // "Api" | "LookupTable" | "Custom"
  apiUrl?: string;              // For LookupTable: table name (e.g., "TblBanks")
  httpMethod?: string;          // "GET" | "POST" (optional, defaults to "GET")
  requestBodyJson?: string;     // JSON string for POST requests (API only)
  valuePath?: string;           // Column name for value (e.g., "Id")
  textPath?: string;            // Column name for text (e.g., "Name")
}
```

### CreateFieldDataSourceDto / UpdateFieldDataSourceDto
```typescript
{
  fieldId: number;
  sourceType: string;            // "Api" | "LookupTable" | "Custom"
  apiUrl: string;               // For LookupTable: table name (string only)
  httpMethod?: string;          // "GET" | "POST"
  requestBodyJson?: string;     // JSON string (API sources only)
  valuePath?: string;           // Column name for value
  textPath?: string;            // Column name for text
  isActive: boolean;
}
```

### FieldOptionResponse (Preview Response)
```typescript
{
  value: string | number;       // Value from valuePath column
  text: string;                 // Text from textPath column
}
```

### ApiResponse<T>
```typescript
{
  success?: boolean;
  data?: T;
  message?: string;
  errors?: any;
}
```

---

## 🔍 Frontend Usage Flow

### 1. Load Available Tables
```typescript
// Frontend calls:
GET /api/FieldDataSources/lookup-tables

// Response: ["TblBanks", "TblAssets", ...]
// Frontend populates dropdown with table names
```

### 2. Load Table Columns (NEW)
```typescript
// Frontend calls:
GET /api/FieldDataSources/lookup-tables/TblBanks/columns

// Response: ["Id", "Name", "Code", "Description", ...]
// Frontend shows available columns as clickable tags
```

### 3. Preview Data Source
```typescript
// Frontend calls:
POST /api/FieldDataSources/preview
{
  "fieldId": 0,
  "sourceType": "LookupTable",
  "apiUrl": "TblBanks",
  "valuePath": "Id",
  "textPath": "Name"
}

// Response: 
{
  "data": [
    { "value": "1", "text": "Bank 1" },
    { "value": "2", "text": "Bank 2" }
  ]
}
```

### 4. Save Data Source
```typescript
// Frontend calls:
POST /api/FieldDataSources
{
  "fieldId": 123,
  "sourceType": "LookupTable",
  "apiUrl": "TblBanks",  // String only, NOT JSON
  "valuePath": "Id",
  "textPath": "Name",
  "isActive": true
}
```

---

## ⚠️ Important Notes

### 1. apiUrl Format for LookupTable
- ✅ **Correct:** `"apiUrl": "TblBanks"` (string)
- ❌ **Wrong:** `"apiUrl": "{\"table\":\"TblBanks\"}"` (JSON string)
- ❌ **Wrong:** `"apiUrl": {"table": "TblBanks"}` (JSON object)

### 2. Column Names
- Use exact column names from database (case-sensitive in some databases)
- Common patterns: `Id`, `Name`, `Code`, `Description`
- Frontend will show available columns if endpoint `/columns` is implemented

### 3. SQL Query Construction
```sql
-- Backend should construct query like:
SELECT 
  {valuePath} as Value,
  {textPath} as Text
FROM {apiUrl}
WHERE IsActive = 1  -- Optional: filter active records
ORDER BY {textPath}  -- Optional: order by text column
```

### 4. Error Handling
- Return proper HTTP status codes (404, 500, etc.)
- Include error messages in response
- Frontend will show user-friendly error messages

---

## ✅ Checklist for Backend Implementation

### Endpoints
- [x] `GET /api/FieldDataSources/lookup-tables` - Returns list of available tables (should exist)
- [ ] `GET /api/FieldDataSources/lookup-tables/{tableName}/columns` - Returns table columns ⚠️ **NEW - NEEDS IMPLEMENTATION**
- [x] `POST /api/FieldDataSources/preview` - Handles LookupTable sourceType correctly (should exist, verify)
- [x] `POST /api/FieldDataSources` - Accepts table name as string in apiUrl for LookupTable (should exist, verify)
- [x] `PUT /api/FieldDataSources/{id}` - Updates LookupTable correctly (should exist, verify)

### Implementation Details
- [ ] SQL queries use valuePath and textPath correctly
- [ ] `apiUrl` for LookupTable is stored/used as **string only** (table name)
- [ ] Error handling for invalid table names (404)
- [ ] Error handling for invalid column names (400)
- [ ] Returns data in ApiResponse format
- [ ] Preview endpoint returns raw table data (if possible) for column extraction

### Testing
- [ ] Test with table name: `TblBanks`
- [ ] Test with table name: `TblAssets`
- [ ] Test with invalid table name
- [ ] Test with invalid column names
- [ ] Verify apiUrl is stored as string, not JSON

---

## 🧪 Testing Examples

### Test 1: Get Available Tables
```bash
GET /api/FieldDataSources/lookup-tables
Expected: ["TblBanks", "TblAssets", ...]
```

### Test 2: Get Table Columns
```bash
GET /api/FieldDataSources/lookup-tables/TblBanks/columns
Expected: ["Id", "Name", "Code", "Description", ...]
```

### Test 3: Preview LookupTable
```bash
POST /api/FieldDataSources/preview
Body: {
  "fieldId": 0,
  "sourceType": "LookupTable",
  "apiUrl": "TblBanks",
  "valuePath": "Id",
  "textPath": "Name"
}
Expected: {
  "data": [
    { "value": "1", "text": "Bank 1" },
    { "value": "2", "text": "Bank 2" }
  ]
}
```

### Test 4: Create LookupTable Data Source
```bash
POST /api/FieldDataSources
Body: {
  "fieldId": 123,
  "sourceType": "LookupTable",
  "apiUrl": "TblBanks",
  "valuePath": "Id",
  "textPath": "Name",
  "isActive": true
}
Expected: Created FieldDataSource object
```

---

## 📝 Summary

**Required Endpoints:**
1. ✅ `GET /api/FieldDataSources/lookup-tables` (should exist)
2. ⚠️ `GET /api/FieldDataSources/lookup-tables/{tableName}/columns` (NEW - needs implementation)
3. ✅ `POST /api/FieldDataSources/preview` (should exist, verify LookupTable handling)
4. ✅ `POST /api/FieldDataSources` (should exist, verify apiUrl format)
5. ✅ `PUT /api/FieldDataSources/{id}` (should exist)

**Key Points:**
- `apiUrl` for LookupTable must be **string only** (table name)
- Backend should construct SQL: `SELECT {valuePath} as Value, {textPath} as Text FROM {apiUrl}`
- New endpoint needed for getting table columns
- All responses should use ApiResponse wrapper format

