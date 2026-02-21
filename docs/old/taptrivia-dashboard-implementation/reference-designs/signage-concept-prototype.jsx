import { useState, useMemo } from "react";

// ================================================================
// TAP TRIVIA v6 — In-Game Signage Concept
// Shows bar content in the RIGHT PANEL during gameplay screens
// + full-screen signage for off-hours
// ================================================================

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    correct: "linear-gradient(135deg, #00c9a7, #2ee6b6)",
    dark: "linear-gradient(150deg, #06060f 0%, #0e0a24 40%, #1a0f3a 100%)",
  },
  w: a => `rgba(255,255,255,${a})`,
  b: a => `rgba(0,0,0,${a})`,
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea",
  purple: "#764ba2", darkGold: "#f7971e", amber: "#f59e0b", cyan: "#22d3ee",
};

const PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Chris K",score:10875},{name:"Jake",score:9640},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},
  {name:"Ryan T",score:4200},{name:"Emma L",score:3600},{name:"Josh P",score:2900},
];

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
    @keyframes popIn{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
    @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes slideRight{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes bounceIn{0%{transform:scale(1)}35%{transform:scale(1.07)}100%{transform:scale(1)}}
    @keyframes orb1{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(50px,-30px)scale(1.15)}66%{transform:translate(-25px,25px)scale(.9)}}
    @keyframes orb2{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-35px,45px)scale(.85)}66%{transform:translate(35px,-25px)scale(1.1)}}
    @keyframes confetti1{0%{transform:translateY(0)rotate(0);opacity:1}100%{transform:translateY(140px)rotate(720deg);opacity:0}}
    @keyframes trophy{0%{transform:scale(0)rotate(-30deg)}50%{transform:scale(1.2)rotate(5deg)}100%{transform:scale(1)rotate(0)}}
    @keyframes medalDrop{0%{transform:translateY(-30px)scale(0);opacity:0}60%{transform:translateY(4px)scale(1.1);opacity:1}100%{transform:translateY(0)scale(1);opacity:1}}
    @keyframes rankSlide{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes neonPulse{0%,100%{filter:drop-shadow(0 0 8px rgba(245,158,11,.4))}50%{filter:drop-shadow(0 0 20px rgba(245,158,11,.7))}}
    @keyframes codeGlow{0%,100%{text-shadow:0 0 20px rgba(255,210,0,.3)}50%{text-shadow:0 0 40px rgba(255,210,0,.6),0 0 60px rgba(255,210,0,.3)}}
    @keyframes categoryZoom{0%{transform:scale(.5);opacity:0}50%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes dotPulse{0%,100%{opacity:.3}50%{opacity:1}}
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.05);opacity:1}}
    @keyframes statusPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,212,170,.4)}50%{box-shadow:0 0 0 6px rgba(0,212,170,0)}}
    @keyframes barReveal{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes panelSlide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes cardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
  `}</style>
);

const Orbs = () => (
  <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(102,126,234,.12) 0%,transparent 70%)",top:"-8%",right:"8%",animation:"orb1 22s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,51,74,.1) 0%,transparent 70%)",bottom:"8%",left:"3%",animation:"orb2 28s ease-in-out infinite"}}/>
  </div>
);

const Logo = ({size="md"}) => {
  const s = {sm:{text:17},md:{text:22},lg:{text:32},xl:{text:44}}[size];
  return (
    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:s.text,fontWeight:700,letterSpacing:-.5,lineHeight:1}}>
      <span style={{color:"#fff"}}>Tap</span><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
    </span>
  );
};

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

const QRCode = ({size=160}) => {
  const grid=25, cellSize=size/grid;
  const cells = useMemo(()=>{
    const r=[];let s=48271;
    const inF=(cx,cy,x,y)=>x>=cx&&x<cx+7&&y>=cy&&y<cy+7;
    const inB=(cx,cy,x,y)=>inF(cx,cy,x,y)&&!(x>cx&&x<cx+6&&y>cy&&y<cy+6);
    const inC=(cx,cy,x,y)=>x>=cx+2&&x<cx+5&&y>=cy+2&&y<cy+5;
    for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
      if(inB(0,0,x,y)||inC(0,0,x,y)||inB(18,0,x,y)||inC(18,0,x,y)||inB(0,18,x,y)||inC(0,18,x,y))r.push({x,y,f:true});
      else if(inF(0,0,x,y)||inF(18,0,x,y)||inF(0,18,x,y))r.push({x,y,f:false});
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

const Confetti = ({color,left,delay,size=8}) => (
  <div style={{position:"absolute",top:-10,left:`${left}%`,width:size,height:size*1.4,background:color,borderRadius:2,animation:`confetti1 ${1.5+Math.random()}s ease-out ${delay}s forwards`,transform:`rotate(${Math.random()*360}deg)`,opacity:0,animationFillMode:"forwards"}}/>
);

const TVFrame = ({children}) => (
  <div style={{width:960,height:540,background:C.grad.main,borderRadius:12,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 25px 80px rgba(0,0,0,.5),inset 0 0 0 3px rgba(255,255,255,.08)"}}>
    {children}
  </div>
);

const BarLogo = ({size=44}) => (
  <div style={{width:size,height:size,borderRadius:size*.2,background:"linear-gradient(135deg,#2a1a4e,#3d2266)",border:`2px solid ${C.w(.15)}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:1}}>
    <span style={{fontSize:size*.28,fontWeight:800,color:C.gold,fontFamily:"'Fredoka',sans-serif",lineHeight:1}}>Mo's</span>
    <span style={{fontSize:size*.11,fontWeight:600,color:C.w(.5),letterSpacing:.5,textTransform:"uppercase"}}>Tavern</span>
  </div>
);

