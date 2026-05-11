import { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import InfoPage from "./components/Info";

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });
const useTheme = () => useContext(ThemeContext);

// ─── SLOTS ────────────────────────────────────────────────────────────────────
// Primary hero slot
const PRIMARY_SLOT = { id: "tread_closeup", label: "Primary Tyre Photo", hint: "Tread close-up gives the best AI result" };

// Optional extra angle slots
const OPTIONAL_SLOTS = [
  { id: "left_profile",     label: "Left Profile",      icon: "◧", hint: "Side view, left"  },
  { id: "right_profile",    label: "Right Profile",     icon: "◨", hint: "Side view, right" },
  { id: "area_of_interest", label: "Area of Interest",  icon: "◎", hint: "Focused wear zone" },
  { id: "cracks",           label: "Cracks / Sidewall", icon: "⌁", hint: "Sidewall scan"    },
];

// All slots in original order — keeps FormData keys intact for Flask
const SLOTS = [
  { id: "left_profile",     label: "Left Profile",      icon: "◧", hint: "Side view, left"       },
  { id: "right_profile",    label: "Right Profile",     icon: "◨", hint: "Side view, right"      },
  { id: "area_of_interest", label: "Area of Interest",  icon: "◎", hint: "Focused wear zone"     },
  { id: "tread_closeup",    label: "Tread Close-up",    icon: "▦", hint: "Primary analysis input"},
  { id: "cracks",           label: "Cracks / Sidewall", icon: "⌁", hint: "Optional sidewall scan"},
];

const URGENCY = {
  low:    { label: "LOW RISK",  dot: "#10b981", text: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)" },
  medium: { label: "MODERATE",  dot: "#f59e0b", text: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)" },
  high:   { label: "CRITICAL",  dot: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"  },
};
const SVG_C = { green: "#10b981", yellow: "#f59e0b", orange: "#f97316", red: "#ef4444", gray: "#52525b" };

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
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
  gridLine: "rgba(255,255,255,0.011)",
  orbBg: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,0.09) 0%, transparent 70%)",
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
  gridLine: "rgba(0,0,0,0.018)",
  orbBg: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,0.07) 0%, transparent 70%)",
};
function useTokens() { const { theme } = useTheme(); return theme === "dark" ? DARK : LIGHT; }
function useG() {
  const T = useTokens();
  return {
    panel: { background: T.panel, border: `1px solid ${T.panelBorder}`, boxShadow: T.panelShadow },
    card:  { background: T.surface, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow },
    ghost: { background: T.ghost, border: `1px solid ${T.border}` },
  };
}

// ─── HAPTIC ───────────────────────────────────────────────────────────────────
function haptic(type = "light") {
  try { if (window.navigator?.vibrate) window.navigator.vibrate(type === "light" ? 8 : type === "medium" ? 18 : 35); } catch (_) {}
}

// ─── LEAFLET LOADER ───────────────────────────────────────────────────────────
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

