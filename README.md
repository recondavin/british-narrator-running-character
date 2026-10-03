# British narrator + running SVG character

This public bundle contains the existing **88 Hz British narrator MP3** and the current layered SVG character rig, including runnable walk/run animations and four rendered preview videos.

![Character preview](rig/person-rig-candidate-preview.png)

## Use immediately

```bash
git clone https://github.com/recondavin/british-narrator-running-character.git
cd british-narrator-running-character
python3 -m http.server 8000
```

Open <http://localhost:8000/>. The landing page plays the audio and both running previews. Open <http://localhost:8000/rig/demo.html> for the interactive SVG rig.

No install is required to inspect or use the SVG, MP3, MP4 previews, or browser demo.

## Included assets

- `audio/first-qwen-voice-88hz.mp3` — existing British educational narrator take.
- `rig/person-rig-candidate.svg` — front-facing layered source rig.
- `rig/person-rig-projected.svg` — generated projected rig used for the Front 45° view.
- `rig/person-rig-side-candidate.svg` — side-view source rig.
- `rig/person-rig-front-45-candidate.svg` — retained Front 45° candidate source.
- `rig/demo.html` — interactive Front, Front 45°, Side, Wave, Walk and Neutral controls.
- `previews/` — v137 H.264 walk/run previews at 720×1040 and 60 fps.
- `rig/generate-person-projection.mjs` — deterministic projection generator.
- `scripts/` — optional Playwright frame renderers.

## Regenerate the projected SVG

Node.js is the only requirement:

```bash
node rig/generate-person-projection.mjs
```

This reads `rig/person-rig-candidate.svg` and rewrites `rig/person-rig-projected.svg`.

## Optional frame rendering

```bash
npm install
npx playwright install chromium
python3 -m http.server 8765
```

In a second terminal:

```bash
npm run render:front45 -- renders/front45 run
npm run render:side -- renders/side run
```

The checked-in MP4 files are ready to use; rendering is only needed when changing the rig.

## Status

The character remains a visual-direction candidate rather than a user-approved final master. The v137 videos are preview renders, while the SVG files are the editable source. Qwen model weights and local Python environments are intentionally excluded; the repository includes the finished audio asset only.
