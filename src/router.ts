/**
 * Tiny History API router (no dependency).
 * Sections register themselves, so the nav can never contain a dead link:
 * if a feature is not built yet, it is simply not registered (AGENT.md).
 */
import { useEffect, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';

export interface Section {
  id: string;
  path: string;
  label: string;
  /** Shown in the mobile bar (max 5 items) */
  primary: boolean;
  load: () => Promise<{ default: ComponentType }>;
}

const sections: Section[] = [];

export function registerSection(s: Section): void {
  if (sections.some((x) => x.id === s.id)) return;
  sections.push(s);
}

export function getSections(): readonly Section[] {
  return sections;
}

export function currentPath(): string {
  if (typeof location === 'undefined') return '/';
  return location.pathname || '/';
}

export function matchSection(path: string): Section | null {
  const clean = path.replace(/\/+$/, '') || '/';
  let best: Section | null = null;
  for (const s of sections) {
    if (clean === s.path || clean.startsWith(s.path + '/')) {
      if (!best || s.path.length > best.path.length) best = s;
    }
  }
  return best;
}

type Listener = (path: string) => void;
const listeners = new Set<Listener>();

export function navigate(path: string, replace = false): void {
  if (typeof history === 'undefined') return;
  if (path === currentPath()) return;
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  emit();
}

function emit(): void {
  const p = currentPath();
  // One broken subscriber must never stop the others from navigating.
  for (const l of listeners) {
    try {
      l(p);
    } catch {
      /* ignore a failing subscriber */
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
}

/** Intercept same-origin left clicks on <a> so navigation stays client-side. */
export function linkHandler(e: MouseEvent): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return;
  }
  const target = (e.target as HTMLElement | null)?.closest('a');
  if (!target) return;
  const href = target.getAttribute('href');
  if (!href || !href.startsWith('/') || target.hasAttribute('download')) return;
  if (target.getAttribute('target') === '_blank') return;
  e.preventDefault();
  navigate(href);
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const fn: Listener = (p) => setPath(p);
    listeners.add(fn);
    // Effects run after render, so a navigation that happens in between
    // would otherwise be lost. Re-sync on subscribe to stay self-healing.
    setPath(currentPath());
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return path;
}
