import { useRef, useEffect, useCallback, useState } from "react";
import { Pipette } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return {
    h,
    s: max === 0 ? 0 : Math.round((d / max) * 100),
    v: Math.round(max * 100),
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isValidHex(v) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v);
}

// ── SV Canvas ────────────────────────────────────────────────────────────────

function SatValCanvas({ hue, sat, val, onChange }) {
  const canvasRef = useRef(null);
  const dragging = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width: w, height: h } = canvas;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, h);
    const wg = ctx.createLinearGradient(0, 0, w, 0);
    wg.addColorStop(0, "rgba(255,255,255,1)");
    wg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, h, 0, 0);
    bg.addColorStop(0, "rgba(0,0,0,1)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  useEffect(() => { draw(); }, [draw]);

  const pick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(cx - rect.left, rect.width));
    const y = Math.max(0, Math.min(cy - rect.top, rect.height));
    onChange(Math.round((x / rect.width) * 100), Math.round((1 - y / rect.height) * 100));
  }, [onChange]);

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden select-none cursor-crosshair"
      style={{ height: 140 }}
      onMouseDown={(e) => { dragging.current = true; pick(e); }}
      onMouseMove={(e) => { if (dragging.current) pick(e); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={(e) => { dragging.current = true; pick(e); }}
      onTouchMove={(e) => { if (dragging.current) pick(e); }}
      onTouchEnd={() => { dragging.current = false; }}
    >
      <canvas ref={canvasRef} width={400} height={140} className="w-full h-full" />
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${sat}%`,
          top: `${100 - val}%`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

// ── Hue Slider ───────────────────────────────────────────────────────────────

function HueSlider({ hue, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const pick = useCallback((e) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(cx - rect.left, rect.width));
    onChange(Math.round((x / rect.width) * 360));
  }, [onChange]);

  return (
    <div
      ref={trackRef}
      className="relative select-none cursor-pointer"
      style={{ height: 14 }}
      onMouseDown={(e) => { dragging.current = true; pick(e); }}
      onMouseMove={(e) => { if (dragging.current) pick(e); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={(e) => { dragging.current = true; pick(e); }}
      onTouchMove={(e) => { if (dragging.current) pick(e); }}
      onTouchEnd={() => { dragging.current = false; }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
      />
      <div
        className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${(hue / 360) * 100}%`,
          backgroundColor: `hsl(${hue},100%,50%)`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

// ── Main ColorPicker ─────────────────────────────────────────────────────────

export default function ColorPicker({ color, onChange }) {
  const init = rgbToHsv(...Object.values(hexToRgb(color)));
  const [hsv, setHsv] = useState(init);
  const [hexInput, setHexInput] = useState(color.toUpperCase());
  const [hexErr, setHexErr] = useState(false);

  useEffect(() => {
    const next = rgbToHsv(...Object.values(hexToRgb(color)));
    setHsv(next);
    setHexInput(color.toUpperCase());
    setHexErr(false);
  }, [color]);

  const emit = (next) => {
    const rgb = hsvToRgb(next.h, next.s, next.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  const handleSV  = (s, v) => { const n = { ...hsv, s, v }; setHsv(n); emit(n); };
  const handleHue = (h)    => { const n = { ...hsv, h };    setHsv(n); emit(n); };

  const handleHexInput = (val) => {
    setHexInput(val);
    if (isValidHex(val)) {
      setHexErr(false);
      const next = rgbToHsv(...Object.values(hexToRgb(val)));
      setHsv(next);
      onChange(val);
    } else {
      setHexErr(true);
    }
  };

  const currentHex = rgbToHex(...Object.values(hsvToRgb(hsv.h, hsv.s, hsv.v)));

  return (
    <div
      className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border p-3 space-y-2.5"
      style={{ width: 260 }}
      // stop clicks inside the picker from bubbling to the outside-click handler
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <SatValCanvas hue={hsv.h} sat={hsv.s} val={hsv.v} onChange={handleSV} />
      <HueSlider hue={hsv.h} onChange={handleHue} />

      {/* Hex row */}
      <div className="flex gap-2 items-center">
        <div className={`flex items-center gap-2 flex-1 bg-gray-50 dark:bg-dark-surface border rounded-xl px-2.5 py-1.5 ${hexErr ? "border-red-400" : "border-gray-200 dark:border-dark-border"}`}>
          <div
            className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: currentHex }}
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            maxLength={7}
            className={`flex-1 bg-transparent text-xs font-mono font-semibold outline-none ${hexErr ? "text-red-500" : "text-gray-800 dark:text-white"}`}
          />
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-card transition-colors flex-shrink-0"
          title="Pick from screen"
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.EyeDropper) return;
            try {
              const result = await new window.EyeDropper().open();
              handleHexInput(result.sRGBHex);
            } catch { /* cancelled */ }
          }}
        >
          <Pipette size={13} />
        </button>
      </div>
    </div>
  );
}
