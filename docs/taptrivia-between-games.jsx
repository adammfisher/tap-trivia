import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// TAP TRIVIA — Between-Game Experience Prototype
// 4 phases: Podium → Bar Rankings → National Top 25 → Hype CTA
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
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes orb1{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(50px,-30px)scale(1.15)}66%{transform:translate(-25px,25px)scale(.9)}}
    @keyframes orb2{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-35px,45px)scale(.85)}66%{transform:translate(35px,-25px)scale(1.1)}}
    @keyframes confetti1{0%{transform:translateY(0)rotate(0);opacity:1}100%{transform:translateY(140px)rotate(720deg);opacity:0}}
    @keyframes trophy{0%{transform:scale(0)rotate(-30deg)}50%{transform:scale(1.2)rotate(5deg)}100%{transform:scale(1)rotate(0)}}
    @keyframes rankSlide{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes medalDrop{0%{transform:translateY(-30px)scale(0);opacity:0}60%{transform:translateY(4px)scale(1.1);opacity:1}100%{transform:translateY(0)scale(1);opacity:1}}
    @keyframes countdownNum{0%{transform:scale(2);opacity:0}30%{transform:scale(0.9);opacity:1}50%{transform:scale(1)}100%{transform:scale(1);opacity:1}}
    @keyframes glowPulse{0%,100%{box-shadow:0 0 15px rgba(102,126,234,.25)}50%{box-shadow:0 0 30px rgba(102,126,234,.5)}}
    @keyframes barGrow{from{width:0}to{width:var(--target-width)}}
    @keyframes slideInLeft{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes slideInRight{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.05);opacity:1}}
    @keyframes codeGlow{0%,100%{text-shadow:0 0 20px rgba(255,210,0,.3)}50%{text-shadow:0 0 40px rgba(255,210,0,.6),0 0 60px rgba(255,210,0,.3)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes rankUp{0%{transform:translateY(6px);opacity:0}100%{transform:translateY(0);opacity:1}}
    @keyframes barFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes dotPulse{0%,100%{opacity:.3}50%{opacity:1}}
    @keyframes crownBounce{0%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-3px) rotate(-5deg)}75%{transform:translateY(-3px) rotate(5deg)}100%{transform:translateY(0) rotate(0deg)}}
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

// ─── Logo ───
const Logo = ({size="md"}) => {
  const s = {sm:{text:17},md:{text:22},lg:{text:32},xl:{text:44}}[size];
  return (
    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:s.text,fontWeight:700,letterSpacing:-.5,lineHeight:1}}>
      <span style={{color:"#fff"}}>Tap</span><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Trivia</span>
    </span>
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

// ─── QR Code ───
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

// ─── Confetti ───
const Confetti = ({color,left,delay,size=8}) => (
  <div style={{position:"absolute",top:-10,left:`${left}%`,width:size,height:size*1.4,background:color,borderRadius:2,animation:`confetti1 ${1.5+Math.random()}s ease-out ${delay}s forwards`,transform:`rotate(${Math.random()*360}deg)`,opacity:0,animationFillMode:"forwards"}}/>
);

