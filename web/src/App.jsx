import { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from "react";

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });
const useTheme = () => useContext(ThemeContext);

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

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
const DARK = {
  bg: "#080808", surface: "rgba(16,16,16,0.92)", panel: "rgba(12,12,12,0.75)",
  ghost: "rgba(255,255,255,0.025)", text: "#ffffff", textSub: "rgba(255,255,255,0.38)",
  textMuted: "rgba(255,255,255,0.2)", textFaint: "rgba(255,255,255,0.12)",
  border: "rgba(255,255,255,0.07)", borderFaint: "rgba(255,255,255,0.04)",
  accent: "#f97316", accentMid: "#fb923c", accentDark: "#c2410c",
  cardBorder: "rgba(255,255,255,0.06)",
  cardShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  panelBorder: "rgba(255,255,255,0.07)",
  panelShadow: "0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.5)",
  gridLine: "rgba(255,255,255,0.011)", noiseOpacity: 0.025,
  orbColors: ["rgba(249,115,22,0.09)", "rgba(234,88,12,0.07)", "rgba(251,146,60,0.05)", "rgba(249,115,22,0.04)"],
};

const LIGHT = {
  bg: "#faf7f4", surface: "rgba(255,252,249,0.97)", panel: "rgba(255,252,249,0.88)",
  ghost: "rgba(0,0,0,0.03)", text: "#1a1008", textSub: "rgba(26,16,8,0.52)",
  textMuted: "rgba(26,16,8,0.38)", textFaint: "rgba(26,16,8,0.2)",
  border: "rgba(0,0,0,0.07)", borderFaint: "rgba(0,0,0,0.04)",
  accent: "#ea6500", accentMid: "#f97316", accentDark: "#c2410c",
  cardBorder: "rgba(0,0,0,0.07)",
  cardShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
  panelBorder: "rgba(0,0,0,0.08)",
  panelShadow: "0 0 0 0.5px rgba(0,0,0,0.04) inset, 0 8px 40px rgba(0,0,0,0.08)",
  gridLine: "rgba(0,0,0,0.018)", noiseOpacity: 0.018,
  orbColors: ["rgba(249,115,22,0.07)", "rgba(234,88,12,0.05)", "rgba(251,146,60,0.04)", "rgba(249,115,22,0.03)"],
};

function useTokens() { const { theme } = useTheme(); return theme === "dark" ? DARK : LIGHT; }

function useG() {
  const T = useTokens();
  return {
    panel: { background: T.panel, backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)", border: `1px solid ${T.panelBorder}`, boxShadow: T.panelShadow },
    card: { background: T.surface, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow },
    ghost: { background: T.ghost, border: `1px solid ${T.border}` },
  };
}

// ─── HAPTIC HELPER ────────────────────────────────────────────────────────────
function haptic(type = "light") {
  try {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(type === "light" ? 8 : type === "medium" ? 18 : 35);
    }
  } catch (_) {}
}

// ─── LEAFLET LOADER (singleton promise — only loads once) ─────────────────────
let leafletLoadPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }
    if (document.getElementById("leaflet-js")) {
      // Script tag exists but may not have fired onload yet — poll
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); resolve(window.L); } }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error("Leaflet load timeout")); }, 10000);
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

