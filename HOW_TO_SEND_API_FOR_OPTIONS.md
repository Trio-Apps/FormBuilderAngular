# كيفية إرسال API لعرض البيانات في الخيارات

## نظرة عامة

عند استخدام **API Link** كـ DataSource، النظام يرسل طلب API تلقائياً لجلب البيانات وعرضها كخيارات في الحقل.

---

## الطريقة 1: استخدام Preview (للمعاينة قبل الحفظ)

### الخطوات:

1. **اختر نوع DataSource:**
   - اختر "API Link" من الخيارات الثلاثة

2. **اختر HTTP Method:**
   - **GET**: للطلبات البسيطة بدون body
   - **POST**: للطلبات التي تحتاج body

3. **أدخل API URL:**
   ```
   https://jsonplaceholder.typicode.com/users
   ```

4. **إذا اخترت POST، أدخل Request Body:**
   ```json
   {
     "filter": "active",
     "status": "enabled"
   }
   ```

5. **اضغط على زر "Refresh":**
   - سيتم إرسال طلب API تلقائياً
   - البيانات ستظهر في قسم "Preview Options"

---

## الطريقة 2: كيف يعمل النظام من الداخل

### 1. عند الضغط على "Refresh":

النظام يرسل طلب **POST** إلى:
```
POST https://localhost:7276/api/FieldDataSources/preview
```

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

### 2. الـ Backend يستقبل الطلب ويقوم بـ:

- إرسال طلب إلى الـ API المحدد (`apiUrl`)
- استخراج البيانات من الـ response
- استخراج `value` و `text` من البيانات باستخدام `valuePath` و `textPath`
- إرجاع البيانات في صيغة:
  ```json
  {
    "success": true,
    "data": [
      {
        "value": "1",
        "text": "Leanne Graham"
      },
      {
        "value": "2",
        "text": "Ervin Howell"
      }
    ]
  }
  ```

### 3. الـ Frontend يعرض البيانات:

- البيانات تظهر في قسم "Preview Options"
- كل خيار يعرض: `id: 1` و `name: Leanne Graham`

---

## أمثلة عملية

### مثال 1: API بسيط (GET)

**API URL:**
```
https://jsonplaceholder.typicode.com/users
```

**HTTP Method:** GET

**Response من API:**
```json
[
  {
    "id": 1,
    "name": "Leanne Graham",
    "username": "Bret"
  },
  {
    "id": 2,
    "name": "Ervin Howell",
    "username": "Antonette"
  }
]
```

**ValuePath:** `id`
**TextPath:** `name`

**النتيجة في Preview Options:**
```
id: 1    name: Leanne Graham
id: 2    name: Ervin Howell
```

---

### مثال 2: API مع POST و Body

**API URL:**
```
https://your-api.com/api/users/search
```

**HTTP Method:** POST

**Request Body:**
```json
{
  "filter": "active",
  "department": "IT"
}
```

**Response من API:**
```json
{
  "success": true,
  "data": [
    {
      "userId": 101,
      "userName": "Ahmed Ali",
      "email": "ahmed@example.com"
    },
    {
      "userId": 102,
      "userName": "Mohamed Hassan",
      "email": "mohamed@example.com"
    }
  ]
}
```

**ValuePath:** `data[].userId` أو `userId`
**TextPath:** `data[].userName` أو `userName`

---

### مثال 3: API من نفس النظام

**API URL:**
```
https://localhost:7276/api/FieldDataSources/field-options?fieldId=123
```

**HTTP Method:** GET

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

**ValuePath:** `data[].value` أو `value`
**TextPath:** `data[].text` أو `text`

---

## متطلبات الـ API Response

### الصيغة المطلوبة:

الـ API يجب أن يرجع البيانات في إحدى الصيغ التالية:

#### الصيغة 1: Array مباشرة
```json
[
  {"id": 1, "name": "Option 1"},
  {"id": 2, "name": "Option 2"}
]
```

#### الصيغة 2: Object مع data property
```json
{
  "data": [
    {"id": 1, "name": "Option 1"},
    {"id": 2, "name": "Option 2"}
  ]
}
```

#### الصيغة 3: Object مع items property
```json
{
  "items": [
    {"id": 1, "name": "Option 1"},
    {"id": 2, "name": "Option 2"}
  ]
}
```

---

## ValuePath و TextPath

هذه المسارات تحدد من أين يتم استخراج `value` و `text` من الـ response.

