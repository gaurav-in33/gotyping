import { useState } from 'preact/hooks';
import { BRAND } from '../../brand';
import { LANGUAGES } from '../../content';
import { HINDI_LAYOUTS, INSCRIPT, INSCRIPT_DISPUTED_CODES, layoutById } from '../../core/layouts/hindi';
import { settingsStore } from '../../store/settings';
import { historyRepo } from '../../store/history';
import { idb, STORES } from '../../store/db';
import { makeBackup, mergeTests, validateBackup } from '../../store/backup';
import { emptyAggregates, type Aggregates, type TestRecord } from '../../store/types';
import { THEMES } from '../../ui/theme/theme';
import { useSettings } from '../../ui/useSettings';
import { Category, Field, Segmented, Select, Slider, Toggle } from '../../ui/components/Controls';
import { Logo } from '../../ui/shell/Wordmark';
import './settings.css';

function ThemePicker({
  value,
  onChange,
  mode,
}: {
  value: string;
  onChange: (id: string) => void;
  mode: 'light' | 'dark';
}) {
  const list = THEMES.filter((t) => t.mode === mode);
  return (
    <div class="theme-grid">
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          class="theme-swatch"
          aria-pressed={value === t.id}
          onClick={() => onChange(t.id)}
        >
          <span class="theme-swatch__dots">
            <span style={{ background: t.tokens['bg'] }} />
            <span style={{ background: t.tokens['accent'] }} />
            <span style={{ background: t.tokens['text'] }} />
          </span>
          {t.name}
        </button>
      ))}
    </div>
  );
}

