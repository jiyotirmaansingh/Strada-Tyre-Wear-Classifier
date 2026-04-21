import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── SLOTS ────────────────────────────────────────────────────────────────────
const SLOTS = [
  { id: "left_profile",     label: "Left Profile",      icon: "◧", hint: "Side view, left" },
  { id: "right_profile",    label: "Right Profile",     icon: "◨", hint: "Side view, right" },
  { id: "area_of_interest", label: "Area of Interest",  icon: "◎", hint: "Focused wear zone" },
  { id: "tread_closeup",    label: "Tread Close-up",    icon: "▦", hint: "Primary analysis input" },
  { id: "cracks",           label: "Cracks / Sidewall", icon: "⌁", hint: "Optional sidewall scan" },
];

const URGENCY = {
  low:    { label: "LOW RISK",  glow: "#10b981", dot: "#10b981", text: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)" },
  medium: { label: "MODERATE",  glow: "#f59e0b", dot: "#f59e0b", text: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)" },
  high:   { label: "CRITICAL",  glow: "#ef4444", dot: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)" },
};

const SVG_C = { green: "#10b981", yellow: "#f59e0b", orange: "#f97316", red: "#ef4444", gray: "#52525b" };

const G = {
  panel: {
    background: "rgba(12,12,12,0.75)",
    backdropFilter: "blur(28px) saturate(160%)",
    WebkitBackdropFilter: "blur(28px) saturate(160%)",
    border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.5)"
  },
  card: {
    background: "rgba(16,16,16,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
  },
  ghost: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)"
  },
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#080808;color:#fff;font-family:'JetBrains Mono',monospace;overflow-x:hidden;-webkit-font-smoothing:antialiased;cursor:none}
@media(max-width:768px){body{cursor:auto}}
::selection{background:rgba(249,115,22,0.3);color:#fff}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(249,115,22,0.35);border-radius:2px}

.safe-bottom{padding-bottom:env(safe-area-inset-bottom)}
.safe-top{padding-top:env(safe-area-inset-top)}

#strada-cursor{position:fixed;top:0;left:0;pointer-events:none;z-index:9999;width:12px;height:12px;border-radius:50%;background:#f97316;mix-blend-mode:difference;transform:translate(-50%,-50%);will-change:transform;transition:width .2s,height .2s}
#strada-cursor-ring{position:fixed;top:0;left:0;pointer-events:none;z-index:9998;width:36px;height:36px;border-radius:50%;border:1px solid rgba(249,115,22,0.45);transform:translate(-50%,-50%);will-change:transform;transition:width .3s,height .3s,border-color .2s}
@media(max-width:768px){#strada-cursor,#strada-cursor-ring{display:none}}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.9)}}
@keyframes radarPing{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes orbFloat1{0%,100%{transform:translate(-50%,-50%) scale(1)}33%{transform:translate(-42%,-58%) scale(1.15)}66%{transform:translate(-58%,-42%) scale(.9)}}
@keyframes orbFloat2{0%,100%{transform:translate(-50%,-50%) scale(1.1)}50%{transform:translate(-55%,-45%) scale(.85)}}
@keyframes orbFloat3{0%,100%{transform:translate(-50%,-50%) scale(.9)}50%{transform:translate(-45%,-52%) scale(1.1)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 24px rgba(249,115,22,.3)}50%{box-shadow:0 0 60px rgba(249,115,22,.55),0 0 100px rgba(249,115,22,.15)}}
@keyframes borderFlow{0%,100%{border-color:rgba(249,115,22,.15)}50%{border-color:rgba(249,115,22,.5)}}
@keyframes cardReveal{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes statusPop{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes dataStream{0%{opacity:0;transform:translateY(-4px)}50%{opacity:1}100%{opacity:0;transform:translateY(4px)}}
@keyframes tyreFloat{0%,100%{transform:translateY(0px)}50%{transform:translateY(-12px)}}

.strada-reveal{opacity:0;transform:translateY(30px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.strada-reveal.visible{opacity:1;transform:translateY(0)}
.shimmer-text{background:linear-gradient(90deg,#f97316 0%,#fb923c 20%,#fff 50%,#fb923c 80%,#f97316 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
.lift-card{transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s,border-color .3s}
.lift-card:hover{transform:translateY(-5px) scale(1.008);box-shadow:0 28px 64px rgba(0,0,0,.65),0 0 0 1px rgba(249,115,22,.18)!important}
@media(hover:none){.lift-card:hover{transform:none;box-shadow:none!important}}
.mag-btn{position:relative;overflow:hidden;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s}
.mag-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent);opacity:0;transition:opacity .3s}
.mag-btn:hover::before{opacity:1}
.mag-btn:active{transform:scale(.97)}
.mag-btn{-webkit-tap-highlight-color:rgba(249,115,22,0.2)}
.card-anim{animation:cardReveal .55s cubic-bezier(.16,1,.3,1) both}
.status-anim{animation:statusPop .35s cubic-bezier(.16,1,.3,1) both}
.gradcam-img{mix-blend-mode:multiply;filter:saturate(1.6) contrast(1.1)}

/* ── REFINED MOBILE BREAKPOINTS (The Fix is Here) ── */
@media(max-width:768px){
  button,a,[role=button]{min-height:44px;min-width:44px}
  .hero-title{font-size: clamp(48px, 14vw, 92px) !important; letter-spacing: -0.05em !important;}
  .hero-section{padding:80px 16px 48px!important}
  .hero-buttons{flex-direction:column!important;align-items:stretch!important; gap: 10px !important;}
  .hero-buttons button,.hero-buttons a{width:100%!important;justify-content:center!important}
  .hero-stats{gap:0!important;margin-top:40px!important}
  .hero-stats>div{padding:0 clamp(10px, 3vw, 20px)!important}
  .hero-radar{width:min(280px,80vw)!important;height:min(280px,80vw)!important;margin-top:48px!important}
}

@media(max-width:480px){
  .hero-title{font-size: clamp(40px, 13.5vw, 78px) !important;}
  .hero-badge{padding:6px 12px!important;font-size:8px!important}
  .hero-desc{font-size:12px!important; padding: 0 10px !important;}
}
  @media(max-width:640px) {
  .hero-radar svg { animation: none !important; }
}

.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}
@media(max-width:640px){.grid3{grid-template-columns:1fr!important}}

.pipeline-steps{display:flex;gap:0;position:relative}
@media(max-width:600px){
  .pipeline-steps{flex-direction:column!important;align-items:stretch!important;gap:12px!important}
  .step-line{display:none!important}
  .pipeline-step{flex-direction:row!important;gap:16px!important;align-items:center!important;text-align:left!important;padding:0!important}
  .pipeline-step-text{text-align:left!important}
}

.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
@media(max-width:480px){.grid2{grid-template-columns:1fr!important;gap:12px!important}}

@media(max-width:540px){.slot-grid{grid-template-columns:1fr 1fr!important}}
@media(max-width:360px){.slot-grid{grid-template-columns:1fr!important}}

@media(max-width:480px){
  .report-header{flex-direction:column!important;gap:12px!important}
  .report-header-title{font-size:36px!important}
  .report-actions{width:100%!important;justify-content:stretch!important}
  .report-actions button{flex:1!important}
}

@media print {
  #strada-cursor,#strada-cursor-ring,.no-print{display:none!important}
  body{background:#fff!important;color:#111!important;overflow:visible!important}
}
`;

// ─── CURSOR ───────────────────────────────────────────────────────────────────
function Cursor() {
  const c = useRef(null);
  const r = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef(null);

  useEffect(() => {
    const el = c.current, rl = r.current;
    if (!el || !rl) return;
    const tick = () => {
      const { x, y } = pos.current;
      el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;
      rl.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;
      raf.current = null;
    };
    const move = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };
    const over = (e) => {
      if (e.target.closest("button,a,[role=button],.mag-btn")) {
        el.style.width = "20px"; el.style.height = "20px";
        rl.style.width = "56px"; rl.style.height = "56px";
        rl.style.borderColor = "rgba(249,115,22,0.8)";
      }
    };
    const out = () => {
      el.style.width = "12px"; el.style.height = "12px";
      rl.style.width = "36px"; rl.style.height = "36px";
      rl.style.borderColor = "rgba(249,115,22,0.45)";
    };
    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    document.addEventListener("mouseout", out, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div id="strada-cursor" ref={c} style={{ left: 0, top: 0 }} />
      <div id="strada-cursor-ring" ref={r} style={{ left: 0, top: 0 }} />
    </>
  );
}

function Noise() {
  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none", opacity: 0.025,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: "256px 256px",
    }} />
  );
}

function Orbs({ page }) {
  const orbs = page === "landing"
    ? [
        { x: "15%", y: "22%", s: 640, c: "rgba(249,115,22,0.09)", b: 150, a: "orbFloat1 20s ease-in-out infinite" },
        { x: "82%", y: "14%", s: 520, c: "rgba(234,88,12,0.07)",  b: 130, a: "orbFloat2 24s ease-in-out infinite" },
        { x: "58%", y: "78%", s: 420, c: "rgba(251,146,60,0.05)", b: 110, a: "orbFloat3 17s ease-in-out infinite" },
        { x: "92%", y: "65%", s: 300, c: "rgba(249,115,22,0.04)", b: 90,  a: "orbFloat1 28s ease-in-out infinite reverse" },
      ]
    : [
        { x: "85%", y: "8%",  s: 420, c: "rgba(249,115,22,0.06)", b: 110, a: "orbFloat2 22s ease-in-out infinite" },
        { x: "5%",  y: "55%", s: 360, c: "rgba(234,88,12,0.05)",  b: 90,  a: "orbFloat3 19s ease-in-out infinite" },
      ];
  return (
    <div className="no-print" style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: "absolute", left: o.x, top: o.y, width: o.s * 2, height: o.s * 2,
          transform: "translate(-50%,-50%)",
          background: `radial-gradient(circle, ${o.c} 0%, transparent 65%)`,
          filter: `blur(${o.b}px)`,
          animation: o.a,
          willChange: "transform",
        }} />
      ))}
      <div style={{ position: "absolute", top: "-20%", left: "65%", width: "1px", height: "140%", background: "linear-gradient(180deg,transparent,rgba(249,115,22,0.07) 40%,rgba(249,115,22,0.13) 50%,rgba(249,115,22,0.07) 60%,transparent)", transform: "rotate(-22deg)", transformOrigin: "top center" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.011) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%,transparent 35%,rgba(0,0,0,0.55) 100%)" }} />
    </div>
  );
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll(".strada-reveal:not(.visible)");
    if (!items.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── AI DIAGNOSTIC HERO ───────────────────────────────────────────────────────
function DiagnosticHero() {
  const [scanAngle, setScanAngle] = useState(0);
  const [pings, setPings] = useState([]);
  const [dataLines, setDataLines] = useState([]);
  const rafRef = useRef(null);
  const angleRef = useRef(0);
  const pingIdRef = useRef(0);

  // Reduce motion on mobile for performance
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  useEffect(() => {
    let lastPingAt = 0;
    const tick = (t) => {
      angleRef.current = (angleRef.current + (isMobile ? 1.2 : 0.8)) % 360;
      setScanAngle(angleRef.current);
      if (t - lastPingAt > (isMobile ? 1200 : 900)) {
        const pingAngle = angleRef.current * Math.PI / 180;
        const r = 60 + Math.random() * 55;
        const x = 150 + r * Math.cos(pingAngle);
        const y = 150 + r * Math.sin(pingAngle);
        const id = pingIdRef.current++;
        setPings(p => [...p.slice(-4), { id, x, y }]);
        lastPingAt = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const interval = setInterval(() => {
      setDataLines(Array.from({ length: 4 }, (_, i) => ({
        key: Math.random(),
        value: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, "0").toUpperCase()}`,
        label: ["TREAD", "WEAR", "DEPTH", "AGE"][i],
        delay: i * 0.12,
      })));
    }, 1200);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(interval);
    };
  }, [isMobile]);

  const rad = scanAngle * Math.PI / 180;
  const sweepX = 150 + 120 * Math.cos(rad);
  const sweepY = 150 + 120 * Math.sin(rad);
  const rings = [40, 70, 100, 125];

  return (
    <div className="hero-radar" style={{
      position: "relative",
      width: "min(340px,82vw)",
      height: "min(340px,82vw)",
      margin: "0 auto",
      animation: "tyreFloat 4s ease-in-out infinite",
    }}>
      <div style={{
        position: "absolute", inset: "-20%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)",
        filter: "blur(24px)",
        animation: "glowPulse 3s ease-in-out infinite",
      }} />
      <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(20,20,20,0.95)" />
            <stop offset="100%" stopColor="rgba(8,8,8,0.98)" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="strongGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="radarClip"><circle cx="150" cy="150" r="128" /></clipPath>
        </defs>
        <circle cx="150" cy="150" r="130" fill="url(#radarBg)" stroke="rgba(249,115,22,0.2)" strokeWidth="1.5" />
        {rings.map((r, i) => (
          <circle key={i} cx="150" cy="150" r={r} fill="none" stroke={`rgba(249,115,22,${0.06 + i * 0.025})`} strokeWidth="0.8" strokeDasharray={i === rings.length - 1 ? "none" : "4 4"} />
        ))}
        {[0, 45, 90, 135].map(a => {
          const aRad = a * Math.PI / 180;
          return <line key={a} x1={150 + 8 * Math.cos(aRad)} y1={150 + 8 * Math.sin(aRad)} x2={150 + 125 * Math.cos(aRad)} y2={150 + 125 * Math.sin(aRad)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />;
        })}
        <g clipPath="url(#radarClip)">
          <path d={`M 150 150 L ${150 + 125 * Math.cos(rad - 0.52)} ${150 + 125 * Math.sin(rad - 0.52)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill="rgba(249,115,22,0.07)" />
          <path d={`M 150 150 L ${150 + 125 * Math.cos(rad - 0.22)} ${150 + 125 * Math.sin(rad - 0.22)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill="rgba(249,115,22,0.12)" />
        </g>
        <line x1="150" y1="150" x2={sweepX} y2={sweepY} stroke="rgba(249,115,22,0.85)" strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" />
        {pings.map(ping => (
          <g key={ping.id}>
            <circle cx={ping.x} cy={ping.y} r="3.5" fill="#f97316" opacity="0.9" filter="url(#strongGlow)" />
            <circle cx={ping.x} cy={ping.y} r="7" fill="none" stroke="rgba(249,115,22,0.4)" strokeWidth="1" style={{ animation: "radarPing 1.2s ease-out forwards" }} />
          </g>
        ))}
        <g transform="translate(150,150)">
          <ellipse cx="0" cy="0" rx="28" ry="28" fill="none" stroke="rgba(249,115,22,0.5)" strokeWidth="6" />
          <ellipse cx="0" cy="0" rx="16" ry="16" fill="rgba(14,14,14,0.9)" stroke="rgba(249,115,22,0.35)" strokeWidth="2" />
          <circle cx="0" cy="0" r="4" fill="#f97316" opacity="0.9" />
          {[0, 60, 120, 180, 240, 300].map(a => {
            const aR = a * Math.PI / 180;
            return <line key={a} x1={5 * Math.cos(aR)} y1={5 * Math.sin(aR)} x2={14 * Math.cos(aR)} y2={14 * Math.sin(aR)} stroke="rgba(249,115,22,0.6)" strokeWidth="1.5" strokeLinecap="round" />;
          })}
        </g>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={150 + 127 * Math.cos(a)} y1={150 + 127 * Math.sin(a)} x2={150 + 131 * Math.cos(a)} y2={150 + 131 * Math.sin(a)} stroke="rgba(249,115,22,0.4)" strokeWidth="1.5" />;
        })}
        <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(249,115,22,0.25)" strokeWidth="1" />
      </svg>
      <div style={{ position: "absolute", top: "4%", right: "-2%", display: "flex", flexDirection: "column", gap: 5, fontFamily: "'JetBrains Mono', monospace" }}>
        {dataLines.map(line => (
          <div key={line.key} style={{ display: "flex", alignItems: "center", gap: 6, animation: `dataStream .6s ease ${line.delay}s both` }}>
            <span style={{ fontSize: 8, color: "rgba(249,115,22,0.45)", letterSpacing: "0.12em" }}>{line.label}</span>
            <span style={{ fontSize: 9, color: "rgba(249,115,22,0.7)" }}>{line.value}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: "4%", left: "2%", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(249,115,22,0.5)", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f97316", animation: "pulse 1.2s ease-in-out infinite" }} />
        SCANNING
      </div>
    </div>
  );
}

