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
  bg: "#060608", surface: "rgba(14,14,18,0.96)", panel: "rgba(10,10,14,0.80)", ghost: "rgba(255,255,255,0.03)",
  text: "#f0eff5", textSub: "rgba(240,239,245,0.42)", textMuted: "rgba(240,239,245,0.28)", textFaint: "rgba(240,239,245,0.14)",
  border: "rgba(255,255,255,0.08)", borderFaint: "rgba(255,255,255,0.04)", accent: "#f97316", accentMid: "#fb923c", accentDark: "#c2410c",
  cardBorder: "rgba(255,255,255,0.07)", cardShadow: "0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
  panelBorder: "rgba(255,255,255,0.07)", panelShadow: "0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.6)",
  gridLine: "rgba(255,255,255,0.012)", noiseOpacity: 0.022,
  orbColors: ["rgba(249,115,22,0.10)", "rgba(234,88,12,0.07)", "rgba(251,146,60,0.055)", "rgba(249,115,22,0.04)"],
  inputBg: "rgba(255,255,255,0.04)",
  navBg: "rgba(6,6,8,0.85)",
  bottomNavBg: "rgba(8,8,12,0.92)",
};
const LIGHT = {
  bg: "#f7f4f0", surface: "rgba(255,253,250,0.98)", panel: "rgba(255,253,250,0.90)", ghost: "rgba(0,0,0,0.035)",
  text: "#1a1008", textSub: "rgba(26,16,8,0.54)", textMuted: "rgba(26,16,8,0.38)", textFaint: "rgba(26,16,8,0.22)",
  border: "rgba(0,0,0,0.08)", borderFaint: "rgba(0,0,0,0.045)", accent: "#ea6500", accentMid: "#f97316", accentDark: "#c2410c",
  cardBorder: "rgba(0,0,0,0.07)", cardShadow: "0 4px 28px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.95) inset",
  panelBorder: "rgba(0,0,0,0.09)", panelShadow: "0 0 0 0.5px rgba(0,0,0,0.045) inset, 0 8px 40px rgba(0,0,0,0.09)",
  gridLine: "rgba(0,0,0,0.02)", noiseOpacity: 0.016,
  orbColors: ["rgba(249,115,22,0.08)", "rgba(234,88,12,0.055)", "rgba(251,146,60,0.045)", "rgba(249,115,22,0.03)"],
  inputBg: "rgba(0,0,0,0.035)",
  navBg: "rgba(247,244,240,0.88)",
  bottomNavBg: "rgba(255,253,250,0.94)",
};
function useTokens() { const { theme } = useTheme(); return theme === "dark" ? DARK : LIGHT; }
function useG() {
  const T = useTokens();
  return {
    panel: { background: T.panel, backdropFilter: "blur(32px) saturate(180%)", WebkitBackdropFilter: "blur(32px) saturate(180%)", border: `1px solid ${T.panelBorder}`, boxShadow: T.panelShadow },
    card: { background: T.surface, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow },
    ghost: { background: T.ghost, border: `1px solid ${T.border}` },
  };
}

// ─── HAPTIC FEEDBACK UTILITY ──────────────────────────────────────────────────
function haptic(type = "light") {
  if (!("vibrate" in navigator)) return;
  const patterns = { light: [8], medium: [15], heavy: [25], success: [10, 50, 10], error: [20, 40, 20, 40, 20] };
  try { navigator.vibrate(patterns[type] || patterns.light); } catch (_) {}
}

// ─── iOS-STYLE PRESS HOOK ─────────────────────────────────────────────────────
function usePressEffect(options = {}) {
  const { scale = 0.96, hapticType = "light", disabled = false } = options;
  const ref = useRef(null);
  const pressedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const onStart = (e) => {
      pressedRef.current = true;
      haptic(hapticType);
      el.style.transform = `scale(${scale})`;
      el.style.transition = "transform 0.12s cubic-bezier(0.34,1.56,0.64,1)";
    };
    const onEnd = () => {
      if (!pressedRef.current) return;
      pressedRef.current = false;
      el.style.transform = "scale(1)";
      el.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
    };
    const onCancel = () => {
      pressedRef.current = false;
      el.style.transform = "scale(1)";
      el.style.transition = "transform 0.3s cubic-bezier(0.16,1,0.3,1)";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    el.addEventListener("mousedown", onStart);
    el.addEventListener("mouseup", onEnd);
    el.addEventListener("mouseleave", onCancel);

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
      el.removeEventListener("mousedown", onStart);
      el.removeEventListener("mouseup", onEnd);
      el.removeEventListener("mouseleave", onCancel);
    };
  }, [scale, hapticType, disabled]);

  return ref;
}

