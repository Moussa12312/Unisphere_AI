import api from '@/lib/api';

export interface Supplier {
  id: number;
  name: string;
  category?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  is_default: number;
}

export interface Expense {
  id: number;
  reference: string;
  title: string;
  description?: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  status: string;
  category?: { id: number; name: string };
  supplier?: { id: number; name: string };
}

export interface BankAccount {
  id: number;
  name: string;
  account_type: string;
  bank_name?: string;
  account_number?: string;
  initial_balance: number;
  balance: number;
}

export interface Budget {
  id: number;
  category: { id: number; name: string };
  department?: string;
  period: string;
  allocated_amount: number;
  spent_amount: number;
  remaining: number;
  usage_percent: number;
}

export interface FixedAsset {
  id: number;
  name: string;
  category: string;
  purchase_date: string;
  purchase_value: number;
  depreciation_years: number;
  current_value: number;
  location?: string;
}

export interface PayrollEntry {
  id: number;
  user: { id: number; full_name: string; role: string };
  period: string;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: string;
  paid_date?: string;
}

export const accountingService = {
  // Dashboard & états financiers
  getDashboard: async () => (await api.get('/api/v1/accounting/dashboard')).data,
  getIncomeStatement: async (params?: { start_date?: string; end_date?: string }) =>
    (await api.get('/api/v1/accounting/income-statement', { params })).data,

  // Fournisseurs
  getSuppliers: async (search?: string): Promise<Supplier[]> =>
    (await api.get('/api/v1/accounting/suppliers', { params: { search } })).data,
  createSupplier: async (data: Partial<Supplier>) => (await api.post('/api/v1/accounting/suppliers', data)).data,
  updateSupplier: async (id: number, data: Partial<Supplier>) => (await api.put(`/api/v1/accounting/suppliers/${id}`, data)).data,
  deleteSupplier: async (id: number) => (await api.delete(`/api/v1/accounting/suppliers/${id}`)).data,

  // Catégories de dépenses
  getCategories: async (): Promise<ExpenseCategory[]> => (await api.get('/api/v1/accounting/expense-categories')).data,
  createCategory: async (data: { name: string; description?: string }) => (await api.post('/api/v1/accounting/expense-categories', data)).data,
  deleteCategory: async (id: number) => (await api.delete(`/api/v1/accounting/expense-categories/${id}`)).data,

  // Dépenses
  getExpenses: async (params?: any): Promise<Expense[]> => (await api.get('/api/v1/accounting/expenses', { params })).data,
  createExpense: async (data: any) => (await api.post('/api/v1/accounting/expenses', data)).data,
  deleteExpense: async (id: number) => (await api.delete(`/api/v1/accounting/expenses/${id}`)).data,

  // Trésorerie
  getBankAccounts: async (): Promise<BankAccount[]> => (await api.get('/api/v1/accounting/bank-accounts')).data,
  createBankAccount: async (data: Partial<BankAccount>) => (await api.post('/api/v1/accounting/bank-accounts', data)).data,
  deleteBankAccount: async (id: number) => (await api.delete(`/api/v1/accounting/bank-accounts/${id}`)).data,
  getCashTransactions: async (bank_account_id?: number) =>
    (await api.get('/api/v1/accounting/cash-transactions', { params: { bank_account_id } })).data,
  createCashTransaction: async (data: any) => (await api.post('/api/v1/accounting/cash-transactions', data)).data,

  // Budget
  getBudgets: async (period?: string): Promise<Budget[]> => (await api.get('/api/v1/accounting/budgets', { params: { period } })).data,
  createBudget: async (data: any) => (await api.post('/api/v1/accounting/budgets', data)).data,
  deleteBudget: async (id: number) => (await api.delete(`/api/v1/accounting/budgets/${id}`)).data,

  // Immobilisations
  getAssets: async (): Promise<FixedAsset[]> => (await api.get('/api/v1/accounting/fixed-assets')).data,
  createAsset: async (data: any) => (await api.post('/api/v1/accounting/fixed-assets', data)).data,
  deleteAsset: async (id: number) => (await api.delete(`/api/v1/accounting/fixed-assets/${id}`)).data,

  // Paie
  getEligibleStaff: async () => (await api.get('/api/v1/accounting/payroll/eligible-staff')).data,
  getPayroll: async (period?: string): Promise<PayrollEntry[]> => (await api.get('/api/v1/accounting/payroll', { params: { period } })).data,
  createPayrollEntry: async (data: any) => (await api.post('/api/v1/accounting/payroll', data)).data,
  paySalary: async (id: number) => (await api.post(`/api/v1/accounting/payroll/${id}/pay`)).data,
};
