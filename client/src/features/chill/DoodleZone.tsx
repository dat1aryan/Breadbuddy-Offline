import { useRef, useState, useEffect, useCallback } from "react";
import {
  Eraser, Download, Trash2, RotateCcw, RotateCw,
  Minus, Plus, Pipette, PaintBucket, Type,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  PenTool, Highlighter, Sparkles, Feather, Wind, Star, Gamepad2, Palette, Disc,
} from "lucide-react";

/* ── Brush types ────────────────────────────────────────────── */
type BrushId =
  | "pen" | "marker" | "neon" | "ink"
  | "spray" | "glitter" | "pixel" | "chalk" | "rainbow"
  | "eraser";

const BRUSHES = [
  { id: "pen"     as BrushId, label: "Pen",     icon: PenTool,     desc: "Smooth ballpoint" },
  { id: "marker"  as BrushId, label: "Marker",  icon: Highlighter, desc: "Thick & bold" },
  { id: "neon"    as BrushId, label: "Neon",    icon: Sparkles,    desc: "Glowing vibe" },
  { id: "ink"     as BrushId, label: "Ink",     icon: Feather,     desc: "Calligraphy ink" },
  { id: "spray"   as BrushId, label: "Spray",   icon: Wind,        desc: "Spray-paint scatter" },
  { id: "glitter" as BrushId, label: "Glitter", icon: Star,        desc: "Sparkle effect" },
  { id: "pixel"   as BrushId, label: "Pixel",   icon: Gamepad2,    desc: "8-bit squares" },
  { id: "chalk"   as BrushId, label: "Chalk",   icon: Palette,     desc: "Soft chalk texture" },
  { id: "rainbow" as BrushId, label: "Rainbow", icon: Disc,        desc: "Hue-shifting trail" },
];

/* ── Text Object types ──────────────────────────────────────── */
interface TextObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
}

type TextMode = "idle" | "drawing" | "editing" | "transforming";
type HandleId = "tl" | "tm" | "tr" | "ml" | "mr" | "bl" | "bm" | "br" | "rot";

const DEG2RAD = Math.PI / 180;

