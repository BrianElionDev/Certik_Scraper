import { supabase } from "../config.js";
import { getTop1000Coins } from "../coingecko/getCoinGeckoCoins.js";

/**
 * Upload top 1000 coins to Supabase certik_coins table
 *
 * Schema: certik_coins
 * - id: SERIAL PRIMARY KEY (auto-generated)
 * - coin_gecko_id: TEXT UNIQUE NOT NULL (from CoinGecko)
 * - symbol: TEXT NOT NULL (from CoinGecko)
 * - name: TEXT NOT NULL (from CoinGecko)
 * - market_cap_rank: INTEGER (from CoinGecko)
 * - certik_data: JSONB (populated later by Certik scraper)
 * - certik_last_updated: TIMESTAMPTZ (populated later)
 * - certik_next_update: TIMESTAMPTZ (populated later)
 * - certik_scrape_attempts: INTEGER DEFAULT 0 (used by scraper)
 * - certik_last_error: TEXT (used by scraper)
 * - created_at: TIMESTAMPTZ DEFAULT NOW() (auto-generated)
 * - updated_at: TIMESTAMPTZ DEFAULT NOW() (auto-generated)
 */
export const uploadCoinsToSupabase = async () => {
  try {
    console.log("Fetching top 1000 coins from CoinGecko...");
    const coins = await getTop1000Coins();

    if (!coins || coins.length === 0) {
      throw new Error("No coins data received from CoinGecko");
    }

    console.log(`Preparing to upload ${coins.length} coins to Supabase...`);

    // Transform CoinGecko data to match certik_coins schema
    // Note: Certik-specific fields (certik_data, certik_last_updated, etc.)
    // will be populated later by the Certik scraper
    const coinsData = coins.map((coin) => ({
      coin_gecko_id: coin.id,
      symbol: coin.symbol.toLowerCase(),
      name: coin.name,
      market_cap_rank: coin.market_cap_rank,
      // Certik fields will be null initially and populated by scraper:
      // certik_data: null,
      // certik_last_updated: null,
      // certik_next_update: null,
      // certik_scrape_attempts: 0 (default),
      // certik_last_error: null
    }));

    // First, set market_cap_rank to null for coins no longer in top 1000
    const currentCoinIds = coinsData.map((coin) => coin.coin_gecko_id);
    console.log(`Setting rank to null for coins not in current top 1000...`);

    const { error: updateError } = await supabase
      .from("certik_coins")
      .update({ market_cap_rank: null })
      .not(
        "coin_gecko_id",
        "in",
        `(${currentCoinIds.map((id) => `"${id}"`).join(",")})`
      );

    if (updateError) {
      console.warn("Warning updating dropped coins:", updateError.message);
    }

    // Then upsert current top 1000 coins
    const { data, error } = await supabase
      .from("certik_coins")
      .upsert(coinsData, {
        onConflict: "coin_gecko_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      throw error;
    }

    console.log(
      `✅ Successfully uploaded ${
        data?.length || coins.length
      } coins to certik_coins table`
    );
    return data;
  } catch (error) {
    console.error("❌ Error uploading coins to Supabase:", error.message);
    throw error;
  }
};

/**
 * Get coins count from certik_coins table
 */
export const getCoinsCount = async () => {
  try {
    const { count, error } = await supabase
      .from("certik_coins")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return count;
  } catch (error) {
    console.error("Error getting coins count:", error.message);
    return null;
  }
};

/**
 * Get top coins by market cap rank
 */
export const getTopCoins = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from("certik_coins")
      .select("*")
      .order("market_cap_rank", { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error getting top coins:", error.message);
    return [];
  }
};

/**
 * Get coins that need Certik data scraping
 * (coins where certik_data is null or outdated)
 * @param {number|null} limit - Number of coins to return, or null for all
 */
export const getCoinsForCertikScraping = async (limit = null) => {
  try {
    const query = supabase
      .from("certik_coins")
      .select("*")
      .or("certik_data.is.null,certik_next_update.lt.now()")
      .order("market_cap_rank", { ascending: true });

    // Only apply limit if it's a positive number
    const { data, error } =
      limit && limit > 0 ? await query.limit(limit) : await query;

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error getting coins for Certik scraping:", error.message);
    return [];
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await uploadCoinsToSupabase();
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }
};

// Run if this file is executed directly
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main();
}
