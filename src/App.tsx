import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WaveformCanvas 
} from './components/WaveformCanvas';
import { 
  VirtualKeyboard 
} from './components/VirtualKeyboard';
import { 
  TypingConsole 
} from './components/TypingConsole';
import { 
  SoundControls 
} from './components/SoundControls';
import { 
  audioEngine, 
  KeySoundTrigger 
} from './audio/audioEngine';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  Activity, 
  Sparkles, 
  Sliders, 
  Keyboard, 
  Layers, 
  HelpCircle,
  Play
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'visualizer' | 'designer' | 'guide'>('studio');
  const [text, setText] = useState<string>('');
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [keyCounts, setKeyCounts] = useState<Record<string, number>>({});
  const [lastTrigger, setLastTrigger] = useState<KeySoundTrigger | null>(null);
  const [audioStarted, setAudioStarted] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [profileRevision, setProfileRevision] = useState<number>(0);

  // WPM & KPS Calculation state
  const [wpm, setWpm] = useState<number>(0);
  const [kps, setKps] = useState<number>(0);
  const keystrokeTimestampsRef = useRef<number[]>([]);

  // Calculate live WPM & KPS
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Keep keystrokes within last 60 seconds
      keystrokeTimestampsRef.current = keystrokeTimestampsRef.current.filter((t) => now - t <= 60000);

      const count = keystrokeTimestampsRef.current.length;
      // WPM = (keystrokes / 5) * (60000 / windowMs)
      const calculatedWpm = Math.round((count / 5));
      setWpm(calculatedWpm);

      // KPS = keystrokes in last 3 seconds
      const recentCount = keystrokeTimestampsRef.current.filter((t) => now - t <= 3000).length;
      setKps(Math.round((recentCount / 3) * 10) / 10);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Handle a key press event (either from physical keyboard or virtual keyboard)
  const handleKeyTrigger = useCallback(async (key: string, code: string) => {
    // Ensure audio context is running
    if (!audioEngine.isRunning) {
      await audioEngine.init();
      setAudioStarted(true);
    }

    const trigger = audioEngine.triggerKey(key, code);
    if (trigger) {
      setLastTrigger(trigger);
    }

    // Register keystroke for typing telemetry
    keystrokeTimestampsRef.current.push(Date.now());

    // Update active keys set
    const lowerKey = key.toLowerCase();
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.add(lowerKey);
      next.add(code.toLowerCase());
      return next;
    });

    // Update key press counts for heatmap
    setKeyCounts((prev) => ({
      ...prev,
      [lowerKey]: (prev[lowerKey] || 0) + 1,
    }));

    // Auto-release active key after momentary duration (for virtual clicks or quick taps)
    setTimeout(() => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(lowerKey);
        next.delete(code.toLowerCase());
        return next;
      });
    }, 120);
  }, []);

  // Global physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing with Alt or Ctrl shortcuts like reload
      if (e.ctrlKey && e.key !== 'Control') return;
      if (e.metaKey) return;

      const lowerKey = e.key.toLowerCase();
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.add(lowerKey);
        next.add(e.code.toLowerCase());
        return next;
      });

      handleKeyTrigger(e.key, e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const lowerKey = e.key.toLowerCase();
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(lowerKey);
        next.delete(e.code.toLowerCase());
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyTrigger]);

  const startAudioSession = async () => {
    await audioEngine.init();
    setAudioStarted(true);
    audioEngine.triggerKey('c', 'KeyC');
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 flex flex-col font-sans">
      
      {/* 1. TOP BAR CONTRACT: EXACTLY 3 ZONES */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0A0D14]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
        
        {/* Zone 1: Single text element wordmark */}
        <a href="/" className="text-lg font-bold tracking-tight text-slate-100 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span>WaveKey Studio</span>
        </a>

        {/* Zone 2: 4 single-line nav tabs with subtle hover underlines */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button 
            onClick={() => setActiveTab('studio')} 
            className={`transition-colors whitespace-nowrap shrink-0 ${activeTab === 'studio' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            Studio Console
          </button>
          <button 
            onClick={() => setActiveTab('visualizer')} 
            className={`transition-colors whitespace-nowrap shrink-0 ${activeTab === 'visualizer' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            Acoustic Visualizer
          </button>
          <button 
            onClick={() => setActiveTab('designer')} 
            className={`transition-colors whitespace-nowrap shrink-0 ${activeTab === 'designer' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            Sound Designer
          </button>
          <button 
            onClick={() => setActiveTab('guide')} 
            className={`transition-colors whitespace-nowrap shrink-0 ${activeTab === 'guide' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            Acoustic Guide
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {!audioStarted ? (
            <button
              onClick={startAudioSession}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Enable Audio</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => audioEngine.toggleMicrophone()}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  audioEngine.isMicActive
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                <span>{audioEngine.isMicActive ? 'Mic Streaming' : 'Mic Input'}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">

        {/* Welcome & Technical Lead-In (Zero pills, clean unboxed metadata) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
              Waveform Acoustic Keyboard
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Every keystroke synthesizes polyphonic resonant frequencies and renders live time-domain waves and spectrographic beams in real time.
            </p>
          </div>

          {/* Unboxed Metadata with Typographic Separators */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 whitespace-nowrap">
            <span>Web Audio 48kHz</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>4 Visual Modes</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Low-Latency DSP</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>ANSI 65%</span>
          </div>
        </div>

        {/* First Gesture Audio Unlock Notice (If AudioContext suspended) */}
        {!audioStarted && (
          <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-cyan-200">Audio Synthesis Engine Ready:</span> Tap any key or click "Start Audio" to initialize high-fidelity Web Audio synthesis and visualizer streams.
              </div>
            </div>
            <button
              onClick={startAudioSession}
              className="px-4 py-2 text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
            >
              Start Audio Engine
            </button>
          </div>
        )}

        {/* TAB 1: STUDIO CONSOLE (Primary full-featured unified workstation) */}
        {(activeTab === 'studio' || activeTab === 'visualizer') && (
          <div className="flex flex-col gap-6">
            
            {/* Real-Time Waveform Visualizer Canvas */}
            <section aria-label="Real-Time Waveform Visualizer">
              <WaveformCanvas 
                lastTrigger={lastTrigger} 
                activeKeys={activeKeys} 
              />
            </section>

            {/* Interactive Virtual Mechanical Keyboard */}
            <section aria-label="Virtual Mechanical Keyboard" className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Interactive Mechanical Keyboard Layout</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  PHYSICAL KEYSTROKE & MULTI-TOUCH DETECT
                </div>
              </div>

              <VirtualKeyboard
                key={`vk-studio-${profileRevision}`}
                activeKeys={activeKeys}
                keyCounts={keyCounts}
                onKeyPress={handleKeyTrigger}
                showNotes={showNotes}
              />
            </section>

            {/* Live Typing Console & Rhythm Telemetry */}
            <section aria-label="Typing Console and Cadence Analyzer">
              <TypingConsole
                text={text}
                setText={setText}
                onVirtualKeyPress={handleKeyTrigger}
                wpm={wpm}
                kps={kps}
                lastTrigger={lastTrigger}
              />
            </section>

            {/* Acoustic Parameter Strip */}
            <section aria-label="Acoustic Synthesis Parameters">
              <SoundControls
                showNotes={showNotes}
                setShowNotes={setShowNotes}
                onProfileChange={() => setProfileRevision((r) => r + 1)}
              />
            </section>

          </div>
        )}

        {/* TAB 2: SOUND DESIGNER (Dedicated synthesis deep-dive) */}
        {activeTab === 'designer' && (
          <div className="flex flex-col gap-6">
            <SoundControls
              showNotes={showNotes}
              setShowNotes={setShowNotes}
              onProfileChange={() => setProfileRevision((r) => r + 1)}
            />

            {/* Quick Testing Keyboard */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">Test Synthesizer Timbre & Scales</span>
              <VirtualKeyboard
                key={`vk-designer-${profileRevision}`}
                activeKeys={activeKeys}
                keyCounts={keyCounts}
                onKeyPress={handleKeyTrigger}
                showNotes={showNotes}
              />
            </div>

            {/* Real-Time Spectrum Response */}
            <WaveformCanvas 
              lastTrigger={lastTrigger} 
              activeKeys={activeKeys} 
            />
          </div>
        )}

        {/* TAB 3: ACOUSTIC GUIDE */}
        {activeTab === 'guide' && (
          <div className="bg-[#0D1017] rounded-xl p-6 md:p-8 border border-slate-800 shadow-xl flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-slate-100">
                Acoustic Synthesis & Waveform Theory
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-[#141822] rounded-lg border border-slate-800 flex flex-col gap-2">
                <h3 className="font-semibold text-cyan-300 text-sm">01. Time-Domain Oscilloscope</h3>
                <p>
                  The oscilloscope plots instantaneous acoustic pressure against time. Keystrokes generate sinusoidal or sawtooth waveforms that display sharp initial attacks and exponential decay curves.
                </p>
              </div>

              <div className="p-4 bg-[#141822] rounded-lg border border-slate-800 flex flex-col gap-2">
                <h3 className="font-semibold text-amber-300 text-sm">02. FFT Spectrum Analysis</h3>
                <p>
                  The Fast Fourier Transform (FFT) decomposes complex polyphonic keystrokes into discrete frequency harmonics from 20Hz sub-bass up to 20kHz crystalline brilliance.
                </p>
              </div>

              <div className="p-4 bg-[#141822] rounded-lg border border-slate-800 flex flex-col gap-2">
                <h3 className="font-semibold text-emerald-300 text-sm">03. Dual Acoustic Merging</h3>
                <p>
                  Enabling the live microphone feeds external room acoustics, vocals, or whistling through the analyzer pipeline alongside synthesized keystrokes for rich harmonic interference patterns.
                </p>
              </div>

              <div className="p-4 bg-[#141822] rounded-lg border border-slate-800 flex flex-col gap-2">
                <h3 className="font-semibold text-violet-300 text-sm">04. Scale Quantization</h3>
                <p>
                  Keys are mapped harmonically according to musical modes (Pentatonic Minor, Cyberpunk Dorian, Insen). Every typed word forms musical phrases with zero dissonant clash.
                </p>
              </div>

              <div className="p-4 bg-[#141822] rounded-lg border border-slate-800 flex flex-col gap-2">
                <h3 className="font-semibold text-slate-200 text-sm">05. 3D Laser Ribbon</h3>
                <p>
                  The ribbon visualizer buffers consecutive audio slices into an isometric waterfall display, creating a topographical terrain of your typing rhythm and velocity.
                </p>
              </div>

              <div className="p-4 bg-[#141822] rounded-lg border border-slate-800 flex flex-col gap-2">
                <h3 className="font-semibold text-rose-300 text-sm">06. Session Recording</h3>
                <p>
                  Record and export typing sessions as WebM audio and text transcripts. The session replay feature recreates the exact cadence and synthesis timing of past sessions.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab('studio')}
                className="px-4 py-2 text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg transition-colors"
              >
                Return to Studio Console
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer: Quiet copyright and technical specs */}
      <footer className="border-t border-slate-800/80 px-6 py-4 bg-[#0A0D14] text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">WaveKey Studio</span>
          <span>·</span>
          <span>Zero-Latency Web Audio & Canvas DSP</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Physical & Virtual ANSI Keyboard Support</span>
          <span>·</span>
          <span>Export Audio & Transcript</span>
        </div>
      </footer>

    </div>
  );
}
