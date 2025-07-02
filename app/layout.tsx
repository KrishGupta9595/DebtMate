import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Debt Mate',
  description: 'Created By Krish',
  generator: 'Krish Productions',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