export default function SettingsScreen() {
  const [s, update] = useSettings();
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const say = (msg: string, error = false): void => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4000);
  };

  const doExport = async (): Promise<void> => {
    try {
      const tests = await historyRepo.all();
      const agg = (await idb.get<Aggregates>(STORES.aggregates, 'global')) ?? emptyAggregates();
      const backup = makeBackup({ settings: s, tests, aggregates: agg });
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gotyping-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      say(`Exported ${tests.length} test(s).`);
    } catch {
      say('Export failed.', true);
    }
  };

  const doImport = (file: File): void => {
    const reader = new FileReader();
    reader.onload = async () => {
      const result = validateBackup(String(reader.result ?? ''));
      if (!result.ok || !result.backup) {
        say(result.errors[0] ?? 'That file is not a valid GoTyping backup.', true);
        return;
      }
      try {
        const existing = await historyRepo.all();
        const merged = mergeTests(existing, result.backup.tests as TestRecord[]);
        for (const t of merged) await idb.put(STORES.tests, t);
        settingsStore.replace(result.backup.settings);
        const notes = result.errors.length > 0 ? ` (${result.errors.join(' ')})` : '';
        say(`Imported — ${merged.length} test(s) after merge.${notes}`);
      } catch {
        say('Import failed while writing to local storage.', true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div class="settings">
      <div class="page-head">
        <h1>Settings</h1>
        <p>Everything here changes how GoTyping behaves. Nothing leaves your device.</p>
      </div>

      <Category
        title="Typing"
        advanced={
          <>
            <Field label="Skip word with space" hint="Space mid-word skips the rest of it">
              <Toggle
                label="Skip word with space"
                checked={s.typing.skipWord}
                onChange={(v) => update((d) => void (d.typing.skipWord = v))}
              />
            </Field>
            <Field label="Tab restarts the test" hint="Off by default so Tab keeps moving focus">
              <Toggle
                label="Tab restarts the test"
                checked={s.typing.tabRestarts}
                onChange={(v) => update((d) => void (d.typing.tabRestarts = v))}
              />
            </Field>
            <Field label="Pause when the window loses focus">
              <Toggle
                label="Pause on blur"
                checked={s.typing.pauseOnBlur}
                onChange={(v) => update((d) => void (d.typing.pauseOnBlur = v))}
              />
            </Field>
            <Field label="Capitalization" hint="Mix capital letters into generated text">
              <Toggle
                label="Capitalization"
                checked={s.typing.capitalization}
                onChange={(v) => update((d) => void (d.typing.capitalization = v))}
              />
            </Field>
          </>
        }
      >
        <Field label="Default mode">
          <Segmented
            label="Default mode"
            value={s.typing.defaultMode}
            options={[
              { id: 'time', label: 'Time' },
              { id: 'words', label: 'Words' },
              { id: 'quote', label: 'Quote' },
              { id: 'custom', label: 'Custom' },
            ]}
            onChange={(v) => update((d) => void (d.typing.defaultMode = v))}
          />
        </Field>
        <Field label="Default duration">
          <Slider
            label="Default duration"
            value={s.typing.defaultTime}
            min={5}
            max={600}
            step={5}
            suffix="s"
            onChange={(v) => update((d) => void (d.typing.defaultTime = v))}
          />
        </Field>
        <Field label="Default word count">
          <Slider
            label="Default word count"
            value={s.typing.defaultWords}
            min={5}
            max={500}
            step={5}
            onChange={(v) => update((d) => void (d.typing.defaultWords = v))}
          />
        </Field>
        <Field label="Punctuation">
          <Toggle
            label="Punctuation"
            checked={s.typing.punctuation}
            onChange={(v) => update((d) => void (d.typing.punctuation = v))}
          />
        </Field>
        <Field label="Numbers">
          <Toggle
            label="Numbers"
            checked={s.typing.numbers}
            onChange={(v) => update((d) => void (d.typing.numbers = v))}
          />
        </Field>
        <Field label="Stop on error" hint="Caret waits until you type the right key">
          <Toggle
            label="Stop on error"
            checked={s.typing.stopOnError}
            onChange={(v) => update((d) => void (d.typing.stopOnError = v))}
          />
        </Field>
        <Field label="Backspace">
          <Segmented
            label="Backspace"
            value={s.typing.backspace}
            options={[
              { id: 'allow', label: 'Free' },
              { id: 'word', label: 'Word only' },
              { id: 'off', label: 'Off' },
            ]}
            onChange={(v) => update((d) => void (d.typing.backspace = v))}
          />
        </Field>
      </Category>

      <Category
        title="Display"
        advanced={
          <>
            <Field label="Line height">
              <Slider
                label="Line height"
                value={s.display.lineHeight}
                min={1.2}
                max={2.4}
                step={0.1}
                onChange={(v) => update((d) => void (d.display.lineHeight = v))}
              />
            </Field>
            <Field label="Letter spacing">
              <Slider
                label="Letter spacing"
                value={s.display.letterSpacing}
                min={0}
                max={6}
                step={0.5}
                suffix="px"
                onChange={(v) => update((d) => void (d.display.letterSpacing = v))}
              />
            </Field>
            <Field label="Text weight">
              <Slider
                label="Text weight"
                value={s.display.textWeight}
                min={300}
                max={700}
                step={100}
                onChange={(v) => update((d) => void (d.display.textWeight = v))}
              />
            </Field>
            <Field label="Caret style">
              <Select
                label="Caret style"
                value={s.display.caretStyle}
                options={[
                  { id: 'line', label: 'Line' },
                  { id: 'block', label: 'Block' },
                  { id: 'underline', label: 'Underline' },
                  { id: 'off', label: 'Off' },
                ]}
                onChange={(v) => update((d) => void (d.display.caretStyle = v))}
              />
            </Field>
            <Field label="Smooth caret">
              <Toggle
                label="Smooth caret"
                checked={s.display.smoothCaret}
                onChange={(v) => update((d) => void (d.display.smoothCaret = v))}
              />
            </Field>
            <Field label="Density">
              <Segmented
                label="Density"
                value={s.display.density}
                options={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                  { id: 'spacious', label: 'Spacious' },
                ]}
                onChange={(v) => update((d) => void (d.display.density = v))}
              />
            </Field>
            <Field label="Live stats shown">
              <div class="field__control">
                {(['wpm', 'accuracy', 'errors', 'timer', 'progress'] as const).map((k) => (
                  <label
                    key={k}
                    style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '.82rem' }}
                  >
                    <input
                      type="checkbox"
                      checked={s.display.liveStats[k]}
                      onChange={(e) =>
                        update(
                          (d) =>
                            void (d.display.liveStats[k] = (e.target as HTMLInputElement).checked),
                        )
                      }
                    />
                    {k}
                  </label>
                ))}
              </div>
            </Field>
          </>
        }
      >
        <Field label="Typing font">
          <Segmented
            label="Typing font"
            value={s.display.font}
            options={[
              { id: 'mono', label: 'Mono' },
              { id: 'sans', label: 'Sans' },
              { id: 'serif', label: 'Serif' },
            ]}
            onChange={(v) => update((d) => void (d.display.font = v))}
          />
        </Field>
        <Field label="Text size">
          <Slider
            label="Text size"
            value={s.display.fontSize}
            min={16}
            max={48}
            suffix="px"
            onChange={(v) => update((d) => void (d.display.fontSize = v))}
          />
        </Field>
        <Field label="Text width">
          <Segmented
            label="Text width"
            value={s.display.textWidth}
            options={[
              { id: 'narrow', label: 'Narrow' },
              { id: 'medium', label: 'Medium' },
              { id: 'wide', label: 'Wide' },
              { id: 'full', label: 'Full' },
            ]}
            onChange={(v) => update((d) => void (d.display.textWidth = v))}
          />
        </Field>
        <Field label="Focus mode" hint="Dim the navigation while you type">
          <Toggle
            label="Focus mode"
            checked={s.display.focusMode}
            onChange={(v) => update((d) => void (d.display.focusMode = v))}
          />
        </Field>
      </Category>

      <Category title="Motion">
        <Field label="Animations">
          <Toggle
            label="Animations"
            checked={s.motion.animations}
            onChange={(v) => update((d) => void (d.motion.animations = v))}
          />
        </Field>
        <Field label="Reduced motion" hint="Also honoured automatically from your OS setting">
          <Toggle
            label="Reduced motion"
            checked={s.motion.reducedMotion}
            onChange={(v) => update((d) => void (d.motion.reducedMotion = v))}
          />
        </Field>
      </Category>

      <Category title="Language and keyboard">
        <Field label="Language">
          <Segmented
            label="Language"
            value={s.language.current}
            options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))}
            onChange={(v) => update((d) => void (d.language.current = v))}
          />
        </Field>
        <Field
          label="Hindi layout"
          hint={
            layoutById(s.keyboard.hindiLayout).verified
              ? 'Every key cross-checked against two independent OS keyboard drivers'
              : 'Some keys are still unconfirmed — see docs/layout-sources.md'
          }
        >
          <div class="field__control">
            <Select
              label="Hindi layout"
              value={s.keyboard.hindiLayout}
              options={HINDI_LAYOUTS.map((l) => ({ id: l.id, label: l.name }))}
              onChange={(v) => update((d) => void (d.keyboard.hindiLayout = v))}
            />
            {!layoutById(s.keyboard.hindiLayout).verified ? (
              <span class="badge badge--beta">Beta</span>
            ) : null}
          </div>
        </Field>
        {s.keyboard.hindiLayout === 'inscript' ? (
          <Field
            label="InScript dispute status"
            hint={`${INSCRIPT_DISPUTED_CODES.length} of ${INSCRIPT.rows.flatMap((r) => r.keys).filter((k) => k.normal).length} mapped keys are unconfirmed (digit row, Period, Z, Backslash, Shift+N) — try them in Tools → Keyboard tester.`}
          >
            <span class="hint">See docs/layout-sources.md</span>
          </Field>
        ) : (
          <Field
            label="Remington status"
            hint="No authoritative chart exists yet — only the digit row is mapped. Not usable for Learn/Type sessions until more keys are verified."
          >
            <span class="hint">See docs/layout-sources.md</span>
          </Field>
        )}
        <Field label="Physical layout">
          <Select
            label="Physical layout"
            value={s.keyboard.physicalLayout}
            options={[{ id: 'qwerty', label: 'QWERTY' }]}
            onChange={(v) => update((d) => void (d.keyboard.physicalLayout = v))}
          />
        </Field>
      </Category>

      <Category title="Accessibility">
        <Field label="High contrast">
          <Toggle
            label="High contrast"
            checked={s.a11y.highContrast}
            onChange={(v) => update((d) => void (d.a11y.highContrast = v))}
          />
        </Field>
        <Field label="Larger text" hint="Scales the whole interface by 15%">
          <Toggle
            label="Larger text"
            checked={s.a11y.largerText}
            onChange={(v) => update((d) => void (d.a11y.largerText = v))}
          />
        </Field>
        <Field label="Strong focus outline">
          <Toggle
            label="Strong focus outline"
            checked={s.a11y.focusVisible}
            onChange={(v) => update((d) => void (d.a11y.focusVisible = v))}
          />
        </Field>
      </Category>

      <Category title="Themes">
        <Field label="Appearance">
          <Segmented
            label="Appearance"
            value={s.theme.appearance}
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'System' },
              { id: 'contrast', label: 'Contrast' },
            ]}
            onChange={(v) => update((d) => void (d.theme.appearance = v))}
          />
        </Field>
        <Field label="Light theme">
          <ThemePicker
            mode="light"
            value={s.theme.lightTheme}
            onChange={(id) => update((d) => void (d.theme.lightTheme = id))}
          />
        </Field>
        <Field label="Dark theme">
          <ThemePicker
            mode="dark"
            value={s.theme.darkTheme}
            onChange={(id) => update((d) => void (d.theme.darkTheme = id))}
          />
        </Field>
      </Category>

      <Category title="Practice">
        <Field label="Difficulty" hint="Share of easy, rhythm-keeping words mixed into adaptive drills">
          <Segmented
            label="Difficulty"
            value={s.practice.difficulty}
            options={[
              { id: 'easy', label: 'Easy · 30%' },
              { id: 'normal', label: 'Normal · 15%' },
              { id: 'hard', label: 'Hard · 5%' },
            ]}
            onChange={(v) => update((d) => void (d.practice.difficulty = v))}
          />
        </Field>
        <Field label="Adaptive practice" hint="Weight drills toward your weak keys/words automatically">
          <Toggle
            label="Adaptive practice"
            checked={s.practice.adaptive}
            onChange={(v) => update((d) => void (d.practice.adaptive = v))}
          />
        </Field>
        <Field label="Target WPM" hint="Used for the pass/fail banner at the end of a test">
          <Slider
            label="Target WPM"
            value={s.practice.targetWpm}
            min={10}
            max={150}
            step={5}
            onChange={(v) => update((d) => void (d.practice.targetWpm = v))}
          />
        </Field>
        <Field label="Target accuracy" hint="Used for the pass/fail banner at the end of a test">
          <Slider
            label="Target accuracy"
            value={s.practice.targetAccuracy}
            min={70}
            max={100}
            suffix="%"
            onChange={(v) => update((d) => void (d.practice.targetAccuracy = v))}
          />
        </Field>
        <Field label="Session length" hint="Default duration for a recommended Practice drill">
          <Slider
            label="Session length"
            value={s.practice.sessionSeconds}
            min={15}
            max={300}
            step={15}
            suffix="s"
            onChange={(v) => update((d) => void (d.practice.sessionSeconds = v))}
          />
        </Field>
      </Category>

      <Category title="Data">
        <Field label="History limit" hint="Oldest tests are dropped past this count">
          <Slider
            label="History limit"
            value={s.data.historyCap}
            min={100}
            max={20000}
            step={100}
            onChange={(v) => update((d) => void (d.data.historyCap = v))}
          />
        </Field>
        <Field label="Export your data" hint="One JSON file with settings, tests and stats">
          <button class="btn btn--sm" type="button" onClick={doExport}>
            Export
          </button>
        </Field>
        <Field label="Import a backup" hint="Merged with what you already have">
          <label class="btn btn--sm">
            Choose file
            <input
              type="file"
              accept="application/json,.json"
              class="sr-only"
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) doImport(f);
              }}
            />
          </label>
        </Field>
        <Field label="Reset settings">
          <button
            class="btn btn--sm"
            type="button"
            onClick={() => {
              settingsStore.reset();
              say('Settings reset to defaults.');
            }}
          >
            Reset
          </button>
        </Field>
        <Field label="Clear all local data" hint="Deletes every saved test and statistic">
          <button
            class="btn btn--sm"
            type="button"
            onClick={async () => {
              if (!confirm('Delete all saved tests and statistics? This cannot be undone.')) return;
              await historyRepo.clear();
              await idb.clear(STORES.aggregates);
              say('All local data cleared.');
            }}
          >
            Clear
          </button>
        </Field>
      </Category>

      <Category title="Privacy">
        <ul class="privacy-list">
          <li>No ads, no analytics, no tracking, no accounts.</li>
          <li>Your typing data never leaves this device.</li>
          <li>No third-party scripts, fonts or CDNs — every request is same-origin.</li>
          <li>Settings live in localStorage; tests and stats live in IndexedDB.</li>
          <li>Export or delete everything at any time, above.</li>
        </ul>
      </Category>

      <Category title="About">
        <div class="about-card">
          <div class="about-card__head">
            <Logo size={28} />
            <span class="about-card__name">
              Go<span style="color:var(--muted)">Typing</span>
            </span>
            <span class="about-card__version">v{BRAND.version}</span>
          </div>
          <p class="about-card__tagline">{BRAND.tagline}</p>
          <p class="hint">
            A from-scratch typing coach: Type, Learn, Practice and Stats for English and
            Hindi, built with an original wordmark and a brand-new codebase.
          </p>
          <ul class="privacy-list">
            <li>English (QWERTY) and Hindi (InScript, Remington Beta) layouts.</li>
            <li>Adaptive Practice learns from your own typing — never anyone else's.</li>
            <li>Everything above runs and stays on this device. See Privacy, below.</li>
          </ul>
        </div>
      </Category>

      {toast ? (
        <div class={`toast${toast.error ? ' toast--error' : ''}`} role="status">
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
