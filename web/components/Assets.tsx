import React, { useState, useMemo } from 'react';
import { Account, SalarySlip } from '@/types/ui';
import { FileText, Landmark, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getSmartIconUrl, getCardBrandLogo } from '@/lib/utils/icon-helper';
import { Box, Image, rem, Stack, Text, Group, Card, Paper, Badge, SimpleGrid, UnstyledButton } from '@mantine/core';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar
} from 'recharts';
import { format } from 'date-fns';

interface AssetsProps {
  accounts: Account[];
  monthlyBalances: any[]; 
  salarySlips: SalarySlip[];
  assetGroups: any[]; 
  onAddSalarySlip: (slip: Omit<SalarySlip, 'id'>) => void;
  isReadOnly?: boolean;
}

const Assets: React.FC<AssetsProps> = ({ accounts, monthlyBalances, salarySlips, assetGroups, onAddSalarySlip, isReadOnly = false }) => {
  const [view, setView] = useState<'overview' | 'salary'>('overview');

  // --- 計算ロジック (サマリー用) ---
  const stats = useMemo(() => {
    if (monthlyBalances.length === 0) return null;
    const latest = monthlyBalances[monthlyBalances.length - 1];
    const prev = monthlyBalances.length > 1 ? monthlyBalances[monthlyBalances.length - 2] : latest;
    
    const diff = latest.total - prev.total;
    const percent = prev.total > 0 ? (diff / prev.total) * 100 : 0;

    return {
      total: latest.total,
      diff,
      percent,
      isUp: diff >= 0
    };
  }, [monthlyBalances]);

  const salaryStats = useMemo(() => {
    if (salarySlips.length === 0) return null;
    const latest = salarySlips[salarySlips.length - 1];
    const avgNet = salarySlips.reduce((sum, s) => sum + s.net_pay, 0) / salarySlips.length;
    return { latest, avgNet };
  }, [salarySlips]);

  // チャート用のカスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="sm" shadow="xl" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '16px' }}>
          <Text size="xs" fw={900} mb={8} c="dimmed">{format(new Date(label), 'yyyy年MM月')}</Text>
          <Stack gap={4}>
            {[...payload].reverse().map((entry: any, i: number) => (
              <Group key={i} gap={16} justify="space-between">
                <Group gap={6}>
                  <div style={{ width: 10, height: 4, backgroundColor: entry.color, borderRadius: '2px' }} />
                  <Text size="xs" fw={700} c="dark">{entry.name}</Text>
                </Group>
                <Text size="xs" fw={900} ff="monospace">¥{entry.value.toLocaleString()}</Text>
              </Group>
            ))}
            <div style={{ margin: '8px 0', height: '1px', backgroundColor: 'var(--mantine-color-gray-2)', borderStyle: 'dashed' }} />
            <Group justify="space-between">
              <Text size="xs" fw={900} c="indigo">合計純資産</Text>
              <Text size="sm" fw={900} c="indigo" ff="monospace">¥{payload.reduce((sum: number, e: any) => sum + e.value, 0).toLocaleString()}</Text>
            </Group>
          </Stack>
        </Paper>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 画面切り替えスイッチ */}
      <div className="px-6 mt-4">
        <Group grow gap="xs" p={4} bg="gray.1" style={{ borderRadius: '12px' }}>
          <UnstyledButton 
            onClick={() => setView('overview')}
            p="xs"
            style={{ 
              borderRadius: '10px',
              backgroundColor: view === 'overview' ? 'white' : 'transparent',
              boxShadow: view === 'overview' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Group gap={6}>
              <PieChart size={14} color={view === 'overview' ? 'var(--mantine-color-indigo-6)' : 'gray'} />
              <Text size="xs" fw={800} c={view === 'overview' ? 'indigo.7' : 'dimmed'}>資産推移</Text>
            </Group>
          </UnstyledButton>
          <UnstyledButton 
            onClick={() => setView('salary')}
            p="xs"
            style={{ 
              borderRadius: '10px',
              backgroundColor: view === 'salary' ? 'white' : 'transparent',
              boxShadow: view === 'salary' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Group gap={6}>
              <FileText size={14} color={view === 'salary' ? 'var(--mantine-color-indigo-6)' : 'gray'} />
              <Text size="xs" fw={800} c={view === 'salary' ? 'indigo.7' : 'dimmed'}>給与分析</Text>
            </Group>
          </UnstyledButton>
        </Group>
      </div>

      {view === 'overview' ? (
        <div className="space-y-6">
          {/* サマリー統計 */}
          {stats && (
            <section className="px-6">
              <SimpleGrid cols={2} spacing="sm">
                <Card padding="md" radius="lg" withBorder bg="indigo.0" style={{ borderColor: 'var(--mantine-color-indigo-1)' }}>
                  <Text size="10px" fw={800} c="indigo.6" tt="uppercase">Total Net Worth</Text>
                  <Text fw={900} size="xl" mt={2}>¥ {stats.total.toLocaleString()}</Text>
                </Card>
                <Card padding="md" radius="lg" withBorder>
                  <Text size="10px" fw={800} c="dimmed" tt="uppercase">vs Last Month</Text>
                  <Group gap={4} mt={2}>
                    {stats.isUp ? <ArrowUpRight size={18} color="var(--mantine-color-teal-6)" /> : <ArrowDownRight size={18} color="var(--mantine-color-red-6)" />}
                    <Text fw={900} size="lg" c={stats.isUp ? 'teal.7' : 'red.7'}>
                      {stats.isUp ? '+' : ''}{stats.percent.toFixed(1)}%
                    </Text>
                  </Group>
                </Card>
              </SimpleGrid>
            </section>
          )}

          {/* 1. 資産構成推移グラフ */}
          <section className="px-6">
            <Paper p="md" radius="xl" withBorder shadow="sm">
              <Group justify="space-between" mb="lg">
                <Text fw={900} size="sm" c="dark">資産ポートフォリオの推移</Text>
                <Badge variant="dot" color="indigo">MONTHLY</Badge>
              </Group>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyBalances} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      {assetGroups.map((ag: any) => (
                        <linearGradient key={`grad-${ag.id}`} id={`color-${ag.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ag.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={ag.color} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#adb5bd' }} 
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      tickFormatter={(str) => format(new Date(str), 'M月')}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#adb5bd' }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${val / 10000}万`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4E82EE', strokeWidth: 2, strokeDasharray: '5 5' }} />
                    
                    {assetGroups.map((ag: any) => (
                      <Area 
                        key={ag.id}
                        type="monotone" 
                        name={ag.name} 
                        dataKey={ag.id} 
                        stackId="1" 
                        stroke={ag.color} 
                        strokeWidth={3} 
                        fill={`url(#color-${ag.id})`} 
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <Group justify="center" gap="md" mt="xl" wrap="wrap">
                {assetGroups.map((ag: any) => (
                  <LegendItem key={ag.id} color={ag.color} label={ag.name} />
                ))}
              </Group>
            </Paper>
          </section>

          {/* 2. 口座別残高リスト (読み取り専用時以外) */}
          {!isReadOnly && (
            <section className="px-6">
              <Text fw={900} size="sm" mb="md">現在の内訳詳細</Text>
              <Stack gap="xs">
                {accounts.map(acc => (
                  <AccountListItem key={acc.id} acc={acc} />
                ))}
              </Stack>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6 px-6">
          {/* 給与サマリー */}
          {salaryStats && (
            <Card padding="lg" radius="xl" withBorder shadow="sm" style={{ background: 'linear-gradient(135deg, #4E82EE 0%, #9B72F3 100%)', color: 'white', border: 'none' }}>
              <Stack gap="xs">
                <Text size="xs" fw={800} style={{ opacity: 0.8 }} tt="uppercase">Average Net Pay</Text>
                <Text fw={900} style={{ fontSize: rem(28) }}>¥ {Math.round(salaryStats.avgNet).toLocaleString()}</Text>
                <Group justify="space-between" mt="sm">
                  <Text size="xs" fw={700}>直近支給: {salaryStats.latest.date}</Text>
                  <Badge variant="white" color="indigo" size="sm" radius="xs">CONFIRMED</Badge>
                </Group>
              </Stack>
            </Card>
          )}

          {/* 3. 給与推移グラフ */}
          <section>
            <Paper p="md" radius="xl" withBorder shadow="sm">
              <Text fw={900} size="sm" mb="lg">収入・控除の構造分析</Text>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salarySlips} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(str) => format(new Date(str), 'M月')} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 10000}万`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper p="sm" radius="md" withBorder shadow="xl">
                              <Text size="xs" fw={900} mb={8}>{format(new Date(data.date), 'yyyy/MM')} 支給</Text>
                              <Stack gap={4}>
                                <DetailRow label="基本給" value={data.base_pay} color="#4dabf7" />
                                <DetailRow label="残業代" value={data.overtime_pay} color="#38d9a9" />
                                <DetailRow label="手当等" value={data.net_pay - (data.base_pay + data.overtime_pay - (data.tax + data.social_insurance))} color="#fab005" />
                                <div style={{ margin: '4px 0', height: '1px', backgroundColor: 'var(--mantine-color-gray-2)' }} />
                                <DetailRow label="手取り" value={data.net_pay} color="#4E82EE" bold />
                              </Stack>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar name="基本給" dataKey="base_pay" stackId="a" fill="#4dabf7" radius={[0, 0, 0, 0]} />
                    <Bar name="残業代" dataKey="overtime_pay" stackId="a" fill="#38d9a9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Paper>
          </section>

          {/* 4. 給与詳細カード */}
          <Stack gap="sm">
            <Text fw={900} size="sm">支給履歴明細</Text>
            {salarySlips.slice().reverse().map(slip => (
              <Card key={slip.id} padding="md" radius="lg" withBorder shadow="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" fw={800} c="dimmed">{slip.date}</Text>
                  <Text fw={900} size="md" c="indigo">¥{slip.net_pay.toLocaleString()}</Text>
                </Group>
                <Grid gutter="xs">
                  <Grid.Col span={6}><DetailText label="基本" value={slip.base_pay} /></Grid.Col>
                  <Grid.Col span={6}><DetailText label="残業" value={slip.overtime_pay} /></Grid.Col>
                  <Grid.Col span={6}><DetailText label="税金" value={slip.tax} red /></Grid.Col>
                  <Grid.Col span={6}><DetailText label="社保" value={slip.social_insurance} red /></Grid.Col>
                </Grid>
              </Card>
            ))}
          </Stack>
        </div>
      )}
    </div>
  );
};

// --- サブコンポーネント ---

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <Group gap={4}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
    <Text size="10px" fw={800} c="dimmed">{label}</Text>
  </Group>
);

const DetailRow = ({ label, value, color, bold = false }: any) => (
  <Group justify="space-between" gap={32}>
    <Group gap={6}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
      <Text size="10px" fw={bold ? 900 : 500}>{label}:</Text>
    </Group>
    <Text size="10px" fw={900} ff="monospace">¥{Math.abs(value).toLocaleString()}</Text>
  </Group>
);

const DetailText = ({ label, value, red = false }: any) => (
  <Group justify="space-between" p={6} bg="gray.0" style={{ borderRadius: '6px' }}>
    <Text size="10px" fw={700} c="dimmed">{label}</Text>
    <Text size="10px" fw={900} c={red ? 'red.6' : 'dark'}>{red ? '-' : ''}¥{value.toLocaleString()}</Text>
  </Group>
);

const AccountListItem = ({ acc }: { acc: Account }) => {
  const accountIcon = getSmartIconUrl(acc.name, acc.icon_url);
  const brandLogo = getCardBrandLogo(acc.card_brand || null);
  return (
    <Card padding="sm" radius="md" withBorder shadow="xs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
          <Box pos="relative" w={28} h={28}>
            <Image src={accountIcon} w={28} h={28} radius="xs" fallbackSrc="https://placehold.co/28x28?text=?" />
            {brandLogo && (
              <Box pos="absolute" bottom={-3} right={-3} bg="white" p={1} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '2px', display: 'flex' }}>
                <Image src={brandLogo} w={10} h={6} fit="contain" />
              </Box>
            )}
          </Box>
          <Text fw={700} size="xs" truncate>{acc.name}</Text>
        </Group>
        <Text fw={900} size="sm">¥{acc.balance.toLocaleString()}</Text>
      </Group>
    </Card>
  );
};

export default Assets;
