-- =============================================
-- Test Data for FIELD_TYPES Table
-- =============================================

-- Insert test field types if they don't exist
IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Text')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Text', 'string', 255, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'TextArea')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('TextArea', 'string', 5000, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Number')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Number', 'decimal', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Integer')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Integer', 'int', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Email')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Email', 'string', 255, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Phone')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Phone', 'string', 20, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Date')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Date', 'DateTime', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'DateTime')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('DateTime', 'DateTime', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Time')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Time', 'TimeSpan', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Dropdown')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Dropdown', 'string', NULL, 1, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Radio')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Radio', 'string', NULL, 1, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Checkbox')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Checkbox', 'string', NULL, 1, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'File')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('File', 'string', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Password')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Password', 'string', 255, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Boolean')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Boolean', 'bool', NULL, 0, 0, 1, GETDATE(), 0);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[FIELD_TYPES] WHERE TypeName = 'Calculated')
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] (TypeName, DataType, MaxLength, HasOptions, AllowMultiple, IsActive, CreatedDate, IsDeleted)
    VALUES ('Calculated', 'decimal', NULL, 0, 0, 1, GETDATE(), 0);
END

-- Verify inserted data
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
ORDER BY 
    TypeName;

PRINT 'Test data inserted successfully!';

