/*
 * Wild Hearth browser-only audio.
 *
 * This intentionally stays outside the simulation: audio is a responsive
 * presentation layer, so saves, replays, and deterministic combat stay pure.
 */
(function registerWildHearthAudio(root, factory) {
  root.WildHearthAudio = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function buildWildHearthAudio() {
  const browserGlobal = typeof globalThis !== "undefined" ? globalThis : window;
  const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));

  const EFFECTS = {
    collect: [[680, 0.08, "sine", 1.35]],
    craft: [[260, 0.1, "triangle", 1.8], [420, 0.11, "sine", 1.15]],
    harvest: [[165, 0.12, "triangle", 0.72], [112, 0.16, "sine", 0.8]],
    build: [[330, 0.1, "triangle", 1.25], [494, 0.13, "sine", 1]],
    repair: [[560, 0.09, "sine", 1.2]],
    upgrade: [[392, 0.1, "triangle", 1.25], [587, 0.14, "sine", 1.1]],
    scout: [[520, 0.08, "triangle", 0.8]],
    research: [[440, 0.1, "sine", 1.34], [660, 0.13, "sine", 1]],
    night: [[196, 0.22, "sine", 0.72], [293, 0.26, "triangle", 0.88]],
    dawn: [[330, 0.14, "sine", 1.3], [495, 0.17, "sine", 1.08]],
    towerShot: [[280, 0.05, "triangle", 1.42]],
    fireShot: [[190, 0.08, "sawtooth", 1.7]],
    hit: [[145, 0.05, "square", 0.76]],
    defeat: [[220, 0.12, "triangle", 0.52], [330, 0.14, "sine", 0.72]],
    structureHit: [[94, 0.09, "square", 0.68]],
  };

  class Director {
    constructor(settings = {}) {
      this.context = null;
      this.musicTimer = null;
      this.musicStep = 0;
      this.musicMood = "day";
      this.lastEffectAt = {};
      this.settings = { muted: false, effectsVolume: 0.55, musicVolume: 0.22, ...settings };
    }

    setSettings(settings = {}) {
      this.settings.muted = Boolean(settings.muted);
      this.settings.effectsVolume = clamp(settings.effectsVolume);
      this.settings.musicVolume = clamp(settings.musicVolume);
      if (this.settings.muted || this.settings.musicVolume === 0) this.stopMusic();
      else this.startMusic();
    }

    unlock() {
      const Context = browserGlobal.AudioContext || browserGlobal.webkitAudioContext;
      if (!Context) return false;
      if (!this.context) this.context = new Context();
      if (this.context.state === "suspended") this.context.resume();
      if (!this.settings.muted && this.settings.musicVolume > 0) this.startMusic();
      return true;
    }

    setMood(phase) {
      const next = phase === "night" || phase === "aftermath" ? "night" : "day";
      if (next === this.musicMood) return;
      this.musicMood = next;
      this.musicStep = 0;
    }

    tone(frequency, duration, volume, type = "sine", slide = 1, delay = 0) {
      if (!this.context || this.settings.muted || volume <= 0) return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * slide), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + Math.min(0.025, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    playEffect(name) {
      if (!this.context || this.settings.muted || this.settings.effectsVolume === 0) return;
      const now = Date.now();
      const cooldown = name === "towerShot" || name === "fireShot" || name === "hit" ? 90 : 45;
      if (now - (this.lastEffectAt[name] || 0) < cooldown) return;
      this.lastEffectAt[name] = now;
      (EFFECTS[name] || []).forEach(([frequency, duration, type, slide], index) => {
        this.tone(frequency, duration, this.settings.effectsVolume * 0.13, type, slide, index * 0.035);
      });
    }

    startMusic() {
      if (!this.context || this.musicTimer || this.settings.muted || this.settings.musicVolume === 0) return;
      const loop = () => {
        if (!this.context || this.settings.muted || this.settings.musicVolume === 0) { this.musicTimer = null; return; }
        const pattern = this.musicMood === "night"
          ? [146.83, 174.61, 220, 174.61, 130.81, 174.61]
          : [196, 246.94, 293.66, 246.94, 220, 293.66];
        const note = pattern[this.musicStep % pattern.length];
        this.musicStep += 1;
        this.tone(note, this.musicMood === "night" ? 0.46 : 0.34, this.settings.musicVolume * 0.085, "sine", 1.005);
        this.musicTimer = browserGlobal.setTimeout(loop, this.musicMood === "night" ? 720 : 590);
      };
      loop();
    }

    stopMusic() {
      if (this.musicTimer) browserGlobal.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  return { Director };
}));
