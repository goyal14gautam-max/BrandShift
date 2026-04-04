import { Instrument_Serif, Inter, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

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
  title: 'BrandShift — AI Brand Audit for Indian Brands',
  description: 'AI analyses your website, social media, and competitors. Then tells you what to fix and in what order.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
