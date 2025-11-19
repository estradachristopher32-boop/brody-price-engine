import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
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

// --- 1M OHLC ---
app.get("/ohlc1m", async (req, res) => {
  const ticker = req.query.t;
  if (!ticker) return res.status(400).json({ error: "Missing ?t=" });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker.toUpperCase()}&interval=1min&outputsize=100&apikey=${API_KEY}`;
    const r = await axios.get(url);

    if (!r.data || r.data.code) {
      return res.status(500).json({ error: r.data.message || "API error" });
    }

    res.json(r.data.values);  // array of candles
  } catch (e) {
    res.status(500).json({ error: "Fail", details: e.message });
  }
});

// --- 5M OHLC ---
app.get("/ohlc5m", async (req, res) => {
  const ticker = req.query.t;
  if (!ticker) return res.status(400).json({ error: "Missing ?t=" });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker.toUpperCase()}&interval=5min&outputsize=100&apikey=${API_KEY}`;
    const r = await axios.get(url);

    if (!r.data || r.data.code) {
      return res.status(500).json({ error: r.data.message || "API error" });
    }

    res.json(r.data.values);
  } catch (e) {
    res.status(500).json({ error: "Fail", details: e.message });
  }
});

function detectFVG(candles) {
  const fvgList = [];

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    const high0 = parseFloat(c0.high);
    const low1 = parseFloat(c1.low);
    const high1 = parseFloat(c1.high);
    const low2 = parseFloat(c2.low);

    // Bullish FVG
    if (low1 > high0) {
      fvgList.push({
        type: "bull",
        start: high0,
        end: low1,
        index: i - 1
      });
    }

    // Bearish FVG
    if (high1 < low2) {
      fvgList.push({
        type: "bear",
        start: low2,
        end: high1,
        index: i - 1
      });
    }
  }

  return fvgList;
}

app.get("/fvg", async (req, res) => {
  const ticker = req.query.t;

  if (!ticker)
    return res.status(400).json({ error: "Missing ?t=" });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker.toUpperCase()}&interval=1min&outputsize=50&apikey=${API_KEY}`;
    const data = (await axios.get(url)).data;

    if (!data.values) return res.json([]);

    const fvgs = detectFVG(data.values);
    return res.json(fvgs);

  } catch (e) {
    return res.status(500).json({ error: "Fail", details: e.message });
  }
});

function detectLSR(candles) {
  const sweeps = [];

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i-1];
    const curr = candles[i];

    const prevHigh = parseFloat(prev.high);
    const prevLow = parseFloat(prev.low);
    const curHigh = parseFloat(curr.high);
    const curLow = parseFloat(curr.low);
    const curClose = parseFloat(curr.close);

    // Sweep high then close back inside
    if (curHigh > prevHigh && curClose < prevHigh) {
      sweeps.push({
        type: "bearish-sweep",
        level: prevHigh,
        index: i
      });
    }

    // Sweep low then close back inside
    if (curLow < prevLow && curClose > prevLow) {
      sweeps.push({
        type: "bullish-sweep",
        level: prevLow,
        index: i
      });
    }
  }

  return sweeps;
}

app.get("/lsr", async (req, res) => {
  const ticker = req.query.t;

  if (!ticker)
    return res.status(400).json({ error: "Missing ?t=" });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker.toUpperCase()}&interval=1min&outputsize=50&apikey=${API_KEY}`;
    const data = (await axios.get(url)).data;

    if (!data.values) return res.json([]);

    const sweeps = detectLSR(data.values);
    res.json(sweeps);

  } catch (e) {
    res.status(500).json({ error: "Fail", details: e.message });
  }
});

function detectWyckoffMicro(candles) {
  const signals = [];

  for (let i = 4; i < candles.length; i++) {
    const c0 = candles[i - 4];
    const c1 = candles[i - 3];
    const c2 = candles[i - 2];
    const c3 = candles[i - 1];
    const c4 = candles[i];

    const lows = [c0.low, c1.low, c2.low, c3.low, c4.low].map(Number);
    const vols = [c0.volume, c1.volume, c2.volume, c3.volume, c4.volume].map(Number);

    const isHigherLows = lows[4] > lows[2] && lows[2] > lows[0];
    const volumeDryUp = vols[3] < vols[1] && vols[1] < vols[0];
    const breakout = parseFloat(c4.close) > parseFloat(c3.high);

    if (isHigherLows && volumeDryUp && breakout) {
      signals.push({
        type: "micro-accumulation",
        at: c4.close,
        index: i
      });
    }
  }

  return signals;
}

app.get("/wyckoff", async (req, res) => {
  const ticker = req.query.t;
  if (!ticker) return res.status(400).json({ error: "Missing ?t=" });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker.toUpperCase()}&interval=1min&outputsize=60&apikey=${API_KEY}`;
    const data = (await axios.get(url)).data;

    if (!data.values) return res.json([]);

    const signals = detectWyckoffMicro(data.values);
    res.json(signals);

  } catch (e) {
    res.status(500).json({ error: "Fail", details: e.message });
  }
});

// ROOT ENDPOINT
app.get("/", (req, res) => {
  res.send("Brody Price Engine Online — TwelveData Version");
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server running on port " + port));
