import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sliders, 
  Music, 
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { 
  audioEngine, 
  SoundPreset, 
  MusicalScale, 
  PREDEFINED_PROFILES,
  SynthesisProfile 
} from '../audio/audioEngine';

interface SoundControlsProps {
  showNotes: boolean;
  setShowNotes: React.Dispatch<React.SetStateAction<boolean>>;
  onProfileChange?: (profileId: string) => void;
}

const PRESETS: { id: SoundPreset; name: string; desc: string }[] = [
  { id: 'analog_synth', name: 'Analog Synth', desc: 'Moog-style dual saw & pulse with resonant filter envelope' },
  { id: 'digital_glockenspiel', name: 'Digital Glockenspiel', desc: 'Crystalline metallic bar strike with inharmonic overtones' },
  { id: 'ambient_pad', name: 'Ambient Pad', desc: 'Ethereal lush soundscape with slow attack and harmonic 5ths' },
  { id: 'analog_lead', name: 'Analog Lead', desc: 'Warm dual saw & square with snappy filter sweep' },
  { id: 'fm_chimes', name: 'FM Chimes', desc: 'Crystalline 2-operator frequency modulation bells' },
  { id: 'sub_808', name: '808 Sub Bass', desc: 'Deep sine punch with exponential pitch drop' },
  { id: 'chiptune_8bit', name: '8-Bit Chiptune', desc: 'Retro arcade square wave with fast arpeggio blips' },
  { id: 'mechanical_thock', name: 'Mechanical Thock', desc: 'Acoustic tactile switch click & casing transient' },
  { id: 'ambient_crystal', name: 'Ambient Crystal', desc: 'Dual sine wave with harmonic 5th overtone tail' },
  { id: 'kalimba', name: 'Acoustic Kalimba', desc: 'Resonant wooden body mallet harmonics' },
];

const SCALES: { id: MusicalScale; name: string; desc: string }[] = [
  { id: 'pentatonic_minor', name: 'Minor Pentatonic', desc: 'Harmonic, expressive, always musical' },
  { id: 'pentatonic_major', name: 'Major Pentatonic', desc: 'Bright, uplifting, crystalline' },
  { id: 'dorian', name: 'Cyberpunk Dorian', desc: 'Futuristic atmospheric jazz mode' },
  { id: 'blues', name: 'Blues Scale', desc: 'Gritty, expressive chromatic blue notes' },
  { id: 'japanese_insen', name: 'Insen Scale', desc: 'Evocative cinematic oriental tonality' },
  { id: 'chromatic', name: 'Full Chromatic', desc: 'All 12 semitones across keyboard rows' },
];

