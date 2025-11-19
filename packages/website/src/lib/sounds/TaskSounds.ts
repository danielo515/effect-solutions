import * as Tone from "tone";
import { ToneSoundSystem } from "./ToneSoundSystem";

// Musical scale configuration
const PENTATONIC_SCALE = ["C", "D", "E", "G", "A"] as const;
const BASE_OCTAVE = 3;

// Time (in ms) within which multiple notes are considered part of the same
// "chord" and will be voiced as adjacent scale degrees in the *same* octave.
const CHORD_WINDOW_MS = 100;

type TaskSynthName =
  | "success"
  | "running"
  | "bass"
  | "interrupt"
  | "reset"
  | "death"
  | "config"
  | "refUpdate"
  | "finalizer"
  | "linkHover"
  | "linkCopied"
  | "notification";

type TaskSynths = Record<TaskSynthName, Tone.PolySynth | null>;

interface SynthConfig {
  name: TaskSynthName;
  options: Tone.SynthOptions;
  destination?: () => Tone.ToneAudioNode | null;
}

class TaskSoundSystem extends ToneSoundSystem {
  private synths: TaskSynths = {
    success: null,
    running: null,
    bass: null,
    interrupt: null,
    reset: null,
    death: null,
    config: null,
    refUpdate: null,
    finalizer: null,
    linkHover: null,
    linkCopied: null,
    notification: null,
  };

  private distortion: Tone.Distortion | null = null;

  private currentNoteIndex = 0;

  // Chord-scheduling helpers
  private chordWindowStart: number | null = null;
  private chordStep = 0;
  private chordBaseIndex = 0;
  private chordBaseOctave = BASE_OCTAVE;

  // Error sound management
  private isPlayingFailure = false;
  private isPlayingInterrupt = false;

  constructor() {
    super({
      volume: -12,
      reverb: { decay: 2.5, wet: 0.3 } as Tone.ReverbOptions,
    });
  }

