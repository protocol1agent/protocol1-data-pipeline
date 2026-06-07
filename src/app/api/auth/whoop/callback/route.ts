import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/error?msg=missing_params', request.url))
  }

  try {
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/whoop/callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    console.log('WHOOP TOKEN RESPONSE:', JSON.stringify(tokens))

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL(`/error?msg=${tokens.error ?? 'token_failed'}`, request.url))
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase
      .from('clients')
      .update({
        whoop_access_token: tokens.access_token,
        whoop_refresh_token: tokens.refresh_token,
        whoop_token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
      })
      .eq('onboard_token', state)

    return NextResponse.redirect(new URL('/success?device=whoop', request.url))
  } catch {
    return NextResponse.redirect(new URL('/error?msg=server_error', request.url))
  }
}