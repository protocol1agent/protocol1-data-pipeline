import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Protocol 1',
  description: 'Connect your wearable to begin your biological data feed.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Protocol 1',
    description: 'Connect your wearable to begin your biological data feed.',
    siteName: 'Protocol 1',
    images: [
      {
        url: '/logo.png',
        width: 1080,
        height: 1080,
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  )
}