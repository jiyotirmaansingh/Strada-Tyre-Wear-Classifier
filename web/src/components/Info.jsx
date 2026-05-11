import { useState, useEffect, useRef, useContext, useCallback } from "react";

// ─── USE APP's THEME CONTEXT (imported from App.jsx in production) ────────────
// App.jsx exports ThemeContext — import it there instead of this local one.
// For now we read it via the same context shape App provides.
import { ThemeContext } from "../App"; // adjust path as needed
const useTheme = () => useContext(ThemeContext);

// ─── DESIGN TOKENS — mirrors App.jsx exactly ─────────────────────────────────
const DARK = {
  bg: "#080808", surface: "rgba(22,22,22,0.98)", panel: "rgba(18,18,18,0.96)",
  ghost: "rgba(255,255,255,0.025)", text: "#ffffff", textSub: "rgba(255,255,255,0.38)",
  textMuted: "rgba(255,255,255,0.2)", textFaint: "rgba(255,255,255,0.12)",
  border: "rgba(255,255,255,0.07)", borderFaint: "rgba(255,255,255,0.04)",
  accent: "#f97316", accentMid: "#fb923c", accentDark: "#c2410c",
  cardBorder: "rgba(255,255,255,0.06)",
  cardShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  panelBorder: "rgba(255,255,255,0.07)",
  panelShadow: "0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.5)",
  scanline: "rgba(249,115,22,0.035)",
  heroBg: "linear-gradient(180deg, rgba(8,8,8,0) 0%, #080808 100%)",
};
const LIGHT = {
  bg: "#faf7f4", surface: "rgba(255,252,249,0.99)", panel: "rgba(255,252,249,0.97)",
  ghost: "rgba(0,0,0,0.03)", text: "#1a1008", textSub: "rgba(26,16,8,0.52)",
  textMuted: "rgba(26,16,8,0.38)", textFaint: "rgba(26,16,8,0.2)",
  border: "rgba(0,0,0,0.07)", borderFaint: "rgba(0,0,0,0.04)",
  accent: "#ea6500", accentMid: "#f97316", accentDark: "#c2410c",
  cardBorder: "rgba(0,0,0,0.07)",
  cardShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
  panelBorder: "rgba(0,0,0,0.08)",
  panelShadow: "0 0 0 0.5px rgba(0,0,0,0.04) inset, 0 8px 40px rgba(0,0,0,0.08)",
  scanline: "rgba(234,101,0,0.025)",
  heroBg: "linear-gradient(180deg, rgba(250,247,244,0) 0%, #faf7f4 100%)",
};
function useT() { return DARK; }
function useG() {
  const T = useT();
  return {
    panel: { background: T.panel, border: `1px solid ${T.panelBorder}`, boxShadow: T.panelShadow },
    card:  { background: T.surface, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow },
    ghost: { background: T.ghost, border: `1px solid ${T.border}` },
  };
}

// ─── HAPTIC ───────────────────────────────────────────────────────────────────
function haptic(t = "light") { try { navigator.vibrate?.(t === "light" ? 8 : 18); } catch (_) {} }

// ─── TYRE IMAGE LIBRARY ───────────────────────────────────────────────────────
const IMGS = {
  heroTyre:    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80&auto=format&fit=crop",
  treadClose:  "https://images.unsplash.com/photo-1606577924006-27d39b132ae2?w=900&q=80&auto=format&fit=crop",
  sidewall:    "https://images.unsplash.com/photo-1591137682073-e1fdca3c3fd9?w=900&q=80&auto=format&fit=crop",
  wornTyre:    "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=900&q=80&auto=format&fit=crop",
  newTyre:     "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80&auto=format&fit=crop",
  winterTyre:  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=80&auto=format&fit=crop",
  allTerrain:  "https://images.unsplash.com/photo-1547245324-d777c6f05e80?w=900&q=80&auto=format&fit=crop",
  tyreShop:    "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=900&q=80&auto=format&fit=crop",
  rimClose:    "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=900&q=80&auto=format&fit=crop",
  carOnRoad:   "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&q=80&auto=format&fit=crop",
  tyreStack:   "https://images.unsplash.com/photo-1570441262582-a2d4b9a916a5?w=900&q=80&auto=format&fit=crop",
  mechanic:    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=900&q=80&auto=format&fit=crop",
  performance: "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=900&q=80&auto=format&fit=crop",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ANATOMY = [
  { id:"tread",    label:"Tread",    icon:"▦", stat:"1.6 mm", statSub:"legal min", img:IMGS.treadClose,
    desc:"The outer contact layer. Grooves channel up to 8 litres of water per second away from the contact patch to prevent aquaplaning. Sipes (micro-cuts) add extra bite on wet roads. Below 1.6 mm is illegal in most countries — safety experts recommend changing at 3 mm." },
  { id:"sidewall", label:"Sidewall", icon:"⌁", stat:"6 ply",  statSub:"typical",   img:IMGS.sidewall,
    desc:"The vertical wall between tread and rim. It flexes under load to absorb shocks and protects internal structure. A bulge, crack, or cut here signals structural failure — replace immediately regardless of tread depth." },
  { id:"bead",     label:"Bead",     icon:"◉", stat:"Steel",  statSub:"wire core", img:IMGS.rimClose,
    desc:"High-tensile steel wire bundles, rubber-coated, forming the tyre's inner edge. The bead creates an airtight seal against the rim. A broken bead causes instant deflation and complete loss of directional control." },
  { id:"dot",      label:"DOT Code", icon:"◈", stat:"6 yrs",  statSub:"max age",   img:IMGS.sidewall,
    desc:"A government-mandated code moulded into the sidewall. The last 4 digits encode manufacture date — e.g. 2224 = week 22 of 2024. Tyres older than 6 years should be replaced even with good tread — rubber degrades internally and invisibly." },
];

const TYRE_TYPES = [
  { icon:"☀", label:"Summer",      temp:"7 °C+",       color:"#f97316", badge:"Performance",   img:IMGS.treadClose,
    pro:"Maximum dry and wet grip. Low rolling resistance. Precise, responsive handling at speed.",
    con:"Rubber stiffens dangerously below 7 °C — braking distance can double in cold conditions." },
  { icon:"❄", label:"Winter",      temp:"Below 7 °C",  color:"#3b82f6", badge:"Cold-weather",  img:IMGS.winterTyre,
    pro:"Shorter braking distances on snow and ice. High-silica compound stays pliable in freezing temps.",
    con:"Wears faster in warm weather. Increased road noise and reduced fuel economy on dry roads." },
  { icon:"◑", label:"All-Season",  temp:"Year-round",  color:"#10b981", badge:"Versatile",     img:IMGS.newTyre,
    pro:"Single tyre set for all conditions. Cost-effective. Often M+S and 3PMSF rated.",
    con:"Jack of all trades — not best-in-class for any single condition. Compromised in extremes." },
  { icon:"◎", label:"Performance", temp:"7 °C+",        color:"#ef4444", badge:"Track-focused", img:IMGS.performance,
    pro:"Ultra-sharp cornering response. High-speed stability. Wide contact patch for maximum grip.",
    con:"Expensive. Wears faster than standard. Harder ride on everyday commuter roads." },
  { icon:"◐", label:"All-Terrain", temp:"Any",          color:"#84cc16", badge:"Off-road",      img:IMGS.allTerrain,
    pro:"Handles dirt, gravel, and light off-roading while retaining highway manners.",
    con:"Louder on tarmac. Reduced fuel economy. Less responsive than road-focused compounds." },
];

const WEAR_LEVELS = [
  { grade:"A", level:"New",      depth:"8–9 mm",   pct:100, color:"#10b981", bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.25)",
    desc:"Full tread depth. Fresh and road-legal everywhere. No action needed.", action:"Monitor at next service interval." },
  { grade:"B", level:"Good",     depth:"5–7 mm",   pct:75,  color:"#84cc16", bg:"rgba(132,204,22,0.08)",  border:"rgba(132,204,22,0.25)",
    desc:"Healthy and well within legal limits. Grip is strong in wet and dry conditions.", action:"Check again in 6 months or 5,000 km." },
  { grade:"C", level:"Worn",     depth:"3–4 mm",   pct:45,  color:"#f59e0b", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.25)",
    desc:"Below the halfway mark. Wet-weather braking distances are noticeably longer.", action:"Plan replacement within 3–6 months." },
  { grade:"D", level:"Critical", depth:"2–3 mm",   pct:22,  color:"#f97316", bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.25)",
    desc:"Dangerously close to the legal minimum. Aquaplaning risk is high in the rain.", action:"Replace within 2 weeks / 1,000 km." },
  { grade:"F", level:"Bald",     depth:"< 1.6 mm", pct:5,   color:"#ef4444", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.25)",
    desc:"Illegal in most countries. Zero wet grip. Blowout risk is very high at speed.", action:"DO NOT DRIVE. Replace immediately." },
];

