/**
 * Royalty-free, 100% commercially usable procedural audio synthesizer using Web Audio API.
 * Generates all game sound effects algorithmically in real-time without external audio assets.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;
let bgmGain: GainNode | null = null;
let bgmTimer: number | null = null;
let bgmStep = 0;
let isBgmPlaying = false;

// Check if user has previously muted game audio or global sound is disabled
export function initGameAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('milo-game-sound');
    if (saved !== null) {
      isMuted = saved === 'muted';
    } else {
      const globalSound = localStorage.getItem('sound');
      isMuted = globalSound === 'disabled';
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
  } catch {
    // AudioContext not supported or restricted
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function toggleAudioMute(): boolean {
  isMuted = !isMuted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('milo-game-sound', isMuted ? 'muted' : 'enabled');
  }
  if (isMuted) {
    stopCyberBgm();
  } else {
    startCyberBgm();
  }
  return isMuted;
}

/**
 * Procedural Cyberpunk Background Music (BGM)
 * Generates rhythmic synth bass & ambient arpeggiated pulses in real-time.
 */
export function startCyberBgm() {
  if (typeof window === 'undefined' || isMuted || isBgmPlaying) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    if (!bgmGain) {
      bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(0.001, ctx.currentTime);
      bgmGain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 1.2);
      bgmGain.connect(ctx.destination);
    }

    // Atmospheric cyber progression: Cm -> Ab -> Fm -> G
    const bassline = [65.41, 65.41, 77.78, 65.41, 87.31, 87.31, 98.00, 77.78];
    const synthNotes = [261.63, 311.13, 392.00, 466.16];

    isBgmPlaying = true;
    bgmStep = 0;

    const tickBgm = () => {
      if (!isBgmPlaying || !bgmGain || !ctx || ctx.state !== 'running' || isMuted) return;
      const now = ctx.currentTime;
      const bassFreq = bassline[bgmStep % bassline.length];

      // Bass synth pulse
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const noteGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.38);

      noteGain.gain.setValueAtTime(0.14, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(bgmGain);

      osc.start(now);
      osc.stop(now + 0.4);

      // Light harmonic arpeggio every alternating pulse
      if (bgmStep % 2 === 0) {
        const arpFreq = synthNotes[(bgmStep / 2) % synthNotes.length];
        const arpOsc = ctx.createOscillator();
        const arpGain = ctx.createGain();

        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(arpFreq, now + 0.04);

        arpGain.gain.setValueAtTime(0.032, now + 0.04);
        arpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        arpOsc.connect(arpGain);
        arpGain.connect(bgmGain);

        arpOsc.start(now + 0.04);
        arpOsc.stop(now + 0.3);
      }

      bgmStep++;
    };

    if (bgmTimer) window.clearInterval(bgmTimer);
    bgmTimer = window.setInterval(tickBgm, 440);
    tickBgm();
  } catch {
    // Graceful fallback if Web Audio is restricted
  }
}

export function stopCyberBgm() {
  isBgmPlaying = false;
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
  if (bgmGain && audioCtx) {
    try {
      bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
      const toDisconnect = bgmGain;
      window.setTimeout(() => {
        try { toDisconnect.disconnect(); } catch (_) {}
      }, 550);
      bgmGain = null;
    } catch {
      bgmGain = null;
    }
  }
}

export function pauseCyberBgm() {
  if (bgmGain && audioCtx) {
    try {
      bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmGain.gain.setValueAtTime(0.005, audioCtx.currentTime);
    } catch (_) {}
  }
}

export function resumeCyberBgm() {
  if (!isBgmPlaying) {
    startCyberBgm();
  } else if (bgmGain && audioCtx) {
    try {
      bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmGain.gain.setValueAtTime(0.035, audioCtx.currentTime);
    } catch (_) {}
  }
}

function getContext(): AudioContext | null {
  if (isMuted) return null;
  if (!audioCtx) initGameAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Pickup sound: Rising crystal arpeggio (sine wave harmonic)
 * Frequencies: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz) -> E6 (1318Hz)
 */
export function playPickupSound() {
  const ctx = getContext();
  if (!ctx) return;

  const notes = [659.25, 830.61, 987.77, 1318.51];
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.045);

    gain.gain.setValueAtTime(0, now + idx * 0.045);
    gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.045 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.045);
    osc.stop(now + idx * 0.045 + 0.2);
  });
}

/**
 * Hit sound: Low cyber-glitch impact with downward frequency drop and noise
 */
export function playHitSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Punch oscillator
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.15);

  oscGain.gain.setValueAtTime(0.28, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);

  // Noise burst for shield static
  try {
    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
  } catch {
    // Ignore noise buffer failure on older browsers
  }
}

/**
 * Decoy sound: Suspicious minor interval wobble
 */
export function playDecoySound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.linearRampToValueAtTime(280, now + 0.1);
  osc.frequency.linearRampToValueAtTime(220, now + 0.22);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

/**
 * Injection Alert: Urgent dual-tone alert ping (cyber alert)
 */
export function playInjectionAlertSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const tones = [880, 659.25, 880];

  tones.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.08);
  });
}

/**
 * Quarantine success sound: Ascending bright chime affirming security control
 */
export function playQuarantineSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [523.25, 659.25, 783.99, 1046.50];

  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.05);

    gain.gain.setValueAtTime(0, now + idx * 0.05);
    gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.05);
    osc.stop(now + idx * 0.05 + 0.18);
  });
}

/**
 * Hazard / Unsafe action sound: Low warning buzz
 */
export function playHazardSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(140, now);
  osc2.frequency.setValueAtTime(147, now); // Detuned for dissonance

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.32);
  osc2.stop(now + 0.32);
}

/**
 * Victory fanfare: Triumphant arpeggio
 */
export function playWinSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // C5, G5, C6, E6
  const fanfares = [
    { freq: 523.25, start: 0, dur: 0.12 },
    { freq: 659.25, start: 0.12, dur: 0.12 },
    { freq: 783.99, start: 0.24, dur: 0.14 },
    { freq: 1046.50, start: 0.38, dur: 0.45 }
  ];

  fanfares.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.22, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  });
}

/**
 * Lose sound: Downward frequency power-down slide
 */
export function playLoseSound() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(290, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}
