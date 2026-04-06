import { useState, useEffect, useRef, useCallback } from "react";

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap";

const T = {
  dark: "#06060f", deepPurple: "#0f0326", green: "#00d4aa", red: "#ff4757",
  gold: "#ffd200", blue: "#667eea", lilac: "#764ba2",
  w: (a) => `rgba(255,255,255,${a})`,
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    hero: "linear-gradient(165deg, #06060f 0%, #0f0326 15%, #1e0f4a 35%, #3d1866 55%, #6b2358 75%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    card: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
    cta: "linear-gradient(135deg, #00c9a7 0%, #00d4aa 40%, #2ee6b6 100%)",
  },
  radius: { sm: 8, md: 14, lg: 20, xl: 28, pill: 100 },
  shadow: {
    glow: "0 0 60px rgba(102,126,234,0.15), 0 0 120px rgba(102,126,234,0.08)",
    greenGlow: "0 0 40px rgba(0,212,170,0.3), 0 4px 20px rgba(0,0,0,0.3)",
    goldGlow: "0 0 40px rgba(255,210,0,0.25), 0 4px 20px rgba(0,0,0,0.3)",
  },
};

const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const AnimCounter = ({ end, duration = 2000, prefix = "", suffix = "", inView }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let s = 0; const step = end / (duration / 16);
    const id = setInterval(() => { s += step; if (s >= end) { setVal(end); clearInterval(id); } else setVal(Math.floor(s)); }, 16);
    return () => clearInterval(id);
  }, [inView, end, duration]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
};

// ═══ PLATFORM BADGES — text only, brand colors ═══
const platformData = [
  { name: "Roku", color: "#662D91" },
  { name: "Fire Stick", color: "#FF9900" },
  { name: "Apple TV", color: "#A2AAAD" },
  { name: "Samsung", color: "#1428A0" },
  { name: "LG", color: "#A50034" },
];

const platformDataFull = [
  { name: "Roku", color: "#662D91" },
  { name: "Fire Stick", color: "#FF9900" },
  { name: "Samsung Tizen", color: "#1428A0" },
  { name: "LG webOS", color: "#A50034" },
  { name: "Apple TV", color: "#A2AAAD" },
  { name: "Vizio SmartCast", color: "#1A1A1A" },
];

const PlatformPill = ({ name, color, delay = 0, inView = true }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 8,
    background: T.w(0.06), border: `1px solid ${T.w(0.08)}`,
    borderRadius: T.radius.pill, padding: "9px 20px",
    opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(10px)",
    transition: `all 0.4s ease ${delay}s`,
  }}>
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
    <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: T.w(0.85) }}>{name}</span>
  </div>
);

// ═══ NAV ═══
const NavBar = ({ onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 40); window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h); }, []);
  const nav = (id) => { onNavigate(id); setMobileOpen(false); };
  const links = [["How It Works","how"],["Features","features"],["Digital Signage","signage"],["Venues","venues"]];
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:1000,background:scrolled?"rgba(6,6,15,0.92)":"transparent",backdropFilter:scrolled?"blur(20px) saturate(1.4)":"none",borderBottom:scrolled?`1px solid ${T.w(0.06)}`:"1px solid transparent",transition:"all 0.4s ease",padding:"0 24px" }}>
      <div style={{ maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:68 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }} onClick={() => nav("hero")}>
          <span style={{ fontSize:28,lineHeight:1 }}>🧠</span>
          <span style={{ fontFamily:"'Fredoka',sans-serif",fontWeight:700,fontSize:22,color:"#fff",letterSpacing:-0.5 }}>Tap<span style={{ color:T.gold }}>Trivia</span></span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:32 }} className="desktop-nav">
          {links.map(([l,id]) => <button key={id} onClick={() => nav(id)} style={{ background:"none",border:"none",color:T.w(0.7),fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:500,cursor:"pointer",padding:"6px 0",transition:"color 0.2s",letterSpacing:0.2 }} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color=T.w(0.7)}>{l}</button>)}
          <button onClick={() => nav("how")} style={{ background:T.grad.cta,border:"none",color:T.dark,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,padding:"10px 24px",borderRadius:T.radius.pill,cursor:"pointer",letterSpacing:0.3,transition:"transform 0.2s, box-shadow 0.2s" }} onMouseEnter={e=>{e.target.style.transform="translateY(-1px)";e.target.style.boxShadow=T.shadow.greenGlow}} onMouseLeave={e=>{e.target.style.transform="";e.target.style.boxShadow=""}}>Get Started Free</button>
        </div>
        <button className="mobile-nav-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{ display:"none",background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer",padding:8 }}>{mobileOpen?"✕":"☰"}</button>
      </div>
      {mobileOpen && <div style={{ position:"absolute",top:68,left:0,right:0,background:"rgba(6,6,15,0.97)",backdropFilter:"blur(20px)",padding:"16px 24px 24px",borderBottom:`1px solid ${T.w(0.08)}` }}>
        {links.map(([l,id]) => <button key={id} onClick={() => nav(id)} style={{ display:"block",width:"100%",textAlign:"left",background:"none",border:"none",color:T.w(0.8),fontFamily:"'Outfit',sans-serif",fontSize:16,padding:"14px 0",borderBottom:`1px solid ${T.w(0.06)}`,cursor:"pointer" }}>{l}</button>)}
        <button onClick={() => nav("how")} style={{ display:"block",marginTop:16,width:"100%",background:T.grad.cta,border:"none",color:T.dark,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,padding:"14px 0",borderRadius:T.radius.pill,cursor:"pointer",textAlign:"center" }}>Get Started Free</button>
      </div>}
    </nav>
  );
};

