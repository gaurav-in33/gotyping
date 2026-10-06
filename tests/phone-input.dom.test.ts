/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { KeyboardInputReader } from '../src/core/input/keyboard-reader';
import { INSCRIPT } from '../src/core/layouts/hindi';
import { Session, defaultSessionConfig } from '../src/core/engine/session';

let input: HTMLInputElement;
let units: string[];
let backs: number;
let reader: KeyboardInputReader;

function dispatchBefore(data: string | null, inputType = 'insertText', isComposing = false): void {
  input.dispatchEvent(new window.InputEvent('beforeinput', { data, inputType, isComposing, bubbles: true, cancelable: true }));
}

function dispatchInput(data: string | null, inputType = 'insertText', isComposing = false): void {
  input.dispatchEvent(new window.InputEvent('input', { data, inputType, isComposing, bubbles: true, cancelable: true }));
}

function compose(type: 'compositionstart' | 'compositionupdate' | 'compositionend', data: string): void {
  input.dispatchEvent(new window.CompositionEvent(type, { data, bubbles: true, cancelable: true }));
}

beforeEach(() => {
  input = document.createElement('input');
  document.body.appendChild(input);
  units = [];
  backs = 0;
  reader = new KeyboardInputReader(INSCRIPT, {
    onUnit: (unit) => units.push(unit),
    onBackspace: () => backs++,
  });
  input.addEventListener('keydown', (e) => reader.onKeyDown(e));
  input.addEventListener('beforeinput', (e) => reader.onBeforeInput(e as InputEvent));
  input.addEventListener('input', (e) => reader.onInput(e as InputEvent));
  input.addEventListener('compositionstart', (e) => reader.onCompositionStart(e as CompositionEvent));
  input.addEventListener('compositionupdate', (e) => reader.onCompositionUpdate(e as CompositionEvent));
  input.addEventListener('compositionend', (e) => reader.onCompositionEnd(e as CompositionEvent));
});

describe('phone soft-keyboard Hindi input', () => {
  it('maps lower k to क and upper K to the InScript Shift layer ख', () => {
    dispatchBefore('k');
    dispatchBefore('K');
    expect(units).toEqual(['क', 'ख']);
    expect(input.value).toBe('');
  });

  it('maps a QWERTY sequence k then e to का with no Latin leak', () => {
    dispatchBefore('k');
    dispatchBefore('e');
    expect(units.join('')).toBe('का');
    expect(units).not.toContain('k');
    expect(units).not.toContain('e');
  });

  it('maps InScript conjunct sequences through the same physical table', () => {
    // क्ष = k d <, त्र = l d j, ज्ञ = p d }, श्र = M d j
    for (const ch of ['k', 'd', '<', 'l', 'd', 'j', 'p', 'd', '}', 'M', 'd', 'j']) dispatchBefore(ch);
    expect(units.join('')).toBe('क्षत्रज्ञश्र');
  });

  it('accepts an already-Devanagari IME result directly rather than remapping it', () => {
    dispatchBefore('क');
    dispatchBefore('ा');
    expect(units.join('')).toBe('का');
  });

  it('uses input value diff when beforeinput has no data', () => {
    input.value = 'k';
    dispatchInput(null);
    expect(units).toEqual(['क']);
    expect(input.value).toBe('');
  });

  it('handles composition drafts once, then suppresses the final insertText/input echo', () => {
    compose('compositionstart', '');
    dispatchBefore('k', 'insertCompositionText', true);
    input.value = 'k';
    dispatchInput('k', 'insertCompositionText', true);
    compose('compositionupdate', 'k');
    compose('compositionend', 'k');
    dispatchBefore('k');
    input.value = 'k';
    dispatchInput('k');

    expect(units).toEqual(['क']);
    expect(input.value).toBe('');
  });

  it('handles backspace, including input-only fallback', () => {
    dispatchBefore(null, 'deleteContentBackward');
    dispatchInput(null, 'deleteContentBackward');
    expect(backs).toBe(1);
  });

  it('maps Space for skip-word behavior', () => {
    const session = new Session('का क', { ...defaultSessionConfig, skipWord: true });
    const sessionReader = new KeyboardInputReader(INSCRIPT, {
      onUnit: (unit) => session.handleChar(unit, performance.now()),
      onBackspace: () => session.handleBackspace(performance.now()),
    });
    const soft = (data: string): void => {
      const ev = new window.InputEvent('beforeinput', { data, inputType: 'insertText', bubbles: true, cancelable: true });
      // Listener currentTarget is required for the reader's reset; no value is
      // required for data-bearing beforeinput.
      input.addEventListener('beforeinput', (e) => sessionReader.onBeforeInput(e as InputEvent), { once: true });
      input.dispatchEvent(ev);
    };
    soft('k');
    soft(' ');
    expect(session.getPos()).toBe(3); // क + skipped ा + separator space
  });

  it('maps digit and punctuation characters by QWERTY physical key', () => {
    for (const ch of ['1', '!', '.', '>', '/', '?']) dispatchBefore(ch);
    expect(units.join('')).toBe('१!.।यय़');
  });

  it('does not double-count an Android 229 keydown followed by input events', () => {
    const down = new window.KeyboardEvent('keydown', {
      key: 'k', code: 'KeyK', bubbles: true, cancelable: true,
    });
    Object.defineProperty(down, 'keyCode', { value: 229 });
    input.dispatchEvent(down);
    dispatchBefore('k');
    input.value = 'k';
    dispatchInput('k');
    expect(units).toEqual(['क']);
  });
});
