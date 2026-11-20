// Neon Coast Cover Studio — editor wiring. Loads the sample photos for an
// instant first cover, then lets the maker add their own photos, fill each
// panel, drag and zoom inside panels, pick a layout and grade, edit the
// words and export PNGs at the three post sizes. All local, all offline.

import { drawGtaStyleCoverArtwork, postSizeById, POST_SIZES } from './cover.js';
import { COVER_LAYOUTS, layoutById, findPanelAtPoint } from './layouts.js';
import { COLOR_GRADES } from './grades.js';
import { runScreenshotScene } from './shots.js';

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const exportStatus = document.getElementById('exportStatus');

const SAMPLE_PHOTOS = ['boulevard', 'rooftop', 'neon', 'pier'];

export const coverState = {
  layoutId: 'vice-grid',
  gradeId: 'vice-sunset',
  sizeId: 'square',
  title: 'NEON COAST',
  subtitle: 'Vice Nights',
  tagline: 'One city. Five stories. No brakes.',
  photos: [],
  photoSources: [],
  panels: [],
  selectedPanel: 0,
  ink: true,
  halftone: true,
  grain: true,
  stars: true,
  badge: true,
  lastPanelRects: [],
};

const undoStack = [];
const redoStack = [];

export function ensurePanelStates() {
  const count = layoutById(coverState.layoutId).panels.length;
  while (coverState.panels.length < count) {
    const index = coverState.panels.length;
    coverState.panels.push({ photoIndex: index, zoom: 1, panX: 0, panY: 0 });
  }
  if (coverState.selectedPanel >= count) coverState.selectedPanel = 0;
}

export function snapshotEditableState() {
  return JSON.stringify({
    layoutId: coverState.layoutId, gradeId: coverState.gradeId, sizeId: coverState.sizeId,
    title: coverState.title, subtitle: coverState.subtitle, tagline: coverState.tagline,
    panels: coverState.panels, selectedPanel: coverState.selectedPanel,
    ink: coverState.ink, halftone: coverState.halftone, grain: coverState.grain,
    stars: coverState.stars, badge: coverState.badge,
  });
}

export function restoreEditableState(snapshot) {
  Object.assign(coverState, JSON.parse(snapshot));
  syncControlsFromState();
  redrawCoverPreview();
}

export function pushUndoHistory() {
  undoStack.push(snapshotEditableState());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}

export function undoLastEdit() {
  if (!undoStack.length) return;
  redoStack.push(snapshotEditableState());
  restoreEditableState(undoStack.pop());
}

export function redoLastEdit() {
  if (!redoStack.length) return;
  undoStack.push(snapshotEditableState());
  restoreEditableState(redoStack.pop());
}

export function redrawCoverPreview() {
  ensurePanelStates();
  const size = postSizeById(coverState.sizeId);
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawGtaStyleCoverArtwork(ctx, coverState, { showSelection: !coverState.hideSelection });
}

// A curated fill order so a five-panel layout over four photos repeats the
// wide rooftop shot in the short foot panel instead of a tight hero crop.
export const PANEL_PHOTO_SEQUENCE = [0, 1, 2, 3, 1, 0, 2, 3, 1];

export function assignCuratedPanelPhotos(photoCount) {
  coverState.panels.forEach((panel, index) => {
    panel.photoIndex = PANEL_PHOTO_SEQUENCE[index % PANEL_PHOTO_SEQUENCE.length] % photoCount;
  });
  if (coverState.panels[0]) coverState.panels[0].panY = 0.18;
}

// Applies a screenshot scene's per-panel framing: "0:0.18,4:0.45" sets
// panY (or panX) on the named panels, after the photo assignment is fixed.
export function applyScenePanelFraming(panSpec, key) {
  for (const pair of panSpec.split(',')) {
    const [indexText, valueText] = pair.split(':');
    const panel = coverState.panels[Number(indexText)];
    if (panel && valueText !== undefined) panel[key] = Number(valueText);
  }
}

