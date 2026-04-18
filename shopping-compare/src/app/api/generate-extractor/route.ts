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
  // AI-detected metadata about this domain
  category?: 'shoes' | 'clothing' | 'electronics' | 'beauty' | 'home' | 'general';
  detected_currency?: string; // ISO currency code (EUR, GBP, USD, etc.)
  spec_translations?: Record<string, string>; // raw store label -> canonical English key
}

const SYSTEM_PROMPT = `You are a product page data extractor for an e-commerce comparison tool. Given HTML from a product page, return CSS selectors to extract product data, plus metadata about the page.

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
  ],
  "category": "one of: shoes, clothing, electronics, beauty, home, general",
  "detected_currency": "ISO currency code detected from price symbols and locale on this page",
  "spec_translations": {
    "Raw Label From Page": "Canonical English Key"
  }
}

Schema rules:
- "method: pairs" means alternating label/value siblings (like dl>dt+dd, tr>th+td, or span+span)
- "method: list" means each element contains "Label: Value" text in one element
- "method: dl" means a proper definition list (dl with dt/dd children)
- For "currency" field, prefer a hardcoded ISO code (EUR/GBP/USD) based on the store's country
- All selectors must be valid CSS selectors
- Omit fields you cannot find (do not guess)

IMPORTANT - For "detected_currency":
Look at the price display (currency symbols like €, £, $, kr, CHF), the page locale, domain TLD (.nl/.de/.fr = EUR, .co.uk = GBP, .com = USD unless symbols say otherwise), and meta tags. Return the ISO code the store actually uses.

IMPORTANT - For "category":
- shoes: footwear, sneakers, boots, sandals, heels, slippers
- clothing: shirts, pants, dresses, jackets, sportswear, underwear
- electronics: phones, laptops, headphones, cameras, TVs, appliances
- beauty: skincare, makeup, perfume, haircare
- home: furniture, kitchenware, bedding, decor
- general: anything that doesn't fit the above

IMPORTANT - For "spec_translations":
Look at the spec label text visible in the HTML (in any language). Map each raw label to the correct canonical English key from these category-specific lists:

Shoes: Brand, Size, Color, Material, Sole, Insole, Lining, Fit, Heel Height, Width, Style, Weight, Country of Origin
Clothing: Brand, Size, Color, Material, Composition, Fit, Pattern, Neckline, Sleeve, Length, Gender, Season, Care, Country of Origin
Electronics: Brand, Processor, RAM, Storage, Display, Battery, Weight, OS, Connectivity, Camera, Resolution, Ports
Beauty: Brand, Volume, Type, Scent, Skin Type, Ingredients, Application
Home: Brand, Material, Dimensions, Color, Weight, Capacity
General: Brand, Color, Material, Size, Type, Weight

Only include entries where translation is needed (label differs from canonical key). Examples:
- "Bovenmateriaal" -> "Material" (Dutch for upper material)
- "Buitenzool" -> "Sole" (Dutch for outsole)
- "Dekzool" -> "Insole" (Dutch for sockliner)
- "Farbe" -> "Color" (German)
- "Taille" -> "Size" (French)
- "Zusammensetzung" -> "Composition" (German)

IMPORTANT - specs extraction priority:
The most valuable specs for shoppers are: Size, Color, Material, Brand, Fit. Focus on finding these.

For SIZE specifically - this is the highest priority spec:
- Look for size picker elements: buttons with size values, radio inputs, select dropdowns, list items in a size grid
- Shoe sizes appear as numbers: 36, 37, 38, 39, 40, 41, 42, 43, 44 (EU), or 6, 7, 8, 9, 10 (US), or prefixed: "EU 38", "UK 8"
- Clothing sizes appear as: XS, S, M, L, XL, XXL or numeric waist/length combos
- Use a selector that targets the size option elements themselves (e.g. buttons in a size grid), not just a wrapper
- If sizes are in a <select>, target the <option> elements
- Only include sizes that are available (not disabled/sold-out) - look for aria-disabled="true" or disabled attribute to exclude

For COLOR - look for swatch buttons, color option buttons, or a color label near swatches.

For specs key/value pairs - look for:
- Definition lists (dl/dt/dd)
- Tables with label/value rows
- List items with "Label: Value" format
- Divs/spans with alternating label and value children`;

function buildUserPrompt(domain: string, html: string, productName?: string): string {
  const hint = productName ? `\nProduct hint: "${productName}"` : '';
  return `Domain: ${domain}${hint}\n\nHTML:\n${html}`;
}

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

  let body: { domain: string; url: string; html: string; productName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { domain, url, html, productName } = body;
  if (!domain || !html) return NextResponse.json({ error: 'Missing domain or html' }, { status: 400 });

  const supabase = createAdminClient();

  // Check cache - but only use it if it has specs rules (old cached rules may lack them)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached } = await (supabase as any)
    .from('store_extractors')
    .select('selectors, category, spec_translations, detected_currency')
    .eq('domain', domain)
    .eq('status', 'active')
    .maybeSingle() as { data: { selectors: StoreSelectorRules; category?: string; spec_translations?: Record<string, string>; detected_currency?: string } | null };

  if (cached && cached.selectors.specs && cached.selectors.specs.length > 0) {
    // Merge top-level metadata into the rules object for backward compatibility
    const rules: StoreSelectorRules = {
      ...cached.selectors,
      category: (cached.category as StoreSelectorRules['category']) ?? cached.selectors.category,
      spec_translations: cached.spec_translations ?? cached.selectors.spec_translations ?? {},
      detected_currency: cached.detected_currency ?? cached.selectors.detected_currency,
    };
    return NextResponse.json({ ok: true, rules, cached: true });
  }
  // Fall through to (re)generate if cached rules have no specs

  // Generate rules via Claude Haiku
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let rules: StoreSelectorRules | null = null;
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const userContent = attempt === 0
      ? buildUserPrompt(domain, html, productName)
      : `${buildUserPrompt(domain, html, productName)}\n\nPrevious attempt failed validation: ${lastError}. Fix the selectors and try again.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1536,
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

  // Cache the rules - store metadata as top-level columns for easy querying
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('store_extractors').upsert({
    domain,
    selectors: rules,
    category: rules.category ?? null,
    spec_translations: rules.spec_translations ?? {},
    detected_currency: rules.detected_currency ?? null,
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
