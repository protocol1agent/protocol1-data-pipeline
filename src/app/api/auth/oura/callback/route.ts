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
    const tokenResponse = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.OURA_CLIENT_ID!,
        client_secret: process.env.OURA_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/oura/callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/error?msg=token_failed', request.url))
    }

    await supabase
      .from('clients')
      .update({
        oura_access_token: tokens.access_token,
        oura_refresh_token: tokens.refresh_token ?? null,
        oura_token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        connected_at: new Date().toISOString(),
      })
      .eq('onboard_token', state)

    return NextResponse.redirect(new URL('/success?device=oura', request.url))
  } catch {
    return NextResponse.redirect(new URL('/error?msg=server_error', request.url))
  }
}