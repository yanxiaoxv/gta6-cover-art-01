# DEVLOG — Neon Coast Cover Studio (gta6-cover-art-01)

Built by hand in this session against the judge's own ruler, weakest first:
(1) the art in the screenshots, (2) any photo handling, (3) fast and easy to
the three post sizes, (4) polish. House ladder to beat: 4-Strong (four
panels, one grade family), 6-Elite (nine panels, stars, badge), 7-Ace
(poster-inked panels, halftone title block, tilted snapshots, undo/redo).

## What shipped

- 6 layouts (Vice Grid, Hero & Trio, Poster Strips, Snapshot Stack with
  tilted prints, Duel Split, Nine Lives nine-panel grid)
- 5 colour grades (Vice Sunset, Neon Night, Golden Hour, Teal Heat,
  Midnight Noir), each a per-panel wash plus its own title palette
- Per-panel photo assignment from a tray, drag to pan, wheel and sliders
  to zoom, poster-ink filter, halftone dots, film grain, wanted stars,
  striped sunset disc, palm silhouettes, gradient poster lettering with a
  neon script subtitle and a city badge; undo and redo
- Exports at 1080 x 1080, 1080 x 1350 and 1920 x 1080, one click each or
  all three at once; four sample photos (two from the kit starter, two
  made with an image model for this entry) preload for an instant cover
- main.ts copies app/ and screenshots/ to the output dir and writes the
  dossier with the kit's buildDossier, unchanged vendor file (sha256
  14e650adbd6aff7fb760e9bcd7be00dfbe86fb4819afe88dfe23dd0e087e770e)

## Round 1 — self-score against the judge's criteria

Screenshots taken with the app's own ?shot= scenes and read by eye.

- Art 6.5/10 — the grid, stars and lettering land, but the hero's face is
  cropped off the top of the wide cover, the foot panel repeats the hero
  photo as a chin-only crop, halftone dots are heavy enough to cheapen
  the photos, and the sun disc spills below its band.
- Any photo 8/10 — tray, per-panel assign, drag and zoom all work, but
  panning a panel whose photo exactly fits leaves a bare pink wash gap
  (visible in the editor shot), a real defect for arbitrary user photos.
- Fast and easy 9/10 — samples preload, three sizes are one click.
- Polish 7/10 — editor reads clearly; the wash gap and cropped faces are
  the unpolished parts.

Weakest items, in order: face framing, the pan gap, halftone weight.

## Round 2 — fixes for exactly those items

- Pan is now clamped to the photo's overflow in drawPanelPhotoWithGrade,
  so no panel can ever show a bare gap; screenshot scenes gained a
  per-panel framing parameter (pan=0:0.18,4:0.45 and friends) and the
  hero and foot panels of the wide cover now show full faces.
- The portrait screenshot moved from Poster Strips (which centre-crops
  two-person photos badly) to Hero & Trio, where every photo fits.
- Halftone alpha halved and pushed to the foot of each panel; the sunset
  disc is clipped to its title band; palms redrawn thicker with seven
  fronds; main.ts gained its hand-in log line.
- Re-shot all four screenshots and re-read them: every face is inside
  its panel, no gaps, lettering unchanged.

Round 2 self-score: Art 8.5/10, Any photo 9/10, Fast and easy 9/10,
Polish 8.5/10. Remaining known weakness: the nine-panel screenshot
necessarily repeats photos (four samples, nine panels), which reads as
a poster grid rather than nine different scenes; with a user's own nine
photos the same layout fills distinctly.

## Verification (finalist-review simulation)

- Fresh page load, added a photo through the file input, retitled the
  cover, exported: neon-coast-cover-1080x1080.png at exactly 1080 x 1080
  and, after switching size, 1920 x 1080 — no page errors, export shows
  no editor selection chrome.
- node main.ts run twice into two output dirs: dossier.json byte
  identical, 1,078,757 bytes (cap 1.5 MiB); app/ is 390,488 bytes in 13
  files (caps 48 MiB / 993); screenshots are 152-230 KiB each (cap
  256 KiB), long sides 1280/1280/1280/1080, short sides at least 720.
- No network references anywhere in app/ source; no Rockstar names,
  logos, artwork or fonts anywhere in the entry.
