export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string }>
}) {
  const { device: deviceParam } = await searchParams
  const device = deviceParam === 'whoop' ? 'Whoop' : 'Oura'

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
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>✓</div>
        <p style={{ color: '#666', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Protocol 1
        </p>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '500', marginBottom: '12px' }}>
          {device} Connected
        </h1>
        <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.6' }}>
          Your biological data feed is now active. You can close this window.
        </p>
      </div>
    </main>
  )
}