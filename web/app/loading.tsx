import { Skeleton, Card, Grid, Group, Stack } from "@mantine/core";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

export default function Loading() {
  return (
    <>
      <PageHeader title="Loading..." subtitle="Please wait" />
      <PageContainer>
        <Stack gap="lg" className="p-5">
          {/* Net Worth Card Skeleton */}
          <Card padding="lg" radius="lg" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Skeleton height={12} width={100} radius="xl" />
                <Skeleton height={20} width={80} radius="xl" />
              </Group>
              <Skeleton height={40} width={200} radius="md" />
              <Grid>
                <Grid.Col span={6}>
                  <Skeleton height={30} radius="md" />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Skeleton height={30} radius="md" />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>

          {/* Quick Stats Grid */}
          <Grid>
            <Grid.Col span={6}>
              <Skeleton height={120} radius="lg" />
            </Grid.Col>
            <Grid.Col span={6}>
              <Skeleton height={120} radius="lg" />
            </Grid.Col>
          </Grid>

          {/* Chart Skeleton */}
          <Card padding="lg" radius="lg" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Skeleton height={20} width={120} radius="md" />
                <Skeleton height={24} width={100} radius="md" />
              </Group>
              <Skeleton height={200} radius="md" />
            </Stack>
          </Card>

          {/* Account List Skeleton */}
          <Stack gap="md">
            <Skeleton height={20} width={100} radius="md" />
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md" radius="lg" withBorder>
                <Group justify="space-between">
                  <Group>
                    <Skeleton height={40} width={40} radius="md" />
                    <Stack gap="xs">
                      <Skeleton height={16} width={120} radius="xl" />
                      <Skeleton height={12} width={60} radius="xl" />
                    </Stack>
                  </Group>
                  <Skeleton height={24} width={80} radius="md" />
                </Group>
              </Card>
            ))}
          </Stack>
        </Stack>
      </PageContainer>
    </>
  );
}
