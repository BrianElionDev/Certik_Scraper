/**
 * Fetch top 1000 coins from CoinGecko API
 */
export const getTop1000Coins = async () => {
  const coins = [];
  const perPage = 250; // CoinGecko max per page

  for (let page = 1; page <= 4; page++) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      coins.push(...data);

      // Rate limiting - CoinGecko allows 50 calls/min for free tier
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }

  return coins.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    market_cap_rank: coin.market_cap_rank,
  }));
};
