-- ============================================
-- SQL Query: إضافة صلاحيات Form Builder (Forms, Tabs, Fields)
-- ============================================
-- هذا الـ Query يضيف صلاحيات View, Create, Edit, Delete, Manage
-- لـ: FormBuilder, FormTab, FormField
-- لكل UserGroup في النظام (أو لجروب معين)
-- ============================================

-- ===== تحديد ID المستخدم اللي هيعمل الـ Insert =====
-- غير هذا الرقم حسب ID المستخدم اللي عندك (مثلاً 1 للـ Admin)
DECLARE @IdCreatedBy INT = 1; -- غير هذا الرقم حسب ID المستخدم اللي عندك

-- ===== الخيار 1: إضافة الصلاحيات لكل UserGroup =====
-- (يضيف الصلاحيات لكل جروب موجود في Tbl_UserGroup)

INSERT INTO Tbl_UserGroup_Permission (idUserGroup, userPermissionName, idCreatedBy, createdDate)
SELECT 
    ug.id AS idUserGroup,
    permissionName AS userPermissionName,
    @IdCreatedBy AS idCreatedBy,
    GETDATE() AS createdDate
FROM Tbl_UserGroup ug
CROSS JOIN (
    -- صلاحيات FormBuilder (Forms)
    VALUES 
        ('FormBuilder_Allow_View'),
        ('FormBuilder_Allow_Create'),
        ('FormBuilder_Allow_Edit'),
        ('FormBuilder_Allow_Delete'),
        ('FormBuilder_Allow_Manage'),
    
    -- صلاحيات FormTab (Tabs)
        ('FormTab_Allow_View'),
        ('FormTab_Allow_Create'),
        ('FormTab_Allow_Edit'),
        ('FormTab_Allow_Delete'),
        ('FormTab_Allow_Manage'),
    
    -- صلاحيات FormField (Fields)
        ('FormField_Allow_View'),
        ('FormField_Allow_Create'),
        ('FormField_Allow_Edit'),
        ('FormField_Allow_Delete'),
        ('FormField_Allow_Manage')
) AS Permissions(permissionName)
WHERE NOT EXISTS (
    -- تجنب إضافة صلاحيات مكررة
    SELECT 1 
    FROM Tbl_UserGroup_Permission ugp
    WHERE ugp.idUserGroup = ug.id 
      AND ugp.userPermissionName = Permissions.permissionName
);

-- ============================================
-- ===== الخيار 2: إضافة الصلاحيات لجروب معين فقط =====
-- (استخدم هذا إذا كنت تريد إضافة الصلاحيات لجروب محدد فقط)
-- ============================================

-- مثال: إضافة الصلاحيات لجروب "Administration" (ID = 1)
-- غير الـ ID حسب الجروب اللي عندك

/*
DECLARE @UserGroupId INT = 1; -- غير هذا الرقم حسب ID الجروب اللي عندك
DECLARE @IdCreatedBy INT = 1; -- غير هذا الرقم حسب ID المستخدم اللي عندك

INSERT INTO Tbl_UserGroup_Permission (idUserGroup, userPermissionName, idCreatedBy, createdDate)
SELECT 
    @UserGroupId AS idUserGroup,
    permissionName AS userPermissionName,
    @IdCreatedBy AS idCreatedBy,
    GETDATE() AS createdDate
FROM (
    VALUES 
        -- صلاحيات FormBuilder (Forms)
        ('FormBuilder_Allow_View'),
        ('FormBuilder_Allow_Create'),
        ('FormBuilder_Allow_Edit'),
        ('FormBuilder_Allow_Delete'),
        ('FormBuilder_Allow_Manage'),
    
        -- صلاحيات FormTab (Tabs)
        ('FormTab_Allow_View'),
        ('FormTab_Allow_Create'),
        ('FormTab_Allow_Edit'),
        ('FormTab_Allow_Delete'),
        ('FormTab_Allow_Manage'),
    
        -- صلاحيات FormField (Fields)
        ('FormField_Allow_View'),
        ('FormField_Allow_Create'),
        ('FormField_Allow_Edit'),
        ('FormField_Allow_Delete'),
        ('FormField_Allow_Manage')
) AS Permissions(permissionName)
WHERE NOT EXISTS (
    -- تجنب إضافة صلاحيات مكررة
    SELECT 1 
    FROM Tbl_UserGroup_Permission ugp
    WHERE ugp.idUserGroup = @UserGroupId 
      AND ugp.userPermissionName = Permissions.permissionName
);
*/