export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function loadSamplePhotosByName(names) {
  const loaded = [];
  for (const name of names) {
    const url = `samples/${name}.jpg`;
    loaded.push({ image: await loadImageFromUrl(url), source: url });
  }
  return loaded;
}

export function setPhotos(loadedPhotos) {
  coverState.photos = loadedPhotos.map((entry) => entry.image);
  coverState.photoSources = loadedPhotos.map((entry) => entry.source);
  coverState.panels = coverState.panels.map((panel, index) => ({
    ...panel,
    photoIndex: Math.min(panel.photoIndex, Math.max(0, coverState.photos.length - 1)),
    ...(panel.photoIndex === index ? {} : {}),
  }));
  renderPhotoTray();
}

export function renderPhotoTray() {
  const tray = document.getElementById('photoTray');
  tray.innerHTML = '';
  coverState.photoSources.forEach((source, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = `Put photo ${index + 1} in the selected panel`;
    const img = document.createElement('img');
    img.src = source;
    img.alt = `Photo ${index + 1}`;
    button.appendChild(img);
    if (coverState.panels[coverState.selectedPanel]?.photoIndex === index) button.classList.add('active');
    button.addEventListener('click', () => assignPhotoToSelectedPanel(index));
    tray.appendChild(button);
  });
}

export function assignPhotoToSelectedPanel(photoIndex) {
  pushUndoHistory();
  ensurePanelStates();
  coverState.panels[coverState.selectedPanel].photoIndex = photoIndex;
  const count = layoutById(coverState.layoutId).panels.length;
  coverState.selectedPanel = (coverState.selectedPanel + 1) % count;
  syncPanelSliders();
  renderPhotoTray();
  redrawCoverPreview();
}

export async function loadPhotoFileIntoTray(file) {
  const url = URL.createObjectURL(file);
  const image = await loadImageFromUrl(url);
  coverState.photos.push(image);
  coverState.photoSources.push(url);
  renderPhotoTray();
  return coverState.photos.length - 1;
}

export async function addPhotoFiles(files) {
  pushUndoHistory();
  let firstNew = -1;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const index = await loadPhotoFileIntoTray(file);
    if (firstNew < 0) firstNew = index;
  }
  if (firstNew >= 0) {
    ensurePanelStates();
    coverState.panels[coverState.selectedPanel].photoIndex = firstNew;
  }
  renderPhotoTray();
  redrawCoverPreview();
}

export function setLayout(layoutId) {
  pushUndoHistory();
  coverState.layoutId = layoutId;
  coverState.selectedPanel = 0;
  buildChipLists();
  syncPanelSliders();
  redrawCoverPreview();
}

export function setGrade(gradeId) {
  pushUndoHistory();
  coverState.gradeId = gradeId;
  buildChipLists();
  redrawCoverPreview();
}

export function setCoverSize(sizeId) {
  pushUndoHistory();
  coverState.sizeId = sizeId;
  buildChipLists();
  redrawCoverPreview();
}

export function syncPanelSliders() {
  ensurePanelStates();
  const panel = coverState.panels[coverState.selectedPanel];
  document.getElementById('zoomRange').value = panel.zoom;
  document.getElementById('panXRange').value = panel.panX;
  document.getElementById('panYRange').value = panel.panY;
}

export function syncControlsFromState() {
  document.getElementById('titleInput').value = coverState.title;
  document.getElementById('subtitleInput').value = coverState.subtitle;
  document.getElementById('taglineInput').value = coverState.tagline;
  document.getElementById('inkToggle').checked = coverState.ink;
  document.getElementById('halftoneToggle').checked = coverState.halftone;
  document.getElementById('grainToggle').checked = coverState.grain;
  document.getElementById('starsToggle').checked = coverState.stars;
  document.getElementById('badgeToggle').checked = coverState.badge;
  buildChipLists();
  syncPanelSliders();
  renderPhotoTray();
}

