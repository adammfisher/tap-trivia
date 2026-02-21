import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAP TRIVIA v5 â€” Complete Screen Flows
// Independent TV + Phone navigation, every screen for both platforms
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    wrong: "linear-gradient(135deg, #ff4757, #ff6b81)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    header: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
    footer: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
    dark: "linear-gradient(150deg, #06060f 0%, #0e0a24 40%, #1a0f3a 100%)",
    owner: "linear-gradient(150deg, #0a0e1a 0%, #111827 40%, #1a2332 100%)",
    owner: "linear-gradient(150deg, #0a0e1a 0%, #111827 40%, #1a2332 100%)",
  },
  w: a => `rgba(255,255,255,${a})`,
  b: a => `rgba(0,0,0,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea", purple: "#764ba2", darkGold: "#f7971e",
  amber: "#f59e0b", slate: "#64748b",
  amber: "#f59e0b", emerald: "#10b981", slate: "#64748b",
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
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.05);opacity:1}}
    @keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes slideInLeft{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes slideInRight{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes barGrow{from{width:0}to{width:var(--target-width)}}
    @keyframes checkmark{0%{transform:scale(0) rotate(-45deg);opacity:0}50%{transform:scale(1.2) rotate(0deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
    @keyframes rankUp{0%{transform:translateY(8px);opacity:0;color:#00d4aa}100%{transform:translateY(0);opacity:1}}
    @keyframes rankDown{0%{transform:translateY(-8px);opacity:0;color:#ff4757}100%{transform:translateY(0);opacity:1}}
    @keyframes signageFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes priceTag{0%{transform:scale(0) rotate(-10deg);opacity:0}60%{transform:scale(1.08) rotate(2deg)}100%{transform:scale(1) rotate(0);opacity:1}}
    @keyframes neonPulse{0%,100%{filter:drop-shadow(0 0 8px rgba(245,158,11,.4))}50%{filter:drop-shadow(0 0 20px rgba(245,158,11,.7))}}
    @keyframes slideInUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes statusDot{0%,100%{box-shadow:0 0 0 0 rgba(0,212,170,.4)}50%{box-shadow:0 0 0 6px rgba(0,212,170,0)}}
    .ab{transition:all .2s cubic-bezier(.34,1.56,.64,1);cursor:pointer}
    .ab:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2)}
    .ab:active{transform:scale(.97)}
    .screen-nav{display:flex;gap:3;flex-wrap:wrap}
    .screen-btn{padding:5px 10px;border-radius:7;border:none;font-size:10px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;white-space:nowrap;transition:all .15s}
  `}</style>
);

// â”€â”€â”€ Orbs â”€â”€â”€
const Orbs = () => (
  <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(102,126,234,.12) 0%,transparent 70%)",top:"-8%",right:"8%",animation:"orb1 22s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,51,74,.1) 0%,transparent 70%)",bottom:"8%",left:"3%",animation:"orb2 28s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,170,.06) 0%,transparent 70%)",top:"45%",left:"55%",animation:"orb1 18s ease-in-out infinite reverse"}}/>
  </div>
);

// â”€â”€â”€ Timer Ring â”€â”€â”€
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

// â”€â”€â”€ Logo â”€â”€â”€
const Logo = ({size="md"}) => {
  const s = {sm:{text:17},md:{text:22},lg:{text:32},xl:{text:44}}[size];

  return (
    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:s.text,fontWeight:700,letterSpacing:-.5,lineHeight:1}}>
      <span style={{color:"#fff"}}>Tap</span><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
    </span>
  );
};

// â”€â”€â”€ Answer Card â”€â”€â”€
const ACard = ({label,letter,state="default",onClick,delay=0,tv,disabled,pct}) => {
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
      {/* Percentage bar overlay for answer reveal */}
      {pct !== undefined && (
        <div style={{
          position:"absolute",left:0,top:0,bottom:0,
          width:`${pct}%`,
          background:state==="correct"?"rgba(0,212,170,.15)":"rgba(255,255,255,.06)",
          borderRadius:tv?16:14,
          animation:"barReveal .8s ease-out both",
          transformOrigin:"left",
        }}/>
      )}
      <div style={{
        width:tv?40:32,height:tv?40:32,borderRadius:9,
        background:state==="correct"?C.green:state==="wrong"?C.red:state==="selected"?C.w(.2):state==="default"?"linear-gradient(135deg,#eef1ff,#e4d8ff)":C.w(.2),
        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:tv?16:14,
        color:state==="correct"||state==="wrong"||state==="selected"?"#fff":state==="default"?"#5b2a86":"#fff",flexShrink:0,
        position:"relative",zIndex:1,
      }}>{state==="correct"?"\u2713":state==="wrong"?"\u2717":L}</div>
      <span style={{flex:1,textAlign:"left",fontSize:tv?20:15,fontWeight:600,color:tc[state],letterSpacing:-.2,position:"relative",zIndex:1}}>{label}</span>
      {pct !== undefined && <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:tv?18:14,fontWeight:700,color:state==="correct"?C.green:tc[state],position:"relative",zIndex:1}}>{pct}%</span>}
      {state==="correct"&&!pct&&<span style={{fontSize:tv?20:16,position:"relative",zIndex:1}}>ðŸŽ‰</span>}
    </button>
  );
};

// â”€â”€â”€ Avatar â”€â”€â”€
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
      {rank&&rank<=3&&<span style={{position:"absolute",bottom:-3,right:-3,fontSize:size*.35}}>{rank===1?"ðŸ¥‡":rank===2?"ðŸ¥ˆ":"ðŸ¥‰"}</span>}
    </div>
  );
};

// â”€â”€â”€ Chat â”€â”€â”€
const Chat = ({name,msg,d=0}) => {
  const h=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{display:"flex",alignItems:"center",gap:7,animation:`chatSlide .3s ease-out ${d}s both`,padding:"2px 0"}}>
      <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,background:`hsl(${h},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700}}>{name.charAt(0)}</div>
      <span style={{fontSize:11,color:C.w(.45)}}><strong style={{color:`hsl(${h},55%,68%)`,fontWeight:600}}>{name}</strong> {msg}</span>
    </div>
  );
};

// â”€â”€â”€ Confetti â”€â”€â”€
const Confetti = ({color,left,delay,size=8}) => (
  <div style={{position:"absolute",top:-10,left:`${left}%`,width:size,height:size*1.4,background:color,borderRadius:2,animation:`confetti1 ${1.5+Math.random()}s ease-out ${delay}s forwards`,transform:`rotate(${Math.random()*360}deg)`,opacity:0,animationFillMode:"forwards"}}/>
);

// â”€â”€â”€ QR Code â”€â”€â”€
const QRCode = ({size=160}) => {
  const grid=25, cellSize=size/grid;
  const cells = useMemo(()=>{
    const r=[];
let s=48271;
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


// --- Bar Logo Placeholder ---
const BarLogo = ({size=80}) => (
  <div style={{width:size,height:size,borderRadius:size*.2,background:"linear-gradient(135deg,#2a1a4e,#3d2266)",border:`2px solid ${C.w(.1)}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2}}>
    <span style={{fontSize:size*.25,fontWeight:800,color:C.gold,fontFamily:"'Fredoka',sans-serif",lineHeight:1}}>Mo's</span>
    <span style={{fontSize:size*.12,fontWeight:600,color:C.w(.5),letterSpacing:1,textTransform:"uppercase"}}>Tavern</span>
  </div>
);

// â”€â”€â”€ Frames â”€â”€â”€
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

// â”€â”€â”€ Phone Status Bar â”€â”€â”€

