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
- Resend for email (RESEND_API_KEY in .env.local). Using onboarding@resend.dev until domain bought.
- Chrome Extension Manifest V3 + esbuild build
- Deployed at https://shopping-compare.vercel.app (Vercel Hobby - cron once/day max, 0 6 * * *)

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
- `src/app/api/check-prices/route.ts` - Daily cron: price check + specs backfill + email notifications
- `src/app/sitemap.ts` - Dynamic sitemap
- `src/components/CompareShell.tsx` - Client wrapper owning activeCount state for live sidebar sync
- `src/components/CompareTable.tsx` - Private compare table with add-more ghost column, save-as-group, specs display
- `src/components/PublicCompareTable.tsx` - Public table with CTA, affiliate links
- `src/components/GroupList.tsx` - Sidebar with checkboxes, batch actions (compare/share/unshare/delete)
- `src/components/ProductGrid.tsx` - Dashboard grid with sticky bulk action bar
- `src/components/PublicLayout.tsx` - Layout for public pages (explore, stores, deals)
- `src/components/ExtensionAuthBridge.tsx` - Posts Supabase tokens to extension via postMessage (retries at 500ms, 1.5s, 4s)
- `src/lib/normalize-specs.ts` - Key normalization (60+ multilingual mappings) + value translation (80+ terms)
- `src/lib/extract-product.ts` - Server-side extraction: JSON-LD + Cheerio store-specific extractors
- `src/lib/supabase/types.ts` - SharedProduct, SharedComparison (uses Omit pattern for products override)
- `src/proxy.ts` - Auth redirects only (logged-in users on /login or /signup go to /dashboard)

**Key files - Extension:**
- `src/extractor.ts` - All 10 store extractors + JSON-LD + OG + generic DOM price + specs extraction
- `src/content.ts` - Save button injection, tryUpdateSavedPrice, tryUpdateRelatedProducts (fetches same-store products)
- `src/background.ts` - Supabase client, SAVE_PRODUCT, UPDATE_PRICE_IF_SAVED, GET_PRODUCTS_BY_DOMAIN, UPDATE_SPECS_FOR_URL, SHARE_SESSION
- `src/normalize-specs.ts` - Identical copy of web app's normalize-specs.ts (keep in sync!)
- `src/popup.ts` - Sign in/out, auth status display
- `build.mjs` - esbuild, auto-reads ../shopping-compare/.env.local for credentials
- `manifest.json` - run_at: document_start (for auth bridge timing)

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
- Extension fetches OTHER saved products from same store (up to 5 with empty specs) using browser cookies
- Rich specs extraction from JSON-LD + 10 store-specific DOM extractors
- Multilingual spec normalization: keys (ES/FR/DE/NL/IT to English) + values (materials/colors translated)
- Spec display: coverage threshold filter, priority ordering (Brand/Color/Material first), collapsible "Show more"
- Public pages: /explore, /stores, /store/[domain], /deals, /c/[slug], /privacy
- Buy Me a Coffee integration in all nav headers (buymeacoffee.com/joangm)
- Navigation: logo always goes to public homepage (/), not dashboard

## Spec extraction architecture

**Extension flow:** JSON-LD specs (any site) merged with store-specific DOM specs, normalized via normalizeSpecs()
**Server-side flow:** Same but using Cheerio instead of DOM APIs
**Cron backfill:** check-prices extracts specs from fetched HTML, updates products with empty specs
**Extension revisit:** tryUpdateSavedPrice sends specs; tryUpdateRelatedProducts fetches up to 5 same-store products
**Normalization:** KEY_MAP (exact) -> KEY_SUBSTRING_MAP (contains) -> title-case fallback. VALUE_MAP translates materials/colors.
**Display:** Coverage threshold (2+ for small groups, 30% for 7+), priority sort, collapsible toggle

## Known limitations

- Zara, Sephora, North Face, Zalando block server-side price checking - price_check_failed flag shown
- Extension-based price/specs update handles these when user visits the page (or ANY page from that store)
- Add-by-URL fails for bot-protected sites - error message suggests using extension
- normalize-specs.ts exists in two places (extension + web app) - must be kept in sync manually
- Uncommon material/color terms won't translate - only ~80 most common mapped

## Supabase schema notes

- SharedComparison type uses `Omit<...Row, 'products'> & { products: SharedProduct[] }` to properly override JSONB
- comparison_groups FK to shared_comparisons is ON DELETE CASCADE
- products.specs is JSONB column (Record<string, string>)

**Domain:** comparecart.app available on Porkbun ($10.81/yr). Buy after Google Chrome extension approval. Then update Resend from address to alerts@comparecart.app.

**Pending: Google Chrome Web Store submission** (waiting on approval before buying domain)
