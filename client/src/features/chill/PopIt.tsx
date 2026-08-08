import { useState, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface RowColorConfig {
  name: string;
  base: string;
  light: string;
  dark: string;
  shadow: string;
  poppedBase: string;
  poppedDark: string;
}

const ROW_COLORS: RowColorConfig[] = [
  {
    name: 'Purple',
    base: '#a855f7',
    light: '#e9d5ff',
    dark: '#7e22ce',
    shadow: '#581c87',
    poppedBase: '#6b21a8',
    poppedDark: '#3b0764',
  },
  {
    name: 'Blue',
    base: '#0284c7',
    light: '#bae6fd',
    dark: '#0369a1',
    shadow: '#075985',
    poppedBase: '#075985',
    poppedDark: '#0c4a6e',
  },
  {
    name: 'Green',
    base: '#16a34a',
    light: '#bbf7d0',
    dark: '#15803d',
    shadow: '#166534',
    poppedBase: '#166534',
    poppedDark: '#14532d',
  },
  {
    name: 'Yellow',
    base: '#eab308',
    light: '#fef08a',
    dark: '#ca8a04',
    shadow: '#854d0e',
    poppedBase: '#a16207',
    poppedDark: '#713f12',
  },
  {
    name: 'Orange',
    base: '#ea580c',
    light: '#fed7aa',
    dark: '#c2410c',
    shadow: '#9a3412',
    poppedBase: '#9a3412',
    poppedDark: '#7c2d12',
  },
  {
    name: 'Red',
    base: '#dc2626',
    light: '#fca5a5',
    dark: '#b91c1c',
    shadow: '#991b1b',
    poppedBase: '#7f1d1d',
    poppedDark: '#450a0a',
  },
];

export function PopIt() {
  const [bubbles, setBubbles] = useState<boolean[]>(Array(36).fill(false));
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playPopSound = useCallback((isPoppingIn: boolean) => {
    try {
      if (!audioCtxRef.current) {
        const ACtx = window.AudioContext || (window as any).webkitAudioContext;
        if (ACtx) audioCtxRef.current = new ACtx();
      }
      const ctx = audioCtxRef.current!;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = isPoppingIn ? 560 + Math.random() * 80 : 380 + Math.random() * 60;
      const endFreq = isPoppingIn ? 140 : 200;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.038);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.042);
    } catch {
      /* ignore audio error */
    }
  }, []);

  const handlePop = (index: number) => {
    setBubbles((prev) => {
      const next = [...prev];
      const currentState = next[index];
      next[index] = !currentState;
      playPopSound(!currentState);
      return next;
    });
  };

  const flipBoard = () => {
    setBubbles((prev) => {
      const allPopped = prev.every(Boolean);
      const nextState = prev.map(() => !allPopped);
      for (let i = 0; i < 6; i++) {
        setTimeout(() => playPopSound(!allPopped), i * 35);
      }
      return nextState;
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 select-none w-full max-w-[360px] mx-auto py-1">
      {/* ── Sleek Semi-Glossy Silicone Pop-It Toy (Thinner Border & Bigger Bubbles) ── */}
      <div className="relative flex items-center justify-center">
        <svg
          width="320"
          height="320"
          viewBox="0 0 320 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft physical board drop shadow onto card */}
            <filter id="toy-drop-shadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Clip path for outer rounded rubber board */}
            <clipPath id="popit-toy-clip">
              <rect x="0" y="0" width="320" height="320" rx="28" />
            </clipPath>

            {/* Dynamic Semi-Glossy Gradients per Row for Bubbles */}
            {ROW_COLORS.map((row, rIdx) => (
              <g key={`defs-${rIdx}`}>
                {/* 1. Unpopped Convex Sphere Semi-Gloss Radial Gradient */}
                <radialGradient id={`unpopped-grad-${rIdx}`} cx="38%" cy="30%" r="65%">
                  <stop offset="0%" stopColor={row.light} stopOpacity="0.95" />
                  <stop offset="40%" stopColor={row.base} />
                  <stop offset="82%" stopColor={row.dark} />
                  <stop offset="100%" stopColor={row.shadow} />
                </radialGradient>

                {/* 2. Popped Concave Inset Radial Gradient */}
                <radialGradient id={`popped-grad-${rIdx}`} cx="62%" cy="68%" r="65%">
                  <stop offset="0%" stopColor={row.poppedDark} />
                  <stop offset="50%" stopColor={row.poppedBase} />
                  <stop offset="90%" stopColor={row.dark} />
                  <stop offset="100%" stopColor={row.base} />
                </radialGradient>
              </g>
            ))}
          </defs>

          {/* ── 1. Main Solid Matte Rainbow Rubber Board & Sleek Border ── */}
          <g filter="url(#toy-drop-shadow)">
            {/* Outer Rubber Board clipped into 6 solid matte color horizontal bands */}
            <g clipPath="url(#popit-toy-clip)">
              {ROW_COLORS.map((row, rIdx) => {
                const startY = rIdx === 0 ? 0 : 15 + rIdx * 48.333;
                const endY = rIdx === 5 ? 320 : 15 + (rIdx + 1) * 48.333;
                const height = endY - startY;

                return (
                  <rect
                    key={`border-strip-${rIdx}`}
                    x="0"
                    y={startY}
                    width="320"
                    height={height}
                    fill={row.base}
                  />
                );
              })}

              {/* Molded silicone horizontal ridge dividers between rows */}
              {ROW_COLORS.map((_, rIdx) => {
                if (rIdx === 0) return null;
                const rowY = 15 + rIdx * 48.333;
                return (
                  <line
                    key={`ridge-${rIdx}`}
                    x1="0"
                    y1={rowY}
                    x2="320"
                    y2={rowY}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                );
              })}

              {/* Inner Tray Floor Recess Contour (Sleek 15px border wall) */}
              <rect
                x="15"
                y="15"
                width="290"
                height="290"
                rx="18"
                fill="none"
                stroke="rgba(0, 0, 0, 0.25)"
                strokeWidth="3.5"
              />
            </g>

            {/* Outer Thick Rubber Border Contour Line */}
            <rect
              x="1.5"
              y="1.5"
              width="317"
              height="317"
              rx="28"
              fill="none"
              stroke="rgba(0, 0, 0, 0.3)"
              strokeWidth="3"
            />
          </g>

          {/* ── 2. 6x6 Grid of 36 Bigger Semi-Glossy Silicone Bubbles ── */}
          {Array.from({ length: 36 }).map((_, idx) => {
            const rowIdx = Math.floor(idx / 6);
            const colIdx = idx % 6;
            const isPopped = bubbles[idx];
            const rowColor = ROW_COLORS[rowIdx];

            // Centers inside expanded inner tray area (x: 15..305, y: 15..305)
            const cx = 15 + (colIdx + 0.5) * 48.333;
            const cy = 15 + (rowIdx + 0.5) * 48.333;

            return (
              <g
                key={`bubble-${idx}`}
                onClick={() => handlePop(idx)}
                className="cursor-pointer group"
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* Socket Molded Recessed Cavity (Bigger 20.5px radius) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="20.5"
                  fill={rowColor.shadow}
                  stroke="rgba(0,0,0,0.32)"
                  strokeWidth="1.8"
                />
                <circle cx={cx} cy={cy} r="19.5" fill="rgba(0,0,0,0.18)" />

                {/* Semi-Glossy 3D Silicone Bubble Dome (Bigger 18px radius) */}
                <motion.g
                  animate={{
                    scale: isPopped ? 0.88 : 1,
                    y: isPopped ? 1.5 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                >
                  {isPopped ? (
                    // Popped Concave Indentation (Bigger 17px cavity)
                    <g className="pointer-events-none">
                      <circle
                        cx={cx}
                        cy={cy + 1}
                        r="17"
                        fill={`url(#popped-grad-${rowIdx})`}
                        stroke={rowColor.dark}
                        strokeWidth="1.2"
                      />
                      {/* Inner Socket Shadow Ring */}
                      <circle
                        cx={cx}
                        cy={cy + 1}
                        r="17"
                        fill="none"
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="2"
                      />
                      {/* Soft Bottom Reflection Curve */}
                      <path
                        d={`M ${cx - 12} ${cy + 8} Q ${cx} ${cy + 15} ${cx + 12} ${cy + 8}`}
                        stroke="#ffffff"
                        strokeOpacity="0.22"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  ) : (
                    // Unpopped Convex Sphere (Bigger 18px Bulging Dome)
                    <g className="pointer-events-none">
                      <circle
                        cx={cx}
                        cy={cy}
                        r="18"
                        fill={`url(#unpopped-grad-${rowIdx})`}
                        stroke={rowColor.dark}
                        strokeWidth="1.2"
                      />
                      {/* Tactile Semi-Gloss Specular Highlight Crescent */}
                      <ellipse
                        cx={cx - 5.2}
                        cy={cy - 5.2}
                        rx="5.2"
                        ry="2.6"
                        transform={`rotate(-40 ${cx - 5.2} ${cy - 5.2})`}
                        fill="#ffffff"
                        fillOpacity="0.48"
                      />
                      <circle cx={cx - 7} cy={cy - 7} r="1.4" fill="#ffffff" fillOpacity="0.68" />
                    </g>
                  )}
                </motion.g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Single Centered Flip Board Button at Bottom ── */}
      <div className="flex items-center justify-center mt-1">
        <button
          onClick={flipBoard}
          className="px-6 py-2.5 bg-[#9B59F5] text-white font-mono text-xs font-black uppercase tracking-wider border-3 border-black rounded-bb-sm shadow-bb hover:bg-[#853cf0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center gap-2"
          title="Flip board or pop all bubbles!"
        >
          <RotateCcw size={14} /> FLIP BOARD
        </button>
      </div>
    </div>
  );
}
