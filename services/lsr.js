export function computeLSR(candles) {
  const sweeps = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    const sweepHigh = curr.high > prev.high && curr.high > next.high;
    const sweepLow = curr.low < prev.low && curr.low < next.low;

    if (sweepHigh || sweepLow) {
      sweeps.push({ index: i, type: sweepHigh ? "high_sweep" : "low_sweep" });
    }
  }

  return sweeps;
}
