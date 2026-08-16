export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  university_id?: number;
  phone?: string;
  photo?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterPayload {
  university_name: string;
  country: string;
  institution_type: string;
  university_email: string;
  admin_full_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password: string;
  logo: File;
}
