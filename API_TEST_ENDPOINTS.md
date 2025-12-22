# API Test Endpoints for Field DataSource

## Base URL
```
https://localhost:7276/api
```

---

## 1. Preview DataSource (Test API/LookupTable)
**Endpoint:** `POST /FieldDataSources/preview`

**Description:** اختبار DataSource قبل الحفظ (يعمل مع API و LookupTable)

**Authorization:** Required (Administration)

**Request Body:**
```json
{
  "fieldId": 0,
  "sourceType": "Api",
  "apiUrl": "https://jsonplaceholder.typicode.com/users",
  "httpMethod": "GET",
  "requestBodyJson": null,
  "valuePath": "id",
  "textPath": "name"
}
```

**أمثلة:**

### مثال 1: API DataSource (GET)
```json
{
  "fieldId": 0,
  "sourceType": "Api",
  "apiUrl": "https://jsonplaceholder.typicode.com/users",
  "httpMethod": "GET",
  "valuePath": "id",
  "textPath": "name"
}
```

### مثال 2: API DataSource (POST)
```json
{
  "fieldId": 0,
  "sourceType": "Api",
  "apiUrl": "https://your-api.com/api/users/search",
  "httpMethod": "POST",
  "requestBodyJson": "{\"filter\":\"active\"}",
  "valuePath": "id",
  "textPath": "name"
}
```

### مثال 3: LookupTable DataSource
```json
{
  "fieldId": 0,
  "sourceType": "LookupTable",
  "apiUrl": "TblWorkOrderExpenses",
  "valuePath": "Id",
  "textPath": "Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "1",
      "text": "Option 1"
    },
    {
      "value": "2",
      "text": "Option 2"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X POST "https://localhost:7276/api/FieldDataSources/preview" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fieldId": 0,
    "sourceType": "Api",
    "apiUrl": "https://jsonplaceholder.typicode.com/users",
    "httpMethod": "GET",
    "valuePath": "id",
    "textPath": "name"
  }'
```

---

## 2. Get Available Lookup Tables
**Endpoint:** `GET /FieldDataSources/lookup-tables`

**Description:** جلب قائمة الجداول المتاحة للـ LookupTable

**Authorization:** Required (Administration)

**Response:**
```json
{
  "success": true,
  "data": [
    "TblWorkOrderExpenses",
    "TblUsers",
    "TblProducts"
  ]
}
```

**cURL Example:**
```bash
curl -X GET "https://localhost:7276/api/FieldDataSources/lookup-tables" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. Get Field Options (Public)
**Endpoint:** `GET /FieldDataSources/field-options?fieldId={fieldId}&context={context}`

**Description:** جلب خيارات الحقل من DataSource (Public - لا يحتاج Authorization)

**Parameters:**
- `fieldId` (required): ID الحقل
- `context` (optional): JSON object للفلترة

**Example:**
```
GET /FieldDataSources/field-options?fieldId=123&context={"LegalEntityId":1}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "1",
      "text": "Option 1"
    },
    {
      "value": "2",
      "text": "Option 2"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "https://localhost:7276/api/FieldDataSources/field-options?fieldId=123" \
  -H "Content-Type: application/json"
```

---

## 4. Get Field Options (POST - with Body)
**Endpoint:** `POST /FieldDataSources/field-options`

**Description:** جلب خيارات الحقل مع Body (Public - لا يحتاج Authorization)

**Request Body:**
```json
{
  "fieldId": 123,
  "context": {
    "LegalEntityId": 1,
    "DepartmentId": 5
  },
  "requestBodyJson": null
}
```

**cURL Example:**
```bash
curl -X POST "https://localhost:7276/api/FieldDataSources/field-options" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldId": 123,
    "context": {
      "LegalEntityId": 1
    }
  }'
```

---

## Test APIs (Public APIs for Testing)

### JSONPlaceholder (Test Users API)
```
GET https://jsonplaceholder.typicode.com/users
```
**Response Structure:**
```json
[
  {
    "id": 1,
    "name": "Leanne Graham",
    "username": "Bret",
    "email": "Sincere@april.biz"
  }
]
```
**Use with:**
- `valuePath`: "id"
- `textPath`: "name" أو "username" أو "email"

### JSONPlaceholder (Test Posts API)
```
GET https://jsonplaceholder.typicode.com/posts
```
**Response Structure:**
```json
[
  {
    "id": 1,
    "title": "sunt aut facere repellat",
    "body": "quia et suscipit..."
  }
]
```
**Use with:**
- `valuePath`: "id"
- `textPath`: "title"

### ReqRes (Test Users API)
```
GET https://reqres.in/api/users
```
**Response Structure:**
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "George",
      "last_name": "Bluth",
      "email": "george.bluth@reqres.in"
    }
  ]
}
```
**Note:** هذا API يرجع البيانات في `data` array، قد تحتاج لتعديل الـ valuePath/textPath

---

## ملاحظات مهمة:

1. **Authorization:** معظم الـ endpoints تحتاج Bearer Token في Header
2. **CORS:** تأكد أن الـ API الخارجي يدعم CORS
3. **Response Format:** الـ API يجب أن يرجع بيانات بصيغة:
   - Array مباشرة: `[{id: 1, name: "..."}]`
   - أو في `data` property: `{data: [{id: 1, name: "..."}]}`
4. **ValuePath/TextPath:** استخدم المسارات الصحيحة حسب بنية الـ API response
5. **LookupTable:** اسم الجدول يجب أن يكون موجود في قاعدة البيانات

---

## Testing in Browser Console:

يمكنك اختبار الـ API مباشرة من Console:

```javascript
// Test Preview API
fetch('https://localhost:7276/api/FieldDataSources/preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    fieldId: 0,
    sourceType: 'Api',
    apiUrl: 'https://jsonplaceholder.typicode.com/users',
    httpMethod: 'GET',
    valuePath: 'id',
    textPath: 'name'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

