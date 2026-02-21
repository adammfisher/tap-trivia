import { useState, useMemo } from "react";

// ================================================================
// TAP TRIVIA v6 — Bar Owner Dashboard
// Signage Creator with dual preview + emoji pickers + custom template
// ================================================================

const C = {
  grad: {
    main: "linear-gradient(150deg, #0f0326 0%, #1e0f4a 20%, #3d1866 45%, #6b2358 70%, #a8334a 100%)",
    gold: "linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #ffe066 100%)",
    selected: "linear-gradient(135deg, #667eea, #764ba2)",
    sidebar: "linear-gradient(180deg, #0c1220 0%, #111b2e 50%, #0e1525 100%)",
  },
  w: a => `rgba(255,255,255,${a})`,
  b: a => `rgba(0,0,0,${a})`,
  bg: "#090d15",
  card: "#111827",
  cardBorder: "rgba(255,255,255,.06)",
  green: "#00d4aa", red: "#ff4757", gold: "#ffd200", blue: "#667eea", purple: "#764ba2",
  amber: "#f59e0b", emerald: "#10b981", slate: "#64748b", cyan: "#22d3ee", darkGold: "#f7971e",
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes slideRight{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes popIn{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
    @keyframes orb1{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(50px,-30px)scale(1.15)}66%{transform:translate(-25px,25px)scale(.9)}}
    @keyframes orb2{0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-35px,45px)scale(.85)}66%{transform:translate(35px,-25px)scale(1.1)}}
    @keyframes neonPulse{0%,100%{filter:drop-shadow(0 0 8px rgba(245,158,11,.4))}50%{filter:drop-shadow(0 0 20px rgba(245,158,11,.7))}}
    @keyframes statusPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,212,170,.4)}50%{box-shadow:0 0 0 6px rgba(0,212,170,0)}}
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.05);opacity:1}}
    @keyframes categoryZoom{0%{transform:scale(.5);opacity:0}50%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes barReveal{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes codeGlow{0%,100%{text-shadow:0 0 20px rgba(255,210,0,.3)}50%{text-shadow:0 0 40px rgba(255,210,0,.6)}}
    @keyframes panelSlide{from{transform:translateX(12px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes medalDrop{0%{transform:translateY(-20px)scale(0);opacity:0}60%{transform:translateY(3px)scale(1.1);opacity:1}100%{transform:translateY(0)scale(1);opacity:1}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
    .dash-card{background:${C.card};border:1px solid ${C.cardBorder};border-radius:16px;transition:all .2s}
    .dash-card:hover{border-color:rgba(255,255,255,.1);box-shadow:0 8px 32px rgba(0,0,0,.3)}
    .nav-item{display:flex;align-items:center;gap:12px;padding:12px 20px;border-radius:12px;cursor:pointer;transition:all .15s;font-size:14px;font-weight:500;color:rgba(255,255,255,.4);border:none;background:none;width:100%;text-align:left;font-family:'Outfit',sans-serif}
    .nav-item:hover{background:rgba(255,255,255,.04);color:rgba(255,255,255,.7)}
    .nav-item.active{background:linear-gradient(135deg,rgba(102,126,234,.15),rgba(118,75,162,.08));color:#fff;font-weight:600}
    .btn-primary{padding:10px 20px;border-radius:10px;border:none;background:${C.grad.selected};color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(102,126,234,.3)}
    .btn-ghost{padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.6);font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
    .btn-ghost:hover{background:rgba(255,255,255,.04);color:#fff}
    .btn-danger{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,71,87,.25);background:rgba(255,71,87,.08);color:#ff4757;font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
    .btn-danger:hover{background:rgba(255,71,87,.15);border-color:rgba(255,71,87,.4)}
    .field-input{width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#fff;font-size:14px;font-family:'Outfit',sans-serif;outline:none;transition:border-color .15s}
    .field-input:focus{border-color:rgba(102,126,234,.5);box-shadow:0 0 0 3px rgba(102,126,234,.1)}
    .field-input::placeholder{color:rgba(255,255,255,.2)}
    .field-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.3);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
    .menu-row{display:flex;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
    .menu-row:last-child{border-bottom:none}
    .preview-toggle{padding:6px 14px;border-radius:7px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
  `}</style>
);

// --- Shared Components ---
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
    <div style={{background:"#fff",borderRadius:8,padding:8,display:"inline-block"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.filter(c=>c.f).map((c,i)=><rect key={i} x={c.x*cellSize} y={c.y*cellSize} width={cellSize+.5} height={cellSize+.5} fill="#1e0f4a" rx={cellSize*.12}/>)}
      </svg>
    </div>
  );
};

const BarLogo = ({size=80}) => (
  <div style={{width:size,height:size,borderRadius:size*.2,background:"linear-gradient(135deg,#2a1a4e,#3d2266)",border:`2px solid ${C.w(.1)}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2}}>
    <span style={{fontSize:size*.25,fontWeight:800,color:C.gold,fontFamily:"'Fredoka',sans-serif",lineHeight:1}}>Mo's</span>
    <span style={{fontSize:size*.12,fontWeight:600,color:C.w(.5),letterSpacing:1,textTransform:"uppercase"}}>Tavern</span>
  </div>
);

const TVFrame = ({children}) => (
  <div style={{width:960,height:540,background:C.grad.main,borderRadius:12,overflow:"hidden",position:"relative",fontFamily:"'Outfit',sans-serif",boxShadow:"0 20px 60px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,255,255,.06)"}}>
    {children}
  </div>
);

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

const SignageHeader = () => (
  <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}><BarLogo size={44}/><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:18,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:10,color:C.w(.35),fontWeight:500}}>Monroe, NC</div></div></div>
    <Logo size="sm"/>
  </div>
);

const Av = ({name,rank,size=36,you}) => {
  const h=name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
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

const Field = ({label, value, onChange, placeholder, small}) => (
  <div style={{marginBottom:small?10:14}}>
    <div className="field-label">{label}</div>
    <input className="field-input" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{fontSize:small?13:14}}/>
  </div>
);

const InlineField = ({value, onChange, placeholder, width}) => (
  <input className="field-input" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:width||"100%",fontSize:13,padding:"8px 12px"}}/>
);


// ================================================================
// EMOJI PICKER
// ================================================================

const EMOJI_GROUPS = [
  {label:"Food & Drink",emojis:["🍺","🍻","🍸","🍹","🍷","🍾","🥃","🧊","☕","🍔","🍕","🌮","🌯","🍗","🥩","🍳","🥗","🍽️","🧀","🥨","🍟","🥓"]},
  {label:"Events & Music",emojis:["🎧","🎤","🎵","🎶","🎸","🎹","🎺","🎭","🪩","🎬","🎨","🎪","🎯","🃏","🎲","🎰"]},
  {label:"Sports",emojis:["🏈","⚽","🏀","🏒","⚾","🏆","🥊","🎱","🏓","🎳","🏎️","🥋","🏐","🎣"]},
  {label:"Celebrate",emojis:["🎉","🎊","🥳","✨","🔥","💥","🌟","⭐","💫","🎁","🎀","🪅","🥂","🍀"]},
  {label:"General",emojis:["📢","📣","🔔","💡","🏷️","❤️","👑","💎","⚡","🚀","💬","📌","🎗️","ℹ️","🆕","🆓","💯","👍"]},
];

const EmojiPicker = ({value, onChange, label="Icon"}) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{position:"relative",marginBottom:14}}>
      <div className="field-label">{label}</div>
      <button onClick={()=>setOpen(!open)} style={{
        width:56,height:48,borderRadius:10,background:C.w(.04),border:`1px solid ${open?"rgba(102,126,234,.5)":C.w(.08)}`,
        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:28,
        transition:"all .15s",boxShadow:open?"0 0 0 3px rgba(102,126,234,.1)":"none",
      }}>
        {value}
      </button>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,marginTop:6,zIndex:50,width:320,
          background:"#1a1f2e",border:`1px solid ${C.w(.12)}`,borderRadius:14,padding:"14px",
          boxShadow:"0 16px 48px rgba(0,0,0,.5)",animation:"popIn .15s ease-out",
        }}>
          {EMOJI_GROUPS.map((group,gi) => (
            <div key={gi} style={{marginBottom:gi<EMOJI_GROUPS.length-1?10:0}}>
              <div style={{fontSize:9,fontWeight:700,color:C.w(.25),letterSpacing:1,textTransform:"uppercase",marginBottom:4,padding:"0 2px"}}>{group.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                {group.emojis.map((emoji,ei) => (
                  <button key={ei} onClick={()=>{onChange(emoji);setOpen(false)}} style={{
                    width:32,height:32,borderRadius:6,border:"none",background:value===emoji?"rgba(102,126,234,.25)":"transparent",
                    cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"all .1s",
                  }} onMouseEnter={e=>e.currentTarget.style.background=value===emoji?"rgba(102,126,234,.3)":"rgba(255,255,255,.06)"}
                     onMouseLeave={e=>e.currentTarget.style.background=value===emoji?"rgba(102,126,234,.25)":"transparent"}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Inline emoji picker for rows (no label, smaller)
const InlineEmojiPicker = ({value, onChange}) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(!open)} style={{
        width:44,height:38,borderRadius:8,background:C.w(.04),border:`1px solid ${open?"rgba(102,126,234,.5)":C.w(.08)}`,
        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,
        transition:"all .15s",
      }}>
        {value}
      </button>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,marginTop:4,zIndex:50,width:280,
          background:"#1a1f2e",border:`1px solid ${C.w(.12)}`,borderRadius:12,padding:"10px",
          boxShadow:"0 12px 40px rgba(0,0,0,.5)",animation:"popIn .15s ease-out",
        }}>
          {EMOJI_GROUPS.map((group,gi) => (
            <div key={gi} style={{marginBottom:gi<EMOJI_GROUPS.length-1?6:0}}>
              <div style={{fontSize:8,fontWeight:700,color:C.w(.2),letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>{group.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:1}}>
                {group.emojis.map((emoji,ei) => (
                  <button key={ei} onClick={()=>{onChange(emoji);setOpen(false)}} style={{
                    width:28,height:28,borderRadius:5,border:"none",background:value===emoji?"rgba(102,126,234,.25)":"transparent",
                    cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                  }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}
                     onMouseLeave={e=>e.currentTarget.style.background=value===emoji?"rgba(102,126,234,.25)":"transparent"}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ================================================================
// AUTH FLOW
// ================================================================

const AuthLogin = ({onNext}) => (
  <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}>
    <Orbs/>
    <div style={{position:"relative",zIndex:2,width:420,animation:"popIn .4s ease-out"}}>
      <div style={{textAlign:"center",marginBottom:40}}><Logo size="lg"/><div style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1.5,marginTop:8}}>BAR DASHBOARD</div></div>
      <div style={{background:C.card,borderRadius:20,padding:"36px 32px",border:`1px solid ${C.cardBorder}`}}>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>Welcome back</div>
        <div style={{fontSize:13,color:C.w(.4),marginBottom:28}}>Sign in with your email and bar code</div>
        <div style={{marginBottom:18}}><div className="field-label">Email Address</div><input className="field-input" placeholder="mo@mostavern.com" defaultValue="mo@mostavern.com" style={{fontSize:15}}/></div>
        <div style={{marginBottom:28}}>
          <div className="field-label">Bar Code</div>
          <div style={{display:"flex",gap:8}}>{["B","R","7","X"].map((ch,i) => (<div key={i} style={{flex:1,height:56,borderRadius:12,background:C.w(.06),border:`2px solid ${C.blue}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fredoka',sans-serif",fontSize:28,fontWeight:700,color:"#fff",animation:`popIn .3s ease-out ${i*.06}s both`}}>{ch}</div>))}</div>
          <div style={{fontSize:11,color:C.w(.2),marginTop:6}}>The code from your TV — shown when you first registered</div>
        </div>
        <button className="btn-primary" onClick={onNext} style={{width:"100%",padding:"14px",fontSize:15,borderRadius:12}}>Send One-Time Passcode →</button>
      </div>
      <div style={{textAlign:"center",marginTop:20,fontSize:12,color:C.w(.2)}}>Don't have a bar code? <span style={{color:C.blue,cursor:"pointer"}}>Register on your TV app</span></div>
    </div>
  </div>
);

const AuthOTP = ({onNext, onBack}) => (
  <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}>
    <Orbs/>
    <div style={{position:"relative",zIndex:2,width:420,animation:"popIn .4s ease-out"}}>
      <div style={{textAlign:"center",marginBottom:40}}><Logo size="lg"/></div>
      <div style={{background:C.card,borderRadius:20,padding:"36px 32px",border:`1px solid ${C.cardBorder}`}}>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>Check your email</div>
        <div style={{fontSize:13,color:C.w(.4),marginBottom:8}}>We sent a 6-digit code to</div>
        <div style={{fontSize:14,fontWeight:600,color:C.blue,marginBottom:28}}>mo@mostavern.com</div>
        <div className="field-label">One-Time Passcode</div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>{["4","7","2","9","1","6"].map((ch,i) => (<div key={i} style={{flex:1,height:56,borderRadius:12,background:C.w(.06),border:`2px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff",animation:`popIn .3s ease-out ${i*.05}s both`}}>{ch}</div>))}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}><span style={{fontSize:11,color:C.w(.2)}}>Expires in 10 minutes</span><span style={{fontSize:12,color:C.blue,cursor:"pointer",fontWeight:600}}>Resend code</span></div>
        <button className="btn-primary" onClick={onNext} style={{width:"100%",padding:"14px",fontSize:15,borderRadius:12}}>Verify & Sign In →</button>
      </div>
      <div style={{textAlign:"center",marginTop:16}}><span onClick={onBack} style={{fontSize:12,color:C.w(.25),cursor:"pointer"}}>← Back to sign in</span></div>
    </div>
  </div>
);

const AuthTrust = ({onNext}) => (
  <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}>
    <Orbs/>
    <div style={{position:"relative",zIndex:2,width:420,animation:"popIn .4s ease-out"}}>
      <div style={{textAlign:"center",marginBottom:40}}><Logo size="lg"/></div>
      <div style={{background:C.card,borderRadius:20,padding:"36px 32px",border:`1px solid ${C.cardBorder}`,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:16}}>🔒</div>
        <div style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:8}}>Trust this computer?</div>
        <div style={{fontSize:14,color:C.w(.4),marginBottom:8,lineHeight:1.6}}>You won't need to enter a passcode next time you visit from this device.</div>
        <div style={{fontSize:12,color:C.w(.25),marginBottom:32,lineHeight:1.5}}>Choose <strong style={{color:C.w(.45)}}>No</strong> if this is a shared computer or public device.</div>
        <div style={{display:"flex",gap:12}}><button className="btn-ghost" onClick={onNext} style={{flex:1,padding:"14px",fontSize:14,borderRadius:12}}>No, don't trust</button><button className="btn-primary" onClick={onNext} style={{flex:1,padding:"14px",fontSize:14,borderRadius:12}}>Yes, trust this computer</button></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:20}}><BarLogo size={28}/><span style={{fontSize:12,color:C.w(.25)}}>Mo's Tavern • <span style={{fontFamily:"'Fredoka',sans-serif",color:C.gold,fontWeight:700,letterSpacing:1}}>BR7X</span></span></div>
    </div>
  </div>
);


// ================================================================
// TEMPLATES + DATA — emojis are now data-driven
// ================================================================

const TEMPLATES = [
  {id:"specials",name:"Daily Specials",icon:"🍺",desc:"Feature food & drink deals",color:C.amber,
    defaults:{emoji:"🍺",label:"Today's Specials",headline:"Happy Hour",subheadline:"All Day Tuesday",featuredName:"Margarita Pitcher",featuredDesc:"House lime, Cointreau, fresh squeeze",featuredPrice:"$18",menuItems:[{name:"Draft Beers",desc:"All domestics",price:"$3",icon:"🍺"},{name:"Well Drinks",desc:"Vodka, rum, whiskey",price:"$4",icon:"🍸"},{name:"Wings Basket",desc:"12 ct. buffalo or BBQ",price:"$8",icon:"🍗"},{name:"Loaded Nachos",desc:"Beef, cheese, jalapenos",price:"$10",icon:"🌮"}]}},
  {id:"happyhour",name:"Happy Hour",icon:"🍹",desc:"Time-based drink & food deals",color:"#e879f9",
    defaults:{emoji:"🍹",timeRange:"4 PM – 7 PM",frequency:"Every weekday",deals:[{deal:"50% OFF",item:"All Drafts",color:C.amber},{deal:"$5",item:"House Wine",color:"#e879f9"},{deal:"$6",item:"Appetizers",color:C.green}]}},
  {id:"event",name:"Event Promo",icon:"🎧",desc:"Promote upcoming events & trivia nights",color:C.blue,
    defaults:{emoji:"🎧",eventName:"Trivia Night",when:"This Thursday",details:"8 PM • Free to play • Prizes for top 3",prizes:[{place:"1st",prize:"$50 Bar Tab",emoji:"🥇"},{place:"2nd",prize:"$25 Bar Tab",emoji:"🥈"},{place:"3rd",prize:"Free Appetizer",emoji:"🥉"}]}},
  {id:"brand",name:"Bar Branding",icon:"🏛️",desc:"Logo, tagline & operating hours",color:C.purple,
    defaults:{tagline:"Cold Drinks • Good Times • Live Trivia",hours:[{label:"Mon–Thu",hours:"4 PM – 12 AM"},{label:"Fri–Sat",hours:"4 PM – 2 AM"},{label:"Sunday",hours:"12 PM – 10 PM"}]}},
  {id:"announcement",name:"Announcement",icon:"📢",desc:"Custom message or alert",color:C.green,
    defaults:{emoji:"📢",headline:"Big News!",message:"We're expanding our patio — more seating, more fun starting next month!",subtext:"Stay tuned for the grand reveal"}},
  {id:"sports",name:"Game Day",icon:"🏈",desc:"Promote sports events on TV",color:C.red,
    defaults:{emoji:"🏈",headline:"Game Day",matchup:"Eagles vs Cowboys",when:"Sunday at 4:25 PM",promo:"$3 Bud Light • $5 Wings Basket",tagline:"Best seat in town"}},
  {id:"custom",name:"Custom Slide",icon:"✨",desc:"Freeform — put anything you want",color:C.cyan,
    defaults:{emoji:"✨",headline:"Your Message Here",body:"Write anything you want to show on your TV — promotions, shoutouts, inside jokes, whatever works for your bar.",items:[{emoji:"🎯",text:"Customize everything"},{emoji:"🔥",text:"Change the icon above"},{emoji:"💡",text:"Add or remove items"}]}},
];

const PLAYERS = [
  {name:"Sarah M",score:12450},{name:"Chris K",score:10875},{name:"Jake",score:9640},
  {name:"Mike D",score:8920},{name:"Lisa P",score:7350},{name:"Tom W",score:6800},
  {name:"Amy R",score:5920},{name:"Dan B",score:5100},{name:"Nicole S",score:4800},{name:"Ryan T",score:4200},
];


// ================================================================
// FULL-SCREEN TV RENDERERS — emojis from data
// ================================================================

const TVSpecials = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#0a0612,#1a0f30 30%,#2d1550 60%,#1a0f30)"}}><Orbs/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:70}}>
      <div style={{flex:1.1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>{d.emoji||"🍺"} {d.label}</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:44,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:20}}>{d.headline}<br/><span style={{background:C.grad.gold,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{d.subheadline}</span></div>
        <div style={{background:C.w(.06),borderRadius:20,padding:"20px 24px",border:`1px solid ${C.w(.06)}`,maxWidth:380}}>
          <div style={{fontSize:11,fontWeight:600,color:C.amber,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Featured</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{d.featuredName}</div><div style={{fontSize:13,color:C.w(.4),marginTop:4}}>{d.featuredDesc}</div></div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:36,fontWeight:700,color:C.green}}>{d.featuredPrice}</div></div>
        </div>
      </div>
      <div style={{flex:.9,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 36px 0 0",gap:12}}>
        {(d.menuItems||[]).map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",background:C.w(.04),borderRadius:14,border:`1px solid ${C.w(.04)}`}}><span style={{fontSize:28}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{item.name}</div><div style={{fontSize:12,color:C.w(.4)}}>{item.desc}</div></div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:C.green}}>{item.price}</div></div>))}
      </div>
    </div>
    <TVQRBadge position="br"/>
  </TVFrame>
);

const TVHappyHour = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#0f0a00,#1a1000 30%,#2a1a00 50%,#1a1000)"}}><div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,.1),transparent 70%)",top:"-10%",right:"5%",animation:"orb1 20s ease-in-out infinite"}}/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{fontSize:14,fontWeight:700,color:C.amber,letterSpacing:3,textTransform:"uppercase",marginBottom:16,animation:"neonPulse 2s ease-in-out infinite"}}>{d.emoji||"🍹"} Happy Hour</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:64,fontWeight:700,color:"#fff",lineHeight:1.1,textAlign:"center",marginBottom:8}}>{d.timeRange}</div>
      <div style={{fontSize:18,color:C.w(.5),fontWeight:500,marginBottom:32}}>{d.frequency}</div>
      <div style={{display:"flex",gap:20}}>{(d.deals||[]).map((deal,i)=>(<div key={i} style={{background:C.w(.06),borderRadius:18,padding:"24px 28px",border:`1px solid ${C.w(.06)}`,textAlign:"center",minWidth:160}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:deal.color||C.amber,marginBottom:6}}>{deal.deal}</div><div style={{fontSize:14,fontWeight:600,color:C.w(.6)}}>{deal.item}</div></div>))}</div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TVEvent = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#06060f,#0e0824 30%,#1e1050 50%,#0e0824)"}}><Orbs/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5,padding:"0 40px"}}>
      <div style={{fontSize:72,marginBottom:20,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)"}}>{d.emoji||"🎧"}</div>
      <div style={{fontSize:12,fontWeight:700,color:C.blue,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>{d.when}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,color:"#fff",textAlign:"center",lineHeight:1.15,marginBottom:10}}>{d.eventName}</div>
      <div style={{fontSize:18,color:C.w(.5),fontWeight:500,marginBottom:24}}>{d.details}</div>
      <div style={{display:"flex",gap:16}}>{(d.prizes||[]).map((p,i)=>(<div key={i} style={{background:C.w(.06),borderRadius:16,padding:"16px 22px",border:`1px solid ${C.w(.06)}`,textAlign:"center"}}><div style={{fontSize:28,marginBottom:4}}>{p.emoji}</div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:C.gold}}>{p.place}</div><div style={{fontSize:12,color:C.w(.5),marginTop:2}}>{p.prize}</div></div>))}</div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TVBrand = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#08060e,#120e22 30%,#1e1440 50%,#120e22)"}}><Orbs/></div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5}}>
      <div style={{animation:"breathe 5s ease-in-out infinite",marginBottom:20}}><BarLogo size={140}/></div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,color:"#fff",marginBottom:8}}>Mo's Tavern</div>
      <div style={{fontSize:16,color:C.w(.4),fontWeight:500,letterSpacing:2,textTransform:"uppercase"}}>{d.tagline}</div>
      <div style={{width:60,height:3,borderRadius:2,background:C.grad.gold,marginTop:24,marginBottom:24}}/>
      <div style={{display:"flex",gap:32}}>{(d.hours||[]).map((h,i)=>(<div key={i} style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:C.w(.5),marginBottom:4}}>{h.label}</div><div style={{fontSize:15,fontWeight:600,color:C.gold}}>{h.hours}</div></div>))}</div>
    </div>
    <div style={{position:"absolute",bottom:16,left:0,right:0,zIndex:10,display:"flex",justifyContent:"center"}}><div style={{display:"flex",alignItems:"center",gap:16,background:"rgba(0,0,0,.45)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 24px",border:`1px solid ${C.w(.06)}`}}><Logo size="sm"/><div style={{width:1,height:20,background:C.w(.1)}}/><span style={{fontSize:12,color:C.w(.4)}}>Powered by TapTrivia</span></div></div>
  </TVFrame>
);

const TVAnnouncement = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#040812,#0a1628 30%,#122040 50%,#0a1628)"}}><Orbs/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5,padding:"0 80px",textAlign:"center"}}>
      <div style={{fontSize:56,marginBottom:20}}>{d.emoji||"📢"}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:16}}>{d.headline}</div>
      <div style={{fontSize:20,color:C.w(.55),fontWeight:500,lineHeight:1.5,maxWidth:600}}>{d.message}</div>
      {d.subtext && <div style={{fontSize:14,color:C.w(.3),marginTop:20}}>{d.subtext}</div>}
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TVSports = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#0a0400,#1a0e00 30%,#2a1400 50%,#1a0e00)"}}><Orbs/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",zIndex:5,textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:16}}>{d.emoji||"🏈"}</div>
      <div style={{fontSize:14,fontWeight:700,color:C.red,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>{d.headline}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:52,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:8}}>{d.matchup}</div>
      <div style={{fontSize:18,color:C.w(.5),fontWeight:500,marginBottom:24}}>{d.when}</div>
      <div style={{background:C.w(.06),borderRadius:16,padding:"16px 32px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:18,fontWeight:700,color:C.gold}}>{d.promo}</div></div>
      {d.tagline && <div style={{fontSize:14,color:C.w(.3),marginTop:16,fontStyle:"italic"}}>{d.tagline}</div>}
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TVCustom = ({data:d}) => (
  <TVFrame>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(150deg,#040a12,#0a1420 30%,#0e1e35 50%,#0a1420)"}}><Orbs/></div>
    <SignageHeader/>
    <div style={{position:"absolute",inset:0,display:"flex",zIndex:5,paddingTop:70}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 50px",textAlign:"center"}}>
        <div style={{fontSize:72,marginBottom:20,animation:"categoryZoom .6s cubic-bezier(.34,1.56,.64,1)"}}>{d.emoji||"✨"}</div>
        <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:16}}>{d.headline}</div>
        <div style={{fontSize:18,color:C.w(.5),fontWeight:500,lineHeight:1.5,maxWidth:580}}>{d.body}</div>
        {(d.items||[]).length > 0 && (
          <div style={{display:"flex",gap:14,marginTop:28,flexWrap:"wrap",justifyContent:"center"}}>
            {d.items.map((item,i) => (
              <div key={i} style={{background:C.w(.06),borderRadius:14,padding:"14px 20px",border:`1px solid ${C.w(.06)}`,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:24}}>{item.emoji}</span>
                <span style={{fontSize:15,fontWeight:600,color:C.w(.7)}}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    <TVQRBadge/>
  </TVFrame>
);

const TV_RENDER = {specials:TVSpecials,happyhour:TVHappyHour,event:TVEvent,brand:TVBrand,announcement:TVAnnouncement,sports:TVSports,custom:TVCustom};


// ================================================================
// IN-GAME PANEL RENDERERS — emojis from data
// ================================================================

const PanelQR = () => (
  <div style={{display:"flex",alignItems:"center",gap:10,background:C.b(.3),borderRadius:11,padding:"9px 12px",marginTop:"auto",border:`1px solid ${C.w(.05)}`}}>
    <QRCode size={44}/>
    <div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:"#fff"}}>Join Trivia!</div>
      <div style={{fontSize:9,color:C.gold,fontWeight:600}}>taptrivia.com</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginTop:1}}><span style={{fontSize:7,fontWeight:600,color:C.w(.3),letterSpacing:1}}>CODE</span><span style={{fontFamily:"'Fredoka',sans-serif",fontSize:11,fontWeight:700,color:C.gold,letterSpacing:2}}>BR7X</span></div>
    </div>
  </div>
);

const PanelHeader = () => (
  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
    <BarLogo size={30}/>
    <div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:8,color:C.w(.3)}}>Monroe, NC</div></div>
  </div>
);

const PanelSpecials = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out"}}>
    <PanelHeader/>
    <div style={{fontSize:8,fontWeight:700,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{d.emoji||"🍺"} {d.label || "Tonight's Specials"}</div>
    <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.04))",borderRadius:12,padding:"12px 14px",border:`1px solid rgba(245,158,11,.15)`,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:16,fontWeight:700,color:"#fff",lineHeight:1.1}}>{d.featuredName}</div><div style={{fontSize:9,color:C.w(.4),marginTop:2}}>{d.featuredDesc}</div></div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:C.green}}>{d.featuredPrice}</div></div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:5,flex:1}}>
      {(d.menuItems||[]).map((item,i) => (<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.w(.03),borderRadius:9,border:`1px solid ${C.w(.03)}`}}><span style={{fontSize:16}}>{item.icon}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{item.name}</div><div style={{fontSize:8,color:C.w(.35)}}>{item.desc}</div></div><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:14,fontWeight:700,color:C.green}}>{item.price}</div></div>))}
    </div>
    <PanelQR/>
  </div>
);

const PanelHappyHour = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out"}}>
    <PanelHeader/>
    <div style={{fontSize:8,fontWeight:700,color:"#e879f9",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{d.emoji||"🍹"} Happy Hour</div>
    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:3}}>{d.timeRange}</div>
    <div style={{fontSize:11,color:C.w(.4),marginBottom:14}}>{d.frequency}</div>
    <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
      {(d.deals||[]).map((deal,i) => (<div key={i} style={{background:C.w(.04),borderRadius:12,padding:"14px 16px",border:`1px solid ${C.w(.04)}`,textAlign:"center"}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:deal.color||C.amber}}>{deal.deal}</div><div style={{fontSize:11,fontWeight:600,color:C.w(.5),marginTop:2}}>{deal.item}</div></div>))}
    </div>
    <PanelQR/>
  </div>
);

