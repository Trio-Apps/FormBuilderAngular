-- ============================================================
-- إضافة صلاحية FormBuilder_Allow_Create للمجموعة (UserGroup)
-- ============================================================
-- هذا الاستعلام يضيف صلاحية إنشاء النماذج (FormBuilder_Allow_Create)
-- لمجموعة المستخدمين (UserGroup) المحددة
-- ============================================================

-- تأكد إن صلاحية Create للـ Admin موجودة
-- SELECT * FROM Tbl_UserGroup_Permission
-- WHERE IdUserGroup = 1
-- AND UserPermissionName = 'FormBuilder_Allow_Create';

-- ============================================================
-- إعداد المتغيرات
-- ============================================================
DECLARE @IdUserGroup INT = 1;              -- رقم مجموعة المستخدمين (Admin = 1)
DECLARE @IdLegalEntity INT = NULL;         -- الكيان القانوني (NULL إذا لم يكن محدد)
DECLARE @IdCreatedBy INT = 1;              -- المستخدم الذي أنشأ الصلاحية (غير NULL - مطلوب)

-- ============================================================
-- إضافة صلاحية FormBuilder_Allow_Create
-- ============================================================
-- ملاحظة: تأكد من تغيير @IdCreatedBy إلى رقم المستخدم المناسب
-- ============================================================

-- التحقق من عدم وجود الصلاحية مسبقاً
IF NOT EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'FormBuilder_Allow_Create'
)
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (
        IdUserGroup,
        IdLegalEntity,
        IdCreatedBy,
        CreatedDate,
        UserPermissionName
    )
    VALUES (
        @IdUserGroup,
        @IdLegalEntity,
        @IdCreatedBy,
        GETDATE(),
        'FormBuilder_Allow_Create'
    );
    
    PRINT 'تم إضافة صلاحية FormBuilder_Allow_Create بنجاح';
END
ELSE
BEGIN
    PRINT 'الصلاحية FormBuilder_Allow_Create موجودة بالفعل';
END

-- ============================================================
-- التحقق من إضافة الصلاحية
-- ============================================================
SELECT * FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
AND UserPermissionName = 'FormBuilder_Allow_Create';

-- ============================================================
-- إضافة صلاحيات أخرى للنماذج (اختياري)
-- ============================================================

-- صلاحية عرض النماذج
IF NOT EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'FormBuilder_Allow_View'
)
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (
        IdUserGroup,
        IdLegalEntity,
        IdCreatedBy,
        CreatedDate,
        UserPermissionName
    )
    VALUES (
        @IdUserGroup,
        @IdLegalEntity,
        @IdCreatedBy,
        GETDATE(),
        'FormBuilder_Allow_View'
    );
    
    PRINT 'تم إضافة صلاحية FormBuilder_Allow_View بنجاح';
END

-- صلاحية تعديل النماذج
IF NOT EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'FormBuilder_Allow_Edit'
)
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (
        IdUserGroup,
        IdLegalEntity,
        IdCreatedBy,
        CreatedDate,
        UserPermissionName
    )
    VALUES (
        @IdUserGroup,
        @IdLegalEntity,
        @IdCreatedBy,
        GETDATE(),
        'FormBuilder_Allow_Edit'
    );
    
    PRINT 'تم إضافة صلاحية FormBuilder_Allow_Edit بنجاح';
END

-- صلاحية حذف النماذج
IF NOT EXISTS (
    SELECT 1 FROM Tbl_UserGroup_Permission
    WHERE IdUserGroup = @IdUserGroup
    AND UserPermissionName = 'FormBuilder_Allow_Delete'
)
BEGIN
    INSERT INTO Tbl_UserGroup_Permission (
        IdUserGroup,
        IdLegalEntity,
        IdCreatedBy,
        CreatedDate,
        UserPermissionName
    )
    VALUES (
        @IdUserGroup,
        @IdLegalEntity,
        @IdCreatedBy,
        GETDATE(),
        'FormBuilder_Allow_Delete'
    );
    
    PRINT 'تم إضافة صلاحية FormBuilder_Allow_Delete بنجاح';
END

-- ============================================================
-- عرض جميع صلاحيات FormBuilder للمجموعة
-- ============================================================
SELECT 
    IdUserGroup,
    UserPermissionName,
    CreatedDate,
    IdCreatedBy
FROM Tbl_UserGroup_Permission
WHERE IdUserGroup = @IdUserGroup
AND UserPermissionName LIKE 'FormBuilder_Allow_%'
ORDER BY UserPermissionName;

-- ============================================================
-- ملاحظات:
-- ============================================================
-- 1. تأكد من تغيير @IdCreatedBy إلى رقم المستخدم المناسب
--    (يمكنك البحث عن رقم المستخدم من جدول Tbl_User)
-- 2. تأكد من أن IdUserGroup موجود في جدول Tbl_UserGroup
-- 3. يمكنك استخدام نفس الاستعلام لمجموعات مستخدمين أخرى
--    بتغيير قيمة @IdUserGroup
-- 4. الاستعلام يتحقق من عدم وجود الصلاحية مسبقاً قبل الإضافة
-- ============================================================

-- ============================================================
-- للبحث عن رقم المستخدم (IdCreatedBy):
-- ============================================================
-- SELECT Id, Username FROM Tbl_User WHERE Username = 'admin';
-- أو
-- SELECT Id, Username FROM Tbl_User WHERE Username = 'your_username';
-- ============================================================
