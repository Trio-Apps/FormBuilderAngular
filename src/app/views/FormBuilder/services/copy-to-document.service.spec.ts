import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CopyToDocumentService } from './copy-to-document.service';
import {
  CopyToDocumentRequestDto,
  CopyToDocumentResultDto,
  CopyToDocumentAuditDto,
  CopyToDocumentAuditQueryParams,
  CopyToDocumentAuditResponse,
  ApiResponse
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

describe('CopyToDocumentService', () => {
  let service: CopyToDocumentService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/CopyToDocument`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CopyToDocumentService]
    });
    service = TestBed.inject(CopyToDocumentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('executeCopyToDocument', () => {
    it('should execute CopyToDocument successfully', () => {
      const request: CopyToDocumentRequestDto = {
        config: {
          targetDocumentTypeId: 2,
          targetFormId: 1,
          createNewDocument: true,
          fieldMapping: {
            "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
          },
          gridMapping: {},
          copyCalculatedFields: true,
          copyGridRows: true,
          startWorkflow: false,
          linkDocuments: true,
          copyMetadata: false,
          metadataFields: []
        },
        sourceSubmissionId: 1,
        actionId: null,
        ruleId: null
      };

      const mockResponse: ApiResponse<CopyToDocumentResultDto> = {
        success: true,
        data: {
          success: true,
          targetDocumentId: 100,
          targetDocumentNumber: "DOC-2024-001",
          fieldsCopied: 5,
          gridRowsCopied: 3,
          sourceSubmissionId: 1
        }
      };

      service.executeCopyToDocument(request).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.targetDocumentId).toBe(100);
        expect(result.targetDocumentNumber).toBe("DOC-2024-001");
        expect(result.fieldsCopied).toBe(5);
        expect(result.gridRowsCopied).toBe(3);
      });

      const req = httpMock.expectOne(`${baseUrl}/execute`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should handle API response without wrapper', () => {
      const request: CopyToDocumentRequestDto = {
        config: {
          targetDocumentTypeId: 2,
          targetFormId: 1,
          createNewDocument: true,
          fieldMapping: {},
          gridMapping: {},
          copyCalculatedFields: false,
          copyGridRows: false,
          startWorkflow: false,
          linkDocuments: false,
          copyMetadata: false,
          metadataFields: []
        },
        sourceSubmissionId: 1,
        actionId: null,
        ruleId: null
      };

      const mockResponse: CopyToDocumentResultDto = {
        success: true,
        targetDocumentId: 100,
        targetDocumentNumber: "DOC-2024-001"
      };

      service.executeCopyToDocument(request).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.targetDocumentId).toBe(100);
      });

      const req = httpMock.expectOne(`${baseUrl}/execute`);
      req.flush(mockResponse);
    });

    it('should handle error response', () => {
      const request: CopyToDocumentRequestDto = {
        config: {
          targetDocumentTypeId: 2,
          targetFormId: 1,
          createNewDocument: true,
          fieldMapping: {},
          gridMapping: {},
          copyCalculatedFields: false,
          copyGridRows: false,
          startWorkflow: false,
          linkDocuments: false,
          copyMetadata: false,
          metadataFields: []
        },
        sourceSubmissionId: 1,
        actionId: null,
        ruleId: null
      };

      const mockErrorResponse = {
        status: 400,
        statusText: 'Bad Request',
        error: {
          message: 'Invalid request data'
        }
      };

      service.executeCopyToDocument(request).subscribe({
        next: () => fail('should have failed with 400 error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid request data');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/execute`);
      req.flush(mockErrorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle failed execution', () => {
      const request: CopyToDocumentRequestDto = {
        config: {
          targetDocumentTypeId: 2,
          targetFormId: 1,
          createNewDocument: true,
          fieldMapping: {},
          gridMapping: {},
          copyCalculatedFields: false,
          copyGridRows: false,
          startWorkflow: false,
          linkDocuments: false,
          copyMetadata: false,
          metadataFields: []
        },
        sourceSubmissionId: 1,
        actionId: null,
        ruleId: null
      };

      const mockResponse: ApiResponse<CopyToDocumentResultDto> = {
        success: true,
        data: {
          success: false,
          errorMessage: "Target form not found"
        }
      };

      service.executeCopyToDocument(request).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.errorMessage).toBe("Target form not found");
      });

      const req = httpMock.expectOne(`${baseUrl}/execute`);
      req.flush(mockResponse);
    });
  });

  describe('getAuditRecords', () => {
    it('should fetch audit records with pagination', () => {
      const params: CopyToDocumentAuditQueryParams = {
        page: 1,
        pageSize: 10,
        success: true
      };

      const mockResponse: ApiResponse<CopyToDocumentAuditResponse> = {
        success: true,
        data: {
          items: [
            {
              id: 1,
              sourceSubmissionId: 1,
              targetDocumentId: 100,
              success: true,
              fieldsCopied: 5,
              gridRowsCopied: 3,
              targetDocumentNumber: "DOC-2024-001",
              executionDate: "2024-02-03T10:00:00",
              createdDate: "2024-02-03T10:00:00",
              isActive: true,
              isDeleted: false
            }
          ],
          totalCount: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1
        }
      };

      service.getAuditRecords(params).subscribe(response => {
        expect(response.items.length).toBe(1);
        expect(response.totalCount).toBe(1);
        expect(response.page).toBe(1);
        expect(response.pageSize).toBe(10);
        expect(response.items[0].id).toBe(1);
      });

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/audit`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('10');
      expect(req.request.params.get('success')).toBe('true');
      req.flush(mockResponse);
    });

    it('should fetch audit records without params', () => {
      const mockResponse: ApiResponse<CopyToDocumentAuditResponse> = {
        success: true,
        data: {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0
        }
      };

      service.getAuditRecords().subscribe(response => {
        expect(response.items.length).toBe(0);
        expect(response.totalCount).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/audit`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle all query parameters', () => {
      const params: CopyToDocumentAuditQueryParams = {
        page: 2,
        pageSize: 20,
        sourceSubmissionId: 1,
        targetDocumentId: 100,
        success: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31"
      };

      const mockResponse: ApiResponse<CopyToDocumentAuditResponse> = {
        success: true,
        data: {
          items: [],
          totalCount: 0,
          page: 2,
          pageSize: 20,
          totalPages: 0
        }
      };

      service.getAuditRecords(params).subscribe();

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/audit`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('20');
      expect(req.request.params.get('sourceSubmissionId')).toBe('1');
      expect(req.request.params.get('targetDocumentId')).toBe('100');
      expect(req.request.params.get('success')).toBe('true');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-12-31');
      req.flush(mockResponse);
    });
  });

  describe('getAuditRecordById', () => {
    it('should fetch audit record by id', () => {
      const auditId = 1;
      const mockResponse: ApiResponse<CopyToDocumentAuditDto> = {
        success: true,
        data: {
          id: 1,
          sourceSubmissionId: 1,
          targetDocumentId: 100,
          success: true,
          fieldsCopied: 5,
          gridRowsCopied: 3,
          targetDocumentNumber: "DOC-2024-001",
          executionDate: "2024-02-03T10:00:00",
          createdDate: "2024-02-03T10:00:00",
          isActive: true,
          isDeleted: false
        }
      };

      service.getAuditRecordById(auditId).subscribe(audit => {
        expect(audit.id).toBe(1);
        expect(audit.sourceSubmissionId).toBe(1);
        expect(audit.targetDocumentId).toBe(100);
        expect(audit.success).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/audit/${auditId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle error when audit record not found', () => {
      const auditId = 999;
      const mockErrorResponse = {
        status: 404,
        statusText: 'Not Found',
        error: {
          message: 'Audit record not found'
        }
      };

      service.getAuditRecordById(auditId).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/audit/${auditId}`);
      req.flush(mockErrorResponse, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getAuditRecordsBySubmission', () => {
    it('should fetch audit records by submission id', () => {
      const submissionId = 1;
      const mockResponse: ApiResponse<CopyToDocumentAuditDto[]> = {
        success: true,
        data: [
          {
            id: 1,
            sourceSubmissionId: 1,
            targetDocumentId: 100,
            success: true,
            fieldsCopied: 5,
            gridRowsCopied: 3,
            targetDocumentNumber: "DOC-2024-001",
            executionDate: "2024-02-03T10:00:00",
            createdDate: "2024-02-03T10:00:00",
            isActive: true,
            isDeleted: false
          },
          {
            id: 2,
            sourceSubmissionId: 1,
            targetDocumentId: 101,
            success: true,
            fieldsCopied: 3,
            gridRowsCopied: 2,
            targetDocumentNumber: "DOC-2024-002",
            executionDate: "2024-02-03T11:00:00",
            createdDate: "2024-02-03T11:00:00",
            isActive: true,
            isDeleted: false
          }
        ]
      };

      service.getAuditRecordsBySubmission(submissionId).subscribe(audits => {
        expect(audits.length).toBe(2);
        expect(audits[0].sourceSubmissionId).toBe(1);
        expect(audits[1].sourceSubmissionId).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/audit/submission/${submissionId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return empty array when no audit records found', () => {
      const submissionId = 999;
      const mockResponse: ApiResponse<CopyToDocumentAuditDto[]> = {
        success: true,
        data: []
      };

      service.getAuditRecordsBySubmission(submissionId).subscribe(audits => {
        expect(audits.length).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/audit/submission/${submissionId}`);
      req.flush(mockResponse);
    });
  });

  describe('getAuditRecordsByTargetDocument', () => {
    it('should fetch audit records by target document id', () => {
      const targetDocumentId = 100;
      const mockResponse: ApiResponse<CopyToDocumentAuditDto[]> = {
        success: true,
        data: [
          {
            id: 1,
            sourceSubmissionId: 1,
            targetDocumentId: 100,
            success: true,
            fieldsCopied: 5,
            gridRowsCopied: 3,
            targetDocumentNumber: "DOC-2024-001",
            executionDate: "2024-02-03T10:00:00",
            createdDate: "2024-02-03T10:00:00",
            isActive: true,
            isDeleted: false
          }
        ]
      };

      service.getAuditRecordsByTargetDocument(targetDocumentId).subscribe(audits => {
        expect(audits.length).toBe(1);
        expect(audits[0].targetDocumentId).toBe(100);
      });

      const req = httpMock.expectOne(`${baseUrl}/audit/target/${targetDocumentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('convertFieldMappingToArray', () => {
    it('should convert field mapping object to array', () => {
      const fieldMapping = {
        "SOURCE_FIELD_1": "TARGET_FIELD_1",
        "SOURCE_FIELD_2": "TARGET_FIELD_2"
      };

      const result = service.convertFieldMappingToArray(fieldMapping);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        sourceFieldCode: "SOURCE_FIELD_1",
        targetFieldCode: "TARGET_FIELD_1"
      });
      expect(result[1]).toEqual({
        sourceFieldCode: "SOURCE_FIELD_2",
        targetFieldCode: "TARGET_FIELD_2"
      });
    });

    it('should return empty array for empty object', () => {
      const fieldMapping = {};
      const result = service.convertFieldMappingToArray(fieldMapping);
      expect(result.length).toBe(0);
    });
  });

  describe('convertFieldMappingToObject', () => {
    it('should convert field mapping array to object', () => {
      const fieldMappings = [
        {
          sourceFieldCode: "SOURCE_FIELD_1",
          targetFieldCode: "TARGET_FIELD_1"
        },
        {
          sourceFieldCode: "SOURCE_FIELD_2",
          targetFieldCode: "TARGET_FIELD_2"
        }
      ];

      const result = service.convertFieldMappingToObject(fieldMappings);

      expect(result).toEqual({
        "SOURCE_FIELD_1": "TARGET_FIELD_1",
        "SOURCE_FIELD_2": "TARGET_FIELD_2"
      });
    });

    it('should return empty object for empty array', () => {
      const fieldMappings: Array<{ sourceFieldCode: string; targetFieldCode: string }> = [];
      const result = service.convertFieldMappingToObject(fieldMappings);
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should execute copy and then fetch audit records', () => {
      const request: CopyToDocumentRequestDto = {
        config: {
          targetDocumentTypeId: 2,
          targetFormId: 1,
          createNewDocument: true,
          fieldMapping: {
            "SOURCE_FIELD_CODE": "TARGET_FIELD_CODE"
          },
          gridMapping: {},
          copyCalculatedFields: true,
          copyGridRows: true,
          startWorkflow: false,
          linkDocuments: true,
          copyMetadata: false,
          metadataFields: []
        },
        sourceSubmissionId: 1,
        actionId: null,
        ruleId: null
      };

      const executeResponse: ApiResponse<CopyToDocumentResultDto> = {
        success: true,
        data: {
          success: true,
          targetDocumentId: 100,
          targetDocumentNumber: "DOC-2024-001",
          sourceSubmissionId: 1
        }
      };

      const auditResponse: ApiResponse<CopyToDocumentAuditDto[]> = {
        success: true,
        data: [
          {
            id: 1,
            sourceSubmissionId: 1,
            targetDocumentId: 100,
            success: true,
            targetDocumentNumber: "DOC-2024-001",
            executionDate: "2024-02-03T10:00:00",
            createdDate: "2024-02-03T10:00:00",
            isActive: true,
            isDeleted: false
          }
        ]
      };

      // Execute copy
      service.executeCopyToDocument(request).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.targetDocumentId).toBe(100);

        // Fetch audit records
        service.getAuditRecordsBySubmission(1).subscribe(audits => {
          expect(audits.length).toBe(1);
          expect(audits[0].targetDocumentId).toBe(100);
        });

        const auditReq = httpMock.expectOne(`${baseUrl}/audit/submission/1`);
        auditReq.flush(auditResponse);
      });

      const executeReq = httpMock.expectOne(`${baseUrl}/execute`);
      executeReq.flush(executeResponse);
    });
  });
});

