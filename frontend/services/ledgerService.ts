import api from '@/lib/api';

export interface Account {
  id: number;
  code: string;
  name: string;
  account_class: string;
}

export interface JournalEntryLine {
  account: { id: number; code: string; name: string };
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: number;
  reference: string;
  entry_date: string;
  description: string;
  source: string;
  lines: JournalEntryLine[];
}

export interface TrialBalanceRow {
  account: { id: number; code: string; name: string; class: string };
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface FiscalYear {
  id: number;
  period: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
}

export interface BankReconciliation {
  id: number;
  bank_account_id: number;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  status: string;
  notes?: string;
}

export const ledgerService = {
  // Plan comptable
  getAccounts: async (): Promise<Account[]> => (await api.get('/api/v1/ledger/accounts')).data,
  createAccount: async (data: Partial<Account>) => (await api.post('/api/v1/ledger/accounts', data)).data,
  deleteAccount: async (id: number) => (await api.delete(`/api/v1/ledger/accounts/${id}`)).data,

  // Journal / écritures
  getJournal: async (params?: any): Promise<JournalEntry[]> => (await api.get('/api/v1/ledger/journal', { params })).data,
  createManualEntry: async (data: { entry_date: string; description: string; lines: { account_id: number; debit: number; credit: number; description?: string }[] }) =>
    (await api.post('/api/v1/ledger/journal', data)).data,
  deleteEntry: async (id: number) => (await api.delete(`/api/v1/ledger/journal/${id}`)).data,

  // Grand livre par compte
  getAccountLedger: async (accountId: number) => (await api.get(`/api/v1/ledger/ledger/${accountId}`)).data,

  // Balance
  getTrialBalance: async () => (await api.get('/api/v1/ledger/trial-balance')).data,

  // Exercices comptables
  getFiscalYears: async (): Promise<FiscalYear[]> => (await api.get('/api/v1/ledger/fiscal-years')).data,
  createFiscalYear: async (data: { period: string; start_date: string; end_date: string }) =>
    (await api.post('/api/v1/ledger/fiscal-years', data)).data,
  closeFiscalYear: async (id: number) => (await api.post(`/api/v1/ledger/fiscal-years/${id}/close`)).data,

  // Rapprochement bancaire
  getReconciliations: async (bank_account_id?: number): Promise<BankReconciliation[]> =>
    (await api.get('/api/v1/ledger/bank-reconciliations', { params: { bank_account_id } })).data,
  createReconciliation: async (data: { bank_account_id: number; statement_date: string; statement_balance: number; notes?: string }) =>
    (await api.post('/api/v1/ledger/bank-reconciliations', data)).data,
};
