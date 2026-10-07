// Resize stress for the WebGPU renderer: resizes the Showcase 10 window repeatedly and counts WebGPU
// validation errors (e.g. "used in submit while destroyed"). Needs the dev server (npm run dev).
// Exit code 1 if any error shows up.
import puppeteer from "puppeteer";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: false,
  acceptInsecureCerts: true,
  args: ["--no-sandbox", "--enable-unsafe-webgpu", "--window-size=1400,900"],
});
const page = await browser.newPage();
const errs = [];
page.on("console", (m) => {
  const t = m.text();
  if (/\[WebGPU|destroyed|validation|device (was )?lost/i.test(t))
    errs.push(`${m.type()}: ${t.slice(0, 180)}`);
});
page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 180)));
await page.setViewport({ width: 1280, height: 800 });
await page.goto("https://localhost:5173/apps/showcases/10/index.html?rendererType=WEB_GPU", {
  waitUntil: "load",
});
await new Promise((r) => setTimeout(r, 9000));
const sizes = [
  [900, 600],
  [1600, 900],
  [640, 480],
  [1920, 1080],
  [1024, 768],
  [1280, 800],
  [2200, 1200],
  [800, 800],
];
for (let round = 0; round < 3; round++)
  for (const [w, h] of sizes) {
    await page.setViewport({ width: w, height: h });
    await new Promise((r) => setTimeout(r, 450));
  }
await new Promise((r) => setTimeout(r, 2500));
console.log("WebGPU validation errors during resize stress:", errs.length);
for (const e of [...new Set(errs)].slice(0, 6)) console.log("  " + e);
await browser.close();
process.exitCode = errs.length > 0 ? 1 : 0;
