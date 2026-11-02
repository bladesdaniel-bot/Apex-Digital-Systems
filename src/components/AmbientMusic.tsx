import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaunted } from "@/components/HauntedMode";
import { useMusicChoice } from "@/components/MusicChoice";
import { resolvePlaylist, type MusicTrack } from "@/lib/music-tracks";
import hauntedSoundtrack from "@/assets/haunted-soundtrack.mp3.asset.json";
import flyerSong from "@/assets/apex-flyer-song.mp3.asset.json";

const RECORDINGS: Record<Exclude<MusicTrack, "synth">, string> = {
  haunted: hauntedSoundtrack.url,
  flyer: flyerSong.url,
};

function createSound(playlist: MusicTrack[]) {
  const recordings = playlist.filter((t): t is Exclude<MusicTrack, "synth"> => t !== "synth");
  return recordings.length ? createRecording(recordings.map((t) => RECORDINGS[t])) : createSoundscape();
}

// Recordings played back to back; one song loops, several play through in order on repeat.
function createRecording(urls: string[]) {
  let index = 0;
  const audio = new Audio(urls[0]);
  audio.loop = urls.length === 1;
  audio.volume = 0.5;
  audio.preload = "auto";
  audio.onended = () => {
    index = (index + 1) % urls.length;
    audio.src = urls[index]!;
    void audio.play().catch(() => {});
  };
  return {
    context: {
      get state() { return audio.paused ? "suspended" : "running"; },
      resume: async () => { await audio.play(); },
      suspend: async () => { audio.pause(); },
    },
    start: () => {},
    dispose: () => { audio.onended = null; audio.pause(); audio.removeAttribute("src"); audio.load(); },
  };
}

// Original upbeat advertising instrumental: pop hook, warm chords and a punchy groove.
// Synthesized locally; no third-party recording or license required.
function createSoundscape() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.32;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  compressor.connect(master);
  master.connect(context.destination);
  const delay = context.createDelay(1);
  delay.delayTime.value = 60 / 112 * 0.75;
  const echo = context.createGain();
  echo.gain.value = 0.16;
  delay.connect(echo);
  echo.connect(compressor);
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const active = new Set<AudioScheduledSourceNode>();
  function track(node: AudioScheduledSourceNode) {
    active.add(node);
    node.onended = () => { active.delete(node); node.disconnect(); };
  }
  function note(time: number, frequency: number, duration: number, level: number, type: OscillatorType, bright = false) {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(bright ? 4800 : 1700, time);
    filter.frequency.exponentialRampToValueAtTime(bright ? 1200 : 600, time + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(compressor);
    if (bright) envelope.connect(delay);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
    track(oscillator);
  }
  function kick(time: number) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.frequency.setValueAtTime(140, time);
    oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.14);
    envelope.gain.setValueAtTime(0.65, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    oscillator.connect(envelope);
    envelope.connect(compressor);
    oscillator.start(time);
    oscillator.stop(time + 0.26);
    track(oscillator);
  }
  function percussion(time: number, snare: boolean, accent: boolean) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = snare ? "bandpass" : "highpass";
    filter.frequency.value = snare ? 1800 : 7500;
    const envelope = context.createGain();
    const duration = snare ? 0.14 : 0.045;
    envelope.gain.setValueAtTime(snare ? 0.24 : accent ? 0.10 : 0.055, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(compressor);
    source.start(time, Math.random() * 0.5, duration);
    track(source);
  }
  const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
  // C / G / Am / F, with a repeating hook and a contrasting answer phrase.
  const chords = [[60, 64, 67, 71], [59, 62, 67, 69], [57, 60, 64, 67], [57, 60, 65, 69]];
  const roots = [36, 31, 33, 29];
  const hooks = [
    [76, 0, 79, 81, 0, 79, 76, 74],
    [74, 0, 76, 79, 0, 74, 71, 0],
    [76, 0, 79, 81, 0, 84, 81, 79],
    [77, 0, 76, 74, 0, 72, 0, 0],
    [76, 0, 79, 81, 0, 79, 76, 74],
    [74, 0, 76, 79, 0, 83, 79, 0],
    [81, 0, 79, 76, 0, 79, 81, 84],
    [81, 0, 79, 77, 0, 76, 74, 72],
  ];
  const eighth = 60 / 112 / 2;
  let nextTime = context.currentTime + 0.08;
  let step = 0;
  function schedule(time: number) {
    const bar = Math.floor(step / 8) % 8;
    const subdivision = step % 8;
    const chord = chords[bar % 4];
    const root = roots[bar % 4];
    if (!chord || root === undefined) return;
    if (subdivision === 0 || subdivision === 4 || subdivision === 7) kick(time);
    if (subdivision === 2 || subdivision === 6) percussion(time, true, true);
    percussion(time, false, subdivision % 2 === 0);
    if ([0, 3, 4, 6].includes(subdivision)) {
      note(time, frequency(root + (subdivision === 3 ? 12 : subdivision === 6 ? 7 : 0)), 0.23, 0.28, "triangle");
    }
    if (subdivision === 0 || subdivision === 3 || subdivision === 6) {
      chord.forEach((midi) => note(time, frequency(midi), 0.32, 0.035, "triangle"));
    }
    const melody = hooks[bar]?.[subdivision];
    if (melody) {
      note(time, frequency(melody), 0.28, 0.085, "triangle", true);
      note(time, frequency(melody + 12), 0.16, 0.012, "sine", true);
    }
    step = (step + 1) % 64;
  }
  const timer = window.setInterval(() => {
    if (context.state !== "running") return;
    if (nextTime < context.currentTime - 0.2) nextTime = context.currentTime + 0.05;
    while (nextTime < context.currentTime + 0.3) {
      schedule(nextTime);
      nextTime += eighth;
    }
  }, 75);
  return {
    context,
    start: () => { nextTime = context.currentTime + 0.08; },
    dispose: () => {
      window.clearInterval(timer);
      active.forEach((node) => { try { node.stop(); } catch { /* Already stopped. */ } });
      active.clear();
      void context.close();
    },
  };
}