// ═══ HERO ═══
const HeroSection = ({ onNavigate }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  const anim = (delay) => ({ opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(16px)", transition:`all 0.7s ease ${delay}s` });
  return (
    <section id="hero" style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.grad.hero,position:"relative",overflow:"hidden",padding:"100px 24px 60px" }}>
      <div style={{ position:"absolute",top:"10%",left:"15%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)",animation:"orbFloat1 12s ease-in-out infinite",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"15%",right:"10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle, rgba(168,51,74,0.1) 0%, transparent 70%)",animation:"orbFloat2 15s ease-in-out infinite",pointerEvents:"none" }} />
      <div style={{ position:"absolute",top:"50%",left:"60%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle, rgba(0,212,170,0.05) 0%, transparent 70%)",animation:"orbFloat3 10s ease-in-out infinite",pointerEvents:"none" }} />

      <div style={{ maxWidth:1100,width:"100%",textAlign:"center",position:"relative",zIndex:1 }}>
        <div style={anim(0.1)}>
          <span style={{ fontFamily:"'Fredoka',sans-serif",fontWeight:700,fontSize:"clamp(14px, 2vw, 17px)",background:T.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:1 }}>NO COST. NO CONTRACT. NO CATCH.</span>
        </div>

        <h1 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(32px, 5.5vw, 62px)",fontWeight:700,lineHeight:1.1,color:"#fff",letterSpacing:-1,marginTop:20,marginBottom:20,...anim(0.2) }}>
          Live Trivia &amp; Digital Signage<br />
          <span style={{ background:T.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>for Any Venue.</span>{" "}
          <span style={{ color:T.green }}>Completely Free.</span>
        </h1>

        <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(16px, 2.5vw, 21px)",fontWeight:400,color:T.w(0.6),lineHeight:1.6,maxWidth:660,margin:"0 auto 24px",...anim(0.35) }}>
          Turn your smart TV or streaming device into an interactive trivia experience with built-in promotional signage.
          Guests play along on a free companion app for iOS and Android. No hardware to buy. No fees of any kind.
        </p>

        {/* Schedule callout */}
        <div style={{ display:"inline-flex",alignItems:"center",gap:10,background:T.w(0.05),border:`1px solid ${T.w(0.08)}`,borderRadius:T.radius.pill,padding:"8px 20px",marginBottom:32,...anim(0.4) }}>
          <span style={{ fontSize:14 }}>🌙</span>
          <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.6) }}>Trivia runs nightly <span style={{ color:T.green,fontWeight:600 }}>5 PM – 5 AM EST</span></span>
          <span style={{ color:T.w(0.25),fontSize:13 }}>•</span>
          <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.45) }}>Your signage runs in the off hours</span>
        </div>

        <div style={{ marginBottom:36,...anim(0.45) }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:T.w(0.35),textTransform:"uppercase",letterSpacing:2,marginBottom:14 }}>Available free on</div>
          <div style={{ display:"flex",justifyContent:"center",flexWrap:"wrap",gap:10 }}>
            {platformData.map((p,i) => <PlatformPill key={i} name={p.name} color={p.color} inView={mounted} delay={0.5+i*0.05} />)}
          </div>
        </div>

        <div style={{ display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",...anim(0.6) }}>
          <button onClick={() => onNavigate("how")} style={{ display:"inline-flex",alignItems:"center",gap:8,background:T.grad.cta,border:"none",color:T.dark,fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:700,padding:"16px 40px",borderRadius:T.radius.pill,cursor:"pointer",letterSpacing:0.3,boxShadow:T.shadow.greenGlow,transition:"transform 0.25s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px) scale(1.02)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>Get Started Free →</button>
          <button onClick={() => onNavigate("signage")} style={{ background:T.w(0.06),border:`1px solid ${T.w(0.12)}`,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:500,padding:"16px 32px",borderRadius:T.radius.pill,cursor:"pointer",backdropFilter:"blur(12px)",transition:"all 0.25s" }} onMouseEnter={e=>{e.target.style.background=T.w(0.1);e.target.style.borderColor=T.w(0.2)}} onMouseLeave={e=>{e.target.style.background=T.w(0.06);e.target.style.borderColor=T.w(0.12)}}>See the Demo</button>
        </div>

        <div style={{ marginTop:60,maxWidth:720,margin:"60px auto 0",...anim(0.7) }}>
          <MiniTVPreview />
        </div>
      </div>
    </section>
  );
};

const MiniTVPreview = () => {
  const [phase, setPhase] = useState(0);
  useEffect(() => { const id = setInterval(() => setPhase(p => (p+1)%3), 3500); return () => clearInterval(id); }, []);
  return (
    <div style={{ background:"#0a0a1a",borderRadius:16,border:`2px solid ${T.w(0.08)}`,boxShadow:T.shadow.glow,overflow:"hidden",position:"relative",aspectRatio:"16/9" }}>
      <div style={{ position:"absolute",inset:-1,borderRadius:16,background:"linear-gradient(135deg, rgba(102,126,234,0.1), rgba(168,51,74,0.1))",zIndex:0 }} />
      <div style={{ position:"relative",zIndex:1,height:"100%",background:T.grad.main,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"5% 8%" }}>
        {phase===0 && <div style={{ width:"100%",animation:"fadeIn 0.5s ease" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:"3%" }}>
            <span style={{ fontSize:"clamp(14px,2vw,20px)" }}>🎬</span>
            <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(10px,1.4vw,15px)",fontWeight:600,color:T.w(0.6),textTransform:"uppercase",letterSpacing:1 }}>Entertainment</span>
            <div style={{ marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:"clamp(10px,1.2vw,13px)",color:T.w(0.35) }}>7/15</div>
          </div>
          <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(14px,2.4vw,26px)",fontWeight:700,color:"#fff",lineHeight:1.3,marginBottom:"4%" }}>Which 1994 film features Morgan Freeman narrating from inside a prison?</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"clamp(4px,0.8vw,10px)" }}>
            {["The Green Mile","The Shawshank Redemption","Se7en","Unforgiven"].map((a,i) => <div key={i} style={{ background:i===1?T.grad.correct:T.w(0.06),borderRadius:8,padding:"clamp(6px,1.2vw,14px) clamp(8px,1.5vw,16px)",display:"flex",alignItems:"center",gap:8,border:`1px solid ${i===1?"rgba(0,212,170,0.3)":T.w(0.08)}` }}>
              <span style={{ width:"clamp(18px,2.2vw,28px)",height:"clamp(18px,2.2vw,28px)",borderRadius:6,background:i===1?"rgba(255,255,255,0.2)":T.w(0.08),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"clamp(9px,1.2vw,14px)",fontWeight:800,color:i===1?"#fff":T.w(0.5),flexShrink:0 }}>{i===1?"✓":String.fromCharCode(65+i)}</span>
              <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(10px,1.5vw,16px)",fontWeight:600,color:i===1?"#fff":T.w(0.8) }}>{a}</span>
            </div>)}
          </div>
        </div>}
        {phase===1 && <div style={{ width:"100%",animation:"fadeIn 0.5s ease",textAlign:"center" }}>
          <div style={{ fontSize:"clamp(24px,4vw,48px)",marginBottom:8 }}>🏆</div>
          <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(16px,2.5vw,28px)",fontWeight:700,color:"#fff",marginBottom:"4%" }}>Leaderboard</div>
          {["QuizMaster","TriviaQueen","BigBrainSteve"].map((n,i) => <div key={i} style={{ display:"flex",alignItems:"center",gap:"clamp(6px,1vw,12px)",padding:"clamp(4px,0.8vw,10px) clamp(8px,1.5vw,16px)",background:i===0?"rgba(255,210,0,0.08)":T.w(0.03),borderRadius:8,marginBottom:6,border:`1px solid ${i===0?"rgba(255,210,0,0.15)":T.w(0.05)}` }}>
            <span style={{ fontSize:"clamp(12px,1.8vw,20px)" }}>{["🥇","🥈","🥉"][i]}</span>
            <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(11px,1.5vw,16px)",fontWeight:600,color:"#fff",flex:1,textAlign:"left" }}>{n}</span>
            <span style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(12px,1.6vw,18px)",fontWeight:700,color:i===0?T.gold:T.w(0.6) }}>{[8420,7150,6890][i]}</span>
          </div>)}
        </div>}
        {phase===2 && <div style={{ width:"100%",animation:"fadeIn 0.5s ease",textAlign:"center" }}>
          <div style={{ width:"clamp(50px,8vw,90px)",height:"clamp(50px,8vw,90px)",borderRadius:"50%",background:"linear-gradient(135deg, #2a5298, #1e3c72)",margin:"0 auto clamp(8px,1.5vw,16px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"clamp(20px,3.5vw,40px)",fontFamily:"'Fredoka',sans-serif",fontWeight:700,color:"#fff",border:`3px solid ${T.w(0.15)}` }}>L</div>
          <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(16px,2.5vw,28px)",fontWeight:700,color:"#fff",marginBottom:6 }}>Lakeside Country Club</div>
          <div style={{ background:T.w(0.06),borderRadius:10,padding:"clamp(8px,1.5vw,16px)",border:`1px solid ${T.w(0.08)}`,marginTop:"clamp(6px,1.2vw,12px)" }}>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(10px,1.2vw,14px)",fontWeight:600,color:T.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:4 }}>This Week</div>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(13px,1.8vw,20px)",fontWeight:600,color:"#fff" }}>Member Appreciation Night — Friday 7pm</div>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(10px,1.2vw,13px)",color:T.w(0.4),marginTop:4 }}>Complimentary appetizers • Live trivia • Door prizes</div>
          </div>
        </div>}
      </div>
      <div style={{ position:"absolute",bottom:"4%",left:"50%",transform:"translateX(-50%)",display:"flex",gap:8,zIndex:2 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:phase===i?24:8,height:8,borderRadius:4,background:phase===i?T.green:T.w(0.2),transition:"all 0.3s ease" }} />)}
      </div>
    </div>
  );
};

