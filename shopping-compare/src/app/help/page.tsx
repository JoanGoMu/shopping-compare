import type { Metadata } from 'next';
import PublicLayout from '@/components/PublicLayout';

export const metadata: Metadata = {
  title: 'Help & FAQ - CompareCart',
  description: 'Learn how to use CompareCart to save products and compare prices across any store.',
};

const faqs: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: 'Getting started',
    items: [
      {
        q: 'How do I install the extension?',
        a: 'Search for "CompareCart - Save to Compare" in the Chrome Web Store and click Add to Chrome. Once installed, you\'ll see the CompareCart button appear on supported product pages.',
      },
      {
        q: 'How do I save a product?',
        a: 'Visit any product page on a supported store. A "Save to CompareCart" button will appear on the page. Click it to add the product to your collection. You need to be signed in first.',
      },
      {
        q: 'How do I compare products?',
        a: 'Go to your Collection, select the products you want to compare using the checkboxes, then click "Compare selected". You can compare products from different stores side by side.',
      },
      {
        q: 'Which stores are supported?',
        a: 'CompareCart has dedicated extractors for Amazon, eBay, AliExpress, Etsy, Zalando, Zara, Sephora, The North Face, ASOS, and H&M. It also works on any other store via standard product data - if a button doesn\'t appear, try adding the product by URL from your dashboard.',
      },
    ],
  },
  {
    section: 'Features',
    items: [
      {
        q: 'How do price alerts work?',
        a: 'Enable the price alert bell on any product in your collection. CompareCart checks prices daily and sends you an email if the price drops. You can also get instant alerts when another user visits the same product page.',
      },
      {
        q: 'How do I share a comparison?',
        a: 'From the Compare view, save your products as a group, then click "Share". You\'ll get a public link you can send to anyone - they don\'t need an account to view it.',
      },
      {
        q: 'What does the specs comparison show?',
        a: 'CompareCart extracts product specifications like size, color, material, and brand. In the comparison table, specs that differ between products are highlighted so you can spot differences at a glance.',
      },
      {
        q: 'How do I add a product by URL?',
        a: 'From your dashboard, paste a product URL into the "Add by URL" field and press Enter. Note that some stores block automated access - if it fails, use the extension on that product page instead.',
      },
    ],
  },
  {
    section: 'Troubleshooting',
    items: [
      {
        q: 'The save button is not appearing on a product page.',
        a: 'Make sure you are signed in via the extension popup. If you are signed in, try refreshing the page. The button only appears on product pages - it won\'t show on category or search results pages. If the store is not yet supported, use the "Add by URL" option from your dashboard.',
      },
      {
        q: 'The price is not updating.',
        a: 'Some stores (Zara, Sephora, The North Face, Zalando) block automated price checks. For these, the price updates automatically the next time you or another CompareCart user visits that product page with the extension installed.',
      },
      {
        q: 'I\'m not receiving price alert emails.',
        a: 'Check that the price alert bell is enabled on the specific product (it\'s off by default). Also check your spam folder for emails from alerts@comparecart.app.',
      },
      {
        q: 'The extension is not syncing my login.',
        a: 'Sign in on comparecart.app first, then open the extension popup - it syncs your session automatically. If it still shows as signed out, try signing out and back in on the website.',
      },
    ],
  },
  {
    section: 'Account',
    items: [
      {
        q: 'How do I create an account?',
        a: 'Go to comparecart.app/signup and enter your email and password. You can also sign up directly from the extension popup.',
      },
      {
        q: 'Is CompareCart free?',
        a: 'Yes, CompareCart is completely free. If it saves you money, you can optionally support the project by buying a coffee at buymeacoffee.com/joangm.',
      },
      {
        q: 'How is my data stored?',
        a: 'Your saved products and comparisons are stored securely in your account. Only you can see your collection. Shared comparisons are public only when you explicitly share them. See our Privacy Policy for full details.',
      },
      {
        q: 'How do I delete my account or data?',
        a: 'To delete your data or account, send a message via the Feedback page and we\'ll take care of it within 48 hours.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs tracking-widest uppercase text-muted mb-3">Help Center</p>
        <h1 className="font-[var(--font-display)] italic text-3xl text-ink mb-2">Frequently asked questions</h1>
        <p className="text-sm text-muted mb-12">
          Can&apos;t find what you&apos;re looking for?{' '}
          <a href="/feedback" className="text-terra hover:underline">Send us a message</a>.
        </p>

        <div className="space-y-12">
          {faqs.map(section => (
            <section key={section.section}>
              <h2 className="text-xs tracking-[0.3em] uppercase text-muted mb-4 border-b border-warm-border pb-2">
                {section.section}
              </h2>
              <div className="space-y-1">
                {section.items.map(item => (
                  <details key={item.q} className="group border-b border-warm-border last:border-b-0">
                    <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer text-sm font-medium text-ink list-none hover:text-terra transition-colors">
                      <span>{item.q}</span>
                      <span className="text-muted group-open:rotate-45 transition-transform shrink-0 text-lg leading-none">+</span>
                    </summary>
                    <p className="pb-4 text-sm text-muted leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
