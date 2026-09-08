import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';
// Extra vlaggen (na het label): "full" = hele pagina, "mobiel" = 390px breed
const vlaggen = process.argv.slice(4);
const fullPage = vlaggen.includes('full');
const mobiel = vlaggen.includes('mobiel');

// Find next available number
let n = 1;
while (fs.existsSync(path.join(screenshotDir, `screenshot-${n}${label}.png`))) n++;
const outPath = path.join(screenshotDir, `screenshot-${n}${label}.png`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
// Bij full-page mobiel dpr 1: boven 16384 devicepixels loopt Chrome's capture om
await page.setViewport(mobiel
  ? { width: 390, height: 844, deviceScaleFactor: fullPage ? 1 : 2 }
  : { width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 1200)); // let animations settle

if (fullPage) {
  // Scroll door de pagina zodat lazy-loaded foto's ook laden
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const stap = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += stap) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 800));
}

await page.screenshot({ path: outPath, fullPage });
await browser.close();

console.log(`Saved: ${outPath}`);
