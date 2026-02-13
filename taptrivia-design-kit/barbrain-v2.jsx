import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// BARBRAIN v2 — Full App Flow Prototype
// Screens: Join → Lobby → Game → Results (TV + Phone)
// ═══════════════════════════════════════════════════════════════

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0726 0%, #1e1145 20%, #3d1d6e 45%, #6b2a5e 70%, #a83279 90%, #d4573b 100%)",
    mainTV: "linear-gradient(135deg, #0f0726 0%, #1a0e3e 25%, #2d1960 50%, #4a2268 75%, #6b2a5e 100%)",
    header: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
    footer: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
    correct: "linear-gradient(135deg, #00c9a7 0%, #38e8b0 100%)",
    wrong: "linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)",
    selected: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
    goldSoft: "linear-gradient(135deg, #f7971e22 0%, #ffd20022 100%)",
    glass: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
    cardBg: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
  },
  w: (a) => `rgba(255,255,255,${a})`,
  b: (a) => `rgba(0,0,0,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", goldDark: "#f7971e",
  blue: "#667eea", purple: "#764ba2", pink: "#a83279",
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes popIn { 0%{transform:scale(0.85);opacity:0} 50%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
    @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes fadeDown { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
    @keyframes bounceIn { 0%{transform:scale(1)} 30%{transform:scale(1.07)} 100%{transform:scale(1)} }
    @keyframes glowPulse { 0%,100%{box-shadow:0 0 15px var(--glow)} 50%{box-shadow:0 0 30px var(--glow)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes chatIn { from{transform:translateX(-12px);opacity:0} to{transform:translateX(0);opacity:0.75} }
    @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(50px,-40px) scale(1.15)} 66%{transform:translate(-30px,25px) scale(0.9)} }
    @keyframes orb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,50px)} }
    @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
    @keyframes scoreCount { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes barFill { from{width:0} }
    @keyframes crownBounce { 0%,100%{transform:rotate(-3deg) scale(1)} 50%{transform:rotate(3deg) scale(1.1)} }
    @keyframes confetti1 { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(80px) rotate(720deg);opacity:0} }
    @keyframes confetti2 { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(100px) rotate(-540deg);opacity:0} }
    @keyframes codeGlow { 0%,100%{text-shadow:0 0 8px rgba(255,210,0,0.3)} 50%{text-shadow:0 0 20px rgba(255,210,0,0.6),0 0 40px rgba(255,210,0,0.2)} }
    .abtn{transition:all .2s cubic-bezier(.34,1.56,.64,1);cursor:pointer}
    .abtn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.2)}
    .abtn:active{transform:scale(0.97)}
  `}</style>
);

// ─── Orbs ───
const Orbs = () => (
  <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(102,126,234,0.12) 0%,transparent 70%)",top:"-8%",right:"5%",animation:"orb1 22s ease-in-out infinite"}} />
    <div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,50,121,0.1) 0%,transparent 70%)",bottom:"5%",left:"8%",animation:"orb2 28s ease-in-out infinite"}} />
    <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,170,0.06) 0%,transparent 70%)",top:"50%",left:"55%",animation:"orb1 16s ease-in-out infinite reverse"}} />
  </div>
);

// ─── Timer ───
const Timer = ({ sec, total, size=76, sw=4 }) => {
  const r = (size-sw*2)/2, circ = 2*Math.PI*r, pct = sec/total;
  const col = pct>.5?C.green:pct>.2?C.gold:C.red;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.w(0.08)} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 1s linear, stroke .5s",filter:`drop-shadow(0 0 8px ${col})`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
        <span style={{fontFamily:"'Bricolage Grotesque'",fontSize:size*.32,fontWeight:800,color:col,lineHeight:1,animation:pct<.2?"pulse 1s infinite":"none"}}>{sec}</span>
        {size>55&&<span style={{fontSize:size*.11,color:C.w(0.3),fontWeight:600,marginTop:1,letterSpacing:1}}>SEC</span>}
      </div>
    </div>
  );
};

