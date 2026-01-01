'use client'

import React from 'react'
import { Paper, Group, Text, Box, ThemeIcon, Image } from '@mantine/core'
import { useWindowScroll } from '@mantine/hooks'

interface PageHeaderProps {
  title: string
  subtitle?: string
  tabs?: React.ReactNode
  children?: React.ReactNode
  bottomContent?: React.ReactNode
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
      py={isScrolled ? "0.4rem" : "0.6rem"}
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
        <Group gap="xs" wrap="nowrap" style={{ flex: isScrolled && tabs ? 1 : 'unset', minWidth: 0 }}>
          <Image
            src="/logo.jpg"
            alt="Flola Logo"
            w={isScrolled ? 24 : 30}
            h={isScrolled ? 24 : 30}
            radius="sm"
            fallbackSrc="https://placehold.co/30x30?text=F"
          />
          
          {!isScrolled ? (
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" fw={900} lh={1.1} style={{ letterSpacing: '-0.5px' }} truncate>{title}</Text>
              {subtitle && (
                <Text style={{ fontSize: '0.5rem', color: 'var(--mantine-color-gray-6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>{subtitle}</Text>
              )}
            </Box>
          ) : (
            tabs && <Box style={{ flex: 1, minWidth: 0 }}>{tabs}</Box>
          )}
        </Group>

        <Group gap="0.25rem" wrap="nowrap" style={{ flexShrink: 0 }}>
          {children}
        </Group>
      </Group>

      {!isScrolled && (
        <>
          {tabs && <Box mt="sm">{tabs}</Box>}
          {bottomContent && <Box mt="xs">{bottomContent}</Box>}
        </>
      )}
    </Paper>
  )
}