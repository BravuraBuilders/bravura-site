import { CAPTION_CROSSFADE_DAMP, CAPTION_IN, CAPTION_OUT, CAPTION_RISE_PX } from './config';

export function captionOpacity(local: number, isFirst: boolean): number {
  if (!isFirst && local < CAPTION_IN) return local / CAPTION_IN; // first room's caption starts visible
  if (local > CAPTION_OUT) return Math.max(0, 1 - (local - CAPTION_OUT) / (1 - CAPTION_OUT));
  return 1;
}

export function createCaptionUpdaters(captions: HTMLElement[], dots: Element[], nRooms: number) {
  function updateCaptions(room: number, local: number, nextAlpha: number, mo?: number): void {
    const m = mo || 0;
    captions.forEach((el, idx) => {
      let op = 0,
        y = CAPTION_RISE_PX;
      if (idx === room) {
        const c = captionOpacity(local, room === 0);
        op = c * (1 - nextAlpha * CAPTION_CROSSFADE_DAMP) * (1 - m); // hold room-0 caption until the wordmark clears
        y = (1 - c) * CAPTION_RISE_PX;
      }
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translateY(${y.toFixed(1)}px)`;
    });
  }

  function updateDots(pos: number): void {
    const active = Math.min(nRooms - 1, Math.max(0, Math.floor(pos)));
    dots.forEach((d, idx) => d.classList.toggle('is-active', idx === active));
  }

  return { updateCaptions, updateDots };
}