// ─── RIPPLE HOOK ──────────────────────────────────────────────────────────────
function useRipple() {
  const ref = useRef(null);

  const trigger = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.2;

    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position:absolute;left:${x - size/2}px;top:${y - size/2}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:rgba(249,115,22,0.18);pointer-events:none;z-index:10;
      transform:scale(0);animation:rippleExpand 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
    `;
    el.style.position = "relative";
    el.style.overflow = "hidden";
    el.appendChild(ripple);
    setTimeout(() => { try { el.removeChild(ripple); } catch(_) {} }, 600);
  }, []);

  return { ref, trigger };
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;text-size-adjust:100%}
::selection{background:rgba(249,115,22,0.28);color:inherit}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(249,115,22,0.3);border-radius:2px}
body{overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:'JetBrains Mono',monospace;touch-action:pan-y}

/* ── Ripple keyframe ── */
@keyframes rippleExpand{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}

/* ── Spring bounce for iOS feel ── */
@keyframes springIn{0%{transform:scale(0.88);opacity:0}60%{transform:scale(1.04)}80%{transform:scale(0.98)}100%{transform:scale(1);opacity:1}}
@keyframes springOut{0%{transform:scale(1)}100%{transform:scale(0.92);opacity:0}}

/* ── Page transition ── */
@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.page-enter{animation:pageIn 0.38s cubic-bezier(0.16,1,0.3,1) both}

/* ── Card pop ── */
@keyframes cardReveal{from{opacity:0;transform:translateY(22px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes statusPop{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(0.88)}}
@keyframes radarPing{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
@keyframes orbFloat1{0%,100%{transform:translate(-50%,-50%) scale(1)}33%{transform:translate(-42%,-58%) scale(1.14)}66%{transform:translate(-58%,-42%) scale(0.9)}}
@keyframes orbFloat2{0%,100%{transform:translate(-50%,-50%) scale(1.1)}50%{transform:translate(-55%,-45%) scale(0.86)}}
@keyframes orbFloat3{0%,100%{transform:translate(-50%,-50%) scale(0.9)}50%{transform:translate(-45%,-52%) scale(1.1)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 24px rgba(249,115,22,.28)}50%{box-shadow:0 0 60px rgba(249,115,22,.52),0 0 100px rgba(249,115,22,.14)}}
@keyframes borderFlow{0%,100%{border-color:rgba(249,115,22,.12)}50%{border-color:rgba(249,115,22,.46)}}
@keyframes tyreFloat{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
@keyframes dataStream{0%{opacity:0;transform:translateY(-4px)}50%{opacity:1}100%{opacity:0;transform:translateY(4px)}}
@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes notchReveal{from{transform:translateY(-8px) scaleX(0.85);opacity:0}to{transform:translateY(0) scaleX(1);opacity:1}}
@keyframes pickerIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}

/* ── Slot upload spring ── */
@keyframes slotAdded{0%{transform:scale(0.9);opacity:0.5}50%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
.slot-added{animation:slotAdded 0.4s cubic-bezier(0.34,1.56,0.64,1) both}

/* ── Tab indicator ── */
@keyframes tabPill{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* ─ Reveal ─ */
.strada-reveal{opacity:0;transform:translateY(26px);transition:opacity 0.72s cubic-bezier(0.16,1,0.3,1),transform 0.72s cubic-bezier(0.16,1,0.3,1)}
.strada-reveal.visible{opacity:1;transform:translateY(0)}

/* ─ Shimmer text ─ */
.shimmer-text{background:linear-gradient(90deg,#f97316 0%,#fb923c 20%,#fff8f0 50%,#fb923c 80%,#f97316 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5.5s linear infinite}
.shimmer-text-light{background:linear-gradient(90deg,#ea6500 0%,#f97316 20%,#1a1008 50%,#f97316 80%,#ea6500 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5.5s linear infinite}

/* ─ Lift card (desktop only) ─ */
@media(min-width:769px){
  .lift-card{transition:transform 0.38s cubic-bezier(0.16,1,0.3,1),box-shadow 0.38s,border-color 0.28s}
  .lift-card:hover{transform:translateY(-5px) scale(1.007);box-shadow:0 28px 64px rgba(0,0,0,.22),0 0 0 1px rgba(249,115,22,.15)!important}
}

/* ─ Mag button ─ */
.mag-btn{position:relative;overflow:hidden;transition:transform 0.28s cubic-bezier(0.16,1,0.3,1),box-shadow 0.28s,opacity 0.2s}
.mag-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.09),transparent);opacity:0;transition:opacity 0.28s;pointer-events:none}
@media(min-width:769px){.mag-btn:hover::before{opacity:1}.mag-btn:hover{transform:translateY(-1px)}}
.mag-btn:active{transform:scale(0.96)!important;transition:transform 0.1s!important}

/* ─ iOS press feel for any tappable ─ */
.ios-press{transition:transform 0.12s cubic-bezier(0.34,1.56,0.64,1),opacity 0.12s}
.ios-press:active{transform:scale(0.95)!important;opacity:0.88!important}

/* ─ Animations ─ */
.hero-badge{animation:notchReveal 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.05s both}
.hero-title-wrap{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s both}
.hero-desc-wrap{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both}
.hero-buttons-wrap{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.42s both}
.hero-stats-wrap{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s both}
.hero-radar-outer{animation:fadeIn 1.4s ease 0.7s both}
.hero-radar-wrap{animation:tyreFloat 4.5s ease-in-out infinite}
.glow-pulse-anim{animation:glowPulse 3.2s ease-in-out infinite}
.border-flow-anim{animation:borderFlow 4.2s ease-in-out infinite}
.dot-pulse{animation:pulse 2.4s ease-in-out infinite}
.data-stream{animation:dataStream 0.6s ease var(--delay,0s) both}
.card-anim{animation:cardReveal 0.5s cubic-bezier(0.16,1,0.3,1) both}
.status-anim{animation:statusPop 0.32s cubic-bezier(0.16,1,0.3,1) both}
.report-dot-pulse{animation:pulse 2.2s infinite}
.hero-btn-glow{animation:glowPulse 3.5s ease-in-out infinite}
.spring-in{animation:springIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both}
.picker-in{animation:pickerIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both}

/* ─ Custom cursor (desktop) ─ */
#strada-cursor{position:fixed;top:0;left:0;pointer-events:none;z-index:9999;width:11px;height:11px;border-radius:50%;background:#f97316;mix-blend-mode:difference;transform:translate(-50%,-50%);will-change:transform;transition:width .18s,height .18s}
#strada-cursor-ring{position:fixed;top:0;left:0;pointer-events:none;z-index:9998;width:34px;height:34px;border-radius:50%;border:1px solid rgba(249,115,22,0.42);transform:translate(-50%,-50%);will-change:transform;transition:width .28s,height .28s,border-color .18s}
@media(max-width:768px){#strada-cursor,#strada-cursor-ring{display:none}}

/* ─ Grid layouts ─ */
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:14px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.pipeline-steps{display:flex;gap:0;position:relative}

/* ─ Mobile overrides ─ */
@media(max-width:768px){
  button,a,[role=button]{min-height:44px}
  .hero-title{font-size:clamp(52px,14.5vw,96px)!important;letter-spacing:-0.05em!important}
  .hero-section{padding:84px 18px 52px!important}
  .hero-buttons{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
  .hero-buttons button,.hero-buttons a{width:100%!important;justify-content:center!important}
  .hero-stats{gap:0!important;margin-top:40px!important}
  .hero-stats>div{padding:0 clamp(10px,3vw,22px)!important}
  .hero-radar{width:min(270px,80vw)!important;height:min(270px,80vw)!important;margin-top:44px!important}
  .grid3{grid-template-columns:1fr!important}
  .grid2{grid-template-columns:1fr!important;gap:12px!important}
  .slot-grid{grid-template-columns:1fr 1fr!important}
  .pipeline-steps{flex-direction:column!important;align-items:stretch!important;gap:12px!important}
  .step-line{display:none!important}
  .pipeline-step{flex-direction:row!important;gap:16px!important;align-items:center!important;text-align:left!important;padding:0!important}
  .pipeline-step-text{text-align:left!important}
  /* Disable heavy desktop anims on mobile for perf */
  .lift-card{transition:none!important}
  .hero-radar-wrap{animation:none!important}
  .glow-pulse-anim{animation:none!important}
  .border-flow-anim{animation:none!important}
  .strada-reveal{opacity:0;transform:none;transition:opacity 0.45s ease}
  .strada-reveal.visible{opacity:1;transform:none}
}
@media(max-width:480px){
  .hero-title{font-size:clamp(44px,13.5vw,80px)!important}
  .hero-badge{padding:7px 13px!important;font-size:8px!important}
  .hero-desc{font-size:12px!important;padding:0 12px!important}
  .slot-grid{grid-template-columns:1fr 1fr!important}
}
@media(max-width:360px){.slot-grid{grid-template-columns:1fr!important}}
@media(max-width:540px){
  .report-header{flex-direction:column!important;gap:12px!important}
  .report-header-title{font-size:38px!important}
  .report-actions{width:100%!important}
  .report-actions button{flex:1!important}
}

/* ─ Bottom nav safe area ─ */
.bottom-nav-safe{padding-bottom:max(env(safe-area-inset-bottom,0px),8px)}
.safe-top{padding-top:env(safe-area-inset-top,0px)}

/* ─ Gradcam ─ */
.gradcam-img{mix-blend-mode:multiply;filter:saturate(1.6) contrast(1.1)}

/* ─ Body states ─ */
body.light-mode{background:#f7f4f0;color:#1a1008}
body.dark-mode{background:#060608;color:#f0eff5}
@media(max-width:768px){body.dark-mode,body.light-mode{cursor:auto}}
@media(min-width:769px){body.dark-mode{cursor:none}}

/* ── Touch scroll momentum ── */
.scroll-momentum{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}

/* ── Smooth bottom sheet slide ── */
.bottom-sheet-enter{animation:slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both}

/* ─ Focus ring (accessibility) ─ */
button:focus-visible,a:focus-visible{outline:2px solid rgba(249,115,22,0.7);outline-offset:3px;border-radius:6px}

/* ══════════════════════════════════════════════
   PRINT STYLES
   ══════════════════════════════════════════════ */
@media print {
  body * { visibility: hidden !important; }
  #strada-print-report, #strada-print-report * { visibility: visible !important; }
  #strada-print-report { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 99999 !important; }
  body { background: #fff !important; color: #111 !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  @page { size: A4 portrait; margin: 14mm 16mm; }
  .pr-page-break { page-break-before: always; }
}
`;

// ─── CURSOR ───────────────────────────────────────────────────────────────────
function Cursor() {
  const c = useRef(null); const r = useRef(null);
  const pos = useRef({ x: -100, y: -100 }); const raf = useRef(null);
  useEffect(() => {
    const el = c.current, rl = r.current;
    if (!el || !rl) return;
    const tick = () => { const { x, y } = pos.current; el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`; rl.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`; raf.current = null; };
    const move = (e) => { pos.current = { x: e.clientX, y: e.clientY }; if (!raf.current) raf.current = requestAnimationFrame(tick); };
    const over = (e) => { if (e.target.closest("button,a,[role=button],.mag-btn")) { el.style.width = "18px"; el.style.height = "18px"; rl.style.width = "52px"; rl.style.height = "52px"; rl.style.borderColor = "rgba(249,115,22,0.75)"; } };
    const out = () => { el.style.width = "11px"; el.style.height = "11px"; rl.style.width = "34px"; rl.style.height = "34px"; rl.style.borderColor = "rgba(249,115,22,0.42)"; };
    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    document.addEventListener("mouseout", out, { passive: true });
    return () => { window.removeEventListener("mousemove", move); document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  return (<><div id="strada-cursor" ref={c} /><div id="strada-cursor-ring" ref={r} /></>);
}

function Noise() {
  const T = useTokens();
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none", opacity: T.noiseOpacity, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "256px 256px" }} />);
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme(); const T = useTokens(); const isDark = theme === "dark";
  const ref = usePressEffect({ scale: 0.88, hapticType: "light" });
  return (
    <button ref={ref} onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ width: 42, height: 24, borderRadius: 12, border: `1px solid ${isDark ? "rgba(249,115,22,0.3)" : "rgba(234,101,0,0.3)"}`, background: isDark ? "rgba(249,115,22,0.1)" : "rgba(234,101,0,0.12)", cursor: "pointer", position: "relative", transition: "background 0.3s, border 0.3s", flexShrink: 0 }} aria-label="Toggle theme">
      <div style={{ position: "absolute", top: 3, left: isDark ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#c2410c)", transition: "left 0.28s cubic-bezier(0.34,1.56,0.64,1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>{isDark ? "☽" : "☀"}</div>
    </button>
  );
}

function Orbs({ page }) {
  const [isMobile, setIsMobile] = useState(false); const T = useTokens();
  useEffect(() => { const check = () => setIsMobile(window.innerWidth <= 768); check(); window.addEventListener("resize", check, { passive: true }); return () => window.removeEventListener("resize", check); }, []);
  if (isMobile) return (<div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse 90% 55% at 50% 0%, ${T.orbColors[0]} 0%, transparent 70%)` }} />);
  const orbs = page === "landing" ? [{ x: "15%", y: "22%", s: 660, c: T.orbColors[0], b: 155, a: "orbFloat1 20s ease-in-out infinite" }, { x: "82%", y: "14%", s: 530, c: T.orbColors[1], b: 135, a: "orbFloat2 24s ease-in-out infinite" }, { x: "58%", y: "78%", s: 430, c: T.orbColors[2], b: 115, a: "orbFloat3 17s ease-in-out infinite" }, { x: "92%", y: "65%", s: 310, c: T.orbColors[3], b: 90, a: "orbFloat1 28s ease-in-out infinite reverse" }] : [{ x: "85%", y: "8%", s: 430, c: T.orbColors[0], b: 115, a: "orbFloat2 22s ease-in-out infinite" }, { x: "5%", y: "55%", s: 370, c: T.orbColors[1], b: 95, a: "orbFloat3 19s ease-in-out infinite" }];
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {orbs.map((o, i) => (<div key={i} style={{ position: "absolute", left: o.x, top: o.y, width: o.s * 2, height: o.s * 2, transform: "translate(-50%,-50%)", background: `radial-gradient(circle, ${o.c} 0%, transparent 65%)`, filter: `blur(${o.b}px)`, animation: o.a, willChange: "transform" }} />))}
      <div style={{ position: "absolute", top: "-20%", left: "65%", width: "1px", height: "140%", background: `linear-gradient(180deg,transparent,${T.orbColors[0]} 40%,transparent)`, transform: "rotate(-22deg)", transformOrigin: "top center", opacity: 0.6 }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.gridLine} 1px,transparent 1px),linear-gradient(90deg,${T.gridLine} 1px,transparent 1px)`, backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%,transparent 35%,${T.bg === "#060608" ? "rgba(0,0,0,0.3)" : "rgba(247,244,240,0.2)"} 100%)` }} />
    </div>
  );
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll(".strada-reveal:not(.visible)");
    if (!items.length) return;
    const io = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }); }, { threshold: 0.06, rootMargin: "0px 0px -24px 0px" });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── DIAGNOSTIC HERO ──────────────────────────────────────────────────────────
function DiagnosticHero() {
  const [scanAngle, setScanAngle] = useState(0); const [pings, setPings] = useState([]); const [dataLines, setDataLines] = useState([]);
  const rafRef = useRef(null); const angleRef = useRef(0); const pingIdRef = useRef(0); const [isMobile, setIsMobile] = useState(false); const T = useTokens();
  useEffect(() => { const check = () => setIsMobile(window.innerWidth < 640); check(); window.addEventListener("resize", check, { passive: true }); return () => window.removeEventListener("resize", check); }, []);
  useEffect(() => {
    if (isMobile) {
      const interval = setInterval(() => { angleRef.current = (angleRef.current + 2.2) % 360; setScanAngle(angleRef.current); }, 50);
      const pingInterval = setInterval(() => { const pingAngle = angleRef.current * Math.PI / 180; const r = 60 + Math.random() * 55; const x = 150 + r * Math.cos(pingAngle); const y = 150 + r * Math.sin(pingAngle); setPings(p => [...p.slice(-3), { id: pingIdRef.current++, x, y }]); }, 1600);
      return () => { clearInterval(interval); clearInterval(pingInterval); };
    }
    let lastPingAt = 0;
    const tick = (t) => { angleRef.current = (angleRef.current + 0.75) % 360; setScanAngle(angleRef.current); if (t - lastPingAt > 950) { const pingAngle = angleRef.current * Math.PI / 180; const r2 = 60 + Math.random() * 55; const x = 150 + r2 * Math.cos(pingAngle); const y = 150 + r2 * Math.sin(pingAngle); setPings(p => [...p.slice(-4), { id: pingIdRef.current++, x, y }]); lastPingAt = t; } rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    const interval = setInterval(() => { setDataLines(Array.from({ length: 4 }, (_, i) => ({ key: Math.random(), value: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, "0").toUpperCase()}`, label: ["TREAD", "WEAR", "DEPTH", "AGE"][i], delay: i * 0.12 }))); }, 1200);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(interval); };
  }, [isMobile]);
  const rad = scanAngle * Math.PI / 180; const sweepX = 150 + 120 * Math.cos(rad); const sweepY = 150 + 120 * Math.sin(rad); const rings = [40, 70, 100, 125]; const accent = T.accent;
  return (
    <div className="hero-radar hero-radar-wrap" style={{ position: "relative", width: "min(340px,82vw)", height: "min(340px,82vw)", margin: "0 auto" }}>
      {!isMobile && (<div className="glow-pulse-anim" style={{ position: "absolute", inset: "-20%", borderRadius: "50%", background: `radial-gradient(circle, ${T.orbColors[0]} 0%, transparent 70%)`, filter: "blur(28px)" }} />)}
      <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%"><stop offset="0%" stopColor={T === LIGHT ? "rgba(255,253,250,0.97)" : "rgba(18,18,22,0.95)"} /><stop offset="100%" stopColor={T === LIGHT ? "rgba(247,244,240,0.99)" : "rgba(6,6,8,0.98)"} /></radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="strongGlow"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="radarClip"><circle cx="150" cy="150" r="128" /></clipPath>
        </defs>
        <circle cx="150" cy="150" r="130" fill="url(#radarBg)" stroke={`${accent}30`} strokeWidth="1.5" />
        {rings.map((r, i) => (<circle key={i} cx="150" cy="150" r={r} fill="none" stroke={`${accent}${i === rings.length-1 ? "20" : "0f"}`} strokeWidth="0.8" strokeDasharray={i === rings.length - 1 ? "none" : "4 4"} />))}
        {[0, 45, 90, 135].map(a => { const aRad = a * Math.PI / 180; return <line key={a} x1={150 + 8 * Math.cos(aRad)} y1={150 + 8 * Math.sin(aRad)} x2={150 + 125 * Math.cos(aRad)} y2={150 + 125 * Math.sin(aRad)} stroke={T === LIGHT ? "rgba(0,0,0,0.055)" : "rgba(255,255,255,0.045)"} strokeWidth="0.6" />; })}
        <g clipPath="url(#radarClip)">
          <path d={`M 150 150 L ${150 + 125 * Math.cos(rad - 0.52)} ${150 + 125 * Math.sin(rad - 0.52)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill={`${accent}0f`} />
          <path d={`M 150 150 L ${150 + 125 * Math.cos(rad - 0.22)} ${150 + 125 * Math.sin(rad - 0.22)} A 125 125 0 0 1 ${sweepX} ${sweepY} Z`} fill={`${accent}1c`} />
        </g>
        <line x1="150" y1="150" x2={sweepX} y2={sweepY} stroke={`${accent}d6`} strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" />
        {pings.map(ping => (<g key={ping.id}><circle cx={ping.x} cy={ping.y} r="3.5" fill={accent} opacity="0.9" filter="url(#strongGlow)" />{!isMobile && <circle cx={ping.x} cy={ping.y} r="7" fill="none" stroke={`${accent}60`} strokeWidth="1" style={{ animation: "radarPing 1.2s ease-out forwards" }} />}</g>))}
        <g transform="translate(150,150)"><ellipse cx="0" cy="0" rx="28" ry="28" fill="none" stroke={`${accent}77`} strokeWidth="6" /><ellipse cx="0" cy="0" rx="16" ry="16" fill={T === LIGHT ? "rgba(255,253,250,0.9)" : "rgba(12,12,16,0.9)"} stroke={`${accent}55`} strokeWidth="2" /><circle cx="0" cy="0" r="4" fill={accent} opacity="0.9" />{[0, 60, 120, 180, 240, 300].map(a => { const aR = a * Math.PI / 180; return <line key={a} x1={5 * Math.cos(aR)} y1={5 * Math.sin(aR)} x2={14 * Math.cos(aR)} y2={14 * Math.sin(aR)} stroke={`${accent}99`} strokeWidth="1.5" strokeLinecap="round" />; })}</g>
        {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={150 + 127 * Math.cos(a)} y1={150 + 127 * Math.sin(a)} x2={150 + 131 * Math.cos(a)} y2={150 + 131 * Math.sin(a)} stroke={`${accent}60`} strokeWidth="1.5" />; })}
        <circle cx="150" cy="150" r="130" fill="none" stroke={`${accent}3c`} strokeWidth="1" />
      </svg>
      {!isMobile && (<div style={{ position: "absolute", top: "4%", right: "-2%", display: "flex", flexDirection: "column", gap: 5, fontFamily: "'JetBrains Mono', monospace" }}>{dataLines.map(line => (<div key={line.key} className="data-stream" style={{ "--delay": `${line.delay}s`, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 8, color: T.textMuted, letterSpacing: "0.12em" }}>{line.label}</span><span style={{ fontSize: 9, color: T.accent }}>{line.value}</span></div>))}</div>)}
      <div style={{ position: "absolute", bottom: "4%", left: "2%", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}><div className="dot-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent }} />SCANNING</div>
    </div>
  );
}

// ─── SHOP LOCATOR ─────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [2, 5, 10, 20];
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link"); link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }
    if (document.getElementById("leaflet-js")) {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); resolve(window.L); } }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error("Leaflet load timeout")); }, 10000);
      return;
    }
    const script = document.createElement("script"); script.id = "leaflet-js";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => { if (window.L) resolve(window.L); else reject(new Error("L not defined")); };
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
}
function ShopLocator() {
  const [status, setStatus] = useState("idle");
  const [shops, setShops] = useState([]); const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState(null); const [selected, setSelected] = useState(null); const [errMsg, setErrMsg] = useState("");
  const mapContainerRef = useRef(null); const mapInstanceRef = useRef(null);
  const G = useG(); const T = useTokens();

  const fetchShops = useCallback(async (lat, lng, rad) => {
    setStatus("loading"); setShops([]); setSelected(null);
    const r = rad * 1000;
    const query = `[out:json][timeout:25];(node["shop"="tyres"](around:${r},${lat},${lng});node["shop"="car_repair"](around:${r},${lat},${lng});node["amenity"="car_repair"]["service:tyres"="yes"](around:${r},${lat},${lng});way["shop"="tyres"](around:${r},${lat},${lng});way["shop"="car_repair"](around:${r},${lat},${lng}););out center 20;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(query) });
      if (!res.ok) throw new Error(`Overpass error ${res.status}`);
      const data = await res.json();
      const results = (data.elements || []).map(el => ({ id: el.id, name: el.tags?.name || "Tyre / Auto Shop", lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon, phone: el.tags?.phone || null, hours: el.tags?.opening_hours || null, addr: [el.tags?.["addr:street"], el.tags?.["addr:city"]].filter(Boolean).join(", ") || null, website: el.tags?.website || null, dist: haversine(lat, lng, el.lat ?? el.center?.lat, el.lon ?? el.center?.lon) })).filter(s => s.lat && s.lng).sort((a, b) => a.dist - b.dist).slice(0, 15);
      setShops(results); setStatus("done");
    } catch(e) { setErrMsg("Could not reach Overpass API — " + e.message); setStatus("error"); }
  }, []);

  const locate = useCallback(() => {
    setStatus("locating"); haptic("medium");
    if (!navigator.geolocation) { setErrMsg("Geolocation not supported."); setStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => { const pos = { lat: c.latitude, lng: c.longitude }; setCoords(pos); fetchShops(pos.lat, pos.lng, radius); },
      (err) => { if (err.code === 1) setStatus("denied"); else { setErrMsg("Could not get your location."); setStatus("error"); } },
      { timeout: 12000, enableHighAccuracy: false }
    );
  }, [radius, fetchShops]);

  useEffect(() => { if (coords && status !== "locating") fetchShops(coords.lat, coords.lng, radius); }, [radius]); // eslint-disable-line

  useEffect(() => {
    if (status !== "done" || !coords) return;
    let cancelled = false;
    const initMap = async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled) return;
        const container = mapContainerRef.current;
        if (!container) return;
        if (mapInstanceRef.current) {
          const { map, layer } = mapInstanceRef.current; layer.clearLayers();
          addMarkers(L, map, layer); map.setView([coords.lat, coords.lng], 13);
          setTimeout(() => map.invalidateSize(), 100); return;
        }
        if (container._leaflet_id != null) { try { L.map(container).remove(); } catch(_) {} container._leaflet_id = undefined; }
        const map = L.map(container, { zoomControl: true, attributionControl: true });
        map.setView([coords.lat, coords.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
        const layer = L.layerGroup().addTo(map); mapInstanceRef.current = { map, layer };
        addMarkers(L, map, layer); setTimeout(() => { if (!cancelled && map) map.invalidateSize(); }, 250);
      } catch(e) { if (!cancelled) console.error("Map init failed:", e); }
    };
    const addMarkers = (L, map, layer) => {
      const userIcon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 0 12px rgba(249,115,22,0.7)"></div>`, iconSize: [14,14], iconAnchor: [7,7] });
      L.marker([coords.lat, coords.lng], { icon: userIcon }).addTo(layer).bindPopup("📍 You are here");
      shops.forEach(shop => {
        const shopIcon = L.divIcon({ className: "", html: `<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #f97316;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>`, iconSize: [10,10], iconAnchor: [5,5] });
        L.marker([shop.lat, shop.lng], { icon: shopIcon }).addTo(layer).bindPopup(`<b style="font-size:12px">${shop.name}</b>`);
      });
    };
    initMap();
    return () => { cancelled = true; };
  }, [status, shops, coords]);

  useEffect(() => { return () => { if (mapInstanceRef.current) { try { mapInstanceRef.current.map.remove(); } catch(_) {} mapInstanceRef.current = null; } }; }, []);

  const locateRef = usePressEffect({ scale: 0.97, hapticType: "medium" });

  if (status === "idle") return (
    <div style={{ marginTop: 32, ...G.card, borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <div style={{ width: 54, height: 54, borderRadius: "50%", background: `${T.accent}14`, border: `1px solid ${T.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📍</div>
      <div><p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 6px" }}>Find Nearby Tyre Shops</p><p style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.7, margin: 0 }}>Based on your diagnosis, we recommend visiting a professional. Share your location to find the nearest tyre shops.</p></div>
      <button ref={locateRef} onClick={locate} className="mag-btn" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", padding: "14px 28px", borderRadius: 12, cursor: "pointer", boxShadow: `0 0 28px ${T.accent}40`, width: "100%" }}>◎ USE MY LOCATION</button>
    </div>
  );
  if (status === "locating") return <LocatorStatus icon="◎" msg="Getting your location…" sub="Please allow location access." spin />;
  if (status === "loading") return <LocatorStatus icon="⌁" msg="Searching for tyre shops…" sub={`Looking within ${radius} km radius.`} spin />;
  if (status === "denied") return <LocatorStatus icon="✕" msg="Location access denied" sub="Enable location permissions in your browser and try again." err />;
  if (status === "error") return <LocatorStatus icon="✕" msg="Something went wrong" sub={errMsg} err onRetry={() => { setStatus("idle"); setErrMsg(""); }} />;
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, margin: 0 }}>{shops.length > 0 ? `${shops.length} shops found` : "No shops found nearby"}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RADIUS_OPTIONS.map(km => <RadiusBtn key={km} km={km} active={radius === km} onClick={() => { setRadius(km); haptic("light"); }} />)}
        </div>
      </div>
      <div style={{ width: "100%", height: 240, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 14, position: "relative", zIndex: 1 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
      {shops.length === 0
        ? <p style={{ fontSize: 12, color: T.textMuted, textAlign: "center", padding: 16 }}>No tyre shops found within {radius} km. Try increasing the radius.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{shops.map((shop, i) => <ShopCard key={shop.id} shop={shop} index={i} selected={selected?.id === shop.id} onClick={() => { setSelected(s => s?.id === shop.id ? null : shop); haptic("light"); }} />)}</div>
      }
    </div>
  );
}

function RadiusBtn({ km, active, onClick }) {
  const T = useTokens(); const ref = usePressEffect({ scale: 0.9, hapticType: "light" });
  return <button ref={ref} onClick={onClick} style={{ padding: "7px 13px", borderRadius: 20, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.2s", background: active ? `${T.accent}33` : T.ghost, border: active ? `1px solid ${T.accent}80` : `1px solid ${T.border}`, color: active ? T.accent : T.textMuted }}>{km} km</button>;
}

function ShopCard({ shop, index, selected, onClick }) {
  const G = useG(); const T = useTokens(); const ref = usePressEffect({ scale: 0.98, hapticType: "light" });
  return (
    <div ref={ref} onClick={onClick} style={{ animationDelay: `${index * 0.05}s`, ...G.card, borderRadius: 12, padding: "14px 16px", cursor: "pointer", borderLeft: selected ? `2px solid ${T.accent}99` : `2px solid ${T.borderFaint}`, transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)", background: selected ? `${T.accent}0a` : G.card.background }}>
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
          {shop.phone && <a href={`tel:${shop.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 11, textDecoration: "none" }}>📞 {shop.phone}</a>}
          {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: `${T.accent}14`, border: `1px solid ${T.accent}33`, color: T.accent, fontSize: 11, textDecoration: "none" }}>↗ Website</a>}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", fontSize: 11, textDecoration: "none" }}>🗺 Directions</a>
        </div>
      )}
    </div>
  );
}

