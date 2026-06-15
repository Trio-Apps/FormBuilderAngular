import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DocuSignSettingsDto {
  integratorKey?: string | null;
  userId?: string | null;
  accountId?: string | null;
  apiBasePath?: string | null;
  baseUrl?: string | null;
  oAuthBaseUrl?: string | null;
  redirectUri?: string | null;
  recipientReturnUrl?: string | null;
  hasPrivateKey?: boolean;
  isActive?: boolean;
}

export interface DocuSignSettingsUpsertDto extends DocuSignSettingsDto {
  privateKeyPem?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DocuSignSettingsService {
  private base = `${environment.apiUrl}/DocuSignSettings`;

  constructor(private http: HttpClient) {}

  get(): Observable<DocuSignSettingsDto> {
    return this.http.get<any>(this.base).pipe(map(r => (r?.data as DocuSignSettingsDto) || {}));
  }

  save(dto: DocuSignSettingsUpsertDto): Observable<any> {
    return this.http.put<any>(this.base, dto).pipe(map(r => r?.data));
  }

  /** Reveal the stored private key PEM (admin-only, on demand). */
  revealPrivateKey(): Observable<string> {
    return this.http.get<any>(`${this.base}/private-key`).pipe(map(r => (r?.data?.privateKeyPem as string) || ''));
  }
}
