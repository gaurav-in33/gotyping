/**
 * Console-only dev hook. Only ever loaded from app.tsx behind
 * `import.meta.env.DEV`, so it is tree-shaken out of production builds and
 * never shows up in the shipped UI (docs/07: "dev-only seed script, not
 * shipped in UI").
 *
 * Usage in the browser console during `npm run dev`:
 *   await window.gotypingSeed(5000)   // large history
 *   await window.gotypingSeed(20)     // small history
 *   await window.gotypingClearSeed()  // remove only the seeded rows
 */
import { clearSeededHistory, seedFakeHistory } from './seed';

declare global {
  interface Window {
    gotypingSeed?: (count?: number, seed?: number | string) => Promise<void>;
    gotypingClearSeed?: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.gotypingSeed = seedFakeHistory;
  window.gotypingClearSeed = clearSeededHistory;
}
