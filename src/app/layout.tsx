import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono' });
const serif = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'ListForge — segment before you load',
  description:
    'Interactive demo: real live MX lookups plus a scripted list-hygiene scenario that segments accounts into clean, catch-all-hold and invalid before any sender ever sees them.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
