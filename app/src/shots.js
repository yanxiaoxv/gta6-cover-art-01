// Fixed scenes for screenshots: ?shot=cover renders one exported cover full
// frame, ?shot=editor shows the studio with sample photos loaded. Query
// parameters pick the scene: layout, grade, size, title, subtitle, tagline
// and photos (comma-separated sample names, without the .jpg extension).
// pan and panx fine-tune one panel's framing each, as index:value pairs
// (for example pan=0:0.18,4:0.45) so a face sits inside its panel.
// window.__shotReady is set once the scene has painted twice.

export async function runScreenshotScene(query, applyScene) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await applyScene({
    shot,
    layoutId: query.get('layout') ?? undefined,
    gradeId: query.get('grade') ?? undefined,
    sizeId: query.get('size') ?? undefined,
    title: query.get('title') ?? undefined,
    subtitle: query.get('subtitle') ?? undefined,
    tagline: query.get('tagline') ?? undefined,
    photoNames: (query.get('photos') ?? 'boulevard,rooftop,neon,pier').split(','),
    panY: query.get('pan') ?? '',
    panX: query.get('panx') ?? '',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