// ─── Points (Bricolage Grotesque — the new font) ───
const Points = ({ value, label, size="lg" }) => {
  const sz = {sm:{fs:24,ls:-0.5},md:{fs:36,ls:-1},lg:{fs:52,ls:-1.5},xl:{fs:64,ls:-2}};
  const s = sz[size];
  return (
    <div style={{textAlign:"center"}}>
      <div style={{
        fontFamily:"'Bricolage Grotesque', sans-serif",
        fontSize:s.fs, fontWeight:800, letterSpacing:s.ls, lineHeight:1,
        background:C.grad.gold, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        filter:"drop-shadow(0 2px 10px rgba(247,151,30,0.35))",
      }}>
        {typeof value==="number"?value.toLocaleString():value}
      </div>
      {label&&<div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:2,textTransform:"uppercase",marginTop:4,opacity:0.8}}>{label}</div>}
    </div>
  );
};

// ─── Answer Card ───
const AnsCard = ({label,i,state="default",onClick,delay=0,tv}) => {
  const lt = String.fromCharCode(65+i);
  const bg = {default:"#fff",selected:"t",correct:"t",wrong:"t",eliminated:C.w(0.15)};
  const grd = {selected:C.grad.selected,correct:C.grad.correct,wrong:C.grad.wrong};
  const tc = {default:"#1e1145",selected:"#fff",correct:"#fff",wrong:"#fff",eliminated:C.w(0.25)};
  const anim = {correct:"bounceIn .4s ease-out",wrong:"shake .4s ease-out",default:`slideUp .35s ease-out ${delay*.07}s both`};
  const letterBg = ["#667eea22","#a8327922","#00d4aa22","#f7971e22"];
  const letterC = ["#667eea","#a83279","#00d4aa","#f7971e"];

  return (
    <button className="abtn" onClick={state==="default"?onClick:undefined} style={{
      "--glow":letterC[i]+"55",
      width:"100%",display:"flex",alignItems:"center",gap:tv?18:14,
      padding:tv?"18px 24px":"15px 18px",minHeight:tv?68:56,
      background:grd[state]||bg[state],
      border:state==="eliminated"?`1px dashed ${C.w(0.15)}`:"none",
      borderRadius:tv?16:14,cursor:state==="default"?"pointer":"default",
      fontFamily:"'Outfit'",textDecoration:state==="eliminated"?"line-through":"none",
      opacity:state==="eliminated"?.45:1,
      animation:state==="selected"?"glowPulse 2s ease-in-out infinite":anim[state]||anim.default,
      boxShadow:state==="default"?"0 3px 12px rgba(0,0,0,0.08)":state==="selected"?`0 4px 25px ${letterC[i]}44`:"none",
    }}>
      <div style={{
        width:tv?40:32,height:tv?40:32,borderRadius:10,flexShrink:0,
        background:state==="correct"?C.green:state==="wrong"?C.red:letterBg[i],
        display:"flex",alignItems:"center",justifyContent:"center",
        fontWeight:800,fontSize:tv?17:14,
        color:state==="correct"||state==="wrong"?"#fff":letterC[i],
        transition:"all .25s",
      }}>
        {state==="correct"?"✓":state==="wrong"?"✗":lt}
      </div>
      <span style={{flex:1,textAlign:"left",fontSize:tv?20:15,fontWeight:600,color:tc[state],letterSpacing:-.2}}>
        {state==="eliminated"?<><s>{label}</s></>:label}
      </span>
      {state==="correct"&&<span style={{fontSize:tv?20:16}}>🎉</span>}
    </button>
  );
};

// ─── Avatar ───
const Av = ({name,rank,size=36,glow}) => {
  const h = name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:`linear-gradient(135deg, hsl(${h},65%,55%), hsl(${(h+35)%360},65%,45%))`,
      display:"flex",alignItems:"center",justifyContent:"center",
      color:"#fff",fontWeight:700,fontSize:size*.4,fontFamily:"'Outfit'",
      border:glow?`2px solid ${C.gold}`:`2px solid ${C.w(0.2)}`,
      boxShadow:glow?`0 0 14px rgba(255,210,0,0.35)`:"none",
      position:"relative",
    }}>
      {name.charAt(0).toUpperCase()}
      {rank&&rank<=3&&<span style={{position:"absolute",bottom:-3,right:-3,fontSize:size*.35}}>
        {rank===1?"🥇":rank===2?"🥈":"🥉"}</span>}
    </div>
  );
};

