import { BatchScraper } from "./batchScraper.js";

const getTop5Coins = async () => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      market_cap_rank: coin.market_cap_rank,
    }));
  } catch (error) {
    console.error("Error fetching top 5 coins:", error.message);
    return [];
  }
};

const main = async () => {
  const scraper = new BatchScraper({
    batchSize: 2,
    outputFile: "top5_certik_data.json",
  });

  try {
    await scraper.init();

    console.log("Fetching top 5 coins from CoinGecko...");
    const coins = await getTop5Coins();

    console.log(
      "Top 5 coins:",
      coins.map((c) => `${c.name} (${c.symbol})`).join(", ")
    );

    await scraper.scrapeCoins(coins);
  } catch (error) {
    console.error("Main execution error:", error);
  } finally {
    await scraper.close();
  }
};

main();