const PanelEvent = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out"}}>
    <PanelHeader/>
    <div style={{fontSize:8,fontWeight:700,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{d.emoji||"🎧"} Coming Up</div>
    <div style={{textAlign:"center",flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <div style={{fontSize:40,marginBottom:10}}>{d.emoji||"🎧"}</div>
      <div style={{fontSize:9,fontWeight:700,color:C.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{d.when}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:4}}>{d.eventName}</div>
      <div style={{fontSize:11,color:C.w(.4),marginBottom:16}}>{d.details}</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,padding:"0 6px"}}>{(d.prizes||[]).map((p,i) => (<div key={i} style={{display:"flex",alignItems:"center",gap:8,background:C.w(.04),borderRadius:9,padding:"8px 12px",border:`1px solid ${C.w(.04)}`}}><span style={{fontSize:18}}>{p.emoji}</span><div style={{flex:1,textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:C.gold}}>{p.place}</div><div style={{fontSize:9,color:C.w(.4)}}>{p.prize}</div></div></div>))}</div>
    </div>
    <PanelQR/>
  </div>
);

const PanelBrand = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
    <div style={{animation:"breathe 5s ease-in-out infinite",marginBottom:14}}><BarLogo size={80}/></div>
    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:"#fff",marginBottom:6}}>Mo's Tavern</div>
    <div style={{fontSize:10,color:C.w(.4),letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>{d.tagline}</div>
    <div style={{width:40,height:2,borderRadius:1,background:C.grad.gold,marginBottom:16}}/>
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>{(d.hours||[]).map((h,i) => (<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0 12px"}}><span style={{fontSize:11,fontWeight:600,color:C.w(.5)}}>{h.label}</span><span style={{fontSize:11,fontWeight:600,color:C.gold}}>{h.hours}</span></div>))}</div>
    <div style={{marginTop:"auto"}}><PanelQR/></div>
  </div>
);

const PanelAnnouncement = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out"}}>
    <PanelHeader/>
    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>{d.emoji||"📢"}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:24,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:10}}>{d.headline}</div>
      <div style={{fontSize:12,color:C.w(.5),lineHeight:1.5}}>{d.message}</div>
      {d.subtext && <div style={{fontSize:10,color:C.w(.3),marginTop:12}}>{d.subtext}</div>}
    </div>
    <PanelQR/>
  </div>
);

const PanelSports = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out",textAlign:"center"}}>
    <PanelHeader/>
    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
      <div style={{fontSize:48,marginBottom:10}}>{d.emoji||"🏈"}</div>
      <div style={{fontSize:10,fontWeight:700,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{d.headline}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:26,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:6}}>{d.matchup}</div>
      <div style={{fontSize:12,color:C.w(.5),marginBottom:14}}>{d.when}</div>
      <div style={{background:C.w(.06),borderRadius:12,padding:"12px 20px",border:`1px solid ${C.w(.06)}`}}><div style={{fontSize:13,fontWeight:700,color:C.gold}}>{d.promo}</div></div>
      {d.tagline && <div style={{fontSize:11,color:C.w(.3),marginTop:10,fontStyle:"italic"}}>{d.tagline}</div>}
    </div>
    <PanelQR/>
  </div>
);

