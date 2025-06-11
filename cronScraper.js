import cron from "node-cron";
import { CertikScraperSupabase } from "./certikScraperSupabase.js";
import fs from "fs";

console.log("🕒 Certik Cron Scheduler Started");
console.log("📅 Scheduled to check every 12 hours for expired coins");

// Check every 12 hours - database will only return expired coins (48+ hours old)
cron.schedule(
  "0 */12 * * *",
  async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n⏰ [${timestamp}] Checking for expired coins...`);

    // Check if scraping is already running
    const lockFile = "scraping.lock";
    if (fs.existsSync(lockFile)) {
      console.log("🔒 Scraping already in progress. Skipping this run.");
      console.log("⏰ Will check again in 12 hours");
      return;
    }

    const scraper = new CertikScraperSupabase({
      batchSize: 3,
      maxRetries: 3,
    });

    try {
      // Create lock file to prevent overlapping runs
      fs.writeFileSync(
        lockFile,
        JSON.stringify({
          startTime: new Date().toISOString(),
          pid: process.pid,
        })
      );
      console.log("🔐 Created run lock");

      await scraper.init();
      console.log("🚀 Browser initialized");

      // Database will only return expired coins (48+ hours old)
      const result = await scraper.scrapeAndUpdateDatabase();

      if (result.total === 0) {
        console.log(`😴 No expired coins found. All coins are up to date!`);
        console.log(`⏰ Will check again in 12 hours`);
      } else {
        console.log(`✅ Scrape completed successfully!`);
        console.log(
          `📊 Results: ${result.success} success, ${result.failed} failed, ${result.total} total`
        );
      }
    } catch (error) {
      console.error("❌ Scrape failed:", error.message);
      console.log("⚠️ Will retry in 12 hours");
    } finally {
      await scraper.close();

      // Remove lock file
      try {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
          console.log("🔓 Released run lock");
        }
      } catch (lockError) {
        console.warn("⚠️ Failed to remove lock file:", lockError.message);
      }

      console.log("🔒 Session closed");
    }
  },
  {
    timezone: "UTC", // Use UTC timezone for consistency
  }
);

// Keep process alive and handle signals
process.on("SIGINT", () => {
  console.log("\n👋 Certik Cron Scheduler stopping...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Received SIGTERM. Certik Cron Scheduler stopping...");
  process.exit(0);
});

// Prevent process from exiting
process.on("exit", (code) => {
  console.log(`\n🛑 Certik Cron Scheduler exited with code: ${code}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error.message);
  console.error("Stack:", error.stack);
  // Don't exit - keep cron running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - keep cron running
});

console.log("✅ Cron scheduler is running. Use PM2 to manage this process.");
console.log("📝 Checks every 12 hours: 12AM, 12PM UTC");
console.log(
  "🔄 Database automatically filters to only expired coins (48+ hours old)"
);
