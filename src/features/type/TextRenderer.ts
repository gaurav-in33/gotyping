/**
 * Imperative text renderer for the typing hot path (docs/02).
 *
 * Contract honoured here:
 *  - one span per unit, built once per text change;
 *  - positions measured ONCE per render (and on resize/font change), never
 *    per keystroke;
 *  - a keystroke touches only the units that actually changed;
 *  - the caret and the line scroll move via `transform` inside one rAF batch;
 *  - no allocation per keystroke beyond a couple of numbers.
 *
 * Preact owns the surrounding chrome; this class owns the text subtree.
 */
import { UNIT_CORRECT, UNIT_SKIPPED, UNIT_WRONG } from '../../core/engine/metrics';

const CLASS_BY_STATE: Record<number, string> = {
  0: 'u',
  1: 'u u--ok',
  2: 'u u--bad',
  3: 'u u--skip',
};

export interface RendererOptions {
  /** Blind mode: no correct/incorrect feedback while typing. */
  blind?: boolean;
  /** How many lines to keep visible. */
  visibleLines?: number;
}

export class TextRenderer {
  private root: HTMLElement | null = null;
  private scroller: HTMLElement | null = null;
  private caret: HTMLElement | null = null;

  private spans: HTMLElement[] = [];

  /** Cached geometry — the only place layout is read. */
  private left: Float64Array = new Float64Array(0);
  private top: Float64Array = new Float64Array(0);
  private width: Float64Array = new Float64Array(0);
  private lineHeight = 0;

  private lastPos = 0;
  private lastStates: Uint8Array = new Uint8Array(0);
  private frame = 0;
  private pendingPos = 0;
  private opts: RendererOptions = {};

  mount(root: HTMLElement, opts: RendererOptions = {}): void {
    this.root = root;
    this.opts = opts;
    root.innerHTML = '';

    const scroller = document.createElement('div');
    scroller.className = 'text__scroll';

    const caret = document.createElement('div');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');

    scroller.appendChild(caret);
    root.appendChild(scroller);

    this.scroller = scroller;
    this.caret = caret;
  }

  setOptions(opts: RendererOptions): void {
    this.opts = { ...this.opts, ...opts };
  }

  /** Rebuild the span tree. Called on new text, not on keystrokes. */
  setText(units: readonly string[]): void {
    if (!this.scroller || !this.caret) return;
    this.spans = new Array(units.length);

    const frag = document.createDocumentFragment();
    let word = document.createElement('span');
    word.className = 'word';

    for (let i = 0; i < units.length; i++) {
      const ch = units[i]!;
      const span = document.createElement('span');
      span.className = 'u';
      // A space needs a visible box for the caret to sit on.
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      if (ch === '\n') span.className = 'u u--newline';
      this.spans[i] = span;
      word.appendChild(span);

      if (ch === ' ' || ch === '\n') {
        frag.appendChild(word);
        word = document.createElement('span');
        word.className = 'word';
      }
    }
    if (word.childNodes.length > 0) frag.appendChild(word);

    // Replace everything except the caret element.
    while (this.scroller.firstChild) this.scroller.removeChild(this.scroller.firstChild);
    this.scroller.appendChild(this.caret);
    this.scroller.appendChild(frag);

    this.lastStates = new Uint8Array(units.length);
    this.lastPos = 0;
    this.measure();
  }

  /** Append units without rebuilding what is already on screen (time mode). */
  appendText(units: readonly string[], fromIndex: number): void {
    if (!this.scroller) return;
    const frag = document.createDocumentFragment();
    let word = document.createElement('span');
    word.className = 'word';
    const next: HTMLElement[] = this.spans.slice();

    for (let i = fromIndex; i < units.length; i++) {
      const ch = units[i]!;
      const span = document.createElement('span');
      span.className = 'u';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      next[i] = span;
      word.appendChild(span);
      if (ch === ' ') {
        frag.appendChild(word);
        word = document.createElement('span');
        word.className = 'word';
      }
    }
    if (word.childNodes.length > 0) frag.appendChild(word);

    this.scroller.appendChild(frag);
    this.spans = next;

    const grown = new Uint8Array(units.length);
    grown.set(this.lastStates, 0);
    this.lastStates = grown;
    this.measure();
  }