const PATTERNS = [
  { icon:"▬", label:"Centre Wear",       cause:"Over-inflation",       urgency:"medium", color:"#f59e0b",
    desc:"Excess pressure bulges the tyre, wearing only the centre strip while edges stay fresh.",
    fix:"Reduce to manufacturer spec. Check door-jamb sticker." },
  { icon:"◫", label:"Edge Wear",         cause:"Under-inflation",      urgency:"medium", color:"#f59e0b",
    desc:"Low pressure sags both outer shoulders into the road. Fuel economy drops noticeably too.",
    fix:"Inflate to correct PSI. Investigate for slow puncture if recurring." },
  { icon:"∿", label:"Cupping / Scallop", cause:"Worn shock absorbers", urgency:"high",   color:"#ef4444",
    desc:"The wheel bounces rather than rolls, creating diagonal scalloped hollows around the tread.",
    fix:"Replace shock absorbers / struts. Rebalance wheels immediately." },
  { icon:"⩖", label:"Feathering",        cause:"Toe misalignment",     urgency:"medium", color:"#f59e0b",
    desc:"Tread blocks sharp on one side, smooth on the other — the tyre tracks diagonally to travel.",
    fix:"4-wheel alignment — specifically toe-in/toe-out correction." },
  { icon:"◧", label:"One-sided Wear",    cause:"Camber misalignment",  urgency:"high",   color:"#ef4444",
    desc:"One shoulder is significantly more worn. Positive or negative camber is grinding it down.",
    fix:"Full 4-wheel alignment. Check control arms and ball joints." },
  { icon:"◌", label:"Flat Spots",        cause:"Locked-wheel braking", urgency:"low",    color:"#10b981",
    desc:"Emergency stops without ABS, or months of parking, create flat zones felt as rhythmic thumping.",
    fix:"Mild: rounds out after 50–100 km. Severe: replace the tyre." },
];

const BUY_STEPS = [
  { n:"01", title:"Decode Your Sidewall",    img:IMGS.rimClose   },
  { n:"02", title:"Verify the DOT Age",      img:IMGS.sidewall   },
  { n:"03", title:"Match Load & Speed",      img:IMGS.tyreShop   },
  { n:"04", title:"Ask the Right Questions", img:IMGS.mechanic   },
  { n:"05", title:"Budget vs Premium",       img:IMGS.tyreStack  },
];

// ─── INLINE REVEAL HOOK ───────────────────────────────────────────────────────
function useReveal(deps = []) {
  useEffect(() => {
    const items = document.querySelectorAll(".ir:not(.vis)");
    if (!items.length) return;
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } }),
      { threshold: 0.04, rootMargin: "0px 0px -16px 0px" }
    );
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, deps); // eslint-disable-line
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ label, title, sub }) {
  const T = useT();
  return (
    <div style={{ marginBottom: "clamp(22px,4vh,52px)" }}>
      <p style={{ fontSize: 9, color: T.accent, letterSpacing: "0.24em", margin: "0 0 10px", fontFamily: "'JetBrains Mono',monospace" }}>{label}</p>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(30px,6vw,68px)", color: T.text, letterSpacing: "-0.04em", margin: "0 0 12px", lineHeight: 0.92 }}>{title}</h2>
      {sub && <p style={{ fontSize: "clamp(11px,1.5vw,13px)", color: T.textMuted, lineHeight: 1.82, margin: 0, maxWidth: 520 }}>{sub}</p>}
    </div>
  );
}

