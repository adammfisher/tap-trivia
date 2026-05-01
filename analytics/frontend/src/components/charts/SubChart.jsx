import { C } from "../../lib/theme";

export default function SubChart({data, compareData}) {
  const W = 600, H = 120, pad = 8;
  if (!data || data.length === 0) {
    return (
      <div style={{height:140,display:"flex",alignItems:"center",justifyContent:"center",color:C.w(0.3),fontSize:12}}>
        No subscriber history yet
      </div>
    );
  }

  const downsample = (arr) => {
    if (arr.length <= 40) return arr;
    const step = Math.ceil(arr.length / 40);
    return arr.filter((_,i) => i % step === 0 || i === arr.length - 1);
  };

  const main = downsample(data);
  const cmp  = compareData ? downsample(compareData) : null;

  const allVals = [
    ...main.map(d => d.paid + d.trial),
    ...(cmp ? cmp.map(d => d.paid + d.trial) : []),
  ];
  const max = Math.max(...allVals) * 1.1 || 1;
  const xStep = (W - pad*2) / Math.max(1, main.length - 1);
  const y = v => H - pad - (v/max) * (H - pad*2);

  const buildPath = (arr, key) => {
    const step = (W - pad*2) / Math.max(1, arr.length - 1);
    return arr.map((d,i) => {
      const v = key === "total" ? (d.paid + d.trial) : d.paid;
      return `${i===0?"M":"L"} ${pad + i*step} ${y(v)}`;
    }).join(" ");
  };

  const paidPath  = buildPath(main, "paid");
  const totalPath = buildPath(main, "total");
  const totalArea = totalPath + ` L ${W-pad} ${H-pad} L ${pad} ${H-pad} Z`;

  const tickCount = Math.min(5, main.length);
  const tickStep  = Math.max(1, Math.floor(main.length / tickCount));

  return (
    <svg viewBox={`0 0 ${W} ${H+18}`} style={{width:"100%",height:140,overflow:"visible"}}>
      <defs>
        <linearGradient id="areagrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#764ba2" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#764ba2" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={totalArea} fill="url(#areagrad)"/>
      {cmp && (
        <path d={buildPath(cmp, "total")} fill="none" stroke="#ffd200" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" opacity="0.6"/>
      )}
      <path d={totalPath} fill="none" stroke="#a8334a" strokeWidth="2" strokeLinecap="round"/>
      <path d={paidPath}  fill="none" stroke="#ffd200" strokeWidth="2.5" strokeLinecap="round"/>
      {main.map((d,i) => i % tickStep === 0 && (
        <text
          key={i}
          x={pad+i*xStep}
          y={H+12}
          fontSize="9"
          fill="rgba(255,255,255,0.4)"
          textAnchor="middle"
          fontFamily="DM Mono"
        >{d.d || (d.date && new Date(d.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}))}</text>
      ))}
    </svg>
  );
}
