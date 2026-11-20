// The cover engine: draws a complete GTA-style multi-panel poster onto a 2D
// canvas at any of the post sizes. Photos are cover-fitted into panels with a
// colour-grade wash, halftone dots and a vignette; the title block gets a
// striped sunset disc, palm silhouettes, gradient poster lettering with a
// neon script subtitle, wanted stars and film grain. Everything is drawn
// locally from the user's own photos — nothing is uploaded or fetched.

import { layoutById, getPanelRectsForLayout } from './layouts.js';
import { gradeById, applyGradeWashToPanel } from './grades.js';

export const POST_SIZES = [
  { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

export function postSizeById(sizeId) {
  return POST_SIZES.find((size) => size.id === sizeId) ?? POST_SIZES[0];
}

// Small deterministic random source so grain looks the same on every redraw.
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function drawStarPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawWantedStars(ctx, x, y, starSize, count) {
  for (let i = 0; i < count; i += 1) {
    const cx = x + i * starSize * 2.15;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = starSize * 0.35;
    drawStarPath(ctx, cx, y, starSize);
    ctx.fillStyle = '#ffd23d';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = starSize * 0.14;
    ctx.strokeStyle = 'rgba(20,8,40,0.85)';
    ctx.stroke();
    ctx.restore();
  }
}

// A palm in silhouette: a curved trunk and five drooping fronds, drawn with
// strokes so it reads at any size. flip mirrors it for the other corner.
export function drawPalmSilhouette(ctx, x, y, scale, flip, color) {
  const dir = flip ? -1 : 1;
  const topX = x + dir * scale * 0.34;
  const topY = y - scale * 1.06;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = scale * 0.13;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * scale * 0.1, y - scale * 0.55, topX, topY);
  ctx.stroke();
  ctx.lineWidth = scale * 0.075;
  const fronds = [
    [-1.0, -0.18], [-0.78, -0.42], [-0.42, -0.58], [0.02, -0.66],
    [0.45, -0.58], [0.8, -0.4], [1.02, -0.12],
  ];
  for (const [fx, fy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + dir * fx * scale * 0.55,
      topY + fy * scale * 0.55,
      topX + dir * fx * scale * 0.95,
      topY + fy * scale * 0.4 + scale * 0.3,
    );
    ctx.stroke();
  }
  ctx.restore();
}

// The retro striped sun: a gradient disc with band-coloured slots cut across
// its lower half, the sunset mark behind the title lettering.
export function drawSunsetSunDisc(ctx, cx, cy, radius, grade, bandColorAt) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  sun.addColorStop(0, grade.sunCore);
  sun.addColorStop(1, grade.sunEdge);
  ctx.fillStyle = sun;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.fillStyle = bandColorAt;
  let stripeY = cy + radius * 0.08;
  let stripeH = radius * 0.045;
  while (stripeY < cy + radius) {
    ctx.fillRect(cx - radius, stripeY, radius * 2, stripeH);
    stripeY += stripeH + radius * 0.13;
    stripeH *= 1.45;
  }
  ctx.restore();
}

