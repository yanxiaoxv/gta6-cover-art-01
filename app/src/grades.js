// Colour grades: the Vice City sunset and neon washes that turn plain photos
// into poster panels, plus the title-block palette that goes with each one.
// A grade is applied per panel (a soft colour wash over the photo) and again
// across the whole cover (the title band and lettering colours).

export const COLOR_GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    swatch: ['#ff9a3d', '#ff2e88', '#3d1e6d'],
    washTop: 'rgba(255, 154, 61, 0.10)',
    washBottom: 'rgba(255, 46, 136, 0.34)',
    bandTop: '#2a1052',
    bandMid: '#7a1e5e',
    bandBottom: '#ff5e3a',
    titleTop: '#ffffff',
    titleMid: '#ffd23d',
    titleBottom: '#ff2e88',
    accent: '#00e5d4',
    script: '#7df9ff',
    sunCore: '#ffd23d',
    sunEdge: '#ff2e88',
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    swatch: ['#00e5ff', '#ff2ea6', '#0b1030'],
    washTop: 'rgba(0, 229, 255, 0.10)',
    washBottom: 'rgba(255, 46, 166, 0.30)',
    bandTop: '#05081f',
    bandMid: '#101d4d',
    bandBottom: '#3d0a4e',
    titleTop: '#ffffff',
    titleMid: '#7df9ff',
    titleBottom: '#ff2ea6',
    accent: '#ffe93d',
    script: '#ff7ad9',
    sunCore: '#00e5ff',
    sunEdge: '#ff2ea6',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    swatch: ['#ffc93d', '#ff7a3d', '#5e2a10'],
    washTop: 'rgba(255, 201, 61, 0.12)',
    washBottom: 'rgba(255, 110, 40, 0.30)',
    bandTop: '#33150a',
    bandMid: '#8a3b12',
    bandBottom: '#e0641e',
    titleTop: '#fffbe8',
    titleMid: '#ffd23d',
    titleBottom: '#ff7a3d',
    accent: '#3ddad7',
    script: '#ffe9a8',
    sunCore: '#ffe93d',
    sunEdge: '#ff7a3d',
  },
  {
    id: 'teal-heat',
    name: 'Teal Heat',
    swatch: ['#0fd8c2', '#0a6e8a', '#f2e14c'],
    washTop: 'rgba(15, 216, 194, 0.12)',
    washBottom: 'rgba(255, 84, 60, 0.26)',
    bandTop: '#04222e',
    bandMid: '#0a556e',
    bandBottom: '#0fd8c2',
    titleTop: '#ffffff',
    titleMid: '#b8fff4',
    titleBottom: '#0fd8c2',
    accent: '#f2e14c',
    script: '#f2e14c',
    sunCore: '#f2e14c',
    sunEdge: '#0fd8c2',
  },
  {
    id: 'midnight-noir',
    name: 'Midnight Noir',
    swatch: ['#e8e8f0', '#5a5a78', '#0a0a14'],
    washTop: 'rgba(160, 160, 200, 0.08)',
    washBottom: 'rgba(10, 10, 30, 0.42)',
    bandTop: '#06060e',
    bandMid: '#17172a',
    bandBottom: '#2e2e4a',
    titleTop: '#ffffff',
    titleMid: '#c9c9de',
    titleBottom: '#7a7a9e',
    accent: '#ff3d5e',
    script: '#ff8fa8',
    sunCore: '#e8e8f0',
    sunEdge: '#5a5a78',
  },
];

export function gradeById(gradeId) {
  return COLOR_GRADES.find((grade) => grade.id === gradeId) ?? COLOR_GRADES[0];
}

// Paints a grade's two-stop wash over one panel rectangle. The caller clips
// to the panel first, so this simply fills the rect.
export function applyGradeWashToPanel(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}
