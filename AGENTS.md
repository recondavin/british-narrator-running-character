# Agent handoff

This repository is intentionally self-contained for coding agents.

## Source of truth

- Front geometry and main rig: `rig/person-rig-candidate.svg`
- Projected Front 45° output: `rig/person-rig-projected.svg`
- Projection generator: `rig/generate-person-projection.mjs`
- Side geometry and motion: `rig/person-rig-side-candidate.svg`
- Interactive integration surface: `rig/demo.html`
- Existing narrator asset: `audio/first-qwen-voice-88hz.mp3`

Treat the MP4 files under `previews/` as review outputs, not editable motion authority. Do not regenerate or replace the narrator audio unless the user explicitly asks. Preserve semantic SVG IDs and `data-pivot-x` / `data-pivot-y` attributes when editing rig geometry.

## Fast validation

1. Run `node rig/generate-person-projection.mjs`.
2. Confirm all SVG files parse as XML.
3. Serve the repository with `python3 -m http.server 8000`.
4. Open `/`, `/rig/demo.html`, and `/previews/`.
5. Check the browser console for errors and test Front, Front 45°, Side, Wave and Walk.