const SignageHeader = () => (
  <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <BarLogo size={44}/>
      <div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff"}}>Mo's Tavern</div>
        <div style={{fontSize:10,color:C.w(.35),fontWeight:500}}>Monroe, NC</div>
      </div>
    </div>
    <Logo size="sm"/>
  </div>
);


// ================================================================
// IN-GAME SIGNAGE PANEL — Compact right-side cards
// These render inside the game screens' right panel
// ================================================================

const SignagePanel = ({type="specials"}) => {
  // The panel that replaces the right side of game screens
  // ~340px wide, full height of TV
  const panelBg = "rgba(0,0,0,.35)";

  if (type === "specials") return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"18px 20px",animation:"panelSlide .5s ease-out"}}>
      {/* Bar header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <BarLogo size={32}/>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Mo's Tavern</div>
          <div style={{fontSize:9,color:C.w(.35)}}>Monroe, NC</div>
        </div>
      </div>

      {/* Specials content */}
      <div style={{fontSize:9,fontWeight:700,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🍺 Tonight's Specials</div>

      {/* Featured deal */}
      <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.04))",borderRadius:14,padding:"14px 16px",border:`1px solid rgba(245,158,11,.15)`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.1}}>Margarita Pitcher</div>
            <div style={{fontSize:10,color:C.w(.4),marginTop:3}}>House lime, Cointreau, fresh squeeze</div>
          </div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:C.green}}>$18</div>
        </div>
      </div>

      {/* Menu items */}
      <div style={{display:"flex",flexDirection:"column",gap:6,flex:1}}>
        {[
          {icon:"🍺",name:"Draft Beers",desc:"All domestics",price:"$3"},
          {icon:"🍸",name:"Well Drinks",desc:"Vodka, rum, whiskey",price:"$4"},
          {icon:"🍗",name:"Wings Basket",desc:"12 ct. buffalo or BBQ",price:"$8"},
          {icon:"🌮",name:"Loaded Nachos",desc:"Beef, cheese, jalapeños",price:"$10"},
        ].map((item,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.w(.03),borderRadius:10,border:`1px solid ${C.w(.03)}`,animation:`slideRight .3s ease-out ${i*.06}s both`}}>
            <span style={{fontSize:18}}>{item.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{item.name}</div>
              <div style={{fontSize:9,color:C.w(.35)}}>{item.desc}</div>
            </div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.green}}>{item.price}</div>
          </div>
        ))}
      </div>

      {/* QR + Join at bottom */}
      <div style={{display:"flex",alignItems:"center",gap:12,background:C.b(.3),borderRadius:12,padding:"10px 14px",marginTop:12,border:`1px solid ${C.w(.05)}`}}>
        <QRCode size={48}/>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Join Trivia!</div>
          <div style={{fontSize:10,color:C.gold,fontWeight:600}}>taptrivia.com</div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
            <span style={{fontSize:8,fontWeight:600,color:C.w(.3),letterSpacing:1}}>CODE</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (type === "happyhour") return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"18px 20px",animation:"panelSlide .5s ease-out"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <BarLogo size={32}/>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Mo's Tavern</div>
          <div style={{fontSize:9,color:C.w(.35)}}>Monroe, NC</div>
        </div>
      </div>

      <div style={{fontSize:9,fontWeight:700,color:"#e879f9",letterSpacing:2,textTransform:"uppercase",marginBottom:6,animation:"neonPulse 2s ease-in-out infinite"}}>🍹 Happy Hour</div>

      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:4}}>4 – 7 PM</div>
      <div style={{fontSize:12,color:C.w(.4),marginBottom:16}}>Every weekday</div>

      <div style={{display:"flex",flexDirection:"column",gap:10,flex:1}}>
        {[
          {deal:"50% OFF",item:"All Drafts",color:C.amber},
          {deal:"$5",item:"House Wine",color:"#e879f9"},
          {deal:"$6",item:"Appetizers",color:C.green},
        ].map((d,i) => (
          <div key={i} style={{background:C.w(.04),borderRadius:14,padding:"16px 18px",border:`1px solid ${C.w(.04)}`,textAlign:"center",animation:`slideUp .3s ease-out ${i*.08}s both`}}>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:d.color}}>{d.deal}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.w(.5),marginTop:2}}>{d.item}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,background:C.b(.3),borderRadius:12,padding:"10px 14px",marginTop:12,border:`1px solid ${C.w(.05)}`}}>
        <QRCode size={48}/>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Join Trivia!</div>
          <div style={{fontSize:10,color:C.gold,fontWeight:600}}>taptrivia.com</div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
            <span style={{fontSize:8,fontWeight:600,color:C.w(.3),letterSpacing:1}}>CODE</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
          </div>
        </div>
      </div>
    </div>
  );

  // event type
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"18px 20px",animation:"panelSlide .5s ease-out"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <BarLogo size={32}/>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Mo's Tavern</div>
          <div style={{fontSize:9,color:C.w(.35)}}>Monroe, NC</div>
        </div>
      </div>

      <div style={{fontSize:9,fontWeight:700,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>🎧 Coming Up</div>

      <div style={{textAlign:"center",padding:"12px 0",flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{fontSize:48,marginBottom:12,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)"}}>🎤</div>
        <div style={{fontSize:10,fontWeight:700,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>This Saturday</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:6}}>Karaoke Night</div>
        <div style={{fontSize:12,color:C.w(.4),marginBottom:20}}>9 PM • Free to sing</div>

        <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 8px"}}>
          {[
            {emoji:"🥇",place:"Best Solo",prize:"$50 Tab"},
            {emoji:"🥈",place:"Best Duo",prize:"$25 Tab"},
            {emoji:"🥉",place:"Crowd Fav",prize:"Free Apps"},
          ].map((p,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:C.w(.04),borderRadius:10,padding:"10px 14px",border:`1px solid ${C.w(.04)}`,animation:`slideRight .3s ease-out ${i*.06}s both`}}>
              <span style={{fontSize:20}}>{p.emoji}</span>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:700,color:C.gold}}>{p.place}</div>
                <div style={{fontSize:10,color:C.w(.4)}}>{p.prize}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,background:C.b(.3),borderRadius:12,padding:"10px 14px",marginTop:12,border:`1px solid ${C.w(.05)}`}}>
        <QRCode size={48}/>
        <div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff"}}>Join Trivia!</div>
          <div style={{fontSize:10,color:C.gold,fontWeight:600}}>taptrivia.com</div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
            <span style={{fontSize:8,fontWeight:600,color:C.w(.3),letterSpacing:1}}>CODE</span>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
          </div>
        </div>
      </div>
    </div>
  );
};


