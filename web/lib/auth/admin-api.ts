import { NextResponse } from 'next/server'

export type AdminApiAuthResult =
  | { ok: true }
  | { ok: false, response: NextResponse }

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

function readLegacyQueryToken(request: Request): string | null {
  const { searchParams } = new URL(request.url)
  return searchParams.get('token') || searchParams.get('key')
}

export function authenticateAdminApiRequest(request: Request): AdminApiAuthResult {
  const expectedToken = process.env.ADMIN_API_KEY
  if (!expectedToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 })
    }
  }

  const bearerToken = readBearerToken(request)
  if (bearerToken) {
    if (bearerToken === expectedToken) return { ok: true }
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const allowLegacy = process.env.ALLOW_LEGACY_QUERY_AUTH === 'true'
  if (allowLegacy) {
    const legacyToken = readLegacyQueryToken(request)
    if (legacyToken === expectedToken) {
      console.warn('[DEPRECATED AUTH] Query token auth accepted. Use Authorization: Bearer header instead.')
      return { ok: true }
    }
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
  }
}