// ─── SHOP LOCATOR ─────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [2, 5, 10, 20];

function ShopLocator() {
  const [status,   setStatus]   = useState("idle");
  const [shops,    setShops]    = useState([]);
  const [radius,   setRadius]   = useState(5);
  const [coords,   setCoords]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [errMsg,   setErrMsg]   = useState("");
  const mapContainerRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const leafletReady = useRef(false);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link"); link.id = "leaflet-css"; link.rel = "stylesheet"; link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (window.L) { leafletReady.current = true; return; }
    if (document.getElementById("leaflet-js")) return;
    const script = document.createElement("script"); script.id = "leaflet-js"; script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; script.onload = () => { leafletReady.current = true; }; document.head.appendChild(script);
  }, []);

  const fetchShops = useCallback(async (lat, lng, rad) => {
    setStatus("loading"); setShops([]); setSelected(null);
    const r = rad * 1000;
    const query = `[out:json][timeout:25];(node["shop"="tyres"](around:${r},${lat},${lng});node["shop"="car_repair"](around:${r},${lat},${lng});node["amenity"="car_repair"]["service:tyres"="yes"](around:${r},${lat},${lng});way["shop"="tyres"](around:${r},${lat},${lng});way["shop"="car_repair"](around:${r},${lat},${lng}););out center 20;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(query) });
      const data = await res.json();
      const results = (data.elements || []).map(el => ({
        id: el.id, name: el.tags?.name || "Tyre / Auto Shop",
        lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon,
        phone: el.tags?.phone || null, hours: el.tags?.opening_hours || null,
        addr: [el.tags?.["addr:street"], el.tags?.["addr:city"]].filter(Boolean).join(", ") || null,
        website: el.tags?.website || null,
        dist: haversine(lat, lng, el.lat ?? el.center?.lat, el.lon ?? el.center?.lon),
      })).filter(s => s.lat && s.lng).sort((a, b) => a.dist - b.dist).slice(0, 15);
      setShops(results); setStatus("done");
    } catch {
      setErrMsg("Could not reach Overpass API. Check your internet connection."); setStatus("error");
    }
  }, []);

  const locate = useCallback(() => {
    setStatus("locating");
    if (!navigator.geolocation) { setErrMsg("Geolocation not supported."); setStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude: lat, longitude: lng } = pos.coords; setCoords({ lat, lng }); fetchShops(lat, lng, radius); },
      (err) => { if (err.code === 1) setStatus("denied"); else { setErrMsg("Could not get your location."); setStatus("error"); } },
      { timeout: 10000 }
    );
  }, [radius, fetchShops]);

  useEffect(() => { if (coords) fetchShops(coords.lat, coords.lng, radius); }, [radius]); // eslint-disable-line

  useEffect(() => {
    if (status !== "done" || !coords) return;
    const tryInit = () => {
      const container = mapContainerRef.current;
      if (!container || !window.L) return;
      if (leafletMap.current) { leafletMap.current.setView([coords.lat, coords.lng], 13); if (markersLayer.current) markersLayer.current.clearLayers(); addMarkers(leafletMap.current, markersLayer.current); leafletMap.current.invalidateSize(); return; }
      if (container._leaflet_id) { container._leaflet_id = null; }
      const map = window.L.map(container, { zoomControl: true, attributionControl: true }).setView([coords.lat, coords.lng], 13);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      const layer = window.L.layerGroup().addTo(map);
      leafletMap.current = map; markersLayer.current = layer;
      addMarkers(map, layer);
      setTimeout(() => { map.invalidateSize(); }, 200);
    };
    const addMarkers = (map, layer) => {
      if (!window.L || !layer) return;
      const userIcon = window.L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 0 12px rgba(249,115,22,0.7)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
      window.L.marker([coords.lat, coords.lng], { icon: userIcon }).addTo(layer).bindPopup("📍 You are here");
      shops.forEach(shop => {
        const shopIcon = window.L.divIcon({ className: "", html: `<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #f97316;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>`, iconSize: [10, 10], iconAnchor: [5, 5] });
        window.L.marker([shop.lat, shop.lng], { icon: shopIcon }).addTo(layer).bindPopup(`<b style="font-size:12px">${shop.name}</b>`);
      });
    };
    const timer = setTimeout(tryInit, 100);
    return () => clearTimeout(timer);
  }, [status, shops, coords]);

  useEffect(() => { return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; markersLayer.current = null; } }; }, []);

  if (status === "idle") {
    return (
      <div style={{ marginTop: 32, ...G.card, borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📍</div>
        <div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "white", margin: "0 0 6px" }}>Find Nearby Tyre Shops</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>Based on your diagnosis, we recommend visiting a professional. Share your location to find the nearest tyre shops.</p>
        </div>
        <button onClick={locate} className="mag-btn" style={{ background: "linear-gradient(135deg,#f97316,#c2410c)", border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", padding: "13px 28px", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 28px rgba(249,115,22,0.25)", width: "100%" }}>◎ USE MY LOCATION</button>
      </div>
    );
  }
  if (status === "locating") return <LocatorStatus icon="◎" msg="Getting your location…" sub="Please allow location access." spin />;
  if (status === "loading") return <LocatorStatus icon="⌁" msg="Searching for tyre shops…" sub={`Looking within ${radius} km radius.`} spin />;
  if (status === "denied") return <LocatorStatus icon="✕" msg="Location access denied" sub="Enable location permissions and try again." err />;
  if (status === "error") return <LocatorStatus icon="✕" msg="Something went wrong" sub={errMsg} err />;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "white", margin: 0 }}>{shops.length > 0 ? `${shops.length} shops found` : "No shops found"}</p>
        <div className="radius-btns" style={{ display: "flex", gap: 6 }}>
          {RADIUS_OPTIONS.map(km => (
            <button key={km} onClick={() => setRadius(km)} className="radius-btn" style={{ padding: "6px 12px", borderRadius: 20, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer", transition: "all .2s", background: radius === km ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.03)", border: radius === km ? "1px solid rgba(249,115,22,0.5)" : "1px solid rgba(255,255,255,0.08)", color: radius === km ? "#f97316" : "rgba(255,255,255,0.38)" }}>{km} km</button>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: 240, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 14, background: "#111", position: "relative", zIndex: 1 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shops.map((shop, i) => <ShopCard key={shop.id} shop={shop} index={i} selected={selected?.id === shop.id} onClick={() => setSelected(s => s?.id === shop.id ? null : shop)} />)}
      </div>
    </div>
  );
}

