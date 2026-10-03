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
      const url = `http://127.0.0.1:8765/rig/person-rig-projected.svg?t=45&v=187&qaTime=${time}#${mode}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => {
        const value = document.querySelector('#rig-person')?.dataset.walkTravelX;
        return value !== undefined && Number.isFinite(Number(value));
      });
      if (!mode.startsWith('work-')) {
        await page.evaluate(() => {
          const rig = document.querySelector('#rig-person');
          const cameraX = Number(rig.dataset.walkTravelX);
          document.documentElement.setAttribute('viewBox', `${cameraX} 0 720 1040`);
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
    await renderMode('walk', 328);
  }
  if (requestedModes.size === 0 || requestedModes.has('run')) {
    await renderMode('run', 240);
  }
  for (const workMode of ['work-deep-squat', 'work-one-knee', 'work-farmer-pull', 'work-farmer-tend']) {
    if (requestedModes.size === 0 || requestedModes.has(workMode)) {
      await renderMode(workMode, 120);
    }
  }
} finally {
  await browser.close();
}
