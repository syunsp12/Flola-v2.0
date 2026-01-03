
import React, { useState } from 'react';
import { Account, MonthlyBalance, SalarySlip } from '@/types/ui';
import { FileText, Upload, Loader2, Landmark, History } from 'lucide-react';
import { getSmartIconUrl, getCardBrandLogo } from '@/lib/utils/icon-helper';
import { Box, Image, rem } from '@mantine/core';

interface AssetsProps {
  accounts: Account[];
  monthlyBalances: MonthlyBalance[];
  salarySlips: SalarySlip[];
  onAddSalarySlip: (slip: Omit<SalarySlip, 'id'>) => void;
}

const Assets: React.FC<AssetsProps> = ({ accounts, monthlyBalances, salarySlips, onAddSalarySlip }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'overview' | 'salary'>('overview');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    alert('この機能は現在利用できません');
    // APIエンドポイントが削除されたため、機能を無効化
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button 
          onClick={() => setView('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
        >
          資産推移
        </button>
        <button 
          onClick={() => setView('salary')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'salary' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
        >
          給与明細
        </button>
      </div>

      {view === 'overview' ? (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-500" />
              口座別残高
            </h3>
            <div className="space-y-3">
              {accounts.map(acc => {
                const accountIcon = getSmartIconUrl(acc.name, acc.icon_url);
                const brandLogo = getCardBrandLogo(acc.card_brand || null);
                
                return (
                  <div key={acc.id} className="bg-white border rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <Box pos="relative" w={28} h={28}>
                        <Image 
                          src={accountIcon} 
                          w={28} h={28} 
                          radius="xs" 
                          fallbackSrc="https://placehold.co/28x28?text=?" 
                        />
                        {brandLogo && (
                          <Box 
                            pos="absolute" 
                            bottom={-3} 
                            right={-3} 
                            bg="white" 
                            p={1.5} 
                            style={{ 
                              border: '1px solid var(--mantine-color-gray-2)',
                              borderRadius: rem(2),
                              display: 'flex', 
                              boxShadow: 'var(--mantine-shadow-xs)' 
                            }}
                          >
                            <Image src={brandLogo} w={12} h={8} fit="contain" />
                          </Box>
                        )}
                      </Box>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{acc.name}</p>
                        <p className="text-[10px] text-slate-400">最終更新: 2025/12/28</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm text-slate-700">¥{acc.balance.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              評価額履歴
            </h3>
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">日付</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">口座</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">評価額</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyBalances.sort((a,b) => b.record_date.localeCompare(a.record_date)).map(mb => {
                    const acc = accounts.find(a => a.id === mb.account_id);
                    return (
                      <tr key={mb.id}>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600">{mb.record_date}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600">{acc?.name}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-800 text-right">¥{mb.amount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-bold text-indigo-600">AIが解析中...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">給与明細(画像)をアップロード</p>
                  <p className="text-[10px] text-slate-400 mt-1">AIが項目を自動抽出します</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              支給履歴
            </h3>
            {salarySlips.sort((a,b) => b.date.localeCompare(a.date)).map(slip => (
              <div key={slip.id} className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{slip.date} 支給分</p>
                    <p className="text-lg font-extrabold text-slate-800">手取り: ¥{slip.net_pay.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg">解析済</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">基本給</span>
                      <span className="font-bold text-slate-700">¥{slip.base_pay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">残業代</span>
                      <span className="font-bold text-slate-700">¥{slip.overtime_pay.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">税金</span>
                      <span className="font-bold text-rose-500">-¥{slip.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">社会保険</span>
                      <span className="font-bold text-rose-500">-¥{slip.social_insurance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
