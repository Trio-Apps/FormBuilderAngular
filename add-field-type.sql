-- ============================================
-- Script to Add New Field Type
-- ============================================
-- Usage: Update the values in the INSERT statement below
-- Then execute this script in SQL Server Management Studio

USE [FormBuilderDataBase]
GO

-- ============================================
-- Example: Add a new Field Type
-- ============================================
-- Replace the values below with your desired field type information

DECLARE @TypeName NVARCHAR(100) = 'YourFieldTypeName'  -- مثال: 'Time', 'URL', 'Color', etc.
DECLARE @ForeignTypeName NVARCHAR(100) = N'اسم الحقل بالعربية'  -- الاسم بالعربية (اختياري)
DECLARE @DataType NVARCHAR(50) = 'string'  -- 'string', 'number', 'date', 'boolean', 'file', 'array', etc.
DECLARE @MaxLength INT = NULL  -- NULL إذا لم يكن هناك حد أقصى، أو رقم مثل 255
DECLARE @HasOptions BIT = 0  -- 1 إذا كان يحتوي على خيارات (مثل Select, Radio), 0 إذا لم يكن
DECLARE @AllowMultiple BIT = 0  -- 1 إذا كان يسمح باختيار متعدد, 0 إذا كان اختيار واحد فقط
DECLARE @Description NVARCHAR(500) = 'Description of the field type'  -- وصف الحقل (اختياري)

-- Check if field type already exists
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = @TypeName AND [IsDeleted] = 0)
BEGIN
    PRINT 'Adding new field type: ' + @TypeName
    
    -- Insert new field type
    INSERT INTO [dbo].[FIELD_TYPES] (
        [TypeName], 
        [DataType], 
        [MaxLength], 
        [HasOptions], 
        [AllowMultiple], 
        [IsActive], 
        [IsDeleted], 
        [CreatedDate]
    )
    VALUES (
        @TypeName,
        @DataType,
        @MaxLength,
        @HasOptions,
        @AllowMultiple,
        1,  -- IsActive = 1 (active)
        0,  -- IsDeleted = 0 (not deleted)
        GETUTCDATE()
    )
    
    PRINT 'Field type "' + @TypeName + '" added successfully with ID: ' + CAST(SCOPE_IDENTITY() AS NVARCHAR(10))
END
ELSE
BEGIN
    PRINT 'Field type "' + @TypeName + '" already exists.'
    
    -- Optionally, update existing field type if needed
    -- UPDATE [dbo].[FIELD_TYPES]
    -- SET [DataType] = @DataType,
    --     [MaxLength] = @MaxLength,
    --     [HasOptions] = @HasOptions,
    --     [AllowMultiple] = @AllowMultiple,
    --     [IsActive] = 1,
    --     [IsDeleted] = 0,
    --     [UpdatedDate] = GETUTCDATE()
    -- WHERE [TypeName] = @TypeName AND [IsDeleted] = 0
END
GO

-- ============================================
-- Common Field Types Examples
-- ============================================
-- Uncomment and modify the examples below as needed

/*
-- Example 1: Time Field Type
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'Time' AND [IsDeleted] = 0)
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES ('Time', 'time', NULL, 0, 0, 1, 0, GETUTCDATE())
    PRINT 'Time field type added.'
END
GO

-- Example 2: URL Field Type
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'URL' AND [IsDeleted] = 0)
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES ('URL', 'string', 500, 0, 0, 1, 0, GETUTCDATE())
    PRINT 'URL field type added.'
END
GO

-- Example 3: Color Picker Field Type
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'Color' AND [IsDeleted] = 0)
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES ('Color', 'string', 7, 0, 0, 1, 0, GETUTCDATE())  -- 7 for hex color (#RRGGBB)
    PRINT 'Color field type added.'
END
GO

-- Example 4: Phone Number Field Type
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'Phone' AND [IsDeleted] = 0)
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES ('Phone', 'string', 20, 0, 0, 1, 0, GETUTCDATE())
    PRINT 'Phone field type added.'
END
GO

-- Example 5: Password Field Type
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'Password' AND [IsDeleted] = 0)
BEGIN
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES ('Password', 'string', 100, 0, 0, 1, 0, GETUTCDATE())
    PRINT 'Password field type added.'
END
GO
*/

PRINT 'Script completed successfully!'
GO

