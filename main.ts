// Neon Coast Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only).
// The program hands in the offline cover-maker app: it copies app/ and screenshots/
// from beside this file into the output directory and writes dossier.json there with
// buildDossier from the vendored make.fun library, byte for byte as the scorer does.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyAppAndScreenshotsToOutput() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  }
}

function writeDossierForOutput() {
  const dossierText = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossierText);
}

copyAppAndScreenshotsToOutput();
writeDossierForOutput();
console.log(`Neon Coast Cover Studio handed in: app/ and screenshots/ copied to ${outputDir}, dossier.json written.`);