// ─── BUY CARD ─────────────────────────────────────────────────────────────────
function BuyCard({ img, title, n, children }) {
  const T = useT(), G = useG(), { theme } = useTheme();
  return (
    <div className="tab-in" style={{ ...G.card, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ position: "relative", height: "clamp(130px,20vw,200px)", overflow: "hidden" }}>
        <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: theme === "dark" ? "brightness(0.38) saturate(0.7)" : "brightness(0.55) saturate(0.8)" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 25%, ${T.surface} 100%)` }} />
        <div style={{ position: "absolute", bottom: 18, left: 22 }}>
          <span style={{ fontSize: 9, color: T.accent, letterSpacing: "0.2em", display: "block", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>STEP {n}</span>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(17px,3vw,28px)", color: T.text, margin: 0, letterSpacing: "-0.02em" }}>{title}</h3>
        </div>
        <div style={{ position: "absolute", top: 10, right: 14, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(56px,10vw,80px)", color: `${T.accent}12`, lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{n}</div>
      </div>
      <div style={{ padding: "clamp(16px,4vw,36px)" }}>{children}</div>
    </div>
  );
}

// ─── CROSS SECTION SVG ────────────────────────────────────────────────────────
function CrossSection() {
  const T = useT(), { theme } = useTheme();
  const acc = T.accent;
 const isDark = true;
  const t1 = isDark ? "#2c2c2c" : "#e2d8cc", t2 = isDark ? "#1f1f1f" : "#d4c8b8", t3 = isDark ? "#171717" : "#c4b8a8";
  const rim = isDark ? "#3a3a3a" : "#c0b0a0", hub = isDark ? "#4a4a4a" : "#a09080";
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox="0 0 600 280" style={{ width: "100%", minWidth: 260, maxHeight: 210 }} role="img" aria-label="Tyre cross-section diagram">
        <title>Tyre cross-section</title>
        <ellipse cx="300" cy="140" rx="128" ry="128" fill={t1} stroke={`${acc}44`} strokeWidth="1.5" />
        <ellipse cx="300" cy="140" rx="128" ry="128" fill="none" stroke={acc} strokeWidth="14" strokeDasharray="10 8" opacity="0.12" />
        <ellipse cx="300" cy="140" rx="113" ry="113" fill={t2} />
        <ellipse cx="300" cy="140" rx="97" ry="97" fill={t3} />
        <ellipse cx="300" cy="140" rx="82" ry="82" fill={isDark ? "#111" : "#b8a898"} stroke={`${acc}55`} strokeWidth="2" />
        <ellipse cx="300" cy="140" rx="70" ry="70" fill={rim} stroke={`${acc}66`} strokeWidth="1.5" />
        <ellipse cx="300" cy="140" rx="48" ry="48" fill={hub} />
        <ellipse cx="300" cy="140" rx="26" ry="26" fill={isDark ? "#555" : "#909090"} />
        <circle cx="300" cy="140" r="10" fill={acc} opacity="0.9" />
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map(a => { const r = a * Math.PI / 180; return <line key={a} x1={300 + 26 * Math.cos(r)} y1={140 + 26 * Math.sin(r)} x2={300 + 67 * Math.cos(r)} y2={140 + 67 * Math.sin(r)} stroke={isDark ? "#555" : "#a89888"} strokeWidth="2" />; })}
        {[-3, -1.5, 0, 1.5, 3].map(n => { const a = n * 24 * Math.PI / 180 - Math.PI / 2; return <line key={n} x1={300 + 115 * Math.cos(a)} y1={140 + 115 * Math.sin(a)} x2={300 + 129 * Math.cos(a)} y2={140 + 129 * Math.sin(a)} stroke={acc} strokeWidth="3" strokeLinecap="round" opacity="0.7" />; })}
        {[{ label: "TREAD", ax: 412, ay: 72, lx: 456, ly: 58 }, { label: "SIDEWALL", ax: 398, ay: 112, lx: 456, ly: 108 }, { label: "BEAD", ax: 374, ay: 155, lx: 456, ly: 160 }, { label: "RIM", ax: 358, ay: 195, lx: 456, ly: 200 }].map(({ label, ax, ay, lx, ly }) => (
          <g key={label}>
            <line x1={ax} y1={ay} x2={lx} y2={ly} stroke={`${acc}50`} strokeWidth="0.8" strokeDasharray="4 3" />
            <circle cx={ax} cy={ay} r="3.5" fill={acc} opacity="0.65" />
            <text x={lx + 6} y={ly + 4} fill={acc} fontSize="10" fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em" dominantBaseline="middle">{label}</text>
          </g>
        ))}
        <line x1={190} y1={72} x2={146} y2={58} stroke={`${acc}50`} strokeWidth="0.8" strokeDasharray="4 3" />
        <circle cx={190} cy={72} r="3.5" fill={acc} opacity="0.65" />
        <text x={12} y={62} fill={acc} fontSize="10" fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em">DOT CODE</text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function InfoPage({ setPage }) {
  const T = useT(), G = useG(), { theme } = useTheme();
  const [activeTab,     setActiveTab]     = useState("anatomy");
  const [expandedWear,  setExpandedWear]  = useState(null);
  const [activeBuyStep, setActiveBuyStep] = useState(0);
  const [activeType,    setActiveType]    = useState(0);
  const [isMobile,      setIsMobile]      = useState(false);
  useEffect(() => { const check = () => setIsMobile(window.innerWidth <= 640); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);
  useReveal([activeTab]);

  const TABS = [
    { id: "anatomy", label: "Anatomy",    icon: "◎" },
    { id: "types",   label: "Tyre Types", icon: "◑" },
    { id: "wear",    label: "Wear Guide", icon: "⌁" },
    { id: "buying",  label: "Buy Smart",  icon: "◈" },
  ];

 const isDark = true;

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>

      {/* ── LOCAL CSS (scoped to Info only) ──────────────────────────────── */}
      <style>{`
        .ir{opacity:0;transform:translateY(22px);transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
        .ir.vis{opacity:1;transform:none}
        .info-lift{transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s}
        @media(min-width:641px){.info-lift:hover{transform:translateY(-4px) scale(1.005)}}
        @keyframes iIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .tab-in{animation:iIn .3s cubic-bezier(.16,1,.3,1) both}
        @keyframes barW{from{width:0}to{width:var(--bw)}}
        .bar-grow{animation:barW 1.2s cubic-bezier(.16,1,.3,1) .1s both}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
        .dot-pulse-i{animation:pulseDot 2s ease-in-out infinite}
        @keyframes heroReveal{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
        .hero-in  {animation:heroReveal .85s cubic-bezier(.16,1,.3,1) both}
        .hero-in-2{animation:heroReveal .85s cubic-bezier(.16,1,.3,1) .12s both}
        .hero-in-3{animation:heroReveal .85s cubic-bezier(.16,1,.3,1) .24s both}
        .hero-in-4{animation:heroReveal .85s cubic-bezier(.16,1,.3,1) .38s both}
        @media(max-width:640px){
          .ir{transition:opacity .4s ease}
          .ir.vis{transform:none}
          .info-lift:hover{transform:none}
          .info-lift:active{transform:scale(0.975)}
          .info-tab-btn{padding:12px 10px!important;font-size:9px!important;gap:4px!important}
          .info-tab-icon{font-size:13px!important}
          .hero-in,.hero-in-2,.hero-in-3,.hero-in-4{animation-duration:.5s}
          .split-card{grid-template-columns:1fr!important;grid-template-rows:auto auto!important}
          .split-card > *:first-child{order:0!important;min-height:clamp(160px,44vw,220px)!important}
          .anatomy-photo-side{order:0!important}
          .anatomy-text-side{order:1!important}
          .ttype-mini-grid{grid-template-columns:1fr 1fr!important}
        }
        @media(prefers-reduced-motion:reduce){
          .ir,.info-lift,.bar-grow,.dot-pulse-i,.hero-in,.hero-in-2,.hero-in-3,.hero-in-4{
            animation:none!important;transition:none!important;opacity:1!important;transform:none!important
          }
        }
        .info-tab-scrollbar::-webkit-scrollbar{display:none}
        .info-tab-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          CINEMATIC HERO — mobile-optimised
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", height: "clamp(380px,70vh,700px)", overflow: "hidden" }}>
        <img
          src={IMGS.heroTyre} alt="Close-up tyre tread" loading="eager"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", filter: isDark ? "brightness(0.28) saturate(0.7)" : "brightness(0.44) saturate(0.7)", transition: "filter .5s" }}
        />
        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.scanline} 1px,transparent 1px),linear-gradient(90deg,${T.scanline} 1px,transparent 1px)`, backgroundSize: "56px 56px", pointerEvents: "none" }} />
        {/* Gradient to page bg */}
        <div style={{ position: "absolute", inset: 0, background: T.heroBg, pointerEvents: "none" }} />
        {/* Orange top glow */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "80vw", height: 280, background: `radial-gradient(ellipse 70% 80% at 50% 0%, ${T.accent}18 0%, transparent 70%)`, pointerEvents: "none" }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto", padding: "0 clamp(16px,5vw,48px)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "clamp(32px,5vh,64px)" }}>
          {/* Badge */}
          <div className="hero-in" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16, background: `${T.accent}1e`, border: `1px solid ${T.accent}40`, borderRadius: 100, padding: "6px 14px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", width: "fit-content" }}>
            <div className="dot-pulse-i" style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: T.accent, letterSpacing: "0.2em", fontFamily: "'JetBrains Mono',monospace" }}>TYRE INTELLIGENCE HUB</span>
          </div>

          {/* Title */}
          <h1 className="hero-in-2" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(52px,11vw,128px)", lineHeight: 0.87, letterSpacing: "-0.04em", margin: "0 0 16px", color: "#ffffff" }}>
            TYRE<br /><span style={{ color: T.accent }}>101</span><span style={{ color: "rgba(255,255,255,0.12)" }}>.</span>
          </h1>

          {/* Sub */}
          <p className="hero-in-3" style={{ fontSize: "clamp(11px,1.5vw,14px)", color: "rgba(255,255,255,0.48)", maxWidth: 480, lineHeight: 1.85, margin: "0 0 clamp(20px,3vh,36px)" }}>
            Everything you need to know about your tyres — from anatomy to wear patterns, compound types to the questions every buyer should ask.
          </p>

          {/* Stats — scrollable row on mobile */}
          <div className="hero-in-4" style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
            {[["4", "anatomy zones"], ["5", "tyre types"], ["6", "wear patterns"], ["5", "buying steps"]].map(([n, l], i, arr) => (
              <div key={l} style={{ padding: `0 clamp(12px,2.5vw,28px)`, borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none", paddingLeft: i === 0 ? 0 : undefined, flexShrink: 0 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(18px,3vw,30px)", color: "#fff", lineHeight: 1 }}>
                  {n}<span style={{ color: T.accent, fontSize: "0.46em", marginLeft: 2 }}>×</span>
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 6, whiteSpace: "nowrap" }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY TAB BAR — no theme toggle here (it's in App's nav)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ position: "sticky", top: 56, zIndex: 400, background: T.panel, borderBottom: `1px solid ${T.border}` }}>
        <div className="info-tab-scrollbar" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(12px,4vw,40px)", display: "flex", alignItems: "center", gap: 2, overflowX: "auto" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { haptic("light"); setActiveTab(tab.id); }}
              className="info-tab-btn"
              style={{ background: activeTab === tab.id ? `${T.accent}18` : "transparent", border: "none", borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent", color: activeTab === tab.id ? T.accent : T.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.1em", padding: "15px 16px", cursor: "pointer", whiteSpace: "nowrap", transition: "all .2s", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="info-tab-icon" style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(28px,4vh,64px) clamp(16px,5vw,48px) clamp(72px,10vh,112px)" }}>

        {/* ──── ANATOMY ────────────────────────────────────────────────── */}
        {activeTab === "anatomy" && (
          <div className="tab-in">
            <SectionHeader label="01 — ANATOMY" title={<>The Four<br /><span style={{ color: T.accent }}>Critical Zones.</span></>} sub="Your tyre has four distinct structural regions. Understanding each helps you spot problems before they become emergencies." />

            {/* Lead image */}
            <div className="ir" style={{ borderRadius: 18, overflow: "hidden", height: "clamp(150px,24vw,240px)", position: "relative", marginBottom: 22 }}>
              <img src={IMGS.treadClose} alt="Tyre tread close-up" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 55%", filter: isDark ? "brightness(0.5)" : "brightness(0.65)" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.1) 60%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "clamp(16px,4vw,44px)" }}>
                <div>
                  <div style={{ fontSize: 9, color: T.accent, letterSpacing: "0.2em", marginBottom: 7, fontFamily: "'JetBrains Mono',monospace" }}>INSIDE EVERY TYRE</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(18px,3.5vw,38px)", color: "#fff", lineHeight: 1.05 }}>Four layers.<br />One contact patch.</div>
                </div>
              </div>
            </div>

            {/* Anatomy cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 48 }}>
              {ANATOMY.map((part, i) => (
                <div key={part.id} className="ir info-lift split-card"
                  style={{ ...G.card, borderRadius: 18, overflow: "hidden", display: "grid", gridTemplateColumns: isMobile ? "1fr" : (i % 2 === 0 ? "1fr 1.6fr" : "1.6fr 1fr"), minHeight: isMobile ? "auto" : 210 }}>
                  {/* Photo side */}
                  <div className="anatomy-photo-side" style={{ position: "relative", overflow: "hidden", minHeight: isMobile ? "clamp(150px,42vw,200px)" : 190, order: isMobile ? 0 : (i % 2 === 0 ? 0 : 1) }}>
                    <img src={part.img} alt={part.label}
                      style={{ width: "100%", height: "100%", objectFit: "cover", filter: isDark ? "brightness(0.55) saturate(0.85)" : "brightness(0.78) saturate(0.9)" }} />
                    <div style={{ position: "absolute", inset: 0, background: isMobile ? "linear-gradient(to bottom, transparent 40%, rgba(8,8,8,0.8) 100%)" : (i % 2 === 0 ? `linear-gradient(to right, transparent 40%, ${T.surface} 100%)` : `linear-gradient(to left, transparent 40%, ${T.surface} 100%)`) }} />
                    {/* Stat bubble */}
                    <div style={{ position: "absolute", top: 12, left: 12, background: `${T.accent}ee`, borderRadius: 9, padding: "7px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", lineHeight: 1 }}>{part.stat}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}>{part.statSub.toUpperCase()}</div>
                    </div>
                    {!isMobile && <div style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 56, color: `${T.accent}18`, lineHeight: 1, userSelect: "none" }}>0{i + 1}</div>}
                  </div>
                  {/* Text side */}
                  <div className="anatomy-text-side" style={{ padding: "clamp(16px,3vw,36px)", display: "flex", flexDirection: "column", justifyContent: "center", order: isMobile ? 1 : (i % 2 === 0 ? 1 : 0) }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, border: `1px solid ${T.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: T.accent, flexShrink: 0 }}>{part.icon}</div>
                      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(17px,2.5vw,22px)", color: T.text, margin: 0, letterSpacing: "-0.02em" }}>{part.label}</h3>
                    </div>
                    <p style={{ fontSize: "clamp(11px,1.4vw,12.5px)", color: T.textMuted, lineHeight: 1.85, margin: 0 }}>{part.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Cross section */}
            <div className="ir" style={{ ...G.card, borderRadius: 18, padding: "clamp(18px,4vw,44px)", border: `1px solid ${T.accent}20` }}>
              <p style={{ fontSize: 9, color: T.accent, letterSpacing: "0.2em", margin: "0 0 18px", fontFamily: "'JetBrains Mono',monospace" }}>CROSS-SECTION DIAGRAM</p>
              <CrossSection />
            </div>
          </div>
        )}

        {/* ──── TYRE TYPES ─────────────────────────────────────────────── */}
        {activeTab === "types" && (
          <div className="tab-in">
            <SectionHeader label="02 — TYRE TYPES" title={<>Right Tyre,<br /><span style={{ color: T.accent }}>Right Season.</span></>} sub="Fitting the wrong compound is as dangerous as worn tread. Each type is engineered for a specific temperature window." />

            {/* Selector strip — 2 cols on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
              {TYRE_TYPES.map((t, i) => (
                <button key={t.label} onClick={() => { haptic("light"); setActiveType(i); }}
                  style={{ background: activeType === i ? `${t.color}1e` : T.ghost, border: activeType === i ? `1px solid ${t.color}55` : `1px solid ${T.border}`, borderRadius: 13, padding: "14px 10px", cursor: "pointer", transition: "all .22s", textAlign: "center", WebkitTapHighlightColor: "transparent" }}>
                  <div style={{ fontSize: isMobile ? 20 : 22, marginBottom: 7, filter: activeType === i ? "none" : "grayscale(0.4)" }}>{t.icon}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 12, color: activeType === i ? t.color : T.text, marginBottom: 3 }}>{t.label}</div>
                  <div style={{ fontSize: 8, color: activeType === i ? t.color : T.textFaint, letterSpacing: "0.04em" }}>{t.temp}</div>
                </button>
              ))}
            </div>

            {/* Active type big card */}
            {TYRE_TYPES.map((t, i) => activeType === i && (
              <div key={t.label} className="tab-in split-card" style={{ ...G.card, borderRadius: 18, overflow: "hidden", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", minHeight: isMobile ? "auto" : 340, marginBottom: 20 }}>
                {/* Photo */}
                <div style={{ position: "relative", overflow: "hidden", minHeight: isMobile ? "clamp(160px,48vw,220px)" : 280 }}>
                  <img src={t.img} alt={t.label} style={{ width: "100%", height: "100%", objectFit: "cover", filter: isDark ? "brightness(0.45)" : "brightness(0.68)" }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to ${isMobile ? "bottom" : "right"}, transparent 35%, ${T.surface} 100%)` }} />
                  <div style={{ position: "absolute", top: 16, left: 16, background: `${t.color}dd`, borderRadius: 8, padding: "6px 12px" }}>
                    <span style={{ fontSize: 9, color: "#fff", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace" }}>{t.badge.toUpperCase()}</span>
                  </div>
                  <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(0,0,0,0.7)", border: `1px solid ${t.color}44`, borderRadius: 8, padding: "7px 11px" }}>
                    <div style={{ fontSize: 8, color: t.color, letterSpacing: "0.1em", marginBottom: 2, fontFamily: "'JetBrains Mono',monospace" }}>OPERATES AT</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#fff" }}>{t.temp}</div>
                  </div>
                  <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: isMobile ? 64 : 80, color: `${t.color}1e`, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>{t.icon}</div>
                </div>
                {/* Detail */}
                <div style={{ padding: "clamp(18px,4vw,44px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 9, color: t.color, letterSpacing: "0.2em", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>TYRE TYPE {String(i + 1).padStart(2, "0")}</div>
                    <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(26px,4vw,46px)", color: T.text, margin: 0, letterSpacing: "-0.03em", lineHeight: 1 }}>{t.label}</h2>
                  </div>
                  <div style={{ display: "flex", gap: 9, padding: "12px 14px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 11 }}>
                    <span style={{ color: "#10b981", fontSize: 13, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: "clamp(11px,1.4vw,12px)", color: T.textMuted, lineHeight: 1.75 }}>{t.pro}</span>
                  </div>
                  <div style={{ display: "flex", gap: 9, padding: "12px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)", borderRadius: 11 }}>
                    <span style={{ color: "#ef4444", fontSize: 13, flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: "clamp(11px,1.4vw,12px)", color: T.textMuted, lineHeight: 1.75 }}>{t.con}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Others as smaller cards */}
            <div className="ttype-mini-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(TYRE_TYPES.filter((_, i) => i !== activeType).length, isMobile ? 2 : 4)},1fr)`, gap: 10 }}>
              {TYRE_TYPES.map((t, i) => i !== activeType && (
                <div key={t.label} className="ir info-lift" onClick={() => { haptic("light"); setActiveType(i); }}
                  style={{ ...G.card, borderRadius: 14, overflow: "hidden", cursor: "pointer", borderLeft: `3px solid ${t.color}44`, WebkitTapHighlightColor: "transparent" }}>
                  <div style={{ height: isMobile ? 72 : 90, position: "relative", overflow: "hidden" }}>
                    <img src={t.img} alt={t.label} style={{ width: "100%", height: "100%", objectFit: "cover", filter: isDark ? "brightness(0.4)" : "brightness(0.65)" }} />
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 25%, ${T.surface} 100%)` }} />
                    <div style={{ position: "absolute", top: 8, left: 10 }}><span style={{ fontSize: 18 }}>{t.icon}</span></div>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 9, color: t.color, letterSpacing: "0.06em" }}>{t.temp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──── WEAR GUIDE ─────────────────────────────────────────────── */}
        {activeTab === "wear" && (
          <div className="tab-in">
            <SectionHeader label="03 — WEAR GUIDE" title={<>Read<br /><span style={{ color: T.accent }}>The Tread.</span></>} sub="Every wear pattern is your tyre reporting a mechanical problem. Learn to decode them before a blowout does it for you." />

            {/* Hero image */}
            <div className="ir" style={{ borderRadius: 18, overflow: "hidden", height: "clamp(140px,22vw,240px)", position: "relative", marginBottom: 28 }}>
              <img src={IMGS.wornTyre} alt="Worn tyre close-up" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%", filter: isDark ? "brightness(0.4)" : "brightness(0.58)" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.12) 55%, transparent 100%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "clamp(16px,4vw,44px)" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#ef4444", letterSpacing: "0.2em", marginBottom: 7, fontFamily: "'JetBrains Mono',monospace" }}>WEAR LEVEL SCALE · A TO F</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(18px,3.5vw,36px)", color: "#fff", lineHeight: 1.05 }}>5 Grades.<br />One Direction.</div>
                </div>
              </div>
            </div>

            {/* Wear level bars */}
            <div className="ir" style={{ ...G.card, borderRadius: 18, padding: "clamp(16px,4vw,32px)", marginBottom: 28 }}>
              {WEAR_LEVELS.map((w, i) => (
                <div key={w.level} onClick={() => { haptic("light"); setExpandedWear(expandedWear === i ? null : i); }}
                  style={{ cursor: "pointer", padding: "clamp(12px,2vw,15px) 0", borderBottom: i < WEAR_LEVELS.length - 1 ? `1px solid ${T.borderFaint}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: w.bg, border: `1px solid ${w.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: w.color }}>{w.grade}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(12px,2vw,14px)", color: T.text }}>{w.level}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: w.color }}>{w.depth}</span>
                      </div>
                      <div style={{ height: 4, background: T.ghost, borderRadius: 3, overflow: "hidden" }}>
                        <div className="bar-grow" style={{ "--bw": `${w.pct}%`, height: "100%", width: `${w.pct}%`, background: `linear-gradient(90deg,${w.color}70,${w.color})`, borderRadius: 3 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: T.textFaint, flexShrink: 0, marginLeft: 4 }}>{expandedWear === i ? "▲" : "▼"}</span>
                  </div>
                  {expandedWear === i && (
                    <div style={{ marginTop: 12, paddingLeft: isMobile ? 0 : 48, animation: "iIn .28s ease both" }}>
                      <p style={{ fontSize: "clamp(11px,1.5vw,12px)", color: T.textMuted, lineHeight: 1.78, margin: "0 0 10px" }}>{w.desc}</p>
                      <div style={{ display: "inline-flex", gap: 7, alignItems: "center", background: w.bg, border: `1px solid ${w.border}`, borderRadius: 8, padding: "7px 13px" }}>
                        <span style={{ fontSize: 10, color: w.color }}>→</span>
                        <span style={{ fontSize: "clamp(10px,1.5vw,11px)", color: w.color, fontWeight: 600 }}>{w.action}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Patterns */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${T.accent}55,transparent)` }} />
              <span style={{ fontSize: 9, color: T.accent, letterSpacing: "0.18em", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}>PATTERNS & ROOT CAUSES</span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg,${T.accent}55,transparent)` }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
              {PATTERNS.map((p, i) => {
                const uc = p.urgency === "high" ? "#ef4444" : p.urgency === "medium" ? "#f59e0b" : "#10b981";
                const ul = p.urgency === "high" ? "URGENT" : p.urgency === "medium" ? "MODERATE" : "COSMETIC";
                return (
                  <div key={p.label} className="ir info-lift" style={{ ...G.card, borderRadius: 16, padding: "clamp(14px,3vw,22px)", borderLeft: `3px solid ${uc}44` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 11 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${uc}12`, border: `1px solid ${uc}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: uc }}>{p.icon}</div>
                      <span style={{ fontSize: 8, color: uc, background: `${uc}14`, border: `1px solid ${uc}28`, borderRadius: 20, padding: "4px 9px", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>{ul}</span>
                    </div>
                    <h4 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,2vw,15px)", color: T.text, margin: "0 0 3px" }}>{p.label}</h4>
                    <p style={{ fontSize: 9, color: T.accent, letterSpacing: "0.08em", margin: "0 0 9px", fontFamily: "'JetBrains Mono',monospace" }}>CAUSE: {p.cause.toUpperCase()}</p>
                    <p style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted, lineHeight: 1.78, margin: "0 0 12px" }}>{p.desc}</p>
                    <div style={{ display: "flex", gap: 7, padding: "9px 11px", background: `${uc}07`, border: `1px solid ${uc}1e`, borderRadius: 9 }}>
                      <span style={{ fontSize: 10, color: uc, flexShrink: 0, marginTop: 1 }}>↳</span>
                      <span style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted, lineHeight: 1.65 }}><span style={{ color: uc, fontWeight: 600 }}>Fix: </span>{p.fix}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──── BUYING GUIDE ───────────────────────────────────────────── */}
        {activeTab === "buying" && (
          <div className="tab-in">
            <SectionHeader label="04 — BUYING GUIDE" title={<>Buy<br /><span style={{ color: T.accent }}>With Confidence.</span></>} sub="Five questions most people never ask at a tyre shop — and why they matter before you spend a single rupee." />

            {/* Step pills — horizontally scrollable on mobile */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
              {BUY_STEPS.map((s, i) => (
                <button key={s.n} onClick={() => { haptic("light"); setActiveBuyStep(i); }}
                  style={{ background: activeBuyStep === i ? `${T.accent}1e` : T.ghost, border: activeBuyStep === i ? `1px solid ${T.accent}55` : `1px solid ${T.border}`, borderRadius: 100, padding: "8px 14px", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 7, flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 10, color: activeBuyStep === i ? T.accent : T.textFaint }}>{s.n}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: activeBuyStep === i ? T.accent : T.textMuted, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{s.title.toUpperCase()}</span>
                </button>
              ))}
            </div>

            {/* Step content */}
            {activeBuyStep === 0 && (
              <BuyCard img={BUY_STEPS[0].img} title="Decode Your Sidewall" n="01">
                <p style={{ fontSize: "clamp(11px,1.5vw,12px)", color: T.textMuted, lineHeight: 1.85, margin: "0 0 16px" }}>Every tyre has a code string on its sidewall. It's not decoration — it tells you exactly how to spec a replacement.</p>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(14px,3vw,18px)", background: `${T.accent}0d`, border: `1px solid ${T.accent}2e`, borderRadius: 11, padding: "14px 18px", marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 3, letterSpacing: "0.04em" }}>
                  <span style={{ color: T.accent, fontWeight: 700 }}>205</span>
                  <span style={{ color: T.textFaint }}>/</span>
                  <span style={{ color: T.accentMid, fontWeight: 700 }}>55</span>
                  <span style={{ color: T.textFaint }}>&nbsp;R</span>
                  <span style={{ color: T.accent, fontWeight: 700 }}>16</span>
                  <span style={{ color: T.textFaint }}>&nbsp;91</span>
                  <span style={{ color: T.accentMid, fontWeight: 700 }}>V</span>
                </div>
                {[["205", "Section width in mm — how wide the tyre is"], ["55", "Aspect ratio: sidewall height as % of width (55% of 205mm = 113mm)"], ["R16", "R = Radial construction · 16 = rim diameter in inches"], ["91", "Load index — max load per tyre (91 = 615 kg)"], ["V", "Speed rating — max sustained speed (V = 240 km/h)"]].map(([c, d]) => (
                  <div key={c} style={{ display: "flex", gap: 12, marginBottom: 9, alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: T.accent, minWidth: 26, flexShrink: 0, fontWeight: 700 }}>{c}</span>
                    <span style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted, lineHeight: 1.65 }}>{d}</span>
                  </div>
                ))}
              </BuyCard>
            )}

            {activeBuyStep === 1 && (
              <BuyCard img={BUY_STEPS[1].img} title="Verify the DOT Age" n="02">
                <p style={{ fontSize: "clamp(11px,1.5vw,12px)", color: T.textMuted, lineHeight: 1.85, margin: "0 0 14px" }}>Tyres don't last forever — even with full tread depth. Rubber degrades from inside and UV exposure cracks internal belts invisibly.</p>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(11px,2vw,13px)", background: `${T.accent}0d`, border: `1px solid ${T.accent}2e`, borderRadius: 10, padding: "12px 15px", marginBottom: 14 }}>
                  DOT XXXX XX <span style={{ color: T.accent, fontWeight: 700 }}>2224</span>
                  <span style={{ color: T.textFaint, fontSize: 10, marginLeft: 8 }}>← week 22, year 2024</span>
                </div>
                {[["Under 2 years", "Ideal. Compound is fresh.", T.accent], ["2–4 years", "Good. Regular checks recommended.", "#10b981"], ["4–6 years", "Ageing. Plan replacement soon.", "#f59e0b"], ["Over 6 years", "Replace now regardless of tread.", "#ef4444"]].map(([age, note, c]) => (
                  <div key={age} style={{ display: "flex", gap: 10, marginBottom: 9, padding: "10px 13px", background: `${c}09`, border: `1px solid ${c}22`, borderRadius: 9 }}>
                    <div style={{ width: 3, background: c, borderRadius: 2, flexShrink: 0, alignSelf: "stretch" }} />
                    <div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(11px,1.5vw,12px)", color: c, marginBottom: 2 }}>{age}</div><div style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted }}>{note}</div></div>
                  </div>
                ))}
              </BuyCard>
            )}

            {activeBuyStep === 2 && (
              <BuyCard img={BUY_STEPS[2].img} title="Match Load & Speed" n="03">
                <p style={{ fontSize: "clamp(11px,1.5vw,12px)", color: T.textMuted, lineHeight: 1.85, margin: "0 0 14px" }}>Never fit a tyre with a lower load index or speed rating than your manufacturer's minimum. It's illegal and voids your insurance.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
                  {[["T", "190 km/h", "Spare / budget"], ["H", "210 km/h", "Family saloon"], ["V", "240 km/h", "Sports / premium"], ["W/Y", "270–300+", "High-performance"]].map(([r, s, u]) => (
                    <div key={r} style={{ background: `${T.accent}0a`, borderRadius: 10, padding: "12px 13px", border: `1px solid ${T.accent}1e` }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,4vw,24px)", color: T.accent }}>{r}</span>
                      <span style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted, display: "block", marginTop: 3 }}>{s}</span>
                      <span style={{ fontSize: 9, color: T.textFaint }}>{u}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "12px 14px", background: `${T.accent}08`, border: `1px solid ${T.accent}22`, borderRadius: 10 }}>
                  <p style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted, margin: 0, lineHeight: 1.7 }}>💡 <span style={{ color: T.accent }}>Pro tip:</span> The exact spec is on a sticker inside your driver-side door frame, or in your owner's manual.</p>
                </div>
              </BuyCard>
            )}

            {activeBuyStep === 3 && (
              <BuyCard img={BUY_STEPS[3].img} title="Ask These Questions" n="04">
                <p style={{ fontSize: "clamp(11px,1.5vw,12px)", color: T.textMuted, lineHeight: 1.85, margin: "0 0 14px" }}>Good tyre shops welcome every one of these. A shop that deflects them is telling you something important about their standards.</p>
                {["Is the DOT date within the last 2 years?", "Can I see the full spec sheet for this model?", "Does the price include wheel balancing?", "Will you check 4-wheel alignment, not just balance?", "Do you offer a free re-torque check after 50 km?", "Is road-hazard or repair cover included?", "Do you stock the exact OEM spec for my vehicle?"].map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, marginBottom: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${T.accent}40`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, color: T.accent, fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted, lineHeight: 1.7 }}>{q}</span>
                  </div>
                ))}
              </BuyCard>
            )}

            {activeBuyStep === 4 && (
              <BuyCard img={BUY_STEPS[4].img} title="Budget vs Premium" n="05">
                <p style={{ fontSize: "clamp(11px,1.5vw,12px)", color: T.textMuted, lineHeight: 1.85, margin: "0 0 14px" }}>Independent testing consistently shows a <span style={{ color: T.text, fontWeight: 600 }}>5–8 metre longer wet stopping distance</span> from 80 km/h between budget and premium tyres. That's a car length.</p>
                {[{ tier: "Budget", brands: "Nankang, Falken, Kumho", note: "Fine for low-mileage, urban use. Some corner-cutting on compound longevity.", c: "#10b981", pct: 55 }, { tier: "Mid-range", brands: "Hankook, Toyo, Cooper", note: "Best value. Near-premium wet performance at roughly 70% of the cost.", c: "#f59e0b", pct: 78 }, { tier: "Premium", brands: "Michelin, Continental, Pirelli", note: "Best wet braking, longest-lasting compound, highest batch consistency.", c: T.accent, pct: 100 }].map(({ tier, brands, note, c, pct }) => (
                  <div key={tier} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(12px,1.8vw,13px)", color: T.text }}>{tier}</span>
                      <span style={{ fontSize: 9, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{pct}% score</span>
                    </div>
                    <div style={{ height: 4, background: T.ghost, borderRadius: 3, marginBottom: 6, overflow: "hidden" }}>
                      <div className="bar-grow" style={{ "--bw": `${pct}%`, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${c}80,${c})`, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 9, color: T.textFaint, marginBottom: 2 }}>{brands}</div>
                    <div style={{ fontSize: "clamp(10px,1.4vw,11px)", color: T.textMuted }}>{note}</div>
                  </div>
                ))}
              </BuyCard>
            )}

            {/* Prev / Next nav */}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => { haptic("light"); setActiveBuyStep(s => Math.max(0, s - 1)); }} disabled={activeBuyStep === 0}
                style={{ flex: 1, padding: "14px", borderRadius: 11, cursor: activeBuyStep === 0 ? "not-allowed" : "pointer", background: T.ghost, border: `1px solid ${T.border}`, color: activeBuyStep === 0 ? T.textFaint : T.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.08em", transition: "all .2s" }}>← PREV</button>
              <button onClick={() => { haptic("medium"); setActiveBuyStep(s => Math.min(BUY_STEPS.length - 1, s + 1)); }} disabled={activeBuyStep === BUY_STEPS.length - 1}
                style={{ flex: 1, padding: "14px", borderRadius: 11, cursor: activeBuyStep === BUY_STEPS.length - 1 ? "not-allowed" : "pointer", background: activeBuyStep < BUY_STEPS.length - 1 ? `linear-gradient(135deg,${T.accentMid},${T.accentDark})` : T.ghost, border: "none", color: activeBuyStep < BUY_STEPS.length - 1 ? "white" : T.textFaint, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", transition: "all .2s" }}>NEXT →</button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM CTA STRIP — wired to setPage("diagnose")
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", overflow: "hidden", minHeight: "clamp(180px,28vh,280px)" }}>
        <img src={IMGS.carOnRoad} alt="Car on open road" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: isDark ? "brightness(0.2) saturate(0.55)" : "brightness(0.3) saturate(0.55)" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${T.accent}28 0%, transparent 55%)` }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.scanline} 1px,transparent 1px),linear-gradient(90deg,${T.scanline} 1px,transparent 1px)`, backgroundSize: "44px 44px" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto", padding: "clamp(36px,6vh,72px) clamp(16px,5vw,48px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <p style={{ fontSize: 9, color: T.accent, letterSpacing: "0.22em", margin: "0 0 10px", fontFamily: "'JetBrains Mono',monospace" }}>READY TO DIAGNOSE?</p>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,4vw,44px)", color: "#fff", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Now you know what to look for.<br />
              <span style={{ color: T.accent }}>Let AI do the rest.</span>
            </h3>
          </div>
          <button
            onClick={() => { haptic("medium"); setPage?.("diagnose"); }}
            style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", borderRadius: 13, padding: "clamp(12px,2vw,15px) clamp(22px,4vw,32px)", cursor: "pointer", boxShadow: "0 0 36px rgba(249,115,22,0.45)", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,2vw,14px)", letterSpacing: "0.06em", color: "white", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
            ▶ RUN DIAGNOSTIC
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.borderFaint}`, padding: "clamp(16px,2.5vh,28px) clamp(16px,5vw,48px)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace" }}>STRADA · TYRE INTELLIGENCE HUB</span>
        <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>EDUCATIONAL GUIDE · NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
      </div>
    </div>
  );
}