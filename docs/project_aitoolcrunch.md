---
name: AIToolCrunch project state
description: Full context for the aitoolcrunch.com affiliate site project — architecture, status, next steps, workflow, and open tasks
type: project
---

## What this project is

An affiliate comparison website for AI tools at **aitoolcrunch.com**. Revenue model: affiliate commissions (20-45% recurring) when users sign up for AI tools via links on the site. The site compares tools across 5 categories: AI Writing, AI Image, AI Code, AI Video, AI Audio.

**Why:** Joan wants a passive income project that Claude can mostly build and maintain, with low/zero running costs.

## Key URLs and accounts

- **Live site:** https://aitoolcrunch.com
- **Netlify (hosting):** ai-tools-hub-joan.netlify.app (project name: ai-tools-hub-joan)
- **GitHub repo:** https://github.com/JoanGoMu/ai-tools-hub (private)
- **Domain registrar:** Porkbun (aitoolcrunch.com, ~$11/year)
- **Google Search Console:** verified, sitemap submitted at https://aitoolcrunch.com/sitemap.xml
- **Local project path:** `/Users/joan.mussone/Desktop/Projects/AI Tools Hub/ai-tools-hub` (note the space in the parent folder name)

## Tech stack

- **Next.js 14** (static export, `output: 'export'`) + TypeScript + Tailwind CSS
- **Data store:** JSON files in `data/` (no database)
- **Hosting:** Netlify free tier (auto-deploys on push to main)
- **Automation:** GitHub Actions cron (daily 6am UTC) — scrapes Product Hunt + RSS feeds
- **Node.js:** installed via Homebrew at `/opt/homebrew/opt/node@20/bin/` (must use `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` in terminal)

## Current site content (as of April 13, 2026)

**30 tools across 6 categories:**
- AI Writing: jasper, copy-ai, writesonic, rytr, claude, chatgpt, gemini, perplexity, generateppt, notebooklm
- AI Image: midjourney, dall-e, leonardo-ai, ideogram, apimage
- AI Code: github-copilot, cursor, tabnine, goose, mercury-edit, codictate, openclaw
- AI Video: runway, synthesia, heygen, pika, slide2video, google-vids, pixverse
- AI Audio: elevenlabs, descript, murf-ai, voiceos, fluently
- AI Automation: make, n8n, gumloop

**74 comparison pages** (8 added April 13, 2026: codictate-vs-cursor, codictate-vs-github-copilot, codictate-vs-goose, codictate-vs-mercury-edit, codictate-vs-openclaw, codictate-vs-tabnine, claude-vs-goose, goose-vs-tabnine)

**6 categories:** ai-writing, ai-image, ai-code, ai-video, ai-audio, ai-automation

**24 blog posts** (7 added April 10-13, 2026 with author "AIToolCrunch"):
- anthropic-blocks-openclaw-claude-subscriptions (Apr 10)
- claude-code-caveman-skill-saves-tokens (Apr 10)
- anthropic-project-glasswing-security-initiative (Apr 11)
- claude-managed-agents-what-you-need-to-know (Apr 11)
- microsoft-copilot-naming-confusion (Apr 12)
- running-gemma-4-locally-lm-studio-claude-code (Apr 12)
- taste-in-the-age-of-ai (Apr 13)

**Note on blog author:** New posts use "AIToolCrunch" as the author, not fake individual names. Older posts still have individual names (alex-chen, sara-morales, etc.) - those have not been backfilled.

## Key file structure

