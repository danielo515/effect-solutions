import * as Tone from "tone";
import { ToneSoundSystem } from "./ToneSoundSystem";

class CounterSoundSystem extends ToneSoundSystem {
  private synthIncrement: Tone.PolySynth | null = null;
  private synthDecrement: Tone.PolySynth | null = null;

  protected setupSynths(): void {
    const synthOptions = {
      oscillator: { type: "triangle" as const },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.2,
      },
    } as Tone.SynthOptions;

    this.synthIncrement = this.createPolySynth(synthOptions);
    this.synthDecrement = this.createPolySynth(synthOptions);
  }

  protected disposeSynths(): void {
    this.synthIncrement?.dispose();
    this.synthIncrement = null;
    this.synthDecrement?.dispose();
    this.synthDecrement = null;
  }

  async playIncrement() {
    if (!(await this.ready())) return;

    const now = Tone.now();
    this.synthIncrement?.triggerAttackRelease("C5", "16n", now, 0.4);
    this.synthIncrement?.triggerAttackRelease("E5", "16n", now + 0.05, 0.3);
  }

  async playDecrement() {
    if (!(await this.ready())) return;

    const now = Tone.now();
    this.synthDecrement?.triggerAttackRelease("E4", "16n", now, 0.4);
    this.synthDecrement?.triggerAttackRelease("C4", "16n", now + 0.05, 0.3);
  }
}

export const counterSounds = new CounterSoundSystem();
