
export enum AccountType {
  BANK = 'bank',
  CREDIT_CARD = 'credit_card',
  SECURITIES = 'securities',
  PENSION = 'pension',
  WALLET = 'wallet'
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IGNORE = 'ignore'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  is_liability: boolean;
  balance: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  keywords?: string[];
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  from_account_id?: string;
  to_account_id?: string;
  category_id?: number;
  status: TransactionStatus;
  is_subscription: boolean;
  source: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  source: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: any;
}

export interface JobStatus {
  job_id: string;
  last_run_at: string;
  last_status: 'success' | 'failed';
  next_scheduled_at: string;
}

export interface MonthlyBalance {
  id: string;
  record_date: string;
  account_id: string;
  amount: number;
}

export interface SalarySlip {
  id: string;
  date: string;
  base_pay: number;
  overtime_pay: number;
  tax: number;
  social_insurance: number;
  net_pay: number;
  details?: any;
}
