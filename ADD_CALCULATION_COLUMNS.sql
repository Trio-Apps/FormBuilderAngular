-- =============================================
-- Add Calculation Fields Columns to FORM_FIELDS Table
-- =============================================
-- This script adds the necessary columns to store calculation/expression data
-- for Calculated field types in the FORM_FIELDS table

-- Add ExpressionText column (stores the calculation expression/formula)
ALTER TABLE [dbo].[FORM_FIELDS]
ADD [ExpressionText] [nvarchar](max) NULL;

-- Add CalculationMode column (Expression or Formula)
ALTER TABLE [dbo].[FORM_FIELDS]
ADD [CalculationMode] [nvarchar](50) NULL;

-- Add RecalculateOn column (OnFieldChange, OnLoad, or OnSubmitOnly)
ALTER TABLE [dbo].[FORM_FIELDS]
ADD [RecalculateOn] [nvarchar](50) NULL;

-- Add ResultType column (Decimal, Integer, or Text)
ALTER TABLE [dbo].[FORM_FIELDS]
ADD [ResultType] [nvarchar](50) NULL;

-- Add comments for documentation
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Expression text for calculated fields. Example: ([RENT] * [MONTHS]) - [DISCOUNT]', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'FORM_FIELDS', 
    @level2type = N'COLUMN', @level2name = N'ExpressionText';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Calculation mode: Expression or Formula', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'FORM_FIELDS', 
    @level2type = N'COLUMN', @level2name = N'CalculationMode';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'When to recalculate: OnFieldChange, OnLoad, or OnSubmitOnly', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'FORM_FIELDS', 
    @level2type = N'COLUMN', @level2name = N'RecalculateOn';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Result data type: Decimal, Integer, or Text', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'FORM_FIELDS', 
    @level2type = N'COLUMN', @level2name = N'ResultType';

-- =============================================
-- Verification Query
-- =============================================
-- Run this to verify the columns were added successfully:
-- SELECT 
--     COLUMN_NAME, 
--     DATA_TYPE, 
--     IS_NULLABLE,
--     CHARACTER_MAXIMUM_LENGTH
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'FORM_FIELDS'
--     AND COLUMN_NAME IN ('ExpressionText', 'CalculationMode', 'RecalculateOn', 'ResultType')
-- ORDER BY COLUMN_NAME;


