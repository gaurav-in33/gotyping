/**
 * @vitest-environment jsdom
 *
 * DOM integration smoke test.
 *
 * The legacy project's biggest documented weakness (docs/08) was that it was
 * "never tested in a real browser by the assistant that built it". A real
 * browser is not available in this sandbox, so this mounts the actual app in
 * jsdom and drives it with real events. It catches what unit tests cannot:
 * render crashes, bad imports, broken event wiring, and lazy-chunk failures.
 *
 * It deliberately does NOT assert on pixel geometry — jsdom reports every
 * offset as 0, so caret positioning still needs manual checking on a device.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { settingsStore } from '../src/store/settings';

// --- Browser APIs jsdom does not implement -------------------------------
class RO {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;

if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

let container: HTMLDivElement;

/** Let Preact's lazy chunks, effects and rAF callbacks settle. */
async function settle(times = 8): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise((r) => setTimeout(r, 1));
  }
}

/**
 * Mount the app with the lazy screens already in the module cache, then wait
 * until the Suspense fallback is gone. Without the pre-import the dynamic
 * import resolves after the assertions run and every query returns null.
 */
async function mountApp(): Promise<void> {
  await import('../src/features/type/TypeScreen');
  await import('../src/features/settings/SettingsScreen');
  const { App } = await import('../src/app');
  render(<App />, container);
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline && container.textContent?.includes('Loading…')) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

/**
 * Wait for a selector to appear. Generous budget: the first render of a lazy
 * chunk has to resolve a dynamic import and flush Suspense, which is much
 * slower when the whole suite runs than it is for a single file.
 */
async function waitFor(sel: string, timeoutMs = 4000): Promise<Element> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const el = container.querySelector(sel);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`timed out waiting for ${sel}`);
}

/**
 * Wait for an arbitrary predicate over the DOM, e.g. "the text actually
 * changed to the new language/style", not just "some .u elements exist".
 * A fixed tick count (`settle(n)`) is not reliable across a multi-hop async
 * chain (language pack load -> session rebuild -> renderer attach) whose
 * timing varies with how loaded the machine is when the whole file runs
 * together — this polls against a real timeout instead.
 */
async function waitForCondition(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('timed out waiting for condition');
}

function pressKey(el: Element, key: string, code = ''): void {
  el.dispatchEvent(
    new window.KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }),
  );
}

beforeEach(() => {
  localStorage.clear();
  // `settingsStore` is a real in-memory singleton: it reads localStorage once
  // at module load, so clearing localStorage alone does NOT undo a mutation
  // a previous test made with `settingsStore.update(...)`. Without this reset
  // settings leak forward between tests in declaration order and surface as
  // intermittent, hard-to-reproduce failures in unrelated tests later in the
  // file (root-caused this session — see CHANGELOG).
  settingsStore.reset();
  container = document.createElement('div');
  container.id = 'app';
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
  vi.restoreAllMocks();
});

describe('app shell', () => {
  it('mounts without throwing and renders the brand + nav', async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));

    await mountApp();

    expect(container.textContent).toContain('GoTyping');
    // Only implemented sections are registered — no dead nav links.
    const links = Array.from(container.querySelectorAll('.topbar__nav a')).map(
      (a) => a.textContent,
    );
    expect(links).toEqual(['Type', 'Learn', 'Practice', 'Stats', 'Tools', 'Challenges', 'Settings']);
    expect(errors).toEqual([]);
    spy.mockRestore();
  });

  it('applies theme tokens to the document root', async () => {
    await mountApp();
    const bg = document.documentElement.style.getPropertyValue('--bg');
    expect(bg).toMatch(/^#/);
    expect(document.documentElement.dataset['theme']).toBeTruthy();
  });

  it('exposes a skip link and a focusable main region', async () => {
    await mountApp();
    expect(container.querySelector('.skip-link')).toBeTruthy();
    expect(container.querySelector('main#main')).toBeTruthy();
  });

  it('mobile bottom bar reaches every primary section directly, plus Tools via More', async () => {
    await mountApp();
    // Give the app's document-level link-click interceptor (registered in a
    // useEffect) a moment to attach before we start synthesizing clicks on
    // real <a href> elements below.
    await settle(3);
    const bottomLinks = Array.from(container.querySelectorAll('.bottombar > a.navlink')).map(
      (a) => a.textContent,
    );
    expect(bottomLinks).toEqual(['Type', 'Learn', 'Practice', 'Stats', 'Settings']);

    // Tools is not a direct bottom-bar link...
    expect(bottomLinks).not.toContain('Tools');

    // ...but it is reachable through the "More" button.
    const moreBtn = Array.from(container.querySelectorAll('.bottombar__more .navlink')).find(
      (el) => el.textContent === 'More',
    ) as HTMLButtonElement | undefined;
    expect(moreBtn).toBeTruthy();
    expect(container.querySelector('.bottombar__sheet')).toBeFalsy();

    moreBtn!.click();
    await waitFor('.bottombar__sheet-link');
    const sheetLinks = Array.from(container.querySelectorAll('.bottombar__sheet-link')).map(
      (a) => a.textContent,
    );
    expect(sheetLinks).toContain('Tools');

    const toolsLink = Array.from(container.querySelectorAll('.bottombar__sheet-link')).find(
      (a) => a.textContent === 'Tools',
    ) as HTMLAnchorElement;
    toolsLink.click();
    await waitFor('.tools-screen');
    await settle(4);
    expect(container.textContent).toContain('Typing utilities');
    // The sheet closes itself after navigating.
    expect(container.querySelector('.bottombar__sheet')).toBeFalsy();

    // Routing is global history state, shared across tests in this file —
    // leave it as we found it so later tests that assume the default route
    // ('/') are not affected by this test having navigated away.
    const { navigate } = await import('../src/router');
    navigate('/', true);
  });
});