export function buildChipLists() {
  const layoutList = document.getElementById('layoutList');
  layoutList.innerHTML = '';
  for (const layout of COVER_LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = layout.name;
    button.title = layout.blurb;
    if (layout.id === coverState.layoutId) button.classList.add('active');
    button.addEventListener('click', () => setLayout(layout.id));
    layoutList.appendChild(button);
  }
  const gradeList = document.getElementById('gradeList');
  gradeList.innerHTML = '';
  for (const grade of COLOR_GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    const dot = document.createElement('span');
    dot.className = 'sw';
    dot.style.background = `linear-gradient(135deg, ${grade.swatch[0]}, ${grade.swatch[1]}, ${grade.swatch[2]})`;
    button.appendChild(dot);
    button.appendChild(document.createTextNode(grade.name));
    if (grade.id === coverState.gradeId) button.classList.add('active');
    button.addEventListener('click', () => setGrade(grade.id));
    gradeList.appendChild(button);
  }
  const sizeList = document.getElementById('sizeList');
  sizeList.innerHTML = '';
  for (const size of POST_SIZES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = size.name;
    if (size.id === coverState.sizeId) button.classList.add('active');
    button.addEventListener('click', () => setCoverSize(size.id));
    sizeList.appendChild(button);
  }
}

export function renderCoverAtSize(sizeId) {
  const size = postSizeById(sizeId);
  const offscreen = document.createElement('canvas');
  offscreen.width = size.w;
  offscreen.height = size.h;
  const offCtx = offscreen.getContext('2d');
  const savedSize = coverState.sizeId;
  coverState.sizeId = sizeId;
  drawGtaStyleCoverArtwork(offCtx, { ...coverState, sizeId }, {});
  coverState.sizeId = savedSize;
  return offscreen;
}

export function downloadCanvasPng(canvasEl, filename) {
  canvasEl.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, 'image/png');
}

export function exportCoverAsPng() {
  const size = postSizeById(coverState.sizeId);
  downloadCanvasPng(renderCoverAtSize(coverState.sizeId), `neon-coast-cover-${size.w}x${size.h}.png`);
  exportStatus.textContent = `Saved neon-coast-cover-${size.w}x${size.h}.png`;
}

export function exportAllPostSizes() {
  POST_SIZES.forEach((size, index) => {
    setTimeout(() => {
      downloadCanvasPng(renderCoverAtSize(size.id), `neon-coast-cover-${size.w}x${size.h}.png`);
    }, index * 450);
  });
  exportStatus.textContent = 'Saving all three sizes: 1080 × 1080, 1080 × 1350 and 1920 × 1080…';
}

