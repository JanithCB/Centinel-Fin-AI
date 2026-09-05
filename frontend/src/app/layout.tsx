import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Centinel Fin AI – Your Expenses. Intelligent Insights.',
  description:
    'Centinel Fin AI transforms your transaction notifications into a smart, categorized spending ledger with AI-powered financial insights.',
  keywords: ['expense tracker', 'finance', 'AI', 'spending analytics', 'personal finance'],
  authors: [{ name: 'Centinel Fin AI' }],
  openGraph: {
    title: 'Centinel Fin AI',
    description: 'Your Expenses. Intelligent Insights.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#060f1e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
