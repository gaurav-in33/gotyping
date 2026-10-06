import { FINGER_LABEL, fingerForCode } from '../../core/layouts/fingers';
import { reverseIndex, QWERTY } from '../../core/layouts/qwerty';

const qwertyReverse = reverseIndex(QWERTY);

/** Which finger types a given lowercase Latin character, home-row QWERTY. */
function fingerForChar(ch: string): string | null {
  const phys = qwertyReverse.get(ch.toLowerCase());
  if (!phys) return null;
  const f = fingerForCode(phys.code);
  return f ? FINGER_LABEL[f] : null;
}

/** Small, original finger-assignment reference for a lesson's key set. */
export function FingerGuide({ keys }: { keys: string[] }) {
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
