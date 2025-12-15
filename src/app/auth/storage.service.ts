import { Injectable } from '@angular/core';

/**
 * Secure Storage Service
 * Uses sessionStorage instead of localStorage for better security
 * sessionStorage is cleared when browser tab/window is closed
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_NAME_KEY = 'user_name';
  private readonly USER_ROLE_KEY = 'user_role';
  private readonly USER_ID_KEY = 'user_id';

  /**
   * Check if sessionStorage is available
   */
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    if (this.isStorageAvailable()) {
      sessionStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (this.isStorageAvailable()) {
      return sessionStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Set user information
   */
  setUserInfo(username: string, role: string, userId?: number): void {
    if (this.isStorageAvailable()) {
      sessionStorage.setItem(this.USER_NAME_KEY, username);
      sessionStorage.setItem(this.USER_ROLE_KEY, role);
      if (userId) {
        sessionStorage.setItem(this.USER_ID_KEY, userId.toString());
      }
    }
  }

  /**
   * Get username
   */
  getUsername(): string | null {
    if (this.isStorageAvailable()) {
      return sessionStorage.getItem(this.USER_NAME_KEY);
    }
    return null;
  }

  /**
   * Get user role
   */
  getRole(): string | null {
    if (this.isStorageAvailable()) {
      return sessionStorage.getItem(this.USER_ROLE_KEY);
    }
    return null;
  }

  /**
   * Get user ID
   */
  getUserId(): number | null {
    if (this.isStorageAvailable()) {
      const userId = sessionStorage.getItem(this.USER_ID_KEY);
      return userId ? parseInt(userId, 10) : null;
    }
    return null;
  }

  /**
   * Clear all authentication data
   */
  clear(): void {
    if (this.isStorageAvailable()) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_NAME_KEY);
      sessionStorage.removeItem(this.USER_ROLE_KEY);
      sessionStorage.removeItem(this.USER_ID_KEY);
    }
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  hasToken(): boolean {
    return !!this.getToken();
  }
}