// Subtle halftone dots that grow towards the foot of a panel, the printed
// poster texture over the graded photo.
export function drawHalftoneDots(ctx, rect, unit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const gap = Math.max(10, unit * 15);
  ctx.fillStyle = 'rgba(10,4,24,0.06)';
  for (let rowY = rect.y + rect.h * 0.55; rowY < rect.y + rect.h; rowY += gap) {
    const t = (rowY - rect.y) / rect.h;
    const r = gap * 0.13 + t * gap * 0.15;
    for (let colX = rect.x + gap * 0.5; colX < rect.x + rect.w; colX += gap) {
      ctx.beginPath();
      ctx.arc(colX, rowY, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawFilmGrain(ctx, w, h, unit) {
  const rand = seededRandom(20261119);
  ctx.save();
  for (let i = 0; i < 2600; i += 1) {
    const gx = rand() * w;
    const gy = rand() * h;
    const light = rand() > 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(gx, gy, unit * 1.6, unit * 1.6);
  }
  ctx.restore();
}

// A sunset scene drawn into a panel that has no photo yet, so an empty cover
// still looks designed instead of blank.
export function drawEmptyPanelScene(ctx, rect, grade, unit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, grade.bandMid);
  sky.addColorStop(0.62, grade.bandBottom);
  sky.addColorStop(1, grade.bandTop);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  drawSunsetSunDisc(
    ctx,
    rect.x + rect.w * 0.5,
    rect.y + rect.h * 0.42,
    Math.min(rect.w, rect.h) * 0.26,
    grade,
    grade.bandBottom,
  );
  ctx.fillStyle = 'rgba(8,3,20,0.9)';
  ctx.fillRect(rect.x, rect.y + rect.h * 0.82, rect.w, rect.h * 0.18);
  drawPalmSilhouette(ctx, rect.x + rect.w * 0.16, rect.y + rect.h * 0.86, rect.h * 0.34, false, 'rgba(8,3,20,0.92)');
  drawPalmSilhouette(ctx, rect.x + rect.w * 0.86, rect.y + rect.h * 0.86, rect.h * 0.28, true, 'rgba(8,3,20,0.92)');
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.max(13, unit * 17)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.94);
  ctx.restore();
}

// One photo, cover-fitted into its panel with the maker's pan and zoom, then
// graded. The panel state is { photoIndex, zoom, panX, panY }.
export function drawPanelPhotoWithGrade(ctx, rect, image, panelState, grade, options, unit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!image) {
    drawEmptyPanelScene(ctx, rect, grade, unit);
  } else {
    const baseScale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
    const scale = baseScale * (panelState?.zoom ?? 1);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    // Pan is clamped to the overflow, so a panel can never slide its photo
    // far enough to leave a bare wash gap at one edge.
    const maxOffX = Math.max(0, (drawW - rect.w) / 2);
    const maxOffY = Math.max(0, (drawH - rect.h) / 2);
    const offX = Math.max(-maxOffX, Math.min(maxOffX, (panelState?.panX ?? 0) * rect.w));
    const offY = Math.max(-maxOffY, Math.min(maxOffY, (panelState?.panY ?? 0) * rect.h));
    const drawX = rect.x + (rect.w - drawW) / 2 + offX;
    const drawY = rect.y + (rect.h - drawH) / 2 + offY;
    if (options.ink) ctx.filter = 'saturate(1.38) contrast(1.10) brightness(1.03)';
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';
    applyGradeWashToPanel(ctx, rect, grade);
    const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(8,2,20,0.30)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  if (options.halftone) drawHalftoneDots(ctx, rect, unit);
}

// The title block: gradient band, striped sun, palms, kicker, neon script
// subtitle and the big gradient poster lettering with a dark extruded edge.
export function drawPosterTitleLettering(ctx, band, state, grade, unit) {
  const bandGrad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  bandGrad.addColorStop(0, grade.bandTop);
  bandGrad.addColorStop(0.55, grade.bandMid);
  bandGrad.addColorStop(1, grade.bandBottom);
  ctx.fillStyle = bandGrad;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  drawSunsetSunDisc(ctx, band.x + band.w / 2, band.y + band.h * 0.52, band.h * 0.55, grade, grade.bandMid);
  ctx.restore();
  drawPalmSilhouette(ctx, band.x + band.w * 0.045, band.y + band.h * 0.97, band.h * 0.52, false, 'rgba(10,4,24,0.88)');
  drawPalmSilhouette(ctx, band.x + band.w * 0.955, band.y + band.h * 0.97, band.h * 0.52, true, 'rgba(10,4,24,0.88)');

  ctx.textAlign = 'center';
  const tagline = (state.tagline ?? '').trim().toUpperCase();
  if (tagline) {
    ctx.font = `700 ${Math.max(12, unit * 16)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = unit * 5;
    ctx.fillText(tagline.split('').join('  '), band.x + band.w / 2, band.y + band.h * 0.17);
    ctx.restore();
  }

  const title = (state.title ?? '').trim().toUpperCase() || 'NEON COAST';
  let titleSize = band.h * 0.46;
  const titleFont = (s) => `900 ${s}px "Arial Black", Impact, "Segoe UI", sans-serif`;
  ctx.font = titleFont(titleSize);
  while (ctx.measureText(title).width > band.w * 0.9 && titleSize > 14) {
    titleSize -= 2;
    ctx.font = titleFont(titleSize);
  }
  const titleBaseline = band.y + band.h * 0.79;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#150829';
  ctx.fillText(title, band.x + band.w / 2 + titleSize * 0.045, titleBaseline + titleSize * 0.06);
  ctx.lineWidth = titleSize * 0.17;
  ctx.strokeStyle = '#150829';
  ctx.strokeText(title, band.x + band.w / 2, titleBaseline);
  const titleGrad = ctx.createLinearGradient(0, titleBaseline - titleSize, 0, titleBaseline);
  titleGrad.addColorStop(0, grade.titleTop);
  titleGrad.addColorStop(0.55, grade.titleMid);
  titleGrad.addColorStop(1, grade.titleBottom);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, band.x + band.w / 2, titleBaseline);

  const subtitle = (state.subtitle ?? '').trim();
  if (subtitle) {
    ctx.save();
    ctx.translate(band.x + band.w / 2, band.y + band.h * 0.335);
    ctx.rotate(-0.035);
    const subSize = band.h * 0.21;
    ctx.font = `italic 700 ${subSize}px "Segoe Script", "Brush Script MT", cursive`;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = unit * 14;
    ctx.fillStyle = grade.script;
    ctx.fillText(subtitle, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `italic 700 ${subSize}px "Segoe Script", "Brush Script MT", cursive`;
    ctx.globalAlpha = 0.35;
    ctx.fillText(subtitle, 0, -subSize * 0.04);
    ctx.restore();
  }

  if (state.badge) {
    const badgeText = 'VICE COAST • EST. 2026';
    ctx.font = `700 ${Math.max(11, unit * 13.5)}px "Segoe UI", sans-serif`;
    const badgeW = ctx.measureText(badgeText).width + unit * 26;
    const badgeH = unit * 27;
    const badgeX = band.x + band.w / 2 - badgeW / 2;
    const badgeY = band.y + band.h - badgeH - unit * 5;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#150829';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = grade.accent;
    ctx.fillText(badgeText, band.x + band.w / 2, badgeY + badgeH * 0.68);
    ctx.restore();
  }
}

// Draws the whole cover. options: { showSelection } is editor-only chrome and
// is never part of an export.
export function drawGtaStyleCoverArtwork(ctx, state, options = {}) {
  const canvas = ctx.canvas;
  const W = canvas.width;
  const H = canvas.height;
  const unit = Math.min(W, H) / 1080;
  const grade = gradeById(state.gradeId);
  const layout = layoutById(state.layoutId);

  ctx.fillStyle = '#0a0616';
  ctx.fillRect(0, 0, W, H);

  const margin = Math.max(10, W * 0.016);
  const bandH = H * (W > H ? 0.25 : 0.235);
  const area = { x: margin, y: margin, w: W - margin * 2, h: H - bandH - margin * 1.6 };
  const gap = Math.max(4, unit * 7);
  const rects = getPanelRectsForLayout(layout, area);

  state.lastPanelRects = rects;

  rects.forEach((rawRect, index) => {
    const rect = {
      x: rawRect.x + gap / 2, y: rawRect.y + gap / 2,
      w: rawRect.w - gap, h: rawRect.h - gap, rot: rawRect.rot,
    };
    const panelState = state.panels[index] ?? { photoIndex: index, zoom: 1, panX: 0, panY: 0 };
    const image = state.photos[panelState.photoIndex] ?? state.photos[0] ?? null;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    ctx.fillStyle = '#f5f2ea';
    ctx.fillRect(rect.x - unit * 5, rect.y - unit * 5, rect.w + unit * 10, rect.h + unit * 10);
    drawPanelPhotoWithGrade(ctx, rect, image, panelState, grade, state, unit);
    ctx.lineWidth = unit * 2;
    ctx.strokeStyle = 'rgba(10,4,24,0.65)';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    if (options.showSelection && index === state.selectedPanel) {
      ctx.save();
      ctx.setLineDash([unit * 12, unit * 8]);
      ctx.lineWidth = unit * 5;
      ctx.strokeStyle = grade.accent;
      ctx.strokeRect(rawRect.x + unit * 2, rawRect.y + unit * 2, rawRect.w - unit * 4, rawRect.h - unit * 4);
      ctx.restore();
    }
  });

  const band = { x: margin, y: area.y + area.h + margin * 0.6, w: area.w, h: H - (area.y + area.h + margin * 0.6) - margin };
  drawPosterTitleLettering(ctx, band, state, grade, unit);

  if (state.stars) {
    const starSize = unit * 21;
    drawWantedStars(ctx, W - margin - starSize * 2.15 * 4 - starSize, margin + starSize * 1.15, starSize, 5);
  }

  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(5,2,14,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (state.grain) drawFilmGrain(ctx, W, H, unit);

  ctx.lineWidth = Math.max(3, unit * 6);
  ctx.strokeStyle = '#f5f2ea';
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}