// ─── TV Frame ───
const TVFrame = ({children}) => (
  <div style={{width:960,height:540,background:C.grad.main,borderRadius:12,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 20px 60px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,255,255,.06)"}}>
    {children}
  </div>
);

// ─── Persistent Countdown Timer (top center) ───
const CountdownBar = ({seconds}) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const display = `${m}m ${s.toString().padStart(2,"0")}s`;
  const urgent = seconds <= 15;
  return (
    <div style={{
      position:"absolute",top:0,left:0,right:0,zIndex:30,
      display:"flex",justifyContent:"center",alignItems:"center",
      padding:"10px 0 8px",
      background:"linear-gradient(180deg, rgba(0,0,0,.6) 0%, rgba(0,0,0,.2) 70%, transparent 100%)",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:10,fontWeight:600,color:C.w(.35),letterSpacing:1.5,textTransform:"uppercase"}}>Next Game In</span>
        <span style={{
          fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,
          color:urgent?C.gold:"#fff",letterSpacing:1,lineHeight:1,
          animation:urgent?"pulse 1s infinite":"none",
          filter:urgent?`drop-shadow(0 0 8px ${C.gold}60)`:"none",
        }}>{display}</span>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════════════════════════

const THIS_GAME_PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Chris K",score:10875},{name:"Jake",score:9640},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},
  {name:"Ryan T",score:4200},{name:"Emma L",score:3900},{name:"Josh P",score:3400},
].sort((a,b)=>b.score-a.score);

// Bar rankings — statewide
const BARS = [
  {name:"The Thirsty Scholar",city:"Asheville",index:7840,rank:5,delta:3},
  {name:"Connestee Social Club",city:"Brevard",index:7620,rank:6,delta:5,isYou:true},
  {name:"Oskar Blues",city:"Brevard",index:7380,rank:7,delta:-1},
  {name:"The Oak & Ivy",city:"Charlotte",index:7150,rank:8,delta:0},
  {name:"Whiskey & Rye",city:"Asheville",index:6920,rank:9,delta:-4},
];

// National top 25 players (city/state from their bar record)
const TOP25 = [
  {name:"DrinkMaster",bar:"Lucky's Tap Room",city:"Austin, TX",score:98420},
  {name:"QuizWhiz99",bar:"The Brass Monkey",city:"NYC, NY",score:94100},
  {name:"BeerBrain",bar:"Hops & Dreams",city:"Portland, OR",score:91875},
  {name:"TriviaQueen",bar:"The Tipsy Scholar",city:"Denver, CO",score:88650},
  {name:"BarFly42",bar:"Corner Pocket",city:"Nashville, TN",score:86200},
  {name:"NerdAlert",bar:"The Brain Drain",city:"Chicago, IL",score:82440},
  {name:"PintSized",bar:"Mcgillycuddy's",city:"Seattle, WA",score:80100},
  {name:"FactHunter",bar:"O'Brien's",city:"Boston, MA",score:78900},
  {name:"HappyHour",bar:"Sunset Lounge",city:"Miami, FL",score:77200},
  {name:"BuzzkillBob",bar:"The Whistle Stop",city:"Philly, PA",score:75650},
  {name:"WisePint",bar:"The Oak & Ivy",city:"Charlotte, NC",score:74300},
  {name:"LastCall",bar:"Midnight Run",city:"Atlanta, GA",score:72800},
  {name:"TapKing",bar:"The Golden Tap",city:"San Diego, CA",score:71400},
  {name:"Stumped",bar:"Puzzle Palace",city:"Detroit, MI",score:70100},
  {name:"QuizMeElmo",bar:"Sesame Sips",city:"LA, CA",score:68900},
  {name:"BrainFreeze",bar:"The Ice House",city:"Minneapolis, MN",score:67500},
  {name:"RoundTrip",bar:"Departure Lounge",city:"SFO, CA",score:66200},
  {name:"FactOrFiction",bar:"Two Truths Bar",city:"Dallas, TX",score:64800},
  {name:"ThinkTwice",bar:"Second Guess",city:"Raleigh, NC",score:63400},
  {name:"PubCrawler",bar:"The Fifth Pint",city:"DC",score:62100},
  {name:"AleXpert",bar:"The Cask Room",city:"New Orleans, LA",score:60800},
  {name:"Quizzard",bar:"Merlin's Tap",city:"Phoenix, AZ",score:59400},
  {name:"SipNThink",bar:"Ponder Brewing",city:"Tampa, FL",score:58100},
  {name:"BrainDrain",bar:"The Study Hall",city:"Columbus, OH",score:56800},
  {name:"LastRound",bar:"Final Call",city:"KC, MO",score:55500},
];

// Next game categories
const NEXT_CATEGORIES = ["🎬 Entertainment","⚽ Sports","🧪 Science","🌍 Geography","📚 History"];


// ═══════════════════════════════════════════════════════════════
// PHASE 1: PODIUM (30 seconds)
// ═══════════════════════════════════════════════════════════════

const PhasePodium = () => (
  <TVFrame><Orbs/>
    {/* Confetti */}
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:6}}>
      {Array.from({length:20}).map((_,i)=>
        <Confetti key={i} color={[C.gold,C.red,C.green,C.blue,C.purple,"#ff6b81","#ffe066"][i%7]} left={2+i*4.8} delay={i*.08} size={5+Math.random()*7}/>
      )}
    </div>

    <CountdownBar seconds={118}/>

    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:48}}>
      {/* LEFT — Podium */}
      <div style={{flex:1.1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px"}}>
        <div style={{fontSize:48,animation:"trophy .6s cubic-bezier(.34,1.56,.64,1)",marginBottom:8}}>🏆</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:2}}>Game Over!</div>
        <div style={{fontSize:13,color:C.w(.4),marginBottom:24}}>15 questions · {THIS_GAME_PLAYERS.length} players</div>

        {/* Podium blocks */}
        <div style={{display:"flex",alignItems:"flex-end",gap:14}}>
          {[1,0,2].map(idx=>{
            const p=THIS_GAME_PLAYERS[idx]; const r=idx+1;
            const h={0:120,1:92,2:72}[idx];
            return(
              <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",animation:`slideUp .5s ease-out ${idx*.1}s both`}}>
                <div style={{animation:`medalDrop .5s ease-out ${idx*.15+.3}s both`}}>
                  <Av name={p.name} rank={r} size={r===1?54:44}/>
                </div>
                <div style={{fontSize:r===1?14:12,fontWeight:700,color:"#fff",marginTop:7}}>{p.name}</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?20:16,fontWeight:700,color:C.gold,marginTop:2}}>{p.score.toLocaleString()}</div>
                <div style={{
                  width:r===1?84:70,height:h,marginTop:8,borderRadius:"12px 12px 0 0",
                  background:r===1?`linear-gradient(180deg,${C.gold}35,${C.gold}10)`:r===2?`linear-gradient(180deg,${C.w(.12)},${C.w(.04)})`:`linear-gradient(180deg,${C.darkGold}25,${C.darkGold}08)`,
                  border:`1px solid ${r===1?`${C.gold}35`:C.w(.06)}`,borderBottom:"none",
                  display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:12,
                }}>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:r===1?C.gold:C.w(.25)}}>{r}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Ranks 4-10 + QR */}
      <div style={{flex:.7,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 24px 0 0"}}>
        <div style={{fontSize:10,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>Also in the Top 10</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {THIS_GAME_PLAYERS.slice(3,10).map((p,i) => {
            const rank = i + 4;
            const isYou = p.name === "Jake";
            return (
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"8px 12px",borderRadius:10,
                background:isYou?`${C.blue}12`:C.w(.03),
                border:isYou?`1px solid ${C.blue}25`:`1px solid ${C.w(.04)}`,
                animation:`rankSlide .3s ease-out ${i*.05}s both`,
              }}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:15,fontWeight:700,color:C.w(.25),width:20,textAlign:"center"}}>{rank}</span>
                <Av name={p.name} size={28} you={isYou}/>
                <span style={{flex:1,fontSize:13,fontWeight:isYou?700:500,color:C.w(isYou?1:.7)}}>
                  {p.name}
                  {isYou && <span style={{fontSize:8,color:C.blue,marginLeft:6,fontWeight:700}}>YOU</span>}
                </span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {/* Join CTA */}
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.b(.4),backdropFilter:"blur(12px)",borderRadius:14,padding:"10px 14px",border:`1px solid ${C.w(.06)}`,marginTop:14}}>
          <QRCode size={52}/>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:"#fff",lineHeight:1.2}}>Play Next Round!</div>
            <div style={{fontSize:10,fontWeight:600,color:C.gold,marginTop:2}}>play.taptrivia.tv</div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
              <span style={{fontSize:8,fontWeight:600,color:C.w(.4),letterSpacing:1}}>CODE</span>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2}}>9CK6T</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </TVFrame>
);


