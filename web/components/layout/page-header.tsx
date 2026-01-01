'use client'

import React from 'react'
import { Paper, Group, Text, Box } from '@mantine/core'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  bottomContent?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  subtitle, 
  children, 
  bottomContent, 
}: PageHeaderProps) {
  return (
    <Paper 
      p="md" 
      radius={0}
      pos="sticky"
      top={0}
      style={{ zIndex: 90, borderBottom: '1px solid var(--mantine-color-gray-2)' }}
      bg="rgba(255, 255, 255, 0.9)"
    >
      <Group justify="space-between" align="center" mb={bottomContent ? 'xs' : 0}>
        <Box>
          <Text size="xl" fw={900} lh={1.1} style={{ letterSpacing: '-0.5px' }}>{title}</Text>
          {subtitle && (
            <Text size="xs" c="dimmed" fw={500}>{subtitle}</Text>
          )}
        </Box>
        <Group gap="xs">
          {children}
        </Group>
      </Group>
      {bottomContent}
    </Paper>
  )
}