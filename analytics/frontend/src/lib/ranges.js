// Date-range helpers — port of the rangeWindow / compareWindow / fmtRange
// helpers in the mockup. The mockup hard-coded TODAY = Apr 30 2026 for
// snapshot reproducibility; the deployed app uses the real current date.

export const rangeWindow = (rangeKey, today = new Date()) => {
  const end = new Date(today);
  const start = new Date(today);
  if (rangeKey === "mtd")          start.setDate(1);
  else if (rangeKey === "ytd")     { start.setMonth(0); start.setDate(1); }
  else if (rangeKey === "30d")     start.setDate(end.getDate() - 30);
  else if (rangeKey === "90d")     start.setDate(end.getDate() - 90);
  else if (rangeKey === "12mo")    start.setFullYear(end.getFullYear() - 1);
  else if (rangeKey === "3y")      start.setFullYear(end.getFullYear() - 3);
  return { start, end };
};

export const compareWindow = (window, mode) => {
  if (mode === "none") return null;
  const ms = window.end - window.start;
  if (mode === "prev") {
    return { start: new Date(window.start.getTime() - ms), end: new Date(window.start) };
  }
  if (mode === "yoy") {
    const start = new Date(window.start); start.setFullYear(start.getFullYear() - 1);
    const end   = new Date(window.end);   end.setFullYear(end.getFullYear() - 1);
    return { start, end };
  }
  return null;
};

export const fmtRange = (w) => {
  const opts = { month:"short", day:"numeric", year:"numeric" };
  return `${w.start.toLocaleDateString("en-US",opts)} – ${w.end.toLocaleDateString("en-US",opts)}`;
};

export const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

// API range param mapping (must match server-side ranges.py).
export const apiRangeParams = (range, customRange) => {
  if (range === "custom" && customRange) {
    return {
      range,
      start: customRange.start.toISOString().slice(0, 10),
      end:   customRange.end.toISOString().slice(0, 10),
    };
  }
  return { range };
};
