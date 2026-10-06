/**
 * Code snippets for the "Code" fun mode (Type > More modes, docs/01 §7) and
 * for Learn's `code` lesson type (core/text/lessons.ts). One implementation,
 * two callers, per AGENT.md.
 *
 * Every snippet is synthesized from a small set of safe, original templates
 * and a fixed name pool — nothing is copied from a real file, so there is no
 * license/attribution question and the output is always typable with a
 * plain QWERTY-ish character set (no vendor-specific unicode).
 */
import { makeRng, type Rng } from './rng';

export type CodeLang = 'javascript' | 'python';

export const CODE_LANGS: Array<{ id: CodeLang; label: string }> = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
];

const NAMES = ['count', 'total', 'index', 'value', 'result', 'items', 'data', 'temp'];

const JS_TEMPLATES = [
  'function {a}({b}, {c}) {\n  return {b} + {c};\n}',
  'const {a} = ({b}) => {b} * 2;',
  'if ({a} > {b}) {\n  {a} = {b};\n}',
  'for (let {a} = 0; {a} < {b}; {a}++) {\n  {c}.push({a});\n}',
  'class {A} {\n  constructor({a}) {\n    this.{a} = {a};\n  }\n}',
  'const {a} = {b}.filter(({c}) => {c} > 0);',
  'while ({a} < {b}) {\n  {a} += 1;\n}',
  'export function {a}({b}) {\n  return {b} == null ? {c} : {b};\n}',
];

const PY_TEMPLATES = [
  'def {a}({b}, {c}):\n    return {b} + {c}',
  '{a} = lambda {b}: {b} * 2',
  'if {a} > {b}:\n    {a} = {b}',
  'for {a} in range({b}):\n    {c}.append({a})',
  'class {A}:\n    def __init__(self, {a}):\n        self.{a} = {a}',
  '{a} = [{c} for {c} in {b} if {c} > 0]',
  'while {a} < {b}:\n    {a} += 1',
  'def {a}({b}):\n    return {c} if {b} is None else {b}',
];

function fill(template: string, rng: Rng): string {
  const a = rng.pick(NAMES);
  const b = rng.pick(NAMES.filter((x) => x !== a));
  const c = rng.pick(NAMES);
  return template
    .replace(/\{A\}/g, a.charAt(0).toUpperCase() + a.slice(1))
    .replace(/\{a\}/g, a)
    .replace(/\{b\}/g, b)
    .replace(/\{c\}/g, c);
}

export interface CodeOptions {
  lang: CodeLang;
  seed: number | string;
  /** Roughly how many "words" worth of text to produce — one snippet per ~10. */
  count: number;
}

/** Deterministic, seeded code-snippet text. Pure — no DOM, fully unit-testable. */
export function generateCode(opts: CodeOptions): string {
  const rng = makeRng(opts.seed);
  const templates = opts.lang === 'python' ? PY_TEMPLATES : JS_TEMPLATES;
  const n = Math.max(1, Math.round(opts.count / 10));
  const lines: string[] = [];
  for (let i = 0; i < n; i++) lines.push(fill(rng.pick(templates), rng));
  return lines.join('\n\n');
}
