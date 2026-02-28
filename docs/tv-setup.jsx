import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// TAP TRIVIA — TV Setup / Registration Screen (1080p)
// Split-panel: Register (left) | Enter Code (right)
// Registration returns code and auto-fills right side
// ═══════════════════════════════════════════════════════════════

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    dark: "linear-gradient(150deg, #06060f 0%, #0e0a24 40%, #1a0f3a 100%)",
  },
  w: a => `rgba(255,255,255,${a})`,
  b: a => `rgba(0,0,0,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea", purple: "#764ba2", darkGold: "#f7971e",
};

const Logo = ({ size = "md" }) => {
  const s = { sm: 24, md: 32, lg: 48, xl: 64 }[size];
  return (
    <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: s, fontWeight: 700, letterSpacing: -.5, lineHeight: 1 }}>
      <span style={{ color: "#fff" }}>Tap</span>
      <span style={{ background: C.grad.gold, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Trivia</span>
    </span>
  );
};

const Orbs = () => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div style={{ position: "absolute", width: 550, height: 550, borderRadius: "50%", background: "radial-gradient(circle,rgba(102,126,234,.1) 0%,transparent 70%)", top: "-10%", right: "5%", animation: "orb1 22s ease-in-out infinite" }} />
    <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,51,74,.08) 0%,transparent 70%)", bottom: "5%", left: "0%", animation: "orb2 28s ease-in-out infinite" }} />
    <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,212,170,.05) 0%,transparent 70%)", top: "40%", left: "50%", animation: "orb1 18s ease-in-out infinite reverse" }} />
  </div>
);

// ─── Input Field ───
const TVInput = ({ value, onChange, placeholder, icon, type = "text", autoFocus = false }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 18, padding: "22px 28px",
    borderRadius: 18, background: C.w(.06), border: `1.5px solid ${value ? C.w(.15) : C.w(.08)}`,
    backdropFilter: "blur(8px)", transition: "all .25s ease",
  }}>
    <span style={{ fontSize: 24, opacity: .45, flexShrink: 0, width: 32, textAlign: "center" }}>{icon}</span>
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      type={type} autoFocus={autoFocus}
      style={{
        flex: 1, background: "none", border: "none", outline: "none",
        color: "#fff", fontSize: 22, fontWeight: 500, fontFamily: "'Outfit',sans-serif",
        letterSpacing: .3,
      }}
    />
  </div>
);

// ─── Code Display (5 character boxes — can be auto-filled or manually entered) ───
const CodeInput = ({ code, setCode, autoFocus = false, readOnly = false }) => {
  const refs = useRef([]);

  const handleChange = (i, val) => {
    if (readOnly) return;
    const char = val.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;
    const next = [...code];
    next[i] = char;
    setCode(next);
    if (char && i < 4) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (readOnly) return;
    if (e.key === "Backspace" && !code[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
      {[0, 1, 2, 3, 4].map(i => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          value={code[i] || ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          maxLength={2}
          readOnly={readOnly}
          autoFocus={!readOnly && autoFocus && i === 0}
          style={{
            width: 88, height: 108, borderRadius: 18, textAlign: "center",
            background: code[i] ? C.w(.1) : C.w(.04),
            border: `2px solid ${code[i] ? C.gold : C.w(.1)}`,
            fontFamily: "'Fredoka',sans-serif", fontSize: 44, fontWeight: 700,
            color: code[i] ? C.gold : C.w(.3), outline: "none",
            transition: "all .2s ease",
            boxShadow: code[i] ? `0 0 24px rgba(255,210,0,.15)` : "none",
            letterSpacing: 2,
            cursor: readOnly ? "default" : "text",
          }}
        />
      ))}
    </div>
  );
};

// ─── Feature Line ───
const FeatureLine = ({ icon, text, delay = 0 }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 14, padding: "5px 0",
    animation: `slideUp .5s ease-out ${delay}s both`,
  }}>
    <span style={{ fontSize: 22, flexShrink: 0, opacity: .7 }}>{icon}</span>
    <span style={{ fontSize: 19, fontWeight: 500, color: C.w(.45), fontFamily: "'Outfit',sans-serif", lineHeight: 1.4 }}>{text}</span>
  </div>
);

// ─── Button ───
const TVButton = ({ label, gradient, onClick, disabled, icon, pulse = false }) => (
  <button
    onClick={disabled ? undefined : onClick}
    style={{
      width: "100%", padding: "24px 36px", borderRadius: 20, border: "none",
      background: disabled ? C.w(.08) : gradient,
      cursor: disabled ? "default" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
      transition: "all .25s ease", opacity: disabled ? .4 : 1,
      boxShadow: disabled ? "none" : "0 8px 32px rgba(0,0,0,.3)",
      animation: pulse ? "btnPulse 2s ease-in-out infinite" : "none",
    }}
  >
    {icon && <span style={{ fontSize: 24 }}>{icon}</span>}
    <span style={{
      fontFamily: "'Fredoka',sans-serif", fontSize: 24, fontWeight: 700,
      color: gradient === C.grad.gold ? "#1e0f4a" : "#fff",
      letterSpacing: .5, textTransform: "uppercase",
    }}>{label}</span>
  </button>
);

// ═══════════════════════════════════════════════════════════════
// MAIN: TV Setup Screen (1920×1080)
// ═══════════════════════════════════════════════════════════════

const TVSetupScreen = () => {
  const [locName, setLocName] = useState("");
  const [email, setEmail] = useState("");
  const [regState, setRegState] = useState("form"); // form | sending | sent

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [codeState, setCodeState] = useState("input"); // input | verifying | activated
  const [codeAutoFilled, setCodeAutoFilled] = useState(false);

  const codeComplete = code.every(c => c !== "");

  // Simulated registration — returns code and auto-fills right side
  const hasEmail = email.trim().length > 0;

  const handleRegister = () => {
    if (!locName.trim()) return;
    setRegState("sending");
    setTimeout(() => {
      // Simulate API returning a code
      const returnedCode = ["B", "R", "7", "X", "9"];
      setCode(returnedCode);
      setCodeAutoFilled(true);
      setRegState("sent");
    }, 1800);
  };

  const handleActivate = () => {
    if (!codeComplete) return;
    setCodeState("verifying");
    setTimeout(() => setCodeState("activated"), 1500);
  };

  return (
    <div style={{
      width: 1920, height: 1080, position: "relative", overflow: "hidden",
      background: C.grad.main, fontFamily: "'Outfit',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes orb1{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(50px,-30px)scale(1.15)}66%{transform:translate(-25px,25px)scale(.9)}}
        @keyframes orb2{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-35px,45px)scale(.85)}66%{transform:translate(35px,-25px)scale(1.1)}}
        @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        @keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes codeGlow{0%,100%{box-shadow:0 0 30px rgba(255,210,0,.15)}50%{box-shadow:0 0 60px rgba(255,210,0,.35)}}
        @keyframes btnPulse{0%,100%{box-shadow:0 8px 32px rgba(0,0,0,.3)}50%{box-shadow:0 8px 40px rgba(0,212,170,.35)}}
        @keyframes popIn{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes slideInRight{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
        input::placeholder{color:rgba(255,255,255,.25)}
      `}</style>
      <Orbs />

      {/* ─── Header ─── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 0 28px",
      }}>
        <Logo size="lg" />
      </div>

      {/* ─── Split Panel Container ─── */}
      <div style={{
        position: "absolute", top: 120, bottom: 60, left: 60, right: 60,
        display: "flex", gap: 0, zIndex: 5,
      }}>

        {/* ═══ LEFT PANEL: Register ═══ */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "0 72px 0 36px",
          animation: "fadeIn .6s ease-out",
        }}>
          {regState === "form" && (
            <>
              <div style={{ marginBottom: 36 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "8px 18px", borderRadius: 24,
                  background: "rgba(102,126,234,.12)", border: `1px solid rgba(102,126,234,.2)`,
                  marginBottom: 20,
                }}>
                  <span style={{ fontSize: 15 }}>🆕</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.blue, letterSpacing: .5, textTransform: "uppercase" }}>New Location</span>
                </div>
                <h2 style={{
                  fontFamily: "'Fredoka',sans-serif", fontSize: 40, fontWeight: 700,
                  color: "#fff", lineHeight: 1.2, marginBottom: 12,
                }}>Register Your Location</h2>
                <p style={{ fontSize: 20, color: C.w(.45), lineHeight: 1.5, maxWidth: 520 }}>
                  Everything is free — live trivia, signage, analytics. Just enter your location name to get started.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
                <TVInput value={locName} onChange={setLocName} placeholder="Your location's name" icon="📍" autoFocus />
                <div>
                  <TVInput value={email} onChange={setEmail} placeholder="Owner email (optional)" icon="✉️" type="email" />
                  {!email.trim() && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, marginTop: 12, marginLeft: 2,
                      padding: "14px 22px", borderRadius: 14,
                      background: "rgba(255,210,0,.06)", border: "1px solid rgba(255,210,0,.12)",
                    }}>
                      <span style={{ fontSize: 26 }}>📺</span>
                      <div>
                        <span style={{
                          fontFamily: "'Fredoka',sans-serif", fontSize: 19, fontWeight: 700, color: C.gold, display: "block", lineHeight: 1.3,
                        }}>
                          Free Digital Signage
                        </span>
                        <span style={{ fontSize: 16, color: C.w(.4), fontWeight: 500 }}>
                          Add your email to get free signage, a dashboard & analytics — all completely free
                        </span>
                      </div>
                    </div>
                  )}
                  {email.trim() && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginLeft: 4,
                    }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <span style={{ fontSize: 16, color: C.green, fontWeight: 600 }}>
                        Signage, dashboard & analytics unlocked — all free
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 32 }}>
                <FeatureLine icon="🎯" text="Free live trivia that drives traffic and keeps guests longer" delay={.1} />
                <FeatureLine icon="📺" text="Free digital signage to promote your specials & events" delay={.15} />
                <FeatureLine icon="📊" text="Free dashboard with player metrics and engagement analytics" delay={.2} />
              </div>

              <TVButton
                label="Register & Get Code"
                gradient={C.grad.gold}
                onClick={handleRegister}
                disabled={!locName.trim()}
                icon="📧"
              />

              <p style={{ fontSize: 15, color: C.w(.25), textAlign: "center", marginTop: 16 }}>
                Use your TV remote or USB keyboard to type
              </p>
            </>
          )}

          {regState === "sending" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, animation: "fadeIn .4s ease-out" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                border: `3px solid ${C.w(.1)}`, borderTopColor: C.gold,
                animation: "spinSlow 1s linear infinite",
              }} />
              <div style={{ fontSize: 24, fontWeight: 600, color: C.w(.7) }}>Setting up your location...</div>
            </div>
          )}

          {regState === "sent" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, animation: "fadeIn .5s ease-out" }}>
              <div style={{
                width: 90, height: 90, borderRadius: "50%",
                background: "rgba(0,212,170,.12)", border: `2px solid rgba(0,212,170,.25)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "checkPop .5s ease-out",
              }}>
                <span style={{ fontSize: 44 }}>✅</span>
              </div>
              <h2 style={{
                fontFamily: "'Fredoka',sans-serif", fontSize: 36, fontWeight: 700,
                color: "#fff", textAlign: "center",
              }}>You're Registered!</h2>
              <p style={{ fontSize: 20, color: C.w(.5), textAlign: "center", lineHeight: 1.6, maxWidth: 480 }}>
                Your code is ready — <strong style={{ color: C.green }}>hit Activate on the right</strong> to get this TV running.
              </p>

              {hasEmail ? (
                <div style={{
                  display: "flex", flexDirection: "column", gap: 10,
                  padding: "22px 28px", borderRadius: 18,
                  background: C.w(.04), border: `1px solid ${C.w(.06)}`,
                  maxWidth: 520, width: "100%",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.w(.35), letterSpacing: .5, textTransform: "uppercase", marginBottom: 4 }}>
                    📧 We also emailed you at:
                  </div>
                  <div style={{
                    padding: "10px 20px", borderRadius: 10,
                    background: C.w(.04),
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 600, color: C.gold, fontFamily: "'DM Mono',monospace" }}>
                      {email}
                    </span>
                  </div>
                  <span style={{ fontSize: 17, color: C.w(.4), lineHeight: 1.5 }}>
                    Check your email for instructions to set up your dashboard and digital signage.
                  </span>
                </div>
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", gap: 10,
                  padding: "22px 28px", borderRadius: 18,
                  background: "rgba(255,210,0,.06)", border: `1px solid rgba(255,210,0,.15)`,
                  maxWidth: 520, width: "100%",
                }}>
                  <span style={{
                    fontFamily: "'Fredoka',sans-serif", fontSize: 24, fontWeight: 700,
                    color: C.gold,
                  }}>
                    📺 Don't miss your free signage!
                  </span>
                  <span style={{ fontSize: 18, color: C.w(.45), lineHeight: 1.5 }}>
                    Re-register with your email to get free digital signage, your management dashboard, and player analytics. Everything is free — no catch.
                  </span>
                </div>
              )}

              <button
                onClick={() => { setRegState("form"); setLocName(""); setEmail(""); setCode(["","","","",""]); setCodeAutoFilled(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 16, color: C.w(.3), fontFamily: "'Outfit',sans-serif",
                  marginTop: 4, padding: "6px 12px",
                }}
              >
                ← Start over
              </button>
            </div>
          )}
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div style={{
          width: 1, alignSelf: "stretch", margin: "48px 0",
          background: `linear-gradient(180deg, transparent 0%, ${C.w(.12)} 30%, ${C.w(.12)} 70%, transparent 100%)`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: 52, height: 52, borderRadius: "50%",
            background: "#1a0f3a", border: `1px solid ${C.w(.12)}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.w(.3), fontFamily: "'Outfit',sans-serif", letterSpacing: 1 }}>OR</span>
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Enter Code / Activate ═══ */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "center", padding: "0 36px 0 72px",
          animation: "fadeIn .6s ease-out .1s both",
        }}>

          {codeState !== "activated" && (
            <>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "8px 18px", borderRadius: 24,
                background: codeAutoFilled ? "rgba(0,212,170,.1)" : "rgba(102,126,234,.08)",
                border: `1px solid ${codeAutoFilled ? "rgba(0,212,170,.18)" : "rgba(102,126,234,.15)"}`,
                marginBottom: 20,
              }}>
                <span style={{ fontSize: 15 }}>{codeAutoFilled ? "✓" : "🔑"}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: codeAutoFilled ? C.green : C.blue, letterSpacing: .5, textTransform: "uppercase" }}>
                  {codeAutoFilled ? "Code Ready" : "Have a Code"}
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Fredoka',sans-serif", fontSize: 40, fontWeight: 700,
                color: "#fff", textAlign: "center", marginBottom: 12,
              }}>Activate This TV</h2>

              {!codeAutoFilled && (
                <p style={{
                  fontSize: 20, color: C.w(.45), textAlign: "center", lineHeight: 1.5,
                  marginBottom: 40, maxWidth: 500,
                }}>
                  Enter the 5-character code from your registration email to pair this TV to your location.
                </p>
              )}

              {codeAutoFilled && (
                <p style={{
                  fontSize: 20, color: C.w(.45), textAlign: "center", lineHeight: 1.5,
                  marginBottom: 40, maxWidth: 500,
                  animation: "slideInRight .5s ease-out",
                }}>
                  Your code is loaded and ready. Hit activate to start!
                </p>
              )}

              {/* Code boxes */}
              <div style={{
                marginBottom: 20, width: "100%", maxWidth: 520,
                animation: codeAutoFilled ? "popIn .5s ease-out" : "none",
              }}>
                <CodeInput code={code} setCode={setCode} readOnly={codeAutoFilled} />
              </div>

              {/* Big bold multi-TV message */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "20px 32px", borderRadius: 16,
                background: `linear-gradient(135deg, rgba(255,210,0,.06) 0%, rgba(247,151,30,.04) 100%)`,
                border: `1px solid rgba(255,210,0,.12)`,
                marginBottom: 36,
                maxWidth: 520, width: "100%",
                animation: codeAutoFilled ? "codeGlow 3s ease-in-out infinite" : "none",
              }}>
                <span style={{
                  fontFamily: "'Fredoka',sans-serif", fontSize: 26, fontWeight: 700,
                  color: C.gold, textAlign: "center", lineHeight: 1.3,
                  textShadow: "0 0 24px rgba(255,210,0,.2)",
                }}>
                  Use this code on all your TVs
                </span>
                <span style={{ fontSize: 17, color: C.w(.4), textAlign: "center", fontWeight: 500 }}>
                  One code activates every screen at your location
                </span>
              </div>

              {codeState === "error" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "14px 22px", borderRadius: 14,
                  background: "rgba(255,71,87,.08)", border: "1px solid rgba(255,71,87,.15)",
                  marginBottom: 20, animation: "shake .4s ease-out",
                }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <span style={{ fontSize: 18, color: C.red, fontWeight: 500 }}>Code not found. Check your email and try again.</span>
                </div>
              )}

              <div style={{ width: "100%", maxWidth: 520 }}>
                <TVButton
                  label={codeState === "verifying" ? "Activating..." : "Activate This TV"}
                  gradient={C.grad.correct}
                  onClick={handleActivate}
                  disabled={!codeComplete || codeState === "verifying"}
                  icon={codeState === "verifying" ? "⏳" : "📺"}
                  pulse={codeAutoFilled && codeState === "input"}
                />
              </div>

              {!codeAutoFilled && (
                <p style={{ fontSize: 15, color: C.w(.2), textAlign: "center", marginTop: 20 }}>
                  Lost your code? Check your email or register on the left.
                </p>
              )}
            </>
          )}

          {codeState === "activated" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, animation: "popIn .6s ease-out" }}>
              <div style={{
                width: 110, height: 110, borderRadius: "50%",
                background: "rgba(0,212,170,.12)", border: `3px solid rgba(0,212,170,.3)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "checkPop .6s ease-out",
              }}>
                <span style={{ fontSize: 56 }}>🎉</span>
              </div>
              <h2 style={{
                fontFamily: "'Fredoka',sans-serif", fontSize: 44, fontWeight: 700,
                color: "#fff", textAlign: "center",
              }}>You're Live!</h2>
              <p style={{ fontSize: 22, color: C.w(.5), textAlign: "center", lineHeight: 1.5, maxWidth: 460 }}>
                <strong style={{ color: C.gold }}>{locName || "Your location"}</strong> is now connected. Trivia starts here.
              </p>
              <div style={{
                fontSize: 16, color: C.w(.3), textAlign: "center", marginTop: 8,
                animation: "pulse 2s ease-in-out infinite",
              }}>
                Loading trivia experience...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div style={{
        position: "absolute", bottom: 18, left: 0, right: 0, zIndex: 10,
        display: "flex", justifyContent: "center",
      }}>
        <span style={{ fontSize: 14, color: C.w(.15), fontWeight: 500, letterSpacing: .3 }}>
          taptrivia.com · Free for venues · Powered by Visudo Labs
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DEMO WRAPPER
// ═══════════════════════════════════════════════════════════════

export default function App() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 32,
      background: "#0a0a0f", padding: 20,
    }}>
      <div style={{ color: "#fff", fontFamily: "system-ui", fontSize: 13, opacity: .4, letterSpacing: 1, textTransform: "uppercase" }}>
        TV Setup Screen — 1920×1080
      </div>
      <div style={{
        borderRadius: 12, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,.6)",
        border: "1px solid rgba(255,255,255,.06)",
      }}>
        <TVSetupScreen />
      </div>
    </div>
  );
}
