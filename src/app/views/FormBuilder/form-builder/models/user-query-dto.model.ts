// User Query Models for storing and retrieving SQL queries

export interface UserQueryDto {
  id: number;
  queryName: string;
  databaseName: string;
  query: string;
  userId: string;
  createdDate: string; // DateTime as ISO string
  updatedDate?: string | null; // DateTime as ISO string or null
  isActive: boolean;
  createdByUserId?: string | null;
}

export interface CreateUserQueryDto {
  queryName: string;
  databaseName: string;
  query: string;
}

export interface UpdateUserQueryDto {
  queryName?: string;
  databaseName?: string;
  query?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

