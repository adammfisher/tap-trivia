import { C } from "../lib/theme";

export default function Pill({children, color, bg}) {
  return (
    <span style={{
      display:"inline-block", padding:"3px 10px", borderRadius:999,
      fontSize:10, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
      background: bg || C.w(0.06), color: color || C.w(0.7),
      fontFamily:"'Outfit',sans-serif",
    }}>{children}</span>
  );
}

export function SectionHeader({title, sub, action, live}) {
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:18}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:600,color:"#fff",letterSpacing:-.3}}>{title}</div>
          {live && <span className="live" style={{fontSize:10,fontWeight:700,color:C.green,letterSpacing:.6,textTransform:"uppercase"}}>Live</span>}
        </div>
        {sub && <div style={{fontSize:12,color:C.w(0.4),marginTop:3}}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}
