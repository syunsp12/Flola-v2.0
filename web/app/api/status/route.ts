import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { authenticateAdminApiRequest } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = authenticateAdminApiRequest(request)
  if (!auth.ok) return auth.response

  const supabase = await createClient()

  try {
    // INBOX（ステータスが pending）の件数を取得
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) throw error

    return NextResponse.json({
      inbox_count: count || 0,
      updated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Widget API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
