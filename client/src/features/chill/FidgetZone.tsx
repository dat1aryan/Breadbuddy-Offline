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

  const handleSquishStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSquished(true);
    setLoafExpression('squished');
  };

  const handleSquishEnd = () => {
    if (!isSquished) return;
    setIsSquished(false);
    setLoafExpression('happy');
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
              {/* Cartoon-Hyper-Realistic 3D Bread Loaf Squishy Toy */}
              <svg width="210" height="155" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Soft Memory Foam Drop Shadow */}
                  <filter id="foam-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
                  </filter>

                  {/* Golden Baked 3D Crust Gradient */}
                  <linearGradient id="crust-golden-3d" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbd54" />
                    <stop offset="25%" stopColor="#e38622" />
                    <stop offset="65%" stopColor="#b95914" />
                    <stop offset="100%" stopColor="#7c3209" />
                  </linearGradient>

                  {/* Soft Cream Bread Crumb Body Gradient */}
                  <linearGradient id="crumb-soft-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fffef5" />
                    <stop offset="40%" stopColor="#f9e8be" />
                    <stop offset="80%" stopColor="#e6c57f" />
                    <stop offset="100%" stopColor="#cca052" />
                  </linearGradient>

                  {/* Soft Toast Blush Patch Gradient */}
                  <radialGradient id="toast-blush-patch" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#df852c" stopOpacity="0.75" />
                    <stop offset="55%" stopColor="#f2b260" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f9e8be" stopOpacity="0" />
                  </radialGradient>

                  {/* Crust Underside Ambient Shadow */}
                  <linearGradient id="crust-shadow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a1e04" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#4a1e04" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <g filter="url(#foam-shadow)">
                  {/* ── 1. BREAD CRUMB BODY (Cream Side) ── */}
                  <path
                    d="M 25 70 C 25 45, 52 38, 70 52 C 82 38, 118 38, 130 52 C 148 38, 175 45, 175 70 C 175 115, 170 135, 155 138 C 130 141, 70 141, 45 138 C 30 135, 25 115, 25 70 Z"
                    fill="url(#crumb-soft-body)"
                    stroke="#4a2206"
                    strokeWidth="2.5"
                  />

                  {/* Toast Blush Spot in Middle */}
                  <ellipse cx="100" cy="102" rx="44" ry="25" fill="url(#toast-blush-patch)" />

                  {/* Ambient Shadow under Crust overhang */}
                  <path
                    d="M 25 72 C 38 82, 162 82, 175 72 L 175 85 C 162 93, 38 93, 25 85 Z"
                    fill="url(#crust-shadow)"
                  />

                  {/* ── 2. GOLDEN BAKED 3-HUMP TOP CRUST ── */}
                  <path
                    d="M 25 72 C 25 45, 52 38, 70 52 C 82 38, 118 38, 130 52 C 148 38, 175 45, 175 72 C 175 82, 162 84, 148 83 C 132 82, 118 82, 100 84 C 82 82, 68 82, 52 83 C 38 84, 25 82, 25 72 Z"
                    fill="url(#crust-golden-3d)"
                    stroke="#4a2206"
                    strokeWidth="2.5"
                  />

                  {/* Hump Crevices / Score Lines */}
                  <path d="M 70 52 C 68 64, 70 76, 72 83" stroke="#4a2206" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                  <path d="M 130 52 C 132 64, 130 76, 128 83" stroke="#4a2206" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />

                  {/* 3D Specular Gloss Caps on Humps (Matching reference screenshot) */}
                  <ellipse cx="48" cy="46" rx="14" ry="6" fill="#ffffff" fillOpacity="0.42" />
                  <ellipse cx="100" cy="43" rx="18" ry="7" fill="#ffffff" fillOpacity="0.48" />
                  <ellipse cx="152" cy="46" rx="14" ry="6" fill="#ffffff" fillOpacity="0.42" />

                  {/* ── 3. KAWAII CHARACTER EXPRESSIONS ── */}
                  {loafExpression === 'calm' && (
                    <g>
                      {/* Calm happy eyes ^ ^ */}
                      <path d="M 74 96 Q 80 90 86 96" stroke="#3d1c05" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                      <path d="M 114 96 Q 120 90 126 96" stroke="#3d1c05" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                      {/* Cute small mouth */}
                      <path d="M 97 103 Q 100 107 103 103" stroke="#3d1c05" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                    </g>
                  )}

                  {loafExpression === 'squished' && (
                    <g>
                      {/* Squeezed shut eyes > < */}
                      <path d="M 74 92 L 82 98 L 74 104" stroke="#3d1c05" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <path d="M 126 92 L 118 98 L 126 104" stroke="#3d1c05" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      {/* Open squish mouth */}
                      <ellipse cx="100" cy="106" rx="5" ry="6" fill="#c0392b" />
                      <path d="M 97 104 Q 100 107 103 104" fill="#ff7675" />
                    </g>
                  )}

                  {loafExpression === 'happy' && (
                    <g>
                      {/* Joyful shiny eyes */}
                      <circle cx="80" cy="96" r="4.2" fill="#3d1c05" />
                      <circle cx="78.5" cy="94.5" r="1.5" fill="#ffffff" />
                      <circle cx="120" cy="96" r="4.2" fill="#3d1c05" />
                      <circle cx="118.5" cy="94.5" r="1.5" fill="#ffffff" />
                      {/* Big happy smile */}
                      <path d="M 94 102 Q 100 110 106 102" stroke="#3d1c05" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                    </g>
                  )}

                  {/* Rosy blush cheeks */}
                  <ellipse cx="68" cy="102" rx="7" ry="4.5" fill="#ff7675" fillOpacity="0.5" />
                  <ellipse cx="132" cy="102" rx="7" ry="4.5" fill="#ff7675" fillOpacity="0.5" />
                </g>
              </svg>
            </div>
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
