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
    const ticker = (url.searchParams.get("ticker") || "").toUpperCase();

    if (!ticker) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "No ticker provided" }));
    }

    try {
      const api = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=1ONwoPgaocrU7kAjRuMFBNfuIwk1nfR2`;

      console.log("Fetching:", api);

      const response = await fetch(api);
      const json = await response.json();

      console.log("FMP raw response:", json);

      if (!Array.isArray(json) || json.length === 0) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          error: "Invalid API response",
          response: json
        }));
      }

      const q = json[0];

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        ticker,
        price: q.price,
        open: q.open,
        high: q.dayHigh,
        low: q.dayLow,
        prevClose: q.previousClose,
        volume: q.volume,
        change: q.change,
        changePct: q.changesPercentage
      }, null, 2));

    } catch (err) {
      console.error("ERROR:", err);
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