const OwnerFrame = ({children}) => (
  <div style={{width:375,height:812,background:C.grad.owner,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 25px 80px rgba(0,0,0,.5),inset 0 0 0 3px rgba(255,255,255,.06)"}}>
    {children}
  </div>
);

const PhoneStatusBar = () => (
  <div style={{height:48,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{fontSize:13,fontWeight:600,color:C.w(.4)}}>9:41</span>
    <div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div>
  </div>
);

// â”€â”€â”€ Phone Header â”€â”€â”€
const PhoneHeader = ({showPlayers=true}) => (
  <div style={{padding:"2px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <Logo size="sm"/>
    {showPlayers && (
      <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 10px"}}>
        <span style={{fontSize:12}}>ðŸ‘¥</span><span style={{fontSize:12,fontWeight:700,color:"#fff"}}>14</span>
      </div>
    )}
  </div>
);

// â”€â”€â”€ Data â”€â”€â”€
const PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Jake",score:9640},{name:"Chris K",score:10875},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},
  {name:"Ryan T",score:4200},{name:"Emma L",score:3900},{name:"Josh P",score:3400},
].sort((a,b)=>b.score-a.score);
const ANSWERS = ["Frozen","Tangled","Cinderella","Snow White"];

const ANSWER_PCTS = [62, 21, 11, 6];
 // % who picked each
const Q = '"Let It Go" is the theme song of which Disney movie?';
const TOTAL_TIME = 20;
const MAX_PTS = 1000;

// â”€â”€â”€ Reusable TV QR Badge â”€â”€â”€
const TVQRBadge = ({position="bl"}) => {
  const pos = position==="br" ? {bottom:14,right:20} : {bottom:14,left:20};
  return (
    <div style={{position:"absolute",...pos,zIndex:20,display:"flex",alignItems:"center",gap:14,background:"rgba(0,0,0,.55)",backdropFilter:"blur(12px)",borderRadius:16,padding:"12px 18px 12px 14px",border:`1px solid ${C.w(.08)}`}}>
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
  );
};


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TV SCREENS (8 total)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 1. TV IDLE / ATTRACT
const TVIdle = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{animation:"breathe 4s ease-in-out infinite",marginBottom:24}}>
        <Logo size="xl"/>
      </div>
      <div style={{fontSize:20,fontWeight:600,color:C.w(.45),marginBottom:8,animation:"fadeDown .6s ease-out .2s both"}}>Live Bar Trivia</div>
      <div style={{width:60,height:3,borderRadius:2,background:C.grad.gold,marginBottom:32}}/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{background:C.w(.06),borderRadius:16,padding:"14px 28px",border:`1px solid ${C.w(.06)}`}}>
          <div style={{fontSize:16,fontWeight:700,color:"#fff",textAlign:"center"}}>Ask your bartender to start a game!</div>
        </div>
        <div style={{fontSize:14,color:C.w(.3),fontWeight:500}}>or scan to play on your phone</div>
      </div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

// 2. TV LOBBY
const TVLobby = () => (
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

// 3. TV GET READY
const TVGetReady = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <Logo size="lg"/>
      <div style={{marginTop:36,fontSize:16,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Game Starting</div>
      <div style={{marginTop:24,width:140,height:140,borderRadius:"50%",background:C.w(.06),border:`3px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"ringPulse 1.5s ease-in-out infinite"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:72,fontWeight:700,color:"#fff",animation:"countdownNum .8s ease-out",lineHeight:1}}>3</span>
      </div>
      <div style={{marginTop:28,fontSize:18,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
      <div style={{marginTop:10,fontSize:14,color:C.w(.3)}}>15 questions Â· Answer fast for more points</div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

// 4. TV CATEGORY
const TVCategory = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:500,color:C.w(.35),letterSpacing:1,marginBottom:20}}>QUESTION 7 OF 15</div>
      <div style={{fontSize:88,marginBottom:16,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 8px 20px rgba(0,0,0,.3))"}}>ðŸŽ¬</div>
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

// 5. TV PLAYING
const TVPlay = ({pts=750,timer=12,ptsColor=C.gold}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:C.grad.header,padding:"12px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <Logo size="sm"/>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:38,fontWeight:700,lineHeight:1,color:ptsColor,transition:"color .3s",filter:`drop-shadow(0 2px 8px ${ptsColor}40)`}}>{pts}</div>
        <div style={{fontSize:10,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase",marginTop:2}}>Points Available</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"5px 12px"}}><span style={{fontSize:14}}>ðŸ‘¥</span><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{PLAYERS.length}</span></div>
        <Timer sec={timer} total={TOTAL_TIME} size={48} sw={3}/>
      </div>
    </div>
    <div style={{position:"absolute",top:76,bottom:72,left:0,right:0,display:"flex",padding:"0 36px",gap:36,zIndex:5}}>
      <div style={{flex:1.2,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.w(.08),borderRadius:20,padding:"6px 16px"}}><span style={{fontSize:18}}>ðŸŽ¬</span><span style={{fontSize:13,fontWeight:700,color:C.w(.85),textTransform:"uppercase",letterSpacing:.8}}>Entertainment</span></div>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.35)}}>Q7<span style={{color:C.w(.18)}}>/15</span></span>
        </div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff",lineHeight:1.25,letterSpacing:-.5,maxWidth:520,textShadow:`0 3px 16px ${C.b(.4)}`}}>{Q}</div>
        <div style={{height:4,borderRadius:2,background:C.w(.06),marginTop:22,maxWidth:280,overflow:"hidden"}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
        {ANSWERS.map((a,i)=><ACard key={i} label={a} letter={i+1} state="default" delay={i} tv/>)}
      </div>
    </div>
    <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:10,background:C.grad.footer,padding:"16px 36px 12px"}}>
      <div style={{display:"flex",justifyContent:"flex-end",gap:32,paddingLeft:220}}>
        {PLAYERS.slice(0,5).map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:9}}><Av name={p.name} rank={i+1} size={28}/><div><div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</div></div></div>))}
      </div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

// 6. TV ANSWER REVEAL (NEW)
const TVAnswerReveal = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:C.grad.header,padding:"12px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <Logo size="sm"/>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:C.green,animation:"bounceIn .5s ease-out"}}>Answer Revealed!</div>
      <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"5px 12px"}}><span style={{fontSize:14}}>ðŸ‘¥</span><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{PLAYERS.length}</span></div>
    </div>
    <div style={{position:"absolute",top:66,bottom:0,left:0,right:0,display:"flex",padding:"16px 36px",gap:36,zIndex:5}}>
      <div style={{flex:1.2,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.w(.08),borderRadius:20,padding:"6px 16px"}}><span style={{fontSize:18}}>ðŸŽ¬</span><span style={{fontSize:13,fontWeight:700,color:C.w(.85),textTransform:"uppercase",letterSpacing:.8}}>Entertainment</span></div>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.35)}}>Q7<span style={{color:C.w(.18)}}>/15</span></span>
        </div>
        <div style={{fontSize:28,fontWeight:800,color:"#fff",lineHeight:1.25,letterSpacing:-.5,maxWidth:520,textShadow:`0 3px 16px ${C.b(.4)}`}}>{Q}</div>
        <div style={{marginTop:16,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:600,color:C.green}}>62% got it right</span>
          <span style={{fontSize:12,color:C.w(.3)}}>Â·</span>
          <span style={{fontSize:13,color:C.w(.35)}}>Avg time: 8.3s</span>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
        {ANSWERS.map((a,i)=>{
          const state = i===0?"correct":"default";
          return <ACard key={i} label={a} letter={i+1} state={state} delay={i} tv pct={ANSWER_PCTS[i]}/>;
        })}
      </div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

// 7. TV LEADERBOARD (between questions)
const TVLeaderboard = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,padding:"28px 40px"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <Logo size="md"/><div style={{fontSize:13,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginTop:8,marginBottom:24}}>After Question 7</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16}}>
          {[1,0,2].map(idx=>{const p=PLAYERS[idx];
const r=idx+1;const h={0:130,1:100,2:80}[idx];
return(
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

// 8. TV RESULTS
const TVResults = () => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>{Array.from({length:16}).map((_,i)=><Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81","#ffe066"][i%7]} left={3+i*6} delay={i*.1} size={5+Math.random()*7}/>)}</div>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,padding:"28px 40px"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:64,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:12}}>ðŸ†</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",marginBottom:4}}>Game Over!</div>
        <div style={{fontSize:14,color:C.w(.4),marginBottom:28}}>15 questions Â· {PLAYERS.length} players</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16}}>
          {[1,0,2].map(idx=>{const p=PLAYERS[idx];
const r=idx+1;return(
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

// ================================================================
// TV SCREENS — DIGITAL SIGNAGE (4 new screens)
// ================================================================

const TVSignageSpecials = () => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg, #0a0612 0%, #1a0f30 30%, #2d1550 60%, #1a0f30 100%)"}}><Orbs/></div>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}><BarLogo size={44}/><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:10,color:C.w(.35),fontWeight:500}}>Monroe, NC</div></div></div>
      <Logo size="sm"/>
    </div>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:70}}>
      <div style={{flex:1.1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:12,animation:"signageFade .5s ease-out both"}}>🍺 Today's Specials</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:44,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:20,animation:"signageFade .5s ease-out .1s both"}}>Happy Hour<br/><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>All Day Tuesday</span></div>
        <div style={{background:C.w(.06),borderRadius:20,padding:"20px 24px",border:`1px solid ${C.w(.06)}`,animation:"signageFade .5s ease-out .2s both",maxWidth:380}}>
          <div style={{fontSize:11,fontWeight:600,color:C.amber,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Featured</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:22,fontWeight:700,color:"#fff"}}>Margarita Pitcher</div><div style={{fontSize:13,color:C.w(.4),marginTop:4}}>House lime, Cointreau, fresh squeeze</div></div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:C.green,animation:"priceTag .5s ease-out .4s both"}}>$18</div></div>
        </div>
      </div>
      <div style={{flex:.9,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 36px 0 0",gap:12}}>
        {[{name:"Draft Beers",desc:"All domestics",price:"$3",icon:"🍺"},{name:"Well Drinks",desc:"Vodka, rum, whiskey",price:"$4",icon:"🍸"},{name:"Wings Basket",desc:"12 ct. buffalo or BBQ",price:"$8",icon:"🍗"},{name:"Loaded Nachos",desc:"Beef, cheese, jalapenos",price:"$10",icon:"🌮"}].map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",background:C.w(.04),borderRadius:14,border:`1px solid ${C.w(.04)}`,animation:`signageFade .4s ease-out ${.2+i*.1}s both`}}><span style={{fontSize:28}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{item.name}</div><div style={{fontSize:12,color:C.w(.4)}}>{item.desc}</div></div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:C.green}}>{item.price}</div></div>))}
      </div>
    </div>
    <TVQRBadge position="br"/>
  </TVFrame>
);

const TVSignageHappyHour = () => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg, #0f0a00 0%, #1a1000 30%, #2a1a00 50%, #1a1000 100%)"}}><div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,.1) 0%,transparent 70%)",top:"-10%",right:"5%",animation:"orb1 20s ease-in-out infinite"}}/><div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(217,119,6,.08) 0%,transparent 70%)",bottom:"5%",left:"8%",animation:"orb2 25s ease-in-out infinite"}}/></div>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:14}}><BarLogo size={44}/><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:10,color:C.w(.35)}}>Monroe, NC</div></div></div><Logo size="sm"/></div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{fontSize:14,fontWeight:700,color:C.amber,letterSpacing:3,textTransform:"uppercase",marginBottom:16,animation:"neonPulse 2s ease-in-out infinite"}}>🍹 Happy Hour</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:"#fff",lineHeight:1.1,textAlign:"center",marginBottom:8}}>4 PM – 7 PM</div>
      <div style={{fontSize:18,color:C.w(.5),fontWeight:500,marginBottom:32}}>Every weekday</div>
      <div style={{display:"flex",gap:20,animation:"signageFade .5s ease-out .2s both"}}>{[{deal:"50% OFF",item:"All Drafts",color:C.amber},{deal:"$5",item:"House Wine",color:"#e879f9"},{deal:"$6",item:"Appetizers",color:C.green}].map((d,i)=>(<div key={i} style={{background:C.w(.06),borderRadius:18,padding:"24px 28px",border:`1px solid ${C.w(.06)}`,textAlign:"center",minWidth:160,animation:`priceTag .5s ease-out ${.3+i*.12}s both`}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:d.color,marginBottom:6}}>{d.deal}</div><div style={{fontSize:14,fontWeight:600,color:C.w(.6)}}>{d.item}</div></div>))}</div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TVSignageEvent = () => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg, #06060f 0%, #0e0824 30%, #1e1050 50%, #0e0824 100%)"}}><Orbs/></div>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:14}}><BarLogo size={44}/><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:10,color:C.w(.35)}}>Monroe, NC</div></div></div><Logo size="sm"/></div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5,padding:"0 40px"}}>
      <div style={{fontSize:72,marginBottom:20,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 8px 24px rgba(0,0,0,.4))"}}>&#127911;</div>
      <div style={{fontSize:12,fontWeight:700,color:C.blue,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>This Thursday</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,color:"#fff",textAlign:"center",lineHeight:1.15,marginBottom:10}}>Trivia Night</div>
      <div style={{fontSize:18,color:C.w(.5),fontWeight:500,marginBottom:24}}>8 PM • Free to play • Prizes for top 3</div>
      <div style={{display:"flex",gap:16}}>{[{place:"1st",prize:"$50 Bar Tab",emoji:"🥇"},{place:"2nd",prize:"$25 Bar Tab",emoji:"🥈"},{place:"3rd",prize:"Free Appetizer",emoji:"🥉"}].map((p,i)=>(<div key={i} style={{background:C.w(.06),borderRadius:16,padding:"16px 22px",border:`1px solid ${C.w(.06)}`,textAlign:"center",animation:`priceTag .4s ease-out ${.3+i*.1}s both`}}><div style={{fontSize:28,marginBottom:4}}>{p.emoji}</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>{p.place}</div><div style={{fontSize:12,color:C.w(.5),marginTop:2}}>{p.prize}</div></div>))}</div>
      <div style={{marginTop:24,display:"flex",alignItems:"center",gap:8,background:C.w(.06),borderRadius:20,padding:"8px 20px"}}><span style={{fontSize:13,color:C.w(.5)}}>Download the app to play</span><span style={{fontSize:13,color:C.gold,fontWeight:700}}>taptrivia.com</span></div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TVSignageBrand = () => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg, #08060e 0%, #120e22 30%, #1e1440 50%, #120e22 100%)"}}><Orbs/></div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{animation:"breathe 5s ease-in-out infinite",marginBottom:20}}><BarLogo size={140}/></div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,color:"#fff",marginBottom:8}}>Mo's Tavern</div>
      <div style={{fontSize:16,color:C.w(.4),fontWeight:500,letterSpacing:2,textTransform:"uppercase"}}>Cold Drinks • Good Times • Live Trivia</div>
      <div style={{width:60,height:3,borderRadius:2,background:C.grad.gold,marginTop:24,marginBottom:24}}/>
      <div style={{display:"flex",gap:32}}>{[{label:"Mon-Thu",hours:"4 PM - 12 AM"},{label:"Fri-Sat",hours:"4 PM - 2 AM"},{label:"Sunday",hours:"12 PM - 10 PM"}].map((h,i)=>(<div key={i} style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:C.w(.5),marginBottom:4}}>{h.label}</div><div style={{fontSize:15,fontWeight:600,color:C.gold}}>{h.hours}</div></div>))}</div>
    </div>
    <div style={{position:"absolute",bottom:16,left:0,right:0,zIndex:10,display:"flex",justifyContent:"center"}}><div style={{display:"flex",alignItems:"center",gap:16,background:"rgba(0,0,0,.45)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 24px",border:`1px solid ${C.w(.06)}`}}><Logo size="sm"/><div style={{width:1,height:20,background:C.w(.1)}}/><span style={{fontSize:12,color:C.w(.4)}}>Powered by TapTrivia</span><div style={{width:1,height:20,background:C.w(.1)}}/><span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span></div></div>
  </TVFrame>
);



// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PHONE SCREENS (10 total)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 1. PHONE WELCOME / HOME
const PhoneWelcome = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <PhoneStatusBar/>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
        <div style={{animation:"breathe 4s ease-in-out infinite",marginBottom:20}}>
          <Logo size="lg"/>
        </div>
        <div style={{fontSize:16,color:C.w(.45),fontWeight:500,textAlign:"center",marginBottom:40}}>Live bar trivia on your phone</div>
        
        {/* Join Game Button */}
        <button className="ab" style={{width:"100%",padding:"18px 24px",borderRadius:16,border:"none",background:C.grad.selected,color:"#fff",fontSize:18,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 8px 32px rgba(102,126,234,.35)",marginBottom:14}}>
          Join a Game
        </button>
        <button className="ab" style={{width:"100%",padding:"16px 24px",borderRadius:16,border:`1px solid ${C.w(.12)}`,background:C.w(.06),color:"#fff",fontSize:16,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",marginBottom:24}}>
          How It Works
        </button>
        
        <div style={{display:"flex",gap:16,alignItems:"center",marginTop:8}}>
          <div style={{height:1,flex:1,background:C.w(.08)}}/>
          <span style={{fontSize:11,color:C.w(.25),fontWeight:600,letterSpacing:1}}>OR</span>
          <div style={{height:1,flex:1,background:C.w(.08)}}/>
        </div>
        
        <div style={{marginTop:16,fontSize:13,color:C.w(.35),textAlign:"center"}}>Scan a QR code at any participating bar</div>
      </div>
      
      {/* Bottom nav hint */}
      <div style={{padding:"16px 24px 36px",textAlign:"center"}}>
        <div style={{fontSize:11,color:C.w(.2)}}>ðŸº Find bars near you</div>
      </div>
    </div>
  </PhoneFrame>
);

// 2. PHONE JOIN (enter code)
const PhoneJoin = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <PhoneStatusBar/>
      <PhoneHeader showPlayers={false}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
        <div style={{fontSize:16,fontWeight:600,color:C.w(.45),letterSpacing:1,textTransform:"uppercase",marginBottom:20}}>Enter Game Code</div>
        
        {/* Code input display */}
        <div style={{display:"flex",gap:10,marginBottom:28}}>
          {["B","R","7","X"].map((ch,i) => (
            <div key={i} style={{
              width:58,height:68,borderRadius:14,
              background:C.w(.08),border:`2px solid ${ch ? C.blue : C.w(.1)}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",
              animation:`popIn .3s ease-out ${i*.08}s both`,
            }}>{ch}</div>
          ))}
        </div>
        
        <div style={{fontSize:13,color:C.w(.3),marginBottom:8}}>Code shown on the bar TV</div>
        
        {/* Join button */}
        <button className="ab" style={{
          width:"100%",padding:"16px",borderRadius:14,border:"none",
          background:C.grad.selected,color:"#fff",fontSize:16,fontWeight:700,
          fontFamily:"'Outfit',sans-serif",cursor:"pointer",marginTop:16,
          boxShadow:"0 6px 24px rgba(102,126,234,.3)",
        }}>
          Join Game â†’
        </button>
      </div>
      
      {/* Mock keyboard area */}
      <div style={{height:200,background:C.b(.4),borderTop:`1px solid ${C.w(.06)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:12,color:C.w(.15)}}>[ keyboard ]</span>
      </div>
    </div>
  </PhoneFrame>
);

// 3. PHONE LOBBY (waiting for game)
const PhoneLobby = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <PhoneStatusBar/>
      <PhoneHeader/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 24px"}}>
        {/* You're in! */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:8,animation:"bounceIn .5s ease-out"}}>ðŸŽ‰</div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>You're In!</div>
          <div style={{fontSize:13,color:C.w(.4),marginTop:4}}>Game code: <span style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span></div>
        </div>
        
        {/* Your name */}
        <div style={{background:C.w(.06),borderRadius:14,padding:"14px 18px",border:`1px solid ${C.w(.06)}`,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <Av name="Jake" size={40} you/>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Jake</div>
            <div style={{fontSize:11,color:C.w(.35)}}>Ready to play</div>
          </div>
          <div style={{marginLeft:"auto",width:10,height:10,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`}}/>
        </div>
        
        {/* Players list */}
        <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>{PLAYERS.length} Players Joined</div>
        <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {PLAYERS.map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",animation:`slideRight .3s ease-out ${i*.04}s both`}}>
              <Av name={p.name} size={30} you={p.name==="Jake"}/>
              <span style={{fontSize:13,fontWeight:p.name==="Jake"?700:500,color:C.w(p.name==="Jake"?1:.6)}}>{p.name}</span>
              {p.name==="Jake"&&<span style={{fontSize:9,color:C.blue,fontWeight:700,background:C.w(.06),borderRadius:6,padding:"2px 6px"}}>YOU</span>}
            </div>
          ))}
        </div>
        
        {/* Waiting */}
        <div style={{textAlign:"center",padding:"16px 0 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span style={{fontSize:14,color:C.w(.35)}}>Waiting for host to start</span>
            <div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:C.w(.4),animation:`dotPulse 1.4s ease-in-out ${i*.2}s infinite`}}/>)}</div>
          </div>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// 4. PHONE GET READY / COUNTDOWN