// ─── OVERPASS FETCH WITH RETRY + FALLBACK MIRROR ─────────────────────────────
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function fetchOverpass(query, attempt = 0) {
  const url = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (attempt < OVERPASS_ENDPOINTS.length - 1) {
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      return fetchOverpass(query, attempt + 1);
    }
    throw err;
  }
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
::selection{background:rgba(249,115,22,0.3);color:#fff}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(249,115,22,0.35);border-radius:2px}
body{overflow-x:hidden;-webkit-font-smoothing:antialiased;font-family:'JetBrains Mono',monospace}
.safe-bottom{padding-bottom:env(safe-area-inset-bottom)}

#strada-cursor{position:fixed;top:0;left:0;pointer-events:none;z-index:9999;width:12px;height:12px;border-radius:50%;background:#f97316;mix-blend-mode:difference;transform:translate(-50%,-50%);will-change:transform;transition:width .2s,height .2s}
#strada-cursor-ring{position:fixed;top:0;left:0;pointer-events:none;z-index:9998;width:36px;height:36px;border-radius:50%;border:1px solid rgba(249,115,22,0.45);transform:translate(-50%,-50%);will-change:transform;transition:width .3s,height .3s,border-color .2s}
@media(max-width:768px){#strada-cursor,#strada-cursor-ring{display:none}}

/* ── DESKTOP ANIMATIONS ── */
@media(min-width:769px){
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
  @keyframes rippleOut{0%{transform:scale(0);opacity:.35}100%{transform:scale(4);opacity:0}}

  .strada-reveal{opacity:0;transform:translateY(30px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
  .strada-reveal.visible{opacity:1;transform:translateY(0)}
  .shimmer-text{background:linear-gradient(90deg,#f97316 0%,#fb923c 20%,#fff 50%,#fb923c 80%,#f97316 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
  .shimmer-text-light{background:linear-gradient(90deg,#ea6500 0%,#f97316 20%,#1a1008 50%,#f97316 80%,#ea6500 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
  .lift-card{transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s,border-color .3s}
  .lift-card:hover{transform:translateY(-5px) scale(1.008);box-shadow:0 28px 64px rgba(0,0,0,.25),0 0 0 1px rgba(249,115,22,.18)!important}
  .mag-btn{position:relative;overflow:hidden;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s}
  .mag-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent);opacity:0;transition:opacity .3s}
  .mag-btn:hover::before{opacity:1}
  .mag-btn:active{transform:scale(.97)!important}
  .card-anim{animation:cardReveal .55s cubic-bezier(.16,1,.3,1) both}
  .status-anim{animation:statusPop .35s cubic-bezier(.16,1,.3,1) both}
  .hero-radar-wrap{animation:tyreFloat 4s ease-in-out infinite}
  .glow-pulse-anim{animation:glowPulse 3s ease-in-out infinite}
  .border-flow-anim{animation:borderFlow 4s ease-in-out infinite}
  .dot-pulse{animation:pulse 2.2s ease-in-out infinite}
  .hero-badge{animation:fadeIn 0.8s ease forwards;opacity:0;animation-delay:0.05s}
  .hero-title-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .18s both}
  .hero-desc-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .3s both}
  .hero-buttons-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .42s both}
  .hero-stats-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .55s both}
  .hero-radar-outer{animation:fadeIn 1.6s ease .75s both}
  .data-stream{animation:dataStream .6s ease var(--delay,0s) both}
  .report-dot-pulse{animation:pulse 2s infinite}
  .hero-btn-glow{animation:glowPulse 3.5s ease-in-out infinite}
}

/* ── MOBILE ANIMATIONS (GPU-friendly) ── */
@media(max-width:768px){
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes cardReveal{from{opacity:0}to{opacity:1}}
  @keyframes statusPop{from{opacity:0}to{opacity:1}}
  @keyframes rippleOut{0%{transform:scale(0);opacity:.25}100%{transform:scale(3.5);opacity:0}}
  @keyframes touchPress{0%{transform:scale(1)}50%{transform:scale(0.965)}100%{transform:scale(1)}}
  @keyframes swipeHint{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

  .strada-reveal{opacity:0;transition:opacity .5s ease}
  .strada-reveal.visible{opacity:1;transform:none}
  .shimmer-text{background:linear-gradient(90deg,#f97316,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .shimmer-text-light{background:linear-gradient(90deg,#ea6500,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .lift-card{transition:none}
  .mag-btn{position:relative;overflow:hidden;transition:transform .12s cubic-bezier(.16,1,.3,1),opacity .12s}
  .mag-btn:active{transform:scale(0.96)!important;opacity:.92}
  .hero-radar-wrap,.glow-pulse-anim,.border-flow-anim,.hero-btn-glow{animation:none}
  .dot-pulse{animation:pulse 2.5s ease-in-out infinite}
  .hero-badge{animation:fadeIn 0.4s ease forwards}
  .hero-title-wrap{animation:fadeIn 0.5s ease .1s both}
  .hero-desc-wrap{animation:fadeIn 0.5s ease .2s both}
  .hero-buttons-wrap{animation:fadeIn 0.5s ease .3s both}
  .hero-stats-wrap{animation:fadeIn 0.5s ease .4s both}
  .hero-radar-outer{animation:fadeIn 0.6s ease .5s both}
  .data-stream{animation:none;opacity:1}
  .report-dot-pulse{animation:pulse 2.5s ease-in-out infinite}
  .card-anim{animation:cardReveal .3s ease both}
  .status-anim{animation:statusPop .2s ease both}

  /* iOS-style tap highlight suppression — we handle it ourselves */
  *{-webkit-tap-highlight-color:transparent}

  /* Touch press state for interactive cards */
  .touch-card{transition:transform .1s cubic-bezier(.16,1,.3,1),box-shadow .1s}
  .touch-card:active{transform:scale(0.975)!important;box-shadow:0 2px 8px rgba(0,0,0,0.15)!important}

  /* Spring-back for primary buttons — iOS feel */
  .touch-btn{transition:transform .12s cubic-bezier(.16,1,.3,1)}
  .touch-btn:active{transform:scale(0.94)!important}
}

/* ── RIPPLE ── */
.ripple{position:absolute;border-radius:50%;background:rgba(249,115,22,0.28);pointer-events:none;animation:rippleOut 0.55s ease-out forwards}

.gradcam-img{mix-blend-mode:multiply;filter:saturate(1.6) contrast(1.1)}

/* ── RESPONSIVE LAYOUT ── */
@media(max-width:768px){
  button,a,[role=button]{min-height:44px;min-width:44px}
  .hero-title{font-size:clamp(48px,14vw,92px)!important;letter-spacing:-0.05em!important}
  .hero-section{padding:80px 16px 48px!important}
  .hero-buttons{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
  .hero-buttons button,.hero-buttons a{width:100%!important;justify-content:center!important}
  .hero-stats{gap:0!important;margin-top:40px!important}
  .hero-stats>div{padding:0 clamp(10px,3vw,20px)!important}
  .hero-radar{width:min(260px,78vw)!important;height:min(260px,78vw)!important;margin-top:40px!important}
}
@media(max-width:480px){
  .hero-title{font-size:clamp(40px,13.5vw,78px)!important}
  .hero-badge{padding:6px 12px!important;font-size:8px!important}
  .hero-desc{font-size:12px!important;padding:0 10px!important}
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

body.light-mode{background:#faf7f4;color:#1a1008;cursor:auto}
body.dark-mode{background:#080808;color:#fff;cursor:none}
@media(max-width:768px){body.dark-mode{cursor:auto}}

/* ══ PRINT STYLES — this is what actually prints ══ */
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  #strada-cursor,#strada-cursor-ring,.no-print,#strada-report-overlay .no-print{display:none!important}
  body{background:#fff!important;color:#111!important;overflow:visible!important;font-family:sans-serif!important}

  /* Hide the screen UI completely, show only the print template */
  body > *:not(#print-root){display:none!important}
  #print-root{display:block!important;position:static!important;visibility:visible!important}

  /* Page setup */
  @page{size:A4;margin:18mm 14mm}

  .print-page{page-break-after:always;padding:0}
  .print-page:last-child{page-break-after:avoid}

  /* Typography resets for print */
  .print-h1{font-family:sans-serif;font-weight:800;font-size:22pt;letter-spacing:-0.02em;color:#111;margin:0}
  .print-h2{font-family:sans-serif;font-weight:700;font-size:13pt;color:#111;margin:0 0 10px}
  .print-h3{font-family:sans-serif;font-weight:600;font-size:10pt;color:#444;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.06em}
  .print-body{font-family:sans-serif;font-size:9pt;color:#333;line-height:1.65}
  .print-label{font-family:sans-serif;font-size:7pt;color:#888;text-transform:uppercase;letter-spacing:0.1em}
  .print-value{font-family:sans-serif;font-weight:700;font-size:18pt;line-height:1.1}
  .print-small{font-family:sans-serif;font-size:8pt;color:#666}

  .print-divider{border:none;border-top:0.75pt solid #e5e7eb;margin:10px 0}

  /* Grid helpers */
  .print-row{display:flex;gap:12px;margin-bottom:12px}
  .print-col{flex:1;border:0.75pt solid #e5e7eb;border-radius:5pt;padding:10px 12px}
  .print-col-wide{flex:2;border:0.75pt solid #e5e7eb;border-radius:5pt;padding:10px 12px}

  /* Urgency badge */
  .print-badge-high{background:#fef2f2!important;border:1pt solid #fca5a5!important;color:#dc2626!important;padding:8px 12px;border-radius:5pt;margin-bottom:12px}
  .print-badge-medium{background:#fffbeb!important;border:1pt solid #fcd34d!important;color:#d97706!important;padding:8px 12px;border-radius:5pt;margin-bottom:12px}
  .print-badge-low{background:#f0fdf4!important;border:1pt solid #6ee7b7!important;color:#059669!important;padding:8px 12px;border-radius:5pt;margin-bottom:12px}

  /* Tread bar */
  .print-bar-track{height:5pt;background:#f3f4f6!important;border-radius:3pt;overflow:hidden;margin-top:5px}
  .print-bar-fill{height:100%;border-radius:3pt}

  .print-green-text{color:#059669!important}
  .print-yellow-text{color:#d97706!important}
  .print-red-text{color:#dc2626!important}
  .print-orange-text{color:#ea580c!important}

  /* Score breakdown table */
  .print-score-row{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:0.5pt solid #f3f4f6}
  .print-score-row:last-child{border-bottom:none}

  /* Footer */
  .print-footer{position:fixed;bottom:0;left:0;right:0;padding:6pt 14mm;border-top:0.5pt solid #e5e7eb;display:flex;justify-content:space-between;font-family:sans-serif;font-size:7pt;color:#aaa}
}
`;

// ─── RIPPLE EFFECT HOOK ───────────────────────────────────────────────────────
function useRipple() {
  return useCallback((e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.4;
    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);
}

// ─── CURSOR ───────────────────────────────────────────────────────────────────
function Cursor() {
  const c = useRef(null), r = useRef(null), pos = useRef({ x: 0, y: 0 }), raf = useRef(null);
  useEffect(() => {
    const el = c.current, rl = r.current;
    if (!el || !rl) return;
    const tick = () => { const { x, y } = pos.current; el.style.transform = `translate(calc(${x}px - 50%),calc(${y}px - 50%))`; rl.style.transform = `translate(calc(${x}px - 50%),calc(${y}px - 50%))`; raf.current = null; };
    const move = e => { pos.current = { x: e.clientX, y: e.clientY }; if (!raf.current) raf.current = requestAnimationFrame(tick); };
    const over = e => { if (e.target.closest("button,a,[role=button],.mag-btn")) { el.style.width = "20px"; el.style.height = "20px"; rl.style.width = "56px"; rl.style.height = "56px"; rl.style.borderColor = "rgba(249,115,22,0.8)"; } };
    const out = () => { el.style.width = "12px"; el.style.height = "12px"; rl.style.width = "36px"; rl.style.height = "36px"; rl.style.borderColor = "rgba(249,115,22,0.45)"; };
    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    document.addEventListener("mouseout", out, { passive: true });
    return () => { window.removeEventListener("mousemove", move); document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  return <><div id="strada-cursor" ref={c} style={{ left: 0, top: 0 }} /><div id="strada-cursor-ring" ref={r} style={{ left: 0, top: 0 }} /></>;
}

function Noise() {
  const T = useTokens();
  return <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none", opacity: T.noiseOpacity, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "256px 256px" }} />;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const T = useTokens();
  const isDark = theme === "dark";
  const ripple = useRipple();
  return (
    <button onClick={e => { haptic("light"); ripple(e); toggleTheme(); }} title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ width: 40, height: 22, borderRadius: 11, border: `1px solid ${isDark ? "rgba(249,115,22,0.3)" : "rgba(234,101,0,0.3)"}`, background: isDark ? "rgba(249,115,22,0.1)" : "rgba(234,101,0,0.12)", cursor: "pointer", position: "relative", transition: "background .3s, border .3s", flexShrink: 0, overflow: "hidden" }} aria-label="Toggle theme">
      <div style={{ position: "absolute", top: 2, left: isDark ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#c2410c)", transition: "left .25s cubic-bezier(.16,1,.3,1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>{isDark ? "☽" : "☀"}</div>
    </button>
  );
}

function Orbs({ page }) {
  const [isMobile, setIsMobile] = useState(false);
  const T = useTokens();
  useEffect(() => { const check = () => setIsMobile(window.innerWidth <= 768); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);
  if (isMobile) return <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${T.orbColors[0]} 0%, transparent 70%)` }} />;
  const orbs = page === "landing"
    ? [{ x: "15%", y: "22%", s: 640, c: T.orbColors[0], b: 150, a: "orbFloat1 20s ease-in-out infinite" }, { x: "82%", y: "14%", s: 520, c: T.orbColors[1], b: 130, a: "orbFloat2 24s ease-in-out infinite" }, { x: "58%", y: "78%", s: 420, c: T.orbColors[2], b: 110, a: "orbFloat3 17s ease-in-out infinite" }, { x: "92%", y: "65%", s: 300, c: T.orbColors[3], b: 90, a: "orbFloat1 28s ease-in-out infinite reverse" }]
    : [{ x: "85%", y: "8%", s: 420, c: T.orbColors[0], b: 110, a: "orbFloat2 22s ease-in-out infinite" }, { x: "5%", y: "55%", s: 360, c: T.orbColors[1], b: 90, a: "orbFloat3 19s ease-in-out infinite" }];
  return (
    <div className="no-print" style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {orbs.map((o, i) => <div key={i} style={{ position: "absolute", left: o.x, top: o.y, width: o.s * 2, height: o.s * 2, transform: "translate(-50%,-50%)", background: `radial-gradient(circle, ${o.c} 0%, transparent 65%)`, filter: `blur(${o.b}px)`, animation: o.a, willChange: "transform" }} />)}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.gridLine} 1px,transparent 1px),linear-gradient(90deg,${T.gridLine} 1px,transparent 1px)`, backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%,transparent 35%,rgba(0,0,0,0.25) 100%)" }} />
    </div>
  );
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll(".strada-reveal:not(.visible)");
    if (!items.length) return;
    const io = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }); }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── DIAGNOSTIC HERO ──────────────────────────────────────────────────────────
function DiagnosticHero() {
  const [scanAngle, setScanAngle] = useState(0);
  const [pings, setPings] = useState([]);
  const [dataLines, setDataLines] = useState([]);
  const rafRef = useRef(null), angleRef = useRef(0), pingIdRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const T = useTokens();
  useEffect(() => { const check = () => setIsMobile(window.innerWidth < 640); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);
  useEffect(() => {
    if (isMobile) {
      const iv = setInterval(() => { angleRef.current = (angleRef.current + 2.5) % 360; setScanAngle(angleRef.current); }, 50);
      const piv = setInterval(() => { const a = angleRef.current * Math.PI / 180, r = 60 + Math.random() * 55; setPings(p => [...p.slice(-3), { id: pingIdRef.current++, x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) }]); }, 1600);
      return () => { clearInterval(iv); clearInterval(piv); };
    }
    let lastPing = 0;
    const tick = t => { angleRef.current = (angleRef.current + 0.8) % 360; setScanAngle(angleRef.current); if (t - lastPing > 900) { const a = angleRef.current * Math.PI / 180, r = 60 + Math.random() * 55; setPings(p => [...p.slice(-4), { id: pingIdRef.current++, x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) }]); lastPing = t; } rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    const iv = setInterval(() => setDataLines(Array.from({ length: 4 }, (_, i) => ({ key: Math.random(), value: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, "0").toUpperCase()}`, label: ["TREAD", "WEAR", "DEPTH", "AGE"][i], delay: i * 0.12 }))), 1200);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(iv); };
  }, [isMobile]);
  const rad = scanAngle * Math.PI / 180, sweepX = 150 + 120 * Math.cos(rad), sweepY = 150 + 120 * Math.sin(rad);
  const rings = [40, 70, 100, 125], accent = T.accent;
  return (
    <div className="hero-radar hero-radar-wrap" style={{ position: "relative", width: "min(340px,82vw)", height: "min(340px,82vw)", margin: "0 auto" }}>
      {!isMobile && <div className="glow-pulse-anim" style={{ position: "absolute", inset: "-20%", borderRadius: "50%", background: `radial-gradient(circle, ${T.orbColors[0]} 0%, transparent 70%)`, filter: "blur(24px)" }} />}
      <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%"><stop offset="0%" stopColor={T === LIGHT ? "rgba(255,250,245,0.97)" : "rgba(20,20,20,0.95)"} /><stop offset="100%" stopColor={T === LIGHT ? "rgba(250,247,244,0.99)" : "rgba(8,8,8,0.98)"} /></radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="strongGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="radarClip"><circle cx="150" cy="150" r="128" /></clipPath>
        </defs>
        <circle cx="150" cy="150" r="130" fill="url(#radarBg)" stroke={`${accent}33`} strokeWidth="1.5" />
        {rings.map((r, i) => <circle key={i} cx="150" cy="150" r={r} fill="none" stroke={`${accent}${i === rings.length - 1 ? "22" : "11"}`} strokeWidth="0.8" strokeDasharray={i === rings.length - 1 ? "none" : "4 4"} />)}
        {[0, 45, 90, 135].map(a => { const aR = a * Math.PI / 180; return <line key={a} x1={150 + 8 * Math.cos(aR)} y1={150 + 8 * Math.sin(aR)} x2={150 + 125 * Math.cos(aR)} y2={150 + 125 * Math.sin(aR)} stroke={T === LIGHT ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"} strokeWidth="0.6" />; })}
        <g clipPath="url(#radarClip)">
          <path d={`M 150 150 L ${150 + 125 * Math.cos(rad - 0.52)} ${150 + 125 * Math.sin(rad - 0.52)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill={`${accent}11`} />
          <path d={`M 150 150 L ${150 + 125 * Math.cos(rad - 0.22)} ${150 + 125 * Math.sin(rad - 0.22)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill={`${accent}1e`} />
        </g>
        <line x1="150" y1="150" x2={sweepX} y2={sweepY} stroke={`${accent}d9`} strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" />
        {pings.map(p => <g key={p.id}><circle cx={p.x} cy={p.y} r="3.5" fill={accent} opacity="0.9" filter="url(#strongGlow)" />{!isMobile && <circle cx={p.x} cy={p.y} r="7" fill="none" stroke={`${accent}66`} strokeWidth="1" style={{ animation: "radarPing 1.2s ease-out forwards" }} />}</g>)}
        <g transform="translate(150,150)">
          <ellipse cx="0" cy="0" rx="28" ry="28" fill="none" stroke={`${accent}80`} strokeWidth="6" />
          <ellipse cx="0" cy="0" rx="16" ry="16" fill={T === LIGHT ? "rgba(250,247,244,0.9)" : "rgba(14,14,14,0.9)"} stroke={`${accent}59`} strokeWidth="2" />
          <circle cx="0" cy="0" r="4" fill={accent} opacity="0.9" />
          {[0, 60, 120, 180, 240, 300].map(a => { const aR = a * Math.PI / 180; return <line key={a} x1={5 * Math.cos(aR)} y1={5 * Math.sin(aR)} x2={14 * Math.cos(aR)} y2={14 * Math.sin(aR)} stroke={`${accent}99`} strokeWidth="1.5" strokeLinecap="round" />; })}
        </g>
        {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={150 + 127 * Math.cos(a)} y1={150 + 127 * Math.sin(a)} x2={150 + 131 * Math.cos(a)} y2={150 + 131 * Math.sin(a)} stroke={`${accent}66`} strokeWidth="1.5" />; })}
        <circle cx="150" cy="150" r="130" fill="none" stroke={`${accent}40`} strokeWidth="1" />
      </svg>
      {!isMobile && (
        <div style={{ position: "absolute", top: "4%", right: "-2%", display: "flex", flexDirection: "column", gap: 5, fontFamily: "'JetBrains Mono',monospace" }}>
          {dataLines.map(l => <div key={l.key} className="data-stream" style={{ "--delay": `${l.delay}s`, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 8, color: T.textMuted, letterSpacing: "0.12em" }}>{l.label}</span><span style={{ fontSize: 9, color: T.accent }}>{l.value}</span></div>)}
        </div>
      )}
      <div style={{ position: "absolute", bottom: "4%", left: "2%", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
        <div className="dot-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent }} />SCANNING
      </div>
    </div>
  );
}

// ─── SHOP LOCATOR ─────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [2, 5, 10, 20];

function ShopLocator() {
  const [status, setStatus] = useState("idle");
  const [shops, setShops] = useState([]);
  const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState(null);
  const [selected, setSelected] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [retrying, setRetrying] = useState(false);
  const mapContainerRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const coordsRef = useRef(null); // stable ref so map effect never goes stale
  const shopsRef = useRef([]);
  const G = useG(), T = useTokens();
  const ripple = useRipple();

  // Keep refs in sync
  useEffect(() => { coordsRef.current = coords; }, [coords]);
  useEffect(() => { shopsRef.current = shops; }, [shops]);

  const fetchShops = useCallback(async (lat, lng, rad) => {
    setStatus("loading"); setShops([]); setSelected(null); setRetrying(false);
    const r = rad * 1000;
    const query = `[out:json][timeout:30];(node["shop"="tyres"](around:${r},${lat},${lng});node["shop"="car_repair"](around:${r},${lat},${lng});node["amenity"="car_repair"]["service:tyres"="yes"](around:${r},${lat},${lng});way["shop"="tyres"](around:${r},${lat},${lng});way["shop"="car_repair"](around:${r},${lat},${lng});relation["shop"="tyres"](around:${r},${lat},${lng}););out center 25;`;
    try {
      const data = await fetchOverpass(query);
      const results = (data.elements || [])
        .map(el => ({
          id: el.id, name: el.tags?.name || "Tyre / Auto Shop",
          lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon,
          phone: el.tags?.phone || el.tags?.["contact:phone"] || null,
          hours: el.tags?.opening_hours || null,
          addr: [el.tags?.["addr:housenumber"], el.tags?.["addr:street"], el.tags?.["addr:city"]].filter(Boolean).join(" ") || null,
          website: el.tags?.website || el.tags?.["contact:website"] || null,
          dist: haversine(lat, lng, el.lat ?? el.center?.lat, el.lon ?? el.center?.lon),
        }))
        .filter(s => s.lat && s.lng && isFinite(s.dist))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 15);
      setShops(results);
      setStatus("done");
    } catch (err) {
      console.error("Overpass error:", err);
      setErrMsg("All map servers failed. Please check your connection and try again.");
      setStatus("error");
    }
  }, []);

  const locate = useCallback(() => {
    setStatus("locating");
    if (!navigator.geolocation) { setErrMsg("Geolocation is not supported by your browser."); setStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { const { latitude: lat, longitude: lng } = pos.coords; setCoords({ lat, lng }); fetchShops(lat, lng, radius); },
      err => {
        if (err.code === 1) setStatus("denied");
        else if (err.code === 2) { setErrMsg("Location unavailable. Make sure GPS is enabled."); setStatus("error"); }
        else { setErrMsg("Location request timed out. Please try again."); setStatus("error"); }
      },
      { timeout: 12000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, [radius, fetchShops]);

  // Re-fetch when radius changes (only if we already have coords)
  const prevRadius = useRef(radius);
  useEffect(() => {
    if (prevRadius.current !== radius && coordsRef.current) {
      prevRadius.current = radius;
      fetchShops(coordsRef.current.lat, coordsRef.current.lng, radius);
    }
  }, [radius, fetchShops]);

  // ── Map init/update — robust, waits for Leaflet to load ──
  useEffect(() => {
    if (status !== "done") return;
    const c = coordsRef.current;
    if (!c) return;

    let destroyed = false;

    loadLeaflet().then(L => {
      if (destroyed) return;
      const container = mapContainerRef.current;
      if (!container) return;

      const initMap = () => {
        if (destroyed) return;
        // Update existing map
        if (leafletMap.current) {
          leafletMap.current.setView([c.lat, c.lng], 13);
          markersLayer.current?.clearLayers();
          addMarkers(L, leafletMap.current, markersLayer.current, c, shopsRef.current);
          setTimeout(() => leafletMap.current?.invalidateSize(), 150);
          return;
        }
        // Destroy any stale leaflet instance on the container
        if (container._leaflet_id) {
          try { container._leaflet_id = null; } catch (_) {}
        }
        const map = L.map(container, { zoomControl: true, attributionControl: true, preferCanvas: true })
          .setView([c.lat, c.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
        const layer = L.layerGroup().addTo(map);
        leafletMap.current = map;
        markersLayer.current = layer;
        addMarkers(L, map, layer, c, shopsRef.current);
        setTimeout(() => { if (!destroyed) map.invalidateSize(); }, 250);
      };

      // Wait for container to be in DOM and have dimensions
      if (container.offsetWidth > 0) { initMap(); }
      else { const t = setTimeout(initMap, 200); return () => clearTimeout(t); }
    }).catch(err => console.error("Leaflet load failed:", err));

    return () => {
      destroyed = true;
    };
  }, [status]); // eslint-disable-line

  // Cleanup map on unmount
  useEffect(() => () => { if (leafletMap.current) { try { leafletMap.current.remove(); } catch (_) {} leafletMap.current = null; markersLayer.current = null; } }, []);

  if (status === "idle") return (
    <div style={{ marginTop: 32, ...G.card, borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${T.accent}14`, border: `1px solid ${T.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📍</div>
      <div>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 6px" }}>Find Nearby Tyre Shops</p>
        <p style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.7, margin: 0 }}>Based on your diagnosis, we recommend visiting a professional. Share your location to find the nearest tyre shops.</p>
      </div>
      <button onClick={e => { haptic("medium"); ripple(e); locate(); }} className="mag-btn touch-btn" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", padding: "13px 28px", borderRadius: 10, cursor: "pointer", boxShadow: `0 0 28px ${T.accent}40`, width: "100%", position: "relative", overflow: "hidden" }}>◎ USE MY LOCATION</button>
    </div>
  );
  if (status === "locating") return <LocatorStatus icon="◎" msg="Getting your location…" sub="Please allow location access when prompted." spin />;
  if (status === "loading") return <LocatorStatus icon="⌁" msg={retrying ? "Trying backup server…" : "Searching for tyre shops…"} sub={`Looking within ${radius} km radius.`} spin />;
  if (status === "denied") return <LocatorStatus icon="✕" msg="Location access denied" sub="Go to browser settings → Site permissions → Location → Allow, then try again." err onRetry={locate} />;
  if (status === "error") return <LocatorStatus icon="✕" msg="Something went wrong" sub={errMsg} err onRetry={locate} />;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, margin: 0 }}>{shops.length > 0 ? `${shops.length} shops found` : "No shops found nearby"}</p>
        <div style={{ display: "flex", gap: 6 }}>
          {RADIUS_OPTIONS.map(km => (
            <button key={km} onClick={e => { haptic("light"); ripple(e); setRadius(km); }} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer", transition: "all .2s", background: radius === km ? `${T.accent}33` : T.ghost, border: radius === km ? `1px solid ${T.accent}80` : `1px solid ${T.border}`, color: radius === km ? T.accent : T.textMuted, position: "relative", overflow: "hidden" }}>{km} km</button>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: 260, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 14, background: T === LIGHT ? "#e8e4e0" : "#111", position: "relative", zIndex: 1 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
      {shops.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: T.textMuted, fontSize: 12 }}>
          No tyre shops found within {radius} km. Try a larger radius.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shops.map((shop, i) => <ShopCard key={shop.id} shop={shop} index={i} selected={selected?.id === shop.id} onClick={() => { haptic("light"); setSelected(s => s?.id === shop.id ? null : shop); }} />)}
      </div>
    </div>
  );
}

function addMarkers(L, map, layer, coords, shops) {
  if (!L || !layer) return;
  const userIcon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 0 12px rgba(249,115,22,0.7)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
  L.marker([coords.lat, coords.lng], { icon: userIcon }).addTo(layer).bindPopup("📍 You are here");
  shops.forEach(shop => {
    const shopIcon = L.divIcon({ className: "", html: `<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #f97316;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>`, iconSize: [10, 10], iconAnchor: [5, 5] });
    L.marker([shop.lat, shop.lng], { icon: shopIcon }).addTo(layer).bindPopup(`<b style="font-size:12px">${shop.name}</b>${shop.addr ? `<br><span style="font-size:10px;color:#666">${shop.addr}</span>` : ""}`);
  });
}

function ShopCard({ shop, index, selected, onClick }) {
  const G = useG(), T = useTokens(), ripple = useRipple();
  return (
    <div onClick={e => { ripple(e); onClick(); }} className="touch-card" style={{ ...G.card, borderRadius: 12, padding: "14px 16px", cursor: "pointer", borderLeft: selected ? `2px solid ${T.accent}99` : `2px solid ${T.borderFaint}`, transition: "all .25s", background: selected ? `${T.accent}0a` : G.card.background, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: T.text, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shop.name}</p>
          {shop.addr && <p style={{ fontSize: 10, color: T.textMuted, margin: 0 }}>{shop.addr}</p>}
          {shop.hours && <p style={{ fontSize: 9, color: T.textFaint, margin: "2px 0 0" }}>🕐 {shop.hours}</p>}
        </div>
        <span style={{ fontSize: 11, color: T.accent, fontFamily: "'Syne',sans-serif", fontWeight: 700, flexShrink: 0 }}>{shop.dist.toFixed(1)} km</span>
      </div>
      {selected && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderFaint}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {shop.phone && <a href={`tel:${shop.phone}`} onClick={() => haptic("medium")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 11, textDecoration: "none" }}>📞 {shop.phone}</a>}
          {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" onClick={() => haptic("medium")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 6, background: `${T.accent}14`, border: `1px solid ${T.accent}33`, color: T.accent, fontSize: 11, textDecoration: "none" }}>↗ Website</a>}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`} target="_blank" rel="noopener noreferrer" onClick={() => haptic("medium")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 6, background: T.ghost, border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 11, textDecoration: "none" }}>🗺 Directions</a>
        </div>
      )}
    </div>
  );
}

function LocatorStatus({ icon, msg, sub, spin, err, onRetry }) {
  const G = useG(), T = useTokens(), ripple = useRipple();
  return (
    <div style={{ marginTop: 24, ...G.card, borderRadius: 14, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        {spin ? (<><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}26` }} /><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}`, borderTopColor: "transparent", animation: "spin .88s linear infinite" }} /></>)
          : <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: err ? "rgba(239,68,68,0.1)" : `${T.accent}14`, border: `1px solid ${err ? "rgba(239,68,68,0.25)" : T.accent + "33"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>}
      </div>
      <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: err ? "#ef4444" : T.text, margin: 0 }}>{msg}</p>
      <p style={{ fontSize: 11, color: T.textMuted, margin: 0, lineHeight: 1.65 }}>{sub}</p>
      {err && onRetry && <button onClick={e => { haptic("medium"); ripple(e); onRetry(); }} className="mag-btn touch-btn" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em", padding: "10px 24px", borderRadius: 8, cursor: "pointer", position: "relative", overflow: "hidden" }}>↺ TRY AGAIN</button>}
    </div>
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function ResponsiveNav({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const G = useG(), T = useTokens(), ripple = useRipple();
  useEffect(() => { const check = () => setIsMobile(window.innerWidth <= 640); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 24); window.addEventListener("scroll", fn, { passive: true }); return () => window.removeEventListener("scroll", fn); }, []);
  const go = useCallback((p) => { haptic("light"); setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }, [setPage]);
  const tabs = [{ id: "landing", icon: "◉", label: "HOME" }, { id: "diagnose", icon: "▶", label: "DIAGNOSE" }, { id: "about", icon: "◈", label: "ABOUT" }];
  return (
    <>
      <nav className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, padding: isMobile ? "0 16px" : "0 clamp(16px,4vw,40px)", height: 56, transition: "background .5s, box-shadow .5s", ...(scrolled ? { ...G.panel, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" } : { background: "transparent", border: "none" }) }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          <button onClick={e => { ripple(e); go("landing"); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "4px 0", position: "relative", overflow: "hidden" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${T.accent}66`, flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" /><circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2" fill="none" /></svg>
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, letterSpacing: "0.1em", fontSize: isMobile ? 16 : 18, color: T.text }}>STRADA</span>
          </button>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[["diagnose", "DIAGNOSE"], ["about", "HOW IT WORKS"]].map(([p, l]) => (
                <button key={p} onClick={e => { ripple(e); go(p); }} style={{ background: page === p ? `${T.accent}1e` : "transparent", border: page === p ? `1px solid ${T.accent}4d` : "1px solid transparent", color: page === p ? T.accent : T.textMuted, fontSize: 10, letterSpacing: "0.12em", padding: "7px 14px", borderRadius: 8, cursor: "pointer", transition: "all .25s", position: "relative", overflow: "hidden" }}>{l}</button>
              ))}
              <ThemeToggle />
              <button onClick={e => { haptic("medium"); ripple(e); go("diagnose"); }} className="mag-btn" style={{ marginLeft: 8, background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", padding: "8px 18px", borderRadius: 8, cursor: "pointer", boxShadow: `0 0 22px ${T.accent}47` }}>ANALYSE →</button>
            </div>
          )}
          {isMobile && <ThemeToggle />}
        </div>
      </nav>
      {isMobile && (
        <div className="no-print" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 500, ...G.panel, borderRadius: "16px 16px 0 0", borderBottom: "none", borderLeft: "none", borderRight: "none", borderTop: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={e => { ripple(e); go(tab.id); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0 6px", gap: 4, position: "relative", color: page === tab.id ? T.accent : T.textMuted, transition: "color .2s", overflow: "hidden" }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 8, letterSpacing: "0.1em", fontWeight: page === tab.id ? 700 : 400 }}>{tab.label}</span>
              {page === tab.id && <div style={{ position: "absolute", top: 0, width: 32, height: 2, borderRadius: "0 0 2px 2px", background: T.accent, boxShadow: `0 0 8px ${T.accent}` }} />}
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
  const G = useG(), T = useTokens(), { theme } = useTheme(), ripple = useRipple();
  const features = useMemo(() => [
    { icon: "◎", n: "01", title: "Wear Classification", desc: "EfficientNet-B3 classifies wear across 5 levels — New to Bald — with sub-millimetre pattern sensitivity." },
    { icon: "▦", n: "02", title: "Tread Depth Estimation", desc: "Computer vision estimates remaining depth in mm and predicts remaining kilometres before legal minimum." },
    { icon: "⌁", n: "03", title: "Sidewall Detection", desc: "YOLOv8 detects bulges, cuts, and dry rot — sidewall damage invisible to the untrained eye." },
    { icon: "◈", n: "04", title: "Grad-CAM Heatmaps", desc: "Gradient attention maps reveal exactly which tread zones drove the AI verdict. Full explainability." },
    { icon: "◐", n: "05", title: "Pattern Diagnosis", desc: "Identifies cupping, feathering, one-sided wear — each linked to specific mechanical root causes." },
    { icon: "◑", n: "06", title: "Health Score", desc: "All module outputs synthesised into one composite A–F grade with urgency level and recommendation." },
  ], []);
  return (
    <div>
      <section className="hero-section" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(80px,14vh,120px) clamp(16px,5vw,40px) clamp(40px,6vh,60px)", position: "relative" }}>
        <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, ...G.panel, borderRadius: 100, padding: "8px 16px", flexWrap: "wrap", justifyContent: "center" }}>
          <div className="dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent, boxShadow: `0 0 12px ${T.accent}`, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: T.textSub, letterSpacing: "0.12em" }}>AI-POWERED TYRE INTELLIGENCE</span>
          <span style={{ background: `${T.accent}24`, border: `1px solid ${T.accent}4d`, color: T.accent, fontSize: 9, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 4 }}>BETA</span>
        </div>
        <div className="hero-title-wrap"><h1 className={`hero-title ${theme === "dark" ? "shimmer-text" : "shimmer-text-light"}`} style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(72px,14vw,168px)", lineHeight: 0.87, letterSpacing: "-0.03em", margin: "0 0 24px" }}>STRADA</h1></div>
        <p className="hero-desc hero-desc-wrap" style={{ fontSize: "clamp(12px,1.5vw,16px)", color: T.textSub, maxWidth: 480, margin: "0 auto 44px", lineHeight: 1.8, padding: "0 8px" }}>Upload five tyre photos. Get a full AI diagnostic report in seconds — wear level, tread depth, pattern analysis, and explainable heatmaps.</p>
        <div className="hero-buttons hero-buttons-wrap" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", width: "100%", maxWidth: 400 }}>
          <button onClick={e => { haptic("medium"); ripple(e); setPage("diagnose"); }} className="mag-btn hero-btn-glow touch-btn" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,15px)", letterSpacing: "0.06em", padding: "16px 36px", borderRadius: 13, cursor: "pointer", boxShadow: `0 0 50px ${T.accent}66,0 4px 24px rgba(0,0,0,0.3)`, flex: 1, position: "relative", overflow: "hidden" }}>▶  RUN DIAGNOSTIC</button>
          <button onClick={e => { haptic("light"); ripple(e); setPage("about"); }} className="mag-btn touch-btn" style={{ ...G.panel, borderRadius: 13, color: T.textSub, fontSize: "clamp(11px,2.5vw,13px)", letterSpacing: "0.06em", padding: "16px 28px", cursor: "pointer", border: `1px solid ${T.border}`, fontFamily: "'JetBrains Mono',monospace", flex: 1, position: "relative", overflow: "hidden" }}>HOW IT WORKS</button>
        </div>
        <div className="hero-stats hero-stats-wrap" style={{ display: "flex", gap: 0, justifyContent: "center", marginTop: 52 }}>
          {[["5", "images", "inputs"], ["4", "models", "in parallel"], ["<2s", "", "inference"]].map((st, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 clamp(16px,4vw,36px)", borderRight: i < 2 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,3vw,30px)", color: T.text, lineHeight: 1 }}>{st[0]}<span style={{ color: T.accent, fontSize: "0.55em", letterSpacing: "0.08em", marginLeft: 2 }}>{st[1]}</span></div>
              <div style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.1em", marginTop: 7, textTransform: "uppercase" }}>{st[2]}</div>
            </div>
          ))}
        </div>
        <div className="hero-radar-outer" style={{ marginTop: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
          <DiagnosticHero />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.28 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.22em", color: T.textMuted }}>SCROLL</span>
            <div style={{ width: 1, height: 36, background: `linear-gradient(180deg,${T.textMuted},transparent)` }} />
          </div>
        </div>
      </section>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(48px,8vh,120px) clamp(16px,5vw,40px)" }}>
        <div className="strada-reveal" style={{ textAlign: "center", marginBottom: "clamp(36px,6vh,80px)" }}>
          <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.22em", marginBottom: 12 }}>DIAGNOSTIC MODULES</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,5vw,54px)", color: T.text, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 12px" }}>Six AI Engines.<br /><span style={{ color: T.textMuted }}>One Verdict.</span></h2>
        </div>
        <div className="grid3">{features.map((f, i) => <div key={i} className="strada-reveal lift-card touch-card" style={{ ...G.card, borderRadius: 18, padding: "clamp(18px,3vw,28px)", position: "relative", overflow: "hidden", cursor: "default" }}><div style={{ position: "absolute", top: -8, right: 12, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 88, color: `${T.accent}0a`, lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{f.n}</div><div style={{ fontSize: 20, marginBottom: 12, color: T.accent }}>{f.icon}</div><h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, letterSpacing: "-0.01em", margin: "0 0 8px" }}>{f.title}</h3><p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.78, margin: 0 }}>{f.desc}</p></div>)}</div>
      </section>
      <section className="strada-reveal" style={{ maxWidth: 900, margin: "0 auto clamp(80px,12vh,130px)", padding: "0 clamp(16px,5vw,40px)" }}>
        <div className="border-flow-anim" style={{ ...G.panel, borderRadius: 24, padding: "clamp(24px,5vw,56px)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: `linear-gradient(135deg,transparent,${T.accent}0a)`, pointerEvents: "none" }} />
          <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.22em", marginBottom: 10 }}>PIPELINE</p>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,4vw,34px)", color: T.text, margin: "0 0 36px", letterSpacing: "-0.02em" }}>Upload → Analyse → Report</h3>
          <div className="pipeline-steps" style={{ display: "flex", gap: 0, position: "relative" }}>
            <div className="step-line" style={{ position: "absolute", top: 28, left: 32, right: 32, height: 1, background: `linear-gradient(90deg,${T.accent}66,${T.accent}1a,transparent)` }} />
            {["Upload 5 Images", "Flask runs 4 models", "Grad-CAM + scores", "Full report ready"].map((step, i) => (
              <div key={i} className="pipeline-step" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "0 6px" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: i === 0 ? `linear-gradient(135deg,${T.accentMid},${T.accentDark})` : G.card.background, border: `1px solid ${T.accent}4d`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: i === 0 ? `0 0 24px ${T.accent}59` : "none", position: "relative", zIndex: 1 }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: i === 0 ? "white" : `${T.accent}8c` }}>0{i + 1}</span>
                </div>
                <span className="pipeline-step-text" style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.55, letterSpacing: "0.02em" }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 44, textAlign: "center" }}>
            <button onClick={e => { haptic("medium"); ripple(e); setPage("diagnose"); }} className="mag-btn touch-btn" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,14px)", letterSpacing: "0.06em", padding: "15px 36px", borderRadius: 11, cursor: "pointer", boxShadow: `0 0 32px ${T.accent}47`, width: "100%", maxWidth: 280, position: "relative", overflow: "hidden" }}>START DIAGNOSTIC →</button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage() {
  useReveal();
  const G = useG(), T = useTokens();
  const steps = useMemo(() => [
    { n: "01", title: "Upload Images", desc: "Provide up to 5 photos — left/right profiles, area of interest, tread close-up, and optional sidewall crack scan for maximum coverage." },
    { n: "02", title: "Multi-Model Inference", desc: "EfficientNet-B3, CNN pattern classifier, YOLOv8, and EasyOCR (for DOT code) run simultaneously on your uploaded images." },
    { n: "03", title: "Grad-CAM Explained", desc: "A backward pass generates gradient-weighted attention maps highlighting exactly which tread regions drove the wear classification verdict." },
    { n: "04", title: "Health Score Synthesis", desc: "All outputs aggregated into a composite 0–100 health score graded A–F, with urgency level (low/medium/high) and plain-English recommendation." },
    { n: "05", title: "Full Diagnostic Report", desc: "A printable report with gauges, depth bars, score breakdowns, Grad-CAM image, submitted photos, and quality warnings is instantly generated." },
  ], []);
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "clamp(76px,10vh,120px) clamp(16px,5vw,40px) clamp(80px,10vh,80px)" }}>
      <div className="strada-reveal" style={{ marginBottom: 56 }}>
        <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.22em", marginBottom: 14 }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,7vw,70px)", color: T.text, letterSpacing: "-0.03em", margin: "0 0 18px", lineHeight: 0.94 }}>THE DIAGNOSTIC<br /><span style={{ color: T.textMuted }}>PIPELINE.</span></h2>
        <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.85, maxWidth: 540 }}>Strada runs a chain of computer vision models on your tyre images, each specialising in a distinct aspect of tyre health.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 56 }}>
        {steps.map((st, i) => <div key={i} className="strada-reveal lift-card touch-card" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,28px) clamp(16px,3vw,32px)", display: "flex", gap: 20, alignItems: "flex-start", borderLeft: `1px solid ${T.accent}1e` }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,5vw,44px)", color: `${T.accent}29`, letterSpacing: "-0.04em", lineHeight: 1, flexShrink: 0, minWidth: 50, userSelect: "none" }}>{st.n}</div><div style={{ paddingTop: 4 }}><h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{st.title}</h3><p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.78, margin: 0 }}>{st.desc}</p></div></div>)}
      </div>
      <div className="strada-reveal" style={{ ...G.panel, borderRadius: 20, padding: "clamp(20px,4vw,40px)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.18em", marginBottom: 16, textTransform: "uppercase" }}>Tech Stack</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["EfficientNet-B3", "YOLOv8", "pytorch-grad-cam", "EasyOCR", "Flask", "React + Vite", "Tailwind v3", "OpenCV", "PyTorch"].map(t => <span key={t} style={{ ...G.ghost, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: T.textMuted, letterSpacing: "0.04em" }}>{t}</span>)}</div>
      </div>
      <div className="strada-reveal" style={{ borderRadius: 16, border: `1px solid ${T.accent}2e`, background: `${T.accent}0a`, padding: "clamp(14px,3vw,24px)" }}>
        <p style={{ fontSize: 9, color: T.accent, letterSpacing: "0.16em", marginBottom: 8, textTransform: "uppercase" }}>Disclaimer</p>
        <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8, margin: 0 }}>Strada is an AI diagnostic aid, not a replacement for professional tyre inspection. Always consult a certified technician before making safety-critical decisions.</p>
      </div>
    </div>
  );
}

// ─── UPLOAD CARD ──────────────────────────────────────────────────────────────
function UnifiedUploadCard({ files, onUpload, onRemove }) {
  const [activeSlot, setActiveSlot] = useState(null);
  const inputRefs = useRef({});
  const uploadedCount = Object.keys(files).length;
  const G = useG(), T = useTokens();
  return (
    <div style={{ ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,28px)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 3px" }}>Tyre Images</h3><p style={{ fontSize: 10, color: T.textMuted, margin: 0 }}>Upload up to 5 angles</p></div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: uploadedCount > 0 ? T.accent : T.textFaint }}>{uploadedCount}<span style={{ fontSize: 12, color: T.textMuted, fontFamily: "'JetBrains Mono'" }}>/{SLOTS.length}</span></span>
      </div>
      <div style={{ height: 3, background: T.ghost, borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${(uploadedCount / SLOTS.length) * 100}%`, background: `linear-gradient(90deg,${T.accentMid},${T.accent})`, borderRadius: 2, boxShadow: `0 0 12px ${T.accent}80`, transition: "width .6s cubic-bezier(.16,1,.3,1)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${T.accent}0d`, border: `1px solid ${T.accent}1e`, marginBottom: 16 }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
        <p style={{ fontSize: 10, color: T.textMuted, margin: 0, lineHeight: 1.65 }}><span style={{ color: `${T.accent}b3`, fontWeight: 600 }}>Tip:</span> Use flash, place a coin in the tread groove to help the AI calibrate depth.</p>
      </div>
      <div className="slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10 }}>
        {SLOTS.map(slot => { const file = files[slot.id], isDragging = activeSlot === slot.id; return <SlotTile key={slot.id} slot={slot} file={file} isDragging={isDragging} inputRef={el => inputRefs.current[slot.id] = el} onDragOver={e => { e.preventDefault(); setActiveSlot(slot.id); }} onDragLeave={() => setActiveSlot(null)} onDrop={e => { e.preventDefault(); setActiveSlot(null); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onUpload(slot.id, f); }} onClick={() => !file && inputRefs.current[slot.id]?.click()} onRemove={() => onRemove(slot.id)} onFileChange={e => { if (e.target.files[0]) { haptic("light"); onUpload(slot.id, e.target.files[0]); } }} />; })}
      </div>
    </div>
  );
}

function SlotTile({ slot, file, isDragging, inputRef, onDragOver, onDragLeave, onDrop, onClick, onRemove, onFileChange }) {
  const [preview, setPreview] = useState(null);
  const [hovered, setHovered] = useState(false);
  const T = useTokens(), ripple = useRipple();
  useEffect(() => { if (!file) { setPreview(null); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", height: "clamp(90px,15vh,130px)", borderRadius: 12, overflow: "hidden", cursor: file ? "default" : "pointer", transition: "transform .1s, border-color .2s", WebkitTapHighlightColor: "transparent", ...(isDragging ? { background: `${T.accent}14`, border: `1.5px solid ${T.accent}99`, boxShadow: `0 0 28px ${T.accent}24` } : file ? { background: "rgba(0,0,0,0.45)", border: `1px solid ${T.border}` } : { background: T.ghost, border: `1px dashed ${T.border}` }) }}
      onClick={e => { if (!file) { ripple(e); onClick(); } }}>
      {preview ? (
        <>
          <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: hovered ? "rgba(0,0,0,0.6)" : "transparent", transition: "background .2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {hovered && <button onClick={e => { e.stopPropagation(); haptic("medium"); onRemove(); }} style={{ background: "rgba(239,68,68,0.9)", border: "none", color: "white", fontSize: 10, letterSpacing: "0.1em", padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>✕ REMOVE</button>}
          </div>
          <button onClick={e => { e.stopPropagation(); haptic("medium"); onRemove(); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 11 }}>✕</button>
          <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(16,185,129,0.88)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "2px 7px", fontSize: 9, color: "white", letterSpacing: "0.08em" }}>✓</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 8px 5px", background: "linear-gradient(transparent,rgba(0,0,0,0.7))" }}><p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", margin: 0, letterSpacing: "0.08em", textAlign: "center" }}>{slot.label}</p></div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 7, padding: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: isDragging ? `${T.accent}1e` : T.ghost, flexShrink: 0 }}>
            <span style={{ color: isDragging ? T.accent : T.textMuted, fontSize: 15, lineHeight: 1 }}>{isDragging ? "↓" : slot.icon}</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: isDragging ? T.accent : T.textSub, margin: "0 0 2px", letterSpacing: "0.04em" }}>{slot.label}</p>
            <p style={{ fontSize: 8, color: T.textFaint, margin: 0, letterSpacing: "0.03em" }}>{slot.hint}</p>
          </div>
        </div>
      )}
       <input ref={setInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
    </div>
  );
}

