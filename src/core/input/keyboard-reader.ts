/**
 * One input reader for physical keyboards and mobile soft keyboards.
 *
 * Android Gboard commonly reports `key="Unidentified"` / keyCode 229 while
 * putting the actual English-QWERTY character in beforeinput or input. This
 * class intentionally treats keydown as the physical-keyboard path and
 * beforeinput/input as the soft-keyboard path, then deduplicates the browser
 * event pairs at their boundary.
 */
import { LayoutResolver, type Resolved } from '../layouts/resolver';
import type { PhysicalLayout } from '../layouts/qwerty';

export interface KeyboardReaderHandlers {
  onUnit: (unit: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
}

/** Output from one DOM event. Used by Tools → Phone keyboard test. */
export interface ReaderOutput {
  units: string[];
  backspace: boolean;
  enter: boolean;
}

const EMPTY_OUTPUT: ReaderOutput = { units: [], backspace: false, enter: false };

function emptyOutput(): ReaderOutput {
  // Do not share the `units` array between calls — the debug page retains it.
  return { units: [], backspace: false, enter: false };
}

function inputElement(e: Event): HTMLInputElement | null {
  return e.currentTarget instanceof HTMLInputElement ? e.currentTarget : null;
}

/**
 * InputEvent.keyCode is legacy but crucial for diagnosing Android 229 input.
 * It is optional in modern typings and absent from ordinary InputEvents.
 */
export function keyCodeOf(e: Event): number | null {
  const candidate = e as Event & { keyCode?: unknown; which?: unknown };
  if (typeof candidate.keyCode === 'number') return candidate.keyCode;
  if (typeof candidate.which === 'number') return candidate.which;
  return null;
}

/**
 * A robust, reusable input path. `setLayout` always updates the one resolver
 * used by both event routes; there is no second Hindi soft-keyboard table.
 */
export class KeyboardInputReader {
  private resolver: LayoutResolver;
  private handlers: KeyboardReaderHandlers;
  private physicalPending = false;
  private skipNextInput = false;
  private compositionActive = false;
  private compositionText = '';
  private suppressCompositionCommit: string | null = null;
  private previousInputValue = '';

  constructor(layout: PhysicalLayout, handlers: KeyboardReaderHandlers) {
    this.resolver = new LayoutResolver(layout);
    this.handlers = handlers;
  }

  setLayout(layout: PhysicalLayout): void {
    this.resolver.setLayout(layout);
  }

  setHandlers(handlers: KeyboardReaderHandlers): void {
    this.handlers = handlers;
  }

  /** Physical USB/Bluetooth keyboard route (`event.code` for Hindi). */
  onKeyDown(e: KeyboardEvent): ReaderOutput {
    const out = this.resolver.resolve(e);
    if (out.kind === 'ignore' || out.kind === 'tab') return EMPTY_OUTPUT;

    e.preventDefault();
    this.physicalPending = true;
    this.expireFlag('physicalPending');
    const result = this.dispatchResolved(out);
    this.clearInput(inputElement(e));
    return result;
  }

  /**
   * Preferred soft-keyboard route. With a data payload it is the most exact
   * answer; when data is missing we let the following `input` value diff read
   * it instead. Composition drafts are deliberately not emitted here.
   */
  onBeforeInput(e: InputEvent): ReaderOutput {
    const target = inputElement(e);
    const type = e.inputType;

    if (this.physicalPending) {
      this.physicalPending = false;
      this.skipNextInput = true;
      this.expireFlag('skipNextInput');
      e.preventDefault();
      this.clearInput(target);
      return EMPTY_OUTPUT;
    }

    if (type === 'insertCompositionText' || e.isComposing || this.compositionActive) {
      if (typeof e.data === 'string') this.compositionText = e.data;
      return EMPTY_OUTPUT;
    }

    if (type === 'deleteContentBackward') {
      e.preventDefault();
      this.skipNextInput = true;
      this.expireFlag('skipNextInput');
      this.clearInput(target);
      return this.dispatchBackspace();
    }

    if (type === 'insertLineBreak' || type === 'insertParagraph') {
      e.preventDefault();
      this.skipNextInput = true;
      this.expireFlag('skipNextInput');
      this.clearInput(target);
      return this.dispatchEnter();
    }

    if (type !== 'insertText') return EMPTY_OUTPUT;
    const data = typeof e.data === 'string' ? e.data : '';

    // Some IMEs emit compositionend and then a final insertText. The commit
    // was already handled on compositionend, so consume exactly that echo.
    if (this.isCompositionEcho(data)) {
      this.suppressCompositionCommit = null;
      this.skipNextInput = true;
      this.expireFlag('skipNextInput');
      e.preventDefault();
      this.clearInput(target);
      return EMPTY_OUTPUT;
    }

    if (!data) return EMPTY_OUTPUT;
    e.preventDefault();
    this.skipNextInput = true;
    this.expireFlag('skipNextInput');
    this.clearInput(target);
    return this.dispatchText(data);
  }