// ═══════════════════════════════════════════════════════════════
// PHASE 2: TAP STANDINGS (30 seconds)
// ═══════════════════════════════════════════════════════════════

const PhaseBars = () => {
  const yourBar = BARS.find(b=>b.isYou);
  return (
    <TVFrame><Orbs/>
      <CountdownBar seconds={88}/>

      <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:48}}>
        {/* LEFT — Tap Standings */}
        <div style={{flex:1.15,display:"flex",flexDirection:"column",padding:"16px 20px 16px 36px",justifyContent:"center"}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <span style={{fontSize:28}}>🏆</span>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>Tap Standings</div>
              <div style={{fontSize:12,color:C.w(.35),fontWeight:500}}>Weekly Score Index · North Carolina</div>
            </div>
          </div>

          {/* Your bar's score callout */}
          <div style={{
            background:`linear-gradient(135deg, ${C.w(.06)}, ${C.w(.03)})`,
            borderRadius:16,padding:"16px 20px",marginBottom:18,
            border:`1px solid ${C.gold}30`,
            animation:"slideUp .4s ease-out .1s both",
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:C.w(.35),letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Your Bar</div>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:"#fff"}}>Connestee Social Club</div>
                <div style={{fontSize:12,color:C.w(.35),marginTop:3}}>Brevard, NC</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:40,fontWeight:700,color:C.gold,lineHeight:1,filter:`drop-shadow(0 2px 8px ${C.gold}40)`}}>{yourBar.index.toLocaleString()}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.w(.3),letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Score Index</div>
              </div>
            </div>
            {yourBar.delta !== 0 && (
              <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:10,background:yourBar.delta>0?`${C.green}18`:`${C.red}18`,borderRadius:8,padding:"4px 12px"}}>
                <span style={{fontSize:12,fontWeight:700,color:yourBar.delta>0?C.green:C.red}}>
                  {yourBar.delta>0?"▲":"▼"} {Math.abs(yourBar.delta)} spots this week
                </span>
              </div>
            )}
          </div>

          {/* Statewide bar list — 5 bars */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {BARS.map((bar,i) => (
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"10px 14px",borderRadius:12,
                background:bar.isYou?`${C.blue}12`:C.w(.03),
                border:bar.isYou?`1px solid ${C.blue}25`:`1px solid ${C.w(.04)}`,
                animation:`rankSlide .3s ease-out ${i*.06}s both`,
              }}>
                {/* Rank */}
                <span style={{
                  fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,
                  color:bar.rank<=3?C.gold:bar.isYou?C.blue:C.w(.25),
                  width:28,textAlign:"center",
                }}>#{bar.rank}</span>
                {/* Bar info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:bar.isYou?700:500,color:bar.isYou?"#fff":C.w(.7),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {bar.name}
                    {bar.isYou && <span style={{fontSize:9,color:C.blue,marginLeft:8,fontWeight:700,background:C.w(.06),borderRadius:4,padding:"2px 6px"}}>YOU</span>}
                  </div>
                  <div style={{fontSize:11,color:C.w(.3),marginTop:1}}>{bar.city}</div>
                </div>
                {/* Score Index */}
                <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:bar.isYou?C.gold:C.w(.45)}}>{bar.index.toLocaleString()}</div>
                {/* Delta arrow */}
                <div style={{width:24,textAlign:"center"}}>
                  {bar.delta>0&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>▲{bar.delta}</span>}
                  {bar.delta<0&&<span style={{fontSize:11,color:C.red,fontWeight:700}}>▼{Math.abs(bar.delta)}</span>}
                  {bar.delta===0&&<span style={{fontSize:11,color:C.w(.15)}}>—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Score Index explainer + QR */}
        <div style={{flex:.6,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 28px 0 0"}}>
          {/* What is Score Index */}
          <div style={{
            background:C.w(.04),borderRadius:12,padding:"14px 16px",marginBottom:14,
            border:`1px solid ${C.w(.06)}`,
            animation:"slideInRight .4s ease-out .3s both",
          }}>
            <div style={{fontSize:10,fontWeight:600,color:C.gold,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>📊 Score Index</div>
            <div style={{fontSize:12,fontWeight:500,color:C.w(.55),lineHeight:1.5}}>
              Average points per player, per question. The higher your bar's index, the sharper your regulars.
            </div>
            <div style={{marginTop:10,height:1,background:C.w(.06)}}/>
            <div style={{marginTop:10,fontSize:11,fontWeight:600,color:C.w(.4)}}>
              Resets every <span style={{color:"#fff",fontWeight:700}}>Monday</span>
            </div>
          </div>

          {/* National context */}
          <div style={{
            background:`linear-gradient(135deg, ${C.w(.05)}, ${C.w(.02)})`,
            borderRadius:12,padding:"14px 16px",marginBottom:14,
            border:`1px solid ${C.w(.06)}`,
            animation:"slideInRight .4s ease-out .4s both",
          }}>
            <div style={{fontSize:10,fontWeight:600,color:C.w(.3),letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>🇺🇸 Nationally</div>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff"}}>#46</span>
              <span style={{fontSize:13,color:C.w(.3)}}>of 312 bars</span>
            </div>
          </div>

          {/* QR Join */}
          <div style={{display:"flex",alignItems:"center",gap:12,background:C.b(.4),backdropFilter:"blur(12px)",borderRadius:14,padding:"10px 14px",border:`1px solid ${C.w(.06)}`,animation:"slideInRight .4s ease-out .5s both"}}>
            <QRCode size={52}/>
            <div>
              <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff",lineHeight:1.2}}>Boost your bar's rank!</div>
              <div style={{fontSize:10,fontWeight:600,color:C.gold,marginTop:2}}>play.taptrivia.tv</div>
              <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                <span style={{fontSize:8,fontWeight:600,color:C.w(.4),letterSpacing:1}}>CODE</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2}}>9CK6T</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TVFrame>
  );
};


// ═══════════════════════════════════════════════════════════════
// PHASE 3: NATIONAL TOP 25 (30 seconds)
// ═══════════════════════════════════════════════════════════════

const PhaseNational = () => (
  <TVFrame><Orbs/>
    <CountdownBar seconds={58}/>

    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:48}}>
      {/* LEFT — Top 25 Leaderboard (two columns) */}
      <div style={{flex:1.15,display:"flex",flexDirection:"column",padding:"12px 20px 12px 36px",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <span style={{fontSize:24}}>🌎</span>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:"#fff"}}>National Top 25</div>
            <div style={{fontSize:11,color:C.w(.35)}}>This week's top players across all bars</div>
          </div>
        </div>

        {/* Two-column layout for 25 players */}
        <div style={{display:"flex",gap:16}}>
          {/* Column 1: 1-13 */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
            {TOP25.slice(0,13).map((p,i) => {
              const rank = i+1;
              return (
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"4px 8px",borderRadius:6,
                  background:rank<=3?`${C.gold}08`:"transparent",
                  border:"1px solid transparent",
                  animation:`rankSlide .25s ease-out ${i*.03}s both`,
                }}>
                  <span style={{
                    fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,width:18,textAlign:"center",
                    color:rank<=3?C.gold:C.w(.2),
                  }}>{rank}</span>
                  <Av name={p.name} size={18}/>
                  <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                    <div style={{fontSize:10,fontWeight:500,color:C.w(.7),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {p.name}
                    </div>
                    <div style={{fontSize:8,color:C.w(.25),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.city}</div>
                  </div>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:10,fontWeight:700,color:rank<=3?C.gold:C.w(.4),flexShrink:0}}>{(p.score/1000).toFixed(1)}k</span>
                </div>
              );
            })}
          </div>

          {/* Column 2: 14-25 */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
            {TOP25.slice(13,25).map((p,i) => {
              const rank = i+14;
              return (
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"4px 8px",borderRadius:6,
                  background:"transparent",
                  border:"1px solid transparent",
                  animation:`rankSlide .25s ease-out ${(i+13)*.03}s both`,
                }}>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,width:18,textAlign:"center",color:C.w(.2)}}>{rank}</span>
                  <Av name={p.name} size={18}/>
                  <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                    <div style={{fontSize:10,fontWeight:500,color:C.w(.7),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {p.name}
                    </div>
                    <div style={{fontSize:8,color:C.w(.25),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.city}</div>
                  </div>
                  <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:10,fontWeight:700,color:C.w(.4),flexShrink:0}}>{(p.score/1000).toFixed(1)}k</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — Platform stats + closest to board + QR */}
      <div style={{flex:.6,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 28px 0 0"}}>
        {/* Platform-wide stats */}
        <div style={{
          background:`linear-gradient(135deg, ${C.w(.05)}, ${C.w(.02)})`,
          borderRadius:12,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${C.w(.06)}`,
          animation:"slideInRight .4s ease-out .3s both",
        }}>
          <div style={{fontSize:10,fontWeight:600,color:C.w(.3),letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>📊 TapTrivia This Week</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              {label:"Players",value:"12,400",icon:"👥"},
              {label:"Games Played",value:"847",icon:"🎮"},
              {label:"Questions Answered",value:"4.2M",icon:"❓"},
              {label:"Bars Active",value:"312",icon:"🍺"},
            ].map((stat,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14}}>{stat.icon}</span>
                <span style={{flex:1,fontSize:11,fontWeight:500,color:C.w(.45)}}>{stat.label}</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Closest from your bar */}
        <div style={{
          background:C.w(.04),borderRadius:12,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${C.gold}15`,
          animation:"slideInRight .4s ease-out .4s both",
        }}>
          <div style={{fontSize:10,fontWeight:600,color:C.gold,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>🎯 Top 25 Cutoff</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:8}}>
            <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff"}}>{(TOP25[24].score/1000).toFixed(1)}k</span>
            <span style={{fontSize:11,color:C.w(.3)}}>pts to make the board</span>
          </div>
          <div style={{height:1,background:C.w(.06),marginBottom:8}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Av name="Sarah M" size={22}/>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:C.w(.6)}}>Your bar's best: <span style={{color:"#fff",fontWeight:700}}>Sarah M</span></div>
              <div style={{fontSize:10,color:C.w(.35),marginTop:1}}>42,100 pts — <span style={{color:C.gold,fontWeight:600}}>{((TOP25[24].score - 42100)/1000).toFixed(1)}k to go</span></div>
            </div>
          </div>
        </div>

        {/* QR Join */}
        <div style={{display:"flex",alignItems:"center",gap:12,background:C.b(.4),backdropFilter:"blur(12px)",borderRadius:14,padding:"10px 14px",border:`1px solid ${C.w(.06)}`,animation:"slideInRight .4s ease-out .5s both"}}>
          <QRCode size={52}/>
          <div>
            <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:13,fontWeight:700,color:"#fff",lineHeight:1.2}}>Join the Next Game!</div>
            <div style={{fontSize:10,fontWeight:600,color:C.gold,marginTop:2}}>play.taptrivia.tv</div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
              <span style={{fontSize:8,fontWeight:600,color:C.w(.4),letterSpacing:1}}>CODE</span>
              <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2}}>9CK6T</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </TVFrame>
);


