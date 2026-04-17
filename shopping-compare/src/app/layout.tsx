import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  metadataBase: new URL('https://comparecart.app'),
  title: 'CompareCart - Compare products across any store',
  description: 'Save products from any shopping website and compare them side-by-side. Find the best deal across all your favorite stores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C4603C" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CompareCart" />
        <link rel="apple-touch-icon" href="/logo-icon-192.png" />
        <script type="text/javascript" src="https://s.skimresources.com/js/301148X1789054.skimlinks.js" async />
      </head>
      <body className="h-full font-[var(--font-inter)] bg-cream text-ink antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
