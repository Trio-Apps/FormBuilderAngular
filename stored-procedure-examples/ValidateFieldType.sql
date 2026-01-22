-- =============================================
-- Stored Procedure: ValidateFieldType
-- Description: Validate if a field type exists and is active
-- Usage Type: Rule
-- Returns: 1 if valid, 0 if invalid
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[ValidateFieldType]
    @FieldTypeId INT,
    @FieldTypeName NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsValid BIT = 0;
    DECLARE @ResultMessage NVARCHAR(200) = '';

    -- Check if field type exists and is active
    IF EXISTS (
        SELECT 1 
        FROM [dbo].[FIELD_TYPES]
        WHERE Id = @FieldTypeId
            AND IsDeleted = 0
            AND IsActive = 1
            AND (@FieldTypeName IS NULL OR TypeName = @FieldTypeName)
    )
    BEGIN
        SET @IsValid = 1;
        SET @ResultMessage = 'Field type is valid';
    END
    ELSE
    BEGIN
        SET @IsValid = 0;
        SET @ResultMessage = 'Field type not found or inactive';
    END

    -- Return result
    SELECT 
        @IsValid AS IsValid,
        @ResultMessage AS ResultMessage;
END
GO

