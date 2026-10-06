/**
 * Standard Devanagari character groupings used only to pick which *real*
 * words a Hindi lesson may use (e.g. "home row" or "vowels only"). These are
 * the ordinary Unicode Devanagari blocks taught in every Hindi primer — not
 * a keyboard mapping, so docs/06 rule 1 (don't invent key tables) does not
 * apply here; nothing below claims which physical key types which glyph.
 */

/** The 11 traditional independent vowels (स्वर). */
export const DEVANAGARI_VOWELS = [
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ',
];

/** The core consonant set (व्यंजन), standard teaching order. */
export const DEVANAGARI_CONSONANTS = [
  'क', 'ख', 'ग', 'घ', 'ङ',
  'च', 'छ', 'ज', 'झ', 'ञ',
  'ट', 'ठ', 'ड', 'ढ', 'ण',
  'त', 'थ', 'द', 'ध', 'न',
  'प', 'फ', 'ब', 'भ', 'म',
  'य', 'र', 'ल', 'व',
  'श', 'ष', 'स', 'ह',
];

/** Dependent vowel signs (मात्रा) attached to a consonant. */
export const DEVANAGARI_MATRAS = [
  'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', 'ँ',
];

/** A handful of very common conjuncts (संयुक्ताक्षर) for the "combinations" lesson. */
export const DEVANAGARI_CONJUNCTS = [
  'क्ष', 'त्र', 'ज्ञ', 'श्र', 'स्त', 'क्त', 'द्व', 'न्द', 'स्व', 'त्व',
];

export function devanagariSetFor(name: string): string[] {
  switch (name) {
    case 'vowels':
      return DEVANAGARI_VOWELS;
    case 'consonants':
      return DEVANAGARI_CONSONANTS;
    case 'matras':
      return DEVANAGARI_MATRAS;
    case 'conjuncts':
      return DEVANAGARI_CONJUNCTS;
    case 'home row':
    default:
      // A beginner-friendly starter set: the most frequent consonants + vowels.
      return ['क', 'र', 'त', 'न', 'स', 'ल', 'म', 'अ', 'आ', 'इ', 'ी', 'ा'];
  }
}
