import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// TAP TRIVIA v4 — Interactive Points Countdown
// Bigger QR, brain logo, tap to answer, live points drain
// ═══════════════════════════════════════════════════════════════

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    wrong: "linear-gradient(135deg, #ff4757, #ff6b81)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    header: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
    footer: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
  },
  w: a => `rgba(255,255,255,${a})`,
  b: a => `rgba(0,0,0,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea", purple: "#764ba2", darkGold: "#f7971e",
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
    @keyframes popIn{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
    @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes fadeDown{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
    @keyframes bounceIn{0%{transform:scale(1)}35%{transform:scale(1.07)}100%{transform:scale(1)}}
    @keyframes chatSlide{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:.75}}
    @keyframes orb1{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(50px,-30px)scale(1.15)}66%{transform:translate(-25px,25px)scale(.9)}}
    @keyframes orb2{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-35px,45px)scale(.85)}66%{transform:translate(35px,-25px)scale(1.1)}}
    @keyframes slideRight{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes codeGlow{0%,100%{text-shadow:0 0 20px rgba(255,210,0,.3)}50%{text-shadow:0 0 40px rgba(255,210,0,.6),0 0 60px rgba(255,210,0,.3)}}
    @keyframes categoryZoom{0%{transform:scale(.5);opacity:0}50%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes dotPulse{0%,100%{opacity:.3}50%{opacity:1}}
    @keyframes confetti1{0%{transform:translateY(0)rotate(0);opacity:1}100%{transform:translateY(140px)rotate(720deg);opacity:0}}
    @keyframes trophy{0%{transform:scale(0)rotate(-30deg)}50%{transform:scale(1.2)rotate(5deg)}100%{transform:scale(1)rotate(0)}}
    @keyframes rankSlide{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes pointsEarned{0%{transform:scale(0.5);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
    @keyframes countdownNum{0%{transform:scale(2);opacity:0}30%{transform:scale(0.9);opacity:1}50%{transform:scale(1)}100%{transform:scale(1);opacity:1}}
    @keyframes ringPulse{0%,100%{box-shadow:0 0 0 0 rgba(102,126,234,.4)}50%{box-shadow:0 0 0 12px rgba(102,126,234,0)}}
    @keyframes barReveal{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes medalDrop{0%{transform:translateY(-30px)scale(0);opacity:0}60%{transform:translateY(4px)scale(1.1);opacity:1}100%{transform:translateY(0)scale(1);opacity:1}}
    @keyframes correctFlash{0%{background:rgba(0,212,170,0)}30%{background:rgba(0,212,170,.08)}100%{background:rgba(0,212,170,0)}}
    @keyframes wrongFlash{0%{background:rgba(255,71,87,0)}30%{background:rgba(255,71,87,.08)}100%{background:rgba(255,71,87,0)}}
    @keyframes glowPulse{0%,100%{box-shadow:0 0 15px rgba(102,126,234,.25)}50%{box-shadow:0 0 30px rgba(102,126,234,.5)}}
    @keyframes drainPulse{0%,100%{opacity:1}50%{opacity:.85}}
    .ab{transition:all .2s cubic-bezier(.34,1.56,.64,1);cursor:pointer}
    .ab:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2)}
    .ab:active{transform:scale(.97)}
  `}</style>
);

// ─── Orbs ───
const Orbs = () => (
  <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(102,126,234,.12) 0%,transparent 70%)",top:"-8%",right:"8%",animation:"orb1 22s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,51,74,.1) 0%,transparent 70%)",bottom:"8%",left:"3%",animation:"orb2 28s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,170,.06) 0%,transparent 70%)",top:"45%",left:"55%",animation:"orb1 18s ease-in-out infinite reverse"}}/>
  </div>
);

// ─── Timer Ring ───
const Timer = ({sec,total,size=76,sw=4}) => {
  const r=(size-sw*2)/2,circ=2*Math.PI*r,pct=sec/total;
  const col=pct>.5?C.green:pct>.2?C.gold:C.red;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.w(.08)} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 1s linear,stroke .5s",filter:`drop-shadow(0 0 8px ${col})`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:size*.32,fontWeight:700,color:col,lineHeight:1,animation:pct<.2?"pulse 1s infinite":"none"}}>{sec}</span>
      </div>
    </div>
  );
};

