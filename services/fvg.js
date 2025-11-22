export function computeFVG(candles) {
  const gaps = [];

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    const bullishGap = c0.high < c2.low;
    const bearishGap = c0.low > c2.high;

    if (bullishGap || bearishGap) {
      gaps.push({ index: i, type: bullishGap ? "bull" : "bear" });
    }
  }

  return gaps;
}
