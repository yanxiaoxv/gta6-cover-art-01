// Neon Coast Cover Studio editor: wires the controls to the cover renderer.
// Photos never leave the machine: uploads are read as local object URLs and
// sample photos are plain files beside this script. Every change repaints the
// preview canvas through the same drawCover the exports use.

import {
  SAMPLE_PHOTOS,
  EXPORT_SIZES,
  createDefaultState,
  drawCover,
  makeCoverCanvas,
  clampTransform,
  transformFor,
  surpriseState,
} from './cover.js';
import { LAYOUTS, panelsFor, panelAt } from './layouts.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('statusLine');
const panelLabel = document.getElementById('panelLabel');

let state = createDefaultState();
let selectedPanel = 0;
let shotMode = false;
let activePhoto = state.assign[0];
const images = new Map();
const photoMeta = SAMPLE_PHOTOS.map((p) => ({ id: p.id, name: p.name, src: p.src }));
let uploadCounter = 0;

const undoStack = [];
const redoStack = [];
let pendingSnapshot = null;

function snapshot() {
  return JSON.stringify(state);
}

function recordHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 80) undoStack.shift();
  redoStack.length = 0;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function commitPending() {
  if (pendingSnapshot && pendingSnapshot !== snapshot()) {
    undoStack.push(pendingSnapshot);
    if (undoStack.length > 80) undoStack.shift();
    redoStack.length = 0;
  }
  pendingSnapshot = null;
  updateHistoryButtons();
}

function render() {
  // Shot scenes are exports by another name: they must never carry the
  // editor's selection outline, so shot mode always renders unselected.
  drawCover(ctx, canvas.width, canvas.height, state, images, { selectedPanel: shotMode ? -1 : selectedPanel });
  updatePanelPanel();
}

function currentPanels() {
  return panelsFor(state.layout, canvas.width, canvas.height);
}

function photoName(id) {
  const meta = photoMeta.find((p) => p.id === id);
  return meta ? meta.name : 'Empty';
}

function updatePanelPanel() {
  const panels = currentPanels();
  if (selectedPanel >= panels.length) selectedPanel = panels.length - 1;
  const t = transformFor(state, selectedPanel);
  panelLabel.textContent = `Panel ${selectedPanel + 1} of ${panels.length} — ${photoName(state.assign[selectedPanel])}. Drag the photo to pan, scroll to zoom.`;
  const zoom = document.getElementById('zoomRange');
  zoom.value = Math.round(t.zoom * 100);
  document.getElementById('zoomValue').textContent = `${Math.round(t.zoom * 100)}%`;
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('.tray-item').forEach((b) => b.classList.toggle('active', b.dataset.photo === activePhoto));
}

function setStatus(text) {
  statusLine.textContent = text;
}

// ---- Photo tray -----------------------------------------------------------

function loadImageInto(id, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images.set(id, img);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

const samplesReady = Promise.all(photoMeta.map((p) => loadImageInto(p.id, p.src))).then(() => render());

function buildTray() {
  const tray = document.getElementById('tray');
  tray.innerHTML = '';
  photoMeta.forEach((meta) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tray-item';
    btn.dataset.photo = meta.id;
    const img = document.createElement('img');
    img.src = meta.src;
    img.alt = meta.name;
    const label = document.createElement('span');
    label.textContent = meta.name;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      activePhoto = meta.id;
      recordHistory();
      state.assign[selectedPanel] = meta.id;
      delete state.pan[selectedPanel];
      render();
      setStatus(`${meta.name} placed in panel ${selectedPanel + 1}.`);
    });
    tray.append(btn);
  });
}