// ═══ SOCIAL PROOF ═══
const SocialProof = () => {
  const [ref, inView] = useInView(0.3);
  return (
    <section ref={ref} style={{ background:T.dark,borderTop:`1px solid ${T.w(0.05)}`,borderBottom:`1px solid ${T.w(0.05)}`,padding:"40px 24px" }}>
      <div style={{ maxWidth:1000,margin:"0 auto",display:"flex",justifyContent:"center",gap:"clamp(24px,6vw,80px)",flexWrap:"wrap" }}>
        {[{n:200000,suffix:"+",label:"Trivia Questions",icon:"🧠"},{n:60,suffix:"",label:"Categories",icon:"📚"},{n:7,suffix:"",label:"TV Platforms",icon:"📺"},{n:0,suffix:"",label:"Cost to Your Venue",icon:"💰",prefix:"$"}].map((s,i) => (
          <div key={i} style={{ textAlign:"center",minWidth:100 }}>
            <div style={{ fontSize:24,marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(28px,4vw,42px)",fontWeight:700,background:s.prefix==="$"?T.grad.cta:T.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1 }}><AnimCounter end={s.n} prefix={s.prefix||""} suffix={s.suffix} inView={inView} /></div>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:13,color:T.w(0.45),fontWeight:500,marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ═══ HOW IT WORKS ═══
const HowItWorks = () => {
  const [ref, inView] = useInView();
  const steps = [
    { num:"1",icon:"📺",title:"Install the Free TV App",desc:"Search for TapTrivia in the Roku, Fire Stick, Samsung, LG, or Apple TV app store. Download it — it's free.",time:"1 minute" },
    { num:"2",icon:"📝",title:"Register Your Venue",desc:"Open the app on your TV and enter your venue name and email. You'll get a permanent venue code on screen instantly. No payment info — there is nothing to pay.",time:"30 seconds" },
    { num:"3",icon:"🎉",title:"Guests Play Along",desc:"Your venue code displays on the TV. Guests see the code, open the free TapTrivia companion app on their phone, and join. Trivia runs automatically every evening from 5 PM to 5 AM — no staff attention required.",time:"Nightly" },
    { num:"4",icon:"🎨",title:"Customize Your Experience",desc:"Check the email you registered with — it has a link to your venue dashboard. Upload your logo, manage your digital signage, and view guest engagement stats. All free.",time:"Anytime" },
  ];
  return (
    <section id="how" style={{ padding:"100px 24px",background:T.dark }}>
      <div ref={ref} style={{ maxWidth:1100,margin:"0 auto" }}>
        <div style={{ textAlign:"center",marginBottom:64 }}>
          <div style={{ display:"inline-block",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:T.green,textTransform:"uppercase",letterSpacing:2,marginBottom:12,background:"rgba(0,212,170,0.08)",padding:"6px 16px",borderRadius:T.radius.pill,border:"1px solid rgba(0,212,170,0.15)" }}>How It Works</div>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(30px,5vw,48px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:-0.5 }}>Up and Running in<br /><span style={{ background:T.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Under 3 Minutes</span></h2>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:20,maxWidth:800,margin:"0 auto" }}>
          {steps.map((s,i) => <div key={i} style={{ background:T.grad.card,borderRadius:T.radius.lg,padding:"32px 28px",border:`1px solid ${T.w(0.06)}`,position:"relative",overflow:"hidden",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(24px)",transition:`all 0.6s ease ${i*0.12}s` }}>
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:"rgba(0,212,170,0.1)",border:"1px solid rgba(0,212,170,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:T.green,flexShrink:0 }}>{s.num}</div>
              <h3 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:600,color:"#fff",margin:0 }}>{s.title}</h3>
            </div>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.55),lineHeight:1.6,marginBottom:16 }}>{s.desc}</p>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:T.green,background:"rgba(0,212,170,0.06)",padding:"5px 12px",borderRadius:T.radius.pill,display:"inline-block",border:"1px solid rgba(0,212,170,0.1)" }}>{s.time}</div>
          </div>)}
        </div>
      </div>
    </section>
  );
};

// ═══ FEATURES ═══
const Features = () => {
  const [ref, inView] = useInView();
  const features = [
    { icon:"🧠",title:"200,000+ Questions",desc:"Spanning 60 categories from pop culture and sports to history and science. New questions added regularly, including current events." },
    { icon:"📱",title:"Companion App",desc:"Guests play along on the free TapTrivia app for iOS and Android. See the code on the TV, open the app, and join in seconds." },
    { icon:"📺",title:"Every Major TV Platform",desc:"Roku, Fire Stick, Samsung Tizen, LG webOS, Vizio SmartCast, Apple TV. Download free from any of their app stores." },
    { icon:"🎨",title:"Your Branding on Screen",desc:"Upload your logo and it displays between rounds. AI-powered background removal ensures a clean, professional look automatically." },
    { icon:"🏆",title:"Live Leaderboards",desc:"Real-time rankings update between every question. Points drain from 1,000 to 100 — the faster you answer, the more you score." },
    { icon:"⚡",title:"No Setup Costs",desc:"No special hardware. No contracts. No monthly fees. Use your existing TV and internet connection. Download the app and go." },
    { icon:"📊",title:"Venue Dashboard",desc:"See how many guests are playing, which nights are busiest, and what categories your audience enjoys — all from a simple web dashboard." },
    { icon:"🔄",title:"Fully Automatic",desc:"Trivia runs every evening from 5 PM to 5 AM with no staff attention needed. During the day, your TV displays your digital signage — your logo, promotions, and announcements on a loop." },
  ];
  return (
    <section id="features" style={{ padding:"100px 24px",background:T.deepPurple,position:"relative" }}>
      <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 80%, rgba(102,126,234,0.06) 0%, transparent 60%)",pointerEvents:"none" }} />
      <div ref={ref} style={{ maxWidth:1100,margin:"0 auto",position:"relative" }}>
        <div style={{ textAlign:"center",marginBottom:64 }}>
          <div style={{ display:"inline-block",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:T.blue,textTransform:"uppercase",letterSpacing:2,marginBottom:12,background:"rgba(102,126,234,0.08)",padding:"6px 16px",borderRadius:T.radius.pill,border:"1px solid rgba(102,126,234,0.15)" }}>Features</div>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(30px,5vw,48px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:-0.5 }}>Everything You Need.<br /><span style={{ color:T.green }}>Nothing You Don't.</span></h2>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))",gap:20 }}>
          {features.map((f,i) => <div key={i} style={{ background:T.w(0.03),borderRadius:T.radius.md,padding:"28px 24px",border:`1px solid ${T.w(0.05)}`,transition:`all 0.5s ease ${i*0.06}s`,opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)" }} onMouseEnter={e=>{e.currentTarget.style.background=T.w(0.06);e.currentTarget.style.borderColor=T.w(0.1);e.currentTarget.style.transform="translateY(-3px)"}} onMouseLeave={e=>{e.currentTarget.style.background=T.w(0.03);e.currentTarget.style.borderColor=T.w(0.05);e.currentTarget.style.transform="translateY(0)"}}>
            <div style={{ fontSize:28,marginBottom:14 }}>{f.icon}</div>
            <h3 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:600,color:"#fff",marginBottom:8 }}>{f.title}</h3>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.5),lineHeight:1.6 }}>{f.desc}</p>
          </div>)}
        </div>
      </div>
    </section>
  );
};

