'use client'

import { Skeleton, Card, Stack } from "@mantine/core";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

export default function InboxLoading() {
    return (
        <>
            <PageHeader title="Inbox" subtitle="Loading..." />
            <PageContainer>
                <Stack gap="md" className="p-5">
                    {/* Status Tabs Skeleton */}
                    <Stack gap="xs">
                        <Skeleton height={40} radius="md" width="100%" />
                    </Stack>

                    {/* Filter Controls Skeleton */}
                    <Stack gap="sm">
                        <Skeleton height={36} radius="md" width={200} />
                    </Stack>

                    {/* Transaction Cards Skeleton */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Card key={i} padding="md" radius="lg" withBorder className="animate-pulse">
                            <Stack gap="xs">
                                <Skeleton height={20} width="70%" radius="md" />
                                <Skeleton height={16} width="50%" radius="md" />
                                <Skeleton height={16} width="30%" radius="md" />
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            </PageContainer>
        </>
    );
}
