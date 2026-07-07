// Every tuning constant for the scroll-scrub journey, in one place.
// Values are the hand-tuned originals from the inline engine — treat changes
// as design decisions, not refactors, and re-verify on real Safari after any.

/** Portrait: the image band fills this fraction of the screen, anchored to the bottom. */
export const MOBILE_BAND = 0.5;

// ---- room 0 (exterior) intro timing, all in room-local progress (0–1) ----
/** Establishing hold: full house held while the hero logo is solid. */
export const EST = 0.07;
/** How far the footage drifts during the establishing hold. */
export const EST_DRIFT = 0.03;
/** Hero logo fully faded out by here (a bit before the front door). */
export const DOOR = 0.48;

// ---- room crossfades ----
/** Exterior holds the living-room reveal longer before crossfading. */
export const FADE_EXTERIOR = 0.9;
/** Interior rooms start crossfading into the next room here. */
export const FADE_DEFAULT = 0.82;

// ---- captions ----
/** Caption fade-in completes by this room-local progress. */
export const CAPTION_IN = 0.14;
/** Caption starts fading out here. */
export const CAPTION_OUT = 0.72;
/** How much the outgoing room's caption dims during a crossfade. */
export const CAPTION_CROSSFADE_DAMP = 0.6;
/** Caption slide-up distance while fading, in px. */
export const CAPTION_RISE_PX = 24;

// ---- frame streaming / decoding windows (tuned for Safari decode latency) ----
/** Compressed-load window around the playhead, biased in the scroll direction. */
export const LOAD_AHEAD = 70;
export const LOAD_BEHIND = 25;
/** Decoded-frames window (decode() requested ahead of the playhead). */
export const DECODE_AHEAD = 22;
export const DECODE_BEHIND = 8;
/** Frames further than this from the playhead may be re-decoded later. */
export const DECODE_PRUNE = 70;
/** Below this room-local progress, also back-load the previous room's tail. */
export const BACKLOAD_BEFORE = 0.2;

// ---- scroll weighting ----
/** The exterior is ~2× the footage, so it gets ~2× the scroll length. */
export const EXTERIOR_WEIGHT = 2;

// ---- boot ----
/** How many exterior frames must load + decode before the loader hides. */
export const BOOT_FRAMES = 18;
/** Safety: reveal the page even if the boot frames stall this long. */
export const BOOT_TIMEOUT_MS = 9000;
/** Loader fade-out duration before it's removed from the DOM. */
export const LOADER_REMOVE_MS = 700;

// ---- canvas ----
/** DPR cap balancing sharpness against decode/GPU load for ~900 frames. */
export const DPR_CAP = 1.5;

// ---- momentum scroll (Lenis): lerp lower = longer glide ----
export const LENIS_OPTIONS = { lerp: 0.075, wheelMultiplier: 1.25, smoothWheel: true };

// ---- sky / gradient blends ----
/** Sample the exterior's opening sky colour while room-local progress is below this. */
export const SKY_SAMPLE_BEFORE = 0.04;
/** Desktop: canvas-top sky blend fades out over this local-progress span past EST. */
export const SKY_FADE_SPAN = 0.06;
/** Desktop: sky blend covers this fraction of the canvas height. */
export const SKY_BLEND_HEIGHT = 0.14;
/** Portrait exterior: ease from held sky to live colour starting here… */
export const INDOOR_START = 0.46;
/** …over this span (passing the doorway into the living room). */
export const INDOOR_SPAN = 0.14;
/** Portrait exterior: soft gradient overlap into the image, fraction of canvas height. */
export const PORTRAIT_OVERLAP = 0.05;

// ---- viewport listeners ----
export const RESIZE_DEBOUNCE_MS = 150;
export const ORIENTATION_DELAY_MS = 250;
