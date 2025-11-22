import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
const API_KEY = process.env.TWELVEDATA_KEY; // stored securely on Render


import express from "express";
import cors from "cors";
import { getCGPrice, getCGOHLC } from "./services/coingecko.js";
import { computeFVG } from "./services/fvg.js";
import { computeLSR } from "./services/lsr.js";
import { computeWyckoff } from "./services/wyckoff.js";

const app = express();
app.use(cors());
app.use(express.json());

// Price Endpoint
app.get("/getPrice", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toLowerCase();
    const price = await getCGPrice(symbol);
    res.json(price);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OHLC Endpoint
app.get("/getOHLC", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toLowerCase();
    const interval = req.query.interval || "1h";
    const data = await getCGOHLC(symbol, interval);
    res.json({ symbol, interval, candles: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FVG Detection
app.get("/getFVG", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toLowerCase();
    const candles = await getCGOHLC(symbol, "1h");
    const fvg = computeFVG(candles);
    res.json({ count: fvg.length, fvg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LSR Detection
app.get("/getLSR", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toLowerCase();
    const candles = await getCGOHLC(symbol, "1h");
    const lsr = computeLSR(candles);
    res.json({ count: lsr.length, lsr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wyckoff Microstructure
app.get("/getWyckoff", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toLowerCase();
    const candles = await getCGOHLC(symbol, "1h");
    const state = computeWyckoff(candles);
    res.json({ state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Composite Signal
app.get("/getAllSignals", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toLowerCase();
    const candles = await getCGOHLC(symbol, "1h");
    const price = await getCGPrice(symbol);
    const fvg = computeFVG(candles);
    const lsr = computeLSR(candles);
    const wyck = computeWyckoff(candles);
    res.json({
      symbol,
      price,
      fvgCount: fvg.length,
      lsrCount: lsr.length,
      wyckoffState: wyck,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start App
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Brody Engine running on port ${PORT}`));
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
