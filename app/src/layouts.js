// Panel geometry for Neon Coast Cover Studio.
// Every layout returns panel shapes in cover coordinates for a W x H canvas.
// A panel is { x, y, w, h, angle, poly, border }:
//   x, y, w, h  - bounding box of the panel (photo cover-fit works on this box)
//   angle       - rotation in degrees for tilted snapshot prints (0 for flat panels)
//   poly        - optional polygon [[x,y],...] used as the clip shape instead of the box
//   border      - when true the panel is drawn as a white-bordered print (snapshot stack)

function rectPanel(x, y, w, h, extra) {
  return Object.assign({ x, y, w, h, angle: 0, poly: null, border: false }, extra || {});
}

function viceGridPanels(w, h) {
  const g = Math.max(6, w * 0.011);
  const pw = (w - g * 3) / 2;
  const ph = (h - g * 3) / 2;
  return [
    rectPanel(g, g, pw, ph),
    rectPanel(g * 2 + pw, g, pw, ph),
    rectPanel(g, g * 2 + ph, pw, ph),
    rectPanel(g * 2 + pw, g * 2 + ph, pw, ph),
  ];
}

function heroTrioPanels(w, h) {
  const g = Math.max(6, w * 0.011);
  const heroH = (h - g * 3) * 0.62;
  const stripH = h - g * 3 - heroH;
  const sw = (w - g * 4) / 3;
  return [
    rectPanel(g, g, w - g * 2, heroH),
    rectPanel(g, g * 2 + heroH, sw, stripH),
    rectPanel(g * 2 + sw, g * 2 + heroH, sw, stripH),
    rectPanel(g * 3 + sw * 2, g * 2 + heroH, sw, stripH),
  ];
}

function posterStripsPanels(w, h) {
  const g = Math.max(6, w * 0.011);
  const sw = (w - g * 4) / 3;
  return [
    rectPanel(g, g, sw, h - g * 2),
    rectPanel(g * 2 + sw, g, sw, h - g * 2),
    rectPanel(g * 3 + sw * 2, g, sw, h - g * 2),
  ];
}

function snapshotStackPanels(w, h) {
  // Round 2 geometry: the first stack buried two faces under the next print.
  // Prints are a touch smaller and spread wider, so each sample face keeps
  // clear of the print that lands on top of it.
  const pw = w * 0.56;
  const ph = h * 0.50;
  return [
    rectPanel(w * 0.03, h * 0.07, pw, ph, { angle: -7, border: true }),
    rectPanel(w * 0.41, h * 0.05, pw, ph, { angle: 5, border: true }),
    rectPanel(w * 0.22, h * 0.42, pw, ph, { angle: -2, border: true }),
  ];
}

function duelSplitPanels(w, h) {
  const lean = w * 0.30;
  const left = [[0, 0], [w, 0], [lean, h], [0, h]];
  const right = [[w, 0], [w, h], [lean, h]];
  return [
    rectPanel(0, 0, w, h, { poly: left }),
    rectPanel(lean, 0, w - lean, h, { poly: right }),
  ];
}

function nineLivesPanels(w, h) {
  const g = Math.max(5, w * 0.009);
  const pw = (w - g * 4) / 3;
  const ph = (h - g * 4) / 3;
  const out = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      out.push(rectPanel(g + c * (pw + g), g + r * (ph + g), pw, ph));
    }
  }
  return out;
}

export const LAYOUTS = [
  { id: 'vice-grid', name: 'Vice Grid', blurb: 'Four equal panels, the classic quad.', panels: viceGridPanels },
  { id: 'hero-trio', name: 'Hero & Trio', blurb: 'One wide hero over three strips.', panels: heroTrioPanels },
  { id: 'poster-strips', name: 'Poster Strips', blurb: 'Three tall portrait strips.', panels: posterStripsPanels },
  { id: 'snapshot-stack', name: 'Snapshot Stack', blurb: 'Tilted prints tossed on the backdrop.', panels: snapshotStackPanels },
  { id: 'duel-split', name: 'Duel Split', blurb: 'Two panels cut on a hard diagonal.', panels: duelSplitPanels },
  { id: 'nine-lives', name: 'Nine Lives', blurb: 'A full nine-panel grid.', panels: nineLivesPanels },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function panelsFor(id, w, h) {
  return layoutById(id).panels(w, h);
}

// Hit test in cover coordinates. Handles polygons and rotated snapshot prints.
export function panelAt(panels, px, py) {
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const p = panels[i];
    if (p.poly) {
      if (pointInPoly(px, py, p.poly)) return i;
      continue;
    }
    if (p.angle) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const rad = (-p.angle * Math.PI) / 180;
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2) return i;
      continue;
    }
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

export function pointInPoly(px, py, poly) {
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a, a += 1) {
    const [ax, ay] = poly[a];
    const [bx, by] = poly[b];
    if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
