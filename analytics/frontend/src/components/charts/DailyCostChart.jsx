import { C } from "../../lib/theme";

export default function DailyCostChart({data}) {
  const W = 600, H = 140, pad = 8;
  if (!data || data.length === 0) {
    return <div style={{height:H,display:"flex",alignItems:"center",justifyContent:"center",color:C.w(0.3),fontSize:12}}>No daily data</div>;
  }
  const vals = data.map(d => d.total).filter(v => v != null);
  const max = vals.length > 0 ? Math.max(...vals) * 1.2 : 1;
  const xStep = (W - pad*2) / Math.max(1, data.length - 1);
  const y = v => H - pad - (v / max) * (H - pad*2);

  const bars = data.map((d, i) => {
    const x = pad + i * xStep - 4;
    const yv = d.total != null ? y(d.total) : H - pad;
    const h = d.total != null ? (H - pad) - y(d.total) : 0;
    return { x, y: yv, h, total: d.total, date: d.date, missing: d.total == null };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H+18}`} style={{width:"100%",height:160,overflow:"visible"}}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={Math.max(2, xStep - 2)} height={Math.max(0, b.h)}
              fill={b.missing ? "transparent" : C.cyan}
              stroke={b.missing ? C.w(0.06) : "none"}
              strokeDasharray={b.missing ? "2,2" : undefined}
              opacity={b.missing ? 0.6 : 0.85}
              rx="2"/>
      ))}
      {bars.map((b, i) => i % Math.ceil(bars.length / 6) === 0 && (
        <text key={"t"+i} x={b.x + xStep/2} y={H+12} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle" fontFamily="DM Mono">
          {b.date ? new Date(b.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : ""}
        </text>
      ))}
    </svg>
  );
}