-- ============================================
-- ===== الخيار 3: إضافة الصلاحيات بالاسم (بدون ID) =====
-- (استخدم هذا إذا كنت تعرف اسم الجروب فقط)
-- ============================================

/*
DECLARE @UserGroupName NVARCHAR(200) = 'Administration'; -- غير هذا الاسم حسب الجروب اللي عندك
DECLARE @IdCreatedBy INT = 1; -- غير هذا الرقم حسب ID المستخدم اللي عندك

INSERT INTO Tbl_UserGroup_Permission (idUserGroup, userPermissionName, idCreatedBy, createdDate)
SELECT 
    ug.id AS idUserGroup,
    permissionName AS userPermissionName,
    @IdCreatedBy AS idCreatedBy,
    GETDATE() AS createdDate
FROM Tbl_UserGroup ug
CROSS JOIN (
    VALUES 
        -- صلاحيات FormBuilder (Forms)
        ('FormBuilder_Allow_View'),
        ('FormBuilder_Allow_Create'),
        ('FormBuilder_Allow_Edit'),
        ('FormBuilder_Allow_Delete'),
        ('FormBuilder_Allow_Manage'),
    
        -- صلاحيات FormTab (Tabs)
        ('FormTab_Allow_View'),
        ('FormTab_Allow_Create'),
        ('FormTab_Allow_Edit'),
        ('FormTab_Allow_Delete'),
        ('FormTab_Allow_Manage'),
    
        -- صلاحيات FormField (Fields)
        ('FormField_Allow_View'),
        ('FormField_Allow_Create'),
        ('FormField_Allow_Edit'),
        ('FormField_Allow_Delete'),
        ('FormField_Allow_Manage')
) AS Permissions(permissionName)
WHERE ug.name = @UserGroupName
  AND NOT EXISTS (
    -- تجنب إضافة صلاحيات مكررة
    SELECT 1 
    FROM Tbl_UserGroup_Permission ugp
    WHERE ugp.idUserGroup = ug.id 
      AND ugp.userPermissionName = Permissions.permissionName
);
*/

-- ============================================
-- ===== التحقق من الصلاحيات المضافة =====
-- ============================================

-- Query للتحقق من الصلاحيات المضافة:
/*
SELECT 
    ug.id AS UserGroupId,
    ug.name AS UserGroupName,
    ugp.userPermissionName,
    ugp.createdDate
FROM Tbl_UserGroup_Permission ugp
INNER JOIN Tbl_UserGroup ug ON ug.id = ugp.idUserGroup
WHERE ugp.userPermissionName IN (
    'FormBuilder_Allow_View',
    'FormBuilder_Allow_Create',
    'FormBuilder_Allow_Edit',
    'FormBuilder_Allow_Delete',
    'FormBuilder_Allow_Manage',
    'FormTab_Allow_View',
    'FormTab_Allow_Create',
    'FormTab_Allow_Edit',
    'FormTab_Allow_Delete',
    'FormTab_Allow_Manage',
    'FormField_Allow_View',
    'FormField_Allow_Create',
    'FormField_Allow_Edit',
    'FormField_Allow_Delete',
    'FormField_Allow_Manage'
)
ORDER BY ug.name, ugp.userPermissionName;
*/

-- ============================================
-- ===== ملاحظات مهمة =====
-- ============================================
-- 1. ⚠️ مهم جداً: غير قيمة @IdCreatedBy في أول الـ Query
--    - القيمة الافتراضية: 1 (افتراضي للـ Admin)
--    - غيرها حسب ID المستخدم اللي عايز تسجّل الصلاحيات باسمه
--    - يمكنك معرفة ID المستخدم من جدول Tbl_User
--
-- 2. الخيار 1 (الأول) يضيف الصلاحيات لكل UserGroup في النظام
-- 3. الخيار 2 يضيف الصلاحيات لجروب معين بالـ ID
-- 4. الخيار 3 يضيف الصلاحيات لجروب معين بالاسم
-- 5. كل الخيارات تستخدم NOT EXISTS لتجنب إضافة صلاحيات مكررة
-- 6. الصلاحيات المضافة:
--    - FormBuilder: View, Create, Edit, Delete, Manage
--    - FormTab: View, Create, Edit, Delete, Manage
--    - FormField: View, Create, Edit, Delete, Manage
-- 7. بعد تشغيل الـ Query، تأكد من:
--    - تسجيل الخروج والدخول مرة أخرى في Angular
--    - أو عمل Refresh للصلاحيات في Angular (PermissionService.refreshPermissions())
--
-- ===== مثال: معرفة ID المستخدم =====
-- SELECT id, username, name FROM Tbl_User WHERE username = 'admin';
-- ============================================
