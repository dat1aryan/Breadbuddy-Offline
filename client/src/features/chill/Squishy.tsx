import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// ─── CONFIGURATION & TYPES ───────────────────────────────────────────────────
export type LoafExpression = 'calm' | 'squished' | 'happy' | 'sleepy' | 'surprised';

const SQUISHY_CONFIG = {
  springs: {
    loaf: { stiffness: 280, damping: 18, mass: 0.75 },
    butter: { stiffness: 160, damping: 12, mass: 0.45 },
  },
  interaction: {
    maxDragDistance: 90,
    maxSquashX: 1.38,
    minSquashY: 0.62,
    minStretchX: 0.72,
    maxStretchY: 1.32,
    maxTiltDegrees: 18,
  },
  timings: {
    blinkMinInterval: 2800,
    blinkMaxInterval: 5500,
    blinkDuration: 160,
    expressionResetDelay: 900,
    sleepIdleThreshold: 7000,
  },
  particles: {
    poolSize: 12,
    burstCount: 5,
    lifespanMs: 700,
    emojis: ['✨', '🍞', '⭐', '💛', '🧈'],
  },
  colors: {
    crustDark: '#451a03',
    crustStroke: '#78350f',
    crumbStroke: '#d97706',
    faceColor: '#451a03',
    blushColor: '#f87171',
    butterColor: '#facc15',
    butterBorder: '#ca8a04',
  },
} as const;

// ─── UTILITY HELPERS & PARTICLE POOL ──────────────────────────────────────────
export interface PooledParticle {
  id: number;
  emoji: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  rotate: number;
  scale: number;
  active: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function calculateSquashTransform(
  dragX: number,
  dragY: number,
  isPressed: boolean,
  bounds = { maxX: 180, maxY: 110 }
) {
  if (!isPressed) {
    return { scaleX: 1, scaleY: 1, rotate: 0, x: 0, y: 0 };
  }

  const { interaction } = SQUISHY_CONFIG;
  const dragDist = Math.hypot(dragX, dragY);

  if (dragDist < 4) {
    return { scaleX: 1.18, scaleY: 0.82, rotate: 0, x: 0, y: 8 };
  }

  // Smooth normalized deformation curve regardless of drag distance
  const normFactor = Math.min(1, dragDist / 120);
  const normX = (dragX / dragDist) * normFactor;
  const normY = (dragY / dragDist) * normFactor;

  let scaleX = 1 + Math.abs(normX) * 0.28 - normY * 0.22;
  let scaleY = 1 - Math.abs(normX) * 0.22 + normY * 0.28;

  scaleX = clamp(scaleX, interaction.minStretchX, interaction.maxSquashX);
  scaleY = clamp(scaleY, interaction.minSquashY, interaction.maxStretchY);

  const rotate = clamp(normX * interaction.maxTiltDegrees, -interaction.maxTiltDegrees, interaction.maxTiltDegrees);

  // Clamp translation strictly within the background container bounds
  const clampedX = clamp(dragX, -bounds.maxX, bounds.maxX);
  const clampedY = clamp(dragY, -bounds.maxY, bounds.maxY);

  return {
    scaleX,
    scaleY,
    rotate,
    x: clampedX,
    y: clampedY,
  };
}

class ParticlePool {
  private pool: PooledParticle[];
  private nextId = 0;

  constructor(size: number = 16) {
    this.pool = Array.from({ length: size }, (_, i) => ({
      id: i,
      emoji: SQUISHY_CONFIG.particles.emojis[0],
      startX: 130,
      startY: 105,
      targetX: 0,
      targetY: 0,
      rotate: 0,
      scale: 1,
      active: false,
    }));
  }

  public spawnBurst(centerX: number = 130, centerY: number = 105, count: number = 10): PooledParticle[] {
    const emojis = SQUISHY_CONFIG.particles.emojis;
    let spawned = 0;

    for (let i = 0; i < this.pool.length && spawned < count; i++) {
      const p = this.pool[(this.nextId + i) % this.pool.length];
      const angle = (Math.PI * 2 * spawned) / count + (Math.random() * 0.4 - 0.2);

      // Position start point directly along the outer crust perimeter (85px horizontal, 75px vertical)
      const edgeX = centerX + Math.cos(angle) * 85;
      const edgeY = centerY + Math.sin(angle) * 75;

      // Shoot outward from the crust edge into open space
      const ejectionDist = 45 + Math.random() * 55;

      p.active = true;
      p.emoji = emojis[(this.nextId + spawned) % emojis.length];
      p.startX = edgeX;
      p.startY = edgeY;
      p.targetX = Math.cos(angle) * ejectionDist;
      p.targetY = Math.sin(angle) * ejectionDist;
      p.rotate = Math.random() * 360 - 180;
      p.scale = 0.9 + Math.random() * 0.5;
      spawned++;
    }

    this.nextId = (this.nextId + spawned) % this.pool.length;
    return this.getActive();
  }