// ═══ DIGITAL SIGNAGE DEMO ═══
const SignageDemo = () => {
  const [ref, inView] = useInView();
  const [venueName, setVenueName] = useState("Lakeside Country Club");
  const [headline, setHeadline] = useState("Member Appreciation Night — Friday 7pm");
  const [details, setDetails] = useState("Complimentary appetizers • Live trivia • Door prizes");
  return (
    <section id="signage" style={{ padding:"100px 24px",background:T.dark,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 70% 30%, rgba(255,210,0,0.04) 0%, transparent 50%)",pointerEvents:"none" }} />
      <div ref={ref} style={{ maxWidth:1100,margin:"0 auto",position:"relative" }}>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <div style={{ display:"inline-block",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:T.gold,textTransform:"uppercase",letterSpacing:2,marginBottom:12,background:"rgba(255,210,0,0.06)",padding:"6px 16px",borderRadius:T.radius.pill,border:"1px solid rgba(255,210,0,0.12)" }}>Free Digital Signage — Included</div>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(30px,5vw,48px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:-0.5,marginBottom:16 }}>Your Promotions. Your Logo.<br /><span style={{ background:T.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>On the Big Screen. For Free.</span></h2>
          <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:17,color:T.w(0.5),lineHeight:1.6,maxWidth:620,margin:"0 auto" }}>
            Most digital signage services charge $50–100 per month. With TapTrivia, it's built in at no cost. Between trivia rounds, your TV displays your logo and custom messages — event announcements, promotions, membership specials, or anything you want your guests to see. Update anytime from any device.
          </p>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))",gap:32,alignItems:"start",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(24px)",transition:"all 0.7s ease 0.2s" }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:T.w(0.3),textTransform:"uppercase",letterSpacing:1.5,marginBottom:10,paddingLeft:4 }}>Live Preview</div>
            <div style={{ background:"#0a0a1a",borderRadius:14,border:`2px solid ${T.w(0.08)}`,boxShadow:T.shadow.goldGlow,overflow:"hidden",aspectRatio:"16/9" }}>
              <div style={{ height:"100%",background:T.grad.main,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8%" }}>
                <div style={{ width:"clamp(60px,10vw,100px)",height:"clamp(60px,10vw,100px)",borderRadius:"50%",background:"linear-gradient(135deg, #2a5298, #1e3c72)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"clamp(24px,4vw,44px)",fontFamily:"'Fredoka',sans-serif",fontWeight:700,color:"#fff",border:`3px solid ${T.w(0.15)}`,marginBottom:"clamp(8px,2vw,20px)",boxShadow:"0 4px 24px rgba(0,0,0,0.3)" }}>{venueName.charAt(0)||"V"}</div>
                <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(18px,3vw,32px)",fontWeight:700,color:"#fff",marginBottom:"clamp(6px,1.5vw,16px)",textAlign:"center" }}>{venueName||"Your Venue"}</div>
                <div style={{ background:T.w(0.06),borderRadius:12,padding:"clamp(10px,2vw,20px)",border:`1px solid ${T.w(0.08)}`,width:"100%",maxWidth:400,textAlign:"center" }}>
                  <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(9px,1.1vw,13px)",fontWeight:600,color:T.gold,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6 }}>Featured</div>
                  <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(13px,2vw,22px)",fontWeight:600,color:"#fff",lineHeight:1.3 }}>{headline||"Your promotion here"}</div>
                  {details && <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:"clamp(9px,1.1vw,13px)",color:T.w(0.4),marginTop:6 }}>{details}</div>}
                </div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:12,padding:"10px 16px",background:"rgba(0,212,170,0.04)",borderRadius:10,border:"1px solid rgba(0,212,170,0.08)" }}>
              <span style={{ fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:T.green }}>$0/mo</span>
              <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:T.w(0.4) }}>— Digital signage is included free with every TapTrivia venue. No add-on. No upgrade.</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:T.w(0.3),textTransform:"uppercase",letterSpacing:1.5,marginBottom:10,paddingLeft:4 }}>Try It — Type Below and Watch It Update</div>
            <div style={{ background:T.w(0.03),borderRadius:T.radius.lg,padding:28,border:`1px solid ${T.w(0.06)}` }}>
              {[{label:"Venue Name",value:venueName,set:setVenueName,ph:"Your venue name"},{label:"Headline",value:headline,set:setHeadline,ph:"e.g. Live Music This Saturday"},{label:"Details",value:details,set:setDetails,ph:"e.g. 8pm–11pm • No Cover"}].map((f,i) => <div key={i} style={{ marginBottom:i<2?20:0 }}>
                <label style={{ display:"block",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,color:T.w(0.5),textTransform:"uppercase",letterSpacing:0.8,marginBottom:6 }}>{f.label}</label>
                <input type="text" value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{ width:"100%",background:T.w(0.05),border:`1px solid ${T.w(0.08)}`,borderRadius:10,padding:"12px 16px",color:"#fff",fontSize:15,fontFamily:"'Outfit',sans-serif",outline:"none",transition:"border-color 0.2s" }} onFocus={e=>e.target.style.borderColor=T.w(0.2)} onBlur={e=>e.target.style.borderColor=T.w(0.08)} />
              </div>)}
              <div style={{ marginTop:24,padding:"16px 20px",background:"rgba(255,210,0,0.03)",borderRadius:10,border:"1px solid rgba(255,210,0,0.08)" }}>
                <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:13,color:T.gold,fontWeight:600,marginBottom:4 }}>This replaces a $50–100/mo signage service</div>
                <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:13,color:T.w(0.4),lineHeight:1.5 }}>Upload your actual logo in the venue dashboard — our AI strips the background automatically. Update your promotions anytime from your phone or computer. All included free.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══ VENUES ═══
