import { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// TAP TRIVIA — React Native Mobile App Mockup
// All 14 screens from the spec, interactive navigation
// ═══════════════════════════════════════════════════════════════

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    wrong: "linear-gradient(135deg, #ff4757, #ff6b81)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    dark: "linear-gradient(150deg, #06060f 0%, #0e0a24 40%, #1a0f3a 100%)",
    footer: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
  },
  w: a => `rgba(255,255,255,${a})`,
  b: a => `rgba(0,0,0,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea", purple: "#764ba2",
};

const S = () => (
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
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.05);opacity:1}}
    @keyframes dotPulse{0%,100%{opacity:.3}50%{opacity:1}}
    @keyframes confetti1{0%{transform:translateY(0)rotate(0);opacity:1}100%{transform:translateY(140px)rotate(720deg);opacity:0}}
    @keyframes trophy{0%{transform:scale(0)rotate(-30deg)}50%{transform:scale(1.2)rotate(5deg)}100%{transform:scale(1)rotate(0)}}
    @keyframes rankSlide{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes pointsEarned{0%{transform:scale(0.5);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
    @keyframes countdownNum{0%{transform:scale(2);opacity:0}30%{transform:scale(0.9);opacity:1}50%{transform:scale(1)}100%{transform:scale(1);opacity:1}}
    @keyframes ringPulse{0%,100%{box-shadow:0 0 0 0 rgba(102,126,234,.4)}50%{box-shadow:0 0 0 12px rgba(102,126,234,0)}}
    @keyframes categoryZoom{0%{transform:scale(.5);opacity:0}50%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes glowPulse{0%,100%{box-shadow:0 0 15px rgba(102,126,234,.25)}50%{box-shadow:0 0 30px rgba(102,126,234,.5)}}
    @keyframes correctFlash{0%{background:rgba(0,212,170,0)}30%{background:rgba(0,212,170,.08)}100%{background:rgba(0,212,170,0)}}
    @keyframes wrongFlash{0%{background:rgba(255,71,87,0)}30%{background:rgba(255,71,87,.08)}100%{background:rgba(255,71,87,0)}}
    @keyframes checkmark{0%{transform:scale(0) rotate(-45deg);opacity:0}50%{transform:scale(1.2) rotate(0deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
    @keyframes slideRight{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes orb1{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(50px,-30px)scale(1.15)}66%{transform:translate(-25px,25px)scale(.9)}}
    @keyframes orb2{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-35px,45px)scale(.85)}66%{transform:translate(35px,-25px)scale(1.1)}}
    .ab{transition:all .2s cubic-bezier(.34,1.56,.64,1);cursor:pointer}
    .ab:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2)}
    .ab:active{transform:scale(.97)}
    body{background:#08080c;overflow-x:hidden}
  `}</style>
);

// ─── Shared Components ───
const Orbs = () => (
  <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(102,126,234,.12) 0%,transparent 70%)",top:"-5%",right:"5%",animation:"orb1 22s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,51,74,.1) 0%,transparent 70%)",bottom:"10%",left:"3%",animation:"orb2 28s ease-in-out infinite"}}/>
  </div>
);