  public getActive(): PooledParticle[] {
    return this.pool.filter((p) => p.active);
  }

  public clear(): void {
    for (const p of this.pool) {
      p.active = false;
    }
  }
}

// ─── MEMOIZED SUBCOMPONENTS ───────────────────────────────────────────────────
interface LoafFaceProps {
  expression: LoafExpression;
  isBlinking: boolean;
  eyeOffset: { x: number; y: number };
}

const LoafFace = memo(function LoafFace({ expression, isBlinking, eyeOffset }: LoafFaceProps) {
  const { colors } = SQUISHY_CONFIG;

  return (
    <g className="select-none pointer-events-none">
      {/* Rosy Blush Cheeks */}
      <ellipse cx="88" cy="112" rx="7.5" ry="4.5" fill={colors.blushColor} fillOpacity="0.45" />
      <ellipse cx="172" cy="112" rx="7.5" ry="4.5" fill={colors.blushColor} fillOpacity="0.45" />

      {/* Eyes & Mouth by Expression */}
      {expression === 'calm' && (
        <g>
          {isBlinking ? (
            <>
              {/* Blinking flat lines */}
              <line x1="98" y1="104" x2="114" y2="104" stroke={colors.faceColor} strokeWidth="3" strokeLinecap="round" />
              <line x1="146" y1="104" x2="162" y2="104" stroke={colors.faceColor} strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <g transform={`translate(${eyeOffset.x.toFixed(2)}, ${eyeOffset.y.toFixed(2)})`}>
              {/* Left Eye */}
              <circle cx="106" cy="103" r="5" fill={colors.faceColor} />
              <circle cx="104" cy="101" r="1.8" fill="#ffffff" />
              {/* Right Eye */}
              <circle cx="154" cy="103" r="5" fill={colors.faceColor} />
              <circle cx="152" cy="101" r="1.8" fill="#ffffff" />
            </g>
          )}
          {/* Gentle smile */}
          <path d="M 126 114 Q 130 119 134 114" stroke={colors.faceColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      )}

      {expression === 'squished' && (
        <g>
          {/* Squished shut eyes > < */}
          <path d="M 98 99 L 108 106 L 98 113" stroke={colors.faceColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 162 99 L 152 106 L 162 113" stroke={colors.faceColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Squeeze open mouth */}
          <ellipse cx="130" cy="115" rx="5" ry="6" fill="#dc2626" />
        </g>
      )}

      {expression === 'happy' && (
        <g>
          <g transform={`translate(${eyeOffset.x.toFixed(2)}, ${eyeOffset.y.toFixed(2)})`}>
            {/* Big shiny sparkly eyes */}
            <circle cx="106" cy="103" r="5.5" fill={colors.faceColor} />
            <circle cx="104" cy="101" r="2" fill="#ffffff" />
            <circle cx="154" cy="103" r="5.5" fill={colors.faceColor} />
            <circle cx="152" cy="101" r="2" fill="#ffffff" />
          </g>
          {/* Big beaming smile */}
          <path d="M 122 112 Q 130 122 138 112" stroke={colors.faceColor} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )}

      {expression === 'sleepy' && (
        <g>
          {/* Sleeping relaxed arcs */}
          <path d="M 98 103 Q 106 108 114 103" stroke={colors.faceColor} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 146 103 Q 154 108 162 103" stroke={colors.faceColor} strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Small gentle mouth */}
          <circle cx="130" cy="113" r="2.5" fill={colors.faceColor} />
          <text x="175" y="85" fontSize="12" fill={colors.faceColor} opacity="0.6" fontWeight="bold">Zzz</text>
        </g>
      )}

      {expression === 'surprised' && (
        <g>
          <g transform={`translate(${eyeOffset.x.toFixed(2)}, ${eyeOffset.y.toFixed(2)})`}>
            {/* Wide curious eyes */}
            <circle cx="106" cy="102" r="5.5" fill={colors.faceColor} />
            <circle cx="104" cy="100" r="1.8" fill="#ffffff" />
            <circle cx="154" cy="102" r="5.5" fill={colors.faceColor} />
            <circle cx="152" cy="100" r="1.8" fill="#ffffff" />
          </g>
          {/* Round O-mouth */}
          <circle cx="130" cy="115" r="4.5" fill="#dc2626" />
        </g>
      )}
    </g>
  );
});

interface LoafButterProps {
  springX: any;
  springY: any;
  springRotate: any;
}

const LoafButter = memo(function LoafButter({ springX, springY, springRotate }: LoafButterProps) {
  return (
    <motion.g
      style={{
        x: springX,
        y: springY,
        rotate: springRotate,
        originX: '130px',
        originY: '50px',
      }}
    >
      <ellipse cx="130" cy="54" rx="22" ry="7" fill="#facc15" fillOpacity="0.45" />
      <rect
        x="115"
        y="40"
        width="30"
        height="18"
        rx="4"
        fill="url(#butter-pat-gradient)"
        stroke="#ca8a04"
        strokeWidth="1.8"
      />
      <line x1="119" y1="44" x2="141" y2="44" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
    </motion.g>
  );
});

// ─── MAIN SQUISHY COMPONENT ──────────────────────────────────────────────────
export function Squishy() {
  const [expression, setExpression] = useState<LoafExpression>('sleepy');
  const [hasAwoken, setHasAwoken] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [particles, setParticles] = useState<PooledParticle[]>([]);
  const [eyeOffset, setEyeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const particlePoolRef = useRef<ParticlePool>(new ParticlePool());

  const isPointerDownRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const totalDragDistRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetExprTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawScaleX = useMotionValue(1);
  const rawScaleY = useMotionValue(1);
  const rawRotate = useMotionValue(0);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const rawButterX = useMotionValue(0);
  const rawButterY = useMotionValue(0);
  const rawButterRotate = useMotionValue(0);

  const springScaleX = useSpring(rawScaleX, SQUISHY_CONFIG.springs.loaf);
  const springScaleY = useSpring(rawScaleY, SQUISHY_CONFIG.springs.loaf);
  const springRotate = useSpring(rawRotate, SQUISHY_CONFIG.springs.loaf);
  const springX = useSpring(rawX, SQUISHY_CONFIG.springs.loaf);
  const springY = useSpring(rawY, SQUISHY_CONFIG.springs.loaf);

  const springButterX = useSpring(rawButterX, SQUISHY_CONFIG.springs.butter);
  const springButterY = useSpring(rawButterY, SQUISHY_CONFIG.springs.butter);
  const springButterRotate = useSpring(rawButterRotate, SQUISHY_CONFIG.springs.butter);

  const getContainerBounds = useCallback(() => {
    if (!containerRef.current) return { maxX: 120, maxY: 80 };
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = Math.max(10, (rect.width - 260 * 1.38) / 2 - 20);
    const maxY = Math.max(10, (rect.height - 210 * 1.32) / 2 - 20);
    return { maxX, maxY };
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!isPointerDownRef.current) {
        setExpression('sleepy');
      }
    }, SQUISHY_CONFIG.timings.sleepIdleThreshold);
  }, []);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!hasAwoken || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const loafCenterX = rect.left + rect.width / 2;
      const loafCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - loafCenterX;
      const dy = e.clientY - loafCenterY;
      const dist = Math.hypot(dx, dy) || 1;

      const maxLook = 4.2;
      const lookDist = Math.min(maxLook, dist / 35);

      setEyeOffset({
        x: (dx / dist) * lookDist,
        y: (dy / dist) * lookDist,
      });
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove);
  }, [hasAwoken]);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    const scheduleNextBlink = () => {
      const { blinkMinInterval, blinkMaxInterval, blinkDuration } = SQUISHY_CONFIG.timings;
      const delay = blinkMinInterval + Math.random() * (blinkMaxInterval - blinkMinInterval);
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, blinkDuration);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      clearTimeout(blinkTimeout);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (resetExprTimerRef.current) clearTimeout(resetExprTimerRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isPointerDownRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    totalDragDistRef.current = 0;

    // Wake up on first click
    setHasAwoken(true);

    const bounds = getContainerBounds();
    const transform = calculateSquashTransform(0, 0, true, bounds);
    rawScaleX.set(transform.scaleX);
    rawScaleY.set(transform.scaleY);
    rawRotate.set(transform.rotate);
    rawX.set(transform.x);
    rawY.set(transform.y);

    rawButterX.set(0);
    rawButterY.set(4);
    rawButterRotate.set(0);

    // Burst particles directly out of the squishy loaf on click
    const newParticles = particlePoolRef.current.spawnBurst(130, 90, SQUISHY_CONFIG.particles.burstCount);
    setParticles([...newParticles]);

    setTimeout(() => {
      particlePoolRef.current.clear();
      setParticles([]);
    }, SQUISHY_CONFIG.particles.lifespanMs);

    setExpression('squished');
    if (resetExprTimerRef.current) clearTimeout(resetExprTimerRef.current);

    resetIdleTimer();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    totalDragDistRef.current = Math.max(totalDragDistRef.current, Math.hypot(dx, dy));

    const bounds = getContainerBounds();
    const transform = calculateSquashTransform(dx, dy, true, bounds);
    rawScaleX.set(transform.scaleX);
    rawScaleY.set(transform.scaleY);
    rawRotate.set(transform.rotate);
    rawX.set(transform.x);
    rawY.set(transform.y);

    const localButterX = clamp(transform.rotate * -0.25, -6, 6);
    const localButterY = clamp((1 - transform.scaleY) * 16, -4, 8);
    const localButterRotate = clamp(transform.rotate * -0.4, -8, 8);

    rawButterX.set(localButterX);
    rawButterY.set(localButterY);
    rawButterRotate.set(localButterRotate);
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }

    rawScaleX.set(1);
    rawScaleY.set(1);
    rawRotate.set(0);
    rawX.set(0);
    rawY.set(0);

    rawButterX.set(0);
    rawButterY.set(0);
    rawButterRotate.set(0);

    const newParticles = particlePoolRef.current.spawnBurst(130, 100, SQUISHY_CONFIG.particles.burstCount);
    setParticles([...newParticles]);

    setTimeout(() => {
      particlePoolRef.current.clear();
      setParticles([]);
    }, SQUISHY_CONFIG.particles.lifespanMs);

    setExpression('happy');
    resetExprTimerRef.current = setTimeout(() => {
      setExpression('calm');
    }, SQUISHY_CONFIG.timings.expressionResetDelay);

    resetIdleTimer();
  };

  const handleDoubleClick = () => {
    if (totalDragDistRef.current > 8) return; // Prevent accidental double click while dragging
    setExpression('surprised');
    const newParticles = particlePoolRef.current.spawnBurst(130, 80, 8);
    setParticles([...newParticles]);

    setTimeout(() => {
      particlePoolRef.current.clear();
      setParticles([]);
      setExpression('calm');
    }, SQUISHY_CONFIG.timings.expressionResetDelay);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center w-full min-h-[420px] select-none relative overflow-hidden"
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="relative cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center p-2 w-full min-h-[400px]"
      >
        <motion.div
          style={{
            scaleX: springScaleX,
            scaleY: springScaleY,
            rotate: springRotate,
            x: springX,
            y: springY,
            transformOrigin: 'bottom center',
            width: 260,
            height: 210,
          }}
          className="relative flex items-center justify-center"
        >
          <svg width="260" height="210" viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="loaf-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.35" />
              </filter>

              <linearGradient id="loaf-crust-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="25%" stopColor="#d97706" />
                <stop offset="65%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>

              <linearGradient id="loaf-crumb-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fffdf5" />
                <stop offset="40%" stopColor="#fef3c7" />
                <stop offset="85%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
              </linearGradient>

              <radialGradient id="loaf-blush-gradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="butter-pat-gradient" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>

            <g filter="url(#loaf-soft-shadow)">
              <path
                d="M 45 60 C 45 35, 75 25, 130 25 C 185 25, 215 35, 215 60 C 218 80, 218 160, 205 178 C 190 190, 70 190, 55 178 C 42 160, 42 80, 45 60 Z"
                fill="url(#loaf-crust-gradient)"
                stroke="#451a03"
                strokeWidth="3"
              />

              <path
                d="M 54 65 C 54 44, 80 34, 130 34 C 180 34, 206 44, 206 65 C 208 82, 208 153, 196 169 C 183 179, 77 179, 64 169 C 52 153, 52 82, 54 65 Z"
                fill="url(#loaf-crumb-gradient)"
                stroke="#78350f"
                strokeWidth="1.8"
              />

              <ellipse cx="130" cy="110" rx="55" ry="32" fill="url(#loaf-blush-gradient)" />

              <path
                d="M 60 48 C 85 36, 175 36, 200 48"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeOpacity="0.35"
                fill="none"
              />

              <LoafFace expression={expression} isBlinking={isBlinking} eyeOffset={eyeOffset} />

              <LoafButter
                springX={springButterX}
                springY={springButterY}
                springRotate={springButterRotate}
              />
            </g>
          </svg>

          {/* Floating Pooled Particles bursting 360° OUTWARDS past crust edges */}
          {particles.map((pt) => (
            <motion.span
              key={`${pt.id}-${pt.targetX.toFixed(1)}`}
              initial={{
                x: 0,
                y: 0,
                scale: 0.2,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: pt.targetX,
                y: pt.targetY,
                scale: [0.2, pt.scale, 0.4],
                opacity: [1, 1, 0],
                rotate: pt.rotate,
              }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute text-xl pointer-events-none select-none font-bold z-40 drop-shadow-md"
              style={{
                left: pt.startX - 12,
                top: pt.startY - 12,
              }}
            >
              {pt.emoji}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Alias export for backward compatibility
export const SquishyLoaf = Squishy;
