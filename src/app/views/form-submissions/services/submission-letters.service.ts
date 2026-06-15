import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DocumentLetterDto {
  id: number;
  submissionId: number;
  letterTypeId: number;
  letterName: string;
  escalationOrder: number;
  status: string; // Draft | Issued | Cancelled
  issuedAt?: string | null;
  deadlineAt?: string | null;
  requiresSignature: boolean;
  signedAt?: string | null;
  notes?: string | null;
  deadlineExpired: boolean;
  deadlineExtensionCount?: number;
  deadlineExtendedAt?: string | null;
  deadlineExtendedByUserId?: string | null;
  deadlineExtensionReason?: string | null;
}

export interface LetterTypeDto {
  id: number;
  documentTypeId: number;
  name: string;
  code?: string;
  escalationOrder: number;
  deadlineDays: number;
  requiresSignature: boolean;
  emailTemplateId?: number | null;
  layoutId?: number | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SubmissionLettersService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getLetterTypes(documentTypeId: number): Observable<LetterTypeDto[]> {
    const params = new HttpParams().set('documentTypeId', String(documentTypeId));
    return this.http
      .get<any>(`${this.apiBase}/LetterTypes`, { params })
      .pipe(map((r) => (r?.data as LetterTypeDto[]) || []));
  }

  getLetters(submissionId: number): Observable<DocumentLetterDto[]> {
    return this.http
      .get<any>(`${this.apiBase}/FormSubmissions/${submissionId}/letters`)
      .pipe(map((r) => (r?.data as DocumentLetterDto[]) || []));
  }

  generate(submissionId: number, letterTypeId: number, notes?: string): Observable<DocumentLetterDto> {
    return this.http
      .post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/letters`, { letterTypeId, notes })
      .pipe(map((r) => r?.data as DocumentLetterDto));
  }

  issue(submissionId: number, letterId: number): Observable<DocumentLetterDto> {
    return this.http
      .post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/letters/${letterId}/issue`, {})
      .pipe(map((r) => r?.data as DocumentLetterDto));
  }

  sign(submissionId: number, letterId: number): Observable<DocumentLetterDto> {
    return this.http
      .post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/letters/${letterId}/sign`, {})
      .pipe(map((r) => r?.data as DocumentLetterDto));
  }

  send(submissionId: number, letterId: number, to: string, cc?: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/letters/${letterId}/send`, { to, cc });
  }

  extendDeadline(
    submissionId: number,
    letterId: number,
    payload: { days?: number | null; newDeadline?: string | null; reason?: string | null }
  ): Observable<DocumentLetterDto> {
    return this.http
      .post<any>(`${this.apiBase}/FormSubmissions/${submissionId}/letters/${letterId}/extend-deadline`, payload)
      .pipe(map((r) => r?.data as DocumentLetterDto));
  }
}
