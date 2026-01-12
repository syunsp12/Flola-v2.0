'use client'

import { useState } from 'react'
import { login } from './actions'
import { 
  Paper, 
  TextInput, 
  PasswordInput, 
  Button, 
  Title, 
  Text, 
  Container, 
  ThemeIcon,
  Stack,
  Center
} from "@mantine/core"
import { LockKeyhole, Mail, Lock } from 'lucide-react'
import { notifications } from '@mantine/notifications'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await login(formData)
      
      if (result?.error) {
        notifications.show({
          title: 'ログイン失敗',
          message: result.error,
          color: 'red'
        })
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      notifications.show({
        title: 'エラー',
        message: '予期せぬエラーが発生しました',
        color: 'red'
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
          Welcome Back
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Flola v2 にログインしてください
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              name="email"
              placeholder="your@email.com"
              leftSection={<Mail size={16} />}
              required
              autoComplete="email"
            />
            <PasswordInput
              label="Password"
              name="password"
              placeholder="Your password"
              leftSection={<Lock size={16} />}
              required
              autoComplete="current-password"
            />
            <Button 
              type="submit" 
              fullWidth 
              mt="md" 
              loading={loading}
              size="md"
            >
              ログイン
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
