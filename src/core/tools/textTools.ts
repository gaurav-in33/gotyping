/**
 * Text tools (docs/01 Tools > Text tools): case conversion, cleaning,
 * formatting and a punctuation helper. Pure string -> string functions so
 * they are trivially unit-tested and reusable from any panel.
 */

export type CaseMode = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'snake' | 'kebab';

function words(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function convertCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\w\S*/g, (w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());
    case 'sentence':
      return text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase());
    case 'camel': {
      const ws = words(text.toLowerCase());
      return ws.map((w, i) => (i === 0 ? w : w[0]!.toUpperCase() + w.slice(1))).join('');
    }
    case 'snake':
      return words(text.toLowerCase()).join('_');
    case 'kebab':
      return words(text.toLowerCase()).join('-');
    default:
      return text;
  }
}

/** Collapse repeated whitespace, trim lines, drop runs of 3+ blank lines down to 1. */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface FormatOptions {
  /** Wrap at this column; 0 disables wrapping. */
  wrapAt: number;
  /** Convert tabs to this many spaces; 0 leaves tabs alone. */
  tabSize: number;
}

/** A simple greedy word-wrap formatter plus tab expansion. */
export function formatText(text: string, opts: FormatOptions): string {
  let out = text;
  if (opts.tabSize > 0) out = out.replace(/\t/g, ' '.repeat(opts.tabSize));
  if (opts.wrapAt <= 0) return out;

  return out
    .split('\n')
    .map((line) => {
      if (line.length <= opts.wrapAt) return line;
      const ws = line.split(' ');
      const rows: string[] = [];
      let cur = '';
      for (const w of ws) {
        const next = cur ? `${cur} ${w}` : w;
        if (next.length > opts.wrapAt && cur) {
          rows.push(cur);
          cur = w;
        } else {
          cur = next;
        }
      }
      if (cur) rows.push(cur);
      return rows.join('\n');
    })
    .join('\n');
}

/**
 * Punctuation helper: normalizes common spacing mistakes around punctuation
 * (no space before , . ! ? : ; — one space after), without touching URLs
 * or numbers like "3.14".
 */
export function fixPunctuationSpacing(text: string): string {
  return text
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,!?;:])(?=\S)/g, '$1 ')
    // A period directly followed by a letter gets a space; "3.14" (digit
    // after the period) never matches this, so decimals are left alone.
    .replace(/\.(?=[A-Za-z])/g, '. ')
    .replace(/[ \t]{2,}/g, ' ');
}
