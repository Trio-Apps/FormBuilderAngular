import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CrystalLayoutDto {
  id: number;
  layoutName: string;
  isDefault: boolean;
}

export interface CrystalLayoutByDocumentTypeDto extends CrystalLayoutDto {
  documentTypeId: number;
}

@Injectable({
  providedIn: 'root'
})
export class CrystalReportsService {
  private readonly baseUrl = `${environment.apiUrl}/CrystalReports`;
  private readonly defaultLayoutsEndpointCacheKey = 'crystal_default_layouts_endpoint_available';
  private defaultLayoutsEndpointAvailable: boolean | null = null;

  constructor(private readonly http: HttpClient) {}

  getDefaultLayout(documentTypeId: number): Observable<CrystalLayoutDto> {
    return this.http.get<CrystalLayoutDto>(`${this.baseUrl}/default-layout/${documentTypeId}`);
  }

  getDefaultLayouts(documentTypeIds: number[]): Observable<CrystalLayoutByDocumentTypeDto[]> {
    if (!documentTypeIds?.length) {
      return of([]);
    }

    const endpointAvailability = this.getDefaultLayoutsEndpointAvailability();
    if (endpointAvailability === false) {
      return this.getDefaultLayoutsFallback(documentTypeIds);
    }

    let params = new HttpParams();
    for (const id of documentTypeIds) {
      params = params.append('documentTypeIds', String(id));
    }

    return this.http.get<CrystalLayoutByDocumentTypeDto[]>(`${this.baseUrl}/default-layouts`, { params }).pipe(
      map((layouts) => {
        this.setDefaultLayoutsEndpointAvailability(true);
        return layouts || [];
      }),
      catchError((error) => {
        // Backward compatibility: if API does not expose /default-layouts yet, fallback to old endpoint per document type.
        if (error?.status !== 404) {
          throw error;
        }

        this.setDefaultLayoutsEndpointAvailability(false);
        return this.getDefaultLayoutsFallback(documentTypeIds);
      })
    );
  }

  getLayoutPdf(idLayout: number, idObject: number, fileName = 'Report'): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('fileName', fileName);

    return this.http.get(`${this.baseUrl}/layout/${idLayout}/object/${idObject}`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  downloadLayoutPdf(idLayout: number, idObject: number, fileName = 'Report'): void {
    this.getLayoutPdf(idLayout, idObject, fileName).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          return;
        }

        const downloadedName = this.resolveFileName(response.headers.get('content-disposition'));
        const finalName = downloadedName || `${fileName}.pdf`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = finalName;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  private resolveFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
    return asciiMatch?.[1] ?? null;
  }

  private getDefaultLayoutsFallback(documentTypeIds: number[]): Observable<CrystalLayoutByDocumentTypeDto[]> {
    const fallbackRequests = documentTypeIds.map((documentTypeId) =>
      this.getDefaultLayout(documentTypeId).pipe(
        map((layout) => ({
          ...layout,
          documentTypeId
        }) as CrystalLayoutByDocumentTypeDto),
        catchError(() => of(null))
      )
    );

    return forkJoin(fallbackRequests).pipe(
      map((results) => (results.filter((x) => !!x) as CrystalLayoutByDocumentTypeDto[]))
    );
  }

  private getDefaultLayoutsEndpointAvailability(): boolean | null {
    if (this.defaultLayoutsEndpointAvailable !== null) {
      return this.defaultLayoutsEndpointAvailable;
    }

    try {
      const stored = sessionStorage.getItem(this.defaultLayoutsEndpointCacheKey);
      if (stored === '1') {
        this.defaultLayoutsEndpointAvailable = true;
      } else if (stored === '0') {
        this.defaultLayoutsEndpointAvailable = false;
      }
    } catch {
      // Ignore storage access issues.
    }

    return this.defaultLayoutsEndpointAvailable;
  }

  private setDefaultLayoutsEndpointAvailability(value: boolean): void {
    this.defaultLayoutsEndpointAvailable = value;
    try {
      sessionStorage.setItem(this.defaultLayoutsEndpointCacheKey, value ? '1' : '0');
    } catch {
      // Ignore storage access issues.
    }
  }
}
