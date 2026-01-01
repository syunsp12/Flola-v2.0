
import React, { useState } from 'react';
import { JobStatus, SystemLog, Category, Account, AccountType } from '@/types/ui';
import { 
  Play, 
  Terminal, 
  Activity, 
  Loader2, 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Cpu,
  Wallet,
  CreditCard,
  Building,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface AdminDashboardProps {
  jobs: JobStatus[];
  logs: SystemLog[];
  categories: Category[];
  accounts: Account[];
  onTriggerJob: (jobId: string) => Promise<void>;
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (id: number) => void;
  onSaveAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  jobs, 
  logs, 
  categories, 
  accounts,
  onTriggerJob, 
  onSaveCategory, 
  onDeleteCategory,
  onSaveAccount,
  onDeleteAccount
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'system' | 'categories' | 'accounts'>('system');
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);

  const handleRun = async (jobId: string) => {
    setRunning(prev => ({ ...prev, [jobId]: true }));
    try { await onTriggerJob(jobId); } finally { setRunning(prev => ({ ...prev, [jobId]: false })); }
  };

  return (
    <div className="p-6 space-y-6 pb-32">
      <div className="flex bg-slate-100 p-1.5 rounded-[24px]">
        {[
          { id: 'system', icon: Cpu, label: '稼働状況' },
          { id: 'categories', icon: Tag, label: 'カテゴリ' },
          { id: 'accounts', icon: Building, label: '口座マスタ' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[9px] font-black rounded-2xl transition-all ${activeSubTab === tab.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {activeSubTab === 'system' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /> 連携ジョブ監視</h2>
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.job_id} className="bg-white border rounded-[28px] p-5 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-slate-800 font-mono mb-1">{job.job_id}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${job.last_status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{job.last_status === 'success' ? '正常稼働中' : 'エラー発生'}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRun(job.job_id)} disabled={running[job.job_id]} className="p-3 bg-slate-900 text-white rounded-2xl active:scale-90 transition-all disabled:opacity-30">
                    {running[job.job_id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Terminal className="w-5 h-5 text-indigo-600" /> システムログ</h2>
            <div className="bg-slate-900 rounded-[32px] p-6 font-mono text-[10px] text-slate-300 space-y-3 max-h-64 overflow-y-auto border border-slate-800">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={log.level === 'error' ? 'text-rose-400' : 'text-emerald-400'}>{log.level.toUpperCase()}</span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeSubTab === 'categories' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-800">カテゴリ設定</h2>
            <button onClick={() => { setEditingCategory({id: Date.now(), name: '', type: 'expense', keywords: []}); setIsCatModalOpen(true); }} className="p-2 bg-indigo-600 text-white rounded-xl active:scale-90 shadow-lg shadow-indigo-100"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white border rounded-[28px] p-5 flex items-center justify-between shadow-sm group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.type === 'expense' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {cat.type === 'expense' ? <TrendingUp className="w-5 h-5 rotate-180" /> : <TrendingDown className="w-5 h-5 rotate-180" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{cat.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{cat.type === 'expense' ? '支出' : '収入'}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => {setEditingCategory(cat); setIsCatModalOpen(true);}} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDeleteCategory(cat.id)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'accounts' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-800">口座・資産マスタ</h2>
            <button onClick={() => {setEditingAccount({id: `acc-${Date.now()}`, name: '', type: AccountType.BANK, is_liability: false, balance: 0}); setIsAccModalOpen(true);}} className="p-2 bg-indigo-600 text-white rounded-xl active:scale-90 shadow-lg shadow-indigo-100"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-white border rounded-[28px] p-5 flex items-center justify-between shadow-sm group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${acc.is_liability ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    {acc.type === AccountType.CREDIT_CARD ? <CreditCard className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{acc.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {acc.type === AccountType.BANK ? '銀行' : acc.type === AccountType.CREDIT_CARD ? 'カード' : acc.type === AccountType.SECURITIES ? '証券' : acc.type === AccountType.PENSION ? '年金' : '現金'}
                      </p>
                      {acc.is_liability && <span className="text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">負債</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => {setEditingAccount(acc); setIsAccModalOpen(true);}} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDeleteAccount(acc.id)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCatModalOpen && editingCategory && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-end p-4">
          <div className="w-full max-w-lg mx-auto bg-white rounded-[40px] p-8 space-y-6 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <h2 className="text-xl font-black text-slate-800">カテゴリを編集</h2>
            <div className="space-y-4">
              <input type="text" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="カテゴリ名" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {[
                  { id: 'expense', label: '支出' },
                  { id: 'income', label: '収入' }
                ].map(t => (
                  <button key={t.id} onClick={() => setEditingCategory({...editingCategory, type: t.id as any})} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${editingCategory.type === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t.label}</button>
                ))}
              </div>
              <textarea value={editingCategory.keywords?.join(', ')} onChange={e => setEditingCategory({...editingCategory, keywords: e.target.value.split(',').map(s => s.trim())})} placeholder="AI用キーワード (カンマ区切り)" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 h-24 resize-none" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsCatModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-500 font-black">キャンセル</button>
              <button onClick={() => { onSaveCategory(editingCategory as Category); setIsCatModalOpen(false); }} className="flex-[2] py-4 bg-indigo-600 rounded-2xl text-white font-black shadow-xl shadow-indigo-100">保存する</button>
            </div>
          </div>
        </div>
      )}

      {isAccModalOpen && editingAccount && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-end p-4">
          <div className="w-full max-w-lg mx-auto bg-white rounded-[40px] p-8 space-y-6 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <h2 className="text-xl font-black text-slate-800">口座情報を編集</h2>
            <div className="space-y-4">
              <input type="text" value={editingAccount.name} onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} placeholder="口座名称" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
              <select value={editingAccount.type} onChange={e => setEditingAccount({...editingAccount, type: e.target.value as AccountType})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 appearance-none">
                <option value={AccountType.BANK}>銀行</option>
                <option value={AccountType.CREDIT_CARD}>クレジットカード</option>
                <option value={AccountType.SECURITIES}>証券</option>
                <option value={AccountType.PENSION}>年金・積立</option>
                <option value={AccountType.WALLET}>現金・財布</option>
              </select>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">負債として扱う</span>
                <button onClick={() => setEditingAccount({...editingAccount, is_liability: !editingAccount.is_liability})} className={`w-12 h-6 rounded-full transition-all relative ${editingAccount.is_liability ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingAccount.is_liability ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <input type="number" value={editingAccount.balance} onChange={e => setEditingAccount({...editingAccount, balance: Number(e.target.value)})} placeholder="現在残高" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsAccModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-500 font-black">キャンセル</button>
              <button onClick={() => { onSaveAccount(editingAccount as Account); setIsAccModalOpen(false); }} className="flex-[2] py-4 bg-indigo-600 rounded-2xl text-white font-black shadow-xl shadow-indigo-100">保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
