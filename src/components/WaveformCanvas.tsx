import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine, KeySoundTrigger } from '../audio/audioEngine';
import { Maximize2, Minimize2, Sliders, Sparkles, RefreshCw, Eye } from 'lucide-react';

export type VisualizerMode = 'oscilloscope' | 'frequency_bars' | 'circular_radar' | 'laser_ribbon';
export type VisualizerTheme = 'cyan' | 'amber' | 'emerald' | 'violet' | 'ice';

interface WaveformCanvasProps {
  lastTrigger: KeySoundTrigger | null;
  activeKeys: Set<string>;
}

const THEME_PALETTES: Record<VisualizerTheme, {
  primary: string;
  glow: string;
  secondary: string;
  gradientStart: string;
  gradientEnd: string;
  bgGlow: string;
}> = {
  cyan: {
    primary: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.65)',
    secondary: '#22D3EE',
    gradientStart: '#06B6D4',
    gradientEnd: '#3B82F6',
    bgGlow: 'rgba(6, 182, 212, 0.04)',
  },
  amber: {
    primary: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.65)',
    secondary: '#FBBF24',
    gradientStart: '#F59E0B',
    gradientEnd: '#EF4444',
    bgGlow: 'rgba(245, 158, 11, 0.04)',
  },
  emerald: {
    primary: '#10B981',
    glow: 'rgba(16, 185, 129, 0.65)',
    secondary: '#34D399',
    gradientStart: '#10B981',
    gradientEnd: '#06B6D4',
    bgGlow: 'rgba(16, 185, 129, 0.04)',
  },
  violet: {
    primary: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.65)',
    secondary: '#A78BFA',
    gradientStart: '#8B5CF6',
    gradientEnd: '#EC4899',
    bgGlow: 'rgba(139, 92, 246, 0.04)',
  },
  ice: {
    primary: '#E2E8F0',
    glow: 'rgba(226, 232, 240, 0.55)',
    secondary: '#94A3B8',
    gradientStart: '#F8FAFC',
    gradientEnd: '#64748B',
    bgGlow: 'rgba(255, 255, 255, 0.03)',
  },
};

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ lastTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<VisualizerMode>('oscilloscope');
  const [theme, setTheme] = useState<VisualizerTheme>('cyan');
  const [gainBoost, setGainBoost] = useState<number>(1.4);
  const [persistence, setPersistence] = useState<number>(0.28); // Phosphor decay
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Telemetry HUD state
  const [hudMetrics, setHudMetrics] = useState({
    rms: 0,
    peakDb: -90,
    dominantFreq: 0,
  });

  // Waterfall history for laser ribbon mode
  const ribbonHistoryRef = useRef<Float32Array[]>([]);
  // Peak bar history for frequency mode
  const peakHoldRef = useRef<number[]>([]);
  // Key ripple shockwaves
  const ripplesRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; alpha: number; note: string }[]>([]);

  // Add ripple shockwave on key trigger
  useEffect(() => {
    if (!lastTrigger || !canvasRef.current) return;
    const canvas = canvasRef.current;
    // Disperse ripple based on frequency
    const normX = Math.min(Math.max((lastTrigger.frequency - 80) / 1200, 0.15), 0.85);
    const x = canvas.width * normX;
    const y = canvas.height * 0.5;

    ripplesRef.current.push({
      x,
      y,
      radius: 5,
      maxRadius: Math.max(canvas.width, canvas.height) * 0.45,
      alpha: 0.9,
      note: lastTrigger.noteName,
    });

    if (ripplesRef.current.length > 8) {
      ripplesRef.current.shift();
    }
  }, [lastTrigger]);

  // Main visualizer animation loop
  useEffect(() => {
    let animId: number;
    let lastHudUpdate = performance.now();

    const timeDomainBuffer = new Uint8Array(1024);
    const frequencyBuffer = new Uint8Array(256);

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const palette = THEME_PALETTES[theme];

      // Pull Web Audio stream buffers
      audioEngine.getTimeDomainData(timeDomainBuffer);
      audioEngine.getFrequencyData(frequencyBuffer);

      // Periodic HUD metrics calculation
      if (now - lastHudUpdate > 80) {
        setHudMetrics(audioEngine.getLiveMetrics());
        lastHudUpdate = now;
      }

      // Phosphor persistence decay clearing
      ctx.fillStyle = `rgba(8, 9, 12, ${Math.max(0.12, 1 - persistence)})`;
      ctx.fillRect(0, 0, width, height);

      // Subtle reticle grid lines
      drawReticleGrid(ctx, width, height);

      // Render mode
      switch (mode) {
        case 'oscilloscope':
          drawOscilloscope(ctx, width, height, timeDomainBuffer, palette, gainBoost);
          break;
        case 'frequency_bars':
          drawFrequencyBars(ctx, width, height, frequencyBuffer, palette, peakHoldRef);
          break;
        case 'circular_radar':
          drawCircularRadar(ctx, width, height, timeDomainBuffer, frequencyBuffer, palette, gainBoost);
          break;
        case 'laser_ribbon':
          drawLaserRibbon(ctx, width, height, timeDomainBuffer, palette, ribbonHistoryRef);
          break;
      }

      // Draw active keystroke shockwave ripples
      drawRipples(ctx, ripplesRef.current, palette);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode, theme, gainBoost, persistence]);

  // Handle canvas resize with retina devicePixelRatio
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full rounded-xl overflow-hidden bg-[#08090C] border border-slate-800/80 transition-all ${
        isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-[340px] md:h-[380px]'
      }`}
    >
      {/* Top HUD Toolbar: Mode Selector & Telemetry Readouts */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#08090C]/85 backdrop-blur-md border-b border-slate-800/60">
        
        {/* Visualizer Mode Tabs (Functional Segmented Buttons) */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setMode('oscilloscope')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              mode === 'oscilloscope'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oscilloscope
          </button>
          <button
            onClick={() => setMode('frequency_bars')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              mode === 'frequency_bars'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FFT Spectrum
          </button>
          <button
            onClick={() => setMode('laser_ribbon')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              mode === 'laser_ribbon'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Laser Ribbon
          </button>
          <button
            onClick={() => setMode('circular_radar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              mode === 'circular_radar'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Radial Cymatics
          </button>
        </div>

        {/* Real-time Telemetry Metrics (Clean unboxed tabular numerals) */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">Peak Level</span>
            <span className="text-slate-200 font-semibold tabular-nums">{hudMetrics.peakDb.toFixed(1)} dB</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">RMS Energy</span>
            <span className="text-slate-200 font-semibold tabular-nums">{(hudMetrics.rms * 100).toFixed(0)}%</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">Centroid</span>
            <span className="text-cyan-400 font-semibold tabular-nums">{hudMetrics.dominantFreq} Hz</span>
          </div>
          {lastTrigger && (
            <>
              <span className="text-slate-700">·</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase text-slate-500">Last Key</span>
                <span className="text-amber-400 font-semibold uppercase">{lastTrigger.key === ' ' ? 'SPACE' : lastTrigger.key} ({lastTrigger.noteName})</span>
              </div>
            </>
          )}
        </div>

        {/* Phosphor Theme & Gain Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Color Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {(['cyan', 'amber', 'emerald', 'violet', 'ice'] as VisualizerTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                title={`Switch palette: ${t}`}
                className={`w-4 h-4 rounded-full transition-transform ${
                  theme === t ? 'scale-125 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: THEME_PALETTES[t].primary }}
              />
            ))}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Element */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Bottom Visualizer Parameter Ribbon */}
      <div className="absolute bottom-2 left-4 right-4 z-10 flex items-center justify-between text-[11px] text-slate-500 pointer-events-none">
        <div className="flex items-center gap-3 bg-[#08090C]/80 px-2.5 py-1 rounded-md backdrop-blur border border-slate-800/60 pointer-events-auto">
          <span className="text-slate-400 font-mono">GAIN</span>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={gainBoost}
            onChange={(e) => setGainBoost(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-700 accent-cyan-400 rounded cursor-pointer"
          />
          <span className="font-mono text-slate-300 tabular-nums w-8">{gainBoost.toFixed(1)}x</span>
        </div>

        <div className="flex items-center gap-3 bg-[#08090C]/80 px-2.5 py-1 rounded-md backdrop-blur border border-slate-800/60 pointer-events-auto">
          <span className="text-slate-400 font-mono">TRAIL</span>
          <input
            type="range"
            min="0.05"
            max="0.6"
            step="0.05"
            value={persistence}
            onChange={(e) => setPersistence(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-700 accent-cyan-400 rounded cursor-pointer"
          />
          <span className="font-mono text-slate-300 tabular-nums w-8">{Math.round(persistence * 100)}%</span>
        </div>

        <div className="hidden sm:block font-mono text-[10px] text-slate-500">
          REAL-TIME 48kHz SAMPLING
        </div>
      </div>
    </div>
  );
};

// --- Drawing Helper Algorithms ---

function drawReticleGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.lineWidth = 1;

  // Horizontal division lines (dB scale simulation)
  const rows = 6;
  for (let i = 1; i < rows; i++) {
    const y = (height / rows) * i;
    ctx.beginPath();
    ctx.setLineDash(i === rows / 2 ? [4, 4] : [1, 6]);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Vertical time grid lines
  const cols = 10;
  for (let i = 1; i < cols; i++) {
    const x = (width / cols) * i;
    ctx.beginPath();
    ctx.setLineDash([1, 8]);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOscilloscope(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Uint8Array,
  palette: typeof THEME_PALETTES['cyan'],
  gain: number
) {
  ctx.save();
  const centerY = height / 2;
  const sliceWidth = width / (data.length - 1);

  // Outer phosphor glow pass
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    const norm = (data[i] - 128) / 128; // -1 to +1
    const amplified = norm * gain;
    const y = centerY + amplified * (height * 0.42);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  ctx.stroke();

  // Crisp inner beam pass
  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.secondary;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawFrequencyBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Uint8Array,
  palette: typeof THEME_PALETTES['cyan'],
  peakHoldRef: React.MutableRefObject<number[]>
) {
  ctx.save();
  const barCount = 48;
  const barWidth = Math.floor(width / barCount);
  const gap = 2;
  const usableWidth = barWidth - gap;

  // Initialize peak array if needed
  if (peakHoldRef.current.length !== barCount) {
    peakHoldRef.current = new Array(barCount).fill(0);
  }

  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, palette.gradientEnd);
  gradient.addColorStop(0.7, palette.primary);
  gradient.addColorStop(1, '#FFFFFF');

  for (let i = 0; i < barCount; i++) {
    // Map logarithmically to lower/mid frequencies where musical notes live
    const dataIndex = Math.min(Math.floor(Math.pow(i / barCount, 1.6) * data.length), data.length - 1);
    const value = data[dataIndex] / 255;
    const barHeight = Math.max(value * (height * 0.85), 3);
    const x = i * barWidth;
    const y = height - barHeight;

    // Peak hold physics
    if (barHeight > peakHoldRef.current[i]) {
      peakHoldRef.current[i] = barHeight;
    } else {
      peakHoldRef.current[i] = Math.max(0, peakHoldRef.current[i] - 1.2);
    }

    // Bar fill
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, usableWidth, barHeight);

    // Peak cap line
    const peakY = height - peakHoldRef.current[i];
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, peakY - 2, usableWidth, 2);
  }

  ctx.restore();
}

function drawLaserRibbon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Uint8Array,
  palette: typeof THEME_PALETTES['cyan'],
  historyRef: React.MutableRefObject<Float32Array[]>
) {
  ctx.save();
  // Downsample current frame into history buffer
  const samplePoints = 80;
  const currentSample = new Float32Array(samplePoints);
  const step = Math.floor(data.length / samplePoints);

  for (let i = 0; i < samplePoints; i++) {
    currentSample[i] = (data[i * step] - 128) / 128;
  }

  historyRef.current.unshift(currentSample);
  if (historyRef.current.length > 14) {
    historyRef.current.pop();
  }

  const ribbonCount = historyRef.current.length;
  const centerY = height * 0.55;

  // Render from back (older) to front (newest)
  for (let r = ribbonCount - 1; r >= 0; r--) {
    const frame = historyRef.current[r];
    const alpha = (1 - r / ribbonCount) * 0.85;
    const yOffset = (r / ribbonCount) * (height * 0.38) - (height * 0.15);
    const perspectiveScale = 1 - (r / ribbonCount) * 0.35;

    ctx.strokeStyle = r === 0 ? palette.secondary : palette.primary;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = r === 0 ? 2 : 1.2;

    ctx.beginPath();
    const sliceW = (width * perspectiveScale) / (samplePoints - 1);
    const startX = (width - width * perspectiveScale) / 2;

    for (let i = 0; i < samplePoints; i++) {
      const x = startX + i * sliceW;
      const y = centerY + yOffset + frame[i] * (height * 0.22 * perspectiveScale);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawCircularRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeData: Uint8Array,
  freqData: Uint8Array,
  palette: typeof THEME_PALETTES['cyan'],
  gain: number
) {
  ctx.save();
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.28;

  // Energy pulse
  let totalEnergy = 0;
  for (let i = 0; i < 32; i++) totalEnergy += freqData[i];
  const pulseBonus = (totalEnergy / 32 / 255) * 22;

  // Concentric radar guide circles
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 6]);
  [0.5, 0.8, 1.0, 1.3].forEach((mul) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * mul, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Deformed acoustic ring
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  const points = 120;
  const step = Math.floor(timeData.length / points);

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const sampleIdx = (i % points) * step;
    const norm = (timeData[sampleIdx] - 128) / 128;
    const r = baseRadius + pulseBonus + norm * (45 * gain);

    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner core glow
  ctx.fillStyle = palette.bgGlow;
  ctx.fill();

  ctx.restore();
}

function drawRipples(
  ctx: CanvasRenderingContext2D,
  ripples: { x: number; y: number; radius: number; maxRadius: number; alpha: number; note: string }[],
  palette: typeof THEME_PALETTES['cyan']
) {
  ctx.save();
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rip = ripples[i];
    rip.radius += 4;
    rip.alpha *= 0.94;

    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = Math.max(0, rip.alpha);

    ctx.beginPath();
    ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Small note name tag floating upward
    if (rip.alpha > 0.3) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(rip.note, rip.x - 8, rip.y - rip.radius - 4);
    }

    if (rip.alpha <= 0.02 || rip.radius >= rip.maxRadius) {
      ripples.splice(i, 1);
    }
  }
  ctx.restore();
}