const PanelCustom = ({data:d}) => (
  <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"16px 18px",animation:"panelSlide .4s ease-out"}}>
    <PanelHeader/>
    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:10}}>{d.emoji||"✨"}</div>
      <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:22,fontWeight:700,color:"#fff",lineHeight:1.15,marginBottom:8}}>{d.headline}</div>
      <div style={{fontSize:11,color:C.w(.5),lineHeight:1.4,marginBottom:12}}>{d.body}</div>
      {(d.items||[]).length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:5,width:"100%",padding:"0 4px"}}>
          {d.items.map((item,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:C.w(.04),borderRadius:8,padding:"7px 10px",border:`1px solid ${C.w(.04)}`}}>
              <span style={{fontSize:16}}>{item.emoji}</span>
              <span style={{fontSize:11,fontWeight:600,color:C.w(.6),textAlign:"left"}}>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    <PanelQR/>
  </div>
);

const PANEL_RENDER = {specials:PanelSpecials,happyhour:PanelHappyHour,event:PanelEvent,brand:PanelBrand,announcement:PanelAnnouncement,sports:PanelSports,custom:PanelCustom};


// ================================================================
// IN-GAME MOCK — Leaderboard with signage panel
// ================================================================

const InGameMockLeaderboard = ({data, templateId}) => {
  const Panel = PANEL_RENDER[templateId];
  return (
    <TVFrame><Orbs/>
      <div style={{position:"absolute",inset:0,display:"flex",zIndex:5}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px 28px"}}>
          <div style={{marginBottom:4}}><Logo size="sm"/></div>
          <div style={{fontSize:11,fontWeight:600,color:C.w(.4),letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>After Question 7</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:14}}>
            {[1,0,2].map(idx => {
              const p=PLAYERS[idx], r=idx+1, h={0:100,1:76,2:58}[idx];
              return (
                <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{animation:`medalDrop .4s ease-out ${idx*.1}s both`}}><Av name={p.name} rank={r} size={r===1?44:36}/></div>
                  <div style={{fontSize:r===1?12:10,fontWeight:700,color:"#fff",marginTop:4}}>{p.name}</div>
                  <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:r===1?16:13,fontWeight:700,color:C.gold,marginTop:1}}>{p.score.toLocaleString()}</div>
                  <div style={{width:r===1?70:58,height:h,marginTop:6,borderRadius:"10px 10px 0 0",background:r===1?`linear-gradient(180deg,${C.gold}35,${C.gold}10)`:r===2?`linear-gradient(180deg,${C.w(.12)},${C.w(.04)})`:`linear-gradient(180deg,${C.darkGold}25,${C.darkGold}08)`,border:`1px solid ${r===1?`${C.gold}35`:C.w(.06)}`,borderBottom:"none",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:10}}>
                    <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:r===1?C.gold:C.w(.25)}}>{r}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:10,width:"100%",maxWidth:380,padding:"0 8px"}}>
            {PLAYERS.slice(3,5).map((p,i) => (
              <div key={i} style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:C.w(.04),borderRadius:8,border:`1px solid ${C.w(.04)}`}}>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:12,fontWeight:700,color:C.w(.25),width:14}}>{i+4}</span>
                <Av name={p.name} size={22}/><span style={{flex:1,fontSize:10,fontWeight:500,color:C.w(.6),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                <span style={{fontFamily:"'Fredoka',sans-serif",fontSize:10,fontWeight:700,color:C.gold}}>{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:C.w(.25),marginTop:12,animation:"pulse 2s infinite"}}>Next question in 5s...</div>
        </div>
        <div style={{width:1,background:`linear-gradient(180deg,transparent,${C.w(.08)},${C.w(.08)},transparent)`,margin:"28px 0"}}/>
        <div style={{width:340,background:"rgba(0,0,0,.15)",backdropFilter:"blur(8px)"}}>{Panel && <Panel data={data}/>}</div>
      </div>
    </TVFrame>
  );
};