function ShopCard({ shop, index, selected, onClick }) {
  return (
    <div className="shop-card" onClick={onClick} style={{ animationDelay: `${index * 0.05}s`, ...G.card, borderRadius: 12, padding: "14px 16px", cursor: "pointer", borderLeft: selected ? "2px solid rgba(249,115,22,0.6)" : "2px solid rgba(255,255,255,0.04)", transition: "all .25s", background: selected ? "rgba(249,115,22,0.04)" : "rgba(16,16,16,0.92)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: "white", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shop.name}</p>
          {shop.addr && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{shop.addr}</p>}
        </div>
        <span style={{ fontSize: 11, color: "#f97316", fontFamily: "'Syne',sans-serif", fontWeight: 700, flexShrink: 0 }}>{shop.dist.toFixed(1)} km</span>
      </div>
      {selected && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {shop.phone && <a href={`tel:${shop.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 11, textDecoration: "none" }}>📞 {shop.phone}</a>}
          {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 6, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316", fontSize: 11, textDecoration: "none" }}>↗ Website</a>}
          <a href={`https://www.openstreetmap.org/directions?from=${shop.lat},${shop.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", fontSize: 11, textDecoration: "none" }}>🗺 Directions</a>
        </div>
      )}
    </div>
  );
}

function LocatorStatus({ icon, msg, sub, spin, err }) {
  return (
    <div style={{ marginTop: 24, ...G.card, borderRadius: 14, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        {spin ? (
          <><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(249,115,22,0.15)" }} /><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid #f97316", borderTopColor: "transparent", animation: "spin .88s linear infinite" }} /></>
        ) : (
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: err ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.08)", border: `1px solid ${err ? "rgba(239,68,68,0.25)" : "rgba(249,115,22,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
        )}
      </div>
      <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: err ? "#ef4444" : "white", margin: 0 }}>{msg}</p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.65 }}>{sub}</p>
    </div>
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close menu when navigating
  const go = (p) => { setPage(p); setMenuOpen(false); };

  return (
    <>
      <nav className="no-print safe-top" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
        padding: "0 clamp(16px,4vw,40px)", height: 60,
        transition: "all 0.5s cubic-bezier(.16,1,.3,1)",
        ...(scrolled ? { ...G.panel, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" } : { background: "transparent", border: "none" }),
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          {/* Logo */}
          <button onClick={() => go("landing")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#f97316,#c2410c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(249,115,22,0.4)", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" />
                <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, letterSpacing: "0.12em", fontSize: 18, color: "white" }}>STRADA</span>
          </button>

          {/* Desktop nav links */}
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[["diagnose", "DIAGNOSE"], ["about", "HOW IT WORKS"]].map(([p, l]) => (
              <button key={p} onClick={() => go(p)} style={{
                background: page === p ? "rgba(249,115,22,0.12)" : "transparent",
                border: page === p ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
                color: page === p ? "#f97316" : "rgba(255,255,255,0.42)",
                fontSize: 10, letterSpacing: "0.12em", padding: "7px 14px", borderRadius: 8, cursor: "pointer", transition: "all .25s",
              }}>
                <span className="nav-link-label">{l}</span>
                {/* Mobile icon fallback */}
                <span style={{ display: "none" }} className="nav-icon">{p === "diagnose" ? "▶" : "?"}</span>
              </button>
            ))}
            <button onClick={() => go("diagnose")} className="mag-btn nav-cta" style={{ marginLeft: 8, background: "linear-gradient(135deg,#f97316,#c2410c)", border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", padding: "8px 18px", borderRadius: 8, cursor: "pointer", boxShadow: "0 0 22px rgba(249,115,22,0.28)" }}>ANALYSE →</button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="no-print safe-bottom" style={{
        display: "none",
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 500,
        ...G.panel,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "none", borderLeft: "none", borderRight: "none",
        padding: "8px 0",
        // show only on mobile via CSS
        gridTemplateColumns: "1fr 1fr 1fr",
        // We'll show this via a style override below
      }} id="mobile-tab-bar">
      </div>
    </>
  );
}