function LocatorStatus({ icon, msg, sub, spin, err, onRetry }) {
  const G = useG(); const T = useTokens();
  return (
    <div style={{ marginTop: 24, ...G.card, borderRadius: 14, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        {spin ? (<><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}22` }} /><div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}`, borderTopColor: "transparent", animation: "spin 0.9s linear infinite" }} /></>) : (<div style={{ width: "100%", height: "100%", borderRadius: "50%", background: err ? "rgba(239,68,68,0.1)" : `${T.accent}14`, border: `1px solid ${err ? "rgba(239,68,68,0.25)" : T.accent + "33"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>)}
      </div>
      <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: err ? "#ef4444" : T.text, margin: 0 }}>{msg}</p>
      <p style={{ fontSize: 11, color: T.textMuted, margin: 0, lineHeight: 1.65 }}>{sub}</p>
      {onRetry && <button onClick={() => { onRetry(); haptic("medium"); }} style={{ marginTop: 4, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 11, padding: "9px 18px", borderRadius: 8, cursor: "pointer" }}>Try Again</button>}
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function ResponsiveNav({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false); const [isMobile, setIsMobile] = useState(false); const G = useG(); const T = useTokens();
  useEffect(() => { const check = () => setIsMobile(window.innerWidth <= 640); check(); window.addEventListener("resize", check, { passive: true }); return () => window.removeEventListener("resize", check); }, []);
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 24); window.addEventListener("scroll", fn, { passive: true }); return () => window.removeEventListener("scroll", fn); }, []);
  const go = useCallback((p) => { setPage(p); haptic("light"); window.scrollTo({ top: 0, behavior: "smooth" }); }, [setPage]);

  const logoRef = usePressEffect({ scale: 0.94, hapticType: "light" });

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, padding: isMobile ? "0 16px" : "0 clamp(16px,4vw,40px)", height: 56, transition: "background 0.45s, box-shadow 0.45s, backdrop-filter 0.45s", ...(scrolled ? { background: T.navBg, backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", borderBottom: `1px solid ${T.border}`, boxShadow: `0 1px 0 ${T.borderFaint}` } : { background: "transparent", border: "none" }) }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          <button ref={logoRef} onClick={() => go("landing")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${T.accent}55`, flexShrink: 0 }}><svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" fill="none" /><circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="2" fill="none" /></svg></div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, letterSpacing: "0.1em", fontSize: isMobile ? 16 : 18, color: T.text }}>STRADA</span>
          </button>
          {!isMobile && (<div style={{ display: "flex", alignItems: "center", gap: 4 }}>{[["diagnose", "DIAGNOSE"], ["about", "HOW IT WORKS"]].map(([p, l]) => (<NavBtn key={p} active={page === p} onClick={() => go(p)} label={l} />))}<ThemeToggle /><button onClick={() => go("diagnose")} className="mag-btn" style={{ marginLeft: 8, background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", padding: "8px 18px", borderRadius: 8, cursor: "pointer", boxShadow: `0 0 20px ${T.accent}44` }}>ANALYSE →</button></div>)}
          {isMobile && <ThemeToggle />}
        </div>
      </nav>
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 500, background: T.bottomNavBg, backdropFilter: "blur(32px) saturate(200%)", WebkitBackdropFilter: "blur(32px) saturate(200%)", borderTop: `1px solid ${T.border}`, borderRadius: "20px 20px 0 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }} className="bottom-nav-safe">
          {[{ id: "landing", icon: "◉", label: "HOME" }, { id: "diagnose", icon: "▶", label: "DIAGNOSE" }, { id: "about", icon: "◈", label: "ABOUT" }].map(tab => <BottomTab key={tab.id} tab={tab} active={page === tab.id} onClick={() => go(tab.id)} />)}
        </div>
      )}
    </>
  );
}

function NavBtn({ active, onClick, label }) {
  const T = useTokens();
  return <button onClick={onClick} style={{ background: active ? `${T.accent}1c` : "transparent", border: active ? `1px solid ${T.accent}44` : "1px solid transparent", color: active ? T.accent : T.textMuted, fontSize: 10, letterSpacing: "0.12em", padding: "7px 14px", borderRadius: 8, cursor: "pointer", transition: "all 0.22s" }}>{label}</button>;
}

function BottomTab({ tab, active, onClick }) {
  const T = useTokens(); const ref = usePressEffect({ scale: 0.88, hapticType: "light" });
  return (
    <button ref={ref} onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0 6px", gap: 4, position: "relative", color: active ? T.accent : T.textMuted, transition: "color 0.2s", WebkitTapHighlightColor: "transparent" }}>
      {active && <div style={{ position: "absolute", top: 0, width: 28, height: 3, borderRadius: "0 0 3px 3px", background: `linear-gradient(90deg,${T.accent},${T.accentMid})`, boxShadow: `0 0 10px ${T.accent}`, animation: "tabPill 0.28s cubic-bezier(0.34,1.56,0.64,1)" }} />}
      <span style={{ fontSize: 16, lineHeight: 1, transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)", transform: active ? "scale(1.15)" : "scale(1)" }}>{tab.icon}</span>
      <span style={{ fontSize: 8, letterSpacing: "0.1em", fontWeight: active ? 700 : 400 }}>{tab.label}</span>
    </button>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ setPage }) {
  useReveal(); const G = useG(); const T = useTokens(); const { theme } = useTheme();
  const features = useMemo(() => [
    { icon: "◎", n: "01", title: "Wear Classification", desc: "EfficientNet-B3 classifies wear across 5 levels — New to Bald — with sub-millimetre pattern sensitivity." },
    { icon: "▦", n: "02", title: "Tread Depth Estimation", desc: "Computer vision estimates remaining depth in mm and predicts remaining kilometres before legal minimum." },
    { icon: "⌁", n: "03", title: "Sidewall Detection", desc: "YOLOv8 detects bulges, cuts, and dry rot — sidewall damage invisible to the untrained eye." },
    { icon: "◈", n: "04", title: "Grad-CAM Heatmaps", desc: "Gradient attention maps reveal exactly which tread zones drove the AI verdict. Full explainability." },
    { icon: "◐", n: "05", title: "Pattern Diagnosis", desc: "Identifies cupping, feathering, one-sided wear — each linked to specific mechanical root causes." },
    { icon: "◑", n: "06", title: "Health Score", desc: "All module outputs synthesised into one composite A–F grade with urgency level and recommendation." },
  ], []);
  const diagBtnRef = usePressEffect({ scale: 0.96, hapticType: "medium" });
  const aboutBtnRef = usePressEffect({ scale: 0.96, hapticType: "light" });
  const ctaBtnRef = usePressEffect({ scale: 0.96, hapticType: "medium" });
  return (
    <div className="page-enter">
      <section className="hero-section" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(80px,14vh,120px) clamp(16px,5vw,40px) clamp(40px,6vh,60px)", position: "relative" }}>
        <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, ...G.panel, borderRadius: 100, padding: "8px 16px", flexWrap: "wrap", justifyContent: "center" }}>
          <div className="dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent, boxShadow: `0 0 12px ${T.accent}`, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: T.textSub, letterSpacing: "0.12em" }}>AI-POWERED TYRE INTELLIGENCE</span>
          <span style={{ background: `${T.accent}24`, border: `1px solid ${T.accent}4d`, color: T.accent, fontSize: 9, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 4 }}>BETA</span>
        </div>
        <div className="hero-title-wrap"><h1 className={`hero-title ${theme === "dark" ? "shimmer-text" : "shimmer-text-light"}`} style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(72px,14vw,168px)", lineHeight: 0.88, letterSpacing: "-0.03em", margin: "0 0 24px" }}>STRADA</h1></div>
        <p className="hero-desc hero-desc-wrap" style={{ fontSize: "clamp(12px,1.5vw,16px)", color: T.textSub, maxWidth: 480, margin: "0 auto 44px", lineHeight: 1.82, padding: "0 8px" }}>Upload five tyre photos. Get a full AI diagnostic report in seconds — wear level, tread depth, pattern analysis, and explainable heatmaps.</p>
        <div className="hero-buttons hero-buttons-wrap" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", width: "100%", maxWidth: 400 }}>
          <button ref={diagBtnRef} onClick={() => setPage("diagnose")} className="mag-btn hero-btn-glow" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,15px)", letterSpacing: "0.06em", padding: "16px 36px", borderRadius: 14, cursor: "pointer", boxShadow: `0 0 50px ${T.accent}55,0 4px 24px rgba(0,0,0,0.25)`, flex: 1 }}>▶  RUN DIAGNOSTIC</button>
          <button ref={aboutBtnRef} onClick={() => setPage("about")} className="mag-btn" style={{ ...G.panel, borderRadius: 14, color: T.textSub, fontSize: "clamp(11px,2.5vw,13px)", letterSpacing: "0.06em", padding: "16px 28px", cursor: "pointer", border: `1px solid ${T.border}`, fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>HOW IT WORKS</button>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.22 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.22em", color: T.textMuted }}>SCROLL</span>
            <div style={{ width: 1, height: 36, background: `linear-gradient(180deg,${T.textMuted},transparent)` }} />
          </div>
        </div>
      </section>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(48px,8vh,120px) clamp(16px,5vw,40px)" }}>
        <div className="strada-reveal" style={{ textAlign: "center", marginBottom: "clamp(36px,6vh,80px)" }}>
          <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.22em", marginBottom: 12 }}>DIAGNOSTIC MODULES</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,5vw,54px)", color: T.text, letterSpacing: "-0.03em", lineHeight: 1.12, margin: "0 0 12px" }}>Six AI Engines.<br /><span style={{ color: T.textMuted }}>One Verdict.</span></h2>
        </div>
        <div className="grid3">{features.map((f, i) => <FeatureCard key={i} f={f} />)}</div>
      </section>
      <section className="strada-reveal" style={{ maxWidth: 900, margin: "0 auto clamp(80px,12vh,130px)", padding: "0 clamp(16px,5vw,40px)" }}>
        <div className="border-flow-anim" style={{ ...G.panel, borderRadius: 24, padding: "clamp(24px,5vw,56px)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: `linear-gradient(135deg,transparent,${T.accent}09)`, pointerEvents: "none" }} />
          <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.22em", marginBottom: 10 }}>PIPELINE</p>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(20px,4vw,34px)", color: T.text, margin: "0 0 36px", letterSpacing: "-0.02em" }}>Upload → Analyse → Report</h3>
          <div className="pipeline-steps" style={{ display: "flex", gap: 0, position: "relative" }}>
            <div className="step-line" style={{ position: "absolute", top: 28, left: 32, right: 32, height: 1, background: `linear-gradient(90deg,${T.accent}60,${T.accent}18,transparent)` }} />
            {["Upload 5 Images", "Flask runs 4 models", "Grad-CAM + scores", "Full report ready"].map((step, i) => (
              <div key={i} className="pipeline-step" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "0 6px" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: i === 0 ? `linear-gradient(135deg,${T.accentMid},${T.accentDark})` : G.card.background, border: `1px solid ${T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: i === 0 ? `0 0 24px ${T.accent}55` : "none", position: "relative", zIndex: 1 }}><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: i === 0 ? "white" : `${T.accent}88` }}>0{i+1}</span></div>
                <span className="pipeline-step-text" style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.55, letterSpacing: "0.02em" }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 44, textAlign: "center" }}>
            <button ref={ctaBtnRef} onClick={() => setPage("diagnose")} className="mag-btn" style={{ background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,14px)", letterSpacing: "0.06em", padding: "15px 36px", borderRadius: 12, cursor: "pointer", boxShadow: `0 0 32px ${T.accent}44`, width: "100%", maxWidth: 280 }}>START DIAGNOSTIC →</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ f }) {
  const G = useG(); const T = useTokens(); const ref = usePressEffect({ scale: 0.985, hapticType: "light" });
  return (
    <div ref={ref} className="strada-reveal lift-card" style={{ ...G.card, borderRadius: 18, padding: "clamp(18px,3vw,28px)", position: "relative", overflow: "hidden", cursor: "default" }}>
      <div style={{ position: "absolute", top: -8, right: 12, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 88, color: `${T.accent}09`, lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{f.n}</div>
      <div style={{ fontSize: 20, marginBottom: 12, color: T.accent }}>{f.icon}</div>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, letterSpacing: "-0.01em", margin: "0 0 8px" }}>{f.title}</h3>
      <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.78, margin: 0 }}>{f.desc}</p>
    </div>
  );
}

// ─── STEP CARD (extracted so hook isn't called inside .map) ──────────────────
function StepCard({ st }) {
  const G = useG(); const T = useTokens();
  const ref = usePressEffect({ scale: 0.99, hapticType: "light" });
  return (
    <div ref={ref} className="strada-reveal lift-card" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,28px) clamp(16px,3vw,32px)", display: "flex", gap: 20, alignItems: "flex-start", borderLeft: `1px solid ${T.accent}1e` }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,5vw,44px)", color: `${T.accent}28`, letterSpacing: "-0.04em", lineHeight: 1, flexShrink: 0, minWidth: 50, userSelect: "none" }}>{st.n}</div>
      <div style={{ paddingTop: 4 }}>
        <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{st.title}</h3>
        <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.78, margin: 0 }}>{st.desc}</p>
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage() {
  useReveal(); const G = useG(); const T = useTokens();
  const steps = useMemo(() => [
    { n: "01", title: "Upload Images", desc: "Provide up to 5 photos — left/right profiles, area of interest, tread close-up, and optional sidewall crack scan for maximum coverage." },
    { n: "02", title: "Multi-Model Inference", desc: "EfficientNet-B3, CNN pattern classifier, YOLOv8, and EasyOCR (for DOT code) run simultaneously on your uploaded images." },
    { n: "03", title: "Grad-CAM Explained", desc: "A backward pass generates gradient-weighted attention maps highlighting exactly which tread regions drove the wear classification verdict." },
    { n: "04", title: "Health Score Synthesis", desc: "All outputs aggregated into a composite 0–100 health score graded A–F, with urgency level (low/medium/high) and plain-English recommendation." },
    { n: "05", title: "Full Diagnostic Report", desc: "A printable report with gauges, depth bars, score breakdowns, Grad-CAM image, submitted photos, and quality warnings is instantly generated." },
  ], []);
  return (
    <div className="page-enter" style={{ maxWidth: 780, margin: "0 auto", padding: "clamp(76px,10vh,120px) clamp(16px,5vw,40px) clamp(80px,10vh,80px)" }}>
      <div className="strada-reveal" style={{ marginBottom: 56 }}>
        <p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.22em", marginBottom: 14 }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,7vw,70px)", color: T.text, letterSpacing: "-0.03em", margin: "0 0 18px", lineHeight: 0.94 }}>THE DIAGNOSTIC<br /><span style={{ color: T.textMuted }}>PIPELINE.</span></h2>
        <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.85, maxWidth: 540 }}>Strada runs a chain of computer vision models on your tyre images, each specialising in a distinct aspect of tyre health.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 56 }}>
        {steps.map((st, i) => <StepCard key={i} st={st} />)}
      </div>
      <div className="strada-reveal" style={{ ...G.panel, borderRadius: 20, padding: "clamp(20px,4vw,40px)", marginBottom: 14 }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.18em", marginBottom: 16, textTransform: "uppercase" }}>Tech Stack</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["EfficientNet-B3", "YOLOv8", "pytorch-grad-cam", "EasyOCR", "Flask", "React + Vite", "Tailwind v3", "OpenCV", "PyTorch"].map(t => (<span key={t} style={{ ...G.ghost, borderRadius: 7, padding: "7px 13px", fontSize: 11, color: T.textMuted, letterSpacing: "0.04em" }}>{t}</span>))}</div>
      </div>
      <div className="strada-reveal" style={{ borderRadius: 16, border: `1px solid ${T.accent}2a`, background: `${T.accent}09`, padding: "clamp(14px,3vw,24px)" }}>
        <p style={{ fontSize: 9, color: T.accent, letterSpacing: "0.16em", marginBottom: 8, textTransform: "uppercase" }}>Disclaimer</p>
        <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8, margin: 0 }}>Strada is an AI diagnostic aid, not a replacement for professional tyre inspection. Always consult a certified technician before making safety-critical decisions.</p>
      </div>
    </div>
  );
}

// ─── UPLOAD CARD ──────────────────────────────────────────────────────────────
function UnifiedUploadCard({ files, onUpload, onRemove }) {
  const [activeSlot, setActiveSlot] = useState(null); const inputRefs = useRef({}); const uploadedCount = Object.keys(files).length; const G = useG(); const T = useTokens();
  return (
    <div style={{ ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,28px)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.text, margin: "0 0 3px" }}>Tyre Images</h3><p style={{ fontSize: 10, color: T.textMuted, margin: 0 }}>Upload up to 5 angles</p></div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: uploadedCount > 0 ? T.accent : T.textFaint }}>{uploadedCount}<span style={{ fontSize: 12, color: T.textMuted, fontFamily: "'JetBrains Mono'" }}>/{SLOTS.length}</span></span>
      </div>
      <div style={{ height: 3, background: T.ghost, borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${(uploadedCount / SLOTS.length) * 100}%`, background: `linear-gradient(90deg,${T.accentMid},${T.accent})`, borderRadius: 2, boxShadow: `0 0 12px ${T.accent}77`, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${T.accent}0c`, border: `1px solid ${T.accent}1c`, marginBottom: 16 }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
        <p style={{ fontSize: 10, color: T.textMuted, margin: 0, lineHeight: 1.65 }}><span style={{ color: `${T.accent}b3`, fontWeight: 600 }}>Tip:</span> Use flash, place a coin in the tread groove to help the AI calibrate depth.</p>
      </div>
      <div className="slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10 }}>
        {SLOTS.map(slot => { const file = files[slot.id]; const isDragging = activeSlot === slot.id; return (<SlotTile key={slot.id} slot={slot} file={file} isDragging={isDragging} inputRef={el => inputRefs.current[slot.id] = el} onDragOver={e => { e.preventDefault(); setActiveSlot(slot.id); }} onDragLeave={() => setActiveSlot(null)} onDrop={e => { e.preventDefault(); setActiveSlot(null); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onUpload(slot.id, f); }} onRemove={() => onRemove(slot.id)} onFileChange={e => { if (e.target.files[0]) onUpload(slot.id, e.target.files[0]); }} />); })}
      </div>
    </div>
  );
}

// ─── SLOT TILE ────────────────────────────────────────────────────────────────
// ↳ FIX: replaced single <input capture> with a gallery/camera picker overlay.
//   On mobile, tapping an empty slot shows a choice sheet instead of jumping
//   straight to the camera. On desktop the overlay is bypassed and the gallery
//   file-picker opens directly (no capture attribute = standard OS dialog).
function SlotTile({ slot, file, isDragging, inputRef, onDragOver, onDragLeave, onDrop, onRemove, onFileChange }) {
  const [preview, setPreview] = useState(null);
  const [justAdded, setJustAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const T = useTokens();
  const { ref: rippleRef, trigger: triggerRipple } = useRipple();
  const pressRef = usePressEffect({ scale: file ? 1 : 0.96, hapticType: file ? "light" : "medium" });

  // Internal ref for the camera-specific input
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setJustAdded(true);
    haptic("success");
    const t = setTimeout(() => setJustAdded(false), 500);
    return () => { URL.revokeObjectURL(url); clearTimeout(t); };
  }, [file]);

  // Merge refs for ripple + press effect
  const setRef = (el) => {
    rippleRef.current = el;
    if (typeof pressRef === "object" && pressRef) pressRef.current = el;
  };

  const handleTileClick = (e) => {
    if (file) return; // already has image — remove button handles it
    if (isMobile) {
      // Show gallery/camera choice on mobile
      triggerRipple(e);
      setShowPicker(true);
      haptic("light");
    } else {
      // Desktop: open gallery file picker directly
      triggerRipple(e);
      inputRef?.click?.();
    }
  };

  const handleGalleryClick = (e) => {
    e.stopPropagation();
    setShowPicker(false);
    haptic("light");
    inputRef?.click?.();
  };

  const handleCameraClick = (e) => {
    e.stopPropagation();
    setShowPicker(false);
    haptic("medium");
    cameraInputRef.current?.click();
  };

  const handleCancelPicker = (e) => {
    e.stopPropagation();
    setShowPicker(false);
  };

  return (
    <div
      ref={setRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={justAdded ? "slot-added" : ""}
      style={{
        position: "relative",
        height: "clamp(90px,15vh,130px)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: file ? "default" : "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        WebkitTapHighlightColor: "transparent",
        ...(isDragging
          ? { background: `${T.accent}14`, border: `1.5px solid ${T.accent}99`, boxShadow: `0 0 28px ${T.accent}22` }
          : file
          ? { background: "rgba(0,0,0,0.45)", border: `1px solid ${T.border}` }
          : { background: T.ghost, border: `1px dashed ${T.border}` })
      }}
      onClick={handleTileClick}
    >
      {/* ── Filled state ── */}
      {preview ? (
        <>
          <img src={preview} alt={slot.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: hovered ? "rgba(0,0,0,0.55)" : "transparent", transition: "background 0.2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {hovered && (
              <button onClick={e => { e.stopPropagation(); haptic("medium"); onRemove(); }} style={{ background: "rgba(239,68,68,0.9)", border: "none", color: "white", fontSize: 10, letterSpacing: "0.1em", padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>✕ REMOVE</button>
            )}
          </div>
          <button onClick={e => { e.stopPropagation(); haptic("medium"); onRemove(); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.75)", fontSize: 11, WebkitTapHighlightColor: "transparent" }}>✕</button>
          <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(16,185,129,0.88)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "2px 7px", fontSize: 9, color: "white", letterSpacing: "0.08em" }}>✓</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 8px 5px", background: "linear-gradient(transparent,rgba(0,0,0,0.68))" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", margin: 0, letterSpacing: "0.08em", textAlign: "center" }}>{slot.label}</p>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 7, padding: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: isDragging ? `${T.accent}1e` : T.ghost, flexShrink: 0, transition: "all 0.2s" }}>
            <span style={{ color: isDragging ? T.accent : T.textMuted, fontSize: 15, lineHeight: 1 }}>{isDragging ? "↓" : slot.icon}</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: isDragging ? T.accent : T.textSub, margin: "0 0 2px", letterSpacing: "0.04em" }}>{slot.label}</p>
            <p style={{ fontSize: 8, color: T.textFaint, margin: 0, letterSpacing: "0.03em" }}>{slot.hint}</p>
          </div>
        </div>
      )}

      {/* ── Gallery / Camera picker overlay (mobile only, shown on tap) ── */}
      {showPicker && !file && (
        <div
          className="picker-in"
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10, borderRadius: 12,
          }}
        >
          {/* Slot label */}
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", letterSpacing: "0.14em", margin: "0 0 4px", textTransform: "uppercase" }}>{slot.label}</p>

          {/* Gallery button */}
          <button
            onClick={handleGalleryClick}
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "white",
              fontSize: 11,
              letterSpacing: "0.08em",
              padding: "11px 0",
              borderRadius: 10,
              cursor: "pointer",
              width: 148,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
            }}
          >
            🖼 GALLERY
          </button>

          {/* Camera button */}
          <button
            onClick={handleCameraClick}
            style={{
              background: `rgba(249,115,22,0.18)`,
              border: `1px solid rgba(249,115,22,0.42)`,
              color: "#f97316",
              fontSize: 11,
              letterSpacing: "0.08em",
              padding: "11px 0",
              borderRadius: 10,
              cursor: "pointer",
              width: 148,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
            }}
          >
            📷 CAMERA
          </button>

          {/* Cancel */}
          <button
            onClick={handleCancelPicker}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.32)",
              fontSize: 10, cursor: "pointer",
              marginTop: 2, letterSpacing: "0.1em",
              padding: "6px 12px",
            }}
          >
            cancel
          </button>
        </div>
      )}

      {/* ── Gallery input (no capture — opens Photos / Files on mobile) ── */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {/* ── Camera input (capture="environment" — opens camera directly) ── */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
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
  const [completedSteps, setCompletedSteps] = useState([]); const [activeStep, setActiveStep] = useState(0); const G = useG(); const T = useTokens();
  useEffect(() => {
    let stepIdx = 0; let timeout;
    const advance = () => {
      if (stepIdx >= DIAGNOSTIC_STEPS.length) return;
      setActiveStep(stepIdx);
      timeout = setTimeout(() => {
        haptic("light");
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.borderFaint}` }}>
        <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}22` }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${T.accent}`, borderTopColor: "transparent", animation: "spin 0.9s linear infinite" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: T.text, margin: "0 0 2px" }}>Running Diagnostic</p>
          <p style={{ fontSize: 10, color: T.textFaint, margin: 0, letterSpacing: "0.06em" }}>{completedSteps.length}/{DIAGNOSTIC_STEPS.length} modules complete</p>
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {DIAGNOSTIC_STEPS.map((s, i) => (<div key={s.id} style={{ width: completedSteps.includes(s.id) ? 12 : activeStep === i ? 8 : 4, height: 4, borderRadius: 2, background: completedSteps.includes(s.id) ? "#10b981" : activeStep === i ? T.accent : T.ghost, transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)" }} />))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DIAGNOSTIC_STEPS.map((step, i) => {
          const done = completedSteps.includes(step.id); const active = activeStep === i && !done;
          return (
            <div key={step.id} className={done || active ? "status-anim" : ""} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, background: active ? `${T.accent}0c` : done ? "rgba(16,185,129,0.04)" : "transparent", border: active ? `1px solid ${T.accent}24` : done ? "1px solid rgba(16,185,129,0.1)" : "1px solid transparent", transition: "all 0.3s ease", animationDelay: `${i * 0.04}s` }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: done ? "rgba(16,185,129,0.14)" : active ? `${T.accent}1c` : T.ghost, border: done ? "1px solid rgba(16,185,129,0.28)" : active ? `1px solid ${T.accent}44` : `1px solid ${T.border}`, transition: "all 0.25s" }}>
                {done ? <span style={{ color: "#10b981", fontSize: 10 }}>✓</span> : active ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: "pulse 1s ease-in-out infinite" }} /> : <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.textFaint }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, margin: "0 0 1px", color: done ? T.textMuted : active ? T.text : T.textFaint, fontFamily: active ? "'Syne',sans-serif" : "'JetBrains Mono',monospace", fontWeight: active ? 600 : 400, transition: "all 0.25s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.label}</p>
                {active && <p style={{ fontSize: 9, color: `${T.accent}8a`, margin: 0, letterSpacing: "0.06em" }}>{step.detail}</p>}
              </div>
              <span style={{ fontSize: 9, letterSpacing: "0.1em", flexShrink: 0, color: done ? "#10b981" : active ? T.accent : T.textFaint }}>{done ? "DONE" : active ? "RUN" : "…"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HEALTH COMPONENTS ────────────────────────────────────────────────────────
function HealthGauge({ score, grade, label, color }) {
  const c = SVG_C[color] || "#52525b"; const T = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 110, height: 110 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke={T.ghost} strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="8" strokeDasharray={`${(score / 100) * 263.9} 263.9`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${c}99)`, transition: "stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
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
  const pct = (score / max) * 100; const c = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444"; const T = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <span style={{ fontSize: 11, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, color: T.textFaint }}>{score}/{max} · {sublabel}</span>
      </div>
      <div style={{ height: 3, background: T.ghost, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 2, boxShadow: `0 0 8px ${c}99`, transition: "width 1.6s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
    </div>
  );
}

function DepthMeter({ depth_mm, status, color, remaining_km }) {
  const pct = Math.min((depth_mm / 9) * 100, 100); const c = SVG_C[color] || "#52525b"; const T = useTokens();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,6vw,36px)", color: c, lineHeight: 1 }}>{depth_mm}</span>
        <span style={{ fontSize: 13, color: T.textMuted }}>mm</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: c, letterSpacing: "0.1em" }}>{status}</span>
      </div>
      <div style={{ height: 5, background: T.ghost, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, boxShadow: `0 0 12px ${c}88`, transition: "width 1.6s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textFaint, letterSpacing: "0.07em" }}><span>0mm</span><span style={{ color: "#f59e0b" }}>▲ 1.6 legal min</span><span>9mm (new)</span></div>
      {remaining_km != null && <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>~{remaining_km.toLocaleString()} km remaining</p>}
    </div>
  );
}

function EditableTyreAgeCard({ tyreAge, onChange }) {
  const [editing, setEditing] = useState(false); const [value, setValue] = useState(tyreAge?.age_display || "Unknown"); const inputRef = useRef(null); const G = useG(); const T = useTokens();
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  const commit = () => { setEditing(false); onChange?.(value); };
  const isHighlight = tyreAge?.status === "Replace";
  const editRef = usePressEffect({ scale: 0.9, hapticType: "light" });
  return (
    <div style={{ ...G.card, borderRadius: 12, padding: "14px 16px", borderLeft: `2px solid ${isHighlight ? "rgba(239,68,68,0.4)" : T.borderFaint}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: 0, textTransform: "uppercase" }}>TYRE AGE</p>
        <button ref={editRef} onClick={() => { if (editing) commit(); else { setEditing(true); haptic("light"); } }} style={{ background: editing ? `${T.accent}24` : T.ghost, border: editing ? `1px solid ${T.accent}44` : `1px solid ${T.border}`, color: editing ? T.accent : T.textMuted, fontSize: 9, letterSpacing: "0.1em", padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>{editing ? "SAVE" : "EDIT"}</button>
      </div>
      {editing
        ? (<input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(tyreAge?.age_display || "Unknown"); } }} style={{ width: "100%", background: `${T.accent}0c`, border: `1px solid ${T.accent}44`, color: T.accent, fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, padding: "6px 10px", borderRadius: 7, outline: "none", marginBottom: 4 }} />)
        : (<p style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: isHighlight ? "#ef4444" : T.text, margin: "0 0 3px" }}>{value}</p>)
      }
      <p style={{ fontSize: 10, color: T.textFaint, margin: 0, lineHeight: 1.55 }}>{tyreAge?.manufacture || ""}{!tyreAge?.dot_found ? " (DOT not detected)" : ""}</p>
    </div>
  );
}

