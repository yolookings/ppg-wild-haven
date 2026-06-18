// src/systems/AudioManager.ts
import { SaveSystem } from './SaveSystem';

export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static musicNode: GainNode | null = null;
  private static sfxNode: GainNode | null = null;
  private static masterNode: GainNode | null = null;
  
  private static currentMusicId: string | null = null;
  private static musicInterval: number | null = null;
  private static synthOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

  private static notesMap: Record<string, number> = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'E6': 1318.51, 'G6': 1567.98
  };

  private static meadowScale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
  private static forestScale = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5']; // A Minor Pentatonic
  private static mountainScale = ['B3', 'D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5']; // Pentatonic crisp
  private static desertScale = ['D3', 'Eb3', 'F#3', 'G3', 'A3', 'Bb3', 'C#4', 'D4']; // Double Harmonic / Phrygian Dominant
  private static sanctuaryScale = ['C4', 'E4', 'G4', 'B4', 'D5', 'E5', 'G5', 'B5']; // C Maj7

  public static initialize(): void {
    // Audio context is created on first interaction
    const initCtx = () => {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterNode = this.ctx.createGain();
      this.musicNode = this.ctx.createGain();
      this.sfxNode = this.ctx.createGain();

      this.musicNode.connect(this.masterNode);
      this.sfxNode.connect(this.masterNode);
      this.masterNode.connect(this.ctx.destination);

      this.updateVolumes();
      
      // If a track was queued, start playing it
      if (this.currentMusicId) {
        const id = this.currentMusicId;
        this.currentMusicId = null;
        this.playMusic(id);
      }
      
      // Remove listeners once context is active
      window.removeEventListener('click', initCtx);
      window.removeEventListener('touchstart', initCtx);
      window.removeEventListener('keydown', initCtx);
      console.log("Web Audio Context initialized successfully.");
    };

    window.addEventListener('click', initCtx);
    window.addEventListener('touchstart', initCtx);
    window.addEventListener('keydown', initCtx);
  }

  private static resumeContext(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  public static updateVolumes(): void {
    const state = SaveSystem.getState();
    const muted = state.settings.muted;
    const mVol = state.settings.musicVolume;
    const sVol = state.settings.sfxVolume;

    if (this.masterNode && this.musicNode && this.sfxNode && this.ctx) {
      const targetMaster = muted ? 0 : 1;
      this.masterNode.gain.setTargetAtTime(targetMaster, this.ctx.currentTime, 0.1);
      this.musicNode.gain.setTargetAtTime(mVol * 0.4, this.ctx.currentTime, 0.1); // music is softer
      this.sfxNode.gain.setTargetAtTime(sVol * 0.7, this.ctx.currentTime, 0.1);
    }
  }

  public static playMusic(trackId: string): void {
    if (this.currentMusicId === trackId) return;
    this.currentMusicId = trackId;

    if (!this.ctx) {
      // Will play once user interacts
      return;
    }

    this.resumeContext().then(() => {
      this.stopMusicEngine();
      this.startMusicEngine(trackId);
    });
  }

  private static stopMusicEngine(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.synthOscillators.forEach(o => {
      try { o.osc.stop(); } catch(e){}
    });
    this.synthOscillators = [];
  }

  private static startMusicEngine(trackId: string): void {
    if (!this.ctx || !this.musicNode) return;

    let scale = this.meadowScale;
    let tempo = 180; // BPM
    let waveType: OscillatorType = 'sine';
    

    switch (trackId) {
      case 'music_meadow':
        scale = this.meadowScale;
        tempo = 110;
        waveType = 'sine';
        break;
      case 'music_forest':
        scale = this.forestScale;
        tempo = 80;
        waveType = 'sine';
        break;
      case 'music_mountain':
        scale = this.mountainScale;
        tempo = 140;
        waveType = 'triangle';
        break;
      case 'music_desert':
        scale = this.desertScale;
        tempo = 90;
        waveType = 'triangle';
        break;
      case 'music_sanctuary':
      case 'music_menu':
        scale = this.sanctuaryScale;
        tempo = 100;
        waveType = 'sine';
        break;
      case 'music_sanctuary_sky':
        scale = this.meadowScale;
        tempo = 120;
        waveType = 'sine';
        break;
    }

    const noteDuration = (60 / tempo) * 1000; // time per beat
    let step = 0;

    const playStep = () => {
      if (!this.ctx || !this.musicNode) return;
      
      const time = this.ctx.currentTime;
      
      // Ambient Bass/Pad (Every 4 beats)
      if (step % 4 === 0) {
        const rootNoteStr = scale[0];
        let rootFreq = this.notesMap[rootNoteStr] || 130;
        rootFreq = rootFreq / 2; // Octave lower for bass
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(rootFreq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (noteDuration * 4) / 1000 - 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicNode);

        osc.start(time);
        osc.stop(time + (noteDuration * 4) / 1000);
      }

      // Melodic notes (probability based)
      if (Math.random() > 0.3) {
        // Choose note from scale
        const noteIndex = Math.floor(Math.random() * (scale.length - 2)) + 2; // Avoid the lowest base note
        const noteStr = scale[noteIndex];
        const freq = this.notesMap[noteStr] || 440;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = this.ctx.createDelay();
        const delayGain = this.ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.06, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (noteDuration * 0.8) / 1000);

        // Subtly echo
        delay.delayTime.setValueAtTime(noteDuration * 0.5 / 1000, time);
        delayGain.gain.setValueAtTime(0.02, time);

        osc.connect(gain);
        gain.connect(this.musicNode);

        // Connect delay echo
        gain.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.musicNode);

        osc.start(time);
        osc.stop(time + noteDuration / 1000);
      }

      step++;
    };

    // Play first step immediately
    playStep();
    
    // Set interval to play music
    this.musicInterval = setInterval(playStep, noteDuration) as unknown as number;
  }

  public static playSfx(sfxId: string): void {
    if (!this.ctx || !this.sfxNode) return;

    this.resumeContext().then(() => {
      if (!this.ctx || !this.sfxNode) return;
      const time = this.ctx.currentTime;

      switch (sfxId) {
        case 'ui_tap':
        case 'button_hover':
          this.playTone(600, 'sine', 0.08, 0.05, time);
          break;
        case 'ui_confirm':
          this.playTone(523.25, 'sine', 0.1, 0.1, time); // C5
          this.playTone(659.25, 'sine', 0.1, 0.15, time + 0.08); // E5
          break;
        case 'capture_start':
          this.playTone(300, 'triangle', 0.12, 0.15, time);
          this.playTone(450, 'triangle', 0.08, 0.15, time + 0.05);
          break;
        case 'capture_success_common':
          this.playTone(523.25, 'sine', 0.15, 0.15, time); // C5
          this.playTone(659.25, 'sine', 0.15, 0.15, time + 0.08); // E5
          this.playTone(783.99, 'sine', 0.2, 0.25, time + 0.16); // G5
          break;
        case 'capture_success_rare':
          this.playTone(523.25, 'sine', 0.15, 0.15, time);
          this.playTone(659.25, 'sine', 0.15, 0.15, time + 0.06);
          this.playTone(783.99, 'sine', 0.15, 0.15, time + 0.12);
          this.playTone(1046.50, 'sine', 0.22, 0.3, time + 0.18); // C6
          break;
        case 'capture_success_epic':
        case 'capture_success_legendary':
        case 'capture_success_mythic':
          // Sparkly arpeggio
          const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
          notes.forEach((freq, idx) => {
            this.playTone(freq, 'sine', 0.15, 0.25, time + idx * 0.05);
            // Add a little frequency sweep
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.frequency.setValueAtTime(freq, time + idx * 0.05);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + idx * 0.05 + 0.15);
            gain.gain.setValueAtTime(0.08, time + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.05 + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxNode!);
            osc.start(time + idx * 0.05);
            osc.stop(time + idx * 0.05 + 0.25);
          });
          break;
        case 'capture_fail':
        case 'capture_flee':
          this.playTone(392.00, 'triangle', 0.15, 0.15, time); // G4
          this.playTone(349.23, 'triangle', 0.15, 0.15, time + 0.08); // F4
          this.playTone(293.66, 'triangle', 0.2, 0.3, time + 0.16); // D4
          break;
        case 'coin_collect':
        case 'coin_tick':
          // Classic high pitched ringing coin
          this.playTone(987.77, 'sine', 0.1, 0.08, time); // B5
          this.playTone(1567.98, 'sine', 0.15, 0.15, time + 0.03); // G6
          break;
        case 'level_up':
          // Beautiful level up tune
          const lvlNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
          lvlNotes.forEach((freq, idx) => {
            this.playTone(freq, 'sine', 0.15, 0.2, time + idx * 0.08);
            if (idx === lvlNotes.length - 1) {
              this.playTone(freq, 'triangle', 0.2, 0.6, time + idx * 0.08);
            }
          });
          break;
        case 'achievement_unlock':
          this.playTone(523.25, 'sine', 0.15, 0.1, time);
          this.playTone(783.99, 'sine', 0.15, 0.1, time + 0.05);
          this.playTone(659.25, 'sine', 0.15, 0.1, time + 0.1);
          this.playTone(1046.50, 'sine', 0.25, 0.4, time + 0.15);
          break;
        case 'area_unlock':
          // Big swell
          const oscSwell = this.ctx.createOscillator();
          const gainSwell = this.ctx.createGain();
          oscSwell.type = 'sawtooth';
          oscSwell.frequency.setValueAtTime(110, time);
          oscSwell.frequency.exponentialRampToValueAtTime(440, time + 0.8);
          gainSwell.gain.setValueAtTime(0, time);
          gainSwell.gain.linearRampToValueAtTime(0.12, time + 0.3);
          gainSwell.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(200, time);
          filter.frequency.exponentialRampToValueAtTime(1500, time + 0.8);

          oscSwell.connect(filter);
          filter.connect(gainSwell);
          gainSwell.connect(this.sfxNode);
          oscSwell.start(time);
          oscSwell.stop(time + 1.0);

          // Sparkle at end of swell
          this.playTone(880.00, 'sine', 0.15, 0.3, time + 0.8);
          this.playTone(1318.51, 'sine', 0.2, 0.4, time + 0.9);
          break;
        case 'rope_throw':
          // Whoosh sweep
          const oscWhoosh = this.ctx.createOscillator();
          const gainWhoosh = this.ctx.createGain();
          oscWhoosh.type = 'sine';
          oscWhoosh.frequency.setValueAtTime(150, time);
          oscWhoosh.frequency.exponentialRampToValueAtTime(800, time + 0.3);
          gainWhoosh.gain.setValueAtTime(0.15, time);
          gainWhoosh.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
          oscWhoosh.connect(gainWhoosh);
          gainWhoosh.connect(this.sfxNode);
          oscWhoosh.start(time);
          oscWhoosh.stop(time + 0.3);
          break;
      }
    });
  }

  private static playTone(freq: number, type: OscillatorType, volume: number, duration: number, time: number): void {
    if (!this.ctx || !this.sfxNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.sfxNode);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}