// ─── Logo (Brain, no target) ───
const Logo = ({size="md"}) => {
  const s = {sm:{text:17},md:{text:22},lg:{text:32},xl:{text:44}}[size];
  return (
    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:s.text,fontWeight:700,letterSpacing:-.5,lineHeight:1}}>
      <span style={{color:"#fff"}}>Tap</span><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
    </span>
  );
};

// ─── Answer Card ───
const ACard = ({label,letter,state="default",onClick,delay=0,tv,disabled}) => {
  const L=String.fromCharCode(64+letter);
  const bg={default:C.w(1),selected:"transparent",correct:"transparent",wrong:"transparent",eliminated:C.w(.25)};
  const gr={selected:C.grad.selected,correct:C.grad.correct,wrong:C.grad.wrong};
  const tc={default:"#1e0f4a",selected:"#fff",correct:"#fff",wrong:"#fff",eliminated:C.w(.3)};
  const anim={correct:"bounceIn .4s ease-out",wrong:"shake .4s ease-out",default:`slideUp .4s ease-out ${delay*.08}s both`};
  const clickable = state==="default" && !disabled;
  return (
    <button className={clickable?"ab":""} onClick={clickable?onClick:undefined} style={{
      width:"100%",display:"flex",alignItems:"center",gap:tv?18:14,
      padding:tv?"18px 24px":"15px 18px",minHeight:tv?68:56,
      background:gr[state]||bg[state],border:state==="eliminated"?`1px dashed ${C.w(.15)}`:"none",
      borderRadius:tv?16:14,cursor:clickable?"pointer":"default",
      fontFamily:"'Outfit',sans-serif",textDecoration:state==="eliminated"?"line-through":"none",
      opacity:state==="eliminated"?.45:1,animation:state==="selected"?"glowPulse 2s ease-in-out infinite":(anim[state]||anim.default),
      boxShadow:state==="default"?"0 4px 16px rgba(0,0,0,.1)":state==="selected"?"0 4px 24px rgba(102,126,234,.35)":"none",
      position:"relative",overflow:"hidden",
    }}>
      <div style={{
        width:tv?40:32,height:tv?40:32,borderRadius:9,
        background:state==="correct"?C.green:state==="wrong"?C.red:state==="selected"?C.w(.2):state==="default"?"linear-gradient(135deg,#eef1ff,#e4d8ff)":C.w(.2),
        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:tv?16:14,
        color:state==="correct"||state==="wrong"||state==="selected"?"#fff":state==="default"?"#5b2a86":"#fff",flexShrink:0,
      }}>{state==="correct"?"✓":state==="wrong"?"✗":L}</div>
      <span style={{flex:1,textAlign:"left",fontSize:tv?20:15,fontWeight:600,color:tc[state],letterSpacing:-.2}}>{label}</span>
      {state==="correct"&&<span style={{fontSize:tv?20:16}}>🎉</span>}
    </button>
  );
};

// ─── Avatar ───
const Av = ({name,rank,size=36,you}) => {
  const h=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:`linear-gradient(135deg,hsl(${h},65%,52%),hsl(${(h+35)%360},65%,42%))`,
      display:"flex",alignItems:"center",justifyContent:"center",
      color:"#fff",fontWeight:700,fontSize:size*.4,fontFamily:"'Outfit',sans-serif",
      border:rank===1?`2px solid ${C.gold}`:you?`2px solid ${C.blue}`:`2px solid ${C.w(.2)}`,
      boxShadow:rank===1?`0 0 14px rgba(255,210,0,.4)`:you?`0 0 12px rgba(102,126,234,.3)`:"none",
      position:"relative",
    }}>
      {name.charAt(0).toUpperCase()}
      {rank&&rank<=3&&<span style={{position:"absolute",bottom:-3,right:-3,fontSize:size*.35}}>{rank===1?"🥇":rank===2?"🥈":"🥉"}</span>}
    </div>
  );
};

