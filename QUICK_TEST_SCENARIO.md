# Quick Test Scenario - Rent Calculation

## Step-by-Step Testing Guide

### Step 1: Create Field Type
1. Go to **Field Types** management
2. Click **"+ Add New Field Type"**
3. Select **"Calculated"** from Type Name dropdown
4. Select **"Number (decimal)"** as Data Type (recommended)
5. Click **"+ Create Field Type"**

### Step 2: Create Source Fields

#### Field 1: RENT
- **Field Name**: Monthly Rent
- **Field Code**: `RENT`
- **Field Type**: Number
- **Data Type**: Decimal
- **Is Mandatory**: Yes
- **Is Editable**: Yes

#### Field 2: MONTHS
- **Field Name**: Number of Months
- **Field Code**: `MONTHS`
- **Field Type**: Number
- **Data Type**: Integer
- **Is Mandatory**: Yes
- **Is Editable**: Yes

#### Field 3: DISCOUNT
- **Field Name**: Discount Amount
- **Field Code**: `DISCOUNT`
- **Field Type**: Number
- **Data Type**: Decimal
- **Is Mandatory**: No
- **Is Editable**: Yes

### Step 3: Create Calculated Field

#### Field 4: TOTAL_RENT
- **Field Name**: Total Rent
- **Field Code**: `TOTAL_RENT`
- **Field Type**: **Calculated** (select the Calculated type you created)
- **Calculation Settings**:
  - **Calculation Mode**: Expression
  - **Result Type**: Decimal
  - **Recalculate On**: OnFieldChange
  - **Expression Text**: `([RENT] * [MONTHS]) - [DISCOUNT]`
- **Dependent Fields**: Should auto-show: RENT, MONTHS, DISCOUNT
- **Is Editable**: Automatically disabled (should be grayed out)
- **Is Mandatory**: Automatically disabled (should be grayed out)

### Step 4: Test the Calculation

1. **Create a Form Submission**
   - Navigate to form submissions
   - Create a new submission
   - Fill in the fields:
     - RENT: `1000`
     - MONTHS: `12`
     - DISCOUNT: `500`

2. **Verify Calculation**
   - TOTAL_RENT should automatically show: `11500`
   - The field should be read-only (you can't edit it)
   - It should have a calculator icon indicator

3. **Test Dynamic Update**
   - Change MONTHS from `12` to `6`
   - TOTAL_RENT should automatically update to: `5500`
   - Change RENT from `1000` to `2000`
   - TOTAL_RENT should automatically update to: `11500`

4. **Test Form Submission**
   - Click "Save Submission"
   - Verify the calculated value is saved correctly
   - Edit the submission and verify the calculated value loads correctly

---

## Quick Test Values

| RENT | MONTHS | DISCOUNT | Expected TOTAL_RENT |
|------|--------|----------|---------------------|
| 1000 | 12     | 500      | 11500               |
| 1000 | 12     | 0        | 12000               |
| 1000 | 6      | 500      | 5500                |
| 2000 | 12     | 1000     | 23000               |
| 500  | 3      | 50       | 1450                |

---

## Common Issues & Solutions

### Issue: Calculated field doesn't update
- **Solution**: Check that "Recalculate On" is set to "OnFieldChange"
- **Solution**: Verify dependent field codes match exactly (case-sensitive)

### Issue: Expression validation fails
- **Solution**: Ensure field codes are in square brackets: `[FIELD_CODE]`
- **Solution**: Check that all field codes exist in the form
- **Solution**: Verify expression syntax (use +, -, *, /, ())

### Issue: Calculated field is editable
- **Solution**: This should be automatic, but verify field type is "Calculated"
- **Solution**: Check that isEditable is disabled in the UI

### Issue: Wrong calculation result
- **Solution**: Verify field values are numbers (not text)
- **Solution**: Check expression syntax and parentheses
- **Solution**: Test expression in API directly using `/api/Formulas/calculate-expression`

---

## API Test Commands

### Test Expression Validation
```bash
curl -X POST "http://localhost:5203/api/Formulas/validate-expression" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "expressionText": "([RENT] * [MONTHS]) - [DISCOUNT]",
    "formBuilderId": 1
  }'
```

### Test Calculation
```bash
curl -X POST "http://localhost:5203/api/Formulas/calculate-expression" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "expressionText": "([RENT] * [MONTHS]) - [DISCOUNT]",
    "fieldValues": {
      "RENT": 1000,
      "MONTHS": 12,
      "DISCOUNT": 500
    }
  }'
```

Expected Response:
```json
{
  "success": true,
  "data": 11500,
  "statusCode": 200
}
```

