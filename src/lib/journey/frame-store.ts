// Lazy image store with a bounded decode window.
// ~900 high-res frames can't all be decoded at once. Frames load (compressed)
// per room on demand; only a sliding window around the current frame is kept
// decoded. Bounded RAM, no first-draw decode hitch.
import { DECODE_AHEAD, DECODE_BEHIND, DECODE_PRUNE, LOAD_AHEAD, LOAD_BEHIND } from './config';
import type { ViewRoom } from './types';

export const pad = (n: number): string => String(n).padStart(4, '0');

export const frameSrc = (id: string, i: number): string =>
  `/frames/desktop/${id}/frame_${pad(i + 1)}.jpg`;

export function createFrameStore(view: ViewRoom[]) {
  const nRooms = view.length;
  const imgs: (HTMLImageElement | null)[][] = view.map((v) => new Array(v.count).fill(null));
  const started: boolean[][] = view.map((v) => new Array(v.count).fill(false));
  const decodeReq: Set<number>[] = view.map(() => new Set());

  function ensure(ri: number, i: number): void {
    if (i < 0 || ri < 0 || ri >= nRooms || i >= view[ri].count || started[ri][i]) return;
    started[ri][i] = true;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      imgs[ri][i] = im.naturalWidth ? im : null;
    };
    im.onerror = () => {
      imgs[ri][i] = null;
    };
    im.src = frameSrc(view[ri].id, i);
  }

  // Load only a bounded window of frames around the playhead (biased in the scroll
  // direction), not the whole room — a full room can be 400+ frames, and kicking every
  // request at once saturates the connection so near-playhead frames arrive late (jank).
  // Frames outside the window simply load lazily as they're approached.
  function loadWindow(ri: number, i: number, dir: number): void {
    if (ri < 0 || ri >= nRooms) return;
    const cnt = view[ri].count;
    const ahead = dir >= 0 ? LOAD_AHEAD : LOAD_BEHIND,
      behind = dir >= 0 ? LOAD_BEHIND : LOAD_AHEAD;
    for (let f = Math.max(0, i - behind); f <= Math.min(cnt - 1, i + ahead); f++) ensure(ri, f);
  }

  function frameOrNearest(ri: number, i: number): HTMLImageElement | null {
    const arr = imgs[ri];
    if (!arr) return null;
    if (arr[i]) return arr[i];
    for (let d = 1; d < arr.length; d++) {
      if (arr[i - d]) return arr[i - d];
      if (arr[i + d]) return arr[i + d];
    }
    return null;
  }

  // Ask the browser to decode a window of frames ahead of the playhead so
  // they're ready to draw with no synchronous decode. Prune far frames so
  // they can be re-decoded if the user scrolls back to them later.
  function decodeWindow(ri: number, i: number, dir: number): void {
    const cnt = view[ri].count,
      set = decodeReq[ri];
    const ahead = dir >= 0 ? DECODE_AHEAD : DECODE_BEHIND,
      behind = dir >= 0 ? DECODE_BEHIND : DECODE_AHEAD;
    for (let f = Math.max(0, i - behind); f <= Math.min(cnt - 1, i + ahead); f++) {
      const im = imgs[ri][f];
      if (im && !set.has(f) && im.decode) {
        set.add(f);
        im.decode().catch(() => {});
      }
    }
    for (const f of set) if (f < i - DECODE_PRUNE || f > i + DECODE_PRUNE) set.delete(f);
  }

  return { imgs, ensure, loadWindow, frameOrNearest, decodeWindow };
}

export type FrameStore = ReturnType<typeof createFrameStore>;
