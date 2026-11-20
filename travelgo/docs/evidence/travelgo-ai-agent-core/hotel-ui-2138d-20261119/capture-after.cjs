const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../..');
const { chromium } = require(path.join(root, 'frontend/node_modules/@playwright/test'));

const base = 'http://127.0.0.1:5181';
const hotelId = '238e0000-0000-4000-8000-000000000020';
const ratePlanId = '238e0000-0000-4000-8000-000000000081';
const query = 'checkIn=2026-11-22&checkOut=2026-11-24&rooms=' + encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]));

const pages = [
  ['home', '/'],
  ['hotels', '/hotels'],
  ['search', '/hotels/search?' + query],
  ['detail', '/places/' + hotelId + '?hotel=1&' + query],
  ['checkout', '/hotels/' + hotelId + '/checkout?ratePlanId=' + ratePlanId + '&' + query],
];

const viewports = [
  [1440, 1000],
  [1366, 768],
  [390, 844],
];

(async () => {
  const afterDir = path.join(__dirname, 'after');
  fs.mkdirSync(afterDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const records = [];

  try {
    for (const [width, height] of viewports) {
      console.log(`\n=== Capturing viewport ${width}x${height} ===`);
      const ctx = await browser.newContext({
        viewport: { width, height },
        isMobile: width === 390,
        hasTouch: width === 390,
        locale: 'vi-VN',
      });

      const p = await ctx.newPage();

      // Collect console errors & failed network requests
      const errors = [];
      p.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      p.on('pageerror', err => errors.push(err.message));

      for (const [name, urlPath] of pages) {
        const fullUrl = base + urlPath;
        console.log(`Capturing ${name} (${width}px): ${fullUrl}`);
        
        await p.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await p.waitForTimeout(1000);

        // Smooth scroll to trigger lazy loading of images
        await p.evaluate(async () => {
          const totalHeight = Math.min(document.body.scrollHeight, 25000);
          for (let y = 0; y < totalHeight; y += 600) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise(r => setTimeout(r, 40));
          }
          // Decode all images
          await Promise.race([
            Promise.all([...document.images].map(img => img.decode().catch(() => {}))),
            new Promise(r => setTimeout(r, 3000)),
          ]);
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
        await p.waitForTimeout(500);

        // Screenshot
        const screenshotPath = path.join(afterDir, `${name}-${width}.png`);
        await p.screenshot({ path: screenshotPath, fullPage: true });

        // Evaluate page health
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        const images = await p.locator('img').evaluateAll(imgs =>
          imgs.map(img => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            width: img.naturalWidth,
            height: img.naturalHeight,
            broken: img.naturalWidth === 0 && img.getAttribute('src') && !img.getAttribute('src').startsWith('data:'),
          }))
        );

        const brokenCount = images.filter(i => i.broken).length;
        console.log(`  -> ${name}-${width}.png saved. Images: ${images.length}, Broken: ${brokenCount}, Overflow: ${overflow}`);

        records.push({
          name,
          width,
          height,
          url: urlPath,
          screenshot: `${name}-${width}.png`,
          overflow,
          imagesCount: images.length,
          brokenImagesCount: brokenCount,
          errors: [...errors],
          images: images.slice(0, 10), // sample for audit
        });
      }

      await ctx.close();
    }

    const auditPath = path.join(__dirname, 'after-audit.json');
    fs.writeFileSync(auditPath, JSON.stringify({
      at: new Date().toISOString(),
      viewportCount: viewports.length,
      pagesCount: pages.length,
      totalScreenshots: records.length,
      records,
    }, null, 2));

    console.log(`\nALL AFTER SCREENSHOTS CAPTURED SUCCESSFULLY: ${records.length} screenshots.`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('CAPTURE ERROR:', err);
  process.exitCode = 1;
});