// ─── DIAGNOSTIC LOADER ────────────────────────────────────────────────────────
const DIAGNOSTIC_STEPS = [
  { id: "wear", label: "Classifying wear level", detail: "EfficientNet-B3 running…", duration: 950 },
  { id: "pattern", label: "Analysing wear pattern", detail: "CNN pattern classifier…", duration: 850 },
  { id: "depth", label: "Estimating tread depth", detail: "Depth prediction model…", duration: 1050 },
  { id: "sidewall", label: "Scanning sidewall damage", detail: "YOLOv8 object detection…", duration: 900 },
  { id: "gradcam", label: "Generating Grad-CAM heatmap", detail: "Gradient attention map…", duration: 1100 },
  { id: "score", label: "Synthesising health score", detail: "Aggregating all outputs…", duration: 700 },
];

function DiagnosticLoader() {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const G = useG(), T = useTokens();
  useEffect(() => {
    let stepIdx = 0, timeout;
    const advance = () => {
      if (stepIdx >= DIAGNOSTIC_STEPS.length) return;
      setActiveStep(stepIdx);
      timeout = setTimeout(() => { setCompletedSteps(prev => [...prev, DIAGNOSTIC_STEPS[stepIdx].id]); stepIdx++; if (stepIdx < DIAGNOSTIC_STEPS.length) setTimeout(advance, 80); }, DIAGNOSTIC_STEPS[stepIdx].duration);
    };
    advance();
    return () => clearTimeout(timeout);
  }, []);
  return (
    <div style={{ marginTop: 24, ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,28px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.borderFaint}` }}>
        <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}26` }} /><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}`, borderTopColor: "transparent", animation: "spin .88s linear infinite" }} /></div>
        <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 2px" }}>Running Diagnostic</p><p style={{ fontSize: 10, color: T.textFaint, margin: 0, letterSpacing: "0.06em" }}>{completedSteps.length}/{DIAGNOSTIC_STEPS.length} modules complete</p></div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>{DIAGNOSTIC_STEPS.map((s, i) => <div key={s.id} style={{ width: completedSteps.includes(s.id) ? 12 : activeStep === i ? 8 : 4, height: 4, borderRadius: 2, background: completedSteps.includes(s.id) ? "#10b981" : activeStep === i ? T.accent : T.ghost, transition: "all .3s cubic-bezier(.16,1,.3,1)" }} />)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DIAGNOSTIC_STEPS.map((step, i) => { const done = completedSteps.includes(step.id), active = activeStep === i && !done; return <div key={step.id} className={done || active ? "status-anim" : ""} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, background: active ? `${T.accent}0d` : done ? "rgba(16,185,129,0.04)" : "transparent", border: active ? `1px solid ${T.accent}26` : done ? "1px solid rgba(16,185,129,0.1)" : "1px solid transparent", transition: "all .3s ease", animationDelay: `${i * 0.04}s` }}><div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: done ? "rgba(16,185,129,0.15)" : active ? `${T.accent}1e` : T.ghost, border: done ? "1px solid rgba(16,185,129,0.3)" : active ? `1px solid ${T.accent}4d` : `1px solid ${T.border}` }}>{done ? <span style={{ color: "#10b981", fontSize: 10 }}>✓</span> : active ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: "pulse 1s ease-in-out infinite" }} /> : <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.textFaint }} />}</div><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 11, margin: "0 0 1px", color: done ? T.textMuted : active ? T.text : T.textFaint, fontFamily: active ? "'Syne',sans-serif" : "'JetBrains Mono',monospace", fontWeight: active ? 600 : 400, transition: "all .25s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.label}</p>{active && <p style={{ fontSize: 9, color: `${T.accent}8c`, margin: 0, letterSpacing: "0.06em" }}>{step.detail}</p>}</div><span style={{ fontSize: 9, letterSpacing: "0.1em", flexShrink: 0, color: done ? "#10b981" : active ? T.accent : T.textFaint }}>{done ? "DONE" : active ? "RUN" : "…"}</span></div>; })}
      </div>
    </div>
  );
}

// ─── HEALTH / SCORE COMPONENTS ────────────────────────────────────────────────
function HealthGauge({ score, grade, label, color }) {
  const c = SVG_C[color] || "#52525b", T = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 110, height: 110 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke={T.ghost} strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="8" strokeDasharray={`${(score / 100) * 263.9} 263.9`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${c})`, transition: "stroke-dasharray 1.3s cubic-bezier(.16,1,.3,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: c, lineHeight: 1 }}>{grade}</span>
          <span style={{ fontSize: 9, color: T.textMuted }}>{score}/100</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: c, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function ScoreBar({ label, score, max, sublabel }) {
  const pct = (score / max) * 100, c = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444", T = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}><span style={{ fontSize: 11, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span><span style={{ fontSize: 10, color: T.textFaint }}>{score}/{max} · {sublabel}</span></div>
      <div style={{ height: 3, background: T.ghost, borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 2, boxShadow: `0 0 10px ${c}`, transition: "width 1.5s cubic-bezier(.16,1,.3,1)" }} /></div>
    </div>
  );
}

