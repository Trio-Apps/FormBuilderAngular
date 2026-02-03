import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentApprovalHistoryService, DocumentApprovalHistoryDto } from '../../FormBuilder/services/document-approval-history.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { PermissionService } from '../../../services/permission.service';
import { FormSubmissionsService, FormSubmissionDetailDto, FormSubmissionValueDto, FormSubmissionGridDto, FormSubmissionGridCellDto } from '../../form-submissions/services/form-submissions.service';
import { FormSubmissionAttachmentsService, FormSubmissionAttachmentDto } from '../../form-submissions/services/form-submission-attachments.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-approvals-history-list',
  standalone: true,
  imports: [
    DialogShellComponent,
    CommonModule,
    FormsModule,
    ToastModule,
    TableModule,
    PaginatorModule,
    TooltipModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TableShellComponent
  ],
  templateUrl: './approvals-history-list.component.html',
  styleUrls: ['./approvals-history-list.component.scss'],
  providers: [MessageService]
})
export class ApprovalsHistoryListComponent implements OnInit {
  historyItems: DocumentApprovalHistoryDto[] = [];
  filteredItems: DocumentApprovalHistoryDto[] = [];

  loading = {
    history: false
  };

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  // Submission fields modal
  showSubmissionFieldsModal = false;
  loadingSubmissionFields = false;
  selectedHistoryItem: DocumentApprovalHistoryDto | null = null;
  selectedSubmission: FormSubmissionDetailDto | null = null;
  submissionFieldValues: FormSubmissionValueDto[] = [];
  submissionFieldsSearchTerm = '';
  
  // Attachments and grid data
  fieldAttachments: { [fieldId: number]: FormSubmissionAttachmentDto[] } = {};
  gridDataByField: { [fieldId: number]: FormSubmissionGridDto[] } = {};
  
  // Image preview modal
  showImagePreviewModal = false;
  previewImage: FormSubmissionAttachmentDto | null = null;
  previewImageError = false;

