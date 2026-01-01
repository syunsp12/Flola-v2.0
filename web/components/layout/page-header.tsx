'use client'

import React from 'react'
import { Paper, Group, Text, Box, rem, ThemeIcon, Stack } from '@mantine/core'
import { useWindowScroll } from '@mantine/hooks'

interface PageHeaderProps {
  title: string
  subtitle?: string
  tabs?: React.ReactNode // タブなどのメインナビゲーション
  children?: React.ReactNode // 右側の追加アクション
  bottomContent?: React.ReactNode // フィルタなどのサブコンテンツ
}

export function PageHeader({ 
  title, 
  subtitle, 
  tabs,
  children, 
  bottomContent, 
}: PageHeaderProps) {
  const [scroll] = useWindowScroll()
  const isScrolled = scroll.y > 40

  return (
    <Paper 
      px="md" 
      py={isScrolled ? rem(6) : rem(10)}
      radius={0}
      pos="sticky"
      top={0}
      style={{ 
        zIndex: 100, 
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: isScrolled ? '0 2px 10px rgba(0, 0, 0, 0.05)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        {/* 左側: ロゴとタイトル (スクロール時はロゴのみ、またはロゴ+タブ) */}
        <Group gap="xs" wrap="nowrap" style={{ flex: isScrolled && tabs ? 1 : 'unset', minWidth: 0 }}>
          <ThemeIcon 
            size={isScrolled ? 22 : 26} 
            radius="md" 
            variant="gradient" 
            gradient={{ from: 'indigo', to: 'cyan' }}
          >
            <Text fw={900} fs="italic" style={{ fontSize: isScrolled ? rem(10) : rem(12) }} c="white">F</Text>
          </ThemeIcon>
          
          {!isScrolled ? (
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" fw={900} lh={1.1} style={{ letterSpacing: '-0.5px' }} truncate>{title}</Text>
              {subtitle && (
                <Text size={rem(8)} c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>{subtitle}</Text>
              )}
            </Box>
          ) : (
            // スクロール時かつタブがある場合、ここにタブを表示
            tabs && <Box style={{ flex: 1, minWidth: 0 }}>{tabs}</Box>
          )}
        </Group>

        {/* 右側: アクションボタン */}
        <Group gap={rem(4)} wrap="nowrap" style={{ flexShrink: 0 }}>
          {children}
        </Group>
      </Group>

      {/* 非スクロール時の拡張エリア */}
      {!isScrolled && (
        <>
          {tabs && <Box mt="sm">{tabs}</Box>}
          {bottomContent && <Box mt="xs">{bottomContent}</Box>}
        </>
      )}
    </Paper>
  )
}
