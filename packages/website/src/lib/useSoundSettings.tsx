"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { counterSounds } from "./sounds/counter-sounds";
import { taskSounds } from "./sounds/TaskSounds";
import { toggleSounds } from "./sounds/toggle-sounds";

interface SoundSettingsContextValue {
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundSettingsContext = createContext<
  SoundSettingsContextValue | undefined
>(undefined);

export function SoundSettingsProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      // Play sound BEFORE toggling so it plays before being muted
      if (prev) {
        // Currently muted, about to unmute - force the sound to play
        void toggleSounds.playSoundOn(true);
      } else {
        // Currently unmuted, about to mute - play sound off
        void toggleSounds.playSoundOff();
      }
      return !prev;
    });
  }, []);

  // Sync mute state with Effect sound systems
  useEffect(() => {
    taskSounds.setMuted(isMuted);
    counterSounds.setMuted(isMuted);
    toggleSounds.setMuted(isMuted);
  }, [isMuted]);

  return (
    <SoundSettingsContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </SoundSettingsContext.Provider>
  );
}

export function useSoundSettings() {
  const context = useContext(SoundSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSoundSettings must be used within a SoundSettingsProvider",
    );
  }
  return context;
}
