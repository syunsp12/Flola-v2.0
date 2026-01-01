'use client'

import React from 'react'
import { Container } from '@mantine/core'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  fullHeight?: boolean
}

export function PageContainer({ children, className, fullHeight = false }: PageContainerProps) {
  return (
    <Container 
      p="md" 
      h={fullHeight ? '100%' : 'auto'}
      className={className}
    >
      {children}
    </Container>
  )
}