# 📋 Required Endpoints for FIELD_DATA_SOURCES & FORM_RULES Task

## 🎯 Overview

This document lists all required endpoints for implementing the **FIELD_DATA_SOURCES** and **FORM_RULES** functionality.

---

## 1️⃣ FIELD_DATA_SOURCES Endpoints

### ✅ **Admin Endpoints** (Require Authorization)

#### **1.1 Get All Field Data Sources**
```
GET /api/FieldDataSources
Authorization: Bearer {token}
```
**Purpose:** Get all data sources (for admin panel)
**Response:** List of all field data sources

---

#### **1.2 Get Data Source by ID**
```
GET /api/FieldDataSources/{id}
Authorization: Bearer {token}
```
**Purpose:** Get specific data source details
**Response:** Single field data source

---

#### **1.3 Get Data Sources by Field ID**
```
GET /api/FieldDataSources/field/{fieldId}
Authorization: Bearer {token}
```
**Purpose:** Get all data sources for a specific field
**Response:** List of data sources for the field

---

#### **1.4 Get Active Data Sources by Field ID**
```
GET /api/FieldDataSources/field/{fieldId}/active
Authorization: Bearer {token}
```
**Purpose:** Get only active data sources for a field
**Response:** List of active data sources

---

#### **1.5 Get Data Source by Field ID and Type**
```
GET /api/FieldDataSources/field/{fieldId}/type/{sourceType}
Authorization: Bearer {token}
```
**Purpose:** Get data source by field and source type (Static/API/LookupTable)
**Response:** Single field data source

---

#### **1.6 Get Data Sources Count**
```
GET /api/FieldDataSources/field/{fieldId}/count
Authorization: Bearer {token}
```
**Purpose:** Get count of data sources for a field
**Response:** Count number

---

#### **1.7 Create Field Data Source**
```
POST /api/FieldDataSources
Authorization: Bearer {token}
Content-Type: application/json

{
  "fieldId": 1,
  "sourceType": "Api",
  "apiUrl": "https://api.example.com/customers",
  "httpMethod": "GET",
  "valuePath": "id",
  "textPath": "name",
  "isActive": true
}
```
**Purpose:** Create a new data source configuration
**Response:** Created data source

---

#### **1.8 Create Bulk Field Data Sources**
```
POST /api/FieldDataSources/bulk
Authorization: Bearer {token}
Content-Type: application/json

[
  {
    "fieldId": 1,
    "sourceType": "Static",
    "isActive": true
  },
  {
    "fieldId": 2,
    "sourceType": "Api",
    "apiUrl": "https://api.example.com/customers",
    "httpMethod": "GET",
    "valuePath": "id",
    "textPath": "name",
    "isActive": true
  }
]
```
**Purpose:** Create multiple data sources at once
**Response:** List of created data sources

---

#### **1.9 Update Field Data Source**
```
PUT /api/FieldDataSources/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "sourceType": "Api",
  "apiUrl": "https://api.example.com/customers",
  "httpMethod": "GET",
  "valuePath": "id",
  "textPath": "name",
  "isActive": true
}
```
**Purpose:** Update existing data source
**Response:** Updated data source

---

#### **1.10 Delete Field Data Source (Hard Delete)**
```
DELETE /api/FieldDataSources/{id}
Authorization: Bearer {token}
```
**Purpose:** Permanently delete a data source
**Response:** Success message

---

#### **1.11 Soft Delete Field Data Source**
```
DELETE /api/FieldDataSources/soft-delete/{id}
Authorization: Bearer {token}
```
**Purpose:** Soft delete (deactivate) a data source
**Response:** Success message

---

#### **1.12 Preview Data Source (Admin)**
```
POST /api/FieldDataSources/preview
Authorization: Bearer {token}
Content-Type: application/json

{
  "sourceType": "Api",
  "apiUrl": "https://randomuser.me/api/?results=10",
  "httpMethod": "GET",
  "valuePath": "login.uuid",
  "textPath": "name.first"
}
```
**Purpose:** Test/preview data source without saving
**Response:** List of options that would be returned

---

#### **1.13 Get Available Lookup Tables**
```
GET /api/FieldDataSources/lookup-tables
Authorization: Bearer {token}
```
**Purpose:** Get list of available database tables for LookupTable source type
**Response:** List of available tables with their columns

---

### ✅ **Public Endpoints** (No Authorization Required)

#### **1.14 Get Field Options (GET)**
```
GET /api/FieldDataSources/field-options?fieldId={fieldId}&context={contextJson}
```
**Purpose:** Get options for a field (used by frontend when rendering form)
**Parameters:**
- `fieldId` (required): Field ID
- `context` (optional): JSON string with context (e.g., `{"LegalEntityId": 1}`)
**Response:**
```json
{
  "statusCode": 200,
  "message": "Field options retrieved successfully",
  "data": [
    { "value": "1", "text": "Option 1" },
    { "value": "2", "text": "Option 2" }
  ]
}
```

---

#### **1.15 Get Field Options (POST)**
```
POST /api/FieldDataSources/field-options
Content-Type: application/json

{
  "fieldId": 1,
  "context": {
    "LegalEntityId": 1
  },
  "requestBodyJson": "{\"filter\": \"active\"}"
}
```
**Purpose:** Get options with complex request body (for API data sources)
**Response:** Same as GET endpoint

---

## 2️⃣ FORM_RULES Endpoints

### ✅ **Admin Endpoints** (Require Authorization)

#### **2.1 Get All Rules**
```
GET /api/FormRules
Authorization: Bearer {token}
```
**Purpose:** Get all form rules
**Response:** List of all rules

