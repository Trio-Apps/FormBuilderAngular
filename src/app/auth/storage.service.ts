import { Injectable } from '@angular/core';

/**
 * Storage Service
 * Stores auth data with a client-side expiry.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';
  private readonly USER_NAME_KEY = 'user_name';
  private readonly USER_ROLE_KEY = 'user_role';
  private readonly USER_ID_KEY = 'user_id';

  /**
   * Check if a storage is available
   */
  private isStorageAvailable(storage: Storage): boolean {
    try {
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getStorage(): Storage | null {
    if (this.isStorageAvailable(localStorage)) {
      return localStorage;
    }
    if (this.isStorageAvailable(sessionStorage)) {
      return sessionStorage;
    }
    return null;
  }

  private clearStorage(storage: Storage): void {
    storage.removeItem(this.TOKEN_KEY);
    storage.removeItem(this.TOKEN_EXPIRES_AT_KEY);
    storage.removeItem(this.USER_NAME_KEY);
    storage.removeItem(this.USER_ROLE_KEY);
    storage.removeItem(this.USER_ID_KEY);
  }

  private isTokenExpiredInStorage(storage: Storage): boolean {
    const expiresAt = storage.getItem(this.TOKEN_EXPIRES_AT_KEY);
    if (!expiresAt) {
      return false;
    }
    const expiryMs = Number(expiresAt);
    return Number.isNaN(expiryMs) || Date.now() >= expiryMs;
  }

  /**
   * Get token expiry (ms since epoch) if stored
   */
  getTokenExpiryMs(): number | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    const expiresAt = storage.getItem(this.TOKEN_EXPIRES_AT_KEY);
    if (!expiresAt) {
      return null;
    }
    const expiryMs = Number(expiresAt);
    return Number.isNaN(expiryMs) ? null : expiryMs;
  }

  /**
   * Set authentication token
   */
  setToken(token: string, expiresAtMs?: number): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    this.clearStorage(storage === localStorage ? sessionStorage : localStorage);
    storage.setItem(this.TOKEN_KEY, token);
    if (expiresAtMs) {
      storage.setItem(this.TOKEN_EXPIRES_AT_KEY, expiresAtMs.toString());
    } else {
      storage.removeItem(this.TOKEN_EXPIRES_AT_KEY);
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    if (this.isTokenExpiredInStorage(storage)) {
      this.clearStorage(storage);
      return null;
    }
    return storage.getItem(this.TOKEN_KEY);
  }

  private getValue(key: string): string | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    if (this.isTokenExpiredInStorage(storage)) {
      this.clearStorage(storage);
      return null;
    }
    return storage.getItem(key);
  }

  /**
   * Set user information
   */
  setUserInfo(username: string, role: string, userId?: number): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(this.USER_NAME_KEY, username);
    storage.setItem(this.USER_ROLE_KEY, role);
    if (userId) {
      storage.setItem(this.USER_ID_KEY, userId.toString());
    }
  }

  /**
   * Get username
   */
  getUsername(): string | null {
    return this.getValue(this.USER_NAME_KEY);
  }

  /**
   * Get user role
   */
  getRole(): string | null {
    return this.getValue(this.USER_ROLE_KEY);
  }

  /**
   * Get user ID
   */
  getUserId(): number | null {
    const userId = this.getValue(this.USER_ID_KEY);
    return userId ? parseInt(userId, 10) : null;
  }

  /**
   * Clear all authentication data
   */
  clear(): void {
    if (this.isStorageAvailable(localStorage)) {
      this.clearStorage(localStorage);
    }
    if (this.isStorageAvailable(sessionStorage)) {
      this.clearStorage(sessionStorage);
    }
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  hasToken(): boolean {
    return !!this.getToken();
  }
}
