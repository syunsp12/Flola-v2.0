import React, { useState, useMemo, useEffect } from 'react';
import { Account, SalarySlip } from '@/types/ui';
import { FileText, Landmark, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, Coins, Activity, Target, Briefcase, AlertCircle } from 'lucide-react';
import { getSmartIconUrl, getCardBrandLogo } from '@/lib/utils/icon-helper';
import { Box, Image, rem, Stack, Text, Group, Card, Paper, Badge, SimpleGrid, UnstyledButton, Divider, Select, ThemeIcon, Progress, Center, Button } from '@mantine/core';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, ComposedChart, Line
} from 'recharts';
import { format } from 'date-fns';
import Link from 'next/link';

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
  const [perfGroup, setPerfGroup] = useState<string | null>('securities');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 資産データのキー
  const assetKeys = useMemo(() => {
    if (monthlyBalances.length === 0) return [];
    const keys = Object.keys(monthlyBalances[0]);
    return keys.filter(k => !['date', 'total', 'total_invested', 'liability'].includes(k) && !k.endsWith('_invested'));
  }, [monthlyBalances]);

  // 給与の統計
  const salaryStats = useMemo(() => {
    if (!salarySlips || salarySlips.length === 0) return null;
    
    // 通常給与と賞与を分離
    const regularSlips = salarySlips.filter((s: any) => !s.is_bonus);
    const bonusSlips = salarySlips.filter((s: any) => s.is_bonus);
    
    const latest = salarySlips[salarySlips.length - 1]; // 最新は賞与でもOK
    
    // 平均は通常給与のみで計算
    const avgNet = regularSlips.length > 0 ? regularSlips.reduce((sum, s) => sum + (s.net_pay || 0), 0) / regularSlips.length : 0;
    const avgGross = regularSlips.length > 0 ? regularSlips.reduce((sum, s: any) => sum + (s.gross_pay || 0), 0) / regularSlips.length : 0;
    const takeHomeRate = avgGross > 0 ? (avgNet / avgGross) * 100 : 0;
    
    // 年収予測: (直近3ヶ月の通常給与平均 * 12) + (過去1年の賞与合計)
    const recentRegulars = regularSlips.slice(-3);
    const monthlyProj = recentRegulars.length > 0 
      ? (recentRegulars.reduce((sum, s: any) => sum + (s.gross_pay || 0), 0) / recentRegulars.length) * 12 
      : 0;
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const annualBonus = bonusSlips
      .filter((s: any) => new Date(s.date) >= oneYearAgo)
      .reduce((sum, s: any) => sum + (s.gross_pay || 0), 0);

    const estAnnual = monthlyProj + annualBonus;

    return { latest, avgNet, avgGross, takeHomeRate, estAnnual };
  }, [salarySlips]);

  // 資産統計
  const stats = useMemo(() => {
    if (monthlyBalances.length === 0) return null;
    const latest = monthlyBalances[monthlyBalances.length - 1];
    const prev = monthlyBalances.length > 1 ? monthlyBalances[monthlyBalances.length - 2] : latest;
    const diff = Number(latest.total) - Number(prev.total);
    const percent = prev.total > 0 ? (diff / prev.total) * 100 : 0;
    const currentPerf = Number(latest[perfGroup || 'securities']) || 0;
    const investedPerf = Number(latest[`${perfGroup || 'securities'}_invested`]) || 0;
    const plPerf = currentPerf - investedPerf;
    const roiPerf = investedPerf > 0 ? (plPerf / investedPerf) * 100 : 0;

    return { total: latest.total, diff, percent, isUp: diff >= 0, plPerf, roiPerf, investedPerf, isPLPositive: plPerf >= 0 };
  }, [monthlyBalances, perfGroup]);

  // --- ツールチップ定義 ---

  const AssetTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper p="md" shadow="xl" radius="lg" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', border: 'none' }}>
          <Text size="xs" fw={900} mb={12} c="dimmed" tt="uppercase" style={{ letterSpacing: '1px' }}>{format(new Date(label), 'yyyy年 MM月')}</Text>
          <Stack gap={8}>
            {assetKeys.slice().reverse().map((key) => {
              const val = Number(data[key]) || 0;
              if (val === 0) return null;
              const group = assetGroups.find(g => g.id === key);
              return (
                <Group key={key} justify="space-between" wrap="nowrap" gap={32}>
                  <Group gap={8}>
                    <div style={{ width: 4, height: 12, backgroundColor: group?.color || '#adb5bd', borderRadius: '2px' }} />
                    <Text size="xs" fw={700}>{group?.name || key}</Text>
                  </Group>
                  <Text size="xs" fw={900} ff="monospace">¥{val.toLocaleString()}</Text>
                </Group>
              );
            })}
            <Divider my={10} variant="dashed" />
            <Group justify="space-between">
              <Text size="xs" fw={900} c="indigo">TOTAL</Text>
              <Text size="sm" fw={900} c="indigo" ff="monospace">¥{Number(data.total).toLocaleString()}</Text>
            </Group>
          </Stack>
        </Paper>
      );
    }
    return null;
  };

  const PerformanceTooltip = ({ active, payload, perfGroup }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const currentVal = Number(data[perfGroup]) || 0;
      const investedVal = Number(data[`${perfGroup}_invested`]) || 0;
      const pl = currentVal - investedVal;
      const roi = investedVal > 0 ? (pl / investedVal) * 100 : 0;
      const label = perfGroup === 'securities' ? '入金累計' : (perfGroup === 'pension' ? '運用金額' : '元本');
      return (
        <Paper p="md" shadow="xl" radius="lg" withBorder><Text size="xs" fw={900} mb={12} c="dimmed">{format(new Date(data.date), 'yyyy年 MM月')}</Text>
          <Stack gap={6}><DetailRow label="評価額" value={currentVal} color="var(--mantine-color-indigo-6)" bold /><DetailRow label={label} value={investedVal} color="#adb5bd" /><Divider my={8} variant="dashed" />
            <Group justify="space-between" gap={32}><Text size="xs" fw={900} c={pl >= 0 ? 'teal.7' : 'red.7'}>損益 ({roi >= 0 ? '+' : ''}{roi.toFixed(1)}%)</Text><Text size="xs" fw={900} c={pl >= 0 ? 'teal.7' : 'red.7'}>¥{pl.toLocaleString()}</Text></Group>
          </Stack></Paper>
      );
    }
    return null;
  };

  const SalaryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isBonus = data.is_bonus;
      return (
        <Paper p="md" shadow="xl" radius="lg" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', border: 'none', borderColor: isBonus ? '#fab005' : undefined, borderWidth: isBonus ? 2 : 0 }}>
          <Group justify="space-between" mb={12}>
            <Text size="xs" fw={900}>{format(new Date(data.date), 'yyyy年 MM月')} {isBonus ? '賞与' : '支給'}</Text>
            {isBonus && <Badge color="yellow" variant="filled" size="xs">BONUS</Badge>}
          </Group>
          <Stack gap={4}>
            {!isBonus ? (
              <>
                <DetailRow label="基本給" value={data.base_pay} color="var(--mantine-color-indigo-6)" />
                <DetailRow label="残業代" value={data.overtime_pay} color="var(--mantine-color-teal-4)" />
                <DetailRow label="諸手当" value={data.allowances} color="var(--mantine-color-cyan-3)" />
              </>
            ) : (
              <DetailRow label="賞与額面" value={data.gross_pay} color="#fab005" bold />
            )}
            <DetailRow label="控除合計" value={-(data.tax + data.social_insurance)} color="var(--mantine-color-red-5)" />
            <Divider my={8} variant="dashed" />
            <DetailRow label="手取り額" value={data.net_pay} color={isBonus ? "#fab005" : "var(--mantine-color-indigo-7)"} bold />
            
            {data.stock_savings > 0 && (
              <Group mt={8} p={8} bg={isBonus ? "yellow.0" : "indigo.0"} style={{ borderRadius: '8px' }} gap={8}>
                <TrendingUp size={12} color={isBonus ? "#fab005" : "var(--mantine-color-indigo-6)"} />
                <Text size="10px" fw={800} c={isBonus ? "yellow.8" : "indigo.7"}>持株会拠出: ¥{data.stock_savings.toLocaleString()}</Text>
              </Group>
            )}
          </Stack>
        </Paper>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-24">
      {/* ナビゲーション */}
      <Center className="mt-6 px-6">
        <Group grow gap={0} p={4} bg="gray.1" style={{ borderRadius: '16px', width: '100%', maxWidth: 400 }}>
          <TabButton active={view === 'overview'} onClick={() => setView('overview')} icon={<Activity size={14} />} label="資産構成" />
          <TabButton active={view === 'salary'} onClick={() => setView('salary')} icon={<Coins size={14} />} label="給与分析" />
        </Group>
      </Center>

      {view === 'overview' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* サマリー */}
          {stats && (
            <section className="px-6">
              <Stack gap="md">
                <Paper p="xl" radius="28px" bg="dark.8" style={{ color: 'white', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}><Landmark size={120} /></div>
                  <Stack gap={0} pos="relative">
                    <Text size="xs" fw={800} style={{ opacity: 0.6 }} tt="uppercase">Current Net Worth</Text>
                    <Group align="flex-end" gap="sm" mt={4}>
                      <Text fw={900} style={{ fontSize: rem(38), lineHeight: 1 }}>¥{stats.total.toLocaleString()}</Text>
                      <Badge variant="white" color={stats.isUp ? 'teal' : 'red'}>{stats.percent.toFixed(1)}%</Badge>
                    </Group>
                  </Stack>
                </Paper>
                <SimpleGrid cols={2} spacing="md">
                  <StatCard label="投資評価損益" value={`¥${stats.plPerf.toLocaleString()}`} subValue={`${stats.roiPerf.toFixed(2)}%`} isPositive={stats.isPLPositive} icon={<Target size={14} />} />
                  <StatCard label="前月差" value={`¥${Math.abs(stats.diff).toLocaleString()}`} subValue={stats.isUp ? '増加' : '減少'} isPositive={stats.isUp} icon={<TrendingUp size={14} />} />
                </SimpleGrid>
              </Stack>
            </section>
          )}

          {/* ポートフォリオ推移 */}
          <section className="px-6">
            <Paper p="xl" radius="28px" withBorder shadow="sm">
              <Text fw={900} size="md" mb="xl">ポートフォリオ推移</Text>
              <Box style={{ height: 300 }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyBalances} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        {assetKeys.map(key => {
                          const group = assetGroups.find(g => g.id === key);
                          return (
                            <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={group?.color || '#adb5bd'} stopOpacity={0.5}/>
                              <stop offset="95%" stopColor={group?.color || '#adb5bd'} stopOpacity={0}/>
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(str) => format(new Date(str), 'M月')} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 10000}万`} />
                      <Tooltip content={<AssetTooltip dataKeys={assetKeys} assetGroups={assetGroups} />} />
                      {assetKeys.map(key => {
                        const group = assetGroups.find(g => g.id === key);
                        return <Area key={key} type="monotone" name={group?.name || key} dataKey={key} stackId="1" stroke={group?.color || '#adb5bd'} strokeWidth={3} fill={`url(#color-${key})`} connectNulls animationDuration={1500} />
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
              <Group justify="center" gap="lg" mt="xl" wrap="wrap">
                {assetGroups.map((ag: any) => {
                  if (!assetKeys.includes(ag.id)) return null;
                  return (
                    <Group key={ag.id} gap={6}>
                      <div style={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: ag.color }} />
                      <Text size="xs" fw={800} c="gray.7">{ag.name}</Text>
                    </Group>
                  );
                })}
              </Group>
            </Paper>
          </section>

          {/* 投資成果分析 */}
          <section className="px-6">
            <Paper p="xl" radius="28px" withBorder shadow="sm">
              <Group justify="space-between" mb="lg">
                <Stack gap={2}>
                  <Text fw={900} size="md">運用成果の分析</Text>
                  <Text size="xs" c="dimmed">{perfGroup === 'securities' ? '入金累計' : (perfGroup === 'pension' ? '運用金額' : '投入元本')} と評価額の比較</Text>
                </Stack>
                <Select size="sm" variant="filled" w={120} radius="md" value={perfGroup} onChange={setPerfGroup}
                  data={assetGroups.filter(g => ['securities', 'pension', 'crypto'].includes(g.id)).map(g => ({ value: g.id, label: g.name }))}
                />
              </Group>
              <Group grow mb="xl" gap="sm">
                <Box p="md" bg="gray.0" style={{ borderRadius: '16px' }}>
                  <Text size="10px" fw={800} c="dimmed" tt="uppercase">{perfGroup === 'securities' ? '入金累計' : (perfGroup === 'pension' ? '運用金額' : '投入元本')}</Text>
                  <Text fw={900} size="md">¥{stats?.investedPerf.toLocaleString()}</Text>
                </Box>
                <Box p="md" bg={stats?.isPLPositive ? 'teal.0' : 'red.0'} style={{ borderRadius: '16px' }}>
                  <Text size="10px" fw={800} c={stats?.isPLPositive ? 'teal.6' : 'red.6'} tt="uppercase">評価損益</Text>
                  <Text fw={900} size="md" c={stats?.isPLPositive ? 'teal.9' : 'red.9'}>¥{stats?.plPerf.toLocaleString()}</Text>
                </Box>
              </Group>
              <Box style={{ height: 220, minHeight: 220 }}>
                {mounted && monthlyBalances.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyBalances} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(str) => format(new Date(str), 'M月')} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 10000}万`} />
                      <Tooltip content={<PerformanceTooltip perfGroup={perfGroup} />} />
                      <Area type="monotone" dataKey={perfGroup || 'securities'} stroke="var(--mantine-color-indigo-6)" strokeWidth={4} fill="var(--mantine-color-indigo-0)" fillOpacity={0.3} connectNulls />
                      <Area type="monotone" dataKey={`${perfGroup || 'securities'}_invested`} stroke="#adb5bd" strokeWidth={2} fill="transparent" strokeDasharray="6 4" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Paper>
          </section>
        </div>
      ) : (
        <div className="space-y-8 px-6 animate-in fade-in duration-500">
          {salaryStats ? (
            <>
              {/* 給与サマリー */}
              <Stack gap="sm">
                <Paper p="xl" radius="28px" bg="indigo.9" style={{ color: 'white' }}>
                  <Text size="xs" fw={800} style={{ opacity: 0.7 }} tt="uppercase">Estimated Annual Gross</Text>
                  <Text fw={900} style={{ fontSize: rem(32), lineHeight: 1 }} mt={4}>¥{Math.round(salaryStats.estAnnual).toLocaleString()}</Text>
                  <Group gap={8} mt="md"><Badge variant="white" color="indigo" radius="xs" size="sm">Proj. 2026</Badge><Text size="xs" fw={700}>Based on last 3 months</Text></Group>
                </Paper>
                <SimpleGrid cols={2} spacing="md">
                  <Paper p="lg" radius="24px" withBorder shadow="xs">
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase" mb={4}>平均手取り率</Text>
                    <Text fw={900} size="xl">{salaryStats.takeHomeRate.toFixed(1)}%</Text>
                    <Progress value={salaryStats.takeHomeRate} color="teal" size="xs" mt="xs" />
                  </Paper>
                  <Paper p="lg" radius="24px" withBorder shadow="xs">
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase" mb={4}>平均残業代</Text>
                    <Text fw={900} size="lg">¥{Math.round(salarySlips.reduce((sum, s) => sum + s.overtime_pay, 0) / salarySlips.length).toLocaleString()}</Text>
                    <Text size="9px" fw={800} c="teal.7">Stability: High</Text>
                  </Paper>
                </SimpleGrid>
              </Stack>

              {/* 給与推移グラフ */}
              <Paper p="xl" radius="28px" withBorder shadow="sm">
                <Group gap="sm" mb="xl"><ThemeIcon variant="light" color="indigo" radius="md"><TrendingUp size={18} /></ThemeIcon><Text fw={900} size="md">収入の詳細推移</Text></Group>
                <Box style={{ height: 300 }}>{mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={salarySlips} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(str) => format(new Date(str), 'M月')} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 10000}万`} />
                      <Tooltip content={<SalaryTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                      
                      {/* 賞与はゴールド、通常は青系 */}
                      <Bar name="基本給 / 賞与" dataKey="base_pay" stackId="a" shape={(props: any) => {
                        const { fill, x, y, width, height, payload } = props;
                        return <rect x={x} y={y} width={width} height={height} fill={payload.is_bonus ? "#fab005" : fill} rx={0} ry={0} />;
                      }} fill="var(--mantine-color-indigo-6)" radius={[0, 0, 0, 0]} />
                      
                      <Bar name="残業代" dataKey="overtime_pay" stackId="a" fill="var(--mantine-color-teal-4)" />
                      <Bar name="諸手当" dataKey="allowances" stackId="a" fill="var(--mantine-color-cyan-3)" radius={[6, 6, 0, 0]} />
                      
                      <Line name="手取り" type="monotone" dataKey="net_pay" stroke="var(--mantine-color-orange-5)" strokeWidth={4} dot={(props:any) => {
                          const { cx, cy, payload } = props;
                          return <circle cx={cx} cy={cy} r={5} fill="white" stroke={payload.is_bonus ? "#fab005" : "var(--mantine-color-orange-5)"} strokeWidth={3} />;
                      }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}</Box>
                <Group justify="center" gap="lg" mt="xl">
                  <LegendItem color="var(--mantine-color-indigo-6)" label="基本給" />
                  <LegendItem color="#fab005" label="賞与" />
                  <LegendItem color="var(--mantine-color-teal-4)" label="残業代" />
                  <LegendItem color="var(--mantine-color-orange-5)" label="実手取り" />
                </Group>
              </Paper>

              <Stack gap="md">
                <Text fw={900} size="md">支給履歴の一覧</Text>
                {salarySlips.slice().reverse().map(slip => {
                  const isBonus = (slip as any).is_bonus;
                  return (
                  <Card key={slip.id} padding="lg" radius="20px" withBorder shadow="xs" style={{ borderColor: isBonus ? '#fab005' : undefined, borderWidth: isBonus ? 2 : 1 }}>
                    <Group justify="space-between" mb="sm">
                      <Group gap="xs">
                        <Text size="xs" fw={800} c="dimmed">{format(new Date(slip.date), 'yyyy年 MM月')}</Text>
                        {isBonus && <Badge color="yellow" variant="filled" size="xs">賞与</Badge>}
                      </Group>
                      <Text fw={900} size="lg" c={isBonus ? "yellow.8" : "indigo.8"}>¥{slip.net_pay.toLocaleString()}</Text>
                    </Group>
                    <SimpleGrid cols={2} spacing="xs">
                      <DetailBox label={isBonus ? "支給総額" : "基本給"} value={isBonus ? (slip as any).gross_pay : slip.base_pay} />
                      {!isBonus && <DetailBox label="残業代" value={slip.overtime_pay} />}
                      <DetailBox label="税金" value={slip.tax} isNegative />
                      <DetailBox label="社会保険" value={slip.social_insurance} isNegative />
                    </SimpleGrid>
                    {(slip as any).stock_savings > 0 && (
                      <Group mt="sm" p="xs" bg={isBonus ? "yellow.0" : "indigo.0"} style={{ borderRadius: '8px' }}>
                        <TrendingUp size={14} color={isBonus ? "#fab005" : "var(--mantine-color-indigo-6)"} />
                        <Text size="xs" fw={700} c={isBonus ? "yellow.9" : "indigo.9"}>
                          持株会拠出: ¥{(slip as any).stock_savings.toLocaleString()}
                        </Text>
                      </Group>
                    )}
                  </Card>
                )})}
              </Stack>
            </>
          ) : (
            <Center py="xl"><Stack align="center"><ThemeIcon size="xl" radius="xl" variant="light" color="gray"><AlertCircle /></ThemeIcon><Text c="dimmed">給与データが見つかりません</Text><Button component={Link} href="/tools/salary" variant="light">登録する</Button></Stack></Center>
          )}
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <UnstyledButton onClick={onClick} p="sm" style={{ borderRadius: '14px', flex: 1, textAlign: 'center', transition: 'all 0.3s ease', backgroundColor: active ? 'white' : 'transparent', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}>
    <Group justify="center" gap={8}><ThemeIcon variant={active ? 'filled' : 'light'} size={28} radius="md" color={active ? 'indigo' : 'gray'}>{icon}</ThemeIcon><Text size="xs" fw={800} c={active ? 'dark.9' : 'gray.6'}>{label}</Text></Group>
  </UnstyledButton>
);

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <Group gap={4}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} /><Text size="10px" fw={800} c="dimmed">{label}</Text></Group>
);