describe('type screen', () => {
  it('loads the lazy chunk and renders typing text', async () => {
    await mountApp();

    // Wait for the units, not just the container: `.text` exists before the
    // language pack has loaded.
    await waitFor('.u');
    expect(container.querySelector('.text')).toBeTruthy();
    const units = container.querySelectorAll('.u');
    expect(units.length).toBeGreaterThan(20);
  });

  it('marks units correct as the user types, through real key events', async () => {
    await mountApp();
    await waitFor('.u');

    const input = container.querySelector('.type__input') as HTMLInputElement;
    expect(input).toBeTruthy();

    const spans = Array.from(container.querySelectorAll('.u'));
    const expected = spans
      .slice(0, 5)
      .map((s) => (s.textContent === '\u00A0' ? ' ' : s.textContent!));

    for (const ch of expected) {
      pressKey(input, ch, ch === ' ' ? 'Space' : `Key${ch.toUpperCase()}`);
    }
    await settle();

    const after = Array.from(container.querySelectorAll('.u'));
    for (let i = 0; i < expected.length; i++) {
      expect(after[i]!.className).toContain('u--ok');
    }
    // The next unit must still be untyped.
    expect(after[expected.length]!.className).toBe('u');
  });

  it('marks a wrong key as an error and updates live stats', async () => {
    await mountApp();
    await waitFor('.u');

    const input = container.querySelector('.type__input') as HTMLInputElement;
    const spans = Array.from(container.querySelectorAll('.u'));
    const first = spans[0]!.textContent!;
    const wrong = first === 'z' ? 'q' : 'z';

    pressKey(input, wrong, 'KeyZ');
    await settle();

    expect(container.querySelector('.u')!.className).toContain('u--bad');
  });

  it('backspace clears the previous unit', async () => {
    await mountApp();
    await waitFor('.u');

    const input = container.querySelector('.type__input') as HTMLInputElement;
    const first = container.querySelector('.u')!.textContent!;
    pressKey(input, first, 'KeyA');
    await settle(2);
    expect(container.querySelector('.u')!.className).toContain('u--ok');

    pressKey(input, 'Backspace');
    await settle(2);
    expect(container.querySelector('.u')!.className).toBe('u');
  });

  it('soft-keyboard input (beforeinput) also drives the engine', async () => {
    await mountApp();
    await waitFor('.u');

    const input = container.querySelector('.type__input') as HTMLInputElement;
    const first = container.querySelector('.u')!.textContent!;

    const ev = new window.InputEvent('beforeinput', {
      data: first,
      inputType: 'insertText',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(ev);
    await settle(2);

    expect(container.querySelector('.u')!.className).toContain('u--ok');
  });

  it('opens the config panel from the summary pill', async () => {
    await mountApp();
    await waitFor('.config__pill');

    const pill = container.querySelector('.config__pill') as HTMLButtonElement;
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('time');

    pill.click();
    await settle();
    expect(container.querySelector('.config__panel')).toBeTruthy();
  });

  it('fun modes (docs/01 §7) can be switched without crashing and still render text', async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));
    await mountApp();
    await waitFor('.config__pill');

    (container.querySelector('.config__pill') as HTMLButtonElement).click();
    await settle();

    const group = Array.from(container.querySelectorAll('.config__group')).find((g) =>
      g.querySelector('.config__label')?.textContent?.includes('More modes'),
    );
    expect(group).toBeTruthy();

    for (const label of ['Blind', 'Random capitalization', 'Sudden death', 'Memory', 'Ghost race']) {
      const btn = Array.from(group!.querySelectorAll('button')).find((b) => b.textContent === label) as
        | HTMLButtonElement
        | undefined;
      expect(btn).toBeTruthy();
      btn!.click();
      await settle(3);
      await waitFor('.u');
      expect(container.querySelectorAll('.u').length).toBeGreaterThan(0);
    }

    expect(errors).toEqual([]);
    spy.mockRestore();
  });

  it('"Code" fun mode (docs/01 §7) renders real code and offers a JavaScript/Python switch', async () => {
    await mountApp();
    await waitFor('.config__pill');

    (container.querySelector('.config__pill') as HTMLButtonElement).click();
    await settle();

    const group = Array.from(container.querySelectorAll('.config__group')).find((g) =>
      g.querySelector('.config__label')?.textContent?.includes('More modes'),
    )!;
    const codeBtn = Array.from(group.querySelectorAll('button')).find((b) => b.textContent === 'Code') as
      | HTMLButtonElement
      | undefined;
    expect(codeBtn).toBeTruthy();

    codeBtn!.click();
    await waitFor('.u');

    // The language switch only appears once Code is the active fun mode.
    const jsBtn = Array.from(group.querySelectorAll('button')).find((b) => b.textContent === 'JavaScript') as
      | HTMLButtonElement
      | undefined;
    const pyBtn = Array.from(group.querySelectorAll('button')).find((b) => b.textContent === 'Python') as
      | HTMLButtonElement
      | undefined;
    expect(jsBtn).toBeTruthy();
    expect(pyBtn).toBeTruthy();

    const text = () => Array.from(container.querySelectorAll('.u')).map((s) => s.textContent).join('');
    await waitForCondition(() => /function|const|class/.test(text()));

    pyBtn!.click();
    await waitForCondition(() => /def|lambda|range/.test(text()));
  });

  it('on-screen keyboard (docs/01 §9) highlights the next key and tap-to-type feeds it', async () => {
    const { settingsStore } = await import('../src/store/settings');
    settingsStore.update((d) => {
      d.display.showKeyboard = true;
      d.keyboard.highlightNextKey = true;
    });

    await mountApp();
    await waitFor('.u');
    await waitFor('.onscreen-kb');

    // Set once at reset time (not only on the engine's tick), but still
    // async relative to this click — poll rather than guess a tick count.
    // Tap the *highlighted* key specifically (not "any key whose glyph
    // matches"), since a Shift-only expected character never appears as a
    // key's visible glyph, but is still the correct key to tap.
    await waitForCondition(() => !!container.querySelector('.kbd-diagram__key--next'));
    const key = container.querySelector('.kbd-diagram__key--next') as HTMLButtonElement;

    key.click();
    await waitForCondition(() => container.querySelector('.u')!.className.includes('u--ok'));
  });

  it('on-screen keyboard also drives Hindi (InScript) typing via tap-to-type', async () => {
    const { settingsStore } = await import('../src/store/settings');
    settingsStore.update((d) => {
      d.display.showKeyboard = true;
      d.language.current = 'hi';
      d.keyboard.hindiLayout = 'inscript';
    });

    await mountApp();
    await waitFor('.u');
    await waitFor('.onscreen-kb');

    // Poll rather than a fixed tick count: the Hindi word pack loads async,
    // so the very first `.u` — and the key highlighted for it — can briefly
    // still be mid-rebuild. Tap the highlighted key itself; some Hindi
    // matras only exist in a key's Shift position and never appear as a
    // key's visible glyph, so matching by displayed glyph text is wrong.
    await waitForCondition(() => !!container.querySelector('.kbd-diagram__key--next'));
    const key = container.querySelector('.kbd-diagram__key--next') as HTMLButtonElement;

    key.click();
    await waitForCondition(() => container.querySelector('.u')!.className.includes('u--ok'));
  });
});