const Phone = ({children}) => (
  <div style={{width:375,height:812,background:C.grad.main,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 25px 80px rgba(0,0,0,.5),inset 0 0 0 3px rgba(255,255,255,.08)",flexShrink:0}}>
    {children}
  </div>
);

const StatusBar = () => (
  <div style={{height:48,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{fontSize:13,fontWeight:600,color:C.w(.4)}}>9:41</span>
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <div style={{display:"flex",gap:1}}>{[4,3,2,1].map((h,i)=><div key={i} style={{width:3,height:4+h*2,borderRadius:1,background:C.w(.3)}}/>)}</div>
      <div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div>
    </div>
  </div>
);

const Header = ({showPlayers=true, showBack=false, onBack}) => (
  <div style={{padding:"2px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      {showBack && <button onClick={onBack} style={{background:"none",border:"none",color:C.w(.5),fontSize:20,cursor:"pointer",padding:"4px"}}>←</button>}
      <Logo size="sm"/>
    </div>
    {showPlayers && (
      <div style={{display:"flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 10px"}}>
        <span style={{fontSize:12}}>👥</span><span style={{fontSize:12,fontWeight:700,color:"#fff"}}>14</span>
      </div>
    )}
  </div>
);

const Logo = ({size="md"}) => {
  const s = {sm:{text:17},md:{text:22},lg:{text:32}}[size];
  return (
    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:s.text,fontWeight:700,letterSpacing:-.5,lineHeight:1}}>
      <span style={{color:"#fff"}}>Tap</span><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
    </span>
  );
};

const Av = ({name,rank,size=36,you}) => {
  const h=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,hsl(${h},65%,52%),hsl(${(h+35)%360},65%,42%))`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*.4,fontFamily:"'Outfit',sans-serif",border:rank===1?`2px solid ${C.gold}`:you?`2px solid ${C.blue}`:`2px solid ${C.w(.2)}`,boxShadow:rank===1?`0 0 14px rgba(255,210,0,.4)`:you?`0 0 12px rgba(102,126,234,.3)`:"none",position:"relative"}}>
      {name.charAt(0).toUpperCase()}
      {rank&&rank<=3&&<span style={{position:"absolute",bottom:-3,right:-3,fontSize:size*.35}}>{rank===1?"🥇":rank===2?"🥈":"🥉"}</span>}
    </div>
  );
};

const Timer = ({sec,total,size=58,sw=3}) => {
  const r=(size-sw*2)/2,circ=2*Math.PI*r,pct=sec/total;
  const col=pct>.5?C.green:pct>.2?C.gold:C.red;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.w(.08)} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s linear,stroke .5s",filter:`drop-shadow(0 0 8px ${col})`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:size*.32,fontWeight:700,color:col,lineHeight:1}}>{sec}</span>
      </div>
    </div>
  );
};

const ACard = ({label,letter,state="default",onClick,delay=0,disabled}) => {
  const L=String.fromCharCode(64+letter);
  const bg={default:"#fff",selected:"transparent",correct:"transparent",wrong:"transparent"};
  const gr={selected:C.grad.selected,correct:C.grad.correct,wrong:C.grad.wrong};
  const tc={default:"#1e0f4a",selected:"#fff",correct:"#fff",wrong:"#fff"};
  const clickable=state==="default"&&!disabled;
  return (
    <button className={clickable?"ab":""} onClick={clickable?onClick:undefined} style={{
      width:"100%",display:"flex",alignItems:"center",gap:14,padding:"15px 18px",minHeight:56,
      background:gr[state]||bg[state],border:"none",borderRadius:14,cursor:clickable?"pointer":"default",
      fontFamily:"'Outfit',sans-serif",opacity:1,
      animation:state==="selected"?"glowPulse 2s ease-in-out infinite":state==="correct"?"bounceIn .4s ease-out":state==="wrong"?"shake .4s ease-out":`slideUp .4s ease-out ${delay*.08}s both`,
      boxShadow:state==="default"?"0 4px 16px rgba(0,0,0,.1)":state==="selected"?"0 4px 24px rgba(102,126,234,.35)":"none",
    }}>
      <div style={{width:32,height:32,borderRadius:9,background:state==="correct"?C.green:state==="wrong"?C.red:state==="selected"?C.w(.2):state==="default"?"linear-gradient(135deg,#eef1ff,#e4d8ff)":C.w(.2),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:state==="correct"||state==="wrong"||state==="selected"?"#fff":"#5b2a86",flexShrink:0}}>
        {state==="correct"?"✓":state==="wrong"?"✗":L}
      </div>
      <span style={{flex:1,textAlign:"left",fontSize:15,fontWeight:600,color:tc[state]||"#1e0f4a",letterSpacing:-.2}}>{label}</span>
      {state==="correct"&&<span style={{fontSize:16}}>🎉</span>}
    </button>
  );
};

const Confetti = ({color,left,delay,size=6}) => (
  <div style={{position:"absolute",top:-10,left:`${left}%`,width:size,height:size*1.4,background:color,borderRadius:2,animation:`confetti1 ${1.5+Math.random()}s ease-out ${delay}s forwards`,opacity:0}}/>
);

// ─── Data ───
const PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Jake",score:10460},{name:"Chris K",score:10875},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},
  {name:"Ryan T",score:4200},{name:"Emma L",score:3900},{name:"Josh P",score:3400},
  {name:"Bri H",score:3100},{name:"Matt C",score:2800},
].sort((a,b)=>b.score-a.score);
const ANSWERS = ["Frozen","Tangled","Cinderella","Snow White"];
const Q = '"Let It Go" is the theme song of which Disney movie?';
const TOTAL_TIME = 20;
const MAX_PTS = 1000;
const SAVED_BARS = [
  {code:"BR7X9",name:"The Pisgah Tavern",lastPlayed:"2 days ago"},
  {code:"HK3M2",name:"Oskar Blues Brevard",lastPlayed:"Last week"},
  {code:"TP8N1",name:"The Square Root",lastPlayed:"2 weeks ago"},
];

// ═══════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════

// 1. WELCOME
const Welcome = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <div style={{padding:"2px 24px 0",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={()=>go("settings")} style={{background:C.w(.08),border:"none",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:14,color:C.w(.4)}}>⚙</button>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
        <div style={{animation:"breathe 4s ease-in-out infinite",marginBottom:20}}><Logo size="lg"/></div>
        <div style={{fontSize:16,color:C.w(.45),fontWeight:500,textAlign:"center",marginBottom:36}}>Live bar trivia on your phone</div>
        <button className="ab" onClick={()=>go("join")} style={{width:"100%",padding:"18px 24px",borderRadius:16,border:"none",background:C.grad.selected,color:"#fff",fontSize:18,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 8px 32px rgba(102,126,234,.35)",marginBottom:14}}>
          Join a Game
        </button>
        <button className="ab" style={{width:"100%",padding:"16px 24px",borderRadius:16,border:`1px solid ${C.w(.12)}`,background:C.w(.06),color:"#fff",fontSize:16,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",marginBottom:24}}>
          How It Works
        </button>
        <div style={{display:"flex",gap:16,alignItems:"center",width:"100%",margin:"4px 0"}}>
          <div style={{height:1,flex:1,background:C.w(.08)}}/>
          <span style={{fontSize:11,color:C.w(.25),fontWeight:600,letterSpacing:1}}>YOUR BARS</span>
          <div style={{height:1,flex:1,background:C.w(.08)}}/>
        </div>
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:6,marginTop:10}}>
          {SAVED_BARS.map((bar,i) => (
            <button key={i} className="ab" onClick={()=>go("lobby")} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.w(.06),border:`1px solid ${C.w(.06)}`,borderRadius:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif",animation:`slideUp .3s ease-out ${i*.06}s both`}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#667eea22,#764ba222)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🍺</div>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{bar.name}</div>
                <div style={{fontSize:11,color:C.w(.35),marginTop:1}}>{bar.lastPlayed}</div>
              </div>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:C.gold,letterSpacing:1}}>{bar.code}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 24px 36px",textAlign:"center"}}>
        <div style={{fontSize:11,color:C.w(.15)}}>Scan a QR code at any participating bar</div>
      </div>
    </div>
  </Phone>
);

// 2. JOIN
const Join = ({go}) => {
  const code = "BR7X9";
  return (
    <Phone><Orbs/>
      <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
        <StatusBar/>
        <Header showPlayers={false} showBack onBack={()=>go("welcome")}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
          <div style={{fontSize:14,fontWeight:600,color:C.w(.45),letterSpacing:2,textTransform:"uppercase",marginBottom:24}}>Enter Game Code</div>
          <div style={{display:"flex",gap:8,marginBottom:24}}>
            {code.split("").map((ch,i) => (
              <div key={i} style={{width:52,height:62,borderRadius:14,background:C.w(.08),border:`2px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff",animation:`popIn .3s ease-out ${i*.06}s both`}}>{ch}</div>
            ))}
          </div>
          <div style={{fontSize:13,color:C.w(.3),marginBottom:6}}>Code shown on the bar TV</div>
          <button className="ab" onClick={()=>go("nickname")} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",marginTop:20,boxShadow:"0 6px 24px rgba(102,126,234,.3)"}}>
            Join Game →
          </button>
        </div>
        <div style={{height:200,background:C.b(.4),borderTop:`1px solid ${C.w(.06)}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
          <div style={{display:"flex",gap:4}}>{["Q","W","E","R","T","Y","U","I","O","P"].map(k=><div key={k} style={{width:30,height:38,borderRadius:6,background:C.w(.12),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:C.w(.6)}}>{k}</div>)}</div>
          <div style={{display:"flex",gap:4}}>{["A","S","D","F","G","H","J","K","L"].map(k=><div key={k} style={{width:30,height:38,borderRadius:6,background:C.w(.12),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:C.w(.6)}}>{k}</div>)}</div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <div style={{width:42,height:38,borderRadius:6,background:C.w(.08),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.w(.4)}}>⇧</div>
            {["Z","X","C","V","B","N","M"].map(k=><div key={k} style={{width:30,height:38,borderRadius:6,background:C.w(.12),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:C.w(.6)}}>{k}</div>)}
            <div style={{width:42,height:38,borderRadius:6,background:C.w(.08),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:C.w(.4)}}>⌫</div>
          </div>
        </div>
      </div>
    </Phone>
  );
};

// 3. NICKNAME
const Nickname = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <Header showPlayers={false} showBack onBack={()=>go("join")}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
        <div style={{fontSize:48,marginBottom:16}}>👋</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff",marginBottom:8}}>What should we call you?</div>
        <div style={{fontSize:14,color:C.w(.4),marginBottom:32}}>This is shown on the leaderboard</div>
        <div style={{width:"100%",position:"relative",marginBottom:8}}>
          <div style={{width:"100%",padding:"16px 20px",borderRadius:14,background:C.w(.08),border:`2px solid ${C.blue}`,fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:600,color:"#fff",textAlign:"center",letterSpacing:.5}}>
            Jake
          </div>
          <div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:12,color:C.w(.25)}}>4/16</div>
        </div>
        <button className="ab" onClick={()=>go("lobby")} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",marginTop:20,boxShadow:"0 6px 24px rgba(102,126,234,.3)"}}>
          Let's Go! 🎮
        </button>
      </div>
    </div>
  </Phone>
);

// 4. LOBBY
const Lobby = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <Header/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 24px"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:8,animation:"bounceIn .5s ease-out"}}>🎉</div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>You're In!</div>
          <div style={{fontSize:13,color:C.w(.4),marginTop:4}}>
            <span style={{color:C.w(.5)}}>The Pisgah Tavern</span> · <span style={{fontFamily:"'Fredoka',sans-serif",fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X9</span>
          </div>
        </div>
        <div style={{background:C.w(.06),borderRadius:14,padding:"14px 18px",border:`1px solid ${C.w(.06)}`,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <Av name="Jake" size={40} you/>
          <div><div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Jake</div><div style={{fontSize:11,color:C.w(.35)}}>Ready to play</div></div>
          <div style={{marginLeft:"auto",width:10,height:10,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`}}/>
        </div>
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
        <div style={{textAlign:"center",padding:"16px 0 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span style={{fontSize:14,color:C.w(.35)}}>Waiting for host to start</span>
            <div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:C.w(.4),animation:`dotPulse 1.4s ease-in-out ${i*.2}s infinite`}}/>)}</div>
          </div>
          <button className="ab" onClick={()=>go("countdown")} style={{marginTop:12,padding:"8px 20px",borderRadius:10,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Demo: Start Game →</button>
        </div>
      </div>
    </div>
  </Phone>
);

// 5. COUNTDOWN
const Countdown = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
      <Logo size="md"/>
      <div style={{marginTop:50,fontSize:14,fontWeight:600,color:C.w(.4),letterSpacing:2,textTransform:"uppercase"}}>Question 7 of 15</div>
      <div style={{marginTop:6,fontSize:13,color:C.w(.3)}}>🎬 Entertainment — Disney Movies</div>
      <div style={{marginTop:30,width:120,height:120,borderRadius:"50%",background:C.w(.06),border:`3px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"ringPulse 1.5s ease-in-out infinite"}}>
        <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:"#fff",animation:"countdownNum .6s ease-out",lineHeight:1}}>3</span>
      </div>
      <div style={{marginTop:28,fontSize:15,fontWeight:600,color:C.w(.5)}}>Get ready!</div>
      <div style={{marginTop:8,fontSize:12,color:C.w(.3)}}>Answer fast for more points</div>
      <button className="ab" onClick={()=>go("category")} style={{marginTop:40,padding:"8px 20px",borderRadius:10,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Next →</button>
    </div>
  </Phone>
);

// 6. CATEGORY
const Category = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 32px"}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,color:C.w(.3),letterSpacing:1,marginBottom:20}}>QUESTION 7 OF 15</div>
      <div style={{fontSize:72,marginBottom:16,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)",filter:"drop-shadow(0 6px 16px rgba(0,0,0,.3))"}}>🎬</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:6,animation:"fadeDown .5s ease-out .2s both",textAlign:"center"}}>Entertainment</div>
      <div style={{fontSize:15,color:C.w(.4),fontWeight:500,animation:"fadeDown .5s ease-out .3s both"}}>Disney Movies</div>
      <div style={{marginTop:24,display:"inline-flex",gap:5,animation:"fadeDown .5s ease-out .4s both"}}>
        {[1,2,3,4,5].map(d=><div key={d} style={{width:8,height:8,borderRadius:"50%",background:d<=2?C.green:C.w(.1),boxShadow:d<=2?`0 0 6px ${C.green}`:"none"}}/>)}
        <span style={{fontSize:12,color:C.w(.4),marginLeft:6,fontWeight:500}}>Easy</span>
      </div>
      <button className="ab" onClick={()=>go("playing")} style={{marginTop:40,padding:"8px 20px",borderRadius:10,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:11,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Next →</button>
    </div>
  </Phone>
);

// 7. PLAYING
const Playing = ({go}) => {
  const pts=750, ptsPct=pts/MAX_PTS;
  const ptsColor=ptsPct>.6?C.green:ptsPct>.3?C.gold:C.red;
  return (
    <Phone><Orbs/>
      <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
        <StatusBar/>
        <Header/>
        <div style={{padding:"12px 24px 0",textAlign:"center"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:ptsColor,filter:`drop-shadow(0 2px 12px ${ptsColor}50)`,transition:"color .3s"}}>{pts}</div>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>Points Available</div>
          <div style={{width:180,height:4,borderRadius:2,background:C.w(.08),margin:"8px auto 0",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${ptsPct*100}%`,borderRadius:2,background:ptsColor}}/>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"center",padding:"6px 0 2px"}}>
          <div style={{background:C.w(.06),borderRadius:10,padding:"4px 14px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>9,640</span>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"center",padding:"4px 0"}}><Timer sec={12} total={TOTAL_TIME}/></div>
        <div style={{padding:"0 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
              <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
            </div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
          </div>
          <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
        </div>
        <div style={{padding:"0 24px",textAlign:"center",marginBottom:10}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.35,letterSpacing:-.3}}>{Q}</div>
        </div>
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:7,flex:1}}>
          {ANSWERS.map((a,i) => <ACard key={i} label={a} letter={i+1} state="default" delay={i} onClick={()=>go("locked")}/>)}
        </div>
        <div style={{padding:"16px 18px 32px"}}/>
      </div>
    </Phone>
  );
};