  /**
   * Fallback for Android/iOS browsers that only provide data/value on `input`.
   * The native value is diffed before it is cleared, so an English "k" cannot
   * be left sitting in the hidden field or leak into the typing stream.
   */
  onInput(e: InputEvent): ReaderOutput {
    const target = inputElement(e);
    const type = e.inputType;

    if (this.compositionActive || e.isComposing || type === 'insertCompositionText') {
      if (target) this.previousInputValue = target.value;
      if (typeof e.data === 'string') this.compositionText = e.data;
      return EMPTY_OUTPUT;
    }

    if (this.physicalPending) {
      this.physicalPending = false;
      this.clearInput(target);
      return EMPTY_OUTPUT;
    }
    if (this.skipNextInput) {
      this.skipNextInput = false;
      this.clearInput(target);
      return EMPTY_OUTPUT;
    }

    if (type === 'deleteContentBackward') {
      this.clearInput(target);
      return this.dispatchBackspace();
    }
    if (type === 'insertLineBreak' || type === 'insertParagraph') {
      this.clearInput(target);
      return this.dispatchEnter();
    }
    if (type !== 'insertText' && type !== '') {
      this.clearInput(target);
      return EMPTY_OUTPUT;
    }

    const data = typeof e.data === 'string' && e.data ? e.data : this.insertedValueDiff(target?.value ?? '');
    if (this.isCompositionEcho(data)) {
      this.suppressCompositionCommit = null;
      this.clearInput(target);
      return EMPTY_OUTPUT;
    }
    this.clearInput(target);
    return data ? this.dispatchText(data) : EMPTY_OUTPUT;
  }

  onCompositionStart(e: CompositionEvent): ReaderOutput {
    this.compositionActive = true;
    this.compositionText = '';
    this.previousInputValue = inputElement(e)?.value ?? '';
    return EMPTY_OUTPUT;
  }

  onCompositionUpdate(e: CompositionEvent): ReaderOutput {
    if (typeof e.data === 'string') this.compositionText = e.data;
    const target = inputElement(e);
    if (target) this.previousInputValue = target.value;
    return EMPTY_OUTPUT;
  }

  /**
   * Commit once at compositionend. A following insertText/input echo is
   * suppressed above; intermediate insertCompositionText drafts never reach
   * the engine.
   */
  onCompositionEnd(e: CompositionEvent): ReaderOutput {
    this.compositionActive = false;
    const target = inputElement(e);
    const text = typeof e.data === 'string' && e.data ? e.data : this.compositionText || target?.value || '';
    this.compositionText = '';
    this.clearInput(target);
    if (!text) return EMPTY_OUTPUT;

    this.suppressCompositionCommit = text;
    this.expireFlag('suppressCompositionCommit');
    return this.dispatchText(text);
  }

  private dispatchResolved(out: Resolved): ReaderOutput {
    if (out.kind === 'char') return this.dispatchUnit(out.unit);
    if (out.kind === 'backspace') return this.dispatchBackspace();
    if (out.kind === 'enter') return this.dispatchEnter();
    return EMPTY_OUTPUT;
  }

  private dispatchText(text: string): ReaderOutput {
    const units = this.resolver.resolveSoftText(text);
    const out = emptyOutput();
    for (const unit of units) {
      this.handlers.onUnit(unit);
      out.units.push(unit);
    }
    return out;
  }

  private dispatchUnit(unit: string): ReaderOutput {
    this.handlers.onUnit(unit);
    return { units: [unit], backspace: false, enter: false };
  }

  private dispatchBackspace(): ReaderOutput {
    this.handlers.onBackspace();
    return { units: [], backspace: true, enter: false };
  }

  private dispatchEnter(): ReaderOutput {
    this.handlers.onEnter?.();
    return { units: [], backspace: false, enter: true };
  }

  private insertedValueDiff(next: string): string {
    const previous = this.previousInputValue;
    this.previousInputValue = next;
    return next.startsWith(previous) ? next.slice(previous.length) : next;
  }

  private isCompositionEcho(text: string): boolean {
    return !!text && !!this.suppressCompositionCommit && text === this.suppressCompositionCommit;
  }

  /** Reset after every finished press; never leave English text in the input. */
  private clearInput(target: HTMLInputElement | null): void {
    if (target) target.value = '';
    this.previousInputValue = '';
  }

  /** Browser input/beforeinput pairs are synchronous; stale latches are not. */
  private expireFlag(flag: 'physicalPending' | 'skipNextInput' | 'suppressCompositionCommit'): void {
    queueMicrotask(() => {
      if (flag === 'physicalPending') this.physicalPending = false;
      else if (flag === 'skipNextInput') this.skipNextInput = false;
      else this.suppressCompositionCommit = null;
    });
  }
}
