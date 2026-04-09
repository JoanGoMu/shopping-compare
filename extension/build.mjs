/**
 * Extension build script using esbuild.
 * Run: node build.mjs
 * Reads SUPABASE_URL / SUPABASE_ANON_KEY / APP_URL from environment variables.
 * Falls back to reading NEXT_PUBLIC_* variants from ../shopping-compare/.env.local
 * so you don't have to export them manually.
 */

import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

// Load fallback values from the web app's .env.local
function loadWebAppEnv() {
  try {
    const raw = readFileSync('../shopping-compare/.env.local', 'utf8');
    const map = {};
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return map;
  } catch {
    return {};
  }
}

const webEnv = loadWebAppEnv();

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? webEnv['NEXT_PUBLIC_SUPABASE_URL']
  ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? webEnv['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  ?? 'your-anon-key';
const APP_URL = process.env.APP_URL ?? 'https://shopping-compare.vercel.app';

if (SUPABASE_URL === 'https://your-project.supabase.co') {
  console.warn('WARNING: SUPABASE_URL not set - extension will not be able to connect to Supabase.');
}

const replace = {
  '__SUPABASE_URL__': SUPABASE_URL,
  '__SUPABASE_ANON_KEY__': SUPABASE_ANON_KEY,
  '__APP_URL__': APP_URL,
};

const definePlugin = {
  name: 'string-replace',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      let contents = readFileSync(args.path, 'utf8');
      for (const [k, v] of Object.entries(replace)) {
        contents = contents.replaceAll(k, v);
      }
      return { contents, loader: 'ts' };
    });
  },
};

const sharedOptions = {
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  plugins: [definePlugin],
  define: {},
  minify: process.env.NODE_ENV === 'production',
};

const watch = process.argv.includes('--watch');

if (watch) {
  const ctx1 = await esbuild.context({ ...sharedOptions, entryPoints: ['src/background.ts'], outfile: 'background.js', format: 'esm' });
  const ctx2 = await esbuild.context({ ...sharedOptions, entryPoints: ['src/content.ts'], outfile: 'content.js', format: 'iife' });
  const ctx3 = await esbuild.context({ ...sharedOptions, entryPoints: ['src/popup.ts'], outfile: 'popup.js', format: 'iife' });
  await Promise.all([ctx1.watch(), ctx2.watch(), ctx3.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([
    esbuild.build({ ...sharedOptions, entryPoints: ['src/background.ts'], outfile: 'background.js', format: 'esm' }),
    esbuild.build({ ...sharedOptions, entryPoints: ['src/content.ts'], outfile: 'content.js', format: 'iife' }),
    esbuild.build({ ...sharedOptions, entryPoints: ['src/popup.ts'], outfile: 'popup.js', format: 'iife' }),
  ]);
  console.log('Extension built successfully.');
}
