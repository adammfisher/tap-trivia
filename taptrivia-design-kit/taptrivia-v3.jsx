import { useState, useEffect, useRef, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// TAP TRIVIA v3 — Complete Screen Flow
// Renamed, QR codes, points-earned state, all screens
// ═══════════════════════════════════════════════════════════════

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    cool: "linear-gradient(150deg, #050d2e 0%, #0f1f5e 30%, #1a3a8a 60%, #2458a8 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    wrong: "linear-gradient(135deg, #ff4757, #ff6b81)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    header: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
    footer: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
    dark: "linear-gradient(150deg, #06060f 0%, #0e0a24 40%, #1a0f3a 100%)",
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
    @keyframes countPop{0%{transform:scale(1.6);opacity:0}50%{transform:scale(.92)}100%{transform:scale(1);opacity:1}}
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
    @keyframes scoreRoll{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes medalDrop{0%{transform:translateY(-30px)scale(0);opacity:0}60%{transform:translateY(4px)scale(1.1);opacity:1}100%{transform:translateY(0)scale(1);opacity:1}}
    @keyframes correctFlash{0%{background:rgba(0,212,170,0)}30%{background:rgba(0,212,170,.12)}100%{background:rgba(0,212,170,0)}}
    @keyframes wrongFlash{0%{background:rgba(255,71,87,0)}30%{background:rgba(255,71,87,.12)}100%{background:rgba(255,71,87,0)}}
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

// ─── Points (Fredoka) ───
const Pts = ({value,label,size="lg",earned}) => {
  const fs={sm:28,md:38,lg:52,xl:64}[size];
  return (
    <div style={{textAlign:"center"}}>
      {earned ? (
        <div style={{animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:fs,fontWeight:700,lineHeight:1,color:C.green,
            filter:"drop-shadow(0 2px 12px rgba(0,212,170,.4))",letterSpacing:-.5}}>
            +{typeof value==="number"?value.toLocaleString():value}
          </div>
        </div>
      ) : (
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:fs,fontWeight:700,lineHeight:1,letterSpacing:-.5,
          background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          filter:"drop-shadow(0 2px 8px rgba(247,151,30,.35))"}}>
          {typeof value==="number"?value.toLocaleString():value}
        </div>
      )}
      {label&&<div style={{fontSize:11,fontWeight:600,color:earned?C.green:C.gold,letterSpacing:2,textTransform:"uppercase",marginTop:4,opacity:.8}}>{label}</div>}
    </div>
  );
};

// ─── Answer Card ───
const ACard = ({label,letter,state="default",onClick,delay=0,tv}) => {
  const L=String.fromCharCode(64+letter);
  const bg={default:C.w(1),selected:"transparent",correct:"transparent",wrong:"transparent",eliminated:C.w(.25)};
  const gr={selected:C.grad.selected,correct:C.grad.correct,wrong:C.grad.wrong};
  const tc={default:"#1e0f4a",selected:"#fff",correct:"#fff",wrong:"#fff",eliminated:C.w(.3)};
  const anim={correct:"bounceIn .4s ease-out",wrong:"shake .4s ease-out",default:`slideUp .4s ease-out ${delay*.08}s both`};
  return (
    <button className={state==="default"?"ab":""} onClick={state==="default"?onClick:undefined} style={{
      width:"100%",display:"flex",alignItems:"center",gap:tv?18:14,
      padding:tv?"18px 24px":"15px 18px",minHeight:tv?68:56,
      background:gr[state]||bg[state],border:state==="eliminated"?`1px dashed ${C.w(.15)}`:"none",
      borderRadius:tv?16:14,cursor:state==="default"?"pointer":"default",
      fontFamily:"'Outfit',sans-serif",textDecoration:state==="eliminated"?"line-through":"none",
      opacity:state==="eliminated"?.45:1,animation:anim[state]||anim.default,
      boxShadow:state==="default"?"0 4px 16px rgba(0,0,0,.1)":state==="selected"?"0 4px 24px rgba(102,126,234,.35)":"none",
      position:"relative",overflow:"hidden",
    }}>
      <div style={{
        width:tv?40:32,height:tv?40:32,borderRadius:9,
        background:state==="correct"?C.green:state==="wrong"?C.red:state==="default"?"linear-gradient(135deg,#eef1ff,#e4d8ff)":C.w(.2),
        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:tv?16:14,
        color:state==="correct"||state==="wrong"?"#fff":state==="default"?"#5b2a86":"#fff",flexShrink:0,
      }}>{state==="correct"?"✓":state==="wrong"?"✗":L}</div>
      <span style={{flex:1,textAlign:"left",fontSize:tv?20:15,fontWeight:600,color:tc[state],letterSpacing:-.2}}>{label}</span>
      {state==="correct"&&<span style={{fontSize:tv?20:16}}>🎉</span>}
    </button>
  );
};

// ─── Avatar ───
const Av = ({name,rank,size=36,glow,you}) => {
  const h=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:`linear-gradient(135deg,hsl(${h},65%,52%),hsl(${(h+35)%360},65%,42%))`,
      display:"flex",alignItems:"center",justifyContent:"center",
      color:"#fff",fontWeight:700,fontSize:size*.4,fontFamily:"'Outfit',sans-serif",
      border:rank===1?`2px solid ${C.gold}`:you?`2px solid ${C.blue}`:glow?`2px solid ${C.blue}`:`2px solid ${C.w(.2)}`,
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

// ─── QR Code (SVG-based) ───
const QRCode = ({code="BR7X",size=120}) => {
  // Generate a deterministic pattern from the code
  const seed = code.split("").reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0;
  const grid = 21;
  const cellSize = size/grid;
  const cells = useMemo(()=>{
    const result = [];
    let s = seed;
    for(let y=0;y<grid;y++) for(let x=0;x<grid;x++){
      // Finder patterns (3 corners)
      const inFinder = (cx,cy)=>x>=cx&&x<cx+7&&y>=cy&&y<cy+7;
      const inFinderInner = (cx,cy)=>x>=cx+2&&x<cx+5&&y>=cy+2&&y<cy+5;
      const inFinderBorder = (cx,cy)=>inFinder(cx,cy)&&!((x>cx&&x<cx+6)&&(y>cy&&y<cy+6));
      
      if(inFinderBorder(0,0)||inFinderInner(0,0)||inFinderBorder(14,0)||inFinderInner(14,0)||inFinderBorder(0,14)||inFinderInner(0,14)){
        result.push({x,y,fill:true});
      } else if(inFinder(0,0)||inFinder(14,0)||inFinder(0,14)){
        result.push({x,y,fill:false});
      } else {
        s=((s*1103515245+12345)>>>0);
        if((s%100)<45) result.push({x,y,fill:true});
      }
    }
    return result;
  },[code,seed]);

  return (
    <div style={{background:"#fff",borderRadius:8,padding:8,display:"inline-block"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.filter(c=>c.fill).map((c,i)=>(
          <rect key={i} x={c.x*cellSize} y={c.y*cellSize} width={cellSize+.5} height={cellSize+.5} fill="#1e0f4a" rx={cellSize*.15}/>
        ))}
        {/* Center logo area */}
        <rect x={size*.35} y={size*.35} width={size*.3} height={size*.3} rx={6} fill="#fff"/>
        <text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle" fill="#1e0f4a" fontSize={size*.11} fontWeight="800" fontFamily="'Fredoka',sans-serif">TAP</text>
      </svg>
    </div>
  );
};

// ─── Logo ───
const Logo = ({size="md"}) => {
  const s = {sm:{icon:18,text:16},md:{icon:22,text:19},lg:{icon:32,text:28},xl:{icon:44,text:38}}[size];
  return (
    <div style={{display:"flex",alignItems:"center",gap:s.icon*.35}}>
      <span style={{fontSize:s.icon,filter:"drop-shadow(0 2px 6px rgba(0,0,0,.3))"}}>🎯</span>
      <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:s.text,fontWeight:700,color:"#fff",letterSpacing:-.5}}>
        Tap <span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
      </span>
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

// ─── Shared data ───
const PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Jake",score:9640},{name:"Chris K",score:10875},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},
  {name:"Ryan T",score:4200},{name:"Emma L",score:3900},{name:"Josh P",score:3400},
].sort((a,b)=>b.score-a.score);

const ANSWERS = ["Frozen","Tangled","Cinderella","Snow White"];
const QUESTION = '"Let It Go" is the theme song of which Disney movie?';

// ═══════════════════════════════════════════════════════════════
// PHONE SCREENS
// ═══════════════════════════════════════════════════════════════

// JOIN
const PJoin = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 32px"}}>
      <div style={{textAlign:"center",marginBottom:40,animation:"fadeDown .5s ease-out"}}>
        <div style={{fontSize:52,marginBottom:10,filter:"drop-shadow(0 4px 12px rgba(0,0,0,.3))"}}>🎯</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:34,fontWeight:700,color:"#fff",letterSpacing:-1}}>
          Tap <span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
        </div>
        <div style={{fontSize:13,color:C.w(.4),fontWeight:500,marginTop:4}}>Live Bar Trivia</div>
      </div>
      <div style={{marginBottom:28,animation:"slideUp .5s ease-out .1s both"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.5),letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,textAlign:"center"}}>Enter Room Code</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {["B","R","7","X"].map((c,i)=>(
            <div key={i} style={{width:58,height:72,borderRadius:14,background:C.w(.12),border:`2px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fredoka',sans-serif",fontSize:30,fontWeight:700,color:"#fff",boxShadow:`0 0 16px rgba(102,126,234,.25)`,transition:"all .2s"}}>{c}</div>
          ))}
        </div>
      </div>
      <div style={{marginBottom:32,animation:"slideUp .5s ease-out .2s both"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.5),letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,textAlign:"center"}}>Your Name</div>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderRadius:14,background:C.w(.08),border:`1px solid ${C.w(.1)}`}}>
          <span style={{fontSize:18,opacity:.5}}>👤</span>
          <span style={{fontSize:16,fontWeight:500,color:"#fff"}}>Jake</span>
        </div>
      </div>
      <button style={{width:"100%",padding:"18px",borderRadius:16,border:"none",background:C.grad.selected,color:"#fff",fontSize:18,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 6px 30px rgba(102,126,234,.35)",animation:"slideUp .5s ease-out .3s both",letterSpacing:.3}}>
        Join Game 🎯
      </button>
      <div style={{textAlign:"center",marginTop:16,fontSize:12,color:C.w(.3),animation:"slideUp .5s ease-out .4s both"}}>14 players already in the room</div>
    </div>
  </PhoneFrame>
);

// LOBBY
const PLobby = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"58px 24px 0",textAlign:"center"}}>
        <Logo size="md"/>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.w(.08),borderRadius:12,padding:"8px 18px",marginTop:14,border:`1px solid ${C.w(.08)}`}}>
          <span style={{fontSize:11,fontWeight:600,color:C.w(.5),letterSpacing:1}}>ROOM</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:C.gold,animation:"codeGlow 3s ease-in-out infinite",letterSpacing:3}}>BR7X</span>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 28px"}}>
        <div style={{fontSize:48,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>⏳</div>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:6}}>Waiting for host</div>
        <div style={{display:"flex",gap:4,marginBottom:28}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.w(.5),animation:`dotPulse 1.4s ease-in-out ${i*.2}s infinite`}}/>)}</div>
        <div style={{width:"100%",background:C.w(.05),borderRadius:18,padding:"18px",border:`1px solid ${C.w(.06)}`}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:14,textAlign:"center"}}>{PLAYERS.length} Players Joined</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
            {PLAYERS.slice(0,8).map((p,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,animation:`popIn .3s ease-out ${i*.06}s both`}}>
                <Av name={p.name} size={38} you={p.name==="Jake"}/>
                <span style={{fontSize:10,fontWeight:600,color:C.w(.5),maxWidth:48,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{padding:"0 24px 40px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,background:C.w(.08),borderRadius:14,padding:"12px 20px",border:`1px solid ${C.blue}30`}}>
          <Av name="Jake" size={32} you/>
          <div style={{textAlign:"left"}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Jake</div><div style={{fontSize:11,color:C.w(.4)}}>That's you!</div></div>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// GET READY COUNTDOWN
const PGetReady = ({count=3}) => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
      <Logo size="md"/>
      <div style={{marginTop:60,marginBottom:20,fontSize:14,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Game Starting</div>
      <div style={{
        width:120,height:120,borderRadius:"50%",
        background:C.w(.06),border:`3px solid ${C.blue}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        animation:"ringPulse 1.5s ease-in-out infinite",
      }}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:"#fff",animation:"countdownNum .8s ease-out",lineHeight:1}}>
          {count}
        </span>
      </div>
      <div style={{marginTop:28,fontSize:16,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
      <div style={{marginTop:12,fontSize:13,color:C.w(.3)}}>15 questions • Answer fast for more points</div>
    </div>
  </PhoneFrame>
);

// CATEGORY REVEAL
const PCategory = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:500,color:C.w(.4),marginBottom:20,letterSpacing:1,animation:"fadeDown .4s ease-out"}}>QUESTION 7 OF 15</div>
      <div style={{fontSize:72,marginBottom:20,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 8px 20px rgba(0,0,0,.3))"}}>🎬</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",marginBottom:8,animation:"fadeDown .5s ease-out .2s both",letterSpacing:-.5}}>Entertainment</div>
      <div style={{fontSize:14,color:C.w(.4),fontWeight:500,animation:"fadeDown .5s ease-out .3s both"}}>Disney Movies</div>
      <div style={{marginTop:24,display:"inline-flex",gap:5,animation:"fadeDown .5s ease-out .4s both"}}>
        {[1,2,3,4,5].map(d=><div key={d} style={{width:8,height:8,borderRadius:"50%",background:d<=2?C.green:C.w(.12),boxShadow:d<=2?`0 0 6px ${C.green}`:"none"}}/>)}
        <span style={{fontSize:11,color:C.w(.4),marginLeft:6,fontWeight:500}}>Easy</span>
      </div>
      <div style={{marginTop:40,fontSize:13,fontWeight:600,color:C.w(.3),letterSpacing:2,textTransform:"uppercase",animation:"pulse 2s ease-in-out infinite"}}>Get Ready...</div>
    </div>
  </PhoneFrame>
);

