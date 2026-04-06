export const metadata = { title: 'Privacy Policy - CompareCart' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-xs tracking-widest uppercase text-muted hover:text-ink mb-10 inline-block">
          ← CompareCart
        </a>

        <h1 className="font-serif text-3xl italic text-ink mb-2">Privacy Policy</h1>
        <p className="text-xs text-muted tracking-wide mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm text-ink leading-relaxed">

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">What CompareCart is</h2>
            <p>CompareCart is a browser extension and web app that lets you save products from shopping websites and compare them side by side. This policy explains what data we collect, why, and how it is handled.</p>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Data we collect</h2>
            <p className="mb-3">When you use CompareCart, we collect and store the following:</p>
            <ul className="space-y-2 list-none">
              <li className="pl-4 border-l-2 border-warm-border"><strong>Account information</strong> - your email address, used to identify your account and sync your collection across devices.</li>
              <li className="pl-4 border-l-2 border-warm-border"><strong>Saved products</strong> - product name, price, image, URL, and store name for items you choose to save. This data comes from product pages you visit and is only saved when you click the Save button.</li>
              <li className="pl-4 border-l-2 border-warm-border"><strong>Comparison groups</strong> - the groups and collections you create to organise your saved products.</li>
              <li className="pl-4 border-l-2 border-warm-border"><strong>Notes</strong> - any personal notes you add to saved products.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Data we do not collect</h2>
            <p className="mb-3">The CompareCart extension does not:</p>
            <ul className="space-y-2 list-none">
              <li className="pl-4 border-l-2 border-warm-border">Read or record your browsing history</li>
              <li className="pl-4 border-l-2 border-warm-border">Track which pages you visit</li>
              <li className="pl-4 border-l-2 border-warm-border">Collect any data from pages where you have not clicked the Save button</li>
              <li className="pl-4 border-l-2 border-warm-border">Access payment information or passwords</li>
            </ul>
            <p className="mt-3">The extension only reads product data from a page at the moment you explicitly click Save. It does not run in the background or observe your activity.</p>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">How we use your data</h2>
            <p>Your data is used solely to operate the CompareCart service - to show you your saved products and allow you to compare them. We do not sell your data to third parties. We do not use it for advertising. We do not share it with anyone outside of the service.</p>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Data storage</h2>
            <p>Your data is stored securely using Supabase, a managed database platform. Data is encrypted in transit and at rest. Each user can only access their own data - your collection is private to your account.</p>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Deleting your data</h2>
            <p>You can delete individual saved products from your dashboard at any time. To delete your account and all associated data, contact us at the email below and we will remove everything within 7 days.</p>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Cookies</h2>
            <p>CompareCart uses a session cookie to keep you signed in to the web app. No third-party tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Contact</h2>
            <p>Questions about this policy or your data: <a href="mailto:joangomezmussone@gmail.com" className="text-terra hover:underline">joangomezmussone@gmail.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
