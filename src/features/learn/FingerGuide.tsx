import { useMemo } from 'preact/hooks';
import { FINGER_LABEL, fingerForCode } from '../../core/layouts/fingers';
import { reverseIndex, QWERTY, type PhysicalLayout } from '../../core/layouts/qwerty';

/**
 * Small, original finger-assignment reference for a lesson's key set.
 * Takes the active physical layout so it stays correct for Colemak/Dvorak
 * and Hindi lessons, not just QWERTY (Step 3) — reuses the same
 * `reverseIndex` the Keyboard tester and on-screen keyboard rely on.
 */
export function FingerGuide({ keys, layout = QWERTY }: { keys: string[]; layout?: PhysicalLayout }) {
  const reverse = useMemo(() => reverseIndex(layout), [layout]);

  const fingerForChar = (ch: string): string | null => {
    const phys = reverse.get(layout.script === 'devanagari' ? ch : ch.toLowerCase());
    if (!phys) return null;
    const f = fingerForCode(phys.code);
    return f ? FINGER_LABEL[f] : null;
  };

  if (keys.length === 0) return null;
  const rows = keys
    .map((k) => ({ key: k, finger: fingerForChar(k) }))
    .filter((r) => r.finger !== null);

  if (rows.length === 0) return null;

  return (
    <div class="finger-guide panel" aria-label="Finger guide">
      <h2 class="finger-guide__title">Finger guide</h2>
      <div class="finger-guide__grid">
        {rows.map((r) => (
          <div class="finger-guide__row" key={r.key}>
            <span class="finger-guide__key">{r.key === ' ' ? 'Space' : r.key}</span>
            <span class="finger-guide__finger">{r.finger}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
