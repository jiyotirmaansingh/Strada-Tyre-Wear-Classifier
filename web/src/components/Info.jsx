import { useState, useEffect, useRef, useContext, createContext, useCallback } from "react";

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
// In production: replace these 2 lines with `import { ThemeContext } from "../App"`
// and in App.jsx add: export const ThemeContext = createContext(...)
export const InfoThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });
const useTheme = () => useContext(InfoThemeContext);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const DARK = {
  bg: "#080808", surface: "rgba(22,22,22,0.98)", panel: "rgba(14,14,14,0.97)",
  ghost: "rgba(255,255,255,0.03)", text: "#ffffff", textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.38)", textFaint: "rgba(255,255,255,0.18)",
  border: "rgba(255,255,255,0.07)", borderFaint: "rgba(255,255,255,0.04)",
  accent: "#f97316", accentMid: "#fb923c", accentDark: "#c2410c",
  cardBg: "rgba(22,22,22,0.98)", cardBorder: "rgba(255,255,255,0.07)",
  cardShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
  heroBg: "linear-gradient(180deg, rgba(8,8,8,0) 0%, #080808 100%)",
  scanline: "rgba(249,115,22,0.04)",
};
const LIGHT = {
  bg: "#faf7f4", surface: "rgba(255,252,249,0.99)", panel: "rgba(255,252,249,0.97)",
  ghost: "rgba(0,0,0,0.03)", text: "#1a1008", textSub: "rgba(26,16,8,0.62)",
  textMuted: "rgba(26,16,8,0.48)", textFaint: "rgba(26,16,8,0.22)",
  border: "rgba(0,0,0,0.08)", borderFaint: "rgba(0,0,0,0.04)",
  accent: "#ea6500", accentMid: "#f97316", accentDark: "#c2410c",
  cardBg: "rgba(255,252,249,0.99)", cardBorder: "rgba(0,0,0,0.08)",
  cardShadow: "0 4px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
  heroBg: "linear-gradient(180deg, rgba(250,247,244,0) 0%, #faf7f4 100%)",
  scanline: "rgba(234,101,0,0.03)",
};
function useT() { const { theme } = useTheme(); return theme === "dark" ? DARK : LIGHT; }

