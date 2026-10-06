/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { render, type ComponentChildren } from 'preact';
import { KeyboardGuide } from '../src/features/type/KeyboardGuide';
import { INSCRIPT } from '../src/core/layouts/hindi';
import { QWERTY } from '../src/core/layouts/qwerty';

const containers: HTMLElement[] = [];

function mount(node: ComponentChildren): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  render(node, container);
  return container;
}

afterEach(() => {
  for (const container of containers.splice(0)) {
    render(null, container);
    container.remove();
  }
});

describe('keyboard guide', () => {
  it('shows normal and Shift layers and highlights Shift with an English capital', () => {
    const root = mount(
      <KeyboardGuide
        layout={QWERTY}
        nextChar="A"
        visible
        onVisibleChange={() => {}}
        highlightNextKey
        showKeyLabels
      />,
    );
    const next = root.querySelector('[data-code="KeyA"]')!;
    expect(next.className).toContain('kbd-diagram__key--next');
    expect(next.querySelector('.kbd-diagram__glyph')?.textContent).toBe('a');
    expect(next.querySelector('.kbd-diagram__sub')?.textContent).toBe('A');
    expect(root.querySelector('.keyboard-guide__shift--next')).toBeTruthy();
  });

  it('uses the InScript Shift layer and stays non-interactive by default', () => {
    const root = mount(
      <KeyboardGuide
        layout={INSCRIPT}
        nextChar="ख"
        visible
        onVisibleChange={() => {}}
        highlightNextKey
        showKeyLabels
      />,
    );
    const key = root.querySelector('[data-code="KeyK"]')!;
    expect(key.tagName).toBe('SPAN');
    expect(key.querySelector('.kbd-diagram__glyph')?.textContent).toBe('क');
    expect(key.querySelector('.kbd-diagram__sub')?.textContent).toBe('ख');
    expect(key.className).toContain('kbd-diagram__key--next');
    expect(root.querySelector('.keyboard-guide__shift--next')).toBeTruthy();
  });
});