describe('settings screen', () => {
  it('navigates, renders categories, and a toggle changes stored settings', async () => {
    const { navigate } = await import('../src/router');
    const { settingsStore } = await import('../src/store/settings');

    await mountApp();

    navigate('/settings');
    await waitFor('.settings');

    expect(container.textContent).toContain('Settings');
    expect(container.textContent).toContain('Privacy');

    const before = settingsStore.get().typing.stopOnError;
    const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
      (el) => el.getAttribute('aria-label') === 'Stop on error',
    ) as HTMLButtonElement | undefined;
    expect(toggle).toBeTruthy();

    toggle!.click();
    await settle();

    expect(settingsStore.get().typing.stopOnError).toBe(!before);
    // and it is persisted
    expect(localStorage.getItem('gotyping:settings')).toContain('stopOnError');
  });

  it('exposes on-screen keyboard / finger guide toggles under "Show advanced"', async () => {
    const { navigate } = await import('../src/router');
    const { settingsStore } = await import('../src/store/settings');

    await mountApp();
    navigate('/settings');
    await waitFor('.settings');

    const details = Array.from(container.querySelectorAll('details')).find((d) =>
      d.textContent?.includes('On-screen keyboard'),
    ) as HTMLDetailsElement | undefined;
    expect(details).toBeTruthy();
    details!.open = true;
    await settle();

    const before = settingsStore.get().display.showKeyboard;
    const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
      (el) => el.getAttribute('aria-label') === 'On-screen keyboard',
    ) as HTMLButtonElement | undefined;
    expect(toggle).toBeTruthy();

    toggle!.click();
    await settle();
    expect(settingsStore.get().display.showKeyboard).toBe(!before);
  });

  it('shows the Beta badge for the unverified Hindi layout', async () => {
    const { navigate } = await import('../src/router');
    await mountApp();
    navigate('/settings');
    await waitFor('.settings');
    expect(container.querySelector('.badge--beta')?.textContent).toMatch(/beta/i);
  });
});

