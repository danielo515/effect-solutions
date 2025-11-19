"use client";

import { useCallback, useRef } from "react";
import { useSoundSettings } from "./useSoundSettings";

interface ToneOptions {
  delay?: number;
  duration?: number;
  frequency?: number;
  type?: OscillatorType;
  volume?: number;
}

// Lightweight Web Audio helper for short UI tones.
export function useTonePlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { isMuted } = useSoundSettings();

  const getContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const browserWindow = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };

    const AudioContextCtor =
      browserWindow.AudioContext ?? browserWindow.webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (options?: ToneOptions) => {
      if (isMuted) {
        return;
      }

      const context = getContext();

      if (!context) {
        return;
      }

      const {
        delay = 0,
        duration = 0.08,
        frequency = 660,
        type = "sine",
        volume = 0.04,
      } = options ?? {};

      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;

      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);

      const startAt = context.currentTime + delay;
      const stopAt = startAt + duration;

      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.02);
    },
    [getContext, isMuted],
  );

  return { playTone };
}
