import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const outputRoot = process.argv[2];
if (!outputRoot) throw new Error('Pass an output directory.');
const requestedModes = new Set(process.argv.slice(3));

const browser = await chromium.launch({
  headless: true,
  args: ['--hide-scrollbars', '--disable-gpu']
});
const context = await browser.newContext({
  viewport: { width: 720, height: 1040 },
  deviceScaleFactor: 1
});

async function renderMode(mode, frameCount) {
  const frameDirectory = path.join(outputRoot, mode);
  await fs.mkdir(frameDirectory, { recursive: true });
  let nextFrame = 0;

  async function worker() {
    const page = await context.newPage();
    while (true) {
      const frame = nextFrame++;
      if (frame >= frameCount) break;
      const time = (frame / 60).toFixed(6);
      const url = `http://127.0.0.1:8765/rig/person-rig-side-candidate.svg?v=147&qaTime=${time}#${mode}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(expectedMode => (
        document.querySelector('#rig-person')?.dataset.gaitMode === expectedMode
      ), mode);
      if (!mode.startsWith('work-')) {
        await page.evaluate(() => {
          const transform = document.querySelector('#rig-person')?.getAttribute('transform') || '';
          const match = transform.match(/translate\(([-0-9.]+) ([-0-9.]+)\)/);
          const cameraX = Number(match?.[1] || 0) + 6;
          document.documentElement.setAttribute('viewBox', `${cameraX} 0 748 1080`);
        });
      }
      await page.waitForTimeout(8);
      const frameName = `frame_${String(frame).padStart(3, '0')}.png`;
      await page.screenshot({ path: path.join(frameDirectory, frameName) });
    }
    await page.close();
  }

  await Promise.all(Array.from({ length: 8 }, worker));
}

try {
  if (requestedModes.size === 0 || requestedModes.has('walk')) {
    await renderMode('walk', 408);
  }
  if (requestedModes.size === 0 || requestedModes.has('run')) {
    await renderMode('run', 240);
  }
  for (const workMode of ['work-deep-squat', 'work-one-knee']) {
    if (requestedModes.size === 0 || requestedModes.has(workMode)) {
      await renderMode(workMode, 120);
    }
  }
} finally {
  await browser.close();
}
