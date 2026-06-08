import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize'

const WHOOP_SCOPES = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline'
const OURA_SCOPES = 'email personal daily heartrate workout tag session spo2 ring_configuration daily_stress daily_readiness daily_activity sleep personal'

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('onboard_token', token)
    .single()

  console.log('TOKEN:', token)
  console.log('CLIENT:', client)
  console.log('ERROR:', error)

  if (!client) {
    redirect(`/error?msg=token_was_${token}`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  const whoopUrl = `${WHOOP_AUTH_URL}?client_id=${process.env.WHOOP_CLIENT_ID}&redirect_uri=${baseUrl}/api/auth/whoop/callback&response_type=code&scope=${encodeURIComponent(WHOOP_SCOPES)}&state=${token}`

  const ouraUrl = `${OURA_AUTH_URL}?client_id=${process.env.OURA_CLIENT_ID}&redirect_uri=${baseUrl}/api/auth/oura/callback&response_type=code&scope=${encodeURIComponent(OURA_SCOPES)}&state=${token}`

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        <img src="/logo.png" alt="Protocol 1" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '24px', objectFit: 'cover' }} />
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '500', marginBottom: '12px' }}>
          Welcome, {client.name}
        </h1>
        <p style={{ color: '#888', fontSize: '15px', marginBottom: '48px', lineHeight: '1.6' }}>
          Connect your wearable to begin your biological data feed.
        </p>

        {(client.device === 'whoop' || client.device === 'both') && (
          <a href={whoopUrl} style={{
            display: 'block',
            background: '#fff',
            color: '#000',
            padding: '16px 32px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '15px',
            marginBottom: '16px',
            letterSpacing: '0.02em',
          }}>
            Connect Whoop
          </a>
        )}

        {(client.device === 'oura' || client.device === 'both') && (
          <a href={ouraUrl} style={{
            display: 'block',
            background: '#fff',
            color: '#000',
            padding: '16px 32px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '15px',
            marginBottom: '16px',
            letterSpacing: '0.02em',
          }}>
            Connect Oura
          </a>
        )}

        <p style={{ color: '#444', fontSize: '12px', marginTop: '32px' }}>
          Your data is private and only accessible to your Protocol 1 architect.
        </p>
      </div>
    </main>
  )
}