// ─── MOBILE-AWARE NAV (replaces Nav with bottom tabs on mobile) ───────────────
function ResponsiveNav({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const go = useCallback((p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }, [setPage]);

  const tabs = [
    { id: "landing", icon: "◉", label: "HOME" },
    { id: "diagnose", icon: "▶", label: "DIAGNOSE" },
    { id: "about", icon: "◈", label: "ABOUT" },
  ];

  return (
    <>
      {/* Top nav — always shown */}
      <nav className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
        padding: isMobile ? "0 16px" : "0 clamp(16px,4vw,40px)", height: 56,
        transition: "all 0.5s cubic-bezier(.16,1,.3,1)",
        ...(scrolled ? { ...G.panel, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" } : { background: "transparent", border: "none" }),
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          <button onClick={() => go("landing")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#f97316,#c2410c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(249,115,22,0.4)", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" />
                <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, letterSpacing: "0.1em", fontSize: isMobile ? 16 : 18, color: "white" }}>STRADA</span>
          </button>

          {/* Desktop-only right links */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[["diagnose", "DIAGNOSE"], ["about", "HOW IT WORKS"]].map(([p, l]) => (
                <button key={p} onClick={() => go(p)} style={{
                  background: page === p ? "rgba(249,115,22,0.12)" : "transparent",
                  border: page === p ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
                  color: page === p ? "#f97316" : "rgba(255,255,255,0.42)",
                  fontSize: 10, letterSpacing: "0.12em", padding: "7px 14px", borderRadius: 8, cursor: "pointer", transition: "all .25s",
                }}>{l}</button>
              ))}
              <button onClick={() => go("diagnose")} className="mag-btn" style={{ marginLeft: 8, background: "linear-gradient(135deg,#f97316,#c2410c)", border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", padding: "8px 18px", borderRadius: 8, cursor: "pointer", boxShadow: "0 0 22px rgba(249,115,22,0.28)" }}>ANALYSE →</button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div className="no-print" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 500,
          ...G.panel,
          borderRadius: "16px 16px 0 0",
          borderBottom: "none", borderLeft: "none", borderRight: "none",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => go(tab.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 0 6px",
              gap: 4,
              color: page === tab.id ? "#f97316" : "rgba(255,255,255,0.3)",
              transition: "color .2s",
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 8, letterSpacing: "0.1em", fontWeight: page === tab.id ? 700 : 400 }}>{tab.label}</span>
              {page === tab.id && (
                <div style={{ position: "absolute", top: 0, width: 32, height: 2, borderRadius: "0 0 2px 2px", background: "#f97316", boxShadow: "0 0 8px #f97316" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ setPage }) {
  useReveal();

  const features = useMemo(() => [
    { icon: "◎", n: "01", title: "Wear Classification",    desc: "EfficientNet-B3 classifies wear across 5 levels — New to Bald — with sub-millimetre pattern sensitivity." },
    { icon: "▦", n: "02", title: "Tread Depth Estimation",  desc: "Computer vision estimates remaining depth in mm and predicts remaining kilometres before legal minimum." },
    { icon: "⌁", n: "03", title: "Sidewall Detection",      desc: "YOLOv8 detects bulges, cuts, and dry rot — sidewall damage invisible to the untrained eye." },
    { icon: "◈", n: "04", title: "Grad-CAM Heatmaps",       desc: "Gradient attention maps reveal exactly which tread zones drove the AI verdict. Full explainability." },
    { icon: "◐", n: "05", title: "Pattern Diagnosis",       desc: "Identifies cupping, feathering, one-sided wear — each linked to specific mechanical root causes." },
    { icon: "◑", n: "06", title: "Health Score",            desc: "All module outputs synthesised into one composite A–F grade with urgency level and recommendation." },
  ], []);

  return (
    <div>
      <section className="hero-section" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(80px,14vh,120px) clamp(16px,5vw,40px) clamp(40px,6vh,60px)", position: "relative" }}>
        <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, animation: "fadeIn 0.8s ease forwards", opacity: 0, animationDelay: "0.05s", ...G.panel, borderRadius: 100, padding: "8px 16px", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 12px #f97316", animation: "pulse 2.2s ease-in-out infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.52)", letterSpacing: "0.12em" }}>AI-POWERED TYRE INTELLIGENCE</span>
          <span style={{ background: "rgba(249,115,22,0.14)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316", fontSize: 9, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 4 }}>BETA</span>
        </div>

        <div style={{ animation: "fadeUp 1s cubic-bezier(.16,1,.3,1) .18s both" }}>
          <h1 className="hero-title shimmer-text" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(72px,14vw,168px)", lineHeight: 0.87, letterSpacing: "-0.03em", margin: "0 0 24px" }}>STRADA</h1>
        </div>

        <p className="hero-desc" style={{ fontSize: "clamp(12px,1.5vw,16px)", color: "rgba(255,255,255,0.38)", maxWidth: 480, margin: "0 auto 44px", lineHeight: 1.8, animation: "fadeUp 1s cubic-bezier(.16,1,.3,1) .3s both", padding: "0 8px" }}>
          Upload five tyre photos. Get a full AI diagnostic report in seconds — wear level, tread depth, pattern analysis, and explainable heatmaps.
        </p>

        <div className="hero-buttons" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 1s cubic-bezier(.16,1,.3,1) .42s both", width: "100%", maxWidth: 400 }}>
          <button onClick={() => setPage("diagnose")} className="mag-btn" style={{ background: "linear-gradient(135deg,#f97316,#c2410c)", border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,15px)", letterSpacing: "0.06em", padding: "16px 36px", borderRadius: 13, cursor: "pointer", boxShadow: "0 0 50px rgba(249,115,22,0.4),0 4px 24px rgba(0,0,0,0.5)", animation: "glowPulse 3.5s ease-in-out infinite", flex: 1 }}>
            ▶  RUN DIAGNOSTIC
          </button>
          <button onClick={() => setPage("about")} className="mag-btn" style={{ ...G.panel, borderRadius: 13, color: "rgba(255,255,255,0.65)", fontSize: "clamp(11px,2.5vw,13px)", letterSpacing: "0.06em", padding: "16px 28px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>
            HOW IT WORKS
          </button>
        </div>

        <div className="hero-stats" style={{ display: "flex", gap: 0, justifyContent: "center", marginTop: 52, animation: "fadeUp 1s cubic-bezier(.16,1,.3,1) .55s both" }}>
          {[["5", "images", "inputs"], ["4", "models", "in parallel"], ["<2s", "", "inference"]].map((st, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 clamp(16px,4vw,36px)", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,3vw,30px)", color: "white", lineHeight: 1 }}>
                {st[0]}<span style={{ color: "#f97316", fontSize: "0.55em", letterSpacing: "0.08em", marginLeft: 2 }}>{st[1]}</span>
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", marginTop: 7, textTransform: "uppercase" }}>{st[2]}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 56, animation: "fadeIn 1.6s ease .75s both", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
          <DiagnosticHero />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.28 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.22em" }}>SCROLL</span>
            <div style={{ width: 1, height: 36, background: "linear-gradient(180deg,rgba(255,255,255,.45),transparent)" }} />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(48px,8vh,120px) clamp(16px,5vw,40px)" }}>
        <div className="strada-reveal" style={{ textAlign: "center", marginBottom: "clamp(36px,6vh,80px)" }}>
          <p style={{ fontSize: 10, color: "#f97316", letterSpacing: "0.22em", marginBottom: 12 }}>DIAGNOSTIC MODULES</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,5vw,54px)", color: "white", letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 12px" }}>
            Six AI Engines.<br /><span style={{ color: "rgba(255,255,255,0.25)" }}>One Verdict.</span>
          </h2>
        </div>
        <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} className="strada-reveal lift-card" style={{ ...G.card, borderRadius: 18, padding: "clamp(18px,3vw,28px)", position: "relative", overflow: "hidden", cursor: "default" }}>
              <div style={{ position: "absolute", top: -8, right: 12, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 88, color: "rgba(249,115,22,0.04)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{f.n}</div>
              <div style={{ fontSize: 20, marginBottom: 12, color: "#f97316" }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "white", letterSpacing: "-0.01em", margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.78, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="strada-reveal" style={{ maxWidth: 900, margin: "0 auto clamp(80px,12vh,130px)", padding: "0 clamp(16px,5vw,40px)" }}>
        <div style={{ ...G.panel, borderRadius: 24, padding: "clamp(24px,5vw,56px)", position: "relative", overflow: "hidden", animation: "borderFlow 4s ease-in-out infinite" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: "linear-gradient(135deg,transparent,rgba(249,115,22,0.04))", pointerEvents: "none" }} />
          <p style={{ fontSize: 10, color: "#f97316", letterSpacing: "0.22em", marginBottom: 10 }}>PIPELINE</p>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,4vw,34px)", color: "white", margin: "0 0 36px", letterSpacing: "-0.02em" }}>Upload → Analyse → Report</h3>
          <div className="pipeline-steps" style={{ display: "flex", gap: 0, position: "relative" }}>
            <div className="step-line" style={{ position: "absolute", top: 28, left: 32, right: 32, height: 1, background: "linear-gradient(90deg,rgba(249,115,22,0.4),rgba(249,115,22,0.1),transparent)" }} />
            {["Upload 5 Images", "Flask runs 4 models", "Grad-CAM + scores", "Full report ready"].map((step, i) => (
              <div key={i} className="pipeline-step" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "0 6px" }}>
                <div className="pipeline-step-circle" style={{ width: 52, height: 52, borderRadius: "50%", background: i === 0 ? "linear-gradient(135deg,#f97316,#c2410c)" : "rgba(18,18,18,0.9)", border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: i === 0 ? "0 0 24px rgba(249,115,22,0.35)" : "none", position: "relative", zIndex: 1 }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: i === 0 ? "white" : "rgba(249,115,22,0.55)" }}>0{i + 1}</span>
                </div>
                <span className="pipeline-step-text" style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.55, letterSpacing: "0.02em" }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 44, textAlign: "center" }}>
            <button onClick={() => setPage("diagnose")} className="mag-btn" style={{ background: "linear-gradient(135deg,#f97316,#c2410c)", border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,14px)", letterSpacing: "0.06em", padding: "15px 36px", borderRadius: 11, cursor: "pointer", boxShadow: "0 0 32px rgba(249,115,22,0.28)", width: "100%", maxWidth: 280 }}>
              START DIAGNOSTIC →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage() {
  useReveal();
  const steps = useMemo(() => [
    { n: "01", title: "Upload Images",         desc: "Provide up to 5 photos — left/right profiles, area of interest, tread close-up, and optional sidewall crack scan for maximum coverage." },
    { n: "02", title: "Multi-Model Inference",  desc: "EfficientNet-B3, CNN pattern classifier, YOLOv8, and EasyOCR (for DOT code) run simultaneously on your uploaded images." },
    { n: "03", title: "Grad-CAM Explained",    desc: "A backward pass generates gradient-weighted attention maps highlighting exactly which tread regions drove the wear classification verdict." },
    { n: "04", title: "Health Score Synthesis", desc: "All outputs aggregated into a composite 0–100 health score graded A–F, with urgency level (low/medium/high) and plain-English recommendation." },
    { n: "05", title: "Full Diagnostic Report", desc: "A printable report with gauges, depth bars, score breakdowns, Grad-CAM image, submitted photos, and quality warnings is instantly generated." },
  ], []);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "clamp(76px,10vh,120px) clamp(16px,5vw,40px) clamp(80px,10vh,80px)" }}>
      <div className="strada-reveal" style={{ marginBottom: 56 }}>
        <p style={{ fontSize: 10, color: "#f97316", letterSpacing: "0.22em", marginBottom: 14 }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,7vw,70px)", color: "white", letterSpacing: "-0.03em", margin: "0 0 18px", lineHeight: 0.94 }}>THE DIAGNOSTIC<br /><span style={{ color: "rgba(255,255,255,0.2)" }}>PIPELINE.</span></h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.85, maxWidth: 540 }}>Strada runs a chain of computer vision models on your tyre images, each specialising in a distinct aspect of tyre health.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 56 }}>
        {steps.map((st, i) => (
          <div key={i} className="strada-reveal lift-card about-step" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,28px) clamp(16px,3vw,32px)", display: "flex", gap: 20, alignItems: "flex-start", borderLeft: "1px solid rgba(249,115,22,0.12)" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,5vw,44px)", color: "rgba(249,115,22,0.16)", letterSpacing: "-0.04em", lineHeight: 1, flexShrink: 0, minWidth: 50, userSelect: "none" }}>{st.n}</div>
            <div style={{ paddingTop: 4 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "white", margin: "0 0 6px", letterSpacing: "-0.01em" }}>{st.title}</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.78, margin: 0 }}>{st.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="strada-reveal" style={{ ...G.panel, borderRadius: 20, padding: "clamp(20px,4vw,40px)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", marginBottom: 16, textTransform: "uppercase" }}>Tech Stack</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["EfficientNet-B3", "YOLOv8", "pytorch-grad-cam", "EasyOCR", "Flask", "React + Vite", "Tailwind v3", "OpenCV", "PyTorch"].map(t => (
            <span key={t} style={{ ...G.ghost, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="strada-reveal" style={{ borderRadius: 16, border: "1px solid rgba(249,115,22,0.18)", background: "rgba(249,115,22,0.04)", padding: "clamp(14px,3vw,24px)" }}>
        <p style={{ fontSize: 9, color: "#f97316", letterSpacing: "0.16em", marginBottom: 8, textTransform: "uppercase" }}>Disclaimer</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.8, margin: 0 }}>Strada is an AI diagnostic aid, not a replacement for professional tyre inspection. Always consult a certified technician before making safety-critical decisions.</p>
      </div>
    </div>
  );
}

// ─── UNIFIED UPLOAD CARD ──────────────────────────────────────────────────────
function UnifiedUploadCard({ files, onUpload, onRemove }) {
  const [activeSlot, setActiveSlot] = useState(null);
  const inputRefs = useRef({});
  const uploadedCount = Object.keys(files).length;

  return (
    <div style={{ ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,28px)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "white", margin: "0 0 3px" }}>Tyre Images</h3>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0 }}>Upload up to 5 angles</p>
        </div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: uploadedCount > 0 ? "#f97316" : "rgba(255,255,255,0.18)" }}>
          {uploadedCount}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono'" }}>/{SLOTS.length}</span>
        </span>
      </div>

      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${(uploadedCount / SLOTS.length) * 100}%`, background: "linear-gradient(90deg,#f97316,#fb923c)", borderRadius: 2, boxShadow: "0 0 12px rgba(249,115,22,0.5)", transition: "width .6s cubic-bezier(.16,1,.3,1)" }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.12)", marginBottom: 16 }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.65 }}>
          <span style={{ color: "rgba(249,115,22,0.7)", fontWeight: 600 }}>Tip:</span> Use flash, place a coin in the tread groove to help the AI calibrate depth.
        </p>
      </div>

      {/* 2-col grid on mobile, auto-fit on desktop */}
      <div className="slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10 }}>
        {SLOTS.map(slot => {
          const file = files[slot.id];
          const isDragging = activeSlot === slot.id;
          return (
            <SlotTile
              key={slot.id}
              slot={slot}
              file={file}
              isDragging={isDragging}
              inputRef={el => inputRefs.current[slot.id] = el}
              onDragOver={e => { e.preventDefault(); setActiveSlot(slot.id); }}
              onDragLeave={() => setActiveSlot(null)}
              onDrop={e => { e.preventDefault(); setActiveSlot(null); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onUpload(slot.id, f); }}
              onClick={() => !file && inputRefs.current[slot.id]?.click()}
              onRemove={() => onRemove(slot.id)}
              onFileChange={e => { if (e.target.files[0]) onUpload(slot.id, e.target.files[0]); }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SlotTile({ slot, file, isDragging, inputRef, onDragOver, onDragLeave, onDrop, onClick, onRemove, onFileChange }) {
  const [preview, setPreview] = useState(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // On mobile, tap to open file picker directly on the label area
  const handleTap = (e) => {
    if (file) return;
    e.stopPropagation();
    inputRef?.click ? inputRef.click() : onClick();
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        height: "clamp(90px,15vh,130px)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: file ? "default" : "pointer",
        transition: "all .3s cubic-bezier(.16,1,.3,1)",
        WebkitTapHighlightColor: "rgba(249,115,22,0.2)",
        ...(isDragging
          ? { background: "rgba(249,115,22,0.09)", border: "1.5px solid rgba(249,115,22,0.6)", boxShadow: "0 0 28px rgba(249,115,22,0.14)" }
          : file
            ? { background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.07)" }
            : { background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.09)" }
        ),
      }}
      onClick={onClick}
    >
      {preview ? (
        <>
          <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{
            position: "absolute", inset: 0,
            background: hovered ? "rgba(0,0,0,0.6)" : "transparent",
            transition: "background .2s",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {hovered && (
              <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: "rgba(239,68,68,0.9)", border: "none", color: "white", fontSize: 10, letterSpacing: "0.1em", padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>✕ REMOVE</button>
            )}
          </div>
          {/* Mobile remove — always visible tap target */}
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%",
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 11,
              // Hide on desktop (hover overlay handles it), show on touch
              "@media(hover:hover)": { display: "none" },
            }}
            className="remove-btn-mobile"
          >✕</button>
          <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(16,185,129,0.88)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "2px 7px", fontSize: 9, color: "white", letterSpacing: "0.08em" }}>✓</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 8px 5px", background: "linear-gradient(transparent,rgba(0,0,0,0.7))" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", margin: 0, letterSpacing: "0.08em", textAlign: "center" }}>{slot.label}</p>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 7, padding: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", background: isDragging ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", transition: "all .25s", flexShrink: 0 }}>
            <span style={{ color: isDragging ? "#f97316" : "rgba(255,255,255,0.25)", fontSize: 15, lineHeight: 1 }}>{isDragging ? "↓" : slot.icon}</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: isDragging ? "rgba(249,115,22,0.7)" : "rgba(255,255,255,0.4)", margin: "0 0 2px", letterSpacing: "0.04em" }}>{slot.label}</p>
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", margin: 0, letterSpacing: "0.03em" }}>{slot.hint}</p>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
    </div>
  );
}

// ─── DIAGNOSTIC LOADER ────────────────────────────────────────────────────────
const DIAGNOSTIC_STEPS = [
  { id: "wear",     label: "Classifying wear level",      detail: "EfficientNet-B3 running…",   duration: 950 },
  { id: "pattern",  label: "Analysing wear pattern",      detail: "CNN pattern classifier…",     duration: 850 },
  { id: "depth",    label: "Estimating tread depth",      detail: "Depth prediction model…",     duration: 1050 },
  { id: "sidewall", label: "Scanning sidewall damage",    detail: "YOLOv8 object detection…",    duration: 900 },
  { id: "gradcam",  label: "Generating Grad-CAM heatmap", detail: "Gradient attention map…",     duration: 1100 },
  { id: "score",    label: "Synthesising health score",   detail: "Aggregating all outputs…",    duration: 700 },
];

function DiagnosticLoader() {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let stepIdx = 0;
    let timeout;
    const advance = () => {
      if (stepIdx >= DIAGNOSTIC_STEPS.length) return;
      setActiveStep(stepIdx);
      timeout = setTimeout(() => {
        setCompletedSteps(prev => [...prev, DIAGNOSTIC_STEPS[stepIdx].id]);
        stepIdx++;
        if (stepIdx < DIAGNOSTIC_STEPS.length) setTimeout(advance, 80);
      }, DIAGNOSTIC_STEPS[stepIdx].duration);
    };
    advance();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{ marginTop: 24, ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,28px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(249,115,22,0.15)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid #f97316", borderTopColor: "transparent", animation: "spin .88s linear infinite" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "white", margin: "0 0 2px" }}>Running Diagnostic</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", margin: 0, letterSpacing: "0.06em" }}>{completedSteps.length}/{DIAGNOSTIC_STEPS.length} modules complete</p>
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {DIAGNOSTIC_STEPS.map((s, i) => (
            <div key={s.id} style={{ width: completedSteps.includes(s.id) ? 12 : activeStep === i ? 8 : 4, height: 4, borderRadius: 2, background: completedSteps.includes(s.id) ? "#10b981" : activeStep === i ? "#f97316" : "rgba(255,255,255,0.08)", transition: "all .3s cubic-bezier(.16,1,.3,1)" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DIAGNOSTIC_STEPS.map((step, i) => {
          const done = completedSteps.includes(step.id);
          const active = activeStep === i && !done;
          return (
            <div key={step.id} className={done || active ? "status-anim" : ""} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, background: active ? "rgba(249,115,22,0.05)" : done ? "rgba(16,185,129,0.04)" : "transparent", border: active ? "1px solid rgba(249,115,22,0.15)" : done ? "1px solid rgba(16,185,129,0.1)" : "1px solid transparent", transition: "all .3s ease", animationDelay: `${i * 0.04}s` }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)", border: done ? "1px solid rgba(16,185,129,0.3)" : active ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(255,255,255,0.06)" }}>
                {done ? <span style={{ color: "#10b981", fontSize: 10 }}>✓</span> : active ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", animation: "pulse 1s ease-in-out infinite" }} /> : <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, margin: "0 0 1px", color: done ? "rgba(255,255,255,0.55)" : active ? "white" : "rgba(255,255,255,0.25)", fontFamily: active ? "'Syne',sans-serif" : "'JetBrains Mono',monospace", fontWeight: active ? 600 : 400, transition: "all .25s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.label}</p>
                {active && <p style={{ fontSize: 9, color: "rgba(249,115,22,0.55)", margin: 0, letterSpacing: "0.06em", animation: "fadeIn .3s ease" }}>{step.detail}</p>}
              </div>
              <span style={{ fontSize: 9, letterSpacing: "0.1em", flexShrink: 0, color: done ? "#10b981" : active ? "#f97316" : "rgba(255,255,255,0.12)" }}>{done ? "DONE" : active ? "RUN" : "…"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HEALTH GAUGE / SCORE COMPONENTS ─────────────────────────────────────────
function HealthGauge({ score, grade, label, color }) {
  const c = SVG_C[color] || "#52525b";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 110, height: 110 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="8" strokeDasharray={`${(score / 100) * 263.9} 263.9`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${c})`, transition: "stroke-dasharray 1.3s cubic-bezier(.16,1,.3,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: c, lineHeight: 1 }}>{grade}</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.24)" }}>{score}/100</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: c, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function ScoreBar({ label, score, max, sublabel }) {
  const pct = (score / max) * 100;
  const c = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div className="score-label-row" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.24)" }}>{score}/{max} · {sublabel}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 2, boxShadow: `0 0 10px ${c}`, transition: "width 1.5s cubic-bezier(.16,1,.3,1)" }} />
      </div>
    </div>
  );
}

