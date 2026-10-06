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
  /** Tap-to-type for touch users; emits the key's base (unshifted) character. */
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

  const nextCode = useMemo(() => {
    if (!nextChar) return null;
    const lookup = layout.script === 'devanagari' ? nextChar : nextChar.toLowerCase();
    return reverse.get(lookup)?.code ?? null;
  }, [nextChar, reverse, layout.script]);

  return (
    <div class={`onscreen-kb${showKeyLabels ? '' : ' onscreen-kb--no-labels'}`}>
      <KeyboardDiagram
        layout={layout}
        ariaLabel={`${layout.name} on-screen keyboard`}
        classFor={(k: KeyCap) => (highlightNextKey && k.code === nextCode ? 'kbd-diagram__key--next' : undefined)}
        onKeyClick={onTap ? (k: KeyCap) => k.normal && onTap(k.normal) : undefined}
      />
    </div>
  );
}
