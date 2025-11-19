import express from "express";
import axios from "axios";

const app = express();

// You can replace with your own API key later.
// Using FinancialModelingPrep demo key for now.
const API = "https://financialmodelingprep.com/api/v3/quote";

app.get("/price", async (req, res) => {
  const ticker = req.query.t;

  if (!ticker) {
    return res.status(400).json({ error: "Missing ?t=TICKER parameter" });
  }

  try {
    const url = `${API}/${ticker.toUpperCase()}?apikey=demo`;
    const response = await axios.get(url);

    if (!response.data || !response.data[0]) {
      return res.status(404).json({ error: "Ticker not found or API error" });
    }

    const q = response.data[0];

    res.json({
      ticker: ticker.toUpperCase(),
      price: q.price,
      open: q.open,
      high: q.dayHigh,
      low: q.dayLow,
      prevClose: q.previousClose,
      volume: q.volume,
      change: q.change,
      changePct: q.changesPercentage
    });

  } catch (err) {
    res.status(500).json({ error: "Internal request failed", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Brody Price Engine Online");
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server running on port " + port));