// 8. LOCKED IN
const LockedIn = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <Header/>
      <div style={{padding:"12px 24px 0",textAlign:"center"}}>
        <div style={{animation:"pointsEarned .4s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 2px 8px rgba(247,151,30,.35))"}}>820</div>
          <div style={{fontSize:11,fontWeight:600,color:C.gold,letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>Locked In! <span style={{color:C.w(.3)}}>/ {MAX_PTS}</span></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:"6px 0 2px"}}>
        <div style={{background:C.w(.06),borderRadius:10,padding:"4px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>9,640</span>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:"4px 0"}}><Timer sec={8} total={TOTAL_TIME}/></div>
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:10}}>
        <div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.35}}>{Q}</div>
      </div>
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:7,flex:1}}>
        {ANSWERS.map((a,i) => <ACard key={i} label={a} letter={i+1} state={i===0?"selected":"default"} disabled/>)}
      </div>
      <div style={{padding:"16px 18px 32px",textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <span style={{fontSize:13,color:C.w(.4)}}>Waiting for timer</span>
          <div style={{display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:C.w(.4),animation:`dotPulse 1.4s ease-in-out ${i*.2}s infinite`}}/>)}</div>
        </div>
        <button className="ab" onClick={()=>go("correct")} style={{marginTop:10,padding:"6px 16px",borderRadius:8,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:10,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Demo: Reveal →</button>
      </div>
    </div>
  </Phone>
);

// 9. CORRECT
const Correct = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",animation:"correctFlash 1s ease-out"}}>
      <StatusBar/>
      <Header/>
      <div style={{padding:"12px 24px 0",textAlign:"center"}}>
        <div style={{animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,lineHeight:1,color:C.green,filter:`drop-shadow(0 2px 12px rgba(0,212,170,.4))`}}>+820</div>
          <div style={{fontSize:12,fontWeight:700,color:C.green,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Points Earned! <span style={{color:C.w(.3),fontWeight:500}}>/ {MAX_PTS}</span></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:"6px 0 2px"}}>
        <div style={{background:C.w(.06),borderRadius:10,padding:"4px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>10,460</span>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:"4px 0"}}>
        <div style={{width:58,height:58,borderRadius:"50%",background:"rgba(0,212,170,.12)",border:`3px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:28,color:C.green,animation:"checkmark .5s ease-out"}}>✔</span>
        </div>
      </div>
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:10}}>
        <div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.35}}>{Q}</div>
      </div>
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:7,flex:1}}>
        {ANSWERS.map((a,i) => <ACard key={i} label={a} letter={i+1} state={i===0?"correct":"default"} disabled/>)}
      </div>
      <div style={{padding:"16px 18px 32px",textAlign:"center"}}>
        <div style={{fontSize:13,color:C.w(.35)}}>Next question in 5s...</div>
        <button className="ab" onClick={()=>go("between")} style={{marginTop:8,padding:"6px 16px",borderRadius:8,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:10,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Next →</button>
      </div>
    </div>
  </Phone>
);

// 10. WRONG
const Wrong = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",animation:"wrongFlash 1s ease-out"}}>
      <StatusBar/>
      <Header/>
      <div style={{padding:"12px 24px 0",textAlign:"center"}}>
        <div style={{animation:"pointsEarned .5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:C.red,filter:`drop-shadow(0 2px 8px rgba(255,71,87,.3))`}}>+0</div>
          <div style={{fontSize:12,fontWeight:700,color:C.red,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Wrong Answer</div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:"6px 0 2px"}}>
        <div style={{background:C.w(.06),borderRadius:10,padding:"4px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(.35)}}>TOTAL</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>9,640</span>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",padding:"4px 0"}}>
        <div style={{width:58,height:58,borderRadius:"50%",background:"rgba(255,71,87,.12)",border:`3px solid ${C.red}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:28,color:C.red}}>✗</span>
        </div>
      </div>
      <div style={{padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(.08),borderRadius:16,padding:"4px 12px"}}>
            <span style={{fontSize:13}}>🎬</span><span style={{fontSize:11,fontWeight:600,color:C.w(.7),textTransform:"uppercase",letterSpacing:.5}}>Entertainment</span>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:600,color:C.w(.5)}}>7<span style={{color:C.w(.25)}}>/15</span></div>
        </div>
        <div style={{height:3,borderRadius:2,background:C.w(.08),overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:"46.7%",borderRadius:2,background:`linear-gradient(90deg,${C.blue},${C.purple})`}}/></div>
      </div>
      <div style={{padding:"0 24px",textAlign:"center",marginBottom:10}}>
        <div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.35}}>{Q}</div>
      </div>
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:7,flex:1}}>
        {ANSWERS.map((a,i) => <ACard key={i} label={a} letter={i+1} state={i===0?"correct":i===1?"wrong":"default"} disabled/>)}
      </div>
      <div style={{padding:"16px 18px 32px",textAlign:"center"}}>
        <div style={{fontSize:13,color:C.w(.35)}}>The answer was <span style={{color:C.green,fontWeight:700}}>Frozen</span></div>
        <button className="ab" onClick={()=>go("between")} style={{marginTop:8,padding:"6px 16px",borderRadius:8,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:10,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Next →</button>
      </div>
    </div>
  </Phone>
);

// 11. BETWEEN
const Between = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <Header/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 24px",overflow:"auto"}}>
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px 20px",border:`1px solid ${C.w(.06)}`,marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:600,color:C.w(.35),letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>After Question 7</div>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:20}}>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:C.gold}}>10,460</div>
              <div style={{fontSize:11,color:C.w(.35)}}>Your Score</div>
            </div>
            <div style={{width:1,height:40,background:C.w(.08)}}/>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff"}}>3rd</div>
              <div style={{fontSize:11,color:C.green}}>▲ Up 2 spots</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{n:5,l:"Correct",c:C.green},{n:1,l:"Wrong",c:C.red},{n:"🔥 3",l:"Streak",c:C.gold}].map((s,i)=>(
            <div key={i} style={{flex:1,background:C.w(.06),borderRadius:12,padding:"10px",textAlign:"center"}}>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:s.c}}>{s.n}</div>
              <div style={{fontSize:10,color:C.w(.3)}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Leaderboard</div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
          {PLAYERS.slice(0,8).map((p,i)=>{
            const isYou=p.name==="Jake";
            const mv=isYou?2:i===0?0:i%3===0?-1:i%2===0?1:0;
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:isYou?C.w(.08):"transparent",borderRadius:10,border:isYou?`1px solid ${C.w(.08)}`:"1px solid transparent",animation:`rankSlide .3s ease-out ${i*.04}s both`}}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:i<3?C.gold:C.w(.25),width:18,textAlign:"center"}}>{i+1}</span>
                <Av name={p.name} rank={i+1} size={28} you={isYou}/>
                <span style={{flex:1,fontSize:13,fontWeight:isYou?700:500,color:C.w(isYou?1:.65)}}>{p.name}{isYou&&<span style={{fontSize:8,color:C.blue,marginLeft:4}}>YOU</span>}</span>
                {mv!==0&&<span style={{fontSize:11,fontWeight:700,color:mv>0?C.green:C.red}}>{mv>0?`▲${mv}`:`▼${Math.abs(mv)}`}</span>}
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",padding:"10px 0 16px"}}>
          <div style={{fontSize:12,color:C.w(.25),animation:"pulse 2s infinite"}}>Next question in 5s...</div>
          <button className="ab" onClick={()=>go("results")} style={{marginTop:8,padding:"6px 16px",borderRadius:8,border:`1px solid ${C.w(.1)}`,background:C.w(.06),color:C.w(.4),fontSize:10,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>Skip to Results →</button>
        </div>
      </div>
    </div>
  </Phone>
);

// 12. RESULTS
const Results = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>{Array.from({length:12}).map((_,i)=><Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81"][i%6]} left={5+i*8} delay={i*.12} size={4+Math.random()*5}/>)}</div>
    <div style={{position:"relative",zIndex:7,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <Header showPlayers={false}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"8px 24px",overflow:"auto"}}>
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:48,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:4}}>🏆</div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>Game Over!</div>
          <div style={{fontSize:12,color:C.w(.35),marginTop:4}}>15 questions · {PLAYERS.length} players</div>
        </div>
        <div style={{background:C.w(.06),borderRadius:16,padding:"16px 18px",border:`1px solid ${C.w(.08)}`,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <Av name="Jake" rank={3} size={44} you/>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Jake — 3rd Place</div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:C.gold}}>10,460</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            {[{n:11,l:"Correct",c:C.green},{n:3,l:"Wrong",c:C.red},{n:1,l:"Timeout",c:C.w(.4)},{n:"🔥 5",l:"Best Streak",c:C.gold}].map((s,i)=>(
              <div key={i} style={{flex:1,textAlign:"center"}}>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:s.c}}>{s.n}</div>
                <div style={{fontSize:9,color:C.w(.35)}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Final Standings</div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {PLAYERS.slice(0,10).map((p,i)=>{
            const isYou=p.name==="Jake";
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:isYou?C.w(.08):"transparent",borderRadius:8,animation:`rankSlide .3s ease-out ${i*.04}s both`}}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:i<3?C.gold:C.w(.2),width:16,textAlign:"center"}}>{i+1}</span>
                <Av name={p.name} rank={i+1} size={24} you={isYou}/>
                <span style={{flex:1,fontSize:12,fontWeight:isYou?700:500,color:C.w(isYou?1:.6)}}>{p.name}</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <div style={{padding:"14px 0 20px",textAlign:"center"}}>
          <button className="ab" onClick={()=>go("welcome")} style={{padding:"14px 40px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 6px 24px rgba(102,126,234,.3)"}}>
            Play Again 🔄
          </button>
        </div>
      </div>
    </div>
  </Phone>
);

// 13. SUBSCRIPTION
const Subscription = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <div style={{padding:"2px 24px 0",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={()=>go("welcome")} style={{background:C.w(.08),border:"none",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:14,color:C.w(.5)}}>✕</button>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"0 32px",justifyContent:"center"}}>
        <Logo size="lg"/>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:"#fff",marginTop:20,marginBottom:6}}>Unlimited Trivia</div>
        <div style={{fontSize:14,color:C.w(.4),textAlign:"center",marginBottom:28}}>Play at any bar, anytime. Support your favorite spots.</div>
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
          {[
            {icon:"🎮",text:"Unlimited games at every bar"},
            {icon:"📊",text:"Personal stats & game history"},
            {icon:"⭐",text:"Save your favorite bars"},
            {icon:"🏆",text:"Compete on all-time leaderboards"},
            {icon:"🎨",text:"Custom avatar & profile"},
          ].map((f,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,animation:`slideUp .3s ease-out ${i*.05}s both`}}>
              <span style={{fontSize:20}}>{f.icon}</span>
              <span style={{fontSize:14,fontWeight:500,color:C.w(.7)}}>{f.text}</span>
            </div>
          ))}
        </div>
        <div style={{background:C.w(.06),borderRadius:20,padding:"20px 28px",border:`1px solid ${C.w(.08)}`,textAlign:"center",width:"100%",marginBottom:16}}>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:40,fontWeight:700,color:"#fff"}}>$2.99</div>
          <div style={{fontSize:13,color:C.w(.4),marginTop:2}}>per month</div>
        </div>
        <button className="ab" onClick={()=>go("welcome")} style={{width:"100%",padding:"18px",borderRadius:16,border:"none",background:C.grad.gold,color:"#1e0f4a",fontSize:17,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:"pointer",boxShadow:"0 8px 32px rgba(247,151,30,.35)"}}>
          Subscribe Now
        </button>
        <button style={{background:"none",border:"none",color:C.w(.3),fontSize:13,fontWeight:500,marginTop:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Restore Purchases</button>
      </div>
      <div style={{padding:"12px 32px 36px",textAlign:"center"}}>
        <div style={{fontSize:10,color:C.w(.15),lineHeight:1.6}}>
          Auto-renews monthly. Cancel anytime.<br/>
          <span style={{textDecoration:"underline",cursor:"pointer"}}>Terms</span> · <span style={{textDecoration:"underline",cursor:"pointer"}}>Privacy</span>
        </div>
      </div>
    </div>
  </Phone>
);

// 14. SETTINGS
const Settings = ({go}) => (
  <Phone><Orbs/>
    <div style={{position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column"}}>
      <StatusBar/>
      <div style={{padding:"2px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:"#fff"}}>Settings</div>
        <button onClick={()=>go("welcome")} style={{background:C.w(.08),border:"none",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:14,color:C.w(.5)}}>✕</button>
      </div>
      <div style={{flex:1,padding:"20px 24px",overflow:"auto",display:"flex",flexDirection:"column",gap:16}}>
        {/* Profile */}
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px",border:`1px solid ${C.w(.06)}`}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>Profile</div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av name="Jake" size={50} you/>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>Jake</div>
              <div style={{fontSize:12,color:C.w(.35)}}>Playing since Feb 2026</div>
            </div>
            <button style={{background:C.w(.08),border:"none",borderRadius:8,padding:"6px 12px",color:C.w(.5),fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Edit</button>
          </div>
        </div>

        {/* Subscription */}
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px",border:`1px solid ${C.w(.06)}`}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>Subscription</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#fff"}}>TapTrivia Pro</div>
              <div style={{fontSize:12,color:C.green,fontWeight:600,marginTop:2}}>● Active</div>
            </div>
            <button onClick={()=>go("subscription")} style={{background:C.w(.08),border:"none",borderRadius:8,padding:"6px 12px",color:C.w(.5),fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Manage</button>
          </div>
        </div>

        {/* Saved Bars */}
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px",border:`1px solid ${C.w(.06)}`}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>Saved Bars</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {SAVED_BARS.map((bar,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<SAVED_BARS.length-1?`1px solid ${C.w(.04)}`:"none"}}>
                <span style={{fontSize:18}}>🍺</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{bar.name}</div>
                  <div style={{fontSize:11,color:C.w(.3)}}>{bar.code} · {bar.lastPlayed}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div style={{background:C.w(.06),borderRadius:16,padding:"18px",border:`1px solid ${C.w(.06)}`}}>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>App</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {["Terms of Service","Privacy Policy","Send Feedback"].map((item,i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,color:C.w(.6)}}>{item}</span>
                <span style={{fontSize:14,color:C.w(.2)}}>→</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <span style={{fontSize:14,color:C.w(.4)}}>Version</span>
              <span style={{fontSize:12,color:C.w(.2),fontFamily:"'DM Mono',monospace"}}>1.0.0 (1)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Phone>
);


// ═══════════════════════════════════════════════════════════════
// SCREEN DEFINITIONS
// ═══════════════════════════════════════════════════════════════
const SCREENS = [
  {key:"welcome",label:"🏠 Home",group:"Pre-Game"},
  {key:"join",label:"🔑 Join",group:"Pre-Game"},
  {key:"nickname",label:"👋 Nickname",group:"Pre-Game"},
  {key:"lobby",label:"⏳ Lobby",group:"Pre-Game"},
  {key:"countdown",label:"3️⃣ Countdown",group:"Gameplay"},
  {key:"category",label:"🎬 Category",group:"Gameplay"},
  {key:"playing",label:"▶ Playing",group:"Gameplay"},
  {key:"locked",label:"🔒 Locked",group:"Gameplay"},
  {key:"correct",label:"✅ Correct",group:"Gameplay"},
  {key:"wrong",label:"❌ Wrong",group:"Gameplay"},
  {key:"between",label:"📊 Standings",group:"Gameplay"},
  {key:"results",label:"🏆 Results",group:"Post-Game"},
  {key:"subscription",label:"💎 Subscribe",group:"System"},
  {key:"settings",label:"⚙ Settings",group:"System"},
];

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const go = useCallback((s) => setScreen(s), []);

  const renderScreen = () => {
    switch(screen) {
      case "welcome": return <Welcome go={go}/>;
      case "join": return <Join go={go}/>;
      case "nickname": return <Nickname go={go}/>;
      case "lobby": return <Lobby go={go}/>;
      case "countdown": return <Countdown go={go}/>;
      case "category": return <Category go={go}/>;
      case "playing": return <Playing go={go}/>;
      case "locked": return <LockedIn go={go}/>;
      case "correct": return <Correct go={go}/>;
      case "wrong": return <Wrong go={go}/>;
      case "between": return <Between go={go}/>;
      case "results": return <Results go={go}/>;
      case "subscription": return <Subscription go={go}/>;
      case "settings": return <Settings go={go}/>;
      default: return <Welcome go={go}/>;
    }
  };

  const groups = [...new Set(SCREENS.map(s=>s.group))];

  return (
    <div style={{minHeight:"100vh",background:"#08080c",fontFamily:"'Outfit',sans-serif",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <S/>
      {/* Nav */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,12,.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.w(.05)}`,padding:"12px 16px",width:"100%"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <Logo size="sm"/>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1,background:C.w(.06),borderRadius:6,padding:"3px 8px"}}>MOBILE APP SPEC</span>
            <span style={{fontSize:10,color:C.w(.15),marginLeft:"auto"}}>📱 {SCREENS.length} screens</span>
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {groups.map(g => (
              <div key={g} style={{display:"flex",gap:3,alignItems:"center"}}>
                <span style={{fontSize:9,fontWeight:600,color:C.w(.2),letterSpacing:1,marginRight:4}}>{g.toUpperCase()}:</span>
                {SCREENS.filter(s=>s.group===g).map(s => (
                  <button key={s.key} onClick={()=>setScreen(s.key)} style={{
                    padding:"4px 8px",borderRadius:6,border:"none",
                    background:screen===s.key?C.grad.selected:C.w(.06),
                    color:screen===s.key?"#fff":C.w(.5),
                    fontSize:10,fontWeight:600,cursor:"pointer",
                    fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",
                    transition:"all .15s",
                  }}>{s.label}</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phone */}
      <div style={{padding:"28px 16px 60px",display:"flex",justifyContent:"center"}}>
        <div key={screen} style={{animation:"popIn .35s ease-out"}}>
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
