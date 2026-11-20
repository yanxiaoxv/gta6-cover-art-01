# DEVLOG — Neon Coast Cover Studio (gta6-cover-art-01, second-round rebuild)

This entry was rebuilt from zero in a fresh recording after the first
submission was rejected on two transcript technicalities (an unrelated voice
session swept into the recording, and a README finished outside it). Every
file here, this log and the README included, was written inside the new
recording. The app itself is unchanged in ambition: a zero-dependency
Canvas 2D cover maker with 6 layouts, 5 grades, per-panel crop/pan/zoom,
a full headline system, deterministic Surprise me, undo/redo, and PNG
exports at 1080x1080, 1080x1350 and 1920x1080. The four sample photos were
generated for this build and are bundled under app/samples/.

## Round 1 — build and self-review

Built the full studio: layouts.js (Vice Grid, Hero & Trio, Poster Strips,
Snapshot Stack, Duel Split, Nine Lives), grades.js (Vice Sunset, Neon
Night, Golden Hour, Teal Heat, Midnight Noir, each with per-panel tints and
its own title colours), cover.js (cover-fit renderer with clamped pan,
poster-ink filter, halftone, grain, wanted stars, striped sunset disc, palm
silhouettes, gradient headline + script subtitle, city badge, price strip),
main.js (tray, per-panel assignment, drag/wheel/slider zoom, uploads,
undo/redo, exports), shots.js (?shot= scenes), plus main.ts / serve.ts /
shots.json / README.md. Screenshots were captured from the app's own shot
scenes with a headless browser. (Process note: port 8080 was already held
by another local server, so captures ran against the same serve.ts on
--port 8123; the app itself still defaults to 8080.)

Self-scores after inspecting all four screenshots closely:

- Screenshot art: 7/10. Colours and the headline land, but the sunset disc
  swallowed most of the top-right panel in Nine Lives, the script subtitle
  collided with the main title in the landscape cover, and the Snapshot
  Stack prints buried two faces under the next print.
- Any-photo usability: 8/10. Pan is clamped by construction (cover-fit plus
  overflow clamp, so no panel can show a gap) and tray/upload/assignment all
  work; the stack overlap and the Duel Split triangle can still hide a face.
- Speed and ease of export: 9/10. One click per size, one click for all
  three, no editor outline on exports by design.
- Polish: 7/10. One real defect: cover scenes rendered the editor's dashed
  selection outline and PANEL label, which must never appear on a cover.
  The nine-lives screenshot also sat at 257 KiB, too close to the 256 KiB
  gate limit for comfort.

## Round 2 — fixing the weakest items (art and polish)

- Shot mode in main.js now renders cover scenes with no selection outline;
  the editor screenshot keeps it, as an editor should.
- The sunset disc shrank (radius 0.115 -> 0.084 of the short side) and moved
  up (centre 0.80/0.185 -> 0.815/0.148), so it sits in sky and clears faces,
  the badge and the stars.
- The script subtitle moved up (baseline 0.815 -> 0.786 of height) so it no
  longer collides with the title's cap line in wide covers.
- Snapshot Stack geometry reworked (prints 0.58x0.54 -> 0.56x0.50, spread
  wider): all three sample faces now stay clear of the print on top of them.
- shots.js learned the editor's own effect toggles (&disc=0 and friends);
  the Nine Lives scene uses disc=0, since a nine-panel grid is busy enough.
- Screenshot encoding now targets at most 248 KiB for margin.

Re-captured all four screenshots and inspected them again: no selection
outline on any cover, no face out of frame, no panel gaps, no heavy
halftone (it stays off by default and light when on). The nine-grid still
repeats the four samples across nine panels, which is inherent to a
4-photo library and accepted.

Round 2 self-scores: art 8.5/10, any-photo usability 8.5/10, speed and
ease 9/10, polish 8.5/10.

## Verification

- `node main.ts` run twice into two output directories: dossier.json is
  byte-identical between runs (sha256 checked) and under the 1.5 MiB cap.
- Screenshots: 4 JPEGs, each at most 256 KiB, long side at most 1280,
  short side at least 480.
- app/ contains no network references: every script, style and image the
  page loads is a file under app/; photos are read locally, never uploaded.
- vendor/makefun-app.ts is the kit copy, unchanged (sha256 matches).

Status: complete, awaiting main-session review. Not submitted, not pushed.