const PhoneCountdown = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
      <Logo size="md"/>
      <div style={{marginTop:50,fontSize:14,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Question 7 of 15</div>
      <div style={{marginTop:6,fontSize:13,color:C.w(.3)}}>ðŸŽ¬ Entertainment â€” Disney Movies</div>
      <div style={{marginTop:30,width:120,height:120,borderRadius:"50%",background:C.w(.06),border:`3px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"ringPulse 1.5s ease-in-out infinite"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:"#fff",animation:"countdownNum .6s ease-out",lineHeight:1}}>3</span>
      </div>
      <div style={{marginTop:28,fontSize:15,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
      <div style={{marginTop:8,fontSize:12,color:C.w(.3)}}>Answer fast for more points</div>
    </div>
  </PhoneFrame>
);

// 5. PHONE CATEGORY REVEAL
const PhoneCategory = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
      <PhoneStatusBar/>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:C.w(.3),letterSpacing:1,marginBottom:20}}>QUESTION 7 OF 15</div>
        <div style={{fontSize:72,marginBottom:16,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 6px 16px rgba(0,0,0,.3))"}}>ðŸŽ¬</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:6,animation:"fadeDown .5s ease-out .2s both",textAlign:"center"}}>Entertainment</div>
        <div style={{fontSize:15,color:C.w(.4),fontWeight:500,animation:"fadeDown .5s ease-out .3s both"}}>Disney Movies</div>
        <div style={{marginTop:24,display:"inline-flex",gap:5,animation:"fadeDown .5s ease-out .4s both"}}>
          {[1,2,3,4,5].map(d=><div key={d} style={{width:8,height:8,borderRadius:"50%",background:d<=2?C.green:C.w(.1),boxShadow:d<=2?`0 0 6px ${C.green}`:"none"}}/>)}
          <span style={{fontSize:12,color:C.w(.4),marginLeft:6,fontWeight:500}}>Easy</span>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// 6. PHONE PLAYING (draining points, no selection yet)
const PhonePlaying = () => {
  const pts = 750;
  const ptsPct = pts / MAX_PTS;
  const ptsColor = ptsPct > .6 ? C.green : ptsPct > .3 ? C.gold : C.red;
  return (
    <PhoneFrame><Orbs/>
      <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
        <PhoneStatusBar/>
        <PhoneHeader/>
        
        {/* Points draining */}
        <div style={{padding:"12px 24px 0",textAlign:"center"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,lineHeight:1,color:ptsColor,filter:`drop-shadow(0 2px 12px ${ptsColor}50)`,transition:"color .3s"}}>
            {pts}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>Points Available</div>
          <div style={{width:180,height:4,borderRadius:2,background:C.w(.08),margin:"8px auto 0",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${ptsPct*100}%`,borderRadius:2,background:ptsColor,transition:"width .1s linear,background .3s"}}/>
          </div>
        </div>
        
        {/* Total score pill */}
        <div style={{display:"flex",justifyContent:"center",padding:"8px 0 4px"}}>
          <div style={{background:C.w(.06),borderRadius:10,padding:"5px 14px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>9,640</span>
          </div>
        </div>
        
        {/* Timer */}
        <div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}>
          <Timer sec={12} total={TOTAL_TIME} size={58} sw={3}/>
        </div>
        
        {/* Category + Progress */}
        <div style={{padding:"0 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
              <span style={{fontSize:13}}>ðŸŽ¬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
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
          {ANSWERS.map((a,i) => (
            <ACard key={i} label={a} letter={i+1} state="default" delay={i}/>
          ))}
        </div>
        
        <div style={{background:C.grad.footer,padding:"28px 18px 32px",marginTop:"auto"}}>
          <Chat name="KatieBee" msg="Love this song! ðŸŽµ" d={0}/>
          <Chat name="TriviaNerd" msg="hurry up! â°" d={.1}/>
        </div>
      </div>
    </PhoneFrame>
  );
};

// 7. PHONE LOCKED IN (selected, waiting for reveal)
const PhoneLockedIn = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <PhoneStatusBar/>
      <PhoneHeader/>
      
      {/* Locked points */}
      <div style={{padding:"12px 24px 0",textAlign:"center"}}>
        <div style={{animation:"pointsEarned .4s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 2px 8px rgba(247,151,30,.35))"}}>
            820
          </div>
          <div style={{fontSize:11,fontWeight:600,color:C.gold,letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>
            Locked In! <span style={{color:C.w(.3)}}>/ {MAX_PTS}</span>
          </div>
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",padding:"8px 0 4px"}}>
        <div style={{background:C.w(.06),borderRadius:10,padding:"5px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>9,640</span>
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}>
        <Timer sec={8} total={TOTAL_TIME} size={58} sw={3}/>
      </div>
      
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>ðŸŽ¬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3}}>{Q}</div>
      </div>
      
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
        {ANSWERS.map((a,i) => (
          <ACard key={i} label={a} letter={i+1} state={i===0?"selected":"default"} delay={i} disabled/>
        ))}
      </div>
      
      <div style={{background:C.grad.footer,padding:"20px 18px 32px",marginTop:"auto",textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <span style={{fontSize:13,color:C.w(.4)}}>Waiting for timer</span>
          <div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:C.w(.4),animation:`dotPulse 1.4s ease-in-out ${i*.2}s infinite`}}/>)}</div>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// 8. PHONE CORRECT REVEAL
const PhoneCorrect = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",animation:"correctFlash 1s ease-out"}}>
      <PhoneStatusBar/>
      <PhoneHeader/>
      
      {/* Points earned */}
      <div style={{padding:"12px 24px 0",textAlign:"center"}}>
        <div style={{animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,lineHeight:1,color:C.green,filter:`drop-shadow(0 2px 12px rgba(0,212,170,.4))`}}>
            +820
          </div>
          <div style={{fontSize:12,fontWeight:700,color:C.green,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>
            Points Earned! <span style={{color:C.w(.3),fontWeight:500}}>/ {MAX_PTS}</span>
          </div>
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",padding:"8px 0 4px"}}>
        <div style={{background:C.w(.06),borderRadius:10,padding:"5px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>10,460</span>
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}>
        <div style={{width:58,height:58,borderRadius:"50%",background:`rgba(0,212,170,.12)`,border:`3px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:28,animation:"checkmark .5s ease-out"}}>âœ“</span>
        </div>
      </div>
      
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>ðŸŽ¬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3}}>{Q}</div>
      </div>
      
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
        {ANSWERS.map((a,i) => (
          <ACard key={i} label={a} letter={i+1} state={i===0?"correct":"default"} delay={i} disabled/>
        ))}
      </div>
      
      <div style={{background:C.grad.footer,padding:"20px 18px 32px",marginTop:"auto",textAlign:"center"}}>
        <div style={{fontSize:13,color:C.w(.35)}}>Next question in 5s...</div>
      </div>
    </div>
  </PhoneFrame>
);

// 9. PHONE WRONG REVEAL
const PhoneWrong = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",animation:"wrongFlash 1s ease-out"}}>
      <PhoneStatusBar/>
      <PhoneHeader/>
      
      <div style={{padding:"12px 24px 0",textAlign:"center"}}>
        <div style={{animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:C.red,filter:`drop-shadow(0 2px 8px rgba(255,71,87,.3))`}}>+0</div>
          <div style={{fontSize:12,fontWeight:700,color:C.red,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Wrong Answer</div>
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",padding:"8px 0 4px"}}>
        <div style={{background:C.w(.06),borderRadius:10,padding:"5px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>9,640</span>
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}>
        <div style={{width:58,height:58,borderRadius:"50%",background:`rgba(255,71,87,.12)`,border:`3px solid ${C.red}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:28,color:C.red}}>âœ—</span>
        </div>
      </div>
      
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>ðŸŽ¬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3}}>{Q}</div>
      </div>
      
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
        {ANSWERS.map((a,i) => {
          const state = i===0?"correct":i===1?"wrong":"default";
          return <ACard key={i} label={a} letter={i+1} state={state} delay={i} disabled/>;
        })}
      </div>
      
      <div style={{background:C.grad.footer,padding:"20px 18px 32px",marginTop:"auto",textAlign:"center"}}>
        <div style={{fontSize:13,color:C.w(.35)}}>The answer was <span style={{color:C.green,fontWeight:700}}>Frozen</span></div>
      </div>
    </div>
  </PhoneFrame>
);

// 10. PHONE BETWEEN QUESTIONS (rank update)
const PhoneBetween = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <PhoneStatusBar/>
      <PhoneHeader/>
      
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"16px 24px"}}>
        {/* Your result summary */}
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px 20px",border:`1px solid ${C.w(.06)}`,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:600,color:C.w(.35),letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>After Question 7</div>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:20}}>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:C.gold}}>10,460</div>
              <div style={{fontSize:11,color:C.w(.35)}}>Your Score</div>
            </div>
            <div style={{width:1,height:40,background:C.w(.08)}}/>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:"#fff"}}>3rd</div>
              <div style={{fontSize:11,color:C.green}}>â–² Up 2 spots</div>
            </div>
          </div>
        </div>
        
        {/* Stats row */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <div style={{flex:1,background:C.w(.06),borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.green}}>5</div>
            <div style={{fontSize:10,color:C.w(.3)}}>Correct</div>
          </div>
          <div style={{flex:1,background:C.w(.06),borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.red}}>1</div>
            <div style={{fontSize:10,color:C.w(.3)}}>Wrong</div>
          </div>
          <div style={{flex:1,background:C.w(.06),borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.gold}}>ðŸ”¥ 3</div>
            <div style={{fontSize:10,color:C.w(.3)}}>Streak</div>
          </div>
        </div>
        
        {/* Mini leaderboard */}
        <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>Leaderboard</div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {PLAYERS.slice(0,8).map((p,i)=>{
            const isYou = p.name==="Jake";
            const movement = isYou ? 2 : i===0 ? 0 : i%3===0 ? -1 : i%2===0 ? 1 : 0;
            return (
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
                background:isYou?C.w(.08):"transparent",borderRadius:10,
                border:isYou?`1px solid ${C.w(.08)}`:"1px solid transparent",
                animation:`rankSlide .3s ease-out ${i*.04}s both`,
              }}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:i<3?C.gold:C.w(.25),width:18,textAlign:"center"}}>{i+1}</span>
                <Av name={p.name} rank={i+1} size={28} you={isYou}/>
                <span style={{flex:1,fontSize:13,fontWeight:isYou?700:500,color:C.w(isYou?1:.65)}}>{p.name}{isYou&&<span style={{fontSize:8,color:C.blue,marginLeft:4}}>YOU</span>}</span>
                {movement!==0 && <span style={{fontSize:11,fontWeight:700,color:movement>0?C.green:C.red}}>{movement>0?`â–²${movement}`:`â–¼${Math.abs(movement)}`}</span>}
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        
        <div style={{textAlign:"center",padding:"12px 0 20px"}}>
          <div style={{fontSize:12,color:C.w(.25),animation:"pulse 2s infinite"}}>Next question in 5s...</div>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// 11. PHONE FINAL RESULTS
const PhoneResults = () => (
  <PhoneFrame><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>{Array.from({length:12}).map((_,i)=><Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81"][i%6]} left={5+i*8} delay={i*.12} size={4+Math.random()*5}/>)}</div>
    <div style={{position:"relative",zIndex:7,height:"100%",display:"flex",flexDirection:"column"}}>
      <PhoneStatusBar/>
      <PhoneHeader showPlayers={false}/>
      
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"8px 24px",overflow:"auto"}}>
        {/* Trophy + headline */}
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:48,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:6}}>ðŸ†</div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>Game Over!</div>
          <div style={{fontSize:12,color:C.w(.35),marginTop:4}}>15 questions Â· {PLAYERS.length} players</div>
        </div>
        
        {/* Your score card */}
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px 20px",border:`1px solid ${C.w(.08)}`,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <Av name="Jake" rank={3} size={44} you/>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Jake â€” 3rd Place</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:C.gold}}>10,460</div>
            </div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.green}}>11</div>
              <div style={{fontSize:10,color:C.w(.35)}}>Correct</div>
            </div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.red}}>3</div>
              <div style={{fontSize:10,color:C.w(.35)}}>Wrong</div>
            </div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.w(.4)}}>1</div>
              <div style={{fontSize:10,color:C.w(.35)}}>Timeout</div>
            </div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.gold}}>ðŸ”¥ 5</div>
              <div style={{fontSize:10,color:C.w(.35)}}>Best Streak</div>
            </div>
          </div>
        </div>
        
        {/* Final standings */}
        <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Final Standings</div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {PLAYERS.slice(0,10).map((p,i)=>{
            const isYou = p.name==="Jake";
            return (
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                background:isYou?C.w(.08):"transparent",borderRadius:8,
                animation:`rankSlide .3s ease-out ${i*.04}s both`,
              }}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:i<3?C.gold:C.w(.2),width:16,textAlign:"center"}}>{i+1}</span>
                <Av name={p.name} rank={i+1} size={24} you={isYou}/>
                <span style={{flex:1,fontSize:12,fontWeight:isYou?700:500,color:C.w(isYou?1:.6)}}>{p.name}</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        
        {/* Play again */}
        <div style={{padding:"16px 0 24px",textAlign:"center"}}>
          <button className="ab" style={{padding:"14px 40px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 6px 24px rgba(102,126,234,.3)"}}>
            Play Again ðŸ”„
          </button>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// ================================================================
