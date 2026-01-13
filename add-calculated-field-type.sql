-- ============================================
-- Script to Add Calculated Field Type
-- ============================================

USE [FormBuilderDataBase]
GO

-- Check if Calculated field type already exists
IF NOT EXISTS (SELECT * FROM [dbo].[FIELD_TYPES] WHERE [TypeName] = 'Calculated' AND [IsDeleted] = 0)
BEGIN
    PRINT 'Adding Calculated field type...'
    
    -- Insert Calculated field type
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

