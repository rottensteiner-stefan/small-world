import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '..', '.agents', 'scratches', 'screenshots');
// Below this per-pixel luminance standard deviation, we treat the canvas as
// "effectively a single flat color" -- i.e. nothing was actually rendered,
// even though no console/page error was thrown (this is exactly the kind of
// silent regression a pure error-listener check cannot catch).
const BLANK_CANVAS_STDDEV_THRESHOLD = 2.0;

/**
 * Decodes a screenshot PNG buffer and checks whether it looks like a blank/flat canvas.
 * Only samples the CENTER 50% of the image (both axes): the showcase layout always
 * overlays a title/nav header and a copyright footer on top of the fullscreen canvas,
 * and those always contain text/borders -- sampling the whole crop would mask a
 * genuinely blank 3D viewport by picking up that always-present chrome instead.
 * @param {Buffer} pngBuffer Raw PNG bytes of the cropped canvas screenshot.
 * @returns {{ blank: boolean, stddev: number }} Whether the canvas looks empty, and the measured stddev.
 */
function detectBlankCanvas(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const { data, width, height } = png;
  const sampleStep = 4; // sample every 4th pixel for speed; still thousands of samples per showcase
  const xStart = Math.round(width * 0.25);
  const xEnd = Math.round(width * 0.75);
  const yStart = Math.round(height * 0.25);
  const yEnd = Math.round(height * 0.75);
  let sum = 0;
  let count = 0;
  const luminances = [];

  for (let y = yStart; y < yEnd; y += sampleStep) {
    for (let x = xStart; x < xEnd; x += sampleStep) {
      const idx = (width * y + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luminances.push(luminance);
      sum += luminance;
      count++;
    }
  }

  const mean = sum / count;
  let variance = 0;
  for (const l of luminances) {
    variance += (l - mean) * (l - mean);
  }
  variance /= count;
  const stddev = Math.sqrt(variance);

  return { blank: stddev < BLANK_CANVAS_STDDEV_THRESHOLD, stddev };
}

const numberedShowcases = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25'
];

// Every numbered showcase supports a `?rendererType=` override via AbstractShowcase, so each one
// is checked under all three renderer backends -- not just whichever one `RendererType.BEST`
// happens to auto-select in this environment. Without this, a broken WebGPU path can silently
// fall back to WebGL2 in headless Chrome and never actually get exercised (this is exactly how a
// WebGPU-only sampled-texture-budget bug went undetected: CI never ran the WebGPU code path at
// all). `yad` has no `showcase.ts`/AbstractShowcase, so it has no override to test and is only
// checked once, at its default renderer.
const RENDERER_TYPES = ['WEB_GL1', 'WEB_GL2', 'WEB_GPU'];
const testCases = [
  ...numberedShowcases.flatMap((n) =>
    RENDERER_TYPES.map((rendererType) => ({ showcase: n, rendererType })),
  ),
  { showcase: 'yad', rendererType: null },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// How many showcase checks run concurrently (each in its own Puppeteer page/tab within the same
// browser instance). Higher values finish faster but use more CPU/memory at once; tune down via
// this env var if a CI runner's software-rendering pipeline gets overwhelmed under load.
const CONCURRENCY = Number(process.env.SHOWCASE_TEST_CONCURRENCY) || 4;

/**
 * Runs `worker` over every item in `items`, with at most `concurrency` calls in flight at once.
 * @param {unknown[]} items
 * @param {number} concurrency
 * @param {(item: unknown, index: number) => Promise<unknown>} worker
 * @returns {Promise<unknown[]>} Results in the same order as `items`.
 */
async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, runNext));
  return results;
}

/**
 * Checks a single showcase/rendererType combination in its own page. Buffers its console output
 * instead of writing it immediately, since this runs concurrently with other checks and
 * interleaved writes would garble the log.
 * @param {import('puppeteer').Browser} browser
 * @param {{ showcase: string, rendererType: string | null }} testCase
 * @returns {Promise<{ passed: boolean, lines: string[] }>}
 */
