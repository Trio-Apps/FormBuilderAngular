import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type SapExecutionMode = 'OnSubmit' | 'OnFinalApproval' | 'OnSpecificWorkflowStage';

export interface SapIntegrationSettingsDto {
  id: number;
  documentTypeId: number;
  sapConfigId: number;
  targetEndpoint: string;
  targetObject?: string | null;
  executionMode: SapExecutionMode;
  triggerStageId?: number | null;
  blockWorkflowOnError: boolean;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string | null;
}

export interface UpsertSapIntegrationSettingsDto {
  documentTypeId: number;
  sapConfigId: number;
  targetEndpoint: string;
  targetObject?: string | null;
  executionMode: SapExecutionMode;
  triggerStageId?: number | null;
  blockWorkflowOnError: boolean;
  isActive: boolean;
}

export interface SapFieldMappingDto {
  id: number;
  formFieldId: number;
  fieldCode: string;
  fieldName: string;
  sapConfigId?: number | null;
  sapFieldName: string;
  isActive: boolean;
}

export interface SaveSapFieldMappingItemDto {
  formFieldId: number;
  sapConfigId: number;
  sapFieldName: string;
  isActive: boolean;
}

export interface SaveSapFieldMappingsDto {
  formBuilderId: number;
  mappings: SaveSapFieldMappingItemDto[];
}

export interface SapServiceLayerEndpointDto {
  name: string;
  entityType?: string | null;
}

export interface SapServiceLayerObjectFieldDto {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SapIntegrationExecuteResultDto {
  success: boolean;
  formId: number;
  submissionId: number;
  sapConfigId: number;
  endpoint: string;
  eventType: string;
  status: string;
  errorMessage?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  shouldBlockWorkflow: boolean;
}

export interface SapIntegrationLogDto {
  id: number;
  formId: number;
  submissionId: number;
  sapConfigId: number;
  endpoint: string;
  eventType: string;
  status: string;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  errorMessage?: string | null;
  timestampUtc: string;
}

export interface SapHanaConfigDto {
  id: number;
  name: string;
  integrationType?: string;
  baseUrl?: string | null;
  userName?: string | null;
  authenticationMethod?: string | null;
  companyDb?: string | null;
  verifySsl?: boolean;
  isActive?: boolean;
}

export interface CreateSapConnectionDto {
  name: string;
  integrationType: 'ServiceLayer';
  baseUrl: string;
  authenticationMethod: 'Session' | 'Token';
  companyDb: string;
  userName: string;
  password: string;
  verifySsl: boolean;
  isActive: boolean;
}

export interface UpdateSapConnectionDto {
  name?: string;
  integrationType?: 'ServiceLayer';
  baseUrl?: string;
  authenticationMethod?: 'Session' | 'Token';
  companyDb?: string;
  userName?: string;
  password?: string;
  verifySsl?: boolean;
  isActive?: boolean;
}

export interface FormFieldLiteDto {
  id: number;
  fieldCode: string;
  fieldName: string;
  isDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SapIntegrationService {
  private readonly sapIntegrationUrl = `${environment.apiUrl}/SapIntegration`;
  private readonly sapConfigsUrl = `${environment.apiUrl}/SapHanaConfigs`;
  private readonly formFieldsUrl = `${environment.apiUrl}/FormFields`;

  constructor(private http: HttpClient) {}

  getSettings(documentTypeId: number): Observable<SapIntegrationSettingsDto | null> {
    return this.http.get<any>(`${this.sapIntegrationUrl}/settings/${documentTypeId}`).pipe(
      map((response) => this.extractItem<SapIntegrationSettingsDto>(response))
    );
  }

  upsertSettings(dto: UpsertSapIntegrationSettingsDto): Observable<SapIntegrationSettingsDto> {
    return this.http.put<any>(`${this.sapIntegrationUrl}/settings`, dto).pipe(
      map((response) => this.extractItem<SapIntegrationSettingsDto>(response) as SapIntegrationSettingsDto)
    );
  }

  getFieldMappings(formBuilderId: number): Observable<SapFieldMappingDto[]> {
    return this.http.get<any>(`${this.sapIntegrationUrl}/field-mappings/${formBuilderId}`).pipe(
      map((response) => this.extractArray<SapFieldMappingDto>(response))
    );
  }

  saveFieldMappings(dto: SaveSapFieldMappingsDto): Observable<SapFieldMappingDto[]> {
    return this.http.put<any>(`${this.sapIntegrationUrl}/field-mappings`, dto).pipe(
      map((response) => this.extractArray<SapFieldMappingDto>(response))
    );
  }

  getServiceLayerEndpoints(sapConfigId: number): Observable<SapServiceLayerEndpointDto[]> {
    return this.http.get<any>(`${this.sapIntegrationUrl}/connections/${sapConfigId}/endpoints`).pipe(
      map((response) => this.extractArray<SapServiceLayerEndpointDto>(response))
    );
  }

  getServiceLayerObjectFields(sapConfigId: number, endpointName: string): Observable<SapServiceLayerObjectFieldDto[]> {
    return this.http.get<any>(`${this.sapIntegrationUrl}/connections/${sapConfigId}/endpoints/${encodeURIComponent(endpointName)}/fields`).pipe(
      map((response) => this.extractArray<SapServiceLayerObjectFieldDto>(response))
    );
  }

  execute(submissionId: number, eventType: string, stageId?: number | null): Observable<SapIntegrationExecuteResultDto> {
    let params = new HttpParams().set('eventType', eventType || 'OnSubmit');
    if (stageId && stageId > 0) {
      params = params.set('stageId', stageId.toString());
    }

    return this.http.post<any>(`${this.sapIntegrationUrl}/execute/submissions/${submissionId}`, null, { params }).pipe(
      map((response) => this.extractItem<SapIntegrationExecuteResultDto>(response) as SapIntegrationExecuteResultDto)
    );
  }

  getLogs(filters: { formId?: number | null; submissionId?: number | null; sapConfigId?: number | null; take?: number } = {}): Observable<SapIntegrationLogDto[]> {
    let params = new HttpParams();
    if (filters.formId && filters.formId > 0) params = params.set('formId', filters.formId.toString());
    if (filters.submissionId && filters.submissionId > 0) params = params.set('submissionId', filters.submissionId.toString());
    if (filters.sapConfigId && filters.sapConfigId > 0) params = params.set('sapConfigId', filters.sapConfigId.toString());
    if (filters.take && filters.take > 0) params = params.set('take', filters.take.toString());

    return this.http.get<any>(`${this.sapIntegrationUrl}/logs`, { params }).pipe(
      map((response) => this.extractArray<SapIntegrationLogDto>(response))
    );
  }

  getSapConfigs(includeInactive = false): Observable<SapHanaConfigDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive.toString());
    return this.http.get<any>(this.sapConfigsUrl, { params }).pipe(
      map((response) => this.extractArray<SapHanaConfigDto>(response))
    );
  }