// PLAYING
const PPlay = ({timer,aState}) => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{height:50,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600,color:C.w(.4)}}>9:41</span>
        <div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div>
      </div>
      <div style={{padding:"4px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Logo size="sm"/>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 10px"}}>
          <span style={{fontSize:12}}>👥</span><span style={{fontSize:12,fontWeight:700,color:"#fff"}}>14</span>
        </div>
      </div>
      <div style={{padding:"14px 0 0"}}><Pts value={1000} label="Points Available" size="lg"/></div>
      <div style={{display:"flex",justifyContent:"center",padding:"14px 0"}}><Timer sec={timer} total={45} size={70}/></div>
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:14}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:19,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3,textShadow:`0 2px 12px ${C.b(.3)}`,animation:"fadeDown .4s ease-out"}}>{QUESTION}</div>
      </div>
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:9,flex:1}}>
        {ANSWERS.map((a,i)=><ACard key={i} label={a} letter={i+1} state={aState[i]||"default"} delay={i}/>)}
      </div>
      <div style={{background:C.grad.footer,padding:"36px 18px 34px",marginTop:"auto"}}>
        <Chat name="KatieBee" msg="Love this song! 🎵" d={0}/>
        <Chat name="TriviaNerd" msg="too easy 😎" d={.1}/>
      </div>
    </div>
  </PhoneFrame>
);

