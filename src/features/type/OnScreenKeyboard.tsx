import { useMemo } from 'preact/hooks';
import { KeyboardDiagram } from '../../ui/components/KeyboardDiagram';
import { reverseIndex, type KeyCap, type PhysicalLayout } from '../../core/layouts/qwerty';
import './onscreen-keyboard.css';

export interface OnScreenKeyboardProps {
  layout: PhysicalLayout;
  /** The next unit the session expects, so the matching key can light up. */
  nextChar: string | null;
  /** Settings > Keyboard > "Key highlighting". */
  highlightNextKey: boolean;
  /** Settings > Keyboard > "Key labels" — hide glyphs for a blanker, drill-like board. */
  showKeyLabels: boolean;
  /**
   * Tap-to-type for touch users. Tapping the highlighted "next" key emits
   * the exact expected character (including Shift-only ones); tapping any
   * other key emits its plain, unshifted glyph.
   */
  onTap?: (char: string) => void;
}

/**
 * Settings > Keyboard > "On-screen keyboard" (docs/01 §9). Reuses
 * KeyboardDiagram — the same component Stats' heatmap and the Keyboard
 * tester already render — rather than a third keyboard implementation.
 */
export function OnScreenKeyboard({
  layout,
  nextChar,
  highlightNextKey,
  showKeyLabels,
  onTap,
}: OnScreenKeyboardProps) {
  const reverse = useMemo(() => reverseIndex(layout), [layout]);

  // The expected next unit can sit in a key's Shift position (capitals,
  // punctuation, several Devanagari matras). Keep the exact match (code +
  // whether it needs Shift), not just the code, so tapping the highlighted
  // key can feed the *actual* expected character — not always `k.normal`.
  const nextMatch = useMemo(() => {
    if (!nextChar) return null;
    const lookup = layout.script === 'devanagari' ? nextChar : nextChar.toLowerCase();
    return reverse.get(lookup) ?? null;
  }, [nextChar, reverse, layout.script]);

  const handleTap = (k: KeyCap): void => {
    if (!onTap) return;
    // Tapping the key the session is actually waiting on always feeds the
    // exact expected character, Shift or not — tapping any other key falls
    // back to its plain (unshifted) glyph, since there is no way to infer
    // Shift intent from a single tap on an unrelated key.
    if (nextChar && nextMatch && k.code === nextMatch.code) {
      onTap(nextChar);
    } else if (k.normal) {
      onTap(k.normal);
    }
  };

  return (
    <div class={`onscreen-kb${showKeyLabels ? '' : ' onscreen-kb--no-labels'}`}>
      <KeyboardDiagram
        layout={layout}
        ariaLabel={`${layout.name} on-screen keyboard`}
        classFor={(k: KeyCap) =>
          highlightNextKey && nextMatch && k.code === nextMatch.code ? 'kbd-diagram__key--next' : undefined
        }
        onKeyClick={onTap ? handleTap : undefined}
      />
    </div>
  );
}
