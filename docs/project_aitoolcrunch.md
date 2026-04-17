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

## Current site content (as of April 16, 2026)

**37 tools across 6 categories:**
- AI Writing: jasper, copy-ai, writesonic, rytr, claude, chatgpt, gemini, perplexity, generateppt, notebooklm
- AI Image: midjourney, dall-e, leonardo-ai, ideogram, apimage (+ chatgpt cross-listed)
- AI Code: github-copilot, cursor, tabnine, goose, mercury-edit, codictate, openclaw (+ claude, chatgpt, gemini cross-listed)
- AI Video: runway, synthesia, heygen, pika, slide2video, google-vids, pixverse
- AI Audio: elevenlabs, descript, murf-ai, voiceos, fluently
- AI Automation: make, n8n, gumloop (+ openclaw cross-listed)

**142 comparison pages** - full intra-category coverage achieved April 16, 2026. No gaps remain.

**6 categories:** ai-writing, ai-image, ai-code, ai-video, ai-audio, ai-automation

**37 blog posts** (last updated April 17, 2026). Author for all new posts: "AIToolCrunch". Older posts have fake author names (alex-chen, sara-morales, etc.) - not yet backfilled.

Recent posts (Apr 17): claude-opus-4-7-launch, claude-code-routines-saved-workflows, qwen-3-6-open-source-beats-opus, openai-codex-2-claude-code-competitor, chatgpt-for-excel-spreadsheets

Recent posts (Apr 16): anthropic-cowork-claude-desktop-agent, coding-agent-infrastructure-freestyle-twill, nouscoder-14b-open-source-coding-model, claudraband-claude-code-power-user-tools, gaia-local-ai-agents-framework

**RSS items still uncovered:** Railway $100M raise, CSS Studio, Eve (managed OpenClaw), sllm, Hippo memory framework, LangAlpha (Claude Code for finance, 131 HN pts), CodeBurn (token usage analyzer, 88 HN pts), GPT-Rosalind (OpenAI life sciences), Kampala YC W26.

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
  tools/*.json          — one file per tool (37 files)
  categories.json       — 6 categories
  comparisons.json      — 142 comparison page definitions
  deals.json            — empty (no deals yet)
  affiliate-links.json  — affiliate URLs and statuses
  blog/*.json           — 32 blog post files
  blog-ideas.json       — populated daily by GitHub Actions scraper
  rss-feed-items.json   — AI news from RSS feeds, updated daily

src/
  app/page.tsx                    — homepage
  app/tools/[slug]/page.tsx       — tool detail pages
  app/category/[slug]/page.tsx    — category pages
  app/compare/[slug]/page.tsx     — comparison pages
  app/blog/[slug]/page.tsx        — blog post pages
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

**Growth:**
6. Set up Google Analytics 4 (still not done - can't measure traffic)
7. Share on Reddit: r/artificial, r/SideProject, r/MachineLearning
8. Submit to directories: Product Hunt, IndieHackers, BetaList
9. Blog: keep 3-5 posts/week cadence using RSS scraper items
10. Add "Best of" roundup posts for video, audio, automation categories

**Technical improvements:**
11. Add JSON-LD structured data (SoftwareApplication schema for tools)
12. Add email newsletter signup (Buttondown free tier)
13. Add Claude API to GitHub Actions for fully automated content generation
    - Needs Anthropic API key (pay-as-you-go, separate from Claude Pro)
    - claude-haiku-4-5 costs ~$0.01 per page generated

## Known issues / decisions

- Cloudflare Pages failed (their UI routes Next.js 14 through OpenNext which requires 15+). Use Netlify only.
- Node.js installed via Homebrew at `/opt/homebrew/opt/node@20/bin/` - always export PATH
- `scripts/` directory excluded from tsconfig to avoid build errors
- RSS scraper had a hanging issue - fixed with 15s per-feed timeout wrapper
- Copy.ai affiliate program was confirmed closed/discontinued April 2026

## Joan's preferences

- Wants low maintenance ("self-maintained")
- Comfortable with Claude doing the writing work - just needs to review
- Wants to understand before automating (do automation in phases)
- Budget-conscious - prefers free tiers
- Made the GitHub repo private (concern about others copying)
