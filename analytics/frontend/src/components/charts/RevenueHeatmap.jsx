import { C } from "../../lib/theme";

export default function RevenueHeatmap({matrix, months}) {
  // matrix: [{year, row: [12 values or null]}]
  if (!matrix || matrix.length === 0) {
    return <div style={{padding:"24px 12px",fontSize:12,color:C.w(0.4),textAlign:"center"}}>No revenue history yet</div>;
  }

  const all = matrix.flatMap(r => r.row).filter(v => v != null && !isNaN(v));
  const peak = all.length > 0 ? Math.max(...all) : 1;

  return (
    <div style={{display:"grid",gridTemplateColumns:`50px repeat(12, 1fr)`,gap:4}}>
      <div></div>
      {months.map(m => (
        <div key={m} style={{textAlign:"center",fontSize:10,color:C.w(0.4),fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{m}</div>
      ))}
      {matrix.map(r => (
        <div key={r.year} style={{display:"contents"}}>
          <div style={{fontSize:11,color:C.w(0.5),fontWeight:600,paddingTop:8,fontFamily:"'DM Mono',monospace"}}>{r.year}</div>
          {(r.row || []).map((v, i) => {
            const intensity = v != null && peak > 0 ? v / peak : 0;
            return (
              <div key={i} title={v != null ? `$${v.toFixed(2)}` : "no data"} style={{
                height: 36,
                background: v == null
                  ? "transparent"
                  : intensity === 0
                    ? C.w(0.04)
                    : `rgba(255,210,0,${0.06 + intensity * 0.6})`,
                border: `1px solid ${v == null ? C.w(0.02) : C.w(0.05)}`,
                borderRadius: 4,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                fontSize:10,
                color: intensity > 0.3 ? "#000" : C.w(0.55),
                fontFamily:"'DM Mono',monospace",
                fontWeight: 600,
              }}>
                {v == null ? "" : v >= 1000 ? `${(v/1000).toFixed(1)}k` : v >= 100 ? v.toFixed(0) : v > 0 ? v.toFixed(1) : ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