  // Filter options
  selectedActionType: string = 'Submitted';
  actionTypes = [
    { label: 'All Actions', value: 'all' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  constructor(
    private historyService: DocumentApprovalHistoryService,
    private formSubmissionsService: FormSubmissionsService,
    private formSubmissionAttachmentsService: FormSubmissionAttachmentsService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    public translationService: TranslationService,
    public permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
    }

    this.loadApprovalHistory();
  }

  loadApprovalHistory(): void {
    this.loading.history = true;
    this.historyService.getAllApprovalHistory().subscribe({
      next: (items: DocumentApprovalHistoryDto[]) => {
        // Debug: Log items to check submissionStatus
        console.log('[ApprovalsHistory] Loaded items:', items);
        console.log('[ApprovalsHistory] Items with submissionStatus:', items?.map(item => ({
          id: item.id,
          documentNumber: item.documentNumber,
          submissionStatus: item.submissionStatus,
          actionType: item.actionType
        })));
        
        // Sort by action date (newest first)
        this.historyItems = (items || []).sort((a, b) => {
          const dateA = new Date(a.actionDate).getTime();
          const dateB = new Date(b.actionDate).getTime();
          return dateB - dateA;
        });
        this.applyFilters();
        this.loading.history = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading approval history:', error);
        this.historyItems = [];
        this.filteredItems = [];
        this.loading.history = false;
        
        let errorMessage = 'Failed to load approval history';
        if (error.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view approval history. Please contact your administrator.';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.historyItems];

    // Filter by action type or submission status
    if (this.selectedActionType !== 'all') {
      if (this.selectedActionType === 'Submitted') {
        // Filter by submission status (case-insensitive)
        filtered = filtered.filter(item => {
          const status = item.submissionStatus?.toString().trim();
          const isSubmitted = status && status.toLowerCase() === 'submitted';
          
          // Debug log for items that don't match
          if (!isSubmitted && item.submissionStatus) {
            console.log('[ApprovalsHistory] Item not matching Submitted filter:', {
              id: item.id,
              documentNumber: item.documentNumber,
              submissionStatus: item.submissionStatus,
              statusLower: status?.toLowerCase()
            });
          }
          
          return isSubmitted;
        });
        console.log('[ApprovalsHistory] Filtering by Submitted status. Total items:', this.historyItems.length, 'Filtered:', filtered.length);
        if (filtered.length > 0) {
          console.log('[ApprovalsHistory] Filtered items:', filtered.map(item => ({
            id: item.id,
            documentNumber: item.documentNumber,
            submissionStatus: item.submissionStatus
          })));
        } else {
          console.log('[ApprovalsHistory] No items found with Submitted status. All items:', 
            this.historyItems.map(item => ({
              id: item.id,
              documentNumber: item.documentNumber,
              submissionStatus: item.submissionStatus,
              actionType: item.actionType
            }))
          );
        }
      } else {
        // Filter by action type
        filtered = filtered.filter(item => item.actionType === this.selectedActionType);
      }
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.documentNumber?.toLowerCase().includes(term) ||
        item.formName?.toLowerCase().includes(term) ||
        item.documentTypeName?.toLowerCase().includes(term) ||
        item.actionByUserName?.toLowerCase().includes(term) ||
        item.stageName?.toLowerCase().includes(term) ||
        item.comments?.toLowerCase().includes(term)
      );
    }

    this.filteredItems = filtered;
    this.totalRecords = this.filteredItems.length;
    this.first = 0; // Reset to first page when filtering
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onActionTypeChange(): void {
    this.applyFilters();
  }

  refreshData(): void {
    this.loadApprovalHistory();
  }

  openSubmissionFields(item: DocumentApprovalHistoryDto): void {
    if (!item?.submissionId) return;

    this.selectedHistoryItem = item;
    this.showSubmissionFieldsModal = true;
    this.loadingSubmissionFields = true;
    this.selectedSubmission = null;
    this.submissionFieldValues = [];
    this.submissionFieldsSearchTerm = '';
    this.fieldAttachments = {};
    this.gridDataByField = {};

    this.formSubmissionsService.getSubmissionById(item.submissionId).subscribe({
      next: (submission) => {
        this.selectedSubmission = submission;
        this.submissionFieldValues = (submission?.fieldValues || []).slice();
        
        // Load attachments
        this.loadAttachments(submission);
        
        // Load grid data
        this.loadGridData(submission);
        
        this.loadingSubmissionFields = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.loadingSubmissionFields = false;
        console.error('[ApprovalsHistory] Failed to load submission fields:', error);
        const msg = error?.message || 'Failed to load submission fields';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.cdr.detectChanges();
      }
    });
  }

  closeSubmissionFieldsModal(): void {
    this.showSubmissionFieldsModal = false;
    this.loadingSubmissionFields = false;
    this.selectedHistoryItem = null;
    this.selectedSubmission = null;
    this.submissionFieldValues = [];
    this.submissionFieldsSearchTerm = '';
    this.fieldAttachments = {};
    this.gridDataByField = {};
  }
  
  /**
   * Load attachments for file/image fields
   */
  private loadAttachments(submission: FormSubmissionDetailDto): void {
    if (!submission || !submission.id) return;
    
    // Always load from API to get full attachment details with uploadedDate
    this.formSubmissionAttachmentsService.getBySubmissionId(submission.id).subscribe({
      next: (attachments) => {
        // Handle different response formats
        let attachmentsArray: FormSubmissionAttachmentDto[] = [];
        
        if (Array.isArray(attachments)) {
          attachmentsArray = attachments;
        } else if (attachments && typeof attachments === 'object') {
          if ((attachments as any).data && Array.isArray((attachments as any).data)) {
            attachmentsArray = (attachments as any).data;
          } else if ((attachments as any).attachments && Array.isArray((attachments as any).attachments)) {
            attachmentsArray = (attachments as any).attachments;
          } else {
            attachmentsArray = [attachments as any];
          }
        }
        
        attachmentsArray.forEach((att: FormSubmissionAttachmentDto) => {
          if (!this.fieldAttachments[att.fieldId]) {
            this.fieldAttachments[att.fieldId] = [];
          }
          this.fieldAttachments[att.fieldId].push(att);
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Silently handle errors - 404 is normal if no attachments exist
        if (error?.status !== 404) {
          console.error('[ApprovalsHistory] Error loading attachments:', error);
        }
      }
    });
  }
  
  /**
   * Load grid data for grid fields
   */
  private loadGridData(submission: FormSubmissionDetailDto): void {
    if (!submission || !submission.gridData || submission.gridData.length === 0) return;
    
    // Group grid data by fieldId (assuming gridId maps to fieldId)
    submission.gridData.forEach(gridRow => {
      // Try to find fieldId from fieldValues that match gridId
      const matchingFieldValue = this.submissionFieldValues.find(fv => {
        // Check if fieldCode matches gridCode or if we can match by gridId
        return fv.fieldCode === gridRow.gridCode;
      });
      
      if (matchingFieldValue) {
        const fieldId = matchingFieldValue.fieldId;
        if (!this.gridDataByField[fieldId]) {
          this.gridDataByField[fieldId] = [];
        }
        this.gridDataByField[fieldId].push(gridRow);
      } else {
        // Store by gridId if no field match found
        if (!this.gridDataByField[gridRow.gridId]) {
          this.gridDataByField[gridRow.gridId] = [];
        }
        this.gridDataByField[gridRow.gridId].push(gridRow);
      }
    });
  }
  
  /**
   * Get attachments for a specific field
   */
  getFieldAttachments(fieldId: number): FormSubmissionAttachmentDto[] {
    return this.fieldAttachments[fieldId] || [];
  }
  
  /**
   * Check if field has attachments
   */
  hasAttachments(fieldId: number): boolean {
    return this.getFieldAttachments(fieldId).length > 0;
  }
  
  /**
   * Check if attachment is an image
   */
  isImageAttachment(attachment: FormSubmissionAttachmentDto): boolean {
    if (!attachment.contentType) return false;
    return attachment.contentType.startsWith('image/') || 
           /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attachment.fileName);
  }
  
  /**
   * Get image URL for attachment
   */
  getImageUrl(attachment: FormSubmissionAttachmentDto): string {
    if (attachment.downloadUrl) {
      return attachment.downloadUrl;
    }
    if (attachment.filePath) {
      // Remove leading slash if present
      const cleanPath = attachment.filePath.startsWith('/') 
        ? attachment.filePath.substring(1) 
        : attachment.filePath;
      return `${environment.apiUrl}/${cleanPath}`;
    }
    return `${environment.apiUrl}/FormSubmissionAttachments/${attachment.id}/download`;
  }
  
  /**
   * Get download URL for attachment
   */
  getDownloadUrl(attachmentId: number): string {
    return `${environment.apiUrl}/FormSubmissionAttachments/${attachmentId}/download`;
  }
  
  /**
   * Open image preview modal
   */
  openImagePreview(attachment: FormSubmissionAttachmentDto): void {
    if (this.isImageAttachment(attachment)) {
      this.previewImage = attachment;
      this.previewImageError = false;
      this.showImagePreviewModal = true;
    }
  }
  
  /**
   * Close image preview modal
   */
  closeImagePreview(): void {
    this.showImagePreviewModal = false;
    this.previewImage = null;
    this.previewImageError = false;
  }
  
  /**
   * Handle image preview error
   */
  handlePreviewImageError(event: any, attachment: FormSubmissionAttachmentDto): void {
    console.error('[ApprovalsHistory] Failed to load preview image:', attachment);
    this.previewImageError = true;
    if (event && event.target) {
      event.target.style.display = 'none';
    }
  }
  
  /**
   * Handle thumbnail image error
   */
  handleThumbnailError(event: any): void {
    if (event && event.target) {
      event.target.style.display = 'none';
    }
  }
  
  /**
   * Download attachment
   */
  downloadAttachment(attachment: FormSubmissionAttachmentDto): void {
    const downloadUrl = this.getDownloadUrl(attachment.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachment.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Get grid data for a specific field
   */
  getFieldGridData(fieldId: number): FormSubmissionGridDto[] {
    return this.gridDataByField[fieldId] || [];
  }
  
  /**
   * Check if field has grid data
   */
  hasGridData(fieldId: number): boolean {
    return this.getFieldGridData(fieldId).length > 0;
  }
  
  /**
   * Format grid cell value
   */
  formatGridCellValue(cell: FormSubmissionGridCellDto): string {
    if (cell.valueString !== null && cell.valueString !== undefined && cell.valueString !== '') {
      return String(cell.valueString);
    }
    if (cell.valueNumber !== null && cell.valueNumber !== undefined) {
      return String(cell.valueNumber);
    }
    if (cell.valueBool !== null && cell.valueBool !== undefined) {
      return cell.valueBool ? 'true' : 'false';
    }
    if (cell.valueDate !== null && cell.valueDate !== undefined) {
      return this.formatDate(cell.valueDate as any);
    }
    if (cell.valueJson !== null && cell.valueJson !== undefined && cell.valueJson !== '') {
      return String(cell.valueJson);
    }
    return '-';
  }
  
  /**
   * Check if field is a file/image field
   */
  isFileField(fieldValue: FormSubmissionValueDto): boolean {
    if (!fieldValue) return false;
    
    const fieldCode = (fieldValue.fieldCode || '').toLowerCase();
    const fieldName = (fieldValue.fieldName || '').toLowerCase();
    
    // Check by field code/name
    if (fieldCode.includes('image') || fieldCode.includes('file') || fieldCode.includes('attachment')) {
      return true;
    }
    if (fieldName.includes('image') || fieldName.includes('file') || fieldName.includes('attachment')) {
      return true;
    }
    
    // Check if valueJson contains allowedExtensions (file field configuration)
    if (fieldValue.valueJson && fieldValue.valueJson.includes('allowedExtensions')) {
      return true;
    }
    
    // Check if field has attachments
    if (this.hasAttachments(fieldValue.fieldId)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if field is a grid field
   */
  isGridField(fieldValue: FormSubmissionValueDto): boolean {
    if (!fieldValue) return false;
    return this.hasGridData(fieldValue.fieldId);
  }

  getFilteredSubmissionFieldValues(): FormSubmissionValueDto[] {
    const items = this.submissionFieldValues || [];
    const term = (this.submissionFieldsSearchTerm || '').trim().toLowerCase();
    if (!term) return items;

    return items.filter(v => {
      const name = (v.fieldName || '').toLowerCase();
      const code = (v.fieldCode || '').toLowerCase();
      const value = (this.formatSubmissionFieldValue(v) || '').toLowerCase();
      return name.includes(term) || code.includes(term) || value.includes(term);
    });
  }

  formatSubmissionFieldValue(v: FormSubmissionValueDto): string {
    if (!v) return '-';
    
    // Regular field values only (file/grid fields are handled separately in template)
    if (v.valueString !== null && v.valueString !== undefined && v.valueString !== '') return String(v.valueString);
    if (v.valueNumber !== null && v.valueNumber !== undefined) return String(v.valueNumber);
    if (v.valueBool !== null && v.valueBool !== undefined) return v.valueBool ? 'true' : 'false';
    if (v.valueDate !== null && v.valueDate !== undefined) return this.formatDate(v.valueDate as any);
    if (v.valueJson !== null && v.valueJson !== undefined && v.valueJson !== '') return String(v.valueJson);
    return '-';
  }

  getPaginatedItems(): DocumentApprovalHistoryDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredItems.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  getActionTypeBadgeClass(actionType: string): string {
    switch (actionType) {
      case 'Approved':
        return 'badge badge-success';
      case 'Rejected':
        return 'badge badge-danger';
      case 'Returned':
        return 'badge badge-warning';
      case 'Pending':
        return 'badge badge-info';
      default:
        return 'badge badge-secondary';
    }
  }

  getActionTypeIcon(actionType: string): string {
    switch (actionType) {
      case 'Approved':
        return 'pi pi-check';
      case 'Rejected':
        return 'pi pi-times';
      case 'Returned':
        return 'pi pi-reply';
      case 'Pending':
        return 'pi pi-clock';
      default:
        return 'pi pi-circle';
    }
  }

  getStatusBadgeClass(status: string | null | undefined): string {
    if (!status) return 'badge badge-secondary';
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'approved':
        return 'badge badge-success';
      case 'rejected':
        return 'badge badge-danger';
      case 'submitted':
        return 'badge badge-info';
      case 'draft':
        return 'badge badge-secondary';
      default:
        return 'badge badge-secondary';
    }
  }
}