document.getElementById('uploadInput').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    uploadCounter += 1;
    const id = `upload-${uploadCounter}`;
    const src = URL.createObjectURL(file);
    photoMeta.push({ id, name: file.name.replace(/\.[^.]+$/, '') || 'My photo', src });
    await loadImageInto(id, src);
  }
  if (files.length) {
    buildTray();
    activePhoto = photoMeta[photoMeta.length - 1].id;
    recordHistory();
    state.assign[selectedPanel] = activePhoto;
    delete state.pan[selectedPanel];
    render();
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added and placed in panel ${selectedPanel + 1}.`);
  }
  event.target.value = '';
});

// ---- Layout and grade pickers --------------------------------------------

function buildPickers() {
  const layoutList = document.getElementById('layoutList');
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = layout.id;
    btn.innerHTML = '';
    const name = document.createElement('strong');
    name.textContent = layout.name;
    const blurb = document.createElement('small');
    blurb.textContent = layout.blurb;
    btn.append(name, blurb);
    btn.addEventListener('click', () => {
      recordHistory();
      state.layout = layout.id;
      if (selectedPanel >= layout.panels(canvas.width, canvas.height).length) selectedPanel = 0;
      render();
    });
    layoutList.append(btn);
  });
  const gradeList = document.getElementById('gradeList');
  GRADES.forEach((grade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn';
    btn.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `linear-gradient(135deg, ${grade.sky[1]}, ${grade.tints[0]} 55%, ${grade.tints[1]})`;
    const name = document.createElement('span');
    name.textContent = grade.name;
    btn.append(swatch, name);
    btn.addEventListener('click', () => {
      recordHistory();
      state.grade = grade.id;
      render();
    });
    gradeList.append(btn);
  });
}

// ---- Headline and effects controls ----------------------------------------

function bindText(id, apply) {
  const el = document.getElementById(id);
  el.addEventListener('focus', () => {
    pendingSnapshot = snapshot();
  });
  el.addEventListener('input', () => {
    apply(el.value);
    render();
  });
  el.addEventListener('change', commitPending);
}

function bindToggle(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('change', () => {
    recordHistory();
    state[key] = el.checked;
    render();
  });
}

function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('kicker1Input').value = state.kickers[0] || '';
  document.getElementById('kicker2Input').value = state.kickers[1] || '';
  document.getElementById('kicker3Input').value = state.kickers[2] || '';
  document.getElementById('badgeInput').value = state.badge;
  document.getElementById('priceInput').value = state.price;
  document.getElementById('starsRange').value = state.stars;
  document.getElementById('starsValue').textContent = `${state.stars} / 5`;
  document.getElementById('inkToggle').checked = state.ink;
  document.getElementById('halftoneToggle').checked = state.halftone;
  document.getElementById('grainToggle').checked = state.grain;
  document.getElementById('discToggle').checked = state.disc;
  document.getElementById('palmsToggle').checked = state.palms;
}

function bindControls() {
  bindText('titleInput', (v) => { state.title = v; });
  bindText('subtitleInput', (v) => { state.subtitle = v; });
  bindText('kicker1Input', (v) => { state.kickers[0] = v; });
  bindText('kicker2Input', (v) => { state.kickers[1] = v; });
  bindText('kicker3Input', (v) => { state.kickers[2] = v; });
  bindText('badgeInput', (v) => { state.badge = v.slice(0, 3); });
  bindText('priceInput', (v) => { state.price = v; });
  bindToggle('inkToggle', 'ink');
  bindToggle('halftoneToggle', 'halftone');
  bindToggle('grainToggle', 'grain');
  bindToggle('discToggle', 'disc');
  bindToggle('palmsToggle', 'palms');

  const stars = document.getElementById('starsRange');
  stars.addEventListener('focus', () => { pendingSnapshot = snapshot(); });
  stars.addEventListener('input', () => {
    state.stars = Number(stars.value);
    document.getElementById('starsValue').textContent = `${state.stars} / 5`;
    render();
  });
  stars.addEventListener('change', commitPending);

  const zoom = document.getElementById('zoomRange');
  zoom.addEventListener('focus', () => { pendingSnapshot = snapshot(); });
  zoom.addEventListener('input', () => {
    setPanelZoom(selectedPanel, Number(zoom.value) / 100);
  });
  zoom.addEventListener('change', commitPending);

  document.getElementById('fillAllBtn').addEventListener('click', () => {
    recordHistory();
    const panels = currentPanels();
    for (let i = 0; i < panels.length; i += 1) state.assign[i] = activePhoto;
    state.pan = {};
    render();
    setStatus(`${photoName(activePhoto)} now fills every panel.`);
  });

  document.getElementById('surpriseBtn').addEventListener('click', () => {
    recordHistory();
    state = surpriseState(state, photoMeta.map((p) => p.id));
    selectedPanel = 0;
    activePhoto = state.assign[0];
    syncControls();
    render();
    setStatus('Surprise applied. Same cover in, same surprise out: it is seeded, not random.');
  });

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    }
  });

  const sizeSelect = document.getElementById('sizeSelect');
  EXPORT_SIZES.forEach((size) => {
    const opt = document.createElement('option');
    opt.value = size.id;
    opt.textContent = `${size.name} — ${size.w} x ${size.h}`;
    sizeSelect.append(opt);
  });
  sizeSelect.value = 'square';
  sizeSelect.addEventListener('change', () => {
    const size = EXPORT_SIZES.find((s) => s.id === sizeSelect.value) || EXPORT_SIZES[0];
    canvas.width = size.w;
    canvas.height = size.h;
    render();
  });

  document.getElementById('exportBtn').addEventListener('click', () => exportSize(currentSize()));
  document.getElementById('exportAllBtn').addEventListener('click', async () => {
    for (const size of EXPORT_SIZES) {
      exportSize(size);
      await new Promise((r) => setTimeout(r, 350));
    }
    setStatus('All three sizes exported as PNG.');
  });
}

function currentSize() {
  const id = document.getElementById('sizeSelect').value;
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

function exportSize(size) {
  const out = makeCoverCanvas(state, images, size.w, size.h);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus(`Saved neon-coast-cover-${size.w}x${size.h}.png`);
  }, 'image/png');
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  state = JSON.parse(undoStack.pop());
  syncControls();
  render();
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  state = JSON.parse(redoStack.pop());
  syncControls();
  render();
  updateHistoryButtons();
}

// ---- Canvas pan and zoom ----------------------------------------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function setPanelZoom(index, zoom) {
  const panels = currentPanels();
  const img = images.get(state.assign[index]);
  const t = transformFor(state, index);
  const next = { dx: t.dx, dy: t.dy, zoom };
  if (img) {
    const clamped = clampTransform(panels[index], img.naturalWidth, img.naturalHeight, next);
    state.pan[index] = clamped;
  } else {
    state.pan[index] = next;
  }
  render();
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const panels = currentPanels();
  const hit = panelAt(panels, point.x, point.y);
  if (hit >= 0) selectedPanel = hit;
  activePhoto = state.assign[selectedPanel] || activePhoto;
  pendingSnapshot = snapshot();
  drag = { x: point.x, y: point.y, panel: selectedPanel };
  canvas.setPointerCapture(event.pointerId);
  render();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panels = currentPanels();
  const panel = panels[drag.panel];
  const img = images.get(state.assign[drag.panel]);
  const t = transformFor(state, drag.panel);
  const next = { dx: t.dx + (point.x - drag.x), dy: t.dy + (point.y - drag.y), zoom: t.zoom };
  if (img && panel) {
    state.pan[drag.panel] = clampTransform(panel, img.naturalWidth, img.naturalHeight, next);
  } else {
    state.pan[drag.panel] = next;
  }
  drag.x = point.x;
  drag.y = point.y;
  render();
});

function endDrag() {
  if (drag) commitPending();
  drag = null;
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const panels = currentPanels();
  const hit = panelAt(panels, point.x, point.y);
  const index = hit >= 0 ? hit : selectedPanel;
  selectedPanel = index;
  if (!pendingSnapshot) pendingSnapshot = snapshot();
  const t = transformFor(state, index);
  setPanelZoom(index, t.zoom * Math.exp(-event.deltaY * 0.0012));
  clearTimeout(canvas._wheelTimer);
  canvas._wheelTimer = setTimeout(commitPending, 450);
}, { passive: false });

// ---- Boot -------------------------------------------------------------------

buildTray();
buildPickers();
bindControls();
syncControls();
canvas.width = 1080;
canvas.height = 1080;
render();
updateHistoryButtons();
samplesReady.then(() => render());

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  shotMode = query.get('shot') === 'cover';
  runShot(query, {
    applyScene(patch) {
      Object.assign(state, patch);
      selectedPanel = 0;
      syncControls();
    },
    setCanvasSize(w, h) {
      canvas.width = w;
      canvas.height = h;
    },
    whenImagesReady() {
      return samplesReady;
    },
    render,
  });
}