function MiniCard({ label, value, sub, highlight }) {
  const G = useG(); const T = useTokens();
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
  if (!base64) return <div style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: 32, textAlign: "center", fontSize: 11, color: T.textFaint }}>No heatmap available</div>;
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}>
      {originalBase64 && <img src={`data:image/jpeg;base64,${originalBase64}`} alt="Original tread" style={{ width: "100%", objectFit: "contain", maxHeight: 240, display: "block" }} />}
      <img src={`data:image/jpeg;base64,${base64}`} alt="Grad-CAM" className={originalBase64 ? "gradcam-img" : ""} style={{ width: "100%", objectFit: "contain", maxHeight: 240, display: "block", ...(originalBase64 ? { position: "absolute", inset: 0, height: "100%", mixBlendMode: "multiply", filter: "saturate(1.8) contrast(1.1)" } : {}) }} />
      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "#f97316cc", letterSpacing: "0.1em" }}>GRAD-CAM</div>
      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em" }}>{originalBase64 ? "OVERLAY" : "HEATMAP"}</div>
    </div>
  );
}

// ─── PRINT REPORT ─────────────────────────────────────────────────────────────
function PrintReport({ result }) {
  if (!result) return null;
  const u = URGENCY[result.urgency] || URGENCY.medium;
  const now = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const health = result.health; const depth = result.tread_depth;
  const depthPct = Math.min((depth?.depth_mm / 9) * 100, 100) || 0;
  const depthColor = depthPct >= 60 ? "#059669" : depthPct >= 25 ? "#d97706" : "#dc2626";
  const urgencyColor = result.urgency === "high" ? "#dc2626" : result.urgency === "medium" ? "#d97706" : "#059669";
  const gradeColor = health?.color === "green" ? "#059669" : health?.color === "yellow" ? "#d97706" : "#dc2626";
  return (
    <div id="strada-print-report" style={{ display: "none", fontFamily: "Arial, sans-serif", background: "#ffffff", color: "#111111", padding: "0", margin: "0" }}>
      <div style={{ padding: "24px 32px", maxWidth: "100%", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 16 }}>
          <div><div style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1 }}>STRADA</div><div style={{ fontSize: 9, color: "#666", letterSpacing: "0.14em", marginTop: 2 }}>AI TYRE DIAGNOSTIC REPORT</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#444" }}>Generated: {now} at {time}</div><div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>STRADA Tyre Intelligence System</div></div>
        </div>
        <div style={{ background: result.urgency === "high" ? "#fef2f2" : result.urgency === "medium" ? "#fffbeb" : "#f0fdf4", border: `2px solid ${urgencyColor}`, borderRadius: 6, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: urgencyColor, flexShrink: 0 }} />
          <div><span style={{ fontWeight: 800, fontSize: 13, color: urgencyColor, letterSpacing: "0.08em" }}>{u.label}</span><span style={{ fontSize: 12, color: "#444", marginLeft: 10 }}>{result.recommendation}</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 4 }}>HEALTH GRADE</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{health?.grade}</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{health?.score} / 100</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 4 }}>TREAD DEPTH</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: depthColor, lineHeight: 1 }}>{depth?.depth_mm}<span style={{ fontSize: 14, fontWeight: 400, color: "#555" }}> mm</span></div>
            <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3, marginTop: 6 }}><div style={{ height: "100%", width: `${depthPct}%`, background: depthColor, borderRadius: 3 }} /></div>
            <div style={{ fontSize: 8, color: "#888", marginTop: 3 }}>Legal min: 1.6 mm · New: 9 mm</div>
            {depth?.remaining_km != null && <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>~{depth.remaining_km.toLocaleString()} km est. remaining</div>}
          </div>
          <div style={{ border: `2px solid ${urgencyColor}`, borderRadius: 6, padding: "10px 12px", background: result.urgency === "high" ? "#fef2f2" : result.urgency === "medium" ? "#fffbeb" : "#f0fdf4" }}>
            <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 4 }}>URGENCY LEVEL</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: urgencyColor, lineHeight: 1.2 }}>{u.label}</div>
            <div style={{ fontSize: 9, color: "#555", marginTop: 4, lineHeight: 1.4 }}>{result.urgency === "high" ? "Immediate replacement required." : result.urgency === "medium" ? "Schedule replacement within 2–4 weeks." : "Monitor regularly."}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 4 }}>TYRE AGE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: result.tyre_age?.status === "Replace" ? "#dc2626" : "#111", lineHeight: 1.2 }}>{result.tyre_age?.age_display || "Unknown"}</div>
            <div style={{ fontSize: 9, color: "#666", marginTop: 4, lineHeight: 1.4 }}>{result.tyre_age?.manufacture || ""}</div>
            {!result.tyre_age?.dot_found && <div style={{ fontSize: 8, color: "#d97706", marginTop: 2 }}>⚠ DOT code not detected</div>}
          </div>
        </div>
        {result.health?.breakdown && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 10 }}>DIAGNOSTIC SCORE BREAKDOWN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {Object.entries(result.health.breakdown).map(([k, v]) => {
                const pct2 = (v.score / v.max) * 100; const bc = pct2 >= 70 ? "#059669" : pct2 >= 40 ? "#d97706" : "#dc2626";
                return (<div key={k}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}><span style={{ color: "#444", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span><span style={{ color: "#888" }}>{v.score}/{v.max} — {v.label}</span></div><div style={{ height: 4, background: "#f3f4f6", borderRadius: 2 }}><div style={{ height: "100%", width: `${pct2}%`, background: bc, borderRadius: 2 }} /></div></div>);
              })}
            </div>
          </div>
        )}
        <div style={{ border: `1px solid ${urgencyColor}`, borderLeft: `4px solid ${urgencyColor}`, borderRadius: 6, padding: "10px 14px", marginBottom: 16, background: result.urgency === "high" ? "#fef2f2" : result.urgency === "medium" ? "#fffbeb" : "#f0fdf4" }}>
          <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 4 }}>TECHNICIAN RECOMMENDATION</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#222", lineHeight: 1.6 }}>{result.recommendation}</div>
        </div>
        {result.warnings?.length > 0 && (
          <div style={{ border: "1px solid #fcd34d", borderLeft: "4px solid #f59e0b", borderRadius: 6, padding: "10px 14px", marginBottom: 16, background: "#fffbeb" }}>
            <div style={{ fontSize: 8, color: "#92400e", letterSpacing: "0.12em", marginBottom: 4 }}>IMAGE QUALITY WARNINGS</div>
            {result.warnings.map((w, i) => <div key={i} style={{ fontSize: 10, color: "#78350f", marginBottom: 2, lineHeight: 1.5 }}>• {w}</div>)}
          </div>
        )}
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 8 }}>SHOP TECHNICIAN NOTES</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {["Tyre Replaced (Y/N)", "Replacement Tyre Size", "New Tread Depth (mm)", "Job Card / Invoice #"].map(field => (<div key={field}><div style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>{field}</div><div style={{ height: 22, borderBottom: "1px solid #d1d5db" }} /></div>))}
          </div>
          <div style={{ marginTop: 10 }}><div style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>ADDITIONAL OBSERVATIONS</div><div style={{ height: 40, borderBottom: "1px solid #d1d5db" }} /></div>
        </div>
        {result.gradcam_image && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 8, color: "#888", letterSpacing: "0.12em", marginBottom: 8 }}>GRAD-CAM AI ATTENTION MAP</div>
            <img src={`data:image/jpeg;base64,${result.gradcam_image}`} alt="Grad-CAM" style={{ width: 200, height: 150, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 4 }} />
          </div>
        )}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 8, color: "#aaa", letterSpacing: "0.08em" }}>STRADA AI TYRE INTELLIGENCE — {now}</span>
          <span style={{ fontSize: 8, color: "#aaa", letterSpacing: "0.06em" }}>AI AID — NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
        </div>
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
  const G = useG(); const T = useTokens();
  useEffect(() => { setIsMobile(window.innerWidth <= 640); }, []);
  const printResult = { ...result, tyre_age: tyreAge };

  const handlePrint = () => {
    const el = document.getElementById("strada-print-report");
    if (el) { el.style.display = "block"; window.print(); el.style.display = "none"; } else { window.print(); }
  };

  const closeRef = usePressEffect({ scale: 0.93, hapticType: "light" });
  const printRef = usePressEffect({ scale: 0.93, hapticType: "light" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", background: T.bg, animation: "slideUp 0.38s cubic-bezier(0.16,1,0.3,1)" }}>
      <PrintReport result={printResult} />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: `clamp(20px,5vh,64px) clamp(14px,4vw,28px) ${isMobile ? "100px" : "48px"}` }}>
        <div className="report-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="report-header-title" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(32px,8vw,52px)", color: T.text, letterSpacing: "-0.03em", margin: "0 0 4px", lineHeight: 1 }}>STRADA</h1>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em" }}>TYRE DIAGNOSTIC REPORT · {now}</p>
          </div>
          <div className="report-actions" style={{ display: "flex", gap: 8 }}>
            <button ref={printRef} onClick={handlePrint} className="ios-press" style={{ ...G.panel, borderRadius: 10, color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", padding: "10px 16px", border: `1px solid ${T.border}`, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>⎙ PRINT</button>
            <button ref={closeRef} onClick={onClose} className="ios-press" style={{ ...G.panel, borderRadius: 10, color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", padding: "10px 16px", border: `1px solid ${T.border}`, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>✕ CLOSE</button>
          </div>
        </div>
        <div style={{ borderRadius: 14, border: `1px solid ${u.border}`, background: u.bg, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="report-dot-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: u.dot, boxShadow: `0 0 14px ${u.glow}`, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: u.text, letterSpacing: "0.1em" }}>{u.label}</span>
          <span style={{ fontSize: 12, color: T.textSub, flex: 1, minWidth: 160 }}>{result.recommendation}</span>
        </div>
        <div className="grid2" style={{ marginBottom: 14 }}>
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: 0, alignSelf: "flex-start" }}>OVERALL HEALTH</p>
            <HealthGauge {...result.health} />
          </div>
          <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", animationDelay: "0.08s" }}>
            <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 14px" }}>TREAD DEPTH</p>
            <DepthMeter {...result.tread_depth} />
            <p style={{ fontSize: 11, color: T.textFaint, margin: "10px 0 0", lineHeight: 1.6 }}>{result.tread_depth?.message}</p>
          </div>
        </div>
        <div className="card-anim" style={{ ...G.card, borderRadius: 16, padding: "clamp(16px,3vw,26px)", marginBottom: 14, animationDelay: "0.16s" }}>
          <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.14em", margin: "0 0 18px" }}>SCORE BREAKDOWN</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.health?.breakdown && Object.entries(result.health.breakdown).map(([k, v]) => <ScoreBar key={k} label={k} score={v.score} max={v.max} sublabel={v.label} />)}
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
          <p style={{ fontSize: 10, color: T.textFaint, margin: "10px 0 0" }}>Highlighted regions indicate areas the model focused on for wear classification.</p>
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
            {result.warnings.map((w, i) => <p key={i} style={{ fontSize: 11, color: "rgba(245,158,11,0.6)", margin: 0, lineHeight: 1.65 }}>{w}</p>)}
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
  const G = useG(); const T = useTokens();
  const viewRef = usePressEffect({ scale: 0.97, hapticType: "medium" });
  return (
    <div style={{ marginTop: 28, ...G.card, borderRadius: 20, padding: "clamp(16px,4vw,32px)", animation: "springIn 0.55s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.borderFaint}`, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.18em" }}>DIAGNOSTIC RESULT</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 100, border: `1px solid ${u.border}`, background: u.bg }}><div className="report-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: u.dot, boxShadow: `0 0 10px ${u.glow}` }} /><span style={{ fontSize: 10, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: u.text, letterSpacing: "0.12em" }}>{u.label}</span></div>
      </div>
      <div className="grid2" style={{ marginBottom: 20 }}>
        <div className="card-anim" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 12px", alignSelf: "flex-start" }}>HEALTH SCORE</p><HealthGauge {...result.health} /></div>
        <div className="card-anim" style={{ animationDelay: "0.08s" }}><p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 12px" }}>TREAD DEPTH</p><DepthMeter {...result.tread_depth} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 14 }}>
        <div className="card-anim" style={{ animationDelay: "0.14s" }}><MiniCard label="WEAR LEVEL" value={result.wear_level} highlight={result.urgency === "high"} /></div>
        <div className="card-anim" style={{ animationDelay: "0.18s" }}><MiniCard label="PATTERN" value={result.pattern} /></div>
        <div className="card-anim" style={{ animationDelay: "0.22s" }}><EditableTyreAgeCard tyreAge={tyreAge} onChange={val => setTyreAge(prev => ({ ...prev, age_display: val }))} /></div>
        <div className="card-anim" style={{ animationDelay: "0.26s" }}><MiniCard label="SIDEWALL" value={result.sidewall} highlight={result.sidewall !== "None"} /></div>
      </div>
      <div style={{ ...G.panel, borderRadius: 12, padding: "12px 16px", marginBottom: 14, borderLeft: `2px solid ${T.accent}35` }}>
        <p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 5px" }}>RECOMMENDATION</p>
        <p style={{ fontSize: 12, color: T.textSub, margin: 0, lineHeight: 1.65 }}>{result.recommendation}</p>
      </div>
      <div style={{ marginBottom: 18 }}><p style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.12em", margin: "0 0 8px" }}>GRAD-CAM HEATMAP</p><GradCamDisplay base64={result.gradcam_image} /></div>
      <button ref={viewRef} onClick={onViewReport} style={{ width: "100%", padding: "16px", borderRadius: 12, cursor: "pointer", border: `1px solid ${T.accent}44`, background: `${T.accent}0c`, color: T.accent, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}>VIEW FULL REPORT <span style={{ fontSize: 16 }}>↗</span></button>
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
  const G = useG(); const T = useTokens();

  const handleUpload = useCallback((id, file) => {
    if (!file.type.startsWith("image/")) { return; }
    if (file.size > 10 * 1024 * 1024) { return; }
    setFiles(p => ({ ...p, [id]: file })); setResult(null); setError(null);
  }, []);

  const handleRemove = useCallback((id) => { setFiles(p => { const n = { ...p }; delete n[id]; return n; }); setResult(null); }, []);

  const uploadedCount = Object.keys(files).length;
  const canAnalyse = uploadedCount >= 1;

  const previews = useMemo(() => SLOTS.filter(s => files[s.id]).map(s => {
    try { return { label: s.label, url: URL.createObjectURL(files[s.id]) }; }
    catch(_) { return null; }
  }).filter(Boolean), [files]);

  useEffect(() => { return () => previews.forEach(p => { try { URL.revokeObjectURL(p.url); } catch(_) {} }); }, [previews]);

  const handleAnalyse = async () => {
    setLoading(true); setError(null); setResult(null); haptic("medium");
    const fd = new FormData();
    SLOTS.forEach(s => { if (files[s.id]) fd.append(s.id, files[s.id]); });
    try {
      const API_BASE = (typeof window !== "undefined" && window.__VITE_API_URL__) || "http://localhost:5000";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_BASE}/predict`, { method: "POST", body: fd, signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      haptic("success");
      setResult(data);
    } catch (err) {
      haptic("error");
      if (err.name === "AbortError") setError("Request timed out. Please try again.");
      else setError(err.message || "Failed to reach API. Is Flask running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  const analyseRef = usePressEffect({ scale: canAnalyse && !loading ? 0.97 : 1, hapticType: "medium", disabled: !canAnalyse || loading });

  return (
    <div className="page-enter" style={{ maxWidth: 720, margin: "0 auto", padding: `clamp(72px,10vh,106px) clamp(14px,5vw,28px) ${isMobile ? "100px" : "80px"}` }}>
      {showReport && result && <ReportPage result={result} previews={previews} onClose={() => { setShowReport(false); haptic("light"); }} />}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ height: 1, width: 24, background: `linear-gradient(90deg,${T.accent},transparent)` }} /><p style={{ fontSize: 10, color: T.accent, letterSpacing: "0.2em", margin: 0 }}>TYRE DIAGNOSTIC</p></div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(30px,7vw,58px)", color: T.text, letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1 }}>ANALYSE TYRES</h2>
        <p style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8, margin: 0, maxWidth: 480 }}>Upload photos for AI wear analysis. At least 1 image required — 5 images gives the most accurate result.</p>
      </div>
      <UnifiedUploadCard files={files} onUpload={handleUpload} onRemove={handleRemove} />
      <button ref={analyseRef} onClick={canAnalyse && !loading ? handleAnalyse : undefined} disabled={!canAnalyse || loading} style={{ width: "100%", padding: "16px", borderRadius: 14, cursor: canAnalyse && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "clamp(13px,3vw,14px)", letterSpacing: "0.05em", transition: "all 0.3s", WebkitTapHighlightColor: "transparent", ...(canAnalyse && !loading ? { background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, border: "none", color: "white", boxShadow: `0 0 50px ${T.accent}44,0 6px 24px rgba(0,0,0,0.18)` } : { background: T.ghost, border: `1px solid ${T.border}`, color: T.textFaint }) }}>
        {loading ? "ANALYSING…" : canAnalyse ? "▶  RUN DIAGNOSTIC" : "UPLOAD AT LEAST 1 IMAGE"}
      </button>
      {loading && <DiagnosticLoader />}
      {error && (
        <div style={{ marginTop: 18, ...G.card, borderRadius: 12, borderLeft: "2px solid rgba(239,68,68,0.45)", padding: "14px 18px" }}>
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>
        </div>
      )}
      {result && !loading && <ResultCard result={result} onViewReport={() => { setShowReport(true); haptic("medium"); }} />}
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-mode" : "light-mode";
    let meta = document.querySelector("meta[name='theme-color']");
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = theme === "dark" ? "#060608" : "#f7f4f0";
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), []);
  const go = useCallback((p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const T = theme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {theme === "dark" && !isMobile && <Cursor />}
      <Noise />
      <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, position: "relative", fontFamily: "'JetBrains Mono', monospace" }}>
        <Orbs page={page} />
        <ResponsiveNav page={page} setPage={go} />
        <div style={{ position: "relative", zIndex: 2 }}>
          {page === "landing"  && <LandingPage  setPage={go} />}
          {page === "diagnose" && <DiagnosePage isMobile={isMobile} />}
          {page === "about"    && <AboutPage />}
        </div>
        {!isMobile && (
          <footer style={{ position: "relative", zIndex: 2, borderTop: `1px solid ${T.borderFaint}`, padding: "clamp(20px,4vh,36px) clamp(16px,5vw,40px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg,${T.accentMid},${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 11, color: "white" }}>S</span></div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: T.textMuted, letterSpacing: "0.1em" }}>STRADA</span>
            </div>
            <span style={{ fontSize: 9, color: T.textFaint, letterSpacing: "0.07em", textAlign: "center" }}>AI TYRE INTELLIGENCE · NOT A SUBSTITUTE FOR PROFESSIONAL INSPECTION</span>
            <div style={{ display: "flex", gap: 16 }}>{[["diagnose", "DIAGNOSE"], ["about", "ABOUT"]].map(([p, l]) => (<button key={p} onClick={() => go(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: T.textFaint, letterSpacing: "0.12em" }}>{l}</button>))}</div>
          </footer>
        )}
      </div>
    </ThemeContext.Provider>
  );
}