// ================================================================
// EDITOR FORMS — with emoji pickers
// ================================================================

const EditorSpecials = ({data:d, update}) => {
  const menuItems = d.menuItems||[];
  const updateItem = (idx,k,v) => {const items=[...menuItems];items[idx]={...items[idx],[k]:v};update("menuItems",items)};
  return (<div>
    <EmojiPicker value={d.emoji||"🍺"} onChange={v=>update("emoji",v)} label="Slide Icon"/>
    <div className="field-label" style={{marginBottom:12,fontSize:12,color:C.w(.35)}}>HEADER</div>
    <Field label="Label" value={d.label||""} onChange={v=>update("label",v)} placeholder="Today's Specials"/>
    <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Field label="Headline" value={d.headline||""} onChange={v=>update("headline",v)} placeholder="Happy Hour"/></div><div style={{flex:1}}><Field label="Gold subheadline" value={d.subheadline||""} onChange={v=>update("subheadline",v)} placeholder="All Day Tuesday"/></div></div>
    <div className="field-label" style={{marginBottom:12,marginTop:4,fontSize:12,color:C.w(.35)}}>FEATURED ITEM</div>
    <div style={{display:"flex",gap:12}}><div style={{flex:2}}><Field label="Name" value={d.featuredName||""} onChange={v=>update("featuredName",v)} placeholder="Margarita Pitcher"/></div><div style={{flex:1}}><Field label="Price" value={d.featuredPrice||""} onChange={v=>update("featuredPrice",v)} placeholder="$18"/></div></div>
    <Field label="Description" value={d.featuredDesc||""} onChange={v=>update("featuredDesc",v)} placeholder="House lime, Cointreau..."/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:10}}>
      <div className="field-label" style={{margin:0,fontSize:12,color:C.w(.35)}}>MENU ITEMS ({menuItems.length}/6)</div>
      {menuItems.length<6 && <button className="btn-ghost" style={{padding:"4px 12px",fontSize:11}} onClick={()=>update("menuItems",[...menuItems,{name:"",desc:"",price:"",icon:"🍽️"}])}>+ Add</button>}
    </div>
    {menuItems.map((item,i)=>(<div key={i} className="menu-row">
      <InlineEmojiPicker value={item.icon} onChange={v=>updateItem(i,"icon",v)}/>
      <div style={{flex:2}}><InlineField value={item.name} onChange={v=>updateItem(i,"name",v)} placeholder="Item"/></div>
      <div style={{flex:2}}><InlineField value={item.desc} onChange={v=>updateItem(i,"desc",v)} placeholder="Description"/></div>
      <InlineField value={item.price} onChange={v=>updateItem(i,"price",v)} placeholder="$0" width={64}/>
      <button onClick={()=>update("menuItems",menuItems.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.w(.2),cursor:"pointer",fontSize:16,padding:"4px"}}>×</button>
    </div>))}
  </div>);
};

