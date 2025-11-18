import fetch from "node-fetch";
import http from "http";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Home page
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Brody Price Engine is online");
  }

  // Price endpoint: /price?ticker=NVDA
  if (url.pathname === "/price") {
    const ticker = url.searchParams.get("ticker");

    if (!ticker) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "No ticker provided" }));
    }

    try {
      // Free reliable API
      const api = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=demo`;
      const response = await fetch(api);
      const data = await response.json();

      if (!data || !data[0]) {
        throw new Error("Invalid API response");
      }

      const quote = data[0];

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        ticker,
        price: quote.price,
        open: quote.open,
        high: quote.dayHigh,
        low: quote.dayLow,
        prevClose: quote.previousClose,
        volume: quote.volume,
        change: quote.change,
        changePct: quote.changesPercentage
      }, null, 2));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 404 fallback
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
