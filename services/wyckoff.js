export function computeWyckoff(c) {
  const last = c[c.length - 1];
  const prev = c[c.length - 2];

  const expanding = last.close > prev.close && last.close > prev.high;
  const collapsing = last.close < prev.close && last.close < prev.low;

  if (expanding) return "accumulation";
  if (collapsing) return "distribution";

  return "neutral";
}