async function checkShowcase(browser, { showcase, rendererType }) {
  const label = rendererType ? `${showcase} [${rendererType}]` : showcase;
  const lines = [];
  const page = await browser.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const url = msg.location()?.url || '';
      if (text.includes('favicon.ico') || url.includes('favicon.ico')) return;
      errors.push(`${text} (URL: ${url})`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  let passed = true;
  try {
    const query = rendererType ? `?rendererType=${rendererType}` : '';
    const url = `https://localhost:4173/showcases/${showcase}/index.html${query}`;

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Give it 1 second of actual running time to catch runtime loops/render errors
    await sleep(1000);

    // Union bounding box of every <canvas> on the page (most showcases have one
    // #SmallWorld canvas, but e.g. showcase 23 renders multiple monitor canvases).
    const canvasRect = await page.evaluate(() => {
      // eslint-disable-next-line no-undef -- runs inside the page (browser context via Puppeteer), not Node
      const canvases = Array.from(document.querySelectorAll('canvas'));
      if (0 === canvases.length) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of canvases) {
        const r = c.getBoundingClientRect();
        if (0 === r.width || 0 === r.height) continue;
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      }
      if (!isFinite(minX)) return null;
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    });

    let blankCanvasWarning = null;
    if (canvasRect) {
      const screenshotPath = path.join(
        SCREENSHOT_DIR,
        `showcase_${showcase}${rendererType ? `_${rendererType}` : ''}.png`,
      );
      const buffer = await page.screenshot({
        clip: {
          x: Math.max(0, Math.round(canvasRect.x)),
          y: Math.max(0, Math.round(canvasRect.y)),
          width: Math.max(1, Math.round(canvasRect.width)),
          height: Math.max(1, Math.round(canvasRect.height)),
        },
      });
      fs.writeFileSync(screenshotPath, buffer);

      const { blank, stddev } = detectBlankCanvas(buffer);
      if (blank) {
        blankCanvasWarning = `Canvas appears blank/uniform (luminance stddev=${stddev.toFixed(2)}, threshold=${BLANK_CANVAS_STDDEV_THRESHOLD}) — likely nothing rendered`;
      }
    } else {
      blankCanvasWarning = 'No <canvas> element found on the page at all';
    }

    if (errors.length > 0 || blankCanvasWarning) {
      passed = false;
      lines.push(`Checking Showcase ${label.padEnd(16)} ... ❌ FAILED (${errors.length} console error(s)${blankCanvasWarning ? ', visual check failed' : ''})`);
      errors.forEach(e => lines.push(`   -> ${e}`));
      if (blankCanvasWarning) lines.push(`   -> ⚠️  ${blankCanvasWarning}`);
    } else {
      lines.push(`Checking Showcase ${label.padEnd(16)} ... ✅ OK`);
    }
  } catch (err) {
    passed = false;
    lines.push(`Checking Showcase ${label.padEnd(16)} ... ❌ CRASHED: ${err.message}`);
  } finally {
    await page.close();
  }

  return { passed, lines };
}

async function run() {
  console.log('Starting Vite preview server...');
  const server = spawn('npm', ['run', 'preview'], {
    stdio: 'pipe', // we want to see output
    detached: false
  });
  
  server.stdout.on('data', data => console.log(data.toString()));
  server.stderr.on('data', data => console.error(data.toString()));

  // Give the server a moment to start
  await sleep(3000);

  console.log('Launching Puppeteer...');
  // Use a strictly temporary user data dir that we clean up later
  const tmpDir = path.join(__dirname, '..', '.agents', 'scratches', 'tmp_puppeteer_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: tmpDir,
    acceptInsecureCerts: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors',
      // Required for headless WebGL2/WebGPU to actually initialize via software rendering --
      // without these, WebGPU silently reports no adapter and every showcase falls back to
      // WebGL2/1 regardless of which `?rendererType=` was requested.
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--enable-features=Vulkan', '--enable-unsafe-webgpu',
    ]
  });

  console.log(`Running ${testCases.length} showcase checks with concurrency ${Math.min(CONCURRENCY, testCases.length)}...`);

  const firstPass = await runWithConcurrency(testCases, CONCURRENCY, async testCase => {
    const result = await checkShowcase(browser, testCase);
    console.log(result.lines.join('\n'));
    return { testCase, ...result };
  });

  // Running many pages concurrently against one shared software-rendered GPU (swiftshader) can
  // make a single page transiently see a degenerate/contended state that has nothing to do with
  // the showcase itself (seen in practice: a bogus 1x1 framebuffer size under GPU load). A single
  // sequential retry -- deliberately NOT concurrent, so it doesn't just reproduce the same
  // contention -- separates that flakiness from real regressions without masking anything: a case
  // that fails twice in a row is reported as a real failure either way.
  let hasErrors = false;
  for (const first of firstPass) {
    if (first.passed) continue;
    const label = first.testCase.rendererType
      ? `${first.testCase.showcase} [${first.testCase.rendererType}]`
      : first.testCase.showcase;
    console.log(`Retrying Showcase ${label} (transient failure on first attempt)...`);
    const retry = await checkShowcase(browser, first.testCase);
    console.log(retry.lines.join('\n'));
    if (!retry.passed) hasErrors = true;
  }

  console.log('Closing browser...');
  await browser.close();
  
  console.log('Killing server...');
  server.kill();

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);

  if (hasErrors) {
    console.error('\n🚨 Showcase testing failed! See errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All showcases passed successfully!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