export function shufflePhotosAcrossPanels() {
  pushUndoHistory();
  ensurePanelStates();
  const order = coverState.panels.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  coverState.panels.forEach((panel, index) => {
    panel.photoIndex = coverState.photos.length ? order[index] % coverState.photos.length : 0;
  });
  renderPhotoTray();
  redrawCoverPreview();
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function wireEditorEvents() {
  document.getElementById('photoInput').addEventListener('change', (event) => {
    addPhotoFiles([...event.target.files]);
  });
  const drop = document.getElementById('photoDrop');
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('dragging'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('dragging');
    addPhotoFiles([...event.dataTransfer.files]);
  });

  for (const [id, key] of [['titleInput', 'title'], ['subtitleInput', 'subtitle'], ['taglineInput', 'tagline']]) {
    document.getElementById(id).addEventListener('input', (event) => {
      coverState[key] = event.target.value;
      redrawCoverPreview();
    });
  }
  for (const [id, key] of [['zoomRange', 'zoom'], ['panXRange', 'panX'], ['panYRange', 'panY']]) {
    const input = document.getElementById(id);
    input.addEventListener('change', () => pushUndoHistory());
    input.addEventListener('input', () => {
      ensurePanelStates();
      coverState.panels[coverState.selectedPanel][key] = Number(input.value);
      redrawCoverPreview();
    });
  }
  for (const [id, key] of [['inkToggle', 'ink'], ['halftoneToggle', 'halftone'], ['grainToggle', 'grain'], ['starsToggle', 'stars'], ['badgeToggle', 'badge']]) {
    document.getElementById(id).addEventListener('change', (event) => {
      pushUndoHistory();
      coverState[key] = event.target.checked;
      redrawCoverPreview();
    });
  }
  document.getElementById('shuffleButton').addEventListener('click', shufflePhotosAcrossPanels);
  document.getElementById('undoButton').addEventListener('click', undoLastEdit);
  document.getElementById('redoButton').addEventListener('click', redoLastEdit);
  document.getElementById('exportPngButton').addEventListener('click', exportCoverAsPng);
  document.getElementById('exportAllButton').addEventListener('click', exportAllPostSizes);

  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPointFromEvent(event);
    const index = findPanelAtPoint(coverState.lastPanelRects, point.x, point.y);
    if (index < 0) return;
    coverState.selectedPanel = index;
    syncPanelSliders();
    renderPhotoTray();
    pushUndoHistory();
    drag = { startX: point.x, startY: point.y, panel: { ...coverState.panels[index] }, rect: coverState.lastPanelRects[index] };
    canvas.setPointerCapture(event.pointerId);
    redrawCoverPreview();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPointFromEvent(event);
    const panel = coverState.panels[coverState.selectedPanel];
    panel.panX = Math.max(-0.6, Math.min(0.6, drag.panel.panX + (point.x - drag.startX) / drag.rect.w));
    panel.panY = Math.max(-0.6, Math.min(0.6, drag.panel.panY + (point.y - drag.startY) / drag.rect.h));
    syncPanelSliders();
    redrawCoverPreview();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = canvasPointFromEvent(event);
    const index = findPanelAtPoint(coverState.lastPanelRects, point.x, point.y);
    if (index < 0) return;
    coverState.selectedPanel = index;
    const panel = coverState.panels[index];
    panel.zoom = Math.max(1, Math.min(2.6, panel.zoom * (event.deltaY < 0 ? 1.07 : 0.93)));
    syncPanelSliders();
    redrawCoverPreview();
  }, { passive: false });
}

async function applyScreenshotScene(scene) {
  const photos = await loadSamplePhotosByName(scene.photoNames);
  setPhotos(photos);
  if (scene.layoutId) coverState.layoutId = scene.layoutId;
  if (scene.gradeId) coverState.gradeId = scene.gradeId;
  if (scene.sizeId) coverState.sizeId = scene.sizeId;
  if (scene.title) coverState.title = scene.title;
  if (scene.subtitle) coverState.subtitle = scene.subtitle;
  if (scene.tagline) coverState.tagline = scene.tagline;
  coverState.hideSelection = scene.shot === 'cover';
  coverState.panels = [];
  ensurePanelStates();
  if (photos.length === layoutById(coverState.layoutId).panels.length) {
    coverState.panels.forEach((panel, index) => { panel.photoIndex = index; });
  } else {
    assignCuratedPanelPhotos(photos.length);
  }
  if (scene.panY) applyScenePanelFraming(scene.panY, 'panY');
  if (scene.panX) applyScenePanelFraming(scene.panX, 'panX');
  syncControlsFromState();
  redrawCoverPreview();
}

async function startStudio() {
  wireEditorEvents();
  buildChipLists();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runScreenshotScene(query, applyScreenshotScene);
    return;
  }
  const samples = await loadSamplePhotosByName(SAMPLE_PHOTOS);
  setPhotos(samples);
  coverState.panels = [];
  ensurePanelStates();
  assignCuratedPanelPhotos(samples.length);
  syncControlsFromState();
  redrawCoverPreview();
}

startStudio();
