// Colour grades for Neon Coast Cover Studio.
// Each grade carries: a backdrop sky for the snapshot stack, a cycled list of
// per-panel tint colours, the headline gradient pair, the script subtitle
// colour, the foot scrim colour, and the saturation / contrast the poster-ink
// pass leans on. Tints cycle by panel index so one photo spread across a grid
// still reads as one graded poster.

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    sky: ['#2a1052', '#7a1e5e', '#e0492f', '#ff9a3d'],
    tints: ['#ff7a3d', '#ff3d7e', '#7a3dff', '#ffb03d'],
    titleA: '#ffe259',
    titleB: '#ff7518',
    titleEdge: '#5e1030',
    script: '#7df9ff',
    scrim: 'rgba(24,4,32,0.88)',
    sat: 1.28,
    con: 1.14,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    sky: ['#03081e', '#0a1e4a', '#3d0a5e', '#0e4a5e'],
    tints: ['#00e5ff', '#ff2fb3', '#3151ff', '#00ffa3'],
    titleA: '#8ef7ff',
    titleB: '#ff4fd8',
    titleEdge: '#0a1030',
    script: '#ffe95e',
    scrim: 'rgba(2,6,24,0.9)',
    sat: 1.35,
    con: 1.18,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    sky: ['#3a1c08', '#8a4416', '#e08a2e', '#ffd76a'],
    tints: ['#ffb03d', '#ff7a4d', '#c85a2e', '#ffd76a'],
    titleA: '#fff3b0',
    titleB: '#ff9a3d',
    titleEdge: '#4a2408',
    script: '#ffffff',
    scrim: 'rgba(32,16,2,0.88)',
    sat: 1.18,
    con: 1.08,
  },
  {
    id: 'teal-heat',
    name: 'Teal Heat',
    sky: ['#02282e', '#065a5e', '#0e8a7a', '#ffb35c'],
    tints: ['#0ec8b8', '#ff6b4a', '#0e7ac8', '#ffc44d'],
    titleA: '#a7fff4',
    titleB: '#ffb35c',
    titleEdge: '#06333a',
    script: '#ff6ec7',
    scrim: 'rgba(2,26,30,0.88)',
    sat: 1.3,
    con: 1.15,
  },
  {
    id: 'midnight-noir',
    name: 'Midnight Noir',
    sky: ['#05070c', '#101828', '#1e2c44', '#31435e'],
    tints: ['#5e7a9e', '#31435e', '#7a8aa5', '#22314a'],
    titleA: '#ffffff',
    titleB: '#9fb4c8',
    titleEdge: '#05070c',
    script: '#ffd76a',
    scrim: 'rgba(3,5,10,0.92)',
    sat: 0.72,
    con: 1.22,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function tintForPanel(grade, index) {
  return grade.tints[index % grade.tints.length];
}
