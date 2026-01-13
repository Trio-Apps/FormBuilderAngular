-- ============================================
-- Script to Fix FIELD_TYPES Table Issue
-- ============================================

USE [FormBuilderDataBase]
GO

-- Step 1: Check if FIELD_TYPES table exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FIELD_TYPES')
BEGIN
    PRINT 'Creating FIELD_TYPES table...'
    
    -- Create FIELD_TYPES table
    CREATE TABLE [dbo].[FIELD_TYPES](
        [Id] [int] IDENTITY(1,1) NOT NULL,
        [TypeName] [nvarchar](100) NOT NULL,
        [DataType] [nvarchar](50) NOT NULL,
        [MaxLength] [int] NULL,
        [HasOptions] [bit] NOT NULL DEFAULT 0,
        [AllowMultiple] [bit] NOT NULL DEFAULT 0,
        [IsActive] [bit] NOT NULL DEFAULT 1,
        [CreatedByUserId] [nvarchar](450) NULL,
        [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedDate] [datetime2](7) NULL,
        [IsDeleted] [bit] NOT NULL DEFAULT 0,
        [DeletedDate] [datetime2](7) NULL,
        [DeletedByUserId] [nvarchar](450) NULL,
        CONSTRAINT [PK_FIELD_TYPES] PRIMARY KEY CLUSTERED ([Id] ASC)
    )
    
    PRINT 'FIELD_TYPES table created successfully.'
END
ELSE
BEGIN
    PRINT 'FIELD_TYPES table already exists.'
END
GO

-- Step 2: Check if Foreign Key constraints exist and drop them if needed
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FORM_FIELDS_FIELD_TYPES_FieldTypeId')
BEGIN
    PRINT 'Dropping existing FK_FORM_FIELDS_FIELD_TYPES_FieldTypeId constraint...'
    ALTER TABLE [dbo].[FORM_FIELDS] DROP CONSTRAINT [FK_FORM_FIELDS_FIELD_TYPES_FieldTypeId]
    PRINT 'Constraint dropped.'
END
GO

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FORM_GRID_COLUMNS_FIELD_TYPES_FieldTypeId')
BEGIN
    PRINT 'Dropping existing FK_FORM_GRID_COLUMNS_FIELD_TYPES_FieldTypeId constraint...'
    ALTER TABLE [dbo].[FORM_GRID_COLUMNS] DROP CONSTRAINT [FK_FORM_GRID_COLUMNS_FIELD_TYPES_FieldTypeId]
    PRINT 'Constraint dropped.'
END
GO