```
data/
  tools/*.json          — one file per tool (18 files)
  categories.json       — 5 categories
  comparisons.json      — 7 comparison page definitions
  deals.json            — empty (no deals yet)
  affiliate-links.json  — affiliate URLs (all "pending" — not yet enrolled)
  scraped-suggestions.json  — auto-created by GitHub Actions scraper
  rss-feed-items.json       — auto-created by GitHub Actions scraper

src/
  app/page.tsx                    — homepage
  app/tools/[slug]/page.tsx       — tool detail pages
  app/category/[slug]/page.tsx    — category pages
  app/compare/[slug]/page.tsx     — comparison pages
  app/deals/page.tsx              — deals page
  app/sitemap.ts                  — auto-generated sitemap
  lib/types.ts                    — TypeScript interfaces
  lib/data.ts                     — data loading functions
  lib/affiliates.ts               — affiliate link resolution
  lib/seo.ts                      — metadata + Google verification

scripts/
  scrapers/product-hunt.ts    — scrapes PH for new AI tools
  scrapers/rss-feeds.ts       — scrapes TechCrunch/VentureBeat/PH RSS
  generators/generate-comparisons.ts  — auto-generates comparison entries

.github/workflows/scrape-tools.yml  — daily cron at 6am UTC
```

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
  "lastUpdated": "2026-04-04",
  "source": "manual",
  "status": "active",
  "featured": false
}
```

## Comparison JSON schema (for adding new comparisons)

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

## Affiliate programs (priority order to apply)

All currently `"status": "pending"` in `data/affiliate-links.json`. When approved, change to `"status": "active"` and add the real affiliate URL, then push.

| Tool | Commission | Network | Apply at |
|------|-----------|---------|----------|
| Copy.ai | 45% first year, 20% lifetime | PartnerStack | partners.copy.ai |
| Writesonic | 30% lifetime recurring | Direct | writesonic.com/affiliates |
| ElevenLabs | 22% recurring | Direct | elevenlabs.io/affiliates |
| Jasper | 30% recurring 1yr | Impact | app.impact.com |
| Synthesia | 20% recurring | PartnerStack | synthesia.partnerstack.com |

## How to deploy changes

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd /Users/joan.mussone/Desktop/Projects/ai-tools-hub
git add .
git commit -m "description"
git push
# Netlify auto-deploys in ~1 min
```

## How to add a new tool

1. Create `data/tools/slug-name.json` using the schema above
2. `git add . && git commit -m "add: ToolName" && git push`
3. Done — page appears at aitoolcrunch.com/tools/slug-name

## How to add a new comparison

1. Add entry to `data/comparisons.json`
2. Push — page appears at aitoolcrunch.com/compare/tool-a-vs-tool-b

## GitHub Actions scraper

- Runs daily at **6am UTC** (8am Spain time)
- Writes to `data/scraped-suggestions.json` (new tool suggestions from Product Hunt)
- Writes to `data/rss-feed-items.json` (AI news from RSS feeds)
- Auto-commits if there are changes
- After it runs, do `git pull` locally to see results
- To trigger manually: GitHub repo → Actions → "Daily Tool Scraper" → "Run workflow"

## Current open tasks / next steps

**Immediate (revenue-generating):**
1. Apply for affiliate programs (Copy.ai first — easiest approval)
2. When approved, update `data/affiliate-links.json` with real URLs + change status to "active"
3. Push → entire site rebuilds with monetized links

**Growth:**
4. All 9 pending Product Hunt items reviewed April 13 - all skipped (no affiliate or too niche). Pipeline is clean.
5. Blog pipeline: blog-ideas.json has fresh ideas - run next content batch in a few days
6. Share on Reddit (r/artificial, r/SideProject, r/MachineLearning)
7. Set up Google Analytics 4

**Future automation (when ready):**
8. Add Claude API integration to GitHub Actions for fully automated content generation
   - Needs Anthropic API key (separate from Claude Pro, pay-as-you-go)
   - claude-haiku-4-5 costs ~$0.01 per tool page generated
   - Would make the site fully self-maintaining

## Known issues / decisions

- Cloudflare Pages was tried first but failed (their new UI routes Next.js 14 through OpenNext which requires Next.js 15+). Switched to Netlify which works perfectly.
- Node.js installed via Homebrew at `/opt/homebrew/opt/node@20/bin/` — always need to export PATH
- `scripts/` directory excluded from tsconfig to avoid build errors
- RSS scraper had a hanging issue — fixed with 15s per-feed timeout wrapper
- HTTPS on aitoolcrunch.com: auto-provisioned by Netlify, should activate within 24h of DNS propagation

## Joan's preferences

- Wants low maintenance ("self-maintained")
- Comfortable with Claude doing the writing work — just needs to review
- Wants to understand before automating (do automation in phases)
- Budget-conscious — prefers free tiers
- Made the GitHub repo private (concern about others copying)