const EditorHappyHour = ({data:d, update}) => {
  const deals = d.deals||[];
  const updateDeal = (idx,k,v) => {const dd=[...deals];dd[idx]={...dd[idx],[k]:v};update("deals",dd)};
  const colors = [{c:C.amber},{c:"#e879f9"},{c:C.green},{c:C.blue},{c:C.cyan}];
  return (<div>
    <EmojiPicker value={d.emoji||"🍹"} onChange={v=>update("emoji",v)} label="Slide Icon"/>
    <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Field label="Time Range" value={d.timeRange||""} onChange={v=>update("timeRange",v)} placeholder="4 PM – 7 PM"/></div><div style={{flex:1}}><Field label="Frequency" value={d.frequency||""} onChange={v=>update("frequency",v)} placeholder="Every weekday"/></div></div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:10}}>
      <div className="field-label" style={{margin:0,fontSize:12,color:C.w(.35)}}>DEALS ({deals.length}/4)</div>
      {deals.length<4 && <button className="btn-ghost" style={{padding:"4px 12px",fontSize:11}} onClick={()=>update("deals",[...deals,{deal:"",item:"",color:C.amber}])}>+ Add</button>}
    </div>
    {deals.map((deal,i)=>(<div key={i} style={{background:C.w(.03),borderRadius:12,padding:"14px",marginBottom:10,border:`1px solid ${C.w(.04)}`}}>
      <div style={{display:"flex",gap:10,marginBottom:8}}><div style={{flex:1}}><Field label="Deal" value={deal.deal} onChange={v=>updateDeal(i,"deal",v)} placeholder="50% OFF" small/></div><div style={{flex:1}}><Field label="Item" value={deal.item} onChange={v=>updateDeal(i,"item",v)} placeholder="All Drafts" small/></div><button onClick={()=>update("deals",deals.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.w(.2),cursor:"pointer",fontSize:16,alignSelf:"flex-end",marginBottom:10}}>×</button></div>
      <div style={{display:"flex",gap:6}}>{colors.map((col,j)=>(<div key={j} onClick={()=>updateDeal(i,"color",col.c)} style={{width:24,height:24,borderRadius:6,background:col.c,cursor:"pointer",border:deal.color===col.c?"2px solid #fff":"2px solid transparent",opacity:deal.color===col.c?1:.4}}/>))}</div>
    </div>))}
  </div>);
};

const EditorEvent = ({data:d, update}) => {
  const prizes = d.prizes||[];
  const updatePrize = (idx,k,v) => {const pp=[...prizes];pp[idx]={...pp[idx],[k]:v};update("prizes",pp)};
  return (<div>
    <EmojiPicker value={d.emoji||"🎧"} onChange={v=>update("emoji",v)} label="Event Icon"/>
    <Field label="Event Name" value={d.eventName||""} onChange={v=>update("eventName",v)} placeholder="Trivia Night"/>
    <Field label="When" value={d.when||""} onChange={v=>update("when",v)} placeholder="This Thursday"/>
    <Field label="Details" value={d.details||""} onChange={v=>update("details",v)} placeholder="8 PM • Free to play • Prizes for top 3"/>
    <div className="field-label" style={{marginBottom:8,marginTop:4,fontSize:12,color:C.w(.35)}}>PRIZES</div>
    {prizes.map((p,i)=>(<div key={i} className="menu-row">
      <InlineEmojiPicker value={p.emoji} onChange={v=>updatePrize(i,"emoji",v)}/>
      <InlineField value={p.place} onChange={v=>updatePrize(i,"place",v)} placeholder="1st" width={56}/>
      <div style={{flex:1}}><InlineField value={p.prize} onChange={v=>updatePrize(i,"prize",v)} placeholder="$50 Bar Tab"/></div>
    </div>))}
  </div>);
};

const EditorBrand = ({data:d, update}) => {
  const hours = d.hours||[];
  const updateH = (idx,k,v) => {const hh=[...hours];hh[idx]={...hh[idx],[k]:v};update("hours",hh)};
  return (<div>
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:14,background:C.w(.03),borderRadius:12,border:`1px solid ${C.w(.04)}`}}>
      <BarLogo size={56}/><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>Mo's Tavern</div><div style={{fontSize:11,color:C.w(.3)}}>Logo on all signage</div></div><button className="btn-ghost" style={{padding:"6px 14px",fontSize:11}}>Upload Logo</button>
    </div>
    <Field label="Tagline" value={d.tagline||""} onChange={v=>update("tagline",v)} placeholder="Cold Drinks • Good Times"/>
    <div className="field-label" style={{marginBottom:8,marginTop:4,fontSize:12,color:C.w(.35)}}>HOURS</div>
    {hours.map((h,i)=>(<div key={i} className="menu-row"><div style={{flex:1}}><InlineField value={h.label} onChange={v=>updateH(i,"label",v)} placeholder="Mon–Thu"/></div><div style={{flex:2}}><InlineField value={h.hours} onChange={v=>updateH(i,"hours",v)} placeholder="4 PM – 12 AM"/></div></div>))}
  </div>);
};

const EditorAnnouncement = ({data:d, update}) => (<div>
  <EmojiPicker value={d.emoji||"📢"} onChange={v=>update("emoji",v)} label="Slide Icon"/>
  <Field label="Headline" value={d.headline||""} onChange={v=>update("headline",v)} placeholder="Big News!"/>
  <div style={{marginBottom:14}}><div className="field-label">Message</div><textarea className="field-input" value={d.message||""} onChange={e=>update("message",e.target.value)} placeholder="Your announcement..." rows={3} style={{resize:"vertical",minHeight:60}}/></div>
  <Field label="Subtext (optional)" value={d.subtext||""} onChange={v=>update("subtext",v)} placeholder="Additional details"/>
</div>);

const EditorSports = ({data:d, update}) => (<div>
  <EmojiPicker value={d.emoji||"🏈"} onChange={v=>update("emoji",v)} label="Sport Icon"/>
  <Field label="Headline" value={d.headline||""} onChange={v=>update("headline",v)} placeholder="Game Day"/>
  <Field label="Matchup" value={d.matchup||""} onChange={v=>update("matchup",v)} placeholder="Eagles vs Cowboys"/>
  <Field label="When" value={d.when||""} onChange={v=>update("when",v)} placeholder="Sunday at 4:25 PM"/>
  <Field label="Promo / Specials" value={d.promo||""} onChange={v=>update("promo",v)} placeholder="$3 Bud Light • $5 Wings"/>
  <Field label="Tagline (optional)" value={d.tagline||""} onChange={v=>update("tagline",v)} placeholder="Best seat in town"/>
</div>);

const EditorCustom = ({data:d, update}) => {
  const items = d.items||[];
  const updateItem = (idx,k,v) => {const ii=[...items];ii[idx]={...ii[idx],[k]:v};update("items",ii)};
  return (<div>
    <EmojiPicker value={d.emoji||"✨"} onChange={v=>update("emoji",v)} label="Hero Icon"/>
    <Field label="Headline" value={d.headline||""} onChange={v=>update("headline",v)} placeholder="Your Message Here"/>
    <div style={{marginBottom:14}}><div className="field-label">Body Text</div><textarea className="field-input" value={d.body||""} onChange={e=>update("body",e.target.value)} placeholder="Write anything you want..." rows={3} style={{resize:"vertical",minHeight:60}}/></div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,marginBottom:10}}>
      <div className="field-label" style={{margin:0,fontSize:12,color:C.w(.35)}}>ITEMS ({items.length}/6)</div>
      {items.length<6 && <button className="btn-ghost" style={{padding:"4px 12px",fontSize:11}} onClick={()=>update("items",[...items,{emoji:"⭐",text:""}])}>+ Add</button>}
    </div>
    {items.map((item,i)=>(<div key={i} className="menu-row">
      <InlineEmojiPicker value={item.emoji} onChange={v=>updateItem(i,"emoji",v)}/>
      <div style={{flex:1}}><InlineField value={item.text} onChange={v=>updateItem(i,"text",v)} placeholder="Item text"/></div>
      <button onClick={()=>update("items",items.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.w(.2),cursor:"pointer",fontSize:16,padding:"4px"}}>×</button>
    </div>))}
  </div>);
};

const EDITOR_MAP = {specials:EditorSpecials,happyhour:EditorHappyHour,event:EditorEvent,brand:EditorBrand,announcement:EditorAnnouncement,sports:EditorSports,custom:EditorCustom};


// ================================================================
// DUAL PREVIEW
// ================================================================

