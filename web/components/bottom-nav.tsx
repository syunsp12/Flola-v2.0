'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, Inbox, Landmark, Settings, Grid } from 'lucide-react'
import { Paper, Group, Text, Stack, ThemeIcon, rem, Indicator, Box, Center } from '@mantine/core'
import { getPendingCount } from '@/app/actions'

export function BottomNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }
    fetchCount()
    
    // 定期的な更新 (30秒おき)
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [pathname]) // ページ遷移時にも再取得

  const items = [
    { href: '/inbox', label: 'Inbox', icon: Inbox, badge: pendingCount },
    { href: '/assets', label: 'Assets', icon: Landmark },
    { href: '/', label: 'Home', icon: Home },
    { href: '/tools', label: 'Tools', icon: Grid },
    { href: '/admin', label: 'Admin', icon: Settings },
  ]

  return (
    <Box 
      pos="fixed" 
      bottom={rem(16)} 
      left={0} 
      right={0} 
      px="md"
      style={{ zIndex: 100 }}
    >
      <Paper 
        shadow="xl" 
        p="xs"
        radius="xl"
        withBorder
        style={{ 
          maxWidth: 400, 
          margin: '0 auto',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <Group gap={0} justify="space-around" wrap="nowrap">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            const content = (
              <Stack align="center" justify="center" gap={4} style={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                transform: isActive ? 'scale(1.1)' : 'scale(1)'
              }}>
                <ThemeIcon 
                  variant="transparent" 
                  color={isActive ? 'indigo' : 'gray'} 
                  size="lg"
                >
                  <Icon style={{ width: rem(22), height: rem(22) }} strokeWidth={isActive ? 2.5 : 1.5} />
                </ThemeIcon>
                <Text size={rem(9)} fw={isActive ? 800 : 500} c={isActive ? 'indigo' : 'dimmed'} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  {item.label}
                </Text>
              </Stack>
            )

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none', flex: 1 }}
              >
                {item.badge && item.badge > 0 ? (
                  <Indicator label={item.badge} size={16} color="red" offset={4} withBorder>
                    {content}
                  </Indicator>
                ) : (
                  content
                )}
              </Link>
            )
          })}
        </Group>
      </Paper>
    </Box>
  )
}