/**
 * Engine events. The engine is silent about *how* these are used — the UI
 * subscribes, and future features (e.g. sound) can subscribe without any
 * refactor. There is deliberately no audio code in this version.
 */
import type { Metrics } from './metrics';

export type FailReason = 'master-mistake' | 'expert-word';

export type EngineEvent =
  | { type: 'start'; t: number }
  | { type: 'keystroke'; unit: string; expected: string | null; ok: boolean; t: number }
  | { type: 'mistake'; expected: string | null; typed: string; t: number }
  | { type: 'skip'; from: number; to: number; t: number }
  | { type: 'undo'; from: number; to: number; t: number }
  | { type: 'tick'; t: number }
  | { type: 'pause'; t: number }
  | { type: 'resume'; t: number }
  | { type: 'complete'; metrics: Metrics; t: number }
  | { type: 'fail'; reason: FailReason; t: number };

export type EngineListener = (e: EngineEvent) => void;

/** Tiny synchronous emitter. No allocation per emit beyond the event object. */
export class Emitter {
  private listeners: EngineListener[] = [];

  on(fn: EngineListener): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  emit(e: EngineEvent): void {
    for (let i = 0; i < this.listeners.length; i++) this.listeners[i]!(e);
  }

  clear(): void {
    this.listeners.length = 0;
  }
}
