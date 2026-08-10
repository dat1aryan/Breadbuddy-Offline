import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Eraser, Trash2, RotateCcw, RotateCw,
  Minus, Plus, Pipette, PaintBucket, Type, FilePlus, Save, FolderDown, CheckCircle2, AlertTriangle,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  PenTool, Highlighter, Sparkles, Feather, Wind, Star, Gamepad2, Palette, Disc,
  X, ArrowUpRight, ZoomIn, ZoomOut, MousePointer, Crop, Maximize2, Move,
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
export function DoodleStudio() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  /* ── Welcome / fullscreen state ── */
  const [started, setStarted] = useState<boolean>(() => {
    return localStorage.getItem("doodle_studio_started") === "true";
  });
  const [isInitializing, setIsInitializing]   = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [canvasReady, setCanvasReady]         = useState(false);

  /* ── Active Tool Single Source of Truth ── */
  type ActiveTool = "brush" | "eraser" | "fill" | "text" | "eyedropper";
  const [activeTool, setActiveTool] = useState<ActiveTool>("brush");
  const [brush, setBrush]           = useState<BrushId>("pen");
  const [color, setColor]           = useState("#000000");
  const [size, setSize]             = useState(6);
  const [drawing, setDrawing]       = useState(false);
  type HistoryEntry = {
    imageData: ImageData;
    textObjects: TextObject[];
  };
  const [history, setHistory]       = useState<HistoryEntry[]>([]);
  const [future, setFuture]         = useState<HistoryEntry[]>([]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [cursorPt, setCursorPt]     = useState<{ x: number; y: number } | null>(null);
  const prevBrushRef                = useRef<BrushId>("pen");
  const prevToolRef                 = useRef<ActiveTool>("brush");

  /* ── Zoom & Viewport Canvas Dimensions State ── */
  const [zoom, setZoom]                   = useState(1.0);
  const [zoomInputText, setZoomInputText] = useState<string | null>(null);
  const [canvasDims, setCanvasDims]       = useState<{ width: number; height: number }>({ width: 1200, height: 750 });

  /* ── Modals & Notification State ── */
  const [modalType, setModalType]   = useState<"none" | "new" | "clear" | "exit">("none");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  /* ── Canvas Persistence (auto-save to localStorage on every stroke & beforeunload) ── */
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveCanvasNow = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    try {
      const dataUrl = cv.toDataURL("image/png");
      localStorage.setItem("doodle_studio_canvas", dataUrl);
      localStorage.setItem("breadbuddy_doodle_draft", dataUrl);
      localStorage.setItem("breadbuddy_doodle_dims", JSON.stringify(canvasDims));
    } catch (_) { /* quota exceeded – silently skip */ }
  }, [canvasDims]);

  function autosaveCanvas() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveCanvasNow();
    }, 300);
  }

  /* ── Save synchronously on page unload / browser refresh ── */
  useEffect(() => {
    if (!started) return;
    const handleBeforeUnload = () => {
      saveCanvasNow();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [started, saveCanvasNow]);

  /* ── Ctrl + MouseWheel Zoom Handler ── */
  useEffect(() => {
    const ct = containerRef.current;
    if (!ct) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setZoom(z => Math.min(3.0, Math.max(0.5, +(z + delta).toFixed(2))));
      }
    };
    ct.addEventListener("wheel", handleWheel, { passive: false });
    return () => ct.removeEventListener("wheel", handleWheel);
  }, [started]);

  /* ── Computed derived tool flags ── */
  const isText       = activeTool === "text";
  const isFill       = activeTool === "fill";
  const eyedropper   = activeTool === "eyedropper";
  const isEraser     = activeTool === "eraser";

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

  function pickColor(c: string) {
    setColor(c);
    if (activeTool === "eyedropper") {
      const targetTool = (prevBrushRef.current === "eraser" || prevToolRef.current === "eraser") ? "eraser" : "brush";
      selectTool(targetTool, prevBrushRef.current);
    }
  }

  function addCustomColor(c: string) {
    pickColor(c);
    setCustomColors(prev => {
      if (prev.includes(c)) return prev;
      if (prev.length < 10) return [...prev, c];
      return [...prev.slice(1), c];
    });
  }

  /* ── Canvas manual resize & panning state ── */
  const [canvasResizing, setCanvasResizing] = useState<{
    handle: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const [liveResizeDims, setLiveResizeDims] = useState<{ w: number; h: number } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  function resizeCanvasTo(newW: number, newH: number) {
    const cv = canvasRef.current;
    if (!cv) return;
    const w = Math.max(100, Math.round(newW));
    const h = Math.max(100, Math.round(newH));
    if (cv.width === w && cv.height === h) return;

    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const tmp = document.createElement("canvas");
    tmp.width = cv.width;
    tmp.height = cv.height;
    tmp.getContext("2d")?.drawImage(cv, 0, 0);

    cv.width = w;
    cv.height = h;
    setCanvasDims({ width: w, height: h });
    fillBg(ctx, cv);
    ctx.drawImage(tmp, 0, 0);
  }

  const onCanvasResizePointerDown = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setCanvasResizing({
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: canvasDims.width,
      startH: canvasDims.height,
    });
    setLiveResizeDims({ w: canvasDims.width, h: canvasDims.height });
  };

  const onCanvasResizePointerMove = (e: React.PointerEvent) => {
    if (!canvasResizing) return;
    const dx = (e.clientX - canvasResizing.startX) / zoom;
    const dy = (e.clientY - canvasResizing.startY) / zoom;

    let newW = canvasResizing.startW;
    let newH = canvasResizing.startH;

    if (canvasResizing.handle.includes("e")) newW = Math.max(100, canvasResizing.startW + dx);
    if (canvasResizing.handle.includes("s")) newH = Math.max(100, canvasResizing.startH + dy);
    if (canvasResizing.handle.includes("w")) newW = Math.max(100, canvasResizing.startW - dx);
    if (canvasResizing.handle.includes("n")) newH = Math.max(100, canvasResizing.startH - dy);

    newW = Math.round(newW);
    newH = Math.round(newH);

    setLiveResizeDims({ w: newW, h: newH });
    resizeCanvasTo(newW, newH);
  };

  const onCanvasResizePointerUp = (e: React.PointerEvent) => {
    if (canvasResizing) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) {}
      setCanvasResizing(null);
      setLiveResizeDims(null);
    }
  };

  const onViewportPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.target === containerRef.current || (e.target as HTMLElement).classList?.contains("custom-doodle-viewport")) {
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: containerRef.current?.scrollLeft || 0,
        scrollTop: containerRef.current?.scrollTop || 0,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onViewportPointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    }
  };

  const onViewportPointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  /* ── Canvas init & responsive resize ── */
  const initialised = useRef(false);
  const restoringRef = useRef(false);

  useEffect(() => {
    if (!started) {
      initialised.current = false;
      restoringRef.current = false;
      setCanvasReady(false);
      return;
    }
    const cv = canvasRef.current;
    const ct = containerRef.current;
    if (!cv || !ct) return;

    const resize = () => {
      const ctx = cv.getContext("2d");
      if (!ctx) return;

      if (!initialised.current && !restoringRef.current) {
        restoringRef.current = true;

        // Try restoring saved dimensions first to prevent canvas dimension jumps on refresh
        let targetW = 0;
        let targetH = 0;
        const savedDimsRaw = localStorage.getItem("breadbuddy_doodle_dims");
        if (savedDimsRaw) {
          try {
            const parsed = JSON.parse(savedDimsRaw);
            if (parsed && typeof parsed.width === "number" && typeof parsed.height === "number" && parsed.width > 0 && parsed.height > 0) {
              targetW = parsed.width;
              targetH = parsed.height;
            }
          } catch (_) {}
        }

        if (!targetW || !targetH) {
          const rect = ct.getBoundingClientRect();
          const availW = Math.max(360, rect.width - 64);
          const availH = Math.max(260, rect.height - 64);
          targetW = Math.max(640, Math.min(1600, Math.floor(availW * 0.92)));
          targetH = Math.max(400, Math.min(900, Math.floor(availH * 0.88)));
        }

        cv.width = targetW;
        cv.height = targetH;
        setCanvasDims({ width: targetW, height: targetH });

        // ── Restore saved drawing from localStorage ──
        const savedDataUrl = localStorage.getItem("breadbuddy_doodle_draft") || localStorage.getItem("doodle_studio_canvas");
        if (savedDataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const restoredEntry: HistoryEntry = {
              imageData: ctx.getImageData(0, 0, targetW, targetH),
              textObjects: [],
            };
            setHistory([restoredEntry]);
            initialised.current = true;
            restoringRef.current = false;
            requestAnimationFrame(() => setCanvasReady(true));
          };
          img.onerror = () => {
            fillBg(ctx, cv);
            const blankEntry: HistoryEntry = {
              imageData: ctx.getImageData(0, 0, targetW, targetH),
              textObjects: [],
            };
            setHistory([blankEntry]);
            initialised.current = true;
            restoringRef.current = false;
            requestAnimationFrame(() => setCanvasReady(true));
          };
          img.src = savedDataUrl;
        } else {
          fillBg(ctx, cv);
          const blankEntry: HistoryEntry = {
            imageData: ctx.getImageData(0, 0, targetW, targetH),
            textObjects: [],
          };
          setHistory([blankEntry]);
          initialised.current = true;
          restoringRef.current = false;
          requestAnimationFrame(() => setCanvasReady(true));
        }
      }
    };

    resize();
    const timer1 = requestAnimationFrame(() => {
      if (!initialised.current && !restoringRef.current) {
        resize();
      }
    });

    const ro = new ResizeObserver(() => {
      if (!initialised.current && !restoringRef.current) {
        resize();
      }
    });
    ro.observe(ct);
    const handleResize = () => {
      if (!initialised.current && !restoringRef.current) {
        resize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(timer1);
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [started]);

  /* ── Snapshot helpers (Unified Canvas + Text Objects History) ── */
  function saveSnapshot() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const entry: HistoryEntry = {
      imageData: ctx.getImageData(0, 0, c.width, c.height),
      textObjects: textObjects.map(o => ({ ...o })),
    };
    setHistory(p => [...p.slice(-30), entry]);
    setFuture([]);
    // Persist canvas to localStorage so refreshing restores the drawing
    autosaveCanvas();
  }

  function undo() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx || history.length <= 1) return;
    const target = history[history.length - 2];
    const currentEntry: HistoryEntry = {
      imageData: ctx.getImageData(0, 0, c.width, c.height),
      textObjects: textObjects.map(o => ({ ...o })),
    };
    setFuture(p => [currentEntry, ...p.slice(0, 29)]);
    setHistory(p => p.slice(0, -1));
    ctx.putImageData(target.imageData, 0, 0);
    setTextObjects(target.textObjects.map(o => ({ ...o })));
    setSelectedTextId(null);
    setTextMode("idle");
  }

  function redo() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx || !future.length) return;
    const next = future[0];
    const currentEntry: HistoryEntry = {
      imageData: ctx.getImageData(0, 0, c.width, c.height),
      textObjects: textObjects.map(o => ({ ...o })),
    };
    setHistory(p => [...p, currentEntry]);
    setFuture(p => p.slice(1));
    ctx.putImageData(next.imageData, 0, 0);
    setTextObjects(next.textObjects.map(o => ({ ...o })));
    setSelectedTextId(null);
    setTextMode("idle");
  }

  function confirmClearCanvas() {
    const c = canvasRef.current; const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    fillBg(ctx, c);
    setTextObjects([]);
    setSelectedTextId(null);
    setTextMode("idle");
    setTextDragRect(null);

    const blankEntry: HistoryEntry = {
      imageData: ctx.getImageData(0, 0, c.width, c.height),
      textObjects: [],
    };
    setHistory([blankEntry]);
    setFuture([]);
    setModalType("none");
    localStorage.removeItem("doodle_studio_canvas");
    localStorage.removeItem("breadbuddy_doodle_draft");
    localStorage.removeItem("breadbuddy_doodle_dims");
    triggerToast("Canvas drawings cleared!");
  }

  function getExportCanvas(): HTMLCanvasElement | null {
    const c = canvasRef.current;
    if (!c) return null;
    const off = document.createElement("canvas");
    off.width = c.width;
    off.height = c.height;
    const ctx = off.getContext("2d");
    if (!ctx) return null;

    // Draw main canvas pixel content
    ctx.drawImage(c, 0, 0);

    // Render all active text objects onto export image
    textObjects.forEach(obj => bakeTextObject(ctx, obj));

    return off;
  }

  function saveLocalDraft() {
    const c = getExportCanvas();
    if (!c) return;
    try {
      const dataUrl = c.toDataURL("image/png");
      localStorage.setItem("breadbuddy_doodle_draft", dataUrl);
      localStorage.setItem("breadbuddy_doodle_dims", JSON.stringify(canvasDims));
      triggerToast("Saved locally to studio storage!");
    } catch (err) {
      triggerToast("Saved locally to studio storage!");
    }
  }

  async function exportDrawingWithPathPicker() {
    const c = getExportCanvas();
    if (!c) return;

    try {
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `breadbuddy-doodle-${Date.now()}.png`,
          types: [{
            description: "PNG Image",
            accept: { "image/png": [".png"] },
          }],
        });
        const blob = await new Promise<Blob | null>(resolve => c.toBlob(resolve, "image/png"));
        if (blob) {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          triggerToast("Exported image to selected location!");
          return;
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // User cancelled path picker
      }
    }

    // Fallback download
    const a = document.createElement("a");
    a.download = `breadbuddy-doodle-${Date.now()}.png`;
    a.href = c.toDataURL("image/png", 1);
    a.click();
    triggerToast("Exported image download started!");
  }

  function handleNewCanvas(saveFirst: boolean) {
    if (saveFirst) {
      exportDrawingWithPathPicker();
    }
    const c = canvasRef.current;
    const ct = containerRef.current;
    if (c && ct) {
      const rect = ct.getBoundingClientRect();
      const newWidth  = Math.max(960, Math.floor((rect.width - 80) * 0.92));
      const newHeight = Math.max(540, Math.floor((rect.height - 80) * 0.92));
      c.width = newWidth;
      c.height = newHeight;
      setCanvasDims({ width: newWidth, height: newHeight });
      const ctx = c.getContext("2d");
      if (ctx) {
        fillBg(ctx, c);
        const blankEntry: HistoryEntry = {
          imageData: ctx.getImageData(0, 0, c.width, c.height),
          textObjects: [],
        };
        setHistory([blankEntry]);
      }
    }
    setTextObjects([]);
    setSelectedTextId(null);
    setTextMode("idle");
    setTextDragRect(null);
    setFuture([]);
    setZoom(1.0);
    setModalType("none");
    localStorage.removeItem("doodle_studio_canvas");
    localStorage.removeItem("breadbuddy_doodle_draft");
    localStorage.removeItem("breadbuddy_doodle_dims");
  }

  function confirmExit(saveFirst: boolean) {
    if (saveFirst) {
      saveLocalDraft();
    }
    setModalType("none");
    exitFullscreen();
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
        saveSnapshot();
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
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const rect = cv.getBoundingClientRect();
    const scaleX = rect.width ? cv.width / rect.width : 1;
    const scaleY = rect.height ? cv.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }
  function toPtFromDiv(e: React.PointerEvent, el: HTMLElement): { x: number; y: number } {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /* ── Text overlay pointer handlers ── */
  const onTextOverlayPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Clicking the overlay background (not a text object)
    const target = e.target as HTMLElement;
    const isBackground = target === textOverlayRef.current;
    if (!isBackground) return;

    // Finalize active editing text box if empty
    if (selectedTextId) {
      const obj = textObjects.find(o => o.id === selectedTextId);
      if (obj && !obj.text.trim()) {
        setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
      }
    }

    if (!isText) {
      setSelectedTextId(null);
      setTextMode("idle");
      return;
    }

    e.preventDefault();
    const overlay = textOverlayRef.current!;
    overlay.setPointerCapture(e.pointerId);
    const pt = toPtFromDiv(e, overlay);

    // If clicking background while transformed or editing, deselect
    if (selectedTextId) {
      setSelectedTextId(null);
      setTextMode("idle");
    }

    // Start drag-to-create new text box
    textDragStartRef.current = pt;
    setTextDragRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
    setTextMode("drawing");
  }, [isText, selectedTextId, textObjects]);

  const onTextOverlayPointerLeave = useCallback(() => {
    setCursorPt(null);
  }, []);

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
          color: (colorRef.current && colorRef.current.toLowerCase() !== "#ffffff" && colorRef.current.toLowerCase() !== "#fff") ? colorRef.current : "#000000",
          align: "left",
          lineHeight: 1.3,
          letterSpacing: 0,
        };
        saveSnapshot();
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

  /* Text object: start drag/move from inside or around the object */
  function onTextObjectPointerDown(e: React.PointerEvent<HTMLDivElement>, objId: string, handle: HandleId | "move") {
    e.stopPropagation();
    e.preventDefault();

    saveSnapshot();

    if (activeTool !== "text") {
      setActiveTool("text");
    }

    // If clicking a different object while editing → finalize current if empty
    if (selectedTextId !== objId) {
      const curObj = textObjects.find(o => o.id === selectedTextId);
      if (curObj && !curObj.text.trim()) {
        setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
      }
    }

    setSelectedTextId(objId);
    setTextMode("transforming");

    const obj = textObjects.find(o => o.id === objId);
    if (!obj) return;

    const overlay = textOverlayRef.current!;
    overlay.setPointerCapture(e.pointerId);
    textDragStartRef.current = toPtFromDiv(e, overlay);
    activeHandleRef.current = handle;
    dragSnapRef.current = { ...obj };
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
      const sampledHex = `#${[px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
      setColor(sampledHex);
      const targetTool = (prevBrushRef.current === "eraser" || prevToolRef.current === "eraser") ? "eraser" : "brush";
      selectTool(targetTool, prevBrushRef.current);
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

  /* ── Switch tool: single source of truth ── */
  function selectTool(tool: ActiveTool, bId?: BrushId) {
    if (selectedTextId) {
      const obj = textObjects.find(o => o.id === selectedTextId);
      if (obj && !obj.text.trim()) {
        setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
      }
    }
    setSelectedTextId(null);
    setTextMode("idle");

    if (tool === "eyedropper" && activeTool !== "eyedropper") {
      prevToolRef.current = activeTool;
      prevBrushRef.current = brush;
    }

    if (bId) {
      setBrush(bId);
    }
    setActiveTool(tool);
  }

  /* ── Computed values ── */
  const canUndo     = history.length > 1;
  const canRedo     = future.length > 0;
  const isWhiteColor = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#FFF";
  const cursorColor = isWhiteColor ? "#000000" : color;
  const selectedObj = textObjects.find(o => o.id === selectedTextId) ?? null;

  /* ── Fullscreen enter/exit ── */
  function enterFullscreen() {
    setIsInitializing(true);
    setLoadingProgress(15);

    setTimeout(() => setLoadingProgress(55), 120);
    setTimeout(() => setLoadingProgress(90), 260);
    setTimeout(() => {
      setLoadingProgress(100);
      setIsInitializing(false);
      setStarted(true);
      localStorage.setItem("doodle_studio_started", "true");
      fullscreenRef.current?.requestFullscreen?.().catch(() => {});
    }, 420);
  }

  function exitFullscreen() {
    setStarted(false);
    localStorage.setItem("doodle_studio_started", "false");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  useEffect(() => {
    // Keep started state synchronized with user action
  }, []);

  /* ── Welcome Splash (Cyber HUD Design Spec) ── */
  if (!started) {
    return (
      <div className="relative flex flex-col items-center justify-between select-none overflow-hidden rounded-bb-sm border-2 border-[#2B2540] bg-[#080810] p-4 md:p-6 text-[#F4F0E8] font-mono h-[calc(100vh-210px)] min-h-[400px] max-h-[640px] w-full mx-auto my-auto">

        {/* Cyber HUD Grid & Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "linear-gradient(to right, #2B2540 1px, transparent 1px), linear-gradient(to bottom, #2B2540 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}/>
        
        {/* HUD Crosshairs in Corners */}
        <div className="absolute top-3 left-3 text-xs text-[#885CF6]/50 pointer-events-none">+</div>
        <div className="absolute top-3 right-3 text-xs text-[#885CF6]/50 pointer-events-none">+</div>
        <div className="absolute bottom-3 left-3 text-xs text-[#885CF6]/50 pointer-events-none">+</div>
        <div className="absolute bottom-3 right-3 text-xs text-[#885CF6]/50 pointer-events-none">+</div>

        {/* ── 01. Top Telemetry Bar ── */}
        <div className="w-full flex items-center justify-between z-10 border-b border-[#2B2540]/60 pb-3 text-[10px] md:text-[11px] font-mono tracking-widest text-[#885CF6]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#F4F0E8]">SYS // DOODLE_STUDIO</span>
          </div>

          <div className="flex items-center gap-2 text-[#FF3B30] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-ping inline-block"/>
            <span>REC</span>
          </div>


        </div>

        {/* ── 02. Main Hero Interface ── */}
        <div className="relative w-full max-w-4xl flex flex-col items-center my-auto py-4 z-10 gap-6">

          {/* Loading Screen Overlay (State 06 from spec) */}
          {isInitializing ? (
            <div className="relative flex flex-col items-center justify-center p-8 border-2 border-[#B6FF00] bg-[#211331] rounded-bb-xs max-w-md w-full shadow-[4px_4px_0px_#000]">
              {/* HUD Corner Brackets */}
              <span className="absolute -top-1.5 -left-1.5 text-xs text-[#B6FF00] font-bold">┌</span>
              <span className="absolute -top-1.5 -right-1.5 text-xs text-[#B6FF00] font-bold">┐</span>
              <span className="absolute -bottom-1.5 -left-1.5 text-xs text-[#B6FF00] font-bold">└</span>
              <span className="absolute -bottom-1.5 -right-1.5 text-xs text-[#B6FF00] font-bold">┘</span>

              <div className="text-xs font-black text-[#F4F0E8] font-mono uppercase tracking-widest mb-3">
                INITIALIZING STUDIO PLEASE WAIT...
              </div>
              <div className="w-full h-3 bg-[#080810] border border-[#FF3B30]/50 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div className="h-full bg-[#FF3B30] rounded-full transition-all duration-150 shadow-[0_0_10px_#FF3B30]"
                  style={{ width: `${loadingProgress}%` }}/>
              </div>
              <div className="mt-3 text-[11px] font-mono font-bold text-[#885CF6] tracking-wider">
                LOADING ASSETS... [ {loadingProgress}% ]
              </div>
            </div>
          ) : (
            <>
              {/* Top Branding Header Row */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">



                {/* Headline Box with Corner HUD Brackets */}
                <div className="relative px-6 py-4 border border-[#885CF6]/30 bg-[#211331]/60 rounded-bb-xs text-center md:text-left">
                  {/* Corner brackets */}
                  <span className="absolute -top-1.5 -left-1.5 text-xs text-[#885CF6] font-bold">┌</span>
                  <span className="absolute -top-1.5 -right-1.5 text-xs text-[#885CF6] font-bold">┐</span>
                  <span className="absolute -bottom-1.5 -left-1.5 text-xs text-[#885CF6] font-bold">└</span>
                  <span className="absolute -bottom-1.5 -right-1.5 text-xs text-[#885CF6] font-bold">┘</span>



                  <div className="text-[10px] md:text-[11px] font-bold text-[#885CF6] tracking-widest font-mono uppercase mb-0.5">
                    WELCOME TO
                  </div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-none font-display">
                    <span className="text-[#F4F0E8] block sm:inline">DOODLE </span>
                    <span className="text-[#885CF6] block sm:inline">/STUDIO</span>
                  </h1>

                  <div className="mt-2.5 flex flex-col sm:flex-row items-center gap-2 text-xs md:text-sm font-bold font-mono tracking-wider">
                    <span className="text-[#F4F0E8]">DRAW WITHOUT LIMITS.</span>
                    <span className="text-[#B6FF00]">BREAK THE GRID.</span>
                  </div>
                </div>
              </div>

              {/* Primary Action Button Row */}
              <div className="flex items-center justify-center w-full mt-3">
                
                {/* Neon Lime Launch Button (Inset 25% space from sides relative to headline card above) */}
                <button
                  id="doodle-zone-start-btn"
                  onClick={enterFullscreen}
                  className="group relative flex items-center justify-center gap-3 w-3/4 sm:w-[70%] max-w-md py-3.5 px-6 rounded-bb-xs border-2 border-black bg-[#B6FF00] text-black font-black uppercase tracking-widest text-sm md:text-base font-mono shadow-[5px_5px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer active:shadow-none active:translate-x-[5px] active:translate-y-[5px]">
                  <span>[ ENTER STUDIO</span>
                  <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform stroke-[3]"/>
                  <span>]</span>
                </button>

              </div>


            </>
          )}
        </div>

        {/* ── 03. Step Flow Footer Bar ── */}
        <div className="w-full flex items-center justify-between z-10 border-t border-[#2B2540]/60 pt-3 text-[9px] md:text-[10px] font-mono text-[#885CF6]/70">
          <div className="flex items-center gap-2">
            <span className="text-[#B6FF00] font-bold">[01] CREATE</span>
            <span className="text-white/30">──→</span>
            <span className="text-[#885CF6] font-bold">[02] DRAW</span>
            <span className="text-white/30">──→</span>
            <span className="text-[#FF3B30] font-bold">[03] EXPORT</span>
          </div>



          <div className="text-[#885CF6]/50">
            DOODLE STUDIO v1.0.0
          </div>
        </div>
      </div>
    );
  }

  /* ── Render (Portaled directly to document.body to bypass parent framer-motion opacity animations) ── */
  const studioUI = (
    <div
      ref={fullscreenRef}
      className="flex flex-col gap-3 select-none bg-[#0D0B14]"
      style={{
        width: "100vw",
        height: "100dvh",
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        opacity: 1,
      }}
    >
      {/* ── Dark loading screen while canvas initializes (covers screen inside container so behind page is never seen) ── */}
      {!canvasReady && (
        <div className="absolute inset-0 z-[100000] bg-[#0D0B14] flex flex-col items-center justify-center gap-3 select-none">
          <div className="w-8 h-8 border-2 border-[#885CF6] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono font-bold text-[#885CF6] tracking-widest uppercase">SYS // INITIALIZING DOODLE STUDIO...</span>
        </div>
      )}

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
        <button onClick={() => selectTool(activeTool === "eraser" ? "brush" : "eraser", activeTool === "eraser" ? "pen" : "eraser")} title="Eraser"
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
        <button onClick={() => selectTool(activeTool === "eyedropper" ? "brush" : "eyedropper")} title="Color Picker"
          className={`flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 transition-colors ${
            eyedropper ? "bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]"
              : "border-bb-border bg-bb-bg text-bb-text-muted hover:border-bb-violet hover:text-bb-violet"}`}>
          <Pipette size={13}/>
        </button>

        {/* Fill */}
        <button onClick={() => selectTool(activeTool === "fill" ? "brush" : "fill")} title="Fill area"
          className={`flex items-center justify-center w-8 h-8 rounded-bb-xs border-2 transition-colors ${
            isFill ? "bg-bb-violet text-bb-violet-fg border-black shadow-[2px_2px_0px_#000]"
              : "border-bb-border bg-bb-bg text-bb-text-muted hover:border-bb-violet hover:text-bb-violet"}`}>
          <PaintBucket size={13}/>
        </button>

        {/* Text Tool */}
        <button onClick={() => selectTool(activeTool === "text" ? "brush" : "text")} title="Text Tool (drag to create)"
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
            <button key={c} title={c} onClick={() => pickColor(c)}
              className={`w-6 h-6 rounded-bb-xs border-2 transition-all ${color.toLowerCase()===c.toLowerCase() ? "border-white scale-110 shadow-md ring-2 ring-white z-10" : "border-black/60 hover:scale-105"}`}
              style={{ backgroundColor: c }}/>
          ))}
          {ROW_2.map(c => (
            <button key={c} title={c} onClick={() => pickColor(c)}
              className={`w-6 h-6 rounded-bb-xs border-2 transition-all ${color.toLowerCase()===c.toLowerCase() ? "border-white scale-110 shadow-md ring-2 ring-white z-10" : "border-black/60 hover:scale-105"}`}
              style={{ backgroundColor: c }}/>
          ))}
          {Array.from({ length: 10 }).map((_, idx) => {
            const cc = customColors[idx];
            return cc ? (
              <button key={`c-${idx}`} title={cc} onClick={() => pickColor(cc)}
                className={`w-6 h-6 rounded-bb-xs border-2 transition-all ${color.toLowerCase()===cc.toLowerCase() ? "border-white scale-110 shadow-md ring-2 ring-white z-10" : "border-black/60 hover:scale-105"}`}
                style={{ backgroundColor: cc }}/>
            ) : (
              <div key={`e-${idx}`} className="w-6 h-6 rounded-bb-xs border-2 border-bb-border/40 bg-bb-surface/30"/>
            );
          })}
        </div>
        <div className="flex-1"/>
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* Group of 4 Action Buttons shifted left */}
          <div className="flex items-center gap-1.5 mr-1 sm:mr-3">
            {/* 1. NEW Button (Green) */}
            <button onClick={() => setModalType("new")} title="Create New Canvas"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 border-black bg-[#B6FF00] text-black text-[11px] font-black uppercase tracking-wide font-mono shadow-[2px_2px_0px_#000] hover:brightness-110 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] cursor-pointer">
              <FilePlus size={13}/> New
            </button>

            {/* 2. SAVE DRAFT Button (Local Save without downloading) */}
            <button onClick={saveLocalDraft} title="Save changes locally (without downloading)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 border-black bg-[#885CF6] text-white text-[11px] font-bold uppercase tracking-wide font-mono shadow-[2px_2px_0px_#000] hover:brightness-110 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] cursor-pointer">
              <Save size={12}/> Save
            </button>

            {/* 3. EXPORT / DOWNLOAD Button (Choose path & export PNG) */}
            <button onClick={exportDrawingWithPathPicker} title="Export/Download drawing to specific file path"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 border-black bg-[#10B981] text-white text-[11px] font-bold uppercase tracking-wide font-mono shadow-[2px_2px_0px_#000] hover:brightness-110 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] cursor-pointer">
              <FolderDown size={12}/> Export
            </button>

            {/* 4. CLEAR Button (Triggers precautionary clear confirmation modal) */}
            <button onClick={() => setModalType("clear")} title="Clear all drawings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-bb-xs border-2 border-black bg-[#EF4444] text-white text-[11px] font-bold uppercase tracking-wide font-mono shadow-[2px_2px_0px_#000] hover:brightness-110 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] cursor-pointer">
              <Trash2 size={12}/> Clear
            </button>
          </div>

          <div className="w-px h-6 bg-bb-border mx-1"/>

          {/* 5. EXIT Button (Big & prominent with distinct space on right) */}
          <button onClick={() => setModalType("exit")} title="Exit studio (Esc)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-bb-xs border-2 border-black bg-[#DC2626] text-white text-[11px] font-black uppercase tracking-wide font-mono shadow-[2px_2px_0px_#000] hover:brightness-110 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] cursor-pointer shrink-0 ml-1">
            <X size={13}/> Exit
          </button>
        </div>
      </div>

      {/* ── Main: Brushes + Canvas Column ── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Brush sidebar */}
        <div className="flex flex-col justify-between bg-bb-surface border-2 border-bb-border rounded-bb-sm p-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 w-[84px] divide-y divide-bb-border/30">
          {BRUSHES.map(b => {
            const isActive = activeTool === "brush" && brush === b.id;
            const Icon = b.icon;
            return (
              <div key={b.id} className="flex-1 flex flex-col justify-center py-0.5">
                <button onClick={() => selectTool(b.id === "eraser" ? "eraser" : "brush", b.id)} title={b.desc}
                  className={["w-full flex flex-col items-center justify-center gap-1.5 h-full py-1.5 rounded-bb-xs border-2 text-center transition-all cursor-pointer",
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

        {/* Canvas Outer Viewport Container (shows scrollbars when zoomed in, allows panning) */}
        <div
          ref={containerRef}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={onViewportPointerUp}
          className={`flex-1 rounded-bb-sm border-2 border-bb-border overflow-auto bg-[#1A1724] relative custom-doodle-viewport select-none ${isPanning ? "cursor-grabbing" : ""}`}
        >
          {/* Centering Wrapper (keeps canvas in middle of screen by default with padding for resize handles) */}
          <div className="min-w-full min-h-full flex items-center justify-center p-8 md:p-12">
            
            {/* Scaled Canvas Wrapper */}
            <div
              className="relative bg-white shadow-2xl shrink-0"
              style={{
                width: `${Math.round(canvasDims.width * zoom)}px`,
                height: `${Math.round(canvasDims.height * zoom)}px`,
                minWidth: `${Math.round(canvasDims.width * zoom)}px`,
                minHeight: `${Math.round(canvasDims.height * zoom)}px`,
              }}
            >
              {/* ── MS Paint Canvas Resize Handles (8 classic white square handles with black border) ── */}
              {/* Top-Left */}
              <div
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-black z-40 cursor-nwse-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("nw", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Top-Left)"
              />
              {/* Top-Center */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-black z-40 cursor-ns-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("n", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Height)"
              />
              {/* Top-Right */}
              <div
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-black z-40 cursor-nesw-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("ne", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Top-Right)"
              />
              {/* Middle-Left */}
              <div
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-black z-40 cursor-ew-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("w", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Width)"
              />
              {/* Middle-Right */}
              <div
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-black z-40 cursor-ew-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("e", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Width)"
              />
              {/* Bottom-Left */}
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-black z-40 cursor-nesw-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("sw", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Bottom-Left)"
              />
              {/* Bottom-Center */}
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-black z-40 cursor-ns-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("s", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Height)"
              />
              {/* Bottom-Right */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-black z-40 cursor-nwse-resize hover:bg-[#B6FF00] shadow-sm"
                onPointerDown={e => onCanvasResizePointerDown("se", e)}
                onPointerMove={onCanvasResizePointerMove}
                onPointerUp={onCanvasResizePointerUp}
                title="Resize Canvas (Width & Height)"
              />

              {/* ── Cursor overlay (non-text mode) ── */}
              {cursorPt && !isText && (
                <div className="absolute pointer-events-none z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${cursorPt.x * zoom}px`, top: `${cursorPt.y * zoom}px` }}>
                  {isEraser && (
                    <div className="border-2 border-black bg-white/40 shadow-sm flex items-center justify-center"
                      style={{ width: `${Math.max(14, size * 4 * zoom)}px`, height: `${Math.max(14, size * 4 * zoom)}px` }}>
                      <Eraser size={Math.min(24, Math.max(10, size * 1.8 * zoom))} className="text-black"/>
                    </div>
                  )}
                  {!isEraser && eyedropper && <Pipette size={Math.max(18, 22 * zoom)} style={{ color: "#1a1a1a" }} strokeWidth={2}/>}
                  {!isEraser && !eyedropper && isFill && <PaintBucket size={Math.max(18, 22 * zoom)} style={{ color: "#1a1a1a" }} strokeWidth={2}/>}
                  {!isEraser && !eyedropper && !isFill && (
                    <Plus size={Math.max(14, size * 2.2 * zoom)} style={{ color: cursorColor }} strokeWidth={2.5}/>
                  )}
                </div>
              )}

              {/* ── Text overlay (sits above canvas, handles all text interactions) ── */}
              <div
                ref={textOverlayRef}
                className="absolute inset-0 z-20"
                style={{ pointerEvents: isText ? "auto" : "none", cursor: isText ? (textMode === "editing" ? "default" : "text") : "default" }}
                onPointerDown={onTextOverlayPointerDown}
                onPointerMove={onTextOverlayPointerMove}
                onPointerUp={onTextOverlayPointerUp}
                onPointerLeave={onTextOverlayPointerLeave}
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
                  const isSelected = isText && selectedTextId === obj.id;

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
                        outline: isSelected ? "2px dashed #885CF6" : "none",
                        boxSizing: "border-box",
                        overflow: "visible",
                        cursor: isText ? (isSelected ? "move" : "pointer") : "inherit",
                        pointerEvents: isText ? "auto" : "none",
                      }}
                      onPointerDown={e => {
                        if (!isText) return;
                        onTextObjectPointerDown(e, obj.id, "move");
                      }}
                    >
                      {/* Text area (editing/typing) */}
                      <textarea
                        autoFocus={isSelected}
                        readOnly={!isText}
                        value={obj.text}
                        onChange={ev => setTextObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: ev.target.value } : o))}
                        onPointerDown={ev => {
                          if (!isText) return;
                          ev.stopPropagation();
                          setSelectedTextId(obj.id);
                          setTextMode("editing");
                        }}
                        placeholder="Type here…"
                        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-2 box-border"
                        style={{
                          font: buildFont(obj),
                          color: obj.color,
                          textAlign: obj.align,
                          lineHeight: obj.lineHeight,
                          letterSpacing: `${obj.letterSpacing}px`,
                          textDecoration: obj.underline ? "underline" : "none",
                          pointerEvents: isText ? "auto" : "none",
                          cursor: isText ? "text" : "inherit",
                        }}
                      />

                      {/* ── Transform handles & Dustbin button (visible when selected) ── */}
                      {isSelected && (() => {
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
                            {/* 8 Resize handles */}
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
                                  zIndex: 10,
                                }}
                              />
                            ))}

                            {/* Move Handle Pill (Top-Left of text box) */}
                            <div
                              onPointerDown={e => onTextObjectPointerDown(e, obj.id, "move")}
                              title="Click and drag to move text anywhere on canvas"
                              className="absolute -top-7 left-0 z-30 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#B6FF00] text-black border border-black text-[10px] font-black uppercase font-mono shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-grab active:cursor-grabbing pointer-events-auto select-none"
                            >
                              <Move size={11}/>
                              <span>Move</span>
                            </div>

                            {/* Rotation handle */}
                            <div className="absolute flex flex-col items-center pointer-events-none"
                              style={{ left: obj.width / 2, top: -30, transform: "translateX(-50%)", zIndex: 30 }}>
                              <div
                                onPointerDown={e => onTextObjectPointerDown(e, obj.id, "rot")}
                                title="Click and drag to rotate text"
                                className="flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-[#6366f1] shadow-sm hover:scale-110 active:scale-95 transition-transform cursor-grab pointer-events-auto"
                              >
                                <RotateCw size={10} className="text-[#6366f1]"/>
                              </div>
                              <div style={{ width: 1.5, height: 12, background: "#6366f1", pointerEvents: "none" }}/>
                            </div>

                            {/* Red-on-hover Dustbin Delete Button (top right of text box) */}
                            <button
                              type="button"
                              onPointerDown={e => e.stopPropagation()}
                              onClick={e => {
                                e.stopPropagation();
                                saveSnapshot();
                                setTextObjects(prev => prev.filter(o => o.id !== obj.id));
                                setSelectedTextId(null);
                                setTextMode("idle");
                              }}
                              title="Delete text object"
                              className="absolute -top-3.5 -right-3.5 z-20 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-600 shadow-sm hover:bg-[#FF3B30] hover:text-white hover:border-[#FF3B30] transition-colors cursor-pointer"
                            >
                              <Trash2 size={13}/>
                            </button>
                          </>
                        );
                      })()}
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
                className="block w-full h-full touch-none bg-white"
                style={{ touchAction: "none", cursor: "none", backgroundColor: "#ffffff" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Studio Footer / Status Bar (Neon Green & Electric Purple Theme) ── */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-bb-xs border-2 border-black bg-[#1E192D] text-white shadow-[2px_2px_0px_#000] shrink-0 font-mono text-xs select-none">
        
        {/* Bottom Left: Dynamic MS Paint Status Indicators (Neon Green & Purple Theme) */}
        <div className="flex items-center gap-3 bg-[#15121E] border-2 border-[#A855F7] px-3 py-1 rounded-bb-xs text-[11px] font-semibold text-white shadow-[0_0_10px_rgba(168,85,247,0.35)]">
          {/* 1. Dynamic Cursor Coordinates */}
          <div className="flex items-center gap-1.5 min-w-[90px]" title="Cursor Position">
            <MousePointer size={12} className="text-[#C084FC]"/>
            <span className="text-white font-bold">{cursorPt ? `${Math.round(cursorPt.x)}, ${Math.round(cursorPt.y)}px` : "0, 0px"}</span>
          </div>

          <div className="w-px h-3.5 bg-white/20"/>

          {/* 2. Dynamic Selection / Box / Canvas Resize Size */}
          <div className="flex items-center gap-1.5 min-w-[16px]" title="Selection / Resize Box Size">
            <Crop size={12} className="text-[#C084FC]"/>
            {liveResizeDims ? (
              <span className="text-[#B6FF00] font-black">{liveResizeDims.w} × {liveResizeDims.h}px</span>
            ) : selectedTextId ? (() => {
              const sel = textObjects.find(o => o.id === selectedTextId);
              return sel ? <span className="text-white font-bold">{Math.round(sel.width)} × {Math.round(sel.height)}px</span> : null;
            })() : null}
          </div>

          <div className="w-px h-3.5 bg-white/20"/>

          {/* 3. Dynamic Canvas Dimensions */}
          <div className="flex items-center gap-1.5" title="Canvas Dimensions">
            <Maximize2 size={12} className="text-[#C084FC]"/>
            <span className="text-white font-bold">{canvasDims.width} × {canvasDims.height}px</span>
          </div>
        </div>

        {/* Bottom Right: Zoom Control Slider (Black Container with Borderless Controls) */}
        <div className="flex items-center gap-2 bg-[#0C0A10] border-2 border-[#FF3B30] px-3 py-1 rounded-bb-xs shadow-[0_0_12px_rgba(255,59,48,0.5)] text-white">
          {/* Zoom Out Button (Borderless) */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            disabled={zoom <= 0.5}
            title="Zoom Out"
            className="p-1 rounded bg-transparent hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white disabled:opacity-30 transition-all cursor-pointer active:scale-95"
          >
            <ZoomOut size={14}/>
          </button>

          {/* Zoom Range Slider */}
          <input
            type="range"
            min={50}
            max={300}
            step={5}
            value={Math.round(zoom * 100)}
            onChange={e => setZoom(+(+e.target.value / 100).toFixed(2))}
            className="w-24 md:w-32 h-2 accent-[#FF3B30] bg-[#2A2436] border border-white/20 rounded cursor-pointer"
            title="Zoom Level"
          />

          {/* Zoom In Button (Borderless) */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(3.0, +(z + 0.1).toFixed(2)))}
            disabled={zoom >= 3.0}
            title="Zoom In"
            className="p-1 rounded bg-transparent hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white disabled:opacity-30 transition-all cursor-pointer active:scale-95"
          >
            <ZoomIn size={14}/>
          </button>

          <div className="w-px h-4 bg-white/40 mx-0.5"/>

          {/* Editable Zoom Percentage Input Box */}
          <div className="flex items-center gap-0.5">
            <input
              type="text"
              value={zoomInputText !== null ? zoomInputText : `${Math.round(zoom * 100)}%`}
              onFocus={e => {
                setZoomInputText(`${Math.round(zoom * 100)}`);
                e.target.select();
              }}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setZoomInputText(val);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setZoomInputText(null);
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => {
                if (zoomInputText !== null && zoomInputText !== "") {
                  const parsed = parseInt(zoomInputText, 10);
                  if (!isNaN(parsed)) {
                    const clamped = Math.min(300, Math.max(50, parsed));
                    setZoom(+(clamped / 100).toFixed(2));
                  }
                }
                setZoomInputText(null);
              }}
              title="Click to edit zoom percentage (50% - 300%). Press Enter to set."
              className="w-14 text-center py-0.5 text-[11px] font-mono font-black text-white bg-transparent hover:bg-[#FF3B30]/30 focus:bg-[#FF3B30] rounded border border-transparent focus:border-white outline-none cursor-text transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Toast Notification Popup ── */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#10B981] border-2 border-black text-white px-4 py-2 rounded-bb-xs font-mono font-extrabold text-xs shadow-[4px_4px_0px_#000] animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={16}/>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Precautionary Action Confirmation Modals ── */}
      {modalType !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#15121E] border-2 border-[#B6FF00] p-6 rounded-bb-xs shadow-[8px_8px_0px_#000] text-[#F4F0E8] font-mono flex flex-col gap-4">
            
            {/* 1. NEW CANVAS PRECAUTIONARY MODAL */}
            {modalType === "new" && (
              <>
                <div className="flex items-center justify-between border-b border-[#2D283E] pb-3">
                  <div className="flex items-center gap-2 text-[#B6FF00] font-black text-sm uppercase tracking-wider">
                    <FilePlus size={16}/>
                    <span>CREATE NEW CANVAS</span>
                  </div>
                  <button type="button" onClick={() => setModalType("none")} className="text-white/60 hover:text-white transition-colors cursor-pointer p-1">
                    <X size={16}/>
                  </button>
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-semibold">
                  Do you want to export your current drawing before creating a brand new canvas?
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button type="button" onClick={() => handleNewCanvas(true)} className="w-full sm:w-auto px-4 py-2 bg-[#B6FF00] text-black font-black text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs shadow-[3px_3px_0px_#000] hover:brightness-110 transition-all cursor-pointer">
                    Export & New
                  </button>
                  <button type="button" onClick={() => handleNewCanvas(false)} className="w-full sm:w-auto px-4 py-2 bg-[#FF3B30] text-white font-black text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs shadow-[3px_3px_0px_#000] hover:brightness-110 transition-all cursor-pointer">
                    Don't Save
                  </button>
                  <button type="button" onClick={() => setModalType("none")} className="w-full sm:w-auto px-4 py-2 bg-[#2D283E] text-white/80 font-bold text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs hover:text-white transition-all cursor-pointer">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* 2. CLEAR DRAWINGS PRECAUTIONARY MODAL */}
            {modalType === "clear" && (
              <>
                <div className="flex items-center justify-between border-b border-[#2D283E] pb-3">
                  <div className="flex items-center gap-2 text-[#FF3B30] font-black text-sm uppercase tracking-wider">
                    <AlertTriangle size={16}/>
                    <span>CLEAR ALL DRAWINGS?</span>
                  </div>
                  <button type="button" onClick={() => setModalType("none")} className="text-white/60 hover:text-white transition-colors cursor-pointer p-1">
                    <X size={16}/>
                  </button>
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-semibold">
                  Are you sure you want to clear all drawings and text from the canvas? Your canvas dimensions will remain intact, but current artwork will be wiped.
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button type="button" onClick={confirmClearCanvas} className="px-4 py-2 bg-[#FF3B30] text-white font-black text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs shadow-[3px_3px_0px_#000] hover:brightness-110 transition-all cursor-pointer">
                    Clear Artwork
                  </button>
                  <button type="button" onClick={() => setModalType("none")} className="px-4 py-2 bg-[#2D283E] text-white/80 font-bold text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs hover:text-white transition-all cursor-pointer">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* 3. EXIT STUDIO PRECAUTIONARY MODAL */}
            {modalType === "exit" && (
              <>
                <div className="flex items-center justify-between border-b border-[#2D283E] pb-3">
                  <div className="flex items-center gap-2 text-[#885CF6] font-black text-sm uppercase tracking-wider">
                    <AlertTriangle size={16}/>
                    <span>EXIT DOODLE STUDIO?</span>
                  </div>
                  <button type="button" onClick={() => setModalType("none")} className="text-white/60 hover:text-white transition-colors cursor-pointer p-1">
                    <X size={16}/>
                  </button>
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-semibold">
                  Are you sure you want to exit the studio? You can save changes locally before leaving or exit directly.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button type="button" onClick={() => confirmExit(true)} className="w-full sm:w-auto px-4 py-2 bg-[#885CF6] text-white font-black text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs shadow-[3px_3px_0px_#000] hover:brightness-110 transition-all cursor-pointer">
                    Save Draft & Exit
                  </button>
                  <button type="button" onClick={() => confirmExit(false)} className="w-full sm:w-auto px-4 py-2 bg-[#FF3B30] text-white font-black text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs shadow-[3px_3px_0px_#000] hover:brightness-110 transition-all cursor-pointer">
                    Exit Without Saving
                  </button>
                  <button type="button" onClick={() => setModalType("none")} className="w-full sm:w-auto px-4 py-2 bg-[#2D283E] text-white/80 font-bold text-xs uppercase tracking-wider border-2 border-black rounded-bb-xs hover:text-white transition-all cursor-pointer">
                    Cancel
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(studioUI, document.body) : studioUI;
}

/* ── Float keyframe & MS Paint Custom Scrollbars (injected once) ── */
if (typeof document !== "undefined") {
  let s = document.getElementById("doodle-float-style") as HTMLStyleElement | null;
  if (!s) {
    s = document.createElement("style");
    s.id = "doodle-float-style";
    document.head.appendChild(s);
  }
  s.textContent = `
    @keyframes float { from { transform: translateY(0px) rotate(var(--r, 0deg)); } to { transform: translateY(-8px) rotate(var(--r, 0deg)); } }
    
    /* MS Paint Style Scrollbars - Neon Green & Purple Theme */
    .custom-doodle-viewport::-webkit-scrollbar {
      width: 14px;
      height: 14px;
    }
    .custom-doodle-viewport::-webkit-scrollbar-track {
      background: #15121E;
      border-top: 1px solid #3E2F5B;
      border-left: 1px solid #3E2F5B;
    }
    .custom-doodle-viewport::-webkit-scrollbar-thumb {
      background: #A855F7;
      border-radius: 7px;
      border: 2px solid #15121E;
      box-shadow: 0 0 10px #A855F7;
    }
    .custom-doodle-viewport::-webkit-scrollbar-thumb:hover {
      background: #C084FC;
      box-shadow: 0 0 14px #C084FC;
    }
    .custom-doodle-viewport::-webkit-scrollbar-button:single-button {
      background-color: #A855F7;
      display: block;
      border: 1px solid #C084FC;
      background-size: 8px;
      background-repeat: no-repeat;
      background-position: center;
    }
    .custom-doodle-viewport::-webkit-scrollbar-button:single-button:hover {
      background-color: #C084FC;
    }
    /* Up Arrow */
    .custom-doodle-viewport::-webkit-scrollbar-button:single-button:vertical:decrement {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><polyline points='18 15 12 9 6 15'/></svg>");
    }
    /* Down Arrow */
    .custom-doodle-viewport::-webkit-scrollbar-button:single-button:vertical:increment {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
    }
    /* Left Arrow */
    .custom-doodle-viewport::-webkit-scrollbar-button:single-button:horizontal:decrement {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><polyline points='15 18 9 12 15 6'/></svg>");
    }
    /* Right Arrow */
    .custom-doodle-viewport::-webkit-scrollbar-button:single-button:horizontal:increment {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'/></svg>");
    }
  `;
}
