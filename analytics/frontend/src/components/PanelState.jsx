import { C } from "../lib/theme";
import Panel from "./Panel";

// Loading skeleton — shimmering bar inside a Panel; matches "no spinners"
// requirement from the spec.
export function PanelLoading({ height = 80, label }) {
  return (
    <Panel>
      {label && <div style={{fontSize:11,fontWeight:600,color:C.w(0.45),letterSpacing:.8,textTransform:"uppercase",marginBottom:14}}>{label}</div>}
      <div className="skel" style={{height}} />
    </Panel>
  );
}

export function PanelError({ error, retry, label }) {
  const isNotReady = error?.type === "not_ready";
  return (
    <Panel>
      {label && <div style={{fontSize:11,fontWeight:600,color:C.w(0.45),letterSpacing:.8,textTransform:"uppercase",marginBottom:14}}>{label}</div>}
      <div style={{
        padding: 18, textAlign: "center",
        color: isNotReady ? C.w(0.7) : C.red,
        fontSize: 14,
      }}>
        <div style={{fontWeight:700,marginBottom:6,fontFamily:"'Fredoka',sans-serif"}}>
          {isNotReady ? "Data not yet synced" : "Couldn't load this panel"}
        </div>
        <div style={{fontSize:12, color: C.w(0.45), marginBottom: 14}}>
          {isNotReady
            ? "The hourly sync hasn't yet populated this metric. Try Refresh, or come back later."
            : (error?.message || "Unknown error")}
        </div>
        {retry && (
          <button onClick={retry} style={{
            padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600,
            background: C.w(0.06), color: "#fff", border: `1px solid ${C.w(0.1)}`,
            cursor:"pointer",
          }}>Retry</button>
        )}
      </div>
    </Panel>
  );
}
