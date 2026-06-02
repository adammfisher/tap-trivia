import { useState } from "react";
import { C, Styles } from "../lib/theme";
import { requestOtp, confirmOtp } from "../lib/auth";

export default function LoginScreen({onSignedIn}) {
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const sendCode = async (e) => {
    e.preventDefault();
    setErr(""); setNotice(""); setBusy(true);
    try {
      await requestOtp(email.trim());
      setStep("code");
      setNotice("We sent a 6-digit code to your email. Enter it below.");
    } catch (e) {
      // Keep it generic — never reveal whether the address is authorized.
      setErr("Couldn't send a code. Check the email and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await confirmOtp(code);
      onSignedIn && onSignedIn();
    } catch (e) {
      setErr("Invalid or expired code. Try again, or resend.");
    } finally {
      setBusy(false);
    }
  };

  const resetToEmail = () => {
    setStep("email"); setCode(""); setErr(""); setNotice("");
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
      <form onSubmit={step === "email" ? sendCode : verify} style={{
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

        {step === "email" ? (
          <>
            <div style={{fontSize:13, color:C.w(0.5), margin:"18px 0 24px"}}>
              Enter your email to receive a one-time sign-in code.
            </div>
            <label style={{display:"block",fontSize:11,color:C.w(0.5),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Email</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              style={inputStyle}
            />
          </>
        ) : (
          <>
            <div style={{fontSize:13, color:C.w(0.5), margin:"18px 0 24px"}}>
              Enter the 6-digit code we emailed you.
            </div>
            <label style={{display:"block",fontSize:11,color:C.w(0.5),fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Sign-in code</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              autoComplete="one-time-code"
              required
              style={{...inputStyle, letterSpacing: 8, textAlign: "center", fontSize: 22, fontFamily:"'DM Mono',monospace"}}
            />
          </>
        )}

        {notice && (
          <div style={{
            marginTop: 16, padding:"10px 12px", borderRadius:8,
            background:"rgba(0,212,170,0.12)", border:`1px solid ${C.green}33`,
            color: C.green, fontSize:12, fontWeight:500,
          }}>{notice}</div>
        )}
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
        }}>{busy ? (step === "email" ? "Sending…" : "Verifying…") : (step === "email" ? "Send code" : "Sign in")}</button>

        {step === "code" && (
          <button type="button" onClick={resetToEmail} disabled={busy} style={{
            width:"100%", marginTop: 12, padding:"10px",
            borderRadius: 10, border:`1px solid ${C.w(0.1)}`,
            background:"transparent", color:C.w(0.6),
            fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:13,
            cursor: busy ? "wait" : "pointer",
          }}>Use a different email / resend code</button>
        )}

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