// ================================================================
// SCENARIO A: IN-GAME TV SCREENS (with right-side signage)
// ================================================================

// 1. TV IDLE / LOBBY — Left: QR + join, Right: bar signage
const TVIdleWithSignage = ({signageType}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5}}>
      {/* LEFT — Join area */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 40px"}}>
        <div style={{animation:"breathe 4s ease-in-out infinite",marginBottom:24}}>
          <Logo size="lg"/>
        </div>
        <div style={{fontSize:16,color:C.w(.45),fontWeight:500,marginBottom:32}}>Scan to join or enter code below</div>
        <div style={{animation:"float 4s ease-in-out infinite"}}>
          <QRCode size={180}/>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.3),letterSpacing:2,textTransform:"uppercase",marginTop:24}}>Or Enter Code</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:C.gold,letterSpacing:8,marginTop:8,animation:"codeGlow 3s ease-in-out infinite"}}>BR7X</div>
        <div style={{fontSize:13,color:C.w(.3),marginTop:8}}>taptrivia.com/join</div>

        {/* Player count */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:24,background:C.w(.06),borderRadius:12,padding:"8px 16px"}}>
          <div style={{display:"flex"}}>
            {PLAYERS.slice(0,5).map((p,i) => (
              <div key={i} style={{width:28,height:28,borderRadius:"50%",marginLeft:i>0?-8:0,border:`2px solid rgba(15,3,38,.8)`}}>
                <Av name={p.name} size={24}/>
              </div>
            ))}
          </div>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:"#fff"}}>{PLAYERS.length}</span>
          <span style={{fontSize:12,color:C.w(.4)}}>players ready</span>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{width:1,background:`linear-gradient(180deg,transparent,${C.w(.08)},${C.w(.08)},transparent)`,margin:"40px 0"}}/>

      {/* RIGHT — Bar signage */}
      <div style={{width:340,background:"rgba(0,0,0,.15)",backdropFilter:"blur(8px)"}}>
        <SignagePanel type={signageType}/>
      </div>
    </div>
  </TVFrame>
);

