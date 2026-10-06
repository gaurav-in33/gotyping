#!/usr/bin/env node
/**
 * Fills in the service worker's precache list after `vite build` (docs/01
 * "offline mode"). Runs as an npm `postbuild` hook — see package.json.
 *
 * Why a script instead of a bundler plugin: GoTyping's dependency list is
 * deliberately tiny (preact + the toolchain, nothing else — see AGENT.md /
 * docs' "no third-party scripts" rule for the shipped app). A ~40-line
 * Node script that just lists the files Vite already built needs nothing
 * extra installed, and keeps the worker's behaviour fully readable in
 * public/sw.js rather than hidden inside a plugin's generated output.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SW_PATH = join(DIST, 'sw.js');

if (!existsSync(SW_PATH)) {
  console.error('[build-sw] dist/sw.js not found — did `vite build` run first?');
  process.exit(1);
}

/** Recursively list every file under `dir`, returning paths relative to `dist/`. */
function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const files = listFiles(DIST)
  .map((f) => relative(DIST, f).split(sep).join('/'))
  .filter((f) => f !== 'sw.js' && !f.endsWith('.map'));

const precachePaths = files.map((f) => '/' + f);
// index.html is also reachable at the root path — make the offline fallback
// match what a navigation actually requests.
if (precachePaths.includes('/index.html') && !precachePaths.includes('/')) {
  precachePaths.push('/');
}

const version = createHash('sha256').update(files.sort().join('\n')).digest('hex').slice(0, 12);

let sw = readFileSync(SW_PATH, 'utf8');
sw = sw.replaceAll('__SW_VERSION__', version);
sw = sw.replaceAll('__SW_PRECACHE__', JSON.stringify(precachePaths));
writeFileSync(SW_PATH, sw);

// Sanity check: both placeholders must be gone, or the worker would throw
// a ReferenceError the moment a browser tries to install it.
if (sw.includes('__SW_VERSION__') || sw.includes('__SW_PRECACHE__')) {
  console.error('[build-sw] a placeholder survived the substitution — refusing to ship a broken worker.');
  process.exit(1);
}

console.log(`[build-sw] wrote dist/sw.js — version ${version}, ${precachePaths.length} precached files`);
