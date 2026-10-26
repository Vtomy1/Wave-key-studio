import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Volume2, 
  Radio, 
  BookOpen, 
  Sparkles,
  FileText
} from 'lucide-react';
import { audioEngine, KeySoundTrigger } from '../audio/audioEngine';

interface KeystrokeEventRecord {
  key: string;
  code: string;
  timestamp: number;
}

interface TypingConsoleProps {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  onVirtualKeyPress: (key: string, code: string) => void;
  wpm: number;
  kps: number;
  lastTrigger: KeySoundTrigger | null;
}

const SAMPLE_PROMPTS = [
  'Acoustic frequencies resonate in harmony as electric waveforms dance across the oscilloscope beam.',
  'Sphinx of black quartz, judge my vow.',
  'The quick brown fox jumps over the lazy dog.',
  'Nocturnal synthwave echoes vibrating through vacuum tube amplifiers and digital delays.',
  'Oscillations, harmonics, sub-bass transients, and frequency spectrum analysis.',
];

export const TypingConsole: React.FC<TypingConsoleProps> = ({
  text,
  setText,
  onVirtualKeyPress,
  wpm,
  kps,
  lastTrigger,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Recording state
  const [isRecordingSession, setIsRecordingSession] = useState(false);
  const [recordedKeystrokes, setRecordedKeystrokes] = useState<KeystrokeEventRecord[]>([]);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Cadence description
  const getCadenceDescriptor = (kpsVal: number) => {
    if (kpsVal === 0) return 'Resting';
    if (kpsVal < 2) return 'Largo (Gentle)';
    if (kpsVal < 4.5) return 'Andante (Moderate)';
    if (kpsVal < 7) return 'Allegro (Swift)';
    return 'Presto (Virtuoso)';
  };

  // Record keystrokes if recording
  useEffect(() => {
    if (isRecordingSession && lastTrigger) {
      setRecordedKeystrokes((prev) => [
        ...prev,
        {
          key: lastTrigger.key,
          code: lastTrigger.code,
          timestamp: lastTrigger.timestamp,
        },
      ]);
    }
  }, [lastTrigger, isRecordingSession]);

  const toggleRecording = () => {
    if (isRecordingSession) {
      // Stop recording
      setIsRecordingSession(false);
      const audioBlob = audioEngine.stopRecording();
      if (audioBlob) {
        setRecordedAudioBlob(audioBlob);
      }
    } else {
      // Start recording
      setRecordedKeystrokes([]);
      setRecordedAudioBlob(null);
      audioEngine.startRecording();
      setIsRecordingSession(true);
    }
  };

  const playRecordedSession = async () => {
    if (recordedKeystrokes.length === 0 || isPlayingBack) return;
    setIsPlayingBack(true);
    setPlaybackProgress(0);

    const firstTime = recordedKeystrokes[0].timestamp;
    const totalDuration = recordedKeystrokes[recordedKeystrokes.length - 1].timestamp - firstTime;

    for (let i = 0; i < recordedKeystrokes.length; i++) {
      const current = recordedKeystrokes[i];
      const delay = i === 0 ? 0 : current.timestamp - recordedKeystrokes[i - 1].timestamp;

      if (delay > 0) {
        await new Promise((res) => setTimeout(res, Math.min(delay, 1200)));
      }

      onVirtualKeyPress(current.key, current.code);
      setPlaybackProgress(Math.round(((current.timestamp - firstTime) / (totalDuration || 1)) * 100));
    }

    setIsPlayingBack(false);
    setPlaybackProgress(100);
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadText = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveform-transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAudio = () => {
    if (!recordedAudioBlob) return;
    const url = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveform-audio-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const injectPrompt = (prompt: string) => {
    setText((prev) => (prev ? `${prev} ${prompt}` : prompt));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full bg-[#0D1017] rounded-xl p-4 md:p-5 border border-slate-800 shadow-xl flex flex-col gap-4">
      {/* Console Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Left: Typing Rhythm Stats */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">Cadence</span>
            <span className="text-cyan-400 font-bold tabular-nums">{wpm} WPM</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">Speed</span>
            <span className="text-slate-200 font-bold tabular-nums">{kps.toFixed(1)} KPS</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">Tempo</span>
            <span className="text-amber-400 font-medium">{getCadenceDescriptor(kps)}</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase text-slate-500">Chars</span>
            <span className="text-slate-300 tabular-nums">{text.length}</span>
          </div>
        </div>

        {/* Right: Actions & Recording Strip */}
        <div className="flex items-center gap-2">
          {/* Recording Toggle */}
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              isRecordingSession
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
            }`}
          >
            {isRecordingSession ? (
              <>
                <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>Stop Rec ({recordedKeystrokes.length})</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>Record Session</span>
              </>
            )}
          </button>

          {/* Replay Button (Active when keystrokes exist) */}
          {recordedKeystrokes.length > 0 && !isRecordingSession && (
            <button
              onClick={playRecordedSession}
              disabled={isPlayingBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-slate-900 text-cyan-300 border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isPlayingBack ? `Playing (${playbackProgress}%)` : 'Replay'}</span>
            </button>
          )}

          {/* Download Audio Export */}
          {recordedAudioBlob && (
            <button
              onClick={downloadAudio}
              title="Download Recorded Audio (.webm)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border bg-slate-900 text-amber-300 border-amber-500/30 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audio</span>
            </button>
          )}

          {/* Clear text */}
          <button
            onClick={() => setText('')}
            title="Clear text buffer"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Copy text */}
          <button
            onClick={handleCopy}
            title="Copy text to clipboard"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Transcript */}
          <button
            onClick={downloadText}
            title="Download Transcript (.txt)"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Textarea Workspace */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing on your keyboard or tap keys below. Every character synthesizes real-time acoustic waves that dance across the visualizer..."
          rows={4}
          className="w-full bg-[#08090C] rounded-lg p-3.5 text-slate-200 placeholder:text-slate-600 font-mono text-sm leading-relaxed border border-slate-800/90 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 resize-y"
        />

        {/* Live Audio Reactive Border Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1 px-1">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>POLYPHONIC ACOUSTIC SYNTHESIS ACTIVE</span>
          </div>
          <div>FOCUS INPUT OR TYPE ANYWHERE</div>
        </div>
      </div>

      {/* Quick Prompt Injection Strip */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Practice & Rhythm Prompts:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => injectPrompt(prompt)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-[#141822] hover:bg-[#1A202D] rounded-md border border-slate-800/90 transition-colors text-left truncate max-w-xs"
              title={prompt}
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
