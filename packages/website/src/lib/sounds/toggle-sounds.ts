import * as Tone from "tone";
import { ToneSoundSystem } from "./ToneSoundSystem";

class ToggleSoundSystem extends ToneSoundSystem {
  private synthOn: Tone.PolySynth | null = null;
  private synthOff: Tone.PolySynth | null = null;

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

    this.synthOn = this.createPolySynth(synthOptions);
    this.synthOff = this.createPolySynth(synthOptions);
  }

  protected disposeSynths(): void {
    this.synthOn?.dispose();
    this.synthOn = null;
    this.synthOff?.dispose();
    this.synthOff = null;
  }

  async playSoundOn(force = false) {
    if (!(await this.ready(force))) return;

    const now = Tone.now();
    this.synthOn?.triggerAttackRelease("C5", "16n", now, 0.4);
    this.synthOn?.triggerAttackRelease("E5", "16n", now + 0.05, 0.3);
  }

  async playSoundOff() {
    if (!(await this.ready())) return;

    const now = Tone.now();
    this.synthOff?.triggerAttackRelease("E4", "16n", now, 0.4);
    this.synthOff?.triggerAttackRelease("C4", "16n", now + 0.05, 0.3);
  }
}

export const toggleSounds = new ToggleSoundSystem();