const DualPreview = ({data, templateId, sticky=true}) => {
  const [mode, setMode] = useState("fullscreen");
  const FullScreen = TV_RENDER[templateId];
  return (
    <div style={sticky ? {position:"sticky",top:24} : {}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",gap:3,background:C.w(.03),borderRadius:8,padding:3}}>
          <button className="preview-toggle" onClick={()=>setMode("fullscreen")} style={{background:mode==="fullscreen"?C.amber:"transparent",color:mode==="fullscreen"?"#000":C.w(.35)}}>📺 Off-Hours</button>
          <button className="preview-toggle" onClick={()=>setMode("ingame")} style={{background:mode==="ingame"?C.green:"transparent",color:mode==="ingame"?"#000":C.w(.35)}}>🎮 In-Game</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:"50%",background:C.green}}/><span style={{fontSize:10,color:C.w(.25)}}>Live preview</span></div>
      </div>
      <div style={{borderRadius:12,overflow:"hidden",border:`2px solid ${C.w(.06)}`,background:"#000"}}>
        <div style={{transform:"scale(0.5625)",transformOrigin:"top left",width:960,height:540}}>
          {mode==="fullscreen" ? (FullScreen && <FullScreen data={data}/>) : <InGameMockLeaderboard data={data} templateId={templateId}/>}
        </div>
      </div>
      <div style={{height:540*0.5625-540}}/>
      <div style={{fontSize:10,color:C.w(.2),marginTop:8,textAlign:"center"}}>{mode==="fullscreen"?"Full-screen slide — shown when no game is running":"In-game panel — shown during leaderboard, idle & results screens"}</div>
    </div>
  );
};


// ================================================================
// SIGNAGE CREATOR PAGE
// ================================================================

