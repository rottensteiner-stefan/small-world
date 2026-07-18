import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const showcases = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15_v1', '15_v2', '16', '17', '18', '19',
  '20', '21', '22', '23', 'yad'
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
  
  const browser = await puppeteer.launch({ 
    headless: true,
    userDataDir: tmpDir,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });
  
  let hasErrors = false;

  for (const showcase of showcases) {
    const page = await browser.newPage();
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const url = msg.location()?.url || '';
        // Ignore favicon errors
        if (text.includes('favicon.ico') || url.includes('favicon.ico')) return;
        errors.push(`${text} (URL: ${url})`);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    try {
      const url = `https://localhost:4173/showcases/${showcase}/index.html`;
      process.stdout.write(`Checking Showcase ${showcase.padEnd(6)} ... `);
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      
      // Give it 1 second of actual running time to catch runtime loops/render errors
      await sleep(1000);
      
      if (errors.length > 0) {
        console.log(`❌ FAILED (${errors.length} errors)`);
        errors.forEach(e => console.log(`   -> ${e}`));
        hasErrors = true;
      } else {
        console.log(`✅ OK`);
      }
    } catch (err) {
      console.log(`❌ CRASHED: ${err.message}`);
      hasErrors = true;
    } finally {
      await page.close();
    }
  }

  console.log('Closing browser...');
  await browser.close();
  
  console.log('Killing server...');
  server.kill();

  fs.rmSync(tmpDir, { recursive: true, force: true });

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