### أمثلة:

#### مثال 1: Response مباشر
```json
[
  {"id": 1, "name": "Option 1"}
]
```
- **ValuePath:** `id`
- **TextPath:** `name`

#### مثال 2: Response مع data wrapper
```json
{
  "data": [
    {"userId": 1, "userName": "Option 1"}
  ]
}
```
- **ValuePath:** `data[].userId` أو `userId`
- **TextPath:** `data[].userName` أو `userName`

#### مثال 3: Response مع nested structure
```json
{
  "result": {
    "items": [
      {"value": 1, "label": "Option 1"}
    ]
  }
}
```
- **ValuePath:** `result.items[].value`
- **TextPath:** `result.items[].label`

---

## اختبار API يدوياً

### باستخدام cURL:

```bash
# GET Request
curl -X GET "https://jsonplaceholder.typicode.com/users"

# POST Request
curl -X POST "https://your-api.com/api/users/search" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": "active"
  }'
```

### باستخدام Postman:

1. اختر HTTP Method (GET أو POST)
2. أدخل API URL
3. إذا POST، أضف Body (JSON)
4. اضغط Send
5. تحقق من Response Format

### باستخدام Browser Console:

```javascript
// GET Request
fetch('https://jsonplaceholder.typicode.com/users')
  .then(res => res.json())
  .then(data => console.log(data));

// POST Request
fetch('https://your-api.com/api/users/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filter: 'active'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## نصائح مهمة

### 1. CORS Issues:
إذا كان الـ API من domain مختلف، تأكد أن الـ Backend يدعم CORS.

### 2. Authentication:
إذا كان الـ API يحتاج authentication، يجب إضافته في الـ Backend.

### 3. Error Handling:
- إذا فشل الطلب، ستظهر رسالة خطأ
- تحقق من Console للأخطاء التفصيلية

### 4. Response Format:
- تأكد أن الـ API يرجع البيانات في صيغة صحيحة
- استخدم ValuePath و TextPath الصحيحة

### 5. Performance:
- الـ API يجب أن يرجع البيانات بسرعة
- تجنب APIs التي تأخذ وقت طويل

---

## مثال كامل خطوة بخطوة

### الخطوة 1: إعداد الحقل

1. افتح "Add Field" modal
2. اختر Field Type: **Select**
3. في DataSource، اختر: **API Link**

### الخطوة 2: إعداد API

1. اختر HTTP Method: **GET**
2. أدخل API URL:
   ```
   https://jsonplaceholder.typicode.com/users
   ```
3. ValuePath: `id` (افتراضي)
4. TextPath: `name` (افتراضي)

### الخطوة 3: Preview

1. اضغط على زر **"Refresh"**
2. انتظر قليلاً
3. ستظهر البيانات في "Preview Options":
   ```
   id: 1    name: Leanne Graham
   id: 2    name: Ervin Howell
   id: 3    name: Clementine Bauch
   ...
   ```

### الخطوة 4: الحفظ

1. إذا كانت البيانات صحيحة، اضغط **"Create Field"**
2. الـ DataSource سيتم حفظه تلقائياً
3. عند استخدام النموذج، الخيارات ستُحمّل من الـ API

---

## استكشاف الأخطاء

### المشكلة: "No options found"

**الأسباب المحتملة:**
1. الـ API URL غير صحيح
2. الـ API لا يرجع بيانات
3. ValuePath أو TextPath غير صحيحة
4. مشكلة في CORS
5. الـ API يحتاج authentication

**الحل:**
- تحقق من API URL في Postman أو Browser
- تحقق من Response Format
- تحقق من ValuePath و TextPath

### المشكلة: "Failed to preview DataSource"

**الأسباب المحتملة:**
1. الـ API غير متاح
2. خطأ في الـ Backend
3. مشكلة في Network

**الحل:**
- تحقق من Console للأخطاء
- تحقق من الـ Backend logs
- تأكد من أن الـ API يعمل

---

## ملاحظات نهائية

1. **Preview يعمل قبل الحفظ:** يمكنك تجربة API قبل حفظ الحقل
2. **البيانات الحية:** عند استخدام النموذج، البيانات تُحمّل من API مباشرة
3. **Caching:** الـ Backend قد يقوم بـ cache البيانات لتحسين الأداء
4. **Security:** تأكد من أن الـ API آمن ولا يعرض بيانات حساسة

