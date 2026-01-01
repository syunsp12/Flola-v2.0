
import { Account, AccountType, Category, Transaction, TransactionType, TransactionStatus, JobStatus, SystemLog, MonthlyBalance, SalarySlip } from '@/types/ui';

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: '三井住友銀行', type: AccountType.BANK, is_liability: false, balance: 1250000 },
  { id: 'acc-2', name: 'Oliveフレキシブルペイ', type: AccountType.CREDIT_CARD, is_liability: true, balance: -45000 },
  { id: 'acc-3', name: '野村証券', type: AccountType.SECURITIES, is_liability: false, balance: 3500000 },
  { id: 'acc-4', name: '企業型DC', type: AccountType.PENSION, is_liability: false, balance: 800000 },
  { id: 'acc-5', name: '現金', type: AccountType.WALLET, is_liability: false, balance: 12000 },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: '食費', type: 'expense', keywords: ['セブン', 'ローソン', 'ファミマ', 'スタバ'] },
  { id: 2, name: '住宅', type: 'expense' },
  { id: 3, name: '水道光熱費', type: 'expense', keywords: ['電気', 'ガス', '水道'] },
  { id: 4, name: '通信費', type: 'expense', keywords: ['ドコモ', 'ソフトバンク', 'au', '楽天'] },
  { id: 5, name: '娯楽', type: 'expense' },
  { id: 6, name: '給与', type: 'income', keywords: ['給与', '賞与'] },
  { id: 7, name: '配当', type: 'income' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2025-12-28',
    amount: 1200,
    type: TransactionType.EXPENSE,
    description: 'セブン-イレブン 港区芝浦店',
    from_account_id: 'acc-2',
    category_id: 1,
    status: TransactionStatus.PENDING,
    is_subscription: false,
    source: 'email'
  },
  {
    id: 'tx-2',
    date: '2025-12-27',
    amount: 4500,
    type: TransactionType.EXPENSE,
    description: 'スターバックスコーヒー',
    from_account_id: 'acc-2',
    category_id: 1,
    status: TransactionStatus.PENDING,
    is_subscription: false,
    source: 'email'
  },
  {
    id: 'tx-3',
    date: '2025-12-25',
    amount: 15000,
    type: TransactionType.TRANSFER,
    description: '銀行引落',
    from_account_id: 'acc-1',
    to_account_id: 'acc-2',
    status: TransactionStatus.CONFIRMED,
    is_subscription: true,
    source: 'manual'
  }
];

export const MOCK_MONTHLY_BALANCES: MonthlyBalance[] = [
  { id: 'mb-1', record_date: '2025-10-31', account_id: 'acc-3', amount: 3200000 },
  { id: 'mb-2', record_date: '2025-11-30', account_id: 'acc-3', amount: 3350000 },
  { id: 'mb-3', record_date: '2025-12-28', account_id: 'acc-3', amount: 3500000 },
];

export const MOCK_SALARY_SLIPS: SalarySlip[] = [
  {
    id: 'ss-1',
    date: '2025-11-25',
    base_pay: 350000,
    overtime_pay: 45000,
    tax: 32000,
    social_insurance: 55000,
    net_pay: 308000
  },
  {
    id: 'ss-2',
    date: '2025-10-25',
    base_pay: 350000,
    overtime_pay: 22000,
    tax: 30000,
    social_insurance: 55000,
    net_pay: 287000
  }
];

export const MOCK_JOBS: JobStatus[] = [
  {
    job_id: 'gas_vpass_parser',
    last_run_at: '2025-12-28T09:00:00Z',
    last_status: 'success',
    next_scheduled_at: '2025-12-28T10:00:00Z'
  },
  {
    job_id: 'scraper_nomura',
    last_run_at: '2025-12-27T23:00:00Z',
    last_status: 'failed',
    next_scheduled_at: '2025-12-28T23:00:00Z'
  }
];

export const MOCK_LOGS: SystemLog[] = [
  { id: 'log-1', timestamp: '2025-12-28T09:05:00Z', source: 'gas_vpass_parser', level: 'info', message: 'Vpassからの通知メール3通を処理完了。' },
  { id: 'log-2', timestamp: '2025-12-27T23:01:00Z', source: 'scraper_nomura', level: 'error', message: 'ログイン失敗: セレクタ ".login-btn" の待機中にタイムアウトしました。', metadata: { stack: 'Error: Timeout...' } },
];
