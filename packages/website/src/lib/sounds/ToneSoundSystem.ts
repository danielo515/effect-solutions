import * as Tone from "tone";

export interface ToneSoundSystemOptions {
  /** Volume (in decibels) routed to the destination. Defaults to -12dB. */
  volume?: number;
  /**
   * Reverb configuration. Pass `null` to disable the reverb node entirely.
   * Defaults to a subtle room reverb when omitted.
   */
  reverb?: Tone.ReverbOptions | null;
}

/**
 * Shared lifecycle wrapper for Tone.js powered sound systems. Handles
 * initializing the audio context, effect chain, transport, and mute/volume
 * state so individual sound systems only focus on their unique cues.
 */
export abstract class ToneSoundSystem {
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private synthsReady = false;
  protected muted = false;

  protected volumeNode: Tone.Volume | null = null;
  protected reverbNode: Tone.Reverb | null = null;
  protected transport: ReturnType<typeof Tone.getTransport> | null = null;

  constructor(private readonly options: ToneSoundSystemOptions = {}) {}

  protected abstract setupSynths(): void;
  protected abstract disposeSynths(): void;

  protected get outputNode(): Tone.ToneAudioNode {
    return (this.reverbNode ??
      this.volumeNode ??
      Tone.getDestination()) as Tone.ToneAudioNode;
  }

  protected createPolySynth(
    options: Tone.SynthOptions,
    destination?: Tone.ToneAudioNode | null,
  ): Tone.PolySynth {
    const synth = new Tone.PolySynth(Tone.Synth, options);
    synth.connect(destination ?? this.outputNode);
    return synth;
  }

  private ensureSynths() {
    if (!this.synthsReady) {
      this.setupSynths();
      this.synthsReady = true;
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      await Tone.start();

      const volume = this.options.volume ?? -12;
      this.volumeNode = new Tone.Volume(volume).toDestination();

      if (this.options.reverb !== null) {
        const reverbOptions = this.options.reverb ?? {
          decay: 1.5,
          wet: 0.2,
        };
        this.reverbNode = new Tone.Reverb(reverbOptions).connect(
          this.volumeNode,
        );
      }

      this.ensureSynths();

      this.transport = Tone.getTransport();
      if (this.transport.state !== "started") {
        this.transport.start();
      }

      this.initialized = true;
    })();

    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  protected async ready(force = false): Promise<boolean> {
    if (!force && this.muted) {
      return false;
    }

    await this.initialize();
    return true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  setVolume(volume: number) {
    if (!this.volumeNode) return;
    const decibels = volume === 0 ? -Infinity : -40 + volume * 40;
    this.volumeNode.volume.value = decibels;
  }

  async dispose() {
    this.disposeSynths();

    this.reverbNode?.dispose();
    this.reverbNode = null;
    this.volumeNode?.dispose();
    this.volumeNode = null;

    this.transport = null;
    this.initialized = false;
    this.synthsReady = false;
  }
}