// ─── Chat Msg ───
const Chat = ({name,msg,d=0}) => {
  const h = name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{display:"flex",alignItems:"center",gap:7,animation:`chatIn .3s ease-out ${d}s both`,padding:"2px 0"}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:`hsl(${h},55%,50%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,flexShrink:0}}>{name[0]}</div>
      <span style={{fontSize:11.5,color:C.w(0.45)}}><b style={{color:`hsl(${h},55%,70%)`,fontWeight:600}}>{name}</b> {msg}</span>
    </div>
  );
};

// ─── Glass Pill ───
const Pill = ({children,icon,style:s}) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.w(0.08),borderRadius:20,padding:"5px 13px",backdropFilter:"blur(10px)",border:`1px solid ${C.w(0.06)}`,...s}}>
    {icon&&<span style={{fontSize:14}}>{icon}</span>}
    <span style={{fontSize:12,fontWeight:600,color:C.w(0.8),textTransform:"uppercase",letterSpacing:.5}}>{children}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SCREEN: JOIN (Phone)
// ═══════════════════════════════════════════════════════════════
const PhoneJoin = () => {
  const [code] = useState("BR");
  const [name] = useState("Jake");
  const chars = code.toUpperCase().padEnd(4," ").split("").slice(0,4);

  return (
    <div style={{width:375,height:812,background:C.grad.main,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit'",boxShadow:"0 25px 80px rgba(0,0,0,0.5),inset 0 0 0 3px rgba(255,255,255,0.08)"}}>
      <Orbs/>
      <div style={{height:50,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:2}}>
        <span style={{fontSize:13,fontWeight:600,color:C.w(0.4)}}>9:41</span>
        <div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(0.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div>
      </div>

      <div style={{padding:"20px 28px",position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{marginTop:40,marginBottom:8}}>
          <span style={{fontSize:52,display:"block",textAlign:"center",filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.3))",animation:"float 3s ease-in-out infinite"}}>🧠</span>
        </div>
        <div style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:-1,marginBottom:4}}>BarBrain</div>
        <div style={{fontSize:14,color:C.w(0.4),fontWeight:500,marginBottom:44}}>Live bar trivia. No app needed.</div>

        <div style={{fontSize:12,fontWeight:700,color:C.w(0.4),letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Enter Room Code</div>
        <div style={{display:"flex",gap:10,marginBottom:36}}>
          {chars.map((c,i) => (
            <div key={i} style={{
              width:60,height:72,borderRadius:14,
              background:c.trim()?C.w(0.1):C.w(0.04),
              border:`2px solid ${c.trim()?C.gold:C.w(0.1)}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Bricolage Grotesque'",fontSize:30,fontWeight:800,color:"#fff",
              boxShadow:c.trim()?`0 0 18px rgba(255,210,0,0.2)`:"none",
              transition:"all .2s",animation:c.trim()?"popIn .3s ease-out":"none",
            }}>
              {c.trim()||<div style={{width:2,height:24,background:C.w(0.15),borderRadius:1}}/>}
            </div>
          ))}
        </div>

        <div style={{width:"100%",marginBottom:28}}>
          <div style={{fontSize:12,fontWeight:700,color:C.w(0.4),letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Your Display Name</div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderRadius:14,background:C.w(0.06),border:`1px solid ${C.w(0.1)}`}}>
            <span style={{fontSize:18,opacity:.5}}>👤</span>
            <span style={{fontSize:16,fontWeight:600,color:"#fff",flex:1}}>{name||"..."}</span>
            <span style={{fontSize:11,color:C.w(0.3),fontWeight:500}}>TAP TO EDIT</span>
          </div>
        </div>

        <button style={{
          width:"100%",padding:"18px",borderRadius:16,border:"none",
          background:code.trim().length>=4?C.grad.selected:C.w(0.08),
          color:code.trim().length>=4?"#fff":C.w(0.3),
          fontSize:18,fontWeight:800,fontFamily:"'Outfit'",cursor:"pointer",
          opacity:code.trim().length>=4?1:0.5,
          boxShadow:code.trim().length>=4?"0 8px 30px rgba(102,126,234,0.35)":"none",letterSpacing:.3,
        }}>
          🎯 Join Game
        </button>

        <div style={{marginTop:20,fontSize:12,color:C.w(0.25),textAlign:"center",lineHeight:1.6}}>
          Look for the room code on the bar's TV screen<br/>
          <span style={{color:C.gold,fontWeight:600}}>No account needed • Free to join</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SCREEN: LOBBY (Phone)
