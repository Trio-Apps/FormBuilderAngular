import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface DocuSignOAuthCallbackResponse {
  ok: boolean;
  state?: string;
  token?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  account?: {
    accountId?: string;
    baseUri?: string;
  };
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class DocuSignOAuthService {
  private readonly apiUrl = `${environment.apiUrl}/docusign-oauth`;
  private readonly returnPathStorageKey = 'docusign_oauth_return_path';
  private readonly pendingSubmissionStorageKey = 'docusign_pending_submission_id';

  constructor(private readonly http: HttpClient) {}

  startLogin(scope: string = 'signature', returnPath?: string, pendingSubmissionId?: number): void {
    if (returnPath && returnPath.trim().length > 0) {
      localStorage.setItem(this.returnPathStorageKey, returnPath.trim());
    }

    if (pendingSubmissionId && pendingSubmissionId > 0) {
      localStorage.setItem(this.pendingSubmissionStorageKey, pendingSubmissionId.toString());
    }

    const state = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const url = `${this.apiUrl}/login?scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
    window.location.href = url;
  }

  exchangeCode(code: string, state?: string): Observable<DocuSignOAuthCallbackResponse> {
    let params = new HttpParams().set('code', code);
    if (state) {
      params = params.set('state', state);
    }

    return this.http.get<DocuSignOAuthCallbackResponse>(`${this.apiUrl}/callback`, { params });
  }

  getStoredReturnPath(): string | null {
    return localStorage.getItem(this.returnPathStorageKey);
  }

  clearStoredReturnPath(): void {
    localStorage.removeItem(this.returnPathStorageKey);
  }

  clearPendingSubmission(): void {
    localStorage.removeItem(this.pendingSubmissionStorageKey);
  }

  getPendingSubmissionId(): number | null {
    const value = localStorage.getItem(this.pendingSubmissionStorageKey);
    if (!value) {
      return null;
    }

    const id = Number(value);
    if (!id || id <= 0) {
      return null;
    }

    return id;
  }
}
