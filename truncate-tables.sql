-- ============================================
-- Script to TRUNCATE Database Tables
-- حذف البيانات من الجداول (لا يحذف الجداول نفسها)
-- ============================================
-- ⚠️  تحذير: هذا السكربت سيحذف جميع البيانات من الجداول المحددة!
-- ⚠️  Warning: This script will delete all data from the specified tables!
-- ============================================

USE [FormBuilderDataBase]
GO

-- Disable foreign key constraints temporarily
-- تعطيل Foreign Key constraints مؤقتاً
SET NOCOUNT ON;
GO

BEGIN TRANSACTION;
GO

PRINT 'Starting TRUNCATE operations...'
PRINT ''

-- ============================================
-- 1. Form Submissions Related Tables
-- جداول Form Submissions
-- ============================================

-- Delete Form Submission Attachments (if exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSION_ATTACHMENTS')
BEGIN
    PRINT 'Truncating FORM_SUBMISSION_ATTACHMENTS...'
    DELETE FROM [dbo].[FORM_SUBMISSION_ATTACHMENTS]
    PRINT '  ✓ FORM_SUBMISSION_ATTACHMENTS truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ FORM_SUBMISSION_ATTACHMENTS table does not exist'
END
GO

-- Delete Form Submission Values (if exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSION_VALUES')
BEGIN
    PRINT 'Truncating FORM_SUBMISSION_VALUES...'
    DELETE FROM [dbo].[FORM_SUBMISSION_VALUES]
    PRINT '  ✓ FORM_SUBMISSION_VALUES truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ FORM_SUBMISSION_VALUES table does not exist'
END
GO

-- Delete Form Submission Grid Values (if exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSION_GRID_VALUES')
BEGIN
    PRINT 'Truncating FORM_SUBMISSION_GRID_VALUES...'
    DELETE FROM [dbo].[FORM_SUBMISSION_GRID_VALUES]
    PRINT '  ✓ FORM_SUBMISSION_GRID_VALUES truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ FORM_SUBMISSION_GRID_VALUES table does not exist'
END
GO

-- Delete Form Submissions (if exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSIONS')
BEGIN
    PRINT 'Truncating FORM_SUBMISSIONS...'
    DELETE FROM [dbo].[FORM_SUBMISSIONS]
    PRINT '  ✓ FORM_SUBMISSIONS truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ FORM_SUBMISSIONS table does not exist'
END
GO

-- Delete Document Approval History (if exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DOCUMENT_APPROVAL_HISTORY')
BEGIN
    PRINT 'Truncating DOCUMENT_APPROVAL_HISTORY...'
    DELETE FROM [dbo].[DOCUMENT_APPROVAL_HISTORY]
    PRINT '  ✓ DOCUMENT_APPROVAL_HISTORY truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ DOCUMENT_APPROVAL_HISTORY table does not exist'
END
GO

-- ============================================
-- 2. Document Series (Optional - uncomment if needed)
-- Document Series (اختياري - قم بإلغاء التعليق إذا كنت تريد الحذف)
-- ============================================

-- Uncomment the following block if you want to delete Document Series too
-- قم بإلغاء التعليق من الكود التالي إذا كنت تريد حذف Document Series أيضاً

/*
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DOCUMENT_SERIES')
BEGIN
    PRINT 'Truncating DOCUMENT_SERIES...'
    DELETE FROM [dbo].[DOCUMENT_SERIES]
    PRINT '  ✓ DOCUMENT_SERIES truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ DOCUMENT_SERIES table does not exist'
END
GO
*/

-- ============================================
-- 3. Document Types (Optional - uncomment if needed)
-- Document Types (اختياري - قم بإلغاء التعليق إذا كنت تريد الحذف)
-- ============================================

-- Uncomment the following block if you want to delete Document Types too
-- قم بإلغاء التعليق من الكود التالي إذا كنت تريد حذف Document Types أيضاً

/*
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DOCUMENT_TYPES')
BEGIN
    PRINT 'Truncating DOCUMENT_TYPES...'
    DELETE FROM [dbo].[DOCUMENT_TYPES]
    PRINT '  ✓ DOCUMENT_TYPES truncated'
END
ELSE
BEGIN
    PRINT '  ⚠ DOCUMENT_TYPES table does not exist'
END
GO
*/

-- ============================================
-- 4. Reset Identity Columns (if needed)
-- إعادة تعيين Identity Columns (اختياري)
-- ============================================

-- Reset Identity for FORM_SUBMISSIONS
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSIONS')
BEGIN
    PRINT 'Resetting Identity for FORM_SUBMISSIONS...'
    DBCC CHECKIDENT ('[dbo].[FORM_SUBMISSIONS]', RESEED, 0)
    PRINT '  ✓ Identity reset for FORM_SUBMISSIONS'
END
GO

-- Reset Identity for FORM_SUBMISSION_VALUES
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSION_VALUES')
BEGIN
    PRINT 'Resetting Identity for FORM_SUBMISSION_VALUES...'
    DBCC CHECKIDENT ('[dbo].[FORM_SUBMISSION_VALUES]', RESEED, 0)
    PRINT '  ✓ Identity reset for FORM_SUBMISSION_VALUES'
END
GO

-- Reset Identity for FORM_SUBMISSION_ATTACHMENTS
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FORM_SUBMISSION_ATTACHMENTS')
BEGIN
    PRINT 'Resetting Identity for FORM_SUBMISSION_ATTACHMENTS...'
    DBCC CHECKIDENT ('[dbo].[FORM_SUBMISSION_ATTACHMENTS]', RESEED, 0)
    PRINT '  ✓ Identity reset for FORM_SUBMISSION_ATTACHMENTS'
END
GO

-- ============================================
-- Commit or Rollback
-- ============================================

PRINT ''
PRINT '========================================='
PRINT 'TRUNCATE operations completed!'
PRINT 'All form submission data has been deleted.'
PRINT '========================================='
PRINT ''
PRINT 'Do you want to COMMIT these changes?'
PRINT 'If yes, run: COMMIT TRANSACTION;'
PRINT 'If no, run: ROLLBACK TRANSACTION;'
PRINT ''

-- Uncomment the next line to auto-commit (or leave commented for manual review)
-- قم بإلغاء التعليق من السطر التالي للإكمال تلقائياً (أو اتركه معلقاً للمراجعة اليدوية)
-- COMMIT TRANSACTION;

-- If you want to rollback instead, uncomment this:
-- إذا كنت تريد التراجع، قم بإلغاء التعليق من هذا:
-- ROLLBACK TRANSACTION;

GO


