---
name: AIToolCrunch project state
description: Full context for the aitoolcrunch.com affiliate site project — architecture, status, next steps, workflow, and open tasks
type: project
---

## What this project is

An affiliate comparison website for AI tools at **aitoolcrunch.com**. Revenue model: affiliate commissions (20-45% recurring) when users sign up for AI tools via links on the site. The site compares tools across 6 categories: AI Writing, AI Image, AI Code, AI Video, AI Audio, AI Automation.

**Why:** Joan wants a passive income project that Claude can mostly build and maintain, with low/zero running costs.

## Key URLs and accounts

- **Live site:** https://aitoolcrunch.com
- **Netlify (hosting):** ai-tools-hub-joan.netlify.app (project name: ai-tools-hub-joan)
- **GitHub repo:** https://github.com/JoanGoMu/ai-tools-hub (private)
- **Domain registrar:** Porkbun (aitoolcrunch.com, ~$11/year)
- **Google Search Console:** verified, sitemap submitted at https://aitoolcrunch.com/sitemap.xml
- **Local project path:** `/Users/joan.mussone/Desktop/Projects/AI Tools Hub/ai-tools-hub` (note the space in "AI Tools Hub")

## Tech stack

- **Next.js 14** (static export, `output: 'export'`) + TypeScript + Tailwind CSS
- **Data store:** JSON files in `data/` (no database)
- **Hosting:** Netlify free tier (auto-deploys on push to main)
- **Automation:** GitHub Actions cron (daily 6am UTC) — scrapes Product Hunt + RSS feeds
- **Node.js:** installed via Homebrew at `/opt/homebrew/opt/node@20/bin/` (must use `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` in terminal)

## Current site content (as of April 19, 2026)

**39+ tools across 6 categories (all have bestFor, keyStrength, scores fields). Bot adds new tools daily from PH RSS.**
- AI Writing: jasper, copy-ai, writesonic, rytr, claude, chatgpt, gemini, perplexity, generateppt, notebooklm
- AI Image: midjourney, dall-e, leonardo-ai, ideogram, apimage (+ chatgpt cross-listed)
- AI Code: github-copilot, cursor, tabnine, goose, mercury-edit, codictate, openclaw (+ claude, chatgpt, gemini cross-listed)
- AI Video: runway, synthesia, heygen, pika, slide2video, google-vids, pixverse
- AI Audio: elevenlabs, descript, murf-ai, voiceos, fluently
- AI Automation: make, n8n, gumloop (+ openclaw cross-listed)

**169+ comparison pages** - full intra-category coverage for all active tools (affiliate filter removed Apr 19). Comparisons getting editorial body content: 5 enriched per daily bot run (~34 days to cover all).

**6 categories:** ai-writing, ai-image, ai-code, ai-video, ai-audio, ai-automation (nav tab added Apr 19)

**43+ blog posts** (as of April 19, 2026). All AIToolCrunch-authored posts rewritten with rich HTML. Bot generates 2 new posts/day.

**SEO status (Apr 20):** 4/295 pages indexed. Sitemap fixed and resubmitted to GSC on Apr 20 at https://www.aitoolcrunch.com/sitemap.xml (295 URLs, www. + trailing slashes). Root cause of "Redirect error" in GSC: site is on Vercel (not Netlify), and Porkbun was doing a temporary 302 via l.ink intermediary. Fixed by: (1) changing SITE_URL to www.aitoolcrunch.com, (2) adding trailing slashes to all sitemap URLs, (3) user updated Porkbun to 301 direct to www. Weekly index report workflow reports new URLs every Sunday - check Actions > "Weekly Index Report" > Summary tab.

## Affiliate programs — full status (as of April 16, 2026)

### Active (4) - links live on site
| Tool | Commission | Affiliate URL |
|------|-----------|--------------|
| ElevenLabs | 22% recurring | https://try.elevenlabs.io/vxfn4lqln9sn |
| HeyGen | 35% first 3 months | https://www.heygen.com/?sid=rewardful&via=joan-gomez-mussone |
| Synthesia | 20% recurring | https://www.synthesia.io/?via=joan |
| Murf AI | 30% recurring | https://get.murf.ai/34eyx2rd5e73 |

### Pending application (2)
| Tool | Commission | Apply at |
|------|-----------|---------|
| Jasper | 30% recurring | app.impact.com - search Jasper |
| Writesonic | 30% recurring | writesonic.com/affiliates |

### Closed / not available
| Tool | Notes |
|------|-------|
| Copy.ai | Program discontinued - confirmed April 2026. Do not apply. |
| ChatGPT / OpenAI | No affiliate program |
| Claude / Anthropic | No affiliate program |
| Gemini / Google | No affiliate program |
| NotebookLM | Google product, no affiliate |
| Google Vids | Google product, no affiliate |
| GitHub Copilot | Microsoft, no affiliate |
| Goose | Open source (Block), no affiliate |
| OpenClaw | Open source, no affiliate |
| Midjourney | No public affiliate program (never launched one) |

