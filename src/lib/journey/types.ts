export interface RoomData {
  /** Must match the folder name under /public/frames/desktop/. */
  id: string;
  /** Number of landscape frames in that folder. */
  desktop: number;
  /** Image x-fraction (0–1) held at screen centre in cover fit. */
  focusX?: number;
  /** Documentary only — the engine live-samples the frame's top edge instead. */
  top?: string;
  kicker: string;
  title: string;
  body: string;
}

/** Per-room view model the engine works with (derived from RoomData). */
export interface ViewRoom {
  id: string;
  count: number;
  focusX?: number;
  top: [number, number, number];
}

export interface DrawGeometry {
  ox: number;
  oy: number;
  dw: number;
  dh: number;
}
