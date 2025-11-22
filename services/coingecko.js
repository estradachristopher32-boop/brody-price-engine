import axios from "axios";

const BASE = "https://api.coingecko.com/api/v3";

export async function getCGPrice(symbol) {
  const url = `${BASE}/simple/price`;
  const res = await axios.get(url, {
    params: {
      ids: symbol,
      vs_currencies: "usd",
      include_24hr_change: true,
      include_24hr_vol: true,
    },
  });
  const d = res.data[symbol];
  return {
    price: d.usd,
    change24h: d.usd_24h_change,
    volume24h: d.usd_24h_vol,
  };
}

export async function getCGOHLC(symbol, interval) {
  // Map intervals to CG ranges
  const days = interval === "1h" ? 1 : 7;

  const res = await axios.get(`${BASE}/coins/${symbol}/market_chart`, {
    params: { vs_currency: "usd", days },
  });

  return res.data.prices.map((p, i) => ({
    time: p[0],
    open: res.data.prices[i][1],
    high: res.data.prices[i][1],
    low: res.data.prices[i][1],
    close: res.data.prices[i][1],
  }));
}