// ─── Chat ───
const Chat = ({name,msg,d=0}) => {
  const h=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{display:"flex",alignItems:"center",gap:7,animation:`chatSlide .3s ease-out ${d}s both`,padding:"2px 0"}}>
      <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,background:`hsl(${h},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700}}>{name.charAt(0)}</div>
      <span style={{fontSize:11,color:C.w(.45)}}><strong style={{color:`hsl(${h},55%,68%)`,fontWeight:600}}>{name}</strong> {msg}</span>
    </div>
  );
};

// ─── Confetti ───
const Confetti = ({color,left,delay,size=8}) => (
  <div style={{position:"absolute",top:-10,left:`${left}%`,width:size,height:size*1.4,background:color,borderRadius:2,animation:`confetti1 ${1.5+Math.random()}s ease-out ${delay}s forwards`,transform:`rotate(${Math.random()*360}deg)`,opacity:0,animationFillMode:"forwards"}}/>
);

// ─── QR Code (BIGGER) ───
const QRCode = ({size=160}) => {
  const grid=25, cellSize=size/grid;
  const cells = useMemo(()=>{
    const r=[];let s=48271;
    const inFinder=(cx,cy,x,y)=>x>=cx&&x<cx+7&&y>=cy&&y<cy+7;
    const inFinnerBorder=(cx,cy,x,y)=>inFinder(cx,cy,x,y)&&!(x>cx&&x<cx+6&&y>cy&&y<cy+6);
    const inFinnerCore=(cx,cy,x,y)=>x>=cx+2&&x<cx+5&&y>=cy+2&&y<cy+5;
    for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
      if(inFinnerBorder(0,0,x,y)||inFinnerCore(0,0,x,y)||inFinnerBorder(18,0,x,y)||inFinnerCore(18,0,x,y)||inFinnerBorder(0,18,x,y)||inFinnerCore(0,18,x,y))
        r.push({x,y,f:true});
      else if(inFinder(0,0,x,y)||inFinder(18,0,x,y)||inFinder(0,18,x,y))
        r.push({x,y,f:false});
      else{s=((s*1103515245+12345)>>>0);if(s%100<42)r.push({x,y,f:true})}
    }
    return r;
  },[]);
  return (
    <div style={{background:"#fff",borderRadius:12,padding:12,display:"inline-block",boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.filter(c=>c.f).map((c,i)=><rect key={i} x={c.x*cellSize} y={c.y*cellSize} width={cellSize+.5} height={cellSize+.5} fill="#1e0f4a" rx={cellSize*.12}/>)}
      </svg>
    </div>
  );
};

// ─── Frames ───
const PhoneFrame = ({children}) => (
  <div style={{width:375,height:812,background:C.grad.main,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 25px 80px rgba(0,0,0,.5),inset 0 0 0 3px rgba(255,255,255,.08)"}}>
    {children}
  </div>
);
const TVFrame = ({children}) => (
  <div style={{width:960,height:540,background:C.grad.main,borderRadius:12,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 20px 60px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,255,255,.06)"}}>
    {children}
  </div>
);

// ─── Data ───
const PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Jake",score:9640},{name:"Chris K",score:10875},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},
  {name:"Ryan T",score:4200},{name:"Emma L",score:3900},{name:"Josh P",score:3400},
].sort((a,b)=>b.score-a.score);
const ANSWERS = ["Frozen","Tangled","Cinderella","Snow White"];
const Q = '"Let It Go" is the theme song of which Disney movie?';
const TOTAL_TIME = 20; // seconds per question
const MAX_PTS = 1000;

// ═══════════════════════════════════════════════════════════════
// INTERACTIVE PHONE — The core experience
// ═══════════════════════════════════════════════════════════════
const PhoneInteractive = () => {
  const [phase, setPhase] = useState("countdown"); // countdown | playing | revealed
  const [countNum, setCountNum] = useState(3);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selected, setSelected] = useState(null);
  const [lockedPts, setLockedPts] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [totalScore, setTotalScore] = useState(9640);
  const timerRef = useRef(null);

  // Points drain: linear from 1000 → 100 over the timer
  const availablePts = Math.max(100, Math.round(MAX_PTS * (timeLeft / TOTAL_TIME)));

  // Color for draining points
  const ptsPct = availablePts / MAX_PTS;
  const ptsColor = ptsPct > .6 ? C.green : ptsPct > .3 ? C.gold : C.red;

  // Countdown phase
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countNum <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountNum(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countNum]);

  // Playing timer — ticks every 100ms for smooth points drain
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) {
          clearInterval(timerRef.current);
          setRevealed(true);
          setPhase("revealed");
          return 0;
        }
        return Math.max(0, +(t - 0.1).toFixed(1));
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleSelect = (idx) => {
    if (selected !== null || phase !== "playing") return;
    setSelected(idx);
    setLockedPts(availablePts);
    // Reveal after 2 seconds
    setTimeout(() => {
      setRevealed(true);
      setPhase("revealed");
      clearInterval(timerRef.current);
      if (idx === 0) setTotalScore(s => s + availablePts);
    }, 2000);
  };

  const handleReset = () => {
    setPhase("countdown");
    setCountNum(3);
    setTimeLeft(TOTAL_TIME);
    setSelected(null);
    setLockedPts(null);
    setRevealed(false);
    setTotalScore(9640);
  };

  const displaySec = Math.ceil(timeLeft);
  const isCorrect = selected === 0;

  // ─── Countdown ───
  if (phase === "countdown") {
    return (
      <PhoneFrame><Orbs/>
        <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
          <Logo size="md"/>
          <div style={{marginTop:50,fontSize:14,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Question 7 of 15</div>
          <div style={{marginTop:6,fontSize:13,color:C.w(.3)}}>🎬 Entertainment — Disney Movies</div>
          <div style={{marginTop:30,width:120,height:120,borderRadius:"50%",background:C.w(.06),border:`3px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"ringPulse 1.5s ease-in-out infinite"}}>
            <span key={countNum} style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:"#fff",animation:"countdownNum .6s ease-out",lineHeight:1}}>{countNum || "GO!"}</span>
          </div>
          <div style={{marginTop:28,fontSize:15,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
          <div style={{marginTop:8,fontSize:12,color:C.w(.3)}}>Answer fast for more points</div>
        </div>
      </PhoneFrame>
    );
  }

  // ─── Playing / Answered / Revealed ───
  return (
    <PhoneFrame><Orbs/>
      <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",
        animation:revealed?(isCorrect?"correctFlash 1s ease-out":"wrongFlash 1s ease-out"):"none"
      }}>
        {/* Status bar */}
        <div style={{height:48,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:600,color:C.w(.4)}}>9:41</span>
          <div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div>
        </div>

        {/* Header */}
        <div style={{padding:"2px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Logo size="sm"/>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 10px"}}>
            <span style={{fontSize:12}}>👥</span><span style={{fontSize:12,fontWeight:700,color:"#fff"}}>14</span>
          </div>
        </div>

        {/* ═══ POINTS DISPLAY ═══ */}
        <div style={{padding:"12px 24px 0",textAlign:"center"}}>
          {!revealed && selected === null && (
            // COUNTING DOWN — shows draining points
            <div>
              <div style={{
                fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,lineHeight:1,
                color: ptsColor,
                filter:`drop-shadow(0 2px 12px ${ptsColor}50)`,
                transition:"color .3s",
                animation: ptsPct < .3 ? "drainPulse .5s ease-in-out infinite" : "none",
              }}>
                {availablePts}
              </div>
              <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>
                Points Available
              </div>
              {/* Points drain bar */}
              <div style={{width:180,height:4,borderRadius:2,background:C.w(.08),margin:"8px auto 0",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${ptsPct*100}%`,borderRadius:2,background:ptsColor,transition:"width .1s linear,background .3s"}}/>
              </div>
            </div>
          )}

          {selected !== null && !revealed && (
            // LOCKED IN — waiting for reveal
            <div style={{animation:"pointsEarned .4s cubic-bezier(.34,1.56,.64,1)"}}>
              <div style={{
                fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,
                background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                filter:"drop-shadow(0 2px 8px rgba(247,151,30,.35))",
              }}>
                {lockedPts}
              </div>
              <div style={{fontSize:11,fontWeight:600,color:C.gold,letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>
                Locked In! <span style={{color:C.w(.3)}}>/ {MAX_PTS}</span>
              </div>
            </div>
          )}

          {revealed && (
            // RESULT — earned or lost
            <div style={{animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>
              {isCorrect ? (
                <>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,lineHeight:1,color:C.green,filter:`drop-shadow(0 2px 12px rgba(0,212,170,.4))`}}>
                    +{lockedPts || 0}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:C.green,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>
                    Points Earned! <span style={{color:C.w(.3),fontWeight:500}}>/ {MAX_PTS}</span>
                  </div>
                </>
              ) : selected !== null ? (
                <>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:C.red,filter:`drop-shadow(0 2px 8px rgba(255,71,87,.3))`}}>+0</div>
                  <div style={{fontSize:12,fontWeight:700,color:C.red,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Wrong Answer</div>
                </>
              ) : (
                <>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:C.w(.25)}}>+0</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.w(.3),letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Time's Up!</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Total score pill */}
        <div style={{display:"flex",justifyContent:"center",padding:"8px 0 4px"}}>
          <div style={{background:C.w(.06),borderRadius:10,padding:"5px 14px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>{totalScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Timer */}
        <div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}>
          <Timer sec={displaySec} total={TOTAL_TIME} size={58} sw={3}/>
        </div>

        {/* Category + Progress */}
        <div style={{padding:"0 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
              <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
            </div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
          </div>
          <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
        </div>

        {/* Question */}
        <div style={{padding:"0 24px",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3,textShadow:`0 2px 12px ${C.b(.3)}`}}>{Q}</div>
        </div>

        {/* Answer Cards */}
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
          {ANSWERS.map((a,i) => {
            let state = "default";
            if (revealed) {
              if (i === 0) state = "correct";
              else if (i === selected && i !== 0) state = "wrong";
              else state = "default";
            } else if (selected === i) {
              state = "selected";
            } else if (selected !== null) {
              // Another answer selected, dim others
            }
            return (
              <ACard key={i} label={a} letter={i+1} state={state}
                onClick={()=>handleSelect(i)} delay={i}
                disabled={selected!==null}/>
            );
          })}
        </div>

        {/* Bottom: chat or reset */}
        <div style={{background:C.grad.footer,padding:"28px 18px 32px",marginTop:"auto"}}>
          {revealed ? (
            <div style={{textAlign:"center"}}>
              <button onClick={handleReset} style={{
                padding:"12px 32px",borderRadius:12,border:"none",
                background:C.grad.selected,color:"#fff",fontSize:14,fontWeight:700,
                fontFamily:"'Outfit',sans-serif",cursor:"pointer",
                boxShadow:"0 4px 20px rgba(102,126,234,.3)",
              }}>
                Try Again 🔄
              </button>
            </div>
          ) : (
            <>
              <Chat name="KatieBee" msg="Love this song! 🎵" d={0}/>
              <Chat name="TriviaNerd" msg="hurry up! ⏰" d={.1}/>
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
};

// ═══════════════════════════════════════════════════════════════
// TV SCREENS (static demos)
// ═══════════════════════════════════════════════════════════════

// ─── Reusable TV lower-left QR badge ───
const TVQRBadge = ({position="bl"}) => {
  const pos = position==="br" ? {bottom:14,right:20} : {bottom:14,left:20};
  return (
  <div style={{
    position:"absolute",...pos,zIndex:20,
    display:"flex",alignItems:"center",gap:14,
    background:"rgba(0,0,0,.55)",backdropFilter:"blur(12px)",
    borderRadius:16,padding:"12px 18px 12px 14px",
    border:`1px solid ${C.w(.08)}`,
  }}>
    <QRCode size={72}/>
    <div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:"#fff",lineHeight:1.2}}>Get the App!</div>
      <div style={{fontSize:11,fontWeight:600,color:C.gold,marginTop:3,letterSpacing:.5}}>taptrivia.com</div>
      <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5}}>
        <span style={{fontSize:9,fontWeight:600,color:C.w(.4),letterSpacing:1}}>JOIN</span>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
      </div>
    </div>
  </div>
);};

// TV LOBBY — big QR
const TLobby = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 40px"}}>
        <div style={{marginBottom:28}}><Logo size="xl"/></div>
        <div style={{fontSize:15,color:C.w(.4),marginBottom:28}}>Scan to join or enter code below</div>
        <QRCode size={180}/>
        <div style={{marginTop:24}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase",textAlign:"center",marginBottom:6}}>Or Enter Code</div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:56,fontWeight:700,color:C.gold,letterSpacing:8,textAlign:"center",animation:"codeGlow 3s ease-in-out infinite"}}>BR7X</div>
          <div style={{textAlign:"center",marginTop:6,fontSize:13,color:C.w(.3)}}>taptrivia.com/join</div>
        </div>
      </div>
      <div style={{flex:.7,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 36px"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:18}}>{PLAYERS.length} Players Ready</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
          {PLAYERS.map((p,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,animation:`popIn .3s ease-out ${i*.05}s both`}}>
              <Av name={p.name} size={44}/><span style={{fontSize:11,fontWeight:600,color:C.w(.55)}}>{p.name}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:24,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13,color:C.w(.3)}}>Waiting for host</span>
          <div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.w(.4),animation:`dotPulse 1.4s ease-in-out ${i*.2}s infinite`}}/>)}</div>
        </div>
      </div>
    </div>
  </TVFrame>
);

// TV GET READY
const TGetReady = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <Logo size="lg"/>
      <div style={{marginTop:36,fontSize:16,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Game Starting</div>
      <div style={{marginTop:24,width:140,height:140,borderRadius:"50%",background:C.w(.06),border:`3px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"ringPulse 1.5s ease-in-out infinite"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:72,fontWeight:700,color:"#fff",animation:"countdownNum .8s ease-out",lineHeight:1}}>3</span>
      </div>
      <div style={{marginTop:28,fontSize:18,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
      <div style={{marginTop:10,fontSize:14,color:C.w(.3)}}>15 questions • Answer fast for more points</div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

// TV CATEGORY
const TCategory = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:500,color:C.w(.35),letterSpacing:1,marginBottom:20}}>QUESTION 7 OF 15</div>
      <div style={{fontSize:88,marginBottom:16,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 8px 20px rgba(0,0,0,.3))"}}>🎬</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:42,fontWeight:700,color:"#fff",marginBottom:8,animation:"fadeDown .5s ease-out .2s both"}}>Entertainment</div>
      <div style={{fontSize:16,color:C.w(.4),fontWeight:500,animation:"fadeDown .5s ease-out .3s both"}}>Disney Movies</div>
      <div style={{marginTop:28,display:"inline-flex",gap:6,animation:"fadeDown .5s ease-out .4s both"}}>
        {[1,2,3,4,5].map(d=><div key={d} style={{width:10,height:10,borderRadius:"50%",background:d<=2?C.green:C.w(.1),boxShadow:d<=2?`0 0 8px ${C.green}`:"none"}}/>)}
        <span style={{fontSize:13,color:C.w(.4),marginLeft:8,fontWeight:500}}>Easy</span>
      </div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

// TV PLAYING — with live draining points
const TPlay = ({pts,timer,ptsColor}) => (
  <TVFrame><Orbs/>
    {/* Header — clean, no QR */}
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:C.grad.header,padding:"12px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <Logo size="sm"/>
      {/* Live draining points */}
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:38,fontWeight:700,lineHeight:1,color:ptsColor,transition:"color .3s",filter:`drop-shadow(0 2px 8px ${ptsColor}40)`}}>{pts}</div>
        <div style={{fontSize:10,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",marginTop:2}}>Points Available</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"5px 12px"}}><span style={{fontSize:14}}>👥</span><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{PLAYERS.length}</span></div>
        <Timer sec={timer} total={TOTAL_TIME} size={48} sw={3}/>
      </div>
    </div>
    {/* Main content */}
    <div style={{position:"absolute",top:76,bottom:72,left:0,right:0,display:"flex",padding:"0 36px",gap:36,zIndex:5}}>
      <div style={{flex:1.2,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.w(.08),borderRadius:20,padding:"6px 16px"}}><span style={{fontSize:18}}>🎬</span><span style={{fontSize:13,fontWeight:700,color:C.w(.85),textTransform:"uppercase",letterSpacing:.8}}>Entertainment</span></div>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.35)}}>Q7<span style={{color:C.w(.18)}}>/15</span></span>
        </div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff",lineHeight:1.25,letterSpacing:-.5,maxWidth:520,textShadow:`0 3px 16px ${C.b(.4)}`}}>{Q}</div>
        <div style={{height:4,borderRadius:2,background:C.w(.06),marginTop:22,maxWidth:280,overflow:"hidden"}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
        {ANSWERS.map((a,i)=><ACard key={i} label={a} letter={i+1} state="default" delay={i} tv/>)}
      </div>
    </div>
    {/* Bottom leaderboard — shifted right to make room for QR */}
    <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:10,background:C.grad.footer,padding:"16px 36px 12px"}}>
      <div style={{display:"flex",justifyContent:"flex-end",gap:32,paddingLeft:220}}>
        {PLAYERS.slice(0,5).map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:9}}><Av name={p.name} rank={i+1} size={28}/><div><div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</div></div></div>))}
      </div>
    </div>
    {/* QR Badge — lower left */}
    <TVQRBadge/>
  </TVFrame>
);

