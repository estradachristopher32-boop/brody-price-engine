import express from "express";
import axios from "axios";

const app = express();
const API_KEY = process.env.TWELVEDATA_KEY; // stored securely on Render

// PRICE ENDPOINT — real-time quote
app.get("/price", async (req, res) => {
  const ticker = req.query.t;

  if (!ticker) {
    return res.status(400).json({ error: "Missing ?t=SYMBOL parameter" });
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${ticker.toUpperCase()}&apikey=${API_KEY}`;
    const response = await axios.get(url);

    if (!response.data || response.data.code) {
      return res.status(500).json({
        error: "API error",
        details: response.data.message || "No data returned"
      });
    }

    const q = response.data;

    return res.json({
      ticker: ticker.toUpperCase(),
      price: q.price,
      open: q.open,
      high: q.high,
      low: q.low,
      prevClose: q.previous_close,
      volume: q.volume,
      change: q.percent_change,
      changePct: q.percent_change
    });

  } catch (err) {
    return res.status(500).json({
      error: "Internal request failed",
      details: err.message
    });
  }
});

// ROOT ENDPOINT
app.get("/", (req, res) => {
  res.send("Brody Price Engine Online — TwelveData Version");
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server running on port " + port));