function DepthMeter({ depth_mm, status, color, remaining_km }) {
  const pct = Math.min((depth_mm / 9) * 100, 100);
  const c = SVG_C[color] || "#52525b";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,6vw,36px)", color: c, lineHeight: 1 }}>{depth_mm}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.24)" }}>mm</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: c, letterSpacing: "0.1em" }}>{status}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, boxShadow: `0 0 12px ${c}`, transition: "width 1.5s cubic-bezier(.16,1,.3,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.07em" }}>
        <span>0mm</span><span style={{ color: "rgba(249,115,22,0.55)" }}>▲ 1.6 legal</span><span>9mm</span>
      </div>
      {remaining_km != null && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>~{remaining_km.toLocaleString()} km remaining</p>}
    </div>
  );
}

// ─── EDITABLE TYRE AGE CARD ───────────────────────────────────────────────────
function EditableTyreAgeCard({ tyreAge, onChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tyreAge?.age_display || "Unknown");
  const inputRef = useRef(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = () => { setEditing(false); onChange?.(value); };

  const isHighlight = tyreAge?.status === "Replace";

  return (
    <div style={{ ...G.card, borderRadius: 12, padding: "14px 16px", borderLeft: `2px solid ${isHighlight ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.05)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.14em", margin: 0, textTransform: "uppercase" }}>TYRE AGE</p>
        <button onClick={() => { if (editing) commit(); else setEditing(true); }} style={{ background: editing ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)", border: editing ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(255,255,255,0.07)", color: editing ? "#f97316" : "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.1em", padding: "5px 10px", borderRadius: 5, cursor: "pointer", transition: "all .2s" }}>
          {editing ? "SAVE" : "EDIT"}
        </button>
      </div>
      {editing ? (
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(tyreAge?.age_display || "Unknown"); } }} style={{ width: "100%", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316", fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, padding: "6px 10px", borderRadius: 7, outline: "none", marginBottom: 4 }} />
      ) : (
        <p style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: isHighlight ? "#ef4444" : "rgba(255,255,255,0.82)", margin: "0 0 3px" }}>{value}</p>
      )}
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: 0, lineHeight: 1.55 }}>{tyreAge?.manufacture || ""}{!tyreAge?.dot_found ? " (DOT not detected)" : ""}</p>
    </div>
  );
}

function MiniCard({ label, value, sub, highlight }) {
  return (
    <div style={{ ...G.card, borderRadius: 12, padding: "14px 16px", borderLeft: `2px solid ${highlight ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.05)"}` }}>
      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.14em", margin: "0 0 5px", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: highlight ? "#ef4444" : "rgba(255,255,255,0.82)", margin: "0 0 3px" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: 0, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

function GradCamDisplay({ base64, originalBase64 }) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
      {originalBase64 && <img src={`data:image/jpeg;base64,${originalBase64}`} alt="Original tread" style={{ width: "100%", objectFit: "contain", maxHeight: 240, display: "block" }} />}
      <img src={`data:image/jpeg;base64,${base64}`} alt="Grad-CAM" className={originalBase64 ? "gradcam-img" : ""} style={{ width: "100%", objectFit: "contain", maxHeight: 240, display: "block", ...(originalBase64 ? { position: "absolute", inset: 0, height: "100%", mixBlendMode: "multiply", filter: "saturate(1.8) contrast(1.1)" } : {}) }} />
      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "rgba(249,115,22,0.8)", letterSpacing: "0.1em" }}>GRAD-CAM</div>
      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{originalBase64 ? "OVERLAY" : "HEATMAP"}</div>
    </div>
  );
}

// ─── PRINT REPORT (unchanged) ─────────────────────────────────────────────────
function PrintReport({ result }) {
  const u = URGENCY[result.urgency] || URGENCY.medium;
  const now = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const badgeClass = `print-badge print-badge-${result.urgency}`;
  const health = result.health;
  const depth = result.tread_depth;
  const depthPct = Math.min((depth.depth_mm / 9) * 100, 100);
  const depthFillClass = depthPct >= 60 ? "print-bar-fill-green" : depthPct >= 25 ? "print-bar-fill-yellow" : "print-bar-fill-red";

  return (
    <div className="print-report-root" style={{ display: "none" }}>
      <div className="print-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>S</span></div>
              <span className="print-watermark" style={{ fontSize: "28pt" }}>STRADA</span>
            </div>
            <p style={{ fontSize: "8pt", color: "#999", margin: 0, letterSpacing: "0.12em" }}>AI TYRE DIAGNOSTIC REPORT</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "8pt", color: "#666", margin: "0 0 2px" }}>Generated: {now} at {time}</p>
            <p style={{ fontSize: "8pt", color: "#999", margin: 0 }}>FOR PROFESSIONAL USE</p>
          </div>
        </div>
        <hr className="print-divider" />
        <div style={{ background: result.urgency === "high" ? "#fff5f5" : result.urgency === "medium" ? "#fffbf0" : "#f0fdf4", border: `1pt solid ${result.urgency === "high" ? "#fca5a5" : result.urgency === "medium" ? "#fcd34d" : "#6ee7b7"}`, borderRadius: 6, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <span className={badgeClass}>{u.label}</span>
          <p style={{ fontSize: "9pt", color: "#333", margin: 0, lineHeight: 1.6, flex: 1 }}><strong>{result.recommendation}</strong></p>
        </div>
        <div className="print-grid-3" style={{ marginBottom: 18 }}>
          <div className="print-cell"><p className="print-section-title">HEALTH GRADE</p><p className="print-value" style={{ fontSize: "22pt", color: health.color === "green" ? "#059669" : health.color === "yellow" ? "#d97706" : "#dc2626" }}>{health.grade}</p><p className="print-sub">{health.score} / 100 — {health.label}</p></div>
          <div className="print-cell"><p className="print-section-title">TREAD DEPTH</p><p className="print-value">{depth.depth_mm} mm</p><p className="print-sub">{depth.status}</p><div className="print-bar-track" style={{ marginTop: 8 }}><div className={depthFillClass} style={{ width: `${depthPct}%` }} /></div></div>
          <div className="print-cell"><p className="print-section-title">URGENCY</p><p className="print-value">{u.label}</p>{depth.remaining_km != null && <p className="print-sub">~{depth.remaining_km.toLocaleString()} km remaining</p>}</div>
        </div>
        <div className="print-grid-2" style={{ marginBottom: 18 }}>
          <div className="print-cell"><p className="print-section-title">WEAR LEVEL</p><p className="print-value">{result.wear_level}</p>{result.cause && <p className="print-sub">{result.cause}</p>}</div>
          <div className="print-cell"><p className="print-section-title">WEAR PATTERN</p><p className="print-value">{result.pattern}</p></div>
          <div className="print-cell"><p className="print-section-title">TYRE AGE</p><p className="print-value">{result.tyre_age?.age_display || "Unknown"}</p><p className="print-sub">{result.tyre_age?.manufacture || ""}</p></div>
          <div className="print-cell"><p className="print-section-title">SIDEWALL</p><p className="print-value" style={{ color: result.sidewall !== "None" ? "#dc2626" : "#059669" }}>{result.sidewall === "None" ? "No Damage" : result.sidewall}</p></div>
        </div>
        <div className="print-recommendation-box"><p className="print-section-title" style={{ color: "#b45309" }}>RECOMMENDATION</p><p style={{ fontSize: "10pt", color: "#333", margin: 0, lineHeight: 1.7 }}>{result.recommendation}</p></div>
        {result.warnings?.length > 0 && <div style={{ marginTop: 14, background: "#fffbf0", border: "0.5pt solid #fcd34d", borderRadius: 6, padding: "10px 14px" }}><p className="print-section-title" style={{ color: "#b45309" }}>AI QUALITY FLAGS</p>{result.warnings.map((w, i) => <p key={i} style={{ fontSize: "9pt", color: "#666", margin: i > 0 ? "4px 0 0" : 0 }}>• {w}</p>)}</div>}
        <div className="print-footer"><span>STRADA AI Tyre Intelligence</span><span>Page 1 of 2</span></div>
      </div>
      <div className="print-page">
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "18pt", color: "#111", margin: "0 0 12px", letterSpacing: "-0.02em" }}>SCORE BREAKDOWN</p>
        <hr className="print-divider" />
        <div style={{ marginBottom: 22 }}>
          {health.breakdown && Object.entries(health.breakdown).map(([key, val]) => {
            const pct2 = (val.score / val.max) * 100;
            const fc = pct2 >= 70 ? "#10b981" : pct2 >= 40 ? "#f59e0b" : "#ef4444";
            return (<div key={key} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: "9pt", color: "#444", fontWeight: 600, textTransform: "uppercase" }}>{key}</span><span style={{ fontSize: "9pt", color: "#666" }}>{val.score}/{val.max}</span></div><div className="print-bar-track"><div className="print-depth-bar-fill" style={{ width: `${pct2}%`, background: fc }} /></div></div>);
          })}
        </div>
        <div className="print-footer"><span>STRADA AI Tyre Intelligence</span><span>Page 2 of 2</span></div>
      </div>
    </div>
  );
}

