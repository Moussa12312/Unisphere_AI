export interface Student {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    filiere: string;
    level: string;
    matricule: string;
    qr_code?: string;
    photo?: string;
    domain?: string;
    domaine?: string;
    payment_plan?: string;
    monthly_deposit?: number;
    monthly_installment?: number;
    monthly_months_count?: number;
    university_name?: string;
    created_at?: string;
  }