### Can apply next (confirmed programs exist)
| Tool | Est. Commission | Apply at |
|------|----------------|---------|
| Rytr | ~30% recurring | rytr.me/affiliates |
| Cursor | ~20% recurring | cursor.com/affiliate |
| Descript | ~15% recurring | descript.com/affiliate |
| Runway | ~20% recurring | runwayml.com/affiliates |
| Leonardo AI | ~15-20% | leonardo.ai (account settings) |
| Make | ~20% recurring | make.com/referral-program |

### Worth checking manually (unclear status)
Perplexity, Tabnine (enterprise partner program), Pika, Ideogram, n8n (credits not cash), Gumloop

## When an affiliate is approved

1. Update `data/affiliate-links.json`: set `"status": "active"` and add the real affiliate URL
2. `git add data/affiliate-links.json && git commit -m "add: ToolName affiliate link" && git push`
3. Netlify rebuilds - site-wide CTAs and tool pages update automatically

## Key file structure

```
data/
  tools/*.json               — one file per tool (37 files, all have bestFor/keyStrength/scores)
  categories.json            — 6 categories
  comparisons.json           — 169 comparison definitions (body field being backfilled 5/day)
  deals.json                 — empty (no deals yet)
  affiliate-links.json       — affiliate URLs and statuses
  blog/*.json                — 41 blog post files
  blog-ideas.json            — populated daily by GitHub Actions scraper
  blog-published-urls.json   — tracks source URLs already turned into posts (dedup)
  tool-generated-urls.json   — tracks PH RSS URLs already processed for tools (dedup)
  rss-feed-items.json        — AI news from RSS feeds, updated daily
  bot-log.txt                — permanent append-only log of all bot activity (newest first)
  bot-log-latest.txt         — current run only, used for commit message body
  indexed-urls.txt           — sorted list of all sitemap URLs seen by weekly index workflow

src/
  app/page.tsx                    — homepage
  app/tools/[slug]/page.tsx       — tool detail pages (description paragraphs, bestFor/keyStrength cards, score bars)
  app/category/[slug]/page.tsx    — category pages
  app/compare/[slug]/page.tsx     — comparison pages (renders body field as rich prose HTML)
  app/blog/[slug]/page.tsx        — blog post pages (full prose HTML via dangerouslySetInnerHTML)
  app/deals/page.tsx              — deals page
  app/sitemap.ts                  — auto-generated sitemap (264 URLs)
  lib/types.ts                    — TypeScript interfaces (Comparison now has body?: string)
  lib/data.ts                     — data loading functions
  lib/constants.ts                — NAV_LINKS (includes ai-automation tab)
  lib/affiliates.ts               — affiliate link resolution
  lib/seo.ts                      — metadata + Google verification

scripts/
  scrapers/rss-feeds.ts                    — scrapes TechCrunch/VentureBeat/PH RSS
  scrapers/blog-ideas.ts                   — scrapes HN/Reddit/tech news for blog ideas
  generators/generate-comparisons.ts       — auto-generates comparison entries (all active tools, alphabetical slugs)
  generators/generate-blog-posts.ts        — daily: picks 2 ideas, writes rich HTML posts, enriches 5 comparisons
  generators/generate-tools.ts             — daily: generates new tool pages from PH RSS items
  generators/enrich-existing.ts            — one-shot: rewrite old posts + populate tool fields
  generators/retry-failed-posts.ts         — one-shot: retry posts that failed JSON parsing

.github/workflows/scrape-tools.yml  — daily cron at 6am UTC
.github/workflows/weekly-index.yml  — weekly cron Sundays 8am UTC, reports new sitemap URLs for GSC
```

## Daily bot workflow (GitHub Actions, 6am UTC)

