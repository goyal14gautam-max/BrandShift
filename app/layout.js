import { Instrument_Serif, Inter, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import { AuthProvider } from '@/hooks/useAuth';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-headline',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-accent',
  display: 'swap',
});

export const metadata = {
  title: 'BrandShift',
  description: 'AI-powered brand intelligence for Indian brands',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'BrandShift',
    description: 'Know exactly where your brand stands.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrandShift',
    description: 'Know exactly where your brand stands.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable}`}>
      <body><AuthProvider><AnalyticsProvider>{children}</AnalyticsProvider></AuthProvider></body>
    </html>
  );
}
