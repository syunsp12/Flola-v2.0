'use client'

import { Skeleton, Card, Stack, Group } from "@mantine/core";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

export default function AnalyzeLoading() {
    return (
        <>
            <PageHeader title="Analysis" subtitle="Time-series Reports" />
            <PageContainer>
                <Stack gap="xl" className="p-5">
                    {/* Summary Stats Skeleton */}
                    <Group grow>
                        <Skeleton height={50} radius="md" className="animate-pulse" />
                        <Skeleton height={50} radius="md" className="animate-pulse" />
                    </Group>

                    {/* Main Chart Skeleton */}
                    <Card padding="lg" radius="xl" withBorder>
                        <Stack gap="md">
                            <Skeleton height={24} width={150} radius="md" />
                            <Skeleton height={300} radius="lg" className="animate-pulse" />
                        </Stack>
                    </Card>

                    {/* Additional Charts */}
                    <Group grow>
                        <Card padding="md" radius="lg" withBorder>
                            <Skeleton height={180} radius="md" className="animate-pulse" />
                        </Card>
                        <Card padding="md" radius="lg" withBorder>
                            <Skeleton height={180} radius="md" className="animate-pulse" />
                        </Card>
                    </Group>
                </Stack>
            </PageContainer>
        </>
    );
}