// BAR OWNER SCREENS (5 total — NEW in v6)  
// ================================================================

const OwnerHeader = ({title}) => (<div style={{padding:"14px 24px 0"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><BarLogo size={36}/><div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:10,color:C.w(.3)}}>BR7X</div></div></div><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:C.green,animation:"statusDot 2s ease-in-out infinite"}}/><span style={{fontSize:10,fontWeight:600,color:C.green}}>LIVE</span></div></div>{title&&<div style={{fontSize:11,fontWeight:600,color:C.w(.25),letterSpacing:1.5,textTransform:"uppercase",marginTop:14}}>{title}</div>}</div>);

const Toggle = ({on,label}) => (<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}><span style={{fontSize:13,fontWeight:500,color:C.w(.7)}}>{label}</span><div style={{width:44,height:24,borderRadius:12,background:on?C.green:C.w(.15),position:"relative",cursor:"pointer"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:on?22:2,boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/></div></div>);

const OwnerNav = ({active}) => (<div style={{padding:"8px 20px 32px",display:"flex",justifyContent:"space-around",borderTop:`1px solid ${C.w(.06)}`}}>{[{icon:"🏠",label:"Home",k:"home"},{icon:"📺",label:"Signage",k:"signage"},{icon:"🎮",label:"Game",k:"game"},{icon:"📈",label:"Stats",k:"stats"},{icon:"⚙️",label:"Settings",k:"settings"}].map((n,i)=>(<div key={i} style={{textAlign:"center",cursor:"pointer",opacity:n.k===active?1:.4}}><div style={{fontSize:18}}>{n.icon}</div><div style={{fontSize:9,fontWeight:600,color:n.k===active?C.blue:C.w(.5),marginTop:2}}>{n.label}</div></div>))}</div>);

const OwnerHome = () => (<OwnerFrame><div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}><PhoneStatusBar/><OwnerHeader/><div style={{flex:1,padding:"16px 20px",overflow:"auto",display:"flex",flexDirection:"column",gap:12}}><div style={{background:"linear-gradient(135deg,rgba(102,126,234,.12),rgba(118,75,162,.08))",borderRadius:16,padding:"18px 20px",border:`1px solid ${C.w(.06)}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Current Status</div><div style={{background:C.w(.06),borderRadius:8,padding:"3px 10px",fontSize:10,fontWeight:600,color:C.amber}}>Signage Mode</div></div><div style={{display:"flex",gap:16}}><div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff"}}>0</div><div style={{fontSize:10,color:C.w(.35)}}>Players</div></div><div style={{width:1,background:C.w(.06)}}/><div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:C.green}}>3</div><div style={{fontSize:10,color:C.w(.35)}}>Slides</div></div><div style={{width:1,background:C.w(.06)}}/><div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:C.amber}}>15s</div><div style={{fontSize:10,color:C.w(.35)}}>Rotate</div></div></div></div><div style={{fontSize:11,fontWeight:600,color:C.w(.25),letterSpacing:1.5,textTransform:"uppercase",marginTop:4}}>Quick Actions</div><button className="ab" style={{width:"100%",padding:"18px 20px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 6px 24px rgba(102,126,234,.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>▶ Start Trivia Game</button><div style={{display:"flex",gap:10}}><button className="ab" style={{flex:1,padding:"16px 12px",borderRadius:14,border:`1px solid ${C.w(.08)}`,background:C.w(.04),color:"#fff",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:22,marginBottom:4}}>📺</div>Edit Signage</button><button className="ab" style={{flex:1,padding:"16px 12px",borderRadius:14,border:`1px solid ${C.w(.08)}`,background:C.w(.04),color:"#fff",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:22,marginBottom:4}}>📈</div>View Stats</button></div><div style={{fontSize:11,fontWeight:600,color:C.w(.25),letterSpacing:1.5,textTransform:"uppercase",marginTop:4}}>Tonight's Schedule</div>{[{time:"4:00 PM",event:"Happy Hour Signage",status:"active",color:C.green},{time:"7:00 PM",event:"Specials + Branding",status:"scheduled",color:C.amber},{time:"8:00 PM",event:"Trivia Night",status:"scheduled",color:C.blue},{time:"10:00 PM",event:"Late Night Signage",status:"scheduled",color:C.slate}].map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.w(.03),borderRadius:10,border:`1px solid ${C.w(.04)}`,animation:`slideInUp .3s ease-out ${i*.06}s both`}}><div style={{width:6,height:6,borderRadius:"50%",background:item.color,boxShadow:item.status==="active"?`0 0 8px ${item.color}`:"none"}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.w(.4),fontWeight:500,width:55}}>{item.time}</span><span style={{flex:1,fontSize:13,fontWeight:500,color:C.w(.7)}}>{item.event}</span><span style={{fontSize:9,fontWeight:600,color:item.color,textTransform:"uppercase",letterSpacing:1}}>{item.status}</span></div>))}</div><OwnerNav active="home"/></div></OwnerFrame>);

const OwnerSignage = () => (<OwnerFrame><div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}><PhoneStatusBar/><OwnerHeader title="Signage Manager"/><div style={{flex:1,padding:"12px 20px",overflow:"auto",display:"flex",flexDirection:"column",gap:12}}><div style={{background:C.w(.04),borderRadius:14,padding:"14px 16px",border:`1px solid ${C.w(.06)}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:13,fontWeight:600,color:"#fff"}}>Auto-Rotate Slides</span><Toggle on={true} label=""/></div><div style={{display:"flex",gap:6}}>{["10s","15s","30s","60s"].map((t,i)=>(<div key={i} style={{flex:1,padding:"8px",borderRadius:8,background:t==="15s"?C.blue:C.w(.06),textAlign:"center",fontSize:11,fontWeight:600,color:t==="15s"?"#fff":C.w(.4),cursor:"pointer"}}>{t}</div>))}</div></div>{[{name:"Daily Specials",desc:"Drink & food deals",icon:"🍺",on:true,preview:"Margarita Pitcher $18, Draft Beers $3..."},{name:"Happy Hour",desc:"Time-based promotion",icon:"🍹",on:true,preview:"4-7 PM, 50% off drafts..."},{name:"Event Promo",desc:"Upcoming events",icon:"🎧",on:true,preview:"Trivia Night Thursday 8 PM..."},{name:"Bar Branding",desc:"Logo + hours",icon:"🏛️",on:true,preview:"Mo's Tavern, Monroe NC..."},{name:"Custom Message",desc:"Free-form text",icon:"💬",on:false,preview:"Not configured"}].map((slide,i)=>(<div key={i} style={{background:C.w(.04),borderRadius:14,padding:"14px 16px",border:`1px solid ${slide.on?C.w(.08):C.w(.04)}`,animation:`slideInUp .3s ease-out ${i*.05}s both`}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><span style={{fontSize:24}}>{slide.icon}</span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{slide.name}</div><div style={{fontSize:11,color:C.w(.35)}}>{slide.desc}</div></div><div style={{width:44,height:24,borderRadius:12,background:slide.on?C.green:C.w(.15),position:"relative",cursor:"pointer"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:slide.on?22:2,boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/></div></div><div style={{fontSize:11,color:C.w(.3),padding:"6px 10px",background:C.w(.03),borderRadius:8}}>{slide.preview}</div>{slide.on&&<button style={{marginTop:8,width:"100%",padding:"8px",borderRadius:8,border:`1px solid ${C.w(.08)}`,background:"transparent",color:C.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Edit Content →</button>}</div>))}</div><OwnerNav active="signage"/></div></OwnerFrame>);

const OwnerGameControl = () => (<OwnerFrame><div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}><PhoneStatusBar/><OwnerHeader title="Game Control"/><div style={{flex:1,padding:"12px 20px",overflow:"auto",display:"flex",flexDirection:"column",gap:12}}><div style={{background:"linear-gradient(135deg,rgba(0,212,170,.08),rgba(0,212,170,.03))",borderRadius:16,padding:"20px",border:"1px solid rgba(0,212,170,.15)",textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>⚡ Game in Progress</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:42,fontWeight:700,color:"#fff",lineHeight:1}}>Q7 / 15</div><div style={{fontSize:13,color:C.w(.4),marginTop:6}}>Entertainment — Disney Movies</div><div style={{display:"flex",justifyContent:"center",gap:20,marginTop:16}}><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:C.gold}}>{PLAYERS.length}</div><div style={{fontSize:10,color:C.w(.35)}}>Players</div></div><div style={{width:1,background:C.w(.08)}}/><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:C.green}}>62%</div><div style={{fontSize:10,color:C.w(.35)}}>Correct</div></div><div style={{width:1,background:C.w(.08)}}/><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>8.3s</div><div style={{fontSize:10,color:C.w(.35)}}>Avg Time</div></div></div></div><div style={{display:"flex",gap:10}}><button className="ab" style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:C.grad.wrong,color:"#fff",fontSize:14,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>⏹ End Game</button><button className="ab" style={{flex:1,padding:"14px",borderRadius:12,border:`1px solid ${C.w(.12)}`,background:C.w(.06),color:"#fff",fontSize:14,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>⏩ Skip</button></div><div style={{fontSize:11,fontWeight:600,color:C.w(.25),letterSpacing:1.5,textTransform:"uppercase",marginTop:4}}>Game Settings</div><div style={{background:C.w(.04),borderRadius:14,padding:"14px 16px",border:`1px solid ${C.w(.06)}`,display:"flex",flexDirection:"column",gap:2}}><Toggle on={true} label="Show QR code on TV"/><div style={{height:1,background:C.w(.04)}}/><Toggle on={true} label="Auto-advance questions"/><div style={{height:1,background:C.w(.04)}}/><Toggle on={false} label="Allow late joiners"/><div style={{height:1,background:C.w(.04)}}/><Toggle on={true} label="Leaderboard between Qs"/></div><div style={{background:C.w(.04),borderRadius:14,padding:"14px 16px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:10}}>Question Timer</div><div style={{display:"flex",gap:6}}>{["15s","20s","30s","45s"].map((t,i)=>(<div key={i} style={{flex:1,padding:"10px",borderRadius:8,background:t==="20s"?C.blue:C.w(.06),textAlign:"center",fontSize:13,fontWeight:600,color:t==="20s"?"#fff":C.w(.4),cursor:"pointer"}}>{t}</div>))}</div></div><div style={{background:C.w(.04),borderRadius:14,padding:"14px 16px",border:`1px solid ${C.w(.06)}`,display:"flex",flexDirection:"column",gap:2}}><Toggle on={true} label="Return to signage after"/><div style={{height:1,background:C.w(.04)}}/><Toggle on={false} label="Auto-start next game"/></div></div><OwnerNav active="game"/></div></OwnerFrame>);

const OwnerStats = () => (<OwnerFrame><div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}><PhoneStatusBar/><OwnerHeader title="Analytics"/><div style={{flex:1,padding:"12px 20px",overflow:"auto",display:"flex",flexDirection:"column",gap:12}}><div style={{display:"flex",gap:4,background:C.w(.04),borderRadius:10,padding:3}}>{["Today","Week","Month","All"].map((p,i)=>(<div key={i} style={{flex:1,padding:"8px 4px",borderRadius:8,background:i===1?C.blue:"transparent",textAlign:"center",fontSize:11,fontWeight:600,color:i===1?"#fff":C.w(.4),cursor:"pointer"}}>{p}</div>))}</div><div style={{display:"flex",gap:8}}>{[{v:"47",l:"Players",c:C.blue,t:"+12%"},{v:"4",l:"Games",c:C.green,t:"+2"},{v:"23m",l:"Avg Session",c:C.amber,t:"+4m"}].map((s,i)=>(<div key={i} style={{flex:1,background:C.w(.04),borderRadius:14,padding:"14px 10px",textAlign:"center",border:`1px solid ${C.w(.04)}`}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:C.w(.35),marginTop:2}}>{s.l}</div><div style={{fontSize:10,fontWeight:600,color:C.green,marginTop:4}}>{s.t}</div></div>))}</div><div style={{background:C.w(.04),borderRadius:14,padding:"16px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:12}}>Players Per Game</div><div style={{display:"flex",alignItems:"flex-end",gap:8,height:100}}>{[8,12,15,11,18,14,22].map((v,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:9,fontWeight:600,color:C.w(.4)}}>{v}</span><div style={{width:"100%",height:`${(v/22)*80}px`,borderRadius:"6px 6px 0 0",background:v>=15?`linear-gradient(180deg,${C.green},${C.green}80)`:`linear-gradient(180deg,${C.blue},${C.blue}80)`,animation:`slideUp .4s ease-out ${i*.06}s both`}}/></div>))}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>{["M","T","W","T","F","S","S"].map((d,i)=><span key={i} style={{fontSize:9,color:C.w(.2)}}>{d}</span>)}</div><div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:C.green}}/><span style={{fontSize:10,color:C.w(.35)}}>15+ (target met)</span></div></div><div style={{background:C.w(.04),borderRadius:14,padding:"16px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:10}}>Peak Hours</div>{[{time:"8-9 PM",pct:92,label:"Trivia prime"},{time:"9-10 PM",pct:78,label:"Post-game"},{time:"7-8 PM",pct:55,label:"Pre-game"}].map((t,i)=>(<div key={i} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,fontWeight:600,color:C.w(.6)}}>{t.time}</span><span style={{fontSize:10,color:C.w(.3)}}>{t.label}</span></div><div style={{height:6,borderRadius:3,background:C.w(.06),overflow:"hidden"}}><div style={{height:"100%",width:`${t.pct}%`,borderRadius:3,background:t.pct>80?C.green:t.pct>60?C.amber:C.blue,animation:`barReveal .6s ease-out ${i*.1}s both`,transformOrigin:"left"}}/></div></div>))}</div></div><OwnerNav active="stats"/></div></OwnerFrame>);

const OwnerSettings = () => (<OwnerFrame><div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}><PhoneStatusBar/><OwnerHeader title="Bar Settings"/><div style={{flex:1,padding:"12px 20px",overflow:"auto",display:"flex",flexDirection:"column",gap:12}}><div style={{background:C.w(.04),borderRadius:14,padding:"20px",border:`1px solid ${C.w(.06)}`,display:"flex",alignItems:"center",gap:16}}><BarLogo size={64}/><div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:12,color:C.w(.35),marginTop:2}}>Monroe, NC</div><button style={{marginTop:8,padding:"5px 12px",borderRadius:8,border:`1px solid ${C.w(.1)}`,background:"transparent",color:C.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Change Logo</button></div></div><div style={{background:C.w(.04),borderRadius:14,padding:"16px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Your Bar Code</div><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:C.gold,letterSpacing:4}}>BR7X</div><div style={{flex:1,fontSize:11,color:C.w(.3)}}>Permanent code on TV for patrons.</div></div></div><div style={{background:C.w(.04),borderRadius:14,padding:"16px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:10}}>Connected TVs</div><div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.w(.04),borderRadius:10}}><div style={{width:8,height:8,borderRadius:"50%",background:C.green,animation:"statusDot 2s ease-in-out infinite"}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#fff"}}>Main Bar TV</div><div style={{fontSize:10,color:C.w(.3)}}>Fire Stick • 14d ago</div></div><span style={{fontSize:10,fontWeight:600,color:C.green}}>Online</span></div></div><div style={{background:C.w(.04),borderRadius:14,padding:"16px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:6}}>Account</div>{[{l:"Email",v:"mo@mostavern.com"},{l:"Auth",v:"Email OTP"},{l:"Trusted",v:"This device",c:C.green}].map((r,i)=>(<div key={i}><div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}><span style={{fontSize:12,color:C.w(.5)}}>{r.l}</span><span style={{fontSize:12,color:r.c||C.w(.7)}}>{r.v}</span></div>{i<2&&<div style={{height:1,background:C.w(.04)}}/>}</div>))}</div><button style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${C.w(.08)}`,background:"transparent",color:C.w(.5),fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Contact Support</button></div><OwnerNav active="settings"/></div></OwnerFrame>);



// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCREEN DEFINITIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const TV_SCREENS = [
  {key:"idle",label:"ðŸ’¤ Idle",desc:"No game active"},
  {key:"lobby",label:"ðŸ  Lobby",desc:"Players joining"},
  {key:"getready",label:"â³ Get Ready",desc:"Countdown to start"},
  {key:"category",label:"ðŸŽ¬ Category",desc:"Category reveal"},
  {key:"playing",label:"â–¶ Playing",desc:"Question + answers"},
  {key:"reveal",label:"ðŸ“Š Reveal",desc:"Answer + percentages"},
  {key:"leaderboard",label:"ðŸ… Leaderboard",desc:"Between questions"},
  {key:"results",label:"ðŸ† Results",desc:"Game over"},,
  {key:"sep1",label:"|",desc:"",sep:true},
  {key:"signage-specials",label:"🍺 Specials",desc:"Daily specials signage"},
  {key:"signage-happyhour",label:"🍹 Happy Hour",desc:"Happy hour promo"},
  {key:"signage-event",label:"🎧 Event",desc:"Event promo signage"},
  {key:"signage-brand",label:"🏛️ Brand",desc:"Bar branding + hours"},
]