// ═══════════════════════════════════════════════════════════════
const PhoneLobby = ({players}) => (
  <div style={{width:375,height:812,background:C.grad.main,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit'",boxShadow:"0 25px 80px rgba(0,0,0,0.5),inset 0 0 0 3px rgba(255,255,255,0.08)"}}>
    <Orbs/>
    <div style={{height:50,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:2}}>
      <span style={{fontSize:13,fontWeight:600,color:C.w(0.4)}}>9:41</span>
      <Pill icon="📍">O'Malley's Pub</Pill>
    </div>

    <div style={{padding:"24px 28px",position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{fontSize:14,fontWeight:700,color:C.w(0.4),letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Room Code</div>
      <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:48,fontWeight:800,color:C.gold,letterSpacing:6,animation:"codeGlow 3s ease-in-out infinite",marginBottom:6}}>BR7X</div>
      <div style={{fontSize:13,color:C.w(0.35),marginBottom:32}}>Waiting for host to start...</div>

      <div style={{display:"flex",gap:8,marginBottom:36}}>
        {[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:C.w(0.3),animation:`dotBounce 1.2s ease-in-out ${i*.2}s infinite`}}/>)}
      </div>

      <div style={{width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:13,fontWeight:700,color:C.w(0.5),letterSpacing:1,textTransform:"uppercase"}}>Players Joined</span>
          <Pill>{players.length} / 30</Pill>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {players.map((p,i)=>(
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,
              background:i===2?`${C.blue}15`:C.w(0.04),border:i===2?`1px solid ${C.blue}30`:`1px solid ${C.w(0.04)}`,
              animation:`slideUp .3s ease-out ${i*.06}s both`,
            }}>
              <Av name={p.name} size={34}/>
              <span style={{flex:1,fontSize:15,fontWeight:600,color:"#fff"}}>{p.name}</span>
              {i===2&&<span style={{fontSize:10,fontWeight:700,color:C.blue,letterSpacing:1,textTransform:"uppercase"}}>YOU</span>}
              <span style={{fontSize:12,color:C.w(0.25)}}>✓ Ready</span>
            </div>
          ))}
        </div>

        <div style={{marginTop:24,padding:"16px 20px",borderRadius:14,background:C.w(0.06),border:`1px solid ${C.w(0.08)}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,color:C.w(0.35),fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Playing As</div>
              <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>Jake B 🎯</div>
            </div>
            <button style={{padding:"8px 14px",borderRadius:10,background:C.w(0.08),border:`1px solid ${C.w(0.1)}`,color:C.w(0.5),fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit'"}}>Change</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SCREEN: GAME (Phone)
// ═══════════════════════════════════════════════════════════════
const PhoneGame = ({question,answers,cat,qn,qt,sec,total,pts,pCount,aState}) => (
  <div style={{width:375,height:812,background:C.grad.main,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit'",boxShadow:"0 25px 80px rgba(0,0,0,0.5),inset 0 0 0 3px rgba(255,255,255,0.08)"}}>
    <Orbs/>
    <div style={{height:48,padding:"14px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:2}}>
      <span style={{fontSize:13,fontWeight:600,color:C.w(0.4)}}>9:41</span>
      <div style={{display:"flex",gap:5}}><div style={{width:16,height:10,borderRadius:2,border:`1px solid ${C.w(0.3)}`,position:"relative"}}><div style={{position:"absolute",left:1,top:1,bottom:1,width:"70%",borderRadius:1,background:C.green}}/></div></div>
    </div>

    <div style={{padding:"4px 24px 0",position:"relative",zIndex:2}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>🧠</span>
          <span style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:-.3}}>BarBrain</span>
        </div>
        <Pill icon="👥">{pCount}</Pill>
      </div>
      <div style={{marginTop:14,textAlign:"center",animation:"fadeDown .4s ease-out"}}>
        <Points value={pts} label="Points Available" size="lg"/>
      </div>
    </div>

    <div style={{padding:"16px 24px 0",position:"relative",zIndex:2}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
        <Timer sec={sec} total={total} size={72} sw={3.5}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <Pill icon={cat.icon}>{cat.name}</Pill>
        <span style={{fontFamily:"'Bricolage Grotesque'",fontSize:15,fontWeight:700,color:C.w(0.5)}}>{qn}<span style={{color:C.w(0.25)}}>/{qt}</span></span>
      </div>
      <div style={{height:3,borderRadius:2,background:C.w(0.08),marginBottom:14,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(qn/qt)*100}%`,borderRadius:2,background:C.grad.selected,transition:"width .5s ease"}}/>
      </div>
      <div style={{fontSize:19,fontWeight:700,color:"#fff",lineHeight:1.35,textAlign:"center",letterSpacing:-.3,textShadow:"0 2px 15px rgba(0,0,0,0.3)",animation:"fadeDown .4s ease-out",marginBottom:4}}>
        {question}
      </div>
    </div>

    <div style={{padding:"16px 20px 0",position:"relative",zIndex:2,display:"flex",flexDirection:"column",gap:9}}>
      {answers.map((a,i)=><AnsCard key={i} label={a} i={i} state={aState[i]||"default"} delay={i}/>)}
    </div>

    <div style={{position:"absolute",bottom:0,left:0,right:0,background:C.grad.footer,padding:"36px 20px 34px",zIndex:2}}>
      <Chat name="KatieBee" msg="Love this one! 🎵" d={0}/>
      <Chat name="TriviaNerd99" msg="easy 😎" d={.1}/>
      <Chat name="PubCrawler" msg="gotta be Frozen" d={.2}/>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SCREEN: RESULTS (Phone)