// TV LEADERBOARD
const TLeaderboard = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,padding:"28px 40px"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <Logo size="md"/><div style={{fontSize:13,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginTop:8,marginBottom:24}}>After Question 7</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16}}>
          {[1,0,2].map(idx=>{const p=PLAYERS[idx];const r=idx+1;const h={0:130,1:100,2:80}[idx];return(
            <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
              <div style={{animation:`medalDrop .5s ease-out ${idx*.15+.3}s both`}}><Av name={p.name} rank={r} size={r===1?56:46}/></div>
              <div style={{fontSize:r===1?15:13,fontWeight:700,color:"#fff",marginTop:8}}>{p.name}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?22:17,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
              <div style={{width:r===1?90:75,height:h,marginTop:10,borderRadius:"14px 14px 0 0",background:r===1?`linear-gradient(180deg,${C.gold}35,${C.gold}10)`:r===2?`linear-gradient(180deg,${C.w(.12)},${C.w(.04)})`:`linear-gradient(180deg,${C.darkGold}25,${C.darkGold}08)`,border:`1px solid ${r===1?`${C.gold}35`:C.w(.06)}`,borderBottom:"none",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:14}}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:r===1?C.gold:C.w(.25)}}>{r}</span>
              </div>
            </div>
          )})}
        </div>
      </div>
      <div style={{flex:.8,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 20px",gap:12}}>
        <div style={{fontSize:11,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>Top 10</div>
        {PLAYERS.slice(3,10).map((p,i)=>{const isYou=p.name==="Jake";const rank=i+4;return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"0 10px",animation:`rankSlide .3s ease-out ${i*.04}s both`}}>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.w(.2),width:18,textAlign:"center"}}>{rank}</span>
            <Av name={p.name} size={26} you={isYou}/><span style={{flex:1,fontSize:13,fontWeight:isYou?700:500,color:C.w(isYou?1:.7)}}>{p.name}{isYou&&<span style={{fontSize:8,color:C.blue,marginLeft:4}}>YOU</span>}</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
          </div>
        )})}
        <div style={{fontSize:11,color:C.w(.25),padding:"0 10px",animation:"pulse 2s infinite"}}>Next question in 5s...</div>
        <div style={{display:"flex",alignItems:"center",gap:14,background:C.b(.35),backdropFilter:"blur(12px)",borderRadius:14,padding:"12px 16px",border:`1px solid ${C.w(.06)}`,marginTop:4}}>
          <QRCode size={60}/>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.2}}>Get the App!</div>
            <div style={{fontSize:13,fontWeight:600,color:C.gold,marginTop:3}}>taptrivia.com</div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}><span style={{fontSize:10,fontWeight:600,color:C.w(.4),letterSpacing:1}}>JOIN</span><span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span></div>
          </div>
        </div>
      </div>
    </div>
  </TVFrame>
);

