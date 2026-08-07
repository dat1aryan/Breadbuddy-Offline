import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
}

type FidgetTab = 'spinner' | 'squishy' | 'popit';

const FIDGET_TABS: {
  id: FidgetTab;
  label: string;
  activeClass: string;
}[] = [
  {
    id: 'spinner',
    label: 'Spinner 🌀',
    activeClass: 'bg-white text-black border-black shadow-[2px_2px_0px_#000]',
  },
  {
    id: 'squishy',
    label: 'Squishy Loaf 🍞',
    activeClass: 'bg-white text-black border-black shadow-[2px_2px_0px_#000]',
  },
  {
    id: 'popit',
    label: 'Pop It 🫧',
    activeClass: 'bg-white text-black border-black shadow-[2px_2px_0px_#000]',
  },
];

const BUBBLE_COLORS = [
  'bg-bb-lime text-black',
  'bg-bb-coral text-white',
  'bg-bb-violet text-white',
  'bg-bb-violet text-white',
  'bg-bb-lime text-black',
  'bg-bb-coral text-white',
  'bg-bb-coral text-white',
  'bg-bb-violet text-white',
  'bg-bb-lime text-black',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function FidgetZone() {
  const [activeTab, setActiveTab] = useState<FidgetTab>('spinner');

  // ── Fidget Spinner — physics engine ────────────────────────────────────────
  // Uses delta-time physics so it's identical speed at 60fps / 144fps / any fps
  const rotationRef      = useRef<number>(0);        // actual angle in degrees (used in rAF)
  const angularVelRef    = useRef<number>(0);         // degrees/sec
  const lastFrameTimeRef = useRef<number | null>(null);
  const rafRef           = useRef<number>(0);
  const spinnerElemRef   = useRef<HTMLDivElement>(null);

  // Drag state (stored in refs to avoid stale closures in rAF)
  const isDraggingRef      = useRef(false);
  const dragStartAngleRef  = useRef(0);   // spinner angle at drag start
  const dragPrevMouseAngle = useRef(0);   // previous pointer angle relative to center
  const dragPrevTime       = useRef(0);
  const dragAngularVelRef  = useRef(0);   // running angular velocity from drag (deg/s)

  const FRICTION        = 0.97;   // per-second friction multiplier (applied via Math.pow)
  const MIN_VEL         = 0.05;   // deg/sec below which we stop

  // rAF loop — only physics + transform, no setState per frame
  const loop = useCallback((now: number) => {
    if (lastFrameTimeRef.current === null) lastFrameTimeRef.current = now;
    const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 1 / 20); // clamp to 20fps min
    lastFrameTimeRef.current = now;

    if (!isDraggingRef.current) {
      // Apply friction: each second speed multiplies by FRICTION
      angularVelRef.current *= Math.pow(FRICTION, dt * 60);
      if (Math.abs(angularVelRef.current) < MIN_VEL) angularVelRef.current = 0;

      rotationRef.current = (rotationRef.current + angularVelRef.current * dt) % 360;
    }

    // Apply rotation directly to DOM for silky smooth 60fps without React setState overhead
    if (spinnerElemRef.current) {
      spinnerElemRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // Helper: get angle of pointer relative to spinner center (degrees)
  const getPointerAngle = (clientX: number, clientY: number): number => {
    const el = spinnerElemRef.current?.parentElement;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  // ── Center click boost (click the center bearing) ──
  const handleCenterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Give a nice 300–500 deg/s boost, alternating direction with a slight preference to forward
    const direction = angularVelRef.current >= 0 ? 1 : -1;
    angularVelRef.current = direction * Math.min(Math.abs(angularVelRef.current) + 420, 1200);
  };

  // ── Turbo Spin (purple brutalist button) ──
  const handleTurboSpin = () => {
    const currentSpeed = Math.abs(angularVelRef.current);
    const direction = angularVelRef.current < 0 ? -1 : 1;
    angularVelRef.current = direction * Math.max(currentSpeed + 1500, 2400);
  };

  // ── Drag to spin ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current   = true;
    dragStartAngleRef.current     = rotationRef.current;
    dragPrevMouseAngle.current    = getPointerAngle(e.clientX, e.clientY);
    dragPrevTime.current          = performance.now();
    dragAngularVelRef.current     = 0;
    angularVelRef.current         = 0; // stop free spin while dragging
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const now           = performance.now();
    const dt            = (now - dragPrevTime.current) / 1000;
    const mouseAngle    = getPointerAngle(e.clientX, e.clientY);
    let   delta         = mouseAngle - dragPrevMouseAngle.current;

    // Wrap delta to [-180, 180]
    if (delta >  180) delta -= 360;
    if (delta < -180) delta += 360;

    rotationRef.current = (rotationRef.current + delta) % 360;

    // Track angular velocity for release-flick
    if (dt > 0) {
      const instantVel       = delta / dt;
      // Smooth with exponential moving average
      dragAngularVelRef.current = dragAngularVelRef.current * 0.6 + instantVel * 0.4;
    }

    dragPrevMouseAngle.current = mouseAngle;
    dragPrevTime.current       = now;
  };

  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    // Transfer drag velocity to free-spin, capped for sanity
    angularVelRef.current = Math.max(-1200, Math.min(1200, dragAngularVelRef.current));
  };

  // ── Squishy Loaf ───────────────────────────────────────────────────────────
  const [isSquished, setIsSquished]         = useState(false);
  const [loafExpression, setLoafExpression] = useState<'calm' | 'squished' | 'happy'>('calm');
  const [floatTexts, setFloatTexts]         = useState<FloatText[]>([]);
  const floatId = useRef<number>(0);

  const handleSquishStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSquished(true);
    setLoafExpression('squished');
  };

  const handleSquishEnd = () => {
    if (!isSquished) return;
    setIsSquished(false);
    setLoafExpression('happy');

    const phrases = ['squish!', 'stress gone', 'satisfying', 'nice.', 'again?'];
    const text    = phrases[Math.floor(Math.random() * phrases.length)];
    const id      = floatId.current++;

    setFloatTexts((prev) => [...prev, { id, text, x: 120 + (Math.random() - 0.5) * 40, y: 80 }]);
    setTimeout(() => setFloatTexts((prev) => prev.filter((ft) => ft.id !== id)), 1500);
    setTimeout(() => setLoafExpression((curr) => (curr === 'happy' ? 'calm' : curr)), 800);
  };

  // ── Pop It ─────────────────────────────────────────────────────────────────
  const [bubbles, setBubbles]     = useState<boolean[]>(Array(9).fill(false));
  const [justReset, setJustReset] = useState(false);

  const handlePop = (index: number) => {
    if (bubbles[index]) return;
    const next = [...bubbles];
    next[index] = true;
    setBubbles(next);
    if (next.every(Boolean)) {
      setTimeout(() => {
        setJustReset(true);
        setBubbles(Array(9).fill(false));
        setTimeout(() => setJustReset(false), 600);
      }, 700);
    }
  };

  const resetPopIt = () => setBubbles(Array(9).fill(false));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Inner tab row */}
      <div className="flex bg-bb-surface border-2 border-bb-border p-1 rounded-bb-sm gap-1">
        {FIDGET_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 py-2 rounded-bb-xs text-xs font-bold uppercase tracking-wider border-2',
                'transition-all cursor-pointer select-none',
                isActive
                  ? tab.activeClass
                  : 'bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Play area */}
      <Card
        accent={activeTab === 'spinner' ? 'lime' : activeTab === 'squishy' ? 'coral' : 'violet'}
        className="min-h-80 flex flex-col items-center justify-center relative p-6 transition-all duration-150"
      >

        {/* ── SPINNER ── */}
        {activeTab === 'spinner' && (
          <div className="flex flex-col items-center justify-center gap-4 select-none">

            {/* Drag zone */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
              style={{ width: 220, height: 220, touchAction: 'none' }}
              title="Drag to spin, or click the center to boost"
            >
              {/* Spinner body (rotate via ref) */}
              <div ref={spinnerElemRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="210" height="210" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    {/* Drop shadow for depth */}
                    <filter id="fs-shadow" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.35" />
                    </filter>
                    {/* Plastic body gradient — Electric Neon Green */}
                    <linearGradient id="plastic-body" x1="0" y1="0" x2="0.3" y2="1">
                      <stop offset="0%" stopColor="#ccff00" />
                      <stop offset="30%" stopColor="#39ff14" />
                      <stop offset="70%" stopColor="#00e64d" />
                      <stop offset="100%" stopColor="#00b33c" />
                    </linearGradient>
                    {/* Highlight for rubbery sheen */}
                    <linearGradient id="plastic-highlight" x1="0.3" y1="0" x2="0.7" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
                    </linearGradient>
                    {/* Ball bearing outer ring gradient */}
                    <radialGradient id="bearing-outer" cx="50%" cy="45%">
                      <stop offset="0%" stopColor="#555" />
                      <stop offset="50%" stopColor="#2a2a2a" />
                      <stop offset="100%" stopColor="#111" />
                    </radialGradient>
                    {/* Ball bearing inner ring gradient — metallic silver */}
                    <radialGradient id="bearing-inner" cx="40%" cy="35%">
                      <stop offset="0%" stopColor="#e0e0e0" />
                      <stop offset="40%" stopColor="#aaa" />
                      <stop offset="100%" stopColor="#666" />
                    </radialGradient>
                    {/* Center cap gradient — raised neon green button */}
                    <radialGradient id="center-cap" cx="45%" cy="40%">
                      <stop offset="0%" stopColor="#e6ff80" />
                      <stop offset="50%" stopColor="#39ff14" />
                      <stop offset="100%" stopColor="#00b33c" />
                    </radialGradient>
                  </defs>

                  <g filter="url(#fs-shadow)">
                    {/* ─── PERFECT SYMMETRICAL NEON GREEN PLASTIC BODY ─── */}
                    <path
                      d="M 78.86 56.37 A 24 24 0 1 1 121.14 56.37 A 32 32 0 0 0 148.35 103.51 A 24 24 0 1 1 127.21 140.12 A 32 32 0 0 0 72.79 140.12 A 24 24 0 1 1 51.65 103.51 A 32 32 0 0 0 78.86 56.37 Z"
                      fill="url(#plastic-body)"
                      stroke="#00802b"
                      strokeWidth="1.2"
                    />

                    {/* Top plastic highlight / bevel overlay */}
                    <path
                      d="M 78.86 56.37 A 24 24 0 1 1 121.14 56.37 A 32 32 0 0 0 148.35 103.51 A 24 24 0 1 1 127.21 140.12 A 32 32 0 0 0 72.79 140.12 A 24 24 0 1 1 51.65 103.51 A 32 32 0 0 0 78.86 56.37 Z"
                      fill="url(#plastic-highlight)"
                    />

                    {/* ─── 3 BALL BEARINGS AT ARM TIPS ─── */}
                    {/* Bearing 1 (Top: 100, 45) */}
                    <circle cx="100" cy="45" r="14.5" fill="#18181b" stroke="#09090b" strokeWidth="1" />
                    <circle cx="100" cy="45" r="12" fill="url(#bearing-inner)" />
                    <circle cx="100" cy="45" r="9.5" fill="#18181b" />
                    <circle cx="100" cy="45" r="7" fill="url(#bearing-inner)" />
                    <circle cx="100" cy="45" r="5" fill="#09090b" />
                    <ellipse cx="97.5" cy="42.5" rx="2" ry="1.2" fill="#ffffff" fillOpacity="0.4" />

                    {/* Bearing 2 (Bottom-right: 147.63, 127.5) */}
                    <circle cx="147.63" cy="127.5" r="14.5" fill="#18181b" stroke="#09090b" strokeWidth="1" />
                    <circle cx="147.63" cy="127.5" r="12" fill="url(#bearing-inner)" />
                    <circle cx="147.63" cy="127.5" r="9.5" fill="#18181b" />
                    <circle cx="147.63" cy="127.5" r="7" fill="url(#bearing-inner)" />
                    <circle cx="147.63" cy="127.5" r="5" fill="#09090b" />
                    <ellipse cx="145.13" cy="125" rx="2" ry="1.2" fill="#ffffff" fillOpacity="0.4" />

                    {/* Bearing 3 (Bottom-left: 52.37, 127.5) */}
                    <circle cx="52.37" cy="127.5" r="14.5" fill="#18181b" stroke="#09090b" strokeWidth="1" />
                    <circle cx="52.37" cy="127.5" r="12" fill="url(#bearing-inner)" />
                    <circle cx="52.37" cy="127.5" r="9.5" fill="#18181b" />
                    <circle cx="52.37" cy="127.5" r="7" fill="url(#bearing-inner)" />
                    <circle cx="52.37" cy="127.5" r="5" fill="#09090b" />
                    <ellipse cx="49.87" cy="125" rx="2" ry="1.2" fill="#ffffff" fillOpacity="0.4" />

                    {/* ─── CENTER HUB / CAP ─── */}
                    <circle cx="100" cy="100" r="18" fill="#18181b" stroke="#09090b" strokeWidth="1" />
                    <circle cx="100" cy="100" r="16" fill="url(#bearing-inner)" />
                    <circle cx="100" cy="100" r="14" fill="url(#center-cap)" stroke="#00802b" strokeWidth="1" />
                    <ellipse cx="97" cy="96" rx="5" ry="3" fill="#ffffff" fillOpacity="0.4" />
                  </g>
                </svg>
              </div>

              {/* Invisible center click target */}
              <div
                onClick={handleCenterClick}
                className="absolute rounded-full z-10 cursor-pointer"
                style={{ width: 50, height: 50, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                title="Click center to spin!"
              />
            </div>

            {/* Turbo Spin Button Only */}
            <div className="mt-2">
              <button
                onClick={handleTurboSpin}
                className={[
                  'flex items-center gap-1.5 px-5 py-2.5',
                  'bg-bb-violet text-white font-mono text-xs font-black uppercase tracking-wider',
                  'border-2 border-black rounded-bb-xs shadow-[3px_3px_0px_#000]',
                  'hover:bg-[#833ab4] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                  'transition-all cursor-pointer select-none',
                ].join(' ')}
                title="Turbo spin to maximum speed!"
              >
                <Zap size={15} className="fill-current text-bb-lime" />
                Turbo Spin ⚡
              </button>
            </div>
          </div>
        )}

        {/* ── SQUISHY LOAF ── */}
        {activeTab === 'squishy' && (
          <div className="flex flex-col items-center justify-center w-full h-full relative">
            <div
              onMouseDown={handleSquishStart}
              onMouseUp={handleSquishEnd}
              onMouseLeave={handleSquishEnd}
              onTouchStart={handleSquishStart}
              onTouchEnd={handleSquishEnd}
              className="cursor-pointer select-none transition-all duration-150 relative z-10"
              style={{
                transform: isSquished
                  ? 'scale(1.25, 0.58) translateY(24px)'
                  : 'scale(1, 1) translateY(0)',
              }}
            >
              <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
                <path d="M10 50C10 25 35 15 60 15C85 15 110 25 110 50C110 75 90 80 60 80C30 80 10 75 10 50Z" fill="url(#loaf-grad)" stroke="#6F4E37" strokeWidth="2.5" />
                <path d="M15 50C15 32 38 23 60 23C82 23 105 32 105 50C105 68 85 73 60 73C35 73 15 68 15 50Z" fill="url(#inner-loaf)" />

                {loafExpression === 'calm' && (
                  <>
                    <path d="M42 48Q46 51 50 48" stroke="#331A00" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M70 48Q74 51 78 48" stroke="#331A00" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M58 55Q60 57 62 55" stroke="#331A00" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </>
                )}
                {loafExpression === 'squished' && (
                  <>
                    <path d="M42 44L48 50L42 56" stroke="#331A00" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M78 44L72 50L78 56" stroke="#331A00" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <circle cx="60" cy="56" r="4.5" fill="#C43B3B" />
                  </>
                )}
                {loafExpression === 'happy' && (
                  <>
                    <circle cx="45" cy="46" r="3" fill="#331A00" />
                    <circle cx="75" cy="46" r="3" fill="#331A00" />
                    <path d="M56 52Q60 55 64 52" stroke="#331A00" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </>
                )}

                <circle cx="36" cy="52" r="5" fill="#FF71CE" fillOpacity="0.4" />
                <circle cx="84" cy="52" r="5" fill="#FF71CE" fillOpacity="0.4" />

                <defs>
                  <linearGradient id="loaf-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D2B48C" />
                    <stop offset="100%" stopColor="#8B5A2B" />
                  </linearGradient>
                  <linearGradient id="inner-loaf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFDD0" />
                    <stop offset="100%" stopColor="#F5DEB3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <p className="text-[10px] text-bb-text-muted mt-5 font-mono uppercase tracking-wide pointer-events-none">
              {isSquished ? 'Squeezing...' : 'Hold to squish'}
            </p>

            {floatTexts.map((ft) => (
              <span
                key={ft.id}
                className="absolute text-[10px] font-bold text-bb-lime font-mono tracking-wider uppercase pointer-events-none animate-bb-slide-up"
                style={{ left: ft.x, top: ft.y }}
              >
                {ft.text}
              </span>
            ))}
          </div>
        )}

        {/* ── POP IT ── */}
        {activeTab === 'popit' && (
          <div className="flex flex-col items-center justify-center gap-5">
            <div
              className={[
                'grid grid-cols-3 gap-2.5 p-3 border-2 border-bb-border rounded-bb-sm bg-bb-surface',
                'transition-all duration-300',
                justReset ? 'scale-95 opacity-40' : '',
              ].join(' ')}
            >
              {bubbles.map((popped, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePop(idx)}
                  className={[
                    'w-11 h-11 rounded-full flex items-center justify-center',
                    'transition-all duration-150 cursor-pointer focus:outline-none border-2',
                    popped
                      ? 'bg-bb-bg border-bb-border scale-90'
                      : `${BUBBLE_COLORS[idx]} border-black active:scale-95 hover:scale-105`,
                  ].join(' ')}
                >
                  <span className={`text-[9px] font-extrabold font-mono ${popped ? 'text-bb-text-muted/30' : ''}`}>
                    {popped ? '·' : 'pop'}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={resetPopIt}
                leftIcon={<RefreshCw size={12} />}
                className="font-mono"
              >
                Reset
              </Button>
              <p className="text-[10px] text-bb-text-muted font-mono">
                {bubbles.filter(Boolean).length}/9 popped
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
