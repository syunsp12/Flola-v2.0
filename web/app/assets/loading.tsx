'use client'

import { Skeleton, Card, Stack, Group } from "@mantine/core";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

export default function AssetsLoading() {
    return (
        <>
            <PageHeader title="Assets" />
            <PageContainer>
                <Stack gap="sm" className="p-5">
                    {/* Account Cards Skeleton */}
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} padding="md" radius="md" withBorder className="animate-pulse">
                            <Group justify="space-between" wrap="nowrap">
                                <Group gap="md">
                                    <Skeleton height={40} width={40} radius="md" />
                                    <Stack gap={4}>
                                        <Skeleton height={16} width={120} radius="xl" />
                                        <Skeleton height={12} width={80} radius="xl" />
                                    </Stack>
                                </Group>
                                <Skeleton height={24} width={100} radius="md" />
                            </Group>
                        </Card>
                    ))}
                </Stack>
            </PageContainer>
        </>
    );
}
