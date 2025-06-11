import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// const retry = async (fn, retries = 3) => {
//   for (let i = 0; i < retries; i++) {
//     try {
//       return await fn();
//     } catch (err) {
//       if (i === retries - 1) throw err;
//       console.warn(`Retrying... (${i + 1})`);
//       await wait(2000);
//     }
//   }
// };

export const scrapeCertik = async (browser, searchTerm) => {
  const result = {
    project: searchTerm,
    securityScores: {},
    communityEngagement: [],
    financialData: {},
  };

  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0 Safari/537.36"
    );

    await page.setViewport({ width: 1366, height: 768 });

    await page.goto("https://skynet.certik.com/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const searchSelector =
      'input[placeholder="Search by project, quest, exchange, wallet or token"]';
    await page.waitForSelector(searchSelector, { timeout: 15000 });

    await page.click(searchSelector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(searchSelector, searchTerm);

    // Wait for search to process
    await wait(2000);

    const listboxSelector = 'ul[role="listbox"]';
    await page.waitForSelector(listboxSelector, { timeout: 30000 });

    // Wait for dropdown options to actually load
    await wait(3000);

    const firstOptionSelector = `${listboxSelector} .grid.border-b.border-n-10:first-of-type`;

    // Debug: Check if options exist
    const optionsCount = await page.$$eval(
      `${listboxSelector} .grid.border-b.border-n-10`,
      (options) => options.length
    );

    if (optionsCount === 0) {
      throw new Error(`No dropdown options found for "${searchTerm}"`);
    }

    await page.waitForSelector(firstOptionSelector, { timeout: 30000 });

    // Double-check the option is clickable
    await page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector);
        return element && element.offsetParent !== null;
      },
      { timeout: 10000 },
      firstOptionSelector
    );

    await page.click(firstOptionSelector);

    // Wait for page to load after clicking
    await wait(30000);

    // === SECURITY SCORES ===
    try {
      const avgSelector = `span[class*="text-score-"]`;
      await page.waitForSelector(avgSelector, { timeout: 30000 });
      result.securityScores.averageScore = await page.$eval(avgSelector, (el) =>
        el.textContent.trim()
      );
    } catch (e) {
      console.warn("Avg score not found:", e.message);
    }

    try {
      result.securityScores.additionalMetrics = await page.$$eval(
        'button.flex.flex-col.transition.duration-200.w-\\[100px\\][type="button"]',
        (buttons) =>
          buttons.map((btn) => {
            const label = btn
              .querySelector(
                "div.whitespace-nowrap.text-center.text-sm.font-normal.text-semantic-text-tertiary"
              )
              ?.textContent.trim();
            const value = btn
              .querySelector("div.text-sm.font-medium")
              ?.textContent.trim();
            return { label, value };
          })
      );
    } catch (e) {
      console.warn("Security metrics missing:", e.message);
    }

    // === COMMUNITY ENGAGEMENT + FINANCIAL ===
    const allData = await page.$$eval(
      "div.flex.h-full.flex-col.justify-between.text-neutral-100.dark\\:text-neutral-0.font-medium.gap-1.border-0",
      (divs) =>
        divs.map((div) => {
          const value = div
            .querySelector(".text-semantic-text-primary")
            ?.textContent.trim();
          const label = div
            .querySelector(
              "div.w-full.truncate.whitespace-nowrap.text-semantic-text-quaternary.dark\\:text-semantic-text-quaternary.text-sm.font-normal"
            )
            ?.textContent.trim();
          return { label, value };
        })
    );

    const communityLabels = new Set([
      "Total Tweets (24h)",
      "Twitter Account Age",
      "Twitter Followers (24h)",
      "Twitter Activity Indicator",
    ]);

    const financialLabels = new Set([
      "Token Price",
      "Volume (24h)",
      "Market Cap",
      "Volume by Exchange Type (24h)",
      "Market Cap Held",
    ]);

    result.communityEngagement = allData.filter((d) =>
      communityLabels.has(d.label)
    );
    result.financialData.metrics = allData.filter((d) =>
      financialLabels.has(d.label)
    );

    // === INFLOWS ===
    try {
      result.financialData.dailyInflows = await page.$$eval(
        ".group.contents.cursor-pointer",
        (divs) =>
          divs.map((div) => {
            const label = div
              .querySelector(".text-xs.font-medium.sm\\:text-sm")
              ?.textContent.trim();
            const value =
              div
                .querySelector(".text-component-tag-text-positive")
                ?.textContent.trim() ||
              div
                .querySelector(".text-component-tag-text-negative")
                ?.textContent.trim() ||
              "+0";
            return { label, value };
          })
      );
    } catch (e) {
      console.warn("Inflows fetch error:", e.message);
    }

    return result;
  } catch (err) {
    console.error("Failed scraping:", err.message);
    return null;
  } finally {
    await page.close();
  }
};
