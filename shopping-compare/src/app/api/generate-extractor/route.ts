// AI-powered extractor generator.
// Called by the Chrome extension when it visits an unsupported store and generic
// extraction (JSON-LD / OG) returns incomplete results.
//
// Flow:
//  1. Extension sends simplified HTML snapshot (stripped to ~20KB)
//  2. This endpoint checks the cache first (store_extractors table by domain)
//  3. On cache miss: calls Claude Haiku to generate CSS selector rules
//  4. Validates the rules against the HTML using Cheerio
//  5. Stores valid rules in store_extractors (keyed by domain, shared across all users)
//  6. Returns the rules to the extension

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import * as cheerio from 'cheerio';

export interface StoreSelectorRules {
  product_name?: { selector: string; method: 'text' | 'attr'; attr?: string };
  price?: { selector: string; method: 'text'; regex?: string };
  currency?: { value: string } | { selector: string; method: 'text' | 'attr'; attr?: string };
  image?: { selector: string; method: 'attr'; attr: string };
  specs?: Array<{
    selector: string;
    method: 'pairs' | 'list' | 'dl';
    label_selector?: string;
    value_selector?: string;
  }>;
}

const SYSTEM_PROMPT = `You are a product page data extractor. Given HTML from an e-commerce product page, return CSS selectors to extract product data.

Return ONLY valid JSON with NO explanation, comments, or markdown. The JSON must match this schema exactly:
{
  "product_name": { "selector": "css selector", "method": "text" },
  "price": { "selector": "css selector", "method": "text", "regex": "optional regex to extract just the number, e.g. [\\\\d.,]+" },
  "currency": { "value": "ISO currency code" },
  "image": { "selector": "css selector", "method": "attr", "attr": "src or data-src or content" },
  "specs": [
    {
      "selector": "css selector for the container element(s)",
      "method": "pairs",
      "label_selector": "child selector for label (optional)",
      "value_selector": "child selector for value (optional)"
    }
  ]
}

Rules:
- "method: pairs" means alternating label/value siblings (like dl>dt+dd, or tr>th+td)
- "method: list" means each element has "Label: Value" text
- "method: dl" means a definition list (dl with dt/dd children)
- For currency, prefer a hardcoded ISO code (USD/EUR/GBP/etc) if the domain makes it obvious
- Specs array can be empty [] if no structured specs are visible in the HTML
- All selectors must be valid CSS selectors that Cheerio can process
- Omit fields you cannot find (do not guess)`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI extraction not configured' }, { status: 503 });
  }

  // Auth check
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { domain: string; url: string; html: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { domain, url, html } = body;
  if (!domain || !html) return NextResponse.json({ error: 'Missing domain or html' }, { status: 400 });

  const supabase = createAdminClient();

  // Check cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached } = await (supabase as any)
    .from('store_extractors')
    .select('selectors')
    .eq('domain', domain)
    .eq('status', 'active')
    .maybeSingle() as { data: { selectors: StoreSelectorRules } | null };

  if (cached) {
    return NextResponse.json({ ok: true, rules: cached.selectors, cached: true });
  }

  // Generate rules via Claude Haiku
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let rules: StoreSelectorRules | null = null;
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const userContent = attempt === 0
      ? `Domain: ${domain}\n\nHTML:\n${html}`
      : `Domain: ${domain}\n\nPrevious attempt failed validation: ${lastError}\n\nHTML:\n${html}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      // Strip any accidental markdown code fences
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rules = JSON.parse(cleaned) as StoreSelectorRules;

      const validationError = validateRules(rules, html);
      if (validationError) {
        lastError = validationError;
        rules = null;
        continue;
      }

      break; // Valid rules found
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'parse error';
      rules = null;
    }
  }

  if (!rules) {
    return NextResponse.json({ ok: false, error: 'Could not generate valid rules' });
  }

  // Cache the rules
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('store_extractors').upsert({
    domain,
    selectors: rules,
    sample_url: url,
    updated_at: new Date().toISOString(),
    status: 'active',
  });

  return NextResponse.json({ ok: true, rules, cached: false });
}

function validateRules(rules: StoreSelectorRules, html: string): string | null {
  const $ = cheerio.load(html);

  if (rules.product_name) {
    const { selector, method, attr } = rules.product_name;
    try {
      const el = $(selector).first();
      const text = method === 'attr' && attr ? el.attr(attr) : el.text().trim();
      if (!text || text.length > 300) return `product_name selector "${selector}" returned no usable text`;
    } catch {
      return `product_name selector "${selector}" is invalid`;
    }
  }

  if (rules.price) {
    const { selector, regex } = rules.price;
    try {
      const raw = $(selector).first().text().trim();
      if (!raw) return `price selector "${selector}" returned nothing`;
      const numStr = regex ? (raw.match(new RegExp(regex))?.[0] ?? '') : raw;
      const num = parseFloat(numStr.replace(/[^\d.]/g, ''));
      if (isNaN(num)) return `price selector "${selector}" did not yield a parseable number (got "${raw}")`;
    } catch {
      return `price selector "${selector}" is invalid`;
    }
  }

  if (rules.image) {
    const { selector, attr } = rules.image;
    try {
      const val = $(selector).first().attr(attr);
      if (!val || (!val.startsWith('http') && !val.startsWith('/') && !val.startsWith('data:'))) {
        return `image selector "${selector}" attr "${attr}" did not return a URL`;
      }
    } catch {
      return `image selector "${selector}" is invalid`;
    }
  }

  return null; // valid
}
