// ==================== CopyToDocument Models ====================
// هذا الملف يحتوي على جميع الـ Interfaces الخاصة بـ CopyToDocument API
// تم إنشاؤه وفقاً لدليل التكامل الجديد

/**
 * CopyToDocument Action DTO - للاستخدام المباشر مع API
 */
export interface CopyToDocumentActionDto {
  // الحقول المطلوبة الجديدة
  sourceDocumentTypeId: number;  // مطلوب - جديد
  sourceFormId: number;          // مطلوب - كان اختياري
  
  // الحقول الموجودة
  targetDocumentTypeId: number;
  targetFormId: number;
  createNewDocument: boolean;
  targetDocumentId?: number;
  
  // الحقل الجديد
  initialStatus?: 'Draft' | 'Submitted';  // جديد - القيمة الافتراضية: 'Draft'
  
  // Field Mapping
  fieldMapping: { [sourceFieldCode: string]: string };  // SourceFieldCode -> TargetFieldCode
  gridMapping?: { [sourceGridCode: string]: string };
  
  // Options
  copyCalculatedFields: boolean;
  copyGridRows: boolean;
  startWorkflow: boolean;
  linkDocuments: boolean;
  copyAttachments: boolean;
  copyMetadata: boolean;
  overrideTargetDefaults: boolean;
  metadataFields?: string[];
}

/**
 * CopyToDocument Result DTO - نتيجة التنفيذ
 */
export interface CopyToDocumentResultDto {
  success: boolean;
  targetDocumentId?: number;
  targetDocumentNumber?: string;
  errorMessage?: string;
  fieldsCopied: number;
  gridRowsCopied: number;
  actionId?: number;
  sourceSubmissionId: number;
}

/**
 * Execute CopyToDocument Request DTO - للاستخدام بـ IDs
 */
export interface ExecuteCopyToDocumentRequestDto {
  config: CopyToDocumentActionDto;
  sourceSubmissionId?: number;
  actionId?: number;
  ruleId?: number;
}

/**
 * CopyToDocument Action By Codes DTO - للاستخدام بـ Codes
 */
export interface CopyToDocumentActionByCodesDto {
  sourceDocumentTypeCode: string;  // جديد - مطلوب
  sourceFormCode: string;           // جديد - مطلوب
  targetDocumentTypeCode: string;
  targetFormCode: string;
  createNewDocument: boolean;
  targetDocumentId?: number;
  initialStatus?: 'Draft' | 'Submitted';  // جديد
  fieldMapping?: { [key: string]: string };
  gridMapping?: { [key: string]: string };
  copyCalculatedFields: boolean;
  copyGridRows: boolean;
  startWorkflow: boolean;
  linkDocuments: boolean;
  copyAttachments: boolean;
  copyMetadata: boolean;
  overrideTargetDefaults: boolean;
  metadataFields?: string[];
}

/**
 * Execute CopyToDocument By Codes Request DTO
 */
export interface ExecuteCopyToDocumentByCodesRequestDto {
  config: CopyToDocumentActionByCodesDto;
  sourceSubmissionId?: number;
  actionId?: number;
  ruleId?: number;
}

