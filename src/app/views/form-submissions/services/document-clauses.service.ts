import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DocumentClauseLinkDto {
  id: number;
  submissionId: number;
  clauseId: number;
  clauseCode: string;
  title: string;
  clauseVersion: number;
  currentVersion: number;
  bodySnapshot: string;
  sortOrder: number;
  hasUpdate: boolean;
}

export interface AvailableClauseDto {
  id: number;
  clauseCode: string;
  title: string;
  body: string;
  version: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentClausesService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getLinks(submissionId: number): Observable<DocumentClauseLinkDto[]> {
    return this.http
      .get<any>(`${this.apiBase}/FormSubmissions/${submissionId}/clauses`)
      .pipe(map((r) => (r?.data as DocumentClauseLinkDto[]) || []));
  }

  getAvailable(submissionId: number): Observable<AvailableClauseDto[]> {
    return this.http
      .get<any>(`${this.apiBase}/FormSubmissions/${submissionId}/clauses/available`)
      .pipe(map((r) => (r?.data as AvailableClauseDto[]) || []));
  }

  attach(submissionId: number, clauseId: number): Observable<DocumentClauseLinkDto> {
    return this.http
      .post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/clauses`, { clauseId })
      .pipe(map((r) => r?.data as DocumentClauseLinkDto));
  }

  sync(submissionId: number, linkId: number): Observable<DocumentClauseLinkDto> {
    return this.http
      .post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/clauses/${linkId}/sync`, {})
      .pipe(map((r) => r?.data as DocumentClauseLinkDto));
  }

  detach(submissionId: number, linkId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/FormSubmissions/${submissionId}/clauses/${linkId}`);
  }
}
