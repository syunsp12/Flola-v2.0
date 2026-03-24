import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // パフォーマンス最適化: getSessionはネットワークリクエストを発生させない可能性がある(Cookie/LocalStorage)
  // ただし、セキュリティクリティカルな操作の前にはgetUserの使用が推奨される
  // ここではミドルウェアでの一般的なルーティングガードとして、まずはgetSessionで確認し、
  // 必要な場合のみgetUserで検証する形をとるか、あるいは毎回getUserを呼ぶかはトレードオフ。

  // 今回はパフォーマンス重視で、まずgetSessionを試みる実装に変更
  const { data: { session } } = await supabase.auth.getSession()

  // セッションがない、または期限切れの可能性がある場合はgetUserで再検証（リフレッシュトークンの処理含む）
  let user = session?.user ?? null

  if (!user) {
    // セッションがない場合のみ、念のためgetUserで確認（Cookieのリフレッシュなどが走る可能性があるため）
    const { data: { user: refreshedUser } } = await supabase.auth.getUser()
    user = refreshedUser
  }

  // 未ログインかつ保護されたルートへのアクセスならログイン画面へリダイレクト
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}