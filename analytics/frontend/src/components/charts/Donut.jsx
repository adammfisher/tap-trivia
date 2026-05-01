import { C } from "../../lib/theme";

export default function Donut({segments, size=180, total}) {
  const r = size/2 - 10;
  const c = size/2;
  const circ = 2 * Math.PI * r;
  const valid = (segments || []).filter(s => s && s.pct > 0);
  let acc = 0;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        {valid.length === 0 && (
          <circle cx={c} cy={c} r={r} fill="none" stroke={C.w(0.1)} strokeWidth="22"/>
        )}
        {valid.map((s,i) => {
          const dash = circ * s.pct;
          const offset = circ * acc;
          acc += s.pct;
          return (
            <circle
              key={i}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              opacity="0.9"
            />
          );
        })}
      </svg>
      <div style={{
        position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
      }}>
        <div style={{fontSize:10,color:C.w(0.4),letterSpacing:1,textTransform:"uppercase",fontWeight:600}}>This Month</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:30,fontWeight:700,color:"#fff",lineHeight:1.1}}>${(total || 0).toFixed(2)}</div>
        <div style={{fontSize:11,color:C.w(0.4),marginTop:2}}>AWS spend</div>
      </div>
    </div>
  );
}
