
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { Account, AccountType, MonthlyBalance } from '@/types/ui';
import { TrendingUp, Wallet, CreditCard, Target, Zap, ChevronRight, Activity } from 'lucide-react';

interface DashboardProps {
  accounts: Account[];
  monthlyBalances: MonthlyBalance[];
}

const Dashboard: React.FC<DashboardProps> = ({ accounts, monthlyBalances }) => {
  const [activeAnalysis, setActiveAnalysis] = useState<'trend' | 'allocation'>('trend');

  const totalAssets = accounts.reduce((acc, curr) => curr.is_liability ? acc : acc + curr.balance, 0);
  const totalLiabilities = Math.abs(accounts.reduce((acc, curr) => curr.is_liability ? acc + curr.balance : acc, 0));
  const netWorth = totalAssets - totalLiabilities;

  const allocationData = useMemo(() => {
    const groups: Record<string, number> = {};
    const typeMapping: Record<string, string> = {
      [AccountType.BANK]: '銀行預金',
      [AccountType.CREDIT_CARD]: 'カード',
      [AccountType.SECURITIES]: '証券',
      [AccountType.PENSION]: '年金',
      [AccountType.WALLET]: '現金'
    };
    
    accounts.forEach(acc => {
      if (!acc.is_liability) {
        const typeLabel = typeMapping[acc.type] || acc.type.toUpperCase();
        groups[typeLabel] = (groups[typeLabel] || 0) + acc.balance;
      }
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

  const trendData = useMemo(() => {
    return monthlyBalances
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
      .map(mb => ({
        date: mb.record_date.slice(5),
        amount: mb.amount
      }));
  }, [monthlyBalances]);

  const savingsTarget = 5000000;
  const progressPercent = Math.min(Math.round((netWorth / savingsTarget) * 100), 100);

  return (
    <div className="p-5 space-y-6 pb-24 animate-in fade-in duration-700">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[28px] blur opacity-20 transition duration-1000"></div>
        <div className="relative bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full opacity-50 blur-3xl"></div>
          <div className="relative z-10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">現在の純資産</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full">
                <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600">+¥12.4万</span>
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              ¥{netWorth.toLocaleString()}
            </h2>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">総資産</p>
                <p className="text-xs font-black text-slate-700">¥{totalAssets.toLocaleString()}</p>
              </div>
              <div className="space-y-0.5 border-l pl-3 border-slate-100">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">負債合計</p>
                <p className="text-xs font-black text-rose-500">¥{totalLiabilities.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-[24px] p-5 text-white flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <Target className="w-4 h-4 text-indigo-400" />
            <span className="text-[8px] font-black text-indigo-400 uppercase">目標: 5M</span>
          </div>
          <div>
            <p className="text-2xl font-black text-indigo-300">{progressPercent}%</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">目標到達予測: 8ヶ月後</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-400 h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
        <div className="bg-indigo-600 rounded-[24px] p-5 text-white flex flex-col justify-between h-32 shadow-lg shadow-indigo-100/50 group cursor-pointer active:scale-95 transition-all">
          <div className="flex justify-between items-center">
            <Zap className="w-4 h-4 text-amber-300" />
            <ChevronRight className="w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <p className="text-[11px] font-black leading-snug">コンビニ支出を30%<br/>抑制できています</p>
            <p className="text-[8px] font-bold text-indigo-200 mt-1 uppercase tracking-widest">AI インサイト ⚡</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <h3 className="font-black text-slate-800 text-xs tracking-tight uppercase">資産分析</h3>
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-xl">
            <button 
              onClick={() => setActiveAnalysis('trend')}
              className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${activeAnalysis === 'trend' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
              推移
            </button>
            <button 
              onClick={() => setActiveAnalysis('allocation')}
              className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${activeAnalysis === 'allocation' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
              配分
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 min-h-[240px] flex flex-col">
          {activeAnalysis === 'trend' ? (
            <div className="flex-1 animate-in fade-in zoom-in-95 duration-500">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#cbd5e1'}} />
                  <YAxis hide domain={['dataMin - 100000', 'dataMax + 100000']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#6366f1' }}
                    formatter={(val: any) => [`¥${Number(val).toLocaleString()}`, '純資産']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center">
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">純資産推移</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '9px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full px-2">
                {allocationData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                      <span className="text-[9px] font-black text-slate-500 uppercase">{entry.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-800">{Math.round((entry.value / totalAssets) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <Wallet className="w-3.5 h-3.5 text-indigo-600" />
          <h3 className="font-black text-slate-800 text-xs tracking-tight uppercase">口座別残高</h3>
        </div>
        <div className="space-y-2.5">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white p-4 rounded-[20px] border border-slate-50 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner ${acc.is_liability ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-indigo-600'}`}>
                  {acc.type === AccountType.BANK ? <Wallet className="w-5.5 h-5.5" /> : <CreditCard className="w-5.5 h-5.5" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{acc.name}</p>
                  <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5 tracking-wider">
                    {acc.type === AccountType.BANK ? '銀行' : acc.type === AccountType.CREDIT_CARD ? 'カード' : acc.type === AccountType.SECURITIES ? '証券' : acc.type === AccountType.PENSION ? '年金' : '現金'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black tracking-tight ${acc.is_liability ? 'text-rose-500' : 'text-slate-800'}`}>
                  {acc.is_liability ? '-' : ''}¥{Math.abs(acc.balance).toLocaleString()}
                </p>
                <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">同期済</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
