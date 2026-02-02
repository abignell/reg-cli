import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import finalhandler from 'finalhandler';
import mkdirp from 'make-dir';
import puppeteer from 'puppeteer';
import serveStatic from 'serve-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '..');
const serve = serveStatic(`${root}/sample`, { index: ['index.html'] });

const server = http.createServer((req, res) => {
  serve(
    req,
    res,
    finalhandler(req as unknown as Request, res as unknown as Response),
  );
});

server.listen(3000);

mkdirp.sync(`${root}/screenshot/actual`);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 800,
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  await page.screenshot({
    path: `${root}/screenshot/actual/index.png`,
  });

  await page.close();
  process.exit(0);
})();