-- Step 3: Clean up invalid FieldTypeId references (set to NULL if FieldType doesn't exist)
PRINT 'Cleaning up invalid FieldTypeId references...'

UPDATE [dbo].[FORM_FIELDS]
SET [FieldTypeId] = NULL
WHERE [FieldTypeId] IS NOT NULL 
  AND [FieldTypeId] NOT IN (SELECT [Id] FROM [dbo].[FIELD_TYPES])

UPDATE [dbo].[FORM_GRID_COLUMNS]
SET [FieldTypeId] = NULL
WHERE [FieldTypeId] IS NOT NULL 
  AND [FieldTypeId] NOT IN (SELECT [Id] FROM [dbo].[FIELD_TYPES])

PRINT 'Invalid references cleaned up.'
GO

-- Step 4: Create indexes if they don't exist
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FORM_FIELDS_FieldTypeId' AND object_id = OBJECT_ID('FORM_FIELDS'))
BEGIN
    PRINT 'Creating IX_FORM_FIELDS_FieldTypeId index...'
    CREATE NONCLUSTERED INDEX [IX_FORM_FIELDS_FieldTypeId] ON [dbo].[FORM_FIELDS]([FieldTypeId])
    PRINT 'Index created.'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_FORM_GRID_COLUMNS_FieldTypeId' AND object_id = OBJECT_ID('FORM_GRID_COLUMNS'))
BEGIN
    PRINT 'Creating IX_FORM_GRID_COLUMNS_FieldTypeId index...'
    CREATE NONCLUSTERED INDEX [IX_FORM_GRID_COLUMNS_FieldTypeId] ON [dbo].[FORM_GRID_COLUMNS]([FieldTypeId])
    PRINT 'Index created.'
END
GO

-- Step 5: Recreate Foreign Key constraints
PRINT 'Creating Foreign Key constraints...'

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FORM_FIELDS_FIELD_TYPES_FieldTypeId')
BEGIN
    ALTER TABLE [dbo].[FORM_FIELDS]
    ADD CONSTRAINT [FK_FORM_FIELDS_FIELD_TYPES_FieldTypeId] 
    FOREIGN KEY([FieldTypeId]) REFERENCES [dbo].[FIELD_TYPES] ([Id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
    
    PRINT 'FK_FORM_FIELDS_FIELD_TYPES_FieldTypeId constraint created.'
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_FORM_GRID_COLUMNS_FIELD_TYPES_FieldTypeId')
BEGIN
    ALTER TABLE [dbo].[FORM_GRID_COLUMNS]
    ADD CONSTRAINT [FK_FORM_GRID_COLUMNS_FIELD_TYPES_FieldTypeId] 
    FOREIGN KEY([FieldTypeId]) REFERENCES [dbo].[FIELD_TYPES] ([Id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
    
    PRINT 'FK_FORM_GRID_COLUMNS_FIELD_TYPES_FieldTypeId constraint created.'
END
GO

-- Step 6: Insert default field types if table is empty
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES])
BEGIN
    PRINT 'Inserting default field types...'
    
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES
        ('TextBox', 'string', 255, 0, 0, 1, 0, GETUTCDATE()),
        ('Number', 'int', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('Decimal', 'decimal', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('Date', 'date', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('DateTime', 'datetime', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('Time', 'time', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('Email', 'string', 255, 0, 0, 1, 0, GETUTCDATE()),
        ('Phone', 'string', 20, 0, 0, 1, 0, GETUTCDATE()),
        ('ComboBox', 'string', NULL, 1, 0, 1, 0, GETUTCDATE()),
        ('RadioButton', 'string', NULL, 1, 0, 1, 0, GETUTCDATE()),
        ('CheckBox', 'bool', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('MultiSelect', 'string', NULL, 1, 1, 1, 0, GETUTCDATE()),
        ('TextArea', 'string', 4000, 0, 0, 1, 0, GETUTCDATE()),
        ('FileUpload', 'string', NULL, 0, 1, 1, 0, GETUTCDATE()),
        ('ImageUpload', 'string', NULL, 0, 1, 1, 0, GETUTCDATE()),
        ('Password', 'string', 100, 0, 0, 1, 0, GETUTCDATE()),
        ('URL', 'string', 500, 0, 0, 1, 0, GETUTCDATE()),
        ('JSON', 'json', NULL, 0, 0, 1, 0, GETUTCDATE()),
        ('Calculated', 'number', NULL, 0, 0, 1, 0, GETUTCDATE())
    
    PRINT 'Default field types inserted.'
END
ELSE
BEGIN
    PRINT 'FIELD_TYPES table already contains data.'
END
GO

-- Step 7: Add Calculated field type if it doesn't exist
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'Calculated' AND [IsDeleted] = 0)
BEGIN
    PRINT 'Adding Calculated field type...'
    
    INSERT INTO [dbo].[FIELD_TYPES] ([TypeName], [DataType], [MaxLength], [HasOptions], [AllowMultiple], [IsActive], [IsDeleted], [CreatedDate])
    VALUES ('Calculated', 'number', NULL, 0, 0, 1, 0, GETUTCDATE())
    
    PRINT 'Calculated field type added successfully.'
END
ELSE
BEGIN
    PRINT 'Calculated field type already exists.'
END
GO

PRINT 'Script completed successfully!'
GO

