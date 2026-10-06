/**
 * Display-first physical keyboard guide shared by Type, Learn, Practice and
 * Settings. It is deliberately not an input surface unless the user enables
 * the optional "Tap guide to type" setting.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { fingerForCode } from '../../core/layouts/fingers';
import { reverseIndex, type KeyCap, type PhysicalLayout } from '../../core/layouts/qwerty';
import { KeyboardDiagram } from '../../ui/components/KeyboardDiagram';
import './keyboard-guide.css';

export interface KeyboardGuideProps {
  layout: PhysicalLayout;
  nextChar: string | null;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  highlightNextKey: boolean;
  showKeyLabels: boolean;
  /** Off by default: a guide tap must not type or steal the native keyboard. */
  tapToType?: boolean;
  onTap?: (char: string) => void;
}

function useViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : Math.round(window.visualViewport?.height ?? window.innerHeight),
  );

  useEffect(() => {
    const update = (): void => setHeight(Math.round(window.visualViewport?.height ?? window.innerHeight));
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return height;
}

/** Keep a pointer tap from moving focus away from the hidden native input. */
function preserveInputFocus(e: MouseEvent | PointerEvent): void {
  e.preventDefault();
}

export function KeyboardGuide({
  layout,
  nextChar,
  visible,
  onVisibleChange,
  highlightNextKey,
  showKeyLabels,
  tapToType = false,
  onTap,
}: KeyboardGuideProps) {
  const reverse = useMemo(() => reverseIndex(layout), [layout]);
  const viewportHeight = useViewportHeight();
  const [forceShown, setForceShown] = useState(false);
  const compact = viewportHeight > 0 && viewportHeight < 620;
  // A very short landscape/keyboard-resized viewport cannot safely show the
  // board. Leave the toggle visible so the owner can deliberately reveal it.
  const autoHidden = viewportHeight > 0 && viewportHeight < 340 && !forceShown;
  const isShown = visible && !autoHidden;

  useEffect(() => {
    if (viewportHeight >= 340) setForceShown(false);
  }, [viewportHeight]);

  const nextMatch = useMemo(() => {
    if (!nextChar) return null;
    // `reverseIndex` carries both normal and Shift layers. Preserve case so
    // an English capital resolves to `{ shift: true }` and lights Shift too.
    return reverse.get(nextChar) ?? null;
  }, [nextChar, reverse]);

  const shiftCode = nextMatch?.shift
    ? nextMatch.code.match(/^(Digit|Key)[A-M]/) || nextMatch.code === 'Backquote'
      ? 'ShiftRight'
      : 'ShiftLeft'
    : null;

  const handleToggle = (): void => {
    if (!isShown) {
      setForceShown(true);
      onVisibleChange(true);
      return;
    }
    setForceShown(false);
    onVisibleChange(false);
  };

  const handleTap = (k: KeyCap): void => {
    if (!tapToType || !onTap) return;
    // Like the legacy on-screen input, the target key emits its exact Shift
    // value; a non-target tap emits the key's normal layer.
    if (nextChar && nextMatch && k.code === nextMatch.code) onTap(nextChar);
    else if (k.normal) onTap(k.normal);
  };

  return (
    <section
      class={`keyboard-guide${compact ? ' keyboard-guide--compact' : ''}${isShown ? '' : ' keyboard-guide--collapsed'}`}
      data-viewport-height={viewportHeight || undefined}
      aria-label={`${layout.name} keyboard guide`}
    >
      <div class="keyboard-guide__head">
        <button
          class="btn btn--ghost btn--sm keyboard-guide__toggle"
          type="button"
          aria-expanded={isShown}
          onPointerDown={preserveInputFocus}
          onClick={handleToggle}
        >
          Guide: {isShown ? 'Hide' : 'Show'}
        </button>
        {isShown ? <span class="keyboard-guide__name">{layout.name}</span> : null}
      </div>

      {isShown ? (
        <div class={`keyboard-guide__body${showKeyLabels ? '' : ' keyboard-guide__body--no-labels'}`}>
          <KeyboardDiagram
            layout={layout}
            ariaLabel={`${layout.name} keyboard guide keys`}
            classFor={(k) => {
              const finger = fingerForCode(k.code);
              const classes = finger ? [`keyboard-guide__key--finger-${finger}`] : [];
              if (highlightNextKey && nextMatch?.code === k.code) classes.push('kbd-diagram__key--next');
              return classes.join(' ');
            }}
            subLabelFor={(k) => k.shift || undefined}
            onKeyClick={tapToType && onTap ? handleTap : undefined}
            onKeyPointerDown={tapToType && onTap ? (e) => preserveInputFocus(e) : undefined}
          />
          <div class="keyboard-guide__bottom" aria-hidden="true">
            <span
              class={`keyboard-guide__shift${shiftCode ? ' keyboard-guide__shift--next' : ''}${
                shiftCode ? ` keyboard-guide__key--finger-${fingerForCode(shiftCode) ?? 'r-pinky'}` : ''
              }`}
            >
              ⇧ Shift
            </span>
            <span class="keyboard-guide__legend">top: normal · small: Shift</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