// ═══════════════════════════════════════════════════════════════
const PhoneResults = ({players}) => (
  <div style={{width:375,height:812,background:C.grad.main,borderRadius:44,overflow:"hidden",position:"relative",fontFamily:"'Outfit'",boxShadow:"0 25px 80px rgba(0,0,0,0.5),inset 0 0 0 3px rgba(255,255,255,0.08)"}}>
    <Orbs/>
    <div style={{height:48,padding:"14px 28px 0",display:"flex",justifyContent:"center",position:"relative",zIndex:2}}>
      <span style={{fontSize:13,fontWeight:600,color:C.w(0.4)}}>9:41</span>
    </div>

    <div style={{padding:"16px 24px",position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{position:"absolute",top:20,left:40,fontSize:14,animation:"confetti1 3s ease-out infinite",color:C.gold}}>✦</div>
      <div style={{position:"absolute",top:30,right:50,fontSize:12,animation:"confetti2 3.5s ease-out infinite .5s",color:C.pink}}>★</div>
      <div style={{position:"absolute",top:60,left:80,fontSize:10,animation:"confetti1 4s ease-out infinite 1s",color:C.blue}}>●</div>

      <div style={{fontSize:13,fontWeight:700,color:C.w(0.4),letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Game Over</div>
      <div style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-.5,marginBottom:4}}>Final Results</div>
      <div style={{fontSize:13,color:C.w(0.35),marginBottom:28}}>15 questions • O'Malley's Pub</div>

      {/* Podium */}
      <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:32}}>
        <div style={{textAlign:"center",animation:"slideUp .4s ease-out .1s both"}}>
          <Av name={players[1].name} rank={2} size={44}/>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",marginTop:6}}>{players[1].name}</div>
          <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:16,fontWeight:700,color:C.w(0.5)}}>{players[1].score.toLocaleString()}</div>
          <div style={{width:70,height:50,borderRadius:"8px 8px 0 0",background:C.w(0.06),marginTop:6,border:`1px solid ${C.w(0.08)}`,borderBottom:"none"}}/>
        </div>
        <div style={{textAlign:"center",animation:"slideUp .4s ease-out both"}}>
          <div style={{fontSize:24,animation:"crownBounce 2s ease-in-out infinite",marginBottom:4}}>👑</div>
          <Av name={players[0].name} rank={1} size={56} glow/>
          <div style={{fontSize:15,fontWeight:800,color:"#fff",marginTop:6}}>{players[0].name}</div>
          <Points value={players[0].score} size="sm"/>
          <div style={{width:80,height:80,borderRadius:"8px 8px 0 0",background:C.w(0.08),marginTop:6,border:`1px solid ${C.w(0.1)}`,borderBottom:"none"}}/>
        </div>
        <div style={{textAlign:"center",animation:"slideUp .4s ease-out .2s both"}}>
          <Av name={players[2].name} rank={3} size={40}/>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",marginTop:6}}>{players[2].name}</div>
          <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:15,fontWeight:700,color:C.w(0.5)}}>{players[2].score.toLocaleString()}</div>
          <div style={{width:65,height:35,borderRadius:"8px 8px 0 0",background:C.w(0.04),marginTop:6,border:`1px solid ${C.w(0.06)}`,borderBottom:"none"}}/>
        </div>
      </div>

      {/* Your stats */}
      <div style={{width:"100%",padding:"18px 20px",borderRadius:16,background:C.w(0.06),border:`1px solid ${C.blue}30`,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Av name="Jake B" size={36}/>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Jake B <span style={{fontSize:11,color:C.blue}}>— YOU</span></div>
              <div style={{fontSize:12,color:C.w(0.35)}}>4th Place</div>
            </div>
          </div>
          <Points value={9640} size="sm"/>
        </div>
        <div style={{display:"flex",gap:16}}>
          {[{l:"Correct",v:"10/15",c:C.green},{l:"Avg Speed",v:"4.2s",c:C.blue},{l:"Best Streak",v:"5 🔥",c:C.gold}].map((s,i)=>(
            <div key={i} style={{flex:1,textAlign:"center",padding:"10px 0",borderRadius:10,background:C.w(0.04)}}>
              <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.w(0.3),fontWeight:600,marginTop:2,letterSpacing:.5,textTransform:"uppercase"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {players.slice(3).map((p,i)=>(
        <div key={i} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:i===0?`${C.blue}10`:"transparent",border:i===0?`1px solid ${C.blue}20`:"1px solid transparent"}}>
          <span style={{fontFamily:"'Bricolage Grotesque'",fontSize:14,fontWeight:700,color:C.w(0.25),width:24,textAlign:"center"}}>{i+4}</span>
          <Av name={p.name} size={30}/>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:"#fff"}}>{p.name}{i===0&&<span style={{fontSize:10,color:C.blue,marginLeft:6}}>YOU</span>}</span>
          <span style={{fontFamily:"'Bricolage Grotesque'",fontSize:14,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
        </div>
      ))}

      <button style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:C.grad.selected,color:"#fff",fontSize:17,fontWeight:800,fontFamily:"'Outfit'",cursor:"pointer",marginTop:20,boxShadow:"0 6px 24px rgba(102,126,234,0.35)",letterSpacing:.3}}>
        🔄 Play Again
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SCREEN: TV GAME
// ═══════════════════════════════════════════════════════════════
const TVGame = ({question,answers,cat,qn,qt,sec,total,pts,players,aState,roomCode}) => (
  <div style={{width:960,height:540,background:C.grad.mainTV,borderRadius:12,overflow:"hidden",position:"relative",fontFamily:"'Outfit'",boxShadow:"0 20px 60px rgba(0,0,0,0.5),inset 0 0 0 2px rgba(255,255,255,0.06)"}}>
    <Orbs/>
    <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:C.grad.header,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:24}}>🧠</span>
          <span style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:-.3}}>BarBrain</span>
        </div>
        <div style={{background:C.w(0.08),borderRadius:10,padding:"5px 14px",backdropFilter:"blur(10px)"}}>
          <span style={{fontSize:10,fontWeight:600,color:C.w(0.4),letterSpacing:1}}>JOIN </span>
          <span style={{fontFamily:"'Bricolage Grotesque'",fontSize:18,fontWeight:800,color:C.gold,letterSpacing:3,animation:"codeGlow 3s ease-in-out infinite"}}>{roomCode}</span>
        </div>
      </div>
      <Points value={pts} label="Points Available" size="md"/>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <Pill icon="👥">{players.length}</Pill>
        <Timer sec={sec} total={total} size={50} sw={3}/>
      </div>
    </div>

    <div style={{position:"absolute",top:75,bottom:75,left:0,right:0,display:"flex",padding:"0 36px",gap:36,zIndex:5}}>
      <div style={{flex:1.2,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <Pill icon={cat.icon} style={{padding:"7px 16px"}}>{cat.name}</Pill>
          <span style={{fontFamily:"'Bricolage Grotesque'",fontSize:15,fontWeight:700,color:C.w(0.35)}}>Q{qn}<span style={{color:C.w(0.15)}}>/{qt}</span></span>
        </div>
        <div style={{fontSize:32,fontWeight:800,color:"#fff",lineHeight:1.25,letterSpacing:-.5,maxWidth:520,textShadow:"0 3px 20px rgba(0,0,0,0.4)",animation:"fadeDown .5s ease-out"}}>
          {question}
        </div>
        <div style={{height:4,borderRadius:2,background:C.w(0.06),marginTop:22,maxWidth:280,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(qn/qt)*100}%`,borderRadius:2,background:C.grad.selected,transition:"width .5s"}}/>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:11}}>
        {answers.map((a,i)=><AnsCard key={i} label={a} i={i} state={aState[i]||"default"} delay={i} tv/>)}
      </div>
    </div>

    <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:10,background:C.grad.footer,padding:"18px 36px 14px"}}>
      <div style={{display:"flex",justifyContent:"center",gap:36}}>
        {players.slice(0,6).map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:9,animation:`slideUp .35s ease-out ${i*.06}s both`}}>
            <Av name={p.name} rank={i+1} size={30}/>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#fff",lineHeight:1.2}}>{p.name}</div>
              <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SCREEN: TV LOBBY
// ═══════════════════════════════════════════════════════════════
const TVLobby = ({players,roomCode}) => (
  <div style={{width:960,height:540,background:C.grad.mainTV,borderRadius:12,overflow:"hidden",position:"relative",fontFamily:"'Outfit'",boxShadow:"0 20px 60px rgba(0,0,0,0.5),inset 0 0 0 2px rgba(255,255,255,0.06)"}}>
    <Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5}}>
      <span style={{fontSize:56,animation:"float 3s ease-in-out infinite",marginBottom:8}}>🧠</span>
      <div style={{fontSize:36,fontWeight:900,color:"#fff",letterSpacing:-1,marginBottom:4}}>BarBrain</div>
      <div style={{fontSize:16,color:C.w(0.4),fontWeight:500,marginBottom:36}}>Scan the code or enter it on your phone</div>

      <div style={{fontSize:12,fontWeight:700,color:C.w(0.35),letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Room Code</div>
      <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:72,fontWeight:800,color:C.gold,letterSpacing:12,animation:"codeGlow 3s ease-in-out infinite",marginBottom:32}}>{roomCode}</div>

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:28}}>
        <Pill icon="👥" style={{padding:"8px 18px"}}>{players.length} players joined</Pill>
        <div style={{display:"flex",gap:4}}>
          {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.w(0.2),animation:`dotBounce 1.2s ease-in-out ${i*.2}s infinite`}}/>)}
        </div>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        {players.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:12,background:C.w(0.06),border:`1px solid ${C.w(0.06)}`,animation:`popIn .3s ease-out ${i*.05}s both`}}>
            <Av name={p.name} size={28}/>
            <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{position:"absolute",bottom:16,left:0,right:0,textAlign:"center",zIndex:5}}>
      <span style={{fontSize:12,color:C.w(0.2)}}>barbrain.app</span>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [timer, setTimer] = useState(32);
  const [screen, setScreen] = useState("game");
  const [demo, setDemo] = useState("playing");
  const [aState, setAState] = useState({});

  useEffect(() => {
    const t = setInterval(() => setTimer(s => s <= 0 ? 45 : s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (demo === "answered_correct") setAState({0:"correct",2:"eliminated"});
    else if (demo === "answered_wrong") setAState({1:"wrong",0:"correct"});
    else if (demo === "hints") setAState({2:"eliminated",3:"eliminated"});
    else if (demo === "selected") setAState({0:"selected"});
    else setAState({});
  }, [demo]);

  const Q = '\u201CLet It Go\u201D is the theme song of which Disney movie?';
  const A = ["Frozen","Tangled","Cinderella","Snow White"];
  const cat = {icon:"\uD83C\uDFAC",name:"Entertainment"};
  const P = [
    {name:"Sarah M",score:12450},{name:"Jake B",score:11200},{name:"Mike D",score:10875},
    {name:"Chris K",score:9640},{name:"Lisa P",score:8920},{name:"Tom W",score:7350},
    {name:"Amy R",score:6200},{name:"Dan H",score:5800},
  ];

  const screens = {
    join:{label:"\uD83D\uDCF1 Join",phone:true},
    lobby:{label:"\u23F3 Lobby",phone:true,tv:true},
    game:{label:"\uD83C\uDFAE Game",phone:true,tv:true},
    results:{label:"\uD83C\uDFC6 Results",phone:true},
  };

  return (
    <div style={{minHeight:"100vh",background:"#07060c",fontFamily:"'Outfit'"}}>
      <Styles/>

      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(7,6,12,0.92)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.w(0.05)}`,padding:"12px 20px"}}>
        <div style={{maxWidth:1440,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🧠</span>
            <div>
              <span style={{fontSize:15,fontWeight:800,color:"#fff"}}>BarBrain</span>
              <span style={{fontSize:11,color:C.w(0.3),marginLeft:8}}>Interface Prototype v2</span>
            </div>
          </div>

          <div style={{display:"flex",gap:4}}>
            {Object.entries(screens).map(([k,v])=>(
              <button key={k} onClick={()=>setScreen(k)} style={{
                padding:"6px 14px",borderRadius:8,border:"none",
                background:screen===k?C.grad.selected:C.w(0.05),
                color:screen===k?"#fff":C.w(0.4),
                fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit'",
              }}>{v.label}</button>
            ))}
          </div>

          {screen==="game"&&(
            <div style={{display:"flex",gap:4}}>
              {[{k:"playing",l:"▶ Live"},{k:"selected",l:"👆 Tapped"},{k:"hints",l:"💡 Hints"},{k:"answered_correct",l:"✅ Correct"},{k:"answered_wrong",l:"❌ Wrong"}].map(d=>(
                <button key={d.k} onClick={()=>setDemo(d.k)} style={{
                  padding:"5px 10px",borderRadius:6,border:"none",
                  background:demo===d.k?C.w(0.12):"transparent",
                  color:demo===d.k?"#fff":C.w(0.3),
                  fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit'",
                }}>{d.l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:1440,margin:"0 auto",padding:"36px 20px 60px",display:"flex",justifyContent:"center",alignItems:"flex-start",gap:44,flexWrap:"wrap"}}>
        {screens[screen]?.tv&&(
          <div style={{animation:"popIn .4s ease-out"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.w(0.2),textAlign:"center",marginBottom:10,letterSpacing:2,textTransform:"uppercase"}}>
              📺 Bar TV — 16:9 Landscape
            </div>
            {screen==="lobby"&&<TVLobby players={P} roomCode="BR7X"/>}
            {screen==="game"&&<TVGame question={Q} answers={A} cat={cat} qn={7} qt={15} sec={timer} total={45} pts={1000} players={P} aState={aState} roomCode="BR7X"/>}
          </div>
        )}

        {screens[screen]?.phone&&(
          <div style={{animation:"popIn .4s ease-out .1s both"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.w(0.2),textAlign:"center",marginBottom:10,letterSpacing:2,textTransform:"uppercase"}}>
              📱 Player Phone — Portrait
            </div>
            {screen==="join"&&<PhoneJoin/>}
            {screen==="lobby"&&<PhoneLobby players={P.slice(0,6)}/>}
            {screen==="game"&&<PhoneGame question={Q} answers={A} cat={cat} qn={7} qt={15} sec={timer} total={45} pts={1000} pCount={14} aState={aState}/>}
            {screen==="results"&&<PhoneResults players={P}/>}
          </div>
        )}
      </div>

      {/* Typography comparison */}
      <div style={{maxWidth:1440,margin:"0 auto",padding:"0 20px 48px"}}>
        <div style={{background:C.w(0.02),borderRadius:14,border:`1px solid ${C.w(0.04)}`,padding:"24px 28px"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.w(0.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>🔤 Typography System</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:20}}>
            <div>
              <div style={{fontSize:11,color:C.w(0.3),fontWeight:600,marginBottom:8,letterSpacing:1}}>DISPLAY / NUMBERS</div>
              <div style={{fontFamily:"'Bricolage Grotesque'",fontSize:38,fontWeight:800,color:"#fff",letterSpacing:-1}}>Bricolage</div>
              <div style={{fontSize:11,color:C.w(0.25),marginTop:4,lineHeight:1.5}}>Scores, points, timer, room codes, ranks — warm geometric character with optical sizing</div>
            </div>
            <div>
              <div style={{fontSize:11,color:C.w(0.3),fontWeight:600,marginBottom:8,letterSpacing:1}}>UI / BODY TEXT</div>
              <div style={{fontFamily:"'Outfit'",fontSize:38,fontWeight:800,color:"#fff",letterSpacing:-1}}>Outfit</div>
              <div style={{fontSize:11,color:C.w(0.25),marginTop:4,lineHeight:1.5}}>Questions, answers, labels, navigation — clean geometric sans-serif, very readable</div>
            </div>
            <div>
              <div style={{fontSize:11,color:C.w(0.3),fontWeight:600,marginBottom:8,letterSpacing:1}}>POINTS IN ACTION</div>
              <Points value={12450} size="lg"/>
              <div style={{fontSize:11,color:C.w(0.25),marginTop:8,lineHeight:1.5}}>Bricolage 800wt + gold gradient + drop-shadow glow</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
