// The cover renderer for Neon Coast Cover Studio: pure Canvas 2D, no libraries.
// drawCover paints panels, grade tints, poster effects and the headline block.
// The same function drives the live preview, the PNG exports and the ?shot=
// screenshot scenes, so what the editor shows is exactly what gets exported
// (exports simply pass selectedPanel: -1 so no editor outline is drawn).

import { panelsFor } from './layouts.js';
import { gradeById, tintForPanel } from './grades.js';

export const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'neon', name: 'Neon Street', src: 'samples/neon.jpg' },
  { id: 'pier', name: 'The Pier', src: 'samples/pier.jpg' },
  { id: 'rooftop', name: 'Rooftop', src: 'samples/rooftop.jpg' },
];

export const EXPORT_SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide banner', w: 1920, h: 1080 },
];

export function createDefaultState() {
  return {
    layout: 'hero-trio',
    grade: 'vice-sunset',
    title: 'NEON COAST',
    subtitle: 'vice nights, bright lights',
    kickers: ['NEON COAST STUDIO PRESENTS', 'ONE CITY, ONE SUMMER', 'THE HEAT IS ON'],
    badge: 'NC',
    price: 'SPECIAL EDITION',
    stars: 4,
    disc: true,
    palms: true,
    ink: true,
    halftone: false,
    grain: true,
    assign: ['boulevard', 'rooftop', 'neon', 'pier', 'neon', 'boulevard', 'pier', 'rooftop', 'boulevard'],
    pan: {},
  };
}

