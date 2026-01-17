-- ============================================
-- Script to TRUNCATE ALL Database Tables and RESET IDs
-- حذف جميع البيانات من جميع الجداول وإعادة تعيين IDs
-- ============================================
-- ⚠️  تحذير شديد: هذا السكربت سيحذف جميع البيانات من جميع الجداول!
-- ⚠️  WARNING: This script will delete ALL data from ALL tables!
-- ============================================

USE [FormBuilderDataBase]
GO

SET NOCOUNT ON;
GO

BEGIN TRANSACTION;
GO

PRINT '========================================='
PRINT 'Starting TRUNCATE ALL TABLES operation...'
PRINT 'This will delete ALL data and reset all IDs!'
PRINT '========================================='
PRINT ''

-- ============================================
-- Step 1: Disable Foreign Key Constraints
-- تعطيل Foreign Key Constraints
-- ============================================

PRINT 'Step 1: Disabling Foreign Key Constraints...'
GO

-- Disable all foreign key constraints
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'
ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
' NOCHECK CONSTRAINT ' + QUOTENAME(name) + ';'
FROM sys.foreign_keys;

EXEC sp_executesql @sql;
PRINT '  ✓ All Foreign Key Constraints disabled'
GO

-- ============================================
-- Step 2: TRUNCATE All Tables (This resets Identity IDs)
-- حذف جميع البيانات وإعادة تعيين Identity IDs
-- ============================================

PRINT ''
PRINT 'Step 2: Truncating all tables...'
GO

-- Get all user tables and truncate them
DECLARE @truncateSql NVARCHAR(MAX) = N'';

SELECT @truncateSql += N'
IF EXISTS (SELECT * FROM sys.tables WHERE name = ''' + name + ''')
BEGIN
    TRUNCATE TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(object_id)) + '.' + QUOTENAME(name) + ';
    PRINT ''  ✓ ' + name + ' truncated'';
END'
FROM sys.tables
WHERE type = 'U' 
  AND OBJECT_SCHEMA_NAME(object_id) = 'dbo'
  AND name NOT LIKE 'sys%'
  AND name NOT LIKE 'MS%'
ORDER BY name;

EXEC sp_executesql @truncateSql;
GO

-- ============================================
-- Step 3: Re-enable Foreign Key Constraints
-- إعادة تفعيل Foreign Key Constraints
-- ============================================

PRINT ''
PRINT 'Step 3: Re-enabling Foreign Key Constraints...'
GO

-- Re-enable all foreign key constraints
DECLARE @enableSql NVARCHAR(MAX) = N'';
SELECT @enableSql += N'
ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
' CHECK CONSTRAINT ' + QUOTENAME(name) + ';'
FROM sys.foreign_keys;

EXEC sp_executesql @enableSql;
PRINT '  ✓ All Foreign Key Constraints re-enabled'
GO

-- ============================================
-- Step 4: Reset Identity Columns (Extra safety)
-- إعادة تعيين Identity Columns (احتياط إضافي)
-- ============================================

PRINT ''
PRINT 'Step 4: Resetting Identity Columns...'
GO

DECLARE @identitySql NVARCHAR(MAX) = N'';

SELECT @identitySql += N'
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(''' + QUOTENAME(OBJECT_SCHEMA_NAME(t.object_id)) + '.' + QUOTENAME(t.name) + ''') AND is_identity = 1)
BEGIN
    DBCC CHECKIDENT(''' + QUOTENAME(OBJECT_SCHEMA_NAME(t.object_id)) + '.' + QUOTENAME(t.name) + ''', RESEED, 0);
    PRINT ''  ✓ Identity reset for ' + t.name + ''';
END'
FROM sys.tables t
WHERE t.type = 'U' 
  AND OBJECT_SCHEMA_NAME(t.object_id) = 'dbo'
  AND t.name NOT LIKE 'sys%'
  AND t.name NOT LIKE 'MS%'
ORDER BY t.name;

EXEC sp_executesql @identitySql;
GO

-- ============================================
-- Summary
-- ============================================

PRINT ''
PRINT '========================================='
PRINT 'TRUNCATE ALL TABLES completed!'
PRINT 'All data has been deleted and all IDs have been reset to 0.'
PRINT '========================================='
PRINT ''
PRINT '⚠️  IMPORTANT: Review the output above before committing!'
PRINT ''
PRINT 'To COMMIT these changes, run:'
PRINT 'COMMIT TRANSACTION;'
PRINT ''
PRINT 'To ROLLBACK these changes, run:'
PRINT 'ROLLBACK TRANSACTION;'
PRINT ''

-- Uncomment the next line to auto-commit (or leave commented for manual review)
-- قم بإلغاء التعليق من السطر التالي للإكمال تلقائياً (أو اتركه معلقاً للمراجعة اليدوية)
-- COMMIT TRANSACTION;

-- If you want to rollback instead, uncomment this:
-- إذا كنت تريد التراجع، قم بإلغاء التعليق من هذا:
-- ROLLBACK TRANSACTION;

GO


