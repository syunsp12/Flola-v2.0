'use client'

import Link from 'next/link'
import { Card, Text, Group, ThemeIcon, Stack } from "@mantine/core"
import { FileText, TrendingUp, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

export default function ToolsPage() {
  const tools = [
    {
      title: "給与明細分析",
      desc: "PDFをアップロードして収入登録",
      icon: FileText,
      href: "/tools/salary",
      color: "blue",
    },
    {
      title: "年金・iDeCo (準備中)",
      desc: "資産状況の確認",
      icon: Building2,
      href: "#",
      color: "gray",
    },
    {
      title: "持株会 (準備中)",
      desc: "拠出・評価額の確認",
      icon: TrendingUp,
      href: "#",
      color: "gray",
    }
  ]

  return (
    <>
      <PageHeader title="Tools" />
      <PageContainer>
        <Stack gap="sm">
          {tools.map((tool, i) => (
            <Link key={i} href={tool.href} style={{ textDecoration: 'none' }}>
              <Card padding="md" radius="md" withBorder>
                <Group wrap="nowrap">
                  <ThemeIcon size={48} radius="md" variant="light" color={tool.color}>
                    <tool.icon size={24} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700} size="lg">{tool.title}</Text>
                    <Text size="sm" c="dimmed">{tool.desc}</Text>
                  </Stack>
                </Group>
              </Card>
            </Link>
          ))}
        </Stack>
      </PageContainer>
    </>
  )
}