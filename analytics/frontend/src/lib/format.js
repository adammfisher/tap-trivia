export const fmtUsd = (n) => {
  if (n == null || isNaN(n)) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1000) return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return "$" + v.toFixed(2);
};

export const fmtInt = (n) => {
  if (n == null || isNaN(n)) return "—";
  return Math.round(Number(n)).toLocaleString();
};

export const fmtPct = (n, digits = 1) => {
  if (n == null || isNaN(n)) return "—";
  return (Number(n) * 100).toFixed(digits) + "%";
};

export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toISOString().slice(0, 10);
};

export const fmtTimeAgo = (iso) => {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "never";
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60)    return sec + "s ago";
  if (sec < 3600)  return Math.round(sec / 60) + "m ago";
  if (sec < 86400) return Math.round(sec / 3600) + "h ago";
  return Math.round(sec / 86400) + "d ago";
};
