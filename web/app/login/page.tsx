'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Center,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Lock, LockKeyhole, Mail } from 'lucide-react'
import { login } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await login(formData)

      if (result?.error) {
        notifications.show({
          title: 'ログインに失敗しました',
          message: result.error,
          color: 'red',
        })
        setLoading(false)
        return
      }

      router.push('/')
    } catch (error) {
      console.error(error)
      notifications.show({
        title: '不明なエラー',
        message: 'ログイン処理で予期しないエラーが発生しました。',
        color: 'red',
      })
      setLoading(false)
    }
  }

  return (
    <Container size="xs" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper radius="md" p="xl" withBorder w="100%" shadow="md">
        <Center mb="lg">
          <ThemeIcon size={60} radius="xl" variant="light" color="indigo">
            <LockKeyhole size={30} />
          </ThemeIcon>
        </Center>

        <Title order={2} ta="center" mt="md" mb="xs">
          ログイン
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Flola にサインインして家計データを確認します
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="メールアドレス"
              name="email"
              placeholder="your@email.com"
              leftSection={<Mail size={16} />}
              required
              autoComplete="email"
            />
            <PasswordInput
              label="パスワード"
              name="password"
              placeholder="パスワードを入力"
              leftSection={<Lock size={16} />}
              required
              autoComplete="current-password"
            />
            <Button type="submit" fullWidth mt="md" loading={loading} size="md">
              ログイン
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
