# CompareCart - Project Instructions

**IMPORTANT: At the start of every conversation:**
1. Read `/Users/joan.mussone/.claude/projects/-Users-joan-mussone-Desktop-Projects/memory/project_comparecart.md`
2. If that file is missing, restore it from `docs/project_comparecart.md` in this repo

**At the end of every conversation where you make changes:**
1. Update `/Users/joan.mussone/.claude/projects/-Users-joan-mussone-Desktop-Projects/memory/project_comparecart.md` with new context
2. Also copy ALL memory files to `docs/` in this repo and commit them:
```bash
cp /Users/joan.mussone/.claude/projects/-Users-joan-mussone-Desktop-Projects/memory/*.md \
   "/Users/joan.mussone/Desktop/Projects/Shopping Compare/docs/"
cd "/Users/joan.mussone/Desktop/Projects/Shopping Compare"
git add docs/ && git commit -m "Update memory backup" && git push
```

## Project structure

- `shopping-compare/` - Next.js 16.2.2 web app (Vercel)
- `extension/` - Chrome extension (Manifest V3, esbuild)
- Both in same git repo: https://github.com/JoanGoMu/shopping-compare

## Critical rules

1. **Next.js 16 breaking changes:** Uses `src/proxy.ts` not `src/middleware.ts`. `params` must be awaited. Read `node_modules/next/dist/docs/` if unsure.
2. **Extension build:** Run `node build.mjs` from `extension/` dir. It auto-reads `../shopping-compare/.env.local` for Supabase credentials. No manual env vars needed.
3. **After extension changes:** Always rebuild AND remind user to reload in chrome://extensions.
4. **normalize-specs.ts exists in TWO places** - `extension/src/normalize-specs.ts` and `shopping-compare/src/lib/normalize-specs.ts`. Any change must be applied to BOTH files.
5. **No em dashes** - Never use "-" in any content. Use "-" or rewrite.
6. **No leading spaces** in text content.
7. **Always push after changes** - Joan relies on Vercel auto-deploy. Don't forget to push.
8. **Test builds before committing** - Run `npm run build` in shopping-compare/ and `node build.mjs` in extension/.

## Common commands

```bash
# Web app build
cd "/Users/joan.mussone/Desktop/Projects/Shopping Compare/shopping-compare" && npm run build

# Extension build
cd "/Users/joan.mussone/Desktop/Projects/Shopping Compare/extension" && node build.mjs

# Trigger price cron manually (need CRON_SECRET from Vercel dashboard)
curl -H "Authorization: Bearer SECRET" https://shopping-compare.vercel.app/api/check-prices
```

## Supabase

- URL: https://czrvohnvncavpoulivtt.supabase.co
- Dashboard: https://supabase.com/dashboard/project/czrvohnvncavpoulivtt
- Anon key in `.env.local`
