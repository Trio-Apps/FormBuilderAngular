# Calculation Fields - Test Data

This document provides test data and scenarios for testing the Calculation Fields functionality.

## Test Scenario 1: Rent Calculation (Basic)

### Fields to Create:
1. **RENT** (Number/Decimal)
   - Field Code: `RENT`
   - Field Name: Monthly Rent
   - Field Type: Number
   - Data Type: Decimal
   - Is Editable: Yes
   - Is Mandatory: Yes

2. **MONTHS** (Number/Integer)
   - Field Code: `MONTHS`
   - Field Name: Number of Months
   - Field Type: Number
   - Data Type: Integer
   - Is Editable: Yes
   - Is Mandatory: Yes

3. **DISCOUNT** (Number/Decimal)
   - Field Code: `DISCOUNT`
   - Field Name: Discount Amount
   - Field Type: Number
   - Data Type: Decimal
   - Is Editable: Yes
   - Is Mandatory: No

4. **TOTAL_RENT** (Calculated)
   - Field Code: `TOTAL_RENT`
   - Field Name: Total Rent
   - Field Type: Calculated
   - Data Type: Decimal
   - Expression Text: `([RENT] * [MONTHS]) - [DISCOUNT]`
   - Calculation Mode: Expression
   - Result Type: Decimal
   - Recalculate On: OnFieldChange
   - Is Editable: No (auto-set)
   - Is Mandatory: No (auto-set)

### Test Cases:

#### Test Case 1.1: Basic Calculation
- RENT = 1000
- MONTHS = 12
- DISCOUNT = 500
- **Expected Result**: TOTAL_RENT = (1000 * 12) - 500 = 11500

#### Test Case 1.2: No Discount
- RENT = 1000
- MONTHS = 12
- DISCOUNT = 0
- **Expected Result**: TOTAL_RENT = (1000 * 12) - 0 = 12000

#### Test Case 1.3: Change Dependent Field
- Set RENT = 1000, MONTHS = 12, DISCOUNT = 500
- Verify TOTAL_RENT = 11500
- Change MONTHS to 6
- **Expected Result**: TOTAL_RENT should automatically update to (1000 * 6) - 500 = 5500

---

## Test Scenario 2: Price Calculation with Tax

### Fields to Create:
1. **PRICE** (Number/Decimal)
   - Field Code: `PRICE`
   - Field Name: Unit Price
   - Field Type: Number
   - Data Type: Decimal

2. **QUANTITY** (Number/Integer)
   - Field Code: `QUANTITY`
   - Field Name: Quantity
   - Field Type: Number
   - Data Type: Integer

3. **TAX_RATE** (Number/Decimal)
   - Field Code: `TAX_RATE`
   - Field Name: Tax Rate (%)
   - Field Type: Number
   - Data Type: Decimal

4. **SUBTOTAL** (Calculated)
   - Field Code: `SUBTOTAL`
   - Field Name: Subtotal
   - Expression Text: `[PRICE] * [QUANTITY]`
   - Result Type: Decimal
   - Recalculate On: OnFieldChange

5. **TAX_AMOUNT** (Calculated)
   - Field Code: `TAX_AMOUNT`
   - Field Name: Tax Amount
   - Expression Text: `[SUBTOTAL] * ([TAX_RATE] / 100)`
   - Result Type: Decimal
   - Recalculate On: OnFieldChange

6. **TOTAL_PRICE** (Calculated)
   - Field Code: `TOTAL_PRICE`
   - Field Name: Total Price
   - Expression Text: `[SUBTOTAL] + [TAX_AMOUNT]`
   - Result Type: Decimal
   - Recalculate On: OnFieldChange

### Test Cases:

#### Test Case 2.1: Basic Price Calculation
- PRICE = 100
- QUANTITY = 10
- TAX_RATE = 10
- **Expected Results**:
  - SUBTOTAL = 100 * 10 = 1000
  - TAX_AMOUNT = 1000 * (10 / 100) = 100
  - TOTAL_PRICE = 1000 + 100 = 1100

