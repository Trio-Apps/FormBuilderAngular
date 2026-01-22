-- =============================================
-- Stored Procedure: GetFieldTypeById
-- Description: Get a specific field type by ID
-- Usage Type: Options
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[GetFieldTypeById]
    @FieldTypeId INT
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
        IsActive,
        CreatedDate,
        UpdatedDate
    FROM 
        [dbo].[FIELD_TYPES]
    WHERE 
        Id = @FieldTypeId
        AND IsDeleted = 0;
END
GO