const WhoItsFor = () => {
  const [ref, inView] = useInView();
  const venues = [
    {icon:"🍺",name:"Taprooms & Breweries",desc:"Keep guests engaged and ordering another round."},
    {icon:"🏈",name:"Sports Venues",desc:"Fill the gap between games with live competition."},
    {icon:"⛳",name:"Country Clubs",desc:"Member entertainment without additional staffing."},
    {icon:"🎳",name:"Entertainment Centers",desc:"Another attraction that runs itself."},
    {icon:"🏨",name:"Hotels & Resorts",desc:"Give guests a reason to stay at the property."},
    {icon:"🦅",name:"Fraternal Organizations",desc:"VFW, Legion, Elks — engagement at zero cost."},
    {icon:"🍽",name:"Restaurants",desc:"Turn wait times into an experience. Extend visits."},
    {icon:"🏢",name:"Corporate Facilities",desc:"Break rooms, lounges, and team-building events."},
    {icon:"🏠",name:"Senior Living Communities",desc:"Cognitive engagement and social activity."},
    {icon:"🎤",name:"Event Venues",desc:"Add interactive entertainment to any gathering."},
    {icon:"☕",name:"Cafés & Lounges",desc:"Evening programming that draws a new crowd."},
    {icon:"🍷",name:"Wine & Cocktail Lounges",desc:"Sophisticated entertainment for your guests."},
    {icon:"🏋️",name:"Gyms & Fitness Centers",desc:"Entertainment for the lobby and lounge areas."},
    {icon:"🎱",name:"Pool Halls & Game Rooms",desc:"Add a team challenge between rounds of play."},
    {icon:"⛵",name:"Yacht & Social Clubs",desc:"Member programming that runs itself."},
  ];
  return (
    <section id="venues" style={{ padding:"100px 24px",background:T.deepPurple }}>
      <div ref={ref} style={{ maxWidth:1100,margin:"0 auto" }}>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <div style={{ display:"inline-block",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:T.lilac,textTransform:"uppercase",letterSpacing:2,marginBottom:12,background:"rgba(118,75,162,0.1)",padding:"6px 16px",borderRadius:T.radius.pill,border:"1px solid rgba(118,75,162,0.15)" }}>Built for Every Venue</div>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(30px,5vw,48px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:-0.5 }}>If You Have a TV and<br /><span style={{ background:T.grad.selected,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Guests Who Like Fun</span></h2>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:14 }}>
          {venues.map((v,i) => <div key={i} style={{ background:T.w(0.03),borderRadius:T.radius.md,padding:"20px 18px",border:`1px solid ${T.w(0.05)}`,textAlign:"center",opacity:inView?1:0,transform:inView?"scale(1)":"scale(0.92)",transition:`all 0.4s ease ${i*0.04}s` }} onMouseEnter={e=>{e.currentTarget.style.background=T.w(0.06);e.currentTarget.style.transform="translateY(-3px)"}} onMouseLeave={e=>{e.currentTarget.style.background=T.w(0.03);e.currentTarget.style.transform="scale(1)"}}>
            <div style={{ fontSize:32,marginBottom:10 }}>{v.icon}</div>
            <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:600,color:"#fff",marginBottom:6 }}>{v.name}</div>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:13,color:T.w(0.45),lineHeight:1.5 }}>{v.desc}</div>
          </div>)}
        </div>
      </div>
    </section>
  );
};