#### Test Case 2.2: Cascading Calculations
- Set PRICE = 50, QUANTITY = 5, TAX_RATE = 15
- Verify all calculated fields update automatically:
  - SUBTOTAL = 250
  - TAX_AMOUNT = 37.5
  - TOTAL_PRICE = 287.5

---

## Test Scenario 3: Percentage Discount

### Fields to Create:
1. **ORIGINAL_PRICE** (Number/Decimal)
   - Field Code: `ORIGINAL_PRICE`
   - Field Name: Original Price

2. **DISCOUNT_PERCENT** (Number/Decimal)
   - Field Code: `DISCOUNT_PERCENT`
   - Field Name: Discount Percentage

3. **DISCOUNTED_PRICE** (Calculated)
   - Field Code: `DISCOUNTED_PRICE`
   - Field Name: Discounted Price
   - Expression Text: `[ORIGINAL_PRICE] - ([ORIGINAL_PRICE] * ([DISCOUNT_PERCENT] / 100))`
   - Result Type: Decimal
   - Recalculate On: OnFieldChange

### Test Cases:

#### Test Case 3.1: Percentage Discount
- ORIGINAL_PRICE = 1000
- DISCOUNT_PERCENT = 20
- **Expected Result**: DISCOUNTED_PRICE = 1000 - (1000 * 0.20) = 800

---

## Test Scenario 4: Different Recalculation Modes

### Fields to Create:
1. **FIELD_A** (Number)
   - Field Code: `FIELD_A`

2. **FIELD_B** (Number)
   - Field Code: `FIELD_B`

3. **CALC_ON_CHANGE** (Calculated)
   - Field Code: `CALC_ON_CHANGE`
   - Expression Text: `[FIELD_A] + [FIELD_B]`
   - Recalculate On: **OnFieldChange**

4. **CALC_ON_LOAD** (Calculated)
   - Field Code: `CALC_ON_LOAD`
   - Expression Text: `[FIELD_A] * [FIELD_B]`
   - Recalculate On: **OnLoad**

5. **CALC_ON_SUBMIT** (Calculated)
   - Field Code: `CALC_ON_SUBMIT`
   - Expression Text: `[FIELD_A] - [FIELD_B]`
   - Recalculate On: **OnSubmitOnly**

### Test Cases:

#### Test Case 4.1: OnFieldChange Mode
- Set FIELD_A = 10, FIELD_B = 5
- **Expected**: CALC_ON_CHANGE should immediately show 15
- Change FIELD_A to 20
- **Expected**: CALC_ON_CHANGE should immediately update to 25

#### Test Case 4.2: OnLoad Mode
- Set FIELD_A = 10, FIELD_B = 5
- **Expected**: CALC_ON_LOAD should calculate once when form loads
- Change FIELD_A to 20
- **Expected**: CALC_ON_LOAD should NOT update automatically

#### Test Case 4.3: OnSubmitOnly Mode
- Set FIELD_A = 10, FIELD_B = 5
- **Expected**: CALC_ON_SUBMIT should NOT calculate during editing
- Submit the form
- **Expected**: CALC_ON_SUBMIT should calculate and save the result (5)

---

## Test Scenario 5: Complex Expression

### Fields to Create:
1. **BASE** (Number/Decimal)
   - Field Code: `BASE`

2. **RATE1** (Number/Decimal)
   - Field Code: `RATE1`

3. **RATE2** (Number/Decimal)
   - Field Code: `RATE2`

4. **COMPLEX_CALC** (Calculated)
   - Field Code: `COMPLEX_CALC`
   - Expression Text: `([BASE] * [RATE1]) + ([BASE] * [RATE2]) - ([BASE] * 0.1)`
   - Result Type: Decimal

### Test Cases:

#### Test Case 5.1: Complex Calculation
- BASE = 1000
- RATE1 = 0.15
- RATE2 = 0.25
- **Expected Result**: COMPLEX_CALC = (1000 * 0.15) + (1000 * 0.25) - (1000 * 0.1) = 150 + 250 - 100 = 300

---

## Test Scenario 6: Integer Result Type

### Fields to Create:
1. **ITEMS** (Number/Integer)
   - Field Code: `ITEMS`

2. **PRICE_PER_ITEM** (Number/Decimal)
   - Field Code: `PRICE_PER_ITEM`

