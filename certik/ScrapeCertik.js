import puppeteer from "puppeteer";
import { waitSeconds } from "../utils.js";

export const scrapeCertik = async (browser, searchTerm) => {
  const result = {
    project: "",
    securityScores: {},
    communityEngagement: [],
    financialData: {},
  };

  const buttonSelector =
    'button.flex.flex-col.transition.duration-200.w-\\[100px\\][type="button"]';
  const communitySelector =
    "div.flex.h-full.flex-col.justify-between.text-neutral-100.dark\\:text-neutral-0.font-medium.gap-1.border-0";
  const marketInflowSelector = ".group.contents.cursor-pointer";
  const averageScoreSelector = `span[class*="text-score-"]`;

  let page;

  try {
    page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    await page.goto("https://skynet.certik.com/", {
      timeout: 120000,
      waitUntil: "networkidle2",
    });

    // Wait for page to fully load
    await waitSeconds(5);

    // Type in search bar
    const selector =
      'input[placeholder="Search by project, quest, exchange, wallet or token"]';
    await page.waitForSelector(selector, { timeout: 60000 });
    await page.focus(selector);
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    const inputValue = searchTerm;
    await page.type(selector, inputValue);

    // Wait for results to load
    await waitSeconds(10);

    const ulSelector = 'ul[role="listbox"]';
    await page.waitForSelector(ulSelector);
    const firstOptionSelector = `${ulSelector} .grid.border-b.border-n-10:first-of-type`;
    await page.waitForSelector(firstOptionSelector);
    await page.click(firstOptionSelector);
    await waitSeconds(30);
    result.project = searchTerm;

    // Fetch average score
    try {
      result.securityScores.averageScore = await page.$eval(
        averageScoreSelector,
        (elem) => elem.textContent.trim()
      );
    } catch (err) {
      console.error("Error fetching average score:", err.message);
    }

    // Fetch additional security metrics
    try {
      const divTexts = await page.$$eval(buttonSelector, (buttons) => {
        return buttons.map((button) => {
          const firstDiv = button.querySelector(
            "div.whitespace-nowrap.text-center.text-sm.font-normal.text-semantic-text-tertiary"
          );
          const secondDiv = button.querySelector("div.text-sm.font-medium");

          return {
            label: firstDiv ? firstDiv.textContent.trim() : null,
            value: secondDiv ? secondDiv.textContent.trim() : null,
          };
        });
      });

      result.securityScores.additionalMetrics = divTexts;
    } catch (err) {
      console.error("Error fetching additional security metrics:", err.message);
    }

    // Fetch community engagement data
    try {
      const communityAndFinancialData = await page.$$eval(
        communitySelector,
        (elems) => {
          return elems.map((div) => {
            const firstDiv = div.querySelector(".text-semantic-text-primary");
            const secondDiv = div.querySelector(
              "div.w-full.truncate.whitespace-nowrap.text-semantic-text-quaternary.dark\\:text-semantic-text-quaternary.text-sm.font-normal"
            );

            return {
              value: firstDiv ? firstDiv.textContent.trim() : null,
              label: secondDiv ? secondDiv.textContent.trim() : null,
            };
          });
        }
      );

      const targetLabelsCommunity = new Set([
        "Total Tweets (24h)",
        "Twitter Account Age",
        "Twitter Followers (24h)",
        "Twitter Activity Indicator",
      ]);

      result.communityEngagement = communityAndFinancialData
        .filter((item) => item.label && targetLabelsCommunity.has(item.label))
        .map(({ label, value }) => ({ label, value }));
    } catch (err) {
      console.error("Error fetching community engagement data:", err.message);
    }

    // Fetch financial data
    try {
      const targetLabelsFinancial = new Set([
        "Token Price",
        "Volume (24h)",
        "Market Cap",
        "Volume by Exchange Type (24h)",
        "Market Cap Held",
      ]);

      result.financialData.metrics = (
        await page.$$eval(communitySelector, (elems) => {
          return elems.map((div) => {
            const firstDiv = div.querySelector(".text-semantic-text-primary");
            const secondDiv = div.querySelector(
              "div.w-full.truncate.whitespace-nowrap.text-semantic-text-quaternary.dark\\:text-semantic-text-quaternary.text-sm.font-normal"
            );

            return {
              value: firstDiv ? firstDiv.textContent.trim() : null,
              label: secondDiv ? secondDiv.textContent.trim() : null,
            };
          });
        })
      )
        .filter((item) => item.label && targetLabelsFinancial.has(item.label))
        .map(({ label, value }) => ({ label, value }));
    } catch (err) {
      console.error("Error fetching financial data:", err.message);
    }

    // Fetch daily inflows
    try {
      result.financialData.dailyInflows = await page.$$eval(
        marketInflowSelector,
        (elems) => {
          return elems.map((div) => {
            const firstDiv = div.querySelector(
              ".text-xs.font-medium.sm\\:text-sm"
            );
            const positiveTag = div.querySelector(
              ".text-component-tag-text-positive"
            );
            const negativeTag = div.querySelector(
              ".text-component-tag-text-negative"
            );

            return {
              label: firstDiv ? firstDiv.textContent.trim() : null,
              value:
                positiveTag?.textContent.trim() ||
                negativeTag?.textContent.trim() ||
                "+0",
            };
          });
        }
      );
    } catch (err) {
      console.error("Error fetching daily inflows:", err.message);
    }
    return result;
  } catch (err) {
    console.error("An error occurred during execution:", err.message);
  } finally {
    if (page) await page.close();
  }
};

//Commented out original main function - use testTop5.js or batchScraper.js instead
const main = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const projects = ["Echelon Prime", "Bitcoin", "Avalanche"];
  const promises = projects.map((project) => scrapeCertik(browser, project));
  try {
    const finalData = await Promise.all(promises);
    console.log(JSON.stringify(finalData, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
};

main();
