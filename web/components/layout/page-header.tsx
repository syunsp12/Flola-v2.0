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
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm"
      px="md"
      py="sm"
      radius={0}
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
            <Text size="md" fw={800} lh={1.1} truncate>{title}</Text>
            {subtitle && (
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt={2} lh={1}>{subtitle}</Text>
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