import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  // セッション更新処理（認証状態の確認）
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 以下のパスを除外して、それ以外すべてのルートでミドルウェアを動かす
     * - _next/static (静的ファイル)
     * - _next/image (画像)
     * - favicon.ico
     * - /login (ログイン画面自体は除外しないとループする)
     * - /api/webhook (GAS等からのアクセスはAPIキー認証なので除外)
     * - /api/status (ウィジェット用もAPIキー認証なので除外)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|api/webhook|api/status).*)',
  ],
}