// ─── REPORT PAGE ──────────────────────────────────────────────────────────────
function ReportPage({ result, previews, onClose }) {
  const u = URGENCY[result.urgency] || URGENCY.medium;
  const now = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const showLocator = result.urgency === "medium" || result.urgency === "high";
  const [tyreAge, setTyreAge] = useState(result.tyre_age);
  const treadPreview = previews.find(p => p.label === "Tread Close-up");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth <= 640); }, []);

  return (
    <div id="strada-report-overlay" style={{ position: "fixed", inset: 0, zIndex: 800, overflowY: "auto", background: "rgba(4,4,4,0.97)", backdropFilter: "blur(24px)", animation: "fadeIn .3s ease", WebkitOverflowScrolling: "touch" }}>
      <PrintReport result={{ ...result, tyre_age: tyreAge }} />
      <div className="no-print" style={{ maxWidth: 760, margin: "0 auto", padding: `clamp(20px,5vh,64px) clamp(14px,4vw,28px) ${isMobile ? "90px" : "48px"}` }}>
        {/* Header */}
        <div className="report-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="report-header-title" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,8vw,52px)", color: "white", letterSpacing: "-0.03em", margin: "0 0 4px", lineHeight: 1 }}>STRADA</h1>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>TYRE DIAGNOSTIC REPORT · {now}</p>
          </div>
          <div className="report-actions" style={{ display: "flex", gap: 8 }}>
            {[["⎙ PRINT", () => window.print()], ["✕ CLOSE", onClose]].map(([l, fn]) => (
              <button key={l} onClick={fn} style={{ ...G.panel, borderRadius: 8, color: "rgba(255,255,255,0.38)", fontSize: 11, letterSpacing: "0.1em", padding: "10px 16px", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", flex: 1 }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Urgency banner */}
        <div style={{ borderRadius: 14, border: `1px solid ${u.border}`, background: u.bg, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: u.dot, boxShadow: `0 0 14px ${u.glow}`, flexShrink: 0, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: u.text, letterSpacing: "0.1em" }}>{u.label}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", flex: 1, minWidth: 160 }}>{result.recommendation}</span>
        </div>

        {/* Gauge + depth */}
        <div className="grid2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 14 }}>
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animationDelay: "0s" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", margin: 0, alignSelf: "flex-start" }}>OVERALL HEALTH</p>
            <HealthGauge {...result.health} />
          </div>
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", animationDelay: "0.08s" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", margin: "0 0 14px" }}>TREAD DEPTH</p>
            <DepthMeter {...result.tread_depth} />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", margin: "10px 0 0", lineHeight: 1.6 }}>{result.tread_depth.message}</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.16s" }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", margin: "0 0 18px" }}>SCORE BREAKDOWN</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(result.health.breakdown).map(([k, v]) => <ScoreBar key={k} label={k} score={v.score} max={v.max} sublabel={v.label} />)}
          </div>
        </div>

        {/* Mini cards */}
        <div className="mini-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 14 }}>
          <div className="card-anim" style={{ animationDelay: "0.22s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} sub={result.cause} highlight={result.urgency === "high"} /></div>
          <div className="card-anim" style={{ animationDelay: "0.27s" }}><MiniCard label="WEAR PATTERN" value={result.pattern} sub={result.cause} /></div>
          <div className="card-anim" style={{ animationDelay: "0.32s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val => setTyreAge(prev => ({ ...prev, age_display: val }))} /></div>
          <div className="card-anim" style={{ animationDelay: "0.37s" }}><MiniCard label="SIDEWALL" value={result.sidewall} sub={result.sidewall === "None" ? "No damage detected" : "⚠ Damage detected"} highlight={result.sidewall !== "None"} /></div>
        </div>

        {/* Grad-CAM */}
        <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.42s" }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", margin: "0 0 14px" }}>GRAD-CAM ATTENTION MAP</p>
          <GradCamDisplay base64={result.gradcam_image} originalBase64={treadPreview ? btoa(treadPreview.url) : null} />
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: "10px 0 0" }}>Highlighted regions indicate areas the model focused on.</p>
        </div>

        {/* Submitted images */}
        {previews.length > 0 && (
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.48s" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", margin: "0 0 14px" }}>SUBMITTED IMAGES</p>
            <div className="submitted-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 8 }}>
              {previews.map(({ label, url }) => (
                <div key={label}>
                  <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", height: 72 }}>
                    <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.18)", display: "block", textAlign: "center", marginTop: 4, letterSpacing: "0.06em" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quality warnings */}
        {result.warnings?.length > 0 && (
          <div style={{ borderRadius: 14, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)", padding: "14px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 9, color: "#f59e0b", letterSpacing: "0.14em", margin: "0 0 8px" }}>QUALITY WARNINGS</p>
            {result.warnings.map((w, i) => <p key={i} style={{ fontSize: 11, color: "rgba(245,158,11,0.62)", margin: 0, lineHeight: 1.65 }}>{w}</p>)}
          </div>
        )}

        {showLocator && <ShopLocator />}

        <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", letterSpacing: "0.1em" }}>STRADA · TYRE INTELLIGENCE</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em" }}>NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
        </div>
      </div>
    </div>
  );
}

