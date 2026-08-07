import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
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
              style={{ width: 230, height: 230, touchAction: 'none' }}
              title="Drag to spin, or click the center to boost"
            >
              {/* Spinner body (rotate via ref) */}
              <div ref={spinnerElemRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="220" height="220" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    {/* 3D Drop shadow */}
                    <filter id="fidget-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="2" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
                    </filter>

                    {/* Neon green plastic body gradient */}
                    <linearGradient id="neon-plastic-body" x1="30" y1="20" x2="170" y2="180" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#82ff8c" />
                      <stop offset="20%" stopColor="#39ff14" />
                      <stop offset="55%" stopColor="#22c55e" />
                      <stop offset="80%" stopColor="#15803d" />
                      <stop offset="100%" stopColor="#0e6629" />
                    </linearGradient>

                    {/* Molded plastic specular surface sheen */}
                    <linearGradient id="plastic-sheen" x1="0.2" y1="0" x2="0.8" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                      <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
                      <stop offset="65%" stopColor="#000000" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
                    </linearGradient>

                    {/* Steel raceway metallic gradient */}
                    <linearGradient id="bearing-steel-ring" x1="0.1" y1="0.1" x2="0.9" y2="0.9">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#e4e4e7" />
                      <stop offset="50%" stopColor="#a1a1aa" />
                      <stop offset="75%" stopColor="#52525b" />
                      <stop offset="100%" stopColor="#27272a" />
                    </linearGradient>

                    {/* Steel ball bearing sphere gradient */}
                    <radialGradient id="steel-ball-grad" cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#e4e4e7" />
                      <stop offset="70%" stopColor="#71717a" />
                      <stop offset="100%" stopColor="#27272a" />
                    </radialGradient>

                    {/* Center cap collar rim */}
                    <linearGradient id="center-cap-collar" x1="0.2" y1="0" x2="0.8" y2="1">
                      <stop offset="0%" stopColor="#82ff8c" />
                      <stop offset="40%" stopColor="#39ff14" />
                      <stop offset="100%" stopColor="#0e6629" />
                    </linearGradient>

                    {/* Center cap concave finger pad */}
                    <radialGradient id="center-cap-dish" cx="40%" cy="38%" r="65%">
                      <stop offset="0%" stopColor="#55ff66" />
                      <stop offset="45%" stopColor="#22c55e" />
                      <stop offset="80%" stopColor="#15803d" />
                      <stop offset="100%" stopColor="#0a4a1f" />
                    </radialGradient>

                    {/* Center micro pip */}
                    <radialGradient id="neon-pip-grad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#afffb6" />
                      <stop offset="60%" stopColor="#39ff14" />
                      <stop offset="100%" stopColor="#15803d" />
                    </radialGradient>
                  </defs>

                  <g filter="url(#fidget-shadow)">
                    {/* ── 1. MATHEMATICALLY EXACT NEON GREEN PLASTIC BODY ── */}
                    <path
                      d="M 77.72 57.41 A 25.50 25.50 0 1 1 122.28 57.41 A 30.00 30.00 0 0 0 148.02 102.00 A 25.50 25.50 0 1 1 125.75 140.59 A 30.00 30.00 0 0 0 74.25 140.59 A 25.50 25.50 0 1 1 51.98 102.00 A 30.00 30.00 0 0 0 77.72 57.41 Z"
                      fill="url(#neon-plastic-body)"
                      stroke="#0a471e"
                      strokeWidth="2"
                    />

                    {/* Molded surface sheen / specular gloss overlay */}
                    <path
                      d="M 77.72 57.41 A 25.50 25.50 0 1 1 122.28 57.41 A 30.00 30.00 0 0 0 148.02 102.00 A 25.50 25.50 0 1 1 125.75 140.59 A 30.00 30.00 0 0 0 74.25 140.59 A 25.50 25.50 0 1 1 51.98 102.00 A 30.00 30.00 0 0 0 77.72 57.41 Z"
                      fill="url(#plastic-sheen)"
                    />

                    {/* ── 2. RECESSED BEARING WELLS (SOCKETS) ── */}
                    <circle cx="100" cy="45" r="17.8" fill="#0c5c27" fillOpacity="0.75" />
                    <circle cx="147.63" cy="127.5" r="17.8" fill="#0c5c27" fillOpacity="0.75" />
                    <circle cx="52.37" cy="127.5" r="17.8" fill="#0c5c27" fillOpacity="0.75" />

                    {/* ── 3. THREE 608RS BALL BEARINGS ── */}
                    {/* Bearing 1: Top (100, 45) */}
                    <g>
                      <circle cx="100" cy="45" r="16.2" fill="#18191c" stroke="#09090b" strokeWidth="0.8" />
                      <circle cx="100" cy="45" r="14.2" fill="none" stroke="url(#bearing-steel-ring)" strokeWidth="1.2" />
                      <circle cx="100" cy="45" r="11.8" fill="#101114" />
                      {/* 6 Steel Chrome Balls */}
                      <circle cx="111.8" cy="45" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="111.2" cy="44.4" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="105.9" cy="55.2" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="105.3" cy="54.6" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="94.1" cy="55.2" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="93.5" cy="54.6" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="88.2" cy="45" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="87.6" cy="44.4" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="94.1" cy="34.8" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="93.5" cy="34.2" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="105.9" cy="34.8" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="105.3" cy="34.2" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      {/* Inner Race & Center Bore */}
                      <circle cx="100" cy="45" r="8.8" fill="none" stroke="url(#bearing-steel-ring)" strokeWidth="1.2" />
                      <circle cx="100" cy="45" r="6.2" fill="#09090b" />
                      <ellipse cx="96.5" cy="41.5" rx="3.5" ry="1.8" transform="rotate(-45 96.5 41.5)" fill="#ffffff" fillOpacity="0.28" />
                    </g>

                    {/* Bearing 2: Bottom-Right (147.63, 127.5) */}
                    <g>
                      <circle cx="147.63" cy="127.5" r="16.2" fill="#18191c" stroke="#09090b" strokeWidth="0.8" />
                      <circle cx="147.63" cy="127.5" r="14.2" fill="none" stroke="url(#bearing-steel-ring)" strokeWidth="1.2" />
                      <circle cx="147.63" cy="127.5" r="11.8" fill="#101114" />
                      {/* 6 Steel Chrome Balls */}
                      <circle cx="159.43" cy="127.5" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="158.83" cy="126.9" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="153.53" cy="137.7" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="152.93" cy="137.1" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="141.73" cy="137.7" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="141.13" cy="137.1" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="135.83" cy="127.5" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="135.23" cy="126.9" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="141.73" cy="117.3" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="141.13" cy="116.7" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="153.53" cy="117.3" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="152.93" cy="116.7" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      {/* Inner Race & Center Bore */}
                      <circle cx="147.63" cy="127.5" r="8.8" fill="none" stroke="url(#bearing-steel-ring)" strokeWidth="1.2" />
                      <circle cx="147.63" cy="127.5" r="6.2" fill="#09090b" />
                      <ellipse cx="144.13" cy="124.0" rx="3.5" ry="1.8" transform="rotate(-45 144.13 124.0)" fill="#ffffff" fillOpacity="0.28" />
                    </g>

                    {/* Bearing 3: Bottom-Left (52.37, 127.5) */}
                    <g>
                      <circle cx="52.37" cy="127.5" r="16.2" fill="#18191c" stroke="#09090b" strokeWidth="0.8" />
                      <circle cx="52.37" cy="127.5" r="14.2" fill="none" stroke="url(#bearing-steel-ring)" strokeWidth="1.2" />
                      <circle cx="52.37" cy="127.5" r="11.8" fill="#101114" />
                      {/* 6 Steel Chrome Balls */}
                      <circle cx="64.17" cy="127.5" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="63.57" cy="126.9" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="58.27" cy="137.7" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="57.67" cy="137.1" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="46.47" cy="137.7" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="45.87" cy="137.1" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="40.57" cy="127.5" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="39.97" cy="126.9" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="46.47" cy="117.3" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="45.87" cy="116.7" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      <circle cx="58.27" cy="117.3" r="2.0" fill="url(#steel-ball-grad)" stroke="#27272a" strokeWidth="0.4" />
                      <circle cx="57.67" cy="116.7" r="0.6" fill="#ffffff" fillOpacity="0.8" />
                      {/* Inner Race & Center Bore */}
                      <circle cx="52.37" cy="127.5" r="8.8" fill="none" stroke="url(#bearing-steel-ring)" strokeWidth="1.2" />
                      <circle cx="52.37" cy="127.5" r="6.2" fill="#09090b" />
                      <ellipse cx="48.87" cy="124.0" rx="3.5" ry="1.8" transform="rotate(-45 48.87 124.0)" fill="#ffffff" fillOpacity="0.28" />
                    </g>

                    {/* ── 4. RAISED NEON GREEN CENTER HUB (THUMB GRIP CAP) ── */}
                    <g>
                      {/* Outer collar */}
                      <circle cx="100" cy="100" r="19" fill="url(#center-cap-collar)" stroke="#09401b" strokeWidth="1.5" />
                      {/* Concave finger pad dish */}
                      <circle cx="100" cy="100" r="15.5" fill="url(#center-cap-dish)" />
                      {/* Concentric grip groove */}
                      <circle cx="100" cy="100" r="11" fill="none" stroke="#0e6629" strokeWidth="0.8" strokeDasharray="3 1.5" opacity="0.8" />
                      {/* Center micro neon pip */}
                      <circle cx="100" cy="100" r="4.5" fill="url(#neon-pip-grad)" stroke="#0b5424" strokeWidth="0.6" />
                      {/* Gloss specular shine */}
                      <ellipse cx="94.5" cy="94.5" rx="5" ry="2.5" transform="rotate(-40 94.5 94.5)" fill="#ffffff" fillOpacity="0.5" />
                    </g>
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

            {/* Turbo Spin Button Only - Brutalist Purple with White Text */}
            <div className="mt-2">
              <button
                onClick={handleTurboSpin}
                className={[
                  'flex items-center justify-center px-6 py-2.5',
                  'bg-[#9B59F5] text-white font-mono text-xs font-black uppercase tracking-wider',
                  'border-3 border-black rounded-bb-sm shadow-bb',
                  'hover:bg-[#853cf0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                  'transition-all cursor-pointer select-none',
                ].join(' ')}
                title="Turbo spin to maximum speed!"
              >
                TURBO SPIN
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
