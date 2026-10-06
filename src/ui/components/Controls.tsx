import type { ComponentChildren } from 'preact';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ComponentChildren;
}) {
  return (
    <div class="field">
      <div class="field__text">
        <span class="field__label">{label}</span>
        {hint ? <span class="field__hint">{hint}</span> : null}
      </div>
      <div class="field__control">{children}</div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class="toggle"
      onClick={() => onChange(!checked)}
    >
      <span class="toggle__dot" />
    </button>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  suffix?: string;
}) {
  return (
    <div class="slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      />
      <span class="slider__value">
        {value}
        {suffix ?? ''}
      </span>
    </div>
  );
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <select
      class="btn btn--sm"
      aria-label={label}
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value as T)}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Category({
  title,
  children,
  advanced,
}: {
  title: string;
  children: ComponentChildren;
  advanced?: ComponentChildren;
}) {
  return (
    <section class="panel settings__cat" aria-label={title}>
      <h2 class="settings__title">{title}</h2>
      {children}
      {advanced ? (
        <details class="disclosure">
          <summary>Show advanced</summary>
          <div class="settings__advanced">{advanced}</div>
        </details>
      ) : null}
    </section>
  );
}