// ─── RESULT CARD ──────────────────────────────────────────────────────────────
function ResultCard({ result, onViewReport }) {
  const u = URGENCY[result.urgency] || URGENCY.medium;
  const [tyreAge, setTyreAge] = useState(result.tyre_age);
  return (
    <div style={{ marginTop: 28, ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,32px)", animation: "cardReveal .7s cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.18em" }}>DIAGNOSTIC RESULT</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 100, border: `1px solid ${u.border}`, background: u.bg }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.dot, boxShadow: `0 0 10px ${u.glow}`, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: u.text, letterSpacing: "0.12em" }}>{u.label}</span>
        </div>
      </div>

      <div className="grid2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "clamp(12px,3vw,24px)", marginBottom: 20 }}>
        <div className="card-anim" style={{ display: "flex", flexDirection: "column", alignItems: "center", animationDelay: "0s" }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", margin: "0 0 12px", alignSelf: "flex-start" }}>HEALTH SCORE</p>
          <HealthGauge {...result.health} />
        </div>
        <div className="card-anim" style={{ animationDelay: "0.08s" }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", margin: "0 0 12px" }}>TREAD DEPTH</p>
          <DepthMeter {...result.tread_depth} />
        </div>
      </div>

      <div className="mini-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 14 }}>
        <div className="card-anim" style={{ animationDelay: "0.14s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} highlight={result.urgency === "high"} /></div>
        <div className="card-anim" style={{ animationDelay: "0.18s" }}><MiniCard label="PATTERN" value={result.pattern} /></div>
        <div className="card-anim" style={{ animationDelay: "0.22s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val => setTyreAge(prev => ({ ...prev, age_display: val }))} /></div>
        <div className="card-anim" style={{ animationDelay: "0.26s" }}><MiniCard label="SIDEWALL" value={result.sidewall} highlight={result.sidewall !== "None"} /></div>
      </div>

      <div style={{ ...G.panel, borderRadius: 12, padding: "12px 16px", marginBottom: 14, borderLeft: "2px solid rgba(249,115,22,0.22)" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", margin: "0 0 5px" }}>RECOMMENDATION</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", margin: 0, lineHeight: 1.65 }}>{result.recommendation}</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", margin: "0 0 8px" }}>GRAD-CAM HEATMAP</p>
        <GradCamDisplay base64={result.gradcam_image} />
      </div>

      <button onClick={onViewReport} className="mag-btn" style={{ width: "100%", padding: "16px", borderRadius: 12, cursor: "pointer", border: "1px solid rgba(249,115,22,0.28)", background: "rgba(249,115,22,0.055)", color: "#f97316", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        VIEW FULL REPORT <span style={{ fontSize: 16 }}>↗</span>
      </button>
    </div>
  );
}

// ─── DIAGNOSE PAGE ────────────────────────────────────────────────────────────
function DiagnosePage({ isMobile }) {
  const [files,      setFiles]      = useState({});
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [showReport, setShowReport] = useState(false);

  const handleUpload = useCallback((id, file) => { setFiles(p => ({ ...p, [id]: file })); setResult(null); setError(null); }, []);
  const handleRemove = useCallback((id) => { setFiles(p => { const n = { ...p }; delete n[id]; return n; }); setResult(null); }, []);

  const uploadedCount = Object.keys(files).length;
  const canAnalyse = uploadedCount >= 1;

  const previews = useMemo(() => SLOTS.filter(s => files[s.id]).map(s => ({ label: s.label, url: URL.createObjectURL(files[s.id]) })), [files]);
  useEffect(() => { return () => previews.forEach(p => URL.revokeObjectURL(p.url)); }, [previews]);

  const handleAnalyse = async () => {
    setLoading(true); setError(null); setResult(null);
    const fd = new FormData();
    SLOTS.forEach(s => { if (files[s.id]) fd.append(s.id, files[s.id]); });
    try {
//      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
// const res = await fetch(`${API_BASE}/predict`, { method: "POST", body: fd });

const res = await fetch("http://localhost:5000/predict", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to reach API. Is Flask running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: `clamp(72px,10vh,106px) clamp(14px,5vw,28px) ${isMobile ? "90px" : "80px"}` }}>
      {showReport && result && <ReportPage result={result} previews={previews} onClose={() => setShowReport(false)} />}

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ height: 1, width: 24, background: "linear-gradient(90deg,#f97316,transparent)" }} />
          <p style={{ fontSize: 10, color: "#f97316", letterSpacing: "0.2em", margin: 0 }}>TYRE DIAGNOSTIC</p>
        </div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(30px,7vw,58px)", color: "white", letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1 }}>ANALYSE TYRES</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.8, margin: 0, maxWidth: 480 }}>Upload photos for AI wear analysis. At least 1 image required — 5 images gives the most accurate result.</p>
      </div>

      <UnifiedUploadCard files={files} onUpload={handleUpload} onRemove={handleRemove} />

      <button
        onClick={handleAnalyse}
        disabled={!canAnalyse || loading}
        className={canAnalyse && !loading ? "mag-btn" : ""}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, cursor: canAnalyse && !loading ? "pointer" : "not-allowed",
          fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,14px)", letterSpacing: "0.05em",
          transition: "all .4s cubic-bezier(.16,1,.3,1)",
          ...(canAnalyse && !loading
            ? { background: "linear-gradient(135deg,#f97316,#c2410c)", border: "none", color: "white", boxShadow: "0 0 50px rgba(249,115,22,0.3),0 6px 24px rgba(0,0,0,0.5)" }
            : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.18)" }),
        }}
      >
        {loading ? "ANALYSING…" : canAnalyse ? "▶  RUN DIAGNOSTIC" : "UPLOAD AT LEAST 1 IMAGE"}
      </button>

      {loading && <DiagnosticLoader />}

      {error && (
        <div style={{ marginTop: 18, ...G.card, borderRadius: 12, borderLeft: "2px solid rgba(239,68,68,0.45)", padding: "14px 18px" }}>
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
        </div>
      )}

      {result && !loading && <ResultCard result={result} onViewReport={() => setShowReport(true)} />}

      <div style={{ marginTop: 48, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", letterSpacing: "0.1em" }}>STRADA · TYRE INTELLIGENCE</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", letterSpacing: "0.08em" }}>ML-POWERED · LOCAL INFERENCE</span>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const go = useCallback((p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <Cursor />
      <Noise />
      <div style={{ minHeight: "100dvh", background: "#080808", position: "relative" }}>
        <Orbs page={page} />
        <ResponsiveNav page={page} setPage={go} />
        <div style={{ position: "relative", zIndex: 2 }}>
          {page === "landing"  && <LandingPage  setPage={go} />}
          {page === "diagnose" && <DiagnosePage isMobile={isMobile} />}
          {page === "about"    && <AboutPage />}
        </div>
        {/* Footer — hidden on mobile (bottom tabs take over) */}
        {!isMobile && (
          <footer className="no-print" style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "clamp(20px,4vh,36px) clamp(16px,5vw,40px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#f97316,#c2410c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 11, color: "white" }}>S</span>
              </div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>STRADA</span>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.14)", letterSpacing: "0.07em", textAlign: "center" }}>AI TYRE INTELLIGENCE · NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
            <div style={{ display: "flex", gap: 16 }}>
              {[["diagnose", "DIAGNOSE"], ["about", "ABOUT"]].map(([p, l]) => (
                <button key={p} onClick={() => go(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em" }}>{l}</button>
              ))}
            </div>
          </footer>
        )}
      </div>
    </>
  );
}