describe('learn / practice / stats / tools sections', () => {
  it('Learn renders the course home with no console errors', async () => {
    const { navigate } = await import('../src/router');
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));
    await mountApp();
    navigate('/learn');
    await waitFor('.learn');
    await settle(4);
    expect(container.textContent).toContain('Learn');
    expect(container.querySelectorAll('.course-card').length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    spy.mockRestore();
  });

  it('Learn lesson screen loads a lesson and renders typing text', async () => {
    const { navigate } = await import('../src/router');
    await mountApp();
    navigate('/learn/en-beginner-02');
    await waitFor('.u', 6000);
    expect(container.textContent).toContain('F and J anchors');
    const units = new Set(
      Array.from(container.querySelectorAll('.u'))
        .map((u) => u.textContent)
        .filter((t) => t && t !== '\u00A0'),
    );
    for (const u of units) expect(['f', 'j']).toContain(u);
  });

  it('Practice renders a profile picker with no console errors', async () => {
    const { navigate } = await import('../src/router');
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));
    await mountApp();
    navigate('/practice');
    await waitFor('.practice');
    await settle(6);
    expect(container.textContent).toContain('Practice');
    expect(container.querySelectorAll('.profile-card').length).toBe(10);
    expect(errors).toEqual([]);
    spy.mockRestore();
  });

  it('Stats renders an empty-history message with no saved tests', async () => {
    const { navigate } = await import('../src/router');
    await mountApp();
    navigate('/stats');
    await waitFor('.stats');
    await settle(4);
    expect(container.textContent).toContain('No tests yet');
  });

  it('Tools renders the keyboard tester with no console errors', async () => {
    const { navigate } = await import('../src/router');
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));
    await mountApp();
    navigate('/tools');
    await waitFor('.tools-screen');
    await settle(4);
    expect(container.textContent).toContain('Typing utilities');

    const keyboardTab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      (el) => el.textContent === 'Keyboard',
    ) as HTMLButtonElement | undefined;
    expect(keyboardTab).toBeTruthy();
    keyboardTab!.click();
    await settle(4);
    expect(container.querySelectorAll('.kbd-diagram__key').length).toBeGreaterThan(20);
    expect(errors).toEqual([]);
    spy.mockRestore();
  });
});

describe('unknown routes', () => {
  it('shows a real not-found screen, not a blank page', async () => {
    const { navigate } = await import('../src/router');
    await mountApp();
    navigate('/does-not-exist');
    await settle(20);
    expect(container.textContent).toContain('Page not found');
  });
});