function rotateVec(x: number, y: number, angleDeg: number) {
  const a = angleDeg * DEG2RAD;
  const cos = Math.cos(a); const sin = Math.sin(a);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function buildFont(obj: TextObject): string {
  const style = `${obj.italic ? "italic " : ""}${obj.bold ? "bold " : ""}`;
  return `${style}${obj.fontSize}px ${obj.fontFamily}`;
}

/* ── Color palette ──────────────────────────────────────────── */
const ROW_1 = [
  "#000000", "#7F7F7F", "#880015", "#ED1C24", "#FF7F27",
  "#FFF200", "#22B14C", "#00A2E8", "#3F48CC", "#A349A4"
];
const ROW_2 = [
  "#FFFFFF", "#C3C3C3", "#B97A57", "#FFAEC9", "#FFC90E",
  "#EFE4B0", "#B5E61D", "#99D9EA", "#7092BE", "#C8BFE7"
];

let _hue = 0;
function nextRainbow() { _hue = (_hue + 3) % 360; return `hsl(${_hue},100%,60%)`; }
function getCanvasBg() { return "#FFFFFF"; }

/* ── Component ─────────────────────────────────────────────── */
export function DoodleZone() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Drawing states ── */
  const [brush, setBrush]           = useState<BrushId>("pen");
  const [color, setColor]           = useState("#000000");
  const [size, setSize]             = useState(6);
  const [drawing, setDrawing]       = useState(false);
  const [history, setHistory]       = useState<ImageData[]>([]);
  const [future, setFuture]         = useState<ImageData[]>([]);
  const [eyedropper, setEyedropper] = useState(false);
  const [isFill, setIsFill]         = useState(false);
  const [isText, setIsText]         = useState(false);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [cursorPt, setCursorPt]     = useState<{ x: number; y: number } | null>(null);
  const prevBrushRef                = useRef<BrushId>("pen");

  /* ── Text object states ── */
  const [textObjects, setTextObjects]   = useState<TextObject[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textMode, setTextMode]         = useState<TextMode>("idle");
  const [textDragRect, setTextDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  /* ── Text transform drag refs ── */
  const textDragStartRef     = useRef<{ x: number; y: number } | null>(null);
  const activeHandleRef      = useRef<HandleId | "move" | null>(null);
  const dragSnapRef          = useRef<TextObject | null>(null);
  const textOverlayRef       = useRef<HTMLDivElement>(null);
  const clipboardTextRef     = useRef<TextObject | null>(null);

  /* ── Drawing refs ── */
  const lastPt   = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(color);
  const brushRef = useRef(brush);
  const sizeRef  = useRef(size);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushRef.current = brush; }, [brush]);
  useEffect(() => { sizeRef.current  = size;  }, [size]);

  /* ── Canvas helpers ── */
  function fillBg(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, c.width, c.height);
  }

  function addCustomColor(c: string) {
    setColor(c);
    setCustomColors(prev => {
      if (prev.includes(c)) return prev;
      if (prev.length < 10) return [...prev, c];
      return [...prev.slice(1), c];
    });
  }

  /* ── Canvas init & responsive resize ── */
  const initialised = useRef(false);
  useEffect(() => {
    const cv = canvasRef.current;
    const ct = containerRef.current;
    if (!cv || !ct) return;
    const resize = () => {
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const newWidth  = ct.clientWidth;
      const newHeight = ct.clientHeight;
      if (!initialised.current) {
        cv.width = newWidth; cv.height = newHeight;
        fillBg(ctx, cv);
        initialised.current = true;
        return;
      }
      const tmp = document.createElement("canvas");
      tmp.width = cv.width; tmp.height = cv.height;
      tmp.getContext("2d")?.drawImage(cv, 0, 0);
      cv.width = newWidth; cv.height = newHeight;
      fillBg(ctx, cv);
      ctx.drawImage(tmp, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(ct);
    return () => ro.disconnect();
  }, []);

  /* ── Snapshot helpers ── */
  function saveSnapshot() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    setHistory(p => [...p.slice(-30), ctx.getImageData(0, 0, c.width, c.height)]);
    setFuture([]);
  }
  function undo() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx || !history.length) return;
    const last = history[history.length - 1];
    setFuture(p => [ctx.getImageData(0, 0, c.width, c.height), ...p.slice(0, 29)]);
    setHistory(p => p.slice(0, -1));
    ctx.putImageData(last, 0, 0);
  }
  function redo() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx || !future.length) return;
    const next = future[0];
    setHistory(p => [...p, ctx.getImageData(0, 0, c.width, c.height)]);
    setFuture(p => p.slice(1));
    ctx.putImageData(next, 0, 0);
  }
  function clearCanvas() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    saveSnapshot();
    fillBg(ctx, c);
  }
  function saveDrawing() {
    // Bake any remaining text objects first
    bakeAllTextObjects();
    setTimeout(() => {
      const c = canvasRef.current; if (!c) return;
      const a = document.createElement("a");
      a.download = `breadbuddy-doodle-${Date.now()}.png`;
      a.href = c.toDataURL("image/png", 1);
      a.click();
    }, 50);
  }

  /* ── Text baking ── */
  function bakeTextObject(ctx: CanvasRenderingContext2D, obj: TextObject) {
    if (!obj.text.trim()) return;
    ctx.save();
    // Rotate around center
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation * DEG2RAD);
    ctx.translate(-obj.width / 2, -obj.height / 2);

    ctx.fillStyle   = obj.color;
    ctx.font        = buildFont(obj);
    ctx.textBaseline = "top";
    ctx.textAlign   = obj.align;
    ctx.letterSpacing = `${obj.letterSpacing}px`;

    const textX = obj.align === "center" ? obj.width / 2 : obj.align === "right" ? obj.width - 8 : 8;
    const lineH = obj.fontSize * obj.lineHeight;
    const lines = obj.text.split("\n");

    lines.forEach((line, idx) => {
      const y = 8 + idx * lineH;
      if (obj.underline) {
        const metrics = ctx.measureText(line);
        const lw = metrics.width;
        const lx = obj.align === "center"
          ? obj.width / 2 - lw / 2
          : obj.align === "right"
          ? obj.width - 8 - lw
          : 8;
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = Math.max(1, obj.fontSize / 14);
        ctx.beginPath();
        ctx.moveTo(lx, y + obj.fontSize + 2);
        ctx.lineTo(lx + lw, y + obj.fontSize + 2);
        ctx.stroke();
      }
      ctx.fillText(line, textX, y);
    });
    ctx.restore();
  }

  function bakeAllTextObjects(objs?: TextObject[]) {
    const tooBake = objs ?? textObjects;
    if (!tooBake.length) return;
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    saveSnapshot();
    tooBake.forEach(obj => bakeTextObject(ctx, obj));
    setTextObjects([]);
    setSelectedTextId(null);
    setTextMode("idle");
  }

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }

      // Text object shortcuts (only when text tool active and not typing in textarea)
      if (!isText) return;
      if (document.activeElement?.tagName === "TEXTAREA") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedTextId) {
        e.preventDefault();
        setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
        setSelectedTextId(null);
        setTextMode("idle");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedTextId) {
        e.preventDefault();
        const obj = textObjects.find(o => o.id === selectedTextId);
        if (obj) clipboardTextRef.current = obj;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardTextRef.current) {
        e.preventDefault();
        const src = clipboardTextRef.current;
        const newObj: TextObject = { ...src, id: crypto.randomUUID(), x: src.x + 20, y: src.y + 20 };
        setTextObjects(prev => [...prev, newObj]);
        setSelectedTextId(newObj.id);
        setTextMode("transforming");
      }
      if (e.key === "Escape") {
        if (textMode === "editing") setTextMode("transforming");
        else { setSelectedTextId(null); setTextMode("idle"); }
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [history, future, isText, selectedTextId, textObjects, textMode]);

  /* ── Flood fill ── */
  function floodFill(ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColorHex: string) {
    const cv = ctx.canvas; const w = cv.width; const h = cv.height;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let fillR = 0, fillG = 0, fillB = 0;
    if (fillColorHex.startsWith("#")) {
      const hex = fillColorHex.replace("#", "");
      if (hex.length === 3) {
        fillR = parseInt(hex[0]+hex[0],16); fillG = parseInt(hex[1]+hex[1],16); fillB = parseInt(hex[2]+hex[2],16);
      } else if (hex.length === 6) {
        fillR = parseInt(hex.substring(0,2),16); fillG = parseInt(hex.substring(2,4),16); fillB = parseInt(hex.substring(4,6),16);
      }
    }
    const sp = (startY*w+startX)*4;
    const tR=data[sp], tG=data[sp+1], tB=data[sp+2], tA=data[sp+3];
    if (tR===fillR && tG===fillG && tB===fillB && tA===255) return;
    const match = (pos: number) =>
      Math.abs(data[pos]-tR)<32 && Math.abs(data[pos+1]-tG)<32 &&
      Math.abs(data[pos+2]-tB)<32 && Math.abs(data[pos+3]-tA)<32;
    const stack: [number,number][] = [[startX,startY]];
    while (stack.length) {
      const [x,y] = stack.pop()!;
      if (!match((y*w+x)*4)) continue;
      let lx=x; while(lx>0 && match((y*w+(lx-1))*4)) lx--;
      let rx=x; while(rx<w-1 && match((y*w+(rx+1))*4)) rx++;
      for (let i=lx;i<=rx;i++) {
        const p=(y*w+i)*4; data[p]=fillR; data[p+1]=fillG; data[p+2]=fillB; data[p+3]=255;
        if (y>0 && match(((y-1)*w+i)*4)) stack.push([i,y-1]);
        if (y<h-1 && match(((y+1)*w+i)*4)) stack.push([i,y+1]);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ── Drawing engine ── */
  function applyStroke(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number }, to: { x: number; y: number },
    b: BrushId, col: string, sz: number
  ) {
    ctx.save();
    if (b === "eraser") {
      ctx.fillStyle = getCanvasBg(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      const erSize = Math.max(10, sz*4);
      const dist = Math.hypot(to.x-from.x, to.y-from.y);
      const steps = Math.max(1, Math.ceil(dist/(erSize/4)));
      for (let i=0;i<=steps;i++) {
        const t=i/steps;
        ctx.fillRect(Math.floor(from.x+(to.x-from.x)*t-erSize/2), Math.floor(from.y+(to.y-from.y)*t-erSize/2), erSize, erSize);
      }
      ctx.restore(); return;
    }
    ctx.globalCompositeOperation = "source-over";
    switch (b) {
      case "pen":
        ctx.strokeStyle=col; ctx.lineWidth=sz; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.globalAlpha=1; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke(); break;
      case "marker":
        ctx.strokeStyle=col; ctx.lineWidth=sz*2.5; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.globalAlpha=1; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke(); break;
      case "neon":
        ctx.strokeStyle=col; ctx.lineWidth=sz*1.5; ctx.lineCap="round"; ctx.lineJoin="round";
        ctx.shadowBlur=14; ctx.shadowColor=col; ctx.globalAlpha=1;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke(); break;
      case "ink": {
        const angle=Math.PI/4; const dx=Math.cos(angle)*(sz*0.9); const dy=Math.sin(angle)*(sz*0.9);
        ctx.fillStyle=col; ctx.globalAlpha=1; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(from.x-dx,from.y-dy); ctx.lineTo(from.x+dx,from.y+dy);
        ctx.lineTo(to.x+dx,to.y+dy); ctx.lineTo(to.x-dx,to.y-dy); ctx.closePath(); ctx.fill(); break;
      }
      case "spray": {
        const dist=Math.hypot(to.x-from.x,to.y-from.y); const dc=Math.max(1,Math.round(dist*0.8));
        ctx.fillStyle=col; ctx.globalAlpha=0.5; ctx.shadowBlur=0;
        for(let i=0;i<dc;i++){const a=Math.random()*Math.PI*2,r=Math.random()*sz*1.5;ctx.beginPath();ctx.arc(to.x+Math.cos(a)*r,to.y+Math.sin(a)*r,Math.max(1,sz*0.2),0,Math.PI*2);ctx.fill();} break;
      }
      case "glitter": {
        const dist=Math.hypot(to.x-from.x,to.y-from.y); const dc=Math.max(1,Math.round(dist*0.6));
        ctx.shadowBlur=0;
        for(let i=0;i<dc;i++){ctx.fillStyle=`hsl(${Math.random()*360},100%,65%)`;ctx.globalAlpha=0.9;ctx.beginPath();ctx.arc(to.x+(Math.random()-0.5)*sz*3,to.y+(Math.random()-0.5)*sz*3,Math.max(1,sz*0.25),0,Math.PI*2);ctx.fill();} break;
      }
      case "pixel": {
        const ps=Math.max(4,sz*2); ctx.fillStyle=col; ctx.globalAlpha=1; ctx.shadowBlur=0;
        ctx.fillRect(Math.floor(to.x/ps)*ps,Math.floor(to.y/ps)*ps,ps,ps); break;
      }
      case "chalk": {
        const dist=Math.hypot(to.x-from.x,to.y-from.y); const steps=Math.max(1,Math.ceil(dist/2));
        ctx.fillStyle=col; ctx.shadowBlur=0; const cr=Math.max(2,sz*0.9);
        for(let i=0;i<=steps;i++){const t=i/steps;const cx=from.x+(to.x-from.x)*t;const cy=from.y+(to.y-from.y)*t;
          for(let j=0;j<8;j++){const r=(Math.random()-0.5)*cr*2;const a=Math.random()*Math.PI*2;ctx.globalAlpha=Math.random()*0.4+0.35;const ps=Math.random()*1.6+0.6;ctx.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r,ps,ps);}} break;
      }
      case "rainbow": {
        const rc=nextRainbow(); ctx.strokeStyle=rc; ctx.lineWidth=sz; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.globalAlpha=1; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke(); break;
      }
    }
    ctx.restore();
  }

  /* ── Canvas coords ── */
  function toPt(e: React.PointerEvent): { x: number; y: number } {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function toPtFromDiv(e: React.PointerEvent, el: HTMLElement): { x: number; y: number } {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /* ── Text overlay pointer handlers ── */
  const onTextOverlayPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isText) return;
    // Clicking the overlay background (not a text object)
    const target = e.target as HTMLElement;
    const isBackground = target === textOverlayRef.current;
    if (!isBackground) return;

    e.preventDefault();
    const overlay = textOverlayRef.current!;
    overlay.setPointerCapture(e.pointerId);
    const pt = toPtFromDiv(e, overlay);

    // If there's an active editing text box, finalize it
    if (textMode === "editing" && selectedTextId) {
      const obj = textObjects.find(o => o.id === selectedTextId);
      if (obj && !obj.text.trim()) {
        setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
      }
      setSelectedTextId(null);
      setTextMode("idle");
    }

    // Start drag-to-create
    textDragStartRef.current = pt;
    setTextDragRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
    setTextMode("drawing");
  }, [isText, textMode, selectedTextId, textObjects]);

  const onTextOverlayPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isText) return;
    const overlay = textOverlayRef.current!;
    const pt = toPtFromDiv(e, overlay);
    setCursorPt(pt);

    if (textMode === "drawing" && textDragStartRef.current) {
      const s = textDragStartRef.current;
      setTextDragRect({ x: Math.min(s.x, pt.x), y: Math.min(s.y, pt.y), w: Math.abs(pt.x-s.x), h: Math.abs(pt.y-s.y) });
      return;
    }

    if ((textMode === "transforming") && activeHandleRef.current && dragSnapRef.current && textDragStartRef.current) {
      const s = textDragStartRef.current;
      const snap = dragSnapRef.current;
      const dx = pt.x - s.x;
      const dy = pt.y - s.y;
      const handle = activeHandleRef.current;

      setTextObjects(prev => prev.map(o => {
        if (o.id !== selectedTextId) return o;
        if (handle === "move") {
          return { ...o, x: snap.x + dx, y: snap.y + dy };
        }
        if (handle === "rot") {
          const cx = snap.x + snap.width / 2;
          const cy = snap.y + snap.height / 2;
          const angle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI) + 90;
          return { ...o, rotation: angle };
        }
        // Resize: transform delta into object's local space
        const localDelta = rotateVec(dx, dy, -snap.rotation);
        let newX = snap.x, newY = snap.y, newW = snap.width, newH = snap.height;
        if (handle.includes("r")) { newW = Math.max(60, snap.width + localDelta.x); }
        if (handle.includes("l")) { newW = Math.max(60, snap.width - localDelta.x); newX = snap.x + snap.width - newW; }
        if (handle.includes("b")) { newH = Math.max(30, snap.height + localDelta.y); }
        if (handle.includes("t") && !handle.includes("rot")) { newH = Math.max(30, snap.height - localDelta.y); newY = snap.y + snap.height - newH; }
        return { ...o, x: newX, y: newY, width: newW, height: newH };
      }));
    }
  }, [isText, textMode, selectedTextId]);

  const onTextOverlayPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isText) return;
    const overlay = textOverlayRef.current!;
    const pt = toPtFromDiv(e, overlay);

    if (textMode === "drawing" && textDragStartRef.current) {
      const s = textDragStartRef.current;
      const w = Math.abs(pt.x - s.x);
      const h = Math.abs(pt.y - s.y);
      setTextDragRect(null);
      textDragStartRef.current = null;

      if (w > 30 && h > 15) {
        const newObj: TextObject = {
          id: crypto.randomUUID(),
          x: Math.min(s.x, pt.x),
          y: Math.min(s.y, pt.y),
          width: w,
          height: h,
          rotation: 0,
          text: "",
          fontFamily: "sans-serif",
          fontSize: Math.max(14, sizeRef.current * 2),
          bold: false, italic: false, underline: false,
          color: colorRef.current,
          align: "left",
          lineHeight: 1.3,
          letterSpacing: 0,
        };
        setTextObjects(prev => [...prev, newObj]);
        setSelectedTextId(newObj.id);
        setTextMode("editing");
      } else {
        setTextMode("idle");
      }
      return;
    }

    if (textMode === "transforming" && activeHandleRef.current) {
      activeHandleRef.current = null;
      dragSnapRef.current = null;
      textDragStartRef.current = null;
    }
  }, [isText, textMode]);

  /* Text object: start drag/move from inside the object */
  function onTextObjectPointerDown(e: React.PointerEvent<HTMLDivElement>, objId: string, handle: HandleId | "move") {
    e.stopPropagation();
    e.preventDefault();
    if (!isText) return;

    // If clicking a different object while editing → finalize current
    if (textMode === "editing" && selectedTextId !== objId) {
      const curObj = textObjects.find(o => o.id === selectedTextId);
      if (curObj && !curObj.text.trim()) {
        setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
      }
    }

    setSelectedTextId(objId);
    if (handle === "move" && textMode !== "editing") {
      setTextMode("transforming");
    } else if (handle !== "move") {
      setTextMode("transforming");
    }

    const obj = textObjects.find(o => o.id === objId);
    if (!obj) return;

    const overlay = textOverlayRef.current!;
    overlay.setPointerCapture(e.pointerId);
    textDragStartRef.current = toPtFromDiv(e, overlay);
    activeHandleRef.current = handle;
    dragSnapRef.current = { ...obj };
  }

  /* Double-click text object → re-enter editing */
  function onTextObjectDblClick(e: React.MouseEvent, objId: string) {
    e.stopPropagation();
    if (!isText) return;
    setSelectedTextId(objId);
    setTextMode("editing");
  }

  /* ── Canvas pointer events (drawing mode) ── */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    if (eyedropper) {
      e.preventDefault();
      const pt = toPt(e);
      const px = ctx.getImageData(Math.max(0,Math.round(pt.x)), Math.max(0,Math.round(pt.y)), 1, 1).data;
      setColor(`#${[px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`);
      setEyedropper(false);
      setBrush(prevBrushRef.current);
      return;
    }
    if (isFill) {
      e.preventDefault();
      const pt = toPt(e);
      saveSnapshot();
      floodFill(ctx, Math.round(pt.x), Math.round(pt.y), colorRef.current);
      return;
    }
    if (isText) return; // handled by overlay

    saveSnapshot();
    const pt = toPt(e);
    const endPt = { x: pt.x+0.1, y: pt.y+0.1 };
    lastPt.current = endPt;
    setDrawing(true);
    applyStroke(ctx, pt, endPt, brushRef.current, colorRef.current, sizeRef.current);
  }, [eyedropper, isFill, isText]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toPt(e);
    if (!isText) setCursorPt(pt);
    if (!drawing) return;
    const cv = canvasRef.current; const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    applyStroke(ctx, lastPt.current||pt, pt, brushRef.current, colorRef.current, sizeRef.current);
    lastPt.current = pt;
  }, [drawing, isText]);

  const onPointerUp = useCallback(() => {
    setDrawing(false); lastPt.current = null;
  }, []);

  const onPointerLeave = useCallback(() => {
    setCursorPt(null); setDrawing(false); lastPt.current = null;
  }, []);

  /* ── Switch tool: bake text objects & reset active tool modes ── */
  function activateTool(action: () => void) {
    if (textObjects.length > 0) bakeAllTextObjects();
    setSelectedTextId(null);
    setTextMode("idle");
    setIsText(false);
    setIsFill(false);
    setEyedropper(false);
    action();
  }

  /* ── Computed values ── */
  const isEraser    = brush === "eraser" && !isText && !isFill && !eyedropper;
  const canUndo     = history.length > 0;
  const canRedo     = future.length > 0;
  const isWhiteColor = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#FFF";
  const cursorColor = isWhiteColor ? "#000000" : color;
  const selectedObj = textObjects.find(o => o.id === selectedTextId) ?? null;

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-3 select-none" style={{ height: "calc(100vh - 200px)", minHeight: "480px", maxHeight: "780px" }}>

      {/* ── Text Formatting Toolbar (only when editing) ── */}
      {isText && textMode === "editing" && selectedObj && (
        <div className="flex items-center gap-1.5 flex-wrap bg-bb-surface border-2 border-bb-border rounded-bb-sm px-3 py-1.5 text-bb-text-primary text-[11px]">
          {/* Font family */}
          <select
            value={selectedObj.fontFamily}
            onChange={e => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, fontFamily: e.target.value } : o))}
            className="bg-bb-bg border border-bb-border rounded px-1.5 py-0.5 text-[11px] font-mono outline-none cursor-pointer hover:border-bb-violet"
            onPointerDown={ev => ev.stopPropagation()}
          >
            <option value="sans-serif">Sans-Serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Cursive</option>
            <option value="fantasy">Fantasy</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Impact, sans-serif">Impact</option>
          </select>

          {/* Font size */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, fontSize: Math.max(8, o.fontSize - 2) } : o))}
              className="w-5 h-5 flex items-center justify-center border border-bb-border rounded hover:border-bb-violet text-bb-text-muted hover:text-bb-violet">
              <Minus size={9}/>
            </button>
            <input
              type="number" min={8} max={200}
              value={selectedObj.fontSize}
              onChange={e => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, fontSize: Math.max(8, Math.min(200, +e.target.value)) } : o))}
              className="w-10 text-center bg-bb-bg border border-bb-border rounded py-0.5 text-[11px] font-mono outline-none"
              onPointerDown={ev => ev.stopPropagation()}
            />
            <button onClick={() => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, fontSize: Math.min(200, o.fontSize + 2) } : o))}
              className="w-5 h-5 flex items-center justify-center border border-bb-border rounded hover:border-bb-violet text-bb-text-muted hover:text-bb-violet">
              <Plus size={9}/>
            </button>
          </div>

          <div className="w-px h-4 bg-bb-border"/>

          {/* Bold */}
          <button onClick={() => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, bold: !o.bold } : o))}
            className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${selectedObj.bold ? "bg-bb-violet border-black text-white" : "border-bb-border hover:border-bb-violet text-bb-text-muted"}`}>
            <Bold size={11}/>
          </button>
          {/* Italic */}
          <button onClick={() => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, italic: !o.italic } : o))}
            className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${selectedObj.italic ? "bg-bb-violet border-black text-white" : "border-bb-border hover:border-bb-violet text-bb-text-muted"}`}>
            <Italic size={11}/>
          </button>
          {/* Underline */}
          <button onClick={() => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, underline: !o.underline } : o))}
            className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${selectedObj.underline ? "bg-bb-violet border-black text-white" : "border-bb-border hover:border-bb-violet text-bb-text-muted"}`}>
            <Underline size={11}/>
          </button>

          <div className="w-px h-4 bg-bb-border"/>

          {/* Alignment */}
          {(["left","center","right"] as const).map(a => (
            <button key={a} onClick={() => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, align: a } : o))}
              className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${selectedObj.align === a ? "bg-bb-violet border-black text-white" : "border-bb-border hover:border-bb-violet text-bb-text-muted"}`}>
              {a === "left" ? <AlignLeft size={11}/> : a === "center" ? <AlignCenter size={11}/> : <AlignRight size={11}/>}
            </button>
          ))}

          <div className="w-px h-4 bg-bb-border"/>

          {/* Line height */}
          <span className="text-bb-text-muted font-mono text-[9px] uppercase">Line</span>
          <input type="range" min={0.8} max={3} step={0.1}
            value={selectedObj.lineHeight}
            onChange={e => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, lineHeight: +e.target.value } : o))}
            className="w-16 h-1.5 accent-bb-violet cursor-pointer"
            onPointerDown={ev => ev.stopPropagation()}
          />

          {/* Letter spacing */}
          <span className="text-bb-text-muted font-mono text-[9px] uppercase">Spacing</span>
          <input type="range" min={-2} max={20} step={0.5}
            value={selectedObj.letterSpacing}
            onChange={e => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, letterSpacing: +e.target.value } : o))}
            className="w-16 h-1.5 accent-bb-violet cursor-pointer"
            onPointerDown={ev => ev.stopPropagation()}
          />

          <div className="w-px h-4 bg-bb-border"/>

          {/* Color swatch */}
          <label title="Text color" className="cursor-pointer w-6 h-6 rounded border-2 border-bb-border overflow-hidden relative hover:border-bb-violet"
            style={{ backgroundColor: selectedObj.color }}>
            <input type="color" value={selectedObj.color}
              onChange={e => setTextObjects(prev => prev.map(o => o.id === selectedTextId ? { ...o, color: e.target.value } : o))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onPointerDown={ev => ev.stopPropagation()}
            />
          </label>

          <div className="flex-1"/>

          {/* ESC hint */}
          <span className="text-bb-text-muted font-mono text-[9px]">ESC = transform mode · Enter = new line</span>
        </div>
      )}

      {/* ── Top Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap bg-bb-surface border-2 border-bb-border rounded-bb-sm px-3 py-2">
        <div className="flex gap-1">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 border-bb-border bg-bb-bg hover:border-bb-violet hover:text-bb-violet transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-bb-text-muted">
            <RotateCcw size={13}/>
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            className="flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 border-bb-border bg-bb-bg hover:border-bb-violet hover:text-bb-violet transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-bb-text-muted">
            <RotateCw size={13}/>
          </button>
        </div>
        <div className="w-px h-6 bg-bb-border"/>
        <button onClick={() => activateTool(() => setBrush(b => b === "eraser" ? "pen" : "eraser"))} title="Eraser"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 text-[11px] font-bold uppercase tracking-wide font-mono transition-all ${
            isEraser ? "bg-bb-coral text-bb-coral-fg border-black shadow-[2px_2px_0px_#000]"
              : "border-bb-border bg-bb-bg text-bb-text-muted hover:border-bb-coral hover:text-bb-coral"}`}>
          <Eraser size={12}/> Eraser
        </button>
        <div className="w-px h-6 bg-bb-border"/>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSize(s => Math.max(1, s-1))}
            className="flex items-center justify-center w-7 h-7 rounded-bb-xs border-2 border-bb-border bg-bb-bg hover:border-bb-lime text-bb-text-muted hover:text-bb-lime transition-colors">
            <Minus size={12}/>
          </button>
          <span className="text-[11px] font-mono font-black text-bb-text-primary w-5 text-center">{size}</span>
          <button onClick={() => setSize(s => Math.min(40, s+1))}
            className="flex items-center justify-center w-7 h-7 rounded-bb-xs border-2 border-bb-border bg-bb-bg hover:border-bb-lime text-bb-text-muted hover:text-bb-lime transition-colors">
            <Plus size={12}/>
          </button>
        </div>
        <div className="w-px h-6 bg-bb-border"/>

        {/* Eyedropper */}
        <button onClick={() => {
          if (textObjects.length > 0) bakeAllTextObjects();
          setSelectedTextId(null);
          setTextMode("idle");
          if (!eyedropper) prevBrushRef.current = brushRef.current;
          setIsFill(false);
          setIsText(false);
          setEyedropper(v => !v);
        }} title="Color Picker"
          className={`flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 transition-colors ${
            eyedropper ? "bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]"
              : "border-bb-border bg-bb-bg text-bb-text-muted hover:border-bb-violet hover:text-bb-violet"}`}>
          <Pipette size={13}/>
        </button>

        {/* Fill */}
        <button onClick={() => {
          if (textObjects.length > 0) bakeAllTextObjects();
          setSelectedTextId(null);
          setTextMode("idle");
          setEyedropper(false);
          setIsText(false);
          setIsFill(v => !v);
        }} title="Fill area"
          className={`flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 transition-colors ${
            isFill ? "bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]"
              : "border-bb-border bg-bb-bg text-bb-text-muted hover:border-bb-violet hover:text-bb-violet"}`}>
          <PaintBucket size={13}/>
        </button>

        {/* Text Tool */}
        <button onClick={() => {
          setEyedropper(false);
          setIsFill(false);
          if (isText) {
            bakeAllTextObjects();
            setIsText(false);
            setSelectedTextId(null);
            setTextMode("idle");
          } else {
            if (textObjects.length > 0) bakeAllTextObjects();
            setIsText(true);
            setTextMode("idle");
          }
        }} title="Text Tool (drag to create)"
          className={`flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 transition-colors ${
            isText ? "bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]"
              : "border-bb-border bg-bb-bg text-bb-text-muted hover:border-bb-violet hover:text-bb-violet"}`}>
          <Type size={13}/>
        </button>

        <div className="w-px h-6 bg-bb-border"/>
        {/* Custom Color Picker */}
        <label title="Pick custom color" className="relative cursor-pointer flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 border-bb-border overflow-hidden hover:border-bb-violet transition-colors shrink-0"
          style={{ backgroundColor: color }}>
          <input type="color" value={color} onChange={e => addCustomColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
        </label>
        <div className="w-px h-6 bg-bb-border"/>

        {/* Color Palette */}
        <div className="grid grid-cols-10 gap-2 items-center">
          {ROW_1.map(c => (
            <button key={c} title={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-bb-xs border-2 transition-all ${color.toLowerCase()===c.toLowerCase() ? "border-white scale-110 shadow-md ring-2 ring-white z-10" : "border-black/60 hover:scale-105"}`}
              style={{ backgroundColor: c }}/>
          ))}
          {ROW_2.map(c => (
            <button key={c} title={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-bb-xs border-2 transition-all ${color.toLowerCase()===c.toLowerCase() ? "border-white scale-110 shadow-md ring-2 ring-white z-10" : "border-black/60 hover:scale-105"}`}
              style={{ backgroundColor: c }}/>
          ))}
          {Array.from({ length: 10 }).map((_, idx) => {
            const cc = customColors[idx];
            return cc ? (
              <button key={`c-${idx}`} title={cc} onClick={() => setColor(cc)}
                className={`w-6 h-6 rounded-bb-xs border-2 transition-all ${color.toLowerCase()===cc.toLowerCase() ? "border-white scale-110 shadow-md ring-2 ring-white z-10" : "border-black/60 hover:scale-105"}`}
                style={{ backgroundColor: cc }}/>
            ) : (
              <div key={`e-${idx}`} className="w-6 h-6 rounded-bb-xs border-2 border-bb-border/40 bg-bb-surface/30"/>
            );
          })}
        </div>
        <div className="flex-1"/>
        <button onClick={clearCanvas}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 border-bb-border bg-bb-bg text-[11px] font-bold uppercase tracking-wide font-mono text-bb-text-muted hover:border-bb-coral hover:text-bb-coral transition-colors">
          <Trash2 size={12}/> Clear
        </button>
        <button onClick={saveDrawing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 border-bb-lime bg-bb-lime text-bb-lime-fg text-[11px] font-bold uppercase tracking-wide font-mono shadow-[2px_2px_0px_#000] hover:brightness-110 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
          <Download size={12}/> Save
        </button>
      </div>

      {/* ── Main: Brushes + Canvas Column ── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Brush sidebar */}
        <div className="flex flex-col bg-bb-surface border-2 border-bb-border rounded-bb-sm p-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 w-[84px] divide-y divide-bb-border/40">
          {BRUSHES.map(b => {
            const isActive = brush === b.id && !eyedropper && !isFill && !isText;
            const Icon = b.icon;
            return (
              <div key={b.id} className="py-1 first:pt-0 last:pb-0">
                <button onClick={() => activateTool(() => { setBrush(b.id); setEyedropper(false); setIsFill(false); })} title={b.desc}
                  className={["w-full flex flex-col items-center gap-1.5 py-2 rounded-bb-xs border-2 text-center transition-all",
                    isActive
                      ? "bg-bb-violet border-black shadow-[2px_2px_0px_#000]"
                      : "bg-transparent text-bb-text-muted border-transparent hover:text-bb-text-primary hover:bg-bb-bg",
                  ].join(" ")}>
                  <Icon size={16} className={isActive ? "text-[#6BCB77] drop-shadow-[0_0_6px_rgba(107,203,119,0.8)]" : "text-bb-text-muted"}/>
                  <span className={`text-[9px] font-bold uppercase tracking-wide font-mono leading-none ${isActive ? "text-white" : "text-bb-text-muted"}`}>{b.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Canvas Container */}
        <div ref={containerRef} className="flex-1 rounded-bb-sm border-2 border-bb-border overflow-hidden bg-white relative">

          {/* ── Cursor overlay (non-text mode) ── */}
          {cursorPt && !isText && (
            <div className="absolute pointer-events-none z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${cursorPt.x}px`, top: `${cursorPt.y}px` }}>
              {isEraser && (
                <div className="border-2 border-black bg-white/40 shadow-sm flex items-center justify-center"
                  style={{ width: `${Math.max(14, size*4)}px`, height: `${Math.max(14, size*4)}px` }}>
                  <Eraser size={Math.min(16, Math.max(10, size*1.8))} className="text-black"/>
                </div>
              )}
              {!isEraser && eyedropper && <Pipette size={22} style={{ color: "#1a1a1a" }} strokeWidth={2}/>}
              {!isEraser && !eyedropper && isFill && <PaintBucket size={22} style={{ color: "#1a1a1a" }} strokeWidth={2}/>}
              {!isEraser && !eyedropper && !isFill && (
                <Plus size={Math.max(14, size*2.2)} style={{ color: cursorColor }} strokeWidth={2.5}/>
              )}
            </div>
          )}

          {/* ── Text Mode I-beam cursor ── */}
          {cursorPt && isText && textMode !== "editing" && (
            <div className="absolute pointer-events-none z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${cursorPt.x}px`, top: `${cursorPt.y}px` }}>
              <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                <line x1="4" y1="2" x2="16" y2="2" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="10" y1="2" x2="10" y2="26" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="4" y1="26" x2="16" y2="26" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}

          {/* ── Text overlay (sits above canvas, handles all text interactions) ── */}
          <div
            ref={textOverlayRef}
            className="absolute inset-0 z-20"
            style={{ pointerEvents: isText ? "auto" : "none", cursor: isText && textMode !== "editing" ? "none" : "default" }}
            onPointerDown={onTextOverlayPointerDown}
            onPointerMove={onTextOverlayPointerMove}
            onPointerUp={onTextOverlayPointerUp}
          >
            {/* Drag-to-create preview */}
            {textDragRect && textMode === "drawing" && (
              <div className="absolute pointer-events-none"
                style={{
                  left: textDragRect.x, top: textDragRect.y,
                  width: textDragRect.w, height: textDragRect.h,
                  border: "2px dashed #555",
                  background: "rgba(99,102,241,0.05)",
                }}/>
            )}

            {/* Text Objects */}
            {textObjects.map(obj => {
              const isSelected = selectedTextId === obj.id;
              const isEditing  = isSelected && textMode === "editing";
              const isTransform = isSelected && textMode === "transforming";

              return (
                <div
                  key={obj.id}
                  style={{
                    position: "absolute",
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height,
                    transform: `rotate(${obj.rotation}deg)`,
                    transformOrigin: `${obj.width/2}px ${obj.height/2}px`,
                    outline: isEditing
                      ? "2px solid #6366f1"
                      : isTransform
                      ? "2px dashed #6366f1"
                      : isSelected
                      ? "1px dashed #a5b4fc"
                      : "none",
                    boxSizing: "border-box",
                    overflow: isEditing ? "visible" : "hidden",
                    cursor: isEditing ? "text" : "move",
                  }}
                  onPointerDown={e => onTextObjectPointerDown(e, obj.id, "move")}
                  onDoubleClick={e => onTextObjectDblClick(e, obj.id)}
                >
                  {/* Text area (editing) */}
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={obj.text}
                      onChange={ev => setTextObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: ev.target.value } : o))}
                      onKeyDown={ev => {
                        if (ev.key === "Escape") { ev.preventDefault(); setTextMode("transforming"); }
                      }}
                      onPointerDown={ev => ev.stopPropagation()}
                      placeholder="Type here…"
                      className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-2 box-border"
                      style={{
                        font: buildFont(obj),
                        color: obj.color,
                        textAlign: obj.align,
                        lineHeight: obj.lineHeight,
                        letterSpacing: `${obj.letterSpacing}px`,
                        textDecoration: obj.underline ? "underline" : "none",
                      }}
                    />
                  ) : (
                    /* Text display (transform/idle) */
                    <div className="absolute inset-0 p-2 box-border overflow-hidden whitespace-pre-wrap break-words pointer-events-none"
                      style={{
                        font: buildFont(obj),
                        color: obj.color,
                        textAlign: obj.align,
                        lineHeight: obj.lineHeight,
                        letterSpacing: `${obj.letterSpacing}px`,
                        textDecoration: obj.underline ? "underline" : "none",
                      }}>
                      {obj.text || <span style={{ opacity: 0.35, fontStyle: "italic", fontSize: "0.8em" }}>Empty text box</span>}
                    </div>
                  )}

                  {/* ── Transform handles ── */}
                  {isTransform && (() => {
                    const HANDLE_SIZE = 8;
                    const HS = HANDLE_SIZE / 2;
                    const handles: { id: HandleId; x: number; y: number; cursor: string }[] = [
                      { id: "tl", x: -HS, y: -HS, cursor: "nw-resize" },
                      { id: "tm", x: obj.width/2-HS, y: -HS, cursor: "n-resize" },
                      { id: "tr", x: obj.width-HS, y: -HS, cursor: "ne-resize" },
                      { id: "ml", x: -HS, y: obj.height/2-HS, cursor: "w-resize" },
                      { id: "mr", x: obj.width-HS, y: obj.height/2-HS, cursor: "e-resize" },
                      { id: "bl", x: -HS, y: obj.height-HS, cursor: "sw-resize" },
                      { id: "bm", x: obj.width/2-HS, y: obj.height-HS, cursor: "s-resize" },
                      { id: "br", x: obj.width-HS, y: obj.height-HS, cursor: "se-resize" },
                    ];
                    return (
                      <>
                        {handles.map(h => (
                          <div key={h.id}
                            onPointerDown={e => onTextObjectPointerDown(e, obj.id, h.id)}
                            style={{
                              position: "absolute",
                              left: h.x, top: h.y,
                              width: HANDLE_SIZE, height: HANDLE_SIZE,
                              background: "white",
                              border: "2px solid #6366f1",
                              cursor: h.cursor,
                              boxSizing: "border-box",
                              zIndex: 1,
                            }}
                          />
                        ))}
                        {/* Rotation handle */}
                        <div className="absolute flex flex-col items-center pointer-events-none"
                          style={{ left: obj.width/2, top: -36, transform: "translateX(-50%)" }}>
                          <div
                            onPointerDown={e => onTextObjectPointerDown(e, obj.id, "rot")}
                            title="Drag to rotate"
                            style={{
                              width: 16, height: 16, borderRadius: "50%",
                              background: "white", border: "2px solid #6366f1",
                              cursor: "grab", pointerEvents: "auto",
                            }}
                          />
                          <div style={{ width: 1, height: 20, background: "#6366f1", pointerEvents: "none" }}/>
                        </div>
                        {/* Object toolbar: Bake / Delete */}
                        <div className="absolute flex gap-1 pointer-events-auto"
                          style={{ left: 0, top: -28, whiteSpace: "nowrap" }}>
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setTextMode("editing"); }}
                            title="Edit text"
                            className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-white border border-[#6366f1] text-[#6366f1] rounded shadow-sm hover:bg-[#6366f1] hover:text-white transition-colors">
                            Edit
                          </button>
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => {
                              e.stopPropagation();
                              // Bake this single object
                              const c = canvasRef.current; const ctx = c?.getContext("2d");
                              if (!c || !ctx) return;
                              saveSnapshot();
                              bakeTextObject(ctx, obj);
                              setTextObjects(prev => prev.filter(o => o.id !== obj.id));
                              setSelectedTextId(null);
                              setTextMode("idle");
                            }}
                            title="Place on canvas"
                            className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-bb-lime border border-black text-black rounded shadow-sm hover:brightness-110 transition-colors">
                            ✓ Place
                          </button>
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => {
                              e.stopPropagation();
                              setTextObjects(prev => prev.filter(o => o.id !== obj.id));
                              setSelectedTextId(null);
                              setTextMode("idle");
                            }}
                            title="Delete text object"
                            className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-white border border-red-400 text-red-500 rounded shadow-sm hover:bg-red-50 transition-colors">
                            ✕
                          </button>
                        </div>
                      </>
                    );
                  })()}

                  {/* Editing: Finalize bar */}
                  {isEditing && (
                    <div className="absolute flex gap-1 pointer-events-auto"
                      style={{ left: 0, top: -26, whiteSpace: "nowrap" }}>
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setTextMode("transforming"); }}
                        className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-white border border-[#6366f1] text-[#6366f1] rounded shadow-sm hover:bg-[#6366f1] hover:text-white">
                        ESC → Transform
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Canvas ── */}
          <canvas
            ref={canvasRef}
            onPointerDown={isText ? undefined : onPointerDown}
            onPointerMove={isText ? undefined : onPointerMove}
            onPointerUp={isText ? undefined : onPointerUp}
            onPointerLeave={isText ? undefined : onPointerLeave}
            className="block w-full h-full touch-none"
            style={{ touchAction: "none", cursor: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