// ─── TYRE IMAGE LIBRARY ───────────────────────────────────────────────────────
const IMGS = {
  heroTyre:   "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85&auto=format&fit=crop",
  treadClose: "https://images.unsplash.com/photo-1606577924006-27d39b132ae2?w=900&q=85&auto=format&fit=crop",
  sidewall:   "https://images.unsplash.com/photo-1591137682073-e1fdca3c3fd9?w=900&q=85&auto=format&fit=crop",
  wornTyre:   "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=900&q=85&auto=format&fit=crop",
  newTyre:    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=85&auto=format&fit=crop",
  winterTyre: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=85&auto=format&fit=crop",
  allTerrain: "https://images.unsplash.com/photo-1547245324-d777c6f05e80?w=900&q=85&auto=format&fit=crop",
  tyreShop:   "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=900&q=85&auto=format&fit=crop",
  rimClose:   "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=900&q=85&auto=format&fit=crop",
  carOnRoad:  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&q=85&auto=format&fit=crop",
  tyreStack:  "https://images.unsplash.com/photo-1570441262582-a2d4b9a916a5?w=900&q=85&auto=format&fit=crop",
  mechanic:   "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=900&q=85&auto=format&fit=crop",
  performance:"https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=900&q=85&auto=format&fit=crop",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ANATOMY = [
  { id:"tread",    label:"Tread",    icon:"▦", stat:"1.6 mm", statSub:"legal min", img:IMGS.treadClose, desc:"The outer contact layer. Grooves channel up to 8 litres of water per second away from the contact patch to prevent aquaplaning. Sipes (micro-cuts) add additional bite on wet roads. Below 1.6 mm is illegal in most countries — safety experts recommend changing at 3 mm." },
  { id:"sidewall", label:"Sidewall", icon:"⌁", stat:"6 ply",  statSub:"typical",   img:IMGS.sidewall,   desc:"The vertical wall between tread and rim. It flexes under load to absorb road shocks and protects the internal structure. A bulge, crack, or cut here signals structural failure — the tyre must be replaced immediately, regardless of tread depth." },
  { id:"bead",     label:"Bead",     icon:"◉", stat:"Steel",  statSub:"wire core", img:IMGS.rimClose,   desc:"High-tensile steel wire bundles, rubber-coated and formed into the tyre's inner edge. The bead creates an airtight seal against the rim. A broken bead causes instant deflation and complete loss of directional control." },
  { id:"dot",      label:"DOT Code", icon:"◈", stat:"6 yrs",  statSub:"max age",   img:IMGS.sidewall,   desc:"A government-mandated code moulded into the sidewall. The last 4 digits encode manufacture date — e.g. 2224 = week 22 of 2024. Tyres older than 6 years should be replaced even if tread depth looks fine — rubber degrades internally and invisibly." },
];

const TYRE_TYPES = [
  { icon:"☀", label:"Summer",      temp:"7 °C+",       color:"#f97316", badge:"Performance",   img:IMGS.treadClose,  pro:"Maximum dry and wet grip. Low rolling resistance. Precise, responsive handling at speed.", con:"Rubber stiffens dangerously below 7 °C — braking distance can double in cold conditions." },
  { icon:"❄", label:"Winter",      temp:"Below 7 °C",  color:"#3b82f6", badge:"Cold-weather",  img:IMGS.winterTyre,  pro:"Shorter braking distances on snow and ice. High-silica compound stays pliable in freezing temps.", con:"Wears significantly faster in warm weather. Increased road noise and reduced fuel economy on dry roads." },
  { icon:"◑", label:"All-Season",  temp:"Year-round",  color:"#10b981", badge:"Versatile",     img:IMGS.newTyre,     pro:"Single tyre set for all conditions. Cost-effective. Often M+S and sometimes 3PMSF rated.", con:"Jack of all trades — not best-in-class for any single condition. Compromised in both extremes." },
  { icon:"◎", label:"Performance", temp:"7 °C+",        color:"#ef4444", badge:"Track-focused", img:IMGS.performance, pro:"Ultra-sharp cornering response. High-speed stability. Wide contact patch for maximum grip.", con:"Expensive. Wears faster than standard. Harder ride on everyday commuter roads." },
  { icon:"◐", label:"All-Terrain", temp:"Any",          color:"#84cc16", badge:"Off-road",      img:IMGS.allTerrain,  pro:"Handles dirt, gravel, and light off-roading while retaining highway manners.", con:"Louder on tarmac. Reduced fuel economy. Less responsive than road-focused compounds." },
];

const WEAR_LEVELS = [
  { grade:"A", level:"New",      depth:"8–9 mm",   pct:100, color:"#10b981", bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.3)",  desc:"Full tread depth. Fresh and road-legal everywhere. No action needed.", action:"Monitor at next service interval." },
  { grade:"B", level:"Good",     depth:"5–7 mm",   pct:75,  color:"#84cc16", bg:"rgba(132,204,22,0.1)",  border:"rgba(132,204,22,0.3)",  desc:"Healthy and well within legal limits. Grip is strong in wet and dry conditions.", action:"Check again in 6 months or 5,000 km." },
  { grade:"C", level:"Worn",     depth:"3–4 mm",   pct:45,  color:"#f59e0b", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.3)",  desc:"Below the halfway mark. Wet-weather braking distances are noticeably longer.", action:"Plan replacement within 3–6 months." },
  { grade:"D", level:"Critical", depth:"2–3 mm",   pct:22,  color:"#f97316", bg:"rgba(249,115,22,0.1)",  border:"rgba(249,115,22,0.3)",  desc:"Dangerously close to the legal minimum. Aquaplaning risk is high in the rain.", action:"Replace within 2 weeks / 1,000 km." },
  { grade:"F", level:"Bald",     depth:"< 1.6 mm", pct:5,   color:"#ef4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.3)",   desc:"Illegal in most countries. Zero wet grip. Blowout risk is very high at speed.", action:"DO NOT DRIVE. Replace immediately." },
];

const PATTERNS = [
  { icon:"▬", label:"Centre Wear",      cause:"Over-inflation",       urgency:"medium", color:"#f59e0b", desc:"Excess pressure bulges the tyre, wearing only the centre strip while edges stay fresh.", fix:"Reduce to manufacturer spec. Check door-jamb sticker." },
  { icon:"◫", label:"Edge Wear",        cause:"Under-inflation",      urgency:"medium", color:"#f59e0b", desc:"Low pressure sags both outer shoulders into the road. Fuel economy drops noticeably too.", fix:"Inflate to correct PSI. Investigate for slow puncture if recurring." },
  { icon:"∿", label:"Cupping / Scallop",cause:"Worn shock absorbers", urgency:"high",   color:"#ef4444", desc:"The wheel bounces rather than rolls, creating diagonal scalloped hollows around the tread.", fix:"Replace shock absorbers / struts. Rebalance wheels immediately." },
  { icon:"⩖", label:"Feathering",       cause:"Toe misalignment",     urgency:"medium", color:"#f59e0b", desc:"Tread blocks sharp on one side, smooth on the other — the tyre tracks diagonally to travel.", fix:"4-wheel alignment — specifically toe-in/toe-out correction." },
  { icon:"◧", label:"One-sided Wear",   cause:"Camber misalignment",  urgency:"high",   color:"#ef4444", desc:"One shoulder is significantly more worn. Positive or negative camber is grinding it down.", fix:"Full 4-wheel alignment. Check control arms and ball joints." },
  { icon:"◌", label:"Flat Spots",       cause:"Locked-wheel braking", urgency:"low",    color:"#10b981", desc:"Emergency stops without ABS, or months of parking, create flat zones felt as rhythmic thumping.", fix:"Mild: rounds out after 50–100 km. Severe: replace the tyre." },
];

const BUY_STEPS = [
  { n:"01", title:"Decode Your Sidewall",      img:IMGS.rimClose    },
  { n:"02", title:"Verify the DOT Age",        img:IMGS.sidewall    },
  { n:"03", title:"Match Load & Speed",        img:IMGS.tyreShop    },
  { n:"04", title:"Ask the Right Questions",   img:IMGS.mechanic    },
  { n:"05", title:"Budget vs Premium",         img:IMGS.tyreStack   },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function haptic(t="light") { try { navigator.vibrate?.(t==="light"?8:18); } catch(_){} }

function useReveal(deps=[]) {
  useEffect(() => {
    const items = document.querySelectorAll(".ir:not(.vis)");
    if (!items.length) return;
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } }),
      { threshold:0.05, rootMargin:"0px 0px -20px 0px" }
    );
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, deps);
}

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const T = useT();
  const isDark = theme === "dark";
  const ref = useRef(null);
  const handle = () => {
    haptic("light");
    if (document.startViewTransition) {
      const btn = ref.current;
      if (btn) {
        const r = btn.getBoundingClientRect();
        document.documentElement.style.setProperty("--radar-x", `${((r.left+r.width/2)/window.innerWidth)*100}%`);
        document.documentElement.style.setProperty("--radar-y", `${((r.top+r.height/2)/window.innerHeight)*100}%`);
      }
      document.startViewTransition(toggleTheme);
    } else { toggleTheme(); }
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {isDark && <span style={{ fontSize:9, color:T.accent, letterSpacing:"0.1em", background:`${T.accent}18`, border:`1px solid ${T.accent}40`, padding:"3px 8px", borderRadius:4, fontFamily:"'JetBrains Mono',monospace" }}>DARK</span>}
      <button ref={ref} onClick={handle} style={{ width:40, height:22, borderRadius:11, border:`1px solid ${isDark?"rgba(249,115,22,0.3)":"rgba(234,101,0,0.3)"}`, background:isDark?"rgba(249,115,22,0.1)":"rgba(234,101,0,0.12)", cursor:"pointer", position:"relative", transition:"all .3s", flexShrink:0, overflow:"hidden" }} aria-label={isDark?"Switch to light":"Switch to dark"}>
        <div style={{ position:"absolute", top:2, left:isDark?20:2, width:16, height:16, borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#c2410c)", transition:"left .25s cubic-bezier(.16,1,.3,1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8 }}>{isDark?"☽":"☀"}</div>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function InfoPage() {
  // Local theme state — remove this and use App's ThemeContext instead if integrated
  const [theme, setTheme] = useState("dark");
  const toggleTheme = useCallback(() => setTheme(t => t==="dark"?"light":"dark"), []);
  const T = theme === "dark" ? DARK : LIGHT;

  const [activeTab,      setActiveTab]      = useState("anatomy");
  const [expandedWear,   setExpandedWear]   = useState(null);
  const [activeBuyStep,  setActiveBuyStep]  = useState(0);
  const [activeType,     setActiveType]     = useState(0);
  useReveal([activeTab]);

  const TABS = [
    { id:"anatomy", label:"Anatomy",    icon:"◎" },
    { id:"types",   label:"Tyre Types", icon:"◑" },
    { id:"wear",    label:"Wear Guide", icon:"⌁" },
    { id:"buying",  label:"Buy Smart",  icon:"◈" },
  ];

  const card = { background:T.cardBg, border:`1px solid ${T.cardBorder}`, boxShadow:T.cardShadow };

  return (
    <InfoThemeContext.Provider value={{ theme, toggleTheme }}>
      <div style={{ minHeight:"100dvh", background:T.bg, color:T.text, fontFamily:"'JetBrains Mono',monospace", transition:"background .4s,color .4s" }}>

        {/* ─ CSS ─────────────────────────────────────────────────────────── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
          .ir{opacity:0;transform:translateY(26px);transition:opacity .65s cubic-bezier(.16,1,.3,1),transform .65s cubic-bezier(.16,1,.3,1)}
          .ir.vis{opacity:1;transform:none}
          .info-lift{transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s}
          .info-lift:hover{transform:translateY(-4px) scale(1.006)}
          @keyframes iIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
          .tab-in{animation:iIn .35s cubic-bezier(.16,1,.3,1) both}
          @keyframes barW{from{width:0}to{width:var(--bw)}}
          .bar-grow{animation:barW 1.3s cubic-bezier(.16,1,.3,1) .15s both}
          @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
          .dot-pulse{animation:pulseDot 2s ease-in-out infinite}
          @keyframes heroReveal{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
          .hero-in{animation:heroReveal .9s cubic-bezier(.16,1,.3,1) both}
          .hero-in-2{animation:heroReveal .9s cubic-bezier(.16,1,.3,1) .15s both}
          .hero-in-3{animation:heroReveal .9s cubic-bezier(.16,1,.3,1) .3s both}
          .hero-in-4{animation:heroReveal .9s cubic-bezier(.16,1,.3,1) .45s both}
          @media(max-width:640px){
            .split-card{grid-template-columns:1fr!important}
            .info-lift:hover{transform:none}
            .ir{transition:opacity .4s ease}
            .ir.vis{transform:none}
          }
          @media(prefers-reduced-motion:reduce){
            .ir,.info-lift,.bar-grow,.dot-pulse,.hero-in,.hero-in-2,.hero-in-3,.hero-in-4{
              animation:none!important;transition:none!important;opacity:1!important;transform:none!important
            }
          }
        `}</style>

        {/* ══════════════════════════════════════════════════════════════════
            CINEMATIC HERO
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ position:"relative", height:"clamp(500px,85vh,780px)", overflow:"hidden" }}>
          {/* Full-bleed tyre photo */}
          <img src={IMGS.heroTyre} alt="Close-up tyre tread" loading="eager"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 40%", filter:theme==="dark"?"brightness(0.32) saturate(0.75)":"brightness(0.48) saturate(0.7)", transition:"filter .5s" }} />

          {/* Grid overlay */}
          <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.scanline} 1px,transparent 1px),linear-gradient(90deg,${T.scanline} 1px,transparent 1px)`, backgroundSize:"64px 64px", pointerEvents:"none" }} />

          {/* Gradient fade down to page bg */}
          <div style={{ position:"absolute", inset:0, background:T.heroBg, pointerEvents:"none" }} />

          {/* Orange glow at top */}
          <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"70vw", height:320, background:`radial-gradient(ellipse 70% 80% at 50% 0%, ${T.accent}20 0%, transparent 70%)`, pointerEvents:"none" }} />

          {/* Floating dark mode toggle — top right */}
          <div style={{ position:"absolute", top:24, right:"clamp(16px,5vw,48px)", zIndex:10 }}>
            <ThemeToggle />
          </div>

          {/* Hero text */}
          <div style={{ position:"relative", zIndex:2, maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,48px)", height:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", paddingBottom:"clamp(44px,7vh,80px)" }}>

            {/* Badge */}
            <div className="hero-in" style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:20, background:`${T.accent}20`, border:`1px solid ${T.accent}40`, borderRadius:100, padding:"7px 16px", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", width:"fit-content" }}>
              <div className="dot-pulse" style={{ width:7, height:7, borderRadius:"50%", background:T.accent, flexShrink:0 }} />
              <span style={{ fontSize:9, color:T.accent, letterSpacing:"0.22em" }}>TYRE INTELLIGENCE HUB</span>
            </div>

            {/* Big title */}
            <h1 className="hero-in-2" style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(60px,12vw,140px)", lineHeight:0.86, letterSpacing:"-0.04em", margin:"0 0 22px", color:"#ffffff" }}>
              TYRE<br />
              <span style={{ color:T.accent }}>101</span>
              <span style={{ color:"rgba(255,255,255,0.15)" }}>.</span>
            </h1>

            {/* Sub */}
            <p className="hero-in-3" style={{ fontSize:"clamp(12px,1.5vw,15px)", color:"rgba(255,255,255,0.52)", maxWidth:520, lineHeight:1.9, margin:"0 0 36px" }}>
              Everything you need to understand your tyres — from anatomy to wear patterns, compound types to the questions every buyer should ask a fitter.
            </p>

            {/* Stats row */}
            <div className="hero-in-4" style={{ display:"flex", gap:0, flexWrap:"wrap" }}>
              {[["4","anatomy zones"],["5","tyre types"],["6","wear patterns"],["5","buying steps"]].map(([n,l],i,arr) => (
                <div key={l} style={{ padding:`0 clamp(16px,3vw,32px)`, borderRight:i<arr.length-1?"1px solid rgba(255,255,255,0.1)":"none", paddingLeft:i===0?0:undefined }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(22px,3.5vw,34px)", color:"#fff", lineHeight:1 }}>
                    {n}<span style={{ color:T.accent, fontSize:"0.46em", marginLeft:2 }}>×</span>
                  </div>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.28)", letterSpacing:"0.12em", marginTop:7 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STICKY TAB BAR
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ position:"sticky", top:56, zIndex:400, background:T.panel, borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", transition:"background .4s" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 clamp(16px,5vw,48px)", display:"flex", alignItems:"center", gap:2, overflowX:"auto", scrollbarWidth:"none" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { haptic("light"); setActiveTab(tab.id); }}
                style={{ background:activeTab===tab.id?`${T.accent}18`:"transparent", border:"none", borderBottom:activeTab===tab.id?`2px solid ${T.accent}`:"2px solid transparent", color:activeTab===tab.id?T.accent:T.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:"0.12em", padding:"16px 18px", cursor:"pointer", whiteSpace:"nowrap", transition:"all .2s", flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
                <span>{tab.icon}</span>{tab.label.toUpperCase()}
              </button>
            ))}
            {/* Tab bar theme toggle */}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", padding:"0 4px", flexShrink:0 }}>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTENT AREA
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"clamp(36px,5vh,72px) clamp(16px,5vw,48px) clamp(80px,10vh,120px)" }}>

          {/* ──── ANATOMY ────────────────────────────────────────────────── */}
          {activeTab === "anatomy" && (
            <div className="tab-in">
              <SectionHeader T={T} label="01 — ANATOMY" title={<>The Four<br /><span style={{color:T.accent}}>Critical Zones.</span></>} sub="Your tyre has four distinct structural regions. Understanding each one helps you spot problems before they become emergencies." />

              {/* Full-bleed anatomy lead image */}
              <div className="ir" style={{ borderRadius:20, overflow:"hidden", height:"clamp(180px,28vw,280px)", position:"relative", marginBottom:28 }}>
                <img src={IMGS.treadClose} alt="Tyre tread close-up" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 55%", filter:theme==="dark"?"brightness(0.55)":"brightness(0.7)" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(8,8,8,0.88) 0%, rgba(8,8,8,0.1) 60%)" }} />
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", padding:"clamp(20px,4vw,48px)" }}>
                  <div>
                    <div style={{ fontSize:9, color:T.accent, letterSpacing:"0.2em", marginBottom:8 }}>INSIDE EVERY TYRE</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(22px,4vw,42px)", color:"#fff", lineHeight:1.05 }}>Four layers.<br />One contact patch.</div>
                  </div>
                </div>
              </div>

              {/* Anatomy cards — alternating photo/text layout */}
              <div style={{ display:"flex", flexDirection:"column", gap:20, marginBottom:56 }}>
                {ANATOMY.map((part, i) => (
                  <div key={part.id} className={`ir info-lift split-card`}
                    style={{ ...card, borderRadius:20, overflow:"hidden", display:"grid", gridTemplateColumns: i%2===0 ? "1fr 1.65fr" : "1.65fr 1fr", minHeight:220, animationDelay:`${i*0.08}s` }}>

                    {/* Photo side */}
                    <div style={{ position:"relative", overflow:"hidden", order:i%2===0?0:1, minHeight:190 }}>
                      <img src={part.img} alt={part.label}
                        style={{ width:"100%", height:"100%", objectFit:"cover", filter:theme==="dark"?"brightness(0.6) saturate(0.85)":"brightness(0.82) saturate(0.9)", transition:"filter .4s,transform .6s cubic-bezier(.16,1,.3,1)" }} />
                      <div style={{ position:"absolute", inset:0, background: i%2===0
                        ? `linear-gradient(to right, transparent 45%, ${T.cardBg} 100%)`
                        : `linear-gradient(to left, transparent 45%, ${T.cardBg} 100%)` }} />
                      {/* Stat bubble */}
                      <div style={{ position:"absolute", top:16, left:16, background:`${T.accent}ee`, borderRadius:10, padding:"8px 14px", boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:"#fff", lineHeight:1 }}>{part.stat}</div>
                        <div style={{ fontSize:8, color:"rgba(255,255,255,0.7)", letterSpacing:"0.12em" }}>{part.statSub.toUpperCase()}</div>
                      </div>
                      {/* Zone number watermark */}
                      <div style={{ position:"absolute", bottom:8, right:12, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:64, color:`${T.accent}18`, lineHeight:1, userSelect:"none" }}>0{i+1}</div>
                    </div>

                    {/* Text side */}
                    <div style={{ padding:"clamp(20px,3vw,40px)", display:"flex", flexDirection:"column", justifyContent:"center", order:i%2===0?1:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:`${T.accent}18`, border:`1px solid ${T.accent}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, color:T.accent, flexShrink:0 }}>{part.icon}</div>
                        <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:T.text, margin:0, letterSpacing:"-0.02em" }}>{part.label}</h3>
                      </div>
                      <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.85, margin:0 }}>{part.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* SVG cross-section */}
              <div className="ir" style={{ ...card, borderRadius:20, padding:"clamp(22px,4vw,48px)", border:`1px solid ${T.accent}20` }}>
                <p style={{ fontSize:9, color:T.accent, letterSpacing:"0.2em", margin:"0 0 20px" }}>CROSS-SECTION DIAGRAM</p>
                <CrossSection T={T} isDark={theme==="dark"} />
              </div>
            </div>
          )}

          {/* ──── TYRE TYPES ─────────────────────────────────────────────── */}
          {activeTab === "types" && (
            <div className="tab-in">
              <SectionHeader T={T} label="02 — TYRE TYPES" title={<>Right Tyre,<br /><span style={{color:T.accent}}>Right Season.</span></>} sub="Fitting the wrong compound is as dangerous as worn tread. Each type is engineered for a specific temperature window." />

              {/* Type selector strip */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(140px,100%),1fr))", gap:10, marginBottom:24 }}>
                {TYRE_TYPES.map((t,i) => (
                  <button key={t.label} onClick={() => { haptic("light"); setActiveType(i); }}
                    style={{ background:activeType===i?`${t.color}20`:T.ghost, border:activeType===i?`1px solid ${t.color}60`:`1px solid ${T.border}`, borderRadius:14, padding:"16px 10px", cursor:"pointer", transition:"all .25s", textAlign:"center" }}>
                    <div style={{ fontSize:24, marginBottom:8, filter:activeType===i?"none":"grayscale(0.4)" }}>{t.icon}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:activeType===i?t.color:T.text, marginBottom:3 }}>{t.label}</div>
                    <div style={{ fontSize:8, color:activeType===i?t.color:T.textFaint, letterSpacing:"0.06em" }}>{t.temp}</div>
                  </button>
                ))}
              </div>

              {/* Active type big card */}
              {TYRE_TYPES.map((t,i) => activeType===i && (
                <div key={t.label} className="tab-in split-card" style={{ ...card, borderRadius:20, overflow:"hidden", display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:360, marginBottom:24 }}>
                  {/* Photo */}
                  <div style={{ position:"relative", overflow:"hidden", minHeight:280 }}>
                    <img src={t.img} alt={t.label+" tyre"} style={{ width:"100%", height:"100%", objectFit:"cover", filter:theme==="dark"?"brightness(0.5)":"brightness(0.72)" }} />
                    <div style={{ position:"absolute", inset:0, background:`linear-gradient(to right, transparent 40%, ${T.cardBg} 100%)` }} />
                    {/* Type badge */}
                    <div style={{ position:"absolute", top:20, left:20, background:`${t.color}dd`, borderRadius:9, padding:"7px 14px", backdropFilter:"blur(4px)" }}>
                      <span style={{ fontSize:9, color:"#fff", letterSpacing:"0.14em", fontFamily:"'JetBrains Mono',monospace" }}>{t.badge.toUpperCase()}</span>
                    </div>
                    {/* Temperature badge */}
                    <div style={{ position:"absolute", bottom:20, left:20, background:"rgba(0,0,0,0.72)", border:`1px solid ${t.color}44`, borderRadius:9, padding:"8px 12px", backdropFilter:"blur(4px)" }}>
                      <div style={{ fontSize:8, color:t.color, letterSpacing:"0.1em", marginBottom:2 }}>OPERATES AT</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#fff" }}>{t.temp}</div>
                    </div>
                    {/* Giant icon watermark */}
                    <div style={{ position:"absolute", bottom:16, right:16, fontSize:88, color:`${t.color}22`, lineHeight:1, pointerEvents:"none", userSelect:"none", fontFamily:"sans-serif" }}>{t.icon}</div>
                  </div>

                  {/* Detail */}
                  <div style={{ padding:"clamp(24px,4vw,48px)", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                    <div style={{ fontSize:9, color:t.color, letterSpacing:"0.2em", marginBottom:10 }}>TYRE TYPE {String(i+1).padStart(2,"0")}</div>
                    <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(30px,4vw,52px)", color:T.text, margin:"0 0 24px", letterSpacing:"-0.03em", lineHeight:1 }}>{t.label}</h2>

                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      <div style={{ display:"flex", gap:10, padding:"13px 15px", background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:12 }}>
                        <span style={{ color:"#10b981", fontSize:14, flexShrink:0 }}>✓</span>
                        <span style={{ fontSize:12, color:T.textMuted, lineHeight:1.75 }}>{t.pro}</span>
                      </div>
                      <div style={{ display:"flex", gap:10, padding:"13px 15px", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.18)", borderRadius:12 }}>
                        <span style={{ color:"#ef4444", fontSize:14, flexShrink:0 }}>✗</span>
                        <span style={{ fontSize:12, color:T.textMuted, lineHeight:1.75 }}>{t.con}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Other types as smaller cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))", gap:12 }}>
                {TYRE_TYPES.map((t,i) => i!==activeType && (
                  <div key={t.label} className="ir info-lift" onClick={() => { haptic("light"); setActiveType(i); }}
                    style={{ ...card, borderRadius:16, overflow:"hidden", cursor:"pointer", borderLeft:`3px solid ${t.color}44`, animationDelay:`${i*0.06}s` }}>
                    <div style={{ height:100, position:"relative", overflow:"hidden" }}>
                      <img src={t.img} alt={t.label} style={{ width:"100%", height:"100%", objectFit:"cover", filter:theme==="dark"?"brightness(0.45)":"brightness(0.7)" }} />
                      <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 30%, ${T.cardBg} 100%)` }} />
                      <div style={{ position:"absolute", top:10, left:12 }}>
                        <span style={{ fontSize:20 }}>{t.icon}</span>
                      </div>
                    </div>
                    <div style={{ padding:"12px 14px" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:T.text, marginBottom:3 }}>{t.label}</div>
                      <div style={{ fontSize:9, color:t.color, letterSpacing:"0.08em" }}>{t.temp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── WEAR GUIDE ─────────────────────────────────────────────── */}
          {activeTab === "wear" && (
            <div className="tab-in">
              <SectionHeader T={T} label="03 — WEAR GUIDE" title={<>Read<br /><span style={{color:T.accent}}>The Tread.</span></>} sub="Every wear pattern is your tyre reporting a mechanical problem. Learn to decode them before a blowout does it for you." />

              {/* Hero wear image */}
              <div className="ir" style={{ borderRadius:20, overflow:"hidden", height:"clamp(180px,28vw,280px)", position:"relative", marginBottom:32 }}>
                <img src={IMGS.wornTyre} alt="Worn tyre close-up" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 60%", filter:theme==="dark"?"brightness(0.45)":"brightness(0.65)" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.15) 60%, transparent 100%)" }} />
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", padding:"clamp(20px,4vw,48px)" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#ef4444", letterSpacing:"0.2em", marginBottom:8 }}>WEAR LEVEL SCALE · A TO F</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(22px,4vw,40px)", color:"#fff", lineHeight:1.05 }}>5 Grades.<br />One Direction.</div>
                  </div>
                </div>
              </div>

              {/* Wear level bars */}
              <div className="ir" style={{ ...card, borderRadius:20, padding:"clamp(20px,4vw,36px)", marginBottom:32 }}>
                {WEAR_LEVELS.map((w,i) => (
                  <div key={w.level} onClick={() => { haptic("light"); setExpandedWear(expandedWear===i?null:i); }}
                    style={{ cursor:"pointer", padding:"15px 0", borderBottom:i<WEAR_LEVELS.length-1?`1px solid ${T.borderFaint}`:"none", transition:"background .2s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:w.bg, border:`1px solid ${w.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:w.color }}>{w.grade}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:T.text }}>{w.level}</span>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:w.color }}>{w.depth}</span>
                        </div>
                        <div style={{ height:5, background:T.ghost, borderRadius:3, overflow:"hidden" }}>
                          <div className="bar-grow" style={{ "--bw":`${w.pct}%`, height:"100%", width:`${w.pct}%`, background:`linear-gradient(90deg,${w.color}70,${w.color})`, borderRadius:3 }} />
                        </div>
                      </div>
                      <span style={{ fontSize:9, color:T.textFaint, flexShrink:0, marginLeft:4, width:12, textAlign:"center" }}>{expandedWear===i?"▲":"▼"}</span>
                    </div>
                    {expandedWear===i && (
                      <div style={{ marginTop:14, paddingLeft:52, animation:"iIn .3s ease both" }}>
                        <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.78, margin:"0 0 10px" }}>{w.desc}</p>
                        <div style={{ display:"inline-flex", gap:8, alignItems:"center", background:w.bg, border:`1px solid ${w.border}`, borderRadius:9, padding:"8px 14px" }}>
                          <span style={{ fontSize:11, color:w.color }}>→</span>
                          <span style={{ fontSize:11, color:w.color, fontWeight:600 }}>{w.action}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Patterns section header */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${T.accent}60,transparent)` }} />
                <span style={{ fontSize:9, color:T.accent, letterSpacing:"0.2em" }}>WEAR PATTERNS & ROOT CAUSES</span>
                <div style={{ height:1, flex:1, background:`linear-gradient(270deg,${T.accent}60,transparent)` }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))", gap:14 }}>
                {PATTERNS.map((p,i) => {
                  const uc = p.urgency==="high"?"#ef4444":p.urgency==="medium"?"#f59e0b":"#10b981";
                  const ul = p.urgency==="high"?"URGENT":p.urgency==="medium"?"MODERATE":"COSMETIC";
                  return (
                    <div key={p.label} className="ir info-lift" style={{ ...card, borderRadius:18, padding:"clamp(16px,3vw,24px)", borderLeft:`3px solid ${uc}44`, animationDelay:`${i*0.07}s` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <div style={{ width:42, height:42, borderRadius:11, background:`${uc}12`, border:`1px solid ${uc}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, color:uc }}>{p.icon}</div>
                        <span style={{ fontSize:8, color:uc, background:`${uc}14`, border:`1px solid ${uc}28`, borderRadius:20, padding:"4px 10px", letterSpacing:"0.1em" }}>{ul}</span>
                      </div>
                      <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:T.text, margin:"0 0 4px" }}>{p.label}</h4>
                      <p style={{ fontSize:9, color:T.accent, letterSpacing:"0.1em", margin:"0 0 10px" }}>CAUSE: {p.cause.toUpperCase()}</p>
                      <p style={{ fontSize:11, color:T.textMuted, lineHeight:1.78, margin:"0 0 14px" }}>{p.desc}</p>
                      <div style={{ display:"flex", gap:8, padding:"10px 12px", background:`${uc}07`, border:`1px solid ${uc}1e`, borderRadius:9 }}>
                        <span style={{ fontSize:10, color:uc, flexShrink:0, marginTop:1 }}>↳</span>
                        <span style={{ fontSize:11, color:T.textMuted, lineHeight:1.65 }}><span style={{ color:uc, fontWeight:600 }}>Fix: </span>{p.fix}</span>
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
              <SectionHeader T={T} label="04 — BUYING GUIDE" title={<>Buy<br /><span style={{color:T.accent}}>With Confidence.</span></>} sub="Five questions most people never ask at a tyre shop — and why they matter before you spend a single rupee." />

              {/* Step pills */}
              <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
                {BUY_STEPS.map((s,i) => (
                  <button key={s.n} onClick={() => { haptic("light"); setActiveBuyStep(i); }}
                    style={{ background:activeBuyStep===i?`${T.accent}1e`:T.ghost, border:activeBuyStep===i?`1px solid ${T.accent}55`:`1px solid ${T.border}`, borderRadius:100, padding:"9px 16px", cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:11, color:activeBuyStep===i?T.accent:T.textFaint }}>{s.n}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:activeBuyStep===i?T.accent:T.textMuted, letterSpacing:"0.08em" }}>{s.title.toUpperCase()}</span>
                  </button>
                ))}
              </div>

              {/* Step cards */}
              {activeBuyStep===0 && (
                <BuyCard T={T} theme={theme} card={card} img={BUY_STEPS[0].img} title="Decode Your Sidewall" n="01">
                  <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.85, margin:"0 0 18px" }}>Every tyre has a code string on its sidewall. It's not decoration — it tells you exactly how to spec a replacement.</p>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, background:`${T.accent}0d`, border:`1px solid ${T.accent}2e`, borderRadius:12, padding:"16px 20px", marginBottom:18, display:"flex", flexWrap:"wrap", alignItems:"baseline", gap:3, letterSpacing:"0.04em" }}>
                    <span style={{ color:T.accent, fontWeight:700 }}>205</span>
                    <span style={{ color:T.textFaint }}>/</span>
                    <span style={{ color:T.accentMid, fontWeight:700 }}>55</span>
                    <span style={{ color:T.textFaint }}>&nbsp;R</span>
                    <span style={{ color:T.accent, fontWeight:700 }}>16</span>
                    <span style={{ color:T.textFaint }}>&nbsp;91</span>
                    <span style={{ color:T.accentMid, fontWeight:700 }}>V</span>
                  </div>
                  {[["205","Section width in mm — how wide the tyre is"],["55","Aspect ratio: sidewall height as % of width (55% of 205mm = 113mm)"],["R16","R = Radial construction · 16 = rim diameter in inches"],["91","Load index — max load per tyre (91 = 615 kg)"],["V","Speed rating — max sustained speed (V = 240 km/h)"]].map(([c,d]) => (
                    <div key={c} style={{ display:"flex", gap:12, marginBottom:10, alignItems:"flex-start" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:T.accent, minWidth:28, flexShrink:0, fontWeight:700 }}>{c}</span>
                      <span style={{ fontSize:11, color:T.textMuted, lineHeight:1.65 }}>{d}</span>
                    </div>
                  ))}
                </BuyCard>
              )}

              {activeBuyStep===1 && (
                <BuyCard T={T} theme={theme} card={card} img={BUY_STEPS[1].img} title="Verify the DOT Age" n="02">
                  <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.85, margin:"0 0 16px" }}>Tyres don't last forever — even with full tread depth. Rubber degrades from the inside and UV exposure cracks internal belts invisibly.</p>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, background:`${T.accent}0d`, border:`1px solid ${T.accent}2e`, borderRadius:10, padding:"13px 16px", marginBottom:16 }}>
                    DOT XXXX XX <span style={{ color:T.accent, fontWeight:700 }}>2224</span>
                    <span style={{ color:T.textFaint, fontSize:10, marginLeft:10 }}>← week 22, year 2024</span>
                  </div>
                  {[["Under 2 years","Ideal. Compound is fresh.",T.accent],["2–4 years","Good. Regular checks recommended.","#10b981"],["4–6 years","Ageing. Plan replacement soon.","#f59e0b"],["Over 6 years","Replace now regardless of tread.","#ef4444"]].map(([age,note,c]) => (
                    <div key={age} style={{ display:"flex", gap:12, marginBottom:10, padding:"11px 14px", background:`${c}09`, border:`1px solid ${c}22`, borderRadius:9 }}>
                      <div style={{ width:3, background:c, borderRadius:2, flexShrink:0, alignSelf:"stretch" }} />
                      <div><div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:c, marginBottom:2 }}>{age}</div><div style={{ fontSize:11, color:T.textMuted }}>{note}</div></div>
                    </div>
                  ))}
                </BuyCard>
              )}

              {activeBuyStep===2 && (
                <BuyCard T={T} theme={theme} card={card} img={BUY_STEPS[2].img} title="Match Load & Speed" n="03">
                  <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.85, margin:"0 0 16px" }}>Never fit a tyre with a lower load index or speed rating than your manufacturer's minimum. It's illegal and voids your insurance.</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                    {[["T","190 km/h","Spare / budget"],["H","210 km/h","Family saloon"],["V","240 km/h","Sports / premium"],["W/Y","270–300+","High-performance"]].map(([r,s,u]) => (
                      <div key={r} style={{ background:`${T.accent}0a`, borderRadius:11, padding:"13px 14px", border:`1px solid ${T.accent}1e` }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:T.accent }}>{r}</span>
                        <span style={{ fontSize:11, color:T.textMuted, display:"block", marginTop:3 }}>{s}</span>
                        <span style={{ fontSize:9, color:T.textFaint }}>{u}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:"13px 16px", background:`${T.accent}08`, border:`1px solid ${T.accent}22`, borderRadius:11 }}>
                    <p style={{ fontSize:11, color:T.textMuted, margin:0, lineHeight:1.7 }}>💡 <span style={{ color:T.accent }}>Pro tip:</span> The exact spec is printed on a sticker inside your driver-side door frame, or in your owner's manual.</p>
                  </div>
                </BuyCard>
              )}

              {activeBuyStep===3 && (
                <BuyCard T={T} theme={theme} card={card} img={BUY_STEPS[3].img} title="Ask These Questions" n="04">
                  <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.85, margin:"0 0 16px" }}>Good tyre shops welcome every one of these. A shop that deflects them is telling you something important about their standards.</p>
                  {["Is the DOT date within the last 2 years?","Can I see the full spec sheet for this model?","Does the price include wheel balancing?","Will you check 4-wheel alignment, not just balance?","Do you offer a free re-torque check after 50 km?","Is road-hazard or repair cover included?","Do you stock the exact OEM spec for my vehicle?"].map((q,i) => (
                    <div key={i} style={{ display:"flex", gap:12, marginBottom:11, alignItems:"flex-start" }}>
                      <div style={{ width:24, height:24, borderRadius:7, border:`1px solid ${T.accent}40`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:9, color:T.accent, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>{i+1}</span>
                      </div>
                      <span style={{ fontSize:11, color:T.textMuted, lineHeight:1.7 }}>{q}</span>
                    </div>
                  ))}
                </BuyCard>
              )}

              {activeBuyStep===4 && (
                <BuyCard T={T} theme={theme} card={card} img={BUY_STEPS[4].img} title="Budget vs Premium" n="05">
                  <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.85, margin:"0 0 16px" }}>Independent testing consistently shows a <span style={{ color:T.text, fontWeight:600 }}>5–8 metre longer wet stopping distance</span> from 80 km/h between budget and premium tyres. That's a car length.</p>
                  {[{tier:"Budget",brands:"Nankang, Falken, Kumho",note:"Fine for low-mileage, urban use. Some corner-cutting on compound longevity.",c:"#10b981",pct:55},{tier:"Mid-range",brands:"Hankook, Toyo, Cooper",note:"Best value. Near-premium wet performance at roughly 70% of the cost.",c:"#f59e0b",pct:78},{tier:"Premium",brands:"Michelin, Continental, Pirelli",note:"Best wet braking, longest-lasting compound, highest batch consistency.",c:T.accent,pct:100}].map(({tier,brands,note,c,pct}) => (
                    <div key={tier} style={{ marginBottom:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:T.text }}>{tier}</span>
                        <span style={{ fontSize:9, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{pct}% score</span>
                      </div>
                      <div style={{ height:5, background:T.ghost, borderRadius:3, marginBottom:7, overflow:"hidden" }}>
                        <div className="bar-grow" style={{ "--bw":`${pct}%`, height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${c}80,${c})`, borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:10, color:T.textFaint, marginBottom:3 }}>{brands}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>{note}</div>
                    </div>
                  ))}
                </BuyCard>
              )}

              {/* Prev / Next nav */}
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={() => { haptic("light"); setActiveBuyStep(s => Math.max(0,s-1)); }} disabled={activeBuyStep===0}
                  style={{ flex:1, padding:"14px", borderRadius:12, cursor:activeBuyStep===0?"not-allowed":"pointer", background:T.ghost, border:`1px solid ${T.border}`, color:activeBuyStep===0?T.textFaint:T.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.08em", transition:"all .2s" }}>← PREV</button>
                <button onClick={() => { haptic("medium"); setActiveBuyStep(s => Math.min(BUY_STEPS.length-1,s+1)); }} disabled={activeBuyStep===BUY_STEPS.length-1}
                  style={{ flex:1, padding:"14px", borderRadius:12, cursor:activeBuyStep===BUY_STEPS.length-1?"not-allowed":"pointer", background:activeBuyStep<BUY_STEPS.length-1?`linear-gradient(135deg,${T.accentMid},${T.accentDark})`:T.ghost, border:"none", color:activeBuyStep<BUY_STEPS.length-1?"white":T.textFaint, fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:11, letterSpacing:"0.08em", transition:"all .2s" }}>NEXT →</button>
              </div>
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM CTA STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ position:"relative", overflow:"hidden", minHeight:240 }}>
          <img src={IMGS.carOnRoad} alt="Car on open road" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", filter:theme==="dark"?"brightness(0.22) saturate(0.6)":"brightness(0.32) saturate(0.6)" }} />
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(to right, ${T.accent}30 0%, transparent 55%)` }} />
          <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.scanline} 1px,transparent 1px),linear-gradient(90deg,${T.scanline} 1px,transparent 1px)`, backgroundSize:"48px 48px" }} />
          <div style={{ position:"relative", zIndex:2, maxWidth:1100, margin:"0 auto", padding:"clamp(48px,8vh,88px) clamp(16px,5vw,48px)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:24 }}>
            <div>
              <p style={{ fontSize:9, color:T.accent, letterSpacing:"0.22em", margin:"0 0 12px" }}>READY TO DIAGNOSE?</p>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(24px,4vw,48px)", color:"#fff", margin:0, letterSpacing:"-0.03em", lineHeight:1.1 }}>
                Now you know what to look for.<br />
                <span style={{ color:T.accent }}>Let AI do the rest.</span>
              </h3>
            </div>
            <div style={{ background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`, borderRadius:13, padding:"15px 32px", cursor:"pointer", boxShadow:"0 0 40px rgba(249,115,22,0.5)", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, letterSpacing:"0.06em", color:"white" }}>
              ▶ RUN DIAGNOSTIC
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${T.borderFaint}`, padding:"clamp(20px,3vh,32px) clamp(16px,5vw,48px)", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10, transition:"background .4s" }}>
          <span style={{ fontSize:9, color:T.textFaint, letterSpacing:"0.12em" }}>STRADA · TYRE INTELLIGENCE HUB</span>
          <span style={{ fontSize:9, color:T.textFaint, letterSpacing:"0.08em" }}>EDUCATIONAL GUIDE · NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
        </div>

      </div>
    </InfoThemeContext.Provider>
  );
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────
function SectionHeader({ T, label, title, sub }) {
  return (
    <div style={{ marginBottom:"clamp(28px,5vh,60px)" }}>
      <p style={{ fontSize:9, color:T.accent, letterSpacing:"0.24em", margin:"0 0 12px" }}>{label}</p>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(36px,6vw,76px)", color:T.text, letterSpacing:"-0.04em", margin:"0 0 14px", lineHeight:0.9 }}>{title}</h2>
      <p style={{ fontSize:13, color:T.textMuted, lineHeight:1.82, margin:0, maxWidth:540 }}>{sub}</p>
    </div>
  );
}

function BuyCard({ img, title, n, T, theme, card, children }) {
  return (
    <div className="tab-in" style={{ ...card, borderRadius:20, overflow:"hidden", marginBottom:0 }}>
      {/* Image header */}
      <div style={{ position:"relative", height:"clamp(160px,22vw,240px)", overflow:"hidden" }}>
        <img src={img} alt={title} style={{ width:"100%", height:"100%", objectFit:"cover", filter:theme==="dark"?"brightness(0.42) saturate(0.7)":"brightness(0.58) saturate(0.8)" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 25%, "+T.cardBg+" 100%)" }} />
        <div style={{ position:"absolute", bottom:22, left:26 }}>
          <span style={{ fontSize:9, color:T.accent, letterSpacing:"0.2em", display:"block", marginBottom:5 }}>STEP {n}</span>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(20px,3vw,32px)", color:T.text, margin:0, letterSpacing:"-0.02em" }}>{title}</h3>
        </div>
        <div style={{ position:"absolute", top:12, right:18, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:88, color:`${T.accent}14`, lineHeight:1, userSelect:"none" }}>{n}</div>
      </div>
      <div style={{ padding:"clamp(20px,4vw,40px)" }}>{children}</div>
    </div>
  );
}

function CrossSection({ T, isDark }) {
  const acc = T.accent;
  const t1  = isDark?"#2c2c2c":"#e2d8cc", t2=isDark?"#1f1f1f":"#d4c8b8", t3=isDark?"#171717":"#c4b8a8";
  const rim = isDark?"#3a3a3a":"#c0b0a0", hub=isDark?"#4a4a4a":"#a09080";
  return (
    <div style={{ width:"100%", overflowX:"auto" }}>
      <svg viewBox="0 0 600 280" style={{ width:"100%", minWidth:300, maxHeight:230 }} role="img" aria-label="Tyre cross-section diagram">
        <title>Tyre cross-section</title>
        {/* Outer tyre */}
        <ellipse cx="300" cy="140" rx="128" ry="128" fill={t1} stroke={`${acc}44`} strokeWidth="1.5" />
        {/* Tread dashes */}
        <ellipse cx="300" cy="140" rx="128" ry="128" fill="none" stroke={acc} strokeWidth="14" strokeDasharray="10 8" opacity="0.15" />
        {/* Sidewall */}
        <ellipse cx="300" cy="140" rx="113" ry="113" fill={t2} />
        {/* Belt */}
        <ellipse cx="300" cy="140" rx="97" ry="97" fill={t3} />
        {/* Bead zone */}
        <ellipse cx="300" cy="140" rx="82" ry="82" fill={isDark?"#111":"#b8a898"} stroke={`${acc}55`} strokeWidth="2" />
        {/* Rim */}
        <ellipse cx="300" cy="140" rx="70" ry="70" fill={rim} stroke={`${acc}66`} strokeWidth="1.5" />
        <ellipse cx="300" cy="140" rx="48" ry="48" fill={hub} />
        <ellipse cx="300" cy="140" rx="26" ry="26" fill={isDark?"#555":"#909090"} />
        <circle  cx="300" cy="140" r="10" fill={acc} opacity="0.9" />
        {/* Spokes */}
        {[0,40,80,120,160,200,240,280,320].map(a => { const r=a*Math.PI/180; return <line key={a} x1={300+26*Math.cos(r)} y1={140+26*Math.sin(r)} x2={300+67*Math.cos(r)} y2={140+67*Math.sin(r)} stroke={isDark?"#555":"#a89888"} strokeWidth="2" />; })}
        {/* Tread grooves */}
        {[-3,-1.5,0,1.5,3].map(n => { const a=n*24*Math.PI/180-Math.PI/2; return <line key={n} x1={300+115*Math.cos(a)} y1={140+115*Math.sin(a)} x2={300+129*Math.cos(a)} y2={140+129*Math.sin(a)} stroke={acc} strokeWidth="3" strokeLinecap="round" opacity="0.7" />; })}

        {/* Callout lines and labels — right side */}
        {[{label:"TREAD",ax:412,ay:72,lx:456,ly:58},{label:"SIDEWALL",ax:398,ay:112,lx:456,ly:108},{label:"BEAD",ax:374,ay:155,lx:456,ly:160},{label:"RIM",ax:358,ay:195,lx:456,ly:200}].map(({label,ax,ay,lx,ly}) => (
          <g key={label}>
            <line x1={ax} y1={ay} x2={lx} y2={ly} stroke={`${acc}50`} strokeWidth="0.8" strokeDasharray="4 3" />
            <circle cx={ax} cy={ay} r="3.5" fill={acc} opacity="0.65" />
            <text x={lx+6} y={ly+4} fill={acc} fontSize="10" fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em" dominantBaseline="middle">{label}</text>
          </g>
        ))}
        {/* Left — DOT */}
        <line x1={190} y1={72} x2={146} y2={58} stroke={`${acc}50`} strokeWidth="0.8" strokeDasharray="4 3" />
        <circle cx={190} cy={72} r="3.5" fill={acc} opacity="0.65" />
        <text x={12} y={62} fill={acc} fontSize="10" fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em">DOT CODE</text>
      </svg>
    </div>
  );
}