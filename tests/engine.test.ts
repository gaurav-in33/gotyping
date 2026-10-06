import { describe, expect, it } from 'vitest';
import {
  Session,
  defaultSessionConfig,
  toUnits,
  type SessionConfig,
} from '../src/core/engine/session';
import { UNIT_CORRECT, UNIT_PENDING, UNIT_SKIPPED, UNIT_WRONG } from '../src/core/engine/metrics';

function cfg(over: Partial<SessionConfig> = {}): SessionConfig {
  return { ...defaultSessionConfig, ...over };
}

/** Type a string with a fixed ms cadence starting at t0. */
function type(s: Session, text: string, cadence = 100, t0 = 1000): number {
  let t = t0;
  for (const ch of Array.from(text)) {
    s.handleChar(ch, t);
    t += cadence;
  }
  return t;
}

describe('units', () => {
  it('splits by code point after NFC', () => {
    expect(toUnits('abc')).toEqual(['a', 'b', 'c']);
    // Devanagari: each consonant / matra / halant is its own unit
    expect(toUnits('कि')).toEqual(['क', 'ि']);
    expect(toUnits('क्ष')).toEqual(['क', '्', 'ष']);
  });
});

describe('perfect run', () => {
  it('marks every unit correct and reports 100% accuracy', () => {
    const s = new Session('the cat', cfg());
    const end = type(s, 'the cat');
    s.complete(end);

    const m = s.metrics();
    expect(s.getStatus()).toBe('complete');
    expect(m.keystrokes).toBe(7);
    expect(m.errors).toBe(0);
    expect(m.accuracy).toBe(100);
    expect(m.correctChars).toBe(7);
    expect(m.correctWords).toBe(2);
    expect(m.incorrectWords).toBe(0);
    expect(Array.from(s.getStates())).toEqual(Array(7).fill(UNIT_CORRECT));
  });

  it('auto-completes on the last unit in word mode', () => {
    const s = new Session('hi', cfg());
    type(s, 'hi');
    expect(s.getStatus()).toBe('complete');
  });
});

describe('WPM / raw / CPM against hand-computed numbers', () => {
  it('computes exactly', () => {
    // 10 correct units typed, then the clock is stopped at exactly 30s.
    // Text is longer than what we type so the test does not auto-complete.
    const s = new Session('abcde fghi jklmn', cfg());
    let t = 1000;
    for (const ch of Array.from('abcde fghi')) {
      s.handleChar(ch, t);
      t += 100;
    }
    expect(s.getStatus()).toBe('running');
    // Force a precise 30s active window before completing.
    s.complete(1000 + 30000);

    const m = s.metrics();
    // minutes = 0.5; correct units = 10 -> 10/5/0.5 = 4 WPM
    expect(m.timeMs).toBe(30000);
    expect(m.wpm).toBe(4);
    expect(m.rawWpm).toBe(4);
    // CPM = 10 / 0.5 = 20
    expect(m.cpm).toBe(20);
  });

  it('accuracy is 100 when nothing was typed', () => {
    const s = new Session('abc', cfg());
    expect(s.metrics().accuracy).toBe(100);
    expect(s.metrics().keystrokes).toBe(0);
  });
});

describe('mistakes', () => {
  it('counts a corrected mistake in errors but not in final correct chars', () => {
    const s = new Session('cat', cfg());
    let t = 1000;
    s.handleChar('c', t);
    t += 100;
    s.handleChar('x', t); // wrong -> state 2, advances
    t += 100;
    s.handleBackspace(t); // correct it
    t += 100;
    s.handleChar('a', t);
    t += 100;
    s.handleChar('t', t);

    const m = s.metrics();
    expect(m.keystrokes).toBe(4); // c x a t  (backspace is not a keystroke)
    expect(m.errors).toBe(1);
    expect(m.uncorrectedErrors).toBe(0);
    expect(m.correctChars).toBe(3);
    expect(m.accuracy).toBe(75); // 3/4
  });

  it('keeps going on error by default and reports uncorrected errors', () => {
    const s = new Session('cat', cfg());
    type(s, 'cxt');
    const m = s.metrics();
    expect(m.errors).toBe(1);
    expect(m.uncorrectedErrors).toBe(1);
    expect(Array.from(s.getStates())).toEqual([UNIT_CORRECT, UNIT_WRONG, UNIT_CORRECT]);
    expect(m.incorrectWords).toBe(1);
    expect(m.correctWords).toBe(0);
  });

  it('stop-on-error does not advance the caret', () => {
    const s = new Session('cat', cfg({ stopOnError: true }));
    let t = 1000;
    s.handleChar('c', t);
    t += 100;
    s.handleChar('x', t);
    expect(s.getPos()).toBe(1);
    expect(s.getStates()[1]).toBe(UNIT_PENDING);
    expect(s.getMistakes()).toBe(1);
    expect(s.getKeystrokes()).toBe(2);
    t += 100;
    s.handleChar('a', t);
    expect(s.getPos()).toBe(2);
  });
});