// ═══════════════════════════════════════════════════════════════
// PHASE 4: HYPE / CTA (30 seconds)
// ═══════════════════════════════════════════════════════════════

const PhaseHype = () => (
  <TVFrame><Orbs/>
    <CountdownBar seconds={22}/>

    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5,paddingTop:36}}>
      {/* Big logo */}
      <div style={{animation:"breathe 3s ease-in-out infinite",marginBottom:16}}>
        <Logo size="xl"/>
      </div>

      <div style={{fontSize:15,color:C.w(.45),fontWeight:500,marginBottom:32}}>Next round starting soon!</div>

      {/* Categories preview */}
      <div style={{fontSize:10,fontWeight:600,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>Coming Up Next</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:36}}>
        {NEXT_CATEGORIES.map((cat,i) => (
          <div key={i} style={{
            background:C.w(.06),borderRadius:10,padding:"8px 16px",
            border:`1px solid ${C.w(.06)}`,
            fontSize:14,fontWeight:600,color:C.w(.7),
            animation:`fadeDown .4s ease-out ${i*.1}s both`,
          }}>{cat}</div>
        ))}
      </div>

      {/* Big QR + Code */}
      <div style={{display:"flex",alignItems:"center",gap:24}}>
        <QRCode size={100}/>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:C.w(.35),letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Scan to Join</div>
          <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,color:C.gold,letterSpacing:6,animation:"codeGlow 3s ease-in-out infinite"}}>9CK6T</div>
          <div style={{fontSize:13,color:C.w(.35),marginTop:4}}>play.taptrivia.tv</div>
        </div>
      </div>
    </div>
  </TVFrame>
);


