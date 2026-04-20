---
name: CompareCart project
description: Cross-site shopping comparison tool - second project by Joan, separate from aitoolcrunch.com
type: project
---

Second project: a web app + Chrome extension that lets shoppers save products from any store and compare them side-by-side.

**Why:** Market validated (Honey $4B acquisition). Differentiation: structured side-by-side comparison UX with filtering.

**Location:** `/Users/joan.mussone/Desktop/Projects/Shopping Compare/`
- `shopping-compare/` - Next.js 16 web app
- `extension/` - Chrome extension (Manifest V3)
- Both tracked in same git repo: https://github.com/JoanGoMu/shopping-compare

**Stack:**
- Next.js 16.2.2 + TypeScript + Tailwind CSS (App Router, `params` must be awaited)
- Supabase: URL=https://czrvohnvncavpoulivtt.supabase.co
- Resend for email (RESEND_API_KEY in .env.local). From address: alerts@comparecart.app (domain verified).
- Chrome Extension Manifest V3 + esbuild build
- Deployed at https://comparecart.app (custom domain, Vercel Hobby - cron once/day max, 0 6 * * *)

**Design:** Warm editorial - cream background, terracotta (#C4603C), sharp borders, 3:4 portrait cards.

**IMPORTANT - Next.js 16:** Uses `src/proxy.ts` instead of `src/middleware.ts`.

**Extension build:**
```bash
cd "/Users/joan.mussone/Desktop/Projects/Shopping Compare/extension"
node build.mjs
```
`build.mjs` auto-reads `../shopping-compare/.env.local` for Supabase credentials. No env vars needed.
After building, reload extension in chrome://extensions.

**Current status (Apr 2026): MVP deployed, actively iterating**

## Architecture

**Key files - Web app:**
- `src/app/page.tsx` - Public homepage with recent comparisons grid, features, CTA
- `src/app/dashboard/layout.tsx` - Authenticated layout (Collection + Compare nav), includes ExtensionAuthBridge
- `src/app/compare/layout.tsx` - Compare layout (also authenticated), includes ExtensionAuthBridge
- `src/app/compare/page.tsx` - Uses CompareShell wrapper, key-based remount for group switching
- `src/app/compare/actions.ts` - shareComparison (upsert), unshareComparison, server actions
- `src/app/api/check-prices/route.ts` - Daily cron: price check + specs backfill + email notifications (imports from price-email.ts)
- `src/app/api/enrich-product/route.ts` - POST endpoint called by extension to update ALL users' records for a URL (admin client, bypasses RLS). Sends price drop emails via Resend.
- `src/lib/price-email.ts` - Shared email builder: PriceChange type, formatPrice(), buildPriceEmail() used by both cron and enrich-product
- `src/app/sitemap.ts` - Dynamic sitemap
- `src/components/CompareShell.tsx` - Client wrapper owning activeCount state for live sidebar sync
- `src/components/CompareTable.tsx` - Private compare table with add-more ghost column, save-as-group, specs display
- `src/components/PublicCompareTable.tsx` - Public table with CTA, affiliate links
- `src/components/GroupList.tsx` - Sidebar with checkboxes, batch actions (compare/share/unshare/delete)
- `src/components/ProductGrid.tsx` - Dashboard grid with sticky bulk action bar
- `src/components/ProductCard.tsx` - Product card with price_check_failed bottom band overlay ("Visit page to refresh price")
- `src/components/PublicLayout.tsx` - Layout for public pages (explore, stores, deals)
- `src/components/ExtensionAuthBridge.tsx` - Posts Supabase tokens to extension via postMessage (retries at 500ms, 1.5s, 4s)
- `src/lib/normalize-specs.ts` - Key normalization (60+ multilingual mappings) + value translation (80+ terms)
- `src/lib/extract-product.ts` - Server-side extraction: JSON-LD + Cheerio store-specific extractors
- `src/lib/supabase/types.ts` - SharedProduct, SharedComparison (uses Omit pattern for products override)
- `src/proxy.ts` - Auth redirects only (logged-in users on /login or /signup go to /dashboard)

**Key files - Extension:**
- `src/extractor.ts` - All 10 store extractors + JSON-LD + OG + generic DOM price + specs extraction
- `src/content.ts` - Save button injection, tryUpdateSavedPrice (with bestSizeForUrl tracking), tryRefreshRelatedProducts (iframe-based), iframe extraction mode
- `src/background.ts` - Supabase client, SAVE_PRODUCT, UPDATE_PRICE_IF_SAVED, GET_PRODUCTS_BY_DOMAIN, UPDATE_SPECS_FOR_URL, ENRICH_PRODUCT (calls server), SHARE_SESSION, GET_RELATED_URLS
- `src/normalize-specs.ts` - Identical copy of web app's normalize-specs.ts (keep in sync!)
- `src/popup.ts` - Sign in/out, auth status display
- `build.mjs` - esbuild, auto-reads ../shopping-compare/.env.local for credentials
- `manifest.json` - run_at: document_start, all_frames: true, permissions: storage + tabs

## Features working

- Product saving via extension (10 stores: Amazon, eBay, AliExpress, Etsy, Zalando, Zara, Sephora, TNF, ASOS, H&M)
- Generic JSON-LD extraction works on any site
- Add by URL (server-side fetch - blocked by some sites like Zara/Sephora, shows helpful error)
- Dashboard: search, filter, sort, bulk select, bulk delete, bulk compare
- Per-product price alert bell toggle (default OFF). Bulk on/off via selection toolbar.
- Daily cron price check (6am UTC). Emails products with price_alerts=true. Also backfills specs.
- Email notification via Resend on price change (batched per user)
- Compare view: side-by-side table, best-price badge, remove from group, ghost add-more column, save-as-group
- Saved groups in compare sidebar with multi-select batch actions (compare, share, unshare, delete)
- Auto-share comparisons on first view when group has 2+ products
- Shared comparison snapshots refresh: on every view (add/remove) + cron (price changes)
- Extension auto-syncs session from web app via ExtensionAuthBridge (mounted in both layouts)
- Extension updates price + specs silently when user visits saved product page
- Extension refreshes related saved products from same store via hidden iframes (iframe-first approach)
- Crowd-sourced enrichment: ENRICH_PRODUCT calls POST /api/enrich-product to update ALL users' records
- Rich specs extraction from JSON-LD + 10 store-specific DOM extractors
- Multilingual spec normalization: keys (ES/FR/DE/NL/IT to English) + values (materials/colors translated)
- Spec display: coverage threshold filter, priority ordering (Brand/Color/Material first), collapsible "Show more"
- Public pages: /explore, /stores, /store/[domain], /deals, /c/[slug], /privacy
- Buy Me a Coffee integration in all nav headers (buymeacoffee.com/joangm)
- Navigation: logo always goes to public homepage (/), not dashboard

## Spec extraction architecture

**Extension flow:** JSON-LD specs (all available variants, OOS filtered) + store-specific DOM specs + generic size/color fallback, normalized via normalizeSpecs()
**Server-side flow:** Same JSON-LD variant iteration but using Cheerio (no interactive DOM)
**Cron backfill:** check-prices extracts specs from fetched HTML, updates products with empty specs
**Extension revisit:** tryUpdateSavedPrice sends UPDATE_PRICE_IF_SAVED (local user, fast) + ENRICH_PRODUCT (server, updates ALL users).
**Related product refresh (iframe approach):** After 12s on a product page, tryRefreshRelatedProducts() asks background for GET_RELATED_URLS (same domain, max 5, 1hr cooldown per domain). Content script injects hidden 1x1px iframes for each URL. Content script runs inside each iframe (all_frames: true in manifest), detects window.self !== window.top, does silent extraction + ENRICH_PRODUCT, no UI. Iframes auto-removed after 20s. If store blocks iframes via X-Frame-Options, they silently fail.
**Crowd-sourced enrichment:** POST /api/enrich-product - when User Y visits a URL, updates specs+price for every user who saved that URL. Sends Resend email on price drop to each affected user with price_alerts=true.
**Generic fallback:** extractGenericSizeColor() runs on ANY store after JSON-LD + store-specific - scans <select> labels, button group aria roles, Shopify data-option-name
**Normalization:** KEY_MAP (exact) -> KEY_SUBSTRING_MAP (contains) -> title-case fallback. VALUE_MAP translates materials/colors.
**Display:** Coverage threshold (2+ for small groups, 30% for 7+), priority sort, collapsible toggle
**Store extractors with size/color DOM:** Zalando, Zara, TNF, Vans

## Size extraction protection (multi-layer)

1. **Client-side bestSizeForUrl tracker** (content.ts): tracks best Size value per URL during page session. Retries at 2s/5s/8s can never downgrade once a better value is found.
2. **mergeSpecsSafe()** (background.ts + enrich-product/route.ts): validates Size tokens against SIZE_VAL regex. Never overwrites a valid full list with fewer options. Replaces garbage data (e.g. payment methods) with valid fresh values.
3. **Zara extractor** (extractor.ts ~line 568): 4 approaches in priority order:
   - A: data-qa-qualifier attributes (stable across deploys)
   - B: ARIA listbox/radiogroup with size-related label
   - C: ZDS custom ul.size-selector-sizes
   - D: Content-based native select fallback
4. **extractProduct() merge** (extractor.ts ~line 870): prefers whichever source (JSON-LD vs DOM vs generic) found MORE comma-separated size tokens.

## Content script init flow (content.ts)

- `isLikelyProductPage()` checks: JSON-LD, og:type=product, itemprop=offers/price, Amazon /dp/ASIN+#productTitle
- Top-level vs iframe detection: `window.self !== window.top`
  - **Iframe**: 5s delay then silent extraction + ENRICH_PRODUCT, no button/UI
  - **Top-level**: DOMContentLoaded -> initWithRetry() + delayed MutationObserver (3s)
- MutationObserver delayed 3s to avoid React hydration replaceState being treated as navigation
- initWithRetry: init() + retries at 2s/5s/8s + tryRefreshRelatedProducts at 12s

## Amazon extractor improvements (Apr 13 2026)

Amazon detail sections changed. Now queries:
- Table format: #productDetails_techSpec_section_1, #productDetails_detailBullets_sections1, #productDetails_feature_div, #prodDetails (th/td pairs)
- Bullet list: #detailBullets_feature_div (bold span + sibling text)

## Known limitations

- Zara, Sephora, North Face, Zalando block server-side price checking - price_check_failed flag shown as subtle bottom band ("Visit page to refresh price")
- Extension-based price/specs update handles these when user visits the page
- Iframe refresh may be blocked by X-Frame-Options on some stores - graceful silent failure
- Add-by-URL fails for bot-protected sites - error message suggests using extension
- normalize-specs.ts exists in two places (extension + web app) - must be kept in sync manually
- Uncommon material/color terms won't translate - only ~80 most common mapped

## Supabase schema notes

- SharedComparison type uses `Omit<...Row, 'products'> & { products: SharedProduct[] }` to properly override JSONB
- comparison_groups FK to shared_comparisons is ON DELETE CASCADE
- products.specs is JSONB column (Record<string, string>)

**Domain:** comparecart.app - LIVE. Purchased on Porkbun, DNS on Porkbun pointing to Vercel. Resend verified. Supabase Auth Site URL updated. NEXT_PUBLIC_APP_URL set in Vercel.

**Chrome extension:** Published and approved on Chrome Web Store. ID: emfdbbbkcaheaakehmkicmapjcilpdoj. Version 0.1.1 submitted Apr 16 (fixed icon PNGs - were solid orange squares, now show cart design).

## Extension stores supported (Apr 16 2026)
Amazon, eBay, AliExpress, Etsy, Zalando, Zara, Sephora, The North Face, ASOS, H&M, IKEA, Uniqlo, Mango (added Apr 16)

## SIZE_VAL regex (Apr 16 2026)
Broadened to: `/^((\d?X{0,3}[SML])(\/[SML])?|\d{2,3}([\/-]\d{2,3})?|(EU|US|UK|IT|FR|DE)\s?\d{2,3})$/i`
Supports: S/M/L/XL, 2XL, 38, 36-38, 42/44, EU 38, US 6, UK 10

## Pages (Apr 14 2026)
- `/` - homepage
- `/dashboard` - authenticated, shows products + referral link
- `/compare` - authenticated, compare table
- `/explore`, `/stores`, `/deals`, `/store/[domain]` - public discovery
- `/c/[slug]` - public shared comparison
- `/help` - FAQ (static, collapsible)
- `/feedback` - feedback form (stores to Supabase `feedback` table)
- `/privacy`, `/login`, `/signup`

## Supabase tables (Apr 16 2026)
- `products` - saved products (images, price_alerts columns added vs original schema)
- `comparison_groups`, `comparison_items` - grouping
- `shared_comparisons` - public snapshots
- `user_preferences` - price_alerts toggle
- `feedback` - user feedback submissions
- `referrals` - referrer_id, referred_id, unique(referred_id)
- `price_history` - (product_url, price, currency, recorded_at) - snapshots on every price change. Written by cron + enrich-product via `src/lib/price-history.ts`. Index on (product_url, recorded_at DESC).

## Referral system
- Link: `https://comparecart.app/signup?ref=USER_ID`
- `/signup?ref=X` stores ref in localStorage
- On dashboard load, ReferralTracker client component records it in `referrals` table
- ReferralCard in dashboard shows link + count of friends who joined

## Logo
- SVG logo: two shopping carts facing each other with bidirectional arrows (terracotta #C4603C)
- `public/logo-icon.svg` - square version (favicon, extension icons, nav)
- `public/logo.svg` - same design
- `src/app/icon.svg` - Next.js favicon
- `src/app/apple-icon.png` - iOS home screen icon
- Extension icons: 16/32/48/128px PNGs generated from SVG
- Logo icon shown next to "CompareCart" text in all nav headers

## Compare table specs behavior
- Default visible: Brand, Color, Material, Composition, Size, Fit (priority order, only if present)
- Everything else collapsed under "Show X more details"
- Garbage spec values filtered: length > 200 chars, or contains JS code patterns

## Changes Apr 16 2026
- **Session lifetime**: proxy.ts now sets cookie maxAge 90 days. Extension signOut uses `scope: 'local'` to avoid revoking web app session.
- **Extension icons**: Regenerated PNGs from SVG (were solid orange, now show cart design). Version bumped to 0.1.1, submitted to Web Store.
- **Zara sizes**: Fixed - content-based ul>li detection (Approach D), broadened SIZE_VAL regex.
- **New stores**: IKEA, Uniqlo, Mango extractors added to extension.
- **Price history**: `price_history` table + `src/lib/price-history.ts` helper. SVG sparkline in Compare table (`src/components/PriceSparkline.tsx`).
- **Viral loop**: Public comparison CTA (`PublicCompareTable.tsx`) now has direct "Add to Chrome" button to Web Store.
- **Onboarding tour**: Built then removed - was showing every visit, too disruptive.
- **Privacy policy URL**: Updated in Chrome Web Store to comparecart.app/privacy (was old Vercel URL).

## Changes Apr 17 2026
- **Signup: existing user detection**: `signup/page.tsx` now checks `data.user?.identities?.length === 0` after `signUp()`. Supabase returns no error for existing users (email enumeration prevention) but identities is empty - previously always showed "Check your email". Now shows "account already exists" inline error.
- **Auth callback route**: Added `src/app/auth/callback/route.ts` - standard Supabase code exchange pattern. `emailRedirectTo` in signup now points to `/auth/callback?next=/dashboard` instead of directly to `/dashboard`.
- **SignOutButton scope**: Changed to `signOut({ scope: 'local' })` so web app sign-out doesn't revoke the refresh token server-side. Previously used global scope which killed all sessions including extension.
- **Auto-logout investigation**: Daily logouts likely caused by Supabase Refresh Token Expiry being too short (default could be 1 day). Need to check Supabase dashboard Auth > Configuration > Refresh Token Expiry and increase to 7-30 days. Also check Refresh Token Rotation - if ON with no reuse interval, extension session sharing could invalidate web app's refresh token.

## Supabase Auth settings (Apr 17 2026)
- **Refresh token rotation/revocation**: Turned OFF ("Detect and revoke potentially compromised refresh tokens"). Was causing daily logouts - extension's stale tokens were triggering full session revocation for the web app. Free tier default was ON with 10s reuse interval.
- **Inactivity timeout / Time-box sessions**: Both 0 (never) - Pro-only to change, not needed.
- **Confirm email**: ON (required - explains why existing user signup fix needed identities check)
- **Refresh token expiry**: Not exposed on free tier, defaults to 1 week (fine).

## Changes Apr 17 2026 (continued)

### Mobile PWA
- **Web app manifest**: `public/manifest.json` with share_target pointing to `/api/share-target`. Icons at `/logo-icon-192.png` and `/logo-icon-512.png`.
- **Service worker**: `public/sw.js` (minimal, network-first). Registered via `src/components/ServiceWorkerRegistration.tsx` in root layout.
- **Share Target API**: `src/app/api/share-target/route.ts` - handles Android/iOS share sheet. Extracts product from shared URL, saves to Supabase, redirects to `/dashboard?share=success|duplicate|error&reason=...`.
- **ShareToast**: `src/components/ShareToast.tsx` - client component in dashboard layout, reads `?share=` params and shows toast notification. Added inside `<Suspense>`.
- **InstallPrompt**: `src/components/InstallPrompt.tsx` - shows "Add to Home Screen" banner. Uses `beforeinstallprompt` (Android) and manual instructions (iOS Safari). Session-dismissed.
- **AddByUrlForm**: Now full-width on mobile (`w-full sm:w-64`).
- layout.tsx: Added manifest link, theme-color, apple-touch meta tags.

### AI Auto-Extraction
- **store_extractors Supabase table**: SQL in `docs/schema_store_extractors.sql`. Columns: domain (PK), selectors (JSONB), sample_url, success_count, fail_count, status (active/stale/disabled). Public read RLS.
- **`/api/generate-extractor`**: Receives `{ domain, url, html }` from extension. Checks cache first. Calls Claude Haiku (claude-haiku-4-5) with simplified HTML to generate CSS selector rules. Validates with Cheerio (name/price/image checks). Retries once on failure. Upserts to `store_extractors`. Requires `ANTHROPIC_API_KEY` env var.
- **`/api/report-extractor`**: Increments success/fail counts per domain. Sets `status = 'stale'` when fail_count >= 10 AND > 2x success_count. Stale rules trigger regeneration on next visit.
- **`StoreSelectorRules` interface** (shared between web and extension): `{ product_name, price, currency, image, specs[] }` with selector/method/regex fields.
- **Extension `extractor.ts`**: Added `extractWithRules(rules)` (applies cached selectors to live DOM), `simplifyHtml()` (strips noise, truncates to 20KB for API), both exported.
- **Extension `content.ts`**: Added `cachedAiRules` module variable, `applyAiRules(product)` (merges AI data without overwriting good existing data), `prefetchAiRules()` (called at 5s in initWithRetry - fetches cached rules or triggers generation for incomplete extractions). `REPORT_EXTRACTION_RESULT` sent from `tryUpdateSavedPrice` when AI rules were used.
- **Extension `background.ts`**: New handlers: `GET_STORE_RULES` (local cache with 24h TTL in chrome.storage.local), `REQUEST_EXTRACTOR_GENERATION` (calls `/api/generate-extractor`, caches result), `REPORT_EXTRACTION_RESULT` (calls `/api/report-extractor`).
- `@anthropic-ai/sdk` added to web app dependencies.

### To activate AI extraction
Run SQL in Supabase dashboard: `docs/schema_store_extractors.sql`
Add `ANTHROPIC_API_KEY` to Vercel env vars and `.env.local`.

## Changes Apr 19 2026

### Post-launch fixes (shoes testing)
- **Dutch spec labels**: `normalize-specs.ts` (both copies) extended with Dutch shoe terms (bovenmateriaal -> Material, binnenzool/dekzool/buitenzool -> Sole, binnenmateriaal -> Lining). Substring map additions: `zool`, `materiaal`, `voering`.
- **Render-time normalization**: `CompareTable.tsx` and `PublicCompareTable.tsx` apply `normalizeSpecs()` at render time so existing stored data with foreign keys displays correctly without DB migration.
- **Category-aware spec display**: `CompareTable.tsx` + `PublicCompareTable.tsx` now auto-detect category (shoes/clothing/electronics/beauty/home/default) from spec keys + product names. Priority spec ordering per category (CATEGORY_SPECS map + detectCategory() function).
- **AI spec translations**: `StoreSelectorRules` extended with `category`, `detected_currency`, `spec_translations` fields. AI extractor (`/api/generate-extractor`) now returns these. Extension `content.ts` applies them via `applySpecTranslations()`. `store_extractors` table needs 3 new columns (SQL: `alter table store_extractors add column if not exists category text, add column if not exists spec_translations jsonb default '{}', add column if not exists detected_currency text`).
- **Converse EUR fix**: Converse extractor reads DOM price text first (parsePrice detects € symbol). Returns null if no non-USD symbol found, letting chain fall through to aiDetectedCurrency. Meta tags on converse.com always say USD regardless of region.
- **Amazon INR fix**: Amazon extractor currency IIFE with full regional TLD map. `parsePrice()` now detects INR (₹), JPY (¥), KRW (₩), TRY (₺), PLN (zł), CHF.
- **Price history RLS**: `price_history` table needed SELECT policy. SQL to run: `create policy "Authenticated users can read price history" on price_history for select to authenticated using (true);` - user must run this in Supabase SQL Editor.
- **Email alerts**: Product names in price alert emails now link directly to store product URL. "View on [store]" link added per product row.
- **PriceSparkline**: Responsive SVG with viewBox + percentage width (max-w-[140px]). vectorEffect="non-scaling-stroke". Price labels as HTML flex row below chart (start left, current right, colored by trend). N prices tracked text. Dots with tooltip.

### UI improvements
- **Delete button**: Redesigned from white/bordered to `bg-black/60 text-white hover:bg-red-500` - dark pill that turns red on hover.
- **ProductDetailPanel**: New left slide-over panel (`src/components/ProductDetailPanel.tsx`). Opens when clicking a product card. Shows: image carousel, store favicon+name, product name, price with trend indicator, price history sparkline, Buy button (affiliate URL), all specs (normalized), notes textarea (auto-save on blur), alert toggle, delete with confirm. Closes on Escape or backdrop click.
- **ProductCard**: Click now opens detail panel (not toggle select). Checkbox in top-right still toggles selection (stopPropagation). New `onOpenDetail` prop added.
- **ProductGrid**: Manages `detailProductId` state. Passes `onOpenDetail` to ProductCard. Renders ProductDetailPanel when active. `handleNotesUpdated` syncs notes back to items state.

### Extension: carousel/listing save
- **contextMenus permission** added to `manifest.json`. Web Store justification: "The context menu allows users to right-click any product link or page to save it directly to their CompareCart collection without navigating away from the page."
- **Right-click "Save to CompareCart"**: context menu on page + link contexts. For current page: sends CONTEXT_MENU_SAVE to content script. For linked URLs: tries `/api/save-from-url` server-side first; on failure (bot protection) falls back to hidden iframe (SAVE_VIA_IFRAME). Toast shown via SHOW_TOAST message to content script (no scripting permission needed).
- **Mini "+" save buttons**: injected on listing/carousel pages. Per-domain LISTING_CONFIGS (Amazon, Zalando, ASOS, Zara, Converse, Dr. Martens) + generic fallback with ancestor de-duplication. Converse: `div:has(> a[href*="/shop/p/"] picture)` - direct-child + picture required to avoid matching color swatch links. Button bottom-left, 26px, semi-transparent until hover. MutationObserver re-injects on infinite scroll.
- **Bot-protected stores fallback**: SAVE_FROM_LISTING / right-click on link → if server fetch fails, opens hidden iframe to product URL. Content script inside iframe listens for CC_AUTOSAVE postMessage, extracts after 4s and calls SAVE_PRODUCT.
- **SAVE_FROM_LISTING** message handler in `background.ts` calls `/api/save-from-url`.
- **`/api/save-from-url`** endpoint: validates + normalizes URL, checks for duplicate (respects soft-delete), fetches page server-side, extracts product, inserts.

### Soft-delete (Apr 20 2026)
- Products are never hard-deleted. Delete sets `deleted_at` timestamp instead.
- All SELECT queries filter `.is('deleted_at', null)`.
- Re-adding a previously deleted URL restores the row (same id, same price_history).
- Extension background.ts direct Supabase queries also filter deleted_at.
- Supabase: `ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;` (already run).
- Duplicate checks now check `deleted_at` - if null it's active (duplicate), if set it restores the row.

### Extension v0.1.3 (Apr 20 2026)
- Removed `chrome.scripting` usage entirely - replaced with `SHOW_TOAST` message type sent via `chrome.tabs.sendMessage`. Content script handles it with existing `showToast()`. No scripting permission needed.
- Permissions: `storage`, `contextMenus` only.
- Web Store URLs corrected: homepage `https://comparecart.app`, support `https://comparecart.app/privacy`.
- ZIP: `comparecart-extension-0.1.3.zip` (159KB) at repo root.

## Supabase: pending SQL
Run in Supabase SQL Editor:
```sql
-- Price history RLS (required for sparklines to show)
create policy "Authenticated users can read price history"
  on price_history for select to authenticated using (true);

-- AI extractor new columns
alter table store_extractors
  add column if not exists category text,
  add column if not exists spec_translations jsonb default '{}',
  add column if not exists detected_currency text;
```