describe('backspace modes', () => {
  it('allow: can delete back across words', () => {
    const s = new Session('ab cd', cfg({ backspace: 'allow' }));
    type(s, 'ab c');
    expect(s.getPos()).toBe(4);
    s.handleBackspace(9000);
    s.handleBackspace(9100);
    s.handleBackspace(9200);
    expect(s.getPos()).toBe(1);
  });

  it('word: cannot move before the current word start', () => {
    // Longer target so typing 5 units does not finish the test.
    const s = new Session('ab cd ef', cfg({ backspace: 'word' }));
    type(s, 'ab cd');
    expect(s.getStatus()).toBe('running');
    // caret at 5, current word starts at 3
    s.handleBackspace(9000);
    s.handleBackspace(9100);
    expect(s.getPos()).toBe(3);
    s.handleBackspace(9200); // blocked at the word boundary
    expect(s.getPos()).toBe(3);
  });

  it('off: backspace does nothing', () => {
    const s = new Session('abc', cfg({ backspace: 'off' }));
    type(s, 'ab');
    s.handleBackspace(9000);
    expect(s.getPos()).toBe(2);
  });

  it('never reduces keystrokes or mistakes', () => {
    const s = new Session('abc', cfg());
    type(s, 'ax');
    const k = s.getKeystrokes();
    const e = s.getMistakes();
    s.handleBackspace(9000);
    s.handleBackspace(9100);
    expect(s.getKeystrokes()).toBe(k);
    expect(s.getMistakes()).toBe(e);
  });
});

describe('skip word and undo skip', () => {
  it('space mid-word skips the rest of the word', () => {
    const s = new Session('hello world', cfg());
    let t = 1000;
    s.handleChar('h', t);
    t += 100;
    s.handleChar('e', t);
    t += 100;
    s.handleChar(' ', t); // skip "llo"

    const states = Array.from(s.getStates());
    expect(states.slice(0, 2)).toEqual([UNIT_CORRECT, UNIT_CORRECT]);
    expect(states.slice(2, 5)).toEqual([UNIT_SKIPPED, UNIT_SKIPPED, UNIT_SKIPPED]);
    expect(states[5]).toBe(UNIT_CORRECT); // the separator space
    expect(s.getPos()).toBe(6);
    // the skip space counts as a correct keystroke, not a mistake
    expect(s.getMistakes()).toBe(0);
    expect(s.getKeystrokes()).toBe(3);
    expect(s.metrics().skippedChars).toBe(3);
  });

  it('backspace right after a skip restores the whole block', () => {
    const s = new Session('hello world', cfg());
    let t = 1000;
    s.handleChar('h', t);
    t += 100;
    s.handleChar('e', t);
    t += 100;
    s.handleChar(' ', t);
    t += 100;
    s.handleBackspace(t);

    expect(s.getPos()).toBe(2);
    const states = Array.from(s.getStates());
    expect(states.slice(2, 6)).toEqual([
      UNIT_PENDING,
      UNIT_PENDING,
      UNIT_PENDING,
      UNIT_PENDING,
    ]);
    // undo does not refund the keystroke
    expect(s.getKeystrokes()).toBe(3);
  });

  it('space at word start counts as a mistake and does not advance', () => {
    const s = new Session('hello world', cfg());
    s.handleChar(' ', 1000);
    expect(s.getPos()).toBe(0);
    expect(s.getMistakes()).toBe(1);
    expect(s.getKeystrokes()).toBe(1);
  });

  it('skipped words are reported separately from incorrect words', () => {
    const s = new Session('hello world', cfg());
    let t = 1000;
    s.handleChar('h', t);
    t += 100;
    s.handleChar(' ', t);
    type(s, 'world', 100, t + 100);
    const m = s.metrics();
    expect(m.skippedWords).toBe(1);
    expect(m.correctWords).toBe(1);
    expect(m.incorrectWords).toBe(0);
  });
});

