'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Inbox, Landmark, Settings, Grid } from 'lucide-react'
import { Paper, Group, Text, Stack, ThemeIcon, rem } from '@mantine/core'

export function BottomNav() {
  const pathname = usePathname()

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/assets', label: 'Assets', icon: Landmark },
    { href: '/tools', label: 'Tools', icon: Grid },
    { href: '/admin', label: 'Admin', icon: Settings },
  ]

  return (
    <Paper 
      shadow="md" 
      p={0}
      pos="fixed" 
      bottom={0} 
      left={0} 
      right={0} 
      h={80}
      style={{ zIndex: 100, borderTop: '1px solid var(--mantine-color-gray-2)' }}
      radius={0}
    >
      <Group h="100%" gap={0} justify="space-around" align="center" style={{ maxWidth: 448, margin: '0 auto' }}>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: 'none', flex: 1, height: '100%' }}
            >
              <Stack align="center" justify="center" gap={4} h="100%" style={{ 
                borderTop: isActive ? '3px solid var(--mantine-color-indigo-6)' : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}>
                <ThemeIcon 
                  variant="transparent" 
                  color={isActive ? 'indigo' : 'gray'} 
                  size="lg"
                >
                  <Icon style={{ width: rem(24), height: rem(24) }} strokeWidth={isActive ? 2.5 : 1.5} />
                </ThemeIcon>
                <Text size="xs" fw={isActive ? 700 : 500} c={isActive ? 'indigo' : 'dimmed'}>
                  {item.label}
                </Text>
              </Stack>
            </Link>
          )
        })}
      </Group>
    </Paper>
  )
}