// ANSWERED — Shows points earned
const PAnswered = ({correct=true}) => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",animation:correct?"correctFlash 1s ease-out":"wrongFlash 1s ease-out"}}>
      <div style={{height:50,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600,color:C.w(.4)}}>9:41</span>
        <div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div>
      </div>
      <div style={{padding:"4px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Logo size="sm"/>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 10px"}}>
          <span style={{fontSize:12}}>👥</span><span style={{fontSize:12,fontWeight:700,color:"#fff"}}>14</span>
        </div>
      </div>

      {/* Points EARNED display */}
      <div style={{padding:"14px 0 0"}}>
        {correct ? (
          <Pts value={847} label="Points Earned!" size="lg" earned/>
        ) : (
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:42,fontWeight:700,color:C.red,lineHeight:1,filter:`drop-shadow(0 2px 8px rgba(255,71,87,.3))`,animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>+0</div>
            <div style={{fontSize:11,fontWeight:600,color:C.red,letterSpacing:2,textTransform:"uppercase",marginTop:4,opacity:.8}}>Wrong Answer</div>
          </div>
        )}
      </div>

      <div style={{display:"flex",justifyContent:"center",padding:"10px 0"}}>
        <div style={{background:C.w(.06),borderRadius:12,padding:"6px 16px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,fontWeight:600,color:C.w(.4)}}>YOUR TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:C.gold}}>{correct?"10,487":"9,640"}</span>
        </div>
      </div>

      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:14}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:19,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3}}>{QUESTION}</div>
      </div>
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:9,flex:1}}>
        {ANSWERS.map((a,i)=>{
          const st = correct ? (i===0?"correct":i===2?"eliminated":"default") : (i===1?"wrong":i===0?"correct":"default");
          return <ACard key={i} label={a} letter={i+1} state={st} delay={i}/>;
        })}
      </div>
      <div style={{background:C.grad.footer,padding:"36px 18px 34px",marginTop:"auto"}}>
        <Chat name="Sarah M" msg={correct?"Nice! 🎉":"ooh tough one 😬"} d={0}/>
        <Chat name="Mike D" msg="78% got this right" d={.1}/>
      </div>
    </div>
  </PhoneFrame>
);

