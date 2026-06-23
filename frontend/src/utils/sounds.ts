const AudioCtx =
  window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
const audioCtx = new AudioCtx();

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playChipSound() {
  playTone(600, 0.1, "square", 0.08);
  setTimeout(() => playTone(800, 0.1, "square", 0.06), 50);
}

export function playDealSound() {
  playTone(400, 0.06, "triangle", 0.1);
  setTimeout(() => playTone(500, 0.06, "triangle", 0.08), 80);
  setTimeout(() => playTone(600, 0.06, "triangle", 0.06), 160);
}

export function playTurnSound() {
  playTone(880, 0.15, "sine", 0.1);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, "sine", 0.12), i * 120);
  });
}

export function playLoseSound() {
  [400, 350, 300, 250].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, "triangle", 0.1), i * 150);
  });
}

export function playShowdownSound() {
  playTone(660, 0.2, "sine", 0.1);
  setTimeout(() => playTone(880, 0.3, "sine", 0.12), 150);
}

export function closeAudio() {
  audioCtx.close();
}