// ═══════════════════════════════════════════════════════════════
// MAIN APP — Phase Switcher
// ═══════════════════════════════════════════════════════════════

const PHASES = [
  {key:"podium",label:"🏆 Podium",duration:"30s",component:PhasePodium},
  {key:"bars",label:"🏆 Tap Standings",duration:"30s",component:PhaseBars},
  {key:"national",label:"🌎 National Top 25",duration:"30s",component:PhaseNational},
  {key:"hype",label:"📣 Hype CTA",duration:"30s",component:PhaseHype},
];

export default function App() {
  const [phase, setPhase] = useState("podium");
  const PhaseComponent = PHASES.find(p=>p.key===phase)?.component || PhasePodium;

  return (
    <div style={{minHeight:"100vh",background:"#08080c",fontFamily:"'Outfit',sans-serif"}}>
      <Styles/>

      {/* Nav */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,12,.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.w(.05)}`,padding:"10px 16px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Logo size="sm"/>
            <span style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1,background:C.w(.06),borderRadius:6,padding:"3px 8px"}}>Between Games</span>
          </div>
          <div style={{display:"flex",gap:4}}>
            {PHASES.map(p => (
              <button key={p.key} onClick={()=>setPhase(p.key)} style={{
                padding:"6px 14px",borderRadius:8,border:"none",
                background:phase===p.key?C.grad.selected:C.w(.06),
                color:phase===p.key?"#fff":C.w(.5),
                fontSize:11,fontWeight:600,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",
                transition:"all .15s",
              }}>
                {p.label}
                <span style={{fontSize:9,color:phase===p.key?C.w(.6):C.w(.25),marginLeft:6}}>{p.duration}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phase indicator */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 16px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          {PHASES.map((p,i) => (
            <div key={p.key} style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{
                width:8,height:8,borderRadius:"50%",
                background:p.key===phase?C.gold:PHASES.findIndex(x=>x.key===phase)>i?C.green:C.w(.1),
                boxShadow:p.key===phase?`0 0 8px ${C.gold}`:PHASES.findIndex(x=>x.key===phase)>i?`0 0 6px ${C.green}`:"none",
                transition:"all .3s",
              }}/>
              <span style={{fontSize:9,fontWeight:600,color:p.key===phase?C.w(.6):C.w(.2),letterSpacing:.5}}>{p.label}</span>
              {i<PHASES.length-1 && <div style={{width:24,height:1,background:PHASES.findIndex(x=>x.key===phase)>i?C.green:C.w(.06)}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Screen */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"12px 16px 60px"}}>
        <div style={{display:"flex",justifyContent:"center"}}>
          <div key={phase} style={{animation:"popIn .35s ease-out"}}>
            <PhaseComponent/>
          </div>
        </div>
      </div>
    </div>
  );
}