// MID-GAME LEADERBOARD (Between Questions)
const PLeaderboard = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"58px 24px 0",textAlign:"center"}}>
        <Logo size="sm"/>
        <div style={{marginTop:14,fontSize:12,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase"}}>After Question 7 of 15</div>
      </div>

      {/* Top 3 Podium */}
      <div style={{padding:"20px 24px 0",display:"flex",justifyContent:"center",alignItems:"flex-end",gap:12}}>
        {[1,0,2].map(idx=>{
          const p=PLAYERS[idx]; const r=idx+1;
          const heights = {0:110,1:90,2:75};
          return (
            <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.12}s both`}}>
              <Av name={p.name} rank={r} size={r===1?52:44}/>
              <div style={{fontSize:r===1?14:12,fontWeight:700,color:"#fff",marginTop:6}}>{p.name}</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?18:15,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
              <div style={{
                width:r===1?80:68,height:heights[idx],marginTop:8,
                borderRadius:"12px 12px 0 0",
                background:r===1?`linear-gradient(180deg,${C.gold}40,${C.gold}15)`:r===2?`linear-gradient(180deg,${C.w(.15)},${C.w(.05)})`:`linear-gradient(180deg,${C.darkGold}30,${C.darkGold}10)`,
                border:`1px solid ${r===1?`${C.gold}40`:C.w(.08)}`,
                borderBottom:"none",
                display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:12,
              }}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:r===1?C.gold:C.w(.3)}}>{r}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of leaderboard */}
      <div style={{flex:1,padding:"16px 20px",overflow:"auto"}}>
        {PLAYERS.slice(3).map((p,i)=>{
          const isYou = p.name==="Jake";
          const rank = i+4;
          return (
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,marginBottom:3,
              background:isYou?`${C.blue}18`:"transparent",border:isYou?`1px solid ${C.blue}30`:"1px solid transparent",
              animation:`rankSlide .4s ease-out ${i*.05}s both`,
            }}>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.w(.25),width:22,textAlign:"center"}}>{rank}</span>
              <Av name={p.name} size={32} you={isYou}/>
              <span style={{flex:1,fontSize:13,fontWeight:isYou?700:600,color:"#fff"}}>{p.name}{isYou&&<span style={{fontSize:10,color:C.blue,marginLeft:6}}>YOU</span>}</span>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      <div style={{padding:"12px 24px 36px",textAlign:"center"}}>
        <div style={{fontSize:13,color:C.w(.3),animation:"pulse 2s infinite"}}>Next question in 5s...</div>
      </div>
    </div>
  </PhoneFrame>
);

// FINAL RESULTS
const PResults = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:3}}>
      {[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81","#ffe066","#2ee6b6","#ff9ff3","#feca57"].map((c,i)=>(
        <Confetti key={i} color={c} left={5+i*9.5} delay={i*.12} size={6+Math.random()*6}/>
      ))}
    </div>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"58px 24px 0",textAlign:"center"}}>
        <div style={{fontSize:56,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:8}}>🏆</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:26,fontWeight:700,color:"#fff",marginBottom:4,animation:"fadeDown .4s ease-out .2s both"}}>Game Over!</div>
        <div style={{fontSize:13,color:C.w(.45),animation:"fadeDown .4s ease-out .3s both"}}>15 questions • 14 players</div>
      </div>
      <div style={{padding:"16px 32px",textAlign:"center",animation:"fadeDown .5s ease-out .4s both"}}>
        <div style={{background:C.w(.06),borderRadius:20,padding:"20px",border:`1px solid ${C.w(.08)}`}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Your Final Score</div>
          <Pts value={9640} size="xl"/>
          <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14}}>
            {[{v:11,l:"Correct",c:C.green},{v:3,l:"Wrong",c:C.red},{v:1,l:"Timeout",c:C.gold}].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:C.w(.35),fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{fontSize:11,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",paddingLeft:24,marginBottom:8}}>Final Standings</div>
      <div style={{flex:1,padding:"0 20px",overflow:"auto"}}>
        {PLAYERS.map((p,i)=>{
          const isYou=p.name==="Jake";
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,marginBottom:3,background:isYou?`${C.blue}18`:"transparent",border:isYou?`1px solid ${C.blue}30`:"1px solid transparent",animation:`rankSlide .4s ease-out ${i*.05}s both`}}>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:i<3?C.gold:C.w(.25),width:24,textAlign:"center"}}>{i+1}</span>
              <Av name={p.name} rank={i+1} size={34} you={isYou}/>
              <span style={{flex:1,fontSize:14,fontWeight:isYou?700:600,color:"#fff"}}>{p.name}{isYou&&<span style={{fontSize:11,color:C.blue,marginLeft:6}}>YOU</span>}</span>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      <div style={{padding:"12px 24px 36px"}}>
        <button style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:`0 6px 28px rgba(102,126,234,.3)`}}>Play Again 🎮</button>
      </div>
    </div>
  </PhoneFrame>
);

// ═══════════════════════════════════════════════════════════════
// TV SCREENS
// ═══════════════════════════════════════════════════════════════

// TV LOBBY
const TLobby = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5}}>
      {/* Left side: branding + QR */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 40px"}}>
        <div style={{marginBottom:30}}><Logo size="xl"/></div>
        <div style={{fontSize:15,color:C.w(.4),marginBottom:32}}>Scan to join or enter code</div>
        <div style={{display:"flex",alignItems:"center",gap:32}}>
          <QRCode code="BR7X" size={140}/>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Room Code</div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,color:C.gold,letterSpacing:6,animation:"codeGlow 3s ease-in-out infinite"}}>BR7X</div>
            <div style={{marginTop:8,fontSize:13,color:C.w(.35)}}>taptrivia.com/join</div>
          </div>
        </div>
      </div>

      {/* Right side: players */}
      <div style={{flex:.8,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:18}}>{PLAYERS.length} Players Ready</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
          {PLAYERS.map((p,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,animation:`popIn .3s ease-out ${i*.05}s both`}}>
              <Av name={p.name} size={46}/>
              <span style={{fontSize:11,fontWeight:600,color:C.w(.55)}}>{p.name}</span>
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
const TGetReady = ({count=3}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <Logo size="lg"/>
      <div style={{marginTop:40,fontSize:16,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Game Starting</div>
      <div style={{marginTop:24,width:140,height:140,borderRadius:"50%",background:C.w(.06),border:`3px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"ringPulse 1.5s ease-in-out infinite"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:72,fontWeight:700,color:"#fff",animation:"countdownNum .8s ease-out",lineHeight:1}}>{count}</span>
      </div>
      <div style={{marginTop:28,fontSize:18,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
      <div style={{marginTop:10,fontSize:14,color:C.w(.3)}}>15 questions • Answer fast for more points</div>
    </div>
  </TVFrame>
);

// TV CATEGORY REVEAL
const TCategory = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:500,color:C.w(.35),letterSpacing:1,marginBottom:20}}>QUESTION 7 OF 15</div>
      <div style={{fontSize:88,marginBottom:16,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 8px 20px rgba(0,0,0,.3))"}}>🎬</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:42,fontWeight:700,color:"#fff",marginBottom:8,animation:"fadeDown .5s ease-out .2s both",letterSpacing:-.5}}>Entertainment</div>
      <div style={{fontSize:16,color:C.w(.4),fontWeight:500,animation:"fadeDown .5s ease-out .3s both"}}>Disney Movies</div>
      <div style={{marginTop:28,display:"inline-flex",gap:6,animation:"fadeDown .5s ease-out .4s both"}}>
        {[1,2,3,4,5].map(d=><div key={d} style={{width:10,height:10,borderRadius:"50%",background:d<=2?C.green:C.w(.1),boxShadow:d<=2?`0 0 8px ${C.green}`:"none"}}/>)}
        <span style={{fontSize:13,color:C.w(.4),marginLeft:8,fontWeight:500}}>Easy</span>
      </div>
    </div>
  </TVFrame>
);

// TV PLAYING
const TPlay = ({timer,aState}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:C.grad.header,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <Logo size="sm"/>
        <div style={{background:C.w(.08),borderRadius:10,padding:"5px 14px",border:`1px solid ${C.w(.06)}`,display:"flex",alignItems:"center",gap:8}}>
          <QRCode code="BR7X" size={32}/>
          <div>
            <span style={{fontSize:9,fontWeight:600,color:C.w(.4),letterSpacing:1}}>JOIN </span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
          </div>
        </div>
      </div>
      <Pts value={1000} label="Points Available" size="md"/>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"5px 12px"}}>
          <span style={{fontSize:14}}>👥</span><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{PLAYERS.length}</span>
        </div>
        <Timer sec={timer} total={45} size={48} sw={3}/>
      </div>
    </div>
    <div style={{position:"absolute",top:76,bottom:76,left:0,right:0,display:"flex",padding:"0 36px",gap:36,zIndex:5}}>
      <div style={{flex:1.2,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.w(.08),borderRadius:20,padding:"6px 16px"}}>
            <span style={{fontSize:18}}>🎬</span><span style={{fontSize:13,fontWeight:700,color:C.w(.85),textTransform:"uppercase",letterSpacing:.8}}>Entertainment</span>
          </div>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.35)}}>Q7<span style={{color:C.w(.18)}}>/15</span></span>
        </div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff",lineHeight:1.25,letterSpacing:-.5,maxWidth:520,textShadow:`0 3px 16px ${C.b(.4)}`,animation:"fadeDown .5s ease-out"}}>{QUESTION}</div>
        <div style={{height:4,borderRadius:2,background:C.w(.06),marginTop:22,maxWidth:280,overflow:"hidden"}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
        {ANSWERS.map((a,i)=><ACard key={i} label={a} letter={i+1} state={aState[i]||"default"} delay={i} tv/>)}
      </div>
    </div>
    <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:10,background:C.grad.footer,padding:"18px 36px 14px"}}>
      <div style={{display:"flex",justifyContent:"center",gap:36}}>
        {PLAYERS.slice(0,6).map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:9,animation:`slideRight .4s ease-out ${i*.07}s both`}}>
            <Av name={p.name} rank={i+1} size={30}/>
            <div><div style={{fontSize:12,fontWeight:700,color:"#fff",lineHeight:1.2}}>{p.name}</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</div></div>
          </div>
        ))}
      </div>
    </div>
  </TVFrame>
);

