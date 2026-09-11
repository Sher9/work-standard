const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('.login-card', { timeout: 15000 });

    const report = await page.evaluate(() => {
      const pageEl = document.querySelector('.login-page');
      const card = document.querySelector('.login-card');
      const hint = document.querySelector('.login-hint');
      const cs = (el) => getComputedStyle(el);
      return {
        pageBackground: cs(pageEl).backgroundColor,
        pageDisplay: cs(pageEl).display,
        pageAlign: cs(pageEl).alignItems,
        pageJustify: cs(pageEl).justifyContent,
        cardBorderColor: cs(card).borderColor,
        cardBorderStyle: cs(card).borderStyle,
        cardRadius: cs(card).borderRadius,
        cardShadow: cs(card).boxShadow,
        cardPadding: cs(card).padding,
        hintFontSize: cs(hint).fontSize,
        hintColor: cs(hint).color,
        dom: {
          hasBgDecor: !!document.querySelector('.bg-decor'),
          hasBlob: !!document.querySelector('.blob'),
          hasGridOverlay: !!document.querySelector('.grid-overlay'),
          hasLoginLayout: !!document.querySelector('.login-layout'),
          hasBrandPanel: !!document.querySelector('.login-brand'),
          inputCount: document.querySelectorAll('.login-card input').length,
          buttonCount: document.querySelectorAll('.login-card button').length,
          title: document.querySelector('.login-card h1')?.textContent,
          cardText: document.querySelector('.login-card')?.textContent || '',
          brandLogoInCard: !!document.querySelector('.login-card .brand-logo'),
          hintText: hint?.textContent || '',
        },
      };
    });

    console.log(JSON.stringify(report, null, 2));
    await page.screenshot({ path: 'login-verify.png', fullPage: true });
    console.log('screenshot saved: login-verify.png');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('VERIFY_ERROR:', e.message);
  process.exit(1);
});
