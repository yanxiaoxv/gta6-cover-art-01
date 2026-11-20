// Fixed scenes for screenshots, driven by the ?shot= query string.
// The screenshot pipeline (shots.json) opens scenes such as
//   ?shot=cover&layout=hero-trio&grade=vice-sunset&title=NEON%20COAST&res=1920x1080
//   ?shot=editor&layout=vice-grid&grade=neon-night&title=VICE%20NIGHTS
// A cover scene hides the editor chrome and fills the window with the cover
// alone, exactly as an export would look; an editor scene keeps the full
// studio visible with a cover loaded. Once the scene is painted,
// window.__shotReady is set so the capture tool knows the frame is final.

const LAYOUT_IDS = ['vice-grid', 'hero-trio', 'poster-strips', 'snapshot-stack', 'duel-split', 'nine-lives'];
const GRADE_IDS = ['vice-sunset', 'neon-night', 'golden-hour', 'teal-heat', 'midnight-noir'];

function pick(query, key, allowed, fallback) {
  const value = query.get(key);
  return value && allowed.includes(value) ? value : fallback;
}

function parseRes(query) {
  const raw = query.get('res') || '';
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(raw);
  if (!match) return null;
  return { w: Number(match[1]), h: Number(match[2]) };
}

export async function runShot(query, hooks) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  const patch = {
    layout: pick(query, 'layout', LAYOUT_IDS, undefined),
    grade: pick(query, 'grade', GRADE_IDS, undefined),
  };
  if (query.get('title')) patch.title = query.get('title');
  if (query.get('subtitle')) patch.subtitle = query.get('subtitle');
  if (query.get('assign')) {
    const ids = query.get('assign').split(',').map((s) => s.trim()).filter(Boolean);
    const known = ['boulevard', 'neon', 'pier', 'rooftop'];
    const clean = ids.filter((id) => known.includes(id));
    if (clean.length) {
      patch.assign = Array.from({ length: 9 }, (_, i) => clean[i % clean.length]);
    }
  }
  if (query.get('stars')) {
    const n = Number(query.get('stars'));
    if (Number.isFinite(n)) patch.stars = Math.min(5, Math.max(0, Math.round(n)));
  }
  // Effect toggles, the same switches the editor offers: a scene may turn the
  // sunset disc off for a busy grid, exactly as a user would. &disc=0 etc.
  for (const key of ['disc', 'palms', 'halftone', 'grain', 'ink']) {
    const v = query.get(key);
    if (v === '0' || v === '1') patch[key] = v === '1';
  }
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  hooks.applyScene(patch);

  const res = parseRes(query);
  if (shot === 'cover' && res) hooks.setCanvasSize(res.w, res.h);

  await hooks.whenImagesReady();
  hooks.render();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