// TV ANSWERED (shows answer distribution)
const TAnswered = ({correct=true}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:C.grad.header,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <Logo size="sm"/>
        <div style={{background:C.w(.08),borderRadius:10,padding:"5px 14px",border:`1px solid ${C.w(.06)}`,display:"flex",alignItems:"center",gap:8}}>
          <QRCode code="BR7X" size={32}/>
          <div>
            <span style={{fontSize:9,fontWeight:600,color:C.w(.4),letterSpacing:1}}>JOIN </span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
          </div>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:C.green,animation:"pointsEarned .5s ease-out"}}>Answer Revealed!</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"5px 12px"}}>
          <span style={{fontSize:14}}>👥</span><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{PLAYERS.length}</span>
        </div>
      </div>
    </div>
    <div style={{position:"absolute",top:76,bottom:76,left:0,right:0,display:"flex",padding:"0 36px",gap:36,zIndex:5}}>
      <div style={{flex:1.2,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{fontSize:28,fontWeight:800,color:"#fff",lineHeight:1.3,letterSpacing:-.5,maxWidth:480,marginBottom:28}}>{QUESTION}</div>
        {/* Answer distribution bars */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[{a:"Frozen",pct:78,correct:true},{a:"Tangled",pct:12},{a:"Cinderella",pct:7},{a:"Snow White",pct:3}].map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,animation:`slideRight .4s ease-out ${i*.08}s both`}}>
              <span style={{fontSize:14,fontWeight:700,color:d.correct?C.green:C.w(.5),width:110,textAlign:"right"}}>{d.a}{d.correct&&" ✓"}</span>
              <div style={{flex:1,height:24,borderRadius:8,background:C.w(.06),overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",width:`${d.pct}%`,borderRadius:8,background:d.correct?C.grad.correct:`linear-gradient(90deg,${C.w(.15)},${C.w(.08)})`,animation:`barReveal .6s ease-out ${i*.1}s both`,transformOrigin:"left"}}/>
              </div>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:d.correct?C.green:C.w(.3),width:45}}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
        {ANSWERS.map((a,i)=>{
          const st=i===0?"correct":i===2?"eliminated":"default";
          return <ACard key={i} label={a} letter={i+1} state={st} delay={i} tv/>;
        })}
      </div>
    </div>
    <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:10,background:C.grad.footer,padding:"18px 36px 14px"}}>
      <div style={{display:"flex",justifyContent:"center",gap:36}}>
        {PLAYERS.slice(0,6).map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:9}}>
            <Av name={p.name} rank={i+1} size={30}/>
            <div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</div></div>
          </div>
        ))}
      </div>
    </div>
  </TVFrame>
);