const DAYS = ["All Days","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const PageSignage = ({slides, setSlides, selectedDay, setSelectedDay}) => {
  const [editing, setEditing] = useState(null);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [listPreviewMode, setListPreviewMode] = useState("fullscreen");

  const daySlides = selectedDay === "All Days" ? slides : slides.filter(s => !s.days || s.days.includes(selectedDay));
  const canAdd = slides.length < 10;

  const startCreate = (tmpl) => setEditing({templateId:tmpl.id, data:{...tmpl.defaults, menuItems:tmpl.defaults.menuItems?[...tmpl.defaults.menuItems]:undefined, deals:tmpl.defaults.deals?[...tmpl.defaults.deals]:undefined, prizes:tmpl.defaults.prizes?[...tmpl.defaults.prizes]:undefined, hours:tmpl.defaults.hours?[...tmpl.defaults.hours]:undefined, items:tmpl.defaults.items?[...tmpl.defaults.items]:undefined}, editIdx:null});
  const startEdit = (idx) => { const s=slides[idx]; setEditing({templateId:s.template, data:{...s.data}, editIdx:idx}); };
  const saveSlide = () => {
    if (!editing) return;
    if (editing.editIdx !== null) {
      setSlides(s => s.map((sl,i) => i===editing.editIdx ? {...sl, data:{...editing.data}} : sl));
    } else {
      const tmpl = TEMPLATES.find(t=>t.id===editing.templateId);
      setSlides(s => [...s, {template:editing.templateId, name:tmpl.name, icon:tmpl.icon, data:{...editing.data}, enabled:true, days:null}]);
    }
    setEditing(null);
  };
  const removeSlide = (idx) => { setSlides(s=>s.filter((_,i)=>i!==idx)); setPreviewSlide(p=>Math.max(0,Math.min(p,daySlides.length-2))); };
  const toggleSlide = (idx) => setSlides(s => s.map((sl,i) => i===idx ? {...sl,enabled:!sl.enabled} : sl));
  const toggleDay = (idx, day) => setSlides(s => s.map((sl,i) => {
    if (i!==idx) return sl;
    const cur = sl.days || [];
    const has = cur.includes(day);
    const next = has ? cur.filter(d=>d!==day) : [...cur, day];
    return {...sl, days: next.length===0 ? null : next};
  }));
  const update = (k,v) => setEditing(e=>({...e, data:{...e.data,[k]:v}}));

  // ─── EDITOR VIEW ───
  if (editing) {
    const Editor = EDITOR_MAP[editing.templateId];
    const tmpl = TEMPLATES.find(t=>t.id===editing.templateId);
    return (
      <div style={{animation:"fadeIn .3s ease-out"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
          <button className="btn-ghost" onClick={()=>setEditing(null)} style={{padding:"8px 14px",fontSize:12}}>← Back</button>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <span style={{fontSize:28}}>{tmpl.icon}</span>
            <div>
              <h1 style={{fontSize:24,fontWeight:700,color:"#fff",margin:0}}>{editing.editIdx!==null?"Edit":"Create"} {tmpl.name}</h1>
              <p style={{fontSize:12,color:C.w(.35),marginTop:2}}>Fill out the details — toggle preview between off-hours and in-game</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={()=>setEditing(null)} style={{padding:"10px 20px"}}>Cancel</button>
          <button className="btn-primary" onClick={saveSlide} style={{padding:"10px 24px"}}>{editing.editIdx!==null ? "💾 Save Changes" : "➕ Add to Rotation"}</button>
        </div>
        <div style={{display:"flex",gap:24}}>
          <div className="dash-card" style={{flex:1,padding:"28px",minWidth:0,maxHeight:"calc(100vh - 140px)",overflow:"auto"}}>
            {Editor && <Editor data={editing.data} update={update}/>}
          </div>
          <div style={{width:560,flexShrink:0}}><DualPreview data={editing.data} templateId={editing.templateId}/></div>
        </div>
      </div>
    );
  }

  // ─── MAIN VIEW ───
  return (
    <div style={{animation:"fadeIn .3s ease-out"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:28,fontWeight:700,color:"#fff",margin:0}}>Signage Creator</h1>
        <p style={{fontSize:14,color:C.w(.4),marginTop:4}}>Design what shows on your TV — off-hours full-screen and in-game right panel</p>
      </div>

      {/* TEMPLATES — 7 cards */}
      <div style={{marginBottom:36}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <span style={{fontSize:11,fontWeight:700,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase"}}>Start from a Template</span>
          {!canAdd && <span style={{fontSize:11,fontWeight:600,color:C.amber,background:"rgba(245,158,11,.1)",borderRadius:6,padding:"3px 10px"}}>10/10 slides — remove one to add more</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10}}>
          {TEMPLATES.map((tmpl,i) => (
            <div key={i} onClick={canAdd ? ()=>startCreate(tmpl) : undefined} style={{
              background:C.w(.03),border:`1px solid ${C.w(.06)}`,borderRadius:14,padding:"18px 10px",
              cursor:canAdd?"pointer":"not-allowed",transition:"all .2s",textAlign:"center",
              opacity:canAdd?1:.4,animation:`slideUp .3s ease-out ${i*.04}s both`,
            }} onMouseEnter={e=>{if(canAdd){e.currentTarget.style.background=C.w(.06);e.currentTarget.style.borderColor=`${tmpl.color}40`;e.currentTarget.style.transform="translateY(-2px)"}}} onMouseLeave={e=>{e.currentTarget.style.background=C.w(.03);e.currentTarget.style.borderColor=C.w(.06);e.currentTarget.style.transform="none"}}>
              <div style={{fontSize:32,marginBottom:6}}>{tmpl.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>{tmpl.name}</div>
              <div style={{fontSize:9,color:C.w(.3),lineHeight:1.3}}>{tmpl.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* YOUR ROTATION */}
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:11,fontWeight:700,color:C.w(.3),letterSpacing:1.5,textTransform:"uppercase"}}>Your Rotation</span>
            <span style={{fontSize:11,fontWeight:600,color:C.w(.2),background:C.w(.04),borderRadius:6,padding:"3px 10px"}}>{slides.length}/10 slides</span>
          </div>
          {slides.length > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:C.w(.3)}}>Rotate every</span>
                <div style={{display:"flex",gap:3,background:C.w(.04),borderRadius:7,padding:2}}>{["10s","15s","30s","60s"].map(t=>(<div key={t} style={{padding:"4px 10px",borderRadius:5,background:t==="15s"?C.blue:"transparent",fontSize:10,fontWeight:600,color:t==="15s"?"#fff":C.w(.3),cursor:"pointer"}}>{t}</div>))}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:C.green,animation:"statusPulse 2s ease-in-out infinite"}}/><span style={{fontSize:11,color:C.w(.3)}}>TV online</span></div>
            </div>
          )}
        </div>

        {slides.length > 0 && (
          <div style={{display:"flex",gap:3,marginBottom:14,background:C.w(.02),borderRadius:9,padding:3,width:"fit-content"}}>
            {DAYS.map(day => (<button key={day} onClick={()=>setSelectedDay(day)} style={{padding:"6px 14px",borderRadius:7,border:"none",background:selectedDay===day?C.blue:"transparent",color:selectedDay===day?"#fff":C.w(.35),fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all .15s"}}>{day}</button>))}
          </div>
        )}

        {slides.length === 0 ? (
          <div style={{border:`2px dashed ${C.w(.06)}`,borderRadius:16,padding:"48px 40px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.4}}>📺</div>
            <div style={{fontSize:16,fontWeight:600,color:C.w(.3)}}>No slides in rotation yet</div>
            <div style={{fontSize:13,color:C.w(.2),marginTop:4}}>Pick a template above to create your first slide</div>
          </div>
        ) : (
          <div style={{display:"flex",gap:20}}>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
              {daySlides.map((slide,di) => {
                const realIdx = slides.indexOf(slide);
                const ThumbFull = TV_RENDER[slide.template];
                return (
                  <div key={realIdx} className="dash-card" style={{padding:"14px 18px",opacity:slide.enabled?1:.4,animation:`slideUp .25s ease-out ${di*.03}s both`}}>
                    <div style={{display:"flex",gap:14,alignItems:"center"}}>
                      <div style={{width:128,height:72,borderRadius:8,overflow:"hidden",border:`1px solid ${C.w(.06)}`,background:"#000",flexShrink:0,cursor:"pointer"}} onClick={()=>setPreviewSlide(di)}>
                        <div style={{transform:"scale(0.1333)",transformOrigin:"top left",width:960,height:540,pointerEvents:"none"}}>{ThumbFull && <ThumbFull data={slide.data}/>}</div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontSize:16}}>{slide.icon}</span>
                          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{slide.name}</span>
                        </div>
                        <div style={{display:"flex",gap:3}}>
                          {WEEKDAYS.map(day => {
                            const active = !slide.days || slide.days.includes(day);
                            return (<div key={day} onClick={()=>toggleDay(realIdx,day)} style={{width:30,height:20,borderRadius:5,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:active?`${C.blue}20`:"transparent",color:active?C.blue:C.w(.12),border:`1px solid ${active?`${C.blue}35`:C.w(.05)}`,transition:"all .15s"}}>{day}</div>);
                          })}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                        <div onClick={()=>toggleSlide(realIdx)} style={{width:38,height:20,borderRadius:10,background:slide.enabled?C.green:C.w(.1),cursor:"pointer",position:"relative",transition:"background .2s"}}>
                          <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:slide.enabled?20:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                        </div>
                        <button className="btn-ghost" style={{padding:"5px 12px",fontSize:11}} onClick={()=>startEdit(realIdx)}>Edit</button>
                        <button className="btn-danger" style={{padding:"5px 10px",fontSize:11}} onClick={()=>removeSlide(realIdx)}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{width:480,flexShrink:0}}>
              <div style={{position:"sticky",top:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",gap:3,background:C.w(.03),borderRadius:8,padding:3}}>
                    <button className="preview-toggle" onClick={()=>setListPreviewMode("fullscreen")} style={{background:listPreviewMode==="fullscreen"?C.amber:"transparent",color:listPreviewMode==="fullscreen"?"#000":C.w(.35)}}>📺 Off-Hours</button>
                    <button className="preview-toggle" onClick={()=>setListPreviewMode("ingame")} style={{background:listPreviewMode==="ingame"?C.green:"transparent",color:listPreviewMode==="ingame"?"#000":C.w(.35)}}>🎮 In-Game</button>
                  </div>
                  {daySlides.length>0 && <span style={{fontSize:10,color:C.w(.2)}}>Slide {Math.min(previewSlide+1,daySlides.length)}/{daySlides.length}</span>}
                </div>
                {daySlides[previewSlide] && (() => {
                  const sl = daySlides[previewSlide];
                  const Full = TV_RENDER[sl.template];
                  return (
                    <div style={{borderRadius:12,overflow:"hidden",border:`2px solid ${C.w(.06)}`,background:"#000"}}>
                      <div style={{transform:"scale(0.5)",transformOrigin:"top left",width:960,height:540}}>
                        {listPreviewMode === "fullscreen" ? (Full && <Full data={sl.data}/>) : <InGameMockLeaderboard data={sl.data} templateId={sl.template}/>}
                      </div>
                    </div>
                  );
                })()}
                <div style={{height:540*0.5-540}}/>
                <div style={{fontSize:9,color:C.w(.15),marginTop:6,textAlign:"center"}}>{listPreviewMode==="fullscreen"?"Full-screen slide — no game running":"In-game right panel — during leaderboard, idle & results"}</div>
                {daySlides.length > 1 && (
                  <div style={{display:"flex",gap:4,marginTop:8,justifyContent:"center"}}>
                    {daySlides.map((_,i)=>(<button key={i} onClick={()=>setPreviewSlide(i)} style={{width:26,height:26,borderRadius:6,border:"none",background:i===previewSlide?C.blue:C.w(.04),color:i===previewSlide?"#fff":C.w(.25),fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all .15s"}}>{i+1}</button>))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ================================================================
// OTHER DASHBOARD PAGES (unchanged)
// ================================================================

const StatCard = ({value, label, change, color, icon}) => (
  <div className="dash-card" style={{padding:"24px",flex:1,minWidth:160}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
      <div style={{width:40,height:40,borderRadius:12,background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div>
      {change && <span style={{fontSize:12,fontWeight:600,color:C.green,background:"rgba(0,212,170,.1)",borderRadius:6,padding:"2px 8px"}}>{change}</span>}
    </div>
    <div style={{fontFamily:"'Fredoka',sans-serif",fontSize:32,fontWeight:700,color:"#fff",lineHeight:1}}>{value}</div>
    <div style={{fontSize:13,color:C.w(.35),marginTop:4,fontWeight:500}}>{label}</div>
  </div>
);

const PageDashboard = ({setPage, slideCount}) => (
  <div style={{animation:"fadeIn .3s ease-out"}}>
    <div style={{marginBottom:32}}><h1 style={{fontSize:28,fontWeight:700,color:"#fff",margin:0}}>Dashboard</h1><p style={{fontSize:14,color:C.w(.4),marginTop:4}}>Welcome back, Mo's Tavern</p></div>
    <div className="dash-card" style={{padding:"20px 28px",marginBottom:24,background:"linear-gradient(135deg,rgba(102,126,234,.08),rgba(118,75,162,.04))",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:16}}><div style={{width:10,height:10,borderRadius:"50%",background:C.green,animation:"statusPulse 2s ease-in-out infinite"}}/><div><div style={{fontSize:15,fontWeight:600,color:"#fff"}}>TV is online — Signage mode active</div><div style={{fontSize:12,color:C.w(.35),marginTop:2}}>Main Bar TV • {slideCount} slides rotating every 15s</div></div></div>
      <button className="btn-primary" onClick={()=>setPage("signage")}>Create Signage →</button>
    </div>
    <div style={{display:"flex",gap:16,marginBottom:24}}>
      <StatCard value="47" label="Players this week" change="+12%" color={C.blue} icon="👥"/>
      <StatCard value="4" label="Games played" change="+2" color={C.green} icon="🎮"/>
      <StatCard value="23m" label="Avg session" change="+4m" color={C.amber} icon="⏱️"/>
      <StatCard value="18" label="Peak players" color={C.purple} icon="🏆"/>
    </div>
    <div style={{display:"flex",gap:20}}>
      <div className="dash-card" style={{flex:1,padding:"24px"}}>
        <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:16}}>Tonight's Schedule</div>
        {[{time:"4:00 PM",event:"Happy Hour Signage",status:"active",color:C.green},{time:"7:00 PM",event:"Specials + Branding",status:"scheduled",color:C.amber},{time:"8:00 PM",event:"Trivia Night",status:"scheduled",color:C.blue},{time:"10:00 PM",event:"Late Night Signage",status:"scheduled",color:C.slate}].map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<3?`1px solid ${C.w(.04)}`:"none"}}><div style={{width:8,height:8,borderRadius:"50%",background:item.color,boxShadow:item.status==="active"?`0 0 8px ${item.color}`:"none"}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:C.w(.4),fontWeight:500,width:70}}>{item.time}</span><span style={{flex:1,fontSize:14,fontWeight:500,color:C.w(.7)}}>{item.event}</span><span style={{fontSize:11,fontWeight:600,color:item.color,textTransform:"uppercase",letterSpacing:1}}>{item.status}</span></div>))}
      </div>
      <div style={{width:280,display:"flex",flexDirection:"column",gap:12}}>
        {[{icon:"📺",title:"Create Signage",desc:"Design & manage TV slides",page:"signage"},{icon:"📈",title:"View Analytics",desc:"Player trends, peak hours",page:"analytics"},{icon:"⚙️",title:"Settings",desc:"Profile, bar code, account",page:"settings"}].map((a,i)=>(<div key={i} className="dash-card" style={{padding:"20px",cursor:"pointer"}} onClick={()=>setPage(a.page)}><div style={{fontSize:28,marginBottom:8}}>{a.icon}</div><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{a.title}</div><div style={{fontSize:12,color:C.w(.35),marginTop:4}}>{a.desc}</div></div>))}
      </div>
    </div>
  </div>
);

const PageAnalytics = () => (
  <div style={{animation:"fadeIn .3s ease-out"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}><div><h1 style={{fontSize:28,fontWeight:700,color:"#fff",margin:0}}>Analytics</h1><p style={{fontSize:14,color:C.w(.4),marginTop:4}}>Player engagement and performance</p></div><div style={{display:"flex",gap:4,background:C.w(.04),borderRadius:10,padding:3}}>{["Today","This Week","This Month","All Time"].map((p,i)=>(<div key={i} style={{padding:"8px 16px",borderRadius:8,background:i===1?C.blue:"transparent",fontSize:12,fontWeight:600,color:i===1?"#fff":C.w(.4),cursor:"pointer"}}>{p}</div>))}</div></div>
    <div style={{display:"flex",gap:16,marginBottom:24}}>
      <StatCard value="47" label="Total players" change="+12%" color={C.blue} icon="👥"/>
      <StatCard value="4" label="Games played" change="+2" color={C.green} icon="🎮"/>
      <StatCard value="23m" label="Avg session" change="+4m" color={C.amber} icon="⏱️"/>
      <StatCard value="68%" label="Avg correct" change="+3%" color={C.purple} icon="🎯"/>
    </div>
    <div style={{display:"flex",gap:20}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
        <div className="dash-card" style={{padding:"24px"}}><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:20}}>Players Per Game</div><div style={{display:"flex",alignItems:"flex-end",gap:12,height:140,padding:"0 8px"}}>{[{d:"Mon",v:8},{d:"Tue",v:12},{d:"Wed",v:15},{d:"Thu",v:11},{d:"Fri",v:18},{d:"Sat",v:14},{d:"Sun",v:22}].map((bar,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}><span style={{fontSize:11,fontWeight:600,color:C.w(.5)}}>{bar.v}</span><div style={{width:"100%",height:`${(bar.v/22)*110}px`,borderRadius:"8px 8px 0 0",background:bar.v>=15?`linear-gradient(180deg,${C.green},${C.green}80)`:`linear-gradient(180deg,${C.blue},${C.blue}60)`,animation:`slideUp .4s ease-out ${i*.06}s both`}}/><span style={{fontSize:11,color:C.w(.3),fontWeight:500}}>{bar.d}</span></div>))}</div></div>
        <div className="dash-card" style={{padding:"24px"}}><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:16}}>Peak Hours</div>{[{time:"8–9 PM",pct:92},{time:"9–10 PM",pct:78},{time:"7–8 PM",pct:55},{time:"10–11 PM",pct:35}].map((t,i)=>(<div key={i} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.w(.6)}}>{t.time}</span><span style={{fontSize:12,fontWeight:600,color:t.pct>80?C.green:t.pct>50?C.amber:C.w(.4)}}>{t.pct}%</span></div><div style={{height:8,borderRadius:4,background:C.w(.06),overflow:"hidden"}}><div style={{height:"100%",width:`${t.pct}%`,borderRadius:4,background:t.pct>80?C.green:t.pct>50?C.amber:C.blue,animation:`barReveal .6s ease-out ${i*.1}s both`,transformOrigin:"left"}}/></div></div>))}</div>
      </div>
      <div style={{width:340,display:"flex",flexDirection:"column",gap:20}}>
        <div className="dash-card" style={{padding:"24px"}}><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:16}}>Popular Categories</div>{[{cat:"Entertainment",pct:89,emoji:"🎬"},{cat:"Sports",pct:82,emoji:"⚽"},{cat:"Science",pct:76,emoji:"🔬"},{cat:"Geography",pct:71,emoji:"🌍"},{cat:"History",pct:68,emoji:"📜"},{cat:"Pop Culture",pct:63,emoji:"📱"}].map((t,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:18}}>{t.emoji}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:600,color:C.w(.6)}}>{t.cat}</span><span style={{fontSize:11,fontWeight:600,color:C.w(.4)}}>{t.pct}%</span></div><div style={{height:5,borderRadius:3,background:C.w(.06),overflow:"hidden"}}><div style={{height:"100%",width:`${t.pct}%`,borderRadius:3,background:`linear-gradient(90deg,${C.blue},${C.purple})`,animation:`barReveal .5s ease-out ${i*.06}s both`,transformOrigin:"left"}}/></div></div></div>))}</div>
        <div className="dash-card" style={{padding:"24px"}}><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:16}}>Player Retention</div>{[{label:"Played 1 game",val:"47",pct:100},{label:"Returned same night",val:"31",pct:66},{label:"Came back next week",val:"18",pct:38}].map((r,i)=>(<div key={i} style={{padding:"10px 0",borderBottom:i<2?`1px solid ${C.w(.04)}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:500,color:C.w(.6)}}>{r.label}</div><div style={{height:4,borderRadius:2,background:C.w(.06),width:160,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:`${r.pct}%`,borderRadius:2,background:C.emerald,animation:`barReveal .5s ease-out ${i*.1}s both`,transformOrigin:"left"}}/></div></div><span style={{fontFamily:"'Fredoka',sans-serif",fontSize:20,fontWeight:700,color:C.w(.7)}}>{r.val}</span></div>))}</div>
      </div>
    </div>
  </div>
);

const PageSettings = () => (
  <div style={{animation:"fadeIn .3s ease-out"}}>
    <div style={{marginBottom:32}}><h1 style={{fontSize:28,fontWeight:700,color:"#fff",margin:0}}>Settings</h1><p style={{fontSize:14,color:C.w(.4),marginTop:4}}>Bar profile and account</p></div>
    <div style={{display:"flex",gap:24}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
        <div className="dash-card" style={{padding:"28px"}}><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:20}}>Bar Profile</div><div style={{display:"flex",alignItems:"center",gap:20,marginBottom:20}}><BarLogo size={72}/><div style={{flex:1}}><Field label="Bar Name" value="Mo's Tavern" onChange={()=>{}} placeholder="Your bar name"/><Field label="Location" value="Monroe, NC" onChange={()=>{}} placeholder="City, State"/></div></div></div>
        <div className="dash-card" style={{padding:"28px",display:"flex",alignItems:"center",gap:24}}><div><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:4}}>Your Permanent Bar Code</div><div style={{fontSize:13,color:C.w(.35)}}>Displayed on your TV for patrons to join. Never changes.</div></div><div style={{flexShrink:0,display:"flex",alignItems:"center",gap:16}}><div style={{fontFamily:"'Fredoka',sans-serif",fontSize:48,fontWeight:700,color:C.gold,letterSpacing:6}}>BR7X</div><QRCode size={80}/></div></div>
        <div className="dash-card" style={{padding:"28px"}}><div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:16}}>Account</div>{[{l:"Email",v:"mo@mostavern.com",action:"Change"},{l:"Authentication",v:"Email OTP (passwordless)"},{l:"Trusted Device",v:"This computer",c:C.green,action:"Remove"}].map((r,i)=>(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:i<2?`1px solid ${C.w(.04)}`:"none"}}><div><div className="field-label" style={{marginBottom:0}}>{r.l}</div><div style={{fontSize:14,color:r.c||C.w(.7),marginTop:2,fontWeight:500}}>{r.v}</div></div>{r.action&&<button className="btn-ghost" style={{padding:"6px 14px",fontSize:12}}>{r.action}</button>}</div>))}</div>
      </div>
      <div style={{width:340,display:"flex",flexDirection:"column",gap:20}}>
        <div className="dash-card" style={{padding:"24px",background:"linear-gradient(135deg,rgba(102,126,234,.06),rgba(118,75,162,.03))"}}>
          <div style={{fontSize:15,fontWeight:600,color:"#fff",marginBottom:8}}>Subscription</div>
          <div style={{fontSize:13,color:C.w(.5),marginBottom:12}}>Bars use TapTrivia <span style={{color:C.green,fontWeight:700}}>completely free</span>. Players subscribe at $2.99/mo.</div>
          <div style={{background:C.w(.06),borderRadius:8,padding:"8px 14px",display:"inline-flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>✨</span><span style={{fontSize:12,fontWeight:600,color:C.gold}}>Free Forever</span></div>
        </div>
        <div className="dash-card" style={{padding:"24px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontSize:15,fontWeight:600,color:"#fff"}}>Operating Hours</div><button className="btn-ghost" style={{padding:"4px 12px",fontSize:11}}>Edit</button></div>{[{day:"Mon – Thu",hours:"4:00 PM – 12:00 AM"},{day:"Fri – Sat",hours:"4:00 PM – 2:00 AM"},{day:"Sunday",hours:"12:00 PM – 10:00 PM"}].map((h,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<2?`1px solid ${C.w(.04)}`:"none"}}><span style={{fontSize:13,fontWeight:600,color:C.w(.5)}}>{h.day}</span><span style={{fontSize:13,fontWeight:500,color:C.gold}}>{h.hours}</span></div>))}</div>
        <button className="btn-ghost" style={{width:"100%",color:C.w(.35)}}>Contact Support</button>
      </div>
    </div>
  </div>
);


// ================================================================
// MAIN APP
// ================================================================

export default function App() {
  const [authStep, setAuthStep] = useState("login");
  const [page, setPage] = useState("signage");
  const [slides, setSlides] = useState([]);
  const [selectedDay, setSelectedDay] = useState("All Days");

  const navItems = [
    {key:"dashboard",icon:"🏠",label:"Dashboard"},
    {key:"signage",icon:"📺",label:"Signage Creator"},
    {key:"analytics",icon:"📈",label:"Analytics"},
    {key:"settings",icon:"⚙️",label:"Settings"},
  ];

  if (authStep === "login") return <><Styles/><AuthLogin onNext={()=>setAuthStep("otp")}/></>;
  if (authStep === "otp") return <><Styles/><AuthOTP onNext={()=>setAuthStep("trust")} onBack={()=>setAuthStep("login")}/></>;
  if (authStep === "trust") return <><Styles/><AuthTrust onNext={()=>setAuthStep("dashboard")}/></>;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"'Outfit',sans-serif",color:"#fff"}}>
      <Styles/>
      <div style={{width:240,flexShrink:0,background:C.grad.sidebar,borderRight:`1px solid ${C.w(.05)}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"24px 20px 20px",borderBottom:`1px solid ${C.w(.04)}`}}><Logo size="md"/><div style={{fontSize:10,fontWeight:600,color:C.w(.2),letterSpacing:1,marginTop:6}}>BAR DASHBOARD</div></div>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.w(.04)}`,display:"flex",alignItems:"center",gap:12}}><BarLogo size={40}/><div><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>Mo's Tavern</div><div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}><div style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"statusPulse 2s ease-in-out infinite"}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,color:C.gold}}>BR7X</span></div></div></div>
        <div style={{padding:"12px 12px",flex:1,display:"flex",flexDirection:"column",gap:2}}>
          {navItems.map(n=>(<button key={n.key} className={`nav-item ${page===n.key?"active":""}`} onClick={()=>setPage(n.key)}><span style={{fontSize:18}}>{n.icon}</span>{n.label}</button>))}
        </div>
        <div style={{padding:"16px 20px",borderTop:`1px solid ${C.w(.04)}`}}><div style={{fontSize:11,color:C.w(.2)}}>Bars are always free</div><div style={{fontSize:10,color:C.w(.15),marginTop:2}}>v6.0 • taptrivia.com</div></div>
      </div>
      <div style={{flex:1,padding:"32px 40px",overflow:"auto",maxHeight:"100vh"}}>
        <div style={{maxWidth:1200}}>
          {page==="dashboard" && <PageDashboard setPage={setPage} slideCount={slides.filter(s=>s.enabled).length}/>}
          {page==="signage" && <PageSignage slides={slides} setSlides={setSlides} selectedDay={selectedDay} setSelectedDay={setSelectedDay}/>}
          {page==="analytics" && <PageAnalytics/>}
          {page==="settings" && <PageSettings/>}
        </div>
      </div>
    </div>
  );
}