export function hashSeed(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function transformFor(state, index) {
  const t = state.pan[index] || {};
  return { dx: t.dx || 0, dy: t.dy || 0, zoom: t.zoom || 1 };
}

// Cover-fit maths: the photo is scaled so it always covers the panel box,
// then pan offsets are clamped to the overflow so a panel can never show a gap.
export function clampTransform(panel, imgW, imgH, t) {
  const zoom = Math.min(3.2, Math.max(1, t.zoom || 1));
  if (!imgW || !imgH) return { dx: 0, dy: 0, zoom };
  const scale = Math.max(panel.w / imgW, panel.h / imgH) * zoom;
  const dw = imgW * scale;
  const dh = imgH * scale;
  const maxDx = Math.max(0, (dw - panel.w) / 2);
  const maxDy = Math.max(0, (dh - panel.h) / 2);
  return {
    dx: Math.min(maxDx, Math.max(-maxDx, t.dx || 0)),
    dy: Math.min(maxDy, Math.max(-maxDy, t.dy || 0)),
    zoom,
  };
}

function imageSize(img) {
  if (!img) return { w: 0, h: 0 };
  return { w: img.naturalWidth || img.width || 0, h: img.naturalHeight || img.height || 0 };
}

function tracePanelPath(ctx, p) {
  ctx.beginPath();
  if (p.poly) {
    p.poly.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    return;
  }
  ctx.rect(p.x, p.y, p.w, p.h);
}

function drawPanelPhoto(ctx, p, img, t, grade, panelIndex) {
  const { w: iw, h: ih } = imageSize(img);
  ctx.save();
  if (p.border) {
    // Snapshot print: white polaroid-style frame behind the photo.
    const b = Math.max(6, p.w * 0.028);
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.fillStyle = '#f7f3ea';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = p.w * 0.05;
    ctx.shadowOffsetY = p.h * 0.03;
    ctx.fillRect(-p.w / 2 - b, -p.h / 2 - b, p.w + b * 2, p.h + b * 4.4);
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.clip();
    if (img && iw && ih) {
      const ct = clampTransform(p, iw, ih, t);
      const scale = Math.max(p.w / iw, p.h / ih) * ct.zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.filter = panelFilter(grade);
      ctx.drawImage(img, -dw / 2 + ct.dx, -dh / 2 + ct.dy, dw, dh);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = tintForPanel(grade, panelIndex);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      placeholderFill(ctx, -p.w / 2, -p.h / 2, p.w, p.h, grade, panelIndex);
    }
    ctx.restore();
    return;
  }
  if (p.angle) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.clip();
    if (img && iw && ih) {
      const ct = clampTransform(p, iw, ih, t);
      const scale = Math.max(p.w / iw, p.h / ih) * ct.zoom;
      ctx.filter = panelFilter(grade);
      ctx.drawImage(img, (-iw * scale) / 2 + ct.dx, (-ih * scale) / 2 + ct.dy, iw * scale, ih * scale);
      ctx.filter = 'none';
    } else {
      placeholderFill(ctx, -p.w / 2, -p.h / 2, p.w, p.h, grade, panelIndex);
    }
    ctx.restore();
    return;
  }
  tracePanelPath(ctx, p);
  ctx.clip();
  if (img && iw && ih) {
    const ct = clampTransform(p, iw, ih, t);
    const scale = Math.max(p.w / iw, p.h / ih) * ct.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.filter = panelFilter(grade);
    ctx.drawImage(img, p.x + (p.w - dw) / 2 + ct.dx, p.y + (p.h - dh) / 2 + ct.dy, dw, dh);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = tintForPanel(grade, panelIndex);
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const shade = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    shade.addColorStop(0, 'rgba(0,0,0,0.10)');
    shade.addColorStop(0.35, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = shade;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  } else {
    placeholderFill(ctx, p.x, p.y, p.w, p.h, grade, panelIndex);
  }
  ctx.restore();
}

function panelFilter(grade) {
  return `saturate(${grade.sat}) contrast(${grade.con}) brightness(1.03)`;
}

function placeholderFill(ctx, x, y, w, h, grade, panelIndex) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, grade.sky[1]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 ${Math.max(13, w * 0.055)}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  ctx.font = `400 ${Math.max(11, w * 0.04)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(`PANEL ${panelIndex + 1}`, x + w / 2, y + h / 2 + w * 0.07);
}

function strokePanel(ctx, p, W) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2.5, W * 0.005);
  if (p.border) {
    ctx.restore();
    return;
  }
  if (p.angle) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
    return;
  }
  tracePanelPath(ctx, p);
  ctx.stroke();
  ctx.restore();
}

function drawSunsetDisc(ctx, W, H, grade) {
  // Kept high and modest in round 2: at the first size it swallowed a whole
  // grid panel and the faces in it. This spot sits in sky in the sample
  // photos and clears the badge and the wanted stars.
  const cx = W * 0.815;
  const cy = H * 0.148;
  const r = Math.min(W, H) * 0.084;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, grade.titleA);
  g.addColorStop(0.55, grade.tints[0]);
  g.addColorStop(1, grade.tints[1]);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(20,4,28,0.85)';
  const stripeH = r * 0.085;
  for (let i = 0; i < 5; i += 1) {
    const y = cy + r * 0.08 + i * r * 0.19;
    ctx.fillRect(cx - r, y, r * 2, stripeH * (1 + i * 0.35));
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPalm(ctx, baseX, baseY, height, flip, alpha) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(flip, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0a0512';
  ctx.beginPath();
  ctx.moveTo(-height * 0.035, 0);
  ctx.quadraticCurveTo(height * 0.05, -height * 0.55, height * 0.20, -height * 0.98);
  ctx.quadraticCurveTo(height * 0.13, -height * 0.55, height * 0.045, 0);
  ctx.closePath();
  ctx.fill();
  const topX = height * 0.20;
  const topY = -height * 0.98;
  for (let i = 0; i < 6; i += 1) {
    const spread = (i / 5 - 0.5) * 2;
    const len = height * (0.42 - Math.abs(spread) * 0.10);
    const ex = topX + spread * len;
    const ey = topY + height * 0.10 + Math.abs(spread) * height * 0.16 - (1 - Math.abs(spread)) * height * 0.10;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + spread * len * 0.5, topY - height * 0.14, ex, ey);
    ctx.quadraticCurveTo(topX + spread * len * 0.5, topY - height * 0.05, topX, topY);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, filled, grade) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = grade.titleA;
    ctx.fill();
  }
  ctx.strokeStyle = grade.titleEdge;
  ctx.lineWidth = Math.max(1.2, r * 0.14);
  ctx.stroke();
}

function fitFont(ctx, text, weight, maxSize, maxWidth, family) {
  let size = maxSize;
  const fam = family || `'Segoe UI', Arial, sans-serif`;
  ctx.font = `${weight} ${size}px ${fam}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fam}`;
  }
  return size;
}

function drawHeadline(ctx, W, H, state, grade) {
  // Foot scrim so lettering stays readable over any photo.
  const scrim = ctx.createLinearGradient(0, H * 0.58, 0, H);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(0.55, grade.scrim.replace(/[\d.]+\)$/, '0.45)'));
  scrim.addColorStop(1, grade.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  const left = W * 0.045;
  // Kicker ladder: three stacked lines of rising weight above the title.
  const kickers = (state.kickers || []).filter((k) => String(k).trim().length > 0).slice(0, 3);
  ctx.textAlign = 'left';
  kickers.forEach((kicker, i) => {
    const y = H * (0.700 + i * 0.033);
    const size = H * (0.019 + i * 0.0035);
    ctx.fillStyle = grade.tints[i % grade.tints.length];
    ctx.fillRect(left, y - size * 0.78, W * 0.016, size * 0.82);
    ctx.font = `${i === kickers.length - 1 ? 800 : 600} ${size}px 'Segoe UI', Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.32)}px`; } catch { /* older engines */ }
    ctx.fillStyle = i === kickers.length - 1 ? '#ffffff' : 'rgba(255,255,255,0.82)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.3;
    ctx.fillText(String(kicker).toUpperCase(), left + W * 0.026, y);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  });

  // Script subtitle, tilted over the title's shoulder.
  const title = (state.title || '').trim().toUpperCase();
  if (state.subtitle && state.subtitle.trim()) {
    ctx.save();
    const sx = W * 0.575;
    const sy = H * 0.786;
    ctx.translate(sx, sy);
    ctx.rotate((-4 * Math.PI) / 180);
    const sSize = fitFont(ctx, state.subtitle, 'italic 700', H * 0.050, W * 0.42, `'Segoe Script', 'Brush Script MT', cursive`);
    ctx.font = `italic 700 ${sSize}px 'Segoe Script', 'Brush Script MT', cursive`;
    ctx.textAlign = 'center';
    ctx.shadowColor = grade.script;
    ctx.shadowBlur = sSize * 0.45;
    ctx.fillStyle = grade.script;
    ctx.fillText(state.subtitle, 0, 0);
    ctx.shadowBlur = sSize * 0.18;
    ctx.fillText(state.subtitle, 0, 0);
    ctx.restore();
  }

  // Main title with the grade's gradient and a hard edge.
  if (title) {
    const size = fitFont(ctx, title, 900, H * 0.118, W * 0.92);
    ctx.font = `900 ${size}px 'Segoe UI', Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.015)}px`; } catch { /* older engines */ }
    ctx.textAlign = 'center';
    const ty = H * 0.905;
    ctx.lineWidth = size * 0.10;
    ctx.strokeStyle = grade.titleEdge;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(title, W / 2, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const tg = ctx.createLinearGradient(0, ty - size, 0, ty);
    tg.addColorStop(0, grade.titleA);
    tg.addColorStop(1, grade.titleB);
    ctx.fillStyle = tg;
    ctx.fillText(title, W / 2, ty);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  }

  // Price strip along the very foot.
  const stripH = H * 0.042;
  ctx.fillStyle = grade.titleEdge;
  ctx.fillRect(0, H - stripH, W, stripH);
  ctx.fillStyle = grade.titleA;
  ctx.fillRect(0, H - stripH, W, Math.max(2, H * 0.004));
  ctx.font = `700 ${stripH * 0.46}px 'Segoe UI', Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(stripH * 0.14)}px`; } catch { /* older engines */ }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText((state.price || '').toUpperCase(), left, H - stripH * 0.30);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('NEON COAST COVER STUDIO', W - left, H - stripH * 0.30);
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }

  // City badge, top-left.
  if (state.badge && state.badge.trim()) {
    const bx = W * 0.072;
    const by = H * 0.082;
    const br = Math.min(W, H) * 0.052;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = grade.titleEdge;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = grade.titleA;
    ctx.lineWidth = Math.max(2, br * 0.09);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, br * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, br * 0.045);
    ctx.stroke();
    const bSize = fitFont(ctx, state.badge.trim().toUpperCase(), 900, br * 0.92, br * 1.5);
    ctx.font = `900 ${bSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.badge.trim().toUpperCase(), bx, by + bSize * 0.36);
    ctx.restore();
  }

  // Wanted stars, top-right.
  const starR = Math.min(W, H) * 0.021;
  const gap = starR * 2.5;
  const startX = W - W * 0.045 - starR - gap * 4;
  for (let i = 0; i < 5; i += 1) {
    drawStar(ctx, startX + i * gap, H * 0.055, starR, i < (state.stars || 0), grade);
  }
}