// TV LEADERBOARD (between questions)
const TLeaderboard = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,padding:"28px 40px"}}>
      {/* Left: Podium */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{marginBottom:20}}><Logo size="md"/></div>
        <div style={{fontSize:13,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:24}}>After Question 7</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16}}>
          {[1,0,2].map(idx=>{
            const p=PLAYERS[idx];const r=idx+1;
            const h={0:130,1:100,2:80}[idx];
            return(
              <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
                <div style={{animation:`medalDrop .5s ease-out ${idx*.15+.3}s both`}}>
                  <Av name={p.name} rank={r} size={r===1?56:46}/>
                </div>
                <div style={{fontSize:r===1?15:13,fontWeight:700,color:"#fff",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?22:17,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
                <div style={{
                  width:r===1?90:75,height:h,marginTop:10,
                  borderRadius:"14px 14px 0 0",
                  background:r===1?`linear-gradient(180deg,${C.gold}35,${C.gold}10)`:r===2?`linear-gradient(180deg,${C.w(.12)},${C.w(.04)})`:`linear-gradient(180deg,${C.darkGold}25,${C.darkGold}08)`,
                  border:`1px solid ${r===1?`${C.gold}35`:C.w(.06)}`,borderBottom:"none",
                  display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:14,
                }}>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:r===1?C.gold:C.w(.25)}}>{r}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Full list */}
      <div style={{flex:.8,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 20px"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>Full Standings</div>
        {PLAYERS.slice(3).map((p,i)=>{
          const isYou=p.name==="Jake";const rank=i+4;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,marginBottom:2,background:isYou?`${C.blue}15`:"transparent",border:isYou?`1px solid ${C.blue}25`:"1px solid transparent",animation:`rankSlide .3s ease-out ${i*.04}s both`}}>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.w(.2),width:20,textAlign:"center"}}>{rank}</span>
              <Av name={p.name} size={28} you={isYou}/>
              <span style={{flex:1,fontSize:13,fontWeight:isYou?700:500,color:C.w(isYou?1:.7)}}>{p.name}{isYou&&<span style={{fontSize:9,color:C.blue,marginLeft:5}}>YOU</span>}</span>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
            </div>
          );
        })}
        <div style={{marginTop:16,fontSize:12,color:C.w(.25),animation:"pulse 2s infinite"}}>Next question in 5s...</div>
      </div>
    </div>
  </TVFrame>
);