  /**
   * Read layout once and cache every unit's position.
   * Called after a text change, on resize and on font/width changes only.
   */
  measure(): void {
    const n = this.spans.length;
    this.left = new Float64Array(n);
    this.top = new Float64Array(n);
    this.width = new Float64Array(n);
    let maxH = 0;
    for (let i = 0; i < n; i++) {
      const el = this.spans[i]!;
      this.left[i] = el.offsetLeft;
      this.top[i] = el.offsetTop;
      this.width[i] = el.offsetWidth;
      if (el.offsetHeight > maxH) maxH = el.offsetHeight;
    }
    this.lineHeight = maxH || 0;
    this.applyCaret(this.lastPos);
  }

  /**
   * Apply new engine state. Only the units between the previous and the new
   * caret position can have changed, so that is all we touch.
   */
  update(states: Uint8Array, pos: number): void {
    const n = this.spans.length;
    if (n === 0) return;

    const lo = Math.max(0, Math.min(this.lastPos, pos) - 1);
    const hi = Math.min(n - 1, Math.max(this.lastPos, pos));
    const blind = this.opts.blind === true;

    for (let i = lo; i <= hi; i++) {
      const s = states[i]!;
      if (s === this.lastStates[i]) continue;
      this.lastStates[i] = s;
      const el = this.spans[i]!;
      if (blind && (s === UNIT_CORRECT || s === UNIT_WRONG || s === UNIT_SKIPPED)) {
        el.className = 'u u--blind';
      } else {
        el.className = CLASS_BY_STATE[s] ?? 'u';
      }
    }

    this.lastPos = pos;
    this.applyCaret(pos);
  }

  /** Full repaint — used after restart, blind reveal or an options change. */
  refresh(states: Uint8Array, pos: number): void {
    const blind = this.opts.blind === true;
    for (let i = 0; i < this.spans.length; i++) {
      const s = states[i] ?? 0;
      this.lastStates[i] = s;
      const el = this.spans[i]!;
      el.className =
        blind && s !== 0 ? 'u u--blind' : (CLASS_BY_STATE[s] ?? 'u');
    }
    this.lastPos = pos;
    this.applyCaret(pos);
  }

  /** Batch caret + scroll into a single animation frame. */
  private applyCaret(pos: number): void {
    this.pendingPos = pos;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.paintCaret(this.pendingPos);
    });
  }

  private paintCaret(pos: number): void {
    if (!this.caret || !this.scroller) return;
    const n = this.spans.length;
    if (n === 0) return;

    let x: number;
    let y: number;
    if (pos < n) {
      x = this.left[pos]!;
      y = this.top[pos]!;
    } else {
      // Past the last unit: sit just after it.
      const last = n - 1;
      x = this.left[last]! + this.width[last]!;
      y = this.top[last]!;
    }

    this.caret.style.transform = `translate(${x}px, ${y}px)`;
    this.caret.style.height = `${this.lineHeight}px`;

    // Keep the active line as the second visible line.
    const lines = Math.max(1, this.opts.visibleLines ?? 3);
    const lineIndex = this.lineHeight > 0 ? Math.round(y / this.lineHeight) : 0;
    const firstVisible = Math.max(0, lineIndex - Math.floor((lines - 1) / 2));
    const offset = firstVisible * this.lineHeight;
    this.scroller.style.transform = `translateY(${-offset}px)`;
  }

  destroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.spans = [];
    if (this.root) this.root.innerHTML = '';
    this.root = null;
    this.scroller = null;
    this.caret = null;
  }
}
