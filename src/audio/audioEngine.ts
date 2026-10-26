/**
 * WaveKey Studio - Real-Time Audio Synthesis & Analysis Engine
 * Uses Web Audio API for zero-latency polyphonic keystroke synthesis
 * and real-time frequency/time-domain acoustic visualization.
 */

export type SoundPreset = 
  | 'analog_synth'
  | 'digital_glockenspiel'
  | 'ambient_pad'
  | 'analog_lead' 
  | 'fm_chimes' 
  | 'sub_808' 
  | 'chiptune_8bit' 
  | 'mechanical_thock' 
  | 'ambient_crystal'
  | 'kalimba';

export type MusicalScale = 
  | 'pentatonic_minor' 
  | 'pentatonic_major' 
  | 'dorian' 
  | 'blues' 
  | 'japanese_insen' 
  | 'chromatic';

export interface SynthesisProfile {
  id: string;
  name: string;
  description: string;
  preset: SoundPreset;
  scale: MusicalScale;
  octaveOffset: number; // -2 to +2
  volume: number; // 0.0 to 1.0
  reverbDepth: number; // 0.0 to 1.0
  filterCutoff: number; // 200 to 14000 Hz
  badge: string;
}

export const PREDEFINED_PROFILES: SynthesisProfile[] = [
  {
    id: 'analog_synth',
    name: 'Analog Synth',
    description: 'Warm dual saw & pulse with resonant low-pass filter sweep and punchy analog decay',
    preset: 'analog_synth',
    scale: 'dorian',
    octaveOffset: 0,
    volume: 0.8,
    reverbDepth: 0.3,
    filterCutoff: 5200,
    badge: 'Dual Saw · 5.2kHz',
  },
  {
    id: 'digital_glockenspiel',
    name: 'Digital Glockenspiel',
    description: 'Crystalline metallic bar strike with authentic inharmonic overtones and sparkling decay',
    preset: 'digital_glockenspiel',
    scale: 'pentatonic_major',
    octaveOffset: 1,
    volume: 0.75,
    reverbDepth: 0.45,
    filterCutoff: 11500,
    badge: 'Metallic Bars · +1 Oct',
  },
  {
    id: 'ambient_pad',
    name: 'Ambient Pad',
    description: 'Lush ethereal soundscape with gentle slow attack, harmonic 5ths, and deep spatial echo',
    preset: 'ambient_pad',
    scale: 'pentatonic_minor',
    octaveOffset: 0,
    volume: 0.78,
    reverbDepth: 0.65,
    filterCutoff: 3200,
    badge: 'Lush Echo · 65% Verb',
  },
  {
    id: 'sub_808',
    name: '808 Cyber Bass',
    description: 'Deep sub-bass punch with exponential pitch drop and low-frequency saturation',
    preset: 'sub_808',
    scale: 'pentatonic_minor',
    octaveOffset: -1,
    volume: 0.85,
    reverbDepth: 0.15,
    filterCutoff: 1800,
    badge: 'Sub Sine · -1 Oct',
  },
  {
    id: 'chiptune_8bit',
    name: 'Chiptune Arcade',
    description: 'Retro 8-bit square wave with rapid arpeggio pitch bursts and snappy transients',
    preset: 'chiptune_8bit',
    scale: 'blues',
    octaveOffset: 0,
    volume: 0.7,
    reverbDepth: 0.12,
    filterCutoff: 9000,
    badge: '8-Bit Pulse · Arp',
  },
  {
    id: 'mechanical_thock',
    name: 'Mechanical Thock',
    description: 'Authentic tactile key switch click with casing body resonance and snappy impulse',
    preset: 'mechanical_thock',
    scale: 'pentatonic_minor',
    octaveOffset: 0,
    volume: 0.8,
    reverbDepth: 0.22,
    filterCutoff: 6000,
    badge: 'Acoustic Switch · Click',
  },
];