const PHONE_SCREENS = [
  {key:"welcome",label:"ðŸ  Home",desc:"App launch"},
  {key:"join",label:"ðŸ”‘ Join",desc:"Enter code"},
  {key:"lobby",label:"â³ Lobby",desc:"Waiting for start"},
  {key:"countdown",label:"3ï¸âƒ£ Countdown",desc:"Get ready"},
  {key:"category",label:"ðŸŽ¬ Category",desc:"Category reveal"},
  {key:"playing",label:"â–¶ Playing",desc:"Tap to answer"},
  {key:"locked",label:"ðŸ”’ Locked In",desc:"Waiting for reveal"},
  {key:"correct",label:"âœ… Correct",desc:"Points earned"},
  {key:"wrong",label:"âŒ Wrong",desc:"Wrong answer"},
  {key:"between",label:"ðŸ“Š Standings",desc:"Rank update"},
  {key:"results",label:"ðŸ† Results",desc:"Game over"},
];


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const OWNER_SCREENS = [
  {key:"home",label:"🏠 Dashboard",desc:"Overview + quick actions"},
  {key:"signage",label:"📺 Signage",desc:"Manage TV signage slides"},
  {key:"game",label:"🎮 Game",desc:"Live game control"},
  {key:"stats",label:"📈 Stats",desc:"Analytics + insights"},
  {key:"settings",label:"⚙️ Settings",desc:"Bar config"},
];

