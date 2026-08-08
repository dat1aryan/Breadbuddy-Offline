import { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Volume2, VolumeX, RotateCcw, Play, Pause, Trophy, Sparkles } from 'lucide-react';

const W = 434;
const H = 483;
const GRAVITY = 0.24;
const JUMP_FORCE = -6.2; // Slightly snappier jump
const GAP_HEIGHT = 175;
const GROUND_H = 60; // Thicker lava bed

type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'spark' | 'ember' | 'crumb' | 'smoke';
  rot: number;
  vRot: number;
}

interface ToasterObstacle {
  x: number;
  w: number;
  topH: number;
  botH: number;
  speed: number;
  passed: boolean;
  heatPulse: number;
  toastOffset: number; // For the popping toast animation
}

export function FlappyBread() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() =>
    parseInt(localStorage.getItem('flappy_bread_hs_v8') || '0', 10)
  );
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    localStorage.getItem('flappy_bread_muted') === 'true'
  );
  const isMutedRef = useRef<boolean>(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  // Helper to smoothly scroll main viewport directly to FlappyBread card
  const scrollToGameFocus = () => {
    if (!containerRef.current) return;
    const mainEl = containerRef.current.closest('main');
    if (mainEl) {
      const cardRect = containerRef.current.getBoundingClientRect();
      const mainRect = mainEl.getBoundingClientRect();
      const relativeTop = cardRect.top - mainRect.top + mainEl.scrollTop;
      mainEl.scrollTo({ top: Math.max(0, relativeTop - 12), behavior: 'smooth' });
    } else {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Smooth scroll into focus on mount / tab open
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToGameFocus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Particles & Trail
  const particlesRef = useRef<Particle[]>([]);
  // Screen Shake Ref
  const shakeRef = useRef<number>(0);
  // Time reference for animations
  const timeRef = useRef<number>(0);

  // Main Game Engine State
  const engineRef = useRef({
    state: 'START' as GameState,
    bird: {
      x: 85,
      y: 240,
      w: 54, // Wider, cuter loaf
      h: 44,
      vel: 0,
      rot: 0,
      squish: 1, // For squash/stretch animation
    },
    toasters: [] as ToasterObstacle[],
    score: 0,
    frameCount: 0,
    bgScroll: 0,
  });

  // Noise texture cache
  const noiseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ─── AUDIO SYSTEM ────────────────────────────────────────────────────────
  const playSound = (type: 'jump' | 'score' | 'hit' | 'highscore') => {
    if (isMutedRef.current) return;
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
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        // Bouncy, cute jump sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'score') {
        // Satisfying chime
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.15); // C6
        
        // Use a lowpass filter to soften the square wave
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);
        
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'hit') {
        // Crunchy, deep thud
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'highscore') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch {
      /* ignore */
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      localStorage.setItem('flappy_bread_muted', String(next));
      return next;
    });
  };

  // ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────
  const addParticles = (x: number, y: number, count: number, shape: 'crumb' | 'spark' | 'ember' | 'smoke') => {
    const particles = particlesRef.current;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 2 + 1;
      let life = Math.random() * 20 + 10;
      let color = '#fff';
      let size = Math.random() * 3 + 2;

      if (shape === 'spark') {
        speed = Math.random() * 5 + 3;
        color = Math.random() > 0.5 ? '#fde047' : '#ffffff';
        size = Math.random() * 2 + 1;
        life = Math.random() * 15 + 5;
      } else if (shape === 'ember') {
        speed = Math.random() * 1.5 + 0.5;
        color = ['#ea580c', '#f97316', '#fde047', '#ef4444'][Math.floor(Math.random() * 4)];
        size = Math.random() * 4 + 2;
        life = Math.random() * 40 + 20;
      } else if (shape === 'crumb') {
        speed = Math.random() * 3 + 1;
        color = ['#f59e0b', '#d97706', '#92400e', '#fef3c7'][Math.floor(Math.random() * 4)];
        size = Math.random() * 5 + 3;
      } else if (shape === 'smoke') {
        speed = Math.random() * 1 + 0.2;
        color = 'rgba(255, 255, 255, 0.15)';
        size = Math.random() * 10 + 5;
        life = Math.random() * 30 + 20;
      }

      particles.push({
        x,
        y,
        vx: shape === 'crumb' ? -Math.random() * 2 - 1 : Math.cos(angle) * speed, // Crumbs fly backward
        vy: shape === 'smoke' || shape === 'ember' ? -Math.random() * 2 - 0.5 : Math.sin(angle) * speed,
        size,
        color,
        alpha: 1,
        life: 0,
        maxLife: life,
        shape,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }
  };

  const createToaster = (): ToasterObstacle => {
    const minTop = 80;
    const maxTop = H - GROUND_H - GAP_HEIGHT - 60;
    const topH = Math.random() * (maxTop - minTop) + minTop;
    const botH = H - GROUND_H - topH - GAP_HEIGHT;

    return {
      x: W + 20,
      w: 80, // Chunky toasters
      topH,
      botH,
      speed: 1.8,
      passed: false,
      heatPulse: Math.random() * Math.PI * 2,
      toastOffset: Math.random() * 10,
    };
  };

  const startGame = () => {
    const engine = engineRef.current;
    if (engine.state === 'START') {
      engine.state = 'PLAYING';
      setGameState('PLAYING');
      engine.toasters = [createToaster()];
      engine.bird.vel = JUMP_FORCE;
      playSound('jump');

      // Adjust viewport orientation & smoothly scroll into full-screen focus
      scrollToGameFocus();
    }
  };

  const jump = () => {
    const engine = engineRef.current;
    if (engine.state === 'PLAYING') {
      engine.bird.vel = JUMP_FORCE;
      engine.bird.squish = 0.6; // Squash on jump
      playSound('jump');
      // Create a nice burst of crumbs and a smoke puff
      addParticles(engine.bird.x - 10, engine.bird.y + 15, 6, 'crumb');
      addParticles(engine.bird.x, engine.bird.y + 10, 3, 'smoke');
    }
  };

  const resetGame = () => {
    const engine = engineRef.current;
    engine.bird = {
      x: 85,
      y: 240,
      w: 54,
      h: 44,
      vel: 0,
      rot: 0,
      squish: 1,
    };
    engine.toasters = [];
    engine.bgScroll = 0;
    engine.score = 0;
    engine.frameCount = 0;
    engine.state = 'START';
    particlesRef.current = [];
    setScore(0);
    setIsNewHigh(false);
    setGameState('START');
  };

  const togglePause = () => {
    const engine = engineRef.current;
    if (engine.state === 'PLAYING') {
      engine.state = 'PAUSED';
      setGameState('PAUSED');
    } else if (engine.state === 'PAUSED') {
      engine.state = 'PLAYING';
      setGameState('PLAYING');
    }
  };

  // ─── HYPER-DETAILED RENDERERS ────────────────────────────────────────────

  // Pre-generate noise texture for gritty factory vibe
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(W, H);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const val = Math.random() * 255;
        imgData.data[i] = val;
        imgData.data[i + 1] = val;
        imgData.data[i + 2] = val;
        imgData.data[i + 3] = 12; // Very subtle
      }
      ctx.putImageData(imgData, 0, 0);
      noiseCanvasRef.current = canvas;
    }
  }, []);

  const drawBreadFactoryEnvironment = (ctx: CanvasRenderingContext2D, bgScroll: number, time: number) => {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // 1. Chinatown / Infinity Castle Atmospheric Sky Gradient (Deep Midnight Violet & Plum)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#150524');   // Deep Midnight Violet
    skyGrad.addColorStop(0.4, '#3b0e40'); // Rich Magenta Plum
    skyGrad.addColorStop(0.75, '#4a0e4e'); // Deep Violet Night
    skyGrad.addColorStop(1, '#1f0422');    // Dark Mahogany Base
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Soft Ambient Purple/Magenta Clouds
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(W * 0.25, H * 0.25, 130, 0, Math.PI * 2);
    ctx.arc(W * 0.8, H * 0.2, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1.5. Demon Slayer Infinity Castle Inverted Overhead Ceiling Structure
    ctx.save();
    const ceilShift = (bgScroll * 0.2) % 400;
    for (let loop = -1; loop <= 1; loop++) {
      const cx = loop * 400 - ceilShift;

      // Heavy Overhead Roof Deck Base (Top edge)
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, 45);
      ceilGrad.addColorStop(0, '#0c0212');
      ceilGrad.addColorStop(0.7, '#1f0628');
      ceilGrad.addColorStop(1, '#110317');
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(cx, 0, 400, 32);

      // Inverted Eaves & Dougong Brackets (hanging downward from ceiling)
      ctx.fillStyle = '#16041c';
      ctx.beginPath();
      ctx.moveTo(cx + 10, 32);
      ctx.quadraticCurveTo(cx + 90, 52, cx + 170, 32);
      ctx.lineTo(cx + 160, 26);
      ctx.quadraticCurveTo(cx + 90, 44, cx + 20, 26);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + 210, 32);
      ctx.quadraticCurveTo(cx + 300, 56, cx + 390, 32);
      ctx.lineTo(cx + 380, 26);
      ctx.quadraticCurveTo(cx + 300, 48, cx + 220, 26);
      ctx.closePath();
      ctx.fill();

      // Inverted Balustrade Railings along the overhead deck
      ctx.fillStyle = '#0a010e';
      ctx.fillRect(cx, 26, 400, 4);
      for (let r = 0; r < 400; r += 14) {
        ctx.fillRect(cx + r, 16, 3, 10);
      }
      ctx.fillRect(cx, 15, 400, 3);

      // Hanging Vertical Timber Columns
      ctx.fillStyle = '#22082b';
      ctx.fillRect(cx + 50, 32, 14, 22);
      ctx.fillRect(cx + 130, 32, 14, 16);
      ctx.fillRect(cx + 250, 32, 14, 24);
      ctx.fillRect(cx + 340, 32, 14, 18);

      // Glowing Inverted Lattice Windows
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(251, 146, 60, 0.9)';
      ctx.fillRect(cx + 68, 6, 22, 12);
      ctx.fillRect(cx + 148, 6, 22, 12);
      ctx.fillRect(cx + 268, 6, 22, 12);
      ctx.fillRect(cx + 348, 6, 22, 12);

      // Lattice window grid overlay
      ctx.fillStyle = '#0c0212';
      for (const wX of [cx + 68, cx + 148, cx + 268, cx + 348]) {
        ctx.fillRect(wX + 10, 6, 2, 12);
        ctx.fillRect(wX, 11, 22, 2);
      }

      // Small hanging upside-down red lanterns
      const drawCeilLantern = (lx: number, ly: number) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-3, -9, 6, 2);
        ctx.fillRect(-3, 7, 6, 2);
        ctx.fillRect(-0.5, 9, 1, 5);
        ctx.restore();
      };

      drawCeilLantern(cx + 90, 48);
      drawCeilLantern(cx + 300, 50);
    }
    ctx.restore();

    // 2. Parallax Layer 3: Detailed Chinatown Skyline (3D Depth)
    ctx.save();
    const shift3 = (bgScroll * 0.15) % 600;

    for (let loop = -1; loop <= 1; loop++) {
      const ox = loop * 600 - shift3;

      // Helper for Pagoda Roof (curved upturned eaves)
      const drawPagodaRoof = (rx: number, ry: number, rw: number, rh: number) => {
        ctx.fillStyle = '#16041a';
        ctx.beginPath();
        ctx.moveTo(rx - 16, ry + rh);
        ctx.quadraticCurveTo(rx + rw / 2, ry - rh / 2, rx + rw + 16, ry + rh);
        ctx.lineTo(rx + rw + 8, ry);
        ctx.quadraticCurveTo(rx + rw / 2, ry - rh * 1.5, rx - 8, ry);
        ctx.closePath();
        ctx.fill();
        // Roof highlight edge
        ctx.strokeStyle = '#380e42';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      // Helper for 3D Tower Body
      const drawTowerBody = (x: number, y: number, w: number, h: number) => {
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, '#1c0621'); // Shadow left side
        grad.addColorStop(0.3, '#2a0c30');
        grad.addColorStop(0.7, '#3d1245'); // Front side light
        grad.addColorStop(1, '#2e0a36'); // Edge
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        
        // Corner pillars for depth
        ctx.fillStyle = '#110314';
        ctx.fillRect(x, y, 4, h);
        ctx.fillRect(x + w - 4, y, 4, h);
      };

      // Helper for Balcony Railings
      const drawBalcony = (x: number, y: number, w: number) => {
        ctx.fillStyle = '#110314';
        ctx.fillRect(x - 4, y, w + 8, 8); // Base deck
        for(let i = 0; i <= w; i += 8) {
          ctx.fillRect(x + i, y - 8, 4, 8); // Vertical spindles
        }
        ctx.fillRect(x - 6, y - 10, w + 12, 4); // Handrail top
      };

      // Helper for Glowing Lattice Windows
      const drawLatticeWindows = (x: number, y: number, w: number, rows: number, cols: number) => {
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
        const cellW = (w - (cols + 1) * 4) / cols;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.fillRect(x + 4 + c * (cellW + 4), y + 4 + r * 14, cellW, 10);
          }
        }
      };

      // --- TOWER 1: The Grand Clock Tower ---
      const t1x = ox + 40;
      // Base
      drawTowerBody(t1x, H - 180, 80, 180);
      // Arched Entrance
      ctx.fillStyle = '#0a020d';
      ctx.beginPath();
      ctx.arc(t1x + 40, H - 60, 25, Math.PI, 0);
      ctx.lineTo(t1x + 65, H);
      ctx.lineTo(t1x + 15, H);
      ctx.fill();
      // Tier 1
      drawBalcony(t1x, H - 180, 80);
      drawTowerBody(t1x + 10, H - 280, 60, 100);
      drawLatticeWindows(t1x + 10, H - 260, 60, 4, 3);
      // Tier 2
      drawPagodaRoof(t1x + 5, H - 295, 70, 15);
      drawBalcony(t1x + 10, H - 280, 60);
      drawTowerBody(t1x + 20, H - 360, 40, 65);
      // Glowing Clock Face / Sigil
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(t1x + 40, H - 325, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(t1x + 40, H - 325, 8, 0, Math.PI * 2);
      ctx.fill();
      // Roof & Spire
      drawPagodaRoof(t1x + 15, H - 375, 50, 15);
      ctx.fillStyle = '#110314';
      ctx.fillRect(t1x + 38, H - 420, 4, 45);

      // --- TOWER 2: Infinity Citadel Deck ---
      const t2x = ox + 180;
      // Massive supports
      ctx.fillStyle = '#1c0621';
      ctx.fillRect(t2x + 20, H - 200, 20, 200);
      ctx.fillRect(t2x + 100, H - 200, 20, 200);
      // Deck 1
      drawTowerBody(t2x, H - 260, 140, 60);
      drawBalcony(t2x, H - 200, 140);
      drawLatticeWindows(t2x, H - 250, 140, 3, 6);
      drawPagodaRoof(t2x - 10, H - 280, 160, 20);
      // Deck 2
      drawTowerBody(t2x + 30, H - 340, 80, 60);
      drawBalcony(t2x + 30, H - 280, 80);
      drawLatticeWindows(t2x + 30, H - 330, 80, 3, 3);
      drawPagodaRoof(t2x + 20, H - 355, 100, 15);

      // --- TOWER 3: Distant Multi-Tier Pagoda ---
      const t3x = ox + 380;
      drawTowerBody(t3x, H - 150, 100, 150);
      drawBalcony(t3x, H - 150, 100);
      
      drawTowerBody(t3x + 10, H - 240, 80, 90);
      drawPagodaRoof(t3x + 5, H - 255, 90, 15);
      drawBalcony(t3x + 10, H - 240, 80);
      drawLatticeWindows(t3x + 10, H - 220, 80, 4, 4);

      drawTowerBody(t3x + 25, H - 310, 50, 55);
      drawPagodaRoof(t3x + 20, H - 325, 60, 15);
      drawBalcony(t3x + 25, H - 310, 50);
      drawLatticeWindows(t3x + 25, H - 295, 50, 2, 2);
      
      // Spire
      ctx.fillStyle = '#110314';
      ctx.fillRect(t3x + 48, H - 370, 4, 45);

      // --- Hanging Overhead Wires ---
      ctx.strokeStyle = '#260a2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox + 80, H - 320); // From Tower 1
      ctx.quadraticCurveTo(ox + 160, H - 280, ox + 210, H - 310); // To Deck 2
      ctx.quadraticCurveTo(ox + 300, H - 260, ox + 405, H - 280); // To Tower 3
      ctx.stroke();

      // --- Hanging Red/Pink Chinese Paper Lanterns (🏮) ---
      const drawLantern = (lx: number, ly: number) => {
        ctx.save();
        ctx.translate(lx, ly); // Static, no sway
        
        ctx.shadowBlur = 0;
        
        // Volumetric body
        const lGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 10);
        lGrad.addColorStop(0, '#ff7a91');
        lGrad.addColorStop(0.5, '#f43f5e');
        lGrad.addColorStop(1, '#9f102b');
        
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hyper-realistic caps
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-4, -12, 8, 2); // Top cap base
        ctx.fillRect(-5, -11, 10, 1); // Top cap rim
        
        ctx.fillRect(-4, 10, 8, 2); // Bottom cap base
        ctx.fillRect(-5, 10, 10, 1); // Bottom cap rim
        
        // Tassel
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-1, 12, 2, 8); // Thicker top of tassel
        ctx.fillRect(-0.5, 20, 1, 4); // Thinner bottom

        // Fine vertical paper lines on lantern
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 11);
        ctx.stroke();

        ctx.restore();
      };

      drawLantern(t1x + 10, H - 283);
      drawLantern(t1x + 70, H - 283);
      
      drawLantern(t2x + 20, H - 265);
      drawLantern(t2x + 120, H - 265);
      
      drawLantern(t3x + 10, H - 245);
      drawLantern(t3x + 90, H - 245);
    }
    ctx.restore();

    // 3. Parallax Layer 2: Infinity Castle Wooden Beams & Interlocking Dougong Brackets
    ctx.save();
    const shift2 = (bgScroll * 0.3) % 400;
    
    for (let loop = -1; loop <= 2; loop++) {
      const ox = loop * 400 - shift2;

      ctx.fillStyle = '#1c0621';
      ctx.strokeStyle = '#380e42';
      ctx.lineWidth = 3;

      // Heavy Timber Support Columns
      const colW = 22;
      ctx.fillRect(ox + 60, 0, colW, H - 60);
      ctx.strokeRect(ox + 60, 0, colW, H - 60);

      ctx.fillRect(ox + 280, 0, colW, H - 60);
      ctx.strokeRect(ox + 280, 0, colW, H - 60);

      // Traditional Bracket Caps (Dougong Joints)
      ctx.fillStyle = '#2e0a36';
      ctx.fillRect(ox + 52, 118, colW + 16, 18);
      ctx.fillRect(ox + 52, 258, colW + 16, 18);
      ctx.fillRect(ox + 272, 118, colW + 16, 18);
      ctx.fillRect(ox + 272, 258, colW + 16, 18);

      // Horizontal Interlocking Beams
      ctx.fillStyle = '#15041a';
      ctx.fillRect(ox, 122, 400, 12);
      ctx.fillRect(ox, 262, 400, 14);

      // Diagonal Cross-Bracing Wooden Beams
      ctx.strokeStyle = '#380e42';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ox + 82, 134);
      ctx.lineTo(ox + 280, 262);
      ctx.moveTo(ox + 280, 134);
      ctx.lineTo(ox + 82, 262);
      ctx.stroke();
    }
    ctx.restore();



    // 4. Clean Neon Signs (Orange Glow on BREAD BUDDY sign ONLY)
    ctx.save();
    const neonPulse = 0.8 + Math.sin(time * 3) * 0.2;
    
    const drawNeonSign = (x: number, y: number, w: number, h: number, text: string[], color: string, isIcon: boolean) => {
      let edgeFade = 1;
      if (x < 20) {
        edgeFade = Math.max(0, (x + 120) / 140);
      } else if (x + w > W - 20) {
        edgeFade = Math.max(0, (W + 120 - x) / 140);
      }

      if (edgeFade <= 0.01) return;

      ctx.globalAlpha = neonPulse * edgeFade;
      ctx.textAlign = 'center';
      
      if (isIcon) {
        // Vibrant Orange Neon Glow for BREAD BUDDY Sign
        ctx.shadowColor = '#ff7700';
        ctx.shadowBlur = 16;

        // TOP CIRCLE
        const circleRadius = 28;
        const circleY = y;
        
        ctx.lineWidth = 4; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(x + w/2, circleY, circleRadius, 0, Math.PI*2); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.arc(x + w/2, circleY, circleRadius, 0, Math.PI*2); ctx.stroke();
        
        // BREAD ICON OUTLINE
        const bx = x + w/2 + 2;
        const by = circleY;
        
        const drawBreadShape = (ox: number, oy: number) => {
          ctx.beginPath();
          ctx.moveTo(ox - 11, oy + 11);
          ctx.lineTo(ox - 11, oy - 3);
          ctx.quadraticCurveTo(ox - 11, oy - 13, ox - 1, oy - 9);
          ctx.quadraticCurveTo(ox + 9, oy - 13, ox + 11, oy - 3);
          ctx.lineTo(ox + 11, oy + 11);
          ctx.lineTo(ox - 11, oy + 11);
          ctx.stroke();
        };

        ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        drawBreadShape(bx, by);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(bx - 5, by + 1, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 5, by + 1, 1.8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by + 5, 2.5, 0, Math.PI, false); ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(bx - 16, by + 8);
        ctx.lineTo(bx - 16, by - 5);
        ctx.quadraticCurveTo(bx - 16, by - 15, bx - 3, by - 11);
        ctx.stroke();
        
        // BOTTOM RECTANGLE
        const rectY = y + 35;
        const rectH = 50;
        
        ctx.lineWidth = 4; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.roundRect(x - 5, rectY, w + 10, rectH, 8); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.roundRect(x - 5, rectY, w + 10, rectH, 8); ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '900 14px "Arial Rounded MT Bold", Inter, sans-serif';
        ctx.fillText(text[0], x + w/2, rectY + 22);
        ctx.fillText(text[1], x + w/2, rectY + 40);
        
        ctx.fillStyle = '#fff';
        ctx.fillText(text[0], x + w/2, rectY + 22);
        ctx.fillText(text[1], x + w/2, rectY + 40);

      } else {
        // STANDARD RECTANGLE (No Glow Blur)
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 4; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke();

        ctx.fillStyle = `rgba(${color === '#ef4444' ? '239, 68, 68' : '234, 88, 12'}, 0.15)`;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();

        ctx.fillStyle = color;
        ctx.font = '900 13px "Arial Rounded MT Bold", Inter, sans-serif';
        text.forEach((t, i) => {
          ctx.fillText(t, x + w/2, y + 22 + i * 16);
        });
        
        ctx.fillStyle = '#fff';
        text.forEach((t, i) => {
          ctx.fillText(t, x + w/2, y + 22 + i * 16);
        });
      }
      // Mandatory shadow reset
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    };

    const period = 720;
    const calculateSignX = (initialX: number) => {
      let x = (initialX - (bgScroll * 0.4)) % period;
      if (x < -140) {
        x += period;
      }
      return x;
    };

    const sign1X = calculateSignX(30);
    drawNeonSign(sign1X, 100, 80, 68, ['EARN', 'SAVE', 'INVEST'], '#f43f5e', false);

    const sign2X = calculateSignX(W - 120);
    drawNeonSign(sign2X, 120, 75, 75, ['BREAD', 'BUDDY'], '#ff7700', true);

    ctx.restore();

    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  };

  // 6. Clean & Simple Stylized Lava Bed (Performant 60 FPS Vector Waves)
  const drawLavaHazard = (ctx: CanvasRenderingContext2D, time: number) => {
    const groundY = H - GROUND_H;

    ctx.save();

    // Solid dark hearth base
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, groundY - 15, W, GROUND_H + 15);

    // Layer 1: Back Wave (Deep Magma Red)
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      const y = groundY - 10 + Math.sin(x * 0.02 + time * 1.2) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Front Wave (Vibrant Orange to Crimson with Golden Rim)
    const frontGrad = ctx.createLinearGradient(0, groundY - 8, 0, H);
    frontGrad.addColorStop(0, '#f97316');
    frontGrad.addColorStop(0.5, '#dc2626');
    frontGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = frontGrad;

    const points: { x: number; y: number }[] = [];
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      const y = groundY + Math.sin(x * 0.035 - time * 1.8) * 7 + Math.cos(x * 0.015 + time) * 4;
      points.push({ x, y });
    }
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Glowing Orange Rim & Fire Hazard Ambient Bloom
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      if (i === 0) ctx.moveTo(p1.x, p1.y);
      else ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    ctx.stroke();
    ctx.restore();

    // Fire Ambient Bloom Gradient over the hazard
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const fireBloom = ctx.createLinearGradient(0, groundY - 25, 0, H);
    fireBloom.addColorStop(0, 'rgba(249, 115, 22, 0)');
    fireBloom.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
    fireBloom.addColorStop(1, 'rgba(253, 224, 71, 0.3)');
    ctx.fillStyle = fireBloom;
    ctx.fillRect(0, groundY - 25, W, GROUND_H + 25);
    ctx.restore();

    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  };

  // ─── HYPER-CUTE 3D CHARACTER (LOAFY) ─────────────────────────────────────
  const drawCuteLoafy = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rot: number,
    squish: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1 / squish, squish); // Apply squash and stretch
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Bouncy organic shape using Beziers instead of roundRect
    const drawLoafPath = (cw: number, ch: number, offset = 0) => {
      const hw = cw / 2;
      const hh = ch / 2;
      ctx.beginPath();
      // Top left curve
      ctx.moveTo(-hw + 8, -hh + offset);
      // Top dome
      ctx.bezierCurveTo(-hw/2, -hh - 12 + offset, hw/2, -hh - 12 + offset, hw - 8, -hh + offset);
      // Top right corner
      ctx.quadraticCurveTo(hw, -hh + offset, hw, -hh + 8 + offset);
      // Right side
      ctx.lineTo(hw, hh - 8 + offset);
      // Bottom right
      ctx.quadraticCurveTo(hw, hh + offset, hw - 8, hh + offset);
      // Bottom
      ctx.lineTo(-hw + 8, hh + offset);
      // Bottom left
      ctx.quadraticCurveTo(-hw, hh + offset, -hw, hh - 8 + offset);
      // Left side
      ctx.lineTo(-hw, -hh + 8 + offset);
      // Top left corner return
      ctx.quadraticCurveTo(-hw, -hh + offset, -hw + 8, -hh + offset);
      ctx.closePath();
    };

    // 1. Drop Shadow
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    drawLoafPath(w, h, 6);
    ctx.fill();
    ctx.restore();

    // 2. 3D Side Crust (Deep Toasted Golden Brown)
    const depth = 8;
    ctx.fillStyle = '#92400e';
    drawLoafPath(w, h, depth);
    ctx.fill();

    // 3. Main Body Base Crust
    const crustGrad = ctx.createLinearGradient(0, -h/2, 0, h/2);
    crustGrad.addColorStop(0, '#f59e0b'); // Golden top
    crustGrad.addColorStop(0.6, '#d97706'); // Warm mid
    crustGrad.addColorStop(1, '#92400e'); // Toasted bottom
    ctx.fillStyle = crustGrad;
    drawLoafPath(w, h);
    ctx.fill();

    // 4. Crust Rim Light (Top edge highlight)
    ctx.save();
    ctx.clip();
    const rimGrad = ctx.createLinearGradient(0, -h/2, 0, -h/4);
    rimGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)'); // Bright yellow highlight
    rimGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(-w/2, -h/2, w, h/4);
    ctx.restore();

    // 5. Front Slice (Soft Creamy Center)
    const innerW = w - 14;
    const innerH = h - 14;
    const innerGrad = ctx.createLinearGradient(0, -innerH/2, 0, innerH/2);
    innerGrad.addColorStop(0, '#fffbeb');
    innerGrad.addColorStop(0.7, '#fef3c7');
    innerGrad.addColorStop(1, '#fde68a');
    ctx.fillStyle = innerGrad;
    drawLoafPath(innerW, innerH, 2); // Slightly shifted down for perspective
    ctx.fill();

    // Inner rim shadow for depth
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 6. Hyper-Kawaii Face
    const faceY = 4;
    
    // Eyes (Dark, glossy)
    ctx.fillStyle = '#1c1917';
    // Left eye
    ctx.beginPath(); ctx.ellipse(-9, faceY, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    // Right eye
    ctx.beginPath(); ctx.ellipse(9, faceY, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();

    // Eye Highlights (Multiple dots for anime gloss)
    ctx.fillStyle = '#ffffff';
    // Left eye highlights
    ctx.beginPath(); ctx.arc(-10.5, faceY - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-7.5, faceY + 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
    // Right eye highlights
    ctx.beginPath(); ctx.arc(7.5, faceY - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10.5, faceY + 1.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Blush / Rosy Cheeks (Soft glowing radial gradients)
    const drawBlush = (bx: number, by: number) => {
      const blushGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
      blushGrad.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
      blushGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = blushGrad;
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    };
    drawBlush(-15, faceY + 4);
    drawBlush(15, faceY + 4);

    // Cute Smile (Slightly open)
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(-3, faceY + 3);
    ctx.quadraticCurveTo(0, faceY + 8, 3, faceY + 3);
    ctx.quadraticCurveTo(0, faceY + 6, -3, faceY + 3);
    ctx.fill();

    // 7. Dark Crisp Outline (For that Illustrated feel)
    ctx.strokeStyle = '#290606';
    ctx.lineWidth = 3.5;
    drawLoafPath(w, h);
    ctx.stroke();

    ctx.restore();
  };

  // ─── HYPER-METALLIC TOASTERS WITH POPPING TOAST ────────────────────────
  const draw3DToasterWithToast = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isTop: boolean,
    heatPulse: number,
    time: number,
    toastOffset: number
  ) => {
    if (h <= 10) return;

    ctx.save();

    // ── 1. The Popping Toast! ──
    const toastW = 42;
    const toastH = 34;
    const toastX = x + (w - toastW) / 2;
    // Animate the toast popping up and down slightly
    const bounce = Math.sin(time * 4 + toastOffset) * 4;
    const toastY = isTop ? y + h - toastH + 10 + bounce : y - toastH + 10 - bounce;

    ctx.save();
    // Clip so toast hides inside toaster body
    ctx.beginPath();
    if (isTop) {
      ctx.rect(x, 0, w, y + h);
    } else {
      ctx.rect(x, y, w, H);
    }
    ctx.clip();

    // Draw Toast Slice
    const tGrad = ctx.createLinearGradient(toastX, toastY, toastX, toastY + toastH);
    tGrad.addColorStop(0, '#fde047');
    tGrad.addColorStop(0.5, '#f59e0b');
    tGrad.addColorStop(1, '#b45309');
    
    // Toast path (rounded top)
    const drawSmallToast = () => {
      ctx.beginPath();
      ctx.moveTo(toastX + 4, toastY + toastH);
      ctx.lineTo(toastX + 4, toastY + 10);
      ctx.quadraticCurveTo(toastX + toastW/2, toastY - 6, toastX + toastW - 4, toastY + 10);
      ctx.lineTo(toastX + toastW - 4, toastY + toastH);
      ctx.closePath();
    }
    
    ctx.fillStyle = tGrad;
    drawSmallToast();
    ctx.fill();

    // Toast Face
    ctx.fillStyle = '#78350f';
    const ty = toastY + 14;
    ctx.beginPath(); ctx.arc(toastX + toastW/2 - 5, ty, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(toastX + toastW/2 + 5, ty, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(toastX + toastW/2, ty + 3, 2.5, 0.2, Math.PI-0.2); ctx.stroke();

    // Toast Outline
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2.5;
    drawSmallToast();
    ctx.stroke();
    ctx.restore();

    // ── 2. Toaster Body (Hyper-Metallic Chrome) ──
    const cornerR = 16;
    
    // Anisotropic Metal Gradient
    const bGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    bGrad.addColorStop(0, '#334155');   // Dark edge shadow
    bGrad.addColorStop(0.15, '#94a3b8'); // Mid tone
    bGrad.addColorStop(0.3, '#ffffff');  // Bright main highlight
    bGrad.addColorStop(0.45, '#cbd5e1'); // Mid tone
    bGrad.addColorStop(0.65, '#f8fafc'); // Secondary highlight
    bGrad.addColorStop(0.85, '#64748b'); // Dark core
    bGrad.addColorStop(1, '#1e293b');    // Deep edge shadow

    // Toaster Base (Dark plastic)
    const baseH = 20;
    const baseY = isTop ? y : y + h - baseH;
    
    // Drop Shadow
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(x, isTop ? y : y, w, h, isTop ? [0,0,cornerR,cornerR] : [cornerR,cornerR,0,0]);
    ctx.fill();
    ctx.restore();

    // Draw Main Chrome Body
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    if (isTop) {
      ctx.roundRect(x, y, w, h - baseH, [0, 0, 0, 0]);
    } else {
      ctx.roundRect(x, y + baseH, w, h - baseH, [cornerR, cornerR, 0, 0]);
    }
    ctx.fill();

    // Lava Heat Reflection on Bottom Toaster Base (Blending with liquid fire)
    if (!isTop) {
      const lavaReflect = ctx.createLinearGradient(0, y + h - 50, 0, y + h);
      lavaReflect.addColorStop(0, 'rgba(249, 115, 22, 0)');
      lavaReflect.addColorStop(0.5, 'rgba(249, 115, 22, 0.45)');
      lavaReflect.addColorStop(1, 'rgba(185, 28, 28, 0.85)');
      ctx.fillStyle = lavaReflect;
      ctx.beginPath();
      ctx.roundRect(x, y + baseH, w, h - baseH, [cornerR, cornerR, 0, 0]);
      ctx.fill();
    }

    // Draw Dark Plastic Base
    const baseGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    baseGrad.addColorStop(0, '#0f172a');
    baseGrad.addColorStop(0.3, '#334155');
    baseGrad.addColorStop(0.7, '#1e293b');
    baseGrad.addColorStop(1, '#020617');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    if (isTop) {
      ctx.roundRect(x, baseY, w, baseH, [0, 0, cornerR, cornerR]);
    } else {
      ctx.roundRect(x, y, w, baseH, [0, 0, 0, 0]);
    }
    ctx.fill();

    // ── 3. Glowing Heating Slots (Red Hot!) ──
    const slotW = w - 28;
    const slotH = 14;
    const slotX = x + 14;
    const slotY = isTop ? y + h - baseH - slotH - 8 : y + baseH + 8;

    // Slot cavity (black)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(slotX, slotY, slotW, slotH, [3]);
    ctx.fill();

    // Coils inside cavity
    const heatAlpha = 0.7 + Math.sin(time * 5 + heatPulse) * 0.3;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ea580c';
    ctx.globalAlpha = heatAlpha;
    // Core white-hot heat
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;

    for (let c = 0; c < 4; c++) {
      const cx = slotX + 4 + c * 13;
      ctx.fillRect(cx, slotY + 2, 7, slotH - 4);
      
      // Core bright line
      ctx.beginPath();
      ctx.moveTo(cx + 3.5, slotY + 3);
      ctx.lineTo(cx + 3.5, slotY + slotH - 3);
      ctx.stroke();
    }
    ctx.restore();

    // ── 4. Side Handle Lever (Plunged down) ──
    const leverY = isTop ? y + h - baseH - 40 : y + baseH + 20;
    
    // Slot for lever
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(x + w - 4, leverY - 15, 6, 35, [3]);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lever Handle
    ctx.fillStyle = '#1e293b'; // Dark plastic handle
    ctx.beginPath();
    ctx.roundRect(x + w - 8, leverY, 16, 12, [3]);
    ctx.fill();
    // Handle highlight
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + w - 6, leverY + 2, 12, 3);
    
    // Handle outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Crisp Outer Inking ──
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (isTop) {
      ctx.roundRect(x, y, w, h, [0, 0, cornerR, cornerR]);
    } else {
      ctx.roundRect(x, y, w, h, [cornerR, cornerR, 0, 0]);
    }
    ctx.stroke();

    ctx.restore();
  };

  // 4. Score HUD (Clean & Bold)
  const drawHUD = (ctx: CanvasRenderingContext2D, currentScore: number) => {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'right';
    ctx.font = '900 36px "Arial Black", sans-serif'; 
    
    const textX = W - 20;
    const textY = 76;
    
    // Deep black outline for extreme contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(`${currentScore}`, textX, textY);
    
    // Golden fill
    ctx.fillStyle = '#facc15';
    ctx.fillText(`${currentScore}`, textX, textY);
    
    // "BEST" subtext
    ctx.font = '900 14px "Arial Black", sans-serif';
    const bestStr = `BEST: ${bestScore}`;
    ctx.lineWidth = 4;
    ctx.strokeText(bestStr, textX, textY + 18);
    
    // Measure score width to place "BEST: " correctly
    const scoreMetrics = ctx.measureText(`${bestScore}`);
    
    ctx.fillStyle = '#facc15';
    ctx.fillText(`${bestScore}`, textX, textY + 18);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`BEST:`, textX - scoreMetrics.width - 4, textY + 18);

    ctx.restore();
  };

  // ─── MAIN GAME ENGINE LOOP ───────────────────────────────────────────────
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const rawDt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      // Clamp dt: cap at 1/30s so tab-switch/freeze doesn't cause huge jumps.
      // Normalize to 60fps: scale=1 at 60fps, scale<1 at higher fps, scale>1 at lower fps.
      const dt = Math.min(rawDt, 1 / 30);
      const scale = dt * 60; // multiply physics values by this to be frame-rate independent
      timeRef.current += dt;
      const time = timeRef.current;

      const engine = engineRef.current;

      // Screen Shake
      let shakeX = 0;
      let shakeY = 0;
      if (shakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * shakeRef.current;
        shakeY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      // Continuous ambient lava embers rising from the fire floor across all game states (preview, gameplay, pause)
      if (Math.random() < 0.25 * scale) {
        addParticles(Math.random() * W, H - GROUND_H + 5, 1, 'ember');
      }

      if (engine.state === 'START') {
        // Lock background scroll to 0 for a fixed, flawless composition preview
        engine.bgScroll = 0;
        
        // Gentle, cute idle floating for Loafy
        engine.bird.x = 85;
        engine.bird.y = 220 + Math.sin(time * 3.5) * 6;
        engine.bird.rot = Math.sin(time * 2.5) * 0.05;
        engine.bird.squish = 1 + Math.sin(time * 4) * 0.03;

        // Perfect showcase toaster positioned on the right
        engine.toasters = [
          {
            x: 270,
            w: 80,
            topH: 135,
            botH: 113,
            speed: 0,
            passed: false,
            heatPulse: time * 2,
            toastOffset: 4,
          }
        ];
      }

      if (engine.state === 'PLAYING') {
        engine.bgScroll += 1.8 * scale; // Slightly faster scroll for more energy

        // Bird Physics (all scaled by dt so speed is identical on all devices)
        engine.bird.vel += GRAVITY * scale;
        engine.bird.y += engine.bird.vel * scale;
        // Drag: equivalent per-second decay independent of framerate
        engine.bird.vel *= Math.pow(0.95, scale);
        // Dynamic rotation based on velocity
        engine.bird.rot = Math.min(Math.PI / 4, Math.max(-Math.PI / 5, engine.bird.vel * 0.08));
        
        // Recover squish factor towards 1 (frame-rate independent lerp)
        engine.bird.squish += (1 - engine.bird.squish) * (1 - Math.pow(0.85, scale));

        // Leave a trail of golden particles while moving up
        if (engine.bird.vel < -1 && Math.random() < 0.4 * scale) {
          addParticles(engine.bird.x - 20, engine.bird.y + 10, 1, 'crumb');
        }

        // Toaster Obstacles Logic
        for (const t of engine.toasters) {
          t.x -= t.speed * scale;
          t.heatPulse += 0.1 * scale;

          // Check Score
          if (!t.passed && engine.bird.x > t.x + t.w / 2) {
            t.passed = true;
            engine.score++;
            setScore(engine.score);
            playSound('score');

            // Burst score sparks
            addParticles(t.x + t.w / 2, engine.bird.y, 15, 'spark');

            if (engine.score % 5 === 0) {
              for (const obstacle of engine.toasters) {
                obstacle.speed = Math.min(obstacle.speed + 0.15, 3.8); // Ramp up speed
              }
            }
          }
        }

        // Remove offscreen toasters
        if (engine.toasters.length > 0 && engine.toasters[0].x < -150) {
          engine.toasters.shift();
        }

        // Spawn new toasters periodically (use time-based accumulator instead of frame count)
        engine.frameCount += scale;
        if (engine.frameCount >= 140) {
          engine.toasters.push(createToaster());
          engine.frameCount = 0;
        }

        // Collision Detection
        let crashed = false;
        const groundY = H - GROUND_H;

        // Ground / Ceiling Hit
        if (engine.bird.y + engine.bird.h / 2 >= groundY - 5) {
          engine.bird.y = groundY - 5 - engine.bird.h / 2;
          crashed = true;
        }
        if (engine.bird.y - engine.bird.h / 2 <= 0) {
          engine.bird.y = engine.bird.h / 2;
          crashed = true;
        }

        // Toaster Collision (using a slightly tighter hitbox for fairness)
        const hitPadding = 8;
        const bx1 = engine.bird.x - engine.bird.w / 2 + hitPadding;
        const bx2 = engine.bird.x + engine.bird.w / 2 - hitPadding;
        const by1 = engine.bird.y - engine.bird.h / 2 + hitPadding;
        const by2 = engine.bird.y + engine.bird.h / 2 - hitPadding;

        for (const t of engine.toasters) {
          if (bx2 >= t.x && bx1 <= t.x + t.w) {
            if (by1 < t.topH) crashed = true;
            if (by2 > H - GROUND_H - t.botH) crashed = true;
          }
        }

        if (crashed) {
          engine.state = 'GAMEOVER';
          shakeRef.current = 25; // Massive shake!
          playSound('hit');
          // Massive explosion of bread and sparks
          addParticles(engine.bird.x, engine.bird.y, 40, 'crumb');
          addParticles(engine.bird.x, engine.bird.y, 20, 'spark');
          addParticles(engine.bird.x, engine.bird.y, 10, 'smoke');
          setGameState('GAMEOVER');

          if (engine.score > bestScore) {
            setBestScore(engine.score);
            setIsNewHigh(true);
            playSound('highscore');
            localStorage.setItem('flappy_bread_hs_v8', String(engine.score));
          }
        }
      }

      // Render Scene to Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear with base color
          ctx.fillStyle = '#1a0505';
          ctx.fillRect(0, 0, W, H);
          
          ctx.save();
          ctx.translate(shakeX, shakeY);

          // 1. Draw Bread Factory / Lava Oven World (Sky, Towers, Beams, Neon Signs)
          drawBreadFactoryEnvironment(ctx, engine.bgScroll, time);

          // 2. Draw 3D Chrome Toasters (Bottom toaster extends +25px down into lava)
          for (const t of engine.toasters) {
            draw3DToasterWithToast(ctx, t.x, 0, t.w, t.topH, true, t.heatPulse, time, t.toastOffset);
            draw3DToasterWithToast(ctx, t.x, H - GROUND_H - t.botH, t.w, t.botH + 25, false, t.heatPulse, time, t.toastOffset);
          }

          // 3. Draw Lava Hazard Floor (Lava waves lap ON TOP of the toaster submerged bases!)
          drawLavaHazard(ctx, time);

          // 3. Update & Draw Particles
          const particles = particlesRef.current;
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * scale;
            p.y += p.vy * scale;
            p.rot += p.vRot * scale;
            p.life += scale;
            p.alpha = Math.max(0, 1 - p.life / p.maxLife);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = p.alpha;
            
            if (p.shape === 'smoke') {
               ctx.globalCompositeOperation = 'screen';
            }

            ctx.fillStyle = p.color;

            if (p.shape === 'crumb') {
              // Draw chunky 3D crumbs (mini squares with depth)
              ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
              ctx.fillStyle = '#92400e'; // Shadow side
              ctx.fillRect(-p.size/2 + 1, -p.size/2 + 1, p.size, p.size);
            } else if (p.shape === 'spark') {
              ctx.globalCompositeOperation = 'screen';
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.ellipse(0, 0, p.size * 2, p.size / 2, 0, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            if (p.life >= p.maxLife) {
              particles.splice(i, 1);
            }
          }

          // 4. Draw Cute Volumetric Loafy
          if (engine.state !== 'GAMEOVER') {
             drawCuteLoafy(
               ctx,
               engine.bird.x,
               engine.bird.y,
               engine.bird.w,
               engine.bird.h,
               engine.bird.rot,
               engine.bird.squish
             );
          }

          // 5. HUD
          if (engine.state === 'PLAYING') {
            drawHUD(ctx, engine.score);
          }

          // 6. Post-Process Noise Overlay (Texture)
          if (noiseCanvasRef.current) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.3; // Very subtle grit
            ctx.drawImage(noiseCanvasRef.current, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [bestScore]);

  // Global Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        if (engineRef.current.state === 'GAMEOVER') {
          resetGame();
        } else if (engineRef.current.state === 'START') {
          startGame();
        } else {
          jump();
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center items-center py-1 sm:py-2">
      <Card accent="coral" className="p-0 flex flex-col items-center select-none overflow-hidden relative bg-[#0f0404] w-fit max-w-[420px] max-h-[calc(100vh-140px)] border-2 border-red-900/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] shrink-0 mx-auto transition-all duration-300">
      {/* ── Top Header Bar ── */}
      <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 z-10 pointer-events-none">
        <div></div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleMute}
            className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/70 transition-transform active:scale-95 shadow-lg"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={18} className="text-white/50" /> : <Volume2 size={18} className="text-amber-400" />}
          </button>

          {gameState === 'PLAYING' && (
            <button
              onClick={togglePause}
              className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/70 transition-transform active:scale-95 shadow-lg"
              title="Pause Game"
            >
              <Pause size={18} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── Game Canvas Wrapper ── */}
      <div className="relative w-full flex justify-center items-center overflow-hidden shadow-2xl bg-[#0f0404] py-1">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={jump}
          onTouchStart={(e) => {
            e.preventDefault();
            jump();
          }}
          className="cursor-pointer block h-[clamp(280px,56vh,440px)] w-auto aspect-[434/483] max-w-full object-contain mx-auto transition-all duration-300 drop-shadow-xl"
          style={{ 
             filter: 'contrast(1.05) saturate(1.1)', // Enhance colors slightly via CSS
          }}
        />

        {/* ── Overlay: START SCREEN ── */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center text-white pointer-events-auto transition-all duration-300">
            {/* SVG Logo (Centered in the middle of preview, 100% exact replica) */}
            <div className="relative mb-3 sm:mb-4 select-none">
              <svg viewBox="0 0 400 210" className="w-full max-w-[260px] sm:max-w-[300px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)] select-none overflow-visible">
                <defs>
                  <linearGradient id="breadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff350" />
                    <stop offset="35%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>

                  <linearGradient id="flappyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#ffedd5" />
                  </linearGradient>

                  <radialGradient id="sparkleFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </radialGradient>

                  <filter id="sparkleGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <g id="sparkle" filter="url(#sparkleGlow)">
                    <path d="M10,0 Q10,10 20,10 Q10,10 10,20 Q10,10 0,10 Q10,10 10,0 Z" fill="url(#sparkleFill)" />
                  </g>
                </defs>

                <style>
                  {`
                    @import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');
                    .titan-font { font-family: 'Titan One', cursive; }
                  `}
                </style>

                <g transform="rotate(-3 200 100)">
                  {/* Two Glowing Sparkles */}
                  <use href="#sparkle" x="52" y="28" transform="scale(0.85)" />
                  <use href="#sparkle" x="28" y="98" transform="scale(0.75)" />

                  {/* 1. FLAPPY (White text) */}
                  <text x="175" y="68" textAnchor="middle" className="titan-font" fontSize="54" fill="#3a0407" stroke="#3a0407" strokeWidth="14" strokeLinejoin="round" dx="0" dy="6">FLAPPY</text>
                  <text x="175" y="68" textAnchor="middle" className="titan-font" fontSize="54" fill="#3a0407" stroke="#3a0407" strokeWidth="12" strokeLinejoin="round">FLAPPY</text>
                  <text x="175" y="68" textAnchor="middle" className="titan-font" fontSize="54" fill="url(#flappyGrad)">FLAPPY</text>

                  {/* 2. BREAD (Gold Gradient text) */}
                  <text x="200" y="142" textAnchor="middle" className="titan-font" fontSize="88" fill="#3a0407" stroke="#3a0407" strokeWidth="18" strokeLinejoin="round" letterSpacing="1" dx="0" dy="8">BREAD</text>
                  <text x="200" y="142" textAnchor="middle" className="titan-font" fontSize="88" fill="#3a0407" stroke="#3a0407" strokeWidth="16" strokeLinejoin="round" letterSpacing="1">BREAD</text>
                  <text x="200" y="142" textAnchor="middle" className="titan-font" fontSize="88" fill="url(#breadGrad)" letterSpacing="1">BREAD</text>

                  {/* 3. Cute Bread Character Icon (Top Right of FLAPPY) */}
                  <g transform="translate(295, 12) rotate(16) scale(1.15)">
                    {/* Shadow */}
                    <path d="M5,10 C5,2 15,0 25,0 C35,0 45,2 45,10 C48,15 48,35 45,40 C45,44 35,45 25,45 C15,45 5,44 5,40 C2,35 2,15 5,10 Z" fill="#3a0407" />
                    {/* Crust */}
                    <path d="M5,8 C5,0 15,-2 25,-2 C35,-2 45,0 45,8 C48,13 48,33 45,38 C45,42 35,43 25,43 C15,43 5,42 5,38 C2,33 2,13 5,8 Z" fill="#b76e28" stroke="#3a0407" strokeWidth="3" />
                    {/* Crumb */}
                    <path d="M8,10 C8,4 16,3 25,3 C34,3 42,4 42,10 C44,14 44,30 42,34 C42,37 34,38 25,38 C16,38 8,37 8,34 C6,30 6,14 8,10 Z" fill="#ffe0b2" />
                    {/* Face */}
                    <circle cx="18" cy="20" r="2.5" fill="#3a0407" />
                    <circle cx="32" cy="20" r="2.5" fill="#3a0407" />
                    <path d="M22,25 Q25,29 28,25" fill="none" stroke="#3a0407" strokeWidth="2.5" strokeLinecap="round" />
                  </g>

                  {/* 4. Subtitle: - FLY. TOAST. FLEX. - */}
                  <text x="200" y="178" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="13" fill="#ffffff" letterSpacing="3" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.9))">
                    - FLY. TOAST. FLEX. -
                  </text>
                </g>
              </svg>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              className="group relative px-8 py-3 bg-gradient-to-b from-amber-400 to-amber-600 text-black font-black uppercase text-sm rounded-xl border-2 border-amber-900 shadow-[0_6px_0_#78350f,0_15px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_0_#78350f,0_10px_15px_rgba(0,0,0,0.5)] hover:translate-y-[2px] active:shadow-[0_0px_0_#78350f] active:translate-y-[6px] cursor-pointer transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500"></div>
              <span className="flex items-center gap-2 relative z-10">
                <Play size={18} fill="currentColor" /> Tap to Start
              </span>
            </button>
          </div>
        )}

        {/* ── Overlay: PAUSED SCREEN ── */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white pointer-events-auto">
            <h2 className="font-black text-3xl tracking-widest text-white drop-shadow-[0_2px_4px_#000] mb-8">
              PAUSED
            </h2>

            <div className="flex gap-4">
              <button
                onClick={togglePause}
                className="flex items-center justify-center w-14 h-14 bg-amber-500 text-black rounded-full border-2 border-amber-900 shadow-[0_4px_0_#78350f] hover:translate-y-[2px] hover:shadow-[0_2px_0_#78350f] active:translate-y-[4px] active:shadow-none transition-all"
              >
                <Play size={24} fill="currentColor" className="ml-1" />
              </button>
              <button
                onClick={resetGame}
                className="flex items-center justify-center w-14 h-14 bg-slate-700 text-white rounded-full border-2 border-slate-900 shadow-[0_4px_0_#0f172a] hover:translate-y-[2px] hover:shadow-[0_2px_0_#0f172a] active:translate-y-[4px] active:shadow-none transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ── Overlay: GAMEOVER SCREEN ── */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white pointer-events-auto animate-in fade-in zoom-in duration-300">
            {/* TOASTED! Vector Title (Matches FLAPPY title style 1:1) */}
            <div className="relative mb-4 select-none">
              <svg viewBox="0 0 320 80" className="w-64 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] overflow-visible">
                <defs>
                  <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#ffedd5" />
                  </linearGradient>
                </defs>
                <style>
                  {`
                    @import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');
                    .titan-font { font-family: 'Titan One', cursive; }
                  `}
                </style>
                <g transform="rotate(-2 160 40)">
                  {/* Extrude Shadow */}
                  <text x="160" y="55" textAnchor="middle" className="titan-font" fontSize="58" fill="#3a0407" stroke="#3a0407" strokeWidth="14" strokeLinejoin="round" dx="0" dy="6">TOASTED!</text>
                  <text x="160" y="55" textAnchor="middle" className="titan-font" fontSize="58" fill="#3a0407" stroke="#3a0407" strokeWidth="12" strokeLinejoin="round">TOASTED!</text>
                  {/* Foreground */}
                  <text x="160" y="55" textAnchor="middle" className="titan-font" fontSize="58" fill="url(#whiteGrad)">TOASTED!</text>
                </g>
              </svg>
            </div>

            {/* High Score Celebration Banner */}
            {isNewHigh && (
              <div className="mb-4 animate-bounce">
                <div className="bg-gradient-to-r from-[#3b0e40] to-[#73194a] px-6 py-2 rounded-full border-2 border-[#f43f5e] shadow-[0_0_20px_rgba(244,63,94,0.6)] flex items-center gap-2">
                  <Sparkles size={20} className="text-pink-300 animate-pulse" />
                  <span className="font-black text-pink-100 tracking-widest uppercase text-sm drop-shadow-md">
                    NEW HIGH SCORE!
                  </span>
                  <Sparkles size={20} className="text-pink-300 animate-pulse" />
                </div>
              </div>
            )}

            {/* Glassmorphic Oven Score Card */}
            <div className="w-72 bg-black/60 backdrop-blur-md border-2 border-amber-900/40 rounded-2xl p-5 mb-6 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
                <span className="text-xs font-black text-amber-500/80 uppercase tracking-widest font-mono">Current Score</span>
                <span className="font-bubbly text-4xl text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{score}</span>
              </div>
              
              <div className="flex justify-between items-center relative">
                <span className="text-xs font-black text-amber-500/80 uppercase tracking-widest font-mono">Best Score</span>
                <span className="font-bubbly text-3xl text-white flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <Trophy size={20} className="text-amber-400" />
                  {bestScore}
                </span>
              </div>
            </div>

            {/* Identical Amber 3D Play Again Button */}
            <button
              onClick={resetGame}
              className="group relative px-8 py-3 bg-gradient-to-b from-amber-400 to-amber-600 text-black font-black uppercase text-sm rounded-xl border-2 border-amber-900 shadow-[0_6px_0_#78350f,0_15px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_0_#78350f,0_10px_15px_rgba(0,0,0,0.5)] hover:translate-y-[2px] active:shadow-[0_0px_0_#78350f] active:translate-y-[6px] cursor-pointer transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500"></div>
              <span className="flex items-center gap-2 relative z-10">
                <RotateCcw size={18} strokeWidth={2.5} /> Play Again
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="w-full bg-[#0a0202] py-3 text-center text-xs font-mono text-slate-500 border-t border-red-900/30">
        <span className="px-2 py-1 bg-white/5 rounded border border-white/10 text-white/80 font-bold mx-1">Space</span> 
        or <span className="px-2 py-1 bg-white/5 rounded border border-white/10 text-white/80 font-bold mx-1">Tap</span> to fly • <span className="px-2 py-1 bg-white/5 rounded border border-white/10 text-white/80 font-bold mx-1">Esc</span> to pause
      </div>
    </Card>
    </div>
  );
}
