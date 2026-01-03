import React, { useState, useMemo } from 'react';
import { Transaction, TransactionStatus, Category, Account } from '@/types/ui';
import { Check, X, Sparkles, ChevronDown, Loader2, Info, Hash, Database } from 'lucide-react';
import { classifyTransaction } from '@/lib/gemini';
import { getSmartIconUrl, getCardBrandLogo } from '@/lib/utils/icon-helper';

interface TransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onConfirm: (id: string, updates: Partial<Transaction>) => void;
  onIgnore: (id: string) => void;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, categories, accounts, onConfirm, onIgnore }) => {
  const pending = useMemo(() => transactions.filter(t => t.status === TransactionStatus.PENDING), [transactions]);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, { 
    category_id: number; 
    is_subscription: boolean; 
    normalized_merchant?: string;
    reasoning?: string;
  }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runAnalysis = async (tx: Transaction) => {
    for (const cat of categories) {
      const foundKeyword = cat.keywords?.find(kw => tx.description.toLowerCase().includes(kw.toLowerCase()));
      if (foundKeyword) {
        return { 
          category_id: cat.id, 
          is_subscription: tx.is_subscription, 
          normalized_merchant: tx.description,
          reasoning: `キーワード「${foundKeyword}」から「${cat.name}」と判定しました。`
        };
      }
    }
    return await classifyTransaction(tx.description, categories);
  };

  const handleAnalyze = async (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    setAnalyzing(prev => ({ ...prev, [tx.id]: true }));
    try {
      const result = await runAnalysis(tx);
      setSuggestions(prev => ({ ...prev, [tx.id]: result }));
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(prev => ({ ...prev, [tx.id]: false }));
    }
  };

  const handleAnalyzeAll = async () => {
    setIsBatchAnalyzing(true);
    const results = { ...suggestions };
    for (const tx of pending) {
      if (!results[tx.id]) {
        try {
          results[tx.id] = await runAnalysis(tx);
          await new Promise(r => setTimeout(r, 150));
        } catch (e) { console.error(e); }
      }
    }
    setSuggestions(results);
    setIsBatchAnalyzing(false);
  };

  const executeConfirm = (tx: Transaction, suggestion: any) => {
    onConfirm(tx.id, { 
      category_id: suggestion?.category_id || tx.category_id,
      is_subscription: suggestion?.is_subscription || tx.is_subscription,
      description: suggestion?.normalized_merchant || tx.description,
      status: TransactionStatus.CONFIRMED 
    });
  };

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 opacity-30 animate-in fade-in zoom-in duration-1000">
        <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mb-5 shadow-sm border border-slate-50">
          <Check className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="font-black text-slate-800 uppercase tracking-widest text-xs">全て承認済です</p>
        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">未処理の取引はありません。</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 pb-24 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tighter">取引承認</h2>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">未承認: {pending.length}件</p>
        </div>
        <button 
          onClick={handleAnalyzeAll}
          disabled={isBatchAnalyzing}
          className="relative group overflow-hidden bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="relative flex items-center gap-1.5">
            {isBatchAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
            {isBatchAnalyzing ? '解析中...' : '一括解析'}
          </div>
        </button>
      </div>

      <div className="space-y-3">
        {pending.map(tx => {
          const suggestion = suggestions[tx.id];
          const isAnalyzing = analyzing[tx.id];
          const fromAcc = accounts.find(a => a.id === tx.from_account_id);
          const isExpanded = expandedId === tx.id;
          const currentCat = categories.find(c => c.id === (suggestion?.category_id || tx.category_id));
          const hasAISuggestion = !!suggestion;

          return (
            <div key={tx.id} className={`bg-white rounded-[24px] border transition-all duration-400 overflow-hidden flex flex-col ${isExpanded ? 'border-indigo-400 shadow-xl shadow-indigo-100/50 scale-[1.01] z-10' : hasAISuggestion ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-100 shadow-sm'}`}>
              <div onClick={() => setExpandedId(isExpanded ? null : tx.id)} className="p-4 flex justify-between items-center cursor-pointer transition-colors relative">
                <div className="flex items-center gap-3 flex-1 pr-2">
                  <div className="relative shrink-0">
                    <img 
                      src={getSmartIconUrl(fromAcc?.name || "", fromAcc?.icon_url) || ""} 
                      className="w-10 h-10 rounded-xl object-contain bg-slate-50 border" 
                      alt=""
                      onError={(e) => (e.currentTarget.src = 'https://placehold.co/40x40?text=?')}
                    />
                    {fromAcc?.card_brand && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded shadow-sm border border-slate-100 flex items-center justify-center p-0.5">
                        <img 
                          src={getCardBrandLogo(fromAcc.card_brand) || ""} 
                          className="w-4 h-2.5 object-contain" 
                          alt={fromAcc.card_brand} 
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                      {tx.date}
                      <span className="w-0.5 h-0.5 bg-slate-200 rounded-full" />
                      {fromAcc?.name}
                    </div>
                    
                    <div className="space-y-0.5">
                      <p className={`text-sm font-black leading-tight tracking-tight ${hasAISuggestion ? 'text-indigo-600' : 'text-slate-800'}`}>
                        {suggestion?.normalized_merchant || tx.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-slate-800 tracking-tighter">¥{tx.amount.toLocaleString()}</p>
                      {currentCat && (
                        <div className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase flex items-center gap-1 border ${hasAISuggestion ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {hasAISuggestion && <Sparkles className="w-2.5 h-2.5" />}
                          {currentCat.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onIgnore(tx.id); }}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-300 rounded-xl border border-slate-100 hover:text-rose-400 hover:bg-rose-50 transition-all active:scale-90"
                    title="無視"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={(e) => handleAnalyze(e, tx)}
                    disabled={isAnalyzing}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all active:scale-90 ${isAnalyzing ? 'animate-spin border-indigo-100 bg-white' : hasAISuggestion ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' : 'bg-white border-slate-100 text-slate-300'}`}
                    title="AI解析"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); executeConfirm(tx, suggestion); }}
                    className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-90"
                    title="承認"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  
                  <div className="ml-1">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-400 ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-slate-200'}`} />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-6 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
                  {hasAISuggestion && suggestion.reasoning && (
                    <div className="bg-indigo-900 rounded-[20px] p-4 border border-indigo-800 shadow-inner">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                        <Info className="w-3 h-3" />
                        AI分析インサイト
                      </div>
                      <p className="text-[10px] text-indigo-50 leading-relaxed italic font-medium">
                        {suggestion.reasoning}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 space-y-3">
                    {currentCat?.keywords && currentCat.keywords.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          <Hash className="w-2.5 h-2.5" />
                          関連キーワード
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {currentCat.keywords.map(kw => (
                            <span key={kw} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded-lg border border-slate-200/50 uppercase">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-slate-100/50 w-full" />
                    
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-400 font-bold uppercase tracking-widest">データソース</span>
                      </div>
                      <span className="text-slate-600 font-black tracking-tight flex items-center gap-1">
                        {tx.source === 'email' ? '通知メール' : tx.source === 'manual' ? '手動入力' : tx.source}
                      </span>
                    </div>

                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest text-center mt-2">
                      タップして詳細を閉じる
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Transactions;