// ═══ COMPARISON ═══
const WhyFree = () => {
  const [ref, inView] = useInView();
  return (
    <section style={{ padding:"100px 24px",background:T.dark,position:"relative" }}>
      <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%, rgba(0,212,170,0.04) 0%, transparent 50%)",pointerEvents:"none" }} />
      <div ref={ref} style={{ maxWidth:900,margin:"0 auto",position:"relative" }}>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <div style={{ display:"inline-block",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:T.green,textTransform:"uppercase",letterSpacing:2,marginBottom:12,background:"rgba(0,212,170,0.06)",padding:"6px 16px",borderRadius:T.radius.pill,border:"1px solid rgba(0,212,170,0.1)" }}>The Cost</div>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(30px,5vw,48px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:-0.5,marginBottom:20 }}>Traditional Trivia<br /><span style={{ color:T.green }}>vs. TapTrivia</span></h2>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all 0.7s ease 0.2s" }}>
          <div style={{ background:"rgba(255,71,87,0.04)",borderRadius:T.radius.lg,padding:"32px 28px",border:"1px solid rgba(255,71,87,0.1)" }}>
            <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:600,color:T.red,marginBottom:20 }}>Hiring a Trivia Host</div>
            {["$150–300 per event","Limited to one or two nights per week","Host cancels? Event is cancelled.","Paper and pen — slow, manual scoring","Separate digital signage — $50–100/mo","No data on engagement or preferences"].map((t,i) => <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:12,fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.55),lineHeight:1.5 }}><span style={{ color:T.red,fontSize:16,flexShrink:0,marginTop:1 }}>✕</span>{t}</div>)}
          </div>
          <div style={{ background:"rgba(0,212,170,0.04)",borderRadius:T.radius.lg,padding:"32px 28px",border:"1px solid rgba(0,212,170,0.1)" }}>
            <div style={{ fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:600,color:T.green,marginBottom:20 }}>TapTrivia</div>
            {["$0. Not $0 for a trial. $0 forever.","Trivia every evening, 5 PM to 5 AM","Your signage runs all day when trivia is off","Instant scoring on every guest's phone","Digital signage included — also $0","Venue dashboard with engagement data"].map((t,i) => <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:12,fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.55),lineHeight:1.5 }}><span style={{ color:T.green,fontSize:16,flexShrink:0,marginTop:1 }}>✓</span>{t}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══ TV PLATFORMS ═══
const TVPlatforms = () => {
  const [ref, inView] = useInView();
  return (
    <section style={{ padding:"80px 24px",background:T.deepPurple }}>
      <div ref={ref} style={{ maxWidth:900,margin:"0 auto",textAlign:"center" }}>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:T.w(0.3),textTransform:"uppercase",letterSpacing:2,marginBottom:14 }}>Download free from any of these app stores</div>
        <div style={{ display:"flex",flexWrap:"wrap",justifyContent:"center",gap:14 }}>
          {platformDataFull.map((p,i) => <PlatformPill key={i} name={p.name} color={p.color} inView={inView} delay={i*0.06} />)}
        </div>
      </div>
    </section>
  );
};

