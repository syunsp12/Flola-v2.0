'use client'

import { Skeleton, Card, Stack, Group } from "@mantine/core";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

export default function ToolsLoading() {
    return (
        <>
            <PageHeader title="Tools" subtitle="Utilities" />
            <PageContainer>
                <Stack gap="md" className="p-5">
                    {/* Tool Cards Skeleton */}
                    <Group grow>
                        {[1, 2].map((i) => (
                            <Card key={i} padding="xl" radius="lg" withBorder className="animate-pulse">
                                <Stack gap="md" align="center">
                                    <Skeleton height={48} width={48} circle />
                                    <Skeleton height={20} width={120} radius="md" />
                                    <Skeleton height={16} width="100%" radius="md" />
                                    <Skeleton height={36} width={100} radius="md" />
                                </Stack>
                            </Card>
                        ))}
                    </Group>
                </Stack>
            </PageContainer>
        </>
    );
}
