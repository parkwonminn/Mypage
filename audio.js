/**
 * 귀여운 Web Audio API 사운드 생성기
 * 외부 오디오 파일 없이 합성음(Synthesizer)으로 맑고 기분 좋은 멜로디를 연주합니다.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.volume = 0.7;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // 부드러운 버튼 탭 소리
  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn('Click audio error:', e);
    }
  }

  // 집중 완료 시 재생되는 기분 좋은 상승 차임벨 멜로디 (도-미-솔-도-레-미)
  playFocusComplete() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // C5, E5, G5, B5, C6, G6
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.28 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.28 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.32 }, // G5
      { freq: 987.77, time: 0.36, dur: 0.35 }, // B5
      { freq: 1046.50, time: 0.48, dur: 0.55 }, // C6
      { freq: 1567.98, time: 0.62, dur: 0.75 }  // G6
    ];

    notes.forEach(note => {
      this._playTone(note.freq, note.time, note.dur, 'sine', 0.28);
      // 벨 울림(하모닉스)
      this._playTone(note.freq * 2, note.time + 0.01, note.dur * 0.6, 'triangle', 0.10);
    });
  }

  // 휴식 완료 시 재생되는 부드러운 리프레시 멜로디 (아침 햇살 느낌)
  playBreakComplete() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      { freq: 659.25, time: 0.00, dur: 0.3 }, // E5
      { freq: 880.00, time: 0.15, dur: 0.3 }, // A5
      { freq: 1174.66, time: 0.30, dur: 0.6 }, // D6
      { freq: 1318.51, time: 0.48, dur: 0.8 }  // E6
    ];

    notes.forEach(note => {
      this._playTone(note.freq, note.time, note.dur, 'sine', 0.24);
    });
  }

  _playTone(freq, startOffset, duration, type = 'sine', peakGain = 0.2) {
    try {
      const now = this.ctx.currentTime + startOffset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const maxG = this.volume * peakGain;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(maxG, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {
      console.warn('Tone audio error:', e);
    }
  }
}

window.soundEffects = new SoundEffects();
