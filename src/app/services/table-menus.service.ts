// ============================================================
// Angular Service for Table Menus API
// ============================================================
// هذا الملف يحتوي على Service كامل للتعامل مع Table Menus API

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

// ============================================================
// Interfaces / DTOs
// ============================================================

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

// Menu DTOs
export interface TableMenuDto {
  id: number;
  name: string;
  foreignName?: string;
  menuCode: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
  subMenus?: TableSubMenuDto[];
  menuDocuments?: TableMenuDocumentDto[];
  permissions?: string[];
}

export interface CreateTableMenuDto {
  name: string;
  foreignName?: string;
  menuCode: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  permissions?: string[];
}

export interface UpdateTableMenuDto {
  name?: string;
  foreignName?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
  permissions?: string[];
}

// Sub Menu DTOs
export interface TableSubMenuDto {
  id: number;
  name: string;
  foreignName?: string;
  menuId: number;
  menuName?: string;
  displayOrder: number;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
  menuDocuments?: TableMenuDocumentDto[];
  permissions?: string[];
}

export interface CreateTableSubMenuDto {
  name: string;
  foreignName?: string;
  menuId: number;
  displayOrder: number;
  isActive: boolean;
  permissions?: string[];
}

export interface UpdateTableSubMenuDto {
  name?: string;
  foreignName?: string;
  displayOrder?: number;
  isActive?: boolean;
  permissions?: string[];
}

// Menu Document DTOs
export interface TableMenuDocumentDto {
  id: number;
  documentTypeId: number;
  documentTypeName?: string;
  documentTypeCode?: string;
  menuId?: number;
  menuName?: string;
  subMenuId?: number;
  subMenuName?: string;
  displayOrder: number;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
  permissions?: string[];
}

export interface CreateTableMenuDocumentDto {
  documentTypeId: number;
  menuId?: number;
  subMenuId?: number;
  displayOrder: number;
  isActive: boolean;
  permissions?: string[];
}

export interface UpdateTableMenuDocumentDto {
  menuId?: number;
  subMenuId?: number;
  displayOrder?: number;
  isActive?: boolean;
  permissions?: string[];
}

// Dashboard DTOs
export interface DashboardMenuDto {
  id: number;
  name: string;
  foreignName?: string;
  menuCode: string;
  icon?: string;
  displayOrder: number;
  permissions?: string[];
  subMenus?: DashboardSubMenuDto[];
  documents?: DashboardDocumentDto[];
}

export interface DashboardSubMenuDto {
  id: number;
  name: string;
  foreignName?: string;
  displayOrder: number;
  permissions?: string[];
  documents?: DashboardDocumentDto[];
}

export interface DashboardDocumentDto {
  id: number;
  documentTypeId: number;
  documentTypeName?: string;
  documentTypeCode?: string;
  displayOrder: number;
  permissions?: string[];
}

