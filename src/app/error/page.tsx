export default function ErrorPage({
  searchParams,
}: {
  searchParams: { msg?: string }
}) {
  const messages: Record<string, string> = {
    missing_params: 'Something went wrong with the connection. Please use your original link.',
    token_failed: 'Authentication failed. Please try again.',
    server_error: 'A server error occurred. Please try again.',
    invalid_link: 'This link is invalid or has expired.',
  }

  const message = messages[searchParams.msg ?? ''] ?? 'An unexpected error occurred.'

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
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>✗</div>
        <p style={{ color: '#666', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Protocol 1
        </p>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '500', marginBottom: '12px' }}>
          Connection Failed
        </h1>
        <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.6' }}>
          {message}
        </p>
      </div>
    </main>
  )
}