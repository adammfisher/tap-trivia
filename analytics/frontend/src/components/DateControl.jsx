import { useState } from "react";
import { C, RANGES, COMPARE_MODES } from "../lib/theme";
import { rangeWindow, compareWindow, fmtRange } from "../lib/ranges";

export default function DateControl({range, setRange, compare, setCompare, customRange, setCustomRange}) {
  const [open, setOpen] = useState(false);
  const window = range === "custom" ? customRange : rangeWindow(range);
  const activeRange = RANGES.find(r => r.key === range);
  const activeCompare = COMPARE_MODES.find(c => c.key === compare);

  return (
    <div style={{position:"relative"}}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"8px 14px",borderRadius:9,
          background: open ? C.w(0.08) : C.w(0.04),
          border:`1px solid ${open ? C.w(0.15) : C.w(0.08)}`,
          color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",
          fontFamily:"'Outfit',sans-serif",
        }}
      >
        <span style={{fontSize:13}}>📅</span>
        <span>{activeRange.label}</span>
        {compare !== "none" && (
          <span style={{
            padding:"2px 7px",borderRadius:5,
            background:"rgba(255,210,0,0.15)",color:C.gold,
            fontSize:10,fontWeight:700,letterSpacing:.4,
          }}>vs {compare === "yoy" ? "YoY" : "Prev"}</span>
        )}
        <span style={{color:C.w(0.4),fontSize:10}}>▾</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{position:"fixed",inset:0,zIndex:50}}
          />
          <div style={{
            position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:51,
            width:340,padding:18,
            background:"rgba(15,3,38,0.96)",
            border:`1px solid ${C.w(0.1)}`,
            borderRadius:14,
            backdropFilter:"blur(20px)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
            animation:"fadeUp .15s ease-out both",
          }}>
            <div style={{fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.8,textTransform:"uppercase",marginBottom:10}}>Range</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:18}}>
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setRange(r.key); if (r.key !== "custom") setOpen(false); }}
                  style={{
                    padding:"9px 12px",borderRadius:8,
                    background: range === r.key ? C.grad.purple : C.w(0.04),
                    border: `1px solid ${range === r.key ? "transparent" : C.w(0.06)}`,
                    color: range === r.key ? "#fff" : C.w(0.7),
                    fontSize:12,fontWeight:600,cursor:"pointer",
                    fontFamily:"'Outfit',sans-serif",textAlign:"left",
                  }}
                >{r.label}</button>
              ))}
            </div>

            {range === "custom" && (
              <div style={{marginBottom:18,padding:12,background:C.w(0.03),borderRadius:10,border:`1px solid ${C.w(0.06)}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,marginBottom:4}}>From</div>
                    <input
                      type="date"
                      value={customRange.start.toISOString().split("T")[0]}
                      onChange={e => setCustomRange({...customRange, start: new Date(e.target.value)})}
                      style={{width:"100%",padding:"8px 10px",background:C.w(0.04),border:`1px solid ${C.w(0.08)}`,borderRadius:6,color:"#fff",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none"}}
                    />
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.w(0.4),fontWeight:600,marginBottom:4}}>To</div>
                    <input
                      type="date"
                      value={customRange.end.toISOString().split("T")[0]}
                      onChange={e => setCustomRange({...customRange, end: new Date(e.target.value)})}
                      style={{width:"100%",padding:"8px 10px",background:C.w(0.04),border:`1px solid ${C.w(0.08)}`,borderRadius:6,color:"#fff",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none"}}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{fontSize:10,fontWeight:700,color:C.w(0.4),letterSpacing:.8,textTransform:"uppercase",marginBottom:10}}>Compare to</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:14}}>
              {COMPARE_MODES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCompare(c.key)}
                  style={{
                    padding:"9px 12px",borderRadius:8,
                    background: compare === c.key ? "rgba(255,210,0,0.12)" : "transparent",
                    border: `1px solid ${compare === c.key ? "rgba(255,210,0,0.25)" : C.w(0.06)}`,
                    color: compare === c.key ? C.gold : C.w(0.7),
                    fontSize:12,fontWeight:600,cursor:"pointer",
                    fontFamily:"'Outfit',sans-serif",textAlign:"left",
                    display:"flex",alignItems:"center",gap:8,
                  }}
                >
                  <span style={{
                    width:14,height:14,borderRadius:"50%",
                    border:`1.5px solid ${compare===c.key?C.gold:C.w(0.2)}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    {compare===c.key && <span style={{width:6,height:6,borderRadius:"50%",background:C.gold}}/>}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>

            <div style={{
              padding:10,background:C.w(0.03),borderRadius:8,
              border:`1px solid ${C.w(0.05)}`,
              fontSize:11,color:C.w(0.5),fontFamily:"'DM Mono',monospace",lineHeight:1.5,
            }}>
              <div>Showing: <span style={{color:"#fff"}}>{fmtRange(window)}</span></div>
              {activeCompare.key !== "none" && (
                <div style={{marginTop:4}}>vs: <span style={{color:C.gold}}>{fmtRange(compareWindow(window, compare))}</span></div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