1. RSS feed scraper → rss-feed-items.json
2. Comparison generator → comparisons.json (new tools get comparison pages)
3. Blog ideas scraper → blog-ideas.json
4. Tool generator → data/tools/*.json (new tools from PH RSS, status: active)
5. Blog post generator → data/blog/*.json (2 posts) + enriches 5 comparisons with body content
6. Commit with detailed message listing all new URLs → push → Netlify auto-deploys

Bot log: data/bot-log.txt (permanent, newest first) | data/bot-log-latest.txt (current run only)

## Tool JSON schema (for adding new tools)

```json
{
  "slug": "tool-name",
  "name": "Tool Name",
  "tagline": "One line description",
  "description": "2-3 paragraph description",
  "category": ["ai-writing"],
  "url": "https://tool.com/",
  "affiliateUrl": null,
  "affiliateProgram": {
    "network": "partnerstack",
    "commissionType": "recurring",
    "commissionRate": "30%",
    "cookieDuration": "90 days"
  },
  "pricing": {
    "hasFree": true,
    "startingPrice": "$20/mo",
    "plans": [
      { "name": "Free", "price": "$0", "billingCycle": "forever", "features": ["..."] },
      { "name": "Pro", "price": "$20/mo", "billingCycle": "monthly", "features": ["..."] }
    ]
  },
  "features": ["Feature 1", "Feature 2"],
  "pros": ["Pro 1", "Pro 2"],
  "cons": ["Con 1", "Con 2"],
  "rating": 4.5,
  "logoUrl": "/images/tools/tool-name.png",
  "screenshotUrl": null,
  "lastUpdated": "2026-04-16",
  "source": "manual",
  "status": "active",
  "featured": false
}
```

## Comparison JSON schema

Add entries to `data/comparisons.json`:
```json
{
  "slug": "tool-a-vs-tool-b",
  "toolA": "tool-a-slug",
  "toolB": "tool-b-slug",
  "title": "Tool A vs Tool B: Which is Better in 2026?",
  "verdict": "Summary of which wins and why.",
  "winner": "tool-a-slug"
}
```

**Slug rule:** always alphabetical - the tool whose name comes first alphabetically goes on the left. `toolA` and `toolB` must match the slug order.

## Blog post JSON schema

Files in `data/blog/slug.json`:
```json
{
  "slug": "post-slug",
  "title": "Post Title",
  "excerpt": "1-2 sentence summary.",
  "author": "AIToolCrunch",
  "publishedAt": "2026-04-16",
  "tags": ["ai-code", "ai-trends"],
  "status": "published",
  "featured": true,
  "coverImage": "https://images.unsplash.com/photo-XXXX?w=1200&q=80",
  "content": "<p>HTML content</p>"
}
```

**Cover image rule:** every post must have a unique Unsplash photo ID. Check for duplicates with: `grep -h '"coverImage"' data/blog/*.json | sort | uniq -d`

## How to deploy changes

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd "/Users/joan.mussone/Desktop/Projects/AI Tools Hub/ai-tools-hub"
npm run build   # verify before pushing
git add .
git commit -m "description"
git push
# Netlify auto-deploys in ~1 min
```

## GitHub Actions scraper

- Runs daily at **6am UTC** (8am Spain time)
- Writes to `data/blog-ideas.json` and `data/rss-feed-items.json`
- Auto-commits if there are changes
- After it runs, do `git pull` to see fresh ideas
- To trigger manually: GitHub repo → Actions → "Daily Tool Scraper" → "Run workflow"

## Current open tasks / next steps

**Revenue (immediate):**
1. Apply for Jasper affiliate (app.impact.com - 30% recurring)
2. Apply for Writesonic affiliate (writesonic.com/affiliates - 30% recurring)
3. Apply for Rytr affiliate (rytr.me/affiliates - next wave)
4. Apply for Cursor affiliate (cursor.com/affiliate - next wave, high traffic)
5. When any affiliate approved: update data/affiliate-links.json status + URL, push

**SEO / Growth:**
6. Set up Google Analytics 4 (still not done - can't measure traffic)
7. Share on Reddit: r/artificial, r/SideProject, r/MachineLearning
8. Submit to directories: Product Hunt, IndieHackers, BetaList
9. Google Search Console: sitemap resubmitted Apr 20 (https://www.aitoolcrunch.com/sitemap.xml, 295 URLs). Redirect errors fixed. Pages should index organically over coming weeks.
10. Consider adding internal links from homepage/category pages to boost crawl priority

**Automation (all running):**
- Blog: 2 posts/day auto-generated with rich HTML, external links, varied structure
- Tools: new tools from Product Hunt RSS auto-published daily
- Comparisons: all pairs auto-generated; body content enriched 5/day (~34 days to cover all 169)
- Bot log: data/bot-log.txt shows all activity

**Content quality (done Apr 19):**
- All 24 auto blog posts rewritten with rich HTML
- All 37 tools now have bestFor, keyStrength, easeOfUse, learningCurve scores
- Tool pages render description as paragraphs + callout cards + score bars
- Comparison pages render editorial body content between verdict and pros/cons

## Known issues / decisions

- Cloudflare Pages failed (their UI routes Next.js 14 through OpenNext which requires 15+). Use Netlify only.
- Node.js installed via Homebrew at `/opt/homebrew/opt/node@20/bin/` - always export PATH
- `scripts/` directory excluded from tsconfig to avoid build errors
- RSS scraper had a hanging issue - fixed with 15s per-feed timeout wrapper
- Copy.ai affiliate program was confirmed closed/discontinued April 2026
- Claude Haiku sometimes returns markdown fences (```html, ```json) or a full JSON blob instead of raw HTML, even when instructed not to. Fixed in generate-blog-posts.ts and retry-failed-posts.ts via `extractHtmlContent()` which strips fences and extracts the `content` key if the response is JSON. Always apply this to any new script that requests raw HTML from the API.
- Em dashes in titles/excerpts: `cleanContent()` must be applied to ALL text fields (title, excerpt, content), not just content. `validatePost()` in generate-blog-posts.ts now does this.

## Joan's preferences

- Wants low maintenance ("self-maintained")
- Comfortable with Claude doing the writing work - just needs to review
- Wants to understand before automating (do automation in phases)
- Budget-conscious - prefers free tiers
- Made the GitHub repo private (concern about others copying)
