import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  const [asmrParticles, setAsmrParticles]   = useState<{ id: number; emoji: string; x: number; y: number; scale: number }[]>([]);
  const particleId = useRef<number>(0);

  const handleSquishStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSquished(true);
    setLoafExpression('squished');

    // ASMR Sparkles & Butter Drops pop out around the toast when squished!
    const emojis = ['✨', '🧈', '✨', '💛', '⭐'];
    const newParticles = Array.from({ length: 5 }, (_, i) => ({
      id: particleId.current++,
      emoji: emojis[i % emojis.length],
      x: 30 + Math.random() * 190,
      y: 15 + Math.random() * 110,
      scale: 0.9 + Math.random() * 0.4,
    }));
    setAsmrParticles(newParticles);
  };

  const handleSquishEnd = () => {
    if (!isSquished) return;
    setIsSquished(false);
    setLoafExpression('happy');
    setTimeout(() => setLoafExpression((curr) => (curr === 'happy' ? 'calm' : curr)), 800);
    setTimeout(() => setAsmrParticles([]), 700);
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
                    {/* 3D Soft Drop shadow */}
                    <filter id="fidget-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="2" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.45" />
                    </filter>

                    {/* Authentic Toy Green Plastic Body Gradient (matching reference photo) */}
                    <linearGradient id="toy-green-body" x1="25" y1="15" x2="175" y2="185" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#4de078" />
                      <stop offset="25%" stopColor="#25cb68" />
                      <stop offset="65%" stopColor="#1bb454" />
                      <stop offset="85%" stopColor="#149544" />
                      <stop offset="100%" stopColor="#0d7232" />
                    </linearGradient>

                    {/* Plastic Surface Sheen & Edge Chamfer Highlight */}
                    <linearGradient id="plastic-sheen" x1="0.2" y1="0" x2="0.8" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                      <stop offset="28%" stopColor="#ffffff" stopOpacity="0.12" />
                      <stop offset="70%" stopColor="#000000" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
                    </linearGradient>

                    {/* Realistic Metallic Chrome/Steel Ring Gradient */}
                    <linearGradient id="metallic-steel" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f4f4f5" />
                      <stop offset="20%" stopColor="#a1a1aa" />
                      <stop offset="40%" stopColor="#ffffff" />
                      <stop offset="60%" stopColor="#71717a" />
                      <stop offset="80%" stopColor="#e4e4e7" />
                      <stop offset="100%" stopColor="#3f3f46" />
                    </linearGradient>

                    {/* Matte Rubber Seal Radial Gradient */}
                    <radialGradient id="rubber-seal-grad" cx="42%" cy="40%" r="65%">
                      <stop offset="0%" stopColor="#2a2b30" />
                      <stop offset="60%" stopColor="#1b1c20" />
                      <stop offset="100%" stopColor="#111215" />
                    </radialGradient>

                    {/* Smooth Green Plastic Center Cap Gradient */}
                    <radialGradient id="smooth-green-cap" cx="38%" cy="34%" r="65%">
                      <stop offset="0%" stopColor="#55ff85" />
                      <stop offset="45%" stopColor="#22c55e" />
                      <stop offset="80%" stopColor="#159844" />
                      <stop offset="100%" stopColor="#0d7030" />
                    </radialGradient>
                  </defs>

                  <g filter="url(#fidget-shadow)">
                    {/* ── 1. MATHEMATICALLY EXACT TOY GREEN PLASTIC BODY ── */}
                    <path
                      d="M 77.72 57.41 A 25.50 25.50 0 1 1 122.28 57.41 A 30.00 30.00 0 0 0 148.02 102.00 A 25.50 25.50 0 1 1 125.75 140.59 A 30.00 30.00 0 0 0 74.25 140.59 A 25.50 25.50 0 1 1 51.98 102.00 A 30.00 30.00 0 0 0 77.72 57.41 Z"
                      fill="url(#toy-green-body)"
                      stroke="#0b5e28"
                      strokeWidth="1.8"
                    />

                    {/* Molded plastic surface sheen & edge chamfer */}
                    <path
                      d="M 77.72 57.41 A 25.50 25.50 0 1 1 122.28 57.41 A 30.00 30.00 0 0 0 148.02 102.00 A 25.50 25.50 0 1 1 125.75 140.59 A 30.00 30.00 0 0 0 74.25 140.59 A 25.50 25.50 0 1 1 51.98 102.00 A 30.00 30.00 0 0 0 77.72 57.41 Z"
                      fill="url(#plastic-sheen)"
                    />

                    {/* ── 2. THREE 608RS METALLIC & RUBBER BEARINGS ── */}
                    {/* Bearing 1: Top (100, 45) */}
                    <g>
                      {/* Outer metallic steel race */}
                      <circle cx="100" cy="45" r="16.8" fill="url(#metallic-steel)" stroke="#27272a" strokeWidth="0.6" />
                      <circle cx="100" cy="45" r="15.4" fill="#09090b" />
                      {/* Solid matte black rubber seal plate */}
                      <circle cx="100" cy="45" r="15.0" fill="url(#rubber-seal-grad)" />
                      {/* Concentric rubber seal groove */}
                      <circle cx="100" cy="45" r="13.2" fill="none" stroke="#101114" strokeWidth="0.8" />
                      <circle cx="100" cy="45" r="11.2" fill="#141518" />
                      {/* Inner metallic steel race */}
                      <circle cx="100" cy="45" r="10.8" fill="url(#metallic-steel)" stroke="#18181b" strokeWidth="0.5" />
                      <circle cx="100" cy="45" r="9.2" fill="#0f1012" />
                      {/* Center hollow hole through bearing */}
                      <circle cx="100" cy="45" r="7.5" fill="#070708" />
                      {/* Specular metallic reflection gleams */}
                      <ellipse cx="95.5" cy="40.5" rx="3.5" ry="1.2" transform="rotate(-45 95.5 40.5)" fill="#ffffff" fillOpacity="0.5" />
                    </g>

                    {/* Bearing 2: Bottom-Right (147.63, 127.5) */}
                    <g>
                      {/* Outer metallic steel race */}
                      <circle cx="147.63" cy="127.5" r="16.8" fill="url(#metallic-steel)" stroke="#27272a" strokeWidth="0.6" />
                      <circle cx="147.63" cy="127.5" r="15.4" fill="#09090b" />
                      {/* Solid matte black rubber seal plate */}
                      <circle cx="147.63" cy="127.5" r="15.0" fill="url(#rubber-seal-grad)" />
                      {/* Concentric rubber seal groove */}
                      <circle cx="147.63" cy="127.5" r="13.2" fill="none" stroke="#101114" strokeWidth="0.8" />
                      <circle cx="147.63" cy="127.5" r="11.2" fill="#141518" />
                      {/* Inner metallic steel race */}
                      <circle cx="147.63" cy="127.5" r="10.8" fill="url(#metallic-steel)" stroke="#18181b" strokeWidth="0.5" />
                      <circle cx="147.63" cy="127.5" r="9.2" fill="#0f1012" />
                      {/* Center hollow hole through bearing */}
                      <circle cx="147.63" cy="127.5" r="7.5" fill="#070708" />
                      {/* Specular metallic reflection gleams */}
                      <ellipse cx="143.13" cy="123" rx="3.5" ry="1.2" transform="rotate(-45 143.13 123)" fill="#ffffff" fillOpacity="0.5" />
                    </g>

                    {/* Bearing 3: Bottom-Left (52.37, 127.5) */}
                    <g>
                      {/* Outer metallic steel race */}
                      <circle cx="52.37" cy="127.5" r="16.8" fill="url(#metallic-steel)" stroke="#27272a" strokeWidth="0.6" />
                      <circle cx="52.37" cy="127.5" r="15.4" fill="#09090b" />
                      {/* Solid matte black rubber seal plate */}
                      <circle cx="52.37" cy="127.5" r="15.0" fill="url(#rubber-seal-grad)" />
                      {/* Concentric rubber seal groove */}
                      <circle cx="52.37" cy="127.5" r="13.2" fill="none" stroke="#101114" strokeWidth="0.8" />
                      <circle cx="52.37" cy="127.5" r="11.2" fill="#141518" />
                      {/* Inner metallic steel race */}
                      <circle cx="52.37" cy="127.5" r="10.8" fill="url(#metallic-steel)" stroke="#18181b" strokeWidth="0.5" />
                      <circle cx="52.37" cy="127.5" r="9.2" fill="#0f1012" />
                      {/* Center hollow hole through bearing */}
                      <circle cx="52.37" cy="127.5" r="7.5" fill="#070708" />
                      {/* Specular metallic reflection gleams */}
                      <ellipse cx="47.87" cy="123" rx="3.5" ry="1.2" transform="rotate(-45 47.87 123)" fill="#ffffff" fillOpacity="0.5" />
                    </g>

                    {/* ── 3. SMOOTH PLASTIC CENTER CAP (matching reference image) ── */}
                    <g>
                      <circle cx="100" cy="100" r="21.5" fill="url(#smooth-green-cap)" stroke="#11883a" strokeWidth="1.4" />
                      <ellipse cx="93.5" cy="93.5" rx="7" ry="3.5" transform="rotate(-35 93.5 93.5)" fill="#ffffff" fillOpacity="0.38" />
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
              className="cursor-pointer select-none relative z-10"
              style={{
                transform: isSquished
                  ? 'scale(1.32, 0.46) translateY(38px)'
                  : 'scale(1, 1) translateY(0)',
                transition: isSquished
                  ? 'transform 0.08s cubic-bezier(0.1, 0.9, 0.2, 1)'
                  : 'transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1)', // Slow-rising memory foam effect!
              }}
            >
              {/* 3D Big Toast Slice / Bread Loaf Squishy Toy with ASMR Butter */}
              <svg width="260" height="210" viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Soft Memory Foam Drop Shadow */}
                  <filter id="toast-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.42" />
                  </filter>

                  {/* Rich Golden Baked Crust Gradient */}
                  <linearGradient id="crust-toast-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="25%" stopColor="#d97706" />
                    <stop offset="65%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>

                  {/* Warm Cream Soft Bread Crumb Interior Gradient */}
                  <linearGradient id="crumb-toast-interior" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fffdf5" />
                    <stop offset="35%" stopColor="#fef3c7" />
                    <stop offset="75%" stopColor="#fde68a" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                  </linearGradient>

                  {/* Golden Toast Center Sheen Radial Gradient */}
                  <radialGradient id="toast-center-blush" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                    <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
                  </radialGradient>

                  {/* Golden Melting Butter Gradient */}
                  <linearGradient id="butter-pat-grad" x1="0.2" y1="0" x2="0.8" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>

                  {/* Melting Butter Drip Gradient */}
                  <linearGradient id="butter-drip-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#facc15" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.75" />
                  </linearGradient>
                </defs>

                <g filter="url(#toast-shadow)">
                  {/* ── 1. OUTER GOLDEN CRUST (Thick Toast Slice / Bread Loaf Contour) ── */}
                  <path
                    d="M 45 60 C 45 35, 75 25, 130 25 C 185 25, 215 35, 215 60 C 218 80, 218 160, 205 178 C 190 190, 70 190, 55 178 C 42 160, 42 80, 45 60 Z"
                    fill="url(#crust-toast-gradient)"
                    stroke="#451a03"
                    strokeWidth="3"
                  />

                  {/* ── 2. INNER SOFT CREAM CRUMB INTERIOR ── */}
                  <path
                    d="M 54 65 C 54 44, 80 34, 130 34 C 180 34, 206 44, 206 65 C 208 82, 208 153, 196 169 C 183 179, 77 179, 64 169 C 52 153, 52 82, 54 65 Z"
                    fill="url(#crumb-toast-interior)"
                    stroke="#78350f"
                    strokeWidth="1.8"
                  />

                  {/* Toast Center Warm Sheen */}
                  <ellipse cx="130" cy="110" rx="55" ry="32" fill="url(#toast-center-blush)" />

                  {/* Crust Top Shine Highlight Arc */}
                  <path
                    d="M 60 48 C 85 36, 175 36, 200 48"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeOpacity="0.35"
                    fill="none"
                  />

                  {/* ── 3. MELTING BUTTER PAT & DRIPS (ASMR Feature) ── */}
                  {/* Golden Butter Pat on top */}
                  <g transform="translate(130, 48)">
                    <rect
                      x="-18"
                      y="-12"
                      width="36"
                      height="24"
                      rx="5"
                      fill="url(#butter-pat-grad)"
                      stroke="#ca8a04"
                      strokeWidth="1.5"
                      transform={isSquished ? 'scale(1.3, 0.45) translateY(12px)' : 'scale(1, 1)'}
                      style={{ transition: 'transform 0.15s ease-out' }}
                    />
                    {/* Butter Pat Top Specular Gloss */}
                    <rect
                      x="-14"
                      y="-9"
                      width="16"
                      height="7"
                      rx="3"
                      fill="#ffffff"
                      fillOpacity="0.5"
                      transform={isSquished ? 'scale(1.3, 0.45) translateY(12px)' : 'scale(1, 1)'}
                      style={{ transition: 'transform 0.15s ease-out' }}
                    />
                  </g>

                  {/* When Squished: Golden Butter Drips Melt & Stream Down! */}
                  {isSquished && (
                    <g className="animate-pulse">
                      {/* Drip 1 */}
                      <path d="M 115 60 Q 112 85 116 105 Q 118 112 114 114 Q 110 112 112 105 Q 108 85 111 60 Z" fill="url(#butter-drip-grad)" />
                      {/* Drip 2 */}
                      <path d="M 132 60 Q 134 90 130 120 Q 132 128 136 128 Q 140 128 138 120 Q 138 90 135 60 Z" fill="url(#butter-drip-grad)" />
                      {/* Drip 3 */}
                      <path d="M 148 60 Q 152 80 149 95 Q 147 100 150 100 Q 153 100 152 95 Q 155 80 151 60 Z" fill="url(#butter-drip-grad)" />
                    </g>
                  )}

                  {/* ── 4. KAWAII FACE EXPRESSION ── */}
                  {loafExpression === 'calm' && (
                    <g>
                      {/* Calm happy arc eyes ^ ^ */}
                      <path d="M 98 106 Q 106 98 114 106" stroke="#451a03" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                      <path d="M 146 106 Q 154 98 162 106" stroke="#451a03" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                      {/* Cute small smile mouth */}
                      <path d="M 126 116 Q 130 122 134 116" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </g>
                  )}

                  {loafExpression === 'squished' && (
                    <g>
                      {/* Squeezed shut eyes > < */}
                      <path d="M 98 100 L 108 108 L 98 116" stroke="#451a03" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <path d="M 162 100 L 152 108 L 162 116" stroke="#451a03" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      {/* Open squish mouth */}
                      <ellipse cx="130" cy="118" rx="6" ry="7" fill="#dc2626" />
                      <path d="M 126 116 Q 130 120 134 116" fill="#fca5a5" />
                    </g>
                  )}

                  {loafExpression === 'happy' && (
                    <g>
                      {/* Joyful shiny eyes */}
                      <circle cx="106" cy="106" r="5" fill="#451a03" />
                      <circle cx="104" cy="104" r="1.8" fill="#ffffff" />
                      <circle cx="154" cy="106" r="5" fill="#451a03" />
                      <circle cx="152" cy="104" r="1.8" fill="#ffffff" />
                      {/* Big happy smile */}
                      <path d="M 122 114 Q 130 124 138 114" stroke="#451a03" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                    </g>
                  )}

                  {/* Rosy blush cheeks */}
                  <ellipse cx="90" cy="114" rx="8" ry="5" fill="#f87171" fillOpacity="0.5" />
                  <ellipse cx="170" cy="114" rx="8" ry="5" fill="#f87171" fillOpacity="0.5" />
                </g>
              </svg>
            </div>

            {/* ASMR Floating Sparkles & Butter Drops when squished! */}
            {asmrParticles.map((pt) => (
              <span
                key={pt.id}
                className="absolute text-base pointer-events-none animate-bb-slide-up select-none"
                style={{
                  left: pt.x,
                  top: pt.y,
                  transform: `scale(${pt.scale})`,
                }}
              >
                {pt.emoji}
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