3. **TOTAL_ITEMS** (Calculated)
   - Field Code: `TOTAL_ITEMS`
   - Expression Text: `[ITEMS] * [PRICE_PER_ITEM]`
   - Result Type: **Integer** (should round to whole number)

### Test Cases:

#### Test Case 6.1: Integer Result
- ITEMS = 3
- PRICE_PER_ITEM = 33.33
- **Expected Result**: TOTAL_ITEMS = 99 (or 100, depending on rounding)

---

## Test Scenario 7: Text Result Type

### Fields to Create:
1. **FIRST_NAME** (Text)
   - Field Code: `FIRST_NAME`

2. **LAST_NAME** (Text)
   - Field Code: `LAST_NAME`

3. **FULL_NAME** (Calculated)
   - Field Code: `FULL_NAME`
   - Expression Text: `[FIRST_NAME] + " " + [LAST_NAME]`
   - Result Type: **Text**

### Test Cases:

#### Test Case 7.1: Text Concatenation
- FIRST_NAME = "John"
- LAST_NAME = "Doe"
- **Expected Result**: FULL_NAME = "John Doe"

**Note**: Text concatenation may require backend support. Test if this works with your API.

---

## Test Scenario 8: Error Handling

### Test Cases:

#### Test Case 8.1: Missing Field Values
- Create a calculated field with expression: `[FIELD_X] + [FIELD_Y]`
- Leave FIELD_X and FIELD_Y empty
- **Expected**: Calculated field should show 0 or handle gracefully

#### Test Case 8.2: Invalid Expression
- Try to create a calculated field with invalid expression: `[FIELD_X] + + [FIELD_Y]`
- **Expected**: Validation should prevent saving or show error

#### Test Case 8.3: Non-existent Field Code
- Create expression: `[INVALID_FIELD] * 2`
- **Expected**: Validation should show error about invalid field code

---

## Quick Test Checklist

- [ ] Create a Calculated field type
- [ ] Create source fields (RENT, MONTHS, DISCOUNT)
- [ ] Create calculated field (TOTAL_RENT) with expression
- [ ] Verify dependent fields are auto-detected
- [ ] Test OnFieldChange recalculation
- [ ] Test OnLoad recalculation
- [ ] Test OnSubmitOnly recalculation
- [ ] Verify calculated field is non-editable
- [ ] Verify calculated field is non-mandatory
- [ ] Test with different result types (Decimal, Integer, Text)
- [ ] Test cascading calculations (field depends on another calculated field)
- [ ] Test form submission saves calculated values
- [ ] Test edit mode loads calculated values correctly

---

## Sample Form Submission Test Data

### JSON for API Testing:

```json
{
  "formBuilderId": 1,
  "fieldValues": {
    "RENT": 1000,
    "MONTHS": 12,
    "DISCOUNT": 500
  }
}
```

### Expected Calculated Values:

```json
{
  "TOTAL_RENT": 11500
}
```

---

## API Endpoints for Testing

### 1. Validate Expression
```bash
POST /api/Formulas/validate-expression
{
  "expressionText": "([RENT] * [MONTHS]) - [DISCOUNT]",
  "formBuilderId": 1
}
```

### 2. Calculate Expression
```bash
POST /api/Formulas/calculate-expression
{
  "expressionText": "([RENT] * [MONTHS]) - [DISCOUNT]",
  "fieldValues": {
    "RENT": 1000,
    "MONTHS": 12,
    "DISCOUNT": 500
  }
}
```

### 3. Preview Calculation
```bash
POST /api/Formulas/preview-calculation
{
  "expressionText": "([RENT] * [MONTHS]) - [DISCOUNT]",
  "formBuilderId": 1,
  "fieldValues": {
    "RENT": 1000,
    "MONTHS": 12,
    "DISCOUNT": 500
  }
}
```

---

## Notes

- All field codes must be in UPPERCASE
- Field codes in expressions must be wrapped in square brackets: `[FIELD_CODE]`
- Supported operations: `+`, `-`, `*`, `/`, `()`
- Calculated fields are always non-editable and non-mandatory
- Calculated values are stored as snapshots in submissions for auditability