// MAIN APP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function App() {
  const [tvScreen, setTvScreen] = useState("playing");
  const [phoneScreen, setPhoneScreen] = useState("playing");
  const [ownerScreen, setOwnerScreen] = useState("home");

  const renderTV = () => {
    switch(tvScreen){
      case "idle": return <TVIdle/>;
      case "lobby": return <TVLobby/>;
      case "getready": return <TVGetReady/>;
      case "category": return <TVCategory/>;
      case "reveal": return <TVAnswerReveal/>;
      case "leaderboard": return <TVLeaderboard/>;
      case "results": return <TVResults/>;
      case "signage-specials": return <TVSignageSpecials/>;
      case "signage-happyhour": return <TVSignageHappyHour/>;
      case "signage-event": return <TVSignageEvent/>;
      case "signage-brand": return <TVSignageBrand/>;
      default: return <TVPlay/>;
    }
  };

  const renderPhone = () => {
    switch(phoneScreen){
      case "welcome": return <PhoneWelcome/>;
      case "join": return <PhoneJoin/>;
      case "lobby": return <PhoneLobby/>;
      case "countdown": return <PhoneCountdown/>;
      case "category": return <PhoneCategory/>;
      case "locked": return <PhoneLockedIn/>;
      case "correct": return <PhoneCorrect/>;
      case "wrong": return <PhoneWrong/>;
      case "between": return <PhoneBetween/>;
      case "results": return <PhoneResults/>;
      default: return <PhonePlaying/>;
    }
  };

  const renderOwner = () => {
    switch(ownerScreen){
      case "signage": return <OwnerSignage/>;
      case "game": return <OwnerGameControl/>;
      case "stats": return <OwnerStats/>;
      case "settings": return <OwnerSettings/>;
      default: return <OwnerHome/>;
    }
  };

  const ScreenNav = ({screens, current, onChange, label}) => {
    const valid = screens.filter(s=>!s.sep);
    return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <span style={{fontSize:10,fontWeight:600,color:C.w(.25),letterSpacing:1}}>{label}:</span>
        <span style={{fontSize:10,color:C.w(.15)}}>({valid.findIndex(s=>s.key===current)+1}/{valid.length})</span>
        {/* Prev/Next arrows */}
        <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
          <button onClick={()=>{const idx=valid.findIndex(s=>s.key===current);onChange(valid[(idx-1+valid.length)%valid.length].key)}} style={{width:24,height:24,borderRadius:6,border:`1px solid ${C.w(.1)}`,background:C.w(.04),color:C.w(.5),fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>â†</button>
          <button onClick={()=>{const idx=valid.findIndex(s=>s.key===current);onChange(valid[(idx+1)%valid.length].key)}} style={{width:24,height:24,borderRadius:6,border:`1px solid ${C.w(.1)}`,background:C.w(.04),color:C.w(.5),fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>â†’</button>
        </div>
      </div>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
        {screens.map((s,idx)=> s.sep ? (
          <div key={idx} style={{display:"flex",alignItems:"center",padding:"0 4px"}}><div style={{width:1,height:16,background:C.w(.1)}}/></div>
        ) : (
          <button key={s.key} onClick={()=>onChange(s.key)} title={s.desc} style={{
            padding:"5px 10px",borderRadius:7,border:"none",
            background:current===s.key?C.grad.selected:C.w(.06),
            color:current===s.key?"#fff":C.w(.5),
            fontSize:10,fontWeight:600,cursor:"pointer",
            fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",
            transition:"all .15s",
          }}>{s.label}</button>
        )))}
      </div>
      {/* Current screen description */}
      <div style={{marginTop:4,fontSize:10,color:C.w(.2)}}>
        {screens.find(s=>s.key===current)?.desc}
      </div>
    </div>
  );};};

  return (
    <div style={{minHeight:"100vh",background:"#08080c",fontFamily:"'Outfit',sans-serif"}}>
      <Styles/>
      {/* Nav Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,12,.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.w(.05)}`,padding:"10px 16px"}}>
        <div style={{maxWidth:1800,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Logo size="sm"/>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1,background:C.w(.06),borderRadius:6,padding:"3px 8px"}}>v5</span>
          </div>
          <div style={{fontSize:10,color:C.w(.2)}}>
            ðŸ“º {TV_SCREENS.filter(s=>!s.sep).length} TV Â· ðŸ“± {PHONE_SCREENS.length} Phone · 👤 {OWNER_SCREENS.length} Owner
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{maxWidth:1800,margin:"0 auto",padding:"16px 16px 0"}}>
        <div style={{display:"flex",gap:40,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:500}}>
            <ScreenNav screens={TV_SCREENS} current={tvScreen} onChange={setTvScreen} label="ðŸ“º TV SCREEN"/>
          </div>
          <div style={{flex:0,minWidth:375}}>
            <ScreenNav screens={PHONE_SCREENS} current={phoneScreen} onChange={setPhoneScreen} label="ðŸ“± PHONE SCREEN"/>
          </div>
        </div>
      </div>

      {/* Devices */}
      <div style={{maxWidth:1800,margin:"0 auto",padding:"12px 16px 60px"}}>
        <div style={{display:"flex",justifyContent:"center",alignItems:"flex-start",gap:36,flexWrap:"wrap"}}>
          <div key={tvScreen} style={{animation:"popIn .35s ease-out"}}>{renderTV()}</div>
          <div key={phoneScreen} style={{animation:"popIn .35s ease-out"}}>{renderPhone()}</div>
          <div key={ownerScreen} style={{animation:"popIn .35s ease-out"}}>{renderOwner()}</div>
        </div>
      </div>
    </div>
  );
}
