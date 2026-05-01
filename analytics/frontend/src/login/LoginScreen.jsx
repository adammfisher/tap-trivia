import { useState } from "react";
import { C, Styles } from "../lib/theme";
import { signIn } from "../lib/auth";

export default function LoginScreen({onSignedIn}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signIn(email, password);
      onSignedIn && onSignedIn();
    } catch (e) {
      setErr(e?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background: C.grad.main,
      backgroundAttachment:"fixed",
      color:"#fff",
      fontFamily:"'Outfit',sans-serif",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding: 20,
    }}>
      <Styles/>
      <form onSubmit={submit} style={{
        width: 420,
        maxWidth: "100%",
        padding: 36,
        borderRadius: 18,
        background: C.grad.panel,
        border: `1px solid ${C.w(0.08)}`,
        backdropFilter: "blur(14px)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
      }} className="panel">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <div style={{
            width:42,height:42,borderRadius:11,
            background: C.grad.gold,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:22, boxShadow:"0 4px 14px rgba(255,210,0,0.3)",
          }}>🧠</div>
          <div>
            <div style={{
              fontFamily:"'Fredoka',sans-serif",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1,
              background: C.grad.gold,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: -0.4,
            }}>TapTrivia</div>
            <div style={{fontSize:11,color:C.w(0.4),letterSpacing:1.6,textTransform:"uppercase",fontWeight:600,marginTop:4}}>Operator Console</div>
          </div>
        </div>
        <div style={{fontSize:13, color:C.w(0.5), margin:"18px 0 24px"}}>
          Sign in with your admin email to view the dashboard.
        </div>

        <label style={{display:"block",fontSize:11,color:C.w(0.5),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="adam@visudolabs.com"
          required
          style={inputStyle}
        />

        <label style={{display:"block",fontSize:11,color:C.w(0.5),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:6,marginTop:14}}>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {err && (
          <div style={{
            marginTop: 16, padding:"10px 12px", borderRadius:8,
            background:"rgba(255,71,87,0.12)", border:`1px solid ${C.red}33`,
            color: C.red, fontSize:12, fontWeight:500,
          }}>{err}</div>
        )}

        <button type="submit" disabled={busy} style={{
          width:"100%", marginTop: 24, padding:"13px",
          borderRadius: 10, border:"none",
          background: C.grad.gold, color:"#1a0a30",
          fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14, letterSpacing:.4,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
          boxShadow:"0 6px 16px rgba(255,210,0,0.25)",
        }}>{busy ? "Signing in…" : "Sign in"}</button>

        <div style={{marginTop: 22, fontSize: 11, color: C.w(0.35), textAlign:"center", fontFamily:"'DM Mono',monospace"}}>
          Visudo Labs · Operator-only access
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width:"100%",
  padding:"11px 13px",
  background: C.w(0.04),
  border: `1px solid ${C.w(0.08)}`,
  borderRadius: 9,
  color: "#fff",
  fontSize: 14,
  fontFamily:"'Outfit',sans-serif",
  outline: "none",
};