export interface SoundConfig {
  preset: SoundPreset;
  scale: MusicalScale;
  octaveOffset: number; // -2 to +2
  volume: number; // 0.0 to 1.0
  reverbDepth: number; // 0.0 to 1.0
  filterCutoff: number; // 200 to 12000 Hz
  micGain: number; // 0.0 to 2.0
  micMonitor: boolean; // whether mic audio plays to speakers (false by default to prevent acoustic feedback loop)
}

export interface KeySoundTrigger {
  key: string;
  code: string;
  noteName: string;
  frequency: number;
  timestamp: number;
}

// Scale note intervals (semitones from root note C)
const SCALES: Record<MusicalScale, number[]> = {
  pentatonic_minor: [0, 3, 5, 7, 10], // C, Eb, F, G, Bb
  pentatonic_major: [0, 2, 4, 7, 9],  // C, D, E, G, A
  dorian: [0, 2, 3, 5, 7, 9, 10],     // C, D, Eb, F, G, A, Bb
  blues: [0, 3, 5, 6, 7, 10],         // C, Eb, F, F#, G, Bb
  japanese_insen: [0, 1, 5, 7, 10],   // C, Db, F, G, Bb
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public ctx: AudioContext | null = null;
  public isInitialized = false;
  public isRunning = false;

  // Nodes
  public masterGain: GainNode | null = null;
  public synthGain: GainNode | null = null;
  public micGain: GainNode | null = null;
  public micVisualizerGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  public masterFilter: BiquadFilterNode | null = null;
  public delayNode: DelayNode | null = null;
  public delayFeedback: GainNode | null = null;
  public delayWetGain: GainNode | null = null;

  // Microphone
  public micStream: MediaStream | null = null;
  public micSource: MediaStreamAudioSourceNode | null = null;
  public isMicActive = false;

  // Recording
  public recorderDest: MediaStreamAudioDestinationNode | null = null;
  public mediaRecorder: MediaRecorder | null = null;
  public recordedAudioChunks: Blob[] = [];
  public isRecording = false;

  // Config
  public config: SoundConfig = {
    preset: 'analog_lead',
    scale: 'pentatonic_minor',
    octaveOffset: 0,
    volume: 0.75,
    reverbDepth: 0.35,
    filterCutoff: 6500,
    micGain: 1.0,
    micMonitor: false,
  };

  // Keyboard mapping cache
  private keyMapping: Map<string, { noteName: string; frequency: number }> = new Map();

  private constructor() {
    this.rebuildKeyMapping();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initializes the AudioContext upon first user gesture.
   */
  public async init(): Promise<boolean> {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.isRunning = this.ctx.state === 'running';
      return true;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.config.volume, this.ctx.currentTime);

      // Master Analyser (handles both synth and mic signals for visual rendering)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.82;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Master Filter (Warm lowpass)
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.setValueAtTime(this.config.filterCutoff, this.ctx.currentTime);
      this.masterFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Delay / Echo network
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime);

      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.delayWetGain = this.ctx.createGain();
      this.delayWetGain.gain.setValueAtTime(this.config.reverbDepth, this.ctx.currentTime);

      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayWetGain);

      // Synth bus
      this.synthGain = this.ctx.createGain();
      this.synthGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Mic routing: one for visualizer (always routed when mic on), one for optional audio monitor
      this.micGain = this.ctx.createGain();
      this.micGain.gain.setValueAtTime(this.config.micMonitor ? this.config.micGain : 0, this.ctx.currentTime);

      this.micVisualizerGain = this.ctx.createGain();
      this.micVisualizerGain.gain.setValueAtTime(this.config.micGain, this.ctx.currentTime);

      // Connect synth through delay & filter
      this.synthGain.connect(this.masterFilter);
      this.synthGain.connect(this.delayNode);
      this.delayWetGain.connect(this.masterFilter);

      // Connect filter to master gain and analyser
      this.masterFilter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Also route visualizer mic directly into analyser (even if micMonitor is muted to prevent speaker feedback!)
      this.micVisualizerGain.connect(this.analyser);

      // Recording destination
      this.recorderDest = this.ctx.createMediaStreamDestination();
      this.analyser.connect(this.recorderDest);

      this.isInitialized = true;
      this.isRunning = this.ctx.state === 'running';
      return true;
    } catch (err) {
      console.error('Failed to initialize Web Audio Context:', err);
      return false;
    }
  }

  /**
   * Toggles microphone input for live acoustic visualization
   */
  public async toggleMicrophone(): Promise<boolean> {
    if (!this.ctx) {
      await this.init();
    }
    if (!this.ctx) return false;

    if (this.isMicActive) {
      // Turn off mic
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
      }
      if (this.micSource) {
        this.micSource.disconnect();
        this.micSource = null;
      }
      this.isMicActive = false;
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      this.micStream = stream;
      this.micSource = this.ctx.createMediaStreamSource(stream);

      if (this.micVisualizerGain && this.micGain) {
        this.micSource.connect(this.micVisualizerGain);
        this.micSource.connect(this.micGain);
        if (this.masterGain) {
          this.micGain.connect(this.masterGain);
        }
      }

      this.isMicActive = true;
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      this.isMicActive = false;
      return false;
    }
  }

  /**
   * Recalculates key-to-note frequency mapping based on chosen scale and octave
   */
  public rebuildKeyMapping() {
    this.keyMapping.clear();

    const scaleIntervals = SCALES[this.config.scale] || SCALES.pentatonic_minor;
    const baseOctave = 3 + this.config.octaveOffset;
    const baseMidi = (baseOctave + 1) * 12; // C3 = 48, C4 = 60, etc.

    // Map rows of keyboard to ascending scale degrees
    const rowKeys = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
    ];

    let noteIdx = 0;

    // Row 4 (z..m) starts lower, row 3 (a..l) mid, row 2 (q..p) higher, row 1 (1..=) highest
    const orderedRows = [rowKeys[3], rowKeys[2], rowKeys[1], rowKeys[0]];

    orderedRows.forEach((row, rowNum) => {
      row.forEach((key, colNum) => {
        const scaleLen = scaleIntervals.length;
        const totalDegree = (rowNum * 4) + colNum;
        const octaveOffset = Math.floor(totalDegree / scaleLen);
        const interval = scaleIntervals[totalDegree % scaleLen];

        const midi = baseMidi + (octaveOffset * 12) + interval;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);

        const noteName = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

        this.keyMapping.set(key.toLowerCase(), { noteName, frequency: freq });
        this.keyMapping.set(key.toUpperCase(), { noteName, frequency: freq });
      });
    });

    // Special keys
    this.keyMapping.set(' ', { noteName: `SUB-${baseOctave}`, frequency: 55 * Math.pow(2, this.config.octaveOffset) }); // Deep sub hit
    this.keyMapping.set('enter', { noteName: `CHIME-${baseOctave + 1}`, frequency: 587.33 * Math.pow(2, this.config.octaveOffset) });
    this.keyMapping.set('backspace', { noteName: 'DROP', frequency: 130.81 * Math.pow(2, this.config.octaveOffset) });
  }

  /**
   * Retrieves mapped note for any key
   */
  public getKeyNote(key: string): { noteName: string; frequency: number } {
    const lower = key.toLowerCase();
    if (this.keyMapping.has(lower)) {
      return this.keyMapping.get(lower)!;
    }
    // Fallback frequency derived from character code
    const charCode = key.charCodeAt(0) || 65;
    const baseFreq = 220 + ((charCode * 17) % 660);
    return { noteName: `K-${charCode % 12}`, frequency: baseFreq };
  }

  /**
   * Triggers audio synthesis for a keystroke
   */
  public triggerKey(key: string, code: string): KeySoundTrigger | null {
    if (!this.ctx || !this.isInitialized) {
      // Lazy init attempt
      this.init();
      return null;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const { noteName, frequency } = this.getKeyNote(key);
    const now = this.ctx.currentTime;

    // Synthesize based on current preset
    switch (this.config.preset) {
      case 'analog_synth':
      case 'analog_lead':
        this.synthAnalogLead(frequency, now);
        break;
      case 'digital_glockenspiel':
        this.synthDigitalGlockenspiel(frequency, now);
        break;
      case 'ambient_pad':
        this.synthAmbientPad(frequency, now);
        break;
      case 'fm_chimes':
        this.synthFMChimes(frequency, now);
        break;
      case 'sub_808':
        this.synth808(frequency, now, key === ' ');
        break;
      case 'chiptune_8bit':
        this.synth8Bit(frequency, now);
        break;
      case 'mechanical_thock':
        this.synthMechanicalClick(frequency, now, key);
        break;
      case 'ambient_crystal':
        this.synthAmbientCrystal(frequency, now);
        break;
      case 'kalimba':
        this.synthKalimba(frequency, now);
        break;
      default:
        this.synthAnalogLead(frequency, now);
    }

    return {
      key,
      code,
      noteName,
      frequency,
      timestamp: Date.now()
    };
  }

  // --- Synthesis Implementations ---

  private synthAnalogLead(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.006, now); // Slight detune for analog warmth

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 4.5, 12000), now + 0.04);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.9, 100), now + 0.35);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  private synthFMChimes(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    // 2-Operator FM synthesis for metallic chime resonance
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, now);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2.756, now); // Non-integer ratio for bell-like timbre

    modGain.gain.setValueAtTime(freq * 3.2, now);
    modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    carrierGain.gain.setValueAtTime(0.001, now);
    carrierGain.gain.linearRampToValueAtTime(0.32, now + 0.008);
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    carrier.connect(carrierGain);
    carrierGain.connect(this.synthGain);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 0.68);
    modulator.stop(now + 0.68);
  }

  private synth808(freq: number, now: number, isSubHit: boolean) {
    if (!this.ctx || !this.synthGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isSubHit ? 140 : Math.min(freq * 1.8, 320);
    const endFreq = isSubHit ? 38 : Math.max(freq * 0.5, 42);

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.synthGain);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  private synth8Bit(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq * 0.5, now);
    // Rapid classic chiptune arpeggio pitch step
    osc.frequency.setValueAtTime(freq, now + 0.03);
    osc.frequency.setValueAtTime(freq * 1.5, now + 0.06);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.setValueAtTime(0.2, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.synthGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  private synthMechanicalClick(freq: number, now: number, key: string) {
    if (!this.ctx || !this.synthGain) return;

    // Authentic tactile switch sound: high-Q resonant click + short noise body thock
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    const clickFilter = this.ctx.createBiquadFilter();

    clickOsc.type = 'triangle';
    const clickPitch = key === ' ' ? 220 : 1800 + (freq % 1200);
    clickOsc.frequency.setValueAtTime(clickPitch, now);
    clickOsc.frequency.exponentialRampToValueAtTime(140, now + 0.025);

    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(clickPitch, now);
    clickFilter.Q.setValueAtTime(4.0, now);

    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.synthGain);

    // Noise burst for mechanical housing 'thock'
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(key === ' ' ? 600 : 2400, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.synthGain);

    clickOsc.start(now);
    clickOsc.stop(now + 0.04);
    noiseSource.start(now);
  }

  private synthAmbientCrystal(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.4983, now); // Harmonic perfect fifth

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.synthGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  }

  private synthKalimba(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 3.01, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(this.synthGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.45);
    overtone.stop(now + 0.45);
  }

  private synthDigitalGlockenspiel(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    // Metallic bar strike synthesis with physical inharmonic ratios (1.0, 2.76, 5.40)
    const fundamental = this.ctx.createOscillator();
    const overtone1 = this.ctx.createOscillator();
    const overtone2 = this.ctx.createOscillator();
    const malletTransient = this.ctx.createOscillator();

    const gainFund = this.ctx.createGain();
    const gainOver1 = this.ctx.createGain();
    const gainOver2 = this.ctx.createGain();
    const gainMallet = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Fundamental bar mode
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, now);

    // Inharmonic modal overtones of a steel bar
    overtone1.type = 'sine';
    overtone1.frequency.setValueAtTime(freq * 2.758, now);

    overtone2.type = 'sine';
    overtone2.frequency.setValueAtTime(freq * 5.404, now);

    // Mallet head strike click transient
    malletTransient.type = 'triangle';
    malletTransient.frequency.setValueAtTime(3200, now);
    malletTransient.frequency.exponentialRampToValueAtTime(300, now + 0.015);

    // Highpass polish filter for bell clarity
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(180, now);

    // Envelopes: sharp strike and long metallic ring
    gainFund.gain.setValueAtTime(0.001, now);
    gainFund.gain.linearRampToValueAtTime(0.38, now + 0.003);
    gainFund.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    gainOver1.gain.setValueAtTime(0.001, now);
    gainOver1.gain.linearRampToValueAtTime(0.18, now + 0.003);
    gainOver1.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    gainOver2.gain.setValueAtTime(0.001, now);
    gainOver2.gain.linearRampToValueAtTime(0.08, now + 0.002);
    gainOver2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    gainMallet.gain.setValueAtTime(0.22, now);
    gainMallet.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    fundamental.connect(gainFund);
    overtone1.connect(gainOver1);
    overtone2.connect(gainOver2);
    malletTransient.connect(gainMallet);

    gainFund.connect(filter);
    gainOver1.connect(filter);
    gainOver2.connect(filter);
    gainMallet.connect(filter);
    filter.connect(this.synthGain);

    fundamental.start(now);
    overtone1.start(now);
    overtone2.start(now);
    malletTransient.start(now);

    fundamental.stop(now + 1.0);
    overtone1.stop(now + 1.0);
    overtone2.stop(now + 1.0);
    malletTransient.stop(now + 0.03);
  }

  private synthAmbientPad(freq: number, now: number) {
    if (!this.ctx || !this.synthGain) return;

    // Lush cinematic pad: dual chorused sines + harmonic fifth + filtered triangle
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscFifth = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // Warm stereo/detuned beating
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.0045, now);

    // Pure 5th harmonic overtone
    oscFifth.type = 'triangle';
    oscFifth.frequency.setValueAtTime(freq * 1.4983, now);

    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(1400, now);
    padFilter.frequency.linearRampToValueAtTime(Math.min(freq * 3.2, 5800), now + 0.25);
    padFilter.frequency.exponentialRampToValueAtTime(800, now + 1.3);

    // Soft slow attack envelope (45ms) and long ethereal decay (1.35s)
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    osc1.connect(padFilter);
    osc2.connect(padFilter);
    oscFifth.connect(padFilter);
    padFilter.connect(gain);
    gain.connect(this.synthGain);

    osc1.start(now);
    osc2.start(now);
    oscFifth.start(now);

    osc1.stop(now + 1.4);
    osc2.stop(now + 1.4);
    oscFifth.stop(now + 1.4);
  }

  // --- Real-time Visualizer Data Access ---

  public getTimeDomainData(outputArray: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(outputArray);
    } else {
      outputArray.fill(128);
    }
  }

  public getFrequencyData(outputArray: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(outputArray);
    } else {
      outputArray.fill(0);
    }
  }

  public getLiveMetrics(): { rms: number; peakDb: number; dominantFreq: number } {
    if (!this.analyser || !this.ctx) {
      return { rms: 0, peakDb: -90, dominantFreq: 0 };
    }

    const buffer = new Float32Array(512);
    this.analyser.getFloatTimeDomainData(buffer);

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const val = buffer[i];
      sumSquares += val * val;
      const absVal = Math.abs(val);
      if (absVal > peak) peak = absVal;
    }

    const rms = Math.sqrt(sumSquares / buffer.length);
    const peakDb = peak > 0.00001 ? 20 * Math.log10(peak) : -90;

    // Dominant frequency calculation from frequency data
    const freqData = new Uint8Array(256);
    this.analyser.getByteFrequencyData(freqData);
    let maxBin = 0;
    let maxVal = 0;
    for (let i = 1; i < freqData.length; i++) {
      if (freqData[i] > maxVal) {
        maxVal = freqData[i];
        maxBin = i;
      }
    }

    const dominantFreq = (maxBin * (this.ctx.sampleRate / 2)) / this.analyser.frequencyBinCount;

    return {
      rms: Math.min(rms, 1.0),
      peakDb: Math.max(-90, Math.min(0, peakDb)),
      dominantFreq: Math.round(dominantFreq)
    };
  }

  // --- Parameter Updates ---

  public setVolume(val: number) {
    this.config.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.config.volume, this.ctx.currentTime);
    }
  }

  public setFilterCutoff(hz: number) {
    this.config.filterCutoff = Math.max(200, Math.min(16000, hz));
    if (this.masterFilter && this.ctx) {
      this.masterFilter.frequency.setValueAtTime(this.config.filterCutoff, this.ctx.currentTime);
    }
  }

  public setReverbDepth(depth: number) {
    this.config.reverbDepth = Math.max(0, Math.min(1, depth));
    if (this.delayWetGain && this.ctx) {
      this.delayWetGain.gain.setValueAtTime(this.config.reverbDepth, this.ctx.currentTime);
    }
  }

  public setMicGain(gain: number) {
    this.config.micGain = Math.max(0, Math.min(2.5, gain));
    if (this.micVisualizerGain && this.ctx) {
      this.micVisualizerGain.gain.setValueAtTime(this.config.micGain, this.ctx.currentTime);
    }
    if (this.micGain && this.ctx) {
      this.micGain.gain.setValueAtTime(this.config.micMonitor ? this.config.micGain : 0, this.ctx.currentTime);
    }
  }

  public setMicMonitor(monitor: boolean) {
    this.config.micMonitor = monitor;
    if (this.micGain && this.ctx) {
      this.micGain.gain.setValueAtTime(monitor ? this.config.micGain : 0, this.ctx.currentTime);
    }
  }

  public setPreset(preset: SoundPreset) {
    this.config.preset = preset;
  }

  public setScale(scale: MusicalScale) {
    this.config.scale = scale;
    this.rebuildKeyMapping();
  }

  public setOctaveOffset(offset: number) {
    this.config.octaveOffset = Math.max(-2, Math.min(2, offset));
    this.rebuildKeyMapping();
  }

  /**
   * Applies a complete predefined audio synthesis profile
   */
  public applyProfile(profileId: string): SynthesisProfile | null {
    const profile = PREDEFINED_PROFILES.find((p) => p.id === profileId);
    if (!profile) return null;

    this.config.preset = profile.preset;
    this.config.scale = profile.scale;
    this.config.octaveOffset = profile.octaveOffset;
    this.config.volume = profile.volume;
    this.config.reverbDepth = profile.reverbDepth;
    this.config.filterCutoff = profile.filterCutoff;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.config.volume, this.ctx.currentTime);
    }
    if (this.masterFilter && this.ctx) {
      this.masterFilter.frequency.setValueAtTime(this.config.filterCutoff, this.ctx.currentTime);
    }
    if (this.delayWetGain && this.ctx) {
      this.delayWetGain.gain.setValueAtTime(this.config.reverbDepth, this.ctx.currentTime);
    }

    this.rebuildKeyMapping();
    return profile;
  }

  // --- Session Audio Recording ---

  public startRecording(): boolean {
    if (!this.recorderDest || !this.ctx) return false;
    try {
      this.recordedAudioChunks = [];
      const stream = this.recorderDest.stream;
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedAudioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      return false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || !this.isRecording) return null;
    this.mediaRecorder.stop();
    this.isRecording = false;

    const blob = new Blob(this.recordedAudioChunks, { type: 'audio/webm' });
    return blob;
  }
}

export const audioEngine = AudioEngine.getInstance();
