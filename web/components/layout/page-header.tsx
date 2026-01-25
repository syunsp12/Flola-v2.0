'use client'

import React from 'react'
import { Paper, Group, Text, Box } from '@mantine/core'
import Image from 'next/image'

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
  return (
    <Paper
      px="md"
      py="0.6rem"
      radius={0}
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <div style={{ position: 'relative', width: 30, height: 30 }}>
            <Image
              src="/logo.jpg"
              alt="Flola Logo"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 30px, 30px"
              style={{ objectFit: 'cover', borderRadius: '4px' }}
            />
          </div>

          <Box style={{ minWidth: 0 }}>
            <Text size="sm" fw={900} lh={1.1} style={{ letterSpacing: '-0.5px' }} truncate>{title}</Text>
            {subtitle && (
              <Text style={{ fontSize: '0.5rem', color: 'var(--mantine-color-gray-6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>{subtitle}</Text>
            )}
          </Box>
        </Group>

        <Group gap="0.25rem" wrap="nowrap" style={{ flexShrink: 0 }}>
          {children}
        </Group>
      </Group>

      {tabs && <Box mt="sm">{tabs}</Box>}
      {bottomContent && <Box mt="xs">{bottomContent}</Box>}
    </Paper>
  )
}