function drawHalftoneBand(ctx, W, H) {
  const s = W * 0.02;
  ctx.save();
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col * s < W + s; col += 1) {
      const x = col * s + (row % 2 ? s / 2 : 0);
      const y = H * 0.615 + row * s;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  const rng = mulberry32(20261119);
  const count = Math.round((W * H) / 1400);
  const scale = W / 1080;
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    const r = (0.6 + rng() * 1.1) * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fill();
  }
  ctx.restore();
}

export function drawCover(ctx, W, H, state, images, opts) {
  const options = opts || {};
  const selected = options.selectedPanel == null ? -1 : options.selectedPanel;
  const grade = gradeById(state.grade);
  const panels = panelsFor(state.layout, W, H);

  // Backdrop (visible behind the snapshot stack and between panels).
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((stop, i) => sky.addColorStop(i / (grade.sky.length - 1), stop));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  panels.forEach((p, i) => {
    const photoId = state.assign[i];
    const img = photoId ? images.get(photoId) : null;
    drawPanelPhoto(ctx, p, img || null, transformFor(state, i), grade, i);
  });
  panels.forEach((p) => strokePanel(ctx, p, W));

  // Outer frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);

  if (state.disc) drawSunsetDisc(ctx, W, H, grade);
  if (state.palms) {
    drawPalm(ctx, W * 0.012, H * 1.005, H * 0.30, 1, 0.82);
    drawPalm(ctx, W * 0.995, H * 1.005, H * 0.24, -1, 0.75);
  }
  if (state.halftone) drawHalftoneBand(ctx, W, H);
  drawHeadline(ctx, W, H, state, grade);
  if (state.grain) drawGrain(ctx, W, H);

  // Vignette to seat the edges.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Editor-only selection outline (never on exports or shot scenes).
  if (selected >= 0 && panels[selected]) {
    const p = panels[selected];
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(2.5, W * 0.004);
    ctx.setLineDash([W * 0.012, W * 0.008]);
    if (p.poly) {
      ctx.beginPath();
      p.poly.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    } else if (p.angle) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#22d3ee';
    const label = `PANEL ${selected + 1}`;
    ctx.font = `700 ${Math.max(12, W * 0.016)}px 'Segoe UI', Arial, sans-serif`;
    const tw = ctx.measureText(label).width + 16;
    const lx = Math.min(Math.max(4, p.x), W - tw - 4);
    const ly = Math.max(4, p.y - Math.max(20, W * 0.026));
    ctx.fillRect(lx, ly, tw, Math.max(20, W * 0.026));
    ctx.fillStyle = '#06222b';
    ctx.textAlign = 'left';
    ctx.fillText(label, lx + 8, ly + Math.max(20, W * 0.026) * 0.72);
    ctx.restore();
  }
  return panels;
}