const StatCard = ({ label, value, subValue, isPositive, icon }: any) => (
  <Card p="md" radius="xl" withBorder shadow="xs">
    <Group gap={8} mb={4}><ThemeIcon variant="light" size="sm" radius="md" color={isPositive ? 'teal' : 'red'}>{icon}</ThemeIcon><Text size="10px" fw={800} c="dimmed" tt="uppercase">{label}</Text></Group>
    <Text fw={900} size="md">{value}</Text><Text size="9px" fw={800} c={isPositive ? 'teal.7' : 'red.7'}>{subValue}</Text>
  </Card>
);

const DetailRow = ({ label, value, color, bold = false }: any) => (
  <Group justify="space-between" wrap="nowrap" gap={40}><Group gap={8}><div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} /><Text size="xs" fw={bold ? 900 : 600}>{label}:</Text></Group><Text size="xs" fw={900} ff="monospace">¥{Math.abs(value).toLocaleString()}</Text></Group>
);

const DetailBox = ({ label, value, isNegative = false }: any) => (
  <Box p="sm" bg="gray.0" style={{ borderRadius: '12px' }}><Text size="10px" fw={800} c="dimmed" mb={2}>{label}</Text><Text size="xs" fw={900} c={isNegative ? 'red.6' : 'dark.7'}>{isNegative ? '-' : ''}¥{value.toLocaleString()}</Text></Box>
);

export default Assets;