  protected setupSynths(): void {
    const destination = this.volumeNode ?? Tone.getDestination();

    this.distortion = new Tone.Distortion({
      distortion: 0.8,
      wet: 1.0,
    }).connect(destination);

    const synthConfigs: SynthConfig[] = [
      {
        name: "success",
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 1.2 },
        } as Tone.SynthOptions,
      },
      {
        name: "running",
        options: {
          oscillator: { type: "sine" },
          envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.1 },
        } as Tone.SynthOptions,
      },
      {
        name: "bass",
        options: {
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.8 },
        } as Tone.SynthOptions,
      },
      {
        name: "interrupt",
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
        } as Tone.SynthOptions,
      },
      {
        name: "reset",
        options: {
          oscillator: { type: "sine" },
          envelope: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.12 },
        } as Tone.SynthOptions,
      },
      {
        name: "death",
        options: {
          oscillator: { type: "fatsawtooth10" },
          envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 1.5 },
        } as Tone.SynthOptions,
        destination: () => this.distortion,
      },
      {
        name: "config",
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        } as Tone.SynthOptions,
      },
      {
        name: "refUpdate",
        options: {
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
        } as Tone.SynthOptions,
      },
      {
        name: "finalizer",
        options: {
          oscillator: { type: "square4" },
          envelope: {
            attack: 0.005,
            decay: 0.12,
            sustain: 0.05,
            release: 0.25,
          },
        } as Tone.SynthOptions,
      },
      {
        name: "linkHover",
        options: {
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
        } as Tone.SynthOptions,
      },
      {
        name: "linkCopied",
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.002, decay: 0.15, sustain: 0.05, release: 0.3 },
        } as Tone.SynthOptions,
      },
      {
        name: "notification",
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.005, decay: 0.25, sustain: 0.1, release: 0.4 },
        } as Tone.SynthOptions,
      },
    ];

    synthConfigs.forEach(
      ({ name, options, destination: computeDestination }) => {
        this.synths[name] = this.createPolySynth(
          options,
          computeDestination?.() ?? null,
        );
      },
    );
  }

  protected disposeSynths(): void {
    (Object.keys(this.synths) as TaskSynthName[]).forEach((name) => {
      this.synths[name]?.dispose();
      this.synths[name] = null;
    });

    this.distortion?.dispose();
    this.distortion = null;
  }

  /** Returns true if still inside the active chord window. */
  private inChordWindow(now = Date.now()): boolean {
    return (
      this.chordWindowStart !== null &&
      now - this.chordWindowStart <= CHORD_WINDOW_MS
    );
  }

  /** Schedules a one-off callback on the (started) Transport. */
  private scheduleOnce(cb: () => void, time: string | number) {
    const transport = this.transport ?? Tone.getTransport();
    transport.scheduleOnce(cb, time);
  }

  // --- Note selection ------------------------------------------------------

  private getNextNote(octaveOffset: number = 0): string {
    const now = Date.now();
    const inChordWindow = this.inChordWindow(now);

    if (!inChordWindow) {
      // Start new chord window
      this.chordWindowStart = now;
      this.chordStep = 0;
      // Root of the chord based on rotating index
      this.chordBaseIndex = this.currentNoteIndex % PENTATONIC_SCALE.length;
      this.chordBaseOctave = BASE_OCTAVE + octaveOffset;
    }

    // Adjacent scale degrees within the same octave for tight harmony
    const scaleIndex =
      (this.chordBaseIndex + this.chordStep) % PENTATONIC_SCALE.length;
    const note = PENTATONIC_SCALE[scaleIndex];
    const octave = this.chordBaseOctave;

    // Advance counters for next call
    this.chordStep++;
    this.currentNoteIndex =
      (this.currentNoteIndex + 1) % (PENTATONIC_SCALE.length * 2);

    return `${note}${octave}`;
  }

  // --- Public API (unchanged behavior) ------------------------------------

  async playSuccess() {
    if (!(await this.ready())) return;

    // Triad cycling within a timing window to keep overlaps consonant
    const now = Date.now();
    const inWindow = this.inChordWindow(now);

    if (!inWindow) {
      this.chordWindowStart = now;
      this.chordStep = 0;
      this.chordBaseIndex = this.currentNoteIndex % PENTATONIC_SCALE.length;
      this.chordBaseOctave = BASE_OCTAVE + 1; // brightness
    }

    const rootNoteName = PENTATONIC_SCALE[this.chordBaseIndex];
    const rootNoteStr = `${rootNoteName}${this.chordBaseOctave}`;

    const TRIAD_SEMITONES = [0, 4, 7] as const;
    const triadIndex = this.chordStep % TRIAD_SEMITONES.length;
    const semitoneOffset = TRIAD_SEMITONES[triadIndex] ?? 0;

    const note = Tone.Frequency(rootNoteStr).transpose(semitoneOffset).toNote();

    this.chordStep++;
    this.currentNoteIndex =
      (this.currentNoteIndex + 1) % (PENTATONIC_SCALE.length * 2);

    this.synths.success?.triggerAttackRelease(note, "4n");
  }

  async playFailure() {
    if (this.muted) return;
    if (this.isPlayingFailure) return;
    this.isPlayingFailure = true;

    if (!(await this.ready())) {
      this.isPlayingFailure = false;
      return;
    }

    // Deep bass tone
    const note = `${PENTATONIC_SCALE[this.currentNoteIndex % PENTATONIC_SCALE.length]}${BASE_OCTAVE - 1}`;
    this.currentNoteIndex =
      (this.currentNoteIndex + 1) % PENTATONIC_SCALE.length;

    const now = Tone.now();
    this.synths.bass?.triggerAttackRelease(note, "4n", now, 0.65);

    // Reset flag after the sound completes (~0.2 s)
    this.scheduleOnce(() => {
      this.isPlayingFailure = false;
    }, "+0.2");
  }

  async playInterrupted() {
    if (this.muted) return;
    if (this.isPlayingInterrupt) return;
    this.isPlayingInterrupt = true;

    if (!(await this.ready())) {
      this.isPlayingInterrupt = false;
      return;
    }

    // Two rapid ascending beeps (Metal Gear-style alert)
    const note1 = "C5";
    const note2 = "E5";

    const now = Tone.now();
    this.synths.interrupt?.triggerAttackRelease(note1, "32n", now, 0.6);
    this.synths.interrupt?.triggerAttackRelease(note2, "32n", now + 0.07, 0.6);

    this.scheduleOnce(() => {
      this.isPlayingInterrupt = false;
    }, "+0.2");
  }

  async playRunning() {
    if (!(await this.ready())) return;
    const note = this.getNextNote(0.5); // half octave higher
    this.synths.running?.triggerAttackRelease(note, "32n", undefined, 0.25);
  }

  async playReset() {
    if (!(await this.ready())) return;

    // Classic two-note descending cue (G → C)
    const note1 = `G${BASE_OCTAVE}`;
    const note2 = `C${BASE_OCTAVE}`;

    const now = Tone.now();
    this.synths.reset?.triggerAttackRelease(note1, "16n", now, 0.6);
    this.synths.reset?.triggerAttackRelease(note2, "16n", now + 0.1, 0.6);
  }

  async playDeath() {
    if (!(await this.ready())) return;

    const now = Tone.now();
    // Short distorted stab
    this.synths.death?.triggerAttackRelease(
      `D#${BASE_OCTAVE}`,
      "32n",
      now,
      0.45,
    );
    // Long, low distorted rumble to finish (100 ms later)
    this.synths.death?.triggerAttackRelease(
      `C${BASE_OCTAVE - 2}`,
      "1n",
      now + 0.1,
      0.55,
    );
  }

  /** Pleasant two-note ascending chime when users change configuration. */
  async playConfigurationChange() {
    if (!(await this.ready())) return;
    this.synths.config?.triggerAttackRelease("G5", "16n", undefined, 0.6);
  }

  /** Subtle one-note blip when VisualRef values update. */
  async playRefUpdate() {
    if (!(await this.ready())) return;
    this.synths.refUpdate?.triggerAttackRelease("E6", "64n", undefined, 0.35);
  }

  /** Soft registration sound when a finalizer is created. */
  async playFinalizerCreated() {
    if (!(await this.ready())) return;
    const note = this.getNextNote(0); // Base octave
    this.synths.finalizer?.triggerAttackRelease(note, "32n", undefined, 0.25);
  }

  /** Mid-range sound when a finalizer starts running. */
  async playFinalizerRunning() {
    if (!(await this.ready())) return;
    const note = this.getNextNote(0.5); // Half octave up
    this.synths.finalizer?.triggerAttackRelease(note, "16n", undefined, 0.3);
  }

  /** Higher sound when a finalizer completes. */
  async playFinalizerCompleted() {
    if (!(await this.ready())) return;
    const note = this.getNextNote(1); // One octave up
    this.synths.finalizer?.triggerAttackRelease(note, "8n", undefined, 0.35);
  }

  /** Ultra-subtle sound when hovering over link option. */
  async playLinkHover() {
    if (!(await this.ready())) return;
    this.synths.linkHover?.triggerAttackRelease("G6", "64n", undefined, 0.2);
  }

  /** Pleasant chime when link is successfully copied. */
  async playLinkCopied() {
    if (!(await this.ready())) return;

    const note1 = "E5";
    const note2 = "G5";

    const now = Tone.now();
    this.synths.linkCopied?.triggerAttackRelease(note1, "16n", now, 0.5);
    this.synths.linkCopied?.triggerAttackRelease(note2, "16n", now + 0.08, 0.5);
  }

  /** Gentle chime when a notification appears. */
  async playNotificationChime() {
    if (!(await this.ready())) return;

    const note1 = "C5";
    const note2 = "E5";

    const now = Tone.now();
    this.synths.notification?.triggerAttackRelease(note1, "16n", now, 0.4);
    this.synths.notification?.triggerAttackRelease(
      note2,
      "16n",
      now + 0.12,
      0.4,
    );
  }
}

// Singleton instance
export const taskSounds = new TaskSoundSystem();
