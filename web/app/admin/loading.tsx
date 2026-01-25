'use client'

import { Skeleton, Card, Stack, Group, Divider } from "@mantine/core";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

export default function AdminLoading() {
    return (
        <>
            <PageHeader title="Admin" subtitle="System Management" />
            <PageContainer>
                <Stack gap="xl" className="p-5">
                    {/* Job Status Section */}
                    <Stack gap="md">
                        <Skeleton height={28} width={150} radius="md" />
                        <Card padding="lg" radius="lg" withBorder>
                            <Stack gap="md">
                                {[1, 2, 3].map((i) => (
                                    <div key={i}>
                                        <Group justify="space-between" className="animate-pulse">
                                            <Skeleton height={20} width={200} radius="md" />
                                            <Skeleton height={32} width={80} radius="md" />
                                        </Group>
                                        {i < 3 && <Divider my="sm" />}
                                    </div>
                                ))}
                            </Stack>
                        </Card>
                    </Stack>

                    {/* Settings Section */}
                    <Stack gap="md">
                        <Skeleton height={28} width={120} radius="md" />
                        <Card padding="lg" radius="lg" withBorder>
                            <Stack gap="lg">
                                {[1, 2].map((i) => (
                                    <Stack key={i} gap="xs" className="animate-pulse">
                                        <Skeleton height={16} width={150} radius="md" />
                                        <Skeleton height={40} width="100%" radius="md" />
                                    </Stack>
                                ))}
                            </Stack>
                        </Card>
                    </Stack>
                </Stack>
            </PageContainer>
        </>
    );
}