---

#### **2.2 Get Rule by ID**
```
GET /api/FormRules/{id}
Authorization: Bearer {token}
```
**Purpose:** Get specific rule details
**Response:** Single rule

---

#### **2.3 Get Rules by Form ID**
```
GET /api/FormRules/form/{formBuilderId}
Authorization: Bearer {token}
```
**Purpose:** Get all rules for a specific form
**Response:** List of rules for the form

---

#### **2.4 Get Active Rules by Form ID**
```
GET /api/FormRules/form/{formBuilderId}/active
Authorization: Bearer {token}
```
**Purpose:** Get only active rules for a form
**Response:** List of active rules

---

#### **2.5 Create Rule**
```
POST /api/FormRules
Authorization: Bearer {token}
Content-Type: application/json

{
  "formBuilderId": 1,
  "ruleName": "Show Company Name When HasCompany is True",
  "ruleJson": "{\"conditions\":[{\"field\":\"HasCompany\",\"operator\":\"equals\",\"value\":true}],\"actions\":[{\"type\":\"show\",\"field\":\"CompanyName\"}]}",
  "isActive": true
}
```
**Purpose:** Create a new form rule
**Response:** Created rule

---

#### **2.6 Create Bulk Rules**
```
POST /api/FormRules/bulk
Authorization: Bearer {token}
Content-Type: application/json

[
  {
    "formBuilderId": 1,
    "ruleName": "Rule 1",
    "ruleJson": "{...}",
    "isActive": true
  },
  {
    "formBuilderId": 1,
    "ruleName": "Rule 2",
    "ruleJson": "{...}",
    "isActive": true
  }
]
```
**Purpose:** Create multiple rules at once
**Response:** List of created rules

---

#### **2.7 Update Rule**
```
PUT /api/FormRules/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "formBuilderId": 1,
  "ruleName": "Updated Rule Name",
  "ruleJson": "{...}",
  "isActive": true
}
```
**Purpose:** Update existing rule
**Response:** No content (204)

---

#### **2.8 Delete Rule**
```
DELETE /api/FormRules/{id}
Authorization: Bearer {token}
```
**Purpose:** Delete a rule
**Response:** No content (204)

---

#### **2.9 Check Rule Name Unique**
```
GET /api/FormRules/check-name/{ruleName}/form/{formBuilderId}?ignoreId={id}
Authorization: Bearer {token}
```
**Purpose:** Check if rule name is unique within a form
**Response:**
```json
{
  "formBuilderId": 1,
  "ruleName": "My Rule",
  "isUnique": true,
  "message": "Rule name is available"
}
```

---

#### **2.10 Check Rule Exists**
```
GET /api/FormRules/{id}/exists
Authorization: Bearer {token}
```
**Purpose:** Check if rule exists
**Response:**
```json
{
  "id": 1,
  "exists": true,
  "message": "Rule exists"
}
```

---

#### **2.11 Get Rules Statistics**
```
GET /api/FormRules/stats
Authorization: Bearer {token}
```
**Purpose:** Get statistics about rules
**Response:**
```json
{
  "totalRules": 10,
  "activeRules": 8,
  "inactiveRules": 2,
  "rulesByForm": [
    {
      "formBuilderId": 1,
      "count": 5,
      "activeCount": 4
    }
  ]
}
```

---

## 3️⃣ Form Builder Endpoints (Related)

### ✅ **Public Endpoints**

#### **3.1 Get Form by Code**
```
GET /api/FormBuilder/code/{formCode}
```
**Purpose:** Get form schema with fields, data sources, and rules (for frontend rendering)
**Response:** Complete form schema including:
- Form details
- Tabs
- Fields (with data source configuration)
- Rules

---

#### **3.2 Get Form by ID**
```
GET /api/FormBuilder/{id}
Authorization: Bearer {token}
```
**Purpose:** Get form details (admin)
**Response:** Form details

---

## 📊 Summary Table

| Category | Endpoint Count | Purpose |
|----------|---------------|---------|
| **FIELD_DATA_SOURCES (Admin)** | 13 | Manage data source configurations |
| **FIELD_DATA_SOURCES (Public)** | 2 | Get options for form rendering |
| **FORM_RULES (Admin)** | 11 | Manage form rules |
| **Form Builder (Related)** | 2 | Get form schema |
| **TOTAL** | **28** | Complete functionality |

---

## 🔑 Key Endpoints for Frontend

### **When Rendering Form:**
1. `GET /api/FormBuilder/code/{formCode}` - Get form schema
2. `GET /api/FieldDataSources/field-options?fieldId={id}` - Get options for each field
3. `GET /api/FormRules/form/{formBuilderId}/active` - Get active rules

### **When Admin Configures:**
1. `POST /api/FieldDataSources` - Create data source
2. `POST /api/FieldDataSources/preview` - Preview data source
3. `POST /api/FormRules` - Create rule
4. `GET /api/FieldDataSources/lookup-tables` - Get available tables

---

## ✅ Implementation Checklist

- [x] FIELD_DATA_SOURCES endpoints (15 endpoints)
- [x] FORM_RULES endpoints (11 endpoints)
- [x] Form Builder endpoints (2 endpoints)
- [ ] Frontend integration
- [ ] Rule engine implementation
- [ ] Validation on submit

---

## 📚 Related Documentation

- `ANGULAR_DATASOURCE_ENDPOINTS.md` - Frontend integration guide
- `TEST_FIELD_DATASOURCES_ENDPOINTS.md` - Testing guide
- `DATASOURCE_ENDPOINTS_COMPLETE.md` - Complete endpoint documentation
