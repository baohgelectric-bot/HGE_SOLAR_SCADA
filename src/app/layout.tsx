import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'Solar SCADA Dashboard',
  description: 'Enterprise Solar SCADA Monitoring System — Giám sát hệ thống điện mặt trời',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
