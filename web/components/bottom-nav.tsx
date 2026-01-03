'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, Inbox, Landmark, Settings, PieChart } from 'lucide-react'
import { Paper, Group, Text, Stack, ThemeIcon, rem, Indicator, Box } from '@mantine/core'
import { getPendingCount } from '@/app/actions'

export function BottomNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  const refreshCount = async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch (e) {
      console.error("Failed to fetch pending count", e)
    }
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 10000)
    return () => clearInterval(interval)
  }, [pathname])

  const items = [
    { href: '/inbox', label: 'Inbox', icon: Inbox, count: pendingCount },
    { href: '/assets', label: 'Assets', icon: Landmark },
    { href: '/', label: 'Home', icon: Home },
    { href: '/analyze', label: 'Analysis', icon: PieChart },
    { href: '/admin', label: 'Admin', icon: Settings },
  ]

  const getBadgeColor = (count: number) => {
    if (count < 5) return 'indigo'
    if (count < 10) return 'orange'
    return 'red'
  }

  return (
    <Box 
      pos="fixed" 
      bottom="1rem" 
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
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <Group gap={0} justify="space-around" wrap="nowrap" align="center">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const hasBadge = item.label === 'Inbox' && typeof item.count === 'number' && item.count > 0
            
            return (
              <Box key={item.href} style={{ flex: 1 }}>
                <Link
                  href={item.href}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <Stack align="center" justify="center" gap={4} style={{ 
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    position: 'relative'
                  }}>
                    <Indicator 
                      label={hasBadge ? item.count : undefined}
                      disabled={!hasBadge}
                      size="1.1rem"
                      offset={2}
                      position="top-end"
                      color={getBadgeColor(item.count || 0)}
                      withBorder
                      processing={hasBadge}
                      styles={{
                        indicator: {
                          fontWeight: 900,
                          fontSize: '0.6rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }
                      }}
                    >
                      <ThemeIcon 
                        variant="transparent" 
                        color={isActive ? 'indigo' : 'gray'} 
                        size="2rem"
                      >
                        <Icon style={{ width: '1.4rem', height: '1.1rem' }} strokeWidth={isActive ? 2.5 : 1.5} />
                      </ThemeIcon>
                    </Indicator>

                    <Text style={{ fontSize: '0.6rem', fontWeight: isActive ? 800 : 500, color: isActive ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-gray-6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {item.label}
                    </Text>
                  </Stack>
                </Link>
              </Box>
            )
          })}
        </Group>
      </Paper>
    </Box>
  )
}