export function makeCoverCanvas(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, state, images, { selectedPanel: -1 });
  return canvas;
}

// Deterministic surprise: the same visible state always seeds the same
// shuffle, so the button is playful but never random between identical covers.
export function surpriseState(state, photoIds) {
  const seed = hashSeed([state.title, state.layout, state.grade, state.assign.join(','), state.stars].join('|'));
  const rng = mulberry32(seed);
  const layoutIds = ['vice-grid', 'hero-trio', 'poster-strips', 'snapshot-stack', 'duel-split', 'nine-lives'];
  const gradeIds = ['vice-sunset', 'neon-night', 'golden-hour', 'teal-heat', 'midnight-noir'];
  const layout = layoutIds[Math.floor(rng() * layoutIds.length)];
  const grade = gradeIds[Math.floor(rng() * gradeIds.length)];
  const pool = photoIds.length ? photoIds.slice() : ['boulevard'];
  const assign = [];
  for (let i = 0; i < 9; i += 1) {
    assign.push(pool[Math.floor(rng() * pool.length)]);
  }
  // Guarantee variety: if every panel landed on one photo, rotate the pool in.
  if (new Set(assign).size === 1 && pool.length > 1) {
    for (let i = 0; i < assign.length; i += 1) assign[i] = pool[i % pool.length];
  }
  return Object.assign({}, state, {
    layout,
    grade,
    assign,
    stars: 3 + Math.floor(rng() * 3),
    disc: rng() > 0.25,
    palms: rng() > 0.3,
    halftone: rng() > 0.6,
    pan: {},
  });
}
