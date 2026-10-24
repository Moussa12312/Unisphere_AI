export type UserRole =
  | 'student'
  | 'teacher'
  | 'secretary'
  | 'censeur'
  | 'admin'
  | 'guard'
  | 'accountant'
  | 'alumni';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  university_id?: number;
  phone?: string;
  avatar?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  subscription?: {
    status: string;
    plan: string;
    is_active: boolean;
    days_left: number;
  };
}