// ═══ CTA ═══
const GetStarted = () => {
  const [ref, inView] = useInView();
  return (
    <section id="start" style={{ padding:"100px 24px",background:T.dark,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",inset:0,background:T.grad.main,opacity:0.5 }} />
      <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 100%, rgba(0,212,170,0.08) 0%, transparent 50%)",pointerEvents:"none" }} />
      <div ref={ref} style={{ maxWidth:700,margin:"0 auto",textAlign:"center",position:"relative" }}>
        <div style={{ opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all 0.7s ease" }}>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(32px,5.5vw,54px)",fontWeight:700,color:"#fff",lineHeight:1.1,letterSpacing:-0.5,marginBottom:20 }}>Ready to Add Trivia<br />to Your Venue?</h2>
          <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:18,color:T.w(0.55),lineHeight:1.6,marginBottom:12,maxWidth:520,margin:"0 auto 12px" }}>Search for TapTrivia in your TV's app store. Install it, enter your venue name, and you're live.</p>
          <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:15,color:T.green,fontWeight:600,marginBottom:40 }}>No credit card. No contract. No trial period. Free means free.</p>
          <div style={{ display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",marginBottom:20 }}>
            <button onClick={() => { const el = document.getElementById("how"); if(el) el.scrollIntoView({behavior:"smooth"}); }} style={{ display:"inline-flex",alignItems:"center",gap:8,background:T.grad.cta,border:"none",color:T.dark,fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:700,padding:"18px 44px",borderRadius:T.radius.pill,boxShadow:T.shadow.greenGlow,transition:"transform 0.25s",cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px) scale(1.02)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>See How It Works →</button>
          </div>
          <div style={{ display:"flex",justifyContent:"center",flexWrap:"wrap",gap:10,marginBottom:32 }}>
            {platformData.map((p,i) => <PlatformPill key={i} name={p.name} color={p.color} inView={inView} delay={i*0.04} />)}
          </div>
          <div style={{ display:"flex",justifyContent:"center",gap:32,flexWrap:"wrap" }}>
            {[{icon:"🔒",text:"No payment info collected"},{icon:"⚡",text:"Live in under 3 minutes"},{icon:"♾️",text:"Free forever"}].map((t,i) => <div key={i} style={{ display:"flex",alignItems:"center",gap:8,fontFamily:"'Outfit',sans-serif",fontSize:13,color:T.w(0.4),fontWeight:500 }}><span style={{ fontSize:16 }}>{t.icon}</span>{t.text}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══ FAQ ═══
const FAQ = () => {
  const [open, setOpen] = useState(null);
  const [ref, inView] = useInView();
  const faqs = [
    {q:"Is this actually free? What's the catch?",a:"There is no catch and no hidden cost. TapTrivia is free for venues. No trial that expires, no credit card on file, no fees ever. We cover our costs through the companion mobile app, not through venue charges."},
    {q:"What equipment do I need?",a:"A TV and an internet connection. If your TV is a smart TV (Samsung, LG, or Vizio), search for TapTrivia in the built-in app store and install it. Otherwise, plug in a Fire Stick, Roku, or Apple TV and install TapTrivia from their app store. Open the app, enter your venue name, and you're live."},
    {q:"How do guests play?",a:"Guests download the free TapTrivia companion app on iOS or Android, enter the venue code displayed on your TV, and they're in. Trivia runs every evening from 5 PM to 5 AM — a new round starts every few minutes."},
    {q:"Does someone on my staff need to run the trivia?",a:"No. Games run automatically every evening from 5 PM to 5 AM with no staff interaction required. During the day, your TV switches to displaying your digital signage — your logo, promotions, and event announcements on a loop. Just leave the TV on."},
    {q:"What kind of trivia questions are available?",a:"Over 200,000 questions across 60 categories — pop culture, sports, movies, music, history, science, geography, food, and more. Difficulty ranges from accessible to challenging, and new questions are added regularly including current events."},
    {q:"Can I display my own promotions on the TV?",a:"Yes — and this is included free. Between trivia rounds, the TV displays your venue logo and custom messages. You manage everything from a web dashboard and can update from any device, anytime."},
    {q:"What if my internet connection drops?",a:"The TV app handles temporary outages gracefully — it will continue displaying your signage and reconnect automatically when the connection returns. No manual restart required."},
    {q:"Can I use this for private events?",a:"Private games and event modes are on our roadmap. Currently, the platform runs open games that anyone at your venue can join — which is effective for creating a social atmosphere and getting guests interacting."},
  ];
  return (
    <section id="faq" style={{ padding:"100px 24px",background:T.deepPurple }}>
      <div ref={ref} style={{ maxWidth:700,margin:"0 auto" }}>
        <div style={{ textAlign:"center",marginBottom:48 }}>
          <h2 style={{ fontFamily:"'Fredoka',sans-serif",fontSize:"clamp(28px,4.5vw,40px)",fontWeight:700,color:"#fff",letterSpacing:-0.5 }}>Frequently Asked Questions</h2>
        </div>
        {faqs.map((f,i) => <div key={i} style={{ borderBottom:`1px solid ${T.w(0.06)}`,opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(12px)",transition:`all 0.4s ease ${i*0.05}s` }}>
          <button onClick={() => setOpen(open===i?null:i)} style={{ width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",padding:"20px 0",cursor:"pointer",textAlign:"left" }}>
            <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,color:"#fff",paddingRight:20 }}>{f.q}</span>
            <span style={{ fontSize:20,color:T.w(0.3),transform:open===i?"rotate(45deg)":"rotate(0)",transition:"transform 0.25s",flexShrink:0 }}>+</span>
          </button>
          <div style={{ maxHeight:open===i?300:0,overflow:"hidden",transition:"max-height 0.35s ease" }}>
            <p style={{ fontFamily:"'Outfit',sans-serif",fontSize:14,color:T.w(0.5),lineHeight:1.7,paddingBottom:20 }}>{f.a}</p>
          </div>
        </div>)}
      </div>
    </section>
  );
};

// ═══ CONTACT FORM ═══
const ContactForm = () => {
  const [ref, inView] = useInView();
  const [form, setForm] = useState({ name: "", email: "", venue: "", message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus("sending");
    try {
      // Wire this up in Claude Code to POST to your API (SES via Lambda)
      const res = await fetch("https://api.taptrivia.tv/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("sent");
        setForm({ name: "", email: "", venue: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inputStyle = {
    width: "100%", background: T.w(0.05), border: `1px solid ${T.w(0.08)}`,
    borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 15,
    fontFamily: "'Outfit',sans-serif", outline: "none", transition: "border-color 0.2s",
  };

  return (
    <section id="contact" style={{ padding: "100px 24px", background: T.dark }}>
      <div ref={ref} style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-block", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 500,
            color: T.green, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12,
            background: "rgba(0,212,170,0.08)", padding: "6px 16px", borderRadius: T.radius.pill,
            border: "1px solid rgba(0,212,170,0.15)",
          }}>Get in Touch</div>
          <h2 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "clamp(28px,4.5vw,40px)", fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>
            Questions? We'd Love to Hear from You.
          </h2>
        </div>
        <div style={{
          background: T.w(0.03), borderRadius: T.radius.lg, padding: "36px 32px",
          border: `1px solid ${T.w(0.06)}`,
          opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease 0.1s",
        }}>
          {status === "sent" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, fontWeight: 600, color: T.green, marginBottom: 8 }}>Message Sent</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, color: T.w(0.5) }}>We'll get back to you shortly.</div>
            </div>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: T.w(0.5), textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" style={inputStyle} onFocus={e => e.target.style.borderColor = T.w(0.2)} onBlur={e => e.target.style.borderColor = T.w(0.08)} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: T.w(0.5), textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor = T.w(0.2)} onBlur={e => e.target.style.borderColor = T.w(0.08)} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: T.w(0.5), textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Venue Name <span style={{ color: T.w(0.25), fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                <input type="text" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} placeholder="Your venue name" style={inputStyle} onFocus={e => e.target.style.borderColor = T.w(0.2)} onBlur={e => e.target.style.borderColor = T.w(0.08)} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: T.w(0.5), textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Message *</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="How can we help?" rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 100 }} onFocus={e => e.target.style.borderColor = T.w(0.2)} onBlur={e => e.target.style.borderColor = T.w(0.08)} />
              </div>
              <button onClick={handleSubmit} disabled={status === "sending"} style={{
                width: "100%", background: T.grad.cta, border: "none", color: T.dark,
                fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, padding: "14px 0",
                borderRadius: T.radius.pill, cursor: status === "sending" ? "wait" : "pointer",
                transition: "transform 0.2s, opacity 0.2s",
                opacity: status === "sending" ? 0.7 : 1,
              }} onMouseEnter={e => { if (status !== "sending") e.target.style.transform = "translateY(-1px)"; }}
                 onMouseLeave={e => { e.target.style.transform = ""; }}>
                {status === "sending" ? "Sending..." : "Send Message"}
              </button>
              {status === "error" && (
                <div style={{ marginTop: 12, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: T.red, textAlign: "center" }}>
                  Something went wrong. Please try again or email us directly.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ═══ FOOTER ═══
const Footer = () => (
  <footer style={{ padding:"48px 24px 32px",background:T.dark,borderTop:`1px solid ${T.w(0.05)}` }}>
    <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:20 }}>
      <div>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
          <span style={{ fontSize:22 }}>🧠</span>
          <span style={{ fontFamily:"'Fredoka',sans-serif",fontWeight:700,fontSize:18,color:"#fff" }}>Tap<span style={{ color:T.gold }}>Trivia</span></span>
        </div>
        <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:12,color:T.w(0.3) }}>A product of <a href="https://visudolabs.com" style={{ color:T.w(0.4),textDecoration:"none" }}>Visudo Labs LLC</a> • Brevard, NC</div>
      </div>
      <div style={{ display:"flex",gap:24 }}>
        {[{label:"Contact",href:"#contact"},{label:"Privacy",href:"/privacy"},{label:"Terms",href:"/terms"}].map((l,i) => <a key={i} href={l.href} style={{ fontFamily:"'Outfit',sans-serif",fontSize:13,color:T.w(0.35),textDecoration:"none",transition:"color 0.2s" }} onMouseEnter={e=>e.target.style.color=T.w(0.7)} onMouseLeave={e=>e.target.style.color=T.w(0.35)}>{l.label}</a>)}
      </div>
    </div>
    <div style={{ maxWidth:1100,margin:"24px auto 0",textAlign:"center" }}>
      <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:11,color:T.w(0.15) }}>© {new Date().getFullYear()} Visudo Labs LLC. All rights reserved.</div>
    </div>
  </footer>
);

// ═══ STYLES ═══
const GlobalStyles = () => (
  <style>{`
    @import url('${FONTS_URL}');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{background:${T.dark};color:#fff;font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}
    ::selection{background:rgba(102,126,234,0.3);color:#fff}
    input::placeholder{color:${T.w(0.25)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.1)}}
    @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-25px,30px) scale(0.9)}}
    @keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(15px,-15px) scale(1.05)}}
    @media(max-width:768px){.desktop-nav{display:none!important}.mobile-nav-btn{display:block!important}}
    @media(min-width:769px){.mobile-nav-btn{display:none!important}}
  `}</style>
);

// ═══ MAIN ═══
export default function TapTriviaSite() {
  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior:"smooth",block:"start" });
    else window.scrollTo({ top:0,behavior:"smooth" });
  }, []);
  return (
    <div style={{ minHeight:"100vh",background:T.dark }}>
      <GlobalStyles />
      <NavBar onNavigate={scrollTo} />
      <HeroSection onNavigate={scrollTo} />
      <SocialProof />
      <HowItWorks />
      <Features />
      <SignageDemo />
      <WhoItsFor />
      <WhyFree />
      <TVPlatforms />
      <GetStarted />
      <FAQ />
      <ContactForm />
      <Footer />
    </div>
  );
}
