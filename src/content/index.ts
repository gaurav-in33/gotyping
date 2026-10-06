/**
 * Content loading. Word lists are lazy per language so the initial bundle
 * stays small (docs/02 performance budget). All content is bundled with the
 * app — there are no runtime network calls to anywhere.
 */
import type { LanguageId } from '../store/settings';

export interface LanguagePack {
  id: LanguageId;
  label: string;
  words: string[];
  quotes: string[];
  /** Devanagari needs the Hindi layout + font stack. */
  script: 'latin' | 'devanagari';
}

export const LANGUAGES: Array<{ id: LanguageId; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी (Hindi)' },
  { id: 'hinglish', label: 'Hinglish' },
];

const cache = new Map<LanguageId, LanguagePack>();

interface WordsFile {
  words: string[];
}
interface QuotesFile {
  quotes: Record<string, string[]>;
}

export async function loadLanguage(id: LanguageId): Promise<LanguagePack> {
  const hit = cache.get(id);
  if (hit) return hit;

  const quotesMod = (await import('./quotes.json')) as unknown as {
    default: QuotesFile;
  };
  const quotesAll = quotesMod.default.quotes ?? {};

  let words: string[] = [];
  let label = 'English';
  let script: 'latin' | 'devanagari' = 'latin';

  if (id === 'hi') {
    const m = (await import('./words-hindi.json')) as unknown as { default: WordsFile };
    words = m.default.words;
    label = 'हिंदी';
    script = 'devanagari';
  } else if (id === 'hinglish') {
    const m = (await import('./words-hinglish.json')) as unknown as { default: WordsFile };
    words = m.default.words;
    label = 'Hinglish';
  } else {
    const m = (await import('./words-en.json')) as unknown as { default: WordsFile };
    words = m.default.words;
  }

  const quoteKey = id === 'hi' ? 'hi' : id === 'hinglish' ? 'hinglish' : 'en';
  const pack: LanguagePack = {
    id,
    label,
    words,
    quotes: quotesAll[quoteKey] ?? quotesAll['en'] ?? [],
    script,
  };
  cache.set(id, pack);
  return pack;
}