  createSapConfig(dto: CreateSapConnectionDto): Observable<SapHanaConfigDto> {
    return this.http.post<any>(this.sapConfigsUrl, dto).pipe(
      map((response) => this.extractItem<SapHanaConfigDto>(response) as SapHanaConfigDto)
    );
  }

  updateSapConfig(id: number, dto: UpdateSapConnectionDto): Observable<SapHanaConfigDto> {
    return this.http.put<any>(`${this.sapConfigsUrl}/${id}`, dto).pipe(
      map((response) => this.extractItem<SapHanaConfigDto>(response) as SapHanaConfigDto)
    );
  }

  deleteSapConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.sapConfigsUrl}/${id}`);
  }

  getFormFieldsByFormBuilderId(formBuilderId: number): Observable<FormFieldLiteDto[]> {
    return this.http.get<any>(`${this.formFieldsUrl}/form/${formBuilderId}`).pipe(
      map((response) => this.extractArray<FormFieldLiteDto>(response))
    );
  }

  private extractItem<T>(response: any): T | null {
    if (!response) return null;
    if (Array.isArray(response)) return (response[0] as T) ?? null;
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) return response.data as T;
    if (response.result && typeof response.result === 'object' && !Array.isArray(response.result)) return response.result as T;
    return response as T;
  }

  private extractArray<T>(response: any): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!response || typeof response !== 'object') return [];

    const candidates = [
      response.data,
      response.items,
      response.result,
      response.value,
      response.values,
      response.$values,
      response.data?.items,
      response.data?.result,
      response.data?.$values,
      response.result?.items,
      response.result?.$values
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as T[];
      if (candidate && typeof candidate === 'object' && Array.isArray(candidate.$values)) {
        return candidate.$values as T[];
      }
    }

    return [];
  }
}
