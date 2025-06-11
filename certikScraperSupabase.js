import puppeteer from "puppeteer";
import { supabase } from "./config.js";
import { scrapeCertik } from "./Scraper.js";
import { getCoinsForCertikScraping } from "./supabase/uploadCoinsToSupabase.js";
import { waitSeconds } from "./utils.js";

class CertikScraperSupabase {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 3; // Conservative for Certik
    this.maxRetries = options.maxRetries || 3;
    this.browser = null;
    this.successCount = 0;
    this.failCount = 0;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    console.log("🚀 Browser initialized");
  }

  /**
   * Main scraping function - gets coins needing Certik data and processes them
   */
  async scrapeAndUpdateDatabase(limit = null) {
    console.log("📋 Getting coins that need Certik data...");
    const coins = await getCoinsForCertikScraping(limit);

    if (!coins || coins.length === 0) {
      console.log("✅ No coins need Certik data scraping");
      return { success: 0, failed: 0 };
    }

    console.log(`🎯 Found ${coins.length} coins needing Certik data`);
    console.log(`Processing in batches of ${this.batchSize}...`);

    for (let i = 0; i < coins.length; i += this.batchSize) {
      const batch = coins.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(coins.length / this.batchSize);

      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}`);

      const promises = batch.map((coin) => this.processSingleCoin(coin));
      await Promise.allSettled(promises);

      // Wait between batches to avoid overwhelming Certik
      if (i + this.batchSize < coins.length) {
        console.log("⏱️ Waiting 5 seconds between batches...");
        await waitSeconds(5);
      }
    }

    console.log(`\n🎉 Scraping completed!`);
    console.log(`✅ Success: ${this.successCount}`);
    console.log(`❌ Failed: ${this.failCount}`);

    return {
      success: this.successCount,
      failed: this.failCount,
      total: coins.length,
    };
  }

  /**
   * Process a single coin - scrape and update database
   */
  async processSingleCoin(coin) {
    const searchTerms = [
      coin.name,
      coin.symbol.toUpperCase(),
      coin.coin_gecko_id.replace(/-/g, " "),
    ];

    let totalAttempts = 0;

    for (const searchTerm of searchTerms) {
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        totalAttempts++;

        // Increment attempts in database for each actual attempt
        await this.incrementScrapeAttempts(coin.coin_gecko_id);

        try {
          console.log(
            `  🔍 Scraping ${coin.name} (${searchTerm}) - Attempt ${attempt} (Total: ${totalAttempts})`
          );

          const certikData = await scrapeCertik(this.browser, searchTerm);

          if (certikData && Object.keys(certikData.securityScores).length > 0) {
            // Success - update database
            await this.updateCoinCertikData(coin.coin_gecko_id, certikData);
            console.log(
              `  ✅ ${coin.name} scraped successfully after ${totalAttempts} attempts`
            );
            this.successCount++;
            return;
          } else {
            // No data returned - update error but continue trying
            const errorMsg = `No security data found for search term: ${searchTerm}`;
            await this.updateCoinError(coin.coin_gecko_id, errorMsg);
            console.log(`  ⚠️ ${coin.name}: No data found for "${searchTerm}"`);
          }
        } catch (error) {
          // Exception occurred - update error and continue trying
          const errorMsg = `Scraping failed: ${error.message}`;
          await this.updateCoinError(coin.coin_gecko_id, errorMsg);
          console.log(
            `  ⚠️ Attempt ${attempt} failed for ${coin.name}: ${error.message}`
          );
          if (attempt < this.maxRetries) {
            await waitSeconds(5);
          }
        }
      }
    }

    // All attempts failed
    await this.updateCoinError(
      coin.coin_gecko_id,
      `All scraping attempts failed (${totalAttempts} attempts)`
    );
    console.log(`  ❌ ${coin.name} failed after ${totalAttempts} attempts`);
    this.failCount++;
  }

  /**
   * Update coin with successful Certik data
   */
  async updateCoinCertikData(coinGeckoId, certikData) {
    const nextUpdate = new Date();
    nextUpdate.setDate(nextUpdate.getDate() + 2); // Update every 48 hours
    const { error } = await supabase
      .from("certik_coins")
      .update({
        certik_data: certikData,
        certik_last_updated: new Date().toISOString(),
        certik_next_update: nextUpdate.toISOString(),
        certik_last_error: null, // Clear errors only on success
      })
      .eq("coin_gecko_id", coinGeckoId);

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
  }

  /**
   * Update coin with error status (preserves existing data)
   */
  async updateCoinError(coinGeckoId, errorMessage) {
    try {
      const { error } = await supabase
        .from("certik_coins")
        .update({
          certik_last_error: errorMessage,
          certik_last_updated: new Date().toISOString(),
          // Don't overwrite certik_data or certik_next_update on errors
        })
        .eq("coin_gecko_id", coinGeckoId);

      if (error) {
        console.error(
          `Failed to update error for ${coinGeckoId}:`,
          error.message
        );
      }
    } catch (err) {
      console.error(
        `Exception updating error for ${coinGeckoId}:`,
        err.message
      );
    }
  }

  /**
   * Increment scrape attempts counter
   */
  async incrementScrapeAttempts(coinGeckoId) {
    try {
      // Get current attempts count first
      const { data: currentData, error: selectError } = await supabase
        .from("certik_coins")
        .select("certik_scrape_attempts")
        .eq("coin_gecko_id", coinGeckoId)
        .single();

      if (selectError) {
        console.warn(
          `Failed to get current attempts for ${coinGeckoId}:`,
          selectError.message
        );
        return;
      }

      const currentAttempts = currentData?.certik_scrape_attempts || 0;

      // Update with incremented value
      const { error } = await supabase
        .from("certik_coins")
        .update({
          certik_scrape_attempts: currentAttempts + 1,
        })
        .eq("coin_gecko_id", coinGeckoId);

      if (error) {
        console.warn(
          `Failed to increment attempts for ${coinGeckoId}:`,
          error.message
        );
      }
    } catch (error) {
      console.warn(
        `Failed to increment attempts for ${coinGeckoId}:`,
        error.message
      );
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }
}

/**
 * Main execution function
 */
const main = async () => {
  const scraper = new CertikScraperSupabase({
    batchSize: 3, // Conservative to avoid rate limits
  });

  try {
    await scraper.init();

    // Control limit here:
    // await scraper.scrapeAndUpdateDatabase(5);    // Test with 5 coins
    // await scraper.scrapeAndUpdateDatabase();     // Process ALL coins needing Certik data
    await scraper.scrapeAndUpdateDatabase(5); // Currently set to 5 for testing
  } catch (error) {
    console.error("❌ Scraper failed:", error.message);
  } finally {
    await scraper.close();
  }
};

export { CertikScraperSupabase };

// Run if this file is executed directly
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main();
}
