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

**Chrome extension:** Published and approved on Chrome Web Store. ID: emfdbbbkcaheaakehmkicmapjcilpdoj

## Pages (Apr 14 2026)
- `/` - homepage
- `/dashboard` - authenticated, shows products + referral link
- `/compare` - authenticated, compare table
- `/explore`, `/stores`, `/deals`, `/store/[domain]` - public discovery
- `/c/[slug]` - public shared comparison
- `/help` - FAQ (static, collapsible)
- `/feedback` - feedback form (stores to Supabase `feedback` table)
- `/privacy`, `/login`, `/signup`

## Supabase tables (Apr 14 2026)
- `products` - saved products (images, price_alerts columns added vs original schema)
- `comparison_groups`, `comparison_items` - grouping
- `shared_comparisons` - public snapshots
- `user_preferences` - price_alerts toggle
- `feedback` - user feedback submissions
- `referrals` - referrer_id, referred_id, unique(referred_id)

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

## Open issues to verify (Apr 13 2026)

- **Zara sizes**: Multiple fixes applied (4-approach extractor + bestSizeForUrl tracker + mergeSpecsSafe). User reported "still wrong" multiple times before the tracker fix. Needs real-world verification on Zara product pages after latest changes.
- **Iframe refresh**: New implementation untested by user yet. Need to verify iframes actually load and extract data on real stores (Zara, Amazon, etc.). Some stores may block via X-Frame-Options - need to check which.
- **Amazon metadata**: Fixed selectors for #detailBullets_feature_div and #productDetails_feature_div. User confirmed button appeared but metadata capture needs verification (was showing empty Brand/Color/Size for Amazon products before fix).
