import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CROSSHAIR - Competitive Intelligence',
  description: 'AI-powered competitive intelligence and lead generation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