function DepthMeter({ depth_mm, status, color, remaining_km }) {
  const pct = Math.min((depth_mm / 9) * 100, 100), c = SVG_C[color] || "#52525b", T = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,6vw,36px)", color: c, lineHeight: 1 }}>{depth_mm}</span>
        <span style={{ fontSize: 13, color: T.textMuted }}>mm</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: c, letterSpacing: "0.1em" }}>{status}</span>
      </div>
      <div style={{ height: 5, background: T.ghost, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, boxShadow: `0 0 12px ${c}`, transition: "width 1.5s cubic-bezier(.16,1,.3,1)" }} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textFaint, letterSpacing: "0.07em" }}><span>0mm</span><span style={{ color: `${T.accent}8c` }}>▲ 1.6 legal min</span><span>9mm new</span></div>
      {remaining_km != null && <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>~{remaining_km.toLocaleString()} km remaining</p>}
    </div>
  );
}

function EditableTyreAgeCard({ tyreAge, onChange }) {
  const [editing, setEditing] = useState(false), [value, setValue] = useState(tyreAge?.age_display || "Unknown"), inputRef = useRef(null);
  const G = useG(), T = useTokens();
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  const commit = () => { setEditing(false); onChange?.(value); };
  const isHighlight = tyreAge?.status === "Replace";
  return (
    <div style={{ ...G.card, borderRadius: 12, padding: "14px 16px", borderLeft: `2px solid ${isHighlight ? "rgba(239,68,68,0.4)" : T.borderFaint}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: 0, textTransform: "uppercase" }}>TYRE AGE</p>
        <button onClick={() => { haptic("light"); if (editing) commit(); else setEditing(true); }} style={{ background: editing ? `${T.accent}26` : T.ghost, border: editing ? `1px solid ${T.accent}4d` : `1px solid ${T.border}`, color: editing ? T.accent : T.textMuted, fontSize: 9, letterSpacing: "0.1em", padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>{editing ? "SAVE" : "EDIT"}</button>
      </div>
      {editing ? <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(tyreAge?.age_display || "Unknown"); } }} style={{ width: "100%", background: `${T.accent}0d`, border: `1px solid ${T.accent}4d`, color: T.accent, fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, padding: "6px 10px", borderRadius: 7, outline: "none", marginBottom: 4 }} />
        : <p style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: isHighlight ? "#ef4444" : T.text, margin: "0 0 3px" }}>{value}</p>}
      <p style={{ fontSize: 10, color: T.textFaint, margin: 0, lineHeight: 1.55 }}>{tyreAge?.manufacture || ""}{!tyreAge?.dot_found ? " (DOT not detected)" : ""}</p>
    </div>
  );
}

function MiniCard({ label, value, sub, highlight }) {
  const G = useG(), T = useTokens();
  return (
    <div style={{ ...G.card, borderRadius: 12, padding: "14px 16px", borderLeft: `2px solid ${highlight ? "rgba(239,68,68,0.4)" : T.borderFaint}` }}>
      <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 5px", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: highlight ? "#ef4444" : T.text, margin: "0 0 3px" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: T.textMuted, margin: 0, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

function GradCamDisplay({ base64, originalBase64 }) {
  const T = useTokens();
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}>
      {originalBase64 && <img src={`data:image/jpeg;base64,${originalBase64}`} alt="Original tread" style={{ width: "100%", objectFit: "contain", maxHeight: 240, display: "block" }} />}
      <img src={`data:image/jpeg;base64,${base64}`} alt="Grad-CAM" className={originalBase64 ? "gradcam-img" : ""} style={{ width: "100%", objectFit: "contain", maxHeight: 240, display: "block", ...(originalBase64 ? { position: "absolute", inset: 0, height: "100%", mixBlendMode: "multiply", filter: "saturate(1.8) contrast(1.1)" } : {}) }} />
      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: `${T.accent}cc`, letterSpacing: "0.1em" }}>GRAD-CAM</div>
      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{originalBase64 ? "OVERLAY" : "HEATMAP"}</div>
    </div>
  );
}

// ─── PRINT REPORT — rendered into #print-root, hidden on screen, shown when printing ──
function PrintReport({ result, previews }) {
  const u = URGENCY[result.urgency] || URGENCY.medium;
  const now = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const health = result?.health || {};
  const depth = result?.tread_depth || {};
  const depthPct = Math.min(((depth.depth_mm || 0) / 9) * 100, 100);
  const depthBarBg = depthPct >= 60 ? "#059669" : depthPct >= 25 ? "#d97706" : "#dc2626";
  const healthColor = health.color === "green" ? "#059669" : health.color === "yellow" ? "#d97706" : "#dc2626";
  const urgencyBadgeClass = `print-badge-${result.urgency || "medium"}`;
  const breakdown = health.breakdown || {};

  // Use a portal-style div injected at body level so @media print can target it exclusively
  useEffect(() => {
    let root = document.getElementById("print-root");
    if (!root) { root = document.createElement("div"); root.id = "print-root"; document.body.appendChild(root); }
    // We'll render content into it via innerHTML — simpler than a full React portal for print
    return () => {};
  }, []);

  // Actually render as hidden DOM that print CSS makes visible
  return (
    <div id="print-root" style={{ display: "none", position: "fixed", left: "-99999px", top: 0, visibility: "hidden" }}>
      {/* PAGE 1 — Summary */}
      <div className="print-page" style={{ padding: "0 0 20pt" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14pt" }}>
          <div>
            <p className="print-h1" style={{ fontSize: "24pt", color: "#111", fontFamily: "sans-serif", fontWeight: 800, margin: 0 }}>STRADA</p>
            <p className="print-label" style={{ margin: "2pt 0 0" }}>AI TYRE DIAGNOSTIC REPORT</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="print-small" style={{ margin: 0 }}>Generated: {now} at {time}</p>
            <p className="print-small" style={{ margin: "2pt 0 0", color: "#aaa" }}>FOR PROFESSIONAL / WORKSHOP USE</p>
          </div>
        </div>
        <hr className="print-divider" />

        {/* Urgency banner */}
        <div className={urgencyBadgeClass}>
          <p style={{ margin: 0, fontFamily: "sans-serif", fontWeight: 700, fontSize: "11pt" }}>{u.label} — {result.recommendation || "See full report"}</p>
        </div>

        {/* KPI grid */}
        <div className="print-row">
          <div className="print-col">
            <p className="print-label">HEALTH GRADE</p>
            <p className="print-value" style={{ color: healthColor }}>{health.grade || "—"}</p>
            <p className="print-small">{health.score ?? "—"} / 100 · {health.label || ""}</p>
          </div>
          <div className="print-col">
            <p className="print-label">TREAD DEPTH</p>
            <p className="print-value">{depth.depth_mm ?? "—"} <span style={{ fontSize: "11pt", fontWeight: 400, color: "#666" }}>mm</span></p>
            <p className="print-small" style={{ marginBottom: "4pt" }}>{depth.status || ""}</p>
            <div className="print-bar-track"><div className="print-bar-fill" style={{ width: `${depthPct}%`, background: depthBarBg }} /></div>
            <p className="print-small" style={{ marginTop: "4pt" }}>Legal min: 1.6 mm{depth.remaining_km != null ? ` · ~${depth.remaining_km.toLocaleString()} km remaining` : ""}</p>
          </div>
          <div className="print-col">
            <p className="print-label">URGENCY</p>
            <p className="print-value" style={{ fontSize: "14pt", color: u.text }}>{u.label}</p>
            <p className="print-small">Action required{result.urgency === "high" ? " immediately" : result.urgency === "medium" ? " soon" : ": monitor"}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="print-row">
          <div className="print-col">
            <p className="print-label">WEAR LEVEL</p>
            <p style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: "12pt", color: result.urgency === "high" ? "#dc2626" : "#111", margin: "4pt 0 2pt" }}>{result.wear_level || "—"}</p>
            {result.cause && <p className="print-small">{result.cause}</p>}
          </div>
          <div className="print-col">
            <p className="print-label">WEAR PATTERN</p>
            <p style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: "12pt", color: "#111", margin: "4pt 0 2pt" }}>{result.pattern || "—"}</p>
            {result.cause && <p className="print-small">{result.cause}</p>}
          </div>
          <div className="print-col">
            <p className="print-label">TYRE AGE / DOT</p>
            <p style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: "12pt", color: "#111", margin: "4pt 0 2pt" }}>{result.tyre_age?.age_display || "Unknown"}</p>
            <p className="print-small">{result.tyre_age?.manufacture || ""}{!result.tyre_age?.dot_found ? " (DOT not detected)" : ""}</p>
          </div>
          <div className="print-col">
            <p className="print-label">SIDEWALL</p>
            <p style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: "12pt", color: result.sidewall && result.sidewall !== "None" ? "#dc2626" : "#059669", margin: "4pt 0 2pt" }}>{result.sidewall === "None" ? "No damage" : result.sidewall || "—"}</p>
            <p className="print-small">{result.sidewall && result.sidewall !== "None" ? "⚠ Damage detected — inspect immediately" : "Sidewall visually clear"}</p>
          </div>
        </div>

        {/* Recommendation */}
        <div style={{ border: "0.75pt solid #e5e7eb", borderLeft: "3pt solid #ea580c", borderRadius: "0 5pt 5pt 0", padding: "10px 14px", marginBottom: "12pt" }}>
          <p className="print-label" style={{ color: "#ea580c", marginBottom: "4pt" }}>WORKSHOP RECOMMENDATION</p>
          <p style={{ fontFamily: "sans-serif", fontSize: "10pt", color: "#333", lineHeight: 1.65, margin: 0 }}>{result.recommendation || "Consult a qualified tyre technician for full inspection."}</p>
        </div>

        {/* Quality warnings */}
        {result.warnings?.length > 0 && (
          <div style={{ background: "#fffbeb", border: "0.75pt solid #fcd34d", borderRadius: "5pt", padding: "8px 12px", marginBottom: "12pt" }}>
            <p className="print-label" style={{ color: "#b45309", marginBottom: "4pt" }}>AI QUALITY FLAGS</p>
            {result.warnings.map((w, i) => <p key={i} style={{ fontFamily: "sans-serif", fontSize: "9pt", color: "#666", margin: i > 0 ? "3pt 0 0" : 0 }}>• {w}</p>)}
          </div>
        )}

        <div className="print-footer"><span>STRADA AI Tyre Intelligence</span><span>Page 1 of 2</span></div>
      </div>

      {/* PAGE 2 — Score breakdown + images */}
      <div className="print-page">
        <p style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: "16pt", color: "#111", margin: "0 0 10pt", letterSpacing: "-0.02em" }}>SCORE BREAKDOWN</p>
        <hr className="print-divider" />
        {Object.keys(breakdown).length > 0 ? (
          <div style={{ marginBottom: "18pt" }}>
            {Object.entries(breakdown).map(([key, val]) => {
              const pct = ((val.score ?? 0) / (val.max ?? 100)) * 100;
              const fc = pct >= 70 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";
              return (
                <div key={key} className="print-score-row">
                  <p style={{ fontFamily: "sans-serif", fontWeight: 600, fontSize: "9pt", color: "#333", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", minWidth: "120pt" }}>{key}</p>
                  <div style={{ flex: 1, height: "6pt", background: "#f3f4f6", borderRadius: "3pt", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: fc }} /></div>
                  <p style={{ fontFamily: "sans-serif", fontSize: "9pt", color: "#666", margin: 0, minWidth: "40pt", textAlign: "right" }}>{val.score ?? 0}/{val.max ?? 100}</p>
                  <p style={{ fontFamily: "sans-serif", fontSize: "8pt", color: "#999", margin: 0, minWidth: "60pt", textAlign: "right" }}>{val.label || ""}</p>
                </div>
              );
            })}
          </div>
        ) : <p style={{ fontFamily: "sans-serif", fontSize: "9pt", color: "#aaa", marginBottom: "18pt" }}>Score breakdown not available.</p>}

        {/* Submitted images */}
        {previews?.length > 0 && (
          <>
            <p style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: "11pt", color: "#333", margin: "0 0 8pt" }}>SUBMITTED IMAGES</p>
            <div style={{ display: "flex", gap: "8pt", flexWrap: "wrap", marginBottom: "14pt" }}>
              {previews.map(({ label, url }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <img src={url} alt={label} style={{ width: "80pt", height: "60pt", objectFit: "cover", borderRadius: "4pt", border: "0.5pt solid #e5e7eb", display: "block" }} />
                  <p style={{ fontFamily: "sans-serif", fontSize: "7pt", color: "#999", margin: "3pt 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Action checklist for workshop */}
        <div style={{ border: "0.75pt solid #e5e7eb", borderRadius: "5pt", padding: "10px 14px", marginBottom: "12pt" }}>
          <p className="print-label" style={{ marginBottom: "6pt" }}>WORKSHOP ACTION CHECKLIST</p>
          {[
            result.urgency === "high" ? "⚠ IMMEDIATE: Replace tyre before vehicle is driven further" : result.urgency === "medium" ? "Schedule tyre replacement within next 2 weeks / 1,000 km" : "Monitor — re-inspect at next service",
            `Tread depth: ${depth.depth_mm ?? "—"} mm — Legal minimum is 1.6 mm`,
            result.sidewall && result.sidewall !== "None" ? `⚠ Sidewall issue: ${result.sidewall} — inspect for structural integrity` : "Sidewall: no damage detected",
            `Wear pattern: ${result.pattern || "—"} — ${result.cause || "check alignment and inflation"}`,
            result.tyre_age?.dot_found ? `DOT age: ${result.tyre_age.age_display} — ${result.tyre_age.manufacture || ""}` : "DOT code not detected — verify manufacture date physically",
          ].map((item, i) => <p key={i} style={{ fontFamily: "sans-serif", fontSize: "9pt", color: "#333", margin: i > 0 ? "4pt 0 0" : 0, lineHeight: 1.5 }}>☐ {item}</p>)}
        </div>

        <div className="print-footer"><span>STRADA AI Tyre Intelligence — NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span><span>Page 2 of 2</span></div>
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
  const [isMobile, setIsMobile] = useState(false);
  const G = useG(), T = useTokens(), ripple = useRipple();
  const overlayRef = useRef(null);
  const touchStartY = useRef(null);
  useEffect(() => { setIsMobile(window.innerWidth <= 640); }, []);

  // Swipe down to close (iOS-style)
  const handleTouchStart = e => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = e => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0 && overlayRef.current?.scrollTop === 0) {
      overlayRef.current.style.transform = `translateY(${Math.min(dy * 0.4, 80)}px)`;
      overlayRef.current.style.transition = "none";
    }
  };
  const handleTouchEnd = e => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 80 && overlayRef.current?.scrollTop === 0) { haptic("medium"); onClose(); }
    else { if (overlayRef.current) { overlayRef.current.style.transform = ""; overlayRef.current.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)"; } }
    touchStartY.current = null;
  };

  const resultWithAge = { ...result, tyre_age: tyreAge };

  return (
    <div ref={overlayRef} id="strada-report-overlay"
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, zIndex: 800, overflowY: "auto", background: T.bg, animation: "fadeIn .3s ease", WebkitOverflowScrolling: "touch", transition: "transform .3s cubic-bezier(.16,1,.3,1)" }}>

      {/* Print template — hidden on screen */}
      <PrintReport result={resultWithAge} previews={previews} />

      <div className="no-print" style={{ maxWidth: 760, margin: "0 auto", padding: `clamp(20px,5vh,64px) clamp(14px,4vw,28px) ${isMobile ? "90px" : "48px"}` }}>
        {/* Pull-to-close indicator on mobile */}
        {isMobile && <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} /></div>}

        <div className="report-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="report-header-title" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,8vw,52px)", color: T.text, letterSpacing: "-0.03em", margin: "0 0 4px", lineHeight: 1 }}>STRADA</h1>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em" }}>TYRE DIAGNOSTIC REPORT · {now}</p>
          </div>
          <div className="report-actions" style={{ display: "flex", gap: 8 }}>
            {[["⎙ PRINT", () => { haptic("medium"); window.print(); }], ["✕ CLOSE", () => { haptic("light"); onClose(); }]].map(([l, fn]) => (
              <button key={l} onClick={e => { ripple(e); fn(); }} style={{ ...G.panel, borderRadius: 8, color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", padding: "10px 16px", border: `1px solid ${T.border}`, cursor: "pointer", flex: 1, position: "relative", overflow: "hidden" }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: 14, border: `1px solid ${u.border}`, background: u.bg, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="report-dot-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: u.dot, boxShadow: `0 0 14px ${u.glow}`, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: u.text, letterSpacing: "0.1em" }}>{u.label}</span>
          <span style={{ fontSize: 12, color: T.textSub, flex: 1, minWidth: 160 }}>{result.recommendation}</span>
        </div>

        <div className="grid2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 14 }}>
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: 0, alignSelf: "flex-start" }}>OVERALL HEALTH</p>
            <HealthGauge {...result.health} />
          </div>
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", animationDelay: "0.08s" }}>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 14px" }}>TREAD DEPTH</p>
            <DepthMeter {...result.tread_depth} />
            <p style={{ fontSize: 11, color: T.textFaint, margin: "10px 0 0", lineHeight: 1.6 }}>{result.tread_depth.message}</p>
          </div>
        </div>

        <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.16s" }}>
          <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 18px" }}>SCORE BREAKDOWN</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(result.health.breakdown).map(([k, v]) => <ScoreBar key={k} label={k} score={v.score} max={v.max} sublabel={v.label} />)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 14 }}>
          <div className="card-anim" style={{ animationDelay: "0.22s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} sub={result.cause} highlight={result.urgency === "high"} /></div>
          <div className="card-anim" style={{ animationDelay: "0.27s" }}><MiniCard label="WEAR PATTERN" value={result.pattern} sub={result.cause} /></div>
          <div className="card-anim" style={{ animationDelay: "0.32s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val => setTyreAge(prev => ({ ...prev, age_display: val }))} /></div>
          <div className="card-anim" style={{ animationDelay: "0.37s" }}><MiniCard label="SIDEWALL" value={result.sidewall} sub={result.sidewall === "None" ? "No damage detected" : "⚠ Damage detected"} highlight={result.sidewall !== "None"} /></div>
        </div>

        <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.42s" }}>
          <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 14px" }}>GRAD-CAM ATTENTION MAP</p>
          <GradCamDisplay base64={result.gradcam_image} originalBase64={null} />
          <p style={{ fontSize: 10, color: T.textFaint, margin: "10px 0 0" }}>Highlighted regions indicate areas the model focused on during classification.</p>
        </div>

        {previews.length > 0 && (
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.48s" }}>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 14px" }}>SUBMITTED IMAGES</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 8 }}>
              {previews.map(({ label, url }) => (
                <div key={label}>
                  <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, height: 72 }}><img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                  <span style={{ fontSize: 8, color: T.textFaint, display: "block", textAlign: "center", marginTop: 4, letterSpacing: "0.06em" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.warnings?.length > 0 && (
          <div style={{ borderRadius: 14, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)", padding: "14px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 9, color: "#f59e0b", letterSpacing: "0.14em", margin: "0 0 8px" }}>QUALITY WARNINGS</p>
            {result.warnings.map((w, i) => <p key={i} style={{ fontSize: 11, color: "rgba(245,158,11,0.62)", margin: 0, lineHeight: 1.65 }}>{w}</p>)}
          </div>
        )}

        {showLocator && <ShopLocator />}

        <div style={{ paddingTop: 20, borderTop: `1px solid ${T.borderFaint}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
          <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.1em" }}>STRADA · TYRE INTELLIGENCE</span>
          <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.08em" }}>NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
        </div>
      </div>
    </div>
  );
}

// ─── RESULT CARD ──────────────────────────────────────────────────────────────
function ResultCard({ result, onViewReport }) {
  const u = URGENCY[result.urgency] || URGENCY.medium;
  const [tyreAge, setTyreAge] = useState(result.tyre_age);
  const G = useG(), T = useTokens(), ripple = useRipple();
  return (
    <div style={{ marginTop: 28, ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,32px)", animation: "cardReveal .7s cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.borderFaint}`, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.18em" }}>DIAGNOSTIC RESULT</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 100, border: `1px solid ${u.border}`, background: u.bg }}>
          <div className="report-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: u.dot, boxShadow: `0 0 10px ${u.glow}` }} />
          <span style={{ fontSize: 10, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: u.text, letterSpacing: "0.12em" }}>{u.label}</span>
        </div>
      </div>
      <div className="grid2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "clamp(12px,3vw,24px)", marginBottom: 20 }}>
        <div className="card-anim" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 12px", alignSelf: "flex-start" }}>HEALTH SCORE</p><HealthGauge {...result.health} /></div>
        <div className="card-anim" style={{ animationDelay: "0.08s" }}><p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 12px" }}>TREAD DEPTH</p><DepthMeter {...result.tread_depth} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 14 }}>
        <div className="card-anim" style={{ animationDelay: "0.14s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} highlight={result.urgency === "high"} /></div>
        <div className="card-anim" style={{ animationDelay: "0.18s" }}><MiniCard label="PATTERN" value={result.pattern} /></div>
        <div className="card-anim" style={{ animationDelay: "0.22s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val => setTyreAge(prev => ({ ...prev, age_display: val }))} /></div>
        <div className="card-anim" style={{ animationDelay: "0.26s" }}><MiniCard label="SIDEWALL" value={result.sidewall} highlight={result.sidewall !== "None"} /></div>
      </div>
      <div style={{ ...G.panel, borderRadius: 12, padding: "12px 16px", marginBottom: 14, borderLeft: `2px solid ${T.accent}38` }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 5px" }}>RECOMMENDATION</p>
        <p style={{ fontSize: 12, color: T.textSub, margin: 0, lineHeight: 1.65 }}>{result.recommendation}</p>
      </div>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 8px" }}>GRAD-CAM HEATMAP</p>
        <GradCamDisplay base64={result.gradcam_image} />
      </div>
      <button onClick={e => { haptic("medium"); ripple(e); onViewReport(); }} className="mag-btn touch-btn" style={{ width: "100%", padding: "16px", borderRadius: 12, cursor: "pointer", border: `1px solid ${T.accent}47`, background: `${T.accent}0d`, color: T.accent, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative", overflow: "hidden" }}>
        VIEW FULL REPORT <span style={{ fontSize: 16 }}>↗</span>
      </button>
    </div>
  );
}

// ─── DIAGNOSE PAGE ────────────────────────────────────────────────────────────
function DiagnosePage({ isMobile }) {
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const G = useG(), T = useTokens(), ripple = useRipple();

  const handleUpload = useCallback((id, file) => { setFiles(p => ({ ...p, [id]: file })); setResult(null); setError(null); }, []);
  const handleRemove = useCallback((id) => { setFiles(p => { const n = { ...p }; delete n[id]; return n; }); setResult(null); }, []);

  const uploadedCount = Object.keys(files).length;
  const canAnalyse = uploadedCount >= 1;

  const previews = useMemo(() => SLOTS.filter(s => files[s.id]).map(s => ({ label: s.label, url: URL.createObjectURL(files[s.id]) })), [files]);
  useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p.url)), [previews]);

  const handleAnalyse = async () => {
    setLoading(true); setError(null); setResult(null); haptic("medium");
    const fd = new FormData();
    SLOTS.forEach(s => { if (files[s.id]) fd.append(s.id, files[s.id]); });
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
      const res = await fetch(`${API_BASE}/predict`, { method: "POST", body: fd, signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setResult(data);
      haptic("heavy");
    } catch (err) {
      if (err.name === "AbortError") setError("Request timed out. Check that your Flask server is running.");
      else setError(err.message || "Failed to reach API. Is Flask running on port 5000?");
      haptic("heavy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: `clamp(72px,10vh,106px) clamp(14px,5vw,28px) ${isMobile ? "90px" : "80px"}` }}>
      {showReport && result && <ReportPage result={result} previews={previews} onClose={() => setShowReport(false)} />}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ height: 1, width: 24, background: `linear-gradient(90deg,${T.accent},transparent)` }} />
          <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.2em", margin: 0 }}>TYRE DIAGNOSTIC</p>
        </div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(30px,7vw,58px)", color: T.text, letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1 }}>ANALYSE TYRES</h2>
        <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8, margin: 0, maxWidth: 480 }}>Upload photos for AI wear analysis. At least 1 image required — 5 images gives the most accurate result.</p>
      </div>
      <UnifiedUploadCard files={files} onUpload={handleUpload} onRemove={handleRemove} />
      <button onClick={e => { if (!canAnalyse || loading) return; ripple(e); handleAnalyse(); }} disabled={!canAnalyse || loading} className={canAnalyse && !loading ? "mag-btn touch-btn" : ""}
        style={{ width: "100%", padding: "16px", borderRadius: 14, cursor: canAnalyse && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,14px)", letterSpacing: "0.05em", transition: "all .3s", position: "relative", overflow: "hidden", ...(canAnalyse && !loading ? { background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", boxShadow: `0 0 50px ${T.accent}4d,0 6px 24px rgba(0,0,0,0.2)` } : { background: T.ghost, border: `1px solid ${T.border}`, color: T.textFaint }) }}>
        {loading ? "ANALYSING…" : canAnalyse ? "▶  RUN DIAGNOSTIC" : "UPLOAD AT LEAST 1 IMAGE"}
      </button>
      {loading && <DiagnosticLoader />}
      {error && <div style={{ marginTop: 18, ...G.card, borderRadius: 12, borderLeft: "2px solid rgba(239,68,68,0.45)", padding: "14px 18px" }}><p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p></div>}
      {result && !loading && <ResultCard result={result} onViewReport={() => setShowReport(true)} />}
      <div style={{ marginTop: 48, paddingTop: 18, borderTop: `1px solid ${T.borderFaint}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.1em" }}>STRADA · TYRE INTELLIGENCE</span>
        <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.08em" }}>ML-POWERED · LOCAL INFERENCE</span>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => { const check = () => setIsMobile(window.innerWidth <= 640); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);
  useEffect(() => { document.body.className = theme === "dark" ? "dark-mode" : "light-mode"; }, [theme]);

  // Cleanup print-root on unmount
  useEffect(() => () => { const pr = document.getElementById("print-root"); if (pr) pr.remove(); }, []);

  const toggleTheme = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), []);
  const go = useCallback((p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const T = theme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {theme === "dark" && <Cursor />}
      <Noise />
      <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, position: "relative", fontFamily: "'JetBrains Mono', monospace" }}>
        <Orbs page={page} />
        <ResponsiveNav page={page} setPage={go} />
        <div style={{ position: "relative", zIndex: 2 }}>
          {page === "landing" && <LandingPage setPage={go} />}
          {page === "diagnose" && <DiagnosePage isMobile={isMobile} />}
          {page === "about" && <AboutPage />}
        </div>
        {!isMobile && (
          <footer className="no-print" style={{ position: "relative", zIndex: 2, borderTop: `1px solid ${T.borderFaint}`, padding: "clamp(20px,4vh,36px) clamp(16px,5vw,40px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 11, color: "white" }}>S</span>
              </div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: T.textMuted, letterSpacing: "0.1em" }}>STRADA</span>
            </div>
            <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.07em", textAlign: "center" }}>AI TYRE INTELLIGENCE · NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
            <div style={{ display: "flex", gap: 16 }}>
              {[["diagnose", "DIAGNOSE"], ["about", "ABOUT"]].map(([p, l]) => <button key={p} onClick={() => go(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: T.textFaint, letterSpacing: "0.12em" }}>{l}</button>)}
            </div>
          </footer>
        )}
      </div>
    </ThemeContext.Provider>
  );
}