describe('time mode', () => {
  it('ends when the duration is reached and clamps recorded time', () => {
    const s = new Session('aaaa bbbb cccc', cfg({ durationMs: 5000, endOnLastUnit: false }));
    s.handleChar('a', 0);
    s.tick(4000);
    expect(s.getStatus()).toBe('running');
    s.tick(5000);
    expect(s.getStatus()).toBe('complete');
    expect(s.metrics().timeMs).toBe(5000);
  });

  it('extends the text on demand', () => {
    let calls = 0;
    const s = new Session('a b c', cfg({ durationMs: 60000, endOnLastUnit: false }), () => {
      calls++;
      return ' more words here';
    });
    const before = s.getUnits().length;
    s.handleChar('a', 0);
    expect(calls).toBeGreaterThan(0);
    expect(s.getUnits().length).toBeGreaterThan(before);
  });

  it('remainingMs counts down', () => {
    const s = new Session('abc', cfg({ durationMs: 10000, endOnLastUnit: false }));
    s.handleChar('a', 1000);
    expect(s.remainingMs(3000)).toBe(8000);
  });
});

describe('pause and resume', () => {
  it('excludes paused time from active time', () => {
    const s = new Session('abcdef', cfg());
    s.handleChar('a', 1000);
    s.pause(2000); // 1000ms active
    s.resume(10000); // 8s paused
    s.handleChar('b', 11000); // +1000ms active
    expect(s.activeMs(11000)).toBe(2000);
  });
});

describe('zen mode', () => {
  it('counts keystrokes with no target text and never completes', () => {
    const s = new Session('', cfg({ zen: true, endOnLastUnit: false }));
    type(s, 'anything at all');
    expect(s.getStatus()).toBe('running');
    expect(s.getKeystrokes()).toBe(15);
    expect(s.metrics().errors).toBe(0);
  });
});

describe('expert and master', () => {
  it('master fails on the first mistake', () => {
    const s = new Session('cat sat', cfg({ failOnMistake: true }));
    type(s, 'cx');
    expect(s.getStatus()).toBe('failed');
    expect(s.getFailReason()).toBe('master-mistake');
  });

  it('expert fails when a word is completed with an uncorrected error', () => {
    const s = new Session('cat sat', cfg({ failOnWordError: true }));
    type(s, 'cxt ');
    expect(s.getStatus()).toBe('failed');
    expect(s.getFailReason()).toBe('expert-word');
  });

  it('expert allows a word that was corrected before the space', () => {
    const s = new Session('cat sat', cfg({ failOnWordError: true }));
    let t = 1000;
    s.handleChar('c', t);
    t += 100;
    s.handleChar('x', t);
    t += 100;
    s.handleBackspace(t);
    t += 100;
    s.handleChar('a', t);
    t += 100;
    s.handleChar('t', t);
    t += 100;
    s.handleChar(' ', t);
    expect(s.getStatus()).toBe('running');
  });
});

describe('hindi sequences', () => {
  it('treats halant and matras as separate units and scores them', () => {
    const word = 'क्षत्रिय';
    const s = new Session(word, cfg());
    const units = toUnits(word);
    type(s, word);
    expect(s.getStatus()).toBe('complete');
    const m = s.metrics();
    expect(m.keystrokes).toBe(units.length);
    expect(m.accuracy).toBe(100);
    expect(m.correctChars).toBe(units.length);
  });

  it('flags a wrong matra', () => {
    const s = new Session('कि', cfg());
    type(s, 'कீ'.slice(0, 1) + 'ी'); // correct consonant, wrong matra
    const m = s.metrics();
    expect(m.errors).toBe(1);
    expect(m.accuracy).toBe(50);
  });
});

describe('events', () => {
  it('emits start, keystroke, mistake and complete', () => {
    const s = new Session('ab', cfg());
    const seen: string[] = [];
    s.on((e) => seen.push(e.type));
    type(s, 'xb');
    expect(seen[0]).toBe('start');
    expect(seen).toContain('keystroke');
    expect(seen).toContain('mistake');
    expect(seen).toContain('complete');
  });

  it('emits skip and undo', () => {
    const s = new Session('hello world', cfg());
    const seen: string[] = [];
    s.on((e) => seen.push(e.type));
    s.handleChar('h', 1000);
    s.handleChar(' ', 1100);
    s.handleBackspace(1200);
    expect(seen).toContain('skip');
    expect(seen).toContain('undo');
  });
});

describe('restart', () => {
  it('clears all progress and counters', () => {
    const s = new Session('abc', cfg());
    type(s, 'ab');
    s.restart();
    expect(s.getPos()).toBe(0);
    expect(s.getKeystrokes()).toBe(0);
    expect(s.getMistakes()).toBe(0);
    expect(s.getStatus()).toBe('idle');
    expect(Array.from(s.getStates())).toEqual([0, 0, 0]);
  });
});