export function AmbientMusic() {
  const sound = useRef<ReturnType<typeof createSoundscape> | ReturnType<typeof createRecording> | null>(null);
  const isHaunted = useHaunted();
  const choice = useMusicChoice();
  // Random shuffles the mode's songs once per choice change, then plays them all in turn.
  const playlist = useMemo<MusicTrack[]>(() => resolvePlaylist(choice ?? "auto", isHaunted), [choice, isHaunted]);
  const track = playlist.join(",");
  const ready = choice !== undefined;
  const soundMode = useRef<string>(track);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // True when this page load started the music by itself (Haunted Mode auto-play).
  const autoStarted = useRef(false);
  useEffect(() => () => { sound.current?.dispose(); }, []);

  // Haunted Mode: eerie music starts on its own when the page loads (owner request).
  // Browsers that hold audio until the first touch begin on the first tap/scroll/key.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (soundMode.current !== track) {
      sound.current?.dispose();
      sound.current = null;
      soundMode.current = track;
      setPlaying(false);
    }
    if (!ready) return;
    // Music always starts off: visitors must tap the music button to turn it on (owner request).
    const AUTOPLAY = false;
    if (!AUTOPLAY || !isHaunted || !playlist.some((t) => t !== "synth")) {
      if (autoStarted.current && sound.current?.context.state === "running") {
        void sound.current.context.suspend();
        setPlaying(false);
      }
      autoStarted.current = false;
      return;
    }
    let muted = false;
    try { muted = localStorage.getItem("apex-music-muted") === "true"; } catch { /* Storage is optional. */ }
    if (muted) return;
    if (sound.current?.context.state === "running") return; // Visitor already started music themselves.
    let cancelled = false;
    const release = () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("touchend", begin);
      window.removeEventListener("click", begin);
      window.removeEventListener("keydown", begin);
      window.removeEventListener("wheel", begin);
    };
    const listen = () => {
      window.addEventListener("pointerdown", begin);
      window.addEventListener("touchend", begin);
      window.addEventListener("click", begin);
      window.addEventListener("keydown", begin);
      window.addEventListener("wheel", begin);
    };
    const begin = async () => {
      const s = sound.current;
      if (cancelled || !s) return;
      try {
        await s.context.resume();
        s.start();
        if (s.context.state === "running") {
          release();
          if (!cancelled) setPlaying(true);
        }
        // Not running yet: this gesture didn't count as activation; keep listening for the next one.
      } catch { /* Browser still refused; listeners stay registered for the next gesture. */ }
    };
    const attempt = async () => {
      const s = sound.current ?? createSound(playlist);
      sound.current = s;
      try {
        await s.context.resume();
        if (s.context.state === "running") {
          s.start();
          if (!cancelled) setPlaying(true);
          return;
        }
      } catch { /* Autoplay policy holds the audio. */ }
      autoStarted.current = true;
      listen();
    };
    autoStarted.current = true;
    void attempt();
    return () => { cancelled = true; release(); };
  }, [isHaunted, track, ready]);

  async function toggle() {
    try {
      if (!sound.current) sound.current = createSound(playlist);
      autoStarted.current = false; // A deliberate tap overrides the haunted auto-start.
      if (playing) {
        await sound.current.context.suspend();
        setPlaying(false);
      } else {
        await sound.current.context.resume();
        sound.current.start();
        setPlaying(sound.current.context.state === "running");
      }
      try { localStorage.setItem("apex-music-muted", playing ? "true" : "false"); } catch { /* Storage is optional. */ }
    } catch { setUnavailable(true); setPlaying(false); }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-5 left-5 z-40 h-11 w-11 border-border bg-background/90 text-electric backdrop-blur-md"
      onClick={toggle}
      aria-label={unavailable ? "Music unavailable in this browser" : playing ? "Mute music" : "Play music"}
      title={unavailable ? "Music unavailable in this browser" : playing ? "Mute music" : "Play music"}
      aria-pressed={playing}
      disabled={unavailable}
    >
      {playing ? <Volume2 /> : <VolumeX />}
    </Button>
  );
}
