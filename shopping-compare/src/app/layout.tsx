import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'CompareCart - Compare products across any store',
  description: 'Save products from any shopping website and compare them side-by-side. Find the best deal across all your favorite stores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${playfair.variable}`}>
      <head>
        <script type="text/javascript" src="https://s.skimresources.com/js/301148X1789054.skimlinks.js" async />
      </head>
      <body className="h-full font-[var(--font-inter)] bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
