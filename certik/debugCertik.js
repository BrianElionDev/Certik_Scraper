import puppeteer from "puppeteer";
import { waitSeconds } from "../utils.js";

const debugCertik = async () => {
  const browser = await puppeteer.launch({
    headless: false, // Run visible so we can see what's happening
    slowMo: 1000, // Slow down actions
  });

  try {
    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("Navigating to Certik...");
    await page.goto("https://skynet.certik.com/", {
      timeout: 120000,
      waitUntil: "networkidle2",
    });

    console.log("Page loaded, waiting 5 seconds...");
    await waitSeconds(5);

    // Take a screenshot
    await page.screenshot({ path: "certik_debug.png", fullPage: true });
    console.log("Screenshot saved as certik_debug.png");

    // Check if search input exists with different selectors
    const searchSelectors = [
      'input[placeholder="Search by project, quest, exchange, wallet or token"]',
      'input[placeholder*="Search"]',
      'input[type="search"]',
      'input[class*="search"]',
      ".search-input",
      '[data-testid*="search"]',
    ];

    for (const selector of searchSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found search input with selector: ${selector}`);
          const placeholder = await element.getAttribute("placeholder");
          console.log(`   Placeholder: ${placeholder}`);
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Get all input elements on the page
    console.log("\n--- All input elements on page ---");
    const inputs = await page.$$eval("input", (elements) =>
      elements.map((el) => ({
        type: el.type,
        placeholder: el.placeholder,
        className: el.className,
        id: el.id,
      }))
    );

    inputs.forEach((input, i) => {
      console.log(`Input ${i + 1}:`, input);
    });

    console.log("\n--- Page title ---");
    const title = await page.title();
    console.log(title);

    console.log("\n--- Current URL ---");
    console.log(page.url());

    // Check if there's a modal or overlay blocking content
    const overlays = await page.$$eval(
      '[class*="modal"], [class*="overlay"], [class*="popup"]',
      (elements) => elements.map((el) => el.className)
    );

    if (overlays.length > 0) {
      console.log("\n--- Potential overlays/modals ---");
      overlays.forEach((overlay) => console.log(overlay));
    }

    console.log("\nKeeping browser open for manual inspection...");
    console.log("Press Ctrl+C to close when done inspecting");

    // Keep browser open for manual inspection
    await new Promise(() => {});
  } catch (error) {
    console.error("Debug error:", error);
  } finally {
    await browser.close();
  }
};

debugCertik();