// ─── OVERPASS FETCH ───────────────────────────────────────────────────────────
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
    const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(query), signal: controller.signal });
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
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.9)}}
@keyframes radarPing{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes cardReveal{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes statusPop{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes rippleOut{0%{transform:scale(0);opacity:.35}100%{transform:scale(4);opacity:0}}
@keyframes splashScanLine{0%{transform:translateY(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(100vh);opacity:0}}
@keyframes splashBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes splashFadeOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
@keyframes splashLogoReveal{0%{opacity:0;letter-spacing:0.5em;filter:blur(8px)}100%{opacity:1;letter-spacing:-0.03em;filter:blur(0)}}
@keyframes splashGlitch{0%,95%{clip-path:none;transform:none}96%{clip-path:polygon(0 20%,100% 20%,100% 40%,0 40%);transform:translateX(-4px)}97%{clip-path:polygon(0 60%,100% 60%,100% 80%,0 80%);transform:translateX(4px)}98%{clip-path:polygon(0 10%,100% 10%,100% 25%,0 25%);transform:translateX(-2px)}99%{clip-path:none;transform:none}}
@keyframes splashRingExpand{0%{transform:scale(0.6);opacity:1}100%{transform:scale(2.2);opacity:0}}
@keyframes splashDotMatrix{0%,100%{opacity:0.15}50%{opacity:0.6}}
@keyframes radarExpand{from{clip-path:circle(0% at var(--radar-x,50%) var(--radar-y,50%))}to{clip-path:circle(150% at var(--radar-x,50%) var(--radar-y,50%))}}
::view-transition-old(root){animation:180ms cubic-bezier(.4,0,.2,1) both fade-out;}
::view-transition-new(root){animation:220ms cubic-bezier(.4,0,.2,1) both radarExpand;}
@keyframes fade-out{from{opacity:1}to{opacity:0}}
@keyframes tyreRoll{0%{transform:translateX(-120px) rotate(0deg);opacity:0}5%{opacity:1}95%{opacity:1}100%{transform:translateX(calc(100vw + 120px)) rotate(1440deg);opacity:0}}
@keyframes tyreTrail{0%{opacity:0.7;width:0}100%{opacity:0;width:200px}}
@keyframes skidMark{0%{opacity:0;width:0;left:50%}10%{opacity:0.8}80%{opacity:0.6}100%{opacity:0;width:80vw;left:10%}}
@keyframes spinOut{0%{transform:rotate(0deg) scale(1);opacity:1}60%{transform:rotate(720deg) scale(0.3);opacity:0.5}100%{transform:rotate(1080deg) scale(0);opacity:0}}
@keyframes slickPopIn{0%{transform:translateY(40px) scale(0.8);opacity:0}70%{transform:translateY(-6px) scale(1.04);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes slickPopOut{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(20px) scale(0.9);opacity:0}}
@keyframes radarCenterPulse{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(249,115,22,0.8)}50%{transform:scale(1.15);box-shadow:0 0 0 20px rgba(249,115,22,0)}100%{transform:scale(1);box-shadow:0 0 0 0 rgba(249,115,22,0)}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes uucGlowBorder{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}50%{box-shadow:0 0 0 4px rgba(249,115,22,0.18)}}
@keyframes uucAccordionOpen{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes uucCheckPop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
.uuc-check-pop{animation:uucCheckPop .35s cubic-bezier(.16,1,.3,1) both}
.uuc-accordion{animation:uucAccordionOpen .28s cubic-bezier(.16,1,.3,1) both}
.uuc-hero-idle{border:2px dashed rgba(255,255,255,0.1)}
.uuc-hero-drag{border:2px dashed #f97316!important;animation:uucGlowBorder .9s ease-in-out infinite}
.uuc-hero-filled{border:2px solid rgba(249,115,22,0.35)}
.uuc-hero-idle:hover{border-color:rgba(249,115,22,0.55)!important;background:rgba(249,115,22,0.05)!important}
.strada-orb-bg{position:fixed;inset:0;pointer-events:none;z-index:0}
.strada-reveal{opacity:0;transform:translateY(30px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.strada-reveal.visible{opacity:1;transform:translateY(0)}
.shimmer-text{background:linear-gradient(90deg,#f97316 0%,#fb923c 20%,#fff 50%,#fb923c 80%,#f97316 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
.shimmer-text-light{background:linear-gradient(90deg,#ea6500 0%,#f97316 20%,#1a1008 50%,#f97316 80%,#ea6500 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
@media(prefers-reduced-motion:reduce){.shimmer-text,.shimmer-text-light{animation:none}.uuc-hero-drag{animation:none}}
.lift-card{transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s,border-color .3s}
.lift-card:hover{transform:translateY(-5px) scale(1.008);box-shadow:0 28px 64px rgba(0,0,0,.25),0 0 0 1px rgba(249,115,22,.18)!important}
.mag-btn{position:relative;overflow:hidden;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s}
.mag-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent);opacity:0;transition:opacity .3s}
.mag-btn:hover::before{opacity:1}
.mag-btn:active{transform:scale(.97)!important}
.card-anim{animation:cardReveal .55s cubic-bezier(.16,1,.3,1) both}
.status-anim{animation:statusPop .35s cubic-bezier(.16,1,.3,1) both}
.dot-pulse{animation:pulse 2.2s ease-in-out infinite}
.hero-badge{animation:fadeIn 0.8s ease forwards;opacity:0;animation-delay:0.05s}
.hero-title-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .18s both}
.hero-desc-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .3s both}
.hero-buttons-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .42s both}
.hero-stats-wrap{animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .55s both}
.hero-radar-outer{animation:fadeIn 1.6s ease .75s both}
.report-dot-pulse{animation:pulse 2s infinite}
.btn-primary-shadow{box-shadow:0 0 32px rgba(249,115,22,0.4),0 4px 24px rgba(0,0,0,0.25)}
.splash-scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(249,115,22,0.6),rgba(255,255,255,0.3),rgba(249,115,22,0.6),transparent);animation:splashScanLine 2.2s ease-in-out infinite;pointer-events:none;z-index:10}
.splash-logo{animation:splashLogoReveal 0.9s cubic-bezier(.16,1,.3,1) 0.4s both,splashGlitch 4s ease-in-out 1.5s infinite}
.splash-cursor{animation:splashBlink 0.8s step-start infinite}
.splash-ring{position:absolute;border-radius:50%;border:1px solid rgba(249,115,22,0.4);animation:splashRingExpand 2s ease-out infinite}
.splash-dot{animation:splashDotMatrix 1.8s ease-in-out infinite}
.slick-popup-enter{animation:slickPopIn 0.5s cubic-bezier(.16,1,.3,1) forwards}
.slick-popup-exit{animation:slickPopOut 0.3s ease forwards}
.radar-center-egg{animation:radarCenterPulse 0.6s ease-out 3}
.ripple{position:absolute;border-radius:50%;background:rgba(249,115,22,0.28);pointer-events:none;animation:rippleOut 0.55s ease-out forwards}
.gradcam-img{mix-blend-mode:multiply;filter:saturate(1.6) contrast(1.1)}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.pipeline-steps{display:flex;gap:0;position:relative}
body.light-mode{background:#faf7f4;color:#1a1008}
body.dark-mode{background:#080808;color:#fff}
@media(max-width:768px){
  *{-webkit-tap-highlight-color:transparent}
  .strada-reveal{opacity:0;transition:opacity .5s ease}
  .strada-reveal.visible{opacity:1;transform:none}
  .shimmer-text,.shimmer-text-light{animation:none;background:linear-gradient(90deg,#f97316,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .lift-card{transition:none}
  .mag-btn{transition:transform .12s cubic-bezier(.16,1,.3,1),opacity .12s}
  .mag-btn:active{transform:scale(0.96)!important;opacity:.92}
  .hero-title{font-size:clamp(48px,14vw,92px)!important;letter-spacing:-0.05em!important}
  .hero-section{padding:80px 16px 48px!important}
  .hero-buttons{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
  .hero-buttons button,.hero-buttons a{width:100%!important;justify-content:center!important}
  .hero-stats{gap:0!important;margin-top:40px!important}
  .hero-stats>div{padding:0 clamp(10px,3vw,20px)!important}
  .hero-radar{width:min(260px,78vw)!important;height:min(260px,78vw)!important;margin-top:40px!important}
  .touch-card:active{transform:scale(0.975)!important;box-shadow:0 2px 8px rgba(0,0,0,0.15)!important}
  .touch-btn:active{transform:scale(0.94)!important}
  button,a,[role=button]{min-height:44px;min-width:44px}
  .hero-badge{padding:6px 12px!important;font-size:8px!important}
  .hero-desc{font-size:12px!important;padding:0 10px!important}
  .card-anim{animation:cardReveal .3s ease both}
  .status-anim{animation:statusPop .2s ease both}
  .hero-title-wrap,.hero-desc-wrap,.hero-buttons-wrap,.hero-stats-wrap{animation:fadeIn 0.5s ease .1s both}
  .hero-radar-outer{animation:fadeIn 0.6s ease .5s both}
  .pipeline-steps{flex-direction:column!important;align-items:stretch!important;gap:12px!important}
  .step-line{display:none!important}
  .pipeline-step{flex-direction:row!important;gap:16px!important;align-items:center!important;text-align:left!important;padding:0!important}
  .pipeline-step-text{text-align:left!important}
  .slot-grid{grid-template-columns:1fr 1fr!important}
  .report-header{flex-direction:column!important;gap:12px!important}
  .report-header-title{font-size:36px!important}
  .report-actions{width:100%!important;justify-content:stretch!important}
  .report-actions button{flex:1!important}
}
@media(max-width:480px){
  .hero-title{font-size:clamp(40px,13.5vw,78px)!important}
  .grid2{grid-template-columns:1fr!important;gap:12px!important}
  .grid3{grid-template-columns:1fr!important}
}

/* ════════════════════════════════════════════════════════════
   PRINT STYLES — always forces white / black regardless of
   whether the screen is in dark mode or light mode.
════════════════════════════════════════════════════════════ */
@media print {
  *,*::before,*::after{
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
    color-scheme:light!important;
  }

  /* Hide every body child except the print portal */
  body>*:not(#strada-print-portal){display:none!important;visibility:hidden!important}

  /* Make the portal visible and in-flow */
  #strada-print-portal{
    display:block!important;
    visibility:visible!important;
    position:static!important;
    left:auto!important;top:auto!important;
  }

  /* Force white background / dark text on html + body, overriding dark-mode classes */
  html,body{
    background:#ffffff!important;
    color:#111111!important;
    overflow:visible!important;
    font-family:'Helvetica Neue',Helvetica,Arial,sans-serif!important;
    -webkit-filter:none!important;
    filter:none!important;
  }

  /* Kill any nav, sticky headers, overlays, Easter eggs */
  nav,.no-print,
  [class*="strada-orb"],[class*="splash"],
  #strada-report-overlay{display:none!important}

  @page{size:A4;margin:15mm 14mm 20mm}
  @page:first{margin-top:15mm}

  /* Page breaks */
  .print-page{page-break-after:always;break-after:always}
  .print-page:last-child{page-break-after:avoid;break-after:avoid}
  .print-no-break{page-break-inside:avoid!important;break-inside:avoid!important;display:block;overflow:visible}
  .print-break-before{page-break-before:always;break-before:always}

  /* Keep KPI grids and images from splitting across pages */
  .pt-kpi-grid,.pt-kpi,.pt-kpi-2,.pt-4col,.pt-2col,
  .pt-reco,.pt-checklist,.pt-warn,.pt-score-row,.pt-images-grid{
    page-break-inside:avoid!important;break-inside:avoid!important
  }

  /* Typography */
  .pt-h1{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:900;font-size:26pt;letter-spacing:-0.04em;color:#111!important;margin:0}
  .pt-h2{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:800;font-size:14pt;color:#111!important;margin:0 0 8pt}
  .pt-h3{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:9pt;color:#444!important;margin:0 0 4pt;text-transform:uppercase;letter-spacing:0.08em}
  .pt-body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#333!important;line-height:1.65}
  .pt-label{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:7pt;color:#999!important;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3pt}
  .pt-value{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:900;font-size:22pt;line-height:1.1;color:#111!important}
  .pt-small{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:8pt;color:#777!important}
  .pt-mono{font-family:'Courier New',Courier,monospace;font-size:8pt;color:#666!important}
  .pt-rule{border:none;border-top:0.75pt solid #ddd;margin:10pt 0}
  .pt-rule-heavy{border:none;border-top:2pt solid #111;margin:10pt 0}
  .pt-green{color:#059669!important}.pt-yellow{color:#d97706!important}
  .pt-red{color:#dc2626!important}.pt-orange{color:#ea580c!important}.pt-muted{color:#888!important}

  /* Urgency badges */
  .pt-badge{display:flex;align-items:center;gap:8pt;padding:8pt 12pt;border-radius:4pt;margin-bottom:12pt}
  .pt-badge-high{background:#fff0f0!important;border:1.5pt solid #fca5a5!important}
  .pt-badge-medium{background:#fffbeb!important;border:1.5pt solid #fde68a!important}
  .pt-badge-low{background:#f0fdf4!important;border:1.5pt solid #6ee7b7!important}

  /* KPI grids */
  .pt-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8pt;margin-bottom:10pt}
  .pt-kpi{border:0.75pt solid #e5e7eb!important;border-radius:4pt;padding:10pt 12pt;background:#fafafa!important}
  .pt-kpi-2{border:0.75pt solid #e5e7eb!important;border-radius:4pt;padding:10pt 12pt;background:#fafafa!important}
  .pt-2col{display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin-bottom:10pt}
  .pt-4col{display:grid;grid-template-columns:repeat(4,1fr);gap:6pt;margin-bottom:10pt}

  /* Bars */
  .pt-bar-track{height:5pt;background:#f3f4f6!important;border-radius:3pt;overflow:hidden;margin-top:4pt}
  .pt-bar-fill-green{height:100%;background:#059669!important;border-radius:3pt}
  .pt-bar-fill-yellow{height:100%;background:#d97706!important;border-radius:3pt}
  .pt-bar-fill-red{height:100%;background:#dc2626!important;border-radius:3pt}

  /* Score table */
  .pt-score-table{width:100%;border-collapse:collapse;margin-bottom:10pt}
  .pt-score-row{display:grid;grid-template-columns:130pt 1fr 40pt 60pt;align-items:center;gap:8pt;padding:5pt 0;border-bottom:0.5pt solid #f0f0f0!important}
  .pt-score-row:last-child{border-bottom:none!important}

  /* Callout boxes */
  .pt-checklist{border:0.75pt solid #e5e7eb!important;border-left:3pt solid #ea580c!important;border-radius:0 4pt 4pt 0;padding:10pt 14pt;margin-bottom:10pt;background:#fff!important}
  .pt-reco{border:0.75pt solid #e5e7eb!important;border-left:3pt solid #ea580c!important;padding:10pt 14pt;border-radius:0 4pt 4pt 0;margin-bottom:10pt;background:#fff!important}
  .pt-warn{background:#fffbeb!important;border:0.75pt solid #fcd34d!important;border-radius:4pt;padding:8pt 12pt;margin-bottom:10pt}

  /* Images */
  .pt-images-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6pt;margin-bottom:10pt}
  .pt-img-cell{text-align:center}
  .pt-img-cell img{width:100%;height:50pt;object-fit:cover;border-radius:3pt;border:0.5pt solid #e5e7eb!important;display:block}
  .pt-img-label{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:6pt;color:#aaa!important;text-transform:uppercase;letter-spacing:0.06em;margin-top:3pt}
  .pt-gradcam{width:100%;max-height:120pt;object-fit:contain;border-radius:3pt;border:0.5pt solid #e5e7eb!important;display:block}
  .pt-gauge-wrap{display:flex;flex-direction:column;align-items:center;gap:4pt}

  /* Fixed footer */
  .pt-footer{position:fixed;bottom:0;left:0;right:0;padding:5pt 14mm;border-top:0.5pt solid #ddd!important;display:flex;justify-content:space-between;align-items:center;background:#fff!important}
  .pt-footer span{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:7pt;color:#aaa!important}

  .no-print{display:none!important}
}
`;

// ─── RIPPLE ───────────────────────────────────────────────────────────────────
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

// ─── IMAGE PREVIEW HOOK ───────────────────────────────────────────────────────
function usePreview(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const BOOT_LINES = [
  { delay: 0,    text: "STRADA DIAGNOSTIC OS v2.4.1",         color: "#f97316" },
  { delay: 180,  text: "Initialising EfficientNet-B3...",      color: "#94a3b8" },
  { delay: 360,  text: "Loading YOLOv8 sidewall detector...", color: "#94a3b8" },
  { delay: 520,  text: "Mounting Grad-CAM engine...",          color: "#94a3b8" },
  { delay: 680,  text: "Calibrating tread depth model...",     color: "#94a3b8" },
  { delay: 820,  text: "Pattern classifier ONLINE",            color: "#10b981" },
  { delay: 960,  text: "EasyOCR DOT reader READY",             color: "#10b981" },
  { delay: 1080, text: "Flask API handshake... OK",            color: "#10b981" },
  { delay: 1200, text: "All systems nominal. Launching UI →",  color: "#f97316" },
];

function SplashScreen({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [cursorLine, setCursorLine] = useState(0);
  const progressRef = useRef(null);
  useEffect(() => {
    let p = 0;
    progressRef.current = setInterval(() => {
      p = Math.min(p + (100 / (2200 / 40)), 100);
      setProgress(p);
      if (p >= 100) clearInterval(progressRef.current);
    }, 40);
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => { setVisibleLines(prev => [...prev, i]); setCursorLine(i); }, line.delay + 300);
    });
    setTimeout(() => { setExiting(true); setTimeout(() => onComplete(), 500); }, 2800);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [onComplete]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"#040404", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflow:"hidden", animation: exiting ? "splashFadeOut 0.5s cubic-bezier(.4,0,.2,1) forwards" : "none" }}>
      <div className="splash-scanline" />
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(249,115,22,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }}>
        {[0,0.6,1.2].map((delay,i) => (<div key={i} className="splash-ring" style={{ width:`${200+i*120}px`, height:`${200+i*120}px`, top:`${-(100+i*60)}px`, left:`${-(100+i*60)}px`, animationDelay:`${delay}s`, opacity:0.3-i*0.08 }} />))}
      </div>
      <div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", gap:32, padding:"0 24px", maxWidth:600, width:"100%" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:11, background:"linear-gradient(135deg,#fb923c,#c2410c)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 32px rgba(249,115,22,0.5)" }}>
              <svg viewBox="0 0 24 24" style={{ width:22, height:22 }}><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" /><circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2" fill="none" /></svg>
            </div>
            <h1 className="splash-logo" style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(42px,10vw,72px)", color:"#fff", letterSpacing:"-0.03em", lineHeight:1 }}>STRADA</h1>
          </div>
          <p style={{ fontSize:9, color:"rgba(249,115,22,0.6)", letterSpacing:"0.28em" }}>SMART TYRE RECOGNITION & DIAGNOSTIC ASSISTANT</p>
        </div>
        <div style={{ width:"100%", maxWidth:480, background:"rgba(249,115,22,0.04)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:10, padding:"16px 20px", fontFamily:"'JetBrains Mono',monospace", minHeight:180 }}>
          <div style={{ fontSize:9, color:"rgba(249,115,22,0.4)", marginBottom:12, letterSpacing:"0.1em" }}>● BOOT SEQUENCE</div>
          {BOOT_LINES.map((line,i) => (
            <div key={i} style={{ fontSize:10.5, lineHeight:1.8, color:visibleLines.includes(i)?line.color:"transparent", transition:"color 0.2s ease", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"rgba(249,115,22,0.3)" }}>›</span>{line.text}
              {cursorLine===i && visibleLines.includes(i) && <span className="splash-cursor" style={{ color:"#f97316" }}>▋</span>}
            </div>
          ))}
        </div>
        <div style={{ width:"100%", maxWidth:480 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(255,255,255,0.2)", letterSpacing:"0.1em", marginBottom:8 }}><span>LOADING MODULES</span><span>{Math.round(progress)}%</span></div>
          <div style={{ height:2, background:"rgba(249,115,22,0.1)", borderRadius:1, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:1, background:"linear-gradient(90deg,#c2410c,#f97316,#fb923c)", width:`${progress}%`, transition:"width 0.04s linear", boxShadow:"0 0 8px rgba(249,115,22,0.6)" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {Array.from({ length:12 }).map((_,i) => (<div key={i} className="splash-dot" style={{ width:4, height:4, borderRadius:"50%", background:progress>(i/12)*100?"#f97316":"rgba(249,115,22,0.15)", animationDelay:`${i*0.15}s`, transition:"background 0.3s ease" }} />))}
        </div>
      </div>
      <div style={{ position:"absolute", top:16, left:16, fontSize:9, color:"rgba(249,115,22,0.3)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em" }}>SYS.INIT</div>
      <div style={{ position:"absolute", top:16, right:16, fontSize:9, color:"rgba(249,115,22,0.3)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em" }}>{new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
      <div style={{ position:"absolute", bottom:16, left:16, fontSize:9, color:"rgba(255,255,255,0.1)", fontFamily:"'JetBrains Mono',monospace" }}>BUILD 241-ALPHA</div>
      <div style={{ position:"absolute", bottom:16, right:16, fontSize:9, color:"rgba(255,255,255,0.1)", fontFamily:"'JetBrains Mono',monospace" }}>© STRADA AI</div>
    </div>
  );
}

// ─── EASTER EGGS ──────────────────────────────────────────────────────────────
function RollingTyre({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return createPortal(
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, pointerEvents:"none", zIndex:8000, overflow:"hidden" }}>
      <div style={{ position:"absolute", bottom:"38%", left:0, right:0, height:6, background:"repeating-linear-gradient(90deg,rgba(0,0,0,0.18) 0px,rgba(0,0,0,0.18) 18px,transparent 18px,transparent 32px)", animation:"tyreTrail 3s ease forwards", borderRadius:3 }} />
      <div style={{ position:"absolute", bottom:"36%", left:0, animation:"tyreRoll 3s cubic-bezier(.2,.8,.4,1) forwards", width:80, height:80, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg viewBox="0 0 32 32" width="72" height="72" style={{ imageRendering:"pixelated" }}>
          <rect x="4" y="0" width="24" height="4" fill="#222" /><rect x="0" y="4" width="4" height="24" fill="#222" /><rect x="28" y="4" width="4" height="24" fill="#222" /><rect x="4" y="28" width="24" height="4" fill="#222" />
          <rect x="4" y="4" width="4" height="4" fill="#222" /><rect x="24" y="4" width="4" height="4" fill="#222" /><rect x="4" y="24" width="4" height="4" fill="#222" /><rect x="24" y="24" width="4" height="4" fill="#222" />
          <rect x="8" y="4" width="16" height="4" fill="#444" /><rect x="4" y="8" width="4" height="16" fill="#444" /><rect x="24" y="8" width="4" height="16" fill="#444" /><rect x="8" y="24" width="16" height="4" fill="#444" />
          <rect x="8" y="8" width="16" height="16" fill="#888" /><rect x="10" y="10" width="12" height="12" fill="#aaa" />
          <rect x="13" y="13" width="6" height="6" fill="#f97316" /><rect x="14" y="14" width="4" height="4" fill="#fb923c" />
          <rect x="12" y="8" width="2" height="4" fill="#777" /><rect x="18" y="8" width="2" height="4" fill="#777" /><rect x="12" y="20" width="2" height="4" fill="#777" /><rect x="18" y="20" width="2" height="4" fill="#777" />
          <rect x="8" y="12" width="4" height="2" fill="#777" /><rect x="8" y="18" width="4" height="2" fill="#777" /><rect x="20" y="12" width="4" height="2" fill="#777" /><rect x="20" y="18" width="4" height="2" fill="#777" />
          <rect x="4" y="1" width="6" height="2" fill="#555" /><rect x="14" y="0" width="4" height="2" fill="#555" /><rect x="22" y="1" width="6" height="2" fill="#555" />
        </svg>
      </div>
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translateX(-50%)", background:"rgba(15,15,15,0.92)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:10, padding:"10px 20px", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#f97316", whiteSpace:"nowrap", animation:"fadeIn 0.4s ease 0.3s both", boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
        🛞 Triple tap detected — tyre escaping the garage!
      </div>
    </div>,
    document.body
  );
}

function RacingSlickPopup({ onClose }) {
  const [exiting, setExiting] = useState(false);
  const handleClose = () => { setExiting(true); setTimeout(onClose, 320); };
  useEffect(() => { const t = setTimeout(handleClose, 8000); return () => clearTimeout(t); }, []);
  return createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:7000, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 16px 32px", pointerEvents:"none" }}>
      <div className={exiting?"slick-popup-exit":"slick-popup-enter"} style={{ pointerEvents:"all", background:"linear-gradient(135deg,rgba(18,18,18,0.98),rgba(28,10,0,0.98))", border:"1px solid rgba(239,68,68,0.35)", borderLeft:"3px solid #ef4444", borderRadius:14, padding:"18px 22px", maxWidth:380, width:"100%", boxShadow:"0 8px 48px rgba(239,68,68,0.25)", cursor:"pointer" }} onClick={handleClose}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:44, height:44, flexShrink:0, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🏎️</div>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13, color:"#ef4444", margin:"0 0 6px" }}>Mate, are you sure this isn't a racing slick?</p>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.65, margin:"0 0 10px" }}>Our AI detects approximately <span style={{ color:"#f97316", fontWeight:600 }}>zero tread remaining</span>. That's peak Formula 1 energy — but for a road car, that's an MOT fail. Please visit a tyre shop. Now.</p>
            <span style={{ fontSize:9, color:"rgba(239,68,68,0.5)", letterSpacing:"0.1em", fontFamily:"'JetBrains Mono',monospace" }}>TAP TO DISMISS · AUTO-CLOSES IN 8s</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SpinOutOverlay({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:7500, pointerEvents:"none", overflow:"hidden" }}>
      {[{ top:"42%",left:"5%",width:"40%",rotate:-8,delay:"0s" },{ top:"50%",left:"55%",width:"38%",rotate:6,delay:"0.12s" }].map((sk,i) => (
        <div key={i} style={{ position:"absolute", top:sk.top, left:sk.left, width:sk.width, height:10, background:"repeating-linear-gradient(90deg,rgba(30,30,30,0.55) 0px,rgba(30,30,30,0.55) 14px,transparent 14px,transparent 22px)", borderRadius:5, transform:`rotate(${sk.rotate}deg)`, animation:`skidMark 0.8s cubic-bezier(.2,.8,.4,1) ${sk.delay} both`, filter:"blur(1px)" }} />
      ))}
      <div style={{ position:"absolute", top:"46%", left:"50%", transform:"translate(-50%,-50%)", width:120, height:120, borderRadius:"50%", border:"8px solid transparent", borderTop:"8px solid rgba(30,30,30,0.4)", borderBottom:"8px solid rgba(30,30,30,0.4)", animation:"spinOut 1.2s cubic-bezier(.4,0,.2,1) both" }} />
      <div style={{ position:"absolute", top:"28%", left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.88)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:8, padding:"8px 16px", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#f97316", whiteSpace:"nowrap", animation:"fadeIn 0.3s ease both" }}>⚠ Too fast — you spun out the theme engine!</div>
    </div>,
    document.body
  );
}

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────────
function ThemeToggle({ onToggleEgg }) {
  const { theme, toggleTheme } = useTheme();
  const T = useTokens(), isDark = theme === "dark";
  const ripple = useRipple(), toggleRef = useRef(null), toggleTimestamps = useRef([]);
  const handleToggle = (e) => {
    haptic("light"); ripple(e);
    const now = Date.now();
    toggleTimestamps.current = [...toggleTimestamps.current, now].filter(t => now - t < 3000);
    if (toggleTimestamps.current.length >= 4) { toggleTimestamps.current = []; onToggleEgg?.("spinout"); return; }
    if (document.startViewTransition) {
      const btn = toggleRef.current;
      if (btn) { const rect = btn.getBoundingClientRect(); document.documentElement.style.setProperty("--radar-x",`${((rect.left+rect.width/2)/window.innerWidth)*100}%`); document.documentElement.style.setProperty("--radar-y",`${((rect.top+rect.height/2)/window.innerHeight)*100}%`); }
      document.startViewTransition(() => { toggleTheme(); });
    } else { toggleTheme(); }
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {isDark && <span style={{ fontSize:9, color:T.accent, letterSpacing:"0.1em", background:`${T.accent}18`, border:`1px solid ${T.accent}40`, padding:"3px 8px", borderRadius:4, fontFamily:"'JetBrains Mono',monospace" }}>DARK</span>}
      <button ref={toggleRef} onClick={handleToggle} title={isDark?"Switch to light mode":"Switch to dark mode"} style={{ width:40, height:22, borderRadius:11, border:`1px solid ${isDark?"rgba(249,115,22,0.3)":"rgba(234,101,0,0.3)"}`, background:isDark?"rgba(249,115,22,0.1)":"rgba(234,101,0,0.12)", cursor:"pointer", position:"relative", transition:"background .3s, border .3s", flexShrink:0, overflow:"hidden" }} aria-label="Toggle theme">
        <div style={{ position:"absolute", top:2, left:isDark?20:2, width:16, height:16, borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#c2410c)", transition:"left .25s cubic-bezier(.16,1,.3,1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8 }}>{isDark?"☽":"☀"}</div>
      </button>
    </div>
  );
}

// ─── STATIC BG ────────────────────────────────────────────────────────────────
function StaticBg() {
  const T = useTokens();
  return (
    <div className="strada-orb-bg no-print" style={{ background:T.orbBg }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.gridLine} 1px,transparent 1px),linear-gradient(90deg,${T.gridLine} 1px,transparent 1px)`, backgroundSize:"80px 80px" }} />
    </div>
  );
}

// ─── REVEAL HOOK ──────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll(".strada-reveal:not(.visible)");
    if (!items.length) return;
    const io = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }); }, { threshold:0.08, rootMargin:"0px 0px -32px 0px" });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── DIAGNOSTIC HERO ─────────────────────────────────────────────────────────
function DiagnosticHero({ onRadarTripleClick }) {
  const [scanAngle, setScanAngle] = useState(0);
  const [pings, setPings] = useState([]);
  const rafRef = useRef(null), angleRef = useRef(0), pingIdRef = useRef(0);
  const containerRef = useRef(null), isVisibleRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const T = useTokens();
  const clickTimestamps = useRef([]);
  const [centerGlowing, setCenterGlowing] = useState(false);
  useEffect(() => { const check = () => setIsMobile(window.innerWidth < 640); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []);
  useEffect(() => { if (!containerRef.current) return; const io = new IntersectionObserver(entries => { isVisibleRef.current = entries[0].isIntersecting; }, { threshold:0.1 }); io.observe(containerRef.current); return () => io.disconnect(); }, []);
  useEffect(() => {
    if (isMobile) {
      const iv = setInterval(() => { if (!isVisibleRef.current) return; angleRef.current = (angleRef.current+2.5)%360; setScanAngle(angleRef.current); }, 50);
      const piv = setInterval(() => { if (!isVisibleRef.current) return; const a=(angleRef.current*Math.PI/180),r=60+Math.random()*55; setPings(p=>[...p.slice(-3),{id:pingIdRef.current++,x:150+r*Math.cos(a),y:150+r*Math.sin(a)}]); }, 1600);
      return () => { clearInterval(iv); clearInterval(piv); };
    }
    let lastPing=0;
    const tick = t => {
      if (isVisibleRef.current) {
        angleRef.current=(angleRef.current+0.8)%360; setScanAngle(angleRef.current);
        if (t-lastPing>900) { const a=(angleRef.current*Math.PI/180),r=60+Math.random()*55; setPings(p=>[...p.slice(-4),{id:pingIdRef.current++,x:150+r*Math.cos(a),y:150+r*Math.sin(a)}]); lastPing=t; }
      }
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isMobile]);
  const handleCenterClick = () => {
    haptic("light"); const now=Date.now();
    clickTimestamps.current=[...clickTimestamps.current,now].filter(t=>now-t<1500);
    if (clickTimestamps.current.length>=3) { clickTimestamps.current=[]; setCenterGlowing(true); setTimeout(()=>setCenterGlowing(false),1800); onRadarTripleClick?.(); }
  };
  const rad=(scanAngle*Math.PI/180), sweepX=150+120*Math.cos(rad), sweepY=150+120*Math.sin(rad);
  const rings=[40,70,100,125], accent=T.accent, isLight=T===LIGHT;
  return (
    <div ref={containerRef} className="hero-radar" style={{ position:"relative", width:"min(340px,82vw)", height:"min(340px,82vw)", margin:"0 auto" }}>
      <svg viewBox="0 0 300 300" style={{ width:"100%", height:"100%", overflow:"visible" }}>
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%"><stop offset="0%" stopColor={isLight?"rgba(255,250,245,0.97)":"rgba(20,20,20,0.95)"} /><stop offset="100%" stopColor={isLight?"rgba(250,247,244,0.99)":"rgba(8,8,8,0.98)"} /></radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="strongGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="radarClip"><circle cx="150" cy="150" r="128" /></clipPath>
        </defs>
        <circle cx="150" cy="150" r="130" fill="url(#radarBg)" stroke={`${accent}33`} strokeWidth="1.5" />
        {rings.map((r,i)=><circle key={i} cx="150" cy="150" r={r} fill="none" stroke={`${accent}${i===rings.length-1?"22":"11"}`} strokeWidth="0.8" strokeDasharray={i===rings.length-1?"none":"4 4"} />)}
        {[0,45,90,135].map(a=>{const aR=a*Math.PI/180;return <line key={a} x1={150+8*Math.cos(aR)} y1={150+8*Math.sin(aR)} x2={150+125*Math.cos(aR)} y2={150+125*Math.sin(aR)} stroke={isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.05)"} strokeWidth="0.6" />;} )}
        <g clipPath="url(#radarClip)">
          <path d={`M 150 150 L ${150+125*Math.cos(rad-0.52)} ${150+125*Math.sin(rad-0.52)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill={`${accent}11`} />
          <path d={`M 150 150 L ${150+125*Math.cos(rad-0.22)} ${150+125*Math.sin(rad-0.22)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill={`${accent}1e`} />
        </g>
        <line x1="150" y1="150" x2={sweepX} y2={sweepY} stroke={`${accent}d9`} strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" />
        {pings.map(p=><g key={p.id}><circle cx={p.x} cy={p.y} r="3.5" fill={accent} opacity="0.9" filter="url(#strongGlow)" />{!isMobile&&<circle cx={p.x} cy={p.y} r="7" fill="none" stroke={`${accent}66`} strokeWidth="1" style={{animation:"radarPing 1.2s ease-out forwards"}} />}</g>)}
        <g transform="translate(150,150)">
          <ellipse cx="0" cy="0" rx="28" ry="28" fill="none" stroke={`${accent}80`} strokeWidth="6" />
          <ellipse cx="0" cy="0" rx="16" ry="16" fill={isLight?"rgba(250,247,244,0.9)":"rgba(14,14,14,0.9)"} stroke={`${accent}59`} strokeWidth="2" />
          <circle cx="0" cy="0" r="10" fill="transparent" style={{cursor:"pointer"}} onClick={handleCenterClick} className={centerGlowing?"radar-center-egg":""} />
          <circle cx="0" cy="0" r="4" fill={accent} opacity="0.9" style={centerGlowing?{filter:`drop-shadow(0 0 8px ${accent})`}:{}} />
          {[0,60,120,180,240,300].map(a=>{const aR=a*Math.PI/180;return <line key={a} x1={5*Math.cos(aR)} y1={5*Math.sin(aR)} x2={14*Math.cos(aR)} y2={14*Math.sin(aR)} stroke={`${accent}99`} strokeWidth="1.5" strokeLinecap="round" />;} )}
        </g>
        {Array.from({length:12}).map((_,i)=>{const a=(i/12)*Math.PI*2;return <line key={i} x1={150+127*Math.cos(a)} y1={150+127*Math.sin(a)} x2={150+131*Math.cos(a)} y2={150+131*Math.sin(a)} stroke={`${accent}66`} strokeWidth="1.5" />;} )}
        <circle cx="150" cy="150" r="130" fill="none" stroke={`${accent}40`} strokeWidth="1" />
      </svg>
      <div style={{ position:"absolute", bottom:"4%", left:"2%", fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.textMuted, letterSpacing:"0.1em", display:"flex", alignItems:"center", gap:6 }}>
        <div className="dot-pulse" style={{ width:5, height:5, borderRadius:"50%", background:T.accent }} />SCANNING
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
  const mapContainerRef = useRef(null), leafletMap = useRef(null), markersLayer = useRef(null);
  const coordsRef = useRef(null), shopsRef = useRef([]);
  const G = useG(), T = useTokens(), ripple = useRipple();
  useEffect(() => { coordsRef.current = coords; }, [coords]);
  useEffect(() => { shopsRef.current = shops; }, [shops]);
  const fetchShops = useCallback(async (lat, lng, rad) => {
    setStatus("loading"); setShops([]); setSelected(null);
    const r = rad * 1000;
    const query = `[out:json][timeout:30];(node["shop"="tyres"](around:${r},${lat},${lng});node["shop"="car_repair"](around:${r},${lat},${lng});node["amenity"="car_repair"]["service:tyres"="yes"](around:${r},${lat},${lng});way["shop"="tyres"](around:${r},${lat},${lng});way["shop"="car_repair"](around:${r},${lat},${lng});relation["shop"="tyres"](around:${r},${lat},${lng}););out center 25;`;
    try {
      const data = await fetchOverpass(query);
      const results = (data.elements||[]).map(el=>({ id:el.id, name:el.tags?.name||"Tyre / Auto Shop", lat:el.lat??el.center?.lat, lng:el.lon??el.center?.lon, phone:el.tags?.phone||el.tags?.["contact:phone"]||null, hours:el.tags?.opening_hours||null, addr:[el.tags?.["addr:housenumber"],el.tags?.["addr:street"],el.tags?.["addr:city"]].filter(Boolean).join(" ")||null, website:el.tags?.website||el.tags?.["contact:website"]||null, dist:haversine(lat,lng,el.lat??el.center?.lat,el.lon??el.center?.lon) })).filter(s=>s.lat&&s.lng&&isFinite(s.dist)).sort((a,b)=>a.dist-b.dist).slice(0,15);
      setShops(results); setStatus("done");
    } catch { setErrMsg("All map servers failed. Please check your connection and try again."); setStatus("error"); }
  }, []);
  const locate = useCallback(() => {
    setStatus("locating");
    if (!navigator.geolocation) { setErrMsg("Geolocation is not supported by your browser."); setStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(pos => { const {latitude:lat,longitude:lng}=pos.coords; setCoords({lat,lng}); fetchShops(lat,lng,radius); }, err => { if (err.code===1) setStatus("denied"); else { setErrMsg(err.code===2?"Location unavailable. Make sure GPS is enabled.":"Location request timed out. Please try again."); setStatus("error"); } }, {timeout:12000,maximumAge:60000,enableHighAccuracy:false});
  }, [radius, fetchShops]);
  const prevRadius = useRef(radius);
  useEffect(() => { if (prevRadius.current!==radius && coordsRef.current) { prevRadius.current=radius; fetchShops(coordsRef.current.lat,coordsRef.current.lng,radius); } }, [radius, fetchShops]);
  useEffect(() => {
    if (status!=="done") return;
    const c=coordsRef.current; if (!c) return;
    let destroyed=false;
    loadLeaflet().then(L => {
      if (destroyed) return;
      const container=mapContainerRef.current; if (!container) return;
      const initMap = () => {
        if (destroyed) return;
        if (leafletMap.current) { leafletMap.current.setView([c.lat,c.lng],13); markersLayer.current?.clearLayers(); addMarkers(L,leafletMap.current,markersLayer.current,c,shopsRef.current); setTimeout(()=>leafletMap.current?.invalidateSize(),150); return; }
        if (container._leaflet_id) { try{container._leaflet_id=null;}catch(_){} }
        const map=L.map(container,{zoomControl:true,attributionControl:true,preferCanvas:true}).setView([c.lat,c.lng],13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:19}).addTo(map);
        const layer=L.layerGroup().addTo(map); leafletMap.current=map; markersLayer.current=layer;
        addMarkers(L,map,layer,c,shopsRef.current); setTimeout(()=>{if(!destroyed)map.invalidateSize();},250);
      };
      if (container.offsetWidth>0) initMap(); else { const t=setTimeout(initMap,200); return ()=>clearTimeout(t); }
    }).catch(console.error);
    return ()=>{destroyed=true;};
  }, [status]);
  useEffect(()=>()=>{ if(leafletMap.current){try{leafletMap.current.remove();}catch(_){} leafletMap.current=null; markersLayer.current=null;} },[]);

  if (status==="idle") return (
    <div style={{ marginTop:32, ...G.card, borderRadius:16, padding:"24px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:16, textAlign:"center" }}>
      <div style={{ width:52,height:52,borderRadius:"50%",background:`${T.accent}14`,border:`1px solid ${T.accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>📍</div>
      <div><p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:T.text,margin:"0 0 6px" }}>Find Nearby Tyre Shops</p><p style={{ fontSize:11,color:T.textMuted,lineHeight:1.7,margin:0 }}>Based on your diagnosis, we recommend visiting a professional. Share your location to find the nearest tyre shops.</p></div>
      <button onClick={e=>{haptic("medium");ripple(e);locate();}} className="mag-btn touch-btn" style={{ background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,border:"none",color:"white",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,letterSpacing:"0.06em",padding:"13px 28px",borderRadius:10,cursor:"pointer",width:"100%",position:"relative",overflow:"hidden" }}>◎ USE MY LOCATION</button>
    </div>
  );
  if (status==="locating") return <LocatorStatus icon="◎" msg="Getting your location…" sub="Please allow location access when prompted." spin />;
  if (status==="loading") return <LocatorStatus icon="⌁" msg="Searching for tyre shops…" sub={`Looking within ${radius} km radius.`} spin />;
  if (status==="denied") return <LocatorStatus icon="✕" msg="Location access denied" sub="Go to browser settings → Site permissions → Location → Allow, then try again." err onRetry={locate} />;
  if (status==="error") return <LocatorStatus icon="✕" msg="Something went wrong" sub={errMsg} err onRetry={locate} />;

  return (
    <div style={{ marginTop:32 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:T.text,margin:0 }}>{shops.length>0?`${shops.length} shops found`:"No shops found nearby"}</p>
        <div style={{ display:"flex",gap:6 }}>{RADIUS_OPTIONS.map(km=><button key={km} onClick={e=>{haptic("light");ripple(e);setRadius(km);}} style={{ padding:"6px 12px",borderRadius:20,fontSize:10,letterSpacing:"0.08em",cursor:"pointer",transition:"all .2s",background:radius===km?`${T.accent}33`:T.ghost,border:radius===km?`1px solid ${T.accent}80`:`1px solid ${T.border}`,color:radius===km?T.accent:T.textMuted,position:"relative",overflow:"hidden" }}>{km} km</button>)}</div>
      </div>
      <div style={{ width:"100%",height:260,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,marginBottom:14,background:T===LIGHT?"#e8e4e0":"#111",position:"relative",zIndex:1 }}>
        <div ref={mapContainerRef} style={{ width:"100%",height:"100%" }} />
      </div>
      {shops.length===0&&<div style={{ textAlign:"center",padding:"24px 0",color:T.textMuted,fontSize:12 }}>No tyre shops found within {radius} km. Try a larger radius.</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>{shops.map(shop=><ShopCard key={shop.id} shop={shop} selected={selected?.id===shop.id} onClick={()=>{haptic("light");setSelected(s=>s?.id===shop.id?null:shop);}} />)}</div>
    </div>
  );
}
function addMarkers(L,map,layer,coords,shops) {
  if (!L||!layer) return;
  const userIcon=L.divIcon({className:"",html:`<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 0 12px rgba(249,115,22,0.7)"></div>`,iconSize:[14,14],iconAnchor:[7,7]});
  L.marker([coords.lat,coords.lng],{icon:userIcon}).addTo(layer).bindPopup("📍 You are here");
  shops.forEach(shop=>{const shopIcon=L.divIcon({className:"",html:`<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #f97316;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>`,iconSize:[10,10],iconAnchor:[5,5]}); L.marker([shop.lat,shop.lng],{icon:shopIcon}).addTo(layer).bindPopup(`<b style="font-size:12px">${shop.name}</b>${shop.addr?`<br><span style="font-size:10px;color:#666">${shop.addr}</span>`:""}`);});
}
function ShopCard({ shop, selected, onClick }) {
  const G=useG(),T=useTokens(),ripple=useRipple();
  return (
    <div onClick={e=>{ripple(e);onClick();}} className="touch-card" style={{ ...G.card,borderRadius:12,padding:"14px 16px",cursor:"pointer",borderLeft:selected?`2px solid ${T.accent}99`:`2px solid ${T.borderFaint}`,transition:"all .25s",background:selected?`${T.accent}0a`:G.card.background,position:"relative",overflow:"hidden" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:T.text,margin:"0 0 4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{shop.name}</p>
          {shop.addr&&<p style={{ fontSize:10,color:T.textMuted,margin:0 }}>{shop.addr}</p>}
          {shop.hours&&<p style={{ fontSize:9,color:T.textFaint,margin:"2px 0 0" }}>🕐 {shop.hours}</p>}
        </div>
        <span style={{ fontSize:11,color:T.accent,fontFamily:"'Syne',sans-serif",fontWeight:700,flexShrink:0 }}>{shop.dist.toFixed(1)} km</span>
      </div>
      {selected&&(
        <div style={{ marginTop:12,paddingTop:12,borderTop:`1px solid ${T.borderFaint}`,display:"flex",gap:8,flexWrap:"wrap" }}>
          {shop.phone&&<a href={`tel:${shop.phone}`} onClick={()=>haptic("medium")} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:6,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10b981",fontSize:11,textDecoration:"none" }}>📞 {shop.phone}</a>}
          {shop.website&&<a href={shop.website} target="_blank" rel="noopener noreferrer" onClick={()=>haptic("medium")} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:6,background:`${T.accent}14`,border:`1px solid ${T.accent}33`,color:T.accent,fontSize:11,textDecoration:"none" }}>↗ Website</a>}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`} target="_blank" rel="noopener noreferrer" onClick={()=>haptic("medium")} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:6,background:T.ghost,border:`1px solid ${T.border}`,color:T.textMuted,fontSize:11,textDecoration:"none" }}>🗺 Directions</a>
        </div>
      )}
    </div>
  );
}
function LocatorStatus({ icon, msg, sub, spin, err, onRetry }) {
  const G=useG(),T=useTokens(),ripple=useRipple();
  return (
    <div style={{ marginTop:24,...G.card,borderRadius:14,padding:"28px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,textAlign:"center" }}>
      <div style={{ position:"relative",width:44,height:44 }}>
        {spin?(<><div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.accent}26` }} /><div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.accent}`,borderTopColor:"transparent",animation:"spin .88s linear infinite" }} /></>)
          :<div style={{ width:"100%",height:"100%",borderRadius:"50%",background:err?"rgba(239,68,68,0.1)":`${T.accent}14`,border:`1px solid ${err?"rgba(239,68,68,0.25)":T.accent+"33"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{icon}</div>}
      </div>
      <p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:err?"#ef4444":T.text,margin:0 }}>{msg}</p>
      <p style={{ fontSize:11,color:T.textMuted,margin:0,lineHeight:1.65 }}>{sub}</p>
      {err&&onRetry&&<button onClick={e=>{haptic("medium");ripple(e);onRetry();}} className="mag-btn touch-btn" style={{ background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,border:"none",color:"white",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.06em",padding:"10px 24px",borderRadius:8,cursor:"pointer",position:"relative",overflow:"hidden" }}>↺ TRY AGAIN</button>}
    </div>
  );
}
function haversine(lat1,lon1,lat2,lon2) {
  if (!lat1||!lon1||!lat2||!lon2) return Infinity;
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function ResponsiveNav({ page, setPage, onToggleEgg }) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const G=useG(),T=useTokens(),ripple=useRipple();
  useEffect(()=>{const check=()=>setIsMobile(window.innerWidth<=640);check();window.addEventListener("resize",check);return()=>window.removeEventListener("resize",check);},[]);
  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>24);window.addEventListener("scroll",fn,{passive:true});return()=>window.removeEventListener("scroll",fn);},[]);
  const go=useCallback(p=>{haptic("light");setPage(p);window.scrollTo({top:0,behavior:"smooth"});},[setPage]);
  const tabs=[{id:"landing",icon:"◉",label:"HOME"},{id:"diagnose",icon:"▶",label:"DIAGNOSE"},{id:"info",icon:"◎",label:"TYRE 101"},{id:"about",icon:"◈",label:"ABOUT"}];
  return (
    <>
      <nav className="no-print" style={{ position:"fixed",top:0,left:0,right:0,zIndex:500,padding:isMobile?"0 16px":"0 clamp(16px,4vw,40px)",height:56,transition:"background .5s,box-shadow .5s",...(scrolled?{...G.panel,borderRadius:0,borderLeft:"none",borderRight:"none",borderTop:"none"}:{background:"transparent",border:"none"}) }}>
        <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:"100%" }}>
          <button onClick={e=>{ripple(e);go("landing");}} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"4px 0",position:"relative",overflow:"hidden" }}>
            <div style={{ width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg viewBox="0 0 24 24" style={{ width:14,height:14 }}><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" /><circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2" fill="none" /></svg>
            </div>
            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,letterSpacing:"0.1em",fontSize:isMobile?16:18,color:T.text }}>STRADA</span>
          </button>
          {!isMobile&&(
            <div style={{ display:"flex",alignItems:"center",gap:4 }}>
              {[["diagnose","DIAGNOSE"],["info","TYRE 101"],["about","HOW IT WORKS"]].map(([p,l])=>(
                <button key={p} onClick={e=>{ripple(e);go(p);}} style={{ background:page===p?`${T.accent}1e`:"transparent",border:page===p?`1px solid ${T.accent}4d`:"1px solid transparent",color:page===p?T.accent:T.textMuted,fontSize:10,letterSpacing:"0.12em",padding:"7px 14px",borderRadius:8,cursor:"pointer",transition:"all .25s",position:"relative",overflow:"hidden" }}>{l}</button>
              ))}
              <ThemeToggle onToggleEgg={onToggleEgg} />
              <button onClick={e=>{haptic("medium");ripple(e);go("diagnose");}} className="mag-btn" style={{ marginLeft:8,background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,border:"none",color:"white",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.08em",padding:"8px 18px",borderRadius:8,cursor:"pointer",boxShadow:"0 0 18px rgba(249,115,22,0.35)" }}>ANALYSE →</button>
            </div>
          )}
          {isMobile&&<ThemeToggle onToggleEgg={onToggleEgg} />}
        </div>
      </nav>
      {isMobile&&(
        <div className="no-print" style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:500,...G.panel,borderRadius:"16px 16px 0 0",borderBottom:"none",borderLeft:"none",borderRight:"none",borderTop:`1px solid ${T.border}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",paddingBottom:"env(safe-area-inset-bottom, 8px)" }}>
          {tabs.map(tab=>(
            <button key={tab.id} onClick={e=>{ripple(e);go(tab.id);}} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 0 6px",gap:4,position:"relative",color:page===tab.id?T.accent:T.textMuted,transition:"color .2s",overflow:"hidden" }}>
              <span style={{ fontSize:16,lineHeight:1 }}>{tab.icon}</span>
              <span style={{ fontSize:7,letterSpacing:"0.1em",fontWeight:page===tab.id?700:400 }}>{tab.label}</span>
              {page===tab.id&&<div style={{ position:"absolute",top:0,width:32,height:2,borderRadius:"0 0 2px 2px",background:T.accent }} />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ setPage, onRadarTripleClick }) {
  useReveal();
  const G=useG(),T=useTokens(),{theme}=useTheme(),ripple=useRipple();
  const features=useMemo(()=>[
    {icon:"◎",n:"01",title:"Wear Classification",desc:"EfficientNet-B3 classifies wear across 5 levels — New to Bald — with sub-millimetre pattern sensitivity."},
    {icon:"▦",n:"02",title:"Tread Depth Estimation",desc:"Computer vision estimates remaining depth in mm and predicts remaining kilometres before legal minimum."},
    {icon:"⌁",n:"03",title:"Sidewall Detection",desc:"YOLOv8 detects bulges, cuts, and dry rot — sidewall damage invisible to the untrained eye."},
    {icon:"◈",n:"04",title:"Grad-CAM Heatmaps",desc:"Gradient attention maps reveal exactly which tread zones drove the AI verdict. Full explainability."},
    {icon:"◐",n:"05",title:"Pattern Diagnosis",desc:"Identifies cupping, feathering, one-sided wear — each linked to specific mechanical root causes."},
    {icon:"◑",n:"06",title:"Health Score",desc:"All module outputs synthesised into one composite A–F grade with urgency level and recommendation."},
  ],[]);
  return (
    <div>
      <section className="hero-section" style={{ minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"clamp(80px,14vh,120px) clamp(16px,5vw,40px) clamp(40px,6vh,60px)",position:"relative" }}>
        <div className="hero-badge" style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:28,...G.panel,borderRadius:100,padding:"8px 16px",flexWrap:"wrap",justifyContent:"center" }}>
          <div className="dot-pulse" style={{ width:7,height:7,borderRadius:"50%",background:T.accent,flexShrink:0 }} />
          <span style={{ fontSize:9,color:T.textSub,letterSpacing:"0.12em" }}>AI-POWERED TYRE INTELLIGENCE</span>
          <span style={{ background:`${T.accent}24`,border:`1px solid ${T.accent}4d`,color:T.accent,fontSize:9,letterSpacing:"0.1em",padding:"2px 8px",borderRadius:4 }}>BETA</span>
        </div>
        <div className="hero-title-wrap">
          <h1 className={`hero-title ${theme==="dark"?"shimmer-text":"shimmer-text-light"}`} style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(72px,14vw,168px)",lineHeight:0.87,letterSpacing:"-0.03em",margin:"0 0 24px" }}>STRADA</h1>
        </div>
        <p className="hero-desc hero-desc-wrap" style={{ fontSize:"clamp(12px,1.5vw,16px)",color:T.textSub,maxWidth:480,margin:"0 auto 44px",lineHeight:1.8,padding:"0 8px" }}>Upload tyre photos. Get a full AI diagnostic report in seconds — wear level, tread depth, pattern analysis, and explainable heatmaps.</p>
        <div className="hero-buttons hero-buttons-wrap" style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",width:"100%",maxWidth:480 }}>
          <button onClick={e=>{haptic("medium");ripple(e);setPage("diagnose");}} className="mag-btn btn-primary-shadow touch-btn" style={{ background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,border:"none",color:"white",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"clamp(13px,3vw,15px)",letterSpacing:"0.06em",padding:"16px 36px",borderRadius:13,cursor:"pointer",flex:1,position:"relative",overflow:"hidden" }}>▶ RUN DIAGNOSTIC</button>
          <button onClick={e=>{haptic("light");ripple(e);setPage("info");}} className="mag-btn touch-btn" style={{ ...G.panel,borderRadius:13,color:T.textSub,fontSize:"clamp(11px,2.5vw,13px)",letterSpacing:"0.06em",padding:"16px 28px",cursor:"pointer",border:`1px solid ${T.border}`,fontFamily:"'JetBrains Mono',monospace",flex:1,position:"relative",overflow:"hidden" }}>TYRE 101 →</button>
          <button onClick={e=>{haptic("light");ripple(e);setPage("about");}} className="mag-btn touch-btn" style={{ ...G.panel,borderRadius:13,color:T.textSub,fontSize:"clamp(11px,2.5vw,13px)",letterSpacing:"0.06em",padding:"16px 28px",cursor:"pointer",border:`1px solid ${T.border}`,fontFamily:"'JetBrains Mono',monospace",flex:1,position:"relative",overflow:"hidden" }}>HOW IT WORKS</button>
        </div>
        <div className="hero-stats hero-stats-wrap" style={{ display:"flex",gap:0,justifyContent:"center",marginTop:52 }}>
          {[["1+","photos","min needed"],["4","models","in parallel"],["<2s","","inference"]].map((st,i)=>(
            <div key={i} style={{ textAlign:"center",padding:"0 clamp(16px,4vw,36px)",borderRight:i<2?`1px solid ${T.border}`:"none" }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(20px,3vw,30px)",color:T.text,lineHeight:1 }}>{st[0]}<span style={{ color:T.accent,fontSize:"0.55em",letterSpacing:"0.08em",marginLeft:2 }}>{st[1]}</span></div>
              <div style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.1em",marginTop:7,textTransform:"uppercase" }}>{st[2]}</div>
            </div>
          ))}
        </div>
        <div className="hero-radar-outer" style={{ marginTop:56,display:"flex",flexDirection:"column",alignItems:"center",gap:32 }}>
          <DiagnosticHero onRadarTripleClick={onRadarTripleClick} />
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:0.28 }}>
            <span style={{ fontSize:9,letterSpacing:"0.22em",color:T.textMuted }}>SCROLL</span>
            <div style={{ width:1,height:36,background:`linear-gradient(180deg,${T.textMuted},transparent)` }} />
          </div>
        </div>
      </section>
      <section style={{ maxWidth:1100,margin:"0 auto",padding:"clamp(48px,8vh,120px) clamp(16px,5vw,40px)" }}>
        <div className="strada-reveal" style={{ textAlign:"center",marginBottom:"clamp(36px,6vh,80px)" }}>
          <p style={{ fontSize:10,color:T.accent,letterSpacing:"0.22em",marginBottom:12 }}>DIAGNOSTIC MODULES</p>
          <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(28px,5vw,54px)",color:T.text,letterSpacing:"-0.03em",lineHeight:1.1,margin:"0 0 12px" }}>Six AI Engines.<br /><span style={{ color:T.textMuted }}>One Verdict.</span></h2>
        </div>
        <div className="grid3">{features.map((f,i)=><div key={i} className="strada-reveal lift-card touch-card" style={{ ...G.card,borderRadius:18,padding:"clamp(18px,3vw,28px)",position:"relative",overflow:"hidden" }}><div style={{ position:"absolute",top:-8,right:12,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:88,color:`${T.accent}0a`,lineHeight:1,userSelect:"none",pointerEvents:"none" }}>{f.n}</div><div style={{ fontSize:20,marginBottom:12,color:T.accent }}>{f.icon}</div><h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:T.text,letterSpacing:"-0.01em",margin:"0 0 8px" }}>{f.title}</h3><p style={{ fontSize:12,color:T.textMuted,lineHeight:1.78,margin:0 }}>{f.desc}</p></div>)}</div>
      </section>
      <section className="strada-reveal" style={{ maxWidth:900,margin:"0 auto clamp(80px,12vh,130px)",padding:"0 clamp(16px,5vw,40px)" }}>
        <div style={{ ...G.panel,borderRadius:24,padding:"clamp(24px,5vw,56px)",position:"relative",overflow:"hidden",border:`1px solid ${T.accent}2e` }}>
          <div style={{ position:"absolute",top:0,right:0,width:"40%",height:"100%",background:`linear-gradient(135deg,transparent,${T.accent}0a)`,pointerEvents:"none" }} />
          <p style={{ fontSize:10,color:T.accent,letterSpacing:"0.22em",marginBottom:10 }}>PIPELINE</p>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(20px,4vw,34px)",color:T.text,margin:"0 0 36px",letterSpacing:"-0.02em" }}>Upload → Analyse → Report</h3>
          <div className="pipeline-steps" style={{ display:"flex",gap:0,position:"relative" }}>
            <div className="step-line" style={{ position:"absolute",top:28,left:32,right:32,height:1,background:`linear-gradient(90deg,${T.accent}66,${T.accent}1a,transparent)` }} />
            {["Upload Photo","Flask runs 4 models","Grad-CAM + scores","Full report ready"].map((step,i)=>(
              <div key={i} className="pipeline-step" style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:14,textAlign:"center",padding:"0 6px" }}>
                <div style={{ width:52,height:52,borderRadius:"50%",background:i===0?`linear-gradient(135deg,${T.accentMid},${T.accentDark})`:G.card.background,border:`1px solid ${T.accent}4d`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:i===0?"0 0 18px rgba(249,115,22,0.4)":"none",position:"relative",zIndex:1 }}>
                  <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:i===0?"white":`${T.accent}8c` }}>0{i+1}</span>
                </div>
                <span className="pipeline-step-text" style={{ fontSize:11,color:T.textMuted,lineHeight:1.55,letterSpacing:"0.02em" }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:44,textAlign:"center" }}>
            <button onClick={e=>{haptic("medium");ripple(e);setPage("diagnose");}} className="mag-btn touch-btn" style={{ background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,border:"none",color:"white",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"clamp(13px,3vw,14px)",letterSpacing:"0.06em",padding:"15px 36px",borderRadius:11,cursor:"pointer",boxShadow:"0 0 24px rgba(249,115,22,0.35)",width:"100%",maxWidth:280,position:"relative",overflow:"hidden" }}>START DIAGNOSTIC →</button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage() {
  useReveal();
  const G=useG(),T=useTokens();
  const steps=useMemo(()=>[
    {n:"01",title:"Upload Images",desc:"Provide 1–5 photos — tread close-up, left/right profiles, area of interest, and optional sidewall crack scan for maximum coverage."},
    {n:"02",title:"Multi-Model Inference",desc:"EfficientNet-B3, CNN pattern classifier, YOLOv8, and EasyOCR (for DOT code) run simultaneously on your uploaded images."},
    {n:"03",title:"Grad-CAM Explained",desc:"A backward pass generates gradient-weighted attention maps highlighting exactly which tread regions drove the wear classification verdict."},
    {n:"04",title:"Health Score Synthesis",desc:"All outputs aggregated into a composite 0–100 health score graded A–F, with urgency level (low/medium/high) and plain-English recommendation."},
    {n:"05",title:"Full Diagnostic Report",desc:"A printable report with gauges, depth bars, score breakdowns, Grad-CAM image, submitted photos, and quality warnings is instantly generated."},
  ],[]);
  return (
    <div style={{ maxWidth:780,margin:"0 auto",padding:"clamp(76px,10vh,120px) clamp(16px,5vw,40px) clamp(80px,10vh,80px)" }}>
      <div className="strada-reveal" style={{ marginBottom:56 }}>
        <p style={{ fontSize:10,color:T.accent,letterSpacing:"0.22em",marginBottom:14 }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(32px,7vw,70px)",color:T.text,letterSpacing:"-0.03em",margin:"0 0 18px",lineHeight:0.94 }}>THE DIAGNOSTIC<br /><span style={{ color:T.textMuted }}>PIPELINE.</span></h2>
        <p style={{ fontSize:13,color:T.textMuted,lineHeight:1.85,maxWidth:540 }}>Strada runs a chain of computer vision models on your tyre images, each specialising in a distinct aspect of tyre health.</p>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:56 }}>
        {steps.map((st,i)=><div key={i} className="strada-reveal lift-card touch-card" style={{ ...G.card,borderRadius:16,padding:"clamp(16px,3vw,28px) clamp(16px,3vw,32px)",display:"flex",gap:20,alignItems:"flex-start",borderLeft:`1px solid ${T.accent}1e` }}><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(32px,5vw,44px)",color:`${T.accent}29`,letterSpacing:"-0.04em",lineHeight:1,flexShrink:0,minWidth:50,userSelect:"none" }}>{st.n}</div><div style={{ paddingTop:4 }}><h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:T.text,margin:"0 0 6px",letterSpacing:"-0.01em" }}>{st.title}</h3><p style={{ fontSize:12,color:T.textMuted,lineHeight:1.78,margin:0 }}>{st.desc}</p></div></div>)}
      </div>
      <div className="strada-reveal" style={{ ...G.panel,borderRadius:20,padding:"clamp(20px,4vw,40px)",marginBottom:14 }}>
        <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.18em",marginBottom:16,textTransform:"uppercase" }}>Tech Stack</p>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>{["EfficientNet-B3","YOLOv8","pytorch-grad-cam","EasyOCR","Flask","React + Vite","OpenCV","PyTorch"].map(t=><span key={t} style={{ ...G.ghost,borderRadius:6,padding:"6px 12px",fontSize:11,color:T.textMuted,letterSpacing:"0.04em" }}>{t}</span>)}</div>
      </div>
      <div className="strada-reveal" style={{ borderRadius:16,border:`1px solid ${T.accent}2e`,background:`${T.accent}0a`,padding:"clamp(14px,3vw,24px)" }}>
        <p style={{ fontSize:9,color:T.accent,letterSpacing:"0.16em",marginBottom:8,textTransform:"uppercase" }}>Disclaimer</p>
        <p style={{ fontSize:12,color:T.textMuted,lineHeight:1.8,margin:0 }}>Strada is an AI diagnostic aid, not a replacement for professional tyre inspection. Always consult a certified technician before making safety-critical decisions.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── UNIFIED UPLOAD CARD — Single-Photo-First UX ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Hero zone — the big primary upload area
function HeroZone({ file, onUpload, onRemove, T }) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);
  const preview = usePreview(file);
  const ripple = useRipple();

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) { haptic("light"); onUpload(PRIMARY_SLOT.id, f); }
  };
  const handleChange = (e) => { if (e.target.files[0]) { haptic("light"); onUpload(PRIMARY_SLOT.id, e.target.files[0]); } };

  const borderClass = dragging ? "uuc-hero-drag" : file ? "uuc-hero-filled" : "uuc-hero-idle";

  return (
    <div
      className={borderClass}
      onDragOver={e=>{e.preventDefault();setDragging(true);}}
      onDragLeave={()=>setDragging(false)}
      onDrop={handleDrop}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      onClick={e=>{ if (!file){ripple(e);inputRef.current?.click();} }}
      style={{ position:"relative",width:"100%",height:"clamp(200px,32vw,280px)",borderRadius:16,overflow:"hidden",cursor:file?"default":"pointer",background:file?"rgba(0,0,0,0.55)":dragging?"rgba(249,115,22,0.07)":T.ghost,transition:"background .25s",WebkitTapHighlightColor:"transparent" }}
    >
      {preview ? (
        <>
          <img src={preview} alt="Primary tyre photo" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",filter:hovered?"brightness(0.5)":"brightness(0.82)",transition:"filter .3s" }} />
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0) 55%)" }} />
          {/* ✓ badge */}
          <div className="uuc-check-pop" style={{ position:"absolute",top:12,left:12,background:"rgba(16,185,129,0.92)",borderRadius:7,padding:"4px 10px",display:"flex",alignItems:"center",gap:5 }}>
            <span style={{ color:"#fff",fontSize:10 }}>✓</span>
            <span style={{ color:"#fff",fontSize:9,letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>PRIMARY UPLOADED</span>
          </div>
          {/* Filename */}
          <div style={{ position:"absolute",bottom:14,left:16,right:90 }}>
            <p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#fff",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{file.name}</p>
            <p style={{ fontSize:9,color:"rgba(255,255,255,0.5)",margin:"2px 0 0",letterSpacing:"0.06em",fontFamily:"'JetBrains Mono',monospace" }}>{PRIMARY_SLOT.hint.toUpperCase()}</p>
          </div>
          {/* Replace + Remove buttons */}
          <div style={{ position:"absolute",top:10,right:10,display:"flex",gap:6 }}>
            <button onClick={e=>{e.stopPropagation();haptic("light");inputRef.current?.click();}} style={{ background:"rgba(0,0,0,0.72)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:9,color:"rgba(255,255,255,0.8)",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>↺ REPLACE</button>
            <button onClick={e=>{e.stopPropagation();haptic("medium");onRemove(PRIMARY_SLOT.id);}} style={{ background:"rgba(239,68,68,0.88)",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:9,color:"#fff",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>✕</button>
          </div>
        </>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:14,padding:"24px 20px",textAlign:"center" }}>
          {/* Animated rings */}
          <div style={{ position:"relative",width:64,height:64,flexShrink:0 }}>
            <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`2px dashed ${dragging?"#f97316":T.border}`,transition:"border-color .25s" }} />
            <div style={{ position:"absolute",inset:10,borderRadius:"50%",border:`1px solid ${dragging?"rgba(249,115,22,0.5)":T.borderFaint}`,transition:"border-color .25s" }} />
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:dragging?"#f97316":T.textMuted,transition:"color .25s" }}>{dragging?"↓":"◎"}</div>
          </div>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:dragging?"#f97316":T.text,margin:"0 0 6px",transition:"color .25s" }}>{dragging?"Drop to upload":"Tap or drop photo here"}</p>
            <p style={{ fontSize:10,color:T.textMuted,margin:0,lineHeight:1.65 }}>Primary tyre photo · JPG, PNG, HEIC accepted</p>
          </div>
          {!dragging&&(
            <div style={{ background:`${T.accent}18`,border:`1px solid ${T.accent}40`,borderRadius:100,padding:"7px 18px",display:"flex",alignItems:"center",gap:7 }}>
              <span style={{ fontSize:11,color:T.accent }}>▲</span>
              <span style={{ fontSize:10,color:T.accent,letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace" }}>UPLOAD IMAGE</span>
            </div>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleChange} />
    </div>
  );
}

// Compact optional slot tile for the 2×2 grid
function OptionalTile({ slot, file, onUpload, onRemove, T }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const preview = usePreview(file);
  const ripple = useRipple();
  return (
    <div
      onDragOver={e=>{e.preventDefault();setDragging(true);}}
      onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){haptic("light");onUpload(slot.id,f);}}}
      onClick={e=>{if(!file){ripple(e);inputRef.current?.click();}}}
      style={{ position:"relative",height:"clamp(88px,14vw,116px)",borderRadius:12,overflow:"hidden",cursor:file?"default":"pointer",transition:"border-color .2s,background .2s",WebkitTapHighlightColor:"transparent",...(dragging?{background:"rgba(249,115,22,0.1)",border:"1.5px dashed #f97316"}:file?{background:"rgba(0,0,0,0.45)",border:`1px solid ${T.border}`}:{background:T.ghost,border:`1px dashed ${T.border}`}) }}
    >
      {preview?(
        <>
          <img src={preview} alt={slot.label} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0) 50%)" }} />
          <div style={{ position:"absolute",top:5,left:5,background:"rgba(16,185,129,0.9)",borderRadius:4,padding:"2px 6px",fontSize:8,color:"#fff",letterSpacing:"0.06em" }}>✓</div>
          <button onClick={e=>{e.stopPropagation();haptic("medium");onRemove(slot.id);}} style={{ position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.65)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,0.75)",fontSize:9 }}>✕</button>
          <p style={{ position:"absolute",bottom:5,left:0,right:0,textAlign:"center",fontSize:8,color:"rgba(255,255,255,0.6)",margin:0,letterSpacing:"0.06em",fontFamily:"'JetBrains Mono',monospace" }}>{slot.label.toUpperCase()}</p>
        </>
      ):(
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:6,padding:8 }}>
          <div style={{ width:28,height:28,borderRadius:8,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",background:dragging?"rgba(249,115,22,0.12)":T.ghost }}>
            <span style={{ color:dragging?"#f97316":T.textMuted,fontSize:13 }}>{dragging?"↓":slot.icon}</span>
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:9,color:dragging?"#f97316":T.textSub,margin:"0 0 1px",letterSpacing:"0.04em" }}>{slot.label}</p>
            <p style={{ fontSize:8,color:T.textFaint,margin:0,letterSpacing:"0.02em" }}>{slot.hint}</p>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e=>{if(e.target.files[0]){haptic("light");onUpload(slot.id,e.target.files[0]);}}} />
    </div>
  );
}

// The main card component — drop-in replacement
function UnifiedUploadCard({ files, onUpload, onRemove }) {
  const T = useTokens(), G = useG(), ripple = useRipple();
  const [accordionOpen, setAccordionOpen] = useState(false);
  const primaryFile  = files[PRIMARY_SLOT.id];
  const optionalCount = OPTIONAL_SLOTS.filter(s => files[s.id]).length;
  const totalCount    = (primaryFile ? 1 : 0) + optionalCount;
  const totalSlots    = 1 + OPTIONAL_SLOTS.length;
  return (
    <div style={{ ...G.card,borderRadius:20,padding:"clamp(16px,4vw,28px)",marginBottom:24 }}>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
        <div>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:T.text,margin:"0 0 3px" }}>Upload Tyre Photo</h3>
          <p style={{ fontSize:10,color:T.textMuted,margin:0 }}>One photo is enough — more angles improve accuracy</p>
        </div>
        <div style={{ display:"flex",alignItems:"baseline",gap:2 }}>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:totalCount>0?T.accent:T.textFaint,transition:"color .3s" }}>{totalCount}</span>
          <span style={{ fontSize:11,color:T.textMuted,fontFamily:"'JetBrains Mono',monospace" }}>/{totalSlots}</span>
        </div>
      </div>
      {/* Progress */}
      <div style={{ height:3,background:T.ghost,borderRadius:2,overflow:"hidden",marginBottom:18 }}>
        <div style={{ height:"100%",borderRadius:2,width:`${(totalCount/totalSlots)*100}%`,background:`linear-gradient(90deg,${T.accentMid},${T.accent})`,transition:"width .6s cubic-bezier(.16,1,.3,1)" }} />
      </div>
      {/* Tip */}
      <div style={{ display:"flex",gap:10,padding:"10px 14px",borderRadius:10,background:`${T.accent}0d`,border:`1px solid ${T.accent}1e`,marginBottom:18 }}>
        <span style={{ fontSize:13,flexShrink:0,marginTop:1 }}>💡</span>
        <p style={{ fontSize:10,color:T.textMuted,margin:0,lineHeight:1.65 }}><span style={{ color:`${T.accent}cc`,fontWeight:600 }}>Tip:</span> Place a coin in the tread groove to help the AI calibrate depth.</p>
      </div>
      {/* Hero zone */}
      <HeroZone file={primaryFile} onUpload={onUpload} onRemove={onRemove} T={T} />
      {/* Accordion toggle */}
      <button
        onClick={e=>{haptic("light");ripple(e);setAccordionOpen(o=>!o);}}
        style={{ width:"100%",marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 16px",borderRadius:11,cursor:"pointer",background:accordionOpen?`${T.accent}12`:T.ghost,border:`1px solid ${accordionOpen?T.accent+"44":T.border}`,color:accordionOpen?T.accent:T.textMuted,fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:"0.1em",transition:"all .25s",position:"relative",overflow:"hidden" }}
      >
        <span style={{ fontSize:13,transition:"transform .25s",transform:accordionOpen?"rotate(45deg)":"none",display:"inline-block" }}>+</span>
        {accordionOpen
          ? `HIDE OPTIONAL ANGLES${optionalCount>0?` · ${optionalCount} ADDED`:""}`
          : `ADD MORE ANGLES FOR DEEPER ANALYSIS (OPTIONAL)${optionalCount>0?` · ${optionalCount} ADDED`:""}`}
        {optionalCount>0&&!accordionOpen&&<div style={{ width:7,height:7,borderRadius:"50%",background:"#10b981",flexShrink:0 }} />}
      </button>
      {/* Accordion content */}
      {accordionOpen&&(
        <div className="uuc-accordion" style={{ marginTop:14 }}>
          <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:"0 0 10px",textAlign:"center" }}>OPTIONAL · ADDS SIDEWALL, PROFILE & DETAIL ANALYSIS</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10 }}>
            {OPTIONAL_SLOTS.map(slot=><OptionalTile key={slot.id} slot={slot} file={files[slot.id]} onUpload={onUpload} onRemove={onRemove} T={T} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DIAGNOSTIC LOADER ────────────────────────────────────────────────────────
const DIAGNOSTIC_STEPS = [
  {id:"wear",    label:"Classifying wear level",      detail:"EfficientNet-B3 running…",  duration:950},
  {id:"pattern", label:"Analysing wear pattern",      detail:"CNN pattern classifier…",   duration:850},
  {id:"depth",   label:"Estimating tread depth",      detail:"Depth prediction model…",   duration:1050},
  {id:"sidewall",label:"Scanning sidewall damage",    detail:"YOLOv8 object detection…",  duration:900},
  {id:"gradcam", label:"Generating Grad-CAM heatmap", detail:"Gradient attention map…",   duration:1100},
  {id:"score",   label:"Synthesising health score",   detail:"Aggregating all outputs…",  duration:700},
];
function DiagnosticLoader() {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const G=useG(),T=useTokens();
  useEffect(()=>{
    let stepIdx=0,timeout;
    const advance=()=>{
      if (stepIdx>=DIAGNOSTIC_STEPS.length) return;
      setActiveStep(stepIdx);
      timeout=setTimeout(()=>{setCompletedSteps(prev=>[...prev,DIAGNOSTIC_STEPS[stepIdx].id]);stepIdx++;if(stepIdx<DIAGNOSTIC_STEPS.length)setTimeout(advance,80);},DIAGNOSTIC_STEPS[stepIdx].duration);
    };
    advance();
    return ()=>clearTimeout(timeout);
  },[]);
  return (
    <div style={{ marginTop:24,...G.card,borderRadius:20,padding:"clamp(16px,4vw,28px)" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${T.borderFaint}` }}>
        <div style={{ position:"relative",width:34,height:34,flexShrink:0 }}>
          <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.accent}26` }} />
          <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${T.accent}`,borderTopColor:"transparent",animation:"spin .88s linear infinite" }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:T.text,margin:"0 0 2px" }}>Running Diagnostic</p>
          <p style={{ fontSize:10,color:T.textFaint,margin:0,letterSpacing:"0.06em" }}>{completedSteps.length}/{DIAGNOSTIC_STEPS.length} modules complete</p>
        </div>
        <div style={{ display:"flex",gap:3,flexShrink:0 }}>
          {DIAGNOSTIC_STEPS.map((s,i)=><div key={s.id} style={{ width:completedSteps.includes(s.id)?12:activeStep===i?8:4,height:4,borderRadius:2,background:completedSteps.includes(s.id)?"#10b981":activeStep===i?T.accent:T.ghost,transition:"all .3s cubic-bezier(.16,1,.3,1)" }} />)}
        </div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {DIAGNOSTIC_STEPS.map((step,i)=>{
          const done=completedSteps.includes(step.id),active=activeStep===i&&!done;
          return (
            <div key={step.id} className={done||active?"status-anim":""} style={{ display:"flex",alignItems:"center",gap:12,padding:"9px 12px",borderRadius:10,background:active?`${T.accent}0d`:done?"rgba(16,185,129,0.04)":"transparent",border:active?`1px solid ${T.accent}26`:done?"1px solid rgba(16,185,129,0.1)":"1px solid transparent",transition:"all .3s ease" }}>
              <div style={{ width:20,height:20,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:done?"rgba(16,185,129,0.15)":active?`${T.accent}1e`:T.ghost,border:done?"1px solid rgba(16,185,129,0.3)":active?`1px solid ${T.accent}4d`:`1px solid ${T.border}` }}>
                {done?<span style={{ color:"#10b981",fontSize:10 }}>✓</span>:active?<div style={{ width:6,height:6,borderRadius:"50%",background:T.accent,animation:"pulse 1s ease-in-out infinite" }} />:<div style={{ width:4,height:4,borderRadius:"50%",background:T.textFaint }} />}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:11,margin:"0 0 1px",color:done?T.textMuted:active?T.text:T.textFaint,fontFamily:active?"'Syne',sans-serif":"'JetBrains Mono',monospace",fontWeight:active?600:400,transition:"all .25s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{step.label}</p>
                {active&&<p style={{ fontSize:9,color:`${T.accent}8c`,margin:0,letterSpacing:"0.06em" }}>{step.detail}</p>}
              </div>
              <span style={{ fontSize:9,letterSpacing:"0.1em",flexShrink:0,color:done?"#10b981":active?T.accent:T.textFaint }}>{done?"DONE":active?"RUN":"…"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HEALTH / SCORE COMPONENTS ────────────────────────────────────────────────
function HealthGauge({ score, grade, label, color }) {
  const c=SVG_C[color]||"#52525b",T=useTokens();
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
      <div style={{ position:"relative",width:110,height:110 }}>
        <svg viewBox="0 0 100 100" style={{ width:"100%",height:"100%",transform:"rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke={T.ghost} strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="8" strokeDasharray={`${(score/100)*263.9} 263.9`} strokeLinecap="round" style={{ filter:`drop-shadow(0 0 8px ${c})`,transition:"stroke-dasharray 1.3s cubic-bezier(.16,1,.3,1)" }} />
        </svg>
        <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:c,lineHeight:1 }}>{grade}</span>
          <span style={{ fontSize:9,color:T.textMuted }}>{score}/100</span>
        </div>
      </div>
      <span style={{ fontSize:9,color:c,letterSpacing:"0.14em",textTransform:"uppercase" }}>{label}</span>
    </div>
  );
}
function ScoreBar({ label, score, max, sublabel }) {
  const pct=(score/max)*100,c=pct>=70?"#10b981":pct>=40?"#f59e0b":"#ef4444",T=useTokens();
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
      <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:2 }}>
        <span style={{ fontSize:11,color:T.textMuted,letterSpacing:"0.08em",textTransform:"uppercase" }}>{label}</span>
        <span style={{ fontSize:10,color:T.textFaint }}>{score}/{max} · {sublabel}</span>
      </div>
      <div style={{ height:3,background:T.ghost,borderRadius:2,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:c,borderRadius:2,transition:"width 1.5s cubic-bezier(.16,1,.3,1)" }} />
      </div>
    </div>
  );
}
function DepthMeter({ depth_mm, status, color, remaining_km }) {
  const pct=Math.min((depth_mm/9)*100,100),c=SVG_C[color]||"#52525b",T=useTokens();
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap" }}>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(28px,6vw,36px)",color:c,lineHeight:1 }}>{depth_mm}</span>
        <span style={{ fontSize:13,color:T.textMuted }}>mm</span>
        <span style={{ marginLeft:"auto",fontSize:11,color:c,letterSpacing:"0.1em" }}>{status}</span>
      </div>
      <div style={{ height:5,background:T.ghost,borderRadius:3,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:c,borderRadius:3,transition:"width 1.5s cubic-bezier(.16,1,.3,1)" }} />
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:T.textFaint,letterSpacing:"0.07em" }}>
        <span>0mm</span><span style={{ color:`${T.accent}8c` }}>▲ 1.6 legal min</span><span>9mm new</span>
      </div>
      {remaining_km!=null&&<p style={{ fontSize:11,color:T.textMuted,margin:0 }}>~{remaining_km.toLocaleString()} km remaining</p>}
    </div>
  );
}
function EditableTyreAgeCard({ tyreAge, onChange }) {
  const [editing,setEditing]=useState(false),[value,setValue]=useState(tyreAge?.age_display||"Unknown"),inputRef=useRef(null);
  const G=useG(),T=useTokens();
  useEffect(()=>{if(editing&&inputRef.current)inputRef.current.focus();},[editing]);
  const commit=()=>{setEditing(false);onChange?.(value);};
  const isHighlight=tyreAge?.status==="Replace";
  return (
    <div style={{ ...G.card,borderRadius:12,padding:"14px 16px",borderLeft:`2px solid ${isHighlight?"rgba(239,68,68,0.4)":T.borderFaint}` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4 }}>
        <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:0,textTransform:"uppercase" }}>TYRE AGE</p>
        <button onClick={()=>{haptic("light");if(editing)commit();else setEditing(true);}} style={{ background:editing?`${T.accent}26`:T.ghost,border:editing?`1px solid ${T.accent}4d`:`1px solid ${T.border}`,color:editing?T.accent:T.textMuted,fontSize:9,letterSpacing:"0.1em",padding:"5px 10px",borderRadius:5,cursor:"pointer" }}>{editing?"SAVE":"EDIT"}</button>
      </div>
      {editing?<input ref={inputRef} value={value} onChange={e=>setValue(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setEditing(false);setValue(tyreAge?.age_display||"Unknown");}}} style={{ width:"100%",background:`${T.accent}0d`,border:`1px solid ${T.accent}4d`,color:T.accent,fontSize:14,fontFamily:"'Syne',sans-serif",fontWeight:700,padding:"6px 10px",borderRadius:7,outline:"none",marginBottom:4 }} />
        :<p style={{ fontSize:14,fontFamily:"'Syne',sans-serif",fontWeight:700,color:isHighlight?"#ef4444":T.text,margin:"0 0 3px" }}>{value}</p>}
      <p style={{ fontSize:10,color:T.textFaint,margin:0,lineHeight:1.55 }}>{tyreAge?.manufacture||""}{!tyreAge?.dot_found?" (DOT not detected)":""}</p>
    </div>
  );
}
function MiniCard({ label, value, sub, highlight }) {
  const G=useG(),T=useTokens();
  return (
    <div style={{ ...G.card,borderRadius:12,padding:"14px 16px",borderLeft:`2px solid ${highlight?"rgba(239,68,68,0.4)":T.borderFaint}` }}>
      <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:"0 0 5px",textTransform:"uppercase" }}>{label}</p>
      <p style={{ fontSize:14,fontFamily:"'Syne',sans-serif",fontWeight:700,color:highlight?"#ef4444":T.text,margin:"0 0 3px" }}>{value}</p>
      {sub&&<p style={{ fontSize:10,color:T.textMuted,margin:0,lineHeight:1.55 }}>{sub}</p>}
    </div>
  );
}
function GradCamDisplay({ base64, originalBase64 }) {
  const T=useTokens();
  return (
    <div style={{ borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`,position:"relative" }}>
      {originalBase64&&<img src={`data:image/jpeg;base64,${originalBase64}`} alt="Original tread" style={{ width:"100%",objectFit:"contain",maxHeight:240,display:"block" }} />}
      <img src={`data:image/jpeg;base64,${base64}`} alt="Grad-CAM" className={originalBase64?"gradcam-img":""} style={{ width:"100%",objectFit:"contain",maxHeight:240,display:"block",...(originalBase64?{position:"absolute",inset:0,height:"100%",mixBlendMode:"multiply",filter:"saturate(1.8) contrast(1.1)"}:{}) }} />
      <div style={{ position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.6)",borderRadius:5,padding:"3px 8px",fontSize:9,color:`${useTokens().accent}cc`,letterSpacing:"0.1em" }}>GRAD-CAM</div>
      <div style={{ position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.6)",borderRadius:5,padding:"3px 8px",fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:"0.08em" }}>{originalBase64?"OVERLAY":"HEATMAP"}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PRINT REPORT — ALL COLOURS HARDCODED, NO useTokens() ────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Hardcoded print palette — always light, always readable on white paper
const PT = {
  text: "#111111", textSub: "#333333", textMuted: "#666666", textFaint: "#999999",
  bg: "#ffffff", surface: "#fafafa", border: "#e5e7eb",
  accent: "#ea580c", green: "#059669", yellow: "#d97706", red: "#dc2626",
};

function PrintReport({ result, previews }) {
  const portalNode = useRef(null);
  if (!portalNode.current) {
    const stale = document.getElementById("strada-print-portal");
    if (stale) stale.remove();
    const node = document.createElement("div");
    node.id = "strada-print-portal";
    node.style.cssText = "display:none;position:fixed;left:-99999px;top:0;visibility:hidden;background:#fff;color:#111;";
    document.body.appendChild(node);
    portalNode.current = node;
  }
  useEffect(() => { return () => { if (portalNode.current) { portalNode.current.remove(); portalNode.current = null; } }; }, []);

  const urgency     = result.urgency || "medium";
  const health      = result?.health || {};
  const depth       = result?.tread_depth || {};
  const breakdown   = health.breakdown || {};
  const depthPct    = Math.min(((depth.depth_mm||0)/9)*100,100);
  const depthColor  = depthPct>=60?PT.green:depthPct>=25?PT.yellow:PT.red;
  const healthColor = health.color==="green"?PT.green:health.color==="yellow"?PT.yellow:PT.red;
  const urgencyColor= urgency==="high"?PT.red:urgency==="medium"?PT.yellow:PT.green;
  const urgencyLabel= urgency==="high"?"CRITICAL":urgency==="medium"?"MODERATE":"LOW RISK";
  const urgencyNote = urgency==="high"?"Replace immediately — unsafe to drive.":urgency==="medium"?"Replace within 2 weeks / 1,000 km.":"Monitor at next service interval.";
  const now         = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  const time        = new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  const reportId    = `STR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Shared inline style helper for print — hardcoded, no theme vars
  const pf = (styles) => ({ fontFamily:"'Helvetica Neue',Helvetica,Arial,sans-serif", ...styles });

  const content = (
    <>
      {/* ── PAGE 1 ── */}
      <div className="print-page" style={{ padding:"0 0 24pt",position:"relative",background:"#ffffff",color:"#111111" }}>
        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12pt" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10pt" }}>
            <div style={{ width:"36pt",height:"36pt",borderRadius:"8pt",background:"#ea6500",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={pf({ fontWeight:900,fontSize:"18pt",color:"#ffffff",lineHeight:1 })}>S</span>
            </div>
            <div>
              <p className="pt-h1" style={{ fontSize:"22pt" }}>STRADA</p>
              <p className="pt-label" style={{ marginBottom:0 }}>AI TYRE DIAGNOSTIC REPORT</p>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <p className="pt-small" style={{ margin:0,fontWeight:700 }}>Report ID: {reportId}</p>
            <p className="pt-small" style={{ margin:"3pt 0 0" }}>{now} at {time}</p>
            <p className="pt-small" style={{ margin:"2pt 0 0",color:"#aaa" }}>FOR WORKSHOP / PROFESSIONAL USE</p>
          </div>
        </div>
        <hr className="pt-rule-heavy" style={{ marginBottom:"12pt" }} />

        {/* Urgency badge */}
        <div className={`pt-badge pt-badge-${urgency}`} style={{ marginBottom:"12pt" }}>
          <div style={{ width:"10pt",height:"10pt",borderRadius:"50%",background:urgencyColor,flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <span style={pf({ fontWeight:900,fontSize:"12pt",color:urgencyColor })}>{urgencyLabel}</span>
            <span style={pf({ fontSize:"9pt",color:"#444444",marginLeft:"8pt" })}>{result.recommendation||"See full report for details."}</span>
          </div>
        </div>

        {/* KPI grid — 3 columns */}
        <div className="pt-kpi-grid print-no-break" style={{ marginBottom:"10pt" }}>
          {/* Health gauge */}
          <div className="pt-kpi">
            <p className="pt-label">OVERALL HEALTH</p>
            <div style={{ display:"flex",alignItems:"center",gap:"10pt" }}>
              <svg viewBox="0 0 60 60" style={{ width:"45pt",height:"45pt",transform:"rotate(-90deg)",flexShrink:0 }}>
                <circle cx="30" cy="30" r="25" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                <circle cx="30" cy="30" r="25" fill="none" stroke={healthColor} strokeWidth="5" strokeDasharray={`${((health.score??0)/100)*157.1} 157.1`} strokeLinecap="round" />
              </svg>
              <div>
                <p className="pt-value" style={{ color:healthColor,fontSize:"24pt" }}>{health.grade||"—"}</p>
                <p className="pt-small">{health.score??"—"}/100</p>
                <p className="pt-small" style={{ fontStyle:"italic" }}>{health.label||""}</p>
              </div>
            </div>
          </div>
          {/* Tread depth */}
          <div className="pt-kpi">
            <p className="pt-label">TREAD DEPTH</p>
            <p className="pt-value" style={{ color:depthColor }}>{depth.depth_mm??"—"}<span style={pf({ fontSize:"11pt",fontWeight:400,color:"#666666" })}> mm</span></p>
            <p className="pt-small" style={{ marginBottom:"5pt" }}>{depth.status||""}</p>
            <div className="pt-bar-track">
              <div style={{ width:`${depthPct}%`,height:"100%",background:depthColor,borderRadius:"3pt" }} />
            </div>
            <p className="pt-small" style={{ marginTop:"4pt" }}>Min: 1.6 mm{depth.remaining_km!=null?` · ~${depth.remaining_km.toLocaleString()} km left`:""}</p>
          </div>
          {/* Urgency */}
          <div className="pt-kpi">
            <p className="pt-label">URGENCY LEVEL</p>
            <p className="pt-value" style={{ fontSize:"16pt",color:urgencyColor }}>{urgencyLabel}</p>
            <p className="pt-small" style={{ marginTop:"4pt",lineHeight:1.5 }}>{urgencyNote}</p>
          </div>
        </div>

        {/* 4-column detail row */}
        <div className="pt-4col print-no-break" style={{ marginBottom:"10pt" }}>
          <div className="pt-kpi-2">
            <p className="pt-label">WEAR LEVEL</p>
            <p style={pf({ fontWeight:700,fontSize:"11pt",color:urgency==="high"?PT.red:PT.text,margin:"4pt 0 2pt" })}>{result.wear_level||"—"}</p>
            {result.cause&&<p className="pt-small" style={{ fontStyle:"italic" }}>{result.cause}</p>}
          </div>
          <div className="pt-kpi-2">
            <p className="pt-label">WEAR PATTERN</p>
            <p style={pf({ fontWeight:700,fontSize:"11pt",color:PT.text,margin:"4pt 0 2pt" })}>{result.pattern||"—"}</p>
            {result.cause&&<p className="pt-small" style={{ fontStyle:"italic" }}>{result.cause}</p>}
          </div>
          <div className="pt-kpi-2">
            <p className="pt-label">TYRE AGE / DOT</p>
            <p style={pf({ fontWeight:700,fontSize:"11pt",color:PT.text,margin:"4pt 0 2pt" })}>{result.tyre_age?.age_display||"Unknown"}</p>
            <p className="pt-small">{result.tyre_age?.manufacture||""}{!result.tyre_age?.dot_found?" (DOT not detected)":""}</p>
          </div>
          <div className="pt-kpi-2">
            <p className="pt-label">SIDEWALL</p>
            <p style={pf({ fontWeight:700,fontSize:"11pt",color:result.sidewall&&result.sidewall!=="None"?PT.red:PT.green,margin:"4pt 0 2pt" })}>{result.sidewall==="None"?"No damage":result.sidewall||"—"}</p>
            <p className="pt-small">{result.sidewall&&result.sidewall!=="None"?"⚠ Inspect immediately":"Visually clear"}</p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="pt-reco print-no-break">
          <p className="pt-h3" style={{ color:PT.accent,marginBottom:"5pt" }}>WORKSHOP RECOMMENDATION</p>
          <p className="pt-body">{result.recommendation||"Consult a qualified tyre technician for a full physical inspection."}</p>
        </div>

        {result.warnings?.length>0&&(
          <div className="pt-warn print-no-break">
            <p className="pt-h3" style={{ color:"#b45309",marginBottom:"5pt" }}>AI QUALITY FLAGS</p>
            {result.warnings.map((w,i)=><p key={i} className="pt-small" style={{ margin:i>0?"3pt 0 0":0 }}>• {w}</p>)}
          </div>
        )}

        <div className="pt-footer">
          <span>STRADA AI Tyre Intelligence · {reportId}</span>
          <span>Page 1 of 2</span>
          <span>NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
        </div>
      </div>

      {/* ── PAGE 2 ── */}
      <div className="print-page print-break-before" style={{ background:"#ffffff",color:"#111111" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10pt" }}>
          <p className="pt-h2" style={{ margin:0 }}>SCORE BREAKDOWN</p>
          <p className="pt-small">{reportId} · Page 2</p>
        </div>
        <hr className="pt-rule" style={{ marginBottom:"10pt" }} />

        {/* Score rows */}
        <div className="print-no-break" style={{ marginBottom:"14pt" }}>
          {Object.keys(breakdown).length>0
            ? Object.entries(breakdown).map(([key,val])=>{
                const pct=((val.score??0)/(val.max??100))*100;
                const fc=pct>=70?PT.green:pct>=40?PT.yellow:PT.red;
                return (
                  <div key={key} className="pt-score-row">
                    <p style={pf({ fontWeight:700,fontSize:"9pt",color:"#333333",margin:0,textTransform:"uppercase",letterSpacing:"0.06em" })}>{key}</p>
                    <div style={{ flex:1,height:"6pt",background:"#f3f4f6",borderRadius:"3pt",overflow:"hidden" }}><div style={{ height:"100%",width:`${pct}%`,background:fc }} /></div>
                    <p style={pf({ fontSize:"9pt",color:"#555555",margin:0,textAlign:"right" })}>{val.score??0}/{val.max??100}</p>
                    <p style={pf({ fontSize:"8pt",color:"#999999",margin:0,textAlign:"right",fontStyle:"italic" })}>{val.label||""}</p>
                  </div>
                );
              })
            : <p className="pt-small" style={{ margin:"0 0 14pt" }}>Score breakdown not available.</p>}
        </div>

        {/* Grad-CAM + submitted images */}
        <div className="pt-2col print-no-break" style={{ marginBottom:"14pt" }}>
          <div>
            <p className="pt-h3" style={{ marginBottom:"6pt" }}>GRAD-CAM ATTENTION MAP</p>
            {result.gradcam_image
              ? <img src={`data:image/jpeg;base64,${result.gradcam_image}`} alt="Grad-CAM" className="pt-gradcam" />
              : <div style={{ height:"80pt",background:"#f9fafb",border:"0.75pt dashed #ddd",borderRadius:"3pt",display:"flex",alignItems:"center",justifyContent:"center" }}><p className="pt-small">Not available</p></div>}
            <p className="pt-small" style={{ marginTop:"4pt",fontStyle:"italic" }}>Highlighted zones indicate regions driving the AI verdict.</p>
          </div>
          <div>
            <p className="pt-h3" style={{ marginBottom:"6pt" }}>SUBMITTED IMAGES</p>
            {previews?.length>0
              ? <div style={{ display:"grid",gridTemplateColumns:previews.length>3?"repeat(3,1fr)":`repeat(${previews.length},1fr)`,gap:"5pt" }}>
                  {previews.map(({label,url})=>(
                    <div key={label} className="pt-img-cell">
                      <img src={url} alt={label} style={{ width:"100%",height:"45pt",objectFit:"cover",borderRadius:"3pt",border:"0.5pt solid #e5e7eb",display:"block" }} />
                      <p className="pt-img-label">{label}</p>
                    </div>
                  ))}
                </div>
              : <p className="pt-small">No images submitted.</p>}
          </div>
        </div>

        {/* Checklist */}
        <div className="pt-checklist print-no-break">
          <p className="pt-h3" style={{ marginBottom:"8pt" }}>WORKSHOP ACTION CHECKLIST</p>
          {[
            urgency==="high"?"⚠ IMMEDIATE: Do not drive — replace tyre before vehicle moves":urgency==="medium"?"Schedule tyre replacement within 2 weeks or 1,000 km":"Monitor condition — re-inspect at next scheduled service",
            `Verify tread depth: measured ${depth.depth_mm??"—"} mm (legal minimum: 1.6 mm)`,
            result.sidewall&&result.sidewall!=="None"?`⚠ Sidewall issue: "${result.sidewall}" — check structural integrity immediately`:"Sidewall: no damage detected — verify physically at inspection",
            `Wear pattern: "${result.pattern||"—"}" — ${result.cause||"inspect alignment, inflation, and suspension"}`,
            result.tyre_age?.dot_found?`DOT confirmed: ${result.tyre_age.age_display} — ${result.tyre_age.manufacture||"verify age"}`:"DOT not detected — locate and read physical DOT code on sidewall",
            "Cross-check opposite tyre for balanced wear distribution",
            "Record findings in vehicle maintenance log",
          ].map((item,i)=>(
            <div key={i} style={{ display:"flex",gap:"8pt",marginBottom:"5pt",alignItems:"flex-start" }}>
              <div style={{ width:"9pt",height:"9pt",border:"1pt solid #cccccc",borderRadius:"2pt",flexShrink:0,marginTop:"1pt" }} />
              <p className="pt-body" style={{ margin:0 }}>{item}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop:"12pt",padding:"8pt 12pt",background:"#f9fafb",border:"0.75pt solid #e5e7eb",borderRadius:"4pt" }}>
          <p style={pf({ fontSize:"7.5pt",color:"#999999",margin:0,lineHeight:1.6 })}>
            <strong style={{ color:"#666666" }}>DISCLAIMER:</strong> This report is generated by the STRADA AI Tyre Intelligence system and is intended as a supplementary diagnostic aid only. Report ID: {reportId}
          </p>
        </div>

        <div className="pt-footer">
          <span>STRADA AI Tyre Intelligence</span>
          <span>Page 2 of 2</span>
          <span>{now}</span>
        </div>
      </div>
    </>
  );

  return createPortal(content, portalNode.current);
}

// ─── REPORT PAGE ──────────────────────────────────────────────────────────────
function ReportPage({ result, previews, onClose }) {
  const u=URGENCY[result.urgency]||URGENCY.medium;
  const now=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  const showLocator=result.urgency==="medium"||result.urgency==="high";
  const [tyreAge,setTyreAge]=useState(result.tyre_age);
  const [isMobile,setIsMobile]=useState(false);
  const G=useG(),T=useTokens(),ripple=useRipple();
  const overlayRef=useRef(null),touchStartY=useRef(null);
  useEffect(()=>{setIsMobile(window.innerWidth<=640);},[]);
  const handleTouchStart=e=>{touchStartY.current=e.touches[0].clientY;};
  const handleTouchMove=e=>{if(touchStartY.current===null)return;const dy=e.touches[0].clientY-touchStartY.current;if(dy>0&&overlayRef.current?.scrollTop===0){overlayRef.current.style.transform=`translateY(${Math.min(dy*0.4,80)}px)`;overlayRef.current.style.transition="none";}};
  const handleTouchEnd=e=>{if(touchStartY.current===null)return;const dy=e.changedTouches[0].clientY-touchStartY.current;if(dy>80&&overlayRef.current?.scrollTop===0){haptic("medium");onClose();}else{if(overlayRef.current){overlayRef.current.style.transform="";overlayRef.current.style.transition="transform .3s cubic-bezier(.16,1,.3,1)";}}touchStartY.current=null;};
  const resultWithAge={...result,tyre_age:tyreAge};
  return (
    <div ref={overlayRef} id="strada-report-overlay" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ position:"fixed",inset:0,zIndex:800,overflowY:"auto",background:T.bg,animation:"fadeIn .3s ease",WebkitOverflowScrolling:"touch",transition:"transform .3s cubic-bezier(.16,1,.3,1)" }}>
      <PrintReport result={resultWithAge} previews={previews} />
      <div className="no-print" style={{ maxWidth:760,margin:"0 auto",padding:`clamp(20px,5vh,64px) clamp(14px,4vw,28px) ${isMobile?"90px":"48px"}` }}>
        {isMobile&&<div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}><div style={{ width:36,height:4,borderRadius:2,background:T.border }} /></div>}
        <div className="report-header" style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32,flexWrap:"wrap",gap:14 }}>
          <div>
            <h1 className="report-header-title" style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(32px,8vw,52px)",color:T.text,letterSpacing:"-0.03em",margin:"0 0 4px",lineHeight:1 }}>STRADA</h1>
            <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.12em" }}>TYRE DIAGNOSTIC REPORT · {now}</p>
          </div>
          <div className="report-actions" style={{ display:"flex",gap:8 }}>
            {[["⎙ PRINT",()=>{haptic("medium");window.print();}],["✕ CLOSE",()=>{haptic("light");onClose();}]].map(([l,fn])=>(
              <button key={l} onClick={e=>{ripple(e);fn();}} style={{ ...G.panel,borderRadius:8,color:T.textMuted,fontSize:11,letterSpacing:"0.1em",padding:"10px 16px",border:`1px solid ${T.border}`,cursor:"pointer",flex:1,position:"relative",overflow:"hidden" }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ borderRadius:14,border:`1px solid ${u.border}`,background:u.bg,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <div className="report-dot-pulse" style={{ width:10,height:10,borderRadius:"50%",background:u.dot,flexShrink:0 }} />
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:u.text,letterSpacing:"0.1em" }}>{u.label}</span>
          <span style={{ fontSize:12,color:T.textSub,flex:1,minWidth:160 }}>{result.recommendation}</span>
        </div>
        <div className="grid2" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:14 }}>
          <div className="card-anim" style={{ ...G.card,borderRadius:16,padding:"clamp(16px,3vw,26px)",display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
            <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:0,alignSelf:"flex-start" }}>OVERALL HEALTH</p>
            <HealthGauge {...result.health} />
          </div>
          <div className="card-anim" style={{ ...G.card,borderRadius:16,padding:"clamp(16px,3vw,26px)",animationDelay:"0.08s" }}>
            <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:"0 0 14px" }}>TREAD DEPTH</p>
            <DepthMeter {...result.tread_depth} />
            <p style={{ fontSize:11,color:T.textFaint,margin:"10px 0 0",lineHeight:1.6 }}>{result.tread_depth.message}</p>
          </div>
        </div>
        <div className="card-anim" style={{ ...G.card,borderRadius:16,padding:"clamp(16px,3vw,26px)",marginBottom:14,animationDelay:"0.16s" }}>
          <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:"0 0 18px" }}>SCORE BREAKDOWN</p>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {Object.entries(result.health.breakdown).map(([k,v])=><ScoreBar key={k} label={k} score={v.score} max={v.max} sublabel={v.label} />)}
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14 }}>
          <div className="card-anim" style={{ animationDelay:"0.22s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} sub={result.cause} highlight={result.urgency==="high"} /></div>
          <div className="card-anim" style={{ animationDelay:"0.27s" }}><MiniCard label="WEAR PATTERN" value={result.pattern} sub={result.cause} /></div>
          <div className="card-anim" style={{ animationDelay:"0.32s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val=>setTyreAge(prev=>({...prev,age_display:val}))} /></div>
          <div className="card-anim" style={{ animationDelay:"0.37s" }}><MiniCard label="SIDEWALL" value={result.sidewall} sub={result.sidewall==="None"?"No damage detected":"⚠ Damage detected"} highlight={result.sidewall!=="None"} /></div>
        </div>
        <div className="card-anim" style={{ ...G.card,borderRadius:16,padding:"clamp(16px,3vw,26px)",marginBottom:14,animationDelay:"0.42s" }}>
          <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:"0 0 14px" }}>GRAD-CAM ATTENTION MAP</p>
          <GradCamDisplay base64={result.gradcam_image} originalBase64={null} />
          <p style={{ fontSize:10,color:T.textFaint,margin:"10px 0 0" }}>Highlighted regions indicate areas the model focused on during classification.</p>
        </div>
        {previews.length>0&&(
          <div className="card-anim" style={{ ...G.card,borderRadius:16,padding:"clamp(16px,3vw,26px)",marginBottom:14,animationDelay:"0.48s" }}>
            <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.14em",margin:"0 0 14px" }}>SUBMITTED IMAGES</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:8 }}>
              {previews.map(({label,url})=>(
                <div key={label}>
                  <div style={{ borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`,height:72 }}><img src={url} alt={label} style={{ width:"100%",height:"100%",objectFit:"cover" }} /></div>
                  <span style={{ fontSize:8,color:T.textFaint,display:"block",textAlign:"center",marginTop:4,letterSpacing:"0.06em" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {result.warnings?.length>0&&(
          <div style={{ borderRadius:14,border:"1px solid rgba(245,158,11,0.2)",background:"rgba(245,158,11,0.04)",padding:"14px 18px",marginBottom:14 }}>
            <p style={{ fontSize:9,color:"#f59e0b",letterSpacing:"0.14em",margin:"0 0 8px" }}>QUALITY WARNINGS</p>
            {result.warnings.map((w,i)=><p key={i} style={{ fontSize:11,color:"rgba(245,158,11,0.62)",margin:0,lineHeight:1.65 }}>{w}</p>)}
          </div>
        )}
        {showLocator&&<ShopLocator />}
        <div style={{ paddingTop:20,borderTop:`1px solid ${T.borderFaint}`,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginTop:24 }}>
          <span style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.1em" }}>STRADA · TYRE INTELLIGENCE</span>
          <span style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.08em" }}>NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
        </div>
      </div>
    </div>
  );
}

// ─── RESULT CARD ──────────────────────────────────────────────────────────────
function ResultCard({ result, onViewReport }) {
  const u=URGENCY[result.urgency]||URGENCY.medium;
  const [tyreAge,setTyreAge]=useState(result.tyre_age);
  const G=useG(),T=useTokens(),ripple=useRipple();
  return (
    <div style={{ marginTop:28,...G.card,borderRadius:20,padding:"clamp(16px,4vw,32px)",animation:"cardReveal .7s cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${T.borderFaint}`,flexWrap:"wrap",gap:10 }}>
        <span style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.18em" }}>DIAGNOSTIC RESULT</span>
        <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:100,border:`1px solid ${u.border}`,background:u.bg }}>
          <div className="report-dot-pulse" style={{ width:6,height:6,borderRadius:"50%",background:u.dot }} />
          <span style={{ fontSize:10,fontFamily:"'Syne',sans-serif",fontWeight:700,color:u.text,letterSpacing:"0.12em" }}>{u.label}</span>
        </div>
      </div>
      <div className="grid2" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"clamp(12px,3vw,24px)",marginBottom:20 }}>
        <div className="card-anim" style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
          <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.12em",margin:"0 0 12px",alignSelf:"flex-start" }}>HEALTH SCORE</p>
          <HealthGauge {...result.health} />
        </div>
        <div className="card-anim" style={{ animationDelay:"0.08s" }}>
          <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.12em",margin:"0 0 12px" }}>TREAD DEPTH</p>
          <DepthMeter {...result.tread_depth} />
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:14 }}>
        <div className="card-anim" style={{ animationDelay:"0.14s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} highlight={result.urgency==="high"} /></div>
        <div className="card-anim" style={{ animationDelay:"0.18s" }}><MiniCard label="PATTERN" value={result.pattern} /></div>
        <div className="card-anim" style={{ animationDelay:"0.22s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val=>setTyreAge(prev=>({...prev,age_display:val}))} /></div>
        <div className="card-anim" style={{ animationDelay:"0.26s" }}><MiniCard label="SIDEWALL" value={result.sidewall} highlight={result.sidewall!=="None"} /></div>
      </div>
      <div style={{ ...G.panel,borderRadius:12,padding:"12px 16px",marginBottom:14,borderLeft:`2px solid ${T.accent}38` }}>
        <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.12em",margin:"0 0 5px" }}>RECOMMENDATION</p>
        <p style={{ fontSize:12,color:T.textSub,margin:0,lineHeight:1.65 }}>{result.recommendation}</p>
      </div>
      <div style={{ marginBottom:18 }}>
        <p style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.12em",margin:"0 0 8px" }}>GRAD-CAM HEATMAP</p>
        <GradCamDisplay base64={result.gradcam_image} />
      </div>
      <button onClick={e=>{haptic("medium");ripple(e);onViewReport();}} className="mag-btn touch-btn" style={{ width:"100%",padding:"16px",borderRadius:12,cursor:"pointer",border:`1px solid ${T.accent}47`,background:`${T.accent}0d`,color:T.accent,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,letterSpacing:"0.06em",display:"flex",alignItems:"center",justifyContent:"center",gap:8,position:"relative",overflow:"hidden" }}>
        VIEW FULL REPORT <span style={{ fontSize:16 }}>↗</span>
      </button>
    </div>
  );
}

// ─── DIAGNOSE PAGE ────────────────────────────────────────────────────────────
function DiagnosePage({ isMobile, onSlickEgg }) {
  const [files,setFiles]=useState({});
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const [showReport,setShowReport]=useState(false);
  const G=useG(),T=useTokens(),ripple=useRipple();
  const handleUpload=useCallback((id,file)=>{setFiles(p=>({...p,[id]:file}));setResult(null);setError(null);},[]);
  const handleRemove=useCallback((id)=>{setFiles(p=>{const n={...p};delete n[id];return n;});setResult(null);},[]);
  const uploadedCount=Object.keys(files).length;
  const canAnalyse=uploadedCount>=1;
  const previews=useMemo(()=>SLOTS.filter(s=>files[s.id]).map(s=>({label:s.label,url:URL.createObjectURL(files[s.id])})),[files]);
  useEffect(()=>()=>previews.forEach(p=>URL.revokeObjectURL(p.url)),[previews]);
  const handleAnalyse=async()=>{
    setLoading(true);setError(null);setResult(null);haptic("medium");
    const fd=new FormData();
    SLOTS.forEach(s=>{if(files[s.id])fd.append(s.id,files[s.id]);});
    try {
      const API_BASE=import.meta.env.VITE_API_URL||"http://localhost:5000";
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),60000);
      const res=await fetch(`${API_BASE}/predict`,{method:"POST",body:fd,signal:controller.signal});
      clearTimeout(timeout);
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||`Server error ${res.status}`);
      setResult(data);haptic("heavy");
      const wearLow=typeof data.wear_level==="string"&&data.wear_level.toLowerCase().includes("bald");
      if (data.urgency==="high"||wearLow) setTimeout(()=>onSlickEgg?.(),800);
    } catch(err) {
      if (err.name==="AbortError") setError("Request timed out. Check that your Flask server is running.");
      else setError(err.message||"Failed to reach API. Is Flask running on port 5000?");
      haptic("heavy");
    } finally { setLoading(false); }
  };
  return (
    <div style={{ maxWidth:720,margin:"0 auto",padding:`clamp(72px,10vh,106px) clamp(14px,5vw,28px) ${isMobile?"90px":"80px"}` }}>
      {showReport&&result&&<ReportPage result={result} previews={previews} onClose={()=>setShowReport(false)} />}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
          <div style={{ height:1,width:24,background:`linear-gradient(90deg,${T.accent},transparent)` }} />
          <p style={{ fontSize:10,color:T.accent,letterSpacing:"0.2em",margin:0 }}>TYRE DIAGNOSTIC</p>
        </div>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(30px,7vw,58px)",color:T.text,letterSpacing:"-0.03em",margin:"0 0 10px",lineHeight:1 }}>ANALYSE TYRES</h2>
        <p style={{ fontSize:12,color:T.textMuted,lineHeight:1.8,margin:0,maxWidth:480 }}>Upload one photo to start — add more angles below for a deeper analysis.</p>
      </div>
      <UnifiedUploadCard files={files} onUpload={handleUpload} onRemove={handleRemove} />
      <button onClick={e=>{if(!canAnalyse||loading)return;ripple(e);handleAnalyse();}} disabled={!canAnalyse||loading} className={canAnalyse&&!loading?"mag-btn touch-btn":""}
        style={{ width:"100%",padding:"16px",borderRadius:14,cursor:canAnalyse&&!loading?"pointer":"not-allowed",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"clamp(13px,3vw,14px)",letterSpacing:"0.05em",transition:"all .3s",position:"relative",overflow:"hidden",...(canAnalyse&&!loading?{background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,border:"none",color:"white",boxShadow:"0 0 40px rgba(249,115,22,0.35),0 6px 24px rgba(0,0,0,0.15)"}:{background:T.ghost,border:`1px solid ${T.border}`,color:T.textFaint}) }}>
        {loading?"ANALYSING…":canAnalyse?"▶  RUN DIAGNOSTIC":"UPLOAD AT LEAST 1 IMAGE"}
      </button>
      {loading&&<DiagnosticLoader />}
      {error&&<div style={{ marginTop:18,...G.card,borderRadius:12,borderLeft:"2px solid rgba(239,68,68,0.45)",padding:"14px 18px" }}><p style={{ fontSize:12,color:"#ef4444",margin:0 }}>{error}</p></div>}
      {result&&!loading&&<ResultCard result={result} onViewReport={()=>setShowReport(true)} />}
      <div style={{ marginTop:48,paddingTop:18,borderTop:`1px solid ${T.borderFaint}`,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
        <span style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.1em" }}>STRADA · TYRE INTELLIGENCE</span>
        <span style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.08em" }}>ML-POWERED · LOCAL INFERENCE</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page,setPage]=useState("landing");
  const [isMobile,setIsMobile]=useState(false);
  const [theme,setTheme]=useState("light");
  const [splashDone,setSplashDone]=useState(false);
  const [showRollingTyre,setShowRollingTyre]=useState(false);
  const [showSlickPopup,setShowSlickPopup]=useState(false);
  const [showSpinOut,setShowSpinOut]=useState(false);
  useEffect(()=>{const check=()=>setIsMobile(window.innerWidth<=640);check();window.addEventListener("resize",check);return()=>window.removeEventListener("resize",check);},[]);
  useEffect(()=>{document.body.className=theme==="dark"?"dark-mode":"light-mode";},[theme]);
  const toggleTheme=useCallback(()=>setTheme(t=>t==="dark"?"light":"dark"),[]);
  const go=useCallback(p=>{setPage(p);window.scrollTo({top:0,behavior:"smooth"});},[]);
  const T=theme==="dark"?DARK:LIGHT;
  const handleToggleEgg=useCallback(type=>{if(type==="spinout"){haptic("heavy");setShowSpinOut(true);}},[]);
  const handleRadarTripleClick=useCallback(()=>{if(!showRollingTyre){haptic("heavy");setShowRollingTyre(true);}},[showRollingTyre]);
  const handleSlickEgg=useCallback(()=>{setShowSlickPopup(true);},[]);
  return (
    <ThemeContext.Provider value={{ theme,toggleTheme }}>
      <style dangerouslySetInnerHTML={{ __html:GLOBAL_CSS }} />
      {!splashDone&&<SplashScreen onComplete={()=>setSplashDone(true)} />}
      {showRollingTyre&&<RollingTyre onDone={()=>setShowRollingTyre(false)} />}
      {showSlickPopup&&<RacingSlickPopup onClose={()=>setShowSlickPopup(false)} />}
      {showSpinOut&&<SpinOutOverlay onDone={()=>setShowSpinOut(false)} />}
      <div style={{ minHeight:"100dvh",background:T.bg,color:T.text,position:"relative",fontFamily:"'JetBrains Mono',monospace",opacity:splashDone?1:0,transition:"opacity 0.4s ease" }}>
        <StaticBg />
        <ResponsiveNav page={page} setPage={go} onToggleEgg={handleToggleEgg} />
        <div style={{ position:"relative",zIndex:2 }}>
          {page==="landing"&&<LandingPage setPage={go} onRadarTripleClick={handleRadarTripleClick} />}
          {page==="diagnose"&&<DiagnosePage isMobile={isMobile} onSlickEgg={handleSlickEgg} />}
          {page==="info"&&<InfoPage />}
          {page==="about"&&<AboutPage />}
        </div>
        {!isMobile&&(
          <footer className="no-print" style={{ position:"relative",zIndex:2,borderTop:`1px solid ${T.borderFaint}`,padding:"clamp(20px,4vh,36px) clamp(16px,5vw,40px)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:22,height:22,borderRadius:6,background:`linear-gradient(135deg,${T.accentMid},${T.accentDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:11,color:"white" }}>S</span>
              </div>
              <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:T.textMuted,letterSpacing:"0.1em" }}>STRADA</span>
            </div>
            <span style={{ fontSize:9,color:T.textFaint,letterSpacing:"0.07em",textAlign:"center" }}>AI TYRE INTELLIGENCE · NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
            <div style={{ display:"flex",gap:16 }}>
              {[["diagnose","DIAGNOSE"],["info","TYRE 101"],["about","ABOUT"]].map(([p,l])=><button key={p} onClick={()=>go(p)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:9,color:T.textFaint,letterSpacing:"0.12em" }}>{l}</button>)}
            </div>
          </footer>
        )}
      </div>
    </ThemeContext.Provider>
  );
}