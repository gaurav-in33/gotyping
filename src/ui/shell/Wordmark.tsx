/**
 * Original GoTyping wordmark: a geometric "go" chevron pointing right,
 * with a caret underscore. Simple enough to read at 24 px and as a favicon.
 * Nothing here derives from the old Gku Type mark.
 */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--accent)" />
      <path
        d="M8 7.5 L13 12 L8 16.5"
        stroke="var(--onAccent)"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <rect x="14.5" y="14.8" width="4.5" height="1.9" rx="0.95" fill="var(--onAccent)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <a class="wordmark" href="/" aria-label="GoTyping home">
      <Logo />
      <span>
        Go<span style="color:var(--muted)">Typing</span>
      </span>
    </a>
  );
}
