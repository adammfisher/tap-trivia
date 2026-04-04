import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// APP.TAPTRIVIA.TV — Smart App Store Redirect
// Detects iOS → App Store, Android → Google Play, Desktop → download page
// ═══════════════════════════════════════════════════════════════

// Placeholder URLs — replace with real store URLs when live
const STORE = {
  ios: "https://apps.apple.com/app/taptrivia/id000000000",
  android: "https://play.google.com/store/apps/details?id=com.visudolabs.taptrivia",
};

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&display=swap";

const T = {
  dark: "#06060f",
  green: "#00d4aa",
  gold: "#ffd200",
  w: (a) => `rgba(255,255,255,${a})`,
  grad: {
    main: "linear-gradient(165deg, #06060f 0%, #0f0326 15%, #1e0f4a 35%, #3d1866 55%, #6b2358 75%, #a8334a 100%)",
    cta: "linear-gradient(135deg, #00c9a7 0%, #00d4aa 40%, #2ee6b6 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
  },
};

const detect = () => {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
};

export default function AppRedirect() {
  const [platform, setPlatform] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = detect();
    setPlatform(p);
    setMounted(true);

    if (p === "ios" || p === "android") {
      setRedirecting(true);
      // Countdown then redirect
      let c = 3;
      const id = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(id);
          window.location.href = p === "ios" ? STORE.ios : STORE.android;
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, []);

  const cancelRedirect = () => {
    setRedirecting(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.grad.main, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('${FONTS_URL}');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.dark}; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: "absolute", top: "20%", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "20%", right: "15%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,51,74,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        maxWidth: 420, width: "100%", textAlign: "center", position: "relative",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s ease",
      }}>
        {/* Logo */}
        <div style={{ fontSize: 56, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🧠</div>
        <div style={{
          fontFamily: "'Fredoka',sans-serif", fontSize: 36, fontWeight: 700, color: "#fff",
          letterSpacing: -0.5, marginBottom: 8,
        }}>
          Tap<span style={{ color: T.gold }}>Trivia</span>
        </div>
        <p style={{
          fontFamily: "'Outfit',sans-serif", fontSize: 16, color: T.w(0.5), lineHeight: 1.5,
          marginBottom: 40,
        }}>
          Live trivia at your favorite bar.<br />Play on your phone. Compete on the big screen.
        </p>

        {/* Redirecting state (mobile) */}
        {redirecting && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{
              background: T.w(0.06), borderRadius: 16, padding: "28px 24px",
              border: `1px solid ${T.w(0.08)}`, marginBottom: 20,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", border: `3px solid ${T.w(0.1)}`,
                borderTopColor: T.green, animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }} />
              <div style={{
                fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 6,
              }}>
                Taking you to the {platform === "ios" ? "App Store" : "Google Play"}...
              </div>
              <div style={{
                fontFamily: "'Fredoka',sans-serif", fontSize: 32, fontWeight: 700, color: T.green,
              }}>{countdown}</div>
            </div>
            <button onClick={cancelRedirect} style={{
              background: "none", border: `1px solid ${T.w(0.12)}`, color: T.w(0.5),
              fontFamily: "'Outfit',sans-serif", fontSize: 14, padding: "10px 24px",
              borderRadius: 100, cursor: "pointer",
            }}>
              Stay on this page
            </button>
          </div>
        )}

        {/* Desktop or cancelled redirect — show both store badges */}
        {!redirecting && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* Store buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
              <a href={STORE.ios} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                background: "#fff", color: "#000", textDecoration: "none",
                fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 600,
                padding: "16px 24px", borderRadius: 14,
                transition: "transform 0.2s, box-shadow 0.2s",
              }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(255,255,255,0.1)"; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.82 9.3 4.8C10.58 4.78 11.8 5.67 12.58 5.67C13.36 5.67 14.85 4.59 16.4 4.75C17.05 4.78 18.7 5.01 19.72 6.53C19.63 6.59 17.59 7.78 17.62 10.29C17.65 13.28 20.22 14.27 20.25 14.28C20.22 14.35 19.84 15.72 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="black"/>
                </svg>
                Download on the App Store
              </a>
              <a href={STORE.android} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                background: T.w(0.08), color: "#fff", textDecoration: "none",
                fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 600,
                padding: "16px 24px", borderRadius: 14, border: `1px solid ${T.w(0.1)}`,
                transition: "transform 0.2s, background 0.2s",
              }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = T.w(0.12); }}
                 onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = T.w(0.08); }}>
                <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                  <path d="M1.22 0.27C0.86 0.65 0.65 1.23 0.65 1.97V22.03C0.65 22.77 0.86 23.35 1.22 23.73L1.3 23.8L12.56 12.54V12.34V12.14L1.3 0.88L1.22 0.27Z" fill="#4285F4"/>
                  <path d="M16.31 16.3L12.56 12.54V12.34V12.14L16.31 8.38L16.41 8.44L20.87 10.98C22.14 11.7 22.14 12.88 20.87 13.6L16.41 16.24L16.31 16.3Z" fill="#FBBC04"/>
                  <path d="M16.41 16.24L12.56 12.34L1.22 23.73C1.66 24.2 2.38 24.26 3.2 23.78L16.41 16.24Z" fill="#EA4335"/>
                  <path d="M16.41 8.44L3.2 0.9C2.38 0.42 1.66 0.48 1.22 0.95L12.56 12.34L16.41 8.44Z" fill="#34A853"/>
                </svg>
                Get it on Google Play
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: T.w(0.15) }}>
            © {new Date().getFullYear()} Visudo Labs LLC
          </div>
        </div>
      </div>
    </div>
  );
}
