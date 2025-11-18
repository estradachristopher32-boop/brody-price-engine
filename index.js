import fetch from "node-fetch";
import http from "http";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Home page
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Brody Price Engine is online");
  }

// Price endpoint: /price?ticker=AAPL
if (url.pathname === "/price") {
  const ticker = url.searchParams.get("ticker");

  if (!ticker) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "No ticker provided" }));
  }

  try {
    const api = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
    const response = await fetch(api);
    const json = await response.json();

    const q = json?.quoteResponse?.result?.[0];
    if (!q) throw new Error("Invalid Yahoo Finance response");

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      ticker,
      price: q.regularMarketPrice,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      prevClose: q.regularMarketPreviousClose,
      volume: q.regularMarketVolume,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent
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
