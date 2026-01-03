
import React, { useState } from 'react';
import { Account, MonthlyBalance, SalarySlip } from '@/types/ui';
import { FileText, Upload, Loader2, Landmark, History, TrendingUp, Wallet, CreditCard, PieChart } from 'lucide-react';
import { getSmartIconUrl, getCardBrandLogo } from '@/lib/utils/icon-helper';
import { Box, Image, rem, Stack, Text, Group, Card, Paper, Badge, Grid } from '@mantine/core';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';
import { format } from 'date-fns';

interface AssetsProps {
  accounts: Account[];
  monthlyBalances: any[]; // getAssetHistoryから返される集計済みデータ
  salarySlips: SalarySlip[];
  onAddSalarySlip: (slip: Omit<SalarySlip, 'id'>) => void;
  isReadOnly?: boolean;
}

const Assets: React.FC<AssetsProps> = ({ accounts, monthlyBalances, salarySlips, onAddSalarySlip, isReadOnly = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'overview' | 'salary'>('overview');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert('この機能は現在利用できません');
  };

  // チャート用のカスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="xs" shadow="md" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
          <Text size="xs" fw={700} mb={4}>{label}</Text>
          <Stack gap={2}>
            {payload.map((entry: any, i: number) => (
              <Group key={i} gap={8} justify="space-between">
                <Group gap={4}>
                  <div style={{ width: 8, height: 8, backgroundColor: entry.color, borderRadius: '2px' }} />
                  <Text size="10px" c="dimmed">{entry.name}:</Text>
                </Group>
                <Text size="10px" fw={700}>¥{entry.value.toLocaleString()}</Text>
              </Group>
            ))}
            <Divider my={4} />
            <Group justify="space-between">
              <Text size="10px" fw={800}>Total:</Text>
              <Text size="10px" fw={800}>¥{payload.reduce((sum: number, e: any) => sum + e.value, 0).toLocaleString()}</Text>
            </Group>
          </Stack>
        </Paper>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl mx-6 mt-4">
        <button 
          onClick={() => setView('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
        >
          資産推移・内訳
        </button>
        <button 
          onClick={() => setView('salary')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'salary' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
        >
          給与分析
        </button>
      </div>

      {view === 'overview' ? (
        <div className="space-y-6">
          {/* 1. 資産構成推移グラフ */}
          <section className="px-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              資産構成の推移
            </h3>
            <Paper p="md" radius="lg" withBorder style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyBalances} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                    tickFormatter={(str) => format(new Date(str), 'yy/MM')}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                    tickFormatter={(val) => `${val / 10000}万`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" name="預金" dataKey="bank" stackId="1" stroke="#4dabf7" fill="#4dabf7" fillOpacity={0.6} />
                  <Area type="monotone" name="証券" dataKey="securities" stackId="1" stroke="#38d9a9" fill="#38d9a9" fillOpacity={0.6} />
                  <Area type="monotone" name="年金" dataKey="pension" stackId="1" stroke="#be4bdb" fill="#be4bdb" fillOpacity={0.6} />
                  <Area type="monotone" name="その他" dataKey="wallet" stackId="1" stroke="#fab005" fill="#fab005" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </section>

          {/* 2. 口座別残高リスト (読み取り専用時は非表示、または簡略表示) */}
          {!isReadOnly && (
            <section className="px-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-500" />
                現在の口座別残高
              </h3>
              <div className="space-y-3">
                {accounts.map(acc => {
                  const accountIcon = getSmartIconUrl(acc.name, acc.icon_url);
                  const brandLogo = getCardBrandLogo(acc.card_brand);
                  
                  return (
                    <div key={acc.id} className="bg-white border rounded-2xl p-4 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-3">
                        <Box pos="relative" w={32} h={32}>
                          <Image 
                            src={accountIcon} 
                            w={32} h={32} 
                            radius="xs" 
                            fallbackSrc="https://placehold.co/32x32?text=?" 
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
                          <Badge size="9px" variant="light" color={acc.is_liability ? 'red' : 'gray'}>
                            {acc.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <p className="font-black text-sm text-slate-700">¥{acc.balance.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6 px-6">
          {/* 3. 給与推移グラフ */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              月次給与の内訳推移
            </h3>
            <Paper p="md" radius="lg" withBorder style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salarySlips} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                    tickFormatter={(str) => format(new Date(str), 'M月')}
                  />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickFormatter={(val) => `${val / 10000}万`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Paper p="xs" shadow="md" withBorder>
                            <Text size="xs" fw={700} mb={4}>{format(new Date(data.date), 'yyyy/MM')} 支給分</Text>
                            <Stack gap={2}>
                              <Group justify="space-between" gap="xl"><Text size="10px">基本給:</Text><Text size="10px" fw={700}>¥{data.base_pay.toLocaleString()}</Text></Group>
                              <Group justify="space-between" gap="xl"><Text size="10px">残業代:</Text><Text size="10px" fw={700}>¥{data.overtime_pay.toLocaleString()}</Text></Group>
                              <Group justify="space-between" gap="xl" c="red"><Text size="10px">控除(税・社保):</Text><Text size="10px" fw={700}>-¥{(data.tax + data.social_insurance).toLocaleString()}</Text></Group>
                              <Divider my={2} />
                              <Group justify="space-between" gap="xl" c="indigo"><Text size="10px" fw={800}>手取り額:</Text><Text size="10px" fw={800}>¥{data.net_pay.toLocaleString()}</Text></Group>
                            </Stack>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar name="基本給" dataKey="base_pay" stackId="a" fill="#4dabf7" radius={[0, 0, 0, 0]} />
                  <Bar name="残業代" dataKey="overtime_pay" stackId="a" fill="#38d9a9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </section>

          {/* 4. 給与詳細カード */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              支給履歴
            </h3>
            {salarySlips.slice().reverse().map(slip => (
              <div key={slip.id} className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{slip.date} 支給分</p>
                    <p className="text-lg font-extrabold text-slate-800">手取り: ¥{slip.net_pay.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg">確定済み</div>
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

const Divider = ({ my }: { my: number }) => <div style={{ margin: `${my}px 0`, height: '1px', backgroundColor: 'var(--mantine-color-gray-2)' }} />;