export const SoundControls: React.FC<SoundControlsProps> = ({
  showNotes,
  setShowNotes,
  onProfileChange,
}) => {
  // Predefined profile state
  const [selectedProfileId, setSelectedProfileId] = useState<string>('analog_synth');

  // Fine-grained synth states
  const [preset, setPreset] = useState<SoundPreset>(audioEngine.config.preset);
  const [scale, setScale] = useState<MusicalScale>(audioEngine.config.scale);
  const [octave, setOctave] = useState<number>(audioEngine.config.octaveOffset);
  const [volume, setVolume] = useState<number>(audioEngine.config.volume);
  const [filterCutoff, setFilterCutoff] = useState<number>(audioEngine.config.filterCutoff);
  const [reverbDepth, setReverbDepth] = useState<number>(audioEngine.config.reverbDepth);

  // Mic state
  const [isMicOn, setIsMicOn] = useState<boolean>(audioEngine.isMicActive);
  const [micGain, setMicGain] = useState<number>(audioEngine.config.micGain);
  const [micMonitor, setMicMonitor] = useState<boolean>(audioEngine.config.micMonitor);
  const [vuLevel, setVuLevel] = useState<number>(0);

  // Update VU meter loop
  useEffect(() => {
    let animId: number;
    const pollVu = () => {
      animId = requestAnimationFrame(pollVu);
      const metrics = audioEngine.getLiveMetrics();
      setVuLevel(metrics.rms);
    };
    animId = requestAnimationFrame(pollVu);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handler for switching predefined synthesis profiles
  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    const applied = audioEngine.applyProfile(profileId);
    if (applied) {
      setPreset(applied.preset);
      setScale(applied.scale);
      setOctave(applied.octaveOffset);
      setVolume(applied.volume);
      setFilterCutoff(applied.filterCutoff);
      setReverbDepth(applied.reverbDepth);

      // Play preview audition note
      audioEngine.triggerKey('f', 'KeyF');

      if (onProfileChange) {
        onProfileChange(profileId);
      }
    }
  };

  const handlePresetChange = (newPreset: SoundPreset) => {
    setPreset(newPreset);
    audioEngine.setPreset(newPreset);
    audioEngine.triggerKey('f', 'KeyF');
  };

  const handleScaleChange = (newScale: MusicalScale) => {
    setScale(newScale);
    audioEngine.setScale(newScale);
    audioEngine.triggerKey('a', 'KeyA');
  };

  const handleOctaveChange = (newOctave: number) => {
    setOctave(newOctave);
    audioEngine.setOctaveOffset(newOctave);
    audioEngine.triggerKey('k', 'KeyK');
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  const handleFilterChange = (val: number) => {
    setFilterCutoff(val);
    audioEngine.setFilterCutoff(val);
  };

  const handleReverbChange = (val: number) => {
    setReverbDepth(val);
    audioEngine.setReverbDepth(val);
  };

  const toggleMic = async () => {
    const active = await audioEngine.toggleMicrophone();
    setIsMicOn(active);
  };

  const handleMicGainChange = (gain: number) => {
    setMicGain(gain);
    audioEngine.setMicGain(gain);
  };

  const handleMicMonitorToggle = (monitor: boolean) => {
    setMicMonitor(monitor);
    audioEngine.setMicMonitor(monitor);
  };

  const currentProfile = PREDEFINED_PROFILES.find((p) => p.id === selectedProfileId);

  return (
    <div className="w-full bg-[#0D1017] rounded-xl p-4 md:p-5 border border-slate-800 shadow-xl flex flex-col gap-6">
      
      {/* Sound Designer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
            Acoustic Synthesis & Audio Input Engine
          </h2>
        </div>

        {/* Live VU Meter Strip */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-slate-500">VU Meter</span>
          <div className="w-24 h-2.5 bg-slate-900 rounded-sm overflow-hidden flex border border-slate-800">
            <div 
              className={`h-full transition-all duration-75 ${
                vuLevel > 0.7 ? 'bg-rose-500' : vuLevel > 0.4 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.round(vuLevel * 180))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 1. PREDEFINED SYNTHESIS PROFILES (Button Set & Dropdown) */}
      <div className="flex flex-col gap-3.5 bg-[#121620] p-4 rounded-xl border border-slate-800/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
              Predefined Synthesis Profiles
            </span>
            <span className="text-slate-600 font-mono text-xs hidden sm:inline">·</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              1-Click Instant Rig Calibration
            </span>
          </div>

          {/* Dropdown Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="synthesis-profile-select" className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Quick Menu:
            </label>
            <div className="relative">
              <select
                id="synthesis-profile-select"
                value={selectedProfileId}
                onChange={(e) => handleProfileSelect(e.target.value)}
                className="appearance-none bg-slate-900/95 border border-slate-700 hover:border-slate-600 text-cyan-300 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer shadow-sm"
              >
                {PREDEFINED_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.badge}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Button Set / Profile Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PREDEFINED_PROFILES.map((p) => {
            const isSelected = selectedProfileId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProfileSelect(p.id)}
                className={`flex flex-col text-left p-3 rounded-lg border transition-all duration-150 ${
                  isSelected
                    ? 'bg-slate-800/95 border-cyan-400/80 text-slate-100 shadow-[0_0_16px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40'
                    : 'bg-[#161B26] hover:bg-[#1C2230] border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className={`text-xs font-bold tracking-tight ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {p.name}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Profile Telemetry Summary */}
        {currentProfile && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>ACTIVE PROFILE: {currentProfile.name.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span>Filter: <strong className="text-slate-300 font-normal">{filterCutoff} Hz</strong></span>
              <span>·</span>
              <span>Reverb: <strong className="text-slate-300 font-normal">{Math.round(reverbDepth * 100)}%</strong></span>
              <span>·</span>
              <span>Scale: <strong className="text-slate-300 font-normal">{scale.replace('_', ' ')}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. FINE-GRAINED SYNTHESIS & ACOUSTIC PARAMETERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Column 1: Instrument Presets List */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              Synth Instrument Model
            </span>
            <span className="text-[10px] text-slate-500 font-mono">POLYPHONIC</span>
          </label>
          <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`flex flex-col text-left px-3 py-2 rounded-lg border transition-all ${
                  preset === p.id
                    ? 'bg-slate-800/90 border-cyan-500/70 text-cyan-200 shadow-sm'
                    : 'bg-[#141822] hover:bg-[#1C2230] border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{p.name}</span>
                  {preset === p.id && (
                    <span className="text-[9px] font-mono text-cyan-400 uppercase">ACTIVE</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Musical Scale & Octave Shift */}
        <div className="flex flex-col gap-4">
          {/* Scale Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Key Pitch Quantization Scale
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SCALES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleScaleChange(s.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border text-left truncate transition-all ${
                    scale === s.id
                      ? 'bg-slate-800 border-amber-500/70 text-amber-300'
                      : 'bg-[#141822] hover:bg-[#1C2230] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={s.desc}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Octave Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Octave Shift</span>
              <span className="text-xs font-mono text-amber-400 tabular-nums">
                {octave > 0 ? `+${octave}` : octave} Oct
              </span>
            </label>
            <div className="flex items-center gap-1 bg-[#141822] p-1 rounded-lg border border-slate-800">
              {[-2, -1, 0, 1, 2].map((oct) => (
                <button
                  key={oct}
                  onClick={() => handleOctaveChange(oct)}
                  className={`flex-1 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                    octave === oct
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {oct > 0 ? `+${oct}` : oct}
                </button>
              ))}
            </div>
          </div>

          {/* Key Notes Display Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-xs text-slate-300">Show Musical Notes on Keys</span>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                showNotes
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {showNotes ? 'Visible' : 'Hidden'}
            </button>
          </div>
        </div>

        {/* Column 3: Live Microphone & Master Filters */}
        <div className="flex flex-col gap-4">
          {/* Live Microphone Box */}
          <div className="bg-[#141822] p-3.5 rounded-lg border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                Live Microphone Input
              </span>
              <button
                onClick={toggleMic}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  isMicOn
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>{isMicOn ? 'Mic Active' : 'Enable Mic'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Speak or hum while typing to merge external voice acoustic waves with synthetic keystroke harmonics.
            </p>

            {isMicOn && (
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Mic Sensitivity</span>
                  <span className="font-mono text-slate-300 tabular-nums">{micGain.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={micGain}
                  onChange={(e) => handleMicGainChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 accent-rose-400 rounded cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Speaker Audio Passthrough</span>
                  <button
                    onClick={() => handleMicMonitorToggle(!micMonitor)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      micMonitor
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {micMonitor ? 'Audible (Passthrough)' : 'Visualizer Only'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Master Volume & Effects */}
          <div className="flex flex-col gap-3">
            {/* Master Volume */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  Master Volume
                </span>
                <span className="font-mono text-slate-300 tabular-nums">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            {/* Lowpass Filter Cutoff */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Low-Pass Filter Cutoff</span>
                <span className="font-mono text-slate-300 tabular-nums">{filterCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="400"
                max="14000"
                step="200"
                value={filterCutoff}
                onChange={(e) => handleFilterChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 accent-amber-400 rounded cursor-pointer"
              />
            </div>

            {/* Reverb / Delay Depth */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Space Echo & Reverb</span>
                <span className="font-mono text-slate-300 tabular-nums">{Math.round(reverbDepth * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={reverbDepth}
                onChange={(e) => handleReverbChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 accent-cyan-400 rounded cursor-pointer"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
