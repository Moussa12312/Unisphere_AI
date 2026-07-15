export interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
    university_id?: number;
  }
  
  export interface LoginResponse {
    access_token: string;
    token_type: string;
    role: string;
    full_name: string;
  }