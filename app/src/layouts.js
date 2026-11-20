// Panel layouts for the cover maker. Every layout is a set of rectangles in
// normalised coordinates (0..1 across the panel area), so the same layout works
// at 1080 x 1080, 1080 x 1350 and 1920 x 1080. The GTA poster look lives here:
// one tall hero panel, asymmetric neighbours, never a plain equal grid alone.

export const COVER_LAYOUTS = [
  {
    id: 'vice-grid',
    name: 'Vice Grid',
    blurb: 'Hero + four cuts',
    panels: [
      { x: 0.0, y: 0.0, w: 0.5, h: 1.0 },
      { x: 0.5, y: 0.0, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.42, w: 0.25, h: 0.3 },
      { x: 0.75, y: 0.42, w: 0.25, h: 0.3 },
      { x: 0.5, y: 0.72, w: 0.5, h: 0.28 },
    ],
  },
  {
    id: 'hero-trio',
    name: 'Hero & Trio',
    blurb: 'One star, three scenes',
    panels: [
      { x: 0.0, y: 0.0, w: 0.62, h: 1.0 },
      { x: 0.62, y: 0.0, w: 0.38, h: 0.34 },
      { x: 0.62, y: 0.34, w: 0.38, h: 0.33 },
      { x: 0.62, y: 0.67, w: 0.38, h: 0.33 },
    ],
  },
  {
    id: 'poster-strips',
    name: 'Poster Strips',
    blurb: 'Classic vertical strips',
    panels: [
      { x: 0.0, y: 0.0, w: 0.34, h: 1.0 },
      { x: 0.34, y: 0.0, w: 0.33, h: 1.0 },
      { x: 0.67, y: 0.0, w: 0.33, h: 1.0 },
    ],
  },
  {
    id: 'snapshot-stack',
    name: 'Snapshot Stack',
    blurb: 'Tilted prints, taped up',
    tilt: true,
    panels: [
      { x: 0.02, y: 0.03, w: 0.47, h: 0.46, rot: -0.035 },
      { x: 0.51, y: 0.02, w: 0.47, h: 0.46, rot: 0.03 },
      { x: 0.03, y: 0.52, w: 0.47, h: 0.46, rot: 0.025 },
      { x: 0.5, y: 0.53, w: 0.47, h: 0.46, rot: -0.03 },
    ],
  },
  {
    id: 'duel-split',
    name: 'Duel Split',
    blurb: 'Two sides, one story',
    panels: [
      { x: 0.0, y: 0.0, w: 0.52, h: 1.0 },
      { x: 0.52, y: 0.0, w: 0.48, h: 1.0 },
    ],
  },
  {
    id: 'nine-lives',
    name: 'Nine Lives',
    blurb: 'Full nine-panel grid',
    panels: [
      { x: 0.0, y: 0.0, w: 0.333, h: 0.333 },
      { x: 0.333, y: 0.0, w: 0.334, h: 0.333 },
      { x: 0.667, y: 0.0, w: 0.333, h: 0.333 },
      { x: 0.0, y: 0.333, w: 0.333, h: 0.334 },
      { x: 0.333, y: 0.333, w: 0.334, h: 0.334 },
      { x: 0.667, y: 0.333, w: 0.333, h: 0.334 },
      { x: 0.0, y: 0.667, w: 0.333, h: 0.333 },
      { x: 0.333, y: 0.667, w: 0.334, h: 0.333 },
      { x: 0.667, y: 0.667, w: 0.333, h: 0.333 },
    ],
  },
];

export function layoutById(layoutId) {
  return COVER_LAYOUTS.find((layout) => layout.id === layoutId) ?? COVER_LAYOUTS[0];
}

// Panel rectangles in canvas pixels for a panel area (x, y, w, h).
export function getPanelRectsForLayout(layout, area) {
  return layout.panels.map((panel) => ({
    x: area.x + panel.x * area.w,
    y: area.y + panel.y * area.h,
    w: panel.w * area.w,
    h: panel.h * area.h,
    rot: panel.rot ?? 0,
  }));
}

// Which panel (index) contains a point, or -1. Rotation is ignored for hit
// testing, which is close enough for the small tilts of Snapshot Stack.
export function findPanelAtPoint(rects, px, py) {
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