// TV RESULTS
const TResults = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>{Array.from({length:16}).map((_,i)=><Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81","#ffe066"][i%7]} left={3+i*6} delay={i*.1} size={5+Math.random()*7}/>)}</div>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,padding:"28px 40px"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:64,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:12}}>🏆</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",marginBottom:4}}>Game Over!</div>
        <div style={{fontSize:14,color:C.w(.4),marginBottom:28}}>15 questions • {PLAYERS.length} players</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16}}>
          {[1,0,2].map(idx=>{const p=PLAYERS[idx];const r=idx+1;return(
            <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
              <Av name={p.name} rank={r} size={r===1?60:48}/>
              <div style={{fontSize:r===1?16:13,fontWeight:700,color:"#fff",marginTop:8}}>{p.name}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?24:18,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
            </div>
          )})}
        </div>
      </div>
      <div style={{flex:.75,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 16px",gap:6}}>
        <div style={{fontSize:11,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",marginBottom:0}}>Final Standings</div>
        {PLAYERS.slice(0,10).map((p,i)=>{const isYou=p.name==="Jake";return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"0 8px",animation:`rankSlide .3s ease-out ${i*.04}s both`}}>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:i<3?C.gold:C.w(.2),width:16,textAlign:"center"}}>{i+1}</span>
            <Av name={p.name} rank={i+1} size={22} you={isYou}/><span style={{flex:1,fontSize:11,fontWeight:isYou?700:500,color:C.w(isYou?1:.65)}}>{p.name}</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
          </div>
        )})}
        <div style={{display:"flex",alignItems:"center",gap:14,background:C.b(.35),backdropFilter:"blur(12px)",borderRadius:14,padding:"12px 16px",border:`1px solid ${C.w(.06)}`,marginTop:4}}>
          <QRCode size={60}/>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.2}}>Get the App!</div>
            <div style={{fontSize:13,fontWeight:600,color:C.gold,marginTop:3}}>taptrivia.com</div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}><span style={{fontSize:10,fontWeight:600,color:C.w(.4),letterSpacing:1}}>JOIN</span><span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span></div>
          </div>
        </div>
      </div>
    </div>
  </TVFrame>
);

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
const TV_VIEWS = [
  {key:"lobby",label:"🏠 Lobby"},
  {key:"getready",label:"⏳ Get Ready"},
  {key:"category",label:"🎬 Category"},
  {key:"playing",label:"▶ Playing"},
  {key:"leaderboard",label:"📊 Leaderboard"},
  {key:"results",label:"🏆 Results"},
];

