// Neon Coast Cover Studio — entry program for gta6-cover-art-01 (Node 22, standard library only).
// The deliverable is the static web app in app/ plus the maker's screenshots in screenshots/.
// This program hands them in: it mirrors both folders into the output directory and writes
// dossier.json there with buildDossier from the vendored make.fun library, which must stay
// byte-identical to the kit copy so the grader's rebuild matches this one exactly.
// Locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output directory is /output; MAKEFUN_OUTPUT_DIR stands in for it elsewhere.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the sealed gate's own limits, so a local run refuses anything the
// scorer would refuse anyway: dossier text budget, at most 4 screenshots of 256 KiB each,
// at most 993 app entries totalling 48 MiB, and no app path longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`dossier written: ${dossier.length} bytes -> ${join(outputDir, 'dossier.json')}`);