// TV RESULTS
const TResults = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>
      {Array.from({length:16}).map((_,i)=><Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81","#ffe066"][i%7]} left={3+i*6} delay={i*.1} size={5+Math.random()*7}/>)}
    </div>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,padding:"28px 40px"}}>
      {/* Left: Winner */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:64,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:12}}>🏆</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",marginBottom:4}}>Game Over!</div>
        <div style={{fontSize:14,color:C.w(.4),marginBottom:28}}>15 questions • {PLAYERS.length} players</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16}}>
          {[1,0,2].map(idx=>{
            const p=PLAYERS[idx];const r=idx+1;
            return(
              <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
                <Av name={p.name} rank={r} size={r===1?60:48}/>
                <div style={{fontSize:r===1?16:13,fontWeight:700,color:"#fff",marginTop:8}}>{p.name}</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?24:18,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Full standings */}
      <div style={{flex:.75,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 16px"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>Final Standings</div>
        {PLAYERS.map((p,i)=>{
          const isYou=p.name==="Jake";
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,marginBottom:1,background:isYou?`${C.blue}15`:"transparent",animation:`rankSlide .3s ease-out ${i*.04}s both`}}>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:i<3?C.gold:C.w(.2),width:18,textAlign:"center"}}>{i+1}</span>
              <Av name={p.name} rank={i+1} size={26} you={isYou}/>
              <span style={{flex:1,fontSize:12,fontWeight:isYou?700:500,color:C.w(isYou?1:.65)}}>{p.name}</span>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  </TVFrame>
);

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
const VIEWS = [
  {key:"join",label:"📱 Join",phone:true},
  {key:"lobby",label:"🏠 Lobby",phone:true,tv:true},
  {key:"getready",label:"⏳ Get Ready",phone:true,tv:true},
  {key:"category",label:"🎬 Category",phone:true,tv:true},
  {key:"playing",label:"▶ Playing",phone:true,tv:true},
  {key:"hints",label:"💡 Hints",phone:true,tv:true},
  {key:"correct",label:"✅ Correct",phone:true,tv:true},
  {key:"wrong",label:"❌ Wrong",phone:true,tv:true},
  {key:"leaderboard",label:"📊 Leaderboard",phone:true,tv:true},
  {key:"results",label:"🏆 Results",phone:true,tv:true},
];

export default function App() {
  const [view,setView] = useState("playing");
  const [timer,setTimer] = useState(32);
  useEffect(()=>{const t=setInterval(()=>setTimer(s=>s<=0?45:s-1),1000);return()=>clearInterval(t)},[]);

  const aState = () => {
    if(view==="hints") return {2:"eliminated",3:"eliminated"};
    if(view==="correct") return {0:"correct",2:"eliminated"};
    if(view==="wrong") return {1:"wrong",0:"correct"};
    return {};
  };

  const cur = VIEWS.find(v=>v.key===view);

  const renderPhone = () => {
    switch(view){
      case "join": return <PJoin/>;
      case "lobby": return <PLobby/>;
      case "getready": return <PGetReady count={3}/>;
      case "category": return <PCategory/>;
      case "correct": return <PAnswered correct/>;
      case "wrong": return <PAnswered correct={false}/>;
      case "leaderboard": return <PLeaderboard/>;
      case "results": return <PResults/>;
      default: return <PPlay timer={timer} aState={aState()}/>;
    }
  };

  const renderTV = () => {
    switch(view){
      case "lobby": return <TLobby/>;
      case "getready": return <TGetReady count={3}/>;
      case "category": return <TCategory/>;
      case "correct": case "wrong": return <TAnswered/>;
      case "leaderboard": return <TLeaderboard/>;
      case "results": return <TResults/>;
      default: return <TPlay timer={timer} aState={aState()}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#08080c",fontFamily:"'Outfit',sans-serif"}}>
      <Styles/>
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,12,.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.w(.05)}`,padding:"12px 16px"}}>
        <div style={{maxWidth:1440,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <Logo size="sm"/>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {VIEWS.map(v=>(
              <button key={v.key} onClick={()=>setView(v.key)} style={{
                padding:"5px 10px",borderRadius:7,border:"none",
                background:view===v.key?C.grad.selected:C.w(.06),
                color:view===v.key?"#fff":C.w(.5),
                fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",
              }}>{v.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:1440,margin:"0 auto",padding:"32px 16px 60px",display:"flex",justifyContent:"center",alignItems:"flex-start",gap:36,flexWrap:"wrap"}}>
        {cur?.tv&&<div style={{animation:"popIn .4s ease-out"}}><div style={{fontSize:10,fontWeight:600,color:C.w(.2),textAlign:"center",marginBottom:8,letterSpacing:2,textTransform:"uppercase"}}>📺 Bar TV — 16:9</div>{renderTV()}</div>}
        {cur?.phone&&<div style={{animation:"popIn .4s ease-out .08s both"}}><div style={{fontSize:10,fontWeight:600,color:C.w(.2),textAlign:"center",marginBottom:8,letterSpacing:2,textTransform:"uppercase"}}>📱 Player Phone</div>{renderPhone()}</div>}
      </div>
    </div>
  );
}
