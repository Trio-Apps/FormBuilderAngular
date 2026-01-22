-- =============================================
-- Stored Procedure: GetFieldTypesWithOptions
-- Description: Get only field types that support options (Dropdown, Radio, Checkbox)
-- Usage Type: Options
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[GetFieldTypesWithOptions]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        TypeName,
        DataType,
        MaxLength,
        HasOptions,
        AllowMultiple,
        IsActive
    FROM 
        [dbo].[FIELD_TYPES]
    WHERE 
        IsDeleted = 0
        AND IsActive = 1
        AND HasOptions = 1
    ORDER BY 
        TypeName ASC;
END
GO