// ============================================================
// Service
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class TableMenusService {
  private apiUrl = `${environment.apiUrl}/TableMenus`; // تأكد من تحديث environment.apiUrl

  constructor(private http: HttpClient) {}

  // ============================================================
  // Helper Methods
  // ============================================================

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'حدث خطأ غير متوقع';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `خطأ: ${error.error.message}`;
    } else {
      errorMessage = `خطأ ${error.status}: ${error.error?.message || error.message}`;
    }
    console.error('TableMenusService Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // ============================================================
  // Menu Endpoints
  // ============================================================

  /**
   * Get all menus
   * GET /api/TableMenus/menus
   */
  getAllMenus(): Observable<TableMenuDto[]> {
    return this.http.get<ApiResponse<TableMenuDto[]>>(
      `${this.apiUrl}/menus`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get menu by ID
   * GET /api/TableMenus/menus/{id}
   */
  getMenuById(id: number): Observable<TableMenuDto> {
    return this.http.get<ApiResponse<TableMenuDto>>(
      `${this.apiUrl}/menus/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Get menu by code
   * GET /api/TableMenus/menus/code/{menuCode}
   */
  getMenuByCode(menuCode: string): Observable<TableMenuDto> {
    return this.http.get<ApiResponse<TableMenuDto>>(
      `${this.apiUrl}/menus/code/${menuCode}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Create menu
   * POST /api/TableMenus/menus
   */
  createMenu(createDto: CreateTableMenuDto): Observable<TableMenuDto> {
    return this.http.post<ApiResponse<TableMenuDto>>(
      `${this.apiUrl}/menus`,
      createDto,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Update menu
   * PUT /api/TableMenus/menus/{id}
   */
  updateMenu(id: number, updateDto: UpdateTableMenuDto): Observable<TableMenuDto> {
    return this.http.put<ApiResponse<TableMenuDto>>(
      `${this.apiUrl}/menus/${id}`,
      updateDto,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Delete menu (hard delete)
   * DELETE /api/TableMenus/menus/{id}
   */
  deleteMenu(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/menus/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Soft delete menu
   * DELETE /api/TableMenus/menus/{id}/soft-delete
   */
  softDeleteMenu(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/menus/${id}/soft-delete`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  // ============================================================
  // Sub Menu Endpoints
  // ============================================================

  /**
   * Get all sub menus
   * GET /api/TableMenus/sub-menus
   */
  getAllSubMenus(): Observable<TableSubMenuDto[]> {
    return this.http.get<ApiResponse<TableSubMenuDto[]>>(
      `${this.apiUrl}/sub-menus`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get sub menus by menu ID
   * GET /api/TableMenus/sub-menus/menu/{menuId}
   */
  getSubMenusByMenuId(menuId: number): Observable<TableSubMenuDto[]> {
    return this.http.get<ApiResponse<TableSubMenuDto[]>>(
      `${this.apiUrl}/sub-menus/menu/${menuId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get sub menu by ID
   * GET /api/TableMenus/sub-menus/{id}
   */
  getSubMenuById(id: number): Observable<TableSubMenuDto> {
    return this.http.get<ApiResponse<TableSubMenuDto>>(
      `${this.apiUrl}/sub-menus/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Create sub menu
   * POST /api/TableMenus/sub-menus
   */
  createSubMenu(createDto: CreateTableSubMenuDto): Observable<TableSubMenuDto> {
    return this.http.post<ApiResponse<TableSubMenuDto>>(
      `${this.apiUrl}/sub-menus`,
      createDto,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Update sub menu
   * PUT /api/TableMenus/sub-menus/{id}
   */
  updateSubMenu(id: number, updateDto: UpdateTableSubMenuDto): Observable<TableSubMenuDto> {
    return this.http.put<ApiResponse<TableSubMenuDto>>(
      `${this.apiUrl}/sub-menus/${id}`,
      updateDto,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Delete sub menu (hard delete)
   * DELETE /api/TableMenus/sub-menus/{id}
   */
  deleteSubMenu(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/sub-menus/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Soft delete sub menu
   * DELETE /api/TableMenus/sub-menus/{id}/soft-delete
   */
  softDeleteSubMenu(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/sub-menus/${id}/soft-delete`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  // ============================================================
  // Menu Document Endpoints
  // ============================================================

  /**
   * Get all menu documents
   * GET /api/TableMenus/menu-documents
   */
  getAllMenuDocuments(): Observable<TableMenuDocumentDto[]> {
    return this.http.get<ApiResponse<TableMenuDocumentDto[]>>(
      `${this.apiUrl}/menu-documents`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get menu documents by menu ID
   * GET /api/TableMenus/menu-documents/menu/{menuId}
   */
  getMenuDocumentsByMenuId(menuId: number): Observable<TableMenuDocumentDto[]> {
    return this.http.get<ApiResponse<TableMenuDocumentDto[]>>(
      `${this.apiUrl}/menu-documents/menu/${menuId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get menu documents by sub menu ID
   * GET /api/TableMenus/menu-documents/sub-menu/{subMenuId}
   */
  getMenuDocumentsBySubMenuId(subMenuId: number): Observable<TableMenuDocumentDto[]> {
    return this.http.get<ApiResponse<TableMenuDocumentDto[]>>(
      `${this.apiUrl}/menu-documents/sub-menu/${subMenuId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get menu document by ID
   * GET /api/TableMenus/menu-documents/{id}
   */
  getMenuDocumentById(id: number): Observable<TableMenuDocumentDto> {
    return this.http.get<ApiResponse<TableMenuDocumentDto>>(
      `${this.apiUrl}/menu-documents/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Create menu document
   * POST /api/TableMenus/menu-documents
   */
  createMenuDocument(createDto: CreateTableMenuDocumentDto): Observable<TableMenuDocumentDto> {
    return this.http.post<ApiResponse<TableMenuDocumentDto>>(
      `${this.apiUrl}/menu-documents`,
      createDto,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Update menu document
   * PUT /api/TableMenus/menu-documents/{id}
   */
  updateMenuDocument(id: number, updateDto: UpdateTableMenuDocumentDto): Observable<TableMenuDocumentDto> {
    return this.http.put<ApiResponse<TableMenuDocumentDto>>(
      `${this.apiUrl}/menu-documents/${id}`,
      updateDto,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Delete menu document (hard delete)
   * DELETE /api/TableMenus/menu-documents/{id}
   */
  deleteMenuDocument(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/menu-documents/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Soft delete menu document
   * DELETE /api/TableMenus/menu-documents/{id}/soft-delete
   */
  softDeleteMenuDocument(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/menu-documents/${id}/soft-delete`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  // ============================================================
  // Dashboard Endpoints (No Authentication Required)
  // ============================================================

  /**
   * Get dashboard menus
   * GET /api/TableMenus/dashboard?permissions=Role1&permissions=Role2
   * Note: لا يحتاج Authentication - يستخدم Query Parameters فقط
   */
  getDashboardMenus(permissions?: string[]): Observable<DashboardMenuDto[]> {
    let params = new HttpParams();
    
    if (permissions && permissions.length > 0) {
      permissions.forEach(permission => {
        params = params.append('permissions', permission);
      });
    }

    // لا يحتاج Authorization header
    return this.http.get<ApiResponse<DashboardMenuDto[]>>(
      `${this.apiUrl}/dashboard`,
      { params }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Get dashboard menu by ID
   * GET /api/TableMenus/dashboard/menus/{menuId}?permissions=Role1
   * Note: لا يحتاج Authentication
   */
  getDashboardMenuById(menuId: number, permissions?: string[]): Observable<DashboardMenuDto> {
    let params = new HttpParams();
    
    if (permissions && permissions.length > 0) {
      permissions.forEach(permission => {
        params = params.append('permissions', permission);
      });
    }

    // لا يحتاج Authorization header
    return this.http.get<ApiResponse<DashboardMenuDto>>(
      `${this.apiUrl}/dashboard/menus/${menuId}`,
      { params }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }
}
