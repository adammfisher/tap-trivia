import { C } from "../lib/theme";

export default function Panel({children, style, delay=0, className=""}) {
  return (
    <div className={`panel ${className}`} style={{
      background: C.grad.panel,
      border: `1px solid ${C.w(0.06)}`,
      borderRadius: 16,
      padding: 24,
      backdropFilter: "blur(10px)",
      animationDelay: `${delay}s`,
      ...style,
    }}>{children}</div>
  );
}