// 2. TV LEADERBOARD — Left: podium + top 5, Right: bar signage
const TVLeaderboardWithSignage = ({signageType}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5}}>
      {/* LEFT — Podium + standings */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 32px"}}>
        <div style={{marginBottom:6}}><Logo size="sm"/></div>
        <div style={{fontSize:12,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:20}}>After Question 7</div>

        {/* Podium */}
        <div style={{display:"flex",alignItems:"flex-end",gap:14,marginBottom:20}}>
          {[1,0,2].map(idx => {
            const p = PLAYERS[idx];
            const r = idx+1;
            const h = {0:115,1:88,2:68}[idx];
            return (
              <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
                <div style={{animation:`medalDrop .5s ease-out ${idx*.15+.3}s both`}}>
                  <Av name={p.name} rank={r} size={r===1?52:42}/>
                </div>
                <div style={{fontSize:r===1?14:12,fontWeight:700,color:"#fff",marginTop:6}}>{p.name}</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?20:15,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
                <div style={{width:r===1?82:68,height:h,marginTop:8,borderRadius:"12px 12px 0 0",
                  background:r===1?`linear-gradient(180deg,${C.gold}35,${C.gold}10)`:r===2?`linear-gradient(180deg,${C.w(.12)},${C.w(.04)})`:`linear-gradient(180deg,${C.darkGold}25,${C.darkGold}08)`,
                  border:`1px solid ${r===1?`${C.gold}35`:C.w(.06)}`,borderBottom:"none",
                  display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:12}}>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:r===1?C.gold:C.w(.25)}}>{r}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4th & 5th */}
        <div style={{display:"flex",gap:12,width:"100%",maxWidth:420,padding:"0 10px"}}>
          {PLAYERS.slice(3,5).map((p,i) => {
            const rank = i+4;
            const isYou = p.name==="Jake";
            return (
              <div key={i} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.w(.04),borderRadius:10,border:`1px solid ${C.w(.04)}`,animation:`rankSlide .3s ease-out ${i*.06}s both`}}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.w(.25),width:18}}>{rank}</span>
                <Av name={p.name} size={26} you={isYou}/>
                <span style={{flex:1,fontSize:12,fontWeight:isYou?700:500,color:C.w(isYou?1:.6),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <div style={{fontSize:11,color:C.w(.25),marginTop:14,animation:"pulse 2s infinite"}}>Next question in 5s...</div>
      </div>

      {/* DIVIDER */}
      <div style={{width:1,background:`linear-gradient(180deg,transparent,${C.w(.08)},${C.w(.08)},transparent)`,margin:"30px 0"}}/>

      {/* RIGHT — Bar signage */}
      <div style={{width:340,background:"rgba(0,0,0,.15)",backdropFilter:"blur(8px)"}}>
        <SignagePanel type={signageType}/>
      </div>
    </div>
  </TVFrame>
);

// 3. TV RESULTS — Left: Game Over + podium + top 5, Right: bar signage
const TVResultsWithSignage = ({signageType}) => (
  <TVFrame><Orbs/>
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>
      {Array.from({length:16}).map((_,i)=><Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81","#ffe066"][i%7]} left={3+i*4} delay={i*.1} size={5+Math.random()*7}/>)}
    </div>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5}}>
      {/* LEFT — Game over + podium + top 5 */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px 32px"}}>
        <div style={{fontSize:52,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:8}}>🏆</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:2}}>Game Over!</div>
        <div style={{fontSize:12,color:C.w(.4),marginBottom:18}}>15 questions · {PLAYERS.length} players</div>

        {/* Podium */}
        <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:16}}>
          {[1,0,2].map(idx => {
            const p = PLAYERS[idx];
            const r = idx+1;
            return (
              <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
                <Av name={p.name} rank={r} size={r===1?50:40}/>
                <div style={{fontSize:r===1?13:11,fontWeight:700,color:"#fff",marginTop:5}}>{p.name}</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?18:14,fontWeight:700,color:C.gold,marginTop:1}}>{p.score.toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        {/* 4th & 5th */}
        <div style={{display:"flex",gap:10,width:"100%",maxWidth:400,padding:"0 8px"}}>
          {PLAYERS.slice(3,5).map((p,i) => {
            const rank = i+4;
            return (
              <div key={i} style={{flex:1,display:"flex",alignItems:"center",gap:7,padding:"7px 12px",background:C.w(.04),borderRadius:9,border:`1px solid ${C.w(.04)}`,animation:`rankSlide .3s ease-out ${i*.05}s both`}}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.w(.25),width:16}}>{rank}</span>
                <Av name={p.name} size={24}/>
                <span style={{flex:1,fontSize:11,fontWeight:500,color:C.w(.6)}}>{p.name}</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <div style={{fontSize:12,color:C.w(.3),marginTop:16}}>Next game starts soon — stay tuned!</div>
      </div>

      {/* DIVIDER */}
      <div style={{width:1,background:`linear-gradient(180deg,transparent,${C.w(.08)},${C.w(.08)},transparent)`,margin:"30px 0"}}/>

      {/* RIGHT — Bar signage */}
      <div style={{width:340,background:"rgba(0,0,0,.15)",backdropFilter:"blur(8px)"}}>
        <SignagePanel type={signageType}/>
      </div>
    </div>
  </TVFrame>
);


// ================================================================
// SCENARIO B: OFF-HOURS FULL-SCREEN SIGNAGE
// ================================================================

const TVFullSpecials = () => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#0a0612,#1a0f30 30%,#2d1550 60%,#1a0f30)"}}><Orbs/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:70}}>
      <div style={{flex:1.1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>🍺 Tonight's Specials</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:44,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:20}}>Happy Hour<br/><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>All Day Tuesday</span></div>
        <div style={{background:C.w(.06),borderRadius:20,padding:"20px 24px",border:`1px solid ${C.w(.06)}`,maxWidth:380}}>
          <div style={{fontSize:11,fontWeight:600,color:C.amber,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Featured</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>Margarita Pitcher</div>
              <div style={{fontSize:13,color:C.w(.4),marginTop:4}}>House lime, Cointreau, fresh squeeze</div>
            </div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:C.green}}>$18</div>
          </div>
        </div>
      </div>
      <div style={{flex:.9,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 36px 0 0",gap:12}}>
        {[
          {icon:"🍺",name:"Draft Beers",desc:"All domestics",price:"$3"},
          {icon:"🍸",name:"Well Drinks",desc:"Vodka, rum, whiskey",price:"$4"},
          {icon:"🍗",name:"Wings Basket",desc:"12 ct. buffalo or BBQ",price:"$8"},
          {icon:"🌮",name:"Loaded Nachos",desc:"Beef, cheese, jalapeños",price:"$10"},
        ].map((item,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",background:C.w(.04),borderRadius:14,border:`1px solid ${C.w(.04)}`,animation:`slideRight .3s ease-out ${i*.08}s both`}}>
            <span style={{fontSize:28}}>{item.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{item.name}</div>
              <div style={{fontSize:12,color:C.w(.4)}}>{item.desc}</div>
            </div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:C.green}}>{item.price}</div>
          </div>
        ))}
      </div>
    </div>
    {/* QR bottom-right */}
    <div style={{position:"absolute",bottom:14,right:20,zIndex:20,display:"flex",alignItems:"center",gap:14,background:"rgba(0,0,0,.55)",backdropFilter:"blur(12px)",borderRadius:16,padding:"12px 18px 12px 14px",border:`1px solid ${C.w(.08)}`}}>
      <QRCode size={72}/>
      <div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:"#fff",lineHeight:1.2}}>Get the App!</div>
        <div style={{fontSize:11,fontWeight:600,color:C.gold,marginTop:3}}>taptrivia.com</div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5}}>
          <span style={{fontSize:9,fontWeight:600,color:C.w(.4),letterSpacing:1}}>JOIN</span>
          <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span>
        </div>
      </div>
    </div>
  </TVFrame>
);


// ================================================================
// SCREEN NAVIGATOR
// ================================================================

const SCREENS = [
  {key:"idle",label:"🏠 Idle / Lobby",desc:"Waiting for players — right panel shows bar content",scenario:"A"},
  {key:"leaderboard",label:"🏅 Leaderboard",desc:"Between questions — top 5 + bar content on right",scenario:"A"},
  {key:"results",label:"🏆 Results",desc:"Game over — podium + top 5 + bar content on right",scenario:"A"},
  {key:"offhours",label:"📺 Off-Hours",desc:"Full-screen signage when no game is running",scenario:"B"},
];

const SIGNAGE_TYPES = [
  {key:"specials",label:"🍺 Specials"},
  {key:"happyhour",label:"🍹 Happy Hour"},
  {key:"event",label:"🎧 Event"},
];

export default function App() {
  const [screen, setScreen] = useState("idle");
  const [signageType, setSignageType] = useState("specials");

  const renderScreen = () => {
    switch(screen) {
      case "idle": return <TVIdleWithSignage signageType={signageType}/>;
      case "leaderboard": return <TVLeaderboardWithSignage signageType={signageType}/>;
      case "results": return <TVResultsWithSignage signageType={signageType}/>;
      case "offhours": return <TVFullSpecials/>;
      default: return <TVIdleWithSignage signageType={signageType}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#08080c",fontFamily:"'Outfit',sans-serif"}}>
      <Styles/>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,12,.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.w(.05)}`,padding:"12px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Logo size="sm"/>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1,background:C.w(.06),borderRadius:6,padding:"3px 10px"}}>v6 SIGNAGE CONCEPT</span>
          </div>
          <div style={{fontSize:10,color:C.w(.2)}}>
            Two scenarios: In-game right panel + Off-hours full-screen
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px 0"}}>
        {/* Scenario labels + screen buttons */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1.5,marginBottom:8}}>📺 TV SCREEN:</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {SCREENS.map((s,i) => {
              const isSep = i > 0 && SCREENS[i-1].scenario !== s.scenario;
              return (
                <div key={s.key} style={{display:"flex",alignItems:"center",gap:4}}>
                  {isSep && (
                    <div style={{width:1,height:24,background:C.w(.1),margin:"0 8px"}}/>
                  )}
                  <button onClick={()=>setScreen(s.key)} style={{
                    padding:"7px 14px",borderRadius:8,border:"none",
                    background:screen===s.key?C.grad.selected:C.w(.06),
                    color:screen===s.key?"#fff":C.w(.5),
                    fontSize:11,fontWeight:600,cursor:"pointer",
                    fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",transition:"all .15s",
                  }}>
                    <span style={{fontSize:8,fontWeight:700,color:screen===s.key?C.w(.6):C.w(.2),letterSpacing:1,marginRight:6}}>
                      {s.scenario==="A"?"IN-GAME":"OFF-HOURS"}
                    </span>
                    {s.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signage type selector (only for in-game screens) */}
        {screen !== "offhours" && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1.5,marginBottom:6}}>RIGHT PANEL CONTENT:</div>
            <div style={{display:"flex",gap:4}}>
              {SIGNAGE_TYPES.map(t => (
                <button key={t.key} onClick={()=>setSignageType(t.key)} style={{
                  padding:"6px 14px",borderRadius:8,border:"none",
                  background:signageType===t.key?"rgba(245,158,11,.15)":"transparent",
                  color:signageType===t.key?C.amber:C.w(.35),
                  border:`1px solid ${signageType===t.key?"rgba(245,158,11,.25)":C.w(.06)}`,
                  fontSize:11,fontWeight:600,cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif",transition:"all .15s",
                }}>{t.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:screen==="offhours"?C.amber:C.green,animation:"statusPulse 2s infinite"}}/>
          <span style={{fontSize:12,color:C.w(.3)}}>
            {SCREENS.find(s=>s.key===screen)?.desc}
          </span>
        </div>
      </div>

      {/* TV Screen */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 60px"}}>
        <div style={{display:"flex",justifyContent:"center"}}>
          <div key={`${screen}-${signageType}`} style={{animation:"popIn .35s ease-out"}}>
            {renderScreen()}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 60px"}}>
        <div style={{display:"flex",gap:20}}>
          <div style={{flex:1,background:C.w(.02),borderRadius:16,padding:"24px 28px",border:`1px solid ${C.w(.04)}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:8}}>SCENARIO A: In-Game</div>
            <div style={{fontSize:12,color:C.w(.35),lineHeight:1.6}}>
              During trivia, the right ~35% of the TV shows bar content on 3 key screens: Idle (waiting), Leaderboard (between every question), and Results (game over). A 15-question game = 17+ impressions of bar specials during peak engagement.
            </div>
          </div>
          <div style={{flex:1,background:C.w(.02),borderRadius:16,padding:"24px 28px",border:`1px solid ${C.w(.04)}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:8}}>SCENARIO B: Off-Hours</div>
            <div style={{fontSize:12,color:C.w(.35),lineHeight:1.6}}>
              When no game is running, the TV shows full-screen signage slides rotating on a timer. Same content, bigger canvas. This is most of the day — making the TV valuable even when trivia isn't happening.
            </div>
          </div>
          <div style={{flex:1,background:C.w(.02),borderRadius:16,padding:"24px 28px",border:`1px solid ${C.w(.04)}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:8}}>One Creation Flow</div>
            <div style={{fontSize:12,color:C.w(.35),lineHeight:1.6}}>
              Bar owners create content once in the dashboard. The system renders it two ways — compact card for the in-game right panel, and full-screen for off-hours. Same specials, same deals, zero extra work.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