export default function App() {
  const [tvView,setTvView] = useState("playing");
  const [tvTimer,setTvTimer] = useState(TOTAL_TIME);

  useEffect(()=>{
    const t=setInterval(()=>setTvTimer(s=>s<=0?TOTAL_TIME:Math.max(0,+(s-.1).toFixed(1))),100);
    return()=>clearInterval(t);
  },[]);

  const tvSec = Math.ceil(tvTimer);
  const tvPts = Math.max(100, Math.round(MAX_PTS * (tvTimer / TOTAL_TIME)));
  const tvPtsPct = tvPts / MAX_PTS;
  const tvPtsColor = tvPtsPct > .6 ? C.green : tvPtsPct > .3 ? C.gold : C.red;

  const renderTV = () => {
    switch(tvView){
      case "lobby": return <TLobby/>;
      case "getready": return <TGetReady/>;
      case "category": return <TCategory/>;
      case "leaderboard": return <TLeaderboard/>;
      case "results": return <TResults/>;
      default: return <TPlay pts={tvPts} timer={tvSec} ptsColor={tvPtsColor}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#08080c",fontFamily:"'Outfit',sans-serif"}}>
      <Styles/>
      {/* Nav */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,12,.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.w(.05)}`,padding:"10px 16px"}}>
        <div style={{maxWidth:1500,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <Logo size="sm"/>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.25),letterSpacing:1}}>TV VIEW:</span>
            <div style={{display:"flex",gap:3}}>
              {TV_VIEWS.map(v=>(
                <button key={v.key} onClick={()=>setTvView(v.key)} style={{padding:"5px 10px",borderRadius:7,border:"none",background:tvView===v.key?C.grad.selected:C.w(.06),color:tvView===v.key?"#fff":C.w(.5),fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>{v.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:1500,margin:"0 auto",padding:"28px 16px 60px"}}>
        {/* Label */}
        <div style={{display:"flex",justifyContent:"center",gap:60,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{width:960,textAlign:"center"}}><span style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:2,textTransform:"uppercase"}}>📺 Bar TV — 16:9</span></div>
          <div style={{width:375,textAlign:"center"}}><span style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:2,textTransform:"uppercase"}}>📱 Interactive Phone — Tap to play!</span></div>
        </div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"flex-start",gap:48,flexWrap:"wrap"}}>
          <div style={{animation:"popIn .4s ease-out"}}>{renderTV()}</div>
          <div style={{animation:"popIn .4s ease-out .08s both"}}><PhoneInteractive/></div>
        </div>
      </div>
    </div>
  );
}
